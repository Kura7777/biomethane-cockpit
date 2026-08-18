import React, { useEffect, useMemo } from 'react';
import { ArbitrageOpportunity } from '../../domain/arbitrage/types';
import { MarksState, CostInputs, NetbackResult } from '../../domain/netback/types';
import { computeNetback } from '../../domain/netback/engine';
import { Consignment } from '../../domain/consignment/types';
import { getMarketById } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { 
  X, 
  Calculator, 
  Scale, 
  CheckCircle2,
} from 'lucide-react';

interface MathFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: ArbitrageOpportunity | null;
  marketId?: string;
  feedstockKey?: string;
  carbonIntensity?: number;
  volumeMwh?: number;
  marks: MarksState;
  costs: CostInputs;
}

export function MathFormulaModal({
  isOpen,
  onClose,
  opportunity,
  marketId: propMarketId,
  feedstockKey: propFeedstockKey,
  carbonIntensity: propCI,
  volumeMwh: propVolume,
  marks,
  costs,
}: MathFormulaModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const marketId = opportunity?.targetMarketId || propMarketId || 'DE_THG';
  const market = getMarketById(marketId);
  const feedstockKey = opportunity?.feedstockKey || propFeedstockKey || 'manure';
  const feedstock = FEEDSTOCK_REGISTRY[feedstockKey] || FEEDSTOCK_REGISTRY.manure;
  const ci = opportunity?.carbonIntensity ?? propCI ?? -100;
  const volume = propVolume ?? 20000;

  const consignment: Consignment = useMemo(() => ({
    id: `audit-${marketId}-${feedstockKey}`,
    name: `${feedstock.name} Audit Batch`,
    originCountry: opportunity?.originCountry || 'DK',
    originCountryName: opportunity?.originCountryName || 'Denmark',
    feedstock: feedstockKey,
    feedstockName: feedstock.name,
    annexClassification: feedstock.annexClassification ?? 'IX_A',
    carbonIntensity: ci,
    commissioningDateRange: 'POST_2026',
    certificationScheme: opportunity?.certificationScheme || 'ISCC_EU',
    chainOfCustody: opportunity?.chainOfCustody || 'MASS_BALANCE',
    injectionCountry: opportunity?.originCountry || 'DK',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: volume,
    deliveryPeriod: {
      type: 'CALENDAR',
      startDate: '2027-01-01',
      endDate: '2027-12-31',
      complianceYear: 2027,
    },
  }), [marketId, feedstockKey, feedstock, opportunity, ci, volume]);

  const netbackResult: NetbackResult | null = useMemo(() => {
    if (!market) return null;
    return computeNetback(market, consignment, marks, costs, marks.pricingSides);
  }, [market, consignment, marks, costs]);

  if (!isOpen) return null;

  // Exact step parameters
  const comparator = 94.0; // Fossil Fuel baseline (gCO2e/MJ)
  const deltaCI = comparator - ci;
  const tCO2ePerMWh = (deltaCI * 3600) / 1_000_000;
  
  const isDoubleCounting = (feedstock.annexClassification === 'IX_A' || feedstock.annexClassification === 'IX_B') &&
    (marketId === 'DE_THG' || marketId === 'NL_ERE' || marketId === 'UK_RTFO');
  const multiplier = isDoubleCounting ? 2.0 : 1.0;
  const creditsPerMWh = tCO2ePerMWh * multiplier;

  const markObj = marks.marks[marketId];
  const certPrice = markObj?.mid ?? markObj?.bid ?? null;

  const certVal = netbackResult?.certificateValue?.valueEurPerMWh ?? null;
  const moleculeVal = netbackResult?.moleculeValue ?? null;
  const netNetbackVal = netbackResult?.netNetback ?? null;
  const producerPayableVal = netbackResult?.producerPayable ?? null;
  const deskMarginVal = netbackResult?.deskMargin ?? null;
  const deskPnLVal = netbackResult?.deskPnL ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-stone-950 border border-stone-800 rounded-xs shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-stone-100">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100">
                  Step-by-Step Mathematical Proof &amp; Regulatory Audit
                </h2>
                <span className="px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs bg-emerald-950 border border-emerald-800 text-emerald-300">
                  DETERMINISTIC
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                Target: <strong className="text-stone-200">{market?.name || marketId}</strong> · Feedstock: <strong className="text-stone-200">{feedstock.name}</strong> ({ci} gCO₂e/MJ)
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
          
          {/* STEP 1 */}
          <div className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-xs space-y-2">
            <div className="flex items-center justify-between text-teal-400 font-bold">
              <span className="text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Step 1: Physical Carbon Intensity Savings (RED III Annex V, Part C)
              </span>
              <span className="text-[10px] text-stone-400 font-normal">SI Standard: 3,600 MJ = 1 MWh</span>
            </div>
            <div className="bg-stone-950 p-3 rounded-xs border border-stone-850 space-y-1.5 text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">Fossil Fuel Comparator ($EF_{'{'}fossil{'}'}$):</span>
                <span className="text-stone-100 font-bold">{comparator.toFixed(2)} gCO₂e/MJ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Actual Certified Consignment CI ($EF_{'{'}actual{'}'}$):</span>
                <span className="text-emerald-400 font-bold">{ci.toFixed(2)} gCO₂e/MJ</span>
              </div>
              <div className="flex justify-between border-t border-stone-800 pt-1">
                <span className="text-stone-400">Avoided GHG Emissions ($\Delta CI$):</span>
                <span className="text-stone-100 font-bold">{deltaCI.toFixed(2)} gCO₂e/MJ avoided</span>
              </div>
              <div className="p-2 bg-stone-900 rounded-xs border border-stone-800 text-teal-300 font-mono text-[11px]">
                tCO₂e/MWh = ({comparator.toFixed(1)} − ({ci})) × 3600 ÷ 1,000,000 = <strong className="text-emerald-300">{tCO2ePerMWh.toFixed(5)} tCO₂e/MWh</strong>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-xs space-y-2">
            <div className="flex items-center justify-between text-teal-400 font-bold">
              <span className="text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Step 2: Statutory Policy Multiplier (§37a BImSchG &amp; Annex IX-A)
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Classification: {feedstock.annexClassification.replace('_', ' ')}</span>
            </div>
            <div className="bg-stone-950 p-3 rounded-xs border border-stone-850 space-y-1.5 text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">Double-Counting Statutory Eligibility:</span>
                <span className={isDoubleCounting ? 'text-emerald-400 font-bold' : 'text-stone-400'}>
                  {isDoubleCounting ? 'QUALIFIED (2.0× Multiplier)' : 'STANDARD (1.0× Single Count)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Effective Statutory Credits Generated:</span>
                <span className="text-emerald-400 font-bold font-num">
                  {tCO2ePerMWh.toFixed(5)} × {multiplier.toFixed(1)} = {creditsPerMWh.toFixed(5)} credits/MWh
                </span>
              </div>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-xs space-y-2">
            <div className="flex items-center justify-between text-teal-400 font-bold">
              <span className="text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Step 3: Green Compliance Certificate Monetization
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Single Pricing Authority</span>
            </div>
            <div className="bg-stone-950 p-3 rounded-xs border border-stone-850 space-y-1.5 text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">{market?.name || marketId} Quoted Mark:</span>
                <span className="text-stone-100 font-bold font-num">
                  {certPrice !== null ? `€${certPrice.toFixed(2)} / ${market?.unitOfAccount || 'tCO₂e'}` : 'Unquoted'}
                </span>
              </div>
              <div className="flex justify-between border-t border-stone-800 pt-1">
                <span className="text-stone-400">Certificate Green Value Stack:</span>
                <span className="text-emerald-400 font-bold font-num text-sm">
                  {certVal !== null ? `€${certVal.toFixed(2)} / MWh` : 'Unpriced'}
                </span>
              </div>
              {netbackResult?.certificateValue?.calculation && (
                <div className="p-2 bg-stone-900 rounded-xs border border-stone-800 text-teal-300 text-[11px]">
                  {netbackResult.certificateValue.calculation}
                </div>
              )}
            </div>
          </div>

          {/* STEP 4 */}
          <div className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-xs space-y-2">
            <div className="flex items-center justify-between text-teal-400 font-bold">
              <span className="text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Step 4: All-In Delivered Commercial Netback
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Physical Gas + Green Premium − Costs</span>
            </div>
            <div className="bg-stone-950 p-3 rounded-xs border border-stone-850 space-y-1.5 text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">+ TTF Natural Gas Commodity Index:</span>
                <span className="text-stone-100 font-bold font-num">
                  {moleculeVal !== null ? `+ €${moleculeVal.toFixed(2)}/MWh` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">+ Green Certificate Value Stack:</span>
                <span className="text-emerald-400 font-bold font-num">
                  {certVal !== null ? `+ €${certVal.toFixed(2)}/MWh` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">− Total Cost Deductions (Transit + Certification):</span>
                <span className="text-rose-400 font-bold font-num">
                  {netbackResult?.totalCosts !== null && netbackResult?.totalCosts !== undefined ? `− €${netbackResult.totalCosts.toFixed(2)}/MWh` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t border-stone-800 pt-1.5 text-sm">
                <span className="text-stone-100 font-bold">Total Delivered Netback:</span>
                <span className="text-emerald-400 font-bold font-num">
                  {netNetbackVal !== null ? `€${netNetbackVal.toFixed(2)} / MWh` : 'Unpriced'}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 5 */}
          <div className="p-3.5 bg-teal-950/40 border border-teal-800/80 rounded-xs space-y-2">
            <div className="flex items-center justify-between text-teal-300 font-bold">
              <span className="text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-teal-400" />
                Step 5: Producer Settlement &amp; Commercial Desk Profit
              </span>
              <span className="text-[10px] text-teal-400 font-bold">Order Volume: {volume.toLocaleString()} MWh</span>
            </div>
            <div className="bg-stone-950 p-3 rounded-xs border border-stone-850 space-y-1.5 text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">− Producer Settlement (Remuneration):</span>
                <span className="text-stone-200 font-bold font-num">
                  {producerPayableVal !== null ? `− €${producerPayableVal.toFixed(2)}/MWh` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t border-stone-800 pt-1.5">
                <span className="text-stone-100 font-bold">3Degrees Realized Desk Margin:</span>
                <span className="text-teal-400 font-bold font-num text-sm">
                  {deskMarginVal !== null ? `€${deskMarginVal.toFixed(2)} / MWh` : 'Unpriced'}
                </span>
              </div>
              <div className="flex justify-between bg-teal-950/60 p-2 rounded-xs border border-teal-800/60 text-sm font-bold mt-2">
                <span className="text-teal-200">Total Commercial Desk Profit (PnL):</span>
                <span className="text-teal-400 font-num">
                  {deskPnLVal !== null ? `€${deskPnLVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-stone-800 bg-stone-900/80 flex items-center justify-between font-mono text-xs">
          <span className="text-stone-400">
            Statutory Authority: <strong className="text-stone-200">RED III (EU) 2023/2413 · 38. BImSchV</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-bold rounded-xs cursor-pointer transition-colors"
          >
            Done (Audit Verified)
          </button>
        </div>

      </div>
    </div>
  );
}
