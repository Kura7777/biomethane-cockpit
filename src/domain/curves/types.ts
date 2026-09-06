export type ForwardTenor = 'CAL_2026' | 'CAL_2027' | 'CAL_2028' | 'CAL_2029' | 'CAL_2030';

export type ForwardSeason = 'SUMMER' | 'WINTER';

export type CurveMarketType =
  | 'TTF_GAS'
  | 'DE_THG'
  | 'NL_ERE'
  | 'FR_CPB'
  | 'UK_RTFO'
  | 'FUELEU'
  | 'GO_DE'
  | 'GO_NL'
  | 'GO_FR'
  | 'VOL_SCOPE1';

export type CurveSlope = 'CONTANGO' | 'BACKWARDATION' | 'FLAT';

export interface TenorQuote {
  tenor: ForwardTenor;
  year: number;
  mid: number;
  bid: number;
  offer: number;
  summerSpread: number;
  winterSpread: number;
  summerPrice: number;
  winterPrice: number;
  quotaEscalatorPct: number;
  statutoryObligationPct: number;
  note: string;
}

export interface ForwardCurve {
  marketId: CurveMarketType;
  marketName: string;
  unit: string;
  basePromptMid: number;
  slope: CurveSlope;
  slopePct: number;
  tenors: Record<ForwardTenor, TenorQuote>;
  tenorList: TenorQuote[];
  lastUpdated: string;
}

export interface ForwardCurveBook {
  timestamp: string;
  curves: Record<CurveMarketType, ForwardCurve>;
  ttfGasCurve: ForwardCurve;
  summary: {
    ttfContangoSpreadEur: number;
    thg2026To2030AppreciationPct: number;
    activeTenorsCount: number;
  };
}
