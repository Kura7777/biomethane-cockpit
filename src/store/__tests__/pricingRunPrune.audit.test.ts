import { describe, it, expect } from 'vitest';
import { appReducer, AppState } from '../context';
import { createEmptyDeskState } from '../../domain/__tests__/empty_desk_audit.test';
import { INITIAL_PRICING_BOOK, PricingBookEntry } from '../../domain/markets/brokerRun.seed';

function row(id: string, vintage: string, over: Partial<PricingBookEntry> = {}): PricingBookEntry {
  return {
    id,
    country: 'UK',
    class: 'RTFO',
    productClass: 'BUNDLED_COMPLIANCE',
    feedstock: 'Waste',
    vintage,
    certified: '—',
    subsidized: '—',
    ciScore: '',
    ciNumeric: null,
    currency: 'GBP',
    bidPrice: '0.20',
    offerPrice: '0.22',
    bidPriceNumeric: 0.2,
    offerPriceNumeric: 0.22,
    bidVolume: '',
    offerVolume: '',
    bidVolumeGWh: null,
    offerVolumeGWh: null,
    provenanceTier: 'BROKER_RUN',
    observedAt: '2026-10-01',
    isTradeable: true,
    ...over,
  } as PricingBookEntry;
}

const meta = (d: string) => ({ runId: `run-${d}`, broker: 'Broker', receivedOn: d, receivedOnIsApproximate: false });

function start(rows: PricingBookEntry[]): AppState {
  return { ...createEmptyDeskState(), pricingBook: rows, referenceRowIds: {} };
}

describe('ADD_PRICING_RUN prune (audit B item 5)', () => {
  it('keeps other tenors and hand-edited rows when a new tenor is pasted', () => {
    const s0 = start([
      row('paste_a2026', '2026'),
      row('paste_a2027', '2027', { editedAt: '2026-10-02T10:00:00Z', source: 'Desk · manual' }),
    ]);
    const s1 = appReducer(s0, { type: 'ADD_PRICING_RUN', rows: [row('paste_b2028', '2028')], runMeta: meta('2026-10-05') });
    const ids = s1.pricingBook.map(r => r.id);
    expect(ids).toEqual(expect.arrayContaining(['paste_a2026', 'paste_a2027', 'paste_b2028']));
  });

  it('replaces an unedited earlier paste of the same market + vintage + feedstock', () => {
    const s0 = start([row('paste_old', '2026'), row('paste_other_feed', '2026', { feedstock: 'Crop' })]);
    const s1 = appReducer(s0, { type: 'ADD_PRICING_RUN', rows: [row('paste_new', '2026')], runMeta: meta('2026-10-05') });
    const ids = s1.pricingBook.map(r => r.id);
    expect(ids).not.toContain('paste_old');
    expect(ids).toContain('paste_other_feed');
    expect(ids).toContain('paste_new');
  });

  it('never replaces a hand-edited row even for the same market + vintage', () => {
    const s0 = start([row('paste_old', '2026', { editedAt: '2026-10-02T10:00:00Z' })]);
    const s1 = appReducer(s0, { type: 'ADD_PRICING_RUN', rows: [row('paste_new', '2026')], runMeta: meta('2026-10-05') });
    expect(s1.pricingBook.map(r => r.id)).toEqual(expect.arrayContaining(['paste_old', 'paste_new']));
  });

  it('a multi-tenor paste keeps all of its rows', () => {
    const s1 = appReducer(start([]), {
      type: 'ADD_PRICING_RUN',
      rows: [row('paste_1', '2026'), row('paste_2', '2027'), row('paste_3', '2028')],
      runMeta: meta('2026-10-05'),
    });
    expect(s1.pricingBook).toHaveLength(3);
  });

  it('removes a seed row only when a paste supersedes the same market + tenor, and not when edited', () => {
    const seed = INITIAL_PRICING_BOOK.find(r => r.id === 'uk_rtfo')!;
    expect(seed).toBeDefined();
    const other = appReducer(start([seed]), { type: 'ADD_PRICING_RUN', rows: [row('paste_x', '2031')], runMeta: meta('2026-10-05') });
    expect(other.pricingBook.map(r => r.id)).toContain('uk_rtfo');

    const same = appReducer(start([seed]), { type: 'ADD_PRICING_RUN', rows: [row('paste_y', seed.vintage)], runMeta: meta('2026-10-05') });
    expect(same.pricingBook.map(r => r.id)).not.toContain('uk_rtfo');

    const edited = appReducer(start([{ ...seed, editedAt: '2026-10-02T10:00:00Z' }]), {
      type: 'ADD_PRICING_RUN',
      rows: [row('paste_z', seed.vintage)],
      runMeta: meta('2026-10-05'),
    });
    expect(edited.pricingBook.map(r => r.id)).toContain('uk_rtfo');
  });

  it('does not leave a reference id pointing at a pruned row', () => {
    const s0 = { ...start([row('paste_old', '2026')]), referenceRowIds: { UK_RTFO: 'paste_old' } };
    const s1 = appReducer(s0, { type: 'ADD_PRICING_RUN', rows: [row('paste_new', '2026', { observedAt: '2026-08-01' })], runMeta: meta('2026-08-01') });
    const ref = s1.referenceRowIds.UK_RTFO;
    if (ref) expect(s1.pricingBook.map(r => r.id)).toContain(ref);
  });
});

describe('ADD_PRICING_RUN prune - older runs', () => {
  it('an older paste never removes a newer row of the same market + vintage', () => {
    const s0 = start([row('paste_new', '2026', { observedAt: '2026-10-05' })]);
    const s1 = appReducer(s0, {
      type: 'ADD_PRICING_RUN',
      rows: [row('paste_old', '2026', { observedAt: '2026-08-01' })],
      runMeta: meta('2026-08-01'),
    });
    expect(s1.pricingBook.map(r => r.id)).toEqual(expect.arrayContaining(['paste_new', 'paste_old']));
  });
});
