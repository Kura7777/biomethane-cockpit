/**
 * Builds src/domain/fueleu/shippingTargetsData.ts from the real, sourced EU MRV (THETIS-MRV)
 * 2024 dataset (data/fueleu_mrv_2024_companies.json), using the app's own calculator
 * (src/domain/fueleu/calculator.ts) for every derived compliance/penalty/Bio-LNG field, so the
 * dataset can never drift from the engine.
 *
 * This REPLACES the old synthetic pipeline (scripts/regenerate_fueleu_compliance.ts +
 * scripts/build_full_registry.cjs), which built the same fields from fabricated company data
 * (data/fueleu_shipping_crm_targets.json/.csv). Those files and scripts have been deleted.
 *
 * IMPORTANT — 2024 data as a proxy for 2026: FuelEU Maritime compliance years begin in 2025, but
 * the EU MRV public register's most recent complete reporting year is 2024. Every fuel tonnage,
 * CO2 figure, and fleet composition below is 2024 MRV-reported activity, used as the best
 * available proxy for a ship's/company's 2026 (this desk's FUELEU_ACTIVE_PERIOD) and 2030 profile.
 * This is flagged in `source` and in each row's `outreachPitch`.
 *
 * ETS fields (2026): 100% phase-in of the MRV-reported `ets_co2_t` (THETIS-MRV column 37: "CO2
 * emissions to be reported under Directive 2003/87/EC" — real, ship-verified 2024 ETS-scope CO2,
 * not a figure recomputed from the ESTIMATED HFO/MGO/LNG fuel split), plus an estimated CH4 CO2e
 * add-on: ch4_t * (ets_co2_t / total_co2_t) * 25 — i.e. the company's reported CH4 mass (col. for
 * tank-to-wake CH4), pro-rated to the ETS-reportable share of its total CO2, at GWP-100 = 25
 * (Annex I / Commission Implementing Regulation (EU) 2018/2066, Annex VI Table 6, AR4 set). This is
 * an ESTIMATE — the true attribution of company-level CH4 to the ETS-reportable voyage share is not
 * separately published — and N2O CO2e is OMITTED here (no company-level N2O figure is available in
 * this MRV extract), so ets_exposure_2026_tco2 understates the full Art. 3ga scope to that extent.
 *
 * Groups: each row is annotated with its commercial group (data/fueleu_group_map.json, built by
 * scripts/build_fueleu_group_map.py) and a segment-typical fuel-cost-bearer. If the group-map file
 * is missing, the script still runs — every row falls back to an UNKNOWN single-company group.
 *
 * Run: npx tsx scripts/build_fueleu_shipping_targets.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateVesselExposure,
  calculateFleetCapability,
  EU_ETS_PHASE_IN_2026,
  EUA_BENCHMARK_EUR_PER_TONNE,
  FUELEU_GWP_CH4,
} from '../src/domain/fueleu/calculator';
import { getAssumption, fuelEuPoolBidPriceEurPerTco2e } from '../src/domain/assumptions/registry';
import type { ShippingCounterparty, FuelEuDatasetSource, GroupEntityType, FuelCostBearer, FuelCostBearerType, GroupContact } from '../src/domain/fueleu/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..');
const MRV_JSON_PATH = path.join(REPO_ROOT, 'data', 'fueleu_mrv_2024_companies.json');
const GROUP_MAP_PATH = path.join(REPO_ROOT, 'data', 'fueleu_group_map.json');
const GROUP_CONTACTS_PATH = path.join(REPO_ROOT, 'data', 'fueleu_group_contacts.json');
const OUT_PATH = path.join(REPO_ROOT, 'src', 'domain', 'fueleu', 'shippingTargetsData.ts');
const GROUP_CONTACTS_OUT_PATH = path.join(REPO_ROOT, 'src', 'domain', 'fueleu', 'groupContactsData.ts');

interface MrvCompany {
  company_imo: string;
  parent_name: string;
  ship_imos: string[];
  vessels_in_scope: number;
  segment: string;
  vlsfo_tonnes: number;
  mgo_tonnes: number;
  lng_tonnes: number;
  in_scope_co2_t: number;
  total_co2_t: number;
  ets_co2_t: number;
  ch4_t: number;
  lngShipCount: number;
  fuelSplitMethod: string;
  partialReportShips: number;
  otherFuelSuspectedShips: number;
}

interface MrvFile {
  source: {
    dataset: string;
    reportingPeriod: number;
    version: number;
    url: string;
    sha256: string;
    downloadedAt: string;
    method: string;
  };
  companies: MrvCompany[];
}

interface GroupMapGroup {
  group_id: string;
  group_name: string;
  entityType: GroupEntityType;
  company_imos: string[];
  parent_group_id?: string;
}

interface GroupMapFile {
  groups: GroupMapGroup[];
  segmentFuelCostBearer: Record<string, { typicalBearer: FuelCostBearerType; note: string }>;
}

const round = (x: number, dp: number) => Number(x.toFixed(dp));

const TIER_LABEL = {
  1: 'Tier 1: Mega-Deficit (>€10M / year)',
  2: 'Tier 2: Mid-Tier Compliance Buyer (€2M – €10M / year)',
  3: 'Tier 3: Regional & Feeder Deficit (<€2M / year)',
  4: 'Tier 4: Over-Compliant Article 21 Surplus Seller',
} as const;

/** Same thresholds as the retired scripts/regenerate_fueleu_compliance.ts tierFor(). */
function tierFor(penalty: number, surplus: boolean): 1 | 2 | 3 | 4 {
  if (surplus) return 4;
  if (penalty > 10_000_000) return 1;
  if (penalty >= 2_000_000) return 2;
  return 3;
}

