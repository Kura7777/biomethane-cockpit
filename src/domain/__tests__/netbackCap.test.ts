import { describe, it, expect } from 'vitest';
import { computeNetback } from '../netback/engine';
import { getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import type { MarksState, CostInputs } from '../netback/types';

// The desk cannot sell above the traded bundle price, so netback, producer payable, margin and P&L
// are taken at min(modelled, bundle reference). For DE THG manure (CI <= -80) the reference is the
// broker's certificate-only bundle price plus the gas index (the broker sheet: "Index gas price/swap
// to be added on top"), less the costs the netback deducts.
const BUNDLE_CERT = 147;
const marks: MarksState = {
  marks: {
    DE_THG: { marketId: 'DE_THG', bid: 280, offer: 290, mid: 285, updatedAt: new Date().toISOString(), source: 'Test' },
    DE_THG_BUNDLE_2026: {
      marketId: 'DE_THG_BUNDLE_2026', bid: BUNDLE_CERT, offer: null, mid: null, updatedAt: new Date().toISOString(), source: 'Broker run',
      provenance: { sourceType: 'BROKER_INDICATION', sourceName: 'Broker run', sourceUrl: null, observedAt: '2026-08-18', note: null },
    },
  },
  gasIndex: { bid: 30, offer: 31, mid: 30.5, updatedAt: new Date().toISOString() },
  fx: { gbpEur: 1.17, chfEur: 1.05, updatedAt: new Date().toISOString() },
  pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
};
const costs: CostInputs = {
  transferCosts: 1, certificationCosts: 0.5, logistics: 0.7, otherCosts: 0,
  producerPricing: { mode: 'INDEX_LINKED', fixedPriceEurPerMwh: null, indexLinkedShare: 0.97, source: null, lastVerified: null, confidence: 'UNVERIFIED' },
};
const manure = {
  ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
  carbonIntensity: -100,
  volumeMWh: 10_000,
  deliveryPeriod: { type: null, startDate: null, endDate: null, complianceYear: 2026 },
};

describe('realisable netback cap', () => {
  const nb = computeNetback(getMarketById('DE_THG')!, manure, marks, costs, 'bid');
  const ref = BUNDLE_CERT + 30 - 2.2; // broker certificate + TTF bid - transfer, certification, logistics

  it('holds the DE THG manure netback to broker certificate + TTF and keeps the modelled figure', () => {
    expect(nb.theoreticalNetback!).toBeGreaterThan(ref);
    expect(nb.netNetback).toBeCloseTo(ref, 2);
    expect(nb.netbackCappedAt).toBeCloseTo(ref, 2);
    expect(nb.bundleReference?.kind).toBe('BROKER_CERTIFICATE');
  });

  it('prices the producer, margin and P&L off the held netback', () => {
    expect(nb.producerPayable).toBeCloseTo(nb.netNetback! * 0.97, 2);
    expect(nb.deskMargin).toBeCloseTo(nb.netNetback! - nb.producerPayable!, 2);
    expect(nb.deskPnL).toBeCloseTo(nb.deskMargin! * 10_000, 2);
    expect(nb.sides!.atChosenSides).toBeCloseTo(ref, 2);
    expect(nb.sides!.crossingCost).toBe(0);
  });

  it('holds both double-counting branches, so neither overstates what the market pays', () => {
    for (const b of nb.uncertaintyBranches ?? []) expect(b.netNetback!).toBeLessThanOrEqual(ref + 0.01);
  });

  it('uses an observed bundle price on the deal ahead of the broker mark', () => {
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
