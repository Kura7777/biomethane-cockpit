import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { defaultVolumeMwh, FUELEU_BIO_LNG_DEFAULT_ORIGIN } from '../../domain/trade/dealDefaults';
import { buildOriginationUrl } from '../commercial/originationUrl';
import {
  FUELEU_VLSFO_WTW,
  fossilLngWtw,
  penaltyEur,
  closeDeficitWithBioLng,
  DEFAULT_LNG_ENGINE,
} from '../../domain/fueleu/calculator';
import {
  FUELEU_ACTIVE_PERIOD,
  getFuelEUTargetIntensity,
  COMPLIANCE_PERIOD_YEARS,
  COMPLIANCE_YEAR_SHORT_LABELS,
  COMPLIANCE_YEAR_PCT_LABELS,
} from './complianceYears';
import { LngEngineType } from '../../domain/fueleu/types';
import { Zap, ShieldCheck, ArrowRight, FileText, Check, Flame } from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';
import { getAssumption } from '../../domain/assumptions/registry';
import { NO_POOL_MARK } from '../../domain/fueleu/marketPrices';
import { useFuelEuPrices } from './useFuelEuPrices';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { AssumptionsStrip } from '../../shared/components/AssumptionsStrip';
import { FlowSteps } from '../../shared/ui/FlowSteps';

type PathwayStep = 1 | 2 | 3;

const ESCALATION_LABELS: Record<number, string> = {
  1: 'Year 1 (0% escalation)',
  2: 'Year 2 (+10% escalation)',
  3: 'Year 3 (+20% escalation)',
  4: 'Year 4+ (+30% escalation)',
};

const DEFAULT_FLEET_GHGIE = 91.68;

const LNG_ENGINE_LABELS: Record<LngEngineType, string> = {
  LNG_OTTO_SS: 'Otto slow-speed (1.7% slip)',
  LNG_OTTO_MS: 'Otto medium-speed (3.1% slip)',
  LNG_DIESEL_SS: 'Diesel slow-speed (0.2% slip)',
  LBSI: 'Lean-burn spark-ignited (2.6% slip)',
};

/** Prefill for a hand-off from the Vessel archetypes flow: "Compare pathways for this vessel"
 *  carries the vessel's own deficit, GHGIE, LNG capability, compliance year and escalation. */
export interface DualCommercialPathwayInitial {
  deficitTco2e: number;
  fleetActualGhgie: number;
  isLngCapable: boolean;
  targetYear: number;
  consecutiveYears: number;
}

export interface DualCommercialPathwaySimulatorProps {
  initial?: DualCommercialPathwayInitial;
}

/** FuelEU commercial pathways as a vertical three-step flow: size the fleet deficit, set the
 *  fuel and fleet, then compare inaction, physical Bio-LNG and Article 21 pooling side by side. */
