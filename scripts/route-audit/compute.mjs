// C:\Dev\route-audit\build\compute.mjs
// Route Matrix Computation Engine for Biomethane Trading Desk
// Computes 756 ordered pairs for GO Layer and PoS Layer

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, REGISTRIES, GO_PAIR_EVIDENCE, POS_ORIGIN, POS_DEST_SCHEMES } from './rules.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, 'out');

// out directory managed in isMain block if executed standalone

// -------------------------------------------------------------
// GO Layer Evaluation Logic
// -------------------------------------------------------------
// Each condition is [short condition text, clause used inside the reason sentence].
// Destination and origin conditions that apply to every AIB lane, proven or not.
const DEST_COND = {
  FR: ['Requires mandatory ETS/ESR eligibility tag on EECS GO; refused if missing.', 'usable in France only if the GO carries the ETS/ESR eligibility tag'],
  IT: ['Requires sustainability compliance, gas usage, and GHG emissions data on GO for cancellation.', 'usable in Italy only if the GO carries verified sustainability and GHG data'],
  EE: ['Disclosure purpose only; supported-origin GOs may be refused.', 'usable in Estonia for disclosure only (does not count for national targets)'],
  HU: ['Requires MEKH manual approval and production within 12 months.', 'MEKH must approve the import manually'],
};
const ORIG_COND = {
  IT: ['Unsupported production only (DM 2018/2022 transport GOs locked to Italy).', 'only GOs from unsupported Italian production may be exported'],
  AT: ['Unsupported production only (subsidised GOs cannot be traded internationally).', 'only GOs from unsupported Austrian production may be exported'],
  SK: ['EECS-standard GOs only (SK GAS standard is ERGaR-only).', 'only EECS-standard Slovak GOs can go over AIB'],
};
// Conditions that are domain-protocol rules but are already demonstrated by commercial-size observed flows;
// they are therefore shown only on lanes that have not been observed at commercial size.
const DEST_COND_UNPROVEN = {
  ES: ['Production within the previous 12 months and renewable methane only (Enagas DP E.8.14-E.8.17).', 'Enagas accepts only GOs for renewable gas produced within the previous 12 months'],
  SE: ['Production within the last 12 months; EU or treaty-state EECS GOs only (Swedish DP E.10.2, E.13.3).', 'Cesar accepts only EU or treaty-state EECS GOs produced within the last 12 months'],
  AT: ['Foreign gas GOs accepted only if the GO content meets section 129b(8) GWG (E-Control DP C.3.9).', 'E-Control accepts foreign gas GOs only if the content meets section 129b(8) GWG'],
  SK: ['Use for ETS or CNG/LNG transport in Slovakia requires GOs from grid-connected biomethane plants (SPP-d DP E.10.7).', 'ETS and CNG/LNG transport use in Slovakia needs a grid-connected plant (E.10.7)'],
};
const ORIG_COND_UNPROVEN = {
  LV: ['GOs for gas produced before Conexus joined the AIB Gas Scheme cannot be exported (DP E.1.12).', 'legacy pre-membership Latvian GOs cannot be exported'],
  LT: ['GOs for gas produced before Amber Grid joined the AIB Gas Scheme cannot be exported (DP E.1.15).', 'legacy pre-membership Lithuanian GOs cannot be exported'],
};
const SE_COND = ['No Swedish gas GO transfer is recorded on the AIB hub yet (EECS gas from 1 Sep 2026) and the Swedish DP Release 5 (26 Aug 2026) is still in the future tense; unproven in practice.', 'no Swedish gas transfer has been recorded yet and the Swedish DP is still in the future tense'];

function aibConds(orig, dest, grade) {
  const out = [DEST_COND[dest], ORIG_COND[orig]];
  if (grade !== 'OBSERVED') {
    out.push(DEST_COND_UNPROVEN[dest], ORIG_COND_UNPROVEN[orig]);
  }
  if (orig === 'SE' || dest === 'SE') out.push(SE_COND);
  return out.filter(Boolean);
}

