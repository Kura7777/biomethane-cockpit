import { 
  CI_COMPARATOR_ROAD_TRANSPORT, 
  MJ_PER_MWH, 
  FR_CPB_CEILING_EUR_MWH,
  DE_THG_PENALTY_EUR_PER_TCO2E,
  UK_RTFC_BUYOUT_GBP,
  MWH_PER_CIC_ADVANCED,
  MWH_PER_CIC_CONVENTIONAL,
} from '../markets/constants';
import { Market, PriceSide, getMarkAgeDays } from '../markets/types';
import { Consignment } from '../consignment/types';
import { CostInputs, CertificateValueResult, NetbackResult, NetbackBranch, MarksState, FuelEUOptions, PricingSides, NetbackSides, ValuationRange, PrincipalRiskMetrics } from './types';
import { EligibilityAssessment } from '../eligibility/types';
import { HUB_BASIS_SPREADS } from '../logistics/corridors';

import {
  FUELEU_VLSFO_WTW,
  FUELEU_TARGET_2025,
  FUELEU_TARGET_2030,
  bioLngFuelEUIntensity,
  FUELEU_STATUTORY_PENALTY_PER_TONNE,
  FUELEU_PENALTY_VLSFO_MJ_PER_TONNE,
} from '../fueleu/calculator';
import { getAssumption } from '../assumptions/registry';

/**
 * FuelEU Maritime Reference Constants (Regulation (EU) 2023/1805)
 */
/** Default ship actual intensity: a VLSFO-burning vessel, Annex II well-to-wake (≈ 91.74 gCO₂e/MJ). */
export const FUELEU_BASELINE_CI = FUELEU_VLSFO_WTW;
export const FUELEU_TARGET_CI_2025 = FUELEU_TARGET_2025;      // 2% reduction statutory (89.3368 gCO₂e/MJ)
export const FUELEU_TARGET_CI_2030 = FUELEU_TARGET_2030;      // 6% reduction statutory (85.6904 gCO₂e/MJ)

/**
 * Biomethane Physical Constants for UK RTFO Energy-to-Mass Derivation
 * LHV Biomethane ≈ 50 MJ/kg = 13.889 kWh/kg = 0.013889 MWh/kg
 * 1 MWh = 1 / 0.013889 ≈ 72.0 kg biomethane
 * RTFO gaseous fuels issue 1 dRTFC/kg (standard) or 2 dRTFC/kg (waste/advanced)
 */
export const BIOMETHANE_KWH_PER_KG = 13.88889;
export const RTFO_KG_PER_MWH = 1000 / BIOMETHANE_KWH_PER_KG; // ≈ 72.00 kg/MWh
/**
 * RTFCs awarded per kg of biomethane: gases earn RTFCs in proportion to energy content per kg.
 * DfT, Renewable fuel statistics: notes and definitions — "biomethane receive 1.9 RTFCs/kg";
 * fuel from certain wastes or residues earns "double the RTFCs per litre/kg supplied".
 * https://www.gov.uk/government/publications/renewable-fuel-statistics-information/renewable-fuel-statistics-notes-and-definitions
 */
export const RTFC_PER_KG_BIOMETHANE = 1.9;
/**
 * EU ETS: sustainable biomethane is zero-rated, so each MWh displaces the natural-gas emission factor,
 * independent of the biomethane's own CI (eligibility is a pass/fail sustainability gate, not a scale).
 * MRR (EU) 2018/2066 Annex VI: natural gas 56.1 tCO2/TJ → 56.1 × 0.0036 TJ/MWh = 0.20196 tCO2/MWh.
 */
export const ETS_NATURAL_GAS_TCO2_PER_MWH = 56.1 * 0.0036;
const ETS_ZERO_RATING_MARKETS = new Set(['EU_ETS1', 'EU_ETS2', 'VOL_EU_ETS']);

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
 * Desk margin as a percentage of the absolute delivered netback.
 * The sign always follows deskMargin, so a loss-making deal can never show a positive margin.
 */
