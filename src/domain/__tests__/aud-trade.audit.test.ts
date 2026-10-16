import { describe, it, expect } from 'vitest';
import { getMarketById } from '../markets/registry';
import { evaluateEligibility } from '../eligibility/engine';
import { computeNetback, computeCertificateValue } from '../netback/engine';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import type { Consignment } from '../consignment/types';
import type { MarksState, CostInputs } from '../netback/types';
import { commissioningRangeFromYear } from '../consignment/commissioning';
import { isEuMemberState } from '../consignment/euMembership';
import { buildArbitrageConsignment, DEFAULT_WHAT_IF_SCENARIO } from '../arbitrage/engine';
import { FR_CPB_CEILING_EUR_MWH } from '../regulatory/constants';
import { calculateLogisticsRoute } from '../logistics/engine';
import { defaultCi, plantCertificationScheme } from '../trade/dealDefaults';
import { buildDealUrl } from '../trade/dealParams';
import { generateTradeSummary } from '../trade/summary';

const now = new Date().toISOString();
const manure = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

function marksWith(over: Record<string, number>): MarksState {
  const m: MarksState['marks'] = {};
  for (const [id, v] of Object.entries(over)) m[id] = { marketId: id, bid: v, offer: v, mid: v, updatedAt: now, source: 'Audit' };
  return {
    marks: m,
    gasIndex: { bid: 30, offer: 31, mid: 30.5, updatedAt: now },
    fx: { gbpEur: 1.17, chfEur: null, updatedAt: now },
    pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
  };
}
const costs: CostInputs = {
  transferCosts: 2, certificationCosts: 1, logistics: 3, otherCosts: 0,
  producerPricing: { mode: 'FIXED_PRICE', fixedPriceEurPerMwh: 60, indexLinkedShare: null, source: null, lastVerified: null, confidence: 'VERIFIED' },
};
const year = (c: Consignment, complianceYear: number): Consignment => ({
  ...c, deliveryPeriod: { type: 'CALENDAR', startDate: null, endDate: null, complianceYear },
});
const from = (iso: string, extra: Partial<Consignment> = {}): Consignment => ({
  ...manure, id: `t_${iso}`, originCountry: iso, injectionCountry: iso, injectionIsEU: isEuMemberState(iso),
  chainOfCustody: 'MASS_BALANCE', ...extra,
});
const rtfoGate = (c: Consignment) =>
  evaluateEligibility(c, getMarketById('UK_RTFO')!).gates.find(g => g.gate === 'MARKET_SPECIFIC')!;

describe('aud-trade 1: UK_RTFO gate defers to the audited route matrix', () => {
  it.each(['DE', 'NL'])('%s -> GB is CONDITIONAL with the matrix conditions as remedy', iso => {
    const g = rtfoGate(from(iso));
    expect(g.verdict).toBe('CONDITIONAL');
    expect(g.remedy).toMatch(/capacity booked and nominated at each cross-border/i);
    expect(g.remedy).toMatch(/GOs not accepted/i);
  });
  it('IE -> GB (OPEN in the matrix) is CONDITIONAL with LOW confidence', () => {
    const g = rtfoGate(from('IE'));
    expect(g.verdict).toBe('CONDITIONAL');
    expect(g.confidence).toBe('LOW');
  });
  it('IS -> GB (not possible in the matrix) is HARD_BLOCK with the matrix reason', () => {
    const g = rtfoGate(from('IS'));
    expect(g.verdict).toBe('HARD_BLOCK');
    expect(g.reason).toMatch(/IS>GB/);
  });
  it('GB -> GB still passes', () => {
    expect(rtfoGate(from('GB')).verdict).toBe('PASS');
  });
  it('UK_RGGO stays GB-only', () => {
    const g = evaluateEligibility(from('DE'), getMarketById('UK_RGGO')!).gates.find(x => x.gate === 'MARKET_SPECIFIC')!;
    expect(g.verdict).toBe('HARD_BLOCK');
  });
});

describe('aud-trade 2: commissioning date', () => {
  it('maps years to bands and flags unknown as assumed', () => {
    expect(commissioningRangeFromYear(2012)).toEqual({ range: 'PRE_OCT_2015', assumed: false });
    expect(commissioningRangeFromYear(2018)).toEqual({ range: 'OCT_2015_TO_2020', assumed: false });
    expect(commissioningRangeFromYear(2023)).toEqual({ range: 'POST_2021_TO_2025', assumed: false });
    expect(commissioningRangeFromYear(2027)).toEqual({ range: 'POST_2026', assumed: false });
    expect(commissioningRangeFromYear(null)).toEqual({ range: 'POST_2021_TO_2025', assumed: true });
  });
  const base = { originCountry: 'DE', originCountryName: 'Germany', feedstockKey: 'manure', feedstockName: 'Manure', annexClassification: 'IX_A' as const, scheme: 'ISCC_EU' as const, chainOfCustody: 'MASS_BALANCE' as const, isEUGrid: true, volumeMWh: 1000 };
  it('a pre-2015 plant is tested at the 50% bar, not 65%', () => {
    // CI 40 vs 94 = 57.4% saving: passes 50%, fails 65%
    const old = buildArbitrageConsignment({ ...base, carbonIntensity: 40, commissioningYear: 2012 });
    const unknown = buildArbitrageConsignment({ ...base, carbonIntensity: 40 });
    const ghg = (c: Consignment) => evaluateEligibility(c, getMarketById('DE_THG')!).gates.find(g => g.gate === 'GHG_THRESHOLD');
    expect(ghg(old)?.verdict).toBe('PASS');
    expect(ghg(unknown)?.verdict).toBe('HARD_BLOCK');
    expect(ghg(unknown)?.reason).toMatch(/strictest bar assumed/);
  });
});