// Sources of a registry that are relevant to its role in a lane ('ORIGIN' or 'DEST').
// A source without a `use` list applies to both roles; ex-domain-only evidence is tagged 'EXDOMAIN'.
const pickSources = (reg, role) => (reg.sources || []).filter(s => !s.use || s.use.includes(role));
const exDomainSources = reg => (reg.sources || []).filter(s => s.use && s.use.includes('EXDOMAIN'));

function hubless(reg, iso) {
  const why = reg.brusselsGas
    ? 'has no hub connection for the Flemish and Walloon registries where its biomethane is produced (national non-EECS gas GOs)'
    : reg.operational
      ? 'has no connection to any international gas GO hub (AIB/ERGaR)'
      : 'is not operational or not connected to any international gas GO hub (AIB/ERGaR)';
  const note = reg.hubNote ? ` ${reg.hubNote}` : (reg.brusselsGas ? ` ${reg.brusselsGas.note}` : '');
  return `${iso} (${reg.name}) ${why}.${note}`;
}

function computeGoPair(orig, dest) {
  const pairKey = `${orig}>${dest}`;
  const regOrig = REGISTRIES[orig];
  const regDest = REGISTRIES[dest];

  // Ex-domain workaround, resolved per destination.
  // - DK (Energinet): ex-domain is "still allowed for countries without a registry or if the registry is not a
  //   member of the ERGaR hub", so it is withheld where the destination registry IS an ERGaR participant.
  // - Conditional origins (FR, CZ, FI, SK, BE, HU): only towards domains outside the AIB hub, under an agreement.
  // - A destination whose own protocol bars foreign ex-domain cancellations for use there (NL) gets none.
  // - PL and LU: no electronic channel, but statutory import recognition exists on paper.
  const getWorkaround = (origIso, destIso) => {
    const origReg = REGISTRIES[origIso];
    const destReg = REGISTRIES[destIso];
    const status = origReg.exDomainOut?.status || origReg.exDomainOut;
    const parts = [];
    const destBars = destReg.exDomainIn?.status === 'NOT_ALLOWED';
    if (status === 'ALLOWED' && destReg.ergar !== 'PARTICIPANT' && !destBars) {
      parts.push(`${origReg.name} allows ex-domain cancellation for a buyer in ${destIso}; whether ${destIso} recognises an ex-domain cancelled GO for disclosure/compliance is open.`);
    } else if (status === 'CONDITIONAL' && destReg.aib !== 'CONNECTED' && destReg.ergar !== 'PARTICIPANT' && !destBars) {
      parts.push(`${origReg.name} permits ex-domain cancellation only conditionally (${origReg.exDomainNote}); ${destIso} is outside the AIB hub, but an agreement with the destination issuing body would be needed and ${destIso} recognition of an ex-domain statement is unverified.`);
    } else if (status === 'CONDITIONAL' && destReg.aib !== 'CONNECTED' && destReg.ergar === 'PARTICIPANT' && !destBars) {
      parts.push(`${origReg.name} permits ex-domain cancellation only conditionally (${origReg.exDomainNote}); ${destIso} is an ERGaR participant without AIB access, so a bilateral cancellation agreement with the destination issuing body would be needed and ${destIso} recognition of an ex-domain statement is unverified.`);
    }
    if (destReg.importRecognition === 'MANUAL_ON_APPLICATION') {
      parts.push(`${destIso} has statutory manual recognition of an EU-issued GO by the President of URE on written application (OZE Act Art. 123); there is no electronic transfer channel and no recognised case is known.`);
    } else if (destReg.importRecognition === 'AUTOMATIC_IN_LAW') {
      parts.push(`${destIso} law (RGD 4 Nov 2022 Art. 11ter) says an EU-issued gas GO is automatically recognised by the regulator, but no operating gas registry or transfer channel is evidenced.`);
    }
    return parts.length ? parts.join(' ') : null;
  };
  const withWorkaround = res => {
    const wa = getWorkaround(orig, dest);
    if (wa) {
      res.workaround = wa;
      res.sources = [...res.sources, ...exDomainSources(regOrig)];
    }
    return res;
  };

  // Step 1: Explicit pair evidence override
  if (GO_PAIR_EVIDENCE[pairKey]) {
    const ev = GO_PAIR_EVIDENCE[pairKey];
    const result = {
      status: ev.status,
      via: ev.via || null,
      grade: ev.grade,
      reason: ev.reason,
      sources: ev.source ? [ev.source] : (ev.sources || []),
      openQuestionId: ev.openQuestionId || null
    };
    if (result.status === 'POSSIBLE' && result.via === 'AIB') {
      const conds = aibConds(orig, dest, ev.grade);
      if (conds.length) {
        result.condition = conds.map(c => c[0]).join(' ');
        result.reason = `${result.reason} Conditions: ${conds.map(c => c[1]).join('; and ')}.`;
      }
    }
    if (result.status === 'NOT_POSSIBLE') {
      withWorkaround(result);
    }
    return result;
  }

  // Step 1b: Brussels (BRUGEL) as destination. AIB-gas connected on paper but no gas transfer ever recorded,
  // and Flanders/Wallonia (where biomethane is produced) are not hub connected: OPEN, never POSSIBLE.
  if (regDest.brusselsGas && regOrig.aib === 'CONNECTED' && !regOrig.aibImportOnly && regOrig.operational) {
    return {
      status: 'OPEN',
      via: 'AIB',
      grade: 'RULE',
      reason: `${regDest.brusselsGas.note} The ${orig} to BE lane is therefore unproven in practice.`,
      openQuestionId: 'Q-BE-2',
      sources: [...pickSources(regOrig, 'ORIGIN'), ...pickSources(regDest, 'DEST')]
    };
  }

  // Step 2: Check if origin registry is operational or on any hub
  const origHasHub = (regOrig.aib === 'CONNECTED' || regOrig.ergar === 'PARTICIPANT');
  if (!regOrig.operational || !origHasHub) {
    return withWorkaround({
      status: 'NOT_POSSIBLE',
      via: null,
      grade: 'RULE',
      reason: `Origin registry ${hubless(regOrig, orig)}`,
      sources: pickSources(regOrig, 'ORIGIN')
    });
  }

  // Check if destination registry is operational or on any hub
  const destHasHub = (regDest.aib === 'CONNECTED' || regDest.ergar === 'PARTICIPANT');
  if (!regDest.operational || !destHasHub) {
    return withWorkaround({
      status: 'NOT_POSSIBLE',
      via: null,
      grade: 'RULE',
      reason: `Destination registry ${hubless(regDest, dest)}`,
      sources: pickSources(regDest, 'DEST')
    });
  }

  // Step 3: AIB Gas Hub Evaluation
  if (regOrig.aib === 'CONNECTED' && regDest.aib === 'CONNECTED') {
    // Check if origin is import-only on AIB
    if (regOrig.aibImportOnly) {
      return {
        status: 'NOT_POSSIBLE',
        via: 'AIB',
        grade: 'RULE',
        reason: `${orig} (${regOrig.name}) is designated for gas imports only on the AIB Hub; exports are not permitted.`,
        sources: pickSources(regOrig, 'ORIGIN')
      };
    }

    // Destination-side import refusal check
    const destRefuses = (regDest.importRestrictions || []).some(
      r => r.refusesFrom && (r.refusesFrom.includes(orig) || r.refusesFrom.includes('ALL'))
    );
    if (destRefuses) {
      const refusalRule = (regDest.importRestrictions || []).find(r => r.refusesFrom && (r.refusesFrom.includes(orig) || r.refusesFrom.includes('ALL')));
      return {
        status: 'NOT_POSSIBLE',
        via: 'AIB',
        grade: 'RULE',
        reason: `Destination registry ${dest} (${regDest.name}) refuses imports from ${orig}: ${refusalRule?.text || 'Import restriction applies'}.`,
        sources: pickSources(regDest, 'DEST')
      };
    }

    // Origin-side export restriction check
    const origRestricts = (regOrig.exportRestrictions || []).find(
      r => r.appliesTo && (r.appliesTo.includes(dest) || r.appliesTo.includes('ALL'))
    );

    // Conditional AIB transfers: destination-side and origin-side conditions both apply.
    const conds = aibConds(orig, dest, 'RULE');
    if (!conds.length && origRestricts) conds.push([origRestricts.text, origRestricts.text]);
    const condition = conds.length ? conds.map(c => c[0]).join(' ') : null;
    const reason = conds.length
      ? `Transfer via AIB Hub possible, but ${conds.map(c => c[1]).join('; and ')}.`
      : 'EECS gas GO transfer via AIB Hub permitted.';

    // Origin export evidence plus destination import evidence only (not the reverse).
    return {
      status: 'POSSIBLE',
      via: 'AIB',
      grade: 'RULE',
      condition,
      reason,
      sources: [...pickSources(regOrig, 'ORIGIN'), ...pickSources(regDest, 'DEST')]
    };
  }

  // Step 4: ERGaR Hub Evaluation
  if (regOrig.ergar === 'PARTICIPANT' && regDest.ergar === 'PARTICIPANT') {
    // Shared ERGaR hub, but unverified by explicit bilateral list
    return {
      status: 'OPEN',
      via: 'ERGAR',
      grade: 'RULE',
      reason: `Both ${orig} and ${dest} participate in the ERGaR CoO scheme, but neither registry has published explicit acceptance of this bilateral corridor.`,
      openQuestionId: `Q-${orig}-1`,
      sources: [...pickSources(regOrig, 'ORIGIN'), ...pickSources(regDest, 'DEST')]
    };
  }

  // Step 5: No shared hub
  let noHubReason = `No shared hub: ${orig} (${regOrig.aib === 'CONNECTED' ? 'AIB' : regOrig.ergar === 'PARTICIPANT' ? 'ERGaR' : 'no hub'}) and ${dest} (${regDest.aib === 'CONNECTED' ? 'AIB' : regDest.ergar === 'PARTICIPANT' ? 'ERGaR' : 'no hub'}) do not share a common operational transfer hub.`;
  if (orig === 'DK' && dest === 'CZ') {
    noHubReason = 'No shared hub: DK (Energinet) is not connected to the AIB Gas Hub (applicant only; ERGaR participant), while CZ (OTE) is connected to AIB Gas Hub and does not participate in ERGaR.';
  }
  return withWorkaround({
    status: 'NOT_POSSIBLE',
    via: null,
    grade: 'RULE',
    reason: noHubReason,
    sources: [...pickSources(regOrig, 'ORIGIN'), ...pickSources(regDest, 'DEST')]
  });
}

