import { getPosRoute } from '../../domain/routes';
import { POSSIBLE_STATUSES, type CertificateRoute } from '../../domain/registries/certificateRoutes';
import { buildDealUrl } from '../../domain/trade/dealParams';
import {
  getMarketAndCocForRoute,
  defaultVolumeMwh,
  defaultCi,
  plantDealParams,
  type RouteCertFilter,
} from '../../domain/trade/dealDefaults';
import type { BiomethanePlant } from '../../domain/plants/types';

export type TradeArchetype = 'BOTH' | 'CERT_ONLY' | 'POS_ONLY' | 'CHECK_FIRST' | 'CLOSED' | 'NO_DATA';

export interface TradePlaybookDetails {
  archetype: TradeArchetype;
  badge: string;
  chipClass: string;
  isTradeable: boolean;
  structureTitle: string;
  structureDesc: string;
  schemeTitle: string;
  schemeDesc: string;
  executionTitle: string;
  executionDesc: string;
  defaultCoc: 'BOOK_AND_CLAIM' | 'MASS_BALANCE';
  dealUrl?: string | null;
}

/**
 * Builds the canonical Trade Builder link for a corridor from audited route data,
 * matching market, chain of custody (GO -> BOOK_AND_CLAIM, PoS -> MASS_BALANCE),
 * and calibrated volume and CI from dealDefaults.
 *
 * When `plant` is given (the map was reached from a specific plant via Plants/Origination),
 * the link carries that plant's own name, feedstock, CI and volume (plantDealParams) instead of
 * the generic no-plant default. With no plant, the corridor defaults to manure at the feedstock's
 * flat default CI — callers must label this as a default, not an audited value.
 */
export function getPlaybookDealUrl(
  originIso: string,
  targetIso: string,
  r: CertificateRoute | undefined,
  filter: RouteCertFilter = 'ALL',
  plant?: BiomethanePlant | null,
): string | null {
  if (!r) return null;
  const target = getMarketAndCocForRoute(r, filter);
  if (!target) return null;
  if (plant) {
    return buildDealUrl({
      ...plantDealParams(plant),
      marketId: target.marketId,
      coc: target.coc,
    });
  }
  const ciData = defaultCi(originIso, 'manure');
  return buildDealUrl({
    originCountry: originIso,
    marketId: target.marketId,
    coc: target.coc,
    volume: defaultVolumeMwh(),
    ci: ciData.ci,
    ciIsEstimated: true,
    feedstock: 'manure',
  });
}

