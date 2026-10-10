import { describe, it, expect } from 'vitest';
import { compareDestinations } from '../arbitrage/destinationComparison';
import { MarksState } from '../netback/types';
import { feedstockDefaultCi } from '../assumptions/registry';

const marks = {
  marks: {
    NL_GGE: { bid: 0.37, offer: 0.39, mid: 0.38, provenance: null },
    DE_THG: { bid: 100, offer: 110, mid: 105, provenance: null },
  },
  gasIndex: { bid: 30, offer: 30.5, mid: 30.25, provenance: null },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
} as unknown as MarksState;
const costs = { transferCosts: 1, certificationCosts: 1, logistics: 1, otherCosts: 0 };

describe('destination comparison', () => {
  it('Spain: NL GGE is open (not blocked) with a €/MWh figure, next to DE THG', () => {
    const rows = compareDestinations({ origin: 'ES', marks, costs });
    const gge = rows.find(r => r.marketId === 'NL_GGE')!;
    expect(rows.map(r => r.marketId)).toContain('DE_THG');
    expect(gge.blocked).toBe(false);
    expect(gge.verdict).not.toBe('ELIGIBLE');
    expect(gge.netNetbackEurPerMwh).not.toBeNull();
    expect(gge.reason).toContain('still to enter');
  });

  it.each(['DK', 'DE'])('%s: NL GGE is blocked with the GO-route reason and no value', origin => {
    const gge = compareDestinations({ origin, marks, costs }).find(r => r.marketId === 'NL_GGE')!;
    expect(gge.blocked).toBe(true);
    expect(gge.netNetbackEurPerMwh).toBeNull();
    expect(gge.reason).toMatch(/GO route/);
  });

  it('adds a transport market of the origin country when the registry has one', () => {
    expect(compareDestinations({ origin: 'NL', marks, costs }).map(r => r.marketId)).toContain('NL_ERE');
  });

  it('values the plant\'s own feedstock: a landfill plant does not show manure values', () => {
    const manure = compareDestinations({ origin: 'ES', marks, costs, feedstockKey: 'manure' });
    const landfill = compareDestinations({ origin: 'ES', marks, costs, feedstockKey: 'landfill_gas' });
    const mCi = feedstockDefaultCi('manure')!;
    const lCi = feedstockDefaultCi('landfill_gas')!;
    expect(lCi).not.toBe(mCi);
    for (const id of ['NL_GGE', 'DE_THG']) {
      const m = manure.find(r => r.marketId === id)!;
      const l = landfill.find(r => r.marketId === id)!;
      expect(m.ci).toBe(mCi);
      expect(l.ci).toBe(lCi);
      expect(l.ciLabel).toContain('landfill gas default');
      expect(l.ciLabel).not.toContain('manure');
      expect(l.netNetbackEurPerMwh).not.toBe(m.netNetbackEurPerMwh);
    }
  });

  it('labels the CI used: the feedstock default, or the plant\'s published CI when it has one', () => {
    const def = compareDestinations({ origin: 'ES', marks, costs }).find(r => r.marketId === 'NL_GGE')!;
    expect(def.ciLabel).toBe('CI −100 g (manure default)');

    const published = compareDestinations({ origin: 'ES', marks, costs, reportedCi: { value: -42, sourceUrl: 'https://example.com/pos' } })
      .find(r => r.marketId === 'NL_GGE')!;
    expect(published.ci).toBe(-42);
    expect(published.ciLabel).toBe('CI −42 g (published, source)');
    expect(published.netNetbackEurPerMwh).not.toBe(def.netNetbackEurPerMwh);
  });

  it('falls back to manure only for an unknown feedstock key, and says so in the label', () => {
    const r = compareDestinations({ origin: 'ES', marks, costs, feedstockKey: 'not_a_feedstock' }).find(x => x.marketId === 'NL_GGE')!;
    expect(r.ciLabel).toContain('manure default');
  });
});
