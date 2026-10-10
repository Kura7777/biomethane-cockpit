import { useSyncExternalStore } from 'react';
import type { HelperTurn } from '../../domain/help/helperLogic';

/**
 * Helper session state, kept outside React so the chat survives the screen changes that unmount
 * and remount the dock's panel:
 *  - whether the chat card was open, and whether it was enlarged (sessionStorage, so it follows the browser tab);
 *  - one conversation per page, kept for the session. Changing page shows that page's own chat
 *    (empty the first time); the previous page's chat stays reachable through "Previous page chat".
 */

const OPEN_KEY = 'biomethane-helper-open';
const EXPANDED_KEY = 'biomethane-helper-expanded';

export interface HelperSnapshot {
  open: boolean;
  /** The card is shown as a large centred window. Only meaningful while open. */
  expanded: boolean;
  conversations: Readonly<Record<string, readonly HelperTurn[]>>;
  /** Pages that have a conversation, most recent first. */
  recent: readonly string[];
  /** When set, the panel shows this page's chat read-only instead of the current page's. */
  viewing: string | null;
}

function readFlag(key: string): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, on ? '1' : '0');
  } catch {
    // Private mode: the panel just does not remember.
  }
}

const startOpen = readFlag(OPEN_KEY);
let snapshot: HelperSnapshot = { open: startOpen, expanded: startOpen && readFlag(EXPANDED_KEY), conversations: {}, recent: [], viewing: null };
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

/** Closing also returns the card to its normal size. */
export function setHelperOpen(open: boolean): void {
  writeFlag(OPEN_KEY, open);
  const expanded = open && snapshot.expanded;
  writeFlag(EXPANDED_KEY, expanded);
  if (snapshot.open === open && snapshot.expanded === expanded) return;
  set({ ...snapshot, open, expanded });
}

/** Enlarge the card into the centred window (opening it if needed) or step back to the card. */
export function setHelperExpanded(expanded: boolean): void {
  writeFlag(OPEN_KEY, expanded || snapshot.open);
  writeFlag(EXPANDED_KEY, expanded);
  const open = expanded || snapshot.open;
  if (snapshot.open === open && snapshot.expanded === expanded) return;
  set({ ...snapshot, open, expanded });
}

export function appendHelperTurn(pageKey: string, turn: HelperTurn): void {
  const existing = snapshot.conversations[pageKey] ?? [];
  set({
    ...snapshot,
    conversations: { ...snapshot.conversations, [pageKey]: [...existing, turn] },
    recent: [pageKey, ...snapshot.recent.filter(k => k !== pageKey)],
  });
}

/** "New chat": forget one page's conversation. */
export function clearHelperConversation(pageKey: string): void {
  if (!snapshot.conversations[pageKey]) return;
  const conversations = { ...snapshot.conversations };
  delete conversations[pageKey];
  set({ ...snapshot, conversations, recent: snapshot.recent.filter(k => k !== pageKey), viewing: snapshot.viewing === pageKey ? null : snapshot.viewing });
}

export function setHelperViewing(pageKey: string | null): void {
  if (snapshot.viewing === pageKey) return;
  set({ ...snapshot, viewing: pageKey });
}

/** Test helper: back to a fresh session. */
export function resetHelperStore(): void {
  set({ open: false, expanded: false, conversations: {}, recent: [], viewing: null });
}
