import React, { useState, useMemo } from 'react';
import { deriveSourceBadge } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { SIMULATED_SOURCE_NAME } from '../../domain/marks/simulate';
import { SourceChip } from '../../shared/ui/SourceChip';
import { isDeThgBundleMarkId } from '../../domain/markets/deThgBundle';
import { isSimulatedMark, resolveMarketForQuote, rowFeedsMarket, rowHasPrice } from '../../domain/marks/applyMarks';
import { BrokerRunImporterModal } from './BrokerRunImporterModal';
import { showToast } from '../../app/DeskToastContainer';
import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';
import { ProvenanceTier } from '../../domain/markets/brokerMarketData';
import { PageShell } from '../../shared/ui/PageShell';
import './marks.css';
import { KpiRow, KpiTile } from '../../shared/ui/KpiTile';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { Sheet, MobileCardList } from '../../shared/ui';
import {
  Download,
  Search,
  FileSpreadsheet,
  Filter,
  Sparkles
} from 'lucide-react';

function formatAge(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  // Compute difference in days from current local date
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
  return diffDays === 0 ? 'today' : `${diffDays} d old`;
}

function formatRunDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function MarksScreen() {
  const { state, dispatch } = useAppState();
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [dateInputValue, setDateInputValue] = useState(state.pricingRunMeta?.receivedOn || '2026-08-18');
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Master Quotes State comes directly from app state (persisted in store)
  const quotes: PricingBookEntry[] = state.pricingBook || [];

  // Filter states
  const [bookFilter, setBookFilter] = useState<'ALL' | 'COMPLIANCE' | 'VOLUNTARY'>('ALL');
  const [selectedCountryGroup, setSelectedCountryGroup] = useState<string>('ALL');
  const [provenanceFilter, setProvenanceFilter] = useState<'ALL' | ProvenanceTier>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Country pill definitions
  const countryPills = [
    { label: 'ALL', id: 'ALL' },
    { label: 'UK (12)', id: 'UK' },
    { label: 'FR (8)', id: 'FR' },
    { label: 'NL (6)', id: 'NL' },
    { label: 'DE (5)', id: 'DE' },
    { label: 'DK (7)', id: 'DK' },
    { label: 'AIB (4)', id: 'AIB' },
    { label: 'IT (3)', id: 'IT' },
    { label: 'ES (2)', id: 'ES' },
    { label: 'SE', id: 'SE' },
    { label: 'AT', id: 'AT' },
    { label: 'FI', id: 'FI' },
    { label: 'BE', id: 'BE' },
    { label: 'PL', id: 'PL' },
    { label: 'CZ', id: 'CZ' },
    { label: 'CH', id: 'CH' },
    { label: 'NO', id: 'NO' },
    { label: 'Baltics (3)', id: 'BALTICS' },
    { label: 'CEE & South (9)', id: 'CEE' },
    { label: 'EU (2)', id: 'EU' },
  ];

  // Handle cell edit - dispatched to central store seam
  const handleCellEdit = (id: string, field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume', val: string) => {
    dispatch({
      type: 'UPDATE_PRICING_BOOK_CELL',
      id,
      field,
      value: val,
    });
  };

  // Filter logic
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      // Book filter
      const matchBook = bookFilter === 'ALL'
        || (bookFilter === 'COMPLIANCE' && q.productClass === 'BUNDLED_COMPLIANCE')
        || (bookFilter === 'VOLUNTARY' && q.productClass === 'GO_VOLUNTARY');

      // Country filter
      let matchCountry: boolean;
      if (selectedCountryGroup === 'ALL') {
        matchCountry = true;
      } else if (selectedCountryGroup === 'BALTICS') {
        matchCountry = q.country === 'EE' || q.country === 'LT' || q.country === 'LV';
      } else if (selectedCountryGroup === 'CEE') {
        matchCountry = ['IE', 'PT', 'HU', 'SK', 'RO', 'BG', 'HR', 'SI', 'GR'].includes(q.country);
      } else {
        matchCountry = q.country === selectedCountryGroup;
      }

      // Provenance filter
      const tier = q.provenanceTier || 'BROKER_RUN';
      const matchProvenance = provenanceFilter === 'ALL' || tier === provenanceFilter;

      // Search query filter
      const matchSearch = !searchQuery ||
        q.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.feedstock.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.vintage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.certified.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.ciScore.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.derivedFrom || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchBook && matchCountry && matchProvenance && matchSearch;
    });
  }, [quotes, bookFilter, selectedCountryGroup, provenanceFilter, searchQuery]);

  // Provenance counts for quotes in book
  const provenanceCounts = useMemo(() => {
    const counts: Record<ProvenanceTier, number> = {
      BROKER_RUN: 0,
      WEB_INDEX: 0,
      STATUTORY_DIRECTIVE: 0,
      MODELLED_SIMULATED: 0,
    };
    quotes.forEach(q => {
      const tier = q.provenanceTier || 'BROKER_RUN';
      counts[tier] = (counts[tier] || 0) + 1;
    });
    return counts;
  }, [quotes]);

  // Marks by source (Broker / Manual / Simulated)
  const markSourceCounts = useMemo(() => {
    let broker = 0;
    let manual = 0;
    let simulated = 0;

    // The DE THG bundle marks are quotes feeding the netback, not markets, so they are not counted here.
    Object.entries(state.marks.marks).filter(([id]) => !isDeThgBundleMarkId(id)).map(([, m]) => m).forEach(m => {
      if (isSimulatedMark(m)) {
        simulated++;
      } else if (m.source?.toLowerCase().includes('manual') || m.provenance?.sourceName?.toLowerCase().includes('manual')) {
        manual++;
      } else if (m.provenance?.sourceType === 'BROKER_INDICATION' || m.source?.toLowerCase().includes('broker')) {
        broker++;
      } else {
        broker++;
      }
    });

    return { broker, manual, simulated };
  }, [state.marks.marks]);

  const handleExportCsv = () => {
    const headers = ['Country', 'Class', 'Feedstock', 'Vintage', 'Certified', 'Subsidized', 'CI Score', 'BID Price', 'OFFER Price', 'BID Volume', 'OFFER Volume', 'Price Derived From', 'Provenance Tier'];
    const rows = filteredQuotes.map(q => [
      q.country,
      q.class,
      `"${q.feedstock}"`,
      q.vintage,
      `"${q.certified}"`,
      q.subsidized,
      `"${q.ciScore}"`,
      `"${q.bidPrice}"`,
      `"${q.offerPrice}"`,
      `"${q.bidVolume}"`,
      `"${q.offerVolume}"`,
      `"${q.derivedFrom}"`,
      q.provenanceTier,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pan-european-biomethane-order-book-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Pan-European order book exported to CSV');
  };

  const gasIndexPrice = state.marks.gasIndex.mid ?? state.marks.gasIndex.offer ?? state.marks.gasIndex.bid;
  const gbpRate = state.marks.fx.gbpEur;
  const gasIndexBadge = deriveSourceBadge(state.marks.gasIndex.provenance, SIMULATED_SOURCE_NAME);
  const fxBadge = deriveSourceBadge(state.marks.fx.provenance, SIMULATED_SOURCE_NAME);

  const provenanceBadge = (q: PricingBookEntry) => {
    const age = formatAge(q.observedAt);
    if (q.provenanceTier === 'BROKER_RUN') {
      return { badgeClass: 'chip-info', badgeLabel: `📑 Broker · ${age}` };
    }
    const ageSuffix = q.observedAt ? ` · ${age}` : '';
    if (q.provenanceTier === 'WEB_INDEX') {
      return { badgeClass: 'chip-neutral', badgeLabel: `🌐 Research (unverified)${ageSuffix}` };
    }
    if (q.provenanceTier === 'STATUTORY_DIRECTIVE') {
      return { badgeClass: 'chip-warn', badgeLabel: `⚖️ Statutory${ageSuffix}` };
    }
    return { badgeClass: 'chip-neutral', badgeLabel: `🔬 Modelled${ageSuffix}` };
  };

  const editingQuote = editingId ? quotes.find(q => q.id === editingId) ?? null : null;
  const activeFilterCount =
    (bookFilter !== 'ALL' ? 1 : 0) + (provenanceFilter !== 'ALL' ? 1 : 0) + (selectedCountryGroup !== 'ALL' ? 1 : 0);

  const editField = (
    label: string,
    field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume',
    q: PricingBookEntry,
    aria: string,
  ) => {
    const isVolField = field === 'bidVolume' || field === 'offerVolume';
    const isReferenceOnly = !q.isTradeable && isVolField;

    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="eyebrow">{label}</span>
        <input
          type="text"
          value={isReferenceOnly ? '—' : q[field]}
          disabled={isReferenceOnly}
          onChange={e => handleCellEdit(q.id, field, e.target.value)}
          placeholder="—"
          aria-label={`${aria} for ${q.country} ${q.feedstock}`}
          className="input num"
          style={{
            width: '100%',
            textAlign: 'right',
            minHeight: '44px',
            fontWeight: 700,
            opacity: isReferenceOnly ? 0.5 : 1,
          }}
        />
      </label>
    );
  };

  return (
    <PageShell>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '14px 18px',
          borderBottom: '2px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet className="w-5 h-5 text-accent" style={{ color: 'var(--color-accent)' }} />
            <h3 className="ptitle m-page-title" style={{ margin: 0, fontSize: '18px' }}>
              Pricing Desk &amp; Master Order Book
            </h3>
          </div>
          <div className="subttl" style={{ marginTop: '2px', fontSize: '12px' }}>
            Complete Pan-European Biomethane Pricing Book · {quotes.length} Quotes Across 38 European Markets &amp; Registries
          </div>
        </div>

        {/* Action Buttons */}
        <div className="marks-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              fontSize: '12px',
              padding: '6px 14px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setIsImporterOpen(true)}
            title="Paste unstructured broker runs from STX, ACT, Marex, or Vertis to import live market marks"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Paste Broker Run (1-Click)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={handleExportCsv}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Order Book CSV
          </button>
        </div>
      </div>

      {/* Four-cell Institutional Ledger Strip */}
      <KpiRow columns={4}>
        <KpiTile
          label={
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <span>TTF M+1 base natural gas</span>
              <SourceChip badge={gasIndexBadge} suffix={state.marks.gasIndex.provenance?.observedAt ? formatAge(state.marks.gasIndex.provenance.observedAt) : null} />
            </span>
          }
          value={gasIndexPrice !== null && gasIndexPrice !== undefined ? `€${gasIndexPrice.toFixed(2)}` : 'unrecorded'}
          style={gasIndexBadge.variant === 'WARNING' ? { color: 'var(--color-warn, #b45309)' } as React.CSSProperties : undefined}
          sub={
            gasIndexPrice !== null && gasIndexPrice !== undefined
              ? `bid ${(state.marks.gasIndex.bid ?? gasIndexPrice).toFixed(2)} · offer ${(state.marks.gasIndex.offer ?? gasIndexPrice).toFixed(2)} / MWh`
              : 'unrecorded'
          }
        />

        <KpiTile
          label={
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <span>GBP / EUR fix</span>
              <SourceChip badge={fxBadge} suffix={state.marks.fx.provenance?.observedAt ? formatAge(state.marks.fx.provenance.observedAt) : null} />
            </span>
          }
          value={gbpRate !== null && gbpRate !== undefined ? gbpRate.toFixed(4) : 'unrecorded'}
          sub="UK RTFO & RGGO currency conversion parity"
        />

        <KpiTile
          label={
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <span>Pan-European quotes</span>
              <span className="chip chip-info">{provenanceCounts.BROKER_RUN > 0 ? `${provenanceCounts.BROKER_RUN} broker runs` : 'Active'}</span>
            </span>
          }
          value={`${filteredQuotes.length} / ${quotes.length}`}
          sub={`${provenanceCounts.BROKER_RUN} broker rows · ${quotes.length - provenanceCounts.BROKER_RUN} reference rows (not tradeable)`}
        />

        <KpiTile
          label={
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <span>Provenance breakdown</span>
              <span className="chip">{Object.keys(state.marks.marks).filter(id => !isDeThgBundleMarkId(id)).length} markets</span>
            </span>
          }
          value={
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '13px' }}>
              <span className="chip chip-info">{markSourceCounts.broker} broker</span>
              <span className="chip chip-pos">{markSourceCounts.manual} manual</span>
              <span className="chip chip-warn">{markSourceCounts.simulated} simulated</span>
            </span>
          }
          sub={
            <span style={{ display: 'inline-block', lineHeight: 1.4 }}>
              Broker quotes: run received {state.pricingRunMeta?.receivedOnIsApproximate === false ? '' : '≈ '}{formatRunDate(state.pricingRunMeta?.receivedOn || '2026-08-18')}{' '}
              <button
                type="button"
                onClick={() => {
                  setDateInputValue(state.pricingRunMeta?.receivedOn || '2026-08-18');
                  setIsDateModalOpen(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
                title="Edit the observation date for this broker run"
                data-testid="edit-run-date-btn"
              >
                (edit)
              </button>
              . Other rows are research or modelled, not tradeable prices.
            </span>
          }
        />
      </KpiRow>

      {/* Main Order Book Container */}
      <div style={{ padding: '16px 18px 24px' }}>
        {isMobile ? (
          <div className="marks-mobile-controls">
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '12px', top: '15px' }} />
              <input
                type="text"
                placeholder="Filter country, feedstock, CI, source..."
                aria-label="Filter quotes"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '4px 8px 4px 34px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <button
              type="button"
              className={`btn ${activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setFiltersOpen(true)}
              data-testid="marks-filters-open"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
        ) : (
          <>
        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Book Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)' }}>
              Book:
            </span>
            <button
              type="button"
              className={`btn ${bookFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '3px 10px' }}
              onClick={() => setBookFilter('ALL')}
            >
              All Book ({quotes.length})
            </button>
            <button
              type="button"
              className={`btn ${bookFilter === 'COMPLIANCE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '3px 10px' }}
              onClick={() => setBookFilter('COMPLIANCE')}
            >
              🏛️ Compliance Quotas ({quotes.filter(q => q.productClass === 'BUNDLED_COMPLIANCE').length})
            </button>
            <button
              type="button"
              className={`btn ${bookFilter === 'VOLUNTARY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '3px 10px' }}
              onClick={() => setBookFilter('VOLUNTARY')}
            >
              🌱 Voluntary GOs ({quotes.filter(q => q.productClass === 'GO_VOLUNTARY').length})
            </button>
          </div>

          {/* Source Tier & Text Search Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Provenance Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)' }}>
                Source:
              </span>
              <select
                value={provenanceFilter}
                onChange={e => setProvenanceFilter(e.target.value as any)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
                aria-label="Filter quotes by data provenance tier"
              >
                <option value="ALL">All Sources ({quotes.length})</option>
                <option value="BROKER_RUN">📑 Bilateral Broker Runs ({provenanceCounts.BROKER_RUN})</option>
                <option value="WEB_INDEX">🌐 Research / Web Indexes ({provenanceCounts.WEB_INDEX})</option>
                <option value="STATUTORY_DIRECTIVE">⚖️ Statutory Directives ({provenanceCounts.STATUTORY_DIRECTIVE})</option>
                <option value="MODELLED_SIMULATED">🔬 Modelled Benchmarks ({provenanceCounts.MODELLED_SIMULATED})</option>
              </select>
            </div>

            {/* Quick Text Search */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px', top: '9px' }} />
              <input
                type="text"
                placeholder="Filter country, feedstock, CI, source..."
                aria-label="Filter quotes"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px 4px 26px',
                  fontSize: '12px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Regional Hub Country Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', marginRight: '4px' }}>
            Hub:
          </span>
          {countryPills.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedCountryGroup(p.id)}
              className={`btn ${selectedCountryGroup === p.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '2px 7px', minHeight: '22px', borderRadius: 'var(--radius-control)' }}
            >
              {p.label}
            </button>
          ))}
        </div>

          </>
        )}

        {isMobile ? (
          <MobileCardList
            testId="marks-cards"
            items={filteredQuotes}
            getKey={q => q.id}
            title={q => (
              <span style={{ fontWeight: q.highlight ? 700 : 600 }}>
                {q.country} {q.class} · {q.feedstock}
              </span>
            )}
            subtitle={q => `Vintage ${q.vintage} · ${q.certified}`}
            metric={q => `${q.bidPrice || '—'} / ${q.offerPrice || '—'}`}
            metricLabel={() => 'Bid / Offer'}
            badges={q => {
              const { badgeClass, badgeLabel } = provenanceBadge(q);
              const marketId = resolveMarketForQuote(q);
              const isReference = marketId && state.referenceRowIds?.[marketId] === q.id;

              return (
                <>
                  {isReference && <span className="chip chip-warn">★ MARK</span>}
                  {q.highlight && !isReference && <span className="chip chip-warn">★ FOCUS</span>}
                  <span className={`chip ${q.productClass === 'GO_VOLUNTARY' ? 'chip-info' : 'chip-neutral'}`}>{q.class}</span>
                  <span className={`chip ${badgeClass}`}>{badgeLabel}</span>
                </>
              );
            }}
            fields={q => {
              const marketId = resolveMarketForQuote(q);
              const isReference = marketId && state.referenceRowIds?.[marketId] === q.id;

              const f: import('../../shared/ui').MobileCardField[] = [
                { label: 'Bid vol', value: q.isTradeable ? (q.bidVolume || '—') : '—', mono: true },
                { label: 'Offer vol', value: q.isTradeable ? (q.offerVolume || '—') : '—', mono: true },
                { label: 'CI score', value: q.ciScore || '—', mono: true },
                { label: 'Subsidy', value: q.subsidized, tone: q.subsidized === 'Unsubsidised' ? 'pos' : 'muted' },
                { label: 'Price derived from', value: q.derivedFrom || '—', span: 2 },
              ];

              if (marketId && q.provenanceTier === 'BROKER_RUN' && rowFeedsMarket(q, marketId) && rowHasPrice(q) && !isReference) {
                f.push({
                  label: 'Action',
                  value: (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'SET_MARKET_REFERENCE_ROW', marketId, rowId: q.id });
                        showToast(`Set as ${marketId} reference mark`);
                      }}
                    >
                      Use as mark
                    </button>
                  ),
                  span: 2,
                });
              }

              return f;
            }}
            onSelect={q => setEditingId(q.id)}
            empty="No quotes match these filters."
          />
        ) : (
          <>
        {/* Master Clean Institutional Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>Country</th>
                <th style={{ width: '75px', textAlign: 'center' }}>Class</th>
                <th style={{ minWidth: '200px' }}>Feedstock &amp; Specification</th>
                <th style={{ width: '75px', textAlign: 'center' }}>Vintage</th>
                <th style={{ width: '112px', textAlign: 'center' }}>Certified</th>
                <th className="marks-col-subsidized" style={{ width: '95px', textAlign: 'center' }}>Subsidized</th>
                <th style={{ width: '95px', textAlign: 'center' }}>CI Score</th>
                <th style={{ width: '105px', textAlign: 'right' }}>BID Price</th>
                <th style={{ width: '105px', textAlign: 'right' }}>OFFER Price</th>
                <th style={{ width: '95px', textAlign: 'right' }}>BID Vol</th>
                <th style={{ width: '95px', textAlign: 'right' }}>OFFER Vol</th>
                <th className="marks-col-source">Price Derived From</th>
                <th style={{ width: '112px', textAlign: 'center' }}>Mark</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map(q => {
                const isFocus = Boolean(q.highlight);
                const { badgeClass, badgeLabel } = provenanceBadge(q);
                const marketId = resolveMarketForQuote(q);
                const isCurrentRef = Boolean(marketId && state.referenceRowIds?.[marketId] === q.id);
                const isReferenceOnly = !q.isTradeable;

                return (
                  <tr
                    key={q.id}
                    style={{
                      transition: 'background-color 120ms ease',
                      backgroundColor: isCurrentRef ? 'var(--color-surface-selected, rgba(234, 179, 8, 0.04))' : undefined,
                    }}
                  >
                    {/* Country */}
                    <td style={{ textAlign: 'center', fontWeight: 700 }} className="num">
                      {q.country}
                    </td>

                    {/* Class */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`chip ${q.productClass === 'GO_VOLUNTARY' ? 'chip-info' : 'chip-neutral'}`} style={{ fontSize: '12px', padding: '1px 5px' }}>
                        {q.class}
                      </span>
                    </td>

                    {/* Feedstock & Specification with Focus Tag */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isCurrentRef && (
                          <span className="chip chip-warn" style={{ fontSize: '11px', padding: '1px 5px', fontWeight: 700 }} title="Active reference mark for deal engines">
                            ★ MARK
                          </span>
                        )}
                        {isFocus && !isCurrentRef && (
                          <span className="chip chip-warn" style={{ fontSize: '11px', padding: '1px 5px', fontWeight: 700 }}>
                            ★ FOCUS
                          </span>
                        )}
                        <span style={{ fontWeight: isCurrentRef || isFocus ? 700 : 500 }}>
                          {q.feedstock}
                        </span>
                      </div>
                    </td>

                    {/* Vintage */}
                    <td style={{ textAlign: 'center' }} className="num">
                      {q.vintage}
                    </td>

                    {/* Certified */}
                    <td style={{ textAlign: 'center', fontSize: '12px' }} className="mut">
                      {q.certified}
                    </td>

                    {/* Subsidized */}
                    <td className="marks-col-subsidized" style={{ textAlign: 'center' }}>
                      <span className={`chip ${q.subsidized === 'Unsubsidised' ? 'chip-pos' : 'chip-neutral'}`} style={{ fontSize: '12px', padding: '1px 5px' }}>
                        {q.subsidized}
                      </span>
                    </td>

                    {/* CI Score */}
                    <td style={{ textAlign: 'center', fontWeight: 600 }} className="num">
                      {q.ciScore || '—'}
                    </td>

                    {/* BID Price (Editable) */}
                    <td>
                      <input
                        type="text"
                        value={q.bidPrice}
                        onChange={e => handleCellEdit(q.id, 'bidPrice', e.target.value)}
                        placeholder="—"
                        aria-label={`Bid price for ${q.country} ${q.feedstock}`}
                        className="input num"
                        style={{
                          width: '100%', minWidth: '108px',
                          textAlign: 'right',
                          minHeight: '26px',
                          padding: '2px 6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-control)',
                          backgroundColor: 'var(--color-bg)',
                        }}
                      />
                    </td>

                    {/* OFFER Price (Editable) */}
                    <td>
                      <input
                        type="text"
                        value={q.offerPrice}
                        onChange={e => handleCellEdit(q.id, 'offerPrice', e.target.value)}
                        placeholder="—"
                        aria-label={`Offer price for ${q.country} ${q.feedstock}`}
                        className="input num"
                        style={{
                          width: '100%', minWidth: '108px',
                          textAlign: 'right',
                          minHeight: '26px',
                          padding: '2px 6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-control)',
                          backgroundColor: 'var(--color-bg)',
                        }}
                      />
                    </td>

                    {/* BID Volume (Editable for tradeable broker rows; blank for reference rows) */}
                    <td>
                      {isReferenceOnly ? (
                        <div style={{ textAlign: 'right', color: 'var(--color-muted)', padding: '2px 6px' }}>—</div>
                      ) : (
                        <input
                          type="text"
                          value={q.bidVolume}
                          onChange={e => handleCellEdit(q.id, 'bidVolume', e.target.value)}
                          placeholder="—"
                          aria-label={`Bid volume for ${q.country} ${q.feedstock}`}
                          className="input num"
                          style={{
                            width: '100%', minWidth: '76px',
                            textAlign: 'right',
                            minHeight: '26px',
                            padding: '2px 6px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-control)',
                            backgroundColor: 'var(--color-bg)',
                          }}
                        />
                      )}
                    </td>

                    {/* OFFER Volume (Editable for tradeable broker rows; blank for reference rows) */}
                    <td>
                      {isReferenceOnly ? (
                        <div style={{ textAlign: 'right', color: 'var(--color-muted)', padding: '2px 6px' }}>—</div>
                      ) : (
                        <input
                          type="text"
                          value={q.offerVolume}
                          onChange={e => handleCellEdit(q.id, 'offerVolume', e.target.value)}
                          placeholder="—"
                          aria-label={`Offer volume for ${q.country} ${q.feedstock}`}
                          className="input num"
                          style={{
                            width: '100%', minWidth: '76px',
                            textAlign: 'right',
                            minHeight: '26px',
                            padding: '2px 6px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-control)',
                            backgroundColor: 'var(--color-bg)',
                          }}
                        />
                      )}
                    </td>

                    {/* Price Derived From (Explicit Data Source Citation) */}
                    <td className="marks-col-source">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`chip ${badgeClass}`} style={{ fontSize: '11px', padding: '1px 5px', flexShrink: 0 }}>
                          {badgeLabel}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={q.derivedFrom}>
                          {q.derivedFrom}
                        </span>
                      </div>
                    </td>

                    {/* Mark Reference Action */}
                    <td style={{ textAlign: 'center' }}>
                      {isCurrentRef ? (
                        <span className="chip chip-warn" style={{ fontSize: '11px', fontWeight: 700 }} title="Currently feeding deal engines">
                          ★ Ref
                        </span>
                      ) : marketId && q.provenanceTier === 'BROKER_RUN' && rowFeedsMarket(q, marketId) && rowHasPrice(q) ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '1px 6px', minHeight: '22px', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            dispatch({ type: 'SET_MARKET_REFERENCE_ROW', marketId, rowId: q.id });
                            showToast(`Set as ${marketId} reference mark`);
                          }}
                          title={`Set as reference mark for ${marketId}`}
                        >
                          Use as mark
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

          </>
        )}

        {/* Footer Notes */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            backgroundColor: 'var(--color-panel-header)',
            border: '1px solid var(--color-divider)',
            borderTop: 'none',
            borderRadius: '0 0 var(--radius-panel) var(--radius-panel)',
            fontSize: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ color: 'var(--color-muted)' }}>
            * Bids and offers are for certificates / quota premium only. Base natural gas index (TTF M+1{gasIndexPrice !== null && gasIndexPrice !== undefined ? `: €${gasIndexPrice.toFixed(2)}/MWh` : ''}) added on top for bundled physical delivery.
          </span>
          <span className="num" style={{ fontWeight: 600 }}>
            {filteredQuotes.length} quotes displayed ({quotes.length} total across Europe)
          </span>
        </div>
      </div>

      {isMobile && (
        <Sheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filters"
          subtitle={`${filteredQuotes.length} of ${quotes.length} quotes`}
          testId="marks-filters-sheet"
          footer={
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, minHeight: '44px' }}
                onClick={() => {
                  setBookFilter('ALL');
                  setSelectedCountryGroup('ALL');
                  setProvenanceFilter('ALL');
                  setSearchQuery('');
                  setFiltersOpen(false);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, minHeight: '44px' }}
                onClick={() => setFiltersOpen(false)}
              >
                Done
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: '6px' }}>Book</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${bookFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '38px', flex: 1 }}
                  onClick={() => setBookFilter('ALL')}
                >
                  All ({quotes.length})
                </button>
                <button
                  type="button"
                  className={`btn ${bookFilter === 'COMPLIANCE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '38px', flex: 1 }}
                  onClick={() => setBookFilter('COMPLIANCE')}
                >
                  Compliance
                </button>
                <button
                  type="button"
                  className={`btn ${bookFilter === 'VOLUNTARY' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '38px', flex: 1 }}
                  onClick={() => setBookFilter('VOLUNTARY')}
                >
                  Voluntary
                </button>
              </div>
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: '6px' }}>Source Provenance</div>
              <select
                value={provenanceFilter}
                onChange={e => setProvenanceFilter(e.target.value as any)}
                className="input"
                style={{ width: '100%', minHeight: '44px' }}
                aria-label="Filter quotes by data provenance tier"
              >
                <option value="ALL">All Sources ({quotes.length})</option>
                <option value="BROKER_RUN">📑 Bilateral Broker Runs ({provenanceCounts.BROKER_RUN})</option>
                <option value="WEB_INDEX">🌐 Research / Web Indexes ({provenanceCounts.WEB_INDEX})</option>
                <option value="STATUTORY_DIRECTIVE">⚖️ Statutory Directives ({provenanceCounts.STATUTORY_DIRECTIVE})</option>
                <option value="MODELLED_SIMULATED">🔬 Modelled Benchmarks ({provenanceCounts.MODELLED_SIMULATED})</option>
              </select>
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: '6px' }}>Hub / Country</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                {countryPills.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedCountryGroup(p.id)}
                    className={`btn ${selectedCountryGroup === p.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: '38px', fontSize: '12px' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Sheet>
      )}

      {isMobile && editingQuote && (
        <Sheet
          open={Boolean(editingQuote)}
          onClose={() => setEditingId(null)}
          title={`${editingQuote.country} ${editingQuote.class}`}
          subtitle={`${editingQuote.feedstock} · Vintage ${editingQuote.vintage}`}
          testId="marks-edit-sheet"
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              {(() => {
                const mId = resolveMarketForQuote(editingQuote);
                const isRef = mId && state.referenceRowIds?.[mId] === editingQuote.id;
                if (mId && editingQuote.provenanceTier === 'BROKER_RUN' && rowFeedsMarket(editingQuote, mId) && rowHasPrice(editingQuote) && !isRef) {
                  return (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, minHeight: '44px' }}
                      onClick={() => {
                        dispatch({ type: 'SET_MARKET_REFERENCE_ROW', marketId: mId, rowId: editingQuote.id });
                        showToast(`Set as ${mId} reference mark`);
                      }}
                    >
                      Use as mark
                    </button>
                  );
                }
                return null;
              })()}
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, minHeight: '44px' }}
                onClick={() => setEditingId(null)}
              >
                Done
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {editField('BID Price', 'bidPrice', editingQuote, 'Bid price')}
              {editField('OFFER Price', 'offerPrice', editingQuote, 'Offer price')}
            </div>
            {editingQuote.isTradeable && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {editField('BID Volume', 'bidVolume', editingQuote, 'Bid volume')}
                {editField('OFFER Volume', 'offerVolume', editingQuote, 'Offer volume')}
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              <span className="chip chip-info">{editingQuote.certified}</span>
              <span className={`chip ${editingQuote.subsidized === 'Unsubsidised' ? 'chip-pos' : 'chip-neutral'}`}>{editingQuote.subsidized}</span>
              <span className="chip chip-neutral">{editingQuote.ciScore || 'CI: —'}</span>
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }} className="mut">
              <strong>Source:</strong> {editingQuote.derivedFrom}
            </div>
          </div>
        </Sheet>
      )}

      {/* Date Edit Modal */}
      {isDateModalOpen && (
        <div
          className="scrim m-dialog-scrim"
          style={{ alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          role="dialog"
          aria-modal="true"
          aria-label="Edit broker run date"
          onClick={() => setIsDateModalOpen(false)}
        >
          <div
            className="panel m-dialog"
            style={{ width: 'min(420px, 100%)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '14px 18px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)' }}>
              <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Edit Broker Run Date</h5>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                Updates observedAt for quotes in the baseline broker run
              </div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="eyebrow">Run Received Date (ISO YYYY-MM-DD)</span>
                <input
                  type="date"
                  value={dateInputValue}
                  onChange={e => setDateInputValue(e.target.value)}
                  className="input"
                  style={{ minHeight: '38px', borderRadius: 'var(--radius-control)' }}
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsDateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (dateInputValue) {
                      dispatch({
                        type: 'SET_PRICING_RUN_DATE',
                        runId: state.pricingRunMeta?.runId || 'broker-run-2026-08-18',
                        receivedOn: dateInputValue,
                      });
                      setIsDateModalOpen(false);
                      showToast(`Broker run date updated to ${dateInputValue}`);
                    }
                  }}
                >
                  Save Date
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Paste Broker Run Modal */}
      <BrokerRunImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onCommitted={(count) => {
          showToast(`Successfully imported ${count} market quotes`);
        }}
      />
    </PageShell>
  );
}
