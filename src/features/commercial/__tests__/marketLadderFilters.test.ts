import { describe, it, expect } from 'vitest';
import { filterLadderRows } from '../MarketLadder';
import type { MarketLadderRow } from '../../../domain/arbitrage/marketLadder';

function row(overrides: Partial<MarketLadderRow>): MarketLadderRow {
  return {
    marketId: 'DE_THG',
    marketName: 'DE THG',
    country: 'DE',
    legalBasis: 'test',
    unitLabel: 'EUR/MWh',
    verdict: 'ELIGIBLE',
    eligibilitySummary: '',
    gates: [],
    netNetback: 10,
    deskMarginEurPerMwh: 10,
    marginPercent: 10,
    rank: 1,
    isModelled: false,
    provenance: null,
    markUpdatedAt: new Date().toISOString(),
    held: null,
    sourceProvenance: null,
    sideRequested: 'MID',
    sideUsed: 'MID',
    isChosen: false,
    missingInputs: [],
    ...overrides,
  } as MarketLadderRow;
}

const noFilters = { bookFilter: 'ALL' as const, tradeableOnly: false, hideStale: false, minMargin: '' };

describe('filterLadderRows', () => {
  it('keeps every row when no filters are set', () => {
    const rows = [row({ marketId: 'DE_THG' }), row({ marketId: 'UK_RGGO' })];
    expect(filterLadderRows(rows, noFilters)).toHaveLength(2);
  });

  it('book filter: COMPLIANCE drops voluntary markets, VOLUNTARY drops compliance markets', () => {
    const rows = [row({ marketId: 'DE_THG' }), row({ marketId: 'UK_RGGO' })]; // UK_RGGO is voluntary
    expect(filterLadderRows(rows, { ...noFilters, bookFilter: 'COMPLIANCE' }).map(r => r.marketId)).toEqual(['DE_THG']);
    expect(filterLadderRows(rows, { ...noFilters, bookFilter: 'VOLUNTARY' }).map(r => r.marketId)).toEqual(['UK_RGGO']);
  });

  it('tradeable only drops rows whose verdict is not ELIGIBLE', () => {
    const rows = [row({ marketId: 'A', verdict: 'ELIGIBLE' }), row({ marketId: 'B', verdict: 'CONDITIONAL' }), row({ marketId: 'C', verdict: 'HARD_BLOCK' })];
    expect(filterLadderRows(rows, { ...noFilters, tradeableOnly: true }).map(r => r.marketId)).toEqual(['A']);
  });

  it('hides marks older than 30 days when hideStale is set', () => {
    const fresh = row({ marketId: 'FRESH', markUpdatedAt: new Date().toISOString() });
    const old = row({ marketId: 'OLD', markUpdatedAt: new Date(Date.now() - 45 * 86400000).toISOString() });
    const result = filterLadderRows([fresh, old], { ...noFilters, hideStale: true });
    expect(result.map(r => r.marketId)).toEqual(['FRESH']);
  });

  it('minimum margin filters on the desk margin in EUR/MWh', () => {
    const rows = [row({ marketId: 'LOW', deskMarginEurPerMwh: 2 }), row({ marketId: 'HIGH', deskMarginEurPerMwh: 20 })];
    expect(filterLadderRows(rows, { ...noFilters, minMargin: '10' }).map(r => r.marketId)).toEqual(['HIGH']);
  });

  it('always keeps the chosen route even if it would otherwise be filtered out', () => {
    const chosen = row({ marketId: 'CHOSEN', isChosen: true, deskMarginEurPerMwh: -5 });
    const other = row({ marketId: 'OTHER', deskMarginEurPerMwh: -5 });
    const result = filterLadderRows([chosen, other], { ...noFilters, minMargin: '10' });
    expect(result.map(r => r.marketId)).toEqual(['CHOSEN']);
  });
});
