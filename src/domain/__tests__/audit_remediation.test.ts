import { describe, it, expect } from 'vitest';
import { getMarketById } from '../markets/registry';
import { evaluateEligibility } from '../eligibility/engine';
import { computeNetback, computeCertificateValue, computeFuelEUDeficitClosureValue } from '../netback/engine';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';
import {
  calculateLogisticsRoute,
  calculateDijkstraCorridor,
  findShortestPipelinePath,
  PIPELINE_ADJACENCY,
} from '../logistics/engine';
import {
  BIOMETHANE_PLANTS,
  findPlantsForOrigination,
  hasApproximateCoordinates,
  getVerifiedPlantCoordinates,
} from '../plants/registry';
import { parseDealParams, buildDealUrl } from '../trade/dealParams';
import {
  getFuelEUTargetIntensity,
  calculateMarineBunkerQuotation,
  EU_ETS_PHASE_IN_2026,
  bioLngFuelEUIntensity,
  fossilLngWtw,
  FUELEU_VLSFO_WTW,
  FUELEU_MGO_WTW,
  calculateVesselExposure,
} from '../fueleu/calculator';
import { generateForwardCurves, MARKET_METADATA } from '../curves/engine';

/**
 * Regression suite for the September 2026 quantitative & statutory audit.
 * Each block pins one defect that the pre-existing 486 tests did not catch.
 */

const now = new Date().toISOString();
const manure = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

const marks: MarksState = {
  marks: {
    DE_THG: { marketId: 'DE_THG', bid: 280, offer: 290, mid: 285, updatedAt: now, source: 'Audit' },
    FR_CPB: { marketId: 'FR_CPB', bid: 95, offer: 99, mid: 97, updatedAt: now, source: 'Audit' },
    FUELEU: { marketId: 'FUELEU', bid: 270, offer: 300, mid: 285, updatedAt: now, source: 'Audit' },
    UK_RTFO: { marketId: 'UK_RTFO', bid: 0.80, offer: 0.85, mid: 0.825, updatedAt: now, source: 'Audit' },
  },
  gasIndex: { bid: 30, offer: 31, mid: 30.5, updatedAt: now },
  fx: { gbpEur: 1.17, chfEur: null, updatedAt: now },
  pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
};

const fixedCosts: CostInputs = {
  transferCosts: 2,
  certificationCosts: 1,
  logistics: 3,
  otherCosts: 0,
  producerPricing: {
    mode: 'FIXED_PRICE',
    fixedPriceEurPerMwh: 60,
    indexLinkedShare: null,
    source: null,
    lastVerified: null,
    confidence: 'VERIFIED',
  },
};

const withYear = (c: Consignment, complianceYear: number): Consignment => ({
  ...c,
  deliveryPeriod: { type: 'CALENDAR', startDate: null, endDate: null, complianceYear },
});

describe('Audit remediation — statutory gating', () => {
  it('P0-1: continental grid gas is HARD_BLOCKed from UK RTFO at MARKET_SPECIFIC', () => {
    const fr: Consignment = { ...manure, originCountry: 'FR', injectionCountry: 'FR' };
    const e = evaluateEligibility(fr, getMarketById('UK_RTFO')!);
    expect(e.overallVerdict).toBe('HARD_BLOCK');
    expect(e.blockingGate).toBe('MARKET_SPECIFIC');
  });

  it('P0-1: physically segregated bio-LNG imports into the UK are CONDITIONAL, not blocked', () => {
    const lng: Consignment = { ...manure, chainOfCustody: 'SEGREGATION' };
    const gate = evaluateEligibility(lng, getMarketById('UK_RTFO')!).gates.find(g => g.gate === 'MARKET_SPECIFIC')!;
    expect(gate.verdict).toBe('CONDITIONAL');
  });

  it('P0-1: GB-injected gas still passes the UK RTFO market gate', () => {
    const gb: Consignment = { ...manure, originCountry: 'GB', injectionCountry: 'GB', injectionIsEU: false, udbStatus: 'NOT_RECORDED' };
    const gate = evaluateEligibility(gb, getMarketById('UK_RTFO')!).gates.find(g => g.gate === 'MARKET_SPECIFIC')!;
    expect(gate.verdict).toBe('PASS');
  });
});

