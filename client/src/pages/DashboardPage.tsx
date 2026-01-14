```typescript
import { useMemo, useState } from 'react';
import { format, startOfWeek, addDays, eachDayOfInterval, startOfMonth, endOfMonth, getISOWeek, isToday, isWeekend, subMonths } from 'date-fns';
import { TrendingUp, TrendingDown, Users, Clock, Target, AlertTriangle, CheckCircle, Calendar as CalendarIcon, ChevronDown, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAppStore } from '@/lib/StoreContext';
import { calculateManhours, calculateWeeklyManhours, isOnDuty, AIRCRAFT_TYPES, countLicensesByType, SHIFT_CODES, Department, DEPARTMENTS, Role } from '@/lib/data';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auditSchedule } from '@/lib/audit';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];


export function DashboardPage() {
  const { employees, assignments, selectedDate, getWeekDates } = useAppStore();
  const [checkDate, setCheckDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'all'>('all');

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate, getWeekDates]);
  const checkDay = format(checkDate, 'yyyy-MM-dd');
  const isToday = checkDay === format(new Date(), 'yyyy-MM-dd');

  const weeklyManhours = useMemo(() => {
    return calculateWeeklyManhours(employees, assignments, weekDates);
  }, [employees, assignments, weekDates]);

  const filteredEmployees = useMemo(() => {
    return departmentFilter === 'all'
      ? employees
      : employees.filter(e => e.department === departmentFilter);
  }, [employees, departmentFilter]);

  const dailyManhours = useMemo(() => {
    // Calculate for filtered employees only
    const uniqueToday = getUniqueAssignments(checkDay);
    return uniqueToday.reduce((total, a) => {
      const emp = filteredEmployees.find(e => String(e.id) === String(a.employeeId));
      if (emp && isOnDuty(a.shiftCode)) {
        const shift = SHIFT_CODES.find(s => s.code === a.shiftCode);
        return total + ((shift?.hours || 0) * (emp.grade / 100));
      }
      return total;
    }, 0);
  }, [filteredEmployees, assignments, checkDay]);

  const staffingAlerts = useMemo(() => {
    const uniqueToday = getUniqueAssignments(checkDay);
    const onDuty = uniqueToday.filter(a => {
      const emp = filteredEmployees.find(e => String(e.id) === String(a.employeeId));
      return emp && isOnDuty(a.shiftCode);
    });

    const srEngCount = onDuty.filter(a => {
      const emp = filteredEmployees.find(e => String(e.id) === String(a.employeeId));
      return emp?.role === 'SrEng';
    }).length;

    const psCount = onDuty.filter(a => {
      const emp = filteredEmployees.find(e => String(e.id) === String(a.employeeId));
      return emp?.role === 'PS';
    }).length;

    const alerts = [];
    if (srEngCount < 6) alerts.push({ type: 'SrEng', current: srEngCount, min: 6 });
    if (psCount < 2) alerts.push({ type: 'PS', current: psCount, min: 2 });

    return alerts;
  }, [filteredEmployees, assignments, checkDay]);

  const MIN_MANHOURS = 216;
  const targetProgress = Math.min((dailyManhours / MIN_MANHOURS) * 100, 100);

  const getUniqueAssignments = (targetDate: string) => {
    const uniqueMap = new Map();
    assignments.forEach(a => {
      if (a.date === targetDate) {
        // Normalize ID to string to ensure uniqueness
        uniqueMap.set(String(a.employeeId), a);
      }
    });
    return Array.from(uniqueMap.values());
  };

  const dailyData = useMemo(() => {
    return weekDates.map(date => {
      const unique = getUniqueAssignments(date);
      // Filter unique assignments to only include filtered employees
      const filteredUnique = unique.filter(a => filteredEmployees.some(e => String(e.id) === String(a.employeeId)));

      const hours = filteredUnique.reduce((total, a) => {
        const emp = filteredEmployees.find(e => String(e.id) === String(a.employeeId));
        if (emp && isOnDuty(a.shiftCode)) {
          const shift = SHIFT_CODES.find(s => s.code === a.shiftCode);
          return total + ((shift?.hours || 0) * (emp.grade / 100));
        }
        return total;
      }, 0);

      return {
        day: format(new Date(date), 'EEE'),
        hours,
        onDuty: filteredUnique.filter(a => isOnDuty(a.shiftCode)).length,
      };
    });
  }, [filteredEmployees, assignments, weekDates]);

  const departmentBreakdown = useMemo(() => {
    const depts = ['S/TMBA', 'S/TMBAA', 'S/TMBAB', 'S/TMBAC'];
    const uniqueToday = getUniqueAssignments(checkDay);
    return depts.map(dept => ({
      name: dept.replace('S/', ''),
      count: employees.filter(e => e.department === dept).length,
      onDuty: uniqueToday.filter(a => {
        const emp = employees.find(e => String(e.id) === String(a.employeeId));
        return emp?.department === dept && isOnDuty(a.shiftCode);
      }).length,
    }));
  }, [employees, assignments, checkDay]); // Keep global for breakdown

  const gradeDistribution = useMemo(() => {
    const ranges = [
      { name: '100%', min: 100, max: 100 },
      { name: '50-99%', min: 50, max: 99 },
      { name: '1-49%', min: 1, max: 49 },
      { name: '0%', min: 0, max: 0 },
    ];
    return ranges.map(range => ({
      name: range.name,
      value: filteredEmployees.filter(e => e.grade >= range.min && e.grade <= range.max).length,
    })).filter(r => r.value > 0);
  }, [filteredEmployees]);

  const topAircraftSkills = useMemo(() => {
    return AIRCRAFT_TYPES.slice(0, 6).map(type => {
      const counts = countLicensesByType(filteredEmployees, assignments, checkDay, type);
      return {
        name: type,
        b1: counts.b1,
        b2: counts.b2,
        b12: counts.b12,
        total: counts.b1 + counts.b2 + counts.b12,
      };
    }).filter(a => a.total > 0);
  }, [filteredEmployees, assignments, checkDay]);

  const uniqueTodayAssignments = useMemo(() => getUniqueAssignments(checkDay), [assignments, checkDay]);
  const totalOnDuty = uniqueTodayAssignments.filter(a => {
    const isActive = filteredEmployees.some(e => String(e.id) === String(a.employeeId));
    return isOnDuty(a.shiftCode) && isActive;
  }).length;
  const totalOff = filteredEmployees.length - totalOnDuty;

  // Daily Target: Count employees on Ea/La shifts (excluding PM/PS/SE roles)
  // Week duty alternates: odd ISO week = Ea, even ISO week = La
  // Ea shifts: 'Ea', 'e' (early shifts for regular employees)
  // La shifts: 'La' (late shifts for regular employees)
  // Excluded: 'eA', 'LA', 'Ae', 'AL' (PS/SE position shifts), midshifts, PM shifts
  const dailyTargetData = useMemo(() => {
    const weekNum = getISOWeek(checkDate);
    const isEaWeek = weekNum % 2 === 0; // Even weeks = Ea duty (week 2, 4, 6...), Odd weeks = La duty (week 3, 5, 7...)

    // Count employees with Ea or La shifts who are NOT in PM/PS/SE roles
    const count = uniqueTodayAssignments.filter(a => {
      const emp = filteredEmployees.find(e => e.id === a.employeeId);
      if (!emp) return false;

      // Exclude PM, PS, SE roles
      const role = emp.role?.toUpperCase() || '';
      if (role === 'PM' || role === 'PS' || role === 'SE') return false;

      // Check if shift matches the week's duty
      const code = a.shiftCode;
      if (isEaWeek) {
        // Early week: count 'Ea' and 'e' shifts (not 'eA' which is PS)
        return code === 'Ea' || code === 'e';
      } else {
        // Late week: count 'La' shifts (not 'LA' which is PS)
        return code === 'La';
      }
    }).length;

    // Color rules: ≤29 red, 30-34 orange, ≥35 green
    let color: 'red' | 'orange' | 'green';
    let colorClass: string;
    if (count <= 29) {
      color = 'red';
      colorClass = 'text-destructive';
    } else if (count <= 34) {
      color = 'orange';
      colorClass = 'text-warning';
    } else {
      color = 'green';
      colorClass = 'text-success';
    }

    const targetShift = isEaWeek ? 'Ea' : 'La';
    return { count, color, colorClass, targetShift, isEaWeek };
  }, [checkDate, filteredEmployees, uniqueTodayAssignments]);

  const scheduleIssues = useMemo(() => {
    return auditSchedule(employees, assignments);
  }, [employees, assignments]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">
            Dashboard <span className="text-xs font-normal text-muted-foreground ml-2 align-middle border border-border px-1.5 py-0.5 rounded-md">v4.0</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Weekly overview for {format(new Date(weekDates[0]), 'MMM d')} - {format(new Date(weekDates[6]), 'MMM d, yyyy')}
          </p>
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 font-semibold text-sm h-10 px-4 border-2 hover:border-primary hover:bg-primary/5 transition-all"
              data-testid="button-check-day-picker"
            >
              <CalendarIcon className="w-4 h-4 text-primary" />
              <span className={cn("font-bold", isToday ? "text-primary" : "text-foreground")}>
                {isToday ? 'Today' : format(checkDate, 'EEE, MMM d')}
              </span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", calendarOpen && "rotate-180")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 border-b bg-muted/30">
              <h4 className="font-semibold text-sm">Check Day</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Select a date to view daily statistics</p>
            </div>
            <Calendar
              mode="single"
              selected={checkDate}
              onSelect={(date) => {
                if (date) {
                  setCheckDate(date);
                  setCalendarOpen(false);
                }
              }}
              weekStartsOn={1}
              initialFocus
            />
            {!isToday && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-primary hover:bg-primary/10"
                  onClick={() => {
                    setCheckDate(new Date());
                    setCalendarOpen(false);
                  }}
                  data-testid="button-reset-to-today"
                >
                  ← Back to Today
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as Department | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="S/TMBA">S/TMBA</SelectItem>
            <SelectItem value="S/TMBAA">S/TMBAA</SelectItem>
            <SelectItem value="S/TMBAB">S/TMBAB</SelectItem>
            <SelectItem value="S/TMBAC">S/TMBAC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{isToday ? "Today's" : format(checkDate, 'MMM d')} Manhours</p>
              <p className="text-3xl font-display font-bold mt-1">{dailyManhours.toFixed(0)}</p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              dailyManhours >= MIN_MANHOURS ? "bg-success/10" : "bg-warning/10"
            )}>
              <Clock className={cn("w-5 h-5", dailyManhours >= MIN_MANHOURS ? "text-success" : "text-warning")} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Target: {MIN_MANHOURS}h/day</span>
              <span className={cn("font-semibold", dailyManhours >= MIN_MANHOURS ? "text-success" : "text-warning")}>
                {targetProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={targetProgress} className="h-2" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">On Duty {isToday ? 'Today' : format(checkDate, 'MMM d')}</p>
              <p className="text-3xl font-display font-bold mt-1">{totalOnDuty}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{totalOff} off duty</span>
            <span>•</span>
            <span>{employees.length} total</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Daily Target ({dailyTargetData.targetShift} duty)
              </p>
              <p className="text-3xl font-display font-bold mt-1 flex items-center gap-2">
                {dailyTargetData.color === 'green' ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : dailyTargetData.color === 'orange' ? (
                  <AlertTriangle className="w-6 h-6 text-warning" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                )}
                <span className={dailyTargetData.colorClass}>{dailyTargetData.count}</span>
              </p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              dailyTargetData.color === 'green' ? "bg-success/10" :
                dailyTargetData.color === 'orange' ? "bg-warning/10" : "bg-destructive/10"
            )}>
              <Target className={cn(
                "w-5 h-5",
                dailyTargetData.color === 'green' ? "text-success" :
                  dailyTargetData.color === 'orange' ? "text-warning" : "text-destructive"
              )} />
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {dailyTargetData.count >= 35
              ? 'Target met (≥35)'
              : dailyTargetData.count >= 30
                ? `Need ${ 35 - dailyTargetData.count } more for green`
                : `Need ${ 30 - dailyTargetData.count } more for orange`
            }
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Staffing Alerts</p>
              <div className="mt-1 space-y-1">
                {staffingAlerts.length === 0 ? (
                  <p className="text-sm font-medium text-success flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> All positions covered
                  </p>
                ) : (
                  staffingAlerts.map((alert, idx) => (
                    <p key={idx} className="text-sm font-medium text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {alert.type}: {alert.current}/{alert.min}
                    </p>
                  ))
                )}
              </div>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              staffingAlerts.length === 0 ? "bg-success/10" : "bg-destructive/10"
            )}>
              {staffingAlerts.length === 0 ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Min: 6 SrEng, 2 PS
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Weekly Total</p>
              <p className="text-3xl font-display font-bold mt-1">
                {weeklyManhours.toFixed(0)}h
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
              {weeklyManhours / 7 >= MIN_MANHOURS ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Weekly target: 1,400h
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Daily Manhours</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Staff on Duty by Day</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="onDuty"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Department Breakdown</h3>
          <div className="space-y-4">
            {departmentBreakdown.map((dept, idx) => (
              <div key={dept.name} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{dept.name}</span>
                    <span className="text-sm text-muted-foreground">{dept.count} staff</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                    <span>{dept.onDuty} on duty today</span>
                    <span>{((dept.onDuty / dept.count) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Grade Distribution</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {gradeDistribution.map((_, index) => (
                    <Cell key={`cell - ${ index }`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {gradeDistribution.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Aircraft Skills ({isToday ? 'Today' : format(checkDate, 'MMM d')})</h3>
          <div className="space-y-3">
            {topAircraftSkills.map(aircraft => (
              <div key={aircraft.name} className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium w-20 truncate">{aircraft.name}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-mono">
                      B1: {aircraft.b1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-mono">
                      B2: {aircraft.b2}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-mono">
                      B1/2: {aircraft.b12}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
