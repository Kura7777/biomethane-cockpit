import { FUELEU_ACTIVE_PERIOD } from '../../domain/fueleu/calculator';
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShippingCounterparty,
  CALLING_REGIONS,
  TRADE_LANES,
  getStrategyTierBadgeClass,
} from '../../domain/fueleu/types';
import {
  calculateMarineBunkerQuotation,
  DEFAULT_TTF_GAS_INDEX_EUR_MWH,
  DEFAULT_LIQUEFACTION_FEE_EUR_MWH,
  DEFAULT_GREEN_PREMIUM_EUR_MWH,
  DEFAULT_VLSFO_PRICE_USD_PER_TONNE,
  EUA_BENCHMARK_EUR_PER_TONNE,
} from '../../domain/fueleu/calculator';
import { buildDealUrl } from '../../domain/trade/dealParams';
import {
  X,
  Zap,
  Anchor,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  Download,
  Phone,
  Mail,
  Globe,
  Building2,
  User,
  MapPin,
  Compass,
  Flame,
  Sliders,
  Ship,
  Scale,
  RotateCcw,
  ArrowUpRight,
  Columns,
  Plus,
  Minus,
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';
import { getAssumption, fuelEuPoolBidPriceEurPerTco2e } from '../../domain/assumptions/registry';
import { FuelEuProjectionChart } from './FuelEuProjectionChart';
import { PoolPriceMark } from './PoolPriceMark';

interface ShippingCounterpartyModalProps {
  counterparty: ShippingCounterparty;
  onClose: () => void;
}

type ModalView = 'COCKPIT' | 'LEDGER' | 'QUOTATION' | 'TERM_SHEET';
type SourcingPathway = 'PHYSICAL' | 'POOLING';

export function ShippingCounterpartyModal({ counterparty, onClose }: ShippingCounterpartyModalProps) {
  const navigate = useNavigate();

  // Navigation & View Mode State
  const [activeView, setActiveView] = useState<ModalView>('COCKPIT');
  const [activePathway, setActivePathway] = useState<SourcingPathway>(
    counterparty.fleetCapability === 'DUAL_FUEL_LNG' ? 'PHYSICAL' : 'POOLING'
  );

  // Clipboard & Interaction feedback
  const [copied, setCopied] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Live Interactive Bunker Quotation Parameters
  const [ttfGasIndex, setTtfGasIndex] = useState<number>(DEFAULT_TTF_GAS_INDEX_EUR_MWH);
  const [liquefactionFee, setLiquefactionFee] = useState<number>(DEFAULT_LIQUEFACTION_FEE_EUR_MWH);
  const [greenPremium, setGreenPremium] = useState<number>(DEFAULT_GREEN_PREMIUM_EUR_MWH);
  const [euaPrice, setEuaPrice] = useState<number>(EUA_BENCHMARK_EUR_PER_TONNE);
  const [vlsfoPrice, setVlsfoPrice] = useState<number>(DEFAULT_VLSFO_PRICE_USD_PER_TONNE);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isSurplus = counterparty.compliance_balance_2026_tco2e > 0;
  const absDeficit = Math.abs(counterparty.compliance_balance_2026_tco2e);
  const isDualFuel = counterparty.fleetCapability === 'DUAL_FUEL_LNG';

  // Compute live marine bunker quotation
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
    });
  }, [ttfGasIndex, liquefactionFee, greenPremium, euaPrice, vlsfoPrice, counterparty.bio_lng_required_neg100_t]);

  // Live recalculated EU ETS and Combined exposure based on active EUA slider.
  // ets_exposure_2026_tco2 is already the 2026 100%-phase-in figure (MRV ets_co2_t + an estimated
  // CH4 CO2e add-on; N2O omitted) -- no further phase-in grossing is applied here.
  const liveEtsExposure2026Eur = useMemo(() => {
    return Math.round(counterparty.ets_exposure_2026_tco2 * euaPrice);
  }, [counterparty.ets_exposure_2026_tco2, euaPrice]);

  const liveCombinedExposure2026Eur = useMemo(() => {
    return counterparty.penalty_2026_y1_eur + liveEtsExposure2026Eur;
  }, [counterparty.penalty_2026_y1_eur, liveEtsExposure2026Eur]);

  // Only a contact on file is rendered — never construct an email/phone/domain from other fields.
  const primaryContact = counterparty.contacts?.[0];
  const contactEmail = primaryContact?.email || 'No verified contact on file';

  // Structured Crisp Bulleted Pitch Points
  const pitchBulletPoints = useMemo(() => {
    if (isSurplus) {
      return [
        {
          title: 'Fleet Compliance Position',
          detail: `${counterparty.parent_name} operates an EU MRV fleet (Source: EU MRV 2024, THETIS-MRV public report; fuel split estimated) of ${counterparty.vessels_in_scope} vessels generating a premier +${(counterparty.compliance_balance_2026_tco2e / 1000).toFixed(1)} kt FuelEU surplus in 2025.`,
        },
        {
          title: 'Article 21 Surplus Monetisation',
          detail: `Our desk can broker your surplus into deficit carrier pools at the desk pool bid (€${fuelEuPoolBidPriceEurPerTco2e().toFixed(0)}/tCO2e, indicative — desk assumption, not a statutory rate), capturing €${(counterparty.client_savings_pooling_eur / 1e6).toFixed(1)}M in non-dilutive trading liquidity.`,
        },
        {
          title: 'Execution & Settlement',
          detail: `Zero operational disruption; bilateral registry transfer recorded via the FuelEU database (Art. 19, Art. 21) without modifying fleet schedules.`,
        },
      ];
    }
    if (isDualFuel) {
      return [
        {
          title: 'Dual-Fuel Propulsion Leverage',
          detail: `${counterparty.parent_name}'s fleet features ${counterparty.lng_vessels_in_scope} cryogenic Dual-Fuel LNG vessels calling European hubs (${counterparty.primary_bunkering_hubs || 'unspecified hubs'}), ready for immediate physical Bio-LNG bunkering.`,
        },
        {
          title: 'Statutory Exposure Neutralisation',
          detail: `Combined ${FUELEU_ACTIVE_PERIOD} exposure of €${(liveCombinedExposure2026Eur / 1e6).toFixed(1)}M (€${(counterparty.penalty_2026_y1_eur / 1e6).toFixed(1)}M FuelEU penalty + €${(liveEtsExposure2026Eur / 1e6).toFixed(1)}M EU ETS liability) is fully wiped out.`,
        },
        {
          title: 'Double Statutory Exemption (RED III + EU ETS)',
          detail: `Bunkering ${(counterparty.bio_lng_required_neg100_t).toLocaleString()} tonnes of -100 CI manure Bio-LNG delivers 0.000 tCO2/t EU ETS zero-rating and captures +€${marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)}/t in net client arbitrage.`,
        },
        {
          title: 'Estimated Financial Uplift',
          detail: `Delivers up to €${((marineQuote.totalClientSavingsEur || counterparty.client_savings_physical_eur) / 1e6).toFixed(1)}M in estimated net client compliance savings vs conventional VLSFO alternative compliance parity (indicative — desk assumptions).`,
        },
      ];
    }
    return [
      {
        title: 'Conventional Fleet Exposure',
        detail: `${counterparty.parent_name}'s fleet of ${counterparty.vessels_in_scope} conventional 2-stroke diesel vessels incurs €${(liveCombinedExposure2026Eur / 1e6).toFixed(1)}M in joint ${FUELEU_ACTIVE_PERIOD} regulatory exposure (€${(counterparty.penalty_2026_y1_eur / 1e6).toFixed(1)}M FuelEU + €${(liveEtsExposure2026Eur / 1e6).toFixed(1)}M EU ETS).`,
      },
      {
        title: 'Article 21 Compliance Pooling Solution',
        detail: `No engine modifications or dry-docking required. Our desk structures paper Article 21 compliance pooling backed by RED-certified drop-in biofuels to neutralise your ${(absDeficit / 1000).toFixed(1)} kt deficit.`,
      },
      {
        title: 'Indicative Client Savings',
        detail: `Transfers statutory liability into our desk compliance pool at the desk pool offer (€${getAssumption('fueleu.poolBuyPriceEurPerTco2e').toFixed(0)}/tCO2e, indicative), generating an estimated €${(counterparty.client_savings_pooling_eur / 1e6).toFixed(1)}M in net savings vs statutory penalties.`,
      },
    ];
  }, [counterparty, isSurplus, isDualFuel, liveCombinedExposure2026Eur, liveEtsExposure2026Eur, marineQuote, absDeficit]);

  // Full Tailored Sales Pitch (for 1-click clipboard copy)
  const fullPitchText = useMemo(() => {
    return pitchBulletPoints.map((bp, i) => `${i + 1}. ${bp.title}: ${bp.detail}`).join('\n');
  }, [pitchBulletPoints]);

  const handleResetPresets = () => {
    setTtfGasIndex(DEFAULT_TTF_GAS_INDEX_EUR_MWH);
    setLiquefactionFee(DEFAULT_LIQUEFACTION_FEE_EUR_MWH);
    setGreenPremium(DEFAULT_GREEN_PREMIUM_EUR_MWH);
    setEuaPrice(EUA_BENCHMARK_EUR_PER_TONNE);
    setVlsfoPrice(DEFAULT_VLSFO_PRICE_USD_PER_TONNE);
    showToast('Pricing engine parameters reset to statutory benchmark defaults', 'INFO');
  };

  const handleLoadDeal = () => {
    onClose();
    const volumeMwh = Math.max(1000, Math.round(counterparty.bio_lng_required_neg100_mwh || 10000));
    const url = buildDealUrl({
      marketId: 'FUELEU',
      originCountry: 'NL',
      feedstock: 'manure',
      ci: -100,
      volume: volumeMwh,
      counterparty: counterparty.parent_name,
      legalEntityName: counterparty.parent_name,
      complianceYear: FUELEU_ACTIVE_PERIOD,
    });
    navigate(url);
  };

  const handleCopyField = (text: string, label: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {
      // safe fallback
    }
    setCopiedField(label);
    showToast(`Copied ${label} to clipboard!`, 'SUCCESS');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyPitch = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(fullPitchText).catch(() => {});
      }
    } catch {
      // safe fallback
    }
    setPitchCopied(true);
    showToast('Commercial Outreach Pitch copied to clipboard!', 'SUCCESS');
    setTimeout(() => setPitchCopied(false), 2500);
  };

  const generateTermSheetText = () => {
    return `================================================================================
OTC MARINE BIO-LNG TERM SHEET & DEAL NOTE (INDICATIVE — SUBJECT TO CONTRACT)
REGULATION (EU) 2023/1805 (FUELEU) & DIRECTIVE (EU) 2023/959 (EU ETS)
================================================================================
DATE: ${new Date().toISOString().split('T')[0]}
PORTFOLIO COMPLIANCE RANK: #${counterparty.rank}
STRATEGIC TIER: ${counterparty.strategy_tier}
COUNTERPARTY: ${counterparty.parent_name}
HEADQUARTERS: ${counterparty.headquarters || '—'}
COMMERCIAL HQ ADDRESS: ${counterparty.hqAddress || '—'}
KEY EXECUTIVE: ${primaryContact?.name || counterparty.key_executive || 'No verified contact on file'}
TARGET DEPARTMENT: ${counterparty.targetDepartment || '—'}
CONTACT ROLE: ${primaryContact?.role || counterparty.keyContactRole || '—'}
SWITCHBOARD PHONE: ${primaryContact?.phone || counterparty.switchboardPhone || 'No verified contact on file'}
COMMERCIAL EMAIL: ${contactEmail}
CORPORATE DOMAIN: ${counterparty.contactDomain || '—'}
FLEET SEGMENT: ${counterparty.segment} (${counterparty.vessels_in_scope} vessels in EU MRV scope)
PROPULSION CAPABILITY: ${isDualFuel ? `DUAL-FUEL CRYOGENIC LNG READY (${counterparty.lng_vessels_in_scope} LNG vessels / ${counterparty.conventional_vessels_in_scope} conventional)` : `CONVENTIONAL PROPULSION ONLY (${counterparty.conventional_vessels_in_scope} 2-stroke diesel vessels)`}
PRIMARY BUNKERING PORTS: ${counterparty.primary_bunkering_hubs || '—'}
CALLING CORRIDOR: ${(counterparty.callingRegion && CALLING_REGIONS[counterparty.callingRegion]?.label) || counterparty.callingRegion || 'EUR'}
TRADE LANE: ${(counterparty.tradeLane && TRADE_LANES[counterparty.tradeLane]?.label) || counterparty.tradeLane || 'GLOBAL_CONTAINER'}

1. BASELINE FLEET EXPOSURE (SOURCE: EU MRV 2024, THETIS-MRV PUBLIC REPORT; FUEL SPLIT ESTIMATED)
--------------------------------------------------------------------------------
- Annual Fuel Burn in EU Scope:
    * VLSFO: ${counterparty.vlsfo_tonnes.toLocaleString()} tonnes
    * MGO / MDO: ${counterparty.mgo_tonnes.toLocaleString()} tonnes
    * Fossil LNG: ${counterparty.lng_tonnes.toLocaleString()} tonnes
- Fleet Energy Consumption: ${(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh
- Actual Achieved GHG Intensity: ${counterparty.actual_ghgie.toFixed(2)} gCO2e/MJ
- 2026 FuelEU Target (2% reduction): 89.34 gCO2e/MJ
- Estimated Compliance Balance 2026: ${counterparty.compliance_balance_2026_tco2e > 0 ? '+' : ''}${counterparty.compliance_balance_2026_tco2e.toLocaleString()} tCO2e
- Indicative FuelEU Penalty Exposure (Art. 23(2)): €${counterparty.penalty_2026_y1_eur.toLocaleString()} (if repeated next year, ×1.1 per Art. 23(2): €${counterparty.penalty_2026_y2_eur.toLocaleString()})
- EU ETS 2026 Carbon Liability (100% Phase-In + estimated CH4 CO2e @ €${euaPrice.toFixed(2)}/t EUA): €${liveEtsExposure2026Eur.toLocaleString()} (${counterparty.ets_exposure_2026_tco2.toLocaleString()} tCO2e)
- COMBINED 2026 ESTIMATED EXPOSURE: €${liveCombinedExposure2026Eur.toLocaleString()}

2. MARINE BUNKER PRICING ENGINE (€/t & $/t) — Indicative estimate, desk assumptions
--------------------------------------------------------------------------------
- TTF Natural Gas Front-Month Index: €${ttfGasIndex.toFixed(2)} / MWh
- Liquefaction & Terminalization Fee: €${liquefactionFee.toFixed(2)} / MWh
- Green Bio-LNG Premium (RED Certified — Directive (EU) 2018/2001, as amended by (EU) 2023/2413): €${greenPremium.toFixed(2)} / MWh
- All-In Delivered Bio-LNG Price: €${marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh
    * Equivalent Metric Tonne Price (EUR): €${marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne Bio-LNG
    * Equivalent Metric Tonne Price (USD): $${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne Bio-LNG
- Benchmark Conventional Alternative (${marineQuote.equivalentFossilLngTonnes.toFixed(4)}t fossil LNG @ €${(ttfGasIndex + liquefactionFee).toFixed(2)}/MWh + FuelEU Deficit + EU ETS):
    * Alternative Compliance Cost (EUR): €${marineQuote.totalConventionalAlternativeCostEur.toFixed(2)} / t Bio-LNG eq
    * Alternative Compliance Cost (USD): $${marineQuote.totalConventionalAlternativeCostUsd.toFixed(2)} / t Bio-LNG eq
- FuelEU Compliance Surplus (Pooling, Art. 21): ${marineQuote.fuelEuSurplusTco2ePerTonne.toFixed(4)} tCO2e/t x €${marineQuote.fuelEuSurplusPriceEurPerTco2e.toFixed(2)}/tCO2e = €${marineQuote.fuelEuSurplusValueEurPerTonne.toFixed(2)} / tonne Bio-LNG
- Net Client Arbitrage Advantage: ${marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '+' : ''}€${marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)} / tonne (${marineQuote.netSavingsPerTonneBioLngUsd >= 0 ? '+' : ''}$${marineQuote.netSavingsPerTonneBioLngUsd.toFixed(2)} / tonne)

3. STRUCTURED TRANSACTION SCHEDULE (DEFICIT NEUTRALISATION)
--------------------------------------------------------------------------------
- Manure Bio-LNG Volume (-100 CI): ${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (${counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)
- Delivery Terms: DES (Delivered Ex-Ship) / TTS (Truck-to-Ship) at ${counterparty.primary_bunkering_hubs || '—'}
- Total Delivered Invoice (EUR): €${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}
- Total Delivered Invoice (USD): $${(marineQuote.totalBioLngInvoiceUsd || 0).toLocaleString()}
- Net Client Statutory Savings: €${(marineQuote.totalClientSavingsEur || counterparty.client_savings_physical_eur).toLocaleString()}

4. COMMERCIAL STRATEGY & TAILORED OUTREACH TALKING POINTS
--------------------------------------------------------------------------------
${fullPitchText}

5. STATUTORY VERIFICATION & GOVERNING LAW
--------------------------------------------------------------------------------
- Certification: ISCC EU / REDcert-EU Mass Balance under RED (Directive (EU) 2018/2001, as amended by (EU) 2023/2413)
- EU ETS: sustainable biomass CO2 zero-rated under Directive 2003/87/EC (MRR (EU) 2018/2066) — subject to RED sustainability certification of the supplied fuel
- FuelEU Maritime Compliance: Bio-LNG bunkering (Art. 4, Annex I-II) / Article 21 Pooling
- Governing Contract: BIMCO Bunker Terms 2018 or supplier standard terms (to be agreed)
- Jurisdiction: Rotterdam, The Netherlands (POB / Rotterdam District Court Arbitration)
================================================================================`;
  };

  const handleCopyTermSheet = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(generateTermSheetText()).catch(() => {});
      }
    } catch {
      // safe fallback
    }
    setCopied(true);
    showToast('Commercial Marine Term Sheet copied to clipboard!', 'SUCCESS');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportTermSheetFile = () => {
    const text = generateTermSheetText();
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
      // safe fallback
    }
    setCopied(true);
    showToast(`Downloaded Term Sheet for ${counterparty.parent_name} and copied to clipboard!`, 'SUCCESS');
    setTimeout(() => setCopied(false), 2500);
  };

  // Helper component for parameter steppers & precision input
  const renderPrecisionInput = (
    label: string,
    value: number,
    setter: (val: number) => void,
    unit: string,
    min: number,
    max: number,
    step: number,
    benchmarkNote: string,
    accentColor: string = 'var(--color-accent)'
  ) => {
    const handleStep = (direction: 'up' | 'down') => {
      const delta = direction === 'up' ? step : -step;
      const nextVal = Math.min(max, Math.max(min, Number((value + delta).toFixed(2))));
      setter(nextVal);
    };

    return (
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: 'var(--color-panel-header)',
          border: '1px solid var(--color-divider)',
          borderRadius: '3px',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>{label}</span>
          <span
            className="num"
            style={{
              fontSize: '12.5px',
              fontWeight: 800,
              color: accentColor,
              backgroundColor: 'var(--color-surface)',
              padding: '1px 6px',
              border: '1px solid var(--color-divider)',
              borderRadius: '2px',
            }}
          >
            {unit.includes('$') ? `$${value.toFixed(0)}` : unit.includes('€') && step < 1 ? `€${value.toFixed(2)}` : `€${value.toFixed(0)}`}{' '}
            <span style={{ fontSize: '9.5px', fontWeight: 500, color: 'var(--color-muted)' }}>{unit.replace(/[$€]/g, '')}</span>
          </span>
        </div>

        {/* Precision Steppers & Number Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '24px', height: '24px', padding: 0, borderRadius: '2px' }}
            onClick={() => handleStep('down')}
            title={`Decrease by ${step}`}
          >
            <Minus size={11} />
          </button>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value) || min)}
            style={{
              flex: 1,
              height: '4px',
              cursor: 'pointer',
              accentColor: accentColor,
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '24px', height: '24px', padding: 0, borderRadius: '2px' }}
            onClick={() => handleStep('up')}
            title={`Increase by ${step}`}
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Bound labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--color-muted)' }}>
          <span>{unit.includes('$') ? `$${min}` : `€${min}`}</span>
          <span style={{ fontWeight: 500 }}>{benchmarkNote}</span>
          <span>{unit.includes('$') ? `$${max}` : `€${max}`}</span>
        </div>
      </div>
    );
  };

  // Render Module 1: Statutory Compliance Ledger & CRM Executive Dossier
  const renderModule1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Tailored Trader Outreach Pitch (Bulleted & Metric-Highlighted) */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '4px',
          border: `1px solid ${isDualFuel ? 'var(--color-status-pos-border, #059669)' : 'var(--color-accent)'}`,
          backgroundColor: 'var(--color-panel-header)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isDualFuel ? (
              <Flame size={15} style={{ color: '#059669' }} />
            ) : (
              <ShieldCheck size={15} style={{ color: 'var(--color-accent)' }} />
            )}
            <span style={{ fontWeight: 800, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isSurplus
                ? 'Strategic Opportunity: Article 21 Surplus Pool Monetisation'
                : isDualFuel
                ? 'Strategic Opportunity: Physical Cryogenic Bio-LNG Bunkering (STS/TTS)'
                : 'Strategic Opportunity: Article 21 Compliance Pooling & Drop-in Biofuel'}
            </span>
            <span className="chip" style={{ fontSize: '9px', padding: '1px 5px' }}>
              RED III &amp; FuelEU Art 20/21
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyPitch}
            className="btn btn-secondary"
            style={{ fontSize: '11px', height: '26px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Copy structured talking points to clipboard"
          >
            {pitchCopied ? <Check size={12} style={{ color: '#059669' }} /> : <Copy size={12} />}
            {pitchCopied ? 'Pitch Copied!' : 'Copy Trader Pitch'}
          </button>
        </div>

        {/* Crisp Bulleted Dossier */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderRadius: '3px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {pitchBulletPoints.map((bp, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11.5px', lineHeight: 1.45 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  color: 'var(--color-accent)',
                  fontWeight: 800,
                  fontSize: '10px',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {idx + 1}
              </span>
              <div>
                <strong style={{ color: 'var(--color-text)' }}>{bp.title}:</strong>{' '}
                <span style={{ color: 'var(--color-muted)' }}>{bp.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Joint Statutory Compliance Ledger */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '4px',
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scale size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="eyebrow" style={{ fontWeight: 800, fontSize: '11px', color: 'var(--color-text)' }}>
              Joint Statutory Compliance Ledger: FuelEU Maritime + EU ETS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="chip chip-info" style={{ fontSize: '9px', padding: '1px 5px' }}>
              Directive (EU) 2023/959
            </span>
            <span className="chip chip-info" style={{ fontSize: '9px', padding: '1px 5px' }}>
              Regulation (EU) 2023/1805
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          <div style={{ padding: '8px 10px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '9.5px' }}>FuelEU '25 Balance</span>
              <span className={`chip ${isSurplus ? 'chip-pos' : 'chip-neg'}`} style={{ fontSize: '8.5px', padding: '0 3px' }}>
                {isSurplus ? 'Surplus' : 'Deficit'}
              </span>
            </div>
            <div className="num" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px', color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
              {isSurplus ? `+${(counterparty.compliance_balance_2026_tco2e / 1000).toFixed(1)} kt` : `${(counterparty.compliance_balance_2026_tco2e / 1000).toFixed(1)} kt`}
            </div>
            <div className="subttl num" style={{ fontSize: '10px', marginTop: '1px' }}>
              Penalty: {isSurplus ? '€0' : `€${(counterparty.penalty_2026_y1_eur / 1e6).toFixed(2)}M`}
            </div>
          </div>

          <div style={{ padding: '8px 10px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '9.5px' }}>'26 EU ETS (100% + CH4 est.)</span>
              <span className="chip" style={{ fontSize: '8.5px', padding: '0 3px' }}>€{euaPrice.toFixed(0)}/t</span>
            </div>
            <div className="num" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px', color: 'var(--color-status-warn-text, #d97706)' }}>
              €{(liveEtsExposure2026Eur / 1e6).toFixed(2)}M
            </div>
            <div className="subttl num" style={{ fontSize: '10px', marginTop: '1px' }}>
              {(counterparty.ets_exposure_2026_tco2 / 1000).toFixed(1)} kt CO₂e liability
            </div>
          </div>

          <div style={{ padding: '8px 10px', border: '1px solid var(--color-accent)', backgroundColor: 'var(--color-panel-header)', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '9.5px', color: 'var(--color-accent)' }}>Combined '26 Liability</span>
              <span className="chip chip-info" style={{ fontSize: '8.5px', padding: '0 3px' }}>Total Exposure</span>
            </div>
            <div className="num" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px', color: 'var(--color-accent)' }}>
              €{(liveCombinedExposure2026Eur / 1e6).toFixed(2)}M
            </div>
            <div className="subttl num" style={{ fontSize: '10px', marginTop: '1px' }}>
              FuelEU Deficit + EU ETS
            </div>
          </div>
        </div>

        {/* Double Statutory Exemption Banner */}
        <div
          style={{
            padding: '7px 10px',
            borderRadius: '3px',
            backgroundColor: 'rgba(56, 189, 248, 0.05)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            fontSize: '10.5px',
            color: 'var(--color-text)',
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: 'var(--color-accent)' }}>Double Zero-Rating (subject to RED certification):</strong> RED-certified Bio-LNG (Directive (EU) 2018/2001, as amended by (EU) 2023/2413) carries an emissions factor of <strong>0.000 tCO2/t</strong> under EU ETS (Directive 2003/87/EC, MRR (EU) 2018/2066) and <strong>-100 gCO2e/MJ</strong> under FuelEU Maritime (Regulation 2023/1805). Bunkering RED-certified Bio-LNG simultaneously eliminates both compliance liabilities.
        </div>
      </div>

      {/* 2b. Static-Fleet Compliance Projection Chart (do-nothing scenario) */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '4px',
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <span className="eyebrow" style={{ fontWeight: 800, fontSize: '11px', color: 'var(--color-text)' }}>
            Statutory Do-Nothing Projection
          </span>
          <PoolPriceMark variant="inline" />
        </div>
        <FuelEuProjectionChart
          fleetInput={{ vlsfoTonnes: counterparty.vlsfo_tonnes, mgoTonnes: counterparty.mgo_tonnes, lngTonnes: counterparty.lng_tonnes }}
          title={`${counterparty.parent_name} — Static-Fleet Projection`}
        />
      </div>

      {/* 3. MRV Fleet Energy Breakdown & CRM Dossier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
        {/* Panel A: MRV Fleet Profile */}
        <div
          style={{
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="eyebrow" style={{ fontWeight: 700, fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Ship size={12} style={{ color: 'var(--color-accent)' }} /> MRV Fleet Profile
            </span>
            <span className="chip" style={{ fontSize: '9px' }}>Reg 2015/757</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <span className="mut">Total Fleet in EU Scope:</span>
              <strong>{counterparty.vessels_in_scope} vessels</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <span className="mut">Cryogenic Dual-Fuel LNG:</span>
              <span className="num" style={{ fontWeight: 700, color: isDualFuel ? '#059669' : 'var(--color-muted)' }}>
                {counterparty.lng_vessels_in_scope} vessels ({isDualFuel ? 'Bunkering Ready' : 'None'})
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <span className="mut">Conventional 2-Stroke:</span>
              <span className="num" style={{ fontWeight: 600 }}>{counterparty.conventional_vessels_in_scope} vessels (Pooling)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <span className="mut">Annual VLSFO Fuel Burn:</span>
              <span className="num">{counterparty.vlsfo_tonnes.toLocaleString()} tonnes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <span className="mut">Total Fleet Energy:</span>
              <span className="num">{(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span className="mut">Achieved vs Target GHGIE:</span>
              <span className="num" style={{ fontWeight: 700, color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                {counterparty.actual_ghgie.toFixed(2)} vs 89.34 gCO2e/MJ
              </span>
            </div>
          </div>
        </div>

        {/* Panel B: Institutional High-Density CRM Contact Card */}
        <div
          style={{
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="eyebrow" style={{ fontWeight: 700, fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building2 size={12} style={{ color: 'var(--color-accent)' }} /> Contact Dossier
            </span>
            <span className="chip chip-info" style={{ fontSize: '9px' }}>{counterparty.contacts?.length ? 'Sourced contact' : 'No contact on file'}</span>
          </div>

          {/* Executive & Department */}
          <div
            style={{
              padding: '6px 8px',
              backgroundColor: 'var(--color-panel-header)',
              border: '1px solid var(--color-divider)',
              borderRadius: '3px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700 }}>
                <User size={12} style={{ color: 'var(--color-accent)' }} /> {primaryContact?.name || counterparty.key_executive || 'No verified contact on file'}
              </div>
              <span className="chip" style={{ fontSize: '9px', padding: '1px 4px' }}>
                {primaryContact?.role || counterparty.keyContactRole || '—'}
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--color-muted)', paddingLeft: '17px' }}>
              Target Unit: <strong style={{ color: 'var(--color-text)' }}>{counterparty.targetDepartment || '—'}</strong>
            </div>
          </div>

          {/* Contact Communication Matrix (Phone, Mail, Domain, HQ) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {/* Phone */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 7px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: '3px',
                fontSize: '10.5px',
              }}
            >
              {(primaryContact?.phone || counterparty.switchboardPhone) ? (
              <a
                href={`tel:${primaryContact?.phone || counterparty.switchboardPhone}`}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text)', textDecoration: 'none', overflow: 'hidden' }}
                title="Click to call switchboard"
              >
                <Phone size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {primaryContact?.phone || counterparty.switchboardPhone}
                </span>
              </a>
              ) : (
                <span style={{ color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={11} style={{ flexShrink: 0 }} /> No verified contact on file
                </span>
              )}
              <button
                type="button"
                onClick={() => handleCopyField(primaryContact?.phone || counterparty.switchboardPhone || '', 'Phone')}
                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--color-muted)' }}
                title="Copy phone"
              >
                {copiedField === 'Phone' ? <Check size={10} style={{ color: '#059669' }} /> : <Copy size={10} />}
              </button>
            </div>

            {/* Email */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 7px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: '3px',
                fontSize: '10.5px',
              }}
            >
              {primaryContact?.email ? (
              <a
                href={`mailto:${primaryContact.email}`}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text)', textDecoration: 'none', overflow: 'hidden' }}
                title={`Send email to ${primaryContact.email}`}
              >
                <Mail size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {primaryContact.email}
                </span>
              </a>
              ) : (
                <span style={{ color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={11} style={{ flexShrink: 0 }} /> No verified contact on file
                </span>
              )}
              <button
                type="button"
                onClick={() => handleCopyField(primaryContact?.email || '', 'Email')}
                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--color-muted)' }}
                title="Copy email"
              >
                {copiedField === 'Email' ? <Check size={10} style={{ color: '#059669' }} /> : <Copy size={10} />}
              </button>
            </div>

            {/* Domain */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 7px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: '3px',
                fontSize: '10.5px',
              }}
            >
              {counterparty.contactDomain ? (
              <a
                href={`https://${counterparty.contactDomain}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text)', textDecoration: 'none', overflow: 'hidden' }}
                title="Visit website"
              >
                <Globe size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {counterparty.contactDomain}
                </span>
              </a>
              ) : (
                <span style={{ color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Globe size={11} style={{ flexShrink: 0 }} /> No verified domain on file
                </span>
              )}
              <button
                type="button"
                onClick={() => handleCopyField(counterparty.contactDomain || '', 'Domain')}
                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--color-muted)' }}
                title="Copy domain"
              >
                {copiedField === 'Domain' ? <Check size={10} style={{ color: '#059669' }} /> : <Copy size={10} />}
              </button>
            </div>

            {/* HQ City & Street */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 7px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: '3px',
                fontSize: '10.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                <MapPin size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={counterparty.hqAddress || '—'}>
                  {counterparty.headquarters || '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyField(`${counterparty.headquarters || ''}, ${counterparty.hqAddress || ''}`, 'Address')}
                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--color-muted)' }}
                title="Copy HQ address"
              >
                {copiedField === 'Address' ? <Check size={10} style={{ color: '#059669' }} /> : <Copy size={10} />}
              </button>
            </div>
          </div>

          {/* Trade Lane Corridor Tag */}
          <div
            style={{
              padding: '6px 8px',
              backgroundColor: 'var(--color-panel-header)',
              border: '1px solid var(--color-divider)',
              borderRadius: '3px',
              fontSize: '10.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Compass size={11} style={{ color: 'var(--color-accent)' }} />
              <span><strong>Trade Lane:</strong> {(counterparty.tradeLane && TRADE_LANES[counterparty.tradeLane]?.label) || counterparty.tradeLane || 'GLOBAL_CONTAINER'}</span>
            </div>
            <span className="chip" style={{ fontSize: '9px', padding: '1px 5px' }}>
              {(counterparty.callingRegion && CALLING_REGIONS[counterparty.callingRegion]?.label) || counterparty.callingRegion || 'EUR'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Module 2: Live Commercial Bunker Quotation & Deal Structuring
  const renderModule2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Precision Financial Quotation Engine Inputs */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '4px',
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={15} style={{ color: 'var(--color-accent)' }} />
            <span className="eyebrow" style={{ fontWeight: 800, fontSize: '11.5px', color: 'var(--color-text)' }}>
              Marine Bunker Pricing Engine (€/t &amp; $/t) — Indicative
            </span>
            <span className="chip" style={{ fontSize: '9px' }}>
              1 t Bio-LNG = {marineQuote.mwhPerTonneBioLng.toFixed(2)} MWh · FX €/$: 1.08
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetPresets}
            className="btn btn-secondary"
            style={{ fontSize: '10.5px', height: '24px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Reset parameters to statutory defaults"
          >
            <RotateCcw size={10} /> Reset Defaults
          </button>
        </div>

        {/* 5 Financial Parameter Precision Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {renderPrecisionInput('TTF Gas Index', ttfGasIndex, setTtfGasIndex, '€/MWh', 20, 70, 0.5, 'ICE Front-Month', 'var(--color-accent)')}
          {renderPrecisionInput('Liquefaction Fee', liquefactionFee, setLiquefactionFee, '€/MWh', 5, 30, 0.5, 'Cryogenic Terminals', 'var(--color-accent)')}
          {renderPrecisionInput('Green Bio-LNG Premium', greenPremium, setGreenPremium, '€/MWh', 5, 50, 0.5, 'RED III Manure Substrate', '#059669')}
          {renderPrecisionInput('EU ETS EUA Price', euaPrice, setEuaPrice, '€/tCO2', 40, 150, 1, 'Directive 2023/959', '#d97706')}
          {renderPrecisionInput('VLSFO Baseline Parity', vlsfoPrice, setVlsfoPrice, '$/tonne', 400, 900, 10, 'Rotterdam Bunkers', 'var(--color-accent)')}
        </div>

        {/* Quotation & Arbitrage Matrix Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '2px' }}>
          {/* Card 1: All-In Bio-LNG Quote */}
          <div style={{ padding: '10px 12px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '9.5px' }}>All-In Bio-LNG Quote</span>
              <span className="chip" style={{ fontSize: '8.5px', padding: '1px 4px' }}>Delivered DES</span>
            </div>
            <div className="num" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-accent)', marginTop: '2px' }}>
              €{marineQuote.allInBioLngPriceEurMwh.toFixed(2)}/MWh
            </div>
            <div className="subttl num" style={{ fontSize: '10.5px', marginTop: '1px', fontWeight: 600 }}>
              €{marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()}/t · ${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()}/t
            </div>
          </div>

          {/* Card 2: Conventional Alternative Compliance Parity */}
          <div style={{ padding: '10px 12px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '9.5px' }}>Conventional Parity</span>
              <span className="chip" style={{ fontSize: '8.5px', padding: '1px 4px' }}>VLSFO+ETS+FuelEU</span>
            </div>
            <div className="num" style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
              €{marineQuote.totalConventionalAlternativeCostEur.toFixed(2)}/t
            </div>
            <div className="subttl num" style={{ fontSize: '10.5px', marginTop: '1px', fontWeight: 600 }}>
              ${marineQuote.totalConventionalAlternativeCostUsd.toFixed(2)}/t Bio-LNG eq
            </div>
          </div>

          {/* Card 3: Net Arbitrage Advantage */}
          <div
            style={{
              padding: '10px 12px',
              border: `1px solid ${marineQuote.netSavingsPerTonneBioLngEur >= 0 ? 'var(--color-status-pos-border, #059669)' : 'var(--color-status-neg-border, #dc2626)'}`,
              backgroundColor: marineQuote.netSavingsPerTonneBioLngEur >= 0 ? 'rgba(5, 150, 105, 0.05)' : 'rgba(220, 38, 38, 0.05)',
              borderRadius: '3px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '9.5px', color: marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '#059669' : '#dc2626' }}>
                Net Arbitrage Advantage
              </span>
              <span
                className={`chip ${marineQuote.netSavingsPerTonneBioLngEur >= 0 ? 'chip-pos' : 'chip-neg'}`}
                style={{ fontSize: '8.5px', padding: '1px 4px' }}
              >
                Client Spread
              </span>
            </div>
            <div
              className="num"
              style={{
                fontSize: '16px',
                fontWeight: 800,
                marginTop: '2px',
                color: marineQuote.netSavingsPerTonneBioLngEur >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)',
              }}
            >
              {marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '+' : ''}€{marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)}/t
            </div>
            <div className="subttl num" style={{ fontSize: '10.5px', marginTop: '1px', fontWeight: 600 }}>
              {marineQuote.netSavingsPerTonneBioLngUsd >= 0 ? '+' : ''}${marineQuote.netSavingsPerTonneBioLngUsd.toFixed(2)}/t Bio-LNG bunkered
            </div>
          </div>

          {/* Card 4: Required Volume & Total Contract Impact */}
          <div style={{ padding: '10px 12px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '9.5px' }}>Deal Volume (Hedge)</span>
              <span className="chip chip-info" style={{ fontSize: '8.5px', padding: '1px 4px' }}>Full Offset</span>
            </div>
            <div className="num" style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
              {counterparty.bio_lng_required_neg100_t.toLocaleString()} t
            </div>
            <div className="subttl num" style={{ fontSize: '10.5px', marginTop: '1px' }}>
              Invoice: €{((marineQuote.totalBioLngInvoiceEur || 0) / 1e6).toFixed(2)}M · Savings: €{((marineQuote.totalClientSavingsEur || 0) / 1e6).toFixed(2)}M
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sourcing Pathway Segmented Toggle & Structuring Panel */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Pathway Segmented Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-panel-header)',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '9px 14px',
              fontSize: '11.5px',
              fontWeight: activePathway === 'PHYSICAL' ? 800 : 600,
              backgroundColor: activePathway === 'PHYSICAL' ? 'var(--color-surface)' : 'transparent',
              color: activePathway === 'PHYSICAL' ? 'var(--color-accent)' : 'var(--color-muted)',
              border: 'none',
              borderBottom: activePathway === 'PHYSICAL' ? '2px solid var(--color-accent)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => setActivePathway('PHYSICAL')}
          >
            <Zap size={13} /> Pathway 1: Physical Cryogenic Bio-LNG (STS/TTS)
            {isDualFuel && (
              <span className="chip chip-pos" style={{ fontSize: '8.5px', padding: '1px 5px' }}>
                ★ Recommended
              </span>
            )}
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '9px 14px',
              fontSize: '11.5px',
              fontWeight: activePathway === 'POOLING' ? 800 : 600,
              backgroundColor: activePathway === 'POOLING' ? 'var(--color-surface)' : 'transparent',
              color: activePathway === 'POOLING' ? 'var(--color-accent)' : 'var(--color-muted)',
              border: 'none',
              borderBottom: activePathway === 'POOLING' ? '2px solid var(--color-accent)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => setActivePathway('POOLING')}
          >
            <ShieldCheck size={13} /> Pathway 2: Article 21 Compliance Pooling
            {!isDualFuel && !isSurplus && (
              <span className="chip chip-info" style={{ fontSize: '8.5px', padding: '1px 5px' }}>
                ★ Recommended
              </span>
            )}
          </button>
        </div>

        {/* Selected Pathway Structuring Card */}
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activePathway === 'PHYSICAL' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
                  Direct physical cryogenic bunkering into {counterparty.lng_vessels_in_scope} dual-fuel vessels via STS bunker barge or TTS truck in {counterparty.primary_bunkering_hubs || '—'}.
                </div>
                <span className="chip chip-info" style={{ fontSize: '9.5px' }}>Art. 4, Annex I-II</span>
              </div>

              <div
                style={{
                  border: '1px solid var(--color-divider)',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-panel-header)',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '11.5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mut">Bio-LNG Required:</span>
                  <span className="num" style={{ fontWeight: 700 }}>
                    {counterparty.bio_lng_required_neg100_t.toLocaleString()} t ({counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mut">Substrate &amp; CI:</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>Agricultural Manure Substrate (-100 CI Benchmark)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mut">Statutory Exemption:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-status-pos-text)' }}>Zero FuelEU Penalty + 0.000 tCO2/t EU ETS Zero-Rating</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-divider)' }}>
                  <span style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>Client Net Statutory Savings:</span>
                  <span className="num" style={{ color: 'var(--color-status-pos-text)', fontWeight: 800 }}>
                    €{((marineQuote.totalClientSavingsEur || counterparty.client_savings_physical_eur) / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>Desk Trading Margin (internal):</span>
                  <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>€{(counterparty.desk_margin_physical_eur / 1e6).toFixed(2)}M</span>
                </div>
              </div>

              {!isSurplus && (
                <button
                  type="button"
                  onClick={handleLoadDeal}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '12px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Zap size={14} /> Structure Bio-LNG in Trade Builder <ArrowUpRight size={14} />
                </button>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
                  {isSurplus
                    ? 'Monetise compliance surplus by transferring positive balances into the Desk compliance pool at premium market spreads.'
                    : 'Frictionless paper compliance balance transfer. No engine retrofit, dry-docking, or cryogenic infrastructure required.'}
                </div>
                <span className="chip chip-info" style={{ fontSize: '9.5px' }}>Article 21 Compliance</span>
              </div>

              <div
                style={{
                  border: '1px solid var(--color-divider)',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-panel-header)',
                  borderRadius: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '11.5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mut">Pooling Legal Role:</span>
                  <span style={{ fontWeight: 700, color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-text)' }}>
                    {isSurplus ? 'Surplus Pool Provider' : 'Deficit Compliance Buyer'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mut">Contracted Pool Volume:</span>
                  <span className="num" style={{ fontWeight: 700 }}>{absDeficit.toLocaleString()} tCO₂e</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mut">Execution Mechanism:</span>
                  <span style={{ fontWeight: 600 }}>FuelEU database (Art. 19, Art. 21) Balance Transfer</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-divider)' }}>
                  <span style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>
                    {isSurplus ? 'Surplus Monetisation:' : 'Client Net Savings:'}
                  </span>
                  <span className="num" style={{ color: 'var(--color-status-pos-text)', fontWeight: 800 }}>
                    €{(counterparty.client_savings_pooling_eur / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>Desk Arrangement Fee (internal):</span>
                  <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>€{(counterparty.desk_margin_pooling_eur / 1e6).toFixed(2)}M</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportTermSheetFile}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '12px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Download size={14} /> Export Deal Note &amp; Pooling Agreement
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="scrim" style={{ alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '1220px',
          maxHeight: '94vh',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Institutional Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-panel-header)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
                flexShrink: 0,
              }}
            >
              <Ship size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  className={`chip ${getStrategyTierBadgeClass(counterparty.strategy_tier)}`}
                  style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', textTransform: 'uppercase' }}
                >
                  Rank #{counterparty.rank}
                </span>
                <h3 className="ptitle" style={{ fontSize: '18px', margin: 0, fontWeight: 800, letterSpacing: '-0.01em' }}>
                  {counterparty.parent_name}
                </h3>

                {/* Propulsion Capability */}
                {isDualFuel ? (
                  <span
                    className="chip chip-pos"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                    }}
                  >
                    <Flame size={11} style={{ color: '#047857' }} /> DUAL-FUEL LNG ({counterparty.lng_vessels_in_scope} LNG / {counterparty.conventional_vessels_in_scope} Conv)
                  </span>
                ) : (
                  <span
                    className="chip"
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--color-muted)',
                      padding: '2px 8px',
                    }}
                  >
                    <Anchor size={11} /> CONVENTIONAL FLEET ({counterparty.conventional_vessels_in_scope} vessels)
                  </span>
                )}

                <span
                  className={`chip ${isSurplus ? 'chip-pos' : 'chip-neg'}`}
                  style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px' }}
                >
                  {isSurplus ? '● Compliance Surplus Holder' : '▲ Deficit Compliance Carrier'}
                </span>
                <span className="chip" style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px' }}>
                  {counterparty.segment}
                </span>
              </div>
              <div className="subttl" style={{ marginTop: '3px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span><strong>HQ:</strong> {counterparty.headquarters || '—'}</span>
                <span>•</span>
                <span><strong>EU MRV Fleet:</strong> {counterparty.vessels_in_scope} vessels</span>
                <span>•</span>
                <span><strong>Corridor:</strong> {(counterparty.callingRegion && CALLING_REGIONS[counterparty.callingRegion]?.label) || counterparty.callingRegion || 'EUR'}</span>
                <span>•</span>
                <span><strong>Primary Ports:</strong> {counterparty.primary_bunkering_hubs || '—'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px', height: '30px', width: '30px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Cockpit Navigation Tabs & High-Level Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 18px',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-divider)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Institutional Tab Switcher */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              type="button"
              className={`chip ${activeView === 'COCKPIT' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                cursor: 'pointer',
                fontWeight: activeView === 'COCKPIT' ? 800 : 600,
                border: activeView === 'COCKPIT' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '3px',
              }}
              onClick={() => setActiveView('COCKPIT')}
            >
              <Columns size={12} /> ⊞ 2-Column Cockpit
            </button>

            <button
              type="button"
              className={`chip ${activeView === 'LEDGER' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                cursor: 'pointer',
                fontWeight: activeView === 'LEDGER' ? 800 : 600,
                border: activeView === 'LEDGER' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '3px',
              }}
              onClick={() => setActiveView('LEDGER')}
            >
              <Scale size={12} /> 1. Compliance Ledger &amp; CRM
            </button>

            <button
              type="button"
              className={`chip ${activeView === 'QUOTATION' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                cursor: 'pointer',
                fontWeight: activeView === 'QUOTATION' ? 800 : 600,
                border: activeView === 'QUOTATION' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '3px',
              }}
              onClick={() => setActiveView('QUOTATION')}
            >
              <Sliders size={12} /> 2. Live Bunker Pricing
            </button>

            <button
              type="button"
              className={`chip ${activeView === 'TERM_SHEET' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                cursor: 'pointer',
                fontWeight: activeView === 'TERM_SHEET' ? 800 : 600,
                border: activeView === 'TERM_SHEET' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '3px',
              }}
              onClick={() => setActiveView('TERM_SHEET')}
            >
              <FileText size={12} /> 3. OTC Term Sheet
            </button>
          </div>

          {/* Quick-Read Snapshot KPI Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
            <div>
              <span className="mut" style={{ marginRight: '4px' }}>Combined '25:</span>
              <strong style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                €{(liveCombinedExposure2026Eur / 1e6).toFixed(2)}M
              </strong>
            </div>
            <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--color-divider)' }} />
            <div>
              <span className="mut" style={{ marginRight: '4px' }}>Bio-LNG:</span>
              <strong style={{ fontWeight: 700 }}>
                {counterparty.bio_lng_required_neg100_t.toLocaleString()} t
              </strong>
            </div>
            <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--color-divider)' }} />
            <div>
              <span className="mut" style={{ marginRight: '4px' }}>Delivered Quote:</span>
              <strong style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                €{marineQuote.allInBioLngPriceEurMwh.toFixed(0)}/MWh
              </strong>
            </div>
            <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--color-divider)' }} />
            <div>
              <span className="mut" style={{ marginRight: '4px' }}>Net Arbitrage:</span>
              <strong style={{ color: marineQuote.netSavingsPerTonneBioLngEur >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)', fontWeight: 700 }}>
                {marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '+' : ''}€{marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)}/t
              </strong>
            </div>
          </div>
        </div>

        {/* Modal Body with View Contents */}
        <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
          {activeView === 'COCKPIT' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '14px' }}>
              <div>{renderModule1()}</div>
              <div>{renderModule2()}</div>
            </div>
          )}

          {activeView === 'LEDGER' && (
            <div style={{ maxWidth: '880px', margin: '0 auto' }}>{renderModule1()}</div>
          )}

          {activeView === 'QUOTATION' && (
            <div style={{ maxWidth: '880px', margin: '0 auto' }}>{renderModule2()}</div>
          )}

          {activeView === 'TERM_SHEET' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} style={{ color: 'var(--color-accent)' }} />
                  <span className="eyebrow" style={{ fontWeight: 800, fontSize: '11.5px', color: 'var(--color-text)' }}>
                    Commercial Term Sheet &amp; OTC Deal Note Preview
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyTermSheet}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', height: '28px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copied ? <Check size={12} style={{ color: '#059669' }} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTermSheetFile}
                    className="btn btn-primary"
                    style={{ fontSize: '11px', height: '28px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Download size={12} /> Download Term Sheet (.TXT)
                  </button>
                </div>
              </div>

              <pre
                style={{
                  margin: 0,
                  padding: '14px',
                  backgroundColor: 'var(--color-panel-header)',
                  border: '1px solid var(--color-divider)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  lineHeight: 1.45,
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  color: 'var(--color-text)',
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: '56vh',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {generateTermSheetText()}
              </pre>
            </div>
          )}
        </div>

        {/* Institutional Action Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-panel-header)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-muted)' }}>
            <ShieldCheck size={13} style={{ color: '#059669' }} />
            <span>Regulation (EU) 2023/1805 &amp; Directive (EU) 2023/959 Statutory Marine Desk Facility</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleExportTermSheetFile}
              className="btn btn-secondary"
              style={{ fontSize: '11px', height: '30px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '3px' }}
              title="Download Term Sheet as text file and copy to clipboard"
            >
              <FileText size={12} /> {copied ? 'Downloaded!' : 'Export Term Sheet (.TXT)'}
            </button>
            <button
              type="button"
              onClick={handleLoadDeal}
              className="btn btn-primary"
              style={{ fontSize: '11px', height: '30px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '3px' }}
            >
              <Zap size={12} /> Structure Deal in Trade Builder
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '11px', height: '30px', padding: '0 12px', borderRadius: '3px' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
