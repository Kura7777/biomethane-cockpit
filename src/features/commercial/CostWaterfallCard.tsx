import React from 'react';
import { SourcedOpportunity } from './PlantScannerTable';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Copy, 
  Check,
  Receipt,
  Sparkles
} from 'lucide-react';

interface CostWaterfallCardProps {
  opportunity: SourcedOpportunity | null;
  volumeMwh: number;
  onOpenSummaryModal: () => void;
  onCopySummary: () => void;
  copied: boolean;
}

export function CostWaterfallCard({
  opportunity,
  volumeMwh,
  onOpenSummaryModal,
  onCopySummary,
  copied
}: CostWaterfallCardProps) {
  if (!opportunity) {
    return (
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full text-stone-500 font-mono text-xs shadow-xl backdrop-blur-md">
        <Calculator className="w-9 h-9 text-stone-600 mb-2.5" />
        <p className="font-bold text-stone-300 text-sm">No Sourcing Route Selected</p>
        <p className="text-[11px] text-stone-500 mt-1 max-w-xs">
          Select any candidate plant or corridor route from the scan list to compute the live cost waterfall and commercial margin.
        </p>
      </div>
    );
  }

  const vol = volumeMwh || 10000;
  const plantGateEur = opportunity.producerPayableEurPerMWh ?? 0;
  const gridLogisticsEur = opportunity.transitCostEurPerMWh ?? 0;
  const certificationEur = 1.20; // Mass balance + PoS audit standard
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

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col h-full shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/90 border border-emerald-700/80 flex items-center justify-center text-emerald-400 shadow-sm">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-100">
              Commercial Financial Waterfall
            </h3>
            <span className="font-mono text-[10px] text-stone-400">
              Volume: <strong className="text-stone-200">{vol.toLocaleString()} MWh</strong> · {opportunity.originCountry} ➔ {opportunity.targetCountry}
            </span>
          </div>
        </div>

        {/* Net Margin Spread Badge */}
        <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-mono shadow-sm ${
          isProfitable
            ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-300'
            : 'bg-red-950/90 border-red-700/80 text-red-300'
        }`}>
          {isProfitable ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          )}
          <div>
            <div className="text-[9px] uppercase font-bold text-stone-400">Net Deal Spread</div>
            <div className="text-sm font-bold">
              {isProfitable ? '+' : ''}€{netMarginEurPerMwh.toFixed(2)} <span className="text-[10px] font-normal text-stone-400">/ MWh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Waterfall Financial Ledger Items */}
      <div className="space-y-2.5 font-mono text-xs flex-1">
        {/* Sourcing & Supply Costs */}
        <div className="bg-stone-950/70 p-3 rounded-lg border border-stone-800/80 space-y-1.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 pb-1 border-b border-stone-800/60 flex items-center justify-between">
            <span>1. Delivered Supply Costs</span>
            <span>€ / MWh</span>
          </div>

          <div className="flex justify-between text-stone-300">
            <span>Plant Gate Sourcing Price:</span>
            <span className="font-bold text-stone-100">€{plantGateEur.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-stone-300">
            <span>Grid Entry/Exit &amp; Transit Tariffs:</span>
            <span className="font-bold text-stone-100">€{gridLogisticsEur.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-stone-300">
            <span>Mass Balance &amp; PoS Audit Fees:</span>
            <span className="font-bold text-stone-100">€{certificationEur.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-bold pt-1.5 border-t border-stone-800/60 text-amber-300">
            <span>Total Delivered Cost:</span>
            <span>€{totalDeliveredCostEur.toFixed(2)} / MWh</span>
          </div>
        </div>

        {/* Revenue Stack */}
        <div className="bg-stone-950/70 p-3 rounded-lg border border-stone-800/80 space-y-1.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 pb-1 border-b border-stone-800/60 flex items-center justify-between">
            <span>2. Realizable Revenue Stack</span>
            <span>€ / MWh</span>
          </div>

          <div className="flex justify-between text-stone-300">
            <span>Wholesale Gas Index (TTF Molecule):</span>
            <span className="font-bold text-teal-300">€{gasIndexEur.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-stone-300">
            <span>Compliance Certificate Premium ({opportunity.targetMarketName}):</span>
            <span className="font-bold text-teal-300">€{certificateValueEur.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-bold pt-1.5 border-t border-stone-800/60 text-teal-300">
            <span>Total Gross Realizable Revenue:</span>
            <span>€{totalGrossRevenueEur.toFixed(2)} / MWh</span>
          </div>
        </div>

        {/* Total Deal Accounting Box */}
        <div className="p-3 rounded-lg bg-teal-950/40 border border-teal-800/60 flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-400 block">Total Net Deal Profit</span>
            <span className="text-base font-bold text-stone-100">
              €{Math.round(totalDealProfitEur).toLocaleString()}
            </span>
          </div>
          <div className="text-right text-[11px] text-stone-400">
            <div>Cost: €{Math.round(totalDealCostEur).toLocaleString()}</div>
            <div>Rev: €{Math.round(totalDealRevenueEur).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-stone-800/80">
        <button
          type="button"
          onClick={onOpenSummaryModal}
          className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-stone-950 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Generate Deal Ticket</span>
        </button>

        <button
          type="button"
          onClick={onCopySummary}
          className="px-3.5 py-2 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700/80 text-stone-200 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}
