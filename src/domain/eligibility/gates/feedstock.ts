import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';

const GATE: GateName = 'FEEDSTOCK_CATEGORY';
const GATE_LABEL = 'Feedstock Category';

/**
 * Feedstock gate.
 *
 * - Voluntary claims and Guarantees of Origin do not restrict feedstock: the RED III Art. 26
 *   crop cap and Annex IX sub-quotas are transport-sector rules.
 * - FuelEU Maritime (Reg. (EU) 2023/1805 Art. 10(1)) assigns biofuels and biogas from food and
 *   feed crops the emission factor of the least favourable fossil pathway — no compliance value.
 * - The Art. 26 crop cap limits crop-based fuels counted in transport, not heat & power.
 * - Landfill gas is claimed under Annex IX Part A(b) (biomass fraction of mixed municipal waste),
 *   but Member State treatment varies, so compliance markets need confirmation.
 */
export function evaluateFeedstockGate(consignment: Consignment, market: Market): GateResult {
  const classification = consignment.annexClassification;
  const isVoluntaryOrGO = market.sector === 'VOLUNTARY' || market.isGuaranteeOfOrigin === true || market.id === 'VOL_SCOPE1';

  if (isVoluntaryOrGO) {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `${market.name} is a voluntary / Guarantee of Origin instrument and does not restrict feedstock. ${consignment.feedstockName} (${classification}) is eligible; RED III crop caps and Annex IX sub-quotas apply only to transport compliance.`,
      remedy: null,
      citations: [],
      confidence: 'HIGH',
    };
  }

  if (classification === 'CROP' && market.id === 'FUELEU') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'HARD_BLOCK',
      reason: `Under FuelEU Maritime, biofuels and biogas produced from food and feed crops are assigned the emission factor of the least favourable fossil fuel pathway. ${consignment.feedstockName} Bio-LNG therefore generates no FuelEU compliance value, whatever its RED lifecycle CI.`,
      remedy: 'Source Annex IX (waste / residue) feedstock such as manure, bio-waste or sewage sludge for maritime compliance.',
      citations: [CITATIONS.FUELEU_MARITIME],
      confidence: 'HIGH',
    };
  }

  if (consignment.feedstock === 'landfill_gas' && (market.sector === 'TRANSPORT' || market.sector === 'MARITIME')) {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'CONDITIONAL',
      reason: `Landfill gas is claimed under RED III Annex IX Part A(b) (biomass fraction of mixed municipal waste), but Member State treatment of landfill gas for ${market.name} varies — some schemes exclude it from advanced or double-counted categories.`,
      remedy: `Confirm with ${market.registry || 'the national authority'} that landfill gas qualifies as Annex IX Part A for this obligation before booking.`,
      citations: [CITATIONS.RED_III_ANNEX_IX_A],
      confidence: 'MEDIUM',
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
    if (market.sector === 'HEAT_POWER') {
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: `${consignment.feedstockName} is an energy crop feedstock. The RED III Art. 26 crop cap limits crop-based fuels counted towards transport, not heat & power use; the GHG saving threshold still applies.`,
        remedy: null,
        citations: [CITATIONS.RED_III_ART_26],
        confidence: 'HIGH',
      };
    }
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
