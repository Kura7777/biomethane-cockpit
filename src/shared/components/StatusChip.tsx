import React from 'react';

type ChipVariant = 'PASS' | 'ELIGIBLE' | 'CONDITIONAL' | 'HARD_BLOCK' | 'UNRESOLVED' | 'UNKNOWN';

const CHIP_STYLES: Record<ChipVariant, string> = {
  PASS: 'bg-green-50 text-green-700 border-green-200',
  ELIGIBLE: 'bg-green-50 text-green-700 border-green-200',
  CONDITIONAL: 'bg-amber-50 text-amber-700 border-amber-200',
  HARD_BLOCK: 'bg-red-50 text-red-700 border-red-200',
  UNRESOLVED: 'bg-blue-50 text-blue-700 border-blue-200',
  UNKNOWN: 'bg-stone-100 text-stone-500 border-stone-200',
};

const CHIP_LABELS: Record<ChipVariant, string> = {
  PASS: 'Pass',
  ELIGIBLE: 'Eligible',
  CONDITIONAL: 'Conditional',
  HARD_BLOCK: 'Blocked',
  UNRESOLVED: 'Unresolved',
  UNKNOWN: 'Unknown',
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
  label?: string;  // Override default label
  size?: 'sm' | 'md';
}

export function StatusChip({ variant, label, size = 'md' }: StatusChipProps) {
  const styles = CHIP_STYLES[variant] || CHIP_STYLES.UNKNOWN;
  const displayLabel = label || CHIP_LABELS[variant] || variant;
  const icon = CHIP_ICONS[variant] || '?';
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${styles} ${sizeClasses}`}>
      <span className="text-[0.7em]">{icon}</span>
      {displayLabel}
    </span>
  );
}
