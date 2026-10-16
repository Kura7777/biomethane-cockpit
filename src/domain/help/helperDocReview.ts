/**
 * evaluate_contract_or_pos: a text-extraction check of pasted Proof-of-Sustainability text or a contract
 * snippet. It never verifies anything with the issuing body, the scheme database or the UDB, and it never
 * fills a missing certificate field with a default and then reports clearance on it: a field the text does
 * not state is reported as "not stated", and market clearance is withheld until CI, country and feedstock
 * are all stated. Contract text is not run through the PoS path; it gets a clause checklist instead.
 */
import { parseProofOfSustainability } from '../consignment/posParser';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { PRODUCING_ORIGINS } from '../arbitrage/origins';
import { buildArbitrageConsignment, originIsEuGrid } from '../arbitrage/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { buildCustodyClauses } from '../trade/custodyClauses';
import { MARKETS } from '../markets/registry';
import { CI_COMPARATOR_ROAD_TRANSPORT } from '../markets/constants';

export const DOC_REVIEW_LABEL = 'Text extraction only — not verified with the issuing body, the ISCC/REDcert database or the Union Database (UDB).';

/** Markets checked when no target market is named. */
const DEFAULT_CLEARANCE_MARKETS = ['DE_THG', 'NL_GGE', 'NL_ERE', 'IT_CIC', 'FR_CPB', 'UK_RTFO', 'EU_ETS1', 'FUELEU', 'VOL_SCOPE1'];

const POS_MARKERS = /proof\s+of\s+sustainability|nachhaltigkeitsnachweis|sustainability\s+declaration|\bPoS\b|EU-ISCC-Cert|REDcert-EU/i;
const CONTRACT_MARKERS = /\bEFET\b|governing\s+law|force\s+majeure|delivery\s+point|\bthe\s+seller\b|\bthe\s+buyer\b|agreement|\bparty\b|\bparties\b|terminat/i;

interface Clause { clause: string; pattern: RegExp }
const CLAUSES: Clause[] = [
  { clause: 'Governing law / jurisdiction', pattern: /governing\s+law|laws?\s+of\s+(?:england|the\s+netherlands|germany|france|spain)|jurisdiction|anwendbares\s+recht/i },
  { clause: 'Delivery point', pattern: /delivery\s+point|point\s+of\s+delivery|virtual\s+trading\s+point|delivery\s+location/i },
  { clause: 'Title transfer', pattern: /title\s+(?:and\s+risk\s+)?(?:shall\s+)?(?:pass|transfer)|transfer\s+of\s+title|passing\s+of\s+title/i },
  { clause: 'Sustainability data transfer (PoS / UDB)', pattern: /union\s+database|\bUDB\b|proof\s+of\s+sustainability|sustainability\s+(?:data|certificate|declaration)|mass\s+balance/i },
  { clause: 'Price / indexation', pattern: /contract\s+price|price\s+(?:shall|is|will)|indexation|index[\s-]linked|fixed\s+price|(?:€|eur)\s?\d/i },
  { clause: 'Volume tolerance / take-or-pay', pattern: /tolerance|take[-\s]or[-\s]pay|minimum\s+(?:daily|annual)\s+quantity|\bDCQ\b|\bACQ\b|(?:\+\/-|±)\s*\d+\s*%/i },
  { clause: 'Force majeure', pattern: /force\s+majeure/i },
  { clause: 'Termination', pattern: /terminat|event\s+of\s+default/i },
];

function snippet(text: string, m: RegExpExecArray): string {
  const start = Math.max(0, m.index - 30);
  return text.slice(start, Math.min(text.length, m.index + m[0].length + 60)).replace(/\s+/g, ' ').trim();
}

function reviewContract(text: string): Record<string, unknown> {
  const rows = CLAUSES.map(c => {
    const m = c.pattern.exec(text);
    return { clause: c.clause, found: m !== null, evidence: m ? snippet(text, m) : null };
  });
  return {
    documentType: 'contract (non-PoS text)',
    verification: DOC_REVIEW_LABEL,
    clauseChecklist: rows,
    found: rows.filter(r => r.found).map(r => r.clause),
    missing: rows.filter(r => !r.found).map(r => r.clause),
    note: 'Keyword check for presence only. It does not judge whether a clause is adequate, and a full legal clause review is not supported here. Not legal advice.',
  };
}

