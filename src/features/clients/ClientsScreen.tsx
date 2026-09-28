import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { PageShell, PageHeader, Card, KpiRow, KpiTile } from '../../shared/ui';
import {
  buildCompanyDirectory,
  suggestRelated,
  CompanyProfile,
  CompanyLink,
  MarketKey,
  MARKET_LABEL,
} from '../../domain/companies/directory';
import { SECTOR_LABEL, biomethaneMWhToAbate, ETS1_LATEST_YEAR } from '../../domain/ets1/sites';
import { selectMarkPrice } from '../../domain/netback/engine';
import { HHV_TO_LHV_FACTOR } from '../../domain/offtake/engine';
import { normalizeCompanyName } from '../../domain/companies/normalize';

const LINKS_KEY = 'biomethane_company_links_v1';
const STATUS_KEY = 'biomethane_client_status_v1';
const PAGE = 100;
const EUR_PER_EUR_M = 1_000_000;
/** The ETS1 value-stack preset sizes a first deal at 10% of emissions at high/medium-fit sites. */
const ETS1_FIRST_DEAL_SHARE = 10 / 100;

type Status = 'NOT_CONTACTED' | 'CONTACTED' | 'MEETING' | 'PIPELINE' | 'NOT_A_FIT';
const STATUS_LABEL: Record<Status, string> = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'Contacted',
  MEETING: 'Meeting held',
  PIPELINE: 'In pipeline',
  NOT_A_FIT: 'Not a fit',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: changes last for this session only.
  }
}

function eurM(v: number | null): string {
  return v === null ? '—' : `€${(v / EUR_PER_EUR_M).toLocaleString('en-GB', { maximumFractionDigits: 1 })}m`;
}

interface Row {
  profile: CompanyProfile;
  fuelEuPenaltyEur: number | null;
  ets1BillEur: number | null;
  totalEur: number | null;
}