export function DualCommercialPathwaySimulator({ initial }: DualCommercialPathwaySimulatorProps = {}) {
  const navigate = useNavigate();
  // A hand-off from the Vessel archetypes flow already has everything decided — open straight
  // on the comparison step instead of making the trader click back through it.
  const [step, setStep] = useState<PathwayStep>(initial ? 3 : 1);

  // Deficit volume slider in tCO2e
  const [simulatedDeficitTco2e, setSimulatedDeficitTco2e] = useState<number>(initial?.deficitTco2e ?? 25000);
  const [bioLngCi, setBioLngCi] = useState<number>(-100);
  const [targetYear, setTargetYear] = useState<number>(initial?.targetYear ?? FUELEU_ACTIVE_PERIOD);
  const [consecutiveYears, setConsecutiveYears] = useState<number>(initial?.consecutiveYears ?? 1);
  // Fleet actual GHG intensity (gCO2e/MJ) — the ship's own weighted-average WtW, drives the
  // statutory penalty (Annex IV Part B uses GHGIE_actual, not the fixed reference value).
  const [fleetActualGhgie, setFleetActualGhgie] = useState<number>(initial ? initial.fleetActualGhgie : DEFAULT_FLEET_GHGIE);
  const [isLngCapable, setIsLngCapable] = useState<boolean>(initial?.isLngCapable ?? false);
  const [lngEngine, setLngEngine] = useState<LngEngineType>(DEFAULT_LNG_ENGINE);
  const [copied, setCopied] = useState<boolean>(false);
  useAssumptionsVersion();

  // Economic formulas — shared with the vessel calculator engine (calculator.ts) so both screens
  // agree on the same deficit/GHGIE/displacement:
  // Penalty: Annex IV Part B — |CB| / (GHGIE_actual × 41,000 MJ/t) × €2,400 × [1 + (n−1)/10]
  const statutoryPenaltyEur = penaltyEur(simulatedDeficitTco2e, fleetActualGhgie, consecutiveYears);

  // Pathway 1: Physical Bio-LNG Bunkering — Bio-LNG displaces the fuel a real fleet would
  // otherwise burn: fossil LNG for an LNG-capable fleet, VLSFO otherwise.
  const targetGhgie = getFuelEUTargetIntensity(targetYear);
  const displacedIntensity = isLngCapable ? fossilLngWtw(lngEngine) : FUELEU_VLSFO_WTW;
  const closure = closeDeficitWithBioLng({
    deficitTco2e: simulatedDeficitTco2e,
    displacedIntensity,
    bioLngCi,
    lngEngine,
  });
  const requiredBioLngMwh = closure.mwh;
  const requiredBioLngTonnes = closure.tonnes;

  const effectivePenaltyRatePerTco2e = simulatedDeficitTco2e > 0 ? statutoryPenaltyEur / simulatedDeficitTco2e : 0;

  const bioLngPremium = getAssumption('fueleu.bioLngPremiumEurPerMwh');
  const physicalBioLngPremiumCost = requiredBioLngMwh * bioLngPremium;
  const physicalClientSavingsEur = Math.max(0, statutoryPenaltyEur - physicalBioLngPremiumCost);
  const physicalDeskMarginEur = requiredBioLngMwh * getAssumption('fueleu.physicalDeskMarginEurPerMwh');

  // Pathway 2: Article 21 Compliance Pooling
  // Client pays the desk offer; the surplus holder receives the bid; the desk keeps the spread
  // The pool prices are the FUELEU mark from the Pricing desk; with no mark the pooling figures are "—".
  const pool = useFuelEuPrices().pool;
  const poolOffer = pool ? pool.offerEurPerTco2e : null;
  const poolingCostToClientEur = poolOffer === null ? null : simulatedDeficitTco2e * poolOffer;
  const poolingClientSavingsEur = poolingCostToClientEur === null ? null : Math.max(0, statutoryPenaltyEur - poolingCostToClientEur);
  const poolingDeskMarginEur = pool ? simulatedDeficitTco2e * pool.spreadEurPerTco2e : null;
  const eur0 = (v: number | null): string => (v === null ? `— (${NO_POOL_MARK})` : `€${Math.round(v).toLocaleString()}`);
  const eurShort = (v: number | null): string => (v === null ? '—' : `€${Math.round(v).toLocaleString()}`);

  const handleStructureTrade = () => {
    const url = buildDealUrl({
      marketId: 'FUELEU',
      originCountry: FUELEU_BIO_LNG_DEFAULT_ORIGIN.originCountry,
      feedstock: FUELEU_BIO_LNG_DEFAULT_ORIGIN.feedstock,
      ci: bioLngCi,
      ciIsEstimated: true,
      volume: Math.max(1000, Math.round(requiredBioLngMwh || defaultVolumeMwh())),
      complianceYear: targetYear,
    });
    navigate(url);
  };

  // "Find a plant": this simulator has no counterparty of its own, so only market and volume hand off.
  const handleFindPlant = () => {
    const volumeMwh = Math.max(1000, Math.round(requiredBioLngMwh || defaultVolumeMwh()));
    navigate(buildOriginationUrl({ market: 'FUELEU', mwh: volumeMwh }));
  };

  const handleCopyBriefing = () => {
    const text = `================================================================================
DUAL COMMERCIAL PATHWAYS UNDER FUELEU MARITIME — INDICATIVE ESTIMATE (DESK ASSUMPTIONS)
REGULATION (EU) 2023/1805 (BIO-LNG BUNKERING: ART. 4, ANNEX I-II vs ARTICLE 21 POOLING)
================================================================================
SIMULATED DEFICIT: ${simulatedDeficitTco2e.toLocaleString()} tCO2e
TARGET COMPLIANCE YEAR: ${targetYear} (Target GHGIE: ${targetGhgie.toFixed(2)} gCO2e/MJ)
ESTIMATED PENALTY EXPOSURE (DEFAULT INACTION, ART. 23(2)): €${Math.round(statutoryPenaltyEur).toLocaleString()}

1. PATHWAY A: PHYSICAL BIO-LNG BUNKERING (ART. 4, ANNEX I-II)
--------------------------------------------------------------------------------
- Supply: ISCC EU Mass Balance RED-certified Bio-LNG (CI = ${bioLngCi} gCO2e/MJ)
- Volume: ${Math.round(requiredBioLngTonnes).toLocaleString()} tonnes (${Math.round(requiredBioLngMwh).toLocaleString()} MWh)
- Bunkering Hubs: Rotterdam, Antwerp, Zeebrugge, Marseille, Barcelona
- Estimated Penalty Avoided: €${Math.round(statutoryPenaltyEur).toLocaleString()}
- Total Fuel Premium Cost: €${Math.round(physicalBioLngPremiumCost).toLocaleString()}
- Client Net Savings (estimated): €${Math.round(physicalClientSavingsEur).toLocaleString()} (${((physicalClientSavingsEur / statutoryPenaltyEur) * 100).toFixed(1)}% savings)

2. PATHWAY B: ARTICLE 21 COMPLIANCE POOLING
--------------------------------------------------------------------------------
- Mechanism: Bilateral compliance pool transfer with over-compliant carriers, recorded via the FuelEU database (Art. 19)
- Pool Rate to Client (desk offer from the FUELEU mark, indicative): ${poolOffer === null ? NO_POOL_MARK : `€${poolOffer.toFixed(2)}`} / tCO2e (vs estimated penalty rate €${effectivePenaltyRatePerTco2e.toFixed(2)} / tCO2e at ${fleetActualGhgie.toFixed(2)} g/MJ)
- Cost to Client: ${eur0(poolingCostToClientEur)}
- Client Net Savings (estimated): ${eur0(poolingClientSavingsEur)}${poolingClientSavingsEur === null ? '' : ` (${((poolingClientSavingsEur / statutoryPenaltyEur) * 100).toFixed(1)}% savings)`}
- Physical Bunker Requirement: ZERO (pure financial/registry compliance)
================================================================================`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Dual Pathway Briefing copied to clipboard!', 'SUCCESS');
    setTimeout(() => setCopied(false), 2500);
  };

  const stepSummary: Record<PathwayStep, string> = {
    1: `${simulatedDeficitTco2e.toLocaleString()} tCO₂e · ${COMPLIANCE_YEAR_SHORT_LABELS[targetYear] ?? targetYear} target (${COMPLIANCE_YEAR_PCT_LABELS[targetYear] ?? ''}) · ${ESCALATION_LABELS[consecutiveYears]} · fleet ${fleetActualGhgie.toFixed(2)} g/MJ`,
    2: `Bio-LNG CI ${bioLngCi} g/MJ · ${isLngCapable ? `LNG fleet, ${LNG_ENGINE_LABELS[lngEngine]}` : 'VLSFO fleet'}`,
    3: '',
  };

  const stepActions = (current: PathwayStep, label: string) => (
    <div className="fva-step-actions">
      <button type="button" className="btn btn-primary" onClick={() => setStep((current + 1) as PathwayStep)}>
        {label} <ArrowRight size={14} />
      </button>
      <div className="fva-estimate num" aria-live="polite">
        <span className="fva-estimate-label">Default inaction penalty</span>
        <span className="fva-neg">€{Math.round(statutoryPenaltyEur).toLocaleString()}</span>
        <span className="fva-estimate-sep">·</span>
        <span className="fva-estimate-label">Bio-LNG to close</span>
        <span>{Math.round(requiredBioLngTonnes).toLocaleString()} t</span>
      </div>
    </div>
  );

  const renderBody = (id: PathwayStep) => {
    switch (id) {
      case 1:
        return (
          <>
            <div className="fva-section-head">
              <span>Fleet deficit</span>
            </div>

            {/* Deficit Volume Slider */}
            <div className="fva-field">
              <div className="fva-field-row">
                <span className="fva-label">Fleet deficit volume (tCO₂e):</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={simulatedDeficitTco2e}
                  // Typed values are taken exactly (no clamp): a real vessel or group deficit can sit
                  // below 1,000 t or above the slider's 200,000 t range. Only the slider is range-limited.
                  onChange={(e) => setSimulatedDeficitTco2e(Math.max(1, Math.round(Number(e.target.value)) || 1))}
                  className="input num fva-num-input"
                  aria-label="Fleet deficit volume (tCO2e)"
                />
              </div>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={Math.min(200000, Math.max(1000, simulatedDeficitTco2e))}
                onChange={(e) => setSimulatedDeficitTco2e(Number(e.target.value))}
                className="fva-range"
                aria-label="Fleet deficit volume slider"
              />
              <div className="fva-scale num">
                <span>1,000 t</span>
                <span>100,000 t</span>
                <span>200,000 t</span>
              </div>
            </div>

            <div className="fva-settings">
              {/* Target Compliance Year */}
              <label className="fva-field">
                <span className="fva-label">Compliance year</span>
                <select value={targetYear} onChange={(e) => setTargetYear(Number(e.target.value))} className="input">
                  {COMPLIANCE_PERIOD_YEARS.map((year) => (
                    <option key={year} value={year}>{COMPLIANCE_YEAR_SHORT_LABELS[year]} ({getFuelEUTargetIntensity(year).toFixed(2)})</option>
                  ))}
                </select>
                <span className="fva-hint num">Target GHGIE {targetGhgie.toFixed(2)} g/MJ ({COMPLIANCE_YEAR_PCT_LABELS[targetYear] ?? ''})</span>
              </label>

              {/* Consecutive Years Multiplier */}
              <label className="fva-field">
                <span className="fva-label">Escalation vintage</span>
                <select value={consecutiveYears} onChange={(e) => setConsecutiveYears(Number(e.target.value))} className="input">
                  {Object.entries(ESCALATION_LABELS).map(([years, label]) => (
                    <option key={years} value={years}>{label}</option>
                  ))}
                </select>
                <span className="fva-hint num">Penalty at {((1 + (consecutiveYears - 1) / 10) * 100).toFixed(0)}% of the base rate</span>
              </label>

              {/* Fleet Actual GHG Intensity */}
              <label className="fva-field full">
                <span className="fva-label">Fleet actual GHG intensity (gCO₂e/MJ)</span>
                <input
                  type="number"
                  step="0.01"
                  value={fleetActualGhgie}
                  onChange={(e) => setFleetActualGhgie(Math.max(0.01, Number(e.target.value) || 0))}
                  className="input num fva-num-input"
                />
                <span className="fva-hint">Annex IV Part B uses the fleet&apos;s own achieved intensity</span>
              </label>
            </div>

            {stepActions(1, 'Next: Fuel & fleet')}
          </>
        );

      case 2:
        return (
          <>
            {/* Bio-LNG Carbon Intensity */}
            <div className="fva-subpanel">
              <div className="fva-field">
                <div className="fva-field-row">
                  <span className="fva-label pos">Bio-LNG substrate CI (g/MJ):</span>
                  <div className="fva-ci-input">
                    <input
                      type="number"
                      min={-120}
                      max={20}
                      step={5}
                      value={bioLngCi}
                      onChange={(e) => setBioLngCi(Math.min(20, Math.max(-120, Number(e.target.value) || 0)))}
                      className="input num"
                      aria-label="Bio-LNG substrate carbon intensity (g/MJ)"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="20"
                  step="5"
                  value={bioLngCi}
                  onChange={(e) => setBioLngCi(Number(e.target.value))}
                  className="fva-range"
                  aria-label="Bio-LNG substrate carbon intensity slider"
                />
                <div className="fva-scale num">
                  <span>-120 (Manure)</span>
                  <span>-50</span>
                  <span>+20 (Waste)</span>
                </div>
              </div>
            </div>

            {/* LNG-Capable Fleet Toggle */}
            <div className="fva-settings">
              <div className="fva-field">
                <span className="fva-label">LNG-capable fleet</span>
                <div className="fe-seg fva-seg" role="group" aria-label="Fleet fuel">
                  <button type="button" className={!isLngCapable ? 'active' : ''} onClick={() => setIsLngCapable(false)}>
                    VLSFO fleet
                  </button>
                  <button type="button" className={isLngCapable ? 'active' : ''} onClick={() => setIsLngCapable(true)}>
                    LNG fleet
                  </button>
                </div>
                <span className="fva-hint">Bio-LNG displaces {isLngCapable ? 'fossil LNG' : 'VLSFO'} ({displacedIntensity.toFixed(2)} g/MJ WtW)</span>
              </div>

              {isLngCapable && (
                <label className="fva-field">
                  <span className="fva-label">LNG engine</span>
                  <select value={lngEngine} onChange={(e) => setLngEngine(e.target.value as LngEngineType)} className="input">
                    {(Object.keys(LNG_ENGINE_LABELS) as LngEngineType[]).map(engine => (
                      <option key={engine} value={engine}>{LNG_ENGINE_LABELS[engine]}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {stepActions(2, 'Next: Compare pathways')}
          </>
        );

      case 3:
        return (
          <>
            <div className="fva-intro">
              <p className="fva-desc">
                Shipping operators facing FuelEU Maritime non-compliance fines have two routes to reduce exposure: physically bunkering negative-CI Bio-LNG (Art. 4, Annex I-II) or purchasing pooled compliance surplus from over-compliant fleets (Article 21). Indicative estimate — desk assumptions.
              </p>
              <p className="fva-hint">Desk margin figures below are internal — not for client distribution.</p>
            </div>

            {/* Comparative Solution Matrix: one row per option, figures on the right */}
            <div className="fva-options">
              {/* Option 0: Statutory Inaction (Default Penalty) */}
              <section className="fva-card fva-option">
                <div className="fva-option-info">
                <div className="fva-card-head">
                  <h3 className="fva-title neg">
                    <Flame size={16} /> Statutory Inaction (Default Penalty)
                  </h3>
                  <span className="chip chip-neg">Default</span>
                </div>
                <p className="fva-desc">Paying the FuelEU penalty directly to the administering State (Art. 23(2)).</p>

                <div className="fva-note-neg">Inaction triggers consecutive year multipliers (Year 2: +10%, Year 3: +20%).</div>
                </div>

                <div className="fva-kv">
                  <div className="fva-kv-row">
                    <span className="muted">Statutory Rate:</span>
                    <span className="num">€2,400 / t VLSFO-eq</span>
                  </div>
                  <div className="fva-kv-row">
                    <span className="muted">Effective CI Cost:</span>
                    <span className="num">€{effectivePenaltyRatePerTco2e.toFixed(2)} / tCO₂e</span>
                  </div>
                  <div className="fva-kv-row neg">
                    <span>Total Cash Penalty:</span>
                    <span className="num">€{Math.round(statutoryPenaltyEur).toLocaleString()}</span>
                  </div>
                  <div className="fva-kv-row">
                    <span className="muted">Client Savings:</span>
                    <span className="num fva-neg">€0 (100% loss)</span>
                  </div>
                  <div className="fva-kv-row">
                    <span className="muted">Desk Margin (internal):</span>
                    <span className="num">€0</span>
                  </div>
                </div>
              </section>

              {/* Option 1: Physical Bio-LNG Bunkering */}
              <section className="fva-card fva-option">
                <div className="fva-option-info">
                <div className="fva-card-head">
                  <h3 className="fva-title">
                    <Zap size={16} /> Pathway 1: Physical Bio-LNG
                  </h3>
                  <span className="chip chip-info">Art. 4, Annex I-II</span>
                </div>
                <p className="fva-desc">
                  Physical drop-in bunkering of Danish/Dutch manure Bio-LNG (CI = {bioLngCi} g/MJ) at Rotterdam or Antwerp.
                </p>

                <button type="button" onClick={handleStructureTrade} className="btn btn-primary fva-cta">
                  <Zap size={14} /> Structure Bio-LNG Supply in Trade Builder
                </button>
                <button type="button" onClick={handleFindPlant} className="btn btn-secondary fva-cta">
                  Find a plant
                </button>
                </div>

                <div className="fva-kv">
                  <div className="fva-kv-row">
                    <span className="muted">Bio-LNG Volume:</span>
                    <span className="num">{Math.round(requiredBioLngTonnes).toLocaleString()} t ({Math.round(requiredBioLngMwh).toLocaleString()} MWh)</span>
                  </div>
                  <div className="fva-kv-row">
                    <span className="muted">Fuel Premium Cost:</span>
                    <span className="num">€{Math.round(physicalBioLngPremiumCost).toLocaleString()}</span>
                  </div>
                  <div className="fva-kv-row pos">
                    <span>Client Net Savings:</span>
                    <span className="num">€{Math.round(physicalClientSavingsEur).toLocaleString()}</span>
                  </div>
                  <div className="fva-kv-row accent">
                    <span>Desk Trading Margin (internal):</span>
                    <span className="num">€{Math.round(physicalDeskMarginEur).toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Option 2: Article 21 Pooling Mechanism */}
              <section className="fva-card fva-option">
                <div className="fva-option-info">
                <div className="fva-card-head">
                  <h3 className="fva-title pos">
                    <ShieldCheck size={16} /> Pathway 2: Article 21 Pooling
                  </h3>
                  <span className="chip chip-pos">Article 21</span>
                </div>
                <p className="fva-desc">
                  Bilateral compliance pool matching deficit vessels with over-compliant LNG fleets, recorded via the FuelEU database (Art. 19).
                </p>

                <button type="button" onClick={handleCopyBriefing} className="btn btn-secondary fva-cta">
                  {copied ? <Check size={14} className="fva-pos" /> : <FileText size={14} />}
                  {copied ? 'Copied Briefing' : 'Copy Indicative Pool Term Sheet'}
                </button>
                </div>

                <div className="fva-kv">
                  <div className="fva-kv-row">
                    <span className="muted">Pool Clearing Rate:</span>
                    <span className="num">{poolOffer === null ? NO_POOL_MARK : `€${poolOffer.toFixed(2)} / tCO₂e`}</span>
                  </div>
                  <div className="fva-kv-row">
                    <span className="muted">Cost to Client:</span>
                    <span className="num">{eurShort(poolingCostToClientEur)}</span>
                  </div>
                  <div className="fva-kv-row pos">
                    <span>Client Net Savings:</span>
                    <span className="num">{eurShort(poolingClientSavingsEur)}</span>
                  </div>
                  <div className="fva-kv-row accent">
                    <span>Desk Arrangement Fee (internal):</span>
                    <span className="num">{eurShort(poolingDeskMarginEur)}</span>
                  </div>
                </div>
              </section>
            </div>

            <AssumptionsStrip
              keys={['fueleu.bioLngPremiumEurPerMwh', 'fueleu.physicalDeskMarginEurPerMwh', 'fueleu.poolDeskSpreadEurPerTco2e']}
            />
          </>
        );
    }
  };

  const steps: { id: PathwayStep; label: string }[] = [
    { id: 1, label: 'Deficit' },
    { id: 2, label: 'Fuel & fleet' },
    { id: 3, label: 'Compare pathways' },
  ];

  const betterClientOutcomeEur = Math.max(physicalClientSavingsEur, poolingClientSavingsEur ?? 0);

  const rail = (
    <aside className="fva-rail ds-aside" data-testid="pathways-rail">
      <div className="ds-aside-body">
        <div className="ds-aside-section">
          <div className="ds-panel-section-heading">Inaction penalty</div>
          <div className="ds-panel-stat-value num fva-neg">
            €{Math.round(statutoryPenaltyEur).toLocaleString()}
          </div>
        </div>

        <div className="ds-aside-section">
          <div className="ds-panel-section-heading">Client options</div>
          <div className="fva-rail-options">
            <div className={`fva-rail-option ${physicalClientSavingsEur === betterClientOutcomeEur ? 'cheapest' : ''}`}>
              <span className="fva-rail-option-label">Physical Bio-LNG — client saving</span>
              <span className="num">€{Math.round(physicalClientSavingsEur).toLocaleString()}</span>
            </div>
            <div className="fva-rail-option">
              <span className="fva-rail-option-label">Physical Bio-LNG — desk margin</span>
              <span className="num">€{Math.round(physicalDeskMarginEur).toLocaleString()}</span>
            </div>
            <div className={`fva-rail-option ${poolingClientSavingsEur === betterClientOutcomeEur ? 'cheapest' : ''}`}>
              <span className="fva-rail-option-label">Pooling — client saving</span>
              <span className="num" title={poolingClientSavingsEur === null ? NO_POOL_MARK : undefined}>{eurShort(poolingClientSavingsEur)}</span>
            </div>
            <div className="fva-rail-option">
              <span className="fva-rail-option-label">Pooling — desk margin</span>
              <span className="num" title={poolingDeskMarginEur === null ? NO_POOL_MARK : undefined}>{eurShort(poolingDeskMarginEur)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-aside-footer fva-rail-footer">
        <button type="button" className="btn btn-primary" onClick={handleStructureTrade}>
          <Zap size={14} /> Structure trade
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleFindPlant}>
          Find a plant
        </button>
      </div>
    </aside>
  );

  return (
    <div className="fva-layout">
      <div className="fva">
        <FlowSteps
          steps={steps.map(({ id, label }) => ({ id, label, summary: stepSummary[id] }))}
          current={step}
          onSelect={setStep}
          renderBody={renderBody}
          ariaLabel="Commercial pathways steps"
        />
      </div>
      {rail}
    </div>
  );
}
