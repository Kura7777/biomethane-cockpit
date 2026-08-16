import React from 'react';
import { STALE_MARK_DAYS, VERY_STALE_MARK_DAYS } from '../../domain/markets/constants';

interface StaleIndicatorProps {
  timestamp: string | null;
  showText?: boolean;
}

function daysSince(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const diff = Date.now() - new Date(timestamp).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function StaleIndicator({ timestamp, showText = true }: StaleIndicatorProps) {
  if (!timestamp) {
    return <span className="text-xs text-stone-400">No mark</span>;
  }

  const days = daysSince(timestamp);
  if (days === null) return null;

  if (days >= VERY_STALE_MARK_DAYS) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        {showText && `${days}d ago`}
      </span>
    );
  }

  if (days >= STALE_MARK_DAYS) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        {showText && `${days}d ago`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      {showText && (days === 0 ? 'Today' : days === 1 ? '1d ago' : `${days}d ago`)}
    </span>
  );
}

export function getStaleMarkCount(marks: Record<string, { timestamp?: string | null }>): number {
  return Object.values(marks).filter(m => {
    if (!m.timestamp) return true; // no mark = stale
    const days = daysSince(m.timestamp);
    return days !== null && days >= STALE_MARK_DAYS;
  }).length;
}
