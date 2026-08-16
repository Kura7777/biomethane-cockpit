import React from 'react';
import { Check, AlertTriangle, X, CircleDot, HelpCircle, LucideIcon } from 'lucide-react';

export type ChipVariant = 'PASS' | 'ELIGIBLE' | 'CONDITIONAL' | 'HARD_BLOCK' | 'UNRESOLVED' | 'UNKNOWN';

/**
 * Semantic colour mapping — see design-system/MASTER.md §1.3.
 * emerald = favourable outcome, amber = conditional, red = blocking,
 * sky = unresolved, stone = unknown. Teal is reserved for interactive
 * elements and deliberately absent here: a chip is not clickable.
 */
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

/**
 * Lucide icons, not unicode glyphs (MASTER §4). The previous ✓ / ⚠ / ✕ / ◈
 * rendered at platform-dependent weights and sizes and could not be aligned
 * reliably against the label baseline.
 */
const CHIP_ICONS: Record<ChipVariant, LucideIcon> = {
  PASS: Check,
  ELIGIBLE: Check,
  CONDITIONAL: AlertTriangle,
  HARD_BLOCK: X,
  UNRESOLVED: CircleDot,
  UNKNOWN: HelpCircle,
};

interface StatusChipProps {
  variant: ChipVariant;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function StatusChip({ variant, label, size = 'sm' }: StatusChipProps) {
  const styles = CHIP_STYLES[variant] || CHIP_STYLES.UNKNOWN;
  const displayLabel = label || CHIP_LABELS[variant] || variant;
  const Icon = CHIP_ICONS[variant] || HelpCircle;

  // Sub-0.5 padding compiled to no CSS at all, leaving these chips with zero
  // vertical padding. Spacing now comes off the 4px scale (MASTER §3.1).
  const sizeClasses =
    size === 'xs' ? 'text-micro px-1.5 py-0.5 gap-1 tracking-wider font-mono' :
    size === 'sm' ? 'text-micro px-2 py-0.5 gap-1 tracking-wider font-mono' :
    'text-xs px-2.5 py-1 gap-1.5 tracking-wider font-mono';

  const iconSize = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span className={`inline-flex items-center font-bold border rounded leading-none ${styles} ${sizeClasses}`}>
      {/* Decorative: the adjacent text already carries the meaning. */}
      <Icon className={`${iconSize} shrink-0`} aria-hidden="true" strokeWidth={2.5} />
      <span>{displayLabel}</span>
    </span>
  );
}
