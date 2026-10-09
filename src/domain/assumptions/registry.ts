import { EUROPEAN_MARKET_BENCHMARKS } from '../markets/marketBenchmarks';
import { ETS1_GAS_SHARE_SECTORS, defaultGasShare } from '../ets1/gasShare';
import { ETS2_SEGMENT_SHARES } from '../ets2/segmentShare';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstockData';
import { HUB_BASIS_SPREADS, INTERCONNECTION_POINTS } from '../logistics/corridorsData';

/**
 * Commercial assumptions register.
 *
 * Every number the engines use that is a commercial judgement — not a statute, a physical
 * constant or a live mark — lives here with its unit and where it came from, so each idea
 * the desk screens shows what it assumes and a trader can change it.
 *
 * Overrides are kept in this browser's localStorage (per user, per machine). Defaults are
 * never silently changed: a reset always returns to the value and source shown here.
 */

export type AssumptionCategory = 'FUELEU' | 'DEMAND' | 'RISK' | 'DEAL' | 'LOGISTICS' | 'FEEDSTOCK' | 'COST';

/** How much weight the default can bear. */
export type AssumptionBasis =
  | 'MARKET_MARK'     // taken from a dated market benchmark in this app
  | 'DESK_ESTIMATE'   // a desk judgement with no transaction evidence on file
  | 'DESK_POLICY';    // a desk choice (fee, convention), not a market fact

export interface AssumptionDefinition {
  key: string;
  category: AssumptionCategory;
  label: string;
  unit: string;
  defaultValue: number;
  basis: AssumptionBasis;
  source: string;
  /** Where the value changes an output. */
  usedIn: string;
  min?: number;
  max?: number;
}

const fueleuMark = EUROPEAN_MARKET_BENCHMARKS.find(b => b.marketId === 'FUELEU');
const fueleuMarkSource = fueleuMark
  ? `FuelEU mark in Pricing Desk (${fueleuMark.sourceName}, observed ${fueleuMark.observedAt})`
  : 'FuelEU mark in Pricing Desk';

/** Default CI per feedstock when the desk hasn't entered one (see consignment/feedstocks.ts). The
 * underlying FEEDSTOCK_REGISTRY literal is untouched (other code and tests read it directly);
 * this generates one named, overridable assumption per feedstock from the same values. */
const FEEDSTOCK_DEFAULT_CI_ASSUMPTIONS: AssumptionDefinition[] = Object.values(FEEDSTOCK_REGISTRY).map(f => ({
  key: `feedstock.defaultCi.${f.id}`,
  category: 'FEEDSTOCK',
  label: `Default CI: ${f.name}`,
  unit: 'gCO₂e/MJ',
  defaultValue: f.defaultCI,
  basis: 'DESK_ESTIMATE',
  source: `Desk judgement per feedstock (${f.citation} is cited for Annex classification only, not this number).`,
  usedIn: 'Default CI fed into every certificate valuation (tCO2ePerMWh) when the desk has not entered a CI (arbitrage engine, origination search)',
  min: -200,
  max: 200,
}));

/** One assumption per hub basis spread to TTF (see logistics/corridors.ts HUB_BASIS_SPREADS). The
 * underlying literal keeps its hub name/operator metadata; only the spread number is overridable. */
const HUB_BASIS_SPREAD_ASSUMPTIONS: AssumptionDefinition[] = Object.entries(HUB_BASIS_SPREADS).map(([country, hub]) => ({
  key: `cost.hubBasis.${country}`,
  category: 'COST',
  label: `Hub basis spread to TTF: ${hub.hubName} (${country})`,
  unit: '€/MWh',
  defaultValue: hub.basisSpreadToTtfEurMwh,
  basis: 'DESK_ESTIMATE',
  source: `Desk estimate for ${hub.hubName}, operated by ${hub.operator}, relative to the TTF benchmark.`,
  usedIn: 'Netback engine and logistics engine (hubBasisSpread helper): basis differential between origin and target hub',
  min: -20,
  max: 20,
}));

