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

function consignmentFrom(iso: string, custody: Consignment['chainOfCustody'] = 'BOOK_AND_CLAIM'): Consignment {
  return {
    ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
    id: `rt_${iso}`,
    originCountry: iso,
    injectionCountry: iso,
    chainOfCustody: custody,
  };
}

function gateFor(origin: string, marketId: string) {
  const a = evaluateEligibility(consignmentFrom(origin), getMarketById(marketId)!);
  return { a, gate: foldedItem(a, 'registry-transfer') };
}

describe('REGISTRY_TRANSFER gate (GO markets)', () => {
  it('DK -> DK_GO is domestic PASS', () => {
    const { gate } = gateFor('DK', 'DK_GO');
    expect(gate?.verdict).toBe('PASS');
    expect(gate?.reason).toContain('Domestic');
  });
  it('DK -> DE_GO passes (dena lists Energinet on ERGaR)', () => {
    expect(gateFor('DK', 'DE_GO').gate?.verdict).toBe('PASS');
  });
  it.each(['ES_GDO', 'FR_GO', 'AIB_GO'])('DK -> %s is HARD_BLOCK at the registry-transfer item', id => {
    const { a, gate } = gateFor('DK', id);
    expect(gate?.verdict).toBe('HARD_BLOCK');
    expect(gate?.remedy).toBeTruthy();
    expect(gate?.citations.length).toBeGreaterThan(0);
    expect(gate?.citations[0].sourceUrl).toMatch(/^https?:\/\//);
    expect(a.overallVerdict).toBe('HARD_BLOCK');
  });
  it('ES -> DE_GO and CZ -> DE_GO are HARD_BLOCK (AIB-only vs ERGaR-only, no ex-domain path)', () => {
    expect(gateFor('ES', 'DE_GO').gate?.verdict).toBe('HARD_BLOCK');
    expect(gateFor('CZ', 'DE_GO').gate?.verdict).toBe('HARD_BLOCK');
  });
  it('ES -> FR_GO is CONDITIONAL on the French ETS tag; CZ -> ES_GDO passes (observed AIB transfers)', () => {
    const fr = gateFor('ES', 'FR_GO').gate;
    expect(fr?.verdict).toBe('CONDITIONAL');
    expect(fr?.remedy).toContain('ETS');
    expect(gateFor('CZ', 'ES_GDO').gate?.verdict).toBe('PASS');
  });
  it('AT -> NL_GO is CONDITIONAL: Austrian origin only exports GOs from unsupported production', () => {
    const { gate } = gateFor('AT', 'NL_GO');
    expect(gate?.verdict).toBe('CONDITIONAL');
    expect(`${gate?.remedy} ${gate?.reason}`).toMatch(/unsupported (Austrian )?production/i);
  });
  it('GB -> DE_GO passes (GGCS Guidance Document 7: "you can export RGGOs from GGCS to DENA")', () => {
    const { gate } = gateFor('GB', 'DE_GO');
    expect(gate?.verdict).toBe('PASS');
    expect(gate?.citations[0].sourceUrl).toMatch(/^https?:\/\//);
  });
  it('AIB_GO accepts AIB-connected origins and blocks non-AIB ones', () => {
    expect(gateFor('CZ', 'AIB_GO').gate?.verdict).toBe('PASS');
    expect(gateFor('PL', 'AIB_GO').gate?.verdict).toBe('HARD_BLOCK');
  });
  it('VOL_SCOPE1: hub origin passes, no-hub origin is CONDITIONAL, unresearched is UNRESOLVED', () => {
    expect(gateFor('DK', 'VOL_SCOPE1').gate?.verdict).toBe('PASS');
    expect(gateFor('PL', 'VOL_SCOPE1').gate?.verdict).toBe('CONDITIONAL');
    expect(gateFor('GR', 'VOL_SCOPE1').gate?.verdict).toBe('UNRESOLVED');
    // The folded gate keeps the helper's UNRESOLVED rather than flattening it to CONDITIONAL.
    expect(gateFor('GR', 'VOL_SCOPE1').a.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')?.verdict).toBe('UNRESOLVED');
  });
  it('VOL_EU_ETS is not a GO transfer market', () => {
    expect(gateFor('DK', 'VOL_EU_ETS').gate).toBeUndefined();
  });
});

describe('REGISTRY_TRANSFER gate does not apply to compliance (PoS / mass balance) markets', () => {
  it.each(['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC'])('DK -> %s has no REGISTRY_TRANSFER gate', id => {
    const a = evaluateEligibility(consignmentFrom('DK', 'MASS_BALANCE'), getMarketById(id)!);
    expect(foldedItem(a, 'registry-transfer')).toBeUndefined();
  });
  it.each(['DE_THG', 'NL_ERE', 'IT_CIC'])('DK -> %s carries 5 gates, with the cross-border PoS item in Chain of custody', id => {
    const a = evaluateEligibility(consignmentFrom('DK', 'MASS_BALANCE'), getMarketById(id)!);
    expect(a.gates).toHaveLength(5);
    expect(foldedItem(a, 'cross-border-pos')).toBeDefined();
  });
  it('DK -> FR_CPB is an audited scheme (French-injected gas only): cross-border PoS item applies, 5 gates', () => {
    const a = evaluateEligibility(consignmentFrom('DK', 'MASS_BALANCE'), getMarketById('FR_CPB')!);
    expect(foldedItem(a, 'cross-border-pos')).toBeDefined();
    expect(a.gates).toHaveLength(5);
  });
});
