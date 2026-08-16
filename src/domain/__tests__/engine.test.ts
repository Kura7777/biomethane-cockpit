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
import { getRouteTransitTariff, getOriginFeedstockProcurementCost, PRODUCING_ORIGINS } from '../arbitrage/origins';

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

describe('Biomethane Desk Cockpit — Review v2 & Matrix Arb Tests', () => {

  describe('1. Core Precision Anchors & Derivations', () => {
    
    it('anchors: tCO2e_per_MWh formula precision verification', () => {
      const manureFactor = tCO2ePerMWh(-100);
      const wasteFactor = tCO2ePerMWh(20);

      // (94 - -100) * 3600 / 1e6 = 194 * 3600 / 1e6 = 0.6984
      expect(manureFactor).toBeCloseTo(0.6984, 4);

      // (94 - 20) * 3600 / 1e6 = 74 * 3600 / 1e6 = 0.2664
      expect(wasteFactor).toBeCloseTo(0.2664, 4);
    });

    it('UK RTFO: derives yield from biomethane energy content (~72 to 144 dRTFC/MWh)', () => {
      expect(RTFO_KG_PER_MWH).toBeCloseTo(72.0, 1);

      const consignment = REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE;
      const ukMarket = getMarketById('UK_RTFO')!;
      const certVal = computeCertificateValue(ukMarket, consignment, sampleMarks);

      expect(certVal).not.toBeNull();
      // At £0.25/dRTFC and fx 1.18: 0.25 * 1.18 * 144 = €42.48/MWh
      expect(certVal?.valueEurPerMWh).toBeCloseTo(42.48, 1);
    });

    it('FuelEU Maritime: manure at CI -100 deficit closure marginal value', () => {
      // (189.34 / (91.16 * 41000)) * 2400 * 3600 = 437.69 €/MWh
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

  describe('2. Autonomous Matrix Arbitrage & What-If Simulations', () => {

    it('scanEuropeanArbitrage evaluates multiple origins and surfaces top positive spreads', () => {
      const scanResult = scanEuropeanArbitrage(sampleMarks, completeCosts, 'manure', -100);

      expect(scanResult.topOpportunities.length).toBeGreaterThan(0);
      expect(scanResult.matrixCells.length).toBeGreaterThan(100);

      // Best opportunity should have positive net margin
      const best = scanResult.topOpportunities[0];
      expect(best.netMarginEurPerMWh).not.toBeNull();
      expect(best.netMarginEurPerMWh!).toBeGreaterThan(0);
      expect(best.isTradeable).toBe(true);
    });

    it('What-If: German double counting toggle increases THG netback', () => {
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
      expect(dkToDeDouble!.destinationNetbackEurPerMWh!).toBeGreaterThan(dkToDeSingle!.destinationNetbackEurPerMWh!);
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
      expect(getRouteTransitTariff('DK', 'DK')).toBe(0.50); // Domestic
      expect(getRouteTransitTariff('DK', 'DE')).toBe(1.80); // Border adjacent
      expect(getRouteTransitTariff('ES', 'DE')).toBe(3.20); // Multi-zone transit
    });

  });

  describe('3. Schema Migration & Staleness', () => {

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