const raw: MrvFile = JSON.parse(fs.readFileSync(MRV_JSON_PATH, 'utf8'));

const datasetSource: FuelEuDatasetSource = {
  dataset: raw.source.dataset,
  reportingPeriod: raw.source.reportingPeriod,
  version: raw.source.version,
  url: raw.source.url,
  sha256: raw.source.sha256,
};

const poolBuyPrice = getAssumption('fueleu.poolBuyPriceEurPerTco2e');
const poolSellPrice = fuelEuPoolBidPriceEurPerTco2e();
const euaPrice = EUA_BENCHMARK_EUR_PER_TONNE;

// ---------------- Group map (optional — the script must not fail if it's absent) ----------------
let groupMap: GroupMapFile | null = null;
if (fs.existsSync(GROUP_MAP_PATH)) {
  try {
    groupMap = JSON.parse(fs.readFileSync(GROUP_MAP_PATH, 'utf8'));
  } catch {
    console.warn(`Warning: could not parse ${GROUP_MAP_PATH}; all rows will fall back to an UNKNOWN single-company group.`);
  }
} else {
  console.warn(`Warning: ${GROUP_MAP_PATH} not found; all rows will fall back to an UNKNOWN single-company group. Run scripts/build_fueleu_group_map.py first.`);
}

const companyImoToGroup = new Map<string, GroupMapGroup>();
if (groupMap) {
  for (const g of groupMap.groups) {
    for (const imo of g.company_imos) companyImoToGroup.set(imo, g);
  }
}

const DEFAULT_FUEL_COST_BEARER: FuelCostBearer = {
  typicalBearer: 'MIXED',
  note: 'No segment-typical fuel-cost-bearer default on file for this MRV shipType; treated as mixed.',
};

function lookupFuelCostBearer(segment: string): FuelCostBearer {
  const entry = groupMap?.segmentFuelCostBearer?.[segment];
  if (!entry) return DEFAULT_FUEL_COST_BEARER;
  return { typicalBearer: entry.typicalBearer, note: entry.note };
}

