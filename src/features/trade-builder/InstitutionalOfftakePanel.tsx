import React, { useState, useMemo } from 'react';
import { 
  DualLegOfftakeStructure, 
  DualLegPricingResult, 
  EnergyHeatingValueBasis, 
  SubsidySupportType 
} from '../../domain/offtake/types';
import { 
  calculateDualLegOfftake, 
  DEFAULT_INSTITUTIONAL_OFFTAKE,
  convertHhvToLhv,
  convertLhvToHhv,
  HHV_TO_LHV_FACTOR
} from '../../domain/offtake/engine';
import { evaluateCommercialGates } from '../../domain/offtake/commercialGates';
import { 
  FileText, 
  Zap, 
  Flame, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  ArrowRightLeft, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2,
  Calendar,
  Building2,
  Receipt,
  Scale
} from 'lucide-react';

import { useAppState } from '../../store/context';

interface OfftakePreset {
  name: string;
  seller: string;
  buyer: string;
  asset: string;
  ean: string;
  country: string;
  volumeMin: number;
  volumeMax: number;
  unsupportedBasePrice: number;
  supportedBasePrice: number;
  baseCi: number;
  deliveredCi: number;
  support: SubsidySupportType;
  sourceDocument: string | null;
  isIllustrative: boolean;
  provenanceNote: string;
}

const OFFTAKE_PRESETS: OfftakePreset[] = [
  {
    name: 'RWEST / PUZZLE Donderen 45 GWh',
    seller: 'Puzzle Carbon Bio Energy B.V.',
    buyer: 'RWE Supply & Trading GmbH',
    asset: 'PUZZLE Donderen Installation',
    ean: '871694831000490657',
    country: 'NL',
    volumeMin: 40000,
    volumeMax: 55000,
    unsupportedBasePrice: 53.00,
    supportedBasePrice: 54.00,
    baseCi: -20.0,
    deliveredCi: -50.0,
    support: 'NETHERLANDS_SDE_PLUS_PLUS',
    sourceDocument: 'RWE 2025 Indicative Term Sheet — Puzzle Donderen',
    isIllustrative: false,
    provenanceNote: 'Verified authentic contract terms from RWE 2025/2026 Term Sheet & Appendix 1',
  },
  {
    name: 'French CIVE — transmission-connected, index-linked',
    seller: 'Illustrative Agricultural Producer S.A.S.',
    buyer: 'Institutional Offtake Desk',
    asset: 'Illustrative CIVE Biomethane Installation',
    ean: 'FR000000000000',
    country: 'FR',
    volumeMin: 45000,
    volumeMax: 60000,
    unsupportedBasePrice: 58.00,
    supportedBasePrice: 60.00,
    baseCi: 15.0,
    deliveredCi: 10.0,
    support: 'FRANCE_TARIF_ACHAT_FIT',
    sourceDocument: null,
    isIllustrative: true,
    provenanceNote: 'Illustrative archetype: French agricultural CIVE transmission structure',
  },
  {
    name: 'Danish manure — deep negative CI, full offtake',
    seller: 'Illustrative Danish Biogas ApS',
    buyer: 'Institutional Offtake Desk',
    asset: 'Illustrative Danish Manure/Slurry Facility',
    ean: 'DK000000000000',
    country: 'DK',
    volumeMin: 60000,
    volumeMax: 100000,
    unsupportedBasePrice: 52.00,
    supportedBasePrice: 52.00,
    baseCi: -50.0,
    deliveredCi: -85.0,
    support: 'UNSUPPORTED_MERCHANT',
    sourceDocument: null,
    isIllustrative: true,
    provenanceNote: 'Illustrative archetype: Danish deep-negative CI manure full-offtake structure',
  },
];

