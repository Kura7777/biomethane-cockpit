import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Consignment } from '../domain/consignment/types';
import { MarksState, CostInputs, PricingSides } from '../domain/netback/types';
import { TradeAssessment } from '../domain/trade/types';
import { PriceSide, MarkEntry, MarkProvenance, getMarkStaleness } from '../domain/markets/types';
import { MARKETS } from '../domain/markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../domain/consignment/feedstocks';
import { simulateDesk } from '../domain/marks/simulate';

export const CURRENT_SCHEMA_VERSION = 8;
const STORAGE_KEY = 'biomethane-desk-state-v8';

// Newest first — the first key that yields a readable payload wins.
const KNOWN_STORAGE_KEYS = [
  STORAGE_KEY,
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
  | { type: 'RESET' };

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
 * Marks and costs are seeded from simulateDesk() rather than left null. An empty
 * desk is philosophically pure — nothing is priced that nobody quoted — but it
 * renders every screen in the app as em-dashes and 'Unset', which reads as broken
 * rather than as principled, and the only way out was a low-contrast button most
 * people never found.
 *
 * The honesty requirement is met a different way: every seeded entry is stamped
 * sourceType 'ESTIMATE' / sourceName SIMULATED_SOURCE_NAME, sorts to the bottom of
 * MARK_SOURCE_RELIABILITY, and raises a persistent banner in the shell. Nothing here
 * claims to be an observed price. Real marks entered on the Marks screen overwrite
 * these and clear the banner for that mark.
 */
export function createDefaultState(): AppState {
  const { marks, costs } = simulateDesk();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    marks,
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
function appReducer(state: AppState, action: AppAction): AppState {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'SET_MARK': {
      const existing = state.marks.marks[action.marketId];
      const updatedTimestamp = action.updatedAt ?? (action.bid !== null || action.offer !== null || action.mid !== null ? now : null);
      const updatedEntry: MarkEntry = {
        marketId: action.marketId,
        bid: action.bid,
        offer: action.offer,
        mid: action.mid,
        updatedAt: updatedTimestamp,
        source: action.source ?? existing?.source ?? null,
        provenance: action.provenance !== undefined ? action.provenance : (existing?.provenance ?? {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: updatedTimestamp,
          note: null,
        }),
      };

      return {
        ...state,
        marks: {
          ...state.marks,
          marks: {
            ...state.marks.marks,
            [action.marketId]: updatedEntry,
          },
        },
      };
    }
    case 'SET_GAS_INDEX': {
      const hasValue = action.bid !== null || action.offer !== null || action.mid !== null;
      const gasUpdatedAt = action.updatedAt ?? (hasValue ? now : null);
      return {
        ...state,
        marks: {
          ...state.marks,
          gasIndex: {
            bid: action.bid,
            offer: action.offer,
            mid: action.mid,
            updatedAt: gasUpdatedAt,
            provenance: action.provenance !== undefined ? action.provenance : (state.marks.gasIndex.provenance ?? {
              sourceType: null,
              sourceName: null,
              sourceUrl: null,
              observedAt: gasUpdatedAt,
              note: null,
            }),
          },
        },
      };
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
      const { marks, costs } = simulateDesk();
      return { ...state, marks: { ...marks, pricingSides: state.marks.pricingSides }, costs };
    }
    case 'RESET':
      return createDefaultState();
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, getInitialState);

  // Auto-save to localStorage on change
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save state to localStorage', e);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState() {
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
