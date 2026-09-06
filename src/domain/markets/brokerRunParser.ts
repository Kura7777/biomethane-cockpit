import { BrokerMarketQuote, ProductClass } from './brokerMarketData';

export interface BrokerRunParseResult {
  quotes: BrokerMarketQuote[];
  rawLineCount: number;
  parsedQuoteCount: number;
  skippedLines: string[];
  inferredSource: 'STX' | 'ACT' | 'MAREX' | 'CFP' | 'GENERIC_OTC';
}

/**
 * Normalizes text lines and parses free-form OTC broker runs from European desks.
 */
export function parseBrokerRunText(rawText: string): BrokerRunParseResult {
  if (!rawText || !rawText.trim()) {
    return {
      quotes: [],
      rawLineCount: 0,
      parsedQuoteCount: 0,
      skippedLines: [],
      inferredSource: 'GENERIC_OTC',
    };
  }

  // Infer broker source if mentioned in headers
  let inferredSource: BrokerRunParseResult['inferredSource'] = 'GENERIC_OTC';
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
    // Ignore pure headers or greetings
    if (/^(hi|hello|morning|afternoon|broker|market update|runs|bids|offers|desk)/i.test(line) && !/\d/.test(line)) {
      skippedLines.push(line);
      continue;
    }

    const quote = parseSingleBrokerLine(line, `parsed_${Date.now()}_${++idx}`);
    if (quote) {
      quotes.push(quote);
    } else {
      skippedLines.push(line);
    }
  }

  return {
    quotes,
    rawLineCount: lines.length,
    parsedQuoteCount: quotes.length,
    skippedLines,
    inferredSource,
  };
}

/**
 * Regex parser for a single line from a broker run.
 */
function parseSingleBrokerLine(line: string, id: string): BrokerMarketQuote | null {
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
  const vintage = vintageMatch ? vintageMatch[0].toUpperCase().replace(/\s+/, '') : '2026';

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
  let productClass: ProductClass = 'GO_VOLUNTARY';
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
    ciScore: ciScore || (feedstock.includes('Manure') ? '<-100gCO2/MJ' : '<20gCO2/MJ'),
    bidPrice,
    offerPrice,
    bidVolume: bidVolume || '10GWh',
    offerVolume: offerVolume || '10GWh',
    currency,
    numericBidEurMwh: numericBid,
    numericOfferEurMwh: numericOffer,
    highlight: isHighValue,
    derivedFrom: 'Imported OTC Broker Sheet / Bilateral Run',
    provenanceTier: 'BROKER_RUN',
  };
}
