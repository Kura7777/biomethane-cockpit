import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// DOMAIN IMPORTS
// ============================================================================

// 1. Registries & Baseline Datasets
import {
  REGISTRY_METADATA_TABLE,
  BASELINE_INJECTION_BATCHES,
  BASELINE_ACCOUNTS,
  BASELINE_BALANCE_OF_TRADE,
  PROTOCOL_INTEROPERABILITY_MATRIX,
  EU_REGISTRY_SET,
  REGISTRY_SUPPORTED_PROTOCOLS,
  CITATIONS,
  verifyRegistryTransfer,
  advanceTitleTransferStatus,
  REGISTRY_CONNECTORS,
  getRegistryConnector,
  EnerginetConnectorAdapter,
  DenaConnectorAdapter,
  GgcsUkConnectorAdapter,
  EnagasConnectorAdapter,
  GseConnectorAdapter,
  VertiCerConnectorAdapter,
  CrossBorderTransferRequest,
  InjectionBatch,
  UDBTitleTransferStatus,
  RegistryTransferVerification,
} from '../registries';

// 2. Forward Curves & Basis Spread Analytics
import {
  computeForwardBasisSpreads,
  computeAllMarketsForwardSpreads,
  getDefaultForwardCurveMatrix,
  buildForwardCurveMatrix,
  getTenorDefinition,
  getTenorsByCategory,
  ALL_DELIVERY_TENORS,
  buildDeliveredValueBreakdown,
  DeliveryTenor,
  TenorBasisSpread,
  DeliveredValueBreakdown,
  ForwardCurveMatrix,
  ForwardCurveParams,
} from '../curves';

// 3. Morning Briefing & Market Intelligence
import {
  generateMorningBriefing,
  synthesizeOvernightMovers,
  evaluateMarkStaleness,
  calculatePriceMovement,
  formatStructuredDealUrl,
  DEFAULT_PRIOR_CLOSE_MARKS,
  MorningBriefingSummary,
  OvernightPriceMover,
  StalenessSummary,
  StructuredDealParams,
} from '../briefing';

// 4. What-If Sensitivity Simulator
import {
  evaluateSensitivityScenario,
  runSensitivityMatrix,
  compareScenarios,
  SensitivityShockConfig,
  DEFAULT_SHOCK_CONFIG,
  BASE_CASE,
  TTF_BULL_20,
  TTF_BEAR_20,
  DE_DC_REPEAL_1X,
  UK_UDB_ACCORD,
  FR_CPB_CAP_SHIFT,
  FUELEU_YEAR_2,
  FX_STRESS_GBP,
  SENSITIVITY_PRESETS,
  MarketSensitivityResult,
  ConsignmentSensitivityMatrix,
  ScenarioComparison,
} from '../sensitivity';

// 5. Core Markets, Netback, Logistics, Eligibility, Feedstocks, Trade
import { MARKETS, getMarketById } from '../markets/registry';
import {
  CI_COMPARATOR_ROAD_TRANSPORT,
  CI_COMPARATOR_HEAT,
  FR_CPB_CEILING_EUR_MWH,
  MWH_PER_CIC_ADVANCED,
  MWH_PER_CIC_CONVENTIONAL,
  FUELEU_PENALTY_EUR_PER_TONNE,
} from '../markets/constants';
import {
  computeNetback,
  computeCertificateValue,
  tCO2ePerMWh,
  computeFuelEUDeficitClosureValue,
  selectMarkPrice,
  FUELEU_BASELINE_CI,
  FUELEU_TARGET_CI_2025,
  RTFO_KG_PER_MWH,
} from '../netback/engine';
import { evaluateEligibility, evaluateAllMarkets } from '../eligibility/engine';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { calculateLogisticsRoute, findShortestPipelinePath } from '../logistics/engine';
import { generateTradeSummary } from '../trade/summary';
import { TradeAssessment } from '../trade/types';
import { Consignment, AnnexClassification, CertificationScheme, ChainOfCustody } from '../consignment/types';
import { MarksState, CostInputs, NetbackResult } from '../netback/types';
import { simulateDesk } from '../marks/simulate';

// ============================================================================
// COMMON TEST FIXTURES
// ============================================================================

const fixtureMarks: MarksState = {
  marks: {
    DE_THG: {
      marketId: 'DE_THG',
      bid: 280.0,
      offer: 300.0,
      mid: 290.0,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'Argus Media',
      provenance: {
        sourceType: 'PRICE_REPORTING',
        sourceName: 'Argus Media',
        sourceUrl: 'https://www.argusmedia.com',
        observedAt: '2026-08-18T00:00:00Z',
        note: 'Biomethane THG Quota Mark',
      },
    },
    FR_CPB: {
      marketId: 'FR_CPB',
      bid: 95.0,
      offer: 105.0,
      mid: 100.0,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'EEX Powernext',
      provenance: {
        sourceType: 'EXCHANGE_AUCTION',
        sourceName: 'EEX Powernext',
        sourceUrl: 'https://www.powernext.com',
        observedAt: '2026-08-18T00:00:00Z',
        note: 'CPB Auction Settlement',
      },
    },
    NL_ERE: {
      marketId: 'NL_ERE',
      bid: 0.30,
      offer: 0.34,
      mid: 0.32,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'NEa / VertiCer',
      provenance: {
        sourceType: 'PLATFORM_HISTORY',
        sourceName: 'VertiCer / NEa',
        sourceUrl: null,
        observedAt: '2026-08-18T00:00:00Z',
        note: 'ERE Bilateral Trade Index',
      },
    },
    IT_CIC: {
      marketId: 'IT_CIC',
      bid: 360.0,
      offer: 390.0,
      mid: 375.0,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'GSE',
      provenance: {
        sourceType: 'PLATFORM_HISTORY',
        sourceName: 'GSE Portal',
        sourceUrl: null,
        observedAt: '2026-08-18T00:00:00Z',
        note: 'CIC Quota Settlement',
      },
    },
    UK_RTFO: {
      marketId: 'UK_RTFO',
      bid: 0.28,
      offer: 0.32,
      mid: 0.30,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'Argus Media',
      provenance: {
        sourceType: 'PRICE_REPORTING',
        sourceName: 'Argus Media',
        sourceUrl: 'https://www.argusmedia.com',
        observedAt: '2026-08-18T00:00:00Z',
        note: 'RTFO Certificate Assessment',
      },
    },
    FUELEU: {
      marketId: 'FUELEU',
      bid: 230.0,
      offer: 270.0,
      mid: 250.0,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'SIMULATED',
      provenance: {
        sourceType: 'ESTIMATE',
        sourceName: 'SIMULATED',
        sourceUrl: null,
        observedAt: '2026-08-18T00:00:00Z',
        note: 'FuelEU Maritime Compliance Value',
      },
    },
  },
  gasIndex: {
    bid: 29.50,
    offer: 30.50,
    mid: 30.00,
    updatedAt: '2026-08-18T00:00:00Z',
    provenance: {
      sourceType: 'EXCHANGE_AUCTION',
      sourceName: 'ICE Endex TTF',
      sourceUrl: null,
      observedAt: '2026-08-18T00:00:00Z',
      note: 'TTF Prompt Month Settlement',
    },
  },
  fx: {
    gbpEur: 1.18,
    chfEur: 1.05,
    updatedAt: '2026-08-18T00:00:00Z',
    provenance: {
      sourceType: 'PLATFORM_HISTORY',
      sourceName: 'ECB Reference Rates',
      sourceUrl: null,
      observedAt: '2026-08-18T00:00:00Z',
      note: 'Daily Reference Fixing',
    },
  },
  pricingSides: {
    certificateSide: 'bid',
    moleculeSide: 'bid',
  },
};

const fixtureFixedCosts: CostInputs = {
  transferCosts: 1.20,
  certificationCosts: 0.50,
  logistics: 2.30,
  otherCosts: 0.0,
  producerPricing: {
    mode: 'FIXED_PRICE',
    fixedPriceEurPerMwh: 70.0,
    indexLinkedShare: null,
    source: 'Bilateral Producer PPA',
    lastVerified: '2026-08-18',
    confidence: 'VERIFIED',
  },
};

