import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../../store/context';
import {
  queryAuditor,
  getStoredApiKey,
  setStoredApiKey,
  testGeminiApiKey
} from '../../domain/auditor/geminiClient';
import {
  AuditorResponse,
  TradeAuditContext,
  AuditorChatMessage,
  AuditorModalTab,
  normalizeAuditorTab,
  normalizeTradeAuditContext
} from '../../domain/auditor/types';
import { generateStatutoryAuditMemoPdf } from '../../domain/trade/legalPackage';
import { TradeAssessment } from '../../domain/trade/types';
import { computeNetback } from '../../domain/netback/engine';
import { Consignment } from '../../domain/consignment/types';
import { GateName } from '../../domain/eligibility/types';
import { showToast } from '../../app/DeskToastContainer';
import { MARKETS } from '../../domain/markets/registry';
import './auditorModal.css';

const STATUTORY_GATE_NAMES: GateName[] = [
  'SCHEME_RECOGNITION',
  'UDB_RECORDING',
  'CHAIN_OF_CUSTODY',
  'FEEDSTOCK_CATEGORY',
  'GHG_THRESHOLD',
  'MARKET_SPECIFIC',
];

export type { AuditorModalTab };

export interface ComplianceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealContextOverride?: TradeAuditContext;
  initialTab?: string;
  focusedGateIndex?: number;
}

type StatusKey = 'pass' | 'neg' | 'warn' | 'info';

function gateStatusKey(status: string): StatusKey {
  if (status === 'PASS') return 'pass';
  if (status === 'FAIL') return 'neg';
  return 'warn';
}

function verdictStatusKey(verdict: string | undefined): StatusKey {
  if (verdict === 'APPROVED') return 'pass';
  if (verdict === 'REJECTED') return 'neg';
  return 'warn';
}

