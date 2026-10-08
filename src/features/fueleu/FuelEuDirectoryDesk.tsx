import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { FUEL_EU_SHIPPING_GROUPS, FuelEuShippingGroup } from '../../domain/fueleu/groups';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../../domain/fueleu/shippingTargetsData';
import { ShippingCounterparty, GroupEntityType } from '../../domain/fueleu/types';
import { NO_POOL_MARK, poolingEconomicsForBalance } from '../../domain/fueleu/marketPrices';
import { useFuelEuPrices } from './useFuelEuPrices';
import { sortRows, scaleDivergingBarWidth, SortDirection } from '../../domain/fueleu/uiHelpers';
import { FuelEuSidePanel, FuelEuDirectoryRow } from './FuelEuSidePanel';
import { showToast } from '../../app/DeskToastContainer';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { Sheet, MobileCardList } from '../../shared/ui';
import { SlidersHorizontal } from 'lucide-react';

type ViewMode = 'GROUPS' | 'COMPANIES';

type SortField = 'name' | 'vessels' | 'co2Kt' | 'balanceTco2e' | 'penaltyEur' | 'poolCostEur' | 'savingEur';

interface NormalizedRow {
  key: string;
  name: string;
  meta: string;
  /** "· N entities" — split from `meta` so it can be dropped at narrow widths (CSS) instead of
   *  letting the whole meta line ellipsis mid-word. Only set for group rows. */
  metaCount?: string;
  vessels: number;
  co2Tco2e: number;
  balanceTco2e: number;
  penaltyEur: number;
  isSurplus: boolean;
  poolCostEur: number | null;
  /** Saving (deficit) or surplus value (surplus) at the FUELEU mark; null when no pool mark is loaded. */
  savingEur: number | null;
  group: FuelEuShippingGroup;
  company: ShippingCounterparty | null;
  members: ShippingCounterparty[];
  segment: string;
  entityType: GroupEntityType;
  isLngCapable: boolean;
}

const ENTITY_TYPE_OPTIONS: { value: GroupEntityType; label: string }[] = [
  { value: 'OWNER_OPERATOR', label: 'Owner-operator' },
  { value: 'THIRD_PARTY_MANAGER', label: 'Third-party manager' },
  { value: 'CRUISE', label: 'Cruise' },
  { value: 'UNKNOWN', label: 'Unclassified' },
];

function entityTypeLabel(entityType: GroupEntityType): string {
  return ENTITY_TYPE_OPTIONS.find(o => o.value === entityType)?.label ?? 'Unclassified';
}

function dominantSegment(members: ShippingCounterparty[]): string {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.segment, (counts.get(m.segment) || 0) + 1);
  let best = '—';
  let bestCount = -1;
  for (const [seg, count] of counts) {
    if (count > bestCount) {
      best = seg;
      bestCount = count;
    }
  }
  return best;
}

const PAGE_SIZE = 50;

/**
 * The redesigned Directory tab: toolbar (search / groups-companies / segment & entity-type filter
 * popovers / LNG-capable toggle / export), a sortable, paginated table of groups or companies with
 * a diverging 2026-balance bar, and the 420px selection side panel — replacing the old per-row
 * "Select" button and inline row-expansion pattern.
 */
