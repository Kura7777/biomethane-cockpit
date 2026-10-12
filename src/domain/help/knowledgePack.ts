/**
 * The desk helper's static knowledge pack: the app's own verified reference data, rendered as plain
 * text for the model's cached system block. Everything is read from the domain modules at runtime —
 * nothing is retyped here — so the pack follows the app when the data changes.
 *
 * The pack is an INDEX, not the full text: the system block goes with every question, so it carries the
 * markets, the regulatory constants, the watchlist and one line per glossary term and knowledge-base
 * document. The full entries are fetched on demand by the lookup_reference tool (referenceLookup.ts).
 *
 * Deterministic on purpose: the same app data must give byte-identical text, or the prompt cache misses.
 * No timestamps, no random ids, no live marks (those come from tools, which always read the current desk).
 */
import { MARKETS } from '../markets/registry';
import { REGULATORY_CONSTANT_ROWS } from '../regulatory/constants';
import { REGCHECK_WATCHLIST } from '../regcheck/watchlist';
import { KNOWLEDGE_VAULT_DOCS } from '../auditor/knowledgeBase';
import { GLOSSARY } from './glossary';

/** Longest watchlist claim / glossary summary / KB title kept in the cached block. */
const WATCH_CLAIM_CHARS = 55;
const GLOSSARY_SHORT_CHARS = 32;
const KB_TITLE_CHARS = 36;

/** Cut at a word boundary with an ellipsis; the full text is one lookup_reference call away. */
export function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function marketsBlock(): string {
  const lines = MARKETS.map(m => `- ${m.id}: ${m.name} (${m.country}, ${m.sector.toLowerCase()}, ${m.status}, ${m.unitLabel})`);
  return `MARKETS IN THE APP (${MARKETS.length}). Live marks are not here: call get_marks. Legal basis, registry and open points per market: lookup_reference.\n${lines.join('\n')}`;
}

function constantsBlock(): string {
  const lines = REGULATORY_CONSTANT_ROWS.map(r =>
    `- ${r.label}: ${r.value}${r.unit ? ` ${r.unit}` : ''}${r.citation ? ` [${r.citation}]` : ''}`
  );
  return `REGULATORY CONSTANTS (verified, shown read-only on #/pricing)\n${lines.join('\n')}`;
}

function watchlistBlock(): string {
  const lines = REGCHECK_WATCHLIST.map(w => `- [${w.id}] ${w.topic}: ${clip(w.claim, WATCH_CLAIM_CHARS)}`);
  return `REGULATORY WATCHLIST (facts the desk tracks; some are open questions)\n${lines.join('\n')}`;
}

function referenceIndexBlock(): string {
  const kb = KNOWLEDGE_VAULT_DOCS.map(d => `- [${d.id}] ${clip(d.title, KB_TITLE_CHARS)}`);
  const glossary = GLOSSARY.map(e => `- ${e.term} [${e.id}]: ${clip(e.short, GLOSSARY_SHORT_CHARS)}`);
  return [
    `REGULATORY KNOWLEDGE BASE, fact-checked against primary law (${KNOWLEDGE_VAULT_DOCS.length} documents; full text via lookup_reference)`,
    kb.join('\n'),
    '',
    `GLOSSARY (${GLOSSARY.length} terms; full entries via lookup_reference or #/glossary?term=<id>)`,
    glossary.join('\n'),
  ].join('\n');
}

/** The full pack. Built once per page load; identical across requests for the same app data. */
let cached: string | null = null;
export function buildKnowledgePack(): string {
  if (cached) return cached;
  cached = [marketsBlock(), constantsBlock(), watchlistBlock(), referenceIndexBlock()].join('\n\n');
  return cached;
}
