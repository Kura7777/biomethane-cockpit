import React from 'react';
import { getMarkAgeDays, getMarkStaleness, StalenessStatus, MarkProvenance, MarkTimeObject } from '../../domain/markets/types';

interface StaleIndicatorProps {
  updatedAt?: string | null;
  provenance?: MarkProvenance | null;
  target?: string | null | MarkTimeObject;
  showText?: boolean;
  compact?: boolean;
}

export function StaleIndicator({ updatedAt, provenance, target, showText = true, compact = false }: StaleIndicatorProps) {
  const timeTarget = target !== undefined ? target : (provenance ? { provenance, updatedAt } : updatedAt);
  const status = getMarkStaleness(timeTarget);
  const ageDays = getMarkAgeDays(timeTarget);

  // When showText is false only the coloured dot remains, so the status has to be
  // announced some other way — colour alone is not a signal (MASTER §1.4/§6).
  if (status === 'UNFILLED') {
    return (
      <span className="inline-flex items-center gap-1 text-micro text-stone-400 font-mono" aria-label="No mark entered">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-600" aria-hidden="true" />
        {showText && 'No mark'}
      </span>
    );
  }

  if (status === 'STALE_CRITICAL') {
    return (
      <span
        className="inline-flex items-center gap-1 text-micro text-red-400 font-mono font-bold bg-red-950/60 border border-red-800 px-1.5 py-0.5 rounded"
        title={`Mark entered ${ageDays} days ago`}
        aria-label={`Mark critically stale: entered ${ageDays} days ago`}
      >
        {/* animate-pulse is reserved for critical live status (MASTER §5.2) */}
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
        {showText && `${ageDays}d ago [STALE]`}
      </span>
    );
  }

  if (status === 'STALE_WARNING') {
    return (
      <span
        className="inline-flex items-center gap-1 text-micro text-amber-400 font-mono font-semibold bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded"
        title={`Mark entered ${ageDays} days ago`}
        aria-label={`Mark ageing: entered ${ageDays} days ago`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        {showText && `${ageDays}d ago`}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-micro text-emerald-400 font-mono"
      title={`Mark entered ${ageDays === 0 ? 'today' : `${ageDays} days ago`}`}
      aria-label={`Mark fresh: entered ${ageDays === 0 ? 'today' : `${ageDays} days ago`}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      {showText && (ageDays === 0 ? 'Today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`)}
    </span>
  );
}
