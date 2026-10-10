/**
 * Page context — a small JSON snapshot of what the trader is looking at, sent with each helper question.
 *
 * Screens register a provider for their route (`registerPageContext`); the helper calls it when a
 * question is asked and when it needs context-aware suggestions. Rules, enforced here so no provider
 * has to remember them:
 *  - each route's merged output is capped at CONTEXT_BUDGET_CHARS (long strings are shortened, then
 *    trailing array rows dropped);
 *  - any property that looks like a secret (key, token, secret, password, authorization) is removed;
 *  - the helper only ever sees what a provider returns, never the desk store.
 * Plain TypeScript with no React so the tests can run in node.
 */
import { GUIDE_ROUTE_ALIASES, getPageGuide } from './pageGuides';

/** About 3 KB of JSON per route. */
export const CONTEXT_BUDGET_CHARS = 3072;

export type PageContextProvider = () => Record<string, unknown> | null | undefined;

const SECRET_KEY = /(api[-_ ]?key|secret|token|password|authorization)/i;
const SECRET_VALUE = /\bsk-ant-[A-Za-z0-9_-]{6,}/g;

const providers = new Map<string, Map<string, PageContextProvider>>();
const listeners = new Set<() => void>();
let version = 0;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

/** Strip query, hash and trailing slash; resolve aliases ('/' is the Morning brief). */
export function canonicalRoute(pathname: string): string {
  const base = pathname.split('?')[0].split('#')[0] || '/';
  const withSlash = base.startsWith('/') ? base : `/${base}`;
  const clean = withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
  return GUIDE_ROUTE_ALIASES[clean] ?? clean;
}

/** Tell the helper the data behind a provider may have changed. Debounced: screens call it on every render. */
export function notifyPageContextChanged(): void {
  if (notifyTimer) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    version += 1;
    listeners.forEach(l => l());
  }, 250);
}

/**
 * Several components on one route can each register a part (`id`); their objects are merged.
 * Returns an unregister function.
 */
export function registerPageContext(route: string, provider: PageContextProvider, id = 'main'): () => void {
  const key = canonicalRoute(route);
  let byId = providers.get(key);
  if (!byId) {
    byId = new Map();
    providers.set(key, byId);
  }
  byId.set(id, provider);
  notifyPageContextChanged();
  return () => {
    const current = providers.get(key);
    if (current?.get(id) === provider) {
      current.delete(id);
      if (current.size === 0) providers.delete(key);
      notifyPageContextChanged();
    }
  };
}

export function subscribePageContext(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getPageContextVersion(): number {
  return version;
}

function removeSecrets(value: unknown, depth = 0): unknown {
  if (depth > 6) return undefined;
  if (typeof value === 'string') return value.replace(SECRET_VALUE, '[removed]');
  if (Array.isArray(value)) return value.map(v => removeSecrets(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k)) continue;
      out[k] = removeSecrets(v, depth + 1);
    }
    return out;
  }
  return value;
}

interface StringSlot { value: string; set: (s: string) => void }

function findLongestString(root: unknown): StringSlot | null {
  let best: StringSlot | null = null;
  const walk = (node: unknown, set?: (s: string) => void) => {
    if (typeof node === 'string') {
      if (set && node.length > 40 && (!best || node.length > best.value.length)) best = { value: node, set };
    } else if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, s => { node[i] = s; }));
    } else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      for (const k of Object.keys(obj)) walk(obj[k], s => { obj[k] = s; });
    }
  };
  walk(root);
  return best;
}

function findLongestArray(root: unknown): unknown[] | null {
  let best: unknown[] | null = null;
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      if (node.length > 0 && (!best || node.length > best.length)) best = node;
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach(walk);
    }
  };
  walk(root);
  return best;
}

/**
 * Remove secrets, then shrink the longest strings (never below 40 characters), then drop trailing
 * rows of the longest array, until the JSON fits.
 */
export function capContext(input: Record<string, unknown>, maxChars = CONTEXT_BUDGET_CHARS): Record<string, unknown> {
  const clean = removeSecrets(input) as Record<string, unknown>;
  for (let guard = 0; guard < 2000; guard++) {
    if (JSON.stringify(clean).length <= maxChars) return clean;
    const slot = findLongestString(clean);
    if (slot) {
      slot.set(slot.value.slice(0, Math.max(40, Math.floor((slot.value.length * 3) / 5))).trimEnd() + '…');
      continue;
    }
    const arr = findLongestArray(clean);
    if (arr) { arr.pop(); continue; }
    break;
  }
  return { truncated: true };
}

/** The fallback every page gets: its route and title. */
export function fallbackContext(pathname: string): Record<string, unknown> {
  const route = canonicalRoute(pathname);
  return { route, page: getPageGuide(route)?.title ?? route };
}

/** The live context for a route: registered providers merged and capped, or the route-and-title fallback. */
export function getPageContext(pathname: string, search = ''): Record<string, unknown> {
  const route = canonicalRoute(pathname);
  const base = fallbackContext(pathname);
  const byId = providers.get(route);
  if (!byId || byId.size === 0) return base;
  const merged: Record<string, unknown> = { ...base };
  if (search) merged.query = search.replace(/^\?/, '').slice(0, 160);
  for (const provider of byId.values()) {
    try {
      const part = provider();
      if (part && typeof part === 'object') Object.assign(merged, part);
    } catch {
      // A failing provider must never break the helper: it falls back to what the others gave.
    }
  }
  return capContext(merged);
}