describe('Audit remediation — netback mathematics', () => {
  it('P0-2: DE_THG CY2025 desk P&L and pricing sides are stated on the doubled certificate value', () => {
    const nb = computeNetback(getMarketById('DE_THG')!, withYear(manure, 2025), marks, fixedCosts);
    // 280 × 0.6984 = 195.55 → × 2 = 391.10; netback = 391.10 + 30 − 6 = 415.10
    expect(nb.certificateValue?.valueEurPerMWh).toBeCloseTo(391.1, 2);
    expect(nb.netNetback).toBeCloseTo(415.1, 2);
    expect(nb.deskMargin).toBeCloseTo(355.1, 2);
    expect(nb.deskPnL).toBeCloseTo(nb.deskMargin! * 10000, 2);
    expect(nb.grossSpreadPnL).toBeCloseTo(nb.grossValueSpread! * 10000, 2);
    expect(nb.sides!.atChosenSides).toBe(nb.netNetback);
    // mid 285 → 199.04 × 2 = 398.09 (rounding of 199.044) + 30.5 − 6
    expect(nb.sides!.crossingCost).toBeCloseTo(nb.sides!.atMid! - nb.netNetback!, 2);
    expect(nb.sides!.crossingCost!).toBeGreaterThan(0);
  });

  it('P0-2: e_am is decoupled from the multiplier — DC_OFF keeps the full negative-CI value', () => {
    const nb = computeNetback(getMarketById('DE_THG')!, withYear(manure, 2026), marks, fixedCosts);
    const dcOff = nb.uncertaintyBranches!.find(b => b.branchId === 'DC_OFF')!;
    const dcOn = nb.uncertaintyBranches!.find(b => b.branchId === 'DC_ON')!;
    expect(dcOff.certificateValue!.valueEurPerMWh).toBeCloseTo(280 * (94 + 100) * 0.0036, 1);
    expect(dcOn.certificateValue!.valueEurPerMWh).toBeCloseTo(dcOff.certificateValue!.valueEurPerMWh! * 2, 2);
  });

  it('P0-3: FuelEU desk mark in €/tCO₂e is converted to €/MWh through the target-intensity surplus', () => {
    // Surplus vs target uses the Bio-LNG FuelEU intensity: RED CI + Annex I slip/N2O (Otto SS 9.3121 g/MJ)
    const cv = computeCertificateValue(getMarketById('FUELEU')!, { ...manure, carbonIntensity: -100 }, marks, 'bid')!;
    expect(cv.valueEurPerMWh).toBeCloseTo((270 * (89.3368 - (-100 + bioLngFuelEUIntensity(0))) * 3600) / 1e6, 4); // €174.98/MWh
    expect(cv.valueEurPerMWh).toBeCloseTo(174.984, 3);
    const cvZero = computeCertificateValue(getMarketById('FUELEU')!, { ...manure, carbonIntensity: 0 }, marks, 'bid')!;
    expect(cvZero.valueEurPerMWh).toBeCloseTo(77.784, 3);
  });

  it('P0-3: FuelEU fuel above the target intensity earns no compliance value from a desk mark', () => {
    const cv = computeCertificateValue(getMarketById('FUELEU')!, { ...manure, carbonIntensity: 90 }, marks, 'bid')!;
    expect(cv.valueEurPerMWh).toBe(0);
  });

  it('P1-1: a loss-making deal reports a negative margin percentage', () => {
    const nb = computeNetback(getMarketById('FR_CPB')!, withYear(manure, 2026), marks, { ...fixedCosts, logistics: 500 });
    expect(nb.netNetback!).toBeLessThan(0);
    expect(nb.deskMargin!).toBeLessThan(0);
    expect(nb.marginPercent!).toBeLessThan(0);
    expect(nb.marginPercent!).toBeCloseTo((nb.deskMargin! / Math.abs(nb.netNetback!)) * 100, 6);
  });

  it('P1-2: the FR CPB €100/MWh ceiling survives alpha indexation (chosen side and mid)', () => {
    const hi: MarksState = { ...marks, marks: { ...marks.marks, FR_CPB: { ...marks.marks.FR_CPB, bid: 140, offer: 150, mid: 145 } } };
    const nb = computeNetback(getMarketById('FR_CPB')!, withYear(manure, 2026), hi, { ...fixedCosts, greenAlpha: 1.3 });
    expect(nb.certificateValue!.valueEurPerMWh).toBe(100);
    expect(nb.certificateValue!.capped).toBe(true);
    expect(nb.sides!.atMid! - nb.sides!.atChosenSides!).toBeCloseTo(0.5, 2); // only the molecule half-spread remains
  });

  it('P1-6: the German THG replacement ceiling uses the €600/tCO₂e §37c BImSchG penalty', () => {
    const nb = computeNetback(getMarketById('DE_THG')!, withYear(manure, 2026), marks, fixedCosts);
    expect(nb.principalRisk!.statutoryCeilingEurMwh).toBeCloseTo(600 * (94 + 100) * 0.0036, 2); // €419.04/MWh
  });

  it('P2: UK RTFC value is capped at the £0.50 buy-out price', () => {
    const gb: Consignment = { ...manure, originCountry: 'GB', injectionCountry: 'GB', injectionIsEU: false };
    const cv = computeCertificateValue(getMarketById('UK_RTFO')!, gb, marks, 'bid')!;
    expect(cv.capped).toBe(true);
    expect(cv.valueEurPerMWh).toBeCloseTo(0.5 * 1.17 * 144, 1);
  });
});

