import React, { useMemo } from 'react';
import { Market } from '../../../domain/markets/types';
import { MARKETS, isVoluntaryMarket } from '../../../domain/markets/registry';
import { EligibilityAssessment } from '../../../domain/eligibility/types';
import { ArrowLeft, ArrowRight, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Scale, ExternalLink } from 'lucide-react';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

interface TradeMarketAuditStepProps {
  marketId: string;
  setMarketId: (id: string) => void;
  selectedMarket: Market;
  assessment: EligibilityAssessment;
  ghgSavingPct: number;
  origin: string;
  onBack: () => void;
  onNext: () => void;
}

export function TradeMarketAuditStep({
  marketId,
  setMarketId,
  selectedMarket,
  assessment,
  ghgSavingPct,
  origin,
  onBack,
  onNext,
}: TradeMarketAuditStepProps) {
  const isPass = assessment.overallVerdict === 'ELIGIBLE';
  const isBlock = assessment.overallVerdict === 'HARD_BLOCK';
  const isConditional = assessment.overallVerdict === 'CONDITIONAL';

  // Group markets by statutory sector
  const transportMarkets = useMemo(() => {
    return MARKETS.filter(m => m.status === 'ACTIVE' && (m.sector === 'TRANSPORT' || ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'UK_RTFO'].includes(m.id)));
  }, []);

  const industrialMarkets = useMemo(() => {
    return MARKETS.filter(m => m.status === 'ACTIVE' && (m.sector === 'HEAT_POWER' || m.id === 'EU_ETS_INDUSTRIAL'));
  }, []);

  const voluntaryMarkets = useMemo(() => {
    return MARKETS.filter(m => m.status === 'ACTIVE' && (isVoluntaryMarket(m.id) || ['DE_GO', 'NL_GO', 'FR_GO', 'UK_RGGO', 'VOL_SCOPE1'].includes(m.id)));
  }, []);

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-5 space-y-4">
      {/* 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* Left Column: Target Market Matrix & Jurisdiction Selector */}
        <div className="space-y-4">
          
          {/* Market Directory & Selector Card */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '9px 14px',
                borderBottom: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-panel-header)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={13} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Target Compliance Destination
                </span>
              </div>
              <span style={{ fontSize: '9.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                16 STATUTORY JURISDICTIONS
              </span>
            </div>

            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Transport Quota Markets */}
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '6px' }}>
                  National Transport Quotas (RED III Annex IX-A)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {transportMarkets.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`chip ${m.id === marketId ? 'chip-a' : ''}`}
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => setMarketId(m.id)}
                    >
                      <span>{m.country}</span>
                      <span>·</span>
                      <span>{m.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Industrial ETS */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '6px' }}>
                  Compliance Industrial ETS (Directive (EU) 2023/959)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {industrialMarkets.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`chip ${m.id === marketId ? 'chip-a' : ''}`}
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => setMarketId(m.id)}
                    >
                      <span>EU</span>
                      <span>·</span>
                      <span>{m.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voluntary Guarantees of Origin */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '6px' }}>
                  Voluntary &amp; Guarantees of Origin (Unbundled / Scope 1)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {voluntaryMarkets.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`chip ${m.id === marketId ? 'chip-a' : ''}`}
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => setMarketId(m.id)}
                    >
                      <span>{m.country}</span>
                      <span>·</span>
                      <span>{m.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Active Market Profile Card */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Statutory Route
                </span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--color-text)' }}>
                  {selectedMarket.name}
                </h3>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: MONO_FONT,
                  padding: '3px 10px',
                  border: isPass
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : isBlock
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(234, 179, 8, 0.4)',
                  backgroundColor: isPass
                    ? 'rgba(16, 185, 129, 0.12)'
                    : isBlock
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(234, 179, 8, 0.12)',
                  color: isPass
                    ? 'var(--color-status-pos-text)'
                    : isBlock
                    ? 'var(--color-status-neg-text)'
                    : 'var(--color-warning)',
                }}
              >
                {isPass ? 'ELIGIBLE (6/6 PASS)' : isBlock ? 'HARD BLOCKED' : isConditional ? 'CONDITIONAL' : 'UNRESOLVED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--color-muted)', lineHeight: 1.5, marginTop: '8px' }}>
              <div>
                <strong style={{ color: 'var(--color-text)' }}>Jurisdiction:</strong> {selectedMarket.country} ({selectedMarket.sector})
              </div>
              <div>
                <strong style={{ color: 'var(--color-text)' }}>Statutory Registry:</strong> {selectedMarket.registry || 'National Registry'}
              </div>
              <div className="sm:col-span-2">
                <strong style={{ color: 'var(--color-text)' }}>Primary Directive:</strong> {selectedMarket.legalBasis}
              </div>
              <div>
                <strong style={{ color: 'var(--color-text)' }}>Unit of Account:</strong> {selectedMarket.unitLabel}
              </div>
              <div>
                <strong style={{ color: 'var(--color-text)' }}>Compliance Period:</strong> Annual statutory surrender
              </div>
            </div>

            {/* Voluntary Book-and-Claim Callout */}
            {isVoluntaryMarket(selectedMarket.id) && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 12px',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  fontSize: '11.5px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--color-accent)', marginBottom: '3px' }}>
                  📦 UNBUNDLED BOOK-AND-CLAIM SCHEME
                </div>
                <div style={{ color: 'var(--color-text)' }}>
                  Single-leg Guarantee of Origin (GoO) registry transfer. <strong>No physical gas molecule delivery to counterparty</strong>. Biomethane remains in the {origin} domestic gas grid; buyer acquires verified environmental attributes only.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Six-Gate Statutory Regulatory Audit */}
        <div className="space-y-4">
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '9px 14px',
                borderBottom: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-panel-header)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={13} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  RED III Six-Gate Regulatory Audit
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const activeDeal = (typeof window !== 'undefined' && (window as any).__ACTIVE_TRADE_BUILDER_DEAL__) || {};
                    const activeCi = typeof activeDeal.carbonIntensity === 'number' ? activeDeal.carbonIntensity : Math.round(94.0 * (1 - ghgSavingPct / 100));
                    window.dispatchEvent(new CustomEvent('open-compliance-auditor', {
                      detail: {
                        ...activeDeal,
                        originCountry: origin,
                        targetMarketId: marketId,
                        targetMarketName: selectedMarket.name,
                        carbonIntensity: activeCi,
                        initialTab: 'GATE_BREAKDOWN'
                      }
                    }));
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '2px 8px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    borderColor: 'var(--color-accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Run deep statutory audit with closed-domain AI & legal vault"
                >
                  <span>⚖ Run Forensic Statutory Audit</span>
                </button>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontFamily: MONO_FONT,
                    fontWeight: 700,
                    color: isPass ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)',
                  }}
                >
                  {assessment.gates.filter(g => g.verdict === 'PASS').length} OF 6 GATES CLEAR
                </span>
              </div>
            </div>

            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assessment.gates.map((g, gIdx) => {
                const gatePass = g.verdict === 'PASS';
                const gateBlock = g.verdict === 'HARD_BLOCK';
                const gateConditional = g.verdict === 'CONDITIONAL';

                return (
                  <div
                    key={gIdx}
                    onClick={() => {
                      const activeDeal = (typeof window !== 'undefined' && (window as any).__ACTIVE_TRADE_BUILDER_DEAL__) || {};
                      const activeCi = typeof activeDeal.carbonIntensity === 'number' ? activeDeal.carbonIntensity : Math.round(94.0 * (1 - ghgSavingPct / 100));
                      window.dispatchEvent(new CustomEvent('open-compliance-auditor', {
                        detail: {
                          ...activeDeal,
                          originCountry: origin,
                          targetMarketId: marketId,
                          targetMarketName: selectedMarket.name,
                          carbonIntensity: activeCi,
                          initialTab: 'GATE_BREAKDOWN',
                          focusedGateIndex: gIdx
                        }
                      }));
                    }}
                    style={{
                      border: isBlock && gateBlock ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--color-divider)',
                      backgroundColor: 'var(--color-subtier)',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Click to audit Gate ${gIdx + 1} with Chief Regulatory Officer`}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {gatePass ? (
                          <CheckCircle2 size={13} style={{ color: 'var(--color-status-pos-text)' }} />
                        ) : gateBlock ? (
                          <XCircle size={13} style={{ color: 'var(--color-status-neg-text)' }} />
                        ) : (
                          <AlertTriangle size={13} style={{ color: 'var(--color-warning)' }} />
                        )}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
                          Gate {gIdx + 1}: {g.gateLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(!gatePass) && (
                          <span style={{ fontSize: '10px', color: 'var(--color-accent)', textDecoration: 'underline' }}>
                            ⚖ Audit Gate →
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontFamily: MONO_FONT,
                            fontWeight: 700,
                            padding: '1px 6px',
                            border: gatePass
                              ? '1px solid rgba(16, 185, 129, 0.4)'
                              : gateBlock
                              ? '1px solid rgba(239, 68, 68, 0.4)'
                              : '1px solid rgba(234, 179, 8, 0.4)',
                            backgroundColor: gatePass
                              ? 'rgba(16, 185, 129, 0.12)'
                              : gateBlock
                              ? 'rgba(239, 68, 68, 0.12)'
                              : 'rgba(234, 179, 8, 0.12)',
                            color: gatePass
                              ? 'var(--color-status-pos-text)'
                              : gateBlock
                              ? 'var(--color-status-neg-text)'
                              : 'var(--color-warning)',
                          }}
                        >
                          {gatePass
                            ? (gIdx === 3 ? 'Pass · Annex IX-A' : gIdx === 4 ? `Pass · ${ghgSavingPct}% GHG` : 'Pass')
                            : gateBlock
                            ? 'Blocked'
                            : 'Conditional'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', lineHeight: 1.45, marginTop: '3px' }}>
                      {g.reason}
                    </div>

                    <div style={{ fontSize: '10.5px', color: 'var(--color-accent)', marginTop: '4px', fontFamily: MONO_FONT }}>
                      📜 {g.citations[0]?.shortName || g.citations[0]?.fullReference || 'RED III Statutory Directive'}
                    </div>
                  </div>
                );
              })}
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
          <span>Back: Consignment &amp; Asset</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary"
          style={{ height: '32px', padding: '0 18px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <span>Next: Economics, Waterfall &amp; Risk</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
