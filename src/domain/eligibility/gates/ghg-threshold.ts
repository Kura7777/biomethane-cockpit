import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';
import { 
  CI_COMPARATOR_ROAD_TRANSPORT, 
  GHG_THRESHOLDS_TRANSPORT, 
  CI_COMPARATOR_HEAT, 
  GHG_THRESHOLDS_HEAT_POWER 
} from '../../markets/constants';

const GATE: GateName = 'GHG_THRESHOLD';
const GATE_LABEL = 'GHG Saving Threshold';

export function evaluateGHGThresholdGate(consignment: Consignment, market: Market): GateResult {
  // Voluntary corporate claims and Guarantees of Origin (RGGO, GOs) have no mandatory transport fuel GHG saving threshold
  const isVoluntaryOrGO = 
    market.id === 'VOL_SCOPE1' || 
    market.id === 'UK_RGGO' || 
    market.id.endsWith('_GO') || 
    (market.unitOfAccount === 'EUR_PER_MWH' && market.acceptsBookAndClaim);

  if (isVoluntaryOrGO) {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `${market.name} tracks renewable gas origins for corporate voluntary / heat / Scope 1 claims and does not impose a mandatory transport fuel GHG threshold.`,
      remedy: null,
      citations: [],
      confidence: 'HIGH',
    };
  }

  // Determine market sector to select the right comparator and thresholds
  const isHeatPowerMarket = market.id === 'AT_EGG' || market.id === 'VOL_SCOPE1' || market.id === 'EU_ETS1';
  const comparator = isHeatPowerMarket ? CI_COMPARATOR_HEAT : CI_COMPARATOR_ROAD_TRANSPORT;
  const thresholds = isHeatPowerMarket ? GHG_THRESHOLDS_HEAT_POWER : GHG_THRESHOLDS_TRANSPORT;

  const ci = consignment.carbonIntensity;
  const saving = (comparator - ci) / comparator;
  const savingPct = (saving * 100).toFixed(1);

  const minSaving = (thresholds as Record<string, number>)[consignment.commissioningDateRange];
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
      reason: `GHG saving of ${savingPct}% (CI: ${ci} gCO₂e/MJ vs. comparator ${comparator} gCO₂e/MJ) meets the required minimum of ${minSavingPct}% for ${consignment.commissioningDateRange.replace(/_/g, ' ').toLowerCase()} installations.`,
      remedy: null,
      citations: [CITATIONS.RED_III_GHG_TRANSPORT, CITATIONS.RED_III_COMPARATOR],
      confidence: 'HIGH',
    };
  }

  return {
    gate: GATE,
    gateLabel: GATE_LABEL,
    verdict: 'HARD_BLOCK',
    reason: `GHG saving of ${savingPct}% (CI: ${ci} gCO₂e/MJ vs. comparator ${comparator} gCO₂e/MJ) is BELOW the required minimum of ${minSavingPct}% for ${consignment.commissioningDateRange.replace(/_/g, ' ').toLowerCase()} installations.`,
    remedy: `Reduce the carbon intensity of the production process, or source biomethane from a plant with a lower CI. The target CI for ${minSavingPct}% saving is ≤${(comparator * (1 - minSaving)).toFixed(1)} gCO₂e/MJ.`,
    citations: [CITATIONS.RED_III_GHG_TRANSPORT, CITATIONS.RED_III_COMPARATOR],
    confidence: 'HIGH',
  };
}
