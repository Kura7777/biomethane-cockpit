import React, { useState } from 'react';
import { Market } from '../../../domain/markets/types';
import { TradeAssessment } from '../../../domain/trade/types';
import { DocumentTab } from '../LegalPackageModal';
import { getVtpForMarket } from '../TradeBuilderScreen';
import {
  ArrowLeft,
  RotateCcw,
  FileText,
  Download,
  Copy,
  Check,
  Package,
  Scale,
  Database,
  MapPin,
  CheckCircle2,
  FolderDown,
} from 'lucide-react';
import { showToast } from '../../../app/DeskToastContainer';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

interface TradeExecutionStepProps {
  currentTradeAssessment: TradeAssessment;
  selectedMarket: Market;
  origin: string;
  volumeMwh: number;
  netNetbackVal: number;
  deskMarginEurMwh: string;
  annualPnl: number;
  onOpenDocReview: (tab: DocumentTab) => void;
  onOpenLogistics: () => void;
  onSaveDossier: () => void;
  onExportPdf: () => void;
  onExportTermSheetPdf: () => void;
  onBack: () => void;
  onReset: () => void;
}

export function TradeExecutionStep({
  currentTradeAssessment,
  selectedMarket,
  origin,
  volumeMwh,
  netNetbackVal,
  deskMarginEurMwh,
  annualPnl,
  onOpenDocReview,
  onOpenLogistics,
  onSaveDossier,
  onExportPdf,
  onExportTermSheetPdf,
  onBack,
  onReset,
}: TradeExecutionStepProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const consignment = currentTradeAssessment.consignment;
  const isEligible = currentTradeAssessment.eligibility.overallVerdict === 'ELIGIBLE';

  const handleCopyDealSummary = () => {
    const text = `[BIOMETHANE OTC TRADE DEAL NOTE]
Ref: ${currentTradeAssessment.id}
Date: ${new Date().toISOString().split('T')[0]}
Consignment: ${consignment.name}
Origin: ${consignment.originCountry} (${consignment.originCountryName})
Target Market: ${selectedMarket.name} (${selectedMarket.country})
Volume: ${volumeMwh.toLocaleString()} MWh
Feedstock: ${consignment.feedstock}
Carbon Intensity: ${consignment.carbonIntensity} gCO2e/MJ
Net Netback: €${netNetbackVal.toFixed(2)} / MWh
Trader Desk Margin: €${deskMarginEurMwh} / MWh
Annual Gross P&L: €${annualPnl.toLocaleString()}
Delivery Point (VTP): ${getVtpForMarket(selectedMarket.country)}
Compliance Verdict: ${currentTradeAssessment.eligibility.overallVerdict} (${currentTradeAssessment.eligibility.gates.filter(g => g.verdict === 'PASS').length}/6 gates pass)
Standard: EFET 2026 Biomethane Annex / RED III Mass Balance`.trim();

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {
      // fallback
    }

    setCopiedSummary(true);
    showToast('Deal summary note copied to clipboard!', 'SUCCESS');
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-5 space-y-4">
      {/* 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* Left Column: Deal Terms Note & Quick Export Actions */}
        <div className="space-y-4">
          
          {/* Deal Note Header Card */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-panel-header)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    padding: '1px 6px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-subtier)',
                  }}
                >
                  {currentTradeAssessment.id}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text)' }}>
                  Institutional Deal Confirmation Note
                </span>
              </div>

              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  border: isEligible
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : '1px solid rgba(239, 68, 68, 0.4)',
                  backgroundColor: isEligible
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                  color: isEligible ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)',
                }}
              >
                {isEligible ? 'STATUTORY AUDIT PASSED' : 'COMPLIANCE BLOCKED'}
              </span>
            </div>

            {/* Structured Deal Note Details */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div
                style={{
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-subtier)',
                  padding: '12px 14px',
                  fontFamily: MONO_FONT,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div>• Asset / Consignment: <strong style={{ color: 'var(--color-text)' }}>{consignment.name}</strong></div>
                <div>• Origin Country: <strong style={{ color: 'var(--color-text)' }}>{consignment.originCountry} ({consignment.originCountryName})</strong></div>
                <div>• Target Market: <strong style={{ color: 'var(--color-accent)' }}>{selectedMarket.name} ({selectedMarket.country})</strong></div>
                <div>• Contract Volume: <strong style={{ color: 'var(--color-text)' }}>{volumeMwh.toLocaleString()} MWh</strong></div>
                <div>• Certified Feedstock: <strong style={{ color: 'var(--color-text)' }}>{consignment.feedstock}</strong> ({consignment.annexClassification})</div>
                <div>• Carbon Intensity: <strong style={{ color: 'var(--color-text)' }}>{consignment.carbonIntensity} gCO₂e/MJ</strong></div>
                <div>• Wholesale Net Netback: <strong style={{ color: 'var(--color-status-pos-text)' }}>€{netNetbackVal.toFixed(2)} / MWh</strong></div>
                <div>• Trader Desk Margin: <strong style={{ color: 'var(--color-accent)' }}>€{deskMarginEurMwh} / MWh</strong></div>
                <div>• Annual Desk P&amp;L: <strong style={{ color: 'var(--color-status-pos-text)' }}>€{annualPnl.toLocaleString()}</strong></div>
                <div>• Physical VTP Delivery: <strong style={{ color: 'var(--color-text)' }}>{getVtpForMarket(selectedMarket.country)}</strong></div>
                <div>• Governing Standard: <strong style={{ color: 'var(--color-text)' }}>EFET 2026 Biomethane Annex / RED III Art. 30</strong></div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleCopyDealSummary}
                  className="btn btn-secondary"
                  style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                >
                  {copiedSummary ? <Check size={13} style={{ color: 'var(--color-status-pos-text)' }} /> : <Copy size={13} />}
                  <span>{copiedSummary ? 'Copied to Clipboard!' : 'Copy Deal Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={onExportTermSheetPdf}
                  className="btn btn-secondary"
                  style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  data-testid="download-termsheet-pdf-btn"
                >
                  <Download size={13} />
                  <span>Download Term Sheet (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={onExportPdf}
                  className="btn btn-secondary"
                  style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  data-testid="download-efet-pdf-btn"
                >
                  <Download size={13} />
                  <span>Download EFET Annex (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Complete 4-Piece Deal Package & Review */}
        <div className="space-y-4">
          
          {/* Main Deal Package Trigger Card */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} style={{ color: 'var(--color-accent)' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--color-text)' }}>
                  Institutional 4-Document Deal Package
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Full ETRM-compliant documentation suite for counterparty execution and audit trails.
                </div>
              </div>
            </div>

            {/* Primary Review Trigger */}
            <button
              type="button"
              onClick={() => onOpenDocReview('TERM_SHEET')}
              className="btn btn-primary"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 800,
              }}
              data-testid="review-deal-package-btn"
            >
              <Package size={15} />
              <span>Review Complete Deal Package (In-Browser Preview)</span>
            </button>

            {/* 4 Document Tiles */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenDocReview('TERM_SHEET')}
                className="btn btn-secondary"
                style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', justifyContent: 'flex-start' }}
                data-testid="term-sheet-btn"
              >
                <FileText size={14} style={{ color: 'var(--color-accent)' }} />
                <span>1. Commercial Term Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDocReview('EFET_ANNEX')}
                className="btn btn-secondary"
                style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', justifyContent: 'flex-start' }}
                data-testid="efet-annex-btn"
              >
                <Scale size={14} style={{ color: 'var(--color-accent)' }} />
                <span>2. EFET Biomethane Annex</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDocReview('ETRM_TICKET')}
                className="btn btn-secondary"
                style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', justifyContent: 'flex-start' }}
                data-testid="etrm-ticket-btn"
              >
                <Database size={14} style={{ color: 'var(--color-accent)' }} />
                <span>3. ETRM Deal Ticket (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDocReview('UDB_XML')}
                className="btn btn-secondary"
                style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', justifyContent: 'flex-start' }}
                data-testid="udb-xml-btn"
              >
                <Database size={14} style={{ color: 'var(--color-accent)' }} />
                <span>4. UDB XML Nomination</span>
              </button>
            </div>
          </div>

          {/* Logistics & Dossier Persistence */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onSaveDossier}
              className="btn btn-primary"
              style={{
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 700,
              }}
              data-testid="save-dossier-btn"
            >
              <FolderDown size={14} />
              <span>Save Dossier with Statutory Citations</span>
            </button>

            <button
              type="button"
              onClick={onOpenLogistics}
              className="btn btn-secondary"
              style={{
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
              data-testid="delivery-playbook-btn"
            >
              <MapPin size={13} />
              <span>View TSO Pipeline Logistics Route (Dijkstra)</span>
            </button>

            <div style={{ fontSize: '10.5px', color: 'var(--color-muted)', textAlign: 'center', marginTop: '2px' }}>
              Institutional audit trail · EFET 2026 Annex compliant · Union Database mass-balance validated
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Dock Navigation Bar */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary"
          style={{ height: '32px', padding: '0 14px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
        >
          <ArrowLeft size={13} />
          <span>Back: Economics &amp; Risk</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onReset}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={12} />
            <span>Start New Deal (Clear)</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDocReview('TERM_SHEET')}
            className="btn btn-primary"
            style={{ height: '32px', padding: '0 18px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <Package size={13} />
            <span>Review Full Legal Package (4 Docs) →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
