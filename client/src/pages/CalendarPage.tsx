import { useState, useMemo, useCallback, startTransition } from 'react';
import { useDebounce } from 'use-debounce';
import { format, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay, getWeek, startOfWeek, setWeek, getISOWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Clock, Target, CheckCircle, XCircle, AlertTriangle, Search, User, GraduationCap, Printer, ClipboardList, Edit2 } from 'lucide-react';
import { ExcelImport } from '@/components/ExcelImport';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShiftBadge } from '@/components/ShiftBadge';
import { ShiftCodeSelect } from '@/components/ShiftCodeSelect';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/StoreContext';
import { ShiftCode, SHIFT_CODES, calculateManhours, calculateWeeklyManhours, isOnDuty } from '@/lib/data';
import { exportScheduleToExcel } from '@/lib/excelExport';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ViewMode = 'day' | 'week' | 'month';

const DAILY_TARGET = 216;
const MIN_MANHOURS_OFF_DAY = 216;
const MIN_SE_ON_DUTY = 6;
const MIN_PS_ON_DUTY = 2;
const MIN_DAILY_TARGET_RED = 29;  // Below this = red (block off-day)
const MIN_DAILY_TARGET_ORANGE = 30; // 30-34 = orange (warning)
const MIN_DAILY_TARGET_GREEN = 35;  // 35+ = green (safe)

