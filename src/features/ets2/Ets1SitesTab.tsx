import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { buildEts1SiteTradeBuilderUrl } from './handoff';
import { Search } from 'lucide-react';
import { KpiRow, KpiTile, DataTable, TablePagination, SidePanel, PanelSection, MobileCardList, Sheet } from '../../shared/ui';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { MobileFilterBar, SheetField } from './MobileFilterBar';
import { useAppState } from '../../store/context';
import {
  ETS1_SITES,
  ETS1_LATEST_YEAR,
  ETS1_PREVIOUS_YEAR,
  ETS1_SOURCE_URL,
  SECTOR_LABEL,
  SECTOR_FIT,
  Ets1Sector,
  Ets1Company,
  Ets1Site,
  BiomethaneFit,
  groupSitesByCompany,
  ets1AvoidedValuePerMWh,
  biomethaneMWhToAbate,
} from '../../domain/ets1/sites';
import { selectMarkPrice, ETS_NATURAL_GAS_TCO2_PER_MWH } from '../../domain/netback/engine';
import { HHV_TO_LHV_FACTOR } from '../../domain/offtake/engine';
import { normalizeCompanyName } from '../../domain/companies/normalize';
import { CompanyProfile, MARKET_LABEL } from '../../domain/companies/directory';
import { ets1StackSpec, ets1FirstDealShare, ets1AbatableTco2 } from '../../domain/companies/opportunities';
import { MarksState } from '../../domain/netback/types';
import { ValueStackCard, StackBadge } from '../value-stack/ValueStackCard';
import { companyLookup, stackedPlay } from '../value-stack/companyLookup';
import { showToast } from '../../app/DeskToastContainer';
import {
  OutreachStatus,
  STATUS_LABEL,
  readStatuses,
  writeStatuses,
  StatusDot,
  StatusSelect,
  FitBadge,
  BarCell,
  Segmented,
  SortHeader,
  SortDir,
  eurM,
  eur,
  tonnes,
  csvCell,
  downloadCsv,
  parseNumber,
} from './etsUi';

type View = 'COMPANIES' | 'SITES';
type FitFilter = 'HIGH' | 'HIGH_MEDIUM' | 'ALL';
type SortKey = 'name' | 'tco2' | 'deal' | 'change';

const STATUS_KEY = 'biomethane_ets1_outreach_v1';
const PAGE_SIZE = 50;
const PERCENT = 100;
const MWH_PER_GWH = 1000;
const TONNES_PER_MT = 1_000_000;

const COMPANY_SORT_OPTIONS = [
  { value: 'tco2:desc', label: 'Verified emissions, high to low' },
  { value: 'tco2:asc', label: 'Verified emissions, low to high' },
  { value: 'deal:desc', label: 'First deal saving, high to low' },
  { value: 'name:asc', label: 'Company A–Z' },
  { value: 'name:desc', label: 'Company Z–A' },
];
const SITE_SORT_OPTIONS = [
  { value: 'tco2:desc', label: 'Verified emissions, high to low' },
  { value: 'tco2:asc', label: 'Verified emissions, low to high' },
  { value: 'change:desc', label: 'Change vs prior year, rising first' },
  { value: 'change:asc', label: 'Change vs prior year, falling first' },
  { value: 'name:asc', label: 'Installation A–Z' },
  { value: 'name:desc', label: 'Installation Z–A' },
];

const FIT_FILTER_OK: Record<FitFilter, (f: BiomethaneFit) => boolean> = {
  HIGH: f => f === 'HIGH',
  HIGH_MEDIUM: f => f !== 'LOW',
  ALL: () => true,
};

