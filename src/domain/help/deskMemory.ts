/**
 * Desk Memory & Continuous Learning Engine.
 *
 * Provides client-side persistent episodic memory and dynamic trading rules for the
 * Biomethane Desk and Ask the Desk assistant.
 *
 * Invariants:
 *  - 100% Client-Side: Memory is persisted in browser localStorage with zero external telemetry.
 *  - Deterministic Parsing: Rules and deals are structured with explicit categories and timestamps.
 *  - Compact Context Injection: When formatted for LLM prompts or tools, entries are compactly formatted
 *    to prevent prompt bloat while giving the assistant full recall of custom lessons learned.
 */

export interface DeskMemoryRule {
  id: string;
  category: 'counterparty' | 'market' | 'tariff' | 'contract' | 'general';
  subject: string;
  rule: string;
  createdAt: string;
  source: 'user_command' | 'deal_reflection' | 'ingested_document';
}

export interface DeskDealJournalEntry {
  id: string;
  timestamp: string;
  dealTitle: string;
  originCountry: string;
  destinationMarket: string;
  feedstock: string;
  carbonIntensity: number;
  volumeMWh: number;
  deliveredPriceEurMwh: number;
  netbackMarginEurMwh: number;
  keyRisksOrNotes?: string;
}

export interface DeskMemoryBank {
  rules: DeskMemoryRule[];
  deals: DeskDealJournalEntry[];
}

const STORAGE_KEY_RULES = 'biomethane_desk_memory_rules_v1';
const STORAGE_KEY_DEALS = 'biomethane_desk_journal_deals_v1';

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage quota or access errors in sandbox/SSR
  }
  return null;
}

function safeSetItem(key: string, val: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
      return true;
    }
  } catch {
    // Storage quota or access error: reported to the caller
  }
  return false;
}

/** Limits on a rule the helper proposes. */
export const DESK_RULE_MAX_SUBJECT_CHARS = 80;
export const DESK_RULE_MAX_RULE_CHARS = 400;
export const DESK_RULE_MAX_COUNT = 100;
const RULE_CATEGORIES: DeskMemoryRule['category'][] = ['counterparty', 'market', 'tariff', 'contract', 'general'];

/** Checks a proposed rule (length caps, rule count); nothing is stored. */
export function validateDeskRuleInput(input: { subject: string; rule: string; category: string }):
  { ok: true; rule: { subject: string; rule: string; category: DeskMemoryRule['category'] } } | { ok: false; error: string } {
  const subject = input.subject.trim();
  const rule = input.rule.trim();
  if (!subject || !rule) return { ok: false, error: 'subject and rule are required to save desk memory' };
  if (subject.length > DESK_RULE_MAX_SUBJECT_CHARS) return { ok: false, error: `subject is longer than ${DESK_RULE_MAX_SUBJECT_CHARS} characters` };
  if (rule.length > DESK_RULE_MAX_RULE_CHARS) return { ok: false, error: `rule is longer than ${DESK_RULE_MAX_RULE_CHARS} characters; shorten it` };
  if (getDeskRules().length >= DESK_RULE_MAX_COUNT) return { ok: false, error: `desk memory already holds ${DESK_RULE_MAX_COUNT} rules; delete some first` };
  const category = RULE_CATEGORIES.includes(input.category as DeskMemoryRule['category']) ? (input.category as DeskMemoryRule['category']) : 'general';
  return { ok: true, rule: { subject, rule, category } };
}

/** Stores a rule and verifies the write; reports a storage failure instead of pretending success. */
export function saveDeskRuleChecked(input: { subject: string; rule: string; category: DeskMemoryRule['category'] }): { ok: true; rule: DeskMemoryRule } | { ok: false; error: string } {
  const saved = saveDeskRule({ ...input, source: 'user_command' });
  const stored = (safeGetItem(STORAGE_KEY_RULES) ?? '').includes(saved.id);
  return stored ? { ok: true, rule: saved } : { ok: false, error: 'Browser storage refused the write (full or blocked); the rule was not saved.' };
}

/** In-memory fallback if localStorage is disabled or unavailable. */
let memFallbackRules: DeskMemoryRule[] = [];
let memFallbackDeals: DeskDealJournalEntry[] = [];

/**
 * Retrieve all persistent desk rules.
 */
export function getDeskRules(): DeskMemoryRule[] {
  const raw = safeGetItem(STORAGE_KEY_RULES);
  if (!raw) return [...memFallbackRules];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...memFallbackRules];
  }
}

/**
 * Retrieve all persistent deal journal entries.
 */
export function getDealJournal(): DeskDealJournalEntry[] {
  const raw = safeGetItem(STORAGE_KEY_DEALS);
  if (!raw) return [...memFallbackDeals];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...memFallbackDeals];
  }
}

/**
 * Retrieve the full desk memory bank.
 */
export function getDeskMemory(): DeskMemoryBank {
  return {
    rules: getDeskRules(),
    deals: getDealJournal(),
  };
}

/**
 * Save a new trading rule into persistent desk memory.
 */
