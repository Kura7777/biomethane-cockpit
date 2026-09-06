import React, { useState } from 'react';
import { ClientRequest } from '../../domain/arbitrage/types';
import { SourcedOpportunity } from './PlantScannerTable';
import { 
  X, 
  Copy, 
  Check, 
  Printer, 
  FileSpreadsheet, 
  Building2, 
  TrendingUp,
  Receipt
} from 'lucide-react';

interface DealSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: SourcedOpportunity | null;
  request: ClientRequest;
}

export function DealSummaryModal({
  isOpen,
  onClose,
  opportunity,
  request
}: DealSummaryModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !opportunity) return null;

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
  const totalDealRevenueEur = totalGrossRevenueEur * vol;
  const totalDealCostEur = totalDeliveredCostEur * vol;

  const dealReference = `BIO-DEAL-${opportunity.originCountry}-${opportunity.targetCountry}-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toISOString().slice(0, 10);
  const periodLabel = request.delivery.type || 'FRONT_MONTH';

  const formattedMarkdown = `
# BIOMETHANE COMMERCIAL DEAL TERM SHEET
**Deal Reference:** ${dealReference}
**Date:** ${dateStr}
**Status:** CONFIRMED INDICATIVE TERM SHEET

---

### 1. TRANSACTION OVERVIEW
- **Buyer Market:** ${opportunity.targetMarketName} (${opportunity.targetCountry})
- **Origin Facility:** ${opportunity.originPlantName || `${opportunity.originCountry} Production Hub`}
- **Volume:** ${vol.toLocaleString()} MWh
- **Delivery Period:** ${periodLabel} (Compliance Year: ${request.delivery.complianceYear || 2026})
- **Delivery Mode:** ${opportunity.deliveryMode || 'Pipeline Grid Injection'}
- **Chain of Custody:** Mass Balance (RED III Compliant)

### 2. SUSTAINABILITY SPECIFICATIONS
- **Feedstock Category:** ${opportunity.feedstockName}
- **Carbon Intensity (CI):** ${opportunity.carbonIntensity} gCO₂e/MJ
- **Certification Scheme:** ${opportunity.certificationScheme || 'ISCC EU / REDcert-EU'}
- **Proof of Sustainability:** Electronic transfer via UDB / National Registry

### 3. FINANCIAL WATERFALL & COMMERCIAL PRICING
- **Plant Gate Sourcing Price:** €${plantGateEur.toFixed(2)} / MWh (€${Math.round(plantGateEur * vol).toLocaleString()})
- **Grid Entry/Exit & Transit:** €${gridLogisticsEur.toFixed(2)} / MWh (€${Math.round(gridLogisticsEur * vol).toLocaleString()})
- **Mass Balance / Audit Fee:** €${certificationEur.toFixed(2)} / MWh (€${Math.round(certificationEur * vol).toLocaleString()})
- **TOTAL DELIVERED COST:** €${totalDeliveredCostEur.toFixed(2)} / MWh (€${Math.round(totalDealCostEur).toLocaleString()})

- **Wholesale Gas Revenue (TTF):** €${gasIndexEur.toFixed(2)} / MWh (€${Math.round(gasIndexEur * vol).toLocaleString()})
- **Green Certificate Premium:** €${certificateValueEur.toFixed(2)} / MWh (€${Math.round(certificateValueEur * vol).toLocaleString()})
- **TOTAL GROSS REVENUE:** €${totalGrossRevenueEur.toFixed(2)} / MWh (€${Math.round(totalDealRevenueEur).toLocaleString()})

