/**
 * The registry directory: one sourced entry per European biomethane registry/country,
 * built ONLY from `scratch/registry_research/registries.md` (accessed 2026-09-28) and
 * `scratch/registry_research/udb_process.md` (for the UDB status note).
 *
 * Two cross-border systems matter and are NOT the same thing:
 * - AIB EECS Gas Scheme (aib-net.org) — a Guarantee of Origin (GO) trading hub. 15 confirmed
 *   members as of this research: E-Control (AT), Brugel (BE-Brussels), OTE (CZ), Elering (EE),
 *   Gasgrid (FI), EEX (FR), MEKH (HU), GSE (IT), Conexus (LV), VertiCer (NL), REN (PT),
 *   Enagás GTS (ES), Swedish Energy Agency (SE), Pronovo (CH), Amber Grid (LT).
 *   Source: https://www.aib-net.org/facts/aib-member-countries-regions/aib-members
 * - ERGaR Certificate of Origin (CoO) Scheme (ergar.org) — a separate, overlapping cross-border
 *   GO-transfer scheme. Confirmed active participants: Energinet (DK), dena (DE), GGCS (GB),
 *   VertiCer (NL), AGCS (AT), Amber Grid (LT), SPPD/OKTE (SK).
 *   Source: https://www.ergar.org/ergar-schemes/coo-scheme-statistics/
 *
 * Where the research says a fact is UNVERIFIED, this file stores 'unverified' rather than
 * guessing true/false. Nothing here should be read as "the app's own live data" — it is a
 * point-in-time research snapshot, dated per entry.
 */

export type RegistryIssueType = 'GO' | 'POS' | 'GO_AND_POS' | 'OTHER';
export type TriState = boolean | 'unverified';
export type DirectoryVerificationLevel = 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED';

export interface RegistrySource {
  claim: string;
  url: string;
  accessed: string; // ISO date the research was accessed
}

export interface RegistryDirectoryEntry {
  countryCode: string;
  countryName: string;
  registryName: string;
  operator: string;
  officialUrl: string;
  issues: RegistryIssueType;
  aibGasScheme: TriState;
  ergar: TriState;
  /** The UDB gas module is not live for any registry: launch postponed to end of 2026 (EBA). */
  udbStatus: 'NOT_LIVE_EXPECTED_END_2026';
  crossBorderRoutes: string[];
  complianceMarketsFed: string[];
  notes: string;
  sources: RegistrySource[];
  verificationLevel: DirectoryVerificationLevel;
}

const ACCESSED = '2026-09-28';
const AIB_LIST_URL = 'https://www.aib-net.org/facts/aib-member-countries-regions/aib-members';
const ERGAR_STATS_URL = 'https://www.ergar.org/ergar-schemes/coo-scheme-statistics/';
const UDB_LEAFLET_URL = 'https://www.europeanbiogas.eu/publication/union-database-leaflet/';

const UDB_SOURCE: RegistrySource = {
  claim: 'UDB gas module launch postponed to end of 2026 (statutory deadline was 21 November 2024, RED III Art. 31a).',
  url: UDB_LEAFLET_URL,
  accessed: ACCESSED,
};

