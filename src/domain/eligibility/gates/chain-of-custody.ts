import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName, GateVerdict, GateChecklistItem, GateChecklistStatus, LegalCitation } from '../types';
import { CITATIONS } from '../citations';
import { getGoRoute } from '../../routes';
import { evaluateUDBGate } from './udb';
import { evaluateRegistryTransferGate, isGoTransferMarket } from './registry-transfer';
import { evaluateCrossBorderPosGate } from './cross-border-pos';
import { evaluateSchemeGate } from './scheme';
import { getAssumption, getLhvFactorForOrigin } from '../../assumptions/registry';
import {
  NL_GGE_BOOKING_DEADLINE_MONTH_DAY,
  NL_GGE_GO_VALIDITY_MONTHS,
  RED_HEAT_THRESHOLD_POST_2021,
  RED_HEAT_THRESHOLD_POST_2026,
} from '../../regulatory/constants';
import { CI_COMPARATOR_HEAT } from '../../markets/constants';

const GATE: GateName = 'CHAIN_OF_CUSTODY';
const GATE_LABEL = 'Chain of Custody';

/**
 * One Chain-of-custody check per deal. The UDB, cross-border PoS and registry-transfer gates are
 * folded in as checklist items; their evaluators stay as helpers (and keep their own behaviour).
 *
 * Gate verdict: worst item wins — FAIL → HARD_BLOCK; an item taken from a helper keeps that
 * helper's UNRESOLVED / UNKNOWN; WARN / TODO → CONDITIONAL; otherwise PASS.
 */

function normIso(iso?: string | null): string {
  const u = (iso || '').toUpperCase();
  return u === 'UK' ? 'GB' : u;
}

const EU_EEA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
]);

const VERDICT_RANK: Record<GateVerdict, number> = { PASS: 0, CONDITIONAL: 1, UNKNOWN: 2, UNRESOLVED: 3, HARD_BLOCK: 4 };

const STATUS_VERDICT: Record<GateChecklistStatus, GateVerdict> = {
  PASS: 'PASS', WARN: 'CONDITIONAL', TODO: 'CONDITIONAL', FAIL: 'HARD_BLOCK',
};

/** A checklist row plus the verdict it contributes (a folded helper can contribute UNRESOLVED / UNKNOWN). */
interface Entry {
  item: GateChecklistItem;
  verdict: GateVerdict;
  confidence: GateResult['confidence'];
  /** Advisory rows are shown but never move the gate verdict. */
  advisory?: boolean;
}

function entry(
  id: string,
  label: string,
  status: GateChecklistStatus,
  detail: string,
  citations: LegalCitation[],
  remedy: string | null = null,
): Entry {
  return { item: { id, label, status, detail, citations, remedy }, verdict: STATUS_VERDICT[status], confidence: 'HIGH' };
}

function statusOf(verdict: GateVerdict): GateChecklistStatus {
  if (verdict === 'HARD_BLOCK') return 'FAIL';
  if (verdict === 'CONDITIONAL') return 'WARN';
  if (verdict === 'PASS') return 'PASS';
  return 'TODO';
}

/** Folds a helper gate result into a checklist row, keeping its verdict, reason, remedy and sources. */
function fromGate(id: string, label: string, g: GateResult): Entry {
  return {
    item: { id, label, status: statusOf(g.verdict), detail: g.reason, citations: g.citations, remedy: g.remedy },
    verdict: g.verdict,
    confidence: g.confidence,
  };
}

function worse(a: Entry, b: Entry): Entry {
  return VERDICT_RANK[b.verdict] > VERDICT_RANK[a.verdict] ? b : a;
}

function result(entries: Entry[], passReason: string, citations: LegalCitation[]): GateResult {
  const counted = entries.filter(e => !e.advisory);
  const decisive = counted.reduce<Entry | null>((acc, e) => (acc ? worse(acc, e) : e), null);
  const checklist = entries.map(e => e.item);

  if (!decisive || decisive.verdict === 'PASS') {
    return { gate: GATE, gateLabel: GATE_LABEL, verdict: 'PASS', reason: passReason, remedy: null, citations, confidence: 'HIGH', checklist };
  }

  const open = counted.filter(e => e.verdict !== 'PASS').map(e => e.item.label);
  const remedy = decisive.item.remedy
    ?? (decisive.verdict === 'HARD_BLOCK' ? `Resolve: ${decisive.item.label}.` : `Still to clear: ${open.join(', ')}.`);
  return {
    gate: GATE,
    gateLabel: GATE_LABEL,
    verdict: decisive.verdict,
    reason: decisive.item.detail,
    remedy,
    citations: decisive.item.citations.length > 0 ? decisive.item.citations : citations,
    confidence: decisive.confidence,
    checklist,
  };
}

