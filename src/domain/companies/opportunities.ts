import { MarksState } from '../netback/types';
import { selectMarkPrice } from '../netback/engine';
import { FUELEU_ANNEX_II } from '../fueleu/calculator';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';
import { biomethaneMWhToAbate, ets1AvoidedValuePerMWh, Ets1Company, Ets1Sector } from '../ets1/sites';
import { getAssumption } from '../assumptions/registry';
import { SHIPPING_DATA_YEAR } from './dataYears';
import { computeCompanyExposure } from '../ets2/companies';
import { Ets2CountryProfile } from '../ets2/countries';
import { computeValueStack, ETS2_START_YEAR, ValueStackInputs, ValueStackResult, StackRow } from '../valueStack/engine';
import { CompanyProfile, MarketKey } from './directory';

/**
 * Per-company view of every regulation it is exposed to (in €), and the concrete things the desk
 * can sell it — each sized, valued through the value-stack engine where a price exists, and
 * tied to the rule that makes it work. Pure: prices come in through the desk marks.
 */

/** How the ETS2 cell reads when there is no full € figure. */
export type Ets2Standing = 'QUANTIFIED' | 'PARTIAL' | 'SUPPLIER_VOLUME_UNKNOWN' | 'NO_ETS2_PRICE' | 'END_USER' | 'NONE';

/** How the FuelEU cell reads: no exposure, no deficit, priced at the pool mark, or a deficit with no mark to price it. */
export type FuelEuState = 'NONE' | 'COMPLIANT' | 'PRICED' | 'NO_MARK';

export interface RegulationExposure {
  /** FuelEU Maritime 2026 penalty if nothing is done (members in deficit), €. A statutory ceiling, not what compliance costs. */
  fuelEuPenaltyEur: number | null;
  /** 2026 deficit of the members in deficit, tCO₂e. */
  fuelEuDeficitTco2e: number | null;
  /** FuelEU 2026 compliance cost: the deficit bought at the desk pool mark, €. Zero when compliant; null with no pool mark. */
  fuelEuCostEur: number | null;
  fuelEuState: FuelEuState;
  /** EU ETS maritime 2026 allowance cost (100% phase-in) at the desk EUA mark, €. */
  etsMaritimeEur: number | null;
  /** EU ETS1 allowance bill at the desk EUA mark, €: verified emissions net of free allocation, at company level. */
  ets1BillEur: number | null;
  /** Verified emissions, gross of free allocation, tCO₂. */
  ets1Tco2: number | null;
  /** Free allocation across its sites, tCO₂ (sites with no registry figure count as 0). */
  ets1FreeAllocTco2: number | null;
  /** The tonnes behind ets1BillEur: max(0, gross − free allocation). */
  ets1NetTco2: number | null;
  /** Sites with no free-allocation figure: the net figure is an upper bound while this is above 0. */
  ets1AllocUnknownSites: number;
  /** Sites whose latest-year figure is not reported yet, so the year before stands in. */
  ets1PriorYearSites: number;
  /** EU ETS2 allowance bill from 2028 at the desk ETS2 mark, for the suppliers whose volume is known, €. */
  ets2CostEur: number | null;
  ets2Standing: Ets2Standing;
  /** Supplier countries the ETS2 figure covers, and the ones with no volume yet (a PARTIAL figure). */
  ets2CoveredCountries: string[];
  ets2UncoveredCountries: string[];
  /** One line per supplier country: what share of the disclosed volume the ETS2 figure covers, and the source. */
  ets2ScopeLines: string[];
  /** Cost now, per year: FuelEU compliance cost + ETS maritime + ETS1 (gross). ETS2 starts in 2028 and is kept apart. */
  costNowEur: number | null;
  /** True when a FuelEU deficit could not be priced (no pool mark), so costNowEur leaves it out. */
  costNowIncomplete: boolean;
}

const EUR_PER_EUR_M = 1_000_000;
const PERCENT = 100;
const MJ_PER_MWH = 3600;
const GRAMS_PER_TONNE = 1_000_000;
/** FuelEU Annex II LNG lower calorific value, converted to MWh per tonne. */
const LNG_MWH_PER_TONNE = (FUELEU_ANNEX_II.LNG.lcvMjPerG * GRAMS_PER_TONNE) / MJ_PER_MWH;

/**
 * The volume suggested for a first ETS1 deal, as a share of the play's full potential. A desk
 * heuristic (registry key clients.firstDealShare), shown as a volume only — it is not in any value.
 */
