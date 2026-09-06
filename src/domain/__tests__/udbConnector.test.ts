import { describe, it, expect } from 'vitest';
import {
  validateUdbRegistrationSyntax,
  verifyAndMintUdbPoS,
  verifyExistingPoSCertificate,
  EU_INTERCONNECTED_GAS_GRID_COUNTRIES,
  STATUTORY_UDB_CITATIONS,
} from '../udb/udbConnector';
import { UdbTransactionRequest } from '../udb/types';

describe('EU Union Database (UDB) Sandbox Connector & PoS Verification', () => {
  it('validates standard UDB and national voluntary scheme ID syntax', () => {
    expect(validateUdbRegistrationSyntax('EU-UDB-DK-849201')).toBe(true);
    expect(validateUdbRegistrationSyntax('EU-UDB-DE-391024')).toBe(true);
    expect(validateUdbRegistrationSyntax('ISCC-EU-Cert-DE100-12345')).toBe(true);
    expect(validateUdbRegistrationSyntax('GB-GGCS-OPERATOR-77')).toBe(true);
    expect(validateUdbRegistrationSyntax('')).toBe(false);
    expect(validateUdbRegistrationSyntax('random_invalid_string')).toBe(false);
  });

  it('verifies compliant cross-border mass-balance transfer within EU interconnected grid', () => {
    const req: UdbTransactionRequest = {
      dealId: 'DEAL-2026-DK-NL-01',
      producerUdbId: 'EU-UDB-DK-849201',
      buyerUdbId: 'EU-UDB-NL-551982',
      originCountry: 'DK',
      injectionCountry: 'DK',
      targetMarketId: 'NL_ERE',
      feedstock: 'manure',
      annexClassification: 'ANNEX_IX_A',
      greenhouseGasSavingPct: 82.5,
      volumeMWh: 40000,
      gridOperator: 'Energinet',
      deliveryPeriod: 'Cal-2026',
    };

    const res = verifyAndMintUdbPoS(req);

    expect(res.isValid).toBe(true);
    expect(res.status).toBe('VERIFIED_COMPLIANT');
    expect(res.posCertificate).toBeDefined();
    expect(res.posCertificate?.sha256ProofHash).toHaveLength(64);
    expect(res.posCertificate?.escrowStatus).toBe('ESCROW_LOCKED');
    expect(res.statutoryCitations).toContain(STATUTORY_UDB_CITATIONS.RED_III_ART_31A);
    expect(res.statutoryCitations).toContain(STATUTORY_UDB_CITATIONS.UDB_REG_2024_2792_ART15);

    // Cryptographic authentication test
    const auth = verifyExistingPoSCertificate(res.posCertificate!);
    expect(auth.isAuthentic).toBe(true);
    expect(auth.status).toBe('VERIFIED_COMPLIANT');
  });

  it('strictly enforces statutory GB gas grid non-interconnection invariant', () => {
    // GB gas grid injected volume attempting to clear into German THG quota without treaty
    const req: UdbTransactionRequest = {
      dealId: 'DEAL-2026-GB-DE-02',
      producerUdbId: 'GB-GGCS-OPERATOR-77',
      buyerUdbId: 'EU-UDB-DE-391024',
      originCountry: 'GB',
      injectionCountry: 'GB',
      targetMarketId: 'DE_THG',
      feedstock: 'food_waste',
      annexClassification: 'ANNEX_IX_A',
      greenhouseGasSavingPct: 75.0,
      volumeMWh: 30000,
      gridOperator: 'National Gas Transmission',
      deliveryPeriod: 'Cal-2026',
      bilateralTreatyActive: false,
    };

    const res = verifyAndMintUdbPoS(req);

    expect(res.isValid).toBe(false);
    expect(res.status).toBe('REJECTED_BOUNDARY_VIOLATION');
    expect(res.posCertificate?.escrowStatus).toBe('BLOCKED');
    expect(res.blockingReasons.some(r => r.includes('Great Britain (GB) transmission grid'))).toBe(true);
  });

  it('allows GB transfer if bilateral treaty is active or destination is domestic UK_RTFO', () => {
    const treatyReq: UdbTransactionRequest = {
      dealId: 'DEAL-2026-GB-DE-TREATY',
      producerUdbId: 'GB-GGCS-OPERATOR-77',
      buyerUdbId: 'EU-UDB-DE-391024',
      originCountry: 'GB',
      injectionCountry: 'GB',
      targetMarketId: 'DE_THG',
      feedstock: 'manure',
      annexClassification: 'ANNEX_IX_A',
      greenhouseGasSavingPct: 80.0,
      volumeMWh: 20000,
      gridOperator: 'National Gas Transmission',
      deliveryPeriod: 'Cal-2026',
      bilateralTreatyActive: true,
    };

    const treatyRes = verifyAndMintUdbPoS(treatyReq);
    expect(treatyRes.isValid).toBe(true);
    expect(treatyRes.status).toBe('VERIFIED_COMPLIANT');
  });

  it('rejects consignment failing RED III transport GHG threshold (< 65%)', () => {
    const lowGhgReq: UdbTransactionRequest = {
      dealId: 'DEAL-LOW-GHG',
      producerUdbId: 'EU-UDB-DE-391024',
      buyerUdbId: 'EU-UDB-NL-551982',
      originCountry: 'DE',
      injectionCountry: 'DE',
      targetMarketId: 'DE_THG',
      feedstock: 'crop',
      annexClassification: 'CONVENTIONAL',
      greenhouseGasSavingPct: 55.0, // Below 65% threshold
      volumeMWh: 10000,
      gridOperator: 'OGE',
      deliveryPeriod: 'Cal-2026',
    };

    const res = verifyAndMintUdbPoS(lowGhgReq);
    expect(res.isValid).toBe(false);
    expect(res.blockingReasons.some(r => r.includes('does not meet the statutory RED III Article 29(10)'))).toBe(true);
  });

  it('detects tampering in PoS certificate hash verification', () => {
    const req: UdbTransactionRequest = {
      dealId: 'DEAL-TAMPER-TEST',
      producerUdbId: 'EU-UDB-DK-849201',
      buyerUdbId: 'EU-UDB-NL-551982',
      originCountry: 'DK',
      injectionCountry: 'DK',
      targetMarketId: 'NL_ERE',
      feedstock: 'manure',
      annexClassification: 'ANNEX_IX_A',
      greenhouseGasSavingPct: 85.0,
      volumeMWh: 15000,
      gridOperator: 'Energinet',
      deliveryPeriod: 'Cal-2026',
    };

    const res = verifyAndMintUdbPoS(req);
    const cert = res.posCertificate!;

    // Tamper with payload
    const tamperedCert = {
      ...cert,
      canonicalPayload: cert.canonicalPayload.replace('15000', '99999'), // forged volume
    };

    const check = verifyExistingPoSCertificate(tamperedCert);
    expect(check.isAuthentic).toBe(false);
    expect(check.status).toBe('REJECTED_HASH_MISMATCH');
  });
});
