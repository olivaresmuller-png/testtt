import { memo } from 'react';
import { ShiftCode, SHIFT_CODES } from '@/lib/data';
import { ShiftBadge } from './ShiftBadge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Clock, Coffee, Plane, GraduationCap, Heart, Shield } from 'lucide-react';

interface ShiftCodeSelectProps {
  value: ShiftCode;
  onValueChange: (value: ShiftCode) => void;
  compact?: boolean;
  'data-testid'?: string;
}

const DUTY_SHIFTS = ['Ea', 'La', 'M', 'Ae', 'AL', 'e', 'eA', 'l', 'LA', 'TD', 'HO', 't4'];
const TRAINING_SHIFTS = ['FT', 'BT', 'ET', 'FD', 'SI', 'SE', 'Sn', 'TR'];
const LEAVE_SHIFTS = ['V', 'PW', 'PC', 'PB', 'PD', 'PG', 'PI', 'PH', 'PM', 'PL', 'UL', 'KO', 'KB', 'FL'];
const SICK_SHIFTS = ['S', 'IC', 'IW', 'AC', 'AW'];
const MILITARY_SHIFTS = ['MC', 'MW'];
const OFF_SHIFTS = ['-', 'OFF', 'T', '?'];

const SHIFT_DESCRIPTIONS: Record<string, string> = {
  'Ea': '06:15–15:09 • TMB Earlyshift',
  'La': '14:00–22:54 • TMB Lateshift',
  'M': '08:00–17:20 • TMB Mid-shift',
  'Ae': '05:45–14:39 • TMB PL STV Early',
  'AL': '13:30–22:24 • TMB PL STV Late',
  'e': 'TMB Earlyshift PM',
  'eA': '05:45–14:39 • TMB PL Early',
  'l': 'TMB Lateshift PM',
  'LA': '13:30–22:24 • TMB PL Late',
  'TD': 'Part Time Day shift',
  't4': 'Classroom Training 4H',
  'FT': 'Feiertag / Public CH',
  'BT': 'Business Trip',
  'SI': 'School internal',
  'SE': 'School external',
  'Sn': 'School night',
  'V': 'Vacation',
  'PW': 'Wedding (own) - 3 Days',
  'PB': 'Birth - 2 Days',
  'PD': 'Death (Spouse/Child/Parents) - 3 Days',
  'UL': 'Unpaid Leave',
  'KO': 'Kompensation ex Overtime',
  'KB': 'Kompensation ex Timebonus',
  'S': 'Sick with Certificate',
  'IC': 'Sick with Certificate',
  'IW': 'Sick without Certificate',
  'IB': 'Baby Leave with Certificate',
  'IM': 'Baby Leave',
  'IN': 'Nurse of close relatives',
  'AC': 'Accident with Certificate',
  'AW': 'Accident without Certificate',
  'MC': 'Military with EO',
  'MW': 'Military without EO',
  'FL': 'Kompensation ex Flextime',
  'HO': 'Home Office',
  'ET': 'Educational Trip',
  'FD': 'Flight Duty',
  'OF': 'Office Duty',
  'PR': 'Projects',
  'PC': 'Wedding (Child) - 1 Day',
  'PG': 'Death (In-Law/Grandp.) - 2 Days',
  'PI': 'Death (In-Law/Sibling) - 1 Day',
  'PH': 'Moving HB >100km - 2 Days',
  'PM': 'Moving - 1 Day',
  'PL': 'Paid Leave',
  'PK': 'Baby Leave (Mutterschaftsurl)',
  'ST': 'Study Time',
  'TO': 'Time out',
  'TR': '08:00–17:00 • Training',
  '-': 'Off day',
  'OFF': 'Scheduled off duty',
  'T': 'Training day',
  '?': 'Unassigned / TBD',
};