/** Chain-of-custody model row: book-and-claim only where the market accepts it (RED III Art 30). */
function cocModelEntry(consignment: Consignment, market: Market): Entry {
  const coc = consignment.chainOfCustody;
  const label = 'Chain of custody model';
  if (coc === 'MASS_BALANCE') {
    return entry('coc-model', label, 'PASS', 'Mass balance: the physical gas is tracked through the interconnected gas grid with mass balance accounting.', [CITATIONS.RED_III_CHAIN_OF_CUSTODY]);
  }
  if (coc === 'SEGREGATION') {
    return entry('coc-model', label, 'PASS', 'Physical segregation exceeds RED III requirements. The biomethane is kept separate from conventional gas throughout the supply chain.', [CITATIONS.RED_III_CHAIN_OF_CUSTODY]);
  }
  if (coc === 'BOOK_AND_CLAIM') {
    if (market.acceptsBookAndClaim) {
      return entry('coc-model', label, 'PASS', `${market.name} accepts book-and-claim chain of custody. The environmental attributes are traded separately from the physical gas molecule.`, []);
    }
    return entry(
      'coc-model', label, 'FAIL',
      `Book-and-claim chain of custody does not meet RED III requirements for ${market.name}. All transport compliance markets, FuelEU Maritime, and EU ETS require mass balance or physical segregation — the physical gas must be trackable through the grid.`,
      [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
      'Switch to mass balance chain of custody. This requires the physical gas to be injected into the interconnected gas grid with mass balance accounting at the injection point.',
    );
  }
  return { ...entry('coc-model', label, 'TODO', `Unknown chain of custody model: ${coc}.`, []), verdict: 'UNKNOWN', confidence: 'LOW' };
}

function addMonthsIso(isoDate: string, months: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

/**
 * Last day a GO + PoS can be booked in the NEa GGE register: the earlier of GO expiry
 * (production end + 12 months, R9; for Spain also the Enagás export window, S5) and
 * 1 May of the year after delivery (R10).
 */
export function ggeEffectiveBookingDeadline(productionEnd: string, deliveryYear: number): string {
  const goExpiry = addMonthsIso(productionEnd, NL_GGE_GO_VALIDITY_MONTHS);
  const bookingWindowEnd = `${deliveryYear + 1}-${NL_GGE_BOOKING_DEADLINE_MONTH_DAY}`;
  return goExpiry < bookingWindowEnd ? goExpiry : bookingWindowEnd;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Paired GO + PoS markets (requiresGoAndPos, e.g. NL_GGE)
// ---------------------------------------------------------------------------
function pairedChecklist(consignment: Consignment, market: Market): GateResult {
  const origin = normIso(consignment.injectionCountry || consignment.originCountry);
  const custody = consignment.custody ?? null;
  const go = custody?.go ?? null;
  const pos = custody?.pos ?? null;
  const claims = custody?.claims ?? null;
  const target = normIso(market.country);
  const entries: Entry[] = [];

  // 1. Origin in EU/EEA (R24)
  entries.push(EU_EEA_COUNTRIES.has(origin)
    ? entry('origin-eu-eea', 'Origin in EU/EEA', 'PASS', `Produced and injected in ${origin}, inside the EU/EEA (R24).`, [CITATIONS.NL_GGE_TK_VERSLAG])
    : entry('origin-eu-eea', 'Origin in EU/EEA', 'FAIL', `Origin ${origin || 'unknown'} is outside the EU/EEA; only EU/EEA biomethane counts for the GGE obligation (R24).`, [CITATIONS.NL_GGE_TK_VERSLAG], 'Source from an EU/EEA plant injecting into the EU grid.'));

  // 2. GO route via the AIB hub (R8, S1)
  if (origin === target) {
    entries.push(entry('go-route-nl', 'GO route to NL (AIB)', 'PASS', 'Domestic Dutch GvO in VertiCer; transfer to the NEa account (R8).', [CITATIONS.NL_GGE_DRAFT_BESLUIT]));
  } else {
    const route = getGoRoute(origin, target);
    if (route.status === 'POSSIBLE') {
      entries.push(entry('go-route-nl', 'GO route to NL (AIB)', 'PASS', `GOs move ${origin} → ${target} via the AIB hub into VertiCer (R8, S1).`, [CITATIONS.NL_GGE_DRAFT_BESLUIT]));
    } else if (route.status === 'NOT_POSSIBLE') {
      entries.push(entry('go-route-nl', 'GO route to NL (AIB)', 'FAIL', `No GO route ${origin} → ${target}: the origin registry cannot transfer GOs into VertiCer via the AIB hub, so the GGE booking (GO + PoS) is impossible (R5, R8).`, [CITATIONS.NL_GGE_DRAFT_BESLUIT], 'Source from an AIB-connected origin (e.g. Spain) or a Dutch plant.'));
    } else {
      entries.push(entry('go-route-nl', 'GO route to NL (AIB)', 'WARN', `GO route ${origin} → ${target} is not confirmed (${route.status}); check the registry connection before contracting (R8).`, [CITATIONS.NL_GGE_DRAFT_BESLUIT]));
    }
  }

  // 3. Certified chain: EC-recognised scheme + own and counterparty trader certified (R13, R16)
  const certLabel = 'Certified chain (scheme + traders)';
  const schemeGate = evaluateSchemeGate({ ...consignment, certificationScheme: (pos?.scheme || consignment.certificationScheme) as Consignment['certificationScheme'] }, market);
  const certCitations = [CITATIONS.NL_GGE_DRAFT_REGELING, ...schemeGate.citations];
  if (schemeGate.verdict === 'HARD_BLOCK') {
    const folded = fromGate('certified-chain', certLabel, schemeGate);
    entries.push({ ...folded, item: { ...folded.item, citations: certCitations } });
  } else if (claims?.ownTraderCertified === false || claims?.counterpartyCertified === false) {
    entries.push(entry('certified-chain', certLabel, 'FAIL', 'Every link in the chain must be a certified economic operator under an EC-recognised scheme; the supplier issues its PoS from the previous link’s PoS (R13, R16).', certCitations, 'Get the uncertified trader certified (ISCC EU / REDcert-EU) or trade through a certified entity.'));
  } else if (claims?.ownTraderCertified == null || claims?.counterpartyCertified == null) {
    entries.push(entry('certified-chain', certLabel, 'TODO', 'Confirm our own and the counterparty’s scheme certification (certified economic operators) (R13, R16).', certCitations));
  } else {
    entries.push(entry('certified-chain', certLabel, 'PASS', `${schemeGate.reason} Own trader and counterparty certified (R13, R16).`, certCitations));
  }

  // 4. GO + PoS paired on the same MWh and period (R5–R7)
  const pairCites = [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_DRAFT_REGELING, CITATIONS.EU_IR_2022_996];
  if (consignment.chainOfCustody === 'BOOK_AND_CLAIM') {
    entries.push(entry('go-pos-pairing', 'GO + PoS paired', 'FAIL', `Book-and-claim chain of custody does not meet RED III requirements for ${market.name}: the GGE booking needs a GO and a mass-balance PoS for the same physical delivery (R5–R7).`, pairCites, 'Trade the GO and PoS together on mass balance.'));
  } else if (!go || !pos || go.energyMWh == null || pos.mwh == null) {
    entries.push(entry('go-pos-pairing', 'GO + PoS paired', 'TODO', 'Enter the GO and PoS records to check they cover the same MWh and period (R5–R7).', pairCites));
  } else {
    const factor = go.energyBasis === 'LHV' ? 1 : getLhvFactorForOrigin(go.issuingCountry || origin);
    const goLhv = go.energyMWh * factor;
    const gapPct = pos.mwh > 0 ? (Math.abs(goLhv - pos.mwh) / pos.mwh) * 100 : Infinity;
    const tolerancePct = getAssumption('market.nl_gge.pairingTolerancePct');
    const dp = consignment.deliveryPeriod;
    const periodGap = Boolean(
      (dp?.startDate && go.productionStart && go.productionStart > dp.startDate) ||
      (dp?.endDate && go.productionEnd && go.productionEnd < dp.endDate),
    );
    if (gapPct > tolerancePct) {
      entries.push(entry('go-pos-pairing', 'GO + PoS paired', 'FAIL', `GO ${goLhv.toFixed(1)} MWh LHV (${go.energyMWh} MWh ${go.energyBasis} × ${factor}) vs PoS ${pos.mwh} MWh: ${gapPct.toFixed(2)}% apart, above the ${tolerancePct}% tolerance (R5–R7).`, pairCites, 'Match the GO and PoS volumes for the same delivery.'));
    } else if (periodGap) {
      entries.push(entry('go-pos-pairing', 'GO + PoS paired', 'FAIL', `GO production period ${go.productionStart} – ${go.productionEnd} does not cover the delivery period ${dp?.startDate} – ${dp?.endDate} (R5, R9).`, pairCites, 'Use GOs from the production period of the delivered gas.'));
    } else {
      entries.push(entry('go-pos-pairing', 'GO + PoS paired', 'PASS', `GO ${go.energyMWh} MWh ${go.energyBasis} × ${factor} = ${goLhv.toFixed(1)} MWh LHV matches PoS ${pos.mwh} MWh within ${tolerancePct}% (R5–R7).`, pairCites));
    }
  }

  // 5. No operating aid (R11, R12)
  const support = go?.supportType && go.supportType !== 'UNKNOWN' ? go.supportType : (pos?.supportDeclared ?? 'UNKNOWN');
  const aidCites = [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_KAMERSTUK_36947];
  if (support === 'OPERATING') {
    entries.push(entry('no-operating-aid', 'No operating aid', 'FAIL', 'The GO / PoS declares operating aid (exploitatiesubsidie) for this production; NEa will not credit it (R11).', aidCites, 'Source from unsubsidised production (investment aid is allowed).'));
  } else if (support === 'NONE' || support === 'INVESTMENT') {
    entries.push(entry('no-operating-aid', 'No operating aid', 'PASS', support === 'INVESTMENT' ? 'Investment aid only, which is compatible (R12).' : 'No operating aid declared (R11).', aidCites));
  } else {
    entries.push(entry('no-operating-aid', 'No operating aid', 'TODO', 'Confirm the GO support field / PoS support declaration: operating aid blocks crediting, investment aid is fine (R11, R12).', aidCites));
  }

  // 6. Spanish PRTR grant (S3, Orden TED/706/2022 Art 5.3)
  if (origin === 'ES') {
    const prtr = claims?.prtrGrant ?? 'UNKNOWN';
    if (prtr === 'YES' && !claims?.prtrLegalCheckDone) {
      entries.push(entry('spanish-prtr-grant', 'Spanish PRTR grant', 'WARN', 'Plant has a PRTR biogas grant: Orden TED/706/2022 Art 5.3 may bar agreements to obtain “certificados verdes”. Legal check not yet done (S3).', [CITATIONS.ES_ORDEN_TED_706_2022], 'Get a legal opinion on the grant call terms before selling GGE-eligible GO + PoS.'));
    } else if (prtr === 'UNKNOWN') {
      entries.push(entry('spanish-prtr-grant', 'Spanish PRTR grant', 'TODO', 'Confirm whether the plant received a PRTR biogas grant (Orden TED/706/2022 Art 5.3) (S3).', [CITATIONS.ES_ORDEN_TED_706_2022]));
    } else {
      entries.push(entry('spanish-prtr-grant', 'Spanish PRTR grant', 'PASS', prtr === 'YES' ? 'PRTR grant: legal check done (S3).' : 'No PRTR grant (S3).', [CITATIONS.ES_ORDEN_TED_706_2022]));
    }
  } else {
    entries.push(entry('spanish-prtr-grant', 'Spanish PRTR grant', 'PASS', 'Not applicable: non-Spanish origin.', []));
  }

  // 7. GHG saving vs the 80 g heat comparator; RED Art 29(10) heat tiers (O2)
  const comparator = market.fossilComparatorGCo2eMj ?? CI_COMPARATOR_HEAT;
  const ci = pos?.ciTotal ?? consignment.carbonIntensity;
  const saving = (comparator - ci) / comparator;
  const ghgCites = [CITATIONS.RED_III_GHG_HEAT_POWER, CITATIONS.NL_GGE_DRAFT_REGELING];
  const savingText = `Saving (${comparator} − ${ci}) / ${comparator} = ${(saving * 100).toFixed(0)}%`;
  const lowPct = RED_HEAT_THRESHOLD_POST_2021 * 100;
  const highPct = RED_HEAT_THRESHOLD_POST_2026 * 100;
  if (saving >= RED_HEAT_THRESHOLD_POST_2026) {
    entries.push(entry('ghg-saving', 'GHG saving threshold', 'PASS', `${savingText}, above both the ${lowPct}% and ${highPct}% heat thresholds (O2).`, ghgCites));
  } else if (saving >= RED_HEAT_THRESHOLD_POST_2021) {
    entries.push(entry('ghg-saving', 'GHG saving threshold', 'WARN', `${savingText}: passes ${lowPct}% but not ${highPct}% — threshold category unconfirmed, depends on the plant’s start date (O2).`, ghgCites, 'Confirm the plant’s commissioning date and threshold tier.'));
  } else {
    entries.push(entry('ghg-saving', 'GHG saving threshold', 'FAIL', `${savingText}, below the ${lowPct}% minimum (O2).`, ghgCites, 'Use lower-CI gas.'));
  }

  // 8. Deadlines: GO validity / Spanish export window and the 1 May booking window (R9, R10, S5)
  const deadlineCites = [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_DRAFT_REGELING];
  const productionEnd = go?.productionEnd || consignment.deliveryPeriod?.productionEndDate || null;
  const dpEnd = consignment.deliveryPeriod?.endDate ?? null;
  const deliveryYear = consignment.deliveryPeriod?.complianceYear
    ?? (dpEnd ? Number(dpEnd.slice(0, 4)) : null)
    ?? (productionEnd ? Number(productionEnd.slice(0, 4)) : null);
  const planned = custody?.plannedBookingDate ?? null;
  if (!productionEnd || deliveryYear === null || !planned) {
    entries.push(entry('booking-deadlines', 'Booking & export deadlines', 'TODO', 'Enter the GO production end and the planned NEa booking date to check GO validity and the 1 May booking window (R9, R10).', deadlineCites));
  } else {
    const deadline = ggeEffectiveBookingDeadline(productionEnd, deliveryYear);
    const margin = daysBetween(planned, deadline);
    const warnDays = getAssumption('market.nl_gge.bookingWarningDays');
    const esNote = origin === 'ES' ? ` Spanish GOs must also leave Enagás within ${NL_GGE_GO_VALIDITY_MONTHS} months of production (S5).` : '';
    if (margin < 0) {
      entries.push(entry('booking-deadlines', 'Booking & export deadlines', 'WARN', `Planned booking ${planned} is after the effective deadline ${deadline} (R9, R10).${esNote}`, deadlineCites, `Book by ${deadline}.`));
    } else if (margin < warnDays) {
      entries.push(entry('booking-deadlines', 'Booking & export deadlines', 'WARN', `Planned booking ${planned} leaves ${margin} days before the effective deadline ${deadline} (desk margin ${warnDays} days) (R9, R10).${esNote}`, deadlineCites));
    } else {
      entries.push(entry('booking-deadlines', 'Booking & export deadlines', 'PASS', `Planned booking ${planned}, ${margin} days before the effective deadline ${deadline} (R9, R10).${esNote}`, deadlineCites));
    }
  }

  // 9. No double claim (R25)
  if (claims?.notUsedElsewhere === false) {
    entries.push(entry('no-double-claim', 'No double claim', 'FAIL', 'The GO / PoS is already used elsewhere (e.g. ERE, THG, Spanish quota); the same delivery cannot serve two schemes (R25).', [CITATIONS.NL_GGE_DRAFT_BESLUIT], 'Use certificates not claimed anywhere else.'));
  } else if (claims?.notUsedElsewhere === true) {
    entries.push(entry('no-double-claim', 'No double claim', 'PASS', 'Seller confirms the GO / PoS is not used in any other scheme (R25).', [CITATIONS.NL_GGE_DRAFT_BESLUIT]));
  } else {
    entries.push(entry('no-double-claim', 'No double claim', 'TODO', 'Get the seller’s declaration that the GO / PoS is not claimed elsewhere (R25).', [CITATIONS.NL_GGE_DRAFT_BESLUIT]));
  }

  // 10. UDB: not mandatory for gas yet (O4)
  entries.push(entry('udb-recording', 'Union Database (UDB)', 'PASS', 'Info: the UDB gas module is not mandatory for gas yet; the GO + PoS interim route applies (O4).', [CITATIONS.UDB_IMPLEMENTING_REG]));

  // 11. Law status (O6) — advisory: shown, but a fully documented deal still passes
  const pending = market.uncertainties.length > 0;
  entries.push({
    ...entry('legislative-status', 'Law status', pending ? 'WARN' : 'PASS',
      pending ? 'Senate vote pending — not yet law. Draft Besluit / Regeling may still change (O6).' : 'Obligation in force.',
      [CITATIONS.NL_GGE_KAMERSTUK_36947, CITATIONS.NL_GGE_TK_VERSLAG]),
    advisory: true,
  });

  return result(
    entries,
    `GO + PoS chain complete for ${market.name}: paired on the same MWh, certified, unsubsidised and bookable in time.`,
    [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_DRAFT_REGELING],
  );
}

// ---------------------------------------------------------------------------
// GO (book-and-claim) markets: registry transfer as today
// ---------------------------------------------------------------------------
function goChecklist(consignment: Consignment, market: Market): GateResult {
  const entries: Entry[] = [cocModelEntry(consignment, market)];
  const registry = evaluateRegistryTransferGate(consignment, market);
  if (registry) entries.push(fromGate('registry-transfer', 'Registry transfer', registry));
  entries.push(fromGate('udb-recording', 'Union Database (UDB)', evaluateUDBGate(consignment, market)));
  return result(entries, `${market.name}: GO can be transferred to the destination registry.`, [CITATIONS.RED_III_CHAIN_OF_CUSTODY]);
}

// ---------------------------------------------------------------------------
// PoS (mass balance) compliance and other markets
// ---------------------------------------------------------------------------
function posChecklist(consignment: Consignment, market: Market): GateResult {
  const custody = consignment.custody ?? null;
  const udb = evaluateUDBGate(consignment, market);
  const entries: Entry[] = [cocModelEntry(consignment, market)];

  // Origin / grid injection: a non-EU grid blocks a market that needs UDB recording.
  if (consignment.injectionIsEU === false && market.requiresUDB) {
    entries.push(fromGate('origin', 'Origin and grid injection', udb));
  } else {
    entries.push(entry('origin', 'Origin and grid injection', 'PASS', `Injected into the ${consignment.injectionCountry || consignment.originCountry} grid.`, [CITATIONS.RED_III_CHAIN_OF_CUSTODY]));
  }

  // PoS route (audited cross-border matrix); omitted for domestic trades and markets with no audited scheme.
  const pos = evaluateCrossBorderPosGate(consignment, market);
  if (pos) entries.push(fromGate('cross-border-pos', 'Cross-border PoS route', pos));

  // Certified chain: the scheme (also its own gate, ahead of this one) plus trader certification when entered.
  const scheme = fromGate('certified-chain', 'Certified chain', evaluateSchemeGate(consignment, market));
  const claims = custody?.claims ?? null;
  if (claims && (claims.ownTraderCertified === false || claims.counterpartyCertified === false)) {
    entries.push(worse(scheme, entry('certified-chain', 'Certified chain', 'FAIL', 'A trader in the chain is not a certified economic operator (RED III Art 30).', [CITATIONS.RED_III_VOLUNTARY_SCHEMES], 'Trade through certified entities only.')));
  } else {
    entries.push(scheme);
  }

  // Double claim, only when the deal carries a declaration.
  if (claims?.notUsedElsewhere === false) {
    entries.push(entry('no-double-claim', 'No double claim', 'FAIL', 'The PoS is already claimed elsewhere; the same delivery cannot serve two schemes.', [CITATIONS.RED_III_CHAIN_OF_CUSTODY], 'Use a PoS not claimed anywhere else.'));
  } else if (claims?.notUsedElsewhere === true) {
    entries.push(entry('no-double-claim', 'No double claim', 'PASS', 'Seller confirms the PoS is not claimed elsewhere.', [CITATIONS.RED_III_CHAIN_OF_CUSTODY]));
  }

  entries.push(fromGate('udb-recording', 'Union Database (UDB)', udb));

  return result(entries, `Chain of custody meets RED III requirements for ${market.name}.`, [CITATIONS.RED_III_CHAIN_OF_CUSTODY]);
}

export function evaluateChainOfCustodyGate(consignment: Consignment, market: Market): GateResult {
  if (market.requiresGoAndPos) return pairedChecklist(consignment, market);
  if (isGoTransferMarket(market)) return goChecklist(consignment, market);
  return posChecklist(consignment, market);
}
