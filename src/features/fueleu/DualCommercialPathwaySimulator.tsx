import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { FUELEU_TARGET_2025, FUELEU_TARGET_2030 } from '../../domain/fueleu/calculator';
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
import { getAssumption, fuelEuPoolSpreadEurPerTco2e } from '../../domain/assumptions/registry';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { AssumptionsStrip } from '../../shared/components/AssumptionsStrip';

export function DualCommercialPathwaySimulator() {
  const navigate = useNavigate();

  // Deficit volume slider in tCO2e
  const [simulatedDeficitTco2e, setSimulatedDeficitTco2e] = useState<number>(25000);
  const [bioLngCi, setBioLngCi] = useState<number>(-100);
  const [targetYear, setTargetYear] = useState<2025 | 2030>(2025);
  const [consecutiveYears, setConsecutiveYears] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  useAssumptionsVersion();

  // Economic formulas
  // Penalty: €2,400 / tonne VLSFO-eq
  // 1 tonne VLSFO = 41,000 MJ = 11.38889 MWh
  // 1 tCO2e deficit at 91.16 g/MJ = 1e6 g / (91.16 * 41,000) = 0.26755 tonnes VLSFO-eq
  // Penalty per tCO2e = 0.26755 * €2,400 = €642.13 / tCO2e
  const penaltyMultiplier = 1 + (consecutiveYears - 1) / 10;
  const statutoryPenaltyEur = simulatedDeficitTco2e * 64213 * penaltyMultiplier / 100;

  // Pathway 1: Physical Bio-LNG Bunkering (Article 20)
  // Requisite Bio-LNG energy: 1 tCO2e / (Target - CI)
  const targetGhgie = targetYear === 2030 ? FUELEU_TARGET_2030 : FUELEU_TARGET_2025;
  const deltaCi = targetGhgie - bioLngCi;
  const requiredBioLngMwh = (simulatedDeficitTco2e * 1000000 / deltaCi) / 3600;
  const requiredBioLngTonnes = (simulatedDeficitTco2e * 1000000 / deltaCi) / 49100;

  const bioLngPremium = getAssumption('fueleu.bioLngPremiumEurPerMwh');
  const physicalBioLngPremiumCost = requiredBioLngMwh * bioLngPremium;
  const physicalClientSavingsEur = Math.max(0, statutoryPenaltyEur - physicalBioLngPremiumCost);
  const physicalDeskMarginEur = requiredBioLngMwh * getAssumption('fueleu.physicalDeskMarginEurPerMwh');

  // Pathway 2: Article 21 Compliance Pooling
  // Client pays the desk offer; the surplus holder receives the bid; the desk keeps the spread
  const poolOffer = getAssumption('fueleu.poolBuyPriceEurPerTco2e');
  const poolingCostToClientEur = simulatedDeficitTco2e * poolOffer;
  const poolingClientSavingsEur = Math.max(0, statutoryPenaltyEur - poolingCostToClientEur);
  const poolingProviderRevenueEur = simulatedDeficitTco2e * getAssumption('fueleu.poolSellPriceEurPerTco2e');
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
INSTITUTIONAL BRIEFING: DUAL COMMERCIAL PATHWAYS UNDER FUELEU MARITIME
REGULATION (EU) 2023/1805 (ARTICLE 20 vs ARTICLE 21)
================================================================================
SIMULATED DEFICIT: ${simulatedDeficitTco2e.toLocaleString()} tCO2e
TARGET COMPLIANCE YEAR: ${targetYear} (Target GHGIE: ${targetGhgie.toFixed(2)} gCO2e/MJ)
STATUTORY PENALTY EXPOSURE (DEFAULT INACTION): €${Math.round(statutoryPenaltyEur).toLocaleString()}

1. PATHWAY A: PHYSICAL BIO-LNG BUNKERING (ARTICLE 20)
--------------------------------------------------------------------------------
- Supply: ISCC EU Mass Balance Certified Bio-LNG (CI = ${bioLngCi} gCO2e/MJ)
- Volume: ${Math.round(requiredBioLngTonnes).toLocaleString()} tonnes (${Math.round(requiredBioLngMwh).toLocaleString()} MWh)
- Bunkering Hubs: Rotterdam, Antwerp, Zeebrugge, Marseille, Barcelona
- Statutory Penalty Avoided: €${Math.round(statutoryPenaltyEur).toLocaleString()}
- Total Fuel Premium Cost: €${Math.round(physicalBioLngPremiumCost).toLocaleString()}
- Client Net Savings: €${Math.round(physicalClientSavingsEur).toLocaleString()} (${((physicalClientSavingsEur / statutoryPenaltyEur) * 100).toFixed(1)}% savings)
- Desk Trading Margin: €${Math.round(physicalDeskMarginEur).toLocaleString()}

2. PATHWAY B: ARTICLE 21 COMPLIANCE POOLING
--------------------------------------------------------------------------------
- Mechanism: Bilateral compliance pool transfer with over-compliant carriers (CMA CGM, ZIM, Ferry lines)
- Pool Rate to Client: €${poolOffer.toFixed(2)} / tCO2e (vs statutory €642.13 / tCO2e at 91.16 g/MJ)
- Cost to Client: €${Math.round(poolingCostToClientEur).toLocaleString()}
- Client Net Savings: €${Math.round(poolingClientSavingsEur).toLocaleString()} (${((poolingClientSavingsEur / statutoryPenaltyEur) * 100).toFixed(1)}% savings)
- Desk Pool Arrangement Margin: €${Math.round(poolingDeskMarginEur).toLocaleString()}
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
            Shipping operators facing FuelEU Maritime non-compliance fines have two statutory routes to eliminate exposure: physically bunkering negative-CI Bio-LNG (Article 20) or purchasing pooled compliance surplus from over-compliant fleets (Article 21).
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
              <span className="num" style={{ fontWeight: 600 }}>Year {consecutiveYears} ({(penaltyMultiplier * 100).toFixed(0)}%)</span>
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
              Paying statutory financial penalty directly to the administering Member State registry via Thetis-MRV.
            </div>

            <div style={{ border: '1px solid var(--color-divider)', padding: '10px', backgroundColor: 'var(--color-panel-header)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Statutory Rate:</span>
                <span className="num">€2,400 / t VLSFO-eq</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mut">Effective CI Cost:</span>
                <span className="num">€642.13 / tCO₂e</span>
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
                <span className="mut">Desk Margin:</span>
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
              <span className="chip chip-info">Article 20</span>
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
                <span>Desk Trading Margin:</span>
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
              Bilateral compliance pool matching deficit vessels with over-compliant LNG fleets in Thetis-MRV.
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
                <span>Desk Arrangement Fee:</span>
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
