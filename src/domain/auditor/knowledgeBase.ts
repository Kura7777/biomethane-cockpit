/**
 * Knowledge Vault for the Closed-Domain Auditor.
 *
 * UNIFIED STATUTORY ARCHITECTURE:
 * `src/domain/citations/registry.ts` is the single source of truth for statutory legislation.
 * This module compiles its dossiers directly from `LEGAL_CITATIONS`, supplemented only by
 * specialized commercial contracts (EFET Biomethane) and cross-border registry connectivity dossiers.
 *
 * Invariants:
 *  - Each document carries `sources` (article or document citation >= 10 chars).
 *  - Fixed legal numbers and formulas are derived directly from the single-source citations registry.
 *  - Verbatim excerpts and statutory provisions are maintained with character-level accuracy.
 */

import { LEGAL_CITATIONS, getCitationById } from '../citations/registry';
import { LegalCitation } from '../citations/types';
import {
  RED3_TRANSPORT_MAX_CI,
} from '../regulatory/constants';
import {
  CI_COMPARATOR_ROAD_TRANSPORT,
} from '../markets/constants';

export interface KnowledgeDocument {
  id: string;
  title: string;
  sourceFile: string;
  category: 'EU_DIRECTIVE' | 'NATIONAL_QUOTA' | 'UDB_REGISTRY' | 'CONTRACTS' | 'FUELEU';
  /** The article, annex or document each statement in `content` rests on. Never empty. */
  sources: string[];
  content: string;
}

const TRANSPORT_SAVING_PCT = Math.round((1 - RED3_TRANSPORT_MAX_CI / CI_COMPARATOR_ROAD_TRANSPORT) * 100);

/**
 * Helper to compile an individual LegalCitation into a KnowledgeDocument.
 */
function compileCitationDossier(
  citation: LegalCitation,
  customId?: string,
  customTitle?: string,
  customSourceFile?: string,
  customCategory?: KnowledgeDocument['category']
): KnowledgeDocument {
  const categoryMap: Record<string, KnowledgeDocument['category']> = {
    EU_DIRECTIVE: 'EU_DIRECTIVE',
    EU_REGULATION: 'EU_DIRECTIVE',
    NATIONAL_QUOTA_LAW: 'NATIONAL_QUOTA',
    CERTIFICATION_SCHEME: 'EU_DIRECTIVE',
    GRID_AND_TARIFF: 'UDB_REGISTRY',
    GLOSSARY_TERM: 'EU_DIRECTIVE',
  };

  const primarySource = `${citation.officialTitle} (${citation.primaryArticle})`.trim();
  const validCrossRefs = (citation.crossReferences || [])
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const sources = [
    primarySource.length > 10 ? primarySource : `${citation.shortTitle} — Primary Legislation (${citation.primaryArticle})`,
    ...validCrossRefs,
  ];

  const contentParts: string[] = [
    citation.summary,
    citation.penaltiesOrCaps ? `Penalties/Caps: ${citation.penaltiesOrCaps}` : '',
    citation.deskRuleSummary ? `Trading Desk Rule: ${citation.deskRuleSummary}` : '',
    ...citation.keyStatutoryExcerpts.map(e => `Statutory Excerpt: "${e}"`),
  ].filter(Boolean);

  return {
    id: customId || citation.id,
    title: customTitle || `${citation.shortTitle} Dossier`,
    sourceFile: customSourceFile || `citations/registry.ts#${citation.id}`,
    category: customCategory || categoryMap[citation.category] || 'NATIONAL_QUOTA',
    sources,
    content: contentParts.join('\n\n'),
  };
}

// ---------------------------------------------------------------------------
// 1. Core Statutory Dossiers Compiled from LEGAL_CITATIONS
// ---------------------------------------------------------------------------

const redIiiCitation = getCitationById('eu-red-iii')!;
const fuelEuCitation = getCitationById('eu-fueleu-maritime')!;
const deCitation = getCitationById('de-bimschg-37a')!;
const frCpbCitation = getCitationById('fr-code-energie-cpb')!;
const frTiruertCitation = getCitationById('fr-tiruert')!;
const nlWetCitation = getCitationById('nl-wet-milieubeheer')!;
const nlGgeCitation = getCitationById('nl-gge-draft-besluit')!;
const itCitation = getCitationById('it-dm-2018-cic')!;
const gbCitation = getCitationById('gb-rtfo-order')!;
const udbCitation = getCitationById('eu-udb-regulation')!;
const ir996Citation = getCitationById('eu-ir-2022-996')!;

const RED_III_DOSSIER: KnowledgeDocument = {
  id: 'red_iii_directive',
  title: 'RED III Directive (EU) 2023/2413 & Gating Architecture',
  sourceFile: '01_EU_Statutory_Directives_and_RED_III.md',
  category: 'EU_DIRECTIVE',
  sources: redIiiCitation.crossReferences.filter(s => s.trim().length > 10),
  content: redIiiCitation.summary,
};

