import { describe, it, expect } from 'vitest';
import { buildCompanyDirectory, CompanyProfile } from '../companies/directory';
import { computeRegulationExposure, computeOpportunities, biomethaneValueEur, stackAnnualEur, ets1FirstDealShare, ets1StackSpec, shipStackSpec } from '../companies/opportunities';
import { computeValueStack } from '../valueStack/engine';
import { ETS1_LATEST_YEAR } from '../ets1/sites';
import { ETS2_COUNTRIES } from '../ets2/countries';
import { ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';
import { biomethaneMWhToAbate } from '../ets1/sites';
import { FUELEU_ANNEX_II } from '../fueleu/calculator';
import { MarksState } from '../netback/types';

const mark = (id: string, mid: number) => ({ marketId: id, bid: mid, offer: mid, mid, updatedAt: null, source: 'test' });
const marks: MarksState = {
  marks: { EU_ETS1: mark('EU_ETS1', 70), EU_ETS2: mark('EU_ETS2', 50), FUELEU: mark('FUELEU', 250) },
  gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
  fx: { gbpEur: null, chfEur: null, updatedAt: null },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
};
const YEAR = 2026;
const directory = buildCompanyDirectory();
const lngMWhPerT = (FUELEU_ANNEX_II.LNG.lcvMjPerG * 1_000_000) / 3600;
const sum = (p: CompanyProfile, f: (x: CompanyProfile['fueleu'][number]) => number) => p.fueleu.reduce((s, x) => s + f(x), 0);

describe('regulation exposure', () => {
  it('prices ETS maritime and ETS1 at the EUA mark and FuelEU at the pool mark; the total is only the regimes running now', () => {
    const ctv = directory.find(p => p.id === 'cementos tudela veguin')!;
    const x = computeRegulationExposure(ctv, marks, ETS2_COUNTRIES);
    const maritimeT = sum(ctv, f => f.etsCo2Tco2);
    const ets1T = ctv.ets1.reduce((s, c) => s + c.verifiedLatestTco2, 0);
    const deficit = sum(ctv, f => f.deficit2026Tco2e);
    expect(x.etsMaritimeEur).toBeCloseTo(maritimeT * 70, 6);
    expect(x.ets1BillEur).toBeCloseTo(ets1T * 70, 6);
    expect(x.fuelEuCostEur).toBeCloseTo(deficit * 250, 6);
    expect(x.costNowEur).toBeCloseTo(deficit * 250 + maritimeT * 70 + ets1T * 70, 6);
    // The statutory penalty is kept for the detail view but is not part of what compliance costs.
    expect(x.fuelEuPenaltyEur).toBeGreaterThan(x.fuelEuCostEur as number);
    expect(x.ets2Standing).toBe('NONE');
  });

  it('a company with no FuelEU deficit is Compliant, not a zero cost; with no pool mark the deficit is unpriced', () => {
    const compliant = directory.find(p => p.fueleu.length && !p.ets1.length && sum(p, f => f.deficit2026Tco2e) === 0);
    if (compliant) {
      const x = computeRegulationExposure(compliant, marks, ETS2_COUNTRIES);
      expect(x.fuelEuState).toBe('COMPLIANT');
      expect(x.fuelEuCostEur).toBe(0);
    }
    const ship = directory.find(p => p.fueleu.length && !p.ets1.length && sum(p, f => f.deficit2026Tco2e) > 0)!;
    const noPool: MarksState = { ...marks, marks: { EU_ETS1: marks.marks['EU_ETS1'], EU_ETS2: marks.marks['EU_ETS2'] } };
    const y = computeRegulationExposure(ship, noPool, ETS2_COUNTRIES);
    expect(y.fuelEuState).toBe('NO_MARK');
    expect(y.fuelEuCostEur).toBeNull();
    expect(y.costNowIncomplete).toBe(true);
    expect(y.fuelEuPenaltyEur).toBeGreaterThan(0);
  });

  it('keeps ETS2 out of the "now" total and marks end users as unquantified', () => {
    const sanofi = directory.find(p => p.id === 'sanofi chimie')!;
    const x = computeRegulationExposure(sanofi, marks, ETS2_COUNTRIES);
    expect(x.ets2Standing).toBe('END_USER');
    expect(x.costNowEur).toBeCloseTo(x.ets1BillEur ?? 0, 6);
  });

  it('ETS2: a supplier with only some countries quantified is PARTIAL and names them; a missing price is not "volume unknown"', () => {
    const endesa = directory.find(p => p.id === 'endesa')!;
    const x = computeRegulationExposure(endesa, marks, ETS2_COUNTRIES);
    expect(['PARTIAL', 'QUANTIFIED']).toContain(x.ets2Standing);
    if (x.ets2Standing === 'PARTIAL') {
      expect(x.ets2CoveredCountries.length).toBeGreaterThan(0);
      expect(x.ets2UncoveredCountries.length).toBeGreaterThan(0);
    }
    const noEts2: MarksState = { ...marks, marks: { EU_ETS1: marks.marks['EU_ETS1'], FUELEU: marks.marks['FUELEU'] } };
    const y = computeRegulationExposure(endesa, noEts2, ETS2_COUNTRIES);
    expect(y.ets2Standing).toBe('NO_ETS2_PRICE');
    expect(y.ets2CostEur).toBeNull();
  });
});

describe('opportunities', () => {
  it('shipping without LNG ships: pooling is the only route, valued at the pool mark not the penalty', () => {
    const p = directory.find(q => q.fueleu.length && sum(q, f => f.deficit2026Tco2e) > 0 && sum(q, f => f.group.lngShipCount) === 0 && !q.ets1.length && !q.ets2.length && sum(q, f => f.bioLngToCloseMWh) > 0)!;
    const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.map(o => o.id)).toEqual(['ship-pool']);
    expect(ops[0].valueEur).toBeCloseTo(sum(p, f => f.deficit2026Tco2e) * 250, 6);
    expect(ops[0].valueEur).toBeLessThan(sum(p, f => f.penalty2026Eur));
    expect(ops[0].valueLabel).toBe('Compliance at pool price');
    expect(ops[0].caveats.join(' ')).toMatch(/no EU ETS saving/);
  });

  it('a deficit too small to round to a bio-LNG volume is pooled, not called compliant', () => {
    const p = directory.find(q => q.fueleu.length && sum(q, f => f.deficit2026Tco2e) > 0 && sum(q, f => f.bioLngToCloseMWh) === 0);
    if (!p) return;
    const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.some(o => o.id === 'ship-pool')).toBe(true);
  });

  it('shipping with LNG ships: bio-LNG capped at current LNG burn, the rest pooled; values are at market, pool share = deficit share x pool mark', () => {
    const p = directory.find(q => {
      const need = sum(q, f => f.bioLngToCloseMWh);
      const burn = sum(q, f => f.group.lngTonnes) * lngMWhPerT;
      return sum(q, f => f.group.lngShipCount) > 0 && need > burn && burn > 0 && sum(q, f => f.deficit2026Tco2e) > 0;
    });
    expect(p).toBeDefined();
    const ops = computeOpportunities(p!, marks, ETS2_COUNTRIES, YEAR);
    const bio = ops.find(o => o.id === 'ship-bio-lng')!;
    const pool = ops.find(o => o.id === 'ship-pool')!;
    const need = sum(p!, f => f.bioLngToCloseMWh);
    expect(bio.volumeMWh).toBeCloseTo(sum(p!, f => f.group.lngTonnes) * lngMWhPerT, 3);
    expect((bio.volumeMWh ?? 0) + (pool.volumeMWh ?? 0)).toBeCloseTo(need, 3);
    expect(pool.valueEur).toBeCloseTo(((sum(p!, f => f.deficit2026Tco2e) * (pool.volumeMWh ?? 0)) / need) * 250, 3);
    expect(bio.valueEur! + pool.valueEur!).toBeLessThan(sum(p!, f => f.penalty2026Eur));
  });

  it('ship-bio-lng: the row, the play and the stack card show the same number', () => {
    const p = directory.find(q => sum(q, f => f.group.lngShipCount) > 0 && sum(q, f => f.bioLngToCloseMWh) > 0 && sum(q, f => f.deficit2026Tco2e) > 0)!;
    const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
    const bio = ops.find(o => o.id === 'ship-bio-lng')!;
    // What ValueStackCard prints: the engine's priced €/MWh rows x the volume (low end while the intra-EU share is open).
    const inputs = bio.stack!.inputs;
    const low = computeValueStack({ ...inputs, intraEuShare: 0 }, marks);
    const cardPerMWh = low.rows.filter(r => r.status === 'COUNTS' && r.eurPerMWh !== null).reduce((a, r) => a + (r.eurPerMWh as number), 0);
    expect(bio.valueEur).toBeCloseTo(cardPerMWh * inputs.volumeMWh!, 4);
    expect(stackAnnualEur(bio.stack!).low).toBeCloseTo(bio.valueEur!, 6);
    // Row = play: the Biomethane value column is the sum of the NOW plays.
    expect(biomethaneValueEur(ops)).toBeCloseTo(ops.filter(o => o.timing === 'NOW').reduce((a, o) => a + (o.valueEur ?? 0), 0), 6);
    expect(cardPerMWh).toBeGreaterThan(0);
    expect(bio.valueEurHigh ?? bio.valueEur!).toBeGreaterThanOrEqual(bio.valueEur!);
  });

  it('ETS1: valued at the full fit-site potential (fit tonnes x EUA), first deal shown as a volume only', () => {
    const edison = directory.find(p => p.id === 'edison')!;
    const op = computeOpportunities(edison, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    const fitT = edison.ets1.reduce((s, c) => s + c.fitVerifiedLatestTco2, 0);
    const volume = Math.round(biomethaneMWhToAbate(fitT) / HHV_TO_LHV_FACTOR);
    expect(op.volumeMWh).toBe(volume);
    expect(op.valueEur).toBeCloseTo(fitT * 70, 3);
    expect(op.firstDealMWh).toBe(Math.round(volume * ets1FirstDealShare()));
    expect(ets1FirstDealShare()).toBeCloseTo(0.1, 9);
    // The stack card, on the rounded volume, agrees to within one MWh of value.
    const stack = computeValueStack({ client: 'ETS1_SITE', volumeMWh: volume, carbonIntensity: -100, deliveryYear: YEAR, intraEuShare: null, smallSiteShare: 0, ets2PassThrough: null, greenTariffPremiumEurPerMWh: null, offerPremiumEurPerMWh: null }, marks);
    expect(Math.abs(op.valueEur! - (stack.stackAnnualEur as number))).toBeLessThan(20);
    expect(stackAnnualEur(op.stack!).low).toBeCloseTo(stack.stackAnnualEur as number, 6);
  });

  it('ETS1 tonnes come from the latest EUTL year', () => {
    expect(ETS1_LATEST_YEAR).toBeGreaterThanOrEqual(2023);
  });

  it('ETS2 supplier: allowance cost avoided per MWh from 2028; flags countries already priced today', () => {
    const edison = directory.find(p => p.id === 'edison')!;
    const op = computeOpportunities(edison, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets2-supplier')!;
    expect(op.timing).toBe('FROM_2028');
    expect(op.valueEurPerMWh).toBeCloseTo(50 * ETS_NATURAL_GAS_TCO2_PER_MWH * HHV_TO_LHV_FACTOR, 6);
    const german = directory.find(p => p.ets2.some(e => e.role === 'REGULATED_SUPPLIER' && e.countryIso === 'DE'))!;
    const deOp = computeOpportunities(german, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets2-supplier')!;
    expect(deOp.caveats.join(' ')).toMatch(/BEHG/);
  });

  it('exposed end user: corporate order, not a compliance sale', () => {
    const sanofi = directory.find(p => p.id === 'sanofi chimie')!;
    const op = computeOpportunities(sanofi, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets2-end-user')!;
    expect(op.action?.route).toBe('/corporate');
  });

  it('ranks sized plays first, largest value first', () => {
    for (const p of directory.filter(q => q.markets.length > 2).slice(0, 50)) {
      const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
      const sized = ops.filter(o => o.valueEur !== null);
      expect(ops.slice(0, sized.length)).toEqual(sized);
      for (let i = 1; i < sized.length; i++) expect(sized[i - 1].valueEur!).toBeGreaterThanOrEqual(sized[i].valueEur!);
    }
  });
});

describe('opportunities — fuel caveat', () => {
  it('flags companies whose fit emissions are mostly power & heat plants (fuel unknown)', () => {
    const pge = directory.find(p => p.id.startsWith('pge polska grupa energetyczna'))!;
    const op = computeOpportunities(pge, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    expect(op.title).toMatch(/check fuel/);
    expect(op.caveats[0]).toMatch(/coal or lignite|Coal- or lignite/);
  });
});

describe('opportunities — oil & gas caveat', () => {
  it('flags companies whose fit emissions are mostly refining / oil & gas installations', () => {
    const equinor = directory.find(p => p.id === 'equinor')!;
    const op = computeOpportunities(equinor, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    expect(op.title).toMatch(/check fuel/);
    expect(op.caveats.join(' ')).toMatch(/offshore/);
  });
});

describe('value stack per play', () => {
  it('a ship burning bio-LNG stacks FuelEU and EU ETS maritime on the same MWh, as a range until the intra-EU share is known', () => {
    const spec = shipStackSpec(10_000, marks, YEAR);
    expect(spec.isStack).toBe(true);
    expect(spec.pricedRegimes).toEqual(['FuelEU Maritime', 'EU ETS (maritime)']);
    // ETS maritime covers 50% of extra-EU voyages, 100% of intra-EU ones.
    const ets = 70 * ETS_NATURAL_GAS_TCO2_PER_MWH;
    expect((spec.eurPerMWhHigh as number) - (spec.eurPerMWhLow as number)).toBeCloseTo(ets / 2, 6);
  });

  it('an ETS1 group is one priced regime plus claims — not badged as a stack, from 2028 either', () => {
    const spec = ets1StackSpec(100_000, marks, YEAR)!;
    expect(spec.isStack).toBe(false);
    // From 2028 the ETS2 small-site row counts, but at zero EUR/MWh: still not a stack.
    const later = ets1StackSpec(100_000, marks, 2028)!;
    expect(later.isStack).toBe(false);
    expect(later.pricedRegimes).toEqual(['EU ETS1 (installation)']);
    expect(spec.pricedRegimes).toEqual(['EU ETS1 (installation)']);
    expect(spec.claims.length).toBeGreaterThan(0);
    expect(spec.eurPerMWhLow).toBeCloseTo(70 * ETS_NATURAL_GAS_TCO2_PER_MWH * HHV_TO_LHV_FACTOR, 6);
  });

  it('the ETS1 play carries its stack, and no play links to the retired value-stack screen', () => {
    const edison = directory.find(p => p.id === 'edison')!;
    const ops = computeOpportunities(edison, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.find(o => o.id === 'ets1-biomethane')?.stack).not.toBeNull();
    for (const p of directory.filter(q => q.markets.length > 1).slice(0, 200)) {
      for (const o of computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR)) expect(o.action?.route).not.toBe('/value-stack');
    }
  });

  it('only plays where the client burns the biomethane itself get a stack (not pooling, not sourcing)', () => {
    const pooled = directory.find(q => q.fueleu.length && sum(q, f => f.deficit2026Tco2e) > 0 && sum(q, f => f.group.lngShipCount) === 0 && !q.ets1.length && !q.ets2.length)!;
    const ops = computeOpportunities(pooled, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.every(o => o.stack === null)).toBe(true);
  });
});