/** One assumption per interconnection point entry/exit tariff leg that is verified (see
 * logistics/corridors.ts INTERCONNECTION_POINTS). Points with no verified tariff (null) stay
 * null/unverified and are not registered here — there is nothing to make editable. */
const VERIFIED_INTERCONNECTION_POINTS = INTERCONNECTION_POINTS.filter(
  ip => ip.entryTariffEurMwh !== null && ip.exitTariffEurMwh !== null
);
const INTERCONNECTION_TARIFF_ASSUMPTIONS: AssumptionDefinition[] = VERIFIED_INTERCONNECTION_POINTS.flatMap(ip => [
  {
    key: `cost.ip.${ip.id}.entry`,
    category: 'COST' as const,
    label: `${ip.name}: entry tariff`,
    unit: '€/MWh',
    defaultValue: ip.entryTariffEurMwh as number,
    basis: 'DESK_ESTIMATE' as const,
    source: `${ip.source}${ip.lastVerified ? ` (verified ${ip.lastVerified})` : ''}.`,
    usedIn: 'Logistics engine and route window: physical transmission tariff for this interconnection leg (entry + exit = total)',
    min: 0,
  },
  {
    key: `cost.ip.${ip.id}.exit`,
    category: 'COST' as const,
    label: `${ip.name}: exit tariff`,
    unit: '€/MWh',
    defaultValue: ip.exitTariffEurMwh as number,
    basis: 'DESK_ESTIMATE' as const,
    source: `${ip.source}${ip.lastVerified ? ` (verified ${ip.lastVerified})` : ''}.`,
    usedIn: 'Logistics engine and route window: physical transmission tariff for this interconnection leg (entry + exit = total)',
    min: 0,
  },
]);

/** Share of each country's gas demand under ETS2, used to scope supplier volumes (see ets2/segmentShare.ts). */
const ETS2_SEGMENT_SHARE_ASSUMPTIONS: AssumptionDefinition[] = Object.values(ETS2_SEGMENT_SHARES).map(r => ({
  key: `ets2.segmentShare.${r.iso}`,
  category: 'DEMAND',
  label: `Share of ${r.name} gas demand under ETS2 (buildings, services, small users)`,
  unit: 'share (0–1)',
  defaultValue: r.share,
  basis: 'DESK_ESTIMATE',
  source: `${r.sourceNote} Source: ${r.sourceUrl}. Retrieved 2026-09-30.`,
  usedIn: 'Clients page: scopes disclosed all-segment supplier gas volumes to the ETS2 segment (reference value; edit in ets2/segmentShare.ts)',
  min: 0,
  max: 1,
}));