function lookupGroup(companyImo: string, parentName: string): { group_id: string; group_name: string; entityType: GroupEntityType; parent_group_id?: string } {
  const g = companyImoToGroup.get(companyImo);
  if (g) {
    return { group_id: g.group_id, group_name: g.group_name, entityType: g.entityType, parent_group_id: g.parent_group_id };
  }
  // No group map, or this company_imo isn't in it: single-company UNKNOWN placeholder group.
  return { group_id: `unmapped-${companyImo}`, group_name: parentName, entityType: 'UNKNOWN' };
}

// ---------------- Group contacts (optional — generate a fallback empty map if absent) ----------------
let groupContacts: Record<string, GroupContact[]> = {};
if (fs.existsSync(GROUP_CONTACTS_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(GROUP_CONTACTS_PATH, 'utf8'));
    // Accepted shapes: {"group_id": [...]} directly; {"groups": [{group_id, contacts: [...]}, ...]};
    // or {"contacts": {"group_id": [...]}}.
    if (Array.isArray(parsed?.groups)) {
      for (const g of parsed.groups) {
        if (g && typeof g.group_id === 'string' && Array.isArray(g.contacts)) {
          groupContacts[g.group_id] = g.contacts;
        }
      }
    } else if (parsed && typeof parsed === 'object' && parsed.contacts && !Array.isArray(parsed.contacts)) {
      groupContacts = parsed.contacts;
    } else if (parsed && typeof parsed === 'object') {
      groupContacts = parsed;
    }
  } catch {
    console.warn(`Warning: could not parse ${GROUP_CONTACTS_PATH}; groups will carry no contacts.`);
    groupContacts = {};
  }
} else {
  console.log(`No ${GROUP_CONTACTS_PATH} found — groups will carry no contacts (empty array) until it exists.`);
}

const groupContactsLines: string[] = [];
groupContactsLines.push("import { GroupContact } from './types';");
groupContactsLines.push('');
groupContactsLines.push('/**');
groupContactsLines.push(' * Generated by scripts/build_fueleu_shipping_targets.ts from data/fueleu_group_contacts.json');
groupContactsLines.push(' * (absent at generation time -> empty object; never fabricated). DO NOT hand-edit.');
groupContactsLines.push(' */');
groupContactsLines.push(`export const GROUP_CONTACTS: Record<string, GroupContact[]> = ${JSON.stringify(groupContacts)};`);
groupContactsLines.push('');
fs.writeFileSync(GROUP_CONTACTS_OUT_PATH, groupContactsLines.join('\n'), 'utf8');

/**
 * MRV's "company IMO" (DoC holder identifier) field is overwhelmingly a genuine 7-digit IMO
 * company number, but a small number of rows carry a malformed value: stray whitespace, a
 * dropped leading zero (spreadsheet numeric coercion), or — rarely — a non-IMO administrative
 * code. We trim whitespace and zero-pad short all-digit codes (both real, recoverable formatting
 * issues), but DROP rows whose code still isn't a clean 7-digit IMO number after that, rather than
 * inventing or truncating a number, since a wrong IMO would misattribute a real company's data.
 */
function normalizeCompanyImo(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{7}$/.test(trimmed)) return trimmed;
  if (/^\d{1,6}$/.test(trimmed)) return trimmed.padStart(7, '0');
  return null;
}

const eligibleRaw = raw.companies.filter(
  c => c.vessels_in_scope >= 1 && (c.vlsfo_tonnes + c.mgo_tonnes + c.lng_tonnes) > 0
);

const droppedForBadImo: string[] = [];
const eligible: MrvCompany[] = [];
for (const c of eligibleRaw) {
  const normalized = normalizeCompanyImo(c.company_imo);
  if (normalized === null) {
    droppedForBadImo.push(`${c.company_imo} (${c.parent_name})`);
    continue;
  }
  eligible.push({ ...c, company_imo: normalized });
}

