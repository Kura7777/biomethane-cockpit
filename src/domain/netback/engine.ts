import { 
  CI_COMPARATOR_ROAD_TRANSPORT, 
  MJ_PER_MWH, 
  FR_CPB_CEILING_EUR_MWH,
  FUELEU_PENALTY_EUR_PER_TONNE,
  VLSFO_MJ_PER_TONNE,
  MWH_PER_CIC_ADVANCED,
  MWH_PER_CIC_CONVENTIONAL,
} from '../markets/constants';
import { Market } from '../markets/types';
import { Consignment } from '../consignment/types';
import { CostInputs, CertificateValueResult, NetbackResult, NetbackBranch, MarksState } from './types';
import { EligibilityAssessment } from '../eligibility/types';

/**
 * Convert carbon intensity to tonnes CO₂e avoided per MWh.
 * 
 * Formula: (CI_comparator − CI_actual) × 3600 / 1,000,000
 * 
 * Source: RED III Annex V, Part C, point 19
 * CI_comparator = 94 gCO₂e/MJ (road transport fossil fuel comparator)
 * 3600 MJ = 1 MWh (SI definition)
 * 
 * MUST satisfy:
 *   tCO2ePerMWh(-100) ≈ 0.6984  (manure biomethane)
 *   tCO2ePerMWh(+20)  ≈ 0.2664  (generic waste)
 */
export function tCO2ePerMWh(ciActual: number): number {
  return ((CI_COMPARATOR_ROAD_TRANSPORT - ciActual) * MJ_PER_MWH) / 1_000_000;
}

/**
 * Compute certificate value in €/MWh for a given market + consignment + marks.
 * Returns null if no mark is set — NEVER returns zero.
 */
