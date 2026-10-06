import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { KpiRow, KpiTile, DataTable, TablePagination, SidePanel, PanelSection, MobileCardList, Sheet } from '../../shared/ui';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { MobileFilterBar, SheetField } from './MobileFilterBar';
import { Ets2CountryProfile } from '../../domain/ets2/countries';
import { Ets2Company, Ets2CompanyExposure, ETS2_REGULATED_ENTITY_LISTS, computeCompanyExposure } from '../../domain/ets2/companies';
import { normalizeCompanyName } from '../../domain/companies/normalize';
import { MARKET_LABEL } from '../../domain/companies/directory';
import { ets2SupplierStackSpec } from '../../domain/companies/opportunities';
import { buildEts2CorporateOrderUrl } from './handoff';
import { ETS2_START_YEAR } from '../../domain/valueStack/engine';
import { MarksState } from '../../domain/netback/types';
import { useAppState } from '../../store/context';
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
  BarCell,
  Segmented,
  SortHeader,
  SortDir,
  eurM,
  csvCell,
  downloadCsv,
} from './etsUi';

export type { OutreachStatus } from './etsUi';

const STATUS_STORAGE_KEY = 'biomethane_ets2_outreach_v1';
const PAGE_SIZE = 50;
const EUR_PER_EUR_M = 1_000_000;
const MWH_PER_TWH = 1_000_000;

type RoleFilter = 'ALL' | Ets2Company['role'];
type SortKey = 'name' | 'share' | 'gas' | 'cost';

/** Short link label: the source's host, e.g. "cre.fr". */
function sourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

const SORT_OPTIONS = [
  { value: 'cost:desc', label: 'ETS2 cost, high to low' },
  { value: 'share:desc', label: 'Market share, high to low' },
  { value: 'gas:desc', label: 'Gas volume, high to low' },
  { value: 'name:asc', label: 'Company A–Z' },
  { value: 'name:desc', label: 'Company Z–A' },
  { value: 'cost:asc', label: 'ETS2 cost, low to high' },
];

function roleText(c: Ets2Company): string {
  return c.role === 'REGULATED_SUPPLIER' ? 'Regulated gas supplier' : `Exposed end user${c.sector ? ` · ${c.sector}` : ''}`;
}

