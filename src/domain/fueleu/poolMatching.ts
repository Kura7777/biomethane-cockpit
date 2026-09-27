/**
 * Article 21 FuelEU pool-matching engine — a desk-sizing tool, not a literal implementation of the
 * regulation's allocation mechanics (the FuelEU database records the pool's actual per-ship
 * allocation; this only estimates matched volume, desk spread, and indicative per-party savings for
 * screening which surplus/deficit counterparties or groups to bring together).
 *
 * Regulation (EU) 2023/1805, Art. 21 constraints this respects/notes:
 *  - Art. 21(1): "A ship's compliance balance may not be included in more than one pool in the same
 *    reporting period" — each party passed in here is assumed to be a single, undivided
 *    surplus/deficit position for one pool.
 *  - Art. 21(4): "A pool is valid only if the total pooled compliance is positive" (and no member's
 *    deficit worsens, no surplus member is pushed into deficit) — this engine reports
 *    `isValidPool = poolBalanceTco2e >= 0` for the whole matched book; it does not re-verify the
 *    per-ship non-worsening condition, which is the verifier's job under Art. 21(2)-(3).
 *  - Art. 21(8): the selected verifier must record the pool's definitive composition and allocation
 *    in the FuelEU database "by 30 April of the verification period"
 *    (FUELEU_POOLING_BORROWING_DATABASE_DEADLINE in calculator.ts).
 *
 * Allocation: greedy, largest-surplus-first matched to largest-deficit-first. This is a reasonable
 * desk heuristic (fewer, larger tickets) but is not the only valid allocation — Art. 21 does not
 * mandate any particular allocation method as long as the pool as a whole is valid.
 */

export interface PoolParty {
  id: string;
  name: string;
}

export interface PoolSurplusParty extends PoolParty {
  /** Positive compliance surplus (tCO2e) available to sell into the pool. */
  surplusTco2e: number;
}

export interface PoolDeficitParty extends PoolParty {
  /** Compliance deficit magnitude (tCO2e, positive number). */
  deficitTco2e: number;
  /** This party's own Annex IV statutory penalty if it closes none of its deficit (€). */
  annexIvPenaltyEur: number;
}

export interface PoolDeficitAllocation {
  id: string;
  name: string;
  deficitTco2e: number;
  matchedTco2e: number;
  unmatchedTco2e: number;
  /** matchedTco2e * offerEurPerTco2e — what this party pays the desk for its matched cover. */
  costAtOfferEur: number;
  annexIvPenaltyEur: number;
  /**
   * Statutory penalty is calculated on the ship's residual deficit after Art. 20/21 flexibilities,
   * not split literally pro-rata — but for desk sizing (not a filing), the Annex IV penalty is
   * approximated as scaling with the matched share of the party's own deficit:
   *   avoidedPenaltyEur = annexIvPenaltyEur * (matchedTco2e / deficitTco2e)
   */
  avoidedPenaltyEur: number;
  savingEur: number;
}

export interface PoolSurplusAllocation {
  id: string;
  name: string;
  surplusTco2e: number;
  matchedTco2e: number;
  unmatchedTco2e: number;
  /** matchedTco2e * bidEurPerTco2e — what the desk pays this surplus holder. */
  proceedsAtBidEur: number;
}

export interface PoolBookResult {
  totalSurplusTco2e: number;
  totalDeficitTco2e: number;
  matchedVolumeTco2e: number;
  unmatchedDeficitTco2e: number;
  unmatchedSurplusTco2e: number;
  /** Total pooled compliance balance across every party supplied (Art. 21(4) validity check). */
  poolBalanceTco2e: number;
  isValidPool: boolean;
  /** matchedVolumeTco2e * (offer − bid): the desk's total margin on this book. */
  deskSpreadEarnedEur: number;
  surplusAllocations: PoolSurplusAllocation[];
  deficitAllocations: PoolDeficitAllocation[];
}

/**
 * Greedily allocates surplus (largest first) to deficits (largest first). Pure function — no I/O,
 * no mutation of inputs.
 */
export function buildPoolBook(params: {
  surplusParties: PoolSurplusParty[];
  deficitParties: PoolDeficitParty[];
  offerEurPerTco2e: number;
  bidEurPerTco2e: number;
}): PoolBookResult {
  const { offerEurPerTco2e, bidEurPerTco2e } = params;

  const surplusRemaining = params.surplusParties
    .map(p => ({ ...p, remaining: Math.max(0, p.surplusTco2e) }))
    .sort((a, b) => b.surplusTco2e - a.surplusTco2e);

  const deficits = [...params.deficitParties]
    .map(p => ({ ...p, deficitTco2e: Math.max(0, p.deficitTco2e) }))
    .sort((a, b) => b.deficitTco2e - a.deficitTco2e);

  const matchedBySurplusId = new Map<string, number>();
  const deficitAllocations: PoolDeficitAllocation[] = [];
  let matchedVolumeTco2e = 0;

  for (const d of deficits) {
    let remainingNeed = d.deficitTco2e;
    let matched = 0;

    for (const s of surplusRemaining) {
      if (remainingNeed <= 0) break;
      if (s.remaining <= 0) continue;
      const take = Math.min(s.remaining, remainingNeed);
      s.remaining -= take;
      matchedBySurplusId.set(s.id, (matchedBySurplusId.get(s.id) ?? 0) + take);
      remainingNeed -= take;
      matched += take;
    }

    matchedVolumeTco2e += matched;
    const unmatched = Math.max(0, d.deficitTco2e - matched);
    const costAtOfferEur = matched * offerEurPerTco2e;
    const avoidedPenaltyEur = d.deficitTco2e > 0 ? d.annexIvPenaltyEur * (matched / d.deficitTco2e) : 0;

    deficitAllocations.push({
      id: d.id,
      name: d.name,
      deficitTco2e: d.deficitTco2e,
      matchedTco2e: matched,
      unmatchedTco2e: unmatched,
      costAtOfferEur,
      annexIvPenaltyEur: d.annexIvPenaltyEur,
      avoidedPenaltyEur,
      savingEur: avoidedPenaltyEur - costAtOfferEur,
    });
  }

  const surplusAllocations: PoolSurplusAllocation[] = surplusRemaining.map(s => {
    const matched = matchedBySurplusId.get(s.id) ?? 0;
    return {
      id: s.id,
      name: s.name,
      surplusTco2e: s.surplusTco2e,
      matchedTco2e: matched,
      unmatchedTco2e: Math.max(0, s.surplusTco2e - matched),
      proceedsAtBidEur: matched * bidEurPerTco2e,
    };
  });

  const totalSurplusTco2e = params.surplusParties.reduce((sum, p) => sum + Math.max(0, p.surplusTco2e), 0);
  const totalDeficitTco2e = deficits.reduce((sum, p) => sum + p.deficitTco2e, 0);
  const unmatchedDeficitTco2e = deficitAllocations.reduce((sum, a) => sum + a.unmatchedTco2e, 0);
  const unmatchedSurplusTco2e = surplusAllocations.reduce((sum, a) => sum + a.unmatchedTco2e, 0);
  const poolBalanceTco2e = totalSurplusTco2e - totalDeficitTco2e;

  return {
    totalSurplusTco2e,
    totalDeficitTco2e,
    matchedVolumeTco2e,
    unmatchedDeficitTco2e,
    unmatchedSurplusTco2e,
    poolBalanceTco2e,
    isValidPool: poolBalanceTco2e >= 0,
    deskSpreadEarnedEur: matchedVolumeTco2e * (offerEurPerTco2e - bidEurPerTco2e),
    surplusAllocations,
    deficitAllocations,
  };
}