export function CalendarPage() {
  const { employees, assignments, selectedDate, setSelectedDate, updateAssignment, getAssignment, getWeekDates, importMetadata, dailyTargets, setDailyTarget } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [tempTarget, setTempTarget] = useState<string>('');
  const [offDayCheckDate, setOffDayCheckDate] = useState<Date>(selectedDate);
  const [offDayCalendarOpen, setOffDayCalendarOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [debouncedSearch] = useDebounce(employeeSearch, 150);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [daysToCheck, setDaysToCheck] = useState(1);
  const [offDayType, setOffDayType] = useState<ShiftCode>('V');
  const [educationStartDate, setEducationStartDate] = useState<Date>(selectedDate);
  const [educationDays, setEducationDays] = useState(7);
  const [educationCalendarOpen, setEducationCalendarOpen] = useState(false);
  const [ftDialogOpen, setFtDialogOpen] = useState(false);
  const [vacationDialogOpen, setVacationDialogOpen] = useState(false);

  const offDayCheckDateStr = format(offDayCheckDate, 'yyyy-MM-dd');

  const OFF_DAY_TYPES: { code: ShiftCode; label: string }[] = [
    { code: 'V', label: 'Vacation (V)' },
    { code: '-', label: 'Day Off (-)' },
    { code: 'S', label: 'Sick (S)' },
    { code: 'KO', label: 'Komp. Overtime (KO)' },
    { code: 'FL', label: 'Komp. Flextime (FL)' },
    { code: 'UL', label: 'Unpaid Leave (UL)' },
    { code: 'MC', label: 'Military (MC)' },
    { code: 'TR', label: 'Training (TR)' },
  ];

  const applyOffDay = (dateStr: string) => {
    if (!selectedEmployeeId) return;
    updateAssignment(dateStr, selectedEmployeeId, offDayType);
  };

  const applyAllOffDays = () => {
    if (!selectedEmployeeId || !canGrantOffDay.results) return;
    canGrantOffDay.results.forEach((dayResult) => {
      if (dayResult.result.canGrant) {
        updateAssignment(dayResult.dateStr, selectedEmployeeId, offDayType);
      }
    });
  };

  const searchedEmployees = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    const search = debouncedSearch.toLowerCase().trim();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(search) ||
      emp.initials.toLowerCase().includes(search)
    ).slice(0, 8);
  }, [employees, debouncedSearch]);

  const selectedEmployee = useMemo(() =>
    selectedEmployeeId ? employees.find(e => e.id === selectedEmployeeId) : null,
    [employees, selectedEmployeeId]);

  const filteredEmployees = useMemo(() => {
    const sortOrder = [
      'THRU', 'MELM', 'YCCR', 'TIMJ', 'HUAB', 'YYRJ', 'MECU', 'LECN', 'LCLE', 'HUDM',
      'ARUZ', 'KRZE', 'LSIE', 'AAUL', 'WINY', 'SOER', 'ERIZ', 'BHAE', 'DALL', 'GBRU',
      'LUPR', 'RREN', 'GNET', 'TOKR', 'COSM', 'FILM', 'PAAO', 'LUCP', 'MF', 'NATS',
      'MZIM', 'TIML', 'OLCR', 'WEZE', 'JAWE', 'KRAF', 'RUAC', 'SAEF', 'LABB', 'RDAR',
      'ARNG', 'MCOS', 'THNA', 'JUTI', 'GERO', 'MURB', 'BOGO', 'EGGL', 'RULO', 'RPAS',
      'DMIA', 'ENRL', 'ATET_1', 'BOEO', 'DEOM', 'PKRI'
    ];
    const filtered = departmentFilter === 'all' ? employees : employees.filter(e => e.department === departmentFilter);
    return [...filtered].sort((a, b) => {
      const aIdx = sortOrder.indexOf(a.initials);
      const bIdx = sortOrder.indexOf(b.initials);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [employees, departmentFilter]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate, getWeekDates]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const dailyManhours = useMemo(() => {
    return calculateManhours(employees, assignments, selectedDateStr);
  }, [employees, assignments, selectedDateStr]);

  const weeklyManhours = useMemo(() => {
    return calculateWeeklyManhours(employees, assignments, weekDates);
  }, [employees, assignments, weekDates]);

  const dayStats = useMemo(() => {
    const dateStr = selectedDateStr;
    // Filter assignments to strictly include only existing employees
    const dayAssignments = assignments.filter(a =>
      a.date === dateStr && employees.some(e => String(e.id) === String(a.employeeId))
    );
    const onDuty = dayAssignments.filter(a => isOnDuty(a.shiftCode)).length;
    const earlyShifts = dayAssignments.filter(a => ['Ea', 'e', 'Ae'].includes(a.shiftCode)).length;
    const lateShifts = dayAssignments.filter(a => ['La', 'l', 'LA', 'AL'].includes(a.shiftCode)).length;
    // Calculate off duty as total employees minus on duty to ensure consistency
    const offDuty = employees.length - onDuty;
    return { onDuty, earlyShifts, lateShifts, offDuty };
  }, [assignments, selectedDateStr, employees]);

  const EDUCATION_CODES = [
    { code: 'TR', label: 'Training', color: 'bg-purple-500' },
    { code: 'SI', label: 'School Internal', color: 'bg-blue-500' },
    { code: 'SE', label: 'School External', color: 'bg-indigo-500' },
    { code: 'Sn', label: 'School Night', color: 'bg-violet-500' },
    { code: 'ET', label: 'Educational Trip', color: 'bg-cyan-500' },
    { code: 'T', label: 'Training (Off)', color: 'bg-purple-400' },
  ];

  const educationDateRange = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < educationDays; i++) {
      dates.push(format(addDays(educationStartDate, i), 'yyyy-MM-dd'));
    }
    return dates;
  }, [educationStartDate, educationDays]);

  const educationEmployees = useMemo(() => {
    const educationCodes = EDUCATION_CODES.map(e => e.code);
    const rangeAssignments = assignments.filter(a =>
      educationDateRange.includes(a.date) && educationCodes.includes(a.shiftCode)
    );
    const grouped = rangeAssignments.map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      const codeInfo = EDUCATION_CODES.find(c => c.code === a.shiftCode);
      return emp ? {
        ...emp,
        educationType: a.shiftCode,
        educationLabel: codeInfo?.label,
        educationColor: codeInfo?.color,
        educationDate: a.date
      } : null;
    }).filter(Boolean) as (typeof employees[0] & { educationType: string; educationLabel?: string; educationColor?: string; educationDate: string })[];
    return grouped;
  }, [assignments, employees, educationDateRange]);

  // FT (Feiertag/Holiday) summary - count FT days per employee
  const ftSummary = useMemo(() => {
    const ftAssignments = assignments.filter(a => a.shiftCode === 'FT');
    const byEmployee: Record<string, { dates: string[] }> = {};

    ftAssignments.forEach(a => {
      if (!byEmployee[a.employeeId]) {
        byEmployee[a.employeeId] = { dates: [] };
      }
      byEmployee[a.employeeId].dates.push(a.date);
    });

    return employees.map(emp => ({
      ...emp,
      ftCount: byEmployee[emp.id]?.dates.length || 0,
      ftDates: (byEmployee[emp.id]?.dates || []).sort()
    })).sort((a, b) => b.ftCount - a.ftCount);
  }, [assignments, employees]);

  // Vacation summary - count V days per employee
  const vacationSummary = useMemo(() => {
    const vAssignments = assignments.filter(a => a.shiftCode === 'V');
    const byEmployee: Record<string, { dates: string[] }> = {};

    vAssignments.forEach(a => {
      if (!byEmployee[a.employeeId]) {
        byEmployee[a.employeeId] = { dates: [] };
      }
      byEmployee[a.employeeId].dates.push(a.date);
    });

    return employees.map(emp => ({
      ...emp,
      vCount: byEmployee[emp.id]?.dates.length || 0,
      vDates: (byEmployee[emp.id]?.dates || []).sort()
    })).sort((a, b) => b.vCount - a.vCount);
  }, [assignments, employees]);

  const getEmployeePrimaryLicense = (emp: typeof employees[0]): string => {
    const licenses = emp.skills.map(s => s.license).filter(Boolean);
    if (licenses.includes('B1/2')) return 'B1-2';
    if (licenses.includes('B1')) return 'B1';
    if (licenses.includes('B2')) return 'B2';
    if (licenses.includes('A')) return 'Cat A';
    if (licenses.includes('C')) return 'C';
    return 'None';
  };

  const canGrantOffDay = useMemo(() => {
    const datesToCheck: string[] = [];
    for (let i = 0; i < daysToCheck; i++) {
      datesToCheck.push(format(addDays(offDayCheckDate, i), 'yyyy-MM-dd'));
    }

    const analyzeDay = (dateStr: string) => {
      // Robust filter: only assignments for existing employees
      const dayAssignments = assignments.filter(a =>
        a.date === dateStr && employees.some(e => String(e.id) === String(a.employeeId))
      );
      const currentManhours = calculateManhours(employees, assignments, dateStr);
      const onDutyCount = dayAssignments.filter(a => isOnDuty(a.shiftCode)).length;
      // Consistent off duty calculation
      const offDutyCount = employees.length - onDutyCount;
      const vacationCount = dayAssignments.filter(a => a.shiftCode === 'V').length;
      const sickCount = dayAssignments.filter(a => ['S', 'IW', 'IC', 'AC', 'AW'].includes(a.shiftCode)).length;

      const seOnDuty = dayAssignments.filter(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        return emp?.role === 'SrEng' && isOnDuty(a.shiftCode);
      }).length;

      const psOnDuty = dayAssignments.filter(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        return emp?.role === 'PS' && isOnDuty(a.shiftCode);
      }).length;

      const b1OnDuty = dayAssignments.filter(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        if (!emp) return false;
        const lic = getEmployeePrimaryLicense(emp);
        return (lic === 'B1' || lic === 'B1-2') && isOnDuty(a.shiftCode);
      });
      const b2OnDuty = dayAssignments.filter(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        if (!emp) return false;
        const lic = getEmployeePrimaryLicense(emp);
        return (lic === 'B2' || lic === 'B1-2') && isOnDuty(a.shiftCode);
      });
      const catAOnDuty = dayAssignments.filter(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        if (!emp) return false;
        const lic = getEmployeePrimaryLicense(emp);
        return lic === 'Cat A' && isOnDuty(a.shiftCode);
      });

      const totalB1 = employees.filter(e => {
        const lic = getEmployeePrimaryLicense(e);
        return lic === 'B1' || lic === 'B1-2';
      }).length;
      const totalB2 = employees.filter(e => {
        const lic = getEmployeePrimaryLicense(e);
        return lic === 'B2' || lic === 'B1-2';
      }).length;
      const totalCatA = employees.filter(e => getEmployeePrimaryLicense(e) === 'Cat A').length;

      let totalPotentialManhours = 0;
      employees.forEach(emp => {
        if (emp.role !== 'PM' && emp.role !== 'PS') {
          totalPotentialManhours += 8 * (emp.grade / 100);
        }
      });

      const requiredPercentage = totalPotentialManhours > 0 ? MIN_MANHOURS_OFF_DAY / totalPotentialManhours : 1;
      const minB1Required = Math.ceil(totalB1 * requiredPercentage);
      const minB2Required = Math.ceil(totalB2 * requiredPercentage);
      const minCatARequired = Math.ceil(totalCatA * requiredPercentage);

      const isWeekend = [0, 6].includes(getDay(new Date(dateStr)));

      // Daily Target calculation: count Ea/La employees excluding PM/PS/SE
      const dateObj = new Date(dateStr);
      const weekNum = getISOWeek(dateObj);
      const isEaWeek = weekNum % 2 === 0; // Even weeks = Ea, Odd weeks = La

      const dailyTargetCount = dayAssignments.filter(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        if (!emp) return false;
        const role = emp.role?.toUpperCase() || '';
        if (role === 'PM' || role === 'PS' || role === 'SE') return false;
        const code = a.shiftCode;
        if (isEaWeek) {
          return code === 'Ea' || code === 'e';
        } else {
          return code === 'La';
        }
      }).length;

      return {
        dateStr,
        currentManhours,
        onDutyCount,
        offDutyCount,
        vacationCount,
        sickCount,
        seOnDuty,
        psOnDuty,
        b1OnDuty: b1OnDuty.length,
        b2OnDuty: b2OnDuty.length,
        catAOnDuty: catAOnDuty.length,
        totalB1,
        totalB2,
        totalCatA,
        minB1Required,
        minB2Required,
        minCatARequired,
        totalPotentialManhours,
        requiredPercentage,
        isWeekend,
        dailyTargetCount,
        isEaWeek
      };
    };

    const dayAnalyses = datesToCheck.map(analyzeDay);

    const checkEmployeeOffDay = (emp: typeof employees[0] | null, dayData: ReturnType<typeof analyzeDay>) => {
      const reasons: { type: 'yes' | 'no' | 'info'; text: string }[] = [];
      let canGrant = true;

      if (dayData.isWeekend) {
        reasons.push({ type: 'yes', text: 'Weekend - reduced staffing requirements' });
      }

      if (emp) {
        const isZeroGrade = emp.grade === 0;

        if (emp.role === 'PS') {
          const psAfter = dayData.psOnDuty - 1;
          if (psAfter >= MIN_PS_ON_DUTY) {
            reasons.push({ type: 'yes', text: `PS coverage OK: ${psAfter} PS remain after granting (min ${MIN_PS_ON_DUTY})` });
          } else {
            reasons.push({ type: 'no', text: `PS coverage insufficient: only ${psAfter} PS after granting (need ${MIN_PS_ON_DUTY})` });
            canGrant = false;
          }
        }

        if (emp.role === 'SrEng') {
          const seAfter = dayData.seOnDuty - 1;
          if (seAfter >= MIN_SE_ON_DUTY) {
            reasons.push({ type: 'yes', text: `SE coverage OK: ${seAfter} SE remain after granting (min ${MIN_SE_ON_DUTY})` });
          } else {
            reasons.push({ type: 'no', text: `SE coverage insufficient: only ${seAfter} SE after granting (need ${MIN_SE_ON_DUTY})` });
            canGrant = false;
          }
        }

        const empHours = 8 * (emp.grade / 100);
        const projectedManhours = dayData.currentManhours - empHours;

        if (isZeroGrade) {
          reasons.push({ type: 'yes', text: `${emp.initials} has 0% grade - no manhours impact` });
        } else if (projectedManhours >= MIN_MANHOURS_OFF_DAY) {
          reasons.push({ type: 'yes', text: `Manhours OK: ${projectedManhours.toFixed(1)}h after granting (min ${MIN_MANHOURS_OFF_DAY}h)` });
        } else {
          reasons.push({ type: 'no', text: `Manhours insufficient: ${projectedManhours.toFixed(1)}h after granting (need ${MIN_MANHOURS_OFF_DAY}h)` });
          canGrant = false;
        }

        // Daily Target check: only for non-0% employees who affect the count
        if (!isZeroGrade && emp.role !== 'PM' && emp.role !== 'PS') {
          // Get employee's current shift for this day
          const empAssignment = assignments.find(a => a.date === dayData.dateStr && a.employeeId === emp.id);
          const currentShift = empAssignment?.shiftCode || '-';

          // Check if this employee is currently counted in daily target
          const isEaLaShift = dayData.isEaWeek
            ? (currentShift === 'Ea' || currentShift === 'e')
            : (currentShift === 'La');

          if (isEaLaShift) {
            const projectedTarget = dayData.dailyTargetCount - 1;

            if (projectedTarget < MIN_DAILY_TARGET_ORANGE) {
              // Would drop below 30 - block
              reasons.push({ type: 'no', text: `Daily Target would drop to ${projectedTarget} (min ${MIN_DAILY_TARGET_ORANGE} required)` });
              canGrant = false;
            } else if (projectedTarget < MIN_DAILY_TARGET_GREEN) {
              // 30-34 range - warning
              reasons.push({ type: 'info', text: `⚠️ WARNING: Daily Target will drop to ${projectedTarget} (orange zone, ${MIN_DAILY_TARGET_GREEN}+ preferred)` });
            } else {
              reasons.push({ type: 'yes', text: `Daily Target OK: ${projectedTarget} after granting (≥${MIN_DAILY_TARGET_GREEN})` });
            }
          } else {
            reasons.push({ type: 'yes', text: `Employee not on ${dayData.isEaWeek ? 'Ea' : 'La'} shift - no daily target impact` });
          }
        }

        const empLicense = getEmployeePrimaryLicense(emp);

        if (empLicense === 'B1' || empLicense === 'B1-2') {
          const b1After = dayData.b1OnDuty - 1;
          if (b1After >= dayData.minB1Required) {
            reasons.push({ type: 'yes', text: `B1 coverage OK: ${b1After} on duty after granting (min ${dayData.minB1Required})` });
          } else {
            reasons.push({ type: 'no', text: `B1 coverage low: ${b1After} after granting (min ${dayData.minB1Required})` });
            canGrant = false;
          }
        }

        if (empLicense === 'B2' || empLicense === 'B1-2') {
          const b2After = dayData.b2OnDuty - 1;
          if (b2After >= dayData.minB2Required) {
            reasons.push({ type: 'yes', text: `B2 coverage OK: ${b2After} on duty after granting (min ${dayData.minB2Required})` });
          } else {
            reasons.push({ type: 'no', text: `B2 coverage low: ${b2After} after granting (min ${dayData.minB2Required})` });
            canGrant = false;
          }
        }

        if (empLicense === 'Cat A') {
          const catAAfter = dayData.catAOnDuty - 1;
          const effectiveGrade = emp.grade <= 50 ? 0.5 : 1;
          if (catAAfter >= dayData.minCatARequired) {
            reasons.push({ type: 'yes', text: `Cat A coverage OK: ${catAAfter} on duty after granting (min ${dayData.minCatARequired})` });
          } else {
            reasons.push({ type: 'info', text: `Cat A at ${catAAfter} after granting (min ${dayData.minCatARequired}), grade ${emp.grade}% = ${effectiveGrade * 100}% factor` });
          }
        }
      } else {
        if (dayData.currentManhours >= MIN_MANHOURS_OFF_DAY) {
          reasons.push({ type: 'yes', text: `Current manhours: ${dayData.currentManhours.toFixed(1)}h (min ${MIN_MANHOURS_OFF_DAY}h)` });
        } else {
          reasons.push({ type: 'no', text: `Current manhours: ${dayData.currentManhours.toFixed(1)}h (need ${MIN_MANHOURS_OFF_DAY}h)` });
          canGrant = false;
        }

        if (dayData.seOnDuty >= MIN_SE_ON_DUTY) {
          reasons.push({ type: 'yes', text: `SE on duty: ${dayData.seOnDuty} (min ${MIN_SE_ON_DUTY})` });
        } else {
          reasons.push({ type: 'no', text: `SE on duty: ${dayData.seOnDuty} (need ${MIN_SE_ON_DUTY})` });
          canGrant = false;
        }

        if (dayData.psOnDuty >= MIN_PS_ON_DUTY) {
          reasons.push({ type: 'yes', text: `PS on duty: ${dayData.psOnDuty} (min ${MIN_PS_ON_DUTY})` });
        } else {
          reasons.push({ type: 'no', text: `PS on duty: ${dayData.psOnDuty} (need ${MIN_PS_ON_DUTY})` });
          canGrant = false;
        }

        reasons.push({ type: 'info', text: `B1: ${dayData.b1OnDuty}/${dayData.minB1Required} min | B2: ${dayData.b2OnDuty}/${dayData.minB2Required} min | Cat A: ${dayData.catAOnDuty}/${dayData.minCatARequired} min` });

        // Show daily target status in general view
        if (dayData.dailyTargetCount < MIN_DAILY_TARGET_ORANGE) {
          reasons.push({ type: 'no', text: `Daily Target: ${dayData.dailyTargetCount} (${dayData.isEaWeek ? 'Ea' : 'La'} week) - RED ZONE, no off-days should be granted` });
        } else if (dayData.dailyTargetCount < MIN_DAILY_TARGET_GREEN) {
          reasons.push({ type: 'info', text: `⚠️ Daily Target: ${dayData.dailyTargetCount} (${dayData.isEaWeek ? 'Ea' : 'La'} week) - ORANGE ZONE` });
        } else {
          reasons.push({ type: 'yes', text: `Daily Target: ${dayData.dailyTargetCount} (${dayData.isEaWeek ? 'Ea' : 'La'} week) - GREEN ZONE` });
        }
      }

      return { canGrant, reasons, empSpecific: !!emp };
    };

    const results = dayAnalyses.map(dayData => ({
      ...dayData,
      result: checkEmployeeOffDay(selectedEmployee ?? null, dayData)
    }));

    const allDaysCanGrant = results.every(r => r.result.canGrant);
    const seCanTakeVacation = Math.max(0, (dayAnalyses[0]?.seOnDuty || 0) - MIN_SE_ON_DUTY);
    const psCanTakeVacation = Math.max(0, (dayAnalyses[0]?.psOnDuty || 0) - MIN_PS_ON_DUTY);

    return {
      canGrant: allDaysCanGrant,
      results,
      message: allDaysCanGrant
        ? (daysToCheck > 1 ? `OFF DAY CAN BE GRANTED (${daysToCheck} days)` : 'OFF DAY CAN BE GRANTED')
        : 'OFF DAY CANNOT BE GRANTED',
      stats: dayAnalyses[0] || {},
      positionVacation: { seCanTake: seCanTakeVacation, psCanTake: psCanTakeVacation, seOnDuty: dayAnalyses[0]?.seOnDuty || 0, psOnDuty: dayAnalyses[0]?.psOnDuty || 0 }
    };
  }, [offDayCheckDate, daysToCheck, assignments, employees, selectedEmployee]);

  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    startTransition(() => {
      setSelectedDate(addDays(selectedDate, direction === 'prev' ? -1 : 1));
    });
  }, [selectedDate, setSelectedDate]);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    startTransition(() => {
      setSelectedDate(direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
    });
  }, [selectedDate, setSelectedDate]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    startTransition(() => {
      setSelectedDate(direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));
    });
  }, [selectedDate, setSelectedDate]);

  const handleShiftChange = useCallback((date: string, employeeId: string, shiftCode: ShiftCode) => {
    updateAssignment(date, employeeId, shiftCode);
  }, [updateAssignment]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground mt-1">Manage daily shift assignments for TMBA teams</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day" data-testid="tab-day-view">Day</TabsTrigger>
              <TabsTrigger value="week" data-testid="tab-week-view">Week</TabsTrigger>
              <TabsTrigger value="month" data-testid="tab-month-view">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.print()}
            data-testid="button-print"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </Button>

          <ExcelImport />

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-check-off-day">
                <CheckCircle className="w-4 h-4" />
                Check Off Day
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-xl">Off Day Availability Check</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-[340px] border-b lg:border-b-0 lg:border-r p-4 bg-muted/30 space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Search Employee (name or code)</Label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="e.g. THRU or Thurner"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-employee-search"
                      />
                    </div>
                    {searchedEmployees.length > 0 && (
                      <div className="mt-2 border rounded-md bg-background max-h-48 overflow-y-auto">
                        {searchedEmployees.map(emp => (
                          <button
                            key={emp.id}
                            onClick={() => {
                              setSelectedEmployeeId(emp.id);
                              setEmployeeSearch('');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                            data-testid={`employee-option-${emp.initials}`}
                          >
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{emp.initials}</span>
                            <span className="text-muted-foreground">{emp.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">{getEmployeePrimaryLicense(emp)}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedEmployee && (
                      <div className="mt-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-semibold">{selectedEmployee.initials}</p>
                              <p className="text-xs text-muted-foreground">{selectedEmployee.name}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEmployeeId(null)}
                            className="h-6 px-2"
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="secondary">{getEmployeePrimaryLicense(selectedEmployee)}</Badge>
                          <Badge variant="outline">{selectedEmployee.role}</Badge>
                          <Badge variant="outline">{selectedEmployee.grade}% grade</Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Days to Check</Label>
                    <div className="flex gap-2">
                      <Select value={daysToCheck.toString()} onValueChange={(v) => setDaysToCheck(parseInt(v))}>
                        <SelectTrigger className="w-24" data-testid="select-days-to-check">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                            <SelectItem key={d} value={d.toString()}>{d} day{d > 1 ? 's' : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={daysToCheck}
                          onChange={(e) => setDaysToCheck(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                          placeholder="Custom"
                          className="w-full"
                          data-testid="input-days-custom"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {daysToCheck === 1 ? 'Single day' : `${daysToCheck} consecutive days`}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Start Date</Label>
                    <Calendar
                      mode="single"
                      selected={offDayCheckDate}
                      onSelect={(date) => date && setOffDayCheckDate(date)}
                      weekStartsOn={1}
                      className="rounded-md border mx-auto"
                      data-testid="calendar-off-day-date"
                    />
                  </div>

                  <div className="text-center p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">Checking:</p>
                    <p className="text-sm font-bold">
                      {format(offDayCheckDate, 'MMM d')}
                      {daysToCheck > 1 && ` - ${format(addDays(offDayCheckDate, daysToCheck - 1), 'MMM d, yyyy')}`}
                      {daysToCheck === 1 && `, ${format(offDayCheckDate, 'yyyy')}`}
                    </p>
                  </div>

                  {selectedEmployee && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Off Day Type</Label>
                      <Select value={offDayType} onValueChange={(v) => setOffDayType(v as ShiftCode)}>
                        <SelectTrigger data-testid="select-off-day-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OFF_DAY_TYPES.map(t => (
                            <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1 max-h-[60vh] lg:max-h-[70vh]">
                  <div className="p-4 space-y-4">
                    <Card className={cn(
                      "p-4",
                      canGrantOffDay.canGrant ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                    )}>
                      <div className="flex items-center gap-3 mb-4">
                        {canGrantOffDay.canGrant ? (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : (
                          <XCircle className="w-8 h-8 text-red-600" />
                        )}
                        <div>
                          <span className={cn(
                            "font-bold text-lg block",
                            canGrantOffDay.canGrant ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                          )}>
                            {canGrantOffDay.message}
                          </span>
                          {selectedEmployee && (
                            <span className="text-sm text-muted-foreground">
                              for {selectedEmployee.initials} ({selectedEmployee.name})
                            </span>
                          )}
                        </div>
                      </div>

                      {canGrantOffDay.positionVacation && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold mb-2">Position Availability:</p>
                          <div className="grid grid-cols-2 gap-3">
                            {(() => {
                              const isSelectedSE = selectedEmployee?.role === 'SrEng';
                              const seAfterTakingOff = isSelectedSE
                                ? canGrantOffDay.positionVacation.seOnDuty - 1
                                : canGrantOffDay.positionVacation.seOnDuty;
                              const seOk = isSelectedSE
                                ? seAfterTakingOff >= MIN_SE_ON_DUTY
                                : canGrantOffDay.positionVacation.seCanTake > 0;
                              return (
                                <div className={cn(
                                  "rounded-lg p-3 border",
                                  seOk
                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                )}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">SE</span>
                                    {seOk ? (
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-red-600" />
                                    )}
                                  </div>
                                  <div className="text-2xl font-bold mt-1">
                                    {canGrantOffDay.positionVacation.seCanTake}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    can take off
                                  </div>
                                  <div className="text-xs mt-1">
                                    ({canGrantOffDay.positionVacation.seOnDuty} on duty, min {MIN_SE_ON_DUTY})
                                  </div>
                                </div>
                              );
                            })()}
                            {(() => {
                              const isSelectedPS = selectedEmployee?.role === 'PS';
                              const psAfterTakingOff = isSelectedPS
                                ? canGrantOffDay.positionVacation.psOnDuty - 1
                                : canGrantOffDay.positionVacation.psOnDuty;
                              const psOk = isSelectedPS
                                ? psAfterTakingOff >= MIN_PS_ON_DUTY
                                : canGrantOffDay.positionVacation.psCanTake > 0;
                              return (
                                <div className={cn(
                                  "rounded-lg p-3 border",
                                  psOk
                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                )}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">PS</span>
                                    {psOk ? (
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-red-600" />
                                    )}
                                  </div>
                                  <div className="text-2xl font-bold mt-1">
                                    {canGrantOffDay.positionVacation.psCanTake}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    can take off
                                  </div>
                                  <div className="text-xs mt-1">
                                    ({canGrantOffDay.positionVacation.psOnDuty} on duty, min {MIN_PS_ON_DUTY})
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {canGrantOffDay.stats && (
                        <div className="grid grid-cols-5 gap-2 mb-4 text-sm">
                          <div className="bg-white/70 dark:bg-black/20 rounded p-2 text-center">
                            <div className="font-bold text-lg">{canGrantOffDay.stats.currentManhours?.toFixed(0) || 0}</div>
                            <div className="text-xs text-muted-foreground">Manhours</div>
                          </div>
                          <div className="bg-white/70 dark:bg-black/20 rounded p-2 text-center">
                            <div className="font-bold text-lg">{canGrantOffDay.stats.b1OnDuty || 0}</div>
                            <div className="text-xs text-muted-foreground">B1</div>
                          </div>
                          <div className="bg-white/70 dark:bg-black/20 rounded p-2 text-center">
                            <div className="font-bold text-lg">{canGrantOffDay.stats.b2OnDuty || 0}</div>
                            <div className="text-xs text-muted-foreground">B2</div>
                          </div>
                          <div className="bg-white/70 dark:bg-black/20 rounded p-2 text-center">
                            <div className="font-bold text-lg">{canGrantOffDay.stats.catAOnDuty || 0}</div>
                            <div className="text-xs text-muted-foreground">Cat A</div>
                          </div>
                          <div className="bg-white/70 dark:bg-black/20 rounded p-2 text-center">
                            <div className="font-bold text-lg">{canGrantOffDay.stats.sickCount || 0}</div>
                            <div className="text-xs text-muted-foreground">Sick</div>
                          </div>
                        </div>
                      )}
                    </Card>

                    {canGrantOffDay.results?.map((dayResult, dayIdx) => (
                      <Card key={dayIdx} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          {dayResult.result.canGrant ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="font-semibold">
                            {format(new Date(dayResult.dateStr), 'EEE, MMM d')}
                          </span>
                          <Badge variant={dayResult.result.canGrant ? "default" : "destructive"}>
                            {dayResult.result.canGrant ? 'OK' : 'NO'}
                          </Badge>
                          {selectedEmployee && dayResult.result.canGrant && (
                            <Button
                              size="sm"
                              className="ml-auto"
                              onClick={() => applyOffDay(dayResult.dateStr)}
                              data-testid={`apply-off-day-${dayIdx}`}
                            >
                              Apply {offDayType}
                            </Button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {dayResult.result.reasons.map((reason, idx) => (
                            <div key={idx} className={cn(
                              "flex items-start gap-2 text-sm p-2 rounded",
                              reason.type === 'yes' ? "bg-green-100/50 dark:bg-green-900/20" :
                                reason.type === 'no' ? "bg-red-100/50 dark:bg-red-900/20" :
                                  "bg-blue-100/50 dark:bg-blue-900/20"
                            )}>
                              {reason.type === 'yes' ? (
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : reason.type === 'no' ? (
                                <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              )}
                              <span className={
                                reason.type === 'yes' ? "text-green-700 dark:text-green-400" :
                                  reason.type === 'no' ? "text-red-700 dark:text-red-400" :
                                    "text-blue-700 dark:text-blue-400"
                              }>
                                {reason.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}

                    {selectedEmployee && canGrantOffDay.canGrant && canGrantOffDay.results && canGrantOffDay.results.length > 1 && (
                      <Button
                        className="w-full"
                        onClick={applyAllOffDays}
                        data-testid="apply-all-off-days"
                      >
                        Apply {offDayType} to All {canGrantOffDay.results.filter(r => r.result.canGrant).length} Approved Days
                      </Button>
                    )}

                    <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                      <p className="font-semibold mb-1">Off Day Rules:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Minimum {MIN_MANHOURS_OFF_DAY} manhours must remain</li>
                        <li>Minimum {MIN_SE_ON_DUTY} SE must remain on duty</li>
                        <li>Minimum {MIN_PS_ON_DUTY} PS must remain on duty</li>
                        <li>B1/B2/Cat A coverage based on % of {MIN_MANHOURS_OFF_DAY}h vs total potential</li>
                        <li>Grade 0% employees can always take off</li>
                        <li>B1-2 license counts toward both B1 and B2</li>
                      </ul>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-training-view">
                <GraduationCap className="w-4 h-4" />
                Education
                {educationEmployees.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {educationEmployees.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Training & Education Overview
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Popover open={educationCalendarOpen} onOpenChange={setEducationCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(educationStartDate, 'MMM d, yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={educationStartDate}
                          onSelect={(date) => { if (date) { setEducationStartDate(date); setEducationCalendarOpen(false); } }}
                          weekStartsOn={1}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Period</Label>
                    <Select value={String(educationDays)} onValueChange={(v) => setEducationDays(Number(v))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(educationStartDate, 'MMM d')} - {format(addDays(educationStartDate, educationDays - 1), 'MMM d, yyyy')}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {EDUCATION_CODES.map(ec => (
                    <div key={ec.code} className="flex items-center gap-1.5 text-xs px-2 py-1 bg-muted rounded">
                      <span className={cn("w-2.5 h-2.5 rounded-full", ec.color)} />
                      <span className="font-medium">{ec.code}</span>
                      <span className="text-muted-foreground">- {ec.label}</span>
                    </div>
                  ))}
                </div>

                {educationEmployees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No employees in training/school during this period
                  </div>
                ) : (
                  <ScrollArea className="h-[350px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {educationEmployees.map((emp, idx) => (
                          <TableRow key={`${emp.id}-${emp.educationDate}-${idx}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                                  {emp.initials}
                                </div>
                                <span className="font-medium">{emp.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{emp.department.replace('S/', '')}</TableCell>
                            <TableCell>{format(new Date(emp.educationDate), 'EEE, MMM d')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full", emp.educationColor)} />
                                <Badge variant="outline" className="text-xs">{emp.educationType}</Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}

                <div className="flex justify-between items-center text-sm text-muted-foreground pt-2 border-t">
                  <span>Total: {educationEmployees.length} education entries</span>
                  <span>{new Set(educationEmployees.map(e => e.id)).size} unique employees</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2">
            <Dialog open={vacationDialogOpen} onOpenChange={setVacationDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-vacation-summary">
                  <CalendarIcon className="w-4 h-4 text-orange-500" />
                  Vacation Summary
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {vacationSummary.reduce((sum, e) => sum + e.vCount, 0)}
                  </Badge>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <DialogTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-orange-500" />
                    Vacation Summary
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6">
                  <ScrollArea className="h-[500px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead className="text-center">Vacation Days</TableHead>
                          <TableHead>Dates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vacationSummary.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                                  {emp.initials}
                                </div>
                                <span className="font-medium">{emp.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{emp.department.replace('S/', '')}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={emp.vCount > 0 ? "default" : "secondary"} className="min-w-[32px]">
                                {emp.vCount}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {emp.vCount > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {emp.vDates.map(date => (
                                    <Badge key={date} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                      {format(new Date(date), 'MMM d')}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="flex justify-between items-center text-sm text-muted-foreground pt-4 border-t mt-4">
                    <span>Total Vacation days: {vacationSummary.reduce((sum, e) => sum + e.vCount, 0)}</span>
                    <span>{vacationSummary.filter(e => e.vCount > 0).length} employees with Vacation</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={ftDialogOpen} onOpenChange={setFtDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-ft-summary">
                  <CalendarIcon className="w-4 h-4 text-amber-600" />
                  FT Summary
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {ftSummary.reduce((sum, e) => sum + e.ftCount, 0)}
                  </Badge>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <DialogTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-amber-600" />
                    FT (Feiertag/Holiday) Summary
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6">
                  <ScrollArea className="h-[500px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead className="text-center">FT Count</TableHead>
                          <TableHead>Dates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ftSummary.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                                  {emp.initials}
                                </div>
                                <span className="font-medium">{emp.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{emp.department.replace('S/', '')}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={emp.ftCount > 0 ? "default" : "secondary"} className="min-w-[32px]">
                                {emp.ftCount}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {emp.ftCount > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {emp.ftDates.map(date => (
                                    <Badge key={date} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                      {format(new Date(date), 'MMM d')}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="flex justify-between items-center text-sm text-muted-foreground pt-4 border-t mt-4">
                    <span>Total FT days: {ftSummary.reduce((sum, e) => sum + e.ftCount, 0)}</span>
                    <span>{ftSummary.filter(e => e.ftCount > 0).length} employees with FT</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-department-filter">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="S/TMBA">TMBA</SelectItem>
              <SelectItem value="S/TMBAA">TMBAA</SelectItem>
              <SelectItem value="S/TMBAB">TMBAB</SelectItem>
              <SelectItem value="S/TMBAC">TMBAC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Hours</p>
              <p className={cn(
                "text-xl font-display font-bold",
                dailyManhours < DAILY_TARGET ? "text-red-500" : "text-green-500"
              )}>{dailyManhours.toFixed(1)}</p>
            </div>
          </div>
        </Card>

        <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
          <DialogTrigger asChild>
            <Card className="p-4 bg-card border-border cursor-pointer hover:bg-muted/50 transition-colors relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit2 className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Target</p>
                  <p className="text-xl font-display font-bold">
                    {dailyTargets[selectedDateStr] || DAILY_TARGET}h
                  </p>
                  {dailyTargets[selectedDateStr] && (
                    <p className="text-xs text-muted-foreground font-medium text-primary">Custom Set</p>
                  )}
                </div>
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set Daily Target</DialogTitle>
              <div className="text-sm text-muted-foreground">
                Set manhours target for {format(selectedDate, 'MMMM d, yyyy')}
              </div>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="target">Target Hours</Label>
                <Input
                  id="target"
                  type="number"
                  placeholder="216"
                  defaultValue={dailyTargets[selectedDateStr] || DAILY_TARGET}
                  onChange={(e) => setTempTarget(e.target.value)}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Standard default is 216 hours.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setDailyTarget(selectedDateStr, 216); // Reset to default logic (technically sets 216 explicitly)
                // Or better: remove key. But for now explicit 216 is fine or 0 to clear.
                // Let's stick to setting the value.
                setTargetDialogOpen(false);
              }}>
                Reset to Default
              </Button>
              <Button onClick={() => {
                const val = parseFloat(tempTarget);
                if (!isNaN(val)) {
                  setDailyTarget(selectedDateStr, val);
                }
                setTargetDialogOpen(false);
              }}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">On Duty</p>
              <p className="text-xl font-display font-bold">{dayStats.onDuty}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Off Duty</p>
              <p className="text-xl font-display font-bold">{dayStats.offDuty}</p>
            </div>
          </div>
        </Card>
      </div>

      {importMetadata && (
        <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground border" data-testid="import-metadata-info">
          <span className="font-medium text-foreground">Data Source:</span>
          <span>Imported {format(new Date(importMetadata.importedAt), 'MMM d, yyyy HH:mm')}</span>
          <span className="text-border">|</span>
          <span>{importMetadata.employeeCount} employees</span>
          <span className="text-border">|</span>
          <span>{importMetadata.assignmentCount.toLocaleString()} assignments</span>
          {importMetadata.dateRange && (
            <>
              <span className="text-border">|</span>
              <span>Range: {format(new Date(importMetadata.dateRange.start), 'MMM d')} - {format(new Date(importMetadata.dateRange.end), 'MMM d, yyyy')}</span>
            </>
          )}
        </div>
      )}

      {viewMode === 'day' && (
        <Card className="overflow-hidden border-border">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')} data-testid="button-prev-day">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h2 className="font-display font-semibold text-lg">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <div className="flex items-center justify-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>Early: {dayStats.earlyShifts}</span>
                <span>Late: {dayStats.lateShifts}</span>
                <span>Off: {dayStats.offDuty}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateDay('next')} data-testid="button-next-day">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEmployees.map((employee) => {
                const currentShift = getAssignment(selectedDateStr, employee.id) || '-';
                const shiftInfo = SHIFT_CODES.find(s => s.code === currentShift);

                return (
                  <div
                    key={employee.id}
                    className={cn(
                      "p-3 rounded-lg border flex items-center justify-between",
                      employee.role === 'PM' && "bg-amber-50 border-amber-200",
                      employee.role === 'PS' && "bg-emerald-50 border-emerald-200",
                      employee.role === 'SrEng' && "bg-lime-50 border-lime-200",
                      !['PM', 'PS', 'SrEng'].includes(employee.role) && "bg-card border-border"
                    )}
                    data-testid={`employee-card-${employee.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-mono font-bold text-primary">
                        {employee.initials}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{employee.name}</p>
                        <p className="text-xs text-muted-foreground">{employee.role} • {employee.department.replace('S/', '')}</p>
                      </div>
                    </div>
                    <ShiftCodeSelect
                      value={currentShift}
                      onValueChange={(value) => handleShiftChange(selectedDateStr, employee.id, value)}
                      data-testid={`select-shift-day-${employee.id}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {viewMode === 'week' && (
        <Card className="overflow-hidden border-border">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')} data-testid="button-prev-week">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Select
                value={String(getWeek(selectedDate, { weekStartsOn: 1, firstWeekContainsDate: 4 }))}
                onValueChange={(val) => {
                  startTransition(() => {
                    const newDate = setWeek(selectedDate, parseInt(val), { weekStartsOn: 1, firstWeekContainsDate: 4 });
                    setSelectedDate(startOfWeek(newDate, { weekStartsOn: 1 }));
                  });
                }}
              >
                <SelectTrigger className="w-[100px]" data-testid="select-week">
                  <SelectValue placeholder="Week" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[300px]">
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                      <SelectItem key={week} value={String(week)}>Week {week}</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <Select
                value={String(selectedDate.getFullYear())}
                onValueChange={(val) => {
                  startTransition(() => {
                    setSelectedDate(new Date(parseInt(val), selectedDate.getMonth(), selectedDate.getDate()));
                  });
                }}
              >
                <SelectTrigger className="w-[90px]" data-testid="select-week-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028].map((year) => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {format(new Date(weekDates[0]), 'MMM d')} - {format(new Date(weekDates[6]), 'MMM d')}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')} data-testid="button-next-week">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <WeekView
              employees={filteredEmployees}
              weekDates={weekDates}
              getAssignment={getAssignment}
              onShiftChange={handleShiftChange}
              onDayClick={(date) => {
                startTransition(() => {
                  setSelectedDate(new Date(date));
                });
              }}
            />
          </div>
        </Card>
      )}

      {viewMode === 'month' && (
        <Card className="overflow-hidden border-border">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')} data-testid="button-prev-month">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Select
                value={String(selectedDate.getMonth())}
                onValueChange={(val) => {
                  startTransition(() => {
                    setSelectedDate(new Date(selectedDate.getFullYear(), parseInt(val), 1));
                  });
                }}
              >
                <SelectTrigger className="w-[130px]" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(selectedDate.getFullYear())}
                onValueChange={(val) => {
                  startTransition(() => {
                    setSelectedDate(new Date(parseInt(val), selectedDate.getMonth(), 1));
                  });
                }}
              >
                <SelectTrigger className="w-[90px]" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028].map((year) => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')} data-testid="button-next-month">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            {monthDays.length > 0 && (
              <MonthView
                employees={filteredEmployees}
                monthDays={monthDays}
                getAssignment={getAssignment}
                onShiftChange={handleShiftChange}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
