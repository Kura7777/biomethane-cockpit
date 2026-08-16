import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Consignment } from '../domain/consignment/types';
import { MarksState, CostInputs } from '../domain/netback/types';
import { TradeAssessment } from '../domain/trade/types';
import { MARKETS } from '../domain/markets/registry';

// State shape
export interface AppState {
  marks: MarksState;
  consignments: Consignment[];
  activeConsignmentId: string | null;
  costs: CostInputs;
  savedAssessments: TradeAssessment[];
  selectedMarketId: string | null;
}

// Actions
type AppAction =
  | { type: 'SET_MARK'; marketId: string; bid: number | null; offer: number | null; mid: number | null }
  | { type: 'SET_GAS_INDEX'; bid: number | null; offer: number | null; mid: number | null }
  | { type: 'SET_FX'; currency: 'gbpEur' | 'chfEur'; value: number | null }
  | { type: 'ADD_CONSIGNMENT'; consignment: Consignment }
  | { type: 'UPDATE_CONSIGNMENT'; consignment: Consignment }
  | { type: 'SET_ACTIVE_CONSIGNMENT'; id: string | null }
  | { type: 'SET_COSTS'; costs: Partial<CostInputs> }
  | { type: 'SAVE_ASSESSMENT'; assessment: TradeAssessment }
  | { type: 'DELETE_ASSESSMENT'; id: string }
  | { type: 'SELECT_MARKET'; id: string | null }
  | { type: 'IMPORT_STATE'; state: AppState }
  | { type: 'RESET' };

const STORAGE_KEY = 'biomethane-desk-state';

// Initial state
function getInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
  }
  
  // Initialize marks with empty entries for all active markets
  const initialMarks: MarksState = {
    marks: {},
    gasIndex: { bid: null, offer: null, mid: null },
    fx: { gbpEur: null, chfEur: null },
  };
  MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
    initialMarks.marks[m.id] = { bid: null, offer: null, mid: null };
  });

  return {
    marks: initialMarks,
    consignments: [],
    activeConsignmentId: null,
    costs: {
      transferCosts: null,
      certificationCosts: null,
      logistics: null,
      deliveredCost: null,
      otherCosts: null,
    },
    savedAssessments: [],
    selectedMarketId: null,
  };
}

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MARK': {
      return {
        ...state,
        marks: {
          ...state.marks,
          marks: {
            ...state.marks.marks,
            [action.marketId]: { bid: action.bid, offer: action.offer, mid: action.mid },
          },
        },
      };
    }
    case 'SET_GAS_INDEX':
      return { ...state, marks: { ...state.marks, gasIndex: { bid: action.bid, offer: action.offer, mid: action.mid } } };
    case 'SET_FX':
      return { ...state, marks: { ...state.marks, fx: { ...state.marks.fx, [action.currency]: action.value } } };
    case 'ADD_CONSIGNMENT':
      return { ...state, consignments: [...state.consignments, action.consignment], activeConsignmentId: action.consignment.id };
    case 'UPDATE_CONSIGNMENT':
      return { ...state, consignments: state.consignments.map(c => c.id === action.consignment.id ? action.consignment : c) };
    case 'SET_ACTIVE_CONSIGNMENT':
      return { ...state, activeConsignmentId: action.id };
    case 'SET_COSTS':
      return { ...state, costs: { ...state.costs, ...action.costs } };
    case 'SAVE_ASSESSMENT':
      return { ...state, savedAssessments: [action.assessment, ...state.savedAssessments] };
    case 'DELETE_ASSESSMENT':
      return { ...state, savedAssessments: state.savedAssessments.filter(a => a.id !== action.id) };
    case 'SELECT_MARKET':
      return { ...state, selectedMarketId: action.id };
    case 'IMPORT_STATE':
      return action.state;
    case 'RESET':
      return getInitialState();
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, getInitialState);

  // Auto-save to localStorage on every state change (debounced)
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

// Export/import for JSON persistence
export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  return JSON.parse(json) as AppState;
}
