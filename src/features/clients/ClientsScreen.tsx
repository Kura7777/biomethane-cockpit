import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { PageShell, PageHeader, Card, KpiRow, KpiTile, MobileCardList } from '../../shared/ui';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { MobileFilterBar, SheetField } from '../ets2/MobileFilterBar';
import './clients.css';
import {
  buildCompanyDirectory,
  suggestRelated,
  CompanyProfile,
  CompanyLink,
  MarketKey,
  MARKET_KEYS,
  MARKET_LABEL,
  DEFAULT_ETS2_COMPANIES,
} from '../../domain/companies/directory';
import {
  computeRegulationExposure,
  computeOpportunities,
  RegulationExposure,
  Opportunity,
} from '../../domain/companies/opportunities';
import { SECTOR_LABEL, ETS1_LATEST_YEAR } from '../../domain/ets1/sites';
import { applyEts2CompanyImport } from '../../domain/ets2/companies';
import { ETS2_COUNTRIES, applyEts2CountryImport } from '../../domain/ets2/countries';
import { selectMarkPrice } from '../../domain/netback/engine';
import { normalizeCompanyName } from '../../domain/companies/normalize';
import { StackSpec } from '../../domain/companies/opportunities';
import { ValueStackCard, StackBadge } from '../value-stack/ValueStackCard';

const LINKS_KEY = 'biomethane_company_links_v1';
const STATUS_KEY = 'biomethane_client_status_v1';
/** Read-only: the trader's ETS2 imports, made on the EU ETS screen. */
const ETS2_COUNTRY_IMPORT_KEY = 'biomethane_ets2_country_import_v1';
const ETS2_COMPANY_IMPORT_KEY = 'biomethane_ets2_company_import_v1';
const PAGE = 100;
const EUR_PER_EUR_M = 1_000_000;

type Status = 'NOT_CONTACTED' | 'CONTACTED' | 'MEETING' | 'PIPELINE' | 'NOT_A_FIT';
const STATUS_LABEL: Record<Status, string> = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'Contacted',
  MEETING: 'Meeting held',
  PIPELINE: 'In pipeline',
  NOT_A_FIT: 'Not a fit',
};

type SortKey = 'name' | 'regs' | 'fueleu' | 'maritime' | 'ets1' | 'ets2' | 'total';

/** Mobile sort select: the same keys the desktop headers sort by. */
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'total:d', label: 'At stake now, high to low' },
  { value: 'name:a', label: 'Company A–Z' },
  { value: 'name:d', label: 'Company Z–A' },
  { value: 'fueleu:d', label: 'FuelEU, high to low' },
  { value: 'maritime:d', label: 'ETS maritime, high to low' },
  { value: 'ets1:d', label: 'ETS1, high to low' },
  { value: 'ets2:d', label: 'ETS2 (2028+), high to low' },
  { value: 'regs:d', label: 'Most regulations' },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readText(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
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
  if (v === null) return '—';
  const m = v / EUR_PER_EUR_M;
  return `€${m.toLocaleString('en-GB', { maximumFractionDigits: m < 10 ? 1 : 0 })}m`;
}

