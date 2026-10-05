import React from 'react';
import { ShieldCheck, AlertTriangle, Ban } from 'lucide-react';
import type { OverallVerdict } from '../../domain/eligibility/types';
import { originationRouteStatus } from '../../domain/arbitrage/routeStatus';

interface RouteStatusBadgeProps {
  verdict: OverallVerdict;
  /** One-line eligibility summary, shown as the hover text. */
  detail?: string | null;
  className?: string;
}

/**
 * The one route-status badge Origination uses. Only ELIGIBLE reads as tradeable (green);
 * CONDITIONAL and UNRESOLVED read "Review needed" (amber).
 */
export function RouteStatusBadge({ verdict, detail, className }: RouteStatusBadgeProps) {
  const status = originationRouteStatus(verdict);
  const cfg =
    status === 'TRADEABLE'
      ? { label: 'Tradeable', chip: 'chip-pass', Icon: ShieldCheck }
      : status === 'REVIEW'
        ? { label: 'Review needed', chip: 'chip-warn', Icon: AlertTriangle }
        : { label: 'Blocked', chip: 'chip-neg', Icon: Ban };
  const { Icon } = cfg;
  return (
    <span
      className={`chip ${cfg.chip} inline-flex items-center gap-1${className ? ` ${className}` : ''}`}
      title={detail ?? undefined}
      data-route-status={status}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}
