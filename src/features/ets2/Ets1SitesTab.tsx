import React, { useMemo, useState } from 'react';
import { Card, KpiRow, KpiTile } from '../../shared/ui';
import { useAppState } from '../../store/context';
import {
  ETS1_SITES,
  ETS1_LATEST_YEAR,
  ETS1_PREVIOUS_YEAR,
  ETS1_SOURCE_URL,
  SECTOR_LABEL,
  Ets1Sector,
  BiomethaneFit,
  groupSitesByCompany,
  ets1AvoidedValuePerMWh,
  biomethaneMWhToAbate,
} from '../../domain/ets1/sites';
import { selectMarkPrice } from '../../domain/netback/engine';
import { showToast } from '../../app/DeskToastContainer';

type View = 'COMPANIES' | 'SITES';
type Status = 'NOT_CONTACTED' | 'CONTACTED' | 'MEETING' | 'PIPELINE' | 'NOT_A_FIT';

const STATUS_LABEL: Record<Status, string> = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'Contacted',
  MEETING: 'Meeting held',
  PIPELINE: 'In pipeline',
  NOT_A_FIT: 'Not a fit',
};
const STATUS_KEY = 'biomethane_ets1_outreach_v1';
const PAGE = 100;
/** Share of a company's fit emissions used for the "what a first deal looks like" column. */
const FIRST_DEAL_SHARE_PCT = 10;
const PERCENT = 100;
const MWH_PER_GWH = 1000;
const EUR_PER_EUR_M = 1_000_000;

const FIT_LABEL: Record<BiomethaneFit, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

function readStatuses(): Record<string, Status> {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Status>) : {};
  } catch {
    return {};
  }
}

function writeStatuses(s: Record<string, Status>): void {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: statuses last for this session only.
  }
}

