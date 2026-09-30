import type { ShippingCounterparty, FuelEuDatasetSource, GroupEntityType, FuelCostBearer, FleetCapability } from './types';

/**
 * Compact storage format for FUEL_EU_SHIPPING_COUNTERPARTIES (see shippingTargetsData.ts).
 *
 * The full per-company object was ~7.7 MB of JS, most of it repeated text (outreach pitch, source
 * block, fuel-cost-bearer note, tier label, group names). The generated file now stores one
 * positional tuple per company plus small lookup tables, and `decodeShippingTargets` rebuilds the
 * exact `ShippingCounterparty` objects at module load. Field names, types and semantics are
 * unchanged; the only difference is the rounding applied at generation (see `slimTonnes`).
 *
 * Shared by scripts/build_fueleu_shipping_targets.ts (encoder side) and the data module (decoder).
 */

export const TIER_LABEL = {
  1: 'Tier 1: Mega-Deficit (>€10M / year)',
  2: 'Tier 2: Mid-Tier Compliance Buyer (€2M – €10M / year)',
  3: 'Tier 3: Regional & Feeder Deficit (<€2M / year)',
  4: 'Tier 4: Over-Compliant Article 21 Surplus Seller',
} as const;

export type StrategyTierIndex = keyof typeof TIER_LABEL;

/** Positional layout of one encoded row. Rank is the row's position (1-based); combined exposure is penalty + ETS EUR; conventional vessels are vessels - LNG vessels. */
export const COL = {
  name: 0,
  segment: 1,
  vessels: 2,
  tier: 3,
  vlsfo: 4,
  mgo: 5,
  lng: 6,
  energyMwh: 7,
  ghgie: 8,
  bal2026: 9,
  pen2026Y1: 10,
  pen2026Y2: 11,
  bal2030: 12,
  pen2030Y1: 13,
  bioNeg100T: 14,
  bioNeg100Mwh: 15,
  bioZeroT: 16,
  savePhys: 17,
  marginPhys: 18,
  savePool: 19,
  marginPool: 20,
  fleetCap: 21,
  lngVessels: 22,
  etsTco2: 23,
  etsEur: 24,
  companyImo: 25,
  shipImos: 26,
  lngShipCount: 27,
  otherFuel: 28,
  partial: 29,
  group: 30,
  bearer: 31,
} as const;

/** Tonnes at whole-tonne precision once they reach 1,000 t; one decimal below that so small fleets are not distorted. */
export function slimTonnes(x: number): number {
  if (Math.abs(x) >= 1000) return Math.round(x);
  return Math.round(x * 10) / 10;
}

export interface ShippingTargetsPack {
  source: FuelEuDatasetSource;
  fuelSplitMethod: string;
  /** Register prices baked into every outreach pitch at generation time. */
  poolBuyPriceEurPerTco2e: number;
  poolSellPriceEurPerTco2e: number;
  segments: string[];
  fleetCapabilities: FleetCapability[];
  /** [group_id, group_name, entityType, parent_group_id ('' when none)] */
  groups: [string, string, GroupEntityType, string][];
  bearers: FuelCostBearer[];
  rows: (string | number)[][];
}

export interface PitchInputs {
  name: string;
  reportingPeriod: number;
  vessels: number;
  ghgie: number;
  balance2026: number;
  penalty2026Y1: number;
  bioNeg100Mwh: number;
  savePhys: number;
  savePool: number;
  surplus: boolean;
  poolBuyPrice: number;
  poolSellPrice: number;
}

/** The outreach copy for one company; generated data and the decoder both use this so the text cannot diverge. */
export function buildOutreachPitch(p: PitchInputs): string {
  const head =
    `Indicative estimate from EU MRV ${p.reportingPeriod} (fuel split estimated): ${p.name}'s ${p.vessels} EU-scope ` +
    `vessels run at ${p.ghgie.toFixed(2)} gCO2e/MJ against the 89.34 g/MJ 2026 FuelEU Maritime limit, a `;
  if (p.surplus) {
    return (
      head +
      `+${(p.balance2026 / 1000).toFixed(1)} kt compliance surplus. Our desk can monetise this Article 21 surplus into deficit fleets at the ` +
      `register bid (€${p.poolSellPrice.toFixed(2)}/tCO2e), an indicative €${(p.savePool / 1e6).toFixed(2)}M of commercial value.`
    );
  }
  return (
    head +
    `${(Math.abs(p.balance2026) / 1000).toFixed(1)} kt deficit and an indicative €${(p.penalty2026Y1 / 1e6).toFixed(2)}M Annex IV penalty exposure. ` +
    `Closing it would require an estimated ${(p.bioNeg100Mwh / 1000).toFixed(1)} GWh of -100 CI Bio-LNG, or an ` +
    `Article 21 pool allocation at the register offer (€${p.poolBuyPrice.toFixed(2)}/tCO2e), an indicative up to €${(p.savePhys / 1e6).toFixed(2)}M in net compliance savings.`
  );
}

