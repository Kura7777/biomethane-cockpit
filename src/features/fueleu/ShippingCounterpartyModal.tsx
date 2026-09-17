import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShippingCounterparty,
  CALLING_REGIONS,
  TRADE_LANES,
  getStrategyTierBadgeClass,
} from '../../domain/fueleu/types';
import {
  calculateMarineBunkerQuotation,
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
  TrendingDown,
  Coins,
  ChevronRight,
  Download,
  ExternalLink,
  Info,
  MapPin,
  Compass,
  Flame,
  Sliders,
  DollarSign,
  Ship,
  CheckCircle,
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';

interface ShippingCounterpartyModalProps {
  counterparty: ShippingCounterparty | null;
  onClose: () => void;
}

export function ShippingCounterpartyModal({ counterparty, onClose }: ShippingCounterpartyModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);

  // Live Interactive Bunker Quotation Parameters
  const [ttfGasIndex, setTtfGasIndex] = useState<number>(36.00);
  const [liquefactionFee, setLiquefactionFee] = useState<number>(14.00);
  const [greenPremium, setGreenPremium] = useState<number>(22.00);
  const [euaPrice, setEuaPrice] = useState<number>(70.00);
  const [vlsfoPrice, setVlsfoPrice] = useState<number>(600.00);

  if (!counterparty) return null;

  const isSurplus = counterparty.compliance_balance_2025_tco2e > 0;
  const absDeficit = Math.abs(counterparty.compliance_balance_2025_tco2e);
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
      targetYear: 2025,
    });
  }, [ttfGasIndex, liquefactionFee, greenPremium, euaPrice, vlsfoPrice, counterparty.bio_lng_required_neg100_t]);

  // Live recalculated EU ETS and Combined exposure based on active EUA slider
  const liveEtsExposure2025Eur = useMemo(() => {
    return Math.round(counterparty.ets_exposure_2025_tco2 * euaPrice);
  }, [counterparty.ets_exposure_2025_tco2, euaPrice]);

  const liveEtsExposure2026Eur = useMemo(() => {
    const grossTco2 = counterparty.ets_exposure_2025_tco2 / 0.70;
    return Math.round(grossTco2 * euaPrice);
  }, [counterparty.ets_exposure_2025_tco2, euaPrice]);

  const liveCombinedExposure2025Eur = useMemo(() => {
    return counterparty.penalty_2025_y1_eur + liveEtsExposure2025Eur;
  }, [counterparty.penalty_2025_y1_eur, liveEtsExposure2025Eur]);

  // Dynamically Tailored Sales Pitch based on Fleet Engine Readiness
  const tailoredPitch = useMemo(() => {
    if (isSurplus) {
      return `With ${counterparty.vessels_in_scope} vessels generating an audited +${(counterparty.compliance_balance_2025_tco2e / 1000).toFixed(1)} kt FuelEU compliance surplus in 2025, ${counterparty.parent_name} commands premier Article 21 pooling monetization leverage. Our desk can broker your surplus into deficit carrier pools at premium spreads (€435/tCO2e), capturing €${(counterparty.client_savings_pooling_eur / 1e6).toFixed(1)}M in non-dilutive liquidity without operational disruption.`;
    }
    if (isDualFuel) {
      return `${counterparty.parent_name}'s fleet includes ${counterparty.lng_vessels_in_scope} Dual-Fuel LNG vessels creating immediate physical Bio-LNG bunkering leverage. Across your European calling hubs (${counterparty.primary_bunkering_hubs}), your combined 2025 regulatory exposure is €${(liveCombinedExposure2025Eur / 1e6).toFixed(1)}M (€${(counterparty.penalty_2025_y1_eur / 1e6).toFixed(1)}M FuelEU penalty + €${(liveEtsExposure2025Eur / 1e6).toFixed(1)}M EU ETS 70% liability). By executing physical cryogenic Bio-LNG bunkering (STS/TTS) of ${(counterparty.bio_lng_required_neg100_mwh / 1000).toFixed(1)} GWh (-100 CI manure substrate), ${counterparty.parent_name} achieves double statutory zero-rating under RED III and EU ETS Directive 2023/959, securing up to €${(counterparty.client_savings_physical_eur / 1e6).toFixed(1)}M in net client savings.`;
    }
    return `${counterparty.parent_name}'s fleet of ${counterparty.vessels_in_scope} conventional 2-stroke diesel vessels incurs €${(liveCombinedExposure2025Eur / 1e6).toFixed(1)}M in 2025 joint regulatory exposure (€${(counterparty.penalty_2025_y1_eur / 1e6).toFixed(1)}M FuelEU + €${(liveEtsExposure2025Eur / 1e6).toFixed(1)}M EU ETS). Without requiring shipyard dry-docking or cryogenic engine modifications, our desk structures frictionless Article 21 Compliance Pooling alongside drop-in certified B30/HVO biofuel allocations, wiping out compliance deficits and delivering €${(counterparty.client_savings_pooling_eur / 1e6).toFixed(1)}M in net savings.`;
  }, [counterparty, isSurplus, isDualFuel, liveCombinedExposure2025Eur, liveEtsExposure2025Eur]);

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
      complianceYear: 2025,
    });
    navigate(url);
  };

  const handleCopyPitch = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(tailoredPitch).catch(() => {});
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
INSTITUTIONAL OTC MARINE BIO-LNG TERM SHEET & DEAL NOTE
REGULATION (EU) 2023/1805 (FUELEU) & DIRECTIVE (EU) 2023/959 (EU ETS)
================================================================================
DATE: ${new Date().toISOString().split('T')[0]}
PORTFOLIO COMPLIANCE RANK: #${counterparty.rank}
STRATEGIC TIER: ${counterparty.strategy_tier}
COUNTERPARTY: ${counterparty.parent_name}
HEADQUARTERS: ${counterparty.headquarters}
COMMERCIAL HQ ADDRESS: ${counterparty.hqAddress}
SWITCHBOARD PHONE: ${counterparty.switchboardPhone}
CORPORATE DOMAIN: ${counterparty.contactDomain}
FLEET SEGMENT: ${counterparty.segment} (${counterparty.vessels_in_scope} vessels in EU scope)
ENGINE CAPABILITY: ${isDualFuel ? `DUAL-FUEL CRYOGENIC LNG READY (${counterparty.lng_vessels_in_scope} LNG vessels / ${counterparty.conventional_vessels_in_scope} conventional)` : `CONVENTIONAL PROPULSION ONLY (${counterparty.conventional_vessels_in_scope} 2-stroke diesel vessels)`}
KEY EXECUTIVE: ${counterparty.key_executive}
TARGET DEPARTMENT: ${counterparty.targetDepartment}
KEY CONTACT ROLE: ${counterparty.keyContactRole}
PRIMARY BUNKERING PORTS: ${counterparty.primary_bunkering_hubs}
CALLING CORRIDOR: ${CALLING_REGIONS[counterparty.callingRegion]?.label || counterparty.callingRegion} (${CALLING_REGIONS[counterparty.callingRegion]?.portsDescription || ''})
TRADE LANE: ${TRADE_LANES[counterparty.tradeLane]?.label || counterparty.tradeLane} (${TRADE_LANES[counterparty.tradeLane]?.corridorDescription || ''})

