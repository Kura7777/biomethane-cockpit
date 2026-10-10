export type ContactConfidence = 'UNDELIVERABLE' | 'INDIRECT' | 'UNVERIFIED_LEAD' | 'NO_CONTACT';

export interface OfficialRegisterLookup {
  countryCode: string;
  countryName: string;
  registerName: string;
  authority: string;
  url: string;
  searchUrl?: string;
  instructions: string;
  mandatoryForOrigination: boolean;
}

export interface PlantContactQuality {
  confidence: ContactConfidence;
  confidenceLabel: string;
  confidenceBadgeColor: 'red' | 'amber' | 'blue' | 'slate';
  reasons: string[];
  isPersonalEmail: boolean;
  isSharedEmail: boolean;
  sharedEmailCount: number;
  isSharedPhone: boolean;
  sharedPhoneCount: number;
  isDeadDomain: boolean;
  isInventedMailbox: boolean;
  isOperatorMismatch: boolean;
  isGridOperatorSwitchboard: boolean;
  gdprWarning?: string;
  officialRegister: OfficialRegisterLookup;
}


/** Detected data-quality defects on a registry record (see plants/dataQuality.ts). */
export interface PlantDataQuality {
  approximateCoordinates: boolean; // centroid placeholder shared by 5+ records
  syntheticAddress: boolean;       // template street address, not a published site address
  placeholderRegion: boolean;      // "<Country> Grid Injection Zone"
  duplicateOf: string | null;      // id of an identical earlier record (name, capacity, energy, coordinates)
  contactConfidence?: ContactConfidence;
}

export interface BiomethanePlant {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  provenance: string; // Sourced authority (e.g. 'GIE/EBA European Biomethane Map 2026')
  isVerified?: boolean; // Whether plant attributes (capacity, coordinates, feedstock) are individually verified
  fieldsUnverified?: string[]; // List of fields that are unverified in source map
  dataQuality?: PlantDataQuality;
  contactQuality?: PlantContactQuality;

  region?: string | null;
  operator?: string | null;
  status?: 'Active' | 'Under Construction' | 'Planned' | string | null;
  commissioningYear?: number | null;
  capacityNm3h?: number | null;
  annualEnergyGWh?: number | null;
  primaryFeedstockCategory?: string | null;
  feedstockDetails?: string | null;
  upgradingTechnology?: string | null;
  gridConnectionType?: string | null;
  networkOperator?: string | null;
  primaryOfftake?: string | null;
  coordinates?: [number, number] | null;
  legalEntityName?: string | null;
  companyRegistrationId?: string | null;
  corporateWebsite?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  headquartersAddress?: string | null;
  operatingCompany?: string | null;
  ciIsEstimated?: boolean;
  gridConnectionLevel?: string | null;
  // Origination & Compliance Attributes (EEG 2027 Cliff & RED III UDB Trackers)
  supportScheme?: string | null; // e.g. 'EEG' | 'FR_TARIF_ACHAT' | 'SDE++' | 'UK_RHI' | 'NONE'
  supportExpiryDate?: string | null; // ISO string / Year e.g. '2026-12-31'
  canonicalFeedstockKey?: string | null;
  primaryUpgradingTech?: string | null;
  certificationScheme?: 'ISCC_EU' | 'REDCERT_EU' | 'ISCC_PLUS' | string | null;
  certificateNumber?: string | null;

  // --- NON-DESTRUCTIVE ENRICHMENT LAYER ---
  verifiedDossier?: VerifiedPlantDossier | null;
  deskOverride?: TraderDeskOverride | null;
  /** Registration ID as it appears in the raw registry, before any register check. */
  claimedRegistrationId?: string | null;
  /** Outcome of checking claimedRegistrationId against the national register, if checked. */
  registrationCheck?: RegistrationCheck | null;
  /** Suggestion matched from an authoritative register (e.g. MaStR) for a trader to confirm. */
  registerMatch?: RegisterMatch | null;
  /** Sourced research record for counterparty outreach. */
  research?: PlantResearch | null;
}

export type SourceCheckStatus =
  | 'VERIFIED'
  | 'NOT_ON_PAGE'
  | 'PAGE_NOT_FOUND'
  | 'DNS_FAIL'
  | 'BLOCKED'
  | 'PDF_UNCHECKED'
  | 'ERROR';

export interface SourceCheckDetail {
  status: SourceCheckStatus;
  checkedAt: string;
  httpStatus?: number;
  finalUrl?: string;
  error?: string;
  viesValid?: boolean;
  companyStatus?: string;
}

export interface SourcedValue<T = string> {
  value: T;
  sourceUrl: string;
  retrievedAt: string;
  note?: string;
  check?: SourceCheckDetail;
}

export type ResearchContactType =
  | 'COMPANY_SWITCHBOARD'
  | 'GENERIC_EMAIL'
  | 'CONTACT_FORM'
  | 'SALES_OR_ENERGY_EMAIL'
  | 'NAMED_PERSON';

