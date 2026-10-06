import React from 'react';
import { Link } from 'react-router-dom';
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
  isTtfSimulated?: boolean;
  /** "Corridor transit DK→DE €1.80/MWh" (Origination's getRouteTransitTariff rule), or the
   *  fallback wording when no corridor tariff applies. */
  transitLabel: string;
}

const SIMULATED_TTF_TITLE = 'TTF mark is simulated. Set a real mark on the Assumptions or Pricing desk screen.';

function SimulatedTag() {
  return (
    <span
      className="chip"
      title={SIMULATED_TTF_TITLE}
      style={{
        fontSize: '12px',
        fontWeight: 600,
        padding: '1px 6px',
        marginLeft: '6px',
        borderRadius: 'var(--radius-bar)',
        border: '1px solid var(--color-status-warn-border)',
        backgroundColor: 'var(--color-status-warn-bg)',
        color: 'var(--color-status-warn-ink)',
      }}
    >
      Simulated
    </span>
  );
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
  isTtfSimulated,
  transitLabel,
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
          {netback.netbackCappedAt != null && netback.theoreticalNetback != null && (
            <p className="tb-hint">
              Realisable, capped at the traded bundle price. Modelled ceiling{' '}
              <span className="tb-num">{signed(netback.theoreticalNetback)} / MWh</span> assumes the full quota value.
            </p>
          )}
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
              <dt>Deal Gross P&amp;L</dt>
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
          <p className="tb-hint" style={{ marginTop: 0 }}>
            Costs below are desk-wide — set once for every deal.{' '}
            <Link to="/pricing?tab=costs" className="underline">Edit in Pricing desk → Costs</Link>
          </p>
          <div className="tb-kv">
            <div className="tb-kv-row">
              <span>Environmental certificate premium</span>
              <span className="tb-pos">+€{(netback.certificateValue?.valueEurPerMWh ?? 0).toFixed(2)} / MWh</span>
            </div>
            <div className="tb-kv-row">
              <span>Wholesale gas molecule value{isTtfSimulated && <SimulatedTag />}</span>
              <span>+€{(netback.moleculeValue ?? 0).toFixed(2)} / MWh</span>
            </div>
            <div className="tb-kv-row">
              <span>Transfer, registry &amp; certification</span>
              <span className="tb-neg">−€{((costs?.transferCosts ?? 0) + (costs?.certificationCosts ?? 0)).toFixed(2)} / MWh</span>
            </div>
            <div className="tb-kv-row">
              <span>{transitLabel}</span>
              <span className="tb-neg">−€{(costs?.logistics ?? 0).toFixed(2)} / MWh</span>
            </div>
            {netback.netbackCappedAt != null && netback.theoreticalNetback != null && (
              <div className="tb-kv-row">
                <span title="The market pays the traded bundle price, not the full modelled quota value">Bundle cap (not captured)</span>
                <span className="tb-neg">−€{(netback.theoreticalNetback - netNetbackVal).toFixed(2)} / MWh</span>
              </div>
            )}
            {netback.producerPayable !== null && (
              <div className="tb-kv-row">
                <span>Producer payable (offtake floor)</span>
                <span className="tb-neg">−€{netback.producerPayable.toFixed(2)} / MWh</span>
              </div>
            )}
            <div className="tb-kv-row total">
              <span>Net trader desk spread</span>
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
                  <span className="tb-waterfall-label" title={w.label}>
                    {w.label}
                    {isTtfSimulated && w.label.startsWith('Molecule value') && <SimulatedTag />}
                  </span>
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

            <p className="tb-hint">Principal Trader Risk Suite · cross-border hedging</p>
            <AssumptionsStrip title="Risk suite assumptions" keys={RISK_SUITE_ASSUMPTIONS} />
          </div>
        </div>
      )}
    </div>
  );
}
