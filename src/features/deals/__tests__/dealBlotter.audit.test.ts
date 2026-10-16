import { describe, it, expect } from 'vitest';
import { appReducer, migrateState, createDefaultState } from '../../../store/context';
import { canTransition, isCommittedDeal, isDeleteConfirmed } from '../../../store/dealGuards';
import { REFERENCE_CONSIGNMENTS } from '../../../domain/consignment/feedstocks';
import { TradeAssessment } from '../../../domain/trade/types';
import { getMarketById } from '../../../domain/markets/registry';
import { computeNetback } from '../../../domain/netback/engine';
import { simulateDesk } from '../../../domain/marks/simulate';
import { buildCsv } from '../../../domain/companies/csv';
import { getSaveIndicator } from '../../../app/saveStatus';

function deal(id: string, status?: TradeAssessment['status']): TradeAssessment {
  const market = getMarketById('DE_THG')!;
  const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  const { marks, costs } = simulateDesk();
  return {
    id,
    createdAt: '2026-10-01T00:00:00.000Z',
    consignment,
    targetMarketId: market.id,
    targetMarketName: market.name,
    eligibility: { overallVerdict: 'ELIGIBLE', gates: [] } as never,
    netback: computeNetback(market, consignment, marks, costs),
    marks,
    costs,
    userNotes: '',
    status,
  };
}

const withDeals = (...d: TradeAssessment[]) => ({ ...createDefaultState(), savedAssessments: d });

describe('blotter delete guard', () => {
  it('deletes an indicative deal without typed confirmation', () => {
    const next = appReducer(withDeals(deal('A')), { type: 'DELETE_ASSESSMENT', id: 'A' });
    expect(next.savedAssessments).toHaveLength(0);
  });

  it('refuses to delete an AGREED or TRANSFERRED deal unless confirmed', () => {
    for (const status of ['AGREED', 'TRANSFERRED'] as const) {
      const state = withDeals(deal('A', status));
      expect(isCommittedDeal(state.savedAssessments[0])).toBe(true);
      expect(appReducer(state, { type: 'DELETE_ASSESSMENT', id: 'A' }).savedAssessments).toHaveLength(1);
      expect(appReducer(state, { type: 'DELETE_ASSESSMENT', id: 'A', confirmed: true }).savedAssessments).toHaveLength(0);
    }
  });

  it('accepts the typed word case-insensitively and rejects anything else', () => {
    expect(isDeleteConfirmed('delete')).toBe(true);
    expect(isDeleteConfirmed(' DELETE ')).toBe(true);
    expect(isDeleteConfirmed('del')).toBe(false);
    expect(isDeleteConfirmed('')).toBe(false);
  });

  it('allows no status after TRANSFERRED', () => {
    expect(canTransition('TRANSFERRED', 'INDICATIVE')).toBe(false);
    expect(canTransition('TRANSFERRED', 'DEAD')).toBe(false);
    expect(canTransition('AGREED', 'DEAD')).toBe(true);
    const state = withDeals(deal('A', 'TRANSFERRED'));
    const next = appReducer(state, { type: 'SET_ASSESSMENT_STATUS', id: 'A', status: 'QUOTED' });
    expect(next.savedAssessments[0].status).toBe('TRANSFERRED');
  });
});

describe('compliance sign-off persistence', () => {
  const at = '2026-10-16T09:00:00.000Z';

  it('stores the sign-off against a saved deal and survives a JSON + migration round trip', () => {
    const state = withDeals(deal('A'));
    const next = appReducer(state, { type: 'SET_COMPLIANCE_SIGNOFF', id: 'A', by: 'Desk user', at });
    expect(next.dealSignoffs.A).toEqual({ by: 'Desk user', at });
    const reloaded = migrateState(JSON.parse(JSON.stringify(next)));
    expect(reloaded.dealSignoffs.A).toEqual({ by: 'Desk user', at });
  });

  it('ignores a sign-off for a deal that is not on the blotter', () => {
    const state = withDeals(deal('A'));
    expect(appReducer(state, { type: 'SET_COMPLIANCE_SIGNOFF', id: 'NOPE', by: 'x', at })).toBe(state);
  });

  it('drops the sign-off when the deal is deleted', () => {
    const signed = appReducer(withDeals(deal('A')), { type: 'SET_COMPLIANCE_SIGNOFF', id: 'A', by: 'x', at });
    expect(appReducer(signed, { type: 'DELETE_ASSESSMENT', id: 'A' }).dealSignoffs.A).toBeUndefined();
  });

  it('migrating a state saved before sign-offs existed gives an empty map', () => {
    const old = JSON.parse(JSON.stringify(createDefaultState()));
    delete old.dealSignoffs;
    expect(migrateState(old).dealSignoffs).toEqual({});
  });
});

describe('blotter export and save status', () => {
  it('CSV export neutralises formula-looking text and quotes commas', () => {
    const csv = buildCsv(['Notes'], [['=HYPERLINK("x")'], ['a, b'], ['#tag']]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"a, b"');
    expect(csv).toContain('#tag');
  });

  it('the save indicator turns red when the last save failed', () => {
    expect(getSaveIndicator(false, false).label).toBe('Auto-saved');
    expect(getSaveIndicator(true, false).label).toBe('Saving...');
    const failed = getSaveIndicator(false, true);
    expect(failed.label).toMatch(/NOT SAVED/);
    expect(failed.color).toBe('#ef4444');
  });
});
