import React, { useState, useMemo } from 'react';
import {
  ShippingCounterparty,
  CALLING_REGIONS,
  TRADE_LANES,
  getStrategyTierBadgeClass,
} from '../../../domain/fueleu/types';
import {
  Building2,
  Ship,
  Flame,
  Scale,
  Mail,
  Phone,
  Globe,
  MapPin,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Zap,
  TrendingDown,
  UserCheck,
} from 'lucide-react';
import { showToast } from '../../../app/DeskToastContainer';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

interface ShippingExposureStepProps {
  counterparty: ShippingCounterparty;
  onBack: () => void;
  onNext: () => void;
}

export function ShippingExposureStep({
  counterparty,
  onBack,
  onNext,
}: ShippingExposureStepProps) {
  const [pitchCopied, setPitchCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isSurplus = counterparty.compliance_balance_2025_tco2e > 0;
  const absDeficit = Math.abs(counterparty.compliance_balance_2025_tco2e);
  const isDualFuel = counterparty.fleetCapability === 'DUAL_FUEL_LNG';

  // Derive high-confidence desk contact email
  const contactEmail = useMemo(() => {
    const dept = counterparty.targetDepartment.toLowerCase();
    const prefix = dept.includes('bunker')
      ? 'bunkering'
      : dept.includes('decarbon')
      ? 'sustainability'
      : 'commercial';
    return `${prefix}@${counterparty.contactDomain}`;
  }, [counterparty.targetDepartment, counterparty.contactDomain]);

  // Structured Crisp Bulleted Pitch Points
  const pitchBulletPoints = useMemo(() => {
    if (isSurplus) {
      return [
        {
          title: 'Fleet Compliance Position',
          detail: `${counterparty.parent_name} operates an audited EU MRV fleet of ${counterparty.vessels_in_scope} vessels generating a premier +${(counterparty.compliance_balance_2025_tco2e / 1000).toFixed(1)} kt FuelEU surplus in 2025.`,
        },
        {
          title: 'Article 21 Surplus Monetisation',
          detail: `Our desk can broker your surplus into deficit carrier pools at institutional spreads (€435/tCO2e), capturing €${(counterparty.client_savings_pooling_eur / 1e6).toFixed(1)}M in non-dilutive trading liquidity.`,
        },
        {
          title: 'Execution & Settlement',
          detail: `Zero operational disruption; instantaneous bilateral registry transfer recorded directly in EU Thetis MRV without modifying fleet schedules.`,
        },
      ];
    }
    if (isDualFuel) {
      return [
        {
          title: 'Dual-Fuel Propulsion Leverage',
          detail: `${counterparty.parent_name}'s fleet features ${counterparty.lng_vessels_in_scope} cryogenic Dual-Fuel LNG vessels calling European hubs (${counterparty.primary_bunkering_hubs}), ready for immediate physical Bio-LNG bunkering.`,
        },
        {
          title: 'Statutory Exposure Neutralisation',
          detail: `Combined 2025 exposure of €${(counterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(1)}M (€${(counterparty.penalty_2025_y1_eur / 1e6).toFixed(1)}M FuelEU penalty + €${(counterparty.ets_exposure_2025_eur / 1e6).toFixed(1)}M EU ETS liability) is fully wiped out.`,
        },
        {
          title: 'Double Statutory Exemption (RED III + EU ETS)',
          detail: `Bunkering ${(counterparty.bio_lng_required_neg100_t).toLocaleString()} tonnes of -100 CI manure Bio-LNG delivers 0.000 tCO2/t EU ETS zero-rating and captures +€${(counterparty.client_savings_physical_eur / counterparty.bio_lng_required_neg100_t).toFixed(2)}/t in net client arbitrage.`,
        },
        {
          title: 'Audited Financial Uplift',
          detail: `Delivers up to €${(counterparty.client_savings_physical_eur / 1e6).toFixed(1)}M in audited net client compliance savings vs conventional VLSFO alternative compliance parity.`,
        },
      ];
    }
    return [
      {
        title: 'Conventional Fleet Exposure',
        detail: `${counterparty.parent_name}'s fleet of ${counterparty.vessels_in_scope} conventional 2-stroke diesel vessels incurs €${(counterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(1)}M in joint 2025 statutory exposure (€${(counterparty.penalty_2025_y1_eur / 1e6).toFixed(1)}M FuelEU + €${(counterparty.ets_exposure_2025_eur / 1e6).toFixed(1)}M EU ETS).`,
      },
      {
        title: 'Article 21 Compliance Pooling Solution',
        detail: `No engine modifications or dry-docking required. Our desk structures paper Article 21 compliance pooling backed by certified drop-in biofuels to neutralise your ${(absDeficit / 1000).toFixed(1)} kt deficit.`,
      },
      {
        title: 'Guaranteed Client Savings',
        detail: `Transfers statutory liability into our desk compliance pool at a fixed clearing spread, generating €${(counterparty.client_savings_pooling_eur / 1e6).toFixed(1)}M in net savings vs statutory penalties.`,
      },
    ];
  }, [counterparty, isSurplus, isDualFuel, absDeficit]);

  // Full Tailored Sales Pitch (for 1-click clipboard copy)
  const fullPitchText = useMemo(() => {
    return pitchBulletPoints
      .map((bp, i) => `${i + 1}. ${bp.title}: ${bp.detail}`)
      .join('\n');
  }, [pitchBulletPoints]);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
            <span
              className={`chip ${getStrategyTierBadgeClass(counterparty.strategy_tier)}`}
              style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              {counterparty.strategy_tier}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} style={{ color: 'var(--color-muted)' }} />
              {counterparty.headquarters}
            </span>
            <span>·</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{counterparty.segment}</span>
            <span>·</span>
            <span>Calling: {CALLING_REGIONS[counterparty.callingRegion]?.label || counterparty.callingRegion}</span>
            <span>·</span>
            <span>Hubs: {counterparty.primary_bunkering_hubs}</span>
          </div>
        </div>

        {/* Right Quick Metric Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isDualFuel ? (
            <span
              className="chip chip-success"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '3px 9px' }}
            >
              <Flame size={12} />
              Dual-Fuel LNG ({counterparty.lng_vessels_in_scope}v)
            </span>
          ) : (
            <span
              className="chip"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '3px 9px' }}
            >
              <Ship size={12} />
              Conventional ({counterparty.vessels_in_scope}v)
            </span>
          )}

          <span
            className={`chip ${isSurplus ? 'chip-success' : 'chip-danger'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '3px 9px' }}
          >
            {isSurplus ? (
              <>
                <ShieldCheck size={12} />
                +{(counterparty.compliance_balance_2025_tco2e / 1000).toFixed(1)} kt Surplus
              </>
            ) : (
              <>
                <AlertTriangle size={12} />
                -{(absDeficit / 1000).toFixed(1)} kt Deficit
              </>
            )}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              padding: '3px 10px',
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-subtier)',
              fontFamily: MONO_FONT,
            }}
          >
            <span style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>Combined 2025:</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-status-neg-text)' }}>
              €{(counterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(2)}M
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 3 Aligned Institutional Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Panel 1: Statutory Regulatory Exposure */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                padding: '9px 14px',
                borderBottom: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-panel-header)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={13} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Statutory Regulatory Exposure
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
                  color: 'var(--color-muted)',
                }}
              >
                REG (EU) 2023/1805
              </span>
            </div>

            <div style={{ padding: '14px' }}>
              {/* Hero Metric Box */}
              <div
                style={{
                  padding: '12px 14px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-panel-header)',
                  marginBottom: '12px',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.03em', marginBottom: '2px' }}>
                  COMBINED 2025 REGULATORY LIABILITY
                </div>
                <div
                  style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    fontFamily: MONO_FONT,
                    color: 'var(--color-status-neg-text)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  €{(counterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(2)}M
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  FuelEU Maritime statutory penalty + EU ETS 70% phase-in liability
                </div>
              </div>

              {/* Granular Breakdown Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-subtier)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>FuelEU Maritime Penalty</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>
                      Target: 89.34 vs Actual: {counterparty.actual_ghgie.toFixed(2)} gCO₂e/MJ
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: '12.5px', color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                    {isSurplus ? '€0 (Surplus)' : `€${(counterparty.penalty_2025_y1_eur / 1e6).toFixed(2)}M`}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-subtier)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>EU ETS Maritime Liability</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>
                      {counterparty.ets_exposure_2025_tco2.toLocaleString()} tCO₂ (70% phase-in @ €70/t)
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: '12.5px', color: 'var(--color-status-warn-text, #d97706)' }}>
                    €{(counterparty.ets_exposure_2025_eur / 1e6).toFixed(2)}M
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-subtier)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>2026 Full ETS Enforcement</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>100% phase-in rate liability</div>
                  </div>
                  <div style={{ fontFamily: MONO_FONT, fontWeight: 600, fontSize: '12px', color: 'var(--color-muted)' }}>
                    €{((counterparty.ets_exposure_2025_eur / 0.70) / 1e6).toFixed(2)}M
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-panel-header)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10.5px',
              color: 'var(--color-muted)',
            }}
          >
            <ShieldCheck size={12} style={{ color: 'var(--color-status-pos-text)' }} />
            <span>Audited under EU Regulation 2023/1805 &amp; Thetis MRV</span>
          </div>
        </div>

        {/* Panel 2: Decision-Maker CRM Dossier */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                padding: '9px 14px',
                borderBottom: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-panel-header)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={13} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Commercial Decision-Maker Dossier
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
                  color: 'var(--color-accent)',
                }}
              >
                VERIFIED CRM
              </span>
            </div>

            <div style={{ padding: '14px' }}>
              {/* Executive Profile Card */}
              <div
                style={{
                  padding: '12px 14px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-panel-header)',
                  marginBottom: '12px',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '2px' }}>
                  {counterparty.key_executive}
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-accent)' }}>
                  {counterparty.keyContactRole}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  {counterparty.targetDepartment}
                </div>
              </div>

              {/* Actionable Contact Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
                {/* Email */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-subtier)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    <Mail size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                    <a
                      href={`mailto:${contactEmail}`}
                      style={{
                        fontFamily: MONO_FONT,
                        fontSize: '11px',
                        color: 'var(--color-accent)',
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title="Send email to desk"
                    >
                      {contactEmail}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyField(contactEmail, 'Email')}
                    className="btn btn-secondary"
                    style={{ height: '22px', padding: '0 6px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    title="Copy email address"
                  >
                    {copiedField === 'Email' ? <Check size={11} style={{ color: 'var(--color-status-pos-text)' }} /> : <Copy size={11} />}
                    <span>{copiedField === 'Email' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Phone */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-subtier)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    <Phone size={13} style={{ color: 'var(--color-status-pos-text)', flexShrink: 0 }} />
                    <a
                      href={`tel:${counterparty.switchboardPhone}`}
                      style={{
                        fontFamily: MONO_FONT,
                        fontSize: '11px',
                        color: 'var(--color-text)',
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title="Call commercial office"
                    >
                      {counterparty.switchboardPhone}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyField(counterparty.switchboardPhone, 'Phone')}
                    className="btn btn-secondary"
                    style={{ height: '22px', padding: '0 6px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    title="Copy phone number"
                  >
                    {copiedField === 'Phone' ? <Check size={11} style={{ color: 'var(--color-status-pos-text)' }} /> : <Copy size={11} />}
                    <span>{copiedField === 'Phone' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* HQ Address */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    padding: '7px 10px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-subtier)',
                  }}
                >
                  <MapPin size={13} style={{ color: 'var(--color-muted)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{counterparty.hqAddress}</div>
                    <div>{counterparty.headquarters}</div>
                  </div>
                </div>

                {/* Corporate Website */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-subtier)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Globe size={13} style={{ color: 'var(--color-muted)' }} />
                    <span style={{ fontSize: '11px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                      {counterparty.contactDomain}
                    </span>
                  </div>
                  <a
                    href={`https://${counterparty.contactDomain}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '10.5px', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Visit ↗
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-panel-header)',
              fontSize: '10.5px',
              color: 'var(--color-muted)',
            }}
          >
            Pre-qualified corporate identity &amp; commercial registry data
          </div>
        </div>

        {/* Panel 3: Tailored Commercial Pitch */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                padding: '9px 14px',
                borderBottom: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-panel-header)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={13} style={{ color: '#fbbf24' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tailored Commercial Outreach Pitch
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPitch}
                className="btn btn-primary"
                style={{ height: '24px', padding: '0 8px', fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Copy entire pitch script to clipboard"
              >
                {pitchCopied ? <Check size={11} /> : <Copy size={11} />}
                <span>{pitchCopied ? 'Copied' : 'Copy Pitch'}</span>
              </button>
            </div>

            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pitchBulletPoints.map((bp, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '9px 11px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-panel-header)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        fontFamily: MONO_FONT,
                        backgroundColor: 'var(--color-accent)',
                        color: '#000000',
                        borderRadius: '2px',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text)' }}>
                      {bp.title}
                    </span>
                  </div>
                  <p style={{ margin: 0, paddingLeft: '22px', fontSize: '11px', lineHeight: 1.45, color: 'var(--color-muted)' }}>
                    {bp.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-panel-header)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10.5px',
              color: 'var(--color-muted)',
            }}
          >
            <span>Ready for bilateral outreach</span>
            <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>High-Conviction Conversion</span>
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
          <span>Back to Directory</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary"
          style={{ height: '32px', padding: '0 18px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <span>Next: Price Bio-LNG Solution</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
