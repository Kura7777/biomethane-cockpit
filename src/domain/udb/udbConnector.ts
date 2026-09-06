import { sha256 } from '../../shared/crypto/sha256';
import {
  EconomicOperatorUdbRecord,
  UdbTransactionRequest,
  ProofOfSustainabilityCertificate,
  UdbVerificationResult,
  UdbVerificationStatus,
} from './types';

export const EU_INTERCONNECTED_GAS_GRID_COUNTRIES: ReadonlySet<string> = new Set([
  'DK', 'DE', 'NL', 'FR', 'IT', 'ES', 'BE', 'AT', 'PL', 'CZ', 'SE', 'IE', 'PT', 'HU', 'SK', 'RO', 'BG', 'HR', 'SI', 'GR', 'LU', 'LV', 'LT', 'EE', 'FI'
]);

export const STATUTORY_UDB_CITATIONS = {
  RED_III_ART_31A: 'Directive (EU) 2023/2413 (RED III) Article 31a — Union Database for Renewable Fuels',
  RED_III_ART_30: 'Directive (EU) 2023/2413 (RED III) Article 30 — Verification of Compliance with Sustainability Criteria',
  UDB_REG_2024_2792_ART15: 'Commission Implementing Regulation (EU) 2024/2792 Article 15(4) — Single Mass Balance Gas Transmission Grid Perimeter',
  UDB_REG_2024_2792_ART16: 'Commission Implementing Regulation (EU) 2024/2792 Article 16 — Title Transfer & Escrow in the Union Database',
};

/**
 * Institutional Mock Economic Operators in UDB Sandbox
 */
export const UDB_SANDBOX_ECONOMIC_OPERATORS: Record<string, EconomicOperatorUdbRecord> = {
  'EU-UDB-DK-849201': {
    udbId: 'EU-UDB-DK-849201',
    legalEntityName: 'Nature Energy Midtfyn A/S',
    countryIso: 'DK',
    voluntaryScheme: 'ISCC_EU',
    schemeCertificateNumber: 'ISCC-EU-Cert-DE100-849201',
    role: 'PRODUCER',
    status: 'ACTIVE',
    registrationDate: '2024-03-15T08:00:00Z',
    gridInterconnectionId: 'ENERGINET-DK-PT01',
  },
  'EU-UDB-NL-551982': {
    udbId: 'EU-UDB-NL-551982',
    legalEntityName: 'Vitol Gas & Power B.V.',
    countryIso: 'NL',
    voluntaryScheme: 'ISCC_EU',
    schemeCertificateNumber: 'ISCC-EU-Cert-NL200-551982',
    role: 'TRADER',
    status: 'ACTIVE',
    registrationDate: '2024-01-10T10:00:00Z',
    gridInterconnectionId: 'GASUNIE-NL-GTS-09',
  },
  'EU-UDB-DE-391024': {
    udbId: 'EU-UDB-DE-391024',
    legalEntityName: 'Shell Energy Europe B.V. (Köln)',
    countryIso: 'DE',
    voluntaryScheme: 'REDCERT_EU',
    schemeCertificateNumber: 'REDcert2-DE-391024',
    role: 'OFFTAKER',
    status: 'ACTIVE',
    registrationDate: '2024-02-20T09:30:00Z',
    gridInterconnectionId: 'OGE-DE-TENNET-14',
  },
  'EU-UDB-FR-118490': {
    udbId: 'EU-UDB-FR-118490',
    legalEntityName: 'TotalEnergies Gas & Power Ltd.',
    countryIso: 'FR',
    voluntaryScheme: '2BSVS',
    schemeCertificateNumber: '2BS-FR-118490',
    role: 'SUPPLIER',
    status: 'ACTIVE',
    registrationDate: '2024-04-05T14:00:00Z',
    gridInterconnectionId: 'GRTGAZ-FR-NORTH-02',
  },
  'GB-GGCS-OPERATOR-77': {
    udbId: 'GB-GGCS-OPERATOR-77',
    legalEntityName: 'Severn Trent Green Power Ltd.',
    countryIso: 'GB',
    voluntaryScheme: 'ISCC_EU',
    schemeCertificateNumber: 'ISCC-EU-Cert-GB-77123',
    role: 'PRODUCER',
    status: 'ACTIVE',
    registrationDate: '2024-05-12T11:00:00Z',
    gridInterconnectionId: 'NATIONAL-GAS-GB-NTS-22',
  },
};

/**
 * Validates syntax of an Economic Operator UDB Registration ID.
 */
