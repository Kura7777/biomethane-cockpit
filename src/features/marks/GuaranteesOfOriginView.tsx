import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';
import { parseTenorSortKey, sortQuotesChronologically } from './marksSort';
import { Leaf, Award, Globe, ArrowUpRight, Search } from 'lucide-react';

interface GuaranteesOfOriginViewProps {
  quotes: PricingBookEntry[];
  onCellEdit: (id: string, field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume', val: string) => void;
}

export function GuaranteesOfOriginView({ quotes, onCellEdit }: GuaranteesOfOriginViewProps) {
  const navigate = useNavigate();

  // Registry selection: 'ALL' | 'AIB' | 'DE' | 'NL' | 'FR' | 'UK' | 'DK'
  const [selectedRegistry, setSelectedRegistry] = useState<string>('ALL');
  const [feedstockFilter, setFeedstockFilter] = useState<'ALL' | 'WASTE' | 'CROP' | 'SEWAGE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only voluntary GO / RGGO quotes
  const goQuotes = useMemo(() => {
    return quotes.filter(q => {
      // Must be GO or RGGO voluntary class
      const isGo = q.productClass === 'GO_VOLUNTARY' || q.class === 'GO' || q.class === 'RGGO';
      if (!isGo) return false;

      // Registry / Country Filter
      if (selectedRegistry !== 'ALL') {
        if (selectedRegistry === 'AIB' && q.country !== 'AIB') return false;
        if (selectedRegistry === 'DE' && q.country !== 'DE') return false;
        if (selectedRegistry === 'NL' && q.country !== 'NL') return false;
        if (selectedRegistry === 'FR' && q.country !== 'FR') return false;
        if (selectedRegistry === 'UK' && q.country !== 'UK') return false;
        if (selectedRegistry === 'DK' && q.country !== 'DK') return false;
      }

      // Feedstock Filter
      if (feedstockFilter === 'WASTE' && !q.feedstock.toLowerCase().includes('waste') && !q.feedstock.toLowerCase().includes('manure')) return false;
      if (feedstockFilter === 'CROP' && !q.feedstock.toLowerCase().includes('crop') && !q.feedstock.toLowerCase().includes('maize')) return false;
      if (feedstockFilter === 'SEWAGE' && !q.feedstock.toLowerCase().includes('sewage') && !q.feedstock.toLowerCase().includes('sludge')) return false;

      // Text Search
      if (searchQuery) {
        const qLower = searchQuery.toLowerCase();
        return (
          q.country.toLowerCase().includes(qLower) ||
          q.feedstock.toLowerCase().includes(qLower) ||
          q.vintage.toLowerCase().includes(qLower) ||
          q.certified.toLowerCase().includes(qLower) ||
          (q.derivedFrom || '').toLowerCase().includes(qLower)
        );
      }

      return true;
    });
  }, [quotes, selectedRegistry, feedstockFilter, searchQuery]);

  // Sort strictly chronologically by delivery vintage/tenor
  const sortedGoQuotes = useMemo(() => {
    return sortQuotesChronologically(goQuotes, 'tenor', 'asc');
  }, [goQuotes]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalVolume = sortedGoQuotes.reduce((acc, q) => acc + (q.offerVolumeGWh || 0), 0);
    const prices = sortedGoQuotes.map(q => q.offerPriceNumeric).filter((p): p is number => p != null && p > 0);
    const avgOffer = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : '—';
    return { count: sortedGoQuotes.length, totalVolume, avgOffer };
  }, [sortedGoQuotes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          borderLeft: '4px solid #10b981',
          borderRadius: 'var(--radius-panel)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Leaf className="w-5 h-5 text-emerald-500" style={{ color: '#10b981', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              European Guarantees of Origin (GO Matrix &amp; Corporate Scope 1 Offtake)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              Standardized under EU RED III Art. 19 &amp; EN 16325. Quoted in uniform €/MWh for voluntary corporate decarbonization and GHG Protocol Scope 1 accounting.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
          <span className="chip chip-pos">Average Offer: €{stats.avgOffer}/MWh</span>
          <span className="chip chip-info">{stats.totalVolume} GWh Total Liquidity</span>
        </div>
      </div>

      {/* Filter and Hub Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Registry Hub Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)' }}>Registry:</span>
          {[
            { id: 'ALL', label: 'All Registries' },
            { id: 'AIB', label: '🇪🇺 AIB Hub' },
            { id: 'DE', label: '🇩🇪 dena' },
            { id: 'NL', label: '🇳🇱 VertiCer' },
            { id: 'FR', label: '🇫🇷 EEX' },
            { id: 'UK', label: '🇬🇧 GGCS' },
            { id: 'DK', label: '🇩🇰 Energinet' },
          ].map(r => (
            <button
              key={r.id}
              type="button"
              className={`btn ${selectedRegistry === r.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '3px 10px' }}
              onClick={() => setSelectedRegistry(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Feedstock and Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={feedstockFilter}
            onChange={e => setFeedstockFilter(e.target.value as any)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          >
            <option value="ALL">All Feedstocks</option>
            <option value="WASTE">Annex IX-A Waste / Residues</option>
            <option value="SEWAGE">Sewage Sludge</option>
            <option value="CROP">Energy Crops / Cereals</option>
          </select>

          <div style={{ position: 'relative', width: '200px' }}>
            <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search GO book..."
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

      {/* Main Table */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          borderRadius: 'var(--radius-panel)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '85px', textAlign: 'center' }}>Vintage</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Hub</th>
                <th style={{ width: '75px', textAlign: 'center' }}>Class</th>
                <th style={{ minWidth: '190px' }}>Feedstock Substrate</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Registry &amp; Standard</th>
                <th style={{ width: '90px', textAlign: 'center' }}>CI Score</th>
                <th style={{ width: '110px', textAlign: 'right' }}>BID Price</th>
                <th style={{ width: '110px', textAlign: 'right' }}>OFFER Price</th>
                <th style={{ width: '95px', textAlign: 'right' }}>BID Vol</th>
                <th style={{ width: '95px', textAlign: 'right' }}>OFFER Vol</th>
                <th style={{ minWidth: '160px' }}>Broker Source</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Trade</th>
              </tr>
            </thead>
            <tbody>
              {sortedGoQuotes.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-muted)' }}>
                    No Guarantees of Origin match the selected registry or feedstock filters.
                  </td>
                </tr>
              ) : (
                sortedGoQuotes.map(q => {
                  const isTradeable = q.isTradeable;
                  const unit = q.currency === 'GBP' ? '£/MWh' : '€/MWh';

                  return (
                    <tr key={q.id}>
                      {/* Vintage */}
                      <td style={{ textAlign: 'center', fontWeight: 700 }} className="num">
                        {q.vintage}
                      </td>

                      {/* Hub */}
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {q.country}
                      </td>

                      {/* Class */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="chip chip-info" style={{ fontSize: '11px', padding: '1px 5px' }}>
                          {q.class}
                        </span>
                      </td>

                      {/* Feedstock Substrate */}
                      <td>
                        <span style={{ fontWeight: 600 }}>{q.feedstock}</span>
                      </td>

                      {/* Registry & Standard */}
                      <td style={{ textAlign: 'center', fontSize: '11.5px' }} className="mut">
                        {q.certified}
                      </td>

                      {/* CI Score */}
                      <td style={{ textAlign: 'center', fontWeight: 600 }} className="num">
                        {q.ciScore || '—'}
                      </td>

                      {/* BID Price */}
                      <td>
                        <input
                          type="text"
                          value={q.bidPrice}
                          onChange={e => onCellEdit(q.id, 'bidPrice', e.target.value)}
                          placeholder="—"
                          className="input num"
                          style={{
                            width: '100%',
                            textAlign: 'right',
                            padding: '2px 6px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        />
                      </td>

                      {/* OFFER Price */}
                      <td>
                        <input
                          type="text"
                          value={q.offerPrice}
                          onChange={e => onCellEdit(q.id, 'offerPrice', e.target.value)}
                          placeholder="—"
                          className="input num"
                          style={{
                            width: '100%',
                            textAlign: 'right',
                            padding: '2px 6px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        />
                      </td>

                      {/* BID Vol */}
                      <td>
                        <input
                          type="text"
                          value={isTradeable ? q.bidVolume : '—'}
                          disabled={!isTradeable}
                          onChange={e => onCellEdit(q.id, 'bidVolume', e.target.value)}
                          placeholder="—"
                          className="input num"
                          style={{
                            width: '100%',
                            textAlign: 'right',
                            padding: '2px 6px',
                            fontSize: '12px',
                            opacity: isTradeable ? 1 : 0.5,
                          }}
                        />
                      </td>

                      {/* OFFER Vol */}
                      <td>
                        <input
                          type="text"
                          value={isTradeable ? q.offerVolume : '—'}
                          disabled={!isTradeable}
                          onChange={e => onCellEdit(q.id, 'offerVolume', e.target.value)}
                          placeholder="—"
                          className="input num"
                          style={{
                            width: '100%',
                            textAlign: 'right',
                            padding: '2px 6px',
                            fontSize: '12px',
                            opacity: isTradeable ? 1 : 0.5,
                          }}
                        />
                      </td>

                      {/* Broker Source */}
                      <td style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
                        {q.derivedFrom || q.provenanceTier}
                      </td>

                      {/* Trade Action */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '1px 6px', minHeight: '22px' }}
                          onClick={() => navigate(`/corporate?hub=${q.country}&vintage=${encodeURIComponent(q.vintage)}`)}
                          title="Open Corporate Order Pricer for this certificate"
                        >
                          Trade <ArrowUpRight className="w-3 h-3 ml-1" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
