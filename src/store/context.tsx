import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import { Consignment } from '../domain/consignment/types';
import { MarksState, CostInputs, PricingSides } from '../domain/netback/types';
import { TradeAssessment } from '../domain/trade/types';
import { PriceSide, MarkEntry, MarkProvenance, getMarkStaleness } from '../domain/markets/types';
import { MARKETS } from '../domain/markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../domain/consignment/feedstocks';
import { simulateDesk } from '../domain/marks/simulate';
import {
  PricingBookEntry,
  BrokerRunMeta,
  INITIAL_PRICING_BOOK,
  BASELINE_RUN_META,
} from '../domain/markets/brokerRun.seed';
import {
  applyMarkUpdates,
  seedMarksFromPricingBook,
  isSimulatedMark,
  rowFeedsMarket,
  rowHasPrice,
  resolveMarketForQuote,
  createMarkUpdateFromRow,
  MarkUpdate,
} from '../domain/marks/applyMarks';

export const CURRENT_SCHEMA_VERSION = 10;
const STORAGE_KEY = 'biomethane-desk-state-v10';

// Newest first — the first key that yields a readable payload wins.
const KNOWN_STORAGE_KEYS = [
  STORAGE_KEY,
  'biomethane-desk-state-v9',
  'biomethane-desk-state-v8',
  'biomethane-desk-state-v7',
  'biomethane-desk-state-v6',
  'biomethane-desk-state-v5',
  'biomethane-desk-state-v4',
  'biomethane-desk-state-v3',
  'biomethane-desk-state-v2',
  'biomethane-desk-state',
];

// Unreadable payloads are copied here before defaults are written over them. Desk marks are
// hand-keyed and exist nowhere else, so a failed migration must never be the end of the data.
const QUARANTINE_KEY_PREFIX = 'biomethane-desk-state-unreadable:';

// State shape
export interface AppState {
  schemaVersion: number;
  marks: MarksState;
  pricingBook: PricingBookEntry[];
  pricingRunMeta: BrokerRunMeta;
  referenceRowIds: Record<string, string>;
  consignments: Consignment[];
  activeConsignmentId: string | null;
  costs: CostInputs;
  savedAssessments: TradeAssessment[];
  selectedMarketId: string | null;
}