export function validateUdbRegistrationSyntax(udbId: string): boolean {
  if (!udbId || typeof udbId !== 'string') return false;
  const trimmed = udbId.trim();
  // Standard format: EU-UDB-[A-Z]{2}-\d{4,8} or custom national prefix
  const standardPattern = /^EU-UDB-[A-Z]{2}-\d{4,8}$/i;
  const nationalSchemePattern = /^(ISCC|REDCERT|DENA|VERTICER|ENERGINET|ENAGAS|GSE|GGCS)-[A-Z0-9_\-]+$/i;
  const gbPattern = /^GB-[A-Z0-9_\-]+$/i;
  return standardPattern.test(trimmed) || nationalSchemePattern.test(trimmed) || gbPattern.test(trimmed);
}

/**
 * Finds or synthesizes an Economic Operator record for sandbox simulation.
 */
export function lookupOrCreateEconomicOperator(
  udbId: string,
  countryIso: string,
  role: 'PRODUCER' | 'TRADER' | 'SUPPLIER' | 'OFFTAKER' = 'PRODUCER'
): EconomicOperatorUdbRecord {
  if (UDB_SANDBOX_ECONOMIC_OPERATORS[udbId]) {
    return UDB_SANDBOX_ECONOMIC_OPERATORS[udbId];
  }

  // Synthesize provisional sandbox record if valid syntax
  const isSyntaxValid = validateUdbRegistrationSyntax(udbId);
  return {
    udbId,
    legalEntityName: `Economic Operator (${countryIso.toUpperCase()} - ${udbId})`,
    countryIso: countryIso.toUpperCase(),
    voluntaryScheme: 'ISCC_EU',
    schemeCertificateNumber: `ISCC-EU-Cert-${countryIso.toUpperCase()}-${udbId.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`,
    role,
    status: isSyntaxValid ? 'ACTIVE' : 'PROVISIONAL',
    registrationDate: new Date().toISOString(),
    gridInterconnectionId: `TSO-${countryIso.toUpperCase()}-NODE-01`,
  };
}

/**
 * Simulates EU Union Database (UDB) Article 31a RED III mass-balance verification
 * and mints a cryptographic Proof of Sustainability (PoS).
 */