export function getTradePlaybook(originIso: string, targetIso: string, r: CertificateRoute | undefined): TradePlaybookDetails {
  if (!r) {
    return {
      archetype: 'NO_DATA',
      badge: 'Unresearched',
      chipClass: '',
      isTradeable: false,
      structureTitle: 'No verified corridor data',
      structureDesc: `No audited regulatory records found for ${originIso} ➔ ${targetIso}.`,
      schemeTitle: 'None',
      schemeDesc: 'National schemes unconfirmed.',
      executionTitle: 'Not Available',
      executionDesc: 'Corridor data unavailable.',
      defaultCoc: 'BOOK_AND_CLAIM',
      dealUrl: null,
    };
  }

  const dealUrl = getPlaybookDealUrl(originIso, targetIso, r);
  const goPossible = POSSIBLE_STATUSES.includes(r.status);
  const posPossible = r.pos?.status === 'POSSIBLE';
  const posRoute = getPosRoute(originIso, targetIso);
  const possibleSchemes = (posRoute.schemes || []).filter(s => s.status === 'POSSIBLE');
  const posSchemes = possibleSchemes.length > 0
    ? possibleSchemes.map(s => s.schemeName).join(' / ')
    : (r.pos?.schemeName || 'National Transport Scheme');

  const requiresCapacityBooking = possibleSchemes.some(s =>
    /capacit(y|ies)|book|nominat/i.test(`${s.conditions || ''} ${s.reason || ''}`)
  );
  const bookingScheme = possibleSchemes.find(s =>
    /capacit(y|ies)|book|nominat/i.test(`${s.conditions || ''} ${s.reason || ''}`)
  )?.schemeName;

  const posExecutionDesc = requiresCapacityBooking
    ? `Required by ${bookingScheme || posSchemes}: book and nominate capacity. Mass balance through the interconnected grid, recorded in the UDB.`
    : 'Mass balance through the interconnected grid, recorded in the UDB. Physical capacity booking only if the destination scheme requires it.';

  if (goPossible && posPossible) {
    const hubs = r.hubs.length > 0 ? r.hubs.join(' / ') : 'Registry Hub';
    const bothExecutionDesc = requiresCapacityBooking
      ? `Per MWh, choose one: sell the GO on its own via ${hubs}, or deliver the gas with a PoS into ${posSchemes} (Required by ${bookingScheme || posSchemes}: book and nominate capacity). Never both on the same MWh — that is double counting.`
      : `Per MWh, choose one: sell the GO on its own via ${hubs}, or deliver the gas with a PoS into ${posSchemes} (mass balance through the interconnected grid, recorded in the UDB; physical capacity booking only if the destination scheme requires it). Never both on the same MWh — that is double counting.`;

    return {
      archetype: 'BOTH',
      badge: 'Both: Certificates + Physical PoS',
      chipClass: 'chip-pass',
      isTradeable: true,
      structureTitle: 'Dual Option: Book & Claim or Mass Balance',
      structureDesc: `Per MWh, choose one: sell the GO on its own, or deliver the gas with a PoS into ${posSchemes}. Never both on the same MWh — that is double counting.`,
      schemeTitle: `${posSchemes} / Voluntary claims / green-gas tariffs`,
      schemeDesc: `Eligible for compliance quota in ${targetIso} or voluntary green gas claims (not valid evidence under EU ETS; Scope 1 depends on buyer framework).`,
      executionTitle: `Electronic Transfer (${hubs}) or Interconnected Grid Delivery`,
      executionDesc: bothExecutionDesc,
      defaultCoc: 'MASS_BALANCE',
      dealUrl,
    };
  }

  if (goPossible && !posPossible) {
    const hubs = r.hubs.length > 0 ? r.hubs.join(' / ') : 'Registry Hub';
    return {
      archetype: 'CERT_ONLY',
      badge: 'Certificates Only (Book & Claim)',
      chipClass: 'chip-pass',
      isTradeable: true,
      structureTitle: 'Book & Claim Electronic Transfer (GOs)',
      structureDesc: 'Certificates can be sold and transferred electronically without moving physical gas or booking pipeline capacity.',
      schemeTitle: 'Voluntary claims / green-gas tariffs',
      schemeDesc: `Accepted in ${targetIso} for voluntary consumer green gas or corporate reporting (Scope 1 recognition depends on the buyer's reporting framework; not valid under EU ETS).`,
      executionTitle: `Registry Account Transfer via ${hubs}`,
      executionDesc: `Initiate electronic cancellation or transfer in national registry to ${targetIso} counterpart.`,
      defaultCoc: 'BOOK_AND_CLAIM',
      dealUrl,
    };
  }

  if (!goPossible && posPossible) {
    const schemeDetailDesc = possibleSchemes.length > 0
      ? possibleSchemes.map(s => `${s.schemeName}${s.legalBasis ? ` (${s.legalBasis})` : ''}${s.conditions && s.conditions !== 'None' ? ` — Conditions: ${s.conditions}` : ''}`).join('; ')
      : `${posSchemes} in ${targetIso}`;

    return {
      archetype: 'POS_ONLY',
      badge: 'Compliance Quota Only (PoS / Mass Balance)',
      chipClass: 'chip-pass',
      isTradeable: true,
      structureTitle: 'Physical Gas Delivery + Sustainability Proof (PoS)',
      structureDesc: 'Physical biomethane delivered via interconnected gas grid. Certificates remain bound to the gas parcel.',
      schemeTitle: `${posSchemes} Compliance`,
      schemeDesc: schemeDetailDesc,
      executionTitle: 'Interconnected Grid Delivery + PoS',
      executionDesc: posExecutionDesc,
      defaultCoc: 'MASS_BALANCE',
      dealUrl,
    };
  }

  if (r.workaround || r.status === 'AWAITING_REGISTRY' || r.pos?.status === 'OPEN') {
    return {
      archetype: 'CHECK_FIRST',
      badge: 'Requires Workaround / Review',
      chipClass: 'chip-warn',
      isTradeable: false,
      structureTitle: 'Conditional Transfer / Ex-Domain Cancellation',
      structureDesc: r.workaround || 'Standard electronic transfer not established; requires manual counterparty confirmation.',
      schemeTitle: posSchemes,
      schemeDesc: r.pos?.reason || r.reason,
      executionTitle: 'Ex-Domain Cancellation or Bilateral Contract',
      executionDesc: 'Cancel certificate in origin registry explicitly for beneficiary in destination, subject to local regulator acceptance.',
      defaultCoc: 'BOOK_AND_CLAIM',
      dealUrl: null,
    };
  }

  return {
    archetype: 'CLOSED',
    badge: 'Domestic Market Only / Closed',
    chipClass: '',
    isTradeable: false,
    structureTitle: 'Foreign Imports Excluded by Law',
    structureDesc: r.pos?.reason || r.reason || 'Domestic regulations prohibit imported biomethane from claiming national subsidies.',
    schemeTitle: posSchemes,
    schemeDesc: r.pos?.reason || 'Restricted to domestic grid injection.',
    executionTitle: 'No Statutory Corridor Available',
    executionDesc: 'Trade cannot be settled under current legal framework.',
    defaultCoc: 'BOOK_AND_CLAIM',
    dealUrl: null,
  };
}
