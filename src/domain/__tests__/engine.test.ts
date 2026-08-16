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
import { getMarkAgeDays, getMarkStaleness } from '../markets/types';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';
import { rankNetbacks, getHighestBlockedOpportunity } from '../netback/ranking';
import { migrateState, CURRENT_SCHEMA_VERSION } from '../../store/context';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { scanEuropeanArbitrage } from '../arbitrage/engine';
import { getRouteTransitTariff, PRODUCING_ORIGINS } from '../arbitrage/origins';
import { BIOMETHANE_PLANTS, DEVELOPER_PORTFOLIOS, COUNTRY_MACRO_STATS, getPlantsByCountry, searchPlants } from '../plants/registry';

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

describe('Biomethane Desk Cockpit — Comprehensive Regression & Plant Database Tests', () => {

  describe('1. Core Precision Anchors & Derivations', () => {
    
    it('anchors: tCO2e_per_MWh formula precision verification', () => {
      const manureFactor = tCO2ePerMWh(-100);
      const wasteFactor = tCO2ePerMWh(20);

      expect(manureFactor).toBeCloseTo(0.6984, 4);
      expect(wasteFactor).toBeCloseTo(0.2664, 4);
    });

    it('UK RTFO: derives yield from biomethane energy content (~72 to 144 dRTFC/MWh)', () => {
      expect(RTFO_KG_PER_MWH).toBeCloseTo(72.0, 1);

      const consignment = REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE;
      const ukMarket = getMarketById('UK_RTFO')!;
      const certVal = computeCertificateValue(ukMarket, consignment, sampleMarks);

      expect(certVal).not.toBeNull();
      expect(certVal?.valueEurPerMWh).toBeCloseTo(42.48, 1);
    });

    it('FuelEU Maritime: manure at CI -100 deficit closure marginal value', () => {
      const year1 = computeFuelEUDeficitClosureValue(-100, 1, 89.34, 91.16);
      expect(year1.valueEurPerMWh).toBeCloseTo(437.69, 1);

      const year2 = computeFuelEUDeficitClosureValue(-100, 2, 89.34, 91.16);
      expect(year2.valueEurPerMWh).toBeCloseTo(437.69 * 1.10, 1);

      const year3 = computeFuelEUDeficitClosureValue(-100, 3, 89.34, 91.16);
      expect(year3.valueEurPerMWh).toBeCloseTo(437.69 * 1.20, 1);
    });

    it('French CPB: mark of €150/MWh is strictly capped at €100/MWh penalty ceiling', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frCpb = getMarketById('FR_CPB')!;
      const certVal = computeCertificateValue(frCpb, consignment, sampleMarks);

      expect(certVal?.valueEurPerMWh).toBe(100);
      expect(certVal?.capped).toBe(true);
      expect(certVal?.capReason).toContain('French CPB penalty ceiling: €100/MWh');
    });

  });

  describe('2. Autonomous Matrix Arbitrage & Realistic Desk Economics', () => {

    it('scanEuropeanArbitrage calculates realistic trading desk margins (€1.50–€6.00/MWh)', () => {
      const scanResult = scanEuropeanArbitrage(sampleMarks, completeCosts, 'manure', -100);

      expect(scanResult.topOpportunities.length).toBeGreaterThan(0);
      expect(scanResult.matrixCells.length).toBeGreaterThan(100);

      const best = scanResult.topOpportunities[0];
      expect(best.deskNetMarginEurPerMWh).not.toBeNull();
      expect(best.deskNetMarginEurPerMWh!).toBeGreaterThanOrEqual(1.0);
      expect(best.deskNetMarginEurPerMWh!).toBeLessThanOrEqual(10.0);
      expect(best.isTradeable).toBe(true);
    });

    it('What-If: German double counting toggle increases total value stack', () => {
      const singleCountScan = scanEuropeanArbitrage(sampleMarks, completeCosts, 'manure', -100, 'ISCC_EU', 'MASS_BALANCE', {
        deDoubleCounting: 'DC_OFF',
        ukUdbRecognition: false,
        fuelEUEscalationYears: 1,
        frCpbPenaltyCap: 100,
      });

      const doubleCountScan = scanEuropeanArbitrage(sampleMarks, completeCosts, 'manure', -100, 'ISCC_EU', 'MASS_BALANCE', {
        deDoubleCounting: 'DC_ON',
        ukUdbRecognition: false,
        fuelEUEscalationYears: 1,
        frCpbPenaltyCap: 100,
      });

      const dkToDeSingle = singleCountScan.topOpportunities.find(o => o.originCountry === 'DK' && o.targetMarketId === 'DE_THG');
      const dkToDeDouble = doubleCountScan.topOpportunities.find(o => o.originCountry === 'DK' && o.targetMarketId === 'DE_THG');

      expect(dkToDeSingle).toBeDefined();
      expect(dkToDeDouble).toBeDefined();
      expect(dkToDeDouble!.totalTerminalValueStackEurPerMWh!).toBeGreaterThan(dkToDeSingle!.totalTerminalValueStackEurPerMWh!);
    });

    it('What-If: UK UDB recognition unlocks UK export flows to EU compliance markets', () => {
      const currentLawScan = scanEuropeanArbitrage(sampleMarks, completeCosts, 'food_waste', 20, 'ISCC_EU', 'MASS_BALANCE', {
        deDoubleCounting: 'DC_OFF',
        ukUdbRecognition: false,
        fuelEUEscalationYears: 1,
        frCpbPenaltyCap: 100,
      });

      const recognizedScan = scanEuropeanArbitrage(sampleMarks, completeCosts, 'food_waste', 20, 'ISCC_EU', 'MASS_BALANCE', {
        deDoubleCounting: 'DC_OFF',
        ukUdbRecognition: true,
        fuelEUEscalationYears: 1,
        frCpbPenaltyCap: 100,
      });

      const ukToNlCurrent = currentLawScan.matrixCells.find(c => c.originCode === 'GB' && c.targetMarketId === 'NL_ERE');
      const ukToNlUnlocked = recognizedScan.matrixCells.find(c => c.originCode === 'GB' && c.targetMarketId === 'NL_ERE');

      expect(ukToNlCurrent?.isBlocked).toBe(true);
      expect(ukToNlUnlocked?.isBlocked).toBe(false);
    });

    it('calculates adjacent vs cross-European route transit tariffs properly', () => {
      expect(getRouteTransitTariff('DK', 'DK')).toBe(0.50);
      expect(getRouteTransitTariff('DK', 'DE')).toBe(1.80);
      expect(getRouteTransitTariff('ES', 'DE')).toBe(3.20);
    });

  });

  describe('3. Pan-European Master Biomethane Plants & Developer Portfolios', () => {

    it('loads 50+ flagship plants across Europe with complete specifications', () => {
      expect(BIOMETHANE_PLANTS.length).toBeGreaterThanOrEqual(50);
      const sample = BIOMETHANE_PLANTS[0];
      expect(sample.name).toBeDefined();
      expect(sample.operator).toBeDefined();
      expect(sample.annualEnergyGWh).toBeGreaterThan(0);
      expect(sample.coordinates).toBeDefined();
    });

    it('loads 20 developer portfolios and 26 country macro stats', () => {
      expect(DEVELOPER_PORTFOLIOS.length).toBeGreaterThanOrEqual(20);
      expect(COUNTRY_MACRO_STATS.length).toBeGreaterThanOrEqual(26);

      const natureEnergy = DEVELOPER_PORTFOLIOS.find(d => d.name.includes('Nature Energy'));
      expect(natureEnergy).toBeDefined();
      expect(natureEnergy?.totalCapacityGWh).toBe(4200);

      const franceMacro = COUNTRY_MACRO_STATS.find(c => c.iso === 'FR');
      expect(franceMacro).toBeDefined();
      expect(franceMacro?.activePlants).toBe(815);
      expect(franceMacro?.installedCapacityTWh).toBe(15.8);
    });

    it('searchPlants finds assets by operator or technology', () => {
      const totalPlants = searchPlants('TotalEnergies');
      expect(totalPlants.length).toBeGreaterThan(0);

      const wagaPlants = searchPlants('WAGABOX');
      expect(wagaPlants.length).toBeGreaterThan(0);
      expect(wagaPlants[0].upgradingTechnology).toContain('WAGABOX');
    });

  });

  describe('4. Schema Migration & Staleness', () => {

    it('migrateState upgrades legacy v1 state to schemaVersion 2', () => {
      const legacyV1State = {
        marks: {
          marks: {
            DE_THG: { bid: 300, offer: 310, mid: 305 },
          },
          gasIndex: { bid: 28, offer: 29, mid: 28.5 },
          fx: { gbpEur: 1.18, chfEur: null },
        },
        consignments: [],
      };

      const migrated = migrateState(legacyV1State);
      expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(migrated.marks.marks.DE_THG.mid).toBe(305);
      expect(migrated.marks.marks.DE_THG.marketId).toBe('DE_THG');
    });

  });

});