// -------------------------------------------------------------
// PoS Layer Evaluation Logic
// -------------------------------------------------------------
// Origin gate applied to EVERY destination scheme branch:
//   IN   - grid inside the single EU mass-balance system, no open export question
//   OPEN - research leaves the origin's right to export PoS open (BG GR HR LU RO SI BE) or two readings conflict (IE)
//   OUT  - third-country grid outside the single EU mass-balance system (GB CH NO)
function originGate(orig, od) {
  if (od.exportStatus === 'OPEN') {
    return { state: 'OPEN', reason: od.exportReason, openQuestionId: od.exportOpenQuestionId || null };
  }
  if (od.inEuMassBalanceSystem) return { state: 'IN' };
  return { state: 'OUT', reason: `${orig} is outside the single EU mass-balance system (${od.reason}).` };
}

function computePosPair(orig, dest, goResult = computeGoPair(orig, dest)) {
  const origData = POS_ORIGIN[orig];
  const destSchemes = POS_DEST_SCHEMES[dest] || [];

  if (destSchemes.length === 0) {
    return {
      schemes: [],
      summary: {
        status: 'OPEN',
        schemeId: null,
        reason: `No specific national compliance scheme documented for destination ${dest}.`
      }
    };
  }

  const gate = originGate(orig, origData);
  const volumeRule = origData.supportedVolumeRule;
  const volumeCondition = volumeRule && volumeRule.condition ? `Origin ${orig}: ${volumeRule.condition}.` : null;

  const schemeResults = destSchemes.map(scheme => {
    let status = 'OPEN';
    let reason = scheme.reason;
    let conditions = scheme.conditions;
    let openQuestionId = scheme.openQuestionId || null;
    const outOfSystem = () => {
      status = 'NOT_POSSIBLE';
      reason = gate.reason;
    };

    // A. Destination-side verdict, then the origin gate.
    if (scheme.acceptsForeign === 'NO') {
      status = 'NOT_POSSIBLE';
      reason = scheme.reason;
    } else if (scheme.acceptsForeign === 'YES') {
      if (scheme.originScope === 'EU_INTERCONNECTED') {
        if (gate.state === 'OUT') outOfSystem();
        else status = 'POSSIBLE';
      } else if (scheme.originScope === 'EU_EXCISE_TERRITORY') {
        // German THG-Quote BImSchG §37b(6) n.F.
        if (orig === 'NO') {
          status = 'NOT_POSSIBLE';
          reason = 'Norway has no connected onshore pipeline infrastructure for biomethane delivery.';
        } else if (orig === 'GB' || orig === 'CH') {
          status = 'OPEN';
          conditions = 'Third-country grid physically connected to EU grid; UDB registration of all transaction and sustainability data; Quotenstelle verification.';
          reason = 'BImSchG §37b(6) Nr. 2 permits mass-balanced injection from physically connected third countries provided transactions and sustainability attributes are recorded in the UDB; administrative proof rules pre-UDB are pending.';
          openQuestionId = 'Q-DE-2';
        } else {
          status = 'POSSIBLE';
        }
      } else if (scheme.originScope === 'ALL_INTERCONNECTED') {
        // e.g. UK RTFO: any interconnected pipeline route with booked and nominated capacity
        if (orig === 'NO') {
          status = 'NOT_POSSIBLE';
          reason = 'Norway has no connected onshore pipeline infrastructure for biomethane delivery.';
        } else {
          status = 'POSSIBLE';
        }
      } else {
        status = 'OPEN';
      }
    } else if (scheme.acceptsForeign === 'GO_REQUIRED') {
      // Scheme requires a GO in the destination registry
      if (dest === 'EE') {
        if (goResult.status === 'POSSIBLE') {
          status = 'OPEN';
          reason = 'Elering Domain Protocol E.10.3 states imported GOs cannot automatically count for national obligations; case-by-case approval is pending under Q-EE-1.';
          openQuestionId = 'Q-EE-1';
        } else if (goResult.status === 'OPEN') {
          status = 'OPEN';
          reason = 'Scheme requires an imported GO into Estonian registry, but GO corridor is currently open.';
          openQuestionId = 'Q-EE-1';
        } else {
          status = 'NOT_POSSIBLE';
          reason = `Scheme requires a GO in the EE registry, but no electronic GO transfer route exists from ${orig} to EE.`;
        }
        if (gate.state === 'OUT') outOfSystem();
      } else if (goResult.status === 'POSSIBLE') {
        if (gate.state === 'OUT') {
          outOfSystem();
        } else if (scheme.goEvidenceUnverified) {
          // GO corridor exists, but counting an AIB-imported GO under the national scheme is not verified end to end.
          status = 'OPEN';
          reason = `The GO corridor ${orig}>${dest} exists, but whether an AIB-imported GO can be redeemed for the ${dest} national scheme (end use, evidence and PoS) is not verified end to end; counting is unconfirmed until the registry or authority answers.`;
        } else {
          status = 'POSSIBLE';
          reason = `Eligible via imported GO into ${dest} registry combined with mass-balance PoS.`;
        }
      } else if (goResult.status === 'OPEN') {
        status = 'OPEN';
        reason = `Scheme requires an imported GO into ${dest} registry, but GO corridor ${orig}>${dest} is currently open.`;
      } else {
        status = 'NOT_POSSIBLE';
        reason = `Scheme requires a GO in the ${dest} registry, but no electronic GO transfer route exists from ${orig} to ${dest}.`;
      }
    } else if (scheme.acceptsForeign === 'OPEN') {
      if (scheme.originScope === 'GB_OR_INTERCONNECTED' && orig === 'GB') {
        // Ireland: GB-injected gas via Moffat is the only practical case; OPEN, not a generic third-country refusal.
        status = 'OPEN';
        reason = 'GB-injected gas delivered through the Moffat interconnector is the only practical route into Ireland: GNI recognises mass-balance certificates from other registries on a pilot basis with no standard procedure, and the Commission reading (secondary) that the UK grid is outside the EU system applies to GB and continental gas alike.';
        openQuestionId = 'Q-IE-1';
      } else if (gate.state === 'OUT') {
        outOfSystem();
      } else {
        status = 'OPEN';
      }
    }

    // B. Origin gate overlay: a POSSIBLE or OPEN destination verdict cannot be better than OPEN when the origin's
    //    export right (or its place in the single mass-balance system) is open.
    if (gate.state === 'OPEN' && status !== 'NOT_POSSIBLE') {
      const destReason = reason;
      const wasPossible = status === 'POSSIBLE';
      status = 'OPEN';
      if (wasPossible) {
        reason = `${gate.reason} Destination side (${dest}): ${destReason}`;
        openQuestionId = gate.openQuestionId || openQuestionId;
      } else {
        reason = `${destReason} Origin side (${orig}): ${gate.reason}`;
      }
    }

    // C. Origin supported-volume rule and destination conditions.
    if (status !== 'NOT_POSSIBLE' && volumeCondition) {
      const base = conditions && conditions !== 'None' ? conditions : null;
      conditions = base ? `${base} ${volumeCondition}` : volumeCondition;
    }

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      legalBasis: scheme.legalBasis,
      status,
      conditions,
      reason,
      openQuestionId,
      // Origin evidence plus destination scheme evidence.
      sources: [...(origData.sources || []), ...(scheme.sources || [])]
    };
  });

  // Determine summary: best status across destination schemes
  // Ranking: POSSIBLE (3) > OPEN (2) > NOT_POSSIBLE (1)
  const rank = s => (s === 'POSSIBLE' ? 3 : s === 'OPEN' ? 2 : 1);
  let best = schemeResults[0];
  for (const s of schemeResults) {
    if (rank(s.status) > rank(best.status)) {
      best = s;
    }
  }

  return {
    schemes: schemeResults,
    summary: {
      status: best.status,
      schemeId: best.schemeId,
      schemeName: best.schemeName,
      conditions: best.conditions,
      reason: best.reason
    }
  };
}

