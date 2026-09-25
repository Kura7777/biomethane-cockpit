import { OfficialRegisterLookup } from './types';

/**
 * Institutional Directory of European Statutory Biomethane & Commercial Registrars.
 *
 * Ground truth principle:
 * Commercial contacts in plant lists are indicative and unverified. Traders MUST verify
 * the legal entity, plant operating qualification, and authorized signatories via the
 * statutory national register before issuing offers or cold outreach.
 */

export const OFFICIAL_NATIONAL_REGISTERS: Record<string, Omit<OfficialRegisterLookup, 'searchUrl'>> = {
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    registerName: 'Marktstammdatenregister (MaStR)',
    authority: 'Bundesnetzagentur (BNetzA)',
    url: 'https://www.marktstammdatenregister.de/MaStR/Einheit/Einheiten/ErweiterteSuche',
    instructions: 'Official statutory register of all gas and biomethane production units in Germany. Search by plant name, operator, or location to retrieve the audited MaStR unit ID (SEE/EEG) and operating company.',
    mandatoryForOrigination: true,
  },
  DK: {
    countryCode: 'DK',
    countryName: 'Denmark',
    registerName: 'CVR — Central Business Register',
    authority: 'Danish Business Authority (Erhvervsstyrelsen)',
    url: 'https://datacvr.virk.dk/',
    instructions: 'Search CVR for the operating company to confirm its CVR number, current name, address and signatories. Energinet issues biomethane certificates; Evida (the DSO) holds grid connections but does not publish plant injection data.',
    mandatoryForOrigination: true,
  },
  AT: {
    countryCode: 'AT',
    countryName: 'Austria',
    registerName: 'AGCS Biomethan Register Austria',
    authority: 'AGCS Gas Clearing and Settlement AG',
    url: 'https://www.agcs.at/biomethan-register-austria',
    instructions: 'Statutory Austrian biomethane registry and national clearing database. Audits grid injection certificates, production facilities, and ERGaR cross-border export qualifications.',
    mandatoryForOrigination: true,
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    registerName: 'Annuaire des Entreprises & Infogreffe / ODRE',
    authority: 'Direction Interministérielle du Numérique (DINUM) / ODRE',
    url: 'https://annuaire-entreprises.data.gouv.fr/',
    instructions: 'French official company directory & ODRE registry. Enter SIREN / SIRET number or facility name to verify registered legal entity, active legal status, and authorized corporate officers.',
    mandatoryForOrigination: true,
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    registerName: 'Companies House & GGCS (Green Gas Certification Scheme)',
    authority: 'UK Companies House / Renewable Energy Assurance Ltd',
    url: 'https://find-and-update.company-information.service.gov.uk/',
    instructions: 'UK statutory registrar of companies & GGCS. Verify active corporate status, registered directors, PSC register, and RGGO injection account credentials.',
    mandatoryForOrigination: true,
  },
  UK: {
    countryCode: 'UK',
    countryName: 'United Kingdom',
    registerName: 'Companies House & GGCS (Green Gas Certification Scheme)',
    authority: 'UK Companies House / Renewable Energy Assurance Ltd',
    url: 'https://find-and-update.company-information.service.gov.uk/',
    instructions: 'UK statutory registrar of companies & GGCS. Verify active corporate status, registered directors, PSC register, and RGGO injection account credentials.',
    mandatoryForOrigination: true,
  },
  NL: {
    countryCode: 'NL',
    countryName: 'Netherlands',
    registerName: 'VertiCer & KVK Handelsregister',
    authority: 'VertiCer B.V. / Kamer van Koophandel (KVK)',
    url: 'https://www.verticer.eu/',
    instructions: 'Dutch statutory Guarantee of Origin registry (VertiCer) and Chamber of Commerce (KVK). Verify VertiCer production account and KVK legal registration.',
    mandatoryForOrigination: true,
  },
  IT: {
    countryCode: 'IT',
    countryName: 'Italy',
    registerName: 'GSE Registro Biometano & Registro Imprese',
    authority: 'Gestore dei Servizi Energetici (GSE) / Unioncamere',
    url: 'https://www.gse.it/servizi-per-te/biometano',
    instructions: 'Italian statutory GSE registry for biomethane qualification and CIC compliance. Cross-check operating entity in Registro Imprese for valid REA number and legal representatives.',
    mandatoryForOrigination: true,
  },
  ES: {
    countryCode: 'ES',
    countryName: 'Spain',
    registerName: 'Enagás GTS & Sistema de Garantías de Origen',
    authority: 'Enagás GTS / Ministerio para la Transición Ecológica',
    url: 'https://www.gts.enagas.es/',
    instructions: 'Spanish gas technical system operator (GTS) registry and statutory Guarantees of Origin system. Search injection facility code and accredited producer account.',
    mandatoryForOrigination: true,
  },
  SE: {
    countryCode: 'SE',
    countryName: 'Sweden',
    registerName: 'Bolagsverket — Companies Registration Office',
    authority: 'Bolagsverket',
    url: 'https://www.bolagsverket.se/',
    instructions: 'Verify the operating company and its organisationsnummer in Bolagsverket. Energigas Sverige is the industry association (not a register) and can point to operators.',
    mandatoryForOrigination: false,
  },
  BE: {
    countryCode: 'BE',
    countryName: 'Belgium',
    registerName: 'BCE (Banque-Carrefour des Entreprises) & Gas.be',
    authority: 'SPF Economie / Gas.be',
    url: 'https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html',
    instructions: 'Belgian statutory enterprise register (BCE/KBO) and Gas.be biomethane injection register. Verify enterprise number and regional injection license.',
    mandatoryForOrigination: false,
  },
  CH: {
    countryCode: 'CH',
    countryName: 'Switzerland',
    registerName: 'Zefix — Central Business Name Index',
    authority: 'Federal Office of Justice / cantonal commercial registers',
    url: 'https://www.zefix.ch/',
    instructions: 'Verify the operating company (UID CHE-…) in Zefix. Biogas injection certificates are handled by the Swiss gas industry (VSG) register, not Pronovo (electricity).',
    mandatoryForOrigination: false,
  },
};