describe('Audit remediation — logistics topology', () => {
  it('P1-4: tariffs are stacked on the same corridor whose distance is priced, for every pair', () => {
    const nodes = Object.keys(PIPELINE_ADJACENCY);
    for (const a of nodes) {
      for (const b of nodes) {
        if (a === b) continue;
        expect(findShortestPipelinePath(a, b)).toEqual(calculateDijkstraCorridor(a, b).path);
      }
    }
    const route = calculateLogisticsRoute('SE', 'IT', 30);
    expect(route.physicalRoute.transitingCountries).toEqual(calculateDijkstraCorridor('SE', 'IT').path);
  });

  it('P1-5: no phantom GB–FR gas interconnector, Baltic Pipe DK–PL present, edges bidirectional except NO exports', () => {
    expect(PIPELINE_ADJACENCY.GB).not.toContain('FR');
    expect(PIPELINE_ADJACENCY.FR).not.toContain('GB');
    expect(PIPELINE_ADJACENCY.DK).toContain('PL');
    expect(PIPELINE_ADJACENCY.PL).toContain('DK');
    for (const [a, ns] of Object.entries(PIPELINE_ADJACENCY)) {
      if (a === 'NO') continue;
      for (const b of ns) expect(PIPELINE_ADJACENCY[b] ?? [], `${b} should list ${a}`).toContain(a);
    }
  });

  it('P1-5: DE→FR routes over the direct VIP France-Germany, not a Luxembourg detour', () => {
    expect(calculateDijkstraCorridor('DE', 'FR').path).toEqual(['DE', 'FR']);
  });

  it('P2: domestic delivery carries no transmission shrinkage', () => {
    expect(calculateLogisticsRoute('FR', 'FR', 30).physicalRoute.shrinkageLossPct).toBe(0);
  });
});

describe('Audit remediation — asset master integrity', () => {
  it('P1-8: origination only matches plants in the same ISO country with the same certified feedstock', () => {
    const plants = findPlantsForOrigination('DE', 'manure');
    expect(plants.length).toBeGreaterThan(0);
    expect(plants.every(p => p.countryCode === 'DE' && p.canonicalFeedstockKey === 'manure')).toBe(true);
    for (let i = 1; i < plants.length; i++) {
      expect((plants[i - 1].annualEnergyGWh ?? 0)).toBeGreaterThanOrEqual(plants[i].annualEnergyGWh ?? 0);
    }
    expect(findPlantsForOrigination('XX', 'manure')).toEqual([]);
  });

  it('P1-7: centroid placeholder coordinates are never surfaced as audited plant locations', () => {
    const counts = new Map<string, number>();
    for (const p of BIOMETHANE_PLANTS) {
      if (p.coordinates) counts.set(p.coordinates.join(','), (counts.get(p.coordinates.join(',')) ?? 0) + 1);
    }
    for (const p of BIOMETHANE_PLANTS) {
      const shared = p.coordinates ? counts.get(p.coordinates.join(','))! >= 5 : true;
      expect(hasApproximateCoordinates(p)).toBe(shared);
      if (shared) expect(getVerifiedPlantCoordinates(p)).toBeNull();
    }
  });
});

