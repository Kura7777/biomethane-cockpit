import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';

const GATE: GateName = 'CHAIN_OF_CUSTODY';
const GATE_LABEL = 'Chain of Custody';

export function evaluateChainOfCustodyGate(consignment: Consignment, market: Market): GateResult {
  const coc = consignment.chainOfCustody;

  if (coc === 'MASS_BALANCE') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: 'Mass balance chain of custody meets RED III requirements for all compliance markets. The physical gas is tracked through the interconnected gas grid with mass balance accounting.',
      remedy: null,
      citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
      confidence: 'HIGH',
    };
  }

  if (coc === 'SEGREGATION') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: 'Physical segregation exceeds RED III requirements. The biomethane is kept separate from conventional gas throughout the supply chain.',
      remedy: null,
      citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
      confidence: 'HIGH',
    };
  }

  if (coc === 'BOOK_AND_CLAIM') {
    // Book-and-claim passes for voluntary and GO markets
    if (market.acceptsBookAndClaim) {
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: `${market.name} accepts book-and-claim chain of custody. The environmental attributes are traded separately from the physical gas molecule.`,
        remedy: null,
        citations: [],
        confidence: 'HIGH',
      };
    }

    // Book-and-claim fails all transport compliance, FuelEU, ETS
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'HARD_BLOCK',
      reason: `Book-and-claim chain of custody does not meet RED III requirements for ${market.name}. All transport compliance markets, FuelEU Maritime, and EU ETS require mass balance or physical segregation \u2014 the physical gas must be trackable through the grid.`,
      remedy: 'Switch to mass balance chain of custody. This requires the physical gas to be injected into the interconnected gas grid with mass balance accounting at the injection point.',
      citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
      confidence: 'HIGH',
    };
  }

  return {
    gate: GATE,
    gateLabel: GATE_LABEL,
    verdict: 'UNKNOWN',
    reason: `Unknown chain of custody model: ${coc}.`,
    remedy: null,
    citations: [],
    confidence: 'LOW',
  };
}
