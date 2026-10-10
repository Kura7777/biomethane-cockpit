/**
 * The desk helper's static knowledge pack: the app's own verified reference data, rendered as plain
 * text for the model's cached system block. Everything is read from the domain modules at runtime —
 * nothing is retyped here — so the pack follows the app when the data changes.
 *
 * Deterministic on purpose: the same app data must give byte-identical text, or the prompt cache misses.
 * No timestamps, no random ids, no live marks (those come from tools, which always read the current desk).
 */
import { MARKETS } from '../markets/registry';
import { REGULATORY_CONSTANT_ROWS } from '../regulatory/constants';
import { REGCHECK_WATCHLIST } from '../regcheck/watchlist';
import { getFullKnowledgeContext } from '../auditor/knowledgeBase';
import { GLOSSARY } from './glossary';
import { TERM_STATUS } from './termStatus';

function marketsBlock(): string {
  const lines = MARKETS.map(m => {
    const bits = [
      `${m.id} — ${m.name} (${m.country}, ${m.sector}, status ${m.status}, unit ${m.unitLabel})`,
      m.legalBasis ? `  Legal basis: ${m.legalBasis}` : '',
      m.registry ? `  Registry: ${m.registry}` : '',
      m.notes ? `  Notes: ${m.notes}` : '',
      m.uncertainties?.length ? `  Open points: ${m.uncertainties.map(u => `${u.title}: ${u.description}`).join('; ')}` : '',
    ];
    return bits.filter(Boolean).join('\n');
  });
  return `MARKETS IN THE APP (${MARKETS.length}). Live marks are not here: call get_marks.\n${lines.join('\n')}`;
}

function constantsBlock(): string {
  const lines = REGULATORY_CONSTANT_ROWS.map(r =>
    `- ${r.label}: ${r.value}${r.unit ? ` ${r.unit}` : ''}${r.citation ? ` [${r.citation}]` : ''}${r.url ? ` ${r.url}` : ''}`
  );
  return `REGULATORY CONSTANTS (verified, shown read-only on #/pricing)\n${lines.join('\n')}`;
}

function watchlistBlock(): string {
  const lines = REGCHECK_WATCHLIST.map(w => `- [${w.id}] ${w.topic}: ${w.claim} Impact: ${w.appImpact}`);
  return `REGULATORY WATCHLIST (facts the desk tracks; some are open questions)\n${lines.join('\n')}`;
}

function glossaryBlock(): string {
  const lines = GLOSSARY.map(e => {
    const status = TERM_STATUS[e.id] ? ` Status: ${TERM_STATUS[e.id].label} (${TERM_STATUS[e.id].detail})` : '';
    return `- ${e.term} [${e.id}]: ${e.plain}${status}`;
  });
  return `GLOSSARY (${GLOSSARY.length} terms; full entries at #/glossary?term=<id>)\n${lines.join('\n')}`;
}

/** The full pack. Built once per page load; identical across requests for the same app data. */
let cached: string | null = null;
export function buildKnowledgePack(): string {
  if (cached) return cached;
  cached = [
    marketsBlock(),
    constantsBlock(),
    watchlistBlock(),
    `REGULATORY KNOWLEDGE BASE (fact-checked against primary law)\n${getFullKnowledgeContext()}`,
    glossaryBlock(),
  ].join('\n\n');
  return cached;
}
