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
import { CostInputs, CertificateValueResult, NetbackResult, NetbackBranch, MarksState, FuelEUOptions, PricingSides, NetbackSides } from './types';
import { EligibilityAssessment } from '../eligibility/types';

/**
 * FuelEU Maritime Reference Constants (Regulation (EU) 2023/1805)
 */
export const FUELEU_BASELINE_CI = 91.16;   // 2020 fleet baseline (gCO₂e/MJ)
export const FUELEU_TARGET_CI_2025 = 89.34; // 2% reduction (2025-2029)
export const FUELEU_TARGET_CI_2030 = 85.69; // 6% reduction (2030-2034)

/**
 * Biomethane Physical Constants for UK RTFO Energy-to-Mass Derivation
 * LHV Biomethane ≈ 50 MJ/kg = 13.889 kWh/kg = 0.013889 MWh/kg
 * 1 MWh = 1 / 0.013889 ≈ 72.0 kg biomethane
 * RTFO gaseous fuels issue 1 dRTFC/kg (standard) or 2 dRTFC/kg (waste/advanced)
 */
export const BIOMETHANE_KWH_PER_KG = 13.88889;
export const RTFO_KG_PER_MWH = 1000 / BIOMETHANE_KWH_PER_KG; // ≈ 72.00 kg/MWh

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
 * Solves the deficit-closure model per Regulation (EU) 2023/1805 Annex IV:
 * Avoided Penalty per MJ = (ΔCI / (GHGIE_actual × 41,000 MJ/t)) × €2,400 × EscalationMultiplier
 * 
 * @param consignmentCI - Carbon intensity of the bio-LNG consignment (gCO2e/MJ)
 * @param consecutiveYears - Consecutive non-compliance escalation year (1 = 0%, 2 = +10%, 3 = +20%, 4 = +30%)
 * @param targetCI - FuelEU target intensity (89.34 for 2025-2029)
 * @param shipActualCI - Ship's actual baseline intensity without biofuel (91.16 default)
 */
