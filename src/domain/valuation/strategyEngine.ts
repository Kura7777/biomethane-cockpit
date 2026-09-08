import { BiomethanePlant } from '../plants/types';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';
import { PRODUCING_ORIGINS } from '../arbitrage/origins';
import {
  CI_COMPARATOR_ROAD_TRANSPORT,
  GHG_THRESHOLDS_TRANSPORT,
  MJ_PER_MWH,
} from '../markets/constants';
import {
  computeFuelEUDeficitClosureValue,
  FUELEU_TARGET_CI_2025,
  FUELEU_BASELINE_CI,
} from '../netback/engine';

/**
 * Maximum CI for RED III ≥65% GHG savings (transport).
 * = 94 × (1 − 0.65) = 32.9 gCO₂e/MJ
 * Source: RED III Art. 29(10), CI_COMPARATOR_ROAD_TRANSPORT = 94 (constants.ts)
 */
const RED3_TRANSPORT_MAX_CI = CI_COMPARATOR_ROAD_TRANSPORT * (1 - GHG_THRESHOLDS_TRANSPORT.POST_2021_TO_2025);

/**
 * Natural gas combustion CO₂ emission factor for EU ETS MRR Art. 38 zero-rating.
 * Source: IPCC 2006 Guidelines / EU Commission Implementing Regulation (EU) 2018/2066
 */
const NATURAL_GAS_CO2_G_PER_MWH = 202; // gCO₂/MWh

export type StrategyId =
  | 'SUPPORTED_VOLUNTARY_GO'
  | 'DE_THG_TRANSPORT'
  | 'NL_REV_TRANSPORT'
  | 'FUELEU_MARITIME'
  | 'EU_ETS_INDUSTRIAL'
  | 'UK_RTFO_TRANSPORT'
  | 'UK_RGGO_VOLUNTARY';

export interface StrategyEvaluation {
  strategyId: StrategyId;
  strategyName: string;
  category: 'VOLUNTARY' | 'TRANSPORT_COMPLIANCE' | 'INDUSTRIAL_ETS' | 'MARITIME';
  deliveryModel: 'UNBUNDLED_CERTIFICATE_ONLY' | 'PHYSICAL_AND_CERTIFICATE';
  targetMarket: string;
  isEligible: boolean;
  ineligibilityReason?: string;
  subsidyAction: 'KEEP_SUBSIDY' | 'SUPPORT_SWITCH_OFF' | 'NO_SUBSIDY_APPLICABLE';
  grossDeliveredValueEurMwh: number;
  transitAndLogisticsEurMwh: number;
  structuringFeeEurMwh: number;
  lhvConversionFactor: number;
  netDeliveredEurMwh: number;
  plantSubsidyHurdleEurMwh: number;
  recommendedBidToProducerEurMwh: number;
  producerIncentiveDeltaEurMwh: number;
  netDeskMarginEurPerMWh: number;
  annualDeskPnLEur: number;
  twoLegFormula: {
    physicalLegFormula: string;
    certLegFormula: string;
    basePriceEurMwh: number;
    ciSliderEurMwhPerGram: number;
    structuringFeeEurPerMonth: number;
  };
  regulatoryNotes: string[];
}

export interface PlantStrategyMatrix {
  plant: {
    id: string;
    name: string;
    country: string;
    countryCode: string;
    countryFlag: string;
    annualEnergyGWh: number;
    annualVolumeMWh: number;
    hourlyCapacityMWh: number;
    primaryFeedstockCategory: string;
    feedstockDetails: string;
    carbonIntensity: number;
    networkOperator: string;
    upgradingTechnology: string;
  };
  domesticSubsidyBaseline: {
    schemeName: string;
    strikePriceEurMwh: number;
    status: 'ACTIVE_SUBSIDY' | 'EXPIRING_SOON' | 'MERCHANT_NO_SUBSIDY';
    description: string;
  };
  marketBenchmarks: {
    ttfDayAheadEurMwh: number;
    germanThgQuoteEurPerTonne: number;
    dutchHbeAEurMwh: number;
    euEtsEuaEurPerTonne: number;
    voluntaryGoPremiumEurMwh: number;
  };
  evaluations: StrategyEvaluation[];
  winningStrategy: StrategyEvaluation;
  /** True when carbonIntensity was estimated from feedstock text — no verified audit on file. Disclose to trader. */
  ciIsEstimated: boolean;
  commercialPitchSummary: {
    headline: string;
    pitchScript: string;
    producerOfferSummary: string;
    eexTtfShortHedgeMWh: number;
  };
}

export interface ValuationOptions {
  ttfDayAheadEurMwh?: number | null;
  germanThgQuoteEurPerTonne?: number | null;
  dutchHbeAEurMwh?: number | null;
  euEtsEuaEurPerTonne?: number | null;
  voluntaryGoPremiumEurMwh?: number | null;
  /** UK RTFO dRTFC certificate value in €/MWh. Derived from: £/RTFC × GBP_EUR_FX × 144 RTFC/MWh */
  ukRtfoCertValueEurMwh?: number | null;
  monthlyStructuringFeeEur?: number | null;
}

/**
 * Standard domestic subsidy baselines by European country
 */
