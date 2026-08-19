import { describe, it, expect } from 'vitest';
import { 
  calculateCiSliderAdjustment, 
  calculateSdePlusPlusPrice,
  calculateDutchSdeSupportedPrice,
  convertHhvToLhv, 
  convertLhvToHhv, 
  calculateDualLegOfftake, 
  DEFAULT_INSTITUTIONAL_OFFTAKE,
  HHV_TO_LHV_FACTOR
} from '../offtake/engine';
import { CiSliderConfig, SdePlusPlusTerms } from '../offtake/types';

describe('INSTITUTIONAL BIOMETHANE OFFTAKE FUNDAMENTALS (RWE CONTRACT BENCHMARK)', () => {

  // --------------------------------------------------------------------------
  // 1. DYNAMIC CI SLIDER & TRUE-UP ARITHMETIC
  // --------------------------------------------------------------------------
  describe('1. Dynamic Carbon Intensity (CI) Slider Engine', () => {
    const rweCiConfig: CiSliderConfig = {
      basePriceEurPerMWh: 53.00,
      baseCarbonIntensity: -20.0,
      ciMultiplierAlpha: 0.65,
      minCarbonIntensityFloor: -100.0,
      maxCarbonIntensityCeiling: 0.0,
      buyerRejectionAboveMaxCi: true,
    };

    it('reproduces exact RWE/Puzzle contract illustrative example (CI = -50 -> +€19.50/MWh -> €72.50/MWh)', () => {
      const result = calculateCiSliderAdjustment(rweCiConfig, -50.0);
      
      // Delta CI = -20 - (-50) = +30
      // Adjustment = 0.65 * 30 = +19.50
      expect(result.adjustmentEurPerMWh).toBe(19.50);
      expect(result.finalCertificatePriceEurPerMWh).toBe(72.50);
      expect(result.isWithinCorridor).toBe(true);
      expect(result.buyerRejectionTriggered).toBe(false);
    });

    it('calculates baseline delivery with zero adjustment when Actual CI equals Base CI (-20)', () => {
      const result = calculateCiSliderAdjustment(rweCiConfig, -20.0);
      expect(result.adjustmentEurPerMWh).toBe(0.00);
      expect(result.finalCertificatePriceEurPerMWh).toBe(53.00);
      expect(result.isWithinCorridor).toBe(true);
      expect(result.buyerRejectionTriggered).toBe(false);
    });

    it('applies negative discount when Delivered CI is worse than Base CI (e.g. CI = -10 -> -€6.50/MWh)', () => {
      const result = calculateCiSliderAdjustment(rweCiConfig, -10.0);
      // Delta CI = -20 - (-10) = -10
      // Adjustment = 0.65 * (-10) = -6.50
      expect(result.adjustmentEurPerMWh).toBe(-6.50);
      expect(result.finalCertificatePriceEurPerMWh).toBe(46.50);
      expect(result.isWithinCorridor).toBe(true);
      expect(result.buyerRejectionTriggered).toBe(false);
    });

    it('triggers buyer rejection rights when Actual CI exceeds the Maximum Ceiling (CI > 0)', () => {
      const result = calculateCiSliderAdjustment(rweCiConfig, +15.0);
      expect(result.buyerRejectionTriggered).toBe(true);
      expect(result.isWithinCorridor).toBe(false);
      // Clamped to ceiling (0.0) for formula calculation: 0.65 * (-20 - 0) = -13.00
      expect(result.adjustmentEurPerMWh).toBe(-13.00);
      expect(result.finalCertificatePriceEurPerMWh).toBe(40.00);
    });

    it('clamps positive bonus at the minimum CI floor (-100.0)', () => {
      const result = calculateCiSliderAdjustment(rweCiConfig, -120.0);
      expect(result.isWithinCorridor).toBe(false);
      // Clamped to floor (-100.0): 0.65 * (-20 - (-100)) = 0.65 * 80 = +52.00
      expect(result.adjustmentEurPerMWh).toBe(52.00);
      expect(result.finalCertificatePriceEurPerMWh).toBe(105.00);
    });
  });

  // --------------------------------------------------------------------------
  // 2. STATUTORY SDE++ SUBSIDY FORMULA (CLAUSE 25.6 FIDELITY)
  // --------------------------------------------------------------------------
  describe('2. Dutch SDE++ Statutory Deduction & Switching Option (Clause 25.6)', () => {
    const contractSdeParams: SdePlusPlusTerms = {
      basisbedrag: 55.00,
      correctiebedrag: 20.00,
      basisenergieprijs: 15.00,
      etsCorrectie: 15.00,
      switchPremiumEurPerMWh: 1.00,
      supportedBasePriceEurPerMWh: 54.00,
    };

    it('reproduces exact RWE/Puzzle contract worked example for SDE++ (Clause 25.6: €20 RVO, €35 Buyer, €55 total)', () => {
      const result = calculateSdePlusPlusPrice(contractSdeParams);

      // SDE Payment = 55 - max(20, 15) - 15 = 55 - 20 - 15 = 20 €/MWh from RVO
      expect(result.sdePaymentEurPerMWh).toBe(20.00);
      expect(result.rvoSubsidyEurPerMWh).toBe(20.00);

      // Supported Price = 54 + 1 - 20 = 35 €/MWh from Buyer
      expect(result.supportedPriceEurPerMWh).toBe(35.00);

      // Total Seller Certificate Income = 35 + 20 = 55 €/MWh (matching 54 + 1 switch premium)
      expect(result.totalSellerCertificateRevenueEurPerMWh).toBe(55.00);
      expect(result.missingInputs.length).toBe(0);
    });

    it('returns null and flags sdeTerms in missingInputs when any required field is null', () => {
      const incompleteParams: SdePlusPlusTerms = {
        basisbedrag: 55.00,
        correctiebedrag: null, // missing required input
        basisenergieprijs: 15.00,
        etsCorrectie: 15.00,
        switchPremiumEurPerMWh: 1.00,
        supportedBasePriceEurPerMWh: 54.00,
      };
      const result = calculateSdePlusPlusPrice(incompleteParams);

      expect(result.supportedPriceEurPerMWh).toBeNull();
      expect(result.sdePaymentEurPerMWh).toBeNull();
      expect(result.rvoSubsidyEurPerMWh).toBeNull();
      expect(result.missingInputs).toContain('sdeTerms');
      expect(result.missingInputs).toContain('correctiebedrag');
    });

    it('preserves the distinction that supported base price (€54) != unsupported base price (€53)', () => {
      const unsupportedBase = DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg.ciSlider.basePriceEurPerMWh;
      const supportedBase = DEFAULT_INSTITUTIONAL_OFFTAKE.subsidySwitching.sdeTerms?.supportedBasePriceEurPerMWh;

      expect(unsupportedBase).toBe(53.00);
      expect(supportedBase).toBe(54.00);
      expect(supportedBase).not.toBe(unsupportedBase);
    });

    it('handles higher energy prices when correctiebedrag rises (e.g. correctiebedrag = €35 -> SDE Payment = €5 -> Buyer pays €50)', () => {
      const highGasSdeParams: SdePlusPlusTerms = {
        ...contractSdeParams,
        correctiebedrag: 35.00,
      };
      const result = calculateSdePlusPlusPrice(highGasSdeParams);

      // SDE Payment = 55 - max(35, 15) - 15 = 55 - 35 - 15 = 5 €/MWh
      expect(result.sdePaymentEurPerMWh).toBe(5.00);

      // Supported Price = 54 + 1 - 5 = 50 €/MWh from Buyer
      expect(result.supportedPriceEurPerMWh).toBe(50.00);
      expect(result.totalSellerCertificateRevenueEurPerMWh).toBe(55.00);
    });
  });

  // --------------------------------------------------------------------------
  // 3. HHV (GROSS) VS LHV (NET) HEATING VALUE CONVERSIONS
  // --------------------------------------------------------------------------
  describe('3. HHV vs LHV Heating Value Harmonization', () => {
    it('correctly applies standard European 0.901 conversion factor between Gross HHV and Net LHV', () => {
      const grossVolumeMwh = 10000;
      const netVolumeMwh = convertHhvToLhv(grossVolumeMwh);
      expect(netVolumeMwh).toBe(9010.0);

      const recoveredGross = convertLhvToHhv(netVolumeMwh);
      expect(recoveredGross).toBeCloseTo(10000, 0);
      expect(HHV_TO_LHV_FACTOR).toBe(0.901);
    });
  });

  // --------------------------------------------------------------------------
  // 4. DUAL-LEG DECOUPLED PRICING & FULL DEAL VALUATION
  // --------------------------------------------------------------------------
  describe('4. Dual-Leg Decoupled Valuation & Invoicing Settlement', () => {
    it('verifies that DEFAULT_INSTITUTIONAL_OFFTAKE contains only contract terms and nulls for market data', () => {
      // Contract terms stated in the document:
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg.ciSlider.basePriceEurPerMWh).toBe(53.00);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg.ciSlider.baseCarbonIntensity).toBe(-20.0);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg.ciSlider.ciMultiplierAlpha).toBe(0.65);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg.ciSlider.minCarbonIntensityFloor).toBe(-100.0);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg.ciSlider.maxCarbonIntensityCeiling).toBe(0.0);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.physicalGasLeg.indexDiscountFactor).toBe(0.99);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg.minimumGoValidityMonths).toBe(6);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.flowProfile.estimatedAnnualVolumeMinMWh).toBe(40000);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.flowProfile.estimatedAnnualVolumeMaxMWh).toBe(55000);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.flowProfile.maximumDeliveryVolumeMWh).toBe(55000);
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.flowProfile.maximumHourlyFlowMWhPerHour).toBe(6.5);

      // Market observations must default to null (Rule 1):
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.physicalGasLeg.marketBenchmarkPriceEurPerMWh).toBeNull();
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.physicalGasLeg.entryCapacityBookingCostEurPerMWh).toBeNull();
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.physicalGasLeg.shipperNominationFeeEurPerMWh).toBeNull();
      expect(DEFAULT_INSTITUTIONAL_OFFTAKE.flowProfile.deliveryTolerancePercent).toBeNull();
    });

    it('accurately evaluates decoupled physical molecule and environmental certificate legs when TTF mark is supplied', () => {
      // Pass observed TTF mark €33.50/MWh
      const result = calculateDualLegOfftake(DEFAULT_INSTITUTIONAL_OFFTAKE, 33.50);

      // Physical Leg: 0.99 * 33.50 = 33.165 -> ~33.17 €/MWh
      expect(result.physicalGasPriceEurPerMWh).toBeCloseTo(33.17, 1);
      expect(result.physicalDeliveredNetCostEurPerMWh).toBeCloseTo(33.17, 1); // unentered fees default to 0

      // Certificate Leg (Unsupported): Base €53.00 + (0.65 * (-20 - (-50))) = 53 + 19.50 = €72.50/MWh
      expect(result.baseCertificatePriceEurPerMWh).toBe(53.00);
      expect(result.ciSliderAdjustmentEurPerMWh).toBe(19.50);
      expect(result.finalCertificatePriceEurPerMWh).toBe(72.50);

      // Combined Offtake Price (Unsupported): 33.17 + 72.50 = ~105.67 €/MWh
      expect(result.totalDeliveredOfftakePriceEurPerMWh).toBeCloseTo(105.66, 0);

      // SDE++ Supported Mode Breakdown:
      // SDE Payment = €20/MWh, Supported Certificate Price = €35/MWh, Total Seller Income = €55/MWh
      expect(result.sdePaymentFromRvoEurPerMWh).toBe(20.00);
      expect(result.supportedCertificatePriceEurPerMWh).toBe(35.00);
      expect(result.totalSellerCertificateRevenueEurPerMWh).toBe(55.00);

      // LHV Volume Range
      expect(result.volumeNetMinMWhLhv).toBe(36040); // 40,000 * 0.901
      expect(result.volumeNetMaxMWhLhv).toBe(49555); // 55,000 * 0.901
    });

    it('returns null for physical leg and flags gasIndex in missingInputs when no TTF mark is supplied', () => {
      const result = calculateDualLegOfftake(DEFAULT_INSTITUTIONAL_OFFTAKE, null);

      expect(result.physicalGasPriceEurPerMWh).toBeNull();
      expect(result.physicalDeliveredNetCostEurPerMWh).toBeNull();
      expect(result.totalDeliveredOfftakePriceEurPerMWh).toBeNull();
      expect(result.missingInputs).toContain('gasIndex');

      // Certificate leg still prices accurately from contract terms:
      expect(result.finalCertificatePriceEurPerMWh).toBe(72.50);
    });
  });
});
