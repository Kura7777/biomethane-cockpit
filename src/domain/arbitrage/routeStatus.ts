import type { OverallVerdict } from '../eligibility/types';

/**
 * How Origination presents a route. The engine's `isTradeable` flag is deliberately broad
 * (it is true for ELIGIBLE, CONDITIONAL and UNRESOLVED) and other screens rely on it, so the
 * Origination UI branches on the verdict instead:
 *  - ELIGIBLE                 -> TRADEABLE (all gates cleared)
 *  - CONDITIONAL / UNRESOLVED -> REVIEW    (listed, but a gate is open; never shown as tradeable)
 *  - anything else            -> BLOCKED
 */
export type OriginationRouteStatus = 'TRADEABLE' | 'REVIEW' | 'BLOCKED';

export function originationRouteStatus(verdict: OverallVerdict): OriginationRouteStatus {
  if (verdict === 'ELIGIBLE') return 'TRADEABLE';
  if (verdict === 'CONDITIONAL' || verdict === 'UNRESOLVED') return 'REVIEW';
  return 'BLOCKED';
}
