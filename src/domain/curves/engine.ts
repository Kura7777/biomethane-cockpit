import { MarksState } from '../netback/types';
import { FR_CPB_CEILING_EUR_MWH } from '../markets/constants';
import {
  ForwardTenor,
  CurveMarketType,
  TenorQuote,
  ForwardCurve,
  ForwardCurveBook,
  CurveSlope,
} from './types';

export const FORWARD_YEARS: readonly { tenor: ForwardTenor; year: number }[] = [
  { tenor: 'CAL_2026', year: 2026 },
  { tenor: 'CAL_2027', year: 2027 },
  { tenor: 'CAL_2028', year: 2028 },
  { tenor: 'CAL_2029', year: 2029 },
  { tenor: 'CAL_2030', year: 2030 },
] as const;

/**
 * Statutory RED III & National Mandate Trajectories (% obligation in transport/energy).
 * Sources:
 * - Germany BImSchV 38 / RED III Art. 25
 * - Netherlands Wet milieubeheer / Besluit energie vervoer
 * - France TIRUERT Code des douanes Art. 266 quindecies
 * - UK RTFO Order 2007 (as amended)
 * - FuelEU Maritime Regulation (EU) 2023/1805
 */
export const STATUTORY_OBLIGATION_TRAJECTORIES: Record<
  CurveMarketType,
  Record<ForwardTenor, { obligationPct: number; stepUpMultiplier: number; note: string }>
