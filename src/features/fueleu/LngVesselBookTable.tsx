import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Flame } from 'lucide-react';
import { FUEL_EU_LNG_SHIPS, LngShipRow } from '../../domain/fueleu/lngShipsData';
import { FUEL_EU_SHIPPING_GROUPS } from '../../domain/fueleu/groups';
import { fuelEuPoolBidPriceEurPerTco2e } from '../../domain/assumptions/registry';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { MobileCardList } from '../../shared/ui';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

type SortField = 'name' | 'imo' | 'shipType' | 'group_id' | 'in_scope_lng_t' | 'ghgie' | 'balance2026Tco2e' | 'extraSurplusValueEurAtBid' | 'bioLngNeededTonnes';
type SortDirection = 'asc' | 'desc';

const MOBILE_PAGE = 40;

const SORT_LABELS: Record<SortField, string> = {
  name: 'Ship',
  imo: 'IMO',
  shipType: 'Type',
  group_id: 'Group',
  in_scope_lng_t: 'In-scope LNG (t)',
  ghgie: 'GHGIE',
  balance2026Tco2e: '2026 balance',
  extraSurplusValueEurAtBid: 'Extra surplus (€)',
  bioLngNeededTonnes: 'Bio-LNG to close (t)',
};

export function LngVesselBookTable() {
  const isMobile = useIsMobile();
  const [shown, setShown] = useState(MOBILE_PAGE);
  const [sortField, setSortField] = useState<SortField>('extraSurplusValueEurAtBid');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [deficitOnly, setDeficitOnly] = useState(false);

  const bid = fuelEuPoolBidPriceEurPerTco2e();

  const groupOptions = useMemo(() => {
    const ids = new Set(FUEL_EU_LNG_SHIPS.map(s => s.group_id));
    return FUEL_EU_SHIPPING_GROUPS.filter(g => ids.has(g.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const groupNameById = useMemo(() => {
    const m = new Map<string, string>();
    FUEL_EU_SHIPPING_GROUPS.forEach(g => m.set(g.id, g.name));
    return m;
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' || field === 'imo' || field === 'shipType' || field === 'group_id' ? 'asc' : 'desc');
    }
  };

  const rows = useMemo(() => {
    let list = FUEL_EU_LNG_SHIPS;
    if (groupFilter !== 'ALL') list = list.filter(r => r.group_id === groupFilter);
    if (deficitOnly) list = list.filter(r => r.balance2026Tco2e < 0);
    return [...list].sort((a, b) => {
      const av: any = a[sortField];
      const bv: any = b[sortField];
      if (typeof av === 'string') {
        const cmp = av.localeCompare(bv);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc' ? av - bv : bv - av;
    });
  }, [groupFilter, deficitOnly, sortField, sortDirection]);

  const aggregates = useMemo(() => {
    let surplusCount = 0;
    let deficitCount = 0;
    let totalExtraSurplusTco2e = 0;
    let totalExtraSurplusValueEur = 0;
    let totalBioLngNeededT = 0;
    for (const r of rows) {
      if (r.balance2026Tco2e >= 0) surplusCount++;
      else deficitCount++;
      totalExtraSurplusTco2e += r.extraSurplusIfFullBioLngTco2e;
      totalExtraSurplusValueEur += r.extraSurplusValueEurAtBid;
      totalBioLngNeededT += r.bioLngNeededTonnes;
    }
    return { surplusCount, deficitCount, totalExtraSurplusTco2e, totalExtraSurplusValueEur, totalBioLngNeededT };
  }, [rows]);

  const sortIcon = (field: SortField) =>
    sortField === field ? (
      sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
    ) : (
      <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
    );

  const th = (label: string, field: SortField, align: 'left' | 'right' | 'center' = 'right', width?: string, title?: string) => (
    <th
      style={{ width, textAlign: align, padding: '8px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
      onClick={() => handleSort(field)}
      title={title}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start', gap: '4px', width: '100%' }}>
        <span>{label}</span>
        {sortIcon(field)}
      </div>
    </th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        style={{
          padding: '10px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          fontSize: '11.5px',
          color: 'var(--color-text)',
          lineHeight: 1.5,
        }}
      >
        <strong>LNG-capable ships are the only physical Bio-LNG buyers.</strong>{' '}
        <span style={{ color: 'var(--color-muted)' }}>
          Most already run in surplus on fossil LNG; switching to Bio-LNG enlarges the surplus they can sell into pools.
        </span>
      </div>

      {/* Aggregate ledger strip */}
      <div className="fe-lng-agg" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ padding: '10px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>LNG SHIPS IN VIEW</span>
          <div className="num font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>{rows.length.toLocaleString()}</div>
          <div className="subttl" style={{ fontSize: '10.5px', marginTop: '2px' }}>{aggregates.surplusCount} surplus · {aggregates.deficitCount} deficit</div>
        </div>
        <div style={{ padding: '10px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>EXTRA SURPLUS IF 100% BIO-LNG</span>
          <div className="num font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px', color: 'var(--color-status-pos-text)' }}>
            {(aggregates.totalExtraSurplusTco2e / 1000).toFixed(1)} kt
          </div>
          <div className="subttl" style={{ fontSize: '10.5px', marginTop: '2px' }}>tCO2e, vs fossil LNG baseline</div>
        </div>
        <div style={{ padding: '10px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>VALUE AT LIVE BID</span>
          <div className="num font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px', color: 'var(--color-status-pos-text)' }}>
            €{(aggregates.totalExtraSurplusValueEur / 1e6).toFixed(1)}M
          </div>
          <div className="subttl" style={{ fontSize: '10.5px', marginTop: '2px' }}>€{bid.toFixed(2)}/tCO2e desk bid — indicative</div>
        </div>
        <div style={{ padding: '10px 18px' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>BIO-LNG NEEDED TO CLOSE DEFICITS</span>
          <div className="num font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px', color: 'var(--color-status-warn-text, #d97706)' }}>
            {aggregates.totalBioLngNeededT.toLocaleString(undefined, { maximumFractionDigits: 0 })} t
          </div>
          <div className="subttl" style={{ fontSize: '10.5px', marginTop: '2px' }}>{aggregates.deficitCount} ships in deficit</div>
        </div>
      </div>

      {/* Filters */}
      <div className="fe-lng-filters" style={{ padding: '8px 18px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="input"
          style={{ width: 'auto', minWidth: '180px', height: '30px', minHeight: '30px', fontSize: '11.5px', padding: '0 8px' }}
          aria-label="Filter by shipping group"
        >
          <option value="ALL">All Groups ({groupOptions.length})</option>
          {groupOptions.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <button
          type="button"
          className={`chip ${deficitOnly ? 'chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '4px 9px' }}
          onClick={() => setDeficitOnly(prev => !prev)}
        >
          Deficit ships only ({FUEL_EU_LNG_SHIPS.filter(r => r.balance2026Tco2e < 0).length})
        </button>
        {isMobile && (
          <div className="fe-lng-sort">
            <select
              value={sortField}
              onChange={e => { setShown(MOBILE_PAGE); handleSort(e.target.value as SortField); }}
              className="input"
              aria-label="Sort ships by"
            >
              {(Object.keys(SORT_LABELS) as SortField[]).map(f => (
                <option key={f} value={f}>Sort: {SORT_LABELS[f]}</option>
              ))}
            </select>
            <button
              type="button"
              className="chip"
              aria-label={sortDirection === 'asc' ? 'Ascending, tap for descending' : 'Descending, tap for ascending'}
              onClick={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
            >
              {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </button>
          </div>
        )}
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', marginLeft: 'auto' }}>
          Showing <strong>{rows.length}</strong> of {FUEL_EU_LNG_SHIPS.length} LNG-capable ships
        </span>
      </div>

      {isMobile ? (
        <div className="fe-lng-cards">
          <MobileCardList
            testId="fe-lng-cards"
            items={rows.slice(0, shown)}
            getKey={r => `${r.imo}-${r.company_imo}-${rows.indexOf(r)}`}
            title={r => (
              <>
                <Flame size={12} style={{ color: '#059669', marginRight: '4px', verticalAlign: 'middle' }} />
                {r.name}
              </>
            )}
            subtitle={r => `${r.shipType} · ${groupNameById.get(r.group_id) || r.group_id}`}
            metric={r => `${r.balance2026Tco2e < 0 ? '' : '+'}${r.balance2026Tco2e.toLocaleString()}`}
            metricLabel={() => '2026 balance (tCO2e)'}
            fields={r => {
              const isDeficit = r.balance2026Tco2e < 0;
              return [
                { label: 'IMO', value: r.imo, mono: true },
                { label: 'In-scope LNG (t)', value: r.in_scope_lng_t.toLocaleString(), mono: true },
                { label: 'GHGIE', value: r.ghgie.toFixed(2), mono: true },
                { label: 'Extra surplus (t)', value: `+${r.extraSurplusIfFullBioLngTco2e.toLocaleString()}`, mono: true, tone: 'pos' },
                { label: 'Extra surplus (€)', value: `€${r.extraSurplusValueEurAtBid.toLocaleString()}`, mono: true, tone: 'pos' },
                { label: 'Bio-LNG to close (t)', value: isDeficit ? r.bioLngNeededTonnes.toLocaleString() : '—', mono: true, tone: isDeficit ? 'warn' : 'muted' },
              ];
            }}
            empty="No LNG ships match the current filters."
          />
          {rows.length > shown && (
            <button type="button" className="btn btn-secondary fe-lng-more" onClick={() => setShown(n => n + MOBILE_PAGE)}>
              Show more ({rows.length - shown} remaining)
            </button>
          )}
        </div>
      ) : (
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="table" style={{ width: '100%', margin: 0 }}>
          <thead>
            <tr>
              {th('SHIP', 'name', 'left', '200px')}
              {th('IMO', 'imo', 'left', '90px')}
              {th('TYPE', 'shipType', 'left', '140px')}
              {th('GROUP', 'group_id', 'left', '170px')}
              {th('IN-SCOPE LNG (t)', 'in_scope_lng_t', 'right', '130px')}
              {th('GHGIE', 'ghgie', 'right', '90px', 'Achieved GHG intensity, gCO2e/MJ')}
              {th('2026 BALANCE', 'balance2026Tco2e', 'right', '120px', 'FuelEU compliance balance, tCO2e (+ surplus / − deficit)')}
              {th('EXTRA SURPLUS (t)', 'extraSurplusValueEurAtBid', 'right', '130px', 'Additional compliance surplus, tCO2e, if 100% of in-scope LNG were -100 CI Bio-LNG')}
              <th style={{ width: '120px', textAlign: 'right', padding: '8px 8px', whiteSpace: 'nowrap' }} title="Extra surplus value at the live desk bid">
                EXTRA SURPLUS (€)
              </th>
              {th('BIO-LNG TO CLOSE (t)', 'bioLngNeededTonnes', 'right', '140px', 'Bio-LNG needed to bring the 2026 balance to zero — only non-zero for ships in deficit')}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: LngShipRow, idx: number) => {
              const isDeficit = r.balance2026Tco2e < 0;
              // Some EU MRV ships report under more than one company_imo/group_id in a period, so
              // `imo` alone is not always unique in this dataset — key on the row's rendered
              // position as well to avoid React duplicate-key warnings without hand-editing the
              // generated data file.
              return (
                <tr key={`${r.imo}-${r.company_imo}-${idx}`}>
                  <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: '12px' }}>
                    <Flame size={10} style={{ color: '#059669', marginRight: '4px', verticalAlign: 'middle' }} />
                    {r.name}
                  </td>
                  <td className="num font-mono" style={{ padding: '6px 8px', fontSize: '11px', fontFamily: MONO_FONT }}>{r.imo}</td>
                  <td style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--color-muted)' }}>{r.shipType}</td>
                  <td style={{ padding: '6px 8px', fontSize: '11px' }}>{groupNameById.get(r.group_id) || r.group_id}</td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px' }}>{r.in_scope_lng_t.toLocaleString()}</td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px' }}>{r.ghgie.toFixed(2)}</td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px', fontWeight: 700, color: isDeficit ? 'var(--color-status-neg-text)' : 'var(--color-status-pos-text)' }}>
                    {isDeficit ? '' : '+'}{r.balance2026Tco2e.toLocaleString()}
                  </td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px', color: 'var(--color-status-pos-text)' }}>
                    +{r.extraSurplusIfFullBioLngTco2e.toLocaleString()}
                  </td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px', fontWeight: 700, color: 'var(--color-status-pos-text)' }}>
                    €{r.extraSurplusValueEurAtBid.toLocaleString()}
                  </td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px', color: isDeficit ? 'var(--color-status-warn-text, #d97706)' : 'var(--color-muted)' }}>
                    {isDeficit ? r.bioLngNeededTonnes.toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