export function computeCertificateValue(
  market: Market, 
  consignment: Consignment, 
  marks: MarksState
): CertificateValueResult | null {
  const markObj = marks.marks[market.id];
  if (!markObj || (markObj.bid === null && markObj.offer === null && markObj.mid === null)) {
    return null; // No mark → null, never zero
  }
  // Use bid when selling certificates (conservative), fall back to mid, then offer
  const mark = markObj.bid ?? markObj.mid ?? markObj.offer!;

  let valueEurPerMWh: number | null = null;
  let calculation = '';
  let unitConversion = '';
  let capped = false;
  let capReason: string | null = null;

  const ci = consignment.carbonIntensity;

  switch (market.unitOfAccount) {
    case 'EUR_PER_TCO2E': {
      // Germany THG, EU ETS1
      const co2e = tCO2ePerMWh(ci);
      valueEurPerMWh = mark * co2e;
      unitConversion = `(${CI_COMPARATOR_ROAD_TRANSPORT} − (${ci})) × ${MJ_PER_MWH} / 1,000,000 = ${co2e.toFixed(4)} tCO₂e/MWh`;
      calculation = `${co2e.toFixed(4)} tCO₂e/MWh × €${mark.toFixed(2)}/tCO₂e = €${valueEurPerMWh.toFixed(2)}/MWh`;
      break;
    }
    case 'EUR_PER_KG_CO2E': {
      // Netherlands ERE: 1 ERE = 1 kg CO₂e avoided
      const co2eTonnes = tCO2ePerMWh(ci);
      const co2eKg = co2eTonnes * 1000;
      valueEurPerMWh = mark * co2eKg;
      unitConversion = `${co2eTonnes.toFixed(4)} tCO₂e/MWh × 1000 = ${co2eKg.toFixed(1)} kg CO₂e/MWh`;
      calculation = `${co2eKg.toFixed(1)} kg CO₂e/MWh × €${mark.toFixed(4)}/kg CO₂e = €${valueEurPerMWh.toFixed(2)}/MWh`;
      break;
    }
    case 'EUR_PER_MWH': {
      // France CPB (with cap), Austria, Sweden, Finland, Belgium, Denmark, Voluntary
      valueEurPerMWh = mark;
      calculation = `Direct: €${mark.toFixed(2)}/MWh`;
      if (market.id === 'FR_CPB' && valueEurPerMWh > FR_CPB_CEILING_EUR_MWH) {
        valueEurPerMWh = FR_CPB_CEILING_EUR_MWH;
        capped = true;
        capReason = `French CPB penalty ceiling: €${FR_CPB_CEILING_EUR_MWH}/MWh. No supplier rationally pays above the penalty. (Code de l'énergie, Art. L.446-24)`;
        calculation = `Mark €${mark.toFixed(2)}/MWh → CAPPED at €${FR_CPB_CEILING_EUR_MWH}/MWh`;
      }
      break;
    }
    case 'EUR_PER_CIC': {
      // Italy CIC: advanced (Annex IX-A) gets 1 CIC per 5 Gcal, conventional gets 1 CIC per 10 Gcal
      const isAdvanced = consignment.annexClassification === 'IX_A';
      const mwhPerCic = isAdvanced ? MWH_PER_CIC_ADVANCED : MWH_PER_CIC_CONVENTIONAL;
      valueEurPerMWh = mark / mwhPerCic;
      unitConversion = `1 CIC = ${isAdvanced ? '5 Gcal (Advanced, Annex IX-A double counting)' : '10 Gcal (Conventional)'} = ${mwhPerCic.toFixed(3)} MWh`;
      calculation = `€${mark.toFixed(2)}/CIC ÷ ${mwhPerCic.toFixed(3)} MWh/CIC = €${valueEurPerMWh.toFixed(2)}/MWh`;
      break;
    }
    case 'GBP_PER_DRTFC': {
      // UK RTFO: requires FX conversion
      if (marks.fx.gbpEur === null) return null;
      // Simplified: 1 dRTFC per MWh (actual varies by feedstock/CI; structure accepts future refinement)
      const drtfcPerMWh = 1.0; 
      const markEur = mark * marks.fx.gbpEur;
      valueEurPerMWh = markEur / drtfcPerMWh;
      unitConversion = `£1 = €${marks.fx.gbpEur.toFixed(4)}; 1 dRTFC ≈ ${drtfcPerMWh} MWh (simplified)`;
      calculation = `£${mark.toFixed(2)}/dRTFC × €${marks.fx.gbpEur.toFixed(4)}/£ ÷ ${drtfcPerMWh} dRTFC/MWh = €${valueEurPerMWh.toFixed(2)}/MWh`;
      break;
    }
    case 'EUR_PER_TCO2E_DEFICIT': {
      // FuelEU Maritime: penalty-based reference, NOT capped
      const penaltyPerMj = FUELEU_PENALTY_EUR_PER_TONNE / VLSFO_MJ_PER_TONNE;
      const baseValue = penaltyPerMj * MJ_PER_MWH;
      // Use mark if provided; this represents willingness to pay, which can exceed penalty equivalent
      valueEurPerMWh = mark;
      unitConversion = `Penalty reference: €${FUELEU_PENALTY_EUR_PER_TONNE}/t ÷ ${VLSFO_MJ_PER_TONNE} MJ/t × ${MJ_PER_MWH} MJ/MWh = €${baseValue.toFixed(2)}/MWh floor`;
      calculation = `Market mark: €${mark.toFixed(2)}/MWh (penalty floor: €${baseValue.toFixed(2)}/MWh — value can exceed this via deficit-closure leverage)`;
      break;
    }
    default:
      return null;
  }

  return {
    valueEurPerMWh,
    calculation,
    unitConversion,
    capped,
    capReason,
  };
}

/**
 * Compute full netback for one market.
 * All cost components default to null (not zero). Null propagates through the calculation.
 */