function eur(v: number | null, digits = 0): string {
  return v === null ? '—' : `€${v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function mwh(v: number | null): string {
  return v === null ? '—' : `${Math.round(v).toLocaleString('en-GB')} MWh`;
}

function ets2Cell(x: RegulationExposure): string {
  switch (x.ets2Standing) {
    case 'QUANTIFIED': return eurM(x.ets2CostEur);
    case 'SUPPLIER_VOLUME_UNKNOWN': return 'Supplier';
    case 'END_USER': return 'End user';
    default: return '—';
  }
}

interface Row {
  profile: CompanyProfile;
  exposure: RegulationExposure;
  best: Opportunity | null;
  /** The first play whose value stack pays in 2+ regimes on the same MWh. */
  stack: StackSpec | null;
  stackTitle: string | null;
}

function sortValue(r: Row, key: SortKey): number | null {
  switch (key) {
    case 'regs': return r.profile.markets.length;
    case 'fueleu': return r.exposure.fuelEuPenaltyEur;
    case 'maritime': return r.exposure.etsMaritimeEur;
    case 'ets1': return r.exposure.ets1BillEur;
    // Unquantified ETS2 exposure still ranks above none.
    case 'ets2': return r.exposure.ets2CostEur ?? (r.exposure.ets2Standing === 'NONE' ? null : 0);
    case 'total': return r.exposure.costAtStakeNowEur;
    default: return null;
  }
}

function csvCell(v: string | number | null): string {
  const s = v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ClientsScreen() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const eua = selectMarkPrice(state.marks.marks['EU_ETS1'], 'mid');
  const ets2Price = selectMarkPrice(state.marks.marks['EU_ETS2'], 'mid');
  const year = new Date().getFullYear();

  const [links, setLinks] = useState<CompanyLink[]>(() => readJson<CompanyLink[]>(LINKS_KEY, []));
  const [statuses, setStatuses] = useState<Record<string, Status>>(() => readJson<Record<string, Status>>(STATUS_KEY, {}));
  const ets2Countries = useMemo(() => {
    const text = readText(ETS2_COUNTRY_IMPORT_KEY);
    return text.trim() ? applyEts2CountryImport(ETS2_COUNTRIES, text).countries : ETS2_COUNTRIES;
  }, []);
  const ets2Companies = useMemo(() => {
    const text = readText(ETS2_COMPANY_IMPORT_KEY);
    return text.trim() ? applyEts2CompanyImport(DEFAULT_ETS2_COMPANIES, text).companies : DEFAULT_ETS2_COMPANIES;
  }, []);
  const directory = useMemo(() => buildCompanyDirectory(links, ets2Companies), [links, ets2Companies]);

  const rows: Row[] = useMemo(
    () => directory.map(profile => {
      const ops = computeOpportunities(profile, state.marks, ets2Countries, year);
      return {
        profile,
        exposure: computeRegulationExposure(profile, state.marks, ets2Countries),
        best: ops[0] ?? null,
        stack: ops.find(o => o.stack?.isStack)?.stack ?? null,
        stackTitle: ops.find(o => o.stack?.isStack)?.title ?? null,
      };
    }),
    [directory, state.marks, ets2Countries, year]
  );

  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState<MarketKey[]>([]);
  const [country, setCountry] = useState('ALL');
  const [multiOnly, setMultiOnly] = useState(false);
  const [stackOnly, setStackOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'total', desc: true });
  const [shown, setShown] = useState(PAGE);

  const countries = useMemo(() => [...new Set(directory.flatMap(p => p.countries))].sort(), [directory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows
      .filter(r => !q || r.profile.names.some(n => n.toLowerCase().includes(q)))
      .filter(r => markets.every(m => r.profile.markets.includes(m)))
      .filter(r => country === 'ALL' || r.profile.countries.includes(country))
      .filter(r => !multiOnly || r.profile.markets.length > 1)
      .filter(r => !stackOnly || r.stack !== null);
    const dir = sort.desc ? -1 : 1;
    return out.sort((a, b) => {
      if (sort.key === 'name') return a.profile.name.localeCompare(b.profile.name) * dir;
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      // Blanks always sink, whichever way the column is sorted.
      if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
      if (va !== vb) return va < vb ? -dir : dir;
      const ta = a.exposure.costAtStakeNowEur;
      const tb = b.exposure.costAtStakeNowEur;
      return ta === tb ? 0 : ta === null ? 1 : tb === null ? -1 : ta < tb ? 1 : -1;
    });
  }, [rows, search, markets, country, multiOnly, stackOnly, sort]);

  const selectedId = params.get('company');
  const selectedRow = selectedId ? rows.find(r => r.profile.id === selectedId) ?? null : null;
  const related = useMemo(() => (selectedRow ? suggestRelated(selectedRow.profile, directory) : []), [selectedRow, directory]);

  useEffect(() => {
    document.querySelectorAll('.ds-page-shell, main').forEach(el => el.scrollTo?.({ top: 0 }));
  }, [selectedId]);

  const select = (id: string | null) => setParams(id ? { company: id } : {});
  const toggleMarket = (m: MarketKey) => { setMarkets(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])); setShown(PAGE); };
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
  const unlinkAll = (profile: CompanyProfile) => {
    // Profile ids are normalised names, so every id merged into this profile is one of its names normalised.
    const idsInProfile = new Set([profile.id, ...profile.names.map(normalizeCompanyName)]);
    const next = links.filter(l => !idsInProfile.has(l.a) && !idsInProfile.has(l.b));
    setLinks(next);
    writeJson(LINKS_KEY, next);
  };
  const openAction = (o: Opportunity, company: string) => {
    if (!o.action) return;
    const { route, params: q } = o.action;
    const qs = new URLSearchParams(q).toString();
    navigate(qs ? `${route}?${qs}` : route);
  };

  const exportCsv = () => {
    const header = ['Company', 'Countries', 'Regulations', 'FuelEU 2026 penalty €', 'EU ETS maritime 2026 €', `EU ETS1 bill € (${ETS1_LATEST_YEAR} emissions)`, 'EU ETS2 from 2028 €', 'EU ETS2 role', 'Cost at stake now €', 'Best play', 'Value stack', 'Status'];
    const lines = filtered.map(r => [
      r.profile.name,
      r.profile.countries.join(' '),
      r.profile.markets.map(m => MARKET_LABEL[m]).join('; '),
      r.exposure.fuelEuPenaltyEur === null ? null : Math.round(r.exposure.fuelEuPenaltyEur),
      r.exposure.etsMaritimeEur === null ? null : Math.round(r.exposure.etsMaritimeEur),
      r.exposure.ets1BillEur === null ? null : Math.round(r.exposure.ets1BillEur),
      r.exposure.ets2CostEur === null ? null : Math.round(r.exposure.ets2CostEur),
      r.exposure.ets2Standing === 'NONE' ? null : r.exposure.ets2Standing,
      r.exposure.costAtStakeNowEur === null ? null : Math.round(r.exposure.costAtStakeNowEur),
      r.best?.title ?? null,
      r.stack ? r.stack.pricedRegimes.join(' + ') : null,
      STATUS_LABEL[statuses[r.profile.id] ?? 'NOT_CONTACTED'],
    ].map(csvCell).join(','));
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'company-exposure.csv';
    a.click();
    // Revoke after the click has been handled, or some browsers cancel the download.
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  };

  if (selectedRow) {
    return (
      <PageShell style={{ overflowY: 'auto' }}>
        <CompanyPage
          row={selectedRow}
          related={related}
          eua={eua}
          ets2Price={ets2Price}
          year={year}
          marks={state.marks}
          ets2Countries={ets2Countries}
          status={statuses[selectedRow.profile.id] ?? 'NOT_CONTACTED'}
          onStatus={s => setStatus(selectedRow.profile.id, s)}
          onBack={() => select(null)}
          onLink={other => link(selectedRow.profile.id, other.id)}
          onUnlink={() => unlinkAll(selectedRow.profile)}
          hasLinks={links.some(l => l.a === selectedRow.profile.id || l.b === selectedRow.profile.id)}
          onSelect={select}
          onAction={o => openAction(o, selectedRow.profile.name)}
        />
      </PageShell>
    );
  }

  const stackCount = rows.filter(r => r.stack !== null).length;
  const stakeShown = filtered.reduce((s, r) => s + (r.exposure.costAtStakeNowEur ?? 0), 0);
  const th = (key: SortKey, label: string, title: string, right = true) => (
    <th
      style={{ textAlign: right ? 'right' : 'left', cursor: 'pointer', whiteSpace: 'nowrap', ...(key === 'name' ? stickyCell(true) : {}) }}
      title={title}
      aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}
      onClick={() => setSort(prev => ({ key, desc: prev.key === key ? !prev.desc : key !== 'name' }))}
    >
      {label}{sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}
    </th>
  );

  return (
    <PageShell style={{ overflowY: 'auto' }}>
      <PageHeader
        title="Clients"
        context="Every company the desk knows, one row each, with its exposure under every regulation. Tap a company to see what you can sell it."
      />
      <div className="cl-kpi-wrap" style={{ padding: '0 16px' }}>
        <KpiRow columns={4}>
          <KpiTile label="Companies shown" value={filtered.length.toLocaleString('en-GB')} sub={`of ${rows.length.toLocaleString('en-GB')}`} />
          <KpiTile label="Value stack available" value={stackCount.toLocaleString('en-GB')} sub="2+ regimes pay on the same MWh" />
          <KpiTile label="Cost at stake now (shown)" value={eurM(stakeShown)} unit="/yr" sub="FuelEU + ETS maritime + ETS1" />
          <KpiTile label="Prices used" value={eua === null ? '—' : `€${eua}`} unit="/t EUA" sub={`ETS2 €${ets2Price ?? '—'}/t · desk marks`} />
        </KpiRow>
      </div>

      <div className="cl-list-wrap" style={{ padding: '16px' }}>
        <Card className="cl-list-card" title="Company × regulation" meta={isMobile ? 'Annual € exposure at desk marks · tap a company to open it' : 'Annual € exposure at desk marks · tap a header to sort · tap a company to open it'}>
          {isMobile ? (
            <>
          <MobileFilterBar
            search={search}
            onSearch={v => { setSearch(v); setShown(PAGE); }}
            searchPlaceholder="Search any company name"
            searchLabel="Search companies"
            activeCount={(country !== 'ALL' ? 1 : 0) + markets.length + (multiOnly ? 1 : 0) + (stackOnly ? 1 : 0)}
            sortValue={`${sort.key}:${sort.desc ? 'd' : 'a'}`}
            sortOptions={SORT_OPTIONS}
            onSort={v => { const [key, dir] = v.split(':'); setSort({ key: key as SortKey, desc: dir === 'd' }); }}
            onReset={() => { setCountry('ALL'); setMarkets([]); setMultiOnly(false); setStackOnly(false); setShown(PAGE); }}
          >
            <SheetField label="Country">
              <select aria-label="Country" value={country} onChange={e => { setCountry(e.target.value); setShown(PAGE); }}>
                <option value="ALL">All countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </SheetField>
            <SheetField label="Exposed to">
              <div className="mfb-chips">
                {MARKET_KEYS.map(m => (
                  <button key={m} type="button" className={`btn ${markets.includes(m) ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={markets.includes(m)} onClick={() => toggleMarket(m)}>
                    {MARKET_LABEL[m]}
                  </button>
                ))}
              </div>
            </SheetField>
            <label className="mfb-check">
              <input type="checkbox" checked={multiOnly} onChange={e => { setMultiOnly(e.target.checked); setShown(PAGE); }} /> 2+ regulations
            </label>
            <label className="mfb-check">
              <input type="checkbox" checked={stackOnly} onChange={e => { setStackOnly(e.target.checked); setShown(PAGE); }} /> Value stack available
            </label>
            <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={exportCsv}>Export CSV</button>
          </MobileFilterBar>
          <MobileCardList
            testId="clients-cards"
            items={filtered.slice(0, shown)}
            getKey={r => r.profile.id}
            onSelect={r => select(r.profile.id)}
            title={r => r.profile.name}
            subtitle={r => [r.profile.countries.slice(0, 5).join(' '), `${r.profile.markets.length} reg.`].filter(Boolean).join(' · ')}
            metric={r => eurM(r.exposure.costAtStakeNowEur)}
            metricLabel={() => 'At stake now'}
            badges={r => (
              <>
                {r.stack && <StackBadge spec={r.stack} />}
                <span className="cl-status">{STATUS_LABEL[statuses[r.profile.id] ?? 'NOT_CONTACTED']}</span>
              </>
            )}
            fields={r => [
              { label: 'FuelEU', value: eurM(r.exposure.fuelEuPenaltyEur), mono: true, tone: r.exposure.fuelEuPenaltyEur === null ? 'muted' : undefined },
              { label: 'ETS maritime', value: eurM(r.exposure.etsMaritimeEur), mono: true, tone: r.exposure.etsMaritimeEur === null ? 'muted' : undefined },
              { label: 'ETS1', value: eurM(r.exposure.ets1BillEur), mono: true, tone: r.exposure.ets1BillEur === null ? 'muted' : undefined },
              { label: 'ETS2 (2028+)', value: ets2Cell(r.exposure), mono: r.exposure.ets2Standing === 'QUANTIFIED', tone: r.exposure.ets2Standing === 'QUANTIFIED' ? undefined : 'muted' },
              { label: 'Best play', span: 2, value: r.best?.title ?? '—' },
            ]}
            empty="No companies match. Clear the search or filters."
          />
            </>
          ) : (
            <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
            <input className="input" style={{ flex: '1 1 220px', width: 'auto' }} placeholder="Search any company name" aria-label="Search companies" value={search} onChange={e => { setSearch(e.target.value); setShown(PAGE); }} />
            <select className="input" style={{ width: 'auto' }} aria-label="Country" value={country} onChange={e => { setCountry(e.target.value); setShown(PAGE); }}>
              <option value="ALL">All countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
            <span className="eyebrow">Exposed to</span>
            {MARKET_KEYS.map(m => (
              <button key={m} type="button" className={`btn ${markets.includes(m) ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={markets.includes(m)} onClick={() => toggleMarket(m)}>
                {MARKET_LABEL[m]}
              </button>
            ))}
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
              <input type="checkbox" checked={multiOnly} onChange={e => { setMultiOnly(e.target.checked); setShown(PAGE); }} /> 2+ regulations
            </label>
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
              <input type="checkbox" checked={stackOnly} onChange={e => { setStackOnly(e.target.checked); setShown(PAGE); }} /> Value stack available
            </label>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ minWidth: '1040px' }}>
              <thead>
                <tr>
                  {th('name', 'Company', 'Sort by name', false)}
                  {th('fueleu', 'FuelEU', 'FuelEU Maritime: 2026 penalty if nothing is done (EU MRV 2024 as proxy)')}
                  {th('maritime', 'ETS maritime', 'EU ETS maritime: 2026 allowance cost, 100% phase-in, at the desk EUA')}
                  {th('ets1', 'ETS1', `EU ETS1 installations: allowance bill on ${ETS1_LATEST_YEAR} verified emissions at the desk EUA`)}
                  {th('ets2', 'ETS2 (2028+)', 'EU ETS2: supplier allowance bill from 2028 where volume is known; otherwise its role')}
                  {th('total', 'At stake now', 'FuelEU + ETS maritime + ETS1, per year')}
                  <th style={{ minWidth: '170px' }}>Best play</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map(r => (
                  <tr key={r.profile.id} data-click="1" onClick={() => select(r.profile.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...stickyCell(false), maxWidth: '240px' }}>
                      <div style={{ fontWeight: 600 }}>{r.profile.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {[r.profile.countries.slice(0, 5).join(' '), `${r.profile.markets.length} reg.`].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <Money v={r.exposure.fuelEuPenaltyEur} />
                    <Money v={r.exposure.etsMaritimeEur} />
                    <Money v={r.exposure.ets1BillEur} />
                    <td className="num" style={{ textAlign: 'right', color: r.exposure.ets2Standing === 'QUANTIFIED' || r.exposure.ets2Standing === 'NONE' ? undefined : 'var(--color-text-muted)', fontSize: r.exposure.ets2Standing === 'QUANTIFIED' ? undefined : '12px' }}>
                      {ets2Cell(r.exposure)}
                    </td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{eurM(r.exposure.costAtStakeNowEur)}</td>
                    <td style={{ fontSize: '12px' }}>
                      <div>{r.best?.title ?? '—'}</div>
                      {r.stack && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                          <StackBadge spec={r.stack} />
                          {r.stackTitle !== r.best?.title && <span style={{ color: 'var(--color-text-muted)' }}>via {r.stackTitle}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{STATUS_LABEL[statuses[r.profile.id] ?? 'NOT_CONTACTED']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}
          {filtered.length > shown && (
            <button type="button" className="btn btn-ghost" style={{ marginTop: '10px' }} onClick={() => setShown(n => n + PAGE)}>
              Show more ({(filtered.length - shown).toLocaleString('en-GB')} remaining)
            </button>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

/** The company column stays in view while the regulation columns scroll sideways (phones). */
function stickyCell(header: boolean): React.CSSProperties {
  return { position: 'sticky', left: 0, zIndex: header ? 2 : 1, background: header ? 'var(--color-panel-header)' : 'var(--color-surface)', boxShadow: '1px 0 0 var(--color-divider)' };
}

function Money({ v }: { v: number | null }) {
  return <td className="num" style={{ textAlign: 'right', color: v === null ? 'var(--color-text-muted)' : undefined }}>{eurM(v)}</td>;
}

const TIMING_LABEL: Record<Opportunity['timing'], string> = { NOW: 'Now', FROM_2028: 'From 2028' };

function CompanyPage(props: {
  row: Row;
  related: CompanyProfile[];
  eua: number | null;
  ets2Price: number | null;
  year: number;
  marks: Parameters<typeof computeOpportunities>[1];
  ets2Countries: Parameters<typeof computeOpportunities>[2];
  status: Status;
  onStatus: (s: Status) => void;
  onBack: () => void;
  onLink: (other: CompanyProfile) => void;
  onUnlink: () => void;
  hasLinks: boolean;
  onSelect: (id: string) => void;
  onAction: (o: Opportunity) => void;
}) {
  const { row: { profile: p, exposure: x }, eua } = props;
  const isMobile = useIsMobile();
  const opportunities = useMemo(
    () => computeOpportunities(p, props.marks, props.ets2Countries, props.year),
    [p, props.marks, props.ets2Countries, props.year]
  );

  const vessels = p.fueleu.reduce((s, f) => s + f.group.vessels, 0);
  const lngShips = p.fueleu.reduce((s, f) => s + f.group.lngShipCount, 0);
  const deficit = p.fueleu.reduce((s, f) => s + f.deficit2026Tco2e, 0);
  const maritimeT = p.fueleu.reduce((s, f) => s + f.etsCo2Tco2, 0);
  const sites = p.ets1.flatMap(c => c.sites).sort((a, b) => b.verifiedLatestTco2 - a.verifiedLatestTco2);
  const ets1T = sites.reduce((s, v) => s + v.verifiedLatestTco2, 0);
  const ets1FitT = p.ets1.reduce((s, c) => s + c.fitVerifiedLatestTco2, 0);
  const has = (m: MarketKey) => p.markets.includes(m);

  const regRows: { key: MarketKey; cost: string; basis: string }[] = [
    { key: 'FUELEU', cost: has('FUELEU') ? `${eurM(x.fuelEuPenaltyEur)}/yr` : '', basis: has('FUELEU') ? `${vessels} ships (${lngShips} LNG-capable); 2026 deficit ${Math.round(deficit).toLocaleString('en-GB')} tCO₂e; penalty €2,400/t VLSFO-eq. EU MRV 2024 as proxy.` : '' },
    { key: 'ETS_MARITIME', cost: has('ETS_MARITIME') ? `${eurM(x.etsMaritimeEur)}/yr` : '', basis: has('ETS_MARITIME') ? `${Math.round(maritimeT).toLocaleString('en-GB')} tCO₂e in scope (100% intra-EU, 50% in/out of the EU), 100% phase-in from 2026, at €${eua ?? '—'}/t.` : '' },
    { key: 'ETS1', cost: has('ETS1') ? `${eurM(x.ets1BillEur)}/yr` : '', basis: has('ETS1') ? `${sites.length} installation${sites.length > 1 ? 's' : ''}, ${Math.round(ets1T).toLocaleString('en-GB')} tCO₂ verified ${ETS1_LATEST_YEAR} (${Math.round(ets1FitT).toLocaleString('en-GB')} t at high/medium-fit sites), at €${eua ?? '—'}/t. EUTL.` : '' },
    { key: 'ETS2', cost: has('ETS2') ? (x.ets2Standing === 'QUANTIFIED' ? `${eurM(x.ets2CostEur)}/yr from 2028` : x.ets2Standing === 'END_USER' ? 'Via its gas supplier' : 'Volume unknown') : '', basis: has('ETS2') ? p.ets2.map(e => `${e.countryIso}: ${e.role === 'REGULATED_SUPPLIER' ? 'regulated gas supplier' : `exposed end user${e.sector ? ` (${e.sector})` : ''}`}${e.marketSharePct !== null ? `, ${e.marketSharePct}% share` : ''}${e.gasVolumeTWh !== null ? `, ${e.gasVolumeTWh} TWh disclosed` : ''}`).join('; ') + `. ETS2 at €${props.ets2Price ?? '—'}/t.` : '' },
  ];

  const contacts = [
    ...p.fueleu.flatMap(f => f.group.contacts.map(c => ({ label: [c.name, c.role, c.email, c.phone].filter(Boolean).join(' · '), url: c.sourceUrl }))),
    ...p.ets2.flatMap(e => e.contacts.map(c => ({ label: [c.name, c.role, c.email, c.phone].filter(Boolean).join(' · '), url: c.sourceUrl }))),
  ];

  return (
    <div className="cl-company" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '1100px' }}>
      <div>
        <button type="button" className="btn btn-ghost" onClick={props.onBack}>← All companies</button>
      </div>
      <Card
        title={p.name}
        meta={[p.countries.join(' '), p.markets.map(m => MARKET_LABEL[m]).join(' · ')].filter(Boolean).join(' · ')}
        actions={
          <select className="input cl-status-select" style={{ minWidth: '140px' }} aria-label="Client status" value={props.status} onChange={e => props.onStatus(e.target.value as Status)}>
            {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        }
      >
        {isMobile ? (
          <div className="cl-kpis">
            <div className="cl-kpi"><div className="eyebrow">At stake now</div><strong className="num">{eurM(x.costAtStakeNowEur)}/yr</strong></div>
            {x.ets2Standing === 'QUANTIFIED' && <div className="cl-kpi"><div className="eyebrow">ETS2 from 2028</div><strong className="num">{eurM(x.ets2CostEur)}/yr</strong></div>}
          </div>
        ) : (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
          <span><span className="eyebrow">At stake now </span><strong className="num">{eurM(x.costAtStakeNowEur)}/yr</strong></span>
          {x.ets2Standing === 'QUANTIFIED' && <span><span className="eyebrow">ETS2 from 2028 </span><strong className="num">{eurM(x.ets2CostEur)}/yr</strong></span>}
        </div>
        )}
        {p.names.length > 1 && (
          <div title={p.names.join('; ')} style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', maxHeight: '48px', overflow: 'hidden' }}>
            Also appears as: {p.names.filter(n => n !== p.name).join('; ')}
          </div>
        )}
      </Card>

      <Card title="Exposure by regulation" meta="Every regulation the app covers — blank means not in our data for this company">
        {isMobile ? (
          <div className="cl-regs">
            {regRows.map(r => (
              <div key={r.key} className="cl-reg" style={{ opacity: has(r.key) ? 1 : 0.55 }}>
                <div className="cl-reg-top">
                  <div>
                    <div style={{ fontWeight: 600 }}>{MARKET_LABEL[r.key]}</div>
                    <div className="cl-reg-sub">{has(r.key) ? 'Exposed' : 'Not in data'}</div>
                  </div>
                  <div className="num cl-reg-cost">{r.cost}</div>
                </div>
                {r.basis && <div className="cl-reg-basis">{r.basis}</div>}
              </div>
            ))}
          </div>
        ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr><th>Regulation</th><th>Exposed</th><th style={{ textAlign: 'right' }}>Cost</th><th>Basis</th></tr>
            </thead>
            <tbody>
              {regRows.map(r => (
                <tr key={r.key} style={{ opacity: has(r.key) ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{MARKET_LABEL[r.key]}</td>
                  <td>{has(r.key) ? 'Yes' : 'Not in data'}</td>
                  <td className="num" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.cost}</td>
                  <td style={{ fontSize: '12px' }}>{r.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      <Card title="What you can do for them" meta="Ranked by value to the client at desk marks">
        {opportunities.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>No compliance play from the data on file.</p>
        ) : (
          <ol className="cl-plays" style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {opportunities.map(o => (
              <li key={o.id} className="cl-play">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{o.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{o.regulation === 'VOLUNTARY' ? 'Voluntary' : MARKET_LABEL[o.regulation]} · {TIMING_LABEL[o.timing]}</div>
                </div>
                <div style={{ fontSize: '13px', marginTop: '2px' }}><strong>Sell:</strong> {o.product}</div>
                <div style={{ fontSize: '13px' }}><strong>Why it works:</strong> {o.why}</div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', margin: '6px 0' }}>
                  {o.volumeMWh !== null && <span><span className="eyebrow">Volume </span><span className="num">{mwh(o.volumeMWh)}/yr</span></span>}
                  {o.valueEur !== null && <span><span className="eyebrow">{o.valueLabel} </span><strong className="num">{eur(o.valueEur)}/yr</strong></span>}
                  {o.valueEurPerMWh !== null && <span><span className="eyebrow">Per MWh </span><span className="num">{eur(o.valueEurPerMWh, 2)}</span></span>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{o.valueBasis}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Evidence: {o.evidenceNeeded} · {o.legalBasis}</div>
                {o.caveats.length > 0 && (
                  <ul style={{ margin: '4px 0 0', paddingLeft: '16px', fontSize: '12px' }}>
                    {o.caveats.map(c => <li key={c}>{c}</li>)}
                  </ul>
                )}
                {o.stack && (
                  <div style={{ marginTop: '10px' }}>
                    <ValueStackCard key={`${p.id}-${o.id}`} spec={o.stack} marks={props.marks} heading={o.stack.isStack ? `Value stack · ${o.stack.pricedRegimes.join(' + ')}` : 'Value stack'} />
                  </div>
                )}
                {o.action && (
                  <button type="button" className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={() => props.onAction(o)}>{o.action.label}</button>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      {sites.length > 0 && (
        <Card title="ETS1 installations" meta={`${sites.length} site${sites.length > 1 ? 's' : ''} · verified ${ETS1_LATEST_YEAR}`}>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px' }}>
            {sites.slice(0, 10).map(s => (
              <li key={s.id}>{s.name} ({[s.city, s.country].filter(Boolean).join(', ')}) — {SECTOR_LABEL[s.sector]}, {Math.round(s.verifiedLatestTco2).toLocaleString('en-GB')} t</li>
            ))}
            {sites.length > 10 && <li>…and {sites.length - 10} more</li>}
          </ul>
        </Card>
      )}

      {p.ets2.length > 0 && (
        <Card title="ETS2 sources" meta="Desk research">
          {p.ets2.map(e => (
            <div key={e.id} style={{ fontSize: '13px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 600 }}>{e.name} ({e.countryIso})</div>
              <div style={{ color: 'var(--color-text-muted)' }}>{e.shareBasis ?? e.notes ?? ''}</div>
              <div>{e.evidence.map(ev => <a key={ev.url + ev.note} href={ev.url} target="_blank" rel="noreferrer" title={ev.note} style={{ marginRight: '8px' }}>source</a>)}</div>
            </div>
          ))}
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