export function decodeShippingTargets(pack: ShippingTargetsPack): ShippingCounterparty[] {
  const { source, rows } = pack;
  return rows.map((r, i): ShippingCounterparty => {
    const tier = r[COL.tier] as StrategyTierIndex;
    const grp = pack.groups[r[COL.group] as number];
    const vessels = r[COL.vessels] as number;
    const lngVessels = r[COL.lngVessels] as number;
    const pen26 = r[COL.pen2026Y1] as number;
    const etsEur = r[COL.etsEur] as number;
    const name = r[COL.name] as string;
    const bal26 = r[COL.bal2026] as number;
    const ghgie = r[COL.ghgie] as number;
    const bioMwh = r[COL.bioNeg100Mwh] as number;
    const savePhys = r[COL.savePhys] as number;
    const savePool = r[COL.savePool] as number;
    return {
      rank: i + 1,
      parent_name: name,
      segment: pack.segments[r[COL.segment] as number],
      vessels_in_scope: vessels,
      strategy_tier: TIER_LABEL[tier],
      vlsfo_tonnes: r[COL.vlsfo] as number,
      mgo_tonnes: r[COL.mgo] as number,
      lng_tonnes: r[COL.lng] as number,
      total_energy_mwh: r[COL.energyMwh] as number,
      actual_ghgie: ghgie,
      compliance_balance_2026_tco2e: bal26,
      penalty_2026_y1_eur: pen26,
      penalty_2026_y2_eur: r[COL.pen2026Y2] as number,
      compliance_balance_2030_tco2e: r[COL.bal2030] as number,
      penalty_2030_y1_eur: r[COL.pen2030Y1] as number,
      bio_lng_required_neg100_t: r[COL.bioNeg100T] as number,
      bio_lng_required_neg100_mwh: bioMwh,
      bio_lng_required_zero_t: r[COL.bioZeroT] as number,
      client_savings_physical_eur: savePhys,
      desk_margin_physical_eur: r[COL.marginPhys] as number,
      client_savings_pooling_eur: savePool,
      desk_margin_pooling_eur: r[COL.marginPool] as number,
      outreachPitch: buildOutreachPitch({
        name,
        reportingPeriod: source.reportingPeriod,
        vessels,
        ghgie,
        balance2026: bal26,
        penalty2026Y1: pen26,
        bioNeg100Mwh: bioMwh,
        savePhys,
        savePool,
        surplus: tier === 4,
        poolBuyPrice: pack.poolBuyPriceEurPerTco2e,
        poolSellPrice: pack.poolSellPriceEurPerTco2e,
      }),
      fleetCapability: pack.fleetCapabilities[r[COL.fleetCap] as number],
      lng_vessels_in_scope: lngVessels,
      conventional_vessels_in_scope: vessels - lngVessels,
      ets_exposure_2026_tco2: r[COL.etsTco2] as number,
      ets_exposure_2026_eur: etsEur,
      combined_regulatory_exposure_2026_eur: pen26 + etsEur,
      company_imo: r[COL.companyImo] as string,
      ship_imos: (r[COL.shipImos] as string).split(' '),
      source,
      fuelSplitMethod: pack.fuelSplitMethod,
      lngShipCount: r[COL.lngShipCount] as number,
      otherFuelSuspectedShips: r[COL.otherFuel] as number,
      partialReportShips: r[COL.partial] as number,
      contacts: [],
      group_id: grp[0],
      group_name: grp[1],
      entityType: grp[2],
      parent_group_id: grp[3],
      fuelCostBearer: pack.bearers[r[COL.bearer] as number],
    };
  });
}