export function ets1FirstDealShare(): number {
  return getAssumption('clients.firstDealShare') / PERCENT;
}

/**
 * ETS1 emissions net of free allocation, for a whole company. Allowances are fungible within a
 * group, so allocation at one site offsets emissions at another; it never goes below zero.
 */
export function ets1NetPosition(companies: Ets1Company[]): { grossTco2: number; freeAllocTco2: number; netTco2: number; unknownSites: number; priorYearSites: number } {
  const sites = companies.flatMap(c => c.sites);
  const grossTco2 = sites.reduce((s, x) => s + x.verifiedLatestTco2, 0);
  const freeAllocTco2 = sites.reduce((s, x) => s + (x.freeAllocLatestTco2 ?? 0), 0);
  return {
    grossTco2,
    freeAllocTco2,
    netTco2: Math.max(0, grossTco2 - freeAllocTco2),
    unknownSites: sites.filter(x => x.freeAllocLatestTco2 === null).length,
    priorYearSites: sites.filter(x => x.verifiedLatestIsPriorYear).length,
  };
}

/** Natural-gas share of a sector's combustion CO2 (Eurostat, ets1/gasShare.ts): the part biomethane can replace. */
export function ets1GasShare(sector: Ets1Sector): number {
  return getAssumption(`ets1.gasShare.${sector}`);
}

/**
 * ETS1 tonnes biomethane could replace: verified emissions at HIGH/MEDIUM-fit sites times the
 * sector's natural-gas share. Not netted for free allocation: each tonne avoided frees an allowance
 * to sell or not buy, whatever the allocation.
 */
export function ets1AbatableTco2(c: Ets1Company): number {
  return c.sites.filter(s => s.fit !== 'LOW').reduce((t, s) => t + s.verifiedLatestTco2 * ets1GasShare(s.sector), 0);
}

/** How the ETS1 bill is described wherever it is priced. */
export const ETS1_BASIS_LABEL = 'net of free allocation';

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
  const poolMid = selectMarkPrice(marks.marks['FUELEU'], 'mid');

  const fuelEuPenaltyEur = p.fueleu.length ? p.fueleu.reduce((s, f) => s + f.penalty2026Eur, 0) : null;
  const fuelEuDeficitTco2e = p.fueleu.length ? p.fueleu.reduce((s, f) => s + f.deficit2026Tco2e, 0) : null;
  let fuelEuState: FuelEuState = 'NONE';
  let fuelEuCostEur: number | null = null;
  if (fuelEuDeficitTco2e !== null) {
    if (fuelEuDeficitTco2e <= 0) {
      fuelEuState = 'COMPLIANT';
      fuelEuCostEur = 0;
    } else if (poolMid !== null) {
      fuelEuState = 'PRICED';
      fuelEuCostEur = fuelEuDeficitTco2e * poolMid;
    } else {
      fuelEuState = 'NO_MARK';
    }
  }
  const maritimeT = p.fueleu.reduce((s, f) => s + f.etsCo2Tco2, 0);
  const etsMaritimeEur = maritimeT > 0 && eua !== null ? maritimeT * eua : null;
  const ets1Pos = p.ets1.length ? ets1NetPosition(p.ets1) : null;
  const ets1BillEur = ets1Pos !== null && eua !== null ? ets1Pos.netTco2 * eua : null;

  let ets2CostEur: number | null = null;
  let ets2Standing: Ets2Standing = 'NONE';
  let covered: string[] = [];
  let uncovered: string[] = [];
  const scopeLines: string[] = [];
  if (p.ets2.length) {
    const suppliers = p.ets2.filter(e => e.role === 'REGULATED_SUPPLIER');
    const exposures = computeCompanyExposure(suppliers, ets2Countries, ets2Price);
    const priced = exposures.filter(x => x.ets2CostEurM !== null);
    const sized = exposures.filter(x => x.volumeTWh !== null);
    ets2CostEur = priced.length ? priced.reduce((s, x) => s + (x.ets2CostEurM as number), 0) * EUR_PER_EUR_M : null;
    covered = [...new Set(priced.map(x => x.company.countryIso))].sort();
    uncovered = [...new Set(exposures.filter(x => x.ets2CostEurM === null).map(x => x.company.countryIso))].filter(c => !covered.includes(c)).sort();
    const byIso = new Map(ets2Countries.map(c => [c.iso, c]));
    const seen = new Set<string>();
    for (const x of exposures) {
      if (x.volumeTWh === null) continue;
      const iso = x.company.countryIso;
      const line = x.volumeScope === 'ETS2_SEGMENT' && x.ets2ScopeShare !== null
        ? `${iso}: ETS2 segment, ${Math.round(x.ets2ScopeShare * 100)}% of disclosed volume${byIso.get(iso)?.ets2SegmentShareSource?.url ? ` (${byIso.get(iso)?.ets2SegmentShareSource?.url})` : ''}`
        : x.volumeScope === 'ETS2_SEGMENT'
          ? `${iso}: ETS2 segment (share of national buildings gas)`
          : `${iso}: all segments, an upper bound`;
      if (!seen.has(line)) { seen.add(line); scopeLines.push(line); }
    }
    if (!suppliers.length) ets2Standing = 'END_USER';
    else if (sized.length && ets2Price === null) ets2Standing = 'NO_ETS2_PRICE';
    else if (!priced.length) ets2Standing = 'SUPPLIER_VOLUME_UNKNOWN';
    else ets2Standing = priced.length === exposures.length ? 'QUANTIFIED' : 'PARTIAL';
  }

  return {
    fuelEuPenaltyEur,
    fuelEuDeficitTco2e,
    fuelEuCostEur,
    fuelEuState,
    etsMaritimeEur,
    ets1BillEur,
    ets1Tco2: ets1Pos?.grossTco2 ?? null,
    ets1FreeAllocTco2: ets1Pos?.freeAllocTco2 ?? null,
    ets1NetTco2: ets1Pos?.netTco2 ?? null,
    ets1AllocUnknownSites: ets1Pos?.unknownSites ?? 0,
    ets1PriorYearSites: ets1Pos?.priorYearSites ?? 0,
    ets2CostEur,
    ets2Standing,
    ets2CoveredCountries: covered,
    ets2UncoveredCountries: uncovered,
    ets2ScopeLines: scopeLines,
    costNowEur: sumOrNull([fuelEuCostEur, etsMaritimeEur, ets1BillEur]),
    costNowIncomplete: fuelEuState === 'NO_MARK',
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
  /**
   * € per year this play is worth at desk marks, on one basis for every play: FuelEU compliance at
   * the pool mark, EU ETS allowances at the EUA mark. Never the statutory penalty.
   */
  valueEur: number | null;
  /** Upper end where an open input leaves a range (a ship's intra-EU share); null when valueEur is exact. */
  valueEurHigh: number | null;
  /** What valueEur measures, e.g. "Compliance at pool price". */
  valueLabel: string;
  /** A first deal to open with, as a volume (a share of volumeMWh); the value stays the full potential. */
  firstDealMWh: number | null;
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
  /** Every counted regime has a € value (none is waiting on an input), so the totals are whole. */
  complete: boolean;
  isStack: boolean;
}

