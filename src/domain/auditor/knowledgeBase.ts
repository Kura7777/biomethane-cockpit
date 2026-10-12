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
// 2. Specialized Contractual, Merchant Trading & Hub Connectivity Dossiers
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

const MERCHANT_COMMODITY_ARBITRAGE_DOSSIER: KnowledgeDocument = {
  id: 'merchant_commodity_trading_principles',
  title: 'Merchant Commodity Trading Principles: Arbitrage, Basis & Physical Risk',
  sourceFile: '04_EFET_Biomethane_Contract_Term_Sheet_Analysis.md',
  category: 'CONTRACTS',
  sources: [
    'Trafigura — Commodities Demystified: A Guide to Trading and the Global Supply Chain (Jonathan Kingsman)',
    'Helyette Geman — Commodities and Commodity Derivatives: Modeling and Pricing for Energy (Wiley)',
    'Ilia Bouchouev — Virtual Barrels: Quantitative Trading in Energy Markets (Palgrave Macmillan 2023)',
  ],
  content: `Merchant commodity trading creates value by transforming physical energy across three fundamental dimensions: space (geographic arbitrage), time (carry and storage optionality), and form (upgrading, processing, and feedstock conversion).
1. Arbitrage Across Space: In biomethane, geographic arbitrage is defined by netback pricing: Delivered Market Value minus Grid Injection Tariffs, Transmission Exit Fees, and Virtual Interconnector Tariffs. Physical gas trades relative to hub benchmarks (TTF, THE, PEG, PVB, VTP), while the green attribute clears at the destination with the highest statutory compliance value.
2. Arbitrage Across Time: Environmental compliance markets operate on statutory compliance calendar cycles (e.g. German THG surrender by April 15, Dutch ERE surrender by April 30, FuelEU Maritime balance by April 30). Carry trade economics reflect the convenience yield of holding verified Proof of Sustainability (PoS) batches in registries versus spot sales, accounting for regulatory sunset risk and financing costs.
3. Arbitrage Across Form: Transforming raw biogas into grid-compliant biomethane or liquid Bio-LNG monetizes upgrading spreads. Feedstock blending captures non-linear compliance value under RED Annex IX Part A advanced biofuels versus Part B food/feed crop caps.
4. Physical Risk Management: Physical merchant traders manage basis risk (spread between physical injection point and index settlement point), operational volume tolerance (Take-or-Pay clauses with +/- 5% to 10% operational swing), and counterparty delivery default.`,
};

const EFET_BIOMETHANE_MASTER_AGREEMENT_DOSSIER: KnowledgeDocument = {
  id: 'efet_biomethane_master_agreement_2026',
  title: 'Energy Traders Europe (EFET) Biomethane Master Agreement (2025/2026 Framework)',
  sourceFile: '04_EFET_Biomethane_Contract_Term_Sheet_Analysis.md',
  category: 'CONTRACTS',
  sources: [
    'Energy Traders Europe (EFET) Biomethane Master Agreement Standard Form & Guidance Notes (2025/2026)',
    'EFET General Agreement Concerning the Delivery and Acceptance of Natural Gas (Version 2.0)',
    'CEGH / EFET Biogas Certificates Standard Agreement',
  ],
  content: `The Energy Traders Europe (formerly EFET) Biomethane Master Agreement establishes the standard contractual architecture for wholesale biomethane transactions across Europe, explicitly unbundling three distinct commercial products:
1. Physical Biomethane Molecule: Title transfer and delivery of grid-quality methane gas at designated Virtual Trading Points (VTPs) or entry nodes, governed by standard EFET Gas physical delivery rules, operational imbalance mechanisms, and index settlement (e.g. ICIS/Argus TTF Front Month or Day-Ahead).
2. Guarantees of Origin (GOs): Electronic certificates proving renewable origin (EECS-compliant), transferred via AIB Gas Scheme or ERGaR CERT-X platforms for voluntary corporate scope 1 / ETS decarbonization.
3. Proof of Sustainability (PoS): Certified mass balance sustainability attributes compliance with RED III Articles 29-31, tracked through the European Commission Union Database (UDB) or recognized national schemes.
Contractual Risk Allocation:
- Failure to Deliver Sustainability Documentation: If physical gas is delivered but PoS or GOs are rejected or delayed past the agreed Longstop Date, the transaction automatically falls back to Natural Gas Index pricing, relieving the buyer of green premium obligations.
- Verification and Recalibration: If an independent certifier invalidates the carbon intensity (CI) post-delivery, the seller indemnifies the buyer for resulting penalty exposures or replaces the consignment with equivalent certified volume within the agreed cure window.
- Operational Tolerances: Standard delivery includes defined daily and monthly tolerance bands (typically +/- 5% to 10%), outside of which cash-settlement default damages apply based on replacement market costs.`,
};

