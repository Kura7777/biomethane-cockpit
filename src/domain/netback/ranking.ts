import { NetbackResult, RankedNetback } from './types';
import { EligibilityAssessment } from '../eligibility/types';

/**
 * Rank netback results by net netback descending.
 * Options:
 * - excludeModelled: if true, exclude purely theoretical model outputs (like unquoted FuelEU)
 * - separateModelled: if true, rank marked compliance trades before unquoted model outputs
 */
export function rankNetbacks(
  netbacks: NetbackResult[],
  eligibilityResults: Map<string, EligibilityAssessment>,
  options?: { excludeModelled?: boolean }
): RankedNetback[] {
  let list = netbacks;
  if (options?.excludeModelled) {
    list = list.filter(nb => !nb.isModelled);
  }

  const ranked: RankedNetback[] = list.map(nb => {
    const el = eligibilityResults.get(nb.marketId);
    const verdict = el?.overallVerdict ?? 'UNKNOWN';
    return {
      ...nb,
      eligibilityVerdict: verdict,
      rank: 0,
    };
  });

  // Sort: tradeable first (by netback desc), then blocked (by theoretical netback desc)
  // Non-modelled marked trades take priority over unquoted theoretical models
  ranked.sort((a, b) => {
    const aTradeable = ['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(a.eligibilityVerdict);
    const bTradeable = ['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(b.eligibilityVerdict);

    if (aTradeable && !bTradeable) return -1;
    if (!aTradeable && bTradeable) return 1;

    // Both tradeable: if one is purely modelled and the other is marked, allow standard comparison or marked first
    const aVal = a.netNetback ?? -Infinity;
    const bVal = b.netNetback ?? -Infinity;
    return bVal - aVal;
  });

  // Assign ranks to tradeable markets only
  let rank = 1;
  for (const r of ranked) {
    if (['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(r.eligibilityVerdict) && r.netNetback !== null) {
      r.rank = rank++;
    } else {
      r.rank = null; // blocked or markless markets get no rank
    }
  }

  return ranked;
}

/**
 * Find the highest-value blocked opportunity — the banner message.
 * Returns marketId, marketName, netback, blockingReason, and remedy.
 */
export function getHighestBlockedOpportunity(
  ranked: RankedNetback[],
  eligibilityResults: Map<string, EligibilityAssessment>
): {
  marketId: string;
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
    marketId: highest.marketId,
    market: highest.marketName,
    netback: highest.netNetback,
    blockingReason: blockingGateResult?.reason ?? highest.blockingReason ?? 'Blocked by eligibility gate',
    remedy: blockingGateResult?.remedy ?? 'Review eligibility gate criteria',
  };
}