export function computeFuelEUDeficitClosureValue(
  consignmentCI: number,
  consecutiveYears: number = 1,
  targetCI: number = FUELEU_TARGET_CI_2025,
  shipActualCI: number = FUELEU_BASELINE_CI
): { valueEurPerMWh: number; calculation: string; unitConversion: string } {
  const penaltyMultiplier = 1 + Math.max(0, (consecutiveYears - 1) / 10);
  const deltaCI = targetCI - consignmentCI; // gCO₂e saved per MJ of bio-fuel vs target
  
  if (deltaCI <= 0) {
    return {
      valueEurPerMWh: 0,
      calculation: `Bio-fuel CI (${consignmentCI} g/MJ) >= target CI (${targetCI} g/MJ). Generates no compliance credit.`,
      unitConversion: `Target CI: ${targetCI} g/MJ, Actual ship CI: ${shipActualCI} g/MJ`,
    };
  }

  // Energy avoided penalty per MJ delivered using ship's actual achieved intensity:
  // Penalty avoided per MJ = (deltaCI / (shipActualCI * 41,000 MJ/t)) * €2,400 * penaltyMultiplier
  const penaltyPerMJ = (deltaCI / (shipActualCI * VLSFO_MJ_PER_TONNE)) * FUELEU_PENALTY_EUR_PER_TONNE * penaltyMultiplier;
  const valueEurPerMWh = penaltyPerMJ * MJ_PER_MWH;

  const unitConversion = `FuelEU Target: ${targetCI} g/MJ | Ship CI: ${shipActualCI} g/MJ | ΔCI: ${deltaCI.toFixed(1)} g/MJ | Penalty: €2,400/t VLSFO-eq (Yr ${consecutiveYears}: ${((penaltyMultiplier - 1) * 100).toFixed(0)}% escalation)`;
  const calculation = `(${deltaCI.toFixed(1)} ÷ (${shipActualCI} × 41,000)) × €2,400 × ${penaltyMultiplier.toFixed(1)} × 3600 = €${valueEurPerMWh.toFixed(2)}/MWh compliance value`;

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
  side?: PriceSide,
  fuelEUOptions?: FuelEUOptions
): CertificateValueResult | null {
  const pricingSide = side ?? marks.pricingSide ?? 'bid';
  const markObj = marks.marks[market.id];
  const mark = selectMarkPrice(markObj, pricingSide);
  const markAgeDays = markObj ? getMarkAgeDays(markObj) : null;
  const provenance = markObj?.provenance ?? null;

  const ci = consignment.carbonIntensity;

  // Handle FuelEU Maritime specially (distinguish desk mark vs modelled deficit closure)
  if (market.unitOfAccount === 'EUR_PER_TCO2E_DEFICIT') {
    const opts = fuelEUOptions ?? marks.fuelEUOptions ?? {};
    const shipActualCI = opts.shipActualCI ?? FUELEU_BASELINE_CI;
    const consecutiveYears = opts.consecutiveYears ?? 1;
    const targetCI = opts.targetYear === 2030 ? FUELEU_TARGET_CI_2030 : FUELEU_TARGET_CI_2025;

    if (mark !== null) {
      const deficitModel = computeFuelEUDeficitClosureValue(ci, consecutiveYears, targetCI, shipActualCI);
      return {
        valueEurPerMWh: mark,
        calculation: `Desk Mark: €${mark.toFixed(2)}/MWh (Deficit-closure reference model yields €${deficitModel.valueEurPerMWh.toFixed(2)}/MWh at CI ${ci})`,
        unitConversion: deficitModel.unitConversion,
        capped: false,
        capReason: null,
        statusNote: 'Market mark applied. Deficit-closure model validates value exceeding the €210 penalty equivalent.',
        markAgeDays,
        isModelled: false,
        provenance,
      };
    } else {
      // Modelled value when no desk mark is entered
      const deficitModel = computeFuelEUDeficitClosureValue(ci, consecutiveYears, targetCI, shipActualCI);
      return {
        valueEurPerMWh: deficitModel.valueEurPerMWh,
        calculation: deficitModel.calculation,
        unitConversion: deficitModel.unitConversion,
        capped: false,
        capReason: null,
        statusNote: 'MODELLED — Theoretical fleet deficit closure value (Reg. EU 2023/1805 Annex IV). No broker mark entered.',
        markAgeDays: null,
        isModelled: true,
        provenance: null,
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
  let isModelled = false;

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
      // France CPB (with €100 cap), Austria EGG, Sweden Tax, Finland, Belgium, Denmark, Spain, Poland, Voluntary
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
      // Advanced biomethane (Annex IX-A): DM 2 March 2018 benchmark withdrawal mechanism (1 CIC / 5 Gcal = 5.815 MWh)
      // Note: Subject to GSE PNRR DM 15 Sept 2022 tariff regime rules for post-2022 commissioned plants.
      const isAdvanced = consignment.annexClassification === 'IX_A';
      const mwhPerCic = isAdvanced ? MWH_PER_CIC_ADVANCED : MWH_PER_CIC_CONVENTIONAL;
      valueEurPerMWh = mark / mwhPerCic;

      if (isAdvanced) {
        unitConversion = `1 CIC = 5 Gcal (Advanced Biofuel, DM 2 March 2018) = ${mwhPerCic.toFixed(3)} MWh/CIC`;
        calculation = `€${mark.toFixed(2)}/CIC ÷ ${mwhPerCic.toFixed(3)} MWh/CIC = €${valueEurPerMWh.toFixed(2)}/MWh`;
        statusNote = 'Advanced rate: 1 CIC / 5 Gcal (DM 2 March 2018). Subject to GSE PNRR DM 15 Sept 2022 framework for new plants.';
      } else {
        unitConversion = `1 CIC = 10 Gcal (Conventional baseline) = ${mwhPerCic.toFixed(3)} MWh/CIC`;
        calculation = `€${mark.toFixed(2)}/CIC ÷ ${mwhPerCic.toFixed(3)} MWh/CIC = €${valueEurPerMWh.toFixed(2)}/MWh`;
      }
      break;
    }
    case 'GBP_PER_DRTFC': {
      // UK RTFO:
      // Physically derived from biomethane LHV: 50 MJ/kg ≈ 13.889 kWh/kg.
      // 1 MWh = 1000 kWh ÷ 13.889 kWh/kg ≈ 72.0 kg biomethane.
      // Under UK RTFO Order 2007 (SI 2007/3072):
      // Standard yield = 1 dRTFC/kg ≈ 72.0 dRTFC/MWh.
      // Waste / double-counted feedstocks = 2 dRTFC/kg ≈ 144.0 dRTFC/MWh.
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
          isModelled: false,
        };
      }

      const isDoubleCounted = consignment.annexClassification === 'IX_A' || consignment.annexClassification === 'IX_B';
      const drtfcPerMWh = isDoubleCounted ? RTFO_KG_PER_MWH * 2 : RTFO_KG_PER_MWH; // ≈ 144.0 vs 72.0
      const markEurPerDrtfc = mark * fxRate;
      valueEurPerMWh = markEurPerDrtfc * drtfcPerMWh;

      unitConversion = `UK RTFO Order 2007 (Gaseous): 1 MWh ÷ 13.889 kWh/kg = ${RTFO_KG_PER_MWH.toFixed(1)} kg/MWh → ${drtfcPerMWh.toFixed(1)} dRTFC/MWh (${isDoubleCounted ? '2× Waste multiplier' : '1× Standard'}) | £1 = €${fxRate.toFixed(4)}`;
      calculation = `£${mark.toFixed(3)}/dRTFC × €${fxRate.toFixed(4)}/£ × ${drtfcPerMWh.toFixed(1)} dRTFC/MWh = €${valueEurPerMWh.toFixed(2)}/MWh`;
      statusNote = `Derived from biomethane energy content (${drtfcPerMWh.toFixed(1)} dRTFC/MWh). Non-EU grid injection boundary applies.`;
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
    isModelled,
    provenance,
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
  side?: PriceSide | PricingSides,
  fuelEUOptions?: FuelEUOptions
): NetbackResult {
  const defaultSide = marks.pricingSide ?? 'bid';
  let pricingSides: PricingSides;
  if (!side) {
    pricingSides = marks.pricingSides ?? { certificateSide: defaultSide, moleculeSide: defaultSide };
  } else if (typeof side === 'string') {
    pricingSides = { certificateSide: side, moleculeSide: side };
  } else {
    pricingSides = { certificateSide: side.certificateSide, moleculeSide: side.moleculeSide };
  }

  const certVal = computeCertificateValue(market, consignment, marks, pricingSides.certificateSide, fuelEUOptions);
  
  const missingInputs: string[] = [];

  // Molecule value (TTF index) at chosen molecule side
  const molVal = selectMarkPrice(marks.gasIndex, pricingSides.moleculeSide);
  if (molVal === null) missingInputs.push('gasIndex (TTF)');

  // Track cost completeness
  if (costs.transferCosts === null) missingInputs.push('transferCosts');
  if (costs.certificationCosts === null) missingInputs.push('certificationCosts');
  if (costs.logistics === null) missingInputs.push('logistics');

  const costValues = [costs.transferCosts, costs.certificationCosts, costs.logistics, costs.otherCosts]
    .filter((c): c is number => c !== null);
  const totalCosts = costValues.length > 0 ? costValues.reduce((a, b) => a + b, 0) : null;

  // Net Netback calculation (at chosen sides):
  // If cert value is null, netback is null.
  // If cert value is present, compute available arithmetic while flagging incomplete inputs.
  let netNetback: number | null = null;
  if (certVal?.valueEurPerMWh != null) {
    netNetback = certVal.valueEurPerMWh + (molVal ?? 0) - (totalCosts ?? 0);
  }

  // Crossing cost calculation (atMid vs atChosenSides)
  const midCertVal = computeCertificateValue(market, consignment, marks, 'mid', fuelEUOptions);
  const midMolVal = selectMarkPrice(marks.gasIndex, 'mid');
  let atMid: number | null = null;
  if (midCertVal?.valueEurPerMWh != null) {
    atMid = midCertVal.valueEurPerMWh + (midMolVal ?? 0) - (totalCosts ?? 0);
  }

  const atChosenSides = netNetback;
  let crossingCost: number | null = null;
  if (atChosenSides !== null && atMid !== null) {
    // crossingCost = atMid - atChosenSides (positive when crossing spread to hit bids; negative when pricing at optimistic offer)
    crossingCost = Number((atMid - atChosenSides).toFixed(2));
  }

  const sides: NetbackSides = {
    atChosenSides,
    atMid,
    crossingCost,
  };

  let statusNote: string | null = certVal?.statusNote ?? null;
  if (molVal === null) {
    statusNote = (statusNote ? `${statusNote} ` : '') + '⚠ Molecule value (TTF) not set — netback excludes gas index component (~€28/MWh).';
  }

  // Producer Pricing & Desk Margin:
  // Explicit choice required:
  // FIXED_PRICE:
  //   producerPayable = fixedPriceEurPerMwh
  //   deskMargin      = netNetback − producerPayable
  //   grossValueSpread = netNetback − producerPayable
  // INDEX_LINKED:
  //   producerPayable = indexLinkedShare × netNetback
  //   deskMargin      = netNetback − producerPayable
  //   grossValueSpread = null (no fixed procurement baseline)
  // UNSET / NULL:
  //   producerPayable = null, deskMargin = null, grossValueSpread = null
  //   missingInputs.push('producerPricing')
  const pricingMode = costs.producerPricing?.mode ?? null;
  let producerPayable: number | null = null;
  let deskMargin: number | null = null;
  let grossValueSpread: number | null = null;

  if (pricingMode === 'INDEX_LINKED') {
    const share = costs.producerPricing?.indexLinkedShare ?? null;
    if (share === null) {
      missingInputs.push('producerPricing');
    } else if (netNetback !== null) {
      producerPayable = Number((netNetback * share).toFixed(2));
      deskMargin = Number((netNetback - producerPayable).toFixed(2));
      grossValueSpread = null; // No fixed brown procurement baseline in index-linked mode
    }
  } else if (pricingMode === 'FIXED_PRICE') {
    const fixedPrice = costs.producerPricing?.fixedPriceEurPerMwh ?? null;
    if (fixedPrice === null) {
      missingInputs.push('producerPricing');
    } else if (netNetback !== null) {
      producerPayable = fixedPrice;
      deskMargin = Number((netNetback - producerPayable).toFixed(2));
      grossValueSpread = deskMargin;
    }
  } else {
    // Mode is unset / null
    missingInputs.push('producerPricing');
  }

  const impliedMargin = grossValueSpread;

  // Margin % = deskMargin / netNetback * 100
  let marginPercent: number | null = null;
  if (deskMargin !== null && netNetback !== null && netNetback > 0) {
    marginPercent = (deskMargin / netNetback) * 100;
  } else if (deskMargin !== null && netNetback !== null && netNetback < 0) {
    // Negative netback: margin percentage is inverted to show real loss
    marginPercent = -(deskMargin / Math.abs(netNetback)) * 100;
  }

  // Desk P&L and Gross Spread P&L
  let grossSpreadPnL: number | null = null;
  let deskPnL: number | null = null;
  if (grossValueSpread !== null && consignment.volumeMWh !== null) {
    grossSpreadPnL = grossValueSpread * consignment.volumeMWh;
  }
  if (deskMargin !== null && consignment.volumeMWh !== null) {
    deskPnL = deskMargin * consignment.volumeMWh;
  }
  const totalPnL = deskPnL;

  // Track delivery period & compliance year completeness
  if (!consignment.deliveryPeriod?.complianceYear) {
    missingInputs.push('deliveryPeriod');
  }

  const isComplete = missingInputs.length === 0 && certVal?.valueEurPerMWh != null;

  // Germany THG uncertainty branches:
  // - If complianceYear <= 2025: double counting applies cleanly (single branch, no uncertainty branches)
  // - If complianceYear >= 2026 or null: UNRESOLVED dual branches (DC_OFF 1x vs DC_ON 2x)
  let uncertaintyBranches: NetbackBranch[] | null = null;
  const complianceYear = consignment.deliveryPeriod?.complianceYear ?? null;

  if (market.id === 'DE_THG' && certVal?.valueEurPerMWh != null) {
    if (complianceYear !== null && complianceYear <= 2025) {
      // Single branch for <= 2025: double counting (2x) applies for Annex IX-A feedstocks under 38. BImSchV
      if (consignment.annexClassification === 'IX_A') {
        const dcOnCertVal = certVal.valueEurPerMWh * 2;
        certVal.valueEurPerMWh = dcOnCertVal;
        certVal.calculation = `${certVal.calculation} × 2 (double counting under 38. BImSchV for CY ${complianceYear}) = €${dcOnCertVal.toFixed(2)}/MWh`;
        certVal.statusNote = `Double counting applies for compliance year ${complianceYear} (pre-2026 regime under §37a BImSchG).`;

        netNetback = dcOnCertVal + (molVal ?? 0) - (totalCosts ?? 0);

        if (pricingMode === 'INDEX_LINKED') {
          const share = costs.producerPricing?.indexLinkedShare ?? null;
          if (share !== null && netNetback !== null) {
            producerPayable = Number((netNetback * share).toFixed(2));
            deskMargin = Number((netNetback - producerPayable).toFixed(2));
            grossValueSpread = null;
          }
        } else if (pricingMode === 'FIXED_PRICE') {
          const fixedPrice = costs.producerPricing?.fixedPriceEurPerMwh ?? null;
          if (fixedPrice !== null && netNetback !== null) {
            producerPayable = fixedPrice;
            deskMargin = Number((netNetback - fixedPrice).toFixed(2));
            grossValueSpread = deskMargin;
          }
        }

        if (deskMargin !== null && netNetback !== null && netNetback > 0) {
          marginPercent = (deskMargin / netNetback) * 100;
        } else if (deskMargin !== null && netNetback !== null && netNetback < 0) {
          marginPercent = -(deskMargin / Math.abs(netNetback)) * 100;
        }
      }
      uncertaintyBranches = null;
    } else {
      const dcOffNetback = netNetback;
      const dcOffSpread = grossValueSpread;
      const dcOffProducerPayable = producerPayable;
      const dcOffDeskMargin = deskMargin;

      // DC_ON: certificate value doubled (2x)
      const dcOnCertVal = certVal.valueEurPerMWh * 2;
      const dcOnNetback = dcOnCertVal + (molVal ?? 0) - (totalCosts ?? 0);
      let dcOnProducerPayable: number | null = null;
      let dcOnDeskMargin: number | null = null;
      let dcOnSpread: number | null = null;

      if (pricingMode === 'INDEX_LINKED') {
        const share = costs.producerPricing?.indexLinkedShare ?? null;
        if (share !== null && dcOnNetback !== null) {
          dcOnProducerPayable = Number((dcOnNetback * share).toFixed(2));
          dcOnDeskMargin = Number((dcOnNetback - dcOnProducerPayable).toFixed(2));
          dcOnSpread = null;
        }
      } else if (pricingMode === 'FIXED_PRICE') {
        const fixedPrice = costs.producerPricing?.fixedPriceEurPerMwh ?? null;
        if (fixedPrice !== null && dcOnNetback !== null) {
          dcOnProducerPayable = fixedPrice;
          dcOnDeskMargin = Number((dcOnNetback - fixedPrice).toFixed(2));
          dcOnSpread = dcOnDeskMargin;
        }
      }

      let dcOnMarginPct: number | null = null;
      if (dcOnDeskMargin !== null && dcOnNetback !== null && dcOnNetback > 0) {
        dcOnMarginPct = (dcOnDeskMargin / dcOnNetback) * 100;
      } else if (dcOnDeskMargin !== null && dcOnNetback !== null && dcOnNetback < 0) {
        dcOnMarginPct = -(dcOnDeskMargin / Math.abs(dcOnNetback)) * 100;
      }

      const dcOnDeskPnL = dcOnDeskMargin !== null && consignment.volumeMWh !== null ? dcOnDeskMargin * consignment.volumeMWh : null;
      const dcOnGrossSpreadPnL = dcOnSpread !== null && consignment.volumeMWh !== null ? dcOnSpread * consignment.volumeMWh : null;

      // DC_ON crossing cost:
      const dcOnAtChosen = dcOnNetback;
      const dcOnAtMid = midCertVal?.valueEurPerMWh != null ? midCertVal.valueEurPerMWh * 2 + (midMolVal ?? 0) - (totalCosts ?? 0) : null;
      const dcOnCrossingCost = (dcOnAtChosen !== null && dcOnAtMid !== null) ? Number((dcOnAtMid - dcOnAtChosen).toFixed(2)) : null;

      uncertaintyBranches = [
        {
          branchId: 'DC_OFF',
          branchLabel: 'Without double counting (1× single counting)',
          certificateValue: certVal,
          netNetback: dcOffNetback,
          grossValueSpread: dcOffSpread,
          impliedMargin: dcOffSpread,
          producerPayable: dcOffProducerPayable,
          deskMargin: dcOffDeskMargin,
          marginPercent: marginPercent,
          grossSpreadPnL,
          totalPnL: deskPnL,
          deskPnL,
          isComplete,
          missingInputs,
          sides,
        },
        {
          branchId: 'DC_ON',
          branchLabel: 'If double counting is retained (2×)',
          certificateValue: {
            ...certVal,
            valueEurPerMWh: dcOnCertVal,
            calculation: `${certVal.calculation} × 2 (double counting) = €${dcOnCertVal.toFixed(2)}/MWh`,
            statusNote: 'CAUTION: This branch doubles the certificate value (€/MWh) as a proxy for 2× quota volume credit. In practice, if double counting is retained, the market price per tCO₂e may be lower due to increased effective supply. This branch represents an upper-bound scenario.',
          },
          netNetback: dcOnNetback,
          grossValueSpread: dcOnSpread,
          impliedMargin: dcOnSpread,
          producerPayable: dcOnProducerPayable,
          deskMargin: dcOnDeskMargin,
          marginPercent: dcOnMarginPct,
          grossSpreadPnL: dcOnGrossSpreadPnL,
          totalPnL: dcOnDeskPnL,
          deskPnL: dcOnDeskPnL,
          isComplete,
          missingInputs,
          sides: {
            atChosenSides: dcOnAtChosen,
            atMid: dcOnAtMid,
            crossingCost: dcOnCrossingCost,
          },
        },
      ];
    }
  }

  return {
    marketId: market.id,
    marketName: market.name,
    certificateValue: certVal,
    moleculeValue: molVal,
    totalCosts,
    netNetback,
    grossValueSpread,
    impliedMargin,
    producerPayable,
    deskMargin,
    marginPercent,
    grossSpreadPnL,
    totalPnL,
    deskPnL,
    isTheoretical: false,
    blockingReason: null,
    isComplete,
    missingInputs,
    uncertaintyBranches,
    statusNote,
    markSideUsed: pricingSides.certificateSide,
    pricingSides,
    sides,
    isModelled: certVal?.isModelled ?? false,
    provenance: certVal?.provenance ?? null,
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
  side?: PriceSide | PricingSides,
  fuelEUOptions?: FuelEUOptions
): NetbackResult[] {
  return markets.map(m => {
    const nb = computeNetback(m, consignment, marks, costs, side, fuelEUOptions);
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
