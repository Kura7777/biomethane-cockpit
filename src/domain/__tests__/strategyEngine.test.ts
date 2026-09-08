import { describe, it, expect } from 'vitest';
import { evaluatePlantCommercialStrategies } from '../valuation/strategyEngine';
import { BiomethanePlant } from '../plants/types';

describe('STRATEGY VALUATION ENGINE — Institutional Biomethane Deals', () => {
  const mockPuzzleDonderen: BiomethanePlant = {
    id: 'plant_nl_puzzle',
    name: 'Puzzle Donderen Biomethane Installation',
    country: 'Netherlands',
    countryCode: 'NL',
    countryFlag: '🇳🇱',
    provenance: 'Institutional Term Sheet / VertiCer',
    annualEnergyGWh: 45.0,
    capacityNm3h: 650,
    primaryFeedstockCategory: 'Manure & Slurry',
    feedstockDetails: 'Swine manure and agricultural waste (Annex IX-A)',
    verifiedCarbonIntensity: -60.0,
    networkOperator: 'Enexis / GTS',
    upgradingTechnology: 'Membrane separation',
    supportScheme: 'SDE++',
    status: 'Active',
  };

  const mockGermanEnergyCrops: BiomethanePlant = {
    id: 'plant_de_maize',
    name: 'Güstrow Agro Biogas',
    country: 'Germany',
    countryCode: 'DE',
    countryFlag: '🇩🇪',
    provenance: 'dena Biogasregister',
    annualEnergyGWh: 50.0,
    capacityNm3h: 700,
    primaryFeedstockCategory: 'Energy crops',
    feedstockDetails: 'Maize silage and whole-crop rye',
    verifiedCarbonIntensity: 42.0, // High CI (+42)
    networkOperator: 'ONTRAS',
    upgradingTechnology: 'Amine wash',
    supportScheme: 'EEG',
    status: 'Active',
  };

  it('evaluates Dutch swine manure plant against all strategies', () => {
    const result = evaluatePlantCommercialStrategies(mockPuzzleDonderen, {
      ttfDayAheadEurMwh: 35.00,
      germanThgQuoteEurPerTonne: 125.00,
      dutchHbeAEurMwh: 75.00,
    });

    expect(result.plant.name).toBe('Puzzle Donderen Biomethane Installation');
    expect(result.domesticSubsidyBaseline.schemeName).toContain('SDE++');
    expect(result.domesticSubsidyBaseline.strikePriceEurMwh).toBe(88.50);

    // Verify all strategies are evaluated
    expect(result.evaluations.length).toBeGreaterThanOrEqual(5);

    // German THG should be eligible and highly profitable
    const deThg = result.evaluations.find(e => e.strategyId === 'DE_THG_TRANSPORT');
    expect(deThg).toBeDefined();
    expect(deThg!.isEligible).toBe(true);
    expect(deThg!.recommendedBidToProducerEurMwh).toBeGreaterThan(result.domesticSubsidyBaseline.strikePriceEurMwh);
    expect(deThg!.netDeskMarginEurPerMWh).toBeGreaterThanOrEqual(3.00);

    // Dutch HBE-A should be eligible for Annex IX-A manure
    const nlRev = result.evaluations.find(e => e.strategyId === 'NL_REV_TRANSPORT');
    expect(nlRev).toBeDefined();
    expect(nlRev!.isEligible).toBe(true);

    // Winning strategy should beat the SDE++ baseline
    expect(result.winningStrategy.annualDeskPnLEur).toBeGreaterThan(100000);
    expect(result.commercialPitchSummary.producerOfferSummary).toContain('€');
  });

  it('correctly gates high-CI energy crops out of transport and routes them to Voluntary / ETS', () => {
    const result = evaluatePlantCommercialStrategies(mockGermanEnergyCrops, {
      ttfDayAheadEurMwh: 35.00,
      euEtsEuaEurPerTonne: 75.00,
      voluntaryGoPremiumEurMwh: 3.50,
    });

    // German transport should be marked ineligible (CI 42 > 32.9)
    const deThg = result.evaluations.find(e => e.strategyId === 'DE_THG_TRANSPORT');
    expect(deThg!.isEligible).toBe(false);
    expect(deThg!.ineligibilityReason).toContain('fails RED III 65%');

    // Voluntary Corporate Scope 1 MUST be eligible regardless of CI
    const voluntary = result.evaluations.find(e => e.strategyId === 'SUPPORTED_VOLUNTARY_GO');
    expect(voluntary!.isEligible).toBe(true);
    expect(voluntary!.regulatoryNotes[0]).toContain('Exempt from RED III 65%');

    // Winning strategy for crops should be voluntary or supported
    expect(['SUPPORTED_VOLUNTARY_GO', 'EU_ETS_INDUSTRIAL']).toContain(result.winningStrategy.strategyId);
  });

  it('strictly isolates UK RTFO to GB grid assets', () => {
    const nlResult = evaluatePlantCommercialStrategies(mockPuzzleDonderen);
    const ukRtfoForNl = nlResult.evaluations.find(e => e.strategyId === 'UK_RTFO_TRANSPORT');
    expect(ukRtfoForNl!.isEligible).toBe(false);
    expect(ukRtfoForNl!.ineligibilityReason).toContain('Great Britain grid');
  });

  it('differentiates unbundled voluntary GoO from physical compliance deals', () => {
    const res = evaluatePlantCommercialStrategies(mockPuzzleDonderen);
    const voluntary = res.evaluations.find(e => e.strategyId === 'SUPPORTED_VOLUNTARY_GO')!;
    const deThg = res.evaluations.find(e => e.strategyId === 'DE_THG_TRANSPORT')!;

    expect(voluntary.deliveryModel).toBe('UNBUNDLED_CERTIFICATE_ONLY');
    expect(voluntary.transitAndLogisticsEurMwh).toBe(0.00);
    expect(deThg.deliveryModel).toBe('PHYSICAL_AND_CERTIFICATE');
    expect(deThg.transitAndLogisticsEurMwh).toBeGreaterThan(0);

    // When voluntary is winning, eex hedge is 0 MWh
    const voluntaryWinningRes = evaluatePlantCommercialStrategies(mockGermanEnergyCrops, {
      ttfDayAheadEurMwh: 35.00,
      euEtsEuaEurPerTonne: 40.00, // lower EUA so voluntary wins
      voluntaryGoPremiumEurMwh: 4.50,
    });
    if (voluntaryWinningRes.winningStrategy.strategyId === 'SUPPORTED_VOLUNTARY_GO') {
      expect(voluntaryWinningRes.commercialPitchSummary.eexTtfShortHedgeMWh).toBe(0);
      expect(voluntaryWinningRes.commercialPitchSummary.producerOfferSummary).toContain('GoO Certificate Bonus');
    }
  });
});
