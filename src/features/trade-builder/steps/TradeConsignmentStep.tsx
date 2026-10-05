import React from 'react';
import { CertificationScheme, ChainOfCustody, DeliveryProfile, UDBStatus, PoSStatus } from '../../../domain/consignment/types';
import { Market } from '../../../domain/markets/types';
import { BiomethanePlant } from '../../../domain/plants/types';
import { DealParams } from '../../../domain/trade/dealParams';
import { getCountryFeedstockCI } from '../../../domain/consignment/feedstocks';
import { getVtpForMarket } from '../TradeBuilderScreen';
import { Lock, FileUp, Scale, AlertTriangle } from 'lucide-react';

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

export interface UdbOption {
  status: UDBStatus;
  label: string;
}

export interface PosOption {
  status: PoSStatus;
  label: string;
}

export const UDB_OPTIONS: UdbOption[] = [
  { status: 'RECORDED', label: 'Recorded (confirmed)' },
  { status: 'PENDING', label: 'Assumed, confirm with seller' },
  { status: 'NOT_RECORDED', label: 'Not recorded' },
];

export const POS_OPTIONS: PosOption[] = [
  { status: 'ISSUED', label: 'Issued (confirmed)' },
  { status: 'PENDING', label: 'Assumed, confirm with seller' },
  { status: 'NOT_AVAILABLE', label: 'Not available' },
];

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
  udbStatus: UDBStatus;
  setUdbStatus: (status: UDBStatus) => void;
  posStatus: PoSStatus;
  setPosStatus: (status: PoSStatus) => void;
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
  udbStatus,
  setUdbStatus,
  posStatus,
  setPosStatus,
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
    <div className="tb-form">
      {section === 'PRODUCT' && (
        <>
          {/* Upstream FuelEU Maritime hedge context (deal handed over from FuelEU) */}
          {(deal.marketId === 'FUELEU' || (deal.counterparty && deal.feedstock === 'manure')) && (
            <div className="tb-form-row">
              <span className="tb-form-label">Counterparty</span>
              <div className="tb-form-control">
                <span className="tb-form-value">
                  {deal.counterparty || 'Maritime Fleet Buyer'}{' '}
                  <span className="tb-badge info">FuelEU Maritime Upstream Sourcing Hedge</span>
                </span>
                <p className="tb-hint tb-num">
                  {volumeMwh.toLocaleString()} MWh physical biomethane requirement · -100 gCO₂e/MJ Manure · 100% RED III Compliant. Sourcing pipeline biomethane on the European gas grid via RED III Mass Balance to feed cryogenic Bio-LNG liquefaction at European bunkering terminals.
                </p>
              </div>
            </div>
          )}

          {/* PoS Certificate Ingestion */}
          <div className="tb-form-row">
            <span className="tb-form-label">Proof of Sustainability</span>
            <div className="tb-form-control">
              <div className="tb-row-start">
                <button type="button" onClick={onOpenPoS} className="btn btn-secondary" data-testid="pos-uploader-btn">
                  <FileUp size={14} />
                  <span>Ingest PoS PDF / XML</span>
                </button>
                <span className="tb-hint">Auto-extract audited substrate mix, certified CI, and registration ID from ISCC EU or REDcert-EU</span>
              </div>
            </div>
          </div>

          {/* Physical Asset Sourcing Locked (if passed) */}
          {(deal.plantName || linkedPlant) && (
            <div className="tb-form-row">
              <span className="tb-form-label">Asset</span>
              <div className="tb-form-control">
                <span className="tb-form-value">
                  {currentOriginObj.flag} {deal.plantName || linkedPlant?.name}{' '}
                  <span className="tb-badge pos">
                    <Lock size={11} />
                    <span>AUDITED ASSET LOCKED</span>
                  </span>
                </span>
                <dl className="tb-facts-list">
                  <div>
                    <dt>Operating Entity</dt>
                    <dd>{deal.legalEntityName || linkedPlant?.legalEntityName || linkedPlant?.operator || 'Operating Entity'}</dd>
                  </div>
                  <div>
                    <dt>Grid Injection TSO</dt>
                    <dd>{deal.networkOperator || linkedPlant?.networkOperator || `${currentOriginObj.name} Gas Grid`}</dd>
                  </div>
                  {(deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh) && (
                    <div>
                      <dt>Facility Capacity</dt>
                      <dd className="tb-num">{deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh} GWh/y</dd>
                    </div>
                  )}
                  {linkedPlant?.upgradingTechnology && (
                    <div>
                      <dt>Upgrading Technology</dt>
                      <dd>{linkedPlant.upgradingTechnology}</dd>
                    </div>
                  )}
                  {linkedPlant?.feedstockDetails && (
                    <div>
                      <dt>Audited Substrates</dt>
                      <dd>{linkedPlant.feedstockDetails}</dd>
                    </div>
                  )}
                  {(deal.contactEmail || linkedPlant?.contactEmail) && (
                    <div>
                      <dt>Desk Contact</dt>
                      <dd>
                        {deal.contactEmail || linkedPlant?.contactEmail}{' '}
                        {deal.contactPhone || linkedPlant?.contactPhone ? `· ${deal.contactPhone || linkedPlant?.contactPhone}` : ''}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {/* Origin Country Selector */}
          <div className="tb-form-row">
            <span className="tb-form-label">Origin</span>
            <div className="tb-form-control">
              <div className="tb-chips">
                {origins.map(o => (
                  <button
                    key={o.code}
                    type="button"
                    className={`chip ${o.code === origin ? 'chip-a' : ''}`}
                    onClick={() => setOrigin(o.code)}
                  >
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
            </div>
          </div>

          {/* Feedstock */}
          <div className="tb-form-row">
            <span className="tb-form-label">Feedstock</span>
            <div className="tb-form-control">
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
          </div>

          {/* Certification Scheme */}
          <div className="tb-form-row">
            <span className="tb-form-label">Certification</span>
            <div className="tb-form-control">
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
          </div>

          {/* Chain of Custody */}
          <div className="tb-form-row">
            <span className="tb-form-label">Chain of custody</span>
            <div className="tb-form-control">
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

          {/* Union Database Status */}
          <div className="tb-form-row">
            <span className="tb-form-label">UDB status</span>
            <div className="tb-form-control">
              <div className="tb-chips">
                {UDB_OPTIONS.map(opt => {
                  const isNonEu = origin === 'GB' || origin === 'CH' || origin === 'NO';
                  const isSelected = isNonEu ? opt.status === 'NOT_RECORDED' : opt.status === udbStatus;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      disabled={isNonEu}
                      className={`chip ${isSelected ? 'chip-a' : ''}`}
                      onClick={() => !isNonEu && setUdbStatus(opt.status)}
                      title={isNonEu ? 'These grids are outside the EU, so the volume cannot be recorded in the UDB' : undefined}
                      data-testid={`udb-status-${opt.status.toLowerCase()}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="tb-hint">
                {origin === 'GB' || origin === 'CH' || origin === 'NO'
                  ? 'These grids are outside the EU, so the volume cannot be recorded in the UDB.'
                  : udbStatus === 'RECORDED'
                    ? 'Confirmed recorded in the Union Database (RED III single mass balance area).'
                    : udbStatus === 'PENDING'
                      ? 'Assumed, confirm with seller before clearing into EU compliance markets.'
                      : 'Volume not recorded in the Union Database.'}
              </p>
            </div>
          </div>

          {/* Proof of Sustainability Status */}
          <div className="tb-form-row">
            <span className="tb-form-label">PoS status</span>
            <div className="tb-form-control">
              <div className="tb-chips">
                {POS_OPTIONS.map(opt => (
                  <button
                    key={opt.status}
                    type="button"
                    className={`chip ${opt.status === posStatus ? 'chip-a' : ''}`}
                    onClick={() => setPosStatus(opt.status)}
                    data-testid={`pos-status-${opt.status.toLowerCase()}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="tb-hint">
                {posStatus === 'ISSUED'
                  ? 'Proof of Sustainability (PoS) confirmed issued under certification scheme.'
                  : posStatus === 'PENDING'
                    ? 'Assumed PoS issued upon delivery — confirm issuance with seller.'
                    : 'Proof of Sustainability not available.'}
              </p>
            </div>
          </div>

          {/* Carbon Intensity */}
          <div className="tb-form-row">
            <span className="tb-form-label">Carbon intensity</span>
            <div className="tb-form-control">
              <div className="tb-row">
                <div className="tb-row-start">
                  <span className="tb-value">
                    {ci >= 0 ? `+${ci}` : `−${Math.abs(ci)}`}{' '}
                    <span className="unit">gCO₂e/MJ</span>
                  </span>
                  {ciProvenance === 'pos' ? (
                    <span className="chip chip-pos" title="CI taken from the uploaded Proof of Sustainability. Check it against the certificate before confirming.">PoS CI</span>
                  ) : ciProvenance === 'estimated' ? (
                    <span className="chip chip-warn" title="Feedstock default or benchmark CI, not from an audited PoS. Treat as indicative until the producer's PoS is received.">Estimated CI</span>
                  ) : null}
                </div>
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

              <p className="tb-hint">
                GHG Savings vs RED III Comparator:{' '}
                <strong className={`tb-num ${ghgSavingPct >= 65 ? 'tb-pos' : 'tb-neg'}`}>
                  {ghgSavingPct}% {ghgSavingPct >= 65 ? '(>= 65% Compliant)' : '(< 65% Non-compliant)'}
                </strong>
              </p>

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
            </div>
          </div>
        </>
      )}

      {section === 'SCHEDULE' && (
        <>
          {/* Volume Allocation */}
          <div className="tb-form-row">
            <span className="tb-form-label">Volume</span>
            <div className="tb-form-control">
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
                <span className="tb-label">MWh</span>
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
              <p className="tb-hint tb-num">
                Delivery Run-rate: ~{monthlyRateMwh.toLocaleString()} MWh/mo · {dailyRateMwh.toLocaleString()} MWh/d
              </p>

              {plantTotalMWh !== null && (
                <div className="tb-section">
                  <p className={`tb-hint tb-num ${isOversubscribed ? 'tb-neg' : ''}`}>
                    Facility Capacity Utilisation: {plantCommittedPct}% ({volumeMwh.toLocaleString()} / {plantTotalMWh.toLocaleString()} MWh)
                  </p>
                  <div className="tb-meter">
                    <div
                      className={`tb-meter-fill ${isOversubscribed ? 'neg' : ''}`}
                      style={{ width: `${Math.min(100, plantCommittedPct || 0)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compliance Year */}
          <div className="tb-form-row">
            <span className="tb-form-label">Compliance year</span>
            <div className="tb-form-control">
              <div className="seg tb-seg-start" role="group" aria-label="Compliance target year">
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
          </div>

          {/* Vintage Presets */}
          <div className="tb-form-row">
            <span className="tb-form-label">Production vintage</span>
            <div className="tb-form-control">
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
              <p className="tb-hint">Gas grid injection window</p>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="tb-form-row">
            <span className="tb-form-label">Injection dates</span>
            <div className="tb-form-control">
              <div className="tb-row-start">
                <input
                  type="date"
                  className="input tb-num tb-date-input"
                  value={prodStartDate}
                  onChange={e => setProdStartDate(e.target.value)}
                  aria-label="Injection start date"
                />
                <span className="tb-label">to</span>
                <input
                  type="date"
                  className="input tb-num tb-date-input"
                  value={prodEndDate}
                  onChange={e => setProdEndDate(e.target.value)}
                  aria-label="Injection end date"
                />
              </div>
            </div>
          </div>

          {/* Delivery Profile */}
          <div className="tb-form-row">
            <span className="tb-form-label">Delivery profile</span>
            <div className="tb-form-control">
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
          </div>

          {/* Grid Delivery Point & Statutory Deadline */}
          <div className="tb-form-row">
            <span className="tb-form-label">Delivery point</span>
            <div className="tb-form-control">
              <span className="tb-form-value">{getVtpForMarket(selectedMarket.country)}</span>
              <p className="tb-hint">EFET biomethane schedule · Grid Delivery Point (VTP)</p>
            </div>
          </div>

          <div className="tb-form-row">
            <span className="tb-form-label">Surrender deadline</span>
            <div className="tb-form-control">
              <span className="tb-form-value tb-num">{statutorySurrenderDeadline}</span>
              <p className="tb-hint">
                UDB Mass Balance Rule: Certificates must be balanced and surrendered within 12 months of injection month end (RED III Art. 30).
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
