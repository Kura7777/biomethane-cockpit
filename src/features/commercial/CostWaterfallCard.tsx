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
  gasIndexEur?: number | null;
}

export function CostWaterfallCard({
  opportunity,
  volumeMwh,
  onOpenSummaryModal,
  onCopySummary,
  copied,
  gasIndexEur: gasIndexEurProp
}: CostWaterfallCardProps) {
  if (!opportunity) {
    return (
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full text-zinc-500 font-mono text-xs shadow-xl backdrop-blur-md">
        <Calculator className="w-9 h-9 text-zinc-600 mb-2.5" />
        <p className="font-bold text-zinc-300 text-sm">No Sourcing Route Selected</p>
        <p className="text-[11px] text-zinc-500 mt-1 max-w-xs font-sans">
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
  const gasIndexEur = typeof gasIndexEurProp === 'number' ? gasIndexEurProp : null;
  const certificateValueEur = totalGrossRevenueEur !== null && gasIndexEur !== null
    ? Math.max(0, totalGrossRevenueEur - gasIndexEur)
    : null;

  // Net Profit
  const netMarginEurPerMwh = opportunity.deskNetMarginEurPerMWh ?? (totalGrossRevenueEur - totalDeliveredCostEur);
  const totalDealProfitEur = opportunity.totalDealProfitEur ?? (netMarginEurPerMwh * vol);
  const totalDealCostEur = totalDeliveredCostEur * vol;
  const totalDealRevenueEur = totalGrossRevenueEur * vol;
  const isProfitable = netMarginEurPerMwh > 0;

  return (
    <div className="bg-[#0e1118] border border-[#1e2433] rounded-lg p-3 flex flex-col h-full shadow-sm select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e2433]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#141824] border border-[#1e2433] flex items-center justify-center text-emerald-400 shadow-sm">
            <Receipt className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-100">
              Financial Waterfall
            </h3>
            <span className="font-mono text-[10px] text-zinc-400">
              Vol: <strong className="text-zinc-200">{vol.toLocaleString()} MWh</strong> · {opportunity.originCountry} ➔ {opportunity.targetCountry}
            </span>
          </div>
        </div>

        {/* Net Margin Spread Badge */}
        <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-mono shadow-sm ${
          isProfitable
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 glow-emerald-sm'
            : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
        }`}>
          {isProfitable ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          )}
          <div>
            <div className="text-[8px] uppercase font-bold text-zinc-400 leading-none">Net Spread</div>
            <div className="text-xs font-bold tabular-nums">
              {isProfitable ? '+' : ''}€{netMarginEurPerMwh.toFixed(2)} <span className="text-[9px] font-normal text-zinc-400">/ MWh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Waterfall Financial Ledger Items */}
      <div className="space-y-2 font-mono text-xs flex-1">
        {/* Sourcing & Supply Costs */}
        <div className="bg-[#08090d] p-2.5 rounded border border-[#1e2433] space-y-1">
          <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 pb-0.5 border-b border-[#1e2433] flex items-center justify-between">
            <span>1. Delivered Supply Costs</span>
            <span>€ / MWh</span>
          </div>

          <div className="flex justify-between text-zinc-300 text-[11px]">
            <span>Plant Gate Sourcing Price:</span>
            <span className="font-bold tabular-nums text-zinc-100">€{plantGateEur.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-zinc-300 text-[11px]">
            <span>Grid Tariffs &amp; Pipeline Transit:</span>
            <span className="font-bold tabular-nums text-zinc-100">€{gridLogisticsEur.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-zinc-300 text-[11px]">
            <span>Mass Balance &amp; PoS Audit:</span>
            <span className="font-bold tabular-nums text-zinc-100">€{certificationEur.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-bold pt-1 border-t border-[#1e2433] text-amber-300 text-[11px]">
            <span>Total Delivered Cost:</span>
            <span className="tabular-nums">€{totalDeliveredCostEur.toFixed(2)} / MWh</span>
          </div>
        </div>

        {/* Revenue Stack */}
        <div className="bg-[#08090d] p-2.5 rounded border border-[#1e2433] space-y-1">
          <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 pb-0.5 border-b border-[#1e2433] flex items-center justify-between">
            <span>2. Realizable Revenue Stack</span>
            <span>€ / MWh</span>
          </div>

          <div className="flex justify-between text-zinc-300 text-[11px]">
            <span>Wholesale Gas Index (TTF Prompt):</span>
            <span className="font-bold tabular-nums text-cyan-300">
              {gasIndexEur !== null ? `€${gasIndexEur.toFixed(2)}` : '—'}
            </span>
          </div>
          <div className="flex justify-between text-zinc-300 text-[11px]">
            <span>Compliance Certificate Premium:</span>
            <span className="font-bold tabular-nums text-cyan-300">
              {certificateValueEur !== null ? `€${certificateValueEur.toFixed(2)}` : '—'}
            </span>
          </div>

          <div className="flex justify-between font-bold pt-1 border-t border-[#1e2433] text-cyan-300 text-[11px]">
            <span>Gross Realizable Revenue:</span>
            <span className="tabular-nums">€{totalGrossRevenueEur.toFixed(2)} / MWh</span>
          </div>
        </div>

        {/* Total Deal Accounting Box */}
        <div className="p-2.5 rounded bg-[#141824] border border-cyan-800/40 flex items-center justify-between font-mono">
          <div>
            <span className="text-[9px] uppercase font-bold text-cyan-400 block">Total Net Deal Profit</span>
            <span className="text-sm font-bold tabular-nums text-zinc-100">
              €{Math.round(totalDealProfitEur).toLocaleString()}
            </span>
          </div>
          <div className="text-right text-[10px] text-zinc-400 tabular-nums">
            <div>Cost: €{Math.round(totalDealCostEur).toLocaleString()}</div>
            <div>Rev: €{Math.round(totalDealRevenueEur).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 mt-2 border-t border-[#1e2433]">
        <button
          type="button"
          onClick={onOpenSummaryModal}
          className="flex-1 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-500/20 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-black" />
          <span>Deal Ticket Preview</span>
        </button>

        <button
          type="button"
          onClick={onCopySummary}
          className="px-3 py-1.5 rounded bg-[#08090d] hover:bg-[#141824] border border-[#1e2433] text-zinc-200 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}
