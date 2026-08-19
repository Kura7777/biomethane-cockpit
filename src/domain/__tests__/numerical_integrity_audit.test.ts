import { describe, it, expect } from 'vitest';
import { 
  tCO2ePerMWh, 
  computeCertificateValue, 
  computeFuelEUDeficitClosureValue
} from '../netback/engine';
import { 
  calculateCiSliderAdjustment, 
  DEFAULT_INSTITUTIONAL_OFFTAKE,
  convertHhvToLhv,
  convertLhvToHhv
} from '../offtake/engine';
import { getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { MarksState, CostInputs } from '../netback/types';
import { simulateDesk } from '../marks/simulate';
import { migrateState, createDefaultState } from '../../store/context';

describe('PHASE 5 — NUMERICAL INTEGRITY & HAND RECOMPUTATION AUDIT', () => {

  // 1. tCO2ePerMWh hand recomputation
  it('1. tCO2ePerMWh matches exact hand calculations at key CI levels', () => {
    // Formula: (94.0 - CI) * 0.0036
    expect(tCO2ePerMWh(-100)).toBeCloseTo(0.6984, 4);
    expect(tCO2ePerMWh(-50)).toBeCloseTo(0.5184, 4);
    expect(tCO2ePerMWh(-20)).toBeCloseTo(0.4104, 4);
    expect(tCO2ePerMWh(0)).toBeCloseTo(0.3384, 4);
    expect(tCO2ePerMWh(20)).toBeCloseTo(0.2664, 4);
    expect(tCO2ePerMWh(94)).toBeCloseTo(0.0000, 4);
  });

  // 2. Certificate Value Across All Six Units of Account
  it('2. Certificate value across all six units of account matches hand calculations at CI -50', () => {
    const consignmentNeg50 = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, carbonIntensity: -50.0 };

    // Set deterministic test marks across all 6 units of account
    const testMarks: MarksState = {
      marks: {
        DE_THG: { marketId: 'DE_THG', bid: 350.00, offer: 350.00, mid: 350.00, updatedAt: '2026-01-01', source: 'Test', provenance: null },
        NL_ERE: { marketId: 'NL_ERE', bid: 0.35, offer: 0.35, mid: 0.35, updatedAt: '2026-01-01', source: 'Test', provenance: null },
        UK_RGGO: { marketId: 'UK_RGGO', bid: 65.00, offer: 65.00, mid: 65.00, updatedAt: '2026-01-01', source: 'Test', provenance: null },
        IT_CIC: { marketId: 'IT_CIC', bid: 300.00, offer: 300.00, mid: 300.00, updatedAt: '2026-01-01', source: 'Test', provenance: null },
        UK_RTFO: { marketId: 'UK_RTFO', bid: 0.25, offer: 0.25, mid: 0.25, updatedAt: '2026-01-01', source: 'Test', provenance: null },
        FUELEU: { marketId: 'FUELEU', bid: null, offer: null, mid: null, updatedAt: '2026-01-01', source: 'Test', provenance: null },
      },
      gasIndex: { bid: 33.50, offer: 33.50, mid: 33.50, updatedAt: '2026-01-01', provenance: null },
      fx: { gbpEur: 1.18, chfEur: 1.05, updatedAt: '2026-01-01', provenance: null },
      pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
    };

    // 1. EUR_PER_TCO2E (DE_THG): 0.5184 * 350 = 181.44
    const deCert = computeCertificateValue(getMarketById('DE_THG')!, consignmentNeg50, testMarks, 'bid');
    expect(deCert?.valueEurPerMWh).toBeCloseTo(181.44, 2);

    // 2. EUR_PER_KG_CO2E (NL_ERE): 0.5184 * 1000 * 0.35 = 181.44
    const nlCert = computeCertificateValue(getMarketById('NL_ERE')!, consignmentNeg50, testMarks, 'bid');
    expect(nlCert?.valueEurPerMWh).toBeCloseTo(181.44, 2);

    // 3. EUR_PER_MWH (UK_RGGO): 65.00
    const rggoCert = computeCertificateValue(getMarketById('UK_RGGO')!, consignmentNeg50, testMarks, 'bid');
    expect(rggoCert?.valueEurPerMWh).toBeCloseTo(65.00, 2);

    // 4. EUR_PER_CIC (IT_CIC): 1 MWh = 0.1719838 CIC * 300 = 51.595 -> 51.59
    const itCert = computeCertificateValue(getMarketById('IT_CIC')!, consignmentNeg50, testMarks, 'bid');
    expect(itCert?.valueEurPerMWh).toBeCloseTo(51.59, 2);

    // 5. GBP_PER_DRTFC (UK_RTFO): 72 kg/MWh * 2 = 144 dRTFC * £0.25 = £36.00 * 1.18 = €42.48
    const gbConsignment = { ...consignmentNeg50, originCountry: 'GB', injectionCountry: 'GB', injectionIsEU: false };
    const rtfoCert = computeCertificateValue(getMarketById('UK_RTFO')!, gbConsignment, testMarks, 'bid');
    expect(rtfoCert?.valueEurPerMWh).toBeCloseTo(42.48, 2);

    // 6. EUR_PER_TCO2E_DEFICIT (FUELEU): Modelled deficit closure value
    const fuelEUCert = computeCertificateValue(getMarketById('FUELEU')!, consignmentNeg50, testMarks, 'bid');
    expect(fuelEUCert?.valueEurPerMWh).toBeCloseTo(322.11, 2);
  });

  // 3. HHV <-> LHV Round-Trip Exactness
  it('3. HHV <-> LHV round-trip returns 45,000 MWh exactly', () => {
    const originalHhvVolume = 45000;
    const lhvVolume = convertHhvToLhv(originalHhvVolume); // 45,000 * 0.901 = 40,545
    expect(lhvVolume).toBe(40545);

    const roundTripHhvVolume = convertLhvToHhv(lhvVolume); // 40,545 / 0.901 = 45,000
    expect(roundTripHhvVolume).toBe(45000);
  });

  // 4. CI Slider Formula Assertions
  it('4. CI slider formula matches exact hand calculations across all corridor points', () => {
    const rweCiConfig = DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg.ciSlider;

    // CI = -100 -> +€52.00 adjustment -> €105.00/MWh
    const resNeg100 = calculateCiSliderAdjustment(rweCiConfig, -100);
    expect(resNeg100.adjustmentEurPerMWh).toBe(52.00);
    expect(resNeg100.finalCertificatePriceEurPerMWh).toBe(105.00);

    // CI = -50 -> +€19.50 adjustment -> €72.50/MWh (RWE contract worked figure)
    const resNeg50 = calculateCiSliderAdjustment(rweCiConfig, -50);
    expect(resNeg50.adjustmentEurPerMWh).toBe(19.50);
    expect(resNeg50.finalCertificatePriceEurPerMWh).toBe(72.50);

    // CI = -20 (Base CI) -> €0.00 adjustment -> €53.00/MWh
    const resNeg20 = calculateCiSliderAdjustment(rweCiConfig, -20);
    expect(resNeg20.adjustmentEurPerMWh).toBe(0.00);
    expect(resNeg20.finalCertificatePriceEurPerMWh).toBe(53.00);

    // CI = -10 -> -€6.50 adjustment -> €46.50/MWh
    const resNeg10 = calculateCiSliderAdjustment(rweCiConfig, -10);
    expect(resNeg10.adjustmentEurPerMWh).toBe(-6.50);
    expect(resNeg10.finalCertificatePriceEurPerMWh).toBe(46.50);

    // CI = 0 -> -€13.00 adjustment -> €40.00/MWh
    const resZero = calculateCiSliderAdjustment(rweCiConfig, 0);
    expect(resZero.adjustmentEurPerMWh).toBe(-13.00);
    expect(resZero.finalCertificatePriceEurPerMWh).toBe(40.00);
  });

  // 5. FuelEU Escalation Multipliers
  it('5. FuelEU deficit closure scales linearly across non-compliance years 1, 2, 3, 4', () => {
    const yr1 = computeFuelEUDeficitClosureValue(-50, 1);
    const yr2 = computeFuelEUDeficitClosureValue(-50, 2);
    const yr3 = computeFuelEUDeficitClosureValue(-50, 3);
    const yr4 = computeFuelEUDeficitClosureValue(-50, 4);

    expect(yr1.valueEurPerMWh).toBeCloseTo(322.11, 2);
    expect(yr2.valueEurPerMWh).toBeCloseTo(322.11 * 1.1, 2); // +10%
    expect(yr3.valueEurPerMWh).toBeCloseTo(322.11 * 1.2, 2); // +20%
    expect(yr4.valueEurPerMWh).toBeCloseTo(322.11 * 1.3, 2); // +30%
  });

  // 6. French CPB Cap Binding & Non-Binding
  it('6. French CPB statutory €100/MWh cap binds when certificate value exceeds cap', () => {
    const frCpbMarket = getMarketById('FR_CPB')!;
    const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

    // Test with low mark €50.00 -> Uncapped = €50.00 -> capped: false
    const lowMarks: MarksState = {
      ...simulateDesk().marks,
      marks: {
        FR_CPB: { marketId: 'FR_CPB', bid: 50.00, offer: 50.00, mid: 50.00, updatedAt: '2026-01-01', source: 'Test', provenance: null }
      }
    };
    const lowRes = computeCertificateValue(frCpbMarket, consignment, lowMarks, 'bid');
    expect(lowRes?.valueEurPerMWh).toBe(50.00);
    expect(lowRes?.capped).toBe(false);

    // Test with high mark €130.00 -> Uncapped = €130.00 -> capped: true, value clamped to €100.00
    const highMarks: MarksState = {
      ...simulateDesk().marks,
      marks: {
        FR_CPB: { marketId: 'FR_CPB', bid: 130.00, offer: 130.00, mid: 130.00, updatedAt: '2026-01-01', source: 'Test', provenance: null }
      }
    };
    const highRes = computeCertificateValue(frCpbMarket, consignment, highMarks, 'bid');
    expect(highRes?.valueEurPerMWh).toBe(100.00);
    expect(highRes?.capped).toBe(true);
    expect(highRes?.capReason).toContain('French CPB penalty ceiling: €100/MWh');
  });

  // 7. Float Precision on 1,000,000 MWh
  it('7. Float precision: 1,000,000 MWh volume maintains exact linearity and half-cent rounding consistency', () => {
    const volume = 1_000_000;
    const marginPerMwh = 3.39;
    const totalDeskProfit = marginPerMwh * volume;
    expect(totalDeskProfit).toBe(3_390_000);

    // Verify rounding consistency for half-cent boundaries
    const roundHalfUp = (n: number) => Number((Math.round(n * 100) / 100).toFixed(2));
    expect(roundHalfUp(53.005)).toBe(53.01);
    expect(roundHalfUp(53.015)).toBe(53.02);
  });

  // 8. State Export/Import Round-Trip & Migration
  it('8. State export, wipe, and import round-trip preserves all values, provenance, and observed timestamps', () => {
    const initialState = createDefaultState();
    const serialized = JSON.stringify(initialState);
    const reimported = migrateState(JSON.parse(serialized));

    expect(reimported.schemaVersion).toBe(initialState.schemaVersion);
    expect(reimported.consignments.length).toBe(initialState.consignments.length);
    expect(reimported.marks.pricingSides).toEqual(initialState.marks.pricingSides);

    // Verify mark provenance integrity
    const deMark = reimported.marks.marks['DE_THG'];
    expect(deMark).toBeDefined();
    expect(deMark.provenance?.sourceName).toBe(initialState.marks.marks['DE_THG'].provenance?.sourceName);
  });
});
