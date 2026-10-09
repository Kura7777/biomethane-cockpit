import React from 'react';
import { ExternalLink } from 'lucide-react';
import {
  CountryMeta,
  MapView,
  AcceptForeignStatus,
  SellCategory,
  ACCEPT_FOREIGN_CONFIG
} from '../mapConstants';
import { TradePlaybookDetails } from '../tradePlaybook';
import { getRegistryByCountry } from '../../../domain/registries/registryDirectory';
import { POS_SCHEMES } from '../../../domain/routes/routeMatrix.generated';
import { getPosRoute } from '../../../domain/routes';
import { BiomethanePlant } from '../../../domain/plants/types';

interface MapCountryRailProps {
  origin: string;
  target: string;
  originMeta: CountryMeta;
  targetMeta: CountryMeta;
  selectedMeta: CountryMeta;
  countryAcceptsForeign: Record<string, { status: AcceptForeignStatus; schemeName?: string }>;
  view: MapView;
  currentPlaybook: TradePlaybookDetails;
  categoryCounts: Record<SellCategory, number>;
  tradeableBreakdown: { both: number; certOnly: number; posOnly: number };
  topRoutes: { iso: string; name: string; badge: string }[];
  activeLinkedPlant: BiomethanePlant | null;
  currentTradeTarget: unknown;
  corridorCalculation: {
    modes: {
      virtualSwap: { totalCostEurMwh: number | null; regulatoryFeasibility: string };
      physicalPipeline: { totalCostEurMwh: number | null };
      bioLng: { totalCostEurMwh: number | null };
    };
  };
  setOriginFromMenu: (c: string) => void;
  setTargetFromMenu: (c: string) => void;
  setSelectedCountryName: (c: string) => void;
  setTarget: (c: string) => void;
  setIsSummaryOpen: (open: boolean) => void;
  handleSimulateTrade: () => void;
}