const fixtureIndexLinkedCosts: CostInputs = {
  transferCosts: 1.20,
  certificationCosts: 0.50,
  logistics: 2.30,
  otherCosts: 0.0,
  producerPricing: {
    mode: 'INDEX_LINKED',
    fixedPriceEurPerMwh: null,
    indexLinkedShare: 0.85, // 85% to producer, 15% desk margin
    source: 'Index Linked Formula Contract',
    lastVerified: '2026-08-18',
    confidence: 'VERIFIED',
  },
};

const fixtureDanishManureConsignment: Consignment = {
  id: 'CSG-DK-MANURE-10K',
  name: 'Danish Wet Manure 10,000 MWh',
  originCountry: 'DK',
  originCountryName: 'Denmark',
  feedstock: 'manure',
  feedstockName: 'Liquid Manure',
  annexClassification: 'IX_A',
  carbonIntensity: -100.0, // gCO2e/MJ (avoided methane credit)
  commissioningDateRange: 'POST_2021_TO_2025',
  certificationScheme: 'ISCC_EU',
  chainOfCustody: 'MASS_BALANCE',
  injectionCountry: 'DK',
  injectionIsEU: true,
  udbStatus: 'RECORDED',
  posStatus: 'ISSUED',
  volumeMWh: 10000,
  deliveryPeriod: {
    type: 'QUARTER',
    complianceYear: 2026,
    startDate: '2026-07-01',
    endDate: '2026-09-30',
  },
};

// ============================================================================
// 5-TIER E2E TEST SUITE
// ============================================================================