export function verifyAndMintUdbPoS(
  req: UdbTransactionRequest
): UdbVerificationResult {
  const blockingReasons: string[] = [];
  const auditNotes: string[] = [];
  const statutoryCitations: string[] = [
    STATUTORY_UDB_CITATIONS.RED_III_ART_31A,
    STATUTORY_UDB_CITATIONS.UDB_REG_2024_2792_ART15,
  ];

  // 1. Economic Operator Registration Validation
  const isProducerSyntaxValid = validateUdbRegistrationSyntax(req.producerUdbId);
  const isBuyerSyntaxValid = validateUdbRegistrationSyntax(req.buyerUdbId);

  if (!isProducerSyntaxValid) {
    blockingReasons.push(
      `Producer UDB ID '${req.producerUdbId}' fails Article 31a Union Database syntax verification (expected EU-UDB-XX-###### or recognized voluntary scheme ID).`
    );
  }

  if (!isBuyerSyntaxValid) {
    blockingReasons.push(
      `Buyer UDB ID '${req.buyerUdbId}' fails Article 31a Union Database syntax verification.`
    );
  }

  const producer = lookupOrCreateEconomicOperator(req.producerUdbId, req.originCountry, 'PRODUCER');
  const buyer = lookupOrCreateEconomicOperator(req.buyerUdbId, req.injectionCountry, 'OFFTAKER');

  // 2. Physical Gas Transmission Grid Interconnection Boundary Enforcement
  const isOriginEU = EU_INTERCONNECTED_GAS_GRID_COUNTRIES.has(req.originCountry.toUpperCase());
  const isTargetEUMarket =
    req.targetMarketId === 'DE_THG' ||
    req.targetMarketId === 'NL_ERE' ||
    req.targetMarketId === 'FR_CPB' ||
    req.targetMarketId === 'IT_CIC' ||
    req.targetMarketId === 'FUELEU';

  const isGbInjection = req.originCountry.toUpperCase() === 'GB' || req.injectionCountry.toUpperCase() === 'GB';

  if (isGbInjection && isTargetEUMarket) {
    if (!req.bilateralTreatyActive) {
      blockingReasons.push(
        `Physical Grid Boundary Invariant Violation: Consignment gas is injected into the Great Britain (GB) transmission grid. Under RED III Article 31a and Commission Implementing Regulation (EU) 2024/2792 Article 15(4), non-EU grid-injected biomethane cannot clear EU Union Database mass balance into EU compliance destinations without an enacted bilateral treaty.`
      );
    } else {
      auditNotes.push(
        'GB origin gas cleared via active bilateral mutual recognition treaty under RED III Art. 31a.'
      );
    }
  }

  if (!isOriginEU && isTargetEUMarket && !isGbInjection && !req.bilateralTreatyActive) {
    blockingReasons.push(
      `Origin country ${req.originCountry} is outside the single interconnected European gas transmission perimeter (Reg 2024/2792 Art. 15(4)).`
    );
  }

  // 3. Minimum Greenhouse Gas Saving Threshold
  // RED III transport compliance requires >= 65% GHG savings for transport quotas
  if (isTargetEUMarket && req.greenhouseGasSavingPct < 65) {
    blockingReasons.push(
      `Consignment GHG saving (${req.greenhouseGasSavingPct.toFixed(1)}%) does not meet the statutory RED III Article 29(10) transport threshold of >= 65.0%.`
    );
  }

  // 4. Cryptographic Proof of Sustainability (PoS) Minting
  const posId = `POS-EU-2026-${req.originCountry.toUpperCase()}-${Math.abs(
    req.dealId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  )}-${req.volumeMWh}`;

  const canonicalPayload = JSON.stringify({
    posId,
    dealId: req.dealId,
    producerUdbId: producer.udbId,
    buyerUdbId: buyer.udbId,
    originCountry: req.originCountry.toUpperCase(),
    injectionCountry: req.injectionCountry.toUpperCase(),
    targetMarketId: req.targetMarketId,
    feedstock: req.feedstock,
    annexClassification: req.annexClassification,
    greenhouseGasSavingPct: req.greenhouseGasSavingPct,
    volumeMWh: req.volumeMWh,
    gridOperator: req.gridOperator,
    deliveryPeriod: req.deliveryPeriod,
  });

  const sha256ProofHash = sha256(canonicalPayload);

  let verificationStatus: UdbVerificationStatus = 'VERIFIED_COMPLIANT';
  if (blockingReasons.some(r => r.includes('Physical Grid Boundary Invariant Violation') || r.includes('outside the single interconnected'))) {
    verificationStatus = 'REJECTED_BOUNDARY_VIOLATION';
  } else if (!isProducerSyntaxValid || !isBuyerSyntaxValid) {
    verificationStatus = 'REJECTED_INVALID_OPERATOR';
  } else if (blockingReasons.length > 0) {
    verificationStatus = 'REJECTED_BOUNDARY_VIOLATION';
  }

  const isValid = verificationStatus === 'VERIFIED_COMPLIANT';

  if (isValid) {
    statutoryCitations.push(STATUTORY_UDB_CITATIONS.UDB_REG_2024_2792_ART16);
    auditNotes.push(
      `UDB Article 31a mass-balance verified. Title locked in escrow with SHA-256 seal [${sha256ProofHash.slice(0, 12)}...].`
    );
  }

  const posCertificate: ProofOfSustainabilityCertificate = {
    posId,
    dealId: req.dealId,
    verificationStatus,
    escrowStatus: isValid ? 'ESCROW_LOCKED' : 'BLOCKED',
    sha256ProofHash,
    canonicalPayload,
    mintedAt: new Date().toISOString(),
    producer,
    buyer,
    volumeMWh: req.volumeMWh,
    originCountry: req.originCountry.toUpperCase(),
    injectionCountry: req.injectionCountry.toUpperCase(),
    targetMarketId: req.targetMarketId,
    feedstock: req.feedstock,
    ghgSavingPct: req.greenhouseGasSavingPct,
    gridOperator: req.gridOperator,
    statutoryCitations,
    auditNotes,
  };

  return {
    isValid,
    status: verificationStatus,
    posCertificate,
    hashVerified: true,
    boundaryRuleVerified: !blockingReasons.some(r => r.includes('Boundary') || r.includes('perimeter')),
    operatorVerified: isProducerSyntaxValid && isBuyerSyntaxValid,
    blockingReasons,
    auditNotes,
    statutoryCitations,
  };
}

/**
 * Verifies an existing Proof of Sustainability certificate cryptographically against tampering.
 */
export function verifyExistingPoSCertificate(
  certificate: ProofOfSustainabilityCertificate
): { isAuthentic: boolean; recomputedHash: string; status: UdbVerificationStatus } {
  const recomputedHash = sha256(certificate.canonicalPayload);
  const isAuthentic = recomputedHash === certificate.sha256ProofHash;
  return {
    isAuthentic,
    recomputedHash,
    status: isAuthentic ? certificate.verificationStatus : 'REJECTED_HASH_MISMATCH',
  };
}
