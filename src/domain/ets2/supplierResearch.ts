import type { Ets2Company, Ets2Contact, Ets2Evidence } from './companies';

/**
 * ETS2 gas-supplier research, 11 countries (desk research export, 28 Sept 2026), curated.
 *
 * Curation rules applied when transcribing:
 * - Only regulator- or company-stated figures are used as marketSharePct / gasVolumeTWh.
 *   Shares of CUSTOMERS, approximate shares ("just under 26%") and secondary estimates are kept
 *   in shareBasis/notes but not used for exposure.
 * - Where a newer regulator figure was already on file (Spain, CNMC Q1 2026) it is kept, and the
 *   research's Q1 2025 figure is recorded as history.
 * - Links truncated in the export were restored only where the full address was independently
 *   seen (ARERA, CNMC, Bundesnetzagentur); the CRE report link could not be restored and points to
 *   the CRE site with the report reference in the note.
 * - Disclosed portfolio volumes (CRE, EnBW) cover all customer segments and may include EU ETS1
 *   industrial sites, so they overstate ETS2 exposure.
 */

const CHECKED = '2026-09-28';

const ev = (type: Ets2Evidence['type'], url: string, note: string): Ets2Evidence => ({ type, url, note, checkedAt: CHECKED });

const ARERA_PRESS = 'https://www.arera.it/fileadmin/allegati/com_stampa/26/Comunicato_stampa_ARERA__I_numeri_della_Relazione_Annuale_2025.pdf';
const ARERA_SHARES = 'https://www.arera.it/dati-e-statistiche/dettaglio/quote-di-mercato-per-tipologia-di-cliente-gas';
const CNMC_Q1_2026 = 'https://www.cnmc.es/sites/default/files/6807815.pdf';
const CNMC_Q1_2025 = 'https://cnmc.es/sites/default/files/6073123.pdf';
const CNMC_Q4_2024 = 'https://www.cnmc.es/sites/default/files/5904506.pdf';
const CRE = 'https://www.cre.fr/';
const CRE_NOTE = 'CRE report 2025-08 (16 Oct 2025), p. 6 — annual gas consumption of each supplier\'s portfolio, all segments, 31 Dec 2024 (full link truncated in the research export; find the report on cre.fr)';
const BNETZA_2025 = 'https://data.bundesnetzagentur.de/Bundesnetzagentur/SharedDocs/Mediathek/Monitoringberichte/MonitoringberichtEnergie2025.pdf';
export const DEHST_NEHS_COMPLIANCE_LIST = 'https://nehs-register.dehst.de/coreweb/info/reporting/compliance/list.action';
const ACM_TOP3 = 'https://www.acm.nl/nl/publicaties/acm-3-grootste-energieleveranciers-hanteren-geen-onredelijke-tarieven';
const VNR_2025 = 'https://www.vlaamsenutsregulator.be/nieuws-en-persoverzicht/concurrentie-vlaamse-energiemarkt-verbeterde-verder-2025';
const EPA_ETS2 = 'https://www.epa.ie/our-services/licensing/climate-change/eu-emissions-trading-system-/eu-emissions-trading-system-2-ets2/current-ets2-greenhouse-gas-emissions-permits/';
const RISCO_RO = 'https://www.risco.ro/suport/comunicate-risco/furnizori-de-energie-si-gaze-in-2025-engie-electrica-si-e-on-pe-profit-ppc-energie-pe-pierdere-6574';
const ANRE = 'https://anre.ro/despre/rapoarte/';

function supplier(
  c: Pick<Ets2Company, 'id' | 'name' | 'countryIso' | 'confidence' | 'evidence'> &
    Partial<Pick<Ets2Company, 'marketSharePct' | 'shareBasis' | 'gasVolumeTWh' | 'contacts' | 'notes' | 'role' | 'sector'>>
): Ets2Company {
  return {
    role: 'REGULATED_SUPPLIER',
    marketSharePct: null,
    shareBasis: null,
    gasVolumeTWh: null,
    gasVolumeBasis: 'GCV',
    contacts: [],
    notes: null,
    ...c,
  };
}

const contact = (c: Ets2Contact): Ets2Contact => c;

