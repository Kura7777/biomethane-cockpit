import React from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { ClientRequest } from '../../domain/arbitrage/types';
import { defaultVolumeMwh } from '../../domain/trade/dealDefaults';
import {
  computeOriginationBreakdown,
  fmtEurPerMwh,
  fmtEurTotal,
  type PriceSource,
} from '../../domain/arbitrage/originationBreakdown';
import { SourceChip } from '../../shared/ui/SourceChip';
import { RouteStatusBadge } from './RouteStatusBadge';
import { SourcedOpportunity } from './PlantScannerTable';
import { RouteVerdictCard } from '../map/RouteVerdictCard';
import { MarketLadder } from './MarketLadder';
import { 
  ArrowLeft, 
  ArrowRight, 
  Calculator, 
  TrendingUp, 
  Navigation, 
  DollarSign, 
  ShieldCheck, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface Step3RouteAndCostsProps {
  request: ClientRequest;
  opportunity: SourcedOpportunity;
  onBack: () => void;
  onNext: () => void;
}

export function Step3RouteAndCosts({
  request,
  opportunity,
  onBack,
  onNext
}: Step3RouteAndCostsProps) {
  const { state } = useAppState();
  const vol = request.volumeMwh || defaultVolumeMwh();
  const b = computeOriginationBreakdown({
    opportunity,
    volumeMwh: vol,
    marks: state.marks,
    costs: state.costs,
  });
  const {
    plantGateEur,
    gridLogisticsEur,
    certificationEur,
    totalDeliveredCostEur,
    grossRevenueEur: totalGrossRevenueEur,
    gasIndexEur,
    certificateValueEur,
    netMarginEurPerMwh,
    totalDealProfitEur,
    totalDealCostEur,
    totalDealRevenueEur,
    isProfitable,
  } = b;
  const sourceChip = (src: PriceSource | null) =>
    src ? <SourceChip badge={src.badge} suffix={src.asOf ? `mark ${src.asOf}` : 'no date on record'} /> : null;

  const transitSteps = opportunity.originCountry === opportunity.targetCountry
    ? [opportunity.originCountry]
    : [opportunity.originCountry, opportunity.targetCountry];

  return (
    <div className="cf-step max-w-5xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="mb-5">
        <div
          style={{
            borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--color-track)',
            borderColor: 'var(--color-line)',
            color: 'var(--color-text)',
          }}
          className="cf-pill inline-flex items-center gap-2 px-3 py-1 border text-xs font-medium mb-2.5"
        >
          <span style={{ backgroundColor: 'var(--color-accent)' }} className="w-2 h-2 rounded-full" />
          Step 3 of 4: Route planning &amp; cost breakdown
        </div>
        <h1 style={{ color: 'var(--color-text)' }} className="text-xl sm:text-2xl font-semibold mb-1.5">
          Route verdict &amp; cost breakdown
        </h1>
        <p style={{ color: 'var(--color-muted)' }} className="text-xs sm:text-sm font-normal max-w-2xl">
          Every price below comes from the Pricing desk marks or your cost inputs and shows where it came from. Routes marked Review needed have an open eligibility condition.
        </p>
      </div>

      {/* Main Grid: Map on Left, Financial Waterfall on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-stretch">
        {/* Left Column: Visual Map (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-card)',
            }}
            className="border p-4 flex-1 flex flex-col shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">
                  Route verdict (certificates and mass balance)
                </span>
              </div>
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-track)',
                  borderColor: 'var(--color-line)',
                  color: 'var(--color-text)',
                }}
                className="text-xs border px-2 py-0.5 font-medium"
              >
                {opportunity.originCountry} → {opportunity.targetCountry}
              </span>
            </div>

            {/* Route verdict: the same card the map and the market ladder show */}
            <RouteVerdictCard
              origin={opportunity.originCountry}
              target={opportunity.targetCountry}
              showMapLink
            />

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              <RouteStatusBadge verdict={opportunity.overallVerdict} detail={opportunity.eligibility.summary} />
              <span style={{ color: 'var(--color-muted)' }} className="text-[11px]">{opportunity.eligibility.summary}</span>
            </div>

            <div style={{ color: 'var(--color-muted)' }} className="mt-2 text-[11px]" data-testid="corridor-line">
              Corridor {transitSteps.join(' → ')} · {transitSteps.length - 1 > 0 ? `${transitSteps.length - 1} hop${transitSteps.length - 1 === 1 ? '' : 's'}` : 'direct grid'}
              {opportunity.logisticsDistanceKm ? ` · ${Math.round(opportunity.logisticsDistanceKm)} km` : ''}
            </div>

            {/* Route Stats */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                }}
                className="p-2.5 border"
              >
                <span style={{ color: 'var(--color-muted)' }} className="text-[10px] block">Origin plant</span>
                <span style={{ color: 'var(--color-text)' }} className="font-medium truncate block mt-0.5">
                  {opportunity.originPlantName || opportunity.originCountry}
                </span>
              </div>
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                }}
                className="p-2.5 border"
              >
                <span style={{ color: 'var(--color-muted)' }} className="text-[10px] block">Buyer hub</span>
                <span style={{ color: 'var(--color-text)' }} className="font-medium truncate block mt-0.5">
                  {opportunity.targetMarketName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Waterfall (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-card)',
            }}
            className="border p-5 shadow-xs flex-1 flex flex-col"
          >
            {/* Waterfall Header */}
            <div
              style={{ borderColor: 'var(--color-line)' }}
              className="cf-wfhead flex items-center justify-between pb-3 mb-3 border-b"
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">
                  Full cost breakdown &amp; revenue waterfall
                </span>
              </div>

              {/* Spread badge: blue for positive, red for negative */}
              <div
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: isProfitable ? 'var(--color-status-info-bg)' : 'var(--color-status-fail-bg)',
                  borderColor: isProfitable ? 'var(--color-status-info-border)' : 'var(--color-status-fail-border)',
                  color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)',
                }}
                className="px-2.5 py-1 border flex items-center gap-1.5"
              >
                {isProfitable ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span className="text-xs font-bold tabular-nums">
                  {isProfitable ? '+' : ''}{fmtEurPerMwh(netMarginEurPerMwh)}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2.5 text-xs flex-1">
              {/* Cost Section */}
              <div style={{ color: 'var(--color-muted)' }} className="text-[11px] font-medium">
                1. Delivered costs (what you pay)
              </div>

              {/* Plant Cost */}
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                }}
                className="flex items-center justify-between p-2.5 border"
              >
                <div>
                  <span style={{ color: 'var(--color-text)' }} className="font-medium block">Plant gate sourcing cost</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block">{opportunity.feedstockName} substrate</span>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-text)' }} className="font-semibold tabular-nums">€{plantGateEur.toFixed(2)}/MWh</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block tabular-nums">Total: €{Math.round(plantGateEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Grid Logistics */}
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                }}
                className="flex items-center justify-between p-2.5 border"
              >
                <div>
                  <span style={{ color: 'var(--color-text)' }} className="font-medium block">Grid entry/exit &amp; corridor tariffs</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block">{opportunity.logisticsDistanceKm ? `${Math.round(opportunity.logisticsDistanceKm)} km corridor` : 'Direct grid'}</span>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-pnl-neg)' }} className="font-semibold tabular-nums">€{gridLogisticsEur.toFixed(2)}/MWh</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block tabular-nums">Total: €{Math.round(gridLogisticsEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Certification */}
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                }}
                className="flex items-center justify-between p-2.5 border"
              >
                <div>
                  <span style={{ color: 'var(--color-text)' }} className="font-medium block">Mass balance &amp; proof of sustainability</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block">Certification cost input</span>
                  <span className="text-[11px] flex items-center gap-1.5 flex-wrap mt-1" data-testid="cert-source">
                    {certificationEur === null ? (
                      <span style={{ color: 'var(--color-pnl-neg)' }} className="font-medium">Not set. Left out of delivered cost.</span>
                    ) : (
                      sourceChip(b.certificationSource)
                    )}
                    <Link to="/pricing" style={{ color: 'var(--color-accent)' }} className="font-medium hover:underline">Change in Pricing desk →</Link>
                  </span>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-text)' }} className="font-semibold tabular-nums">{certificationEur === null ? 'Not set' : fmtEurPerMwh(certificationEur)}</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block tabular-nums">Total: {certificationEur === null ? '—' : fmtEurTotal(certificationEur * vol)}</span>
                </div>
              </div>

              {/* Cost Subtotal */}
              <div
                style={{ borderColor: 'var(--color-line)' }}
                className="flex justify-between items-center py-1.5 px-2 border-t font-medium text-xs"
              >
                <span style={{ color: 'var(--color-muted)' }}>Total delivered cost{b.deliveredCostExclCertification ? ' (excl. certification)' : ''}:</span>
                <span style={{ color: 'var(--color-pnl-neg)' }} className="font-semibold tabular-nums">{fmtEurPerMwh(totalDeliveredCostEur)} ({fmtEurTotal(totalDealCostEur)})</span>
              </div>

              {/* Revenue Section */}
              <div style={{ color: 'var(--color-muted)' }} className="text-[11px] font-medium pt-1">
                2. Realizable revenue (what you earn)
              </div>

              {/* Gas Index */}
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                }}
                className="flex items-center justify-between p-2.5 border"
              >
                <div>
                  <span style={{ color: 'var(--color-text)' }} className="font-medium block">Wholesale gas index (TTF prompt, {b.gasIndexSide})</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block">Standard physical gas molecule value</span>
                  <span className="text-[11px] flex items-center gap-1.5 flex-wrap mt-1" data-testid="ttf-source">
                    {gasIndexEur === null ? (
                      <span style={{ color: 'var(--color-pnl-neg)' }} className="font-medium">No TTF mark — load simulated marks or set one in Pricing</span>
                    ) : (
                      sourceChip(b.gasIndexSource)
                    )}
                    <Link to="/pricing" style={{ color: 'var(--color-accent)' }} className="font-medium hover:underline">Change in Pricing desk →</Link>
                  </span>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-text)' }} className="font-semibold tabular-nums">{fmtEurPerMwh(gasIndexEur)}</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block tabular-nums">Total: {gasIndexEur === null ? '—' : fmtEurTotal(gasIndexEur * vol)}</span>
                </div>
              </div>

              {/* Green Premium */}
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                }}
                className="flex items-center justify-between p-2.5 border"
              >
                <div>
                  <span style={{ color: 'var(--color-text)' }} className="font-medium block">Compliance certificate premium</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block">{opportunity.targetMarketName} green value stack{certificateValueEur === null ? ' (needs a TTF mark to split out)' : ''}</span>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-pnl-pos)' }} className="font-semibold tabular-nums">{fmtEurPerMwh(certificateValueEur)}</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block tabular-nums">Total: {certificateValueEur === null ? '—' : fmtEurTotal(certificateValueEur * vol)}</span>
                </div>
              </div>

              {/* Total Revenue Subtotal */}
              <div
                style={{ borderColor: 'var(--color-line)' }}
                className="flex justify-between items-center py-1.5 px-2 border-t font-medium text-xs"
              >
                <span style={{ color: 'var(--color-muted)' }}>Total realizable revenue{b.revenueExclMolecule ? ' (excl. gas: no TTF mark)' : ''}:</span>
                <span style={{ color: 'var(--color-text)' }} className="font-semibold tabular-nums">{fmtEurPerMwh(totalGrossRevenueEur)} ({fmtEurTotal(totalDealRevenueEur)})</span>
              </div>
              {(b.revenueCeilingApplied || b.netbackCapped) && (
                <div
                  data-testid="ceiling-note"
                  style={{ color: 'var(--color-status-warn-text)' }}
                  className="px-2 text-[11px] font-medium"
                >
                  {b.netbackCapped && (
                    <>
                      Capped at €{b.netbackCapped.capEurPerMwh}/MWh (desk assumption: DE THG traded-bundle reference).
                      {b.netbackCapped.theoreticalEurPerMwh !== null ? ` Modelled netback before the cap: ${fmtEurPerMwh(b.netbackCapped.theoreticalEurPerMwh)}.` : ''}{' '}
                    </>
                  )}
                  {b.revenueCeilingApplied && (
                    <>
                      Capped at €{b.revenueCeilingApplied.ceilingEurPerMwh}/MWh (desk assumption). The market netback was {fmtEurPerMwh(b.revenueCeilingApplied.uncappedEurPerMwh)}.{' '}
                    </>
                  )}
                  <Link to="/assumptions" className="underline">Change in Assumptions</Link>
                </div>
              )}
            </div>

            {/* Total Deal Profit Box - blue for positive */}
            <div
              style={{
                backgroundColor: 'var(--color-track)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
              }}
              className="mt-3.5 p-3 border flex items-center justify-between"
            >
              <div>
                <span style={{ color: 'var(--color-muted)' }} className="text-[11px] font-medium block">
                  Total order net profit ({vol.toLocaleString()} MWh):
                </span>
                <span style={{ color: 'var(--color-muted)' }} className="text-xs">
                  Volume: {vol.toLocaleString()} MWh · Margin: <strong style={{ color: 'var(--color-text)' }} className="tabular-nums">{fmtEurPerMwh(netMarginEurPerMwh)}</strong>
                </span>
                <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block mt-0.5" data-testid="margin-split-note">
                  {b.marginSplit === 'DESK_POLICY'
                    ? 'Margin is a desk-policy split (no producer share set), not a market price.'
                    : 'Margin is the desk share left after the producer share set in Trade Builder.'}{' '}
                  <Link to="/assumptions" className="underline">Assumptions</Link>
                </span>
              </div>
              <div
                style={{ color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)' }}
                className="text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap"
              >
                {isProfitable ? '+' : ''}{fmtEurTotal(totalDealProfitEur)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MarketLadder opportunity={opportunity} volumeMwh={vol} />

      {/* Navigation Buttons */}
      <div
        style={{ borderColor: 'var(--color-line)' }}
        className="m-sticky-actions cf-actions flex items-center justify-between pt-4 border-t"
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--color-text)',
          }}
          className="px-4 py-2 border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-track)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sourced plants</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          style={{
            backgroundColor: 'var(--color-accent)',
            borderRadius: 'var(--radius-control)',
            color: '#ffffff',
          }}
          className="px-6 py-2.5 text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:opacity-90"
        >
          <span>Review final deal summary</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
