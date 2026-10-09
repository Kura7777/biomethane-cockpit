import { Consignment } from '../../consignment/types';
import { Market } from '../../markets/types';
import { GateResult, GateName, GateVerdict, GateChecklistItem } from '../types';
import { CITATIONS } from '../citations';
import { getGoRoute } from '../../routes';
import { evaluateUDBGate } from './udb';
import { evaluateRegistryTransferGate, isGoTransferMarket } from './registry-transfer';
import { evaluateCrossBorderPosGate } from './cross-border-pos';
import { evaluateSchemeGate } from './scheme';
import { evaluateGHGThresholdGate } from './ghg-threshold';
import { getLhvFactorForOrigin } from '../../assumptions/registry';

const GATE: GateName = 'CHAIN_OF_CUSTODY';
const GATE_LABEL = 'Chain of Custody';

function normIso(iso?: string | null): string {
  const u = (iso || '').toUpperCase();
  return u === 'UK' ? 'GB' : u;
}

const EU_EEA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
]);

const EC_RECOGNIZED_SCHEMES = new Set([
  'ISCC_EU', 'REDCERT_EU', 'SURE', '2BSVS', 'BETTER_BIOMASS', 'KZR_INIG',
]);

export function evaluateChainOfCustodyGate(consignment: Consignment, market: Market): GateResult {
  const origin = normIso(consignment.injectionCountry || consignment.originCountry);
  const custody = consignment.custody;

  // =========================================================================
  // Case A: Paired Markets (requiresGoAndPos, e.g. NL_GGE)
  // =========================================================================
  if (market.requiresGoAndPos) {
    const checklist: GateChecklistItem[] = [];

    // 1. Origin in EU/EEA (R24)
    const isEuEea = EU_EEA_COUNTRIES.has(origin);
    checklist.push({
      id: 'origin-eu-eea',
      label: 'Origin in EU/EEA',
      status: isEuEea ? 'PASS' : 'FAIL',
      detail: isEuEea
        ? `Biomethane produced in EU/EEA (${origin}) meets origin requirements (R24).`
        : `Origin country ${origin} is outside EU/EEA; non-EEA biomethane is ineligible for NL GGE (R24).`,
      citations: [CITATIONS.NL_GGE_TK_VERSLAG, CITATIONS.NL_GGE_DRAFT_BESLUIT],
    });

    // 2. GO route to NL via AIB (getGoRoute) (S1, R8)
    if (origin === 'NL') {
      checklist.push({
        id: 'go-route-nl',
        label: 'GO route to NL (AIB)',
        status: 'PASS',
        detail: 'Domestic Dutch delivery via VertiCer (S1, R8).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
      });
    } else {
      const route = getGoRoute(origin, 'NL');
      let routeStatus: 'PASS' | 'FAIL' | 'WARN' = 'WARN';
      let routeDetail = `GO route from ${origin} to NL via AIB is unconfirmed.`;
      if (route.status === 'POSSIBLE') {
        routeStatus = 'PASS';
        routeDetail = `GO route from ${origin} to NL via AIB hub is open and verified (S1, R8).`;
      } else if (route.status === 'NOT_POSSIBLE') {
        routeStatus = 'FAIL';
        routeDetail = `GO route from ${origin} to NL via AIB hub is NOT possible (e.g. export restriction or non-connected registry) (R8).`;
      }
      checklist.push({
        id: 'go-route-nl',
        label: 'GO route to NL (AIB)',
        status: routeStatus,
        detail: routeDetail,
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
      });
    }

    // 3. Certified chain: EC-recognised scheme, plus own and counterparty trader certified. Null -> TODO (R13, R16)
    const schemeToCheck = custody?.pos?.scheme ?? consignment.certificationScheme;
    const isEcScheme = EC_RECOGNIZED_SCHEMES.has(schemeToCheck);
    if (!isEcScheme) {
      checklist.push({
        id: 'certified-chain',
        label: 'Certified chain (EC scheme & traders)',
        status: 'FAIL',
        detail: `Certification scheme ${schemeToCheck} is not recognised by the European Commission under RED III (R13).`,
        citations: [CITATIONS.RED_III_VOLUNTARY_SCHEMES, CITATIONS.NL_GGE_DRAFT_REGELING],
      });
    } else if (!custody || custody.claims?.ownTraderCertified == null || custody.claims?.counterpartyCertified == null) {
      checklist.push({
        id: 'certified-chain',
        label: 'Certified chain (EC scheme & traders)',
        status: 'TODO',
        detail: 'Trader certification status (own and counterparty certified economic operators) must be verified (R13, R16).',
        citations: [CITATIONS.NL_GGE_DRAFT_REGELING],
      });
    } else if (custody.claims.ownTraderCertified === false || custody.claims.counterpartyCertified === false) {
      checklist.push({
        id: 'certified-chain',
        label: 'Certified chain (EC scheme & traders)',
        status: 'FAIL',
        detail: 'Trading entities must be certified economic operators under an EC-recognised voluntary scheme (R13, R16).',
        citations: [CITATIONS.NL_GGE_DRAFT_REGELING],
      });
    } else {
      checklist.push({
        id: 'certified-chain',
        label: 'Certified chain (EC scheme & traders)',
        status: 'PASS',
        detail: `Certified under ${schemeToCheck}; own trader and counterparty are certified economic operators (R13, R16).`,
        citations: [CITATIONS.NL_GGE_DRAFT_REGELING],
      });
    }

    // 4. GO + PoS paired:
    // GO MWh converted with lhvFactor matches PoS MWh within ±0.5%, and GO production period covers PoS period;
    // missing data -> TODO; mismatch -> FAIL (R5–R7)
    if (!custody?.go || !custody?.pos || custody.go.energyMWh == null || custody.pos.mwh == null) {
      checklist.push({
        id: 'go-pos-pairing',
        label: 'GO + PoS paired',
        status: 'TODO',
        detail: 'GO and PoS records required to verify volume pairing and period coverage (R5–R7).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_DRAFT_REGELING, CITATIONS.EU_IR_2022_996],
      });
    } else {
      const lhvFactor = getLhvFactorForOrigin(origin);
      const goMWh = custody.go.energyMWh;
      const posMWh = custody.pos.mwh;
      const goBasis = custody.go.energyBasis || 'HHV';
      const goLhvMWh = goBasis === 'LHV' ? goMWh : goMWh * lhvFactor;
      const diffPct = Math.abs(goLhvMWh - posMWh) / (posMWh || 1);

      let periodMismatch = false;
      if (custody.go.productionStart && custody.go.productionEnd && consignment.deliveryPeriod) {
        const deliveryStart = typeof consignment.deliveryPeriod === 'object' ? consignment.deliveryPeriod.startDate : consignment.deliveryPeriod;
        const deliveryEnd = typeof consignment.deliveryPeriod === 'object' ? consignment.deliveryPeriod.endDate : consignment.deliveryPeriod;
        if (deliveryStart && custody.go.productionStart > deliveryStart) periodMismatch = true;
        if (deliveryEnd && custody.go.productionEnd < deliveryEnd) periodMismatch = true;
      }

      if (diffPct > 0.005) {
        checklist.push({
          id: 'go-pos-pairing',
          label: 'GO + PoS paired',
          status: 'FAIL',
          detail: `Energy mismatch: GO ${goLhvMWh.toFixed(1)} MWh (LHV) does not match PoS ${posMWh.toFixed(1)} MWh within ±0.5% (difference ${(diffPct * 100).toFixed(2)}%) (R5–R7).`,
          citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_DRAFT_REGELING],
        });
      } else if (periodMismatch) {
        checklist.push({
          id: 'go-pos-pairing',
          label: 'GO + PoS paired',
          status: 'FAIL',
          detail: 'GO production period does not cover the PoS delivery period (R9).',
          citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
        });
      } else {
        checklist.push({
          id: 'go-pos-pairing',
          label: 'GO + PoS paired',
          status: 'PASS',
          detail: `GO (${goMWh} MWh ${goBasis}) pairs with PoS (${posMWh} MWh) under LHV factor ${lhvFactor} within ±0.5% (R5–R7).`,
          citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_DRAFT_REGELING],
        });
      }
    }

    // 5. No operating aid: NONE or INVESTMENT -> PASS; OPERATING -> FAIL; UNKNOWN -> TODO (R11, R12)
    const support = custody?.go?.supportType ?? custody?.pos?.supportDeclared ?? 'UNKNOWN';
    if (!custody || support === 'UNKNOWN') {
      checklist.push({
        id: 'no-operating-aid',
        label: 'No operating aid',
        status: 'TODO',
        detail: 'Declaration of public support is required (operating aid is prohibited; investment aid is permitted) (R11, R12).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_KAMERSTUK_36947],
      });
    } else if (support === 'OPERATING') {
      checklist.push({
        id: 'no-operating-aid',
        label: 'No operating aid',
        status: 'FAIL',
        detail: 'Production received operating aid (exploitatiesubsidie); ineligible for NL GGE crediting (R11).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
      });
    } else {
      checklist.push({
        id: 'no-operating-aid',
        label: 'No operating aid',
        status: 'PASS',
        detail: support === 'INVESTMENT'
          ? 'Received investment aid only; compatible with NL GGE (Kamerstuk 36947 nr. 8) (R12).'
          : 'No public operating aid declared (R11).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_KAMERSTUK_36947],
      });
    }

    // 6. Spanish PRTR grant: if origin ES and prtrGrant YES without prtrLegalCheckDone -> WARN (S3)
    if (origin !== 'ES') {
      checklist.push({
        id: 'spanish-prtr-grant',
        label: 'Spanish PRTR grant',
        status: 'PASS',
        detail: 'Not applicable for non-Spanish origins.',
        citations: [],
      });
    } else if (!custody || custody.claims?.prtrGrant === 'UNKNOWN') {
      checklist.push({
        id: 'spanish-prtr-grant',
        label: 'Spanish PRTR grant',
        status: 'TODO',
        detail: 'Verify whether Spanish PRTR biogas capital grants were received (Orden TED/706/2022 Art. 5.3) (S3).',
        citations: [CITATIONS.ES_ORDEN_TED_706_2022],
      });
    } else if (custody.claims?.prtrGrant === 'YES' && !custody.claims?.prtrLegalCheckDone) {
      checklist.push({
        id: 'spanish-prtr-grant',
        label: 'Spanish PRTR grant',
        status: 'WARN',
        detail: 'Plant received Spanish PRTR grant without legal check confirming compatibility of tradable certificates (Orden TED/706/2022 Art. 5.3) (S3).',
        citations: [CITATIONS.ES_ORDEN_TED_706_2022],
      });
    } else {
      checklist.push({
        id: 'spanish-prtr-grant',
        label: 'Spanish PRTR grant',
        status: 'PASS',
        detail: custody.claims?.prtrGrant === 'YES'
          ? 'PRTR grant compatibility verified via legal check (Orden TED/706/2022 Art. 5.3) (S3).'
          : 'No Spanish PRTR grant received (S3).',
        citations: [CITATIONS.ES_ORDEN_TED_706_2022],
      });
    }

    // 7. GHG saving: saving = (80 - CI) / 80; >=80% -> PASS; 70-80% -> WARN; <70% -> FAIL (O2)
    const ci = custody?.pos?.ciTotal ?? consignment.carbonIntensity;
    const comparator = market.fossilComparatorGCo2eMj ?? 80;
    const saving = (comparator - ci) / comparator;
    if (saving >= 0.80) {
      checklist.push({
        id: 'ghg-saving',
        label: 'GHG saving threshold',
        status: 'PASS',
        detail: `GHG saving ${(saving * 100).toFixed(1)}% ≥ 80% heat threshold (RED Art. 29(10)) (O2).`,
        citations: [CITATIONS.RED_III_GHG_HEAT_POWER, CITATIONS.NL_GGE_DRAFT_REGELING],
      });
    } else if (saving >= 0.70) {
      checklist.push({
        id: 'ghg-saving',
        label: 'GHG saving threshold',
        status: 'WARN',
        detail: `GHG saving ${(saving * 100).toFixed(1)}% is between 70% and 80% (threshold category unconfirmed) (O2).`,
        citations: [CITATIONS.RED_III_GHG_HEAT_POWER, CITATIONS.NL_GGE_DRAFT_REGELING],
      });
    } else {
      checklist.push({
        id: 'ghg-saving',
        label: 'GHG saving threshold',
        status: 'FAIL',
        detail: `GHG saving ${(saving * 100).toFixed(1)}% < 70% statutory threshold (RED Art. 29(10)) (O2).`,
        citations: [CITATIONS.RED_III_GHG_HEAT_POWER, CITATIONS.NL_GGE_DRAFT_REGELING],
      });
    }

    // 8. Deadlines:
    // effective booking deadline = min(productionEnd + 12m, 1 May of delivery year + 1)
    // for ES origins, export deadline is productionEnd + 12m (S5)
    // WARN if plannedBookingDate is after deadline or fewer than 60 days remain; TODO if dates missing (R9, R10)
    const prodEnd = custody?.go?.productionEnd;
    const plannedBooking = custody?.plannedBookingDate;
    if (!prodEnd || !plannedBooking) {
      checklist.push({
        id: 'booking-deadlines',
        label: 'Booking & export deadlines',
        status: 'TODO',
        detail: 'GO production end date and planned booking date required to evaluate statutory booking windows (R9, R10).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
      });
    } else {
      const prodEndDate = new Date(prodEnd);
      const prodEndPlus12m = new Date(prodEndDate);
      prodEndPlus12m.setFullYear(prodEndPlus12m.getFullYear() + 1);
      const prodEndPlus12mStr = prodEndPlus12m.toISOString().slice(0, 10);

      const deliveryYear = prodEndDate.getFullYear();
      const may1NextYearStr = `${deliveryYear + 1}-05-01`;
      const effectiveDeadlineStr = prodEndPlus12mStr < may1NextYearStr ? prodEndPlus12mStr : may1NextYearStr;

      const plannedDate = new Date(plannedBooking);
      const deadlineDate = new Date(effectiveDeadlineStr);
      const daysRemaining = Math.round((deadlineDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (plannedBooking > effectiveDeadlineStr) {
        checklist.push({
          id: 'booking-deadlines',
          label: 'Booking & export deadlines',
          status: 'WARN',
          detail: `Planned booking date ${plannedBooking} exceeds effective deadline ${effectiveDeadlineStr} (R9, R10).`,
          citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
        });
      } else if (daysRemaining < 60) {
        checklist.push({
          id: 'booking-deadlines',
          label: 'Booking & export deadlines',
          status: 'WARN',
          detail: `Only ${daysRemaining} days remaining before effective booking deadline ${effectiveDeadlineStr} (R9, R10).`,
          citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
        });
      } else {
        checklist.push({
          id: 'booking-deadlines',
          label: 'Booking & export deadlines',
          status: 'PASS',
          detail: `Planned booking ${plannedBooking} is within effective deadline ${effectiveDeadlineStr} (${daysRemaining} days margin) (R9, R10).`,
          citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
        });
      }
    }

    // 9. No double claim (notUsedElsewhere) (R25)
    if (!custody || custody.claims?.notUsedElsewhere == null) {
      checklist.push({
        id: 'no-double-claim',
        label: 'No double claim',
        status: 'TODO',
        detail: 'Confirmation required that certificates are not used elsewhere (R25).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
      });
    } else if (custody.claims.notUsedElsewhere === false) {
      checklist.push({
        id: 'no-double-claim',
        label: 'No double claim',
        status: 'FAIL',
        detail: 'Certificates have already been claimed or surrendered elsewhere; cannot serve NL GGE (R25).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
      });
    } else {
      checklist.push({
        id: 'no-double-claim',
        label: 'No double claim',
        status: 'PASS',
        detail: 'Confirmed not used or claimed in any other scheme or delivery (R25).',
        citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT],
      });
    }

    // 10. UDB: PASS with info note "not mandatory for gas yet" (O4)
    checklist.push({
      id: 'udb-gas-module',
      label: 'Union Database (UDB)',
      status: 'PASS',
      detail: 'UDB gas module not mandatory yet; GO+PoS interim route applies (O4).',
      citations: [CITATIONS.UDB_IMPLEMENTING_REG],
    });

    // 11. Law status: WARN "Senate vote pending — not yet law" while market has uncertainties (O6)
    const hasUncertainties = market.uncertainties && market.uncertainties.length > 0;
    checklist.push({
      id: 'legislative-status',
      label: 'Legislative status',
      status: hasUncertainties ? 'WARN' : 'PASS',
      detail: hasUncertainties
        ? 'Senate vote pending — not yet law (Wet bijmengverplichting groen gas, Kamerstuk 36947) (O6).'
        : 'Wet bijmengverplichting groen gas fully enacted.',
      citations: [CITATIONS.NL_GGE_KAMERSTUK_36947, CITATIONS.NL_GGE_TK_VERSLAG],
    });

    // Verdict derivation: any FAIL gives HARD_BLOCK; else any WARN/TODO gives CONDITIONAL; else PASS.
    // legislative-status is a market advisory item and does not demote an otherwise fully-filled trade from PASS to CONDITIONAL.
    const custodyItems = checklist.filter(item => item.id !== 'legislative-status');
    const failItem = checklist.find(item => item.status === 'FAIL');
    const warnOrTodoItem = custodyItems.find(item => item.status === 'WARN' || item.status === 'TODO');

    let verdict: GateVerdict = 'PASS';
    let reason = `All chain of custody criteria met for ${market.name}. GO and PoS paired for joint VertiCer booking.`;
    let remedy: string | null = null;

    if (failItem) {
      verdict = 'HARD_BLOCK';
      reason = `Chain of custody blocked at [${failItem.label}]: ${failItem.detail}`;
      remedy = `Resolve blocking requirement for ${failItem.label}.`;
    } else if (warnOrTodoItem) {
      verdict = 'CONDITIONAL';
      reason = `Chain of custody conditional at [${warnOrTodoItem.label}]: ${warnOrTodoItem.detail}`;
      remedy = `Fulfill conditions: ${custodyItems.filter(i => i.status === 'WARN' || i.status === 'TODO').map(i => i.label).join(', ')}.`;
    }

    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict,
      reason,
      remedy,
      citations: [CITATIONS.NL_GGE_DRAFT_BESLUIT, CITATIONS.NL_GGE_DRAFT_REGELING],
      confidence: 'HIGH',
      checklist,
    };
  }

  // =========================================================================
  // Case B: GO (book-and-claim) markets
  // =========================================================================
  if (isGoTransferMarket(market)) {
    const checklist: GateChecklistItem[] = [];
    const regGate = evaluateRegistryTransferGate(consignment, market);
    if (regGate) {
      checklist.push({
        id: 'registry-transfer',
        label: 'Registry transfer',
        status: regGate.verdict === 'HARD_BLOCK' ? 'FAIL' : regGate.verdict === 'CONDITIONAL' ? 'WARN' : 'PASS',
        detail: regGate.reason,
        citations: regGate.citations,
      });
    }

    checklist.push({
      id: 'coc-model',
      label: 'Chain of custody model',
      status: 'PASS',
      detail: `${market.name} accepts book-and-claim / Guarantee of Origin transfer.`,
      citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
    });

    const failItem = checklist.find(i => i.status === 'FAIL');
    const warnItem = checklist.find(i => i.status === 'WARN' || i.status === 'TODO');

    const verdict: GateVerdict = failItem ? 'HARD_BLOCK' : warnItem ? 'CONDITIONAL' : (regGate?.verdict ?? 'PASS');

    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict,
      reason: regGate?.reason ?? `${market.name} accepts book-and-claim transfer.`,
      remedy: regGate?.remedy ?? null,
      citations: regGate?.citations ?? [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
      confidence: regGate?.confidence ?? 'HIGH',
      checklist,
    };
  }

  // =========================================================================
  // Case C: Compliance markets (PoS / Mass Balance)
  // =========================================================================
  if (consignment.chainOfCustody === 'BOOK_AND_CLAIM' && !market.acceptsBookAndClaim) {
    const checklist: GateChecklistItem[] = [
      {
        id: 'coc-model',
        label: 'Chain of custody model',
        status: 'FAIL',
        detail: `Book-and-claim chain of custody does not meet RED III requirements for ${market.name}. All transport compliance markets, FuelEU Maritime, and EU ETS require mass balance or physical segregation.`,
        citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
      },
    ];
    return {
      gate: GATE,
      gateLabel: GATE_LABEL,
      verdict: 'HARD_BLOCK',
      reason: `Book-and-claim chain of custody does not meet RED III requirements for ${market.name}. All transport compliance markets, FuelEU Maritime, and EU ETS require mass balance or physical segregation \u2014 the physical gas must be trackable through the grid.`,
      remedy: 'Switch to mass balance chain of custody. This requires the physical gas to be injected into the interconnected gas grid with mass balance accounting at the injection point.',
      citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
      confidence: 'HIGH',
      checklist,
    };
  }

  // Mass balance / segregation compliance markets:
  // origin, PoS route (cross-border PoS matrix), certified chain, GHG threshold, double claim, and UDB
  const checklist: GateChecklistItem[] = [];

  // 1. Origin / Injection
  const nonEuInjection = consignment.injectionIsEU === false;
  if (nonEuInjection && market.requiresUDB) {
    checklist.push({
      id: 'origin',
      label: 'Origin and gas grid injection',
      status: 'FAIL',
      detail: `Consignment is injected into a non-EU gas grid (${consignment.injectionCountry}). Gas injected into a non-EU grid cannot be tracked in the UDB mass balance system.`,
      citations: [CITATIONS.RED_III_UDB],
    });
  } else {
    checklist.push({
      id: 'origin',
      label: 'Origin and gas grid injection',
      status: 'PASS',
      detail: `Injected into European interconnected gas grid (${consignment.injectionCountry || consignment.originCountry}).`,
      citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
    });
  }

  // 2. PoS route (cross-border PoS matrix)
  const posGate = evaluateCrossBorderPosGate(consignment, market);
  if (posGate) {
    checklist.push({
      id: 'cross-border-pos',
      label: 'Cross-border PoS route',
      status: posGate.verdict === 'HARD_BLOCK' ? 'FAIL' : posGate.verdict === 'CONDITIONAL' ? 'WARN' : 'PASS',
      detail: posGate.reason,
      citations: posGate.citations,
    });
  } else {
    checklist.push({
      id: 'cross-border-pos',
      label: 'Cross-border PoS route',
      status: 'PASS',
      detail: `Domestic delivery within ${market.country} or no cross-border PoS restriction.`,
      citations: [],
    });
  }

  // 3. Certified chain
  const schemeGate = evaluateSchemeGate(consignment, market);
  checklist.push({
    id: 'certified-chain',
    label: 'Voluntary scheme certification',
    status: schemeGate.verdict === 'HARD_BLOCK' ? 'FAIL' : schemeGate.verdict === 'CONDITIONAL' ? 'WARN' : 'PASS',
    detail: schemeGate.reason,
    citations: schemeGate.citations,
  });

  // 4. GHG threshold
  const ghgGate = evaluateGHGThresholdGate(consignment, market);
  checklist.push({
    id: 'ghg-threshold',
    label: 'GHG emission threshold',
    status: ghgGate.verdict === 'HARD_BLOCK' ? 'FAIL' : ghgGate.verdict === 'CONDITIONAL' ? 'WARN' : 'PASS',
    detail: ghgGate.reason,
    citations: ghgGate.citations,
  });

  // 5. Double claim
  if (custody?.claims?.notUsedElsewhere === false) {
    checklist.push({
      id: 'no-double-claim',
      label: 'No double claim',
      status: 'FAIL',
      detail: 'Certificates have already been claimed or surrendered elsewhere.',
      citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
    });
  } else {
    checklist.push({
      id: 'no-double-claim',
      label: 'No double claim',
      status: 'PASS',
      detail: 'No double claim identified; certificates valid for single surrender.',
      citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
    });
  }

  // 6. UDB
  const udbGate = evaluateUDBGate(consignment, market);
  checklist.push({
    id: 'udb-recording',
    label: 'Union Database (UDB)',
    status: udbGate.verdict === 'HARD_BLOCK' ? 'FAIL' : udbGate.verdict === 'CONDITIONAL' ? 'WARN' : 'PASS',
    detail: udbGate.reason,
    citations: udbGate.citations,
  });

  // Verdict derivation:
  const failItem = checklist.find(i => i.status === 'FAIL');
  const warnOrTodoItem = checklist.find(i => i.status === 'WARN' || i.status === 'TODO');

  let verdict: GateVerdict = 'PASS';
  let reason = `Mass balance chain of custody meets RED III requirements for ${market.name}.`;
  let remedy: string | null = null;

  if (failItem) {
    verdict = 'HARD_BLOCK';
    reason = `Chain of custody blocked at [${failItem.label}]: ${failItem.detail}`;
    remedy = `Resolve blocking requirement for ${failItem.label}.`;
  } else if (warnOrTodoItem) {
    verdict = 'CONDITIONAL';
    reason = `Chain of custody conditional at [${warnOrTodoItem.label}]: ${warnOrTodoItem.detail}`;
    remedy = `Fulfill conditions: ${checklist.filter(i => i.status === 'WARN' || i.status === 'TODO').map(i => i.label).join(', ')}.`;
  }

  return {
    gate: GATE,
    gateLabel: GATE_LABEL,
    verdict,
    reason,
    remedy,
    citations: [CITATIONS.RED_III_CHAIN_OF_CUSTODY],
    confidence: 'HIGH',
    checklist,
  };
}