// Actions
export type AppAction =
  | { type: 'SET_MARK'; marketId: string; bid: number | null; offer: number | null; mid: number | null; source?: string | null; updatedAt?: string | null; provenance?: MarkProvenance | null }
  | { type: 'SET_GAS_INDEX'; bid: number | null; offer: number | null; mid: number | null; updatedAt?: string | null; provenance?: MarkProvenance | null }
  | { type: 'SET_FX'; currency: 'gbpEur' | 'chfEur'; value: number | null; updatedAt?: string | null; provenance?: MarkProvenance | null }
  | { type: 'SET_PRICING_SIDE'; side: PriceSide }
  | { type: 'SET_PRICING_SIDES'; sides: Partial<PricingSides> }
  | { type: 'ADD_CONSIGNMENT'; consignment: Consignment }
  | { type: 'UPDATE_CONSIGNMENT'; consignment: Consignment }
  | { type: 'SET_ACTIVE_CONSIGNMENT'; id: string | null }
  | { type: 'SET_COSTS'; costs: Partial<CostInputs> }
  | { type: 'SAVE_ASSESSMENT'; assessment: TradeAssessment }
  | { type: 'DELETE_ASSESSMENT'; id: string }
  | { type: 'SELECT_MARKET'; id: string | null }
  | { type: 'IMPORT_STATE'; state: AppState }
  | { type: 'SIMULATE_DESK' }
  | { type: 'RESET' }
  | { type: 'UPDATE_PRICING_BOOK_CELL'; id: string; field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume'; value: string }
  | { type: 'SET_PRICING_RUN_DATE'; runId: string; receivedOn: string }
  | { type: 'SET_MARKET_REFERENCE_ROW'; marketId: string; rowId: string }
  | { type: 'ADD_PRICING_RUN'; runMeta: BrokerRunMeta; rows: PricingBookEntry[] };

interface RawLegacyMarks {
  marks?: Record<string, {
    bid?: number | null;
    offer?: number | null;
    mid?: number | null;
    updatedAt?: string | null;
    timestamp?: string | null;
    source?: string | null;
    sourceNote?: string | null;
  }>;
  gasIndex?: {
    bid?: number | null;
    offer?: number | null;
    mid?: number | null;
    updatedAt?: string | null;
  };
  fx?: {
    gbpEur?: number | null;
    chfEur?: number | null;
    updatedAt?: string | null;
  };
  pricingSide?: PriceSide;
}

interface RawStateShape {
  schemaVersion?: number;
  marks?: RawLegacyMarks;
  costs?: Partial<AppState['costs']>;
  consignments?: Consignment[];
  activeConsignmentId?: string;
  savedAssessments?: AppState['savedAssessments'];
  selectedMarketId?: string | null;
}

/**
 * Migration function to upgrade legacy state shapes safely without data loss
 */
export function migrateState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') {
    return createDefaultState();
  }

  const rawRecord = raw as RawStateShape;
  const stateVersion = rawRecord.schemaVersion || 1;
  let migrated: AppState = { ...(raw as AppState) };

  if (stateVersion < 2) {
    // Migrate marks shape to include updatedAt and source
    const rawMarks = rawRecord.marks?.marks || {};
    const updatedMarks: Record<string, MarkEntry> = {};

    MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
      const existing = rawMarks[m.id];
      if (existing) {
        updatedMarks[m.id] = {
          marketId: m.id,
          bid: existing.bid ?? null,
          offer: existing.offer ?? null,
          mid: existing.mid ?? null,
          updatedAt: existing.updatedAt || existing.timestamp || null,
          source: existing.source || existing.sourceNote || 'Imported mark',
        };
      } else {
        updatedMarks[m.id] = {
          marketId: m.id,
          bid: null,
          offer: null,
          mid: null,
          updatedAt: null,
          source: null,
        };
      }
    });

    migrated.marks = {
      marks: updatedMarks,
      gasIndex: {
        bid: rawRecord.marks?.gasIndex?.bid ?? null,
        offer: rawRecord.marks?.gasIndex?.offer ?? null,
        mid: rawRecord.marks?.gasIndex?.mid ?? null,
        updatedAt: rawRecord.marks?.gasIndex?.updatedAt ?? null,
      },
      fx: {
        gbpEur: rawRecord.marks?.fx?.gbpEur ?? null,
        chfEur: rawRecord.marks?.fx?.chfEur ?? null,
        updatedAt: rawRecord.marks?.fx?.updatedAt ?? null,
      },
      pricingSides: {
        certificateSide: rawRecord.marks?.pricingSide ?? 'bid',
        moleculeSide: rawRecord.marks?.pricingSide ?? 'bid',
      },
    };
  }

  if (stateVersion < 4) {
    // Schema v4 migration: existing state gets producerPricing = null, flagged incomplete
    if (!migrated.costs) {
      migrated.costs = {
        transferCosts: null,
        certificationCosts: null,
        logistics: null,
        otherCosts: null,
        producerPricing: null,
      };
    } else {
      migrated.costs = {
        ...migrated.costs,
        producerPricing: null,
      };
    }
  }

  if (stateVersion < 5) {
    // Schema v5 migration: existing marks get provenance with all fields null, observedAt seeded from existing updatedAt
    const rawMarks = migrated.marks?.marks || {};
    const updatedMarks: Record<string, MarkEntry> = {};

    MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
      const existing = rawMarks[m.id];
      if (existing) {
        updatedMarks[m.id] = {
          ...existing,
          marketId: m.id,
          provenance: existing.provenance ?? {
            sourceType: null,
            sourceName: null,
            sourceUrl: null,
            observedAt: existing.updatedAt ?? null,
            note: null,
          },
        };
      } else {
        updatedMarks[m.id] = {
          marketId: m.id,
          bid: null,
          offer: null,
          mid: null,
          updatedAt: null,
          source: null,
          provenance: {
            sourceType: null,
            sourceName: null,
            sourceUrl: null,
            observedAt: null,
            note: null,
          },
        };
      }
    });

    migrated.marks = {
      ...migrated.marks,
      marks: updatedMarks,
      gasIndex: {
        ...migrated.marks?.gasIndex,
        bid: migrated.marks?.gasIndex?.bid ?? null,
        offer: migrated.marks?.gasIndex?.offer ?? null,
        mid: migrated.marks?.gasIndex?.mid ?? null,
        updatedAt: migrated.marks?.gasIndex?.updatedAt ?? null,
        provenance: migrated.marks?.gasIndex?.provenance ?? {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: migrated.marks?.gasIndex?.updatedAt ?? null,
          note: null,
        },
      },
      fx: {
        ...migrated.marks?.fx,
        gbpEur: migrated.marks?.fx?.gbpEur ?? null,
        chfEur: migrated.marks?.fx?.chfEur ?? null,
        updatedAt: migrated.marks?.fx?.updatedAt ?? null,
        provenance: migrated.marks?.fx?.provenance ?? {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: migrated.marks?.fx?.updatedAt ?? null,
          note: null,
        },
      },
    };
  }

  if (stateVersion < 6) {
    // Schema v6 migration: existing consignments get deliveryPeriod with all fields null
    migrated.consignments = (migrated.consignments || []).map(c => ({
      ...c,
      deliveryPeriod: c.deliveryPeriod ?? {
        type: null,
        startDate: null,
        endDate: null,
        complianceYear: null,
      },
    }));
  }

  if (stateVersion < 7) {
    // Schema v7 migration: existing consignments get counterparty: null
    migrated.consignments = (migrated.consignments || []).map(c => ({
      ...c,
      counterparty: c.counterparty ?? null,
    }));
  }

  if (stateVersion < 8 && migrated.marks) {
    // Schema v8 migration: the scalar marks.pricingSide is retired in favour of the
    // per-leg pair, which is now the only stored source of truth. An existing scalar
    // meant "both legs at this side", so it maps across without loss. Any pair the
    // user had already set wins, since the scalar could never express it.
    const legacyScalar = (migrated.marks as { pricingSide?: PriceSide }).pricingSide ?? 'bid';
    migrated.marks = {
      ...migrated.marks,
      pricingSides: migrated.marks.pricingSides ?? {
        certificateSide: legacyScalar,
        moleculeSide: legacyScalar,
      },
    };
    delete (migrated.marks as { pricingSide?: PriceSide }).pricingSide;
  }

  if (stateVersion < 8 && migrated.costs) {
    // Schema v8 migration: costs.deliveredCost is retired. computeNetback never read
    // it — producer payment flows through producerPricing — yet two screens subtracted
    // it a second time on top of a netback that already nets the producer off.
    //
    // A stored value is only meaningful as a fixed producer price, and only when the
    // desk is actually on FIXED_PRICE with that price still unset. Overwriting a price
    // the user has already entered would be inventing a term of their contract, so in
    // every other case the value is dropped rather than guessed at.
    const legacyDelivered = (migrated.costs as { deliveredCost?: number | null }).deliveredCost ?? null;
    const pricing = migrated.costs.producerPricing ?? null;

    if (
      legacyDelivered !== null &&
      pricing?.mode === 'FIXED_PRICE' &&
      pricing.fixedPriceEurPerMwh === null
    ) {
      migrated.costs = {
        ...migrated.costs,
        producerPricing: { ...pricing, fixedPriceEurPerMwh: legacyDelivered },
      };
    }

    delete (migrated.costs as { deliveredCost?: number | null }).deliveredCost;
  }

  if (stateVersion < 9) {
    // Schema v9 migration: uncalibrated legacy indexLinkedShare (< 0.85) upgraded to institutional standard (0.970)
    if (
      migrated.costs?.producerPricing?.mode === 'INDEX_LINKED' &&
      (migrated.costs.producerPricing.indexLinkedShare === null ||
        (typeof migrated.costs.producerPricing.indexLinkedShare === 'number' &&
          migrated.costs.producerPricing.indexLinkedShare < 0.85))
    ) {
      migrated.costs = {
        ...migrated.costs,
        producerPricing: {
          ...migrated.costs.producerPricing,
          indexLinkedShare: 0.970,
        },
      };
    }
  }

  if (stateVersion < 10) {
    // Schema v10 migration: order book lives in store and seeds market marks
    if (!migrated.pricingBook || !Array.isArray(migrated.pricingBook) || migrated.pricingBook.length === 0) {
      migrated.pricingBook = INITIAL_PRICING_BOOK;
    }
    if (!migrated.pricingRunMeta) {
      migrated.pricingRunMeta = BASELINE_RUN_META;
    }
    if (!migrated.referenceRowIds) {
      migrated.referenceRowIds = {};
    }

    // Seed broker marks for markets with broker rows, respecting precedence rules
    // (any non-simulated manual marks the user had entered in prior sessions are preserved)
    const { nextMarks, referenceRowIds } = seedMarksFromPricingBook(
      migrated.marks,
      migrated.pricingBook,
      migrated.pricingRunMeta.receivedOn
    );
    migrated.marks = nextMarks;
    migrated.referenceRowIds = { ...referenceRowIds, ...(migrated.referenceRowIds || {}) };
  }

  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;

  // Ensure all active markets exist in marks dictionary
  if (migrated.marks && migrated.marks.marks) {
    MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
      if (!migrated.marks.marks[m.id]) {
        migrated.marks.marks[m.id] = {
          marketId: m.id,
          bid: null,
          offer: null,
          mid: null,
          updatedAt: null,
          source: null,
          provenance: {
            sourceType: null,
            sourceName: null,
            sourceUrl: null,
            observedAt: null,
            note: null,
          },
        };
      }
    });
  }

  // Ensure default reference consignments exist if list is empty
  if (!Array.isArray(migrated.consignments) || migrated.consignments.length === 0) {
    migrated.consignments = [
      REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE,
      REFERENCE_CONSIGNMENTS.ISCC_PLUS_VOLUNTARY,
    ];
    migrated.activeConsignmentId = REFERENCE_CONSIGNMENTS.DANISH_MANURE.id;
  }

  return migrated as AppState;
}

