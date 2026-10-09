import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../../store/state';
import { MARKETS } from '../markets/registry';
import { evaluateEligibility } from '../eligibility/engine';
import { computeAllNetbacks } from '../netback/engine';
import { rankNetbacks } from '../netback/ranking';
import type { EligibilityAssessment } from '../eligibility/types';
import { STALE_MARK_DAYS, VERY_STALE_MARK_DAYS } from '../markets/constants';
import {
  buildBriefMarks, buildBriefOrderBook, buildBriefRoutes, buildConsignmentLadder, buildFueleuSeries,
  greetingFor, ladderHeadline, latestFueleu, markFreshness, summariseFreshness, summariseSupplyByCountry,
} from '../briefing/morningBrief';
import type { BiomethanePlant } from '../plants/types';

const state = createDefaultState();
const consignment = state.consignments[0];

describe('morning brief — marks', () => {
  const marks = buildBriefMarks(state.marks);

  it('lists every registry market that has a mark, with the mark’s own numbers', () => {
    expect(marks.length).toBe(MARKETS.filter(m => state.marks.marks[m.id]).length);
    for (const m of marks) {
      const src = state.marks.marks[m.marketId];
      expect(m.mid).toBe(src.mid ?? null);
      expect(m.bid).toBe(src.bid ?? null);
      expect(m.offer).toBe(src.offer ?? null);
    }
  });

  it('flags the simulated seed marks as estimates', () => {
    expect(marks.some(m => m.isEstimate)).toBe(true);
  });

  it('bands freshness on the desk’s own staleness thresholds', () => {
    expect(markFreshness(null)).toBe('UNDATED');
    expect(markFreshness(STALE_MARK_DAYS)).toBe('FRESH');
    expect(markFreshness(STALE_MARK_DAYS + 1)).toBe('STALE');
    expect(markFreshness(VERY_STALE_MARK_DAYS + 1)).toBe('VERY_STALE');
  });

  it('counts add up to the number of marks', () => {
    const f = summariseFreshness(marks);
    expect(f.fresh + f.stale + f.veryStale + f.undated).toBe(f.total);
    expect(f.total).toBe(marks.length);
  });
});

describe('morning brief — netback ladder', () => {
  const rows = buildConsignmentLadder(consignment, state.marks, state.costs);

  it('reproduces the netback engine’s ranking exactly (no repricing on the brief)', () => {
    const markets = MARKETS.filter(m => m.status === 'ACTIVE');
    const el = new Map<string, EligibilityAssessment>();
    for (const m of markets) el.set(m.id, evaluateEligibility(consignment, m));
    const ranked = rankNetbacks(computeAllNetbacks(consignment, markets, state.marks, state.costs, el, state.marks.pricingSides), el)
      .filter(r => r.netNetback !== null);
    expect(rows.map(r => r.marketId)).toEqual(ranked.map(r => r.marketId));
    expect(rows.map(r => r.netNetback)).toEqual(ranked.map(r => r.netNetback));
    expect(rows.map(r => r.rank)).toEqual(ranked.map(r => r.rank));
  });

  it('headline picks rank 1 and measures its lead over rank 2', () => {
    const h = ladderHeadline(rows);
    const tradeable = rows.filter(r => r.rank !== null);
    expect(h.tradeable).toBe(tradeable.length);
    if (tradeable.length >= 2) {
      expect(h.best?.rank).toBe(1);
      expect(h.runnerUp?.rank).toBe(2);
      expect(h.leadEurMwh).toBeCloseTo(h.best!.netNetback - h.runnerUp!.netNetback, 10);
    }
    if (h.bestBlocked) {
      expect(h.bestBlocked.rank).toBeNull();
      expect(h.bestBlocked.netNetback).toBeGreaterThan(h.best?.netNetback ?? -Infinity);
    }
  });

  it('a ladder with nothing tradeable has no best market and no lead', () => {
    const h = ladderHeadline(rows.filter(r => r.rank === null));
    expect(h.best).toBeNull();
    expect(h.leadEurMwh).toBeNull();
  });
});

describe('morning brief — routes, FuelEU, book, supply', () => {
  it('returns only tradeable routes, best desk margin first', () => {
    const r = buildBriefRoutes(state.marks, state.costs, 'manure', 10000);
    expect(r.tradeable.every(x => x.deskMarginEurPerMWh !== null)).toBe(true);
    for (let i = 1; i < r.tradeable.length; i++) {
      expect(r.tradeable[i - 1].deskMarginEurPerMWh!).toBeGreaterThanOrEqual(r.tradeable[i].deskMarginEurPerMWh!);
    }
  });

  it('FuelEU series is in date order and the change is between two real prints', () => {
    const pts = buildFueleuSeries();
    for (let i = 1; i < pts.length; i++) expect(pts[i].date.getTime()).toBeGreaterThanOrEqual(pts[i - 1].date.getTime());
    const t = latestFueleu(pts, 'TRADE');
    if (t?.previous) expect(t.change).toBeCloseTo(t.latest.value - t.previous.value, 10);
    expect(latestFueleu([], 'TRADE')).toBeNull();
  });

  it('order book keeps only tradeable rows that quote a €/MWh side', () => {
    const rows = buildBriefOrderBook(state.pricingBook);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.bidEurMwh !== null || r.offerEurMwh !== null)).toBe(true);
  });

  it('sums supply by country', () => {
    const plants = [
      { countryCode: 'DK', country: 'Denmark', isVerified: true, annualEnergyGWh: 10, capacityNm3h: 100 },
      { countryCode: 'DK', country: 'Denmark', isVerified: false, annualEnergyGWh: null, capacityNm3h: 50 },
      { countryCode: 'FR', country: 'France', isVerified: true, annualEnergyGWh: 5, capacityNm3h: null },
    ] as unknown as BiomethanePlant[];
    const s = summariseSupplyByCountry(plants);
    expect(s[0]).toMatchObject({ country: 'DK', plants: 2, verified: 1, annualGWh: 10, capacityNm3h: 150 });
    expect(s[1]).toMatchObject({ country: 'FR', plants: 1, annualGWh: 5, capacityNm3h: 0 });
  });

  it('greets by local time of day', () => {
    expect(greetingFor(new Date(2026, 9, 9, 8))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 9, 9, 14))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 9, 9, 20))).toBe('Good evening');
  });
});
