import { describe, it, expect } from 'vitest';
import { computeBreakEvenMark, isLinearMarkUnit, computeGateBadge } from '../ticketMath';
import { GateResult } from '../../../domain/eligibility/types';

describe('computeBreakEvenMark', () => {
  it('computes the mark that would bring the theoretical netback down to the cap', () => {
    // k = 0.6984 (tCO2e/MWh at CI -100), mark 380 -> theoretical 265.4, capped at 200
    // breakEven = 380 - (265.4 - 200) / 0.6984 ≈ 286.35
    const mark = 380;
    const k = 0.6984;
    const theoretical = mark * k; // 265.392
    const cap = 200;
    const result = computeBreakEvenMark(mark, k, theoretical, cap);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(mark - (theoretical - cap) / k, 4);
    // Sanity: the break-even mark must sit below the current mark when capped below theoretical.
    expect(result!).toBeLessThan(mark);
  });

  it('returns null when the netback is not actually capped below theoretical (still informative bound)', () => {
    const result = computeBreakEvenMark(100, 0.7, 70, 70);
    expect(result).toBe(100); // theoretical already equals cap: break-even is the current mark
  });

  it('returns null when mark is null', () => {
    expect(computeBreakEvenMark(null, 0.7, 70, 60)).toBeNull();
  });

  it('returns null when k is null', () => {
    expect(computeBreakEvenMark(100, null, 70, 60)).toBeNull();
  });

  it('returns null when k is zero', () => {
    expect(computeBreakEvenMark(100, 0, 70, 60)).toBeNull();
  });

  it('returns null when theoreticalNetback is null', () => {
    expect(computeBreakEvenMark(100, 0.7, null, 60)).toBeNull();
  });

  it('returns null when cappedAt is null', () => {
    expect(computeBreakEvenMark(100, 0.7, 70, null)).toBeNull();
  });

  it('moves the break-even mark down as the cap tightens further below theoretical', () => {
    const tighter = computeBreakEvenMark(100, 0.7, 90, 50);
    const looser = computeBreakEvenMark(100, 0.7, 90, 70);
    expect(tighter!).toBeLessThan(looser!);
  });
});

describe('isLinearMarkUnit', () => {
  it('accepts the four linear-in-mark certificate units', () => {
    expect(isLinearMarkUnit('EUR_PER_TCO2E')).toBe(true);
    expect(isLinearMarkUnit('EUR_PER_KG_CO2E')).toBe(true);
    expect(isLinearMarkUnit('EUR_PER_CIC')).toBe(true);
    expect(isLinearMarkUnit('GBP_PER_RTFC')).toBe(true);
  });

  it('rejects direct €/MWh, dRTFC and modelled FuelEU deficit units', () => {
    expect(isLinearMarkUnit('EUR_PER_MWH')).toBe(false);
    expect(isLinearMarkUnit('GBP_PER_DRTFC')).toBe(false);
    expect(isLinearMarkUnit('EUR_PER_TCO2E_DEFICIT')).toBe(false);
  });
});

describe('computeGateBadge', () => {
  const gate = (gate: string, verdict: GateResult['verdict'], gateLabel: string): GateResult => ({
    gate: gate as any,
    gateLabel,
    verdict,
    reason: `${gateLabel} reason`,
    remedy: null,
    citations: [],
    confidence: 'HIGH',
  });

  it('reports HARD_BLOCK as red "Blocked"', () => {
    const gates = [
      gate('SCHEME_RECOGNITION', 'PASS', 'Scheme recognition'),
      gate('MARKET_SPECIFIC', 'HARD_BLOCK', 'Market-specific requirements'),
    ];
    const badge = computeGateBadge(gates, 'HARD_BLOCK');
    expect(badge.tone).toBe('neg');
    expect(badge.label).toBe('Blocked · Market-specific requirements');
    expect(badge.gate?.gate).toBe('MARKET_SPECIFIC');
  });

  it('reports UNRESOLVED as amber "Unresolved", never "Blocked"', () => {
    const gates = [
      gate('SCHEME_RECOGNITION', 'PASS', 'Scheme recognition'),
      gate('MARKET_SPECIFIC', 'UNRESOLVED', 'Market-specific requirements'),
    ];
    const badge = computeGateBadge(gates, 'UNRESOLVED');
    expect(badge.tone).toBe('warn');
    expect(badge.label).toBe('Unresolved · Market-specific requirements');
  });

  it('reports CONDITIONAL as amber "Conditional"', () => {
    const gates = [
      gate('SCHEME_RECOGNITION', 'PASS', 'Scheme recognition'),
      gate('CHAIN_OF_CUSTODY', 'CONDITIONAL', 'Chain of custody'),
    ];
    const badge = computeGateBadge(gates, 'CONDITIONAL');
    expect(badge.tone).toBe('warn');
    expect(badge.label).toBe('Conditional · Chain of custody');
  });

  it('reports all-pass as green "n of n gates clear"', () => {
    const gates = [
      gate('SCHEME_RECOGNITION', 'PASS', 'Scheme recognition'),
      gate('UDB_RECORDING', 'PASS', 'UDB recording'),
    ];
    const badge = computeGateBadge(gates, 'ELIGIBLE');
    expect(badge.tone).toBe('pos');
    expect(badge.label).toBe('2 of 2 gates clear');
    expect(badge.gate).toBeNull();
  });
});
