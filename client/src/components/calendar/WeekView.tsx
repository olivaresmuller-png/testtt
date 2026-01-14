import { memo } from 'react';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ShiftCodeSelect } from '@/components/ShiftCodeSelect';
import { ShiftCode } from '@/lib/data';
import { Employee } from '@/lib/data';

interface WeekViewProps {
  employees: Employee[];
  weekDates: string[];
  getAssignment: (date: string, employeeId: string) => ShiftCode | undefined;
  onShiftChange: (date: string, employeeId: string, shiftCode: ShiftCode) => void;
  onDayClick?: (date: string) => void;
}

export const WeekView = memo(function WeekView({ 
  employees, 
  weekDates, 
  getAssignment, 
  onShiftChange,
  onDayClick
}: WeekViewProps) {
  return (
    <div className="min-w-[800px]">
      <div className="flex border-b border-border bg-muted/20 sticky top-0 z-20">
        <div className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[200px] w-[200px] flex-shrink-0">
          Employee
        </div>
        {weekDates.map(date => (
          <div key={date} 
            onClick={() => onDayClick?.(date)}
            className={cn(
            "p-3 text-center min-w-[80px] flex-1 cursor-pointer hover:bg-muted/50 transition-colors",
            isToday(new Date(date)) && "bg-primary/5"
          )}>
            <div className="font-medium">{format(new Date(date), 'EEE')}</div>
            <div className={cn(
              "text-sm",
              isToday(new Date(date)) ? "text-primary font-semibold" : "text-muted-foreground"
            )}>
              {format(new Date(date), 'd')}
            </div>
          </div>
        ))}
      </div>
      
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {employees.map((employee) => (
          <div
            key={employee.id}
            className={cn(
              "flex border-b border-border/50",
              employee.role === 'PM' && "bg-amber-50 dark:bg-amber-950/30",
              employee.role === 'PS' && "bg-emerald-50 dark:bg-emerald-950/30",
              employee.role === 'SrEng' && "bg-lime-50 dark:bg-lime-950/20"
            )}
          >
            <div className={cn(
              "p-3 sticky left-0 z-10 border-r border-border/50 min-w-[200px] w-[200px] flex-shrink-0 flex items-center",
              employee.role === 'PM' ? "bg-amber-50 dark:bg-amber-950/30" :
              employee.role === 'PS' ? "bg-emerald-50 dark:bg-emerald-950/30" :
              employee.role === 'SrEng' ? "bg-lime-50 dark:bg-lime-950/20" : "bg-card"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-mono font-bold text-primary">
                  {employee.initials}
                </div>
                <div>
                  <p className="font-medium text-sm">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">{employee.department.replace('S/', '')}</p>
                </div>
              </div>
            </div>
            {weekDates.map(date => {
              const currentShift = getAssignment(date, employee.id) || '-';
              return (
                <div key={date} className={cn(
                  "p-2 flex-1 flex items-center justify-center min-w-[80px]",
                  isToday(new Date(date)) && "bg-primary/5"
                )}>
                  <span className="print-only font-mono text-xs font-medium">{currentShift}</span>
                  <span className="screen-only">
                    <ShiftCodeSelect
                      value={currentShift}
                      onValueChange={(value) => onShiftChange(date, employee.id, value)}
                      compact
                      data-testid={`select-shift-${employee.id}-${date}`}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});