const FUELEU_MARITIME_DOSSIER: KnowledgeDocument = {
  id: 'fueleu_maritime',
  title: 'FuelEU Maritime Regulation (EU) 2023/1805 & EU ETS Maritime',
  sourceFile: '11_FuelEU_Maritime_and_EU_ETS_Shipping_Desk.md',
  category: 'FUELEU',
  sources: fuelEuCitation.crossReferences.filter(s => s.trim().length > 10),
  content: fuelEuCitation.summary,
};

const GERMANY_BIMSCHV_DOSSIER: KnowledgeDocument = {
  id: 'germany_38_bimschv',
  title: 'German THG-Quote, 38. BImSchV & § 37a BImSchG',
  sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
  category: 'NATIONAL_QUOTA',
  sources: deCitation.crossReferences.filter(s => s.trim().length > 10),
  content: deCitation.summary,
};

const FRANCE_CPB_TIRUERT_DOSSIER: KnowledgeDocument = {
  id: 'france_cpb_tiruert',
  title: 'France CPB Obligation (Code de l\'énergie) & TIRUERT Transport Tax',
  sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
  category: 'NATIONAL_QUOTA',
  sources: [...frCpbCitation.crossReferences, ...frTiruertCitation.crossReferences].filter(s => s.trim().length > 10),
  content: frCpbCitation.summary,
};

const NETHERLANDS_ERE_DOSSIER: KnowledgeDocument = {
  id: 'netherlands_ere_hbe',
  title: 'Netherlands Wet milieubeheer, NEa ERE Rules & Green-Gas Obligation',
  sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
  category: 'NATIONAL_QUOTA',
  sources: [...nlWetCitation.crossReferences, ...nlGgeCitation.crossReferences].filter(s => s.trim().length > 10),
  content: nlWetCitation.summary,
};

const ITALY_CIC_DOSSIER: KnowledgeDocument = {
  id: 'italy_cic_pnrr',
  title: 'Italy CIC (DM 2 March 2018) & PNRR Biomethane Decree (DM 15 September 2022)',
  sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
  category: 'NATIONAL_QUOTA',
  sources: itCitation.crossReferences.filter(s => s.trim().length > 10),
  content: itCitation.summary,
};

const UK_RTFO_DOSSIER: KnowledgeDocument = {
  id: 'uk_rtfo_rggo',
  title: 'UK RTFO Order (SI 2007/3072) & Green Gas Certification Scheme (RGGO)',
  sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
  category: 'NATIONAL_QUOTA',
  sources: gbCitation.crossReferences.filter(s => s.trim().length > 10),
  content: gbCitation.summary,
};

const UDB_MASS_BALANCE_DOSSIER: KnowledgeDocument = {
  id: 'udb_mass_balance',
  title: 'Union Database (UDB) & Registry State Machine',
  sourceFile: '03_UDB_and_European_Registry_Architecture.md',
  category: 'UDB_REGISTRY',
  sources: [...udbCitation.crossReferences, ...ir996Citation.crossReferences].filter(s => s.trim().length > 10),
  content: udbCitation.summary,
};

// ---------------------------------------------------------------------------
// 2. Specialized Contractual & Cross-Border Hub Connectivity Dossiers
// ---------------------------------------------------------------------------

const EFET_BIOMETHANE_DOSSIER: KnowledgeDocument = {
  id: 'efet_biomethane_contracts',
  title: 'Desk Biomethane Contract Positions (EFET-based) & Offtake Protection',
  sourceFile: '04_EFET_Biomethane_Contract_Term_Sheet_Analysis.md',
  category: 'CONTRACTS',
  sources: [
    'EFET Biogas Certificates Standard Single Trade Agreement (built on the EFET EECS Certificate Master Agreement) and its guidance note, 2023',
    'Desk Trade Builder EFET Annex and term sheet (desk template, not an EFET publication)',
  ],
  content: `EFET publishes a Biogas Certificates Standard Single Trade Agreement (based on its EECS Certificate Master Agreement), whose guidance note tells users to check the status of the Union Database before trading. The vault holds no EFET "Biomethane Master Agreement" text. The terms below are the desk's own template positions for negotiation, not EFET standard clauses.
Separate the molecule from the environmental attribute: physical gas is delivered at a virtual trading point and priced on a wholesale index such as TTF Day-Ahead, while the Proof of Sustainability (PoS) and any Guarantee of Origin travel as environmental attributes.
Sustainability-proof default (desk position): if the seller delivers gas but fails to deliver a valid PoS that meets the audited RED criteria (at least ${TRANSPORT_SAVING_PCT}% GHG savings for transport use), the buyer may re-price the trade down to the gas index without paying the green premium.
Cure period and remedies: agree a cure period for late PoS delivery, replacement-cost cover if it is not cured, and a termination trigger. The lengths of these periods are negotiated per deal; the vault does not hold standard numbers.`,
};

