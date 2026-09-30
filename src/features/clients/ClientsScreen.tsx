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
  sectorsOf,
  CompanyProfile,
  CompanyLink,
  MarketKey,
  MARKET_KEYS,
  MARKET_LABEL,
  SectorKey,
  SECTOR_NAME,
} from '../../domain/companies/directory';
import {
  computeRegulationExposure,
  computeOpportunities,
  biomethaneValueEur,
  ets1FirstDealShare,
  ETS1_BASIS_LABEL,
  RegulationExposure,
  Opportunity,
  StackSpec,
} from '../../domain/companies/opportunities';
import { SECTOR_LABEL, ETS1_LATEST_YEAR } from '../../domain/ets1/sites';
import { selectMarkPrice } from '../../domain/netback/engine';
import { searchFold } from '../../domain/companies/normalize';
import { formatEur } from '../../domain/companies/money';
import { buildCsv } from '../../domain/companies/csv';
import { Status, STATUS_LABEL, resolveStatus, withStatus, linksWithout } from '../../domain/companies/clientState';
import { ValueStackCard, StackBadge } from '../value-stack/ValueStackCard';
import { LINKS_KEY, STATUS_KEY, readLinks, readStatuses, readEts2Companies, readEts2Countries, writeJson } from './deskInputs';

const PAGE = 100;
/** EU MRV reporting year behind every shipping figure (FuelEU and ETS maritime). */
const MRV_YEAR = 2024;
/** Country filter value for companies with no home country in the data (every shipping group). */
const NO_COUNTRY = '__none__';

type SortKey = 'name' | 'sectors' | 'fueleu' | 'maritime' | 'ets1' | 'ets2' | 'cost' | 'bio';

/** Mobile sort select: the same keys the desktop headers sort by. */
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'bio:d', label: 'Biomethane value, high to low' },
  { value: 'cost:d', label: 'Cost now, high to low' },
  { value: 'name:a', label: 'Company A–Z' },
  { value: 'name:d', label: 'Company Z–A' },
  { value: 'fueleu:d', label: 'FuelEU cost, high to low' },
  { value: 'maritime:d', label: 'ETS maritime, high to low' },
  { value: 'ets1:d', label: 'ETS1, high to low' },
  { value: 'ets2:d', label: 'ETS2 (2028+), high to low' },
  { value: 'sectors:d', label: 'In most sectors' },
];

const COLUMN_HELP = {
  bio: `Biomethane value: the annual value of the biomethane this company could use now, every play at market on the same basis. Ships: FuelEU compliance at the desk pool price plus EU ETS maritime allowances saved (EU MRV ${MRV_YEAR}). ETS1: allowances saved at the desk EUA on ${ETS1_LATEST_YEAR} verified emissions at high/medium-fit sites (full potential, ${ETS1_BASIS_LABEL}). ETS2 starts in 2028 and is not included.`,
  cost: `Cost now: what compliance costs this company this year at desk marks. FuelEU: the 2026 deficit bought at the desk pool mark (EU MRV ${MRV_YEAR}) + EU ETS maritime (EU MRV ${MRV_YEAR}, 100% phase-in) + EU ETS1 (${ETS1_LATEST_YEAR} emissions, ${ETS1_BASIS_LABEL}). ETS2 is not included.`,
  fueleu: `FuelEU Maritime: the 2026 deficit (EU MRV ${MRV_YEAR} as proxy) bought at the desk pool mark. "Compliant" means no deficit. The statutory penalty is on the company page.`,
  maritime: `EU ETS maritime: 2026 allowance cost, 100% phase-in, on EU MRV ${MRV_YEAR} emissions at the desk EUA`,
  ets1: `EU ETS1 installations: allowance bill on ${ETS1_LATEST_YEAR} verified emissions at the desk EUA, ${ETS1_BASIS_LABEL}`,
  ets2: 'EU ETS2: supplier allowance bill from 2028 at the desk ETS2 mark, where volume is known. "Partial" lists only the countries with a volume; otherwise its role.',
} as const;

