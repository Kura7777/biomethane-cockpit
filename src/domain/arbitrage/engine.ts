import { MARKETS, getMarketById } from '../markets/registry';
import { Market } from '../markets/types';
import { Consignment, CertificationScheme, ChainOfCustody } from '../consignment/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { MarksState, CostInputs } from '../netback/types';
import { computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { PRODUCING_ORIGINS, getRouteTransitTariff, getOriginFeedstockProcurementCost } from './origins';
import { 
  ArbitrageOpportunity, 
  ArbitrageMatrixCell, 
  RegulatoryWhatIfScenario 
} from './types';

export const DEFAULT_WHAT_IF_SCENARIO: RegulatoryWhatIfScenario = {
  deDoubleCounting: 'DC_OFF',
  ukUdbRecognition: false,
  fuelEUEscalationYears: 1,
  frCpbPenaltyCap: 100,
};

/**
 * Scan and compute all cross-border arbitrage opportunities across Europe
 */
export function scanEuropeanArbitrage(
  marks: MarksState,
  costs: CostInputs,
  selectedFeedstockKey: string = 'manure',
  ciOverride?: number,
  scheme: CertificationScheme = 'ISCC_EU',
  chainOfCustody: ChainOfCustody = 'MASS_BALANCE',
  scenario: RegulatoryWhatIfScenario = DEFAULT_WHAT_IF_SCENARIO,
  volumeMWh: number = 10000
): {
  topOpportunities: ArbitrageOpportunity[];
  matrixCells: ArbitrageMatrixCell[];
  blockedArbitrages: ArbitrageOpportunity[];
} {
  const feedstockInfo = FEEDSTOCK_REGISTRY[selectedFeedstockKey] || FEEDSTOCK_REGISTRY.manure;
  const ci = ciOverride ?? feedstockInfo.defaultCI;
  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');
  const baseTTF = marks.gasIndex.bid ?? 28.00;

  const opportunities: ArbitrageOpportunity[] = [];
  const matrixCells: ArbitrageMatrixCell[] = [];
  const blockedArbitrages: ArbitrageOpportunity[] = [];

  const originEntries = Object.values(PRODUCING_ORIGINS);

  for (const origin of originEntries) {
    // Check if origin is EU interconnected or isolated
    let isEUGrid = origin.gridZone === 'EU_INTERCONNECTED';
    if (origin.countryCode === 'GB' && scenario.ukUdbRecognition) {
      isEUGrid = true; // What-If simulated agreement
    }

    const consignment: Consignment = {
      id: `arb_${origin.countryCode}_${selectedFeedstockKey}`,
      name: `${origin.countryName} ${feedstockInfo.name}`,
      originCountry: origin.countryCode,
      originCountryName: origin.countryName,
      feedstock: selectedFeedstockKey,
      feedstockName: feedstockInfo.name,
      annexClassification: feedstockInfo.annexClassification,
      carbonIntensity: ci,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: scheme,
      chainOfCustody: chainOfCustody,
      injectionCountry: origin.countryCode,
      injectionIsEU: isEUGrid,
      udbStatus: isEUGrid ? 'RECORDED' : 'NOT_RECORDED',
      posStatus: 'ISSUED',
      volumeMWh,
    };

    // Upstream estimated procurement cost at origin
    const procurementCost = getOriginFeedstockProcurementCost(origin.countryCode, selectedFeedstockKey, baseTTF);

    for (const market of activeMarkets) {
      // Apply scenario adjustments
      const customMarks: MarksState = {
        ...marks,
        fuelEUOptions: {
          ...marks.fuelEUOptions,
          consecutiveYears: scenario.fuelEUEscalationYears,
        },
      };

      const eligibility = evaluateEligibility(consignment, market);
      const netbackRes = computeNetback(market, consignment, customMarks, costs, marks.pricingSide);
      
      const transitCost = getRouteTransitTariff(origin.countryCode, market.country);
      const isTradeable = eligibility.overallVerdict === 'ELIGIBLE' || eligibility.overallVerdict === 'CONDITIONAL' || eligibility.overallVerdict === 'UNRESOLVED';
      const isBlocked = eligibility.overallVerdict === 'HARD_BLOCK';

      let destinationNetback = netbackRes.netNetback;

      // If German THG with scenario override
      if (market.id === 'DE_THG' && scenario.deDoubleCounting === 'DC_ON' && netbackRes.uncertaintyBranches) {
        destinationNetback = netbackRes.uncertaintyBranches[1].netNetback;
      }

      let grossSpread: number | null = null;
      let netMargin: number | null = null;
      let marginPct: number | null = null;
      let totalDealProfit: number | null = null;

      if (destinationNetback !== null) {
        grossSpread = destinationNetback - procurementCost;
        netMargin = grossSpread - transitCost;
        marginPct = (netMargin / destinationNetback) * 100;
        totalDealProfit = netMargin * volumeMWh;
      }

      // Generate human rationale
      let rationale = `${origin.flag} ${origin.countryName} ➔ ${market.country} ${market.name}: `;
      if (isTradeable) {
        rationale += `Cleared via ${origin.primaryRegistry} to ${market.registry || 'destination registry'}. Net spread of €${netMargin?.toFixed(2) ?? 'N/A'}/MWh after €${transitCost.toFixed(2)}/MWh transit tariff.`;
      } else {
        rationale += `Blocked at ${eligibility.blockingGate || 'gating'}: ${eligibility.summary}`;
      }

      let keyRiskOrTrap: string | null = null;
      if (origin.countryCode === 'GB' && !scenario.ukUdbRecognition && market.isEUScope) {
        keyRiskOrTrap = 'UDB Non-EU Boundary Trap: UK injected biomethane cannot clear EU compliance reporting.';
      } else if (scheme === 'ISCC_PLUS' && market.id !== 'VOL_SCOPE1') {
        keyRiskOrTrap = 'Voluntary Scheme Trap: ISCC PLUS is not recognized under RED III compliance quotas.';
      }

      const opp: ArbitrageOpportunity = {
        id: `${origin.countryCode}_to_${market.id}_${selectedFeedstockKey}`,
        originCountry: origin.countryCode,
        originCountryName: origin.countryName,
        originFlag: origin.flag,
        targetMarketId: market.id,
        targetMarketName: market.name,
        targetCountry: market.country,
        targetFlag: market.country === 'DE' ? '🇩🇪' : market.country === 'NL' ? '🇳🇱' : market.country === 'FR' ? '🇫🇷' : market.country === 'IT' ? '🇮🇹' : market.country === 'SE' ? '🇸🇪' : market.country === 'AT' ? '🇦🇹' : '🇪🇺',
        feedstockKey: selectedFeedstockKey,
        feedstockName: feedstockInfo.name,
        carbonIntensity: ci,
        certificationScheme: scheme,
        chainOfCustody,
        originEstimatedProcurementEurPerMWh: procurementCost,
        destinationNetbackEurPerMWh: destinationNetback,
        grossSpreadEurPerMWh: grossSpread,
        transitCostEurPerMWh: transitCost,
        netMarginEurPerMWh: netMargin,
        marginPercent: marginPct,
        totalDealProfitEur: totalDealProfit,
        eligibility,
        overallVerdict: eligibility.overallVerdict,
        isTradeable,
        regulatoryRationale: rationale,
        keyRiskOrTrap,
        isModelled: Boolean(netbackRes.isModelled),
      };

      opportunities.push(opp);

      // Matrix cell mapping
      matrixCells.push({
        originCode: origin.countryCode,
        originName: origin.countryName,
        targetMarketId: market.id,
        targetMarketName: market.shortName,
        verdict: eligibility.overallVerdict,
        netMarginEurPerMWh: netMargin,
        isBlocked,
        blockingReason: isBlocked ? eligibility.summary : null,
        isModelled: Boolean(netbackRes.isModelled),
      });

      if (isBlocked && destinationNetback !== null && destinationNetback > procurementCost + transitCost) {
        blockedArbitrages.push(opp);
      }
    }
  }

  // Sort tradeable opportunities by net margin descending
  const topOpportunities = opportunities
    .filter(o => o.isTradeable && o.netMarginEurPerMWh !== null && o.netMarginEurPerMWh > 0)
    .sort((a, b) => {
      // Prioritize marked trades over unquoted modelled trades
      if (a.isModelled !== b.isModelled) {
        return a.isModelled ? 1 : -1;
      }
      return (b.netMarginEurPerMWh ?? 0) - (a.netMarginEurPerMWh ?? 0);
    });

  // Sort blocked opportunities by highest unrealized theoretical margin
  blockedArbitrages.sort((a, b) => (b.netMarginEurPerMWh ?? 0) - (a.netMarginEurPerMWh ?? 0));

  return {
    topOpportunities,
    matrixCells,
    blockedArbitrages,
  };
}
