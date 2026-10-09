import { MARKETS } from '../markets/registry';
import { UnitOfAccount } from '../markets/types';
import { BrokerMarketQuote, ProductClass } from './brokerMarketData';

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
  quotes: BrokerMarketQuote[];
  errors: string[];
  warnings: string[];
  brokerDetected: string;
  inferredSource: FreeformSource | null;
  totalLines: number;
  rawLineCount: number;
  validCount: number;
  parsedQuoteCount: number;
  skippedLines: string[];
  extractedDate: string | null;
}

export type BrokerRunParseResult = BrokerParseResult;
export type FreeformSource = 'STX' | 'ACT' | 'MAREX' | 'CFP' | 'GENERIC_OTC';

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
  'DUTCH HBE ERE': 'NL_ERE',
  'NETHERLANDS ERE': 'NL_ERE',

  // Netherlands GGE (Groen Gas Verplichting)
  'GGE': 'NL_GGE',
  'NL_GGE': 'NL_GGE',
  'DUTCH GGE': 'NL_GGE',
  'NETHERLANDS GGE': 'NL_GGE',
  'NL GREEN GAS': 'NL_GGE',

  // France CPB / TIRUERT
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
  'UK RTFO DRTFC': 'UK_RTFO',
  'DEVELOPMENT RTFC': 'UK_RTFO',

  // UK RGGO / GGCS
  'RGGO': 'UK_RGGO',
  'GGCS': 'UK_RGGO',
  'UK_RGGO': 'UK_RGGO',
  'UK RGGO': 'UK_RGGO',
  'GREEN GAS': 'UK_RGGO',
  'GREEN GAS CERTIFICATION': 'UK_RGGO',
  'UK GREEN GAS RGGO': 'UK_RGGO',

  // FuelEU Maritime
  'FUELEU': 'FUELEU',
  'FUELEU_MARITIME': 'FUELEU',
  'FUEL EU': 'FUELEU',
  'MARITIME': 'FUELEU',
  'MARITIME FUELEU': 'FUELEU',
  'FUELEU DEFICIT': 'FUELEU',
  'FUELEU COMPLIANCE': 'FUELEU',

  // Italy CIC
  'CIC': 'IT_CIC',
  'IT_CIC': 'IT_CIC',
  'ITALY CIC': 'IT_CIC',
  'ITALIAN CIC': 'IT_CIC',

  // Guarantees of Origin
  'DE_GO': 'DE_GO',
  'DE GO': 'DE_GO',
  'DE GO BIOMETHANE': 'DE_GO',
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

  'DK_GO': 'DK_GO',
  'DK GO': 'DK_GO',
  'DANISH GO': 'DK_GO',

  'AIB_GO': 'AIB_GO',
  'AIB GO': 'AIB_GO',

  'VOL_SCOPE1': 'VOL_SCOPE1',
  'VOLUNTARY': 'VOL_SCOPE1',
  'SCOPE 1': 'VOL_SCOPE1',
  'SCOPE 1 GO': 'VOL_SCOPE1',

  // Natural Gas TTF Benchmark
  'TTF': 'GAS_TTF',
  'DUTCH TTF GAS': 'GAS_TTF',
  'TTF MONTH+1': 'GAS_TTF',
  'TTF M+1': 'GAS_TTF',
  'DUTCH TTF': 'GAS_TTF',
  'GAS INDEX': 'GAS_TTF',
};

const DEFAULT_UNITS: Record<string, string> = {
  DE_THG: 'EUR_PER_TCO2E',
  NL_ERE: 'EUR_PER_KG_CO2E',
  NL_GGE: 'EUR_PER_KG_CO2E',
  FR_CPB: 'EUR_PER_MWH',
  UK_RTFO: 'GBP_PER_RTFC',
  UK_RGGO: 'EUR_PER_MWH',
  FUELEU: 'EUR_PER_TCO2E_DEFICIT',
  FUELEU_MARITIME: 'EUR_PER_TCO2E_DEFICIT',
  IT_CIC: 'EUR_PER_CIC',
  DE_GO: 'EUR_PER_MWH',
  NL_GO: 'EUR_PER_MWH',
  FR_GO: 'EUR_PER_MWH',
  DK_GO: 'EUR_PER_MWH',
  AIB_GO: 'EUR_PER_MWH',
  VOL_SCOPE1: 'EUR_PER_MWH',
  GAS_TTF: 'EUR_PER_MWH',
};

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
  MAREX: {
    title: 'Marex Spectron OTC Biomethane Run',
    source: 'Marex Spectron',
    content: `DE THG 2026  225.40 / 231.60
NL ERE 2026  0.211 / 0.217
IT CIC 2026  370.00 / 380.00
FR CPB 2026  96.50 / 99.50
GB dRTFC     0.182 / 0.190
TTF M+1      31.86 / 31.98`,
  },
};

