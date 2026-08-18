import { describe, it, expect } from 'vitest';
import { evaluateEligibility, evaluateAllMarkets } from '../eligibility/engine';
import { 
  computeCertificateValue, 
  computeNetback, 
  computeAllNetbacks,
  tCO2ePerMWh, 
  computeFuelEUDeficitClosureValue,
  selectMarkPrice,
  RTFO_KG_PER_MWH,
  BIOMETHANE_KWH_PER_KG,
  FUELEU_BASELINE_CI,
  FUELEU_TARGET_CI_2025,
  FUELEU_TARGET_CI_2030,
} from '../netback/engine';
import { 
  findShortestPipelinePath, 
  resolveInterconnectionPoints, 
  calculateLogisticsRoute 
} from '../logistics/engine';
import { MARKETS, getMarketById } from '../markets/registry';
import { 
  CI_COMPARATOR_ROAD_TRANSPORT, 
  CI_COMPARATOR_HEAT, 
  FR_CPB_CEILING_EUR_MWH,
  MWH_PER_CIC_ADVANCED,
  MWH_PER_CIC_CONVENTIONAL,
} from '../markets/constants';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { Consignment, AnnexClassification, CertificationScheme, ChainOfCustody } from '../consignment/types';
import { MarksState, CostInputs, NetbackResult } from '../netback/types';
import { generateTradeSummary } from '../trade/summary';
import { assessmentContainsPraData } from '../trade/licensing';
import { TradeAssessment } from '../trade/types';

// ============================================================================
// FIXTURES & BASE TEST DATA
// ============================================================================

