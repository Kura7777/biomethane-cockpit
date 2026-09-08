import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientRequest } from '../../domain/arbitrage/types';
import { SourcedOpportunity } from './PlantScannerTable';
import { buildDealUrl } from '../../domain/trade/dealParams';
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
  ArrowRight,
  Zap
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

  const navigate = useNavigate();

  const handleOpenTradeBuilder = () => {
    const plantVolume = opportunity.plantAnnualGWh ? Math.round(opportunity.plantAnnualGWh * 1000) : vol;
    navigate(buildDealUrl({
      marketId: opportunity.targetMarketId,
      originCountry: opportunity.originCountry,
      feedstock: opportunity.feedstockKey,
      ci: opportunity.carbonIntensity,
      volume: plantVolume,
      plantId: opportunity.originPlantId,
      plantName: opportunity.originPlantName,
      plantCapacityNm3h: opportunity.plantCapacityNm3h ?? undefined,
      plantAnnualGWh: opportunity.plantAnnualGWh ?? undefined,
      legalEntityName: opportunity.legalEntityName ?? undefined,
      networkOperator: opportunity.networkOperator ?? undefined,
      counterparty: opportunity.legalEntityName || opportunity.originPlantName || 'European Biomethane Producer',
    }));
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Step Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-3">
          <CheckCircle2 className="w-4 h-4" />
          Step 4 of 4: Commercial Deal Structured
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mb-2.5">
          Finalized Transaction Term Sheet
        </h1>
        <p className="text-base text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto font-normal">
          Deal economics verified, RED III compliance passed, and mass-balance route locked in.
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl overflow-hidden shadow-sm dark:shadow-xl mb-6">
        {/* Deal Ref & Action Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#08090d] border-b border-slate-200 dark:border-[#1e2433] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Reference: <span className="font-mono text-cyan-700 dark:text-cyan-400 font-semibold">{dealRef}</span>
            </span>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-md font-semibold">
              EXECUTION READY
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0e1118] hover:bg-slate-100 dark:hover:bg-[#141824] border border-slate-200 dark:border-[#2b3347] text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400 dark:text-zinc-400" />}
              <span>{copied ? 'Copied Term Sheet' : 'Copy Term Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Top Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-stone-800 border-b border-slate-200 dark:border-[#1e2433] bg-slate-50/50 dark:bg-[#08090d]">
          <div className="p-6">
            <span className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider block font-bold">
              Order Volume &amp; Tenor
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100 block mt-1.5">
              {vol.toLocaleString()} MWh
            </span>
            <span className="text-xs text-cyan-700 dark:text-cyan-400 block mt-0.5 font-medium">
              {periodLabel} Delivery (2026)
            </span>
          </div>

          <div className="p-6">
            <span className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider block font-bold">
              Delivered Production Cost
            </span>
            <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-300 block mt-1.5">
              €{totalDeliveredCostEur.toFixed(2)} / MWh
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 block mt-0.5 font-mono">
              Total: €{Math.round(totalDealCostEur).toLocaleString()}
            </span>
          </div>

          <div className="p-6 bg-emerald-50/70 dark:bg-emerald-950/20">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block font-bold">
              Total Net Deal Profit
            </span>
            <span className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-300 block mt-1">
              {isProfitable ? '+' : ''}€{Math.round(totalDealProfitEur).toLocaleString()}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 block mt-0.5 font-medium">
              Spread: <strong className="font-mono">€{netMarginEurPerMwh.toFixed(2)} / MWh</strong>
            </span>
          </div>
        </div>

        {/* Details Breakdown */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#08090d] border border-slate-200 dark:border-[#1e2433]">
              <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-500 font-bold block mb-1">Source Plant</span>
              <span className="font-bold text-slate-900 dark:text-zinc-200 text-sm block">{opportunity.originPlantName || `${opportunity.originCountry} Facility`}</span>
              <span className="text-slate-600 dark:text-zinc-400 mt-1 block">Origin: {opportunity.originCountryName} ({opportunity.originCountry})</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#08090d] border border-slate-200 dark:border-[#1e2433]">
              <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-500 font-bold block mb-1">Buyer Market</span>
              <span className="font-bold text-slate-900 dark:text-zinc-200 text-sm block">{opportunity.targetMarketName}</span>
              <span className="text-slate-600 dark:text-zinc-400 mt-1 block">Destination: {opportunity.targetCountry}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#08090d] border border-slate-200 dark:border-[#1e2433]">
              <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-500 font-bold block mb-1">Feedstock &amp; Carbon Intensity</span>
              <span className="font-bold text-slate-900 dark:text-zinc-200 text-sm block">{opportunity.feedstockName}</span>
              <span className="text-cyan-700 dark:text-cyan-400 mt-1 block font-semibold">CI: {opportunity.carbonIntensity} gCO₂e/MJ (RED III Compliant)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#08090d] border border-slate-200 dark:border-[#1e2433]">
              <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-500 font-bold block mb-1">Logistics &amp; Chain of Custody</span>
              <span className="font-bold text-slate-900 dark:text-zinc-200 text-sm block">Pipeline Grid Injection</span>
              <span className="text-slate-600 dark:text-zinc-400 mt-1 block">Mass Balance via Union Database (UDB)</span>
            </div>
          </div>

          {/* Pricing Ledger Table */}
          <div className="rounded-xl border border-slate-200 dark:border-[#1e2433] bg-white dark:bg-[#08090d] overflow-hidden text-xs shadow-2xs">
            <div className="p-3.5 bg-slate-100 dark:bg-[#0e1118] border-b border-slate-200 dark:border-[#1e2433] font-bold uppercase text-[11px] text-slate-800 dark:text-zinc-300">
              Complete Accounting Ledger
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-200 dark:divide-stone-800/60 text-slate-700 dark:text-zinc-300">
                <tr>
                  <td className="p-3.5 text-slate-600 dark:text-zinc-400 font-medium">1. Plant Gate Sourcing Cost</td>
                  <td className="p-3.5 text-right font-semibold font-mono text-slate-900 dark:text-zinc-200">€{plantGateEur.toFixed(2)}/MWh</td>
                  <td className="p-3.5 text-right font-mono text-slate-600 dark:text-zinc-400">€{Math.round(plantGateEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-3.5 text-slate-600 dark:text-zinc-400 font-medium">2. Grid Entry/Exit &amp; Transit Tariffs</td>
                  <td className="p-3.5 text-right font-semibold font-mono text-amber-600 dark:text-amber-300">€{gridLogisticsEur.toFixed(2)}/MWh</td>
                  <td className="p-3.5 text-right font-mono text-slate-600 dark:text-zinc-400">€{Math.round(gridLogisticsEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-3.5 text-slate-600 dark:text-zinc-400 font-medium">3. Mass Balance &amp; Proof of Sustainability</td>
                  <td className="p-3.5 text-right font-semibold font-mono text-slate-700 dark:text-zinc-300">€{certificationEur.toFixed(2)}/MWh</td>
                  <td className="p-3.5 text-right font-mono text-slate-600 dark:text-zinc-400">€{Math.round(certificationEur * vol).toLocaleString()}</td>
                </tr>
                <tr className="bg-slate-100/70 dark:bg-[#0e1118] font-semibold text-slate-900 dark:text-zinc-100">
                  <td className="p-3.5 font-bold">Total Delivered Cost (Debits)</td>
                  <td className="p-3.5 text-right font-mono text-red-600 dark:text-red-300">€{totalDeliveredCostEur.toFixed(2)}/MWh</td>
                  <td className="p-3.5 text-right font-mono text-red-600 dark:text-red-300">€{Math.round(totalDealCostEur).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-3.5 text-slate-600 dark:text-zinc-400 font-medium">4. Wholesale Gas Offtake (TTF Index)</td>
                  <td className="p-3.5 text-right font-semibold font-mono text-slate-900 dark:text-zinc-200">€{gasIndexEur.toFixed(2)}/MWh</td>
                  <td className="p-3.5 text-right font-mono text-slate-600 dark:text-zinc-400">€{Math.round(gasIndexEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-3.5 text-slate-600 dark:text-zinc-400 font-medium">5. {opportunity.targetMarketName} Certificate Premium</td>
                  <td className="p-3.5 text-right font-bold font-mono text-cyan-700 dark:text-cyan-300">€{certificateValueEur.toFixed(2)}/MWh</td>
                  <td className="p-3.5 text-right font-mono text-cyan-700 dark:text-cyan-300">€{Math.round(certificateValueEur * vol).toLocaleString()}</td>
                </tr>
                <tr className="bg-slate-100/70 dark:bg-[#0e1118] font-semibold text-slate-900 dark:text-zinc-100">
                  <td className="p-3.5 font-bold">Total Realizable Revenue (Credits)</td>
                  <td className="p-3.5 text-right font-mono text-cyan-700 dark:text-cyan-300">€{totalGrossRevenueEur.toFixed(2)}/MWh</td>
                  <td className="p-3.5 text-right font-mono text-cyan-700 dark:text-cyan-300">€{Math.round(totalDealRevenueEur).toLocaleString()}</td>
                </tr>
                <tr className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <td className="p-4 pl-4">NET COMMERCIAL DEAL SPREAD</td>
                  <td className="p-4 text-right font-mono">€{netMarginEurPerMwh.toFixed(2)}/MWh</td>
                  <td className="p-4 text-right pr-4 font-mono">€{Math.round(totalDealProfitEur).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Navigation & Reset Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-200 dark:border-[#1e2433]">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 rounded-xl bg-white dark:bg-[#0e1118] hover:bg-slate-50 dark:hover:bg-[#141824] border border-slate-200 dark:border-[#2b3347] text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Route &amp; Costs</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-3 rounded-xl bg-white dark:bg-[#0e1118] hover:bg-slate-50 dark:hover:bg-[#141824] border border-slate-200 dark:border-[#2b3347] text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>

          <button
            type="button"
            onClick={handleOpenTradeBuilder}
            className="px-7 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-stone-950 text-sm font-bold tracking-wide transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white dark:fill-stone-950" />
            <span>Open in Trade Builder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
