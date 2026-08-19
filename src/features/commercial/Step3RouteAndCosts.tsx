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
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800 text-teal-300 font-mono text-xs font-semibold mb-3">
          Step 3 of 4: Route Planning &amp; Cost Breakdown
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-100 mb-2 font-sans">
          Route Map &amp; Commercial Pricing Engine
        </h1>
        <p className="text-sm text-stone-400 font-mono max-w-2xl mx-auto">
          We mapped the transit corridor and priced every component: sourcing, grid tariffs, transit, certification, and certificate monetization.
        </p>
      </div>

      {/* Main Grid: Map on Left, Financial Waterfall on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-stretch">
        {/* Left Column: Visual Map (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex-1 flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-teal-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-200">
                  Visual Transit Corridor
                </span>
              </div>
              <span className="font-mono text-[10px] text-teal-300 bg-teal-950 px-2 py-0.5 rounded border border-teal-800 font-semibold">
                {opportunity.originCountry} → {opportunity.targetCountry}
              </span>
            </div>

            {/* Map Component Container */}
            <div className="w-full h-[320px] rounded-lg overflow-hidden border border-stone-800">
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
            <div className="mt-3 grid grid-cols-2 gap-2 text-stone-400 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800/80">
                <span className="text-[10px] uppercase text-stone-500 block">Origin Plant</span>
                <span className="font-semibold text-stone-200 truncate block">
                  {opportunity.originPlantName || opportunity.originCountry}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800/80">
                <span className="text-[10px] uppercase text-stone-500 block">Buyer Hub</span>
                <span className="font-semibold text-stone-200 truncate block">
                  {opportunity.targetMarketName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Waterfall (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-xl flex-1 flex flex-col">
            {/* Waterfall Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-200">
                  Full Cost Breakdown &amp; Revenue Waterfall
                </span>
              </div>

              <div className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 font-mono ${
                isProfitable
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                  : 'bg-red-950/80 border-red-700 text-red-300'
              }`}>
                {isProfitable ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <span className="text-xs font-bold">
                  {isProfitable ? '+' : ''}€{netMarginEurPerMwh.toFixed(2)} / MWh
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2.5 font-mono text-xs flex-1">
              {/* Cost Section */}
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
                1. Delivered Costs (What you pay)
              </div>

              {/* Plant Cost */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950 border border-stone-800">
                <div>
                  <span className="text-stone-200 font-semibold">Plant Gate Sourcing Cost</span>
                  <span className="text-[10px] text-stone-400 block">{opportunity.feedstockName} substrate</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-stone-100">€{plantGateEur.toFixed(2)}/MWh</span>
                  <span className="text-[10px] text-stone-500 block">Total: €{Math.round(plantGateEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Grid Logistics */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950 border border-stone-800">
                <div>
                  <span className="text-stone-200 font-semibold">Grid Entry/Exit &amp; Corridor Tariffs</span>
                  <span className="text-[10px] text-stone-400 block">{opportunity.logisticsDistanceKm ? `${opportunity.logisticsDistanceKm} km corridor` : 'Direct grid'}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-300">€{gridLogisticsEur.toFixed(2)}/MWh</span>
                  <span className="text-[10px] text-stone-500 block">Total: €{Math.round(gridLogisticsEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Certification */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950 border border-stone-800">
                <div>
                  <span className="text-stone-200 font-semibold">Mass Balance &amp; Proof of Sustainability</span>
                  <span className="text-[10px] text-stone-400 block">RED III compliance verification</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-stone-300">€{certificationEur.toFixed(2)}/MWh</span>
                  <span className="text-[10px] text-stone-500 block">Total: €{Math.round(certificationEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Cost Subtotal */}
              <div className="flex justify-between items-center py-1.5 px-2.5 border-t border-stone-800 font-semibold">
                <span className="text-stone-300">Total Delivered Cost:</span>
                <span className="text-red-300">€{totalDeliveredCostEur.toFixed(2)}/MWh (€{Math.round(totalDealCostEur).toLocaleString()})</span>
              </div>

              {/* Revenue Section */}
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500 pt-1">
                2. Offtake Revenue (What you receive)
              </div>

              {/* Gas Commodity */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950 border border-stone-800">
                <div>
                  <span className="text-stone-200 font-semibold">Wholesale Gas Offtake (TTF Index)</span>
                  <span className="text-[10px] text-stone-400 block">Natural gas commodity molecule</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-stone-100">€{gasIndexEur.toFixed(2)}/MWh</span>
                  <span className="text-[10px] text-stone-500 block">Total: €{Math.round(gasIndexEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Certificate Monetization */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-teal-950/40 border border-teal-800/70">
                <div>
                  <span className="text-teal-200 font-semibold">{opportunity.targetMarketName} Certificate Monetization</span>
                  <span className="text-[10px] text-teal-400 block">GHG quota abatement value</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-teal-300">€{certificateValueEur.toFixed(2)}/MWh</span>
                  <span className="text-[10px] text-teal-500 block">Total: €{Math.round(certificateValueEur * vol).toLocaleString()}</span>
                </div>
              </div>

              {/* Total Revenue Subtotal */}
              <div className="flex justify-between items-center py-1.5 px-2.5 border-t border-stone-800 font-semibold">
                <span className="text-stone-300">Total Realizable Revenue:</span>
                <span className="text-teal-300">€{totalGrossRevenueEur.toFixed(2)}/MWh (€{Math.round(totalDealRevenueEur).toLocaleString()})</span>
              </div>
            </div>

            {/* Total Deal Profit Box */}
            <div className="mt-4 p-4 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-stone-400 font-mono block">
                  Total Order Net Profit ({vol.toLocaleString()} MWh):
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  Volume: {vol.toLocaleString()} MWh · Margin: €{netMarginEurPerMwh.toFixed(2)}/MWh
                </span>
              </div>
              <div className={`text-xl md:text-2xl font-bold font-mono ${
                isProfitable ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {isProfitable ? '+' : ''}€{Math.round(totalDealProfitEur).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-800">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sourced Plants</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-stone-950 font-mono text-sm font-bold tracking-wide transition-all shadow-lg shadow-teal-950/40 flex items-center gap-2 cursor-pointer"
        >
          <span>Review Final Deal Summary</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
