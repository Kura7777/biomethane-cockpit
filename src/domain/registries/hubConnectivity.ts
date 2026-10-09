/**
 * Registry hub connectivity: which biomethane GO registries sit on which cross-border hub.
 * Built ONLY from docs/research/registry-hub-connectivity-2026-10-04.md (accessed 2026-10-04).
 * Countries not researched (GR, SI, HR, BG, LU) are deliberately absent: callers must treat
 * a missing key as "not researched", never as "no hub".
 */
import type { RegistrySource } from './registryDirectory';

export const HUB_ACCESSED = '2026-10-04';

export type HubSource = RegistrySource;

export type AibStatus = 'CONNECTED' | 'APPLICANT' | 'OBSERVER' | 'NONE';

export interface HubMembership {
  registry: string;
  aib: AibStatus;
  /** Pronovo: gas imports only on AIB, no exports. */
  aibImportOnly?: boolean;
  ergar: boolean;
  /** Pronovo publishes no ERGaR export route. */
  ergarExportUnconfirmed?: boolean;
  /** Hub connection covers only part of the country (e.g. Belgium: Brussels region only). */
  regionalCoverage?: string;
  note?: string;
  sources: HubSource[];
}

const URL_AIB_REGISTRIES = 'https://www.aib-net.org/registries';
const URL_AIB_NEWS = 'https://www.aib-net.org/news-events/news';
const URL_AIB_SE_NODE = 'https://www.aib-net.org/node/3418';
const URL_VERTICER_FAQ = 'https://verticer.eu/en/frequently-asked-questions/traders/';
const URL_BE_FLANDERS =
  'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPBEF%20Domain%20Protocol%20Clean%20Final.pdf';
const URL_BE_WALLONIA =
  'https://energie.wallonie.be/home/les-marches-et-les-acteurs/le-marche-des-garanties-d-origine/faq-garanties-d-origine-pour-le-gaz-renouvelable.html';
const URL_AIB_MEMBERS = 'https://www.aib-net.org/facts/aib-member-countries-regions/aib-members';
const URL_ERGAR_COO = 'https://www.ergar.org/ergar-schemes/ergar-coo-scheme/';
const URL_ERGAR_LT = 'https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/';
const URL_DENA_INTL = 'https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/';
const URL_PRONOVO_IMPORT = 'https://pronovo.ch/import-von-gas-hkn/';
const URL_IT_PROTOCOL =
  'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPIT-GSE%20Italy%20-%20Domain%20Protocol%20Italy%2020240710%20-%20clean%20clean.pdf';
const URL_GB_DE = 'https://www.greengas.org.uk/news/guidance-from-dena-on-uses-of-imported-biomethane-updated';
const URL_DK_CONSULT =
  'https://prodstoragehoeringspo.blob.core.windows.net/e2cc044e-f2dd-4f7a-8a3d-af2d1a703737/H%C3%B8ringsnotat%20for%20bekendtg%C3%B8relse%20om%20oprindelsesgarantier.pdf';
const URL_DK_TENDER = 'https://landbrugsavisen.dk/biogas-danmark-drop-biogasstoette-paa-10-milliarder-kroner-219528';
const URL_DENA_USE =
  'https://www.dena.de/fileadmin/biogasregister_/Dokumente/internationaler_Handel/20230719_dena_Verwendungsmoeglichkeiten_fuer_importiertes_Biomethan.pdf';
const URL_IT_DM224 = 'https://www.mase.gov.it/portale/documents/d/guest/dm_224_14-07-2023_garanzie_di_origine-pdf';
const URL_ES_FAQ =
  'https://www.enagas.es/content/dam/enagas/es/ficheros/gestion-tecnica-sistema/informacion-gestion-tecnica/garantias/preguntas-frecuentes-procedimiento-gestion-garantias-origen.pdf';