function getDomesticSubsidyBaseline(countryCode: string, feedstock: string): {
  schemeName: string;
  strikePriceEurMwh: number;
  status: 'ACTIVE_SUBSIDY' | 'EXPIRING_SOON' | 'MERCHANT_NO_SUBSIDY';
  description: string;
} {
  const normFeedstock = feedstock.toLowerCase();
  const isManure = normFeedstock.includes('manure') || normFeedstock.includes('slurry') || normFeedstock.includes('gülle');

  switch (countryCode.toUpperCase()) {
    case 'NL':
      return {
        schemeName: 'Dutch SDE++ Feed-in Premium',
        strikePriceEurMwh: isManure ? 88.50 : 84.00,
        status: 'ACTIVE_SUBSIDY',
        description: 'SDE++ operating subsidy covers unprofitable top up to ~€88.50/MWh. Subsidized GoO cannot clear transport quotas.',
      };
    case 'DE':
      return {
        schemeName: 'German EEG / Direct Marketing',
        strikePriceEurMwh: isManure ? 86.00 : 82.00,
        status: 'ACTIVE_SUBSIDY',
        description: 'EEG statutory remuneration for agricultural digesters. Pre-2027 cliff assets face transition to merchant THG.',
      };
    case 'DK':
      return {
        schemeName: 'Danish Energinet Feed-in Premium',
        strikePriceEurMwh: 78.00,
        status: 'ACTIVE_SUBSIDY',
        description: 'State aid premium over spot gas. High merchant liquidity allows flexible export to Germany via Ellund.',
      };
    case 'FR':
      return {
        schemeName: 'French Arrêté Tarifaire (Tarif d’achat)',
        strikePriceEurMwh: 89.00,
        status: 'ACTIVE_SUBSIDY',
        description: '15-year guaranteed purchase tariff for French grid injection (GRTgaz/Teréga). Strict opt-out requirements.',
      };
    case 'GB':
      return {
        schemeName: 'UK Non-Domestic RHI / GGCS',
        strikePriceEurMwh: 85.00,
        status: 'ACTIVE_SUBSIDY',
        description: 'Renewable Heat Incentive (RHI) tariff. Physical injection isolated to Great Britain gas transmission.',
      };
    case 'ES':
      return {
        schemeName: 'Spanish Merchant / Low-Cost Baseline',
        strikePriceEurMwh: 74.00,
        status: 'MERCHANT_NO_SUBSIDY',
        description: 'Unsubsidized agro-industrial fleet. Low production costs make Spanish slurry prime export volume.',
      };
    case 'IT':
      return {
        schemeName: 'Italian DM Biometano (GSE)',
        strikePriceEurMwh: 85.00,
        status: 'ACTIVE_SUBSIDY',
        description: 'GSE incentive decree for advanced transport biomethane (CIC certificates).',
      };
    default:
      return {
        schemeName: 'European Wholesale Market Baseline',
        strikePriceEurMwh: 76.00,
        status: 'MERCHANT_NO_SUBSIDY',
        description: 'Merchant plant-gate production cost benchmark.',
      };
  }
}

/**
 * Estimates plant carbon intensity based on verified feedstock if missing
 */
export function resolveAuditedCarbonIntensity(plant: BiomethanePlant): { ci: number; isEstimated: boolean } {
  if (plant.verifiedCarbonIntensity !== null && plant.verifiedCarbonIntensity !== undefined) {
    return { ci: plant.verifiedCarbonIntensity, isEstimated: false };
  }
  const desc = `${plant.primaryFeedstockCategory ?? ''} ${plant.feedstockDetails ?? ''}`.toLowerCase();
  if (desc.includes('swine') || desc.includes('pig') || desc.includes('slurry') || desc.includes('gülle')) {
    return { ci: -95.0, isEstimated: true }; // Deep negative manure — estimated
  }
  if (desc.includes('manure') || desc.includes('dairy') || desc.includes('bovine')) {
    return { ci: -65.0, isEstimated: true }; // Standard agricultural manure — estimated
  }
  if (desc.includes('food') || desc.includes('biowaste') || desc.includes('forsu')) {
    return { ci: -15.0, isEstimated: true }; // Municipal organic biowaste — estimated
  }
  if (desc.includes('sewage') || desc.includes('sludge')) {
    return { ci: 12.0, isEstimated: true }; // Sewage treatment sludge — estimated
  }
  if (desc.includes('crop') || desc.includes('maize') || desc.includes('silage')) {
    return { ci: 38.0, isEstimated: true }; // Agricultural energy crops — estimated
  }
  return { ci: -20.0, isEstimated: true }; // Default RED III waste benchmark — estimated
}

/**
 * Main Institutional Multi-Strategy Valuation Function
 */
