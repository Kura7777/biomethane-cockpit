import React from 'react';
import type { SourceBadge } from '../../domain/markets/types';

/** The shared chip class for a source badge variant (same classes the Pricing desk uses). */
export function chipClassForBadge(variant: SourceBadge['variant']): string {
  return variant === 'POSITIVE'
    ? 'chip chip-pos'
    : variant === 'WARNING'
      ? 'chip chip-warn'
      : variant === 'INFO'
        ? 'chip chip-info'
        : 'chip chip-neutral';
}

interface SourceChipProps {
  /** From deriveSourceBadge(): label + variant. */
  badge: SourceBadge;
  /** Optional trailing text, e.g. "today" or "mark 2026-10-05". */
  suffix?: string | null;
  title?: string;
  className?: string;
}

/**
 * One look for "where did this price come from": the Pricing desk and Origination both render
 * a deriveSourceBadge() result through this chip.
 */
export function SourceChip({ badge, suffix, title, className }: SourceChipProps) {
  return (
    <span
      className={`${chipClassForBadge(badge.variant)}${className ? ` ${className}` : ''}`}
      title={title}
      data-source-label={badge.label}
    >
      {badge.label}
      {suffix ? ` · ${suffix}` : ''}
    </span>
  );
}
