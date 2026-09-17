import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VESSEL_ARCHETYPES,
  calculateVesselExposure,
  FUELEU_TARGET_2025,
  FUELEU_TARGET_2030,
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
  Copy
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';

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
  const [targetYear, setTargetYear] = useState<2025 | 2030>(2025);
  const [consecutiveYears, setConsecutiveYears] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

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
  };

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
    };
    return calculateVesselExposure(input);
  }, [vlsfoTonnes, mgoTonnes, lngTonnes, bioLngTonnes, bioLngCi, targetYear, consecutiveYears]);

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
- VLSFO: ${vlsfoTonnes.toLocaleString()} tonnes (41,000 MJ/t, 91.16 g/MJ)
- MGO: ${mgoTonnes.toLocaleString()} tonnes (42,700 MJ/t, 91.16 g/MJ)
- Fossil LNG: ${lngTonnes.toLocaleString()} tonnes (49,100 MJ/t, 74.50 g/MJ)
- Bio-LNG: ${bioLngTonnes.toLocaleString()} tonnes (49,100 MJ/t, CI = ${bioLngCi} g/MJ)

CALCULATED COMPLIANCE METRICS:
- Total Energy Burn: ${(calculationResult.totalEnergyMwh / 1000).toFixed(2)} GWh (${calculationResult.totalEnergyMj.toLocaleString()} MJ)
- Weighted Achieved GHGIE: ${calculationResult.weightedGhgie.toFixed(2)} gCO2e/MJ
- Compliance Balance: ${calculationResult.complianceBalanceTco2e > 0 ? '+' : ''}${calculationResult.complianceBalanceTco2e.toFixed(1)} tCO2e (${calculationResult.isOverCompliant ? 'SURPLUS' : 'DEFICIT'})
- Statutory Penalty (Year 1): €${Math.round(calculationResult.statutoryPenaltyY1Eur).toLocaleString()}
- Statutory Penalty (Year 2 with multiplier): €${Math.round(calculationResult.statutoryPenaltyY2Eur).toLocaleString()}
- Required Bio-LNG (CI -100 to neutralise): ${calculationResult.bioLngRequiredNeg100Tonnes.toFixed(1)} tonnes (${Math.round(calculationResult.bioLngRequiredNeg100Mwh).toLocaleString()} MWh)

DUAL COMMERCIAL COMPLIANCE PATHWAYS:
* Pathway A (Physical Bio-LNG):
  - Client Savings: €${Math.round(calculationResult.physicalSavingsEur).toLocaleString()}
  - Desk Margin: €${Math.round(calculationResult.physicalTradingMarginEur).toLocaleString()}
* Pathway B (Article 21 Pooling):
  - Client Savings: €${Math.round(calculationResult.poolingSavingsEur).toLocaleString()}
  - Desk Margin: €${Math.round(calculationResult.poolingArrangementMarginEur).toLocaleString()}