/** € per year of a stack at its volume (the low end of an open range), the figure the stack card prints. */
export function stackAnnualEur(spec: StackSpec): { low: number | null; high: number | null } {
  const v = spec.inputs.volumeMWh;
  if (v === null || !spec.complete) return { low: null, high: null };
  return {
    low: spec.eurPerMWhLow === null ? null : spec.eurPerMWhLow * v,
    high: spec.eurPerMWhHigh === null ? null : spec.eurPerMWhHigh * v,
  };
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
  const countedRows = low.rows.filter(r => counted(r, year));
  // A regime with no € value at current marks (or a zero one) is not part of a stack.
  const pricedRegimes = countedRows.filter(r => r.eurPerMWh !== null && r.eurPerMWh > 0).map(r => r.regime);
  return {
    inputs,
    pricedRegimes,
    claims: low.rows.filter(r => r.status === 'CLAIM').map(r => r.regime),
    eurPerMWhLow: pricedEur(low, year),
    eurPerMWhHigh: pricedEur(high, year),
    complete: countedRows.length > 0 && countedRows.every(r => r.eurPerMWh !== null),
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

/**
 * Stack for an ETS1 group: the biomethane that would replace `abatedTco2` of emissions (its high/medium-fit
 * sites), all burned at ETS1 installations. `share` scales it down to a first deal.
 */
export function ets1StackSpec(abatedTco2: number, marks: MarksState, year: number, share = 1): StackSpec | null {
  if (abatedTco2 <= 0) return null;
  const volumeMWh = Math.round(biomethaneMWhToAbate(abatedTco2 * share) / HHV_TO_LHV_FACTOR);
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
  const poolMid = selectMarkPrice(marks.marks['FUELEU'], 'mid');
  const needMWh = p.fueleu.reduce((s, f) => s + f.bioLngToCloseMWh, 0);
  const lngShips = p.fueleu.reduce((s, f) => s + f.group.lngShipCount, 0);
  const lngBurnMWh = p.fueleu.reduce((s, f) => s + f.group.lngTonnes, 0) * LNG_MWH_PER_TONNE;
  const charterers = p.fueleu.reduce((s, f) => s + f.group.fuelCostBearerMix.TIME_CHARTERER, 0);
  const owners = p.fueleu.reduce((s, f) => s + f.group.fuelCostBearerMix.OWNER_OPERATOR, 0);
  const bearerCaveat = charterers > owners
    ? ['Fuel is usually bought by time charterers here: the FuelEU obligation sits with the ISM company, but the bunker decision often with the charterer — pitch both.']
    : [];

  // A deficit too small to round to a bio-LNG volume (a fraction of a tonne) is still a deficit: pool it.
  if (deficitT > 0 && needMWh <= 0) {
    out.push({
      id: 'ship-pool',
      regulation: 'FUELEU',
      title: 'FuelEU pool surplus',
      product: 'Compliance surplus from a pool of ships burning bio-LNG (FuelEU pooling)',
      why: 'A very small deficit: buying it as pool surplus is simpler than a bunker order.',
      timing: 'NOW',
      volumeMWh: null,
      valueEur: poolMid === null ? null : deficitT * poolMid,
      valueEurHigh: null,
      valueLabel: 'Compliance at pool price',
      firstDealMWh: null,
      valueEurPerMWh: null,
      valueBasis: 'The 2026 deficit (tCO₂e) at the desk FuelEU pool mark.',
      evidenceNeeded: 'Pool registered in FuelEU Database before 30 April; verified surplus of the pooling ships.',
      legalBasis: 'Regulation (EU) 2023/1805 Art. 21 (pooling)',
      caveats: ['Pooling moves the FuelEU balance only: no EU ETS saving for this client.', ...bearerCaveat],
      stack: null,
      action: { label: 'Open FuelEU desk', route: '/fueleu-shipping', params: {} },
    });
  } else if (deficitT > 0) {
    // Bio-LNG is a drop-in for LNG engines, so physical supply is capped by the LNG the group already burns.
    const physicalMWh = lngShips > 0 ? Math.min(needMWh, lngBurnMWh) : 0;
    const poolMWh = needMWh - physicalMWh;
    if (physicalMWh > 0) {
      const spec = shipStackSpec(Math.round(physicalMWh), marks, year);
      // Same maths as the stack card, so the row, the play and the card show one number.
      const annual = stackAnnualEur(spec);
      out.push({
        id: 'ship-bio-lng',
        regulation: 'FUELEU',
        title: 'Bio-LNG bunkers',
        product: `Bio-LNG (−100 gCO₂e/MJ) for its ${lngShips} LNG-capable ship${lngShips > 1 ? 's' : ''}`,
        why: 'Lowers the fleet GHG intensity under FuelEU and, being zero-rated, cuts EU ETS maritime allowances on the same MWh — the two stack.',
        timing: 'NOW',
        volumeMWh: physicalMWh,
        valueEur: annual.low,
        valueEurHigh: annual.high !== null && annual.low !== null && annual.high - annual.low > 0.5 ? annual.high : null,
        valueLabel: 'FuelEU + ETS maritime at market',
        firstDealMWh: null,
        valueEurPerMWh: null,
        valueBasis: 'The MWh at the FuelEU pool price (what buying the same compliance would cost) plus the EU ETS maritime allowances saved. Low end: EU ETS covers 50% of voyages in or out of the EU; enter the intra-EU share in the stack below to narrow it.',
        evidenceNeeded: 'PoS with RED III actual value, bunker delivery notes, verifier acceptance in the FuelEU report.',
        legalBasis: 'Regulation (EU) 2023/1805 Art. 4 & Annex I; Directive 2003/87/EC Art. 3ga & MRR Annex VI (zero-rating)',
        caveats: [
          ...(physicalMWh < needMWh ? [`Capped at the LNG the group burned in ${SHIPPING_DATA_YEAR} (${Math.round(lngBurnMWh).toLocaleString('en-GB')} MWh); the rest needs pooling.`] : []),
          ...bearerCaveat,
        ],
        stack: spec,
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
        valueEur: poolMid === null ? null : ((deficitT * poolMWh) / needMWh) * poolMid,
        valueEurHigh: null,
        valueLabel: 'Compliance at pool price',
        firstDealMWh: null,
        valueEurPerMWh: null,
        valueBasis: 'The pool share of the 2026 deficit (tCO₂e, pro rata to the MWh) at the desk FuelEU pool mark.',
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
      valueEurHigh: null,
      firstDealMWh: null,
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
      valueEurHigh: null,
      firstDealMWh: null,
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
  const fitT = p.ets1.reduce((s, c) => s + ets1AbatableTco2(c), 0);
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
      valueEurHigh: null,
      firstDealMWh: null,
      valueLabel: 'Value to client',
      valueEurPerMWh: null,
      valueBasis: 'Needs the sites\' gas consumption before it can be sized.',
      evidenceNeeded: 'Site fuel mix from the monitoring plan or the client.',
      legalBasis: 'Art. 38(5) and 39a of Implementing Regulation (EU) 2018/2066',
      caveats: ['Low-priority lead unless the client confirms material gas burn.'],
      stack: null,
      action: null,
    }];
  }
  // Full potential: the biomethane that replaces every tonne at its high/medium-fit sites, valued at the desk EUA mark.
  const ncvMWh = biomethaneMWhToAbate(fitT);
  const volumeMWh = Math.round(ncvMWh / HHV_TO_LHV_FACTOR);
  const perNcvMWh = ets1AvoidedValuePerMWh(marks);
  const firstDealMWh = Math.round(volumeMWh * ets1FirstDealShare());
  // Site fit already excludes coal, lignite and steel and admits power plants only on gas evidence in
  // the name, so only refining / oil & gas needs a fuel caveat here.
  const fitSites = p.ets1.flatMap(c => c.sites).filter(s => s.fit !== 'LOW');
  const processHeatT = fitSites.filter(s => s.fit === 'HIGH').reduce((a, s) => a + s.verifiedLatestTco2, 0);
  const oilGasT = fitSites.filter(s => s.sector === 'REFINING_OIL_GAS').reduce((a, s) => a + s.verifiedLatestTco2, 0);
  const fitGrossT = p.ets1.reduce((a, c) => a + c.fitVerifiedLatestTco2, 0);
  const gasSharePct = fitGrossT > 0 ? Math.round((fitT / fitGrossT) * 100) : 0;
  const oilGasLed = oilGasT * 2 > fitGrossT;
  const spec = ets1StackSpec(fitT, marks, year);
  const unitValue = spec ? spec.eurPerMWhLow : null;
  return [{
    id: 'ets1-biomethane',
    regulation: 'ETS1',
    title: oilGasLed ? 'Biomethane for ETS1 sites — check fuel' : 'Biomethane for ETS1 sites',
    product: 'Grid biomethane with PoS, delivered to its gas-fired installations',
    why: 'Biomethane meeting RED III criteria counts at zero emissions in the site\'s ETS report, so it buys fewer allowances for every MWh of gas replaced.',
    timing: 'NOW',
    volumeMWh,
    valueEur: perNcvMWh === null ? null : ncvMWh * perNcvMWh,
    valueEurHigh: null,
    valueLabel: 'Allowances saved (full potential)',
    firstDealMWh,
    valueEurPerMWh: unitValue,
    valueBasis: `The natural-gas share of the CO₂ at its high/medium-fit sites (gas share ${gasSharePct}% of site emissions, Eurostat energy balances by sector), replaced at the desk EUA mark, not netted for free allocation (each tonne avoided frees an allowance to sell or not buy). The full potential, not one deal; a first deal is a share of the volume.`,
    evidenceNeeded: 'RED III sustainability evidence via the Union Database (PoS assigned to the site); accepted by the site\'s verifier.',
    legalBasis: 'Art. 38(5) and 39a of Implementing Regulation (EU) 2018/2066 & Annex VI',
    caveats: [
      ...(oilGasLed
        ? [`Mostly refining and oil & gas installations (${Math.round(oilGasT).toLocaleString('en-GB')} of ${Math.round(fitGrossT).toLocaleString('en-GB')} tCO₂ at fit sites): these often burn their own fuel gas, and offshore platforms have no grid connection for biomethane — only grid-fed onshore units qualify.`]
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
      valueEurHigh: null,
      firstDealMWh: null,
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
      valueEurHigh: null,
      firstDealMWh: null,
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

/**
 * Biomethane value: the annual € of the biomethane the company could use now, every play at market
 * on the same basis. The sum of the NOW plays' values; FROM_2028 plays (ETS2) are not in it.
 */
export function biomethaneValueEur(ops: Opportunity[]): number | null {
  return sumOrNull(ops.filter(o => o.timing === 'NOW').map(o => o.valueEur));
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