export const ASSUMPTION_DEFINITIONS: AssumptionDefinition[] = [
  // ── Cost tables: cross-border transit tariff ladder ──────────────────────
  {
    key: 'cost.transit.domestic',
    category: 'COST',
    label: 'Transit tariff: domestic (same country)',
    unit: '€/MWh',
    defaultValue: 0.50,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — local domestic grid injection/withdrawal.',
    usedIn: 'Origination arbitrage scan and the Trade Builder (getRouteTransitTariff): transit cost when origin and target country are the same',
    min: 0,
  },
  {
    key: 'cost.transit.crossBorderSingle',
    category: 'COST',
    label: 'Transit tariff: single cross-border hop',
    unit: '€/MWh',
    defaultValue: 1.80,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — single cross-border transit between adjacent grid zones.',
    usedIn: 'Origination arbitrage scan and the Trade Builder (getRouteTransitTariff): transit cost on an adjacent-country route',
    min: 0,
  },
  {
    key: 'cost.transit.euPooling',
    category: 'COST',
    label: 'Transit tariff: EU-wide pooling / marine bunkering',
    unit: '€/MWh',
    defaultValue: 2.50,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — marine bunkering / EU-wide pooling.',
    usedIn: 'Origination arbitrage scan and the Trade Builder (getRouteTransitTariff): transit cost when the target is the EU pool',
    min: 0,
  },
  {
    key: 'cost.transit.multiZone',
    category: 'COST',
    label: 'Transit tariff: multi-zone transit',
    unit: '€/MWh',
    defaultValue: 3.20,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — multi-zone transit between non-adjacent countries.',
    usedIn: 'Origination arbitrage scan and the Trade Builder (getRouteTransitTariff): transit cost on a non-adjacent, non-pooled route',
    min: 0,
  },
  ...HUB_BASIS_SPREAD_ASSUMPTIONS,
  ...INTERCONNECTION_TARIFF_ASSUMPTIONS,

  // ── Deal defaults ──────────────────────────────────────────────────────────
  {
    key: 'deal.defaultVolumeMwh',
    category: 'DEAL',
    label: 'Default deal volume fallback',
    unit: 'MWh',
    defaultValue: 20000,
    basis: 'DESK_POLICY',
    source: 'Desk placeholder used when a plant publishes no annual output. Not a market fact.',
    usedIn: 'Plants, Origination, Plant drawer, FuelEU: default trade volume when plant has no annual output',
    min: 100,
  },

  // ── FuelEU Maritime pathway economics ────────────────────────────────────
  {
    key: 'fueleu.bioLngPremiumEurPerMwh',
    category: 'FUELEU',
    label: 'Bio-LNG delivered premium over the fuel it displaces',
    unit: '€/MWh',
    defaultValue: 65,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate for NL/DK manure Bio-LNG — not a supplier quote.',
    usedIn: 'FuelEU vessel calculator: client saving on the physical Bio-LNG route',
    min: 0,
  },
  {
    key: 'fueleu.physicalDeskMarginEurPerMwh',
    category: 'FUELEU',
    label: 'Desk margin on physical Bio-LNG supply',
    unit: '€/MWh',
    defaultValue: 15,
    basis: 'DESK_POLICY',
    source: 'Desk target margin.',
    usedIn: 'FuelEU vessel calculator: desk margin on the physical route',
    min: 0,
  },
  {
    key: 'fueleu.poolDeskSpreadEurPerTco2e',
    category: 'FUELEU',
    label: 'Desk bid/offer spread on FuelEU pool transfers',
    unit: '€/tCO₂e',
    defaultValue: 10,
    basis: 'DESK_ESTIMATE',
    source: 'Desk spread — no public bid print exists (see OPX note). Consistent with August 2026: OceanScore OPX offers €118.90/tCO2e vs the BetterSea FuelEU Surplus Index executed-trade VWAP €108.89/tCO2e (see src/domain/markets/fueleuPoolIndexHistory.ts) — a ~€10 offer-to-traded gap.',
    usedIn: 'FuelEU calculators: pool bid = mark offer − this spread',
    min: 0,
  },
  {
    key: 'fueleu.poolSellPriceEurPerTco2e',
    category: 'FUELEU',
    label: 'Pool price paid to a surplus holder (desk bid = mark offer − desk spread)',
    unit: '€/tCO₂e',
    defaultValue: (fueleuMark?.offerPrice ?? 109) - 10,
    basis: 'DESK_ESTIMATE',
    source: `${fueleuMarkSource} offer, less the desk bid/offer spread (fueleu.poolDeskSpreadEurPerTco2e) — no public bid print exists (see OPX note). Consistent with August 2026: OceanScore OPX offers €118.90/tCO2e vs the BetterSea FuelEU Surplus Index executed-trade VWAP €108.89/tCO2e.`,
    usedIn: 'FuelEU calculators: surplus monetisation; desk margin = offer − bid',
    min: 0,
  },
  {
    key: 'fueleu.eurUsdFxRate',
    category: 'FUELEU',
    label: 'EUR/USD FX rate for marine bunker quotations',
    unit: 'USD per EUR',
    defaultValue: 1.08,
    basis: 'DESK_ESTIMATE',
    source: 'unsourced desk default — update',
    usedIn: 'Marine bunker quotation: EUR→USD conversion of the delivered quote',
    min: 0,
  },
  {
    key: 'fueleu.liquefactionFeeEurPerMwh',
    category: 'FUELEU',
    label: 'Small-scale liquefaction, bunkering barge & terminal fee',
    unit: '€/MWh',
    defaultValue: 14,
    basis: 'DESK_ESTIMATE',
    source: 'unsourced desk default — update',
    usedIn: 'Marine bunker quotation: Bio-LNG and fossil-LNG price stack',
    min: 0,
  },
  {
    key: 'fueleu.defaultFleetGhgieGPerMj',
    category: 'FUELEU',
    label: 'Default fleet actual GHG intensity (GHGIE) prefill',
    unit: 'gCO₂e/MJ',
    defaultValue: 91.68,
    basis: 'DESK_ESTIMATE',
    source: 'Unsourced desk default. Known inconsistency, flagged rather than silently "fixed": diverges from the computed FUELEU_VLSFO_WTW (~91.74 gCO2e/MJ) and FUELEU_REFERENCE_INTENSITY (91.16 gCO2e/MJ) used elsewhere in the FuelEU calculator.',
    usedIn: 'Dual commercial pathway simulator: prefilled "fleet actual GHGIE" input (the user can edit it per vessel)',
  },
  {
    key: 'fueleu.defaultVlsfoPriceUsdPerTonne',
    category: 'FUELEU',
    label: 'Default VLSFO bunker price prefill',
    unit: '$/tonne',
    defaultValue: 600.0,
    basis: 'DESK_ESTIMATE',
    source: 'Unsourced desk default (marked deprecated in its own code comment) — not a bunker price feed.',
    usedIn: 'Marine bunker quotation screens: prefilled VLSFO price the trader overwrites with a live quote',
    min: 0,
  },
  {
    key: 'fueleu.greenPremiumEurPerMwh',
    category: 'FUELEU',
    label: 'Green Bio-LNG environmental premium (RED III certification spread)',
    unit: '€/MWh',
    defaultValue: 22,
    basis: 'DESK_ESTIMATE',
    source: 'unsourced desk default — update',
    usedIn: 'Marine bunker quotation: Bio-LNG delivered price stack',
    min: 0,
  },

  // ── Netback risk suite fallbacks ─────────────────────────────────────────
  ...ETS2_SEGMENT_SHARE_ASSUMPTIONS,
  {
    key: 'risk.illustrativeVolumeMwh',
    category: 'RISK',
    label: 'Volume used for risk notionals when the deal has none',
    unit: 'MWh',
    defaultValue: 10000,
    basis: 'DESK_POLICY',
    source: 'Illustrative sizing only. Enter a volume on the deal to replace it.',
    usedIn: 'Trade builder risk suite: basis, replacement-cost and 2026-cliff notionals',
    min: 0,
  },
  {
    key: 'risk.replacementCeilingFloorEurPerMwh',
    category: 'RISK',
    label: 'Replacement-cost ceiling floor (markets without a statutory ceiling)',
    unit: '€/MWh',
    defaultValue: 120,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate. FR CPB and DE THG use their statutory ceilings instead.',
    usedIn: 'Trade builder risk suite: replacement-cost exposure',
    min: 0,
  },
  {
    key: 'risk.replacementCeilingNetbackMultiple',
    category: 'RISK',
    label: 'Replacement-cost ceiling as a multiple of netback',
    unit: '×',
    defaultValue: 1.5,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate. The ceiling is the larger of this multiple and the floor.',
    usedIn: 'Trade builder risk suite: replacement-cost exposure',
    min: 1,
  },
  {
    key: 'risk.fallbackProcurementPremiumEurPerMwh',
    category: 'RISK',
    label: 'Procurement premium over gas index when no producer price is set',
    unit: '€/MWh',
    defaultValue: 25,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate. Set producer pricing on the deal to replace it.',
    usedIn: 'Trade builder risk suite: replacement-cost exposure',
    min: 0,
  },
  {
    key: 'risk.fallbackProcurementEurPerMwh',
    category: 'RISK',
    label: 'Procurement cost when neither producer price nor gas mark is available',
    unit: '€/MWh',
    defaultValue: 58,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate.',
    usedIn: 'Trade builder risk suite: replacement-cost exposure',
    min: 0,
  },
  {
    key: 'risk.deThgBundleRefNeg0EurPerMwh',
    category: 'RISK',
    label: 'DE THG all-in clearing ceiling, −80 < CI ≤ 0 g/MJ (unsourced desk estimate)',
    unit: '€/MWh',
    defaultValue: 120,
    basis: 'DESK_ESTIMATE',
    source: 'Unsourced desk estimate, not a dated observation and not from the broker run (the broker sheet has no DE THG row above −80 g/MJ). An observed bundle price on the deal overrides it. For CI at or below −80 the broker bundle mark is used instead.',
    usedIn: 'Netback engine: ceiling on the DE THG netback for −80 < CI ≤ 0 (Origination, Trade Builder). Not a quoted price.',
    min: 0,
  },
  {
    key: 'clients.firstDealShare',
    category: 'DEMAND',
    label: 'First ETS1 deal: share of a company biomethane potential',
    unit: '%',
    defaultValue: 10,
    basis: 'DESK_ESTIMATE',
    source: 'Desk heuristic for how much of a company ETS1 potential to open with. Not a market observation.',
    usedIn: 'Clients: the first-deal volume suggested on an ETS1 play (the value of the play is the full potential)',
    min: 1,
    max: 100,
  },
  // ── Map delivery-option costs (indicative, not quoted) ───────────────────
  {
    key: 'logistics.swapOriginInjectionFeeEurPerMwh',
    category: 'LOGISTICS',
    label: 'Virtual swap: origin grid injection tariff (indicative)',
    unit: '€/MWh',
    defaultValue: 0.80,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — not a published TSO tariff.',
    usedIn: 'Map delivery options, Option A (virtual UDB swap): origin injection leg',
    min: 0,
  },
  {
    key: 'logistics.swapBasisHedgingFallbackEurPerMwh',
    category: 'LOGISTICS',
    label: 'Virtual swap: basis hedging fee when the hub spread is flat',
    unit: '€/MWh',
    defaultValue: 0.65,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate used only when the origin/target hub basis spread is zero.',
    usedIn: 'Map delivery options, Option A (virtual UDB swap): basis hedging leg fallback',
    min: 0,
  },
  {
    key: 'logistics.swapUdbCertificationFeeEurPerMwh',
    category: 'LOGISTICS',
    label: 'Union Database (UDB) registry transfer & certification fee (indicative)',
    unit: '€/MWh',
    defaultValue: 0.45,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — not a published registry fee schedule.',
    usedIn: 'Map delivery options, Options A and C: UDB / ISCC EU certification leg',
    min: 0,
  },
  {
    key: 'logistics.swapExecutionBrokerageEurPerMwh',
    category: 'LOGISTICS',
    label: 'Virtual swap: brokerage & hub clearing friction (indicative)',
    unit: '€/MWh',
    defaultValue: 0.25,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — not a quoted broker fee.',
    usedIn: 'Map delivery options, Option A (virtual UDB swap): execution leg',
    min: 0,
  },
  {
    key: 'logistics.physicalBalancingReserveEurPerMwh',
    category: 'LOGISTICS',
    label: 'Physical pipeline: multi-TSO balancing & imbalance margin (indicative)',
    unit: '€/MWh',
    defaultValue: 0.50,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — not a published balancing charge.',
    usedIn: 'Map delivery options, Option B (physical pipeline transit): balancing reserve leg',
    min: 0,
  },
  {
    key: 'logistics.physicalPrismaAuctionFeeEurPerMwh',
    category: 'LOGISTICS',
    label: 'Physical pipeline: PRISMA auction platform handling fee (indicative)',
    unit: '€/MWh',
    defaultValue: 0.15,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — not a published PRISMA fee schedule.',
    usedIn: 'Map delivery options, Option B (physical pipeline transit): auction platform leg',
    min: 0,
  },
  {
    key: 'logistics.bioLngLiquefactionCapexOpexEurPerMwh',
    category: 'LOGISTICS',
    label: 'Bio-LNG: small-scale cryogenic liquefaction (indicative)',
    unit: '€/MWh',
    defaultValue: 8.50,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — not a supplier quote.',
    usedIn: 'Map delivery options, Option C (bio-LNG): liquefaction leg',
    min: 0,
  },
  {
    key: 'logistics.bioLngRoadFreightRateEurPerMwhPerKm',
    category: 'LOGISTICS',
    label: 'Bio-LNG: cryogenic road freight rate per km (indicative)',
    unit: '€/MWh per km',
    defaultValue: 0.0065,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate (~€1.70/km for a 20t trailer) — not a carrier quote.',
    usedIn: 'Map delivery options, Option C (bio-LNG): road freight leg, before the floor/ceiling clamp',
    min: 0,
  },
  {
    key: 'logistics.bioLngRoadFreightFloorEurPerMwh',
    category: 'LOGISTICS',
    label: 'Bio-LNG: road freight floor (indicative)',
    unit: '€/MWh',
    defaultValue: 4.00,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate.',
    usedIn: 'Map delivery options, Option C (bio-LNG): road freight leg, minimum clamp',
    min: 0,
  },
  {
    key: 'logistics.bioLngRoadFreightCeilingEurPerMwh',
    category: 'LOGISTICS',
    label: 'Bio-LNG: road freight ceiling (indicative)',
    unit: '€/MWh',
    defaultValue: 22.00,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate.',
    usedIn: 'Map delivery options, Option C (bio-LNG): road freight leg, maximum clamp',
    min: 0,
  },
  {
    key: 'logistics.bioLngRegasificationTerminalFeeEurPerMwh',
    category: 'LOGISTICS',
    label: 'Bio-LNG: destination terminal offloading / regasification fee (indicative)',
    unit: '€/MWh',
    defaultValue: 2.00,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate — not a terminal tariff schedule.',
    usedIn: 'Map delivery options, Option C (bio-LNG): destination terminal leg',
    min: 0,
  },
  // ── Feedstock default CI ──────────────────────────────────────────────────
  ...FEEDSTOCK_DEFAULT_CI_ASSUMPTIONS,
  ...ETS1_GAS_SHARE_SECTORS.map((sector): AssumptionDefinition => ({
    key: `ets1.gasShare.${sector}`,
    category: 'DEMAND',
    label: `Natural-gas share of site CO2, ${sector.toLowerCase().replace(/_/g, ' ')}`,
    unit: 'share of verified CO2',
    defaultValue: defaultGasShare(sector),
    basis: sector === 'POWER_HEAT' ? 'DESK_POLICY' : 'MARKET_MARK',
    source: sector === 'POWER_HEAT'
      ? 'Set to 1: a power or heat site is only graded fit when its name shows gas (ets1/sites.ts resolveFit).'
      : 'Eurostat nrg_bal_c EU27 2024 (TJ, updated 2026-08-27): natural-gas CO2 over all combustible-fuel CO2 for the sector balance row, IPCC 2006 default emission factors. Energy use only. See ets1/gasShare.ts.',
    usedIn: 'Clients and EU ETS1 sites: the biomethane a site could take is its verified CO2 times this share (not its full tonnage)',
    min: 0,
    max: 1,
  })),
  // ── NL GGE & Spain deal assumptions ──────────────────────────────────────
  {
    key: 'market.nl_gge.lhvFactor.ES',
    category: 'RISK',
    label: 'NL GGE: Spanish GO LHV/HHV conversion factor',
    unit: 'factor',
    defaultValue: 0.90,
    basis: 'DESK_ESTIMATE',
    source: 'OPEN — NEa uses LHV (R3); Spanish GO energy basis to confirm (PCS/HHV vs PCI/LHV). Default 0.90 based on pure methane LHV/HHV ≈ 0.901.',
    usedIn: 'Netback engine: converts Spanish gross (PCS/HHV) GO MWh into net (PCI/LHV) MWh for NL GGE quantity formula',
    min: 0.8,
    max: 1.0,
  },
  {
    key: 'market.nl_gge.lhvFactor.default',
    category: 'RISK',
    label: 'NL GGE: Default GO LHV conversion factor (other origins)',
    unit: 'factor',
    defaultValue: 1.00,
    basis: 'DESK_ESTIMATE',
    source: 'Unverified — 1.00 default for other countries pending national registry energy basis confirmation.',
    usedIn: 'Netback engine: LHV conversion factor for non-Spanish origins',
    min: 0.8,
    max: 1.0,
  },
  {
    key: 'deal.defaultStructure.isDeliveredTtf',
    category: 'DEAL',
    label: 'NL GGE: Default deal structure (0 = Bundle at origin PVB, 1 = Delivered TTF)',
    unit: 'flag',
    defaultValue: 0,
    basis: 'DESK_POLICY',
    source: 'Desk policy (spec O3): default BUNDLE_AT_ORIGIN (PVB). Delivered TTF carries hub basis spread.',
    usedIn: 'Trade Builder: default structure selection when creating a deal',
    min: 0,
    max: 1,
  },
  {
    key: 'cost.spread.pvbTtf',
    category: 'COST',
    label: 'PVB–TTF hub basis spread (Structure B: Delivered TTF)',
    unit: '€/MWh',
    defaultValue: 1.35,
    basis: 'DESK_ESTIMATE',
    source: 'MIBGAS PVB vs Dutch TTF basis spread from desk cost register (+1.35 €/MWh).',
    usedIn: 'Netback engine: deducted from netback only when deal structure is BUNDLE_DELIVERED_TTF',
    min: 0,
  },
  {
    key: 'cost.transfer.enagasExport',
    category: 'COST',
    label: 'Enagás GTS GO export fee',
    unit: '€/MWh',
    defaultValue: 0.05,
    basis: 'DESK_ESTIMATE',
    source: 'Enagás GTS registry export fee schedule (~€0.05/MWh).',
    usedIn: 'Netback engine: registry transfer fee for Spanish GO export to AIB hub',
    min: 0,
  },
  {
    key: 'cost.transfer.verticerImport',
    category: 'COST',
    label: 'VertiCer GO import / transfer fee',
    unit: '€/MWh',
    defaultValue: 0.05,
    basis: 'DESK_ESTIMATE',
    source: 'VertiCer AIB hub import and transfer fee schedule (~€0.05/MWh).',
    usedIn: 'Netback engine: registry transfer fee for Dutch VertiCer account import',
    min: 0,
  },
  {
    key: 'cost.certification.auditPerMwh',
    category: 'COST',
    label: 'Sustainability scheme audit & certificate fee',
    unit: '€/MWh',
    defaultValue: 0.40,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate for ISCC/REDcert annual audit and certificate issuance fee per MWh.',
    usedIn: 'Netback engine: certification costs',
    min: 0,
  },
];

