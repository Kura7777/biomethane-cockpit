import { BiomethanePlant, DeveloperPortfolio, CountryMacroStat } from './types';
import { VERIFIED_COMMERCIAL_PLANTS } from './verifiedPlants';
import { BIOMETHANE_PLANTS } from './plantsData';

export { BIOMETHANE_PLANTS };

export async function loadPlantsAsync(): Promise<BiomethanePlant[]> {
  const mod = await import('./plantsData');
  return mod.BIOMETHANE_PLANTS;
}

export const DEVELOPER_PORTFOLIOS: DeveloperPortfolio[] = [
  {
    "id": "dev_1",
    "name": "Nature Energy (Shell)",
    "countryHQ": "Denmark",
    "countryFlag": "🇩🇰",
    "totalCapacityGWh": 4200.0,
    "coreGeographies": [
      "DK",
      "NL",
      "FR",
      "UK"
    ],
    "signatureAssets": [
      "Korskro",
      "Holsted",
      "Glansager",
      "Coevorden"
    ],
    "strategicFocus": "Industrial large-scale slurry digestion & cross-border gas trade"
  },
  {
    "id": "dev_2",
    "name": "TotalEnergies",
    "countryHQ": "France",
    "countryFlag": "🇫🇷",
    "totalCapacityGWh": 2800.0,
    "coreGeographies": [
      "FR",
      "PL",
      "ES",
      "BE"
    ],
    "signatureAssets": [
      "BioBéarn",
      "BioNorrois",
      "Chagny",
      "PGB Poland"
    ],
    "strategicFocus": "Integrated energy major; agro-industrial & waste biomethane"
  },
  {
    "id": "dev_3",
    "name": "ENGIE / Storengy",
    "countryHQ": "France",
    "countryFlag": "🇫🇷",
    "totalCapacityGWh": 2400.0,
    "coreGeographies": [
      "FR",
      "BE",
      "NL"
    ],
    "signatureAssets": [
      "Beauce Gâtinais",
      "Quévy",
      "BioZ portfolio"
    ],
    "strategicFocus": "Utility decarbonization; French CPB compliance & industrial PPAs"
  },
  {
    "id": "dev_4",
    "name": "VERBIO SE",
    "countryHQ": "Germany",
    "countryFlag": "🇩🇪",
    "totalCapacityGWh": 1850.0,
    "coreGeographies": [
      "DE",
      "PL",
      "HU"
    ],
    "signatureAssets": [
      "Zörbig",
      "Schwedt",
      "Pinnow"
    ],
    "strategicFocus": "Advanced biofuels; 100% agricultural straw & whole distillery stillage"
  },
  {
    "id": "dev_5",
    "name": "EnviTec Biogas AG",
    "countryHQ": "Germany",
    "countryFlag": "🇩🇪",
    "totalCapacityGWh": 1500.0,
    "coreGeographies": [
      "DE",
      "SK",
      "CZ",
      "IT"
    ],
    "signatureAssets": [
      "Güstrow Bio-LNG",
      "Bierovce",
      "Ožďany"
    ],
    "strategicFocus": "In-house EPC + proprietary EnviThan membrane upgrading & Bio-LNG"
  },
  {
    "id": "dev_6",
    "name": "Gasum AB / Oy",
    "countryHQ": "Finland",
    "countryFlag": "🇫🇮",
    "totalCapacityGWh": 1400.0,
    "coreGeographies": [
      "FI",
      "SE",
      "NO"
    ],
    "signatureAssets": [
      "Götene",
      "Turku",
      "Nymölla",
      "Jordberga"
    ],
    "strategicFocus": "Nordic Bio-LNG & Bio-CNG heavy transport and maritime bunkering"
  },
  {
    "id": "dev_7",
    "name": "St1 Biokraft",
    "countryHQ": "Sweden",
    "countryFlag": "🇸🇪",
    "totalCapacityGWh": 1100.0,
    "coreGeographies": [
      "SE",
      "NO",
      "FI"
    ],
    "signatureAssets": [
      "Skogn Bio-LNG",
      "Södertörn",
      "Mönsterås",
      "Henriksdal"
    ],
    "strategicFocus": "Industrial waste, aquaculture sludge & Nordic heavy vehicle mobility"
  },
  {
    "id": "dev_8",
    "name": "BioCirc Group",
    "countryHQ": "Denmark",
    "countryFlag": "🇩🇰",
    "totalCapacityGWh": 1150.0,
    "coreGeographies": [
      "Denmark"
    ],
    "signatureAssets": [
      "Vinkel Bioenergi",
      "Blåbjerg",
      "Iglsø"
    ],
    "strategicFocus": "Circular bioeconomy clusters; biomethane + biogenic CCS CDR"
  },
  {
    "id": "dev_9",
    "name": "Waga Energy",
    "countryHQ": "France",
    "countryFlag": "🇫🇷",
    "totalCapacityGWh": 950.0,
    "coreGeographies": [
      "FR",
      "ES",
      "IT"
    ],
    "signatureAssets": [
      "Claye-Souilly",
      "Can Mata (Spain)",
      "Liévin"
    ],
    "strategicFocus": "Patented WAGABOX®® cryogenic technology upgrading landfill gas (LFG)"
  },
  {
    "id": "dev_10",
    "name": "Attero B.V.",
    "countryHQ": "Netherlands",
    "countryFlag": "🇳🇱",
    "totalCapacityGWh": 650.0,
    "coreGeographies": [
      "Netherlands"
    ],
    "signatureAssets": [
      "Wijster Hub",
      "Tilburg",
      "Venlo"
    ],
    "strategicFocus": "Large-scale municipal organic waste (VGF) and landfill gas digestion"
  },
  {
    "id": "dev_11",
    "name": "Bigadan A/S",
    "countryHQ": "Denmark",
    "countryFlag": "🇩🇰",
    "totalCapacityGWh": 600.0,
    "coreGeographies": [
      "Denmark"
    ],
    "signatureAssets": [
      "Kalundborg",
      "Horsens",
      "Thorsø"
    ],
    "strategicFocus": "Large-scale agricultural co-digestion and industrial symbiosis"
  },
  {
    "id": "dev_12",
    "name": "Suma Capital / Biovic",
    "countryHQ": "Spain",
    "countryFlag": "🇪🇸",
    "totalCapacityGWh": 450.0,
    "coreGeographies": [
      "Spain"
    ],
    "signatureAssets": [
      "UNUE Burgos",
      "Montes de Toledo",
      "Galivi Lorca"
    ],
    "strategicFocus": "High-growth Iberian agricultural and industrial waste origination"
  },
  {
    "id": "dev_13",
    "name": "Future Biogas",
    "countryHQ": "United Kingdom",
    "countryFlag": "🇬🇧",
    "totalCapacityGWh": 550.0,
    "coreGeographies": [
      "United Kingdom"
    ],
    "signatureAssets": [
      "Leeming",
      "Euston",
      "Egmere",
      "Vulcan"
    ],
    "strategicFocus": "Unsubsidized green gas corporate PPAs & biogenic BECCS"
  },
  {
    "id": "dev_14",
    "name": "Severn Trent Green Power",
    "countryHQ": "United Kingdom",
    "countryFlag": "🇬🇧",
    "totalCapacityGWh": 480.0,
    "coreGeographies": [
      "United Kingdom"
    ],
    "signatureAssets": [
      "Minworth",
      "Coleshill",
      "Finham",
      "Roundhill"
    ],
    "strategicFocus": "Sewage sludge thermal hydrolysis & commercial food waste digestion"
  },
  {
    "id": "dev_15",
    "name": "Montello S.p.A.",
    "countryHQ": "Italy",
    "countryFlag": "🇮🇹",
    "totalCapacityGWh": 380.0,
    "coreGeographies": [
      "Italy"
    ],
    "signatureAssets": [
      "Montello Biomethane Hub (Bergamo)"
    ],
    "strategicFocus": "Pioneer in 100% source-separated OFMSW (FORSU) & food-grade CO2"
  },
  {
    "id": "dev_16",
    "name": "Cycle0",
    "countryHQ": "Spain / UK",
    "countryFlag": "🇪🇺",
    "totalCapacityGWh": 350.0,
    "coreGeographies": [
      "ES",
      "IE",
      "Pan-EU"
    ],
    "signatureAssets": [
      "Iberian small/medium farm slurry plants"
    ],
    "strategicFocus": "Modular containerized Bio-CNG / Bio-LNG micro-upgrading"
  },
  {
    "id": "dev_17",
    "name": "PreZero Energy",
    "countryHQ": "Germany / Spain",
    "countryFlag": "🇪🇺",
    "totalCapacityGWh": 320.0,
    "coreGeographies": [
      "DE",
      "ES"
    ],
    "signatureAssets": [
      "Valdemingómez PTB",
      "Metabarri Bilbao"
    ],
    "strategicFocus": "Municipal waste concessions & circular energy recovery"
  },
  {
    "id": "dev_18",
    "name": "Gals Agro",
    "countryHQ": "Ukraine",
    "countryFlag": "🇺🇦",
    "totalCapacityGWh": 180.0,
    "coreGeographies": [
      "Ukraine"
    ],
    "signatureAssets": [
      "Chernihiv",
      "Gorodysche",
      "Vinnytsia"
    ],
    "strategicFocus": "Agro-holding crop residues & livestock slurry export to EU"
  },
  {
    "id": "dev_19",
    "name": "Bia Energy",
    "countryHQ": "Ireland",
    "countryFlag": "🇮🇪",
    "totalCapacityGWh": 120.0,
    "coreGeographies": [
      "Ireland"
    ],
    "signatureAssets": [
      "Bia Energy Huntstown (Dublin)"
    ],
    "strategicFocus": "Food processing and commercial brown bin waste to grid"
  },
  {
    "id": "dev_20",
    "name": "Polska Grupa Biogazowa (PGB)",
    "countryHQ": "Poland",
    "countryFlag": "🇵🇱",
    "totalCapacityGWh": 140.0,
    "coreGeographies": [
      "Poland"
    ],
    "signatureAssets": [
      "Brody",
      "Dobre",
      "Kupin"
    ],
    "strategicFocus": "Polish agricultural residue clusters expanding to biomethane grid injection"
  }
];

