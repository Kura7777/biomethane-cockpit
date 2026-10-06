import { describe, it, expect } from 'vitest';
import { appReducer, migrateState, createDefaultState } from '../../../store/context';
import { REFERENCE_CONSIGNMENTS } from '../../../domain/consignment/feedstocks';
import { TradeAssessment } from '../../../domain/trade/types';
import { buildDealUrl, parseDealParams } from '../../../domain/trade/dealParams';
import { getMarketById } from '../../../domain/markets/registry';
import { computeNetback } from '../../../domain/netback/engine';
import { simulateDesk } from '../../../domain/marks/simulate';

/**
 * Phase 6: the deal blotter. These pin the three things that must never silently
 * break — a saved deal's status history, old data migrating without loss, and the
 * "Open" round trip that rebuilds the Trade Builder link.
 */

function makeAssessment(overrides: Partial<TradeAssessment> = {}): TradeAssessment {
  const market = getMarketById('DE_THG')!;
  const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  const { marks, costs } = simulateDesk();
  const netback = computeNetback(market, consignment, marks, costs);
  return {
    id: 'DEAL-2026-DK-TEST',
    createdAt: '2026-10-01T00:00:00.000Z',
    consignment,
    targetMarketId: market.id,
    targetMarketName: market.name,
    eligibility: { overallVerdict: 'ELIGIBLE', gates: [] } as any,
    netback,
    marks,
    costs,
    userNotes: '',
    ...overrides,
  };
}

describe('deal blotter — status reducer', () => {
  it('SET_ASSESSMENT_STATUS appends to history and updates status', () => {
    const state = { ...createDefaultState(), savedAssessments: [makeAssessment()] };
    const next = appReducer(state, { type: 'SET_ASSESSMENT_STATUS', id: 'DEAL-2026-DK-TEST', status: 'QUOTED', note: 'sent to counterparty' });
    const deal = next.savedAssessments[0];
    expect(deal.status).toBe('QUOTED');
    expect(deal.statusHistory).toHaveLength(1);
    expect(deal.statusHistory![0]).toMatchObject({ status: 'QUOTED', note: 'sent to counterparty' });
  });

  it('a second status transition appends rather than replacing history', () => {
    let state = { ...createDefaultState(), savedAssessments: [makeAssessment({ status: 'QUOTED', statusHistory: [{ status: 'QUOTED', at: '2026-10-01T00:00:00.000Z' }] })] };
    state = appReducer(state, { type: 'SET_ASSESSMENT_STATUS', id: 'DEAL-2026-DK-TEST', status: 'AGREED' });
    expect(state.savedAssessments[0].statusHistory).toHaveLength(2);
    expect(state.savedAssessments[0].status).toBe('AGREED');
  });

  it('UPDATE_ASSESSMENT_NOTES updates only the matching deal', () => {
    const state = { ...createDefaultState(), savedAssessments: [makeAssessment(), makeAssessment({ id: 'OTHER' })] };
    const next = appReducer(state, { type: 'UPDATE_ASSESSMENT_NOTES', id: 'DEAL-2026-DK-TEST', notes: 'call back Thursday' });
    expect(next.savedAssessments.find(a => a.id === 'DEAL-2026-DK-TEST')!.userNotes).toBe('call back Thursday');
    expect(next.savedAssessments.find(a => a.id === 'OTHER')!.userNotes).toBe('');
  });
});

describe('deal blotter — migration', () => {
  it('an old saved deal without a status loads as INDICATIVE', () => {
    const legacyAssessment = makeAssessment();
    delete (legacyAssessment as any).status;
    delete (legacyAssessment as any).statusHistory;

    const raw = { ...createDefaultState(), schemaVersion: 12, savedAssessments: [legacyAssessment] };
    const migrated = migrateState(raw);

    expect(migrated.savedAssessments[0].status).toBe('INDICATIVE');
    expect(migrated.savedAssessments[0].statusHistory).toHaveLength(1);
    expect(migrated.savedAssessments[0].statusHistory![0].status).toBe('INDICATIVE');
  });

  it('a deal that already has a status is left alone by migration', () => {
    const assessment = makeAssessment({ status: 'TRANSFERRED', statusHistory: [{ status: 'TRANSFERRED', at: '2026-09-01T00:00:00.000Z' }] });
    const raw = { ...createDefaultState(), schemaVersion: 12, savedAssessments: [assessment] };
    const migrated = migrateState(raw);
    expect(migrated.savedAssessments[0].status).toBe('TRANSFERRED');
    expect(migrated.savedAssessments[0].statusHistory).toHaveLength(1);
  });
});

describe('deal blotter — Open round trip', () => {
  it('rebuilds a link that parseDealParams turns back into the same market, origin, feedstock and volume', () => {
    const assessment = makeAssessment();
    const c = assessment.consignment;
    const url = buildDealUrl({
      marketId: assessment.targetMarketId,
      originCountry: c.originCountry,
      feedstock: c.feedstock,
      ci: c.carbonIntensity,
      volume: c.volumeMWh ?? undefined,
      scheme: c.certificationScheme,
      coc: c.chainOfCustody,
      udb: c.udbStatus,
      pos: c.posStatus,
    });
    const parsed = parseDealParams(new URLSearchParams(url.slice(url.indexOf('?') + 1)));
    expect(parsed.marketId).toBe(assessment.targetMarketId);
    expect(parsed.originCountry).toBe(c.originCountry);
    expect(parsed.feedstock).toBe(c.feedstock);
    expect(parsed.volume).toBe(c.volumeMWh);
  });
});

describe('deal blotter — re-price does not touch the saved snapshot', () => {
  it('recomputing today\'s netback never mutates the stored assessment', () => {
    const assessment = makeAssessment();
    const savedNetback = assessment.netback;
    const market = getMarketById(assessment.targetMarketId)!;
    const { marks, costs } = simulateDesk(new Date('2027-01-01'));
    const repriced = computeNetback(market, assessment.consignment, marks, costs);

    // A different clock gives a different snapshot, but the original object is untouched.
    expect(assessment.netback).toBe(savedNetback);
    expect(repriced).not.toBe(savedNetback);
  });
});