export const REGISTRY_DIRECTORY: RegistryDirectoryEntry[] = [
  {
    countryCode: 'DE',
    countryName: 'Germany',
    registryName: 'dena Biogasregister',
    operator: 'Deutsche Energie-Agentur GmbH (dena)',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: false,
    ergar: true,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'ERGaR CoO scheme — dena is ERGaR\'s largest import destination (approximately two-thirds of Q1 2026 ERGaR volumes)',
      'Bilateral agreement with Austria (AGCS) since 2016 — first of its kind in Europe',
      'Bilateral agreement with Denmark (Energinet) since 1 October 2017',
    ],
    complianceMarketsFed: ['German THG-Quote (via the separate Nabisy system operated by BLE, not dena itself)'],
    notes:
      "dena Biogasregister is NOT a member of AIB's 15-member Gas Scheme Group, contradicting any claim that dena participates via AIB_EECS_GAS. UBA operates a separate register, the Gas-HKR, described as \"new and still under development\" — distinct from dena's register. Germany's PoS/sustainability role for compliance runs via Nabisy (operated by BLE), a different body than dena.",
    sources: [
      { claim: 'dena absent from AIB Gas Scheme Group 15-member list', url: AIB_LIST_URL, accessed: ACCESSED },
      { claim: 'dena is ERGaR\'s largest CoO import destination (~2/3 of Q1 2026 volumes)', url: ERGAR_STATS_URL, accessed: ACCESSED },
      UDB_SOURCE,
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'NL',
    countryName: 'Netherlands',
    registryName: 'VertiCer',
    operator: 'VertiCer B.V. (merger of CertiQ and Vertogas, effective 1 January 2023)',
    officialUrl: 'https://www.verticer.eu/',
    issues: 'GO',
    aibGasScheme: true,
    ergar: true,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'AIB EECS Gas Scheme hub (confirmed member; AIB publishes a dedicated EECS Domain Protocol for VertiCer, dated 2025-06-12)',
      'ERGaR CoO scheme — named as an exporter of smaller Netherlands-origin volumes',
    ],
    complianceMarketsFed: ['Dutch renewable-transport obligation (HBE/ERE) — national scheme details not independently verified in this research'],
    notes:
      'NEa (Nederlandse Emissieautoriteit) handles RFNBO/transport-fuel delivery registration separately; whether NEa is as tightly coupled to VertiCer as sometimes implied is unverified. This is the most strongly corroborated registry entry in the research: operator, AIB membership, and ERGaR participation are all independently confirmed.',
    sources: [
      { claim: 'VertiCer is the Dutch GO-issuing body (CertiQ/Vertogas merger, 1 Jan 2023)', url: 'https://www.verticer.eu/', accessed: ACCESSED },
      { claim: 'VertiCer confirmed AIB Gas Scheme Group member', url: AIB_LIST_URL, accessed: ACCESSED },
      { claim: 'VertiCer named as an ERGaR CoO exporter', url: ERGAR_STATS_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'VERIFIED',
  },
  {
    countryCode: 'DK',
    countryName: 'Denmark',
    registryName: "Energinet's Guarantee of Origin register (branding as \"Biometangasregister\" is unverified; the term \"G-Rex\" also appears in one ERGaR source)",
    operator: 'Energinet Gas TSO A/S',
    officialUrl: 'https://energinet.dk',
    issues: 'GO',
    aibGasScheme: false,
    ergar: true,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'ERGaR CoO scheme to Germany — historically the largest exporter; the UK/GGCS surpassed Denmark as largest exporter in Q1 2026',
      'Bilateral agreement with Germany (dena) since 1 October 2017',
    ],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes:
      'Energinet does not appear in the 15-member AIB Gas Scheme Group list captured in this research — treat any AIB_EECS_GAS claim for Energinet as unsupported. The exact registry brand name ("Biometangasregister") is unverified; the operator (Energinet Gas TSO) is confirmed.',
    sources: [
      { claim: 'Energinet absent from AIB Gas Scheme Group 15-member list', url: AIB_LIST_URL, accessed: ACCESSED },
      { claim: 'Denmark historically the largest ERGaR CoO exporter; overtaken by UK/GGCS in Q1 2026', url: ERGAR_STATS_URL, accessed: ACCESSED },
      UDB_SOURCE,
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'ES',
    countryName: 'Spain',
    registryName: 'Enagás GTS Guarantee of Origin system',
    operator: 'Enagás GTS S.A.',
    officialUrl: 'https://goodnewenergy.enagas.es',
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (confirmed member "Enagas GTS, S.A.U.")'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes:
      "Spain did not appear among the ERGaR CoO scheme importer/exporter names captured in this research (Germany, Switzerland, Slovakia, Denmark, UK and Netherlands were named; Spain was not) — treat ERGaR participation as unverified, not confirmed. Spain's cross-border grid interconnection into France (VIP Pirineos) is historically constrained and used predominantly for physical natural gas rather than biomethane certificate flows.",
    sources: [
      { claim: 'Enagás GTS confirmed AIB Gas Scheme Group member', url: AIB_LIST_URL, accessed: ACCESSED },
      { claim: 'Spain not named among ERGaR CoO importers/exporters in this research', url: ERGAR_STATS_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'IT',
    countryName: 'Italy',
    registryName: 'GSE — CIC (compliance) and Certigy (Guarantees of Origin)',
    operator: 'Gestore dei Servizi Energetici (GSE) S.p.A.',
    officialUrl: 'https://www.gse.it',
    issues: 'GO_AND_POS',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'AIB EECS Gas Scheme hub (confirmed member "GSE (Italy)")',
      'Cross-border GO export via Certigy only where the Italian plant does NOT receive production incentives (e.g. DM 2022) — most Italian incentivised plants are blocked from cross-border export',
    ],
    complianceMarketsFed: ['CIC — Certificati di Immissione in Consumo (transport-fuel blending obligation)'],
    notes:
      'GSE issues both CIC (a national compliance certificate for the transport-fuel obligation) and GO via a platform named Certigy (the app\'s claimed platform name "Piattaforma Biometano" is unverified as a distinct product from Certigy). The incentive lock-out on cross-border export is an important, frequently-missed trading constraint. Italy was not named among ERGaR CoO importers/exporters in this research.',
    sources: [
      { claim: 'GSE confirmed AIB Gas Scheme Group member', url: AIB_LIST_URL, accessed: ACCESSED },
      { claim: 'Incentivised Italian plants blocked from cross-border GO export absent DM 2022 exemption', url: 'https://www.gse.it', accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    registryName: 'Registre National des Garanties d\'Origine (RGO)',
    operator: 'EEX (European Energy Exchange, via Powernext) — operator since 1 October 2023, succeeding GRDF (2012–2023)',
    officialUrl: 'https://cegibat.grdf.fr/actualites/garanties-origine-tracabilite-biomethane',
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'AIB EECS Gas Scheme hub (confirmed member "EEX")',
      'French GOs are reported as usable only in France: "there is no uniform standard in Europe for biomethane injection into the natural gas network, so there is no European market for guarantees of origin" (GRDF/Cegibat)',
    ],
    complianceMarketsFed: ['TIRUERT — Trajectoire d\'Incorporation des Renouvelables dans les Transports'],
    notes:
      '7,907,571 GOs (≈7.9 TWh) were issued on the register in 2023, an 18% increase on 2022 — the scale is well corroborated, but France\'s actual cross-border capability is materially weaker than a simple AIB-membership flag suggests, per GRDF\'s own domestic-only framing. France was not named among ERGaR CoO importers/exporters in this research.',
    sources: [
      { claim: 'French GOs usable only in France; no European GO market for French-origin gas', url: 'https://cegibat.grdf.fr/actualites/garanties-origine-tracabilite-biomethane', accessed: ACCESSED },
      { claim: 'EEX confirmed AIB Gas Scheme Group member', url: AIB_LIST_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    registryName: 'Green Gas Certification Scheme (GGCS) — RGGOs; RTFO — RTFCs',
    operator: 'Renewable Energy Assurance Ltd (REAL), a subsidiary of the Renewable Energy Association',
    officialUrl: 'https://www.greengas.org.uk',
    issues: 'GO_AND_POS',
    aibGasScheme: false,
    ergar: true,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'ERGaR CoO scheme — GGCS became the LARGEST exporter over the hub in Q1 2026, surpassing Denmark',
    ],
    complianceMarketsFed: ['RTFO — Renewable Transport Fuel Obligation (domestic)'],
    notes:
      'GGCS is NOT domestic-only: it is ERGaR\'s largest current exporter as of Q1 2026. One RGGO is issued per kWh of green gas produced (disclosure/chain-of-custody, GB\'s GO-equivalent); RTFCs are the separate transport-fuel compliance certificate under RTFO. GB is outside the EU/EEA gas-scheme context and is not an AIB Gas Scheme Group member. Whether imported biomethane is RTFO-eligible at the certificate-recognition level is unverified.',
    sources: [
      { claim: 'GGCS became the largest ERGaR CoO exporter in Q1 2026, surpassing Denmark', url: ERGAR_STATS_URL, accessed: ACCESSED },
      { claim: 'GGCS administered by REAL; RGGOs vs RTFCs structure', url: 'https://www.greengas.org.uk', accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'AT',
    countryName: 'Austria',
    registryName: 'AGCS Biomethane Register Austria',
    operator: 'AGCS Gas Clearing and Settlement AG (AIB Issuing Body of record: E-Control)',
    officialUrl: 'https://www.biomethanregister.at/en/cooperation/european-market/ERGaR',
    issues: 'GO',
    aibGasScheme: true,
    ergar: true,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'AIB EECS Gas Scheme hub (via E-Control, confirmed member)',
      'ERGaR CoO scheme since October 2021, covering AT–DE–NL–GB routes',
      'Bilateral agreement with Germany (dena) since 2016 — first of its kind in Europe',
    ],
    complianceMarketsFed: ['Not independently verified in this research (EGG — Erneuerbaren-Ausbau-Gesetz — is Austria\'s general renewable-expansion framework, not independently confirmed at article level)'],
    notes: 'One of the most strongly corroborated entries: operator, AIB membership (via E-Control), ERGaR join date, and bilateral route are all independently confirmed.',
    sources: [
      { claim: 'AGCS joined the ERGaR CoO Scheme in October 2021, covering AT-DE-NL-GB', url: 'https://www.biomethanregister.at/en/cooperation/european-market/ERGaR', accessed: ACCESSED },
      { claim: 'E-Control confirmed AIB Gas Scheme Group member for Austria', url: AIB_LIST_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'VERIFIED',
  },
  {
    countryCode: 'BE',
    countryName: 'Belgium',
    registryName: 'Fluxys (production registrar) / VREG (Flanders) / CWaPE (Wallonia) / Brugel (Brussels)',
    operator: 'Fluxys Belgium (registrar); VREG, CWaPE and Brugel (regional coordinators)',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'AIB EECS Gas Scheme hub (confirmed member "Brugel", Belgium-Brussels)',
      'ERGaR participant per ERGaR\'s own scheme description, but Belgium\'s specific transaction volumes were not itemised in this research',
    ],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'Belgium reportedly operates four regional GO registries reflecting its federal energy-regulation structure — the detail is consistent with Belgium\'s known structure but not independently itemised in this research.',
    sources: [
      { claim: 'Brugel confirmed AIB Gas Scheme Group member (Belgium-Brussels)', url: AIB_LIST_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'SE',
    countryName: 'Sweden',
    registryName: 'Swedish GO system',
    operator: 'Swedish Energy Agency (Energimyndigheten) — the confirmed AIB Issuing Body; Energigas Sverige is an industry trade association, NOT the GO-issuing authority',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (confirmed member "Swedish Energy Agency")'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes:
      'New regulation aligning the Swedish GO system with the latest RED revision and CEN-EN 16325 entered into force on 1 February 2026. Any claim naming "Energigas Sverige / Nordion Energi (Swedegas)" as the GO-issuing authority is a naming error — Energigas Sverige is a trade association, and the confirmed AIB Issuing Body is the Swedish Energy Agency.',
    sources: [
      { claim: 'Swedish Energy Agency confirmed AIB Gas Scheme Group Issuing Body for Sweden', url: AIB_LIST_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'CH',
    countryName: 'Switzerland',
    registryName: 'Pronovo GO system',
    operator: 'Pronovo AG',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: true,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'AIB EECS Gas Scheme hub (confirmed member)',
      'ERGaR CoO scheme — the second-largest import destination in Q1 2026 (roughly one-third of transfers, after dena)',
    ],
    complianceMarketsFed: ['Not independently verified in this research — Switzerland is outside the EU so not directly subject to RED PoS/UDB mechanics'],
    notes: 'Pronovo is NOT domestic-only: it is ERGaR\'s second-largest import destination as of Q1 2026, contradicting any DOMESTIC_ONLY classification.',
    sources: [
      { claim: 'Pronovo is the second-largest ERGaR CoO import destination in Q1 2026 (~1/3 of transfers)', url: ERGAR_STATS_URL, accessed: ACCESSED },
      { claim: 'Pronovo confirmed AIB Gas Scheme Group member', url: AIB_LIST_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'FI',
    countryName: 'Finland',
    registryName: 'Gasgrid Finland GO register',
    operator: 'Gasgrid Finland Oy',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (confirmed member "Gasgrid")'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'Other operational details were not independently checked in this research beyond AIB list confirmation.',
    sources: [{ claim: 'Gasgrid confirmed AIB Gas Scheme Group member', url: AIB_LIST_URL, accessed: ACCESSED }],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'NO',
    countryName: 'Norway',
    registryName: 'Not confirmed in this research',
    operator: 'Gassco AS / Statnett SF (named by prior app data; not independently confirmed)',
    officialUrl: AIB_LIST_URL,
    issues: 'OTHER',
    aibGasScheme: false,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'Norway is EEA, not EU. Not in the confirmed 15-member AIB list; no dedicated search was performed for Norway in this research, so most detail here is UNVERIFIED.',
    sources: [{ claim: 'Norway absent from AIB Gas Scheme Group 15-member list', url: AIB_LIST_URL, accessed: ACCESSED }],
    verificationLevel: 'UNVERIFIED',
  },
  {
    countryCode: 'PL',
    countryName: 'Poland',
    registryName: 'URE (regulator) / GAZ-SYSTEM (TSO) — GO framework exists on paper',
    operator: 'Urząd Regulacji Energetyki (URE) / Operator Gazociągów Przesyłowych GAZ-SYSTEM S.A.',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: false,
    ergar: false,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes:
      'Poland\'s biomethane market barely exists yet: Polska Spółka Gazownictwa announced the first industrial-scale grid-connected biomethane plant on 9 September 2025 (an earlier pilot ran from February 2025 at a Poznań University experimental farm). Poland is in neither the confirmed AIB list nor the ERGaR statistics. Any material export or issuance figure for Poland predating this timeline is not credible.',
    sources: [
      { claim: 'First industrial-scale Polish biomethane plant connected to the grid, 9 September 2025', url: 'https://www.gasworld.com', accessed: ACCESSED },
      { claim: 'Poland absent from confirmed AIB and ERGaR lists', url: AIB_LIST_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'UNVERIFIED',
  },
  {
    countryCode: 'CZ',
    countryName: 'Czechia',
    registryName: 'OTE a.s. biomethane GO register',
    operator: 'OTE, a.s. (Czech Electricity and Gas Market Operator)',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (confirmed member "OTE")'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'No dedicated search was performed for Czechia beyond AIB list confirmation in this research.',
    sources: [{ claim: 'OTE confirmed AIB Gas Scheme Group member for Czechia', url: AIB_LIST_URL, accessed: ACCESSED }],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    registryName: 'REN Guarantee of Origin system',
    operator: 'REN — Redes Energéticas Nacionais',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (confirmed member "REN")'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes:
      'Portugal only joined the group of biomethane-producing countries in 2022 (per the European Biogas Association Statistical Report 2025) — a young producer. Any high export-share claim for Portugal should be treated as unverified pending direct REN production data.',
    sources: [
      { claim: 'Portugal joined biomethane-producing countries in 2022', url: 'https://www.europeanbiogas.eu/news/eba-statistical-report-2025/', accessed: ACCESSED },
      { claim: 'REN confirmed AIB Gas Scheme Group member for Portugal', url: AIB_LIST_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'IE',
    countryName: 'Ireland',
    registryName: 'GNI renewable-gas registry',
    operator: 'Gas Networks Ireland (GNI)',
    officialUrl: 'https://www.gasnetworks.ie/network/biomethane/registry',
    issues: 'GO',
    aibGasScheme: false,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'GNI is not in the confirmed 15-member AIB Gas Scheme Group list captured in this research. A GNI renewable-gas registry page exists at the URL above, but its content was not fetched in this research session.',
    sources: [
      { claim: 'GNI absent from AIB Gas Scheme Group 15-member list', url: AIB_LIST_URL, accessed: ACCESSED },
      { claim: 'GNI renewable-gas registry page exists', url: 'https://www.gasnetworks.ie/network/biomethane/registry', accessed: ACCESSED },
    ],
    verificationLevel: 'UNVERIFIED',
  },
  {
    countryCode: 'HU',
    countryName: 'Hungary',
    registryName: 'MEKH / CEEGEX GO platform',
    operator: 'Magyar Energetikai és Közmű-szabályozási Hivatal (MEKH)',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (confirmed member "MEKH")'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'No dedicated search was performed for Hungary beyond AIB list confirmation in this research.',
    sources: [{ claim: 'MEKH confirmed AIB Gas Scheme Group member for Hungary', url: AIB_LIST_URL, accessed: ACCESSED }],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'EE',
    countryName: 'Estonia',
    registryName: 'Elering Biomethane Register',
    operator: 'Elering AS',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (confirmed member "Elering")'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'No dedicated search was performed for Estonia beyond AIB list confirmation in this research.',
    sources: [{ claim: 'Elering confirmed AIB Gas Scheme Group member for Estonia', url: AIB_LIST_URL, accessed: ACCESSED }],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'LV',
    countryName: 'Latvia',
    registryName: 'Conexus Baltic Grid GO register',
    operator: 'AS Conexus Baltic Grid',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: 'unverified',
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (confirmed member "Conexus")'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'No dedicated search was performed for Latvia beyond AIB list confirmation in this research.',
    sources: [{ claim: 'Conexus confirmed AIB Gas Scheme Group member for Latvia', url: AIB_LIST_URL, accessed: ACCESSED }],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'LT',
    countryName: 'Lithuania',
    registryName: 'Amber Grid Biomethane GO Platform',
    operator: 'AB Amber Grid',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: true,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: [
      'AIB EECS Gas Scheme hub — a relatively recent join ("Amber Grid joins the AIB hub")',
      'ERGaR participant',
    ],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes:
      'Lithuania joined the group of biomethane-producing countries only in 2023 (per the European Biogas Association) — a very young producer. Any high export-share claim for Lithuania should be treated as unverified pending direct production data.',
    sources: [
      { claim: 'Lithuania joined biomethane-producing countries in 2023', url: 'https://www.europeanbiogas.eu/news/eba-statistical-report-2025/', accessed: ACCESSED },
      { claim: 'Amber Grid confirmed AIB Gas Scheme Group member and named ERGaR participant', url: AIB_LIST_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
  {
    countryCode: 'SK',
    countryName: 'Slovakia',
    registryName: 'SPP-distribúcia / OKTE GO platform',
    operator: 'SPP-distribúcia, a.s. is the confirmed AIB Gas Scheme member/Issuing Body; OKTE is Slovakia\'s market operator (electricity/gas settlement), a related but distinct entity',
    officialUrl: AIB_LIST_URL,
    issues: 'GO',
    aibGasScheme: true,
    ergar: true,
    udbStatus: 'NOT_LIVE_EXPECTED_END_2026',
    crossBorderRoutes: ['AIB EECS Gas Scheme hub (via SPP-distribúcia)', 'ERGaR — SPPD/OKTE named among participants in Q1 2026 statistics (import/export direction not itemised)'],
    complianceMarketsFed: ['Not independently verified in this research'],
    notes: 'Naming this registry "OKTE" alone (without SPP-distribúcia) is imprecise: the confirmed AIB Gas Scheme member is "SPP-distribúcia, a.s.", with OKTE as the related market operator.',
    sources: [
      { claim: 'SPP-distribúcia confirmed AIB Gas Scheme Group member for Slovakia', url: AIB_LIST_URL, accessed: ACCESSED },
      { claim: 'SPPD/OKTE named among ERGaR CoO scheme participants in Q1 2026 statistics', url: ERGAR_STATS_URL, accessed: ACCESSED },
    ],
    verificationLevel: 'PARTIAL',
  },
];

export function getRegistryByCountry(countryCode: string): RegistryDirectoryEntry | undefined {
  return REGISTRY_DIRECTORY.find(r => r.countryCode === countryCode.toUpperCase());
}
