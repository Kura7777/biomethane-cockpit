/**
 * Regenerates the FuelEU compliance fields of the 1,850-counterparty shipping dataset from the
 * app's own calculator (src/domain/fueleu/calculator.ts), so the dataset can never drift from
 * the engine again. Run, then run build_full_registry.cjs to refresh ETS fields, CSV and TS:
 *
 *   npx vite-node scripts/regenerate_fueleu_compliance.ts
 *   node scripts/build_full_registry.cjs
 *
 * Outreach pitches embed penalty / Bio-LNG / savings figures; each figure is mapped back to the
 * field it was derived from and re-rendered at the same precision. Any figure that cannot be
 * mapped aborts the run rather than leaving a stale number in client-facing text.
 */
import * as fs from 'fs';
import * as path from 'path';
import { calculateVesselExposure } from '../src/domain/fueleu/calculator';

type Row = Record<string, any>;

const jsonPath = path.join(__dirname, '..', 'data', 'fueleu_shipping_crm_targets.json');
const rows: Row[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const round = (x: number, dp: number) => Number(x.toFixed(dp));

const TIER_LABEL = {
  1: 'Tier 1: Mega-Deficit (>€10M / year)',
  2: 'Tier 2: Mid-Tier Compliance Buyer (€2M – €10M / year)',
  3: 'Tier 3: Regional & Feeder Deficit (<€2M / year)',
  4: 'Tier 4: Over-Compliant Article 21 Surplus Seller',
} as const;

function tierFor(penalty: number, surplus: boolean): 1 | 2 | 3 | 4 {
  if (surplus) return 4;
  if (penalty > 10_000_000) return 1;
  if (penalty >= 2_000_000) return 2;
  return 3;
}

function retier(existing: string, tier: 1 | 2 | 3 | 4): string {
  const [label, ...rest] = existing.split(' · ');
  const suffix = rest.length ? ` · ${rest.join(' · ')}` : '';
  // Keep the record's own wording when its band is unchanged.
  const keepLabel = label.startsWith(`Tier ${tier}:`) ? label : TIER_LABEL[tier];
  return keepLabel + suffix;
}

/** Monetary / energy fields a pitch figure may have been rendered from. */
const PITCH_FIELDS_EUR = [
  'penalty_2025_y1_eur', 'penalty_2025_y2_eur', 'penalty_2030_y1_eur',
  'client_savings_physical_eur', 'client_savings_pooling_eur',
  'desk_margin_physical_eur', 'desk_margin_pooling_eur',
  'ets_exposure_2025_eur', 'combined_regulatory_exposure_2025_eur',
];

function rewritePitch(pitch: string, oldRow: Row, newRow: Row): { text: string; unmapped: string[] } {
  const unmapped: string[] = [];
  // Two figures can display identically (e.g. penalty €0.545M and savings €0.464M both "€0.5M").
  // Assign each occurrence, in reading order, the first matching field not yet used in this pitch.
  const used = new Set<string>();
  const pickEurField = (value: number, tol: number): string | undefined => {
    const matches = PITCH_FIELDS_EUR.filter(f => typeof oldRow[f] === 'number' && Math.abs(oldRow[f] - value) <= tol);
    const field = matches.find(f => !used.has(f)) ?? matches[0];
    if (field) used.add(field);
    return field;
  };
  // €12.3M style amounts
  let text = pitch.replace(/€(\d+(?:\.\d+)?)M/g, (match, num: string) => {
    const dp = (num.split('.')[1] ?? '').length;
    const value = Number(num) * 1e6;
    const tol = 0.5 * 10 ** -dp * 1e6 + 1;
    const field = pickEurField(value, tol);
    if (!field) { unmapped.push(match); return match; }
    return `€${(newRow[field] / 1e6).toFixed(dp)}M`;
  });
  // €955k style amounts
  text = text.replace(/€(\d+(?:\.\d+)?)k\b/g, (match, num: string) => {
    const dp = (num.split('.')[1] ?? '').length;
    const value = Number(num) * 1e3;
    const tol = 0.5 * 10 ** -dp * 1e3 + 1;
    const field = pickEurField(value, tol);
    if (!field) { unmapped.push(match); return match; }
    return `€${(newRow[field] / 1e3).toFixed(dp)}k`;
  });
  // +115.7 kt compliance surplus / deficit volumes
  text = text.replace(/([+-]?)(\d+(?:\.\d+)?) kt\b/g, (match, sign: string, num: string) => {
    const dp = (num.split('.')[1] ?? '').length;
    const value = Number(num) * 1000 * (sign === '-' ? -1 : 1);
    const tol = 10 ** -dp * 1000 + 1;
    const field = ['compliance_balance_2025_tco2e', 'compliance_balance_2030_tco2e']
      .find(f => Math.abs(Math.abs(oldRow[f]) - Math.abs(value)) <= tol);
    if (!field) { unmapped.push(match); return match; }
    const v = newRow[field] / 1000;
    return `${sign ? (v >= 0 ? '+' : '-') : ''}${Math.abs(v).toFixed(dp)} kt`;
  });
  // 123.4 GWh Bio-LNG volumes
  text = text.replace(/(\d+(?:\.\d+)?) GWh/g, (match, num: string) => {
    const dp = (num.split('.')[1] ?? '').length;
    const value = Number(num) * 1000;
    const tol = 10 ** -dp * 1000 + 1; // source pitches occasionally mis-rounded by one digit
    if (Math.abs(oldRow.bio_lng_required_neg100_mwh - value) > tol) { unmapped.push(match); return match; }
    return `${(newRow.bio_lng_required_neg100_mwh / 1000).toFixed(dp)} GWh`;
  });
  return { text, unmapped };
}

const allUnmapped: string[] = [];
const tierChanges: Record<string, number> = {};

const regenerated = rows.map(row => {
  const base = {
    vlsfoTonnes: row.vlsfo_tonnes,
    mgoTonnes: row.mgo_tonnes,
    lngTonnes: row.lng_tonnes,
    bioLngTonnes: 0,
    bioLngCi: -100,
    consecutiveYearsNonCompliant: 1,
  };
  const r25 = calculateVesselExposure({ ...base, targetYear: 2025 });
  const r30 = calculateVesselExposure({ ...base, targetYear: 2030 });

  const next: Row = {
    ...row,
    total_energy_mwh: Math.round(r25.totalEnergyMwh),
    actual_ghgie: round(r25.weightedGhgie, 2),
    compliance_balance_2025_tco2e: round(r25.complianceBalanceTco2e, 1),
    penalty_2025_y1_eur: Math.round(r25.statutoryPenaltyY1Eur),
    penalty_2025_y2_eur: Math.round(r25.statutoryPenaltyY2Eur),
    compliance_balance_2030_tco2e: round(r30.complianceBalanceTco2e, 1),
    penalty_2030_y1_eur: Math.round(r30.statutoryPenaltyY1Eur),
    bio_lng_required_neg100_t: round(r25.bioLngRequiredNeg100Tonnes, 1),
    bio_lng_required_neg100_mwh: Math.round(r25.bioLngRequiredNeg100Mwh),
    bio_lng_required_zero_t: round(r25.bioLngRequiredZeroCiTonnes, 1),
    client_savings_physical_eur: Math.round(r25.physicalSavingsEur),
    desk_margin_physical_eur: Math.round(r25.physicalTradingMarginEur),
    client_savings_pooling_eur: Math.round(r25.poolingSavingsEur),
    desk_margin_pooling_eur: Math.round(r25.poolingArrangementMarginEur),
  };

  const tier = tierFor(next.penalty_2025_y1_eur, r25.isOverCompliant);
  next.strategy_tier = retier(row.strategy_tier, tier);
  const oldTier = Number(/^Tier (\d)/.exec(row.strategy_tier)?.[1]);
  if (oldTier !== tier) tierChanges[`${oldTier}→${tier}`] = (tierChanges[`${oldTier}→${tier}`] ?? 0) + 1;

  // Combined exposure / ETS are refreshed by build_full_registry.cjs; carry the old ETS figure
  // (fuel tonnages unchanged) so pitch mapping of combined exposure stays consistent.
  next.combined_regulatory_exposure_2025_eur = next.penalty_2025_y1_eur + (row.ets_exposure_2025_eur ?? 0);

  if (oldTier === 4 && tier !== 4) {
    // The surplus narrative no longer holds once LNG methane slip is counted (Annex II):
    // restate the pitch factually as a deficit position.
    const short = row.parent_name.replace(/\s*\(.*\)\s*$/, '');
    next.outreachPitch =
      `Once LNG methane slip is counted under FuelEU Annex II, ${short}'s ${row.vessels_in_scope} EU-scope vessels ` +
      `run at ${next.actual_ghgie.toFixed(2)} gCO₂e/MJ against the 89.34 g/MJ 2025 limit — a ` +
      `${(Math.abs(next.compliance_balance_2025_tco2e) / 1000).toFixed(1)} kt deficit and a €${(next.penalty_2025_y1_eur / 1e6).toFixed(1)}M penalty exposure. ` +
      `Our desk can structure ${(next.bio_lng_required_neg100_mwh / 1000).toFixed(1)} GWh of manure Bio-LNG (-100 CI) for its dual-fuel tonnage ` +
      `or an Article 21 pool allocation, securing up to €${(next.client_savings_physical_eur / 1e6).toFixed(1)}M in net client compliance savings.`;
  } else {
    const { text, unmapped } = rewritePitch(row.outreachPitch, row, next);
    next.outreachPitch = text;
    for (const u of unmapped) allUnmapped.push(`${row.parent_name}: ${u}`);
  }
  return next;
});

if (allUnmapped.length > 0) {
  console.error(`❌ ${allUnmapped.length} pitch figures could not be mapped to a source field:`);
  for (const u of allUnmapped.slice(0, 20)) console.error('   ', u);
  process.exit(1);
}

// Dataset convention: deficit carriers by 2025 penalty (desc), then surplus holders by surplus (desc).
// build_full_registry.cjs re-assigns rank from this order.
regenerated.sort((a, b) => {
  const aSurplus = a.compliance_balance_2025_tco2e > 0;
  const bSurplus = b.compliance_balance_2025_tco2e > 0;
  if (aSurplus !== bSurplus) return aSurplus ? 1 : -1;
  return aSurplus
    ? b.compliance_balance_2025_tco2e - a.compliance_balance_2025_tco2e
    : b.penalty_2025_y1_eur - a.penalty_2025_y1_eur;
});

fs.writeFileSync(jsonPath, JSON.stringify(regenerated, null, 2), 'utf8');
console.log(`✅ Regenerated FuelEU compliance fields for ${regenerated.length} counterparties.`);
console.log('   Tier band changes:', JSON.stringify(tierChanges));
console.log('   Surplus holders (2025):', regenerated.filter(r => r.compliance_balance_2025_tco2e > 0).length);