export { computeGoPair, computePosPair };

// -------------------------------------------------------------
// Execute All 756 Pairs Computation (When run directly)
// -------------------------------------------------------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMain) {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log('Computing biomethane route matrix for 28 countries (756 ordered pairs)...');

  const matrixData = {
    generatedAt: '2026-10-04T00:00:00Z',
  countries: COUNTRIES,
  pairsCount: 756,
  counts: {
    go: {
      POSSIBLE: 0,
      NOT_POSSIBLE: 0,
      OPEN: 0,
      grades: {
        OBSERVED: 0,
        PUBLISHED: 0,
        RULE: 0
      }
    },
    posSummary: {
      POSSIBLE: 0,
      NOT_POSSIBLE: 0,
      OPEN: 0
    }
  },
  pairs: {}
};

for (const orig of COUNTRIES) {
  for (const dest of COUNTRIES) {
    if (orig === dest) continue;

    const pairKey = `${orig}>${dest}`;
    const goRes = computeGoPair(orig, dest);
    const posRes = computePosPair(orig, dest, goRes);

    matrixData.pairs[pairKey] = {
      origin: orig,
      destination: dest,
      go: goRes,
      pos: posRes
    };

    // Update GO counts
    matrixData.counts.go[goRes.status]++;
    if (goRes.status === 'POSSIBLE') {
      matrixData.counts.go.grades[goRes.grade]++;
    }

    // Update PoS summary counts
    matrixData.counts.posSummary[posRes.summary.status]++;
  }
}

