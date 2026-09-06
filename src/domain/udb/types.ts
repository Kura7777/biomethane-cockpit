export type UdbVerificationStatus =
  | 'VERIFIED_COMPLIANT'
  | 'REJECTED_BOUNDARY_VIOLATION'
  | 'REJECTED_INVALID_OPERATOR'
  | 'REJECTED_HASH_MISMATCH'
  | 'PENDING_REGISTRATION';

export type UdbEscrowStatus =
  | 'DRAFT'
  | 'ESCROW_LOCKED'
  | 'TITLE_TRANSFERRED'
  | 'CANCELLED'
  | 'BLOCKED';

export interface EconomicOperatorUdbRecord {
  udbId: string;
  legalEntityName: string;
  countryIso: string;
  voluntaryScheme: 'ISCC_EU' | 'REDCERT_EU' | '2BSVS' | 'BETTER_BIOMASS';
  schemeCertificateNumber: string;
  role: 'PRODUCER' | 'TRADER' | 'SUPPLIER' | 'OFFTAKER';
  status: 'ACTIVE' | 'SUSPENDED' | 'PROVISIONAL';
  registrationDate: string;
  gridInterconnectionId: string;
}

export interface UdbTransactionRequest {
  dealId: string;
  producerUdbId: string;
  buyerUdbId: string;
  originCountry: string;
  injectionCountry: string;
  targetMarketId: string;
  feedstock: string;
  annexClassification: string;
  greenhouseGasSavingPct: number;
  volumeMWh: number;
  gridOperator: string;
  deliveryPeriod: string;
  bilateralTreatyActive?: boolean;
}

export interface ProofOfSustainabilityCertificate {
  posId: string;
  dealId: string;
  verificationStatus: UdbVerificationStatus;
  escrowStatus: UdbEscrowStatus;
  sha256ProofHash: string;
  canonicalPayload: string;
  mintedAt: string;
  producer: EconomicOperatorUdbRecord;
  buyer: EconomicOperatorUdbRecord;
  volumeMWh: number;
  originCountry: string;
  injectionCountry: string;
  targetMarketId: string;
  feedstock: string;
  ghgSavingPct: number;
  gridOperator: string;
  statutoryCitations: string[];
  auditNotes: string[];
}

export interface UdbVerificationResult {
  isValid: boolean;
  status: UdbVerificationStatus;
  posCertificate?: ProofOfSustainabilityCertificate;
  hashVerified: boolean;
  boundaryRuleVerified: boolean;
  operatorVerified: boolean;
  blockingReasons: string[];
  auditNotes: string[];
  statutoryCitations: string[];
}