> = {
  TTF_GAS: {
    CAL_2026: { obligationPct: 0, stepUpMultiplier: 100 / 100, note: 'Front-year benchmark TTF forward' },
    CAL_2027: { obligationPct: 0, stepUpMultiplier: 96 / 100, note: 'Cal-27 backwardation on expanded global LNG liquefaction' },
    CAL_2028: { obligationPct: 0, stepUpMultiplier: 91 / 100, note: 'Cal-28 forward plateau' },
    CAL_2029: { obligationPct: 0, stepUpMultiplier: 87 / 100, note: 'Cal-29 long-term European gas demand contraction' },
    CAL_2030: { obligationPct: 0, stepUpMultiplier: 84 / 100, note: 'Cal-30 European decarbonisation & pipeline gas transition' },
  },
  DE_THG: {
    CAL_2026: { obligationPct: 12.0, stepUpMultiplier: 100 / 100, note: 'BImSchV 38 current baseline quota' },
    CAL_2027: { obligationPct: 14.5, stepUpMultiplier: 109 / 100, note: '+2.5% statutory step-up tightening quota deficit' },
    CAL_2028: { obligationPct: 17.5, stepUpMultiplier: 120 / 100, note: '+3.0% step-up; upstream emission reduction phaseout' },
    CAL_2029: { obligationPct: 21.0, stepUpMultiplier: 132 / 100, note: '+3.5% aggressive RED III transport ramp-up' },
    CAL_2030: { obligationPct: 25.0, stepUpMultiplier: 145 / 100, note: 'Statutory 25.0% GHG target; maximum penalty ceiling exposure' },
  },
  NL_ERE: {
    CAL_2026: { obligationPct: 28.4, stepUpMultiplier: 100 / 100, note: 'Current annual HBE/ERE renewable energy obligation' },
    CAL_2027: { obligationPct: 30.5, stepUpMultiplier: 107 / 100, note: 'Dutch NEa mandate escalation' },
    CAL_2028: { obligationPct: 33.0, stepUpMultiplier: 116 / 100, note: 'Transport electrification & maritime sub-targets' },
    CAL_2029: { obligationPct: 35.5, stepUpMultiplier: 125 / 100, note: 'Tightening sub-mandate for advanced bio-feedstocks' },
    CAL_2030: { obligationPct: 38.0, stepUpMultiplier: 136 / 100, note: 'Full 38% national renewable transport mandate target' },
  },
  FR_CPB: {
    CAL_2026: { obligationPct: 2.0, stepUpMultiplier: 100 / 100, note: 'TIRUERT biomethane incorporation sub-target' },
    CAL_2027: { obligationPct: 2.5, stepUpMultiplier: 106 / 100, note: 'French transport decarbonisation step-up' },
    CAL_2028: { obligationPct: 3.2, stepUpMultiplier: 112 / 100, note: 'Heavy-duty Bio-CNG / Bio-LNG fleet adoption' },
    CAL_2029: { obligationPct: 3.9, stepUpMultiplier: 118 / 100, note: 'High penalty pressure subject to statutory cap' },
    CAL_2030: { obligationPct: 4.8, stepUpMultiplier: 122 / 100, note: 'Bounded by French €100/MWh statutory ceiling' },
  },
  UK_RTFO: {
    CAL_2026: { obligationPct: 14.6, stepUpMultiplier: 100 / 100, note: 'UK RTFO main obligation baseline' },
    CAL_2027: { obligationPct: 16.0, stepUpMultiplier: 106 / 100, note: 'Department for Transport trajectory step-up' },
    CAL_2028: { obligationPct: 17.5, stepUpMultiplier: 113 / 100, note: 'Sustainable Aviation & heavy freight obligation' },
    CAL_2029: { obligationPct: 19.0, stepUpMultiplier: 120 / 100, note: 'UK RTFO domestic mandate expansion' },
    CAL_2030: { obligationPct: 20.5, stepUpMultiplier: 128 / 100, note: 'Statutory 20.5% RTFO mandate milestone' },
  },
  FUELEU: {
    CAL_2026: { obligationPct: 2.0, stepUpMultiplier: 100 / 100, note: 'Regulation (EU) 2023/1805 initial -2% GHG target' },
    CAL_2027: { obligationPct: 2.0, stepUpMultiplier: 103 / 100, note: 'Fleet compliance pooling phase-in' },
    CAL_2028: { obligationPct: 2.0, stepUpMultiplier: 108 / 100, note: 'Banking & borrowing provisions tighten' },
    CAL_2029: { obligationPct: 2.0, stepUpMultiplier: 115 / 100, note: 'Pre-2030 maritime bunker deficit positioning' },
    CAL_2030: { obligationPct: 6.0, stepUpMultiplier: 155 / 100, note: 'Statutory 3x step-up to -6% GHG intensity target' },
  },
  GO_DE: {
    CAL_2026: { obligationPct: 0, stepUpMultiplier: 100 / 100, note: 'DENA Biogasregister voluntary GO mark' },
    CAL_2027: { obligationPct: 0, stepUpMultiplier: 105 / 100, note: 'Corporate Scope 1 heating greening demand' },
    CAL_2028: { obligationPct: 0, stepUpMultiplier: 112 / 100, note: 'Industrial emissions trading linkage demand' },
    CAL_2029: { obligationPct: 0, stepUpMultiplier: 119 / 100, note: 'Corporate 2030 interim science-based targets' },
    CAL_2030: { obligationPct: 0, stepUpMultiplier: 128 / 100, note: 'EU Green Claims compliance standard enforcement' },
  },
  GO_NL: {
    CAL_2026: { obligationPct: 0, stepUpMultiplier: 100 / 100, note: 'VertiCer Dutch GO benchmark mark' },
    CAL_2027: { obligationPct: 0, stepUpMultiplier: 104 / 100, note: 'Voluntary industrial grid off-take demand' },
    CAL_2028: { obligationPct: 0, stepUpMultiplier: 110 / 100, note: 'Dutch voluntary heating & chemicals demand' },
    CAL_2029: { obligationPct: 0, stepUpMultiplier: 117 / 100, note: 'Cross-border EECS voluntary transfers' },
    CAL_2030: { obligationPct: 0, stepUpMultiplier: 125 / 100, note: 'Corporate Net-Zero 2030 milestone demand' },
  },
  GO_FR: {
    CAL_2026: { obligationPct: 0, stepUpMultiplier: 100 / 100, note: 'EEX French biomethane GO auction level' },
    CAL_2027: { obligationPct: 0, stepUpMultiplier: 105 / 100, note: 'French municipal & commercial decarbonisation' },
    CAL_2028: { obligationPct: 0, stepUpMultiplier: 111 / 100, note: 'Industrial heating electrification complement' },
    CAL_2029: { obligationPct: 0, stepUpMultiplier: 118 / 100, note: 'Corporate Scope 1 voluntary procurement' },
    CAL_2030: { obligationPct: 0, stepUpMultiplier: 126 / 100, note: 'Corporate Net-Zero 2030 targets' },
  },
  VOL_SCOPE1: {
    CAL_2026: { obligationPct: 0, stepUpMultiplier: 100 / 100, note: 'Pan-European voluntary green gas premium' },
    CAL_2027: { obligationPct: 0, stepUpMultiplier: 106 / 100, note: 'GHG Protocol Scope 1 guidance compliance' },
    CAL_2028: { obligationPct: 0, stepUpMultiplier: 114 / 100, note: 'CSRD Corporate Sustainability Reporting demand' },
    CAL_2029: { obligationPct: 0, stepUpMultiplier: 122 / 100, note: 'SBTi Net-Zero interim compliance' },
    CAL_2030: { obligationPct: 0, stepUpMultiplier: 132 / 100, note: '2030 European corporate net zero target deadlines' },
  },
};

