export type EnergyHeatingValueBasis = 'HHV' | 'LHV'; // Higher Heating Value (Gross) vs Lower Heating Value (Net)

export type SubsidySupportType = 
  | 'UNSUPPORTED_MERCHANT'
  | 'NETHERLANDS_SDE_PLUS_PLUS'
  | 'FRANCE_TARIF_ACHAT_FIT'
  | 'GERMANY_EEG_FEED_IN'
  | 'UK_GGSS_SUPPORT';

export interface CiSliderConfig {
  basePriceEurPerMWh: number;        // e.g. 53.00 €/MWh (unsupported contract base price)
  baseCarbonIntensity: number;       // e.g. -20.0 gCO2e/MJ
  ciMultiplierAlpha: number;         // e.g. 0.65 €/MWh per gCO2e/MJ
  minCarbonIntensityFloor: number;   // e.g. -100.0 gCO2e/MJ
  maxCarbonIntensityCeiling: number; // e.g. 0.0 gCO2e/MJ
  buyerRejectionAboveMaxCi: boolean; // Buyer right to reject deliveries above Max CI
}

export interface PhysicalGasLegConfig {
  enabled: boolean;
  benchmarkHub: 'TTF' | 'THE' | 'PEG' | 'NBP' | 'PSV' | 'PVB' | 'ZTP';
  indexDiscountFactor: number;               // e.g. 0.99 (0.99 x TTF Day-Ahead per contract)
  fixedPriceEurPerMWh?: number | null;
  // Desk Floating Market Parameters (Must come from marks or user inputs — NOT hardcoded contract terms)
  marketBenchmarkPriceEurPerMWh: number | null;   // Live spot gas index (null = read from MarksState)
  entryCapacityBookingCostEurPerMWh: number | null; // TSO entry tariff (null = unentered)
  shipperNominationFeeEurPerMWh: number | null;     // Shipper fee (null = unentered)
}

export interface CertificateLegConfig {
  enabled: boolean;
  ciSlider: CiSliderConfig;
  deliveredCarbonIntensity: number;  // e.g. -50.0 gCO2e/MJ
  primaryScheme: 'ISCC_EU' | 'RED_CERT' | '2BSVS' | 'ISCC_PLUS' | 'CERTIFHY';
  primaryGoRegistry: 'VERTICER' | 'EEX' | 'DENA' | 'GGCS' | 'ENERGINET' | 'ENAGAS' | 'GSE';
  targetComplianceRouting: 'GERMAN_NABISY_THG' | 'DUTCH_ERE_HBE' | 'FRENCH_CPB' | 'UK_RTFO' | 'EU_ETS_MARITIME' | 'VOLUNTARY_GO';
  heatingValueBasis: EnergyHeatingValueBasis;
  minimumGoValidityMonths: number;   // e.g. 6 months per contract
}

export interface AsProducedFlowProfile {
  estimatedAnnualVolumeMinMWh: number;  // e.g. 40,000 MWh per contract ("40 GWh to 55 GWh")
  estimatedAnnualVolumeMaxMWh: number;  // e.g. 55,000 MWh per contract
  maximumDeliveryVolumeMWh: number;     // e.g. 55,000 MWh per contract
  maximumHourlyFlowMWhPerHour: number;  // e.g. 6.5 MWh/h per contract
  deliveryTolerancePercent?: number | null; // null = not in contract / user-set
}

export interface SdePlusPlusTerms {
  supportedBasePriceEurPerMWh: number | null;   // €54 — NOT the same as the €53 unsupported base
  switchPremiumEurPerMWh: number | null;        // €1
  basisbedrag: number | null;
  correctiebedrag: number | null;
  basisenergieprijs: number | null;
  etsCorrectie: number | null;                  // null = not applicable / €0
}

export interface SubsidySwitchingOption {
  enabled: boolean;
  activeSupport: SubsidySupportType;
  sdeTerms?: SdePlusPlusTerms;
}

export interface ProlongationOptionConfig {
  buyerProlongationYears: number;     // e.g. 1 additional calendar year per contract
  exerciseNoticeMonthsPrior: number;  // e.g. 3 months before expiry per contract
  strikePriceType: 'BASE_CONTRACT_PRICE' | 'PREVAILING_MARKET_INDEX' | 'NEGOTIATED_CAP';
}

export interface DualLegOfftakeStructure {
  id: string;
  contractName: string;
  sellerName: string;
  buyerName: string;
  sourceDocument: string | null;   // null = illustrative structure, not a real term sheet
  isIllustrative: boolean;
  productionAsset: {
    assetName: string;
    eanOrGsrnCode: string;
    countryCode: string;
    gridConnectionPoint: string;
  };
  physicalGasLeg: PhysicalGasLegConfig;
  certificateLeg: CertificateLegConfig;
  flowProfile: AsProducedFlowProfile;
  subsidySwitching: SubsidySwitchingOption;
  prolongation: ProlongationOptionConfig;
  deliveryPeriod: {
    startYear: number;
    endYear: number;
    totalYears: number;
  };
}

export interface DualLegPricingResult {
  // Physical Gas Leg
  physicalGasPriceEurPerMWh: number | null;
  physicalDeliveredNetCostEurPerMWh: number | null;
  physicalMonthlyInvoiceAmountEur: number | null;
  
  // Certificate Leg (Unsupported Base)
  baseCertificatePriceEurPerMWh: number;
  ciSliderAdjustmentEurPerMWh: number;
  finalCertificatePriceEurPerMWh: number;
  certificateMonthlyInvoiceAmountEur: number;
  isCiWithinCorridor: boolean;
  buyerRejectionTriggered: boolean;
  
  // Energy Unit Conversion
  volumeGrossMinMWhHhv: number;
  volumeGrossMaxMWhHhv: number;
  volumeNetMinMWhLhv: number;
  volumeNetMaxMWhLhv: number;
  hhvToLhvConversionFactor: number;
  
  // Total Combined Offtake Value (Unsupported)
  totalDeliveredOfftakePriceEurPerMWh: number | null;
  totalAnnualRevenueMinEur: number | null;
  totalAnnualRevenueMaxEur: number | null;
  
  // SDE++ Statutory Breakdown (Appendix 1, Clause 25.6)
  sdePaymentFromRvoEurPerMWh: number | null;
  supportedCertificatePriceEurPerMWh: number | null;
  totalSellerCertificateRevenueEurPerMWh: number;
  totalSupportedDeliveredPriceEurPerMWh: number | null;
  subsidyDeltaEurPerMWh: number | null; // Advantage of merchant unsupported vs supported
  optimalSupportState: 'SWITCH_ON_SUBSIDY' | 'SWITCH_OFF_MERCHANT' | 'UNRESOLVED';
  missingInputs: string[];
}
