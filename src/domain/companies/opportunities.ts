import { MarksState } from '../netback/types';
import { selectMarkPrice } from '../netback/engine';
import { FUELEU_ANNEX_II } from '../fueleu/calculator';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';
import { biomethaneMWhToAbate } from '../ets1/sites';
import { computeCompanyExposure } from '../ets2/companies';
import { Ets2CountryProfile } from '../ets2/countries';
import { computeValueStack, ETS2_START_YEAR, ValueStackInputs, ValueStackResult, StackRow } from '../valueStack/engine';
import { CompanyProfile, MarketKey } from './directory';

/**
 * Per-company view of every regulation it is exposed to (in €), and the concrete things the desk
 * can sell it — each sized, valued through the value-stack engine where a price exists, and
 * tied to the rule that makes it work. Pure: prices come in through the desk marks.
 */

/** How the ETS2 cell reads when there is no € figure. */
export type Ets2Standing = 'QUANTIFIED' | 'SUPPLIER_VOLUME_UNKNOWN' | 'END_USER' | 'NONE';

export interface RegulationExposure {
  /** FuelEU Maritime 2026 penalty if nothing is done (members in deficit), €. */
  fuelEuPenaltyEur: number | null;
  /** EU ETS maritime 2026 allowance cost (100% phase-in) at the desk EUA mark, €. */
  etsMaritimeEur: number | null;
  /** EU ETS1 allowance bill on the latest verified emissions at the desk EUA mark, €. */
  ets1BillEur: number | null;
  /** EU ETS2 allowance bill from 2028 at the desk ETS2 mark, where volume is known, €. */
  ets2CostEur: number | null;
  ets2Standing: Ets2Standing;
  /** What is at stake today (2026): FuelEU + ETS maritime + ETS1. ETS2 starts in 2028 and is kept apart. */
  costAtStakeNowEur: number | null;
}

const EUR_PER_EUR_M = 1_000_000;
const MJ_PER_MWH = 3600;
const GRAMS_PER_TONNE = 1_000_000;
/** FuelEU Annex II LNG lower calorific value, converted to MWh per tonne. */
const LNG_MWH_PER_TONNE = (FUELEU_ANNEX_II.LNG.lcvMjPerG * GRAMS_PER_TONNE) / MJ_PER_MWH;
/** A first ETS1 deal is sized at 10% of emissions at high/medium-fit sites (same as the Clients preset). */
export const ETS1_FIRST_DEAL_SHARE = 10 / 100;

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) : null;
}

export function computeRegulationExposure(
  p: CompanyProfile,
  marks: MarksState,
  ets2Countries: Ets2CountryProfile[]
): RegulationExposure {
  const eua = selectMarkPrice(marks.marks['EU_ETS1'], 'mid');
  const ets2Price = selectMarkPrice(marks.marks['EU_ETS2'], 'mid');

  const fuelEuPenaltyEur = p.fueleu.length ? p.fueleu.reduce((s, f) => s + f.penalty2026Eur, 0) : null;
  const maritimeT = p.fueleu.reduce((s, f) => s + f.etsCo2Tco2, 0);
  const etsMaritimeEur = maritimeT > 0 && eua !== null ? maritimeT * eua : null;
  const ets1T = p.ets1.reduce((s, c) => s + c.verifiedLatestTco2, 0);
  const ets1BillEur = p.ets1.length && eua !== null ? ets1T * eua : null;

  let ets2CostEur: number | null = null;
  let ets2Standing: Ets2Standing = 'NONE';
  if (p.ets2.length) {
    const suppliers = p.ets2.filter(e => e.role === 'REGULATED_SUPPLIER');
    const costs = computeCompanyExposure(suppliers, ets2Countries, ets2Price).map(x => x.ets2CostEurM);
    const known = sumOrNull(costs);
    ets2CostEur = known === null ? null : known * EUR_PER_EUR_M;
    ets2Standing = ets2CostEur !== null ? 'QUANTIFIED' : suppliers.length ? 'SUPPLIER_VOLUME_UNKNOWN' : 'END_USER';
  }

  return {
    fuelEuPenaltyEur,
    etsMaritimeEur,
    ets1BillEur,
    ets2CostEur,
    ets2Standing,
    costAtStakeNowEur: sumOrNull([fuelEuPenaltyEur, etsMaritimeEur, ets1BillEur]),
  };
}

