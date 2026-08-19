import { 
  DualLegOfftakeStructure, 
  DualLegPricingResult, 
  CiSliderConfig, 
  SdePlusPlusTerms,
  EnergyHeatingValueBasis 
} from './types';

export const HHV_TO_LHV_FACTOR = 0.901; // Standard European biomethane conversion factor (Gross to Net calorific value)

/**
 * Calculates the Dynamic Carbon Intensity (CI) Slider adjustment based on
 * the official formula used in institutional long-term biomethane offtake agreements:
 *
 *   CI Slider Adjustment [€/MWh] = alpha * (Base Carbon Intensity - Actual Carbon Intensity)
 *
 * Example (RWE/Puzzle Contract):
 *   Base Price = €53.00/MWh
 *   Base CI = -20 gCO2e/MJ
 *   Alpha = €0.65 / gCO2e/MJ
 *   Actual Delivered CI = -50 gCO2e/MJ
 *   CI Slider = 0.65 * (-20 - (-50)) = 0.65 * (+30) = +€19.50/MWh
 *   Final Certificate Price = €53.00 + €19.50 = €72.50/MWh
 */
export function calculateCiSliderAdjustment(
  config: CiSliderConfig,
  actualCi: number
): {
  adjustmentEurPerMWh: number;
  finalCertificatePriceEurPerMWh: number;
  isWithinCorridor: boolean;
  buyerRejectionTriggered: boolean;
} {
  const buyerRejectionTriggered = config.buyerRejectionAboveMaxCi && actualCi > config.maxCarbonIntensityCeiling;
  const isWithinCorridor = actualCi >= config.minCarbonIntensityFloor && actualCi <= config.maxCarbonIntensityCeiling;

  // Clamping CI within contract floor/ceiling for standard pricing calculation
  const clampedCi = Math.max(config.minCarbonIntensityFloor, Math.min(config.maxCarbonIntensityCeiling, actualCi));
  const deltaCi = config.baseCarbonIntensity - clampedCi;
  const adjustmentEurPerMWh = Number((config.ciMultiplierAlpha * deltaCi).toFixed(4));
  const finalCertificatePriceEurPerMWh = Number((config.basePriceEurPerMWh + adjustmentEurPerMWh).toFixed(2));

  return {
    adjustmentEurPerMWh,
    finalCertificatePriceEurPerMWh,
    isWithinCorridor,
    buyerRejectionTriggered,
  };
}

export interface SdePlusPlusCalculationResult {
  sdePaymentEurPerMWh: number | null;
  supportedPriceEurPerMWh: number | null;
  rvoSubsidyEurPerMWh: number | null;
  totalSellerCertificateRevenueEurPerMWh: number | null;
  missingInputs: string[];
}

/**
 * Calculates the Dutch SDE++ statutory subsidy payout and supported certificate contract price
 * per Appendix 1, Clause 25.6 of the RWE/Puzzle contract:
 *
 *   SDE Payment [from RVO] = basisbedrag - max(correctiebedrag, basisenergieprijs) - ETS correctie
 *   Supported Price [from Buyer] = supportedBasePrice (54) + switchPremium (1) - SDE Payment
 *
 * Illustrative Example (Worked in Contract Clause 25.6):
 *   basisbedrag = 55, correctiebedrag = 20, basisenergieprijs = 15, ETS correctie = 15, switchPremium = 1, supportedBasePrice = 54
 *   SDE Payment = 55 - max(20, 15) - 15 = 55 - 20 - 15 = 20 €/MWh (paid by RVO)
 *   Supported Price = 54 + 1 - 20 = 35 €/MWh (paid by Buyer)
 *   Total Seller Certificate Revenue = 35 + 20 = 55 €/MWh
 */
