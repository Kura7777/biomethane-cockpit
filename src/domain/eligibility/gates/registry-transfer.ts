import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName, GateVerdict, LegalCitation } from '../types';
import { getGoRoute, ROUTE_AUDIT_ACCESSED } from '../../routes';
import { HUB_MEMBERSHIP, type HubSource } from '../../registries/hubConnectivity';

const GATE: GateName = 'REGISTRY_TRANSFER';
const LABEL = 'Registry transfer';

/**
 * Hub connectivity governs GO (book-and-claim) markets only. Compliance markets trade PoS on
 * mass balance and never move through GO hubs; ETS zero-rating is not a GO registry transfer.
 */
export function isGoTransferMarket(market: Market): boolean {
  return market.requiresGoAndPos === true || (market.acceptsBookAndClaim === true && market.id !== 'VOL_EU_ETS');
}

function toCitations(sources: HubSource[]): LegalCitation[] {
  return sources.map(s => ({
    shortName: s.claim,
    fullReference: s.claim,
    establishes: s.claim,
    sourceUrl: s.url,
    verifiedDate: s.accessed ?? null,
  }));
}

function normIso(iso: string | undefined | null): string {
  const u = (iso || '').toUpperCase();
  return u === 'UK' ? 'GB' : u;
}

function result(
  verdict: GateVerdict,
  reason: string,
  remedy: string | null,
  sources: HubSource[],
  confidence: 'HIGH' | 'MEDIUM' | 'LOW',
): GateResult {
  return { gate: GATE, gateLabel: LABEL, verdict, reason, remedy, citations: toCitations(sources), confidence };
}

export function evaluateRegistryTransferGate(consignment: Consignment, market: Market): GateResult | null {
  if (!isGoTransferMarket(market)) return null;

  const origin = normIso(consignment.injectionCountry || consignment.originCountry);
  const target = normIso(market.country);
  const mo = HUB_MEMBERSHIP[origin];

  // EU-wide GO markets
  if (target === 'EU') {
    if (market.id === 'AIB_GO') {
      if (!mo) {
        return result('UNRESOLVED', `No registry research for ${origin || 'the origin country'} yet, so AIB gas-hub access is unconfirmed.`, 'Confirm the origin registry is gas-connected to AIB before contracting.', [], 'MEDIUM');
      }
      if (mo.aib === 'CONNECTED' && !mo.aibImportOnly) {
        return result('PASS', `${mo.registry} is gas-connected to the AIB hub, so its GOs can be traded into the AIB market.`, null, mo.sources, 'HIGH');
      }
      if (mo.aib === 'CONNECTED' && mo.aibImportOnly) {
        return result('HARD_BLOCK', `${mo.registry} is connected to AIB for gas imports only, with no exports.`, 'Sell into a market the registry can export to, or trade PoS on mass balance.', mo.sources, 'HIGH');
      }
      if (mo.aib === 'APPLICANT') {
        return result(
          'HARD_BLOCK',
          `${mo.registry} is an AIB gas applicant since 17 Jun 2026, with no connection date published. It is not yet on the AIB gas hub.`,
          'No GO route until Energinet connects to the AIB gas hub. Sell into an ERGaR market instead (e.g. Germany via dena) or trade PoS on mass balance.',
          mo.sources,
          'HIGH',
        );
      }
      return result(
        'HARD_BLOCK',
        `${mo.registry} is not on the AIB gas hub, so its GOs cannot be sold into the AIB market.`,
        'Pick a destination on a hub the origin registry shares, or trade PoS on mass balance into a compliance market.',
        mo.sources,
        'HIGH',
      );
    }
    // Other EU voluntary GO market (e.g. Scope 1): any usable hub is enough.
    if (!mo) {
      return result('UNRESOLVED', `No registry research for ${origin || 'the origin country'} yet, so hub access is unconfirmed.`, 'Confirm which hub the origin registry sits on before contracting.', [], 'MEDIUM');
    }
    const aibExport = mo.aib === 'CONNECTED' && !mo.aibImportOnly;
    const ergar = mo.ergar && !mo.ergarExportUnconfirmed;
    if (aibExport || ergar) {
      const hubs = [aibExport ? 'AIB' : null, ergar ? 'ERGaR' : null].filter(Boolean).join(' and ');
      return result('PASS', `${mo.registry} is on ${hubs}, so its GOs can reach buyers in other registries.`, null, mo.sources, 'HIGH');
    }
    return result(
      'CONDITIONAL',
      `${mo.registry} is on no usable cross-border hub, so its GOs can only be cancelled domestically for a buyer in ${origin}.`,
      'Sell only to buyers who can cancel in the origin registry, or move to a country on AIB/ERGaR.',
      mo.sources,
      'MEDIUM',
    );
  }

  // Single-country GO markets
  if (origin === target) {
    const registry = mo?.registry ?? target;
    return result('PASS', `Domestic: GOs stay in the ${registry} registry — no cross-border transfer.`, null, mo?.sources ?? [], 'HIGH');
  }

  const route = getGoRoute(origin, target);
  const routeSources: HubSource[] = (route.sources ?? []).map(s => ({
    claim: s.quote ? `${s.claim} — "${s.quote}"` : s.claim,
    url: s.url,
    accessed: ROUTE_AUDIT_ACCESSED,
  })) as HubSource[];
  const q = route.openQuestionId ? ` Open question ${route.openQuestionId}.` : '';
  switch (route.status) {
    case 'POSSIBLE': {
      const conditions = route.conditions ?? [];
      if (conditions.length > 0) {
        return result('CONDITIONAL', route.reason, `Condition applies: ${conditions.join('; ')}`, routeSources, 'MEDIUM');
      }
      return result('PASS', route.reason, null, routeSources, route.grade === 'RULE' ? 'MEDIUM' : 'HIGH');
    }
    case 'NOT_POSSIBLE': {
      const remedy = route.workaround
        ? `Workaround: ${route.workaround}`
        : 'No shared registry hub and no usable ex-domain path. Trade PoS on mass balance into a compliance market, or pick a destination on the same hub.';
      return result('HARD_BLOCK', route.reason, remedy, routeSources, 'HIGH');
    }
    default:
      return result(
        'UNRESOLVED',
        `${route.reason}${q}`,
        'Awaiting registry answer; confirm with both registries before contracting.',
        routeSources,
        'MEDIUM',
      );
  }
}