describe('Audit remediation (round 2) — plant registry data quality', () => {
  it('excludes the GIE/EBA map-legend OCR artefact that padded the registry to 1,975', () => {
    expect(BIOMETHANE_PLANTS.length).toBe(1974);
    expect(BIOMETHANE_PLANTS.find(p => /Map Legend Entry/i.test(p.name))).toBeUndefined();
  });

  it('never marks a plant verified when its coordinates are a centroid placeholder or it is a duplicate row', () => {
    for (const p of BIOMETHANE_PLANTS) {
      if (p.dataQuality?.approximateCoordinates) {
        expect(p.fieldsUnverified).toContain('coordinates');
        expect(p.isVerified).toBe(false);
      }
      if (p.dataQuality?.duplicateOf) expect(p.isVerified).toBe(false);
    }
    expect(BIOMETHANE_PLANTS.filter(p => p.dataQuality?.approximateCoordinates).length).toBe(666);
  });

  it('flags template street addresses and corporate fields the source does not publish', () => {
    const aberdeen = BIOMETHANE_PLANTS.find(p => p.countryCode === 'GB' && p.name === 'Aberdeen')!;
    expect(aberdeen.headquartersAddress).toContain('AD Facility'); // generated "Aber, Ceredigion" match
    expect(aberdeen.fieldsUnverified).toContain('headquartersAddress');
    for (const p of BIOMETHANE_PLANTS) {
      if (/not published by this source/i.test(p.provenance ?? '')) {
        expect(p.fieldsUnverified).toEqual(expect.arrayContaining(['operator', 'contactEmail', 'headquartersAddress']));
      }
    }
  });

  it('duplicate rows are excluded from origination matching so an asset is never double-counted', () => {
    const ids = findPlantsForOrigination('FR', 'manure').map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(findPlantsForOrigination('FR', 'manure').some(p => p.dataQuality?.duplicateOf)).toBe(false);
  });
});

describe('Audit remediation (round 2) — GO classification & feedstock rules', () => {
  const crop: Consignment = { ...manure, feedstock: 'energy_crops', feedstockName: 'Maize silage', annexClassification: 'CROP', carbonIntensity: 40 };
  const gate = (c: Consignment, id: string, g: string) =>
    evaluateEligibility(c, getMarketById(id)!).gates.find(x => x.gate === g)!;

  it('ES_GDO and PT_EEGO are Guarantee of Origin registries exempt from the RED III GHG gate', () => {
    for (const id of ['ES_GDO', 'PT_EEGO', 'DK_GO', 'DE_GO', 'NL_GO', 'FR_GO', 'UK_RGGO', 'AIB_GO']) {
      expect(getMarketById(id)!.isGuaranteeOfOrigin, id).toBe(true);
      expect(gate(crop, id, 'GHG_THRESHOLD').verdict, id).toBe('PASS');
      expect(gate(crop, id, 'FEEDSTOCK_CATEGORY').verdict, id).toBe('PASS');
    }
  });

  it('transport compliance markets still HARD_BLOCK a CI +40 crop consignment on the 65% gate', () => {
    for (const id of ['DE_THG', 'NL_ERE', 'FR_TIRUERT', 'IT_CIC', 'UK_RTFO']) {
      expect(gate(crop, id, 'GHG_THRESHOLD').verdict, id).toBe('HARD_BLOCK');
    }
  });

  it('FuelEU hard-blocks food/feed-crop Bio-LNG (Art. 10: least favourable fossil pathway)', () => {
    const lowCiCrop = { ...crop, carbonIntensity: 10 };
    expect(gate(lowCiCrop, 'FUELEU', 'FEEDSTOCK_CATEGORY').verdict).toBe('HARD_BLOCK');
  });

  it('the Art. 26 crop cap does not apply to heat & power markets', () => {
    expect(gate(crop, 'AT_EGG', 'FEEDSTOCK_CATEGORY').verdict).toBe('PASS');
    expect(gate(crop, 'DE_THG', 'FEEDSTOCK_CATEGORY').verdict).toBe('CONDITIONAL');
  });

  it('landfill gas is CONDITIONAL in transport/maritime compliance, pending Member State confirmation', () => {
    const lfg: Consignment = { ...manure, feedstock: 'landfill_gas', feedstockName: 'Landfill gas', carbonIntensity: 12 };
    expect(gate(lfg, 'DE_THG', 'FEEDSTOCK_CATEGORY').verdict).toBe('CONDITIONAL');
    expect(gate(lfg, 'FUELEU', 'FEEDSTOCK_CATEGORY').verdict).toBe('CONDITIONAL');
    expect(gate(lfg, 'DE_GO', 'FEEDSTOCK_CATEGORY').verdict).toBe('PASS');
  });
});

