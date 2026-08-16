import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';

const GATE: GateName = 'MARKET_SPECIFIC';
const GATE_LABEL = 'Market-Specific Requirements';

export function evaluateMarketSpecificGate(consignment: Consignment, market: Market): GateResult {
  // EMERGING markets
  if (market.status === 'EMERGING') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'UNKNOWN',
      reason: `${market.name} is an emerging market. Legislation has been announced or is in development, but the market is not yet tradeable. Rules are not fully stabilised.`,
      remedy: 'Monitor regulatory developments. Consider early engagement with the national registry operator.',
      citations: [],
      confidence: 'LOW',
    };
  }

  // NONE markets
  if (market.status === 'NONE') {
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'HARD_BLOCK',
      reason: `${market.name} has no functioning biomethane obligation or trading mechanism. No compliance market exists.`,
      remedy: null,
      citations: [],
      confidence: 'HIGH',
    };
  }

  // FUTURE markets
  if (market.status === 'FUTURE') {
    if (market.id === 'EU_ETS2') {
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'UNKNOWN',
        reason: 'EU ETS2 (buildings and road transport fuel suppliers) has been postponed to 2028 by the Council and Parliament (March 2026). Not tradeable until then. Many sources still reference the original 2027 start date; they are outdated.',
        remedy: 'No action required until 2028. Monitor implementing legislation for compliance obligations applicable to biomethane.',
        citations: [CITATIONS.EU_ETS_DIRECTIVE],
        confidence: 'HIGH',
      };
    }
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'UNKNOWN',
      reason: `${market.name} is a future market, not yet tradeable.`,
      remedy: null,
      citations: [],
      confidence: 'MEDIUM',
    };
  }

  // ACTIVE market-specific rules
  switch (market.id) {
    case 'DE_THG':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'UNRESOLVED',
        reason: 'Biomethane is eligible for the German THG quota under \u00a737a BImSchG. HOWEVER: double counting of advanced biofuels is eliminated from the 2026 compliance year (Cabinet draft, 10 December 2025). Whether biomethane specifically retains double counting is unresolved. Both scenarios must be modelled.\n\n\u26a0 IMPORTANT DISTINCTION:\n\u2022 Double counting is a POLICY MULTIPLIER \u2014 it is being removed.\n\u2022 Manure\'s negative carbon intensity is a property of the GHG CALCULATION (avoided methane emissions from conventional manure management) \u2014 it is UNAFFECTED by changes to double counting.',
        remedy: 'Model both branches (with and without double counting). Monitor the legislative process for the final BImSchV amendment.',
        citations: [CITATIONS.DE_BIMSCHG, CITATIONS.DE_38_BIMSCHV],
        confidence: 'MEDIUM',
      };

    case 'FR_CPB':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'France CPB is live from 1 January 2026. The \u20ac100/MWh penalty per missing CPB acts as a hard price ceiling \u2014 no supplier rationally pays more. In 2026, the obligation binds only suppliers above 400 GWh/yr, with the threshold falling to zero by year five. Registry: EEX.',
        remedy: null,
        citations: [CITATIONS.FR_CPB],
        confidence: 'HIGH',
      };

    case 'NL_ERE':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Netherlands ERE (Emissions Reduction Units) replaced the HBE system from 1 January 2026. 1 ERE = 1 kg CO\u2082e avoided. The unit shift from volume-based (HBE) to CO\u2082e-based (ERE) structurally advantages low-CI molecules \u2014 they generate more EREs per MWh. No multipliers, no double counting. Registry: NEa REV.',
        remedy: null,
        citations: [CITATIONS.NL_ERE],
        confidence: 'HIGH',
      };

    case 'IT_CIC':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: `Italy CIC: 1 CIC = 10 Gcal (conventional) or 5 Gcal (advanced, Annex IX-A). This consignment is classified as ${consignment.annexClassification === 'IX_A' ? 'advanced (5 Gcal/CIC \u2014 double counting applies, effectively doubling the certificate value)' : 'conventional (10 Gcal/CIC)'}. Registry: GSE. Injection via SNAM rules.`,
        remedy: null,
        citations: [CITATIONS.IT_CIC],
        confidence: 'HIGH',
      };

    case 'FUELEU':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'FuelEU Maritime: penalty is \u20ac2,400/tonne VLSFO-equivalent (\u2248\u20ac210/MWh at the penalty floor). However, do NOT treat \u20ac210/MWh as a price ceiling \u2014 a small volume of very-low-CI fuel neutralises a much larger compliance deficit, so value per MWh delivered can exceed \u20ac210. Penalties escalate 10%/20%/30% for consecutive years of non-compliance.',
        remedy: null,
        citations: [CITATIONS.FUELEU_MARITIME],
        confidence: 'HIGH',
      };

    case 'UK_RTFO':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'UK RTFO: non-EU market. Certificate value is in \u00a3/dRTFC and requires GBP/EUR FX conversion for comparison with continental markets. UK-origin biomethane can be sold domestically without UDB requirements.',
        remedy: null,
        citations: [CITATIONS.UK_RTFO],
        confidence: 'HIGH',
      };

    case 'FR_TIRUERT':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'CONDITIONAL',
        reason: 'France TIRUERT (transport tickets) is transitioning to GHG-based IRICC in 2027. The current framework should be treated as contested \u2014 pricing and eligibility rules may change.',
        remedy: 'Verify current TIRUERT rules with DGDDI before committing volume. Consider CPB as the primary French market.',
        citations: [CITATIONS.FR_CPB],
        confidence: 'MEDIUM',
      };

    case 'VOL_SCOPE1':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Voluntary corporate Scope 1 claims under the GHG Protocol market-based method. Most permissive market \u2014 accepts book-and-claim, all certification schemes, no UDB requirement. Value depends on corporate buyer willingness to pay.',
        remedy: null,
        citations: [],
        confidence: 'HIGH',
      };

    case 'EU_ETS1':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'EU ETS1: installation-level zero rating. Requires RED III sustainability compliance AND actual combustion of the biomethane at the installation. The installation operator must demonstrate that the biomethane displaces fossil gas in their fuel mix.',
        remedy: null,
        citations: [CITATIONS.EU_ETS_DIRECTIVE],
        confidence: 'HIGH',
      };

    case 'AT_EGG':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Austria EGG (Erneuerbaren-Gase-Gesetz): green gas supplier quota rising to 7.7% by 2030. Registry: AGCS.',
        remedy: null,
        citations: [CITATIONS.AT_EGG],
        confidence: 'HIGH',
      };

    default:
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: `${market.name}: market-specific requirements met. Consult local registry and reporting obligations.`,
        remedy: null,
        citations: [],
        confidence: 'MEDIUM',
      };
  }
}
