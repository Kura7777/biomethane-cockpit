import React, { useState, useEffect } from 'react';
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
  AuditorChatMessage 
} from '../../domain/auditor/types';

interface AuditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dealContextOverride?: TradeAuditContext;
}

export function AuditorDrawer({ isOpen, onClose, dealContextOverride }: AuditorDrawerProps) {
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<'AUDIT_DEAL' | 'QA' | 'SETTINGS'>('AUDIT_DEAL');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditorResponse | null>(null);
  const [qaPrompt, setQaPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<AuditorChatMessage[]>([
    {
      id: 'init-1',
      role: 'system',
      content: 'Closed-Domain Statutory Auditor online. Grounded exclusively on 11 European statutory dossiers (RED III, FuelEU Maritime, 38. BImSchV, CPB, UDB, EFET). Temperature set to 0.0.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  useEffect(() => {
    const key = getStoredApiKey();
    setHasApiKey(Boolean(key));
    if (key) setApiKeyInput(key);
  }, [isOpen]);

  const [testStatus, setTestStatus] = useState<{ testing: boolean; result?: { valid: boolean; model?: string; error?: string } } | null>(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(-1);

  // Check if we have a live deal from Trade Builder on window
  const liveTradeDeal = (typeof window !== 'undefined' && window.location.hash.includes('/trade'))
    ? (window as any).__ACTIVE_TRADE_BUILDER_DEAL__
    : null;

  // Extract active trade context from global state if not overridden
  const activeConsignment = state.consignments.find(c => c.id === state.activeConsignmentId) || state.consignments[0];
  const defaultLiveTrade: TradeAuditContext = dealContextOverride || liveTradeDeal || {
    originCountry: activeConsignment?.originCountry || 'DE',
    originPlantId: activeConsignment?.id || 'DE-104',
    plantName: activeConsignment?.name || 'Güstrow Biomethane Facility',
    annualVolumeMWh: activeConsignment?.volumeMWh || 85000,
    targetMarketId: state.selectedMarketId || 'DE_THG',
    feedstockCategory: activeConsignment?.feedstockName || activeConsignment?.feedstock || 'MANURE_SLURRY',
    carbonIntensity: activeConsignment?.carbonIntensity ?? -80,
    deliveredValueEurMwh: 84.50,
  };

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
        deliveredValueEurMwh: 92.00
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
        deliveredValueEurMwh: 88.50
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
        deliveredValueEurMwh: 105.00
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
        deliveredValueEurMwh: 89.00
      }
    }
  ];

  const activeTrade: TradeAuditContext = selectedPresetIndex >= 0 
    ? PRESET_SCENARIOS[selectedPresetIndex].context 
    : defaultLiveTrade;

  // Clear old result whenever a new deal context is passed in, preset switches, or drawer opens
  useEffect(() => {
    setAuditResult(null);
  }, [dealContextOverride, selectedPresetIndex, isOpen]);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    setHasApiKey(Boolean(apiKeyInput.trim()));
    setActiveTab('AUDIT_DEAL');
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
      }
    } catch (e: any) {
      setTestStatus({ testing: false, result: { valid: false, error: e.message || 'Connection failed' } });
    }
  };

  const runActiveDealAudit = async () => {
    setIsLoading(true);
    try {
      const res = await queryAuditor(
        'Perform a comprehensive statutory compliance audit on this transaction. Verify eligibility against RED III 65% GHG savings, UDB mass balance, Annex IX feedstock classification, and target market national quotas.',
        activeTrade
      );
      setAuditResult(res);
    } catch (err: any) {
      console.error('Audit run failed', err);
    } finally {
      setIsLoading(false);
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '540px',
        maxWidth: '95vw',
        backgroundColor: '#141210',
        borderLeft: '2px solid #292524',
        boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.6)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        color: '#e7e5e4',
        fontFamily: 'var(--font-sans, -apple-system, sans-serif)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          height: '52px',
          borderBottom: '1px solid #292524',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          backgroundColor: '#1c1917',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚖</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f5f5f4', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Statutory Compliance Auditor
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: hasApiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: hasApiKey ? '#10b981' : '#f59e0b',
                borderRadius: '4px',
                border: `1px solid ${hasApiKey ? '#059669' : '#d97706'}`
              }}>
                {hasApiKey ? '● Grounded Gemini' : '● Deterministic Offline'}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#a8a29e' }}>
              Zero-Hallucination Knowledge Vault (RED III / UDB / Quotas)
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#a8a29e',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
          title="Close drawer"
        >
          ✕
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #292524', backgroundColor: '#181614' }}>
        <button
          onClick={() => setActiveTab('AUDIT_DEAL')}
          style={{
            flex: 1,
            padding: '10px 0',
            fontSize: '12px',
            fontWeight: activeTab === 'AUDIT_DEAL' ? 700 : 500,
            color: activeTab === 'AUDIT_DEAL' ? '#ffffff' : '#a8a29e',
            borderBottom: activeTab === 'AUDIT_DEAL' ? '2px solid #10b981' : 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ⚡ Audit Active Deal
        </button>
        <button
          onClick={() => setActiveTab('QA')}
          style={{
            flex: 1,
            padding: '10px 0',
            fontSize: '12px',
            fontWeight: activeTab === 'QA' ? 700 : 500,
            color: activeTab === 'QA' ? '#ffffff' : '#a8a29e',
            borderBottom: activeTab === 'QA' ? '2px solid #10b981' : 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          📜 Statutory Q&A
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          style={{
            flex: 1,
            padding: '10px 0',
            fontSize: '12px',
            fontWeight: activeTab === 'SETTINGS' ? 700 : 500,
            color: activeTab === 'SETTINGS' ? '#ffffff' : '#a8a29e',
            borderBottom: activeTab === 'SETTINGS' ? '2px solid #10b981' : 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ⚙ Vault & API Key
        </button>
      </div>

      {/* Main Drawer Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* TAB 1: AUDIT ACTIVE DEAL */}
        {activeTab === 'AUDIT_DEAL' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Scenario switcher chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#a8a29e', fontWeight: 700, letterSpacing: '0.05em' }}>
                Test Regulatory Scenarios & Corridors:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  onClick={() => { setSelectedPresetIndex(-1); setAuditResult(null); }}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
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
                    onClick={() => { setSelectedPresetIndex(idx); setAuditResult(null); }}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
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

            {/* Active Deal Card */}
            <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '14px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {selectedPresetIndex >= 0 ? PRESET_SCENARIOS[selectedPresetIndex].description : (dealContextOverride ? '⚡ Live Deal from Trade Builder' : 'Active Desk Consignment')}
                </div>
                {activeTrade.plantName && (
                  <div style={{ fontSize: '11px', color: '#a8a29e', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activeTrade.plantName}>
                    {activeTrade.plantName}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div><span style={{ color: '#78716c' }}>Route:</span> <strong>{activeTrade.originCountry} → {activeTrade.targetMarketId}</strong></div>
                <div><span style={{ color: '#78716c' }}>Asset ID:</span> <span style={{ fontFamily: 'monospace' }}>{activeTrade.originPlantId || 'N/A'}</span></div>
                <div><span style={{ color: '#78716c' }}>Feedstock:</span> <strong>{activeTrade.feedstockCategory}</strong></div>
                <div>
                  <span style={{ color: '#78716c' }}>Carbon Intensity:</span>{' '}
                  <strong style={{ color: activeTrade.carbonIntensity <= 32.9 ? '#10b981' : '#ef4444' }}>
                    {activeTrade.carbonIntensity} gCO2e/MJ
                  </strong>
                </div>
                {activeTrade.annualVolumeMWh !== undefined && (
                  <div><span style={{ color: '#78716c' }}>Volume:</span> <strong>{activeTrade.annualVolumeMWh.toLocaleString()} MWh</strong></div>
                )}
                {activeTrade.deliveredValueEurMwh !== undefined && (
                  <div><span style={{ color: '#78716c' }}>Delivered Price:</span> <strong>€{activeTrade.deliveredValueEurMwh.toFixed(2)}/MWh</strong></div>
                )}
              </div>

              <button
                onClick={runActiveDealAudit}
                disabled={isLoading}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '9px 14px',
                  backgroundColor: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isLoading ? 'Auditing Against 11 Statutory Dossiers...' : '⚡ Audit Deal with Statutory Vault'}
              </button>
            </div>

            {/* Audit Results */}
            {auditResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Engine Source Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    backgroundColor: auditResult.sourceEngine === 'GEMINI_LLM' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(120, 113, 108, 0.2)',
                    color: auditResult.sourceEngine === 'GEMINI_LLM' ? '#34d399' : '#d6d3d1',
                    border: `1px solid ${auditResult.sourceEngine === 'GEMINI_LLM' ? '#059669' : '#57534e'}`
                  }}>
                    {auditResult.sourceEngine === 'GEMINI_LLM' ? '✨ Grounded Gemini Flash Synthesis' : '🛡 Local Statutory Rule Engine (11 Dossiers)'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#78716c' }}>
                    Zero-Hallucination Guarded
                  </span>
                </div>

                {/* API Fallback Notice if applicable */}
                {auditResult.apiError && (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    border: '1px solid #d97706',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#fcd34d',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px'
                  }}>
                    <span>⚠</span>
                    <div>
                      <strong>API Notice:</strong> {auditResult.apiError}. Audited seamlessly via local 6-gate statutory compliance engine.
                    </div>
                  </div>
                )}

                {/* Verdict Banner */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${
                    auditResult.verdict === 'APPROVED' ? '#059669' :
                    auditResult.verdict === 'REJECTED' ? '#dc2626' : '#d97706'
                  }`,
                  backgroundColor: auditResult.verdict === 'APPROVED' ? 'rgba(5, 150, 105, 0.12)' :
                    auditResult.verdict === 'REJECTED' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: auditResult.verdict === 'APPROVED' ? '#34d399' : auditResult.verdict === 'REJECTED' ? '#f87171' : '#fbbf24' }}>
                    {auditResult.headline}
                  </div>
                </div>

                {/* Gate Checks */}
                {auditResult.checks.length > 0 && (
                  <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a8a29e', fontWeight: 700, marginBottom: '8px' }}>
                      6-Gate Statutory Breakdown
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditResult.checks.map((chk, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
                          <span style={{
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: chk.status === 'PASS' ? '#065f46' : chk.status === 'FAIL' ? '#991b1b' : '#92400e',
                            color: '#ffffff'
                          }}>
                            {chk.status}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div>{chk.details}</div>
                            {chk.citation && <div style={{ fontSize: '10px', color: '#78716c', marginTop: '2px' }}>📌 {chk.citation}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verbatim Quote Proofs (Anti-Hallucination Badge) */}
                {auditResult.quoteProofs.length > 0 && (
                  <div style={{ backgroundColor: '#181614', border: '1px solid #292524', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✓ Verbatim Proof from Local Knowledge Vault</span>
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
                <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '14px', borderRadius: '6px' }}>
                  {renderMarkdownContent(auditResult.explanation)}
                </div>

                {/* Recommendations & EFET Clauses */}
                {auditResult.recommendations.length > 0 && (
                  <div style={{ backgroundColor: '#1c1917', border: '1px solid #292524', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700, marginBottom: '6px' }}>
                      Recommended Institutional Actions & EFET Terms
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {auditResult.recommendations.map((rec, idx) => (
                        <div key={idx} style={{ fontSize: '11px', color: '#d6d3d1', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <span style={{ color: '#38bdf8' }}>→</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STATUTORY LEGAL Q&A */}
        {activeTab === 'QA' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
            {/* Quick Prompt Chips */}
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

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

            {/* Input Bar */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #292524' }}>
              <input
                type="text"
                value={qaPrompt}
                onChange={e => setQaPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendQa(); }}
                placeholder="Ask a statutory or contract question..."
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
                  padding: '8px 14px',
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

        {/* TAB 3: SETTINGS & VAULT STATUS */}
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
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>Loaded Knowledge Vault Dossiers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#a8a29e' }}>
                <div>✓ <code>01_EU_Statutory_Directives_and_RED_III.md</code> (RED III, Articles 25/29/30/31a)</div>
                <div>✓ <code>02_National_Compliance_Quotas_and_Formulas.md</code> (38. BImSchV, CPB, HBE, CIC, RTFO)</div>
                <div>✓ <code>03_UDB_and_European_Registry_Architecture.md</code> (UDB State Machine & Connectors)</div>
                <div>✓ <code>04_EFET_Biomethane_Contract_Term_Sheet_Analysis.md</code> (Standard EFET & RWE terms)</div>
                <div>✓ <code>05_Logistics_Interconnectors_and_Tariffs.md</code> (ENTSOG, IP Tariffs & Shrinkage)</div>
                <div>✓ <code>11_FuelEU_Maritime_and_EU_ETS_Shipping_Desk.md</code> (Regulation 2023/1805 & Pooling)</div>
              </div>
            </div>
          </div>
        )}

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
