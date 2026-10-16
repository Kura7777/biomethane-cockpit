import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { appReducer, migrateState, CURRENT_SCHEMA_VERSION } from '../context';
import {
  getInitialState,
  STORAGE_KEY,
  FUTURE_VERSION_BACKUP_PREFIX,
  takePendingLoadWarnings,
} from '../persistence';
import { createDefaultState } from '../state';
import { INITIAL_PRICING_BOOK } from '../../domain/markets/brokerRun.seed';

function installStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const stub = {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  (globalThis as { localStorage?: unknown }).localStorage = stub;
  return data;
}

describe('persistence and migrations (audit B item 7)', () => {
  let previous: unknown;
  beforeEach(() => {
    previous = (globalThis as { localStorage?: unknown }).localStorage;
    takePendingLoadWarnings();
  });
  afterEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = previous;
  });

  it('a stored schemaVersion newer than the app is backed up and warned about, not silently lost', () => {
    const future = { ...createDefaultState(), schemaVersion: CURRENT_SCHEMA_VERSION + 5, futureField: { keep: 'me' } };
    const raw = JSON.stringify(future);
    const data = installStorage({ [STORAGE_KEY]: raw });

    const state = getInitialState();

    expect(data.get(`${FUTURE_VERSION_BACKUP_PREFIX}${STORAGE_KEY}`)).toBe(raw);
    expect(data.get(STORAGE_KEY)).toBe(raw); // original blob untouched by loading
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const warnings = takePendingLoadWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/newer version/i);
    expect(takePendingLoadWarnings()).toHaveLength(0); // one-time
  });

  it('a current-version blob raises no warning and no backup', () => {
    const data = installStorage({ [STORAGE_KEY]: JSON.stringify(createDefaultState()) });
    getInitialState();
    expect(takePendingLoadWarnings()).toHaveLength(0);
    expect([...data.keys()].some(k => k.startsWith(FUTURE_VERSION_BACKUP_PREFIX))).toBe(false);
  });

  it('repairs a current-version state with pricingBook missing so ADD_PRICING_RUN cannot throw', () => {
    for (const bad of [undefined, null, 'oops']) {
      const broken: Record<string, unknown> = { ...createDefaultState(), pricingBook: bad };
      if (bad === undefined) delete broken.pricingBook;
      delete broken.referenceRowIds;
      delete broken.savedAssessments;
      const state = migrateState(broken);
      expect(Array.isArray(state.pricingBook)).toBe(true);
      expect(state.pricingBook.length).toBe(INITIAL_PRICING_BOOK.length);
      expect(state.referenceRowIds).toEqual({});
      expect(state.savedAssessments).toEqual([]);
      expect(() =>
        appReducer(state, {
          type: 'ADD_PRICING_RUN',
          rows: [],
          runMeta: { runId: 'r', broker: 'b', receivedOn: '2026-10-01', receivedOnIsApproximate: false },
        })
      ).not.toThrow();
    }
  });

  it('repairs missing marks sub-objects at the current version', () => {
    const broken = createDefaultState() as unknown as Record<string, any>;
    broken.marks = { marks: broken.marks.marks };
    const state = migrateState(broken);
    expect(state.marks.gasIndex).toBeDefined();
    expect(state.marks.fx).toBeDefined();
    expect(state.marks.pricingSides).toBeDefined();
  });

  it('migrateState does not mutate its input', () => {
    // An old (v11) shape exercises the v12/v14/v15 branches that assign into nested objects.
    const old = JSON.parse(JSON.stringify(createDefaultState())) as Record<string, any>;
    old.schemaVersion = 11;
    delete old.costsSource;
    delete old.marks.marks.NL_GGE;
    old.pricingBook = old.pricingBook.filter((r: { id: string }) => r.id !== 'nl_gge');
    old.costs.deliveredCost = 12;
    old.consignments = [];
    const snapshot = JSON.stringify(old);

    const migrated = migrateState(old);

    expect(JSON.stringify(old)).toBe(snapshot);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.marks.marks.NL_GGE).toBeDefined();
    expect(migrated).not.toBe(old);
    expect(migrated.marks.marks).not.toBe(old.marks.marks);
  });
});
