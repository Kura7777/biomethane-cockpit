import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { generateForwardCurves } from '../../domain/curves/engine';
import { buildTenorDefinitions, getDefaultForwardCurveMatrix } from '../../domain/curves/forwardMarks';
import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Info,
  CheckCircle2,
  Building2,
  Leaf
} from 'lucide-react';

interface ForwardCurvesViewProps {
  quotes: PricingBookEntry[];
}

export type ForwardCommodityType =
  | 'DE_THE_MANURE'
  | 'DE_THE_CROPS'
  | 'DK_ENERGINET'
  | 'NL_TTF_WASTE'
  | 'UK_NBP_RTFO'
  | 'FR_PEG_CPB'
  | 'MULTI_HUB_COMPARE';

interface CommodityProfile {
  id: ForwardCommodityType;
  country: string;
  flag: string;
  hub: string;
  label: string;
  shortLabel: string;
  feedstock: string;
  feedstockCategory: string;
  ciScore: string;
  ciNumeric: number;
  statutoryScheme: string;
  registry: string;
  baseGreenPremium: number; // in €/MWh for 2026 prompt
  quotaEscalatorPerYear: number; // annual tightening in €/MWh
  description: string;
}

const COMMODITY_PROFILES: CommodityProfile[] = [
  {
    id: 'DE_THE_MANURE',
    country: 'DE',
    flag: '🇩🇪',
    hub: 'THE Grid (Trading Hub Europe)',
    label: 'German THE · Annex IX-A Manure (Advanced Biofuel)',
    shortLabel: '🇩🇪 DE THE (Manure IX-A)',
    feedstock: '100% Cattle / Swine Manure & Slurry',
    feedstockCategory: 'RED III Annex IX-A (Advanced)',
    ciScore: '-100 gCO₂e/MJ (Negative CI)',
    ciNumeric: -100,
    statutoryScheme: '38. BImSchV GHG Quota (Double Counting)',
    registry: 'dena Biogasregister / Nabisy UBA',
    baseGreenPremium: 109.80, // mid green premium vs TTF M+1
    quotaEscalatorPerYear: 6.50, // statutory tightening to 2030
    description: 'Physical biomethane delivered into the German Trading Hub Europe (THE) gas grid with audited Nabisy Proof of Sustainability for 38. BImSchV transport quota surrender.',
  },
  {
    id: 'DE_THE_CROPS',
    country: 'DE',
    flag: '🇩🇪',
    hub: 'THE Grid (Trading Hub Europe)',
    label: 'German THE · Energy Crops (Maize / Silage)',
    shortLabel: '🇩🇪 DE THE (Energy Crops)',
    feedstock: 'Maize Silage, Whole Crop Rye',
    feedstockCategory: 'Food & Feed Crop (RED III Cap Compliant)',
    ciScore: '+35 gCO₂e/MJ',
    ciNumeric: 35,
    statutoryScheme: '38. BImSchV Crop Cap Quota',
    registry: 'dena Biogasregister / UBA',
    baseGreenPremium: 48.00,
    quotaEscalatorPerYear: 2.20,
    description: 'German grid-injected biomethane produced from audited sustainable energy crops, subject to the German 4.4% transport crop cap.',
  },
  {
    id: 'DK_ENERGINET',
    country: 'DK',
    flag: '🇩🇰',
    hub: 'Energinet Hub (Danish Gas Grid)',
    label: 'Danish Energinet · Manure & Straw Grid Injection',
    shortLabel: '🇩🇰 DK Energinet (Danish)',
    feedstock: '80% Liquid Manure / 20% Agricultural Straw',
    feedstockCategory: 'RED III Annex IX-A & Residues',
    ciScore: '-60 gCO₂e/MJ',
    ciNumeric: -60,
    statutoryScheme: 'Danish Biomethane Support / Cross-Border EECS',
    registry: 'Energinet / Evida',
    baseGreenPremium: 88.50,
    quotaEscalatorPerYear: 5.00,
    description: 'Danish biomethane injected into the high-pressure Energinet transmission system. Fully interconnectable to German THE via Ellund / Niebüll border point.',
  },
  {
    id: 'NL_TTF_WASTE',
    country: 'NL',
    flag: '🇳🇱',
    hub: 'TTF Hub (Title Transfer Facility)',
    label: 'Dutch TTF · Organic Waste (REV / ERE Compliance)',
    shortLabel: '🇳🇱 NL TTF (REV Waste)',
    feedstock: 'Organic Food Waste & Industrial Co-substrates',
    feedstockCategory: 'RED III Annex IX-A Advanced',
    ciScore: '+12 gCO₂e/MJ',
    ciNumeric: 12,
    statutoryScheme: 'Wet milieubeheer / Regeling energie vervoer (REV)',
    registry: 'NEa REV / myVertiCer',
    baseGreenPremium: 68.00,
    quotaEscalatorPerYear: 4.80,
    description: 'Dutch grid-injected biomethane traded on Title Transfer Facility (TTF) with VertiCer Proof of Sustainability feeding Dutch ERE transport quota surrender.',
  },
  {
    id: 'UK_NBP_RTFO',
    country: 'UK',
    flag: '🇬🇧',
    hub: 'NBP Hub (National Balancing Point)',
    label: 'UK NBP · Waste Biomethane (RTFO Double Counted)',
    shortLabel: '🇬🇧 UK NBP (RTFO Waste)',
    feedstock: 'Food Waste & Sewage Sludge Digestate',
    feedstockCategory: 'RTFO Designated Waste (Double Counting)',
    ciScore: '< 18 gCO₂e/MJ',
    ciNumeric: 18,
    statutoryScheme: 'Renewable Transport Fuel Obligation (RTFO)',
    registry: 'Department for Transport ROS / GGCS',
    baseGreenPremium: 58.00,
    quotaEscalatorPerYear: 4.00,
    description: 'UK grid-injected biomethane at National Balancing Point (NBP) generating 1.9–2.0 RTFCs per kg of biomethane for domestic transport fuel compliance.',
  },
  {
    id: 'FR_PEG_CPB',
    country: 'FR',
    flag: '🇫🇷',
    hub: 'PEG Hub (Point d\'Échange de Gaz)',
    label: 'French PEG · Agricultural & CIVE (CPB Sub-Target)',
    shortLabel: '🇫🇷 FR PEG (CPB)',
    feedstock: 'Agricultural Residues & Intermediate Crops (CIVE)',
    feedstockCategory: 'Code de l\'énergie Art. L.446-24',
    ciScore: '< 25 gCO₂e/MJ',
    ciNumeric: 25,
    statutoryScheme: 'TIRUERT / Dispositif CPB (Cap: €100/MWh)',
    registry: 'EEX / Registre national CPB',
    baseGreenPremium: 40.00,
    quotaEscalatorPerYear: 3.50,
    description: 'French biomethane injected on GRDF / Teréga network, generating CPB certificates for French natural gas suppliers subject to the €100/MWh statutory ceiling.',
  },
];