export type OpportunityTiming = 'NOW' | 'FROM_2028';

export interface Opportunity {
  id: string;
  regulation: MarketKey | 'VOLUNTARY';
  /** Short name of the play, as shown in the directory. */
  title: string;
  /** What you sell. */
  product: string;
  /** Why it saves the client money or supports a claim — the mechanism. */
  why: string;
  timing: OpportunityTiming;
  volumeMWh: number | null;
  /** € per year the client avoids at desk marks, when it can be sized. */
  valueEur: number | null;
  /** What valueEur measures, e.g. "Penalty avoided" — distinct from the stack's market value. */
  valueLabel: string;
  /** € per MWh the client avoids, when only a unit value can be given. */
  valueEurPerMWh: number | null;
  /** How the value was worked out. */
  valueBasis: string;
  evidenceNeeded: string;
  legalBasis: string;
  caveats: string[];
  /** The value stack for this play — every regime the same MWh counts in — when the client burns the biomethane itself. */
  stack: StackSpec | null;
  /** Another screen that takes the play further (FuelEU pools, corporate pricing). */
  action: { label: string; route: string; params: Record<string, string> } | null;
}

/**
 * A play's value stack: the engine inputs, and a summary for tables. A stack "is available" when
 * at least two regimes the desk can price in € reward the same MWh at the same client (e.g. FuelEU
 * and the EU ETS for a ship burning bio-LNG). One priced regime plus reporting claims is not a
 * stack; neither is a company active in two markets, whose plays use different MWh.
 */
export interface StackSpec {
  inputs: ValueStackInputs;
  /** Regimes priced in € for the same MWh. */
  pricedRegimes: string[];
  /** Regimes that support a claim but carry no direct € value. */
  claims: string[];
  /** €/MWh of the priced regimes; low and high differ only where an input is still open (ships' intra-EU share). */
  eurPerMWhLow: number | null;
  eurPerMWhHigh: number | null;
  isStack: boolean;
}

function counted(r: StackRow, year: number | null): boolean {
  return r.status === 'COUNTS' || (r.status === 'FROM_2028' && year !== null && year >= ETS2_START_YEAR);
}

function pricedEur(result: ValueStackResult, year: number | null): number | null {
  const rows = result.rows.filter(r => counted(r, year) && r.eurPerMWh !== null);
  return rows.length ? rows.reduce((a, r) => a + (r.eurPerMWh as number), 0) : null;
}

/**
 * Summarises the stack for given inputs. Where a ship's intra-EU share is not known yet, the EU ETS
 * row is bounded by the two extremes (all voyages in/out of the EU: 50% coverage; all intra-EU: 100%).
 */
export function stackSpecFor(inputs: ValueStackInputs, marks: MarksState): StackSpec {
  const openShare = inputs.client === 'SHIP_OPERATOR' && inputs.intraEuShare === null;
  const low = computeValueStack(openShare ? { ...inputs, intraEuShare: 0 } : inputs, marks);
  const high = openShare ? computeValueStack({ ...inputs, intraEuShare: 1 }, marks) : low;
  const year = inputs.deliveryYear;
  const pricedRegimes = low.rows.filter(r => counted(r, year) && r.eurPerMWh !== null).map(r => r.regime);
  return {
    inputs,
    pricedRegimes,
    claims: low.rows.filter(r => r.status === 'CLAIM').map(r => r.regime),
    eurPerMWhLow: pricedEur(low, year),
    eurPerMWhHigh: pricedEur(high, year),
    isStack: pricedRegimes.length >= 2,
  };
}

const BASE_INPUTS: Omit<ValueStackInputs, 'client'> = {
  volumeMWh: null,
  carbonIntensity: -100,
  deliveryYear: null,
  intraEuShare: null,
  smallSiteShare: null,
  ets2PassThrough: null,
  greenTariffPremiumEurPerMWh: null,
  offerPremiumEurPerMWh: null,
};

