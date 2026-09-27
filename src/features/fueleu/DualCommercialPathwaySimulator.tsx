import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildDealUrl } from '../../domain/trade/dealParams';
import {
  FUELEU_TARGET_2025,
  FUELEU_TARGET_2030,
  FUELEU_VLSFO_WTW,
  fossilLngWtw,
  penaltyEur,
  closeDeficitWithBioLng,
  DEFAULT_LNG_ENGINE,
} from '../../domain/fueleu/calculator';
import { LngEngineType } from '../../domain/fueleu/types';
import {
  Scale,
  Zap,
  ShieldCheck,
  Coins,
  TrendingDown,
  ArrowRight,
  HelpCircle,
  FileText,
  Copy,
  Check,
  Anchor,
  Flame,
  Layers
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';
import { getAssumption, fuelEuPoolSpreadEurPerTco2e, fuelEuPoolBidPriceEurPerTco2e } from '../../domain/assumptions/registry';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { AssumptionsStrip } from '../../shared/components/AssumptionsStrip';

export function DualCommercialPathwaySimulator() {
  const navigate = useNavigate();

  // Deficit volume slider in tCO2e
  const [simulatedDeficitTco2e, setSimulatedDeficitTco2e] = useState<number>(25000);
  const [bioLngCi, setBioLngCi] = useState<number>(-100);
  const [targetYear, setTargetYear] = useState<2025 | 2030>(2025);
  const [consecutiveYears, setConsecutiveYears] = useState<number>(1);
  // Fleet actual GHG intensity (gCO2e/MJ) — the ship's own weighted-average WtW, drives the
  // statutory penalty (Annex IV Part B uses GHGIE_actual, not the fixed reference value).
  const [fleetActualGhgie, setFleetActualGhgie] = useState<number>(91.68);
  const [isLngCapable, setIsLngCapable] = useState<boolean>(false);
  const [lngEngine, setLngEngine] = useState<LngEngineType>(DEFAULT_LNG_ENGINE);
  const [copied, setCopied] = useState<boolean>(false);
  useAssumptionsVersion();

  // Economic formulas — shared with the vessel calculator engine (calculator.ts) so both screens
  // agree on the same deficit/GHGIE/displacement:
  // Penalty: Annex IV Part B — |CB| / (GHGIE_actual × 41,000 MJ/t) × €2,400 × [1 + (n−1)/10]
  const statutoryPenaltyEur = penaltyEur(simulatedDeficitTco2e, fleetActualGhgie, consecutiveYears);

  // Pathway 1: Physical Bio-LNG Bunkering — Bio-LNG displaces the fuel a real fleet would
  // otherwise burn: fossil LNG for an LNG-capable fleet, VLSFO otherwise.
  const targetGhgie = targetYear === 2030 ? FUELEU_TARGET_2030 : FUELEU_TARGET_2025;
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
  const poolOffer = getAssumption('fueleu.poolBuyPriceEurPerTco2e');
  const poolingCostToClientEur = simulatedDeficitTco2e * poolOffer;
  const poolingClientSavingsEur = Math.max(0, statutoryPenaltyEur - poolingCostToClientEur);
  const poolingProviderRevenueEur = simulatedDeficitTco2e * fuelEuPoolBidPriceEurPerTco2e();
  const poolingDeskMarginEur = simulatedDeficitTco2e * fuelEuPoolSpreadEurPerTco2e();

  const handleStructureTrade = () => {
    const url = buildDealUrl({
      marketId: 'FUELEU',
      originCountry: 'NL',
      feedstock: 'manure',
      ci: bioLngCi,
      volume: Math.max(1000, Math.round(requiredBioLngMwh)),
      counterparty: 'FuelEU Maritime Offtake Facility',
      legalEntityName: 'FuelEU Maritime Fleet Operator',
      complianceYear: targetYear,
    });
    navigate(url);
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
- Pool Rate to Client (desk offer, indicative): €${poolOffer.toFixed(2)} / tCO2e (vs estimated penalty rate €${effectivePenaltyRatePerTco2e.toFixed(2)} / tCO2e at ${fleetActualGhgie.toFixed(2)} g/MJ)
- Cost to Client: €${Math.round(poolingCostToClientEur).toLocaleString()}
- Client Net Savings (estimated): €${Math.round(poolingClientSavingsEur).toLocaleString()} (${((poolingClientSavingsEur / statutoryPenaltyEur) * 100).toFixed(1)}% savings)
- Physical Bunker Requirement: ZERO (pure financial/registry compliance)
================================================================================`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Dual Pathway Briefing copied to clipboard!', 'SUCCESS');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 18px' }}>
      {/* Overview Header Banner */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
              Strategic Advisory &amp; Structuring
            </span>
            <span className="chip chip-info">Regulation (EU) 2023/1805</span>
          </div>
          <h2 className="ptitle" style={{ fontSize: '16px', margin: '4px 0 2px' }}>
            Dual Commercial Compliance Pathways: Physical Bunkering vs. Article 21 Pooling
          </h2>
          <div className="subttl" style={{ maxWidth: '800px' }}>
            Shipping operators facing FuelEU Maritime non-compliance fines have two routes to reduce exposure: physically bunkering negative-CI Bio-LNG (Art. 4, Annex I-II) or purchasing pooled compliance surplus from over-compliant fleets (Article 21). Indicative estimate — desk assumptions.
          </div>
          <div className="subttl" style={{ maxWidth: '800px', fontStyle: 'italic', marginTop: '2px' }}>
            Desk margin figures below are internal — not for client distribution.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopyBriefing}
            className="btn btn-secondary"
            style={{ fontSize: '11px', height: '30px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            {copied ? <Check size={12} style={{ color: 'var(--color-status-pos-text)' }} /> : <Copy size={12} />}
            {copied ? 'Copied Briefing' : 'Copy Briefing'}
          </button>
          <button
            type="button"
            onClick={handleStructureTrade}
            className="btn btn-primary"
            style={{ fontSize: '11px', height: '30px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Zap size={12} /> Trade Builder
          </button>
        </div>
      </div>

      {/* Interactive Fleet Deficit Block Simulator */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-divider)' }}>
          <span className="eyebrow" style={{ fontSize: '11px', color: 'var(--color-text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={13} style={{ color: 'var(--color-accent)' }} /> Configure Fleet Deficit Block
          </span>
          <span className="subttl num" style={{ fontSize: '12px' }}>
            Default Inaction Penalty: <strong style={{ color: 'var(--color-status-neg-text)' }}>€{Math.round(statutoryPenaltyEur).toLocaleString()}</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {/* Target Compliance Year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">Target Year:</span>
              <span className="num" style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{targetYear} ({targetYear === 2025 ? '-2%' : '-6%'})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', paddingTop: '2px' }}>
              <button
                type="button"
                onClick={() => setTargetYear(2025)}
                className={`btn ${targetYear === 2025 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '28px', fontSize: '11px', padding: '0' }}
              >
                2025 (89.34)
              </button>
              <button
                type="button"
                onClick={() => setTargetYear(2030)}
                className={`btn ${targetYear === 2030 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '28px', fontSize: '11px', padding: '0' }}
              >
                2030 (85.69)
              </button>
            </div>
          </div>

          {/* Deficit Volume Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">Fleet Deficit Volume:</span>
              <span className="num" style={{ fontWeight: 700, color: 'var(--color-status-warn-text)' }}>{simulatedDeficitTco2e.toLocaleString()} tCO₂e</span>
            </div>
            <input
              type="range"
              min="1000"
              max="200000"
              step="1000"
              value={simulatedDeficitTco2e}
              onChange={(e) => setSimulatedDeficitTco2e(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }} className="subttl num">
              <span>1,000 t</span>
              <span>100,000 t</span>
              <span>200,000 t</span>
            </div>
          </div>

          {/* Bio-LNG Carbon Intensity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">Bio-LNG Substrate CI:</span>
              <span className="num" style={{ fontWeight: 700, color: 'var(--color-status-pos-text)' }}>{bioLngCi} g/MJ</span>
            </div>
            <input
              type="range"
              min="-120"
              max="20"
              step="5"
              value={bioLngCi}
              onChange={(e) => setBioLngCi(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }} className="subttl num">
              <span>-120 (Manure)</span>
              <span>-50</span>
              <span>+20 (Waste)</span>
            </div>
          </div>

          {/* Consecutive Years Multiplier */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">Escalation Vintage:</span>
              <span className="num" style={{ fontWeight: 600 }}>Year {consecutiveYears} ({((1 + (consecutiveYears - 1) / 10) * 100).toFixed(0)}%)</span>
            </div>
            <select
              value={consecutiveYears}
              onChange={(e) => setConsecutiveYears(Number(e.target.value))}
              className="input"
              style={{ height: '28px', fontSize: '11px', padding: '0 6px' }}
            >
              <option value={1}>Year 1 (0% escalation)</option>
              <option value={2}>Year 2 (+10% escalation)</option>
              <option value={3}>Year 3 (+20% escalation)</option>
              <option value={4}>Year 4+ (+30% escalation)</option>
            </select>
          </div>

          {/* Fleet Actual GHG Intensity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">Fleet Actual GHG Intensity:</span>
              <input
                type="number"
                step="0.01"
                value={fleetActualGhgie}
                onChange={(e) => setFleetActualGhgie(Math.max(0.01, Number(e.target.value) || 0))}
                className="input num"
                style={{ width: '80px', height: '26px', fontSize: '12px', textAlign: 'right' }}
              />
            </div>
            <span className="subttl num" style={{ fontSize: '10px' }}>gCO₂e/MJ (Annex IV Part B uses the fleet's own achieved intensity)</span>
          </div>

          {/* LNG-Capable Fleet Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">LNG-Capable Fleet:</span>
              <span className="num" style={{ fontWeight: 600 }}>{isLngCapable ? 'Yes' : 'No'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIsLngCapable(false)}
                className={`btn ${!isLngCapable ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '28px', fontSize: '11px', padding: '0' }}
              >
                VLSFO Fleet
              </button>
              <button
                type="button"
                onClick={() => setIsLngCapable(true)}
                className={`btn ${isLngCapable ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '28px', fontSize: '11px', padding: '0' }}
              >
                LNG Fleet
              </button>
            </div>
            {isLngCapable && (
              <select
                value={lngEngine}
                onChange={(e) => setLngEngine(e.target.value as LngEngineType)}
                className="input"
                style={{ height: '28px', fontSize: '11px', padding: '0 6px', marginTop: '2px' }}
              >
                <option value="LNG_OTTO_SS">Otto slow-speed (1.7% slip)</option>
                <option value="LNG_OTTO_MS">Otto medium-speed (3.1% slip)</option>
                <option value="LNG_DIESEL_SS">Diesel slow-speed (0.2% slip)</option>
                <option value="LBSI">Lean-burn spark-ignited (2.6% slip)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 3-Column Comparative Solution Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {/* Option 0: Statutory Inaction (Default Penalty) */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-divider)' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-status-neg-text)' }}>
                <Flame size={14} /> Statutory Inaction (Default Penalty)
              </span>
              <span className="chip chip-neg">Default</span>
            </div>
            <div className="subttl" style={{ margin: '8px 0 12px' }}>
              Paying the FuelEU penalty directly to the administering State (Art. 23(2)).
            </div>

            <div style={{ border: '1px solid var(--color-divider)', padding: '10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Statutory Rate:</span>
                <span className="num">€2,400 / t VLSFO-eq</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Effective CI Cost:</span>
                <span className="num">€{effectivePenaltyRatePerTco2e.toFixed(2)} / tCO₂e</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-divider)', fontWeight: 700, color: 'var(--color-status-neg-text)' }}>
                <span>Total Cash Penalty:</span>
                <span className="num">€{Math.round(statutoryPenaltyEur).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Client Savings:</span>
                <span className="num" style={{ color: 'var(--color-status-neg-text)' }}>€0 (100% loss)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Desk Margin (internal):</span>
                <span className="num">€0</span>
              </div>
            </div>
          </div>

          <div className="subttl" style={{ marginTop: '12px', padding: '8px', border: '1px solid var(--color-status-neg-border, #fecaca)', backgroundColor: 'var(--color-status-neg-bg, #fef2f2)', color: 'var(--color-status-neg-text, #b91c1c)', fontSize: '11px' }}>
            Inaction triggers consecutive year multipliers (Year 2: +10%, Year 3: +20%).
          </div>
        </div>

        {/* Option 1: Physical Bio-LNG Bunkering */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-divider)' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)' }}>
                <Zap size={14} /> Pathway 1: Physical Bio-LNG
              </span>
              <span className="chip chip-info">Art. 4, Annex I-II</span>
            </div>
            <div className="subttl" style={{ margin: '8px 0 12px' }}>
              Physical drop-in bunkering of Danish/Dutch manure Bio-LNG (CI = {bioLngCi} g/MJ) at Rotterdam or Antwerp.
            </div>

            <div style={{ border: '1px solid var(--color-divider)', padding: '10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Bio-LNG Volume:</span>
                <span className="num" style={{ fontWeight: 600 }}>{Math.round(requiredBioLngTonnes).toLocaleString()} t ({Math.round(requiredBioLngMwh).toLocaleString()} MWh)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Fuel Premium Cost:</span>
                <span className="num">€{Math.round(physicalBioLngPremiumCost).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-divider)', fontWeight: 700, color: 'var(--color-status-pos-text)' }}>
                <span>Client Net Savings:</span>
                <span className="num">€{Math.round(physicalClientSavingsEur).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-accent)', fontWeight: 600 }}>
                <span>Desk Trading Margin (internal):</span>
                <span className="num">€{Math.round(physicalDeskMarginEur).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStructureTrade}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px', fontSize: '11px', height: '32px' }}
          >
            <Zap size={12} /> Structure Bio-LNG Supply in Trade Builder
          </button>
        </div>

        {/* Option 2: Article 21 Pooling Mechanism */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-divider)' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-status-pos-text)' }}>
                <ShieldCheck size={14} /> Pathway 2: Article 21 Pooling
              </span>
              <span className="chip chip-pos">Article 21</span>
            </div>
            <div className="subttl" style={{ margin: '8px 0 12px' }}>
              Bilateral compliance pool matching deficit vessels with over-compliant LNG fleets, recorded via the FuelEU database (Art. 19).
            </div>

            <div style={{ border: '1px solid var(--color-divider)', padding: '10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Pool Clearing Rate:</span>
                <span className="num" style={{ fontWeight: 600 }}>€{poolOffer.toFixed(2)} / tCO₂e</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Cost to Client:</span>
                <span className="num">€{Math.round(poolingCostToClientEur).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-divider)', fontWeight: 700, color: 'var(--color-status-pos-text)' }}>
                <span>Client Net Savings:</span>
                <span className="num">€{Math.round(poolingClientSavingsEur).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-accent)', fontWeight: 600 }}>
                <span>Desk Arrangement Fee (internal):</span>
                <span className="num">€{Math.round(poolingDeskMarginEur).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyBriefing}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '12px', fontSize: '11px', height: '32px' }}
          >
            <FileText size={12} /> Copy Indicative Pool Term Sheet
          </button>
        </div>
      </div>
      <AssumptionsStrip
        keys={['fueleu.bioLngPremiumEurPerMwh', 'fueleu.physicalDeskMarginEurPerMwh', 'fueleu.poolBuyPriceEurPerTco2e', 'fueleu.poolSellPriceEurPerTco2e']}
      />
    </div>
  );
}