export function saveDeskRule(input: {
  category?: DeskMemoryRule['category'];
  subject: string;
  rule: string;
  source?: DeskMemoryRule['source'];
}): DeskMemoryRule {
  const existing = getDeskRules();
  const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newRule: DeskMemoryRule = {
    id,
    category: input.category || 'general',
    subject: input.subject.trim(),
    rule: input.rule.trim(),
    createdAt: new Date().toISOString(),
    source: input.source || 'user_command',
  };

  const updated = [newRule, ...existing.filter(r => r.subject.toLowerCase() !== newRule.subject.toLowerCase() || r.rule !== newRule.rule)];
  safeSetItem(STORAGE_KEY_RULES, JSON.stringify(updated));
  memFallbackRules = updated;
  return newRule;
}

/**
 * Delete a specific rule by ID.
 */
export function deleteDeskRule(id: string): boolean {
  const existing = getDeskRules();
  const filtered = existing.filter(r => r.id !== id);
  if (filtered.length !== existing.length) {
    safeSetItem(STORAGE_KEY_RULES, JSON.stringify(filtered));
    memFallbackRules = filtered;
    return true;
  }
  return false;
}

/**
 * Clear all custom desk memory rules.
 */
export function clearDeskRules(): void {
  safeSetItem(STORAGE_KEY_RULES, JSON.stringify([]));
  memFallbackRules = [];
}

/**
 * Log a structured deal valuation or closed trade to the Deal Journal.
 */
export function logDealToJournal(entry: Omit<DeskDealJournalEntry, 'id' | 'timestamp'>): DeskDealJournalEntry {
  const existing = getDealJournal();
  const id = `deal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: DeskDealJournalEntry = {
    ...entry,
    id,
    timestamp: new Date().toISOString(),
  };
  // Keep the most recent 100 deals in local history
  const updated = [record, ...existing].slice(0, 100);
  safeSetItem(STORAGE_KEY_DEALS, JSON.stringify(updated));
  memFallbackDeals = updated;
  return record;
}

/**
 * Search the desk memory for relevant keywords or counterparty names.
 */
export function searchDeskMemory(query: string): { rules: DeskMemoryRule[]; deals: DeskDealJournalEntry[] } {
  const q = query.toLowerCase().trim();
  if (!q) return getDeskMemory();
  const tokens = q.split(/[^a-z0-9_-]+/).filter(t => t.length > 2);

  const rules = getDeskRules().filter(r => {
    const hay = `${r.subject} ${r.rule} ${r.category}`.toLowerCase();
    return tokens.some(t => hay.includes(t));
  });

  const deals = getDealJournal().filter(d => {
    const hay = `${d.dealTitle} ${d.originCountry} ${d.destinationMarket} ${d.feedstock} ${d.keyRisksOrNotes || ''}`.toLowerCase();
    return tokens.some(t => hay.includes(t));
  });

  return { rules, deals };
}

/**
 * Formats relevant desk memory into compact plain text for LLM tool results or prompt injection.
 */
export function formatDeskMemoryForPrompt(query?: string): string {
  const memory = query ? searchDeskMemory(query) : getDeskMemory();
  const lines: string[] = [];

  if (memory.rules.length > 0) {
    lines.push(`CUSTOM TRADING RULES & DESK LESSONS LEARNED (${memory.rules.length}):`);
    for (const r of memory.rules.slice(0, 8)) {
      lines.push(`- [${r.category.toUpperCase()}] ${r.subject}: ${r.rule} (Recorded: ${r.createdAt.slice(0, 10)})`);
    }
  }

  if (memory.deals.length > 0) {
    lines.push(`\nRECENT DEALS & HISTORICAL STRUCTURING LOG (${memory.deals.length}):`);
    for (const d of memory.deals.slice(0, 5)) {
      lines.push(`- ${d.dealTitle || 'Deal'} (${d.originCountry} -> ${d.destinationMarket}, ${d.feedstock}, CI ${d.carbonIntensity}): €${d.deliveredPriceEurMwh}/MWh, Margin +€${d.netbackMarginEurMwh}/MWh [${d.timestamp.slice(0, 10)}]${d.keyRisksOrNotes ? ` Note: ${d.keyRisksOrNotes}` : ''}`);
    }
  }

  if (lines.length === 0) {
    return 'Desk memory is currently empty. The trader has not recorded custom counterparty rules or past deal journals yet.';
  }

  return lines.join('\n');
}

/**
 * Export all desk memory as JSON string for backup.
 */
export function exportDeskMemoryJson(): string {
  return JSON.stringify(getDeskMemory(), null, 2);
}

/**
 * Import and merge desk memory from a JSON string.
 */
export function importDeskMemoryJson(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr) as Partial<DeskMemoryBank>;
    if (parsed.rules && Array.isArray(parsed.rules)) {
      const merged = [...parsed.rules, ...getDeskRules()];
      // Deduplicate by subject & rule
      const deduped: DeskMemoryRule[] = [];
      const seen = new Set<string>();
      for (const r of merged) {
        const key = `${r.subject.toLowerCase()}|${r.rule.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(r);
        }
      }
      safeSetItem(STORAGE_KEY_RULES, JSON.stringify(deduped));
      memFallbackRules = deduped;
    }
    if (parsed.deals && Array.isArray(parsed.deals)) {
      const mergedDeals = [...parsed.deals, ...getDealJournal()].slice(0, 100);
      safeSetItem(STORAGE_KEY_DEALS, JSON.stringify(mergedDeals));
      memFallbackDeals = mergedDeals;
    }
    return true;
  } catch {
    return false;
  }
}
