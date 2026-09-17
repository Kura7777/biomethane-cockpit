import React from 'react';
import { CertificationScheme, ChainOfCustody, DeliveryProfile } from '../../../domain/consignment/types';
import { Market } from '../../../domain/markets/types';
import { BiomethanePlant } from '../../../domain/plants/types';
import { DealParams } from '../../../domain/trade/dealParams';
import { getCountryFeedstockCI } from '../../../domain/consignment/feedstocks';
import { getVtpForMarket } from '../TradeBuilderScreen';
import { ArrowRight, FileText, Lock, Calendar } from 'lucide-react';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export interface OriginOption {
  code: string;
  name: string;
  flag: string;
  isolated: boolean;
  desc: string;
}

export interface FeedstockOption {
  key: string;
  label: string;
  defaultCI: number;
  hint: string;
}

export interface SchemeOption {
  scheme: CertificationScheme;
  label: string;
  hint: string;
}

export interface CustodyOption {
  custody: ChainOfCustody;
  label: string;
  hint: string;
}

interface TradeConsignmentStepProps {
  origin: string;
  setOrigin: (origin: string) => void;
  origins: OriginOption[];
  currentOriginObj: OriginOption;
  feedstockKey: string;
  setFeedstockKey: (key: string) => void;
  feedstocks: FeedstockOption[];
  currentFeedstockObj: FeedstockOption;
  scheme: CertificationScheme;
  setScheme: (scheme: CertificationScheme) => void;
  schemes: SchemeOption[];
  currentSchemeObj: SchemeOption;
  chainOfCustody: ChainOfCustody;
  setChainOfCustody: (coc: ChainOfCustody) => void;
  custodies: CustodyOption[];
  currentCustodyObj: CustodyOption;
  ci: number;
  setCi: (ci: number) => void;
  ciTier: 'conservative' | 'base' | 'optimistic';
  setCiTier: (tier: 'conservative' | 'base' | 'optimistic') => void;
  ghgSavingPct: number;
  volumeMwh: number;
  setVolumeMwh: (vol: number) => void;
  plantTotalMWh: number | null;
  plantCommittedMwh: number;
  availablePlantCapacity: number | null;
  isOversubscribed: boolean;
  plantCommittedPct: number | null;
  complianceYear: number;
  handleComplianceYearChange: (year: number) => void;
  vintagePreset: string;
  handleVintagePreset: (preset: string) => void;
  prodStartDate: string;
  setProdStartDate: (d: string) => void;
  prodEndDate: string;
  setProdEndDate: (d: string) => void;
  deliveryStartDate: string;
  setDeliveryStartDate: (d: string) => void;
  deliveryEndDate: string;
  setDeliveryEndDate: (d: string) => void;
  deliveryProfile: DeliveryProfile;
  setDeliveryProfile: (profile: DeliveryProfile) => void;
  selectedMarket: Market;
  statutorySurrenderDeadline: string;
  deal: Partial<DealParams>;
  linkedPlant: BiomethanePlant | null | undefined;
  onOpenPoS: () => void;
  onNext: () => void;
}

