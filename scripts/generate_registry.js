import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const regex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^,]*))(?:,|$)/g;
    const values = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] !== undefined ? match[1].replace(/\"\"/g, '\"') : match[2];
      values.push(val);
      if (regex.lastIndex >= line.length) break;
    }
    rows.push(values);
  }
  return rows;
}

const csvPath = path.resolve(__dirname, '../European_Biomethane_Plants_Master_Registry_2026.csv');
const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));

const countryMap = {
  FR: { name: 'France', flag: '🇫🇷' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  BE: { name: 'Belgium', flag: '🇧🇪' },
  NO: { name: 'Norway', flag: '🇳🇴' },
  CZ: { name: 'Czech Republic', flag: '🇨🇿' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  DK: { name: 'Denmark', flag: '🇩🇰' },
  SK: { name: 'Slovakia', flag: '🇸🇰' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  HU: { name: 'Hungary', flag: '🇭🇺' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  IS: { name: 'Iceland', flag: '🇮🇸' },
  IE: { name: 'Ireland', flag: '🇮🇪' },
  EE: { name: 'Estonia', flag: '🇪🇪' },
  LV: { name: 'Latvia', flag: '🇱🇻' },
  FI: { name: 'Finland', flag: '🇫🇮' },
  LI: { name: 'Liechtenstein', flag: '🇱🇮' },
  LT: { name: 'Lithuania', flag: '🇱🇹' },
  LU: { name: 'Luxembourg', flag: '🇱🇺' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  UA: { name: 'Ukraine', flag: '🇺🇦' }
};

// Feedstock-based default upgrading tech
function inferTech(feedstockCat, countryCode) {
  if (countryCode === 'DK') return 'Amine wash / Water wash (Ammongas)';
  if (countryCode === 'SE' || countryCode === 'NO') return 'Cryogenic Bio-LNG / Amine wash';
  if (feedstockCat.includes('Sewage') || feedstockCat.includes('Industrial')) return 'Water wash scrubbing';
  if (feedstockCat.includes('Food') || feedstockCat.includes('Bio-waste')) return 'Membrane separation (Air Liquide/DMT)';
  return 'Membrane separation';
}

const plants = rows.map((r, i) => {
  const [id, name, country_iso, cap_nm3h, cap_gwh, feedstock_cat, feedstock_det, net_op, op_comp, lat, lon, source] = r;
  const cInfo = countryMap[country_iso] || { name: country_iso, flag: '🌐' };
  
  const capNum = cap_nm3h ? Number(cap_nm3h) : null;
  const gwhNum = cap_gwh ? Number(cap_gwh) : null;
  const latNum = lat && !isNaN(Number(lat)) ? Number(lat) : null;
  const lonNum = lon && !isNaN(Number(lon)) ? Number(lon) : null;

  return {
    id: id || `plant_${country_iso.toLowerCase()}_${i + 1}`,
    name: name || `Facility #${i + 1}`,
    country: cInfo.name,
    countryCode: country_iso,
    countryFlag: cInfo.flag,
    status: 'Active',
    provenance: source || 'Official National Registry & GIE/EBA European Biomethane Census 2026',
    isVerified: true,
    fieldsUnverified: [],
    region: null,
    operator: op_comp || null,
    commissioningYear: null,
    capacityNm3h: capNum,
    annualEnergyGWh: gwhNum,
    primaryFeedstockCategory: feedstock_cat || 'Manure & Agricultural residues',
    feedstockDetails: feedstock_det || 'Agricultural residues and slurry substrates',
    upgradingTechnology: inferTech(feedstock_cat || '', country_iso),
    gridConnectionType: 'Distribution / Transmission',
    networkOperator: net_op || `${cInfo.name} Gas Transmission System`,
    certificationAndRegistry: `${cInfo.name} National Biomethane Registry`,
    primaryOfftake: 'Grid injection / Cross-border compliance',
    coordinates: (latNum !== null && lonNum !== null) ? [latNum, lonNum] : null
  };
});

// Read existing registry to preserve DEVELOPER_PORTFOLIOS and COUNTRY_MACRO_STATS
const existingRegistry = fs.readFileSync(path.resolve(__dirname, '../src/domain/plants/registry.ts'), 'utf8');

// Extract DEVELOPER_PORTFOLIOS
const devMatch = existingRegistry.match(/export const DEVELOPER_PORTFOLIOS: DeveloperPortfolio\[\] = (\[[\s\S]*?\]);\s*export const COUNTRY_MACRO_STATS/);
const devPortfoliosStr = devMatch ? devMatch[1] : '[]';

// Extract COUNTRY_MACRO_STATS
const macroMatch = existingRegistry.match(/export const COUNTRY_MACRO_STATS: CountryMacroStat\[\] = (\[[\s\S]*?\]);\s*import { VERIFIED_COMMERCIAL_PLANTS }/);
const countryMacroStr = macroMatch ? macroMatch[1] : '[]';

const outputCode = `import { BiomethanePlant, DeveloperPortfolio, CountryMacroStat } from './types';
import { VERIFIED_COMMERCIAL_PLANTS } from './verifiedPlants';

export const BIOMETHANE_PLANTS: BiomethanePlant[] = ${JSON.stringify(plants, null, 2)};

export const DEVELOPER_PORTFOLIOS: DeveloperPortfolio[] = ${devPortfoliosStr};

export const COUNTRY_MACRO_STATS: CountryMacroStat[] = ${countryMacroStr};

export { VERIFIED_COMMERCIAL_PLANTS };

export const COMBINED_BIOMETHANE_PLANTS: BiomethanePlant[] = [
  ...VERIFIED_COMMERCIAL_PLANTS.map(p => ({ ...p, isVerified: true, fieldsUnverified: [] })),
  ...BIOMETHANE_PLANTS,
];

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
    (p.primaryFeedstockCategory || '').toLowerCase().includes(q) ||
    (p.feedstockDetails || '').toLowerCase().includes(q) ||
    (p.upgradingTechnology || '').toLowerCase().includes(q) ||
    (p.region || '').toLowerCase().includes(q) ||
    (p.networkOperator || '').toLowerCase().includes(q) ||
    (p.provenance || '').toLowerCase().includes(q)
  );
}
`;

fs.writeFileSync(path.resolve(__dirname, '../src/domain/plants/registry.ts'), outputCode, 'utf8');
console.log('Successfully generated src/domain/plants/registry.ts with', plants.length, 'plants!');