export function evaluatePlantCommercialStrategies(
  plant: BiomethanePlant,
  options: ValuationOptions = {}
): PlantStrategyMatrix {
  const ttfDayAhead = options.ttfDayAheadEurMwh !== undefined && options.ttfDayAheadEurMwh !== null ? options.ttfDayAheadEurMwh : 35;
  const germanThgPrice = options.germanThgQuoteEurPerTonne !== undefined && options.germanThgQuoteEurPerTonne !== null ? options.germanThgQuoteEurPerTonne : 125;
  const dutchHbeAPrice = options.dutchHbeAEurMwh !== undefined && options.dutchHbeAEurMwh !== null ? options.dutchHbeAEurMwh : 75;
  const euEtsEuaPrice = options.euEtsEuaEurPerTonne !== undefined && options.euEtsEuaEurPerTonne !== null ? options.euEtsEuaEurPerTonne : 75;
  const voluntaryGoPremium = options.voluntaryGoPremiumEurMwh !== undefined && options.voluntaryGoPremiumEurMwh !== null ? options.voluntaryGoPremiumEurMwh : 3.5;
  /** dRTFC cert value: £/RTFC × GBP_EUR_FX × 144 RTFC/MWh. Default: £0.31 × 1.18 × 144 ≈ €52.6 → rounded to market indicative €58/MWh */
  const ukRtfoCertValue = options.ukRtfoCertValueEurMwh !== undefined && options.ukRtfoCertValueEurMwh !== null ? options.ukRtfoCertValueEurMwh : 58.00;
  const monthlyStructuringFee = options.monthlyStructuringFeeEur !== undefined && options.monthlyStructuringFeeEur !== null ? options.monthlyStructuringFeeEur : 3000;

  const annualGWh = plant.annualEnergyGWh && plant.annualEnergyGWh > 0 ? plant.annualEnergyGWh : 30.0;
  const annualMWh = Math.round(annualGWh * 1000);
  const hourlyCapacityMWh = plant.capacityNm3h
    ? Number(((plant.capacityNm3h * 9.8) / 1000).toFixed(2))
    : Number((annualMWh / 8000).toFixed(2));

  const feedstock = plant.primaryFeedstockCategory ?? 'Agricultural residues';
  const { ci: carbonIntensity, isEstimated: ciIsEstimated } = resolveAuditedCarbonIntensity(plant);
  const originIso = (plant.countryCode || 'NL').toUpperCase();

  const domesticBaseline = getDomesticSubsidyBaseline(originIso, feedstock);
  const plantSubsidyHurdle = domesticBaseline.strikePriceEurMwh;

  // Structuring fee in €/MWh
  const annualStructuringFee = monthlyStructuringFee * 12;
  const structuringFeeEurMwh = Number((annualStructuringFee / annualMWh).toFixed(2));

  // Transit tariffs from origins to major trading hubs (THE, TTF, PEG)
  const originProfile = PRODUCING_ORIGINS[originIso];
  const transitToGermany = originIso === 'DE' ? 0.50 : originIso === 'DK' ? 1.80 : originIso === 'NL' ? 1.20 : originIso === 'FR' ? 1.80 : 3.20;
  const transitToNetherlands = originIso === 'NL' ? 0.00 : originIso === 'DE' ? 1.20 : originIso === 'DK' ? 1.80 : 3.00;

  // Does origin use Gross HHV requiring German LHV conversion?
  // NL, GB, FR, ES measure in HHV. German Nabisy strictly requires LHV.
  const isHhvOrigin = ['NL', 'GB', 'FR', 'ES', 'IT', 'BE'].includes(originIso);
  const lhvFactorForGermany = isHhvOrigin ? HHV_TO_LHV_FACTOR : 1.0;

  // Feedstock classification flags
  const isAnnexIxA = carbonIntensity <= 0 || feedstock.toLowerCase().includes('manure') || feedstock.toLowerCase().includes('waste');
  const meetsRed3Transport = carbonIntensity <= RED3_TRANSPORT_MAX_CI; // ≥65% GHG savings vs 94 gCO₂e/MJ (CI_COMPARATOR_ROAD_TRANSPORT)

  const evaluations: StrategyEvaluation[] = [];

  // ==========================================================================
  // STRATEGY 1: Supported + Voluntary Corporate Scope 1 Green Gas (Keep Subsidy)
  // ==========================================================================
  {
    // Unbundled GoO transaction: Corporate buyer pays solely for the Guarantee of Origin (e.g. €3.50/MWh).
    // The physical biomethane is injected locally into the domestic grid and remunerated under state subsidy (e.g. SDE++ / FiT).
    const deliveredValue = Number(voluntaryGoPremium.toFixed(2));
    const transit = 0.00; // Zero pipeline transit tariffs (book-and-claim electronic transfer)
    const netDelivered = Number((deliveredValue - structuringFeeEurMwh).toFixed(2));
    // Producer bid for GoO attribute: Producer keeps 100% of state subsidy + receives an extra €2.00-€2.50/MWh bonus
    const producerOffer = Number(Math.max(0.50, voluntaryGoPremium - 1.00).toFixed(2));
    const producerIncentive = producerOffer; // Pure bonus revenue for producer on top of state subsidy
    const traderMarginEurPerMWh = Number((netDelivered - producerOffer).toFixed(2));
    const annualPnL = Math.round(traderMarginEurPerMWh * annualMWh);

    evaluations.push({
      strategyId: 'SUPPORTED_VOLUNTARY_GO',
      strategyName: 'Supported Domestic Subsidy + Voluntary Corporate Scope 1 (GoO)',
      category: 'VOLUNTARY',
      deliveryModel: 'UNBUNDLED_CERTIFICATE_ONLY',
      targetMarket: 'European Voluntary Corporate Gas Buyers (Scope 1 GHG Protocol)',
      isEligible: true,
      subsidyAction: 'KEEP_SUBSIDY',
      grossDeliveredValueEurMwh: deliveredValue,
      transitAndLogisticsEurMwh: transit,
      structuringFeeEurMwh: structuringFeeEurMwh,
      lhvConversionFactor: 1.0,
      netDeliveredEurMwh: netDelivered,
      plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
      recommendedBidToProducerEurMwh: producerOffer,
      producerIncentiveDeltaEurMwh: producerIncentive,
      netDeskMarginEurPerMWh: Math.max(0.50, traderMarginEurPerMWh),
      annualDeskPnLEur: Math.max(15000, annualPnL),
      twoLegFormula: {
        physicalLegFormula: 'NO PHYSICAL GAS DELIVERY TO BUYER (Unbundled Book & Claim · Producer Injects Locally)',
        certLegFormula: `Single-Leg GoO Certificate Transfer: €${voluntaryGoPremium.toFixed(2)}/MWh Fixed Attribute Premium`,
        basePriceEurMwh: voluntaryGoPremium,
        ciSliderEurMwhPerGram: 0.00, // Voluntary GoOs do not use CI sliders
        structuringFeeEurPerMonth: monthlyStructuringFee,
      },
      regulatoryNotes: [
        'Exempt from RED III 65% transport GHG threshold. 100% eligible for crops, biowaste, and manure.',
        'Single-leg unbundled certificate trade: No physical gas molecule delivery to buyer.',
        'Physical gas molecules remain in the producer’s domestic gas grid. Zero pipeline transit tariffs, zero VTP balancing.',
        'Producer retains 100% of domestic state subsidy (SDE++/EEG/FiT) + earns an extra GoO premium.',
        'Electronic GoO transfer executed via national registry (VertiCer/DENA/CertiCarb/GGCS) and cancelled for corporate Scope 1.',
      ],
    });
  }

  // ==========================================================================
  // STRATEGY 2: Unsupported Support-Switch + German THG-Quote Export
  // ==========================================================================
  {
    if (!meetsRed3Transport) {
      evaluations.push({
        strategyId: 'DE_THG_TRANSPORT',
        strategyName: 'Support Switch & Export to German THG-Quote (Road Transport)',
        category: 'TRANSPORT_COMPLIANCE',
        deliveryModel: 'PHYSICAL_AND_CERTIFICATE',
        targetMarket: 'German Fuel Suppliers (38. BImSchV Transport Quota)',
        isEligible: false,
        ineligibilityReason: `Carbon Intensity (${carbonIntensity} gCO2/MJ) fails RED III 65% GHG savings threshold (max 32.9 gCO2/MJ).`,
        subsidyAction: 'SUPPORT_SWITCH_OFF',
        grossDeliveredValueEurMwh: 0,
        transitAndLogisticsEurMwh: transitToGermany,
        structuringFeeEurMwh: structuringFeeEurMwh,
        lhvConversionFactor: lhvFactorForGermany,
        netDeliveredEurMwh: 0,
        plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
        recommendedBidToProducerEurMwh: 0,
        producerIncentiveDeltaEurMwh: 0,
        netDeskMarginEurPerMWh: 0,
        annualDeskPnLEur: 0,
        twoLegFormula: {
          physicalLegFormula: '0.99 × ICIS Heren Day-Ahead TTF bid',
          certLegFormula: 'Ineligible under RED III transport rules',
          basePriceEurMwh: 0,
          ciSliderEurMwhPerGram: 0,
          structuringFeeEurPerMonth: monthlyStructuringFee,
        },
        regulatoryNotes: ['Ineligible for German road transport quota due to high CI.'],
      });
    } else {
      // Avoided emissions formula: (CI_comparator − CI_actual) × MJ_PER_MWH / 1,000,000 tCO₂e/MWh
      // Source: RED III Annex V, Part C, point 19. Canonical via tCO2ePerMWh() in netback/engine.ts
      const avoidedEmissionsTonnes = ((CI_COMPARATOR_ROAD_TRANSPORT - carbonIntensity) * MJ_PER_MWH) / 1_000_000;
      const uncappedCertValue = avoidedEmissionsTonnes * germanThgPrice;
      // Apply LHV conversion to cert leg for HHV-measured origins (NL/FR/GB/ES/IT/BE).
      // German Nabisy registers compliance volumes in LHV. Physical commodity leg settles on standard TTF Day-Ahead basis.
      const effectiveCertValue = uncappedCertValue * lhvFactorForGermany;
      const physicalGasValue = (ttfDayAhead * 99) / 100;
      // Traded bundle cap: physical German bundle clears around €145-€150/MWh ceiling
      const deliveredValue = Number(Math.min(147.00, physicalGasValue + effectiveCertValue).toFixed(2));
      const netDelivered = Number((deliveredValue - transitToGermany - structuringFeeEurMwh).toFixed(2));

      // Recommended producer bid beats plant subsidy hurdle by €2.50 to €8.00/MWh
      const rawSpread = netDelivered - plantSubsidyHurdle;
      let traderMarginEurPerMWh = 0;
      let producerBid = plantSubsidyHurdle;
      let producerDelta = 0;

      if (rawSpread > 0) {
        // Institutional split: Desk captures ~€3.00 to €6.50/MWh margin, producer gets the remaining surplus above hurdle
        traderMarginEurPerMWh = Number(Math.min(rawSpread - 0.10, Math.min(6.50, Math.max(0.50, (rawSpread / 15) + 3.00))).toFixed(2));
        producerBid = Number((netDelivered - traderMarginEurPerMWh).toFixed(2));
        producerDelta = Number((producerBid - plantSubsidyHurdle).toFixed(2));
      } else {
        traderMarginEurPerMWh = Number(rawSpread.toFixed(2));
        producerBid = plantSubsidyHurdle;
        producerDelta = 0;
      }

      // Institutional Term Sheet CI Slider values
      const baseCi = -20.0;
      const sliderAlpha = 0.65;
      const deltaCi = baseCi - carbonIntensity;
      const calculatedCertPrice = Number((53.00 + sliderAlpha * deltaCi).toFixed(2));

      evaluations.push({
        strategyId: 'DE_THG_TRANSPORT',
        strategyName: 'Support Switch & Export to German THG-Quote (Road Transport)',
        category: 'TRANSPORT_COMPLIANCE',
        deliveryModel: 'PHYSICAL_AND_CERTIFICATE',
        targetMarket: 'German Fuel Suppliers (38. BImSchV Transport Quota)',
        isEligible: true,
        subsidyAction: 'SUPPORT_SWITCH_OFF',
        grossDeliveredValueEurMwh: deliveredValue,
        transitAndLogisticsEurMwh: transitToGermany,
        structuringFeeEurMwh: structuringFeeEurMwh,
        lhvConversionFactor: lhvFactorForGermany,
        netDeliveredEurMwh: netDelivered,
        plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
        recommendedBidToProducerEurMwh: producerBid,
        producerIncentiveDeltaEurMwh: producerDelta,
        netDeskMarginEurPerMWh: traderMarginEurPerMWh,
        annualDeskPnLEur: Math.round(traderMarginEurPerMWh * annualMWh),
        twoLegFormula: {
          physicalLegFormula: '0.99 × ICIS Heren Day-Ahead TTF bid (invoiced 20th of next month)',
          certLegFormula: `Base €53.00 + 0.65 × (Base CI [-20] - Actual CI [${carbonIntensity}]) = €${calculatedCertPrice.toFixed(2)}/MWh`,
          basePriceEurMwh: 53.00,
          ciSliderEurMwhPerGram: sliderAlpha,
          structuringFeeEurPerMonth: monthlyStructuringFee,
        },
        regulatoryNotes: [
          isHhvOrigin ? 'Includes statutory 0.901 Gross-HHV to Net-LHV conversion for German Nabisy registry.' : '1.0 LHV parity.',
          'Single counting enforced per 38. BImSchV (upstream double counting eliminated).',
          'Requires Nabisy Proof of Sustainability issued in LHV and registered via BLE.',
        ],
      });
    }
  }

  // ==========================================================================
  // STRATEGY 3: Unsupported Support-Switch + Dutch REV / ERE-A (Transport)
  // ==========================================================================
  {
    if (!isAnnexIxA || !meetsRed3Transport) {
      evaluations.push({
        strategyId: 'NL_REV_TRANSPORT',
        strategyName: 'Support Switch & Deliver to Dutch REV / ERE-A (Advanced Biofuels)',
        category: 'TRANSPORT_COMPLIANCE',
        deliveryModel: 'PHYSICAL_AND_CERTIFICATE',
        targetMarket: 'Dutch Fuel Suppliers (NEa Energy for Transport / HBE-A)',
        isEligible: false,
        ineligibilityReason: 'Only RED III Annex IX-A advanced feedstocks (manure, biowaste) qualify for Dutch HBE-A double credits.',
        subsidyAction: 'SUPPORT_SWITCH_OFF',
        grossDeliveredValueEurMwh: 0,
        transitAndLogisticsEurMwh: transitToNetherlands,
        structuringFeeEurMwh: structuringFeeEurMwh,
        lhvConversionFactor: 1.0,
        netDeliveredEurMwh: 0,
        plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
        recommendedBidToProducerEurMwh: 0,
        producerIncentiveDeltaEurMwh: 0,
        netDeskMarginEurPerMWh: 0,
        annualDeskPnLEur: 0,
        twoLegFormula: {
          physicalLegFormula: '0.99 × TTF Day-Ahead',
          certLegFormula: 'Ineligible (Not Annex IX-A)',
          basePriceEurMwh: 0,
          ciSliderEurMwhPerGram: 0,
          structuringFeeEurPerMonth: monthlyStructuringFee,
        },
        regulatoryNotes: ['Ineligible for Dutch HBE-A.'],
      });
    } else {
      const physicalGas = (ttfDayAhead * 99) / 100;
      const deliveredValue = Number((physicalGas + dutchHbeAPrice).toFixed(2));
      const netDelivered = Number((deliveredValue - transitToNetherlands - structuringFeeEurMwh).toFixed(2));
      const rawSpread = netDelivered - plantSubsidyHurdle;

      let traderMarginEurPerMWh = 0;
      let producerBid = plantSubsidyHurdle;
      let producerDelta = 0;

      if (rawSpread > 0) {
        traderMarginEurPerMWh = Number(Math.min(5.50, Math.max(2.50, (rawSpread / 15) + 2.50)).toFixed(2));
        producerBid = Number((netDelivered - traderMarginEurPerMWh).toFixed(2));
        producerDelta = Number((producerBid - plantSubsidyHurdle).toFixed(2));
      } else {
        traderMarginEurPerMWh = Number(rawSpread.toFixed(2));
        producerBid = plantSubsidyHurdle;
        producerDelta = 0;
      }

      evaluations.push({
        strategyId: 'NL_REV_TRANSPORT',
        strategyName: 'Support Switch & Deliver to Dutch REV / ERE-A (Advanced Biofuels)',
        category: 'TRANSPORT_COMPLIANCE',
        deliveryModel: 'PHYSICAL_AND_CERTIFICATE',
        targetMarket: 'Dutch Fuel Suppliers (NEa Energy for Transport / HBE-A)',
        isEligible: true,
        subsidyAction: 'SUPPORT_SWITCH_OFF',
        grossDeliveredValueEurMwh: deliveredValue,
        transitAndLogisticsEurMwh: transitToNetherlands,
        structuringFeeEurMwh: structuringFeeEurMwh,
        lhvConversionFactor: 1.0,
        netDeliveredEurMwh: netDelivered,
        plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
        recommendedBidToProducerEurMwh: producerBid,
        producerIncentiveDeltaEurMwh: producerDelta,
        netDeskMarginEurPerMWh: traderMarginEurPerMWh,
        annualDeskPnLEur: Math.round(traderMarginEurPerMWh * annualMWh),
        twoLegFormula: {
          physicalLegFormula: '0.99 × ICIS Heren Day-Ahead TTF bid at TTF VTP',
          certLegFormula: `Dutch HBE-A Claim Value: €${dutchHbeAPrice.toFixed(2)}/MWh with VertiCer PoS`,
          basePriceEurMwh: dutchHbeAPrice,
          ciSliderEurMwhPerGram: 0.00,
          structuringFeeEurPerMonth: monthlyStructuringFee,
        },
        regulatoryNotes: [
          'Annex IX-A statutory double counting applies under Dutch Renewable Energy Directive (REV).',
          'Producer must formally opt out of SDE++ subsidy with RVO for delivery volume.',
          'Electronic transfer of VertiCer GoO + ISCC EU Proof of Sustainability.',
        ],
      });
    }
  }

  // ==========================================================================
  // STRATEGY 4: FuelEU Maritime Bio-LNG Pooling (Maritime Transport)
  // ==========================================================================
  {
    if (carbonIntensity > 0) {
      evaluations.push({
        strategyId: 'FUELEU_MARITIME',
        strategyName: 'Support Switch + FuelEU Maritime Bio-LNG Compliance Pooling',
        category: 'MARITIME',
        deliveryModel: 'PHYSICAL_AND_CERTIFICATE',
        targetMarket: 'European Maritime Shipping Operators (Regulation (EU) 2023/1805)',
        isEligible: false,
        ineligibilityReason: 'FuelEU Maritime compliance pooling requires zero or negative CI bio-LNG to generate sufficient compliance surplus.',
        subsidyAction: 'SUPPORT_SWITCH_OFF',
        grossDeliveredValueEurMwh: 0,
        transitAndLogisticsEurMwh: 12.00,
        structuringFeeEurMwh: structuringFeeEurMwh,
        lhvConversionFactor: 1.0,
        netDeliveredEurMwh: 0,
        plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
        recommendedBidToProducerEurMwh: 0,
        producerIncentiveDeltaEurMwh: 0,
        netDeskMarginEurPerMWh: 0,
        annualDeskPnLEur: 0,
        twoLegFormula: {
          physicalLegFormula: 'TTF + Bio-LNG Small Scale Index',
          certLegFormula: 'Ineligible (Positive CI)',
          basePriceEurMwh: 0,
          ciSliderEurMwhPerGram: 0,
          structuringFeeEurPerMonth: monthlyStructuringFee,
        },
        regulatoryNotes: ['Positive CI bio-LNG does not generate compliance surplus for shipping fleets.'],
      });
    } else {
      // FuelEU Maritime deficit-closure value — Regulation (EU) 2023/1805 Annex IV
      // Uses the canonical computeFuelEUDeficitClosureValue() from netback/engine.ts
      const fuelEuResult = computeFuelEUDeficitClosureValue(carbonIntensity, 1, FUELEU_TARGET_CI_2025, FUELEU_BASELINE_CI);
      const penaltySavingPerMwh = fuelEuResult.valueEurPerMWh;
      const grossBioLngValue = Number((ttfDayAhead + penaltySavingPerMwh).toFixed(2));
      /** Standard small-scale liquefaction & delivery to bunkering terminal (€/MWh) */
      const LIQUEFACTION_AND_TRUCKING_COST_EUR_MWH = 12.50;
      const netDelivered = Number((grossBioLngValue - LIQUEFACTION_AND_TRUCKING_COST_EUR_MWH - structuringFeeEurMwh).toFixed(2));
      const rawSpread = netDelivered - plantSubsidyHurdle;

      let traderMarginEurPerMWh = 0;
      let producerBid = plantSubsidyHurdle;
      let producerDelta = 0;

      if (rawSpread > 0) {
        traderMarginEurPerMWh = Number(Math.min(6.00, Math.max(3.00, (rawSpread / 15) + 3.00)).toFixed(2));
        producerBid = Number((netDelivered - traderMarginEurPerMWh).toFixed(2));
        producerDelta = Number((producerBid - plantSubsidyHurdle).toFixed(2));
      } else {
        traderMarginEurPerMWh = Number(rawSpread.toFixed(2));
        producerBid = plantSubsidyHurdle;
        producerDelta = 0;
      }

      evaluations.push({
        strategyId: 'FUELEU_MARITIME',
        strategyName: 'Support Switch + FuelEU Maritime Bio-LNG Compliance Pooling',
        category: 'MARITIME',
        deliveryModel: 'PHYSICAL_AND_CERTIFICATE',
        targetMarket: 'European Maritime Shipping Operators (Regulation (EU) 2023/1805)',
        isEligible: true,
        subsidyAction: 'SUPPORT_SWITCH_OFF',
        grossDeliveredValueEurMwh: grossBioLngValue,
        transitAndLogisticsEurMwh: LIQUEFACTION_AND_TRUCKING_COST_EUR_MWH,
        structuringFeeEurMwh: structuringFeeEurMwh,
        lhvConversionFactor: 1.0,
        netDeliveredEurMwh: netDelivered,
        plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
        recommendedBidToProducerEurMwh: producerBid,
        producerIncentiveDeltaEurMwh: producerDelta,
        netDeskMarginEurPerMWh: traderMarginEurPerMWh,
        annualDeskPnLEur: Math.round(traderMarginEurPerMWh * annualMWh),
        twoLegFormula: {
          physicalLegFormula: '0.99 × TTF Day-Ahead + Bio-LNG Liquefaction premium',
          certLegFormula: `FuelEU Deficit Closure Pool Value: €${penaltySavingPerMwh.toFixed(2)}/MWh`,
          basePriceEurMwh: penaltySavingPerMwh,
          ciSliderEurMwhPerGram: 0.60,
          structuringFeeEurPerMonth: monthlyStructuringFee,
        },
        regulatoryNotes: [
          'Enforces Regulation (EU) 2023/1805 Article 21 pooling mechanism.',
          'Small-scale liquefaction and terminal delivery cost (~€12.50/MWh) deducted from stack.',
          'Delivered to Rotterdam, Antwerp, or Hamburg marine bunkering hubs.',
        ],
      });
    }
  }

  // ==========================================================================
  // STRATEGY 5: EU ETS Industrial Scope 1 Zero-Rating (Corporate Heat/Industry)
  // ==========================================================================
  {
    // Under EU ETS MRR Art. 38, natural gas combustion emits 0.202 tCO2/MWh.
    // Burning biomethane saves 0.202 EUAs per MWh. (0.202 = 202 / 1000)
    const avoidedEuaPerMwh = (NATURAL_GAS_CO2_G_PER_MWH * euEtsEuaPrice) / 1000;
    const deliveredValue = Number((ttfDayAhead + avoidedEuaPerMwh + 4.00).toFixed(2));
    const transit = 1.00;
    const netDelivered = Number((deliveredValue - transit - structuringFeeEurMwh).toFixed(2));
    const rawSpread = netDelivered - plantSubsidyHurdle;

    let traderMarginEurPerMWh = 0;
    let producerBid = plantSubsidyHurdle;
    let producerDelta = 0;

    if (rawSpread > 0) {
      traderMarginEurPerMWh = Number(Math.min(4.50, Math.max(2.00, (rawSpread / 15) + 2.00)).toFixed(2));
      producerBid = Number((netDelivered - traderMarginEurPerMWh).toFixed(2));
      producerDelta = Number((producerBid - plantSubsidyHurdle).toFixed(2));
    } else {
      traderMarginEurPerMWh = Number(rawSpread.toFixed(2));
      producerBid = plantSubsidyHurdle;
      producerDelta = 0;
    }

    evaluations.push({
      strategyId: 'EU_ETS_INDUSTRIAL',
      strategyName: 'EU ETS Industrial Scope 1 Zero-Rating (Chemical/Steel/Glass)',
      category: 'INDUSTRIAL_ETS',
      deliveryModel: 'PHYSICAL_AND_CERTIFICATE',
      targetMarket: 'EU ETS Heavy Industry (EUA Compliance Offsetting under MRR Art. 38)',
      isEligible: meetsRed3Transport,
      ineligibilityReason: !meetsRed3Transport ? 'Fails RED II/III sustainability criteria required for EU ETS zero-rating.' : undefined,
      subsidyAction: 'SUPPORT_SWITCH_OFF',
      grossDeliveredValueEurMwh: deliveredValue,
      transitAndLogisticsEurMwh: transit,
      structuringFeeEurMwh: structuringFeeEurMwh,
      lhvConversionFactor: 1.0,
      netDeliveredEurMwh: netDelivered,
      plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
      recommendedBidToProducerEurMwh: producerBid,
      producerIncentiveDeltaEurMwh: producerDelta,
      netDeskMarginEurPerMWh: Math.max(1.50, traderMarginEurPerMWh),
      annualDeskPnLEur: Math.max(25000, Math.round(traderMarginEurPerMWh * annualMWh)),
      twoLegFormula: {
        physicalLegFormula: '0.99 × ICIS Heren Day-Ahead TTF bid at VTP',
        certLegFormula: `Avoided EUA Allowance (0.202 × €${euEtsEuaPrice.toFixed(0)}) + Green Margin: €${(avoidedEuaPerMwh + 4.00).toFixed(2)}/MWh`,
        basePriceEurMwh: Number((avoidedEuaPerMwh + 4.00).toFixed(2)),
        ciSliderEurMwhPerGram: 0.00,
        structuringFeeEurPerMonth: monthlyStructuringFee,
      },
      regulatoryNotes: [
        'EU ETS Monitoring and Reporting Regulation (MRR Art. 38) allows 0-rating of biomethane emissions.',
        'Saves 0.202 EU ETS Allowances (EUAs) per MWh of natural gas substituted.',
        'Requires ISCC EU Proof of Sustainability and permanent cancellation of Guarantees of Origin.',
      ],
    });
  }

  // ==========================================================================
  // STRATEGY 6: UK RTFO Transport (GB Grid Injection or Direct Physical Flow)
  // ==========================================================================
  {
    const isUkGrid = originIso === 'GB';
    // dRTFC certificate value: sourced from state.marks via options.ukRtfoCertValueEurMwh
    // Formula: £/RTFC × GBP_EUR_FX × 144 RTFC/MWh (2 dRTFC/kg × 72 kg/MWh = 144 dRTFC/MWh for advanced feedstocks)
    const rtfoCertValue = ukRtfoCertValue;
    const deliveredValue = Number((ttfDayAhead + rtfoCertValue).toFixed(2));
    const transit = isUkGrid ? 0.80 : 3.50;
    const netDelivered = Number((deliveredValue - transit - structuringFeeEurMwh).toFixed(2));

    evaluations.push({
      strategyId: 'UK_RTFO_TRANSPORT',
      strategyName: 'UK RTFO Road Transport (dRTFC Obligation)',
      category: 'TRANSPORT_COMPLIANCE',
      deliveryModel: 'PHYSICAL_AND_CERTIFICATE',
      targetMarket: 'UK Fuel Suppliers (Department for Transport RTFO)',
      isEligible: isUkGrid && meetsRed3Transport,
      ineligibilityReason: !isUkGrid ? 'UK RTFO mass-balance requires Great Britain grid injection or physically segregated LNG transport.' : undefined,
      subsidyAction: isUkGrid ? 'KEEP_SUBSIDY' : 'SUPPORT_SWITCH_OFF',
      grossDeliveredValueEurMwh: deliveredValue,
      transitAndLogisticsEurMwh: transit,
      structuringFeeEurMwh: structuringFeeEurMwh,
      lhvConversionFactor: 1.0,
      netDeliveredEurMwh: netDelivered,
      plantSubsidyHurdleEurMwh: plantSubsidyHurdle,
      recommendedBidToProducerEurMwh: Math.max(plantSubsidyHurdle, netDelivered - 4.00),
      producerIncentiveDeltaEurMwh: Math.max(0, netDelivered - 4.00 - plantSubsidyHurdle),
      netDeskMarginEurPerMWh: isUkGrid ? 4.00 : 0,
      annualDeskPnLEur: isUkGrid ? Math.round(4.00 * annualMWh) : 0,
      twoLegFormula: {
        physicalLegFormula: '0.99 × ICIS Heren Day-Ahead NBP bid',
        certLegFormula: `dRTFC Issue Price: ~€${rtfoCertValue.toFixed(2)}/MWh`,
        basePriceEurMwh: rtfoCertValue,
        ciSliderEurMwhPerGram: 0.40,
        structuringFeeEurPerMonth: monthlyStructuringFee,
      },
      regulatoryNotes: [
        'DfT RTFO requires physical Great Britain pipeline entry.',
        'Non-UK origins cannot clear UK RTFO without physical segregation.',
      ],
    });
  }

  // Find Winning Strategy: highest eligible annualDeskPnLEur
  const eligibleStrategies = evaluations.filter(e => e.isEligible);
  const winningStrategy = eligibleStrategies.length > 0
    ? eligibleStrategies.reduce((prev, current) => (current.annualDeskPnLEur > prev.annualDeskPnLEur ? current : prev))
    : evaluations[0];

  // Commercial Pitch Script for the Trader
  const headline = winningStrategy.subsidyAction === 'SUPPORT_SWITCH_OFF'
    ? `Support-Switch Arbitrage: Beat ${domesticBaseline.schemeName} by +€${winningStrategy.producerIncentiveDeltaEurMwh.toFixed(2)}/MWh`
    : `Supported Retained Arbitrage: Monetize Green Premium via ${winningStrategy.strategyName}`;

  const pitchScript = winningStrategy.subsidyAction === 'SUPPORT_SWITCH_OFF'
    ? `Hi [Plant Manager], we are offering a guaranteed fixed offtake contract for ${annualGWh} GWh. Instead of relying on your domestic ${domesticBaseline.schemeName} (~€${plantSubsidyHurdle.toFixed(2)}/MWh), our two-leg pricing structure pays you €${winningStrategy.recommendedBidToProducerEurMwh.toFixed(2)}/MWh (a +€${winningStrategy.producerIncentiveDeltaEurMwh.toFixed(2)}/MWh premium, generating +€${Math.round(winningStrategy.producerIncentiveDeltaEurMwh * annualMWh).toLocaleString()} extra annual cashflow) with indexation to TTF Day-Ahead.`
    : `Hi [Plant Manager], keep 100% of your current government ${domesticBaseline.schemeName} subsidy (~€${plantSubsidyHurdle.toFixed(2)}/MWh). We will structure your Guarantees of Origin (GoOs) into the voluntary corporate Scope 1 market, generating an immediate risk-free cash premium of +€${winningStrategy.recommendedBidToProducerEurMwh.toFixed(2)}/MWh bonus cashflow.`;

  return {
    plant: {
      id: plant.id,
      name: plant.name,
      country: plant.country,
      countryCode: originIso,
      countryFlag: plant.countryFlag || '🇪🇺',
      annualEnergyGWh: annualGWh,
      annualVolumeMWh: annualMWh,
      hourlyCapacityMWh: hourlyCapacityMWh,
      primaryFeedstockCategory: feedstock,
      feedstockDetails: plant.feedstockDetails || feedstock,
      carbonIntensity: carbonIntensity,
      networkOperator: plant.networkOperator || 'Regional DSO / TSO',
      upgradingTechnology: plant.upgradingTechnology || 'Membrane separation',
    },
    domesticSubsidyBaseline: domesticBaseline,
    marketBenchmarks: {
      ttfDayAheadEurMwh: ttfDayAhead,
      germanThgQuoteEurPerTonne: germanThgPrice,
      dutchHbeAEurMwh: dutchHbeAPrice,
      euEtsEuaEurPerTonne: euEtsEuaPrice,
      voluntaryGoPremiumEurMwh: voluntaryGoPremium,
    },
    evaluations,
    winningStrategy,
    ciIsEstimated,
    commercialPitchSummary: {
      headline,
      pitchScript,
      producerOfferSummary: winningStrategy.deliveryModel === 'UNBUNDLED_CERTIFICATE_ONLY'
        ? `€${winningStrategy.recommendedBidToProducerEurMwh.toFixed(2)}/MWh GoO Certificate Bonus (Keep 100% Domestic Subsidy + Zero Commodity Delivery)`
        : `€${winningStrategy.recommendedBidToProducerEurMwh.toFixed(2)}/MWh all-in (${winningStrategy.twoLegFormula.physicalLegFormula} + ${winningStrategy.twoLegFormula.certLegFormula})`,
      eexTtfShortHedgeMWh: winningStrategy.deliveryModel === 'UNBUNDLED_CERTIFICATE_ONLY' ? 0 : annualMWh,
    },
  };
}
