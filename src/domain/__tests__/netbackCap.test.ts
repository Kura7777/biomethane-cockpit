import { describe, it, expect } from 'vitest';
import { computeNetback } from '../netback/engine';
import { getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { getAssumption } from '../assumptions/registry';
import type { MarksState, CostInputs } from '../netback/types';

// Desk policy (28 Sept 2026): the desk cannot sell above the traded bundle price, so netback,
// producer payable, margin and P&L are taken at min(modelled, bundle reference).
const marks: MarksState = {
  marks: { DE_THG: { marketId: 'DE_THG', bid: 280, offer: 290, mid: 285, updatedAt: new Date().toISOString(), source: 'Test' } },
  gasIndex: { bid: 30, offer: 31, mid: 30.5, updatedAt: new Date().toISOString() },
  fx: { gbpEur: 1.17, chfEur: 1.05, updatedAt: new Date().toISOString() },
  pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
};
const costs: CostInputs = {
  transferCosts: 1, certificationCosts: 0.5, logistics: 0.7, otherCosts: 0,
  producerPricing: { mode: 'INDEX_LINKED', fixedPriceEurPerMwh: null, indexLinkedShare: 0.97, source: null, lastVerified: null, confidence: 'UNVERIFIED' },
};
const manure = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, carbonIntensity: -100, volumeMWh: 10_000 };

describe('realisable netback cap', () => {
  const nb = computeNetback(getMarketById('DE_THG')!, manure, marks, costs, 'bid');
  const ref = getAssumption('risk.deThgBundleRefNeg80EurPerMwh');

  it('caps the DE THG manure netback at the bundle reference and keeps the modelled figure', () => {
    expect(nb.theoreticalNetback!).toBeGreaterThan(ref);
    expect(nb.netNetback).toBe(ref);
    expect(nb.netbackCappedAt).toBe(ref);
  });

  it('prices the producer, margin and P&L off the capped netback', () => {
    expect(nb.producerPayable).toBeCloseTo(ref * 0.97, 2);
    expect(nb.deskMargin).toBeCloseTo(ref - nb.producerPayable!, 2);
    expect(nb.deskPnL).toBeCloseTo(nb.deskMargin! * 10_000, 2);
    expect(nb.sides!.atChosenSides).toBe(ref);
    expect(nb.sides!.crossingCost).toBe(0);
  });

  it('caps both double-counting branches, so neither overstates what the market pays', () => {
    for (const b of nb.uncertaintyBranches ?? []) expect(b.netNetback!).toBeLessThanOrEqual(ref);
  });

  it('uses an observed bundle price on the deal ahead of the desk reference', () => {
    const r = computeNetback(getMarketById('DE_THG')!, { ...manure, observedBundlePriceEurPerMwh: 160 }, marks, costs, 'bid');
    expect(r.netNetback).toBe(160);
    expect(r.clearingPriceWarning).toContain('observed traded bundle price of €160.00');
  });

  it('leaves the netback alone when it is below the bundle', () => {
    const r = computeNetback(getMarketById('DE_THG')!, { ...manure, observedBundlePriceEurPerMwh: 1e9 }, marks, costs, 'bid');
    expect(r.netbackCappedAt).toBeNull();
    expect(r.netNetback).toBe(r.theoreticalNetback);
    expect(r.clearingPriceWarning).toBeNull();
  });
});