/**
 * Seasonal shape adjustments (EUR/unit).
 * TTF gas experiences Winter heating premiums and Summer injection discounts.
 */
export const SEASONAL_FACTORS: Record<CurveMarketType, { summerSpread: number; winterSpread: number }> = {
  TTF_GAS: { summerSpread: -1.8, winterSpread: 2.5 },
  DE_THG: { summerSpread: -0.015, winterSpread: 0.02 },
  NL_ERE: { summerSpread: -0.3, winterSpread: 0.4 },
  FR_CPB: { summerSpread: -1.2, winterSpread: 1.5 },
  UK_RTFO: { summerSpread: -0.5, winterSpread: 0.6 },
  FUELEU: { summerSpread: -0.2, winterSpread: 0.2 },
  GO_DE: { summerSpread: -0.15, winterSpread: 0.25 },
  GO_NL: { summerSpread: -0.15, winterSpread: 0.25 },
  GO_FR: { summerSpread: -0.15, winterSpread: 0.25 },
  VOL_SCOPE1: { summerSpread: -0.2, winterSpread: 0.3 },
};

/**
 * Bid/Offer half-spread multipliers per market type (as a ratio of mid price)
 */
const HALF_SPREAD_RATIO: Record<CurveMarketType, number> = {
  TTF_GAS: 15 / 1000,   // ~1.5% half-spread
  DE_THG: 25 / 1000,    // ~2.5% half-spread
  NL_ERE: 20 / 1000,    // ~2.0% half-spread
  FR_CPB: 25 / 1000,    // ~2.5% half-spread
  UK_RTFO: 25 / 1000,   // ~2.5% half-spread
  FUELEU: 30 / 1000,    // ~3.0% half-spread
  GO_DE: 35 / 1000,     // ~3.5% half-spread
  GO_NL: 35 / 1000,     // ~3.5% half-spread
  GO_FR: 35 / 1000,     // ~3.5% half-spread
  VOL_SCOPE1: 30 / 1000,
};

