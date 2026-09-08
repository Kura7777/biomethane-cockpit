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