export function MapCountryRailBody({
  origin,
  target,
  originMeta,
  targetMeta,
  selectedMeta,
  countryAcceptsForeign,
  view,
  currentPlaybook,
  categoryCounts,
  tradeableBreakdown,
  topRoutes,
  activeLinkedPlant,
  currentTradeTarget,
  corridorCalculation,
  setOriginFromMenu,
  setTargetFromMenu,
  setSelectedCountryName,
  setTarget,
  setIsSummaryOpen,
  handleSimulateTrade,
}: MapCountryRailProps) {
  const playbookCard = (
    <div className="map-playbook-card" data-testid="trade-playbook-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <span className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>Trade Execution Playbook</span>
        <span className={`chip ${currentPlaybook.chipClass}`} style={{ fontSize: '11px', fontWeight: 700 }}>
          {currentPlaybook.badge}
        </span>
      </div>

      <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px', lineHeight: 1.3 }}>
        {originMeta.iso} ➔ {targetMeta.iso}: {currentPlaybook.structureTitle}
      </div>

      <div style={{ fontSize: '12px', lineHeight: 1.45, color: 'var(--color-text)', marginBottom: '10px' }}>
        {currentPlaybook.structureDesc}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)', marginBottom: '12px' }}>
        <div>
          <div className="eyebrow" style={{ fontSize: '10px', marginBottom: '2px' }}>Statutory Scheme &amp; Destination</div>
          <div style={{ fontWeight: 700, fontSize: '12px' }}>{currentPlaybook.schemeTitle}</div>
          <div className="mut" style={{ fontSize: '11px', marginTop: '1px', lineHeight: 1.4 }}>{currentPlaybook.schemeDesc}</div>
        </div>
        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '6px' }}>
          <div className="eyebrow" style={{ fontSize: '10px', marginBottom: '2px' }}>How to Execute</div>
          <div style={{ fontWeight: 700, fontSize: '12px' }}>{currentPlaybook.executionTitle}</div>
          <div className="mut" style={{ fontSize: '11px', marginTop: '1px', lineHeight: 1.4 }}>{currentPlaybook.executionDesc}</div>
        </div>
      </div>

      <div className="mut" style={{ fontSize: '11px', marginBottom: '6px' }}>
        {activeLinkedPlant
          ? `Sourced from ${activeLinkedPlant.name}`
          : 'Feedstock: manure (default — choose in Trade Builder)'}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ fontSize: '13px', fontWeight: 700, padding: '8px 12px' }}
        onClick={handleSimulateTrade}
        disabled={!currentTradeTarget}
        title={!currentTradeTarget ? 'No tradeable market mapped for this route' : undefined}
      >
        Simulate {originMeta.iso} ➔ {targetMeta.iso} in Trade Builder ➔
      </button>
    </div>
  );

  const summaryCard = (
    <div className="map-summary-card" data-testid="map-summary-card">
      <div className="eyebrow" style={{ fontWeight: 800 }}>
        {originMeta.name.toUpperCase()} · {originMeta.plants} plants · {originMeta.twh} TWh
      </div>
      <div className="map-summary-dots">
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

      {tradeableBreakdown.both + tradeableBreakdown.certOnly + tradeableBreakdown.posOnly > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {tradeableBreakdown.both > 0 && (
            <span className="chip chip-pass" style={{ fontSize: '11px', padding: '1px 6px' }}>
              {tradeableBreakdown.both} Dual Option (GO + PoS)
            </span>
          )}
          {tradeableBreakdown.certOnly > 0 && (
            <span className="chip chip-pass" style={{ fontSize: '11px', padding: '1px 6px' }}>
              {tradeableBreakdown.certOnly} Certificates Only
            </span>
          )}
          {tradeableBreakdown.posOnly > 0 && (
            <span className="chip chip-pass" style={{ fontSize: '11px', padding: '1px 6px' }}>
              {tradeableBreakdown.posOnly} Compliance Quota Only
            </span>
          )}
        </div>
      )}

      {topRoutes.length > 0 && (
        <div className="mut" style={{ fontSize: '12px', lineHeight: 1.45, marginBottom: '12px' }}>
          <strong>Top routes: </strong>
          {topRoutes.map((tr, idx) => (
            <span key={tr.iso}>
              {idx > 0 && ' · '}
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  font: 'inherit',
                }}
                onClick={() => {
                  setSelectedCountryName(tr.name);
                  setTarget(tr.name);
                }}
                title={`Inspect ${originMeta.iso} ➔ ${tr.iso}`}
              >
                {tr.name} ({tr.badge})
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-block"
        style={{ fontSize: '13px', fontWeight: 700, padding: '7px 12px' }}
        onClick={() => setIsSummaryOpen(true)}
        data-testid="open-route-summary-btn"
      >
        Open full trade summary ⤢
      </button>
    </div>
  );

  return (
    <>
      <div style={{ padding: '16px 18px', borderBottom: '2px solid var(--color-divider)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <span className="eyebrow">Jurisdiction</span>
          {(() => {
            const best = countryAcceptsForeign[selectedMeta.iso]?.status || 'NO_SCHEME';
            const cfg = ACCEPT_FOREIGN_CONFIG[best];
            return (
              <span className={`chip ${cfg.chipClass}`} style={{ fontSize: '11px', padding: '1px 6px' }}>
                {best === 'NO_SCHEME' ? 'No scheme' : `Imports: ${best}`}
              </span>
            );
          })()}
        </div>
        <h4 style={{ margin: '6px 0 2px', fontSize: '20px', fontWeight: 800 }}>{selectedMeta.name}</h4>
        <div style={{ fontSize: '12px' }} className="mut">
          {selectedMeta.legal}
        </div>
        {(() => {
          const reg = getRegistryByCountry(selectedMeta.iso);
          if (!reg) return null;
          return (
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              <span className="mut">Registry: </span>
              <a
                href={`#/registries?country=${selectedMeta.iso}`}
                style={{ color: 'var(--color-primary, #10b981)', textDecoration: 'underline', fontWeight: 600 }}
              >
                {reg.registryName} ({reg.operator})
              </a>
            </div>
          );
        })()}

        {/* Prominent One-Click Assignment Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
          <button
            type="button"
            className={`btn ${origin === selectedMeta.name ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 8px' }}
            onClick={() => setOriginFromMenu(selectedMeta.name)}
          >
            {origin === selectedMeta.name ? '✓ Origin (Active)' : 'Set as Origin'}
          </button>
          <button
            type="button"
            className={`btn ${target === selectedMeta.name ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 8px' }}
            onClick={() => setTargetFromMenu(selectedMeta.name)}
          >
            {target === selectedMeta.name ? '✓ Target (Active)' : 'Set as Target'}
          </button>
        </div>
      </div>

      {view === 'SELL' && (
        originMeta.iso !== targetMeta.iso ? (
          <>
            {playbookCard}
            {summaryCard}
          </>
        ) : (
          summaryCard
        )
      )}

      {/* Stat Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          backgroundColor: 'var(--color-divider)',
        }}
      >
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 14px' }}>
          <div className="eyebrow">Active plants</div>
          <div className="num" style={{ fontSize: '18px', fontWeight: 800 }}>{selectedMeta.plants}</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 14px' }}>
          <div className="eyebrow">Production · TWh/yr</div>
          <div className="num" style={{ fontSize: '18px', fontWeight: 800 }}>{selectedMeta.twh} TWh</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 14px' }}>
          <div className="eyebrow">Avg plant size</div>
          <div className="num" style={{ fontSize: '18px', fontWeight: 800 }}>
            {((selectedMeta.twh * 1000) / Math.max(1, selectedMeta.plants)).toFixed(1)} GWh
          </div>
        </div>
      </div>
      <div style={{ padding: '6px 16px 8px', fontSize: '11px', backgroundColor: 'var(--color-surface)' }} className="mut">
        Desk estimates — source not yet verified
      </div>

      {/* Delivery Options */}
      <div
        style={{
          padding: '14px 18px',
          borderTop: '1px solid var(--color-divider)',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          Delivery options · {originMeta.iso} → {selectedMeta.iso}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
              <span>A · Virtual UDB swap</span>
              <span className="num" style={{ color: corridorCalculation.modes.virtualSwap.totalCostEurMwh !== null ? 'var(--color-text)' : 'var(--color-accent-700)' }}>
                {corridorCalculation.modes.virtualSwap.totalCostEurMwh !== null
                  ? `€${corridorCalculation.modes.virtualSwap.totalCostEurMwh.toFixed(2)}`
                  : 'Unverified'}
              </span>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} className="mut">
              <span className="chip chip-info" style={{ fontSize: '10px' }}>Desk estimate</span>
              {corridorCalculation.modes.virtualSwap.regulatoryFeasibility === 'CONTESTED'
                ? 'Recommended · contested in some member states'
                : 'Single mass balance zone transfer'}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
              <span>B · Continuous grid path</span>
              <span className="num" style={{ color: corridorCalculation.modes.physicalPipeline.totalCostEurMwh !== null ? 'var(--color-text)' : 'var(--color-accent-700)' }}>
                {corridorCalculation.modes.physicalPipeline.totalCostEurMwh !== null
                  ? `€${corridorCalculation.modes.physicalPipeline.totalCostEurMwh.toFixed(2)}`
                  : 'Unverified'}
              </span>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} className="mut">
              <span className="chip chip-info" style={{ fontSize: '10px' }}>Desk estimate (partial)</span>
              {(() => {
                const selPosRoute = getPosRoute(originMeta.iso, selectedMeta.iso);
                const selPossible = (selPosRoute.schemes || []).filter(s => s.status === 'POSSIBLE');
                const reqBk = selPossible.some(s => /capacit(y|ies)|book|nominat/i.test(`${s.conditions || ''} ${s.reason || ''}`));
                const bkName = selPossible.find(s => /capacit(y|ies)|book|nominat/i.test(`${s.conditions || ''} ${s.reason || ''}`))?.schemeName;
                return reqBk
                  ? `Multi-zone transit · capacity booking required by ${bkName || 'scheme'}`
                  : 'Interconnected grid path · physical capacity booking only if required';
              })()}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
              <span>C · Physical bio-LNG</span>
              <span className="num" style={{ color: corridorCalculation.modes.bioLng.totalCostEurMwh !== null ? 'var(--color-text)' : 'var(--color-accent-700)' }}>
                {corridorCalculation.modes.bioLng.totalCostEurMwh !== null
                  ? `€${corridorCalculation.modes.bioLng.totalCostEurMwh.toFixed(2)}`
                  : 'Unverified'}
              </span>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} className="mut">
              <span className="chip chip-info" style={{ fontSize: '10px' }}>Desk estimate</span>
              Liquefaction leg unverified — never summed around a null tariff
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          Audited compliance schemes · {selectedMeta.name} ({selectedMeta.iso})
        </div>
        {(() => {
          const countrySchemes = Object.values(POS_SCHEMES).filter(s => s.country === selectedMeta.iso);
          if (countrySchemes.length === 0) {
            return (
              <p style={{ fontSize: '12px', lineHeight: 1.55, margin: 0 }} className="mut">
                No scheme on record.
              </p>
            );
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {countrySchemes.map(s => {
                const cfg = ACCEPT_FOREIGN_CONFIG[s.acceptsForeign];
                return (
                  <div key={s.id} style={{ fontSize: '12px', lineHeight: 1.45, paddingBottom: '10px', borderBottom: '1px solid var(--color-divider)' }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span>{s.name}</span>
                      <span className={`chip ${cfg.chipClass}`} style={{ fontSize: '10px', padding: '1px 6px' }} title={cfg.label}>
                        {s.acceptsForeign}
                      </span>
                    </div>
                    {s.legalBasis && (
                      <div className="mut" style={{ fontSize: '11px', marginTop: '3px' }}>
                        <strong>Basis:</strong> {s.legalBasis}
                      </div>
                    )}
                    {s.conditions && s.conditions !== 'None' && (
                      <div style={{ fontSize: '11px', marginTop: '3px' }}>
                        <strong>Conditions:</strong> {s.conditions}
                      </div>
                    )}
                    {s.reason && (
                      <div className="mut" style={{ fontSize: '11px', marginTop: '3px' }}>
                        <strong>Reason:</strong> {s.reason}
                      </div>
                    )}
                    {s.sources && s.sources.length > 0 && (
                      <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span className="eyebrow" style={{ fontSize: '10px' }}>Sources:</span>
                        {s.sources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-primary, #10b981)',
                              textDecoration: 'underline',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              overflowWrap: 'anywhere',
                            }}
                            title={src.quote || src.claim}
                          >
                            <span>{src.claim}</span>
                            <ExternalLink size={10} style={{ flexShrink: 0 }} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </>
  );
}

export function MapCountryRailButtons({
  currentTradeTarget,
  handleSimulateTrade,
  setIsLogisticsOpen,
}: {
  currentTradeTarget: unknown;
  handleSimulateTrade: () => void;
  setIsLogisticsOpen: (open: boolean) => void;
}) {
  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ marginTop: 0 }}
        onClick={handleSimulateTrade}
        disabled={!currentTradeTarget}
        title={!currentTradeTarget ? 'No tradeable market mapped for this route' : undefined}
      >
        Simulate in trade builder
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        style={{ marginTop: 0 }}
        onClick={() => setIsLogisticsOpen(true)}
      >
        Open delivery playbook
      </button>
    </>
  );
}
