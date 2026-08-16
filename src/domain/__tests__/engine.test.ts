import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../eligibility/engine';
import { 
  computeCertificateValue, 
  computeNetback, 
  tCO2ePerMWh, 
  computeFuelEUDeficitClosureValue,
  selectMarkPrice
} from '../netback/engine';
import { getMarketById, MARKETS } from '../markets/registry';
import { getMarkAgeDays, getMarkStaleness } from '../markets/types';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';
import { rankNetbacks, getHighestBlockedOpportunity } from '../netback/ranking';
import { migrateState, CURRENT_SCHEMA_VERSION } from '../../store/context';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';

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
    FR_CPB: { marketId: 'FR_CPB', bid: 145, offer: 155, mid: 150, updatedAt: new Date().toISOString(), source: 'EEX' },
    NL_ERE: { marketId: 'NL_ERE', bid: 0.28, offer: 0.32, mid: 0.30, updatedAt: new Date().toISOString(), source: 'NEa' },
    VOL_SCOPE1: { marketId: 'VOL_SCOPE1', bid: 35, offer: 45, mid: 40, updatedAt: new Date().toISOString(), source: 'Broker' },
    FUELEU: { marketId: 'FUELEU', bid: 220, offer: 260, mid: 240, updatedAt: new Date().toISOString(), source: 'Broker' },
    IT_CIC: { marketId: 'IT_CIC', bid: 360, offer: 390, mid: 375, updatedAt: new Date().toISOString(), source: 'GSE' },
  },
  gasIndex: { bid: 28.00, offer: 29.00, mid: 28.50, updatedAt: new Date().toISOString() },
  fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: new Date().toISOString() },
  pricingSide: 'bid',
};

