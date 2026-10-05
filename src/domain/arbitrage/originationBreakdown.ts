import type { CostInputs, GasIndexMark, MarksState } from '../netback/types';
import { selectMarkPrice, isAllInMarket } from '../netback/engine';
import { SIMULATED_SOURCE_NAME } from '../marks/simulate';
import { priceSourceForMark, type PriceSource } from '../marks/markSource';
import { markSideWarning } from '../netback/sideFallback';

import type { ArbitrageOpportunity } from './types';

export type { PriceSource };

/**
 * One derivation of the Origination cost / revenue breakdown, used by Step 3 and Step 4 so the
 * two screens can never disagree. Every price comes from the marks store (gas index) or the cost
 * inputs (certification) and carries its source. Nothing here falls back to a typed-in number:
 * a missing mark gives `null`, and the screen shows "—" / "Not set".
 */

export interface BreakdownOpportunity {
  targetMarketId?: string;
  producerPayableEurPerMWh: ArbitrageOpportunity['producerPayableEurPerMWh'];
  transitCostEurPerMWh: ArbitrageOpportunity['transitCostEurPerMWh'];
  totalTerminalValueStackEurPerMWh: ArbitrageOpportunity['totalTerminalValueStackEurPerMWh'];
  deskNetMarginEurPerMWh: ArbitrageOpportunity['deskNetMarginEurPerMWh'];
  totalDealProfitEur: ArbitrageOpportunity['totalDealProfitEur'];
  bundleReference?: ArbitrageOpportunity['bundleReference'];
  netbackCappedAt?: ArbitrageOpportunity['netbackCappedAt'];
  theoreticalNetbackEurPerMWh?: ArbitrageOpportunity['theoreticalNetbackEurPerMWh'];
  certSideRequested?: ArbitrageOpportunity['certSideRequested'];
  certSideUsed?: ArbitrageOpportunity['certSideUsed'];
}

export interface OriginationBreakdownInput {
  opportunity: BreakdownOpportunity;
  volumeMwh: number;
  /** state.marks: the gas index and the pricing side the netback engine used for the molecule. */
  marks: Pick<MarksState, 'gasIndex' | 'pricingSides'>;
  /** state.costs: certificationCosts is €/MWh or null when not set. */
  costs: Pick<CostInputs, 'certificationCosts' | 'producerPricing'>;
}

export interface OriginationBreakdown {
  plantGateEur: number;
  gridLogisticsEur: number;
  /** null = not set; then it is excluded from the delivered cost total. */
  certificationEur: number | null;
  certificationSource: PriceSource | null;
  totalDeliveredCostEur: number;
  /** True when certification is not in the delivered cost total. */
  deliveredCostExclCertification: boolean;

  /** Market revenue per MWh. With a broker bundle: the broker certificate price plus the gas index. */
  grossRevenueEur: number | null;
  /**
   * Set when the certificate is the broker's certificate-only bundle price (DE THG manure). The
   * certificate line is then that mark, with its own source tag, and TTF is added on top.
   */
  brokerBundle: {
    certificateEurPerMwh: number;
    year: number | null;
    source: PriceSource;
    /** Netback (after costs) the modelled quota value would have given, for context. */
    modelledNetbackEurPerMwh: number | null;
  } | null;
  /**
   * Set when the netback was held to an observed or unsourced desk all-in price (not a broker price).
   * Never set for a broker bundle.
   */
  netbackCapped: { capEurPerMwh: number; theoreticalEurPerMwh: number | null; kind: 'OBSERVED_ALL_IN' | 'DESK_ESTIMATE_ALL_IN' } | null;
  /** TTF at the engine's molecule side; null when no gas index mark is loaded. */
  gasIndexEur: number | null;
  gasIndexSide: 'bid' | 'offer' | 'mid';
  gasIndexSource: PriceSource | null;
  /** True when there is no TTF mark: the netback engine then values the gas molecule at nothing, so revenue excludes it. */
  revenueExclMolecule: boolean;
  /** Gross revenue minus the TTF mark; null when either is missing. Never floored at 0. */
  certificateValueEur: number | null;

  /**
   * How the desk margin was split from the netback:
   *  PRODUCER_SHARE - an index-linked producer share is set, so margin = (1 - share) of the stack after transit.
   *  DESK_POLICY    - no share set, so the desk-policy split applies (origination.deskTake* assumptions).
   */
  marginSplit: 'PRODUCER_SHARE' | 'DESK_POLICY';

  netMarginEurPerMwh: number | null;
  totalDealProfitEur: number | null;
  totalDealCostEur: number;
  totalDealRevenueEur: number | null;
  isProfitable: boolean;
  volumeMwh: number;
  /** "No bid quoted, priced off the offer" when the certificate side asked for was not quoted; null otherwise. */
  sideWarning: string | null;
}

/** Source of the gas index mark, tagged exactly as the Pricing desk tags it. */
export function gasIndexSource(gasIndex: GasIndexMark): PriceSource {
  return priceSourceForMark(gasIndex.provenance, gasIndex.updatedAt);
}

/**
 * Source of the certification cost. Cost inputs carry no per-field provenance, so the best
 * available evidence is the cost bundle's own source: the simulator stamps it SIMULATED.
 * Anything else was typed in by the desk. Editing a single simulated cost does not yet record
 * that it changed, so the tag is conservative only in the simulated direction.
 */