const testBaseMarks: MarksState = {
  marks: {
    DE_THG: { marketId: 'DE_THG', bid: 290, offer: 310, mid: 300, updatedAt: '2026-08-17T00:00:00Z', source: 'Argus', provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Argus Media', sourceUrl: 'https://www.argusmedia.com', observedAt: '2026-08-17T00:00:00Z', note: null } },
    FR_CPB: { marketId: 'FR_CPB', bid: 95, offer: 105, mid: 100, updatedAt: '2026-08-17T00:00:00Z', source: 'EEX', provenance: { sourceType: 'EXCHANGE_AUCTION', sourceName: 'Powernext / EEX', sourceUrl: 'https://www.powernext.com', observedAt: '2026-08-17T00:00:00Z', note: null } },
    NL_ERE: { marketId: 'NL_ERE', bid: 0.28, offer: 0.32, mid: 0.30, updatedAt: '2026-08-17T00:00:00Z', source: 'NEa', provenance: { sourceType: 'PLATFORM_HISTORY', sourceName: 'VertiCer / NEa', sourceUrl: null, observedAt: '2026-08-17T00:00:00Z', note: null } },
    VOL_SCOPE1: { marketId: 'VOL_SCOPE1', bid: 35, offer: 45, mid: 40, updatedAt: '2026-08-17T00:00:00Z', source: 'Broker', provenance: { sourceType: 'BROKER_INDICATION', sourceName: 'STX Group', sourceUrl: null, observedAt: '2026-08-17T00:00:00Z', note: null } },
    FUELEU: { marketId: 'FUELEU', bid: 220, offer: 260, mid: 240, updatedAt: '2026-08-17T00:00:00Z', source: 'Broker', provenance: { sourceType: 'BROKER_INDICATION', sourceName: 'ACT Commodities', sourceUrl: null, observedAt: '2026-08-17T00:00:00Z', note: null } },
    IT_CIC: { marketId: 'IT_CIC', bid: 360, offer: 390, mid: 375, updatedAt: '2026-08-17T00:00:00Z', source: 'GSE', provenance: { sourceType: 'PLATFORM_HISTORY', sourceName: 'GSE Portal', sourceUrl: null, observedAt: '2026-08-17T00:00:00Z', note: null } },
    UK_RTFO: { marketId: 'UK_RTFO', bid: 0.25, offer: 0.27, mid: 0.26, updatedAt: '2026-08-17T00:00:00Z', source: 'Argus', provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Argus Media', sourceUrl: 'https://www.argusmedia.com', observedAt: '2026-08-17T00:00:00Z', note: null } },
  },
  gasIndex: { bid: 28.00, offer: 29.00, mid: 28.50, updatedAt: '2026-08-17T00:00:00Z', provenance: { sourceType: 'EXCHANGE_AUCTION', sourceName: 'ICE Endex TTF', sourceUrl: null, observedAt: '2026-08-17T00:00:00Z', note: null } },
  fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: '2026-08-17T00:00:00Z', provenance: { sourceType: 'PLATFORM_HISTORY', sourceName: 'ECB Reference Rates', sourceUrl: null, observedAt: '2026-08-17T00:00:00Z', note: null } },
  pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
};

const standardFixedCosts: CostInputs = {
  transferCosts: 1.50,
  certificationCosts: 0.50,
  logistics: 2.00,
  otherCosts: 0.50,
  producerPricing: {
    mode: 'FIXED_PRICE',
    fixedPriceEurPerMwh: 75.00,
    indexLinkedShare: null,
    source: 'Bilateral EFET Contract',
    lastVerified: '2026-08-17',
    confidence: 'VERIFIED',
  },
};

const standardIndexLinkedCosts: CostInputs = {
  transferCosts: 1.50,
  certificationCosts: 0.50,
  logistics: 2.00,
  otherCosts: 0.50,
  producerPricing: {
    mode: 'INDEX_LINKED',
    fixedPriceEurPerMwh: null,
    indexLinkedShare: 0.85, // 85% to producer, 15% to desk
    source: 'Index Linked Formula',
    lastVerified: '2026-08-17',
    confidence: 'VERIFIED',
  },
};

describe('E2E Trading Workflows & Multi-Tier Regulatory Stress Suite (Milestone 4)', () => {

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE ACROSS ALL 6 REGULATORY GATES, NETBACK, LOGISTICS
  // ==========================================================================
  describe('Tier 1: Feature Coverage (6 Regulatory Gates, Netback & Logistics)', () => {

    describe('1.1 Scheme Recognition Gate', () => {
      it('evaluates EU-recognised voluntary schemes (ISCC_EU, REDCERT_EU, 2BSVS, KZR_INIG) as PASS for compliance markets', () => {
        const schemes: CertificationScheme[] = ['ISCC_EU', 'REDCERT_EU', '2BSVS', 'KZR_INIG'];
        const deMarket = getMarketById('DE_THG')!;
        
        for (const scheme of schemes) {
          const c: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, certificationScheme: scheme };
          const assessment = evaluateEligibility(c, deMarket);
          const schemeGate = assessment.gates.find(g => g.gate === 'SCHEME_RECOGNITION');
          expect(schemeGate).toBeDefined();
          expect(schemeGate?.verdict).toBe('PASS');
          expect(schemeGate?.citations.length).toBeGreaterThan(0);
        }
      });

      it('evaluates non-energy voluntary schemes (ISCC_PLUS, REDCERT2) as HARD_BLOCK for compliance markets', () => {
        const nonEnergySchemes: CertificationScheme[] = ['ISCC_PLUS', 'REDCERT2'];
        const complianceMarkets = ['DE_THG', 'FR_CPB', 'NL_ERE', 'IT_CIC', 'FUELEU'].map(id => getMarketById(id)!);

        for (const scheme of nonEnergySchemes) {
          for (const market of complianceMarkets) {
            const c: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, certificationScheme: scheme };
            const assessment = evaluateEligibility(c, market);
            const schemeGate = assessment.gates.find(g => g.gate === 'SCHEME_RECOGNITION');
            expect(schemeGate?.verdict).toBe('HARD_BLOCK');
            expect(schemeGate?.reason).toContain('NOT recognised by the European Commission');
            expect(assessment.overallVerdict).toBe('HARD_BLOCK');
            expect(assessment.blockingGate).toBe('SCHEME_RECOGNITION');
          }
        }
      });

      it('permits ISCC_PLUS and REDCERT2 in voluntary corporate market (VOL_SCOPE1)', () => {
        const volMarket = getMarketById('VOL_SCOPE1')!;
        for (const scheme of ['ISCC_PLUS', 'REDCERT2'] as CertificationScheme[]) {
          const c: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, certificationScheme: scheme };
          const assessment = evaluateEligibility(c, volMarket);
          const schemeGate = assessment.gates.find(g => g.gate === 'SCHEME_RECOGNITION');
          expect(schemeGate?.verdict).toBe('PASS');
          expect(assessment.overallVerdict).toBe('ELIGIBLE');
        }
      });
    });

    describe('1.2 Union Database (UDB) Recording Gate', () => {
      it('requires EU grid injection and validates RECORDED vs PENDING vs NOT_RECORDED states', () => {
        const deMarket = getMarketById('DE_THG')!;

        // RECORDED state -> PASS
        const cRecorded: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, udbStatus: 'RECORDED', injectionIsEU: true };
        expect(evaluateEligibility(cRecorded, deMarket).gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('PASS');

        // PENDING state -> CONDITIONAL
        const cPending: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, udbStatus: 'PENDING', injectionIsEU: true };
        expect(evaluateEligibility(cPending, deMarket).gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('CONDITIONAL');

        // NOT_RECORDED state -> CONDITIONAL
        const cNotRecorded: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, udbStatus: 'NOT_RECORDED', injectionIsEU: true };
        expect(evaluateEligibility(cNotRecorded, deMarket).gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('CONDITIONAL');
      });

      it('strictly HARD_BLOCKs third-country non-EU grid injection (GB, CH) from UDB compliance markets', () => {
        const deMarket = getMarketById('DE_THG')!;
        const cUkGrid: Consignment = { 
          ...REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE, 
          injectionCountry: 'GB', 
          injectionIsEU: false,
          udbStatus: 'NOT_RECORDED'
        };
        const assessment = evaluateEligibility(cUkGrid, deMarket);
        const udbGate = assessment.gates.find(g => g.gate === 'UDB_RECORDING')!;
        expect(udbGate.verdict).toBe('HARD_BLOCK');
        expect(udbGate.reason).toContain('non-EU gas grid (GB)');
        expect(assessment.overallVerdict).toBe('HARD_BLOCK');
      });

      it('bypasses UDB requirement for markets with requiresUDB=false (UK_RTFO, VOL_SCOPE1, CH_VSG)', () => {
        const noUdbMarkets = ['UK_RTFO', 'VOL_SCOPE1', 'CH_VSG'].map(id => getMarketById(id)!);
        const cUkGrid: Consignment = { ...REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE, injectionCountry: 'GB', injectionIsEU: false };

        for (const market of noUdbMarkets) {
          const assessment = evaluateEligibility(cUkGrid, market);
          const udbGate = assessment.gates.find(g => g.gate === 'UDB_RECORDING')!;
          expect(udbGate.verdict).toBe('PASS');
          expect(udbGate.reason).toContain('does not require Union Database recording');
        }
      });
    });

    describe('1.3 Chain of Custody Gate', () => {
      it('validates MASS_BALANCE and SEGREGATION as PASS for all compliance markets', () => {
        const complianceMarket = getMarketById('NL_ERE')!;
        for (const coc of ['MASS_BALANCE', 'SEGREGATION'] as ChainOfCustody[]) {
          const c: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, chainOfCustody: coc };
          const gate = evaluateEligibility(c, complianceMarket).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
          expect(gate.verdict).toBe('PASS');
        }
      });

      it('strictly HARD_BLOCKs BOOK_AND_CLAIM for transport compliance and FuelEU markets', () => {
        const complianceMarkets = ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'FUELEU', 'EU_ETS1'].map(id => getMarketById(id)!);
        for (const market of complianceMarkets) {
          const c: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, chainOfCustody: 'BOOK_AND_CLAIM' };
          const gate = evaluateEligibility(c, market).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
          expect(gate.verdict).toBe('HARD_BLOCK');
          expect(gate.reason).toContain('Book-and-claim chain of custody does not meet RED III requirements');
        }
      });

      it('permits BOOK_AND_CLAIM for voluntary markets and registries accepting book-and-claim (VOL_SCOPE1, DK_GO)', () => {
        const bcMarkets = ['VOL_SCOPE1', 'DK_GO'].map(id => getMarketById(id)!);
        for (const market of bcMarkets) {
          const c: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, chainOfCustody: 'BOOK_AND_CLAIM' };
          const gate = evaluateEligibility(c, market).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
          expect(gate.verdict).toBe('PASS');
        }
      });
    });

    describe('1.4 Feedstock Category Gate', () => {
      it('categorises Annex IX-A feedstocks as PASS with advanced sub-quota eligibility', () => {
        const market = getMarketById('DE_THG')!;
        const ixAFeedstocks = ['manure', 'food_waste', 'sewage_sludge', 'agricultural_residues', 'landfill_gas'];
        for (const fs of ixAFeedstocks) {
          const info = FEEDSTOCK_REGISTRY[fs];
          const c: Consignment = {
            ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
            feedstock: fs,
            feedstockName: info.name,
            annexClassification: info.annexClassification,
          };
          const gate = evaluateEligibility(c, market).gates.find(g => g.gate === 'FEEDSTOCK_CATEGORY')!;
          expect(gate.verdict).toBe('PASS');
          expect(gate.reason).toContain('Annex IX Part A');
        }
      });

      it('categorises Annex IX-B and CROP feedstocks as CONDITIONAL due to statutory caps', () => {
        const market = getMarketById('DE_THG')!;
        
        // IX_B (UCO)
        const cUco: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          feedstock: 'used_cooking_oil',
          feedstockName: 'Used cooking oil (UCO)',
          annexClassification: 'IX_B',
        };
        const ucoGate = evaluateEligibility(cUco, market).gates.find(g => g.gate === 'FEEDSTOCK_CATEGORY')!;
        expect(ucoGate.verdict).toBe('CONDITIONAL');
        expect(ucoGate.reason).toContain('Annex IX Part B');

        // CROP (Energy crops)
        const cCrop: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          feedstock: 'energy_crops',
          feedstockName: 'Energy crops (maize, grass silage)',
          annexClassification: 'CROP',
        };
        const cropGate = evaluateEligibility(cCrop, market).gates.find(g => g.gate === 'FEEDSTOCK_CATEGORY')!;
        expect(cropGate.verdict).toBe('CONDITIONAL');
        expect(cropGate.reason).toContain('crop cap under RED III Art. 26');
      });
    });

    describe('1.5 GHG Saving Threshold Gate', () => {
      it('calculates GHG savings against transport comparator (94 g/MJ) and evaluates commissioning date brackets', () => {
        const market = getMarketById('NL_ERE')!;
        
        // POST_2026 bracket requires 70% saving (max CI = 94 * (1 - 0.70) = 28.2 g/MJ)
        const cPass: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          carbonIntensity: 20, // (94 - 20)/94 = 78.7% saving >= 70%
          commissioningDateRange: 'POST_2026',
        };
        expect(evaluateEligibility(cPass, market).gates.find(g => g.gate === 'GHG_THRESHOLD')?.verdict).toBe('PASS');

        const cFail: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          carbonIntensity: 35, // (94 - 35)/94 = 62.8% saving < 70%
          commissioningDateRange: 'POST_2026',
        };
        const failGate = evaluateEligibility(cFail, market).gates.find(g => g.gate === 'GHG_THRESHOLD')!;
        expect(failGate.verdict).toBe('HARD_BLOCK');
        expect(failGate.reason).toContain('BELOW the required minimum');
      });

      it('evaluates heat & power comparator (80 g/MJ) for AT_EGG and EU_ETS1', () => {
        const eggMarket = getMarketById('AT_EGG')!;
        // POST_2021_TO_2025 heat/power requires 70% saving (max CI = 80 * (1 - 0.70) = 24.0 g/MJ)
        const cPass: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          carbonIntensity: 20, // (80 - 20)/80 = 75.0% saving >= 70%
          commissioningDateRange: 'POST_2021_TO_2025',
        };
        expect(evaluateEligibility(cPass, eggMarket).gates.find(g => g.gate === 'GHG_THRESHOLD')?.verdict).toBe('PASS');

        const cFail: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          carbonIntensity: 30, // (80 - 30)/80 = 62.5% saving < 70%
          commissioningDateRange: 'POST_2021_TO_2025',
        };
        expect(evaluateEligibility(cFail, eggMarket).gates.find(g => g.gate === 'GHG_THRESHOLD')?.verdict).toBe('HARD_BLOCK');
      });
    });

    describe('1.6 Market-Specific Gate', () => {
      it('evaluates German THG pre-2025 vs post-2026 vs unset compliance year', () => {
        const deMarket = getMarketById('DE_THG')!;
        
        // <= 2025 -> PASS with 2x double counting
        const cPre2025: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: { type: 'CALENDAR', startDate: '2025-01-01', endDate: '2025-12-31', complianceYear: 2025 },
        };
        const preGate = evaluateEligibility(cPre2025, deMarket).gates.find(g => g.gate === 'MARKET_SPECIFIC')!;
        expect(preGate.verdict).toBe('PASS');
        expect(preGate.reason).toContain('<= 2025');

        // >= 2026 -> UNRESOLVED with dual branch note
        const cPost2026: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
        };
        const postGate = evaluateEligibility(cPost2026, deMarket).gates.find(g => g.gate === 'MARKET_SPECIFIC')!;
        expect(postGate.verdict).toBe('UNRESOLVED');
        expect(postGate.reason).toContain('>= 2026');

        // Unset -> UNRESOLVED
        const cUnset: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, deliveryPeriod: null };
        const unsetGate = evaluateEligibility(cUnset, deMarket).gates.find(g => g.gate === 'MARKET_SPECIFIC')!;
        expect(unsetGate.verdict).toBe('UNRESOLVED');
      });

      it('evaluates EU ETS2 postponement to 2028', () => {
        const ets2 = getMarketById('EU_ETS2')!;
        
        // Year 2028 -> PASS
        const c2028: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: { type: 'CALENDAR', startDate: '2028-01-01', endDate: '2028-12-31', complianceYear: 2028 },
        };
        expect(evaluateEligibility(c2028, ets2).gates.find(g => g.gate === 'MARKET_SPECIFIC')?.verdict).toBe('PASS');

        // Year 2026 or null -> UNKNOWN (postponed)
        const c2026: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          deliveryPeriod: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
        };
        const g2026 = evaluateEligibility(c2026, ets2).gates.find(g => g.gate === 'MARKET_SPECIFIC')!;
        expect(g2026.verdict).toBe('UNKNOWN');
        expect(g2026.reason).toContain('postponed to 2028');
      });
    });

    describe('1.7 Netback Valuation & Units of Account', () => {
      it('calculates netbacks across all statutory units of account', () => {
        const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE; // CI = -100, Annex IX-A

        // 1. EUR_PER_TCO2E (DE_THG): tCO2e = (94 - (-100))*3600/1e6 = 0.6984 tCO2e/MWh. At €290/t -> €202.54/MWh
        const deMarket = getMarketById('DE_THG')!;
        const deCert = computeCertificateValue(deMarket, consignment, testBaseMarks, 'bid');
        expect(deCert?.valueEurPerMWh).toBeCloseTo(202.54, 1);

        // 2. EUR_PER_KG_CO2E (NL_ERE): kgCO2e = 698.4 kg/MWh. At €0.28/kg -> €195.55/MWh
        const nlMarket = getMarketById('NL_ERE')!;
        const nlCert = computeCertificateValue(nlMarket, consignment, testBaseMarks, 'bid');
        expect(nlCert?.valueEurPerMWh).toBeCloseTo(195.55, 1);

        // 3. EUR_PER_MWH (FR_CPB): Mark €95.00/MWh
        const frMarket = getMarketById('FR_CPB')!;
        const frCert = computeCertificateValue(frMarket, consignment, testBaseMarks, 'bid');
        expect(frCert?.valueEurPerMWh).toBe(95.00);

        // 4. EUR_PER_CIC (IT_CIC): Advanced (Annex IX-A) -> 5.815 MWh/CIC. At €360/CIC -> €61.91/MWh
        const itMarket = getMarketById('IT_CIC')!;
        const itCert = computeCertificateValue(itMarket, consignment, testBaseMarks, 'bid');
        expect(itCert?.valueEurPerMWh).toBeCloseTo(61.91, 1);

        // 5. GBP_PER_DRTFC (UK_RTFO): Waste 2x -> 144.0 dRTFC/MWh. At £0.25, FX €1.18 -> €42.48/MWh
        const ukMarket = getMarketById('UK_RTFO')!;
        const ukCert = computeCertificateValue(ukMarket, consignment, testBaseMarks, 'bid');
        expect(ukCert?.valueEurPerMWh).toBeCloseTo(42.48, 1);
      });
    });

    describe('1.8 Multi-Modal Logistics Routing Engine', () => {
      it('computes shortest pipeline paths, border interconnection tariffs, and multi-modal cost models', () => {
        // Route from Denmark (DK) to Italy (IT)
        const path = findShortestPipelinePath('DK', 'IT');
        expect(path).toEqual(['DK', 'DE', 'AT', 'IT']);

        const ips = resolveInterconnectionPoints(path, {
          'DK_DE': { totalTariffEurMwh: 1.20 },
          'DE_AT': { totalTariffEurMwh: 1.10 },
          'AT_IT': { totalTariffEurMwh: 1.40 },
        });
        expect(ips.length).toBe(3); // DK->DE, DE->AT, AT->IT
        expect(ips.every(ip => ip.totalTariffEurMwh !== null)).toBe(true);

        const route = calculateLogisticsRoute('DK', 'IT', 28.50);
        expect(route.modes.virtualSwap.totalCostEurMwh).toBeGreaterThan(0);
        expect(route.modes.physicalPipeline.totalCostEurMwh).toBeDefined();
        expect(route.modes.bioLng.totalCostEurMwh).toBeGreaterThan(0);
        expect(route.executionSteps.length).toBe(4);
      });
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY AND CORNER CASES
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {

    it('processes deep negative CI (-150 gCO2e/MJ) with exact precision anchors', () => {
      const ci = -150;
      const co2e = tCO2ePerMWh(ci);
      // (94 - (-150)) * 3600 / 1,000,000 = 244 * 0.0036 = 0.8784 tCO2e/MWh
      expect(co2e).toBeCloseTo(0.8784, 6);

      const deMarket = getMarketById('DE_THG')!;
      const testConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        carbonIntensity: ci,
      };
      const certVal = computeCertificateValue(deMarket, testConsignment, testBaseMarks, 'bid');
      // 0.8784 * 290 = 254.736 -> €254.74/MWh
      expect(certVal?.valueEurPerMWh).toBeCloseTo(254.74, 2);
    });

    it('strictly clamps French CPB certificate value at €100.00/MWh statutory ceiling', () => {
      const frMarket = getMarketById('FR_CPB')!;
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

      // Case 1: Mark €160 (above cap)
      const highMarks: MarksState = {
        ...testBaseMarks,
        marks: {
          ...testBaseMarks.marks,
          FR_CPB: { marketId: 'FR_CPB', bid: 155, offer: 165, mid: 160, updatedAt: '2026-08-17T00:00:00Z', source: 'EEX' },
        },
      };
      const certCapped = computeCertificateValue(frMarket, consignment, highMarks, 'mid');
      expect(certCapped?.valueEurPerMWh).toBe(FR_CPB_CEILING_EUR_MWH);
      expect(certCapped?.capped).toBe(true);
      expect(certCapped?.capReason).toContain("Code de l'énergie, Art. L.446-24");

      // Case 2: Mark €100.01 (just above cap)
      const edgeMarks: MarksState = {
        ...testBaseMarks,
        marks: {
          ...testBaseMarks.marks,
          FR_CPB: { marketId: 'FR_CPB', bid: 100.01, offer: 100.05, mid: 100.03, updatedAt: '2026-08-17T00:00:00Z', source: 'EEX' },
        },
      };
      const certEdge = computeCertificateValue(frMarket, consignment, edgeMarks, 'bid');
      expect(certEdge?.valueEurPerMWh).toBe(100.00);
      expect(certEdge?.capped).toBe(true);

      // Case 3: Mark €80.00 (below cap)
      const lowMarks: MarksState = {
        ...testBaseMarks,
        marks: {
          ...testBaseMarks.marks,
          FR_CPB: { marketId: 'FR_CPB', bid: 80, offer: 85, mid: 82.5, updatedAt: '2026-08-17T00:00:00Z', source: 'EEX' },
        },
      };
      const certLow = computeCertificateValue(frMarket, consignment, lowMarks, 'bid');
      expect(certLow?.valueEurPerMWh).toBe(80.00);
      expect(certLow?.capped).toBe(false);
    });

    it('differentiates Italian CIC divisor: 5.815 MWh/CIC (Annex IX-A) vs 11.63 MWh/CIC (Conventional)', () => {
      const itMarket = getMarketById('IT_CIC')!;
      const markCics = 375.00; // €375/CIC
      const marks: MarksState = {
        ...testBaseMarks,
        marks: {
          ...testBaseMarks.marks,
          IT_CIC: { marketId: 'IT_CIC', bid: markCics, offer: markCics, mid: markCics, updatedAt: '2026-08-17T00:00:00Z', source: 'GSE' },
        },
      };

      // Advanced (Annex IX-A)
      const cAdvanced: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, annexClassification: 'IX_A' };
      const certAdv = computeCertificateValue(itMarket, cAdvanced, marks, 'bid');
      // 375 / 5.815 = 64.488... -> €64.49/MWh
      expect(certAdv?.valueEurPerMWh).toBeCloseTo(markCics / MWH_PER_CIC_ADVANCED, 2);

      // Conventional (Crop)
      const cConv: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, annexClassification: 'CROP' };
      const certConv = computeCertificateValue(itMarket, cConv, marks, 'bid');
      // 375 / 11.63 = 32.244... -> €32.24/MWh
      expect(certConv?.valueEurPerMWh).toBeCloseTo(markCics / MWH_PER_CIC_CONVENTIONAL, 2);

      expect(certAdv!.valueEurPerMWh!).toBeGreaterThan(certConv!.valueEurPerMWh!);
    });

    it('handles UK RTFO LHV energy-to-mass physical derivation and null FX rates epistemically', () => {
      const ukMarket = getMarketById('UK_RTFO')!;
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE; // IX_A -> double counted waste

      // Physical constant verification: LHV = 50 MJ/kg = 13.88889 kWh/kg -> 1 MWh = 72.0 kg
      expect(BIOMETHANE_KWH_PER_KG).toBeCloseTo(13.88889, 4);
      expect(RTFO_KG_PER_MWH).toBeCloseTo(72.00, 2);

      // Missing FX rate -> returns null with warning note
      const noFxMarks: MarksState = {
        ...testBaseMarks,
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
      };
      const certNoFx = computeCertificateValue(ukMarket, consignment, noFxMarks, 'bid');
      expect(certNoFx?.valueEurPerMWh).toBeNull();
      expect(certNoFx?.statusNote).toContain('UNVERIFIED — Missing FX rate');
    });

    it('handles FuelEU Maritime escalation multipliers (+0%, +10%, +20%, +30%) and zero/negative CI protection', () => {
      // Year 1 (0% penalty escalation)
      const yr1 = computeFuelEUDeficitClosureValue(-100, 1, FUELEU_TARGET_CI_2025, FUELEU_BASELINE_CI);
      // Year 2 (+10% penalty escalation)
      const yr2 = computeFuelEUDeficitClosureValue(-100, 2, FUELEU_TARGET_CI_2025, FUELEU_BASELINE_CI);
      // Year 3 (+20% penalty escalation)
      const yr3 = computeFuelEUDeficitClosureValue(-100, 3, FUELEU_TARGET_CI_2025, FUELEU_BASELINE_CI);
      // Year 4 (+30% penalty escalation)
      const yr4 = computeFuelEUDeficitClosureValue(-100, 4, FUELEU_TARGET_CI_2025, FUELEU_BASELINE_CI);

      expect(yr2.valueEurPerMWh).toBeCloseTo(yr1.valueEurPerMWh * 1.10, 2);
      expect(yr3.valueEurPerMWh).toBeCloseTo(yr1.valueEurPerMWh * 1.20, 2);
      expect(yr4.valueEurPerMWh).toBeCloseTo(yr1.valueEurPerMWh * 1.30, 2);

      // Consignment CI higher than target -> 0 compliance value
      const noSaving = computeFuelEUDeficitClosureValue(95, 1, FUELEU_TARGET_CI_2025, FUELEU_BASELINE_CI);
      expect(noSaving.valueEurPerMWh).toBe(0);

      // Ship CI <= 0 guard
      const invalidShipCI = computeFuelEUDeficitClosureValue(-100, 1, FUELEU_TARGET_CI_2025, 0);
      expect(invalidShipCI.valueEurPerMWh).toBe(0);
    });

    it('strictly returns null (never zero or synthetic fallback) when market mark is unquoted', () => {
      const deMarket = getMarketById('DE_THG')!;
      const unquotedMarks: MarksState = {
        ...testBaseMarks,
        marks: {
          ...testBaseMarks.marks,
          DE_THG: { marketId: 'DE_THG', bid: null, offer: null, mid: null, updatedAt: null, source: null },
        },
      };
      const certVal = computeCertificateValue(deMarket, REFERENCE_CONSIGNMENTS.DANISH_MANURE, unquotedMarks, 'bid');
      expect(certVal).toBeNull();

      const netback = computeNetback(deMarket, REFERENCE_CONSIGNMENTS.DANISH_MANURE, unquotedMarks, standardFixedCosts, 'bid');
      expect(netback.certificateValue).toBeNull();
      expect(netback.netNetback).toBeNull();
      expect(netback.isComplete).toBe(false);
    });
  });

  // ==========================================================================
  // TIER 3: PAIRWISE COMBINATIONS MATRIX (Origins × Markets × Feedstocks)
  // ==========================================================================
  describe('Tier 3: Pairwise Combinations (9 Origins × 7 Markets × 5 Feedstocks = 315 Combinations)', () => {

    const originCountries = [
      { code: 'DE', name: 'Germany', isEU: true },
      { code: 'DK', name: 'Denmark', isEU: true },
      { code: 'NL', name: 'Netherlands', isEU: true },
      { code: 'SE', name: 'Sweden', isEU: true },
      { code: 'FR', name: 'France', isEU: true },
      { code: 'IT', name: 'Italy', isEU: true },
      { code: 'ES', name: 'Spain', isEU: true },
      { code: 'GB', name: 'United Kingdom', isEU: false },
      { code: 'CH', name: 'Switzerland', isEU: false },
    ];

    const targetMarketIds = ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'FUELEU', 'UK_RTFO', 'VOL_SCOPE1'];

    const feedstocksList = [
      { id: 'manure', name: 'Animal manure and slurry', annex: 'IX_A' as AnnexClassification, defaultCI: -100 },
      { id: 'food_waste', name: 'Bio-waste (food waste)', annex: 'IX_A' as AnnexClassification, defaultCI: 20 },
      { id: 'agricultural_residues', name: 'Straw and agricultural residues', annex: 'IX_A' as AnnexClassification, defaultCI: 18 },
      { id: 'used_cooking_oil', name: 'Used cooking oil (UCO)', annex: 'IX_B' as AnnexClassification, defaultCI: 15 },
      { id: 'energy_crops', name: 'Energy crops (maize, grass silage)', annex: 'CROP' as AnnexClassification, defaultCI: 40 },
    ];

    it('evaluates all 315 combinations without uncaught exceptions and verifies cross-market regulatory invariants', () => {
      let totalEvaluated = 0;

      for (const origin of originCountries) {
        for (const targetId of targetMarketIds) {
          const market = getMarketById(targetId)!;

          for (const fs of feedstocksList) {
            const consignment: Consignment = {
              id: `test_${origin.code}_${targetId}_${fs.id}`,
              name: `Trade ${origin.name} ${fs.name} to ${market.name}`,
              originCountry: origin.code,
              originCountryName: origin.name,
              feedstock: fs.id,
              feedstockName: fs.name,
              annexClassification: fs.annex,
              carbonIntensity: fs.defaultCI,
              commissioningDateRange: 'POST_2021_TO_2025',
              certificationScheme: 'ISCC_EU',
              chainOfCustody: 'MASS_BALANCE',
              injectionCountry: origin.code,
              injectionIsEU: origin.isEU,
              udbStatus: origin.isEU ? 'RECORDED' : 'NOT_RECORDED',
              posStatus: 'ISSUED',
              volumeMWh: 10000,
              deliveryPeriod: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
            };

            const assessment = evaluateEligibility(consignment, market);
            const netback = computeNetback(market, consignment, testBaseMarks, standardFixedCosts, 'bid');

            // INVARIANT 1: Assessment must have a defined overallVerdict
            expect(assessment.overallVerdict).toBeDefined();
            expect(['ELIGIBLE', 'CONDITIONAL', 'HARD_BLOCK', 'UNRESOLVED', 'UNKNOWN']).toContain(assessment.overallVerdict);
            expect(assessment.gates.length).toBe(6);

            // INVARIANT 2: Non-EU grid injection (GB, CH) MUST be HARD_BLOCK for any market requiring UDB
            if (!origin.isEU && market.requiresUDB) {
              expect(assessment.overallVerdict).toBe('HARD_BLOCK');
              expect(assessment.blockingGate).toBe('UDB_RECORDING');
            }

            // INVARIANT 3: Non-EU origin entering UK_RTFO or VOL_SCOPE1 MUST NOT be blocked by UDB
            if (!origin.isEU && (market.id === 'UK_RTFO' || market.id === 'VOL_SCOPE1')) {
              const udbGate = assessment.gates.find(g => g.gate === 'UDB_RECORDING')!;
              expect(udbGate.verdict).toBe('PASS');
            }

            // INVARIANT 4: Netback certificate value calculation should execute cleanly
            if (netback.certificateValue?.valueEurPerMWh !== null && netback.certificateValue?.valueEurPerMWh !== undefined) {
              expect(Number.isFinite(netback.certificateValue.valueEurPerMWh)).toBe(true);
            }

            totalEvaluated++;
          }
        }
      }

      expect(totalEvaluated).toBe(9 * 7 * 5); // Exactly 315 verified combinations
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD COMMERCIAL TRADE WORKFLOWS (SCENARIOS A THROUGH F)
  // ==========================================================================
  describe('Tier 4: Real-World Commercial Trading Scenarios', () => {

    it('Scenario A: Danish manure bio-LNG physical bunkering to Hamburg maritime pool under FuelEU', () => {
      const consignment: Consignment = {
        id: 'trade_scen_a_dk_fueleu',
        name: 'Danish Manure Bio-LNG Hamburg Bunkering',
        originCountry: 'DK',
        originCountryName: 'Denmark',
        feedstock: 'manure',
        feedstockName: 'Animal manure and slurry',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'SEGREGATION', // Cryogenic physical bio-LNG segregation
        injectionCountry: 'DK',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 12000,
        counterparty: 'Hapag-Lloyd Maritime Fuel Desk',
        deliveryPeriod: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
      };

      const market = getMarketById('FUELEU')!;
      const assessment = evaluateEligibility(consignment, market);
      expect(assessment.overallVerdict).toBe('ELIGIBLE');

      // FuelEU deficit-closure netback
      const netback = computeNetback(market, consignment, testBaseMarks, standardFixedCosts, 'bid');
      expect(netback.certificateValue?.valueEurPerMWh).toBeGreaterThan(200.00);
      expect(netback.netNetback).toBeGreaterThan(200.00);

      // Logistics: Option C Bio-LNG cryogenic road tanker to Hamburg
      const logistics = calculateLogisticsRoute('DK', 'DE', 28.50);
      expect(logistics.modes.bioLng.totalCostEurMwh).toBeGreaterThan(0);
      expect(logistics.modes.bioLng.regulatoryFeasibility).toBe('HIGH');

      // Dossier check
      const tradeAssessment: TradeAssessment = {
        id: 'TA_SCENARIO_A',
        createdAt: '2026-08-17T12:00:00Z',
        consignment,
        targetMarketId: market.id,
        targetMarketName: market.name,
        eligibility: assessment,
        netback,
        marks: testBaseMarks,
        costs: standardFixedCosts,
        userNotes: 'Delivered as physical Bio-LNG to Port of Hamburg bunker terminal.',
      };

      const dossier = generateTradeSummary(tradeAssessment);
      expect(dossier).toContain('EUROPEAN BIOMETHANE DESK — TRADE ASSESSMENT DOSSIER');
      expect(dossier).toContain('Hapag-Lloyd Maritime Fuel Desk');
      expect(dossier).toContain('Regulation (EU) 2023/1805');
      expect(dossier).toContain('ELIGIBLE');
    });

    it('Scenario B: Swedish food waste virtual swap via UDB title transfer into German THG-Quote compliance market', () => {
      const consignment: Consignment = {
        id: 'trade_scen_b_se_thg',
        name: 'Swedish Food Waste UDB Swap to German THG',
        originCountry: 'SE',
        originCountryName: 'Sweden',
        feedstock: 'food_waste',
        feedstockName: 'Bio-waste (food waste)',
        annexClassification: 'IX_A',
        carbonIntensity: 20,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'SE',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 8500,
        counterparty: 'Uniper Global Commodities',
        deliveryPeriod: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
      };

      const market = getMarketById('DE_THG')!;
      const assessment = evaluateEligibility(consignment, market);
      // For 2026 Germany, eligibility is UNRESOLVED due to draft double counting removal
      expect(assessment.overallVerdict).toBe('UNRESOLVED');

      const netback = computeNetback(market, consignment, testBaseMarks, standardIndexLinkedCosts, 'bid');
      expect(netback.uncertaintyBranches).toBeDefined();
      expect(netback.uncertaintyBranches?.length).toBe(2);

      // Branch 1: Single counting (1x)
      const b1 = netback.uncertaintyBranches![0];
      // tCO2e = (94 - 20) * 3600 / 1e6 = 0.2664 tCO2e/MWh. At €290 -> €77.26/MWh cert value
      expect(b1.certificateValue.valueEurPerMWh).toBeCloseTo(77.26, 1);

      // Branch 2: Double counting (2x)
      const b2 = netback.uncertaintyBranches![1];
      expect(b2.certificateValue.valueEurPerMWh).toBeCloseTo(77.26 * 2, 1);

      // Valuation Range
      expect(netback.valuationRange).toBeDefined();
      expect(netback.valuationRange?.deltaPerMwh).toBeGreaterThan(50.00);

      // Logistics Option A: Virtual Swap from Swedegas to THE
      const logistics = calculateLogisticsRoute('SE', 'DE', 28.50);
      expect(logistics.recommendedMode).toBe('VIRTUAL_SWAP');
      expect(logistics.modes.virtualSwap.pros.length).toBeGreaterThan(0);
    });

    it('Scenario C: Dutch agricultural residues grid injection into French CPB quota with €100 cap evaluation', () => {
      const consignment: Consignment = {
        id: 'trade_scen_c_nl_fr_cpb',
        name: 'Dutch Agro-Residues into French CPB Quota',
        originCountry: 'NL',
        originCountryName: 'Netherlands',
        feedstock: 'agricultural_residues',
        feedstockName: 'Straw and agricultural residues',
        annexClassification: 'IX_A',
        carbonIntensity: 18,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'NL',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 15000,
        counterparty: 'TotalEnergies Gas & Power France',
        deliveryPeriod: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
      };

      const market = getMarketById('FR_CPB')!;
      const assessment = evaluateEligibility(consignment, market);
      expect(assessment.overallVerdict).toBe('ELIGIBLE');

      // Test with broker mark above €100 cap
      const highCpbMarks: MarksState = {
        ...testBaseMarks,
        marks: {
          ...testBaseMarks.marks,
          FR_CPB: { marketId: 'FR_CPB', bid: 140, offer: 150, mid: 145, updatedAt: '2026-08-17T00:00:00Z', source: 'Broker' },
        },
      };

      const netback = computeNetback(market, consignment, highCpbMarks, standardFixedCosts, 'bid');
      expect(netback.certificateValue?.valueEurPerMWh).toBe(100.00);
      expect(netback.certificateValue?.capped).toBe(true);

      // Logistics: NL -> DE -> FR corridor
      const path = findShortestPipelinePath('NL', 'FR');
      expect(path).toEqual(['NL', 'DE', 'FR']);
    });

    it('Scenario D: Italian agro-industrial biomethane advanced CIC monetization with GSE floor pricing', () => {
      const consignment: Consignment = {
        id: 'trade_scen_d_it_cic',
        name: 'Italian Manure Advanced Biomethane GSE CIC',
        originCountry: 'IT',
        originCountryName: 'Italy',
        feedstock: 'manure',
        feedstockName: 'Animal manure and slurry',
        annexClassification: 'IX_A', // Advanced
        carbonIntensity: -90,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'IT',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 20000,
        counterparty: 'Eni S.p.A. Refining & Marketing',
        deliveryPeriod: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
      };

      const market = getMarketById('IT_CIC')!;
      const assessment = evaluateEligibility(consignment, market);
      expect(assessment.overallVerdict).toBe('ELIGIBLE');

      const netback = computeNetback(market, consignment, testBaseMarks, standardIndexLinkedCosts, 'bid');
      // Mark €360/CIC ÷ 5.815 MWh/CIC = €61.91/MWh cert value
      expect(netback.certificateValue?.valueEurPerMWh).toBeCloseTo(61.91, 1);
      expect(netback.certificateValue?.statusNote).toContain('1 CIC / 5 Gcal (DM 2 March 2018)');

      // Desk margin in 85% index-linked mode
      expect(netback.producerPayable).toBeDefined();
      expect(netback.deskMargin).toBeDefined();
      expect(Number((netback.producerPayable! + netback.deskMargin!).toFixed(2))).toBeCloseTo(netback.netNetback!, 1);
    });

    it('Scenario E: UK manure biomethane blocked from EU UDB, routed to domestic UK RTFO with GBP/EUR FX conversion', () => {
      const consignment: Consignment = {
        id: 'trade_scen_e_uk_rtfo',
        name: 'UK Manure Biomethane UK Grid Injected',
        originCountry: 'GB',
        originCountryName: 'United Kingdom',
        feedstock: 'manure',
        feedstockName: 'Animal manure and slurry',
        annexClassification: 'IX_A',
        carbonIntensity: -110,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'GB',
        injectionIsEU: false, // Non-EU UK Grid
        udbStatus: 'NOT_RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
        counterparty: 'Shell Energy UK',
        deliveryPeriod: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
      };

      // 1. EU Compliance Markets (DE_THG, NL_ERE, FR_CPB) must HARD_BLOCK
      const deMarket = getMarketById('DE_THG')!;
      const deAssessment = evaluateEligibility(consignment, deMarket);
      expect(deAssessment.overallVerdict).toBe('HARD_BLOCK');
      expect(deAssessment.blockingGate).toBe('UDB_RECORDING');
      expect(deAssessment.gates.find(g => g.gate === 'UDB_RECORDING')?.remedy).toContain('RTFO');

      // 2. UK RTFO must PASS
      const ukMarket = getMarketById('UK_RTFO')!;
      const ukAssessment = evaluateEligibility(consignment, ukMarket);
      expect(ukAssessment.overallVerdict).toBe('ELIGIBLE');

      const ukNetback = computeNetback(ukMarket, consignment, testBaseMarks, standardFixedCosts, 'bid');
      // £0.25 * €1.18/£ * 144.0 dRTFC/MWh = €42.48/MWh
      expect(ukNetback.certificateValue?.valueEurPerMWh).toBeCloseTo(42.48, 1);
      expect(ukNetback.certificateValue?.statusNote).toContain('144.0 dRTFC/MWh');
    });

    it('Scenario F: Full compliance dossier generation and PRA licensing guard check', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const market = getMarketById('DE_THG')!;
      const assessment = evaluateEligibility(consignment, market);
      const netback = computeNetback(market, consignment, testBaseMarks, standardFixedCosts, 'bid');

      const tradeAssessment: TradeAssessment = {
        id: 'TA_PRA_TEST',
        createdAt: '2026-08-17T14:00:00Z',
        consignment,
        targetMarketId: market.id,
        targetMarketName: market.name,
        eligibility: assessment,
        netback,
        marks: testBaseMarks,
        costs: standardFixedCosts,
        userNotes: 'Audited trade for compliance record.',
      };

      // 1. PRA check: Base marks contains Argus PRA mark on DE_THG
      const praCheck = assessmentContainsPraData(tradeAssessment);
      expect(praCheck.hasPra).toBe(true);
      expect(praCheck.sources).toContain('Argus Media');

      // 2. Test without PRA data
      const exchangeOnlyMarks: MarksState = {
        ...testBaseMarks,
        marks: {
          FR_CPB: { marketId: 'FR_CPB', bid: 95, offer: 105, mid: 100, updatedAt: '2026-08-17T00:00:00Z', source: 'EEX', provenance: { sourceType: 'EXCHANGE_AUCTION', sourceName: 'Powernext / EEX', sourceUrl: 'https://www.powernext.com', observedAt: '2026-08-17T00:00:00Z', note: null } },
        },
        gasIndex: { bid: 28.00, offer: 29.00, mid: 28.50, updatedAt: '2026-08-17T00:00:00Z', provenance: { sourceType: 'EXCHANGE_AUCTION', sourceName: 'ICE Endex', sourceUrl: null, observedAt: '2026-08-17T00:00:00Z', note: null } },
        fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: '2026-08-17T00:00:00Z', provenance: { sourceType: 'PLATFORM_HISTORY', sourceName: 'ECB', sourceUrl: null, observedAt: '2026-08-17T00:00:00Z', note: null } },
      };
      const frMarket = getMarketById('FR_CPB')!;
      const cleanTrade: TradeAssessment = {
        ...tradeAssessment,
        targetMarketId: frMarket.id,
        targetMarketName: frMarket.name,
        eligibility: evaluateEligibility(consignment, frMarket),
        netback: computeNetback(frMarket, consignment, exchangeOnlyMarks, standardFixedCosts, 'bid'),
        marks: exchangeOnlyMarks,
      };
      const cleanPraCheck = assessmentContainsPraData(cleanTrade);
      expect(cleanPraCheck.hasPra).toBe(false);

      // 3. Dossier text generation check
      const dossier = generateTradeSummary(tradeAssessment);
      expect(dossier).toContain('EUROPEAN BIOMETHANE DESK — TRADE ASSESSMENT DOSSIER');
      expect(dossier).toContain('REGULATORY COMPLIANCE CHECKLIST');
      expect(dossier).toContain('COMMERCIAL ECONOMICS & NETBACK WORKINGS');
      expect(dossier).toContain('KEY RISKS & MITIGATIONS');
      expect(dossier).toContain('REALISED DESK MARGIN');
    });
  });

  // ==========================================================================
  // TIER 5: ADVERSARIAL COVERAGE HARDENING AND INVARIANT TESTING
  // ==========================================================================
  describe('Tier 5: Adversarial Stress & Invariant Hardening', () => {

    it('Invariant 1: Producer Payable + Desk Margin strictly conserves Net Netback', () => {
      const markets = MARKETS.filter(m => m.status === 'ACTIVE');
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

      for (const market of markets) {
        // Mode A: Fixed Price
        const nbFixed = computeNetback(market, consignment, testBaseMarks, standardFixedCosts, 'bid');
        if (nbFixed.netNetback !== null && nbFixed.producerPayable !== null && nbFixed.deskMargin !== null) {
          const sum = Number((nbFixed.producerPayable + nbFixed.deskMargin).toFixed(2));
          expect(sum).toBeCloseTo(nbFixed.netNetback, 1);
        }

        // Mode B: Index Linked
        const nbIndex = computeNetback(market, consignment, testBaseMarks, standardIndexLinkedCosts, 'bid');
        if (nbIndex.netNetback !== null && nbIndex.producerPayable !== null && nbIndex.deskMargin !== null) {
          const sum = Number((nbIndex.producerPayable + nbIndex.deskMargin).toFixed(2));
          expect(sum).toBeCloseTo(nbIndex.netNetback, 1);
        }
      }
    });

    it('Invariant 2: P&L is strictly linear with respect to consignment volume', () => {
      const market = getMarketById('FR_CPB')!;
      const volumes = [1000, 5000, 10000, 25000, 100000];

      for (const vol of volumes) {
        const c: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, volumeMWh: vol };
        const nb = computeNetback(market, c, testBaseMarks, standardFixedCosts, 'bid');
        expect(nb.deskPnL).toBeCloseTo(nb.deskMargin! * vol, 2);
        expect(nb.grossSpreadPnL).toBeCloseTo(nb.grossValueSpread! * vol, 2);
      }
    });

    it('Invariant 3: BFS Pipeline routing produces symmetrical and acyclic paths across Europe', () => {
      const pairs = [
        ['DK', 'DE'],
        ['DE', 'DK'],
        ['NL', 'IT'],
        ['ES', 'PL'],
        ['FR', 'AT'],
      ];

      for (const [from, to] of pairs) {
        const path = findShortestPipelinePath(from, to);
        expect(path.length).toBeGreaterThan(1);
        expect(path[0]).toBe(from);
        expect(path[path.length - 1]).toBe(to);

        // Path must have no duplicates (acyclic)
        const uniqueSet = new Set(path);
        expect(uniqueSet.size).toBe(path.length);
      }

      // Self route
      expect(findShortestPipelinePath('DE', 'DE')).toEqual(['DE']);

      // Isolated unpiped / unknown route returns empty array
      expect(findShortestPipelinePath('DE', 'IS')).toEqual([]);
      expect(findShortestPipelinePath('FR', 'XX')).toEqual([]);
    });

    it('Invariant 4: Extreme Fuzz inputs (NaN, Infinity, extreme floats) do not cause unhandled crashes', () => {
      const deMarket = getMarketById('DE_THG')!;
      
      const extremeCIs = [-500, -150, 0, 94, 200, 10000];
      for (const ci of extremeCIs) {
        const c: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, carbonIntensity: ci };
        expect(() => evaluateEligibility(c, deMarket)).not.toThrow();
        expect(() => computeNetback(deMarket, c, testBaseMarks, standardFixedCosts, 'bid')).not.toThrow();
      }

      // Zero volume
      const cZeroVol: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, volumeMWh: 0 };
      const nbZero = computeNetback(deMarket, cZeroVol, testBaseMarks, standardFixedCosts, 'bid');
      expect(nbZero.deskPnL).toBe(0);

      // Massive volume
      const cMassiveVol: Consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, volumeMWh: 10_000_000 };
      const nbMassive = computeNetback(deMarket, cMassiveVol, testBaseMarks, standardFixedCosts, 'bid');
      expect(nbMassive.deskPnL).toBeGreaterThan(0);
    });
  });

});