function num(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function kt(t: number): string {
  return Math.round(t).toLocaleString('en-GB');
}

function csvCell(v: string | number | null): string {
  if (v === null) return '';
  const t = String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function Ets1SitesTab() {
  const { state } = useAppState();
  const deskEua = selectMarkPrice(state.marks.marks['EU_ETS1'], 'mid');
  const [euaText, setEuaText] = useState(deskEua !== null ? String(deskEua) : '');
  const eua = num(euaText);

  const [view, setView] = useState<View>('COMPANIES');
  const [country, setCountry] = useState('ALL');
  const [sector, setSector] = useState<'ALL' | Ets1Sector>('ALL');
  const [fit, setFit] = useState<'ALL' | BiomethaneFit | 'HIGH_MEDIUM'>('HIGH');
  const [search, setSearch] = useState('');
  const [minKt, setMinKt] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [statuses, setStatuses] = useState<Record<string, Status>>(readStatuses);

  // Value per MWh from the pricing authority, at the price in the box (not only the desk mark).
  const avoidedPerMWh = useMemo(() => {
    if (eua === null) return null;
    const mark = { marketId: 'EU_ETS1', bid: eua, offer: eua, mid: eua, updatedAt: null, source: 'ETS1 tab scenario' };
    return ets1AvoidedValuePerMWh({ ...state.marks, marks: { ...state.marks.marks, EU_ETS1: mark } });
  }, [eua, state.marks]);

  const countries = useMemo(() => [...new Set(ETS1_SITES.map(s => s.country))].sort(), []);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minT = num(minKt);
    return ETS1_SITES.filter(s =>
      (country === 'ALL' || s.country === country) &&
      (sector === 'ALL' || s.sector === sector) &&
      (fit === 'ALL' || (fit === 'HIGH_MEDIUM' ? s.fit !== 'LOW' : s.fit === fit)) &&
      (minT === null || s.verifiedLatestTco2 >= minT * 1000) &&
      (!q || s.name.toLowerCase().includes(q) || s.operator.toLowerCase().includes(q) || (s.parentCompany ?? '').toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
    );
  }, [country, sector, fit, search, minKt]);

  const companies = useMemo(() => groupSitesByCompany(filteredSites), [filteredSites]);
  const totalT = filteredSites.reduce((sum, s) => sum + s.verifiedLatestTco2, 0);

  const setStatus = (key: string, s: Status) => {
    const next = { ...statuses, [key]: s };
    setStatuses(next);
    writeStatuses(next);
  };

  const firstDeal = (fitT: number) => {
    const t = (fitT * FIRST_DEAL_SHARE_PCT) / PERCENT;
    const mwh = biomethaneMWhToAbate(t);
    return { gwh: mwh / MWH_PER_GWH, saving: avoidedPerMWh === null ? null : mwh * avoidedPerMWh };
  };

  const exportCsv = () => {
    const lines: string[] = [];
    if (view === 'COMPANIES') {
      lines.push(['Company', 'Operators', 'Countries', 'Sectors', 'Biomethane fit', 'Sites', `Verified ${ETS1_LATEST_YEAR} tCO2`, 'Fit-site tCO2', `Allowance cost €m at €${eua ?? ''}/t`, 'Status'].join(','));
      for (const c of companies) {
        lines.push([
          c.name, c.operators.join('; '), c.countries.join(' '), c.sectors.map(s => SECTOR_LABEL[s]).join('; '), FIT_LABEL[c.fit], c.sites.length,
          Math.round(c.verifiedLatestTco2), Math.round(c.fitVerifiedLatestTco2),
          eua === null ? null : Math.round((c.verifiedLatestTco2 * eua) / EUR_PER_EUR_M), STATUS_LABEL[statuses[c.key] ?? 'NOT_CONTACTED'],
        ].map(csvCell).join(','));
      }
    } else {
      lines.push(['Site', 'Operator', 'Parent', 'City', 'Country', 'Sector', 'Fit', 'NACE', `Verified ${ETS1_LATEST_YEAR} tCO2`, `Verified ${ETS1_PREVIOUS_YEAR} tCO2`, 'EUTL id'].join(','));
      for (const s of filteredSites) {
        lines.push([s.name, s.operator, s.parentCompany, s.city, s.country, SECTOR_LABEL[s.sector], FIT_LABEL[s.fit], s.nace, s.verifiedLatestTco2, s.verifiedPreviousTco2, s.id].map(csvCell).join(','));
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = view === 'COMPANIES' ? 'ets1-companies.csv' : 'ets1-sites.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${view === 'COMPANIES' ? companies.length : filteredSites.length} rows`);
  };

  const selectStyle: React.CSSProperties = { flex: '1 1 160px', width: 'auto' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <KpiRow columns={4}>
        <KpiTile label="Companies" value={companies.length.toLocaleString('en-GB')} sub={`${filteredSites.length.toLocaleString('en-GB')} sites`} />
        <KpiTile label={`Verified emissions ${ETS1_LATEST_YEAR}`} value={`${(totalT / 1_000_000).toFixed(1)}`} unit="MtCO₂" />
        <KpiTile label="Allowance bill" value={eua === null ? '—' : `€${Math.round((totalT * eua) / EUR_PER_EUR_M).toLocaleString('en-GB')}m`} unit="/yr" sub={eua === null ? 'Set an EUA price' : `at €${eua}/t`} />
        <KpiTile label="Biomethane saves" value={avoidedPerMWh === null ? '—' : `€${avoidedPerMWh.toFixed(2)}`} unit="/MWh" sub="Allowances avoided per MWh replacing gas" />
      </KpiRow>

      <Card
        title="EU ETS1 industrial sites"
        meta={`Every stationary installation with verified emissions in ${ETS1_LATEST_YEAR} (EU Transaction Log)`}
        actions={<button type="button" className="btn btn-secondary" onClick={exportCsv}>Export CSV</button>}
      >
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Sites buy allowances for their own emissions. RED III-compliant biomethane, mass-balanced and evidenced through the Union Database, counts as zero emissions, so each MWh that replaces gas avoids 0.202 t.
          Verified emissions cover <strong>all fuels and process emissions</strong>: the registry does not say how much gas a site burns. The biomethane-fit grade is a sector heuristic (high: food, pharma, paper, glass and ceramics, light industry; medium: chemicals, power and heat, refining — power sites include coal plants the registry cannot tell apart; low: cement, lime, metals).
          Source: <a href={ETS1_SOURCE_URL} target="_blank" rel="noreferrer">EUETS.INFO release of the EUTL (Aug 2024)</a>.
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <div className="seg" role="group" aria-label="View">
            {(['COMPANIES', 'SITES'] as View[]).map(v => (
              <button key={v} type="button" className={`seg-opt ${view === v ? 'active' : ''}`} onClick={() => { setView(v); setShown(PAGE); }}>
                {v === 'COMPANIES' ? 'By company' : 'By site'}
              </button>
            ))}
          </div>
          <input className="input" style={{ flex: '2 1 220px', width: 'auto' }} placeholder="Search company, site or city" aria-label="Search sites" value={search} onChange={e => { setSearch(e.target.value); setShown(PAGE); }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="eyebrow">EUA €/t</span>
            <input className="input num" style={{ width: '90px' }} inputMode="decimal" aria-label="EUA price" value={euaText} onChange={e => setEuaText(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <select className="input" style={selectStyle} aria-label="Country" value={country} onChange={e => { setCountry(e.target.value); setShown(PAGE); }}>
            <option value="ALL">All countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" style={selectStyle} aria-label="Sector" value={sector} onChange={e => { setSector(e.target.value as typeof sector); setShown(PAGE); }}>
            <option value="ALL">All sectors</option>
            {(Object.keys(SECTOR_LABEL) as Ets1Sector[]).map(s => <option key={s} value={s}>{SECTOR_LABEL[s]}</option>)}
          </select>
          <select className="input" style={selectStyle} aria-label="Biomethane fit" value={fit} onChange={e => { setFit(e.target.value as typeof fit); setShown(PAGE); }}>
            <option value="HIGH">Fit: high only</option>
            <option value="HIGH_MEDIUM">Fit: high & medium (adds power, chemicals, refining)</option>
            <option value="MEDIUM">Fit: medium only</option>
            <option value="LOW">Fit: low only</option>
            <option value="ALL">Fit: all</option>
          </select>
          <input className="input num" style={{ flex: '1 1 140px', width: 'auto' }} placeholder="Min kt CO₂ per site" aria-label="Minimum emissions" value={minKt} onChange={e => { setMinKt(e.target.value); setShown(PAGE); }} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          {view === 'COMPANIES' ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Countries</th>
                  <th>Sectors</th>
                  <th>Fit</th>
                  <th style={{ textAlign: 'right' }}>Sites</th>
                  <th style={{ textAlign: 'right' }}>tCO₂ {ETS1_LATEST_YEAR}</th>
                  <th style={{ textAlign: 'right' }}>Allowance bill €m/yr</th>
                  <th style={{ textAlign: 'right' }} title={`Biomethane to cut ${FIRST_DEAL_SHARE_PCT}% of emissions at high/medium-fit sites, and the allowances it saves`}>{FIRST_DEAL_SHARE_PCT}% cut: GWh · saving</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.slice(0, shown).map(c => {
                  const deal = firstDeal(c.fitVerifiedLatestTco2);
                  return (
                    <tr key={c.key}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.operators.length > 0 && (c.operators.length > 1 || c.operators[0] !== c.name) && (
                          <div title={c.operators.join('; ')} style={{ fontSize: '11px', color: 'var(--color-text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.operators.length} operator{c.operators.length > 1 ? 's' : ''}: {c.operators.join('; ')}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '12px' }}>{c.countries.join(' ')}</td>
                      <td style={{ fontSize: '12px', maxWidth: '200px' }}>{c.sectors.map(s => SECTOR_LABEL[s]).join(', ')}</td>
                      <td>{FIT_LABEL[c.fit]}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{c.sites.length}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{kt(c.verifiedLatestTco2)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{eua === null ? '—' : ((c.verifiedLatestTco2 * eua) / EUR_PER_EUR_M).toFixed(1)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {c.fitVerifiedLatestTco2 > 0 ? `${deal.gwh.toFixed(1)} · ${deal.saving === null ? '—' : `€${Math.round(deal.saving).toLocaleString('en-GB')}`}` : '—'}
                      </td>
                      <td>
                        <select className="input" style={{ minWidth: '140px' }} aria-label={`Outreach status for ${c.name}`} value={statuses[c.key] ?? 'NOT_CONTACTED'} onChange={e => setStatus(c.key, e.target.value as Status)}>
                          {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Operator</th>
                  <th>Location</th>
                  <th>Sector</th>
                  <th>Fit</th>
                  <th style={{ textAlign: 'right' }}>tCO₂ {ETS1_LATEST_YEAR}</th>
                  <th style={{ textAlign: 'right' }}>tCO₂ {ETS1_PREVIOUS_YEAR}</th>
                  <th style={{ textAlign: 'right' }}>Allowance bill €k/yr</th>
                </tr>
              </thead>
              <tbody>
                {filteredSites.slice(0, shown).map(s => (
                  <tr key={s.id}>
                    <td><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.id} · NACE {s.nace || '—'}</div></td>
                    <td style={{ fontSize: '12px' }}>{s.operator}{s.parentCompany ? <div style={{ color: 'var(--color-text-muted)' }}>{s.parentCompany}</div> : null}</td>
                    <td style={{ fontSize: '12px' }}>{[s.city, s.country].filter(Boolean).join(', ')}</td>
                    <td style={{ fontSize: '12px' }}>{SECTOR_LABEL[s.sector]}</td>
                    <td>{FIT_LABEL[s.fit]}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{kt(s.verifiedLatestTco2)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{s.verifiedPreviousTco2 === null ? '—' : kt(s.verifiedPreviousTco2)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{eua === null ? '—' : Math.round((s.verifiedLatestTco2 * eua) / 1000).toLocaleString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {(view === 'COMPANIES' ? companies.length : filteredSites.length) > shown && (
          <div style={{ marginTop: '12px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShown(n => n + PAGE)}>
              Show more ({(view === 'COMPANIES' ? companies.length : filteredSites.length) - shown} remaining)
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