/** Stack for an ETS1 group's first deal: 10% of emissions at its high/medium-fit sites, all at ETS1 installations. */
export function ets1StackSpec(fitVerifiedTco2: number, marks: MarksState, year: number): StackSpec | null {
  if (fitVerifiedTco2 <= 0) return null;
  const volumeMWh = Math.round(biomethaneMWhToAbate(fitVerifiedTco2 * ETS1_FIRST_DEAL_SHARE) / HHV_TO_LHV_FACTOR);
  return stackSpecFor({ ...BASE_INPUTS, client: 'ETS1_SITE', volumeMWh, deliveryYear: year, smallSiteShare: 0 }, marks);
}

/** Stack for an ETS2 regulated supplier from 2028, on its known volume where there is one. */
export function ets2SupplierStackSpec(volumeMWh: number | null, marks: MarksState): StackSpec {
  return stackSpecFor({ ...BASE_INPUTS, client: 'ETS2_SUPPLIER', volumeMWh, deliveryYear: ETS2_START_YEAR }, marks);
}

/** Stack for a ship operator burning bio-LNG (FuelEU + EU ETS maritime). */
export function shipStackSpec(volumeMWh: number | null, marks: MarksState, year: number): StackSpec {
  return stackSpecFor({ ...BASE_INPUTS, client: 'SHIP_OPERATOR', volumeMWh, deliveryYear: year }, marks);
}

