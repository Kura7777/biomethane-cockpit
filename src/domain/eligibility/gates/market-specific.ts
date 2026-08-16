import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName } from '../types';
import { CITATIONS } from '../citations';

const GATE: GateName = 'MARKET_SPECIFIC';
const GATE_LABEL = 'Market-Specific Requirements';

export function evaluateMarketSpecificGate(consignment: Consignment, market: Market): GateResult {
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

  const complianceYear = consignment.deliveryPeriod?.complianceYear ?? null;

  // FUTURE markets
  if (market.status === 'FUTURE') {
    if (market.id === 'EU_ETS2') {
      if (complianceYear !== null && complianceYear >= 2028) {
        return {
          gate: GATE,
          gateLabel: GATE_LABEL,
          verdict: 'PASS',
          reason: `EU ETS2 (buildings and road transport fuel suppliers) is operational for compliance year ${complianceYear} (start year: 2028). Biomethane surrendered against ETS2 obligations is tradeable under the revised EU ETS Directive.`,
          remedy: null,
          citations: [CITATIONS.EU_ETS_DIRECTIVE],
          confidence: 'HIGH',
        };
      }

      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'UNKNOWN',
        reason: complianceYear !== null
          ? `EU ETS2 compliance year ${complianceYear} is not tradeable: start date was postponed to 2028 by the Council and Parliament (March 2026). Not tradeable until the 2028 compliance year.`
          : 'EU ETS2 (buildings and road transport fuel suppliers) has been postponed to 2028 by the Council and Parliament (March 2026). Not tradeable until 2028. Many sources still reference the original 2027 start date; they are outdated.',
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

  // ACTIVE & EMERGING MARKET-SPECIFIC RULES
  switch (market.id) {
    case 'DE_THG': {
      if (complianceYear !== null && complianceYear <= 2025) {
        return {
          gate: GATE,
          gateLabel: GATE_LABEL,
          verdict: 'PASS',
          reason: `For compliance year ${complianceYear} (<= 2025), advanced biofuels retain double counting under §37a BImSchG / 38. BImSchV. Single-scenario valuation applies with 2× multiplier.`,
          remedy: null,
          citations: [CITATIONS.DE_BIMSCHG, CITATIONS.DE_38_BIMSCHV],
          confidence: 'HIGH',
        };
      }

      if (complianceYear !== null && complianceYear >= 2026) {
        return {
          gate: GATE,
          gateLabel: GATE_LABEL,
          verdict: 'UNRESOLVED',
          reason: `For compliance year ${complianceYear} (>= 2026), double counting of advanced biofuels is eliminated in the Cabinet draft (10 December 2025). Whether biomethane specifically retains double counting is unresolved. Both scenarios must be modelled.\n\n⚠ IMPORTANT DISTINCTION:\n• Double counting is a POLICY MULTIPLIER — it is being removed.\n• Manure's negative carbon intensity is a property of the GHG CALCULATION (avoided methane emissions from conventional manure management) — it is UNAFFECTED by changes to double counting.`,
          remedy: 'Model both branches (with and without double counting). Monitor the legislative process for the final BImSchV amendment.',
          citations: [CITATIONS.DE_BIMSCHG, CITATIONS.DE_38_BIMSCHV],
          confidence: 'MEDIUM',
        };
      }

      // complianceYear === null
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'UNRESOLVED',
        reason: 'Compliance year is unset on this consignment. Because German THG quota double-counting rules differ across compliance years (retained <= 2025, eliminated >= 2026 in draft legislation), the specific rule cannot be applied until a compliance year is selected. Both branches must be modelled under regulatory uncertainty.',
        remedy: 'Set the delivery period / compliance year on the consignment to determine whether double counting applies.',
        citations: [CITATIONS.DE_BIMSCHG, CITATIONS.DE_38_BIMSCHV],
        confidence: 'MEDIUM',
      };
    }

    case 'FR_CPB': {
      if (complianceYear !== null && (complianceYear < 2026 || complianceYear > 2028)) {
        return {
          gate: GATE,
          gateLabel: GATE_LABEL,
          verdict: 'CONDITIONAL',
          reason: `Delivery period / compliance year (${complianceYear}) falls outside the first France CPB restitution period (1 Jan 2026 – 31 Dec 2028). Declaration deadlines (first declaration due 1 Mar 2027) and quota liabilities may not align with this period.`,
          remedy: 'Align delivery schedule with France CPB restitution periods (Period 1: 2026–2028).',
          citations: [CITATIONS.FR_CPB],
          confidence: 'HIGH',
        };
      }

      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'France CPB is live from 1 January 2026. The €100/MWh penalty per missing CPB acts as a hard price ceiling — no supplier rationally pays more. First restitution period: 1 Jan 2026 – 31 Dec 2028; first declaration due 1 March 2027. In 2026, the obligation binds suppliers above 400 GWh/yr, falling to zero by year five. Registry: EEX.',
        remedy: null,
        citations: [CITATIONS.FR_CPB],
        confidence: 'HIGH',
      };
    }

    case 'NL_ERE':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Netherlands ERE (Emissions Reduction Units) replaced the HBE system from 1 January 2026. 1 ERE = 1 kg CO₂e avoided. The unit shift from volume-based (HBE) to CO₂e-based (ERE) structurally advantages low-CI molecules — they generate more EREs per MWh. No multipliers, no double counting. Registry: NEa REV on myVertiCer.',
        remedy: null,
        citations: [CITATIONS.NL_ERE],
        confidence: 'HIGH',
      };

    case 'IT_CIC':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: `Italy CIC: 1 CIC = 10 Gcal (conventional) or 5 Gcal (advanced, Annex IX-A under DM 2 March 2018 benchmark withdrawal mechanism). This consignment is classified as ${consignment.annexClassification === 'IX_A' ? 'advanced (5 Gcal/CIC = 5.815 MWh/CIC)' : 'conventional (10 Gcal/CIC = 11.63 MWh/CIC)'}. Registry: GSE. Injection via SNAM grid rules.`,
        remedy: null,
        citations: [CITATIONS.IT_CIC],
        confidence: 'HIGH',
      };

    case 'ES_GDO':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Spain Enagás GdO system operational under Real Decreto 376/2022. Widest origination spread in Europe (26 operational plants on GIE/EBA 2026 Map, 200+ in pipeline). Direct export to Germany and France via Ex-Domain cancellations.',
        remedy: null,
        citations: [CITATIONS.ES_RD_376],
        confidence: 'HIGH',
      };

    case 'DK_GO':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Denmark: largest biomethane grid share in Europe (>35%). Energinet registry fully interconnected with Germany (Ellund border) and Sweden (Dragør border). Ideal origin for Northern European cross-border arbitrage.',
        remedy: null,
        citations: [CITATIONS.DK_ENERGY_ACT],
        confidence: 'HIGH',
      };

    case 'PL_OZE':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Poland RES Act (Ustawa o OZE) establishes dedicated support, feed-in tariffs, and direct connection rights for biomethane up to 1 MW. High origination potential for agro-waste. Verified under KZR INiG or ISCC EU.',
        remedy: null,
        citations: [CITATIONS.PL_OZE_ACT],
        confidence: 'HIGH',
      };

    case 'SE_TAX':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Sweden Energy & Carbon Tax exemption re-approved by European Commission State Aid decision. Primary consumption in heavy road transport and municipal bus fleets. Major destination for Danish imports.',
        remedy: null,
        citations: [CITATIONS.SE_TAX_ACT],
        confidence: 'HIGH',
      };

    case 'AT_EGG':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Austria EGG (Erneuerbaren-Gase-Gesetz): green gas supplier quota rising to 7.7% by 2030 (~7.5 TWh/yr). OMV and utilities obligated to surrender green gas certificates registered with AGCS.',
        remedy: null,
        citations: [CITATIONS.AT_EGG],
        confidence: 'HIGH',
      };

    case 'FI_TRANSPORT':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Finland transport distribution obligation under Jakeluvelvoitelaki (446/2007). Cleared via Gasgrid Finland Ex-Domain cancellations and Balticconnector transit.',
        remedy: null,
        citations: [CITATIONS.FI_DIST_ACT],
        confidence: 'HIGH',
      };

    case 'BE_TRANSPORT':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Belgium transport blending mandates governed by regional decrees (VREG in Flanders, SPW in Wallonia). Major gateway for European bio-bunkering at Port of Antwerp.',
        remedy: null,
        citations: [CITATIONS.BE_REGIONAL_DECREES],
        confidence: 'HIGH',
      };

    case 'CZ_POZE':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Czech Republic POZE framework (Zákon č. 165/2012 Sb.) provides feed-in premiums for biomethane grid injection via GasNet and NET4GAS with OTE Guarantee of Origin registry.',
        remedy: null,
        citations: [CITATIONS.CZ_POZE_ACT],
        confidence: 'HIGH',
      };

    case 'EE_TRANSPORT':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Estonia Liquid Fuel Act mandate: 100% of urban bus fleets operate on domestic biomethane. Registered with Elering green gas system.',
        remedy: null,
        citations: [CITATIONS.EE_ENERGY_ACT],
        confidence: 'HIGH',
      };

    case 'LT_ALT_FUELS':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Lithuania Alternative Fuels Law mandates renewable gas blending. Amber Grid GO registry interconnected with Poland via GIPL.',
        remedy: null,
        citations: [CITATIONS.LT_ALT_FUELS],
        confidence: 'HIGH',
      };

    case 'LV_CONEXUS':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Latvia Energy Law framework for renewable gas grid injection with Conexus Baltic Grid GO registry and Inčukalns UGS regional storage.',
        remedy: null,
        citations: [CITATIONS.LV_ENERGY_LAW],
        confidence: 'HIGH',
      };

    case 'CH_VSG':
      if (consignment.injectionIsEU) {
        return {
          gate: GATE,
          gateLabel: GATE_LABEL,
          verdict: 'PASS',
          reason: 'Switzerland (Non-EU): Swiss fuel importers and gas utilities can import EU biomethane under CO2-Gesetz compensation mechanisms registered with Pronovo/VSG.',
          remedy: null,
          citations: [CITATIONS.CH_CO2_ACT],
          confidence: 'HIGH',
        };
      } else {
        return {
          gate: GATE,
          gateLabel: GATE_LABEL,
          verdict: 'PASS',
          reason: 'Domestic Swiss biomethane production cleared for Swiss transport and heating quotas.',
          remedy: null,
          citations: [CITATIONS.CH_CO2_ACT],
          confidence: 'HIGH',
        };
      }

    case 'NO_STATNETT':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Norway biofuel quota obligation (Produktforskriften Kap 3) under Miljødirektoratet oversight. Marine and heavy transport focus.',
        remedy: null,
        citations: [CITATIONS.NO_BIOFUEL_QUOTA],
        confidence: 'HIGH',
      };

    case 'UK_RTFO':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'UK RTFO: Non-EU market. Biomethane injected in the UK grid can be surrendered domestically for dRTFC compliance without EU UDB requirements. ~120 operational plants.',
        remedy: null,
        citations: [CITATIONS.UK_RTFO],
        confidence: 'HIGH',
      };

    case 'IE_RHO':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'CONDITIONAL',
        reason: 'Ireland Renewable Heat Obligation is emerging under the Climate Action Plan (5.7 TWh 2030 target). GNI green gas registry is active. High demand for imported and domestic biomethane.',
        remedy: 'Verify GNI grid injection timeline and RHO obligation start date with the Department of Environment, Climate and Communications.',
        citations: [CITATIONS.IE_RHO_FRAMEWORK],
        confidence: 'MEDIUM',
      };

    case 'PT_EEGO':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'CONDITIONAL',
        reason: 'Portugal Decreto-Lei n.º 84/2022 establishes renewable gas guarantees of origin via REN / EEGO. Pipeline scaling up.',
        remedy: 'Verify REN injection point capacity and EEGO registry registration.',
        citations: [CITATIONS.PT_DECREE_84],
        confidence: 'MEDIUM',
      };

    case 'HU_MEKH':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'CONDITIONAL',
        reason: 'Hungary MEKH framework established under Gas Act (2008. évi XL. törvény). Grid access via FGSZ.',
        remedy: 'Confirm FGSZ injection quality parameters and MEKH registry registration.',
        citations: [CITATIONS.HU_GAS_ACT],
        confidence: 'MEDIUM',
      };

    case 'SK_OKTE':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'CONDITIONAL',
        reason: 'Slovakia OKTE green gas registry and SPP-distribúcia injection standard under Zákon č. 309/2009 Z. z.',
        remedy: 'Verify OKTE registry account and SPP-D connection contract.',
        citations: [CITATIONS.SK_RES_ACT],
        confidence: 'MEDIUM',
      };

    case 'FUELEU':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'FuelEU Maritime: penalty is €2,400/tonne VLSFO-equivalent under Regulation (EU) 2023/1805. Deficit-closure model allows small low-CI bio-LNG volumes to neutralise fleet penalties.',
        remedy: null,
        citations: [CITATIONS.FUELEU_MARITIME],
        confidence: 'HIGH',
      };

    case 'EU_ETS1':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'EU ETS1: installation-level zero rating (steel, chemicals, paper). Requires RED III sustainability compliance AND actual combustion of the biomethane at the installation.',
        remedy: null,
        citations: [CITATIONS.EU_ETS_DIRECTIVE],
        confidence: 'HIGH',
      };

    case 'VOL_SCOPE1':
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: 'Voluntary corporate Scope 1 claims under GHG Protocol market-based method. Accepts book-and-claim, all certification schemes (including ISCC PLUS), no UDB mandatory recording.',
        remedy: null,
        citations: [CITATIONS.ISCC_PLUS_SCOPE],
        confidence: 'HIGH',
      };

    default:
      return {
        gate: GATE,
        gateLabel: GATE_LABEL,
        verdict: 'PASS',
        reason: `${market.name}: market-specific requirements met. Consult national TSO (${market.registry || 'National TSO'}) and reporting obligations.`,
        remedy: null,
        citations: [],
        confidence: 'MEDIUM',
      };
  }
}
