/**
 * Knowledge Vault for the Closed-Domain Auditor.
 *
 * Every statement here was checked against primary law (EUR-Lex, Legifrance, DfT guidance) or a source the
 * app already verified (docs/research, citations registry, regulatory/constants). Rules for this file:
 *  - Each document carries `sources`, the article or document each statement rests on.
 *  - Fixed legal numbers the app already holds are interpolated from regulatory/constants.ts and
 *    markets/constants.ts, never retyped (auditor.test.ts compares them).
 *  - Where a rule is a desk reading or could not be confirmed, the text says so. Nothing is stated from memory.
 */
import { CI_COMPARATOR_HEAT, CI_COMPARATOR_ROAD_TRANSPORT, GCAL_PER_CIC_ADVANCED, GCAL_PER_CIC_CONVENTIONAL, MWH_PER_CIC_ADVANCED, MWH_PER_CIC_CONVENTIONAL } from '../markets/constants';
import {
  DE_THG_PENALTY_EUR_PER_TCO2E,
  FR_CPB_CEILING_EUR_MWH,
  FUELEU_PENALTY_VLSFO_MJ_PER_TONNE,
  FUELEU_STATUTORY_PENALTY_PER_TONNE,
  RED3_TRANSPORT_MAX_CI,
  RED_HEAT_THRESHOLD_POST_2021,
  RED_HEAT_THRESHOLD_POST_2026,
  UK_RTFC_BUYOUT_GBP,
} from '../regulatory/constants';
import {
  FUELEU_REFERENCE_INTENSITY,
  FUELEU_TARGET_2025,
  FUELEU_TARGET_2030,
  FUELEU_TARGET_2035,
  FUELEU_TARGET_2040,
  FUELEU_TARGET_2045,
  FUELEU_TARGET_2050,
} from '../fueleu/calculator';

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
const HEAT_LOW_PCT = Math.round(RED_HEAT_THRESHOLD_POST_2021 * 100);
const HEAT_HIGH_PCT = Math.round(RED_HEAT_THRESHOLD_POST_2026 * 100);
const reductionPct = (target: number) => Math.round((1 - target / FUELEU_REFERENCE_INTENSITY) * 1000) / 10;