describe('Biomethane Trading Cockpit — Domain Engine & Regression Tests', () => {

  describe('1. Core Physical & Mathematical Anchors', () => {
    
    it('anchors: tCO2e_per_MWh formula precision verification', () => {
      const manureFactor = tCO2ePerMWh(-100);
      const wasteFactor = tCO2ePerMWh(20);

      // (94 - -100) * 3600 / 1e6 = 194 * 3600 / 1e6 = 0.6984
      expect(manureFactor).toBeCloseTo(0.6984, 4);

      // (94 - 20) * 3600 / 1e6 = 74 * 3600 / 1e6 = 0.2664
      expect(wasteFactor).toBeCloseTo(0.2664, 4);

      // 2.62x difference from feedstock GHG accounting
      const ratio = manureFactor / wasteFactor;
      expect(ratio).toBeCloseTo(2.6216, 2);
    });

  });

  describe('2. Regulatory Eligibility Scenarios', () => {
    
    it('Scenario 1: UK origin, food waste, injected UK grid, ISCC EU -> blocked at UDB, not scheme', () => {
      const consignment = REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE;
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

    it('Scenario 2: Danish manure, EU grid, ISCC EU, mass balance -> Germany returns UNRESOLVED, never ELIGIBLE', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const result = evaluateEligibility(consignment, deMarket);

      expect(result.overallVerdict).toBe('UNRESOLVED');
      const marketGate = result.gates.find(g => g.gate === 'MARKET_SPECIFIC');
      expect(marketGate?.verdict).toBe('UNRESOLVED');
      expect(marketGate?.reason).toContain('Double counting is a POLICY MULTIPLIER');
      expect(marketGate?.reason).toContain('negative carbon intensity is a property of the GHG CALCULATION');
    });

    it('Scenario 3: Same Danish consignment is ELIGIBLE for French CPB and Dutch ERE', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frCpb = getMarketById('FR_CPB')!;
      const nlEre = getMarketById('NL_ERE')!;

      const frResult = evaluateEligibility(consignment, frCpb);
      const nlResult = evaluateEligibility(consignment, nlEre);

      expect(['ELIGIBLE', 'CONDITIONAL']).toContain(frResult.overallVerdict);
      expect(['ELIGIBLE', 'CONDITIONAL']).toContain(nlResult.overallVerdict);
    });

    it('Scenario 4: ISCC PLUS fails compliance markets at scheme gate, passes voluntary', () => {
      const consignment = REFERENCE_CONSIGNMENTS.ISCC_PLUS_VOLUNTARY;
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
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        chainOfCustody: 'BOOK_AND_CLAIM',
      };

      const fueleu = getMarketById('FUELEU')!;
      const resFuelEU = evaluateEligibility(consignment, fueleu);
      expect(resFuelEU.overallVerdict).toBe('HARD_BLOCK');
      expect(resFuelEU.blockingGate).toBe('CHAIN_OF_CUSTODY');

      const vol = getMarketById('VOL_SCOPE1')!;
      const resVol = evaluateEligibility(consignment, vol);
      expect(resVol.overallVerdict).toBe('ELIGIBLE');
    });

    it('Scenario 6: EU ETS2 always returns UNKNOWN and not tradeable until 2028', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const ets2 = getMarketById('EU_ETS2')!;
      const res = evaluateEligibility(consignment, ets2);
      expect(res.overallVerdict).toBe('UNKNOWN');
      expect(res.summary).toContain('cannot be fully determined');
      const marketGate = res.gates.find(g => g.gate === 'MARKET_SPECIFIC');
      expect(marketGate?.reason).toContain('postponed to 2028');
    });

  });

  describe('3. Commercial Netbacks, Completeness & Pricing Sides', () => {
    
    it('Scenario 7: German THG dual branches and pricing side selection', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;

      // Bid side (290)
      const netbackBid = computeNetback(deMarket, consignment, sampleMarks, completeCosts, 'bid');
      expect(netbackBid.certificateValue?.valueEurPerMWh).toBeCloseTo(0.6984 * 290, 1);
      expect(netbackBid.uncertaintyBranches?.[0].certificateValue.valueEurPerMWh).toBeCloseTo(0.6984 * 290, 1);
      expect(netbackBid.uncertaintyBranches?.[1].certificateValue.valueEurPerMWh).toBeCloseTo(0.6984 * 290 * 2, 1);

      // Mid side (300)
      const netbackMid = computeNetback(deMarket, consignment, sampleMarks, completeCosts, 'mid');
      expect(netbackMid.certificateValue?.valueEurPerMWh).toBeCloseTo(0.6984 * 300, 1); // 209.52
    });

    it('Scenario 8: French CPB penalty ceiling enforced at €100/MWh', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frCpb = getMarketById('FR_CPB')!;
      // sampleMarks has FR_CPB bid at 145 (above 100)
      const certVal = computeCertificateValue(frCpb, consignment, sampleMarks);

      expect(certVal?.valueEurPerMWh).toBe(100);
      expect(certVal?.capped).toBe(true);
      expect(certVal?.capReason).toContain('French CPB penalty ceiling: €100/MWh');
    });

    it('Scenario 9: Cost completeness tracking preserves missing inputs without silent zeros', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;

      const incompleteResult = computeNetback(deMarket, consignment, sampleMarks, emptyCosts);
      expect(incompleteResult.isComplete).toBe(false);
      expect(incompleteResult.missingInputs).toContain('transferCosts');
      expect(incompleteResult.missingInputs).toContain('certificationCosts');
      expect(incompleteResult.missingInputs).toContain('logistics');
      expect(incompleteResult.missingInputs).toContain('deliveredCost');

      const completeResult = computeNetback(deMarket, consignment, sampleMarks, completeCosts);
      expect(completeResult.isComplete).toBe(true);
      expect(completeResult.missingInputs.length).toBe(0);
      expect(completeResult.impliedMargin).not.toBeNull();
    });

    it('Scenario 10: Missing mark returns null, never zero', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const emptyMarks: MarksState = {
        marks: {},
        gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSide: 'bid',
      };

      const atMarket = getMarketById('AT_EGG')!;
      const certVal = computeCertificateValue(atMarket, consignment, emptyMarks);
      const netback = computeNetback(atMarket, consignment, emptyMarks, emptyCosts);

      expect(certVal).toBeNull();
      expect(netback.netNetback).toBeNull();
      expect(netback.netNetback).not.toBe(0);
    });

    it('Scenario 11: FuelEU Maritime deficit-closure model calculates compliance value with escalation', () => {
      // Year 1 (no escalation): bio-LNG with CI -100 vs target 89.34
      const year1 = computeFuelEUDeficitClosureValue(-100, 1);
      expect(year1.valueEurPerMWh).toBeGreaterThan(200);

      // Year 2 (10% escalation multiplier)
      const year2 = computeFuelEUDeficitClosureValue(-100, 2);
      expect(year2.valueEurPerMWh / year1.valueEurPerMWh).toBeCloseTo(1.10, 2);

      // Year 3 (20% escalation multiplier)
      const year3 = computeFuelEUDeficitClosureValue(-100, 3);
      expect(year3.valueEurPerMWh / year1.valueEurPerMWh).toBeCloseTo(1.20, 2);
    });

    it('Scenario 12: True Mark staleness calculation flags marks correctly', () => {
      const now = new Date();
      const freshDate = new Date(now.getTime() - 2 * 86400000).toISOString(); // 2 days ago
      const staleWarnDate = new Date(now.getTime() - 10 * 86400000).toISOString(); // 10 days ago
      const staleCritDate = new Date(now.getTime() - 35 * 86400000).toISOString(); // 35 days ago

      expect(getMarkStaleness(freshDate)).toBe('FRESH');
      expect(getMarkStaleness(staleWarnDate)).toBe('STALE_WARNING');
      expect(getMarkStaleness(staleCritDate)).toBe('STALE_CRITICAL');
      expect(getMarkStaleness(null)).toBe('UNFILLED');

      expect(getMarkAgeDays(freshDate)).toBe(2);
      expect(getMarkAgeDays(staleWarnDate)).toBe(10);
      expect(getMarkAgeDays(staleCritDate)).toBe(35);
      expect(getMarkAgeDays(null)).toBeNull();
    });

    it('Scenario 13: State schema migration upgrades v1 state safely', () => {
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
      expect(migrated.consignments.length).toBeGreaterThan(0);
    });

    it('Scenario 14: Highest blocked opportunity returns dynamic market ID and remedy', () => {
      const consignment = REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE;
      const deMarket = getMarketById('DE_THG')!;
      const el = evaluateEligibility(consignment, deMarket);
      const nb = computeNetback(deMarket, consignment, sampleMarks, emptyCosts);

      const elMap = new Map([[deMarket.id, el]]);
      const ranked = rankNetbacks([nb], elMap);
      const blockedOpp = getHighestBlockedOpportunity(ranked, elMap);

      expect(blockedOpp).not.toBeNull();
      expect(blockedOpp?.marketId).toBe('DE_THG');
      expect(blockedOpp?.remedy).toContain('Deliver physically as segregated bio-LNG');
    });

  });

});