export function InstitutionalOfftakePanel() {
  const { state } = useAppState();
  const liveGasIndex = state.marks.gasIndex.mid;
  const [offtakeConfig, setOfftakeConfig] = useState<DualLegOfftakeStructure>(DEFAULT_INSTITUTIONAL_OFFTAKE);
  const [includeCompression, setIncludeCompression] = useState<boolean>(false);
  const [heatingValueBasis, setHeatingValueBasis] = useState<EnergyHeatingValueBasis>('HHV');

  // Adjusted delivered CI based on compression toggle (+4.6 gCO2e/MJ)
  const effectiveDeliveredCi = useMemo(() => {
    const rawCi = offtakeConfig.certificateLeg.deliveredCarbonIntensity;
    return includeCompression ? rawCi + 4.6 : rawCi;
  }, [offtakeConfig.certificateLeg.deliveredCarbonIntensity, includeCompression]);

  // Compute live pricing result
  const pricingResult: DualLegPricingResult = useMemo(() => {
    const configWithEffectiveCi = {
      ...offtakeConfig,
      certificateLeg: {
        ...offtakeConfig.certificateLeg,
        deliveredCarbonIntensity: effectiveDeliveredCi,
        heatingValueBasis
      }
    };
    return calculateDualLegOfftake(configWithEffectiveCi, liveGasIndex);
  }, [offtakeConfig, effectiveDeliveredCi, heatingValueBasis, liveGasIndex]);

  // Compute 12-Gate Commercial Assessment
  const commercialAssessment = useMemo(() => {
    return evaluateCommercialGates(offtakeConfig, {
      liveGasIndexMid: liveGasIndex,
    });
  }, [offtakeConfig, liveGasIndex]);

  const handleApplyPreset = (preset: OfftakePreset) => {
    setOfftakeConfig(prev => ({
      ...prev,
      contractName: preset.name,
      sellerName: preset.seller,
      buyerName: preset.buyer,
      sourceDocument: preset.sourceDocument,
      isIllustrative: preset.isIllustrative,
      productionAsset: {
        ...prev.productionAsset,
        assetName: preset.asset,
        eanOrGsrnCode: preset.ean,
        countryCode: preset.country,
      },
      flowProfile: {
        ...prev.flowProfile,
        estimatedAnnualVolumeMinMWh: preset.volumeMin,
        estimatedAnnualVolumeMaxMWh: preset.volumeMax,
        maximumDeliveryVolumeMWh: preset.volumeMax,
      },
      certificateLeg: {
        ...prev.certificateLeg,
        ciSlider: {
          ...prev.certificateLeg.ciSlider,
          basePriceEurPerMWh: preset.unsupportedBasePrice,
          baseCarbonIntensity: preset.baseCi,
        },
        deliveredCarbonIntensity: preset.deliveredCi,
      },
      subsidySwitching: {
        ...prev.subsidySwitching,
        activeSupport: preset.support,
        enabled: preset.support === 'NETHERLANDS_SDE_PLUS_PLUS',
        sdeTerms: prev.subsidySwitching.sdeTerms ? {
          ...prev.subsidySwitching.sdeTerms,
          supportedBasePriceEurPerMWh: preset.supportedBasePrice,
        } : undefined
      }
    }));
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Banner & Presets */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-700 flex items-center justify-center text-teal-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm font-bold text-stone-100">
                  Institutional Long-Term Offtake Structurer
                </h2>
                {offtakeConfig.isIllustrative ? (
                  <span className="text-[10px] text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Sliders className="w-3 h-3" />
                    <span>ILLUSTRATIVE ARCHETYPE</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-teal-400 bg-teal-950 border border-teal-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>VERIFIED CONTRACT: {offtakeConfig.sourceDocument}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Decoupled Physical Gas (0.99 × Spot Index) &amp; Environmental Attribute (PoS + GoO) with Dynamic CI True-Up &amp; SDE++ Arbitrage
              </p>
            </div>
          </div>

          {/* Heating Value Basis Selector */}
          <div className="flex items-center gap-2 bg-stone-950 p-1 rounded-lg border border-stone-800">
            <span className="text-[10px] font-mono text-stone-400 px-2 uppercase font-bold">Energy Basis:</span>
            <button
              type="button"
              onClick={() => setHeatingValueBasis('HHV')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                heatingValueBasis === 'HHV'
                  ? 'bg-teal-600 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              HHV (Gross - VertiCer/UK)
            </button>
            <button
              type="button"
              onClick={() => setHeatingValueBasis('LHV')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                heatingValueBasis === 'LHV'
                  ? 'bg-teal-600 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              LHV (Net - Nabisy/RED III)
            </button>
          </div>
        </div>

        {/* Contract Templates */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-stone-400 uppercase font-semibold">Contract Archetypes:</span>
          {OFFTAKE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-2.5 py-1 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-teal-700/60 rounded-md text-[11px] font-mono text-stone-300 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="w-3 h-3 text-teal-400" />
              <span>{preset.name}</span>
              {preset.isIllustrative && (
                <span className="text-[9px] text-amber-400 bg-amber-950 px-1 py-0.2 rounded">SIM</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Three-Column Offtake Structuring Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: LEG A - PHYSICAL GAS SUPPLY (THE MOLECULE) */}
        {/* ========================================================================= */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="font-mono text-xs font-bold uppercase text-stone-200 tracking-wider">
                Leg A: Physical Gas (Molecule)
              </h3>
            </div>
            <span className="font-mono text-[10px] bg-amber-950/80 border border-amber-800 text-amber-400 px-2 py-0.5 rounded font-semibold">
              0.99 × Spot Index
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Spot Benchmark Hub */}
            <div>
              <label className="block text-[11px] text-stone-400 mb-1 font-semibold">Wholesale Gas Hub &amp; Index</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['TTF', 'THE', 'PEG', 'NBP', 'PSV', 'PVB'] as const).map(hub => (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => setOfftakeConfig(prev => ({
                      ...prev,
                      physicalGasLeg: { ...prev.physicalGasLeg, benchmarkHub: hub }
                    }))}
                    className={`py-1 px-2 rounded border text-center transition-all cursor-pointer ${
                      offtakeConfig.physicalGasLeg.benchmarkHub === hub
                        ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {hub} Spot
                  </button>
                ))}
              </div>
            </div>

            {/* Benchmark Price Input & Contract Factor */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-stone-400 mb-1">
                  Desk Spot Gas (€/MWh) <span className="text-amber-400">{liveGasIndex != null ? `(Mid: €${liveGasIndex.toFixed(2)})` : '*Live'}</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={liveGasIndex != null ? liveGasIndex.toFixed(2) : 'Enter €/MWh'}
                  value={offtakeConfig.physicalGasLeg.marketBenchmarkPriceEurPerMWh ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                    setOfftakeConfig(prev => ({
                      ...prev,
                      physicalGasLeg: { ...prev.physicalGasLeg, marketBenchmarkPriceEurPerMWh: val }
                    }));
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 font-bold focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-stone-400 mb-1">Contract Factor</label>
                <input
                  type="number"
                  step="0.01"
                  value={offtakeConfig.physicalGasLeg.indexDiscountFactor}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setOfftakeConfig(prev => ({
                      ...prev,
                      physicalGasLeg: { ...prev.physicalGasLeg, indexDiscountFactor: val }
                    }));
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 font-bold focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {/* TSO Entry & Shipper Fees */}
            <div className="p-2.5 bg-stone-950 rounded-lg border border-stone-800/80 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-stone-400">TSO Entry Capacity Booking:</span>
                <span className="text-stone-200 font-semibold">
                  {offtakeConfig.physicalGasLeg.entryCapacityBookingCostEurPerMWh != null
                    ? `-€${offtakeConfig.physicalGasLeg.entryCapacityBookingCostEurPerMWh.toFixed(2)}/MWh`
                    : 'Unset (€0.00)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-stone-400">Shipper Nomination Fee:</span>
                <span className="text-stone-200 font-semibold">
                  {offtakeConfig.physicalGasLeg.shipperNominationFeeEurPerMWh != null
                    ? `-€${offtakeConfig.physicalGasLeg.shipperNominationFeeEurPerMWh.toFixed(2)}/MWh`
                    : 'Unset (€0.00)'}
                </span>
              </div>
            </div>

            {/* Net Physical Leg Output */}
            <div className="p-3 bg-amber-950/40 border border-amber-800/70 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-stone-300 font-semibold">Net Physical Gas Value:</span>
                <span className="text-base font-bold text-amber-300">
                  {pricingResult.physicalDeliveredNetCostEurPerMWh != null ? (
                    <>€{pricingResult.physicalDeliveredNetCostEurPerMWh.toFixed(2)} <span className="text-xs text-stone-400">/ MWh</span></>
                  ) : (
                    <span className="text-xs text-stone-400 font-normal">Pending gas mark</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-2">
                <Receipt className="w-3 h-3 text-amber-400" />
                <span>Settlement: Invoiced monthly on the 20th day following delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: LEG B - ENVIRONMENTAL ATTRIBUTES & DYNAMIC CI SLIDER */}
        {/* ========================================================================= */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h3 className="font-mono text-xs font-bold uppercase text-stone-200 tracking-wider">
                Leg B: Environmental Certificate (PoS + GoO)
              </h3>
            </div>
            <span className="font-mono text-[10px] bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded font-semibold">
              Dynamic CI Slider
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Base Certificate Price & Base CI */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-stone-400 mb-1">Contract Base Price (€/MWh)</label>
                <input
                  type="number"
                  step="0.5"
                  value={offtakeConfig.certificateLeg.ciSlider.basePriceEurPerMWh}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setOfftakeConfig(prev => ({
                      ...prev,
                      certificateLeg: {
                        ...prev.certificateLeg,
                        ciSlider: { ...prev.certificateLeg.ciSlider, basePriceEurPerMWh: val }
                      }
                    }));
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 font-bold focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-stone-400 mb-1">Base CI (gCO₂e/MJ)</label>
                <input
                  type="number"
                  step="1"
                  value={offtakeConfig.certificateLeg.ciSlider.baseCarbonIntensity}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setOfftakeConfig(prev => ({
                      ...prev,
                      certificateLeg: {
                        ...prev.certificateLeg,
                        ciSlider: { ...prev.certificateLeg.ciSlider, baseCarbonIntensity: val }
                      }
                    }));
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 font-bold focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Delivered CI Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-stone-300 font-semibold">Actual Delivered Batch CI:</label>
                <span className="font-bold text-emerald-400 text-sm">
                  {effectiveDeliveredCi.toFixed(1)} <span className="text-[10px] text-stone-400">gCO₂e/MJ</span>
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="40"
                step="1"
                value={offtakeConfig.certificateLeg.deliveredCarbonIntensity}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setOfftakeConfig(prev => ({
                    ...prev,
                    certificateLeg: { ...prev.certificateLeg, deliveredCarbonIntensity: val }
                  }));
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Compression Toggle (+4.6 gCO2e/MJ) */}
            <div className="flex items-center justify-between p-2 bg-stone-950 rounded border border-stone-800">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="compression-check"
                  checked={includeCompression}
                  onChange={e => setIncludeCompression(e.target.checked)}
                  className="rounded border-stone-700 accent-teal-500 cursor-pointer"
                />
                <label htmlFor="compression-check" className="text-[11px] text-stone-300 cursor-pointer">
                  Add +4.6 g Grid Compression Emissions
                </label>
              </div>
              <span className="text-[10px] text-stone-500">Excl. at plant gate</span>
            </div>

            {/* Buyer Rejection Warning Banner */}
            {pricingResult.buyerRejectionTriggered && (
              <div className="p-2.5 bg-red-950/80 border border-red-700 rounded-lg flex items-start gap-2 text-red-300 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Buyer Rejection Triggered (CI &gt; 0 g/MJ)</strong>
                  <span>Under Clause 25.4, Buyer has the unilateral right to reject batches with CI &gt; 0.</span>
                </div>
              </div>
            )}

            {/* CI Slider Formula Breakdown */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/70 rounded-lg space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-stone-400">CI Slider True-Up (0.65 × ΔCI):</span>
                <span className={`font-bold ${pricingResult.ciSliderAdjustmentEurPerMWh >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pricingResult.ciSliderAdjustmentEurPerMWh >= 0 ? '+' : ''}€{pricingResult.ciSliderAdjustmentEurPerMWh.toFixed(2)}/MWh
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-300 font-semibold">Final Certificate Contract Price:</span>
                <span className="text-base font-bold text-emerald-300">
                  €{pricingResult.finalCertificatePriceEurPerMWh.toFixed(2)} <span className="text-xs text-stone-400">/ MWh</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 pt-1 border-t border-emerald-900/50">
                <Receipt className="w-3 h-3 text-emerald-400" />
                <span>Settlement: Invoiced 10 business days after electronic transfer</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: COMBINED VALUE STACK & STATE SUBSIDY (SDE++) ARBITRAGE */}
        {/* ========================================================================= */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-400" />
              <h3 className="font-mono text-xs font-bold uppercase text-stone-200 tracking-wider">
                SDE++ Arbitrage &amp; Ledger
              </h3>
            </div>
            <span className="font-mono text-[10px] bg-teal-950/80 border border-teal-800 text-teal-400 px-2 py-0.5 rounded font-semibold">
              Clause 25.6 Fidelity
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Total Combined Delivered Price (Unsupported) */}
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
              <div className="text-[10px] uppercase font-bold text-stone-400">Total Combined Offtake Price (Unsupported)</div>
              <div className="text-2xl font-black text-teal-300 mt-0.5">
                {pricingResult.totalDeliveredOfftakePriceEurPerMWh != null ? (
                  <>€{pricingResult.totalDeliveredOfftakePriceEurPerMWh.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-stone-400">/ MWh ({heatingValueBasis})</span></>
                ) : (
                  <span className="text-sm font-semibold text-stone-400">Pending physical gas mark</span>
                )}
              </div>
              <div className="text-[11px] text-stone-400 mt-1 flex justify-between">
                <span>Annual Output Range:</span>
                <strong className="text-stone-200">
                  {offtakeConfig.flowProfile.estimatedAnnualVolumeMinMWh.toLocaleString()} – {offtakeConfig.flowProfile.estimatedAnnualVolumeMaxMWh.toLocaleString()} MWh
                </strong>
              </div>
              {pricingResult.totalAnnualRevenueMinEur != null && pricingResult.totalAnnualRevenueMaxEur != null && (
                <div className="text-[11px] text-stone-400 mt-0.5 flex justify-between">
                  <span>Est. Annual Turnover:</span>
                  <strong className="text-teal-400">
                    €{pricingResult.totalAnnualRevenueMinEur.toLocaleString()} – €{pricingResult.totalAnnualRevenueMaxEur.toLocaleString()}/y
                  </strong>
                </div>
              )}
            </div>

            {/* SDE++ Support Switching Widget */}
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Buyer Support Switching Option (Clause 25.6)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setOfftakeConfig(prev => ({
                    ...prev,
                    subsidySwitching: {
                      ...prev.subsidySwitching,
                      activeSupport: prev.subsidySwitching.activeSupport === 'NETHERLANDS_SDE_PLUS_PLUS'
                        ? 'UNSUPPORTED_MERCHANT'
                        : 'NETHERLANDS_SDE_PLUS_PLUS',
                      enabled: prev.subsidySwitching.activeSupport !== 'NETHERLANDS_SDE_PLUS_PLUS'
                    }
                  }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                    offtakeConfig.subsidySwitching.activeSupport === 'NETHERLANDS_SDE_PLUS_PLUS'
                      ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                      : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {offtakeConfig.subsidySwitching.activeSupport === 'NETHERLANDS_SDE_PLUS_PLUS' ? 'SDE+ ACTIVE' : 'UNSUPPORTED'}
                </button>
              </div>

              {/* Exact Statutory 4-Term Formula Breakdown */}
              <div className="space-y-1.5 text-[11px] p-2 bg-stone-900/90 rounded border border-stone-800">
                <div className="flex justify-between">
                  <span className="text-stone-400">SDE Payout from RVO:</span>
                  <span className="text-emerald-400 font-semibold">
                    {pricingResult.sdePaymentFromRvoEurPerMWh != null ? `€${pricingResult.sdePaymentFromRvoEurPerMWh.toFixed(2)}/MWh` : 'Unset'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Supported Cert Price from Buyer (54 + 1 - SDE):</span>
                  <span className="text-amber-300 font-semibold">
                    {pricingResult.supportedCertificatePriceEurPerMWh != null ? `€${pricingResult.supportedCertificatePriceEurPerMWh.toFixed(2)}/MWh` : 'Unset'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-800 font-bold">
                  <span className="text-stone-300">Total Seller Supported Cert Revenue:</span>
                  <span className="text-teal-300">€{pricingResult.totalSellerCertificateRevenueEurPerMWh.toFixed(2)}/MWh</span>
                </div>
              </div>

              {/* Optimal Support Recommendation Badge */}
              <div className={`p-2 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                pricingResult.optimalSupportState === 'SWITCH_OFF_MERCHANT'
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                  : pricingResult.optimalSupportState === 'SWITCH_ON_SUBSIDY'
                    ? 'bg-sky-950/70 border-sky-700 text-sky-300'
                    : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}>
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {pricingResult.optimalSupportState === 'SWITCH_OFF_MERCHANT' && pricingResult.subsidyDeltaEurPerMWh != null
                    ? `SWITCH OFF SDE+: +€${pricingResult.subsidyDeltaEurPerMWh.toFixed(2)}/MWh Merchant Premium`
                    : pricingResult.optimalSupportState === 'SWITCH_ON_SUBSIDY'
                      ? 'SWITCH ON SDE+: State Floor Protection Active'
                      : 'Pending floating mark to compute arbitrage delta'}
                </span>
              </div>
            </div>

            {/* Flow Capacity & Prolongation Info */}
            <div className="p-2.5 bg-stone-950 rounded-lg border border-stone-800 text-[11px] text-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>Hourly Flow Ceiling:</span>
                <strong className="text-stone-200">{offtakeConfig.flowProfile.maximumHourlyFlowMWhPerHour} MWh/h (1,000 Nm³/h)</strong>
              </div>
              <div className="flex justify-between">
                <span>Annual Range:</span>
                <strong className="text-stone-200">
                  {offtakeConfig.flowProfile.estimatedAnnualVolumeMinMWh.toLocaleString()} – {offtakeConfig.flowProfile.estimatedAnnualVolumeMaxMWh.toLocaleString()} MWh/y
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Contract Duration:</span>
                <strong className="text-stone-200">{offtakeConfig.deliveryPeriod.startYear} – {offtakeConfig.deliveryPeriod.endYear} (+1y Option)</strong>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Institutional Commercial Terms Gates (12-Gate Financial Consequence Audit) */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-stone-800 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h3 className="font-mono text-xs font-bold uppercase text-stone-100 tracking-wider">
              Commercial Terms Gates — Financial Consequence &amp; Counterparty Question Audit
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-stone-400">
              Unpriced Counterparty Options: <strong className="text-amber-400">{commercialAssessment.unpricedOptionCount}</strong>
            </span>
            <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
              commercialAssessment.overallVerdict === 'PASS'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : commercialAssessment.overallVerdict === 'CONDITIONAL'
                  ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                  : 'bg-red-950/80 border-red-700 text-red-300'
            }`}>
              Overall: {commercialAssessment.overallVerdict}
            </span>
          </div>
        </div>

        {/* 12-Gate Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono text-xs">
          {commercialAssessment.gates.map((g, idx) => {
            const isPass = g.verdict === 'PASS';
            const isCond = g.verdict === 'CONDITIONAL';
            const isUnres = g.verdict === 'UNRESOLVED';

            return (
              <div 
                key={idx} 
                className={`p-2.5 rounded-lg border flex flex-col justify-between space-y-2 ${
                  isPass
                    ? 'bg-stone-950 border-stone-800/80'
                    : isCond
                      ? 'bg-amber-950/20 border-amber-800/50'
                      : 'bg-red-950/20 border-red-800/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="font-bold text-stone-200 text-[11px] truncate">{g.gateLabel}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                      isPass
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : isCond
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                    }`}>
                      {g.verdict}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-relaxed font-sans">{g.reason}</p>
                </div>

                <div className="pt-2 border-t border-stone-800/60 space-y-1 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Economic Consequence:</span>
                    <span className="font-bold text-stone-300">
                      {g.impactEurPerMWh !== null ? `€${g.impactEurPerMWh.toFixed(2)}/MWh` : 'Unpriced'}
                    </span>
                  </div>
                  <div className="text-[9px] text-stone-500 font-sans italic">{g.impactBasis}</div>
                  
                  {/* Actionable Counterparty Question when not PASS */}
                  {g.question && (
                    <div className="mt-1.5 p-1.5 bg-amber-950/40 border border-amber-800/40 rounded text-amber-300 text-[10px] font-sans">
                      <strong className="block font-mono text-[9px] text-amber-400 uppercase">Trader Question:</strong>
                      <span>{g.question}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
