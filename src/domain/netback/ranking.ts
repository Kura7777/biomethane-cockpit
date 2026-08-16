import { NetbackResult, RankedNetback } from './types';
import { EligibilityAssessment } from '../eligibility/types';

/**
 * Rank netback results by net netback descending.
 * Tradeable markets (ELIGIBLE, CONDITIONAL, UNRESOLVED) first, then blocked.
 * Germany's UNRESOLVED status means it's tradeable but uncertain — show it.
 */
export function rankNetbacks(
  netbacks: NetbackResult[],
  eligibilityResults: Map<string, EligibilityAssessment>
): RankedNetback[] {
  const ranked: RankedNetback[] = netbacks.map(nb => {
    const el = eligibilityResults.get(nb.marketId);
    const verdict = el?.overallVerdict ?? 'UNKNOWN';
    return {
      ...nb,
      eligibilityVerdict: verdict,
      rank: 0,
    };
  });

  // Sort: tradeable first (by netback desc), then blocked (by theoretical netback desc)
  ranked.sort((a, b) => {
    const aTradeable = ['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(a.eligibilityVerdict);
    const bTradeable = ['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(b.eligibilityVerdict);

    if (aTradeable && !bTradeable) return -1;
    if (!aTradeable && bTradeable) return 1;

    const aVal = a.netNetback ?? -Infinity;
    const bVal = b.netNetback ?? -Infinity;
    return bVal - aVal;
  });

  // Assign ranks to tradeable markets only
  let rank = 1;
  for (const r of ranked) {
    if (['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(r.eligibilityVerdict)) {
      r.rank = rank++;
    } else {
      r.rank = 0; // blocked markets get no rank
    }
  }

  return ranked;
}

/**
 * Find the highest-value blocked opportunity — the banner message.
 * "Highest theoretical netback (Market, €X/MWh) is not currently tradeable"
 */
export function getHighestBlockedOpportunity(
  ranked: RankedNetback[],
  eligibilityResults: Map<string, EligibilityAssessment>
): {
  market: string;
  netback: number;
  blockingReason: string;
  remedy: string;
} | null {
  const blocked = ranked.filter(r => 
    r.eligibilityVerdict === 'HARD_BLOCK' && r.netNetback !== null
  );
  
  if (blocked.length === 0) return null;

  // Find the one with highest theoretical netback
  const highest = blocked.reduce((best, curr) => 
    (curr.netNetback ?? -Infinity) > (best.netNetback ?? -Infinity) ? curr : best
  );

  if (highest.netNetback === null) return null;

  const eligibility = eligibilityResults.get(highest.marketId);
  const blockingGateResult = eligibility?.gates.find(g => g.verdict === 'HARD_BLOCK');

  return {
    market: highest.marketName,
    netback: highest.netNetback,
    blockingReason: blockingGateResult?.reason ?? highest.blockingReason ?? 'Blocked by eligibility gate',
    remedy: blockingGateResult?.remedy ?? 'Review eligibility gate criteria',
  };
}
