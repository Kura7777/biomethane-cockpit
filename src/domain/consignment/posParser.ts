/**
 * Automated Proof of Sustainability (PoS) Certificate Parser
 * 
 * Supports statutory RED III recognized voluntary schemes:
 * - ISCC EU (International Sustainability and Carbon Certification)
 * - REDcert-EU / REDcert²
 * - 2BSvs (Biomass Biofuels Sustainability Voluntary Scheme)
 * - KZR INiG (Polish System of Certification of Sustainable Biofuels)
 * - Raw JSON / CSV Consignment Declarations
 */

import { ChainOfCustody } from './types';

export interface ParsedSubstrate {
  name: string;
  percentage: number;
  canonicalCategory: 'manure' | 'food_waste' | 'sewage' | 'energy_crops' | 'landfill_gas';
}

export interface ParsedPoSCertificate {
  isValid: boolean;
  scheme: 'ISCC_EU' | 'REDCERT_EU' | '2BSVS' | 'KZR_INIG' | 'ISCC_PLUS' | 'UNKNOWN';
  schemeLabel: string;
  certificateNumber: string;
  issuingBody: string;
  producerName: string;
  countryCode: string;
  commissioningDate?: string;
  primaryFeedstockName: string;
  canonicalFeedstock: 'manure' | 'food_waste' | 'sewage' | 'energy_crops' | 'landfill_gas';
  annexIxClassification: 'ANNEX_IX_A' | 'ANNEX_IX_B' | 'CROP_BASED' | 'OTHER';
  substrates: ParsedSubstrate[];
  carbonIntensityGCo2Mj: number;
  ghgSavingsPct: number;
  volumeMWh: number;
  chainOfCustody: ChainOfCustody;
  auditNotes: string[];
  confidenceScore: number;
}

const FOSSIL_COMPARATOR = 94.0; // RED III Fossil Fuel Comparator (gCO2e/MJ)

