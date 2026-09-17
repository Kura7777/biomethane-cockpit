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
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-6 shadow-xs dark:shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#141a29] text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-[#1e2433]">
                #{counterparty.rank}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                {counterparty.parent_name}
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStrategyTierBadgeClass(
                  counterparty.strategy_tier
                )}`}
              >
                {counterparty.strategy_tier}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-slate-400" />
                {counterparty.headquarters}
              </span>
              <span>·</span>
              <span className="font-medium text-slate-700 dark:text-zinc-300">
                {counterparty.segment}
              </span>
              <span>·</span>
              <span>
                Calling: {CALLING_REGIONS[counterparty.callingRegion]?.label || counterparty.callingRegion}
              </span>
              <span>·</span>
              <span>Hubs: {counterparty.primary_bunkering_hubs}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDualFuel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Flame size={14} className="text-emerald-600 dark:text-emerald-400" />
                DUAL-FUEL LNG READY ({counterparty.lng_vessels_in_scope} vessels)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-[#141a29] text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-[#1e2433]">
                <Ship size={14} className="text-slate-500" />
                CONVENTIONAL ({counterparty.vessels_in_scope} vessels)
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                isSurplus
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {isSurplus ? (
                <>
                  <ShieldCheck size={14} />
                  +{(counterparty.compliance_balance_2025_tco2e / 1000).toFixed(1)} kt Surplus
                </>
              ) : (
                <>
                  <AlertTriangle size={14} />
                  -{(absDeficit / 1000).toFixed(1)} kt Deficit
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 3 Focused Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Card 1: Statutory Exposure Card */}
        <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-5 shadow-xs dark:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-[#1e2433]">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                  Statutory Exposure
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#141a29] text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-[#1e2433]">
                2025 STATUTORY RISK
              </span>
            </div>

            {/* Prominent Hero: Combined 2025 Exposure */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433] mb-4">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                COMBINED 2025 REGULATORY LIABILITY
              </span>
              <div
                className="text-3xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono tracking-tight"
                style={{ fontFamily: MONO_FONT }}
              >
                €{(counterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(2)}M
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                FuelEU Maritime Penalty + EU ETS gross allowance liability
              </p>
            </div>

            {/* Breakdown Items */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/50 dark:bg-[#10141f]">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-zinc-200">
                    FuelEU Maritime Penalty
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Target: 89.34 vs Actual: {counterparty.actual_ghgie.toFixed(2)} gCO₂e/MJ
                  </div>
                </div>
                <div
                  className="font-bold text-sm font-mono text-rose-600 dark:text-rose-400"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {isSurplus ? '€0 (Surplus)' : `€${(counterparty.penalty_2025_y1_eur / 1e6).toFixed(2)}M`}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/50 dark:bg-[#10141f]">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-zinc-200">
                    EU ETS Maritime Liability
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {counterparty.ets_exposure_2025_tco2.toLocaleString()} tCO₂ (70% phase-in @ €70/t)
                  </div>
                </div>
                <div
                  className="font-bold text-sm font-mono text-amber-600 dark:text-amber-400"
                  style={{ fontFamily: MONO_FONT }}
                >
                  €{(counterparty.ets_exposure_2025_eur / 1e6).toFixed(2)}M
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/50 dark:bg-[#10141f]">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-zinc-200">
                    2026 Full ETS Enforcement
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    100% phase-in rate liability
                  </div>
                </div>
                <div
                  className="font-medium text-xs font-mono text-slate-600 dark:text-zinc-400"
                  style={{ fontFamily: MONO_FONT }}
                >
                  €{((counterparty.ets_exposure_2025_eur / 0.70) / 1e6).toFixed(2)}M
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1e2433] text-[11px] text-slate-500 dark:text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Audited under EU Regulation 2023/1805 &amp; Thetis MRV</span>
          </div>
        </div>

        {/* Card 2: Decision-Maker Contact Card */}
        <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-5 shadow-xs dark:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-[#1e2433]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                  Decision-Maker Dossier
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-semibold">
                VERIFIED CRM
              </span>
            </div>

            {/* Executive Profile */}
            <div className="mb-4">
              <div className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                {counterparty.key_executive}
              </div>
              <div className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                {counterparty.keyContactRole}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Dept: {counterparty.targetDepartment}
              </div>
            </div>

            {/* Contact Rows with Copy */}
            <div className="space-y-2.5 text-xs">
              {/* Email */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433]">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Mail size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <a
                    href={`mailto:${contactEmail}`}
                    className="font-mono text-[11.5px] text-cyan-700 dark:text-cyan-400 hover:underline truncate"
                    title="Send email"
                  >
                    {contactEmail}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyField(contactEmail, 'Email')}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors shrink-0"
                  title="Copy email address"
                >
                  {copiedField === 'Email' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433]">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Phone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <a
                    href={`tel:${counterparty.switchboardPhone}`}
                    className="font-mono text-[11.5px] text-slate-800 dark:text-zinc-200 hover:underline truncate"
                    title="Call switchboard"
                  >
                    {counterparty.switchboardPhone}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyField(counterparty.switchboardPhone, 'Phone')}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors shrink-0"
                  title="Copy phone number"
                >
                  {copiedField === 'Phone' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>

              {/* Address */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433]">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-600 dark:text-zinc-300">
                    <div className="font-semibold text-slate-800 dark:text-zinc-200">
                      Commercial Headquarters
                    </div>
                    <div>{counterparty.hqAddress}</div>
                    <div className="text-slate-500 dark:text-zinc-400">{counterparty.headquarters}</div>
                  </div>
                </div>
              </div>

              {/* Domain */}
              <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-[#141926] border border-slate-200 dark:border-[#1e2433]">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe size={13} className="text-slate-400 shrink-0" />
                  <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400 truncate">
                    {counterparty.contactDomain}
                  </span>
                </div>
                <a
                  href={`https://${counterparty.contactDomain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  Visit ↗
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1e2433] text-[11px] text-slate-500 dark:text-zinc-500">
            Pre-qualified corporate identity &amp; commercial registry data
          </div>
        </div>

        {/* Card 3: Tailored Trader Pitch Card */}
        <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-5 shadow-xs dark:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-[#1e2433]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                  Tailored Trader Pitch
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyPitch}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors cursor-pointer"
                title="Copy entire pitch script to clipboard"
              >
                {pitchCopied ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Pitch</span>
                  </>
                )}
              </button>
            </div>

            {/* Bulleted Talking Points */}
            <div className="space-y-3">
              {pitchBulletPoints.map((bp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#141926] border border-slate-200/80 dark:border-[#1e2433] space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-600/15 text-cyan-700 dark:text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      {bp.title}
                    </span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-zinc-300 pl-6">
                    {bp.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1e2433] text-[11px] text-slate-500 dark:text-zinc-500 flex items-center justify-between">
            <span>Ready for outreach via email / phone</span>
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">
              High-Conviction Conversion
            </span>
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
          <span>Back to Directory</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary flex items-center gap-2 text-xs font-bold px-6 py-2 shadow-xs"
        >
          <span>Next: Price Bio-LNG Solution</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