/**
 * The state a brand-new desk starts from.
 *
 * Marks and costs are seeded from simulateDesk() and then seeded with real
 * broker marks for markets that have broker indication rows in the master pricing book.
 */
export function createDefaultState(): AppState {
  const { marks: simMarks, costs } = simulateDesk();
  const pricingBook = INITIAL_PRICING_BOOK;
  const pricingRunMeta = BASELINE_RUN_META;
  const { nextMarks, referenceRowIds } = seedMarksFromPricingBook(simMarks, pricingBook, pricingRunMeta.receivedOn);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    marks: nextMarks,
    pricingBook,
    pricingRunMeta,
    referenceRowIds,
    consignments: [
      REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE,
      REFERENCE_CONSIGNMENTS.ISCC_PLUS_VOLUNTARY,
    ],
    activeConsignmentId: REFERENCE_CONSIGNMENTS.DANISH_MANURE.id,
    costs,
    savedAssessments: [],
    selectedMarketId: 'DE_THG',
  };
}

// Copies a payload we are about to overwrite somewhere recoverable. Best-effort: if even this
// write fails (quota, blocked storage) there is nothing further to be done but warn loudly.
function quarantineUnreadableState(key: string, raw: string): void {
  try {
    localStorage.setItem(`${QUARANTINE_KEY_PREFIX}${key}`, raw);
    console.warn(
      `Saved state under "${key}" could not be read. The raw payload has been preserved at ` +
      `"${QUARANTINE_KEY_PREFIX}${key}" — recover marks from there rather than re-keying them.`
    );
  } catch (e) {
    console.error(`Saved state under "${key}" could not be read AND could not be backed up. It will be overwritten.`, e);
  }
}

