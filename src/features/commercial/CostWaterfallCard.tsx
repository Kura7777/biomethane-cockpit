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
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
          color: 'var(--color-muted)',
        }}
        className="border p-6 flex flex-col items-center justify-center text-center h-full text-xs shadow-xs"
      >
        <Calculator className="w-8 h-8 mb-2 opacity-60" />
        <p style={{ color: 'var(--color-text)' }} className="font-semibold text-sm">No sourcing route selected</p>
        <p style={{ color: 'var(--color-muted)' }} className="text-[12px] mt-1 max-w-xs font-normal">
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
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-line)',
        borderRadius: 'var(--radius-card)',
      }}
      className="border p-3.5 flex flex-col h-full shadow-xs select-none"
    >
      {/* Header */}
      <div
        style={{ borderColor: 'var(--color-line)' }}
        className="flex items-center justify-between pb-2.5 mb-2.5 border-b"
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--color-track)',
              borderColor: 'var(--color-line)',
              color: 'var(--color-pnl-pos)',
            }}
            className="w-7 h-7 border flex items-center justify-center"
          >
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3
              style={{ color: 'var(--color-text)' }}
              className="text-xs font-semibold"
            >
              Financial waterfall
            </h3>
            <span
              style={{ color: 'var(--color-muted)' }}
              className="text-[11px]"
            >
              Vol: <strong style={{ color: 'var(--color-text)' }} className="tabular-nums">{vol.toLocaleString()} MWh</strong> · {opportunity.originCountry} ➔ {opportunity.targetCountry}
            </span>
          </div>
        </div>

        {/* Net Margin Spread Badge - blue for positive, red for negative */}
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
          <div>
            <div
              style={{ color: 'var(--color-muted)' }}
              className="text-[9px] font-medium leading-none"
            >
              Net spread
            </div>
            <div className="text-xs font-semibold tabular-nums">
              {isProfitable ? '+' : ''}€{netMarginEurPerMwh.toFixed(2)} <span style={{ color: 'var(--color-muted)' }} className="text-[10px] font-normal">/ MWh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Waterfall Financial Ledger Items */}
      <div className="space-y-2.5 text-xs flex-1">
        {/* Sourcing & Supply Costs */}
        <div
          style={{
            backgroundColor: 'var(--color-bg)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-control)',
          }}
          className="p-3 border space-y-1.5"
        >
          <div
            style={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-muted)',
            }}
            className="text-[11px] font-medium pb-1 border-b flex items-center justify-between"
          >
            <span>1. Delivered supply costs</span>
            <span className="text-[10px]">€ / MWh</span>
          </div>

          <div style={{ color: 'var(--color-muted)' }} className="flex justify-between text-[12px]">
            <span>Plant gate sourcing price:</span>
            <span style={{ color: 'var(--color-text)' }} className="font-medium tabular-nums">€{plantGateEur.toFixed(2)}</span>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="flex justify-between text-[12px]">
            <span>Grid tariffs &amp; pipeline transit:</span>
            <span style={{ color: 'var(--color-text)' }} className="font-medium tabular-nums">€{gridLogisticsEur.toFixed(2)}</span>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="flex justify-between text-[12px]">
            <span>Mass balance &amp; PoS audit:</span>
            <span style={{ color: 'var(--color-text)' }} className="font-medium tabular-nums">€{certificationEur.toFixed(2)}</span>
          </div>

          <div
            style={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-pnl-neg)',
            }}
            className="flex justify-between font-semibold pt-1 border-t text-[12px]"
          >
            <span>Total delivered cost:</span>
            <span className="tabular-nums">€{totalDeliveredCostEur.toFixed(2)} / MWh</span>
          </div>
        </div>

        {/* Revenue Stack */}
        <div
          style={{
            backgroundColor: 'var(--color-bg)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-control)',
          }}
          className="p-3 border space-y-1.5"
        >
          <div
            style={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-muted)',
            }}
            className="text-[11px] font-medium pb-1 border-b flex items-center justify-between"
          >
            <span>2. Realizable revenue stack</span>
            <span className="text-[10px]">€ / MWh</span>
          </div>

          <div style={{ color: 'var(--color-muted)' }} className="flex justify-between text-[12px]">
            <span>Wholesale gas index (TTF prompt):</span>
            <span style={{ color: 'var(--color-text)' }} className="font-medium tabular-nums">
              {gasIndexEur !== null ? `€${gasIndexEur.toFixed(2)}` : '—'}
            </span>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="flex justify-between text-[12px]">
            <span>Compliance certificate premium:</span>
            <span style={{ color: 'var(--color-pnl-pos)' }} className="font-medium tabular-nums">
              {certificateValueEur !== null ? `€${certificateValueEur.toFixed(2)}` : '—'}
            </span>
          </div>

          <div
            style={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-text)',
            }}
            className="flex justify-between font-semibold pt-1 border-t text-[12px]"
          >
            <span>Gross realizable revenue:</span>
            <span className="tabular-nums">€{totalGrossRevenueEur.toFixed(2)} / MWh</span>
          </div>
        </div>

        {/* Total Deal Accounting Box */}
        <div
          style={{
            backgroundColor: 'var(--color-track)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-control)',
          }}
          className="p-3 border flex items-center justify-between"
        >
          <div>
            <span
              style={{ color: 'var(--color-muted)' }}
              className="text-[11px] font-medium block"
            >
              Total net deal profit
            </span>
            <span
              style={{ color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)' }}
              className="text-base font-bold tabular-nums"
            >
              {isProfitable ? '+' : ''}€{Math.round(totalDealProfitEur).toLocaleString()}
            </span>
          </div>
          <div
            style={{ color: 'var(--color-muted)' }}
            className="text-right text-[11px] tabular-nums"
          >
            <div>Cost: €{Math.round(totalDealCostEur).toLocaleString()}</div>
            <div>Rev: €{Math.round(totalDealRevenueEur).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{ borderColor: 'var(--color-line)' }}
        className="flex items-center gap-2 pt-2.5 mt-2.5 border-t"
      >
        <button
          type="button"
          onClick={onOpenSummaryModal}
          style={{
            backgroundColor: 'var(--color-accent)',
            borderRadius: 'var(--radius-control)',
            color: '#ffffff',
          }}
          className="flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:opacity-90"
        >
          <FileText className="w-3.5 h-3.5 text-white" />
          <span>Deal ticket preview</span>
        </button>

        <button
          type="button"
          onClick={onCopySummary}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--color-text)',
          }}
          className="px-3 py-2 border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-[var(--color-track)]"
        >
          {copied ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-status-pass-ink)' }} /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}