export const KNOWLEDGE_VAULT_DOCS: KnowledgeDocument[] = [
  {
    id: 'red_iii_directive',
    title: 'RED III Directive (EU) 2023/2413 & Gating Architecture',
    sourceFile: '01_EU_Statutory_Directives_and_RED_III.md',
    category: 'EU_DIRECTIVE',
    sources: [
      'Directive (EU) 2023/2413 (RED III) Art. 25(1), 26(1), 27(2), 29(10), 31a(1); Directive (EU) 2018/2001 (RED II) Art. 29(10)(a)-(c) and Annex V Part C pt 19',
      'Annex IX Parts A and B (as amended by RED III)',
    ],
    content: `Article 25(1)(a)(i): Member States shall set an obligation on fuel suppliers so that the "share of renewable energy within the final consumption of energy in the transport sector of at least 29 % by 2030" is reached, or a greenhouse gas intensity reduction of at least 14.5% by 2030 (Art. 25(1)(b)).
Transport fuel GHG threshold (Article 29(10), first subparagraph, point (c), unchanged from RED II): biofuels and biogas consumed in the transport sector from installations starting operation from 1 January 2021 must achieve at least ${TRANSPORT_SAVING_PCT}% GHG savings. Against the ${CI_COMPARATOR_ROAD_TRANSPORT} gCO2eq/MJ fossil comparator (Annex V Part C point 19) this means carbon intensity CI <= ${RED3_TRANSPORT_MAX_CI} gCO2eq/MJ. Earlier installations: at least 50% (operating on or before 5 October 2015) and at least 60% (6 October 2015 to 31 December 2020), points (a) and (b).
Heat and power GHG thresholds (Article 29(10)(d) to (h), as amended by RED III): for electricity, heating and cooling from biomass fuels, installations "that started operating after 20 November 2023, at least 80 %". Older installations have tiered rules by thermal input and age, for example 70% rising to 80%, in points (e) to (h). The desk simplifies this to ${HEAT_LOW_PCT}% / ${HEAT_HIGH_PCT}% (regulatory constants) and flags the category as unconfirmed for gas-grid injection. The comparator for heat is ${CI_COMPARATOR_HEAT} gCO2eq/MJ.
Article 31a(1): "By 21 November 2024, the Commission shall ensure that a Union database is set up to enable the tracing of liquid and gaseous renewable fuels and recycled carbon fuels."
Article 27(2)(c): for the Art. 25(1) transport targets, the share of fuels "produced from the feedstock listed in Annex IX" counts as twice its energy content in the RED III counting rules. National quota laws then differ (Germany ends double counting from 2026, see the German document).
Annex IX Part A (advanced feedstocks) includes, among others: algae cultivated on land in ponds or photobioreactors, the biomass fraction of mixed municipal waste, biowaste from private households subject to separate collection, straw, animal manure and sewage sludge, palm oil mill effluent and empty palm fruit bunches, tall oil pitch and crude glycerine.
Annex IX Part B lists used cooking oil and animal fats of categories 1 and 2 (Regulation (EC) No 1069/2009); their contribution is capped (Annex IX Part B limit, 1.7% of transport energy).
Food and feed crops (Article 26(1)): their share may be no more than one percentage point higher than the 2020 share in that Member State, up to a maximum of 7% of final energy consumption in road and rail transport. They still count towards targets within that cap; whether a national quota accepts them is set by national law.`,
  },
  {
    id: 'fueleu_maritime',
    title: 'FuelEU Maritime Regulation (EU) 2023/1805 & EU ETS Maritime',
    sourceFile: '11_FuelEU_Maritime_and_EU_ETS_Shipping_Desk.md',
    category: 'FUELEU',
    sources: [
      'Regulation (EU) 2023/1805 Art. 2(1), 4(2), 21; Annex II (LNG lower calorific value 0.0491 MJ/g); Annex IV Part B (penalty)',
      'Directive (EU) 2023/959 amending Directive 2003/87/EC (maritime in the EU ETS)',
    ],
    content: `Regulation (EU) 2023/1805 sets decreasing well-to-wake GHG intensity limits for the energy used on ships of above 5 000 gross tonnage calling at EU ports (Art. 2(1)).
Reference value: ${FUELEU_REFERENCE_INTENSITY} gCO2eq/MJ (Art. 4(2)); it is the 2020 fleet reference value, not the intensity of one fuel.
Limits (Art. 4(2)): 2025 (-${reductionPct(FUELEU_TARGET_2025)}% = ${FUELEU_TARGET_2025} gCO2eq/MJ); 2030 (-${reductionPct(FUELEU_TARGET_2030)}% = ${FUELEU_TARGET_2030}); 2035 (-${reductionPct(FUELEU_TARGET_2035)}% = ${FUELEU_TARGET_2035}); 2040 (-${reductionPct(FUELEU_TARGET_2040)}% = ${FUELEU_TARGET_2040}); 2045 (-${reductionPct(FUELEU_TARGET_2045)}% = ${FUELEU_TARGET_2045}); 2050 (-${reductionPct(FUELEU_TARGET_2050)}% = ${FUELEU_TARGET_2050}).
Penalty (Annex IV Part B, applied through Art. 23): EUR ${FUELEU_STATUTORY_PENALTY_PER_TONNE.toLocaleString('en-US')} per tonne of VLSFO energy equivalent, where one tonne of VLSFO is ${FUELEU_PENALTY_VLSFO_MJ_PER_TONNE.toLocaleString('en-US')} MJ. The penalty is calculated from the size of the compliance deficit.
Lower calorific value of LNG (Annex II): 0.0491 MJ/g, which is 49,100 MJ per tonne.
Compliance pooling (Article 21): two or more ships may pool their compliance balances to comply with Art. 4. A pool surplus, for example from Bio-LNG with a low or negative certified carbon intensity, can offset the deficits of other ships in the pool, so the pool avoids the penalty only to the extent that the pool's combined balance is not a deficit.
EU ETS maritime (Directive (EU) 2023/959): maritime emissions are phased in at 40% of 2024 emissions, 70% of 2025 and 100% of 2026. Sustainable biofuels and biomethane that meet the RED sustainability criteria carry a zero CO2 emission factor. Methane and nitrous oxide are not covered by that zero factor.`,
  },
  {
    id: 'germany_38_bimschv',
    title: 'German THG-Quote, 38. BImSchV & § 37a BImSchG',
    sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
    category: 'NATIONAL_QUOTA',
    sources: [
      '§ 37a BImSchG; § 37c(2) BImSchG (penalty); 38. BImSchV',
      'Bundestag Drucksache 21/5530 (Zweites Gesetz zur Weiterentwicklung der THG-Quote; promulgation date not yet confirmed)',
      'RED II/III Annex V Part C pt 6 and Annex VI Part B pt 6 (e_sca, improved agricultural and manure management)',
      'docs/research/registry-hub-connectivity-2026-10-04.md section 5 (dena guidance on imports)',
    ],
    content: `Under § 37a BImSchG and the 38. BImSchV, fuel suppliers in Germany must meet an escalating greenhouse gas reduction quota (THG-Quote). The non-compliance penalty is EUR ${DE_THG_PENALTY_EUR_PER_TCO2E} per tCO2e of shortfall (§ 37c(2) BImSchG), which caps what a certificate can be worth.
Manure credit: the RED lifecycle calculation includes a credit of 45 gCO2eq per MJ of manure used as biogas feedstock for improved agricultural and manure management. It sits in the e_sca term (Annex V Part C point 6 and Annex VI Part B point 6) and applies to anaerobic digestion of animal manure. The credit is per MJ of manure input, not per MJ of fuel. The certified carbon intensity on the Proof of Sustainability can therefore be deep negative, but the figure to use is the one on the PoS, not an assumed range. The desk does not hold a storage-type condition for the credit.
Counting: Germany applied double counting for advanced biofuels through compliance year 2025. It is abolished from 2026 under the Zweites Gesetz zur Weiterentwicklung der THG-Quote (Bundestag Drucksache 21/5530; adopted by the Bundestag 23 April 2026 and Bundesrat 8 May 2026; promulgation date not yet confirmed), so single counting (1x) applies from the 2026 compliance year. Treat the promulgation as unconfirmed. The manure credit in the carbon-intensity calculation is a physical accounting credit and is unaffected by quota counting rules.
BLE Nabisy: biomethane sold as a transport fuel is booked in the BLE's state database Nabisy on the basis of a certified Proof of Sustainability. Imported gas: dena guidance for the GB to DE case says quantities from outside the EU need additional mass-balance proof; the desk treats GB-injected gas as not clearing into EU quota markets without physical segregation (desk reading, see the UDB document).`,
  },
  {
    id: 'france_cpb_tiruert',
    title: 'France CPB Obligation (Code de l\'énergie) & TIRUERT Transport Tax',
    sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
    category: 'NATIONAL_QUOTA',
    sources: [
      'Code de l\'énergie Art. L.446-24 et seq. (CPB supplier obligation and penalty), as held in citations/registry.ts and eligibility/citations.ts',
      'Décret of 6 July 2024 on the obligation to surrender CPBs (number not confirmed: sources give 2024-718 and 2024-735, so the vault does not cite one)',
      'Code des douanes Art. 266 quindecies (TIRUERT), as held in citations/registry.ts',
    ],
    content: `France obliges natural gas suppliers above a size threshold to surrender Certificats de Production de Biogaz (CPB) in proportion to their customers' consumption, under the Code de l'énergie (Art. L.446-24 and following). The first obligation period runs 2026 to 2028 and the obligation is phased in. Producers receive CPBs; suppliers surrender them.
Penalty ceiling: a supplier that does not surrender certificates pays a penalty of EUR ${FR_CPB_CEILING_EUR_MWH} per MWh of missing CPB. Paying it does not count as surrendering the certificate, but no supplier rationally pays more than the penalty, so it caps the certificate value. Any calculated delivered stack above EUR ${FR_CPB_CEILING_EUR_MWH}/MWh is clamped at that level.
TIRUERT: France's incentive tax on fuel distributors that miss renewable-fuel targets in road transport (Code des douanes Art. 266 quindecies). Advanced biomethane supplied as Bio-CNG or Bio-LNG reduces or removes the liability. The scheme is moving to a GHG-based version (IRICC). The vault holds no confirmed counting multiplier for TIRUERT.`,
  },
  {
    id: 'netherlands_ere_hbe',
    title: 'Netherlands Wet milieubeheer, NEa ERE Rules & Green-Gas Obligation',
    sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
    category: 'NATIONAL_QUOTA',
    sources: [
      'Wet milieubeheer (Energie voor vervoer) and RVO "Hernieuwbare energie voor vervoer" (HBE replaced by ERE from 1 January 2026; 1 ERE = 1 kg CO2 reduction)',
      'docs/research/es-nl-gge-trade-spec-2026-10-09.md R8, R25',
      'Kamerstuk 36947 (Wet bijmengverplichting groen gas); draft Besluit and Regeling bijmengverplichting groen gas',
    ],
    content: `The Nederlandse Emissieautoriteit (NEa) oversees the Dutch renewable fuel systems. Since 1 January 2026 the earlier HBE (Hernieuwbare Brandstofeenheden) system for transport has been replaced by the ERE (Emissie Reductie Eenheid) system under the Brandstoftransitieverplichting. One ERE is one kilogram of CO2 reduction against the fossil reference, so it is counted in CO2 reduction, not in energy units. The old HBE-G double-counting multiplier for Annex IX Part A feedstock belonged to the energy-based HBE system and must not be applied to ERE; low-carbon-intensity gas is favoured through the kilograms of CO2e avoided. Confirm any special feedstock rule in the Besluit and Regeling energie vervoer before relying on it.
VertiCer is the Dutch registry that issues Guarantees of Origin for biomethane and green gas. Foreign GOs reach VertiCer via the AIB hub.
Green-gas obligation (GGE): a separate Dutch obligation (Kamerstuk 36947, chapter 9.9 of the Wet milieubeheer) passed the Tweede Kamer on 6 October 2026 and awaits the Senate, so it is not yet law. The draft rules need the GO and the PoS for the same MWh. The same delivery cannot serve both the ERE and the green-gas obligation.`,
  },
  {
    id: 'italy_cic_pnrr',
    title: 'Italy CIC (DM 2 March 2018) & PNRR Biomethane Decree (DM 15 September 2022)',
    sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
    category: 'NATIONAL_QUOTA',
    sources: [
      'DM 2 marzo 2018 (CIC), as held in eligibility/citations.ts IT_CIC and markets/constants.ts',
      'DM 15 settembre 2022 (PNRR Mission 2, Component 2, Investment 1.4): capital grant plus a 15-year incentive tariff, awarded by competitive procedure (GSE and Deloitte Legal summaries)',
    ],
    content: `Certificati di Immissione in Consumo (CIC) are administered by GSE (Gestore dei Servizi Energetici) under the Decreto Ministeriale of 2 March 2018 for biomethane and other advanced biofuels in transport. One CIC is issued per ${GCAL_PER_CIC_CONVENTIONAL} Gcal of conventional biomethane (about ${MWH_PER_CIC_CONVENTIONAL.toFixed(2)} MWh) or per ${GCAL_PER_CIC_ADVANCED} Gcal of advanced biomethane (about ${MWH_PER_CIC_ADVANCED.toFixed(3)} MWh). Advanced biomethane is made from Annex IX Part A feedstock, for example the organic fraction of municipal waste (FORSU), manure and agricultural residues.
The Decreto Ministeriale of 15 September 2022 is a different instrument: the PNRR biomethane decree. It supports new or converted plants with a capital grant plus an incentive tariff on net biomethane production for 15 years from start-up, awarded through competitive procedures. It does not create the CIC.
GO export: GOs from supported transport or other-use plants cannot be exported from Italy (AIB domain protocol).`,
  },
  {
    id: 'uk_rtfo_rggo',
    title: 'UK RTFO Order (SI 2007/3072) & Green Gas Certification Scheme (RGGO)',
    sourceFile: '02_National_Compliance_Quotas_and_Formulas.md',
    category: 'NATIONAL_QUOTA',
    sources: [
      'Renewable Transport Fuel Obligations Order 2007 (SI 2007/3072)',
      'DfT, The RTFO: an essential guide (2024): buy-out 50p per RTFC and 80p per development-fuel RTFC; double RTFCs for waste and residue fuels',
      'IR (EU) 2022/996 (interconnected EU grid as one mass-balance area); docs/research/registry-hub-connectivity-2026-10-04.md',
    ],
    content: `The UK Renewable Transport Fuel Obligation (RTFO Order 2007, SI 2007/3072) obliges fuel suppliers to redeem Renewable Transport Fuel Certificates (RTFCs) or pay the buy-out. Fuel from certain wastes and residues is awarded double the RTFCs. The buy-out is GBP ${UK_RTFC_BUYOUT_GBP.toFixed(2)} per standard RTFC and GBP 0.80 per development-fuel certificate (DfT guide 2024). The desk models certificates per kg of biomethane from a lower heating value of 50 MJ/kg (see the netback engine); that conversion is a desk assumption, not a DfT figure. "dRTFC" is the market quote unit used in the desk's broker data.
GGCS (Green Gas Certification Scheme) is the GB biomethane certificate scheme; it is on the ERGaR hub, not AIB. Its RGGO certificates relate to gas injected into the Great Britain grid. The detailed scheme-rule section is not verified in the vault.
Non-EU grid boundary (desk reading): Great Britain's grid is physically linked to the Continent, but it sits outside the EU's single interconnected mass-balance area under IR (EU) 2022/996, so GB-injected gas cannot clear into EU quota markets (DE, NL, FR, IT) on mass balance alone. The workaround is physical segregation, for example shipping segregated Bio-LNG, or a recognition agreement. dena also requires extra mass-balance proof for non-EU quantities.`,
  },
  {
    id: 'udb_mass_balance',
    title: 'Union Database (UDB) & Registry State Machine',
    sourceFile: '03_UDB_and_European_Registry_Architecture.md',
    category: 'UDB_REGISTRY',
    sources: [
      'Directive (EU) 2023/2413 Art. 31a(1); Art. 30(1)',
      'IR (EU) 2022/996 (interconnected EU grid as a single mass-balance system; article pin not confirmed)',
      'European Biogas Association, Union Database leaflet (launch postponed to end-2026), as held in eligibility/citations.ts UDB_IMPLEMENTING_REG',
    ],
    content: `Under RED III Article 31a(1) the Commission had to set up a Union database for tracing liquid and gaseous renewable fuels by 21 November 2024. Implementing Regulation (EU) 2022/996 treats the interconnected EU gas grid as a single mass-balancing system for gaseous fuels, and Art. 30 RED requires economic operators to show compliance through audited chain-of-custody records using mass balance. The UDB gas module is NOT YET LIVE for economic operators: its launch has been postponed to the end of 2026 (European Biogas Association), roughly two years past the statutory deadline. For gas the UDB is a self-declared, monthly-batch Proof of Sustainability (PoS) record with a "Transfer Gas PoS" in-grid reallocation feature. It is distinct from Guarantee of Origin (GO) trading (RED Art. 19, AIB EECS Gas Scheme, ERGaR Certificate of Origin scheme). Until the UDB gas module launches, cross-border compliance traceability continues to run through national registries and voluntary sustainability schemes (ISCC EU, REDcert EU, Nabisy, etc.).
Consignment Title Transfer Lifecycle (this desk's own trade-simulation model, not a documented UDB state machine):
1. DRAFT: Initial transaction prepared.
2. SUBMITTED: Registered with origin registry and sent to UDB.
3. PENDING_UDB_LAUNCH: Boundary and protocol checks pass, but the UDB gas module is not yet live so nothing can be formally recorded yet.
4. TRANSFERRED: Recipient registry confirms credit to buyer account (once the UDB gas module is live).
5. BLOCKED: Transfer blocked if the cross-border mass balance boundary is broken (for example a GB injection to an EU destination without a recognition arrangement or physical segregation).`,
  },
  {
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
  },
  {
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
  },
];

export function getFullKnowledgeContext(): string {
  return KNOWLEDGE_VAULT_DOCS.map(doc =>
    `=== DOCUMENT: ${doc.title} (${doc.sourceFile}) ===\nSources: ${doc.sources.join('; ')}\n${doc.content}\n`
  ).join('\n\n');
}