export function calculateSdePlusPlusPrice(
  terms: SdePlusPlusTerms
): SdePlusPlusCalculationResult {
  const missingInputs: string[] = [];

  if (terms.supportedBasePriceEurPerMWh === null || terms.supportedBasePriceEurPerMWh === undefined) {
    missingInputs.push('supportedBasePriceEurPerMWh');
  }
  if (terms.switchPremiumEurPerMWh === null || terms.switchPremiumEurPerMWh === undefined) {
    missingInputs.push('switchPremiumEurPerMWh');
  }
  if (terms.basisbedrag === null || terms.basisbedrag === undefined) {
    missingInputs.push('basisbedrag');
  }
  if (terms.correctiebedrag === null || terms.correctiebedrag === undefined) {
    missingInputs.push('correctiebedrag');
  }
  if (terms.basisenergieprijs === null || terms.basisenergieprijs === undefined) {
    missingInputs.push('basisenergieprijs');
  }

  if (missingInputs.length > 0) {
    return {
      sdePaymentEurPerMWh: null,
      supportedPriceEurPerMWh: null,
      rvoSubsidyEurPerMWh: null,
      totalSellerCertificateRevenueEurPerMWh: null,
      missingInputs: ['sdeTerms', ...missingInputs],
    };
  }

  const ets = terms.etsCorrectie ?? 0;
  const energyCorrection = Math.max(terms.correctiebedrag!, terms.basisenergieprijs!);
  const sdePayment = Math.max(0, terms.basisbedrag! - energyCorrection - ets);
  const supportedPrice = terms.supportedBasePriceEurPerMWh! + terms.switchPremiumEurPerMWh! - sdePayment;
  const totalSellerCertRevenue = supportedPrice + sdePayment;

  return {
    sdePaymentEurPerMWh: Number(sdePayment.toFixed(2)),
    supportedPriceEurPerMWh: Number(supportedPrice.toFixed(2)),
    rvoSubsidyEurPerMWh: Number(sdePayment.toFixed(2)),
    totalSellerCertificateRevenueEurPerMWh: Number(totalSellerCertRevenue.toFixed(2)),
    missingInputs: [],
  };
}

/**
 * Backwards-compatible alias
 */
export const calculateDutchSdeSupportedPrice = calculateSdePlusPlusPrice;

/**
 * Generic Contract-for-Difference (CfD) Subsidy Model
 * (Distinct from statutory SDE++ - for generic single-strike support schemes)
 */
export function calculateGenericCfdSubsidy(
  strikePriceEurPerMWh: number,
  benchmarkPriceEurPerMWh: number
): { netSubsidyPaidEurPerMWh: number } {
  return {
    netSubsidyPaidEurPerMWh: Math.max(0, strikePriceEurPerMWh - benchmarkPriceEurPerMWh)
  };
}

/**
 * Converts energy volume from Higher Heating Value (HHV / Gross) to Lower Heating Value (LHV / Net)
 * Essential when moving between Dutch VertiCer / UK GGCS (HHV) and German Nabisy / RED III (LHV)
 */
export function convertHhvToLhv(mwhHhv: number): number {
  return Number((mwhHhv * HHV_TO_LHV_FACTOR).toFixed(2));
}

/**
 * Converts energy volume from Lower Heating Value (LHV / Net) to Higher Heating Value (HHV / Gross)
 */
export function convertLhvToHhv(mwhLhv: number): number {
  return Number((mwhLhv / HHV_TO_LHV_FACTOR).toFixed(2));
}

/**
 * Complete institutional valuation of a Decoupled Dual-Leg Offtake Contract
 */