export function parseProofOfSustainability(rawInput: string): ParsedPoSCertificate {
  const text = rawInput.trim();
  const notes: string[] = [];
  let confidence = 0;

  // 1. Detect Certification Scheme
  let scheme: ParsedPoSCertificate['scheme'] = 'UNKNOWN';
  let schemeLabel = 'Unrecognized Scheme';

  if (/ISCC[\s_-]?EU/i.test(text) || /EU-ISCC-Cert/i.test(text)) {
    scheme = 'ISCC_EU';
    schemeLabel = 'ISCC EU (RED III Recognized)';
    confidence += 25;
  } else if (/REDcert[\s_-]?EU/i.test(text) || /REDcert-EU-/i.test(text)) {
    scheme = 'REDCERT_EU';
    schemeLabel = 'REDcert-EU (RED III Recognized)';
    confidence += 25;
  } else if (/2BSvs|2BS-vs/i.test(text)) {
    scheme = '2BSVS';
    schemeLabel = '2BSvs (French/EU RED III)';
    confidence += 25;
  } else if (/KZR[\s_-]?INiG/i.test(text)) {
    scheme = 'KZR_INIG';
    schemeLabel = 'KZR INiG (Polish/EU RED III)';
    confidence += 25;
  } else if (/ISCC[\s_-]?PLUS/i.test(text)) {
    scheme = 'ISCC_PLUS';
    schemeLabel = 'ISCC PLUS (Voluntary Scope 1 Only)';
    confidence += 20;
    notes.push('Caution: ISCC PLUS is voluntary book-and-claim, not valid for RED III compliance quotas.');
  }

  // 2. Certificate Number
  let certificateNumber = 'UNSPECIFIED-POS-001';
  const certMatch = text.match(/(?:certificate\s*(?:number|no|#)|cert\s*no|zertifikat-nr\.?)\s*[:=]?\s*([A-Z0-9_-]+(?:-[A-Z0-9_-]+)+)/i)
    || text.match(/(ISCC-[A-Z0-9_-]+|REDcert-[A-Z0-9_-]+|2BS-[A-Z0-9_-]+)/i);
  if (certMatch) {
    certificateNumber = certMatch[1].trim();
    confidence += 15;
  }

  // 3. Issuing Body
  let issuingBody = 'Accredited Certification Body';
  if (/DNV/i.test(text)) issuingBody = 'DNV Business Assurance';
  else if (/T[UÜ]V\s*(?:S[UÜ]D|Rheinland|NORD|Hessen)/i.test(text)) issuingBody = text.match(/T[UÜ]V\s*(?:S[UÜ]D|Rheinland|NORD|Hessen)/i)![0];
  else if (/SGS/i.test(text)) issuingBody = 'SGS Germany GmbH';
  else if (/DEKRA/i.test(text)) issuingBody = 'DEKRA Certification GmbH';
  else if (/Bureau\s*Veritas/i.test(text)) issuingBody = 'Bureau Veritas';
  else if (/Control\s*Union/i.test(text)) issuingBody = 'Control Union Certifications';

  // 4. Producer / Facility Name
  let producerName = 'Audited Biomethane Facility';
  const producerMatch = text.match(/(?:producer|facility|holder|company|betrieb|anlage)\s*[:=]\s*([^\n\r,;]+)/i);
  if (producerMatch) {
    producerName = producerMatch[1].trim();
    confidence += 10;
  }

  // 5. Country Detection
  let countryCode = 'DK';
  const countryMatch = text.match(/(?:country|land|pays|stato)\s*[:=]?\s*([A-Z]{2})\b/i);
  if (countryMatch) {
    countryCode = countryMatch[1].toUpperCase();
  } else if (/Denmark|Danish|Energinet/i.test(text)) countryCode = 'DK';
  else if (/Germany|Deutschland|BNetzA/i.test(text)) countryCode = 'DE';
  else if (/France|Français|GRTgaz/i.test(text)) countryCode = 'FR';
  else if (/Netherlands|Nederland|VertiCer/i.test(text)) countryCode = 'NL';
  else if (/Italy|Italia|GSE/i.test(text)) countryCode = 'IT';
  else if (/Spain|España|Enagás/i.test(text)) countryCode = 'ES';
  else if (/United Kingdom|Great Britain|Ofgem/i.test(text)) countryCode = 'GB';

  // 6. Feedstock Substrates & Percentages
  const substrates: ParsedSubstrate[] = [];
  let canonicalFeedstock: ParsedPoSCertificate['canonicalFeedstock'] = 'manure';
  let annexIxClassification: ParsedPoSCertificate['annexIxClassification'] = 'ANNEX_IX_A';

  const manureMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:cattle|swine|pig|dairy|cow|liquid|poultry)?\s*(?:manure|slurry|gülle|festmist|lisier)/i)
    || text.match(/(?:manure|slurry|gülle|festmist|lisier)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i);
  const foodWasteMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:food\s*waste|organic\s*waste|biowaste|bioabfall|déchets\s*alimentaires)/i);
  const sewageMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:sewage|sludge|klPowerärschlamm|boues)/i);
  const cropMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:maize|corn|energy\s*crops|nawaro|cultures\s*dédiées)/i);

  if (manureMatch) {
    substrates.push({ name: 'Liquid Cattle/Swine Manure & Slurry', percentage: parseFloat(manureMatch[1]), canonicalCategory: 'manure' });
  }
  if (foodWasteMatch) {
    substrates.push({ name: 'Segregated Organic Biowaste', percentage: parseFloat(foodWasteMatch[1]), canonicalCategory: 'food_waste' });
  }
  if (sewageMatch) {
    substrates.push({ name: 'Municipal Sewage Sludge', percentage: parseFloat(sewageMatch[1]), canonicalCategory: 'sewage' });
  }
  if (cropMatch) {
    substrates.push({ name: 'Energy Crops (Maize Silage)', percentage: parseFloat(cropMatch[1]), canonicalCategory: 'energy_crops' });
  }

  // If no percentage was found, check keywords
  if (substrates.length === 0) {
    if (/manure|slurry|gülle|lisier/i.test(text)) {
      substrates.push({ name: 'Audited Agricultural Manure & Slurry', percentage: 100, canonicalCategory: 'manure' });
      canonicalFeedstock = 'manure';
      annexIxClassification = 'ANNEX_IX_A';
      confidence += 20;
    } else if (/food\s*waste|biowaste|bioabfall/i.test(text)) {
      substrates.push({ name: 'Segregated Food & Industrial Biowaste', percentage: 100, canonicalCategory: 'food_waste' });
      canonicalFeedstock = 'food_waste';
      annexIxClassification = 'ANNEX_IX_A';
      confidence += 20;
    } else if (/sewage|sludge/i.test(text)) {
      substrates.push({ name: 'Municipal Wastewater Sludge', percentage: 100, canonicalCategory: 'sewage' });
      canonicalFeedstock = 'sewage';
      annexIxClassification = 'ANNEX_IX_A';
      confidence += 20;
    } else if (/crops?|maize|silage|nawaro/i.test(text)) {
      substrates.push({ name: 'Purpose-Grown Energy Crops', percentage: 100, canonicalCategory: 'energy_crops' });
      canonicalFeedstock = 'energy_crops';
      annexIxClassification = 'CROP_BASED';
      confidence += 20;
    }
  } else {
    confidence += 20;
    // Determine primary substrate
    substrates.sort((a, b) => b.percentage - a.percentage);
    canonicalFeedstock = substrates[0].canonicalCategory;
    if (canonicalFeedstock === 'energy_crops') {
      annexIxClassification = 'CROP_BASED';
    } else {
      annexIxClassification = 'ANNEX_IX_A';
    }
  }

  // 7. Carbon Intensity & GHG Savings
  let carbonIntensityGCo2Mj = canonicalFeedstock === 'manure' ? -85.0 : canonicalFeedstock === 'food_waste' ? 15.0 : 38.0;
  let ghgSavingsPct = Number((((FOSSIL_COMPARATOR - carbonIntensityGCo2Mj) / FOSSIL_COMPARATOR) * 100).toFixed(1));

  const ciMatch = text.match(/(?:carbon\s*intensity|ci|ghg\s*emissions?|thg-emissionen)\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)\s*(?:g\s*co2(?:eq?)?\/?mj|gco2e\/mj)/i)
    || text.match(/([+-]?\d+(?:\.\d+)?)\s*(?:g\s*co2(?:eq?)?\/?mj|gco2e\/mj)/i);
  if (ciMatch) {
    carbonIntensityGCo2Mj = parseFloat(ciMatch[1]);
    ghgSavingsPct = Number((((FOSSIL_COMPARATOR - carbonIntensityGCo2Mj) / FOSSIL_COMPARATOR) * 100).toFixed(1));
    confidence += 20;
  }

  const ghgMatch = text.match(/(?:ghg\s*savings?|thg-minderung|einsparung)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (ghgMatch && !ciMatch) {
    ghgSavingsPct = parseFloat(ghgMatch[1]);
    carbonIntensityGCo2Mj = Number((FOSSIL_COMPARATOR * (1 - ghgSavingsPct / 100)).toFixed(1));
    confidence += 20;
  }

  // 8. Quantity / Volume (MWh or Nm3)
  let volumeMWh = 10000;
  const volMatch = text.match(/(?:quantity|volume|menge|energiegehalt)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mwh|gwh|nm3|nm³)/i)
    || text.match(/(\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?)\s*(?:mwh)/i);
  if (volMatch) {
    const rawVal = parseFloat(volMatch[1].replace(/,/g, ''));
    if (/gwh/i.test(volMatch[0])) {
      volumeMWh = rawVal * 1000;
    } else {
      volumeMWh = rawVal;
    }
    confidence += 10;
  }

  // 9. Chain of Custody
  let chainOfCustody: ParsedPoSCertificate['chainOfCustody'] = 'MASS_BALANCE';
  if (/book\s*(?:and|&)\s*claim/i.test(text)) {
    chainOfCustody = 'BOOK_AND_CLAIM';
  } else if (/physical\s*segregation|bio-lng|cryogenic/i.test(text)) {
    chainOfCustody = 'SEGREGATION';
  }

  const primaryFeedstockName = substrates.length > 0
    ? substrates.map(s => `${s.percentage}% ${s.name}`).join(' + ')
    : 'Audited Mixed Biomass';

  return {
    isValid: confidence >= 40,
    scheme,
    schemeLabel,
    certificateNumber,
    issuingBody,
    producerName,
    countryCode,
    primaryFeedstockName,
    canonicalFeedstock,
    annexIxClassification,
    substrates,
    carbonIntensityGCo2Mj,
    ghgSavingsPct,
    volumeMWh,
    chainOfCustody,
    auditNotes: notes,
    confidenceScore: Math.min(100, confidence),
  };
}
