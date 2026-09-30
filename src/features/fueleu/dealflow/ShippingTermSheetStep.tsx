import { FUELEU_ACTIVE_PERIOD } from '../../../domain/fueleu/calculator';
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
import { getAssumption, fuelEuPoolBidPriceEurPerTco2e } from '../../../domain/assumptions/registry';

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

  const isSurplus = counterparty.compliance_balance_2026_tco2e > 0;
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
      targetYear: FUELEU_ACTIVE_PERIOD,
    });
  }, [ttfGasIndex, liquefactionFee, greenPremium, euaPrice, vlsfoPrice, counterparty.bio_lng_required_neg100_t]);

  const dealRef = useMemo(() => {
    const region = counterparty.callingRegion || 'EUR';
    const dateStr = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
    return `OTC-FEU-${region}-${dateStr}-${String(counterparty.rank).padStart(4, '0')}`;
  }, [counterparty]);

  // Only a contact on file is rendered — never construct an email/phone/domain from other fields.
  const primaryContact = counterparty.contacts?.[0];
  const contactEmail = primaryContact?.email || 'No verified contact on file';

  const poolClearingPriceEurPerTco2e = isSurplus
    ? fuelEuPoolBidPriceEurPerTco2e()
    : getAssumption('fueleu.poolBuyPriceEurPerTco2e');

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
OTC MARINE BIO-LNG TERM SHEET & DEAL NOTE (INDICATIVE — SUBJECT TO CONTRACT)
REGULATION (EU) 2023/1805 (FUELEU) & DIRECTIVE (EU) 2023/959 (EU ETS)
================================================================================
DEAL REFERENCE: ${dealRef}
DATE: ${new Date().toISOString().split('T')[0]}
PORTFOLIO COMPLIANCE RANK: #${counterparty.rank}
STRATEGIC TIER: ${counterparty.strategy_tier}
COUNTERPARTY: ${counterparty.parent_name}
HEADQUARTERS: ${counterparty.headquarters || '—'}
COMMERCIAL ADDRESS: ${counterparty.hqAddress || '—'}
KEY EXECUTIVE: ${primaryContact?.name || counterparty.key_executive || 'No verified contact on file'} (${primaryContact?.role || counterparty.keyContactRole || '—'})
TARGET DEPARTMENT: ${counterparty.targetDepartment || '—'}
COMMERCIAL EMAIL: ${contactEmail}
SWITCHBOARD PHONE: ${primaryContact?.phone || counterparty.switchboardPhone || 'No verified contact on file'}
FLEET SEGMENT: ${counterparty.segment} (${counterparty.vessels_in_scope} vessels in EU MRV scope)
PROPULSION PROFILE: ${
      isDualFuel
        ? `DUAL-FUEL CRYOGENIC LNG READY (${counterparty.lng_vessels_in_scope} LNG vessels / ${counterparty.conventional_vessels_in_scope} conventional)`
        : `CONVENTIONAL PROPULSION ONLY (${counterparty.conventional_vessels_in_scope} 2-stroke diesel vessels)`
    }
PRIMARY BUNKERING HUBS: ${counterparty.primary_bunkering_hubs || '—'}
CALLING CORRIDOR: ${(counterparty.callingRegion && CALLING_REGIONS[counterparty.callingRegion]?.label) || counterparty.callingRegion || 'EUR'}
TRADE LANE: ${(counterparty.tradeLane && TRADE_LANES[counterparty.tradeLane]?.label) || counterparty.tradeLane || 'GLOBAL_CONTAINER'}