/** Resolves the LHV factor for an origin country for NL_GGE calculation (spec O1, R3, R4). */
export function getLhvFactorForOrigin(originCountry?: string | null): number {
  const norm = (originCountry || '').toUpperCase();
  if (norm === 'ES') {
    return getAssumption('market.nl_gge.lhvFactor.ES') ?? 0.90;
  }
  return getAssumption('market.nl_gge.lhvFactor.default') ?? 1.00;
}

const DEFINITIONS_BY_KEY = new Map(ASSUMPTION_DEFINITIONS.map(d => [d.key, d]));

/** The desk's default CI for a feedstock (Pricing desk → Assumptions), or null for an unknown key. */
export function feedstockDefaultCi(feedstockKey: string): number | null {
  const f = FEEDSTOCK_REGISTRY[feedstockKey];
  return f ? getAssumption(`feedstock.defaultCi.${f.id}`) : null;
}

export function getAssumptionDefinition(key: string): AssumptionDefinition | undefined {
  return DEFINITIONS_BY_KEY.get(key);
}

// ---------------------------------------------------------------------------
// Override store
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'biomethane-desk.assumptions.v1';

let overrides: Record<string, number> = loadOverrides();
let version = 0;
const listeners = new Set<() => void>();

/** Exported for tests: confirms a stale override key (e.g. a deleted assumption) is dropped on load rather than crashing. */
export function loadOverrides(): Record<string, number> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (DEFINITIONS_BY_KEY.has(k) && typeof v === 'number' && Number.isFinite(v)) clean[k] = v;
    }
    return clean;
  } catch {
    return {};
  }
}