export function FuelEuDirectoryDesk({
  onBuildTermSheet,
  onAddToPool,
  initialQuery,
}: {
  onBuildTermSheet: (company: ShippingCounterparty) => void;
  onAddToPool: (groupId: string) => void;
  /** A company/group name carried in from a hand-off (e.g. Clients `?company=`): filters the list
   *  and preselects the row when it names exactly one group. */
  initialQuery?: string;
}) {
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('GROUPS');
  const [search, setSearch] = useState(initialQuery ?? '');
  const [segmentFilter, setSegmentFilter] = useState<string>('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<GroupEntityType | 'ALL'>('ALL');
  const [lngOnly, setLngOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('penaltyEur');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [segmentMenuOpen, setSegmentMenuOpen] = useState(false);
  const [entityMenuOpen, setEntityMenuOpen] = useState(false);
  const segmentMenuRef = useRef<HTMLDivElement>(null);
  const entityMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (segmentMenuRef.current && !segmentMenuRef.current.contains(e.target as Node)) setSegmentMenuOpen(false);
      if (entityMenuRef.current && !entityMenuRef.current.contains(e.target as Node)) setEntityMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!initialQuery) return;
    setSearch(initialQuery);
    const q = initialQuery.trim().toLowerCase();
    if (!q) return;
    const exact = FUEL_EU_SHIPPING_GROUPS.find(g => g.name.toLowerCase() === q);
    if (exact) setSelectedKey(`group:${exact.id}`);
  }, [initialQuery]);

  const membersByGroup = useMemo(() => {
    const m = new Map<string, ShippingCounterparty[]>();
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      const list = m.get(c.group_id) || [];
      list.push(c);
      m.set(c.group_id, list);
    }
    return m;
  }, []);

  const segments = useMemo(() => Array.from(new Set(FUEL_EU_SHIPPING_COUNTERPARTIES.map(c => c.segment))).sort(), []);

  const pool = useFuelEuPrices().pool;
  const offer = pool?.offerEurPerTco2e ?? null;
  const bid = pool?.bidEurPerTco2e ?? null;

  const allRows: NormalizedRow[] = useMemo(() => {
    if (viewMode === 'GROUPS') {
      return FUEL_EU_SHIPPING_GROUPS.map(g => {
        const members = membersByGroup.get(g.id) || [];
        const isSurplus = g.sumOfCompanyBalances2026 >= 0;
        const econ = poolingEconomicsForBalance(g.sumOfCompanyBalances2026, g.sumOfCompanyPenalties2026, pool);
        const poolCostEur = econ.poolCostEur;
        const savingEur = econ.savingsEur;
        return {
          key: `group:${g.id}`,
          name: g.name,
          meta: `${entityTypeLabel(g.entityType)} · ${dominantSegment(members).replace(/ ship$/i, '')}`,
          metaCount: `· ${g.memberCompanyCount} entities`,
          vessels: g.vessels,
          co2Tco2e: g.inScopeCo2Tco2e,
          balanceTco2e: g.sumOfCompanyBalances2026,
          penaltyEur: g.sumOfCompanyPenalties2026,
          isSurplus,
          poolCostEur,
          savingEur,
          group: g,
          company: null,
          members,
          segment: dominantSegment(members),
          entityType: g.entityType,
          isLngCapable: g.lngShipCount > 0,
        };
      });
    }
    return FUEL_EU_SHIPPING_COUNTERPARTIES.map(c => {
      const group = FUEL_EU_SHIPPING_GROUPS.find(g => g.id === c.group_id);
      const isSurplus = c.compliance_balance_2026_tco2e >= 0;
      const econ = poolingEconomicsForBalance(c.compliance_balance_2026_tco2e, c.penalty_2026_y1_eur, pool);
      const poolCostEur = econ.poolCostEur;
      const savingEur = econ.savingsEur;
      return {
        key: `company:${c.company_imo}`,
        name: c.parent_name,
        meta: group ? group.name : c.group_name,
        vessels: c.vessels_in_scope,
        co2Tco2e: c.ets_exposure_2026_tco2,
        balanceTco2e: c.compliance_balance_2026_tco2e,
        penaltyEur: c.penalty_2026_y1_eur,
        isSurplus,
        poolCostEur,
        savingEur,
        group: group ?? ({ id: c.group_id, name: c.group_name, contacts: [] } as unknown as FuelEuShippingGroup),
        company: c,
        members: [c],
        segment: c.segment,
        entityType: c.entityType,
        isLngCapable: c.fleetCapability === 'DUAL_FUEL_LNG',
      };
    });
  }, [viewMode, membersByGroup, offer, bid]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter(r => {
      if (segmentFilter !== 'ALL' && r.segment !== segmentFilter) return false;
      if (entityTypeFilter !== 'ALL' && r.entityType !== entityTypeFilter) return false;
      if (lngOnly && !r.isLngCapable) return false;
      if (q) {
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesMember = r.members.some(m => m.parent_name.toLowerCase().includes(q) || m.company_imo.toLowerCase().includes(q));
        if (!matchesName && !matchesMember) return false;
      }
      return true;
    });
  }, [allRows, search, segmentFilter, entityTypeFilter, lngOnly]);

  const sortedRows = useMemo(() => {
    const getValue = (r: NormalizedRow): number | string => {
      switch (sortField) {
        case 'name':
          return r.name;
        case 'vessels':
          return r.vessels;
        case 'co2Kt':
          return r.co2Tco2e;
        case 'balanceTco2e':
          return r.balanceTco2e;
        case 'penaltyEur':
          return r.penaltyEur;
        case 'poolCostEur':
          return r.poolCostEur ?? 0;
        case 'savingEur':
          return r.savingEur ?? 0;
        default:
          return 0;
      }
    };
    return sortRows(filteredRows, getValue, sortDirection);
  }, [filteredRows, sortField, sortDirection]);

  useEffect(() => {
    setPage(1);
  }, [search, segmentFilter, entityTypeFilter, lngOnly, viewMode, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const validPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => sortedRows.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE), [sortedRows, validPage]);

  const pageMaxMagnitude = useMemo(() => pageRows.reduce((m, r) => Math.max(m, Math.abs(r.balanceTco2e)), 0), [pageRows]);

  // Default selection: first row, and keep selection valid as filters change.
  useEffect(() => {
    // Mobile: a row opens a full-screen sheet, so nothing is pre-selected (it would pop open on load).
    if (isMobile) return;
    if (pageRows.length === 0) {
      if (selectedKey !== null) setSelectedKey(null);
      return;
    }
    if (!pageRows.some(r => r.key === selectedKey)) {
      setSelectedKey(pageRows[0].key);
    }
  }, [pageRows, selectedKey, isMobile]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedKey(null);
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const selectedRow = pageRows.find(r => r.key === selectedKey) || null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortIcon = (field: SortField) =>
    sortField === field ? (
      sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
    ) : (
      <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
    );

  const handleExport = () => {
    const headers = ['Name', 'Meta', 'Vessels', 'In-scope CO2 (t)', '2026 balance (t)', 'Penalty (EUR)', 'Pool cost (EUR)', 'Saving (EUR)'];
    const escapeVal = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = sortedRows.map(r => [
      escapeVal(r.name),
      escapeVal(r.meta + (r.metaCount ? ` ${r.metaCount}` : '')),
      r.vessels,
      Math.round(r.co2Tco2e),
      Math.round(r.balanceTco2e),
      Math.round(r.penaltyEur),
      r.poolCostEur !== null ? Math.round(r.poolCostEur) : '',
      r.savingEur !== null ? Math.round(r.savingEur) : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fueleu_directory_${viewMode.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${sortedRows.length} ${viewMode.toLowerCase()} to CSV`, 'SUCCESS');
  };

  const sortLabel: Record<SortField, string> = {
    name: 'name',
    vessels: 'vessels',
    co2Kt: 'in-scope CO₂',
    balanceTco2e: '2026 balance',
    penaltyEur: '2026 penalty',
    poolCostEur: 'pool cost',
    savingEur: 'saving',
  };

  const buildRowForPanel = (r: NormalizedRow): FuelEuDirectoryRow => ({
    kind: r.company ? 'COMPANY' : 'GROUP',
    group: r.group,
    company: r.company ?? undefined,
    members: r.members,
  });

  const activeFilterCount =
    (segmentFilter !== 'ALL' ? 1 : 0) + (entityTypeFilter !== 'ALL' ? 1 : 0) + (lngOnly ? 1 : 0);

  const mobileToolbar = (
    <>
      <div className="fe-m-toolbar">
        <label className="fe-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search groups, DoC holders, IMO"
            aria-label="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        <div className="fe-m-toolbar-row">
          <div className="fe-seg" role="group" aria-label="Directory view">
            <button type="button" className={viewMode === 'GROUPS' ? 'active' : ''} onClick={() => setViewMode('GROUPS')}>
              Groups
            </button>
            <button type="button" className={viewMode === 'COMPANIES' ? 'active' : ''} onClick={() => setViewMode('COMPANIES')}>
              Companies
            </button>
          </div>
          <button
            type="button"
            className={`fe-toggle-btn fe-m-filters-btn ${activeFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setFiltersOpen(true)}
            data-testid="fe-filters-btn"
          >
            <SlidersHorizontal size={14} /> <span>Filters &amp; sort{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>
        </div>
      </div>
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters & sort"
        variant="bottom"
        testId="fe-filters-sheet"
        footer={
          <div className="fe-scope fe-m-footer">
            <button
              type="button"
              className="fe-btn-secondary"
              onClick={() => { setSegmentFilter('ALL'); setEntityTypeFilter('ALL'); setLngOnly(false); }}
            >
              Reset
            </button>
            <button type="button" className="fe-btn-primary" onClick={() => setFiltersOpen(false)}>
              Show {sortedRows.length.toLocaleString()} {viewMode.toLowerCase()}
            </button>
          </div>
        }
      >
        <div className="fe-scope fe-m-filters">
          <label className="fe-m-field">
            <span>Segment</span>
            <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)}>
              <option value="ALL">All segments</option>
              {segments.map(seg => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>
          </label>
          <label className="fe-m-field">
            <span>Entity type</span>
            <select value={entityTypeFilter} onChange={e => setEntityTypeFilter(e.target.value as GroupEntityType | 'ALL')}>
              <option value="ALL">All entity types</option>
              {ENTITY_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <button type="button" className={`fe-toggle-btn ${lngOnly ? 'active' : ''}`} aria-pressed={lngOnly} onClick={() => setLngOnly(v => !v)}>
            LNG-capable
          </button>
          <div className="fe-m-field">
            <span>Sort by</span>
            <div className="fe-m-sort">
              <select value={sortField} aria-label="Sort by" onChange={e => { setSortField(e.target.value as SortField); setSortDirection(e.target.value === 'name' ? 'asc' : 'desc'); }}>
                {(Object.keys(sortLabel) as SortField[]).map(f => (
                  <option key={f} value={f}>{sortLabel[f]}</option>
                ))}
              </select>
              <button
                type="button"
                className="fe-toggle-btn"
                aria-label={sortDirection === 'asc' ? 'Ascending, tap for descending' : 'Descending, tap for ascending'}
                onClick={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
              >
                {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </button>
            </div>
          </div>
          <button type="button" className="fe-toggle-btn" onClick={handleExport}>
            <Download size={14} /> <span>Export CSV</span>
          </button>
        </div>
      </Sheet>
    </>
  );

  const mobileCards = (
    <MobileCardList
      testId="fe-directory-cards"
      items={pageRows}
      getKey={r => r.key}
      onSelect={r => setSelectedKey(r.key)}
      title={r => r.name}
      subtitle={r => (
        <>
          {r.meta}
          {r.metaCount ? ` ${r.metaCount}` : ''}
        </>
      )}
      metric={r => `€${(r.penaltyEur / 1e6).toFixed(1)}M`}
      metricLabel={() => 'Penalty'}
      fields={r => [
        { label: '2026 balance', value: `${r.isSurplus ? '+' : '−'}${(Math.abs(r.balanceTco2e) / 1000).toFixed(1)} kt`, mono: true, tone: r.isSurplus ? 'pos' : 'neg' },
        { label: r.isSurplus ? 'Surplus value' : 'Saving', value: r.savingEur === null ? '—' : `€${(r.savingEur / 1e6).toFixed(1)}M`, mono: true },
        { label: 'Vessels', value: r.vessels.toLocaleString(), mono: true },
        { label: 'In-scope CO₂ (kt)', value: Math.round(r.co2Tco2e / 1000).toLocaleString(), mono: true },
        { label: 'Pool cost', value: r.poolCostEur !== null ? `€${(r.poolCostEur / 1e6).toFixed(1)}M` : '—', mono: true, tone: 'muted' },
      ]}
      empty="No rows match the current search & filters."
    />
  );

  return (
    <div className="fe-body">
      <div className="fe-directory-grid">
      <div className="fe-table-col">
        {isMobile && mobileToolbar}
        {!isMobile && (
        <div className="fe-toolbar">
          <label className="fe-search">
            <Search size={14} />
            <input
              type="search"
              placeholder="Search groups, DoC holders, IMO"
              aria-label="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>

          <div className="fe-seg" role="group" aria-label="Directory view">
            <button type="button" className={viewMode === 'GROUPS' ? 'active' : ''} onClick={() => setViewMode('GROUPS')}>
              Groups
            </button>
            <button type="button" className={viewMode === 'COMPANIES' ? 'active' : ''} onClick={() => setViewMode('COMPANIES')}>
              Companies
            </button>
          </div>

          <div ref={segmentMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`fe-filter-btn ${segmentFilter !== 'ALL' ? 'active' : ''}`}
              onClick={() => setSegmentMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={segmentMenuOpen}
            >
              {segmentFilter === 'ALL' ? '+ Segment' : segmentFilter}
            </button>
            {segmentMenuOpen && (
              <div className="fe-popover" role="menu" style={{ width: '220px', left: 0, right: 'auto' }}>
                <button type="button" className="fe-btn-secondary" style={{ width: '100%', height: '28px', marginBottom: '6px' }} onClick={() => { setSegmentFilter('ALL'); setSegmentMenuOpen(false); }}>
                  All segments
                </button>
                {segments.map(seg => (
                  <div key={seg} style={{ padding: '4px 0' }}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={segmentFilter === seg}
                      onClick={() => { setSegmentFilter(seg); setSegmentMenuOpen(false); }}
                      style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', color: segmentFilter === seg ? 'var(--fe-accent)' : 'var(--fe-ink)', fontWeight: segmentFilter === seg ? 600 : 400 }}
                    >
                      {seg}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div ref={entityMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`fe-filter-btn ${entityTypeFilter !== 'ALL' ? 'active' : ''}`}
              onClick={() => setEntityMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={entityMenuOpen}
            >
              {entityTypeFilter === 'ALL' ? '+ Entity type' : entityTypeLabel(entityTypeFilter)}
            </button>
            {entityMenuOpen && (
              <div className="fe-popover" role="menu" style={{ width: '200px', left: 0, right: 'auto' }}>
                <button type="button" className="fe-btn-secondary" style={{ width: '100%', height: '28px', marginBottom: '6px' }} onClick={() => { setEntityTypeFilter('ALL'); setEntityMenuOpen(false); }}>
                  All entity types
                </button>
                {ENTITY_TYPE_OPTIONS.map(opt => (
                  <div key={opt.value} style={{ padding: '4px 0' }}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={entityTypeFilter === opt.value}
                      onClick={() => { setEntityTypeFilter(opt.value); setEntityMenuOpen(false); }}
                      style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', color: entityTypeFilter === opt.value ? 'var(--fe-accent)' : 'var(--fe-ink)', fontWeight: entityTypeFilter === opt.value ? 600 : 400 }}
                    >
                      {opt.label}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="button" className={`fe-toggle-btn ${lngOnly ? 'active' : ''}`} aria-pressed={lngOnly} onClick={() => setLngOnly(v => !v)}>
            LNG-capable
          </button>

          <div style={{ flexGrow: 1 }} />

          <button type="button" className="fe-toggle-btn" onClick={handleExport}>
            <Download size={12} /> <span>Export</span>
          </button>
        </div>
        )}

        <div className="fe-table-wrap">
          {isMobile ? (
            mobileCards
          ) : (
          <>
          <div className="fe-thead-row fe-table-cols">
            <div>
              <button type="button" onClick={() => handleSort('name')}>
                <span>{viewMode === 'GROUPS' ? 'Group' : 'Company'}</span> {sortIcon('name')}
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="button" onClick={() => handleSort('vessels')} style={{ marginLeft: 'auto' }}>
                <span>Vessels</span> {sortIcon('vessels')}
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="button" onClick={() => handleSort('co2Kt')} style={{ marginLeft: 'auto' }}>
                <span>In-scope CO₂</span> {sortIcon('co2Kt')}
              </button>
            </div>
            <div>
              <button type="button" onClick={() => handleSort('balanceTco2e')}>
                <span>2026 balance</span> {sortIcon('balanceTco2e')}
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="button" onClick={() => handleSort('penaltyEur')} style={{ marginLeft: 'auto' }}>
                <span>Penalty</span> {sortIcon('penaltyEur')}
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="button" onClick={() => handleSort('poolCostEur')} style={{ marginLeft: 'auto' }}>
                <span>Pool cost</span> {sortIcon('poolCostEur')}
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="button" onClick={() => handleSort('savingEur')} style={{ marginLeft: 'auto' }}>
                <span>Saving</span> {sortIcon('savingEur')}
              </button>
            </div>
          </div>

          <div role="listbox" aria-label={`${viewMode === 'GROUPS' ? 'Group' : 'Company'} directory`}>
            {pageRows.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--fe-muted)' }}>No rows match the current search &amp; filters.</div>
            ) : (
              pageRows.map(r => {
                const barWidth = scaleDivergingBarWidth(r.balanceTco2e, pageMaxMagnitude, 72);
                const isSelected = r.key === selectedKey;
                return (
                  <button
                    key={r.key}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`fe-row fe-table-cols ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedKey(r.key)}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="fe-row-name">{r.name}</div>
                      <div className="fe-row-meta">
                        {r.meta}
                        {r.metaCount && <span className="fe-row-meta-count"> {r.metaCount}</span>}
                      </div>
                    </div>
                    <div className="num" style={{ textAlign: 'right' }}>{r.vessels.toLocaleString()}</div>
                    <div className="num" style={{ textAlign: 'right' }}>{Math.round(r.co2Tco2e / 1000).toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div className="fe-bar-track" style={{ justifyContent: r.isSurplus ? 'flex-start' : 'flex-end', flexShrink: 0 }}>
                        <div
                          className="fe-bar-fill"
                          style={{
                            width: `${barWidth}px`,
                            background: r.isSurplus ? 'var(--fe-surplus)' : 'var(--fe-deficit)',
                          }}
                        />
                      </div>
                      <span className="num" style={{ color: r.isSurplus ? 'var(--fe-surplus)' : 'var(--fe-deficit)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {r.isSurplus ? '+' : '−'}{(Math.abs(r.balanceTco2e) / 1000).toFixed(1)} kt
                      </span>
                    </div>
                    <div className="num" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>€{(r.penaltyEur / 1e6).toFixed(1)}M</div>
                    <div className="num" style={{ textAlign: 'right', color: 'var(--fe-muted)', whiteSpace: 'nowrap' }}>
                      {r.poolCostEur !== null ? `€${(r.poolCostEur / 1e6).toFixed(1)}M` : '—'}
                    </div>
                    <div className="num" style={{ textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {r.savingEur === null ? (
                        <span title={NO_POOL_MARK}>—</span>
                      ) : r.isSurplus ? (
                        <span title="Surplus value at bid">Surplus €{(r.savingEur / 1e6).toFixed(1)}M</span>
                      ) : (
                        `€${(r.savingEur / 1e6).toFixed(1)}M`
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          </>
          )}

          <div className="fe-tfoot">
            <span className="num">
              {pageRows.length} of {sortedRows.length.toLocaleString()} {viewMode.toLowerCase()} · sorted by {sortLabel[sortField]}
            </span>
            <div className="fe-tfoot-right">
              <span>Penalty: Annex IV, first year · {offer === null ? NO_POOL_MARK : `Pool cost at €${offer.toFixed(2)} offer (FUELEU mark)`} · indicative</span>
              {totalPages > 1 && (
                <nav className="fe-pagination" aria-label="Table pages">
                  <button type="button" aria-label="Previous page" disabled={validPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft size={14} />
                  </button>
                  <span className="fe-pagination-label num">{validPage} / {totalPages}</span>
                  <button type="button" aria-label="Next page" disabled={validPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight size={14} />
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRow && !isMobile && (
        <FuelEuSidePanel
          row={buildRowForPanel(selectedRow)}
          onClose={() => setSelectedKey(null)}
          onBuildTermSheet={onBuildTermSheet}
          onAddToPool={onAddToPool}
        />
      )}
      {isMobile && (
        <Sheet
          open={selectedRow !== null}
          onClose={() => setSelectedKey(null)}
          title={selectedRow?.name}
          variant="full"
          testId="fe-panel-sheet"
        >
          {selectedRow && (
            <div className="fe-scope">
              <FuelEuSidePanel
                embedded
                row={buildRowForPanel(selectedRow)}
                onClose={() => setSelectedKey(null)}
                onBuildTermSheet={onBuildTermSheet}
                onAddToPool={onAddToPool}
              />
            </div>
          )}
        </Sheet>
      )}
      </div>
    </div>
  );
}
