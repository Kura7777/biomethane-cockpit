import { TraderDeskOverride } from './types';

/**
 * Local Trader Desk Overrides & Verified Contacts Store
 *
 * Allows front-office traders and originators to log confirmed commercial counterparties,
 * signatories, and direct contact details for any biomethane plant.
 *
 * Persisted in browser localStorage with JSON export/import for desk collaboration.
 */

const STORAGE_KEY = 'biomethane_desk_plant_overrides_v1';
let inMemoryStore: Record<string, TraderDeskOverride> = {};

export function getAllTraderDeskOverrides(): Record<string, TraderDeskOverride> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...inMemoryStore };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { ...inMemoryStore };
  } catch (err) {
    console.error('Failed to load trader desk plant overrides from localStorage:', err);
    return { ...inMemoryStore };
  }
}

export function getTraderDeskOverride(plantId: string): TraderDeskOverride | null {
  const all = getAllTraderDeskOverrides();
  return all[plantId] ?? null;
}

export function saveTraderDeskOverride(override: TraderDeskOverride): void {
  inMemoryStore[override.plantId] = {
    ...override,
    verifiedAt: override.verifiedAt || new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const all = getAllTraderDeskOverrides();
      all[override.plantId] = inMemoryStore[override.plantId];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('plant-override-updated', { detail: { plantId: override.plantId } }));
    } catch (err) {
      console.error('Failed to save trader desk plant override to localStorage:', err);
    }
  }
}

export function deleteTraderDeskOverride(plantId: string): void {
  delete inMemoryStore[plantId];

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const all = getAllTraderDeskOverrides();
      if (all[plantId]) {
        delete all[plantId];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        window.dispatchEvent(new CustomEvent('plant-override-updated', { detail: { plantId } }));
      }
    } catch (err) {
      console.error('Failed to delete trader desk plant override:', err);
    }
  }
}

export function clearAllTraderDeskOverrides(): void {
  inMemoryStore = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore in tests
    }
  }
}

export function exportTraderOverridesJson(): string {
  const all = getAllTraderDeskOverrides();
  return JSON.stringify(all, null, 2);
}

export function importTraderOverridesJson(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || parsed === null) return false;
    inMemoryStore = { ...parsed };
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent('plant-override-updated', { detail: { plantId: 'all' } }));
    }
    return true;
  } catch {
    return false;
  }
}
