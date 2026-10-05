import { describe, it, expect } from 'vitest';
import { buildMarketLadder, buildLadderConsignment, type LadderOpportunity } from '../arbitrage/marketLadder';
import { simulateDesk } from '../marks/simulate';
import type { MarksState } from '../netback/types';

const opp: LadderOpportunity = {
  originCountry: 'DK',
  originCountryName: 'Denmark',
  feedstockKey: 'manure',
  feedstockName: 'Manure',
  carbonIntensity: -100,
  certificationScheme: 'ISCC_EU',
  chainOfCustody: 'MASS_BALANCE',
  targetMarketId: 'DE_THG',
};

describe('buildMarketLadder', () => {
  const { marks, costs } = simulateDesk(new Date('2026-10-05T08:00:00Z'));

  it('prices the route into every active market and flags the chosen one', () => {
    const ladder = buildMarketLadder(opp, 20000, marks, costs);
    expect(ladder.ranked.length + ladder.missing.length).toBeGreaterThan(10);
    expect(ladder.ranked.filter(r => r.isChosen)).toHaveLength(1);
    expect(ladder.ranked.find(r => r.isChosen)?.marketId).toBe('DE_THG');
    expect(ladder.consignment.volumeMWh).toBe(20000);
    expect(ladder.consignment.originCountry).toBe('DK');
  });

  it('ranks tradeable markets by netback, best first, and never ranks a blocked market', () => {
    const ladder = buildMarketLadder(opp, 20000, marks, costs);
    const ranked = ladder.ranked.filter(r => r.rank !== null);
    expect(ranked.length).toBeGreaterThan(0);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].rank).toBe(ranked[i - 1].rank! + 1);
    }
    for (const r of ladder.ranked) {
      if (r.verdict === 'HARD_BLOCK' || r.verdict === 'UNKNOWN') expect(r.rank).toBeNull();
      expect(r.netNetback).not.toBeNull();
    }
  });

  it('never ranks a market whose netback is null: it comes back as a missing mark', () => {
    const noMarks: MarksState = { ...marks, marks: {} };
    const ladder = buildMarketLadder(opp, 20000, noMarks, costs);
    expect(ladder.ranked.every(r => r.netNetback !== null)).toBe(true);
    expect(ladder.missing.length).toBeGreaterThan(0);
    for (const m of ladder.missing) {
      expect(m.netNetback).toBeNull();
      expect(m.rank).toBeNull();
    }
  });

  it('builds the same consignment the route scan uses (DK is on the EU grid)', () => {
    const c = buildLadderConsignment(opp, 5000);
    expect(c.injectionIsEU).toBe(true);
    expect(c.udbStatus).toBe('RECORDED');
    expect(c.carbonIntensity).toBe(-100);
  });
});
