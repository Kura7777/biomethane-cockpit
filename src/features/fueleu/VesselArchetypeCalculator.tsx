import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VESSEL_ARCHETYPES,
  calculateVesselExposure,
  FUELEU_TARGET_2025,
  FUELEU_TARGET_2030,
  FUELEU_VLSFO_WTW,
  FUELEU_MGO_WTW,
  fossilLngWtw,
  LHV_VLSFO_MJ_PER_TONNE,
  LHV_MGO_MJ_PER_TONNE,
} from '../../domain/fueleu/calculator';
import { VesselArchetype, VesselCalculationInput } from '../../domain/fueleu/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import {
  Ship,
  Zap,
  ShieldCheck,
  RotateCcw,
  Sliders,
  TrendingDown,
  Coins,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Anchor,
  Flame,
  Check,
  Copy,
  ArrowRight
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { AssumptionsStrip } from '../../shared/components/AssumptionsStrip';
import { FlowSteps } from './FlowSteps';
import './vesselArchetypeCalculator.css';

const FUELEU_PATHWAY_ASSUMPTIONS = [
  'fueleu.bioLngPremiumEurPerMwh',
  'fueleu.physicalDeskMarginEurPerMwh',
  'fueleu.poolBuyPriceEurPerTco2e',
  'fueleu.poolSellPriceEurPerTco2e',
];

type CalcStep = 1 | 2 | 3 | 4;

const CALC_STEPS: { id: CalcStep; label: string }[] = [
  { id: 1, label: 'Vessel' },
  { id: 2, label: 'Fuel burn' },
  { id: 3, label: 'Regulation' },
  { id: 4, label: 'Summary' },
];

const COMPLIANCE_YEAR_LABELS: Record<number, string> = {
  2025: '2025 (89.34 g/MJ, -2%)',
  2030: '2030 (85.69 g/MJ, -6%)',
  2035: '2035 (77.94 g/MJ, -14.5%)',
  2040: '2040 (62.90 g/MJ, -31%)',
};

const ESCALATION_LABELS: Record<number, string> = {
  1: 'Year 1 (1.00×)',
  2: 'Year 2 (1.10×)',
  3: 'Year 3 (1.20×)',
  4: 'Year 4+ (1.30×)',
};

/** Single-vessel FuelEU exposure calculator as a vertical four-step flow: pick a vessel, enter its
 *  fuel burn, set the regulatory year, then read the result and the two commercial pathways.
 *  Finished steps fold to a one-line summary with an Edit link; only the active step is open. */