describe('Audit remediation (round 2) — FuelEU Annex I/II well-to-wake physics', () => {
  it('fossil fuel intensities follow Annex II defaults', () => {
    expect(FUELEU_VLSFO_WTW).toBeCloseTo(91.7442, 4); // HFO class
    expect(FUELEU_MGO_WTW).toBeCloseTo(90.7670, 3);
    expect(fossilLngWtw('LNG_OTTO_MS')).toBeCloseTo(89.203, 2);
    expect(fossilLngWtw('LNG_OTTO_SS')).toBeCloseTo(82.868, 2);
    expect(fossilLngWtw('LNG_DIESEL_SS')).toBeCloseTo(76.081, 2);
  });

  it('Bio-LNG carries its engine CH4 slip and N2O even though combustion CO2 is biogenic', () => {
    expect(bioLngFuelEUIntensity(-100, 'LNG_OTTO_SS')).toBeCloseTo(-90.6879, 3);
    expect(bioLngFuelEUIntensity(-100, 'LNG_DIESEL_SS')).toBeCloseTo(-100 + 1.6845, 3);
    expect(bioLngFuelEUIntensity(-100, 'LNG_OTTO_MS')).toBeGreaterThan(bioLngFuelEUIntensity(-100, 'LNG_OTTO_SS'));
  });

  it('the 41,000 MJ/t Annex IV penalty constant is independent of the VLSFO energy LHV', () => {
    const r = calculateVesselExposure({ vlsfoTonnes: 10000, mgoTonnes: 0, lngTonnes: 0, bioLngTonnes: 0, bioLngCi: -100, targetYear: 2025, consecutiveYearsNonCompliant: 1 });
    const energy = 10000 * 40500;
    const cbGrams = (91.7442 - 89.3368) * energy;
    expect(r.totalEnergyMj).toBe(energy);
    expect(r.statutoryPenaltyY1Eur).toBeCloseTo((cbGrams / (FUELEU_VLSFO_WTW * 41000)) * 2400, -1);
  });

  it('deficit-closure value is the exact marginal of the Annex IV penalty', () => {
    const ship = FUELEU_VLSFO_WTW;
    const target = 89.3368;
    const bio = bioLngFuelEUIntensity(-100);
    // Finite-difference check: displace 1 MJ of a 1e9 MJ VLSFO voyage with Bio-LNG
    const E = 1e9;
    const penalty = (g: number) => (2400 / 41000) * E * (1 - target / g);
    const g1 = (ship * (E - 1) + bio * 1) / E;
    const numericalPerMWh = (penalty(ship) - penalty(g1)) * 3600;
    expect(computeFuelEUDeficitClosureValue(-100, 1, target, ship).valueEurPerMWh).toBeCloseTo(numericalPerMWh, 2);
  });
});

describe('Audit remediation — deal URL contract', () => {
  it('P3: rejects whitespace, hex and negative non-CI numerics; keeps negative CI', () => {
    const p = parseDealParams(new URLSearchParams('volume=%20&plantAnnualGWh=0x10&plantCapacityNm3h=-5&ci=-100&complianceYear=2026.5'));
    expect(p.volume).toBeUndefined();
    expect(p.plantAnnualGWh).toBeUndefined();
    expect(p.plantCapacityNm3h).toBeUndefined();
    expect(p.complianceYear).toBeUndefined();
    expect(p.ci).toBe(-100);
  });

  it('P3: numeric round-trip through buildDealUrl is lossless', () => {
    const url = buildDealUrl({ marketId: 'DE_THG', originCountry: 'DK', feedstock: 'manure', ci: -78.35, volume: 123456, complianceYear: 2027 });
    const back = parseDealParams(new URLSearchParams(url.split('?')[1]));
    expect(back).toMatchObject({ ci: -78.35, volume: 123456, complianceYear: 2027 });
  });
});

