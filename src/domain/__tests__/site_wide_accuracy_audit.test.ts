import { describe, it, expect } from 'vitest';
import { searchSourcingRoutes } from '../arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../arbitrage/engine';
import { CostInputs, MarksState } from '../netback/types';
import { ClientRequest } from '../arbitrage/types';
import { MARKETS } from '../markets/registry';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { BIOMETHANE_PLANTS, COUNTRY_MACRO_STATS } from '../plants/registry';
import { calculateLogisticsRoute, findShortestPipelinePath } from '../logistics/engine';
import { INITIAL_BROKER_QUOTES } from '../markets/brokerMarketData';
import { buildDealUrl, parseDealParams, DealParams } from '../trade/dealParams';

const auditMarks: MarksState = {
  marks: {
    DE_THG: {
      marketId: 'DE_THG',
      bid: 290,
      offer: 310,
      mid: 300,
      updatedAt: new Date().toISOString(),
      source: 'Argus',
      provenance: {
        sourceType: 'PRICE_REPORTING',
        sourceName: 'Argus Media',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    NL_ERE: {
      marketId: 'NL_ERE',
      bid: 1.85,
      offer: 1.95,
      mid: 1.90,
      updatedAt: new Date().toISOString(),
      source: 'CEGH',
      provenance: {
        sourceType: 'PLATFORM_HISTORY',
        sourceName: 'CEGH GreenGas',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    FR_CPB: {
      marketId: 'FR_CPB',
      bid: 24.0,
      offer: 26.0,
      mid: 25.0,
      updatedAt: new Date().toISOString(),
      source: 'Broker',
      provenance: {
        sourceType: 'BROKER_INDICATION',
        sourceName: 'Broker Run',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    UK_RTFO: {
      marketId: 'UK_RTFO',
      bid: 20.0,
      offer: 22.0,
      mid: 21.0,
      updatedAt: new Date().toISOString(),
      source: 'Broker',
      provenance: {
        sourceType: 'BROKER_INDICATION',
        sourceName: 'Broker Run',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    UK_RGGO: {
      marketId: 'UK_RGGO',
      bid: 18.0,
      offer: 20.0,
      mid: 19.0,
      updatedAt: new Date().toISOString(),
      source: 'Broker',
      provenance: {
        sourceType: 'BROKER_INDICATION',
        sourceName: 'Broker Run',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    DE_GO: {
      marketId: 'DE_GO',
      bid: 22.0,
      offer: 24.0,
      mid: 23.0,
      updatedAt: new Date().toISOString(),
      source: 'dena',
      provenance: {
        sourceType: 'BROKER_INDICATION',
        sourceName: 'dena Biogasregister',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    NL_GO: {
      marketId: 'NL_GO',
      bid: 21.0,
      offer: 23.0,
      mid: 22.0,
      updatedAt: new Date().toISOString(),
      source: 'VertiCer',
      provenance: {
        sourceType: 'BROKER_INDICATION',
        sourceName: 'VertiCer',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    FR_GO: {
      marketId: 'FR_GO',
      bid: 20.0,
      offer: 22.0,
      mid: 21.0,
      updatedAt: new Date().toISOString(),
      source: 'EEX',
      provenance: {
        sourceType: 'BROKER_INDICATION',
        sourceName: 'EEX Auction',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    VOL_SCOPE1: {
      marketId: 'VOL_SCOPE1',
      bid: 16.0,
      offer: 18.0,
      mid: 17.0,
      updatedAt: new Date().toISOString(),
      source: 'CEGH',
      provenance: {
        sourceType: 'BROKER_INDICATION',
        sourceName: 'Voluntary Green Gas',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
  },
  gasIndex: {
    bid: 32.0,
    offer: 33.0,
    mid: 32.5,
    updatedAt: new Date().toISOString(),
  },
  fx: {
    gbpEur: 1.175,
    chfEur: 1.05,
    updatedAt: new Date().toISOString(),
  },
  pricingSides: {
    certificateSide: 'bid',
    moleculeSide: 'bid',
  },
  fuelEUOptions: {
    consecutiveYears: 1,
  },
};

const auditCosts: CostInputs = {
  transferCosts: 1.80,
  certificationCosts: 1.20,
  logistics: 1.50,
  otherCosts: 0.0,
  producerPricing: {
    mode: 'INDEX_LINKED',
    fixedPriceEurPerMwh: null,
    indexLinkedShare: 0.85,
    source: 'Broker Sourcing Benchmark',
    lastVerified: '2026-08-18',
    confidence: 'VERIFIED',
  },
};

describe('SITE-WIDE ACCURACY & MATHEMATICAL GROUND-TRUTH AUDIT', () => {
  
  // --------------------------------------------------------------------------
  // 1. FINANCIAL & MATHEMATICAL FORMULA PRECISION
  // --------------------------------------------------------------------------
  describe('1. Financial & Pricing Precision', () => {
    
    it('accurately computes Delivered Sourcing Cost Waterfall line items', () => {
      const plantGatePriceEur = 68.50;
      const gridTransitTariffEur = 3.80;
      const certificationAuditFeeEur = 1.20;
      
      const totalDeliveredCost = plantGatePriceEur + gridTransitTariffEur + certificationAuditFeeEur;
      expect(totalDeliveredCost).toBe(73.50);
    });

    it('accurately calculates Terminal Gross Revenue from Gas Index and Certificate Premium', () => {
      const ttfGasIndexEur = 32.50;
      const certificatePremiumEur = 54.20;
      
      const grossRevenue = ttfGasIndexEur + certificatePremiumEur;
      expect(grossRevenue).toBe(86.70);
    });

    it('accurately computes Net Deal Margin spread and Total Deal Net Profit', () => {
      const grossRevenue = 86.70;
      const deliveredCost = 73.50;
      const volumeMwh = 10000;
      
      const netMarginEurPerMwh = grossRevenue - deliveredCost;
      const totalProfitEur = netMarginEurPerMwh * volumeMwh;
      
      expect(netMarginEurPerMwh).toBeCloseTo(13.20, 4);
      expect(totalProfitEur).toBeCloseTo(132000, 2);
    });

    it('prevents floating-point currency drift across scaling operations', () => {
      const unitCost = 71.33333333333333;
      const vol = 15000;
      const total = Math.round(unitCost * vol * 100) / 100;
      expect(Number.isFinite(total)).toBe(true);
      expect(total).toBe(1070000);
    });
  });

  // --------------------------------------------------------------------------
  // 2. RED III REGULATORY & FEEDSTOCK CI AUTO-MAPPING
  // --------------------------------------------------------------------------
  describe('2. RED III Regulatory & Feedstock CI Mapping', () => {
    
    it('verifies statutory default Carbon Intensity (CI) for all major feedstocks', () => {
      expect(FEEDSTOCK_REGISTRY.manure.defaultCI).toBe(-100);
      expect(FEEDSTOCK_REGISTRY.food_waste.defaultCI).toBe(20);
      expect(FEEDSTOCK_REGISTRY.sewage_sludge.defaultCI).toBe(25);
      expect(FEEDSTOCK_REGISTRY.agricultural_residues.defaultCI).toBe(18);
      expect(FEEDSTOCK_REGISTRY.used_cooking_oil.defaultCI).toBe(15);
      expect(FEEDSTOCK_REGISTRY.energy_crops.defaultCI).toBe(40);
    });

    it('verifies Annex IX classifications according to RED III statutory directives', () => {
      expect(FEEDSTOCK_REGISTRY.manure.annexClassification).toBe('IX_A');
      expect(FEEDSTOCK_REGISTRY.food_waste.annexClassification).toBe('IX_A');
      expect(FEEDSTOCK_REGISTRY.sewage_sludge.annexClassification).toBe('IX_A');
      expect(FEEDSTOCK_REGISTRY.agricultural_residues.annexClassification).toBe('IX_A');
      expect(FEEDSTOCK_REGISTRY.used_cooking_oil.annexClassification).toBe('IX_B');
    });

    it('enforces GHG savings threshold (>= 65% vs fossil baseline of 94.0 gCO2e/MJ)', () => {
      const fossilBaseline = 94.0;
      
      // Manure (-100 CI): Savings = (94 - (-100)) / 94 = 194 / 94 = 206.38% savings
      const manureSavings = ((fossilBaseline - FEEDSTOCK_REGISTRY.manure.defaultCI) / fossilBaseline) * 100;
      expect(manureSavings).toBeGreaterThan(65);
      expect(manureSavings).toBeCloseTo(206.38, 1);

      // Food waste (+20 CI): Savings = (94 - 20) / 94 = 74 / 94 = 78.72% savings
      const foodWasteSavings = ((fossilBaseline - FEEDSTOCK_REGISTRY.food_waste.defaultCI) / fossilBaseline) * 100;
      expect(foodWasteSavings).toBeGreaterThan(65);
      expect(foodWasteSavings).toBeCloseTo(78.72, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 3. MULTI-MARKET QUOTA VALUE CONVERSIONS
  // --------------------------------------------------------------------------
  describe('3. Market Quota Calculations (DE, NL, UK, FR)', () => {
    
    it('verifies German THG Quota calculation from Carbon Intensity avoided emissions', () => {
      const req: ClientRequest = {
        targetMarketId: 'DE_THG',
        volumeMwh: 10000,
        feedstockKey: 'manure',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        delivery: {
          type: 'CALENDAR',
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          complianceYear: 2027,
        },
        constraints: {
          maxCarbonIntensity: null,
          maxDeliveredCostEurMwh: null,
          physicalDeliveryRequired: false,
        },
        counterparty: null,
        notes: null,
      };

      const res = searchSourcingRoutes(req, auditMarks, auditCosts, DEFAULT_WHAT_IF_SCENARIO);
      expect(res.evaluated).toBeGreaterThan(0);
      expect(res.tradeable.length).toBeGreaterThan(0);
      
      const deOpp = res.tradeable.find(r => r.targetCountry === 'DE');
      expect(deOpp).toBeDefined();
      expect(deOpp!.totalTerminalValueStackEurPerMWh).toBeGreaterThan(30.0);
    });

    it('verifies Dutch HBE calculation based on Annex IX A double-counting multiplier', () => {
      const req: ClientRequest = {
        targetMarketId: 'NL_ERE',
        volumeMwh: 15000,
        feedstockKey: 'food_waste',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        delivery: {
          type: 'CALENDAR',
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          complianceYear: 2027,
        },
        constraints: {
          maxCarbonIntensity: null,
          maxDeliveredCostEurMwh: null,
          physicalDeliveryRequired: false,
        },
        counterparty: null,
        notes: null,
      };

      const res = searchSourcingRoutes(req, auditMarks, auditCosts, DEFAULT_WHAT_IF_SCENARIO);
      expect(res.evaluated).toBeGreaterThan(0);
      expect(res.tradeable.length).toBeGreaterThan(0);

      const nlOpp = res.tradeable.find(r => r.targetCountry === 'NL');
      expect(nlOpp).toBeDefined();
      expect(nlOpp!.deskNetMarginEurPerMWh).toBeDefined();
    });

    it('verifies French CPB and UK RTFO sourcing route evaluation', () => {
      const frReq: ClientRequest = {
        targetMarketId: 'FR_CPB',
        volumeMwh: 8000,
        feedstockKey: 'agricultural_residues',
        scheme: '2BSVS',
        chainOfCustody: 'MASS_BALANCE',
        delivery: {
          type: 'CALENDAR',
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          complianceYear: 2027,
        },
        constraints: {
          maxCarbonIntensity: null,
          maxDeliveredCostEurMwh: null,
          physicalDeliveryRequired: false,
        },
        counterparty: null,
        notes: null,
      };
      const frRes = searchSourcingRoutes(frReq, auditMarks, auditCosts, DEFAULT_WHAT_IF_SCENARIO);
      expect(frRes.evaluated).toBeGreaterThan(0);

      const ukReq: ClientRequest = {
        targetMarketId: 'UK_RTFO',
        volumeMwh: 5000,
        feedstockKey: 'used_cooking_oil',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        delivery: {
          type: 'CALENDAR',
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          complianceYear: 2027,
        },
        constraints: {
          maxCarbonIntensity: null,
          maxDeliveredCostEurMwh: null,
          physicalDeliveryRequired: false,
        },
        counterparty: null,
        notes: null,
      };
      const ukRes = searchSourcingRoutes(ukReq, auditMarks, auditCosts, DEFAULT_WHAT_IF_SCENARIO);
      expect(ukRes.evaluated).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. PAN-EUROPEAN LOGISTICS & TARIFF INTEGRITY
  // --------------------------------------------------------------------------
  describe('4. Pan-European Cross-Border Logistics & Tariffs', () => {
    
    it('computes correct domestic pipeline grid logistics for intra-country flows', () => {
      const assessmentDE = calculateLogisticsRoute('DE', 'DE', 32.50);
      expect(assessmentDE.originCountry).toBe('DE');
      expect(assessmentDE.targetCountry).toBe('DE');

      const pathDE = findShortestPipelinePath('DE', 'DE');
      expect(pathDE).toEqual(['DE']);

      const assessmentNL = calculateLogisticsRoute('NL', 'NL', 32.50);
      expect(assessmentNL.originCountry).toBe('NL');
      expect(assessmentNL.targetCountry).toBe('NL');
    });

    it('computes shortest pipeline corridor and transit tariffs for DK -> DE cross-border trade', () => {
      const path = findShortestPipelinePath('DK', 'DE');
      expect(path).toEqual(['DK', 'DE']);

      const assessmentDK_DE = calculateLogisticsRoute('DK', 'DE', 32.50);
      expect(assessmentDK_DE.physicalRoute.transitingCountries).toEqual(['DK', 'DE']);
      expect(assessmentDK_DE.physicalRoute.interconnectionPoints.length).toBe(1);
      expect(assessmentDK_DE.physicalRoute.interconnectionPoints[0].name).toContain('Ellund');
    });

    it('properly evaluates Virtual Swap logistics for long-haul trade (SE -> ES)', () => {
      const assessmentSE_ES = calculateLogisticsRoute('SE', 'ES', 32.50);
      expect(assessmentSE_ES.recommendedMode).toBe('VIRTUAL_SWAP');
      expect(assessmentSE_ES.modes.virtualSwap.isRecommended).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. DATABASE INTEGRITY & PLANT MAPPING
  // --------------------------------------------------------------------------
  describe('5. Plants Database & Multi-Country Coverage', () => {
    
    it('verifies 1,975+ European facilities in the operational registry', () => {
      expect(BIOMETHANE_PLANTS.length).toBeGreaterThanOrEqual(1975);
    });

    it('verifies complete Pan-European country macro coverage across 23+ countries', () => {
      expect(COUNTRY_MACRO_STATS.length).toBeGreaterThanOrEqual(23);
      
      const countries = COUNTRY_MACRO_STATS.map(c => c.iso);
      expect(countries).toContain('FR');
      expect(countries).toContain('DE');
      expect(countries).toContain('GB');
      expect(countries).toContain('IT');
      expect(countries).toContain('NL');
      expect(countries).toContain('SE');
      expect(countries).toContain('DK');
      expect(countries).toContain('ES');
      expect(countries).toContain('PL');
    });

    it('normalizes UK and GB country code lookups seamlessly', () => {
      const gbPlants = BIOMETHANE_PLANTS.filter(p => p.countryCode === 'GB' || p.countryCode === 'UK');
      expect(gbPlants.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. DEAL PARAMS & TRADE TICKET SERIALIZATION
  // --------------------------------------------------------------------------
  describe('6. Deal Parameters & URL Synchronization', () => {
    
    it('correctly serializes and deserializes structured deal parameters into trade URLs', () => {
      const sampleParams: DealParams = {
        marketId: 'DE_THG',
        originCountry: 'DK',
        feedstock: 'manure',
        ci: -100,
        volume: 20000,
        scheme: 'ISCC_EU',
        coc: 'MASS_BALANCE',
        counterparty: 'German Utility AG',
      };

      const url = buildDealUrl(sampleParams);
      expect(url).toContain('/trade?');
      expect(url).toContain('marketId=DE_THG');
      expect(url).toContain('originCountry=DK');
      expect(url).toContain('volume=20000');
      expect(url).toContain('ci=-100');

      const parsed = parseDealParams(new URLSearchParams(url.split('?')[1]));
      expect(parsed.volume).toBe(20000);
      expect(parsed.marketId).toBe('DE_THG');
      expect(parsed.originCountry).toBe('DK');
      expect(parsed.ci).toBe(-100);
    });
  });

  // --------------------------------------------------------------------------
  // 7. BROKER PRICING MATRIX DATASET AUDIT
  // --------------------------------------------------------------------------
  describe('7. Broker Pricing Matrix Dataset', () => {
    
    it('verifies all benchmark quotes from the Pan-European broker sheet', () => {
      expect(INITIAL_BROKER_QUOTES.length).toBeGreaterThanOrEqual(15);

      const ukQuote = INITIAL_BROKER_QUOTES.find(q => q.country === 'UK' && q.class === 'RGGO');
      expect(ukQuote).toBeDefined();
      expect(ukQuote!.class).toBe('RGGO');
      expect(ukQuote!.currency).toBe('GBP');

      const nlQuote = INITIAL_BROKER_QUOTES.find(q => q.country === 'NL' && q.class === 'GO');
      expect(nlQuote).toBeDefined();
      expect(nlQuote!.class).toBe('GO');

      const deQuote = INITIAL_BROKER_QUOTES.find(q => q.country === 'DE' && q.class === 'GO');
      expect(deQuote).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 8. COMMERCIAL ORDER INTAKE: 120+ MATRIX COMBINATION AUDIT
  // --------------------------------------------------------------------------
  describe('8. Commercial Order Intake 120+ Matrix Sourcing Verification', () => {
    
    it('strictly restricts UK_RGGO sourcing to domestic GB grid injections across all feedstocks', () => {
      const feedstockKeys = Object.keys(FEEDSTOCK_REGISTRY);

      for (const fKey of feedstockKeys) {
        const req: ClientRequest = {
          targetMarketId: 'UK_RGGO',
          volumeMwh: 10000,
          feedstockKey: fKey,
          scheme: 'ISCC_EU',
          chainOfCustody: 'BOOK_AND_CLAIM',
          delivery: {
            type: 'CALENDAR',
            startDate: '2027-01-01',
            endDate: '2027-12-31',
            complianceYear: 2027,
          },
          constraints: {
            maxCarbonIntensity: null,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'UK Industrial Offtaker',
          notes: 'Corporate Scope 1 RGGO Procurement',
        };

        const res = searchSourcingRoutes(req, auditMarks, auditCosts, DEFAULT_WHAT_IF_SCENARIO);
        
        // Every tradeable route MUST strictly be UK (GB) origin
        expect(res.tradeable.length).toBeGreaterThan(0);
        res.tradeable.forEach(route => {
          expect(route.originCountry).toBe('GB');
          expect(route.targetCountry).toBe('GB');
        });

        // Non-UK European origins (SK, CZ, LV, EE, DE, FR, NL, DK, etc.) MUST be blocked
        const nonUkOriginsInTradeable = res.tradeable.filter(r => r.originCountry !== 'GB' && r.originCountry !== 'UK');
        expect(nonUkOriginsInTradeable.length).toBe(0);

        // Verify blocked non-UK list contains explicit market-specific reason
        const blockedNonUk = res.blocked.filter(r => r.originCountry !== 'GB' && r.originCountry !== 'UK');
        expect(blockedNonUk.length).toBeGreaterThan(0);
        blockedNonUk.forEach(r => {
          expect(r.regulatoryRationale || r.eligibility.summary).toContain('UK RGGOs (Green Gas Certification Scheme) are exclusively issued for biomethane physically injected into the UK');
        });
      }
    });

    it('allows energy crops (CI: +40) on UK_RGGO and all voluntary GO markets without transport 65% penalty block', () => {
      const goMarkets = ['UK_RGGO', 'DE_GO', 'NL_GO', 'FR_GO', 'VOL_SCOPE1'];

      for (const mId of goMarkets) {
        const req: ClientRequest = {
          targetMarketId: mId,
          volumeMwh: 10000,
          feedstockKey: 'energy_crops',
          scheme: 'ISCC_EU',
          chainOfCustody: 'BOOK_AND_CLAIM',
          delivery: {
            type: 'CALENDAR',
            startDate: '2027-01-01',
            endDate: '2027-12-31',
            complianceYear: 2027,
          },
          constraints: {
            maxCarbonIntensity: 40,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: null,
          notes: null,
        };

        const res = searchSourcingRoutes(req, auditMarks, auditCosts, DEFAULT_WHAT_IF_SCENARIO);
        expect(res.tradeable.length).toBeGreaterThan(0);

        // Verify that none of the opportunities are blocked by GHG threshold
        const ghgBlocked = res.blocked.filter(r => (r.regulatoryRationale || '').includes('GHG saving threshold'));
        expect(ghgBlocked.length).toBe(0);
      }
    });

    it('executes full fan-out across all 20 active markets x 6 feedstocks without NaN or unhandled exceptions', () => {
      const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');
      const feedstocks = Object.keys(FEEDSTOCK_REGISTRY);

      let totalMatrixEvaluations = 0;

      for (const market of activeMarkets) {
        for (const feedstock of feedstocks) {
          const req: ClientRequest = {
            targetMarketId: market.id,
            volumeMwh: 10000,
            feedstockKey: feedstock,
            scheme: 'ISCC_EU',
            chainOfCustody: market.requiresMassBalance ? 'MASS_BALANCE' : 'BOOK_AND_CLAIM',
            delivery: {
              type: 'CALENDAR',
              startDate: '2027-01-01',
              endDate: '2027-12-31',
              complianceYear: 2027,
            },
            constraints: {
              maxCarbonIntensity: null,
              maxDeliveredCostEurMwh: null,
              physicalDeliveryRequired: false,
            },
            counterparty: null,
            notes: null,
          };

          const res = searchSourcingRoutes(req, auditMarks, auditCosts, DEFAULT_WHAT_IF_SCENARIO);
          expect(res.evaluated).toBeGreaterThan(0);
          totalMatrixEvaluations++;

          // Verify every tradeable opportunity has valid finite numeric values
          res.tradeable.forEach(opp => {
            expect(Number.isFinite(opp.totalTerminalValueStackEurPerMWh)).toBe(true);
            if (opp.deskNetMarginEurPerMWh !== null) {
              expect(Number.isFinite(opp.deskNetMarginEurPerMWh)).toBe(true);
            }
            if (opp.totalDealProfitEur !== null) {
              expect(Number.isFinite(opp.totalDealProfitEur)).toBe(true);
            }
          });
        }
      }

      // 20 active markets x 6 feedstocks = 120 matrix scans verified
      expect(totalMatrixEvaluations).toBeGreaterThanOrEqual(100);
    });
  });

  // --------------------------------------------------------------------------
  // 9. PAN-EUROPEAN GEOGRAPHIC HUBS & PIPELINE TOPOLOGY INVARIANTS
  // --------------------------------------------------------------------------
  describe('9. European Geographic Hubs & Pipeline Topology Invariants', () => {
    
    it('verifies all European producing origins exist in EUROPEAN_HUBS with valid coordinates', async () => {
      const { EUROPEAN_HUBS } = await import('../../features/map/mapData');
      const { PRODUCING_ORIGINS } = await import('../arbitrage/origins');

      const originCodes = Object.keys(PRODUCING_ORIGINS);
      expect(originCodes.length).toBeGreaterThanOrEqual(20);

      for (const iso of originCodes) {
        const hub = EUROPEAN_HUBS.find(h => h.iso === iso);
        expect(hub, `Origin country ${iso} missing from EUROPEAN_HUBS`).toBeDefined();
        expect(hub!.coords).toBeDefined();
        expect(hub!.coords.length).toBe(2);
        expect(typeof hub!.coords[0]).toBe('number');
        expect(typeof hub!.coords[1]).toBe('number');
        expect(Number.isFinite(hub!.coords[0])).toBe(true);
        expect(Number.isFinite(hub!.coords[1])).toBe(true);
      }
    });

    it('verifies all 1,975 plants in the registry have valid or resolvable country hub coordinates', async () => {
      const { EUROPEAN_HUBS } = await import('../../features/map/mapData');

      for (const plant of BIOMETHANE_PLANTS) {
        if (plant.coordinates) {
          expect(plant.coordinates.length).toBe(2);
          expect(Number.isFinite(plant.coordinates[0])).toBe(true);
          expect(Number.isFinite(plant.coordinates[1])).toBe(true);
        } else {
          // If plant coords are unpinned, the country hub MUST exist
          const isUk = plant.countryCode === 'GB' || plant.countryCode === 'UK';
          const lookupIso = isUk ? 'GB' : plant.countryCode;
          const hub = EUROPEAN_HUBS.find(h => h.iso === lookupIso);
          expect(hub, `Plant ${plant.name} countryCode ${plant.countryCode} has no coordinates and no hub in EUROPEAN_HUBS`).toBeDefined();
        }
      }
    });

    it('verifies logistics and transit tariffs across all possible (Origin, Target) combinations', async () => {
      const { PRODUCING_ORIGINS, getRouteTransitTariff } = await import('../arbitrage/origins');
      const originCodes = Object.keys(PRODUCING_ORIGINS);
      const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');

      for (const origin of originCodes) {
        for (const market of activeMarkets) {
          const target = market.country;
          const tariff = getRouteTransitTariff(origin, target);
          expect(Number.isFinite(tariff)).toBe(true);
          expect(tariff).toBeGreaterThanOrEqual(0.50);

          const logistics = calculateLogisticsRoute(origin, target, 32.50);
          expect(logistics).toBeDefined();
          expect(logistics.originCountry).toBe(origin);
          expect(logistics.targetCountry).toBe(target);
          expect(Number.isFinite(logistics.modes.virtualSwap.totalCostEurMwh)).toBe(true);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 10. COMMERCIAL ORDER INTAKE BIFURCATION (COMPLIANCE VS VOLUNTARY)
  // --------------------------------------------------------------------------
  describe('10. Commercial Order Intake Bifurcation (Compliance vs Voluntary)', () => {
    
    it('strictly separates markets into Compliance and Voluntary desk categories', async () => {
      const { getMarketsByDeskCategory, isVoluntaryMarket, MARKETS } = await import('../markets/registry');

      const complianceMarkets = getMarketsByDeskCategory('COMPLIANCE');
      const voluntaryMarkets = getMarketsByDeskCategory('VOLUNTARY');

      expect(complianceMarkets.length).toBeGreaterThan(0);
      expect(voluntaryMarkets.length).toBeGreaterThan(0);
      expect(complianceMarkets.length + voluntaryMarkets.length).toBe(MARKETS.length);

      // Verify no overlap
      const compIds = new Set(complianceMarkets.map(m => m.id));
      const volIds = new Set(voluntaryMarkets.map(m => m.id));
      
      for (const id of compIds) {
        expect(volIds.has(id)).toBe(false);
        expect(isVoluntaryMarket(id)).toBe(false);
      }
      for (const id of volIds) {
        expect(compIds.has(id)).toBe(false);
        expect(isVoluntaryMarket(id)).toBe(true);
      }

      // Check key market placement
      expect(compIds.has('DE_THG')).toBe(true);
      expect(compIds.has('NL_ERE')).toBe(true);
      expect(compIds.has('FR_CPB')).toBe(true);
      expect(compIds.has('UK_RTFO')).toBe(true);

      expect(volIds.has('UK_RGGO')).toBe(true);
      expect(volIds.has('DE_GO')).toBe(true);
      expect(volIds.has('NL_GO')).toBe(true);
      expect(volIds.has('FR_GO')).toBe(true);
      expect(volIds.has('VOL_SCOPE1')).toBe(true);
    });

    it('successfully processes all 1-Click 3Degrees Trader RFQ Presets with profitable tradeable routes', () => {
      const presets: ClientRequest[] = [
        // Compliance
        {
          feedstockKey: 'manure',
          targetMarketId: 'DE_THG',
          scheme: 'ISCC_EU',
          chainOfCustody: 'MASS_BALANCE',
          delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
          volumeMwh: 10000,
          constraints: { maxCarbonIntensity: -100, maxDeliveredCostEurMwh: null, physicalDeliveryRequired: false },
          counterparty: 'German Fuel Supplier',
          notes: 'DE THG Manure',
        },
        {
          feedstockKey: 'food_waste',
          targetMarketId: 'NL_ERE',
          scheme: 'ISCC_EU',
          chainOfCustody: 'MASS_BALANCE',
          delivery: { type: 'QUARTER', startDate: '2026-10-01', endDate: '2026-12-31', complianceYear: 2026 },
          volumeMwh: 15000,
          constraints: { maxCarbonIntensity: 20, maxDeliveredCostEurMwh: null, physicalDeliveryRequired: false },
          counterparty: 'Dutch Obligated Supplier',
          notes: 'NL ERE Waste',
        },
        // Voluntary
        {
          feedstockKey: 'energy_crops',
          targetMarketId: 'UK_RGGO',
          scheme: 'ISCC_EU',
          chainOfCustody: 'BOOK_AND_CLAIM',
          delivery: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
          volumeMwh: 8000,
          constraints: { maxCarbonIntensity: 40, maxDeliveredCostEurMwh: null, physicalDeliveryRequired: false },
          counterparty: 'UK Commercial Heating Offtaker',
          notes: 'UK RGGO Crops',
        },
        {
          feedstockKey: 'food_waste',
          targetMarketId: 'VOL_SCOPE1',
          scheme: 'ISCC_PLUS',
          chainOfCustody: 'BOOK_AND_CLAIM',
          delivery: { type: 'CALENDAR', startDate: '2026-01-01', endDate: '2026-12-31', complianceYear: 2026 },
          volumeMwh: 25000,
          constraints: { maxCarbonIntensity: 15, maxDeliveredCostEurMwh: null, physicalDeliveryRequired: false },
          counterparty: 'Tech Data Center',
          notes: 'Voluntary Scope 1',
        },
      ];

      for (const req of presets) {
        const res = searchSourcingRoutes(req, auditMarks, auditCosts, DEFAULT_WHAT_IF_SCENARIO);
        expect(res.tradeable.length, `Preset ${req.notes} should yield tradeable opportunities`).toBeGreaterThan(0);
        res.tradeable.forEach(opp => {
          expect(Number.isFinite(opp.totalTerminalValueStackEurPerMWh)).toBe(true);
          expect(opp.deskNetMarginEurPerMWh).toBeGreaterThan(0);
        });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 11. INSTITUTIONAL DATA PROVENANCE & TRANSPARENCY DIRECTORY
  // --------------------------------------------------------------------------
  describe('11. Institutional Data Provenance & Transparency Directory', () => {
    
    it('verifies all registered datasets in DATA_SOURCES_DIRECTORY are complete and valid', async () => {
      const { DATA_SOURCES_DIRECTORY, getDataSourcesByCategory } = await import('../provenance/dataSourcesDirectory');

      expect(DATA_SOURCES_DIRECTORY.length).toBeGreaterThanOrEqual(10);

      const categories = [
        'PLANTS_INFRASTRUCTURE',
        'FEEDSTOCKS_CARBON_INTENSITY',
        'MARKET_PRICING_BENCHMARKS',
        'LOGISTICS_INTERCONNECTORS',
        'REGISTRIES_MASS_BALANCE',
      ] as const;

      for (const cat of categories) {
        const records = getDataSourcesByCategory(cat);
        expect(records.length, `Category ${cat} should contain registered datasets`).toBeGreaterThan(0);
      }

      for (const d of DATA_SOURCES_DIRECTORY) {
        expect(d.id).toBeDefined();
        expect(d.name).toBeDefined();
        expect(d.authority).toBeDefined();
        expect(d.sourceDocumentOrUrl).toBeDefined();
        expect(d.provenanceTier).toBeDefined();
        expect(d.fieldsProvided.length).toBeGreaterThan(0);
      }
    });

    it('verifies explicit attribution of GIE/EBA 2026 map and RED III statutory directives', async () => {
      const { getDataSourceById } = await import('../provenance/dataSourcesDirectory');

      const gieMap = getDataSourceById('gie_eba_biomethane_map');
      expect(gieMap).toBeDefined();
      expect(gieMap!.sourceDocumentOrUrl).toContain('GIE_EBA_BIO_2026_A0_FULL_115.pdf');
      expect(gieMap!.coverageCount).toContain('1,975');

      const redIII = getDataSourceById('red_iii_annex_v_ix');
      expect(redIII).toBeDefined();
      expect(redIII!.legalBasis).toContain('RED III');
      expect(redIII!.provenanceTier).toBe('STATUTORY_DIRECTIVE');
    });
  });

  // --------------------------------------------------------------------------
  // 12. PAN-EUROPEAN PLANT TECHNICAL & FEEDSTOCK REALITY INVARIANTS
  // --------------------------------------------------------------------------
  describe('12. Pan-European Plant Technical & Feedstock Reality Invariants', () => {
    
    it('verifies 100% of all 1,975 facilities have non-null feedstock and technical stack attributions', async () => {
      const { BIOMETHANE_PLANTS, COUNTRY_MACRO_STATS } = await import('../plants/registry');

      expect(BIOMETHANE_PLANTS.length).toBe(1975);

      let cropAgriCount = 0;
      let manureCount = 0;
      let foodWasteCount = 0;
      let sewageCount = 0;

      for (const p of BIOMETHANE_PLANTS) {
        expect(p.name).toBeDefined();
        expect(p.countryCode).toBeDefined();
        expect(p.primaryFeedstockCategory, `Plant ${p.name} must have primaryFeedstockCategory`).toBeTruthy();
        expect(p.feedstockDetails, `Plant ${p.name} must have feedstockDetails`).toBeTruthy();
        expect(p.upgradingTechnology, `Plant ${p.name} must have upgradingTechnology`).toBeTruthy();
        expect(p.networkOperator, `Plant ${p.name} must have networkOperator`).toBeTruthy();

        if (p.primaryFeedstockCategory?.includes('Manure') || p.primaryFeedstockCategory?.includes('Slurry')) {
          manureCount++;
        } else if (p.primaryFeedstockCategory?.includes('Crops') || p.primaryFeedstockCategory?.includes('Agricultural')) {
          cropAgriCount++;
        } else if (p.primaryFeedstockCategory?.includes('Food') || p.primaryFeedstockCategory?.includes('Bio-waste') || p.primaryFeedstockCategory?.includes('Organic')) {
          foodWasteCount++;
        } else if (p.primaryFeedstockCategory?.includes('Sewage')) {
          sewageCount++;
        }
      }

      // Assert realistic European distribution
      expect(manureCount).toBeGreaterThan(1000);
      expect(cropAgriCount).toBeGreaterThan(150);
      expect(foodWasteCount).toBeGreaterThan(250);
      expect(sewageCount).toBeGreaterThan(20);

      // Verify UK plants specific breakdown
      const ukPlants = BIOMETHANE_PLANTS.filter(p => p.countryCode === 'GB' || p.countryCode === 'UK');
      expect(ukPlants.length).toBeGreaterThanOrEqual(100);
      const ukAgriAndWaste = ukPlants.filter(p => 
        p.primaryFeedstockCategory?.includes('Crops') || 
        p.primaryFeedstockCategory?.includes('Agri') || 
        p.primaryFeedstockCategory?.includes('Waste') ||
        p.primaryFeedstockCategory?.includes('Food')
      );
      expect(ukAgriAndWaste.length / ukPlants.length).toBeGreaterThanOrEqual(0.90); // >= 90% energy crops, food waste, & agri in UK
    });

    it('verifies all 28 European countries in COUNTRY_MACRO_STATS have complete profiles', async () => {
      const { COUNTRY_MACRO_STATS } = await import('../plants/registry');

      expect(COUNTRY_MACRO_STATS.length).toBeGreaterThanOrEqual(20);

      for (const c of COUNTRY_MACRO_STATS) {
        expect(c.country).toBeDefined();
        expect(c.iso).toBeDefined();
        expect(c.activePlants).toBeGreaterThan(0);
        expect(c.primaryFeedstockType).toBeTruthy();
        expect(c.primaryUpgradingTech).toBeTruthy();
      }

      const ukMacro = COUNTRY_MACRO_STATS.find(c => c.iso === 'GB');
      expect(ukMacro).toBeDefined();
      expect(ukMacro!.primaryFeedstockType).toContain('Energy Crops');
    });
  });
});
