import { Consignment } from '../consignment/types';
import { Market } from '../markets/types';
import { EligibilityAssessment, GateResult, GateName, OverallVerdict } from './types';
import { evaluateSchemeGate } from './gates/scheme';
import { evaluateChainOfCustodyGate } from './gates/chain-of-custody';
import { evaluateFeedstockGate } from './gates/feedstock';
import { evaluateGHGThresholdGate } from './gates/ghg-threshold';
import { evaluateMarketSpecificGate } from './gates/market-specific';

const ROUTE_ITEMS = new Set(['registry-transfer', 'cross-border-pos']);

function isRouteOnlyBlock(g: GateResult): boolean {
  const failed = g.checklist?.filter(i => i.status === 'FAIL') ?? [];
  return g.gate === 'CHAIN_OF_CUSTODY' && failed.length > 0 && failed.every(i => ROUTE_ITEMS.has(i.id));
}

export function evaluateEligibility(
  consignment: Consignment,
  market: Market
): EligibilityAssessment {
  // Run all 5 statutory gates — collect full trail, don't stop at first block
  const gates: GateResult[] = [
    evaluateSchemeGate(consignment, market),
    evaluateChainOfCustodyGate(consignment, market),
    evaluateFeedstockGate(consignment, market),
    evaluateGHGThresholdGate(consignment, market),
    evaluateMarketSpecificGate(consignment, market),
  ];

  // Determine overall verdict (priority: HARD_BLOCK > UNRESOLVED > UNKNOWN > CONDITIONAL > ELIGIBLE)
  let overallVerdict: OverallVerdict = 'ELIGIBLE';
  let blockingGate: GateName | null = null;

  // Registry-transfer and cross-border PoS used to be separate gates checked after the market-specific
  // gate; a Chain-of-custody block that comes only from those items keeps that place in the order, so
  // the deal still reports the market's own reason first when both apply.
  const blocks = gates.filter(g => g.verdict === 'HARD_BLOCK');
  const firstBlock = blocks.find(g => !isRouteOnlyBlock(g)) ?? blocks[0];
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