const URL_ES_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2023-DPESG-Enagas%20GTS%20Spain%20Domain%20Protocol%20-%20Gas_231213.pdf';
const URL_NL_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2025-DPNL-Domain%20Protocol%20the%20Netherlands%20v3.8%20(Clean).pdf';
const URL_SE_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPSE-Swedish%20DP%202024-12-09%20(clean).pdf';
const URL_FR_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPFR-Domain%20Protocol%20EEX%20Gas%20Application%20Final%20Clean%20ESG.pdf';
const URL_SE_TAX =
  'https://www.skatteverket.se/foretag/skatterochavdrag/punktskatter/nyheterinompunktskatter/2026/nyheterinompunktskatter/nyareglerforskattpagas.5.350d33b019d68128e861cd6.html';
const URL_AT_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPAT-E-Control%20Austria%20Domain%20Protocol%2025052023_Correction%20200092024_clean%20version_.pdf';
const URL_BE_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPBEB-BRUGEL-Brussels%20Domain%20Protocol%20clean.pdf';
const URL_EE_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPEE-%20Domain%20Protocol%20Elering%20Estonia%20Clean%20version%2020241210.pdf';
const URL_PT_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-GSG-PT-REN-DPPTG%20Domain%20Protocol%20REN%20Clean%2020241217.pdf';
const URL_FI_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPFI-Domain%20Protocol%20Clean%20Gasgrid%20Finland%20Oy.pdf';
const URL_SK_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSK-01%2003%20SPP_Distribucia_Domain_Protocol.pdf';
const URL_CH_PROTOCOL = 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2025-DPCH-Pronovo%20Clean%20v2.pdf';
const URL_CZ_PROTOCOL = 'https://www.ote-cr.cz/en/gos_and_allowances/guarantees-of-origin/domain-protocol-for-gos.pdf';

const src = (claim: string, url: string): HubSource => ({ claim, url, accessed: HUB_ACCESSED });
const aibConnected = (reg: string): HubSource => src(`${reg} is gas-connected on the AIB EECS hub`, URL_AIB_REGISTRIES);
const ergarMember = (reg: string): HubSource => src(`${reg} is an ERGaR CoO system participant`, URL_ERGAR_COO);
const ergarAbsent = (reg: string): HubSource => src(`${reg} not among ERGaR CoO system participants`, URL_ERGAR_COO);
const aibObserver = (reg: string): HubSource => src(`${reg} is an AIB scheme observer (no transfers)`, URL_AIB_MEMBERS);

const aibOnly = (registry: string): HubMembership => ({
  registry,
  aib: 'CONNECTED',
  ergar: false,
  sources: [aibConnected(registry), ergarAbsent(registry)],
});
const both = (registry: string, ergarSource?: HubSource): HubMembership => ({
  registry,
  aib: 'CONNECTED',
  ergar: true,
  sources: [aibConnected(registry), ergarSource ?? ergarMember(registry)],
});

