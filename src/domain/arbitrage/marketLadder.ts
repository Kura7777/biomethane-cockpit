import { MARKETS } from '../markets/registry';
import type { MarkProvenance } from '../markets/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import type { CertificationScheme, ChainOfCustody, Consignment } from '../consignment/types';
import type { CostInputs, MarksState } from '../netback/types';
import { computeAllNetbacks } from '../netback/engine';
import { rankNetbacks } from '../netback/ranking';
import { evaluateEligibility } from '../eligibility/engine';
import type { EligibilityAssessment, GateResult, OverallVerdict } from '../eligibility/types';
import { PRODUCING_ORIGINS } from './origins';
import { buildArbitrageConsignment, originIsEuGrid } from './engine';

/**
 * "Where is this worth most": the selected route's consignment priced into every active market.
 * It uses the same consignment, eligibility and netback engines as the route list beside it, and
 * reads every price from the marks store. A market whose netback is null (a missing mark) is never
 * ranked: it comes back in `missing` so the screen can list it as a missing mark.
 */

export interface LadderOpportunity {
  originCountry: string;
  originCountryName: string;
  feedstockKey: string;
  feedstockName: string;
  carbonIntensity: number;
  certificationScheme: CertificationScheme;
  chainOfCustody: ChainOfCustody;
  /** The market the route was built for; flagged on its ladder row. */
  targetMarketId: string;
}

export interface MarketLadderRow {
  marketId: string;
  marketName: string;
  country: string;
  legalBasis: string;
  unitLabel: string;
  verdict: OverallVerdict;
  eligibilitySummary: string;
  gates: GateResult[];
  netNetback: number | null;
  deskMarginEurPerMwh: number | null;
  marginPercent: number | null;
  /** 1-based rank among tradeable markets with a netback; null when blocked or missing a mark. */
  rank: number | null;
  isModelled: boolean;
  /** Where the market's own mark came from (null when the market has no mark entry). */
  provenance: MarkProvenance | null;
  markUpdatedAt: string | null;
  /** Bundle reference the netback engine capped this market at, when it did. */
  cappedAt: number | null;
  /** The market this route was originally built for. */
  isChosen: boolean;
  missingInputs: string[];
}

export interface MarketLadder {
  consignment: Consignment;
  /** Markets with a netback, best first (tradeable ones ranked, blocked ones after). */
  ranked: MarketLadderRow[];
  /** Markets with no netback because a mark is missing. Never ranked. */
  missing: MarketLadderRow[];
}

export function buildLadderConsignment(opp: LadderOpportunity, volumeMWh: number): Consignment {
  const feedstockInfo = FEEDSTOCK_REGISTRY[opp.feedstockKey] || FEEDSTOCK_REGISTRY.manure;
  const origin = PRODUCING_ORIGINS[opp.originCountry];
  return buildArbitrageConsignment({
    originCountry: opp.originCountry,
    originCountryName: opp.originCountryName,
    feedstockKey: opp.feedstockKey,
    feedstockName: feedstockInfo.name,
    annexClassification: feedstockInfo.annexClassification,
    carbonIntensity: opp.carbonIntensity,
    scheme: opp.certificationScheme,
    chainOfCustody: opp.chainOfCustody,
    isEUGrid: origin ? originIsEuGrid(origin) : false,
    volumeMWh,
  });
}

export function buildMarketLadder(
  opp: LadderOpportunity,
  volumeMWh: number,
  marks: MarksState,
  costs: CostInputs
): MarketLadder {
  const consignment = buildLadderConsignment(opp, volumeMWh);
  const markets = MARKETS.filter(m => m.status === 'ACTIVE');

  const eligibilityMap = new Map<string, EligibilityAssessment>();
  for (const m of markets) eligibilityMap.set(m.id, evaluateEligibility(consignment, m));

  const netbacks = computeAllNetbacks(consignment, markets, marks, costs, eligibilityMap, marks.pricingSides);
  const ranked = rankNetbacks(netbacks, eligibilityMap);

  const rows: MarketLadderRow[] = ranked.map(nb => {
    const market = markets.find(m => m.id === nb.marketId)!;
    const el = eligibilityMap.get(nb.marketId);
    const mark = marks.marks[nb.marketId];
    return {
      marketId: nb.marketId,
      marketName: nb.marketName,
      country: market.country,
      legalBasis: market.legalBasis,
      unitLabel: market.unitLabel,
      verdict: el?.overallVerdict ?? 'UNKNOWN',
      eligibilitySummary: el?.summary ?? '',
      gates: el?.gates ?? [],
      netNetback: nb.netNetback,
      deskMarginEurPerMwh: nb.deskMargin,
      marginPercent: nb.marginPercent,
      rank: nb.rank,
      isModelled: Boolean(nb.isModelled),
      provenance: nb.provenance ?? mark?.provenance ?? null,
      markUpdatedAt: mark?.updatedAt ?? null,
      cappedAt: nb.netbackCappedAt ?? null,
      isChosen: nb.marketId === opp.targetMarketId,
      missingInputs: nb.missingInputs,
    };
  });

  return {
    consignment,
    ranked: rows.filter(r => r.netNetback !== null),
    missing: rows.filter(r => r.netNetback === null),
  };
}
