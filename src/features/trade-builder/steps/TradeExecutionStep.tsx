import React, { useState } from 'react';
import { Market } from '../../../domain/markets/types';
import { TradeAssessment } from '../../../domain/trade/types';
import { DocumentTab } from '../LegalPackageModal';
import { getVtpForMarket } from '../TradeBuilderScreen';
import { generateStatutoryAuditMemoPdf } from '../../../domain/trade/legalPackage';
import {
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
  ShieldCheck,
} from 'lucide-react';
import { showToast } from '../../../app/DeskToastContainer';
import { useIsMobile } from '../../../shared/hooks/useMediaQuery';

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
  justSaved?: boolean;
  onViewInBlotter?: () => void;
  onExportPdf: () => void;
  onExportTermSheetPdf: () => void;
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
  justSaved,
  onViewInBlotter,
  onExportPdf,
  onExportTermSheetPdf,
  onReset,
}: TradeExecutionStepProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const isMobile = useIsMobile();
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
Deal Gross P&L: €${annualPnl.toLocaleString()}
Delivery Point (VTP): ${getVtpForMarket(selectedMarket.country)}
Compliance Verdict: ${currentTradeAssessment.eligibility.overallVerdict} (${currentTradeAssessment.eligibility.gates.filter(g => g.verdict === 'PASS').length}/${currentTradeAssessment.eligibility.gates.length} gates pass)
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

  const handleDownloadAuditMemo = () => {
    try {
      const doc = generateStatutoryAuditMemoPdf(currentTradeAssessment);
      const filename = `AUDIT-TR-${currentTradeAssessment.id}-${selectedMarket.id}.pdf`;
      doc.save(filename);
      showToast(`Statutory Audit Memo PDF downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate Statutory Audit Memo PDF');
    }
  };

  const gatesClear = currentTradeAssessment.eligibility.gates.filter(g => g.verdict === 'PASS').length;
  const verdictClass = isEligible ? 'pos' : 'neg';

  const documents: { tab: DocumentTab; label: string; icon: React.ReactNode; testId: string }[] = [
    { tab: 'TERM_SHEET', label: '1. Commercial Term Sheet', icon: <FileText size={14} />, testId: 'term-sheet-btn' },
    { tab: 'EFET_ANNEX', label: '2. EFET Biomethane Annex', icon: <Scale size={14} />, testId: 'efet-annex-btn' },
    { tab: 'ETRM_TICKET', label: '3. ETRM Deal Ticket (CSV)', icon: <Database size={14} />, testId: 'etrm-ticket-btn' },
    { tab: 'UDB_XML', label: '4. UDB XML Nomination', icon: <Database size={14} />, testId: 'udb-xml-btn' },
    { tab: 'AUDIT_MEMO', label: '5. Statutory Compliance Audit Memo (CCO Clearance)', icon: <ShieldCheck size={14} />, testId: 'audit-memo-deal-btn' },
  ];

  return (
    <div className="tb-form">
      {/* Deal Note */}
      <div className="tb-form-row">
        <span className="tb-form-label">Deal note</span>
        <div className="tb-form-control">
          <span className="tb-form-value">
            <span className="tb-id">{currentTradeAssessment.id}</span> Institutional Deal Confirmation Note{' '}
            <span className={`tb-badge ${verdictClass}`}>{isEligible ? 'STATUTORY AUDIT PASSED' : 'COMPLIANCE BLOCKED'}</span>
          </span>

          {/* Structured Deal Note Details */}
          <div className="tb-kv">
            <div className="tb-kv-row"><span>Asset / Consignment</span><span>{consignment.name}</span></div>
            <div className="tb-kv-row"><span>Origin Country</span><span>{consignment.originCountry} ({consignment.originCountryName})</span></div>
            <div className="tb-kv-row"><span>Target Market</span><span>{selectedMarket.name} ({selectedMarket.country})</span></div>
            <div className="tb-kv-row"><span>Contract Volume</span><span>{volumeMwh.toLocaleString()} MWh</span></div>
            <div className="tb-kv-row"><span>Certified Feedstock</span><span>{consignment.feedstock} ({consignment.annexClassification})</span></div>
            <div className="tb-kv-row"><span>Carbon Intensity</span><span>{consignment.carbonIntensity} gCO₂e/MJ</span></div>
            <div className="tb-kv-row"><span>Wholesale Net Netback</span><span className={netNetbackVal >= 0 ? 'tb-pos' : 'tb-neg'}>€{netNetbackVal.toFixed(2)} / MWh</span></div>
            <div className="tb-kv-row"><span>Trader Desk Margin</span><span className={annualPnl >= 0 ? 'tb-pos' : 'tb-neg'}>€{deskMarginEurMwh} / MWh</span></div>
            <div className="tb-kv-row"><span>Deal Desk P&amp;L</span><span className={annualPnl >= 0 ? 'tb-pos' : 'tb-neg'}>€{annualPnl.toLocaleString()}</span></div>
            <div className="tb-kv-row"><span>Physical VTP Delivery</span><span>{getVtpForMarket(selectedMarket.country)}</span></div>
            <div className="tb-kv-row"><span>Governing Standard</span><span>EFET 2026 Biomethane Annex / RED III Art. 30</span></div>
          </div>

          {/* Action Buttons */}
          <div className="tb-row-start">
            <button type="button" onClick={handleCopyDealSummary} className="btn btn-secondary">
              {copiedSummary ? <Check size={14} className="tb-pos" /> : <Copy size={14} />}
              <span>{copiedSummary ? 'Copied to Clipboard!' : 'Copy Deal Summary'}</span>
            </button>
            <button type="button" onClick={onExportTermSheetPdf} className="btn btn-secondary" data-testid="download-termsheet-pdf-btn">
              <Download size={14} />
              <span>Download Term Sheet (PDF)</span>
            </button>
            <button type="button" onClick={onExportPdf} className="btn btn-secondary" data-testid="download-efet-pdf-btn">
              <Download size={14} />
              <span>Download EFET Annex (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chief Compliance Officer Pre-Trade Clearance */}
      <div className="tb-form-row">
        <span className="tb-form-label">Compliance clearance</span>
        <div className="tb-form-control">
          <span className={`tb-form-value ${verdictClass === 'pos' ? 'tb-pos' : 'tb-neg'}`}>
            <ShieldCheck size={16} />
            <span className={`tb-badge ${verdictClass}`}>
              {currentTradeAssessment.eligibility.overallVerdict} ({gatesClear}/{currentTradeAssessment.eligibility.gates.length} GATES CLEAR)
            </span>
          </span>
          <p className="tb-hint">Chief Compliance Officer Pre-Trade Clearance · Institutional 6-gate statutory audit trail under RED III Directive &amp; national registry rules.</p>

          <dl className="tb-facts-list">
            <div><dt>Origin Facility</dt><dd>{consignment.name || 'Biomethane Asset'} ({consignment.originCountry})</dd></div>
            <div><dt>Compliance Sink</dt><dd>{selectedMarket.name}</dd></div>
            <div><dt>Certified CI</dt><dd>{consignment.carbonIntensity} gCO₂e/MJ</dd></div>
            <div><dt>Mass Balance</dt><dd>UDB Single Interconnected Area</dd></div>
          </dl>

          <div className="tb-row-start">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-compliance-auditor', {
                  detail: {
                    originCountry: consignment.originCountry,
                    targetMarketId: selectedMarket.id,
                    targetMarketName: selectedMarket.name,
                    annualVolumeMWh: volumeMwh,
                    carbonIntensity: consignment.carbonIntensity,
                    feedstockCategory: consignment.feedstock,
                    deliveredValueEurMwh: netNetbackVal,
                    initialTab: 'GATE_BREAKDOWN'
                  }
                }));
              }}
              className="btn btn-secondary"
            >
              <Scale size={14} />
              <span>Run Full Statutory Audit</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAuditMemo}
              className="btn btn-secondary"
              title="Download 2-page institutional statutory compliance memorandum PDF"
            >
              <Download size={14} />
              <span>Download Audit Memo (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deal Package */}
      <div className="tb-form-row">
        <span className="tb-form-label">Deal package</span>
        <div className="tb-form-control">
          <div className="tb-row">
            <span className="tb-form-value">Institutional 5-Document Deal Package</span>
            <button
              type="button"
              onClick={() => onOpenDocReview('TERM_SHEET')}
              className="btn btn-primary"
              data-testid="review-deal-package-btn"
            >
              <Package size={14} />
              <span>Review Complete Deal Package (In-Browser Preview)</span>
            </button>
          </div>
          <p className="tb-hint">Full ETRM-compliant documentation suite for counterparty execution and audit trails.</p>

          {/* 5 Documents */}
          <ul className="tb-docs">
            {documents.map(d => (
              <li key={d.tab}>
                <button type="button" onClick={() => onOpenDocReview(d.tab)} className="tb-doc" data-testid={d.testId}>
                  <span className="tb-doc-icon">{d.icon}</span>
                  <span>{d.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dossier, logistics and reset */}
      <div className="tb-form-row">
        <span className="tb-form-label">Finish</span>
        <div className="tb-form-control">
          <div className="tb-row-start">
            <button type="button" onClick={onSaveDossier} className="btn btn-secondary" data-testid="save-dossier-btn">
              <FolderDown size={14} />
              <span>Save to blotter</span>
            </button>
            {justSaved && (
              <button type="button" onClick={onViewInBlotter} className="btn btn-ghost" data-testid="view-in-blotter-link">
                <span>View in blotter →</span>
              </button>
            )}
            <button type="button" onClick={onOpenLogistics} className="btn btn-secondary" data-testid="delivery-playbook-btn">
              <MapPin size={14} />
              <span>View TSO Pipeline Logistics Route (Dijkstra)</span>
            </button>
            <button type="button" onClick={onReset} className="btn btn-secondary">
              <RotateCcw size={14} />
              <span>Start New Deal (Clear)</span>
            </button>
          </div>
          <p className="tb-hint">Institutional audit trail · EFET 2026 Annex compliant · Union Database mass-balance validated</p>
        </div>
      </div>

      {/* Mobile: thumb-reach shortcuts to the two primary actions (same handlers as the buttons above) */}
      {isMobile && (
        <div className="tb-step-actions m-sticky-actions" data-testid="tb-mobile-actions">
          <button type="button" className="btn btn-secondary" onClick={onSaveDossier}>
            <FolderDown size={14} />
            <span>Save to blotter</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onOpenDocReview('TERM_SHEET')}>
            <Package size={14} />
            <span>Review package</span>
          </button>
        </div>
      )}
    </div>
  );
}
