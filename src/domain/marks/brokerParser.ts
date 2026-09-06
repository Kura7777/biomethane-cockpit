import { MARKETS } from '../markets/registry';
import { UnitOfAccount } from '../markets/types';

export interface ParsedBrokerMark {
  id: string;
  rawLine: string;
  marketId: string | null;
  marketName: string;
  productRaw: string;
  midPrice: number | null;
  bid: number | null;
  ask: number | null;
  unit: UnitOfAccount | string;
  assessmentDate: string; // YYYY-MM-DD
  brokerSource: string;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export interface BrokerParseResult {
  marks: ParsedBrokerMark[];
  errors: string[];
  warnings: string[];
  brokerDetected: string;
  totalLines: number;
  validCount: number;
}

// Canonical aliases for mapping product names to active market IDs
const PRODUCT_ALIAS_MAP: Record<string, string> = {
  // Germany THG
  'THG': 'DE_THG',
  'DE_THG': 'DE_THG',
  'GERMAN THG': 'DE_THG',
  'GERMANY THG': 'DE_THG',
  'THG QUOTE': 'DE_THG',
  'THG-QUOTE': 'DE_THG',
  'THG BIOMETHANE': 'DE_THG',

  // Netherlands ERE / HBE
  'ERE': 'NL_ERE',
  'NL_ERE': 'NL_ERE',
  'HBE': 'NL_ERE',
  'HBE-G': 'NL_ERE',
  'HBE-O': 'NL_ERE',
  'DUTCH ERE': 'NL_ERE',
  'DUTCH HBE': 'NL_ERE',
  'NETHERLANDS ERE': 'NL_ERE',

  // France CPB / TIRERT
  'CPB': 'FR_CPB',
  'FR_CPB': 'FR_CPB',
  'TIRERT': 'FR_CPB',
  'TIRUERT': 'FR_CPB',
  'FRANCE CPB': 'FR_CPB',
  'FRENCH CPB': 'FR_CPB',
  'FRANCE BIOMETHANE': 'FR_CPB',

  // UK RTFO / RTFC
  'RTFO': 'UK_RTFO',
  'RTFC': 'UK_RTFO',
  'DRTFC': 'UK_RTFO',
  'UK_RTFO': 'UK_RTFO',
  'UK RTFO': 'UK_RTFO',
  'UK RTFC': 'UK_RTFO',
  'DEVELOPMENT RTFC': 'UK_RTFO',

  // UK RGGO / GGCS
  'RGGO': 'UK_RGGO',
  'GGCS': 'UK_RGGO',
  'UK_RGGO': 'UK_RGGO',
  'UK RGGO': 'UK_RGGO',
  'GREEN GAS': 'UK_RGGO',
  'GREEN GAS CERTIFICATION': 'UK_RGGO',

  // FuelEU Maritime (Canonical ID in MARKETS registry: FUELEU)
  'FUELEU': 'FUELEU',
  'FUELEU_MARITIME': 'FUELEU',
  'FUEL EU': 'FUELEU',
  'MARITIME': 'FUELEU',
  'FUELEU DEFICIT': 'FUELEU',

  // Italy CIC
  'CIC': 'IT_CIC',
  'IT_CIC': 'IT_CIC',
  'ITALY CIC': 'IT_CIC',
  'ITALIAN CIC': 'IT_CIC',

  // Guarantees of Origin
  'DE_GO': 'DE_GO',
  'DE GO': 'DE_GO',
  'GERMAN GO': 'DE_GO',
  'GERMANY GO': 'DE_GO',

  'NL_GO': 'NL_GO',
  'NL GO': 'NL_GO',
  'DUTCH GO': 'NL_GO',
  'NETHERLANDS GO': 'NL_GO',

  'FR_GO': 'FR_GO',
  'FR GO': 'FR_GO',
  'FRENCH GO': 'FR_GO',
  'FRANCE GO': 'FR_GO',

  'VOL_SCOPE1': 'VOL_SCOPE1',
  'VOLUNTARY': 'VOL_SCOPE1',
  'SCOPE 1': 'VOL_SCOPE1',
  'SCOPE 1 GO': 'VOL_SCOPE1',

  // Natural Gas TTF Benchmark
  'TTF': 'GAS_TTF',
  'TTF MONTH+1': 'GAS_TTF',
  'TTF M+1': 'GAS_TTF',
  'DUTCH TTF': 'GAS_TTF',
  'GAS INDEX': 'GAS_TTF',
};

/**
 * Standard default units per market
 */
const DEFAULT_UNITS: Record<string, string> = {
  DE_THG: 'EUR_PER_TCO2E',
  NL_ERE: 'EUR_PER_KG_CO2E',
  FR_CPB: 'EUR_PER_MWH',
  UK_RTFO: 'GBP_PER_DRTFC',
  UK_RGGO: 'EUR_PER_MWH',
  FUELEU: 'EUR_PER_TCO2E_DEFICIT',
  FUELEU_MARITIME: 'EUR_PER_TCO2E_DEFICIT',
  IT_CIC: 'EUR_PER_CIC',
  DE_GO: 'EUR_PER_MWH',
  NL_GO: 'EUR_PER_MWH',
  FR_GO: 'EUR_PER_MWH',
  VOL_SCOPE1: 'EUR_PER_MWH',
  GAS_TTF: 'EUR_PER_MWH',
};

/**
 * Institutional Broker Run Sample Data for testing and 1-click Trader runs
 */
export const SAMPLE_BROKER_RUNS: Record<string, { title: string; source: string; content: string }> = {
  ARGUS: {
    title: 'Argus Media Daily Biofuels & European Biomethane Run',
    source: 'Argus Media',
    content: `Market,Mid Price,Bid,Ask,Unit,Assessment Date,Broker Source
THG,385.00,380.00,390.00,EUR/tCO2e,2026-09-05,Argus Media
ERE,0.365,0.355,0.375,EUR/kgCO2e,2026-09-05,Argus Media
CPB,76.50,74.00,79.00,EUR/MWh,2026-09-05,Argus Media
RTFC,0.225,0.218,0.232,GBP/dRTFC,2026-09-05,Argus Media
RGGO,52.00,50.00,54.00,EUR/MWh,2026-09-05,Argus Media
FuelEU,295.00,285.00,305.00,EUR/tCO2e,2026-09-05,Argus Media
TTF,38.40,38.15,38.65,EUR/MWh,2026-09-05,Argus Media`,
  },
  ICIS: {
    title: 'ICIS European Renewable Gas & Biomethane Daily Marks',
    source: 'ICIS',
    content: `Product\tMid\tBid\tOffer\tUnit\tDate\tBroker
German THG\t382.50\t378.00\t387.00\tEUR/tCO2e\t2026-09-05\tICIS
Dutch ERE HBE\t0.360\t0.350\t0.370\tEUR/kgCO2e\t2026-09-05\tICIS
France Biomethane CPB\t77.00\t75.00\t79.00\tEUR/MWh\t2026-09-05\tICIS
UK RTFO dRTFC\t0.222\t0.215\t0.229\tGBP/dRTFC\t2026-09-05\tICIS
UK Green Gas RGGO\t51.50\t49.50\t53.50\tEUR/MWh\t2026-09-05\tICIS
Italy CIC\t320.00\t310.00\t330.00\tEUR/CIC\t2026-09-05\tICIS
DE GO Biomethane\t28.50\t26.50\t30.50\tEUR/MWh\t2026-09-05\tICIS`,
  },
  STX: {
    title: 'STX Commodities Environmental Markets Trading Sheet',
    source: 'STX Commodities',
    content: `DE_THG,388.00,382.50,393.50,EUR/tCO2e,2026-09-05,STX Commodities
NL_ERE,0.368,0.358,0.378,EUR/kgCO2e,2026-09-05,STX Commodities
FR_CPB,78.20,76.00,80.40,EUR/MWh,2026-09-05,STX Commodities
UK_RTFO,0.228,0.220,0.236,GBP/dRTFC,2026-09-05,STX Commodities
UK_RGGO,53.50,51.00,56.00,EUR/MWh,2026-09-05,STX Commodities
FUELEU_MARITIME,298.00,288.00,308.00,EUR/tCO2e,2026-09-05,STX Commodities
NL_GO,31.00,29.00,33.00,EUR/MWh,2026-09-05,STX Commodities`,
  },
  ACT: {
    title: 'ACT Commodities Compliance & Biomethane Certificates Run',
    source: 'ACT Commodities',
    content: `THG Quote: 384.50 | Bid: 380.00 | Ask: 389.00 | EUR/tCO2e | 2026-09-05 | ACT Commodities
Dutch HBE ERE: 0.362 | Bid: 0.352 | Ask: 0.372 | EUR/kgCO2e | 2026-09-05 | ACT Commodities
France CPB: 75.80 | Bid: 73.50 | Ask: 78.10 | EUR/MWh | 2026-09-05 | ACT Commodities
UK RTFO dRTFC: 0.224 | Bid: 0.216 | Ask: 0.232 | GBP/dRTFC | 2026-09-05 | ACT Commodities
UK Green Gas RGGO: 52.80 | Bid: 50.50 | Ask: 55.10 | EUR/MWh | 2026-09-05 | ACT Commodities
FuelEU Compliance: 292.00 | Bid: 280.00 | Ask: 304.00 | EUR/tCO2e | 2026-09-05 | ACT Commodities
Dutch TTF Gas: 38.60 | Bid: 38.30 | Ask: 38.90 | EUR/MWh | 2026-09-05 | ACT Commodities`,
  },
};

/**
 * Clean and parse numeric strings with optional currency symbols, commas, or percent signs.
 * Robust against Excel/CSV quotes, European comma decimals, and thousand separators.
 */
export function cleanNumber(str: string | undefined | null): number | null {
  if (!str) return null;
  let s = str.trim();
  // Strip enclosing or internal quotes
  s = s.replace(/['"]/g, '').trim();
  // Remove currency signs, percentage signs
  s = s.replace(/[€£$\u00A5\u20BD%]/g, '').trim();
  // Strip trailing or leading units/words e.g. "EUR/MWh", "EUR", "GBP", "tCO2e", etc.
  s = s.replace(/(?:EUR|GBP|USD|CHF|MWh|tCO2e|kgCO2e|CIC|dRTFC|\/MWh|\/tCO2e|\/kgCO2e|\/dRTFC)/gi, '').trim();
  // Remove spaces
  s = s.replace(/\s+/g, '');
  if (!s) return null;

  // Handle number formats:
  // Case A: Both '.' and ',' present
  if (s.includes('.') && s.includes(',')) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastComma > lastDot) {
      // European format: 1.234,56 -> remove dots, replace comma with dot
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Anglo format: 1,234.56 -> remove commas
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // Only comma present:
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount > 1) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(',', '.');
    }
  }

