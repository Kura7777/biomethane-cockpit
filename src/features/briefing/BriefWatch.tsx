import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { REGCHECK_WATCHLIST } from '../../domain/regcheck/watchlist';
import { getDaysSinceChecked, getLastRegcheckReport, isRegcheckStale } from '../../domain/regcheck/storage';
import type { WatchItem } from '../../domain/regcheck/types';
import { Chips } from './briefUi';

export function BriefWatch() {
  const navigate = useNavigate();
  const [type, setType] = useState('ALL');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const report = getLastRegcheckReport();
  const stale = isRegcheckStale(report);
  const kind = (w: WatchItem) => w.watchType ?? 'fact';
  const KIND_LABEL: Record<string, string> = { fact: 'Fact', open_question: 'Open question' };
  const types = [...new Set(REGCHECK_WATCHLIST.map(kind))];
  const list = REGCHECK_WATCHLIST.filter(w => type === 'ALL' || kind(w) === type);

  return (
    <section className="bf-sec" id="watch">
      <h2>Regulatory watch</h2>
      <p className="lede">
        The statutory facts the desk's rules depend on. Click a card for what it changes.{' '}
        {report ? (
          <span className={stale ? 'warn' : 'ok'}>Last checked {getDaysSinceChecked(report.checkedAt)} days ago{stale ? ' — due again' : ''}.</span>
        ) : (
          <span className="warn">Never checked.</span>
        )}{' '}
        <button type="button" className="bf-link" onClick={() => navigate('/regulation-check')}>Open Regulation check</button>
      </p>
      <div className="bf-row">
        <Chips label="Watch type" value={type} onChange={setType}
          options={[['ALL', `All (${REGCHECK_WATCHLIST.length})`], ...types.map(t => [t, `${KIND_LABEL[t] ?? t} (${REGCHECK_WATCHLIST.filter(w => kind(w) === t).length})`] as [string, string])]} />
      </div>
      <div className="bf-watch">
        {list.map((w, i) => {
          const isOpen = open.has(w.id);
          return (
            <button key={w.id} type="button" className="bf-w bf-rise" style={{ animationDelay: `${i * 25}ms` }} aria-expanded={isOpen}
              onClick={() => setOpen(prev => { const next = new Set(prev); if (next.has(w.id)) next.delete(w.id); else next.add(w.id); return next; })}>
              <span className="cap muted">{KIND_LABEL[kind(w)] ?? kind(w)}{w.sources[0] ? ` · ${w.sources[0].label}` : ''}</span>
              <span className="t">{w.topic}</span>
              <span className="c">{w.claim}</span>
              <span className="imp">What it changes: {w.appImpact}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
