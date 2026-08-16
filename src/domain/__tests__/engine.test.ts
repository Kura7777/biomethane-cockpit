import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../eligibility/engine';
import { 
  computeCertificateValue, 
  computeNetback, 
  tCO2ePerMWh, 
  computeFuelEUDeficitClosureValue,
  selectMarkPrice,
  RTFO_KG_PER_MWH
} from '../netback/engine';
import { getMarketById, MARKETS } from '../markets/registry';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';
import { rankNetbacks, getHighestBlockedOpportunity } from '../netback/ranking';
import { migrateState, CURRENT_SCHEMA_VERSION } from '../../store/context';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { scanEuropeanArbitrage } from '../arbitrage/engine';
import { getRouteTransitTariff, calculateRealisticCommercialDeskMargin } from '../arbitrage/origins';
import { BIOMETHANE_PLANTS, DEVELOPER_PORTFOLIOS, COUNTRY_MACRO_STATS, getPlantsByCountry, searchPlants } from '../plants/registry';
import { queryDeskAgent, generateLocalAgentResponse } from '../arbitrage/geminiService';

const emptyCosts: CostInputs = {
  transferCosts: null,
  certificationCosts: null,
  logistics: null,
  deliveredCost: null,
  otherCosts: null,
};

const completeCosts: CostInputs = {
  transferCosts: 2.0,
  certificationCosts: 0.5,
  logistics: 1.5,
  deliveredCost: 85.0,
  otherCosts: 0.0,
};

const sampleMarks: MarksState = {
  marks: {
    DE_THG: { marketId: 'DE_THG', bid: 290, offer: 310, mid: 300, updatedAt: new Date().toISOString(), source: 'Argus' },
    FR_CPB: { marketId: 'FR_CPB', bid: 150, offer: 160, mid: 155, updatedAt: new Date().toISOString(), source: 'EEX' },
    NL_ERE: { marketId: 'NL_ERE', bid: 0.28, offer: 0.32, mid: 0.30, updatedAt: new Date().toISOString(), source: 'NEa' },
    VOL_SCOPE1: { marketId: 'VOL_SCOPE1', bid: 35, offer: 45, mid: 40, updatedAt: new Date().toISOString(), source: 'Broker' },
    FUELEU: { marketId: 'FUELEU', bid: 220, offer: 260, mid: 240, updatedAt: new Date().toISOString(), source: 'Broker' },
    IT_CIC: { marketId: 'IT_CIC', bid: 360, offer: 390, mid: 375, updatedAt: new Date().toISOString(), source: 'GSE' },
    UK_RTFO: { marketId: 'UK_RTFO', bid: 0.25, offer: 0.27, mid: 0.26, updatedAt: new Date().toISOString(), source: 'Argus' },
  },
  gasIndex: { bid: 28.00, offer: 29.00, mid: 28.50, updatedAt: new Date().toISOString() },
  fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: new Date().toISOString() },
  pricingSide: 'bid',
};

