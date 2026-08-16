import { Consignment } from '../consignment/types';
import { Market } from '../markets/types';
import { EligibilityAssessment, GateResult, GateName, OverallVerdict } from './types';
import { evaluateSchemeGate } from './gates/scheme';
import { evaluateUDBGate } from './gates/udb';
import { evaluateChainOfCustodyGate } from './gates/chain-of-custody';
import { evaluateFeedstockGate } from './gates/feedstock';
import { evaluateGHGThresholdGate } from './gates/ghg-threshold';
import { evaluateMarketSpecificGate } from './gates/market-specific';

export function evaluateEligibility(
  consignment: Consignment,
  market: Market
): EligibilityAssessment {
  // Run all gates — collect full trail, don't stop at first block
  const gates: GateResult[] = [
    evaluateSchemeGate(consignment, market),
    evaluateUDBGate(consignment, market),
    evaluateChainOfCustodyGate(consignment, market),
    evaluateFeedstockGate(consignment, market),
    evaluateGHGThresholdGate(consignment, market),
    evaluateMarketSpecificGate(consignment, market),
  ];

  // Determine overall verdict (priority: HARD_BLOCK > UNRESOLVED > UNKNOWN > CONDITIONAL > ELIGIBLE)
  let overallVerdict: OverallVerdict = 'ELIGIBLE';
  let blockingGate: GateName | null = null;

  const firstBlock = gates.find(g => g.verdict === 'HARD_BLOCK');
  if (firstBlock) {
    overallVerdict = 'HARD_BLOCK';
    blockingGate = firstBlock.gate;
  } else if (gates.some(g => g.verdict === 'UNRESOLVED')) {
    overallVerdict = 'UNRESOLVED';
  } else if (gates.some(g => g.verdict === 'UNKNOWN')) {
    overallVerdict = 'UNKNOWN';
  } else if (gates.some(g => g.verdict === 'CONDITIONAL')) {
    overallVerdict = 'CONDITIONAL';
  }

  // Generate summary
  let summary: string;
  switch (overallVerdict) {
    case 'HARD_BLOCK': {
      const blockGateResult = gates.find(g => g.gate === blockingGate)!;
      summary = `BLOCKED at ${blockGateResult.gateLabel}: ${blockGateResult.reason.split('.')[0]}.`;
      break;
    }
    case 'UNRESOLVED':
      summary = `Eligibility for ${market.name} contains unresolved regulatory uncertainties that must be modelled as separate branches.`;
      break;
    case 'UNKNOWN':
      summary = `Eligibility for ${market.name} cannot be fully determined \u2014 market may not yet be tradeable or data is insufficient.`;
      break;
    case 'CONDITIONAL':
      summary = `Conditionally eligible for ${market.name}. One or more gates require additional conditions to be met.`;
      break;
    case 'ELIGIBLE':
      summary = `Fully eligible for ${market.name}. All regulatory gates pass.`;
      break;
  }

  return {
    marketId: market.id,
    marketName: market.name,
    overallVerdict,
    blockingGate,
    gates,
    summary,
  };
}

export function evaluateAllMarkets(
  consignment: Consignment,
  markets: Market[]
): EligibilityAssessment[] {
  return markets.map(market => evaluateEligibility(consignment, market));
}