export const COUNTRY_MACRO_STATS: CountryMacroStat[] = [
  {
    "country": "France",
    "iso": "FR",
    "flag": "🇫🇷",
    "activePlants": 815,
    "installedCapacityTWh": 15.8,
    "installedCapacityMcm": 1505.0,
    "avgPlantSizeNm3h": 210.0,
    "gridConnectionRate": 0.93,
    "primaryFeedstockType": "Agri-residues & Manure",
    "primaryUpgradingTech": "Membranes (75%)",
    "nationalRegistry": "ODRE / GRDF / EEX"
  },
  {
    "country": "Germany",
    "iso": "DE",
    "flag": "🇩🇪",
    "activePlants": 265,
    "installedCapacityTWh": 11.2,
    "installedCapacityMcm": 1067.0,
    "avgPlantSizeNm3h": 460.0,
    "gridConnectionRate": 0.95,
    "primaryFeedstockType": "Manure & Energy Crops",
    "primaryUpgradingTech": "Amine Scrubbing & Membranes",
    "nationalRegistry": "dena Biogasregister / MaStR"
  },
  {
    "country": "United Kingdom",
    "iso": "GB",
    "flag": "🇬🇧",
    "activePlants": 132,
    "installedCapacityTWh": 9.6,
    "installedCapacityMcm": 914.0,
    "avgPlantSizeNm3h": 790.0,
    "gridConnectionRate": 0.88,
    "primaryFeedstockType": "Energy Crops (60%), Waste & Sewage",
    "primaryUpgradingTech": "Membranes & Water Scrubbing",
    "nationalRegistry": "Green Gas Certification (GGCS) / Ofgem"
  },
  {
    "country": "Denmark",
    "iso": "DK",
    "flag": "🇩🇰",
    "activePlants": 68,
    "installedCapacityTWh": 8.2,
    "installedCapacityMcm": 781.0,
    "avgPlantSizeNm3h": 1300.0,
    "gridConnectionRate": 1.0,
    "primaryFeedstockType": "Liquid Manure & Agri-waste",
    "primaryUpgradingTech": "Amine Scrubbing (Ammongas)",
    "nationalRegistry": "Energinet"
  },
  {
    "country": "Italy",
    "iso": "IT",
    "flag": "🇮🇹",
    "activePlants": 115,
    "installedCapacityTWh": 5.6,
    "installedCapacityMcm": 533.0,
    "avgPlantSizeNm3h": 530.0,
    "gridConnectionRate": 0.9,
    "primaryFeedstockType": "OFMSW (FORSU) & Slurry",
    "primaryUpgradingTech": "Membranes & Water Scrubbing",
    "nationalRegistry": "GSE (Gestore Servizi Energetici)"
  },
  {
    "country": "Netherlands",
    "iso": "NL",
    "flag": "🇳🇱",
    "activePlants": 88,
    "installedCapacityTWh": 3.1,
    "installedCapacityMcm": 295.0,
    "avgPlantSizeNm3h": 380.0,
    "gridConnectionRate": 0.94,
    "primaryFeedstockType": "Organic Waste & Manure",
    "primaryUpgradingTech": "Water Scrubbing & Membranes",
    "nationalRegistry": "VertiCer / Gasunie"
  },
  {
    "country": "Sweden",
    "iso": "SE",
    "flag": "🇸🇪",
    "activePlants": 78,
    "installedCapacityTWh": 2.3,
    "installedCapacityMcm": 219.0,
    "avgPlantSizeNm3h": 320.0,
    "gridConnectionRate": 0.38,
    "primaryFeedstockType": "Food Waste & Sewage Sludge",
    "primaryUpgradingTech": "Amine Wash & Cryo Bio-LNG",
    "nationalRegistry": "Swedish Energy Agency / Energigas"
  },
  {
    "country": "Switzerland",
    "iso": "CH",
    "flag": "🇨🇭",
    "activePlants": 42,
    "installedCapacityTWh": 0.45,
    "installedCapacityMcm": 43.0,
    "avgPlantSizeNm3h": 120.0,
    "gridConnectionRate": 0.85,
    "primaryFeedstockType": "Biowaste & Sewage Sludge",
    "primaryUpgradingTech": "Membranes & Water Wash",
    "nationalRegistry": "VSG / SVGW Biogasregister"
  },
  {
    "country": "Spain",
    "iso": "ES",
    "flag": "🇪🇸",
    "activePlants": 36,
    "installedCapacityTWh": 1.25,
    "installedCapacityMcm": 119.0,
    "avgPlantSizeNm3h": 380.0,
    "gridConnectionRate": 0.89,
    "primaryFeedstockType": "Pig Slurry & Agro-industrial",
    "primaryUpgradingTech": "Membranes & Cryogenic LFG",
    "nationalRegistry": "Enagás GTS (GdO)"
  },
  {
    "country": "Finland",
    "iso": "FI",
    "flag": "🇫🇮",
    "activePlants": 26,
    "installedCapacityTWh": 0.55,
    "installedCapacityMcm": 52.0,
    "avgPlantSizeNm3h": 240.0,
    "gridConnectionRate": 0.42,
    "primaryFeedstockType": "Biowaste & Sewage Sludge",
    "primaryUpgradingTech": "Amine Scrubbing & Water Wash",
    "nationalRegistry": "Gasgrid Finland / Energy Authority"
  },
  {
    "country": "Austria",
    "iso": "AT",
    "flag": "🇦🇹",
    "activePlants": 18,
    "installedCapacityTWh": 0.22,
    "installedCapacityMcm": 21.0,
    "avgPlantSizeNm3h": 135.0,
    "gridConnectionRate": 0.9,
    "primaryFeedstockType": "Agri-crops & Biowaste",
    "primaryUpgradingTech": "Membranes & Water Wash",
    "nationalRegistry": "AGCS Biomethan Register"
  },
  {
    "country": "Norway",
    "iso": "NO",
    "flag": "🇳🇴",
    "activePlants": 16,
    "installedCapacityTWh": 0.65,
    "installedCapacityMcm": 62.0,
    "avgPlantSizeNm3h": 440.0,
    "gridConnectionRate": 0.25,
    "primaryFeedstockType": "Fish Sludge & Food Waste",
    "primaryUpgradingTech": "Amine Wash & Cryo Bio-LNG",
    "nationalRegistry": "Norwegian Environment Agency"
  },
  {
    "country": "Belgium",
    "iso": "BE",
    "flag": "🇧🇪",
    "activePlants": 15,
    "installedCapacityTWh": 0.42,
    "installedCapacityMcm": 40.0,
    "avgPlantSizeNm3h": 310.0,
    "gridConnectionRate": 0.87,
    "primaryFeedstockType": "Food Processing & Agri-waste",
    "primaryUpgradingTech": "Membranes",
    "nationalRegistry": "VREG (Flanders) / SPW (Wallonia)"
  },
  {
    "country": "Czech Republic",
    "iso": "CZ",
    "flag": "🇨🇿",
    "activePlants": 12,
    "installedCapacityTWh": 0.28,
    "installedCapacityMcm": 27.0,
    "avgPlantSizeNm3h": 260.0,
    "gridConnectionRate": 0.92,
    "primaryFeedstockType": "Municipal Biowaste & Manure",
    "primaryUpgradingTech": "Membranes (DMT/HoSt)",
    "nationalRegistry": "OTE Registry"
  },
  {
    "country": "Ukraine",
    "iso": "UA",
    "flag": "🇺🇦",
    "activePlants": 8,
    "installedCapacityTWh": 0.85,
    "installedCapacityMcm": 81.0,
    "avgPlantSizeNm3h": 1150.0,
    "gridConnectionRate": 0.88,
    "primaryFeedstockType": "Agri-manure & Beet Pulp",
    "primaryUpgradingTech": "Membranes & Amine Wash",
    "nationalRegistry": "State Biomethane Register / GTSOU"
  },
  {
    "country": "Estonia",
    "iso": "EE",
    "flag": "🇪🇪",
    "activePlants": 5,
    "installedCapacityTWh": 0.19,
    "installedCapacityMcm": 18.0,
    "avgPlantSizeNm3h": 410.0,
    "gridConnectionRate": 0.8,
    "primaryFeedstockType": "Pulp Wastewater & Slurry",
    "primaryUpgradingTech": "Membranes",
    "nationalRegistry": "Elering Registry"
  },
  {
    "country": "Slovakia",
    "iso": "SK",
    "flag": "🇸🇰",
    "activePlants": 5,
    "installedCapacityTWh": 0.18,
    "installedCapacityMcm": 17.0,
    "avgPlantSizeNm3h": 390.0,
    "gridConnectionRate": 1.0,
    "primaryFeedstockType": "Food Waste & Poultry Manure",
    "primaryUpgradingTech": "EnviThan Membranes",
    "nationalRegistry": "SPP – distribúcia Registry"
  },
  {
    "country": "Poland",
    "iso": "PL",
    "flag": "🇵🇱",
    "activePlants": 5,
    "installedCapacityTWh": 0.15,
    "installedCapacityMcm": 14.0,
    "avgPlantSizeNm3h": 330.0,
    "gridConnectionRate": 0.6,
    "primaryFeedstockType": "Sugar Beet Pulp & Manure",
    "primaryUpgradingTech": "Membranes",
    "nationalRegistry": "KOWR / URE Register"
  },
  {
    "country": "Portugal",
    "iso": "PT",
    "flag": "🇵🇹",
    "activePlants": 4,
    "installedCapacityTWh": 0.08,
    "installedCapacityMcm": 8.0,
    "avgPlantSizeNm3h": 220.0,
    "gridConnectionRate": 0.75,
    "primaryFeedstockType": "Wastewater Sludge & OFMSW",
    "primaryUpgradingTech": "PSA & Membranes",
    "nationalRegistry": "REN EEGO"
  },
  {
    "country": "Hungary",
    "iso": "HU",
    "flag": "🇭🇺",
    "activePlants": 4,
    "installedCapacityTWh": 0.12,
    "installedCapacityMcm": 11.0,
    "avgPlantSizeNm3h": 310.0,
    "gridConnectionRate": 0.75,
    "primaryFeedstockType": "Sugar Beet Pulp & Manure",
    "primaryUpgradingTech": "Water Wash & Membranes",
    "nationalRegistry": "MEKH Registry"
  },
  {
    "country": "Lithuania",
    "iso": "LT",
    "flag": "🇱🇹",
    "activePlants": 3,
    "installedCapacityTWh": 0.16,
    "installedCapacityMcm": 15.0,
    "avgPlantSizeNm3h": 580.0,
    "gridConnectionRate": 1.0,
    "primaryFeedstockType": "Distillery Vinasse & Manure",
    "primaryUpgradingTech": "Membranes (Bright)",
    "nationalRegistry": "Amber Grid Registry"
  },
  {
    "country": "Latvia",
    "iso": "LV",
    "flag": "🇱🇻",
    "activePlants": 2,
    "installedCapacityTWh": 0.06,
    "installedCapacityMcm": 6.0,
    "avgPlantSizeNm3h": 330.0,
    "gridConnectionRate": 0.5,
    "primaryFeedstockType": "Poultry Manure (Virtual Hub)",
    "primaryUpgradingTech": "Membranes",
    "nationalRegistry": "Conexus Baltic Grid"
  },
  {
    "country": "Luxembourg",
    "iso": "LU",
    "flag": "🇱🇺",
    "activePlants": 3,
    "installedCapacityTWh": 0.04,
    "installedCapacityMcm": 4.0,
    "avgPlantSizeNm3h": 150.0,
    "gridConnectionRate": 1.0,
    "primaryFeedstockType": "Municipal Biowaste & Slurry",
    "primaryUpgradingTech": "Dry AD & Membranes",
    "nationalRegistry": "ILR / Creos"
  },
  {
    "country": "Greece",
    "iso": "GR",
    "flag": "🇬🇷",
    "activePlants": 2,
    "installedCapacityTWh": 0.03,
    "installedCapacityMcm": 3.0,
    "avgPlantSizeNm3h": 190.0,
    "gridConnectionRate": 0.5,
    "primaryFeedstockType": "Agri-waste & Manure",
    "primaryUpgradingTech": "Membranes",
    "nationalRegistry": "DESFA / DAPEEP"
  },
  {
    "country": "Romania",
    "iso": "RO",
    "flag": "🇷🇴",
    "activePlants": 2,
    "installedCapacityTWh": 0.04,
    "installedCapacityMcm": 4.0,
    "avgPlantSizeNm3h": 220.0,
    "gridConnectionRate": 0.5,
    "primaryFeedstockType": "Agro-industrial Food Waste",
    "primaryUpgradingTech": "Membranes",
    "nationalRegistry": "Transgaz"
  },
  {
    "country": "Croatia",
    "iso": "HR",
    "flag": "🇭🇷",
    "activePlants": 1,
    "installedCapacityTWh": 0.01,
    "installedCapacityMcm": 1.0,
    "avgPlantSizeNm3h": 110.0,
    "gridConnectionRate": 1.0,
    "primaryFeedstockType": "Agro-food Waste",
    "primaryUpgradingTech": "Membranes",
    "nationalRegistry": "Plinacro"
  }
];