console.log(`MRV companies total: ${raw.companies.length}`);
console.log(`Eligible (vessels_in_scope >= 1 and in-scope energy > 0): ${eligibleRaw.length}`);
if (droppedForBadImo.length > 0) {
  console.log(`Dropped ${droppedForBadImo.length} row(s) with a non-recoverable company IMO code (not a 7-digit IMO number):`);
  for (const d of droppedForBadImo) console.log(`  - ${d}`);
}

type Built = ShippingCounterparty;

const built: Built[] = eligible.map((c): Built => {
  const base = {
    vlsfoTonnes: c.vlsfo_tonnes,
    mgoTonnes: c.mgo_tonnes,
    lngTonnes: c.lng_tonnes,
    bioLngTonnes: 0,
    bioLngCi: -100,
    consecutiveYearsNonCompliant: 1,
    shareThirdCountryVoyages: 0, // MRV tonnes are already scoped per Art. 2(1) — see build_fueleu_mrv_dataset.py
  };

  const r26 = calculateVesselExposure({ ...base, targetYear: 2026 });
  const r30 = calculateVesselExposure({ ...base, targetYear: 2030 });

  const fleet = calculateFleetCapability(c.vessels_in_scope, c.vlsfo_tonnes, c.mgo_tonnes, c.lng_tonnes);

  // ETS 2026: 100% phase-in of the MRV-reported, ship-verified ets_co2_t (col. 37), plus an
  // estimated CH4 CO2e add-on pro-rated to the ETS-reportable share of total reported CO2.
  // N2O is omitted (no company-level N2O figure in this MRV extract) — see file header note.
  const etsCo2Share = c.total_co2_t > 0 ? c.ets_co2_t / c.total_co2_t : 0;
  const ch4EtsCo2eTonnes = c.ch4_t * etsCo2Share * FUELEU_GWP_CH4;
  const etsExposure2026Tco2 = round(c.ets_co2_t * EU_ETS_PHASE_IN_2026 + ch4EtsCo2eTonnes, 1);
  const etsExposure2026Eur = Math.round(etsExposure2026Tco2 * euaPrice);

  const penalty2026Y1 = Math.round(r26.statutoryPenaltyY1Eur);
  const combinedExposure2026 = penalty2026Y1 + etsExposure2026Eur;

  const surplus = r26.isOverCompliant;
  const tier = tierFor(penalty2026Y1, surplus);

  const bioLngRequiredNeg100T = round(r26.bioLngRequiredNeg100Tonnes, 1);
  const bioLngRequiredNeg100Mwh = Math.round(r26.bioLngRequiredNeg100Mwh);
  const clientSavingsPhysical = Math.round(r26.physicalSavingsEur);
  const deskMarginPhysical = Math.round(r26.physicalTradingMarginEur);
  const clientSavingsPooling = Math.round(r26.poolingSavingsEur);
  const deskMarginPooling = Math.round(r26.poolingArrangementMarginEur);
  const complianceBalance2026 = round(r26.complianceBalanceTco2e, 1);

  const group = lookupGroup(c.company_imo, c.parent_name);
  const fuelCostBearer = lookupFuelCostBearer(c.segment);

  let outreachPitch: string;
  if (surplus) {
    const surplusKt = (complianceBalance2026 / 1000).toFixed(1);
    outreachPitch =
      `Indicative estimate from EU MRV 2024 (fuel split estimated): ${c.parent_name}'s ${c.vessels_in_scope} EU-scope ` +
      `vessels run at ${r26.weightedGhgie.toFixed(2)} gCO2e/MJ against the 89.34 g/MJ 2026 FuelEU Maritime limit, a ` +
      `+${surplusKt} kt compliance surplus. Our desk can monetise this Article 21 surplus into deficit fleets at the ` +
      `register bid (€${poolSellPrice.toFixed(2)}/tCO2e), an indicative €${(clientSavingsPooling / 1e6).toFixed(2)}M of commercial value.`;
  } else {
    const deficitKt = (Math.abs(complianceBalance2026) / 1000).toFixed(1);
    outreachPitch =
      `Indicative estimate from EU MRV 2024 (fuel split estimated): ${c.parent_name}'s ${c.vessels_in_scope} EU-scope ` +
      `vessels run at ${r26.weightedGhgie.toFixed(2)} gCO2e/MJ against the 89.34 g/MJ 2026 FuelEU Maritime limit, a ` +
      `${deficitKt} kt deficit and an indicative €${(penalty2026Y1 / 1e6).toFixed(2)}M Annex IV penalty exposure. ` +
      `Closing it would require an estimated ${(bioLngRequiredNeg100Mwh / 1000).toFixed(1)} GWh of -100 CI Bio-LNG, or an ` +
      `Article 21 pool allocation at the register offer (€${poolBuyPrice.toFixed(2)}/tCO2e), an indicative up to €${(clientSavingsPhysical / 1e6).toFixed(2)}M in net compliance savings.`;
  }

  const row: Built = {
    rank: 0, // assigned after sort
    parent_name: c.parent_name,
    segment: c.segment,
    vessels_in_scope: c.vessels_in_scope,
    strategy_tier: TIER_LABEL[tier],
    vlsfo_tonnes: c.vlsfo_tonnes,
    mgo_tonnes: c.mgo_tonnes,
    lng_tonnes: c.lng_tonnes,
    total_energy_mwh: Math.round(r26.totalEnergyMwh),
    actual_ghgie: round(r26.weightedGhgie, 2),
    compliance_balance_2026_tco2e: complianceBalance2026,
    penalty_2026_y1_eur: penalty2026Y1,
    penalty_2026_y2_eur: Math.round(r26.statutoryPenaltyY2Eur),
    compliance_balance_2030_tco2e: round(r30.complianceBalanceTco2e, 1),
    penalty_2030_y1_eur: Math.round(r30.statutoryPenaltyY1Eur),
    bio_lng_required_neg100_t: bioLngRequiredNeg100T,
    bio_lng_required_neg100_mwh: bioLngRequiredNeg100Mwh,
    bio_lng_required_zero_t: round(r26.bioLngRequiredZeroCiTonnes, 1),
    client_savings_physical_eur: clientSavingsPhysical,
    desk_margin_physical_eur: deskMarginPhysical,
    client_savings_pooling_eur: clientSavingsPooling,
    desk_margin_pooling_eur: deskMarginPooling,
    outreachPitch,
    fleetCapability: fleet.fleetCapability,
    lng_vessels_in_scope: fleet.lngVesselsInScope,
    conventional_vessels_in_scope: fleet.conventionalVesselsInScope,
    ets_exposure_2026_tco2: etsExposure2026Tco2,
    ets_exposure_2026_eur: etsExposure2026Eur,
    combined_regulatory_exposure_2026_eur: combinedExposure2026,
    company_imo: c.company_imo,
    ship_imos: c.ship_imos,
    source: datasetSource,
    fuelSplitMethod: c.fuelSplitMethod,
    lngShipCount: c.lngShipCount,
    otherFuelSuspectedShips: c.otherFuelSuspectedShips,
    partialReportShips: c.partialReportShips,
    contacts: [],
    group_id: group.group_id,
    group_name: group.group_name,
    entityType: group.entityType,
    parent_group_id: group.parent_group_id ?? '',
    fuelCostBearer,
  };
  return row;
});