describe('aud-trade 3: statutory caps', () => {
  const de = getMarketById('DE_THG')!;
  it('DE THG mark 700 EUR/t, CI -20 is capped at the 600 penalty', () => {
    const cv = computeCertificateValue(de, year({ ...manure, carbonIntensity: -20 }, 2026), marksWith({ DE_THG: 700 }), 'bid')!;
    expect(cv.capped).toBe(true);
    expect(cv.valueEurPerMWh).toBeCloseTo(600 * 0.4104, 2); // 246.24
  });
  it('DE THG CI >= 94 has zero value, never negative', () => {
    const cv = computeCertificateValue(de, year({ ...manure, carbonIntensity: 120 }, 2026), marksWith({ DE_THG: 300 }), 'bid')!;
    expect(cv.valueEurPerMWh).toBe(0);
    expect(cv.statusNote).toMatch(/no GHG reduction/i);
  });
  it('NL GGE mark 0.60 vs 2027 buy-out 0.45 is capped at the buy-out', () => {
    const gge = getMarketById('NL_GGE')!;
    const c = year({ ...manure, injectionCountry: 'NL', originCountry: 'NL', custody: null }, 2027);
    const capped = computeCertificateValue(gge, c, marksWith({ NL_GGE: 0.6 }), 'bid')!;
    const atBuyout = computeCertificateValue(gge, c, marksWith({ NL_GGE: 0.45 }), 'bid')!;
    expect(capped.capped).toBe(true);
    expect(capped.valueEurPerMWh).toBeCloseTo(atBuyout.valueEurPerMWh!, 6);
  });
});

describe('aud-trade 4: NaN and unknown inputs', () => {
  it('NaN CI is never complete and has no certificate value', () => {
    const nb = computeNetback(getMarketById('DE_THG')!, year({ ...manure, carbonIntensity: NaN }, 2026), marksWith({ DE_THG: 285 }), costs);
    expect(nb.isComplete).toBe(false);
    expect(nb.certificateValue).toBeNull();
    expect(nb.missingInputs.join(' ')).toMatch(/CI required/);
  });
  it('defaultCi for an unknown feedstock is null, not 0', () => {
    expect(defaultCi('DE', 'unobtainium').ci).toBeNull();
    expect(defaultCi('DE', 'manure').ci).not.toBeNull();
  });
  it('trade summary never prints "undefined" or a double minus', () => {
    const c = year(from('DE'), 2026);
    const nb = computeNetback(getMarketById('DE_THG')!, c, marksWith({ DE_THG: 285 }), costs);
    const text = generateTradeSummary({
      id: 'x', createdAt: now, consignment: c, targetMarketId: 'DE_THG', targetMarketName: 'DE THG',
      eligibility: evaluateEligibility(c, getMarketById('DE_THG')!),
      netback: { ...nb, netNetback: -20, producerPayable: -8, deskMargin: -12, marginPercent: null },
      marks: marksWith({ DE_THG: 285 }), costs, userNotes: '',
    } as never);
    expect(text).not.toMatch(/undefined/);
    expect(text).not.toMatch(/−€-/);
  });
});

describe('aud-trade 6: hidden literals', () => {
  it('what-if FR CPB cap is the statutory constant', () => {
    expect(DEFAULT_WHAT_IF_SCENARIO.frCpbPenaltyCap).toBe(FR_CPB_CEILING_EUR_MWH);
  });
});

describe('aud-trade 8: EU membership, logistics, scheme', () => {
  it('only the 27 member states are EU', () => {
    for (const x of ['DE', 'FR', 'IE', 'GR', 'EL', 'SE']) expect(isEuMemberState(x), x).toBe(true);
    for (const x of ['IS', 'LI', 'NO', 'CH', 'UA', 'GB', 'RS', '', null, undefined]) expect(isEuMemberState(x as never), String(x)).toBe(false);
  });
  it('IS and LI have an explicit no-pipeline-route result', () => {
    for (const iso of ['IS', 'LI']) {
      const r = calculateLogisticsRoute(iso, 'DE', 30);
      expect(r.physicalRoute.noPipelineRoute, iso).toBe(true);
      expect(r.physicalRoute.noPipelineRouteReason).toMatch(/No pipeline route/);
      expect(r.distanceKm).toBeNull();
      expect(r.physicalRoute.totalPhysicalTariffEurMwh).toBeNull();
    }
    expect(calculateLogisticsRoute('DE', 'NL', 30).physicalRoute.noPipelineRoute).toBe(false);
  });
  it('plant scheme is passed through when known', () => {
    expect(plantCertificationScheme({ certificationScheme: 'REDCERT_EU' })).toBe('REDCERT_EU');
    expect(plantCertificationScheme({ certificationScheme: 'ISCC EU' })).toBe('ISCC_EU');
    expect(plantCertificationScheme({ certificationScheme: 'mystery' })).toBeUndefined();
    expect(plantCertificationScheme({})).toBeUndefined();
  });
  it('buildDealUrl leaves a null CI out of the link', () => {
    expect(buildDealUrl({ marketId: 'DE_THG', ci: null })).toBe('/trade?marketId=DE_THG');
  });
});
