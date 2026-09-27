import { describe, it, expect } from 'vitest';
import { buildPoolBook } from '../fueleu/poolMatching';

const OFFER = 108.60;
const BID = 98.60;

describe('buildPoolBook — Article 21 pool-matching engine', () => {
  it('matches a single surplus to a single deficit exactly, when surplus fully covers it', () => {
    const result = buildPoolBook({
      surplusParties: [{ id: 's1', name: 'Surplus Co', surplusTco2e: 1000 }],
      deficitParties: [{ id: 'd1', name: 'Deficit Co', deficitTco2e: 600, annexIvPenaltyEur: 300_000 }],
      offerEurPerTco2e: OFFER,
      bidEurPerTco2e: BID,
    });

    expect(result.matchedVolumeTco2e).toBe(600);
    expect(result.unmatchedDeficitTco2e).toBe(0);
    expect(result.unmatchedSurplusTco2e).toBe(400);
    expect(result.totalSurplusTco2e).toBe(1000);
    expect(result.totalDeficitTco2e).toBe(600);
    expect(result.poolBalanceTco2e).toBe(400);
    expect(result.isValidPool).toBe(true);

    // Desk margin = matched volume x (offer - bid) = 600 x 10.00 = 6,000
    expect(result.deskSpreadEarnedEur).toBeCloseTo(600 * (OFFER - BID), 6);

    const [d] = result.deficitAllocations;
    expect(d.matchedTco2e).toBe(600);
    expect(d.unmatchedTco2e).toBe(0);
    // Cost at offer = 600 x 108.60 = 65,160
    expect(d.costAtOfferEur).toBeCloseTo(600 * OFFER, 6);
    // Fully matched -> the full Annex IV penalty is avoided
    expect(d.avoidedPenaltyEur).toBeCloseTo(300_000, 6);
    expect(d.savingEur).toBeCloseTo(300_000 - 600 * OFFER, 6);

    const [s] = result.surplusAllocations;
    expect(s.matchedTco2e).toBe(600);
    expect(s.unmatchedTco2e).toBe(400);
    expect(s.proceedsAtBidEur).toBeCloseTo(600 * BID, 6);
  });

  it('greedily matches largest-surplus-first to largest-deficit-first across multiple parties', () => {
    const result = buildPoolBook({
      surplusParties: [
        { id: 'sSmall', name: 'Small Surplus', surplusTco2e: 100 },
        { id: 'sBig', name: 'Big Surplus', surplusTco2e: 900 },
      ],
      deficitParties: [
        { id: 'dSmall', name: 'Small Deficit', deficitTco2e: 200, annexIvPenaltyEur: 100_000 },
        { id: 'dBig', name: 'Big Deficit', deficitTco2e: 700, annexIvPenaltyEur: 350_000 },
      ],
      offerEurPerTco2e: OFFER,
      bidEurPerTco2e: BID,
    });

    // Largest deficit (dBig, 700) is processed first and drawn first from the largest surplus
    // (sBig, 900): dBig takes 700 from sBig, leaving sBig with 200. Then dSmall (200) draws the
    // remaining 200 from sBig (exhausting it) before touching sSmall.
    const dBig = result.deficitAllocations.find(a => a.id === 'dBig')!;
    const dSmall = result.deficitAllocations.find(a => a.id === 'dSmall')!;
    expect(dBig.matchedTco2e).toBe(700);
    expect(dSmall.matchedTco2e).toBe(200);

    const sBig = result.surplusAllocations.find(a => a.id === 'sBig')!;
    const sSmall = result.surplusAllocations.find(a => a.id === 'sSmall')!;
    expect(sBig.matchedTco2e).toBe(900); // fully consumed by dBig (700) + dSmall (200)
    expect(sSmall.matchedTco2e).toBe(0); // untouched — total surplus (1000) already covers total deficit (900)

    expect(result.matchedVolumeTco2e).toBe(900);
    expect(result.unmatchedDeficitTco2e).toBe(0);
    expect(result.poolBalanceTco2e).toBe(100); // 1000 surplus - 900 deficit
    expect(result.isValidPool).toBe(true);
  });

  it('leaves unmatched deficit and reports an invalid pool when total deficit exceeds total surplus (Art. 21(4))', () => {
    const result = buildPoolBook({
      surplusParties: [{ id: 's1', name: 'Only Surplus', surplusTco2e: 300 }],
      deficitParties: [
        { id: 'd1', name: 'Deficit A', deficitTco2e: 500, annexIvPenaltyEur: 200_000 },
        { id: 'd2', name: 'Deficit B', deficitTco2e: 400, annexIvPenaltyEur: 160_000 },
      ],
      offerEurPerTco2e: OFFER,
      bidEurPerTco2e: BID,
    });

    expect(result.totalSurplusTco2e).toBe(300);
    expect(result.totalDeficitTco2e).toBe(900);
    expect(result.poolBalanceTco2e).toBe(-600);
    expect(result.isValidPool).toBe(false);

    // Largest deficit (d1, 500) is served first and consumes all 300 of surplus; d2 gets nothing.
    const d1 = result.deficitAllocations.find(a => a.id === 'd1')!;
    const d2 = result.deficitAllocations.find(a => a.id === 'd2')!;
    expect(d1.matchedTco2e).toBe(300);
    expect(d1.unmatchedTco2e).toBe(200);
    expect(d2.matchedTco2e).toBe(0);
    expect(d2.unmatchedTco2e).toBe(400);
    expect(result.matchedVolumeTco2e).toBe(300);
    expect(result.unmatchedDeficitTco2e).toBe(600);

    // Partial-match saving is proportional: d1 avoids 300/500 = 60% of its Annex IV penalty.
    expect(d1.avoidedPenaltyEur).toBeCloseTo(200_000 * 0.6, 6);
    expect(d2.avoidedPenaltyEur).toBe(0);
  });

  it('handles an empty book without dividing by zero', () => {
    const result = buildPoolBook({ surplusParties: [], deficitParties: [], offerEurPerTco2e: OFFER, bidEurPerTco2e: BID });
    expect(result.matchedVolumeTco2e).toBe(0);
    expect(result.totalSurplusTco2e).toBe(0);
    expect(result.totalDeficitTco2e).toBe(0);
    expect(result.poolBalanceTco2e).toBe(0);
    expect(result.isValidPool).toBe(true); // 0 >= 0
    expect(result.deskSpreadEarnedEur).toBe(0);
  });

  it('is a pure function: does not mutate its inputs', () => {
    const surplusParties = [{ id: 's1', name: 'S', surplusTco2e: 500 }];
    const deficitParties = [{ id: 'd1', name: 'D', deficitTco2e: 300, annexIvPenaltyEur: 100_000 }];
    const surplusSnapshot = JSON.stringify(surplusParties);
    const deficitSnapshot = JSON.stringify(deficitParties);

    buildPoolBook({ surplusParties, deficitParties, offerEurPerTco2e: OFFER, bidEurPerTco2e: BID });

    expect(JSON.stringify(surplusParties)).toBe(surplusSnapshot);
    expect(JSON.stringify(deficitParties)).toBe(deficitSnapshot);
  });
});
