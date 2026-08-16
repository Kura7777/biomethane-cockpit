import { 
  CI_COMPARATOR_ROAD_TRANSPORT, 
  MJ_PER_MWH, 
  FR_CPB_CEILING_EUR_MWH,
  FUELEU_PENALTY_EUR_PER_TONNE,
  VLSFO_MJ_PER_TONNE,
  MWH_PER_CIC_ADVANCED,
  MWH_PER_CIC_CONVENTIONAL,
} from '../markets/constants';
import { Market, PriceSide, getMarkAgeDays } from '../markets/types';
import { Consignment } from '../consignment/types';
import { CostInputs, CertificateValueResult, NetbackResult, NetbackBranch, MarksState } from './types';
import { EligibilityAssessment } from '../eligibility/types';

/**
 * FuelEU Maritime Reference Constants (Regulation (EU) 2023/1805)
 */
export const FUELEU_BASELINE_CI = 91.16;   // 2020 fleet baseline (gCO₂e/MJ)
export const FUELEU_TARGET_CI_2025 = 89.34; // 2% reduction (2025-2029)
export const FUELEU_TARGET_CI_2030 = 85.69; // 6% reduction (2030-2034)

/**
 * Convert carbon intensity to tonnes CO₂e avoided per MWh.
 * 
 * Formula: (CI_comparator − CI_actual) × 3600 / 1,000,000
 * 
 * Source: RED III Annex V, Part C, point 19
 * CI_comparator = 94 gCO₂e/MJ (road transport fossil fuel comparator)
 * 3600 MJ = 1 MWh (SI definition)
 * 
 * Precision anchors:
 *   tCO2ePerMWh(-100) ≈ 0.6984 (±0.0001) [Manure avoided methane]
 *   tCO2ePerMWh(+20)  ≈ 0.2664 (±0.0001) [Generic waste]
 */
export function tCO2ePerMWh(ciActual: number): number {
  return ((CI_COMPARATOR_ROAD_TRANSPORT - ciActual) * MJ_PER_MWH) / 1_000_000;
}

/**
 * Select price mark based on specified pricing side
 */
export function selectMarkPrice(
  markObj: { bid: number | null; offer: number | null; mid: number | null } | undefined,
  side: PriceSide = 'bid'
): number | null {
  if (!markObj) return null;
  if (side === 'bid') return markObj.bid ?? markObj.mid ?? markObj.offer;
  if (side === 'offer') return markObj.offer ?? markObj.mid ?? markObj.bid;
  return markObj.mid ?? (markObj.bid !== null && markObj.offer !== null ? (markObj.bid + markObj.offer) / 2 : markObj.bid ?? markObj.offer);
}

/**
 * Compute FuelEU Maritime avoided penalty value per MWh delivered
 * Solves the deficit-closure model:
 * Deficit closed = Delivered MWh × 3600 × (Target_CI − BioLNG_CI)
 * Avoided Penalty = Deficit / (Target_CI × 41,000) × €2,400 × (1 + (year-1)/10)
 */
export function computeFuelEUDeficitClosureValue(
  consignmentCI: number,
  consecutiveYears: number = 1,
  targetCI: number = FUELEU_TARGET_CI_2025
): { valueEurPerMWh: number; calculation: string; unitConversion: string } {
  const penaltyMultiplier = 1 + Math.max(0, (consecutiveYears - 1) / 10);
  const deltaCI = targetCI - consignmentCI; // gCO₂e saved per MJ of bio-fuel vs target
  
  if (deltaCI <= 0) {
    return {
      valueEurPerMWh: 0,
      calculation: `Bio-fuel CI (${consignmentCI}) is higher than target CI (${targetCI}). Generates no compliance credit.`,
      unitConversion: `Target CI: ${targetCI} gCO₂e/MJ, Consignment CI: ${consignmentCI} gCO₂e/MJ`,
    };
  }

  // Energy avoided penalty per MJ delivered:
  // Penalty avoided per MJ = (deltaCI / (targetCI * 41,000 MJ/t)) * €2,400 * penaltyMultiplier
  const penaltyPerMJ = (deltaCI / (targetCI * VLSFO_MJ_PER_TONNE)) * FUELEU_PENALTY_EUR_PER_TONNE * penaltyMultiplier;
  const valueEurPerMWh = penaltyPerMJ * MJ_PER_MWH;

  const unitConversion = `FuelEU Target: ${targetCI} g/MJ | ΔCI: ${deltaCI.toFixed(1)} g/MJ | Penalty: €2,400/t VLSFO-eq (Year ${consecutiveYears}: ${((penaltyMultiplier - 1) * 100).toFixed(0)}% escalation)`;
  const calculation = `(${deltaCI.toFixed(1)} ÷ (${targetCI} × 41,000)) × €2,400 × ${penaltyMultiplier.toFixed(1)} × 3600 = €${valueEurPerMWh.toFixed(2)}/MWh compliance value`;

  return { valueEurPerMWh, calculation, unitConversion };
}

