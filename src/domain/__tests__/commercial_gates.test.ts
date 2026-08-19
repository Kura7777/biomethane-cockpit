import { describe, it, expect } from 'vitest';
import { evaluateCommercialGates } from '../offtake/commercialGates';
import { DEFAULT_INSTITUTIONAL_OFFTAKE } from '../offtake/engine';
import { DualLegOfftakeStructure } from '../offtake/types';

describe('INSTITUTIONAL COMMERCIAL TERMS GATES (RWE OFFTAKE BENCHMARK)', () => {

  it('evaluates all 12 commercial terms gates for the default verified RWE offtake agreement', () => {
    const assessment = evaluateCommercialGates(DEFAULT_INSTITUTIONAL_OFFTAKE, {
      liveGasIndexMid: 33.50,
      marketCarbonIntensityValue: 0.71, // e.g. German THG paying 0.71 €/MWh per g
    });

    expect(assessment.gates.length).toBe(12);
    expect(assessment.unpricedOptionCount).toBe(3);
    // Overall verdict is CONDITIONAL because market entry/shipper fees default to null (must be agreed)
    expect(assessment.overallVerdict).toBe('CONDITIONAL');

    // Verify when cost allocation is explicitly populated, verdict reaches PASS
    const fullyAllocatedOfftake: DualLegOfftakeStructure = {
      ...DEFAULT_INSTITUTIONAL_OFFTAKE,
      physicalGasLeg: {
        ...DEFAULT_INSTITUTIONAL_OFFTAKE.physicalGasLeg,
        entryCapacityBookingCostEurPerMWh: 0.50,
        shipperNominationFeeEurPerMWh: 0.20,
      }
    };
    const fullyPassedAssessment = evaluateCommercialGates(fullyAllocatedOfftake, {
      liveGasIndexMid: 33.50,
      marketCarbonIntensityValue: 0.71,
    });
    expect(fullyPassedAssessment.overallVerdict).toBe('PASS');

    // Verify all 12 gate names exist
    const gateNames = assessment.gates.map(g => g.gate);
    expect(gateNames).toContain('HEATING_VALUE_BASIS');
    expect(gateNames).toContain('COMPRESSION_TREATMENT');
    expect(gateNames).toContain('CI_MEASUREMENT_BASIS');
    expect(gateNames).toContain('INDEX_SPECIFICATION');
    expect(gateNames).toContain('INDEX_FACTOR');
    expect(gateNames).toContain('CI_SLIDER_SHARE');
    expect(gateNames).toContain('VOLUME_BASIS');
    expect(gateNames).toContain('PAYMENT_TIMING');
    expect(gateNames).toContain('COST_ALLOCATION');
    expect(gateNames).toContain('CONDITIONS_PRECEDENT');
    expect(gateNames).toContain('GRANTED_OPTIONS');
    expect(gateNames).toContain('CHANGE_IN_LAW');
  });

  it('quantifies 9.9% value consequence when Heating Value basis is unstated', () => {
    const unstatedHhvOfftake: DualLegOfftakeStructure = {
      ...DEFAULT_INSTITUTIONAL_OFFTAKE,
      certificateLeg: {
        ...DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg,
        heatingValueBasis: '' as any, // unstated
      }
    };

    const assessment = evaluateCommercialGates(unstatedHhvOfftake);
    const gate = assessment.gates.find(g => g.gate === 'HEATING_VALUE_BASIS');

    expect(gate).toBeDefined();
    expect(gate?.verdict).toBe('CONDITIONAL');
    // On €53.00 base price, 9.9% is ~€5.25/MWh
    expect(gate?.impactEurPerMWh).toBeCloseTo(53.00 * (1 - 0.901), 2);
    expect(gate?.impactEurPerMWh).toBeGreaterThan(5.20);
    expect(gate?.question).not.toBeNull();
    expect(gate?.question).toContain('Higher Heating Value (HHV / Gross)');
  });

  it('returns null and explicit reason for CI Slider Share when no compliance market mark exists (never guesses alpha)', () => {
    const assessment = evaluateCommercialGates(DEFAULT_INSTITUTIONAL_OFFTAKE, {
      marketCarbonIntensityValue: null, // no live compliance mark
    });

    const gate = assessment.gates.find(g => g.gate === 'CI_SLIDER_SHARE');
    expect(gate).toBeDefined();
    expect(gate?.verdict).toBe('CONDITIONAL');
    expect(gate?.impactEurPerMWh).toBeNull();
    expect(gate?.impactBasis).toContain('No live compliance market mark available');
    expect(gate?.question).not.toBeNull();
  });

  it('quantifies alpha delta and producer carbon retention when compliance market mark is supplied', () => {
    const assessment = evaluateCommercialGates(DEFAULT_INSTITUTIONAL_OFFTAKE, {
      marketCarbonIntensityValue: 0.71, // compliance mark pays €0.71/g vs contracted €0.65/g
    });

    const gate = assessment.gates.find(g => g.gate === 'CI_SLIDER_SHARE');
    expect(gate).toBeDefined();
    expect(gate?.verdict).toBe('PASS');
    expect(gate?.impactEurPerMWh).toBe(0.06); // 0.71 - 0.65
    expect(gate?.reason).toContain('producer captures ~91.5% of carbon upside');
    expect(gate?.question).toBeNull();
  });

  it('lists and counts structural options held by counterparty without fabricating an ungrounded option price', () => {
    const assessment = evaluateCommercialGates(DEFAULT_INSTITUTIONAL_OFFTAKE);
    const gate = assessment.gates.find(g => g.gate === 'GRANTED_OPTIONS');

    expect(gate).toBeDefined();
    expect(gate?.verdict).toBe('PASS');
    expect(gate?.impactEurPerMWh).toBeNull();
    expect(gate?.impactBasis).toContain('3 structural options held by buyer');
    expect(gate?.reason).toContain('(1) SDE++ Switching, (2) 1-Year Prolongation, (3) CI > 0 Rejection');
  });

  it('ensures every non-PASS commercial gate returns an actionable question string for the counterparty', () => {
    const uncontractedOfftake: DualLegOfftakeStructure = {
      ...DEFAULT_INSTITUTIONAL_OFFTAKE,
      certificateLeg: {
        ...DEFAULT_INSTITUTIONAL_OFFTAKE.certificateLeg,
        heatingValueBasis: '' as any,
      },
      physicalGasLeg: {
        ...DEFAULT_INSTITUTIONAL_OFFTAKE.physicalGasLeg,
        benchmarkHub: '' as any,
      }
    };

    const assessment = evaluateCommercialGates(uncontractedOfftake);
    const nonPassGates = assessment.gates.filter(g => g.verdict !== 'PASS');

    expect(nonPassGates.length).toBeGreaterThan(0);
    for (const g of nonPassGates) {
      expect(g.question, `Gate ${g.gate} must have a non-null question when verdict is ${g.verdict}`).not.toBeNull();
      expect(g.question?.length).toBeGreaterThan(10);
    }
  });

  it('links Change in Law gate to underlying regulatory UNRESOLVED verdicts', () => {
    const assessment = evaluateCommercialGates(DEFAULT_INSTITUTIONAL_OFFTAKE, {
      regulatoryGateUnresolved: true,
    });

    const gate = assessment.gates.find(g => g.gate === 'CHANGE_IN_LAW');
    expect(gate).toBeDefined();
    expect(gate?.verdict).toBe('UNRESOLVED');
    expect(gate?.reason).toContain('underlying regulatory gate is UNRESOLVED');
    expect(gate?.question).not.toBeNull();
  });
});