export function calculateDualLegOfftake(
  structure: DualLegOfftakeStructure,
  liveGasIndexMid?: number | null
): DualLegPricingResult {
  const { physicalGasLeg, certificateLeg, flowProfile, subsidySwitching } = structure;
  const volMinHhv = flowProfile.estimatedAnnualVolumeMinMWh;
  const volMaxHhv = flowProfile.estimatedAnnualVolumeMaxMWh;
  const avgVolHhv = (volMinHhv + volMaxHhv) / 2;
  const monthlyVolHhv = avgVolHhv / 12;

  const missingInputs: string[] = [];

  // 1. Physical Gas Leg Calculation
  let physicalGasPriceEurPerMWh: number | null = null;
  let physicalDeliveredNetCostEurPerMWh: number | null = null;
  let physicalMonthlyInvoiceAmountEur: number | null = null;

  if (physicalGasLeg.enabled) {
    const activeGasBenchmark = physicalGasLeg.fixedPriceEurPerMWh != null
      ? physicalGasLeg.fixedPriceEurPerMWh
      : (physicalGasLeg.marketBenchmarkPriceEurPerMWh ?? liveGasIndexMid ?? null);

    if (activeGasBenchmark !== null) {
      physicalGasPriceEurPerMWh = Number((activeGasBenchmark * physicalGasLeg.indexDiscountFactor).toFixed(2));
      const entryFee = physicalGasLeg.entryCapacityBookingCostEurPerMWh ?? 0;
      const shipperFee = physicalGasLeg.shipperNominationFeeEurPerMWh ?? 0;
      physicalDeliveredNetCostEurPerMWh = Number((physicalGasPriceEurPerMWh - entryFee - shipperFee).toFixed(2));
      physicalMonthlyInvoiceAmountEur = Math.round(physicalGasPriceEurPerMWh * monthlyVolHhv);
    } else {
      missingInputs.push('gasIndex');
    }
  }

  // 2. Certificate Leg Calculation (Unsupported Baseline with Dynamic CI Slider)
  let baseCertificatePriceEurPerMWh = 0;
  let ciSliderAdjustmentEurPerMWh = 0;
  let finalCertificatePriceEurPerMWh = 0;
  let isCiWithinCorridor = true;
  let buyerRejectionTriggered = false;

  if (certificateLeg.enabled) {
    baseCertificatePriceEurPerMWh = certificateLeg.ciSlider.basePriceEurPerMWh;
    const ciResult = calculateCiSliderAdjustment(
      certificateLeg.ciSlider, 
      certificateLeg.deliveredCarbonIntensity
    );
    ciSliderAdjustmentEurPerMWh = ciResult.adjustmentEurPerMWh;
    finalCertificatePriceEurPerMWh = ciResult.finalCertificatePriceEurPerMWh;
    isCiWithinCorridor = ciResult.isWithinCorridor;
    buyerRejectionTriggered = ciResult.buyerRejectionTriggered;
  }

  const certificateMonthlyInvoiceAmountEur = Math.round(finalCertificatePriceEurPerMWh * monthlyVolHhv);

  // 3. Heating Value Adjustments (Range)
  const volumeGrossMinMWhHhv = volMinHhv;
  const volumeGrossMaxMWhHhv = volMaxHhv;
  const volumeNetMinMWhLhv = convertHhvToLhv(volMinHhv);
  const volumeNetMaxMWhLhv = convertHhvToLhv(volMaxHhv);

  // 4. Combined Value Stack (Unsupported Merchant)
  let totalDeliveredOfftakePriceEurPerMWh: number | null = null;
  let totalAnnualRevenueMinEur: number | null = null;
  let totalAnnualRevenueMaxEur: number | null = null;

  if (physicalGasPriceEurPerMWh !== null) {
    totalDeliveredOfftakePriceEurPerMWh = Number(
      (physicalGasPriceEurPerMWh + finalCertificatePriceEurPerMWh).toFixed(2)
    );
    totalAnnualRevenueMinEur = Math.round(totalDeliveredOfftakePriceEurPerMWh * volMinHhv);
    totalAnnualRevenueMaxEur = Math.round(totalDeliveredOfftakePriceEurPerMWh * volMaxHhv);
  }

  // 5. State Subsidy Arbitrage (Clause 25.6: Supported vs. Unsupported)
  let sdePaymentFromRvoEurPerMWh: number | null = null;
  let supportedCertificatePriceEurPerMWh: number | null = null;
  let totalSellerCertificateRevenueEurPerMWh = finalCertificatePriceEurPerMWh;
  let totalSupportedDeliveredPriceEurPerMWh: number | null = null;
  let subsidyDeltaEurPerMWh: number | null = null;
  let optimalSupportState: 'SWITCH_ON_SUBSIDY' | 'SWITCH_OFF_MERCHANT' | 'UNRESOLVED' = 'SWITCH_OFF_MERCHANT';

  if (subsidySwitching.enabled && subsidySwitching.activeSupport === 'NETHERLANDS_SDE_PLUS_PLUS' && subsidySwitching.sdeTerms) {
    const sdeResult = calculateSdePlusPlusPrice(subsidySwitching.sdeTerms);
    sdePaymentFromRvoEurPerMWh = sdeResult.sdePaymentEurPerMWh;
    supportedCertificatePriceEurPerMWh = sdeResult.supportedPriceEurPerMWh;
    totalSellerCertificateRevenueEurPerMWh = sdeResult.totalSellerCertificateRevenueEurPerMWh ?? finalCertificatePriceEurPerMWh;
    
    if (sdeResult.missingInputs.length > 0) {
      missingInputs.push(...sdeResult.missingInputs);
      optimalSupportState = 'UNRESOLVED';
    } else if (physicalGasPriceEurPerMWh !== null && supportedCertificatePriceEurPerMWh !== null) {
      totalSupportedDeliveredPriceEurPerMWh = Number(
        (physicalGasPriceEurPerMWh + supportedCertificatePriceEurPerMWh).toFixed(2)
      );

      const totalSellerIncomeSupported = physicalGasPriceEurPerMWh + totalSellerCertificateRevenueEurPerMWh;
      if (totalDeliveredOfftakePriceEurPerMWh !== null) {
        subsidyDeltaEurPerMWh = Number((totalDeliveredOfftakePriceEurPerMWh - totalSellerIncomeSupported).toFixed(2));
        optimalSupportState = totalDeliveredOfftakePriceEurPerMWh >= totalSellerIncomeSupported
          ? 'SWITCH_OFF_MERCHANT'
          : 'SWITCH_ON_SUBSIDY';
      }
    } else {
      optimalSupportState = 'UNRESOLVED';
    }
  }

  return {
    physicalGasPriceEurPerMWh,
    physicalDeliveredNetCostEurPerMWh,
    physicalMonthlyInvoiceAmountEur,
    baseCertificatePriceEurPerMWh: Number(baseCertificatePriceEurPerMWh.toFixed(2)),
    ciSliderAdjustmentEurPerMWh: Number(ciSliderAdjustmentEurPerMWh.toFixed(2)),
    finalCertificatePriceEurPerMWh: Number(finalCertificatePriceEurPerMWh.toFixed(2)),
    certificateMonthlyInvoiceAmountEur,
    isCiWithinCorridor,
    buyerRejectionTriggered,
    volumeGrossMinMWhHhv,
    volumeGrossMaxMWhHhv,
    volumeNetMinMWhLhv,
    volumeNetMaxMWhLhv,
    hhvToLhvConversionFactor: HHV_TO_LHV_FACTOR,
    totalDeliveredOfftakePriceEurPerMWh,
    totalAnnualRevenueMinEur,
    totalAnnualRevenueMaxEur,
    sdePaymentFromRvoEurPerMWh,
    supportedCertificatePriceEurPerMWh,
    totalSellerCertificateRevenueEurPerMWh,
    totalSupportedDeliveredPriceEurPerMWh,
    subsidyDeltaEurPerMWh,
    optimalSupportState,
    missingInputs,
  };
}