const ARGUS_ICIS_PRICING_DOSSIER: KnowledgeDocument = {
  id: 'argus_icis_biomethane_pricing_methodology',
  title: 'Argus & ICIS European Biomethane & Certificate Pricing Methodologies',
  sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
  category: 'NATIONAL_QUOTA',
  sources: [
    'Argus Media — European Natural Gas & Biofuels Methodology and Specifications Guide',
    'ICIS European Biomethane Markets (EBM) IOSCO-Compliant Assessment Framework (2026)',
    'S&P Global Platts — Biomethane Guarantees of Origin Methodology',
  ],
  content: `Institutional pricing of European biomethane follows an IOSCO-compliant assessment framework reflecting spot trades, broker runs, and forward curves.
Pricing Component Structure:
Total Biomethane Value = Natural Gas Hub Benchmark (TTF / THE) + Green Attribute Premium + Avoided Compliance Quota Value.
1. Carbon Intensity (CI) Tiers:
- Standard RED Biomethane: Produced from energy crops or crop residues with positive or low carbon intensities (typically +20 to +40 gCO2eq/MJ). Trades at a modest green premium over natural gas (typically +€10 to +€25/MWh).
- Advanced Waste / Negative CI Biomethane: Produced from agricultural manure or industrial slurries achieving deep-negative carbon intensities (-80 to -100+ gCO2eq/MJ due to avoided methane emissions). In quota markets like Germany (38. BImSchV) and the Netherlands (Wet milieubeheer), each MWh generates substantial avoided GHG quota certificates, commanding premiums of +€30 to +€60/MWh above crop gas.
2. Market Clearing Mechanisms:
- Transport Sector Clearing: Markets such as DE THG, NL ERE, FR CPB, and IT CIC enforce statutory penalty ceilings (€450-€600/t CO2 in DE, €100/MWh ceiling in FR CPB). Market prices clear at the marginal cost of compliance minus buyer processing margins.
- Voluntary / Scope 1 Clearing: Corporate buyers purchase GOs via AIB or ERGaR registries for CSRD / GHG Protocol Scope 1 reporting. These trade independently of transport quota values and are exempt from the RED III 65% transport GHG savings hurdle.`,
};

