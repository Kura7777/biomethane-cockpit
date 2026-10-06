import { MARKETS } from '../markets/registry';
import { getMarkAgeDays } from '../markets/types';
import { Consignment, CertificationScheme, ChainOfCustody } from '../consignment/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { MarksState, CostInputs } from '../netback/types';
import { computeNetback, isAllInMarket } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { PRODUCING_ORIGINS, getRouteTransitTariff } from './origins';
import { 
  ArbitrageOpportunity, 
  ArbitrageMatrixCell, 
  RegulatoryWhatIfScenario 
} from './types';

export const DEFAULT_WHAT_IF_SCENARIO: RegulatoryWhatIfScenario = {
  ukUdbRecognition: false,
  fuelEUEscalationYears: 1,
  frCpbPenaltyCap: 100,
};

/**
 * The consignment the scan evaluates for one origin and feedstock. Exported so Origination's
 * market ladder evaluates exactly the same consignment as the route list it sits beside.
 */
export function buildArbitrageConsignment(args: {
  originCountry: string;
  originCountryName: string;
  feedstockKey: string;
  feedstockName: string;
  annexClassification: Consignment['annexClassification'];
  carbonIntensity: number;
  scheme: CertificationScheme;
  chainOfCustody: ChainOfCustody;
  isEUGrid: boolean;
  volumeMWh: number;
  /** The year the certificate is surrendered against; selects the broker bundle mark for DE THG. */
  complianceYear?: number | null;
}): Consignment {
  return {
    id: `arb_${args.originCountry}_${args.feedstockKey}`,
    name: `${args.originCountryName} ${args.feedstockName}`,
    originCountry: args.originCountry,
    originCountryName: args.originCountryName,
    feedstock: args.feedstockKey,
    feedstockName: args.feedstockName,
    annexClassification: args.annexClassification,
    carbonIntensity: args.carbonIntensity,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: args.scheme,
    chainOfCustody: args.chainOfCustody,
    injectionCountry: args.originCountry,
    injectionIsEU: args.isEUGrid,
    udbStatus: args.isEUGrid ? 'RECORDED' : 'NOT_RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: args.volumeMWh,
    deliveryPeriod:
      args.complianceYear == null
        ? undefined
        : { type: null, startDate: null, endDate: null, complianceYear: args.complianceYear },
  };
}

