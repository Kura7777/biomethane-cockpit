export type ProvenanceTier = 
  | 'STATUTORY_DIRECTIVE'
  | 'TSO_OFFICIAL_DATA'
  | 'INDUSTRY_BODY_CENSUS'
  | 'BROKER_REPORTED_QUOTE'
  | 'BUYER_SPECIFIED_RFQ'
  | 'MODELLED_ENGINEERING';

export type DataSourceCategory = 
  | 'PLANTS_INFRASTRUCTURE'
  | 'FEEDSTOCKS_CARBON_INTENSITY'
  | 'MARKET_PRICING_BENCHMARKS'
  | 'LOGISTICS_INTERCONNECTORS'
  | 'REGISTRIES_MASS_BALANCE';

export interface DataSourceRecord {
  id: string;
  name: string;
  category: DataSourceCategory;
  categoryLabel: string;
  authority: string;
  authorityType: 'EU_INSTITUTION' | 'NATIONAL_REGULATOR' | 'TSO_DSO' | 'INDUSTRY_ASSOCIATION' | 'PRICE_REPORTING_AGENCY' | 'BROKER_DESK';
  sourceDocumentOrUrl: string;
  legalBasis?: string;
  updateFrequency: 'REAL_TIME_API' | 'DAILY' | 'MONTHLY' | 'ANNUAL' | 'STATUTORY_FIXED';
  coverageCount: string;
  provenanceTier: ProvenanceTier;
  description: string;
  fieldsProvided: string[];
  fieldsUnverified?: string[];
  docUrl?: string | null;
}