export function ClientsScreen() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const eua = selectMarkPrice(state.marks.marks['EU_ETS1'], 'mid');

  const [links, setLinks] = useState<CompanyLink[]>(() => readJson<CompanyLink[]>(LINKS_KEY, []));
  const [statuses, setStatuses] = useState<Record<string, Status>>(() => readJson<Record<string, Status>>(STATUS_KEY, {}));
  const directory = useMemo(() => buildCompanyDirectory(links), [links]);

  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState<MarketKey[]>([]);
  const [multiOnly, setMultiOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows: Row[] = useMemo(() => {
    return directory.map(profile => {
      const pen = profile.fueleu.length ? profile.fueleu.reduce((s, f) => s + f.penalty2026Eur, 0) : null;
      const t = profile.ets1.reduce((s, c) => s + c.verifiedLatestTco2, 0);
      const bill = profile.ets1.length && eua !== null ? t * eua : null;
      const parts = [pen, bill].filter((x): x is number => x !== null);
      return { profile, fuelEuPenaltyEur: pen, ets1BillEur: bill, totalEur: parts.length ? parts.reduce((a, b) => a + b, 0) : null };
    });
  }, [directory, eua]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => !q || r.profile.names.some(n => n.toLowerCase().includes(q)))
      .filter(r => markets.every(m => r.profile.markets.includes(m)))
      .filter(r => !multiOnly || r.profile.markets.length > 1)
      .sort((a, b) => (b.profile.markets.length - a.profile.markets.length) || ((b.totalEur ?? -1) - (a.totalEur ?? -1)));
  }, [rows, search, markets, multiOnly]);

  const selected = selectedId ? directory.find(p => p.id === selectedId || p.names.some(n => n === selectedId)) ?? null : null;
  const related = useMemo(() => (selected ? suggestRelated(selected, directory) : []), [selected, directory]);

  const toggleMarket = (m: MarketKey) => setMarkets(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));
  const setStatus = (id: string, s: Status) => {
    const next = { ...statuses, [id]: s };
    setStatuses(next);
    writeJson(STATUS_KEY, next);
  };
  const link = (a: string, b: string) => {
    const next = [...links, { a, b }];
    setLinks(next);
    writeJson(LINKS_KEY, next);
  };
  const unlinkAll = (id: string) => {
    // Profile ids are normalised names, so every id merged into this profile is one of its names normalised.
    const idsInProfile = new Set([id, ...(selected?.names ?? []).map(normalizeCompanyName)]);
    const next = links.filter(l => !idsInProfile.has(l.a) && !idsInProfile.has(l.b));
    setLinks(next);
    writeJson(LINKS_KEY, next);
  };

  const openStack = (params: Record<string, string>) => {
    const qs = new URLSearchParams({ ...params, for: selected?.name ?? '' }).toString();
    navigate(`/value-stack?${qs}`);
  };

  const multiCount = directory.filter(p => p.markets.length > 1).length;

  return (
    <PageShell style={{ overflowY: 'auto' }}>
      <PageHeader
        title="Clients"
        context="Every company the desk knows, merged across FuelEU, EU ETS1 and EU ETS2 — its exposure in each market, and a value stack in one click."
      />
      <div style={{ padding: '0 16px' }}>
        <KpiRow columns={4}>
          <KpiTile label="Companies" value={directory.length.toLocaleString('en-GB')} />
          <KpiTile label="In more than one market" value={multiCount.toLocaleString('en-GB')} sub="Link related records to find more" />
          <KpiTile label="Linked by you" value={links.length.toLocaleString('en-GB')} />
          <KpiTile label="EUA price used" value={eua === null ? '—' : `€${eua}`} unit="/t" sub="Desk EU_ETS1 mark" />
        </KpiRow>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, 1fr)', gap: '16px', padding: '16px', alignItems: 'start' }}>
        <Card title="Directory" meta={`${filtered.length.toLocaleString('en-GB')} companies`}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
            <input className="input" style={{ flex: '2 1 220px', width: 'auto' }} placeholder="Search any company name" aria-label="Search companies" value={search} onChange={e => { setSearch(e.target.value); setShown(PAGE); }} />
            {(Object.keys(MARKET_LABEL) as MarketKey[]).map(m => (
              <button key={m} type="button" className={`btn ${markets.includes(m) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { toggleMarket(m); setShown(PAGE); }}>
                {MARKET_LABEL[m]}
              </button>
            ))}
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
              <input type="checkbox" checked={multiOnly} onChange={e => setMultiOnly(e.target.checked)} /> Multi-market only
            </label>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Markets</th>
                  <th style={{ textAlign: 'right' }} title="FuelEU 2026 penalty estimate">FuelEU</th>
                  <th style={{ textAlign: 'right' }} title={`ETS1 allowance bill on ${ETS1_LATEST_YEAR} verified emissions at the desk EUA price`}>ETS1</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map(r => (
                  <tr key={r.profile.id} data-click="1" className={selected?.id === r.profile.id ? 'selrow' : ''} onClick={() => setSelectedId(r.profile.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.profile.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.profile.countries.slice(0, 6).join(' ')}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{r.profile.markets.map(m => MARKET_LABEL[m]).join(' · ')}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{eurM(r.fuelEuPenaltyEur)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{eurM(r.ets1BillEur)}</td>
                    <td style={{ fontSize: '12px' }}>{STATUS_LABEL[statuses[r.profile.id] ?? 'NOT_CONTACTED']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > shown && (
            <button type="button" className="btn btn-ghost" style={{ marginTop: '10px' }} onClick={() => setShown(n => n + PAGE)}>
              Show more ({filtered.length - shown} remaining)
            </button>
          )}
        </Card>

        {selected ? (
          <ClientProfile
            profile={selected}
            related={related}
            eua={eua}
            status={statuses[selected.id] ?? 'NOT_CONTACTED'}
            onStatus={s => setStatus(selected.id, s)}
            onLink={other => link(selected.id, other.id)}
            onUnlink={() => unlinkAll(selected.id)}
            hasLinks={links.some(l => l.a === selected.id || l.b === selected.id)}
            onSelect={id => setSelectedId(id)}
            onOpenStack={openStack}
          />
        ) : (
          <Card title="Client profile">
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Select a company to see its exposure in every market and open its value stack.</p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function ClientProfile(props: {
  profile: CompanyProfile;
  related: CompanyProfile[];
  eua: number | null;
  status: Status;
  onStatus: (s: Status) => void;
  onLink: (other: CompanyProfile) => void;
  onUnlink: () => void;
  hasLinks: boolean;
  onSelect: (id: string) => void;
  onOpenStack: (params: Record<string, string>) => void;
}) {
  const { profile: p, eua } = props;
  const currentYear = String(new Date().getFullYear());

  const fuelEu = p.fueleu.length
    ? {
        vessels: p.fueleu.reduce((s, f) => s + f.group.vessels, 0),
        lngShips: p.fueleu.reduce((s, f) => s + f.group.lngShipCount, 0),
        deficit: p.fueleu.reduce((s, f) => s + f.deficit2026Tco2e, 0),
        penalty: p.fueleu.reduce((s, f) => s + f.penalty2026Eur, 0),
        bioLng: p.fueleu.reduce((s, f) => s + f.bioLngToCloseMWh, 0),
        etsCo2: p.fueleu.reduce((s, f) => s + f.etsCo2Tco2, 0),
      }
    : null;

  const sites = p.ets1.flatMap(c => c.sites).sort((a, b) => b.verifiedLatestTco2 - a.verifiedLatestTco2);
  const ets1T = sites.reduce((s, x) => s + x.verifiedLatestTco2, 0);
  const ets1FitT = p.ets1.reduce((s, c) => s + c.fitVerifiedLatestTco2, 0);
  // Preset volume for the value stack: biomethane (invoice GCV MWh) that cuts 10% of fit-site emissions.
  const ets1PresetMWh = ets1FitT > 0 ? Math.round(biomethaneMWhToAbate(ets1FitT * ETS1_FIRST_DEAL_SHARE) / HHV_TO_LHV_FACTOR) : null;

  const contacts = [
    ...p.fueleu.flatMap(f => f.group.contacts.map(c => ({ label: [c.name, c.role, c.email, c.phone].filter(Boolean).join(' · '), url: c.sourceUrl }))),
    ...p.ets2.flatMap(e => e.contacts.map(c => ({ label: [c.name, c.role, c.email, c.phone].filter(Boolean).join(' · '), url: c.sourceUrl }))),
  ];

  const kv = (k: string, v: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
      <span className="num" style={{ textAlign: 'right' }}>{v}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Card
        title={p.name}
        meta={`${p.markets.map(m => MARKET_LABEL[m]).join(' · ')}${p.countries.length ? ` · ${p.countries.join(' ')}` : ''}`}
        actions={
          <select className="input" style={{ minWidth: '140px' }} aria-label="Client status" value={props.status} onChange={e => props.onStatus(e.target.value as Status)}>
            {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        }
      >
        {p.names.length > 1 && (
          <div title={p.names.join('; ')} style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxHeight: '48px', overflow: 'hidden' }}>
            Also appears as: {p.names.filter(n => n !== p.name).join('; ')}
          </div>
        )}
      </Card>

      {fuelEu && (
        <Card title="FuelEU Maritime" meta="EU MRV 2024 data used as a proxy for 2026 — estimates">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {kv('Ships in scope', `${fuelEu.vessels} (${fuelEu.lngShips} LNG-capable)`)}
            {kv('2026 deficit (members in deficit)', `${Math.round(fuelEu.deficit).toLocaleString('en-GB')} tCO₂e`)}
            {kv('2026 penalty if nothing is done', eurM(fuelEu.penalty))}
            {kv('Bio-LNG (−100 CI) to close it', `${Math.round(fuelEu.bioLng).toLocaleString('en-GB')} MWh`)}
            {kv('EU ETS in-scope CO₂ (2026)', `${Math.round(fuelEu.etsCo2).toLocaleString('en-GB')} t`)}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: '10px' }}
            onClick={() => props.onOpenStack({ client: 'SHIP_OPERATOR', volume: String(Math.round(fuelEu.bioLng)), ci: '-100', year: currentYear })}
          >
            Value stack: close the FuelEU deficit
          </button>
        </Card>
      )}

      {p.ets1.length > 0 && (
        <Card title="EU ETS1 industrial sites" meta={`${sites.length} site${sites.length > 1 ? 's' : ''} · verified ${ETS1_LATEST_YEAR}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {kv('Verified emissions', `${Math.round(ets1T).toLocaleString('en-GB')} tCO₂`)}
            {kv('At high/medium biomethane-fit sites', `${Math.round(ets1FitT).toLocaleString('en-GB')} tCO₂`)}
            {kv('Allowance bill', eua === null ? '—' : `${eurM(ets1T * eua)}/yr at €${eua}/t`)}
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '12px' }}>
            {sites.slice(0, 6).map(s => (
              <li key={s.id}>{s.name} ({[s.city, s.country].filter(Boolean).join(', ')}) — {SECTOR_LABEL[s.sector]}, {Math.round(s.verifiedLatestTco2).toLocaleString('en-GB')} t</li>
            ))}
            {sites.length > 6 && <li>…and {sites.length - 6} more</li>}
          </ul>
          {ets1PresetMWh !== null && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '10px' }}
              onClick={() => props.onOpenStack({ client: 'ETS1_SITE', volume: String(ets1PresetMWh), ci: '-100', year: currentYear, smallSites: '0' })}
            >
              Value stack: cut 10% of fit-site emissions
            </button>
          )}
        </Card>
      )}

      {p.ets2.length > 0 && (
        <Card title="EU ETS2" meta="Regulated gas supplier or exposed end user — from desk research">
          {p.ets2.map(e => (
            <div key={e.id} style={{ fontSize: '13px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 600 }}>{e.name} ({e.countryIso}) — {e.role === 'REGULATED_SUPPLIER' ? 'regulated supplier' : `exposed end user${e.sector ? `, ${e.sector}` : ''}`}</div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                {e.marketSharePct !== null ? `${e.marketSharePct}% — ${e.shareBasis}` : e.gasVolumeTWh !== null ? `${e.gasVolumeTWh} TWh disclosed (all segments)` : e.shareBasis ?? ''}
              </div>
              <div>{e.evidence.map(ev => <a key={ev.url + ev.note} href={ev.url} target="_blank" rel="noreferrer" title={ev.note} style={{ marginRight: '8px' }}>source</a>)}</div>
            </div>
          ))}
          {p.ets2.some(e => e.role === 'REGULATED_SUPPLIER') && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => props.onOpenStack({ client: 'ETS2_SUPPLIER', year: '2028', ci: '-100' })}
            >
              Value stack: ETS2 supplier
            </button>
          )}
        </Card>
      )}

      <Card title="Contacts" meta="Published business contacts only">
        {contacts.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' }}>None on file — research needed.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
            {contacts.map(c => <li key={c.label + c.url}><a href={c.url} target="_blank" rel="noreferrer">{c.label || 'contact page'}</a></li>)}
          </ul>
        )}
      </Card>

      <Card title="Possibly the same company" meta="Shares the first distinctive word of a name — link only if it is the same group">
        {props.related.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' }}>No suggestions.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {props.related.map(r => (
              <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px' }}>
                <button type="button" className="btn btn-ghost" style={{ textAlign: 'left' }} onClick={() => props.onSelect(r.id)}>
                  {r.name} <span style={{ color: 'var(--color-text-muted)' }}>({r.markets.map(m => MARKET_LABEL[m]).join(', ')})</span>
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => props.onLink(r)}>Link</button>
              </li>
            ))}
          </ul>
        )}
        {props.hasLinks && (
          <button type="button" className="btn btn-ghost" style={{ marginTop: '8px' }} onClick={props.onUnlink}>Remove my links for this company</button>
        )}
      </Card>
    </div>
  );
}
