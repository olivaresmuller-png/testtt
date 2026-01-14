import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plane, Filter, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { LicenseBadge } from '@/components/LicenseBadge';
import { useAppStore } from '@/lib/StoreContext';
import { AIRCRAFT_TYPES, countLicensesByType, isOnDuty } from '@/lib/data';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export function SkillsPage() {
  const { employees, assignments } = useAppStore();
  const [viewMode, setViewMode] = useState<'date' | 'all'>('date');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const onDutyEmployees = useMemo(() => {
    if (viewMode === 'all') return employees;
    return assignments
      .filter(a => a.date === dateStr && isOnDuty(a.shiftCode))
      .map(a => employees.find(e => e.id === a.employeeId))
      .filter((e): e is NonNullable<typeof e> => e !== undefined);
  }, [employees, assignments, dateStr, viewMode]);

  const aircraftSummary = useMemo(() => {
    return AIRCRAFT_TYPES.map(type => {
      const counts = countLicensesByType(employees, assignments, dateStr, type);
      return { type, ...counts };
    }).filter(s => s.b1 > 0 || s.b2 > 0 || s.b12 > 0);
  }, [employees, assignments, dateStr]);

  const displayedTypes = ['B777', 'A343', 'A220', 'A330 RR', 'A350', 'A320 NEO', 'A320 CF'];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">Skills Matrix</h1>
          <p className="text-muted-foreground mt-1">
            Aircraft type qualifications and license overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-date-picker">
                <CalendarDays className="w-4 h-4" />
                {format(selectedDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                weekStartsOn={1}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'date' | 'all')}>
            <SelectTrigger className="w-[160px]" data-testid="select-view-mode">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">On Duty (Date)</SelectItem>
              <SelectItem value="all">All Employees</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {aircraftSummary.map(({ type, b1, b2, b12 }) => (
          <Card key={type} className="p-4" data-testid={`card-aircraft-${type.replace(/\s/g, '-')}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">{type}</h3>
                <p className="text-xs text-muted-foreground">
                  {viewMode === 'date' ? format(selectedDate, 'MMM d, yyyy') : 'All staff'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="text-2xl font-display font-bold text-blue-600 dark:text-blue-400">{b1}</div>
                <div className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70">B1</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <div className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{b2}</div>
                <div className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">B2</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30">
                <div className="text-2xl font-display font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{b12}</div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">B1/2</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="font-display font-semibold text-lg">Employee Skills Detail</h2>
          <p className="text-sm text-muted-foreground">
            {onDutyEmployees.length} employees {viewMode === 'date' ? `on duty ${format(selectedDate, 'MMM d')}` : 'total'}
          </p>
        </div>

        <ScrollArea className="w-full">
          <div className="min-w-[900px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[180px]">
                    Employee
                  </th>
                  {displayedTypes.map(type => (
                    <th key={type} className="p-3 text-center min-w-[80px]">
                      <div className="text-xs font-medium">{type}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {onDutyEmployees.map((employee, idx) => (
                  <tr 
                    key={employee.id} 
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/30 transition-colors",
                      idx % 2 === 0 && "bg-muted/10"
                    )}
                  >
                    <td className="p-3 sticky left-0 bg-card z-10 border-r border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">{employee.initials}</span>
                        <span className="text-sm">{employee.name.split(',')[0]}</span>
                      </div>
                    </td>
                    {displayedTypes.map(type => {
                      const skill = employee.skills.find(s => s.aircraftType === type);
                      return (
                        <td key={type} className="p-3 text-center">
                          {skill ? (
                            <LicenseBadge license={skill.license} />
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {onDutyEmployees.length === 0 && (
          <div className="p-12 text-center">
            <Plane className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">No employees on duty</h3>
            <p className="text-muted-foreground">Select a different date using the date picker, or view all employees</p>
          </div>
        )}
      </Card>
    </div>
  );
}
