import React, { useMemo, useState } from 'react';
import type { BriefBookRow } from '../../domain/briefing/morningBrief';
import { Chips, SortTh, type SortState, fmt1, fmt2, sortRows } from './briefUi';

type Key = 'country' | 'product' | 'feedstock' | 'vintage' | 'bidEurMwh' | 'offerEurMwh' | 'offerGWh';

export function BriefOrderBook({ rows }: { rows: BriefBookRow[] }) {
  const [prod, setProd] = useState('ALL');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortState<Key>>({ key: 'offerEurMwh', dir: 1 });

  const products = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.product, (counts.get(r.product) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rows]);
  const prices = rows.flatMap(r => [r.bidEurMwh, r.offerEurMwh]).filter((v): v is number => v !== null);
  const lo = prices.length ? Math.min(...prices) : 0;
  const hi = prices.length ? Math.max(...prices) : 1;
  const pc = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return sortRows(rows.filter(r =>
      (prod === 'ALL' || (prod === 'HOT' ? r.highInterest : r.product === prod)) &&
      (!s || [r.country, r.product, r.feedstock, r.vintage, r.ci].join(' ').toLowerCase().includes(s))), sort);
  }, [rows, prod, q, sort]);

  return (
    <section className="bf-sec" id="book">
      <h2>Broker order book</h2>
      <p className="lede">Bids and offers from your pricing book, normalised to €/MWh on one shared scale from the lowest to the highest price in the book (<span style={{ color: 'var(--bf-c3)' }}>●</span> bid, <span style={{ color: 'var(--bf-c2)' }}>●</span> offer). Bold rows are flagged high-interest.</p>
      <div className="bf-card bf-rise">
        <div className="bf-row">
          <Chips label="Product" value={prod} onChange={setProd} options={[
            ['ALL', `All (${rows.length})`], ['HOT', `High interest (${rows.filter(r => r.highInterest).length})`],
            ...products.map(([p, n]) => [p, `${p} (${n})`] as [string, string]),
          ]} />
          <input className="bf-search" type="search" placeholder="Filter country, feedstock, vintage…" aria-label="Filter order book" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="bf-tablebox">
          <table>
            <thead><tr>
              <SortTh label="Country" k="country" sort={sort} onSort={setSort} textFirst />
              <SortTh label="Product" k="product" sort={sort} onSort={setSort} textFirst />
              <SortTh label="Feedstock" k="feedstock" sort={sort} onSort={setSort} className="hide-sm" textFirst />
              <SortTh label="Vintage" k="vintage" sort={sort} onSort={setSort} textFirst />
              <th className="hide-sm">CI</th>
              <SortTh label="Bid €/MWh" k="bidEurMwh" sort={sort} onSort={setSort} className="r" />
              <SortTh label="Offer €/MWh" k="offerEurMwh" sort={sort} onSort={setSort} className="r" />
              <th>Bid → offer</th>
              <SortTh label="Offer GWh" k="offerGWh" sort={sort} onSort={setSort} className="r hide-sm" />
            </tr></thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id} className={r.highInterest ? 'hot' : undefined}>
                  <td>{r.country}</td>
                  <td>{r.product}</td>
                  <td className="hide-sm">{r.feedstock || '—'}</td>
                  <td>{r.vintage || '—'}</td>
                  <td className="hide-sm muted">{r.ci || '—'}</td>
                  <td className="r mono">{fmt2(r.bidEurMwh)}</td>
                  <td className="r mono">{fmt2(r.offerEurMwh)}</td>
                  <td>
                    <div className="rng">
                      {r.bidEurMwh !== null && r.offerEurMwh !== null && (
                        <span className="ln" style={{ left: pc(Math.min(r.bidEurMwh, r.offerEurMwh)), width: pc(Math.abs(r.offerEurMwh - r.bidEurMwh)) }} />
                      )}
                      {r.bidEurMwh !== null && <span className="b" style={{ left: pc(r.bidEurMwh), background: 'var(--bf-c3)' }} />}
                      {r.offerEurMwh !== null && <span className="o" style={{ left: pc(r.offerEurMwh), background: 'var(--bf-c2)' }} />}
                    </div>
                  </td>
                  <td className="r mono hide-sm">{fmt1(r.offerGWh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="bf-empty">No rows match.</div>}
        </div>
      </div>
    </section>
  );
}