function getInitialState(): AppState {
  for (const key of KNOWN_STORAGE_KEYS) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(key);
    } catch (e) {
      // Storage itself is unavailable (private mode, blocked cookies). Nothing is at risk.
      console.warn('localStorage is unavailable; starting from defaults', e);
      return createDefaultState();
    }

    if (!stored) continue;

    try {
      const migrated = migrateState(JSON.parse(stored));
      if (key !== STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
      return migrated;
    } catch (e) {
      // Defaults are auto-saved over STORAGE_KEY ~300ms from now, so preserve this payload
      // first, then fall through to older keys — an earlier version may still be readable.
      quarantineUnreadableState(key, stored);
      console.warn(`Failed to migrate state from "${key}"; trying older keys`, e);
    }
  }

  return createDefaultState();
}

// Reducer
export function appReducer(state: AppState, action: AppAction): AppState {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'SET_MARK': {
      const nextMarks = applyMarkUpdates(state.marks, [{
        marketId: action.marketId,
        bid: action.bid,
        offer: action.offer,
        mid: action.mid,
        source: action.source ?? 'Desk · manual',
        updatedAt: action.updatedAt ?? now,
        provenance: action.provenance !== undefined ? action.provenance : {
          sourceType: 'BROKER_INDICATION',
          sourceName: action.source ?? 'Desk · manual',
          sourceUrl: null,
          observedAt: action.updatedAt ?? now,
          note: 'Desk override',
        },
      }]);
      return { ...state, marks: nextMarks };
    }
    case 'SET_GAS_INDEX': {
      const nextMarks = applyMarkUpdates(state.marks, [{
        marketId: 'GAS_TTF',
        bid: action.bid,
        offer: action.offer,
        mid: action.mid,
        updatedAt: action.updatedAt ?? now,
        provenance: action.provenance !== undefined ? action.provenance : {
          sourceType: 'BROKER_INDICATION',
          sourceName: 'Desk · manual',
          sourceUrl: null,
          observedAt: action.updatedAt ?? now,
          note: 'Desk TTF gas index override',
        },
      }]);
      return { ...state, marks: nextMarks };
    }
    case 'SET_FX': {
      const fxUpdatedAt = action.updatedAt ?? (action.value !== null ? now : null);
      return {
        ...state,
        marks: {
          ...state.marks,
          fx: {
            ...state.marks.fx,
            [action.currency]: action.value,
            updatedAt: fxUpdatedAt,
            provenance: action.provenance !== undefined ? action.provenance : (state.marks.fx.provenance ?? {
              sourceType: null,
              sourceName: null,
              sourceUrl: null,
              observedAt: fxUpdatedAt,
              note: null,
            }),
          },
        },
      };
    }
    case 'SET_PRICING_SIDE':
      return {
        ...state,
        marks: {
          ...state.marks,
          pricingSides: { certificateSide: action.side, moleculeSide: action.side },
        },
      };
    case 'SET_PRICING_SIDES': {
      const currentSides = state.marks.pricingSides;
      return {
        ...state,
        marks: {
          ...state.marks,
          pricingSides: {
            ...currentSides,
            ...action.sides,
          },
        },
      };
    }
    case 'ADD_CONSIGNMENT':
      return { ...state, consignments: [...state.consignments, action.consignment], activeConsignmentId: action.consignment.id };
    case 'UPDATE_CONSIGNMENT':
      return { ...state, consignments: state.consignments.map(c => c.id === action.consignment.id ? action.consignment : c) };
    case 'SET_ACTIVE_CONSIGNMENT':
      return { ...state, activeConsignmentId: action.id };
    case 'SET_COSTS':
      return { ...state, costs: { ...state.costs, ...action.costs } };
    case 'SAVE_ASSESSMENT':
      return {
        ...state,
        savedAssessments: [
          action.assessment,
          ...state.savedAssessments.filter(a => a.id !== action.assessment.id),
        ],
      };
    case 'DELETE_ASSESSMENT':
      return { ...state, savedAssessments: state.savedAssessments.filter(a => a.id !== action.id) };
    case 'SELECT_MARKET':
      return { ...state, selectedMarketId: action.id };
    case 'IMPORT_STATE':
      return migrateState(action.state);
    case 'SIMULATE_DESK': {
      const { marks: simMarks, costs } = simulateDesk();
      const simUpdates: MarkUpdate[] = Object.values(simMarks.marks).map(m => ({
        marketId: m.marketId,
        bid: m.bid,
        offer: m.offer,
        mid: m.mid,
        source: m.source,
        updatedAt: m.updatedAt,
        provenance: m.provenance,
      }));
      simUpdates.push({
        marketId: 'GAS_TTF',
        bid: simMarks.gasIndex.bid,
        offer: simMarks.gasIndex.offer,
        mid: simMarks.gasIndex.mid,
        updatedAt: simMarks.gasIndex.updatedAt,
        provenance: simMarks.gasIndex.provenance,
      });
      const nextMarks = applyMarkUpdates(state.marks, simUpdates);
      return {
        ...state,
        marks: {
          ...nextMarks,
          // FX is not a broker price; refresh it only while it is still simulated.
          fx: isSimulatedMark({ provenance: state.marks.fx.provenance, source: null, bid: 0 }) ? simMarks.fx : state.marks.fx,
          pricingSides: state.marks.pricingSides,
        },
        costs,
      };
    }
    case 'UPDATE_PRICING_BOOK_CELL': {
      const nextPricingBook = state.pricingBook.map(row => {
        if (row.id !== action.id) return row;
        const editedRow: PricingBookEntry = {
          ...row,
          [action.field]: action.value,
          editedAt: now,
          source: 'Desk · manual',
        };

        if (action.field === 'bidPrice' || action.field === 'offerPrice') {
          const clean = action.value.replace(/[^0-9.-]/g, '');
          const numVal = clean ? parseFloat(clean) : null;
          const fx = state.marks.fx.gbpEur;
          const toEur = (v: number | null): number | null =>
            v === null ? null : row.currency === 'EUR' ? v : (fx !== null ? Number((v * fx).toFixed(2)) : null);
          if (action.field === 'bidPrice') {
            editedRow.bidPriceNumeric = numVal;
            editedRow.numericBidEurMwh = toEur(numVal);
          } else {
            editedRow.offerPriceNumeric = numVal;
            editedRow.numericOfferEurMwh = toEur(numVal);
          }
        } else if (action.field === 'bidVolume' || action.field === 'offerVolume') {
          const m = action.value.match(/(\d+(?:\.\d+)?)\s*GWh/i);
          const vol = m ? parseFloat(m[1]) : (parseFloat(action.value) || null);
          if (action.field === 'bidVolume') {
            editedRow.bidVolumeGWh = vol;
            editedRow.bidVolumeText = action.value;
          } else {
            editedRow.offerVolumeGWh = vol;
            editedRow.offerVolumeText = action.value;
          }
        }

        return editedRow;
      });

      let nextMarks = state.marks;
      let nextRefIds = state.referenceRowIds;

      const editedRow = nextPricingBook.find(r => r.id === action.id);
      if (editedRow && (action.field === 'bidPrice' || action.field === 'offerPrice')) {
        const updatedMarketId = resolveMarketForQuote(editedRow);
        if (updatedMarketId && rowFeedsMarket(editedRow, updatedMarketId)) {
          const currentRefId = state.referenceRowIds?.[updatedMarketId];
          const isRef = !currentRefId || currentRefId === action.id;

          if (isRef) {
            nextRefIds = { ...state.referenceRowIds, [updatedMarketId]: action.id };
            const update = createMarkUpdateFromRow(editedRow, updatedMarketId, state.pricingRunMeta?.receivedOn);
            update.source = 'Desk · manual';
            if (update.provenance) {
              update.provenance.sourceName = 'Desk · manual';
              update.provenance.observedAt = now;
              update.provenance.note = `Manual edit on row ${editedRow.id}`;
            }
            nextMarks = applyMarkUpdates(state.marks, [update]);
          }
        }
      }

      return {
        ...state,
        pricingBook: nextPricingBook,
        marks: nextMarks,
        referenceRowIds: nextRefIds,
      };
    }
    case 'SET_PRICING_RUN_DATE': {
      const nextRunMeta: BrokerRunMeta = {
        ...state.pricingRunMeta,
        receivedOn: action.receivedOn,
        receivedOnIsApproximate: false,
      };
      const nextBook = state.pricingBook.map(row => {
        if (row.runId === action.runId) {
          return { ...row, observedAt: action.receivedOn };
        }
        return row;
      });

      // Re-date only the marks that are still this run's broker quote. A mark the trader has since
      // overwritten by hand (sourceName 'Desk · manual') keeps its own observation time.
      const updates: MarkUpdate[] = [];
      for (const [mId, rowId] of Object.entries(state.referenceRowIds || {})) {
        const row = nextBook.find(r => r.id === rowId);
        const current = state.marks.marks[mId];
        if (row && row.runId === action.runId && current?.provenance?.sourceName === 'Broker run') {
          updates.push({
            marketId: mId,
            correction: true,
            provenance: { ...current.provenance, observedAt: action.receivedOn },
          });
        }
      }
      const nextMarks = applyMarkUpdates(state.marks, updates);
      return {
        ...state,
        pricingRunMeta: nextRunMeta,
        pricingBook: nextBook,
        marks: nextMarks,
      };
    }
    case 'SET_MARKET_REFERENCE_ROW': {
      const row = state.pricingBook.find(r => r.id === action.rowId);
      if (!row || !rowFeedsMarket(row, action.marketId) || !rowHasPrice(row)) return state;
      const update = createMarkUpdateFromRow(row, action.marketId, state.pricingRunMeta?.receivedOn);
      const nextMarks = applyMarkUpdates(state.marks, [update]);
      return {
        ...state,
        marks: nextMarks,
        referenceRowIds: {
          ...state.referenceRowIds,
          [action.marketId]: action.rowId,
        },
      };
    }
    case 'ADD_PRICING_RUN': {
      const nextBook = [...state.pricingBook, ...action.rows];
      const updates: MarkUpdate[] = [];
      const nextRefIds = { ...state.referenceRowIds };
      const candidates: { mId: string; rowId: string; update: MarkUpdate }[] = [];
      for (const row of action.rows) {
        const mId = resolveMarketForQuote(row);
        if (mId && rowFeedsMarket(row, mId) && (row.bidPriceNumeric !== null || row.offerPriceNumeric !== null)) {
          const update = createMarkUpdateFromRow(row, mId, action.runMeta.receivedOn);
          updates.push(update);
          candidates.push({ mId, rowId: row.id, update });
        }
      }
      const nextMarks = applyMarkUpdates(state.marks, updates);
      // Only move the reference star when the mark actually took this row's quote
      // (an older run date never displaces a newer mark).
      for (const { mId, rowId, update } of candidates) {
        const m = nextMarks.marks[mId];
        if (m && m.provenance?.observedAt === update.provenance?.observedAt && m.bid === update.bid && m.offer === update.offer) {
          nextRefIds[mId] = rowId;
        }
      }
      return {
        ...state,
        pricingBook: nextBook,
        marks: nextMarks,
        referenceRowIds: nextRefIds,
      };
    }
    case 'RESET':
      return createDefaultState();
    default:
      return state;
  }
}

