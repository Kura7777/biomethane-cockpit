/**
 * What a helper answer costs, estimated from the token counts the provider reports, and the day's total
 * on this device. Every price is a desk assumption (registry.ts, HELPER category, shown on #/pricing →
 * Desk assumptions); nothing is priced here. An estimate, not an invoice.
 */
import { getAssumption } from '../assumptions/registry';
import type { HelperModel } from './helperModels';

/** Token counts for one answer, summed over every round of the tool loop. */
export interface HelperUsage {
  /** Input tokens billed at the full input price (not cached). */
  inputTokens: number;
  /** Tokens written to the prompt cache (Anthropic only). */
  cacheWriteTokens: number;
  /** Tokens read from the prompt cache. */
  cacheReadTokens: number;
  /** Output tokens, thinking included. */
  outputTokens: number;
  /** Web searches the provider ran (Anthropic server-side web search). */
  webSearches: number;
}

export const EMPTY_USAGE: HelperUsage = { inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0, webSearches: 0 };

export function addUsage(a: HelperUsage, b: Partial<HelperUsage>): HelperUsage {
  return {
    inputTokens: a.inputTokens + (b.inputTokens ?? 0),
    cacheWriteTokens: a.cacheWriteTokens + (b.cacheWriteTokens ?? 0),
    cacheReadTokens: a.cacheReadTokens + (b.cacheReadTokens ?? 0),
    outputTokens: a.outputTokens + (b.outputTokens ?? 0),
    webSearches: a.webSearches + (b.webSearches ?? 0),
  };
}

/** Estimated US dollars for one answer. */
export function estimateCostUsd(model: HelperModel, usage: HelperUsage): number {
  const input = getAssumption(model.price.input) / 1e6;
  const output = getAssumption(model.price.output) / 1e6;
  const readX = getAssumption(model.price.cacheRead);
  const writeX = model.provider === 'anthropic' ? getAssumption('helper.price.anthropic.cacheWriteX') : 1;
  const search = model.provider === 'anthropic' ? getAssumption('helper.price.anthropic.webSearchUsdPer1000') / 1000 : 0;
  return (
    usage.inputTokens * input +
    usage.cacheWriteTokens * input * writeX +
    usage.cacheReadTokens * input * readX +
    usage.outputTokens * output +
    usage.webSearches * search
  );
}

/** "$0.004", "$0.12": enough precision to see a cheap answer is cheap. */
export function formatUsd(usd: number): string {
  if (usd <= 0) return '$0.00';
  if (usd < 0.0005) return '<$0.001';
  if (usd < 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

// ── Today's spend on this device ────────────────────────────────────────────

export const HELPER_SPEND_STORAGE_KEY = 'biomethane_helper_spend';

/** Local calendar date, YYYY-MM-DD. */
export function localDateKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const listeners = new Set<() => void>();
let memorySpend: { date: string; usd: number } = { date: '', usd: 0 };

function readSpend(): { date: string; usd: number } {
  try {
    const raw = localStorage.getItem(HELPER_SPEND_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date?: unknown; usd?: unknown };
      if (typeof parsed.date === 'string' && typeof parsed.usd === 'number' && Number.isFinite(parsed.usd)) return { date: parsed.date, usd: parsed.usd };
    }
  } catch {
    // Storage unavailable or damaged: fall back to the in-memory total for this page load.
    return memorySpend;
  }
  return memorySpend;
}

/** Estimated spend so far today (local date) on this device. */
export function getTodaySpendUsd(): number {
  const today = localDateKey();
  const stored = readSpend();
  return stored.date === today ? stored.usd : 0;
}

export function addTodaySpendUsd(usd: number): void {
  if (!(usd > 0)) return;
  memorySpend = { date: localDateKey(), usd: getTodaySpendUsd() + usd };
  try {
    localStorage.setItem(HELPER_SPEND_STORAGE_KEY, JSON.stringify(memorySpend));
  } catch {
    // Ignore: the in-memory total still counts for this page load.
  }
  listeners.forEach(l => l());
}

export function subscribeTodaySpend(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** The daily budget in dollars, or null when the cap is off (0). */
export function dailyCapUsd(): number | null {
  const cap = getAssumption('helper.dailyCapUsd');
  return cap > 0 ? cap : null;
}

export function dailyCapReached(): boolean {
  const cap = dailyCapUsd();
  return cap !== null && getTodaySpendUsd() >= cap;
}