describe('Audit remediation — FuelEU & curve units', () => {
  it('P2: FuelEU target trajectory covers 2025–2050 per Art. 4(2)', () => {
    expect(getFuelEUTargetIntensity(2025)).toBe(89.3368);
    expect(getFuelEUTargetIntensity(2029)).toBe(89.3368);
    expect(getFuelEUTargetIntensity(2030)).toBe(85.6904);
    expect(getFuelEUTargetIntensity(2035)).toBe(77.9418);
    expect(getFuelEUTargetIntensity(2040)).toBe(62.9004);
    expect(getFuelEUTargetIntensity(2045)).toBe(34.6408);
    expect(getFuelEUTargetIntensity(2050)).toBe(18.232);
    for (const [y, pct] of [[2025, 2], [2030, 6], [2035, 14.5], [2040, 31], [2045, 62], [2050, 80]] as const) {
      expect(getFuelEUTargetIntensity(y)).toBeCloseTo(91.16 * (1 - pct / 100), 4);
    }
  });

  it('P2: EU ETS maritime phase-in is 100% for every year from 2026', () => {
    const q26 = calculateMarineBunkerQuotation({ targetYear: 2026 });
    const q30 = calculateMarineBunkerQuotation({ targetYear: 2030 });
    const q25 = calculateMarineBunkerQuotation({ targetYear: 2025 });
    expect(q26.vlsfoEtsLiabilityEur).toBeCloseTo(q30.vlsfoEtsLiabilityEur, 2);
    expect(q26.vlsfoEtsLiabilityEur / q25.vlsfoEtsLiabilityEur).toBeCloseTo(EU_ETS_PHASE_IN_2026 / 0.7, 2);
  });

  it('P1-3: bunker quote uses the 49.1 GJ/t Bio-LNG LHV and is sensitive to Bio-LNG CI', () => {
    const neg100 = calculateMarineBunkerQuotation({ bioLngCi: -100 });
    const plus50 = calculateMarineBunkerQuotation({ bioLngCi: 50 });
    const aboveTarget = calculateMarineBunkerQuotation({ bioLngCi: 95 });
    expect(neg100.mwhPerTonneBioLng).toBeCloseTo(49100 / 3600, 6);
    expect(neg100.equivalentVlsfoTonnes).toBeCloseTo(49100 / 40500, 4); // Annex II HFO-class LCV
    expect(neg100.fuelEuSurplusValueEurPerTonne).toBeGreaterThan(plus50.fuelEuSurplusValueEurPerTonne);
    expect(aboveTarget.fuelEuSurplusTco2ePerTonne).toBe(0);
    // Statutory penalty on the displaced VLSFO is independent of the Bio-LNG CI
    expect(neg100.vlsfoFuelEuPenaltyEur).toBe(plus50.vlsfoFuelEuPenaltyEur);
    // 2030 vs 2025 VLSFO deficit ratio: (91.7442 − 85.6904) / (91.7442 − 89.3368) = 2.5146
    const y2030 = calculateMarineBunkerQuotation({ targetYear: 2030 });
    expect(y2030.vlsfoFuelEuPenaltyEur / neg100.vlsfoFuelEuPenaltyEur).toBeCloseTo(2.5146, 3);
  });

  it('P0-3 (curves): forward curve units match the registry desk-mark units', () => {
    expect(MARKET_METADATA.FUELEU.unit).toBe(getMarketById('FUELEU')!.unitLabel);
    expect(MARKET_METADATA.DE_THG.unit).toBe(getMarketById('DE_THG')!.unitLabel);
    expect(MARKET_METADATA.UK_RTFO.unit).toBe(getMarketById('UK_RTFO')!.unitLabel);
    const book = generateForwardCurves(marks);
    const cal26 = book.curves.UK_RTFO.tenors.CAL_2026;
    // Seasonal shape is proportional, so a £0.8 RTFC mark cannot go negative in summer
    expect(cal26.summerPrice).toBeGreaterThan(0);
  });
});