export const ShiftCodeSelect = memo(function ShiftCodeSelect({ value, onValueChange, compact, 'data-testid': testId }: ShiftCodeSelectProps) {
  const currentShift = SHIFT_CODES.find(s => s.code === value);
  
  const getShiftsByCategory = (codes: string[]) => 
    SHIFT_CODES.filter(s => codes.includes(s.code));

  return (
    <Select value={value} onValueChange={(val) => onValueChange(val as ShiftCode)}>
      <SelectTrigger 
        className={cn(
          "gap-2 border-2 hover:border-primary/50 transition-colors",
          compact ? "w-auto h-8 px-2" : "w-auto"
        )} 
        data-testid={testId}
      >
        <ShiftBadge code={value} size={compact ? "sm" : "sm"} />
        {!compact && currentShift && currentShift.hours > 0 && (
          <span className="text-xs text-muted-foreground font-medium">{currentShift.hours}h</span>
        )}
      </SelectTrigger>
      <SelectContent className="w-[340px] max-h-[450px]">
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-primary font-semibold py-2">
            <Clock className="w-4 h-4" />
            Work Shifts
          </SelectLabel>
          {getShiftsByCategory(DUTY_SHIFTS).map(shift => (
            <SelectItem 
              key={shift.code} 
              value={shift.code}
              className="py-2.5 cursor-pointer hover:bg-primary/5"
            >
              <div className="flex items-start gap-3 w-full">
                <ShiftBadge code={shift.code} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{shift.label}</span>
                    <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded ml-2">
                      {shift.hours}h
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {SHIFT_DESCRIPTIONS[shift.code]}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
        
        <div className="h-px bg-border my-2" />
        
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-blue-600 font-semibold py-2">
            <GraduationCap className="w-4 h-4" />
            Training & Business
          </SelectLabel>
          {getShiftsByCategory(TRAINING_SHIFTS).map(shift => (
            <SelectItem 
              key={shift.code} 
              value={shift.code}
              className="py-2.5 cursor-pointer hover:bg-blue-50"
            >
              <div className="flex items-start gap-3 w-full">
                <ShiftBadge code={shift.code} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{shift.label}</span>
                    {shift.hours > 0 && (
                      <span className="text-xs text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded ml-2">
                        {shift.hours}h
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {SHIFT_DESCRIPTIONS[shift.code]}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
        
        <div className="h-px bg-border my-2" />
        
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-amber-600 font-semibold py-2">
            <Plane className="w-4 h-4" />
            Leave & Time Off
          </SelectLabel>
          {getShiftsByCategory(LEAVE_SHIFTS).map(shift => (
            <SelectItem 
              key={shift.code} 
              value={shift.code}
              className="py-2.5 cursor-pointer hover:bg-amber-50"
            >
              <div className="flex items-start gap-3 w-full">
                <ShiftBadge code={shift.code} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{shift.label}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {SHIFT_DESCRIPTIONS[shift.code]}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
        
        <div className="h-px bg-border my-2" />
        
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-rose-600 font-semibold py-2">
            <Heart className="w-4 h-4" />
            Sick Leave
          </SelectLabel>
          {getShiftsByCategory(SICK_SHIFTS).map(shift => (
            <SelectItem 
              key={shift.code} 
              value={shift.code}
              className="py-2.5 cursor-pointer hover:bg-rose-50"
            >
              <div className="flex items-start gap-3 w-full">
                <ShiftBadge code={shift.code} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{shift.label}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {SHIFT_DESCRIPTIONS[shift.code]}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
        
        <div className="h-px bg-border my-2" />
        
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-indigo-600 font-semibold py-2">
            <Shield className="w-4 h-4" />
            Military Service
          </SelectLabel>
          {getShiftsByCategory(MILITARY_SHIFTS).map(shift => (
            <SelectItem 
              key={shift.code} 
              value={shift.code}
              className="py-2.5 cursor-pointer hover:bg-indigo-50"
            >
              <div className="flex items-start gap-3 w-full">
                <ShiftBadge code={shift.code} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{shift.label}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {SHIFT_DESCRIPTIONS[shift.code]}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
        
        <div className="h-px bg-border my-2" />
        
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-slate-500 font-semibold py-2">
            <Coffee className="w-4 h-4" />
            Off Duty
          </SelectLabel>
          {getShiftsByCategory(OFF_SHIFTS).map(shift => (
            <SelectItem 
              key={shift.code} 
              value={shift.code}
              className="py-2.5 cursor-pointer hover:bg-slate-50"
            >
              <div className="flex items-start gap-3 w-full">
                <ShiftBadge code={shift.code} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{shift.label}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {SHIFT_DESCRIPTIONS[shift.code]}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
});