export function certificationSource(costs: Pick<CostInputs, 'producerPricing'>): PriceSource {
  const simulated = costs.producerPricing?.source === SIMULATED_SOURCE_NAME;
  return {
    badge: simulated
      ? { label: 'Simulated', variant: 'WARNING' }
      : { label: 'Manual', variant: 'NEUTRAL' },
    asOf: null,
  };
}

export function computeOriginationBreakdown(input: OriginationBreakdownInput): OriginationBreakdown {
  const { opportunity: opp, volumeMwh: vol, marks, costs } = input;
  const gasIndex = marks.gasIndex;
  const moleculeSide = marks.pricingSides?.moleculeSide ?? 'bid';

  const plantGateEur = opp.producerPayableEurPerMWh ?? 0;
  const gridLogisticsEur = opp.transitCostEurPerMWh ?? 0;
  const certificationEur = costs.certificationCosts;
  const totalDeliveredCostEur = plantGateEur + gridLogisticsEur + (certificationEur ?? 0);

  const gasIndexEur = selectMarkPrice(gasIndex, moleculeSide);

  // A broker bundle quote is for certificates only; the gas index comes on top (broker run footnote).
  const ref = opp.bundleReference ?? null;
  const bundleBinds = ref?.kind === 'BROKER_CERTIFICATE' && opp.netbackCappedAt !== null && opp.netbackCappedAt !== undefined;
  const brokerBundle = ref && bundleBinds
    ? {
        certificateEurPerMwh: ref.valueEurPerMwh,
        year: ref.year,
        source: priceSourceForMark(ref.provenance, null),
        modelledNetbackEurPerMwh: opp.theoreticalNetbackEurPerMWh ?? null,
      }
    : null;

  const isAllIn = opp.targetMarketId ? isAllInMarket(opp.targetMarketId) : false;

  const grossRevenueEur = brokerBundle
    ? brokerBundle.certificateEurPerMwh + (gasIndexEur ?? 0)
    : opp.totalTerminalValueStackEurPerMWh;
  const certificateValueEur = brokerBundle
    ? brokerBundle.certificateEurPerMwh
    : isAllIn
      ? grossRevenueEur
      : (gasIndexEur !== null && grossRevenueEur !== null ? grossRevenueEur - gasIndexEur : null);

  const netMarginEurPerMwh =
    opp.deskNetMarginEurPerMWh ?? (grossRevenueEur !== null ? grossRevenueEur - totalDeliveredCostEur : null);
  const totalDealProfitEur =
    opp.totalDealProfitEur ?? (netMarginEurPerMwh !== null ? netMarginEurPerMwh * vol : null);

  return {
    plantGateEur,
    gridLogisticsEur,
    certificationEur,
    certificationSource: certificationEur === null ? null : certificationSource(costs),
    totalDeliveredCostEur,
    deliveredCostExclCertification: certificationEur === null,
    grossRevenueEur,
    brokerBundle,
    netbackCapped:
      !brokerBundle && ref && ref.kind !== 'BROKER_CERTIFICATE' && opp.netbackCappedAt !== null && opp.netbackCappedAt !== undefined
        ? { capEurPerMwh: opp.netbackCappedAt, theoreticalEurPerMwh: opp.theoreticalNetbackEurPerMWh ?? null, kind: ref.kind }
        : null,
    gasIndexEur: isAllIn ? null : gasIndexEur,
    gasIndexSide: moleculeSide,
    gasIndexSource: (isAllIn || gasIndexEur === null) ? null : gasIndexSource(gasIndex),
    certificateValueEur,
    revenueExclMolecule: isAllIn ? false : gasIndexEur === null,
    marginSplit:
      costs.producerPricing?.mode === 'INDEX_LINKED' && costs.producerPricing.indexLinkedShare !== null
        ? 'PRODUCER_SHARE'
        : 'DESK_POLICY',
    netMarginEurPerMwh,
    totalDealProfitEur,
    totalDealCostEur: totalDeliveredCostEur * vol,
    totalDealRevenueEur: grossRevenueEur !== null ? grossRevenueEur * vol : null,
    isProfitable: (netMarginEurPerMwh ?? 0) > 0,
    volumeMwh: vol,
    sideWarning: markSideWarning(opp.certSideRequested, opp.certSideUsed),
  };
}

/** Per-MWh money text; "—" for a missing value (never a made-up figure). */
export function fmtEurPerMwh(v: number | null | undefined, digits = 2): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : `€${v.toFixed(digits)}/MWh`;
}

/** Whole-euro total text; "—" for a missing value. */
export function fmtEurTotal(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : `€${Math.round(v).toLocaleString()}`;
}

/** "TTF mark as of 2026-10-05", or the honest "no TTF mark" line. */
export function ttfMarkLine(b: Pick<OriginationBreakdown, 'gasIndexEur' | 'gasIndexSource'>): string {
  if (b.gasIndexEur === null || !b.gasIndexSource) return 'No TTF mark loaded';
  const { badge, asOf } = b.gasIndexSource;
  return `TTF mark as of ${asOf ?? 'unknown date'} (${badge.label})`;
}
