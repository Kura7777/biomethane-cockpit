import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName, GateVerdict, LegalCitation } from '../types';
import { getPosRoute, ROUTE_AUDIT_ACCESSED, type RouteSource } from '../../routes';
import { isGoTransferMarket } from './registry-transfer';

const GATE: GateName = 'CROSS_BORDER_POS';
const LABEL = 'Cross-border PoS';

/**
 * App market id -> audited national scheme id (route audit of 2026-10-04).
 * Only markets with an audited scheme appear here. Markets without one (e.g. IE_RHO,
 * PT_EEGO, GO-only markets) are deliberately absent so the gate is omitted rather than invented.
 */
export const MARKET_TO_POS_SCHEME: Readonly<Record<string, string>> = {
  DE_THG: 'DE_THG',
  NL_ERE: 'NL_ERE',
  NL_GGE: 'NL_ERE',
  FR_TIRUERT: 'FR_TIRUERT',
  FR_CPB: 'FR_CPB',
  IT_CIC: 'IT_CIC',
  SE_TAX: 'SE_TAX',
  BE_TRANSPORT: 'BE_TRANSPORT',
  EE_TRANSPORT: 'EE_TRANSPORT',
  CZ_POZE: 'CZ_TRANSPORT',
  UK_RTFO: 'GB_RTFO',
  CH_VSG: 'CH_TAX_RELIEF',
  NO_STATNETT: 'NO_OMSETNINGSKRAV',
  AT_EGG: 'AT_KVO',
  FI_TRANSPORT: 'FI_JAKELUVELVOITE',
  PL_OZE: 'PL_NCW',
  LT_ALT_FUELS: 'LT_DAEI',
  HU_MEKH: 'HU_BUAT',
  SK_OKTE: 'SK_TRANSPORT',
  RO_TRANSGAZ: 'RO_TRANSPORT',
  BG_BULGARTRANSGAZ: 'BG_TRANSPORT',
  HR_PLINACRO: 'HR_TRANSPORT',
  SI_PLINOVODI: 'SI_TRANSPORT',
  GR_DESFA: 'GR_TRANSPORT',
  LV_CONEXUS: 'LV_TRANSPORT',
};

function normIso(iso: string | undefined | null): string {
  const u = (iso || '').toUpperCase();
  return u === 'UK' ? 'GB' : u;
}

function toCitations(sources: RouteSource[]): LegalCitation[] {
  return sources.map(s => ({
    shortName: s.claim,
    fullReference: s.quote ? `${s.claim} — "${s.quote}"` : s.claim,
    establishes: s.claim,
    sourceUrl: s.url,
    verifiedDate: ROUTE_AUDIT_ACCESSED,
  }));
}

/**
 * Cross-border mass-balance (PoS) eligibility for compliance markets, from the audited route matrix.
 * Omitted (null) for domestic trades, GO markets, and markets with no audited scheme.
 */
export function evaluateCrossBorderPosGate(consignment: Consignment, market: Market): GateResult | null {
  if (isGoTransferMarket(market) && !market.requiresGoAndPos) return null;
  const schemeId = MARKET_TO_POS_SCHEME[market.id];
  if (!schemeId) return null;

  const origin = normIso(consignment.injectionCountry || consignment.originCountry);
  const target = normIso(market.country);
  if (!origin || !target || origin === target) return null;

  const route = getPosRoute(origin, target, schemeId);
  const scheme = route.schemes[0];
  const reason = scheme?.reason ?? route.summary?.reason ?? `No audited PoS rule for ${origin}>${target}.`;
  const sources = scheme?.sources ?? [];
  const cond = scheme?.conditions ? ` Conditions: ${scheme.conditions}` : '';
  const q = scheme?.openQuestionId ? ` (open question ${scheme.openQuestionId})` : '';

  let verdict: GateVerdict;
  let remedy: string | null = null;
  let text = reason;
  switch (route.status) {
    case 'POSSIBLE':
      verdict = scheme?.conditions ? 'CONDITIONAL' : 'PASS';
      text = `${reason}${cond}`;
      break;
    case 'NOT_POSSIBLE':
      verdict = 'HARD_BLOCK';
      remedy = 'Deliver into a market whose scheme accepts this origin, or place the volume domestically.';
      break;
    default:
      verdict = 'UNRESOLVED';
      text = `${reason}${q}`;
      remedy = 'Confirm with the competent authority before contracting.';
  }

  return {
    gate: GATE,
    gateLabel: LABEL,
    verdict,
    reason: text,
    remedy,
    citations: toCitations(sources),
    confidence: route.status === 'OPEN' ? 'MEDIUM' : 'HIGH',
  };
}