export function VesselArchetypeCalculator() {
  const navigate = useNavigate();

  // Selected preset archetype
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>('ulcs_24k');

  // Input states initialized from preset
  const [vlsfoTonnes, setVlsfoTonnes] = useState<number>(18000);
  const [mgoTonnes, setMgoTonnes] = useState<number>(1200);
  const [lngTonnes, setLngTonnes] = useState<number>(0);
  const [bioLngTonnes, setBioLngTonnes] = useState<number>(0);
  const [bioLngCi, setBioLngCi] = useState<number>(-100);
  const [targetYear, setTargetYear] = useState<number>(2025);
  const [consecutiveYears, setConsecutiveYears] = useState<number>(1);
  const [shareThirdCountryVoyages, setShareThirdCountryVoyages] = useState<number>(
    VESSEL_ARCHETYPES[0].defaultShareThirdCountryVoyages
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [step, setStep] = useState<CalcStep>(1);
  const goToStep = (next: CalcStep) => setStep(next);

  // Active archetype object
  const activeArchetype = useMemo(() => {
    return VESSEL_ARCHETYPES.find(a => a.id === selectedArchetypeId) || VESSEL_ARCHETYPES[0];
  }, [selectedArchetypeId]);

  // Load archetype preset
  const handleSelectArchetype = (archetype: VesselArchetype) => {
    setSelectedArchetypeId(archetype.id);
    setVlsfoTonnes(archetype.defaultVlsfoTonnes);
    setMgoTonnes(archetype.defaultMgoTonnes);
    setLngTonnes(archetype.defaultLngTonnes);
    setBioLngTonnes(archetype.defaultBioLngTonnes);
    setBioLngCi(archetype.defaultBioLngCi);
    setShareThirdCountryVoyages(archetype.defaultShareThirdCountryVoyages);
  };

  const assumptionsVersion = useAssumptionsVersion();

  // Perform live exposure calculation
  const calculationResult = useMemo(() => {
    const input: VesselCalculationInput = {
      vlsfoTonnes,
      mgoTonnes,
      lngTonnes,
      bioLngTonnes,
      bioLngCi,
      targetYear,
      consecutiveYearsNonCompliant: consecutiveYears,
      shareThirdCountryVoyages,
    };
    return calculateVesselExposure(input);
  }, [vlsfoTonnes, mgoTonnes, lngTonnes, bioLngTonnes, bioLngCi, targetYear, consecutiveYears, shareThirdCountryVoyages, assumptionsVersion]);

  // 1-Click trade builder
  const handleTradeBuilder = () => {
    const volumeMwh = Math.max(1000, Math.round(calculationResult.bioLngRequiredNeg100Mwh || 10000));
    const url = buildDealUrl({
      marketId: 'FUELEU',
      originCountry: 'NL',
      feedstock: 'manure',
      ci: bioLngCi,
      volume: volumeMwh,
      counterparty: `${activeArchetype.name} Offtake`,
      legalEntityName: `${activeArchetype.name} Offtake`,
      complianceYear: targetYear,
    });
    navigate(url);
  };

  // Export audit summary to clipboard
  const handleCopyAudit = () => {
    const summary = `================================================================================
FUELEU MARITIME SINGLE-VESSEL EXPOSURE AUDIT
REGULATION (EU) 2023/1805 COMPLIANCE ASSESSMENT
================================================================================
VESSEL ARCHETYPE: ${activeArchetype.name}
SEGMENT: ${activeArchetype.segment}
DEADWEIGHT / CAPACITY: ${activeArchetype.dwtOrTeu}
COMPLIANCE TARGET YEAR: ${targetYear} (Target GHGIE: ${calculationResult.targetGhgie.toFixed(2)} gCO2e/MJ)
CONSECUTIVE NON-COMPLIANT YEARS: ${consecutiveYears}

FUEL INTAKE (EU SCOPE):
- VLSFO: ${vlsfoTonnes.toLocaleString()} tonnes (${LHV_VLSFO_MJ_PER_TONNE.toLocaleString()} MJ/t, ${FUELEU_VLSFO_WTW.toFixed(2)} g/MJ WtW, Annex II HFO class)
- MGO: ${mgoTonnes.toLocaleString()} tonnes (${LHV_MGO_MJ_PER_TONNE.toLocaleString()} MJ/t, ${FUELEU_MGO_WTW.toFixed(2)} g/MJ WtW)
- Fossil LNG: ${lngTonnes.toLocaleString()} tonnes (49,100 MJ/t, ${fossilLngWtw().toFixed(2)} g/MJ WtW incl. 1.7% slip, dual-fuel slow-speed Otto)
- Bio-LNG: ${bioLngTonnes.toLocaleString()} tonnes (49,100 MJ/t, CI = ${bioLngCi} g/MJ)

CALCULATED COMPLIANCE METRICS:
- Total Energy Burn: ${(calculationResult.totalEnergyMwh / 1000).toFixed(2)} GWh (${calculationResult.totalEnergyMj.toLocaleString()} MJ)
- Weighted Achieved GHGIE: ${calculationResult.weightedGhgie.toFixed(2)} gCO2e/MJ
- Compliance Balance: ${calculationResult.complianceBalanceTco2e > 0 ? '+' : ''}${calculationResult.complianceBalanceTco2e.toFixed(1)} tCO2e (${calculationResult.isOverCompliant ? 'SURPLUS' : 'DEFICIT'})
- Statutory Penalty (Year 1): €${Math.round(calculationResult.statutoryPenaltyY1Eur).toLocaleString()}
- Statutory Penalty (Next consecutive year, ×${(1 + consecutiveYears / 10).toFixed(1)}): €${Math.round(calculationResult.statutoryPenaltyY2Eur).toLocaleString()}
- Required Bio-LNG (CI -100 to neutralise): ${calculationResult.bioLngRequiredNeg100Tonnes.toFixed(1)} tonnes (${Math.round(calculationResult.bioLngRequiredNeg100Mwh).toLocaleString()} MWh)

DUAL COMMERCIAL COMPLIANCE PATHWAYS:
* Pathway A (Physical Bio-LNG):
  - Client Savings: €${Math.round(calculationResult.physicalSavingsEur).toLocaleString()}
  - Desk Margin (internal): €${Math.round(calculationResult.physicalTradingMarginEur).toLocaleString()}
* Pathway B (Article 21 Pooling):
  - Client Savings: €${Math.round(calculationResult.poolingSavingsEur).toLocaleString()}
  - Desk Margin (internal): €${Math.round(calculationResult.poolingArrangementMarginEur).toLocaleString()}
================================================================================`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    showToast('Vessel Exposure Dossier copied to clipboard!', 'SUCCESS');
    setTimeout(() => setCopied(false), 2500);
  };

  const isSurplus = calculationResult.isOverCompliant;

  const nextLabel: Record<CalcStep, string> = {
    1: 'Next: Fuel burn',
    2: 'Next: Regulation',
    3: 'See summary',
    4: '',
  };

  const stepSummary: Record<CalcStep, string> = {
    1: `${activeArchetype.name.split(' (')[0]} · ${activeArchetype.segment} · ${activeArchetype.dwtOrTeu.split(' / ')[0]}`,
    2: `VLSFO ${vlsfoTonnes.toLocaleString()} t · MGO ${mgoTonnes.toLocaleString()} t · LNG ${lngTonnes.toLocaleString()} t · Bio-LNG ${bioLngTonnes.toLocaleString()} t at ${bioLngCi} g/MJ`,
    3: `${targetYear} target ${calculationResult.targetGhgie.toFixed(2)} g/MJ · ${ESCALATION_LABELS[consecutiveYears]} · ${Math.round(shareThirdCountryVoyages * 100)}% third-country`,
    4: '',
  };

  const stepActions = (current: CalcStep) => (
    <div className="fva-step-actions">
      <button type="button" className="btn btn-primary" onClick={() => goToStep((current + 1) as CalcStep)}>
        {nextLabel[current]} <ArrowRight size={14} />
      </button>
      <div className="fva-estimate num" aria-live="polite">
        <span className="fva-estimate-label">Current estimate</span>
        <span className={isSurplus ? 'fva-pos' : 'fva-neg'}>
          {calculationResult.complianceBalanceTco2e > 0 ? '+' : ''}
          {calculationResult.complianceBalanceTco2e.toFixed(1)} tCO₂e
        </span>
        <span className="fva-estimate-sep">·</span>
        <span className={isSurplus ? 'fva-pos' : 'fva-neg'}>
          {isSurplus ? '€0' : `€${Math.round(calculationResult.statutoryPenaltyY1Eur).toLocaleString()}`} penalty
        </span>
      </div>
    </div>
  );

  const renderBody = (id: CalcStep) => {
    switch (id) {
      case 1:
        return (
          <>
            <div className="fva-section-head">
              <span>Select Vessel Archetype Preset</span>
              <span>7 Calibrated Ships · Regulation (EU) 2023/1805 Benchmark</span>
            </div>

            <div className="fva-vessels" role="radiogroup" aria-label="Vessel archetype">
              <div className="fva-vessel-cols fva-vessel-headrow" aria-hidden="true">
                <span />
                <span>Vessel</span>
                <span>Size</span>
                <span className="fva-num-col fva-vessel-optional">VLSFO</span>
                <span className="fva-num-col fva-vessel-optional">MGO</span>
                <span className="fva-num-col fva-vessel-optional">LNG</span>
                <span className="fva-num-col">Third-country</span>
              </div>
              {VESSEL_ARCHETYPES.map((archetype) => {
                const isSelected = archetype.id === selectedArchetypeId;
                return (
                  <button
                    key={archetype.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectArchetype(archetype)}
                    className={`fva-vessel-cols fva-vessel-row ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="fva-radio" />
                    <span className="fva-vessel-text">
                      <div className="fva-vessel-name" title={archetype.name}>{archetype.name.split(' (')[0]}</div>
                      <div className="fva-vessel-segment">{archetype.segment}</div>
                    </span>
                    <span className="fva-vessel-cell num">{archetype.dwtOrTeu.split(' / ')[0]}</span>
                    <span className="fva-vessel-cell fva-num-col fva-vessel-optional num">{archetype.defaultVlsfoTonnes.toLocaleString()} t</span>
                    <span className="fva-vessel-cell fva-num-col fva-vessel-optional num">{archetype.defaultMgoTonnes.toLocaleString()} t</span>
                    <span className="fva-vessel-cell fva-num-col fva-vessel-optional num">{archetype.defaultLngTonnes.toLocaleString()} t</span>
                    <span className="fva-vessel-cell fva-num-col num">{Math.round(archetype.defaultShareThirdCountryVoyages * 100)}%</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Archetype Context Note */}
            <div className="fva-context">
              <strong>{activeArchetype.name}:</strong> {activeArchetype.description} Hubs: {activeArchetype.keyPorts.slice(0, 3).join(', ')}.
            </div>

            {stepActions(1)}
          </>
        );

      case 2:
        return (
          <>
            <div className="fva-section-head">
              <span>
                Annual Fuel Burn Parameters · defaults from <span className="fva-ink">{activeArchetype.name}</span>
              </span>
              <button type="button" onClick={() => handleSelectArchetype(activeArchetype)} className="btn btn-secondary fva-small-btn">
                <RotateCcw size={13} /> Reset
              </button>
            </div>

            {/* VLSFO Tonnes Slider & Input */}
            <div className="fva-field">
              <div className="fva-field-row">
                <span className="fva-label">VLSFO Consumption (tonnes):</span>
                <input
                  type="number"
                  value={vlsfoTonnes}
                  onChange={(e) => setVlsfoTonnes(Math.max(0, Number(e.target.value) || 0))}
                  className="input num fva-num-input"
                  aria-label="VLSFO consumption (tonnes)"
                />
              </div>
              <input
                type="range"
                min="0"
                max="35000"
                step="500"
                value={vlsfoTonnes}
                onChange={(e) => setVlsfoTonnes(Number(e.target.value))}
                className="fva-range"
                aria-label="VLSFO consumption slider"
              />
              <span className="fva-hint num">{LHV_VLSFO_MJ_PER_TONNE.toLocaleString()} MJ/t · {FUELEU_VLSFO_WTW.toFixed(2)} gCO₂e/MJ WtW</span>
            </div>

            {/* MGO Tonnes Slider & Input */}
            <div className="fva-field">
              <div className="fva-field-row">
                <span className="fva-label">MGO / MDO Consumption (tonnes):</span>
                <input
                  type="number"
                  value={mgoTonnes}
                  onChange={(e) => setMgoTonnes(Math.max(0, Number(e.target.value) || 0))}
                  className="input num fva-num-input"
                  aria-label="MGO / MDO consumption (tonnes)"
                />
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={mgoTonnes}
                onChange={(e) => setMgoTonnes(Number(e.target.value))}
                className="fva-range"
                aria-label="MGO / MDO consumption slider"
              />
              <span className="fva-hint num">{LHV_MGO_MJ_PER_TONNE.toLocaleString()} MJ/t · {FUELEU_MGO_WTW.toFixed(2)} gCO₂e/MJ WtW</span>
            </div>

            {/* Fossil LNG Tonnes Slider & Input */}
            <div className="fva-field">
              <div className="fva-field-row">
                <span className="fva-label">Fossil LNG Consumption (tonnes):</span>
                <input
                  type="number"
                  value={lngTonnes}
                  onChange={(e) => setLngTonnes(Math.max(0, Number(e.target.value) || 0))}
                  className="input num fva-num-input"
                  aria-label="Fossil LNG consumption (tonnes)"
                />
              </div>
              <input
                type="range"
                min="0"
                max="25000"
                step="500"
                value={lngTonnes}
                onChange={(e) => setLngTonnes(Number(e.target.value))}
                className="fva-range"
                aria-label="Fossil LNG consumption slider"
              />
              <span className="fva-hint num">49,100 MJ/t · {fossilLngWtw().toFixed(2)} gCO₂e/MJ WtW (incl. 1.7% slip)</span>
            </div>

            {/* Bio-LNG Blend Tonnes Slider & Input */}
            <div className="fva-subpanel">
              <div className="fva-field">
                <div className="fva-field-row">
                  <span className="fva-label pos">Bio-LNG Blend (tonnes):</span>
                  <input
                    type="number"
                    value={bioLngTonnes}
                    onChange={(e) => setBioLngTonnes(Math.max(0, Number(e.target.value) || 0))}
                    className="input num fva-num-input pos"
                    aria-label="Bio-LNG blend (tonnes)"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={bioLngTonnes}
                  onChange={(e) => setBioLngTonnes(Number(e.target.value))}
                  className="fva-range"
                  aria-label="Bio-LNG blend slider"
                />
              </div>

              {/* Bio-LNG Carbon Intensity */}
              <div className="fva-field">
                <div className="fva-field-row">
                  <span className="fva-label">Bio-LNG Substrate Carbon Intensity:</span>
                  <div className="fva-ci-input">
                    <input
                      type="number"
                      value={bioLngCi}
                      onChange={(e) => setBioLngCi(Number(e.target.value))}
                      className="input num"
                      aria-label="Bio-LNG substrate carbon intensity (g/MJ)"
                    />
                    <span className="fva-label">g/MJ</span>
                  </div>
                </div>
                <span className="fva-hint">Default -100 gCO₂e/MJ reflects manure biomethane (RED-certified mass balance CI)</span>
              </div>
            </div>

            {stepActions(2)}
          </>
        );

      case 3:
        return (
          <>
            <div className="fva-settings">
              <label className="fva-field">
                <span className="fva-label">Compliance Year</span>
                <select value={targetYear} onChange={(e) => setTargetYear(Number(e.target.value))} className="input">
                  {Object.entries(COMPLIANCE_YEAR_LABELS).map(([year, label]) => (
                    <option key={year} value={year}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="fva-field">
                <span className="fva-label">Escalation Multiplier</span>
                <select value={consecutiveYears} onChange={(e) => setConsecutiveYears(Number(e.target.value))} className="input">
                  {Object.entries(ESCALATION_LABELS).map(([years, label]) => (
                    <option key={years} value={years}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="fva-field full">
                <span className="fva-label">Energy on voyages to/from third-country ports (%) — Art. 2(1)(d)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(shareThirdCountryVoyages * 100)}
                  onChange={(e) => setShareThirdCountryVoyages(Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100)}
                  className="input num fva-num-input"
                />
                <span className="fva-hint">Counted at 50% in scope; intra-EU voyages and at-berth energy count 100%.</span>
              </label>
            </div>

            {stepActions(3)}
          </>
        );

      case 4:
        return (
          <>
            {/* Key Vessel Compliance Audit */}
            <section className="fva-card">
              <div className="fva-card-head">
                <h3 className="fva-title">
                  <Anchor size={16} /> Compliance Audit &amp; Statutory Exposure
                </h3>
                <span className={`chip ${isSurplus ? 'chip-pos' : 'chip-neg'}`}>
                  {isSurplus ? 'OVER-COMPLIANT (SURPLUS)' : 'NON-COMPLIANT (DEFICIT)'}
                </span>
              </div>

              {/* 4 Output KPI Tiles */}
              <div className="fva-kpis">
                <div className="fva-kpi">
                  <span className="fva-kpi-label">Total Energy</span>
                  <div className="fva-kpi-value num">{(calculationResult.totalEnergyMwh / 1000).toFixed(1)} GWh</div>
                  <div className="fva-kpi-sub num">{(calculationResult.totalEnergyMj / 1000000).toFixed(0)} GJ</div>
                </div>

                <div className="fva-kpi">
                  <span className="fva-kpi-label">Achieved GHGIE</span>
                  <div className={`fva-kpi-value num ${calculationResult.weightedGhgie <= calculationResult.targetGhgie ? 'fva-pos' : 'fva-warn'}`}>
                    {calculationResult.weightedGhgie.toFixed(2)}
                  </div>
                  <div className="fva-kpi-sub num">Target: {calculationResult.targetGhgie.toFixed(2)} g/MJ</div>
                </div>

                <div className="fva-kpi">
                  <span className="fva-kpi-label">Compliance Balance</span>
                  <div className={`fva-kpi-value num ${isSurplus ? 'fva-pos' : 'fva-neg'}`}>
                    {calculationResult.complianceBalanceTco2e > 0 ? '+' : ''}
                    {calculationResult.complianceBalanceTco2e.toFixed(1)} t
                  </div>
                  <div className="fva-kpi-sub num">tCO₂e balance</div>
                </div>

                <div className="fva-kpi">
                  <span className="fva-kpi-label">Statutory Penalty</span>
                  <div className={`fva-kpi-value num ${isSurplus ? 'fva-pos' : 'fva-neg'}`}>
                    {isSurplus ? '€0' : `€${Math.round(calculationResult.statutoryPenaltyY1Eur).toLocaleString()}`}
                  </div>
                  <div className="fva-kpi-sub num">
                    {consecutiveYears > 1 ? `Yr ${consecutiveYears} escalated` : '€2,400/t VLSFO-eq'}
                  </div>
                </div>
              </div>

              {/* Neutralisation Requirement Banner */}
              {!isSurplus && (
                <div className="fva-banner">
                  <div className="fva-banner-label">
                    <Flame size={16} /> Deficit Neutralisation with Manure Bio-LNG (CI -100):
                  </div>
                  <div className="fva-banner-value">
                    <div className="num">{calculationResult.bioLngRequiredNeg100Tonnes.toFixed(1)} tonnes</div>
                    <div className="fva-kpi-sub num">
                      {Math.round(calculationResult.bioLngRequiredNeg100Mwh).toLocaleString()} MWh offtake
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Dual Commercial Pathway Solutions */}
            <div className="fva-pathways">
              {/* Pathway 1: Physical Bio-LNG */}
              <section className="fva-card fva-pathway">
                <div className="fva-card-head">
                  <h3 className="fva-title">
                    <Zap size={16} /> Pathway 1: Physical Bio-LNG
                  </h3>
                  <span className="chip chip-info">Art. 4, Annex I-II</span>
                </div>
                <p className="fva-desc">Physical bunkering in ARA or Med hubs. Eliminates statutory fine with negative CI fuel.</p>

                <div className="fva-kv">
                  <div className="fva-kv-row">
                    <span className="muted">Avoided Penalty:</span>
                    <span className="num">€{Math.round(calculationResult.statutoryPenaltyY1Eur).toLocaleString()}</span>
                  </div>
                  <div className="fva-kv-row pos">
                    <span>Client Net Savings:</span>
                    <span className="num">€{Math.round(calculationResult.physicalSavingsEur).toLocaleString()}</span>
                  </div>
                  <div className="fva-kv-row accent">
                    <span>Desk Margin (internal):</span>
                    <span className="num">€{Math.round(calculationResult.physicalTradingMarginEur).toLocaleString()}</span>
                  </div>
                </div>

                {!isSurplus && (
                  <button type="button" onClick={handleTradeBuilder} className="btn btn-primary fva-cta">
                    <Zap size={14} /> Structure Deal in Trade Builder
                  </button>
                )}
              </section>

              {/* Pathway 2: Article 21 Pooling */}
              <section className="fva-card fva-pathway">
                <div className="fva-card-head">
                  <h3 className="fva-title pos">
                    <ShieldCheck size={16} /> Pathway 2: Article 21 Pooling
                  </h3>
                  <span className="chip chip-pos">Article 21</span>
                </div>
                <p className="fva-desc">
                  {isSurplus
                    ? 'Monetise surplus compliance balance by selling units into Desk compliance pool.'
                    : 'Bilateral compliance pool transfer. No physical bunkering or vessel retrofit needed.'}
                </p>

                <div className="fva-kv">
                  <div className="fva-kv-row">
                    <span className="muted">Pool Units:</span>
                    <span className="num">{Math.abs(calculationResult.complianceBalanceTco2e).toFixed(1)} tCO₂e</span>
                  </div>
                  <div className="fva-kv-row pos">
                    <span>{isSurplus ? 'Pool Revenue:' : 'Client Net Savings:'}</span>
                    <span className="num">€{Math.round(calculationResult.poolingSavingsEur).toLocaleString()}</span>
                  </div>
                  <div className="fva-kv-row accent">
                    <span>Desk Arrangement Fee:</span>
                    <span className="num">€{Math.round(calculationResult.poolingArrangementMarginEur).toLocaleString()}</span>
                  </div>
                </div>

                <button type="button" onClick={handleCopyAudit} className="btn btn-secondary fva-cta">
                  {copied ? <Check size={14} className="fva-pos" /> : <Copy size={14} />}
                  {copied ? 'Dossier Copied!' : 'Export Vessel Compliance Dossier'}
                </button>
              </section>
            </div>

            {/* Pathway pricing assumptions (shared by both pathways) */}
            <AssumptionsStrip keys={FUELEU_PATHWAY_ASSUMPTIONS} />

            <div className="fva-step-actions">
              <button type="button" className="btn btn-secondary" onClick={() => goToStep(1)}>
                <RotateCcw size={14} /> Start with another vessel
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="fva">
      <FlowSteps
        steps={CALC_STEPS.map(({ id, label }) => ({ id, label, summary: stepSummary[id] }))}
        current={step}
        onSelect={goToStep}
        renderBody={renderBody}
        ariaLabel="Vessel calculator steps"
      />
    </div>
  );
}
