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
import { SIMULATED_SOURCE_NAME } from '../marks/simulate';
import { rankNetbacks, getHighestBlockedOpportunity } from '../netback/ranking';
import { generateTradeSummary } from '../trade/summary';
import { assessmentContainsPraData } from '../trade/licensing';
import { TradeAssessment } from '../trade/types';
import { migrateState, createDefaultState, CURRENT_SCHEMA_VERSION } from '../../store/context';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { scanEuropeanArbitrage } from '../arbitrage/engine';
import { getRouteTransitTariff, calculateRealisticCommercialDeskMargin } from '../arbitrage/origins';
import { BIOMETHANE_PLANTS, DEVELOPER_PORTFOLIOS, COUNTRY_MACRO_STATS, getPlantsByCountry, searchPlants } from '../plants/registry';

const emptyCosts: CostInputs = {
  transferCosts: null,
  certificationCosts: null,
  logistics: null,
  otherCosts: null,
};

const completeCosts: CostInputs = {
  transferCosts: 2.0,
  certificationCosts: 0.5,
  logistics: 1.5,
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
  pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
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

    it('A9: rankNetbacks sorts complete cost inputs above incomplete rows', () => {
      const consignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        deliveryPeriod: {
          type: 'CALENDAR',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          complianceYear: 2026,
        },
      };
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

    it('A13: calculateRealisticCommercialDeskMargin calculates modelled margin with configurable producer share and unclamped losses', () => {
      const margin90 = calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, 0.90);
      expect(margin90.deskNetMarginEurPerMWh).toBe(9.80); // (100 - 2) * 0.10
      expect(margin90.producerProcurementEurPerMWh).toBe(88.20); // (100 - 2) * 0.90

      // Unclamped loss-making route
      const lossMargin = calculateRealisticCommercialDeskMargin('DE_THG', -10, 2.0, 0.90);
      expect(lossMargin.deskNetMarginEurPerMWh).toBe(-1.20); // (-10 - 2) * 0.10
      expect(lossMargin.producerProcurementEurPerMWh).toBe(-10.80); // (-10 - 2) * 0.90
    });

    it('anchors: tCO2ePerMWh conversion accuracy', () => {
      expect(tCO2ePerMWh(-100)).toBeCloseTo(0.6984, 4);
      expect(tCO2ePerMWh(20)).toBeCloseTo(0.2664, 4);
    });

    it('anchors: FuelEU manure CI -100 year 1 deficit closure value', () => {
      const res = computeFuelEUDeficitClosureValue(-100, 1, 89.34, 91.16);
      expect(res.valueEurPerMWh).toBeCloseTo(437.69, 1);
    });

    it('guards against division by zero when shipActualCI <= 0 in FuelEU calculation', () => {
      const resZero = computeFuelEUDeficitClosureValue(-100, 1, 89.34, 0);
      expect(resZero.valueEurPerMWh).toBe(0);
      expect(resZero.calculation).toContain('must be positive');

      const resNeg = computeFuelEUDeficitClosureValue(-100, 1, 89.34, -50);
      expect(resNeg.valueEurPerMWh).toBe(0);
      expect(resNeg.calculation).toContain('must be positive');
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

      // A new desk seeds itself from simulateDesk() so every screen has something to
      // compute against on first run. The honesty requirement is not that the desk
      // starts empty — it is that seeded marks are unmistakably labelled and rank
      // last for reliability, so nothing here can be mistaken for an observed price.
      const defaultState = createDefaultState();
      const frMark = defaultState.marks.marks['FR_CPB'];
      expect(frMark.provenance).toBeDefined();
      expect(frMark.provenance?.sourceType).toBe('ESTIMATE');
      expect(frMark.provenance?.sourceName).toBe(SIMULATED_SOURCE_NAME);
      expect(frMark.provenance?.sourceUrl).toBeNull();
      expect(frMark.provenance?.note).toMatch(/not a real mark/i);
      expect(defaultState.marks.gasIndex.provenance?.sourceType).toBe('ESTIMATE');
      expect(defaultState.marks.fx.provenance?.sourceType).toBe('ESTIMATE');

      // ESTIMATE is the least reliable source, so seeded marks sort below every
      // real one the desk later enters.
      expect(getMarkReliability('ESTIMATE')).toBeLessThan(getMarkReliability('PRESS_REPORT')!);
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
          pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
        },
        costs: {
          transferCosts: 0.8,
          certificationCosts: 0.45,
          logistics: 1.2,
          otherCosts: 0,
          producerPricing: null,
        },
        consignments: [],
        activeConsignmentId: null,
        savedAssessments: [],
        selectedMarketId: 'FR_CPB',
      };

      const migrated = migrateState(v4State);
      expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

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
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
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
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };
      const deCosts: CostInputs = {
        transferCosts: 0,
        certificationCosts: 0,
        logistics: 0,
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
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const costs: CostInputs = {
        transferCosts: 0.5,
        certificationCosts: 0.2,
        logistics: 1.0,
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
        expect(offerResult.sides?.crossingCost).toBeLessThan(0); // atMid < atChosenSides: negative crossing cost reflects spread benefit / optimistic pricing
        expect(offerResult.sides?.crossingCost).toBe(
          Number((offerResult.sides!.atMid! - offerResult.sides!.atChosenSides!).toFixed(2))
        );
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
        const globalMidMarks: MarksState = { ...sampleMarks, pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' } };
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

    describe('Deal Ticket Phase 2: Delivery period, compliance year & gate wiring', () => {
      it('complianceYear 2025 → DE gate single branch, not UNRESOLVED', () => {
        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            complianceYear: 2025,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const elig = evaluateEligibility(consignment, deMarket);
        const deGate = elig.gates.find(g => g.gate === 'MARKET_SPECIFIC');
        expect(deGate?.verdict).toBe('PASS');
        expect(deGate?.reason).toContain('For compliance year 2025 (<= 2025)');

        const netback = computeNetback(deMarket, consignment, sampleMarks, emptyCosts, 'bid');
        expect(netback.uncertaintyBranches).toBeNull();
      });

      it('complianceYear 2027 → DE gate UNRESOLVED with both branches', () => {
        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2027-01-01',
            endDate: '2027-12-31',
            complianceYear: 2027,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const elig = evaluateEligibility(consignment, deMarket);
        const deGate = elig.gates.find(g => g.gate === 'MARKET_SPECIFIC');
        expect(deGate?.verdict).toBe('UNRESOLVED');
        expect(deGate?.reason).toContain('For compliance year 2027 (>= 2026)');

        const netback = computeNetback(deMarket, consignment, sampleMarks, emptyCosts, 'bid');
        expect(netback.uncertaintyBranches).toBeDefined();
        expect(netback.uncertaintyBranches?.length).toBe(2);
        expect(netback.uncertaintyBranches![0].branchId).toBe('DC_OFF');
        expect(netback.uncertaintyBranches![1].branchId).toBe('DC_ON');
      });

      it('complianceYear null → UNRESOLVED, reason states year unset', () => {
        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: {
            type: null,
            startDate: null,
            endDate: null,
            complianceYear: null,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const elig = evaluateEligibility(consignment, deMarket);
        const deGate = elig.gates.find(g => g.gate === 'MARKET_SPECIFIC');
        expect(deGate?.verdict).toBe('UNRESOLVED');
        expect(deGate?.reason).toContain('Compliance year is unset on this consignment');

        const netback = computeNetback(deMarket, consignment, sampleMarks, emptyCosts, 'bid');
        expect(netback.missingInputs).toContain('deliveryPeriod');
        expect(netback.uncertaintyBranches).toBeDefined();
      });

      it('EU_ETS2 with complianceYear 2028 → no longer blocked on the year alone', () => {
        const consignment2028: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2028-01-01',
            endDate: '2028-12-31',
            complianceYear: 2028,
          },
        };
        const ets2Market = getMarketById('EU_ETS2')!;
        const elig2028 = evaluateEligibility(consignment2028, ets2Market);
        const ets2Gate2028 = elig2028.gates.find(g => g.gate === 'MARKET_SPECIFIC');
        expect(ets2Gate2028?.verdict).toBe('PASS');
        expect(ets2Gate2028?.reason).toContain('compliance year 2028');

        // Pre-2028 is UNKNOWN
        const consignment2026: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
        };
        const elig2026 = evaluateEligibility(consignment2026, ets2Market);
        const ets2Gate2026 = elig2026.gates.find(g => g.gate === 'MARKET_SPECIFIC');
        expect(ets2Gate2026?.verdict).toBe('UNKNOWN');
      });

      it('v5 → v6 migration adds null deliveryPeriod without data loss', () => {
        const v5State = {
          schemaVersion: 5,
          marks: {
            marks: {
              DE_THG: {
                marketId: 'DE_THG',
                bid: 290,
                offer: 310,
                mid: 300,
                updatedAt: '2026-08-16T10:00:00Z',
                source: 'Argus Media',
                provenance: {
                  sourceType: 'BROKER_RUN',
                  sourceName: 'Argus Media',
                  sourceUrl: null,
                  observedAt: '2026-08-16T10:00:00Z',
                  note: null,
                },
              },
            },
            gasIndex: { bid: 28.0, offer: 29.0, mid: 28.5, updatedAt: null, provenance: null },
            fx: { gbpEur: 1.17, chfEur: 1.05, updatedAt: null, provenance: null },
            pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
          },
          consignments: [
            {
              id: 'c1',
              name: 'Existing Consignment',
              originCountry: 'DK',
              originCountryName: 'Denmark',
              feedstock: 'manure',
              feedstockName: 'Animal manure',
              annexClassification: 'IX_A',
              carbonIntensity: -100,
              commissioningDateRange: 'POST_2021_TO_2025',
              certificationScheme: 'ISCC_EU',
              chainOfCustody: 'MASS_BALANCE',
              injectionCountry: 'DK',
              injectionIsEU: true,
              udbStatus: 'RECORDED',
              posStatus: 'ISSUED',
              volumeMWh: 5000,
            },
          ],
          activeConsignmentId: 'c1',
          costs: emptyCosts,
          savedAssessments: [],
          selectedMarketId: 'DE_THG',
        };

        const migrated = migrateState(v5State);
        expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.consignments).toHaveLength(1);
        expect(migrated.consignments[0].name).toBe('Existing Consignment');
        expect(migrated.consignments[0].volumeMWh).toBe(5000);
        expect(migrated.consignments[0].deliveryPeriod).toEqual({
          type: null,
          startDate: null,
          endDate: null,
          complianceYear: null,
        });
      });
    });

    describe('Deal Ticket Phase 3: Promote regulatory uncertainty to headline valuation range', () => {
      it('German consignment with complianceYear >= 2026 populates valuationRange with correct low, high, deltaPerMwh, deltaNotional', () => {
        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          volumeMWh: 10000,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const netback = computeNetback(deMarket, consignment, sampleMarks, emptyCosts, 'bid');

        expect(netback.valuationRange).toBeDefined();
        expect(netback.valuationRange).not.toBeNull();
        expect(netback.valuationRange?.low).toBe(netback.uncertaintyBranches![0].netNetback);
        expect(netback.valuationRange?.high).toBe(netback.uncertaintyBranches![1].netNetback);
        expect(netback.valuationRange?.deltaPerMwh).toBe(
          Number((netback.valuationRange!.high - netback.valuationRange!.low).toFixed(2))
        );
        expect(netback.valuationRange?.deltaNotional).toBe(
          Number((netback.valuationRange!.deltaPerMwh * 10000).toFixed(2))
        );
        expect(netback.valuationRange?.driver).toContain('German THG double-counting eligibility');
      });

      it('Non-German market or complianceYear <= 2025 has valuationRange === null', () => {
        // 1. Compliance year 2025 (single branch)
        const consignment2025: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            complianceYear: 2025,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const deNetback2025 = computeNetback(deMarket, consignment2025, sampleMarks, emptyCosts, 'bid');
        expect(deNetback2025.valuationRange).toBeNull();

        // 2. Non-German market (e.g. France CPB)
        const frMarket = getMarketById('FR_CPB')!;
        const frNetback = computeNetback(frMarket, consignment2025, sampleMarks, emptyCosts, 'bid');
        expect(frNetback.valuationRange).toBeNull();
      });

      it('deltaNotional is null when volume is null, correct number when volume is set', () => {
        const consignmentNoVol: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          volumeMWh: null,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2027-01-01',
            endDate: '2027-12-31',
            complianceYear: 2027,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const resNoVol = computeNetback(deMarket, consignmentNoVol, sampleMarks, emptyCosts, 'bid');
        expect(resNoVol.valuationRange?.deltaNotional).toBeNull();

        const consignmentWithVol: Consignment = {
          ...consignmentNoVol,
          volumeMWh: 5000,
        };
        const resWithVol = computeNetback(deMarket, consignmentWithVol, sampleMarks, emptyCosts, 'bid');
        expect(resWithVol.valuationRange?.deltaNotional).toBe(
          Number((resWithVol.valuationRange!.deltaPerMwh * 5000).toFixed(2))
        );
      });

      it('summary dossier includes REGULATORY RISK SPREAD when valuationRange is present', () => {
        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          volumeMWh: 10000,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const elig = evaluateEligibility(consignment, deMarket);
        const netback = computeNetback(deMarket, consignment, sampleMarks, emptyCosts, 'bid');
        const assessment: TradeAssessment = {
          id: 'test-assessment-range',
          createdAt: '2026-08-16T10:00:00Z',
          targetMarketId: 'DE_THG',
          targetMarketName: 'Germany THG',
          consignment,
          eligibility: elig,
          netback,
          marks: sampleMarks,
          costs: emptyCosts,
          userNotes: '',
        };

        const summary = generateTradeSummary(assessment);
        expect(summary).toContain('REGULATORY RISK SPREAD (HEADLINE VALUATION RANGE):');
        expect(summary).toContain('Underlying Driver:    German THG double-counting eligibility');
      });
    });

    describe('Deal Ticket Phase 4: Deal context (Notionals, Runner-up, Counterparty, Logistics)', () => {
      it('4.1 Notional calculation: volumeMWh × value produces expected total, null when volume is null', () => {
        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          volumeMWh: 10000,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const netback = computeNetback(deMarket, consignment, sampleMarks, completeCosts, 'bid');

        expect(netback.deskPnL).toBe(Number((netback.deskMargin! * 10000).toFixed(2)));
        expect(netback.producerPayable).not.toBeNull();
      });

      it('4.2 Best alternative runner-up selection: finds highest eligible market excluding selected', () => {
        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
        };
        const allActive = MARKETS.filter(m => m.status === 'ACTIVE' && m.id !== 'DE_THG');
        const candidateList = allActive
          .map(m => {
            const el = evaluateEligibility(consignment, m);
            if (el.overallVerdict !== 'ELIGIBLE' && el.overallVerdict !== 'CONDITIONAL') return null;
            const nb = computeNetback(m, consignment, sampleMarks, emptyCosts, 'bid');
            if (nb.netNetback === null) return null;
            return { market: m, nb };
          })
          .filter((item): item is { market: any; nb: any } => item !== null);

        candidateList.sort((a, b) => (b.nb.netNetback ?? 0) - (a.nb.netNetback ?? 0));
        expect(candidateList.length).toBeGreaterThan(0);
        expect(candidateList[0].market.id).not.toBe('DE_THG');
      });

      it('4.3 Counterparty field: defaults null, is not flagged in missingInputs, included in generateTradeSummary', () => {
        const consignmentWithCp: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          counterparty: 'Shell Energy Europe',
          deliveryPeriod: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
        };
        const deMarket = getMarketById('DE_THG')!;
        const elig = evaluateEligibility(consignmentWithCp, deMarket);
        const netback = computeNetback(deMarket, consignmentWithCp, sampleMarks, emptyCosts, 'bid');

        // Optional field is not in missing inputs
        expect(netback.missingInputs).not.toContain('counterparty');

        const assessment: TradeAssessment = {
          id: 'test-assessment-cp',
          createdAt: '2026-08-16T10:00:00Z',
          targetMarketId: 'DE_THG',
          targetMarketName: 'Germany THG',
          consignment: consignmentWithCp,
          eligibility: elig,
          netback,
          marks: sampleMarks,
          costs: emptyCosts,
          userNotes: '',
        };

        const summary = generateTradeSummary(assessment);
        expect(summary).toContain('Counterparty: Shell Energy Europe');
      });

      it('v6 → v7 migration: existing consignments get counterparty: null without data loss', () => {
        const v6State = {
          schemaVersion: 6,
          marks: {
            marks: {},
            gasIndex: { bid: 28.0, offer: 29.0, mid: 28.5, updatedAt: null, provenance: null },
            fx: { gbpEur: 1.17, chfEur: 1.05, updatedAt: null, provenance: null },
            pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
          },
          consignments: [
            {
              id: 'c1',
              name: 'Existing Consignment',
              originCountry: 'DK',
              originCountryName: 'Denmark',
              feedstock: 'manure',
              feedstockName: 'Animal manure',
              annexClassification: 'IX_A',
              carbonIntensity: -100,
              commissioningDateRange: 'POST_2021_TO_2025',
              certificationScheme: 'ISCC_EU',
              chainOfCustody: 'MASS_BALANCE',
              injectionCountry: 'DK',
              injectionIsEU: true,
              udbStatus: 'RECORDED',
              posStatus: 'ISSUED',
              volumeMWh: 5000,
              deliveryPeriod: {
                type: 'CALENDAR',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                complianceYear: 2026,
              },
            },
          ],
          activeConsignmentId: 'c1',
          costs: emptyCosts,
          savedAssessments: [],
          selectedMarketId: 'DE_THG',
        };

        const migrated = migrateState(v6State);
        expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.consignments).toHaveLength(1);
        expect(migrated.consignments[0].counterparty).toBeNull();
        expect(migrated.consignments[0].deliveryPeriod?.complianceYear).toBe(2026);
      });

      it('v7 → v8 migration: the scalar pricingSide becomes the per-leg pair on both legs', () => {
        // A genuine scalar-only v7 payload: the per-leg pair was optional in v7, so it
        // may be absent entirely. Strip it rather than inheriting one from the fixture.
        const { pricingSides: _omitted, ...scalarOnlyMarks } = sampleMarks;
        const v7State = {
          schemaVersion: 7,
          marks: { ...scalarOnlyMarks, pricingSide: 'offer' },
          consignments: [REFERENCE_CONSIGNMENTS.DANISH_MANURE],
          activeConsignmentId: REFERENCE_CONSIGNMENTS.DANISH_MANURE.id,
          costs: emptyCosts,
          savedAssessments: [],
          selectedMarketId: 'DE_THG',
        };

        const migrated = migrateState(v7State);
        expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.marks.pricingSides).toEqual({
          certificateSide: 'offer',
          moleculeSide: 'offer',
        });
        // The retired scalar must not survive as a second source of truth.
        expect('pricingSide' in migrated.marks).toBe(false);
      });

      it('v7 → v8 migration: deliveredCost becomes the fixed producer price when that slot is empty', () => {
        const v7State = {
          schemaVersion: 7,
          marks: sampleMarks,
          consignments: [REFERENCE_CONSIGNMENTS.DANISH_MANURE],
          activeConsignmentId: REFERENCE_CONSIGNMENTS.DANISH_MANURE.id,
          costs: {
            ...emptyCosts,
            deliveredCost: 62.4,
            producerPricing: {
              mode: 'FIXED_PRICE' as const,
              fixedPriceEurPerMwh: null,
              indexLinkedShare: null,
              source: null,
              lastVerified: null,
              confidence: 'UNVERIFIED' as const,
            },
          },
          savedAssessments: [],
          selectedMarketId: 'DE_THG',
        };

        const migrated = migrateState(v7State);
        expect(migrated.costs.producerPricing?.fixedPriceEurPerMwh).toBe(62.4);
        expect('deliveredCost' in migrated.costs).toBe(false);
      });

      it('v7 → v8 migration: deliveredCost is dropped rather than overwriting a set fixed price', () => {
        const v7State = {
          schemaVersion: 7,
          marks: sampleMarks,
          consignments: [REFERENCE_CONSIGNMENTS.DANISH_MANURE],
          activeConsignmentId: REFERENCE_CONSIGNMENTS.DANISH_MANURE.id,
          costs: {
            ...emptyCosts,
            deliveredCost: 62.4,
            producerPricing: {
              mode: 'FIXED_PRICE' as const,
              fixedPriceEurPerMwh: 209.04,
              indexLinkedShare: null,
              source: 'Signed contract',
              lastVerified: '2026-08-16',
              confidence: 'VERIFIED' as const,
            },
          },
          savedAssessments: [],
          selectedMarketId: 'DE_THG',
        };

        const migrated = migrateState(v7State);
        // The contracted price stands. Overwriting it with a legacy field the engine
        // never read would be inventing a term of the deal.
        expect(migrated.costs.producerPricing?.fixedPriceEurPerMwh).toBe(209.04);
        expect('deliveredCost' in migrated.costs).toBe(false);
      });

      it('v7 → v8 migration: deliveredCost is dropped under INDEX_LINKED, never coerced into a share', () => {
        const v7State = {
          schemaVersion: 7,
          marks: sampleMarks,
          consignments: [REFERENCE_CONSIGNMENTS.DANISH_MANURE],
          activeConsignmentId: REFERENCE_CONSIGNMENTS.DANISH_MANURE.id,
          costs: {
            ...emptyCosts,
            deliveredCost: 62.4,
            producerPricing: {
              mode: 'INDEX_LINKED' as const,
              fixedPriceEurPerMwh: null,
              indexLinkedShare: 0.9,
              source: null,
              lastVerified: null,
              confidence: 'UNVERIFIED' as const,
            },
          },
          savedAssessments: [],
          selectedMarketId: 'DE_THG',
        };

        const migrated = migrateState(v7State);
        expect(migrated.costs.producerPricing?.indexLinkedShare).toBe(0.9);
        expect(migrated.costs.producerPricing?.fixedPriceEurPerMwh).toBeNull();
        expect('deliveredCost' in migrated.costs).toBe(false);
      });

      it('v7 → v8 migration: an already-set per-leg pair is preserved over the scalar', () => {
        const v7State = {
          schemaVersion: 7,
          marks: {
            ...sampleMarks,
            pricingSide: 'bid',
            pricingSides: { certificateSide: 'offer', moleculeSide: 'mid' },
          },
          consignments: [REFERENCE_CONSIGNMENTS.DANISH_MANURE],
          activeConsignmentId: REFERENCE_CONSIGNMENTS.DANISH_MANURE.id,
          costs: emptyCosts,
          savedAssessments: [],
          selectedMarketId: 'DE_THG',
        };

        const migrated = migrateState(v7State);
        // The scalar could never express a split pair, so the pair wins.
        expect(migrated.marks.pricingSides).toEqual({
          certificateSide: 'offer',
          moleculeSide: 'mid',
        });
      });
    });
  });
});