export function Ets2DirectoryTab(props: {
  companies: Ets2Company[];
  countries: Ets2CountryProfile[];
  ets2PriceEurPerT: number | null;
  onOpenInCalculator: (annualGasMWh: number) => void;
  importPanel: React.ReactNode;
}) {
  const { companies, countries, ets2PriceEurPerT } = props;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { state } = useAppState();
  // Desk marks with the calculator's ETS2 scenario price, so the table and the value stack agree.
  const scenarioMarks: MarksState = useMemo(() => {
    if (ets2PriceEurPerT === null) return state.marks;
    const mark = { marketId: 'EU_ETS2', bid: ets2PriceEurPerT, offer: ets2PriceEurPerT, mid: ets2PriceEurPerT, updatedAt: null, source: 'ETS2 scenario' };
    return { ...state.marks, marks: { ...state.marks.marks, EU_ETS2: mark } };
  }, [ets2PriceEurPerT, state.marks]);
  const lookup = useMemo(() => companyLookup(), []);
  const year = new Date().getFullYear();
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'cost', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, OutreachStatus>>(() => readStatuses(STATUS_STORAGE_KEY));

  const countryName = useMemo(
    () => new Map<string, string>([['GB', 'United Kingdom (HQ)'], ...countries.map(c => [c.iso, c.name] as [string, string])]),
    [countries]
  );
  const exposures = useMemo(() => computeCompanyExposure(companies, countries, ets2PriceEurPerT), [companies, countries, ets2PriceEurPerT]);

  const q = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const dir = sort.dir === 'desc' ? -1 : 1;
    const val = (e: Ets2CompanyExposure): number | string | null => {
      switch (sort.key) {
        case 'name': return e.company.name.toLowerCase();
        case 'share': return e.company.marketSharePct;
        case 'gas': return e.volumeTWh;
        default: return e.ets2CostEurM;
      }
    };
    return exposures
      .filter(e => countryFilter === 'ALL' || e.company.countryIso === countryFilter)
      .filter(e => roleFilter === 'ALL' || e.company.role === roleFilter)
      .filter(e => !q || e.company.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const va = val(a);
        const vb = val(b);
        // Blanks sink whichever way the column is sorted; ties fall back to market share, then name.
        if (va === null || vb === null) {
          if (va !== vb) return va === null ? 1 : -1;
        } else if (va !== vb) return va < vb ? -dir : dir;
        const sa = a.company.marketSharePct ?? -1;
        const sb = b.company.marketSharePct ?? -1;
        return sa !== sb ? sb - sa : a.company.name.localeCompare(b.company.name);
      });
  }, [exposures, countryFilter, roleFilter, q, sort]);

  useEffect(() => setPage(1), [countryFilter, roleFilter, q, sort]);

  const countriesInList = useMemo(
    () => [...new Set(companies.map(c => c.countryIso))].sort((a, b) => (countryName.get(a) ?? a).localeCompare(countryName.get(b) ?? b)),
    [companies, countryName]
  );

  const suppliers = companies.filter(c => c.role === 'REGULATED_SUPPLIER').length;
  const quantified = exposures.filter(e => e.ets2CostEurM !== null);
  const quantifiedEur = quantified.reduce((a, e) => a + (e.ets2CostEurM as number), 0) * EUR_PER_EUR_M;
  const outreach = Object.values(statuses);
  const active = outreach.filter(s => s === 'CONTACTED' || s === 'MEETING' || s === 'PIPELINE').length;
  const maxShare = Math.max(0, ...rows.map(r => r.company.marketSharePct ?? 0));

  const setStatus = (id: string, status: OutreachStatus) => {
    const next = { ...statuses, [id]: status };
    setStatuses(next);
    writeStatuses(STATUS_STORAGE_KEY, next);
  };

  const onSort = (key: SortKey) => setSort(prev => ({ key, dir: prev.key === key ? (prev.dir === 'desc' ? 'asc' : 'desc') : key === 'name' ? 'asc' : 'desc' }));

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
    downloadCsv('ets2-target-list.csv', [header.map(csvCell).join(','), ...lines]);
    showToast(`Exported ${rows.length} companies`);
  };

  const selected = selectedId ? exposures.find(e => e.company.id === selectedId) ?? null : null;
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <KpiRow columns={4}>
        <KpiTile label="Companies" value={companies.length} sub={`${suppliers} regulated suppliers · ${companies.length - suppliers} end users`} />
        <KpiTile label="Countries covered" value={countriesInList.filter(c => c !== 'GB').length} sub="Curated research with a source per entry" />
        <KpiTile
          label="Quantified ETS2 cost"
          value={quantified.length ? eurM(quantifiedEur) : '—'}
          unit="/yr"
          sub={`${quantified.length} of ${companies.length} with a volume${ets2PriceEurPerT === null ? '' : ` · at €${ets2PriceEurPerT}/t from 2028`}`}
        />
        <KpiTile label="In outreach" value={active} sub={`${outreach.filter(s => s === 'MEETING').length} meetings · ${outreach.filter(s => s === 'PIPELINE').length} in pipeline`} />
      </KpiRow>

      <div className="ets-body ets-grid">
        <div style={{ minWidth: 0 }}>
          {isMobile ? (
            <>
          <MobileFilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search company"
            searchLabel="Search company"
            activeCount={(roleFilter !== 'ALL' ? 1 : 0) + (countryFilter !== 'ALL' ? 1 : 0)}
            sortValue={`${sort.key}:${sort.dir}`}
            sortOptions={SORT_OPTIONS}
            onSort={v => { const [key, dir] = v.split(':'); setSort({ key: key as SortKey, dir: dir as SortDir }); }}
            onReset={() => { setRoleFilter('ALL'); setCountryFilter('ALL'); }}
          >
            <SheetField label="Role">
              <Segmented<RoleFilter>
                label="Role"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[{ id: 'ALL', label: 'All' }, { id: 'REGULATED_SUPPLIER', label: 'Suppliers' }, { id: 'EXPOSED_END_USER', label: 'End users' }]}
              />
            </SheetField>
            <SheetField label="Country">
              <select aria-label="Country" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
                <option value="ALL">All countries</option>
                {countriesInList.map(iso => <option key={iso} value={iso}>{countryName.get(iso) ?? iso}</option>)}
              </select>
            </SheetField>
            <button type="button" className="ets-btn ets-btn-tall" onClick={exportCsv}>Export</button>
          </MobileFilterBar>
          <MobileCardList
            testId="ets2-supplier-cards"
            items={pageRows}
            getKey={r => r.company.id}
            selectedKey={selectedId}
            onSelect={r => setSelectedId(r.company.id)}
            title={r => r.company.name}
            subtitle={r => {
              const also = (lookup.byEts2Id.get(r.company.id)?.markets ?? []).filter(m => m !== 'ETS2');
              return <>{roleText(r.company)} · {r.company.confidence.toLowerCase()} confidence{also.length > 0 && <> · also {also.map(m => MARKET_LABEL[m]).join(', ')}</>}</>;
            }}
            metric={r => (r.ets2CostEurM === null ? '—' : eurM(r.ets2CostEurM * EUR_PER_EUR_M))}
            metricLabel={() => 'ETS2 cost'}
            badges={r => {
              const prof = lookup.byEts2Id.get(r.company.id);
              const stacked = prof ? stackedPlay(prof, scenarioMarks, year, countries) : null;
              return (
                <>
                  {stacked && <StackBadge spec={stacked.spec} />}
                  <StatusDot status={statuses[r.company.id] ?? 'NOT_CONTACTED'} />
                </>
              );
            }}
            fields={r => [
              { label: 'Country', value: countryName.get(r.company.countryIso) ?? r.company.countryIso },
              { label: 'Market share', value: r.company.marketSharePct === null ? '—' : `${r.company.marketSharePct}%`, mono: true, tone: r.company.marketSharePct === null ? 'muted' : undefined },
              {
                label: 'Gas, TWh',
                value: r.volumeTWh === null ? '—' : `${r.volumeMethod === 'SHARE_OF_NATIONAL' ? '≈' : ''}${r.volumeTWh.toFixed(1)}${r.volumeMethod === 'DISCLOSED' ? '*' : ''}`,
                mono: true,
                tone: r.volumeTWh === null ? 'muted' : undefined,
              },
            ]}
            empty="No companies match. Clear the search or filters."
          />
          {rows.length > 0 && (
            <DataTable>
              <TablePagination totalCount={rows.length} currentPage={page} pageSize={PAGE_SIZE} onPageChange={setPage} entityLabel="companies" />
            </DataTable>
          )}

            </>
          ) : (
            <>
          <div className="ds-toolbar">
            <label className="ds-search" style={{ width: 240 }}>
              <Search size={14} aria-hidden="true" />
              <input placeholder="Search company" aria-label="Search company" value={search} onChange={e => setSearch(e.target.value)} />
            </label>
            <Segmented<RoleFilter>
              label="Role"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[{ id: 'ALL', label: 'All' }, { id: 'REGULATED_SUPPLIER', label: 'Suppliers' }, { id: 'EXPOSED_END_USER', label: 'End users' }]}
            />
            <select className={`ets-select ${countryFilter !== 'ALL' ? 'set' : ''}`} aria-label="Country" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
              <option value="ALL">All countries</option>
              {countriesInList.map(iso => <option key={iso} value={iso}>{countryName.get(iso) ?? iso}</option>)}
            </select>
            <span className="ets-spacer" />
            <button type="button" className="ets-btn" onClick={exportCsv}>Export</button>
          </div>

          <DataTable>
            <div className="ds-thead-row ets-cols-suppliers">
              <SortHeader<SortKey> id="name" label="Company" sort={sort} onSort={onSort} />
              <span>Country</span>
              <SortHeader<SortKey> id="share" label="Market share" sort={sort} onSort={onSort} />
              <SortHeader<SortKey> id="gas" label="Gas, TWh" sort={sort} onSort={onSort} right title="≈ share × national building gas · * disclosed portfolio (upper bound)" />
              <SortHeader<SortKey> id="cost" label="ETS2 cost" sort={sort} onSort={onSort} right title={ets2PriceEurPerT === null ? 'Set an ETS2 price' : `Annual allowance cost from 2028 at €${ets2PriceEurPerT}/t`} />
              <span>Status</span>
            </div>
            {rows.length === 0 && (
              <div className="ets-empty" style={{ margin: 16 }}>
                <strong>No companies match</strong>
                Clear the search or filters.
              </div>
            )}
            {pageRows.map(r => {
              const c = r.company;
              const prof = lookup.byEts2Id.get(c.id);
              const also = (prof?.markets ?? []).filter(m => m !== 'ETS2');
              const stacked = prof ? stackedPlay(prof, scenarioMarks, year, countries) : null;
              return (
                <button key={c.id} type="button" className={`ds-row ets-cols-suppliers ${selectedId === c.id ? 'selected' : ''}`} onClick={() => setSelectedId(c.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ds-row-name">{c.name}{stacked && <> <StackBadge spec={stacked.spec} /></>}</div>
                    <div className="ds-row-meta">
                      {roleText(c)} · {c.confidence.toLowerCase()} confidence
                      {also.length > 0 && <span> · also {also.map(m => MARKET_LABEL[m]).join(', ')}</span>}
                    </div>
                  </div>
                  <span className="ds-row-meta" style={{ color: 'var(--color-text)' }}>{countryName.get(c.countryIso) ?? c.countryIso}</span>
                  {c.marketSharePct === null ? <span className="ets-muted">—</span> : (
                    <BarCell value={c.marketSharePct} max={maxShare}>{c.marketSharePct}%</BarCell>
                  )}
                  <span className="ets-cell-num" title={r.volumeMethod === 'SHARE_OF_NATIONAL' ? 'Share × national building gas (approximation)' : r.volumeMethod === 'DISCLOSED' ? 'Disclosed portfolio volume across all segments — an upper bound for ETS2' : undefined}>
                    {r.volumeTWh === null ? '—' : `${r.volumeMethod === 'SHARE_OF_NATIONAL' ? '≈' : ''}${r.volumeTWh.toFixed(1)}${r.volumeMethod === 'DISCLOSED' ? '*' : ''}`}
                  </span>
                  <span className="ets-cell-num" style={{ fontWeight: r.ets2CostEurM === null ? undefined : 500 }}>
                    {r.ets2CostEurM === null ? <span className="ets-muted">—</span> : eurM(r.ets2CostEurM * EUR_PER_EUR_M)}
                  </span>
                  <StatusDot status={statuses[c.id] ?? 'NOT_CONTACTED'} />
                </button>
              );
            })}
            {rows.length > 0 && <TablePagination totalCount={rows.length} currentPage={page} pageSize={PAGE_SIZE} onPageChange={setPage} entityLabel="companies" />}
          </DataTable>

            </>
          )}

          <div className="ets-section-gap">
            <details className="ets-details">
              <summary>Official lists of regulated entities <span className="meta">Where to pull every supplier per country</span></summary>
              <div className="inner">
                <ul className="ets-list">
                  {Object.entries(ETS2_REGULATED_ENTITY_LISTS).map(([iso, l]) => (
                    <li key={iso}>
                      <span className="name">{iso === 'EU' ? 'EU' : countryName.get(iso) ?? iso}</span>
                      <a href={l.url} target="_blank" rel="noreferrer">Open</a>
                      <span className="meta">{l.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
            {props.importPanel}
          </div>
        </div>

        {selected ? (
          <SupplierPanel
            exposure={selected}
            countryLabel={countryName.get(selected.company.countryIso) ?? selected.company.countryIso}
            price={ets2PriceEurPerT}
            status={statuses[selected.company.id] ?? 'NOT_CONTACTED'}
            onStatus={s => setStatus(selected.company.id, s)}
            onClose={() => setSelectedId(null)}
            onCalculate={selected.volumeTWh === null ? null : () => props.onOpenInCalculator(Math.round((selected.volumeTWh as number) * MWH_PER_TWH))}
            onClient={() => navigate(`/clients?company=${encodeURIComponent(lookup.byEts2Id.get(selected.company.id)?.id ?? normalizeCompanyName(selected.company.name))}`)}
            marks={scenarioMarks}
            also={(lookup.byEts2Id.get(selected.company.id)?.markets ?? []).filter(m => m !== 'ETS2').map(m => MARKET_LABEL[m])}
          />
        ) : (
          <SidePanel>
            <PanelSection>
              <div className="ds-panel-section-heading">Why gas suppliers first</div>
              <div className="ets-note info">
                From 1 January 2028 the suppliers who release gas for buildings and small industry surrender ETS2 allowances for it and pass the cost to customers. Biomethane with RED III evidence has a zero emission factor, so every MWh they switch needs no allowance.
              </div>
              <div className="ds-panel-meta">
                Estimated cost uses the company's own volume where published, otherwise its market share of the country's building gas (ETS2 countries tab). Disclosed volumes (*) span all segments and can include ETS1 sites, so they are an upper bound.
              </div>
            </PanelSection>
            <PanelSection>
              <div className="ds-panel-section-heading">Largest exposure</div>
              <ul className="ets-list">
                {exposures.filter(e => e.ets2CostEurM !== null).sort((a, b) => (b.ets2CostEurM as number) - (a.ets2CostEurM as number)).slice(0, 6).map(e => (
                  <li key={e.company.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(e.company.id)}>
                    <span className="name">{e.company.name}</span>
                    <span className="num">{eurM((e.ets2CostEurM as number) * EUR_PER_EUR_M)}</span>
                    <span className="meta">{countryName.get(e.company.countryIso) ?? e.company.countryIso}</span>
                  </li>
                ))}
              </ul>
              <div className="ds-panel-meta">Select any company for its sources, contacts and a calculation.</div>
            </PanelSection>
          </SidePanel>
        )}
      </div>
    </>
  );
}

function SupplierPanel(props: {
  exposure: Ets2CompanyExposure;
  countryLabel: string;
  price: number | null;
  status: OutreachStatus;
  onStatus: (s: OutreachStatus) => void;
  onClose: () => void;
  onCalculate: (() => void) | null;
  onClient: () => void;
  marks: MarksState;
  also: string[];
}) {
  const { exposure: r } = props;
  const c = r.company;
  const isMobile = useIsMobile();
  const spec = useMemo(
    // No default volume: the supplier's whole book is not a deal size — the trader enters the tranche.
    () => (c.role === 'REGULATED_SUPPLIER' ? ets2SupplierStackSpec(null, props.marks) : null),
    [c.role, props.marks]
  );
  const navigate = useNavigate();
  const footer = (
    <>
      <button type="button" className="ets-btn grow" onClick={props.onClient}>Client profile</button>
      <button
        type="button"
        className="ets-btn grow"
        onClick={() => navigate(buildEts2CorporateOrderUrl(c.name, r.volumeTWh))}
        data-testid="ets2-corporate-order"
      >
        Corporate order
      </button>
      <button type="button" className="ets-btn primary grow" onClick={props.onCalculate ?? undefined} disabled={!props.onCalculate}>Open in calculator</button>
    </>
  );
  const body = (
    <>
      <PanelSection>
        {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="ds-panel-title" style={{ lineHeight: 1.25 }}>{c.name}</div>
            <div className="ds-panel-meta" style={{ marginTop: 4 }}>{props.countryLabel} · {roleText(c)}</div>
          </div>
          <button type="button" className="ds-icon-btn ds-icon-btn-sm" aria-label="Close" onClick={props.onClose}>✕</button>
        </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="ets-tag">{c.confidence.toLowerCase()} confidence</span>
          <StatusSelect value={props.status} onChange={props.onStatus} label={`Outreach status for ${c.name}`} />
        </div>
        <div className="ets-stats">
          <div>
            <div className="ds-panel-stat-label">Market share</div>
            <div className="ds-panel-stat-value">{c.marketSharePct === null ? '—' : `${c.marketSharePct}%`}</div>
          </div>
          <div>
            <div className="ds-panel-stat-label">Gas volume</div>
            <div className="ds-panel-stat-value">{r.volumeTWh === null ? '—' : r.volumeTWh.toFixed(1)}<span className="unit"> TWh</span></div>
          </div>
          <div>
            <div className="ds-panel-stat-label">ETS2 from 2028</div>
            <div className="ds-panel-stat-value">{r.ets2CostEurM === null ? '—' : eurM(r.ets2CostEurM * EUR_PER_EUR_M)}<span className="unit"> /yr</span></div>
          </div>
        </div>
        {c.shareBasis && <div className="ds-panel-meta">Share basis: {c.shareBasis}</div>}
        {r.volumeMethod === 'DISCLOSED' && <div className="ets-note">Disclosed portfolio volume across all segments — it can include ETS1 industrial sites, so the ETS2 cost is an upper bound.</div>}
        {r.volumeMethod === 'SHARE_OF_NATIONAL' && <div className="ets-note info">Approximation: market share × the country's building gas. Shares are usually of all retail sales, not buildings alone.</div>}
        {r.volumeTWh === null && <div className="ets-note info">No volume yet: load the country's building gas on the ETS2 countries tab, or add the company's own figure.</div>}
        {c.notes && <div className="ds-panel-meta">{c.notes}</div>}
        {props.also.length > 0 && (
          <div className="ds-panel-meta">Also exposed to <strong style={{ color: 'var(--color-text)' }}>{props.also.join(', ')}</strong> — see the client profile.</div>
        )}
      </PanelSection>
      {spec && (
        <PanelSection>
          <ValueStackCard key={c.id} spec={spec} marks={props.marks} heading={`Value stack · zero-rated gas from ${ETS2_START_YEAR}`} volumeHint="The tranche you would supply, MWh/yr (as invoiced)" />
        </PanelSection>
      )}
      <PanelSection>
        <div className="ds-panel-section-heading">Sources <span className="ets-muted" style={{ fontWeight: 400 }}>· {c.evidence.length}</span></div>
        <ul className="ets-list">
          {c.evidence.map(e => (
            <li key={e.url + e.note}>
              <a className="name" href={e.url} target="_blank" rel="noreferrer">{sourceLabel(e.url)}</a>
              <span className="ets-muted" style={{ fontSize: 12 }}>{e.checkedAt}</span>
              <span className="meta">{e.note}</span>
            </li>
          ))}
        </ul>
      </PanelSection>
      <PanelSection>
        <div className="ds-panel-section-heading">Contacts</div>
        {c.contacts.length === 0 ? (
          <div className="ds-panel-meta">None on file — research needed. Published business contacts only.</div>
        ) : (
          <ul className="ets-list">
            {c.contacts.map(ct => (
              <li key={ct.sourceUrl + (ct.email ?? '') + (ct.phone ?? '')}>
                <span className="name">{ct.name ?? ct.kind.replace(/_/g, ' ').toLowerCase()}</span>
                <a href={ct.sourceUrl} target="_blank" rel="noreferrer">Source</a>
                <span className="meta">{[ct.role, ct.email, ct.phone].filter(Boolean).join(' · ') || 'Contact page'}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
    </>
  );
  return isMobile ? (
    <Sheet open onClose={props.onClose} title={c.name} subtitle={`${props.countryLabel} · ${roleText(c)}`} variant="full" footer={<div className="ets-sheet-foot">{footer}</div>} testId="ets2-supplier-sheet">
      <div className="ets-sheet-body">{body}</div>
    </Sheet>
  ) : (
    <SidePanel footer={footer}>{body}</SidePanel>
  );
}