// Context
export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  isSaving: boolean;
  lastSavedAt: Date | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, getInitialState);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => new Date());

  // Auto-save to localStorage on change with visual status tracking
  useEffect(() => {
    setIsSaving(true);
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setLastSavedAt(new Date());
      } catch (e) {
        console.warn('Failed to save state to localStorage', e);
      } finally {
        setIsSaving(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch, isSaving, lastSavedAt }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  const parsed = JSON.parse(json);
  return migrateState(parsed);
}

/**
 * Builds the same timestamped desk backup (.json) File that downloadDeskBackup() writes to
 * disk — shared so callers that hand the backup to navigator.share() (the mobile Desk sheet)
 * and callers that download it directly use one filename/payload convention.
 */
export function buildDeskBackupFile(state: AppState): File {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `Biomethane_Desk_Backup_${dateStr}_${timeStr}.json`;
  return new File([exportState(state)], fileName, { type: 'application/json' });
}

/**
 * Downloads a complete, timestamped desk backup (.json) directly to the user's hard drive / OneDrive.
 */
export function downloadDeskBackup(state: AppState): string {
  const file = buildDeskBackupFile(state);
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return file.name;
}

/**
 * Reads and parses an uploaded .json desk backup file.
 */
export function readBackupFile(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const imported = importState(text);
        resolve(imported);
      } catch (err) {
        reject(new Error('Invalid backup file format. Must be a valid Biomethane Desk JSON backup.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read backup file from disk.'));
    reader.readAsText(file);
  });
}