function eur(v: number | null, digits = 0): string {
  return v === null ? '—' : `€${v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function mwh(v: number | null): string {
  return v === null ? '—' : `${Math.round(v).toLocaleString('en-GB')} MWh`;
}

/** A desk price for display: two decimals, no float noise. */
function price(v: number | null): string {
  return v === null ? '—' : v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Cell {
  text: string;
  /** Rendered grey: no figure. */
  muted: boolean;
  title?: string;
}

function fuelEuCell(x: RegulationExposure): Cell {
  switch (x.fuelEuState) {
    case 'PRICED': return { text: formatEur(x.fuelEuCostEur), muted: false, title: 'FuelEU deficit at the desk pool mark' };
    case 'COMPLIANT': return { text: 'Compliant', muted: true, title: 'No 2026 FuelEU deficit' };
    case 'NO_MARK': return { text: '—', muted: true, title: 'No FuelEU pool mark set, so the deficit is not priced' };
    default: return { text: '—', muted: true };
  }
}

function ets2Cell(x: RegulationExposure): Cell {
  switch (x.ets2Standing) {
    case 'QUANTIFIED': return { text: formatEur(x.ets2CostEur), muted: false };
    case 'PARTIAL': return { text: `${formatEur(x.ets2CostEur)} partial`, muted: false, title: `Covers ${x.ets2CoveredCountries.join(', ')} only; no volume yet for ${x.ets2UncoveredCountries.join(', ') || 'its other suppliers'}` };
    case 'NO_ETS2_PRICE': return { text: 'No ETS2 price', muted: true, title: 'Volume is known but there is no ETS2 mark to price it' };
    case 'SUPPLIER_VOLUME_UNKNOWN': return { text: 'Volume unknown', muted: true };
    case 'END_USER': return { text: 'End user', muted: true };
    default: return { text: '—', muted: true };
  }
}

function costNowCell(x: RegulationExposure): Cell {
  if (x.costNowEur === 0 && x.fuelEuState === 'COMPLIANT') return { text: 'Compliant', muted: true };
  if (x.costNowEur === null) return { text: '—', muted: true };
  return x.costNowIncomplete
    ? { text: `${formatEur(x.costNowEur)}*`, muted: false, title: 'Excludes the FuelEU deficit: no pool mark to price it' }
    : { text: formatEur(x.costNowEur), muted: false };
}

interface Row {
  profile: CompanyProfile;
  exposure: RegulationExposure;
  best: Opportunity | null;
  /** Annual value of the biomethane it could use now (sum of the NOW plays), €. */
  bioValueEur: number | null;
  /** The first play whose value stack pays in 2+ regimes on the same MWh. */
  stack: StackSpec | null;
  stackTitle: string | null;
  sectors: SectorKey[];
  /** Every name, folded for accent- and case-insensitive search. */
  haystack: string;
}

function sortValue(r: Row, key: SortKey): number | null {
  switch (key) {
    case 'sectors': return r.sectors.length;
    case 'fueleu': return r.exposure.fuelEuCostEur;
    case 'maritime': return r.exposure.etsMaritimeEur;
    case 'ets1': return r.exposure.ets1BillEur;
    // Unquantified ETS2 exposure still ranks above none.
    case 'ets2': return r.exposure.ets2CostEur ?? (r.exposure.ets2Standing === 'NONE' ? null : 0);
    case 'cost': return r.exposure.costNowEur;
    case 'bio': return r.bioValueEur;
    default: return null;
  }
}

const sectorLine = (r: Row) => r.sectors.map(k => SECTOR_NAME[k]).join(' · ');

export function ClientsScreen() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const eua = selectMarkPrice(state.marks.marks['EU_ETS1'], 'mid');
  const ets2Price = selectMarkPrice(state.marks.marks['EU_ETS2'], 'mid');
  const poolMid = selectMarkPrice(state.marks.marks['FUELEU'], 'mid');
  const year = new Date().getFullYear();

  const [links, setLinks] = useState<CompanyLink[]>(readLinks);
  const [statuses, setStatuses] = useState<Record<string, Status>>(readStatuses);
  const ets2Countries = useMemo(readEts2Countries, []);
  const ets2Companies = useMemo(readEts2Companies, []);
  const directory = useMemo(() => buildCompanyDirectory(links, ets2Companies), [links, ets2Companies]);

  const rows: Row[] = useMemo(
    () => directory.map(profile => {
      const ops = computeOpportunities(profile, state.marks, ets2Countries, year);
      const stacked = ops.find(o => o.stack?.isStack);
      return {
        profile,
        exposure: computeRegulationExposure(profile, state.marks, ets2Countries),
        best: ops[0] ?? null,
        bioValueEur: biomethaneValueEur(ops),
        stack: stacked?.stack ?? null,
        stackTitle: stacked?.title ?? null,
        sectors: sectorsOf(profile),
        haystack: profile.names.map(searchFold).join('\u0001'),
      };
    }),
    [directory, state.marks, ets2Countries, year]
  );

  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState<MarketKey[]>([]);
  const [country, setCountry] = useState('ALL');
  const [multiOnly, setMultiOnly] = useState(false);
  const [stackOnly, setStackOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'bio', desc: true });
  const [shown, setShown] = useState(PAGE);

  const countries = useMemo(() => [...new Set(directory.flatMap(p => p.countries))].sort(), [directory]);

  // Everything but the country filter, so we can say how many shipping groups it hides.
  const beforeCountry = useMemo(() => {
    const q = searchFold(search.trim());
    return rows
      .filter(r => !q || r.haystack.includes(q))
      .filter(r => markets.every(m => r.profile.markets.includes(m)))
      .filter(r => !multiOnly || r.sectors.length > 1)
      .filter(r => !stackOnly || r.stack !== null);
  }, [rows, search, markets, multiOnly, stackOnly]);

  const filtered = useMemo(() => {
    const out = beforeCountry.filter(r => (
      country === 'ALL' ? true
        : country === NO_COUNTRY ? r.profile.countries.length === 0
        : r.profile.countries.includes(country)
    ));
    const dir = sort.desc ? -1 : 1;
    // Ties fall back to the biggest biomethane value, or the biggest cost when that is the sort.
    const tieKey: SortKey = sort.key === 'bio' ? 'cost' : 'bio';
    return out.sort((a, b) => {
      if (sort.key === 'name') return a.profile.name.localeCompare(b.profile.name) * dir;
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      // Blanks always sink, whichever way the column is sorted.
      if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
      if (va !== vb) return va < vb ? -dir : dir;
      const ta = sortValue(a, tieKey);
      const tb = sortValue(b, tieKey);
      return ta === tb ? 0 : ta === null ? 1 : tb === null ? -1 : ta < tb ? 1 : -1;
    });
  }, [beforeCountry, country, sort]);

  const hiddenShipping = country !== 'ALL' && country !== NO_COUNTRY ? beforeCountry.filter(r => r.profile.countries.length === 0).length : 0;

  const selectedId = params.get('company');
  // An old bookmark may hold an id that has since been merged into another profile.
  const selectedRow = selectedId ? rows.find(r => r.profile.id === selectedId) ?? rows.find(r => r.profile.memberIds.includes(selectedId)) ?? null : null;
  const related = useMemo(() => (selectedRow ? suggestRelated(selectedRow.profile, directory) : []), [selectedRow, directory]);

  useEffect(() => {
    document.querySelectorAll('.ds-page-shell, main').forEach(el => el.scrollTo?.({ top: 0 }));
  }, [selectedId]);

  const select = (id: string | null) => setParams(id ? { company: id } : {});
  const toggleMarket = (m: MarketKey) => { setMarkets(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])); setShown(PAGE); };
  const statusOf = (p: CompanyProfile) => resolveStatus(statuses, p);
  const setStatus = (p: CompanyProfile, s: Status) => {
    const next = withStatus(statuses, p, s);
    setStatuses(next);
    writeJson(STATUS_KEY, next);
  };
  const link = (a: string, b: string) => {
    const next = [...links, { a, b }];
    setLinks(next);
    writeJson(LINKS_KEY, next);
  };
  const unlinkAll = (profile: CompanyProfile) => {
    const next = linksWithout(links, profile);
    setLinks(next);
    writeJson(LINKS_KEY, next);
  };
  const openAction = (o: Opportunity) => {
    if (!o.action) return;
    const { route, params: q } = o.action;
    const qs = new URLSearchParams(q).toString();
    navigate(qs ? `${route}?${qs}` : route);
  };

  const exportCsv = () => {
    const header = [
      'Company', 'Countries', 'Sectors', 'Regulations',
      'Biomethane value € (plays now, at desk marks)', 'Best play', 'Cost now €',
      'FuelEU cost € (deficit at pool mark)', 'FuelEU 2026 deficit tCO2e', 'FuelEU statutory penalty € (ceiling)',
      `EU ETS maritime € (MRV ${MRV_YEAR})`, `EU ETS1 € (${ETS1_LATEST_YEAR} emissions, ${ETS1_BASIS_LABEL})`, 'EU ETS1 tCO2',
      'EU ETS2 from 2028 €', 'EU ETS2 status', 'EU ETS2 countries covered', 'Value stack', 'Status',
    ];
    const round = (v: number | null) => (v === null ? null : Math.round(v));
    const lines = filtered.map(r => [
      r.profile.name,
      r.profile.countries.join(' '),
      sectorLine(r),
      r.profile.markets.map(m => MARKET_LABEL[m]).join('; '),
      round(r.bioValueEur),
      r.best?.title ?? null,
      round(r.exposure.costNowEur),
      round(r.exposure.fuelEuCostEur),
      round(r.exposure.fuelEuDeficitTco2e),
      round(r.exposure.fuelEuPenaltyEur),
      round(r.exposure.etsMaritimeEur),
      round(r.exposure.ets1BillEur),
      round(r.exposure.ets1Tco2),
      round(r.exposure.ets2CostEur),
      r.exposure.ets2Standing === 'NONE' ? null : r.exposure.ets2Standing,
      r.exposure.ets2CoveredCountries.join(' '),
      r.stack ? r.stack.pricedRegimes.join(' + ') : null,
      STATUS_LABEL[statusOf(r.profile)],
    ]);
    const blob = new Blob([buildCsv(header, lines)], { type: 'text/csv;charset=utf-8' });
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
          poolMid={poolMid}
          year={year}
          marks={state.marks}
          ets2Countries={ets2Countries}
          status={statusOf(selectedRow.profile)}
          onStatus={s => setStatus(selectedRow.profile, s)}
          onBack={() => select(null)}
          onLink={other => link(selectedRow.profile.id, other.id)}
          onUnlink={() => unlinkAll(selectedRow.profile)}
          hasLinks={links.some(l => selectedRow.profile.memberIds.includes(l.a) || selectedRow.profile.memberIds.includes(l.b))}
          onSelect={select}
          onAction={openAction}
        />
      </PageShell>
    );
  }

  const listed = Math.min(shown, filtered.length);
  const stackCount = filtered.filter(r => r.stack !== null).length;
  const costShown = filtered.reduce((s, r) => s + (r.exposure.costNowEur ?? 0), 0);
  const bioShown = filtered.reduce((s, r) => s + (r.bioValueEur ?? 0), 0);
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
  const countryOptions = (
    <>
      <option value="ALL">All countries</option>
      <option value={NO_COUNTRY}>Shipping groups (no home country)</option>
      {countries.map(c => <option key={c} value={c}>{c}</option>)}
    </>
  );
  const definition = 'Cost now: what compliance costs this year at desk marks. Biomethane value: what the biomethane it could use is worth at those marks.';
  const countryNote = hiddenShipping > 0 ? (
    <div className="cl-note">
      {hiddenShipping.toLocaleString('en-GB')} shipping group{hiddenShipping === 1 ? '' : 's'} not shown: EU MRV gives no home country, so a country filter hides them. Choose &quot;Shipping groups (no home country)&quot; to list them.
    </div>
  ) : null;

  return (
    <PageShell style={{ overflowY: 'auto' }}>
      <PageHeader
        title="Clients"
        context="Every company the desk knows, one row each, with its exposure under every regulation. Tap a company to see what you can sell it."
      />
      <div className="cl-kpi-wrap" style={{ padding: '0 16px' }}>
        <KpiRow columns={5}>
          <KpiTile label="Companies" value={filtered.length.toLocaleString('en-GB')} sub={`${filtered.length.toLocaleString('en-GB')} match · ${listed.toLocaleString('en-GB')} listed`} />
          <KpiTile label="Value stack available" value={stackCount.toLocaleString('en-GB')} sub="2+ regimes pay on the same MWh" />
          <KpiTile label="Biomethane value" value={formatEur(bioShown)} unit="/yr" sub="plays now, all matching companies" />
          <KpiTile label="Cost now" value={formatEur(costShown)} unit="/yr" sub={`FuelEU + ETS maritime + ETS1 (${ETS1_BASIS_LABEL})`} />
          <KpiTile label="Prices used" value={eua === null ? '—' : `€${price(eua)}`} unit="/t EUA" sub={`ETS2 €${price(ets2Price)} · FuelEU pool €${price(poolMid)}/t · desk marks`} />
        </KpiRow>
      </div>

      <div className="cl-list-wrap" style={{ padding: '16px' }}>
        <Card className="cl-list-card" title="Company × regulation" meta={isMobile ? 'Annual € at desk marks · tap a company to open it' : 'Annual € at desk marks · tap a header to sort · tap a company to open it'}>
          <div className="cl-note">{definition}</div>
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
                {countryOptions}
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
              <input type="checkbox" checked={multiOnly} onChange={e => { setMultiOnly(e.target.checked); setShown(PAGE); }} /> In 2+ sectors
            </label>
            <label className="mfb-check">
              <input type="checkbox" checked={stackOnly} onChange={e => { setStackOnly(e.target.checked); setShown(PAGE); }} /> Value stack available
            </label>
            <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={exportCsv}>Export CSV</button>
          </MobileFilterBar>
          {countryNote}
          <MobileCardList
            testId="clients-cards"
            items={filtered.slice(0, shown)}
            getKey={r => r.profile.id}
            onSelect={r => select(r.profile.id)}
            title={r => r.profile.name}
            subtitle={r => [r.profile.countries.slice(0, 5).join(' '), sectorLine(r)].filter(Boolean).join(' · ')}
            metric={r => formatEur(r.bioValueEur)}
            metricLabel={() => 'Biomethane value'}
            badges={r => (
              <>
                {r.stack && <StackBadge spec={r.stack} />}
                <span className="cl-status">{STATUS_LABEL[statusOf(r.profile)]}</span>
              </>
            )}
            fields={r => {
              const fe = fuelEuCell(r.exposure);
              const cn = costNowCell(r.exposure);
              const e2 = ets2Cell(r.exposure);
              return [
                { label: 'Cost now', value: cn.text, mono: !cn.muted, tone: cn.muted ? 'muted' : undefined, span: 2 },
                { label: 'FuelEU', value: fe.text, mono: !fe.muted, tone: fe.muted ? 'muted' : undefined },
                { label: 'ETS maritime', value: formatEur(r.exposure.etsMaritimeEur), mono: true, tone: r.exposure.etsMaritimeEur === null ? 'muted' : undefined },
                { label: `ETS1 (${ETS1_LATEST_YEAR}, gross)`, value: formatEur(r.exposure.ets1BillEur), mono: true, tone: r.exposure.ets1BillEur === null ? 'muted' : undefined },
                { label: 'ETS2 (2028+)', value: e2.text, mono: !e2.muted, tone: e2.muted ? 'muted' : undefined },
                { label: 'Best play', span: 2, value: r.best?.title ?? '—' },
              ];
            }}
            empty="No companies match. Clear the search or filters."
          />
            </>
          ) : (
            <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
            <input className="input" style={{ flex: '1 1 220px', width: 'auto' }} placeholder="Search any company name" aria-label="Search companies" value={search} onChange={e => { setSearch(e.target.value); setShown(PAGE); }} />
            <select className="input" style={{ width: 'auto' }} aria-label="Country" value={country} onChange={e => { setCountry(e.target.value); setShown(PAGE); }}>
              {countryOptions}
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
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }} title="Sectors: shipping (FuelEU and EU ETS maritime count as one), ETS1 installations, ETS2">
              <input type="checkbox" checked={multiOnly} onChange={e => { setMultiOnly(e.target.checked); setShown(PAGE); }} /> In 2+ sectors
            </label>
            <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
              <input type="checkbox" checked={stackOnly} onChange={e => { setStackOnly(e.target.checked); setShown(PAGE); }} /> Value stack available
            </label>
          </div>
          {countryNote}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ minWidth: '1240px' }}>
              <thead>
                <tr>
                  {th('name', 'Company', 'Sort by name', false)}
                  {th('bio', 'Biomethane value', COLUMN_HELP.bio)}
                  {th('cost', 'Cost now', COLUMN_HELP.cost)}
                  {th('fueleu', 'FuelEU', COLUMN_HELP.fueleu)}
                  {th('maritime', 'ETS maritime', COLUMN_HELP.maritime)}
                  {th('ets1', 'ETS1', COLUMN_HELP.ets1)}
                  {th('ets2', 'ETS2 (2028+)', COLUMN_HELP.ets2)}
                  <th style={{ minWidth: '170px' }} title="The play with the highest annual value on the Biomethane value basis">Best play</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map(r => {
                  const fe = fuelEuCell(r.exposure);
                  const cn = costNowCell(r.exposure);
                  const e2 = ets2Cell(r.exposure);
                  return (
                  <tr key={r.profile.id} data-click="1" onClick={() => select(r.profile.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...stickyCell(false), maxWidth: '240px' }}>
                      <div style={{ fontWeight: 600 }}>{r.profile.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {[r.profile.countries.slice(0, 5).join(' '), sectorLine(r)].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600, color: r.bioValueEur === null ? 'var(--color-text-muted)' : undefined }}>{formatEur(r.bioValueEur)}</td>
                    <td className="num" title={cn.title} style={{ textAlign: 'right', color: cn.muted ? 'var(--color-text-muted)' : undefined }}>{cn.text}</td>
                    <td className="num" title={fe.title} style={{ textAlign: 'right', color: fe.muted ? 'var(--color-text-muted)' : undefined, fontSize: fe.text === 'Compliant' ? '12px' : undefined }}>{fe.text}</td>
                    <Money v={r.exposure.etsMaritimeEur} />
                    <Money v={r.exposure.ets1BillEur} />
                    <td className="num" title={e2.title} style={{ textAlign: 'right', color: e2.muted ? 'var(--color-text-muted)' : undefined, fontSize: e2.muted && r.exposure.ets2Standing !== 'NONE' ? '12px' : undefined }}>
                      {e2.text}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div>{r.best?.title ?? '—'}{r.best?.valueEur != null ? <span style={{ color: 'var(--color-text-muted)' }}> · {formatEur(r.best.valueEur)}</span> : null}</div>
                      {r.stack && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                          <StackBadge spec={r.stack} />
                          {r.stackTitle !== r.best?.title && <span style={{ color: 'var(--color-text-muted)' }}>via {r.stackTitle}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{STATUS_LABEL[statusOf(r.profile)]}</td>
                  </tr>
                  );
                })}
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
  return <td className="num" style={{ textAlign: 'right', color: v === null ? 'var(--color-text-muted)' : undefined }}>{formatEur(v)}</td>;
}

const TIMING_LABEL: Record<Opportunity['timing'], string> = { NOW: 'Now', FROM_2028: 'From 2028' };

function CompanyPage(props: {
  row: Row;
  related: CompanyProfile[];
  eua: number | null;
  ets2Price: number | null;
  poolMid: number | null;
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
  const { row: { profile: p, exposure: x, bioValueEur }, eua, poolMid } = props;
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
  const costNow = costNowCell(x);

  const fuelEuCost = x.fuelEuState === 'PRICED' ? `${formatEur(x.fuelEuCostEur)}/yr` : x.fuelEuState === 'COMPLIANT' ? 'Compliant' : '—';
  const ets2Cost = ((): string => {
    switch (x.ets2Standing) {
      case 'QUANTIFIED': return `${formatEur(x.ets2CostEur)}/yr from 2028`;
      case 'PARTIAL': return `${formatEur(x.ets2CostEur)}/yr from 2028, partial`;
      case 'NO_ETS2_PRICE': return 'No ETS2 price';
      case 'END_USER': return 'Via its gas supplier';
      default: return 'Volume unknown';
    }
  })();
  const ets2Coverage = x.ets2Standing === 'PARTIAL'
    ? ` Figure covers ${x.ets2CoveredCountries.join(', ')} only${x.ets2UncoveredCountries.length ? `; no volume yet for ${x.ets2UncoveredCountries.join(', ')}` : ''}.`
    : '';

  const regRows: { key: MarketKey; cost: string; basis: string }[] = [
    {
      key: 'FUELEU',
      cost: has('FUELEU') ? fuelEuCost : '',
      basis: has('FUELEU')
        ? `${vessels} ships (${lngShips} LNG-capable); 2026 deficit ${Math.round(deficit).toLocaleString('en-GB')} tCO₂e, bought at the desk pool mark of €${price(poolMid)}/t. ${x.fuelEuState === 'NO_MARK' ? 'No pool mark is set, so the deficit is not priced. ' : ''}Penalty if nothing is done: ${formatEur(x.fuelEuPenaltyEur)}/yr (statutory, €2,400/t VLSFO-eq.). EU MRV ${MRV_YEAR} as proxy.`
        : '',
    },
    { key: 'ETS_MARITIME', cost: has('ETS_MARITIME') ? `${formatEur(x.etsMaritimeEur)}/yr` : '', basis: has('ETS_MARITIME') ? `${Math.round(maritimeT).toLocaleString('en-GB')} tCO₂e in scope (100% intra-EU, 50% in/out of the EU), 100% phase-in from 2026, at €${price(eua)}/t. EU MRV ${MRV_YEAR}.` : '' },
    { key: 'ETS1', cost: has('ETS1') ? `${formatEur(x.ets1BillEur)}/yr` : '', basis: has('ETS1') ? `${sites.length} installation${sites.length > 1 ? 's' : ''}, ${Math.round(ets1T).toLocaleString('en-GB')} tCO₂ verified ${ETS1_LATEST_YEAR} (${Math.round(ets1FitT).toLocaleString('en-GB')} t at high/medium-fit sites), at €${price(eua)}/t, ${ETS1_BASIS_LABEL}. EUTL.` : '' },
    { key: 'ETS2', cost: has('ETS2') ? ets2Cost : '', basis: has('ETS2') ? p.ets2.map(e => `${e.countryIso}: ${e.role === 'REGULATED_SUPPLIER' ? 'regulated gas supplier' : `exposed end user${e.sector ? ` (${e.sector})` : ''}`}${e.marketSharePct !== null ? `, ${e.marketSharePct}% share` : ''}${e.gasVolumeTWh !== null ? `, ${e.gasVolumeTWh} TWh disclosed` : ''}`).join('; ') + `. ETS2 at ${props.ets2Price === null ? 'no price' : `€${price(props.ets2Price)}/t`}.${ets2Coverage}` : '' },
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
            <div className="cl-kpi"><div className="eyebrow">Biomethane value</div><strong className="num">{formatEur(bioValueEur)}/yr</strong></div>
            <div className="cl-kpi"><div className="eyebrow">Cost now</div><strong className="num">{costNow.text}{costNow.text === 'Compliant' ? '' : '/yr'}</strong></div>
            {x.fuelEuPenaltyEur !== null && x.fuelEuPenaltyEur > 0 && <div className="cl-kpi"><div className="eyebrow">Penalty if nothing is done</div><strong className="num">{formatEur(x.fuelEuPenaltyEur)}/yr</strong></div>}
            {(x.ets2Standing === 'QUANTIFIED' || x.ets2Standing === 'PARTIAL') && <div className="cl-kpi"><div className="eyebrow">ETS2 from 2028{x.ets2Standing === 'PARTIAL' ? ' (partial)' : ''}</div><strong className="num">{formatEur(x.ets2CostEur)}/yr</strong></div>}
          </div>
        ) : (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
          <span title={COLUMN_HELP.bio}><span className="eyebrow">Biomethane value </span><strong className="num">{formatEur(bioValueEur)}/yr</strong></span>
          <span title={COLUMN_HELP.cost}><span className="eyebrow">Cost now </span><strong className="num">{costNow.text}{costNow.text === 'Compliant' ? '' : '/yr'}</strong></span>
          {x.fuelEuPenaltyEur !== null && x.fuelEuPenaltyEur > 0 && <span title="Annex IV statutory penalty on the 2026 deficit: a ceiling, not what compliance costs"><span className="eyebrow">Penalty if nothing is done </span><strong className="num">{formatEur(x.fuelEuPenaltyEur)}/yr</strong></span>}
          {(x.ets2Standing === 'QUANTIFIED' || x.ets2Standing === 'PARTIAL') && <span><span className="eyebrow">ETS2 from 2028{x.ets2Standing === 'PARTIAL' ? ' (partial)' : ''} </span><strong className="num">{formatEur(x.ets2CostEur)}/yr</strong></span>}
        </div>
        )}
        {p.names.length > 1 && (
          <div title={p.names.join('; ')} style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', maxHeight: '48px', overflow: 'hidden' }}>
            Also appears as: {p.names.filter(n => n !== p.name).join('; ')}
          </div>
        )}
      </Card>

      <Card title="Exposure by regulation" meta={`Annual € at desk marks · shipping ${MRV_YEAR} (EU MRV) · ETS1 ${ETS1_LATEST_YEAR} (EUTL) · blank means not in our data`}>
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
              <tr><th>Regulation</th><th>Exposed</th><th style={{ textAlign: 'right' }}>Cost now</th><th>Basis</th></tr>
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

      <Card title="What you can do for them" meta="Ranked by annual value at desk marks, every play on the same basis">
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
                  {o.valueEur !== null && <span><span className="eyebrow">{o.valueLabel} </span><strong className="num">{eur(o.valueEur)}/yr</strong>{o.valueEurHigh !== null && <span className="num"> (up to {eur(o.valueEurHigh)} at 100% intra-EU)</span>}</span>}
                  {o.firstDealMWh !== null && <span title="A share of the volume to open with. A desk heuristic (Assumptions: clients.firstDealShare); the value above is the full potential."><span className="eyebrow">First deal </span><span className="num">{mwh(o.firstDealMWh)}/yr ({Math.round(ets1FirstDealShare() * 100)}% of the volume)</span></span>}
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
