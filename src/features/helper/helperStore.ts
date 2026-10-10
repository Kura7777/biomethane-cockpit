import { useSyncExternalStore } from 'react';
import type { HelperTurn } from '../../domain/help/helperLogic';

/**
 * Helper session state, kept outside React so the chat survives the screen changes that unmount
 * and remount the dock's panel:
 *  - whether the panel was open (sessionStorage, so it follows the browser tab);
 *  - one conversation per page, kept for the session. Changing page shows that page's own chat
 *    (empty the first time); the previous page's chat stays reachable through "Previous page chat".
 */

const OPEN_KEY = 'biomethane-helper-open';

export interface HelperSnapshot {
  open: boolean;
  conversations: Readonly<Record<string, readonly HelperTurn[]>>;
  /** Pages that have a conversation, most recent first. */
  recent: readonly string[];
  /** When set, the panel shows this page's chat read-only instead of the current page's. */
  viewing: string | null;
}

function readOpen(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

let snapshot: HelperSnapshot = { open: readOpen(), conversations: {}, recent: [], viewing: null };
const listeners = new Set<() => void>();

function set(next: HelperSnapshot): void {
  snapshot = next;
  listeners.forEach(l => l());
}

export function getHelperSnapshot(): HelperSnapshot {
  return snapshot;
}

export function subscribeHelper(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useHelperStore(): HelperSnapshot {
  return useSyncExternalStore(subscribeHelper, getHelperSnapshot, getHelperSnapshot);
}

export function setHelperOpen(open: boolean): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    // Private mode: the panel just does not remember.
  }
  if (snapshot.open === open) return;
  set({ ...snapshot, open });
}

export function appendHelperTurn(pageKey: string, turn: HelperTurn): void {
  const existing = snapshot.conversations[pageKey] ?? [];
  set({
    ...snapshot,
    conversations: { ...snapshot.conversations, [pageKey]: [...existing, turn] },
    recent: [pageKey, ...snapshot.recent.filter(k => k !== pageKey)],
  });
}

export function setHelperViewing(pageKey: string | null): void {
  if (snapshot.viewing === pageKey) return;
  set({ ...snapshot, viewing: pageKey });
}

/** Test helper: back to a fresh session. */
export function resetHelperStore(): void {
  set({ open: false, conversations: {}, recent: [], viewing: null });
}
