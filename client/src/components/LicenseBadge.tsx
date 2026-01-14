import { cn } from '@/lib/utils';
import { LicenseType } from '@/lib/data';

interface LicenseBadgeProps {
  license: LicenseType;
  size?: 'sm' | 'md';
}

export function LicenseBadge({ license, size = 'md' }: LicenseBadgeProps) {
  if (!license) return null;

  const getLicenseClass = () => {
    if (license === 'B1') return 'license-b1';
    if (license === 'B2') return 'license-b2';
    if (license === 'B1/2') return 'license-b12';
    if (license === 'C') return 'license-c';
    if (license === 'A') return 'bg-gray-500 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const sizeClasses = {
    sm: 'text-[9px] px-1 py-0.5 min-w-[22px]',
    md: 'text-[10px] px-1.5 py-0.5 min-w-[28px]',
  };

  return (
    <span
      data-testid={`badge-license-${license}`}
      className={cn(
        'inline-flex items-center justify-center font-mono font-bold rounded transition-colors',
        getLicenseClass(),
        sizeClasses[size]
      )}
    >
      {license}
    </span>
  );
}
