import React from 'react';
import { Check, AlertTriangle, X, CircleDot, HelpCircle, LucideIcon } from 'lucide-react';

export type ChipVariant =
  | 'PASS'
  | 'ELIGIBLE'
  | 'CONDITIONAL'
  | 'HARD_BLOCK'
  | 'UNRESOLVED'
  | 'UNKNOWN'
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'WARNING'
  | 'LOGISTICS'
  | 'NEUTRAL';

const CHIP_STYLES: Record<ChipVariant, string> = {
  PASS: 'chip-pos',
  ELIGIBLE: 'chip-pos',
  POSITIVE: 'chip-pos',
  CONDITIONAL: 'chip-warn',
  WARNING: 'chip-warn',
  UNRESOLVED: 'chip-warn',
  HARD_BLOCK: 'chip-neg',
  NEGATIVE: 'chip-neg',
  LOGISTICS: 'chip-info',
  UNKNOWN: 'chip-neutral',
  NEUTRAL: 'chip-neutral',
};

const CHIP_LABELS: Partial<Record<ChipVariant, string>> = {
  PASS: 'PASS',
  ELIGIBLE: 'ELIGIBLE',
  POSITIVE: 'IN THE MONEY',
  CONDITIONAL: 'CONDITIONAL',
  WARNING: 'WARNING',
  HARD_BLOCK: 'BLOCKED',
  NEGATIVE: 'NEGATIVE',
  UNRESOLVED: 'UNRESOLVED',
  LOGISTICS: 'LOGISTICS',
  UNKNOWN: 'UNKNOWN',
  NEUTRAL: 'NEUTRAL',
};

const CHIP_ICONS: Partial<Record<ChipVariant, LucideIcon>> = {
  PASS: Check,
  ELIGIBLE: Check,
  POSITIVE: Check,
  CONDITIONAL: AlertTriangle,
  WARNING: AlertTriangle,
  HARD_BLOCK: X,
  NEGATIVE: X,
  UNRESOLVED: CircleDot,
  UNKNOWN: HelpCircle,
};

interface StatusChipProps {
  variant: ChipVariant;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function StatusChip({ variant, label, size = 'sm' }: StatusChipProps) {
  const chipClass = CHIP_STYLES[variant] || 'chip-neutral';
  const displayLabel = label || CHIP_LABELS[variant] || variant;
  const Icon = CHIP_ICONS[variant];

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5 gap-1 tracking-wider'
      : size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1 tracking-wider'
      : 'text-[12px] px-2.5 py-1 gap-1.5 tracking-wider';

  const iconSize = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span className={`inline-flex items-center font-bold border leading-none num uppercase ${chipClass} ${sizeClasses}`}>
      {Icon && <Icon className={`${iconSize} shrink-0`} aria-hidden="true" strokeWidth={2.5} />}
      <span>{displayLabel}</span>
    </span>
  );
}
