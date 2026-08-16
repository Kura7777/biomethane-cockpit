import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../eligibility/engine';
import { computeCertificateValue, computeNetback, tCO2ePerMWh } from '../netback/engine';
import { getMarketById, MARKETS } from '../markets/registry';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';
import { rankNetbacks, getHighestBlockedOpportunity } from '../netback/ranking';

const emptyCosts: CostInputs = {
  transferCosts: null,
  certificationCosts: null,
  logistics: null,
  deliveredCost: null,
  otherCosts: null,
};

const sampleMarks: MarksState = {
  marks: {
    DE_THG: { bid: 300, offer: 300, mid: 300 },
    FR_CPB: { bid: 150, offer: 150, mid: 150 }, // Above €100 cap
    NL_ERE: { bid: 0.30, offer: 0.30, mid: 0.30 },
    VOL_SCOPE1: { bid: 40, offer: 40, mid: 40 },
    FUELEU: { bid: 220, offer: 220, mid: 220 },
  },
  gasIndex: { bid: 28.50, offer: 28.50, mid: 28.50 },
  fx: { gbpEur: 1.18, chfEur: 1.06 },
};

describe('Biomethane Trading Cockpit — Acceptance Criteria Tests', () => {

  describe('Eligibility Engine Acceptance Criteria', () => {
    
    it('Scenario 1: UK origin, food waste, injected UK grid, ISCC EU, mass balance -> blocked at UDB, not scheme', () => {
      const consignment: Consignment = {
        id: 'uk_food_waste',
        name: 'UK Food Waste',
        originCountry: 'GB',
        originCountryName: 'United Kingdom',
        feedstock: 'food_waste',
        feedstockName: 'Bio-waste (food waste)',
        annexClassification: 'IX_A',
        carbonIntensity: 20,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'GB',
        injectionIsEU: false,
        udbStatus: 'NOT_RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 5000,
      };

      const deMarket = getMarketById('DE_THG')!;
      const result = evaluateEligibility(consignment, deMarket);

      expect(result.overallVerdict).toBe('HARD_BLOCK');
      expect(result.blockingGate).toBe('UDB_RECORDING');

      // Scheme gate must PASS
      const schemeGate = result.gates.find(g => g.gate === 'SCHEME_RECOGNITION');
      expect(schemeGate?.verdict).toBe('PASS');

      // UDB gate must fail with explicit reason distinguishing scheme vs injection location
      const udbGate = result.gates.find(g => g.gate === 'UDB_RECORDING');
      expect(udbGate?.verdict).toBe('HARD_BLOCK');
      expect(udbGate?.reason).toContain('ISCC EU certification is NOT the issue');
      expect(udbGate?.reason).toContain('non-EU gas grid');
    });

    it('Scenario 2: Danish manure, EU grid, ISCC EU, mass balance, UDB recorded -> Germany returns UNRESOLVED, never ELIGIBLE', () => {
      const consignment: Consignment = {
        id: 'dk_manure',
        name: 'Danish Manure',
        originCountry: 'DK',
        originCountryName: 'Denmark',
        feedstock: 'manure',
        feedstockName: 'Animal manure and slurry',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'DK',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
      };

      const deMarket = getMarketById('DE_THG')!;
      const result = evaluateEligibility(consignment, deMarket);

      expect(result.overallVerdict).toBe('UNRESOLVED');
      const marketGate = result.gates.find(g => g.gate === 'MARKET_SPECIFIC');
      expect(marketGate?.verdict).toBe('UNRESOLVED');
      expect(marketGate?.reason).toContain('Double counting is a POLICY MULTIPLIER');
      expect(marketGate?.reason).toContain('negative carbon intensity is a property of the GHG CALCULATION');
    });

    it('Scenario 3: Same Danish consignment is ELIGIBLE or CONDITIONAL for French CPB and Dutch ERE', () => {
      const consignment: Consignment = {
        id: 'dk_manure',
        name: 'Danish Manure',
        originCountry: 'DK',
        originCountryName: 'Denmark',
        feedstock: 'manure',
        feedstockName: 'Animal manure and slurry',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'DK',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
      };

      const frCpb = getMarketById('FR_CPB')!;
      const nlEre = getMarketById('NL_ERE')!;

      const frResult = evaluateEligibility(consignment, frCpb);
      const nlResult = evaluateEligibility(consignment, nlEre);

      expect(['ELIGIBLE', 'CONDITIONAL']).toContain(frResult.overallVerdict);
      expect(['ELIGIBLE', 'CONDITIONAL']).toContain(nlResult.overallVerdict);
    });

    it('Scenario 4: Any ISCC PLUS consignment fails every compliance market at scheme gate, passes voluntary', () => {
      const consignment: Consignment = {
        id: 'iscc_plus_consignment',
        name: 'ISCC PLUS Test',
        originCountry: 'FR',
        originCountryName: 'France',
        feedstock: 'food_waste',
        feedstockName: 'Food Waste',
        annexClassification: 'IX_A',
        carbonIntensity: 20,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_PLUS',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'FR',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 5000,
      };

      const complianceMarkets = ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'AT_EGG', 'SE_TAX', 'FUELEU', 'EU_ETS1'];

      complianceMarkets.forEach(mId => {
        const m = getMarketById(mId)!;
        const res = evaluateEligibility(consignment, m);
        expect(res.overallVerdict).toBe('HARD_BLOCK');
        const schemeGate = res.gates.find(g => g.gate === 'SCHEME_RECOGNITION');
        expect(schemeGate?.verdict).toBe('HARD_BLOCK');
        expect(schemeGate?.reason).toContain('NOT recognised by the European Commission under RED III');
      });

      // Passes voluntary Scope 1
      const volMarket = getMarketById('VOL_SCOPE1')!;
      const volRes = evaluateEligibility(consignment, volMarket);
      expect(volRes.overallVerdict).toBe('ELIGIBLE');
    });

    it('Scenario 5: Book-and-claim fails FuelEU Maritime, passes voluntary', () => {
      const consignment: Consignment = {
        id: 'book_claim_consignment',
        name: 'Book and Claim Test',
        originCountry: 'NL',
        originCountryName: 'Netherlands',
        feedstock: 'manure',
        feedstockName: 'Manure',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'BOOK_AND_CLAIM',
        injectionCountry: 'NL',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 5000,
      };

      const fueleu = getMarketById('FUELEU')!;
      const resFuelEU = evaluateEligibility(consignment, fueleu);
      expect(resFuelEU.overallVerdict).toBe('HARD_BLOCK');
      expect(resFuelEU.blockingGate).toBe('CHAIN_OF_CUSTODY');

      const vol = getMarketById('VOL_SCOPE1')!;
      const resVol = evaluateEligibility(consignment, vol);
      expect(resVol.overallVerdict).toBe('ELIGIBLE');
    });

    it('Scenario 6: EU ETS2 always returns UNKNOWN and not-tradeable until 2028', () => {
      const consignment: Consignment = {
        id: 'test',
        name: 'Test',
        originCountry: 'DE',
        originCountryName: 'Germany',
        feedstock: 'manure',
        feedstockName: 'Manure',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'DE',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 5000,
      };

      const ets2 = getMarketById('EU_ETS2')!;
      const res = evaluateEligibility(consignment, ets2);
      expect(res.overallVerdict).toBe('UNKNOWN');
      expect(res.summary).toContain('cannot be fully determined');
      const marketGate = res.gates.find(g => g.gate === 'MARKET_SPECIFIC');
      expect(marketGate?.reason).toContain('postponed to 2028');
    });
  });

  describe('Netback Engine Acceptance Criteria', () => {

    it('Scenario 7: tCO2e_per_MWh formula precision verification', () => {
      const manureFactor = tCO2ePerMWh(-100);
      const wasteFactor = tCO2ePerMWh(20);

      // (94 - -100) * 3600 / 1e6 = 194 * 3600 / 1e6 = 0.6984
      expect(manureFactor).toBeCloseTo(0.6984, 4);

      // (94 - 20) * 3600 / 1e6 = 74 * 3600 / 1e6 = 0.2664
      expect(wasteFactor).toBeCloseTo(0.2664, 4);

      // 2.6x difference from feedstock alone
      const ratio = manureFactor / wasteFactor;
      expect(ratio).toBeCloseTo(2.6216, 2);
    });

    it('Scenario 8: German certificate value at CI -100 and €300/t mark ≈ €209.52/MWh, DC returns ~2x and both branches present', () => {
      const consignment: Consignment = {
        id: 'dk_manure',
        name: 'Danish Manure',
        originCountry: 'DK',
        originCountryName: 'Denmark',
        feedstock: 'manure',
        feedstockName: 'Manure',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'DK',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
      };

      const deMarket = getMarketById('DE_THG')!;
      const netback = computeNetback(deMarket, consignment, sampleMarks, emptyCosts);

      // 0.6984 * 300 = 209.52
      expect(netback.certificateValue?.valueEurPerMWh).toBeCloseTo(209.52, 1);

      // Verify both DC branches
      expect(netback.uncertaintyBranches).toBeDefined();
      expect(netback.uncertaintyBranches?.length).toBe(2);

      const branchOff = netback.uncertaintyBranches![0];
      const branchOn = netback.uncertaintyBranches![1];

      expect(branchOff.branchId).toBe('DC_OFF');
      expect(branchOn.branchId).toBe('DC_ON');

      expect(branchOff.certificateValue.valueEurPerMWh).toBeCloseTo(209.52, 1);
      expect(branchOn.certificateValue.valueEurPerMWh).toBeCloseTo(419.04, 1);
      expect(branchOn.certificateValue.valueEurPerMWh! / branchOff.certificateValue.valueEurPerMWh!).toBeCloseTo(2.0, 1);
    });

    it('Scenario 9: French CPB netback is capped at €100/MWh regardless of mark entered', () => {
      const consignment: Consignment = {
        id: 'fr_agro',
        name: 'French Agro Biomethane',
        originCountry: 'FR',
        originCountryName: 'France',
        feedstock: 'agricultural_residues',
        feedstockName: 'Straw',
        annexClassification: 'IX_A',
        carbonIntensity: 18,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'FR',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
      };

      const frCpb = getMarketById('FR_CPB')!;
      // sampleMarks has FR_CPB at 150 (above 100 cap)
      const certVal = computeCertificateValue(frCpb, consignment, sampleMarks);

      expect(certVal?.valueEurPerMWh).toBe(100);
      expect(certVal?.capped).toBe(true);
      expect(certVal?.capReason).toContain('French CPB penalty ceiling');
    });

    it('Scenario 10: Market with no mark returns null, never zero', () => {
      const consignment: Consignment = {
        id: 'test',
        name: 'Test',
        originCountry: 'AT',
        originCountryName: 'Austria',
        feedstock: 'manure',
        feedstockName: 'Manure',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'AT',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
      };

      const emptyMarks: MarksState = {
        marks: {},
        gasIndex: { bid: null, offer: null, mid: null },
        fx: { gbpEur: null, chfEur: null },
      };

      const atMarket = getMarketById('AT_EGG')!;
      const certVal = computeCertificateValue(atMarket, consignment, emptyMarks);
      const netback = computeNetback(atMarket, consignment, emptyMarks, emptyCosts);

      expect(certVal).toBeNull();
      expect(netback.netNetback).toBeNull();
      expect(netback.netNetback).not.toBe(0);
    });

    it('Scenario 11: Ranking UK reference consignment returns Germany as not tradeable, with blocking reason and non-null theoretical netback', () => {
      const consignment: Consignment = {
        id: 'uk_ref',
        name: 'UK Reference Consignment',
        originCountry: 'GB',
        originCountryName: 'United Kingdom',
        feedstock: 'food_waste',
        feedstockName: 'Food waste',
        annexClassification: 'IX_A',
        carbonIntensity: 20,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'GB',
        injectionIsEU: false,
        udbStatus: 'NOT_RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
      };

      const deMarket = getMarketById('DE_THG')!;
      const el = evaluateEligibility(consignment, deMarket);
      const nb = computeNetback(deMarket, consignment, sampleMarks, emptyCosts);

      const elMap = new Map([[deMarket.id, el]]);
      const ranked = rankNetbacks([nb], elMap);

      expect(ranked[0].eligibilityVerdict).toBe('HARD_BLOCK');
      expect(ranked[0].rank).toBe(0); // not tradeable -> rank 0
      expect(ranked[0].netNetback).toBeGreaterThan(0); // theoretical netback calculated
    });

  });

});