export const HUB_MEMBERSHIP: Record<string, HubMembership> = {
  // AIB only
  BE: {
    ...aibOnly('Brugel (Brussels region only)'),
    regionalCoverage:
      'only the Brussels registry (Brugel) is on the AIB gas hub (with near-zero biomethane production); Flanders (VREG) and Wallonia (SPW Energie / CWaPE) issue national non-EECS GOs barred from the AIB Hub, so Belgian biomethane GO export routes are restricted/blocked',
    sources: [
      aibConnected('Brugel (Brussels region)'),
      src('Flemish (VREG) gas GOs are national non-EECS certificates barred from the AIB hub (Flemish DP C.6)', URL_BE_FLANDERS),
      src('Wallonia does not recognise foreign gas GOs and cannot export; national non-EECS GOs (SPW Energie FAQ)', URL_BE_WALLONIA),
      ergarAbsent('Brugel'),
    ],
  },
  CZ: aibOnly('OTE'),
  EE: aibOnly('Elering'),
  FI: aibOnly('Gasgrid Finland'),
  FR: aibOnly('EEX'),
  HU: aibOnly('MEKH'),
  IT: aibOnly('GSE'),
  LV: aibOnly('Conexus'),
  PT: aibOnly('REN'),
  ES: aibOnly('Enagás GTS'),
  SE: {
    registry: 'Energimyndigheten',
    aib: 'CONNECTED',
    ergar: false,
    note:
      'Formally approved by AIB Gas Scheme Group on 20 Aug 2026 and hub-connected from 1 Sep 2026 (AIB news node 3418). Swedish gas GOs are tradeable as EECS GOs over the AIB Hub. Energigas Sverige is an industry trade association, not the issuing authority.',
    sources: [
      aibConnected('Energimyndigheten'),
      src('Sweden joined AIB Gas Scheme Group and is Hub-connected since 1 Sep 2026', URL_AIB_SE_NODE),
      ergarAbsent('Energimyndigheten'),
    ],
  },
  // AIB and ERGaR
  AT: both('E-Control (AIB) / AGCS (ERGaR)'),
  LT: {
    registry: 'Amber Grid',
    aib: 'CONNECTED',
    ergar: true,
    sources: [
      aibConnected('Amber Grid'),
      ergarMember('Amber Grid'),
      src('Amber Grid joined ERGaR in April 2026; transfers to Germany, exchange with Denmark and Slovakia', URL_ERGAR_LT),
    ],
  },
  NL: {
    registry: 'VertiCer',
    aib: 'CONNECTED',
    ergar: false,
    note:
      'VertiCer exited the ERGaR CoO scheme on 1 July 2026; exports permitted via AIB Hub only to EU-designated issuing authorities. Bilateral transfers to German dena via ERGaR terminated.',
    sources: [
      aibConnected('VertiCer'),
      src('VertiCer exited ERGaR on 1 July 2026; exports permitted via AIB Hub only (VertiCer FAQ)', URL_VERTICER_FAQ),
      ergarAbsent('VertiCer'),
    ],
  },
  SK: both('SPP-distribúcia'),
  CH: {
    registry: 'Pronovo',
    aib: 'CONNECTED',
    aibImportOnly: true,
    ergar: true,
    ergarExportUnconfirmed: true,
    note: 'AIB gas imports only; no ERGaR export route published.',
    sources: [
      aibConnected('Pronovo'),
      src('Pronovo: Gas (imports only) on AIB', URL_AIB_REGISTRIES),
      ergarMember('Pronovo'),
      src('Pronovo imports via ERGaR from DE, GB, DK; no export route published', URL_PRONOVO_IMPORT),
    ],
  },
  // ERGaR only / applicant
  DK: {
    registry: 'Energinet',
    aib: 'APPLICANT',
    ergar: true,
    note: 'AIB Gas Scheme applicant since 17 Jun 2026; AIB-connected for electricity only.',
    sources: [
      src('Energinet is an AIB Gas Scheme Group applicant since 17 Jun 2026', URL_AIB_NEWS),
      src('Energinet is connected to AIB for electricity only', URL_AIB_REGISTRIES),
      ergarMember('Energinet'),
    ],
  },
  DE: {
    registry: 'dena Biogasregister',
    aib: 'NONE',
    ergar: true,
    sources: [ergarMember('dena Biogasregister'), src('dena absent from the AIB gas-connected table', URL_AIB_REGISTRIES)],
  },
  GB: {
    registry: 'GGCS',
    aib: 'NONE',
    ergar: true,
    sources: [ergarMember('GGCS'), src('GGCS absent from the AIB gas-connected table', URL_AIB_REGISTRIES)],
  },
  // Neither hub
  PL: {
    registry: 'URE / GAZ-SYSTEM',
    aib: 'NONE',
    ergar: false,
    sources: [src('Poland absent from the AIB gas-connected table', URL_AIB_REGISTRIES), ergarAbsent('Poland')],
  },
  NO: {
    registry: 'Norway (no registry confirmed)',
    aib: 'NONE',
    ergar: false,
    sources: [src('Norway absent from the AIB gas-connected table', URL_AIB_REGISTRIES), ergarAbsent('Norway')],
  },
  IE: {
    registry: 'Gas Networks Ireland',
    aib: 'OBSERVER',
    ergar: false,
    sources: [aibObserver('Gas Networks Ireland'), ergarAbsent('Gas Networks Ireland')],
  },
  RO: {
    registry: 'ANRE',
    aib: 'OBSERVER',
    ergar: false,
    sources: [aibObserver('ANRE'), ergarAbsent('ANRE')],
  },
};

