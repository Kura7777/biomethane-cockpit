import React from 'react';
import { CertificationScheme, ChainOfCustody, DeliveryProfile } from '../../../domain/consignment/types';
import { Market } from '../../../domain/markets/types';
import { BiomethanePlant } from '../../../domain/plants/types';
import { DealParams } from '../../../domain/trade/dealParams';
import { getCountryFeedstockCI } from '../../../domain/consignment/feedstocks';
import { getVtpForMarket } from '../TradeBuilderScreen';
import { FileText, Lock, Calendar } from 'lucide-react';

const MONO_FONT = 'var(--font-mono, "IBM Plex Mono", monospace)';

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
  /** Where the CI came from, for the provenance label: an uploaded PoS, an estimate/default, or neither (manual). */
  ciProvenance: 'pos' | 'estimated' | null;
  onCiSourceChange: (source: 'estimate' | 'manual') => void;
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
  /** PRODUCT: origin, feedstock, certification, CI and PoS ingestion. SCHEDULE: volume and delivery schedule. */
  section: 'PRODUCT' | 'SCHEDULE';
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
  ciProvenance,
  onCiSourceChange,
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
  section,
}: TradeConsignmentStepProps) {
  const monthlyRateMwh = Math.round(volumeMwh / 12);
  const dailyRateMwh = Number((volumeMwh / 365).toFixed(1));

  return (
    <div className="tb-step">
      {section === 'PRODUCT' && (
        <>
          {/* Upstream FuelEU Maritime Physical Gas Hedge Context Banner */}
          {(deal.marketId === 'FUELEU' || (deal.counterparty && deal.feedstock === 'manure')) && (
            <div
              style={{
                border: '1px solid rgba(14, 165, 233, 0.4)',
                backgroundColor: 'rgba(14, 165, 233, 0.08)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    backgroundColor: 'rgba(14, 165, 233, 0.2)',
                    border: '1px solid rgba(14, 165, 233, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                    fontSize: '15px',
                    flexShrink: 0,
                  }}
                >
                  ⚓
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-control)',
                        backgroundColor: 'rgba(14, 165, 233, 0.15)',
                        color: 'var(--color-accent)',
                        border: '1px solid rgba(14, 165, 233, 0.3)',
                      }}
                    >
                      FuelEU Maritime Upstream Sourcing Hedge
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                      Marine Counterparty: {deal.counterparty || 'Maritime Fleet Buyer'}
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      ({volumeMwh.toLocaleString()} MWh physical biomethane requirement)
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '3px' }}>
                    Sourcing pipeline biomethane on the European gas grid via RED III Mass Balance to feed cryogenic Bio-LNG liquefaction at European bunkering terminals.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-status-pos-text)',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-control)',
                    padding: '4px 10px',
                  }}
                >
                  -100 gCO₂e/MJ Manure · 100% RED III Compliant
                </span>
              </div>
            </div>
          )}

          {/* PoS Certificate Ingestion Card */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
                <FileText size={15} style={{ color: 'var(--color-accent)' }} />
                <span>Audited Proof of Sustainability (PoS)</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                Auto-extract audited substrate mix, certified CI, and registration ID from ISCC EU or REDcert-EU
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenPoS}
              className="btn btn-secondary"
              style={{
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent)',
                fontWeight: 600,
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
                borderRadius: 'var(--radius-card)',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{currentOriginObj.flag}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {deal.plantName || linkedPlant?.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-control)',
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
                  <div className="tabular-nums">
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
                  <div className="sm:col-span-2" style={{ fontSize: '12px' }}>
                    <strong style={{ color: 'var(--color-text)' }}>Desk Contact:</strong>{' '}
                    {deal.contactEmail || linkedPlant?.contactEmail}{' '}
                    {deal.contactPhone || linkedPlant?.contactPhone ? `· ${deal.contactPhone || linkedPlant?.contactPhone}` : ''}
                  </div>
                )}
              </div>
            </div>
          )}

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
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                Origin Country &amp; Grid Injection Zone
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
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
                    onClick={() => setOrigin(o.code)}
                  >
                    <span>{o.flag}</span>
                    <span>{o.code}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '6px 0 0', color: 'var(--color-muted)' }}>
                {currentOriginObj.desc}
              </p>

              {(origin === 'GB' || currentOriginObj.isolated) && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 'var(--radius-control)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--color-status-neg-text)', fontWeight: 600 }}>
                    🛑 Non-EU Gas Grid — Physical grid disconnected from EU UDB single mass balance area.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-compliance-auditor', {
                        detail: {
                          originCountry: origin,
                          targetMarketId: selectedMarket?.id || 'DE_THG',
                          feedstockCategory: currentFeedstockObj.label,
                          carbonIntensity: ci,
                          annualVolumeMWh: volumeMwh,
                          initialTab: 'GATE_BREAKDOWN',
                          focusedGateIndex: 1
                        }
                      }));
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '2px 8px', color: 'var(--color-status-neg-text)', borderColor: 'var(--color-status-neg-border)', fontWeight: 600 }}
                  >
                    ⚖ Audit UDB Cross-Border Ingestion
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Feedstock, Certification & Chain of Custody */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Feedstock */}
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                Primary Feedstock Substrate
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {feedstocks.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    className={`chip ${f.key === feedstockKey ? 'chip-a' : ''}`}
                    onClick={() => {
                      setFeedstockKey(f.key);
                      const benchmark = getCountryFeedstockCI(origin, f.key, ciTier);
                      setCi(benchmark.ci);
                      onCiSourceChange('estimate');
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '6px 0 0', color: 'var(--color-muted)' }}>
                {currentFeedstockObj.hint}
              </p>

              {feedstockKey === 'energy_crops' && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: 'var(--radius-control)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--color-status-warn-text)', fontWeight: 600 }}>
                    ⚠ Food/Crop Cap — Energy crops are subject to statutory transport caps under RED III Art. 26.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-compliance-auditor', {
                        detail: {
                          originCountry: origin,
                          targetMarketId: selectedMarket?.id || 'DE_THG',
                          feedstockCategory: 'ENERGY_CROPS',
                          carbonIntensity: ci,
                          annualVolumeMWh: volumeMwh,
                          initialTab: 'GATE_BREAKDOWN',
                          focusedGateIndex: 3
                        }
                      }));
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '2px 8px', color: 'var(--color-status-warn-text)', borderColor: 'var(--color-status-warn-border)', fontWeight: 600 }}
                  >
                    ⚖ Audit Quota Eligibility
                  </button>
                </div>
              )}
            </div>

            {/* Scheme & Custody row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Certification Scheme
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {schemes.map(s => (
                    <button
                      key={s.scheme}
                      type="button"
                      className={`chip ${s.scheme === scheme ? 'chip-a' : ''}`}
                      onClick={() => setScheme(s.scheme)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  {currentSchemeObj.hint}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Chain of Custody
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {custodies.map(c => (
                    <button
                      key={c.custody}
                      type="button"
                      className={`chip ${c.custody === chainOfCustody ? 'chip-a' : ''}`}
                      onClick={() => setChainOfCustody(c.custody)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
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
              borderRadius: 'var(--radius-card)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Carbon Intensity (CI)
                </span>
                {ciProvenance === 'pos' ? (
                  <span className="chip chip-pos" title="CI taken from the uploaded Proof of Sustainability. Check it against the certificate before confirming.">PoS CI</span>
                ) : ciProvenance === 'estimated' ? (
                  <span className="chip chip-warn" title="Feedstock default or benchmark CI, not from an audited PoS. Treat as indicative until the producer's PoS is received.">Estimated CI</span>
                ) : null}
                <div style={{ display: 'flex', gap: '2px' }}>
                  {(['conservative', 'base', 'optimistic'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`chip ${ciTier === t ? 'chip-a' : ''}`}
                      style={{ padding: '1px 6px', textTransform: 'capitalize' }}
                      onClick={() => {
                        setCiTier(t);
                        const benchmark = getCountryFeedstockCI(origin, feedstockKey, t);
                        setCi(benchmark.ci);
                        onCiSourceChange('estimate');
                      }}
                    >
                      {t.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="tabular-nums" style={{ fontWeight: 600, fontSize: '20px', color: 'var(--color-text)' }}>
                  {ci >= 0 ? `+${ci}` : `−${Math.abs(ci)}`}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>gCO₂e/MJ</span>
              </div>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="-150"
              max="50"
              step="1"
              value={ci}
              onChange={e => { setCi(Number(e.target.value)); onCiSourceChange('manual'); }}
              style={{ width: '100%', cursor: 'pointer' }}
              aria-label="Adjust carbon intensity"
            />
            <div className="tabular-nums" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
              <span>−150 (Deep negative manure)</span>
              <span>0 (Neutral)</span>
              <span>+50 (Crop)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-divider)' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>GHG Savings vs RED III Comparator:</span>
              <span className="tabular-nums" style={{ fontWeight: 600, fontSize: '14px', color: ghgSavingPct >= 65 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                {ghgSavingPct}% {ghgSavingPct >= 65 ? '(>= 65% Compliant)' : '(< 65% Non-compliant)'}
              </span>
            </div>

            {ghgSavingPct < 65 && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-control)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--color-status-neg-text)', fontWeight: 600 }}>
                  ⚠ RED III 65% Violation — Achieved {ghgSavingPct}% vs 65% minimum required (CI must be ≤ 32.9 gCO₂e/MJ).
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-compliance-auditor', {
                      detail: {
                        originCountry: origin,
                        targetMarketId: selectedMarket?.id || 'DE_THG',
                        feedstockCategory: currentFeedstockObj.label,
                        carbonIntensity: ci,
                        annualVolumeMWh: volumeMwh,
                        initialTab: 'GATE_BREAKDOWN',
                        focusedGateIndex: 4
                      }
                    }));
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '2px 8px', color: 'var(--color-status-neg-text)', borderColor: 'var(--color-status-neg-border)', fontWeight: 600 }}
                >
                  ⚖ Audit Statutory Impact &amp; Remediation
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {section === 'SCHEDULE' && (
        <>
          {/* Volume Allocation */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                Contract Traded Volume
              </span>
              <span className="tabular-nums" style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-accent)' }}>
                {volumeMwh.toLocaleString()} MWh
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="100"
                step="500"
                className="input tabular-nums"
                style={{ fontWeight: 600, fontSize: '14px', flex: 1 }}
                value={volumeMwh}
                onChange={e => setVolumeMwh(Math.max(0, Number(e.target.value) || 0))}
              />
              <div style={{ display: 'flex', gap: '3px' }}>
                {[5000, 10000, 25000, 50000].map(v => (
                  <button
                    key={v}
                    type="button"
                    className="chip tabular-nums"
                    onClick={() => setVolumeMwh(v)}
                  >
                    {(v / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Run-rate breakdown */}
            <div className="tabular-nums" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-muted)', marginTop: '8px' }}>
              <span>Delivery Run-rate:</span>
              <span>~{monthlyRateMwh.toLocaleString()} MWh/mo · {dailyRateMwh.toLocaleString()} MWh/d</span>
            </div>

            {plantTotalMWh !== null && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-divider)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Facility Capacity Utilisation:</span>
                  <span className="tabular-nums" style={{ fontWeight: 600, color: isOversubscribed ? 'var(--color-status-neg-text)' : 'var(--color-text)' }}>
                    {plantCommittedPct}% ({volumeMwh.toLocaleString()} / {plantTotalMWh.toLocaleString()} MWh)
                  </span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'var(--color-divider)', borderRadius: 'var(--radius-bar)', position: 'relative' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, plantCommittedPct || 0)}%`,
                      borderRadius: 'var(--radius-bar)',
                      backgroundColor: isOversubscribed ? 'var(--color-status-neg-text)' : 'var(--color-accent)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Production & Delivery Schedule */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
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
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Production &amp; Delivery Schedule
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                EFET biomethane schedule
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
                      onClick={() => handleComplianceYearChange(yr)}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vintage Presets */}
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Production Vintage (Gas Grid Injection)</span>
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
                  <label style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block', marginBottom: '3px' }}>
                    Injection Start Date
                  </label>
                  <input
                    type="date"
                    className="input tabular-nums"
                    value={prodStartDate}
                    onChange={e => setProdStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block', marginBottom: '3px' }}>
                    Injection End Date
                  </label>
                  <input
                    type="date"
                    className="input tabular-nums"
                    value={prodEndDate}
                    onChange={e => setProdEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Delivery Profile */}
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Delivery Rate Profile</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {(['FLAT_MONTHLY', 'SEASONAL_WINTER', 'PROMPT_SPOT', 'CUSTOM'] as DeliveryProfile[]).map(dp => (
                    <button
                      key={dp}
                      type="button"
                      className={`chip ${deliveryProfile === dp ? 'chip-a' : ''}`}
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
                  borderRadius: 'var(--radius-control)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Grid Delivery Point (VTP):</span>
                  <strong style={{ color: 'var(--color-text)' }}>
                    {getVtpForMarket(selectedMarket.country)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Registry Surrender Deadline:</span>
                  <strong className="tabular-nums" style={{ color: 'var(--color-accent)' }}>
                    {statutorySurrenderDeadline}
                  </strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
                  UDB Mass Balance Rule: Certificates must be balanced and surrendered within 12 months of injection month end (RED III Art. 30).
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
