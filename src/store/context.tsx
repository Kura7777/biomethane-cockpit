import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import { AppState, AppAction, CURRENT_SCHEMA_VERSION, CostFieldSource, createDefaultState } from './state';
import { migrateState } from './migrations';
import { appReducer } from './reducer';
import {
  STORAGE_KEY,
  getInitialState,
  exportState,
  importState,
  buildDeskBackupFile,
  downloadDeskBackup,
  readBackupFile,
} from './persistence';

export {
  CURRENT_SCHEMA_VERSION,
  createDefaultState,
  migrateState,
  appReducer,
  exportState,
  importState,
  buildDeskBackupFile,
  downloadDeskBackup,
  readBackupFile,
};
export type { CostFieldSource, AppState, AppAction };

import { MarksState } from '../domain/netback/types';

export const PRIOR_CLOSE_STORAGE_KEY = 'biomethane-prior-close-marks';

export function getStoredPriorCloseMarks(): MarksState | null {
  try {
    const raw = localStorage.getItem(PRIOR_CLOSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to read prior close marks from localStorage', e);
    return null;
  }
}

export function savePriorCloseMarks(marks: MarksState): void {
  try {
    localStorage.setItem(PRIOR_CLOSE_STORAGE_KEY, JSON.stringify(marks));
  } catch (e) {
    console.warn('Failed to save prior close marks to localStorage', e);
  }
}

// Context
export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  isSaving: boolean;
  lastSavedAt: Date | null;
  priorCloseMarks: MarksState | null;
  snapshotPriorClose: (marks?: MarksState) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, getInitialState);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => new Date());
  const [priorCloseMarks, setPriorCloseMarks] = useState<MarksState | null>(() => getStoredPriorCloseMarks());

  const snapshotPriorClose = (marksToSnapshot?: MarksState) => {
    const targetMarks = marksToSnapshot || state.marks;
    savePriorCloseMarks(targetMarks);
    setPriorCloseMarks(targetMarks);
  };

  // Auto-save to localStorage on change with visual status tracking
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- visual saving status tracking on state change
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

  // Synchronize state across multiple open tabs to prevent split-brain overwrites
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const hydrated = migrateState(JSON.parse(e.newValue));
          dispatch({ type: 'IMPORT_STATE', state: hydrated });
        } catch {
          // Ignore malformed cross-tab payload
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, isSaving, lastSavedAt, priorCloseMarks, snapshotPriorClose }}>
      {children}
    </AppContext.Provider>
  );
}

/** The app state if inside AppProvider, else null (for components that also render in static previews). */
export function useOptionalAppState(): AppContextValue | null {
  return useContext(AppContext);
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
