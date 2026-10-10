import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GLOSSARY_BY_ID } from '../../domain/help/glossary';
import { termStatus } from '../../domain/help/termStatus';
import { TermStatusBadge } from './TermStatusBadge';
import './term.css';

/**
 * A glossary term in running UI text: a subtle dotted underline that shows the one-line definition
 * (and legal status, if any) on hover, keyboard focus or tap, with a link to the full entry.
 * Use it on the first mention of a term on a screen, not on every mention.
 */
export function Term({ id, children }: { id: string; children: React.ReactNode }) {
  const entry = GLOSSARY_BY_ID[id];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Unknown id: render the text unchanged rather than break the screen (a test guards the ids used).
  if (!entry) return <>{children}</>;
  const status = termStatus(id);

  return (
    <span ref={ref} className={`term-ref ${open ? 'term-ref--open' : ''}`} data-testid={`term-${id}`}>
      <button
        type="button"
        className="term-ref-btn"
        aria-expanded={open}
        aria-describedby={popId}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
      >
        {children}
      </button>
      <span id={popId} role="tooltip" className="term-pop">
        <span className="term-pop-head">
          <strong>{entry.term}</strong>
          {status && <TermStatusBadge status={status} />}
        </span>
        <span className="term-pop-short">{entry.short}</span>
        <Link to={`/glossary?term=${entry.id}`} className="term-pop-link" onClick={() => setOpen(false)}>Open in glossary →</Link>
      </span>
    </span>
  );
}