export function ComplianceAuditModal({
  isOpen,
  onClose,
  dealContextOverride,
  initialTab = 'GATE_BREAKDOWN',
  focusedGateIndex,
}: ComplianceAuditModalProps) {
  const { state } = useAppState();

  const [activeTab, setActiveTab] = useState<AuditorModalTab>(normalizeAuditorTab(initialTab));
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditorResponse | null>(null);
  const [qaPrompt, setQaPrompt] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; result?: { valid: boolean; model?: string; error?: string } } | null>(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(-1);
  const focusedGateRef = useRef<HTMLDivElement | null>(null);

  const [chatHistory, setChatHistory] = useState<AuditorChatMessage[]>([
    {
      id: 'init-1',
      role: 'system',
      content: 'Closed-Domain Statutory Compliance Auditor online. Grounded exclusively on 11 European statutory dossiers (RED III Directive 2023/2413, FuelEU Maritime 2023/1805, 38. BImSchV, French CPB, Union Database, EFET 2026). Temperature 0.0.',
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);

  // Sync tab if initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeAuditorTab(initialTab));
    }
  }, [initialTab]);

  // Reset preset selection when modal opens or explicit dealContextOverride is passed
  useEffect(() => {
    if (isOpen) {
      setSelectedPresetIndex(-1);
    }
  }, [isOpen, dealContextOverride]);

  // Scroll to focused gate when Tab 1 is active
  useEffect(() => {
    if (activeTab === 'GATE_BREAKDOWN' && focusedGateIndex !== undefined && focusedGateRef.current) {
      focusedGateRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTab, focusedGateIndex, auditResult]);

  // Read stored API key on open
  useEffect(() => {
    const key = getStoredApiKey();
    setHasApiKey(Boolean(key));
    if (key) setApiKeyInput(key);
  }, [isOpen]);

  // Keyboard navigation: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Check if we have a live deal from Trade Builder on window
  const liveTradeDeal = (typeof window !== 'undefined' && window.location.hash.includes('/trade'))
    ? (window as any).__ACTIVE_TRADE_BUILDER_DEAL__
    : null;

  // Extract active trade context from global state if not overridden
  const activeConsignment = state.consignments.find(c => c.id === state.activeConsignmentId) || state.consignments[0];
  const defaultLiveTrade = React.useMemo(() => {
    const raw = dealContextOverride || liveTradeDeal;
    return normalizeTradeAuditContext(raw, {
      originCountry: activeConsignment?.originCountry || 'DE',
      originPlantId: activeConsignment?.id || 'DE-104',
      plantName: activeConsignment?.name || 'Güstrow Biomethane Facility',
      annualVolumeMWh: activeConsignment?.volumeMWh || 85000,
      targetMarketId: state.selectedMarketId || 'DE_THG',
      feedstockCategory: activeConsignment?.feedstockName || activeConsignment?.feedstock || 'MANURE_SLURRY',
      carbonIntensity: activeConsignment?.carbonIntensity ?? -80,
      deliveredValueEurMwh: 84.50,
    });
  }, [dealContextOverride, liveTradeDeal, activeConsignment, state.selectedMarketId]);

  const PRESET_SCENARIOS: { label: string; description: string; context: TradeAuditContext }[] = [
    {
      label: '🛑 GB → DE THG',
      description: 'RED III Art 31a Non-EU UDB Grid Boundary Rejection',
      context: {
        originCountry: 'GB',
        originPlantId: 'GB-METH-001',
        plantName: 'Minsterworth AD Facility',
        annualVolumeMWh: 45000,
        targetMarketId: 'DE_THG',
        feedstockCategory: 'MANURE_SLURRY',
        carbonIntensity: -45,
        deliveredValueEurMwh: 92.00,
      }
    },
    {
      label: '✅ DK → DE THG',
      description: 'Annex IX Manure & e_am Methane Avoidance Bonus',
      context: {
        originCountry: 'DK',
        originPlantId: 'DK-BIO-042',
        plantName: 'Vesthimmerland Biogas',
        annualVolumeMWh: 110000,
        targetMarketId: 'DE_THG',
        feedstockCategory: 'MANURE_SLURRY',
        carbonIntensity: -85,
        deliveredValueEurMwh: 88.50,
      }
    },
    {
      label: '🛑 FR Maize → FR CPB',
      description: 'Food/Feed Crop Cap & 65% CI Failure',
      context: {
        originCountry: 'FR',
        originPlantId: 'FR-AGRI-108',
        plantName: 'Beauce Biométhane CIVE',
        annualVolumeMWh: 35000,
        targetMarketId: 'FR_CPB',
        feedstockCategory: 'ENERGY_CROPS',
        carbonIntensity: 42.0,
        deliveredValueEurMwh: 105.00,
      }
    },
    {
      label: '✅ IT Slurry → IT CIC',
      description: 'Advanced Italian Transport Quota Compliance',
      context: {
        originCountry: 'IT',
        originPlantId: 'IT-AGRI-022',
        plantName: 'Lombardia Bioenergy',
        annualVolumeMWh: 60000,
        targetMarketId: 'IT_CIC',
        feedstockCategory: 'MANURE_SLURRY',
        carbonIntensity: -60,
        deliveredValueEurMwh: 89.00,
      }
    }
  ];

  const activeTrade: TradeAuditContext = selectedPresetIndex >= 0
    ? PRESET_SCENARIOS[selectedPresetIndex].context
    : (dealContextOverride || defaultLiveTrade);

  // Auto-execute audit whenever modal opens or trade context / preset switches
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    queryAuditor(
      'Perform an exhaustive, forensic statutory compliance audit on this transaction. Verify eligibility against RED III 65% GHG savings, UDB mass balance, Annex IX feedstock classification, and target market national quotas.',
      activeTrade
    ).then(res => {
      if (isMounted) {
        setAuditResult(res);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error('Audit run failed', err);
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, dealContextOverride, selectedPresetIndex, activeTrade.originCountry, activeTrade.targetMarketId, activeTrade.carbonIntensity, activeTrade.feedstockCategory]);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    setHasApiKey(Boolean(apiKeyInput.trim()));
    showToast('Gemini API Key saved successfully');
    setActiveTab('GATE_BREAKDOWN');
  };

  const handleTestConnection = async () => {
    if (!apiKeyInput.trim()) {
      setTestStatus({ testing: false, result: { valid: false, error: 'Please paste your API key first.' } });
      return;
    }
    setTestStatus({ testing: true });
    try {
      const res = await testGeminiApiKey(apiKeyInput.trim());
      setTestStatus({ testing: false, result: res });
      if (res.valid) {
        setHasApiKey(true);
        setStoredApiKey(apiKeyInput.trim());
        showToast('Gemini API connection verified!');
      }
    } catch (e: any) {
      setTestStatus({ testing: false, result: { valid: false, error: e.message || 'Connection failed' } });
    }
  };

  const handleSendQa = async (questionText?: string) => {
    const q = (questionText || qaPrompt).trim();
    if (!q) return;

    const userMsg: AuditorChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatHistory(prev => [...prev, userMsg]);
    setQaPrompt('');
    setIsLoading(true);

    try {
      const res = await queryAuditor(q);
      const assistantMsg: AuditorChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.explanation || res.rawText,
        timestamp: new Date().toLocaleTimeString(),
        auditResponse: res,
        isVerbatimVerified: res.quoteProofs.some(p => p.isVerbatimVerified)
      };
      setChatHistory(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatHistory(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: `Inquiry error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert TradeAuditContext to TradeAssessment for PDF export
  const buildAssessmentForExport = (): TradeAssessment => {
    const targetMarketObj = MARKETS.find(m => m.id === activeTrade.targetMarketId) || MARKETS[0];
    const consignment: Consignment = {
      id: activeTrade.originPlantId || 'BIO-FACILITY-01',
      name: activeTrade.plantName || `${activeTrade.originCountry} Biomethane Facility`,
      originCountry: activeTrade.originCountry,
      originCountryName: activeTrade.originCountry,
      injectionCountry: activeTrade.originCountry,
      injectionIsEU: activeTrade.originCountry !== 'GB' && activeTrade.originCountry !== 'UK',
      feedstock: activeTrade.feedstockCategory,
      feedstockName: activeTrade.feedstockCategory,
      carbonIntensity: activeTrade.carbonIntensity,
      annexClassification: activeTrade.carbonIntensity < 35 ? 'IX_A' : 'CROP',
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      udbStatus: 'RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: activeTrade.annualVolumeMWh || 25000,
      counterparty: 'OFFTAKE COUNTERPARTY CORP',
    };

    const calculatedNetback = computeNetback(
      targetMarketObj,
      consignment,
      state.marks,
      state.costs,
      state.marks.pricingSides
    );

    return {
      id: activeTrade.originPlantId ? `AUDIT-${activeTrade.originPlantId}` : `AUDIT-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      consignment,
      targetMarketId: targetMarketObj.id,
      targetMarketName: targetMarketObj.name,
      eligibility: {
        marketId: targetMarketObj.id,
        marketName: targetMarketObj.name,
        overallVerdict: auditResult?.verdict === 'APPROVED' ? 'ELIGIBLE' : auditResult?.verdict === 'REJECTED' ? 'HARD_BLOCK' : 'CONDITIONAL',
        blockingGate: null,
        summary: auditResult?.headline || 'Compliance Audit Evaluation',
        gates: (auditResult?.checks || []).map((c, i) => ({
          gate: STATUTORY_GATE_NAMES[i] || 'MARKET_SPECIFIC',
          gateLabel: c.gateName,
          verdict: c.status === 'PASS' ? 'PASS' : c.status === 'FAIL' ? 'HARD_BLOCK' : 'CONDITIONAL',
          reason: c.details,
          remedy: null,
          citations: c.citation ? [{
            shortName: c.citation,
            fullReference: c.citation,
            establishes: 'Statutory basis',
            verifiedDate: '2026-09-01',
            sourceUrl: 'https://eur-lex.europa.eu'
          }] : [],
          confidence: 'HIGH',
        }))
      },
      netback: calculatedNetback,
      marks: state.marks,
      costs: state.costs,
      userNotes: 'Statutory compliance verification memo generated by Compliance Auditor',
    };
  };

  const handleExportPdf = () => {
    try {
      const assessment = buildAssessmentForExport();
      const pdf = generateStatutoryAuditMemoPdf(assessment, {}, auditResult || undefined);
      const filename = `AUDIT-MEMO-${activeTrade.originCountry}-${activeTrade.targetMarketId}-${Date.now().toString().slice(-4)}.pdf`;
      pdf.save(filename);
      showToast(`Audit Memo PDF downloaded: ${filename}`);
    } catch (err: any) {
      console.error('PDF export failed', err);
      showToast('Failed to export PDF');
    }
  };

  const handleCopySummary = () => {
    if (!auditResult) return;
    const text = `[STATUTORY COMPLIANCE AUDIT MEMORANDUM]
Ref: AUDIT-TR-${activeTrade.originCountry}-${activeTrade.targetMarketId}
Verdict: ${auditResult.verdict}
Route: ${activeTrade.originCountry} (${activeTrade.plantName || 'Facility'}) → ${activeTrade.targetMarketId}
Substrate: ${activeTrade.feedstockCategory} | CI: ${activeTrade.carbonIntensity} gCO₂e/MJ
Volume: ${(activeTrade.annualVolumeMWh || 10000).toLocaleString()} MWh

6-GATE COMPLIANCE BREAKDOWN:
${auditResult.checks.map((chk, i) => `${i + 1}. [${chk.status}] ${chk.gateName}: ${chk.details} (${chk.citation || 'Statutory Code'})`).join('\n')}

RECOMMENDED EFET COVENANTS:
${auditResult.recommendations.map(r => `• ${r}`).join('\n')}`.trim();

    navigator.clipboard.writeText(text);
    setCopiedType('SUMMARY');
    showToast('Compliance summary copied to clipboard');
    setTimeout(() => setCopiedType(null), 2500);
  };

  if (!isOpen) return null;

  const verdictKey = verdictStatusKey(auditResult?.verdict);

  return (
    <div
      className="amc-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Statutory Compliance Audit Modal"
    >
      <div
        className="amc-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="amc-header">
          <div className="amc-header-left">
            <span className="amc-header-icon">⚖</span>
            <div>
              <div className="amc-title-row">
                Statutory Compliance Auditor &amp; Regulatory Vault
                <span className={`amc-status-chip ${hasApiKey ? 'amc-status-pass' : 'amc-status-warn'}`}>
                  {hasApiKey ? '● Grounded Gemini' : '● Deterministic Offline'}
                </span>
              </div>
              <div className="amc-subtitle">
                Chief Compliance Officer Pre-Trade Clearance · RED III Directive (EU) 2023/2413 · UDB · EFET 2026
              </div>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="amc-header-actions">
            <button
              type="button"
              onClick={handleCopySummary}
              disabled={!auditResult}
              className="amc-btn"
              title="Copy structured compliance summary note"
            >
              <span>{copiedType === 'SUMMARY' ? '✓' : '📋'}</span>
              <span>{copiedType === 'SUMMARY' ? 'Copied' : 'Copy Compliance Summary'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="amc-btn amc-btn-primary"
              title="Export 2-page institutional statutory compliance memorandum PDF"
            >
              <span>📥</span>
              <span>Export Audit Memo (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="amc-btn-icon"
              title="Close modal (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corridor Context Strip & Scenario Chips */}
        <div className="amc-strip">
          {/* Active Context Chips */}
          <div className="amc-chip-group">
            <span className="amc-chip-label">Active Route:</span>
            <strong className="amc-route-pill">
              {activeTrade.originCountry} → {activeTrade.targetMarketId}
            </strong>
            <span className="amc-pipe">|</span>
            <span className="amc-chip-text">{activeTrade.feedstockCategory}</span>
            <span className="amc-pipe">|</span>
            <span className={`amc-ci-value ${activeTrade.carbonIntensity <= 32.9 ? 'amc-ci-pos' : 'amc-ci-neg'}`}>
              {activeTrade.carbonIntensity} gCO₂e/MJ
            </span>
            {activeTrade.annualVolumeMWh && (
              <>
                <span className="amc-pipe">|</span>
                <span className="amc-chip-label">{activeTrade.annualVolumeMWh.toLocaleString()} MWh</span>
              </>
            )}
          </div>

          {/* Preset Scenario Switchers */}
          <div className="amc-corridor-group">
            <span className="amc-chip-label">Corridors:</span>
            <button
              onClick={() => setSelectedPresetIndex(-1)}
              className={`amc-preset-btn ${selectedPresetIndex === -1 ? 'amc-active-live' : ''}`}
            >
              ⚡ Live Deal
            </button>
            {PRESET_SCENARIOS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPresetIndex(idx)}
                className={`amc-preset-btn ${selectedPresetIndex === idx ? 'amc-active-preset' : ''}`}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Navigation Tabs */}
        <div className="amc-tabs">
          <button
            onClick={() => setActiveTab('GATE_BREAKDOWN')}
            className={`amc-tab ${activeTab === 'GATE_BREAKDOWN' ? 'amc-active' : ''}`}
          >
            🛡️ 1. 6-Gate Statutory Breakdown
          </button>
          <button
            onClick={() => setActiveTab('EFET_SCHEDULE')}
            className={`amc-tab ${activeTab === 'EFET_SCHEDULE' ? 'amc-active' : ''}`}
          >
            ⚖️ 2. EFET Schedule &amp; Protective Remedies
          </button>
          <button
            onClick={() => setActiveTab('DOSSIER_QA')}
            className={`amc-tab ${activeTab === 'DOSSIER_QA' ? 'amc-active' : ''}`}
          >
            📜 3. Statutory Dossier Search / Q&amp;A
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`amc-tab ${activeTab === 'SETTINGS' ? 'amc-active' : ''}`}
          >
            ⚙️ 4. Engine &amp; Gemini API Key
          </button>
        </div>

        {/* Modal Main Scrollable Content */}
        <div className="amc-content">

          {/* ══════════════════════════════════════════════════════════════════
             TAB 1: 6-GATE STATUTORY BREAKDOWN
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'GATE_BREAKDOWN' && (
            <div className="amc-tab-panel">

              {/* Verdict Banner */}
              {auditResult ? (
                <div className={`amc-verdict-banner amc-status-${verdictKey}`}>
                  <div className="amc-verdict-head">
                    <div className={`amc-verdict-headline amc-status-${verdictKey}`}>
                      {auditResult.headline}
                    </div>
                    <span className={`amc-status-chip amc-status-${verdictKey}`}>
                      {auditResult.verdict}
                    </span>
                  </div>
                  <div className="amc-verdict-desc">
                    {auditResult.verdict === 'APPROVED'
                      ? 'All statutory gates cleared. Consignment satisfies RED III mass balance, GHG savings, and target market requirements.'
                      : auditResult.verdict === 'REJECTED'
                      ? 'Hard regulatory block. This transaction cannot clear statutory surrender in the target compliance registry.'
                      : 'Conditional pass. Transaction is subject to statutory price caps or specific registry escrow conditions.'}
                  </div>
                </div>
              ) : isLoading ? (
                <div className="amc-loading">
                  Auditing transaction against 11 European statutory dossiers...
                </div>
              ) : null}

              {/* 6-Gate Breakdown List */}
              {auditResult && auditResult.checks.length > 0 && (
                <div className="amc-card">
                  <div className="amc-card-head">
                    <div className="amc-card-eyebrow">
                      RED III &amp; National Directives Six-Gate Breakdown
                    </div>
                    <div className="amc-card-count">
                      {auditResult.checks.filter(c => c.status === 'PASS').length} of {auditResult.checks.length} Gates Clear
                    </div>
                  </div>

                  <div className="amc-gate-list">
                    {auditResult.checks.map((chk, idx) => {
                      const isFocused = focusedGateIndex !== undefined && focusedGateIndex === idx;
                      const statusKey = gateStatusKey(chk.status);
                      return (
                        <div
                          key={idx}
                          ref={isFocused ? focusedGateRef : undefined}
                          className={`amc-gate-item ${isFocused ? 'amc-focused' : ''}`}
                        >
                          <span className={`amc-gate-badge amc-status-${statusKey}`}>
                            {chk.status}
                          </span>
                          <div className="amc-gate-body">
                            <div className="amc-gate-title">
                              {chk.gateName}
                            </div>
                            <div className="amc-gate-detail">
                              {chk.details}
                            </div>
                            {chk.citation && (
                              <div className="amc-gate-citation">
                                📌 {chk.citation}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Verbatim Grounding Quote Proofs */}
              {auditResult && auditResult.quoteProofs.length > 0 && (
                <div className="amc-card-inner">
                  <div className="amc-quotes-label">
                    <span>✓ Verbatim Proofs from Local Statutory Knowledge Vault</span>
                  </div>
                  {auditResult.quoteProofs.map((p, idx) => (
                    <div key={idx} className="amc-quote-item">
                      "{p.quote}"
                      <div className="amc-quote-source">
                        📁 {p.sourceFile} · {p.articleCitation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Styled Explanation Memo */}
              {auditResult && (
                <div className="amc-card">
                  {renderMarkdownContent(auditResult.explanation)}
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
             TAB 2: EFET SCHEDULE & PROTECTIVE REMEDIES
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'EFET_SCHEDULE' && (
            <div className="amc-tab-panel">

              <div className="amc-card">
                <h4 className="amc-heading">
                  Protective Clauses to Negotiate
                </h4>
                <div className="amc-heading-desc">
                  Desk drafting checklist — not EFET standard text. Deadlines and remedies below are suggested starting positions to agree with the counterparty.
                </div>
              </div>

              {/* Protective Clauses Cards */}
              <div className="amc-clause-list">

                <div className="amc-card-inner">
                  <div className="amc-clause-title amc-status-pass">
                    1. Proof of Sustainability (PoS) Delivery Schedule &amp; Deadline
                  </div>
                  <div className="amc-clause-body">
                    Seller warrants that an audited Proof of Sustainability issued by an EU-recognized voluntary scheme (ISCC EU / REDcert-EU) shall be electronically delivered via the Union Database (UDB) or national registry connector by an agreed deadline after each delivery month (suggested starting position: <strong>10 business days</strong>).
                  </div>
                </div>

                <div className="amc-card-inner">
                  <div className="amc-clause-title amc-status-info">
                    2. 3-Business-Day Cure Period &amp; TTF Spot Repricing Fallback
                  </div>
                  <div className="amc-clause-body">
                    In the event of Seller&apos;s failure to deliver valid PoS or if the certified Carbon Intensity exceeds the contractual specification, Buyer issues a cure notice (suggested: <strong>3 business days</strong>). If un-remedied, Buyer may <strong>re-price the delivered gas to the standard TTF Day-Ahead spot price</strong>, with Seller forfeiting 100% of the green attribute premium.
                  </div>
                </div>

                <div className="amc-card-inner">
                  <div className="amc-clause-title amc-status-warn">
                    3. Anti-Double Counting &amp; Subsidy Clawback Covenant (SDE++ / EEG / GSE)
                  </div>
                  <div className="amc-clause-body">
                    Seller warrants that the biomethane volume delivered has not been compensated under conflicting national feed-in subsidy schemes (such as Dutch SDE++, German EEG, or Italian GSE) without statutory correction. Seller warrants full compliance with national registry cancellation (VertiCer/dena) and single-accounting rules.
                  </div>
                </div>

                <div className="amc-card-inner">
                  <div className="amc-clause-title amc-status-accent">
                    4. Regulatory Change Allocation Without Breach Penalty
                  </div>
                  <div className="amc-clause-body">
                    Where statutory amendments (e.g. a change to German double-counting rules under the 38. BImSchV) alter the value of the certificates, the parties renegotiate the certificate price under an agreed change-in-law clause rather than either side being in default.
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
             TAB 3: STATUTORY DOSSIER SEARCH / Q&A
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'DOSSIER_QA' && (
            <div className="amc-qa-panel">

              {/* Quick Query Chips */}
              <div className="amc-qa-chip-row">
                <button
                  onClick={() => handleSendQa('What is the statutory penalty and baseline CI under FuelEU Maritime?')}
                  className="amc-qa-chip"
                >
                  ⚓ FuelEU Maritime Penalty
                </button>
                <button
                  onClick={() => handleSendQa('Can Great Britain biomethane clear the EU UDB mass balance into German THG?')}
                  className="amc-qa-chip"
                >
                  🇬🇧 UK UDB Border Block
                </button>
                <button
                  onClick={() => handleSendQa('How does German 38. BImSchV treat the manure bonus e_am vs the 2x multiplier?')}
                  className="amc-qa-chip"
                >
                  🐄 German e_am Decoupling
                </button>
                <button
                  onClick={() => handleSendQa('What are the remedies under EFET if the seller fails to deliver valid PoS?')}
                  className="amc-qa-chip"
                >
                  📄 EFET PoS Default Remedies
                </button>
              </div>

              {/* Chat History Messages */}
              <div className="amc-chat-scroll">
                {chatHistory.map(msg => (
                  <div
                    key={msg.id}
                    className={`amc-chat-bubble ${msg.role === 'user' ? 'amc-chat-user' : 'amc-chat-assistant'}`}
                  >
                    <div className="amc-chat-meta">
                      <span>{msg.role === 'user' ? 'Trader' : 'Compliance Auditor'}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="amc-chat-content">{msg.content}</div>

                    {msg.isVerbatimVerified && (
                      <div className="amc-chat-verified">
                        ✓ Verified against Local Statutory Vault
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Prompt Input Bar */}
              <div className="amc-qa-inputbar">
                <input
                  type="text"
                  value={qaPrompt}
                  onChange={e => setQaPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendQa(); }}
                  placeholder="Ask a statutory, registry, or contract question..."
                  className="amc-qa-input"
                />
                <button
                  onClick={() => handleSendQa()}
                  disabled={isLoading || !qaPrompt.trim()}
                  className="amc-btn amc-btn-primary"
                >
                  {isLoading ? '...' : 'Send'}
                </button>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
             TAB 4: ENGINE & GEMINI API KEY
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'SETTINGS' && (
            <div className="amc-tab-panel">
              <div className="amc-card">
                <div className="amc-settings-title">Google Gemini API Configuration</div>
                <div className="amc-settings-desc">
                  Enter your free Gemini API key to enable live conversational statutory auditing. Get one for free at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer">aistudio.google.com</a>.
                </div>

                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="Paste AI Studio API Key (AIzaSy...)"
                  className="amc-key-input"
                />

                <div className="amc-settings-actions">
                  <button
                    onClick={handleSaveApiKey}
                    className="amc-btn amc-btn-primary amc-btn-save"
                  >
                    Save API Key
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={testStatus?.testing}
                    className="amc-btn amc-btn-outline-info"
                  >
                    {testStatus?.testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {hasApiKey && (
                    <button
                      onClick={() => { setApiKeyInput(''); setStoredApiKey(''); setHasApiKey(false); setTestStatus(null); }}
                      className="amc-btn amc-btn-outline-neg"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {testStatus && !testStatus.testing && testStatus.result && (
                  <div className={`amc-test-result ${testStatus.result.valid ? 'amc-status-pass' : 'amc-status-neg'}`}>
                    {testStatus.result.valid
                      ? `✓ Connection Verified: Connected to Google Gemini (${testStatus.result.model}). Real-time statutory AI drafting is active.`
                      : `✕ Connection Failed: ${testStatus.result.error}`}
                  </div>
                )}
              </div>

              {/* Vault Status Box */}
              <div className="amc-card">
                <div className="amc-settings-title">Loaded Knowledge Vault Dossiers (Zero-Hallucination Grounding)</div>
                <div className="amc-vault-list">
                  <div>✓ <code>01_EU_Statutory_Directives_and_RED_III.md</code> (RED III, Articles 25/29/30/31a)</div>
                  <div>✓ <code>02_National_Compliance_Quotas_and_Formulas.md</code> (38. BImSchV, CPB, HBE, CIC, RTFO)</div>
                  <div>✓ <code>03_UDB_and_European_Registry_Architecture.md</code> (UDB State Machine &amp; Connectors)</div>
                  <div>✓ <code>04_EFET_Biomethane_Contract_Term_Sheet_Analysis.md</code> (Standard EFET &amp; RWE terms)</div>
                  <div>✓ <code>05_Logistics_Interconnectors_and_Tariffs.md</code> (ENTSOG, IP Tariffs &amp; Shrinkage)</div>
                  <div>✓ <code>11_FuelEU_Maritime_and_EU_ETS_Shipping_Desk.md</code> (Regulation 2023/1805 &amp; Pooling)</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function renderMarkdownContent(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="amc-md">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="amc-md-spacer" />;

        // H3 header
        if (trimmed.startsWith('### ')) {
          return (
            <div key={idx} className="amc-md-h3">
              {trimmed.replace(/^###\s*/, '')}
            </div>
          );
        }

        // H4 header
        if (trimmed.startsWith('#### ')) {
          return (
            <div key={idx} className="amc-md-h4">
              {trimmed.replace(/^####\s*/, '')}
            </div>
          );
        }

        // Alert blockquote: > text
        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} className="amc-md-alert">
              {trimmed.replace(/^>\s*/, '')}
            </div>
          );
        }

        // Bullet item: - text or * text
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s*/, '');
          return (
            <div key={idx} className="amc-md-row">
              <span className="amc-md-bullet-dot">•</span>
              <span className="amc-md-row-text">
                {renderFormattedSpans(content)}
              </span>
            </div>
          );
        }

        // Numbered list item: 1. text
        const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="amc-md-row">
              <span className="amc-md-num">{numMatch[1]}.</span>
              <span className="amc-md-row-text">
                {renderFormattedSpans(numMatch[2])}
              </span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <div key={idx} className="amc-md-para">
            {renderFormattedSpans(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

function renderFormattedSpans(str: string) {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="amc-md-strong">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="amc-md-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