export function computeNetback(
  market: Market, 
  consignment: Consignment, 
  marks: MarksState, 
  costs: CostInputs
): NetbackResult {
  const certVal = computeCertificateValue(market, consignment, marks);
  
  // Sum costs — only include non-null values
  const costValues = [costs.transferCosts, costs.certificationCosts, costs.logistics, costs.otherCosts]
    .filter((c): c is number => c !== null);
  const totalCosts = costValues.length > 0 ? costValues.reduce((a, b) => a + b, 0) : null;

  const molVal = marks.gasIndex.mid;

  // Net netback = certificate + molecule - costs
  let netNetback: number | null = null;
  if (certVal?.valueEurPerMWh != null) {
    netNetback = certVal.valueEurPerMWh + (molVal ?? 0) - (totalCosts ?? 0);
  }

  // Implied margin = netback - delivered cost
  let impliedMargin: number | null = null;
  if (netNetback !== null && costs.deliveredCost !== null) {
    impliedMargin = netNetback - costs.deliveredCost;
  }

  // Margin % = margin / netback * 100
  let marginPercent: number | null = null;
  if (impliedMargin !== null && netNetback !== null && netNetback !== 0) {
    marginPercent = (impliedMargin / netNetback) * 100;
  }

  // Total P&L = margin * volume
  let totalPnL: number | null = null;
  if (impliedMargin !== null && consignment.volumeMWh !== null) {
    totalPnL = impliedMargin * consignment.volumeMWh;
  }

  // Germany: split into double counting branches
  let uncertaintyBranches: NetbackBranch[] | null = null;
  if (market.id === 'DE_THG' && certVal?.valueEurPerMWh != null) {
    // DC_ON branch: certificate value × 2
    const dcOnCertValue = certVal.valueEurPerMWh * 2;
    const dcOnNetback = dcOnCertValue + (molVal ?? 0) - (totalCosts ?? 0);
    const dcOnMargin = costs.deliveredCost !== null ? dcOnNetback - costs.deliveredCost : null;
    const dcOnMarginPct = dcOnMargin !== null && dcOnNetback !== 0 ? (dcOnMargin / dcOnNetback) * 100 : null;
    const dcOnPnL = dcOnMargin !== null && consignment.volumeMWh !== null ? dcOnMargin * consignment.volumeMWh : null;

    uncertaintyBranches = [
      {
        branchId: 'DC_OFF',
        branchLabel: 'Without double counting (1×)',
        certificateValue: certVal,
        netNetback,
        impliedMargin,
        marginPercent,
        totalPnL,
      },
      {
        branchId: 'DC_ON',
        branchLabel: 'With double counting (2×)',
        certificateValue: {
          ...certVal,
          valueEurPerMWh: dcOnCertValue,
          calculation: `${certVal.calculation} × 2 (double counting) = €${dcOnCertValue.toFixed(2)}/MWh`,
        },
        netNetback: dcOnNetback,
        impliedMargin: dcOnMargin,
        marginPercent: dcOnMarginPct,
        totalPnL: dcOnPnL,
      },
    ];
  }

  return {
    marketId: market.id,
    marketName: market.name,
    certificateValue: certVal,
    moleculeValue: molVal,
    totalCosts,
    netNetback,
    impliedMargin,
    marginPercent,
    totalPnL,
    isTheoretical: false,
    blockingReason: null,
    uncertaintyBranches,
  };
}

/**
 * Compute netbacks for all markets.
 * If eligibility results are provided, mark blocked/unresolved markets as theoretical.
 */
export function computeAllNetbacks(
  consignment: Consignment,
  markets: Market[],
  marks: MarksState,
  costs: CostInputs,
  eligibilityResults?: Map<string, EligibilityAssessment>
): NetbackResult[] {
  return markets.map(m => {
    const nb = computeNetback(m, consignment, marks, costs);
    if (eligibilityResults) {
      const eligibility = eligibilityResults.get(m.id);
      if (eligibility && eligibility.overallVerdict !== 'ELIGIBLE' && eligibility.overallVerdict !== 'CONDITIONAL') {
        nb.isTheoretical = true;
        nb.blockingReason = eligibility.summary;
      }
    }
    return nb;
  });
}