export const MARKET_METADATA: Record<CurveMarketType, { name: string; unit: string; defaultBaseMid: number }> = {
  TTF_GAS: { name: 'TTF Natural Gas (ICIS Heren / ICE Endex)', unit: 'EUR/MWh', defaultBaseMid: 38.5 },
  DE_THG: { name: 'German THG-Quote (Double-Counted)', unit: 'EUR/kg', defaultBaseMid: 0.85 },
  NL_ERE: { name: 'Netherlands ERE / HBE Units', unit: 'EUR/GJ', defaultBaseMid: 18.75 },
  FR_CPB: { name: 'France CPB / TIRUERT Biomethane', unit: 'EUR/MWh', defaultBaseMid: 26.5 },
  UK_RTFO: { name: 'UK RTFO (Renewable Transport Fuel Obligation)', unit: 'p/dgh', defaultBaseMid: 36.0 },
  FUELEU: { name: 'FuelEU Maritime Compliance Deficit', unit: 'EUR/GJ', defaultBaseMid: 14.2 },
  GO_DE: { name: 'Germany GO (DENA Biogasregister)', unit: 'EUR/MWh', defaultBaseMid: 6.5 },
  GO_NL: { name: 'Netherlands GO (VertiCer Biometheaan)', unit: 'EUR/MWh', defaultBaseMid: 6.0 },
  GO_FR: { name: 'France GO (EEX Biomethane Auction)', unit: 'EUR/MWh', defaultBaseMid: 5.5 },
  VOL_SCOPE1: { name: 'Corporate Scope 1 Voluntary Biomethane', unit: 'EUR/MWh', defaultBaseMid: 8.0 },
};

/**
 * Maps standard delivery period labels (e.g. 'Cal-2026', '2027') to ForwardTenor.
 */
export function getTenorByYear(yearOrLabel: number | string): ForwardTenor {
  if (typeof yearOrLabel === 'number') {
    if (yearOrLabel <= 2026) return 'CAL_2026';
    if (yearOrLabel === 2027) return 'CAL_2027';
    if (yearOrLabel === 2028) return 'CAL_2028';
    if (yearOrLabel === 2029) return 'CAL_2029';
    return 'CAL_2030';
  }
  const str = String(yearOrLabel).toUpperCase();
  if (str.includes('2026')) return 'CAL_2026';
  if (str.includes('2027')) return 'CAL_2027';
  if (str.includes('2028')) return 'CAL_2028';
  if (str.includes('2029')) return 'CAL_2029';
  if (str.includes('2030')) return 'CAL_2030';
  return 'CAL_2026';
}

/**
 * Calculates seasonal Summer/Winter spread.
 */
export function calculateSeasonalSpread(winterPrice: number, summerPrice: number): number {
  return winterPrice - summerPrice;
}

/**
 * Generates forward curve quotes from Cal-2026 through Cal-2030 for a specific commodity.
 */
