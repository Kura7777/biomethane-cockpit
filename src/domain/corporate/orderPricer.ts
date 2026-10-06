import { BASELINE_BROKER_RUNS, BrokerOrderEntry } from '../markets/brokerRuns';
import { MarksState } from '../netback/types';
import { getMarketById } from '../markets/registry';
import { computeCertificateValue, ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { Consignment } from '../consignment/types';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';
import { RED3_TRANSPORT_MAX_CI } from '../regulatory/constants';

/**
 * Corporate order pricer.
 *
 * A corporate request is a specification, not a market: form (GO only, GO + ISCC EU PoS, or
 * physical), registry country, vintage, carbon intensity, subsidy status, feedstock, volume and
 * the claim the client wants to make. The pricer:
 *   1. filters the broker book to offers that meet the spec,
 *   2. stacks them cheapest-first until the volume is covered (cheapest-to-deliver),
 *   3. adds the costs and margin the trader enters,
 *   4. shows what each requirement adds to the price (the "spec ladder"),
 *   5. warns when compliance buyers would pay more for the same material (compliance floor).
 *
 * Every price comes from a broker line or a trader input. Nothing is defaulted.
 */

export type ProductForm = 'GO_ONLY' | 'GO_PLUS_POS' | 'PHYSICAL';
export type ClaimPurpose = 'SCOPE1_VOLUNTARY' | 'EU_ETS1' | 'ETS2_VIA_SUPPLIER' | 'PRODUCT_FOOTPRINT';

export interface CorporateOrderSpec {
  /** Annual volume to deliver, MWh. */
  volumeMWh: number | null;
  form: ProductForm;
  /** Acceptable registry countries (broker run codes: UK, FR, NL, DE, DK, AIB). Empty = any. */
  countries: string[];
  /** Production year the client needs; null = any vintage. */
  vintageYear: number | null;
  /** Maximum carbon intensity, gCO₂e/MJ; null = no requirement. */
  maxCi: number | null;
  unsubsidisedOnly: boolean;
  excludeCrops: boolean;
  claim: ClaimPurpose;
}

export interface CorporateCostInputs {
  /** Registry transfer, cancellation and cross-border fees, €/MWh. */
  transferCostEurPerMWh: number | null;
  /** Desk margin, €/MWh. */
  marginEurPerMWh: number | null;
}

export interface SupplyLine {
  entry: BrokerOrderEntry;
  offerEurPerMWh: number;
  offerVolumeMWh: number | null;
  vintageYear: number | null;
  form: ProductForm;
  certified: boolean;
  etsEligible: boolean;
}

export interface FilledLine {
  line: SupplyLine;
  takenMWh: number;
}

export interface CheapestToDeliver {
  eligible: SupplyLine[];
  filled: FilledLine[];
  coveredMWh: number;
  /** Volume-weighted average cost of the filled lines, €/MWh. */
  averageCostEurPerMWh: number | null;
  /** Lines that meet the spec but show no offer volume are used for price only. */
  volumeUnknown: boolean;
}

export interface LadderStep {
  label: string;
  averageCostEurPerMWh: number | null;
  deltaEurPerMWh: number | null;
  eligibleLines: number;
}

export interface ComplianceFloor {
  marketId: string;
  marketName: string;
  valueEurPerMWh: number;
}

export interface CorporateQuote {
  ctd: CheapestToDeliver;
  offerEurPerMWh: number | null;
  annualValueEur: number | null;
  ladder: LadderStep[];
  complianceFloors: ComplianceFloor[];
  warnings: string[];
  missingInputs: string[];
  /** Dual-ledger lines for the client's reporting while the GHG Protocol settles market-based Scope 1. */
  dualLedger: { physicalEmissionsTco2: number | null; certificatesRetiredMWh: number | null };
}

const GWH_TO_MWH = 1000;

function parseVintageYear(vintage: string): number | null {
  const four = vintage.match(/20\d\d/);
  if (four) return Number(four[0]);
  // H226 / Q425 style: half or quarter + two-digit year
  const short = vintage.match(/^[HQ]\d(\d\d)$/i);
  return short ? 2000 + Number(short[1]) : null;
}

function toSupplyLine(entry: BrokerOrderEntry, gbpEur: number | null): SupplyLine | null {
  if (entry.offerPrice === null) return null;
  const offerEurPerMWh = entry.currency === 'GBP' ? (gbpEur === null ? null : entry.offerPrice * gbpEur) : entry.offerPrice;
  if (offerEurPerMWh === null) return null;
  const certified = entry.certified !== 'Uncertified';
  return {
    entry,
    offerEurPerMWh,
    offerVolumeMWh: entry.offerVolumeGWh === null ? null : entry.offerVolumeGWh * GWH_TO_MWH,
    vintageYear: parseVintageYear(entry.vintage),
    form: entry.feedstock.includes('Physical Gas') ? 'PHYSICAL' : certified ? 'GO_PLUS_POS' : 'GO_ONLY',
    certified,
    etsEligible: certified && entry.certified !== 'Certified (Non-ETS)',
  };
}

/** Offers in the broker book, in €/MWh. GBP lines need the desk's GBP/EUR rate. */
export function buildSupplyBook(marks: MarksState, entries: BrokerOrderEntry[] = BASELINE_BROKER_RUNS): SupplyLine[] {
  return entries
    .map(e => toSupplyLine(e, marks.fx.gbpEur))
    .filter((l): l is SupplyLine => l !== null);
}

type SpecFilter = (line: SupplyLine) => boolean;

function formFilter(form: ProductForm): SpecFilter {
  // A GO + PoS line can always be delivered as a bare GO; physical bundles only match physical requests.
  if (form === 'PHYSICAL') return l => l.form === 'PHYSICAL';
  if (form === 'GO_PLUS_POS') return l => l.form === 'GO_PLUS_POS';
  return l => l.form !== 'PHYSICAL';
}

function specFilters(spec: CorporateOrderSpec): { label: string; test: SpecFilter }[] {
  const steps: { label: string; test: SpecFilter }[] = [];
  steps.push({ label: spec.form === 'PHYSICAL' ? 'Physical biomethane, any origin' : 'Any biomethane GO', test: formFilter(spec.form === 'PHYSICAL' ? 'PHYSICAL' : 'GO_ONLY') });
  if (spec.countries.length > 0) {
    steps.push({ label: `Registry: ${spec.countries.join(', ')}`, test: l => spec.countries.includes(l.entry.country) });
  }
  if (spec.vintageYear !== null) {
    steps.push({ label: `Vintage ${spec.vintageYear}`, test: l => l.vintageYear === spec.vintageYear });
  }
  if (spec.unsubsidisedOnly) {
    steps.push({ label: 'Unsubsidised', test: l => l.entry.subsidized === 'Unsubsidised' });
  }
  if (spec.maxCi !== null) {
    const max = spec.maxCi;
    steps.push({ label: `CI ≤ ${max} g/MJ`, test: l => l.entry.ciNumeric !== null && l.entry.ciNumeric <= max });
  }
  if (spec.excludeCrops) {
    steps.push({ label: 'No crop feedstock', test: l => !/crop/i.test(l.entry.feedstock) });
  }
  if (spec.form === 'GO_PLUS_POS') {
    steps.push({ label: 'ISCC EU / PoS certified', test: formFilter('GO_PLUS_POS') });
  }
  if (spec.claim === 'EU_ETS1') {
    steps.push({ label: 'ETS-eligible certification', test: l => l.etsEligible });
  }
  return steps;
}

export function cheapestToDeliver(lines: SupplyLine[], volumeMWh: number | null): CheapestToDeliver {
  const eligible = [...lines].sort((a, b) => a.offerEurPerMWh - b.offerEurPerMWh);
  const filled: FilledLine[] = [];
  let covered = 0;
  let volumeUnknown = false;
  for (const line of eligible) {
    if (volumeMWh !== null && covered >= volumeMWh) break;
    if (line.offerVolumeMWh === null) {
      volumeUnknown = true;
      // Price-only line: counts for price discovery but cannot be relied on for volume.
      if (filled.length === 0) filled.push({ line, takenMWh: 0 });
      continue;
    }
    const need = volumeMWh === null ? line.offerVolumeMWh : Math.min(line.offerVolumeMWh, volumeMWh - covered);
    filled.push({ line, takenMWh: need });
    covered += need;
  }
  const weighted = filled.filter(f => f.takenMWh > 0);
  let averageCostEurPerMWh: number | null = null;
  if (weighted.length > 0) {
    const total = weighted.reduce((s, f) => s + f.takenMWh, 0);
    averageCostEurPerMWh = weighted.reduce((s, f) => s + f.takenMWh * f.line.offerEurPerMWh, 0) / total;
  } else if (filled.length > 0) {
    averageCostEurPerMWh = filled[0].line.offerEurPerMWh;
  }
  return { eligible, filled, coveredMWh: covered, averageCostEurPerMWh, volumeUnknown };
}

/** What compliance buyers would pay for the same attribute, per MWh, at the spec's CI. */
export function complianceFloors(spec: CorporateOrderSpec, marks: MarksState): ComplianceFloor[] {
  const complianceGrade =
    spec.form !== 'GO_ONLY' &&
    spec.unsubsidisedOnly &&
    spec.maxCi !== null &&
    spec.maxCi <= RED3_TRANSPORT_MAX_CI &&
    !spec.countries.includes('UK');
  if (!complianceGrade) return [];
  const consignment: Consignment = {
    id: 'corporate-spec',
    name: 'Corporate spec',
    originCountry: 'EU',
    originCountryName: 'European Union',
    feedstock: spec.excludeCrops ? 'manure' : 'agricultural_residues',
    feedstockName: spec.excludeCrops ? 'Manure' : 'Agricultural residues',
    annexClassification: spec.excludeCrops ? 'IX_A' : 'IX_B',
    carbonIntensity: spec.maxCi as number,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'EU',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: null,
  };
  const floors: ComplianceFloor[] = [];
  for (const id of ['DE_THG', 'NL_ERE']) {
    const market = getMarketById(id);
    if (!market) continue;
    const value = computeCertificateValue(market, consignment, marks, 'bid')?.valueEurPerMWh ?? null;
    if (value !== null) floors.push({ marketId: id, marketName: market.shortName, valueEurPerMWh: value });
  }
  return floors.sort((a, b) => (a.valueEurPerMWh < b.valueEurPerMWh ? 1 : a.valueEurPerMWh > b.valueEurPerMWh ? -1 : 0));
}

export function priceCorporateOrder(
  spec: CorporateOrderSpec,
  costs: CorporateCostInputs,
  marks: MarksState,
  entries: BrokerOrderEntry[] = BASELINE_BROKER_RUNS
): CorporateQuote {
  const missingInputs: string[] = [];
  const warnings: string[] = [];
  if (spec.volumeMWh === null || !(spec.volumeMWh > 0)) missingInputs.push('annual volume');
  if (costs.transferCostEurPerMWh === null) missingInputs.push('transfer & cancellation cost');
  if (costs.marginEurPerMWh === null) missingInputs.push('desk margin');

  const book = buildSupplyBook(marks, entries);
  if (marks.fx.gbpEur === null && entries.some(e => e.currency === 'GBP' && e.offerPrice !== null)) {
    warnings.push('No GBP/EUR rate on the desk: UK RGGO offers are left out.');
  }

  const steps = specFilters(spec);
  const ladder: LadderStep[] = [];
  let lines = book;
  let previous: number | null = null;
  for (const step of steps) {
    lines = lines.filter(step.test);
    const avg = cheapestToDeliver(lines, spec.volumeMWh).averageCostEurPerMWh;
    ladder.push({
      label: step.label,
      averageCostEurPerMWh: avg,
      deltaEurPerMWh: avg !== null && previous !== null ? avg - previous : null,
      eligibleLines: lines.length,
    });
    if (avg !== null) previous = avg;
  }

  const ctd = cheapestToDeliver(lines, spec.volumeMWh);
  if (ctd.eligible.length === 0) {
    warnings.push('No offer in the broker book meets every requirement. Relax a requirement (see the ladder) or source bilaterally.');
  } else if (spec.volumeMWh !== null && ctd.coveredMWh < spec.volumeMWh) {
    warnings.push(`Offers cover ${Math.round(ctd.coveredMWh).toLocaleString('en-GB')} of ${Math.round(spec.volumeMWh).toLocaleString('en-GB')} MWh; the rest must be sourced bilaterally.`);
  }
  if (ctd.volumeUnknown) warnings.push('Some matching offers show no volume; they are used for price only.');

  let offerEurPerMWh: number | null = null;
  if (ctd.averageCostEurPerMWh !== null && costs.transferCostEurPerMWh !== null && costs.marginEurPerMWh !== null) {
    offerEurPerMWh = ctd.averageCostEurPerMWh + costs.transferCostEurPerMWh + costs.marginEurPerMWh;
  }
  const annualValueEur = offerEurPerMWh !== null && spec.volumeMWh !== null ? offerEurPerMWh * spec.volumeMWh : null;

  const floors = complianceFloors(spec, marks);
  if (floors.length > 0 && ctd.averageCostEurPerMWh !== null && floors[0].valueEurPerMWh > ctd.averageCostEurPerMWh) {
    warnings.push(
      `Compliance floor: this material is worth about €${floors[0].valueEurPerMWh.toFixed(2)}/MWh in ${floors[0].marketName} (certificate value at the bid), above the €${ctd.averageCostEurPerMWh.toFixed(2)}/MWh voluntary offer. Voluntary supply of this spec may dry up — price forward volumes with that in mind.`
    );
  }
  if (spec.claim === 'ETS2_VIA_SUPPLIER') {
    warnings.push('ETS2 savings reach the client only if their gas supplier accounts for the biomethane and passes it through — build that into the supply contract.');
  }
  if (spec.claim === 'EU_ETS1' && spec.form === 'GO_ONLY') {
    warnings.push('An EU ETS1 claim needs RED-compliant mass-balanced biomethane (PoS via the Union Database), not a bare GO.');
  }

  const physicalEmissionsTco2 = spec.volumeMWh === null ? null : spec.volumeMWh * HHV_TO_LHV_FACTOR * ETS_NATURAL_GAS_TCO2_PER_MWH;

  return {
    ctd,
    offerEurPerMWh,
    annualValueEur,
    ladder,
    complianceFloors: floors,
    warnings,
    missingInputs,
    dualLedger: { physicalEmissionsTco2, certificatesRetiredMWh: spec.volumeMWh },
  };
}