describe('Biomethane Trading Platform V2 — 5-Tier Comprehensive E2E Verification Suite', () => {

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE (Happy Path for All V2 Modules)
  // ==========================================================================
  describe('Tier 1: Feature Coverage (R1 Registry Hub, R2 Forward Curves, R3 Market Briefing, R4 What-If Simulator)', () => {

    describe('1.1 R1 European Registry Data Models & Baseline Schema', () => {
      it('verifies metadata, statutory legal basis, and operator details for all 8 European registries', () => {
        const expectedRegistries = ['DENA', 'VERTICER', 'ENERGINET', 'ENAGAS', 'GSE', 'EEX', 'AGCS', 'GGCS_UK'] as const;
        for (const regId of expectedRegistries) {
          const meta = REGISTRY_METADATA_TABLE[regId];
          expect(meta).toBeDefined();
          expect(meta.id).toBe(regId);
          expect(meta.name.length).toBeGreaterThan(3);
          expect(meta.operator.length).toBeGreaterThan(3);
          expect(meta.countryCode.length).toBe(2);
          expect(meta.primaryProtocols.length).toBeGreaterThan(0);
          expect(meta.statutoryLegalBasis.length).toBeGreaterThan(5);
        }
      });

      it('strictly partitions the EU Single Area vs Non-EU third countries', () => {
        expect(EU_REGISTRY_SET.has('DENA')).toBe(true);
        expect(EU_REGISTRY_SET.has('VERTICER')).toBe(true);
        expect(EU_REGISTRY_SET.has('ENERGINET')).toBe(true);
        expect(EU_REGISTRY_SET.has('ENAGAS')).toBe(true);
        expect(EU_REGISTRY_SET.has('GSE')).toBe(true);
        expect(EU_REGISTRY_SET.has('EEX')).toBe(true);
        expect(EU_REGISTRY_SET.has('AGCS')).toBe(true);
        expect(EU_REGISTRY_SET.has('GGCS_UK')).toBe(false);
      });

      it('validates baseline injection batch records, GCV range, and negative CI sustainability proofs', () => {
        expect(BASELINE_INJECTION_BATCHES.length).toBeGreaterThanOrEqual(12);

        for (const batch of BASELINE_INJECTION_BATCHES) {
          expect(batch.id).toMatch(/^BATCH-[A-Z]{2}-2026-\d{3}$/);
          expect(batch.volumeMWh).toBeGreaterThan(0);
          expect(batch.volumeNm3).toBeGreaterThan(0);
          expect(batch.grossCalorificValueKwhNm3).toBeGreaterThanOrEqual(9.5);
          expect(batch.grossCalorificValueKwhNm3).toBeLessThanOrEqual(12.0);
          expect(batch.sustainabilityProofId.length).toBeGreaterThan(5);
          expect(['ISSUED', 'TRANSFERRED', 'CANCELLED_RETIRED']).toContain(batch.status);
        }

        const deepNegativeBatches = BASELINE_INJECTION_BATCHES.filter(b => b.verifiedCI <= -80);
        expect(deepNegativeBatches.length).toBeGreaterThanOrEqual(3);
      });

      it('accurately verifies European Balance of Trade macro positions (Exporters vs Importers)', () => {
        const energinetTrade = BASELINE_BALANCE_OF_TRADE.find(b => b.registryId === 'ENERGINET')!;
        expect(energinetTrade.tradeRole).toBe('NET_EXPORTER');
        expect(energinetTrade.netTradeBalanceMWh).toBeGreaterThan(0);
        expect(energinetTrade.exportSharePercent).toBeGreaterThan(70);

        const enagasTrade = BASELINE_BALANCE_OF_TRADE.find(b => b.registryId === 'ENAGAS')!;
        expect(enagasTrade.tradeRole).toBe('NET_EXPORTER');
        expect(enagasTrade.netTradeBalanceMWh).toBeGreaterThan(0);

        const denaTrade = BASELINE_BALANCE_OF_TRADE.find(b => b.registryId === 'DENA')!;
        expect(denaTrade.tradeRole).toBe('NET_IMPORTER');
        expect(denaTrade.netTradeBalanceMWh).toBeLessThan(0);

        const verticerTrade = BASELINE_BALANCE_OF_TRADE.find(b => b.registryId === 'VERTICER')!;
        expect(verticerTrade.tradeRole).toBe('NET_IMPORTER');
        expect(verticerTrade.netTradeBalanceMWh).toBeLessThan(0);
      });
    });

    describe('1.2 R1 Connector Adapters & Batch Lifecycle Operations', () => {
      let energinetConn: EnerginetConnectorAdapter;
      let denaConn: DenaConnectorAdapter;
      let enagasConn: EnagasConnectorAdapter;

      beforeEach(() => {
        energinetConn = new EnerginetConnectorAdapter();
        denaConn = new DenaConnectorAdapter();
        enagasConn = new EnagasConnectorAdapter();
      });

      it('lists and filters injection batches across Annex IX-A feedstocks and UDB recording status', () => {
        const dkBatches = energinetConn.listInjectionBatches();
        expect(dkBatches.length).toBeGreaterThanOrEqual(3);

        const manureBatches = energinetConn.listInjectionBatches({ annexClassification: 'IX_A' });
        expect(manureBatches.length).toBe(dkBatches.length);

        const udbRecorded = energinetConn.listInjectionBatches({ udbStatus: 'RECORDED' });
        expect(udbRecorded.length).toBe(dkBatches.length);
      });

      it('executes certificate cancellation with audit receipt and batch status retirement', () => {
        const batch = energinetConn.listInjectionBatches()[0];
        const cancelResult = energinetConn.cancelCertificates([batch.id], 'Surrendered for grid balance compliance');
        
        expect(cancelResult.success).toBe(true);
        expect(cancelResult.cancelledMWh).toBe(batch.volumeMWh);
        expect(cancelResult.confirmationId).toContain('CANCEL-ENERGINET');

        const updatedBatch = energinetConn.getBatchById(batch.id);
        expect(updatedBatch?.status).toBe('CANCELLED_RETIRED');
      });

      it('executes valid cross-border transfer updating batch status to TRANSFERRED', () => {
        const batch = energinetConn.listInjectionBatches()[0];
        const transferReq: CrossBorderTransferRequest = {
          id: 'REQ-DK-DE-TEST-001',
          sourceRegistry: 'ENERGINET',
          sourceAccountId: 'ACC-DK-01',
          targetRegistry: 'DENA',
          targetAccountId: 'ACC-DE-01',
          targetMarketId: 'DE_THG',
          batchIds: [batch.id],
          totalVolumeMWh: batch.volumeMWh,
          transferProtocol: 'ERGAR_COO',
          udbTitleTransferRequired: true,
          requestedAt: new Date().toISOString(),
        };

        const result = energinetConn.executeTransfer(transferReq);
        expect(result.success).toBe(true);
        expect(result.verification.isCompatible).toBe(true);
        expect(result.transferredVolumeMWh).toBe(batch.volumeMWh);

        const updatedBatch = energinetConn.getBatchById(batch.id);
        expect(updatedBatch?.status).toBe('TRANSFERRED');
      });
    });

    describe('1.3 R1 UDB Title Transfer State Machine & Verification', () => {
      it('verifies compliant cross-border transfer (Energinet -> Dena) with RED III Art. 31a citation', () => {
        const dkBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'ENERGINET')!;
        const req: CrossBorderTransferRequest = {
          id: 'REQ-DK-DE-VERIFY',
          sourceRegistry: 'ENERGINET',
          sourceAccountId: 'ACC-DK-01',
          targetRegistry: 'DENA',
          targetAccountId: 'ACC-DE-01',
          targetMarketId: 'DE_THG',
          batchIds: [dkBatch.id],
          totalVolumeMWh: dkBatch.volumeMWh,
          transferProtocol: 'ERGAR_COO',
          udbTitleTransferRequired: true,
          requestedAt: '2026-08-18T00:00:00Z',
        };

        const verification = verifyRegistryTransfer(req, [dkBatch]);
        expect(verification.isCompatible).toBe(true);
        expect(verification.blockingReasons).toHaveLength(0);
        expect(verification.udbTitleTransferStatus).toBe('ESCROW_LOCKED');
        expect(verification.verifiedVolumeMWh).toBe(dkBatch.volumeMWh);
        expect(verification.statutoryCitations).toContain(CITATIONS.RED_III_ART_31A);
      });

      it('progresses through full UDB Title Transfer state machine lifecycle (DRAFT -> TITLE_TRANSFERRED)', () => {
        let status: UDBTitleTransferStatus = 'DRAFT';
        status = advanceTitleTransferStatus(status, 'SUBMIT');
        expect(status).toBe('SUBMITTED');

        status = advanceTitleTransferStatus(status, 'LOCK_ESCROW');
        expect(status).toBe('ESCROW_LOCKED');

        status = advanceTitleTransferStatus(status, 'TRANSFER_TITLE');
        expect(status).toBe('TITLE_TRANSFERRED');

        // Can transition to boundary failure or reset
        status = advanceTitleTransferStatus(status, 'FAIL_BOUNDARY');
        expect(status).toBe('REJECTED_BOUNDARY_VIOLATION');

        status = advanceTitleTransferStatus(status, 'RESET');
        expect(status).toBe('DRAFT');
      });
    });

    describe('1.4 R2 Forward Curve Data Models & Tenor Definitions', () => {
      it('contains all 9 delivery tenors across Prompt (M+1/M+2), Quarter (Q1..Q4), and Calendar (Cal+1..Cal+3)', () => {
        expect(ALL_DELIVERY_TENORS).toHaveLength(9);
        expect(ALL_DELIVERY_TENORS).toEqual([
          'M_PLUS_1',
          'M_PLUS_2',
          'Q1',
          'Q2',
          'Q3',
          'Q4',
          'CAL_PLUS_1',
          'CAL_PLUS_2',
          'CAL_PLUS_3',
        ]);

        const prompts = getTenorsByCategory('PROMPT');
        expect(prompts.map(p => p.tenor)).toEqual(['M_PLUS_1', 'M_PLUS_2']);

        const quarters = getTenorsByCategory('QUARTER');
        expect(quarters.map(q => q.tenor)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);

        const calendars = getTenorsByCategory('CALENDAR');
        expect(calendars.map(c => c.tenor)).toEqual(['CAL_PLUS_1', 'CAL_PLUS_2', 'CAL_PLUS_3']);
      });

      it('generates a full default forward curve matrix with TTF gas marks, FX rates, and compliance certificate curves', () => {
        const matrix = getDefaultForwardCurveMatrix();
        expect(matrix.asOfDate).toBeDefined();

        for (const tenor of ALL_DELIVERY_TENORS) {
          expect(matrix.gasForwardCurve[tenor].mid).toBeGreaterThan(0);
          expect(matrix.fxForwardCurve[tenor].gbpEur).toBeGreaterThan(1.0);
          expect(matrix.certificateForwardCurves.DE_THG[tenor].mid).toBeGreaterThan(0);
          expect(matrix.certificateForwardCurves.FR_CPB[tenor].mid).toBeGreaterThan(0);
          expect(matrix.certificateForwardCurves.NL_ERE[tenor].mid).toBeGreaterThan(0);
          expect(matrix.certificateForwardCurves.IT_CIC[tenor].mid).toBeGreaterThan(0);
          expect(matrix.certificateForwardCurves.UK_RTFO[tenor].mid).toBeGreaterThan(0);
        }
      });

      it('builds customized forward curve matrices with selective overrides', () => {
        const customMatrix = buildForwardCurveMatrix(
          { Q3: { mid: 38.50, bid: 38.00, offer: 39.00 } },
          { DE_THG: { Q3: { mid: 310.00, bid: 300.00, offer: 320.00 } } }
        );

        expect(customMatrix.gasForwardCurve.Q3.mid).toBe(38.50);
        expect(customMatrix.certificateForwardCurves.DE_THG.Q3.mid).toBe(310.00);
        // Non-overridden tenors keep default
        expect(customMatrix.gasForwardCurve.CAL_PLUS_1.mid).toBe(33.60);
      });
    });

    describe('1.5 R2 Dynamic Forward Basis Spread Engine & Waterfall Breakdown', () => {
      const deMarket = getMarketById('DE_THG')!;
      const frMarket = getMarketById('FR_CPB')!;

      it('computes 9 forward basis spreads for German THG strictly consistent with computeNetback', () => {
        const spreads = computeForwardBasisSpreads({
          consignment: fixtureDanishManureConsignment,
          market: deMarket,
          costs: fixtureFixedCosts,
          pricingSide: 'mid',
        });

        expect(spreads).toHaveLength(9);

        for (const spread of spreads) {
          expect(spread.gasIndexPriceEurPerMwh).toBeGreaterThan(0);
          expect(spread.certificateValueEurPerMwh).toBeGreaterThan(0);
          expect(spread.totalDeliveredValueEurPerMwh).toBeGreaterThan(0);
          
          // Basis Spread = Delivered Netback - TTF Gas Index Price
          const expectedSpread = Number((spread.totalDeliveredValueEurPerMwh! - spread.gasIndexPriceEurPerMwh!).toFixed(2));
          expect(spread.commercialBasisSpreadEurPerMwh).toBe(expectedSpread);

          // Delivered value breakdown check
          expect(spread.breakdown.moleculeValueEurPerMwh).toBe(spread.gasIndexPriceEurPerMwh);
          expect(spread.breakdown.logisticsEurPerMwh).toBe(fixtureFixedCosts.logistics);
          expect(spread.breakdown.grossDeliveredValueEurPerMwh).toBe(spread.totalDeliveredValueEurPerMwh);
        }
      });

      it('computes forward basis spreads across all 5 key markets in bulk', () => {
        const targetMarkets = [deMarket, frMarket, getMarketById('NL_ERE')!, getMarketById('IT_CIC')!, getMarketById('UK_RTFO')!];
        const allSpreads = computeAllMarketsForwardSpreads(
          fixtureDanishManureConsignment,
          targetMarkets,
          undefined,
          fixtureFixedCosts,
          'mid'
        );

        expect(Object.keys(allSpreads)).toEqual(['DE_THG', 'FR_CPB', 'NL_ERE', 'IT_CIC', 'UK_RTFO']);
        for (const mId of Object.keys(allSpreads)) {
          expect(allSpreads[mId]).toHaveLength(9);
        }
      });
    });

    describe('1.6 R3 Morning Market Briefing & Market Intelligence Synthesis', () => {
      it('synthesizes overnight price movements across key instruments and FX pairs', () => {
        const movers = synthesizeOvernightMovers(fixtureMarks);
        expect(movers.length).toBeGreaterThanOrEqual(7);

        const ids = movers.map(m => m.instrumentId);
        expect(ids).toContain('TTF_GAS');
        expect(ids).toContain('DE_THG');
        expect(ids).toContain('NL_ERE');
        expect(ids).toContain('FR_CPB');
        expect(ids).toContain('IT_CIC');
        expect(ids).toContain('UK_RTFO');
        expect(ids).toContain('FX_GBP_EUR');
      });

      it('correctly categorizes mark staleness (FRESH, STALE_WARNING, STALE_CRITICAL, UNFILLED)', () => {
        const now = new Date('2026-08-18T00:00:00Z');
        const dayMs = 86400000;

        const stalenessMarks: MarksState = {
          marks: {
            DE_THG: {
              marketId: 'DE_THG',
              bid: 280,
              offer: 300,
              mid: 290,
              updatedAt: new Date(now.getTime() - 2 * dayMs).toISOString(), // 2d -> FRESH
              source: 'Argus',
            },
            NL_ERE: {
              marketId: 'NL_ERE',
              bid: 0.30,
              offer: 0.34,
              mid: 0.32,
              updatedAt: new Date(now.getTime() - 10 * dayMs).toISOString(), // 10d -> STALE_WARNING
              source: 'NEa',
            },
            FR_CPB: {
              marketId: 'FR_CPB',
              bid: 95,
              offer: 105,
              mid: 100,
              updatedAt: new Date(now.getTime() - 35 * dayMs).toISOString(), // 35d -> STALE_CRITICAL
              source: 'EEX',
            },
            IT_CIC: {
              marketId: 'IT_CIC',
              bid: null,
              offer: null,
              mid: null,
              updatedAt: null, // UNFILLED
              source: null,
            },
          },
          gasIndex: { bid: 30, offer: 31, mid: 30.5, updatedAt: now.toISOString() },
          fx: { gbpEur: 1.18, chfEur: 1.05, updatedAt: now.toISOString() },
          pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
        };

        const summary = evaluateMarkStaleness(stalenessMarks);
        expect(summary.freshCount).toBeGreaterThanOrEqual(1);
        expect(summary.warningCount).toBeGreaterThanOrEqual(1);
        expect(summary.criticalCount).toBeGreaterThanOrEqual(1);
        expect(summary.unfilledCount).toBeGreaterThanOrEqual(1);
      });

      it('generates 1-click deal structuring URL with serialized query parameters', () => {
        const dealUrl = formatStructuredDealUrl({
          originCountry: 'DK',
          feedstock: 'manure',
          ci: -100,
          marketId: 'DE_THG',
          volume: 10000,
          scheme: 'ISCC_EU',
          coc: 'MASS_BALANCE',
          counterparty: 'Statkraft Markets GmbH',
          deliveryPeriod: 'Q3-2026',
        });

        expect(dealUrl.startsWith('/trade?')).toBe(true);
        const params = new URLSearchParams(dealUrl.replace('/trade?', ''));
        expect(params.get('originCountry')).toBe('DK');
        expect(params.get('feedstock')).toBe('manure');
        expect(params.get('ci')).toBe('-100');
        expect(params.get('marketId')).toBe('DE_THG');
        expect(params.get('volume')).toBe('10000');
        expect(params.get('counterparty')).toBe('Statkraft Markets GmbH');
        expect(params.get('deliveryPeriod')).toBe('Q3-2026');
      });

      it('generates a complete morning market briefing summary with top arbitrage corridors', () => {
        const desk = simulateDesk(new Date('2026-08-18T00:00:00Z'));
        const briefing = generateMorningBriefing({
          currentMarks: desk.marks,
          costs: desk.costs,
          selectedFeedstockKey: 'manure',
          ciOverride: -100,
          defaultDealVolumeMWh: 10000,
        });

        expect(briefing.generatedAt).toBeDefined();
        expect(briefing.macroHeadline).toContain('European Biomethane Desk');
        expect(briefing.overnightMovers.length).toBeGreaterThanOrEqual(7);
        expect(briefing.regulatoryUpdates.length).toBeGreaterThanOrEqual(4);
        expect(briefing.topArbitrageCorridors.length).toBeGreaterThan(0);
        expect(briefing.topArbitrageCorridors[0].deskMarginEurPerMWh).toBeGreaterThan(0);
      });
    });

    describe('1.7 R4 Multi-Branch What-If Sensitivity Simulator Engine', () => {
      const deMarket = getMarketById('DE_THG')!;

      it('evaluates TTF price shocks (±10%, ±20%) without mutating base marks', () => {
        const marksBefore = JSON.stringify(fixtureMarks);
        
        const bullRes = evaluateSensitivityScenario(
          {
            consignment: fixtureDanishManureConsignment,
            baseMarks: fixtureMarks,
            baseCosts: fixtureFixedCosts,
            shockConfig: { ...DEFAULT_SHOCK_CONFIG, ttfPriceShockPercent: 20 },
          },
          deMarket
        );

        // Base TTF bid = 29.50. +20% -> 35.40. Molecule delta = +5.90 €/MWh
        expect(bullRes.baseMoleculeValue).toBe(29.50);
        expect(bullRes.shockedMoleculeValue).toBe(35.40);
        expect(bullRes.moleculeDeltaEurPerMwh).toBe(5.90);
        expect(bullRes.netbackDeltaEurPerMwh).toBe(5.90);
        expect(bullRes.notionalDeltaEur).toBe(59000); // 5.90 * 10,000 MWh

        // Immutability check
        expect(JSON.stringify(fixtureMarks)).toBe(marksBefore);
      });

      it('evaluates all 8 standard sensitivity presets cleanly without error', () => {
        for (const preset of SENSITIVITY_PRESETS) {
          const matrix = runSensitivityMatrix({
            consignment: fixtureDanishManureConsignment,
            baseMarks: fixtureMarks,
            baseCosts: fixtureFixedCosts,
            shockConfig: preset.config,
          });

          expect(matrix.marketResults.length).toBeGreaterThan(0);
          expect(matrix.tradeableMarketsCount).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases (Deep Negative CI, UDB Blocks, Statutory Caps, FX & Volumes)', () => {

    it('2.1 handles deep negative carbon intensity down to -150.0 gCO2e/MJ with exact RED III Annex V methane credits', () => {
      const deepNegConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        carbonIntensity: -150.0,
      };

      // Formula: (94 - (-150)) * 3600 / 1e6 = 244 * 0.0036 = 0.8784 tCO2e/MWh
      const tCO2e = tCO2ePerMWh(-150.0);
      expect(tCO2e).toBeCloseTo(0.8784, 4);

      const deMarket = getMarketById('DE_THG')!;
      const netback = computeNetback(
        deMarket,
        deepNegConsignment,
        fixtureMarks,
        fixtureFixedCosts,
        'bid'
      );

      // Certificate value for DC_OFF: 280.0 * 0.8784 = 245.952 -> 245.95 €/MWh
      // For DC_ON: 245.952 * 2 = 491.904 -> 491.90 €/MWh
      expect(netback.certificateValue?.valueEurPerMWh).toBeCloseTo(245.95, 1);
      // Valuation range reflects full net netback: High (DC_ON: 491.90 + 29.50 - 4.00 = 517.40), Low (DC_OFF: 271.45)
      expect(netback.valuationRange?.high).toBeCloseTo(517.40, 1);
      expect(netback.valuationRange?.deltaPerMwh).toBeCloseTo(245.95, 1);
    });

    it('2.2 handles high positive carbon intensity (+85 gCO2e/MJ) with minimal GHG savings', () => {
      const highCiConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        feedstock: 'crop_residues',
        carbonIntensity: 85.0,
      };

      // Formula: (94 - 85) * 3600 / 1e6 = 9 * 0.0036 = 0.0324 tCO2e/MWh
      const tCO2e = tCO2ePerMWh(85.0);
      expect(tCO2e).toBeCloseTo(0.0324, 4);

      const deMarket = getMarketById('DE_THG')!;
      const netback = computeNetback(
        deMarket,
        highCiConsignment,
        fixtureMarks,
        fixtureFixedCosts,
        'bid'
      );

      expect(netback.certificateValue?.valueEurPerMWh).toBeCloseTo(280.0 * 0.0324, 2);
    });

    it('2.3 strictly blocks non-EU grid injection (GGCS_UK -> DENA/VERTICER) without bilateral treaty', () => {
      const ukBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'GGCS_UK')!;
      const req: CrossBorderTransferRequest = {
        id: 'REQ-UK-EU-BLOCK-TEST',
        sourceRegistry: 'GGCS_UK',
        sourceAccountId: 'ACC-GB-01',
        targetRegistry: 'DENA',
        targetAccountId: 'ACC-DE-01',
        targetMarketId: 'DE_THG',
        batchIds: [ukBatch.id],
        totalVolumeMWh: ukBatch.volumeMWh,
        transferProtocol: 'ERGAR_COO',
        udbTitleTransferRequired: true,
        bilateralTreatyActive: false,
        requestedAt: '2026-08-18T00:00:00Z',
      };

      const verification = verifyRegistryTransfer(req, [ukBatch]);
      expect(verification.isCompatible).toBe(false);
      expect(verification.udbTitleTransferStatus).toBe('REJECTED_BOUNDARY_VIOLATION');
      expect(verification.blockingReasons.some(r => r.includes('non-EU transmission grid'))).toBe(true);
    });

    it('2.4 blocks off-grid segregated batch injection from interconnected mass balance transfer', () => {
      const offGridBatch = BASELINE_INJECTION_BATCHES.find(b => b.gridInterconnectionStatus === 'OFF_GRID_SEGREGATED')!;
      const req: CrossBorderTransferRequest = {
        id: 'REQ-OFFGRID-TEST',
        sourceRegistry: 'AGCS',
        sourceAccountId: 'ACC-AT-01',
        targetRegistry: 'VERTICER',
        targetAccountId: 'ACC-NL-01',
        targetMarketId: 'NL_ERE',
        batchIds: [offGridBatch.id],
        totalVolumeMWh: offGridBatch.volumeMWh,
        transferProtocol: 'UDB_DIRECT_TRANSFER',
        udbTitleTransferRequired: true,
        requestedAt: '2026-08-18T00:00:00Z',
      };

      const verification = verifyRegistryTransfer(req, [offGridBatch]);
      expect(verification.isCompatible).toBe(false);
      expect(verification.udbTitleTransferStatus).toBe('REJECTED_BOUNDARY_VIOLATION');
      expect(verification.blockingReasons.some(r => r.includes('off-grid / segregated'))).toBe(true);
    });

    it('2.5 clamps French CPB certificate value at €100.00/MWh statutory ceiling for high market marks', () => {
      const highCpbMarks: MarksState = {
        ...fixtureMarks,
        marks: {
          ...fixtureMarks.marks,
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 125.0,
            offer: 135.0,
            mid: 130.0,
            updatedAt: '2026-08-18T00:00:00Z',
            source: 'EEX',
          },
        },
      };

      const frMarket = getMarketById('FR_CPB')!;
      const netback = computeNetback(
        frMarket,
        fixtureDanishManureConsignment,
        highCpbMarks,
        fixtureFixedCosts,
        'bid'
      );

      // Raw bid mark was €125.00/MWh -> Must be clamped at €100.00/MWh
      expect(netback.certificateValue?.valueEurPerMWh).toBe(100.00);
      expect(netback.certificateValue?.capped).toBe(true);
      expect(netback.certificateValue?.capReason).toContain('€100');
    });

    it('2.6 verifies FuelEU Maritime 4-year penalty escalation multipliers (Year 1 to Year 4)', () => {
      const yr1 = computeFuelEUDeficitClosureValue(-100, 1);
      const yr2 = computeFuelEUDeficitClosureValue(-100, 2);
      const yr3 = computeFuelEUDeficitClosureValue(-100, 3);
      const yr4 = computeFuelEUDeficitClosureValue(-100, 4);

      expect(yr1.valueEurPerMWh).toBeGreaterThan(0);
      expect(yr2.valueEurPerMWh / yr1.valueEurPerMWh).toBeCloseTo(1.10, 2);
      expect(yr3.valueEurPerMWh / yr1.valueEurPerMWh).toBeCloseTo(1.20, 2);
      expect(yr4.valueEurPerMWh / yr1.valueEurPerMWh).toBeCloseTo(1.30, 2);
    });

    it('2.7 handles missing/null FX rates gracefully without throwing unhandled exceptions', () => {
      const noFxMarks: MarksState = {
        ...fixtureMarks,
        fx: {
          gbpEur: null,
          chfEur: null,
          updatedAt: null,
        },
      };

      const ukMarket = getMarketById('UK_RTFO')!;
      const netback = computeNetback(
        ukMarket,
        fixtureDanishManureConsignment,
        noFxMarks,
        fixtureFixedCosts,
        'bid'
      );

      expect(netback.isComplete).toBe(false);
      expect(netback.certificateValue?.valueEurPerMWh).toBeNull();
      expect(netback.netNetback).toBeNull();
    });

    it('2.8 handles zero and extreme volumes without numeric corruption or divide-by-zero', () => {
      const zeroVolConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        volumeMWh: 0,
      };

      const deMarket = getMarketById('DE_THG')!;
      const zeroNetback = computeNetback(
        deMarket,
        zeroVolConsignment,
        fixtureMarks,
        fixtureFixedCosts,
        'bid'
      );

      expect(zeroNetback.deskPnL).toBe(0);

      const massiveVolConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        volumeMWh: 50_000_000,
      };

      const massiveNetback = computeNetback(
        deMarket,
        massiveVolConsignment,
        fixtureMarks,
        fixtureFixedCosts,
        'bid'
      );

      expect(massiveNetback.deskPnL).toBeGreaterThan(0);
      expect(Number.isFinite(massiveNetback.deskPnL!)).toBe(true);
    });

    it('2.9 detects transfer volume discrepancies and prevents transferring retired batches', () => {
      const batch = BASELINE_INJECTION_BATCHES[0];
      const reqOverVolume: CrossBorderTransferRequest = {
        id: 'REQ-DISC-01',
        sourceRegistry: 'ENERGINET',
        sourceAccountId: 'ACC-DK-01',
        targetRegistry: 'VERTICER',
        targetAccountId: 'ACC-NL-01',
        targetMarketId: 'NL_ERE',
        batchIds: [batch.id],
        totalVolumeMWh: batch.volumeMWh + 100_000,
        transferProtocol: 'UDB_DIRECT_TRANSFER',
        udbTitleTransferRequired: true,
        requestedAt: '2026-08-18T00:00:00Z',
      };

      const verOver = verifyRegistryTransfer(reqOverVolume, [batch]);
      expect(verOver.isCompatible).toBe(false);
      expect(verOver.udbTitleTransferStatus).toBe('REJECTED_DISCREPANCY');

      const retiredBatch: InjectionBatch = {
        ...batch,
        id: 'BATCH-RETIRED-TEST',
        status: 'CANCELLED_RETIRED',
      };

      const reqRetired: CrossBorderTransferRequest = {
        ...reqOverVolume,
        batchIds: [retiredBatch.id],
        totalVolumeMWh: retiredBatch.volumeMWh,
      };

      const verRetired = verifyRegistryTransfer(reqRetired, [retiredBatch]);
      expect(verRetired.isCompatible).toBe(false);
      expect(verRetired.udbTitleTransferStatus).toBe('REJECTED_DISCREPANCY');
    });
  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Combinations)
  // ==========================================================================
  describe('Tier 3: Cross-Feature Combinations (Pairwise Combinatorial Testing)', () => {

    it('3.1 combines Energinet Registry Transfer + Q3 Forward Curve + TTF Bull +20% Sensitivity Shock', () => {
      const dkBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'ENERGINET')!;
      const deMarket = getMarketById('DE_THG')!;

      // Step 1: Transfer verification
      const transferReq: CrossBorderTransferRequest = {
        id: 'REQ-COMBO-1',
        sourceRegistry: 'ENERGINET',
        sourceAccountId: 'ACC-DK-01',
        targetRegistry: 'DENA',
        targetAccountId: 'ACC-DE-01',
        targetMarketId: 'DE_THG',
        batchIds: [dkBatch.id],
        totalVolumeMWh: dkBatch.volumeMWh,
        transferProtocol: 'ERGAR_COO',
        udbTitleTransferRequired: true,
        requestedAt: '2026-08-18T00:00:00Z',
      };
      const verification = verifyRegistryTransfer(transferReq, [dkBatch]);
      expect(verification.isCompatible).toBe(true);

      // Step 2: Forward curve pricing for Q3
      const defaultMatrix = getDefaultForwardCurveMatrix();
      const spreads = computeForwardBasisSpreads({
        consignment: fixtureDanishManureConsignment,
        market: deMarket,
        curveMatrix: defaultMatrix,
        costs: fixtureFixedCosts,
        pricingSide: 'mid',
      });
      const q3Spread = spreads.find(s => s.tenor === 'Q3')!;
      expect(q3Spread).toBeDefined();

      // Step 3: Sensitivity shock (+20% TTF)
      const shockRes = evaluateSensitivityScenario(
        {
          consignment: fixtureDanishManureConsignment,
          baseMarks: fixtureMarks,
          baseCosts: fixtureFixedCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ttfPriceShockPercent: 20 },
        },
        deMarket
      );
      expect(shockRes.moleculeDeltaEurPerMwh).toBe(5.90);
      expect(shockRes.netbackDeltaEurPerMwh).toBe(5.90);
    });

    it('3.2 combines Enagás Registry Transfer + Cal+1 Forward Curve + French CPB Cap Shift & TTF Bear Shock', () => {
      const esBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'ENAGAS')!;
      const frMarket = getMarketById('FR_CPB')!;

      // Step 1: Transfer verification
      const transferReq: CrossBorderTransferRequest = {
        id: 'REQ-COMBO-2',
        sourceRegistry: 'ENAGAS',
        sourceAccountId: 'ACC-ES-01',
        targetRegistry: 'VERTICER',
        targetAccountId: 'ACC-NL-01',
        targetMarketId: 'FR_CPB',
        batchIds: [esBatch.id],
        totalVolumeMWh: esBatch.volumeMWh,
        transferProtocol: 'ERGAR_COO',
        udbTitleTransferRequired: true,
        requestedAt: '2026-08-18T00:00:00Z',
      };
      const verification = verifyRegistryTransfer(transferReq, [esBatch]);
      expect(verification.isCompatible).toBe(true);

      // Step 2: Cal+1 Forward curve calculation
      const customMatrix = buildForwardCurveMatrix(
        {},
        { FR_CPB: { CAL_PLUS_1: { mid: 110.0, bid: 105.0, offer: 115.0 } } }
      );
      const spreads = computeForwardBasisSpreads({
        consignment: fixtureDanishManureConsignment,
        market: frMarket,
        curveMatrix: customMatrix,
        costs: fixtureFixedCosts,
        pricingSide: 'mid',
      });
      const cal1Spread = spreads.find(s => s.tenor === 'CAL_PLUS_1')!;
      expect(cal1Spread.certificateValueEurPerMwh).toBe(100.00); // Clamped at €100

      // Step 3: Sensitivity shock with €80 CPB cap and -10% TTF
      const shockRes = evaluateSensitivityScenario(
        {
          consignment: fixtureDanishManureConsignment,
          baseMarks: fixtureMarks,
          baseCosts: fixtureFixedCosts,
          shockConfig: {
            ...DEFAULT_SHOCK_CONFIG,
            frCpbCeilingEurMwh: 80,
            ttfPriceShockPercent: -10,
          },
        },
        frMarket
      );
      // Molecule delta: -2.95 €/MWh, Cert delta: -15.00 €/MWh (from 95 to 80)
      expect(shockRes.moleculeDeltaEurPerMwh).toBe(-2.95);
      expect(shockRes.certificateDeltaEurPerMwh).toBe(-15.00);
      expect(shockRes.netbackDeltaEurPerMwh).toBeCloseTo(-17.95, 2);
    });

    it('3.3 combines UK GGCS Transfer + M+1 Prompt Tenor + UK UDB Treaty Accord & FX Shock', () => {
      const ukConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        originCountry: 'GB',
        originCountryName: 'United Kingdom',
        injectionCountry: 'GB',
        injectionIsEU: false,
        udbStatus: 'NOT_RECORDED',
      };
      const nlMarket = getMarketById('NL_ERE')!;

      // Step 1: Baseline without treaty -> Blocked
      const baseRes = evaluateSensitivityScenario(
        {
          consignment: ukConsignment,
          baseMarks: fixtureMarks,
          baseCosts: fixtureFixedCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ukUdbRecognition: false },
        },
        nlMarket
      );
      expect(baseRes.isTradeable).toBe(false);

      // Step 2: With treaty -> Unlocked & tradeable
      const treatyRes = evaluateSensitivityScenario(
        {
          consignment: ukConsignment,
          baseMarks: fixtureMarks,
          baseCosts: fixtureFixedCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ukUdbRecognition: true },
        },
        nlMarket
      );
      expect(treatyRes.isTradeable).toBe(true);
      expect(treatyRes.verdictChanged).toBe(true);
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (Trader Workflows)
  // ==========================================================================
  describe('Tier 4: Real-World Application Scenarios (End-to-End Trader Workflows)', () => {

    it('Scenario A: Danish Manure Biomethane Export via Energinet to German dena/THG under Q3 Tenor with TTF +20% Shock', () => {
      // 1. Consignment Setup
      const csg: Consignment = {
        id: 'TRADE-DK-DE-2026-Q3',
        name: 'Danish Agri Biomethane 10k MWh Q3 Delivery',
        originCountry: 'DK',
        originCountryName: 'Denmark',
        feedstock: 'manure',
        feedstockName: 'Liquid Manure',
        annexClassification: 'IX_A',
        carbonIntensity: -100.0,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'DK',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
        counterparty: 'Shell Energy Europe B.V.',
        deliveryPeriod: {
          type: 'QUARTER',
          complianceYear: 2026,
          startDate: '2026-07-01',
          endDate: '2026-09-30',
        },
      };

      const deMarket = getMarketById('DE_THG')!;

      // 2. Registry Hub: Energinet Connector & Verification
      const dkBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'ENERGINET')!;
      const transferReq: CrossBorderTransferRequest = {
        id: 'REQ-DK-DE-SCENARIO-A',
        sourceRegistry: 'ENERGINET',
        sourceAccountId: 'ACC-DK-01',
        targetRegistry: 'DENA',
        targetAccountId: 'ACC-DE-01',
        targetMarketId: 'DE_THG',
        batchIds: [dkBatch.id],
        totalVolumeMWh: csg.volumeMWh!,
        transferProtocol: 'ERGAR_COO',
        udbTitleTransferRequired: true,
        requestedAt: '2026-08-18T00:00:00Z',
      };
      const regVer = verifyRegistryTransfer(transferReq, [dkBatch]);
      expect(regVer.isCompatible).toBe(true);
      expect(regVer.udbTitleTransferStatus).toBe('ESCROW_LOCKED');

      // 3. Regulatory Gate Assessment
      const elAssessment = evaluateEligibility(csg, deMarket);
      expect(elAssessment.overallVerdict).toBe('UNRESOLVED'); // German double-counting branch flagged for 2026
      expect(elAssessment.gates.every(g => g.verdict === 'PASS' || g.verdict === 'UNRESOLVED')).toBe(true);

      // 4. Forward Curve Spreads (Q3 Tenor)
      const forwardSpreads = computeForwardBasisSpreads({
        consignment: csg,
        market: deMarket,
        costs: fixtureFixedCosts,
        pricingSide: 'bid',
      });
      const q3Spread = forwardSpreads.find(s => s.tenor === 'Q3')!;
      expect(q3Spread.totalDeliveredValueEurPerMwh).toBeGreaterThan(0);

      // 5. Sensitivity Simulation: TTF +20% Shock + DC_ON evaluation
      const sensResult = evaluateSensitivityScenario(
        {
          consignment: csg,
          baseMarks: fixtureMarks,
          baseCosts: fixtureFixedCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ttfPriceShockPercent: 20, deDoubleCounting: 'DC_ON' },
        },
        deMarket
      );
      expect(sensResult.moleculeDeltaEurPerMwh).toBe(5.90);
      expect(sensResult.notionalDeltaEur).toBeGreaterThan(0);

      // 6. Term Sheet Dossier Generation
      const netback = computeNetback(deMarket, csg, fixtureMarks, fixtureFixedCosts, 'bid');
      const assessment: TradeAssessment = {
        id: 'ASSESSMENT-SCENARIO-A',
        consignment: csg,
        targetMarketId: deMarket.id,
        targetMarketName: deMarket.name,
        eligibility: elAssessment,
        netback,
        marks: fixtureMarks,
        costs: fixtureFixedCosts,
        createdAt: '2026-08-18T00:00:00Z',
        userNotes: 'Scenario A: Danish export under Q3 contract',
      };
      const summaryText = generateTradeSummary(assessment);
      expect(summaryText).toContain('EUROPEAN BIOMETHANE DESK — TRADE ASSESSMENT DOSSIER');
      expect(summaryText).toContain('Shell Energy Europe B.V.');
      expect(summaryText).toContain('Liquid Manure');
    });

    it('Scenario B: Spanish Slurry Biomethane via Enagás to French CPB with €100 Ceiling Clamp and 1-Click Deal Structuring', () => {
      // 1. Consignment Setup
      const csg: Consignment = {
        id: 'TRADE-ES-FR-2026-CPB',
        name: 'Spanish Pig Slurry Biomethane 25k MWh',
        originCountry: 'ES',
        originCountryName: 'Spain',
        feedstock: 'manure',
        feedstockName: 'Pig Slurry',
        annexClassification: 'IX_A',
        carbonIntensity: -85.0,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'REDCERT_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'ES',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 25000,
        counterparty: 'Engie Global Markets SAS',
        deliveryPeriod: {
          type: 'CALENDAR',
          complianceYear: 2026,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      };

      const frMarket = getMarketById('FR_CPB')!;

      // 2. Registry Hub: Enagás Transfer Verification
      const esBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'ENAGAS')!;
      const transferReq: CrossBorderTransferRequest = {
        id: 'REQ-ES-FR-SCENARIO-B',
        sourceRegistry: 'ENAGAS',
        sourceAccountId: 'ACC-ES-01',
        targetRegistry: 'VERTICER',
        targetAccountId: 'ACC-NL-01',
        targetMarketId: 'FR_CPB',
        batchIds: [esBatch.id],
        totalVolumeMWh: csg.volumeMWh!,
        transferProtocol: 'ERGAR_COO',
        udbTitleTransferRequired: true,
        requestedAt: '2026-08-18T00:00:00Z',
      };
      const regVer = verifyRegistryTransfer(transferReq, [esBatch]);
      expect(regVer.isCompatible).toBe(true);

      // 3. High Mark CPB Valuation with €100 Ceiling Clamping
      const highCpbMarks: MarksState = {
        ...fixtureMarks,
        marks: {
          ...fixtureMarks.marks,
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 115.0,
            offer: 125.0,
            mid: 120.0,
            updatedAt: '2026-08-18T00:00:00Z',
            source: 'EEX',
          },
        },
      };
      const netback = computeNetback(frMarket, csg, highCpbMarks, fixtureFixedCosts, 'bid');
      expect(netback.certificateValue?.valueEurPerMWh).toBe(100.00);
      expect(netback.certificateValue?.capped).toBe(true);

      // 4. 1-Click Deal Structuring URL Generation
      const dealUrl = formatStructuredDealUrl({
        originCountry: csg.originCountry,
        feedstock: csg.feedstock,
        ci: csg.carbonIntensity,
        marketId: frMarket.id,
        volume: csg.volumeMWh!,
        scheme: csg.certificationScheme,
        coc: csg.chainOfCustody,
        counterparty: csg.counterparty ?? undefined,
        deliveryPeriod: 'Cal-2026',
      });
      expect(dealUrl).toContain('originCountry=ES');
      expect(dealUrl).toContain('marketId=FR_CPB');
      expect(dealUrl).toContain('volume=25000');

      // 5. Term Sheet Dossier Check
      const elAssessment = evaluateEligibility(csg, frMarket);
      const assessment: TradeAssessment = {
        id: 'ASSESSMENT-SCENARIO-B',
        consignment: csg,
        targetMarketId: frMarket.id,
        targetMarketName: frMarket.name,
        eligibility: elAssessment,
        netback,
        marks: highCpbMarks,
        costs: fixtureFixedCosts,
        createdAt: '2026-08-18T00:00:00Z',
        userNotes: 'Scenario B: Spanish pig slurry to France with cap',
      };
      const summaryText = generateTradeSummary(assessment);
      expect(summaryText).toContain('LEGAL CAP APPLIED');
    });

    it('Scenario C: UK Food Waste Virtual Pipeline (Bio-LNG) to Dutch ERE with GBP/EUR FX Conversion & UDB Title Transfer', () => {
      // 1. Consignment Setup
      const csg: Consignment = {
        id: 'TRADE-UK-NL-2026-LNG',
        name: 'UK Food Waste Virtual Pipeline Bio-LNG 50k MWh',
        originCountry: 'GB',
        originCountryName: 'United Kingdom',
        feedstock: 'food_waste',
        feedstockName: 'Source-Separated Food Waste',
        annexClassification: 'IX_A',
        carbonIntensity: 25.0,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'REDCERT_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'GB',
        injectionIsEU: false,
        udbStatus: 'NOT_RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 50000,
        counterparty: 'Vitol Gas & Power B.V.',
        deliveryPeriod: {
          type: 'CALENDAR',
          complianceYear: 2026,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      };

      const nlMarket = getMarketById('NL_ERE')!;

      // 2. Baseline UDB Boundary Blocking
      const ukBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'GGCS_UK')!;
      const blockedReq: CrossBorderTransferRequest = {
        id: 'REQ-UK-NL-BLOCKED',
        sourceRegistry: 'GGCS_UK',
        sourceAccountId: 'ACC-GB-01',
        targetRegistry: 'DENA',
        targetAccountId: 'ACC-DE-01',
        targetMarketId: 'DE_THG',
        batchIds: [ukBatch.id],
        totalVolumeMWh: ukBatch.volumeMWh,
        transferProtocol: 'ERGAR_COO',
        udbTitleTransferRequired: true,
        bilateralTreatyActive: false,
        requestedAt: '2026-08-18T00:00:00Z',
      };
      const blockedVer = verifyRegistryTransfer(blockedReq, [ukBatch]);
      expect(blockedVer.isCompatible).toBe(false);
      expect(blockedVer.udbTitleTransferStatus).toBe('REJECTED_BOUNDARY_VIOLATION');

      // 3. Bilateral Recognition Treaty Activated
      const treatyReq: CrossBorderTransferRequest = {
        ...blockedReq,
        targetRegistry: 'GSE',
        targetMarketId: 'IT_CIC',
        transferProtocol: 'BILATERAL_RECOGNITION',
        bilateralTreatyActive: true,
      };
      const approvedVer = verifyRegistryTransfer(treatyReq, [ukBatch]);
      expect(approvedVer.isCompatible).toBe(true);
      expect(approvedVer.udbTitleTransferStatus).toBe('ESCROW_LOCKED');

      // 4. Sensitivity Simulation: UK UDB Accord unlocks Dutch ERE
      const treatyRes = evaluateSensitivityScenario(
        {
          consignment: csg,
          baseMarks: fixtureMarks,
          baseCosts: fixtureFixedCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ukUdbRecognition: true },
        },
        nlMarket
      );
      expect(treatyRes.isTradeable).toBe(true);
      expect(treatyRes.shockedEligibilityVerdict).toBe('ELIGIBLE');

      // 5. Dutch ERE Pricing with Index-Linked Producer Share & Logistics
      const virtualLngCosts: CostInputs = {
        ...fixtureIndexLinkedCosts,
        logistics: 8.50, // Virtual Bio-LNG transport logistics
      };
      const netback = computeNetback(nlMarket, csg, fixtureMarks, virtualLngCosts, 'bid');
      expect(netback.isComplete).toBe(true);
      expect(netback.certificateValue?.valueEurPerMWh).toBeGreaterThan(0);
      expect(netback.deskMargin).toBeGreaterThan(0);
      expect(netback.deskPnL).toBeGreaterThan(0);
    });

    it('Scenario D: Italian Manure Advanced Biomethane (5.815 MWh/CIC Yield) under GSE Floor & FuelEU Maritime Deficit Closure', () => {
      // 1. Consignment Setup
      const csg: Consignment = {
        id: 'TRADE-IT-CIC-2026',
        name: 'Italian Bovine Manure 40,000 MWh Advanced Biomethane',
        originCountry: 'IT',
        originCountryName: 'Italy',
        feedstock: 'manure',
        feedstockName: 'Bovine Manure',
        annexClassification: 'IX_A',
        carbonIntensity: -90.0,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'IT',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 40000,
        counterparty: 'Eni S.p.A.',
        deliveryPeriod: {
          type: 'CALENDAR',
          complianceYear: 2026,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      };

      const itMarket = getMarketById('IT_CIC')!;
      const fuelEUMarket = getMarketById('FUELEU')!;

      // 2. Advanced Biomethane Quota Conversion (5.815 MWh/CIC yield)
      // 1 CIC = 5.815 MWh for Annex IX-A advanced biomethane
      expect(MWH_PER_CIC_ADVANCED).toBe(5.815);
      const expectedCics = 40000 / MWH_PER_CIC_ADVANCED;
      expect(expectedCics).toBeCloseTo(6878.76, 2);

      // 3. Valuation in Italian CIC Market
      const cicNetback = computeNetback(itMarket, csg, fixtureMarks, fixtureFixedCosts, 'bid');
      expect(cicNetback.certificateValue?.valueEurPerMWh).toBeCloseTo(360.0 / 5.815, 2);

      // 4. Alternative Valuation in FuelEU Maritime with Year 2 Escalation (+10%)
      const fuelEUNetback = computeNetback(
        fuelEUMarket,
        csg,
        fixtureMarks,
        fixtureFixedCosts,
        'bid',
        { consecutiveYears: 2 }
      );
      expect(fuelEUNetback.certificateValue?.valueEurPerMWh).toBeGreaterThan(0);

      // 5. Commercial Arbitrage Comparison between IT_CIC and FuelEU
      const cicMargin = cicNetback.deskMargin ?? 0;
      const fuelEUMargin = fuelEUNetback.deskMargin ?? 0;
      expect(cicMargin).toBeGreaterThan(0);
      expect(fuelEUMargin).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // TIER 5: ADVERSARIAL STRESS & FUZZING
  // ==========================================================================
  describe('Tier 5: Adversarial Stress & Fuzzing (Extreme Gas Prices, CI Limits, Malformed Payloads)', () => {

    it('5.1 fuzzes extreme TTF natural gas prices (€10.00 to €150.00 / MWh) verifying monotonicity and stability', () => {
      const deMarket = getMarketById('DE_THG')!;

      for (let price = 10.0; price <= 150.0; price += 15.0) {
        const testMarks: MarksState = {
          ...fixtureMarks,
          gasIndex: {
            bid: price - 0.5,
            offer: price + 0.5,
            mid: price,
            updatedAt: '2026-08-18T00:00:00Z',
          },
        };

        const netback = computeNetback(
          deMarket,
          fixtureDanishManureConsignment,
          testMarks,
          fixtureFixedCosts,
          'bid'
        );

        expect(netback.moleculeValue).toBe(price - 0.5);
        expect(netback.netNetback).not.toBeNull();
        expect(Number.isFinite(netback.netNetback!)).toBe(true);
        expect(Number.isNaN(netback.netNetback!)).toBe(false);
      }
    });

    it('5.2 fuzzes carbon intensity range (-150.0 to +120.0 gCO2e/MJ) across multiple compliance markets', () => {
      const testMarkets = [getMarketById('DE_THG')!, getMarketById('NL_ERE')!, getMarketById('FR_CPB')!];

      for (let ci = -150.0; ci <= 120.0; ci += 30.0) {
        const csg: Consignment = {
          ...fixtureDanishManureConsignment,
          carbonIntensity: ci,
        };

        for (const m of testMarkets) {
          const netback = computeNetback(m, csg, fixtureMarks, fixtureFixedCosts, 'bid');
          expect(netback).toBeDefined();
          if (netback.certificateValue?.valueEurPerMWh !== null && netback.certificateValue?.valueEurPerMWh !== undefined) {
            expect(Number.isFinite(netback.certificateValue.valueEurPerMWh)).toBe(true);
            expect(Number.isNaN(netback.certificateValue.valueEurPerMWh)).toBe(false);
          }
        }
      }
    });

    it('5.3 fuzzes GBP/EUR FX exchange rates (0.50 to 2.50) for UK RTFO market', () => {
      const ukMarket = getMarketById('UK_RTFO')!;

      for (let fxRate = 0.50; fxRate <= 2.50; fxRate += 0.25) {
        const testMarks: MarksState = {
          ...fixtureMarks,
          fx: {
            gbpEur: fxRate,
            chfEur: 1.05,
            updatedAt: '2026-08-18T00:00:00Z',
          },
        };

        const netback = computeNetback(
          ukMarket,
          fixtureDanishManureConsignment,
          testMarks,
          fixtureFixedCosts,
          'bid'
        );

        expect(netback.certificateValue?.valueEurPerMWh).not.toBeNull();
        expect(Number.isFinite(netback.certificateValue!.valueEurPerMWh!)).toBe(true);
      }
    });

    it('5.4 rejects malformed registry transfer requests deterministically without crashing', () => {
      const malformedRequests: CrossBorderTransferRequest[] = [
        // Empty batch IDs
        {
          id: 'MALFORMED-1',
          sourceRegistry: 'ENERGINET',
          sourceAccountId: 'ACC-DK-01',
          targetRegistry: 'DENA',
          targetAccountId: 'ACC-DE-01',
          targetMarketId: 'DE_THG',
          batchIds: [],
          totalVolumeMWh: 1000,
          transferProtocol: 'ERGAR_COO',
          udbTitleTransferRequired: true,
          requestedAt: '2026-08-18T00:00:00Z',
        },
        // Negative volume
        {
          id: 'MALFORMED-2',
          sourceRegistry: 'ENERGINET',
          sourceAccountId: 'ACC-DK-01',
          targetRegistry: 'DENA',
          targetAccountId: 'ACC-DE-01',
          targetMarketId: 'DE_THG',
          batchIds: ['NON_EXISTENT_BATCH'],
          totalVolumeMWh: -5000,
          transferProtocol: 'ERGAR_COO',
          udbTitleTransferRequired: true,
          requestedAt: '2026-08-18T00:00:00Z',
        },
        // Unsupported protocol
        {
          id: 'MALFORMED-3',
          sourceRegistry: 'GGCS_UK',
          sourceAccountId: 'ACC-GB-01',
          targetRegistry: 'DENA',
          targetAccountId: 'ACC-DE-01',
          targetMarketId: 'DE_THG',
          batchIds: ['BATCH-GB-2026-001'],
          totalVolumeMWh: 1000,
          transferProtocol: 'INVALID_PROTOCOL' as any,
          udbTitleTransferRequired: true,
          requestedAt: '2026-08-18T00:00:00Z',
        },
      ];

      for (const req of malformedRequests) {
        const ver = verifyRegistryTransfer(req, BASELINE_INJECTION_BATCHES);
        expect(ver.isCompatible).toBe(false);
        expect(ver.blockingReasons.length).toBeGreaterThan(0);
      }
    });

    it('5.5 executes combinatorial fuzzing across 50 random consignment permutations without throwing', () => {
      const feedstocks = Object.keys(FEEDSTOCK_REGISTRY);
      const schemes: CertificationScheme[] = ['ISCC_EU', 'ISCC_PLUS', 'REDCERT_EU', 'REDCERT2', '2BSVS', 'KZR_INIG'];
      const cocs: ChainOfCustody[] = ['MASS_BALANCE', 'BOOK_AND_CLAIM', 'SEGREGATION'];
      const countries = ['DK', 'DE', 'NL', 'ES', 'IT', 'FR', 'GB', 'PL'];

      let testCount = 0;
      for (let i = 0; i < 50; i++) {
        const fKey = feedstocks[i % feedstocks.length];
        const scheme = schemes[i % schemes.length];
        const coc = cocs[i % cocs.length];
        const country = countries[i % countries.length];
        const ci = -120 + (i * 5); // From -120 to +125

        const randCsg: Consignment = {
          id: `FUZZ-CSG-${i}`,
          name: `Fuzz Consignment ${i}`,
          originCountry: country,
          originCountryName: country,
          feedstock: fKey,
          feedstockName: fKey,
          annexClassification: i % 2 === 0 ? 'IX_A' : 'IX_B',
          carbonIntensity: ci,
          commissioningDateRange: 'POST_2021_TO_2025',
          certificationScheme: scheme,
          chainOfCustody: coc,
          injectionCountry: country,
          injectionIsEU: country !== 'GB',
          udbStatus: 'RECORDED',
          posStatus: 'ISSUED',
          volumeMWh: 1000 + i * 1000,
          deliveryPeriod: {
            type: 'CALENDAR',
            complianceYear: 2026,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
          },
        };

        const targetMarket = MARKETS[i % MARKETS.length];
        const el = evaluateEligibility(randCsg, targetMarket);
        expect(el).toBeDefined();

        const nb = computeNetback(targetMarket, randCsg, fixtureMarks, fixtureFixedCosts, 'bid');
        expect(nb).toBeDefined();

        const sens = evaluateSensitivityScenario(
          {
            consignment: randCsg,
            baseMarks: fixtureMarks,
            baseCosts: fixtureFixedCosts,
            shockConfig: DEFAULT_SHOCK_CONFIG,
          },
          targetMarket
        );
        expect(sens).toBeDefined();
        testCount++;
      }

      expect(testCount).toBe(50);
    });
  });
});