function shippingOpportunities(p: CompanyProfile, marks: MarksState, year: number): Opportunity[] {
  if (!p.fueleu.length) return [];
  const out: Opportunity[] = [];
  const deficitT = p.fueleu.reduce((s, f) => s + f.deficit2026Tco2e, 0);
  const penalty = p.fueleu.reduce((s, f) => s + f.penalty2026Eur, 0);
  const needMWh = p.fueleu.reduce((s, f) => s + f.bioLngToCloseMWh, 0);
  const lngShips = p.fueleu.reduce((s, f) => s + f.group.lngShipCount, 0);
  const lngBurnMWh = p.fueleu.reduce((s, f) => s + f.group.lngTonnes, 0) * LNG_MWH_PER_TONNE;
  const charterers = p.fueleu.reduce((s, f) => s + f.group.fuelCostBearerMix.TIME_CHARTERER, 0);
  const owners = p.fueleu.reduce((s, f) => s + f.group.fuelCostBearerMix.OWNER_OPERATOR, 0);
  const bearerCaveat = charterers > owners
    ? ['Fuel is usually bought by time charterers here: the FuelEU obligation sits with the ISM company, but the bunker decision often with the charterer — pitch both.']
    : [];

  if (deficitT > 0 && needMWh > 0) {
    // Bio-LNG is a drop-in for LNG engines, so physical supply is capped by the LNG the group already burns.
    const physicalMWh = lngShips > 0 ? Math.min(needMWh, lngBurnMWh) : 0;
    const poolMWh = needMWh - physicalMWh;
    if (physicalMWh > 0) {
      out.push({
        id: 'ship-bio-lng',
        regulation: 'FUELEU',
        title: 'Bio-LNG bunkers',
        product: `Bio-LNG (−100 gCO₂e/MJ) for its ${lngShips} LNG-capable ship${lngShips > 1 ? 's' : ''}`,
        why: 'Lowers the fleet GHG intensity under FuelEU and, being zero-rated, cuts EU ETS maritime allowances on the same MWh — the two stack.',
        timing: 'NOW',
        volumeMWh: physicalMWh,
        valueEur: (penalty * physicalMWh) / needMWh,
        valueLabel: 'Penalty avoided',
        valueEurPerMWh: null,
        valueBasis: 'FuelEU penalty avoided, pro rata to the deficit closed. The value stack below prices the same MWh at market (what buying the compliance would cost) and adds the EU ETS maritime saving.',
        evidenceNeeded: 'PoS with RED III actual value, bunker delivery notes, verifier acceptance in the FuelEU report.',
        legalBasis: 'Regulation (EU) 2023/1805 Art. 4 & Annex I; Directive 2003/87/EC Art. 3ga & MRR Annex VI (zero-rating)',
        caveats: [
          ...(physicalMWh < needMWh ? [`Capped at the LNG the group burned in 2024 (${Math.round(lngBurnMWh).toLocaleString('en-GB')} MWh); the rest needs pooling.`] : []),
          ...bearerCaveat,
        ],
        stack: shipStackSpec(Math.round(physicalMWh), marks, year),
        action: null,
      });
    }
    if (poolMWh > 0) {
      out.push({
        id: 'ship-pool',
        regulation: 'FUELEU',
        title: 'FuelEU pool surplus',
        product: 'Compliance surplus from a pool of ships burning bio-LNG (FuelEU pooling)',
        why: lngShips > 0
          ? 'Covers the part of the deficit its LNG ships cannot burn away; the surplus comes from other ships running on bio-LNG.'
          : 'It has no LNG-capable ships, so it cannot burn bio-LNG itself — pooling with ships that do is the only biomethane route.',
        timing: 'NOW',
        volumeMWh: poolMWh,
        valueEur: (penalty * poolMWh) / needMWh,
        valueLabel: 'Penalty avoided',
        valueEurPerMWh: null,
        valueBasis: 'FuelEU penalty avoided, pro rata; the client pays the pool price out of this.',
        evidenceNeeded: 'Pool registered in FuelEU Database before 30 April; verified surplus of the pooling ships.',
        legalBasis: 'Regulation (EU) 2023/1805 Art. 21 (pooling)',
        caveats: ['Pooling moves the FuelEU balance only: no EU ETS saving for this client.', ...bearerCaveat],
        stack: null,
        action: { label: 'Open FuelEU desk', route: '/fueleu-shipping', params: {} },
      });
    }
  } else if (lngShips > 0) {
    out.push({
      id: 'ship-ets',
      regulation: 'ETS_MARITIME',
      title: 'Bio-LNG for ETS + banked surplus',
      product: 'Bio-LNG for its LNG-capable ships',
      why: 'Already FuelEU-compliant, so bio-LNG earns zero-rated EU ETS allowances and a FuelEU surplus it can bank or pool out.',
      timing: 'NOW',
      volumeMWh: null,
      valueEur: null,
      valueLabel: 'Value to client',
      valueEurPerMWh: null,
      valueBasis: 'Depends on volume and the intra-EU share — see the value stack below.',
      evidenceNeeded: 'PoS, bunker delivery notes, verifier acceptance.',
      legalBasis: 'Directive 2003/87/EC Art. 3ga; Regulation (EU) 2023/1805 Art. 20–21',
      caveats: bearerCaveat,
      stack: shipStackSpec(null, marks, year),
      action: null,
    });
  } else if (p.fueleu.some(f => f.group.surplusMemberCount > 0)) {
    out.push({
      id: 'ship-source-surplus',
      regulation: 'FUELEU',
      title: 'Source its FuelEU surplus',
      product: 'Buy its surplus for your pools (a supply lead, not a sale)',
      why: 'Members with a compliance surplus can pool it out; that surplus serves deficit clients.',
      timing: 'NOW',
      volumeMWh: null,
      valueEur: null,
      valueLabel: 'Value to client',
      valueEurPerMWh: null,
      valueBasis: 'Supply side — value sits with the buyers you pool it to.',
      evidenceNeeded: 'Verified FuelEU report showing the surplus.',
      legalBasis: 'Regulation (EU) 2023/1805 Art. 21',
      caveats: [],
      stack: null,
      action: { label: 'Open FuelEU desk', route: '/fueleu-shipping', params: {} },
    });
  }
  return out;
}

