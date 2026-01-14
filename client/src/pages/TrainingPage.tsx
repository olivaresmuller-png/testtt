import { useState, useMemo } from 'react';
import { format, parse, eachDayOfInterval, isWithinInterval } from 'date-fns';
import {
  GraduationCap, Plus, Trash2, Edit2, Save, X, Calendar, Users, CheckCircle2,
  AlertTriangle, XCircle, ChevronRight, ChevronDown, Search, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/StoreContext';
import { isOnDuty, canWorkOnAircraft, calculateManhours, getShiftHours, ShiftCode, EmployeeSkill, Employee, DayAssignment } from '@/lib/data';

interface TrainingGoal {
  id: string;
  label: string;
  reqAircraft: string | null;
  excludes?: string[];
}

const TRAINING_GOALS: TrainingGoal[] = [
  // Borescope
  { id: 'A32CFM Boro', label: 'Borescope A320 CFM', reqAircraft: 'A320 CF', excludes: ['Boro ALL'] },
  { id: 'A32PW Boro', label: 'Borescope A320 PW', reqAircraft: 'A320 NEO', excludes: ['Boro ALL'] },
  { id: 'A330RR Boro', label: 'Borescope A330 RR', reqAircraft: 'A330 RR', excludes: ['Boro ALL'] },
  { id: 'A340 Boro', label: 'Borescope A340', reqAircraft: 'A343', excludes: ['Boro ALL'] },
  { id: 'A350 Boro', label: 'Borescope A350', reqAircraft: 'A350', excludes: ['Boro ALL'] },
  { id: 'A220 Boro', label: 'Borescope A220', reqAircraft: 'A220', excludes: ['Boro ALL'] },
  { id: 'B777 Boro', label: 'Borescope B777', reqAircraft: 'B777', excludes: ['Boro ALL'] },

  // Run Up (RU)
  { id: 'A220 RU', label: 'Run Up A220', reqAircraft: 'A220' },
  { id: 'A320 RU', label: 'Run Up A320', reqAircraft: 'A320 CF', excludes: ['32S RU'] },
  { id: 'A320NEO RU', label: 'Run Up A320 NEO', reqAircraft: 'A320 NEO', excludes: ['32 RU PW'] },
  { id: 'A330 RU', label: 'Run Up A330', reqAircraft: 'A330 RR' },
  { id: 'A343 RU', label: 'Run Up A343', reqAircraft: 'A343', excludes: ['343 RU'] },
  { id: 'A350 RU', label: 'Run Up A350', reqAircraft: 'A350', excludes: ['A350 RU'] },
  { id: 'B777 RU', label: 'Run Up B777', reqAircraft: 'B777', excludes: ['777 RU'] },

  // General / Special Skills
  { id: 'FUEL TANK', label: 'Fuel Tank Safety', reqAircraft: null, excludes: ['FUEL TANK'] },
  { id: 'Walliclean', label: 'Walliclean', reqAircraft: null },
  { id: 'Forklift', label: 'Forklift', reqAircraft: null },
  { id: 'CYCLEAN', label: 'Cyclean', reqAircraft: null, excludes: ['CS RU', 'CYCLEAN'] },
  { id: 'Cobra', label: 'Cobra', reqAircraft: null },
  { id: 'Cee Bee', label: 'Cee Bee', reqAircraft: null, excludes: ['Cee Bee'] },
  { id: 'OXY Hand', label: 'Oxygen Handling', reqAircraft: null, excludes: ['OXY Hand'] },
  { id: 'ENTRY', label: 'Entry/Confined Space', reqAircraft: null, excludes: ['ENTRY'] },
];

interface DateRange {
  id: string;
  startDate: string;
  endDate: string;
}

interface Training {
  id: string;
  name: string;
  dateRanges: DateRange[];
  selectedEmployees: string[];
  maxGroupSize?: number;
  minManhours?: number;
  createdAt: string;
}

interface ConflictDetail {
  date: string;
  type: 'vacation' | 'sick' | 'training' | 'comp' | 'other';
  code: string;
}

interface AvailabilityResult {
  employeeId: string;
  employeeName: string;
  dateRangeId: string;
  status: 'available' | 'conflict' | 'staffing_issue';
  conflicts: ConflictDetail[];
  staffingImpact: string | null;
}

const CONFLICT_CODES: Record<string, { type: ConflictDetail['type']; label: string }> = {
  // Vacation / Off
  'V': { type: 'vacation', label: 'Vacation' },
  'LD': { type: 'vacation', label: 'Day Off' },
  'OFF': { type: 'vacation', label: 'Day Off' },
  '-': { type: 'vacation', label: 'Day Off' },
  'GA': { type: 'vacation', label: 'GATA Office Days' },
  'J': { type: 'vacation', label: 'Joker Day' },
  'L+': { type: 'vacation', label: 'Unpaid Leave App' },
  'KA': { type: 'vacation', label: 'Shortwork' },
  'ka': { type: 'vacation', label: 'Shortwork' },

  // Sick / Accidents
  'K': { type: 'sick', label: 'Sick Leave' },
  'KK': { type: 'sick', label: 'Care of Relatives' },
  'IC': { type: 'sick', label: 'Sick w/ Cert' },
  'ic': { type: 'sick', label: 'Sick w/ Cert' },
  'IW': { type: 'sick', label: 'Sick w/o Cert' },
  'iw': { type: 'sick', label: 'Sick w/o Cert' },
  'ix': { type: 'sick', label: 'Sick Halfday' },
  'IX': { type: 'sick', label: 'Sick w/o Cert' },
  'ih': { type: 'sick', label: 'Sick w/ Cert Halfday' },
  'im': { type: 'sick', label: 'Sick Pregnancy' },
  'IM': { type: 'sick', label: 'Baby Leave' },
  'IB': { type: 'sick', label: 'Baby Leave w/ Cert' },
  'in': { type: 'sick', label: 'Child Care' },
  'IN': { type: 'sick', label: 'Nurse Relative' },
  'IP': { type: 'sick', label: 'Sick (PEP)' },
  'AB': { type: 'sick', label: 'Accident w/ Cert' },
  'ab': { type: 'sick', label: 'Accident w/ Cert' },
  'AC': { type: 'sick', label: 'Accident w/ Cert' },
  'ac': { type: 'sick', label: 'Accident' },
  'ah': { type: 'sick', label: 'Accident Halfday' },
  'AP': { type: 'sick', label: 'Accident (PEP)' },
  'AW': { type: 'sick', label: 'Accident w/o Cert' },
  'aw': { type: 'sick', label: 'Accident w/o Cert' },
  'AX': { type: 'sick', label: 'Accident' },
  'ax': { type: 'sick', label: 'Accident Halfday' },
  'CX': { type: 'sick', label: 'Corona Off' },

  // Training / Education
  'ED': { type: 'training', label: 'Education/Training' },
  'ET': { type: 'training', label: 'Education Trip' },
  'SI': { type: 'training', label: 'School Off' },
  'TR': { type: 'training', label: 'Training' },
  't4': { type: 'training', label: 'Training 4H' },

  // Comp Time / Flexi
  'CO': { type: 'comp', label: 'Comp Day' },
  'KO': { type: 'comp', label: 'Komp. Overtime' },
  'ko': { type: 'comp', label: 'Komp. Overtime' },
  'KB': { type: 'comp', label: 'Komp. Timebonus' },
  'kb': { type: 'comp', label: 'Komp. Timebonus' },
  'KH': { type: 'comp', label: 'Komp. Overtime' },
  'kh': { type: 'comp', label: 'Komp. Overtime' },
  'kx': { type: 'comp', label: 'Komp. Overtime' },
  'FL': { type: 'comp', label: 'Flexitime' },
  'fl': { type: 'comp', label: 'Flexitime' },
  'F+': { type: 'comp', label: 'Flexitime' },
  'f+': { type: 'comp', label: 'Komp. Request' },
  'k+': { type: 'comp', label: 'Komp. Request' },
  'K+': { type: 'comp', label: 'Compensation' },

  // Other / Military
  'MI': { type: 'other', label: 'Military' },
  'MW': { type: 'other', label: 'Military' },
  'MC': { type: 'other', label: 'Military' },
  'M%': { type: 'other', label: 'Military Withdrawn' },
  'M+': { type: 'other', label: 'Military Applied' },
  'Fe': { type: 'other', label: 'Holiday' },
  'FT': { type: 'other', label: 'Feiertag' },
  'I': { type: 'other', label: 'Unexp. Absence' },
  'PD': { type: 'other', label: 'Death Leave' },
  'PG': { type: 'other', label: 'Death Leave (In-Law)' },
  'PI': { type: 'other', label: 'Death Leave (Sibling)' },
  'PW': { type: 'other', label: 'Wedding Leave' },
  'PC': { type: 'other', label: 'Child Wedding' },
  'PB': { type: 'other', label: 'Birth Leave' },
  'PH': { type: 'other', label: 'Moving (>100km)' },
  'PM': { type: 'other', label: 'Moving (1 Day)' }, // Note: PM used as role and shift code? Wait, PM is moving? 'Moving (1 Day)'. Okay, context matters. In current `data.ts` shift codes are strings, roles are strings. `PM` matches Role 'PM'. This collision is tricky. But `DayAssignment` has `shiftCode`. Role is on `Employee` object. They separate.
  'PL': { type: 'other', label: 'Paid Leave' },
  'UL': { type: 'other', label: 'Unpaid Leave' },
};

const STORAGE_KEY = 'aerostaff_trainings';

const loadTrainings = (): Training[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveTrainings = (trainings: Training[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trainings));
};

export function TrainingPage() {
  const { employees, assignments, getAssignment, dailyTargets } = useAppStore();
  const [trainings, setTrainings] = useState<Training[]>(loadTrainings);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDateRanges, setEditDateRanges] = useState<DateRange[]>([]);
  const [editSelectedEmployees, setEditSelectedEmployees] = useState<string[]>([]);
  const [editMaxGroupSize, setEditMaxGroupSize] = useState<string>('');
  const [editMinManhours, setEditMinManhours] = useState<string>('216');

  const [employeeSearch, setEmployeeSearch] = useState('');

  const [activeTab, setActiveTab] = useState('saved');
  const [plannerGoal, setPlannerGoal] = useState<string>('');
  const [plannerSelection, setPlannerSelection] = useState<string[]>([]);

  const plannerCandidates = useMemo(() => {
    if (!plannerGoal) return [];
    const goal = TRAINING_GOALS.find(g => g.id === plannerGoal);
    if (!goal) return [];

    return employees.filter((emp: Employee) => {
      // 1. Must NOT have the certification
      if (emp.certifications.includes(goal.id)) return false;

      // Check excludes (aliases)
      if (goal.excludes && goal.excludes.some(ex => emp.certifications.includes(ex))) return false;

      // 2. Prerequisite check
      if (goal.reqAircraft) {
        // Must have B1 or B1/2 license for the aircraft
        const hasLicense = emp.skills.some((s: EmployeeSkill) =>
          canWorkOnAircraft(s.aircraftType, goal.reqAircraft!) &&
          (s.license === 'B1' || s.license === 'B1/2')
        );
        return hasLicense;
      } else {
        // General training - assume all engineers are eligible
        return true;
      }
    });
  }, [employees, plannerGoal]);

  const togglePlannerSelection = (empId: string) => {
    setPlannerSelection((prev: string[]) =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const createTrainingFromPlanner = () => {
    const goal = TRAINING_GOALS.find(g => g.id === plannerGoal);
    if (!goal) return;

    const newTraining: Training = {
      id: `training_${Date.now()}`,
      name: `${goal.label} Training`,
      dateRanges: [{ id: `range_${Date.now()}`, startDate: '', endDate: '' }],
      selectedEmployees: plannerSelection,
      createdAt: new Date().toISOString(),
    };
    updateTrainings([...trainings, newTraining]);
    setSelectedTraining(newTraining);
    startEditing(newTraining);
    setActiveTab('saved');
    setPlannerGoal('');
    setPlannerSelection([]);
  };

  const updateTrainings = (newTrainings: Training[]) => {
    setTrainings(newTrainings);
    saveTrainings(newTrainings);
  };

  const createNewTraining = () => {
    const newTraining: Training = {
      id: `training_${Date.now()}`,
      name: 'New Training',
      dateRanges: [{ id: `range_${Date.now()}`, startDate: '', endDate: '' }],
      selectedEmployees: [],
      createdAt: new Date().toISOString(),
    };
    updateTrainings([...trainings, newTraining]);
    setSelectedTraining(newTraining);
    startEditing(newTraining);
  };

  const startEditing = (training: Training) => {
    setEditName(training.name);
    setEditDateRanges([...training.dateRanges]);
    setEditSelectedEmployees([...training.selectedEmployees]);
    setEditMaxGroupSize(training.maxGroupSize?.toString() || '');
    setEditMinManhours(training.minManhours?.toString() || '216');
    setIsEditing(true);
    setShowResults(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    if (selectedTraining?.name === 'New Training' && selectedTraining.dateRanges[0]?.startDate === '') {
      updateTrainings(trainings.filter((t: Training) => t.id !== selectedTraining.id));
      setSelectedTraining(null);
    }
  };

  const saveEditing = () => {
    if (!selectedTraining) return;

    const updated: Training = {
      ...selectedTraining,
      name: editName,
      dateRanges: editDateRanges.filter((r: DateRange) => r.startDate && r.endDate),
      selectedEmployees: editSelectedEmployees,
      maxGroupSize: editMaxGroupSize ? parseInt(editMaxGroupSize) : undefined,
      minManhours: editMinManhours ? parseFloat(editMinManhours) : 216,
    };

    updateTrainings(trainings.map((t: Training) => t.id === updated.id ? updated : t));
    setSelectedTraining(updated);
    setIsEditing(false);
  };

  const deleteTraining = (id: string) => {
    updateTrainings(trainings.filter((t: Training) => t.id !== id));
    if (selectedTraining?.id === id) {
      setSelectedTraining(null);
      setIsEditing(false);
    }
  };

  const addDateRange = () => {
    setEditDateRanges([...editDateRanges, { id: `range_${Date.now()}`, startDate: '', endDate: '' }]);
  };

  const removeDateRange = (id: string) => {
    setEditDateRanges(editDateRanges.filter((r: DateRange) => r.id !== id));
  };

  const updateDateRange = (id: string, field: 'startDate' | 'endDate', value: string) => {
    setEditDateRanges(editDateRanges.map((r: DateRange) => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleEmployee = (employeeId: string) => {
    if (editSelectedEmployees.includes(employeeId)) {
      setEditSelectedEmployees(editSelectedEmployees.filter((id: string) => id !== employeeId));
    } else {
      setEditSelectedEmployees([...editSelectedEmployees, employeeId]);
    }
  };

  const selectAllEmployees = () => {
    setEditSelectedEmployees(employees.map((e: Employee) => e.id));
  };

  const clearAllEmployees = () => {
    setEditSelectedEmployees([]);
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const search = employeeSearch.toLowerCase();
    return employees.filter((e: Employee) =>
      e.name.toLowerCase().includes(search) ||
      e.initials.toLowerCase().includes(search)
    );
  }, [employees, employeeSearch]);

  const checkAvailability = (): AvailabilityResult[] => {
    if (!selectedTraining) return [];

    const results: AvailabilityResult[] = [];

    selectedTraining.dateRanges.forEach((range: DateRange) => {
      if (!range.startDate || !range.endDate) return;

      let start: Date, end: Date;
      try {
        start = parse(range.startDate, 'yyyy-MM-dd', new Date());
        end = parse(range.endDate, 'yyyy-MM-dd', new Date());
      } catch {
        return;
      }

      const daysInRange = eachDayOfInterval({ start, end });

      selectedTraining.selectedEmployees.forEach((employeeId: string) => {
        const employee = employees.find((e: Employee) => e.id === employeeId);
        if (!employee) return;

        const conflicts: ConflictDetail[] = [];

        daysInRange.forEach((day: Date) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const assignment = getAssignment(dateStr, employeeId);

          if (assignment && CONFLICT_CODES[assignment]) {
            conflicts.push({
              date: dateStr,
              type: CONFLICT_CODES[assignment].type,
              code: assignment,
            });
          }
        });

        let staffingImpact: string | null = null;
        const staffingIssues: string[] = [];

        daysInRange.forEach((day: Date) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const onDutyEmployees = employees.filter((e: Employee) => {
            const code = getAssignment(dateStr, e.id);
            return isOnDuty(code || '-');
          });

          const srEngOnDuty = onDutyEmployees.filter((e: Employee) => e.role === 'SrEng').length;
          const psOnDuty = onDutyEmployees.filter((e: Employee) => e.role === 'PS').length;

          // Manhours Check
          const projectedManhours = employees.reduce((total: number, emp: Employee) => {
            // If this is the candidate, they contribute 0 (they will be on training)
            if (emp.id === employee.id) return total;

            // For others, use their existing assignment
            const code = getAssignment(dateStr, emp.id);
            if (isOnDuty(code || '-')) {
              const hours = getShiftHours(code as ShiftCode) || 0;
              return total + (hours * (emp.grade / 100));
            }
            return total;
          }, 0);

          // Use day-specific target if set, otherwise training setting, otherwise default 216
          const dayTarget = dailyTargets[dateStr];
          const minManhours = dayTarget !== undefined ? dayTarget : (selectedTraining.minManhours || 216);

          if (employee.role === 'SrEng' && srEngOnDuty <= 6) {
            staffingIssues.push(`${format(day, 'dd.MM')}: Would leave Senior staff below min (6), currently ${srEngOnDuty}`);
          } else if (employee.role === 'PS' && psOnDuty <= 2) {
            staffingIssues.push(`${format(day, 'dd.MM')}: Would leave PS below min (2), currently ${psOnDuty}`);
          }

          if (projectedManhours < minManhours) {
            staffingIssues.push(`${format(day, 'dd.MM')}: Manhours would drop to ${projectedManhours.toFixed(1)} (min ${minManhours})`);
          }
        });

        if (staffingIssues.length > 0) {
          staffingImpact = staffingIssues.join('\n');
        }

        let status: AvailabilityResult['status'] = 'available';
        if (conflicts.length > 0) {
          status = 'conflict';
        } else if (staffingImpact) {
          status = 'staffing_issue';
        }

        results.push({
          employeeId,
          employeeName: employee.name,
          dateRangeId: range.id,
          status,
          conflicts,
          staffingImpact,
        });
      });
    });

    return results;
  };

  const availabilityResults = useMemo(() => {
    if (!showResults || !selectedTraining) return [];
    return checkAvailability();
  }, [showResults, selectedTraining, employees, assignments]);

  const getDateRangeStats = (rangeId: string) => {
    const rangeResults = availabilityResults.filter((r: AvailabilityResult) => r.dateRangeId === rangeId);
    const available = rangeResults.filter((r: AvailabilityResult) => r.status === 'available').length;
    const conflicts = rangeResults.filter((r: AvailabilityResult) => r.status === 'conflict').length;
    const staffing = rangeResults.filter((r: AvailabilityResult) => r.status === 'staffing_issue').length;
    return { available, conflicts, staffing, total: rangeResults.length };
  };

  const getBestDateRange = () => {
    if (!selectedTraining || selectedTraining.dateRanges.length === 0) return null;

    let bestRange: DateRange | null = null;
    let bestAvailable = -1;

    selectedTraining.dateRanges.forEach((range: DateRange) => {
      const stats = getDateRangeStats(range.id);
      if (stats.available > bestAvailable) {
        bestAvailable = stats.available;
        bestRange = range;
      }
    });

    return bestRange;
  };

  const formatDateRange = (range: DateRange) => {
    if (!range.startDate || !range.endDate) return 'Not set';
    try {
      const start = parse(range.startDate, 'yyyy-MM-dd', new Date());
      const end = parse(range.endDate, 'yyyy-MM-dd', new Date());
      return `${format(start, 'dd.MM.yyyy')} - ${format(end, 'dd.MM.yyyy')}`;
    } catch {
      return 'Invalid dates';
    }
  };

  const calculateDailyCapacity = (dateStr: string) => {
    // 1. Calculate total scheduled manhours for the day (baseline)
    const totalManhours = employees.reduce((total: number, emp: Employee) => {
      const code = getAssignment(dateStr, emp.id);
      if (isOnDuty(code || '-')) {
        const hours = getShiftHours(code as any) || 0;
        return total + (hours * (emp.grade / 100));
      }
      return total;
    }, 0);

    // 2. Get target
    const dayTarget = dailyTargets[dateStr];
    const minManhours = dayTarget !== undefined ? dayTarget : (selectedTraining?.minManhours || 216);

    // 3. Calculate buffer
    return {
      total: totalManhours,
      min: minManhours,
      buffer: totalManhours - minManhours,
      maxEmployees: Math.floor((totalManhours - minManhours) / 8)
    };
  };

  const getRangeCapacity = (range: DateRange) => {
    if (!range.startDate || !range.endDate) return null;

    let start: Date, end: Date;
    try {
      start = parse(range.startDate, 'yyyy-MM-dd', new Date());
      end = parse(range.endDate, 'yyyy-MM-dd', new Date());
    } catch {
      return null;
    }

    const daysInRange = eachDayOfInterval({ start, end });

    let minCapacity = Infinity;
    let worstDayInfo = null;

    daysInRange.forEach((day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const capacity = calculateDailyCapacity(dateStr);

      if (capacity.maxEmployees < minCapacity) {
        minCapacity = capacity.maxEmployees;
        worstDayInfo = { date: dateStr, ...capacity };
      }
    });

    return worstDayInfo ? { minCapacity, worstDayInfo } : null;
  };

  return (
    <div className="space-y-6" data-testid="training-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            Training Availability
          </h1>
          <p className="text-muted-foreground mt-1">
            Check employee availability for training courses
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1">
          <TabsTrigger value="saved" className="px-6 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Saved Trainings
          </TabsTrigger>
          <TabsTrigger value="planner" className="px-6 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Training Planner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Saved Trainings</CardTitle>
                    <Button size="sm" onClick={createNewTraining} data-testid="button-new-training">
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {trainings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No trainings saved yet</p>
                        <p className="text-sm">Click "New" to create one</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {trainings.map((training: Training) => (
                          <div
                            key={training.id}
                            onClick={() => {
                              setSelectedTraining(training);
                              setIsEditing(false);
                              setShowResults(false);
                            }}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedTraining?.id === training.id
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-muted/50 border-transparent"
                            )}
                            data-testid={`training-item-${training.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{training.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {training.selectedEmployees.length} employees · {training.dateRanges.length} date option(s)
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8">
              {!selectedTraining ? (
                <Card className="h-[570px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Select a training or create a new one</p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e: any) => setEditName(e.target.value)}
                          className="text-xl font-semibold max-w-md"
                          placeholder="Training name"
                          data-testid="input-training-name"
                        />
                      ) : (
                        <CardTitle className="text-xl">{selectedTraining.name}</CardTitle>
                      )}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button variant="outline" size="sm" onClick={cancelEditing}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveEditing} data-testid="button-save-training">
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => startEditing(selectedTraining)}>
                              <Edit2 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteTraining(selectedTraining.id)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4" />
                        Date Options
                      </Label>
                      {isEditing ? (
                        <div className="space-y-3">
                          {editDateRanges.map((range: DateRange, index: number) => (
                            <div key={range.id} className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground w-16">Option {index + 1}</span>
                              <Input
                                type="date"
                                value={range.startDate}
                                onChange={(e: any) => updateDateRange(range.id, 'startDate', e.target.value)}
                                className="w-40"
                              />
                              <span className="text-muted-foreground">to</span>
                              <Input
                                type="date"
                                value={range.endDate}
                                onChange={(e: any) => updateDateRange(range.id, 'endDate', e.target.value)}
                                className="w-40"
                              />
                              {editDateRanges.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removeDateRange(range.id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={addDateRange}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Date Option
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedTraining.dateRanges.map((range: DateRange, index: number) => (
                            <Badge key={range.id} variant="secondary" className="text-sm py-1 px-3">
                              Option {index + 1}: {formatDateRange(range)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Employees ({isEditing ? editSelectedEmployees.length : selectedTraining.selectedEmployees.length})
                        </Label>
                        {isEditing && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Search..."
                              value={employeeSearch}
                              onChange={(e: any) => setEmployeeSearch(e.target.value)}
                              className="w-40 h-8"
                            />
                            <Button variant="outline" size="sm" onClick={selectAllEmployees}>
                              Select All
                            </Button>
                            <Button variant="outline" size="sm" onClick={clearAllEmployees}>
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <ScrollArea className="h-48 border rounded-lg p-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {filteredEmployees.map((employee: Employee) => (
                              <div
                                key={employee.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                                  editSelectedEmployees.includes(employee.id)
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/50"
                                )}
                                onClick={() => toggleEmployee(employee.id)}
                              >
                                <Checkbox
                                  checked={editSelectedEmployees.includes(employee.id)}
                                  onCheckedChange={() => toggleEmployee(employee.id)}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{employee.name}</p>
                                  <p className="text-xs text-muted-foreground">{employee.initials} · {employee.role}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {selectedTraining.selectedEmployees.slice(0, 10).map(id => {
                            const emp = employees.find(e => e.id === id);
                            return emp ? (
                              <Badge key={id} variant="outline" className="text-xs">
                                {emp.name}
                              </Badge>
                            ) : null;
                          })}
                          {selectedTraining.selectedEmployees.length > 10 && (
                            <Badge variant="outline" className="text-xs">
                              +{selectedTraining.selectedEmployees.length - 10} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-base font-semibold mb-3 block">
                            Parameters
                          </Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium mb-1.5 block">
                                Max Group Size
                              </Label>
                              <Input
                                type="number"
                                value={editMaxGroupSize}
                                onChange={(e: any) => setEditMaxGroupSize(e.target.value)}
                                placeholder="No limit"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium mb-1.5 block">
                                Min Manhours
                              </Label>
                              <Input
                                type="number"
                                value={editMinManhours}
                                onChange={(e: any) => setEditMinManhours(e.target.value)}
                                placeholder="216"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {!isEditing && selectedTraining.selectedEmployees.length > 0 && selectedTraining.dateRanges.some(r => r.startDate && r.endDate) && (
                      <>
                        <Separator />
                        <div className="flex justify-center">
                          <Button
                            size="lg"
                            onClick={() => setShowResults(true)}
                            className="px-8"
                            data-testid="button-check-availability"
                          >
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Check Availability
                          </Button>
                        </div>
                      </>
                    )}

                    {showResults && availabilityResults.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-base font-semibold mb-3 block">
                            Availability Results
                          </Label>

                          {getBestDateRange() && selectedTraining.dateRanges.length > 1 && (
                            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Recommended: {formatDateRange(getBestDateRange()!)}
                              </p>
                            </div>
                          )}

                          {selectedTraining.dateRanges.map((range: DateRange, rangeIndex: number) => {
                            const stats = getDateRangeStats(range.id);
                            const rangeResults = availabilityResults.filter((r: AvailabilityResult) => r.dateRangeId === range.id);

                            return (
                              <div key={range.id} className="mb-4">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="font-medium">Option {rangeIndex + 1}: {formatDateRange(range)}</span>
                                  <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                    {stats.available} available
                                  </Badge>
                                  {stats.conflicts > 0 && (
                                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                                      {stats.conflicts} conflicts
                                    </Badge>
                                  )}
                                  {stats.staffing > 0 && (
                                    <Badge variant="secondary" className="bg-red-500/20 text-red-600">
                                      {stats.staffing} staffing issues
                                    </Badge>
                                  )}

                                  {/* Max Capacity Badge */}
                                  {(() => {
                                    const capacity = getRangeCapacity(range);
                                    if (capacity) {
                                      const count = capacity.minCapacity;
                                      const isTight = count < 0;
                                      return (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "ml-auto border-2",
                                            isTight
                                              ? "border-red-500/50 text-red-700 bg-red-50"
                                              : "border-blue-500/50 text-blue-700 bg-blue-50"
                                          )}
                                        >
                                          {isTight ? (
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                          ) : (
                                            <Users className="h-3 w-3 mr-1" />
                                          )}
                                          Max Capacity: {count > 0 ? count : 0} {count === 1 ? 'employee' : 'employees'}
                                          {isTight && " (Understaffed)"}
                                        </Badge>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>

                                <div className="space-y-2">
                                  {rangeResults.map((result: AvailabilityResult) => {
                                    const hasDetails = result.conflicts.length > 0 || result.staffingImpact;

                                    if (!hasDetails) {
                                      return (
                                        <div
                                          key={`${result.employeeId}-${result.dateRangeId}`}
                                          className={cn(
                                            "p-3 rounded border",
                                            result.status === 'available' && "bg-green-500/10 border-green-500/30"
                                          )}
                                        >
                                          <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <span className="text-sm font-medium">{result.employeeName}</span>
                                            <Badge variant="secondary" className="ml-auto text-xs bg-green-500/20 text-green-600">
                                              Available
                                            </Badge>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <Collapsible key={`${result.employeeId}-${result.dateRangeId}`}>
                                        <CollapsibleTrigger className="w-full">
                                          <div
                                            className={cn(
                                              "p-3 rounded border cursor-pointer transition-colors",
                                              result.status === 'conflict' && "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20",
                                              result.status === 'staffing_issue' && "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                                            )}
                                          >
                                            <div className="flex items-center gap-2">
                                              {result.status === 'conflict' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                              {result.status === 'staffing_issue' && <XCircle className="h-4 w-4 text-red-500" />}
                                              <span className="text-sm font-medium">{result.employeeName}</span>
                                              <Badge
                                                variant="secondary"
                                                className={cn(
                                                  "ml-auto text-xs",
                                                  result.status === 'conflict' && "bg-yellow-500/20 text-yellow-600",
                                                  result.status === 'staffing_issue' && "bg-red-500/20 text-red-600"
                                                )}
                                              >
                                                {result.status === 'conflict' ? 'Has Conflicts' : 'Staffing Issue'}
                                              </Badge>
                                              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                            </div>
                                          </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className={cn(
                                            "mt-1 p-3 rounded border-l-4 ml-4",
                                            result.status === 'conflict' && "bg-yellow-500/5 border-yellow-500",
                                            result.status === 'staffing_issue' && "bg-red-500/5 border-red-500"
                                          )}>
                                            {result.conflicts.length > 0 && (
                                              <div className="mb-2">
                                                <p className="font-medium text-sm text-yellow-600 dark:text-yellow-400 mb-1">Conflicts:</p>
                                                {result.conflicts.map((c: ConflictDetail, i: number) => (
                                                  <p key={i} className="text-sm pl-2">
                                                    • {format(parse(c.date, 'yyyy-MM-dd', new Date()), 'dd.MM.yyyy')}: <span className="font-medium">{CONFLICT_CODES[c.code]?.label || c.code}</span>
                                                  </p>
                                                ))}
                                              </div>
                                            )}
                                            {result.staffingImpact && (
                                              <div>
                                                <p className="font-medium text-sm text-red-600 dark:text-red-400 mb-1">Staffing Issues:</p>
                                                {result.staffingImpact.split('\n').map((line: string, i: number) => (
                                                  <p key={i} className="text-sm pl-2">• {line}</p>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="planner" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Training Goal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Training Type</Label>
                    <Select value={plannerGoal} onValueChange={setPlannerGoal}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a training type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_GOALS.map((goal: TrainingGoal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            {goal.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {plannerGoal && (() => {
                    const goal = TRAINING_GOALS.find(g => g.id === plannerGoal);
                    return (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                        <h4 className="font-medium flex items-center gap-2">
                          <Filter className="h-4 w-4 text-primary" />
                          Candidate Logic
                        </h4>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                          {goal?.reqAircraft ? (
                            <li>
                              <span className="text-green-600 dark:text-green-400 font-medium">Include:</span> Holds B1/B1-2 License for {goal.reqAircraft}
                            </li>
                          ) : (
                            <li>
                              <span className="text-green-600 dark:text-green-400 font-medium">Include:</span> All Staff (General Training)
                            </li>
                          )}
                          <li>
                            <span className="text-red-600 dark:text-red-400 font-medium">Exclude:</span> Already holds {goal?.label}
                          </li>
                        </ul>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8">
              {plannerGoal ? (
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Eligible Candidates ({plannerCandidates.length})
                    </CardTitle>
                    <Button
                      onClick={createTrainingFromPlanner}
                      disabled={plannerSelection.length === 0}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Training ({plannerSelection.length})
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] border rounded-lg p-4">
                      {plannerCandidates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>No eligible candidates found for this training.</p>
                          <p className="text-sm mt-1">Everyone eligible might already have this certification.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {plannerCandidates.map((employee: Employee) => (
                            <div
                              key={employee.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                plannerSelection.includes(employee.id)
                                  ? "bg-primary/5 border-primary shadow-sm"
                                  : "hover:bg-muted/50 border-border"
                              )}
                              onClick={() => togglePlannerSelection(employee.id)}
                            >
                              <Checkbox
                                checked={plannerSelection.includes(employee.id)}
                                onCheckedChange={() => togglePlannerSelection(employee.id)}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium">{employee.name}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                    {employee.role}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                    {employee.initials}
                                  </Badge>
                                  {employee.department && (
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                      {employee.department.replace('S/', '')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span>Select candidates to start planning a training session.</span>
                      {plannerCandidates.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPlannerSelection(plannerCandidates.map(e => e.id))}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPlannerSelection([])}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center text-muted-foreground max-w-sm mx-auto p-6">
                    <Filter className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium mb-2">Select a Training Goal</h3>
                    <p>Choose a training type from the left to find eligible employees who need this certification.</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TrainingPage;