const GO_HUB_CONNECTIVITY_DOSSIER: KnowledgeDocument = {
  id: 'go_hub_connectivity',
  title: 'Cross-border GO transfers: AIB vs ERGaR hubs (research 4 Oct 2026)',
  sourceFile: 'docs/research/registry-hub-connectivity-2026-10-04.md',
  category: 'UDB_REGISTRY',
  sources: [
    'docs/research/registry-hub-connectivity-2026-10-04.md sections 1 to 4 (AIB registries list, ERGaR CoO scheme page, dena partner list, AIB domain protocols)',
  ],
  content: `A biomethane Guarantee of Origin (GO) moves between registries only if both sit on the same hub and accept each other. Never assume a GO route.
AIB gas hub, gas-connected registries: AT E-Control, BE Brugel (Brussels), CZ OTE, EE Elering, FI Gasgrid, FR EEX, HU MEKH, IT GSE, LV Conexus, LT Amber Grid, NL VertiCer, PT REN, SK SPP-distribuacia, ES Enagas GTS, SE Energimyndigheten, CH Pronovo. Pronovo (CH) is gas imports only on AIB, no exports.
Energinet (DK) is on ERGaR only; it has been an AIB Gas Scheme applicant since 17 Jun 2026 with no connection date published (AIB-connected for electricity only).
dena (DE) is ERGaR-only and not on the AIB gas hub. GGCS (GB) is ERGaR-only.
ERGaR CoO participants: AT AGCS, DK Energinet, DE dena, SK SPP-distribuacia, CH Pronovo, GB GGCS, LT Amber Grid, plus NL VertiCer (active per ERGaR statistics). Each ERGaR registry chooses whom it accepts. dena's published partner list is NL, GB, AT, DK and SK only.
Ex-domain cancellation (workaround without a shared hub): not allowed in ES, IT, NL and SE; CZ only under exceptional circumstances confirmed by state stakeholders; FR only with an ex-domain cancellation agreement signed with the other issuing body (no such agreement was found). So there is no practical GO path from DK to ES or CZ today, DK to FR depends on an agreement that was not found, and a path from ES or CZ to DE is not available on the sources held.
Italy: GOs from supported transport/other-use plants cannot be exported. GB to DE: non-EU quantities need extra mass-balance proof at dena.
GO hub connectivity does not govern Proof of Sustainability / mass-balance compliance trades (DE THG, NL ERE, FR CPB, etc.): those move on mass balance, not through GO registries.`,
};

// ---------------------------------------------------------------------------
// 3. Pan-European Citations Compiled into Knowledge Vault
// ---------------------------------------------------------------------------

// Core 8 legacy IDs mapped to their underlying primary citations
const CORE_LEGACY_DOSSIERS: KnowledgeDocument[] = [
  RED_III_DOSSIER,
  FUELEU_MARITIME_DOSSIER,
  GERMANY_BIMSCHV_DOSSIER,
  FRANCE_CPB_TIRUERT_DOSSIER,
  NETHERLANDS_ERE_DOSSIER,
  ITALY_CIC_DOSSIER,
  UK_RTFO_DOSSIER,
  UDB_MASS_BALANCE_DOSSIER,
  EFET_BIOMETHANE_DOSSIER,
  GO_HUB_CONNECTIVITY_DOSSIER,
];

// Compile all 41 statutory citations from LEGAL_CITATIONS
const ALL_COMPILED_CITATIONS: KnowledgeDocument[] = LEGAL_CITATIONS.map(citation =>
  compileCitationDossier(citation)
);

/**
 * Single Unified Knowledge Vault
 * Contains the 8 core statutory dossiers, 2 specialized commercial dossiers,
 * and all 41 pan-European statutory citations compiled directly from LEGAL_CITATIONS.
 */
export const KNOWLEDGE_VAULT_DOCS: KnowledgeDocument[] = [
  ...CORE_LEGACY_DOSSIERS,
  // Add all compiled citations that are not already present by ID
  ...ALL_COMPILED_CITATIONS.filter(
    doc => !CORE_LEGACY_DOSSIERS.some(legacy => legacy.id === doc.id)
  ),
];

/**
 * Returns formatted multi-document context for LLM prompt injection.
 */
export function getFullKnowledgeContext(): string {
  return KNOWLEDGE_VAULT_DOCS.map(doc =>
    `=== DOCUMENT: ${doc.title} (${doc.sourceFile}) ===\nSources: ${doc.sources.join('; ')}\n${doc.content}\n`
  ).join('\n\n');
}