function ets1Opportunities(p: CompanyProfile, marks: MarksState, year: number): Opportunity[] {
  if (!p.ets1.length) return [];
  const fitT = p.ets1.reduce((s, c) => s + c.fitVerifiedLatestTco2, 0);
  if (fitT <= 0) {
    return [{
      id: 'ets1-low-fit',
      regulation: 'ETS1',
      title: 'Check site gas use first',
      product: 'Biomethane for the natural gas its sites burn (if any)',
      why: 'Its sites are in sectors where most emissions come from processes or other fuels; biomethane only replaces the natural gas share.',
      timing: 'NOW',
      volumeMWh: null,
      valueEur: null,
      valueLabel: 'Value to client',
      valueEurPerMWh: null,
      valueBasis: 'Needs the sites\' gas consumption before it can be sized.',
      evidenceNeeded: 'Site fuel mix from the monitoring plan or the client.',
      legalBasis: 'MRR (EU) 2018/2066 Art. 38–39',
      caveats: ['Low-priority lead unless the client confirms material gas burn.'],
      stack: null,
      action: null,
    }];
  }
  const volumeMWh = Math.round(biomethaneMWhToAbate(fitT * ETS1_FIRST_DEAL_SHARE) / HHV_TO_LHV_FACTOR);
  // The EUTL records no fuel type: a power or district-heat plant may burn coal or lignite, which
  // biomethane cannot replace. When such plants carry most of the fit emissions, say so up front.
  const fitSites = p.ets1.flatMap(c => c.sites).filter(s => s.fit !== 'LOW');
  const powerT = fitSites.filter(s => s.sector === 'POWER_HEAT').reduce((a, s) => a + s.verifiedLatestTco2, 0);
  const processHeatT = fitSites.filter(s => s.fit === 'HIGH').reduce((a, s) => a + s.verifiedLatestTco2, 0);
  const oilGasT = fitSites.filter(s => s.sector === 'REFINING_OIL_GAS').reduce((a, s) => a + s.verifiedLatestTco2, 0);
  const powerLed = powerT * 2 > fitT;
  const oilGasLed = oilGasT * 2 > fitT;
  const stack = computeValueStack(
    { client: 'ETS1_SITE', volumeMWh, carbonIntensity: -100, deliveryYear: year, intraEuShare: null, smallSiteShare: 0, ets2PassThrough: null, greenTariffPremiumEurPerMWh: null, offerPremiumEurPerMWh: null },
    marks
  );
  const spec = ets1StackSpec(fitT, marks, year);
  return [{
    id: 'ets1-biomethane',
    regulation: 'ETS1',
    title: powerLed || oilGasLed ? 'Biomethane for ETS1 sites — check fuel' : 'Biomethane for ETS1 sites',
    product: 'Grid biomethane with PoS, delivered to its gas-fired installations',
    why: 'Biomethane meeting RED III criteria counts at zero emissions in the site\'s ETS report, so it buys fewer allowances for every MWh of gas replaced.',
    timing: 'NOW',
    volumeMWh,
    valueEur: stack.stackAnnualEur,
    valueLabel: 'Allowances saved',
    valueEurPerMWh: stack.stackEurPerMWh,
    valueBasis: `A first deal cutting 10% of emissions at its high/medium-fit sites, valued at the desk EUA mark by the value-stack engine.`,
    evidenceNeeded: 'RED III sustainability evidence via the Union Database (PoS assigned to the site); accepted by the site\'s verifier.',
    legalBasis: 'MRR (EU) 2018/2066 Art. 38–39 & Annex VI',
    caveats: [
      ...(powerLed
        ? [`Mostly power & heat plants (${Math.round(powerT).toLocaleString('en-GB')} of ${Math.round(fitT).toLocaleString('en-GB')} tCO₂): the EU registry does not say which fuel they burn. Coal- or lignite-fired units cannot take biomethane — confirm the gas-fired units before pitching.`]
        : []),
      ...(oilGasLed
        ? [`Mostly refining and oil & gas installations (${Math.round(oilGasT).toLocaleString('en-GB')} of ${Math.round(fitT).toLocaleString('en-GB')} tCO₂): these often burn their own fuel gas, and offshore platforms have no grid connection for biomethane — only grid-fed onshore units qualify.`]
        : []),
      ...(processHeatT > 0 ? [`Process-heat sites (the strongest fit): ${Math.round(processHeatT).toLocaleString('en-GB')} tCO₂.`] : []),
      'Sites below 20 MW rated thermal input fall under ETS2 instead — check before sizing.',
    ],
    stack: spec,
    action: null,
  }];
}