export function TradeConsignmentStep({
  origin,
  setOrigin,
  origins,
  currentOriginObj,
  feedstockKey,
  setFeedstockKey,
  feedstocks,
  currentFeedstockObj,
  scheme,
  setScheme,
  schemes,
  currentSchemeObj,
  chainOfCustody,
  setChainOfCustody,
  custodies,
  currentCustodyObj,
  ci,
  setCi,
  ciTier,
  setCiTier,
  ghgSavingPct,
  volumeMwh,
  setVolumeMwh,
  plantTotalMWh,
  plantCommittedMwh,
  availablePlantCapacity,
  isOversubscribed,
  plantCommittedPct,
  complianceYear,
  handleComplianceYearChange,
  vintagePreset,
  handleVintagePreset,
  prodStartDate,
  setProdStartDate,
  prodEndDate,
  setProdEndDate,
  deliveryStartDate,
  setDeliveryStartDate,
  deliveryEndDate,
  setDeliveryEndDate,
  deliveryProfile,
  setDeliveryProfile,
  selectedMarket,
  statutorySurrenderDeadline,
  deal,
  linkedPlant,
  onOpenPoS,
  onNext,
}: TradeConsignmentStepProps) {
  const monthlyRateMwh = Math.round(volumeMwh / 12);
  const dailyRateMwh = Number((volumeMwh / 365).toFixed(1));

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-5 space-y-4">
      {/* 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* Left Column: Asset Sourcing, PoS & Schedule */}
        <div className="space-y-4">
          
          {/* PoS Certificate Ingestion Card */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12.5px' }}>
                <FileText size={15} style={{ color: 'var(--color-accent)' }} />
                <span>Audited Proof of Sustainability (PoS)</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                Auto-extract audited substrate mix, certified CI, and registration ID from ISCC EU or REDcert-EU
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenPoS}
              className="btn btn-secondary"
              style={{
                height: '32px',
                padding: '0 14px',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent)',
              }}
              data-testid="pos-uploader-btn"
            >
              <span>📄</span>
              <span>Ingest PoS PDF / XML</span>
            </button>
          </div>

          {/* Physical Asset Sourcing Locked Card (if passed) */}
          {(deal.plantName || linkedPlant) && (
            <div
              style={{
                border: '1px solid var(--color-divider)',
                borderLeft: '4px solid var(--color-accent)',
                backgroundColor: 'var(--color-surface)',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{currentOriginObj.flag}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text)' }}>
                    {deal.plantName || linkedPlant?.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--color-status-pos-text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Lock size={10} />
                  <span>AUDITED ASSET LOCKED</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--color-muted)', lineHeight: 1.5 }}>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>Operating Entity:</strong>{' '}
                  {deal.legalEntityName || linkedPlant?.legalEntityName || linkedPlant?.operator || 'Operating Entity'}
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>Grid Injection TSO:</strong>{' '}
                  {deal.networkOperator || linkedPlant?.networkOperator || `${currentOriginObj.name} Gas Grid`}
                </div>
                {(deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh) && (
                  <div>
                    <strong style={{ color: 'var(--color-text)' }}>Facility Capacity:</strong>{' '}
                    {deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh} GWh/y
                  </div>
                )}
                {linkedPlant?.upgradingTechnology && (
                  <div>
                    <strong style={{ color: 'var(--color-text)' }}>Upgrading Technology:</strong>{' '}
                    {linkedPlant.upgradingTechnology}
                  </div>
                )}
                {linkedPlant?.feedstockDetails && (
                  <div className="sm:col-span-2">
                    <strong style={{ color: 'var(--color-text)' }}>Audited Substrates:</strong>{' '}
                    {linkedPlant.feedstockDetails}
                  </div>
                )}
                {(deal.contactEmail || linkedPlant?.contactEmail) && (
                  <div className="sm:col-span-2" style={{ fontFamily: MONO_FONT, fontSize: '11px' }}>
                    <strong style={{ color: 'var(--color-text)' }}>Desk Contact:</strong>{' '}
                    {deal.contactEmail || linkedPlant?.contactEmail}{' '}
                    {deal.contactPhone || linkedPlant?.contactPhone ? `· ${deal.contactPhone || linkedPlant?.contactPhone}` : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Production & Delivery Schedule */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              overflow: 'hidden',
            }}
          >
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
                <Calendar size={13} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Production &amp; Delivery Schedule
                </span>
              </div>
              <span style={{ fontSize: '9.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                EFET BIOMETHANE SCHEDULE
              </span>
            </div>

            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Compliance Year */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Compliance Target Year</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[2025, 2026, 2027].map(yr => (
                    <button
                      key={yr}
                      type="button"
                      className={`chip ${complianceYear === yr ? 'chip-a' : ''}`}
                      style={{ fontSize: '11px', padding: '2px 10px' }}
                      onClick={() => handleComplianceYearChange(yr)}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vintage Presets */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Production Vintage (Gas Grid Injection)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {[
                    { key: 'CAL_YEAR', label: `Cal-${complianceYear}` },
                    { key: 'Q1', label: `Q1-${complianceYear}` },
                    { key: 'Q2', label: `Q2-${complianceYear}` },
                    { key: 'Q3', label: `Q3-${complianceYear}` },
                    { key: 'Q4', label: `Q4-${complianceYear}` },
                    { key: 'PROMPT', label: 'Prompt Month' },
                    { key: 'CUSTOM', label: 'Custom' },
                  ].map(p => (
                    <button
                      key={p.key}
                      type="button"
                      className={`chip ${vintagePreset === p.key ? 'chip-a' : ''}`}
                      style={{ fontSize: '10.5px', padding: '2px 8px' }}
                      onClick={() => handleVintagePreset(p.key)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--color-muted)', display: 'block', marginBottom: '3px' }}>
                    Injection Start Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    style={{ fontSize: '11px', padding: '4px 8px', width: '100%', fontFamily: MONO_FONT }}
                    value={prodStartDate}
                    onChange={e => setProdStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--color-muted)', display: 'block', marginBottom: '3px' }}>
                    Injection End Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    style={{ fontSize: '11px', padding: '4px 8px', width: '100%', fontFamily: MONO_FONT }}
                    value={prodEndDate}
                    onChange={e => setProdEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Delivery Profile */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Delivery Rate Profile</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {(['FLAT_MONTHLY', 'SEASONAL_WINTER', 'PROMPT_SPOT', 'CUSTOM'] as DeliveryProfile[]).map(dp => (
                    <button
                      key={dp}
                      type="button"
                      className={`chip ${deliveryProfile === dp ? 'chip-a' : ''}`}
                      style={{ fontSize: '10.5px', padding: '2px 8px' }}
                      onClick={() => setDeliveryProfile(dp)}
                    >
                      {dp.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Delivery Point & Statutory Deadline Card */}
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-panel-header)',
                  border: '1px solid var(--color-divider)',
                  fontSize: '11px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Grid Delivery Point (VTP):</span>
                  <strong style={{ color: 'var(--color-text)', fontFamily: MONO_FONT }}>
                    {getVtpForMarket(selectedMarket.country)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Registry Surrender Deadline:</span>
                  <strong style={{ color: 'var(--color-accent)', fontFamily: MONO_FONT }}>
                    {statutorySurrenderDeadline}
                  </strong>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  UDB Mass Balance Rule: Certificates must be balanced and surrendered within 12 months of injection month end (RED III Art. 30).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Specification & Volume Allocation */}
        <div className="space-y-4">
          
          {/* Origin Country Selector */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              overflow: 'hidden',
            }}
          >
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
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Origin Country &amp; Grid Injection Zone
              </span>
              <span style={{ fontSize: '10.5px', fontFamily: MONO_FONT, color: 'var(--color-muted)' }}>
                {currentOriginObj.code} · {currentOriginObj.name}
              </span>
            </div>

            <div style={{ padding: '14px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {origins.map(o => (
                  <button
                    key={o.code}
                    type="button"
                    className={`chip ${o.code === origin ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => setOrigin(o.code)}
                  >
                    <span>{o.flag}</span>
                    <span>{o.code}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11.5px', lineHeight: 1.5, margin: '6px 0 0', color: 'var(--color-muted)' }}>
                {currentOriginObj.desc}
              </p>
            </div>
          </div>

          {/* Volume Allocation */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Contract Traded Volume
              </span>
              <span style={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: '16px', color: 'var(--color-accent)' }}>
                {volumeMwh.toLocaleString()} MWh
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="100"
                step="500"
                className="input"
                style={{ fontWeight: 700, fontSize: '14px', flex: 1, fontFamily: MONO_FONT }}
                value={volumeMwh}
                onChange={e => setVolumeMwh(Math.max(0, Number(e.target.value) || 0))}
              />
              <div style={{ display: 'flex', gap: '3px' }}>
                {[5000, 10000, 25000, 50000].map(v => (
                  <button
                    key={v}
                    type="button"
                    className="chip"
                    style={{ fontSize: '10px', padding: '3px 6px', fontFamily: MONO_FONT }}
                    onClick={() => setVolumeMwh(v)}
                  >
                    {(v / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Run-rate breakdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-muted)', marginTop: '8px', fontFamily: MONO_FONT }}>
              <span>Delivery Run-rate:</span>
              <span>~{monthlyRateMwh.toLocaleString()} MWh/mo · {dailyRateMwh.toLocaleString()} MWh/d</span>
            </div>

            {/* Facility capacity bar if linked */}
            {plantTotalMWh !== null && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-divider)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Facility Capacity Utilisation:</span>
                  <span style={{ fontFamily: MONO_FONT, fontWeight: 700, color: isOversubscribed ? 'var(--color-status-neg-text)' : 'var(--color-text)' }}>
                    {plantCommittedPct}% ({volumeMwh.toLocaleString()} / {plantTotalMWh.toLocaleString()} MWh)
                  </span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'var(--color-divider)', position: 'relative' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, plantCommittedPct || 0)}%`,
                      backgroundColor: isOversubscribed ? 'var(--color-status-neg-text)' : 'var(--color-accent)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Feedstock, Certification & Chain of Custody */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Feedstock */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Primary Feedstock Substrate
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {feedstocks.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    className={`chip ${f.key === feedstockKey ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      setFeedstockKey(f.key);
                      const benchmark = getCountryFeedstockCI(origin, f.key, ciTier);
                      setCi(benchmark.ci);
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11.5px', lineHeight: 1.5, margin: '6px 0 0', color: 'var(--color-muted)' }}>
                {currentFeedstockObj.hint}
              </p>
            </div>

            {/* Scheme & Custody row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Certification Scheme
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {schemes.map(s => (
                    <button
                      key={s.scheme}
                      type="button"
                      className={`chip ${s.scheme === scheme ? 'chip-a' : ''}`}
                      style={{ fontSize: '10.5px', padding: '2px 8px' }}
                      onClick={() => setScheme(s.scheme)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  {currentSchemeObj.hint}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Chain of Custody
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {custodies.map(c => (
                    <button
                      key={c.custody}
                      type="button"
                      className={`chip ${c.custody === chainOfCustody ? 'chip-a' : ''}`}
                      style={{ fontSize: '10.5px', padding: '2px 8px' }}
                      onClick={() => setChainOfCustody(c.custody)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  {currentCustodyObj.hint}
                </div>
              </div>
            </div>
          </div>

          {/* Carbon Intensity & Benchmark Slider */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Carbon Intensity (CI)
                </span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {(['conservative', 'base', 'optimistic'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`chip ${ciTier === t ? 'chip-a' : ''}`}
                      style={{ fontSize: '9px', padding: '1px 6px', textTransform: 'capitalize' }}
                      onClick={() => {
                        setCiTier(t);
                        const benchmark = getCountryFeedstockCI(origin, feedstockKey, t);
                        setCi(benchmark.ci);
                      }}
                    >
                      {t.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: '20px', color: 'var(--color-text)' }}>
                  {ci >= 0 ? `+${ci}` : `−${Math.abs(ci)}`}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>gCO₂e/MJ</span>
              </div>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="-150"
              max="50"
              step="1"
              value={ci}
              onChange={e => setCi(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
              aria-label="Adjust carbon intensity"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-muted)', fontFamily: MONO_FONT, marginTop: '2px' }}>
              <span>−150 (Deep negative manure)</span>
              <span>0 (Neutral)</span>
              <span>+50 (Crop)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-divider)' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>GHG Savings vs RED III Comparator:</span>
              <span style={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: '14px', color: ghgSavingPct >= 65 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                {ghgSavingPct}% {ghgSavingPct >= 65 ? '(>= 65% Compliant)' : '(< 65% Non-compliant)'}
              </span>
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
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
          Step 1 of 4 · Consignment &amp; physical asset sourcing
        </div>

        <button
          type="button"
          onClick={onNext}
          className="btn btn-primary"
          style={{ height: '32px', padding: '0 18px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <span>Next: Target Market &amp; 6-Gate Audit</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