/** Published importer acceptance lists only. Absent key = not published. */
export const ERGAR_ACCEPTS: Record<string, string[]> = {
  DE: ['GB', 'AT', 'DK', 'SK'],
  CH: ['DE', 'GB', 'DK'],
};

export const ERGAR_ACCEPTS_SOURCES: Record<string, HubSource> = {
  DE: src('dena exchanges via ERGaR with GB, AT, DK, SK only (NL VertiCer exited ERGaR 1 Jul 2026)', URL_DENA_INTL),
  CH: src('Pronovo imports via ERGaR from DE, GB, DK', URL_PRONOVO_IMPORT),
};

export interface ExportRestriction {
  /** Applies to these targets only; undefined = all targets. */
  targets?: string[];
  text: string;
  source: HubSource;
}

export const EXPORT_RESTRICTIONS: Record<string, ExportRestriction> = {
  IT: {
    text: 'GOs from supported transport/other-use plants cannot be exported; only unsupported volumes',
    source: src('Only gas GOs not supported by any support mechanism can be exported (AIB-2024-DPIT-GSE)', URL_IT_PROTOCOL),
  },
  GB: {
    targets: ['DE'],
    text: 'non-EU GOs need extra mass-balance proof at dena',
    source: src('Non-EU quantities need mass-balance proof at dena', URL_GB_DE),
  },
};

export interface OriginCaveat {
  text: string;
  sources: HubSource[];
}

export const ORIGIN_CAVEATS: Record<string, OriginCaveat> = {
  PT: {
    text: 'Portugal grants no GOs to supported production devices, so only unsupported volumes have GOs to transfer.',
    sources: [src('"GOs from Production Devices with support are not granted to producers." (C.4.1, AIB-2024 REN gas domain protocol)', URL_PT_PROTOCOL)],
  },
  SK: {
    text: 'Slovakia does not issue (or cancels) gas GOs where the gas was used for electricity that received a surcharge or top-up.',
    sources: [src('Registry Operator shall not issue / shall cancel the renewable-gas GO where electricity support was provided (AIB-2026-DPSK SPP-distribúcia domain protocol)', URL_SK_PROTOCOL)],
  },
  DK: {
    text:
      'Subsidised vs tender volumes: GOs are issued to both supported and unsupported production (Energistyrelsen), but volumes under the 2024+ tender support reportedly get no GOs (secondary source). Energinet is an AIB gas applicant since 17 Jun 2026; no connection date published.',
    sources: [
      src('GOs are issued to both supported and unsupported production in Denmark', URL_DK_CONSULT),
      src('2024+ tender volumes reportedly get no GOs (secondary)', URL_DK_TENDER),
      src('Energinet is an AIB Gas Scheme Group applicant since 17 Jun 2026', URL_AIB_NEWS),
    ],
  },
};

export interface ExDomainPolicy {
  allowed: boolean;
  text: string;
  source: HubSource;
}

/**
 * Ex-domain cancellation = the workaround when two registries share no hub. Sources are the
 * registries' AIB domain protocols.
 */
