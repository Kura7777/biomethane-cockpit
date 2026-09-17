import React, { useMemo } from 'react';
import { ShippingCounterparty } from '../../../domain/fueleu/types';
import {
  calculateMarineBunkerQuotation,
  DEFAULT_TTF_GAS_INDEX_EUR_MWH,
  DEFAULT_LIQUEFACTION_FEE_EUR_MWH,
  DEFAULT_GREEN_PREMIUM_EUR_MWH,
  DEFAULT_VLSFO_PRICE_USD_PER_TONNE,
  EUA_BENCHMARK_EUR_PER_TONNE,
} from '../../../domain/fueleu/calculator';
import {
  Sliders,
  Flame,
  Scale,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  DollarSign,
  Plus,
  Minus,
  CheckCircle2,
  Ship,
} from 'lucide-react';
import { showToast } from '../../../app/DeskToastContainer';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

interface ShippingBunkerPricingStepProps {
  counterparty: ShippingCounterparty;
  pathway: 'PHYSICAL' | 'POOLING';
  setPathway: (pathway: 'PHYSICAL' | 'POOLING') => void;
  ttfGasIndex: number;
  setTtfGasIndex: (val: number) => void;
  liquefactionFee: number;
  setLiquefactionFee: (val: number) => void;
  greenPremium: number;
  setGreenPremium: (val: number) => void;
  euaPrice: number;
  setEuaPrice: (val: number) => void;
  vlsfoPrice: number;
  setVlsfoPrice: (val: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ShippingBunkerPricingStep({
  counterparty,
  pathway,
  setPathway,
  ttfGasIndex,
  setTtfGasIndex,
  liquefactionFee,
  setLiquefactionFee,
  greenPremium,
  setGreenPremium,
  euaPrice,
  setEuaPrice,
  vlsfoPrice,
  setVlsfoPrice,
  onBack,
  onNext,
}: ShippingBunkerPricingStepProps) {
  const isDualFuel = counterparty.fleetCapability === 'DUAL_FUEL_LNG';
  const isSurplus = counterparty.compliance_balance_2025_tco2e > 0;
  const absDeficit = Math.abs(counterparty.compliance_balance_2025_tco2e);

  // Compute live marine quotation
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

  const handleResetDefaults = () => {
    setTtfGasIndex(DEFAULT_TTF_GAS_INDEX_EUR_MWH);
    setLiquefactionFee(DEFAULT_LIQUEFACTION_FEE_EUR_MWH);
    setGreenPremium(DEFAULT_GREEN_PREMIUM_EUR_MWH);
    setEuaPrice(EUA_BENCHMARK_EUR_PER_TONNE);
    setVlsfoPrice(DEFAULT_VLSFO_PRICE_USD_PER_TONNE);
    showToast('Pricing parameters reset to benchmark defaults', 'INFO');
  };

  // Stepper helper
  const renderParamSlider = (
    label: string,
    subLabel: string,
    value: number,
    setter: (val: number) => void,
    min: number,
    max: number,
    step: number,
    unit: string
  ) => {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433] space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
              {label}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              {subLabel}
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <button
              type="button"
              onClick={() => setter(Math.max(min, Number((value - step).toFixed(2))))}
              className="w-6 h-6 rounded flex items-center justify-center bg-white dark:bg-[#0e1118] border border-slate-300 dark:border-[#1e2433] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Minus size={11} />
            </button>
            <span
              className="text-sm font-bold text-slate-900 dark:text-zinc-100 min-w-[65px] text-center"
              style={{ fontFamily: MONO_FONT }}
            >
              €{value.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => setter(Math.min(max, Number((value + step).toFixed(2))))}
              className="w-6 h-6 rounded flex items-center justify-center bg-white dark:bg-[#0e1118] border border-slate-300 dark:border-[#1e2433] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Plus size={11} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className="flex-1 accent-cyan-600 dark:accent-cyan-400 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
          />
          <span className="text-[11px] text-slate-400 font-mono w-14 text-right">
            {unit}
          </span>
        </div>
      </div>
    );
  };

  const clientSavingsEur =
    pathway === 'PHYSICAL'
      ? marineQuote.totalClientSavingsEur || counterparty.client_savings_physical_eur
      : counterparty.client_savings_pooling_eur;