function persistAndNotify(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // storage unavailable: overrides still apply for this session
  }
  version++;
  listeners.forEach(l => l());
}

/** Current value: the user's override if set, else the documented default. */
export function getAssumption(key: string): number {
  const def = DEFINITIONS_BY_KEY.get(key);
  if (!def) throw new Error(`Unknown commercial assumption: ${key}`);
  return overrides[key] ?? def.defaultValue;
}

export function isOverridden(key: string): boolean {
  return key in overrides;
}

export function setAssumption(key: string, value: number): void {
  const def = DEFINITIONS_BY_KEY.get(key);
  if (!def) throw new Error(`Unknown commercial assumption: ${key}`);
  if (!Number.isFinite(value)) return;
  const bounded = Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, value));
  if (bounded === def.defaultValue) delete overrides[key];
  else overrides = { ...overrides, [key]: bounded };
  persistAndNotify();
}

export function resetAssumption(key: string): void {
  if (!(key in overrides)) return;
  const next = { ...overrides };
  delete next[key];
  overrides = next;
  persistAndNotify();
}

export function resetAllAssumptions(): void {
  overrides = {};
  persistAndNotify();
}

export function subscribeAssumptions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Increments on every change; include in memo deps so outputs recompute. */
export function getAssumptionsVersion(): number {
  return version;
}

/**
 * Desk bid for a given pool offer (the FuelEU mark offer, passed in by the caller from the marks
 * store): the offer less the desk spread, unless the user has explicitly overridden
 * fueleu.poolSellPriceEurPerTco2e directly, in which case that pinned value is used. Moving
 * fueleu.poolDeskSpreadEurPerTco2e therefore moves the bid without a separate edit.
 */
export function fuelEuPoolBidPriceEurPerTco2e(offerEurPerTco2e: number): number {
  if (isOverridden('fueleu.poolSellPriceEurPerTco2e')) return getAssumption('fueleu.poolSellPriceEurPerTco2e');
  return offerEurPerTco2e - getAssumption('fueleu.poolDeskSpreadEurPerTco2e');
}

/** Desk pooling margin per tCO2e: the spread between what deficit clients pay and surplus holders receive. */
export function fuelEuPoolSpreadEurPerTco2e(offerEurPerTco2e: number): number {
  return Math.max(0, offerEurPerTco2e - fuelEuPoolBidPriceEurPerTco2e(offerEurPerTco2e));
}
