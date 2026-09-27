import React from 'react';
import { Market } from '../../../domain/markets/types';
import { NetbackResult, CostInputs } from '../../../domain/netback/types';
import { AlertTriangle } from 'lucide-react';
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
    <div className="tb-form">
      {/* Hero Netback */}
      <div className="tb-form-row">
        <span className="tb-form-label">Net netback</span>
        <div className="tb-form-control">
          <div className="tb-row">
            <span className={`tb-hero tb-num ${netNetbackVal >= 0 ? 'tb-pos' : 'tb-neg'}`}>
              {signed(netNetbackVal)}{' '}
              <span className="unit">/ MWh</span>
            </span>
            <span className="chip tb-num">
              {currentSide.toUpperCase()} · {selectedMarket.unitLabel}
            </span>
          </div>
          <p className="tb-hint">
            Net Netback (Delivered Parity) · All-in wholesale netback after certificate monetization, gas index value, TSO transit tariffs, and registry surrender fees.
          </p>
          {netback.clearingPriceWarning && (
            <div className="tb-alert warn">
              <span className="tb-alert-text">
                <AlertTriangle size={14} /> {netback.clearingPriceWarning}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Deal Metrics */}
      <div className="tb-form-row">
        <span className="tb-form-label">Deal figures</span>
        <div className="tb-form-control">
          <dl className="tb-figures">
            <div>
              <dt>Contract Traded Volume</dt>
              <dd className="tb-num">{volumeMwh.toLocaleString()} MWh</dd>
            </div>
            <div>
              <dt>Gross Deal Notional</dt>
              <dd className="tb-num">€{grossTotal.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Trader Desk Margin</dt>
              <dd className={`tb-num ${marginClass}`}>
                {netback.deskMargin !== null ? `€${deskMarginEurMwh} / MWh` : '— (Unset)'}
              </dd>
            </div>
            <div>
              <dt>Annual Gross P&amp;L</dt>
              <dd className={`tb-num ${pnlClass}`}>
                {netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Pricing Stack Breakdown */}
      <div className="tb-form-row">
        <span className="tb-form-label">Pricing formation</span>
        <div className="tb-form-control">
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
          <p className="tb-hint">Commercial Pricing Formation · EUR / MWh equivalent</p>
        </div>
      </div>

      {/* Horizontal Netback Waterfall */}
      <div className="tb-form-row">
        <span className="tb-form-label">Waterfall</span>
        <div className="tb-form-control">
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
          <p className="tb-hint">Netback Waterfall Breakdown · value deduction engine</p>
        </div>
      </div>

      {/* Principal Trader Risk Suite */}
      {netback.principalRisk && (
        <div className="tb-form-row">
          <span className="tb-form-label">Principal risk</span>
          <div className="tb-form-control">
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
            <p className="tb-hint">Principal Trader Risk Suite · cross-border hedging</p>
            <AssumptionsStrip title="Risk suite assumptions" keys={RISK_SUITE_ASSUMPTIONS} />
          </div>
        </div>
      )}
    </div>
  );
}