export function ForwardCurvesView({ quotes }: ForwardCurvesViewProps) {
  const { state } = useAppState();
  const navigate = useNavigate();

  // Selected commodity instrument curve
  const [selectedCommodityId, setSelectedCommodityId] = useState<ForwardCommodityType>('DE_THE_MANURE');

  // Curve Book generated from current live marks
  const curveBook = useMemo(() => {
    return generateForwardCurves(state.marks, state.marks.gasIndex.mid);
  }, [state.marks]);

  const defaultMatrix = useMemo(() => getDefaultForwardCurveMatrix(), []);
  const tenorDefs = useMemo(() => buildTenorDefinitions(), []);
  const promptTtf = state.marks.gasIndex.mid ?? 38.50;

  // Active profile definition
  const activeProfile = useMemo(() => {
    return COMMODITY_PROFILES.find(p => p.id === selectedCommodityId) || COMMODITY_PROFILES[0];
  }, [selectedCommodityId]);

  // Tenor definitions for forward strip
  const tenorRows = useMemo(() => {
    const rawTenors = [
      {
        tenorId: 'M_PLUS_1',
        label: 'Prompt Month (M+1)',
        window: tenorDefs.find(t => t.tenor === 'M_PLUS_1')?.deliveryPeriod || 'Aug 2026',
        category: 'PROMPT',
        ttfBid: defaultMatrix.gasForwardCurve.M_PLUS_1?.bid ?? (promptTtf - 0.3),
        ttfOffer: defaultMatrix.gasForwardCurve.M_PLUS_1?.offer ?? (promptTtf + 0.3),
        ttfMid: defaultMatrix.gasForwardCurve.M_PLUS_1?.mid ?? promptTtf,
        yearIndex: 0,
        volume: '15 GWh',
      },
      {
        tenorId: 'M_PLUS_2',
        label: 'Prompt Month (M+2)',
        window: tenorDefs.find(t => t.tenor === 'M_PLUS_2')?.deliveryPeriod || 'Sep 2026',
        category: 'PROMPT',
        ttfBid: defaultMatrix.gasForwardCurve.M_PLUS_2?.bid ?? (promptTtf + 0.5),
        ttfOffer: defaultMatrix.gasForwardCurve.M_PLUS_2?.offer ?? (promptTtf + 1.1),
        ttfMid: defaultMatrix.gasForwardCurve.M_PLUS_2?.mid ?? (promptTtf + 0.8),
        yearIndex: 0,
        volume: '15 GWh',
      },
      {
        tenorId: 'Q1_2027',
        label: 'Q1 2027 (Winter Peak)',
        window: 'Jan 2027 – Mar 2027',
        category: 'QUARTER',
        ttfBid: defaultMatrix.gasForwardCurve.Q1?.bid ?? (promptTtf + 3.0),
        ttfOffer: defaultMatrix.gasForwardCurve.Q1?.offer ?? (promptTtf + 3.6),
        ttfMid: defaultMatrix.gasForwardCurve.Q1?.mid ?? (promptTtf + 3.3),
        yearIndex: 1,
        volume: '25 GWh',
      },
      {
        tenorId: 'Q2_2027',
        label: 'Q2 2027 (Summer Injection)',
        window: 'Apr 2027 – Jun 2027',
        category: 'QUARTER',
        ttfBid: defaultMatrix.gasForwardCurve.Q2?.bid ?? (promptTtf - 1.7),
        ttfOffer: defaultMatrix.gasForwardCurve.Q2?.offer ?? (promptTtf - 1.1),
        ttfMid: defaultMatrix.gasForwardCurve.Q2?.mid ?? (promptTtf - 1.4),
        yearIndex: 1,
        volume: '25 GWh',
      },
      {
        tenorId: 'Q3_2027',
        label: 'Q3 2027 (Summer Trough)',
        window: 'Jul 2027 – Sep 2027',
        category: 'QUARTER',
        ttfBid: defaultMatrix.gasForwardCurve.Q3?.bid ?? (promptTtf - 3.3),
        ttfOffer: defaultMatrix.gasForwardCurve.Q3?.offer ?? (promptTtf - 2.7),
        ttfMid: defaultMatrix.gasForwardCurve.Q3?.mid ?? (promptTtf - 3.0),
        yearIndex: 1,
        volume: '25 GWh',
      },
      {
        tenorId: 'Q4_2027',
        label: 'Q4 2027 (Winter Compliance)',
        window: 'Oct 2027 – Dec 2027',
        category: 'QUARTER',
        ttfBid: defaultMatrix.gasForwardCurve.Q4?.bid ?? (promptTtf + 1.3),
        ttfOffer: defaultMatrix.gasForwardCurve.Q4?.offer ?? (promptTtf + 1.9),
        ttfMid: defaultMatrix.gasForwardCurve.Q4?.mid ?? (promptTtf + 1.6),
        yearIndex: 1,
        volume: '30 GWh',
      },
      {
        tenorId: 'CAL_2027',
        label: 'Cal 2027 (Full Year Baseload)',
        window: 'Jan 2027 – Dec 2027',
        category: 'CALENDAR',
        ttfBid: curveBook.ttfGasCurve.tenors.CAL_2027?.bid ?? 33.3,
        ttfOffer: curveBook.ttfGasCurve.tenors.CAL_2027?.offer ?? 33.9,
        ttfMid: curveBook.ttfGasCurve.tenors.CAL_2027?.mid ?? 33.6,
        yearIndex: 1,
        volume: '50 GWh',
      },
      {
        tenorId: 'CAL_2028',
        label: 'Cal 2028 (Baseload Forward)',
        window: 'Jan 2028 – Dec 2028',
        category: 'CALENDAR',
        ttfBid: curveBook.ttfGasCurve.tenors.CAL_2028?.bid ?? 31.0,
        ttfOffer: curveBook.ttfGasCurve.tenors.CAL_2028?.offer ?? 31.8,
        ttfMid: curveBook.ttfGasCurve.tenors.CAL_2028?.mid ?? 31.4,
        yearIndex: 2,
        volume: '50 GWh',
      },
      {
        tenorId: 'CAL_2029',
        label: 'Cal 2029 (Baseload Forward)',
        window: 'Jan 2029 – Dec 2029',
        category: 'CALENDAR',
        ttfBid: curveBook.ttfGasCurve.tenors.CAL_2029?.bid ?? 28.5,
        ttfOffer: curveBook.ttfGasCurve.tenors.CAL_2029?.offer ?? 29.3,
        ttfMid: curveBook.ttfGasCurve.tenors.CAL_2029?.mid ?? 28.9,
        yearIndex: 3,
        volume: '50 GWh',
      },
      {
        tenorId: 'CAL_2030',
        label: 'Cal 2030 (RED III Milestone)',
        window: 'Jan 2030 – Dec 2030',
        category: 'CALENDAR',
        ttfBid: curveBook.ttfGasCurve.tenors.CAL_2030?.bid ?? 27.5,
        ttfOffer: curveBook.ttfGasCurve.tenors.CAL_2030?.offer ?? 28.3,
        ttfMid: curveBook.ttfGasCurve.tenors.CAL_2030?.mid ?? 27.9,
        yearIndex: 4,
        volume: '50 GWh',
      },
    ];

    const promptMidGas = rawTenors[0].ttfMid;

    return rawTenors.map((r, idx) => {
      // Calculate green attribute premium with annual statutory quota escalator
      const greenPremium = Number((activeProfile.baseGreenPremium + (r.yearIndex * activeProfile.quotaEscalatorPerYear)).toFixed(2));
      const bundledMid = Number((r.ttfMid + greenPremium).toFixed(2));
      const halfSpread = 3.00; // typical OTC broker half-spread
      const bundledBid = Number((bundledMid - halfSpread).toFixed(2));
      const bundledOffer = Number((bundledMid + halfSpread).toFixed(2));
      const timeSpread = Number((r.ttfMid - promptMidGas).toFixed(2));

      return {
        ...r,
        greenPremium,
        bundledBid,
        bundledOffer,
        bundledMid,
        timeSpread,
      };
    });
  }, [defaultMatrix, tenorDefs, promptTtf, curveBook, activeProfile]);

  const promptRow = tenorRows[0];
  const cal27Row = tenorRows.find(r => r.tenorId === 'CAL_2027') || tenorRows[6];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Commodity Instrument Selector Ribbon */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          borderRadius: 'var(--radius-panel)',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select European Biomethane Forward Curve / Instrument:
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>
              {activeProfile.label}
            </div>
          </div>
          <span className="chip chip-info" style={{ fontWeight: 600 }}>
            Active Hub: {activeProfile.hub}
          </span>
        </div>

        {/* Commodity Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {COMMODITY_PROFILES.map(p => (
            <button
              key={p.id}
              type="button"
              className={`btn ${selectedCommodityId === p.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '12px',
                padding: '5px 12px',
                fontWeight: selectedCommodityId === p.id ? 800 : 500,
                borderRadius: 'var(--radius-control)',
              }}
              onClick={() => setSelectedCommodityId(p.id)}
            >
              {p.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Contract & Product Identity Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          borderLeft: '4px solid var(--color-accent)',
          borderRadius: 'var(--radius-panel)',
          padding: '12px 16px',
          fontSize: '12px',
        }}
      >
        <div>
          <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
            Origin Country &amp; Grid
          </span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text)' }}>
            {activeProfile.flag} {activeProfile.country} · {activeProfile.hub}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
            Feedstock Substrate
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
            {activeProfile.feedstock}
          </span>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{activeProfile.feedstockCategory}</div>
        </div>

        <div>
          <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
            Carbon Intensity (CI)
          </span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: activeProfile.ciNumeric < 0 ? 'var(--color-pnl-pos)' : 'var(--color-text)' }} className="num">
            {activeProfile.ciScore}
          </span>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>RED III Fossil Comparator: 94 gCO₂e/MJ</div>
        </div>

        <div>
          <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
            Statutory Scheme &amp; Registry
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
            {activeProfile.statutoryScheme}
          </span>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Registry: {activeProfile.registry}</div>
        </div>
      </div>

      {/* Institutional Macro Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Card 1: Front-Month Natural Gas Benchmark */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid var(--color-accent)',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              Base Wholesale Gas (TTF M+1)
            </span>
            <span className="chip chip-info" style={{ fontSize: '10px' }}>EEX Index</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px' }} className="num">
            €{promptRow.ttfMid.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '4px' }}>/MWh</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
            Bid €{promptRow.ttfBid.toFixed(2)} · Offer €{promptRow.ttfOffer.toFixed(2)}
          </div>
        </div>

        {/* Card 2: Cal+1 Forward Gas Term Structure */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid #8b5cf6',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              TTF Cal 2027 Baseload
            </span>
            <span className="chip" style={{ fontSize: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              Backwardation
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px' }} className="num">
            €{cal27Row.ttfMid.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '4px' }}>/MWh</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowDownRight className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
            <span>Time spread vs prompt: <strong style={{ color: '#ef4444' }}>{cal27Row.timeSpread >= 0 ? `+€${cal27Row.timeSpread.toFixed(2)}` : `-€${Math.abs(cal27Row.timeSpread).toFixed(2)}`}</strong></span>
          </div>
        </div>

        {/* Card 3: Implied Biomethane Green Premium */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid var(--color-pnl-pos)',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              Implied Green Attribute Premium
            </span>
            <span className="chip chip-pos" style={{ fontSize: '10px' }}>Attribute Spread</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px', color: 'var(--color-pnl-pos)' }} className="num">
            +€{promptRow.greenPremium.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '4px' }}>/MWh</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
            Bundled Mid €{promptRow.bundledMid.toFixed(2)} less Gas Index €{promptRow.ttfMid.toFixed(2)}
          </div>
        </div>

        {/* Card 4: Delivered Prompt Mid */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid #d97706',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              Bundled Delivered Biomethane (Prompt)
            </span>
            <span className="chip chip-warn" style={{ fontSize: '10px' }}>Gas + PoS</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px' }} className="num">
            €{promptRow.bundledMid.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '4px' }}>/MWh</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
            Bid €{promptRow.bundledBid.toFixed(2)} · Offer €{promptRow.bundledOffer.toFixed(2)}
          </div>
        </div>
      </div>

      {/* CME-Inspired Forward Quotes Strip */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          borderRadius: 'var(--radius-panel)',
          overflow: 'hidden',
        }}
      >
        {/* Table Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-panel-header)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp className="w-4 h-4 text-accent" style={{ color: 'var(--color-accent)' }} />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>
              {activeProfile.flag} {activeProfile.label} — Forward Strip (Prompt M+1 → Cal 2030)
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Grid Delivery:</span>
            <span className="chip chip-info" style={{ fontWeight: 700 }}>{activeProfile.hub}</span>
          </div>
        </div>

        {/* Institutional Forward Quotes Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '70px', textAlign: 'center' }}>Country</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Delivery Hub</th>
                <th style={{ minWidth: '170px' }}>Contract / Tenor</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Delivery Window</th>
                <th style={{ minWidth: '180px' }}>Feedstock &amp; Specification</th>
                <th style={{ width: '105px', textAlign: 'right' }}>Gas Index</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Biomethane Bid</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Biomethane Offer</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Bundled Mid</th>
                <th style={{ width: '115px', textAlign: 'right' }}>Green Spread</th>
                <th style={{ width: '105px', textAlign: 'center' }}>Time Spread</th>
                <th style={{ width: '85px', textAlign: 'right' }}>Volume</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tenorRows.map((row, idx) => {
                const isContango = row.timeSpread > 0;
                const isBackwardation = row.timeSpread < 0;

                return (
                  <tr
                    key={row.tenorId}
                    style={{
                      backgroundColor: idx === 0 ? 'var(--color-surface-selected, rgba(234, 179, 8, 0.04))' : undefined,
                    }}
                  >
                    {/* Country */}
                    <td style={{ textAlign: 'center', fontWeight: 700 }} className="num">
                      {activeProfile.flag} {activeProfile.country}
                    </td>

                    {/* Delivery Hub */}
                    <td style={{ textAlign: 'center' }}>
                      <span className="chip chip-info" style={{ fontSize: '11px', padding: '1px 5px' }}>
                        {activeProfile.hub.split(' ')[0]}
                      </span>
                    </td>

                    {/* Contract / Tenor */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {idx === 0 && (
                          <span className="chip chip-warn" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>
                            PROMPT
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          {row.label}
                        </span>
                      </div>
                    </td>

                    {/* Delivery Window */}
                    <td style={{ textAlign: 'center', fontSize: '12px' }} className="mut">
                      {row.window}
                    </td>

                    {/* Feedstock & Specification */}
                    <td style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 600 }}>{activeProfile.feedstock}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>CI: {activeProfile.ciScore}</div>
                    </td>

                    {/* Base Gas Index */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="num">
                      €{row.ttfMid.toFixed(2)}
                    </td>

                    {/* Bundled Biomethane Bid */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="num">
                      €{row.bundledBid.toFixed(2)}
                    </td>

                    {/* Bundled Biomethane Offer */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }} className="num">
                      €{row.bundledOffer.toFixed(2)}
                    </td>

                    {/* Bundled Mid */}
                    <td style={{ textAlign: 'right', fontWeight: 800 }} className="num">
                      €{row.bundledMid.toFixed(2)}
                    </td>

                    {/* Implied Green Spread */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-pnl-pos)' }} className="num">
                      +€{row.greenPremium.toFixed(2)}
                    </td>

                    {/* Time Spread vs Prompt */}
                    <td style={{ textAlign: 'center' }}>
                      {idx === 0 ? (
                        <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}>Benchmark</span>
                      ) : (
                        <span
                          className={`chip ${isContango ? 'chip-pos' : isBackwardation ? 'chip-neutral' : ''}`}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isBackwardation ? 'rgba(239, 68, 68, 0.12)' : undefined,
                            color: isBackwardation ? '#ef4444' : undefined,
                          }}
                        >
                          {row.timeSpread >= 0 ? `+€${row.timeSpread.toFixed(2)}` : `-€${Math.abs(row.timeSpread).toFixed(2)}`}
                        </span>
                      )}
                    </td>

                    {/* Volume */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="num">
                      {row.volume}
                    </td>

                    {/* Trade Builder Action */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => {
                          navigate(`/trade?market=${activeProfile.country === 'DE' ? 'DE_THG' : activeProfile.country === 'NL' ? 'NL_ERE' : activeProfile.country === 'UK' ? 'UK_RTFO' : 'FR_CPB'}&hub=${activeProfile.country}&tenor=${encodeURIComponent(row.tenorId)}&gas=${row.ttfMid}&bundle=${row.bundledMid}`);
                        }}
                        title={`Build trade for ${activeProfile.label} (${row.window})`}
                      >
                        Trade <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Explainer Bar */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--color-panel-header)',
            borderTop: '1px solid var(--color-divider)',
            fontSize: '12px',
            color: 'var(--color-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
          <span>
            <strong>Trading Pricing Invariant</strong>: {activeProfile.description} Bundled delivered price reflects <em>Wholesale Gas Index ({activeProfile.hub.split(' ')[0]}) + Statutory Attribute Premium</em> calibrated against the audited substrate Carbon Intensity ({activeProfile.ciScore}).
          </span>
        </div>
      </div>
    </div>
  );
}
