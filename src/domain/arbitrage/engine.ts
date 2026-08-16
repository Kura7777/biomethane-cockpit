import { MARKETS } from '../markets/registry';
import { Consignment, CertificationScheme, ChainOfCustody } from '../consignment/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { MarksState, CostInputs } from '../netback/types';
import { computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { PRODUCING_ORIGINS, getRouteTransitTariff, calculateRealisticCommercialDeskMargin } from './origins';
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
 * with realistic commercial trading desk margin allocation.
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

  const opportunities: ArbitrageOpportunity[] = [];
  const matrixCells: ArbitrageMatrixCell[] = [];
  const blockedArbitrages: ArbitrageOpportunity[] = [];

  const originEntries = Object.values(PRODUCING_ORIGINS);

  for (const origin of originEntries) {
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

    for (const market of activeMarkets) {
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

      let deskNetMargin: number | null = null;
      let producerPayable: number | null = null;
      let marginAllocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE' = 'TRANSPORT_COMPLIANCE';
      let marginPct: number | null = null;
      let totalDealProfit: number | null = null;

      if (destinationNetback !== null) {
        const producerShare = costs.producerPricing?.mode === 'INDEX_LINKED'
          ? (costs.producerPricing.indexLinkedShare ?? null)
          : null;

        const commercialAllocation = calculateRealisticCommercialDeskMargin(
          market.id,
          destinationNetback,
          transitCost,
          producerShare
        );
        deskNetMargin = commercialAllocation.deskNetMarginEurPerMWh;
        producerPayable = commercialAllocation.producerProcurementEurPerMWh;
        marginAllocationType = commercialAllocation.marginAllocationType;

        if (deskNetMargin !== null && destinationNetback !== 0) {
          marginPct = (deskNetMargin / Math.abs(destinationNetback)) * 100;
        }
        if (deskNetMargin !== null) {
          totalDealProfit = deskNetMargin * volumeMWh;
        }
      }

      // Generate human rationale
      let rationale = `${origin.flag} ${origin.countryName} ➔ ${market.country} ${market.name}: `;
      if (isTradeable) {
        const payableText = producerPayable !== null ? `Producer procurement: €${producerPayable.toFixed(2)}/MWh. ` : 'Producer pricing: Unset. ';
        rationale += `Delivered Value Stack: €${destinationNetback?.toFixed(2) ?? 'N/A'}/MWh. ${payableText}Grid transit: €${transitCost.toFixed(2)}/MWh. Desk margin: ${deskNetMargin !== null ? `€${deskNetMargin.toFixed(2)}/MWh` : 'Unset'}.`;
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
        totalTerminalValueStackEurPerMWh: destinationNetback,
        producerPayableEurPerMWh: producerPayable,
        transitCostEurPerMWh: transitCost,
        deskNetMarginEurPerMWh: deskNetMargin,
        marginPercent: marginPct,
        totalDealProfitEur: totalDealProfit,
        eligibility,
        overallVerdict: eligibility.overallVerdict,
        isTradeable,
        regulatoryRationale: rationale,
        keyRiskOrTrap,
        marginAllocationType,
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
        deskNetMarginEurPerMWh: deskNetMargin,
        totalValueEurPerMWh: destinationNetback,
        isBlocked,
        blockingReason: isBlocked ? eligibility.summary : null,
        isModelled: Boolean(netbackRes.isModelled),
      });

      if (isBlocked && destinationNetback !== null && destinationNetback > 0) {
        blockedArbitrages.push(opp);
      }
    }
  }

  // Sort tradeable opportunities by desk net margin descending
  const topOpportunities = opportunities
    .filter(o => o.isTradeable && o.deskNetMarginEurPerMWh !== null && o.deskNetMarginEurPerMWh > 0)
    .sort((a, b) => {
      // Prioritize marked trades over unquoted modelled trades
      if (a.isModelled !== b.isModelled) {
        return a.isModelled ? 1 : -1;
      }
      return (b.deskNetMarginEurPerMWh ?? 0) - (a.deskNetMarginEurPerMWh ?? 0);
    });

  // Sort blocked opportunities by highest total unrealized compliance value
  blockedArbitrages.sort((a, b) => (b.totalTerminalValueStackEurPerMWh ?? 0) - (a.totalTerminalValueStackEurPerMWh ?? 0));

  return {
    topOpportunities,
    matrixCells,
    blockedArbitrages,
  };
}
