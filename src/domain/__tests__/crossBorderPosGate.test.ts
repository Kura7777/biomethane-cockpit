import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../eligibility/engine';
import { getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import type { Consignment } from '../consignment/types';
import type { EligibilityAssessment } from '../eligibility/types';

/** Cross-border PoS and registry transfer are items of the one Chain-of-custody gate (job GGE-1 step 5).
 * Item status maps back to the helper verdict it was folded from (TODO ← UNRESOLVED for these helpers). */
const STATUS_TO_VERDICT = { PASS: 'PASS', WARN: 'CONDITIONAL', FAIL: 'HARD_BLOCK', TODO: 'UNRESOLVED' } as const;
function foldedItem(a: EligibilityAssessment, id: string) {
  const item = a.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')?.checklist?.find(i => i.id === id);
  return item && { verdict: STATUS_TO_VERDICT[item.status], reason: item.detail, remedy: item.remedy, citations: item.citations };
}

function consignmentFrom(iso: string): Consignment {
  return {
    ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
    id: `pos_${iso}`,
    originCountry: iso,
    injectionCountry: iso,
    chainOfCustody: 'MASS_BALANCE' as Consignment['chainOfCustody'],
  };
}

function posGate(origin: string, marketId: string) {
  const a = evaluateEligibility(consignmentFrom(origin), getMarketById(marketId)!);
  return foldedItem(a, 'cross-border-pos');
}

const EU = ['AT', 'BE', 'BG', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];
const ALL = [...EU, 'GB', 'CH', 'NO'];

describe('CROSS_BORDER_POS gate: audited spot checks (2026-10-04)', () => {
  it('any EU origin > DE_THG is not blocked (incl. IE)', () => {
    for (const o of EU.filter(c => c !== 'DE')) {
      expect(posGate(o, 'DE_THG')?.verdict, o).not.toBe('HARD_BLOCK');
    }
  });
  it('any foreign origin > NL_ERE is HARD_BLOCK', () => {
    for (const o of ALL.filter(c => c !== 'NL')) expect(posGate(o, 'NL_ERE')?.verdict, o).toBe('HARD_BLOCK');
  });
  it('any foreign origin > IT_CIC is HARD_BLOCK', () => {
    for (const o of ALL.filter(c => c !== 'IT')) expect(posGate(o, 'IT_CIC')?.verdict, o).toBe('HARD_BLOCK');
  });
  it('any foreign origin > FR_TIRUERT is HARD_BLOCK', () => {
    for (const o of ALL.filter(c => c !== 'FR')) expect(posGate(o, 'FR_TIRUERT')?.verdict, o).toBe('HARD_BLOCK');
  });
  it('any foreign origin > CH_VSG and NO_STATNETT is HARD_BLOCK', () => {
    for (const o of ALL.filter(c => c !== 'CH')) expect(posGate(o, 'CH_VSG')?.verdict, o).toBe('HARD_BLOCK');
    for (const o of ALL.filter(c => c !== 'NO')) expect(posGate(o, 'NO_STATNETT')?.verdict, o).toBe('HARD_BLOCK');
  });
  it('EU origins > UK_RTFO are not blocked', () => {
    for (const o of EU) expect(posGate(o, 'UK_RTFO')?.verdict, o).not.toBe('HARD_BLOCK');
  });
  it('DK > CZ_POZE is not blocked (GO or PoS accepted)', () => {
    expect(posGate('DK', 'CZ_POZE')?.verdict).not.toBe('HARD_BLOCK');
  });
  it('blocked verdicts carry a remedy and a source URL', () => {
    const g = posGate('DK', 'NL_ERE');
    expect(g?.remedy).toBeTruthy();
    expect(g?.citations.length).toBeGreaterThan(0);
    expect(g?.citations[0].sourceUrl).toMatch(/^https?:\/\//);
  });
  it('item is omitted for domestic trades and GO markets', () => {
    expect(posGate('NL', 'NL_ERE')).toBeUndefined();
    expect(posGate('DK', 'FR_CPB')?.verdict).toBe('HARD_BLOCK'); // FR_CPB audited: French-injected gas only
    expect(posGate('DK', 'ES_GDO')).toBeUndefined();
  });
});
