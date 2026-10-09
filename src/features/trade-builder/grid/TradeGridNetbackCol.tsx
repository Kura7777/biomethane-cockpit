import { Market } from '../../../domain/markets/types';
import { TradeAssessment } from '../../../domain/trade/types';
import { NetbackResult } from '../../../domain/netback/types';
import { markSideWarning } from '../../../domain/netback/sideFallback';
import { AssumptionsStrip } from '../../../shared/components/AssumptionsStrip';
import { DocumentTab } from '../LegalPackageModal';
import { WaterfallRow } from '../steps/TradeEconomicsStep';
import { RISK_SUITE_ASSUMPTIONS, FEEDSTOCKS } from '../options';
import { DealParams } from '../../../domain/trade/dealParams';
import { BiomethanePlant } from '../../../domain/plants/types';
import { GgeBreakdown } from '../../../domain/netback/gge';
import { GgeValueLine } from '../GgeValueLine';

interface TradeGridNetbackColProps {
  netback: NetbackResult;
  netNetbackVal: number;
  currentSide: string;
  selectedMarket: Market;
  waterfallRows: WaterfallRow[];
  waterfallMax: number;
  volumeMwh: number;
  grossTotal: number;
  deskMarginEurMwh: string;
  annualPnl: number;
  origin: string;
  currentTradeAssessment: TradeAssessment;
  handleSaveDossier: () => void;
  justSavedId: string | null;
  handleOpenDocReview: (tab: DocumentTab) => void;
  handleExportPdf: () => void;
  handleExportTermSheetPdf: () => void;
  setIsLogisticsOpen: (open: boolean) => void;
  onViewInBlotter: () => void;
  linkedPlant: BiomethanePlant | null | undefined;
  deal: Partial<DealParams>;
  marketId: string;
  feedstockKey: string;
  ci: number;
  molVal: number;
  certVal: number;
  gge?: GgeBreakdown | null;
}