export { VERIFIED_COMMERCIAL_PLANTS };

export const COMBINED_BIOMETHANE_PLANTS: BiomethanePlant[] = BIOMETHANE_PLANTS;

export function getPlantsByCountry(countryCode: string, includeVerified: boolean = false): BiomethanePlant[] {
  const source = includeVerified ? COMBINED_BIOMETHANE_PLANTS : BIOMETHANE_PLANTS;
  return source.filter(p => p.countryCode === countryCode);
}

export function getTopPlantsByCapacity(limit: number = 10): BiomethanePlant[] {
  return [...COMBINED_BIOMETHANE_PLANTS]
    .filter(p => p.annualEnergyGWh !== null && p.annualEnergyGWh !== undefined)
    .sort((a, b) => (b.annualEnergyGWh || 0) - (a.annualEnergyGWh || 0))
    .slice(0, limit);
}

export function searchPlants(query: string): BiomethanePlant[] {
  const q = query.toLowerCase();
  return COMBINED_BIOMETHANE_PLANTS.filter(p => 
    (p.name || '').toLowerCase().includes(q) ||
    (p.country || '').toLowerCase().includes(q) ||
    (p.operator || '').toLowerCase().includes(q) ||
    (p.legalEntityName || '').toLowerCase().includes(q) ||
    (p.companyRegistrationId || '').toLowerCase().includes(q) ||
    (p.contactEmail || '').toLowerCase().includes(q) ||
    (p.headquartersAddress || '').toLowerCase().includes(q) ||
    (p.primaryFeedstockCategory || '').toLowerCase().includes(q) ||
    (p.feedstockDetails || '').toLowerCase().includes(q) ||
    (p.upgradingTechnology || '').toLowerCase().includes(q) ||
    (p.region || '').toLowerCase().includes(q) ||
    (p.networkOperator || '').toLowerCase().includes(q) ||
    (p.provenance || '').toLowerCase().includes(q)
  );
}
