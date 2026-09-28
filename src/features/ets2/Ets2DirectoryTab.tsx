import React, { useMemo, useState } from 'react';
import { Card } from '../../shared/ui';
import { Ets2CountryProfile } from '../../domain/ets2/countries';
import {
  Ets2Company,
  ETS2_REGULATED_ENTITY_LISTS,
  computeCompanyExposure,
} from '../../domain/ets2/companies';
import { showToast } from '../../app/DeskToastContainer';

export type OutreachStatus = 'NOT_CONTACTED' | 'CONTACTED' | 'MEETING' | 'PIPELINE' | 'NOT_A_FIT';

const STATUS_LABEL: Record<OutreachStatus, string> = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'Contacted',
  MEETING: 'Meeting held',
  PIPELINE: 'In pipeline',
  NOT_A_FIT: 'Not a fit',
};

const STATUS_STORAGE_KEY = 'biomethane_ets2_outreach_v1';

function readStatuses(): Record<string, OutreachStatus> {
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OutreachStatus>) : {};
  } catch {
    return {};
  }
}

function writeStatuses(statuses: Record<string, OutreachStatus>): void {
  try {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Storage unavailable: statuses last for this session only.
  }
}

/** Short link label: the source's host, e.g. "cre.fr". */
function sourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function Ets2DirectoryTab(props: {
  companies: Ets2Company[];
  countries: Ets2CountryProfile[];
  ets2PriceEurPerT: number | null;
  onOpenInCalculator: (annualGasMWh: number) => void;
  importPanel: React.ReactNode;
}) {
  const { companies, countries, ets2PriceEurPerT } = props;
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Ets2Company['role']>('ALL');
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<Record<string, OutreachStatus>>(readStatuses);

  const countryName = useMemo(
    () => new Map<string, string>([['GB', 'United Kingdom (HQ)'], ...countries.map(c => [c.iso, c.name] as [string, string])]),
    [countries]
  );
  const exposures = useMemo(
    () => computeCompanyExposure(companies, countries, ets2PriceEurPerT),
    [companies, countries, ets2PriceEurPerT]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exposures
      .filter(e => countryFilter === 'ALL' || e.company.countryIso === countryFilter)
      .filter(e => roleFilter === 'ALL' || e.company.role === roleFilter)
      .filter(e => !q || e.company.name.toLowerCase().includes(q))
      .sort((a, b) => {
        // Largest estimated exposure first, then largest share, then name.
        const ea = a.ets2CostEurM ?? -1;
        const eb = b.ets2CostEurM ?? -1;
        if (ea !== eb) return eb - ea;
        const sa = a.company.marketSharePct ?? -1;
        const sb = b.company.marketSharePct ?? -1;
        if (sa !== sb) return sb - sa;
        return a.company.name.localeCompare(b.company.name);
      });
  }, [exposures, countryFilter, roleFilter, search]);

  const countriesInList = useMemo(
    () => [...new Set(companies.map(c => c.countryIso))].sort((a, b) => (countryName.get(a) ?? a).localeCompare(countryName.get(b) ?? b)),
    [companies, countryName]
  );

  const counts = useMemo(() => {
    const c = { contacted: 0, meetings: 0, pipeline: 0 };
    for (const s of Object.values(statuses)) {
      if (s === 'CONTACTED') c.contacted++;
      if (s === 'MEETING') c.meetings++;
      if (s === 'PIPELINE') c.pipeline++;
    }
    return c;
  }, [statuses]);

  const setStatus = (id: string, status: OutreachStatus) => {
    const next = { ...statuses, [id]: status };
    setStatuses(next);
    writeStatuses(next);
  };

  const exportCsv = () => {
    const header = ['Company', 'Country', 'Role', 'Market share %', 'Share basis', 'Est. gas TWh', 'Volume method', 'Est. ETS2 cost €m/yr', 'Confidence', 'Status', 'Sources', 'Contacts'];
    const lines = rows.map(r => [
      r.company.name,
      countryName.get(r.company.countryIso) ?? r.company.countryIso,
      r.company.role === 'REGULATED_SUPPLIER' ? 'Regulated supplier' : 'Exposed end user',
      r.company.marketSharePct,
      r.company.shareBasis,
      r.volumeTWh === null ? null : Number(r.volumeTWh.toFixed(2)),
      r.volumeMethod,
      r.ets2CostEurM === null ? null : Math.round(r.ets2CostEurM),
      r.company.confidence,
      STATUS_LABEL[statuses[r.company.id] ?? 'NOT_CONTACTED'],
      r.company.evidence.map(e => e.url).join(' '),
      r.company.contacts.map(c => [c.name, c.role, c.email, c.phone].filter(Boolean).join(' ')).join(' | '),
    ].map(csvCell).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ets2-target-list.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} companies`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <Card
        title="Who is exposed — company target list"
        meta={`${companies.length} companies · ${counts.contacted} contacted · ${counts.meetings} meetings · ${counts.pipeline} in pipeline`}
        actions={<button type="button" className="btn btn-secondary" onClick={exportCsv}>Export CSV</button>}
      >
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Gas suppliers are the ETS2 regulated entities: they buy allowances from 2028 and pass the cost on, so they are the first buyers of zero-rated biomethane.
          Estimated cost uses the company's own volume where known, otherwise its market share of the country's building-gas volume (Countries tab), at the scenario price
          {ets2PriceEurPerT === null ? ' (set a price in the calculator)' : ` of €${ets2PriceEurPerT}/t`}.
          {' '}* = disclosed portfolio volume across all segments; it can include EU ETS1 industrial sites, so the ETS2 cost is an upper bound.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <input className="input" style={{ flex: '2 1 220px', width: 'auto' }} placeholder="Search company" aria-label="Search company" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" style={{ flex: '1 1 160px', width: 'auto' }} aria-label="Country" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
            <option value="ALL">All countries</option>
            {countriesInList.map(iso => <option key={iso} value={iso}>{countryName.get(iso) ?? iso}</option>)}
          </select>
          <select className="input" style={{ flex: '1 1 160px', width: 'auto' }} aria-label="Role" value={roleFilter} onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}>
            <option value="ALL">All roles</option>
            <option value="REGULATED_SUPPLIER">Regulated suppliers</option>
            <option value="EXPOSED_END_USER">Exposed end users</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Country</th>
                <th style={{ textAlign: 'right' }}>Share</th>
                <th style={{ textAlign: 'right' }}>Est. gas (TWh)</th>
                <th style={{ textAlign: 'right' }}>Est. ETS2 cost (€m/yr)</th>
                <th>Source</th>
                <th>Contact</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const c = r.company;
                const firstContact = c.contacts[0];
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.notes && (
                        <div
                          title={c.notes}
                          style={{ fontSize: '11px', color: 'var(--color-text-muted)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {c.notes}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {c.role === 'REGULATED_SUPPLIER' ? 'Regulated supplier' : `Exposed end user${c.sector ? ` · ${c.sector}` : ''}`} · {c.confidence.toLowerCase()} confidence
                      </div>
                    </td>
                    <td>{countryName.get(c.countryIso) ?? c.countryIso}</td>
                    <td className="num" style={{ textAlign: 'right' }} title={c.shareBasis ?? undefined}>
                      {c.marketSharePct === null ? '—' : `${c.marketSharePct}%`}
                    </td>
                    <td className="num" style={{ textAlign: 'right' }} title={r.volumeMethod === 'SHARE_OF_NATIONAL' ? 'Share × national building gas (approximation)' : r.volumeMethod === 'DISCLOSED' ? 'Disclosed portfolio volume, all segments — may include EU ETS1 sites, so ETS2 cost is overstated' : undefined}>
                      {r.volumeTWh === null ? '—' : `${r.volumeMethod === 'SHARE_OF_NATIONAL' ? '≈' : ''}${r.volumeTWh.toFixed(1)}${r.volumeMethod === 'DISCLOSED' ? '*' : ''}`}
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{r.ets2CostEurM === null ? '—' : Math.round(r.ets2CostEurM).toLocaleString('en-GB')}</td>
                    <td style={{ fontSize: '12px', maxWidth: '200px' }}>
                      {c.evidence.map(e => (
                        <a key={e.url + e.note} href={e.url} target="_blank" rel="noreferrer" title={e.note} style={{ display: 'block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sourceLabel(e.url)}
                        </a>
                      ))}
                    </td>
                    <td style={{ fontSize: '12px', maxWidth: '240px' }}>
                      {firstContact ? (
                        <a href={firstContact.sourceUrl} target="_blank" rel="noreferrer">
                          {[firstContact.name, firstContact.role, firstContact.email, firstContact.phone].filter(Boolean).join(' · ') || firstContact.kind}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>To research</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ minWidth: '140px' }}
                        aria-label={`Outreach status for ${c.name}`}
                        value={statuses[c.id] ?? 'NOT_CONTACTED'}
                        onChange={e => setStatus(c.id, e.target.value as OutreachStatus)}
                      >
                        {(Object.keys(STATUS_LABEL) as OutreachStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td>
                      {r.volumeTWh !== null && (
                        <button type="button" className="btn btn-ghost" onClick={() => props.onOpenInCalculator(Math.round(r.volumeTWh as number * 1_000_000))}>
                          Calculate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Official lists of regulated entities" meta="Where to pull the full supplier list per country">
        <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(ETS2_REGULATED_ENTITY_LISTS).map(([iso, l]) => (
            <li key={iso}>
              <strong>{iso === 'EU' ? 'EU' : countryName.get(iso) ?? iso}:</strong>{' '}
              <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
            </li>
          ))}
        </ul>
      </Card>

      {props.importPanel}
    </div>
  );
}