function computeMarginPercent(deskMargin: number | null, netNetback: number | null): number | null {
  if (deskMargin === null || netNetback === null || netNetback === 0) return null;
  return (deskMargin / Math.abs(netNetback)) * 100;
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
 * Marginal avoided penalty per Regulation (EU) 2023/1805 Annex IV for a ship in deficit that
 * burns the Bio-LNG in place of its own fuel (voyage energy E unchanged):
 *   Penalty P = €2,400 × |CB| / (GHGIE × 41,000) = k·E·(1 − target / GHGIE),  k = 2,400 / 41,000
 *   Displacing dE of ship fuel lowers GHGIE by (GHGIE_ship − WtW_bio)·dE / E, so
 *   dP/dE = k · (GHGIE_ship − WtW_bio) · target / GHGIE_ship²   (× escalation multiplier)
 * WtW_bio is the Annex I well-to-wake intensity (RED CI + engine CH4 slip / N2O).
 *
 * @param consignmentCI - RED lifecycle carbon intensity of the bio-LNG consignment (gCO2e/MJ)
 * @param consecutiveYears - Consecutive non-compliance escalation year (1 = 0%, 2 = +10%, 3 = +20%, 4 = +30%)
 * @param targetCI - FuelEU target intensity (89.34 for 2025-2029), shown for context
 * @param shipActualCI - Ship's actual intensity without biofuel (default VLSFO ≈ 91.74)
 */
export function computeFuelEUDeficitClosureValue(
  consignmentCI: number,
  consecutiveYears: number = 1,
  targetCI: number = FUELEU_TARGET_CI_2025,
  shipActualCI: number = FUELEU_BASELINE_CI
): { valueEurPerMWh: number; calculation: string; unitConversion: string } {
  const penaltyMultiplier = 1 + Math.max(0, (consecutiveYears - 1) / 10);
  const bioWtw = bioLngFuelEUIntensity(consignmentCI);
  const deltaCI = shipActualCI - bioWtw; // gCO₂e removed per MJ of ship fuel displaced
  
  if (shipActualCI <= 0) {
    return {
      valueEurPerMWh: 0,
      calculation: `Ship actual CI must be positive (> 0 gCO₂e/MJ). Provided: ${shipActualCI}.`,
      unitConversion: `Target CI: ${targetCI} g/MJ, Actual ship CI: ${shipActualCI} g/MJ`,
    };
  }

  if (deltaCI <= 0) {
    return {
      valueEurPerMWh: 0,
      calculation: `Bio-LNG FuelEU intensity (${bioWtw.toFixed(2)} g/MJ incl. slip) >= ship intensity (${shipActualCI.toFixed(2)} g/MJ). Generates no compliance credit.`,
      unitConversion: `Target CI: ${targetCI} g/MJ, Actual ship CI: ${shipActualCI} g/MJ`,
    };
  }

  // Exact marginal of the Annex IV penalty with respect to displaced ship-fuel energy
  const penaltyPerMJ = (FUELEU_STATUTORY_PENALTY_PER_TONNE / FUELEU_PENALTY_VLSFO_MJ_PER_TONNE)
    * deltaCI * Math.max(0, targetCI) / (shipActualCI * shipActualCI) * penaltyMultiplier;
  const valueEurPerMWh = penaltyPerMJ * MJ_PER_MWH;

  const unitConversion = `FuelEU Target: ${targetCI} g/MJ | Ship CI: ${shipActualCI.toFixed(2)} g/MJ | Bio-LNG WtW: ${bioWtw.toFixed(2)} g/MJ (RED CI ${consignmentCI} + slip) | ΔCI: ${deltaCI.toFixed(1)} g/MJ | Penalty: €${FUELEU_STATUTORY_PENALTY_PER_TONNE.toLocaleString('en-GB')}/t VLSFO-eq (Yr ${consecutiveYears}: ${((penaltyMultiplier - 1) * 100).toFixed(0)}% escalation)`;
  const calculation = `(€${FUELEU_STATUTORY_PENALTY_PER_TONNE.toLocaleString('en-GB')} ÷ ${FUELEU_PENALTY_VLSFO_MJ_PER_TONNE.toLocaleString('en-GB')}) × ${deltaCI.toFixed(1)} × ${targetCI} ÷ ${shipActualCI.toFixed(2)}² × ${penaltyMultiplier.toFixed(1)} × 3600 = €${valueEurPerMWh.toFixed(2)}/MWh compliance value`;

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
  const pricingSide = side ?? marks.pricingSides.certificateSide;
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
      // The FuelEU desk mark is quoted in €/tCO₂e of compliance balance (registry unitLabel),
      // so it must be converted through the consignment's surplus vs the FuelEU target intensity.
      const deficitModel = computeFuelEUDeficitClosureValue(ci, consecutiveYears, targetCI, shipActualCI);
      // Surplus vs target uses the Bio-LNG's FuelEU well-to-wake intensity (RED CI + engine slip).
      const bioWtw = bioLngFuelEUIntensity(ci);
      const surplusTco2ePerMWh = Math.max(0, ((targetCI - bioWtw) * MJ_PER_MWH) / 1_000_000);
      const markValueEurPerMWh = mark * surplusTco2ePerMWh;
      return {
        valueEurPerMWh: markValueEurPerMWh,
        calculation: `(${targetCI} − (${bioWtw.toFixed(2)} [RED ${ci} + slip])) × ${MJ_PER_MWH} / 1,000,000 = ${surplusTco2ePerMWh.toFixed(4)} tCO₂e/MWh × €${mark.toFixed(2)}/tCO₂e (${pricingSide}) = €${markValueEurPerMWh.toFixed(2)}/MWh (deficit-closure reference: €${deficitModel.valueEurPerMWh.toFixed(2)}/MWh)`,
        unitConversion: deficitModel.unitConversion,
        capped: false,
        capReason: null,
        statusNote: 'Desk mark (€/tCO₂e compliance balance) converted to €/MWh against the FuelEU target intensity.',
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
      if (ETS_ZERO_RATING_MARKETS.has(market.id)) {
        // EU ETS zero-rating: avoided allowances = natural-gas emission factor; the CI does not scale it.
        const co2 = ETS_NATURAL_GAS_TCO2_PER_MWH;
        valueEurPerMWh = mark * co2;
        unitConversion = `Zero-rated biomass: avoided natural gas 56.1 tCO₂/TJ × 0.0036 TJ/MWh = ${co2.toFixed(5)} tCO₂/MWh (MRR 2018/2066 Annex VI)`;
        calculation = `${co2.toFixed(5)} tCO₂/MWh × €${mark.toFixed(2)}/tCO₂ (${pricingSide}) = €${valueEurPerMWh.toFixed(2)}/MWh`;
        break;
      }
      // Germany THG
      const co2e = tCO2ePerMWh(ci);
      valueEurPerMWh = mark * co2e;
      unitConversion = `(${CI_COMPARATOR_ROAD_TRANSPORT} − (${ci})) × ${MJ_PER_MWH} / 1,000,000 = ${co2e.toFixed(4)} tCO₂e/MWh`;
      calculation = `${co2e.toFixed(4)} tCO₂e/MWh × €${mark.toFixed(2)}/tCO₂e (${pricingSide}) = €${valueEurPerMWh.toFixed(2)}/MWh`;
      break;
    }
    case 'EUR_PER_KG_CO2E': {
      // Netherlands ERE (Wet milieubeheer / REV): 1 ERE = 1 kg CO₂e avoided
      const isAdvanced = consignment.annexClassification === 'IX_A' ||
        (consignment.feedstock || '').toLowerCase().includes('manure') ||
        (consignment.feedstock || '').toLowerCase().includes('slurry') ||
        (consignment.feedstock || '').toLowerCase().includes('waste');
      const ticketCategory = isAdvanced ? 'ERE-A (Advanced Annex IX-A)' : 'ERE-C (Conventional)';
      const co2eTonnes = tCO2ePerMWh(ci);
      const co2eKg = co2eTonnes * 1000;
      valueEurPerMWh = mark * co2eKg;
      unitConversion = `${ticketCategory}: ${co2eTonnes.toFixed(4)} tCO₂e/MWh × 1000 = ${co2eKg.toFixed(1)} kg CO₂e/MWh (${ticketCategory})`;
      calculation = `${co2eKg.toFixed(1)} ERE/MWh (${ticketCategory}) × €${mark.toFixed(4)}/ERE (${pricingSide}) = €${valueEurPerMWh.toFixed(2)}/MWh`;
      statusNote = isAdvanced
        ? 'Classified as ERE-A (Advanced) under Dutch REV. Eligible for Dutch transport advanced mandate.'
        : 'Classified as ERE-C (Conventional). Standard transport compliance.';
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
    case 'GBP_PER_RTFC': {
      const fxRate = marks.fx.gbpEur;
      if (fxRate === null) {
        return {
          valueEurPerMWh: null,
          unitConversion: '£/RTFC → €/MWh requires GBP/EUR FX rate',
          capped: false,
          capReason: null,
          calculation: 'No FX rate available',
          statusNote: 'UNVERIFIED — Missing FX rate.',
          markAgeDays,
          isModelled: false,
        };
      }

      // UK RTFO standard RTFC eligibility per RTFO Order 2007 (SI 2007/3072):
      // - Waste-derived biomethane (manure, food waste, sewage sludge, industrial bio-waste, Annex IX)
      //   qualifies for 2× double counting (144.0 RTFC/MWh).
      // - Crop-derived biomethane earns 1× standard RTFCs (72.0 RTFC/MWh).
      const feedstockKey = consignment.feedstock?.toLowerCase() ?? '';
      const isDoubleCounting = (
        feedstockKey === 'manure' ||
        feedstockKey === 'food_waste' ||
        feedstockKey === 'sewage_sludge' ||
        feedstockKey === 'used_cooking_oil' ||
        feedstockKey === 'landfill_gas' ||
        feedstockKey === 'industrial_bio_waste' ||
        consignment.annexClassification === 'IX_A' ||
        consignment.annexClassification === 'IX_B'
      );
      const rtfcPerMWh = RTFO_KG_PER_MWH * RTFC_PER_KG_BIOMETHANE * (isDoubleCounting ? 2 : 1); // ≈ 273.6 vs 136.8
      // The RTFO buy-out price is a hard ceiling on RTFC value, exactly like the CPB penalty.
      const effectiveMarkGbp = Math.min(mark, UK_RTFC_BUYOUT_GBP);
      if (mark > UK_RTFC_BUYOUT_GBP) {
        capped = true;
        capReason = `UK RTFO buy-out price: £${UK_RTFC_BUYOUT_GBP.toFixed(2)}/RTFC (RTFO Order 2007, Art. 17).`;
      }
      const markEurPerRtfc = effectiveMarkGbp * fxRate;
      valueEurPerMWh = markEurPerRtfc * rtfcPerMWh;

      unitConversion = `UK RTFO Order 2007: 1 MWh ÷ 13.889 kWh/kg = ${RTFO_KG_PER_MWH.toFixed(1)} kg/MWh × ${RTFC_PER_KG_BIOMETHANE} RTFC/kg → ${rtfcPerMWh.toFixed(1)} RTFC/MWh (${isDoubleCounting ? '2× Double Counting (Waste/Residue)' : '1× Standard'}) | £1 = €${fxRate.toFixed(4)}`;
      calculation = `£${effectiveMarkGbp.toFixed(3)}/RTFC${capped ? ` (mark £${mark.toFixed(3)} capped at buy-out)` : ''} × €${fxRate.toFixed(4)}/£ × ${rtfcPerMWh.toFixed(1)} RTFC/MWh = €${valueEurPerMWh.toFixed(2)}/MWh`;
      statusNote = `Derived from biomethane energy content (${rtfcPerMWh.toFixed(1)} RTFC/MWh). ${isDoubleCounting ? '2× double-counted standard RTFC (waste/residue).' : '1× standard RTFC.'} Non-EU grid injection boundary applies.`;
      break;
    }
    case 'GBP_PER_DRTFC': {
      const fxRate = marks.fx.gbpEur;
      if (fxRate === null) {
        return {
          valueEurPerMWh: null,
          unitConversion: '£/dRTFC → €/MWh requires GBP/EUR FX rate',
          capped: false,
          capReason: null,
          calculation: 'No FX rate available',
          statusNote: 'UNVERIFIED — Missing FX rate.',
          markAgeDays,
          isModelled: false,
        };
      }

      // UK RTFO Development Fuel (dRTFC) — strictly for novel technologies (RFNBO, syngas, aviation).
      // Standard AD biomethane defaults out of dRTFC eligibility.
      const feedstockKey = consignment.feedstock?.toLowerCase() ?? '';
      const isDevelopmentFuel = feedstockKey === 'development_fuel' || feedstockKey === 'rfnbo' || feedstockKey === 'syngas_biomethane';
      const drtfcPerMWh = isDevelopmentFuel ? RTFO_KG_PER_MWH * 2 : 0;
      const markEurPerDrtfc = mark * fxRate;
      valueEurPerMWh = markEurPerDrtfc * drtfcPerMWh;

      unitConversion = `UK RTFO Development Fuel: ${drtfcPerMWh.toFixed(1)} dRTFC/MWh | £1 = €${fxRate.toFixed(4)}`;
      calculation = `£${mark.toFixed(3)}/dRTFC × €${fxRate.toFixed(4)}/£ × ${drtfcPerMWh.toFixed(1)} dRTFC/MWh = €${valueEurPerMWh.toFixed(2)}/MWh`;
      statusNote = isDevelopmentFuel 
        ? `Development Fuel eligible pathway (${drtfcPerMWh.toFixed(1)} dRTFC/MWh).` 
        : 'Standard AD biomethane does not qualify for UK dRTFC (requires novel / RFNBO pathway).';
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
  let pricingSides: PricingSides;
  if (!side) {
    // No override: use the desk's stored per-leg sides verbatim.
    pricingSides = marks.pricingSides;
  } else if (typeof side === 'string') {
    pricingSides = { certificateSide: side, moleculeSide: side };
  } else {
    pricingSides = { certificateSide: side.certificateSide, moleculeSide: side.moleculeSide };
  }

  const certVal = computeCertificateValue(market, consignment, marks, pricingSides.certificateSide, fuelEUOptions);
  if (certVal?.valueEurPerMWh != null) {
    certVal.valueEurPerMWh = Number(certVal.valueEurPerMWh.toFixed(2));
  }

  // Dynamic Alpha (α) sensitivity indexation for Leg B green attribute
  const alpha = costs.greenAlpha ?? 1.0;
  if (alpha !== 1.0 && certVal?.valueEurPerMWh != null) {
    certVal.valueEurPerMWh = Number((certVal.valueEurPerMWh * alpha).toFixed(2));
    certVal.calculation = `${certVal.calculation} × α(${alpha.toFixed(2)}) = €${certVal.valueEurPerMWh.toFixed(2)}/MWh`;
    // The CPB penalty ceiling is statutory — no sensitivity multiplier may lift the value above it.
    if (market.id === 'FR_CPB' && certVal.valueEurPerMWh > FR_CPB_CEILING_EUR_MWH) {
      certVal.valueEurPerMWh = FR_CPB_CEILING_EUR_MWH;
      certVal.capped = true;
      certVal.capReason = `French CPB penalty ceiling: €${FR_CPB_CEILING_EUR_MWH}/MWh (applied after α indexation).`;
      certVal.calculation = `${certVal.calculation} → CAPPED at €${FR_CPB_CEILING_EUR_MWH}/MWh legal ceiling`;
    }
  }

  const missingInputs: string[] = [];

  // Molecule value (TTF index) at chosen molecule side
  const molVal = selectMarkPrice(marks.gasIndex, pricingSides.moleculeSide);
  if (molVal === null) missingInputs.push('gasIndex (TTF)');

  // Track cost completeness
  if (costs.transferCosts === null) missingInputs.push('transferCosts');
  if (costs.certificationCosts === null) missingInputs.push('certificationCosts');
  if (costs.logistics === null) missingInputs.push('logistics');

  const costValues = [costs?.transferCosts, costs?.certificationCosts, costs?.logistics, costs?.otherCosts]
    .filter((c): c is number => typeof c === 'number' && !isNaN(c));
  const totalCosts = costValues.length > 0 ? costValues.reduce((a, b) => a + b, 0) : null;

  // Net Netback calculation (at chosen sides):
  // If cert value is null or NaN, netback is null.
  // If cert value is present, compute available arithmetic while flagging incomplete inputs.
  let netNetback: number | null = null;
  if (certVal?.valueEurPerMWh != null && !isNaN(certVal.valueEurPerMWh)) {
    const safeMol = (molVal !== null && !isNaN(molVal)) ? molVal : 0;
    const safeCosts = (totalCosts !== null && !isNaN(totalCosts)) ? totalCosts : 0;
    netNetback = Number((certVal.valueEurPerMWh + safeMol - safeCosts).toFixed(2));
  }

  // Crossing cost calculation (atMid vs atChosenSides)
  // Must be rounded on the same basis as the chosen-side cert value above, otherwise the
  // ±0.005 residue survives into crossingCost (±0.01 once DE_THG doubles it) and shows a
  // phantom spread benefit when the chosen side already equals mid.
  const midCertVal = computeCertificateValue(market, consignment, marks, 'mid', fuelEUOptions);
  if (midCertVal?.valueEurPerMWh != null) {
    const rawMid = Number(midCertVal.valueEurPerMWh.toFixed(2));
    const alphaMid = alpha !== 1.0 ? Number((rawMid * alpha).toFixed(2)) : rawMid;
    midCertVal.valueEurPerMWh = market.id === 'FR_CPB' ? Math.min(alphaMid, FR_CPB_CEILING_EUR_MWH) : alphaMid;
  }
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


  // Margin % = deskMargin / |netNetback| * 100
  let marginPercent = computeMarginPercent(deskMargin, netNetback);

  // Desk P&L and Gross Spread P&L
  let grossSpreadPnL: number | null = null;
  let deskPnL: number | null = null;
  if (grossValueSpread !== null && consignment.volumeMWh !== null) {
    grossSpreadPnL = grossValueSpread * consignment.volumeMWh;
  }
  if (deskMargin !== null && consignment.volumeMWh !== null) {
    deskPnL = deskMargin * consignment.volumeMWh;
  }

  // Track delivery period & compliance year completeness
  if (!consignment.deliveryPeriod?.complianceYear) {
    missingInputs.push('deliveryPeriod');
  }

  const isComplete = missingInputs.length === 0 && certVal?.valueEurPerMWh != null;

  // Germany THG branches:
  // - If complianceYear <= 2025: double counting applies cleanly (historical 2x multiplier)
  // - If complianceYear >= 2026 or null: settled single counting (1x multiplier) under the
  //   Zweites Gesetz zur Weiterentwicklung der THG-Quote (Bundestag Drucksache 21/5530).
  const complianceYear = consignment.deliveryPeriod?.complianceYear ?? null;

  if (market.id === 'DE_THG' && certVal?.valueEurPerMWh != null) {
    if (complianceYear !== null && complianceYear <= 2025) {
      // Single branch for <= 2025: double counting (2x) applies for all advanced biofuels
      // (Annex IX-A AND IX-B) under 38. BImSchV — not limited to IX-A alone
      if (consignment.annexClassification === 'IX_A' || consignment.annexClassification === 'IX_B') {
        const dcOnCertVal = certVal.valueEurPerMWh * 2;
        certVal.valueEurPerMWh = dcOnCertVal;
        certVal.calculation = `${certVal.calculation} × 2 (double counting under 38. BImSchV for CY ${complianceYear}) = €${dcOnCertVal.toFixed(2)}/MWh`;
        certVal.statusNote = `Double counting applies for compliance year ${complianceYear} (pre-2026 regime under §37a BImSchG).`;

        netNetback = Number((dcOnCertVal + (molVal ?? 0) - (totalCosts ?? 0)).toFixed(2));

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

        marginPercent = computeMarginPercent(deskMargin, netNetback);

        // P&L and pricing sides were computed on the single-counted value above — restate them
        // on the doubled value, otherwise the blotter books half the real desk P&L.
        grossSpreadPnL = grossValueSpread !== null && consignment.volumeMWh !== null ? grossValueSpread * consignment.volumeMWh : null;
        deskPnL = deskMargin !== null && consignment.volumeMWh !== null ? deskMargin * consignment.volumeMWh : null;
        const dcAtMid = midCertVal?.valueEurPerMWh != null
          ? Number((midCertVal.valueEurPerMWh * 2 + (midMolVal ?? 0) - (totalCosts ?? 0)).toFixed(2))
          : null;
        sides.atChosenSides = netNetback;
        sides.atMid = dcAtMid;
        sides.crossingCost = dcAtMid !== null ? Number((dcAtMid - netNetback).toFixed(2)) : null;
      }
    } else {
      // Compliance year >= 2026 or unset: single counting (1×) is settled law under
      // the Zweites Gesetz zur Weiterentwicklung der THG-Quote (Bundestag Drucksache 21/5530).
      // No DC_ON branch, no valuation range.
      if (complianceYear === null) {
        certVal.statusNote = 'Compliance year not set — assumed 2026+ (single counting).';
      }
    }
  }

  // ── Realisable cap (desk policy, 28 Sept 2026) ──────────────────────────────────────────
  // The modelled netback values the certificate at the full quota mark, but obligated blenders keep
  // 30–45% of that spread, so the desk can only sell at the traded bundle price. Where a bundle
  // reference exists (an observed price on the deal, else the DE THG desk references in the
  // assumptions register), the headline netback, producer payable, margin and P&L are all taken at
  // min(modelled, bundle). The uncapped figure is kept as `theoreticalNetback`.
  const bundleIsObserved = consignment.observedBundlePriceEurPerMwh != null;
  const bundleBenchmark = consignment.observedBundlePriceEurPerMwh ?? (
    market.id === 'DE_THG' && consignment.carbonIntensity <= -80 ? getAssumption('risk.deThgBundleRefNeg80EurPerMwh') :
    market.id === 'DE_THG' && consignment.carbonIntensity <= 0 ? getAssumption('risk.deThgBundleRefNeg0EurPerMwh') :
    null
  );
  const priceAt = (netback: number) => {
    let payable: number | null = null;
    let margin: number | null = null;
    let spread: number | null = null;
    if (pricingMode === 'INDEX_LINKED') {
      const share = costs.producerPricing?.indexLinkedShare ?? null;
      if (share !== null) {
        payable = Number((netback * share).toFixed(2));
        margin = Number((netback - payable).toFixed(2));
      }
    } else if (pricingMode === 'FIXED_PRICE') {
      const fixedPrice = costs.producerPricing?.fixedPriceEurPerMwh ?? null;
      if (fixedPrice !== null) {
        payable = fixedPrice;
        margin = Number((netback - fixedPrice).toFixed(2));
        spread = margin;
      }
    }
    const vol = consignment.volumeMWh;
    return {
      producerPayable: payable,
      deskMargin: margin,
      grossValueSpread: spread,
      marginPercent: computeMarginPercent(margin, netback),
      deskPnL: margin !== null && vol !== null ? margin * vol : null,
      grossSpreadPnL: spread !== null && vol !== null ? spread * vol : null,
    };
  };
  const theoreticalNetback = netNetback;
  let netbackCappedAt: number | null = null;
  if (bundleBenchmark !== null && netNetback !== null && netNetback > bundleBenchmark) {
    netbackCappedAt = bundleBenchmark;
    netNetback = Number(bundleBenchmark.toFixed(2));
    const p = priceAt(netNetback);
    producerPayable = p.producerPayable;
    deskMargin = p.deskMargin;
    grossValueSpread = p.grossValueSpread;
    marginPercent = p.marginPercent;
    deskPnL = p.deskPnL;
    grossSpreadPnL = p.grossSpreadPnL;
    // Once capped, the bid/offer side choice no longer moves the price: cap both legs.
    sides.atChosenSides = netNetback;
    if (sides.atMid !== null) sides.atMid = Math.min(sides.atMid, netNetback);
    sides.crossingCost = sides.atMid !== null ? Number((sides.atMid - netNetback).toFixed(2)) : null;
  }
  const uncertaintyBranches: NetbackBranch[] | null = null;
  const valuationRange: ValuationRange | null = null;

  // Principal Risk Suite: Basis Risk and Statutory Replacement Exposure
  const originHub = HUB_BASIS_SPREADS[consignment.originCountry] || { basisSpreadToTtfEurMwh: 0.0 };
  const targetHub = HUB_BASIS_SPREADS[market.country] || { basisSpreadToTtfEurMwh: 0.0 };
  const basisDifferentialEurMwh = Number((targetHub.basisSpreadToTtfEurMwh - originHub.basisSpreadToTtfEurMwh).toFixed(2));
  const dealVolume = consignment.volumeMWh ?? getAssumption('risk.illustrativeVolumeMwh');
  const basisRiskNotionalEur = Math.round(Math.abs(basisDifferentialEurMwh) * dealVolume);

  let statutoryCeilingEurMwh: number | null = null;
  if (market.id === 'FR_CPB') {
    statutoryCeilingEurMwh = FR_CPB_CEILING_EUR_MWH;
  } else if (market.id === 'DE_THG') {
    statutoryCeilingEurMwh = Number((DE_THG_PENALTY_EUR_PER_TCO2E * tCO2ePerMWh(consignment.carbonIntensity)).toFixed(2));
  }

  const ceilingFloor = getAssumption('risk.replacementCeilingFloorEurPerMwh');
  const effectiveCeiling = statutoryCeilingEurMwh ?? (netNetback !== null ? Math.max(ceilingFloor, netNetback * getAssumption('risk.replacementCeilingNetbackMultiple')) : ceilingFloor);
  const effectiveProcurement = producerPayable ?? (molVal ? molVal + getAssumption('risk.fallbackProcurementPremiumEurPerMwh') : getAssumption('risk.fallbackProcurementEurPerMwh'));
  const replacementCostExposureEur = Math.round(Math.max(0, effectiveCeiling - effectiveProcurement) * dealVolume);

  const principalRisk: PrincipalRiskMetrics = {
    basisDifferentialEurMwh,
    basisRiskNotionalEur,
    replacementCostExposureEur,
    statutoryCeilingEurMwh,
  };

  let clearingPriceWarning: string | null = null;
  if (netbackCappedAt !== null && theoreticalNetback !== null) {
    const ref = bundleIsObserved ? 'observed traded bundle price' : 'traded bundle reference (desk estimate, Assumptions)';
    clearingPriceWarning = `Netback capped at the ${ref} of €${netbackCappedAt.toFixed(2)}/MWh. Modelled netback (€${theoreticalNetback.toFixed(2)}/MWh) exceeds observed traded bundle price levels: it assumes the full quota value, but obligated blenders retain 30–45% of the statutory spread. Producer payable, margin and P&L use the capped figure.`;
  }

  return {
    marketId: market.id,
    marketName: market.name,
    certificateValue: certVal,
    moleculeValue: molVal,
    totalCosts,
    netNetback,
    grossValueSpread,
    producerPayable,
    deskMargin,
    marginPercent,
    grossSpreadPnL,
    deskPnL,
    isTheoretical: false,
    blockingReason: null,
    isComplete,
    missingInputs,
    uncertaintyBranches,
    valuationRange,
    statusNote,
    markSideUsed: pricingSides.certificateSide,
    pricingSides,
    sides,
    isModelled: certVal?.isModelled ?? false,
    provenance: certVal?.provenance ?? null,
    principalRisk,
    clearingPriceWarning,
    theoreticalNetback,
    netbackCappedAt,
    bundleReferenceEurPerMwh: bundleBenchmark,
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
      if (eligibility && (eligibility.overallVerdict === 'HARD_BLOCK' || eligibility.overallVerdict === 'UNKNOWN')) {
        nb.isTheoretical = true;
        nb.blockingReason = eligibility.summary;
      }
    }
    return nb;
  });
}
