import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Consignment } from '../domain/consignment/types';
import { MarksState, CostInputs, PricingSides } from '../domain/netback/types';
import { TradeAssessment } from '../domain/trade/types';
import { PriceSide, MarkEntry, MarkProvenance, getMarkStaleness } from '../domain/markets/types';
import { MARKETS } from '../domain/markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../domain/consignment/feedstocks';

export const CURRENT_SCHEMA_VERSION = 7;
const STORAGE_KEY = 'biomethane-desk-state-v7';
const LEGACY_STORAGE_KEY_V6 = 'biomethane-desk-state-v6';
const LEGACY_STORAGE_KEY_V5 = 'biomethane-desk-state-v5';
const LEGACY_STORAGE_KEY = 'biomethane-desk-state';

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
  | { type: 'RESET' };

/**
 * Migration function to upgrade legacy state shapes safely without data loss
 */
export function migrateState(raw: any): AppState {
  if (!raw || typeof raw !== 'object') {
    return createDefaultState();
  }

  const stateVersion = raw.schemaVersion || 1;
  let migrated = { ...raw };

  if (stateVersion < 2) {
    // Migrate marks shape to include updatedAt and source
    const rawMarks = raw.marks?.marks || {};
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
        bid: raw.marks?.gasIndex?.bid ?? null,
        offer: raw.marks?.gasIndex?.offer ?? null,
        mid: raw.marks?.gasIndex?.mid ?? null,
        updatedAt: raw.marks?.gasIndex?.updatedAt ?? null,
      },
      fx: {
        gbpEur: raw.marks?.fx?.gbpEur ?? null,
        chfEur: raw.marks?.fx?.chfEur ?? null,
        updatedAt: raw.marks?.fx?.updatedAt ?? null,
      },
      pricingSide: raw.marks?.pricingSide ?? 'bid',
    };
  }

  if (stateVersion < 4) {
    // Schema v4 migration: existing state gets producerPricing = null, flagged incomplete
    if (!migrated.costs) {
      migrated.costs = {
        transferCosts: null,
        certificationCosts: null,
        logistics: null,
        deliveredCost: null,
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
    migrated.consignments = (migrated.consignments || []).map((c: any) => ({
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
    migrated.consignments = (migrated.consignments || []).map((c: any) => ({
      ...c,
      counterparty: c.counterparty ?? null,
    }));
  }

  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;

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

export function createDefaultState(): AppState {
  const initialMarks: Record<string, MarkEntry> = {};
  MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
    initialMarks[m.id] = {
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
  });

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    marks: {
      marks: initialMarks,
      gasIndex: {
        bid: null,
        offer: null,
        mid: null,
        updatedAt: null,
        provenance: {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: null,
          note: null,
        },
      },
      fx: {
        gbpEur: null,
        chfEur: null,
        updatedAt: null,
        provenance: {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: null,
          note: null,
        },
      },
      pricingSide: 'bid',
    },
    consignments: [
      REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE,
      REFERENCE_CONSIGNMENTS.ISCC_PLUS_VOLUNTARY,
    ],
    activeConsignmentId: REFERENCE_CONSIGNMENTS.DANISH_MANURE.id,
    costs: {
      transferCosts: null,
      certificationCosts: null,
      logistics: null,
      deliveredCost: null,
      otherCosts: null,
      producerPricing: null,
    },
    savedAssessments: [],
    selectedMarketId: 'DE_THG',
  };
}

function getInitialState(): AppState {
  const KNOWN_STORAGE_KEYS = [
    'biomethane-desk-state-v7',
    'biomethane-desk-state-v6',
    'biomethane-desk-state-v5',
    'biomethane-desk-state-v4',
    'biomethane-desk-state-v3',
    'biomethane-desk-state-v2',
    'biomethane-desk-state',
  ];

  try {
    for (const key of KNOWN_STORAGE_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const migrated = migrateState(JSON.parse(stored));
        if (key !== STORAGE_KEY) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        }
        return migrated;
      }
    }
  } catch (e) {
    console.warn('Failed to load or migrate state from localStorage', e);
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
          pricingSide: action.side,
          pricingSides: { certificateSide: action.side, moleculeSide: action.side },
        },
      };
    case 'SET_PRICING_SIDES': {
      const currentSides = state.marks.pricingSides ?? {
        certificateSide: state.marks.pricingSide ?? 'bid',
        moleculeSide: state.marks.pricingSide ?? 'bid',
      };
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