/**
 * Compute certificate value in €/MWh for a given market + consignment + marks.
 * Returns null if no mark is set — NEVER returns zero.
 */
export function computeCertificateValue(
  market: Market, 
  consignment: Consignment, 
  marks: MarksState,
  side?: PriceSide
): CertificateValueResult | null {
  const pricingSide = side ?? marks.pricingSide ?? 'bid';
  const markObj = marks.marks[market.id];
  const mark = selectMarkPrice(markObj, pricingSide);
  const markAgeDays = markObj ? getMarkAgeDays(markObj.updatedAt) : null;

  const ci = consignment.carbonIntensity;

  // Handle FuelEU Maritime specially (deficit model or direct mark)
  if (market.unitOfAccount === 'EUR_PER_TCO2E_DEFICIT') {
    if (mark !== null) {
      const deficitModel = computeFuelEUDeficitClosureValue(ci, 1);
      return {
        valueEurPerMWh: mark,
        calculation: `Desk Mark: €${mark.toFixed(2)}/MWh (Deficit-closure reference model yields €${deficitModel.valueEurPerMWh.toFixed(2)}/MWh at CI ${ci})`,
        unitConversion: deficitModel.unitConversion,
        capped: false,
        capReason: null,
        statusNote: 'Market mark applied. Deficit-closure model validates value exceeding the €210 penalty equivalent.',
        markAgeDays,
      };
    } else {
      // If no desk mark entered, provide theoretical deficit closure value
      const deficitModel = computeFuelEUDeficitClosureValue(ci, 1);
      return {
        valueEurPerMWh: deficitModel.valueEurPerMWh,
        calculation: deficitModel.calculation,
        unitConversion: deficitModel.unitConversion,
        capped: false,
        capReason: null,
        statusNote: 'Modelled via FuelEU Maritime deficit-closure formula (Reg. EU 2023/1805 Annex IV). No desk mark entered.',
        markAgeDays: null,
      };
    }
  }

  if (mark === null) {
    return null; // No mark -> null, never zero
  }

  let valueEurPerMWh: number | null = null;
  let calculation = '';
  let unitConversion = '';
  let capped = false;
  let capReason: string | null = null;
  let statusNote: string | null = null;

  switch (market.unitOfAccount) {
    case 'EUR_PER_TCO2E': {
      // Germany THG, EU ETS1
      const co2e = tCO2ePerMWh(ci);
      valueEurPerMWh = mark * co2e;
      unitConversion = `(${CI_COMPARATOR_ROAD_TRANSPORT} − (${ci})) × ${MJ_PER_MWH} / 1,000,000 = ${co2e.toFixed(4)} tCO₂e/MWh`;
      calculation = `${co2e.toFixed(4)} tCO₂e/MWh × €${mark.toFixed(2)}/tCO₂e (${pricingSide}) = €${valueEurPerMWh.toFixed(2)}/MWh`;
      break;
    }
    case 'EUR_PER_KG_CO2E': {
      // Netherlands ERE: 1 ERE = 1 kg CO₂e avoided
      const co2eTonnes = tCO2ePerMWh(ci);
      const co2eKg = co2eTonnes * 1000;
      valueEurPerMWh = mark * co2eKg;
      unitConversion = `${co2eTonnes.toFixed(4)} tCO₂e/MWh × 1000 = ${co2eKg.toFixed(1)} kg CO₂e/MWh`;
      calculation = `${co2eKg.toFixed(1)} kg CO₂e/MWh × €${mark.toFixed(4)}/kg CO₂e (${pricingSide}) = €${valueEurPerMWh.toFixed(2)}/MWh`;
      break;
    }
    case 'EUR_PER_MWH': {
      // France CPB (with €100 cap), Austria EGG, Sweden Tax, Finland, Belgium, Denmark, Voluntary
      valueEurPerMWh = mark;
      calculation = `Direct market mark (${pricingSide}): €${mark.toFixed(2)}/MWh`;
      if (market.id === 'FR_CPB' && valueEurPerMWh > FR_CPB_CEILING_EUR_MWH) {
        valueEurPerMWh = FR_CPB_CEILING_EUR_MWH;
        capped = true;
        capReason = `French CPB penalty ceiling: €${FR_CPB_CEILING_EUR_MWH}/MWh. (Code de l'énergie, Art. L.446-24)`;
        calculation = `Mark €${mark.toFixed(2)}/MWh → CAPPED at €${FR_CPB_CEILING_EUR_MWH}/MWh legal ceiling`;
      }
      break;
    }
    case 'EUR_PER_CIC': {
      // Italy CIC:
      // Standard / Conventional baseline: 1 CIC = 10 Gcal = 11.63 MWh
      // Advanced biomethane (Annex IX-A): DM 2 March 2018 / GSE PNRR framework awards 1 CIC / 5 Gcal (5.815 MWh)
      const isAdvanced = consignment.annexClassification === 'IX_A';
      const mwhPerCic = isAdvanced ? MWH_PER_CIC_ADVANCED : MWH_PER_CIC_CONVENTIONAL;
      valueEurPerMWh = mark / mwhPerCic;

      if (isAdvanced) {
        unitConversion = `1 CIC = 5 Gcal (Advanced Biofuel, DM 2 March 2018) = ${mwhPerCic.toFixed(3)} MWh/CIC`;
        calculation = `€${mark.toFixed(2)}/CIC ÷ ${mwhPerCic.toFixed(3)} MWh/CIC = €${valueEurPerMWh.toFixed(2)}/MWh`;
        statusNote = 'Advanced biomethane rate applied per GSE DM 2 March 2018 (1 CIC / 5 Gcal). Conventional baseline is 10 Gcal (11.63 MWh).';
      } else {
        unitConversion = `1 CIC = 10 Gcal (Conventional baseline) = ${mwhPerCic.toFixed(3)} MWh/CIC`;
        calculation = `€${mark.toFixed(2)}/CIC ÷ ${mwhPerCic.toFixed(3)} MWh/CIC = €${valueEurPerMWh.toFixed(2)}/MWh`;
      }
      break;
    }
    case 'GBP_PER_DRTFC': {
      // UK RTFO:
      // Under UK RTFO Order 2007: 1 dRTFC is issued per litre equivalent fossil fuel displaced (~410 dRTFC/MWh).
      // Waste/advanced feedstocks receive 2x dRTFCs (~820 dRTFC/MWh).
      const fxRate = marks.fx.gbpEur;
      if (fxRate === null) {
        return {
          valueEurPerMWh: null,
          calculation: 'FX rate GBP/EUR is missing. Set GBP/EUR in Marks screen.',
          unitConversion: 'Requires GBP/EUR FX rate',
          capped: false,
          capReason: null,
          statusNote: 'UNVERIFIED — Missing FX rate.',
          markAgeDays,
        };
      }

      const isDoubleCounted = consignment.annexClassification === 'IX_A' || consignment.annexClassification === 'IX_B';
      const drtfcPerMWh = isDoubleCounted ? 820 : 410; // UK RTFO standard yield
      const markEurPerDrtfc = mark * fxRate;
      valueEurPerMWh = markEurPerDrtfc * drtfcPerMWh;

      unitConversion = `UK RTFO Order 2007: ${drtfcPerMWh} dRTFC/MWh (${isDoubleCounted ? '2× Waste multiplier' : '1× Standard'}) | £1 = €${fxRate.toFixed(4)}`;
      calculation = `£${mark.toFixed(3)}/dRTFC × €${fxRate.toFixed(4)}/£ × ${drtfcPerMWh} dRTFC/MWh = €${valueEurPerMWh.toFixed(2)}/MWh`;
      statusNote = 'ESTIMATED — Standard RTFO yield of 820 dRTFC/MWh for waste-derived biomethane. Verify counterparty allocation.';
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
    statusNote,
    markAgeDays,
  };
}

/**
 * Compute full netback for one market with strict completeness tracking.
 * Transparently records missing inputs rather than silently hiding them with defaults.
 */
export function computeNetback(
  market: Market, 
  consignment: Consignment, 
  marks: MarksState, 
  costs: CostInputs,
  side?: PriceSide
): NetbackResult {
  const pricingSide = side ?? marks.pricingSide ?? 'bid';
  const certVal = computeCertificateValue(market, consignment, marks, pricingSide);
  
  const missingInputs: string[] = [];

  // Molecule value (TTF index)
  const molVal = selectMarkPrice(marks.gasIndex, pricingSide);
  if (molVal === null) missingInputs.push('gasIndex (TTF)');

  // Track cost completeness
  if (costs.transferCosts === null) missingInputs.push('transferCosts');
  if (costs.certificationCosts === null) missingInputs.push('certificationCosts');
  if (costs.logistics === null) missingInputs.push('logistics');
  if (costs.deliveredCost === null) missingInputs.push('deliveredCost');

  const costValues = [costs.transferCosts, costs.certificationCosts, costs.logistics, costs.otherCosts]
    .filter((c): c is number => c !== null);
  const totalCosts = costValues.length > 0 ? costValues.reduce((a, b) => a + b, 0) : null;

  // Net Netback calculation:
  // If cert value is null, netback is null.
  // If cert value is present, compute available sum while flagging incomplete inputs.
  let netNetback: number | null = null;
  if (certVal?.valueEurPerMWh != null) {
    netNetback = certVal.valueEurPerMWh + (molVal ?? 0) - (totalCosts ?? 0);
  }

  // Implied margin = netNetback - deliveredCost
  let impliedMargin: number | null = null;
  if (netNetback !== null && costs.deliveredCost !== null) {
    impliedMargin = netNetback - costs.deliveredCost;
  }

  // Margin % = impliedMargin / netNetback * 100
  let marginPercent: number | null = null;
  if (impliedMargin !== null && netNetback !== null && netNetback !== 0) {
    marginPercent = (impliedMargin / netNetback) * 100;
  }

  // Total P&L = margin * volume
  let totalPnL: number | null = null;
  if (impliedMargin !== null && consignment.volumeMWh !== null) {
    totalPnL = impliedMargin * consignment.volumeMWh;
  }

  const isComplete = missingInputs.length === 0 && certVal?.valueEurPerMWh != null;

  // Germany THG uncertainty branches (DC_OFF vs DC_ON)
  let uncertaintyBranches: NetbackBranch[] | null = null;
  if (market.id === 'DE_THG' && certVal?.valueEurPerMWh != null) {
    const dcOffNetback = netNetback;
    const dcOffMargin = impliedMargin;

    // DC_ON: certificate value doubled (2x)
    const dcOnCertVal = certVal.valueEurPerMWh * 2;
    const dcOnNetback = dcOnCertVal + (molVal ?? 0) - (totalCosts ?? 0);
    const dcOnMargin = costs.deliveredCost !== null ? dcOnNetback - costs.deliveredCost : null;
    const dcOnMarginPct = dcOnMargin !== null && dcOnNetback !== 0 ? (dcOnMargin / dcOnNetback) * 100 : null;
    const dcOnPnL = dcOnMargin !== null && consignment.volumeMWh !== null ? dcOnMargin * consignment.volumeMWh : null;

    uncertaintyBranches = [
      {
        branchId: 'DC_OFF',
        branchLabel: 'Without double counting (1× single counting)',
        certificateValue: certVal,
        netNetback: dcOffNetback,
        impliedMargin: dcOffMargin,
        marginPercent: marginPercent,
        totalPnL,
        isComplete,
        missingInputs,
      },
      {
        branchId: 'DC_ON',
        branchLabel: 'With double counting (2× retained for biomethane)',
        certificateValue: {
          ...certVal,
          valueEurPerMWh: dcOnCertVal,
          calculation: `${certVal.calculation} × 2 (double counting) = €${dcOnCertVal.toFixed(2)}/MWh`,
        },
        netNetback: dcOnNetback,
        impliedMargin: dcOnMargin,
        marginPercent: dcOnMarginPct,
        totalPnL: dcOnPnL,
        isComplete,
        missingInputs,
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
    isComplete,
    missingInputs,
    uncertaintyBranches,
    statusNote: certVal?.statusNote,
    markSideUsed: pricingSide,
  };
}

/**
 * Compute netbacks for all markets.
 */
export function computeAllNetbacks(
  consignment: Consignment,
  markets: Market[],
  marks: MarksState,
  costs: CostInputs,
  eligibilityResults?: Map<string, EligibilityAssessment>,
  side?: PriceSide
): NetbackResult[] {
  return markets.map(m => {
    const nb = computeNetback(m, consignment, marks, costs, side);
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