function companyMeta(c: Ets1Company): string {
  const sectors = c.sectors.map(s => SECTOR_LABEL[s]);
  const sectorText = sectors.length > 1 ? `${sectors[0]} +${sectors.length - 1}` : sectors[0] ?? '';
  return [c.countries.slice(0, 4).join(' '), sectorText, `${c.sites.length} site${c.sites.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
}

/** Why this company's grade should or should not be trusted, from its own sites. */
function fitNotes(c: Ets1Company): { tone: 'warn' | 'info'; text: string }[] {
  const notes: { tone: 'warn' | 'info'; text: string }[] = [];
  const fitSites = c.sites.filter(s => s.fit !== 'LOW');
  const fitT = fitSites.reduce((a, s) => a + s.verifiedLatestTco2, 0);
  // "Mostly" = more than half of the emissions at fit sites.
  const mostly = (pred: (s: Ets1Site) => boolean) => fitSites.filter(pred).reduce((a, s) => a + s.verifiedLatestTco2, 0) * 2 > fitT && fitT > 0;
  if (mostly(s => s.sector === 'POWER_HEAT')) {
    notes.push({ tone: 'warn', text: 'Mostly power and heat plants. The EU registry does not record fuel, and coal- or lignite-fired units cannot take biomethane — confirm which units burn natural gas.' });
  }
  if (mostly(s => s.sector === 'REFINING_OIL_GAS')) {
    notes.push({ tone: 'warn', text: 'Mostly refining and oil & gas sites. These often burn their own fuel gas, and offshore platforms have no grid connection — only grid-fed onshore units qualify.' });
  }
  if (c.sites.some(s => s.sectorBasis === 'OPERATOR_CODE' || s.sectorBasis === 'SITE_NAME')) {
    notes.push({ tone: 'info', text: 'Some sites have no industry code in the registry; their sector was taken from the operator\'s other sites or the site name.' });
  }
  if (c.sites.some(s => s.sector === 'UNCLASSIFIED')) {
    notes.push({ tone: 'info', text: 'Some sites could not be classified (no industry code, no clue in the name).' });
  }
  if (c.fit === 'LOW') {
    notes.push({ tone: 'info', text: 'Low fit: emissions are mostly process CO₂ or non-gas fuels. Biomethane only replaces the natural gas share — ask for the site fuel mix first.' });
  }
  return notes;
}

export function Ets1SitesTab() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const deskEua = selectMarkPrice(state.marks.marks['EU_ETS1'], 'mid');
  const [euaText, setEuaText] = useState(deskEua !== null ? String(deskEua) : '');
  const eua = parseNumber(euaText);

  const [view, setView] = useState<View>('COMPANIES');
  const [fit, setFit] = useState<FitFilter>('HIGH');
  const [country, setCountry] = useState('ALL');
  const [sector, setSector] = useState<'ALL' | Ets1Sector>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'tco2', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, OutreachStatus>>(() => readStatuses(STATUS_KEY));

  // Allowances avoided per MWh from the pricing authority, at the scenario EUA (NCV basis), and per
  // MWh as invoiced (GCV) — the basis Clients and the value stack quote.
  // The desk marks with this tab's scenario EUA, so the table and the value stack price alike.
  const scenarioMarks: MarksState = useMemo(() => {
    if (eua === null) return state.marks;
    const mark = { marketId: 'EU_ETS1', bid: eua, offer: eua, mid: eua, updatedAt: null, source: 'ETS1 tab scenario' };
    return { ...state.marks, marks: { ...state.marks.marks, EU_ETS1: mark } };
  }, [eua, state.marks]);
  const avoidedNcv = useMemo(() => (eua === null ? null : ets1AvoidedValuePerMWh(scenarioMarks)), [eua, scenarioMarks]);
  const year = new Date().getFullYear();
  const lookup = useMemo(() => companyLookup(), []);
  const stackCache = useMemo(() => new Map<string, ReturnType<typeof stackedPlay>>(), [scenarioMarks]);
  const stackFor = (p: CompanyProfile | undefined) => {
    if (!p) return null;
    if (!stackCache.has(p.id)) stackCache.set(p.id, stackedPlay(p, scenarioMarks, year, lookup.ets2Countries));
    return stackCache.get(p.id) ?? null;
  };
  const avoidedInvoice = avoidedNcv === null ? null : avoidedNcv * HHV_TO_LHV_FACTOR;

  const firstDeal = (fitT: number) => {
    const ncvMWh = biomethaneMWhToAbate(fitT * ets1FirstDealShare());
    return { invoiceMWh: ncvMWh / HHV_TO_LHV_FACTOR, saving: avoidedNcv === null ? null : ncvMWh * avoidedNcv };
  };

  const countries = useMemo(() => [...new Set(ETS1_SITES.map(s => s.country))].sort(), []);
  const allCompanies = useMemo(() => new Map(groupSitesByCompany(ETS1_SITES).map(c => [c.key, c])), []);

  const q = search.trim().toLowerCase();
  const matchesText = (s: Ets1Site) =>
    !q || s.name.toLowerCase().includes(q) || s.operator.toLowerCase().includes(q) || (s.parentCompany ?? '').toLowerCase().includes(q) || s.city.toLowerCase().includes(q);

  // Everything except the sector filter — the sector breakdown is drawn from this.
  const baseSites = useMemo(
    () => ETS1_SITES.filter(s => FIT_FILTER_OK[fit](s.fit) && (country === 'ALL' || s.country === country) && matchesText(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fit, country, q]
  );
  const sites = useMemo(() => baseSites.filter(s => sector === 'ALL' || s.sector === sector), [baseSites, sector]);
  const companies = useMemo(() => groupSitesByCompany(sites), [sites]);

  useEffect(() => setPage(1), [view, fit, country, sector, q, sort]);

  const totalT = sites.reduce((a, s) => a + s.verifiedLatestTco2, 0);
  const prevT = sites.reduce((a, s) => a + (s.verifiedPreviousTco2 ?? s.verifiedLatestTco2), 0);
  const changePct = prevT > 0 ? ((totalT - prevT) / prevT) * PERCENT : null;

  const sortedCompanies = useMemo(() => {
    const dir = sort.dir === 'desc' ? -1 : 1;
    const val = (c: Ets1Company): number | string =>
      sort.key === 'name' ? c.name.toLowerCase() : sort.key === 'deal' ? c.fitVerifiedLatestTco2 : c.verifiedLatestTco2;
    return [...companies].sort((a, b) => (val(a) < val(b) ? -dir : val(a) > val(b) ? dir : 0));
  }, [companies, sort]);

  const sortedSites = useMemo(() => {
    const dir = sort.dir === 'desc' ? -1 : 1;
    const change = (s: Ets1Site) => (s.verifiedPreviousTco2 ? (s.verifiedLatestTco2 - s.verifiedPreviousTco2) / s.verifiedPreviousTco2 : 0);
    const val = (s: Ets1Site): number | string =>
      sort.key === 'name' ? s.name.toLowerCase() : sort.key === 'change' ? change(s) : s.verifiedLatestTco2;
    return [...sites].sort((a, b) => (val(a) < val(b) ? -dir : val(a) > val(b) ? dir : 0));
  }, [sites, sort]);

  const rowCount = view === 'COMPANIES' ? sortedCompanies.length : sortedSites.length;
  const scaleMax = view === 'COMPANIES' ? Math.max(0, ...companies.map(c => c.verifiedLatestTco2)) : Math.max(0, ...sites.map(s => s.verifiedLatestTco2));

  const onSort = (key: SortKey) => setSort(prev => ({ key, dir: prev.key === key ? (prev.dir === 'desc' ? 'asc' : 'desc') : key === 'name' ? 'asc' : 'desc' }));

  const setStatus = (key: string, s: OutreachStatus) => {
    const next = { ...statuses, [key]: s };
    setStatuses(next);
    writeStatuses(STATUS_KEY, next);
  };

  const sectorRows = useMemo(() => {
    const m = new Map<Ets1Sector, number>();
    for (const s of baseSites) m.set(s.sector, (m.get(s.sector) ?? 0) + s.verifiedLatestTco2);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [baseSites]);
  const sectorMax = sectorRows[0]?.[1] ?? 0;

  const selected = selectedKey ? allCompanies.get(selectedKey) ?? null : null;

  const exportCsv = () => {
    const lines: string[] = [];
    if (view === 'COMPANIES') {
      lines.push(['Company', 'Operators', 'Countries', 'Sectors', 'Biomethane fit', 'Sites', `Verified ${ETS1_LATEST_YEAR} tCO2`, 'Fit-site tCO2', `Gross allowance bill € (before free allocation) at €${eua ?? ''}/t`, 'First deal MWh (invoiced)', 'First deal saving €', 'Status'].map(csvCell).join(','));
      for (const c of sortedCompanies) {
        const d = firstDeal(ets1AbatableTco2(c));
        lines.push([
          c.name, c.operators.join('; '), c.countries.join(' '), c.sectors.map(s => SECTOR_LABEL[s]).join('; '), c.fit, c.sites.length,
          Math.round(c.verifiedLatestTco2), Math.round(c.fitVerifiedLatestTco2), eua === null ? null : Math.round(c.verifiedLatestTco2 * eua),
          Math.round(d.invoiceMWh), d.saving === null ? null : Math.round(d.saving), STATUS_LABEL[statuses[c.key] ?? 'NOT_CONTACTED'],
        ].map(csvCell).join(','));
      }
    } else {
      lines.push(['Site', 'Operator', 'Parent', 'City', 'Country', 'Sector', 'Sector basis', 'Fit', 'NACE', `Verified ${ETS1_LATEST_YEAR} tCO2`, `Verified ${ETS1_PREVIOUS_YEAR} tCO2`, 'EUTL id'].map(csvCell).join(','));
      for (const s of sortedSites) {
        lines.push([s.name, s.operator, s.parentCompany, s.city, s.country, SECTOR_LABEL[s.sector], s.sectorBasis, s.fit, s.nace, s.verifiedLatestTco2, s.verifiedPreviousTco2, s.id].map(csvCell).join(','));
      }
    }
    downloadCsv(view === 'COMPANIES' ? 'ets1-companies.csv' : 'ets1-sites.csv', lines);
    showToast(`Exported ${rowCount.toLocaleString('en-GB')} rows`);
  };

  const openClient = (c: Ets1Company) => {
    const id = lookup.byEts1Key.get(c.key)?.id ?? normalizeCompanyName(c.name);
    navigate(`/clients?company=${encodeURIComponent(id)}`);
  };

  const pageRows = (view === 'COMPANIES' ? sortedCompanies : sortedSites).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <KpiRow columns={4}>
        <KpiTile label="Companies" value={companies.length.toLocaleString('en-GB')} sub={`${sites.length.toLocaleString('en-GB')} installations in view`} />
        <KpiTile
          label={`Verified emissions ${ETS1_LATEST_YEAR}`}
          value={(totalT / TONNES_PER_MT).toLocaleString('en-GB', { maximumFractionDigits: 1 })}
          unit="MtCO₂"
          sub={changePct === null ? undefined : `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% vs ${ETS1_PREVIOUS_YEAR}`}
        />
        <KpiTile
          label="Gross allowance bill"
          value={eua === null ? '—' : eurM(totalT * eua)}
          unit="/yr"
          sub={
            <label className="ets-inline-price" title="Scenario EUA price for this tab (desk mark by default)">
              at €<input inputMode="decimal" aria-label="EUA price" value={euaText} onChange={e => setEuaText(e.target.value)} />/t EUA · before free allocation
              {deskEua !== null && parseNumber(euaText) !== deskEua && (
                <button type="button" onClick={() => setEuaText(String(deskEua))}>reset</button>
              )}
            </label>
          }
        />
        <KpiTile
          label="Biomethane saves"
          value={avoidedInvoice === null ? '—' : eur(avoidedInvoice, 2)}
          unit="/MWh"
          sub={avoidedNcv === null ? 'Set an EUA price' : `as invoiced · ${eur(avoidedNcv, 2)} per MWh NCV · ${ETS_NATURAL_GAS_TCO2_PER_MWH.toFixed(3)} t/MWh`}
        />
      </KpiRow>

      <div className="ets-body ets-grid">
        <div style={{ minWidth: 0 }}>
          {isMobile ? (
            <>
          <MobileFilterBar
            above={
              <Segmented<View> label="View" value={view} onChange={v => { setView(v); setSort({ key: 'tco2', dir: 'desc' }); }} options={[{ id: 'COMPANIES', label: 'Companies' }, { id: 'SITES', label: 'Sites' }]} />
            }
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Company, site or city"
            searchLabel="Search sites"
            activeCount={(fit !== 'HIGH' ? 1 : 0) + (country !== 'ALL' ? 1 : 0) + (sector !== 'ALL' ? 1 : 0)}
            sortValue={`${sort.key}:${sort.dir}`}
            sortOptions={view === 'COMPANIES' ? COMPANY_SORT_OPTIONS : SITE_SORT_OPTIONS}
            onSort={v => { const [key, dir] = v.split(':'); setSort({ key: key as SortKey, dir: dir as SortDir }); }}
            onReset={() => { setFit('HIGH'); setCountry('ALL'); setSector('ALL'); }}
          >
            <SheetField label="Biomethane fit">
              <Segmented<FitFilter>
                label="Biomethane fit"
                value={fit}
                onChange={setFit}
                options={[{ id: 'HIGH', label: 'High fit' }, { id: 'HIGH_MEDIUM', label: 'High + medium' }, { id: 'ALL', label: 'All' }]}
              />
            </SheetField>
            <SheetField label="Country">
              <select aria-label="Country" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="ALL">All countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </SheetField>
            <SheetField label="Sector">
              <select aria-label="Sector" value={sector} onChange={e => setSector(e.target.value as typeof sector)}>
                <option value="ALL">All sectors</option>
                {(Object.keys(SECTOR_LABEL) as Ets1Sector[]).map(s => <option key={s} value={s}>{SECTOR_LABEL[s]}</option>)}
              </select>
            </SheetField>
            <button type="button" className="ets-btn ets-btn-tall" onClick={exportCsv}>Export</button>
          </MobileFilterBar>

          {view === 'COMPANIES' ? (
            <MobileCardList
              testId="ets1-company-cards"
              items={pageRows as Ets1Company[]}
              getKey={c => c.key}
              selectedKey={selectedKey}
              onSelect={c => setSelectedKey(c.key)}
              title={c => c.name}
              subtitle={c => {
                const also = (lookup.byEts1Key.get(c.key)?.markets ?? []).filter(m => m !== 'ETS1');
                return <>{companyMeta(c)}{also.length > 0 && <> · also {also.map(m => MARKET_LABEL[m]).join(', ')}</>}</>;
              }}
              metric={c => (eua === null ? '—' : eurM(c.verifiedLatestTco2 * eua))}
              metricLabel={() => 'Gross bill'}
              badges={c => {
                const stacked = stackFor(lookup.byEts1Key.get(c.key));
                return (
                  <>
                    <FitBadge fit={c.fit} />
                    {stacked && <StackBadge spec={stacked.spec} />}
                    <StatusDot status={statuses[c.key] ?? 'NOT_CONTACTED'} />
                  </>
                );
              }}
              fields={c => {
                const d = firstDeal(ets1AbatableTco2(c));
                return [
                  { label: `Verified ${ETS1_LATEST_YEAR}`, value: tonnes(c.verifiedLatestTco2), mono: true },
                  {
                    label: 'First deal saving',
                    value: c.fitVerifiedLatestTco2 > 0 ? `${eurM(d.saving)} · ${(d.invoiceMWh / MWH_PER_GWH).toLocaleString('en-GB', { maximumFractionDigits: 0 })} GWh` : '—',
                    mono: true,
                  },
                ];
              }}
              empty="No installations match. Widen the fit filter or clear the search."
            />
          ) : (
            <MobileCardList
              testId="ets1-site-cards"
              items={pageRows as Ets1Site[]}
              getKey={s => s.id}
              selectedKey={selectedKey}
              onSelect={s => setSelectedKey((s.parentCompany ?? s.operator).trim().toLowerCase())}
              title={s => s.name}
              subtitle={s => [s.parentCompany ?? s.operator, [s.city, s.country].filter(Boolean).join(', ')].join(' · ')}
              metric={s => (eua === null ? '—' : eurM(s.verifiedLatestTco2 * eua))}
              metricLabel={() => 'Gross bill'}
              badges={s => (
                <>
                  <FitBadge fit={s.fit} />
                  <span className="ets-tag">{SECTOR_LABEL[s.sector]}</span>
                </>
              )}
              fields={s => {
                const change = s.verifiedPreviousTco2 ? ((s.verifiedLatestTco2 - s.verifiedPreviousTco2) / s.verifiedPreviousTco2) * PERCENT : null;
                return [
                  { label: `Verified ${ETS1_LATEST_YEAR}`, value: tonnes(s.verifiedLatestTco2), mono: true },
                  {
                    label: `vs ${ETS1_PREVIOUS_YEAR}`,
                    value: change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(0)}%`,
                    mono: true,
                    tone: change === null ? 'muted' : change > 0 ? 'neg' : 'pos',
                  },
                ];
              }}
              empty="No installations match. Widen the fit filter or clear the search."
            />
          )}
          {rowCount > 0 && (
            <DataTable>
              <TablePagination totalCount={rowCount} currentPage={page} pageSize={PAGE_SIZE} onPageChange={setPage} entityLabel={view === 'COMPANIES' ? 'companies' : 'installations'} />
            </DataTable>
          )}
            </>
          ) : (
            <>
          <div className="ds-toolbar">
            <label className="ds-search" style={{ width: 220 }}>
              <Search size={14} aria-hidden="true" />
              <input placeholder="Company, site or city" aria-label="Search sites" value={search} onChange={e => setSearch(e.target.value)} />
            </label>
            <Segmented<View> label="View" value={view} onChange={v => { setView(v); setSort({ key: 'tco2', dir: 'desc' }); }} options={[{ id: 'COMPANIES', label: 'Companies' }, { id: 'SITES', label: 'Sites' }]} />
            <Segmented<FitFilter>
              label="Biomethane fit"
              value={fit}
              onChange={setFit}
              options={[{ id: 'HIGH', label: 'High fit' }, { id: 'HIGH_MEDIUM', label: 'High + medium' }, { id: 'ALL', label: 'All' }]}
            />
            <select className={`ets-select ${country !== 'ALL' ? 'set' : ''}`} aria-label="Country" value={country} onChange={e => setCountry(e.target.value)}>
              <option value="ALL">All countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className={`ets-select ${sector !== 'ALL' ? 'set' : ''}`} aria-label="Sector" value={sector} onChange={e => setSector(e.target.value as typeof sector)}>
              <option value="ALL">All sectors</option>
              {(Object.keys(SECTOR_LABEL) as Ets1Sector[]).map(s => <option key={s} value={s}>{SECTOR_LABEL[s]}</option>)}
            </select>
            <span className="ets-spacer" />
            <button type="button" className="ets-btn" onClick={exportCsv}>Export</button>
          </div>

          <DataTable>
            {view === 'COMPANIES' ? (
              <div className="ds-thead-row ets-cols-companies">
                <SortHeader<SortKey> id="name" label="Company" sort={sort} onSort={onSort} />
                <span>Fit</span>
                <SortHeader<SortKey> id="tco2" label={`Verified ${ETS1_LATEST_YEAR}`} sort={sort} onSort={onSort} right title="Verified emissions, all fuels and processes" />
                <span className="ets-right" title={eua === null ? undefined : `At €${eua}/t`}>Gross bill</span>
                <SortHeader<SortKey> id="deal" label="First deal saving" sort={sort} onSort={onSort} right title="Biomethane to cut 10% of emissions at high/medium-fit sites, and the allowances it saves" />
                <span>Status</span>
              </div>
            ) : (
              <div className="ds-thead-row ets-cols-sites">
                <SortHeader<SortKey> id="name" label="Installation" sort={sort} onSort={onSort} />
                <span>Sector</span>
                <span>Fit</span>
                <SortHeader<SortKey> id="tco2" label={`Verified ${ETS1_LATEST_YEAR}`} sort={sort} onSort={onSort} right />
                <SortHeader<SortKey> id="change" label={`vs ${ETS1_PREVIOUS_YEAR}`} sort={sort} onSort={onSort} right />
                <span className="ets-right">Gross bill</span>
              </div>
            )}

            {rowCount === 0 && (
              <div className="ets-empty" style={{ margin: 16 }}>
                <strong>No installations match</strong>
                Widen the fit filter or clear the search.
              </div>
            )}

            {view === 'COMPANIES'
              ? (pageRows as Ets1Company[]).map(c => {
                  const d = firstDeal(ets1AbatableTco2(c));
                  const prof = lookup.byEts1Key.get(c.key);
                  const also = (prof?.markets ?? []).filter(m => m !== 'ETS1');
                  const stacked = stackFor(prof);
                  return (
                    <button key={c.key} type="button" className={`ds-row ets-cols-companies ${selectedKey === c.key ? 'selected' : ''}`} onClick={() => setSelectedKey(c.key)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="ds-row-name">
                          {c.name}
                          {stacked && <> <StackBadge spec={stacked.spec} /></>}
                        </div>
                        <div className="ds-row-meta">
                          {companyMeta(c)}
                          {also.length > 0 && <span title={`Also exposed to ${also.map(m => MARKET_LABEL[m]).join(', ')}`}> · also {also.map(m => MARKET_LABEL[m]).join(', ')}</span>}
                        </div>
                      </div>
                      <FitBadge fit={c.fit} />
                      <BarCell value={c.verifiedLatestTco2} max={scaleMax}>{tonnes(c.verifiedLatestTco2)}</BarCell>
                      <span className="ets-cell-num">{eua === null ? '—' : eurM(c.verifiedLatestTco2 * eua)}</span>
                      <span className="ets-cell-num">
                        {c.fitVerifiedLatestTco2 > 0 ? eurM(d.saving) : '—'}
                        {c.fitVerifiedLatestTco2 > 0 && <span className="ets-cell-sub">{(d.invoiceMWh / MWH_PER_GWH).toLocaleString('en-GB', { maximumFractionDigits: 0 })} GWh</span>}
                      </span>
                      <StatusDot status={statuses[c.key] ?? 'NOT_CONTACTED'} />
                    </button>
                  );
                })
              : (pageRows as Ets1Site[]).map(s => {
                  const key = (s.parentCompany ?? s.operator).trim().toLowerCase();
                  const change = s.verifiedPreviousTco2 ? ((s.verifiedLatestTco2 - s.verifiedPreviousTco2) / s.verifiedPreviousTco2) * PERCENT : null;
                  return (
                    <button key={s.id} type="button" className={`ds-row ets-cols-sites ${selectedKey === key ? 'selected' : ''}`} onClick={() => setSelectedKey(key)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="ds-row-name">{s.name}</div>
                        <div className="ds-row-meta">{[s.parentCompany ?? s.operator, [s.city, s.country].filter(Boolean).join(', ')].join(' · ')}</div>
                      </div>
                      <span className="ets-tag" title={s.sectorBasis === 'SITE_CODE' ? `NACE ${s.nace || '—'}` : s.sectorBasis === 'OPERATOR_CODE' ? 'From the operator\'s other sites' : s.sectorBasis === 'SITE_NAME' ? 'From the site name' : 'No industry code'}>
                        {SECTOR_LABEL[s.sector]}
                      </span>
                      <FitBadge fit={s.fit} />
                      <BarCell value={s.verifiedLatestTco2} max={scaleMax}>{tonnes(s.verifiedLatestTco2)}</BarCell>
                      <span className={`ets-cell-num ets-change ${change === null ? '' : change > 0 ? 'up' : 'down'}`}>
                        {change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(0)}%`}
                      </span>
                      <span className="ets-cell-num">{eua === null ? '—' : eurM(s.verifiedLatestTco2 * eua)}</span>
                    </button>
                  );
                })}

            {rowCount > 0 && (
              <TablePagination totalCount={rowCount} currentPage={page} pageSize={PAGE_SIZE} onPageChange={setPage} entityLabel={view === 'COMPANIES' ? 'companies' : 'installations'} />
            )}
          </DataTable>
            </>
          )}
        </div>

        {selected ? (
          <CompanyPanel
            company={selected}
            profile={lookup.byEts1Key.get(selected.key)}
            marks={scenarioMarks}
            year={year}
            stacked={stackFor(lookup.byEts1Key.get(selected.key))}
            eua={eua}
            deal={firstDeal(ets1AbatableTco2(selected))}
            status={statuses[selected.key] ?? 'NOT_CONTACTED'}
            onStatus={s => setStatus(selected.key, s)}
            onClose={() => setSelectedKey(null)}
            onClient={() => openClient(selected)}
          />
        ) : (
          <SidePanel>
            <PanelSection>
              <div className="ds-panel-section-heading">Where the emissions are</div>
              <div className="ds-panel-meta">Verified {ETS1_LATEST_YEAR} emissions by sector, for the filters above. Click a sector to filter.</div>
              <div className="ets-sectors">
                {sectorRows.map(([s, t]) => (
                  <button key={s} type="button" className={`ets-sector ${sector === s ? 'active' : ''}`} onClick={() => setSector(sector === s ? 'ALL' : s)} aria-pressed={sector === s}>
                    <span className="label"><span>{SECTOR_LABEL[s]}</span><FitBadge fit={SECTOR_FIT[s]} /></span>
                    <span className="value">{tonnes(t)}</span>
                    <span className="track" aria-hidden="true"><span className={SECTOR_FIT[s].toLowerCase()} style={{ width: `${sectorMax > 0 ? Math.max(2, (t / sectorMax) * 100) : 0}%` }} /></span>
                  </button>
                ))}
              </div>
            </PanelSection>
            <PanelSection>
              <div className="ds-panel-section-heading">How to read this</div>
              <div className="ets-note info">
                Installations buy allowances for their own emissions. RED III biomethane, evidenced through the Union Database, counts as zero emissions, so each MWh replacing natural gas avoids {ETS_NATURAL_GAS_TCO2_PER_MWH.toFixed(3)} t of allowances (MRR Annex VI).
              </div>
              <div className="ds-panel-meta">
                Verified emissions cover all fuels and process CO₂ — the registry does not say how much gas a site burns. The fit grade is a sector rule of thumb: high for food, pharma, paper, glass and light industry; medium for chemicals, power & heat and refining; low for cement, lime and metals.
                {' '}Source: <a href={ETS1_SOURCE_URL} target="_blank" rel="noreferrer">EUTL via EUETS.INFO</a>.
              </div>
            </PanelSection>
          </SidePanel>
        )}
      </div>
    </>
  );
}

function CompanyPanel(props: {
  company: Ets1Company;
  profile: CompanyProfile | undefined;
  marks: MarksState;
  year: number;
  stacked: ReturnType<typeof stackedPlay>;
  eua: number | null;
  deal: { invoiceMWh: number; saving: number | null };
  status: OutreachStatus;
  onStatus: (s: OutreachStatus) => void;
  onClose: () => void;
  onClient: () => void;
}) {
  const { company: c, eua, deal } = props;
  const isMobile = useIsMobile();
  const sites = [...c.sites].sort((a, b) => b.verifiedLatestTco2 - a.verifiedLatestTco2);
  const notes = fitNotes(c);
  const spec = useMemo(() => ets1StackSpec(ets1AbatableTco2(c), props.marks, props.year, ets1FirstDealShare()), [c, props.marks, props.year]);
  const also = (props.profile?.markets ?? []).filter(m => m !== 'ETS1');
  const footer = <button type="button" className="ets-btn primary grow" onClick={props.onClient}>Open client profile</button>;
  const body = (
    <>
      <PanelSection>
        {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="ds-panel-title" style={{ lineHeight: 1.25 }}>{c.name}</div>
            <div className="ds-panel-meta" style={{ marginTop: 4 }}>{companyMeta(c)}</div>
          </div>
          <button type="button" className="ds-icon-btn ds-icon-btn-sm" aria-label="Close" onClick={props.onClose}>✕</button>
        </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <FitBadge fit={c.fit} />
          <StatusSelect value={props.status} onChange={props.onStatus} label={`Outreach status for ${c.name}`} />
        </div>
        <div className="ets-stats">
          <div>
            <div className="ds-panel-stat-label">Verified {ETS1_LATEST_YEAR}</div>
            <div className="ds-panel-stat-value">{tonnes(c.verifiedLatestTco2)}</div>
          </div>
          <div>
            <div className="ds-panel-stat-label">Gross allowance bill</div>
            <div className="ds-panel-stat-value">{eua === null ? '—' : eurM(c.verifiedLatestTco2 * eua)}<span className="unit"> /yr</span></div>
          </div>
          <div>
            <div className="ds-panel-stat-label">First deal saves</div>
            <div className="ds-panel-stat-value" style={{ color: 'var(--color-status-pos-text)' }}>{c.fitVerifiedLatestTco2 > 0 ? eurM(deal.saving) : '—'}<span className="unit"> /yr</span></div>
          </div>
        </div>
        {c.fitVerifiedLatestTco2 > 0 && (
          <div className="ds-panel-meta">
            First deal: {Math.round(deal.invoiceMWh).toLocaleString('en-GB')} MWh/yr of biomethane (as invoiced), cutting 10% of the {tonnes(ets1AbatableTco2(c))} of gas-burning CO₂ (sector gas share of its high/medium-fit sites, Eurostat).
          </div>
        )}
        {notes.map(n => <div key={n.text} className={`ets-note ${n.tone === 'info' ? 'info' : ''}`}>{n.text}</div>)}
        {also.length > 0 && (
          <div className="ds-panel-meta">
            Also exposed to <strong style={{ color: 'var(--color-text)' }}>{also.map(m => MARKET_LABEL[m]).join(', ')}</strong> — separate plays on different MWh; see the client profile.
          </div>
        )}
      </PanelSection>
      {spec && (
        <PanelSection>
          <ValueStackCard key={`${c.key}-ets1`} spec={spec} marks={props.marks} heading="Value stack · first ETS1 deal" volumeHint="10% of emissions at high/medium-fit sites, as invoiced (GCV)" />
        </PanelSection>
      )}
      {props.stacked && (
        <PanelSection>
          <ValueStackCard key={`${c.key}-stack`} spec={props.stacked.spec} marks={props.marks} heading={`Value stack · ${props.stacked.title}`} />
        </PanelSection>
      )}
      <PanelSection>
        <div className="ds-panel-section-heading">Installations <span className="ets-muted" style={{ fontWeight: 400 }}>· {sites.length}</span></div>
        <ul className="ets-list">
          {sites.slice(0, 12).map(s => (
            <li key={s.id}>
              <span className="name" title={s.name}>{s.name}</span>
              <span className="num">{tonnes(s.verifiedLatestTco2)}</span>
              <span className="meta">
                {[s.city, s.country].filter(Boolean).join(', ')} · {SECTOR_LABEL[s.sector]} · <FitBadgeInline fit={s.fit} />
                {s.fit !== 'LOW' && (
                  <> · <Link to={buildEts1SiteTradeBuilderUrl(s)} data-testid="ets1-site-trade-builder-link">Build in Trade Builder</Link></>
                )}
              </span>
            </li>
          ))}
        </ul>
        {sites.length > 12 && <div className="ds-panel-meta">…and {sites.length - 12} more in the Sites view or the CSV export.</div>}
        {c.operators.length > 1 && <div className="ds-panel-meta">Operators: {c.operators.join('; ')}</div>}
      </PanelSection>
    </>
  );
  return isMobile ? (
    <Sheet open onClose={props.onClose} title={c.name} subtitle={companyMeta(c)} variant="full" footer={<div className="ets-sheet-foot">{footer}</div>} testId="ets1-company-sheet">
      <div className="ets-sheet-body">{body}</div>
    </Sheet>
  ) : (
    <SidePanel footer={footer}>{body}</SidePanel>
  );
}

function FitBadgeInline({ fit }: { fit: BiomethaneFit }) {
  return <span style={{ color: fit === 'HIGH' ? 'var(--color-status-pos-text)' : fit === 'MEDIUM' ? 'var(--color-status-warn-text)' : undefined }}>{fit.toLowerCase()} fit</span>;
}
