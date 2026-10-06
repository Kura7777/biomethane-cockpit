import { FUELEU_ACTIVE_PERIOD } from '../../../domain/fueleu/calculator';
import React, { useMemo } from 'react';
import { ShippingCounterparty } from '../../../domain/fueleu/types';
import {
  calculateMarineBunkerQuotation,
  defaultLiquefactionFeeEurMwh,
  defaultGreenPremiumEurMwh,
  defaultVlsfoPriceUsdPerTonne,
} from '../../../domain/fueleu/calculator';
import { poolingEconomicsForBalance, type FuelEuMarketPrices, type FuelEuPoolPrices } from '../../../domain/fueleu/marketPrices';
import { SourceChip } from '../../../shared/ui/SourceChip';
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
import { Link } from 'react-router-dom';
import { showToast } from '../../../app/DeskToastContainer';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

interface ShippingBunkerPricingStepProps {
  counterparty: ShippingCounterparty;
  pathway: 'PHYSICAL' | 'POOLING';
  setPathway: (pathway: 'PHYSICAL' | 'POOLING') => void;
  ttfGasIndex: number;
  /** Sets a what-if TTF for this deal (null goes back to the Pricing desk mark). */
  setTtfGasIndex: (val: number | null) => void;
  liquefactionFee: number;
  setLiquefactionFee: (val: number) => void;
  greenPremium: number;
  setGreenPremium: (val: number) => void;
  euaPrice: number;
  /** Sets a what-if EUA price for this deal (null goes back to the Pricing desk mark). */
  setEuaPrice: (val: number | null) => void;
  vlsfoPrice: number;
  setVlsfoPrice: (val: number) => void;
  /** FUELEU mark prices (offer, bid, spread): the pool clearing price shown below. */
  pool: FuelEuPoolPrices;
  /** Where the TTF and EUA marks came from, for the source tags. */
  marketPrices: FuelEuMarketPrices;
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
  pool,
  marketPrices,
  onBack,
  onNext,
}: ShippingBunkerPricingStepProps) {
  const isDualFuel = counterparty.fleetCapability === 'DUAL_FUEL_LNG';
  const isSurplus = counterparty.compliance_balance_2026_tco2e > 0;
  const absDeficit = Math.abs(counterparty.compliance_balance_2026_tco2e);

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
      targetYear: FUELEU_ACTIVE_PERIOD,
      fuelEuSurplusPriceEurPerTco2e: pool.bidEurPerTco2e,
    });
  }, [ttfGasIndex, liquefactionFee, greenPremium, euaPrice, vlsfoPrice, counterparty.bio_lng_required_neg100_t, pool.bidEurPerTco2e]);

  const handleResetDefaults = () => {
    setTtfGasIndex(null);
    setLiquefactionFee(defaultLiquefactionFeeEurMwh());
    setGreenPremium(defaultGreenPremiumEurMwh());
    setEuaPrice(null);
    setVlsfoPrice(defaultVlsfoPriceUsdPerTonne());
    showToast('Pricing parameters reset: TTF and EUA back to the Pricing desk marks', 'INFO');
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

  const poolingEcon = useMemo(
    () => poolingEconomicsForBalance(counterparty.compliance_balance_2026_tco2e, counterparty.penalty_2026_y1_eur, pool),
    [counterparty.compliance_balance_2026_tco2e, counterparty.penalty_2026_y1_eur, pool]
  );

  const clientSavingsEur =
    pathway === 'PHYSICAL'
      ? marineQuote.totalClientSavingsEur || counterparty.client_savings_physical_eur
      : poolingEcon.savingsEur ?? 0;

  const tradingMarginEur =
    pathway === 'PHYSICAL'
      ? counterparty.desk_margin_physical_eur
      : poolingEcon.marginEur ?? 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-5 space-y-4">
      {/* Top Asset Headline Strip */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-accent)',
                padding: '1px 6px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-subtier)',
              }}
            >
              #{counterparty.rank}
            </span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
              {counterparty.parent_name}
            </h2>
            <span className="chip" style={{ fontSize: '10.5px' }}>
              {counterparty.segment}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            {isSurplus ? (
              <>
                Monetising <strong style={{ color: 'var(--color-status-pos-text)' }}>+{(counterparty.compliance_balance_2026_tco2e / 1000).toFixed(1)} kt FuelEU surplus</strong> via Article 21 pooling · FuelEU database (Art. 19) registry transfer across <strong style={{ color: 'var(--color-accent)' }}>{counterparty.primary_bunkering_hubs}</strong>
              </>
            ) : (
              <>
                Structuring compliance for <strong style={{ color: 'var(--color-text)' }}>{counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes Bio-LNG</strong> ({counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh) · Delivery at <strong style={{ color: 'var(--color-accent)' }}>{counterparty.primary_bunkering_hubs}</strong>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="btn btn-secondary"
          style={{ height: '28px', padding: '0 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          title="Reset parameters to benchmark defaults"
        >
          <RotateCcw size={12} />
          <span>Reset Benchmarks</span>
        </button>
      </div>

      {/* Pathway Selector */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '14px 18px',
        }}
      >
        <div className="flex items-center justify-between max-md:flex-wrap max-md:gap-2 max-md:mb-3">
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

        <div className="grid grid-cols-1 md:grid-cols-2 max-md:grid-cols-1! gap-4">
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
              <span className="absolute max-md:static max-md:inline-block max-md:mb-2 top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
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
                  Physical Bio-LNG Bunkering (Art. 4, Annex I-II)
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                  Direct Bunkering (DES / TTS)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-3">
              Delivered physical molecule with ISCC EU RED-certified proof of sustainability (Directive (EU) 2018/2001, as amended by (EU) 2023/2413; -100 CI manure substrate). Delivers 0.000 tCO₂/t EU ETS zero-rating (subject to RED certification) and eliminates the FuelEU penalty at this compliance balance.
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
              <span className="absolute max-md:static max-md:inline-block max-md:mb-2 top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
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
              Zero engine modifications or physical bunkering required. Reallocates compliance surplus from our desk pool directly into the client's compliance balance via the FuelEU database (Art. 19, Art. 21) at an indicative desk spread.
            </p>

            <div className="flex items-center gap-3 text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
              <span>✓ Zero Capex / Retrofit</span>
              <span>✓ Paper Transfer</span>
              <span>✓ Indicative Spread</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Engine & Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Pricing Parameters (6 cols) */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          className="lg:col-span-6 space-y-4"
        >
          <div>
            <div
              style={{
                paddingBottom: '10px',
                marginBottom: '12px',
                borderBottom: '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={13} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Commercial Pricing Parameters
                </span>
              </div>
              <span style={{ fontSize: '10.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                3-Component Formula Stack
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                data-testid="fueleu-market-sources"
                style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
              >
                <span>TTF</span>
                {marketPrices.ttfSource && <SourceChip badge={marketPrices.ttfSource.badge} suffix={marketPrices.ttfSource.asOf ? `mark ${marketPrices.ttfSource.asOf}` : null} />}
                <span>· EUA</span>
                {marketPrices.euaSource && <SourceChip badge={marketPrices.euaSource.badge} suffix={marketPrices.euaSource.asOf ? `mark ${marketPrices.euaSource.asOf}` : null} />}
                <span>· FuelEU pool</span>
                {marketPrices.poolSource && <SourceChip badge={marketPrices.poolSource.badge} suffix={marketPrices.poolSource.asOf ? `mark ${marketPrices.poolSource.asOf}` : null} />}
                <Link to="/pricing" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Change in Pricing desk →</Link>
                <span>The TTF slider is a what-if for this deal only; Reset returns it to the mark.</span>
              </div>

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
          </div>

          {/* Pricing Stack Formula Footer */}
          <div
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-panel-header)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
            }}
          >
            <span style={{ color: 'var(--color-muted)' }}>Delivered All-In Energy Price:</span>
            <span style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: '13px', color: 'var(--color-accent)' }}>
              €{marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh
            </span>
          </div>
        </div>

        {/* Right: Results Card (6 cols) */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          className="lg:col-span-6"
        >
          <div>
            <div
              style={{
                paddingBottom: '10px',
                marginBottom: '14px',
                borderBottom: '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={13} style={{ color: 'var(--color-status-pos-text)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Delivered Marine Quotation &amp; Arbitrage
                </span>
              </div>
              <span
                style={{
                  fontSize: '9.5px',
                  fontFamily: MONO_FONT,
                  fontWeight: 600,
                  padding: '1px 5px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-subtier)',
                  color: 'var(--color-status-pos-text)',
                }}
              >
                LIVE ARBITRAGE
              </span>
            </div>

            {/* 3 Metric Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Metric 1: Delivered Bio-LNG Quote */}
              <div
                style={{
                  padding: '12px 14px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-panel-header)',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '2px' }}>
                  DELIVERED BIO-LNG BUNKER QUOTE
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      fontFamily: MONO_FONT,
                      color: 'var(--color-text)',
                    }}
                  >
                    €{marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '4px' }}>
                      / tonne
                    </span>
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                    (${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne)
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Equivalent to €{marineQuote.allInBioLngPriceEurMwh.toFixed(2)}/MWh · {marineQuote.mwhPerTonneBioLng.toFixed(2)} MWh/t (49.1 GJ/t LHV)
                </div>
              </div>

              {/* Metric 2: Net Client Savings vs Statutory Penalty */}
              <div
                style={{
                  padding: '12px 14px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-panel-header)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-status-pos-text)', marginBottom: '2px' }}>
                  <span>NET CLIENT SAVINGS VS STATUTORY PARITY</span>
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: '10px',
                      padding: '1px 5px',
                      border: '1px solid var(--color-divider)',
                      backgroundColor: 'var(--color-subtier)',
                    }}
                  >
                    {marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '+' : ''}€{marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)}/t
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    fontFamily: MONO_FONT,
                    color: 'var(--color-status-pos-text)',
                  }}
                >
                  €{(clientSavingsEur / 1e6).toFixed(2)}M
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  {pathway === 'PHYSICAL'
                    ? `Saves client €${Math.round(clientSavingsEur).toLocaleString()} vs paying €2,400/t VLSFO-eq penalty`
                    : `Monetises paper compliance spread at the desk clearing price (indicative)`}
                </div>
              </div>

              {/* Metric 3: Desk Margin */}
              <div
                style={{
                  padding: '10px 14px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-panel-header)',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--color-accent)', marginBottom: '2px' }}>
                  TRADER DESK MARGIN
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    fontFamily: MONO_FONT,
                    color: 'var(--color-accent)',
                  }}
                >
                  €{tradingMarginEur.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-divider)',
              fontSize: '11px',
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {pathway === 'PHYSICAL'
                ? `Total Delivered Invoice: €${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}`
                : `Pool Transaction Volume: €${Math.round(Math.abs(counterparty.compliance_balance_2026_tco2e) * (counterparty.compliance_balance_2026_tco2e >= 0 ? pool.bidEurPerTco2e : pool.offerEurPerTco2e)).toLocaleString()}`}
            </span>
            <span>FX Benchmark: 1.08 EUR/USD</span>
          </div>
        </div>
      </div>

      {/* Bottom Dock Navigation Bar */}
      <div
        className="fe-dock m-sticky-actions"
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary"
          style={{ height: '32px', padding: '0 14px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
        >
          <ArrowLeft size={13} />
          <span>Back: Exposure &amp; CRM</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary"
          style={{ height: '32px', padding: '0 18px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <span>Next: Generate Term Sheet &amp; Trade</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