export type ContactScope = 'PLANT_OPERATOR' | 'PARENT_COMMERCIAL' | 'GENERAL_OR_PRESS';

export interface ResearchContact {
  type: ResearchContactType;
  value: string; // phone, email or form URL
  personName?: string; // NAMED_PERSON only
  role?: string; // as published
  sourceUrl: string; // page where it is published
  retrievedAt: string;
  note?: string; // verbatim quote or snippet from sourceUrl
  contactScope?: ContactScope;
  check?: SourceCheckDetail;
}

export type OutreachTier = 'READY' | 'ENTITY_ONLY' | 'UNRESOLVED';

export interface PlantResearch {
  plantId: string;
  status: 'ACTIVE' | 'UNDER_CONSTRUCTION' | 'PLANNED' | 'CLOSED' | 'UNKNOWN';
  legalEntity: SourcedValue | null; // operating company (SPV) as registered
  registrationId: SourcedValue | null; // e.g. "CIF B12345678" — only from an official register or the company's legal notice
  registerSource: string | null; // e.g. "Registro Mercantil / BORME", "VIES"
  parentGroup: SourcedValue | null; // group/developer that owns the SPV
  siteAddress: SourcedValue | null;
  siteCoordinates: SourcedValue<[number, number]> | null; // from a published source or OSM Nominatim geocode of siteAddress
  website: SourcedValue | null; // official site of the SPV or parent
  contacts: ResearchContact[];
  injectionOrOfftakeNotes: SourcedValue[]; // e.g. existing offtaker, grid connection, GO registration, subsidy
  tier: OutreachTier;
  effectiveTier?: OutreachTier;
  researchedAt: string;
  openQuestions: string[]; // what a trader should still confirm
  plantLink?: SourcedValue | null; // source linking the plant to that entity
  /** Chain-of-custody facts for green-gas deals (data/plant_research/<cc>.compliance.json). Absent where not researched. */
  compliance?: PlantCompliance | null;
}

export type TriState = 'YES' | 'NO' | 'UNKNOWN';
export type InjectionLevel = 'TSO' | 'DSO' | 'OFF_GRID' | 'UNKNOWN';

/** A scheme certificate as read off the scheme database. */
export interface PlantCertificate {
  scheme: string;           // e.g. 'ISCC_EU'
  certificateNumber: string;
  validUntil: string;       // ISO date
  status: 'VALID' | 'EXPIRED' | string;
}

/** PRTR (Orden TED/706/2022) biogas grant. `bdnsResult` NO_RECORD means the public register showed nothing, which is not proof of NO. */
export interface PrtrGrantValue extends SourcedValue<TriState> {
  bdnsResult?: 'NO_RECORD' | string;
  details?: Record<string, unknown>;
}

/**
 * Compliance facts for one plant. Every value is a SourcedValue (source link + verbatim quote in
 * `note`) or null when nothing was found. "UNKNOWN" as a value means a source was searched and said
 * nothing; it is never read as NO. In particular a missing PRTR grant stays UNKNOWN because the
 * public grants register (BDNS) lists only part of the programme.
 */
export interface PlantCompliance {
  gdoRegistered: SourcedValue<TriState> | null;
  injection: SourcedValue<InjectionLevel> | null;
  operatingSince: SourcedValue | null;
  /** Metered output for a year, in GWh. Distinct from the map's capacity-based annualEnergyGWh. */
  actualProductionGWh: SourcedValue<{ value: number; year: number }> | null;
  capacityNm3h: SourcedValue<number> | null;
  feedstockMix: SourcedValue | null;
  certification: SourcedValue<PlantCertificate> | null;
  prtrGrant: PrtrGrantValue | null;
  otherAid: SourcedValue | null;
  /** Published carbon intensity, gCO2e/MJ. Only a sourced value may ever default a CI. */
  reportedCI: SourcedValue<number> | null;
  currentOfftake: SourcedValue | null;
  nominalCapacityGWh?: SourcedValue<number> | null;
  openQuestions: string[];
  researchedAt: string;
  /** True for records that are not a real injecting plant (duplicate or not a plant). Kept in the data, left out of shortlists. */
  excluded?: boolean;
  excludedReason?: string;
  /** The injecting entity actually at this site, when the app's record points at a different company. */
  correctedEntity?: SourcedValue<{ name: string; cif?: string; certificateNumber?: string; prtrGrantEur?: number }> | null;
}

export type RegistrationCheckStatus = 'CONFIRMED' | 'MISMATCH' | 'NOT_FOUND' | 'ERROR';

export interface RegistrationCheck {
  status: RegistrationCheckStatus;
  claimedId: string;
  /** Register or register mirror queried, and when. */
  source: string;
  checkedAt: string;
  /** What the register holds under that ID (null if nothing). active is null when the source does not say. */
  register: { name: string; naf: string | null; active: boolean | null; commune: string | null } | null;
}

