import { memo } from 'react';
import { cn } from '@/lib/utils';
import { ShiftCode, SHIFT_CODES } from '@/lib/data';

interface ShiftBadgeProps {
  code: ShiftCode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ShiftBadge = memo(function ShiftBadge({ code, size = 'md', showLabel = false }: ShiftBadgeProps) {
  const shift = SHIFT_CODES.find(s => s.code === code);
  
  const getShiftClass = () => {
    if (code === 'Ea' || code === 'e') return 'shift-early';
    if (code === 'La' || code === 'AL') return 'shift-late';
    if (code === 'Ae' || code === 'eA') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (code === 'V') return 'shift-vacation';
    if (code === 'T' || code === 'TD') return 'shift-training';
    if (code === 'S') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'shift-off';
  };

  const sizeClasses = {
    xs: 'text-[8px] px-1 py-0 min-w-[20px]',
    sm: 'text-[10px] px-1.5 py-0.5 min-w-[28px]',
    md: 'text-xs px-2 py-1 min-w-[36px]',
    lg: 'text-sm px-3 py-1.5 min-w-[48px]',
  };

  return (
    <span
      data-testid={`badge-shift-${code}`}
      className={cn(
        'inline-flex items-center justify-center font-mono font-semibold rounded-md transition-colors',
        getShiftClass(),
        sizeClasses[size]
      )}
    >
      {code}
      {showLabel && shift && <span className="ml-1.5 font-sans font-normal opacity-75">{shift.label}</span>}
    </span>
  );
});