export const DEFAULT_EUROPEAN_REGISTER: Omit<OfficialRegisterLookup, 'searchUrl'> = {
  countryCode: 'EU',
  countryName: 'European Union',
  registerName: 'ERGaR & European Biogas Association (EBA)',
  authority: 'European Renewable Gas Registry (ERGaR) / EBA',
  url: 'https://www.ergar.org/',
  instructions: 'Pan-European biomethane certificate tracking and registry hub. Check with the relevant national registry or competent issuing body for audited ownership.',
  mandatoryForOrigination: false,
};

export function buildOfficialRegisterSearchUrl(countryCode: string, query?: string): string | undefined {
  if (!query || !query.trim()) return undefined;
  const q = encodeURIComponent(query.trim());
  const code = (countryCode || '').toUpperCase();

  switch (code) {
    case 'FR':
      return `https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${q}`;
    case 'GB':
    case 'UK':
      return `https://find-and-update.company-information.service.gov.uk/search?q=${q}`;
    case 'NL':
      return `https://www.kvk.nl/zoeken/?source=all&q=${q}`;
    case 'IT':
      return `https://www.registroimprese.it/ricerca-libera-e-acquisto?query=${q}`;
    case 'DE':
      // MaStR doesn't support direct query param without session state, so provide direct search page
      return `https://www.marktstammdatenregister.de/MaStR/Einheit/Einheiten/ErweiterteSuche`;
    default:
      return undefined;
  }
}

export function getOfficialRegisterForCountry(countryCode: string, query?: string): OfficialRegisterLookup {
  const code = (countryCode || '').toUpperCase();
  const base = OFFICIAL_NATIONAL_REGISTERS[code] ?? {
    ...DEFAULT_EUROPEAN_REGISTER,
    countryCode: code,
  };

  const searchUrl = buildOfficialRegisterSearchUrl(code, query) || base.url;

  return {
    ...base,
    searchUrl,
  };
}