export const EX_DOMAIN_POLICY: Record<string, ExDomainPolicy> = {
  AT: {
    allowed: false,
    text: 'ex-domain cancellation not possible',
    source: src('"Any ex-domain cancellations are not possible." (AIB-2024-DPAT E-Control domain protocol)', URL_AT_PROTOCOL),
  },
  EE: {
    allowed: false,
    text: 'ex-domain cancellation not permitted',
    source: src('"Ex-domain cancellations are not permitted." (E.12.7, AIB-2024-DPEE Elering domain protocol)', URL_EE_PROTOCOL),
  },
  CH: {
    allowed: false,
    text: 'ex-domain cancellation not allowed for gas',
    source: src('"No Ex-Domain Cancellations are allowed in gas" (AIB-2025-DPCH Pronovo domain protocol)', URL_CH_PROTOCOL),
  },
  BE: {
    allowed: false,
    text: 'ex-domain cancellation only under a specific Brugel procedure',
    source: src('"Ex-domain cancellations are subject to specific conditions" (E.10.6, AIB-2024-DPBEB Brugel domain protocol)', URL_BE_PROTOCOL),
  },
  FI: {
    allowed: false,
    text: 'ex-domain cancellation only under the conditions in the Gasgrid protocol (E.10.7–E.10.8)',
    source: src('Ex-domain cancellation details set out in E.10.7 and E.10.8 (AIB-2026-DPFI Gasgrid domain protocol)', URL_FI_PROTOCOL),
  },
  SK: {
    allowed: false,
    text: 'ex-domain cancellation only under the conditions in the SPP-distribúcia protocol (E.12.11–E.12.12)',
    source: src('Ex-domain cancellation details in E.12.11 and E.12.12 (AIB-2026-DPSK SPP-distribúcia domain protocol)', URL_SK_PROTOCOL),
  },
  ES: {
    allowed: false,
    text: 'ex-domain cancellation not allowed',
    source: src('"No ex-domain cancellations are allowed." (E.10.13, AIB-2023-DPESG domain protocol)', URL_ES_PROTOCOL),
  },
  IT: {
    allowed: false,
    text: 'ex-domain cancellation not allowed',
    source: src('"Ex Domain Cancellations are not allowed" (C.3.5, AIB-2024-DPIT-GSE)', URL_IT_PROTOCOL),
  },
  NL: {
    allowed: false,
    text: 'ex-domain cancellation not allowed',
    source: src('"Ex Domain Cancellations) are not allowed." (AIB-2025-DPNL v3.8 domain protocol)', URL_NL_PROTOCOL),
  },
  SE: {
    allowed: false,
    text: 'ex-domain cancellation not allowed',
    source: src('"Ex domain cancellations are not allowed." (AIB-2024-DPSE; protocol may be electricity-only)', URL_SE_PROTOCOL),
  },
  CZ: {
    allowed: false,
    text: 'ex-domain cancellation only to non-AIB domains, in exceptional cases confirmed by state stakeholders',
    source: src('Allowed only towards non-AIB domains under exceptional circumstances confirmed by state stakeholders', URL_CZ_PROTOCOL),
  },
  FR: {
    allowed: false,
    text: 'ex-domain cancellation only with a signed agreement with the other issuing body',
    source: src('Ex-domain cancellation only with an agreement signed with the other issuing body (AIB-2026-DPFR EEX gas protocol)', URL_FR_PROTOCOL),
  },
};

export const DESTINATION_USE: Record<string, { text: string; source: HubSource }> = {
  DE: {
    text:
      'Imports count for GEG, BEHG and EU ETS (TEHG) on mass-balance proof (Nabisy); not for EEG; THG-Quote treatment unsettled (dena guidance, 2023).',
    source: src('dena: uses of imported biomethane (2023)', URL_DENA_USE),
  },
  IT: {
    text: 'Imported GOs count only for biomethane meeting the art. 42 D.Lgs. 199/2021 sustainability criteria (DM 224/2023).',
    source: src('DM 224/2023 on guarantees of origin', URL_IT_DM224),
  },
  ES: {
    text: 'GOs from other EU states are importable if issued under Directive 2018/2001 (Enagás FAQ, draft).',
    source: src('Enagás GdO FAQ (draft)', URL_ES_FAQ),
  },
  CH: {
    text: 'Imported gas GOs: voluntary market only until state treaties exist (secondary source).',
    source: src('Pronovo: import of gas GOs', URL_PRONOVO_IMPORT),
  },
  SE: {
    text: 'The biogas tax exemption runs on sustainability evidence (Act 2010:598), not on GOs (secondary source; Skatteverket excise guidance 2026).',
    source: src('Skatteverket: new rules on tax on gas (2026)', URL_SE_TAX),
  },
};