// Rank by 2026 penalty desc (deficit carriers first, highest penalty first), surplus companies after.
built.sort((a, b) => {
  const aSurplus = a.compliance_balance_2026_tco2e > 0;
  const bSurplus = b.compliance_balance_2026_tco2e > 0;
  if (aSurplus !== bSurplus) return aSurplus ? 1 : -1;
  return aSurplus
    ? b.compliance_balance_2026_tco2e - a.compliance_balance_2026_tco2e
    : b.penalty_2026_y1_eur - a.penalty_2026_y1_eur;
});
built.forEach((r, i) => { r.rank = i + 1; });

// ---------------- Write TS file (compact JSON-in-TS, one row per line to keep file size sane) ----------------
const totalVessels = built.reduce((acc, c) => acc + c.vessels_in_scope, 0);
const totalEnergyMwh = built.reduce((acc, c) => acc + c.total_energy_mwh, 0);
const totalEnergyTwh = round(totalEnergyMwh / 1e6, 1);

const lines: string[] = [];
lines.push("import { ShippingCounterparty } from './types';");
lines.push('');
lines.push('/**');
lines.push(' * Generated by scripts/build_fueleu_shipping_targets.ts from data/fueleu_mrv_2024_companies.json');
lines.push(' * (EU MRV / THETIS-MRV public emission report, reporting year 2024, version ' + raw.source.version + ').');
lines.push(' * DO NOT hand-edit — regenerate instead. See that script for methodology notes.');
lines.push(' *');
lines.push(' * 2024 MRV data is used as the best available proxy for each company\'s 2026/2030 activity');
lines.push(' * (FuelEU Maritime\'s active compliance period for this desk is 2026; MRV\'s latest complete');
lines.push(' * year is 2024). Fuel-type split (VLSFO/MGO/LNG) is ESTIMATED from aggregate CO2/CH4 (see');
lines.push(' * fuelSplitMethod per row). ETS fields use the MRV-reported, ship-verified ets_co2_t (col. 37)');
lines.push(' * at 100% 2026 phase-in, plus an estimated CH4 CO2e add-on (N2O omitted; see script header).');
lines.push(' */');
lines.push(`export const TOTAL_MARKET_VESSELS_IN_SCOPE = ${totalVessels};`);
lines.push(`export const TOTAL_MARKET_ENERGY_TWH = ${totalEnergyTwh};`);
lines.push('');
// Cast (not a `: ShippingCounterparty[]` variable annotation) — with ~3,500 object-literal rows,
// full per-element contextual/excess-property checking against the interface makes tsc's array
// literal union inference blow up ("union type too complex to represent"). The cast still checks
// structural compatibility but skips that per-element combinatorial pass.
lines.push('export const FUEL_EU_SHIPPING_COUNTERPARTIES = [');
for (const row of built) {
  lines.push(JSON.stringify(row) + ',');
}
lines.push('] as unknown as ShippingCounterparty[];');
lines.push('');

fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');

// ---------------- Console summary ----------------
const mrvInScopeCo2Sum = eligible.reduce((acc, c) => acc + c.in_scope_co2_t, 0);
const totalPenalty2026 = built.reduce((acc, c) => acc + c.penalty_2026_y1_eur, 0);
const surplusCount = built.filter(c => c.compliance_balance_2026_tco2e > 0).length;

console.log(`\nWrote ${OUT_PATH}`);
console.log(`Wrote ${GROUP_CONTACTS_OUT_PATH} (${Object.keys(groupContacts).length} group(s) with contacts)`);
console.log(`Row count: ${built.length}`);
console.log(`Sum MRV in_scope_co2_t (source JSON, eligible rows): ${(mrvInScopeCo2Sum / 1e6).toFixed(2)} Mt`);
console.log(`Total 2026 penalty: EUR ${totalPenalty2026.toLocaleString()}`);
console.log(`Surplus companies (2026): ${surplusCount}`);
console.log(`Deficit companies (2026): ${built.length - surplusCount}`);
console.log('\nTop 10 by 2026 penalty:');
for (const c of built.slice(0, 10)) {
  console.log(`  #${c.rank} ${c.parent_name} — vessels=${c.vessels_in_scope} penalty2026=EUR ${c.penalty_2026_y1_eur.toLocaleString()} group=${c.group_id} (${c.entityType})`);
}
