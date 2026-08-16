import React from 'react';

export type ChipVariant = 'PASS' | 'ELIGIBLE' | 'CONDITIONAL' | 'HARD_BLOCK' | 'UNRESOLVED' | 'UNKNOWN';

const CHIP_STYLES: Record<ChipVariant, string> = {
  PASS: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
  ELIGIBLE: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
  CONDITIONAL: 'bg-amber-950/80 text-amber-300 border-amber-700/80',
  HARD_BLOCK: 'bg-red-950/80 text-red-300 border-red-700/80',
  UNRESOLVED: 'bg-sky-950/80 text-sky-300 border-sky-700/80',
  UNKNOWN: 'bg-stone-800/90 text-stone-400 border-stone-700/80',
};

const CHIP_LABELS: Record<ChipVariant, string> = {
  PASS: 'PASS',
  ELIGIBLE: 'ELIGIBLE',
  CONDITIONAL: 'CONDITIONAL',
  HARD_BLOCK: 'BLOCKED',
  UNRESOLVED: 'UNRESOLVED',
  UNKNOWN: 'UNKNOWN',
};

const CHIP_ICONS: Record<ChipVariant, string> = {
  PASS: '✓',
  ELIGIBLE: '✓',
  CONDITIONAL: '⚠',
  HARD_BLOCK: '✕',
  UNRESOLVED: '◈',
  UNKNOWN: '?',
};

interface StatusChipProps {
  variant: ChipVariant;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function StatusChip({ variant, label, size = 'sm' }: StatusChipProps) {
  const styles = CHIP_STYLES[variant] || CHIP_STYLES.UNKNOWN;
  const displayLabel = label || CHIP_LABELS[variant] || variant;
  const icon = CHIP_ICONS[variant] || '?';

  const sizeClasses = 
    size === 'xs' ? 'text-[9px] px-1.5 py-0.2 tracking-wider font-mono' :
    size === 'sm' ? 'text-[10px] px-2 py-0.5 tracking-wider font-mono' :
    'text-xs px-2.5 py-1 tracking-wider font-mono';

  return (
    <span className={`inline-flex items-center gap-1 font-bold border rounded ${styles} ${sizeClasses}`}>
      <span className="text-[0.8em]">{icon}</span>
      <span>{displayLabel}</span>
    </span>
  );
}
