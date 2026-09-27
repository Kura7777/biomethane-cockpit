import React from 'react';
import { CertificationScheme, ChainOfCustody, DeliveryProfile } from '../../../domain/consignment/types';
import { Market } from '../../../domain/markets/types';
import { BiomethanePlant } from '../../../domain/plants/types';
import { DealParams } from '../../../domain/trade/dealParams';
import { getCountryFeedstockCI } from '../../../domain/consignment/feedstocks';
import { getVtpForMarket } from '../TradeBuilderScreen';
import { FileText, Lock, Calendar, FileUp, Scale, AlertTriangle, Globe, Leaf, Gauge, Layers, Anchor } from 'lucide-react';

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

  const openAuditor = (detail: Record<string, unknown>) => {
    window.dispatchEvent(new CustomEvent('open-compliance-auditor', {
      detail: {
        originCountry: origin,
        targetMarketId: selectedMarket?.id || 'DE_THG',
        carbonIntensity: ci,
        annualVolumeMWh: volumeMwh,
        initialTab: 'GATE_BREAKDOWN',
        ...detail,
      },
    }));
  };

  /** 'FLAT_MONTHLY' → 'Flat monthly' */
  const profileLabel = (dp: string) => {
    const words = dp.replace(/_/g, ' ').toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  const ciTierLabel: Record<'conservative' | 'base' | 'optimistic', string> = {
    conservative: 'Conservative',
    base: 'Base',
    optimistic: 'Optimistic',
  };

  return (
    <div className="tb-step">
      {section === 'PRODUCT' && (
        <>
          {/* Upstream FuelEU Maritime Physical Gas Hedge Context Banner */}
          {(deal.marketId === 'FUELEU' || (deal.counterparty && deal.feedstock === 'manure')) && (
            <div className="tb-alert info">
              <div className="tb-section">
                <div className="tb-row-start">
                  <Anchor size={16} />
                  <span className="tb-badge info">FuelEU Maritime Upstream Sourcing Hedge</span>
                  <span className="tb-label strong">Marine Counterparty: {deal.counterparty || 'Maritime Fleet Buyer'}</span>
                  <span className="tb-label tb-num">({volumeMwh.toLocaleString()} MWh physical biomethane requirement)</span>
                </div>
                <p className="tb-hint">
                  Sourcing pipeline biomethane on the European gas grid via RED III Mass Balance to feed cryogenic Bio-LNG liquefaction at European bunkering terminals.
                </p>
              </div>
              <span className="tb-badge pos tb-num">-100 gCO₂e/MJ Manure · 100% RED III Compliant</span>
            </div>
          )}

          {/* PoS Certificate Ingestion Card */}
          <section className="tb-panel">
            <div className="tb-panel-head">
              <div>
                <h3 className="tb-panel-title">
                  <FileText size={16} /> Audited Proof of Sustainability (PoS)
                </h3>
                <p className="tb-panel-desc">Auto-extract audited substrate mix, certified CI, and registration ID from ISCC EU or REDcert-EU</p>
              </div>
              <button type="button" onClick={onOpenPoS} className="btn btn-secondary tb-accent-btn" data-testid="pos-uploader-btn">
                <FileUp size={14} />
                <span>Ingest PoS PDF / XML</span>
              </button>
            </div>
          </section>

          {/* Physical Asset Sourcing Locked Card (if passed) */}
          {(deal.plantName || linkedPlant) && (
            <section className="tb-panel accent-left">
              <div className="tb-panel-head">
                <h3 className="tb-panel-title">
                  <span>{currentOriginObj.flag}</span> {deal.plantName || linkedPlant?.name}
                </h3>
                <span className="tb-badge pos">
                  <Lock size={11} />
                  <span>AUDITED ASSET LOCKED</span>
                </span>
              </div>

              <div className="tb-facts">
                <div>
                  <strong>Operating Entity:</strong>{' '}
                  {deal.legalEntityName || linkedPlant?.legalEntityName || linkedPlant?.operator || 'Operating Entity'}
                </div>
                <div>
                  <strong>Grid Injection TSO:</strong>{' '}
                  {deal.networkOperator || linkedPlant?.networkOperator || `${currentOriginObj.name} Gas Grid`}
                </div>
                {(deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh) && (
                  <div className="tb-num">
                    <strong>Facility Capacity:</strong>{' '}
                    {deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh} GWh/y
                  </div>
                )}
                {linkedPlant?.upgradingTechnology && (
                  <div>
                    <strong>Upgrading Technology:</strong>{' '}
                    {linkedPlant.upgradingTechnology}
                  </div>
                )}
                {linkedPlant?.feedstockDetails && (
                  <div className="full">
                    <strong>Audited Substrates:</strong>{' '}
                    {linkedPlant.feedstockDetails}
                  </div>
                )}
                {(deal.contactEmail || linkedPlant?.contactEmail) && (
                  <div className="full">
                    <strong>Desk Contact:</strong>{' '}
                    {deal.contactEmail || linkedPlant?.contactEmail}{' '}
                    {deal.contactPhone || linkedPlant?.contactPhone ? `· ${deal.contactPhone || linkedPlant?.contactPhone}` : ''}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Origin Country Selector */}
          <section className="tb-panel">
            <div className="tb-panel-head">
              <h3 className="tb-panel-title">
                <Globe size={16} /> Origin Country &amp; Grid Injection Zone
              </h3>
              <span className="tb-panel-meta">{currentOriginObj.code} · {currentOriginObj.name}</span>
            </div>

            <div className="tb-chips">
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
            <p className="tb-hint">{currentOriginObj.desc}</p>

            {(origin === 'GB' || currentOriginObj.isolated) && (
              <div className="tb-alert neg">
                <span className="tb-alert-text">
                  <AlertTriangle size={14} /> Non-EU Gas Grid — Physical grid disconnected from EU UDB single mass balance area.
                </span>
                <button
                  type="button"
                  onClick={() => openAuditor({ feedstockCategory: currentFeedstockObj.label, focusedGateIndex: 1 })}
                  className="btn btn-secondary"
                >
                  <Scale size={13} /> Audit UDB Cross-Border Ingestion
                </button>
              </div>
            )}
          </section>

          {/* Feedstock, Certification & Chain of Custody */}
          <section className="tb-panel">
            <div className="tb-section">
              <h3 className="tb-panel-title">
                <Leaf size={16} /> Primary Feedstock Substrate
              </h3>
              <div className="tb-chips">
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
              <p className="tb-hint">{currentFeedstockObj.hint}</p>

              {feedstockKey === 'energy_crops' && (
                <div className="tb-alert warn">
                  <span className="tb-alert-text">
                    <AlertTriangle size={14} /> Food/Crop Cap — Energy crops are subject to statutory transport caps under RED III Art. 26.
                  </span>
                  <button
                    type="button"
                    onClick={() => openAuditor({ feedstockCategory: 'ENERGY_CROPS', focusedGateIndex: 3 })}
                    className="btn btn-secondary"
                  >
                    <Scale size={13} /> Audit Quota Eligibility
                  </button>
                </div>
              )}
            </div>

            {/* Scheme & Custody row */}
            <div className="tb-section-row">
              <div className="tb-section">
                <span className="tb-label strong">Certification Scheme</span>
                <div className="tb-chips">
                  {schemes.map(sc => (
                    <button
                      key={sc.scheme}
                      type="button"
                      className={`chip ${sc.scheme === scheme ? 'chip-a' : ''}`}
                      onClick={() => setScheme(sc.scheme)}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
                <p className="tb-hint">{currentSchemeObj.hint}</p>
              </div>

              <div className="tb-section">
                <span className="tb-label strong">Chain of Custody</span>
                <div className="tb-chips">
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
                <p className="tb-hint">{currentCustodyObj.hint}</p>
              </div>
            </div>
          </section>

          {/* Carbon Intensity & Benchmark Slider */}
          <section className="tb-panel">
            <div className="tb-panel-head">
              <div className="tb-row-start">
                <h3 className="tb-panel-title">
                  <Gauge size={16} /> Carbon Intensity (CI)
                </h3>
                {ciProvenance === 'pos' ? (
                  <span className="chip chip-pos" title="CI taken from the uploaded Proof of Sustainability. Check it against the certificate before confirming.">PoS CI</span>
                ) : ciProvenance === 'estimated' ? (
                  <span className="chip chip-warn" title="Feedstock default or benchmark CI, not from an audited PoS. Treat as indicative until the producer's PoS is received.">Estimated CI</span>
                ) : null}
              </div>
              <span className="tb-value">
                {ci >= 0 ? `+${ci}` : `−${Math.abs(ci)}`}{' '}
                <span className="unit">gCO₂e/MJ</span>
              </span>
            </div>

            <div className="tb-row">
              <span className="tb-label">Benchmark tier</span>
              <div className="seg" role="group" aria-label="CI benchmark tier">
                {(['conservative', 'base', 'optimistic'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`seg-opt ${ciTier === t ? 'active' : ''}`}
                    onClick={() => {
                      setCiTier(t);
                      const benchmark = getCountryFeedstockCI(origin, feedstockKey, t);
                      setCi(benchmark.ci);
                      onCiSourceChange('estimate');
                    }}
                  >
                    {ciTierLabel[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Range Slider */}
            <div className="tb-section">
              <input
                type="range"
                min="-150"
                max="50"
                step="1"
                value={ci}
                onChange={e => { setCi(Number(e.target.value)); onCiSourceChange('manual'); }}
                className="tb-range"
                aria-label="Adjust carbon intensity"
              />
              <div className="tb-scale">
                <span>−150 (Deep negative manure)</span>
                <span>0 (Neutral)</span>
                <span>+50 (Crop)</span>
              </div>
            </div>

            <div className="tb-row tb-ruled">
              <span className="tb-label">GHG Savings vs RED III Comparator:</span>
              <span className={`tb-num tb-label strong ${ghgSavingPct >= 65 ? 'tb-pos' : 'tb-neg'}`}>
                {ghgSavingPct}% {ghgSavingPct >= 65 ? '(>= 65% Compliant)' : '(< 65% Non-compliant)'}
              </span>
            </div>

            {ghgSavingPct < 65 && (
              <div className="tb-alert neg">
                <span className="tb-alert-text">
                  <AlertTriangle size={14} /> RED III 65% Violation — Achieved {ghgSavingPct}% vs 65% minimum required (CI must be ≤ 32.9 gCO₂e/MJ).
                </span>
                <button
                  type="button"
                  onClick={() => openAuditor({ feedstockCategory: currentFeedstockObj.label, focusedGateIndex: 4 })}
                  className="btn btn-secondary"
                >
                  <Scale size={13} /> Audit Statutory Impact &amp; Remediation
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {section === 'SCHEDULE' && (
        <>
          {/* Volume Allocation */}
          <section className="tb-panel">
            <div className="tb-panel-head">
              <h3 className="tb-panel-title">
                <Layers size={16} /> Contract Traded Volume
              </h3>
              <span className="tb-value">
                {volumeMwh.toLocaleString()}{' '}
                <span className="unit">MWh</span>
              </span>
            </div>

            <div className="tb-row-start">
              <input
                type="number"
                min="100"
                step="500"
                className="input tb-num tb-volume-input"
                value={volumeMwh}
                onChange={e => setVolumeMwh(Math.max(0, Number(e.target.value) || 0))}
                aria-label="Contract traded volume (MWh)"
              />
              <div className="tb-chips">
                {[5000, 10000, 25000, 50000].map(v => (
                  <button
                    key={v}
                    type="button"
                    className={`chip tb-num ${volumeMwh === v ? 'chip-a' : ''}`}
                    onClick={() => setVolumeMwh(v)}
                  >
                    {(v / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Run-rate breakdown */}
            <div className="tb-row">
              <span className="tb-label">Delivery Run-rate:</span>
              <span className="tb-label tb-num">~{monthlyRateMwh.toLocaleString()} MWh/mo · {dailyRateMwh.toLocaleString()} MWh/d</span>
            </div>

            {plantTotalMWh !== null && (
              <div className="tb-section tb-ruled">
                <div className="tb-row">
                  <span className="tb-label">Facility Capacity Utilisation:</span>
                  <span className={`tb-label strong tb-num ${isOversubscribed ? 'tb-neg' : ''}`}>
                    {plantCommittedPct}% ({volumeMwh.toLocaleString()} / {plantTotalMWh.toLocaleString()} MWh)
                  </span>
                </div>
                <div className="tb-meter">
                  <div
                    className={`tb-meter-fill ${isOversubscribed ? 'neg' : ''}`}
                    style={{ width: `${Math.min(100, plantCommittedPct || 0)}%` }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Production & Delivery Schedule */}
          <section className="tb-panel">
            <div className="tb-panel-head">
              <h3 className="tb-panel-title">
                <Calendar size={16} /> Production &amp; Delivery Schedule
              </h3>
              <span className="tb-panel-meta">EFET biomethane schedule</span>
            </div>

            {/* Compliance Year */}
            <div className="tb-row">
              <span className="tb-label strong">Compliance Target Year</span>
              <div className="seg" role="group" aria-label="Compliance target year">
                {[2025, 2026, 2027].map(yr => (
                  <button
                    key={yr}
                    type="button"
                    className={`seg-opt tb-num ${complianceYear === yr ? 'active' : ''}`}
                    onClick={() => handleComplianceYearChange(yr)}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Vintage Presets */}
            <div className="tb-section">
              <span className="tb-label">Production Vintage (Gas Grid Injection)</span>
              <div className="tb-chips">
                {[
                  { key: 'CAL_YEAR', label: `Cal-${complianceYear}` },
                  { key: 'Q1', label: `Q1-${complianceYear}` },
                  { key: 'Q2', label: `Q2-${complianceYear}` },
                  { key: 'Q3', label: `Q3-${complianceYear}` },
                  { key: 'Q4', label: `Q4-${complianceYear}` },
                  { key: 'PROMPT', label: 'Prompt Month' },
                  { key: 'CUSTOM', label: 'Custom' },
                ].map(pr => (
                  <button
                    key={pr.key}
                    type="button"
                    className={`chip ${vintagePreset === pr.key ? 'chip-a' : ''}`}
                    onClick={() => handleVintagePreset(pr.key)}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="tb-date-grid">
              <label className="tb-section">
                <span className="tb-label">Injection Start Date</span>
                <input
                  type="date"
                  className="input tb-num"
                  value={prodStartDate}
                  onChange={e => setProdStartDate(e.target.value)}
                />
              </label>
              <label className="tb-section">
                <span className="tb-label">Injection End Date</span>
                <input
                  type="date"
                  className="input tb-num"
                  value={prodEndDate}
                  onChange={e => setProdEndDate(e.target.value)}
                />
              </label>
            </div>

            {/* Delivery Profile */}
            <div className="tb-section">
              <span className="tb-label">Delivery Rate Profile</span>
              <div className="tb-chips">
                {(['FLAT_MONTHLY', 'SEASONAL_WINTER', 'PROMPT_SPOT', 'CUSTOM'] as DeliveryProfile[]).map(dp => (
                  <button
                    key={dp}
                    type="button"
                    className={`chip ${deliveryProfile === dp ? 'chip-a' : ''}`}
                    onClick={() => setDeliveryProfile(dp)}
                  >
                    {profileLabel(dp)}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Delivery Point & Statutory Deadline Card */}
            <div className="tb-kv">
              <div className="tb-kv-row">
                <span>Grid Delivery Point (VTP):</span>
                <span>{getVtpForMarket(selectedMarket.country)}</span>
              </div>
              <div className="tb-kv-row">
                <span>Registry Surrender Deadline:</span>
                <span className="tb-accent">{statutorySurrenderDeadline}</span>
              </div>
              <div className="tb-kv-note">
                UDB Mass Balance Rule: Certificates must be balanced and surrendered within 12 months of injection month end (RED III Art. 30).
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
