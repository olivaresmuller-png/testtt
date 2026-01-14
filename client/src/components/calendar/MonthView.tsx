import { memo, useState } from 'react';
import { format, isToday, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ShiftBadge } from '@/components/ShiftBadge';
import { ShiftCodeSelect } from '@/components/ShiftCodeSelect';
import { ShiftCode } from '@/lib/data';
import { Employee } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MonthViewProps {
  employees: Employee[];
  monthDays: Date[];
  getAssignment: (date: string, employeeId: string) => ShiftCode | undefined;
  onShiftChange: (date: string, employeeId: string, shiftCode: ShiftCode) => void;
}

export const MonthView = memo(function MonthView({ 
  employees, 
  monthDays, 
  getAssignment,
  onShiftChange
}: MonthViewProps) {
  const [activeCell, setActiveCell] = useState<string | null>(null);

  return (
    <div className="min-w-[1200px]">
      <div className="flex border-b border-border bg-muted/20 sticky top-0 z-20">
        <div className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[180px] w-[180px] flex-shrink-0 text-xs">
          Employee
        </div>
        {monthDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isWeekend = [0, 6].includes(getDay(day));
          return (
            <div key={dateStr} className={cn(
              "p-1 text-center min-w-[32px] flex-1 text-xs",
              isWeekend && "bg-muted/50",
              isToday(day) && "bg-primary/10"
            )}>
              <div className="font-medium">{format(day, 'EEE')[0]}</div>
              <div className={cn(
                "text-[10px]",
                isToday(day) ? "text-primary font-bold" : "text-muted-foreground"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {employees.map((employee) => (
          <div
            key={employee.id}
            className={cn(
              "flex border-b border-border/50",
              employee.role === 'PM' && "bg-amber-50/50",
              employee.role === 'PS' && "bg-emerald-50/50",
              employee.role === 'SrEng' && "bg-lime-50/50"
            )}
          >
            <div className={cn(
              "p-2 sticky left-0 z-10 border-r border-border/50 text-xs min-w-[180px] w-[180px] flex-shrink-0 flex items-center",
              employee.role === 'PM' ? "bg-amber-50" :
              employee.role === 'PS' ? "bg-emerald-50" :
              employee.role === 'SrEng' ? "bg-lime-50" : "bg-card"
            )}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary text-[10px]">{employee.initials}</span>
                <span className="font-medium truncate max-w-[120px]">{employee.name.split(',')[0]}</span>
              </div>
            </div>
            {monthDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const currentShift = getAssignment(dateStr, employee.id) || '-';
              const isWeekend = [0, 6].includes(getDay(day));
              const cellKey = `${employee.id}-${dateStr}`;
              
              return (
                <div key={dateStr} className={cn(
                  "p-0.5 flex-1 flex items-center justify-center min-w-[32px]",
                  isWeekend && "bg-muted/30",
                  isToday(day) && "bg-primary/5"
                )}>
                  <span className="print-only font-mono text-[9px] font-medium">{currentShift}</span>
                  <span className="screen-only">
                    <Popover open={activeCell === cellKey} onOpenChange={(open) => setActiveCell(open ? cellKey : null)}>
                      <PopoverTrigger asChild>
                        <button className="cursor-pointer hover:scale-110 transition-transform">
                          <ShiftBadge code={currentShift} size="xs" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="center">
                        <ShiftCodeSelect
                          value={currentShift}
                          onValueChange={(value) => {
                            onShiftChange(dateStr, employee.id, value);
                            setActiveCell(null);
                          }}
                          data-testid={`select-shift-month-${employee.id}-${dateStr}`}
                        />
                      </PopoverContent>
                    </Popover>
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