### 4. NET COMMERCIAL SPREAD
- **Net Margin:** €${netMarginEurPerMwh.toFixed(2)} / MWh
- **Total Net Profit:** €${Math.round(totalDealProfitEur).toLocaleString()}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#0e1118] border border-[#2b3347] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#1e2433] flex items-center justify-between bg-[#08090d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141824] border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-100">
                Commercial Deal Term Sheet
              </h2>
              <p className="font-mono text-[10px] text-zinc-400">
                Ref: {dealReference} · Generated {dateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#141824] hover:bg-[#1e2433] border border-[#1e2433] hover:border-cyan-500/40 text-zinc-200 font-mono text-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied Term Sheet</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#141824] hover:bg-[#1e2433] border border-[#1e2433] hover:border-[#2b3347] text-zinc-200 font-mono text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#141824] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Printable / Readable Term Sheet */}
        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs text-zinc-300 bg-[#0e1118]">
          {/* Top Deal Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-[#08090d] rounded-lg border border-[#1e2433]">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Delivered Volume</span>
              <span className="text-base font-bold text-zinc-100 tabular-nums">{vol.toLocaleString()} MWh</span>
              <span className="text-[10px] text-cyan-400 block mt-0.5">{periodLabel} Delivery</span>
            </div>

            <div className="p-3 bg-[#08090d] rounded-lg border border-[#1e2433]">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Delivered Cost</span>
              <span className="text-base font-bold text-rose-300 tabular-nums">€{totalDeliveredCostEur.toFixed(2)}/MWh</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5 tabular-nums">Total: €{Math.round(totalDealCostEur).toLocaleString()}</span>
            </div>

            <div className="p-3 bg-emerald-950/40 rounded-lg border border-emerald-800/80">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Net Deal Profit</span>
              <span className="text-base font-bold text-emerald-300 tabular-nums">
                {netMarginEurPerMwh > 0 ? '+' : ''}€{Math.round(totalDealProfitEur).toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5 tabular-nums">Margin: €{netMarginEurPerMwh.toFixed(2)}/MWh</span>
            </div>
          </div>

          {/* Sourcing & Corridor Details */}
          <div className="p-4 bg-[#08090d] rounded-lg border border-[#1e2433] space-y-2">
            <h3 className="font-bold text-zinc-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sourcing &amp; Corridor Specifications</span>
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-zinc-400 text-xs">
              <div>
                <span className="text-zinc-500">Origin Facility: </span>
                <span className="text-zinc-200 font-semibold">{opportunity.originPlantName || `${opportunity.originCountry} Sourced Plant`}</span>
              </div>
              <div>
                <span className="text-zinc-500">Target Hub: </span>
                <span className="text-zinc-200 font-semibold">{opportunity.targetMarketName} ({opportunity.targetCountry})</span>
              </div>
              <div>
                <span className="text-zinc-500">Substrate / Feedstock: </span>
                <span className="text-zinc-200 font-semibold">{opportunity.feedstockName}</span>
              </div>
              <div>
                <span className="text-zinc-500">Carbon Intensity: </span>
                <span className="text-cyan-400 font-semibold tabular-nums">{opportunity.carbonIntensity} gCO₂e/MJ</span>
              </div>
              <div>
                <span className="text-zinc-500">Compliance Standard: </span>
                <span className="text-emerald-400 font-semibold">RED III / Mass Balance (UDB)</span>
              </div>
              <div>
                <span className="text-zinc-500">Transit Distance: </span>
                <span className="text-zinc-200 font-semibold tabular-nums">{opportunity.logisticsDistanceKm ? `${opportunity.logisticsDistanceKm} km` : 'Direct grid transfer'}</span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="p-4 bg-[#08090d] rounded-lg border border-[#1e2433] space-y-3">
            <h3 className="font-bold text-zinc-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Financial Ledger &amp; Margin Accounting</span>
            </h3>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e2433] text-[10px] text-zinc-500 uppercase">
                  <th className="py-1">Line Item</th>
                  <th className="py-1 text-right">Unit Rate</th>
                  <th className="py-1 text-right">Total Deal Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2433]/60">
                <tr>
                  <td className="py-1.5 text-zinc-300">Plant Gate Biomethane Commodity</td>
                  <td className="py-1.5 text-right font-semibold text-zinc-200 tabular-nums">€{plantGateEur.toFixed(2)}/MWh</td>
                  <td className="py-1.5 text-right text-zinc-400 tabular-nums">€{Math.round(plantGateEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-zinc-300">Grid Entry/Exit &amp; Corridor Tariffs</td>
                  <td className="py-1.5 text-right font-semibold text-amber-300 tabular-nums">€{gridLogisticsEur.toFixed(2)}/MWh</td>
                  <td className="py-1.5 text-right text-zinc-400 tabular-nums">€{Math.round(gridLogisticsEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-zinc-300">Mass Balance &amp; Proof of Sustainability</td>
                  <td className="py-1.5 text-right font-semibold text-zinc-300 tabular-nums">€{certificationEur.toFixed(2)}/MWh</td>
                  <td className="py-1.5 text-right text-zinc-400 tabular-nums">€{Math.round(certificationEur * vol).toLocaleString()}</td>
                </tr>
                <tr className="font-bold text-zinc-100 bg-[#141824]/50">
                  <td className="py-1.5 pl-1">Total Delivered Production Cost</td>
                  <td className="py-1.5 text-right text-rose-300 tabular-nums">€{totalDeliveredCostEur.toFixed(2)}/MWh</td>
                  <td className="py-1.5 text-right text-rose-300 tabular-nums">€{Math.round(totalDealCostEur).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-zinc-300">Wholesale Gas Offtake (TTF Index)</td>
                  <td className="py-1.5 text-right font-semibold text-cyan-300 tabular-nums">€{gasIndexEur.toFixed(2)}/MWh</td>
                  <td className="py-1.5 text-right text-zinc-400 tabular-nums">€{Math.round(gasIndexEur * vol).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-cyan-300">{opportunity.targetMarketName} Certificate Monetization</td>
                  <td className="py-1.5 text-right font-bold text-cyan-300 tabular-nums">€{certificateValueEur.toFixed(2)}/MWh</td>
                  <td className="py-1.5 text-right text-cyan-300 tabular-nums">€{Math.round(certificateValueEur * vol).toLocaleString()}</td>
                </tr>
                <tr className="font-bold text-zinc-100 bg-[#141824]/50">
                  <td className="py-1.5 pl-1">Total Gross Realizable Revenue</td>
                  <td className="py-1.5 text-right text-cyan-300 tabular-nums">€{totalGrossRevenueEur.toFixed(2)}/MWh</td>
                  <td className="py-1.5 text-right text-cyan-300 tabular-nums">€{Math.round(totalDealRevenueEur).toLocaleString()}</td>
                </tr>
                <tr className="font-bold text-base bg-emerald-950/40 text-emerald-300">
                  <td className="py-2 pl-2">NET COMMERCIAL PROFIT / SPREAD</td>
                  <td className="py-2 text-right tabular-nums">€{netMarginEurPerMwh.toFixed(2)}/MWh</td>
                  <td className="py-2 text-right pr-2 tabular-nums">€{Math.round(totalDealProfitEur).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#1e2433] flex items-center justify-between bg-[#08090d] text-zinc-500 font-mono text-[10px]">
          <span>Standard EFET / ISDA Gas &amp; Certificate Master Annex Applicable</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#141824] hover:bg-[#1e2433] border border-[#1e2433] text-zinc-200 font-semibold transition-colors cursor-pointer"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