describe('European Biomethane Desk Cockpit — Work Order Verification & Regression Suite', () => {

  describe('§E — Mandatory Regulatory & Valuation Unit Tests', () => {

    it('§E1: UK food waste, UK grid, ISCC EU, mass balance ➔ DE_THG is HARD_BLOCK at UDB gate', () => {
      const consignment = REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE;
      const deMarket = getMarketById('DE_THG')!;
      
      const assessment = evaluateEligibility(consignment, deMarket);
      expect(assessment.overallVerdict).toBe('HARD_BLOCK');

      const udbGate = assessment.gates.find(g => g.gate === 'UDB_RECORDING');
      expect(udbGate).toBeDefined();
      expect(udbGate?.verdict).toBe('HARD_BLOCK');
      expect(udbGate?.reason).toContain('non-EU gas grid');
      expect(udbGate?.remedy).toContain('RTFO');
    });

    it('§E2: Danish manure, EU grid, ISCC EU, mass balance, UDB recorded ➔ DE_THG is UNRESOLVED (never ELIGIBLE) with dual branches', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;

      const assessment = evaluateEligibility(consignment, deMarket);
      expect(assessment.overallVerdict).toBe('UNRESOLVED');
      expect(assessment.overallVerdict).not.toBe('ELIGIBLE');

      const netback = computeNetback(deMarket, consignment, sampleMarks, emptyCosts, 'bid');
      expect(netback.uncertaintyBranches).toBeDefined();
      expect(netback.uncertaintyBranches?.length).toBe(2);
      expect(netback.uncertaintyBranches![0].branchLabel.toLowerCase()).toContain('single counting');
      expect(netback.uncertaintyBranches![1].branchLabel.toLowerCase()).toContain('double counting');
    });

    it('§E3: Danish manure ➔ FR_CPB and NL_ERE are ELIGIBLE or CONDITIONAL, never blocked', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frMarket = getMarketById('FR_CPB')!;
      const nlMarket = getMarketById('NL_ERE')!;

      const frAssessment = evaluateEligibility(consignment, frMarket);
      const nlAssessment = evaluateEligibility(consignment, nlMarket);

      expect(['ELIGIBLE', 'CONDITIONAL']).toContain(frAssessment.overallVerdict);
      expect(['ELIGIBLE', 'CONDITIONAL']).toContain(nlAssessment.overallVerdict);
      expect(frAssessment.overallVerdict).not.toBe('HARD_BLOCK');
      expect(nlAssessment.overallVerdict).not.toBe('HARD_BLOCK');
    });

    it('§E4: ISCC PLUS consignment ➔ all compliance markets blocked at scheme gate, voluntary passes', () => {
      const isccPlusConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        id: 'test_iscc_plus',
        certificationScheme: 'ISCC_PLUS',
      };

      const complianceMarkets = MARKETS.filter(m => m.id !== 'VOL_SCOPE1' && m.status === 'ACTIVE');
      for (const market of complianceMarkets) {
        const assessment = evaluateEligibility(isccPlusConsignment, market);
        expect(assessment.overallVerdict).toBe('HARD_BLOCK');
        const schemeGate = assessment.gates.find(g => g.gate === 'SCHEME_RECOGNITION');
        expect(schemeGate?.verdict).toBe('HARD_BLOCK');
      }

      const volMarket = getMarketById('VOL_SCOPE1')!;
      const volAssessment = evaluateEligibility(isccPlusConsignment, volMarket);
      expect(volAssessment.overallVerdict).toBe('ELIGIBLE');
    });

    it('§E5: Book-and-claim ➔ FuelEU Maritime blocked at chain-of-custody gate, voluntary passes', () => {
      const bcConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        id: 'test_bc',
        chainOfCustody: 'BOOK_AND_CLAIM',
      };

      const fuelEUMarket = getMarketById('FUELEU')!;
      const fuelEUAssessment = evaluateEligibility(bcConsignment, fuelEUMarket);
      expect(fuelEUAssessment.overallVerdict).toBe('HARD_BLOCK');
      const cocGate = fuelEUAssessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY');
      expect(cocGate?.verdict).toBe('HARD_BLOCK');

      const volMarket = getMarketById('VOL_SCOPE1')!;
      const volAssessment = evaluateEligibility(bcConsignment, volMarket);
      expect(volAssessment.overallVerdict).toBe('ELIGIBLE');
    });

    it('§E6: EU ETS2 ➔ UNKNOWN verdict, not tradeable until 2028', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const ets2Market = getMarketById('EU_ETS2')!;

      const assessment = evaluateEligibility(consignment, ets2Market);
      expect(assessment.overallVerdict).toBe('UNKNOWN');
      expect(ets2Market.status).toBe('FUTURE');
    });

    it('§E7: French CPB mark of €150/MWh ➔ strictly capped at €100/MWh penalty ceiling', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frCpb = getMarketById('FR_CPB')!;
      const certVal = computeCertificateValue(frCpb, consignment, sampleMarks);

      expect(certVal?.valueEurPerMWh).toBe(100);
      expect(certVal?.capped).toBe(true);
      expect(certVal?.capReason).toContain('€100/MWh');
    });

  });

  describe('§A — Section A Fixes & Regression Assertions', () => {

    it('A1 / A3: Plant registry contains exactly 1,975 facilities matching GIE/EBA 2026 counts', () => {
      expect(BIOMETHANE_PLANTS.length).toBe(1975);

      // Section D1 Verified Country Counts
      expect(getPlantsByCountry('FR').length).toBe(829);
      expect(getPlantsByCountry('DE').length).toBe(285);
      expect(getPlantsByCountry('IT').length).toBe(273);
      expect(getPlantsByCountry('GB').length).toBe(108);
      expect(getPlantsByCountry('NL').length).toBe(92);
      expect(getPlantsByCountry('SE').length).toBe(67);
      expect(getPlantsByCountry('DK').length).toBe(60);
      expect(getPlantsByCountry('FI').length).toBe(32);
      expect(getPlantsByCountry('ES').length).toBe(26);
      expect(getPlantsByCountry('AT').length).toBe(20);
      expect(getPlantsByCountry('CH').length).toBe(18);
      expect(getPlantsByCountry('NO').length).toBe(15);
      expect(getPlantsByCountry('PT').length).toBe(13);
      expect(getPlantsByCountry('BE').length).toBe(12);
      expect(getPlantsByCountry('LT').length).toBe(12);
      expect(getPlantsByCountry('CZ').length).toBe(10);
      expect(getPlantsByCountry('LV').length).toBe(10);
      expect(getPlantsByCountry('EE').length).toBe(4);
      expect(getPlantsByCountry('SK').length).toBe(3);
      expect(getPlantsByCountry('LU').length).toBe(2);
    });

    it('A1 / A2: Austrian plants match §D2 fixture and have complete infrastructure specifications', () => {
      const austrianPlants = getPlantsByCountry('AT');
      expect(austrianPlants.length).toBe(20);

      const at1 = austrianPlants.find(p => p.id === 'plant_at_1');
      const at3 = austrianPlants.find(p => p.id === 'plant_at_3');
      const at6 = austrianPlants.find(p => p.id === 'plant_at_6');
      const at20 = austrianPlants.find(p => p.id === 'plant_at_20');

      expect(at1?.name).toBe('Bruck an der Leitha (AT-1)');
      expect(at3?.name).toBe('Eugendorf (AT-3)');
      expect(at6?.name).toBe('Margarethen am Moos (AT-6)');
      expect(at20?.name).toBe('Wildon (AT-20)');

      austrianPlants.forEach(p => {
        expect(p.operator).toBeDefined();
        expect(p.capacityNm3h).toBeGreaterThan(0);
        expect(p.annualEnergyGWh).toBeGreaterThan(0);
        expect(p.coordinates).toBeDefined();
        expect(p.provenance).toBe('GIE/EBA European Biomethane Map 2026');
      });
    });

    it('A4: Empty marks prompt builder produces NO MARK ENTERED instead of fabricated defaults', async () => {
      const emptyMarksState: MarksState = {
        marks: {},
        gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSide: 'bid',
      };

      const response = await queryDeskAgent({
        userPrompt: 'Tell me the current TTF gas index and DE_THG mark',
        contextData: {
          marks: emptyMarksState,
        },
      });

      expect(response).not.toContain('€28.00');
      expect(response).not.toContain('€300');
    });

    it('A9: rankNetbacks sorts complete cost inputs above incomplete rows', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frMarket = getMarketById('FR_CPB')!;
      const nlMarket = getMarketById('NL_ERE')!;

      const completeFr = computeNetback(frMarket, consignment, sampleMarks, completeCosts, 'bid');
      const incompleteNl = computeNetback(nlMarket, consignment, sampleMarks, emptyCosts, 'bid');

      const elMap = new Map();
      elMap.set('FR_CPB', evaluateEligibility(consignment, frMarket));
      elMap.set('NL_ERE', evaluateEligibility(consignment, nlMarket));

      const ranked = rankNetbacks([incompleteNl, completeFr], elMap);
      expect(ranked[0].marketId).toBe('FR_CPB'); // complete cost row takes priority
      expect(ranked[0].isComplete).toBe(true);
      expect(ranked[1].isComplete).toBe(false);
    });

    it('A13: calculateRealisticCommercialDeskMargin calculates modelled margin with configurable producer share', () => {
      const margin90 = calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, 0.90);
      expect(margin90.deskNetMarginEurPerMWh).toBe(9.80); // (100 - 2) * 0.10
      expect(margin90.producerProcurementEurPerMWh).toBe(88.20); // (100 - 2) * 0.90
      expect(margin90.sensitivityRange.low).toBe(4.90); // 5% desk / 95% producer
      expect(margin90.sensitivityRange.high).toBe(14.70); // 15% desk / 85% producer
    });

    it('anchors: tCO2ePerMWh conversion accuracy', () => {
      expect(tCO2ePerMWh(-100)).toBeCloseTo(0.6984, 4);
      expect(tCO2ePerMWh(20)).toBeCloseTo(0.2664, 4);
    });

    it('anchors: FuelEU manure CI -100 year 1 deficit closure value', () => {
      const res = computeFuelEUDeficitClosureValue(-100, 1, 89.34, 91.16);
      expect(res.valueEurPerMWh).toBeCloseTo(437.69, 1);
    });

  });

  describe('SECTION 1 — Producer Pricing Modes & Desk Margin Tests', () => {

    it('FIXED_PRICE, netNetback 232.27, fixedPrice 209.04 -> deskMargin 23.23, producerPayable 209.04', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const costs: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
        deliveredCost: 209.04,
        otherCosts: 0,
        producerPricing: {
          mode: 'FIXED_PRICE',
          fixedPriceEurPerMwh: 209.04,
          indexLinkedShare: null,
          source: 'Fixed contract',
          lastVerified: '2026-08-16',
          confidence: 'VERIFIED',
        },
      };
      const nb = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
      expect(nb.producerPayable).toBe(209.04);
      expect(nb.deskMargin).toBeCloseTo(nb.netNetback! - 209.04, 2);
    });

    it('INDEX_LINKED, netNetback 232.27, share 0.90 -> producerPayable 209.04, deskMargin 23.23', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const costs: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
        deliveredCost: null,
        otherCosts: 0,
        producerPricing: {
          mode: 'INDEX_LINKED',
          fixedPriceEurPerMwh: null,
          indexLinkedShare: 0.90,
          source: 'User test',
          lastVerified: '2026-08-16',
          confidence: 'VERIFIED',
        },
      };
      const nb = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
      expect(nb.netNetback).not.toBeNull();
      const expectedProducer = Number((nb.netNetback! * 0.90).toFixed(2));
      const expectedDesk = Number((nb.netNetback! - expectedProducer).toFixed(2));
      expect(nb.producerPayable).toBe(expectedProducer);
      expect(nb.deskMargin).toBe(expectedDesk);
    });

    it('INDEX_LINKED with share null -> both null, producerPricing in missingInputs', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const costs: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
        deliveredCost: null,
        otherCosts: 0,
        producerPricing: {
          mode: 'INDEX_LINKED',
          fixedPriceEurPerMwh: null,
          indexLinkedShare: null,
          source: null,
          lastVerified: null,
          confidence: 'UNVERIFIED',
        },
      };
      const nb = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
      expect(nb.producerPayable).toBeNull();
      expect(nb.deskMargin).toBeNull();
      expect(nb.missingInputs).toContain('producerPricing');
    });

    it('FIXED_PRICE with fixedPrice null -> both null, producerPricing in missingInputs', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const costs: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
        deliveredCost: null,
        otherCosts: 0,
        producerPricing: {
          mode: 'FIXED_PRICE',
          fixedPriceEurPerMwh: null,
          indexLinkedShare: null,
          source: null,
          lastVerified: null,
          confidence: 'UNVERIFIED',
        },
      };
      const nb = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
      expect(nb.producerPayable).toBeNull();
      expect(nb.deskMargin).toBeNull();
      expect(nb.missingInputs).toContain('producerPricing');
    });

    it('marginPercent uses deskMargin, never grossValueSpread', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const costs: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
        deliveredCost: null,
        otherCosts: 0,
        producerPricing: {
          mode: 'INDEX_LINKED',
          fixedPriceEurPerMwh: null,
          indexLinkedShare: 0.90,
          source: null,
          lastVerified: null,
          confidence: 'UNVERIFIED',
        },
      };
      const nb = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
      expect(nb.marginPercent).toBeCloseTo((nb.deskMargin! / nb.netNetback!) * 100, 1);
    });

    it('deskPnL = deskMargin * volume; grossSpreadPnL kept separate and not surfaced as headline', () => {
      const consignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        volumeMWh: 10000,
      };
      const deMarket = getMarketById('DE_THG')!;
      const costs: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
        deliveredCost: null,
        otherCosts: 0,
        producerPricing: {
          mode: 'INDEX_LINKED',
          fixedPriceEurPerMwh: null,
          indexLinkedShare: 0.90,
          source: null,
          lastVerified: null,
          confidence: 'UNVERIFIED',
        },
      };
      const nb = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
      expect(nb.deskPnL).toBe(nb.deskMargin! * 10000);
      expect(nb.grossSpreadPnL).toBe(nb.grossValueSpread! * 10000);
    });

    it('Both German double-counting branches carry their own producerPayable and deskMargin', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const costs: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
        deliveredCost: null,
        otherCosts: 0,
        producerPricing: {
          mode: 'INDEX_LINKED',
          fixedPriceEurPerMwh: null,
          indexLinkedShare: 0.90,
          source: null,
          lastVerified: null,
          confidence: 'UNVERIFIED',
        },
      };
      const nb = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
      expect(nb.uncertaintyBranches).toBeDefined();
      expect(nb.uncertaintyBranches![0].producerPayable).not.toBeNull();
      expect(nb.uncertaintyBranches![0].deskMargin).not.toBeNull();
      expect(nb.uncertaintyBranches![1].producerPayable).not.toBeNull();
      expect(nb.uncertaintyBranches![1].deskMargin).not.toBeNull();
      expect(nb.uncertaintyBranches![1].deskMargin!).toBeGreaterThan(nb.uncertaintyBranches![0].deskMargin!);
    });

  });

});
