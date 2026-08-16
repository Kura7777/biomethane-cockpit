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

  if (status === 'UNFILLED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-stone-500 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-600" />
        {showText && 'No mark'}
      </span>
    );
  }

  if (status === 'STALE_CRITICAL') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-mono font-bold bg-red-950/60 border border-red-800 px-1.5 py-0.5 rounded" title={`Mark entered ${ageDays} days ago`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {showText && `${ageDays}d ago [STALE]`}
      </span>
    );
  }

  if (status === 'STALE_WARNING') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-mono font-semibold bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded" title={`Mark entered ${ageDays} days ago`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {showText && `${ageDays}d ago`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono" title={`Mark entered ${ageDays === 0 ? 'today' : `${ageDays} days ago`}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {showText && (ageDays === 0 ? 'Today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`)}
    </span>
  );
}