export function TradeGridNetbackCol({
  netback,
  netNetbackVal,
  currentSide,
  selectedMarket,
  waterfallRows,
  waterfallMax,
  volumeMwh,
  grossTotal,
  deskMarginEurMwh,
  annualPnl,
  origin,
  currentTradeAssessment,
  handleSaveDossier,
  justSavedId,
  handleOpenDocReview,
  handleExportPdf,
  handleExportTermSheetPdf,
  setIsLogisticsOpen,
  onViewInBlotter,
  linkedPlant,
  deal,
  marketId,
  feedstockKey,
  ci,
  molVal,
  certVal,
  gge,
}: TradeGridNetbackColProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '13px 18px',
          borderBottom: '2px solid var(--color-divider)',
        }}
      >
        <span
          className="num"
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontSize: '12px',
            fontWeight: 800,
          }}
        >
          3
        </span>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
          Netback &amp; dossier
        </h4>
      </div>

      {/* Hero Figure */}
      <div style={{ padding: '18px', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="eyebrow">Net netback</div>
        <div
          className="num"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '52px',
            lineHeight: 1,
            letterSpacing: '-0.035em',
            margin: '6px 0 4px',
          }}
        >
          {netNetbackVal >= 0 ? `+€${netNetbackVal.toFixed(2)}` : `−€${Math.abs(netNetbackVal).toFixed(2)}`}
        </div>
        <div style={{ fontSize: '12px' }} className="mut">
          per MWh · {currentSide} · {selectedMarket.unitLabel} unit of account
        </div>
        {markSideWarning(netback.sideRequested, netback.sideUsed) && (
          <div
            data-testid="netback-side-warning"
            style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: 'color-mix(in srgb, var(--color-amber-500) 15%, transparent)', border: '1px solid var(--color-amber-500)', fontSize: '12px', color: 'var(--color-amber-400)', lineHeight: 1.4 }}
          >
            ⚠️ {markSideWarning(netback.sideRequested, netback.sideUsed)}
          </div>
        )}
        {netback.clearingPriceWarning && (
          <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: 'color-mix(in srgb, var(--color-amber-500) 15%, transparent)', border: '1px solid var(--color-amber-500)', fontSize: '12px', color: 'var(--color-amber-400)', lineHeight: 1.4 }}>
            ⚠️ {netback.clearingPriceWarning}
          </div>
        )}
      </div>

      {/* NL GGE: the green-gas value behind the certificate leg */}
      {gge && (
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--color-divider)' }}>
          <div className="eyebrow" style={{ marginBottom: '6px' }}>GGE value</div>
          <GgeValueLine
            gge={gge}
            valueEurPerMwh={netback.certificateValue?.valueEurPerMWh ?? null}
            costLines={netback.routeCostLines ?? []}
            variant="grid"
          />
        </div>
      )}

      {/* Waterfall */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="eyebrow" style={{ marginBottom: '10px' }}>Waterfall</div>
        {waterfallRows.map((w, wIdx) => {
          const barPct = Math.min(100, (w.num / waterfallMax) * 100);
          return (
            <div
              key={wIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: '132px minmax(0, 1fr) 78px',
                gap: '10px',
                alignItems: 'center',
                padding: '5px 0',
              }}
            >
              <span style={{ fontSize: '12px' }} className="mut">{w.label}</span>
              <div style={{ position: 'relative', height: '14px', backgroundColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    bottom: '2px',
                    left: 0,
                    width: `${barPct}%`,
                    backgroundColor: w.kind === 'sub'
                      ? 'var(--color-neutral-400)'
                      : w.kind === 'net'
                      ? 'var(--color-accent)'
                      : w.kind === 'margin'
                      ? 'var(--color-emerald-500, #10b981)'
                      : 'var(--color-text)',
                  }}
                />
              </div>
              <span className="num" style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>
                {w.val}
              </span>
            </div>
          );
        })}
      </div>

      {/* 2x2 Metric Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1px',
          backgroundColor: 'var(--color-divider)',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
          <div className="eyebrow">Volume</div>
          <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>{volumeMwh.toLocaleString()} MWh</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
          <div className="eyebrow">Gross value</div>
          <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>€{grossTotal.toLocaleString()}</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
          <div className="eyebrow">Desk margin</div>
          <div className="num" style={{ fontSize: '19px', fontWeight: 800, color: (netback.deskMargin ?? 0) < 0 ? 'var(--color-pnl-neg)' : 'var(--color-pnl-pos)' }}>
            {netback.deskMargin !== null ? `€${deskMarginEurMwh} / MWh` : '— (Unset)'}
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
          <div className="eyebrow">Deal P&amp;L</div>
          <div className="num" style={{ fontSize: '19px', fontWeight: 800, color: (netback.deskMargin ?? 0) < 0 ? 'var(--color-pnl-neg)' : 'var(--color-pnl-pos)' }}>
            {netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}
          </div>
        </div>
      </div>

      {/* Principal Trader Risk Suite */}
      {netback.principalRisk && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
          <div className="eyebrow" style={{ color: 'var(--color-accent-600)', marginBottom: '8px' }}>
            Principal Trader Risk Suite
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            {/* Basis Risk */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mut">Hub Basis Spread ({origin} ➔ {selectedMarket.country}):</span>
              <span className="num" style={{ fontWeight: 700 }}>
                {netback.principalRisk.basisDifferentialEurMwh >= 0 ? `+€${netback.principalRisk.basisDifferentialEurMwh.toFixed(2)}` : `−€${Math.abs(netback.principalRisk.basisDifferentialEurMwh).toFixed(2)}`}/MWh 
                <span style={{ fontSize: '12px', color: 'var(--color-dim)', marginLeft: '4px' }}>
                  (€{netback.principalRisk.basisRiskNotionalEur.toLocaleString()})
                </span>
              </span>
            </div>

            {/* Statutory Replacement Risk */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mut">Delivery Default Replacement Exposure:</span>
              <span className="num" style={{ fontWeight: 700, color: 'var(--color-pnl-neg)' }}>
                €{netback.principalRisk.replacementCostExposureEur.toLocaleString()} at risk
              </span>
            </div>

            <AssumptionsStrip title="Risk suite assumptions" keys={RISK_SUITE_ASSUMPTIONS} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-divider)' }}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 0, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
          onClick={handleSaveDossier}
          data-testid="save-dossier-btn"
          title="Saves this trade assessment, with full RED III six-gate statutory citations, to the deal blotter"
        >
          <span>📁</span>
          <span>Save to blotter</span>
        </button>
        {justSavedId === currentTradeAssessment.id && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 0, padding: '4px 0', fontSize: '12px', alignSelf: 'center' }}
            onClick={onViewInBlotter}
            data-testid="view-in-blotter-link"
          >
            View in blotter →
          </button>
        )}

        {/* Complete 4-Piece Deal Package In-Browser Review */}
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ 
            marginTop: 0, 
            padding: '11px 14px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '2px', 
            fontSize: '12px',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontWeight: 800,
          }}
          onClick={() => handleOpenDocReview('TERM_SHEET')}
          data-testid="review-deal-package-btn"
          title="Review and inspect all 4 deal documents (Term Sheet, EFET Annex, ETRM CSV, UDB XML) in-browser before downloading"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📦</span>
            <span>Review Deal Package (4 Documents)</span>
          </div>
          <span style={{ fontSize: '12px', opacity: 0.9, fontWeight: 500 }}>
            Term Sheet · EFET Annex · ETRM CSV · UDB XML
          </span>
        </button>
        
        <button
          type="button"
          className="btn"
          style={{
            width: '100%',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: 'var(--color-status-pass-bg)',
            borderColor: 'var(--color-status-pass-border)',
            color: 'var(--color-status-pass-ink)',
            marginBottom: '8px'
          }}
          onClick={() => {
            const tradeAuditPayload = {
              originCountry: origin,
              originPlantId: linkedPlant?.id || deal.plantId || `${origin}-CUSTOM`,
              plantName: linkedPlant?.name || deal.plantName || `${origin} Biomethane Production Asset`,
              annualVolumeMWh: volumeMwh,
              targetMarketId: marketId,
              targetMarketName: selectedMarket?.name || marketId,
              feedstockCategory: FEEDSTOCKS.find(f => f.key === feedstockKey)?.label || feedstockKey,
              carbonIntensity: ci,
              deliveredValueEurMwh: netNetbackVal ?? (molVal + certVal),
            };
            window.dispatchEvent(new CustomEvent('open-compliance-auditor', { detail: tradeAuditPayload }));
          }}
          title="Audit this active trade against the 11 statutory dossiers and RED III regulations"
        >
          <span>⚖ Audit Deal with Statutory Vault</span>
        </button>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}
              onClick={() => handleOpenDocReview('TERM_SHEET')}
              data-testid="term-sheet-btn"
              title="Review the Commercial Counterparty Term Sheet PDF"
            >
              <span>📄</span>
              <span>Term Sheet</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 8px', fontSize: '12px' }}
              onClick={handleExportTermSheetPdf}
              data-testid="download-termsheet-pdf-btn"
              title="1-Click Instant Download Commercial Term Sheet PDF"
            >
              📥
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}
              onClick={() => handleOpenDocReview('EFET_ANNEX')}
              data-testid="efet-annex-btn"
              title="Review the EFET Biomethane Annex PDF"
            >
              <span>⚖️</span>
              <span>EFET Annex</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 8px', fontSize: '12px' }}
              onClick={handleExportPdf}
              data-testid="download-efet-pdf-btn"
              title="1-Click Instant Download EFET Biomethane Annex PDF"
            >
              📥
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
            onClick={() => handleOpenDocReview('ETRM_TICKET')}
            data-testid="etrm-ticket-btn"
            title="Review ETRM CSV Deal Ticket & JSON fields"
          >
            <span>💾</span>
            <span>ETRM Deal Ticket</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
            onClick={() => handleOpenDocReview('UDB_XML')}
            data-testid="udb-xml-btn"
            title="Review Union Database (UDB) Mass Balance Nomination XML"
          >
            <span>🌐</span>
            <span>UDB XML Nomination</span>
          </button>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-block"
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
          onClick={() => setIsLogisticsOpen(true)}
          data-testid="delivery-playbook-btn"
          title="Opens interactive TSO pipeline routing, transit tariff breakdown, and UDB mass-balance transfer protocol"
        >
          <span>🗺️</span>
          <span>View TSO Pipeline Logistics Route</span>
        </button>

        <div style={{ fontSize: '12px', textAlign: 'center', color: 'var(--color-dim)', marginTop: '2px' }}>
          Institutional audit trail · EFET 2026 Annex compliant · Dijkstra TSO pathing
        </div>
      </div>
    </div>
  );
}
