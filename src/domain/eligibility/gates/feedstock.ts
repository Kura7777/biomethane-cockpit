import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';

const GATE: GateName = 'FEEDSTOCK_CATEGORY';
const GATE_LABEL = 'Feedstock Category';

export function evaluateFeedstockGate(consignment: Consignment, market: Market): GateResult {
  const classification = consignment.annexClassification;

  // Voluntary markets accept all feedstocks
  if (market.id === 'VOL_SCOPE1') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `Voluntary corporate claims accept all feedstock types. ${consignment.feedstockName} (${classification}) is eligible.`,
      remedy: null,
      citations: [],
      confidence: 'HIGH',
    };
  }

  if (classification === 'IX_A') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `${consignment.feedstockName} is classified as RED III Annex IX Part A (advanced biofuel feedstock). Eligible for advanced sub-quotas. No volume cap applies.`,
      remedy: null,
      citations: [CITATIONS.RED_III_ANNEX_IX_A],
      confidence: 'HIGH',
    };
  }

  if (classification === 'IX_B') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'CONDITIONAL',
      reason: `${consignment.feedstockName} is classified as RED III Annex IX Part B. Eligible for the blending obligation but NOT for advanced sub-quotas. Volume may be limited by Member State transposition of the Annex IX-B cap.`,
      remedy: 'Verify the applicable Annex IX-B cap in the target Member State. Consider sourcing Annex IX-A feedstock for uncapped access to advanced sub-quotas.',
      citations: [CITATIONS.RED_III_ANNEX_IX_B],
      confidence: 'HIGH',
    };
  }

  if (classification === 'CROP') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'CONDITIONAL',
      reason: `${consignment.feedstockName} is an energy crop feedstock, subject to the crop cap under RED III Art. 26. Excluded from advanced sub-quotas. Declining political support across EU Member States may further restrict eligibility.`,
      remedy: 'Verify the applicable crop cap in the target Member State. Consider transitioning to waste or residue feedstocks (Annex IX-A) for better regulatory positioning.',
      citations: [CITATIONS.RED_III_ART_26],
      confidence: 'HIGH',
    };
  }

  return {
    gate: GATE,
    gateLabel: GATE_LABEL,
    verdict: 'UNKNOWN',
    reason: `Feedstock classification "${classification}" for ${consignment.feedstockName} is not in the tool's database.`,
    remedy: null,
    citations: [],
    confidence: 'LOW',
  };
}
