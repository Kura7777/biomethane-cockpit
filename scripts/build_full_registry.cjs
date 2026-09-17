const fs = require('fs');
const path = require('path');

// Regulatory Constants
const EU_ETS_EMISSION_FACTOR_VLSFO = 3.114;
const EU_ETS_EMISSION_FACTOR_MGO = 3.206;
const EU_ETS_EMISSION_FACTOR_LNG = 2.750;
const EU_ETS_PHASE_IN_2025 = 0.70;
const EU_ETS_PHASE_IN_2026 = 1.00;
const EUA_BENCHMARK_EUR_PER_TONNE = 70.00;

const LHV_VLSFO_MJ_PER_TONNE = 41000;
const LHV_MGO_MJ_PER_TONNE = 42700;
const LHV_LNG_MJ_PER_TONNE = 49100;

function computeFleetCapability(vessels, vlsfo, mgo, lng) {
  const safeVessels = Math.max(1, vessels);
  if (lng <= 0) {
    return {
      fleetCapability: 'CONVENTIONAL_ONLY',
      lngVessels: 0,
      conventionalVessels: safeVessels,
    };
  }

  const vlsfoMj = Math.max(0, vlsfo) * LHV_VLSFO_MJ_PER_TONNE;
  const mgoMj = Math.max(0, mgo) * LHV_MGO_MJ_PER_TONNE;
  const lngMj = Math.max(0, lng) * LHV_LNG_MJ_PER_TONNE;
  const totalEnergy = vlsfoMj + mgoMj + lngMj;

  const lngShare = totalEnergy > 0 ? lngMj / totalEnergy : 0;
  let lngVessels = Math.round(safeVessels * lngShare);

  if (lngShare >= 0.90) {
    lngVessels = safeVessels;
  } else {
    lngVessels = Math.max(1, Math.min(safeVessels - 1, lngVessels));
  }

  const conventionalVessels = safeVessels - lngVessels;

  return {
    fleetCapability: 'DUAL_FUEL_LNG',
    lngVessels,
    conventionalVessels,
  };
}

function computeEuEtsExposure(vlsfo, mgo, lng) {
  const totalGrossCo2 = Number(
    (
      Math.max(0, vlsfo) * EU_ETS_EMISSION_FACTOR_VLSFO +
      Math.max(0, mgo) * EU_ETS_EMISSION_FACTOR_MGO +
      Math.max(0, lng) * EU_ETS_EMISSION_FACTOR_LNG
    ).toFixed(1)
  );

  const etsExposure2025Tco2 = Number((totalGrossCo2 * EU_ETS_PHASE_IN_2025).toFixed(1));
  const etsExposure2025Eur = Math.round(etsExposure2025Tco2 * EUA_BENCHMARK_EUR_PER_TONNE);
  const etsExposure2026Eur = Math.round(totalGrossCo2 * EUA_BENCHMARK_EUR_PER_TONNE);

  return {
    totalGrossCo2,
    etsExposure2025Tco2,
    etsExposure2025Eur,
    etsExposure2026Eur,
  };
}

// Load existing 1,850 records from JSON
const targetsJsonPath = path.join(__dirname, '..', 'data', 'fueleu_shipping_crm_targets.json');
const existingTargets = JSON.parse(fs.readFileSync(targetsJsonPath, 'utf8'));

console.log(`Loaded ${existingTargets.length} records from ${targetsJsonPath}`);

// Enrich all records with fleet capability and joint regulatory metrics
const enrichedTargets = existingTargets.map((c, index) => {
  const cap = computeFleetCapability(c.vessels_in_scope, c.vlsfo_tonnes, c.mgo_tonnes, c.lng_tonnes);
  const ets = computeEuEtsExposure(c.vlsfo_tonnes, c.mgo_tonnes, c.lng_tonnes);
  const penalty = c.penalty_2025_y1_eur || 0;
  const combinedExposure = penalty + ets.etsExposure2025Eur;

  return {
    ...c,
    rank: index + 1,
    fleetCapability: cap.fleetCapability,
    lng_vessels_in_scope: cap.lngVessels,
    conventional_vessels_in_scope: cap.conventionalVessels,
    ets_exposure_2025_tco2: ets.etsExposure2025Tco2,
    ets_exposure_2025_eur: ets.etsExposure2025Eur,
    ets_exposure_2026_eur: ets.etsExposure2026Eur,
    combined_regulatory_exposure_2025_eur: combinedExposure,
  };
});