export const DATA_SOURCES_DIRECTORY: DataSourceRecord[] = [
  // --------------------------------------------------------------------------
  // 1. PLANTS & INFRASTRUCTURE
  // --------------------------------------------------------------------------
  {
    id: 'gie_eba_biomethane_map',
    name: 'GIE / EBA European Biomethane Map 2026',
    category: 'PLANTS_INFRASTRUCTURE',
    categoryLabel: 'Plants & Assets',
    authority: 'Gas Infrastructure Europe (GIE) & European Biogas Association (EBA)',
    authorityType: 'INDUSTRY_ASSOCIATION',
    sourceDocumentOrUrl: 'GIE_EBA_BIO_2026_A0_FULL_115.pdf & European Biomethane Map Registry',
    legalBasis: 'European Biomethane Industrial Partnership (BIP) / RePowerEU',
    updateFrequency: 'ANNUAL',
    coverageCount: '1,975+ Facilities (28 Countries)',
    provenanceTier: 'INDUSTRY_BODY_CENSUS',
    description: 'The definitive European cartographic and registry census of all operating and injecting biomethane production facilities across 28 European jurisdictions.',
    fieldsProvided: [
      'Facility Name',
      'Country Code (ISO 3166-1 alpha-2)',
      'Operational Status (Active / Injecting)',
      'National Grid Connection Zone',
      'Unique Indexing ID (FR-1..829, DE-1..285, GB-1..108, DK-1..60, etc.)'
    ],
    fieldsUnverified: [
      'Unmetered nameplate hourly capacity (Nm³/h) for facilities where national TSO does not publish individual meter declarations',
      'Exact real-time feedstock substrate mix (derived from Consignment PoS and Buyer RFQ specifications)'
    ],
    docUrl: 'https://www.europeanbiogas.eu/biomethane-map/'
  },
  {
    id: 'odre_france_biomethane',
    name: 'ODRE French Biomethane Injection Registry',
    category: 'PLANTS_INFRASTRUCTURE',
    categoryLabel: 'Plants & Assets',
    authority: 'GRTgaz, Teréga, Enedis, and GRDF (Open Data Réseaux Énergies)',
    authorityType: 'TSO_DSO',
    sourceDocumentOrUrl: 'ODRE Registre des installations de production de biométhane',
    legalBasis: 'Code de l\'énergie, Art. L.446-24',
    updateFrequency: 'MONTHLY',
    coverageCount: '829 Active Facilities in France',
    provenanceTier: 'TSO_OFFICIAL_DATA',
    description: 'Statutory French grid injection register detailing commissioned anaerobic digestion facilities, injection capacities, network operators, and input categories.',
    fieldsProvided: [
      'Facility Name & Commune',
      'Max Hourly Injection Capacity (Nm³/h)',
      'Commissioning Year / Date',
      'Network Operator (GRTgaz / Teréga / GRDF)',
      'Primary Input Typology (Agricole / STEP / Déchets)'
    ],
    fieldsUnverified: [],
    docUrl: 'https://opendata.reseaux-energies.fr/'
  },
  {
    id: 'bnetza_mastr_germany',
    name: 'Bundesnetzagentur Marktstammdatenregister (MaStR)',
    category: 'PLANTS_INFRASTRUCTURE',
    categoryLabel: 'Plants & Assets',
    authority: 'Federal Network Agency Germany (Bundesnetzagentur - BNetzA)',
    authorityType: 'NATIONAL_REGULATOR',
    sourceDocumentOrUrl: 'BNetzA Marktstammdatenregister Gasaufbereitungs- und Einspeiseanlagen',
    legalBasis: '§ 37a BImSchG, 38. BImSchV, MaStRV',
    updateFrequency: 'MONTHLY',
    coverageCount: '285 Active Injection Facilities in Germany',
    provenanceTier: 'TSO_OFFICIAL_DATA',
    description: 'Official German federal register for electricity and gas market participants, listing verified biomethane upgrading and grid injection assets.',
    fieldsProvided: [
      'Plant Name (MaStR-Nummer)',
      'Biomethane Upgrading Technology (Amine Scrubbing / Membrane / PSA)',
      'Rated Injection Output (Nm³/h / MWh/a)',
      'Grid Connection Operator (THE Market Zone)',
      'Primary Substrate Code (Gülle, Festmist, Nawaro, Bioabfall)'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.marktstammdatenregister.de/'
  },
  {
    id: 'energinet_datahub_denmark',
    name: 'Energinet Biogas Injection Datahub',
    category: 'PLANTS_INFRASTRUCTURE',
    categoryLabel: 'Plants & Assets',
    authority: 'Energinet (Danish National Gas Transmission System Operator)',
    authorityType: 'TSO_DSO',
    sourceDocumentOrUrl: 'Energi Data Service Biogas Injection API (api.energidataservice.dk)',
    legalBasis: 'Danish Gas Supply Act (Lov om gasforsyning)',
    updateFrequency: 'REAL_TIME_API',
    coverageCount: '60 Active Injection Plants in Denmark',
    provenanceTier: 'TSO_OFFICIAL_DATA',
    description: 'Real-time telemetry and metered gas injection feed for all central and local biomethane injection stations in Denmark.',
    fieldsProvided: [
      'GSRN Metering Point ID',
      'Facility Name & Municipality',
      'Hourly Metered Injected Volume (Nm³/h & MWh)',
      'Gas Quality & Energy Content (kWh/Nm³)',
      'Grid Injection Level (Transmission 80 bar / Distribution 4-19 bar)'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.energidataservice.dk/'
  },
  {
    id: 'uk_ggcs_ofgem_registry',
    name: 'Green Gas Certification Scheme & Ofgem NDR',
    category: 'PLANTS_INFRASTRUCTURE',
    categoryLabel: 'Plants & Assets',
    authority: 'Renewable Energy Assurance Limited (REAL) & Ofgem',
    authorityType: 'NATIONAL_REGULATOR',
    sourceDocumentOrUrl: 'GGCS Biomethane Registry & Ofgem Non-Domestic RHI Public Register',
    legalBasis: 'Renewable Heat Incentive Scheme Regulations 2018 (SI 2018/611)',
    updateFrequency: 'MONTHLY',
    coverageCount: '108 Grid-Connected Biomethane Plants in Great Britain',
    provenanceTier: 'TSO_OFFICIAL_DATA',
    description: 'UK statutory register of grid-injected biomethane facilities issuing Renewable Gas Guarantees of Origin (RGGOs).',
    fieldsProvided: [
      'Producer Name & Accreditations',
      'Network Operator (Cadent, SGN, NGN, WWU, National Gas)',
      'Accredited Feedstock Category (Crops, Food Waste, Sewage)',
      'Commissioning Tier & Grid Entry Point'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.greengas.org.uk/'
  },

  // --------------------------------------------------------------------------
  // 2. FEEDSTOCKS & CARBON INTENSITY (CI)
  // --------------------------------------------------------------------------
  {
    id: 'red_iii_annex_v_ix',
    name: 'EU RED III Directive (EU) 2023/2413 Annex V & IX',
    category: 'FEEDSTOCKS_CARBON_INTENSITY',
    categoryLabel: 'Feedstocks & Carbon Intensity',
    authority: 'European Parliament and Council of the European Union',
    authorityType: 'EU_INSTITUTION',
    sourceDocumentOrUrl: 'Directive (EU) 2023/2413 amending Directive (EU) 2018/2001',
    legalBasis: 'RED III Annex V (Default GHG Savings) & Annex IX (Part A & B Advanced Feedstocks)',
    updateFrequency: 'STATUTORY_FIXED',
    coverageCount: '30+ Certified Biomass & Biowaste Pathways',
    provenanceTier: 'STATUTORY_DIRECTIVE',
    description: 'Statutory European legal basis defining default carbon intensities, avoided methane credit formulas, Annex IX-A advanced double-counting feedstocks, and the 65% transport minimum GHG savings threshold.',
    fieldsProvided: [
      'Fossil Fuel Comparator (94.0 gCO₂e/MJ)',
      'Manure Default CI with Methane Avoidance (-100 gCO₂e/MJ)',
      'Sewage Sludge Default CI (-25 gCO₂e/MJ)',
      'Food Waste / Industrial Bio-waste Default CI (+15 gCO₂e/MJ)',
      'Energy Crops Default CI (+40 gCO₂e/MJ)',
      'Annex IX-A / IX-B Statutory Classification'
    ],
    fieldsUnverified: [],
    docUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L2413'
  },
  {
    id: 'jrc_biomethane_ghg_report',
    name: 'Joint Research Centre (JRC) Solid and Gaseous Bioenergy Report',
    category: 'FEEDSTOCKS_CARBON_INTENSITY',
    categoryLabel: 'Feedstocks & Carbon Intensity',
    authority: 'European Commission Joint Research Centre (JRC)',
    authorityType: 'EU_INSTITUTION',
    sourceDocumentOrUrl: 'JRC Science for Policy Report: GHG Default Values for Biomethane',
    legalBasis: 'COM(2016) 767 final / RED II & RED III calculation methodologies',
    updateFrequency: 'STATUTORY_FIXED',
    coverageCount: 'Disaggregated GHG emission parameters (eec, ep, etd, esca)',
    provenanceTier: 'STATUTORY_DIRECTIVE',
    description: 'Scientific and empirical basis for default biogas extraction, processing, compression, upgrading, and transport emissions factors across open and closed digestate storage systems.',
    fieldsProvided: [
      'Open vs. Closed Digestate Methane Credit Calculations',
      'Upgrading Offgas Slip Emission Factors',
      'Electricity Grid Carbon Factor Assumptions by Member State'
    ],
    fieldsUnverified: [],
    docUrl: 'https://joint-research-centre.ec.europa.eu/index_en'
  },
  {
    id: 'uk_rtfo_order_2007',
    name: 'UK Renewable Transport Fuel Obligations Order 2007 (SI 2007/3072)',
    category: 'FEEDSTOCKS_CARBON_INTENSITY',
    categoryLabel: 'Feedstocks & Carbon Intensity',
    authority: 'UK Department for Transport (DfT)',
    authorityType: 'NATIONAL_REGULATOR',
    sourceDocumentOrUrl: 'Renewable Transport Fuel Obligations Order 2007 as amended',
    legalBasis: 'Energy Act 2004, SI 2007/3072, SI 2021/1420',
    updateFrequency: 'STATUTORY_FIXED',
    coverageCount: 'UK RTFC Yield Factors & Multipliers',
    provenanceTier: 'STATUTORY_DIRECTIVE',
    description: 'Statutory order establishing biomethane energy content conversion (72.0 kg/MWh) and double-counting certificate multipliers (144.0 dRTFC/MWh for waste/slurry).',
    fieldsProvided: [
      'Biomethane Lower Heating Value (50 MJ/kg ≈ 13.889 kWh/kg)',
      'Gaseous Fuel Certificate Yield (1 dRTFC/kg standard, 2 dRTFC/kg waste)',
      'Buy-out Penalty Rate (50p / certificate)'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.legislation.gov.uk/uksi/2007/3072/contents'
  },

  // --------------------------------------------------------------------------
  // 3. MARKET PRICING & BENCHMARK MARKS
  // --------------------------------------------------------------------------
  {
    id: 'pan_european_broker_sheet',
    name: 'Pan-European Biomethane Broker Pricing Sheet',
    category: 'MARKET_PRICING_BENCHMARKS',
    categoryLabel: 'Market Marks',
    authority: 'Specialist European Biomethane & Environmental Commodities Brokerage Desks',
    authorityType: 'BROKER_DESK',
    sourceDocumentOrUrl: 'OTC Trader Consensus Sheet (Bilateral Biomethane Swaps)',
    legalBasis: 'EFET Master Agreement (Biomethane Appendix)',
    updateFrequency: 'DAILY',
    coverageCount: '30 European Compliance & Voluntary Buyer Markets',
    provenanceTier: 'BROKER_REPORTED_QUOTE',
    description: 'Consolidated OTC bid/offer benchmark pricing for compliance certificates (THG, ERE, CPB, CIC, RTFO, FuelEU) and voluntary Guarantees of Origin across Europe.',
    fieldsProvided: [
      'Bid, Offer, and Mid Pricing Curves',
      'Bid-Ask Spread & Liquidity Depth Indicator',
      'Observation Timestamps and Delivery Periods (Spot / 2026 / 2027 / 2028)'
    ],
    fieldsUnverified: [],
    docUrl: null
  },
  {
    id: 'argus_biomethane_report',
    name: 'Argus Media Biomethane & German THG Assessments',
    category: 'MARKET_PRICING_BENCHMARKS',
    categoryLabel: 'Market Marks',
    authority: 'Argus Media Group',
    authorityType: 'PRICE_REPORTING_AGENCY',
    sourceDocumentOrUrl: 'Argus Biofuels / Argus European Natural Gas Report',
    legalBasis: 'IOSCO Principles for Price Reporting Agencies',
    updateFrequency: 'DAILY',
    coverageCount: 'German THG Quota (€/tCO₂e), Dutch HBE/ERE, and European Guarantees of Origin',
    provenanceTier: 'BROKER_REPORTED_QUOTE',
    description: 'Independent price assessment of German GHG quota compliance tickets and European biomethane wholesale supply.',
    fieldsProvided: [
      'German THG Quota Benchmark (€/tCO₂e avoided)',
      'Dutch ERE / HBE-G Price (€/kgCO₂e and €/GJ)',
      'European Voluntary Green Gas GO Premiums (€/MWh)'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.argusmedia.com/en'
  },
  {
    id: 'cegh_eex_gas_indices',
    name: 'CEGH / EEX European Gas Spot & Futures Indices',
    category: 'MARKET_PRICING_BENCHMARKS',
    categoryLabel: 'Market Marks',
    authority: 'European Energy Exchange (EEX) & Central European Gas Hub (CEGH)',
    authorityType: 'PRICE_REPORTING_AGENCY',
    sourceDocumentOrUrl: 'EEX TTF / THE Natural Gas Spot Price (EGIX / CEGHIX)',
    legalBasis: 'EU Regulation No 1227/2011 on wholesale energy market integrity (REMIT)',
    updateFrequency: 'REAL_TIME_API',
    coverageCount: 'All Interconnected European Gas Hubs (TTF, THE, PEG, PSV, PVB, NBP, ZTP)',
    provenanceTier: 'BROKER_REPORTED_QUOTE',
    description: 'Wholesale natural gas market reference indices used for the physical molecule baseline in biomethane delivered netback pricing stacks.',
    fieldsProvided: [
      'Hub Natural Gas Base Price (€/MWh)',
      'Inter-Hub Basis Spreads (THE-TTF, PEG-TTF, PSV-TTF)',
      'Calendar Day-Ahead and Month-Ahead Forward Curves'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.eex.com/en/'
  },

  // --------------------------------------------------------------------------
  // 4. LOGISTICS & PIPELINE INTERCONNECTORS
  // --------------------------------------------------------------------------
  {
    id: 'entsog_transparency_platform',
    name: 'ENTSOG European Gas Interconnection & Transmission Map',
    category: 'LOGISTICS_INTERCONNECTORS',
    categoryLabel: 'Logistics & Tariffs',
    authority: 'European Network of Transmission System Operators for Gas (ENTSOG)',
    authorityType: 'TSO_DSO',
    sourceDocumentOrUrl: 'ENTSOG Transparency Platform (transparency.entsog.eu)',
    legalBasis: 'Regulation (EC) No 715/2009 & Commission Regulation (EU) 2017/460 (NC TAR)',
    updateFrequency: 'DAILY',
    coverageCount: '560+ Cross-Border Pipeline Interconnection Points across 28 Countries',
    provenanceTier: 'TSO_OFFICIAL_DATA',
    description: 'Complete topological graph of cross-border gas interconnectors, transmission system operators, and physical capacity allocations connecting European gas grids.',
    fieldsProvided: [
      'Interconnection Point (IP) Names & EIC Codes',
      'From TSO & To TSO Topology',
      'Standard Entry / Exit Tariffs (€/MWh/day)',
      'Capacity Allocation Platform (PRISMA, RBP, GSA)'
    ],
    fieldsUnverified: [],
    docUrl: 'https://transparency.entsog.eu/'
  },
  {
    id: 'national_tso_tariffs',
    name: 'National TSO Network Codes & Entry/Exit Tariffs',
    category: 'LOGISTICS_INTERCONNECTORS',
    categoryLabel: 'Logistics & Tariffs',
    authority: 'Creos (LU), Open Grid Europe / Trading Hub Europe (DE), Fluxys (BE), GRTgaz (FR), Enagás (ES), Snam (IT), Gasunie (NL), Energinet (DK)',
    authorityType: 'TSO_DSO',
    sourceDocumentOrUrl: 'National TSO Published Regulatory Tariff Schedules',
    legalBasis: 'National Gas Network Codes approved by National Regulatory Authorities (BNetzA, CRE, CNMC, ARERA, ACM, ILR, E-Control)',
    updateFrequency: 'ANNUAL',
    coverageCount: 'Domestic and Adjacent Cross-Border Tariff Matrix',
    provenanceTier: 'STATUTORY_DIRECTIVE',
    description: 'Published statutory transmission tariffs governing gas injection, cross-border transit, and physical virtual trading point withdrawal.',
    fieldsProvided: [
      'Domestic Entry Injection Tariff (€0.50/MWh baseline)',
      'Adjacent Cross-Border Single Transit Tariff (€1.80/MWh)',
      'Multi-Zone Inter-Hub Transit Tariff (€3.20/MWh)',
      'Transmission Shrinkage & Fuel Gas Loss Rates (0.3% - 0.7%)'
    ],
    fieldsUnverified: [],
    docUrl: null
  },

  // --------------------------------------------------------------------------
  // 5. REGISTRIES & MASS BALANCE HUBS
  // --------------------------------------------------------------------------
  {
    id: 'eu_udb_gaseous_fuels',
    name: 'European Commission Union Database (UDB) for Gaseous Fuels',
    category: 'REGISTRIES_MASS_BALANCE',
    categoryLabel: 'Registries',
    authority: 'European Commission Directorate-General for Energy (DG ENER)',
    authorityType: 'EU_INSTITUTION',
    sourceDocumentOrUrl: 'Union Database (UDB) under Article 31a of Directive (EU) 2018/2001',
    legalBasis: 'Directive (EU) 2018/2001 Art. 28 & 31a; Commission Implementing Regulation (EU) 2022/996',
    updateFrequency: 'REAL_TIME_API',
    coverageCount: 'EU Single Connected Gas Network Mass Balance Zone',
    provenanceTier: 'STATUTORY_DIRECTIVE',
    description: 'Mandatory central EU database tracking all gaseous biofuel and biomethane consignments, proofs of sustainability (PoS), mass balance accounts, and title transfers across EU Member States.',
    fieldsProvided: [
      'Consignment PoS Validation Rules',
      'Interconnected EU Gas Grid Mass Balance Boundary Definitions',
      'Non-EU Third Country Segregation Protocols (UK / Swiss boundaries)'
    ],
    fieldsUnverified: [],
    docUrl: 'https://energy.ec.europa.eu/topics/renewable-energy/bioenergy_en'
  },
  {
    id: 'dena_biogasregister_germany',
    name: 'dena Biogasregister Deutschland',
    category: 'REGISTRIES_MASS_BALANCE',
    categoryLabel: 'Registries',
    authority: 'Deutsche Energie-Agentur (dena)',
    authorityType: 'NATIONAL_REGULATOR',
    sourceDocumentOrUrl: 'dena Biogasregister Kriterienkatalog & Documentation',
    legalBasis: 'EEG 2023, EWärmeG, and GEG (Gebäudeenergiegesetz)',
    updateFrequency: 'DAILY',
    coverageCount: 'German National Biomethane Guarantees of Origin',
    provenanceTier: 'TSO_OFFICIAL_DATA',
    description: 'German national documentation system for biomethane quality, green gas criteria, and voluntary corporate GHG accounting transfers.',
    fieldsProvided: [
      'Account Holder Transfer Protocol',
      'Standardized Quality Certificates (dena-Kriterien)',
      'Bilateral EECS-Gas Inter-Registry Bridge Specifications'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.biogasregister.de/'
  },
  {
    id: 'verticer_registry_netherlands',
    name: 'VertiCer Statutory Dutch Guarantee of Origin Registry',
    category: 'REGISTRIES_MASS_BALANCE',
    categoryLabel: 'Registries',
    authority: 'VertiCer (CertiQ & Gasunie)',
    authorityType: 'NATIONAL_REGULATOR',
    sourceDocumentOrUrl: 'VertiCer Green Gas Certificate Protocol',
    legalBasis: 'Gaswet Art. 52a (Dutch Gas Act)',
    updateFrequency: 'DAILY',
    coverageCount: 'Dutch Biomethane Injections & Voluntary Certificates',
    provenanceTier: 'TSO_OFFICIAL_DATA',
    description: 'Designated statutory issuer of Guarantees of Origin for biomethane and green gas in the Netherlands.',
    fieldsProvided: [
      'Green Gas Certificate Issuance for Grid Injections',
      'Electronic Registry Cancellation for Scope 1 Compliance',
      'ERGaR / AIB EECS Scheme Connectivity'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.verticer.eu/'
  },
  {
    id: 'eex_france_go_registry',
    name: 'EEX Registre National des Garanties d\'Origine de Biométhane',
    category: 'REGISTRIES_MASS_BALANCE',
    categoryLabel: 'Registries',
    authority: 'European Energy Exchange (EEX) under mandate from Ministry of Ecological Transition',
    authorityType: 'NATIONAL_REGULATOR',
    sourceDocumentOrUrl: 'EEX French Biomethane GO Registry Rules',
    legalBasis: 'Code de l\'énergie, Art. L.446-18',
    updateFrequency: 'DAILY',
    coverageCount: 'French Biomethane GO Issuance & Auctions',
    provenanceTier: 'TSO_OFFICIAL_DATA',
    description: 'Official national French registry for biomethane Guarantees of Origin, managing state feed-in tariff auctions and OTC bilateral transfers.',
    fieldsProvided: [
      'Statutory Biomethane GO Issuance (1 GO = 1 MWh injected)',
      'State Auction Settlement Results',
      'Domestic Heating and Industrial Offtake Cancellation'
    ],
    fieldsUnverified: [],
    docUrl: 'https://www.eex.com/en/markets/environmental-markets'
  }
];

export function getDataSourcesByCategory(category: DataSourceCategory | 'ALL'): DataSourceRecord[] {
  if (category === 'ALL') return DATA_SOURCES_DIRECTORY;
  return DATA_SOURCES_DIRECTORY.filter(d => d.category === category);
}

export function getDataSourceById(id: string): DataSourceRecord | undefined {
  return DATA_SOURCES_DIRECTORY.find(d => d.id === id);
}
