/**
 * lookup_reference: the full text behind the compact index in the helper's system block (knowledgePack.ts).
 * One query returns the glossary entries, regulatory knowledge-base documents, markets and watchlist items
 * that match it, so the model pays for the detail only when a question needs it.
 */
import { KNOWLEDGE_VAULT_DOCS } from '../auditor/knowledgeBase';
import { MARKETS } from '../markets/registry';
import { REGCHECK_WATCHLIST } from '../regcheck/watchlist';
import { GLOSSARY, normaliseGlossaryText, searchGlossary } from './glossary';
import { TERM_STATUS } from './termStatus';

/** Most results of each kind per call, and the cap on the whole reply (characters). */
const MAX_GLOSSARY = 4;
const MAX_DOCS = 2;
const MAX_MARKETS = 3;
const MAX_WATCH = 3;
const MAX_REPLY_CHARS = 14000;

const wordsOf = (s: string): string[] => normaliseGlossaryText(s).split(/[^a-z0-9]+/).filter(w => w.length > 2);

/** Rank items by how many query words appear in their text; ids and titles named exactly rank first. */
function rank<T>(items: readonly T[], words: string[], text: (t: T) => string, exact: (t: T) => boolean): T[] {
  return items
    .map(item => {
      const hay = normaliseGlossaryText(text(item));
      return { item, score: (exact(item) ? 100 : 0) + words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
}

export function lookupReference(query: string): string {
  const q = query.trim();
  if (!q) throw new Error('query is required: a term, a market id, a law or a topic');
  const nq = normaliseGlossaryText(q);
  const words = wordsOf(q);

  // Glossary: exact term/id/alias matches first, then entries whose text shares words with the query.
  const exactTerms = searchGlossary(q);
  const byText = rank(GLOSSARY, words, e => `${e.term} ${e.aliases.join(' ')} ${e.plain} ${e.whyItMatters}`, () => false);
  const glossary = [...new Set([...exactTerms, ...byText])].slice(0, MAX_GLOSSARY).map(e => ({
    id: e.id, term: e.term, meaning: e.plain, whyItMatters: e.whyItMatters,
    status: TERM_STATUS[e.id] ? `${TERM_STATUS[e.id].label}: ${TERM_STATUS[e.id].detail}` : undefined,
    sources: e.sources.slice(0, 2).map(s => s.url),
  }));

  const docs = rank(KNOWLEDGE_VAULT_DOCS, words, d => `${d.title} ${d.content}`, d => d.id === nq || d.id === q)
    .slice(0, MAX_DOCS)
    .map(d => ({
      id: d.id,
      title: d.title,
      sources: d.sources,
      text: d.content.length > 4500 ? `${d.content.slice(0, 4500)}... [truncated]` : d.content,
    }));

  const markets = rank(MARKETS, words, m => `${m.id} ${m.name} ${m.countryName} ${m.legalBasis} ${m.notes}`, m => m.id.toLowerCase() === nq)
    .slice(0, MAX_MARKETS)
    .map(m => ({
      id: m.id, name: m.name, legalBasis: m.legalBasis, registry: m.registry, notes: m.notes,
      openPoints: (m.uncertainties ?? []).map(u => `${u.title}: ${u.description}`),
    }));

  const watch = rank(REGCHECK_WATCHLIST, words, w => `${w.topic} ${w.claim} ${w.appImpact}`, w => w.id === q)
    .slice(0, MAX_WATCH)
    .map(w => ({ id: w.id, topic: w.topic, claim: w.claim, appImpact: w.appImpact }));

  if (glossary.length + docs.length + markets.length + watch.length === 0) {
    return JSON.stringify({ query: q, note: 'Nothing in the reference matched. Try another word, or answer from web search or general knowledge and say so.' });
  }
  return JSON.stringify({ query: q, glossary, knowledgeBase: docs, markets, watchlist: watch });
}