console.log('Matrix computation complete.');
console.log('GO Layer Counts:', matrixData.counts.go);
console.log('PoS Summary Counts:', matrixData.counts.posSummary);

// Write route-matrix.json
const jsonPath = path.join(OUT_DIR, 'route-matrix.json');
fs.writeFileSync(jsonPath, JSON.stringify(matrixData, null, 2), 'utf-8');
console.log(`Saved: ${jsonPath}`);

// -------------------------------------------------------------
// Generate ROUTE-MATRIX.md
// -------------------------------------------------------------
function generateMarkdown() {
  const lines = [];
  lines.push('# Pan-European Biomethane Cross-Border Route Matrix');
  lines.push(`*Generated: ${matrixData.generatedAt} | Scope: 28 European Countries | 756 Ordered Pairs*`);
  lines.push('');
  lines.push('## Executive Summary & Cell Counts');
  lines.push('');
  lines.push('### GO Layer (Book-and-Claim Transfer via Hubs)');
  lines.push(`- **Total Ordered Pairs**: 756`);
  lines.push(`- **POSSIBLE (P)**: ${matrixData.counts.go.POSSIBLE}`);
  lines.push(`  - **Observed Transfers (Po)**: ${matrixData.counts.go.grades.OBSERVED}`);
  lines.push(`  - **Published Acceptance Lists (Pp)**: ${matrixData.counts.go.grades.PUBLISHED}`);
  lines.push(`  - **Hub Membership Rule (Pr)**: ${matrixData.counts.go.grades.RULE}`);
  lines.push(`- **NOT POSSIBLE (N)**: ${matrixData.counts.go.NOT_POSSIBLE}`);
  lines.push(`- **OPEN / Awaiting Confirmation (O)**: ${matrixData.counts.go.OPEN}`);
  lines.push('');
  lines.push('### PoS Layer (Grid Mass Balance into Compliance Schemes)');
  lines.push(`- **Total Ordered Pairs**: 756`);
  lines.push(`- **POSSIBLE (P)**: ${matrixData.counts.posSummary.POSSIBLE}`);
  lines.push(`- **NOT POSSIBLE (N)**: ${matrixData.counts.posSummary.NOT_POSSIBLE}`);
  lines.push(`- **OPEN (O)**: ${matrixData.counts.posSummary.OPEN}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. 28×28 Grid: GO Layer (Electronic Registry Transfers)');
  lines.push('');
  lines.push('**Grid Legend:**');
  lines.push('- **Po**: Possible (Observed commercial-size transfers on AIB hub Jan 2024 - Aug 2026; test-size flows of 5 MWh or less are graded Pr)');
  lines.push('- **Pp**: Possible (Published bilateral acceptance list / agreement)');
  lines.push('- **Pr**: Possible (Hub membership rule: both registries connected, no bar; includes lanes where only test-size transfers (5 MWh or less) have been observed)');
  lines.push('- **N**: Not possible (No shared hub, registry non-operational, or explicit statutory refusal)');
  lines.push('- **O**: Open (Shared hub but bilateral acceptance unsettled, or Brussels (BRUGEL) as destination: AIB-gas connected on paper, no transfer ever recorded)');
  lines.push('- **-**: Domestic / Self (Diagonal)');
  lines.push('');

  // GO Grid Table
  let header = '| From \\ To | ' + COUNTRIES.join(' | ') + ' |';
  let sep = '|---|' + COUNTRIES.map(() => '---').join('|') + '|';
  lines.push(header);
  lines.push(sep);

  for (const orig of COUNTRIES) {
    const row = [orig];
    for (const dest of COUNTRIES) {
      if (orig === dest) {
        row.push('-');
      } else {
        const pair = matrixData.pairs[`${orig}>${dest}`];
        if (pair.go.status === 'POSSIBLE') {
          const suffix = pair.go.grade === 'OBSERVED' ? 'o' : pair.go.grade === 'PUBLISHED' ? 'p' : 'r';
          row.push(`P${suffix}`);
        } else if (pair.go.status === 'NOT_POSSIBLE') {
          row.push('N');
        } else {
          row.push('O');
        }
      }
    }
    lines.push('| ' + row.join(' | ') + ' |');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. 28×28 Grid: PoS Layer Summary (Grid Mass Balance Compliance)');
  lines.push('');
  lines.push('**Grid Legend:**');
  lines.push('- **P**: Possible (Destination scheme accepts mass-balanced gas from this origin)');
  lines.push('- **N**: Not possible (Scheme excludes foreign gas, origin is outside EU system, or missing required GO link)');
  lines.push('- **O**: Open (Administrative rules or cross-border verification unsettled; origin export right open (BE BG GR HR LU RO SI); IE origin where the statute and the Commission reading conflict; GO corridor exists but national counting unverified (ES HU LV))');
  lines.push('- **-**: Domestic / Self (Diagonal)');
  lines.push('');

  // PoS Grid Table
  lines.push(header);
  lines.push(sep);

  for (const orig of COUNTRIES) {
    const row = [orig];
    for (const dest of COUNTRIES) {
      if (orig === dest) {
        row.push('-');
      } else {
        const pair = matrixData.pairs[`${orig}>${dest}`];
        const s = pair.pos.summary.status;
        row.push(s === 'POSSIBLE' ? 'P' : s === 'NOT_POSSIBLE' ? 'N' : 'O');
      }
    }
    lines.push('| ' + row.join(' | ') + ' |');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 3. Country-by-Country Route Audits (All 28 Origins)');
  lines.push('');

  for (const orig of COUNTRIES) {
    const regOrig = REGISTRIES[orig];
    const posOrig = POS_ORIGIN[orig];
    lines.push(`### Origin: ${orig} — ${regOrig.name}`);
    lines.push(`- **Hub Connectivity**: AIB: \`${regOrig.aib}\` | ERGaR: \`${regOrig.ergar}\` | Operational: \`${regOrig.operational}\``);
    lines.push(`- **EU Mass-Balance System**: \`${posOrig.inEuMassBalanceSystem ? 'YES' : 'NO'}\` (${posOrig.reason})`);
    if (posOrig.exportStatus) {
      lines.push(`- **PoS Export Status**: \`${posOrig.exportStatus}\` (${posOrig.exportOpenQuestionId}) - ${posOrig.exportReason}`);
    }
    if (posOrig.supportedVolumeRule) {
      lines.push(`- **Supported Volume Rule**: ${posOrig.supportedVolumeRule.text} [\`${posOrig.supportedVolumeRule.effect}\`]${posOrig.supportedVolumeRule.condition ? ` - condition applied to PoS routes: ${posOrig.supportedVolumeRule.condition}` : ''}`);
    }
    if (regOrig.exDomainOut) {
      const exStat = regOrig.exDomainOut.status || regOrig.exDomainOut;
      lines.push(`- **Ex-Domain Cancellation Policy**: \`${exStat}\` — ${regOrig.exDomainOut.note || regOrig.exDomainNote || ''}`);
    }
    lines.push('');
    lines.push('| Dest | GO Status | Via | Grade | GO Reason / Workaround | PoS Status | PoS Best Scheme | PoS Reason & Conditions |');
    lines.push('|---|---|---|---|---|---|---|---|');

    for (const dest of COUNTRIES) {
      if (orig === dest) continue;
      const pair = matrixData.pairs[`${orig}>${dest}`];
      const go = pair.go;
      const pos = pair.pos.summary;

      const goStatStr = go.status === 'POSSIBLE' ? `P (${go.grade})` : go.status === 'NOT_POSSIBLE' ? 'N' : 'O';
      const goViaStr = go.via || '-';
      let goReasonStr = go.reason;
      if (go.workaround) {
        goReasonStr += ` **Workaround:** ${go.workaround}`;
      }
      if (go.condition) {
        goReasonStr += ` **Condition:** ${go.condition}`;
      }

      const posStatStr = pos.status === 'POSSIBLE' ? 'P' : pos.status === 'NOT_POSSIBLE' ? 'N' : 'O';
      const posSchemeStr = pos.schemeId || '-';
      let posReasonStr = pos.reason;
      if (pos.conditions) {
        posReasonStr += ` *Conditions:* ${pos.conditions}`;
      }

      // Format clean Markdown table cells (replace newlines and vertical bars)
      const clean = text => (text ? text.replace(/\|/g, '\\|').replace(/\n/g, ' ') : '');

      lines.push(`| ${dest} | ${clean(goStatStr)} | ${clean(goViaStr)} | ${go.grade || '-'} | ${clean(goReasonStr)} | ${clean(posStatStr)} | ${clean(posSchemeStr)} | ${clean(posReasonStr)} |`);
    }
    lines.push('');
  }

  const mdPath = path.join(OUT_DIR, 'ROUTE-MATRIX.md');
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf-8');
  console.log(`Saved: ${mdPath}`);
}

  generateMarkdown();
  console.log('All computations and matrix generation completed successfully.');
}
