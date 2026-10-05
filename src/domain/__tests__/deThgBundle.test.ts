import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../../store/context';
import { computeNetback } from '../netback/engine';
import { getMarketById } from '../markets/registry';
import { buildArbitrageConsignment } from '../arbitrage/engine';
import { selectDeThgBundleReference, bundleYearFromVintage } from '../markets/deThgBundle';
import { applyMarkUpdates, deThgBundleMarkUpdates } from '../marks/applyMarks';
import type { CostInputs, MarksState } from '../netback/types';

const costs: CostInputs = {
  transferCosts: 1.2,
  certificationCosts: 0.5,
  logistics: 0.5,
  otherCosts: null,
  producerPricing: {
    mode: 'INDEX_LINKED',
    fixedPriceEurPerMwh: null,
    indexLinkedShare: 0.97,
    source: 'test',
    lastVerified: null,
    confidence: 'UNVERIFIED',
  },
};
const TOTAL_COSTS = 2.2;

function marksWithGas(mid: number): MarksState {
  const st = createDefaultState();
  const now = '2026-10-05T08:00:00.000Z';
  return {
    ...st.marks,
    gasIndex: {
      bid: mid,
      offer: mid,
      mid,
      updatedAt: now,
      provenance: { sourceType: 'ESTIMATE', sourceName: 'SIMULATED', sourceUrl: null, observedAt: now, note: null },
    },
  };
}

function dkManure(ci: number, year: number | null) {
  return buildArbitrageConsignment({
    originCountry: 'DK',
    originCountryName: 'Denmark',
    feedstockKey: 'manure',
    feedstockName: 'Manure',
    annexClassification: 'IX_A',
    carbonIntensity: ci,
    scheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    isEUGrid: true,
    volumeMWh: 20000,
    complianceYear: year,
  });
}

const deThg = getMarketById('DE_THG')!;

describe('DE THG manure bundle is the broker certificate price plus the gas index', () => {
  it('the broker sheet rows become marks: H226 -> 2026 bid 147, H127 -> 2027 bid 141 / offer 148, Broker, observed 2026-08-18', () => {
    const { marks } = { marks: createDefaultState().marks };
    const m26 = marks.marks['DE_THG_BUNDLE_2026'];
    const m27 = marks.marks['DE_THG_BUNDLE_2027'];
    expect(m26.bid).toBe(147);
    expect(m26.offer).toBeNull();
    expect(m26.mid).toBeNull();
    expect(m26.provenance?.sourceType).toBe('BROKER_INDICATION');
    expect(m26.provenance?.observedAt).toBe('2026-08-18');
    expect(m27.bid).toBe(141);
    expect(m27.offer).toBe(148);
    expect(bundleYearFromVintage('H226')).toBe(2026);
    expect(bundleYearFromVintage('H127')).toBe(2027);
    expect(bundleYearFromVintage('2026')).toBeNull();
  });

  it('sells at the bid, for the deal year; no year uses the earliest quoted year', () => {
    const marks = createDefaultState().marks.marks;
    expect(selectDeThgBundleReference(marks, 2026)?.certificateEurPerMwh).toBe(147);
    expect(selectDeThgBundleReference(marks, 2027)?.certificateEurPerMwh).toBe(141);
    expect(selectDeThgBundleReference(marks, null)?.year).toBe(2026);
    expect(selectDeThgBundleReference(marks, 2028)).toBeNull();
  });

  it('netback is certificate + TTF - costs: moving the TTF moves the netback one for one', () => {
    const at30 = computeNetback(deThg, dkManure(-100, 2026), marksWithGas(30), costs);
    const at40 = computeNetback(deThg, dkManure(-100, 2026), marksWithGas(40), costs);
    expect(at30.netNetback).toBeCloseTo(147 + 30 - TOTAL_COSTS, 2);
    expect(at40.netNetback).toBeCloseTo(147 + 40 - TOTAL_COSTS, 2);
    expect(at30.bundleReference?.kind).toBe('BROKER_CERTIFICATE');
    expect(at30.bundleReference?.valueEurPerMwh).toBe(147);
    expect(at30.bundleReferenceEurPerMwh).toBe(147);
    expect(at30.netbackCappedAt).toBeCloseTo(147 + 30 - TOTAL_COSTS, 2);
    expect(at30.theoreticalNetback!).toBeGreaterThan(at30.netNetback!);
    expect(at30.clearingPriceWarning).toMatch(/broker bundle price/i);
  });

  it('2027 delivery uses the H127 bid', () => {
    const nb = computeNetback(deThg, dkManure(-100, 2027), marksWithGas(30), costs);
    expect(nb.netNetback).toBeCloseTo(141 + 30 - TOTAL_COSTS, 2);
    expect(nb.bundleReference?.year).toBe(2027);
  });

  it('a year with no broker mark has no bundle reference, says so, and invents nothing', () => {
    const nb = computeNetback(deThg, dkManure(-100, 2028), marksWithGas(30), costs);
    expect(nb.bundleReference).toBeNull();
    expect(nb.netbackCappedAt).toBeNull();
    expect(nb.netNetback).toBeCloseTo(nb.theoreticalNetback!, 2);
    expect(nb.clearingPriceWarning).toMatch(/No broker bundle mark for compliance year 2028/);
  });

  it('for -80 < CI <= 0 there is no broker row: the unsourced desk all-in estimate (120) is a labelled ceiling', () => {
    const nb = computeNetback(deThg, dkManure(-40, 2026), marksWithGas(30), costs);
    if (nb.netbackCappedAt !== null) {
      expect(nb.bundleReference?.kind).toBe('DESK_ESTIMATE_ALL_IN');
      expect(nb.netNetback).toBe(120);
    } else {
      expect(nb.netNetback!).toBeLessThanOrEqual(120);
    }
    expect(nb.bundleReference?.kind).toBe('DESK_ESTIMATE_ALL_IN');
  });

  it('an observed all-in price on the deal still overrides the broker mark', () => {
    const c = { ...dkManure(-100, 2026), observedBundlePriceEurPerMwh: 100 };
    const nb = computeNetback(deThg, c, marksWithGas(30), costs);
    expect(nb.bundleReference?.kind).toBe('OBSERVED_ALL_IN');
    expect(nb.netNetback).toBe(100);
  });

  it('bundle marks only come from broker rows with a price and CI <= -80, and go through applyMarkUpdates', () => {
    const book = createDefaultState().pricingBook;
    const updates = deThgBundleMarkUpdates(book);
    expect(updates.map(u => u.marketId).sort()).toEqual(['DE_THG_BUNDLE_2026', 'DE_THG_BUNDLE_2027']);
    const marks = marksWithGas(30);
    const next = applyMarkUpdates({ ...marks, marks: {} }, updates);
    expect(next.marks['DE_THG_BUNDLE_2026'].bid).toBe(147);
    // An older observation never overwrites a newer one.
    const older = updates.map(u => ({ ...u, bid: 1, provenance: { ...u.provenance!, observedAt: '2026-01-01' } }));
    expect(applyMarkUpdates(next, older).marks['DE_THG_BUNDLE_2026'].bid).toBe(147);
  });
});
