import React, { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ExternalLink, Search } from 'lucide-react';
import { GLOSSARY, GlossaryEntry, GLOSSARY_BY_ID, normaliseGlossaryText, searchGlossary } from '../../domain/help/glossary';
import './glossary.css';

/** First letter of the term for the A–Z grouping; anything that is not a letter files under #. */
function letterOf(term: string): string {
  const first = normaliseGlossaryText(term).charAt(0).toUpperCase();
  return first >= 'A' && first <= 'Z' ? first : '#';
}

/** A ?term= value may be an entry id or one of its terms or aliases (so #/glossary?term=HHV works). */
function resolveTermParam(param: string | null): string | null {
  if (!param) return null;
  const q = normaliseGlossaryText(param);
  if (GLOSSARY_BY_ID[q]) return q;
  const hit = GLOSSARY.find(e => normaliseGlossaryText(e.term) === q || e.aliases.some(a => normaliseGlossaryText(a) === q));
  return hit ? hit.id : null;
}

function EntryCard({ entry, open, onToggle }: { entry: GlossaryEntry; open: boolean; onToggle: () => void }) {
  const bodyId = `gl-body-${entry.id}`;
  return (
    <article id={`gl-${entry.id}`} className={`gl-entry ${open ? 'gl-entry--open' : ''}`} data-testid={`glossary-entry-${entry.id}`}>
      <button type="button" className="gl-entry-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="gl-entry-titles">
          <span className="gl-term">{entry.term}</span>
          <span className="gl-short">{entry.short}</span>
        </span>
        <ChevronDown size={16} className="gl-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div id={bodyId} className="gl-entry-body">
          <p className="gl-plain">{entry.plain}</p>

          <div className="gl-block">
            <div className="eyebrow">Why it matters</div>
            <p className="gl-why">{entry.whyItMatters}</p>
          </div>

          {entry.aliases.length > 0 && (
            <p className="gl-aliases mut">
              <span className="gl-label">Also called:</span> {entry.aliases.join(' · ')}
            </p>
          )}

          {entry.appLinks.length > 0 && (
            <div className="gl-block">
              <div className="eyebrow">Where in the app</div>
              <ul className="gl-links">
                {entry.appLinks.map(l => (
                  <li key={`${l.route}-${l.label}`}>
                    <Link to={l.route}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.sources.length > 0 && (
            <div className="gl-block">
              <div className="eyebrow">Sources</div>
              <ul className="gl-links">
                {entry.sources.map(s => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label} <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.related.length > 0 && (
            <div className="gl-block">
              <div className="eyebrow">Related terms</div>
              <div className="gl-related">
                {entry.related.map(id => {
                  const rel = GLOSSARY_BY_ID[id];
                  return rel ? (
                    <Link key={id} to={`/glossary?term=${id}`} className="chip">
                      {rel.term}
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * The glossary: every term the desk uses, searchable offline (no AI, no network). Entries are grouped
 * A–Z; a link like #/glossary?term=gge opens and scrolls to one. The data lives in domain/help/glossary.ts.
 */
export function GlossaryScreen() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const openId = resolveTermParam(params.get('term'));
  const scrolledFor = useRef<string | null>(null);

  const results = useMemo(
    () => searchGlossary(query).sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })),
    [query]
  );

  const groups = useMemo(() => {
    const map = new Map<string, GlossaryEntry[]>();
    for (const e of results) {
      const l = letterOf(e.term);
      map.set(l, [...(map.get(l) ?? []), e]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  }, [results]);

  // Open the deep-linked entry and bring it into view once; an entry the search filtered out stays closed.
  const visibleOpenId = openId && results.some(e => e.id === openId) ? openId : null;
  useEffect(() => {
    if (!visibleOpenId || scrolledFor.current === visibleOpenId) return;
    scrolledFor.current = visibleOpenId;
    document.getElementById(`gl-${visibleOpenId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [visibleOpenId]);

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const toggle = (id: string) => {
    const next = new URLSearchParams(params);
    if (openId === id) next.delete('term');
    else next.set('term', id);
    setParams(next, { replace: true });
  };

  const jump = (letter: string) => document.getElementById(`gl-group-${letter}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  return (
    <div className="gl-page" data-testid="glossary-page">
      <header className="gl-head">
        <div>
          <h1 className="gl-title font-heading">Glossary</h1>
          <p className="gl-sub mut">
            What each term means and why it matters on a deal. Works offline: search matches terms and abbreviations, such as HHV or GvO.
          </p>
        </div>
        <label className="gl-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            className="input"
            placeholder="Search terms, e.g. THG, GO, HHV"
            aria-label="Search the glossary"
            value={query}
            onChange={e => setQuery(e.target.value)}
            data-testid="glossary-search"
          />
        </label>
      </header>

      <div className="gl-bar">
        <span className="gl-count mut" data-testid="glossary-count">
          {results.length} {results.length === 1 ? 'term' : 'terms'}{query ? ` matching “${query}”` : ''}
        </span>
        <nav className="gl-az" aria-label="Jump to letter">
          {groups.map(([letter]) => (
            <button key={letter} type="button" className="gl-az-btn" onClick={() => jump(letter)}>
              {letter}
            </button>
          ))}
        </nav>
      </div>

      {groups.length === 0 ? (
        <div className="mc-empty" data-testid="glossary-empty">
          No term matches “{query}”. Try an abbreviation, or clear the search.
        </div>
      ) : (
        groups.map(([letter, entries]) => (
          <section key={letter} id={`gl-group-${letter}`} className="gl-group" aria-label={`Terms starting with ${letter}`}>
            <h2 className="gl-letter font-heading">{letter}</h2>
            <div className="gl-list">
              {entries.map(e => (
                <EntryCard key={e.id} entry={e} open={visibleOpenId === e.id} onToggle={() => toggle(e.id)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
