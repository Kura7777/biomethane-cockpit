import { CertificationScheme, ChainOfCustody } from '../consignment/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { MarksState, CostInputs } from '../netback/types';
import { scanEuropeanArbitrage, DEFAULT_WHAT_IF_SCENARIO } from './engine';
import { 
  ArbitrageOpportunity, 
  ClientRequest, 
  RegulatoryWhatIfScenario, 
  SourcingSearchResult 
} from './types';

const ALL_SCHEMES: CertificationScheme[] = [
  'ISCC_EU',
  'ISCC_PLUS',
  'REDCERT_EU',
  'REDCERT2',
  '2BSVS',
  'KZR_INIG',
];

/**
 * Thin adapter around scanEuropeanArbitrage that fans out over ANY criteria in ClientRequest,
 * filters by constraints (CI, delivered cost, physical segregation), and produces
 * a structured SourcingSearchResult with tradeable, blocked, evaluated, and unpriced totals.
 */
export function searchSourcingRoutes(
  req: ClientRequest,
  marks: MarksState,
  costs: CostInputs,
  scenario: RegulatoryWhatIfScenario = DEFAULT_WHAT_IF_SCENARIO
): SourcingSearchResult {
  const feedstocksToSearch = req.feedstockKey === 'ANY'
    ? Object.keys(FEEDSTOCK_REGISTRY)
    : [req.feedstockKey];

  const schemesToSearch = req.scheme === 'ANY'
    ? ALL_SCHEMES
    : [req.scheme];

  const effectiveChainOfCustody: ChainOfCustody = req.constraints?.physicalDeliveryRequired
    ? 'SEGREGATION'
    : (req.chainOfCustody || 'MASS_BALANCE');

  const volumeForScan = req.volumeMwh ?? 10000;
  const ciForScan = req.constraints?.maxCarbonIntensity !== undefined && req.constraints?.maxCarbonIntensity !== null
    ? req.constraints.maxCarbonIntensity 
    : undefined;

  const tradeable: ArbitrageOpportunity[] = [];
  const blocked: ArbitrageOpportunity[] = [];
  let evaluated = 0;
  let unpriced = 0;

  for (const feedstockKey of feedstocksToSearch) {
    for (const scheme of schemesToSearch) {
      const scanResult = scanEuropeanArbitrage(
        marks,
        costs,
        feedstockKey,
        ciForScan,
        scheme,
        effectiveChainOfCustody,
        scenario,
        volumeForScan
      );

      for (const opp of scanResult.allOpportunities) {
        // Filter by target market if specified
        if (req.targetMarketId !== 'ANY' && opp.targetMarketId !== req.targetMarketId) {
          continue;
        }

        // Apply constraints
        if (req.constraints?.maxCarbonIntensity != null && opp.carbonIntensity > req.constraints.maxCarbonIntensity) {
          continue;
        }

        if (
          req.constraints?.maxDeliveredCostEurMwh != null &&
          opp.producerPayableEurPerMWh !== null &&
          opp.producerPayableEurPerMWh > req.constraints.maxDeliveredCostEurMwh
        ) {
          continue;
        }

        evaluated++;

        const isUnpriced = opp.totalTerminalValueStackEurPerMWh === null;

        // If client requested null volume, totalDealProfitEur must strictly remain null (no invented volume)
        const adjustedOpp: ArbitrageOpportunity = req.volumeMwh === null
          ? { ...opp, totalDealProfitEur: null }
          : opp;

        if (!adjustedOpp.isTradeable) {
          blocked.push(adjustedOpp);
        } else if (isUnpriced) {
          unpriced++;
        } else {
          tradeable.push(adjustedOpp);
        }
      }
    }
  }

  // Sort tradeable by desk margin descending (falling back to total netback)
  tradeable.sort((a, b) => {
    if (a.isModelled !== b.isModelled) {
      return a.isModelled ? 1 : -1;
    }
    const marginA = a.deskNetMarginEurPerMWh ?? (a.totalTerminalValueStackEurPerMWh ?? 0);
    const marginB = b.deskNetMarginEurPerMWh ?? (b.totalTerminalValueStackEurPerMWh ?? 0);
    return marginB - marginA;
  });

  // Sort blocked by unrealized netback descending
  blocked.sort((a, b) => {
    return (b.totalTerminalValueStackEurPerMWh ?? 0) - (a.totalTerminalValueStackEurPerMWh ?? 0);
  });

  return {
    tradeable,
    blocked,
    evaluated,
    unpriced,
    request: req,
    generatedAt: new Date().toISOString(),
  };
}