function ets2Opportunities(p: CompanyProfile, marks: MarksState, ets2Countries: Ets2CountryProfile[]): Opportunity[] {
  const out: Opportunity[] = [];
  const suppliers = p.ets2.filter(e => e.role === 'REGULATED_SUPPLIER');
  const endUsers = p.ets2.filter(e => e.role === 'EXPOSED_END_USER');
  if (suppliers.length) {
    const stack = computeValueStack(
      { client: 'ETS2_SUPPLIER', volumeMWh: null, carbonIntensity: -100, deliveryYear: ETS2_START_YEAR, intraEuShare: null, smallSiteShare: null, ets2PassThrough: null, greenTariffPremiumEurPerMWh: null, offerPremiumEurPerMWh: null },
      marks
    );
    const byIso = new Map(ets2Countries.map(c => [c.iso, c]));
    const pricedToday = [...new Set(suppliers.map(s => s.countryIso))]
      .map(iso => byIso.get(iso))
      .filter((c): c is Ets2CountryProfile => !!c && c.existingCarbonPricing.kind !== 'UNKNOWN');
    out.push({
      id: 'ets2-supplier',
      regulation: 'ETS2',
      title: 'Zero-rated gas for ETS2',
      product: `Biomethane supply for ${ETS2_START_YEAR}+ (forward contracts) and green-gas tariffs`,
      why: 'Gas suppliers surrender ETS2 allowances for the gas they sell from 2028; biomethane with a zero emission factor needs none, so every MWh cuts that bill.',
      timing: 'FROM_2028',
      volumeMWh: null,
      valueEur: null,
      valueLabel: 'Allowances saved',
      valueEurPerMWh: stack.rows.find(r => r.status === 'FROM_2028')?.eurPerMWh ?? null,
      valueBasis: 'Allowance cost avoided per MWh at the desk ETS2 mark (value-stack engine), before any green-tariff premium.',
      evidenceNeeded: 'Sustainability evidence accepted by the national ETS2 authority; supply contract zero-rating clause.',
      legalBasis: 'Directive 2003/87/EC Chapter IVa & Annex III (as amended by 2023/959)',
      caveats: pricedToday.map(c => `${c.name}: already priced today under ${c.existingCarbonPricing.label} — a sale can start now; verify its zero-rating rules.`),
      stack: ets2SupplierStackSpec(null, marks),
      action: null,
    });
  }
  if (endUsers.length) {
    out.push({
      id: 'ets2-end-user',
      regulation: 'VOLUNTARY',
      title: 'Corporate biomethane (Scope 1)',
      product: 'Biomethane certificates (GO + PoS) for its sites\' heat',
      why: `${endUsers.map(e => e.sector).filter(Boolean).join(', ') || 'End user'} with public decarbonisation commitments; ETS2 will raise its gas bill from 2028 through its supplier.`,
      timing: 'NOW',
      volumeMWh: null,
      valueEur: null,
      valueLabel: 'Value to client',
      valueEurPerMWh: null,
      valueBasis: 'Voluntary purchase — price it as a corporate order.',
      evidenceNeeded: 'GOs cancelled in the client\'s name for the same MWh as the PoS.',
      legalBasis: 'GHG Protocol Scope 1; ESRS E1; RED III Art. 19',
      caveats: [],
      stack: null,
      action: { label: 'Price a corporate order', route: '/corporate', params: {} },
    });
  }
  return out;
}

const TIMING_RANK: Record<OpportunityTiming, number> = { NOW: 0, FROM_2028: 1 };

/** Every play for this company, largest sized value first, then unit-valued, then unsized. */
export function computeOpportunities(
  p: CompanyProfile,
  marks: MarksState,
  ets2Countries: Ets2CountryProfile[],
  year: number
): Opportunity[] {
  const all = [
    ...shippingOpportunities(p, marks, year),
    ...ets1Opportunities(p, marks, year),
    ...ets2Opportunities(p, marks, ets2Countries),
  ];
  const tier = (o: Opportunity) => (o.valueEur !== null ? 0 : o.valueEurPerMWh !== null ? 1 : 2);
  return all.sort((a, b) => {
    if (tier(a) !== tier(b)) return tier(a) < tier(b) ? -1 : 1;
    if (a.valueEur !== null && b.valueEur !== null && a.valueEur !== b.valueEur) return a.valueEur > b.valueEur ? -1 : 1;
    return TIMING_RANK[a.timing] - TIMING_RANK[b.timing];
  });
}