export type RegisterMatchStatus = 'MATCHED' | 'AMBIGUOUS' | 'NO_MATCH';

export type RegisterMatchKind = 'OPERATOR_REGISTER' | 'INJECTION_SITE' | 'PROJECT_DATABASE';

export interface RegisterMatchCandidate {
  operatorName: string;
  operatorRegisterId: string | null;   // e.g. "HRB 12345 (AG Oldenburg)", SIREN, MaStR ABR…
  unitId: string | null;               // e.g. MaStR SEE…/GSE… unit number
  idLabel: string;
  nameLabel: string;
  town: string | null;
  coordinates: [number, number] | null;
  capacity: string | null;             // as the register states it, with unit
  evidence: string[];                  // human-readable reasons, e.g. "1.2 km from plant", "same PLZ 16303"
}

export interface RegisterMatch {
  status: RegisterMatchStatus;
  matchKind: RegisterMatchKind;
  source: string;                      // register + dataset name/version
  checkedAt: string;                   // ISO date
  best: RegisterMatchCandidate | null; // set only for MATCHED
  candidates: RegisterMatchCandidate[];// top 3 for AMBIGUOUS
}

export interface CommercialContactLead {
  fullName: string;
  title: string;
  roleCategory: 'ORIGINATION' | 'COMMERCIAL_DIRECTOR' | 'PLANT_DIRECTOR' | 'MANAGING_DIRECTOR' | 'SUSTAINABILITY';
  workEmail?: string | null;
  directPhone?: string | null;
  linkedinUrl?: string | null;
  /** Only set for contacts a trader has confirmed; generated leads carry no score. */
  confidenceScore: number | null;
  /**
   * SOURCE_DATASET: copied from the raw plant registry (see contactQuality for its rating).
   * SUGGESTED_ROLE: a role/desk worth asking for — not a confirmed person or address.
   * INDUSTRY_DIRECTORY: a public association or registry desk.
   * DESK_VERIFIED: confirmed by a trader.
   */
  source: 'SOURCE_DATASET' | 'SUGGESTED_ROLE' | 'INDUSTRY_DIRECTORY' | 'DESK_VERIFIED';
  lastVerifiedDate: string | null;
}

/** REGISTER_CONFIRMED: entity and ID checked against the national register on verifiedAt. */
export type DossierVerificationStatus = 'REGISTER_CONFIRMED' | 'UNVERIFIED';

/**
 * Plant counterparty dossier. Despite the historical name, only fields with
 * verificationStatus 'REGISTER_CONFIRMED' have been checked against a register.
 */
export interface VerifiedPlantDossier {
  verificationStatus: DossierVerificationStatus;
  /** True when the entity & CIF were confirmed via an official register in desk research (e.g. BORME/VIES). */
  researchConfirmedEntity?: boolean;
  statutoryRegister: 'DE_MASTR' | 'FR_SIRENE' | 'GB_COMPANIES_HOUSE' | 'DK_EVIDA_CVR' | 'NL_KVK' | 'IT_GSE' | 'OTHER';
  /** Null unless confirmed against the register. */
  statutoryRegistrationId: string | null;
  /** Null when no entity name is known (never synthesised). */
  officialLegalEntity: string | null;
  legalForm?: string;
  registeredOfficeAddress: string;
  parentGroup?: string;
  groupTradingDeskLocation?: string;
  verifiedWebsiteUrl?: string | null;
  linkedinCompanyUrl?: string | null;
  linkedinSearchUrl?: string | null;
  verificationSource: string;
  verifiedAt: string | null;
  /** Register search page for the trader to confirm the entity themselves. */
  registerSearchUrl?: string | null;
  commercialContacts: CommercialContactLead[];
  /** Suggestion matched from register for trader confirmation when no confirmed entity exists. */
  suggestedEntity?: {
    name: string;
    registerId: string | null;
    unitId?: string | null;
    matchKind: RegisterMatchKind;
    idLabel: string;
    nameLabel: string;
    evidence: string[];
    source: string;
  } | null;
}

export interface TraderDeskOverride {
  plantId: string;
  traderName: string;
  verifiedAt: string;
  counterpartySignatory: string;
  directEmail?: string | null;
  directPhone?: string | null;
  notes?: string | null;
  isConfirmed: boolean;
}

export interface DeveloperPortfolio {
  id: string;
  name: string;
  countryHQ: string;
  countryFlag: string;
  totalCapacityGWh?: number | null;
  coreGeographies: string[];
  signatureAssets: string[];
  strategicFocus: string;
  provenance?: string;
}

export interface CountryMacroStat {
  country: string;
  iso: string;
  flag: string;
  activePlants: number;
  installedCapacityTWh?: number | null;
  installedCapacityMcm?: number | null;
  avgPlantSizeNm3h?: number | null;
  gridConnectionRate?: number | null;
  primaryFeedstockType?: string | null;
  primaryUpgradingTech?: string | null;
  nationalRegistry?: string | null;
  provenance?: string;
}