function statedCountry(text: string): string | null {
  const m = text.match(/(?:country|land|pays|stato)\s*[:=]?\s*([A-Z]{2})\b/i);
  if (m) return m[1].toUpperCase();
  if (/Denmark|Danish|Energinet/i.test(text)) return 'DK';
  if (/Germany|Deutschland|BNetzA/i.test(text)) return 'DE';
  if (/France|Français|GRTgaz/i.test(text)) return 'FR';
  if (/Netherlands|Nederland|VertiCer/i.test(text)) return 'NL';
  if (/Italy|Italia|GSE/i.test(text)) return 'IT';
  if (/Spain|España|Enagás/i.test(text)) return 'ES';
  if (/United Kingdom|Great Britain|Ofgem/i.test(text)) return 'GB';
  return null;
}

function statedCommissioningYear(text: string): number | null {
  const m = text.match(/(?:commission(?:ed|ing)(?:\s+date)?|in\s+operation\s+since|start[\s-]*up(?:\s+date)?|inbetriebnahme)\s*[:=]?\s*(?:\d{1,2}[./-]\d{1,2}[./-])?(\d{4})/i);
  return m ? parseInt(m[1], 10) : null;
}

export function evaluateDocument(text: string, targetMarketId: string | null): Record<string, unknown> {
  const pos = parseProofOfSustainability(text);
  const isPos = pos.scheme !== 'UNKNOWN' || (POS_MARKERS.test(text) && !CONTRACT_MARKERS.test(text));
  if (!isPos) {
    if (CONTRACT_MARKERS.test(text)) return reviewContract(text);
    return {
      documentType: 'not recognised',
      verification: DOC_REVIEW_LABEL,
      note: 'The text does not look like a Proof of Sustainability (no scheme or certificate markers) or a contract. Nothing was evaluated.',
    };
  }

  const country = statedCountry(text);
  const ciStated = pos.custody.ciTotal !== null
    || /(?:g\s*co2(?:eq?)?\/?mj|gco2e\/mj)/i.test(text)
    || /(?:ghg\s*savings?|thg-minderung|einsparung)\s*[:=]?\s*\d/i.test(text);
  const feedstockStated = pos.substrates.length > 0;
  const volumeStated = pos.custody.mwh !== null;
  const chainStated = /book\s*(?:and|&)\s*claim|physical\s*segregation|bio-lng|cryogenic|mass[\s-]*balance/i.test(text);
  const commissioningYear = statedCommissioningYear(text);

  const fieldsFound: Record<string, unknown> = {};
  const fieldsDefaulted: string[] = [];
  const stated = (name: string, ok: boolean, value: unknown) => { if (ok) fieldsFound[name] = value; else fieldsDefaulted.push(name); };
  stated('scheme', pos.scheme !== 'UNKNOWN', pos.schemeLabel);
  stated('country', country !== null, country);
  stated('carbonIntensityGCo2Mj', ciStated, ciStated ? pos.carbonIntensityGCo2Mj : null);
  stated('feedstock', feedstockStated, pos.primaryFeedstockName);
  stated('volumeMWh', volumeStated, pos.custody.mwh);
  stated('chainOfCustody', chainStated, pos.chainOfCustody);
  stated('commissioningYear', commissioningYear !== null, commissioningYear);
  stated('udbNumber', pos.custody.udbNumber !== null, pos.custody.udbNumber);
  stated('certificateNumber', pos.certificateNumber !== 'UNSPECIFIED-POS-001', pos.certificateNumber);

  const auditFlags: string[] = [];
  if (pos.scheme === 'ISCC_PLUS') auditFlags.push('ISCC PLUS is a voluntary scheme, not a RED III compliance certificate.');
  if (pos.custody.udbNumber === null) auditFlags.push('Union Database (UDB) registration number is not stated in the text.');
  if (!pos.custody.ciSteps) auditFlags.push('Annex VI step values (eec, ep, etd, eccs) are not itemised in the text.');
  if (country === 'GB') auditFlags.push('GB-injected biomethane needs the UDB treatment confirmed for EU use.');

  const base = {
    documentType: 'Proof of Sustainability (text)',
    verification: DOC_REVIEW_LABEL,
    parserConfidence: pos.confidenceScore,
    schemeFound: pos.scheme !== 'UNKNOWN',
    scheme: pos.scheme,
    certificateNumber: fieldsFound.certificateNumber ?? 'not stated',
    issuingBody: pos.issuingBody === 'Accredited Certification Body' ? 'not stated' : pos.issuingBody,
    producerName: pos.producerName === 'Audited Biomethane Facility' ? 'not stated' : pos.producerName,
    countryCode: country ?? 'not stated',
    feedstock: feedstockStated ? pos.primaryFeedstockName : 'not stated',
    carbonIntensityGCo2Mj: ciStated ? pos.carbonIntensityGCo2Mj : 'not stated',
    ghgSavingVsRoadComparatorPct: ciStated ? Number((((CI_COMPARATOR_ROAD_TRANSPORT - pos.carbonIntensityGCo2Mj) / CI_COMPARATOR_ROAD_TRANSPORT) * 100).toFixed(1)) : 'not stated',
    statedCustody: pos.custody,
    fieldsFound,
    fieldsDefaulted,
    auditFlags,
  };

  const missingForClearance = [
    ...(ciStated ? [] : ['carbon intensity']),
    ...(country ? [] : ['country']),
    ...(feedstockStated ? [] : ['feedstock']),
  ];
  if (missingForClearance.length > 0) {
    return {
      ...base,
      marketClearance: null,
      clearanceNote: `Market clearance was NOT run: ${missingForClearance.join(', ')} not stated in the text. Nothing was assumed. Paste the full certificate or give those values.`,
    };
  }

  const profile = PRODUCING_ORIGINS[country as string];
  if (!profile) {
    return { ...base, marketClearance: null, clearanceNote: `Market clearance was NOT run: origin ${country} is not a supported producing origin in the desk.` };
  }
  const feedstock = FEEDSTOCK_REGISTRY[pos.canonicalFeedstock] ?? FEEDSTOCK_REGISTRY.manure;
  const consignment = buildArbitrageConsignment({
    originCountry: profile.countryCode,
    originCountryName: profile.countryName,
    feedstockKey: pos.canonicalFeedstock,
    feedstockName: feedstock.name,
    annexClassification: pos.annexIxClassification === 'ANNEX_IX_A' ? 'IX_A' : pos.annexIxClassification === 'ANNEX_IX_B' ? 'IX_B' : pos.annexIxClassification === 'CROP_BASED' ? 'CROP' : 'OTHER',
    carbonIntensity: pos.carbonIntensityGCo2Mj,
    scheme: pos.scheme === 'REDCERT_EU' ? 'REDCERT_EU' : pos.scheme === '2BSVS' ? '2BSVS' : pos.scheme === 'KZR_INIG' ? 'KZR_INIG' : pos.scheme === 'ISCC_PLUS' ? 'ISCC_PLUS' : 'ISCC_EU',
    chainOfCustody: pos.chainOfCustody,
    isEUGrid: originIsEuGrid(profile),
    volumeMWh: pos.custody.mwh ?? 0,
    commissioningYear,
    complianceYear: null,
  });

  const markets = targetMarketId
    ? MARKETS.filter(m => m.id === targetMarketId)
    : MARKETS.filter(m => DEFAULT_CLEARANCE_MARKETS.includes(m.id));
  if (markets.length === 0) {
    return { ...base, marketClearance: null, clearanceNote: `Unknown target market "${targetMarketId}".` };
  }

  const marketClearance = markets.map(m => {
    const el = evaluateEligibility(consignment, m);
    const ghg = el.gates.find(g => g.gate === 'GHG_THRESHOLD');
    return {
      marketId: m.id,
      marketName: m.name,
      verdict: el.overallVerdict,
      summary: el.summary,
      ghgGate: ghg ? { verdict: ghg.verdict, reason: ghg.reason } : null,
      failingGates: el.gates.filter(g => g.verdict === 'HARD_BLOCK').map(g => g.gateLabel),
      openItems: el.gates.flatMap(g => g.checklist?.filter(i => i.status === 'TODO' || (i.status === 'WARN' && i.id !== 'legislative-status')) ?? []).map(i => i.label),
    };
  });
  const custodyClauses = markets
    .map(m => {
      const clauses = buildCustodyClauses({ id: 'eval', targetMarketId: m.id, consignment } as never);
      return clauses ? { marketId: m.id, variant: clauses.variant, warrantiesCount: clauses.warranties.length, keyWarranties: clauses.warranties.slice(0, 3).map(w => `${w.ref}: ${w.text}`) } : null;
    })
    .filter(Boolean);

  return {
    ...base,
    marketClearance,
    custodyClauses,
    clearanceBasis: `Eligibility gates run on the STATED values only; ${commissioningYear === null ? 'commissioning year not stated, so the strictest GHG bar for the market is assumed' : `commissioning year ${commissioningYear}`}.`,
  };
}
