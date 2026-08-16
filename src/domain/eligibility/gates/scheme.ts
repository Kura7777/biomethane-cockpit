import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';

const GATE: GateName = 'SCHEME_RECOGNITION';
const GATE_LABEL = 'Scheme Recognition';

const EU_RECOGNISED_SCHEMES = ['ISCC_EU', 'REDCERT_EU', '2BSVS', 'KZR_INIG'] as const;
const VOLUNTARY_ONLY_SCHEMES = ['ISCC_PLUS', 'REDCERT2'] as const;

const SCHEME_DISPLAY_NAMES: Record<string, string> = {
  ISCC_EU: 'ISCC EU',
  ISCC_PLUS: 'ISCC PLUS',
  REDCERT_EU: 'REDcert EU',
  REDCERT2: 'REDcert\u00b2',
  '2BSVS': '2BSvs',
  KZR_INIG: 'KZR INiG',
};

export function evaluateSchemeGate(consignment: Consignment, market: Market): GateResult {
  const scheme = consignment.certificationScheme;
  const schemeName = SCHEME_DISPLAY_NAMES[scheme] || scheme;

  // Voluntary markets accept all schemes
  if (market.id === 'VOL_SCOPE1') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `${schemeName} is accepted. Voluntary corporate claims under the GHG Protocol market-based method accept all major sustainability certification schemes.`,
      remedy: null,
      citations: [],
      confidence: 'HIGH',
    };
  }

  // ISCC PLUS / REDcert2 -> HARD_BLOCK for all compliance markets
  if ((VOLUNTARY_ONLY_SCHEMES as readonly string[]).includes(scheme)) {
    const schemeDetail = scheme === 'ISCC_PLUS'
      ? 'ISCC PLUS is a voluntary sustainability scheme for non-energy markets (circular economy, bio-based chemicals, food/feed). It is NOT recognised by the European Commission under RED III for compliance claims in regulated markets.'
      : 'REDcert\u00b2 is designed for sustainable materials in the chemical and food industries. It is NOT recognised by the European Commission under RED III for compliance claims in regulated markets.';
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'HARD_BLOCK',
      reason: schemeDetail,
      remedy: 'Obtain certification under an EU-recognised voluntary scheme: ISCC EU, REDcert EU, 2BSvs, or KZR INiG. These are the schemes recognised by the European Commission for demonstrating RED III sustainability compliance.',
      citations: [CITATIONS.ISCC_PLUS_SCOPE, CITATIONS.RED_III_VOLUNTARY_SCHEMES],
      confidence: 'HIGH',
    };
  }

  // EU-recognised schemes -> PASS
  if ((EU_RECOGNISED_SCHEMES as readonly string[]).includes(scheme)) {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'PASS',
      reason: `${schemeName} is recognised by the European Commission as a voluntary scheme for demonstrating compliance with the sustainability and GHG saving criteria of the Renewable Energy Directive (RED III).`,
      remedy: null,
      citations: [CITATIONS.RED_III_VOLUNTARY_SCHEMES],
      confidence: 'HIGH',
    };
  }

  return {
    gate: GATE,
    gateLabel: GATE_LABEL,
    verdict: 'UNKNOWN',
    reason: `Certification scheme "${schemeName}" is not in the tool's database. Verify whether it is recognised by the European Commission under RED III.`,
    remedy: null,
    citations: [],
    confidence: 'LOW',
  };
}
