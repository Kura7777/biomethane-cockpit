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
  certificationAndRegistry?: string | null;
  primaryOfftake?: string | null;
  coordinates?: [number, number] | null;
  legalEntityName?: string | null;
  companyRegistrationId?: string | null;
  corporateWebsite?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  headquartersAddress?: string | null;
  operatingCompany?: string | null;
  benchmarkCarbonIntensity?: number | null;
  ciIsEstimated?: boolean;
  contractVolumeMWh?: number | null;
  defaultStatutoryRouting?: string | null;
  domesticSubsidyScheme?: string | null;
  gridConnectionLevel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  primaryOfftakeMarket?: string | null;
  redIIISubcategory?: string | null;
  regionGridZone?: string | null;
  registryGuaranteesOfOrigin?: string | null;
  // Origination & Compliance Attributes (EEG 2027 Cliff & RED III UDB Trackers)
  supportScheme?: string | null; // e.g. 'EEG' | 'FR_TARIF_ACHAT' | 'SDE++' | 'UK_RHI' | 'NONE'
  supportExpiryDate?: string | null; // ISO string / Year e.g. '2026-12-31'
  verifiedCarbonIntensity?: number | null; // gCO2e/MJ audited CI
  auditedCarbonIntensity?: number | null;
  canonicalFeedstockKey?: string | null;
  primaryUpgradingTech?: string | null;
  dataProvenanceTier?: string | null;
  certificationScheme?: 'ISCC_EU' | 'REDCERT_EU' | 'ISCC_PLUS' | string | null;
  certificateNumber?: string | null;
  currentOfftakeStatus?: 'CONTRACTED' | 'UNCONTRACTED' | 'PARTIAL' | 'EXPIRING_SOON' | 'UNKNOWN' | null;
  offtakeContractEnd?: string | null;

  // --- NON-DESTRUCTIVE ENRICHMENT LAYER ---
  verifiedDossier?: VerifiedPlantDossier | null;
  deskOverride?: TraderDeskOverride | null;
}

export interface CommercialContactLead {
  fullName: string;
  title: string;
  roleCategory: 'ORIGINATION' | 'COMMERCIAL_DIRECTOR' | 'PLANT_DIRECTOR' | 'MANAGING_DIRECTOR' | 'SUSTAINABILITY';
  workEmail?: string | null;
  directPhone?: string | null;
  linkedinUrl?: string | null;
  confidenceScore: number; // 0 - 100
  source: 'STATUTORY_FILING' | 'B2B_ENRICHMENT' | 'DESK_VERIFIED' | 'INDUSTRY_DIRECTORY';
  lastVerifiedDate: string;
}

export interface VerifiedPlantDossier {
  statutoryRegister: 'DE_MASTR' | 'FR_SIRENE' | 'GB_COMPANIES_HOUSE' | 'DK_EVIDA_CVR' | 'NL_KVK' | 'IT_GSE' | 'OTHER';
  statutoryRegistrationId: string;
  officialLegalEntity: string;
  legalForm?: string;
  registeredOfficeAddress: string;
  parentGroup?: string;
  groupTradingDeskLocation?: string;
  verifiedWebsiteUrl?: string | null;
  verificationSource: string;
  verifiedAt: string;
  commercialContacts: CommercialContactLead[];
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
