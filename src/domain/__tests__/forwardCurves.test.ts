import { describe, it, expect } from 'vitest';
import {
  generateForwardCurves,
  buildForwardCurve,
  getForwardQuote,
  getTenorByYear,
  calculateSeasonalSpread,
  FORWARD_YEARS,
  STATUTORY_OBLIGATION_TRAJECTORIES,
} from '../curves/engine';
import { MarksState } from '../netback/types';

function createMockMarks(): MarksState {
  return {
    marks: {
      DE_THG: { marketId: 'DE_THG', mid: 0.85, bid: 0.83, offer: 0.87, updatedAt: null, source: null },
      NL_ERE: { marketId: 'NL_ERE', mid: 18.50, bid: 18.20, offer: 18.80, updatedAt: null, source: null },
      FR_CPB: { marketId: 'FR_CPB', mid: 26.00, bid: 25.00, offer: 27.00, updatedAt: null, source: null },
      UK_RTFO: { marketId: 'UK_RTFO', mid: 36.00, bid: 35.00, offer: 37.00, updatedAt: null, source: null },
      FUELEU: { marketId: 'FUELEU', mid: 14.00, bid: 13.50, offer: 14.50, updatedAt: null, source: null },
      DE_GO: { marketId: 'DE_GO', mid: 6.50, bid: 6.20, offer: 6.80, updatedAt: null, source: null },
    },
    gasIndex: { mid: 38.50, bid: 38.20, offer: 38.80, updatedAt: null },
    fx: { gbpEur: 1.17, chfEur: 1.05, updatedAt: null },
    pricingSides: {
      certificateSide: 'mid',
      moleculeSide: 'mid',
    },
  };
}

describe('Forward Curves Engine (Cal-2026 to Cal-2030)', () => {
  it('covers all 5 multi-year forward tenors from Cal-2026 to Cal-2030', () => {
    expect(FORWARD_YEARS.length).toBe(5);
    expect(FORWARD_YEARS.map(f => f.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(FORWARD_YEARS.map(f => f.tenor)).toEqual([
      'CAL_2026',
      'CAL_2027',
      'CAL_2028',
      'CAL_2029',
      'CAL_2030',
    ]);
  });

  it('generates complete forward curve book with TTF and environmental certificates', () => {
    const marks = createMockMarks();
    const book = generateForwardCurves(marks);

    expect(book.timestamp).toBeDefined();
    expect(book.ttfGasCurve).toBeDefined();
    expect(book.curves.DE_THG).toBeDefined();
    expect(book.curves.NL_ERE).toBeDefined();
    expect(book.curves.FR_CPB).toBeDefined();
    expect(book.curves.UK_RTFO).toBeDefined();
    expect(book.curves.FUELEU).toBeDefined();
    expect(book.curves.GO_DE).toBeDefined();

    // Verify tenors on TTF curve
    const ttf = book.ttfGasCurve;
    expect(ttf.tenors.CAL_2026.mid).toBe(38.5);
    expect(ttf.tenors.CAL_2027.mid).toBeLessThan(ttf.tenors.CAL_2026.mid); // backwardation
    expect(ttf.slope).toBe('BACKWARDATION');
    expect(ttf.tenorList.length).toBe(5);
  });

  it('enforces statutory RED III transport quota step-up escalators for German THG', () => {
    const marks = createMockMarks();
    const book = generateForwardCurves(marks);
    const thg = book.curves.DE_THG;

    // 2026 baseline -> 2030 step-up
    expect(thg.tenors.CAL_2026.statutoryObligationPct).toBe(12.0);
    expect(thg.tenors.CAL_2027.statutoryObligationPct).toBe(14.5);
    expect(thg.tenors.CAL_2028.statutoryObligationPct).toBe(17.5);
    expect(thg.tenors.CAL_2029.statutoryObligationPct).toBe(21.0);
    expect(thg.tenors.CAL_2030.statutoryObligationPct).toBe(25.0);

    // Certificate price escalates as quota tightens
    expect(thg.tenors.CAL_2030.mid).toBeGreaterThan(thg.tenors.CAL_2026.mid);
    expect(thg.slope).toBe('CONTANGO');
  });

  it('calculates seasonal Summer/Winter spreads accurately', () => {
    const marks = createMockMarks();
    const book = generateForwardCurves(marks);
    const ttf = book.ttfGasCurve;

    const cal26 = ttf.tenors.CAL_2026;
    expect(cal26.winterPrice).toBeGreaterThan(cal26.summerPrice);
    const spread = calculateSeasonalSpread(cal26.winterPrice, cal26.summerPrice);
    expect(spread).toBeCloseTo(4.3, 1); // +2.5 - (-1.8) = 4.3
  });

  it('respects statutory ceiling on French CPB forward curve', () => {
    // Extreme prompt test: prompt already at 95 EUR/MWh
    const curve = buildForwardCurve('FR_CPB', 95.0);
    // 2030 step-up without cap would be 95 * 1.22 = 115.9, must be capped at 100
    expect(curve.tenors.CAL_2030.mid).toBe(100.0);
  });

  it('maps arbitrary delivery years and labels to tenors', () => {
    expect(getTenorByYear(2026)).toBe('CAL_2026');
    expect(getTenorByYear(2027)).toBe('CAL_2027');
    expect(getTenorByYear(2030)).toBe('CAL_2030');
    expect(getTenorByYear('Cal-2028')).toBe('CAL_2028');
    expect(getTenorByYear('2029-Q4')).toBe('CAL_2029');
  });

  it('retrieves quotes via getForwardQuote helper', () => {
    const marks = createMockMarks();
    const book = generateForwardCurves(marks);

    const quote = getForwardQuote(book, 'NL_ERE', 'CAL_2028');
    expect(quote.year).toBe(2028);
    expect(quote.mid).toBeGreaterThan(18.5);
    expect(quote.statutoryObligationPct).toBe(33.0);
  });
});
