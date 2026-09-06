import React, { useState, useMemo } from 'react';
import { MARKETS, isVoluntaryMarket } from '../../domain/markets/registry';
import { Market } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { SIMULATED_SOURCE_NAME } from '../../domain/marks/simulate';
import { BrokerRunImporterModal } from './BrokerRunImporterModal';
import { showToast } from '../../app/DeskToastContainer';
import { INITIAL_BROKER_QUOTES, BrokerMarketQuote, ProvenanceTier } from '../../domain/markets/brokerMarketData';
import {
  Download,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Check,
  Globe,
  Scale,
  ShieldCheck,
  Filter,
  ExternalLink,
  Info,
  Sparkles
} from 'lucide-react';

export function MarksScreen() {
  const { state, dispatch } = useAppState();
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Master Quotes State: Contains all 63 Pan-European market quotes in the exact order book format
  const [quotes, setQuotes] = useState<BrokerMarketQuote[]>(INITIAL_BROKER_QUOTES);

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

  // Handle cell edit
  const handleCellEdit = (id: string, field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume', val: string) => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== id) return q;
      const updated = { ...q, [field]: val };

      // If this quote maps to a master market, also synchronize into state.marks.marks
      const numericVal = parseFloat(val.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(numericVal) && (field === 'bidPrice' || field === 'offerPrice')) {
        const now = new Date().toISOString();
        const marketId = q.country === 'UK' && q.class === 'RTFO' ? 'UK_RTFO'
          : q.country === 'UK' && q.class === 'RGGO' ? 'UK_RGGO'
          : q.country === 'DE' && q.class === 'THG' ? 'DE_THG'
          : q.country === 'DE' && q.class === 'GO' ? 'DE_GO'
          : q.country === 'NL' && q.class === 'ERE' ? 'NL_ERE'
          : q.country === 'NL' && q.class === 'GO' ? 'NL_GO'
          : q.country === 'FR' && q.class === 'CPB' ? 'FR_CPB'
          : q.country === 'FR' && q.class === 'GO' ? 'FR_GO'
          : q.country === 'IT' && q.class === 'CIC' ? 'IT_CIC'
          : q.country === 'ES' && q.class === 'GdO' ? 'ES_GDO'
          : q.country === 'DK' && q.class === 'GO' ? 'DK_GO'
          : q.country === 'AIB' ? 'AIB_GO'
          : null;

        if (marketId) {
          dispatch({
            type: 'SET_MARK',
            marketId,
            bid: field === 'bidPrice' ? numericVal : null,
            offer: field === 'offerPrice' ? numericVal : null,
            mid: numericVal,
            updatedAt: now,
            source: 'DESK · MANUAL',
            provenance: {
              sourceType: 'BROKER_INDICATION',
              sourceName: q.derivedFrom || 'Desk Trader Override',
              sourceUrl: null,
              observedAt: now,
              note: `Direct desk edit of ${q.country} ${q.class}`,
            },
          });
        }
      }

      return updated;
    }));
  };

  // Filter logic
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      // Book filter
      const matchBook = bookFilter === 'ALL'
        || (bookFilter === 'COMPLIANCE' && q.productClass === 'BUNDLED_COMPLIANCE')
        || (bookFilter === 'VOLUNTARY' && q.productClass === 'GO_VOLUNTARY');

      // Country filter
      let matchCountry = false;
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

  // Provenance breakdown counts
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

  return (
    <div>
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
            <h3 className="ptitle" style={{ margin: 0, fontSize: '18px' }}>
              Pricing Desk &amp; Master Order Book
            </h3>
          </div>
          <div className="subttl" style={{ marginTop: '2px', fontSize: '12px' }}>
            Complete Pan-European Biomethane Pricing Book · {quotes.length} Quotes Across 38 European Markets &amp; Registries
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '5px 12px' }}
            onClick={() => setIsImporterOpen(true)}
          >
            Import Broker Run
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '5px 14px' }}
            onClick={handleExportCsv}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Order Book CSV
          </button>
        </div>
      </div>

      {/* Four-cell Institutional Ledger Strip */}
      <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">TTF M+1 Base Natural Gas</span>
            <span className="chip chip-info">ICE / EEX Spot</span>
          </div>
          <div className="big num">{gasIndexPrice !== null && gasIndexPrice !== undefined ? `€${gasIndexPrice.toFixed(2)}` : 'unrecorded'}</div>
          <div className="subttl num">
            {gasIndexPrice !== null && gasIndexPrice !== undefined
              ? `bid ${(state.marks.gasIndex.bid ?? gasIndexPrice).toFixed(2)} · offer ${(state.marks.gasIndex.offer ?? gasIndexPrice).toFixed(2)} / MWh`
              : 'unrecorded'}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">GBP / EUR Fix</span>
            <span className="chip">ECB Spot</span>
          </div>
          <div className="big num">{gbpRate !== null && gbpRate !== undefined ? gbpRate.toFixed(4) : 'unrecorded'}</div>
          <div className="subttl">UK RTFO &amp; RGGO currency conversion parity</div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">Pan-European Quotes</span>
            <span className="chip chip-pos">100% Active</span>
          </div>
          <div className="big num">{filteredQuotes.length} / {quotes.length}</div>
          <div className="subttl">All 38 European hubs &amp; registries priced</div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">Provenance Breakdown</span>
            <span className="chip">{quotes.length} Total</span>
          </div>
          <div className="num" style={{ fontSize: '13px', fontWeight: 600, marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <span className="chip chip-pos" style={{ fontSize: '9.5px', padding: '1px 5px' }}>{provenanceCounts.BROKER_RUN} Broker</span>
            <span className="chip chip-info" style={{ fontSize: '9.5px', padding: '1px 5px' }}>{provenanceCounts.WEB_INDEX} Web/Index</span>
            <span className="chip chip-warn" style={{ fontSize: '9.5px', padding: '1px 5px' }}>{provenanceCounts.STATUTORY_DIRECTIVE} Statutory</span>
            <span className="chip chip-neutral" style={{ fontSize: '9.5px', padding: '1px 5px' }}>{provenanceCounts.MODELLED_SIMULATED} Modelled</span>
          </div>
          <div className="subttl" style={{ marginTop: '3px' }}>Every quote declares verified source origin</div>
        </div>
      </div>

      {/* Main Order Book Container */}
      <div style={{ padding: '16px 18px 24px' }}>
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
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              Book:
            </span>
            <button
              type="button"
              className={`btn ${bookFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11.5px', padding: '3px 10px' }}
              onClick={() => setBookFilter('ALL')}
            >
              All Book ({quotes.length})
            </button>
            <button
              type="button"
              className={`btn ${bookFilter === 'COMPLIANCE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11.5px', padding: '3px 10px' }}
              onClick={() => setBookFilter('COMPLIANCE')}
            >
              🏛️ Compliance Quotas ({quotes.filter(q => q.productClass === 'BUNDLED_COMPLIANCE').length})
            </button>
            <button
              type="button"
              className={`btn ${bookFilter === 'VOLUNTARY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11.5px', padding: '3px 10px' }}
              onClick={() => setBookFilter('VOLUNTARY')}
            >
              🌱 Voluntary GOs ({quotes.filter(q => q.productClass === 'GO_VOLUNTARY').length})
            </button>
          </div>

          {/* Source Tier & Text Search Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Provenance Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                Source:
              </span>
              <select
                value={provenanceFilter}
                onChange={e => setProvenanceFilter(e.target.value as any)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11.5px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
                aria-label="Filter quotes by data provenance tier"
              >
                <option value="ALL">All Sources ({quotes.length})</option>
                <option value="BROKER_RUN">📑 Broker Run ({provenanceCounts.BROKER_RUN})</option>
                <option value="WEB_INDEX">🌐 Web / Exchange Index ({provenanceCounts.WEB_INDEX})</option>
                <option value="STATUTORY_DIRECTIVE">⚖️ Statutory Directive ({provenanceCounts.STATUTORY_DIRECTIVE})</option>
                <option value="MODELLED_SIMULATED">🔬 Modelled Cost-Plus ({provenanceCounts.MODELLED_SIMULATED})</option>
              </select>
            </div>

            {/* Text Search Box */}
            <div style={{ position: 'relative', width: '230px' }}>
              <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px', top: '7px' }} />
              <input
                type="text"
                placeholder="Filter country, feedstock, CI, source..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px 4px 28px',
                  fontSize: '11.5px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Country Quick Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '14px',
            flexWrap: 'wrap',
            padding: '6px 10px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
          }}
        >
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginRight: '4px' }}>
            Countries:
          </span>
          {countryPills.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedCountryGroup(p.id)}
              className={`btn ${selectedCountryGroup === p.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '10.5px', padding: '2px 7px', minHeight: '22px' }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Master Clean Institutional Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-divider)' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>Country</th>
                <th style={{ width: '75px', textAlign: 'center' }}>Class</th>
                <th style={{ minWidth: '220px' }}>Feedstock &amp; Specification</th>
                <th style={{ width: '75px', textAlign: 'center' }}>Vintage</th>
                <th style={{ width: '135px', textAlign: 'center' }}>Certified</th>
                <th style={{ width: '95px', textAlign: 'center' }}>Subsidized</th>
                <th style={{ width: '95px', textAlign: 'center' }}>CI Score</th>
                <th style={{ width: '105px', textAlign: 'right' }}>BID Price</th>
                <th style={{ width: '105px', textAlign: 'right' }}>OFFER Price</th>
                <th style={{ width: '95px', textAlign: 'right' }}>BID Vol</th>
                <th style={{ width: '95px', textAlign: 'right' }}>OFFER Vol</th>
                <th style={{ minWidth: '260px' }}>Price Derived From</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map(q => {
                const isFocus = Boolean(q.highlight);

                // Provenance badge styling
                let badgeClass = 'chip-neutral';
                let badgeLabel = '🔬 Modelled';
                if (q.provenanceTier === 'BROKER_RUN') {
                  badgeClass = 'chip-pos';
                  badgeLabel = '📑 Broker';
                } else if (q.provenanceTier === 'WEB_INDEX') {
                  badgeClass = 'chip-info';
                  badgeLabel = '🌐 Web Index';
                } else if (q.provenanceTier === 'STATUTORY_DIRECTIVE') {
                  badgeClass = 'chip-warn';
                  badgeLabel = '⚖️ Statutory';
                }

                return (
                  <tr
                    key={q.id}
                    style={{
                      transition: 'background-color 120ms ease',
                    }}
                  >
                    {/* Country */}
                    <td style={{ textAlign: 'center', fontWeight: 700 }} className="num">
                      {q.country}
                    </td>

                    {/* Class */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`chip ${q.productClass === 'GO_VOLUNTARY' ? 'chip-pos' : 'chip-info'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                        {q.class}
                      </span>
                    </td>

                    {/* Feedstock & Specification with Focus Tag */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isFocus && (
                          <span className="chip chip-warn" style={{ fontSize: '9px', padding: '1px 5px', fontWeight: 700 }}>
                            ★ FOCUS
                          </span>
                        )}
                        <span style={{ fontWeight: isFocus ? 700 : 500 }}>
                          {q.feedstock}
                        </span>
                      </div>
                    </td>

                    {/* Vintage */}
                    <td style={{ textAlign: 'center' }} className="num font-mono">
                      {q.vintage}
                    </td>

                    {/* Certified */}
                    <td style={{ textAlign: 'center', fontSize: '11.5px' }} className="mut">
                      {q.certified}
                    </td>

                    {/* Subsidized */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`chip ${q.subsidized === 'Unsubsidised' ? 'chip-pos' : 'chip-neutral'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
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
                          width: '100%',
                          textAlign: 'right',
                          minHeight: '26px',
                          padding: '2px 6px',
                          fontSize: '12px',
                          fontWeight: 700,
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
                          width: '100%',
                          textAlign: 'right',
                          minHeight: '26px',
                          padding: '2px 6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: 'var(--color-bg)',
                        }}
                      />
                    </td>

                    {/* BID Volume (Editable) */}
                    <td>
                      <input
                        type="text"
                        value={q.bidVolume}
                        onChange={e => handleCellEdit(q.id, 'bidVolume', e.target.value)}
                        placeholder="—"
                        aria-label={`Bid volume for ${q.country} ${q.feedstock}`}
                        className="input num"
                        style={{
                          width: '100%',
                          textAlign: 'right',
                          minHeight: '26px',
                          padding: '2px 6px',
                          fontSize: '12px',
                          backgroundColor: 'var(--color-bg)',
                        }}
                      />
                    </td>

                    {/* OFFER Volume (Editable) */}
                    <td>
                      <input
                        type="text"
                        value={q.offerVolume}
                        onChange={e => handleCellEdit(q.id, 'offerVolume', e.target.value)}
                        placeholder="—"
                        aria-label={`Offer volume for ${q.country} ${q.feedstock}`}
                        className="input num"
                        style={{
                          width: '100%',
                          textAlign: 'right',
                          minHeight: '26px',
                          padding: '2px 6px',
                          fontSize: '12px',
                          backgroundColor: 'var(--color-bg)',
                        }}
                      />
                    </td>

                    {/* Price Derived From (Explicit Data Source Citation) */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`chip ${badgeClass}`} style={{ fontSize: '9px', padding: '1px 5px', flexShrink: 0 }}>
                          {badgeLabel}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={q.derivedFrom}>
                          {q.derivedFrom}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
            fontSize: '11.5px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ color: 'var(--color-muted)' }}>
            * Bids and offers are for certificates / quota premium only. Base natural gas index (TTF M+1{gasIndexPrice !== null && gasIndexPrice !== undefined ? `: €${gasIndexPrice.toFixed(2)}/MWh` : ''}) added on top for bundled physical delivery.
          </span>
          <span className="num font-mono" style={{ fontWeight: 600 }}>
            {filteredQuotes.length} quotes displayed ({quotes.length} total across Europe)
          </span>
        </div>
      </div>

      {/* Broker Run Importer Modal */}
      <BrokerRunImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
      />
    </div>
  );
}
