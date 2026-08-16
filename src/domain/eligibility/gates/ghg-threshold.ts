import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';
import { CI_COMPARATOR_ROAD_TRANSPORT, GHG_THRESHOLDS_TRANSPORT } from '../../markets/constants';

const GATE: GateName = 'GHG_THRESHOLD';
const GATE_LABEL = 'GHG Saving Threshold';

export function evaluateGHGThresholdGate(consignment: Consignment, market: Market): GateResult {
  // Voluntary markets have no minimum threshold
  if (market.id === 'VOL_SCOPE1') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: 'Voluntary corporate claims do not have a mandatory minimum GHG saving threshold.',
      remedy: null,
      citations: [],
      confidence: 'HIGH',
    };
  }

  const ci = consignment.carbonIntensity;
  const comparator = CI_COMPARATOR_ROAD_TRANSPORT;
  const saving = (comparator - ci) / comparator;
  const savingPct = (saving * 100).toFixed(1);

  const minSaving = GHG_THRESHOLDS_TRANSPORT[consignment.commissioningDateRange];
  if (minSaving === undefined) {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'UNKNOWN',
      reason: `Cannot determine GHG threshold for commissioning date range: ${consignment.commissioningDateRange}.`,
      remedy: null,
      citations: [CITATIONS.RED_III_GHG_TRANSPORT],
      confidence: 'LOW',
    };
  }

  const minSavingPct = (minSaving * 100).toFixed(0);

  if (saving >= minSaving) {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `GHG saving of ${savingPct}% (CI: ${ci} gCO\u2082e/MJ vs. comparator ${comparator} gCO\u2082e/MJ) meets the required minimum of ${minSavingPct}% for ${consignment.commissioningDateRange.replace(/_/g, ' ').toLowerCase()} installations.`,
      remedy: null,
      citations: [CITATIONS.RED_III_GHG_TRANSPORT, CITATIONS.RED_III_COMPARATOR],
      confidence: 'HIGH',
    };
  }

  return {
    gate: GATE,
    gateLabel: GATE_LABEL,
    verdict: 'HARD_BLOCK',
    reason: `GHG saving of ${savingPct}% (CI: ${ci} gCO\u2082e/MJ vs. comparator ${comparator} gCO\u2082e/MJ) is BELOW the required minimum of ${minSavingPct}% for ${consignment.commissioningDateRange.replace(/_/g, ' ').toLowerCase()} installations.`,
    remedy: `Reduce the carbon intensity of the production process, or source biomethane from a plant with a lower CI. The target CI for ${minSavingPct}% saving is \u2264${(comparator * (1 - minSaving)).toFixed(1)} gCO\u2082e/MJ.`,
    citations: [CITATIONS.RED_III_GHG_TRANSPORT, CITATIONS.RED_III_COMPARATOR],
    confidence: 'HIGH',
  };
}