1. BASELINE FLEET EXPOSURE (SOURCE: EU MRV 2024, THETIS-MRV PUBLIC REPORT; FUEL SPLIT ESTIMATED)
--------------------------------------------------------------------------------
- Fleet Energy Consumption in EU Scope: ${(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh
- Fleet Fuel Burn: ${counterparty.vlsfo_tonnes.toLocaleString()}t VLSFO / ${counterparty.mgo_tonnes.toLocaleString()}t MGO / ${counterparty.lng_tonnes.toLocaleString()}t LNG
- Actual Achieved GHG Intensity: ${counterparty.actual_ghgie.toFixed(2)} gCO2e/MJ
- ${FUELEU_ACTIVE_PERIOD} FuelEU Target (2.00% reduction): 89.34 gCO2e/MJ
- Estimated Compliance Balance ${FUELEU_ACTIVE_PERIOD}: ${counterparty.compliance_balance_2026_tco2e > 0 ? '+' : ''}${counterparty.compliance_balance_2026_tco2e.toLocaleString()} tCO2e
- Indicative FuelEU ${FUELEU_ACTIVE_PERIOD} Penalty (Art. 23(2)): €${counterparty.penalty_2026_y1_eur.toLocaleString()} (if repeated next year, ×1.1 per Art. 23(2): €${counterparty.penalty_2026_y2_eur.toLocaleString()})
- EU ETS ${FUELEU_ACTIVE_PERIOD} Carbon Liability (100% phase-in, CO2 + LNG CH4 @ €${euaPrice.toFixed(2)}/t): €${counterparty.ets_exposure_2026_eur.toLocaleString()} (${counterparty.ets_exposure_2026_tco2.toLocaleString()} tCO2e)
- COMBINED ${FUELEU_ACTIVE_PERIOD} ESTIMATED EXPOSURE: €${counterparty.combined_regulatory_exposure_2026_eur.toLocaleString()}

2. MARINE BUNKER PRICING ENGINE (€/t & $/t) — Indicative estimate, desk assumptions
--------------------------------------------------------------------------------
- Pricing Pathway: ${pathway === 'PHYSICAL' ? 'Bio-LNG bunkering (Art. 4, Annex I-II)' : 'Article 21 Compliance Pooling'}
- TTF Natural Gas Front-Month Index: €${ttfGasIndex.toFixed(2)} / MWh
- Liquefaction & Terminalization Fee: €${liquefactionFee.toFixed(2)} / MWh
- Green Bio-LNG Premium (RED Certified — Directive (EU) 2018/2001, as amended by (EU) 2023/2413): €${greenPremium.toFixed(2)} / MWh
- All-In Delivered Bio-LNG Price: €${marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh
    * Metric Tonne Price (EUR): €${marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne Bio-LNG
    * Metric Tonne Price (USD): $${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne Bio-LNG
- Benchmark Conventional Alternative Compliance Cost:
    * Alternative Compliance Cost (EUR): €${marineQuote.totalConventionalAlternativeCostEur.toFixed(2)} / tonne Bio-LNG eq
    * Alternative Compliance Cost (USD): $${marineQuote.totalConventionalAlternativeCostUsd.toFixed(2)} / tonne Bio-LNG eq
- FuelEU Compliance Surplus (Pooling, Art. 21): ${marineQuote.fuelEuSurplusTco2ePerTonne.toFixed(4)} tCO2e/t x €${marineQuote.fuelEuSurplusPriceEurPerTco2e.toFixed(2)}/tCO2e = €${marineQuote.fuelEuSurplusValueEurPerTonne.toFixed(2)} / tonne Bio-LNG
- Net Client Arbitrage Advantage: ${marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '+' : ''}€${marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)} / tonne (${marineQuote.netSavingsPerTonneBioLngUsd >= 0 ? '+' : ''}$${marineQuote.netSavingsPerTonneBioLngUsd.toFixed(2)} / tonne)

3. STRUCTURED TRANSACTION SCHEDULE
--------------------------------------------------------------------------------
${
  pathway === 'PHYSICAL'
    ? `- Manure Bio-LNG Volume (-100 CI): ${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (${counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)
- Delivery Terms: DES (Delivered Ex-Ship) / TTS (Truck-to-Ship) at ${counterparty.primary_bunkering_hubs || '—'}
- Total Delivered Invoice (EUR): €${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}
- Total Delivered Invoice (USD): $${(marineQuote.totalBioLngInvoiceUsd || 0).toLocaleString()}`
    : `- Article 21 Compliance Allocation: ${Math.abs(counterparty.compliance_balance_2026_tco2e).toLocaleString()} tCO2e (${isSurplus ? 'Surplus Monetisation' : 'Deficit Clearing'})
- Delivery Terms: Bilateral transfer recorded via the FuelEU database (Art. 19, Art. 21)
- Desk Pool Clearing Price (indicative, ${isSurplus ? 'bid' : 'offer'} side): €${poolClearingPriceEurPerTco2e.toFixed(2)} / tCO2e non-dilutive pool clearing
- Total Compliance Allocation Value: €${Math.round(Math.abs(counterparty.compliance_balance_2026_tco2e) * poolClearingPriceEurPerTco2e).toLocaleString()}`
}
- Net Client Statutory Savings: €${effectiveClientSavingsEur.toLocaleString()}

4. STATUTORY VERIFICATION & GOVERNING LAW
--------------------------------------------------------------------------------
- Certification: ISCC EU / REDcert-EU Mass Balance under RED (Directive (EU) 2018/2001, as amended by (EU) 2023/2413)
- EU ETS: sustainable biomass CO2 zero-rated under Directive 2003/87/EC (MRR (EU) 2018/2066) — subject to RED sustainability certification of the supplied fuel
- FuelEU Maritime Compliance: Bio-LNG bunkering (Art. 4, Annex I-II) / Article 21 Pooling
- Governing Contract: BIMCO Bunker Terms 2018 or supplier standard terms (to be agreed)
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
        : `${Math.abs(counterparty.compliance_balance_2026_tco2e).toLocaleString()} tCO2e (Article 21 Compliance Pool)`;

    const summary = `[FUELEU MARITIME OTC DEAL SUMMARY]
Ref: ${dealRef}
Date: ${new Date().toISOString().split('T')[0]}
Counterparty: ${counterparty.parent_name} (#${counterparty.rank})
Fleet: ${counterparty.segment} (${counterparty.vessels_in_scope} vessels)
Pathway: ${pathway === 'PHYSICAL' ? 'Physical Bio-LNG bunkering (Art. 4, Annex I-II)' : 'Article 21 Compliance Pooling'}
Volume: ${volumeSummary}
Delivered Price: €${marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne ($${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne)
Net Client Savings: €${(effectiveClientSavingsEur / 1e6).toFixed(2)}M
Contact: ${primaryContact?.name || counterparty.key_executive || 'No verified contact on file'} (${contactEmail})`.trim();

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
    showToast(`Bunker Deal ${dealRef} saved to desk blotter (internal record — not a trade confirmation).`, 'SUCCESS');
  };

  const handleOpenEmail = () => {
    if (!primaryContact?.email) {
      showToast('No verified contact on file for this counterparty.', 'INFO');
      return;
    }
    const subject = encodeURIComponent(
      `FuelEU Maritime ${FUELEU_ACTIVE_PERIOD} Compliance & Bio-LNG Bunker Proposal — ${counterparty.parent_name} [Ref: ${dealRef}]`
    );
    const volumeSummary =
      pathway === 'PHYSICAL'
        ? `${counterparty.bio_lng_required_neg100_t.toLocaleString()} metric tonnes (-100 gCO2e/MJ Manure Bio-LNG)`
        : `${Math.abs(counterparty.compliance_balance_2026_tco2e).toLocaleString()} tCO2e Compliance Pool`;

    const body = encodeURIComponent(
`Dear ${primaryContact.name},

Please find below our indicative OTC marine fuel quotation (desk assumptions — subject to contract) to address ${counterparty.parent_name}'s ${FUELEU_ACTIVE_PERIOD} FuelEU Maritime estimated exposure:

1. COUNTERPARTY & EXPOSURE PROFILE
- Counterparty: ${counterparty.parent_name} (#${counterparty.rank})
- Fleet in EU MRV Scope: ${counterparty.vessels_in_scope} vessels (${counterparty.segment})
- ${FUELEU_ACTIVE_PERIOD} Estimated Exposure: €${(counterparty.combined_regulatory_exposure_2026_eur / 1e6).toFixed(2)}M (indicative FuelEU penalty + EU ETS 70% liability)
- Primary Bunkering Corridor: ${counterparty.primary_bunkering_hubs || '—'}

2. COMMERCIAL PROPOSAL (${pathway === 'PHYSICAL' ? 'Bio-LNG bunkering (Art. 4, Annex I-II)' : 'Article 21 Compliance Pooling'})
- Product Volume: ${volumeSummary}
- Delivered Bunker Price: €${marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne ($${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne)
- Delivery Terms: ${pathway === 'PHYSICAL' ? `DES / TTS at ${counterparty.primary_bunkering_hubs || '—'}` : 'Transfer recorded via the FuelEU database (Art. 19, Art. 21)'}
- Client Net Financial Savings vs Penalty (estimated): €${(effectiveClientSavingsEur / 1e6).toFixed(2)}M

3. GOVERNING TERMS & CERTIFICATION
- Certification: ISCC EU / REDcert-EU under RED (Directive (EU) 2018/2001, as amended by (EU) 2023/2413)
- Standard Terms: BIMCO Bunker Terms 2018 or supplier standard terms (to be agreed)
- Deal Reference: ${dealRef}

Please let us know if you would like to schedule an execution call or receive the executed term sheet package.

Best regards,
European Biomethane & Marine Fuels Trading Desk`
    );
    window.open(`mailto:${primaryContact.email}?subject=${subject}&body=${body}`, '_blank');
    showToast(`Opening commercial proposal to ${primaryContact.email}`, 'INFO');
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
      complianceYear: FUELEU_ACTIVE_PERIOD,
      contactEmail: primaryContact?.email,
      contactPhone: primaryContact?.phone || counterparty.switchboardPhone,
    });
    navigate(url);
  };

  const handleAuditFuelEuCompliance = () => {
    const volumeMwh = Math.max(
      1000,
      Math.round(counterparty.bio_lng_required_neg100_mwh || 10000)
    );
    window.dispatchEvent(
      new CustomEvent('open-compliance-auditor', {
        detail: {
          originCountry: 'NL',
          destinationMarket: 'MARITIME_FUELEU',
          feedstock: 'manure',
          carbonIntensity: -100,
                                      ghgIntensity: -100,
          annualVolumeMWh: volumeMwh,
                                      volumeMWh: volumeMwh,
          counterparty: counterparty.parent_name,
          initialTab: 'GATE_BREAKDOWN',
          focusedGateIndex: 0,
        }
      })
    );
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
                <span>SAVED TO DESK BLOTTER (INTERNAL — NOT A TRADE CONFIRMATION)</span>
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
            Indicative Marine Bunker Deal Note · Subject to contract · Terms basis to be agreed (e.g. BIMCO Bunker Terms 2018) · Compliance under Regulation (EU) 2023/1805
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
            <span>{isBooked ? 'Saved to blotter ✓' : 'Save to desk blotter'}</span>
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
            title="Download term sheet text file"
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

      {/* Term Sheet Preview Box */}
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
              Deal Note Preview
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
            <span>SUBJECT TO CONTRACT</span>
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
              <span>1. BASELINE FLEET EXPOSURE (SOURCE: EU MRV 2024, THETIS-MRV)</span>
              <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 600 }}>FUEL SPLIT ESTIMATED</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>• Fleet Energy in Scope: <strong style={{ color: 'var(--color-text)' }}>{(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh</strong></div>
              <div>• FuelEU Target: <strong style={{ color: 'var(--color-text)' }}>89.34 gCO2e/MJ</strong> (Actual: {counterparty.actual_ghgie.toFixed(2)})</div>
              <div>• Vessels in Scope: <strong style={{ color: 'var(--color-text)' }}>{counterparty.vessels_in_scope}</strong> ({isDualFuel ? `${counterparty.lng_vessels_in_scope} LNG-ready` : 'Conventional'})</div>
              <div>• {FUELEU_ACTIVE_PERIOD} FuelEU Penalty: <strong style={{ color: 'var(--color-status-neg-text)' }}>€{(counterparty.penalty_2026_y1_eur / 1e6).toFixed(2)}M</strong></div>
              <div>• {FUELEU_ACTIVE_PERIOD} EU ETS Liability (100%): <strong style={{ color: 'var(--color-warning)' }}>€{(counterparty.ets_exposure_2026_eur / 1e6).toFixed(2)}M</strong></div>
              <div>• Combined {FUELEU_ACTIVE_PERIOD} Exposure: <strong style={{ color: 'var(--color-status-neg-text)' }}>€{(counterparty.combined_regulatory_exposure_2026_eur / 1e6).toFixed(2)}M</strong></div>
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
              <span>2. MARINE BUNKER PRICING ENGINE</span>
              <span style={{ fontSize: '10px', color: 'var(--color-status-pos-text)', fontWeight: 600 }}>INDICATIVE QUOTE — DESK ASSUMPTIONS</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>• TTF Natural Gas Front-Month: <strong style={{ color: 'var(--color-text)' }}>€{ttfGasIndex.toFixed(2)} / MWh</strong></div>
              <div>• Liquefaction &amp; Terminal Fee: <strong style={{ color: 'var(--color-text)' }}>€{liquefactionFee.toFixed(2)} / MWh</strong></div>
              <div>• RED Green Bio-LNG Premium: <strong style={{ color: 'var(--color-text)' }}>€{greenPremium.toFixed(2)} / MWh</strong></div>
              <div>• All-In Bio-LNG Energy Price: <strong style={{ color: 'var(--color-accent)' }}>€{marineQuote.allInBioLngPriceEurMwh.toFixed(2)} / MWh</strong></div>
              <div>• Delivered Bio-LNG Quote (EUR): <strong style={{ color: 'var(--color-text)', fontSize: '13px' }}>€{marineQuote.allInBioLngPriceEurPerTonne.toLocaleString()} / tonne</strong></div>
              <div>• Delivered Bio-LNG Quote (USD): <strong style={{ color: 'var(--color-text)', fontSize: '13px' }}>${marineQuote.allInBioLngPriceUsdPerTonne.toLocaleString()} / tonne</strong></div>
              <div>• Benchmark Conventional Alternative: <strong style={{ color: 'var(--color-text)' }}>€{marineQuote.totalConventionalAlternativeCostEur.toFixed(2)} / t Bio-LNG eq</strong></div>
              <div>• FuelEU Compliance Surplus: <strong>{marineQuote.fuelEuSurplusTco2ePerTonne.toFixed(4)} tCO₂e/t × €{marineQuote.fuelEuSurplusPriceEurPerTco2e.toFixed(2)} = €{marineQuote.fuelEuSurplusValueEurPerTonne.toFixed(2)} / tonne</strong></div>
              <div>• Net Client Arbitrage Advantage: <strong style={{ color: marineQuote.netSavingsPerTonneBioLngEur >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>{marineQuote.netSavingsPerTonneBioLngEur >= 0 ? '+' : ''}€{marineQuote.netSavingsPerTonneBioLngEur.toFixed(2)} / tonne</strong></div>
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
              <div>• Product Volume: <strong style={{ color: 'var(--color-text)' }}>{pathway === 'PHYSICAL' ? `${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (${counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)` : `${Math.abs(counterparty.compliance_balance_2026_tco2e).toLocaleString()} tCO₂e (Article 21)`}</strong></div>
              <div>• Substrate / Solution: <strong style={{ color: 'var(--color-text)' }}>{pathway === 'PHYSICAL' ? 'Manure (-100 gCO₂e/MJ)' : 'Drop-in Biofuel Compliance Pool'}</strong></div>
              <div>• Delivery Hubs / Registry: <strong style={{ color: 'var(--color-accent)' }}>{counterparty.primary_bunkering_hubs || '—'}</strong> ({pathway === 'PHYSICAL' ? 'DES / TTS' : 'FuelEU database (Art. 19)'})</div>
              <div>• Total Transaction Value: <strong style={{ color: 'var(--color-text)' }}>{pathway === 'PHYSICAL' ? `€${(marineQuote.totalBioLngInvoiceEur || 0).toLocaleString()}` : `€${Math.round(Math.abs(counterparty.compliance_balance_2026_tco2e) * poolClearingPriceEurPerTco2e).toLocaleString()}`}</strong></div>
              <div>• Total Net Client Savings: <strong style={{ color: 'var(--color-status-pos-text)' }}>€{effectiveClientSavingsEur.toLocaleString()}</strong></div>
              <div>• Desk Structuring Margin <span style={{ fontWeight: 400, fontStyle: 'italic', color: 'var(--color-muted)' }}>(Internal — not for client distribution)</span>: <strong style={{ color: 'var(--color-accent)' }}>€{effectiveDeskMarginEur.toLocaleString()}</strong></div>
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
              <div>• Certification: <span style={{ color: 'var(--color-text)' }}>ISCC EU / REDcert-EU Mass Balance under RED (Directive (EU) 2018/2001, as amended by (EU) 2023/2413)</span></div>
              <div>• EU ETS: <span style={{ color: 'var(--color-text)' }}>Sustainable biomass CO2 zero-rated under Directive 2003/87/EC (MRR (EU) 2018/2066) — subject to RED sustainability certification of the supplied fuel</span></div>
              <div>• Governing Contract: <span style={{ color: 'var(--color-text)' }}>BIMCO Bunker Terms 2018 or supplier standard terms (to be agreed)</span></div>
              <div>• Jurisdiction: <span style={{ color: 'var(--color-text)' }}>Rotterdam, The Netherlands (POB / Rotterdam District Court Arbitration)</span></div>
            </div>
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-divider)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleAuditFuelEuCompliance}
                className="btn btn-outline"
                style={{
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  padding: '5px 12px',
                }}
                title="Audit FuelEU Maritime statutory compliance, zero-rating legality, and penalty mitigation"
              >
                <Scale size={13} />
                <span>Audit FuelEU Statutory Compliance &amp; Penalty Mitigation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Dock Navigation Bar */}
      <div
        className="fe-dock fe-dock-multi"
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
            onClick={handleAuditFuelEuCompliance}
            className="btn btn-secondary"
            style={{ height: '32px', padding: '0 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px', borderColor: 'rgba(217, 119, 6, 0.4)', color: '#d97706' }}
            title="Open Statutory Compliance Auditor for FuelEU Maritime"
          >
            <Scale size={12} />
            <span>Audit FuelEU Compliance</span>
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
            <span>{isBooked ? 'Saved to blotter ✓' : 'Save to desk blotter'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
