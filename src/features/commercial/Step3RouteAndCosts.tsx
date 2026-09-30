import React from 'react';
import { ClientRequest } from '../../domain/arbitrage/types';
import { SourcedOpportunity } from './PlantScannerTable';
import { CorridorMiniMap } from '../map/CorridorMiniMap';
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
  const vol = request.volumeMwh || 10000;
  const plantGateEur = opportunity.producerPayableEurPerMWh ?? 0;
  const gridLogisticsEur = opportunity.transitCostEurPerMWh ?? 0;
  const certificationEur = 1.20; // Mass balance + PoS audit proof standard
  const totalDeliveredCostEur = plantGateEur + gridLogisticsEur + certificationEur;

  // Terminal Revenue Stack (Gas Index + Compliance Certificate Value)
  const totalGrossRevenueEur = opportunity.totalTerminalValueStackEurPerMWh ?? (totalDeliveredCostEur + (opportunity.deskNetMarginEurPerMWh ?? 0));
  const gasIndexEur = 32.50; // TTF baseline
  const certificateValueEur = Math.max(0, totalGrossRevenueEur - gasIndexEur);

  // Net Profit
  const netMarginEurPerMwh = opportunity.deskNetMarginEurPerMWh ?? (totalGrossRevenueEur - totalDeliveredCostEur);
  const totalDealProfitEur = opportunity.totalDealProfitEur ?? (netMarginEurPerMwh * vol);
  const totalDealCostEur = totalDeliveredCostEur * vol;
  const totalDealRevenueEur = totalGrossRevenueEur * vol;
  const isProfitable = netMarginEurPerMwh > 0;

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
          Route map &amp; commercial pricing engine
        </h1>
        <p style={{ color: 'var(--color-muted)' }} className="text-xs sm:text-sm font-normal max-w-2xl">
          We mapped the transit corridor and priced every component: sourcing, grid tariffs, transit, certification, and certificate monetization.
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
                  Visual transit corridor
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

            {/* Map Component Container */}
            <div
              style={{
                borderRadius: 'var(--radius-control)',
                borderColor: 'var(--color-line)',
              }}
              className="w-full h-[320px] max-md:h-auto overflow-hidden border"
            >
              <CorridorMiniMap
                originCountry={opportunity.originCountry}
                targetCountry={opportunity.targetCountry}
                plantName={opportunity.originPlantName}
                plantCoords={opportunity.originPlantCoords}
                transitSteps={transitSteps}
                distanceKm={opportunity.logisticsDistanceKm}
                logisticsCostEur={opportunity.transitCostEurPerMWh}
                deliveryMode={opportunity.deliveryMode}
              />
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
                  {isProfitable ? '+' : ''}€{netMarginEurPerMwh.toFixed(2)} / MWh
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
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block">RED III compliance verification</span>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-text)' }} className="font-semibold tabular-nums">€{certificationEur.toFixed(2)}/MWh</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block tabular-nums">Total: €{Math.round(certificationEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Cost Subtotal */}
              <div
                style={{ borderColor: 'var(--color-line)' }}
                className="flex justify-between items-center py-1.5 px-2 border-t font-medium text-xs"
              >
                <span style={{ color: 'var(--color-muted)' }}>Total delivered cost:</span>
                <span style={{ color: 'var(--color-pnl-neg)' }} className="font-semibold tabular-nums">€{totalDeliveredCostEur.toFixed(2)}/MWh (€{Math.round(totalDealCostEur).toLocaleString()})</span>
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
                  <span style={{ color: 'var(--color-text)' }} className="font-medium block">Wholesale gas index (TTF prompt)</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block">Standard physical gas molecule value</span>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-text)' }} className="font-semibold tabular-nums">€{gasIndexEur.toFixed(2)}/MWh</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block tabular-nums">Total: €{Math.round(gasIndexEur * vol).toLocaleString()}</span>
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
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block">{opportunity.targetMarketName} green value stack</span>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-pnl-pos)' }} className="font-semibold tabular-nums">€{certificateValueEur.toFixed(2)}/MWh</span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[11px] block tabular-nums">Total: €{Math.round(certificateValueEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Total Revenue Subtotal */}
              <div
                style={{ borderColor: 'var(--color-line)' }}
                className="flex justify-between items-center py-1.5 px-2 border-t font-medium text-xs"
              >
                <span style={{ color: 'var(--color-muted)' }}>Total realizable revenue:</span>
                <span style={{ color: 'var(--color-text)' }} className="font-semibold tabular-nums">€{totalGrossRevenueEur.toFixed(2)}/MWh (€{Math.round(totalDealRevenueEur).toLocaleString()})</span>
              </div>
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
                  Volume: {vol.toLocaleString()} MWh · Margin: <strong style={{ color: 'var(--color-text)' }} className="tabular-nums">€{netMarginEurPerMwh.toFixed(2)}/MWh</strong>
                </span>
              </div>
              <div
                style={{ color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)' }}
                className="text-xl sm:text-2xl font-bold tabular-nums"
              >
                {isProfitable ? '+' : ''}€{Math.round(totalDealProfitEur).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

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