  const num = Number(s);
  return isNaN(num) ? null : num;
}

/**
 * Normalize product string and match to active market ID.
 * Prioritizes exact matches, then descending alias length matches to avoid false positives.
 */
export function resolveMarketId(productStr: string): { marketId: string | null; marketName: string } {
  const raw = productStr.trim().replace(/^['"]+|['"]+$/g, '');
  const norm = raw.toUpperCase().replace(/[\-_]/g, ' ').replace(/\s+/g, ' ');

  // 1. Direct ID match against MARKETS registry
  const direct = MARKETS.find(m => m.id.toUpperCase() === raw.toUpperCase());
  if (direct) {
    return { marketId: direct.id, marketName: direct.name };
  }

  // 2. Exact match in PRODUCT_ALIAS_MAP
  for (const [key, marketId] of Object.entries(PRODUCT_ALIAS_MAP)) {
    const normKey = key.toUpperCase().replace(/[\-_]/g, ' ').replace(/\s+/g, ' ');
    if (norm === normKey) {
      const matched = MARKETS.find(m => m.id === marketId);
      return {
        marketId,
        marketName: marketId === 'GAS_TTF' ? 'TTF Natural Gas Index' : (matched?.name || marketId),
      };
    }
  }

  // 3. Substring matching: sorted by descending alias length
  const sortedAliases = Object.entries(PRODUCT_ALIAS_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [key, marketId] of sortedAliases) {
    const normKey = key.toUpperCase().replace(/[\-_]/g, ' ').replace(/\s+/g, ' ');
    if (norm.includes(normKey)) {
      const matched = MARKETS.find(m => m.id === marketId);
      return {
        marketId,
        marketName: marketId === 'GAS_TTF' ? 'TTF Natural Gas Index' : (matched?.name || marketId),
      };
    }
  }

  return { marketId: null, marketName: productStr.trim() };
}

/**
 * Normalize date string to ISO YYYY-MM-DD.
 */
export function normalizeDate(dateStr: string | undefined | null): string {
  if (!dateStr || !dateStr.trim()) {
    return new Date().toISOString().slice(0, 10);
  }

  const trimmed = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Parse institutional broker run sheet text (CSV, TSV, pipe, or colon delimited).
 */
export function parseBrokerRunText(
  rawText: string,
  defaultBroker: string = 'Argus Media',
  defaultDate?: string
): BrokerParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const marks: ParsedBrokerMark[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const effectiveDate = defaultDate ? normalizeDate(defaultDate) : new Date().toISOString().slice(0, 10);
  let brokerDetected = defaultBroker;

  if (lines.length === 0) {
    return {
      marks: [],
      errors: ['Input is empty. Please paste or upload tabular broker run data.'],
      warnings: [],
      brokerDetected,
      totalLines: 0,
      validCount: 0,
    };
  }

  // Auto-detect broker source if present in content
  const lowerText = rawText.toLowerCase();
  if (lowerText.includes('argus')) brokerDetected = 'Argus Media';
  else if (lowerText.includes('icis')) brokerDetected = 'ICIS';
  else if (lowerText.includes('stx')) brokerDetected = 'STX Commodities';
  else if (lowerText.includes('act')) brokerDetected = 'ACT Commodities';
  else if (lowerText.includes('marex')) brokerDetected = 'Marex Spectron';
  else if (lowerText.includes('tradition')) brokerDetected = 'Tradition';

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Skip table header lines
    const lowerLine = line.toLowerCase();
    if (
      (lowerLine.includes('market') || lowerLine.includes('product')) &&
      (lowerLine.includes('price') || lowerLine.includes('mid') || lowerLine.includes('bid'))
    ) {
      continue;
    }

    // Determine delimiter: comma, tab, pipe, semicolon
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes(';') && !line.includes(',')) {
      parts = line.split(';');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else if (line.includes(':')) {
      // Loose colon-delimited format e.g. "THG: 380 Mid | 370 Bid | 390 Ask"
      parts = line.split(':');
    } else {
      // Whitespace delimited
      parts = line.split(/\s{2,}/);
    }

    parts = parts
      .map(p => p.trim().replace(/^['"]+|['"]+$/g, ''))
      .filter(p => p.length > 0);

    if (parts.length === 0) continue;

    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Fields to extract
    let productRaw = '';
    let midVal: number | null = null;
    let bidVal: number | null = null;
    let askVal: number | null = null;
    let unitStr: string = '';
    let dateStr: string = effectiveDate;
    let sourceStr: string = brokerDetected;

    // Check if parts[0] contains a colon e.g. "THG Quote: 384.50" or "THG: 385.00"
    if (parts.length >= 1) {
      productRaw = parts[0];
      if (productRaw.includes(':')) {
        const colonIdx = productRaw.indexOf(':');
        const beforeColon = productRaw.slice(0, colonIdx).trim();
        const afterColon = productRaw.slice(colonIdx + 1).trim();
        const potentialPrice = cleanNumber(afterColon);
        if (potentialPrice !== null) {
          productRaw = beforeColon;
          midVal = potentialPrice;
        }
      }
    }

    // Pattern 1: Standard Tabular Columns
    // [0]=Product, [1]=Mid, [2]=Bid, [3]=Ask, [4]=Unit, [5]=Date, [6]=Source
    if (parts.length >= 2) {
      for (let pIdx = 1; pIdx < parts.length; pIdx++) {
        const item = parts[pIdx];
        const itemLower = item.toLowerCase();

        if (item.includes('/') && !/\d{2,4}\/\d{1,2}\/\d{2,4}/.test(item)) {
          const slashParts = item.split('/');
          if (slashParts.length === 2) {
            const b = cleanNumber(slashParts[0]);
            const a = cleanNumber(slashParts[1]);
            if (b !== null && a !== null) {
              bidVal = b;
              askVal = a;
              midVal = Number(((b + a) / 2).toFixed(3));
              continue;
            }
          }
        } else if (itemLower.startsWith('mid') || itemLower.includes('mid:')) {
          midVal = cleanNumber(item.replace(/mid:?/i, ''));
        } else if (itemLower.startsWith('bid') || itemLower.includes('bid:')) {
          bidVal = cleanNumber(item.replace(/bid:?/i, ''));
        } else if (itemLower.startsWith('ask') || itemLower.startsWith('offer') || itemLower.includes('ask:') || itemLower.includes('offer:')) {
          askVal = cleanNumber(item.replace(/(ask|offer):?/i, ''));
        } else if (itemLower.includes('eur') || itemLower.includes('gbp') || itemLower.includes('mwh') || itemLower.includes('tco2') || itemLower.includes('cic')) {
          unitStr = item;
        } else if (/\d{4}[-/.]\d{2}[-/.]\d{2}/.test(item) || /\d{2}[-/.]\d{2}[-/.]\d{4}/.test(item)) {
          dateStr = normalizeDate(item);
        } else if (cleanNumber(item) !== null) {
          // Positional number assignment
          if (midVal === null && pIdx === 1) midVal = cleanNumber(item);
          else if (bidVal === null && pIdx === 2) bidVal = cleanNumber(item);
          else if (askVal === null && pIdx === 3) askVal = cleanNumber(item);
        } else if (item.length > 2) {
          sourceStr = item;
        }
      }
    }

    // Resolve Market
    const { marketId, marketName } = resolveMarketId(productRaw);
    if (!marketId) {
      validationErrors.push(`Unrecognized market product: "${productRaw}"`);
    }

    // Fallback Mid / Bid / Ask synthesis
    if (midVal === null && bidVal !== null && askVal !== null) {
      midVal = Number(((bidVal + askVal) / 2).toFixed(3));
    } else if (midVal !== null && bidVal === null && askVal === null) {
      // 1.5% indicative half-spread if trader only pasted mid
      const spreadFraction = 0.015;
      bidVal = Number((midVal * (1 - spreadFraction)).toFixed(3));
      askVal = Number((midVal * (1 + spreadFraction)).toFixed(3));
      validationWarnings.push('Bid/Ask synthesized from Mid with standard 1.5% half-spread');
    }

    if (midVal === null) {
      validationErrors.push('Missing mid price');
    }

    // Validate bid vs ask
    if (bidVal !== null && askVal !== null && bidVal > askVal) {
      validationErrors.push(`Inverted spread: Bid (${bidVal}) > Ask (${askVal})`);
    }

    // Fallback Unit
    if (!unitStr && marketId) {
      unitStr = DEFAULT_UNITS[marketId] || 'EUR_PER_MWH';
    }

    const isValid = validationErrors.length === 0;

    marks.push({
      id: `BRK-${idx + 1}-${marketId || 'UNKNOWN'}`,
      rawLine: line,
      marketId,
      marketName,
      productRaw,
      midPrice: midVal,
      bid: bidVal,
      ask: askVal,
      unit: unitStr,
      assessmentDate: dateStr,
      brokerSource: sourceStr || brokerDetected,
      isValid,
      validationErrors,
      validationWarnings,
    });
  }

  const validCount = marks.filter(m => m.isValid).length;

  return {
    marks,
    errors,
    warnings,
    brokerDetected,
    totalLines: lines.length,
    validCount,
  };
}
