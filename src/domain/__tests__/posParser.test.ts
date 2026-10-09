import { describe, it, expect } from 'vitest';
import { parseProofOfSustainability } from '../consignment/posParser';

describe('Proof of Sustainability (PoS) Certificate Parser', () => {
  it('correctly parses an authentic ISCC EU Danish manure biomethane certificate', () => {
    const isccSample = `
      ISCC EU Certificate
      Certificate Number: EU-ISCC-Cert-DK214-99482710
      Issuing Body: DNV Business Assurance Denmark A/S
      Holder of Certificate: Nature Energy Månsson A/S
      Country: DK
      Feedstock: 80% Liquid Cattle Slurry & Manure, 20% Agricultural Straw
      Volume: 25,000 MWh
      Greenhouse Gas Emissions: -92.5 gCO2e/MJ
      GHG Savings: 198.4%
      Chain of Custody: Mass Balance
    `;

    const parsed = parseProofOfSustainability(isccSample);
    expect(parsed.isValid).toBe(true);
    expect(parsed.scheme).toBe('ISCC_EU');
    expect(parsed.certificateNumber).toBe('EU-ISCC-Cert-DK214-99482710');
    expect(parsed.issuingBody).toContain('DNV');
    expect(parsed.countryCode).toBe('DK');
    expect(parsed.canonicalFeedstock).toBe('manure');
    expect(parsed.annexIxClassification).toBe('ANNEX_IX_A');
    expect(parsed.carbonIntensityGCo2Mj).toBe(-92.5);
    expect(parsed.volumeMWh).toBe(25000);
    expect(parsed.chainOfCustody).toBe('MASS_BALANCE');
    expect(parsed.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('correctly parses a German REDcert-EU organic food waste certificate', () => {
    const redcertSample = `
      REDcert-EU System Certificate
      Cert No: REDcert-EU-DE100-8837192
      Certification Body: TÜV SÜD Industrie Service GmbH
      Company: EnviTec Biogas AG (Güstrow)
      Country: DE
      Substrates: 100% Segregated Organic Food Waste & Bioabfall
      Certified CI: +14.2 gCO2e/MJ
      Total Quantity: 18,500 MWh
      Chain of Custody: Mass Balance
    `;

    const parsed = parseProofOfSustainability(redcertSample);
    expect(parsed.isValid).toBe(true);
    expect(parsed.scheme).toBe('REDCERT_EU');
    expect(parsed.certificateNumber).toBe('REDcert-EU-DE100-8837192');
    expect(parsed.issuingBody).toContain('TÜV');
    expect(parsed.countryCode).toBe('DE');
    expect(parsed.canonicalFeedstock).toBe('food_waste');
    expect(parsed.carbonIntensityGCo2Mj).toBe(14.2);
    expect(parsed.volumeMWh).toBe(18500);
    expect(parsed.annexIxClassification).toBe('ANNEX_IX_A');
  });

  it('correctly flags voluntary ISCC PLUS certificates with warnings', () => {
    const isccPlusSample = `
      ISCC PLUS Certificate
      Cert No: ISCC-PLUS-Cert-NL220-4019283
      Holder: Shell Energy Europe B.V.
      Feedstock: Purpose-Grown Energy Crops (Maize)
      CI: +38.5 gCO2e/MJ
      Chain of Custody: Book and Claim
      Volume: 10,000 MWh
    `;

    const parsed = parseProofOfSustainability(isccPlusSample);
    expect(parsed.scheme).toBe('ISCC_PLUS');
    expect(parsed.canonicalFeedstock).toBe('energy_crops');
    expect(parsed.annexIxClassification).toBe('CROP_BASED');
    expect(parsed.chainOfCustody).toBe('BOOK_AND_CLAIM');
    expect(parsed.auditNotes.some(n => n.includes('voluntary book-and-claim'))).toBe(true);
  });
});

describe('PoS parser — chain-of-custody pack fields (R14)', () => {
  const iscc = `
    ISCC EU Proof of Sustainability
    PoS Number: EU-ISCC-PoS-ES214-0004471
    UDB Reference: UDB-ES-2027-000381
    Certificate Number: EU-ISCC-Cert-ES214-99482710
    Issuing Body: DNV Business Assurance
    Country: ES
    Raw material: 100% pig slurry and cattle manure
    Country of origin of raw material: Spain
    Quantity: 1,000 MWh
    GHG emissions per step (gCO2eq/MJ):
      eec (cultivation): 0.0
      ep (processing): 24.5
      etd (transport and distribution): 3.1
      eu (fuel in use): 0.0
      esca: 0.0
      eccs: 0.0
      eccr: 0.0
      el: 0.0
    Total GHG emissions: -40.0 gCO2eq/MJ
    Operating aid / support received: none
    Chain of Custody: Mass Balance
  `;

  it('reads PoS and UDB numbers, scheme, feedstock origin, support and MWh', () => {
    const { custody } = parseProofOfSustainability(iscc);
    expect(custody.posNumber).toBe('EU-ISCC-PoS-ES214-0004471');
    expect(custody.udbNumber).toBe('UDB-ES-2027-000381');
    expect(custody.scheme).toBe('ISCC_EU');
    expect(custody.feedstock).toContain('Manure');
    expect(custody.feedstockOriginCountry).toBe('ES');
    expect(custody.supportDeclared).toBe('NONE');
    expect(custody.mwh).toBe(1000);
  });

  it('takes the labelled total, not a per-step value, as the CI', () => {
    expect(parseProofOfSustainability(iscc).custody.ciTotal).toBe(-40);
  });

  it('reads the per-step Annex VI values', () => {
    const { ciSteps } = parseProofOfSustainability(iscc).custody;
    expect(ciSteps).toMatchObject({ eec: 0, ep: 24.5, etd: 3.1, eu: 0 });
  });

  it('leaves fields it cannot find null instead of defaulting them', () => {
    const { custody } = parseProofOfSustainability('REDcert-EU System Certificate\nCountry: DE');
    expect(custody.posNumber).toBeNull();
    expect(custody.udbNumber).toBeNull();
    expect(custody.feedstock).toBeNull();
    expect(custody.feedstockOriginCountry).toBeNull();
    expect(custody.ciTotal).toBeNull();
    expect(custody.ciSteps).toBeNull();
    expect(custody.supportDeclared).toBeNull();
    expect(custody.mwh).toBeNull();
  });

  it('classifies investment aid and operating aid', () => {
    expect(parseProofOfSustainability('ISCC EU\nSupport received: investment grant (PRTR)').custody.supportDeclared).toBe('INVESTMENT');
    expect(parseProofOfSustainability('ISCC EU\nOperating aid received: yes (feed-in tariff)').custody.supportDeclared).toBe('OPERATING');
  });

  it('reads European-format quantities and GWh', () => {
    expect(parseProofOfSustainability('ISCC EU\nQuantity: 25.000 MWh').custody.mwh).toBe(25000);
    expect(parseProofOfSustainability('ISCC EU\nVolume: 1,5 GWh').custody.mwh).toBe(1500);
  });
});
