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

  return (
    <AppContext.Provider value={{ state, dispatch, isSaving, lastSavedAt }}>
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
