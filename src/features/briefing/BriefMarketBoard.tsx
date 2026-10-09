import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BriefMark } from '../../domain/briefing/morningBrief';
import { STALE_MARK_DAYS, VERY_STALE_MARK_DAYS } from '../../domain/markets/constants';
import { SIMULATED_SOURCE_NAME } from '../../domain/marks/simulate';
import { Chips, pctOf, SortTh, type SortState, fmt2, fmtPrice, sortRows } from './briefUi';
import { sourceColour } from './BriefHero';

type Cat = 'ALL' | 'COMPLIANCE' | 'VOLUNTARY' | 'EMERGING' | 'STALE' | 'ESTIMATE';
type Key = 'shortName' | 'category' | 'bid' | 'offer' | 'mid' | 'spreadPct' | 'sourceType' | 'ageDays';

const ageColour = (d: number | null) =>
  d === null ? 'var(--bf-muted)' : d <= STALE_MARK_DAYS ? 'var(--color-status-pass-text)' : d <= VERY_STALE_MARK_DAYS ? 'var(--color-status-warn-text)' : 'var(--color-status-neg-text)';

function sourceLabel(m: BriefMark): string {
  if (m.sourceName === SIMULATED_SOURCE_NAME) return 'simulated seed';
  const type = (m.sourceType ?? 'no source').toLowerCase().replace(/_/g, ' ');
  if (!m.sourceName) return type;
  return `${type} · ${m.sourceName.length > 28 ? m.sourceName.slice(0, 27) + '…' : m.sourceName}`;
}

export function BriefMarketBoard({ marks, query, onQuery }: { marks: BriefMark[]; query: string; onQuery: (q: string) => void }) {
  const navigate = useNavigate();
  const [cat, setCat] = useState<Cat>('ALL');
  const [sort, setSort] = useState<SortState<Key>>({ key: 'ageDays', dir: 1 });
  const maxAge = Math.max(VERY_STALE_MARK_DAYS * 2, ...marks.map(m => m.ageDays ?? 0));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = marks.filter(m =>
      (cat === 'ALL' || (cat === 'STALE' ? m.freshness === 'STALE' || m.freshness === 'VERY_STALE' : cat === 'ESTIMATE' ? m.isEstimate : m.category === cat)) &&
      (!q || [m.shortName, m.name, m.country, m.sourceName ?? ''].join(' ').toLowerCase().includes(q)));
    return sortRows(filtered, sort);
  }, [marks, cat, sort, query]);

  const n = (c: Cat) => marks.filter(m => c === 'STALE' ? m.freshness === 'STALE' || m.freshness === 'VERY_STALE' : c === 'ESTIMATE' ? m.isEstimate : m.category === c).length;

  return (
    <section className="bf-sec" id="board">
      <h2>Market board</h2>
      <p className="lede">Every mark on the desk, where it came from and how old it is — green ≤ {STALE_MARK_DAYS} days, amber ≤ {VERY_STALE_MARK_DAYS}, red older. Click a row to edit it on the Pricing desk.</p>
      <div className="bf-card bf-rise">
        <div className="bf-row">
          <Chips<Cat> label="Market type" value={cat} onChange={setCat} options={[
            ['ALL', `All (${marks.length})`], ['COMPLIANCE', `Compliance (${n('COMPLIANCE')})`], ['VOLUNTARY', `Voluntary (${n('VOLUNTARY')})`],
            ['EMERGING', `Emerging (${n('EMERGING')})`], ['STALE', `Over a week (${n('STALE')})`], ['ESTIMATE', `Estimates (${n('ESTIMATE')})`],
          ]} />
          <input className="bf-search" type="search" placeholder="Search markets, countries, sources…" aria-label="Search markets" value={query} onChange={e => onQuery(e.target.value)} />
        </div>
        <div className="bf-tablebox">
          <table>
            <thead><tr>
              <SortTh label="Market" k="shortName" sort={sort} onSort={setSort} textFirst />
              <SortTh label="Type" k="category" sort={sort} onSort={setSort} className="hide-sm" textFirst />
              <SortTh label="Bid" k="bid" sort={sort} onSort={setSort} className="r" />
              <SortTh label="Offer" k="offer" sort={sort} onSort={setSort} className="r" />
              <SortTh label="Mid" k="mid" sort={sort} onSort={setSort} className="r" />
              <th>Unit</th>
              <SortTh label="Spread %" k="spreadPct" sort={sort} onSort={setSort} className="r hide-sm" />
              <SortTh label="Source" k="sourceType" sort={sort} onSort={setSort} textFirst />
              <SortTh label="Age (days)" k="ageDays" sort={sort} onSort={setSort} className="r" />
            </tr></thead>
            <tbody>
              {list.map(m => (
                <tr key={m.marketId} className="clickable" title={`${m.name} — ${m.sourceName ?? 'no source'}`} onClick={() => navigate('/pricing')}>
                  <td style={{ fontWeight: 600 }}>{m.shortName}</td>
                  <td className="hide-sm muted">{m.category.toLowerCase()}</td>
                  <td className="r mono">{fmtPrice(m.bid)}</td>
                  <td className="r mono">{fmtPrice(m.offer)}</td>
                  <td className="r mono">{fmtPrice(m.mid)}</td>
                  <td className="muted">{m.unitLabel}</td>
                  <td className="r mono hide-sm">{fmt2(m.spreadPct)}</td>
                  <td><span className="bf-dot" style={{ background: sourceColour(m.sourceType), marginRight: 6 }} />{sourceLabel(m)}</td>
                  <td className="r">
                    <span className="age">
                      <span className="agebar"><i style={{ width: pctOf(m.ageDays, maxAge), background: ageColour(m.ageDays) }} /></span>
                      <span style={{ color: ageColour(m.ageDays) }}>{m.ageDays ?? '—'}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="bf-empty">No marks match.</div>}
        </div>
      </div>
    </section>
  );
}
