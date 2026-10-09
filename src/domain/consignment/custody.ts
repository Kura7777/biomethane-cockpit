import { Market } from '../markets/types';
import { isGoTransferMarket } from '../eligibility/gates/registry-transfer';
import { getAssumption } from '../assumptions/registry';
import { Claims, CustodyPack, DealStructure, GoRecord, PosRecord } from './types';
import { ParsedPoSCertificate } from './posParser';

/**
 * Helpers for the chain-of-custody pack the Trade Builder form edits. The pack is optional on a
 * Consignment: no pack means "nothing entered yet", which the checklist reads as TODOs.
 */

/** Which parts of the pack a market asks for. */
export interface CustodyParts {
  /** Both documents for the same MWh (NL GGE). */
  paired: boolean;
  go: boolean;
  pos: boolean;
}

export function custodyPartsForMarket(market: Market): CustodyParts {
  if (market.requiresGoAndPos) return { paired: true, go: true, pos: true };
  if (isGoTransferMarket(market)) return { paired: false, go: true, pos: false };
  return { paired: false, go: false, pos: true };
}

/** Desk default gas-leg structure (Pricing desk → Desk assumptions → NL GGE). */
export function defaultDealStructure(): DealStructure {
  return getAssumption('market.nl_gge.defaultStructureDeliveredTtf') >= 1 ? 'BUNDLE_DELIVERED_TTF' : 'BUNDLE_AT_ORIGIN';
}

export function emptyClaims(): Claims {
  return { notUsedElsewhere: null, prtrGrant: 'UNKNOWN', prtrLegalCheckDone: false, ownTraderCertified: null, counterpartyCertified: null };
}

export function emptyGoRecord(originCountry: string): GoRecord {
  return {
    registry: '',
    issuingCountry: originCountry,
    seriesNumber: '',
    issueDate: '',
    productionStart: '',
    productionEnd: '',
    energyMWh: null,
    energyBasis: 'UNKNOWN',
    supportType: 'UNKNOWN',
    gridInjected: null,
  };
}

export function emptyPosRecord(): PosRecord {
  return {
    posNumber: null,
    udbNumber: null,
    scheme: null,
    feedstock: null,
    feedstockOriginCountry: null,
    feedstockShares: [],
    ciTotal: null,
    ciSteps: null,
    supportDeclared: 'UNKNOWN',
    mwh: null,
  };
}

export function emptyCustodyPack(): CustodyPack {
  return { go: null, pos: null, claims: emptyClaims(), structure: defaultDealStructure(), plannedBookingDate: null };
}

/** The PoS record an uploaded certificate states; whatever the text does not state stays null. */
export function posRecordFromParsed(parsed: ParsedPoSCertificate): PosRecord {
  const c = parsed.custody;
  return {
    posNumber: c.posNumber,
    udbNumber: c.udbNumber,
    scheme: c.scheme,
    feedstock: c.feedstock,
    feedstockOriginCountry: c.feedstockOriginCountry,
    feedstockShares: c.feedstockShares,
    ciTotal: c.ciTotal,
    ciSteps: c.ciSteps,
    supportDeclared: c.supportDeclared ?? 'UNKNOWN',
    mwh: c.mwh,
  };
}

/** Which PoS fields are still empty, in the order the form lists them (for "enter manually" hints). */
export function missingPosFields(pos: PosRecord | null): string[] {
  if (!pos) return ['PoS number', 'scheme', 'feedstock', 'feedstock origin', 'CI total', 'support declared', 'MWh'];
  const out: string[] = [];
  if (!pos.posNumber && !pos.udbNumber) out.push('PoS number');
  if (!pos.scheme) out.push('scheme');
  if (!pos.feedstock) out.push('feedstock');
  if (!pos.feedstockOriginCountry) out.push('feedstock origin');
  if (pos.ciTotal === null) out.push('CI total');
  if (pos.supportDeclared === 'UNKNOWN') out.push('support declared');
  if (pos.mwh === null) out.push('MWh');
  return out;
}