/** Whether an origin injects into the EU-interconnected grid (UK only under the what-if UDB scenario). */
export function originIsEuGrid(
  origin: { countryCode: string; gridZone: string },
  scenario: RegulatoryWhatIfScenario = DEFAULT_WHAT_IF_SCENARIO
): boolean {
  if (origin.countryCode === 'GB' && scenario.ukUdbRecognition) return true;
  return origin.gridZone === 'EU_INTERCONNECTED';
}

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
  volumeMWh: number = 10000,
  complianceYear: number | null = null
): {
  topOpportunities: ArbitrageOpportunity[];
  matrixCells: ArbitrageMatrixCell[];
  blockedArbitrages: ArbitrageOpportunity[];
  allOpportunities: ArbitrageOpportunity[];
} {
  const feedstockInfo = FEEDSTOCK_REGISTRY[selectedFeedstockKey] || FEEDSTOCK_REGISTRY.manure;
  const ci = ciOverride ?? feedstockInfo.defaultCI;
  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');

  const opportunities: ArbitrageOpportunity[] = [];
  const matrixCells: ArbitrageMatrixCell[] = [];
  const blockedArbitrages: ArbitrageOpportunity[] = [];

  const originEntries = Object.values(PRODUCING_ORIGINS);

  for (const origin of originEntries) {
    const isEUGrid = originIsEuGrid(origin, scenario); // UK counts as EU only under the what-if UDB agreement

    const consignment: Consignment = buildArbitrageConsignment({
      originCountry: origin.countryCode,
      originCountryName: origin.countryName,
      feedstockKey: selectedFeedstockKey,
      feedstockName: feedstockInfo.name,
      annexClassification: feedstockInfo.annexClassification,
      carbonIntensity: ci,
      scheme,
      chainOfCustody,
      isEUGrid,
      volumeMWh,
      complianceYear,
    });

    for (const market of activeMarkets) {
      const customMarks: MarksState = {
        ...marks,
        fuelEUOptions: {
          ...marks.fuelEUOptions,
          consecutiveYears: scenario.fuelEUEscalationYears,
        },
      };

      const eligibility = evaluateEligibility(consignment, market);
      const transitCost = getRouteTransitTariff(origin.countryCode, market.country);
      const routeCosts: CostInputs = {
        ...costs,
        logistics: transitCost,
      };
      const netbackRes = computeNetback(market, consignment, customMarks, routeCosts, marks.pricingSides);

      const isTradeable = eligibility.overallVerdict === 'ELIGIBLE' || eligibility.overallVerdict === 'CONDITIONAL' || eligibility.overallVerdict === 'UNRESOLVED';
      const isBlocked = eligibility.overallVerdict === 'HARD_BLOCK' || eligibility.overallVerdict === 'UNKNOWN';

      const certValEur = netbackRes.certificateValue?.valueEurPerMWh ?? null;
      const molValEur = isAllInMarket(market.id) ? 0 : (netbackRes.moleculeValue ?? 0);
      const grossRevenue = netbackRes.netbackCappedAt !== null && netbackRes.netbackCappedAt !== undefined
        ? Number((netbackRes.netbackCappedAt + (netbackRes.totalCosts ?? 0)).toFixed(2))
        : (certValEur !== null ? Number((certValEur + molValEur).toFixed(2)) : null);

      let destinationNetback = netbackRes.netNetback;
      let deskNetMargin = netbackRes.deskMargin;
      let producerPayable = netbackRes.producerPayable;
      let marginAllocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE' = 'TRANSPORT_COMPLIANCE';
      if (market.id === 'FUELEU') {
        marginAllocationType = 'MARITIME_INSETTING';
      } else if (market.id === 'VOL_SCOPE1' || market.id === 'DK_GO' || market.id === 'EU_ETS1') {
        marginAllocationType = 'WHOLESALE_BASE';
      }
      let marginPct = netbackRes.marginPercent;
      let totalDealProfit = deskNetMargin !== null ? deskNetMargin * volumeMWh : null;

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

      // Determine toConfirm checklist
      const toConfirm: string[] = ['Producer availability and volume — not held in this tool'];
      
      const markEntry = customMarks.marks[market.id];
      const markAge = getMarkAgeDays(markEntry);
      const prov = markEntry?.provenance;
      const isEstimateOrSimulated = prov?.sourceType === 'ESTIMATE' || 
        markEntry?.source === 'SIMULATED' || 
        !prov?.sourceType || 
        Boolean(netbackRes.isModelled);

      if (isEstimateOrSimulated) {
        toConfirm.push('Price is an estimate — obtain a firm indication');
      }
      if (markAge !== null && markAge > 30) {
        toConfirm.push(`Mark is ${markAge} days old`);
      }
      if (consignment.udbStatus !== 'RECORDED') {
        toConfirm.push('UDB registration unconfirmed');
      }
      const isProducerPricingSet = Boolean(
        costs.producerPricing && (
          (costs.producerPricing.mode === 'FIXED_PRICE' && costs.producerPricing.fixedPriceEurPerMwh !== null) ||
          (costs.producerPricing.mode === 'INDEX_LINKED' && costs.producerPricing.indexLinkedShare !== null)
        )
      );
      if (!isProducerPricingSet) {
        toConfirm.push('Producer pricing basis not agreed');
      }
      if (costs.transferCosts === null) {
        toConfirm.push('Missing transfer cost');
      }
      if (costs.certificationCosts === null) {
        toConfirm.push('Missing certification cost');
      }
      if (costs.logistics === null) {
        toConfirm.push('Missing logistics cost');
      }
      if (costs.otherCosts === null) {
        toConfirm.push('Missing other costs');
      }

      const opp: ArbitrageOpportunity = {
        id: `${origin.countryCode}_to_${market.id}_${selectedFeedstockKey}`,
        originCountry: origin.countryCode,
        originCountryName: origin.countryName,
        originFlag: origin.flag,
        targetMarketId: market.id,
        targetMarketName: market.name,
        targetCountry: market.country,
        targetFlag: (() => {
          const FLAGS: Record<string, string> = {
            DE: '🇩🇪', NL: '🇳🇱', FR: '🇫🇷', IT: '🇮🇹', SE: '🇸🇪', AT: '🇦🇹',
            DK: '🇩🇰', GB: '🇬🇧', FI: '🇫🇮', ES: '🇪🇸', BE: '🇧🇪', PL: '🇵🇱',
            CZ: '🇨🇿', PT: '🇵🇹', IE: '🇮🇪', GR: '🇬🇷', RO: '🇷🇴', HU: '🇭🇺',
            EE: '🇪🇪', LT: '🇱🇹', LV: '🇱🇻', CH: '🇨🇭', NO: '🇳🇴', SK: '🇸🇰',
            SI: '🇸🇮', HR: '🇭🇷', BG: '🇧🇬', LU: '🇱🇺',
          };
          return FLAGS[market.country] ?? '🇪🇺';
        })(),
        feedstockKey: selectedFeedstockKey,
        feedstockName: feedstockInfo.name,
        carbonIntensity: ci,
        certificationScheme: scheme,
        chainOfCustody,
        totalTerminalValueStackEurPerMWh: grossRevenue,
        producerPayableEurPerMWh: producerPayable,
        transitCostEurPerMWh: transitCost,
        deskNetMarginEurPerMWh: deskNetMargin,
        marginPercent: marginPct,
        totalDealProfitEur: totalDealProfit,
        bundleReference: netbackRes.bundleReference ?? null,
        netbackCappedAt: netbackRes.netbackCappedAt ?? null,
        theoreticalNetbackEurPerMWh: netbackRes.theoreticalNetback ?? null,
        certSideRequested: netbackRes.sideRequested,
        certSideUsed: netbackRes.sideUsed,
        eligibility,
        overallVerdict: eligibility.overallVerdict,
        isTradeable,
        regulatoryRationale: rationale,
        keyRiskOrTrap,
        marginAllocationType,
        isModelled: Boolean(netbackRes.isModelled),
        toConfirm,
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
    allOpportunities: opportunities,
  };
}
