import { MARKETS } from '../markets/registry';
import { UnitOfAccount } from '../markets/types';
import { BrokerMarketQuote } from './brokerMarketData';
import { findTenorSpans } from '../marks/tenorLabel';

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
  /** Canonical tenor label (see marks/tenorLabel.ts) when the line states one. */
  vintage?: string | null;
  /** CI exactly as stated by an explicit CI token, e.g. "-100gCO2/MJ". */
  ciScore?: string | null;
  country?: string | null;
  /** Quoted volume normalised to MWh where the unit allows it; the original text is in volumeText. */
  volumeMwh?: number | null;
  volumeText?: string;
}

/**
 * A free-form quote. bidPrice / offerPrice are display strings in the quoted currency. The numeric
 * prices bidMarketUnit / offerMarketUnit are in the TARGET MARKET's own unit of account (marketUnit):
 * EUR/tCO2e for DE_THG, GBP/RTFC for UK_RTFO, EUR/kgCO2e for NL_ERE, EUR/MWh for CPB / GO / bundle.
 * numericBidEurMwh / numericOfferEurMwh are set ONLY when marketUnit is EUR_PER_MWH, so a EUR/t
 * number is never an EUR/MWh one.
 */
export interface ParsedFreeformQuote extends BrokerMarketQuote {
  marketId: string | null;
  marketUnit: string | null;
  bidMarketUnit: number | null;
  offerMarketUnit: number | null;
  unitRaw: string;
  volumeMwh: number | null;
  volumeText: string;
  broker: string | null;
  rawLine: string;
  productRaw: string;
  singleUnsided: boolean;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export interface BrokerParseResult {
  marks: ParsedBrokerMark[];
  quotes: ParsedFreeformQuote[];
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
export type FreeformSource = 'STX' | 'ACT' | 'MAREX' | 'CFP' | 'EVOLUTION' | 'GENERIC_OTC';

// Canonical aliases for mapping product names to active market IDs
const PRODUCT_ALIAS_MAP: Record<string, string> = {
  // Germany THG Bundled Physical Gas + Certificate
  'THG BUNDLE': 'DE_THG_BUNDLE',
  'THG BUNDLED': 'DE_THG_BUNDLE',
  'DE THG BUNDLE': 'DE_THG_BUNDLE',
  'DE THG BUNDLED': 'DE_THG_BUNDLE',
  'MANURE + PHYSICAL GAS': 'DE_THG_BUNDLE',
  'MANURE + GAS': 'DE_THG_BUNDLE',
  'GERMAN BUNDLED': 'DE_THG_BUNDLE',
  'THG PHYSICAL': 'DE_THG_BUNDLE',

  // Germany THG Pure Statutory Quota
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

export const DEFAULT_UNITS: Record<string, string> = {
  DE_THG: 'EUR_PER_TCO2E',
  DE_THG_BUNDLE: 'EUR_PER_MWH',
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
  s = s.replace(/(?:\/(?:MWh|tCO2e|kgCO2e|dRTFC|tCO2|therm)|EUR|GBP|USD|CHF|MWh|tCO2e|kgCO2e|CIC|dRTFC)/gi, '').trim();
  s = s.replace(/\/+$/, '').trim();
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
  // Pre-process conversational updates: split multi-quote sentences joined by " and ", " & ", or commas
  let processedText = rawText;
  let brokerDetected = defaultBroker;

  // Detect leading broker label like "STX: " or "Marex quoting "
  const leading = stripBrokerPrefix(processedText);
  const prefixBroker = leading.broker;
  if (prefixBroker) {
    brokerDetected = prefixBroker;
    processedText = leading.line;
  }

  if (!processedText.includes('\n') && /\b(?:and|&)\b/i.test(processedText)) {
    processedText = processedText.replace(/\s+\b(?:and|&)\b\s+/gi, '\n');
  }

  const lines = processedText
    .split(/\r?\n/)
    .map(l => l.trim().replace(/^['"]+|['"]+$/g, '').replace(/^(?:update|set|mark|stage)\s+/i, ''))
    .filter(l => l.length > 0);

  const marks: ParsedBrokerMark[] = [];
  const quotes: ParsedFreeformQuote[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const skippedLines: string[] = [];

  const detectedDateInText = extractDateFromText(rawText);
  const effectiveDate = defaultDate
    ? normalizeDate(defaultDate)
    : (detectedDateInText || normalizeDate(null));

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
  // A leading label such as "STX: " already decided the broker. Whole-word matches only, so "exact" is not ACT.
  const lowerText = rawText.toLowerCase();
  if (!prefixBroker) {
    if (/\bargus\b/.test(lowerText)) brokerDetected = 'Argus Media';
    else if (/\bicis\b/.test(lowerText)) brokerDetected = 'ICIS';
    else if (/\bstx\b/.test(lowerText)) brokerDetected = 'STX Commodities';
    else if (/\bact\s+(?:commodities|run)\b|\bact\s*:/.test(lowerText)) brokerDetected = 'ACT Commodities';
    else if (/\bmarex\b/.test(lowerText)) brokerDetected = 'Marex Spectron';
    else if (/\bevolution\b/.test(lowerText)) brokerDetected = 'Evolution Markets';
    else if (/\btradition\b/.test(lowerText)) brokerDetected = 'Tradition';
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLineText = lines[idx];
    const pre = stripBrokerPrefix(rawLineText);
    const line = pre.line.trim() || rawLineText;

    // Skip table header lines (a header carries no numbers)
    const lowerLine = line.toLowerCase();
    if (
      (lowerLine.includes('market') || lowerLine.includes('product')) &&
      (lowerLine.includes('price') || lowerLine.includes('mid') || lowerLine.includes('bid')) &&
      !/\d/.test(line)
    ) {
      continue;
    }

    // Free-form (WhatsApp / email) lines go through the unit-aware free-form parser. Table rows
    // (tab, pipe or comma/semicolon separated) keep the structured column parser below.
    const tabular = /\t|\|/.test(line) || (line.match(/,/g) || []).length >= 2 || (line.match(/;/g) || []).length >= 2;
    const ff = tabular ? null : parseSingleBrokerLine(rawLineText, 'ff', gbpEurFx);
    if (ff && !(ff.singleUnsided && ff.marketId !== 'GAS_TTF')) {
      marks.push(markFromFreeformQuote(ff, idx, effectiveDate, brokerDetected));
      continue;
    }

    // Determine delimiter: tab, pipe, semicolon, colon, conversational " to "/" at "/" = ", or comma
    let parts: string[];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes(';') && !line.includes(',')) {
      parts = line.split(';');
    } else if (line.includes(':')) {
      parts = line.split(':');
    } else if (/\s+(?:to|at|=)\s+/i.test(line)) {
      parts = line.split(/\s+(?:to|at|=)\s+/i);
    } else if (line.includes(',')) {
      parts = line.split(',');
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
    let sourceStr: string = pre.broker ?? brokerDetected;

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

        const spreadMatch = item.match(/^([€£$]?\s*[0-9.,]+)\s*\/\s*([€£$]?\s*[0-9.,]+)(?:\s*(.*))?$/);
        if (spreadMatch && !/\d{2,4}\/\d{1,2}\/\d{2,4}/.test(item)) {
          const b = cleanNumber(spreadMatch[1]);
          const a = cleanNumber(spreadMatch[2]);
          if (b !== null && a !== null) {
            bidVal = b;
            askVal = a;
            midVal = Number(((b + a) / 2).toFixed(3));
            if (spreadMatch[3] && !unitStr) {
              unitStr = spreadMatch[3].trim();
            }
            continue;
          }
        } else if (item.includes('/') && !/\d{2,4}\/\d{1,2}\/\d{2,4}/.test(item) && /\d+\s*\/\s*[€£$]?\s*\d+/.test(item)) {
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
        } else if (cleanNumber(item) !== null) {
          const num = cleanNumber(item);
          if (midVal === null && pIdx === 1) midVal = num;
          else if (bidVal === null && pIdx === 2) bidVal = num;
          else if (askVal === null && pIdx === 3) askVal = num;
          if (!unitStr && /[a-zA-Z€£$]/.test(item)) {
            const extractedUnit = item.replace(/[0-9.,\s€£$]/g, '').trim();
            if (extractedUnit) unitStr = extractedUnit;
          }
        } else if (itemLower.includes('eur') || itemLower.includes('gbp') || itemLower.includes('mwh') || itemLower.includes('tco2') || itemLower.includes('cic')) {
          unitStr = item;
        } else if (/\d{4}[-/.]\d{2}[-/.]\d{2}/.test(item) || /\d{2}[-/.]\d{2}[-/.]\d{4}/.test(item)) {
          dateStr = normalizeDate(item);
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

    // Fallback Unit: the market's own unit of account (never a blanket EUR/MWh)
    if (!unitStr && marketId) {
      unitStr = marketUnitOf(marketId) || '';
    }

    // A stated unit is converted into the market's own unit, or the line is rejected. Never guessed.
    if (marketId && unitStr) {
      const stated = parseUnitToken(unitStr.replace(/_PER_/gi, '/').replace(/_DEFICIT/i, '').replace(/_/g, ''));
      const target = marketUnitOf(marketId);
      if (stated && stated.per && target) {
        const errorsBefore = validationErrors.length;
        const conv = (v: number | null): number | null => {
          if (v === null) return null;
          const r = convertToMarketUnit(v, stated, marketId, gbpEurFx);
          if (r.error && !validationErrors.includes(r.error)) validationErrors.push(r.error);
          return r.market;
        };
        const nb = conv(bidVal);
        const na = conv(askVal);
        const nm = conv(midVal);
        if (validationErrors.length === errorsBefore) {
          bidVal = nb;
          askVal = na;
          midVal = nm;
          unitStr = target;
        }
      }
    }

    // Validate bid vs ask: a crossed market is kept as quoted and flagged, never swapped
    if (bidVal !== null && askVal !== null && bidVal > askVal) {
      validationWarnings.push(`crossed market: bid ${bidVal} > offer ${askVal}`);
    }

    const isValid = validationErrors.length === 0;

    if (ff && !isValid && midVal === null) {
      // The free-form reading explains the failure better (unit / market / country), use it.
      marks.push(markFromFreeformQuote(ff, idx, effectiveDate, brokerDetected));
      continue;
    }

    marks.push({
      id: `BRK-${idx + 1}-${marketId || 'UNKNOWN'}`,
      rawLine: rawLineText,
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
  const freeform = parseFreeformQuotes(processedText, gbpEurFx);
  quotes.push(...freeform.quotes);
  const inferredSource = inferFreeformSource(rawText);

  return {
    marks,
    quotes,
    errors,
    warnings,
    brokerDetected,
    inferredSource,
    totalLines: lines.length,
    rawLineCount: lines.length,
    validCount,
    parsedQuoteCount: quotes.length,
    skippedLines,
    extractedDate: detectedDateInText,
  };
}


// ---------------------------------------------------------------------------
// Free-form (WhatsApp / email) line parser
// ---------------------------------------------------------------------------

type PerBasis = 'T' | 'KG' | 'MWH' | 'GJ' | 'KWH' | 'RTFC' | 'CERT' | 'CIC';

interface UnitInfo {
  /** The unit text exactly as written, for messages. */
  raw: string;
  currency: 'EUR' | 'GBP' | null;
  /** Multiplier to the major currency unit (pence and euro-cents are 0.01). */
  scale: number;
  per: PerBasis | null;
}

const UNIT_PATTERN = '(€|£|\\b(?:eur|gbp|gbx|ct|cts|cents?|p|pence)\\b)\\s*\\/\\s*(tonnes?|t\\s?co2e?|kg\\s?co2e?|mwh|gj|kwh|d-?rtfcs?|rtfcs?|certs?|cic|kg|t)(?![\\w])';

/** Reads the first price unit in a piece of text, e.g. "€/tCO2e", "p/RTFC", "ct/kg", "EUR/MWh". */
function parseUnitToken(text: string): UnitInfo | null {
  const m = new RegExp(UNIT_PATTERN, 'i').exec(text);
  if (m) {
    const cur = m[1].toLowerCase();
    const isEur = cur === '€' || cur === 'eur' || cur === 'ct' || cur === 'cts' || cur.startsWith('cent');
    const isMinor = cur === 'ct' || cur === 'cts' || cur.startsWith('cent') || cur === 'p' || cur === 'pence' || cur === 'gbx';
    const d = m[2].toLowerCase().replace(/\s+/g, '');
    let per: PerBasis;
    if (d.startsWith('kg')) per = 'KG';
    else if (d.startsWith('t')) per = 'T';
    else if (d === 'mwh') per = 'MWH';
    else if (d === 'gj') per = 'GJ';
    else if (d === 'kwh') per = 'KWH';
    else if (d.includes('rtfc')) per = 'RTFC';
    else if (d.startsWith('cert')) per = 'CERT';
    else per = 'CIC';
    return { raw: m[0].trim(), currency: isEur ? 'EUR' : 'GBP', scale: isMinor ? 0.01 : 1, per };
  }
  if (/€|\beur\b/i.test(text)) return { raw: '€', currency: 'EUR', scale: 1, per: null };
  if (/£|\bgbp\b/i.test(text)) return { raw: '£', currency: 'GBP', scale: 1, per: null };
  return null;
}

/** Unit of account a market is priced in: the parser defaults first, then the markets registry. */
function marketUnitOf(marketId: string): string | null {
  return DEFAULT_UNITS[marketId] ?? MARKETS.find(m => m.id === marketId)?.unitOfAccount ?? null;
}

/** One GO / RGGO certificate is 1 MWh (EN 16325), so "per cert" is "per MWh" for those markets only. */
function certIsOneMwh(marketId: string): boolean {
  return marketId === 'UK_RGGO' || marketId.endsWith('_GO') || marketId === 'ES_GDO';
}

const round6 = (n: number): number => Number(n.toFixed(6));

interface PriceConversion {
  /** The price in the quoted currency, scaled to the major unit and to the market's per-basis (null when the unit cannot be mapped). */
  display: number;
  /** The price in the market's own unit of account (null when it cannot be produced). */
  market: number | null;
  error?: string;
}

/**
 * Converts one quoted price into the unit the market's pricing-book row expects. Never guesses:
 * a unit that cannot be mapped returns an error and no market value.
 */
function convertToMarketUnit(value: number, unit: UnitInfo | null, marketId: string, gbpEurFx?: number): PriceConversion {
  const marketUnit = marketUnitOf(marketId);
  const scaled = value * (unit?.scale ?? 1);
  if (!marketUnit) {
    return { display: round6(scaled), market: null, error: `unit of market ${marketId} unknown` };
  }
  let factor: number | null = 1;
  if (unit?.per) {
    const per = unit.per;
    if (marketUnit.startsWith('EUR_PER_TCO2E')) factor = per === 'T' ? 1 : per === 'KG' ? 1000 : null;
    else if (marketUnit === 'EUR_PER_KG_CO2E') factor = per === 'KG' ? 1 : per === 'T' ? 0.001 : null;
    else if (marketUnit === 'EUR_PER_MWH') {
      factor = per === 'MWH' ? 1 : per === 'GJ' ? 3.6 : per === 'KWH' ? 1000 : (per === 'CERT' && certIsOneMwh(marketId)) ? 1 : null;
    } else if (marketUnit === 'EUR_PER_CIC') factor = per === 'CIC' || per === 'CERT' ? 1 : null;
    else if (marketUnit.startsWith('GBP_PER_')) factor = per === 'RTFC' || per === 'CERT' ? 1 : null;
    else factor = null;
  }
  if (factor === null) {
    return { display: round6(scaled), market: null, error: `unit ${unit?.raw ?? ''} not convertible for market ${marketId}` };
  }
  const inQuotedCurrency = scaled * factor;
  const marketCurrency = marketUnit.startsWith('GBP') ? 'GBP' : 'EUR';
  const quoted = unit?.currency ?? marketCurrency;
  if (quoted === marketCurrency) {
    return { display: round6(inQuotedCurrency), market: round6(inQuotedCurrency) };
  }
  if (!gbpEurFx || !(gbpEurFx > 0)) {
    return { display: round6(inQuotedCurrency), market: null, error: `GBP/EUR FX not supplied, cannot convert ${quoted} to ${marketCurrency} for market ${marketId}` };
  }
  const converted = quoted === 'GBP' ? inQuotedCurrency * gbpEurFx : inQuotedCurrency / gbpEurFx;
  return { display: round6(inQuotedCurrency), market: round6(converted) };
}

const BROKER_NAMES: Array<[RegExp, string]> = [
  [/^stx/i, 'STX Commodities'],
  [/^marex/i, 'Marex Spectron'],
  [/^act/i, 'ACT Commodities'],
  [/^evolution/i, 'Evolution Markets'],
  [/^argus/i, 'Argus Media'],
  [/^tradition/i, 'Tradition'],
];

/** Strips a leading broker label ("STX: ", "Marex quoting ", "ACT Run: ", "Evolution: ") and reports the broker. */
export function stripBrokerPrefix(line: string): { line: string; broker: string | null } {
  const m = line.match(/^\s*(STX|MAREX(?:\s+SPECTRON)?|ACT(?:\s+COMMODITIES)?|EVOLUTION(?:\s+MARKETS)?|CFP|BELEKTRON|ARGUS|ICIS|GFI|TFS|SCB|TRADITION)\b(?:\s+(?:quoting|quotes|says|run|runs|levels|sheet|update))*\s*[:\-,]*\s*/i);
  if (!m) return { line, broker: null };
  const named = BROKER_NAMES.find(([re]) => re.test(m[1]));
  return { line: line.slice(m[0].length), broker: named ? named[1] : m[1].toUpperCase() };
}

const GO_MARKET_BY_COUNTRY: Record<string, string> = {
  DE: 'DE_GO', NL: 'NL_GO', FR: 'FR_GO', DK: 'DK_GO', AIB: 'AIB_GO', ES: 'ES_GDO',
};

const MARKET_COUNTRY: Record<string, string> = {
  DE_THG: 'DE', DE_THG_BUNDLE: 'DE', NL_ERE: 'NL', NL_GGE: 'NL', FR_CPB: 'FR', UK_RTFO: 'UK', UK_RGGO: 'UK',
  IT_CIC: 'IT', FUELEU: 'EU', GAS_TTF: 'EU',
};

const MARKET_CLASS: Record<string, string> = {
  DE_THG: 'THG', DE_THG_BUNDLE: 'THG_BUNDLED', NL_ERE: 'ERE', NL_GGE: 'GGE', FR_CPB: 'CPB', UK_RTFO: 'RTFO',
  UK_RGGO: 'RGGO', IT_CIC: 'CIC', FUELEU: 'FUELEU', GAS_TTF: 'TTF',
};

function detectCountry(text: string): string | null {
  const candidates: Array<[RegExp, string]> = [
    [/\b(?:uk|gb|great britain|united kingdom|british)\b/i, 'UK'],
    [/\b(?:fr|france|french)\b/i, 'FR'],
    [/\b(?:nl|netherlands|holland|dutch)\b/i, 'NL'],
    [/\b(?:dk|denmark|danish)\b/i, 'DK'],
    [/\b(?:IT|italy|italia|italian)\b/, 'IT'],
    [/\b(?:italy|italia|italian)\b/i, 'IT'],
    [/\b(?:es|spain|espana|spanish)\b/i, 'ES'],
    [/\b(?:aib|eecs)\b/i, 'AIB'],
    [/\b(?:de|germany|deutschland|german)\b/i, 'DE'],
  ];
  let best: { idx: number; code: string } | null = null;
  for (const [re, code] of candidates) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.idx)) best = { idx: m.index, code };
  }
  return best ? best.code : null;
}

/** Product keywords to a market id. Whole-word matches only, so "manure" never reads as "ERE". */
function detectMarketId(text: string, country: string | null): { marketId: string | null; note?: string } {
  const t = text.replace(/_/g, ' ');
  const hasThg = /\bthg\b/i.test(t);
  if (hasThg && /\bbundle[d]?\b|\bphysical\b|manure\s*\+/i.test(t)) return { marketId: 'DE_THG_BUNDLE' };
  if (!hasThg && /manure\s*\+\s*(?:physical\s+)?gas|\bgerman\s+bundled\b/i.test(t)) return { marketId: 'DE_THG_BUNDLE' };
  if (/\b(?:rtfo|d-?rtfcs?|rtfcs?)\b/i.test(t)) return { marketId: 'UK_RTFO' };
  if (/\b(?:rggo|ggcs)\b/i.test(t)) return { marketId: 'UK_RGGO' };
  if (hasThg) return { marketId: 'DE_THG' };
  if (/\bgge\b/i.test(t)) return { marketId: 'NL_GGE' };
  if (/\b(?:ere|hbe(?:[-\s][go])?)\b/i.test(t)) return { marketId: 'NL_ERE' };
  if (/\b(?:cpb|tiruert|tirert)\b/i.test(t)) return { marketId: 'FR_CPB' };
  if (/\bcic\b/i.test(t)) return { marketId: 'IT_CIC' };
  if (/\bfuel\s?eu\b/i.test(t)) return { marketId: 'FUELEU' };
  if (/\bttf\b/i.test(t)) return { marketId: 'GAS_TTF' };
  if (/\b(?:go|gos|guarantees? of origin)\b/i.test(t) && country && GO_MARKET_BY_COUNTRY[country]) {
    return { marketId: GO_MARKET_BY_COUNTRY[country] };
  }
  if (country && GO_MARKET_BY_COUNTRY[country]) {
    return { marketId: GO_MARKET_BY_COUNTRY[country], note: `no product keyword, treated as ${country} GO` };
  }
  return { marketId: null };
}

interface PriceToken {
  kind: 'bid' | 'offer' | 'num';
  start: number;
  end: number;
  value: number;
  symbol: '€' | '£' | null;
}

const blank = (m: string): string => ' '.repeat(m.length);

function parseVolume(qtyRaw: string, unitRaw: string, marketId: string | null): { mwh: number | null; text: string } {
  let q = qtyRaw;
  if (/^\d{1,3}(,\d{3})+$/.test(q)) q = q.replace(/,/g, '');
  else q = q.replace(',', '.');
  const qty = Number(q);
  const unit = unitRaw.toLowerCase();
  if (!Number.isFinite(qty)) return { mwh: null, text: `${qtyRaw} ${unitRaw}` };
  if (unit === 'gwh') return { mwh: round6(qty * 1000), text: `${qty}GWH` };
  if (unit === 'mwh') return { mwh: qty, text: `${qty}MWH` };
  if (unit === 'tj') return { mwh: Number((qty / 0.0036).toFixed(2)), text: `${qty}TJ` };
  const text = `${qty} ${unitRaw}`;
  // A GO / RGGO certificate is 1 MWh; an RTFC, CIC or tonne volume is not an energy quantity.
  if (/^certs?$/.test(unit) && marketId && certIsOneMwh(marketId)) return { mwh: qty, text };
  return { mwh: null, text };
}

/**
 * Regex parser for a single line from a broker run. Years, tenors, CI values and volumes are masked
 * out first so they are never read as prices.
 */
function parseSingleBrokerLine(
  rawLine: string,
  id: string,
  gbpEurFx?: number
): ParsedFreeformQuote | null {
  const { line: stripped, broker } = stripBrokerPrefix(rawLine);
  const clean = stripped.replace(/_/g, ' ').replace(/\t+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!clean) return null;

  let work = clean;

  // Price unit (first one wins), then blank every unit token so "/t" "/MWh" digits-free text cannot interfere.
  const unitInfo = parseUnitToken(clean);
  work = work.replace(new RegExp(UNIT_PATTERN, 'gi'), blank);

  // CI: only explicit tokens.
  let ciScore = '';
  const ciPatterns: RegExp[] = [
    /([<>]?\s*[-+]?\d+(?:\.\d+)?)\s*g\s*co2e?\s*\/\s*mj/gi,
    /(?<![\w.])(?!20[2-3]\d\b)([<>]?[-+]?\d+(?:\.\d+)?)\s*ci\b/gi,
    /\bci\s*[:=]?\s*([<>]?[-+]?\d+(?:\.\d+)?)/gi,
    /(?<![\w.])([<>]?[-+]?\d+(?:\.\d+)?)g(?![\w])/gi,
  ];
  for (const re of ciPatterns) {
    const first = new RegExp(re.source, 'i').exec(work);
    if (first && !ciScore) ciScore = `${first[1].replace(/\s+/g, '')}gCO2/MJ`;
    work = work.replace(re, blank);
  }

  // Volumes.
  let volume: { mwh: number | null; text: string } | null = null;
  const volRe = /(?:\bvol(?:ume)?s?\.?\s*[:=]?\s*)?(\d+(?:[.,]\d+)*)\s*(gwh|mwh|tj|kt|certs?|rtfcs?|cics?)(?![A-Za-z])/gi;
  const volFirst = new RegExp(volRe.source, 'i').exec(work);
  const volMarketHint = detectMarketId(clean, detectCountry(clean)).marketId;
  if (volFirst) volume = parseVolume(volFirst[1], volFirst[2], volMarketHint);
  work = work.replace(volRe, blank);

  // Vintage / tenor.
  const tenorSpans = findTenorSpans(work);
  const vintage = tenorSpans.length > 0 ? tenorSpans[0].label : '—';
  for (const span of [...tenorSpans].reverse()) {
    work = work.slice(0, span.start) + ' '.repeat(span.end - span.start) + work.slice(span.end);
  }

  // Dates.
  work = work
    .replace(/\b20\d\d-\d\d-\d\d\b/g, blank)
    .replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]20\d\d\b/g, blank);

  // Tokens: side keywords and numbers (optionally with a currency symbol).
  const tokenRe = /\b(bids?|buyers?|paying)\b|\b(offers?|sellers?|asking|asks?)\b|((?:[£€]\s*)?(?<![A-Za-z])\d+(?:[.,]\d+)?(?![A-Za-z%]))/gi;
  const tokens: PriceToken[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = tokenRe.exec(work)) !== null) {
    if (tm[1]) tokens.push({ kind: 'bid', start: tm.index, end: tm.index + tm[0].length, value: NaN, symbol: null });
    else if (tm[2]) tokens.push({ kind: 'offer', start: tm.index, end: tm.index + tm[0].length, value: NaN, symbol: null });
    else {
      const v = cleanNumber(tm[3].replace(/[£€\s]/g, ''));
      if (v === null) continue;
      tokens.push({
        kind: 'num', start: tm.index, end: tm.index + tm[0].length, value: v,
        symbol: tm[3].includes('£') ? '£' : tm[3].includes('€') ? '€' : null,
      });
    }
  }

  const hasKeyword = tokens.some(t => t.kind !== 'num');
  const nums = tokens.filter(t => t.kind === 'num');
  let rawBid: number | null = null;
  let rawOffer: number | null = null;
  let singleUnsided = false;
  const usedTokens: PriceToken[] = [];

  if (hasKeyword) {
    const firstTwo = tokens.slice(0, 2);
    const numberFirst = firstTwo.length === 2 && firstTwo[0].kind === 'num' && firstTwo[1].kind !== 'num';
    const consumed = new Set<PriceToken>();
    tokens.forEach((tok, i) => {
      if (tok.kind === 'num') return;
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      const order = numberFirst ? [prev, next] : [next, prev];
      const pick = order.find(c => c && c.kind === 'num' && !consumed.has(c));
      if (!pick) return;
      consumed.add(pick);
      usedTokens.push(pick);
      if (tok.kind === 'bid' && rawBid === null) rawBid = pick.value;
      else if (tok.kind === 'offer' && rawOffer === null) rawOffer = pick.value;
    });
  } else {
    for (let i = 0; i + 1 < nums.length; i++) {
      const between = work.slice(nums[i].end, nums[i + 1].start);
      if (/^\s*(?:\/|-|–|@|to)\s*$/i.test(between)) {
        rawBid = nums[i].value;
        rawOffer = nums[i + 1].value;
        usedTokens.push(nums[i], nums[i + 1]);
        break;
      }
    }
    if (rawBid === null && nums.length === 1 && (unitInfo || nums[0].symbol)) {
      rawOffer = nums[0].value;
      singleUnsided = true;
      usedTokens.push(nums[0]);
    }
  }

  if (rawBid === null && rawOffer === null) return null;

  // Country and market.
  const explicitCountry = detectCountry(clean);
  const detected = detectMarketId(clean, explicitCountry);
  const marketId = detected.marketId;
  const symbolCurrency = usedTokens.find(t => t.symbol)?.symbol ?? null;
  if (!marketId && !unitInfo && !symbolCurrency) return null;

  const country = explicitCountry ?? (marketId ? MARKET_COUNTRY[marketId] ?? null : null);
  const marketUnit = marketId ? marketUnitOf(marketId) : null;
  const marketCurrency: 'EUR' | 'GBP' = marketUnit?.startsWith('GBP') ? 'GBP' : 'EUR';

  const effectiveUnit: UnitInfo | null = unitInfo
    ?? (symbolCurrency ? { raw: symbolCurrency, currency: symbolCurrency === '£' ? 'GBP' : 'EUR', scale: 1, per: null } : null);
  const quotedCurrency: 'EUR' | 'GBP' = effectiveUnit?.currency ?? marketCurrency;

  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];
  if (!country) validationErrors.push('country not identified');
  if (!marketId) validationErrors.push('market not identified');
  if (detected.note) validationWarnings.push(detected.note);

  const convert = (v: number | null): { display: number | null; market: number | null } => {
    if (v === null) return { display: null, market: null };
    if (!marketId) return { display: round6(v * (effectiveUnit?.scale ?? 1)), market: null };
    const r = convertToMarketUnit(v, effectiveUnit, marketId, gbpEurFx);
    if (r.error && !validationErrors.includes(r.error)) validationErrors.push(r.error);
    return { display: r.display, market: r.market };
  };
  const bid = convert(rawBid);
  const offer = convert(rawOffer);

  if (marketId && (!effectiveUnit || effectiveUnit.per === null) && marketUnit) {
    validationWarnings.push(`no per-unit stated, assumed ${marketUnit}`);
  }
  if (singleUnsided) validationWarnings.push('single price with no side stated, treated as offer');

  const crossCmp = (bid.market !== null && offer.market !== null)
    ? [bid.market, offer.market]
    : (bid.display !== null && offer.display !== null ? [bid.display, offer.display] : null);
  if (crossCmp && crossCmp[0] > crossCmp[1]) {
    validationWarnings.push(`crossed market: bid ${crossCmp[0]} > offer ${crossCmp[1]}`);
  }

  // Feedstock (legacy keyword rules).
  let feedstock = 'Mix / Waste';
  if (/manure|slurry|gülle/i.test(clean)) feedstock = 'Manure & Slurry';
  else if (/crop|maize|silage/i.test(clean)) feedstock = 'Energy Crop';
  else if (/food waste|forsu/i.test(clean)) feedstock = 'Food Waste';
  else if (/sewage|sludge/i.test(clean)) feedstock = 'Sewage Sludge';
  else if (/agri|residue|straw/i.test(clean)) feedstock = 'Agri Residues';
  else if (/waste|residue/i.test(clean)) feedstock = 'Waste';

  const fmt = (v: number | null): string => {
    if (v === null) return '';
    const dp = Math.abs(v) < 1 ? 3 : 2;
    return quotedCurrency === 'GBP' ? `£${v.toFixed(dp)}` : `€ ${v.toFixed(dp)}`;
  };

  const volText = volume?.text ?? '';
  const isGoLike = marketId !== null && (marketId === 'UK_RGGO' || marketId.endsWith('_GO') || marketId === 'ES_GDO');
  const eurMwh = marketUnit === 'EUR_PER_MWH';

  // Product text: everything before the first price token.
  const firstStart = tokens.length > 0 ? tokens[0].start : clean.length;
  const productRaw = clean.slice(0, firstStart).replace(/[\s:,\-@<>]+$/, '').trim() || clean;

  if (validationErrors.length === 0 && bid.market === null && offer.market === null) {
    validationErrors.push('no usable price');
  }

  return {
    id,
    country: country ?? 'UNKNOWN',
    class: marketId ? (MARKET_CLASS[marketId] ?? (isGoLike ? 'GO' : 'UNKNOWN')) : 'UNKNOWN',
    productClass: marketId === 'GAS_TTF' ? 'PHYSICAL_BROWN' : (!marketId || isGoLike) ? 'GO_VOLUNTARY' : 'BUNDLED_COMPLIANCE',
    feedstock,
    vintage,
    certified: /iscc/i.test(clean) ? 'Certified (ISCC EU)' : /redcert/i.test(clean) ? 'Certified (REDcert)' : 'Certified',
    subsidized: /unsub|non-sub/i.test(clean) ? 'Unsubsidised' : 'Subsidised',
    ciScore: ciScore || '—',
    bidPrice: fmt(bid.display),
    offerPrice: fmt(offer.display),
    bidVolume: rawBid !== null ? volText : '',
    offerVolume: rawOffer !== null ? volText : '',
    currency: quotedCurrency,
    // Only a price that is genuinely in EUR/MWh is exposed under the *EurMwh names. A EUR/t, EUR/kg,
    // EUR/CIC or GBP/RTFC price is null here; use bidMarketUnit / offerMarketUnit for those.
    numericBidEurMwh: eurMwh ? bid.market : null,
    numericOfferEurMwh: eurMwh ? offer.market : null,
    derivedFrom: 'Imported OTC Broker Sheet / Bilateral Run',
    provenanceTier: 'BROKER_RUN',
    marketId,
    marketUnit,
    bidMarketUnit: bid.market,
    offerMarketUnit: offer.market,
    unitRaw: unitInfo?.raw ?? '',
    volumeMwh: volume?.mwh ?? null,
    volumeText: volText,
    broker,
    rawLine,
    productRaw,
    singleUnsided,
    isValid: validationErrors.length === 0,
    validationErrors,
    validationWarnings,
  };
}

/** Builds the structured mark for a free-form quote (mid = (bid+offer)/2, or the single quoted side, flagged). */
function markFromFreeformQuote(
  q: ParsedFreeformQuote,
  idx: number,
  assessmentDate: string,
  brokerDetected: string
): ParsedBrokerMark {
  const warnings = [...q.validationWarnings];
  let bid = q.bidMarketUnit;
  let ask = q.offerMarketUnit;
  let mid: number | null = null;
  if (bid !== null && ask !== null) {
    mid = round6((bid + ask) / 2);
  } else if (q.singleUnsided && q.marketId === 'GAS_TTF') {
    mid = ask;
    bid = null;
    ask = null;
    warnings.push('single price with no side stated, treated as mid');
  } else if (bid !== null || ask !== null) {
    mid = bid ?? ask;
    warnings.push(`one-sided quote (${bid !== null ? 'bid only' : 'offer only'}): mid is the single quoted side`);
  }
  const marketName = q.marketId
    ? (q.marketId === 'GAS_TTF' ? 'TTF Natural Gas Index' : (MARKETS.find(m => m.id === q.marketId)?.name ?? q.marketId))
    : q.productRaw;
  return {
    id: `BRK-${idx + 1}-${q.marketId || 'UNKNOWN'}`,
    rawLine: q.rawLine,
    marketId: q.marketId,
    marketName,
    productRaw: q.productRaw,
    midPrice: mid,
    bid,
    ask,
    unit: q.marketUnit ?? q.unitRaw,
    assessmentDate,
    brokerSource: q.broker ?? brokerDetected,
    isValid: q.isValid,
    validationErrors: [...q.validationErrors],
    validationWarnings: warnings,
    vintage: q.vintage === '—' ? null : q.vintage,
    ciScore: q.ciScore === '—' ? null : q.ciScore,
    country: q.country === 'UNKNOWN' ? null : q.country,
    volumeMwh: q.volumeMwh,
    volumeText: q.volumeText,
  };
}

function inferFreeformSource(rawText: string): FreeformSource {
  const lowerText = (rawText || '').toLowerCase();
  if (/\bstx\b/.test(lowerText)) return 'STX';
  if (/\bact\s+(?:commodities|run)\b|\bact\s*:/.test(lowerText)) return 'ACT';
  if (/\bmarex\b/.test(lowerText)) return 'MAREX';
  if (/\bcfp\b/.test(lowerText)) return 'CFP';
  if (/\bevolution\b/.test(lowerText)) return 'EVOLUTION';
  return 'GENERIC_OTC';
}

/**
 * Free-form (WhatsApp / email) run parser. Produces order-book style quotes. Nothing is invented: a
 * field the line does not state (vintage, CI, volume) is left blank / "—" rather than defaulted, and a
 * line whose country, market or unit cannot be established comes back with isValid=false and why.
 */
export function parseFreeformQuotes(rawText: string, gbpEurFx?: number): {
  quotes: ParsedFreeformQuote[];
  skippedLines: string[];
  inferredSource: FreeformSource;
} {
  const inferredSource = inferFreeformSource(rawText);
  if (!rawText || !rawText.trim()) return { quotes: [], skippedLines: [], inferredSource };

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const quotes: ParsedFreeformQuote[] = [];
  const skippedLines: string[] = [];
  let idx = 0;
  for (const line of lines) {
    if (/^(hi|hello|morning|afternoon|broker|market update|runs|bids|offers|desk)/i.test(line) && !/\d/.test(line)) {
      skippedLines.push(line);
      continue;
    }
    // Table rows (tab / pipe / comma separated) belong to the structured column parser.
    if (/\t|\|/.test(line) || (line.match(/,/g) || []).length >= 2) {
      skippedLines.push(line);
      continue;
    }
    const quote = parseSingleBrokerLine(line, `parsed_${Date.now()}_${++idx}`, gbpEurFx);
    // TTF is a gas index, not an order-book row: it only becomes a mark.
    if (quote && quote.marketId !== 'GAS_TTF') quotes.push(quote);
    else if (!quote) skippedLines.push(line);
  }
  return { quotes, skippedLines, inferredSource };
}
