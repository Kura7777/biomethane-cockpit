import React from 'react';
import { Market } from '../../../domain/markets/types';
import { NetbackResult, CostInputs } from '../../../domain/netback/types';
import { ArrowLeft, ArrowRight, TrendingUp, AlertTriangle, DollarSign, ShieldAlert, BarChart3 } from 'lucide-react';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export interface WaterfallRow {
  label: string;
  val: string;
  num: number;
  kind: 'add' | 'sub' | 'net' | 'margin';
}

interface TradeEconomicsStepProps {
  netback: NetbackResult;
  costs: CostInputs;
  selectedMarket: Market;
  currentSide: string;
  netNetbackVal: number;
  waterfallRows: WaterfallRow[];
  waterfallMax: number;
  volumeMwh: number;
  grossTotal: number;
  deskMarginEurMwh: string;
  annualPnl: number;
  origin: string;
  onBack: () => void;
  onNext: () => void;
}

export function TradeEconomicsStep({
  netback,
  costs,
  selectedMarket,
  currentSide,
  netNetbackVal,
  waterfallRows,
  waterfallMax,
  volumeMwh,
  grossTotal,
  deskMarginEurMwh,
  annualPnl,
  origin,
  onBack,
  onNext,
}: TradeEconomicsStepProps) {
  const isPositivePnl = (netback.deskMargin ?? 0) >= 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-5 space-y-4">
      {/* 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* Left Column: Hero Figure, 2x2 Metric Grid, Netback Summary */}
        <div className="space-y-4">
          
          {/* Hero Netback Card */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-muted)' }}>
                Net Netback (Delivered Parity)
              </span>
              <span className="chip" style={{ fontSize: '10px', fontFamily: MONO_FONT }}>
                {currentSide.toUpperCase()} · {selectedMarket.unitLabel}
              </span>
            </div>

            <div
              style={{
                fontFamily: MONO_FONT,
                fontWeight: 800,
                fontSize: '48px',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                margin: '8px 0 4px',
                color: netNetbackVal >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)',
              }}
            >
              {netNetbackVal >= 0 ? `+€${netNetbackVal.toFixed(2)}` : `−€${Math.abs(netNetbackVal).toFixed(2)}`}
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '6px' }}>/ MWh</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              All-in wholesale netback after certificate monetization, gas index value, TSO transit tariffs, and registry surrender fees.
            </div>

            {netback.clearingPriceWarning && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  fontSize: '11.5px',
                  color: 'var(--color-warning)',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={14} className="shrink-0" />
                <span>{netback.clearingPriceWarning}</span>
              </div>
            )}
          </div>

          {/* 2x2 Deal Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1px',
              backgroundColor: 'var(--color-divider)',
              border: '1px solid var(--color-divider)',
            }}
          >
            <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '3px' }}>
                Contract Traded Volume
              </div>
              <div style={{ fontFamily: MONO_FONT, fontSize: '18px', fontWeight: 800, color: 'var(--color-text)' }}>
                {volumeMwh.toLocaleString()} MWh
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '3px' }}>
                Gross Deal Notional
              </div>
              <div style={{ fontFamily: MONO_FONT, fontSize: '18px', fontWeight: 800, color: 'var(--color-text)' }}>
                €{grossTotal.toLocaleString()}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '3px' }}>
                Trader Desk Margin
              </div>
              <div
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: '18px',
                  fontWeight: 800,
                  color: netback.deskMargin !== null ? (isPositivePnl ? 'var(--color-accent)' : 'var(--color-status-neg-text)') : 'var(--color-muted)',
                }}
              >
                {netback.deskMargin !== null ? `€${deskMarginEurMwh} / MWh` : '— (Unset)'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '3px' }}>
                Annual Gross P&amp;L
              </div>
              <div
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: '18px',
                  fontWeight: 800,
                  color: netback.deskMargin !== null ? (isPositivePnl ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)') : 'var(--color-muted)',
                }}
              >
                {netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}
              </div>
            </div>
          </div>

          {/* Pricing Stack Breakdown Table */}
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
                <DollarSign size={13} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Commercial Pricing Formation
                </span>
              </div>
              <span style={{ fontSize: '9.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                EUR / MWH EQUIVALENT
              </span>
            </div>

            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-divider)' }}>
                <span style={{ color: 'var(--color-muted)' }}>1. Environmental Certificate Premium:</span>
                <strong style={{ fontFamily: MONO_FONT, color: 'var(--color-status-pos-text)' }}>
                  +€{(netback.certificateValue?.valueEurPerMWh ?? 0).toFixed(2)} / MWh
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-divider)' }}>
                <span style={{ color: 'var(--color-muted)' }}>2. Wholesale Gas Molecule Value:</span>
                <strong style={{ fontFamily: MONO_FONT, color: 'var(--color-text)' }}>
                  +€{(netback.moleculeValue ?? 0).toFixed(2)} / MWh
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-divider)' }}>
                <span style={{ color: 'var(--color-muted)' }}>3. Transfer, Registry &amp; Certification:</span>
                <strong style={{ fontFamily: MONO_FONT, color: 'var(--color-status-neg-text)' }}>
                  −€{((costs?.transferCosts ?? 0) + (costs?.certificationCosts ?? 0)).toFixed(2)} / MWh
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-divider)' }}>
                <span style={{ color: 'var(--color-muted)' }}>4. TSO Gas Transit Tariffs ({origin} ➔ {selectedMarket.country}):</span>
                <strong style={{ fontFamily: MONO_FONT, color: 'var(--color-status-neg-text)' }}>
                  −€{(costs?.logistics ?? 0).toFixed(2)} / MWh
                </strong>
              </div>
              {netback.producerPayable !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <span style={{ color: 'var(--color-muted)' }}>5. Producer Payable (Offtake Floor):</span>
                  <strong style={{ fontFamily: MONO_FONT, color: 'var(--color-status-neg-text)' }}>
                    −€{netback.producerPayable.toFixed(2)} / MWh
                  </strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 800, fontSize: '13px' }}>
                <span>Net Trader Desk Spread:</span>
                <span style={{ fontFamily: MONO_FONT, color: isPositivePnl ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                  €{deskMarginEurMwh} / MWh
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Waterfall Chart & Principal Risk Suite */}
        <div className="space-y-4">
          
          {/* Horizontal Netback Waterfall Card */}
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
                <BarChart3 size={13} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Netback Waterfall Breakdown
                </span>
              </div>
              <span style={{ fontSize: '9.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                VALUE DEDUCTION ENGINE
              </span>
            </div>

            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {waterfallRows.map((w, wIdx) => {
                const barPct = Math.min(100, (w.num / waterfallMax) * 100);
                return (
                  <div
                    key={wIdx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '150px minmax(0, 1fr) 75px',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '3px 0',
                    }}
                  >
                    <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={w.label}>
                      {w.label}
                    </span>
                    <div style={{ position: 'relative', height: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: 0,
                          width: `${barPct}%`,
                          backgroundColor: w.kind === 'sub'
                            ? 'var(--color-muted)'
                            : w.kind === 'net'
                            ? 'var(--color-accent)'
                            : w.kind === 'margin'
                            ? 'var(--color-status-pos-text)'
                            : 'var(--color-text)',
                        }}
                      />
                    </div>
                    <span style={{ fontFamily: MONO_FONT, textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
                      {w.val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Principal Trader Risk Suite */}
          {netback.principalRisk && (
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
                  <ShieldAlert size={13} style={{ color: 'var(--color-warning)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Principal Trader Risk Suite
                  </span>
                </div>
                <span style={{ fontSize: '9.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                  CROSS-BORDER HEDGING
                </span>
              </div>

              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                {/* Hub Basis Risk */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Hub Basis Spread:</span>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>
                      Physical delivery differential ({origin} ➔ {selectedMarket.country})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: MONO_FONT }}>
                    <strong style={{ fontSize: '13px' }}>
                      {netback.principalRisk.basisDifferentialEurMwh >= 0 ? `+€${netback.principalRisk.basisDifferentialEurMwh.toFixed(2)}` : `−€${Math.abs(netback.principalRisk.basisDifferentialEurMwh).toFixed(2)}`}/MWh
                    </strong>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>
                      €{netback.principalRisk.basisRiskNotionalEur.toLocaleString()} notional
                    </div>
                  </div>
                </div>

                {/* Delivery Default Replacement Risk */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--color-divider)' }}>
                  <div>
                    <span style={{ color: 'var(--color-status-neg-text)', fontWeight: 600 }}>Default Replacement Risk:</span>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>
                      Secondary market replacement exposure
                    </div>
                  </div>
                  <span style={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: '13px', color: 'var(--color-status-neg-text)' }}>
                    €{netback.principalRisk.replacementCostExposureEur.toLocaleString()} at risk
                  </span>
                </div>

                {/* German 2026 Cliff Impact (if applicable) */}
                {netback.principalRisk.germanCliffImpactEurMwh !== null && netback.principalRisk.germanCliffImpactEurMwh !== undefined && (
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '8px 10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '11.5px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-status-neg-text)', fontWeight: 700 }}>
                        German 2026 Double-Counting Cliff:
                      </span>
                      <span style={{ fontFamily: MONO_FONT, fontWeight: 800, color: 'var(--color-status-neg-text)' }}>
                        −€{netback.principalRisk.germanCliffImpactEurMwh.toFixed(2)}/MWh
                      </span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      Statutory sunset on manure multiplier eliminates −€{netback.principalRisk.germanCliffNotionalEur?.toLocaleString()} of quota value post-2026.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
          <span>Back: Destination &amp; Audit</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary"
          style={{ height: '32px', padding: '0 18px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <span>Next: Deal Package &amp; Term Sheet</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
