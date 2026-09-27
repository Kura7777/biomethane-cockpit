import React from 'react';
import { Market } from '../../../domain/markets/types';
import { NetbackResult, CostInputs } from '../../../domain/netback/types';
import { TrendingUp, AlertTriangle, DollarSign, ShieldAlert, BarChart3 } from 'lucide-react';
import { AssumptionsStrip } from '../../../shared/components/AssumptionsStrip';

const RISK_SUITE_ASSUMPTIONS = ['risk.illustrativeVolumeMwh', 'risk.replacementCeilingFloorEurPerMwh', 'risk.replacementCeilingNetbackMultiple', 'risk.fallbackProcurementPremiumEurPerMwh', 'risk.deThgBundleRefNeg80EurPerMwh', 'risk.deThgBundleRefNeg0EurPerMwh'];

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
}: TradeEconomicsStepProps) {
  const isPositivePnl = (netback.deskMargin ?? 0) >= 0;

  const signed = (v: number) => (v >= 0 ? `+€${v.toFixed(2)}` : `−€${Math.abs(v).toFixed(2)}`);
  const marginClass = netback.deskMargin === null ? 'tb-muted' : isPositivePnl ? 'tb-pos' : 'tb-neg';
  const pnlClass = netback.deskMargin === null ? 'tb-muted' : isPositivePnl ? 'tb-pos' : 'tb-neg';

  return (
    <div className="tb-step">
      {/* Hero Netback Card */}
      <section className="tb-panel">
        <div className="tb-panel-head">
          <h3 className="tb-panel-title">
            <TrendingUp size={16} /> Net Netback (Delivered Parity)
          </h3>
          <span className="chip tb-num">
            {currentSide.toUpperCase()} · {selectedMarket.unitLabel}
          </span>
        </div>

        <div className={`tb-hero tb-num ${netNetbackVal >= 0 ? 'tb-pos' : 'tb-neg'}`}>
          {signed(netNetbackVal)}{' '}
          <span className="unit">/ MWh</span>
        </div>

        <p className="tb-hint">
          All-in wholesale netback after certificate monetization, gas index value, TSO transit tariffs, and registry surrender fees.
        </p>

        {netback.clearingPriceWarning && (
          <div className="tb-alert warn">
            <span className="tb-alert-text">
              <AlertTriangle size={14} /> {netback.clearingPriceWarning}
            </span>
          </div>
        )}
      </section>

      {/* Deal Metrics */}
      <div className="tb-metrics">
        <div className="tb-metric">
          <span className="tb-label">Contract Traded Volume</span>
          <span className="tb-metric-value tb-num">{volumeMwh.toLocaleString()} MWh</span>
        </div>
        <div className="tb-metric">
          <span className="tb-label">Gross Deal Notional</span>
          <span className="tb-metric-value tb-num">€{grossTotal.toLocaleString()}</span>
        </div>
        <div className="tb-metric">
          <span className="tb-label">Trader Desk Margin</span>
          <span className={`tb-metric-value tb-num ${marginClass}`}>
            {netback.deskMargin !== null ? `€${deskMarginEurMwh} / MWh` : '— (Unset)'}
          </span>
        </div>
        <div className="tb-metric">
          <span className="tb-label">Annual Gross P&amp;L</span>
          <span className={`tb-metric-value tb-num ${pnlClass}`}>
            {netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}
          </span>
        </div>
      </div>

      {/* Pricing Stack Breakdown Table */}
      <section className="tb-panel">
        <div className="tb-panel-head">
          <h3 className="tb-panel-title">
            <DollarSign size={16} /> Commercial Pricing Formation
          </h3>
          <span className="tb-panel-meta">EUR / MWh equivalent</span>
        </div>

        <div className="tb-kv">
          <div className="tb-kv-row">
            <span>1. Environmental Certificate Premium:</span>
            <span className="tb-pos">+€{(netback.certificateValue?.valueEurPerMWh ?? 0).toFixed(2)} / MWh</span>
          </div>
          <div className="tb-kv-row">
            <span>2. Wholesale Gas Molecule Value:</span>
            <span>+€{(netback.moleculeValue ?? 0).toFixed(2)} / MWh</span>
          </div>
          <div className="tb-kv-row">
            <span>3. Transfer, Registry &amp; Certification:</span>
            <span className="tb-neg">−€{((costs?.transferCosts ?? 0) + (costs?.certificationCosts ?? 0)).toFixed(2)} / MWh</span>
          </div>
          <div className="tb-kv-row">
            <span>4. TSO Gas Transit Tariffs ({origin} → {selectedMarket.country}):</span>
            <span className="tb-neg">−€{(costs?.logistics ?? 0).toFixed(2)} / MWh</span>
          </div>
          {netback.producerPayable !== null && (
            <div className="tb-kv-row">
              <span>5. Producer Payable (Offtake Floor):</span>
              <span className="tb-neg">−€{netback.producerPayable.toFixed(2)} / MWh</span>
            </div>
          )}
          <div className="tb-kv-row total">
            <span>Net Trader Desk Spread:</span>
            <span className={isPositivePnl ? 'tb-pos' : 'tb-neg'}>€{deskMarginEurMwh} / MWh</span>
          </div>
        </div>
      </section>

      {/* Horizontal Netback Waterfall Card */}
      <section className="tb-panel">
        <div className="tb-panel-head">
          <h3 className="tb-panel-title">
            <BarChart3 size={16} /> Netback Waterfall Breakdown
          </h3>
          <span className="tb-panel-meta">Value deduction engine</span>
        </div>

        <div className="tb-waterfall">
          {waterfallRows.map((w, wIdx) => {
            const barPct = Math.min(100, (w.num / waterfallMax) * 100);
            return (
              <div key={wIdx} className="tb-waterfall-row">
                <span className="tb-waterfall-label" title={w.label}>{w.label}</span>
                <div className="tb-waterfall-track">
                  <div className={`tb-waterfall-bar ${w.kind}`} style={{ width: `${barPct}%` }} />
                </div>
                <span className="tb-waterfall-value tb-num">{w.val}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Principal Trader Risk Suite */}
      {netback.principalRisk && (
        <section className="tb-panel">
          <div className="tb-panel-head">
            <h3 className="tb-panel-title warn">
              <ShieldAlert size={16} /> Principal Trader Risk Suite
            </h3>
            <span className="tb-panel-meta">Cross-border hedging</span>
          </div>

          <div className="tb-kv">
            {/* Hub Basis Risk */}
            <div className="tb-kv-row">
              <span className="tb-kv-stack">
                <span className="tb-kv-strong">Hub Basis Spread:</span>
                <span>Physical delivery differential ({origin} → {selectedMarket.country})</span>
              </span>
              <span className="tb-kv-stack end">
                <span>{signed(netback.principalRisk.basisDifferentialEurMwh)}/MWh</span>
                <span className="tb-kv-sub">€{netback.principalRisk.basisRiskNotionalEur.toLocaleString()} notional</span>
              </span>
            </div>

            {/* Delivery Default Replacement Risk */}
            <div className="tb-kv-row">
              <span className="tb-kv-stack">
                <span className="tb-kv-strong tb-neg">Default Replacement Risk:</span>
                <span>Secondary market replacement exposure</span>
              </span>
              <span className="tb-neg">€{netback.principalRisk.replacementCostExposureEur.toLocaleString()} at risk</span>
            </div>
          </div>

          {/* German 2026 Cliff Impact (if applicable) */}
          {netback.principalRisk.germanCliffImpactEurMwh !== null && netback.principalRisk.germanCliffImpactEurMwh !== undefined && (
            <div className="tb-alert neg tb-alert-block">
              <span className="tb-row tb-full">
                <span className="tb-alert-text">
                  <AlertTriangle size={14} /> German 2026 Double-Counting Cliff:
                </span>
                <span className="tb-num">−€{netback.principalRisk.germanCliffImpactEurMwh.toFixed(2)}/MWh</span>
              </span>
              <p className="tb-alert-body">
                Statutory sunset on manure multiplier eliminates −€{netback.principalRisk.germanCliffNotionalEur?.toLocaleString()} of quota value post-2026.
              </p>
            </div>
          )}
          <AssumptionsStrip title="Risk suite assumptions" keys={RISK_SUITE_ASSUMPTIONS} />
        </section>
      )}
    </div>
  );
}