  const tradingMarginEur =
    pathway === 'PHYSICAL'
      ? counterparty.desk_margin_physical_eur
      : counterparty.desk_margin_pooling_eur;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-6 shadow-xs dark:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#141a29] text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-[#1e2433]">
                #{counterparty.rank}
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                {counterparty.parent_name}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {isSurplus ? (
                <>
                  Monetising{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    +{(counterparty.compliance_balance_2025_tco2e / 1000).toFixed(1)} kt FuelEU surplus
                  </strong>{' '}
                  via Article 21 pooling · Direct Thetis-MRV registry transfer across{' '}
                  <strong className="text-cyan-700 dark:text-cyan-300">
                    {counterparty.primary_bunkering_hubs}
                  </strong>
                </>
              ) : (
                <>
                  Structuring commercial compliance for{' '}
                  <strong className="text-slate-800 dark:text-zinc-200">
                    {counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes
                  </strong>{' '}
                  Bio-LNG ({counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh) · Delivery at{' '}
                  <strong className="text-cyan-700 dark:text-cyan-300">
                    {counterparty.primary_bunkering_hubs}
                  </strong>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn btn-secondary flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 self-start sm:self-auto"
            title="Reset parameters to benchmark defaults"
          >
            <RotateCcw size={12} />
            <span>Reset Benchmarks</span>
          </button>
        </div>
      </div>

      {/* Pathway Selector */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-6 shadow-xs dark:shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Select Commercial Compliance Pathway
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            {isDualFuel ? 'Dual-Fuel LNG engine profile detected' : 'Conventional engine profile detected'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pathway 1: Physical Cryogenic Bio-LNG */}
          <div
            onClick={() => setPathway('PHYSICAL')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
              pathway === 'PHYSICAL'
                ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-xs'
                : 'border-slate-200 dark:border-[#1e2433] bg-slate-50/50 dark:bg-[#10141f] hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {isDualFuel && (
              <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                RECOMMENDED
              </span>
            )}
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  pathway === 'PHYSICAL'
                    ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-stone-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <Flame size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Physical Cryogenic Bio-LNG (Article 20)
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                  Direct Bunkering (DES / TTS)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-3">
              Delivered physical molecule with certified ISCC EU RED III proof of sustainability (-100 CI manure substrate). Delivers 0.000 tCO₂/t EU ETS zero-rating and 100% FuelEU penalty elimination.
            </p>

            <div className="flex items-center gap-3 text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
              <span>✓ -100 CI Manure Substrate</span>
              <span>✓ ARA &amp; Med Hubs</span>
              <span>✓ Double Exemption</span>
            </div>
          </div>

          {/* Pathway 2: Article 21 Compliance Pooling */}
          <div
            onClick={() => setPathway('POOLING')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
              pathway === 'POOLING'
                ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-xs'
                : 'border-slate-200 dark:border-[#1e2433] bg-slate-50/50 dark:bg-[#10141f] hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {!isDualFuel && (
              <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                RECOMMENDED
              </span>
            )}
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  pathway === 'POOLING'
                    ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-stone-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <Scale size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Article 21 Compliance Pooling
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                  Paper Allocation (Drop-in Biofuels)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-3">
              Zero engine modifications or physical bunkering required. Reallocates compliance surplus from our institutional pool directly into the client’s Thetis-MRV account at a guaranteed spread discount.
            </p>

            <div className="flex items-center gap-3 text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
              <span>✓ Zero Capex / Retrofit</span>
              <span>✓ Paper Transfer</span>
              <span>✓ Guaranteed Spread</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Engine & Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Pricing Parameters (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-6 shadow-xs dark:shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1e2433]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                Commercial Pricing Parameters
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              3-Component Stack
            </span>
          </div>

          <div className="space-y-3">
            {renderParamSlider(
              'TTF Natural Gas Front-Month Index',
              'Dutch Title Transfer Facility wholesale benchmark',
              ttfGasIndex,
              setTtfGasIndex,
              20,
              70,
              0.5,
              '€/MWh'
            )}

            {renderParamSlider(
              'Liquefaction & Logistics Fee',
              'Small-scale liquefaction, bunkering barge & terminal fee',
              liquefactionFee,
              setLiquefactionFee,
              5,
              30,
              0.5,
              '€/MWh'
            )}

            {renderParamSlider(
              'Green Bio-LNG Environmental Premium',
              'RED III manure -100 CI mass balance certification spread',
              greenPremium,
              setGreenPremium,
              10,
              45,
              0.5,
              '€/MWh'
            )}
          </div>

          {/* Pricing Stack Formula Footer */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433] flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-zinc-400">
              Delivered All-In Energy Price:
            </span>
            <span
              className="font-mono font-bold text-sm text-cyan-700 dark:text-cyan-300"
              style={{ fontFamily: MONO_FONT }}
            >
              €{marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh
            </span>
          </div>
        </div>

        {/* Right: Results Card (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-6 shadow-xs dark:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#1e2433]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                  Delivered Marine Quotation &amp; Arbitrage
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold">
                LIVE ARBITRAGE
              </span>
            </div>

            {/* 3 Metric Cards */}
            <div className="space-y-3.5">
              {/* Metric 1: Delivered Bio-LNG Quote */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433]">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                  DELIVERED BIO-LNG BUNKER QUOTE
                </div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span
                    className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    €{marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()}
                    <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400 ml-1">
                      / tonne
                    </span>
                  </span>
                  <span
                    className="text-lg font-bold text-slate-600 dark:text-zinc-400 font-mono"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    (${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  Equivalent to €{marineQuote.allInBioLngPriceEurMwh.toFixed(2)}/MWh · 13.9 MWh/t standard density
                </div>
              </div>

              {/* Metric 2: Net Client Savings vs Statutory Penalty */}
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center justify-between">
                  <span>NET CLIENT SAVINGS VS STATUTORY PARITY</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200/50 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                    +€{marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)}/t
                  </span>
                </div>
                <div
                  className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono"
                  style={{ fontFamily: MONO_FONT }}
                >
                  €{(clientSavingsEur / 1e6).toFixed(2)}M
                </div>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-1">
                  Guaranteed financial arbitrage compared against conventional VLSFO + FuelEU penalty + EU ETS
                </div>
              </div>

              {/* Metric 3: Trader Trading Margin */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Desk Structuring Margin
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Institutional trading spread (+€3.50/MWh)
                  </div>
                </div>
                <div
                  className="text-lg font-extrabold text-cyan-700 dark:text-cyan-300 font-mono text-right"
                  style={{ fontFamily: MONO_FONT }}
                >
                  €{tradingMarginEur.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1e2433] text-[11px] text-slate-500 dark:text-zinc-500 flex items-center justify-between">
            <span>
              {pathway === 'PHYSICAL'
                ? `Total Delivered Invoice: €${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}`
                : `Pool Transaction Volume: €${Math.round(Math.abs(counterparty.compliance_balance_2025_tco2e) * 435).toLocaleString()}`}
            </span>
            <span>FX Benchmark: 1.08 EUR/USD</span>
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
          <span>Back: Exposure &amp; CRM</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary flex items-center gap-2 text-xs font-bold px-6 py-2 shadow-xs"
        >
          <span>Next: Generate Term Sheet &amp; Trade</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
