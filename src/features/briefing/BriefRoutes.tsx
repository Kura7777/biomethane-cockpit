import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BriefRoutes as Routes } from '../../domain/briefing/morningBrief';
import { pctOf, SortTh, type SortState, fmt0, fmt2, sortRows } from './briefUi';

type Key = 'originCountryName' | 'marketName' | 'valueStackEurPerMWh' | 'transitEurPerMWh' | 'deskMarginEurPerMWh' | 'dealProfitEur';

export function BriefRoutes({ routes, feedstockName }: { routes: Routes; feedstockName: string }) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('ALL');
  const [sort, setSort] = useState<SortState<Key>>({ key: 'deskMarginEurPerMWh', dir: -1 });
  const origins = useMemo(
    () => [...new Map(routes.tradeable.map(r => [r.originCountry, `${r.originFlag} ${r.originCountryName}`])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [routes.tradeable],
  );
  const list = useMemo(() => {
    const rows = sortRows(routes.tradeable.filter(r => origin === 'ALL' || r.originCountry === origin), sort);
    return origin === 'ALL' ? rows.slice(0, 30) : rows;
  }, [routes.tradeable, origin, sort]);
  const maxMargin = Math.max(1, ...list.map(r => r.deskMarginEurPerMWh ?? 0));

  return (
    <section className="bf-sec" id="routes">
      <h2>Best routes · {feedstockName}, {fmt0(routes.volumeMWh / 1000)} GWh</h2>
      <p className="lede">Every producing origin priced into every active market. Tradeable routes ranked by desk margin; click one to work it in Origination.</p>
      <div className="bf-card bf-rise">
        <div className="bf-row">
          <label className="cap muted" htmlFor="bf-origin">Origin</label>
          <select id="bf-origin" className="bf-search" style={{ flex: '0 1 220px' }} value={origin} onChange={e => setOrigin(e.target.value)}>
            <option value="ALL">All origins</option>
            {origins.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <span className="cap muted">{routes.tradeable.length} tradeable · {routes.blockedCount} blocked{origin === 'ALL' && routes.tradeable.length > 30 ? ' · top 30 shown' : ''}</span>
        </div>
        <div className="bf-tablebox" style={{ maxHeight: 420 }}>
          <table>
            <thead><tr>
              <SortTh label="Origin" k="originCountryName" sort={sort} onSort={setSort} textFirst />
              <SortTh label="Market" k="marketName" sort={sort} onSort={setSort} textFirst />
              <SortTh label="Value stack" k="valueStackEurPerMWh" sort={sort} onSort={setSort} className="r" />
              <SortTh label="Transit" k="transitEurPerMWh" sort={sort} onSort={setSort} className="r hide-sm" />
              <SortTh label="Margin €/MWh" k="deskMarginEurPerMWh" sort={sort} onSort={setSort} className="r" />
              <SortTh label="Deal P&L" k="dealProfitEur" sort={sort} onSort={setSort} className="r" />
            </tr></thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id} className="clickable" title={r.keyRisk ?? undefined} onClick={() => navigate('/sourcing')}>
                  <td>{r.originFlag} {r.originCountryName}</td>
                  <td>{r.marketName}{r.keyRisk ? ' ⚠' : ''}</td>
                  <td className="r mono">{fmt2(r.valueStackEurPerMWh)}</td>
                  <td className="r mono muted hide-sm">{fmt2(r.transitEurPerMWh)}</td>
                  <td className="r mono marginbar" style={{ backgroundImage: 'linear-gradient(color-mix(in srgb, var(--bf-c1) 20%, transparent), color-mix(in srgb, var(--bf-c1) 20%, transparent))', backgroundSize: `${pctOf(r.deskMarginEurPerMWh, maxMargin)} 70%` }}>
                    {fmt2(r.deskMarginEurPerMWh)}
                  </td>
                  <td className="r mono">{r.dealProfitEur === null ? '—' : `€${fmt0(r.dealProfitEur)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="bf-empty">No tradeable route on today's marks.</div>}
        </div>
      </div>
    </section>
  );
}