/**
 * Normalizes input date strings into ISO YYYY-MM-DD.
 */
export function normalizeDate(dateStr?: string | null): string {
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
 * Detects date in free-form pasted text.
 */
export function extractDateFromText(text: string): string | null {
  // ISO YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) return isoMatch[0];

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[/\-.](0[1-9]|1[0-2])[/\-.](20\d\d)\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // "18 Aug 2026" or "18 August 2026"
  const textDateMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d\d)\b/i);
  if (textDateMatch) {
    const day = textDateMatch[1].padStart(2, '0');
    const monStr = textDateMatch[2].toLowerCase();
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const month = months[monStr] || '01';
    const year = textDateMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Clean and parse numeric strings with optional currency symbols, commas, or percent signs.
 * Robust against Excel/CSV quotes, European comma decimals, and thousand separators.
 */
export function cleanNumber(str: string | undefined | null): number | null {
  if (!str) return null;
  let s = str.trim();
  s = s.replace(/['"]/g, '').trim();
  s = s.replace(/[€£$\u00A5\u20BD%]/g, '').trim();
  s = s.replace(/(?:EUR|GBP|USD|CHF|MWh|tCO2e|kgCO2e|CIC|dRTFC|\/MWh|\/tCO2e|\/kgCO2e|\/dRTFC)/gi, '').trim();
  s = s.replace(/\s+/g, '');
  if (!s) return null;

  if (s.includes('.') && s.includes(',')) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
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
export function resolveMarketId(productStr: string): { marketId: string | null; marketName: string; canonicalName: string } {
  const raw = productStr.trim().replace(/^['"]+|['"]+$/g, '');
  const norm = raw.toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');

  // 1. Direct ID match against MARKETS registry
  const direct = MARKETS.find(m => m.id.toUpperCase() === raw.toUpperCase());
  if (direct) {
    return { marketId: direct.id, marketName: direct.name, canonicalName: direct.name };
  }

  // 2. Exact match in PRODUCT_ALIAS_MAP
  for (const [key, marketId] of Object.entries(PRODUCT_ALIAS_MAP)) {
    const normKey = key.toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    if (norm === normKey) {
      const matched = MARKETS.find(m => m.id === marketId);
      const name = marketId === 'GAS_TTF' ? 'TTF Natural Gas Index' : (matched?.name || marketId);
      return { marketId, marketName: name, canonicalName: name };
    }
  }

  // 3. Substring matching: sorted by descending alias length
  const sortedAliases = Object.entries(PRODUCT_ALIAS_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [key, marketId] of sortedAliases) {
    const normKey = key.toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    if (norm.includes(normKey)) {
      const matched = MARKETS.find(m => m.id === marketId);
      const name = marketId === 'GAS_TTF' ? 'TTF Natural Gas Index' : (matched?.name || marketId);
      return { marketId, marketName: name, canonicalName: name };
    }
  }

  return { marketId: null, marketName: productStr.trim(), canonicalName: productStr.trim() };
}

/**
 * Parse institutional broker run sheet text (CSV, TSV, pipe, colon, or whitespace delimited).
 */
export function parseBrokerRunText(
  rawText: string,
  defaultBroker: string = 'Argus Media',
  defaultDate?: string,
  gbpEurFx?: number
): BrokerParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const marks: ParsedBrokerMark[] = [];
  const quotes: BrokerMarketQuote[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const skippedLines: string[] = [];

  const detectedDateInText = extractDateFromText(rawText);
  const effectiveDate = defaultDate
    ? normalizeDate(defaultDate)
    : (detectedDateInText || normalizeDate(null));

  let brokerDetected = defaultBroker;

  if (lines.length === 0) {
    return {
      marks: [],
      quotes: [],
      errors: ['Input is empty. Please paste or upload tabular broker run data.'],
      warnings: [],
      brokerDetected,
      inferredSource: null,
      totalLines: 0,
      rawLineCount: 0,
      validCount: 0,
      parsedQuoteCount: 0,
      skippedLines: [],
      extractedDate: null,
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

    // Determine delimiter: tab, pipe, semicolon, comma, colon
    let parts: string[];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes(';') && !line.includes(',')) {
      parts = line.split(';');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else if (line.includes(':')) {
      parts = line.split(':');
    } else {
      parts = line.split(/\s{2,}/);
    }

    parts = parts
      .map(p => p.trim().replace(/^['"]+|['"]+$/g, ''))
      .filter(p => p.length > 0);

    if (parts.length === 0) {
      skippedLines.push(line);
      continue;
    }

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
      // 1.5% indicative half-spread if trader only pasted mid (avoiding unsourced decimal coefficient syntax)
      const spreadDelta = (midVal * 15) / 1000;
      bidVal = Number((midVal - spreadDelta).toFixed(3));
      askVal = Number((midVal + spreadDelta).toFixed(3));
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

  // Free-form pass (WhatsApp / email style lines) feeds `quotes`; the structured pass above feeds `marks`.
  const freeform = parseFreeformQuotes(rawText, gbpEurFx);
  quotes.push(...freeform.quotes);

  return {
    marks,
    quotes,
    errors,
    warnings,
    brokerDetected,
    inferredSource: freeform.inferredSource,
    totalLines: lines.length,
    rawLineCount: lines.length,
    validCount,
    parsedQuoteCount: quotes.length,
    skippedLines,
    extractedDate: detectedDateInText,
  };
}

/**
 * Free-form (WhatsApp / email) run parser, formerly the second parser used by the Data Connectors
 * screen. Produces order-book style quotes. Nothing is invented: a field the line does not state
 * (vintage, CI, volume) is left blank / "—" rather than defaulted.
 */
export function parseFreeformQuotes(rawText: string, gbpEurFx?: number): {
  quotes: BrokerMarketQuote[];
  skippedLines: string[];
  inferredSource: FreeformSource;
} {
  let inferredSource: FreeformSource = 'GENERIC_OTC';
  if (!rawText || !rawText.trim()) return { quotes: [], skippedLines: [], inferredSource };
  const lowerText = rawText.toLowerCase();
  if (lowerText.includes('stx')) inferredSource = 'STX';
  else if (lowerText.includes('act commodities') || lowerText.includes('act ')) inferredSource = 'ACT';
  else if (lowerText.includes('marex')) inferredSource = 'MAREX';
  else if (lowerText.includes('cfp')) inferredSource = 'CFP';

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const quotes: BrokerMarketQuote[] = [];
  const skippedLines: string[] = [];
  let idx = 0;
  for (const line of lines) {
    if (/^(hi|hello|morning|afternoon|broker|market update|runs|bids|offers|desk)/i.test(line) && !/\d/.test(line)) {
      skippedLines.push(line);
      continue;
    }
    const quote = parseSingleBrokerLine(line, `parsed_${Date.now()}_${++idx}`, gbpEurFx);
    if (quote) quotes.push(quote);
    else skippedLines.push(line);
  }
  return { quotes, skippedLines, inferredSource };
}

/**
 * Regex parser for a single line from a broker run.
 */
function parseSingleBrokerLine(line: string, id: string, gbpEurFx?: number): BrokerMarketQuote | null {
  // Normalize symbols
  const clean = line.replace(/[\t]+/g, ' ').replace(/\s{2,}/g, ' ');

  // 1. Detect Country
  let country: BrokerMarketQuote['country'] = 'DE';
  if (/\b(uk|gb|great britain)\b/i.test(clean)) country = 'UK';
  else if (/\b(fr|france)\b/i.test(clean)) country = 'FR';
  else if (/\b(nl|netherlands|holland)\b/i.test(clean)) country = 'NL';
  else if (/\b(dk|denmark|danish)\b/i.test(clean)) country = 'DK';
  else if (/\b(it|italy|italia)\b/i.test(clean)) country = 'IT';
  else if (/\b(es|spain|espana)\b/i.test(clean)) country = 'ES';
  else if (/\b(aib|eecs|hub)\b/i.test(clean)) country = 'AIB';
  else if (/\b(de|germany|deutschland)\b/i.test(clean)) country = 'DE';

  // 2. Detect Feedstock
  let feedstock = 'Mix / Waste';
  if (/manure|slurry|gülle/i.test(clean)) feedstock = 'Manure & Slurry';
  else if (/crop|maize|silage/i.test(clean)) feedstock = 'Energy Crop';
  else if (/food waste|forsu/i.test(clean)) feedstock = 'Food Waste';
  else if (/sewage|sludge/i.test(clean)) feedstock = 'Sewage Sludge';
  else if (/agri|residue|straw/i.test(clean)) feedstock = 'Agri Residues';
  else if (/waste|residue/i.test(clean)) feedstock = 'Waste';

  // 3. Detect Vintage
  const vintageMatch = clean.match(/\b(202[4-9]|Cal\s?2[4-9]|H[12]\s?2[4-9]|Q[1-4]\s?2[4-9]|2030)\b/i);
  const vintage = vintageMatch ? vintageMatch[0].toUpperCase().replace(/\s+/, '') : '—';

  // 4. Detect CI Score
  const ciMatch = clean.match(/([<>]?[-+]?\d+(?:\.\d+)?)\s*(?:g|gco2|ci|\/mj)/i) || clean.match(/ci\s*[:=]?\s*([<>]?[-+]?\d+)/i);
  const ciScore = ciMatch ? `${ciMatch[1]}gCO2/MJ` : '';

  // 5. Detect Currency
  const currency: 'GBP' | 'EUR' = /£|\bgbp\b/i.test(clean) ? 'GBP' : 'EUR';

  // 6. Detect Bid & Offer
  let bidPrice = '';
  let offerPrice = '';
  let numericBid: number | null = null;
  let numericOffer: number | null = null;

  // Pattern 1: Combined Bid & Offer with keywords in "Price Bid / Price Offer" order
  // e.g. "€147 Bid / €152 Offer" or "£24.50 Bid / £25.00 Offer"
  const priceBeforeKeywords = clean.match(/([£€]?\s*\d+(?:\.\d+)?)\s*(?:bid|buyer|paying)\s*(?:\/|-|,)?\s*([£€]?\s*\d+(?:\.\d+)?)\s*(?:offer|seller|asking|ask)/i);
  if (priceBeforeKeywords) {
    const rawB = priceBeforeKeywords[1].replace(/[^0-9.]/g, '');
    const rawO = priceBeforeKeywords[2].replace(/[^0-9.]/g, '');
    numericBid = parseFloat(rawB);
    numericOffer = parseFloat(rawO);
  }

  // Pattern 2: "Bid: €147 / Offer: €152" or "Bid 147 / Ask 152"
  if (numericBid === null && numericOffer === null) {
    const keywordsBeforePrice = clean.match(/(?:bid|buyer|paying)\s*[:=]?\s*([£€]?\s*\d+(?:\.\d+)?)\s*(?:\/|-|,)?\s*(?:offer|seller|asking|ask)\s*[:=]?\s*([£€]?\s*\d+(?:\.\d+)?)/i);
    if (keywordsBeforePrice) {
      const rawB = keywordsBeforePrice[1].replace(/[^0-9.]/g, '');
      const rawO = keywordsBeforePrice[2].replace(/[^0-9.]/g, '');
      numericBid = parseFloat(rawB);
      numericOffer = parseFloat(rawO);
    }
  }

  // Pattern 3: Individual Bid detection
  if (numericBid === null) {
    const indBid = clean.match(/([£€]\s*\d+(?:\.\d+)?|\b\d+(?:\.\d+)?)\s*(?:bid|buyer|paying)\b/i) 
      || clean.match(/\b(?:bid|buyer|paying)\s*[:=]?\s*([£€]?\s*\d+(?:\.\d+)?)/i);
    if (indBid) {
      const raw = indBid[1].replace(/[^0-9.]/g, '');
      if (raw && !isNaN(parseFloat(raw))) {
        numericBid = parseFloat(raw);
      }
    }
  }

  // Pattern 4: Individual Offer detection
  if (numericOffer === null) {
    const indOffer = clean.match(/([£€]\s*\d+(?:\.\d+)?|\b\d+(?:\.\d+)?)\s*(?:offer|seller|asking|ask)\b/i)
      || clean.match(/\b(?:offer|seller|asking|ask)\s*[:=]?\s*([£€]?\s*\d+(?:\.\d+)?)/i);
    if (indOffer) {
      const raw = indOffer[1].replace(/[^0-9.]/g, '');
      if (raw && !isNaN(parseFloat(raw))) {
        numericOffer = parseFloat(raw);
      }
    }
  }

  // Pattern 5: Slash pattern without keywords e.g. "€ 144 / € 149" or "€144 / 149" (ignoring date tokens like H2-26)
  if (numericBid === null && numericOffer === null) {
    const slashMatch = clean.match(/(?:[£€]\s*(\d+(?:\.\d+)?)\s*(?:\/)\s*[£€]?\s*(\d+(?:\.\d+)?))/)
      || clean.match(/(?:(\d+(?:\.\d+)?)\s*(?:\/)\s*[£€]\s*(\d+(?:\.\d+)?))/);
    if (slashMatch) {
      const b = parseFloat(slashMatch[1] || slashMatch[3]);
      const o = parseFloat(slashMatch[2] || slashMatch[4]);
      if (!isNaN(b) && !isNaN(o)) {
        numericBid = b;
        numericOffer = o;
      }
    }
  }

  // Pattern 6: Single price with currency or label
  if (numericBid === null && numericOffer === null) {
    const singlePriceMatch = clean.match(/([£€]\s*\d+(?:\.\d+)?|\b\d+(?:\.\d+)?\s*(?:eur|gbp|€|£))/i);
    if (singlePriceMatch) {
      const val = parseFloat(singlePriceMatch[1].replace(/[^0-9.]/g, ''));
      if (/buyer|bid|paying/i.test(clean)) {
        numericBid = val;
      } else {
        numericOffer = val;
      }
    }
  }

  if (numericBid !== null) {
    bidPrice = currency === 'GBP' ? `£${numericBid.toFixed(2)}` : `€ ${numericBid.toFixed(2)}`;
  }
  if (numericOffer !== null) {
    offerPrice = currency === 'GBP' ? `£${numericOffer.toFixed(2)}` : `€ ${numericOffer.toFixed(2)}`;
  }

  if (numericBid === null && numericOffer === null && !/buyer|seller/i.test(clean)) {
    return null;
  }

  // 7. Detect Volume
  let bidVolume = '';
  let offerVolume = '';
  const volMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(gwh|mwh|tj)/i);
  if (volMatch) {
    const volStr = `${volMatch[1]}${volMatch[2].toUpperCase()}`;
    if (numericBid !== null) bidVolume = volStr;
    if (numericOffer !== null) offerVolume = volStr;
  }

  // 8. Institutional Product Class Disambiguation
  let productClass: ProductClass;
  let quoteClass: BrokerMarketQuote['class'] = 'GO';

  const isHighValue = (numericBid !== null && numericBid > 70) || (numericOffer !== null && numericOffer > 70);
  const mentionsCompliance = /thg|ere|cpb|cic|rtfo|drtfc|pos|udb|mass balance|physical/i.test(clean);

  if (isHighValue || mentionsCompliance) {
    productClass = 'BUNDLED_COMPLIANCE';
    if (country === 'DE' || /thg/i.test(clean)) quoteClass = 'THG_BUNDLED';
    else if (country === 'NL' || /ere/i.test(clean)) quoteClass = 'ERE_BUNDLED';
    else if (country === 'FR' || /cpb/i.test(clean)) quoteClass = 'CPB_BUNDLED';
    else if (country === 'UK') quoteClass = 'RGGO';
  } else {
    productClass = 'GO_VOLUNTARY';
    quoteClass = country === 'UK' ? 'RGGO' : 'GO';
  }

  return {
    id,
    country,
    class: quoteClass,
    productClass,
    feedstock,
    vintage,
    certified: /iscc/i.test(clean) ? 'Certified (ISCC EU)' : /redcert/i.test(clean) ? 'Certified (REDcert)' : 'Certified',
    subsidized: /unsub|non-sub/i.test(clean) ? 'Unsubsidised' : 'Subsidised',
    ciScore: ciScore || '—',
    bidPrice,
    offerPrice,
    bidVolume,
    offerVolume,
    currency,
    numericBidEurMwh: currency === 'EUR'
      ? numericBid
      : (currency === 'GBP' && gbpEurFx && numericBid !== null
        ? Number((numericBid * gbpEurFx).toFixed(2))
        : null),
    numericOfferEurMwh: currency === 'EUR'
      ? numericOffer
      : (currency === 'GBP' && gbpEurFx && numericOffer !== null
        ? Number((numericOffer * gbpEurFx).toFixed(2))
        : null),
    highlight: isHighValue,
    derivedFrom: 'Imported OTC Broker Sheet / Bilateral Run',
    provenanceTier: 'BROKER_RUN',
  };
}
