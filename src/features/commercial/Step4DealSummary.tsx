import React, { useState } from 'react';
import { ClientRequest } from '../../domain/arbitrage/types';
import { SourcedOpportunity } from './PlantScannerTable';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  RotateCcw, 
  Building2, 
  TrendingUp, 
  FileText, 
  ArrowLeft,
  ShieldCheck,
  Flame,
  ArrowRight
} from 'lucide-react';

interface Step4DealSummaryProps {
  request: ClientRequest;
  opportunity: SourcedOpportunity;
  onBack: () => void;
  onReset: () => void;
}

export function Step4DealSummary({
  request,
  opportunity,
  onBack,
  onReset
}: Step4DealSummaryProps) {
  const [copied, setCopied] = useState(false);

  const vol = request.volumeMwh || 10000;
  const plantGateEur = opportunity.producerPayableEurPerMWh ?? 0;
  const gridLogisticsEur = opportunity.transitCostEurPerMWh ?? 0;
  const certificationEur = 1.20;
  const totalDeliveredCostEur = plantGateEur + gridLogisticsEur + certificationEur;
  const totalGrossRevenueEur = opportunity.totalTerminalValueStackEurPerMWh ?? (totalDeliveredCostEur + (opportunity.deskNetMarginEurPerMWh ?? 0));
  const gasIndexEur = 32.50;
  const certificateValueEur = Math.max(0, totalGrossRevenueEur - gasIndexEur);
  const netMarginEurPerMwh = opportunity.deskNetMarginEurPerMWh ?? (totalGrossRevenueEur - totalDeliveredCostEur);
  const totalDealProfitEur = opportunity.totalDealProfitEur ?? (netMarginEurPerMwh * vol);
  const totalDealCostEur = totalDeliveredCostEur * vol;
  const totalDealRevenueEur = totalGrossRevenueEur * vol;
  const isProfitable = netMarginEurPerMwh > 0;

  const dealRef = `BIO-${opportunity.originCountry}-${opportunity.targetCountry}-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toISOString().slice(0, 10);
  const periodLabel = request.delivery.type || 'FRONT_MONTH';

  const formattedSummary = `[BIOMETHANE COMMERCIAL DEAL SUMMARY]
Deal Ref: ${dealRef}
Date: ${dateStr}

1. SOURCING & ROUTE
• Origin Plant: ${opportunity.originPlantName || `${opportunity.originCountry} Sourced Plant`} (${opportunity.originCountry})
• Buyer Hub: ${opportunity.targetMarketName} (${opportunity.targetCountry})
• Substrate: ${opportunity.feedstockName} (CI: ${opportunity.carbonIntensity} gCO₂e/MJ)
• Volume: ${vol.toLocaleString()} MWh (${periodLabel} Delivery)
• Mode: Pipeline Grid Injection (RED III Mass Balance)

2. COMMERCIAL PRICING & MARGINS
• Plant Gate Sourcing Price: €${plantGateEur.toFixed(2)} / MWh (€${Math.round(plantGateEur * vol).toLocaleString()})
• Grid & Transit Logistics: €${gridLogisticsEur.toFixed(2)} / MWh (€${Math.round(gridLogisticsEur * vol).toLocaleString()})
• Mass Balance Proof: €${certificationEur.toFixed(2)} / MWh (€${Math.round(certificationEur * vol).toLocaleString()})
• Total Delivered Cost: €${totalDeliveredCostEur.toFixed(2)} / MWh (€${Math.round(totalDealCostEur).toLocaleString()})

• Wholesale Gas Offtake (TTF): €${gasIndexEur.toFixed(2)} / MWh (€${Math.round(gasIndexEur * vol).toLocaleString()})
• Green Certificate Premium: €${certificateValueEur.toFixed(2)} / MWh (€${Math.round(certificateValueEur * vol).toLocaleString()})
• Total Realizable Revenue: €${totalGrossRevenueEur.toFixed(2)} / MWh (€${Math.round(totalDealRevenueEur).toLocaleString()})

3. NET COMMERCIAL SPREAD
• Net Margin: €${netMarginEurPerMwh.toFixed(2)} / MWh
• TOTAL NET DEAL PROFIT: €${Math.round(totalDealProfitEur).toLocaleString()}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-semibold mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Step 4 of 4: Deal Overview &amp; Summary
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-100 mb-2 font-sans">
          Commercial Deal Summary &amp; Overview
        </h1>
        <p className="text-sm text-stone-400 font-mono max-w-xl mx-auto">
          Here is your finalized deal ticket ready for quotation, contracting, and execution.
        </p>
      </div>

      {/* Main Deal Ticket Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden mb-6">
        {/* Ticket Header */}
        <div className="bg-stone-950 p-6 border-b border-stone-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-700 flex items-center justify-center text-teal-400 text-xl">
              {opportunity.originFlag || '🏭'}
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400 block">
                Confirmed Deal Reference
              </span>
              <h2 className="font-mono text-base font-bold text-stone-100">
                {dealRef}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-stone-950 font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-stone-950 stroke-[3]" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Deal Summary</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-400" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-800 bg-stone-950/40 border-b border-stone-800">
          <div className="p-5">
            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider block">
              Order Volume &amp; Tenor
            </span>
            <span className="font-mono text-xl font-bold text-stone-100 block mt-1">
              {vol.toLocaleString()} MWh
            </span>
            <span className="font-mono text-xs text-teal-400 block mt-0.5">
              {periodLabel} Delivery (2026)
            </span>
          </div>

          <div className="p-5">
            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider block">
              Delivered Production Cost
            </span>
            <span className="font-mono text-xl font-bold text-red-300 block mt-1">
              €{totalDeliveredCostEur.toFixed(2)} / MWh
            </span>
            <span className="font-mono text-xs text-stone-400 block mt-0.5">
              Total: €{Math.round(totalDealCostEur).toLocaleString()}
            </span>
          </div>

          <div className="p-5 bg-emerald-950/20">
            <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">
              Total Net Deal Profit
            </span>
            <span className="font-mono text-2xl font-bold text-emerald-300 block mt-1">
              {isProfitable ? '+' : ''}€{Math.round(totalDealProfitEur).toLocaleString()}
            </span>
            <span className="font-mono text-xs text-emerald-400 block mt-0.5">
              Spread: €{netMarginEurPerMwh.toFixed(2)} / MWh
            </span>
          </div>
        </div>

        {/* Details Breakdown */}
        <div className="p-6 space-y-6">
          {/* Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] uppercase text-stone-500 block mb-1">Source Plant</span>
              <span className="font-bold text-stone-200 text-sm block">{opportunity.originPlantName || `${opportunity.originCountry} Facility`}</span>
              <span className="text-stone-400 mt-1 block">Origin: {opportunity.originCountryName} ({opportunity.originCountry})</span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] uppercase text-stone-500 block mb-1">Buyer Market</span>
              <span className="font-bold text-stone-200 text-sm block">{opportunity.targetMarketName}</span>
              <span className="text-stone-400 mt-1 block">Destination: {opportunity.targetCountry}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] uppercase text-stone-500 block mb-1">Feedstock &amp; Carbon Intensity</span>
              <span className="font-bold text-stone-200 text-sm block">{opportunity.feedstockName}</span>
              <span className="text-teal-400 mt-1 block font-semibold">CI: {opportunity.carbonIntensity} gCO₂e/MJ (RED III Compliant)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] uppercase text-stone-500 block mb-1">Logistics &amp; Chain of Custody</span>
              <span className="font-bold text-stone-200 text-sm block">Pipeline Grid Injection</span>
              <span className="text-stone-400 mt-1 block">Mass Balance via Union Database (UDB)</span>
            </div>
          </div>

          {/* Pricing Ledger Table */}
          <div className="rounded-xl border border-stone-800 bg-stone-950 overflow-hidden font-mono text-xs">
            <div className="p-3 bg-stone-900 border-b border-stone-800 font-bold uppercase text-[11px] text-stone-300">
              Complete Accounting Ledger
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                <tr>
                  <td className="p-3 text-stone-400">1. Plant Gate Sourcing Cost</td>
                  <td className="p-3 text-right font-semibold text-stone-200">€{plantGateEur.toFixed(2)}/MWh</td>
                  <td className="p-3 text-right text-stone-400">€{Math.round(plantGateEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-3 text-stone-400">2. Grid Entry/Exit &amp; Transit Tariffs</td>
                  <td className="p-3 text-right font-semibold text-amber-300">€{gridLogisticsEur.toFixed(2)}/MWh</td>
                  <td className="p-3 text-right text-stone-400">€{Math.round(gridLogisticsEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-3 text-stone-400">3. Mass Balance &amp; Proof of Sustainability</td>
                  <td className="p-3 text-right font-semibold text-stone-300">€{certificationEur.toFixed(2)}/MWh</td>
                  <td className="p-3 text-right text-stone-400">€{Math.round(certificationEur * vol).toLocaleString()}</td>
                </tr>
                <tr className="bg-stone-900/60 font-semibold text-stone-100">
                  <td className="p-3">Total Delivered Cost (Debits)</td>
                  <td className="p-3 text-right text-red-300">€{totalDeliveredCostEur.toFixed(2)}/MWh</td>
                  <td className="p-3 text-right text-red-300">€{Math.round(totalDealCostEur).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-3 text-stone-400">4. Wholesale Gas Offtake (TTF Index)</td>
                  <td className="p-3 text-right font-semibold text-stone-200">€{gasIndexEur.toFixed(2)}/MWh</td>
                  <td className="p-3 text-right text-stone-400">€{Math.round(gasIndexEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-3 text-stone-400">5. {opportunity.targetMarketName} Certificate Premium</td>
                  <td className="p-3 text-right font-bold text-teal-300">€{certificateValueEur.toFixed(2)}/MWh</td>
                  <td className="p-3 text-right text-teal-300">€{Math.round(certificateValueEur * vol).toLocaleString()}</td>
                </tr>
                <tr className="bg-stone-900/60 font-semibold text-stone-100">
                  <td className="p-3">Total Realizable Revenue (Credits)</td>
                  <td className="p-3 text-right text-teal-300">€{totalGrossRevenueEur.toFixed(2)}/MWh</td>
                  <td className="p-3 text-right text-teal-300">€{Math.round(totalDealRevenueEur).toLocaleString()}</td>
                </tr>
                <tr className="bg-emerald-950/40 text-emerald-300 font-bold text-sm">
                  <td className="p-3.5 pl-4">NET COMMERCIAL DEAL SPREAD</td>
                  <td className="p-3.5 text-right">€{netMarginEurPerMwh.toFixed(2)}/MWh</td>
                  <td className="p-3.5 text-right pr-4">€{Math.round(totalDealProfitEur).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Navigation & Reset Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-800">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Route &amp; Costs</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="px-6 py-3 rounded-lg bg-stone-800 hover:bg-teal-600 hover:text-stone-950 text-stone-200 font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>+ Process Another Order</span>
        </button>
      </div>
    </div>
  );
}