/**
 * Standard contract parameters taken strictly from the verified RWE / PUZZLE offtake agreement
 * Market parameters default to null (must come from marks or user inputs).
 */
export const DEFAULT_INSTITUTIONAL_OFFTAKE: DualLegOfftakeStructure = {
  id: 'offtake_rwest_puzzle_donderen',
  contractName: 'RWE Supply & Trading Biomethane Long-Term Offtake (Donderen Asset)',
  sellerName: 'Puzzle Carbon Bio Energy B.V.',
  buyerName: 'RWE Supply & Trading GmbH',
  sourceDocument: 'RWE 2025 Indicative Term Sheet — Puzzle Donderen',
  isIllustrative: false,
  productionAsset: {
    assetName: 'PUZZLE Donderen Biomethane Installation',
    eanOrGsrnCode: '871694831000490657',
    countryCode: 'NL',
    gridConnectionPoint: 'Groningen Gas Distribution Grid (Enexis / GTS)',
  },
  physicalGasLeg: {
    enabled: true,
    benchmarkHub: 'TTF',
    indexDiscountFactor: 0.99, // 0.99 x TTF Day-Ahead per contract
    fixedPriceEurPerMWh: null,
    // Market parameters set to null per Rule 1 (Must come from marks or user inputs)
    marketBenchmarkPriceEurPerMWh: null,
    entryCapacityBookingCostEurPerMWh: null,
    shipperNominationFeeEurPerMWh: null,
  },
  certificateLeg: {
    enabled: true,
    ciSlider: {
      basePriceEurPerMWh: 53.00,        // Contract Base Price (Unsupported)
      baseCarbonIntensity: -20.0,       // Contract Base CI
      ciMultiplierAlpha: 0.65,          // Contract Slider Multiplier
      minCarbonIntensityFloor: -100.0,  // Contract Minimum CI
      maxCarbonIntensityCeiling: 0.0,   // Contract Maximum CI
      buyerRejectionAboveMaxCi: true,   // Contract Clause 25.4 Rejection Right
    },
    deliveredCarbonIntensity: -50.0,    // Contract worked example batch
    primaryScheme: 'ISCC_EU',
    primaryGoRegistry: 'VERTICER',
    targetComplianceRouting: 'GERMAN_NABISY_THG',
    heatingValueBasis: 'HHV',
    minimumGoValidityMonths: 6,         // Contract Clause GoO Minimum Validity
  },
  flowProfile: {
    estimatedAnnualVolumeMinMWh: 40000, // Contract: "estimated to range between 40 GWh and 55 GWh"
    estimatedAnnualVolumeMaxMWh: 55000, // Contract: "estimated to range between 40 GWh and 55 GWh"
    maximumDeliveryVolumeMWh: 55000,    // Contract Maximum Delivery Volume
    maximumHourlyFlowMWhPerHour: 6.5,   // Contract Maximum Hourly Flow
    deliveryTolerancePercent: null,     // Not in contract (null per Rule 1)
  },
  subsidySwitching: {
    enabled: true,
    activeSupport: 'NETHERLANDS_SDE_PLUS_PLUS',
    sdeTerms: {
      supportedBasePriceEurPerMWh: 54.00, // Contract Clause 25.6 Supported Base Price (€54 vs €53 unsupported)
      switchPremiumEurPerMWh: 1.00,       // Contract Clause 25.6 Switch Premium (€1)
      basisbedrag: 55.00,                 // Contract Clause 25.6 Worked Example
      correctiebedrag: 20.00,             // Contract Clause 25.6 Worked Example
      basisenergieprijs: 15.00,           // Contract Clause 25.6 Worked Example
      etsCorrectie: 15.00,                // Contract Clause 25.6 Worked Example
    },
  },
  prolongation: {
    buyerProlongationYears: 1,           // Contract 1 Calendar Year Extension Option
    exerciseNoticeMonthsPrior: 3,        // Contract 3 Months Prior Notice
    strikePriceType: 'BASE_CONTRACT_PRICE',
  },
  deliveryPeriod: {
    startYear: 2026,
    endYear: 2029,
    totalYears: 4,
  },
};