export const ETS2_SUPPLIER_RESEARCH: Ets2Company[] = [
  // ───────────────────────── Italy ─────────────────────────
  supplier({
    id: 'it-edison', name: 'Edison (incl. Edison Energia)', countryIso: 'IT', confidence: 'HIGH',
    marketSharePct: 16.8, shareBasis: 'Italian final-customer gas sales, all customer types, 2025, group (ARERA Relazione Annuale 2025); 15.5% in 2024',
    evidence: [
      ev('REGULATOR_MARKET_REPORT', ARERA_PRESS, 'ARERA: "Il gruppo Edison resta primo, con vendite in crescita del 9,7% e una quota di mercato salita dal 15,5% al 16,8%". Edison also 2nd-largest importer (15.3% of imports, 2025).'),
      ev('REGULATOR_MARKET_REPORT', ARERA_SHARES, 'ARERA top-20 group shares by customer type (domestic, condominiums, other uses by size); Excel attachment has segment shares.'),
    ],
    contacts: [
      contact({ kind: 'B2B_SALES', name: 'Edison Energia – business customer service', phone: '800 14 14 14', sourceUrl: 'https://www.edisonenergia.it/edison/assistenza/contatti' }),
      contact({ kind: 'GENERAL_EMAIL', name: 'Edison Investor Relations', email: 'investor.relations@edison.it', phone: '02 6222 7953', sourceUrl: 'https://www.edison.it/' }),
    ],
    notes: 'Largest Italian gas retailer by volume in 2025. Italian ETS2 regulated entity expected to follow the excise release-for-consumption point (the selling company); transposition not verified.',
  }),
  supplier({
    id: 'it-eni', name: 'Eni / Plenitude', countryIso: 'IT', confidence: 'HIGH',
    marketSharePct: 12.7, shareBasis: 'Italian final-customer gas sales, 2025, Eni group (ARERA); 12.0% in 2024',
    evidence: [ev('REGULATOR_MARKET_REPORT', ARERA_PRESS, 'ARERA: "Il gruppo Eni consolida la seconda posizione ... quota in crescita dal 12% al 12,7%". Eni is the largest importer (28.6%, 2025).')],
    contacts: [contact({ kind: 'PRESS', name: 'Plenitude press office', email: 'ufficio.stampa@eniplenitude.com', sourceUrl: 'https://corporate.eniplenitude.com/it/media/media-hub' })],
    notes: 'Plenitude completed the acquisition of Acea Energia (100%) and Umbria Energy (50%) in April 2026, ~1.2m customers — its 2026 share will be higher than the 2025 figure.',
  }),
  supplier({
    id: 'it-enel', name: 'Enel (Enel Energia)', countryIso: 'IT', confidence: 'HIGH',
    marketSharePct: 9.7, shareBasis: 'Italian final-customer gas sales, 2025, group (ARERA); 11.1% in 2024',
    evidence: [ev('REGULATOR_MARKET_REPORT', ARERA_PRESS, 'ARERA: "Il gruppo Enel rimane terzo ... quota di mercato che scende dall\'11,1% al 9,7%".')],
    notes: 'Top 3 groups held 39.3% of Italian final gas sales in 2025. No company contact verified.',
  }),
  supplier({
    id: 'it-hera', name: 'Hera (Hera Comm)', countryIso: 'IT', confidence: 'MEDIUM',
    shareBasis: 'Hera reports "third place" in Italian gas sales; no ARERA percentage captured',
    evidence: [
      ev('COMPANY_DISCLOSURE', 'https://eng.gruppohera.it/group_eng/who-we-are', 'Hera: "Gas sales, third place, with 12.5 billion cubic metres of gas sold; 1.9 million customers" (year not stated).'),
      ev('COMPANY_DISCLOSURE', 'https://eng.gruppohera.it/group_eng/business-activities/energy/gas', 'Hera gas page: 3.2 million customers, 13.1 bcm sold (includes trading; year not stated).'),
      ev('SECONDARY_SOURCE', 'https://eniplenitude.com/info/fornitori-ultima-istanza', 'Acquirente Unico tender: Hera Comm and A2A Energia are default distribution-service gas suppliers, Oct 2025 – Sep 2027.'),
    ],
    contacts: [
      contact({ kind: 'SWITCHBOARD', name: 'Hera S.p.A.', phone: '+39 051 287111', sourceUrl: 'https://www.gruppohera.it/gruppo/media/ufficio-stampa' }),
      contact({ kind: 'PRESS', name: 'Hera press office', email: 'ufficiostampa@gruppohera.it', phone: '051 287595', sourceUrl: 'https://www.gruppohera.it/gruppo/media/ufficio-stampa' }),
      contact({ kind: 'B2B_SALES', name: 'Hera business contacts', sourceUrl: 'https://www.gruppohera.it/assistenza/business/contatti' }),
    ],
    notes: 'Volumes disclosed only in cubic metres (12.5 vs 13.1 bcm on two pages, different perimeters) — not converted, so no exposure shown.',
  }),
  supplier({
    id: 'it-a2a', name: 'A2A Energia', countryIso: 'IT', confidence: 'LOW',
    shareBasis: 'No gas share captured (A2A is 2nd in Italian electricity retail, 10%, 2025)',
    evidence: [ev('SECONDARY_SOURCE', 'https://eniplenitude.com/info/fornitori-ultima-istanza', 'Named by Acquirente Unico as a default distribution-service gas supplier, Oct 2025 – Sep 2027.')],
    notes: 'Check the ARERA top-20 gas table (Excel) for its share.',
  }),

  // ───────────────────────── Germany ─────────────────────────
  supplier({
    id: 'de-enbw', name: 'EnBW (incl. Yello, Erdgas Südwest, VNG/goldgas, SWD)', countryIso: 'DE', confidence: 'MEDIUM',
    gasVolumeTWh: 108.4,
    shareBasis: 'Company share not disclosed; BNetzA publishes only the top-4 combined (~23% of standard-load-profile and 31% of interval-metered gas sales, 2024)',
    evidence: [
      ev('COMPANY_DISCLOSURE', 'https://www.enbw.com/media/bericht/bericht-2025/downloads/zusammengefasster-lagebericht-des-enbw-konzerns-und-der-enbw-ag.pdf', 'EnBW Integrated Annual Report 2025, p. 28: gas sales 2025 "108.400 GWh Gas (B2C / B2B)". Group-wide, may include non-German sales; GCV/NCV not stated.'),
      ev('NATIONAL_ETS_REGISTER', DEHST_NEHS_COMPLIANCE_LIST, 'DEHSt nEHS register public compliance list of BEHG responsible parties (1,966 entries, CSV/XLSX export); EnBW\'s entity row not yet checked.'),
      ev('REGULATOR_MARKET_REPORT', BNETZA_2025, 'BNetzA/BKartA Monitoring Report 2025, pp. 36–37: 319 TWh sold to standard-load-profile and 420 TWh to interval-metered customers in 2024.'),
    ],
    notes: 'Germany already prices carbon under BEHG; most BEHG responsible parties move into EU ETS2 from 2028 emissions. Disclosed volume is all segments and may include ETS1 sites and non-German sales.',
  }),
  supplier({
    id: 'de-eon', name: 'E.ON (E.ON Energie Deutschland)', countryIso: 'DE', confidence: 'LOW',
    shareBasis: 'Not disclosed at company level for gas',
    evidence: [
      ev('COMPANY_DISCLOSURE', 'https://www.lobbyregister.bundestag.de/media/ac/a1/gesamt-DE_final.pdf', 'E.ON Integrated Annual Report 2025 (DE) has customer-group sales tables; German gas volume not yet extracted.'),
      ev('NATIONAL_ETS_REGISTER', DEHST_NEHS_COMPLIANCE_LIST, 'DEHSt nEHS compliance list; entity row not yet checked.'),
    ],
    notes: 'Extract the German gas volume from the annual report sales table before outreach.',
  }),
  supplier({
    id: 'de-ewe', name: 'EWE', countryIso: 'DE', confidence: 'LOW',
    shareBasis: 'Not disclosed at company level for gas',
    evidence: [
      ev('COMPANY_DISCLOSURE', 'https://www.lobbyregister.bundestag.de/media/15/34/Finanzbericht-2025.pdf', 'EWE Finanzbericht 2025: Markt segment revenue €4,628.9m; no gas volume in the pages reviewed.'),
      ev('NATIONAL_ETS_REGISTER', DEHST_NEHS_COMPLIANCE_LIST, 'DEHSt nEHS compliance list; entity row not yet checked.'),
    ],
    notes: 'Large north-German gas retailer.',
  }),

  // ───────────────────────── Netherlands ─────────────────────────
  ...([
    ['nl-vattenfall', 'Vattenfall (Netherlands)', '~28%'],
    ['nl-essent', 'Essent (E.ON Nederland)', '~22%'],
    ['nl-eneco', 'Eneco', '~17%'],
  ] as const).map(([id, name, approx]) =>
    supplier({
      id, name, countryIso: 'NL', confidence: 'MEDIUM',
      shareBasis: `ACM names Eneco, Essent and Vattenfall as the 3 largest energy suppliers (together over half of Dutch households). A comparison site citing ACM Energiemonitor 2025 gives ${approx} of the consumer market — approximate, not gas-specific, not used.`,
      evidence: [
        ev('REGULATOR_MARKET_REPORT', ACM_TOP3, 'ACM identifies Eneco, Essent and Vattenfall as the 3 largest energy suppliers.'),
        ev('SECONDARY_SOURCE', 'https://www.energie-actie.com/alle-energieleveranciers/', `Comparison site citing ACM Energiemonitor 2025: ${approx} of the consumer market (approximate).`),
      ],
    })
  ),

  // ───────────────────────── France (CRE, all-segment portfolio volumes, 31 Dec 2024) ─────────────────────────
  supplier({
    id: 'fr-engie', name: 'ENGIE (France)', countryIso: 'FR', confidence: 'HIGH', gasVolumeTWh: 120.0,
    shareBasis: 'Portfolio gas consumption, all segments, 31 Dec 2024 (CRE); % not given',
    evidence: [ev('REGULATOR_MARKET_REPORT', CRE, `${CRE_NOTE}: ENGIE 120.0 TWh; 5,356,000 residential and 237,000 non-residential sites.`)],
    contacts: [
      contact({ kind: 'B2B_SALES', name: 'ENGIE Entreprises & Collectivités', role: 'Companies, industry, condominium managers', phone: '09 69 36 59 51', sourceUrl: 'https://entreprises-collectivites.engie.fr/nous-contacter/' }),
      contact({ kind: 'B2B_SALES', name: 'ENGIE Entreprises & Collectivités', role: 'Public bodies and local authorities', phone: '09 69 36 09 21', sourceUrl: 'https://entreprises-collectivites.engie.fr/nous-contacter/' }),
      contact({ kind: 'PRESS', name: 'ENGIE Group press', email: 'engiepress@engie.com', phone: '+33 (0)1 44 22 24 35', sourceUrl: 'https://www.engie.com/en/journalists-area' }),
    ],
    notes: 'France\'s historic gas supplier. Volume includes all segments, possibly ETS1 industrial sites.',
  }),
  ...([
    ['fr-edf', 'EDF', 67.4, 'EDF 67.4 TWh; 2,581,000 residential and 136,000 non-residential sites.', 'HIGH', null],
    ['fr-totalenergies', 'TotalEnergies (France)', 39.4, 'TotalEnergies 39.4 TWh; 1,316,000 residential and 78,000 non-residential sites.', 'HIGH', null],
    ['fr-gaz-de-bordeaux', 'Gaz de Bordeaux', 17.6, 'Gaz de Bordeaux 17.6 TWh; 227,000 residential and 63,000 non-residential sites.', 'HIGH', 'Historic local supplier in its service area.'],
    ['fr-equinor', 'Equinor (France gas supply)', 11.1, 'Equinor 11.1 TWh.', 'MEDIUM', 'Largely industrial/B2B; part may be ETS1 sites outside ETS2.'],
    ['fr-endesa', 'Endesa (France gas supply)', 10.2, 'Endesa 10.2 TWh.', 'MEDIUM', 'B2B-focused.'],
    ['fr-alpiq', 'Alpiq (France gas supply)', 8.8, 'Alpiq 8.8 TWh (read from chart labels).', 'MEDIUM', null],
    ['fr-gaz-europeen', 'Gaz Européen', 5.8, 'Gaz Européen 5.8 TWh (read from chart labels).', 'MEDIUM', 'Focus on condominiums and tertiary heating — core ETS2 buildings exposure.'],
  ] as const).map(([id, name, twh, note, confidence, notes]) =>
    supplier({
      id, name, countryIso: 'FR', confidence, gasVolumeTWh: twh,
      shareBasis: 'Portfolio gas consumption, all segments, 31 Dec 2024 (CRE)',
      evidence: [ev('REGULATOR_MARKET_REPORT', CRE, `${CRE_NOTE}: ${note}`)],
      notes,
    })
  ),
  supplier({
    id: 'fr-plenitude', name: 'Plenitude (France)', countryIso: 'FR', confidence: 'HIGH', gasVolumeTWh: 24.2,
    shareBasis: 'Portfolio gas consumption, all segments, 31 Dec 2024 (CRE)',
    evidence: [ev('REGULATOR_MARKET_REPORT', CRE, `${CRE_NOTE}: Plenitude 24.2 TWh; 460,000 residential and 24,000 non-residential sites.`)],
    contacts: [contact({ kind: 'PRESS', name: 'Plenitude group press office', email: 'ufficio.stampa@eniplenitude.com', sourceUrl: 'https://corporate.eniplenitude.com/it/media/media-hub' })],
  }),
  supplier({
    id: 'fr-tereos', name: 'Tereos France', countryIso: 'FR', role: 'EXPOSED_END_USER', sector: 'Sugar & starch', confidence: 'LOW', gasVolumeTWh: 5.0,
    shareBasis: 'Appears in the CRE top-10 supplier volume chart, 31 Dec 2024',
    evidence: [ev('REGULATOR_MARKET_REPORT', CRE, `${CRE_NOTE}: Tereos France 5.0 TWh (listed as a supplier; likely self-supply to its own sites).`)],
    notes: 'Sugar sites may already be in EU ETS1; ETS2 exposure only for sites outside ETS1 — check the Union Registry.',
  }),

  // ───────────────────────── Belgium ─────────────────────────
  supplier({
    id: 'be-engie', name: 'ENGIE Electrabel (Belgium)', countryIso: 'BE', confidence: 'HIGH',
    shareBasis: 'Top 3 (ENGIE Electrabel, Luminus, Eneco Belgium) hold 75.3% of gas customers and 71.9% of gas volume in Flanders, 2025; >88% of volume in Brussels, 78% in Wallonia; individual shares not published',
    evidence: [
      ev('REGULATOR_MARKET_REPORT', VNR_2025, 'Vlaamse Nutsregulator, 7 Jul 2026: top-3 gas share 75.3% of customers, 71.9% of volume (Flanders 2025).'),
      ev('REGULATOR_MARKET_REPORT', 'https://www.creg.be/nl/consumenten/energiemarkt/energieleveranciers', 'CREG quarterly supplier market-share charts per region.'),
    ],
    contacts: [contact({ kind: 'PRESS', name: 'ENGIE Belgium press', role: 'Urgent press, outside office hours', phone: '+32 (0)2 883 02 44', sourceUrl: 'https://corporate.engie.be/en/press/' })],
    notes: 'Market leader in all three regions.',
  }),
  supplier({
    id: 'be-luminus', name: 'Luminus', countryIso: 'BE', confidence: 'HIGH',
    shareBasis: 'Part of the Flanders top 3 (75.3% of gas customers / 71.9% of volume, 2025)',
    evidence: [ev('REGULATOR_MARKET_REPORT', VNR_2025, 'Vlaamse Nutsregulator names Luminus among the 3 largest suppliers in Flanders, 2025.')],
    contacts: [
      contact({ kind: 'PRESS', name: 'Luminus media relations', email: 'communication@luminus.be', phone: '+32 2 229 19 50', sourceUrl: 'https://press.luminus.be/en' }),
      contact({ kind: 'B2B_SALES', name: 'Luminus Pro', role: 'Business contact form', sourceUrl: 'https://www.luminus.be/fr/pro/contact/' }),
    ],
    notes: 'No. 2 in Flanders and Wallonia (secondary sources).',
  }),
  supplier({
    id: 'be-eneco', name: 'Eneco Belgium', countryIso: 'BE', confidence: 'HIGH',
    shareBasis: 'Part of the Flanders top 3 (2025)',
    evidence: [ev('REGULATOR_MARKET_REPORT', VNR_2025, 'Vlaamse Nutsregulator names Eneco Belgium among the 3 largest suppliers in Flanders, 2025.')],
  }),
  supplier({
    id: 'be-totalenergies', name: 'TotalEnergies Power & Gas Belgium', countryIso: 'BE', confidence: 'LOW',
    shareBasis: 'Reported 3rd supplier in Wallonia and Brussels (secondary, citing CREG study F3188)',
    evidence: [ev('SECONDARY_SOURCE', 'https://callmepower.be/nl/energie/leveranciers', 'Comparison site citing CREG study (F)3188: third place in Wallonia and Brussels.')],
  }),

  // ───────────────────────── Spain (CNMC) ─────────────────────────
  ...([
    ['es-naturgy', 'Naturgy', 29.4, 'Q1 2025: 30.7%; Q4 2024: 25.6%', [contact({ kind: 'B2B_SALES', name: 'Naturgy Grandes Clientes', role: 'Large customers line (24h)', phone: '900 100 264', sourceUrl: 'https://www.naturgy.es/grandes_clientes/ayuda/contacto' }), contact({ kind: 'PRESS', name: 'Naturgy press room', email: 'prensa@naturgy.com', sourceUrl: 'https://www.naturgy.com/en/press-room-naturgy/' })], 'Quarterly shares are seasonal (Q1 includes winter heating).'],
    ['es-repsol', 'Repsol', 11.3, 'Q1 2025: 8.8%; Q4 2024: 11.0%', [], null],
    ['es-endesa', 'Endesa (Endesa Energía)', 10.6, 'Q1 2025: 13.8% of sales, 15.4% of customers', [], null],
    ['es-iberdrola', 'Iberdrola (Iberdrola Clientes)', 8.5, 'Q1 2025: 7.3% of sales, 21.0% of customers', [], 'High customer share vs low volume share = residential-heavy (core ETS2 buildings segment).'],
    ['es-moeve', 'Moeve (formerly Cepsa)', 5.2, 'Q1 2025: 5.2%', [], 'Industrial-heavy portfolio; part may be ETS1.'],
  ] as const).map(([id, name, share, history, contacts, notes]) =>
    supplier({
      id, name, countryIso: 'ES', confidence: 'HIGH', marketSharePct: share,
      shareBasis: `Spanish retail gas sales volume, Q1 2026, group (CNMC). Earlier: ${history}`,
      evidence: [
        ev('REGULATOR_MARKET_REPORT', CNMC_Q1_2026, `CNMC quarterly retail supervision bulletin (7 Sep 2026): ${name.split(' ')[0]} ${share}% of Q1 2026 sales.`),
        ev('REGULATOR_MARKET_REPORT', CNMC_Q1_2025, `CNMC bulletin (17 Jul 2025): ${history}.`),
      ],
      contacts: [...contacts],
      notes,
    })
  ),
  supplier({
    id: 'es-totalenergies', name: 'TotalEnergies Electricidad y Gas España', countryIso: 'ES', confidence: 'HIGH',
    shareBasis: '11.4% of Spanish gas CUSTOMERS (not volume), Q1 2025 (CNMC) — not used for exposure',
    evidence: [ev('REGULATOR_MARKET_REPORT', CNMC_Q1_2025, 'CNMC Q1 2025: TotalEnergies 11.4% of gas customers.')],
  }),
  supplier({
    id: 'es-axpo', name: 'Axpo Iberia', countryIso: 'ES', confidence: 'MEDIUM', marketSharePct: 5.0,
    shareBasis: 'Spanish retail gas sales volume, Q4 2024 (CNMC)',
    evidence: [ev('REGULATOR_MARKET_REPORT', CNMC_Q4_2024, 'CNMC Q4 2024: Axpo 5.0% of sales.')],
    notes: 'B2B/industrial focus; part may be ETS1.',
  }),

  // ───────────────────────── Poland ─────────────────────────
  supplier({
    id: 'pl-orlen', name: 'PGNiG Obrót Detaliczny (ORLEN group)', countryIso: 'PL', confidence: 'MEDIUM',
    marketSharePct: 97, shareBasis: 'Gas sales to households, 2024 (OIES) — households only',
    evidence: [
      ev('SECONDARY_SOURCE', 'https://www.oxfordenergy.org/wpcms/wp-content/uploads/2025/10/Insight-172-State-Control-and-Market-Expansion-Can-Polands-Gas-Market-Develop-Without-Liberalisation.pdf', 'OIES Insight 172: Orlen nearly 97% of household gas sales in 2024; 85% of sales to distribution-connected final customers.'),
      ev('REGULATOR_MARKET_REPORT', 'https://www.ure.gov.pl/pl/urzad/informacje-ogolne/aktualnosci/13369,Prezes-URE-publikuje-Raport-rynkowy-paliwa-gazowe-za-rok-2025.html', 'URE gas market report 2025: tariff sales 97.42% of metering points; 271.2 TWh through the transmission system.'),
    ],
    notes: 'Poland pushed politically for an ETS2 delay — check the final Polish transposition.',
  }),

  // ───────────────────────── Hungary (already on file) ─────────────────────────
  supplier({
    id: 'hu-mvm-next', name: 'MVM Next', countryIso: 'HU', confidence: 'MEDIUM',
    evidence: [ev('SECONDARY_SOURCE', 'https://ceenergynews.com/electricity/mvm-becomes-the-only-universal-provider-for-hungarys-gas-and-electricity-market/', 'MVM became the only universal-service provider for households in Hungary\'s gas and electricity market.')],
    notes: 'Sole household universal-service supplier; share not stated as a single figure.',
  }),

  // ───────────────────────── Romania ─────────────────────────
  supplier({
    id: 'ro-engie', name: 'ENGIE Romania', countryIso: 'RO', confidence: 'LOW',
    shareBasis: 'No ANRE share captured; largest energy & gas supplier by revenue (RON 9.5bn, 2025)',
    evidence: [
      ev('SECONDARY_SOURCE', RISCO_RO, 'RisCo: ENGIE Romania 2025 turnover RON 9.5bn, net profit RON 819m; market leader among energy/gas suppliers.'),
      ev('REGULATOR_MARKET_REPORT', ANRE, 'ANRE monthly gas market monitoring reports (supplier shares) — share not yet extracted.'),
    ],
  }),
  supplier({
    id: 'ro-eon', name: 'E.ON Energie România', countryIso: 'RO', confidence: 'LOW',
    shareBasis: 'No ANRE share captured',
    evidence: [
      ev('SECONDARY_SOURCE', RISCO_RO, 'RisCo: E.ON Energie România 2025 turnover RON 8.8bn, net profit RON 286m.'),
      ev('REGULATOR_MARKET_REPORT', ANRE, 'ANRE gas market monitoring reports — share not yet extracted.'),
    ],
  }),

  // ───────────────────────── Czechia ─────────────────────────
  supplier({
    id: 'cz-innogy', name: 'innogy Energie (E.ON group)', countryIso: 'CZ', confidence: 'MEDIUM',
    shareBasis: 'Largest Czech gas supplier; OTE 2025 share fell from 29.5% to "just under 26%" — exact figure not published, not used',
    evidence: [
      ev('SECONDARY_SOURCE', 'https://ekonomickydenik.cz/na-energetickem-trhu-ztraci-cez-a-innogy/', 'Ekonomický deník citing OTE 2025: share fell "z 29,5 procenta na necelých 26 procent".'),
      ev('SECONDARY_SOURCE', 'https://www.tzb-info.cz/ceny-paliv-a-energii/29707-nejvic-novych-odberatelu-loni-ziskala-v-elektrine-ep-energy-trading-a-s-v-plynu-cez-prodej-a-s', 'Citing OTE: innogy 1,051,168 gas supply points at 12/2025.'),
    ],
    contacts: [
      contact({ kind: 'PRESS', name: 'innogy press', email: 'press@innogy.cz', sourceUrl: 'https://www.innogy.cz/o-innogy/press-centrum/kontakty-pro-media/' }),
      contact({ kind: 'SWITCHBOARD', name: 'innogy customer line', phone: '800 11 33 55', sourceUrl: 'https://www.innogy.cz/kontakty/' }),
    ],
  }),
  supplier({
    id: 'cz-cez-prodej', name: 'ČEZ Prodej', countryIso: 'CZ', confidence: 'MEDIUM',
    shareBasis: '2nd-largest Czech gas supplier (~15% in 2023, approximate; +1 pp in 2025) — not used',
    evidence: [ev('SECONDARY_SOURCE', 'https://www.tzb-info.cz/ceny-paliv-a-energii/29707-nejvic-novych-odberatelu-loni-ziskala-v-elektrine-ep-energy-trading-a-s-v-plynu-cez-prodej-a-s', 'Citing OTE: ČEZ Prodej +1 pp share Dec 2024–Dec 2025; 600,476 gas supply points at 12/2025.')],
  }),
  supplier({
    id: 'cz-prazska-plynarenska', name: 'Pražská plynárenská', countryIso: 'CZ', confidence: 'MEDIUM', marketSharePct: 13.5,
    shareBasis: 'Czech gas supply to end customers, 2025 (OTE statistics, reported by Ekonomický deník)',
    evidence: [ev('SECONDARY_SOURCE', 'https://ekonomickydenik.cz/prazska-plynarenska-vydelala-1-4-miliardy/', '"Podle statistiky operátora trhu OTE byla loni Pražská plynárenská třetím největším dodavatelem plynu ... s podílem 13,5 procenta."')],
    contacts: [
      contact({ kind: 'PERSON', name: 'Miroslav Vránek', role: 'Spokesperson, Pražská plynárenská group', email: 'miroslav.vranek@ppas.cz', phone: '221 092 433', sourceUrl: 'https://ppsd.cz/o-nas/pro-media' }),
      contact({ kind: 'GENERAL_EMAIL', name: 'Pražská plynárenská contacts', sourceUrl: 'https://www.ppas.cz/kontakty' }),
    ],
  }),
  supplier({
    id: 'cz-eon', name: 'E.ON Energie (Czechia)', countryIso: 'CZ', confidence: 'LOW',
    shareBasis: 'No % captured; 352,000 gas supply points at end-2025',
    evidence: [ev('SECONDARY_SOURCE', 'https://ekonomickydenik.cz/prazska-plynarenska-vydelala-1-4-miliardy/', 'E.ON Energie supplied gas to 352 thousand supply points at end-2025.')],
  }),

  // ───────────────────────── Austria ─────────────────────────
  supplier({
    id: 'at-energieallianz', name: 'EnergieAllianz Austria (Wien Energie, EVN, Energie Burgenland)', countryIso: 'AT', confidence: 'LOW', gasVolumeTWh: 8.7,
    shareBasis: 'No E-Control share captured',
    evidence: [
      ev('SECONDARY_SOURCE', 'https://www.cbinsights.com/company/energieallianz-austria/alternatives-competitors', 'Reproduced company text: FY 2024/25 supplied 8.7 TWh natural gas and >18.6 TWh electricity, ~2.7m installations.'),
      ev('REGULATOR_MARKET_REPORT', 'https://www.e-control.at/', 'E-Control/BWB taskforce interim report (2022 data): regional incumbents dominate their network areas.'),
    ],
    notes: 'Austria has its own national ETS (NEHS). Verify the volume against the EAA/EVN annual report.',
  }),

  // ───────────────────────── Ireland (EPA ETS2 permit register) ─────────────────────────
  supplier({
    id: 'ie-bord-gais', name: 'Bord Gáis Energy (Centrica)', countryIso: 'IE', confidence: 'HIGH',
    evidence: [ev('PERMIT_REGISTER', EPA_ETS2, 'EPA ETS2 GHG permit IE-GHG-ETS2019-01 (list updated 12 Aug 2026).')],
    contacts: [
      contact({ kind: 'PRESS', name: 'Bord Gáis Energy press office', email: 'pressoffice@bordgais.ie', sourceUrl: 'https://www.bordgaisenergy.ie/media-centre/press-office' }),
      contact({ kind: 'B2B_SALES', name: 'Bord Gáis Energy Business', phone: '01 611 01 33', sourceUrl: 'https://www.bordgaisenergy.ie/company/have-a-question' }),
    ],
    notes: 'Over 514,000 homes and businesses across Ireland (customer count, not a gas share).',
  }),
  supplier({
    id: 'ie-flogas', name: 'Flogas Natural Gas (DCC)', countryIso: 'IE', confidence: 'HIGH',
    evidence: [ev('PERMIT_REGISTER', EPA_ETS2, 'EPA ETS2 permit IE-GHG-ETS2013-01; sister entities Flogas Enterprise Solutions (IE-GHG-ETS2014-01) and Flogas Ireland (IE-GHG-ETS2026-01) also permitted.')],
    contacts: [
      contact({ kind: 'B2B_SALES', name: 'Flogas business customer support', email: 'customersupport@flogas.ie', phone: '041 214 9500', sourceUrl: 'https://www.flogas.ie/business/customer-support/' }),
      contact({ kind: 'B2B_SALES', name: 'Flogas Enterprise', role: 'Large B2B energy', email: 'enterprise@flogas.ie', phone: '+353 1 884 9400', sourceUrl: 'https://flogasenterprise.ie/contact/' }),
    ],
  }),
  supplier({
    id: 'ie-sse-airtricity', name: 'SSE Airtricity', countryIso: 'IE', confidence: 'HIGH',
    evidence: [ev('PERMIT_REGISTER', EPA_ETS2, 'EPA ETS2 permit IE-GHG-ETS2017-01.')],
    contacts: [
      contact({ kind: 'PRESS', name: 'SSE media (Ireland)', email: 'media.ireland@sse.com', sourceUrl: 'https://www.sse.com/news-and-views/media-contacts/' }),
      contact({ kind: 'B2B_SALES', name: 'SSE Airtricity Business', sourceUrl: 'https://www.sseairtricity.com/ie/business/contact-us' }),
    ],
  }),
  supplier({
    id: 'ie-energia', name: 'Energia Customer Solutions', countryIso: 'IE', confidence: 'HIGH',
    evidence: [ev('PERMIT_REGISTER', EPA_ETS2, 'EPA ETS2 permit IE-GHG-ETS2012-01.')],
  }),
  supplier({
    id: 'ie-esb', name: 'Electric Ireland (ESB Independent Energy) / ESB', countryIso: 'IE', confidence: 'HIGH',
    evidence: [ev('PERMIT_REGISTER', EPA_ETS2, 'EPA ETS2 permits IE-GHG-ETS2023-01 (ESB Independent Energy) and IE-GHG-ETS2022-01 (Electricity Supply Board).')],
  }),
  supplier({
    id: 'ie-axpo', name: 'Axpo UK (Ireland gas supply)', countryIso: 'IE', confidence: 'HIGH',
    evidence: [ev('PERMIT_REGISTER', EPA_ETS2, 'EPA ETS2 permit IE-GHG-ETS2018-01.')],
    notes: 'Industrial and commercial gas supplier.',
  }),
  supplier({
    id: 'ie-yuno', name: 'Yuno', countryIso: 'IE', confidence: 'MEDIUM',
    evidence: [ev('PERMIT_REGISTER', EPA_ETS2, 'EPA ETS2 permit IE-GHG-ETS2004-01 (fuel type not stated).')],
    notes: 'Many other EPA permit holders are oil or solid-fuel suppliers, not gas.',
  }),
];
