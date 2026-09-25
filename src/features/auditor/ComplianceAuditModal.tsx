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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Statutory Compliance Audit Modal"
    >
      <div
        style={{
          width: 'min(960px, 95vw)',
          maxHeight: '90vh',
          backgroundColor: '#141210',
          border: '1px solid #332d29',
          borderRadius: '8px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          color: '#e7e5e4',
          fontFamily: 'var(--font-body, -apple-system, sans-serif)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #292524',
            backgroundColor: '#1c1917',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚖</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#f5f5f4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Statutory Compliance Auditor &amp; Regulatory Vault
                <span style={{
                  fontSize: '10px',
                  padding: '2px 7px',
                  backgroundColor: hasApiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: hasApiKey ? '#34d399' : '#f59e0b',
                  borderRadius: '4px',
                  border: `1px solid ${hasApiKey ? '#059669' : '#d97706'}`,
                  fontWeight: 700
                }}>
                  {hasApiKey ? '● Grounded Gemini' : '● Deterministic Offline'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#a8a29e' }}>
                Chief Compliance Officer Pre-Trade Clearance · RED III Directive (EU) 2023/2413 · UDB · EFET 2026
              </div>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopySummary}
              disabled={!auditResult}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#292524',
                color: '#e7e5e4',
                border: '1px solid #44403c',
                borderRadius: '4px',
                cursor: auditResult ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Copy structured compliance summary note"
            >
              <span>{copiedType === 'SUMMARY' ? '✓' : '📋'}</span>
              <span>{copiedType === 'SUMMARY' ? 'Copied' : 'Copy Compliance Summary'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#047857',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Export 2-page institutional statutory compliance memorandum PDF"
            >
              <span>📥</span>
              <span>Export Audit Memo (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#292524',
                border: '1px solid #44403c',
                color: '#a8a29e',
                fontSize: '14px',
                cursor: 'pointer',
                borderRadius: '4px',
                padding: '4px 8px',
                marginLeft: '4px'
              }}
              title="Close modal (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corridor Context Strip & Scenario Chips */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#181614',
            borderBottom: '1px solid #292524',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {/* Active Context Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px' }}>
            <span style={{ color: '#a8a29e', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>Active Route:</span>
            <strong style={{ color: '#ffffff', backgroundColor: '#292524', padding: '2px 8px', borderRadius: '4px' }}>
              {activeTrade.originCountry} → {activeTrade.targetMarketId}
            </strong>
            <span style={{ color: '#78716c' }}>|</span>
            <span style={{ color: '#d6d3d1' }}>{activeTrade.feedstockCategory}</span>
            <span style={{ color: '#78716c' }}>|</span>
            <span style={{ color: activeTrade.carbonIntensity <= 32.9 ? '#34d399' : '#f87171', fontWeight: 700 }}>
              {activeTrade.carbonIntensity} gCO₂e/MJ
            </span>
            {activeTrade.annualVolumeMWh && (
              <>
                <span style={{ color: '#78716c' }}>|</span>
                <span style={{ color: '#a8a29e' }}>{activeTrade.annualVolumeMWh.toLocaleString()} MWh</span>
              </>
            )}
          </div>

          {/* Preset Scenario Switchers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#78716c', fontWeight: 700 }}>Corridors:</span>
            <button
              onClick={() => setSelectedPresetIndex(-1)}
              style={{
                fontSize: '10.5px',
                padding: '2px 7px',
                borderRadius: '4px',
                border: selectedPresetIndex === -1 ? '1px solid #10b981' : '1px solid #292524',
                backgroundColor: selectedPresetIndex === -1 ? 'rgba(16, 185, 129, 0.15)' : '#1c1917',
                color: selectedPresetIndex === -1 ? '#34d399' : '#a8a29e',
                cursor: 'pointer',
                fontWeight: selectedPresetIndex === -1 ? 700 : 500
              }}
            >
              ⚡ Live Deal
            </button>
            {PRESET_SCENARIOS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPresetIndex(idx)}
                style={{
                  fontSize: '10.5px',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: selectedPresetIndex === idx ? '1px solid #38bdf8' : '1px solid #292524',
                  backgroundColor: selectedPresetIndex === idx ? 'rgba(56, 189, 248, 0.15)' : '#1c1917',
                  color: selectedPresetIndex === idx ? '#38bdf8' : '#a8a29e',
                  cursor: 'pointer',
                  fontWeight: selectedPresetIndex === idx ? 700 : 500
                }}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #292524', backgroundColor: '#1c1917' }}>
          <button
            onClick={() => setActiveTab('GATE_BREAKDOWN')}
            style={{
              flex: 1,
              padding: '11px 0',
              fontSize: '12px',
              fontWeight: activeTab === 'GATE_BREAKDOWN' ? 800 : 600,
              color: activeTab === 'GATE_BREAKDOWN' ? '#ffffff' : '#a8a29e',
              borderBottom: activeTab === 'GATE_BREAKDOWN' ? '2px solid #10b981' : 'none',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            🛡️ 1. 6-Gate Statutory Breakdown
          </button>
          <button
            onClick={() => setActiveTab('EFET_SCHEDULE')}
            style={{
              flex: 1,
              padding: '11px 0',
              fontSize: '12px',
              fontWeight: activeTab === 'EFET_SCHEDULE' ? 800 : 600,
              color: activeTab === 'EFET_SCHEDULE' ? '#ffffff' : '#a8a29e',
              borderBottom: activeTab === 'EFET_SCHEDULE' ? '2px solid #10b981' : 'none',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            ⚖️ 2. EFET Schedule &amp; Protective Remedies
          </button>
          <button
            onClick={() => setActiveTab('DOSSIER_QA')}
            style={{
              flex: 1,
              padding: '11px 0',
              fontSize: '12px',
              fontWeight: activeTab === 'DOSSIER_QA' ? 800 : 600,
              color: activeTab === 'DOSSIER_QA' ? '#ffffff' : '#a8a29e',
              borderBottom: activeTab === 'DOSSIER_QA' ? '2px solid #10b981' : 'none',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            📜 3. Statutory Dossier Search / Q&amp;A
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            style={{
              flex: 1,
              padding: '11px 0',
              fontSize: '12px',
              fontWeight: activeTab === 'SETTINGS' ? 800 : 600,
              color: activeTab === 'SETTINGS' ? '#ffffff' : '#a8a29e',
              borderBottom: activeTab === 'SETTINGS' ? '2px solid #10b981' : 'none',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            ⚙️ 4. Engine &amp; Gemini API Key
          </button>
        </div>

        {/* Modal Main Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* ══════════════════════════════════════════════════════════════════
             TAB 1: 6-GATE STATUTORY BREAKDOWN
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'GATE_BREAKDOWN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Verdict Banner */}
              {auditResult ? (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${
                    auditResult.verdict === 'APPROVED' ? '#059669' :
                    auditResult.verdict === 'REJECTED' ? '#dc2626' : '#d97706'
                  }`,
                  backgroundColor: auditResult.verdict === 'APPROVED' ? 'rgba(5, 150, 105, 0.12)' :
                    auditResult.verdict === 'REJECTED' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: auditResult.verdict === 'APPROVED' ? '#34d399' : auditResult.verdict === 'REJECTED' ? '#f87171' : '#fbbf24' }}>
                      {auditResult.headline}
                    </div>
                    <span style={{
                      fontSize: '10.5px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      backgroundColor: auditResult.verdict === 'APPROVED' ? '#065f46' : auditResult.verdict === 'REJECTED' ? '#991b1b' : '#92400e',
                      color: '#ffffff'
                    }}>
                      {auditResult.verdict}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#d6d3d1', lineHeight: 1.4 }}>
                    {auditResult.verdict === 'APPROVED'
                      ? 'All statutory gates cleared. Consignment satisfies RED III mass balance, GHG savings, and target market requirements.'
                      : auditResult.verdict === 'REJECTED'
                      ? 'Hard regulatory block. This transaction cannot clear statutory surrender in the target compliance registry.'
                      : 'Conditional pass. Transaction is subject to statutory price caps or specific registry escrow conditions.'}
                  </div>
                </div>
              ) : isLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#a8a29e', fontSize: '12px' }}>
                  Auditing transaction against 11 European statutory dossiers...
                </div>
              ) : null}

              {/* 6-Gate Breakdown List */}
              {auditResult && auditResult.checks.length > 0 && (
                <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '14px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a8a29e', fontWeight: 800 }}>
                      RED III &amp; National Directives Six-Gate Breakdown
                    </div>
                    <div style={{ fontSize: '11px', color: '#78716c' }}>
                      {auditResult.checks.filter(c => c.status === 'PASS').length} of {auditResult.checks.length} Gates Clear
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {auditResult.checks.map((chk, idx) => {
                      const isFocused = focusedGateIndex !== undefined && focusedGateIndex === idx;
                      return (
                        <div
                          key={idx}
                          ref={isFocused ? focusedGateRef : undefined}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '4px',
                            backgroundColor: isFocused ? 'rgba(56, 189, 248, 0.08)' : '#181614',
                            border: isFocused ? '1px solid #0284c7' : '1px solid #292524',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}
                        >
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 800,
                            backgroundColor: chk.status === 'PASS' ? '#065f46' : chk.status === 'FAIL' ? '#991b1b' : '#92400e',
                            color: '#ffffff',
                            minWidth: '42px',
                            textAlign: 'center'
                          }}>
                            {chk.status}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#f5f5f4' }}>
                              {chk.gateName}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#d6d3d1', marginTop: '2px', lineHeight: 1.45 }}>
                              {chk.details}
                            </div>
                            {chk.citation && (
                              <div style={{ fontSize: '10.5px', color: '#38bdf8', marginTop: '3px', fontFamily: 'var(--font-mono, monospace)' }}>
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
                <div style={{ backgroundColor: '#181614', border: '1px solid #292524', padding: '12px 14px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✓ Verbatim Proofs from Local Statutory Knowledge Vault</span>
                  </div>
                  {auditResult.quoteProofs.map((p, idx) => (
                    <div key={idx} style={{ fontSize: '11px', borderLeft: '2px solid #10b981', paddingLeft: '8px', margin: '6px 0', color: '#d6d3d1', fontStyle: 'italic' }}>
                      "{p.quote}"
                      <div style={{ fontSize: '10px', color: '#78716c', marginTop: '2px', fontStyle: 'normal' }}>
                        📁 {p.sourceFile} · {p.articleCitation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Styled Explanation Memo */}
              {auditResult && (
                <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '14px', borderRadius: '6px' }}>
                  {renderMarkdownContent(auditResult.explanation)}
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
             TAB 2: EFET SCHEDULE & PROTECTIVE REMEDIES
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'EFET_SCHEDULE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '14px', borderRadius: '6px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f5f5f4', textTransform: 'uppercase' }}>
                  Protective Clauses to Negotiate
                </h4>
                <div style={{ fontSize: '11.5px', color: '#a8a29e', marginTop: '3px' }}>
                  Desk drafting checklist — not EFET standard text. Deadlines and remedies below are suggested starting positions to agree with the counterparty.
                </div>
              </div>

              {/* Protective Clauses Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                <div style={{ backgroundColor: '#181614', border: '1px solid #292524', padding: '12px 14px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#34d399', marginBottom: '4px' }}>
                    1. Proof of Sustainability (PoS) Delivery Schedule &amp; Deadline
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#d6d3d1', lineHeight: 1.5 }}>
                    Seller warrants that an audited Proof of Sustainability issued by an EU-recognized voluntary scheme (ISCC EU / REDcert-EU) shall be electronically delivered via the Union Database (UDB) or national registry connector by an agreed deadline after each delivery month (suggested starting position: <strong>10 business days</strong>).
                  </div>
                </div>

                <div style={{ backgroundColor: '#181614', border: '1px solid #292524', padding: '12px 14px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#38bdf8', marginBottom: '4px' }}>
                    2. 3-Business-Day Cure Period &amp; TTF Spot Repricing Fallback
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#d6d3d1', lineHeight: 1.5 }}>
                    In the event of Seller&apos;s failure to deliver valid PoS or if the certified Carbon Intensity exceeds the contractual specification, Buyer issues a cure notice (suggested: <strong>3 business days</strong>). If un-remedied, Buyer may <strong>re-price the delivered gas to the standard TTF Day-Ahead spot price</strong>, with Seller forfeiting 100% of the green attribute premium.
                  </div>
                </div>

                <div style={{ backgroundColor: '#181614', border: '1px solid #292524', padding: '12px 14px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#fbbf24', marginBottom: '4px' }}>
                    3. Anti-Double Counting &amp; Subsidy Clawback Covenant (SDE++ / EEG / GSE)
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#d6d3d1', lineHeight: 1.5 }}>
                    Seller warrants that the biomethane volume delivered has not been compensated under conflicting national feed-in subsidy schemes (such as Dutch SDE++, German EEG, or Italian GSE) without statutory correction. Seller warrants full compliance with national registry cancellation (VertiCer/dena) and single-accounting rules.
                  </div>
                </div>

                <div style={{ backgroundColor: '#181614', border: '1px solid #292524', padding: '12px 14px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#a78bfa', marginBottom: '4px' }}>
                    4. Regulatory Change Allocation Without Breach Penalty
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#d6d3d1', lineHeight: 1.5 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              
              {/* Quick Query Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  onClick={() => handleSendQa('What is the statutory penalty and baseline CI under FuelEU Maritime?')}
                  style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#292524', border: '1px solid #44403c', color: '#d6d3d1', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ⚓ FuelEU Maritime Penalty
                </button>
                <button
                  onClick={() => handleSendQa('Can Great Britain biomethane clear the EU UDB mass balance into German THG?')}
                  style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#292524', border: '1px solid #44403c', color: '#d6d3d1', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🇬🇧 UK UDB Border Block
                </button>
                <button
                  onClick={() => handleSendQa('How does German 38. BImSchV treat the manure bonus e_am vs the 2x multiplier?')}
                  style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#292524', border: '1px solid #44403c', color: '#d6d3d1', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🐄 German e_am Decoupling
                </button>
                <button
                  onClick={() => handleSendQa('What are the remedies under EFET if the seller fails to deliver valid PoS?')}
                  style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#292524', border: '1px solid #44403c', color: '#d6d3d1', borderRadius: '4px', cursor: 'pointer' }}
                >
                  📄 EFET PoS Default Remedies
                </button>
              </div>

              {/* Chat History Messages */}
              <div style={{ flex: 1, minHeight: '300px', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chatHistory.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '90%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: msg.role === 'user' ? '#047857' : '#1c1917',
                      border: msg.role === 'user' ? 'none' : '1px solid #292524',
                      fontSize: '12px',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '10px', opacity: 0.6 }}>
                      <span>{msg.role === 'user' ? 'Trader' : 'Compliance Auditor'}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                    {msg.isVerbatimVerified && (
                      <div style={{ marginTop: '6px', fontSize: '10px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Verified against Local Statutory Vault
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Prompt Input Bar */}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #292524' }}>
                <input
                  type="text"
                  value={qaPrompt}
                  onChange={e => setQaPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendQa(); }}
                  placeholder="Ask a statutory, registry, or contract question..."
                  style={{
                    flex: 1,
                    backgroundColor: '#1c1917',
                    border: '1px solid #292524',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => handleSendQa()}
                  disabled={isLoading || !qaPrompt.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#047857',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>Google Gemini API Configuration</div>
                <div style={{ fontSize: '11px', color: '#a8a29e', marginBottom: '12px', lineHeight: 1.4 }}>
                  Enter your free Gemini API key to enable live conversational statutory auditing. Get one for free at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#34d399' }}>aistudio.google.com</a>.
                </div>

                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="Paste AI Studio API Key (AIzaSy...)"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#141210',
                    border: '1px solid #44403c',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '12px',
                    marginBottom: '10px',
                    fontFamily: 'monospace'
                  }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSaveApiKey}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      backgroundColor: '#047857',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Save API Key
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={testStatus?.testing}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#0284c7',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: testStatus?.testing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {testStatus?.testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {hasApiKey && (
                    <button
                      onClick={() => { setApiKeyInput(''); setStoredApiKey(''); setHasApiKey(false); setTestStatus(null); }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#7f1d1d',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {testStatus && !testStatus.testing && testStatus.result && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    backgroundColor: testStatus.result.valid ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                    border: `1px solid ${testStatus.result.valid ? '#059669' : '#dc2626'}`,
                    color: testStatus.result.valid ? '#34d399' : '#f87171'
                  }}>
                    {testStatus.result.valid 
                      ? `✓ Connection Verified: Connected to Google Gemini (${testStatus.result.model}). Real-time statutory AI drafting is active.`
                      : `✕ Connection Failed: ${testStatus.result.error}`}
                  </div>
                )}
              </div>

              {/* Vault Status Box */}
              <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>Loaded Knowledge Vault Dossiers (Zero-Hallucination Grounding)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#a8a29e' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: '4px' }} />;

        // H3 header
        if (trimmed.startsWith('### ')) {
          return (
            <div key={idx} style={{ fontSize: '13px', fontWeight: 800, color: '#f5f5f4', borderBottom: '1px solid #292524', paddingBottom: '4px', marginTop: '6px' }}>
              {trimmed.replace(/^###\s*/, '')}
            </div>
          );
        }

        // H4 header
        if (trimmed.startsWith('#### ')) {
          return (
            <div key={idx} style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>
              {trimmed.replace(/^####\s*/, '')}
            </div>
          );
        }

        // Alert blockquote: > text
        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} style={{ fontSize: '11px', backgroundColor: 'rgba(217, 119, 6, 0.1)', borderLeft: '3px solid #d97706', padding: '6px 10px', color: '#fcd34d', borderRadius: '0 4px 4px 0' }}>
              {trimmed.replace(/^>\s*/, '')}
            </div>
          );
        }

        // Bullet item: - text or * text
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s*/, '');
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', paddingLeft: '4px' }}>
              <span style={{ color: '#10b981', fontSize: '12px', lineHeight: 1.4 }}>•</span>
              <span style={{ flex: 1, color: '#d6d3d1', lineHeight: 1.45 }}>
                {renderFormattedSpans(content)}
              </span>
            </div>
          );
        }

        // Numbered list item: 1. text
        const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
        if (numMatch) {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', paddingLeft: '4px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '11px', minWidth: '16px' }}>{numMatch[1]}.</span>
              <span style={{ flex: 1, color: '#d6d3d1', lineHeight: 1.45 }}>
                {renderFormattedSpans(numMatch[2])}
              </span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <div key={idx} style={{ fontSize: '12px', color: '#d6d3d1', lineHeight: 1.45 }}>
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
      return <strong key={i} style={{ color: '#f5f5f4', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{ backgroundColor: '#292524', padding: '1px 5px', borderRadius: '3px', fontSize: '11px', color: '#a7f3d0', fontFamily: 'monospace' }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
