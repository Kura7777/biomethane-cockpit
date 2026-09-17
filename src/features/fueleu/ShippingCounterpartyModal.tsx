import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShippingCounterparty,
  CALLING_REGIONS,
  TRADE_LANES,
  getStrategyTierBadgeClass,
} from '../../domain/fueleu/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import {
  X,
  Zap,
  Building2,
  Anchor,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  TrendingDown,
  Coins,
  ChevronRight,
  ExternalLink,
  Info,
  MapPin,
  Compass,
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

  if (!counterparty) return null;

  const isSurplus = counterparty.compliance_balance_2025_tco2e > 0;
  const absDeficit = Math.abs(counterparty.compliance_balance_2025_tco2e);

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
    navigator.clipboard.writeText(counterparty.outreachPitch);
    setPitchCopied(true);
    showToast('Commercial Outreach Pitch copied to clipboard!', 'SUCCESS');
    setTimeout(() => setPitchCopied(false), 2500);
  };

  const generateTermSheetText = () => {
    return `================================================================================
INSTITUTIONAL FUELEU MARITIME TERM SHEET (INDICATIVE OTC QUOTE)
REGULATION (EU) 2023/1805 STATUTORY COMPLIANCE FACILITY
================================================================================
DATE: 17 September 2026
STATUTORY COMPLIANCE RANK: #${counterparty.rank}
STRATEGIC TIER: ${counterparty.strategy_tier}
COUNTERPARTY: ${counterparty.parent_name}
HEADQUARTERS: ${counterparty.headquarters}
COMMERCIAL HQ ADDRESS: ${counterparty.hqAddress}
SWITCHBOARD PHONE: ${counterparty.switchboardPhone}
CORPORATE DOMAIN: ${counterparty.contactDomain}
FLEET SEGMENT: ${counterparty.segment} (${counterparty.vessels_in_scope} vessels in EU scope)
KEY EXECUTIVE: ${counterparty.key_executive}
TARGET DEPARTMENT: ${counterparty.targetDepartment}
KEY CONTACT ROLE: ${counterparty.keyContactRole}
CALLING CORRIDOR: ${CALLING_REGIONS[counterparty.callingRegion]?.label || counterparty.callingRegion} (${CALLING_REGIONS[counterparty.callingRegion]?.portsDescription || ''})
PRIMARY TRADE LANE: ${TRADE_LANES[counterparty.tradeLane]?.label || counterparty.tradeLane} (${TRADE_LANES[counterparty.tradeLane]?.corridorDescription || ''})

1. BASELINE FLEET EXPOSURE AUDIT (EU MRV CERTIFIED)
--------------------------------------------------------------------------------
- Annual Fleet Fuel Burn (EU Scope):
    * VLSFO: ${counterparty.vlsfo_tonnes.toLocaleString()} tonnes
    * MGO / MDO: ${counterparty.mgo_tonnes.toLocaleString()} tonnes
    * LNG: ${counterparty.lng_tonnes.toLocaleString()} tonnes
- Fleet Energy Consumption: ${(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh (${(counterparty.total_energy_mwh * 3600 / 1000000).toLocaleString()} MJ)
- Actual Achieved GHG Intensity: ${counterparty.actual_ghgie.toFixed(2)} gCO2e/MJ
- 2025 FuelEU Target (2% reduction): 89.34 gCO2e/MJ
- Statutory Compliance Balance 2025: ${counterparty.compliance_balance_2025_tco2e > 0 ? '+' : ''}${counterparty.compliance_balance_2025_tco2e.toLocaleString()} tCO2e
- Statutory Penalty Exposure (Year 1): €${counterparty.penalty_2025_y1_eur.toLocaleString()}
- Statutory Penalty Exposure (Year 2 with 10% multiplier): €${counterparty.penalty_2025_y2_eur.toLocaleString()}
- Statutory Compliance Balance 2030 (6% reduction): ${counterparty.compliance_balance_2030_tco2e > 0 ? '+' : ''}${counterparty.compliance_balance_2030_tco2e.toLocaleString()} tCO2e
- Statutory Penalty Exposure 2030 (Year 1): €${counterparty.penalty_2030_y1_eur.toLocaleString()}

2. REQUISITE BIO-LNG SUPPLY SCHEDULING (DEFICIT NEUTRALISATION)
--------------------------------------------------------------------------------
- Manure Bio-LNG (CI = -100 gCO2e/MJ):
    * Requisite Volume: ${counterparty.bio_lng_required_neg100_t.toLocaleString()} tonnes (${counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)
- Zero-CI Bio-LNG (CI = 0.00 gCO2e/MJ):
    * Requisite Volume: ${counterparty.bio_lng_required_zero_t.toLocaleString()} tonnes
- Primary Bunkering Hubs: ${counterparty.primary_bunkering_hubs}
- Sustainability Certification: ISCC EU / REDcert-EU Mass Balance (RED III Art. 30 & FuelEU Art. 10)

3. DUAL COMMERCIAL COMPLIANCE PATHWAYS & CLIENT VALUE
--------------------------------------------------------------------------------
PATHWAY A: PHYSICAL BIO-LNG BUNKERING (ARTICLE 20)
  * Statutory Penalty Avoided: €${counterparty.penalty_2025_y1_eur.toLocaleString()}
  * Client Net Savings: €${counterparty.client_savings_physical_eur.toLocaleString()}
  * Desk Trading Margin: €${counterparty.desk_margin_physical_eur.toLocaleString()}

PATHWAY B: ARTICLE 21 COMPLIANCE POOLING MECHANISM
  * ${isSurplus ? 'Pool Role: OVER-COMPLIANT SURPLUS PROVIDER' : 'Pool Role: DEFICIT FLEET POOL BUYER'}
  * Client Net Benefit: €${counterparty.client_savings_pooling_eur.toLocaleString()}
  * Desk Pool Management Margin: €${counterparty.desk_margin_pooling_eur.toLocaleString()}

4. COMMERCIAL OUTREACH DIRECTIVE & TRADER PITCH
--------------------------------------------------------------------------------
"${counterparty.outreachPitch}"

5. GOVERNING LAW & JURISDICTION
--------------------------------------------------------------------------------
- Standard BIMCO / EFET Maritime Decarbonization Annex
- Jurisdiction: The Netherlands (Rotterdam District Court / POB Arbitration)
================================================================================`;
  };

  const handleCopyTermSheet = () => {
    navigator.clipboard.writeText(generateTermSheetText());
    setCopied(true);
    showToast('Commercial Term Sheet copied to clipboard!', 'SUCCESS');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="scrim" style={{ alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div 
        className="panel"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className={`chip ${getStrategyTierBadgeClass(counterparty.strategy_tier)}`}
                  style={{ fontSize: '10px', fontWeight: 700 }}
                >
                  Rank #{counterparty.rank}
                </span>
                <h3 className="ptitle" style={{ fontSize: '16px', margin: 0 }}>{counterparty.parent_name}</h3>
                <span className={`chip ${isSurplus ? 'chip-pos' : 'chip-neg'}`} style={{ fontSize: '10px' }}>
                  {isSurplus ? 'Surplus LNG Fleet' : 'Deficit Fleet Carrier'}
                </span>
                <span className="chip" style={{ fontSize: '10px' }}>
                  {counterparty.segment}
                </span>
              </div>
              <div className="subttl" style={{ marginTop: '1px' }}>
                {counterparty.headquarters} · {counterparty.vessels_in_scope} vessels in EU MRV scope
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
          {/* Strategy & Executive Summary Banner */}
          <div
            style={{
              padding: '12px 14px',
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-panel-header)',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <span className="eyebrow" style={{ display: 'block', marginBottom: '2px' }}>Commercial Strategy Tier</span>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>{counterparty.strategy_tier}</div>
              <div className="subttl" style={{ marginTop: '2px' }}>
                <strong>Key Contact:</strong> {counterparty.key_executive}
              </div>
            </div>
            <div>
              <span className="eyebrow" style={{ display: 'block', marginBottom: '2px' }}>Primary Bunkering Ports</span>
              <div className="num" style={{ fontSize: '12px', color: 'var(--color-text)' }}>{counterparty.primary_bunkering_hubs}</div>
            </div>
          </div>

          {/* Commercial Outreach & Route Dossier Section */}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="eyebrow" style={{ fontWeight: 700, fontSize: '11px', color: 'var(--color-accent)' }}>
                  Commercial Outreach &amp; Route Dossier
                </span>
                <span className="chip chip-info" style={{ fontSize: '10px' }} title={CALLING_REGIONS[counterparty.callingRegion]?.portsDescription}>
                  📍 {CALLING_REGIONS[counterparty.callingRegion]?.label || counterparty.callingRegion}
                </span>
                <span className="chip" style={{ fontSize: '10px' }} title={TRADE_LANES[counterparty.tradeLane]?.corridorDescription}>
                  🧭 {TRADE_LANES[counterparty.tradeLane]?.label || counterparty.tradeLane}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="subttl" style={{ fontSize: '11px' }}>Domain:</span>
                <a
                  href={`https://${counterparty.contactDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-accent)', fontSize: '11px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                >
                  {counterparty.contactDomain} <ExternalLink size={10} />
                </a>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px',
                padding: '8px 10px',
                backgroundColor: 'var(--color-panel-header)',
                border: '1px solid var(--color-divider)',
                fontSize: '11.5px',
              }}
            >
              <div>
                <span className="mut" style={{ display: 'block', fontSize: '10.5px' }}>Target Department:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{counterparty.targetDepartment}</span>
              </div>
              <div>
                <span className="mut" style={{ display: 'block', fontSize: '10.5px' }}>Key Contact Role:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{counterparty.keyContactRole}</span>
              </div>
              <div>
                <span className="mut" style={{ display: 'block', fontSize: '10.5px' }}>Commercial HQ Address:</span>
                <span style={{ color: 'var(--color-text)' }}>{counterparty.hqAddress}</span>
              </div>
              <div>
                <span className="mut" style={{ display: 'block', fontSize: '10.5px' }}>Switchboard Telephone:</span>
                <a href={`tel:${counterparty.switchboardPhone}`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 600 }}>
                  {counterparty.switchboardPhone}
                </a>
              </div>
            </div>

            {/* Tailored Commercial Outreach Pitch Box */}
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(234, 88, 12, 0.04)',
                border: '1px solid rgba(234, 88, 12, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-accent)' }}>
                  Tailored Commercial Outreach Pitch (Sales Trader Script)
                </span>
                <button
                  type="button"
                  onClick={handleCopyPitch}
                  className="btn btn-secondary"
                  style={{ fontSize: '10.5px', height: '24px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {pitchCopied ? <Check size={11} style={{ color: 'var(--color-status-pos-text)' }} /> : <Copy size={11} />}
                  {pitchCopied ? 'Pitch Copied!' : 'Copy Pitch'}
                </button>
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--color-text)' }}>
                "{counterparty.outreachPitch}"
              </div>
            </div>
          </div>

          {/* 4-Cell Invariant Numbers */}
          <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', border: '1px solid var(--color-divider)' }}>
            <div>
              <span className="eyebrow">Fleet EU Energy</span>
              <div className="big num" style={{ fontSize: '20px' }}>{(counterparty.total_energy_mwh / 1000).toFixed(1)} GWh</div>
              <div className="subttl num">{(counterparty.vlsfo_tonnes + counterparty.mgo_tonnes + counterparty.lng_tonnes).toLocaleString()} tonnes fuel</div>
            </div>

            <div>
              <span className="eyebrow">Actual GHG Intensity</span>
              <div className="big num" style={{ fontSize: '20px', color: counterparty.actual_ghgie <= 89.34 ? 'var(--color-status-pos-text)' : 'var(--color-status-warn-text)' }}>
                {counterparty.actual_ghgie.toFixed(2)}
              </div>
              <div className="subttl num">vs 89.34 g/MJ target</div>
            </div>

            <div>
              <span className="eyebrow">2025 Balance</span>
              <div className="big num" style={{ fontSize: '20px', color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                {counterparty.compliance_balance_2025_tco2e > 0 ? '+' : ''}{(counterparty.compliance_balance_2025_tco2e / 1000).toFixed(1)} kt
              </div>
              <div className="subttl num">2030: {counterparty.compliance_balance_2030_tco2e > 0 ? '+' : ''}{(counterparty.compliance_balance_2030_tco2e / 1000).toFixed(1)} kt</div>
            </div>

            <div>
              <span className="eyebrow">Statutory Penalty</span>
              <div className="big num" style={{ fontSize: '20px', color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                {isSurplus ? '€0' : `€${(counterparty.penalty_2025_y1_eur / 1000000).toFixed(2)}M`}
              </div>
              <div className="subttl num">Yr 2: €{(counterparty.penalty_2025_y2_eur / 1000000).toFixed(2)}M</div>
            </div>
          </div>

          {/* Sourcing & Commercial Pathways Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {/* Pathway 1: Physical Bio-LNG */}
            <div
              style={{
                border: '1px solid var(--color-divider)',
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
                    <Zap size={14} style={{ color: 'var(--color-accent)' }} /> Pathway 1: Physical Bio-LNG Bunkering
                  </span>
                  <span className="chip chip-info">Article 20</span>
                </div>
                <div className="subttl" style={{ marginBottom: '10px' }}>
                  Blend Danish/Dutch manure bio-LNG (CI = -100 g/MJ) via virtual pipeline &amp; Gate Terminal into dual-fuel tonnage.
                </div>

                <div style={{ border: '1px solid var(--color-divider)', padding: '10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Bio-LNG Needed (CI -100):</span>
                    <span className="num" style={{ fontWeight: 600 }}>{counterparty.bio_lng_required_neg100_t.toLocaleString()} t ({counterparty.bio_lng_required_neg100_mwh.toLocaleString()} MWh)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Zero-CI Bio-LNG Needed:</span>
                    <span className="num">{counterparty.bio_lng_required_zero_t.toLocaleString()} t</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-divider)' }}>
                    <span style={{ color: 'var(--color-status-pos-text)', fontWeight: 600 }}>Client Net Savings:</span>
                    <span className="num" style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>€{(counterparty.client_savings_physical_eur / 1000000).toFixed(2)}M</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Desk Trading Margin:</span>
                    <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>€{(counterparty.desk_margin_physical_eur / 1000000).toFixed(2)}M</span>
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
                  <Zap size={13} /> Structure Bio-LNG Deal in Trade Builder
                </button>
              )}
            </div>

            {/* Pathway 2: Article 21 Pooling */}
            <div
              style={{
                border: '1px solid var(--color-divider)',
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
                    <ShieldCheck size={14} style={{ color: 'var(--color-status-pos-text)' }} /> Pathway 2: Article 21 Pooling
                  </span>
                  <span className="chip chip-pos">Article 21</span>
                </div>
                <div className="subttl" style={{ marginBottom: '10px' }}>
                  {isSurplus 
                    ? 'Monetise surplus compliance balance by transferring positive balance into the Desk compliance pool.' 
                    : 'Clear deficit via bilateral compliance pooling without requiring physical engine modifications or bunkering.'}
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
                    <span className="num" style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>€{(counterparty.client_savings_pooling_eur / 1000000).toFixed(2)}M</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Desk Pool Arrangement Margin:</span>
                    <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>€{(counterparty.desk_margin_pooling_eur / 1000000).toFixed(2)}M</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyTermSheet}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px', fontSize: '12px', height: '32px' }}
              >
                {copied ? <Check size={13} style={{ color: 'var(--color-status-pos-text)' }} /> : <Copy size={13} />}
                {copied ? 'Term Sheet Copied!' : 'Copy Indicative Pool Term Sheet'}
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
          }}
        >
          <span className="subttl" style={{ fontSize: '11px' }}>
            Regulation (EU) 2023/1805 Statutory Database · Verified EU MRV Census
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyTermSheet}
              className="btn btn-secondary"
              style={{ fontSize: '11px', height: '30px', padding: '0 10px' }}
            >
              <FileText size={12} style={{ marginRight: '4px' }} /> Copy Term Sheet
            </button>
            {!isSurplus && (
              <button
                type="button"
                onClick={handleLoadDeal}
                className="btn btn-primary"
                style={{ fontSize: '11px', height: '30px', padding: '0 10px' }}
              >
                <Zap size={12} style={{ marginRight: '4px' }} /> Trade Builder
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