export function buildForwardCurve(
  marketId: CurveMarketType,
  basePromptMid: number
): ForwardCurve {
  const meta = MARKET_METADATA[marketId];
  const trajectory = STATUTORY_OBLIGATION_TRAJECTORIES[marketId];
  const seasonal = SEASONAL_FACTORS[marketId];
  const halfSpreadRatio = HALF_SPREAD_RATIO[marketId];

  const tenorsRecord: Partial<Record<ForwardTenor, TenorQuote>> = {};
  const tenorList: TenorQuote[] = [];

  for (const { tenor, year } of FORWARD_YEARS) {
    const config = trajectory[tenor];
    let midValue = basePromptMid * config.stepUpMultiplier;

    // Apply French statutory ceiling invariant if applicable
    if (marketId === 'FR_CPB' && midValue > FR_CPB_CEILING_EUR_MWH) {
      midValue = FR_CPB_CEILING_EUR_MWH;
    }

    const midRounded = Number(midValue.toFixed(4));
    const halfSpread = midRounded * halfSpreadRatio;
    const bid = Number((midRounded - halfSpread).toFixed(4));
    const offer = Number((midRounded + halfSpread).toFixed(4));

    const summerPrice = Number((midRounded + seasonal.summerSpread).toFixed(4));
    const winterPrice = Number((midRounded + seasonal.winterSpread).toFixed(4));
    const quotaEscalatorPct = Number(((config.stepUpMultiplier - 1) * 100).toFixed(1));

    const quote: TenorQuote = {
      tenor,
      year,
      mid: midRounded,
      bid,
      offer,
      summerSpread: seasonal.summerSpread,
      winterSpread: seasonal.winterSpread,
      summerPrice,
      winterPrice,
      quotaEscalatorPct,
      statutoryObligationPct: config.obligationPct,
      note: config.note,
    };

    tenorsRecord[tenor] = quote;
    tenorList.push(quote);
  }

  const p2026 = tenorsRecord.CAL_2026!.mid;
  const p2030 = tenorsRecord.CAL_2030!.mid;
  const slopeDelta = p2030 - p2026;
  const slopePct = p2026 > 0 ? Number(((slopeDelta / p2026) * 100).toFixed(2)) : 0;

  let slope: CurveSlope = 'FLAT';
  if (slopePct > 0.5) {
    slope = 'CONTANGO';
  } else if (slopePct < -0.5) {
    slope = 'BACKWARDATION';
  }

  return {
    marketId,
    marketName: meta.name,
    unit: meta.unit,
    basePromptMid,
    slope,
    slopePct,
    tenors: tenorsRecord as Record<ForwardTenor, TenorQuote>,
    tenorList,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generates the full book of forward curves across all supported underlyings and tenors.
 */
export function generateForwardCurves(
  marksState: MarksState,
  customGasIndex?: number | null
): ForwardCurveBook {
  const ttfMid =
    customGasIndex !== null && customGasIndex !== undefined
      ? customGasIndex
      : marksState.gasIndex.mid !== null
      ? marksState.gasIndex.mid
      : MARKET_METADATA.TTF_GAS.defaultBaseMid;

  // Extract base prompt marks from desk state or use baseline metadata
  const getPromptMid = (marketKey: string, fallbackType: CurveMarketType): number => {
    const mark = marksState.marks[marketKey];
    if (mark && mark.mid !== null && mark.mid !== undefined) {
      return mark.mid;
    }
    return MARKET_METADATA[fallbackType].defaultBaseMid;
  };

  const ttfGasCurve = buildForwardCurve('TTF_GAS', ttfMid);

  const curves: Record<CurveMarketType, ForwardCurve> = {
    TTF_GAS: ttfGasCurve,
    DE_THG: buildForwardCurve('DE_THG', getPromptMid('DE_THG', 'DE_THG')),
    NL_ERE: buildForwardCurve('NL_ERE', getPromptMid('NL_ERE', 'NL_ERE')),
    FR_CPB: buildForwardCurve('FR_CPB', getPromptMid('FR_CPB', 'FR_CPB')),
    UK_RTFO: buildForwardCurve('UK_RTFO', getPromptMid('UK_RTFO', 'UK_RTFO')),
    FUELEU: buildForwardCurve('FUELEU', getPromptMid('FUELEU', 'FUELEU')),
    GO_DE: buildForwardCurve('GO_DE', getPromptMid('DE_GO', 'GO_DE')),
    GO_NL: buildForwardCurve('GO_NL', getPromptMid('NL_GO', 'GO_NL')),
    GO_FR: buildForwardCurve('GO_FR', getPromptMid('FR_GO', 'GO_FR')),
    VOL_SCOPE1: buildForwardCurve('VOL_SCOPE1', getPromptMid('VOL_SCOPE1', 'VOL_SCOPE1')),
  };

  const ttfContangoSpreadEur = Number(
    (ttfGasCurve.tenors.CAL_2030.mid - ttfGasCurve.tenors.CAL_2026.mid).toFixed(2)
  );
  const thg2026To2030AppreciationPct = curves.DE_THG.slopePct;

  return {
    timestamp: new Date().toISOString(),
    curves,
    ttfGasCurve,
    summary: {
      ttfContangoSpreadEur,
      thg2026To2030AppreciationPct,
      activeTenorsCount: FORWARD_YEARS.length,
    },
  };
}

/**
 * Retrieve a specific forward quote from the curve book.
 */
export function getForwardQuote(
  book: ForwardCurveBook,
  marketId: CurveMarketType,
  tenor: ForwardTenor
): TenorQuote {
  const curve = book.curves[marketId];
  if (!curve) {
    return book.ttfGasCurve.tenors[tenor];
  }
  return curve.tenors[tenor];
}
