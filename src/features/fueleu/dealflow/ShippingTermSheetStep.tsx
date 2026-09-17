import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShippingCounterparty,
  CALLING_REGIONS,
  TRADE_LANES,
} from '../../../domain/fueleu/types';
import {
  calculateMarineBunkerQuotation,
} from '../../../domain/fueleu/calculator';
import { buildDealUrl } from '../../../domain/trade/dealParams';
import {
  FileText,
  Copy,
  Check,
  Download,
  Zap,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Building2,
  Scale,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { showToast } from '../../../app/DeskToastContainer';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

interface ShippingTermSheetStepProps {
  counterparty: ShippingCounterparty;
  pathway: 'PHYSICAL' | 'POOLING';
  ttfGasIndex: number;
  liquefactionFee: number;
  greenPremium: number;
  euaPrice: number;
  vlsfoPrice: number;
  onBack: () => void;
  onReset: () => void;
}

export function ShippingTermSheetStep({
  counterparty,
  pathway,
  ttfGasIndex,
  liquefactionFee,
  greenPremium,
  euaPrice,
  vlsfoPrice,
  onBack,
  onReset,
}: ShippingTermSheetStepProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [dealCopied, setDealCopied] = useState(false);

  const isSurplus = counterparty.compliance_balance_2025_tco2e > 0;
  const isDualFuel = counterparty.fleetCapability === 'DUAL_FUEL_LNG';

  const marineQuote = useMemo(() => {
    return calculateMarineBunkerQuotation({
      ttfGasIndexEurMwh: ttfGasIndex,
      liquefactionFeeEurMwh: liquefactionFee,
      greenPremiumEurMwh: greenPremium,
      euaPriceEurPerTonne: euaPrice,
      vlsfoPriceUsdPerTonne: vlsfoPrice,
      bioLngVolumeTonnes: counterparty.bio_lng_required_neg100_t,
      bioLngCi: -100,
      targetYear: 2025,
    });
  }, [ttfGasIndex, liquefactionFee, greenPremium, euaPrice, vlsfoPrice, counterparty.bio_lng_required_neg100_t]);

  const dealRef = useMemo(() => {
    const region = counterparty.callingRegion || 'EUR';
    const dateStr = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
    return `OTC-FEU-${region}-${dateStr}-${String(counterparty.rank).padStart(4, '0')}`;
  }, [counterparty]);

  const contactEmail = useMemo(() => {
    const dept = counterparty.targetDepartment.toLowerCase();
    const prefix = dept.includes('bunker')
      ? 'bunkering'
      : dept.includes('decarbon')
      ? 'sustainability'
      : 'commercial';
    return `${prefix}@${counterparty.contactDomain}`;
  }, [counterparty.targetDepartment, counterparty.contactDomain]);

  const effectiveClientSavingsEur = useMemo(() => {
    if (pathway === 'PHYSICAL') {
      return marineQuote.totalClientSavingsEur || counterparty.client_savings_physical_eur;
    }
    return counterparty.client_savings_pooling_eur;
  }, [pathway, marineQuote.totalClientSavingsEur, counterparty.client_savings_physical_eur, counterparty.client_savings_pooling_eur]);

  const effectiveDeskMarginEur = useMemo(() => {
    return pathway === 'PHYSICAL'
      ? counterparty.desk_margin_physical_eur
      : counterparty.desk_margin_pooling_eur;
  }, [pathway, counterparty.desk_margin_physical_eur, counterparty.desk_margin_pooling_eur]);

  const generateFullTermSheetText = () => {
    return `================================================================================
INSTITUTIONAL OTC MARINE BIO-LNG TERM SHEET & DEAL NOTE
REGULATION (EU) 2023/1805 (FUELEU) & DIRECTIVE (EU) 2023/959 (EU ETS)
================================================================================
DEAL REFERENCE: ${dealRef}
DATE: ${new Date().toISOString().split('T')[0]}
PORTFOLIO COMPLIANCE RANK: #${counterparty.rank}
STRATEGIC TIER: ${counterparty.strategy_tier}
COUNTERPARTY: ${counterparty.parent_name}
HEADQUARTERS: ${counterparty.headquarters}
COMMERCIAL ADDRESS: ${counterparty.hqAddress}
KEY EXECUTIVE: ${counterparty.key_executive} (${counterparty.keyContactRole})
TARGET DEPARTMENT: ${counterparty.targetDepartment}
COMMERCIAL EMAIL: ${contactEmail}
SWITCHBOARD PHONE: ${counterparty.switchboardPhone}
FLEET SEGMENT: ${counterparty.segment} (${counterparty.vessels_in_scope} vessels in EU MRV scope)
PROPULSION PROFILE: ${
      isDualFuel
        ? `DUAL-FUEL CRYOGENIC LNG READY (${counterparty.lng_vessels_in_scope} LNG vessels / ${counterparty.conventional_vessels_in_scope} conventional)`
        : `CONVENTIONAL PROPULSION ONLY (${counterparty.conventional_vessels_in_scope} 2-stroke diesel vessels)`
    }
PRIMARY BUNKERING HUBS: ${counterparty.primary_bunkering_hubs}
CALLING CORRIDOR: ${CALLING_REGIONS[counterparty.callingRegion]?.label || counterparty.callingRegion}
TRADE LANE: ${TRADE_LANES[counterparty.tradeLane]?.label || counterparty.tradeLane}

1. AUDITED BASELINE FLEET EXPOSURE (EMSA THETIS-MRV)
--------------------------------------------------------------------------------
- Fleet Energy Consumption in EU Scope: ${(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh
- Fleet Fuel Burn: ${counterparty.vlsfo_tonnes.toLocaleString()}t VLSFO / ${counterparty.mgo_tonnes.toLocaleString()}t MGO / ${counterparty.lng_tonnes.toLocaleString()}t LNG
- Actual Achieved GHG Intensity: ${counterparty.actual_ghgie.toFixed(2)} gCO2e/MJ
- 2025 FuelEU Target (2.00% reduction): 89.34 gCO2e/MJ
- Statutory Compliance Balance 2025: ${counterparty.compliance_balance_2025_tco2e > 0 ? '+' : ''}${counterparty.compliance_balance_2025_tco2e.toLocaleString()} tCO2e
- FuelEU 2025 Statutory Penalty: €${counterparty.penalty_2025_y1_eur.toLocaleString()} (Yr 2: €${counterparty.penalty_2025_y2_eur.toLocaleString()})
- EU ETS 2025 Gross Carbon Liability (70% Phase-In @ €${euaPrice.toFixed(2)}/t): €${counterparty.ets_exposure_2025_eur.toLocaleString()} (${counterparty.ets_exposure_2025_tco2.toLocaleString()} tCO2)
- COMBINED 2025 STATUTORY EXPOSURE: €${counterparty.combined_regulatory_exposure_2025_eur.toLocaleString()}

2. INSTITUTIONAL MARINE BUNKER PRICING ENGINE (€/t & $/t)
--------------------------------------------------------------------------------
- Pricing Pathway: ${pathway === 'PHYSICAL' ? 'Article 20 Physical Cryogenic Bio-LNG' : 'Article 21 Compliance Pooling'}
- TTF Natural Gas Front-Month Index: €${ttfGasIndex.toFixed(2)} / MWh
- Liquefaction & Terminalization Fee: €${liquefactionFee.toFixed(2)} / MWh
- Green Bio-LNG Premium (RED III Certified): €${greenPremium.toFixed(2)} / MWh
- All-In Delivered Bio-LNG Price: €${marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh
    * Metric Tonne Price (EUR): €${marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne Bio-LNG
    * Metric Tonne Price (USD): $${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne Bio-LNG
- Benchmark Conventional Alternative Compliance Cost:
    * Alternative Compliance Cost (EUR): €${marineQuote.totalConventionalAlternativeCostEur.toFixed(2)} / tonne Bio-LNG eq
    * Alternative Compliance Cost (USD): $${marineQuote.totalConventionalAlternativeCostUsd.toFixed(2)} / tonne Bio-LNG eq
- Net Client Arbitrage Advantage: +€${marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)} / tonne (+$${marineQuote.netSavingsPerTonneBioLngUsd.toFixed(2)} / tonne)

3. STRUCTURED TRANSACTION SCHEDULE
--------------------------------------------------------------------------------
${
  pathway === 'PHYSICAL'
    ? `- Manure Bio-LNG Volume (-100 CI): ${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (${counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)
- Delivery Terms: DES (Delivered Ex-Ship) / TTS (Truck-to-Ship) at ${counterparty.primary_bunkering_hubs}
- Total Delivered Invoice (EUR): €${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}
- Total Delivered Invoice (USD): $${(marineQuote.totalBioLngInvoiceUsd || 0).toLocaleString()}`
    : `- Article 21 Compliance Allocation: ${Math.abs(counterparty.compliance_balance_2025_tco2e).toLocaleString()} tCO2e (${isSurplus ? 'Surplus Monetisation' : 'Deficit Clearing'})
- Delivery Terms: Bilateral Registry Transfer (EMSA Thetis-MRV Compliance Surplus Pool)
- Spread Clearing Benchmark: €435.00 / tCO2e non-dilutive pool clearing
- Total Compliance Allocation Value: €${Math.round(Math.abs(counterparty.compliance_balance_2025_tco2e) * 435).toLocaleString()}`
}
- Net Client Statutory Savings: €${effectiveClientSavingsEur.toLocaleString()}
- Desk Structuring Margin: €${effectiveDeskMarginEur.toLocaleString()}

4. STATUTORY VERIFICATION & GOVERNING LAW
--------------------------------------------------------------------------------
- Certification: ISCC EU / REDcert-EU Mass Balance under RED III (Directive (EU) 2018/2001)
- EU ETS Zero-Rating: Verified under Regulation (EU) 2015/757 & Directive (EU) 2023/959
- FuelEU Maritime Compliance: Full Article 20 Bunkering / Article 21 Pooling Validation
- Governing Contract: Standard BIMCO Bunker Terms 2020 / EFET Marine Decarbonisation Annex
- Jurisdiction: Rotterdam, The Netherlands (Rotterdam District Court / POB)
================================================================================`;
  };

  const handleExportTermSheetFile = () => {
    const text = generateFullTermSheetText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = counterparty.parent_name.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `TermSheet_${safeName}_FuelEU_BioLNG.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {
      // fallback
    }

    setCopied(true);
    showToast(`Downloaded Term Sheet for ${counterparty.parent_name}!`, 'SUCCESS');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyDealSummary = () => {
    const volumeSummary =
      pathway === 'PHYSICAL'
        ? `${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (-100 CI Manure Bio-LNG)`
        : `${Math.abs(counterparty.compliance_balance_2025_tco2e).toLocaleString()} tCO2e (Article 21 Compliance Pool)`;

    const summary = `[FUELEU MARITIME OTC DEAL SUMMARY]
Ref: ${dealRef}
Date: ${new Date().toISOString().split('T')[0]}
Counterparty: ${counterparty.parent_name} (#${counterparty.rank})
Fleet: ${counterparty.segment} (${counterparty.vessels_in_scope} vessels)
Pathway: ${pathway === 'PHYSICAL' ? 'Physical Cryogenic Bio-LNG (Article 20)' : 'Article 21 Compliance Pooling'}
Volume: ${volumeSummary}
Delivered Price: €${marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne ($${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne)
Net Client Savings: €${(effectiveClientSavingsEur / 1e6).toFixed(2)}M
Desk Margin: €${effectiveDeskMarginEur.toLocaleString()}
Contact: ${counterparty.key_executive} (${contactEmail})`.trim();

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(summary).catch(() => {});
      }
    } catch {
      // fallback
    }

    setDealCopied(true);
    showToast('Deal Summary copied to clipboard!', 'SUCCESS');
    setTimeout(() => setDealCopied(false), 2500);
  };

  const handleExecuteTrade = () => {
    const volumeMwh = Math.max(
      1000,
      Math.round(counterparty.bio_lng_required_neg100_mwh || 10000)
    );
    const url = buildDealUrl({
      marketId: 'FUELEU',
      originCountry: 'NL',
      feedstock: 'manure',
      ci: -100,
      volume: volumeMwh,
      counterparty: counterparty.parent_name,
      legalEntityName: counterparty.parent_name,
      complianceYear: 2025,
      contactEmail: contactEmail,
      contactPhone: counterparty.switchboardPhone,
    });
    navigate(url);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-6 shadow-xs dark:shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#141a29] text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-[#1e2433]">
                {dealRef}
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                {counterparty.parent_name}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                TERM SHEET READY
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Institutional OTC Term Sheet &amp; Deal Note · Compliant under Regulation (EU) 2023/1805 &amp; Directive (EU) 2023/959
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleExportTermSheetFile}
              className="btn btn-secondary flex items-center gap-1.5 text-xs font-semibold px-3 py-2"
              title="Download institutional text file"
            >
              <Download size={13} />
              <span>Export Term Sheet (.TXT)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDealSummary}
              className="btn btn-secondary flex items-center gap-1.5 text-xs font-semibold px-3 py-2"
              title="Copy concise deal summary"
            >
              {dealCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{dealCopied ? 'Copied!' : 'Copy Deal Summary'}</span>
            </button>

            <button
              type="button"
              onClick={handleExecuteTrade}
              className="btn btn-primary flex items-center gap-1.5 text-xs font-bold px-4 py-2 shadow-xs"
              title="Pre-populate and open in Trade Builder"
            >
              <Zap size={13} />
              <span>Execute in Trade Builder →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Term Sheet Preview Box */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl overflow-hidden shadow-xs dark:shadow-md">
        {/* Term Sheet Header Bar */}
        <div className="bg-slate-50 dark:bg-[#141926] border-b border-slate-200 dark:border-[#1e2433] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
            <FileText size={15} className="text-cyan-600 dark:text-cyan-400" />
            <span>Institutional Deal Note Preview</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
            <span>BIMCO BUNKER TERMS 2020</span>
            <span>·</span>
            <span>EFET DECARB ANNEX</span>
          </div>
        </div>

        {/* Formatted Term Sheet Content */}
        <div className="p-6 space-y-6 text-xs text-slate-700 dark:text-zinc-300 font-mono leading-relaxed overflow-x-auto">
          {/* Section 1 */}
          <div className="border border-slate-200 dark:border-[#1e2433] rounded-xl p-4 bg-slate-50/50 dark:bg-[#10141f]">
            <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm mb-2 pb-1 border-b border-slate-200 dark:border-[#1e2433] flex items-center justify-between">
              <span>1. AUDITED BASELINE FLEET EXPOSURE (EMSA THETIS-MRV)</span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">AUDITED DIRECTIVE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>• Fleet Energy in Scope: <strong>{(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh</strong></div>
              <div>• FuelEU Target: <strong>89.34 gCO2e/MJ</strong> (Actual: {counterparty.actual_ghgie.toFixed(2)})</div>
              <div>• Vessels in Scope: <strong>{counterparty.vessels_in_scope}</strong> ({isDualFuel ? `${counterparty.lng_vessels_in_scope} LNG-ready` : 'Conventional'})</div>
              <div>• 2025 FuelEU Penalty: <strong className="text-rose-600 dark:text-rose-400">€{(counterparty.penalty_2025_y1_eur / 1e6).toFixed(2)}M</strong></div>
              <div>• 2025 EU ETS Liability (70%): <strong className="text-amber-600 dark:text-amber-400">€{(counterparty.ets_exposure_2025_eur / 1e6).toFixed(2)}M</strong></div>
              <div>• Combined 2025 Exposure: <strong className="text-slate-900 dark:text-zinc-100">€{(counterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(2)}M</strong></div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="border border-slate-200 dark:border-[#1e2433] rounded-xl p-4 bg-slate-50/50 dark:bg-[#10141f]">
            <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm mb-2 pb-1 border-b border-slate-200 dark:border-[#1e2433] flex items-center justify-between">
              <span>2. INSTITUTIONAL MARINE BUNKER PRICING ENGINE</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">DELIVERED QUOTE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>• TTF Natural Gas Front-Month: <strong>€{ttfGasIndex.toFixed(2)} / MWh</strong></div>
              <div>• Liquefaction &amp; Terminal Fee: <strong>€{liquefactionFee.toFixed(2)} / MWh</strong></div>
              <div>• RED III Green Bio-LNG Premium: <strong>€{greenPremium.toFixed(2)} / MWh</strong></div>
              <div>• All-In Bio-LNG Energy Price: <strong className="text-cyan-700 dark:text-cyan-300">€{marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh</strong></div>
              <div>• Delivered Bio-LNG Quote (EUR): <strong className="text-slate-900 dark:text-zinc-100 text-sm">€{marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne</strong></div>
              <div>• Delivered Bio-LNG Quote (USD): <strong className="text-slate-900 dark:text-zinc-100 text-sm">${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne</strong></div>
              <div>• Benchmark Conventional Alternative: <strong>€{marineQuote.totalConventionalAlternativeCostEur.toFixed(2)} / t Bio-LNG eq</strong></div>
              <div>• Net Client Arbitrage Advantage: <strong className="text-emerald-600 dark:text-emerald-400">+€{marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)} / tonne</strong></div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="border border-slate-200 dark:border-[#1e2433] rounded-xl p-4 bg-slate-50/50 dark:bg-[#10141f]">
            <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm mb-2 pb-1 border-b border-slate-200 dark:border-[#1e2433] flex items-center justify-between">
              <span>3. STRUCTURED TRANSACTION SCHEDULE &amp; EXECUTION</span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">OTC COMMODITY</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>• Product Volume: <strong>{pathway === 'PHYSICAL' ? `${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (${counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)` : `${Math.abs(counterparty.compliance_balance_2025_tco2e).toLocaleString()} tCO₂e (Article 21)`}</strong></div>
              <div>• Substrate / Solution: <strong>{pathway === 'PHYSICAL' ? 'Manure (-100 gCO₂e/MJ)' : 'Drop-in Biofuel Compliance Pool'}</strong></div>
              <div>• Delivery Hubs / Registry: <strong>{counterparty.primary_bunkering_hubs}</strong> ({pathway === 'PHYSICAL' ? 'DES / TTS' : 'Thetis-MRV'})</div>
              <div>• Total Transaction Value: <strong>{pathway === 'PHYSICAL' ? `€${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}` : `€${Math.round(Math.abs(counterparty.compliance_balance_2025_tco2e) * 435).toLocaleString()}`}</strong></div>
              <div>• Total Net Client Savings: <strong className="text-emerald-600 dark:text-emerald-400">€{effectiveClientSavingsEur.toLocaleString()}</strong></div>
              <div>• Desk Structuring Margin: <strong className="text-cyan-700 dark:text-cyan-300">€{effectiveDeskMarginEur.toLocaleString()}</strong></div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="border border-slate-200 dark:border-[#1e2433] rounded-xl p-4 bg-slate-50/50 dark:bg-[#10141f]">
            <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm mb-2 pb-1 border-b border-slate-200 dark:border-[#1e2433] flex items-center justify-between">
              <span>4. STATUTORY VERIFICATION &amp; GOVERNING JURISDICTION</span>
              <span className="text-[10px] text-slate-500 font-normal">LEGAL VALIDATION</span>
            </div>
            <div className="text-xs space-y-1 text-slate-600 dark:text-zinc-300">
              <div>• Certification: ISCC EU / REDcert-EU Mass Balance under RED III (Directive (EU) 2018/2001)</div>
              <div>• EU ETS Zero-Rating: Verified under Regulation (EU) 2015/757 &amp; Directive (EU) 2023/959</div>
              <div>• Governing Contract: Standard BIMCO Bunker Terms 2020 / EFET Marine Decarbonisation Annex</div>
              <div>• Jurisdiction: Rotterdam, The Netherlands (POB / Rotterdam District Court Arbitration)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary flex items-center gap-2 text-xs font-semibold px-4 py-2"
        >
          <ArrowLeft size={14} />
          <span>Back: Pricing</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="btn btn-secondary flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
          >
            <RotateCcw size={13} />
            <span>Start New Deal (Return to Directory)</span>
          </button>

          <button
            type="button"
            onClick={handleExecuteTrade}
            className="btn btn-primary flex items-center gap-2 text-xs font-bold px-5 py-2 shadow-xs"
          >
            <Zap size={14} />
            <span>Execute in Trade Builder →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
