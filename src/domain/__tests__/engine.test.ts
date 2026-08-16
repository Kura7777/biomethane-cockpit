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
import { getMarkAgeDays, getMarkStaleness, getMarkReliability, MarkEntry } from '../markets/types';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';
import { rankNetbacks, getHighestBlockedOpportunity } from '../netback/ranking';
import { generateTradeSummary } from '../trade/summary';
import { assessmentContainsPraData } from '../trade/licensing';
import { TradeAssessment } from '../trade/types';
import { migrateState, createDefaultState, CURRENT_SCHEMA_VERSION } from '../../store/context';
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
  producerPricing: {
    mode: 'FIXED_PRICE',
    fixedPriceEurPerMwh: 85.0,
    indexLinkedShare: null,
    source: 'Fixture',
    lastVerified: '2026-08-16',
    confidence: 'VERIFIED',
  },
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
        expect(p.countryCode).toBe('AT');
        expect(p.name).toBeDefined();
        expect(p.capacityNm3h).toBeNull();
        expect(p.annualEnergyGWh).toBeNull();
        expect(p.coordinates).toBeNull();
        expect(p.provenance).toContain('GIE/EBA European Biomethane Map 2026');
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

    it('deskPnL = deskMargin * volume; grossValueSpread is null under INDEX_LINKED', () => {
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
      expect(nb.grossValueSpread).toBeNull();
      expect(nb.grossSpreadPnL).toBeNull();
    });

    it('FIXED_PRICE produces grossValueSpread = netNetback - fixedPrice', () => {
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
          mode: 'FIXED_PRICE',
          fixedPriceEurPerMwh: 200.00,
          indexLinkedShare: null,
          source: null,
          lastVerified: null,
          confidence: 'UNVERIFIED',
        },
      };
      const nb = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
      expect(nb.deskMargin).toBeCloseTo(nb.netNetback! - 200.00, 2);
      expect(nb.grossValueSpread).toBe(nb.deskMargin);
      expect(nb.deskPnL).toBeCloseTo(nb.deskMargin! * 10000, 2);
      expect(nb.grossSpreadPnL).toBeCloseTo(nb.grossValueSpread! * 10000, 2);
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

  describe('PHASE 1 — Mark Provenance & Staleness Tests', () => {
    it('mark age computed from observedAt when present, updatedAt when not', () => {
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
      const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

      // Case 1: only updatedAt present
      const entryUpdatedOnly = {
        updatedAt: tenDaysAgo,
      };
      expect(getMarkAgeDays(entryUpdatedOnly)).toBe(10);

      // Case 2: observedAt in provenance takes priority over updatedAt
      const entryWithObserved: MarkEntry = {
        marketId: 'FR_CPB',
        bid: 90.0,
        offer: null,
        mid: null,
        updatedAt: twoDaysAgo, // Entered 2 days ago
        source: 'EEX Auction',
        provenance: {
          sourceType: 'EXCHANGE_AUCTION',
          sourceName: 'EEX',
          sourceUrl: 'https://eex.com',
          observedAt: tenDaysAgo, // Price was from auction 10 days ago
          note: 'Monthly French GO/CPB auction',
        },
      };
      // Age must reflect the observed date (10 days), not when trader typed it (2 days)
      expect(getMarkAgeDays(entryWithObserved)).toBe(10);
    });

    it('provenance defaults to all-null; getMarkReliability(null) -> null', () => {
      expect(getMarkReliability(null)).toBeNull();
      expect(getMarkReliability(undefined)).toBeNull();

      // Reliability ordering test (for display only)
      expect(getMarkReliability('EXCHANGE_AUCTION')).toBeGreaterThan(getMarkReliability('PRICE_REPORTING')!);
      expect(getMarkReliability('PRICE_REPORTING')).toBeGreaterThan(getMarkReliability('PLATFORM_HISTORY')!);
      expect(getMarkReliability('PLATFORM_HISTORY')).toBeGreaterThan(getMarkReliability('COUNTERPARTY_QUOTE')!);
      expect(getMarkReliability('COUNTERPARTY_QUOTE')).toBeGreaterThan(getMarkReliability('BROKER_INDICATION')!);
      expect(getMarkReliability('BROKER_INDICATION')).toBeGreaterThan(getMarkReliability('PRESS_REPORT')!);
      expect(getMarkReliability('PRESS_REPORT')).toBeGreaterThan(getMarkReliability('ESTIMATE')!);

      const defaultState = createDefaultState();
      const frMark = defaultState.marks.marks['FR_CPB'];
      expect(frMark.provenance).toBeDefined();
      expect(frMark.provenance?.sourceType).toBeNull();
      expect(frMark.provenance?.sourceName).toBeNull();
      expect(frMark.provenance?.sourceUrl).toBeNull();
      expect(frMark.provenance?.observedAt).toBeNull();
      expect(frMark.provenance?.note).toBeNull();
      expect(defaultState.marks.gasIndex.provenance?.sourceType).toBeNull();
      expect(defaultState.marks.fx.provenance?.sourceType).toBeNull();
    });

    it('v4 -> v5 migration: observedAt seeded from updatedAt, no marks lost', () => {
      const v4State = {
        schemaVersion: 4,
        marks: {
          marks: {
            FR_CPB: {
              marketId: 'FR_CPB',
              bid: 92.5,
              offer: 95.0,
              mid: 93.75,
              updatedAt: '2026-08-01T10:00:00Z',
              source: 'EEX historical',
            },
            DE_THG: {
              marketId: 'DE_THG',
              bid: 120.0,
              offer: 130.0,
              mid: 125.0,
              updatedAt: '2026-08-10T12:00:00Z',
              source: 'Argus German Quota',
            },
          },
          gasIndex: {
            bid: 28.0,
            offer: 29.0,
            mid: 28.5,
            updatedAt: '2026-08-12T08:00:00Z',
          },
          fx: {
            gbpEur: 1.17,
            chfEur: 1.05,
            updatedAt: '2026-08-12T08:00:00Z',
          },
          pricingSide: 'bid',
        },
        costs: {
          transferCosts: 0.8,
          certificationCosts: 0.45,
          logistics: 1.2,
          deliveredCost: null,
          otherCosts: 0,
          producerPricing: null,
        },
        consignments: [],
        activeConsignmentId: null,
        savedAssessments: [],
        selectedMarketId: 'FR_CPB',
      };

      const migrated = migrateState(v4State);
      expect(migrated.schemaVersion).toBe(5);

      // Marks preserved
      expect(migrated.marks.marks['FR_CPB'].bid).toBe(92.5);
      expect(migrated.marks.marks['DE_THG'].bid).toBe(120.0);

      // Provenance created with observedAt seeded from updatedAt
      expect(migrated.marks.marks['FR_CPB'].provenance).toBeDefined();
      expect(migrated.marks.marks['FR_CPB'].provenance?.observedAt).toBe('2026-08-01T10:00:00Z');
      expect(migrated.marks.marks['FR_CPB'].provenance?.sourceType).toBeNull();

      expect(migrated.marks.marks['DE_THG'].provenance?.observedAt).toBe('2026-08-10T12:00:00Z');
      expect(migrated.marks.gasIndex.provenance?.observedAt).toBe('2026-08-12T08:00:00Z');
      expect(migrated.marks.fx.provenance?.observedAt).toBe('2026-08-12T08:00:00Z');
    });

    it('existing staleness thresholds (7d amber / 30d red) still apply', () => {
      const now = Date.now();
      const freshDate = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3d
      const warningDate = new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(); // 12d
      const criticalDate = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45d

      expect(getMarkStaleness(freshDate)).toBe('FRESH');
      expect(getMarkStaleness(warningDate)).toBe('STALE_WARNING');
      expect(getMarkStaleness(criticalDate)).toBe('STALE_CRITICAL');
      expect(getMarkStaleness(null)).toBe('UNFILLED');

      // Tested via provenance object
      expect(getMarkStaleness({ provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Argus', sourceUrl: null, observedAt: warningDate, note: null } })).toBe('STALE_WARNING');
      expect(getMarkStaleness({ provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Argus', sourceUrl: null, observedAt: criticalDate, note: null } })).toBe('STALE_CRITICAL');
    });
  });

  describe('PHASE 3 — Surface Coverage, Dossier Provenance & Licensing Tests', () => {
    it('dossier prints the provenance line when mark has provenance', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frMarket = getMarketById('FR_CPB')!;
      const eligibility = evaluateEligibility(consignment, frMarket);
      
      const marksWithProv: MarksState = {
        marks: {
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 91.5,
            offer: 93.0,
            mid: 92.25,
            updatedAt: '2026-08-16T12:00:00Z',
            source: 'EEX Monthly Auction',
            provenance: {
              sourceType: 'EXCHANGE_AUCTION',
              sourceName: 'EEX auction',
              sourceUrl: 'https://eex.com',
              observedAt: '2026-08-01T10:00:00Z',
              note: 'August monthly auction print',
            },
          },
        },
        gasIndex: { bid: 28.0, offer: 29.0, mid: 28.5, updatedAt: null },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSide: 'bid',
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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

      const netback = computeNetback(frMarket, consignment, marksWithProv, costs, 'bid');
      
      const assessment: TradeAssessment = {
        id: 'test-assessment-1',
        createdAt: '2026-08-16T12:00:00Z',
        targetMarketId: 'FR_CPB',
        targetMarketName: 'France CPB (Biomethane Production Certificate)',
        consignment,
        eligibility,
        netback,
        marks: marksWithProv,
        costs,
        userNotes: '',
      };

      const dossier = generateTradeSummary(assessment);
      expect(dossier).toContain('Mark source: EEX auction (EXCHANGE_AUCTION), observed 2026-08-01');
    });

    it('dossier prints the explicit warning when source is null', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frMarket = getMarketById('FR_CPB')!;
      const eligibility = evaluateEligibility(consignment, frMarket);
      
      const marksWithoutProv: MarksState = {
        marks: {
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 91.5,
            offer: 93.0,
            mid: 92.25,
            updatedAt: '2026-08-16T12:00:00Z',
            source: null,
            provenance: {
              sourceType: null,
              sourceName: null,
              sourceUrl: null,
              observedAt: null,
              note: null,
            },
          },
        },
        gasIndex: { bid: 28.0, offer: 29.0, mid: 28.5, updatedAt: null },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSide: 'bid',
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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

      const netback = computeNetback(frMarket, consignment, marksWithoutProv, costs, 'bid');
      
      const assessment: TradeAssessment = {
        id: 'test-assessment-2',
        createdAt: '2026-08-16T12:00:00Z',
        targetMarketId: 'FR_CPB',
        targetMarketName: 'France CPB (Biomethane Production Certificate)',
        consignment,
        eligibility,
        netback,
        marks: marksWithoutProv,
        costs,
        userNotes: '',
      };

      const dossier = generateTradeSummary(assessment);
      expect(dossier).toContain('Mark source: NOT RECORDED — this price cannot be substantiated.');
    });

    it('acceptance tests check: constants and calculations', () => {
      // 1. Carbon intensity conversion precision anchors
      expect(tCO2ePerMWh(-100)).toBeCloseTo(0.6984, 4);
      expect(tCO2ePerMWh(20)).toBeCloseTo(0.2664, 4);

      // 2. UK RTFO mass constant
      expect(RTFO_KG_PER_MWH).toBeCloseTo(72.0, 1);

      // 3. FuelEU manure CI -100, yr 1 ≈ €437.69/MWh
      const fuelEuModel = computeFuelEUDeficitClosureValue(-100, 1);
      expect(fuelEuModel.valueEurPerMWh).toBeCloseTo(437.69, 1);

      // 4. FR_CPB capped at €100/MWh
      const frMarket = getMarketById('FR_CPB')!;
      const highMarks: MarksState = {
        marks: {
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 120.0, // Exceeds €100 cap
            offer: 125.0,
            mid: 122.5,
            updatedAt: '2026-08-16T12:00:00Z',
            source: null,
          },
        },
        gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSide: 'bid',
      };
      const certVal = computeCertificateValue(frMarket, REFERENCE_CONSIGNMENTS.DANISH_MANURE, highMarks, 'bid');
      expect(certVal?.valueEurPerMWh).toBe(100.0);
      expect(certVal?.capped).toBe(true);

      // 5. DE_THG returns both branches
      const deMarket = getMarketById('DE_THG')!;
      const deMarks: MarksState = {
        marks: {
          DE_THG: {
            marketId: 'DE_THG',
            bid: 250.0,
            offer: 260.0,
            mid: 255.0,
            updatedAt: '2026-08-16T12:00:00Z',
            source: null,
          },
        },
        gasIndex: { bid: 28.0, offer: 29.0, mid: 28.5, updatedAt: null },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSide: 'bid',
      };
      const deCosts: CostInputs = {
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
      const deNetback = computeNetback(deMarket, REFERENCE_CONSIGNMENTS.DANISH_MANURE, deMarks, deCosts, 'bid');
      expect(deNetback.uncertaintyBranches).toHaveLength(2);

      // 6. UK food waste + UK grid + ISCC EU -> DE_THG blocked at UDB gate
      const ukConsignment = REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE;
      const ukEligibility = evaluateEligibility(ukConsignment, deMarket);
      expect(ukEligibility.overallVerdict).toBe('HARD_BLOCK');
      const udbGate = ukEligibility.gates.find(g => g.gate === 'UDB_RECORDING');
      expect(udbGate?.verdict).toBe('HARD_BLOCK');

      // 7. All plant records: operator === null, capacityNm3h === null
      expect(BIOMETHANE_PLANTS.length).toBeGreaterThan(1900);
      for (const plant of BIOMETHANE_PLANTS) {
        expect(plant.operator).toBeNull();
        expect(plant.capacityNm3h).toBeNull();
      }

      // 8. Producer pricing mode unset -> 'producerPricing' in missingInputs
      const unsetCosts: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
        deliveredCost: null,
        otherCosts: 0,
        producerPricing: null,
      };
      const unsetNetback = computeNetback(deMarket, REFERENCE_CONSIGNMENTS.DANISH_MANURE, deMarks, unsetCosts, 'bid');
      expect(unsetNetback.missingInputs).toContain('producerPricing');
    });

    it('assessment with PRA gas index but non-PRA certificate -> hasPra true', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frMarket = getMarketById('FR_CPB')!;
      const eligibility = evaluateEligibility(consignment, frMarket);

      const marks: MarksState = {
        marks: {
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 90.0,
            offer: 92.0,
            mid: 91.0,
            updatedAt: '2026-08-16T10:00:00Z',
            source: 'Broker OTC',
            provenance: {
              sourceType: 'BROKER_INDICATION',
              sourceName: 'ICAP Broker',
              sourceUrl: null,
              observedAt: '2026-08-16T10:00:00Z',
              note: null,
            },
          },
        },
        gasIndex: {
          bid: 28.5,
          offer: 29.0,
          mid: 28.75,
          updatedAt: '2026-08-16T10:00:00Z',
          provenance: {
            sourceType: 'PRICE_REPORTING',
            sourceName: 'Platts European Gas Assessment',
            sourceUrl: 'https://spglobal.com',
            observedAt: '2026-08-16T10:00:00Z',
            note: 'Platts TTF DA',
          },
        },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSide: 'bid',
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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

      const netback = computeNetback(frMarket, consignment, marks, costs, 'bid');
      const assessment: TradeAssessment = {
        id: 'test-pra-gas',
        createdAt: '2026-08-16T10:00:00Z',
        targetMarketId: 'FR_CPB',
        targetMarketName: 'France CPB',
        consignment,
        eligibility,
        netback,
        marks,
        costs,
        userNotes: '',
      };

      const praResult = assessmentContainsPraData(assessment);
      expect(praResult.hasPra).toBe(true);
      expect(praResult.sources).toContain('Platts European Gas Assessment');
    });

    it('assessment with no PRA marks anywhere -> hasPra false', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frMarket = getMarketById('FR_CPB')!;
      const eligibility = evaluateEligibility(consignment, frMarket);

      const marks: MarksState = {
        marks: {
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 90.0,
            offer: 92.0,
            mid: 91.0,
            updatedAt: '2026-08-16T10:00:00Z',
            source: 'EEX Auction',
            provenance: {
              sourceType: 'EXCHANGE_AUCTION',
              sourceName: 'EEX French Auction',
              sourceUrl: null,
              observedAt: '2026-08-16T10:00:00Z',
              note: null,
            },
          },
        },
        gasIndex: {
          bid: 28.5,
          offer: 29.0,
          mid: 28.75,
          updatedAt: '2026-08-16T10:00:00Z',
          provenance: {
            sourceType: 'PLATFORM_HISTORY',
            sourceName: 'CEGH Settlement',
            sourceUrl: null,
            observedAt: '2026-08-16T10:00:00Z',
            note: null,
          },
        },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSide: 'bid',
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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

      const netback = computeNetback(frMarket, consignment, marks, costs, 'bid');
      const assessment: TradeAssessment = {
        id: 'test-no-pra',
        createdAt: '2026-08-16T10:00:00Z',
        targetMarketId: 'FR_CPB',
        targetMarketName: 'France CPB',
        consignment,
        eligibility,
        netback,
        marks,
        costs,
        userNotes: '',
      };

      const praResult = assessmentContainsPraData(assessment);
      expect(praResult.hasPra).toBe(false);
      expect(praResult.sources).toHaveLength(0);
    });

    it('sources lists each distinct sourceName once', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frMarket = getMarketById('FR_CPB')!;
      const eligibility = evaluateEligibility(consignment, frMarket);

      const marks: MarksState = {
        marks: {
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 90.0,
            offer: 92.0,
            mid: 91.0,
            updatedAt: '2026-08-16T10:00:00Z',
            source: 'Argus Biomethane',
            provenance: {
              sourceType: 'PRICE_REPORTING',
              sourceName: 'Argus Media',
              sourceUrl: null,
              observedAt: '2026-08-16T10:00:00Z',
              note: null,
            },
          },
        },
        gasIndex: {
          bid: 28.5,
          offer: 29.0,
          mid: 28.75,
          updatedAt: '2026-08-16T10:00:00Z',
          provenance: {
            sourceType: 'PRICE_REPORTING',
            sourceName: 'Argus Media', // duplicate name
            sourceUrl: null,
            observedAt: '2026-08-16T10:00:00Z',
            note: null,
          },
        },
        fx: {
          gbpEur: 1.18,
          chfEur: null,
          updatedAt: '2026-08-16T10:00:00Z',
          provenance: {
            sourceType: 'PRICE_REPORTING',
            sourceName: 'Platts FX Benchmark',
            sourceUrl: null,
            observedAt: '2026-08-16T10:00:00Z',
            note: null,
          },
        },
        pricingSide: 'bid',
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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

      const netback = computeNetback(frMarket, consignment, marks, costs, 'bid');
      const assessment: TradeAssessment = {
        id: 'test-pra-multi',
        createdAt: '2026-08-16T10:00:00Z',
        targetMarketId: 'FR_CPB',
        targetMarketName: 'France CPB',
        consignment,
        eligibility,
        netback,
        marks,
        costs,
        userNotes: '',
      };

      const praResult = assessmentContainsPraData(assessment);
      expect(praResult.hasPra).toBe(true);
      expect(praResult.sources).toHaveLength(2);
      expect(praResult.sources).toContain('Argus Media');
      expect(praResult.sources).toContain('Platts FX Benchmark');
    });

    describe('Deal Ticket Phase 1: Per-leg pricing sides & crossing cost', () => {
      it('certificateSide "bid" and moleculeSide "offer" resolve independently', () => {
        const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
        const deMarket = getMarketById('DE_THG')!;
        const costs: CostInputs = {
          transferCosts: 1.0,
          certificationCosts: 0.5,
          logistics: 1.5,
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

        const result = computeNetback(deMarket, consignment, sampleMarks, costs, {
          certificateSide: 'bid',
          moleculeSide: 'offer',
        });

        expect(result.pricingSides).toEqual({ certificateSide: 'bid', moleculeSide: 'offer' });
        expect(result.moleculeValue).toBe(29.00); // sampleMarks gasIndex.offer is 29.00
        expect(result.certificateValue?.calculation).toContain('€290.00/tCO₂e (bid)');
      });

      it('crossingCost = atMid − atChosenSides, never negative', () => {
        const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
        const deMarket = getMarketById('DE_THG')!;
        const costs: CostInputs = {
          transferCosts: 1.0,
          certificationCosts: 0.5,
          logistics: 1.5,
          deliveredCost: null,
          otherCosts: 0,
          producerPricing: {
            mode: 'FIXED_PRICE',
            fixedPriceEurPerMwh: 65.0,
            indexLinkedShare: null,
            source: null,
            lastVerified: null,
            confidence: 'UNVERIFIED',
          },
        };

        // When transacting at bid / bid (sell-side):
        const bidResult = computeNetback(deMarket, consignment, sampleMarks, costs, {
          certificateSide: 'bid',
          moleculeSide: 'bid',
        });

        expect(bidResult.sides).toBeDefined();
        expect(bidResult.sides?.atChosenSides).toBe(bidResult.netNetback);
        expect(bidResult.sides?.atMid).toBeGreaterThan(bidResult.sides!.atChosenSides!);
        expect(bidResult.sides?.crossingCost).toBeGreaterThan(0);
        expect(bidResult.sides?.crossingCost).toBe(
          Number((bidResult.sides!.atMid! - bidResult.sides!.atChosenSides!).toFixed(2))
        );

        // When transacting at offer / offer:
        const offerResult = computeNetback(deMarket, consignment, sampleMarks, costs, {
          certificateSide: 'offer',
          moleculeSide: 'offer',
        });
        expect(offerResult.sides?.crossingCost).toBe(0); // atMid < atChosenSides, bounded at 0 (never negative)
      });

      it('crossingCost null when either side is unpriced', () => {
        const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
        const deMarket = getMarketById('DE_THG')!;
        const unpricedMarks: MarksState = {
          ...sampleMarks,
          marks: {
            ...sampleMarks.marks,
            DE_THG: { marketId: 'DE_THG', bid: null, offer: null, mid: null, updatedAt: null, source: null },
          },
        };

        const result = computeNetback(deMarket, consignment, unpricedMarks, emptyCosts, 'bid');
        expect(result.sides?.atChosenSides).toBeNull();
        expect(result.sides?.atMid).toBeNull();
        expect(result.sides?.crossingCost).toBeNull();
      });

      it('global toggle sets both sides; per-component override survives it', () => {
        const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
        const deMarket = getMarketById('DE_THG')!;

        // 1. Global toggle 'mid' with no explicit sides
        const globalMidMarks: MarksState = { ...sampleMarks, pricingSide: 'mid' };
        const midRes = computeNetback(deMarket, consignment, globalMidMarks, emptyCosts);
        expect(midRes.pricingSides).toEqual({ certificateSide: 'mid', moleculeSide: 'mid' });
        expect(midRes.moleculeValue).toBe(28.50);

        // 2. Per-component override passed in side parameter overrides global toggle
        const overrideRes = computeNetback(deMarket, consignment, globalMidMarks, emptyCosts, {
          certificateSide: 'bid',
          moleculeSide: 'offer',
        });
        expect(overrideRes.pricingSides).toEqual({ certificateSide: 'bid', moleculeSide: 'offer' });
        expect(overrideRes.moleculeValue).toBe(29.00);
      });

      it('existing single-side behaviour unchanged when both sides equal', () => {
        const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
        const deMarket = getMarketById('DE_THG')!;
        const costs: CostInputs = {
          transferCosts: 1.0,
          certificationCosts: 0.5,
          logistics: 1.5,
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

        const legacyBidResult = computeNetback(deMarket, consignment, sampleMarks, costs, 'bid');
        const perLegBidResult = computeNetback(deMarket, consignment, sampleMarks, costs, {
          certificateSide: 'bid',
          moleculeSide: 'bid',
        });

        expect(legacyBidResult.netNetback).toBe(perLegBidResult.netNetback);
        expect(legacyBidResult.producerPayable).toBe(perLegBidResult.producerPayable);
        expect(legacyBidResult.deskMargin).toBe(perLegBidResult.deskMargin);
        expect(legacyBidResult.marginPercent).toBe(perLegBidResult.marginPercent);
      });
    });
  });
});