1. AUDITED BASELINE FLEET EXPOSURE (EU MRV DIRECTIVE)
--------------------------------------------------------------------------------
- Annual Fuel Burn in EU Scope:
    * VLSFO: ${counterparty.vlsfo_tonnes.toLocaleString()} tonnes
    * MGO / MDO: ${counterparty.mgo_tonnes.toLocaleString()} tonnes
    * Fossil LNG: ${counterparty.lng_tonnes.toLocaleString()} tonnes
- Fleet Energy Consumption: ${(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh
- Actual Achieved GHG Intensity: ${counterparty.actual_ghgie.toFixed(2)} gCO2e/MJ
- 2025 FuelEU Target (2% reduction): 89.34 gCO2e/MJ
- Statutory Compliance Balance 2025: ${counterparty.compliance_balance_2025_tco2e > 0 ? '+' : ''}${counterparty.compliance_balance_2025_tco2e.toLocaleString()} tCO2e
- FuelEU Statutory Penalty Exposure: €${counterparty.penalty_2025_y1_eur.toLocaleString()} (Yr 2: €${counterparty.penalty_2025_y2_eur.toLocaleString()})
- EU ETS 2025 Gross Carbon Liability (70% Phase-In @ €${euaPrice.toFixed(2)}/t EUA): €${liveEtsExposure2025Eur.toLocaleString()} (${counterparty.ets_exposure_2025_tco2.toLocaleString()} tCO2)
- EU ETS 2026 Full Enforcement (100% Phase-In): €${liveEtsExposure2026Eur.toLocaleString()}
- COMBINED 2025 STATUTORY EXPOSURE: €${liveCombinedExposure2025Eur.toLocaleString()}

2. INSTITUTIONAL MARINE BUNKER PRICING ENGINE (€/t & $/t)
--------------------------------------------------------------------------------
- TTF Natural Gas Front-Month Index: €${ttfGasIndex.toFixed(2)} / MWh
- Liquefaction & Terminalization Fee: €${liquefactionFee.toFixed(2)} / MWh
- Green Bio-LNG Premium (RED III Certified): €${greenPremium.toFixed(2)} / MWh
- All-In Delivered Bio-LNG Price: €${marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh
    * Equivalent Metric Tonne Price (EUR): €${marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne Bio-LNG
    * Equivalent Metric Tonne Price (USD): $${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne Bio-LNG
- Benchmark Conventional Alternative (1.2195t VLSFO @ $${vlsfoPrice}/t + FuelEU Deficit + EU ETS):
    * Alternative Compliance Cost (EUR): €${marineQuote.totalConventionalAlternativeCostEur.toFixed(2)} / t Bio-LNG eq
    * Alternative Compliance Cost (USD): $${marineQuote.totalConventionalAlternativeCostUsd.toFixed(2)} / t Bio-LNG eq
- Net Client Arbitrage Advantage: ${marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '+' : ''}€${marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)} / tonne (${marineQuote.netSavingsPerTonneBioLngUsd >= 0 ? '+' : ''}$${marineQuote.netSavingsPerTonneBioLngUsd.toFixed(2)} / tonne)

3. STRUCTURED TRANSACTION SCHEDULE (DEFICIT NEUTRALISATION)
--------------------------------------------------------------------------------
- Manure Bio-LNG Volume (-100 CI): ${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (${counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)
- Zero-CI Bio-LNG Required: ${counterparty.bio_lng_required_zero_t.toLocaleString()} tonnes
- Delivery Terms: DES (Delivered Ex-Ship) / TTS (Truck-to-Ship) at ${counterparty.primary_bunkering_hubs}
- Total Delivered Invoice (EUR): €${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}
- Total Delivered Invoice (USD): $${(marineQuote.totalBioLngInvoiceUsd || 0).toLocaleString()}
- Net Client Statutory Savings: €${counterparty.client_savings_physical_eur.toLocaleString()}
- Desk Structuring Margin: €${counterparty.desk_margin_physical_eur.toLocaleString()}

4. COMMERCIAL STRATEGY & TAILORED TRADER PITCH
--------------------------------------------------------------------------------
"${tailoredPitch}"

5. STATUTORY VERIFICATION & GOVERNING LAW
--------------------------------------------------------------------------------
- Certification: ISCC EU / REDcert-EU Mass Balance under RED III (Directive (EU) 2018/2001)
- EU ETS Zero-Rating: Verified under Regulation (EU) 2015/757 & Directive (EU) 2023/959
- FuelEU Maritime Compliance: Full Article 20 Bunkering / Article 21 Pooling Validation
- Governing Contract: Standard BIMCO Bunker Terms 2020 / EFET Marine Decarbonisation Annex
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

  return (
    <div className="scrim" style={{ alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div 
        className="panel"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Anchor size={18} style={{ color: 'var(--color-accent)' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  className={`chip ${getStrategyTierBadgeClass(counterparty.strategy_tier)}`}
                  style={{ fontSize: '10px', fontWeight: 700 }}
                >
                  Rank #{counterparty.rank}
                </span>
                <h3 className="ptitle" style={{ fontSize: '16px', margin: 0 }}>{counterparty.parent_name}</h3>
                
                {/* Engine Readiness Capability Badge */}
                {isDualFuel ? (
                  <span className="chip chip-pos" style={{ fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Flame size={11} style={{ color: '#047857' }} /> DUAL-FUEL LNG ({counterparty.lng_vessels_in_scope} vessels)
                  </span>
                ) : (
                  <span className="chip" style={{ fontSize: '10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--color-muted)' }}>
                    <Anchor size={11} /> CONVENTIONAL FLEET ({counterparty.conventional_vessels_in_scope} vessels)
                  </span>
                )}

                <span className={`chip ${isSurplus ? 'chip-pos' : 'chip-neg'}`} style={{ fontSize: '10px' }}>
                  {isSurplus ? 'Surplus Holder' : 'Deficit Carrier'}
                </span>
                <span className="chip" style={{ fontSize: '10px' }}>
                  {counterparty.segment}
                </span>
              </div>
              <div className="subttl" style={{ marginTop: '2px' }}>
                {counterparty.headquarters} · {counterparty.vessels_in_scope} vessels in EU MRV scope · Commercial Desk Dossier
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '4px', height: '28px', width: '28px' }}
            aria-label="Close modal"
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Section 1: Dynamically Tailored Sales Pitch Banner */}
          <div
            style={{
              padding: '12px 14px',
              border: `1px solid ${isDualFuel ? 'var(--color-status-pos-border, #059669)' : 'var(--color-accent)'}`,
              backgroundColor: 'var(--color-panel-header)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isDualFuel ? (
                  <Flame size={15} style={{ color: '#059669' }} />
                ) : (
                  <ShieldCheck size={15} style={{ color: 'var(--color-accent)' }} />
                )}
                <span style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isSurplus
                    ? 'Tailored Strategy: Article 21 Surplus Pool Monetization'
                    : isDualFuel
                    ? 'Tailored Strategy: Physical Cryogenic Bio-LNG DES Bunkering (STS/TTS)'
                    : 'Tailored Strategy: Frictionless Article 21 Compliance Pooling & Biofuels'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPitch}
                className="btn btn-secondary"
                style={{ fontSize: '11px', height: '24px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Copy trader outreach pitch to clipboard"
              >
                {pitchCopied ? <Check size={11} style={{ color: '#059669' }} /> : <Copy size={11} />}
                {pitchCopied ? 'Pitch Copied!' : 'Copy Pitch'}
              </button>
            </div>
            <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--color-text)' }}>
              "{tailoredPitch}"
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--color-muted)', paddingTop: '4px', borderTop: '1px solid var(--color-divider)' }}>
              <span><strong>Key Contact:</strong> {counterparty.key_executive}</span>
              <span><strong>Target Unit:</strong> {counterparty.targetDepartment}</span>
              <span><strong>Role:</strong> {counterparty.keyContactRole}</span>
              <span><strong>Phone:</strong> {counterparty.switchboardPhone}</span>
              <span><strong>Domain:</strong> {counterparty.contactDomain}</span>
            </div>
          </div>

          {/* Section 2: Joint Regulatory Exposure Ledger (FuelEU Maritime + EU ETS Directive 2023/959) */}
          <div
            style={{
              padding: '12px 14px',
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span className="eyebrow" style={{ fontWeight: 700, fontSize: '11px', color: 'var(--color-accent)' }}>
                Joint Statutory Exposure Audit: FuelEU Maritime + EU ETS Maritime
              </span>
              <span className="chip chip-info" style={{ fontSize: '10px' }}>
                Directive (EU) 2023/959 &amp; Regulation (EU) 2023/1805
              </span>
            </div>

            <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', margin: 0, gap: '8px' }}>
              <div style={{ padding: '8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
                <span className="eyebrow" style={{ fontSize: '10px' }}>2025 FuelEU Deficit</span>
                <div className="num" style={{ fontSize: '16px', fontWeight: 700, color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                  {isSurplus ? `+${(counterparty.compliance_balance_2025_tco2e / 1000).toFixed(1)} kt` : `${(counterparty.compliance_balance_2025_tco2e / 1000).toFixed(1)} kt`}
                </div>
                <div className="subttl num" style={{ fontSize: '10px' }}>
                  Penalty: {isSurplus ? '€0' : `€${(counterparty.penalty_2025_y1_eur / 1e6).toFixed(2)}M`}
                </div>
              </div>

              <div style={{ padding: '8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
                <span className="eyebrow" style={{ fontSize: '10px' }}>2025 EU ETS Liability (70%)</span>
                <div className="num" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-status-warn-text, #d97706)' }}>
                  €{(liveEtsExposure2025Eur / 1e6).toFixed(2)}M
                </div>
                <div className="subttl num" style={{ fontSize: '10px' }}>
                  {(counterparty.ets_exposure_2025_tco2 / 1000).toFixed(1)} kt CO2 @ €{euaPrice.toFixed(0)}/t
                </div>
              </div>

              <div style={{ padding: '8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
                <span className="eyebrow" style={{ fontSize: '10px' }}>2026 EU ETS Liability (100%)</span>
                <div className="num" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-status-warn-text, #d97706)' }}>
                  €{(liveEtsExposure2026Eur / 1e6).toFixed(2)}M
                </div>
                <div className="subttl num" style={{ fontSize: '10px' }}>
                  Full enforcement phase
                </div>
              </div>

              <div style={{ padding: '8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
                <span className="eyebrow" style={{ fontSize: '10px' }}>Combined 2025 Exposure</span>
                <div className="num" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-accent)' }}>
                  €{(liveCombinedExposure2025Eur / 1e6).toFixed(2)}M
                </div>
                <div className="subttl num" style={{ fontSize: '10px' }}>
                  FuelEU Penalty + EU ETS
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
              <strong>Double Statutory Savings Advantage:</strong> Certified RED III Bio-LNG carries a verified emissions factor of 0.000 tCO2/t under EU ETS Maritime and -100 gCO2e/MJ under FuelEU Maritime. Displacing fossil bunkers simultaneously eliminates both compliance liabilities.
            </div>
          </div>

          {/* Section 3: Live Interactive Marine Bunker Quotation Engine */}
          <div
            style={{
              padding: '12px 14px',
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} style={{ color: 'var(--color-accent)' }} />
                <span className="eyebrow" style={{ fontWeight: 700, fontSize: '11px', color: 'var(--color-text)' }}>
                  Live Institutional Marine Bunker Quotation Engine (€/t &amp; $/t)
                </span>
              </div>
              <span className="chip" style={{ fontSize: '10px' }}>
                1 t Bio-LNG = 13.9 MWh (50 GJ/t) · FX €/$: 1.08
              </span>
            </div>

            {/* Interactive Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10.5px', color: 'var(--color-muted)', fontWeight: 600 }}>TTF Gas Index (€/MWh)</label>
                <input
                  type="number"
                  step="0.5"
                  value={ttfGasIndex}
                  onChange={(e) => setTtfGasIndex(parseFloat(e.target.value) || 0)}
                  className="input"
                  style={{ height: '28px', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10.5px', color: 'var(--color-muted)', fontWeight: 600 }}>Liquefaction Fee (€/MWh)</label>
                <input
                  type="number"
                  step="0.5"
                  value={liquefactionFee}
                  onChange={(e) => setLiquefactionFee(parseFloat(e.target.value) || 0)}
                  className="input"
                  style={{ height: '28px', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10.5px', color: 'var(--color-muted)', fontWeight: 600 }}>Green Bio Premium (€/MWh)</label>
                <input
                  type="number"
                  step="0.5"
                  value={greenPremium}
                  onChange={(e) => setGreenPremium(parseFloat(e.target.value) || 0)}
                  className="input"
                  style={{ height: '28px', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10.5px', color: 'var(--color-muted)', fontWeight: 600 }}>EU ETS EUA Price (€/t)</label>
                <input
                  type="number"
                  step="1"
                  value={euaPrice}
                  onChange={(e) => setEuaPrice(parseFloat(e.target.value) || 0)}
                  className="input"
                  style={{ height: '28px', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10.5px', color: 'var(--color-muted)', fontWeight: 600 }}>VLSFO Baseline ($/t)</label>
                <input
                  type="number"
                  step="5"
                  value={vlsfoPrice}
                  onChange={(e) => setVlsfoPrice(parseFloat(e.target.value) || 0)}
                  className="input"
                  style={{ height: '28px', fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Quotation Pricing & Arbitrage Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '4px' }}>
              <div style={{ padding: '8px 10px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
                <span className="eyebrow" style={{ fontSize: '10px' }}>All-In Bio-LNG Quote</span>
                <div className="num" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-accent)' }}>
                  €{marineQuote.allInBioLngPriceEurMwh.toFixed(2)}/MWh
                </div>
                <div className="subttl num" style={{ fontSize: '10.5px' }}>
                  €{marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()}/t · ${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()}/t
                </div>
              </div>

              <div style={{ padding: '8px 10px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
                <span className="eyebrow" style={{ fontSize: '10px' }}>VLSFO + Penalty Cost</span>
                <div className="num" style={{ fontSize: '15px', fontWeight: 700 }}>
                  ${marineQuote.totalConventionalAlternativeCostUsd.toLocaleString()}/t
                </div>
                <div className="subttl num" style={{ fontSize: '10.5px' }}>
                  €{marineQuote.totalConventionalAlternativeCostEur.toFixed(2)}/t Bio-LNG equivalent
                </div>
              </div>

              <div style={{ padding: '8px 10px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
                <span className="eyebrow" style={{ fontSize: '10px' }}>Net Arbitrage Advantage</span>
                <div className="num" style={{ fontSize: '15px', fontWeight: 700, color: marineQuote.netSavingsPerTonneBioLngEur >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                  {marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '+' : ''}€{marineQuote.netSavingsPerTonneBioLngEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/t
                </div>
                <div className="subttl num" style={{ fontSize: '10.5px' }}>
                  {marineQuote.netSavingsPerTonneBioLngUsd >= 0 ? '+' : ''}${marineQuote.netSavingsPerTonneBioLngUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/t Bio-LNG bunkered
                </div>
              </div>

              <div style={{ padding: '8px 10px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
                <span className="eyebrow" style={{ fontSize: '10px' }}>Required Bio-LNG Volume</span>
                <div className="num" style={{ fontSize: '15px', fontWeight: 700 }}>
                  {counterparty.bio_lng_required_neg100_t.toLocaleString()} t
                </div>
                <div className="subttl num" style={{ fontSize: '10.5px' }}>
                  {(counterparty.bio_lng_required_neg100_mwh / 1000).toFixed(1)} GWh (-100 CI manure)
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Dual Commercial Sourcing Pathways */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {/* Pathway 1: Physical Cryogenic Bio-LNG */}
            <div
              style={{
                border: isDualFuel ? '2px solid var(--color-status-pos-border, #059669)' : '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} style={{ color: 'var(--color-accent)' }} /> Pathway 1: Physical Cryogenic Bio-LNG (DES/TTS)
                  </span>
                  <span className={`chip ${isDualFuel ? 'chip-pos' : 'chip-info'}`}>
                    {isDualFuel ? '★ Recommended' : 'Article 20'}
                  </span>
                </div>
                <div className="subttl" style={{ marginBottom: '10px' }}>
                  Direct delivery into {counterparty.lng_vessels_in_scope} dual-fuel vessels via STS bunker barge or TTS truck in {counterparty.primary_bunkering_hubs}.
                </div>

                <div style={{ border: '1px solid var(--color-divider)', padding: '10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Bio-LNG Needed (CI -100):</span>
                    <span className="num" style={{ fontWeight: 600 }}>{counterparty.bio_lng_required_neg100_t.toLocaleString()} t ({counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Zero-Rating Benefit:</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-status-pos-text)' }}>Zero FuelEU Penalty + Zero EU ETS</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-divider)' }}>
                    <span style={{ color: 'var(--color-status-pos-text)', fontWeight: 600 }}>Client Net Savings:</span>
                    <span className="num" style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>€{(counterparty.client_savings_physical_eur / 1e6).toFixed(2)}M</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Desk Trading Margin:</span>
                    <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>€{(counterparty.desk_margin_physical_eur / 1e6).toFixed(2)}M</span>
                  </div>
                </div>
              </div>

              {!isSurplus && (
                <button
                  type="button"
                  onClick={handleLoadDeal}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px', fontSize: '12px', height: '32px' }}
                >
                  <Zap size={13} /> Structure Bio-LNG in Trade Builder
                </button>
              )}
            </div>

            {/* Pathway 2: Article 21 Compliance Pooling */}
            <div
              style={{
                border: !isDualFuel ? '2px solid var(--color-accent)' : '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} style={{ color: 'var(--color-status-pos-text)' }} /> Pathway 2: Article 21 Compliance Pooling
                  </span>
                  <span className={`chip ${!isDualFuel && !isSurplus ? 'chip-info' : 'chip-pos'}`}>
                    {!isDualFuel && !isSurplus ? '★ Recommended' : 'Article 21'}
                  </span>
                </div>
                <div className="subttl" style={{ marginBottom: '10px' }}>
                  {isSurplus 
                    ? 'Monetise compliance surplus by transferring verified positive balances into the Desk compliance pool.' 
                    : 'Frictionless paper compliance balance transfer. No engine retrofit, dry-docking, or cryogenic infrastructure required.'}
                </div>

                <div style={{ border: '1px solid var(--color-divider)', padding: '10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Pooling Role:</span>
                    <span style={{ fontWeight: 600, color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-text)' }}>
                      {isSurplus ? 'Surplus Pool Provider' : 'Deficit Compliance Buyer'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Pool Volume:</span>
                    <span className="num">{absDeficit.toLocaleString()} tCO₂e</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-divider)' }}>
                    <span style={{ color: 'var(--color-status-pos-text)', fontWeight: 600 }}>{isSurplus ? 'Surplus Monetisation:' : 'Client Net Savings:'}</span>
                    <span className="num" style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>€{(counterparty.client_savings_pooling_eur / 1e6).toFixed(2)}M</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Desk Arrangement Margin:</span>
                    <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>€{(counterparty.desk_margin_pooling_eur / 1e6).toFixed(2)}M</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportTermSheetFile}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px', fontSize: '12px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Download size={13} /> Export Term Sheet &amp; Deal Note
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-panel-header)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span className="subttl" style={{ fontSize: '11px' }}>
            Regulation (EU) 2023/1805 &amp; Directive (EU) 2023/959 Statutory Desk Facility
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleExportTermSheetFile}
              className="btn btn-secondary"
              style={{ fontSize: '11px', height: '30px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="Download Term Sheet as text file and copy to clipboard"
            >
              <FileText size={12} /> {copied ? 'Downloaded!' : 'Export Term Sheet (.TXT)'}
            </button>
            <button
              type="button"
              onClick={handleLoadDeal}
              className="btn btn-primary"
              style={{ fontSize: '11px', height: '30px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Zap size={12} /> Trade Builder Bridge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
