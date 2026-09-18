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
  Mail,
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
  const [isBooked, setIsBooked] = useState(false);

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

  const handleBookDeal = () => {
    setIsBooked(true);
    showToast(`Bunker Deal ${dealRef} booked to Maritime Desk Blotter!`, 'SUCCESS');
  };

  const handleOpenEmail = () => {
    const subject = encodeURIComponent(
      `FuelEU Maritime 2025 Compliance & Bio-LNG Bunker Proposal — ${counterparty.parent_name} [Ref: ${dealRef}]`
    );
    const volumeSummary =
      pathway === 'PHYSICAL'
        ? `${counterparty.bio_lng_required_neg100_t.toLocaleString()} metric tonnes (-100 gCO2e/MJ Manure Bio-LNG)`
        : `${Math.abs(counterparty.compliance_balance_2025_tco2e).toLocaleString()} tCO2e Compliance Pool`;

    const body = encodeURIComponent(
`Dear ${counterparty.key_executive},

Please find below our institutional OTC marine fuel quotation to neutralise ${counterparty.parent_name}'s 2025 FuelEU Maritime statutory exposure:

1. COUNTERPARTY & EXPOSURE PROFILE
- Counterparty: ${counterparty.parent_name} (#${counterparty.rank})
- Fleet in EU MRV Scope: ${counterparty.vessels_in_scope} vessels (${counterparty.segment})
- 2025 Statutory Exposure: €${(counterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(2)}M (FuelEU Penalty + EU ETS 70% Liability)
- Primary Bunkering Corridor: ${counterparty.primary_bunkering_hubs}

2. COMMERCIAL PROPOSAL (${pathway === 'PHYSICAL' ? 'Article 20 Physical Bio-LNG' : 'Article 21 Compliance Pooling'})
- Product Volume: ${volumeSummary}
- Delivered Bunker Price: €${marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne ($${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne)
- Delivery Terms: ${pathway === 'PHYSICAL' ? `DES / TTS at ${counterparty.primary_bunkering_hubs}` : 'EMSA Thetis-MRV Compliance Surplus Transfer'}
- Client Net Financial Savings vs Penalty: €${(effectiveClientSavingsEur / 1e6).toFixed(2)}M

3. GOVERNING TERMS & CERTIFICATION
- Certification: ISCC EU / REDcert-EU under RED III (Directive (EU) 2018/2001)
- Standard Terms: BIMCO Bunker Terms 2020 / EFET Marine Decarbonisation Annex
- Deal Reference: ${dealRef}

Please let us know if you would like to schedule an execution call or receive the executed term sheet package.

Best regards,
European Biomethane & Marine Fuels Trading Desk`
    );
    window.open(`mailto:${contactEmail}?subject=${subject}&body=${body}`, '_blank');
    showToast(`Opening commercial proposal to ${contactEmail}`, 'INFO');
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
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-5 space-y-4">
      {/* Top Header Strip */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
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
              {dealRef}
            </span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
              {counterparty.parent_name}
            </h2>
            {isBooked ? (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  border: '1px solid rgba(16, 185, 129, 0.6)',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: 'var(--color-status-pos-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle2 size={11} />
                <span>CONFIRMED &amp; BOOKED TO BLOTTER</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--color-status-pos-text)',
                }}
              >
                TERM SHEET READY
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            Institutional OTC Marine Bunker Deal Note · Governed by BIMCO Bunker Terms 2020 &amp; Regulation (EU) 2023/1805
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleBookDeal}
            className="btn btn-primary"
            style={{
              height: '32px',
              padding: '0 14px',
              fontSize: '11.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              backgroundColor: isBooked ? 'rgba(16, 185, 129, 0.9)' : undefined,
            }}
            title="Book and confirm this bunker transaction to the desk blotter"
          >
            <CheckCircle2 size={13} />
            <span>{isBooked ? 'Deal Confirmed & Booked ✓' : 'Book & Confirm Bunker Deal'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenEmail}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Open pre-filled proposal in your email client (Outlook / Gmail)"
          >
            <Mail size={13} style={{ color: 'var(--color-accent)' }} />
            <span>Email Proposal to Buyer</span>
          </button>

          <button
            type="button"
            onClick={handleExportTermSheetFile}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Download institutional text file"
          >
            <Download size={13} />
            <span>Export (.TXT)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyDealSummary}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Copy concise deal summary"
          >
            {dealCopied ? <Check size={13} style={{ color: 'var(--color-status-pos-text)' }} /> : <Copy size={13} />}
            <span>{dealCopied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            onClick={handleExecuteTrade}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px', opacity: 0.9 }}
            title="Source physical biomethane on the European gas grid to feed liquefaction"
          >
            <ExternalLink size={12} />
            <span>Hedge Upstream Gas ↗</span>
          </button>
        </div>
      </div>

      {/* Institutional Term Sheet Preview Box */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          overflow: 'hidden',
        }}
      >
        {/* Term Sheet Header Bar */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-panel-header)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={14} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Institutional Deal Note Preview
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
            <span>BIMCO BUNKER TERMS 2020</span>
            <span>·</span>
            <span>EFET DECARB ANNEX</span>
          </div>
        </div>

        {/* Formatted Term Sheet Content */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: MONO_FONT, fontSize: '12px' }}>
          {/* Section 1 */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-subtier)',
              padding: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                marginBottom: '10px',
                borderBottom: '1px solid var(--color-divider)',
                fontWeight: 700,
                fontSize: '12.5px',
                color: 'var(--color-text)',
              }}
            >
              <span>1. AUDITED BASELINE FLEET EXPOSURE (EMSA THETIS-MRV)</span>
              <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 600 }}>AUDITED DIRECTIVE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>• Fleet Energy in Scope: <strong style={{ color: 'var(--color-text)' }}>{(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh</strong></div>
              <div>• FuelEU Target: <strong style={{ color: 'var(--color-text)' }}>89.34 gCO2e/MJ</strong> (Actual: {counterparty.actual_ghgie.toFixed(2)})</div>
              <div>• Vessels in Scope: <strong style={{ color: 'var(--color-text)' }}>{counterparty.vessels_in_scope}</strong> ({isDualFuel ? `${counterparty.lng_vessels_in_scope} LNG-ready` : 'Conventional'})</div>
              <div>• 2025 FuelEU Penalty: <strong style={{ color: 'var(--color-status-neg-text)' }}>€{(counterparty.penalty_2025_y1_eur / 1e6).toFixed(2)}M</strong></div>
              <div>• 2025 EU ETS Liability (70%): <strong style={{ color: 'var(--color-warning)' }}>€{(counterparty.ets_exposure_2025_eur / 1e6).toFixed(2)}M</strong></div>
              <div>• Combined 2025 Exposure: <strong style={{ color: 'var(--color-status-neg-text)' }}>€{(counterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(2)}M</strong></div>
            </div>
          </div>

          {/* Section 2 */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-subtier)',
              padding: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                marginBottom: '10px',
                borderBottom: '1px solid var(--color-divider)',
                fontWeight: 700,
                fontSize: '12.5px',
                color: 'var(--color-text)',
              }}
            >
              <span>2. INSTITUTIONAL MARINE BUNKER PRICING ENGINE</span>
              <span style={{ fontSize: '10px', color: 'var(--color-status-pos-text)', fontWeight: 600 }}>DELIVERED QUOTE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>• TTF Natural Gas Front-Month: <strong style={{ color: 'var(--color-text)' }}>€{ttfGasIndex.toFixed(2)} / MWh</strong></div>
              <div>• Liquefaction &amp; Terminal Fee: <strong style={{ color: 'var(--color-text)' }}>€{liquefactionFee.toFixed(2)} / MWh</strong></div>
              <div>• RED III Green Bio-LNG Premium: <strong style={{ color: 'var(--color-text)' }}>€{greenPremium.toFixed(2)} / MWh</strong></div>
              <div>• All-In Bio-LNG Energy Price: <strong style={{ color: 'var(--color-accent)' }}>€{marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh</strong></div>
              <div>• Delivered Bio-LNG Quote (EUR): <strong style={{ color: 'var(--color-text)', fontSize: '13px' }}>€{marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne</strong></div>
              <div>• Delivered Bio-LNG Quote (USD): <strong style={{ color: 'var(--color-text)', fontSize: '13px' }}>${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne</strong></div>
              <div>• Benchmark Conventional Alternative: <strong style={{ color: 'var(--color-text)' }}>€{marineQuote.totalConventionalAlternativeCostEur.toFixed(2)} / t Bio-LNG eq</strong></div>
              <div>• Net Client Arbitrage Advantage: <strong style={{ color: 'var(--color-status-pos-text)' }}>+€{marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)} / tonne</strong></div>
            </div>
          </div>

          {/* Section 3 */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-subtier)',
              padding: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                marginBottom: '10px',
                borderBottom: '1px solid var(--color-divider)',
                fontWeight: 700,
                fontSize: '12.5px',
                color: 'var(--color-text)',
              }}
            >
              <span>3. STRUCTURED TRANSACTION SCHEDULE &amp; EXECUTION</span>
              <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 600 }}>OTC COMMODITY</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>• Product Volume: <strong style={{ color: 'var(--color-text)' }}>{pathway === 'PHYSICAL' ? `${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (${counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)` : `${Math.abs(counterparty.compliance_balance_2025_tco2e).toLocaleString()} tCO₂e (Article 21)`}</strong></div>
              <div>• Substrate / Solution: <strong style={{ color: 'var(--color-text)' }}>{pathway === 'PHYSICAL' ? 'Manure (-100 gCO₂e/MJ)' : 'Drop-in Biofuel Compliance Pool'}</strong></div>
              <div>• Delivery Hubs / Registry: <strong style={{ color: 'var(--color-accent)' }}>{counterparty.primary_bunkering_hubs}</strong> ({pathway === 'PHYSICAL' ? 'DES / TTS' : 'Thetis-MRV'})</div>
              <div>• Total Transaction Value: <strong style={{ color: 'var(--color-text)' }}>{pathway === 'PHYSICAL' ? `€${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}` : `€${Math.round(Math.abs(counterparty.compliance_balance_2025_tco2e) * 435).toLocaleString()}`}</strong></div>
              <div>• Total Net Client Savings: <strong style={{ color: 'var(--color-status-pos-text)' }}>€{effectiveClientSavingsEur.toLocaleString()}</strong></div>
              <div>• Desk Structuring Margin: <strong style={{ color: 'var(--color-accent)' }}>€{effectiveDeskMarginEur.toLocaleString()}</strong></div>
            </div>
          </div>

          {/* Section 4 */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-subtier)',
              padding: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                marginBottom: '10px',
                borderBottom: '1px solid var(--color-divider)',
                fontWeight: 700,
                fontSize: '12.5px',
                color: 'var(--color-text)',
              }}
            >
              <span>4. STATUTORY VERIFICATION &amp; GOVERNING JURISDICTION</span>
              <span style={{ fontSize: '10px', color: 'var(--color-muted)', fontWeight: 600 }}>LEGAL VALIDATION</span>
            </div>
            <div className="text-xs space-y-1.5" style={{ color: 'var(--color-muted)' }}>
              <div>• Certification: <span style={{ color: 'var(--color-text)' }}>ISCC EU / REDcert-EU Mass Balance under RED III (Directive (EU) 2018/2001)</span></div>
              <div>• EU ETS Zero-Rating: <span style={{ color: 'var(--color-text)' }}>Verified under Regulation (EU) 2015/757 &amp; Directive (EU) 2023/959</span></div>
              <div>• Governing Contract: <span style={{ color: 'var(--color-text)' }}>Standard BIMCO Bunker Terms 2020 / EFET Marine Decarbonisation Annex</span></div>
              <div>• Jurisdiction: <span style={{ color: 'var(--color-text)' }}>Rotterdam, The Netherlands (POB / Rotterdam District Court Arbitration)</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Dock Navigation Bar */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
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
          <span>Back: Pricing</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onReset}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={12} />
            <span>Return to Directory</span>
          </button>

          <button
            type="button"
            onClick={handleExecuteTrade}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Source physical biomethane on the European gas grid via Trade Builder"
          >
            <ExternalLink size={12} />
            <span>Hedge Upstream Gas ↗</span>
          </button>

          <button
            type="button"
            onClick={handleOpenEmail}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Mail size={13} style={{ color: 'var(--color-accent)' }} />
            <span>Email Proposal</span>
          </button>

          <button
            type="button"
            onClick={handleBookDeal}
            className="btn btn-primary"
            style={{
              height: '32px',
              padding: '0 18px',
              fontSize: '11.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              backgroundColor: isBooked ? 'rgba(16, 185, 129, 0.9)' : undefined,
            }}
          >
            <CheckCircle2 size={13} />
            <span>{isBooked ? 'Deal Confirmed & Booked ✓' : 'Book & Confirm Bunker Deal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