================================================================================`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    showToast('Vessel Exposure Dossier copied to clipboard!', 'SUCCESS');
    setTimeout(() => setCopied(false), 2500);
  };

  const isSurplus = calculationResult.isOverCompliant;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 18px' }}>
      {/* Archetype Quick-Select Ribbon */}
      <div
        style={{
          border: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Ship size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="eyebrow" style={{ fontSize: '11px', color: 'var(--color-text)', fontWeight: 700 }}>
              Select Vessel Archetype Preset
            </span>
          </div>
          <span className="subttl" style={{ fontSize: '11px' }}>
            7 Calibrated Ships · Regulation (EU) 2023/1805 Benchmark
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
          {VESSEL_ARCHETYPES.map((archetype) => {
            const isSelected = archetype.id === selectedArchetypeId;
            return (
              <button
                key={archetype.id}
                type="button"
                onClick={() => handleSelectArchetype(archetype)}
                className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  height: '60px',
                  minWidth: '0',
                }}
              >
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={archetype.name}>
                    {archetype.name.split(' (')[0]}
                  </div>
                  <div className="subttl" style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? 'rgba(255,255,255,0.8)' : undefined }}>
                    {archetype.segment}
                  </div>
                </div>
                <div className="num" style={{ fontSize: '10px', fontWeight: 600, color: isSelected ? '#ffffff' : 'var(--color-accent)' }}>
                  {archetype.dwtOrTeu.split(' / ')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Archetype Context Note */}
        <div style={{ paddingTop: '6px', borderTop: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
          <div className="subttl">
            <strong style={{ color: 'var(--color-text)' }}>{activeArchetype.name}:</strong> {activeArchetype.description}
          </div>
          <div className="subttl num" style={{ fontSize: '11px' }}>
            Hubs: {activeArchetype.keyPorts.slice(0, 3).join(', ')}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Controls vs Real-Time Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
        {/* Left Column: Interactive Fuel Consumption Inputs */}
        <div
          style={{
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-divider)' }}>
            <span className="eyebrow" style={{ fontSize: '11px', color: 'var(--color-text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={13} style={{ color: 'var(--color-accent)' }} /> Annual Fuel Burn Parameters
            </span>
            <button
              type="button"
              onClick={() => handleSelectArchetype(activeArchetype)}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '2px 6px', height: '24px' }}
            >
              <RotateCcw size={11} style={{ marginRight: '3px' }} /> Reset
            </button>
          </div>

          {/* VLSFO Tonnes Slider & Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">VLSFO Consumption (tonnes):</span>
              <input
                type="number"
                value={vlsfoTonnes}
                onChange={(e) => setVlsfoTonnes(Math.max(0, Number(e.target.value) || 0))}
                className="input num"
                style={{ width: '90px', height: '26px', fontSize: '12px', textAlign: 'right' }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="35000"
              step="500"
              value={vlsfoTonnes}
              onChange={(e) => setVlsfoTonnes(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <span className="subttl num" style={{ fontSize: '10px' }}>41,000 MJ/t · 91.16 gCO₂e/MJ baseline</span>
          </div>

          {/* MGO Tonnes Slider & Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">MGO / MDO Consumption (tonnes):</span>
              <input
                type="number"
                value={mgoTonnes}
                onChange={(e) => setMgoTonnes(Math.max(0, Number(e.target.value) || 0))}
                className="input num"
                style={{ width: '90px', height: '26px', fontSize: '12px', textAlign: 'right' }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={mgoTonnes}
              onChange={(e) => setMgoTonnes(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <span className="subttl num" style={{ fontSize: '10px' }}>42,700 MJ/t · 91.16 gCO₂e/MJ baseline</span>
          </div>

          {/* Fossil LNG Tonnes Slider & Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span className="mut">Fossil LNG Consumption (tonnes):</span>
              <input
                type="number"
                value={lngTonnes}
                onChange={(e) => setLngTonnes(Math.max(0, Number(e.target.value) || 0))}
                className="input num"
                style={{ width: '90px', height: '26px', fontSize: '12px', textAlign: 'right' }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="25000"
              step="500"
              value={lngTonnes}
              onChange={(e) => setLngTonnes(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <span className="subttl num" style={{ fontSize: '10px' }}>49,100 MJ/t · 74.50 gCO₂e/MJ baseline (with slip)</span>
          </div>

          {/* Bio-LNG Blend Tonnes Slider & Input */}
          <div style={{ border: '1px solid var(--color-divider)', padding: '10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-status-pos-text)' }}>Bio-LNG Blend (tonnes):</span>
              <input
                type="number"
                value={bioLngTonnes}
                onChange={(e) => setBioLngTonnes(Math.max(0, Number(e.target.value) || 0))}
                className="input num"
                style={{ width: '90px', height: '26px', fontSize: '12px', textAlign: 'right', color: 'var(--color-status-pos-text)', fontWeight: 700 }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="5000"
              step="50"
              value={bioLngTonnes}
              onChange={(e) => setBioLngTonnes(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />

            {/* Bio-LNG Carbon Intensity */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', paddingTop: '4px' }}>
              <span className="mut">Bio-LNG Substrate Carbon Intensity:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  value={bioLngCi}
                  onChange={(e) => setBioLngCi(Number(e.target.value))}
                  className="input num"
                  style={{ width: '60px', height: '24px', fontSize: '11px', textAlign: 'right', fontWeight: 600 }}
                />
                <span className="subttl">g/MJ</span>
              </div>
            </div>
            <span className="subttl" style={{ fontSize: '10px' }}>
              Default -100 gCO₂e/MJ reflects audited manure biomethane
            </span>
          </div>

          {/* Regulatory Settings: Target Year & Multiplier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span className="eyebrow" style={{ fontSize: '10px' }}>Compliance Year</span>
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value) as 2025 | 2030)}
                className="input"
                style={{ height: '30px', fontSize: '11px', padding: '0 6px' }}
              >
                <option value={2025}>2025 (89.34 g/MJ, -2%)</option>
                <option value={2030}>2030 (85.69 g/MJ, -6%)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span className="eyebrow" style={{ fontSize: '10px' }}>Escalation Multiplier</span>
              <select
                value={consecutiveYears}
                onChange={(e) => setConsecutiveYears(Number(e.target.value))}
                className="input"
                style={{ height: '30px', fontSize: '11px', padding: '0 6px' }}
              >
                <option value={1}>Year 1 (1.00×)</option>
                <option value={2}>Year 2 (1.10×)</option>
                <option value={3}>Year 3 (1.20×)</option>
                <option value={4}>Year 4+ (1.30×)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Results & Dual Commercial Pathways */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Key Vessel Compliance Audit Card */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Anchor size={14} style={{ color: 'var(--color-accent)' }} />
                <h3 className="ptitle" style={{ fontSize: '14px', margin: 0 }}>
                  Compliance Audit &amp; Statutory Exposure
                </h3>
              </div>
              <span className={`chip ${isSurplus ? 'chip-pos' : 'chip-neg'}`} style={{ fontSize: '11px' }}>
                {isSurplus ? 'OVER-COMPLIANT (SURPLUS)' : 'NON-COMPLIANT (DEFICIT)'}
              </span>
            </div>

            {/* 4 Output KPI Tiles */}
            <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', border: '1px solid var(--color-divider)' }}>
              <div>
                <span className="eyebrow">Total Energy</span>
                <div className="big num" style={{ fontSize: '18px' }}>
                  {(calculationResult.totalEnergyMwh / 1000).toFixed(1)} GWh
                </div>
                <div className="subttl num">{(calculationResult.totalEnergyMj / 1000000).toFixed(0)} GJ</div>
              </div>

              <div>
                <span className="eyebrow">Achieved GHGIE</span>
                <div className="big num" style={{ fontSize: '18px', color: calculationResult.weightedGhgie <= calculationResult.targetGhgie ? 'var(--color-status-pos-text)' : 'var(--color-status-warn-text)' }}>
                  {calculationResult.weightedGhgie.toFixed(2)}
                </div>
                <div className="subttl num">Target: {calculationResult.targetGhgie.toFixed(2)} g/MJ</div>
              </div>

              <div>
                <span className="eyebrow">Compliance Balance</span>
                <div className="big num" style={{ fontSize: '18px', color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                  {calculationResult.complianceBalanceTco2e > 0 ? '+' : ''}
                  {calculationResult.complianceBalanceTco2e.toFixed(1)} t
                </div>
                <div className="subttl num">tCO₂e balance</div>
              </div>

              <div>
                <span className="eyebrow">Statutory Penalty</span>
                <div className="big num" style={{ fontSize: '18px', color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                  {isSurplus ? '€0' : `€${Math.round(calculationResult.statutoryPenaltyY1Eur).toLocaleString()}`}
                </div>
                <div className="subttl num">
                  {consecutiveYears > 1 ? `Yr ${consecutiveYears} escalated` : '€2,400/t VLSFO-eq'}
                </div>
              </div>
            </div>

            {/* Neutralisation Requirement Banner */}
            {!isSurplus && (
              <div
                style={{
                  border: '1px solid var(--color-divider)',
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-panel-header)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={14} style={{ color: 'var(--color-accent)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    Deficit Neutralisation with Manure Bio-LNG (CI -100):
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>
                    {calculationResult.bioLngRequiredNeg100Tonnes.toFixed(1)} tonnes
                  </div>
                  <div className="subttl num">
                    {Math.round(calculationResult.bioLngRequiredNeg100Mwh).toLocaleString()} MWh offtake
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dual Commercial Pathway Solutions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Zap size={13} style={{ color: 'var(--color-accent)' }} /> Pathway 1: Physical Bio-LNG
                  </span>
                  <span className="chip chip-info">Article 20</span>
                </div>
                <div className="subttl" style={{ marginBottom: '10px' }}>
                  Physical bunkering in ARA or Med hubs. Eliminates statutory fine with negative CI fuel.
                </div>

                <div style={{ border: '1px solid var(--color-divider)', padding: '8px 10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Avoided Penalty:</span>
                    <span className="num">€{Math.round(calculationResult.statutoryPenaltyY1Eur).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '3px', borderTop: '1px solid var(--color-divider)' }}>
                    <span style={{ color: 'var(--color-status-pos-text)', fontWeight: 600 }}>Client Net Savings:</span>
                    <span className="num" style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>€{Math.round(calculationResult.physicalSavingsEur).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Desk Margin:</span>
                    <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>€{Math.round(calculationResult.physicalTradingMarginEur).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {!isSurplus && (
                <button
                  type="button"
                  onClick={handleTradeBuilder}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px', fontSize: '11px', height: '30px' }}
                >
                  <Zap size={12} /> Structure Deal in Trade Builder
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ShieldCheck size={13} style={{ color: 'var(--color-status-pos-text)' }} /> Pathway 2: Article 21 Pooling
                  </span>
                  <span className="chip chip-pos">Article 21</span>
                </div>
                <div className="subttl" style={{ marginBottom: '10px' }}>
                  {isSurplus
                    ? 'Monetise surplus compliance balance by selling units into Desk compliance pool.'
                    : 'Bilateral compliance pool transfer. No physical bunkering or vessel retrofit needed.'}
                </div>

                <div style={{ border: '1px solid var(--color-divider)', padding: '8px 10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Pool Units:</span>
                    <span className="num">{Math.abs(calculationResult.complianceBalanceTco2e).toFixed(1)} tCO₂e</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '3px', borderTop: '1px solid var(--color-divider)' }}>
                    <span style={{ color: 'var(--color-status-pos-text)', fontWeight: 600 }}>{isSurplus ? 'Pool Revenue:' : 'Client Net Savings:'}</span>
                    <span className="num" style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>€{Math.round(calculationResult.poolingSavingsEur).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Desk Arrangement Fee:</span>
                    <span className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>€{Math.round(calculationResult.poolingArrangementMarginEur).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyAudit}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px', fontSize: '11px', height: '30px' }}
              >
                {copied ? <Check size={12} style={{ color: 'var(--color-status-pos-text)' }} /> : <Copy size={12} />}
                {copied ? 'Dossier Copied!' : 'Export Vessel Compliance Dossier'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