// Verification audit
enrichedTargets.forEach((c, idx) => {
  if (c.rank !== idx + 1) throw new Error(`Rank mismatch at ${idx}: ${c.rank}`);
  if (!['DUAL_FUEL_LNG', 'CONVENTIONAL_ONLY'].includes(c.fleetCapability)) {
    throw new Error(`Invalid fleet capability at rank ${c.rank}: ${c.fleetCapability}`);
  }
  if (c.lng_vessels_in_scope + c.conventional_vessels_in_scope !== c.vessels_in_scope) {
    throw new Error(`Vessel sum mismatch at rank ${c.rank}: ${c.lng_vessels_in_scope} + ${c.conventional_vessels_in_scope} != ${c.vessels_in_scope}`);
  }
  if (!Number.isFinite(c.ets_exposure_2025_eur) || c.ets_exposure_2025_eur < 0) {
    throw new Error(`Invalid ETS exposure at rank ${c.rank}: ${c.ets_exposure_2025_eur}`);
  }
  if (c.combined_regulatory_exposure_2025_eur !== c.penalty_2025_y1_eur + c.ets_exposure_2025_eur) {
    throw new Error(`Combined exposure mismatch at rank ${c.rank}`);
  }
});

console.log('✅ Audit passed for all 1,850 records!');

// 1. Write back to data/fueleu_shipping_crm_targets.json
fs.writeFileSync(targetsJsonPath, JSON.stringify(enrichedTargets, null, 2), 'utf8');
console.log(`Wrote data/fueleu_shipping_crm_targets.json (${enrichedTargets.length} records)`);

// 2. Write to data/fueleu_shipping_crm_targets.csv
const csvHeaders = [
  'rank',
  'parent_name',
  'headquarters',
  'hqAddress',
  'switchboardPhone',
  'contactDomain',
  'targetDepartment',
  'keyContactRole',
  'key_executive',
  'segment',
  'callingRegion',
  'tradeLane',
  'primary_bunkering_hubs',
  'vessels_in_scope',
  'strategy_tier',
  'vlsfo_tonnes',
  'mgo_tonnes',
  'lng_tonnes',
  'total_energy_mwh',
  'actual_ghgie',
  'compliance_balance_2025_tco2e',
  'penalty_2025_y1_eur',
  'penalty_2025_y2_eur',
  'compliance_balance_2030_tco2e',
  'penalty_2030_y1_eur',
  'bio_lng_required_neg100_t',
  'bio_lng_required_neg100_mwh',
  'bio_lng_required_zero_t',
  'client_savings_physical_eur',
  'desk_margin_physical_eur',
  'client_savings_pooling_eur',
  'desk_margin_pooling_eur',
  'outreachPitch',
  'fleetCapability',
  'lng_vessels_in_scope',
  'conventional_vessels_in_scope',
  'ets_exposure_2025_tco2',
  'ets_exposure_2025_eur',
  'ets_exposure_2026_eur',
  'combined_regulatory_exposure_2025_eur',
];

const escapeCsv = (val) => {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

const csvRows = enrichedTargets.map(c => [
  c.rank,
  escapeCsv(c.parent_name),
  escapeCsv(c.headquarters),
  escapeCsv(c.hqAddress),
  escapeCsv(c.switchboardPhone),
  escapeCsv(c.contactDomain),
  escapeCsv(c.targetDepartment),
  escapeCsv(c.keyContactRole),
  escapeCsv(c.key_executive),
  escapeCsv(c.segment),
  c.callingRegion,
  c.tradeLane,
  escapeCsv(c.primary_bunkering_hubs),
  c.vessels_in_scope,
  escapeCsv(c.strategy_tier),
  c.vlsfo_tonnes,
  c.mgo_tonnes,
  c.lng_tonnes,
  c.total_energy_mwh,
  c.actual_ghgie,
  c.compliance_balance_2025_tco2e,
  c.penalty_2025_y1_eur,
  c.penalty_2025_y2_eur,
  c.compliance_balance_2030_tco2e,
  c.penalty_2030_y1_eur,
  c.bio_lng_required_neg100_t,
  c.bio_lng_required_neg100_mwh,
  c.bio_lng_required_zero_t,
  c.client_savings_physical_eur,
  c.desk_margin_physical_eur,
  c.client_savings_pooling_eur,
  c.desk_margin_pooling_eur,
  escapeCsv(c.outreachPitch),
  c.fleetCapability,
  c.lng_vessels_in_scope,
  c.conventional_vessels_in_scope,
  c.ets_exposure_2025_tco2,
  c.ets_exposure_2025_eur,
  c.ets_exposure_2026_eur,
  c.combined_regulatory_exposure_2025_eur,
]);

const csvContent = [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n');
fs.writeFileSync(path.join(__dirname, '..', 'data', 'fueleu_shipping_crm_targets.csv'), csvContent, 'utf8');
console.log('Wrote data/fueleu_shipping_crm_targets.csv');

// 3. Write to src/domain/fueleu/shippingTargetsData.ts
const tsContent = `import { ShippingCounterparty } from './types';

export const TOTAL_MARKET_VESSELS_IN_SCOPE = 12356;
export const TOTAL_MARKET_ENERGY_TWH = 633.2;

export const FUEL_EU_SHIPPING_COUNTERPARTIES: ShippingCounterparty[] = ${JSON.stringify(enrichedTargets, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'domain', 'fueleu', 'shippingTargetsData.ts'), tsContent, 'utf8');
console.log('Wrote src/domain/fueleu/shippingTargetsData.ts');

console.log('✨ All 1,850 records synchronized successfully across JSON, CSV, and TypeScript!');
