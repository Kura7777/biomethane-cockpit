import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Copy, Check, X } from 'lucide-react';
import {
  CountryMeta,
  RouteFilter,
  SellCategory,
  classifyRoute,
  getPlainLanguageHow,
  FILTER_CONFIG,
  AUDIT_REF
} from '../mapConstants';
import { getTradePlaybook, getPlaybookDealUrl } from '../tradePlaybook';
import { RouteVerdictCard, posOpenId } from '../RouteVerdictCard';
import { CertificateRoute } from '../../../domain/registries/certificateRoutes';
import { ORIGIN_CAVEATS } from '../../../domain/registries/hubConnectivity';
import { BiomethanePlant } from '../../../domain/plants/types';

interface MapSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  originMeta: CountryMeta;
  filter: RouteFilter;
  setFilter: (f: RouteFilter) => void;
  certRoutes: CertificateRoute[];
  nameByIso: Record<string, string>;
  categoryCounts: Record<SellCategory, number>;
  activeLinkedPlant: BiomethanePlant | null;
  isMobile?: boolean;
}

export function MapSummaryContent({
  originMeta,
  filter,
  setFilter,
  certRoutes,
  nameByIso,
  activeLinkedPlant,
  onNavigateTrade,
}: {
  originMeta: CountryMeta;
  filter: RouteFilter;
  setFilter: (f: RouteFilter) => void;
  certRoutes: CertificateRoute[];
  nameByIso: Record<string, string>;
  activeLinkedPlant: BiomethanePlant | null;
  onNavigateTrade?: () => void;
}) {
  const navigate = useNavigate();
  const [summarySearch, setSummarySearch] = useState('');
  const [isCaveatOpen, setIsCaveatOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const originCaveat = ORIGIN_CAVEATS[originMeta.iso];

  const filteredCertRoutes = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    let list = certRoutes;
    if (q) {
      list = list.filter(r => {
        const name = (nameByIso[r.target] || r.target).toLowerCase();
        return name.includes(q) || r.target.toLowerCase().includes(q);
      });
    }
    return list;
  }, [certRoutes, summarySearch, nameByIso]);

  const summaryGroups = useMemo(() => {
    const sellNow: CertificateRoute[] = [];
    const checkFirst: CertificateRoute[] = [];
    const closed: CertificateRoute[] = [];
    const noData: CertificateRoute[] = [];

    filteredCertRoutes.forEach(r => {
      const cat = classifyRoute(r, filter);
      if (cat === 'SELL_NOW') sellNow.push(r);
      else if (cat === 'CHECK_FIRST') checkFirst.push(r);
      else if (cat === 'CLOSED') closed.push(r);
      else noData.push(r);
    });

    const sortFn = (a: CertificateRoute, b: CertificateRoute) => {
      const aName = nameByIso[a.target] || a.target;
      const bName = nameByIso[b.target] || b.target;
      return aName.localeCompare(bName);
    };

    return {
      sellNow: sellNow.sort(sortFn),
      checkFirst: checkFirst.sort(sortFn),
      closed: closed.sort(sortFn),
      noData: noData.sort(sortFn),
    };
  }, [filteredCertRoutes, filter, nameByIso]);

  const handleCopyList = async () => {
    const groups: Record<'SELL_NOW' | 'CHECK_FIRST' | 'CLOSED', string[]> = {
      SELL_NOW: [],
      CHECK_FIRST: [],
      CLOSED: [],
    };
    certRoutes.forEach(r => {
      const cat = classifyRoute(r, filter);
      if (cat === 'SELL_NOW' || cat === 'CHECK_FIRST' || cat === 'CLOSED') {
        const name = nameByIso[r.target] || r.target;
        const how = getPlainLanguageHow(r, cat);
        groups[cat].push(`- ${name}: ${how}`);
      }
    });

    const lines = [
      `Where can ${originMeta.name} biomethane be sold? (Filter: ${FILTER_CONFIG[filter].shortLabel})`,
      '',
      `Ready to trade (${groups.SELL_NOW.length}):`,
      ...(groups.SELL_NOW.length > 0 ? groups.SELL_NOW : ['- None']),
      '',
      `Review needed / workaround (${groups.CHECK_FIRST.length}):`,
      ...(groups.CHECK_FIRST.length > 0 ? groups.CHECK_FIRST : ['- None']),
      '',
      `Closed / domestic only (${groups.CLOSED.length}):`,
      ...(groups.CLOSED.length > 0 ? groups.CLOSED : ['- None']),
      '',
      'Route audit: 4 Oct 2026',
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const renderSummaryRow = (r: CertificateRoute, cat: SellCategory) => {
    const name = nameByIso[r.target] || r.target;
    const isExpanded = Boolean(expandedRows[r.target]);
    const how = getPlainLanguageHow(r, cat);
    const hasCond = r.conditions.length > 0 || Boolean(r.pos?.conditions);
    const oq = r.openQuestionId || posOpenId(r);
    const hasOq = cat === 'CHECK_FIRST' && Boolean(oq);

    const playbook = getTradePlaybook(originMeta.iso, r.target, r);
    return (
      <div key={r.target} className="map-route-row-item">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 6px', width: '100%', boxSizing: 'border-box' }}>
          <button
            type="button"
            className="map-route-row-btn"
            style={{ padding: '4px 0' }}
            onClick={() => setExpandedRows(prev => ({ ...prev, [r.target]: !prev[r.target] }))}
            aria-expanded={isExpanded}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 auto', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{name}</span>
              <span className={`chip ${playbook.chipClass}`} style={{ fontSize: '10px', padding: '1px 5px' }}>
                {playbook.badge}
              </span>
              <span className="mut" style={{ fontSize: '11px' }}>{how}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
              {hasCond && <span className="chip" style={{ fontSize: '10px', padding: '1px 5px' }}>conditions</span>}
              {hasOq && <span className="chip" style={{ fontSize: '10px', padding: '1px 5px' }}>✉ question</span>}
              {isExpanded ? <ChevronDown style={{ width: '15px', height: '15px' }} /> : <ChevronRight style={{ width: '15px', height: '15px' }} />}
            </div>
          </button>

          {playbook.isTradeable && (() => {
            const rowDealUrl = getPlaybookDealUrl(originMeta.iso, r.target, r, filter, activeLinkedPlant);
            return (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '11px', padding: '0 8px', height: '26px', minHeight: '26px', flex: '0 0 auto', whiteSpace: 'nowrap' }}
                onClick={e => {
                  e.stopPropagation();
                  if (!rowDealUrl) return;
                  if (onNavigateTrade) onNavigateTrade();
                  navigate(rowDealUrl);
                }}
                disabled={!rowDealUrl}
                title={rowDealUrl ? `Simulate ${originMeta.iso} ➔ ${r.target} in Trade Builder` : 'No tradeable market mapped for this route'}
              >
                Trade ➔
              </button>
            );
          })()}
        </div>

        {isExpanded && <RouteVerdictCard origin={r.origin} target={r.target} />}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {originCaveat && (
        <div style={{ marginBottom: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '4px 8px' }}
            onClick={() => setIsCaveatOpen(o => !o)}
            aria-expanded={isCaveatOpen}
          >
            ⓘ Notes on {originMeta.name} {isCaveatOpen ? '▴' : '▾'}
          </button>
          {isCaveatOpen && (
            <div
              style={{
                marginTop: '6px',
                padding: '10px 12px',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-control)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              {originCaveat.text}
            </div>
          )}
        </div>
      )}

      {/* Filter and search controls bar */}
      <div className="map-modal-controls-row" style={{ marginTop: 0, marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span className="eyebrow">Filter:</span>
          {(['ALL', 'GO', 'POS'] as const).map(f => (
            <button
              key={f}
              type="button"
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '12px' }}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {FILTER_CONFIG[f].shortLabel}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search destination..."
            value={summarySearch}
            onChange={e => setSummarySearch(e.target.value)}
            className="input"
            style={{ height: '30px', minHeight: '30px', fontSize: '12px', padding: '2px 8px', width: '180px' }}
            aria-label="Filter destinations by country name"
          />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ height: '30px', minHeight: '30px', fontSize: '12px', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            onClick={handleCopyList}
            title="Copy list to clipboard"
          >
            {copied ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
            {copied ? 'Copied' : 'Copy list'}
          </button>
        </div>
      </div>

      <div className="map-filter-banner" style={{ marginBottom: '12px' }}>
        <strong style={{ color: 'var(--color-text)' }}>{FILTER_CONFIG[filter].shortLabel}:</strong> {FILTER_CONFIG[filter].desc}
      </div>

      {/* Scrollable list of sections */}
      <div className="map-modal-body" style={{ padding: 0 }}>
        {/* Ready to trade section */}
        <div style={{ marginBottom: '16px' }}>
          <div className="eyebrow" style={{ padding: '6px 0', borderBottom: '2px solid var(--color-status-pass-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-pass-text)' }} />
            Ready to trade · {summaryGroups.sellNow.length}
          </div>
          {summaryGroups.sellNow.length > 0 ? (
            summaryGroups.sellNow.map(r => renderSummaryRow(r, 'SELL_NOW'))
          ) : (
            <div className="mut" style={{ fontSize: '12px', padding: '8px 10px' }}>No routes in this category.</div>
          )}
        </div>

        {/* Review needed section */}
        <div style={{ marginBottom: '16px' }}>
          <div className="eyebrow" style={{ padding: '6px 0', borderBottom: '2px solid var(--color-status-warn-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-warn-text)' }} />
            Review needed / workaround · {summaryGroups.checkFirst.length}
          </div>
          {summaryGroups.checkFirst.length > 0 ? (
            summaryGroups.checkFirst.map(r => renderSummaryRow(r, 'CHECK_FIRST'))
          ) : (
            <div className="mut" style={{ fontSize: '12px', padding: '8px 10px' }}>No routes in this category.</div>
          )}
        </div>

        {/* Closed section */}
        <div style={{ marginBottom: '16px' }}>
          <div className="eyebrow" style={{ padding: '6px 0', borderBottom: '2px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="map-status-dot" style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))' }} />
            Closed / domestic only · {summaryGroups.closed.length}
          </div>
          {summaryGroups.closed.length > 0 ? (
            summaryGroups.closed.map(r => renderSummaryRow(r, 'CLOSED'))
          ) : (
            <div className="mut" style={{ fontSize: '12px', padding: '8px 10px' }}>No routes in this category.</div>
          )}
        </div>

        {summaryGroups.noData.length > 0 && (
          <div className="mut" style={{ fontSize: '12px', padding: '10px 0' }}>
            Not researched: {summaryGroups.noData.map(r => nameByIso[r.target] || r.target).join(', ')}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="map-modal-footer" style={{ padding: '10px 0 0' }}>
        {AUDIT_REF}
      </div>
    </div>
  );
}

export function MapSummaryModal({
  isOpen,
  onClose,
  originMeta,
  filter,
  setFilter,
  certRoutes,
  nameByIso,
  categoryCounts,
  activeLinkedPlant,
}: MapSummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="map-route-summary-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-summary-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="map-route-summary-modal">
        <div className="map-modal-header">
          <div className="map-modal-title-row">
            <div>
              <h2 id="map-summary-title" className="map-modal-title">
                Commercial Trade Summary: {originMeta.name} ({originMeta.iso})
              </h2>
              <div className="map-summary-dots" style={{ margin: '4px 0 0' }}>
                <span className="map-summary-dot-item">
                  <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-pass-text)' }} />
                  Ready to trade <span className="num">{categoryCounts.SELL_NOW}</span>
                </span>
                <span className="map-summary-dot-item">
                  <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-warn-text)' }} />
                  Review needed <span className="num">{categoryCounts.CHECK_FIRST}</span>
                </span>
                <span className="map-summary-dot-item">
                  <span className="map-status-dot" style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))' }} />
                  Closed <span className="num">{categoryCounts.CLOSED}</span>
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '32px', height: '32px', padding: 0 }}
              onClick={onClose}
              aria-label="Close route summary"
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, padding: '16px 20px', overflowY: 'hidden', minHeight: 0 }}>
          <MapSummaryContent
            originMeta={originMeta}
            filter={filter}
            setFilter={setFilter}
            certRoutes={certRoutes}
            nameByIso={nameByIso}
            activeLinkedPlant={activeLinkedPlant}
            onNavigateTrade={onClose}
          />
        </div>
      </div>
    </div>
  );
}