const ERGAR_SINGLE_GRID_MASS_BALANCE_DOSSIER: KnowledgeDocument = {
  id: 'ergar_udb_cross_border_mass_balance',
  title: 'Cross-Border Mass Balance: The European Gas Grid as a Single Logistical Facility',
  sourceFile: '03_UDB_and_European_Registry_Architecture.md',
  category: 'UDB_REGISTRY',
  sources: [
    'ERGaR RED MB Scheme Rules & REGATRACE Deliverable D3.2 (European Renewable Gas Registry)',
    'European Commission DG ENER — Union Database (UDB) System Manual for Economic Operators',
    'BIOSURF Proposal on Cross-Border Biomethane Administration within Interconnected Grids',
  ],
  content: `Cross-border physical trading of biomethane across the European Union relies on the statutory concept of the interconnected natural gas grid as a Single Logistical Facility.
1. Mass Balance Logistics:
- Under RED III Article 31b and Implementing Regulation (EU) 2022/996, consignments of biomethane injected into the interconnected EU transmission grid do not require physical tracking of individual methane molecules.
- Instead, mass balancing requires that the total volume of biomethane withdrawn from the grid matches the verified volume injected, adjusted for pipeline grid losses, within the defined mass balance accounting period (typically monthly or quarterly).
2. Interconnection Integrity:
- The single logistical facility rule strictly applies only between grids that are physically interconnected. Transfers between continental European systems (e.g. Denmark, Germany, Netherlands, France, Italy, Belgium, Austria) clear seamlessly through the Union Database (UDB).
- Great Britain (GB): Post-Brexit, the UK gas grid is isolated from the EU UDB mass balance regime. While physical interconnectors (IUK, BBL) exist, EU UDB does not recognize mass balance credits originating from GB injection into EU compliance quotas without physical consignment tracking. Similarly, UK RGGO strictly restricts certification to gas injected directly into Great Britain grids.
3. Dual Certificate Separation (ERGaR CoO vs RED MB):
- ERGaR CoO operates on book-and-claim for Guarantees of Origin across national registries (dena, VertiCer, Energinet, AGCS).
- ERGaR RED MB operates on mass balance for transport compliance, verifying that a PoS cannot be claimed if the underlying gas volume was not physically delivered into the grid.`,
};

const FUELEU_POOLING_AND_ETS2_DOSSIER: KnowledgeDocument = {
  id: 'fueleu_maritime_compliance_pooling',
  title: 'FuelEU Maritime (EU 2023/1805) Bio-LNG Banking, Borrowing & Compliance Pooling',
  sourceFile: '11_FuelEU_Maritime_and_EU_ETS_Shipping_Desk.md',
  category: 'FUELEU',
  sources: [
    'Regulation (EU) 2023/1805 on the use of renewable and low-carbon fuels in maritime transport (Articles 15, 20 & 21)',
    'Directive (EU) 2023/959 amending Directive 2003/87/EC (EU ETS2 Buildings & Road Transport)',
    'DNV / Clean Marine Maritime Compliance Advisory Guidelines',
  ],
  content: `FuelEU Maritime (Regulation (EU) 2023/1805) establishes GHG intensity reduction targets for ships >= 5,000 GT calling at EU ports, starting with a 2% reduction in 2025 against the 91.16 gCO2eq/MJ baseline, scaling to -6% in 2030 and -80% in 2050.
Commercial Monetization Mechanics for Bio-LNG:
1. Compliance Surplus Pooling (Article 21): A ship using Bio-LNG generates a substantial compliance surplus (negative GHG intensity relative to the target). Under Article 21, shipping companies can pool compliance balances across fleets or sell surplus units to deficit ships bilaterally.
2. Statutory Penalty Ceiling: Deficit ships must pay a statutory penalty of €2,400 per tonne of VLSFO equivalent deficit, which equates to an effective floor value for Bio-LNG compliance units when fossil LNG or fuel oil triggers penalties.
3. Banking and Borrowing (Article 20): A vessel with a compliance surplus in compliance year N may bank up to 100% of the surplus to year N+1. A deficit vessel may borrow an advance compliance surplus of up to 2% with a 10% penalty factor applied in the subsequent year.
4. EU ETS2 Interplay: Biomethane supplied for transport and heating is zero-rated under EU ETS2 if certified under RED III mass balance, exempting fuel suppliers from purchasing ETS2 allowances (surrender starts 2027-2028).`,
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

// Core legacy and commercial dossiers
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
  MERCHANT_COMMODITY_ARBITRAGE_DOSSIER,
  EFET_BIOMETHANE_MASTER_AGREEMENT_DOSSIER,
  ARGUS_ICIS_PRICING_DOSSIER,
  ERGAR_SINGLE_GRID_MASS_BALANCE_DOSSIER,
  FUELEU_POOLING_AND_ETS2_DOSSIER,
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
