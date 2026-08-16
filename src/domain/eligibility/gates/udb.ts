import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';

const GATE: GateName = 'UDB_RECORDING';
const GATE_LABEL = 'Union Database Recording';

const SCHEME_DISPLAY_NAMES: Record<string, string> = {
  ISCC_EU: 'ISCC EU', ISCC_PLUS: 'ISCC PLUS', REDCERT_EU: 'REDcert EU',
  REDCERT2: 'REDcert\u00b2', '2BSVS': '2BSvs', KZR_INIG: 'KZR INiG',
};

export function evaluateUDBGate(consignment: Consignment, market: Market): GateResult {
  // Markets that don't require UDB
  if (!market.requiresUDB) {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `${market.name} does not require Union Database recording.`,
      remedy: null,
      citations: [],
      confidence: 'HIGH',
    };
  }

  // Non-EU injection -> HARD_BLOCK (the critical scenario this tool exists to catch)
  if (!consignment.injectionIsEU) {
    const schemeName = SCHEME_DISPLAY_NAMES[consignment.certificationScheme] || consignment.certificationScheme;
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'HARD_BLOCK',
      reason: `Consignment is injected into a non-EU gas grid (${consignment.injectionCountry}). The Union Database operates within the EU regulatory perimeter only \u2014 gas injected into a non-EU grid cannot be tracked in the UDB mass balance system, regardless of the certification scheme held. ${schemeName} certification is NOT the issue \u2014 the injection location is what prevents UDB recording and therefore blocks EU compliance claims.`,
      remedy: `Deliver physically as segregated bio-LNG or off-grid CNG (bypassing grid injection), or sell into the origin country's domestic compliance scheme (e.g., UK RTFO for UK-origin gas). Alternatively, arrange for physical injection into an EU Member State grid.`,
      citations: [CITATIONS.RED_III_UDB, CITATIONS.UDB_IMPLEMENTING_REG],
      confidence: 'HIGH',
    };
  }

  // UDB status checks
  if (consignment.udbStatus === 'RECORDED') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `Consignment is recorded in the Union Database. EU grid injection (${consignment.injectionCountry}) enables mass balance tracking within the single EU-wide mass balance area.`,
      remedy: null,
      citations: [CITATIONS.RED_III_UDB, CITATIONS.UDB_IMPLEMENTING_REG],
      confidence: 'HIGH',
    };
  }

  if (consignment.udbStatus === 'PENDING') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'CONDITIONAL',
      reason: `Consignment UDB recording is pending. The consignment is injected into the EU grid (${consignment.injectionCountry}) and is eligible for recording, but registration is not yet confirmed.`,
      remedy: 'Complete UDB registration through the certification scheme\'s connection to the Union Database.',
      citations: [CITATIONS.RED_III_UDB],
      confidence: 'MEDIUM',
    };
  }

  // NOT_RECORDED but EU injection
  return {
    gate: GATE,
    gateLabel: GATE_LABEL,
    verdict: 'CONDITIONAL',
    reason: `Consignment is not yet recorded in the Union Database. It is injected into the EU grid (${consignment.injectionCountry}) and is eligible for UDB recording, but registration must be completed before compliance claims can be made.`,
    remedy: 'Initiate UDB recording through the certification scheme. The consignment\'s EU grid injection point makes it eligible.',
    citations: [CITATIONS.RED_III_UDB, CITATIONS.UDB_IMPLEMENTING_REG],
    confidence: 'MEDIUM',
  };
}
