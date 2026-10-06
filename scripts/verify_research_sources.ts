/**
 * Automated source verification script for biomethane counterparty research.
 *
 * Usage:
 *   npx vite-node scripts/verify_research_sources.ts <countryCode>
 *   e.g. npx vite-node scripts/verify_research_sources.ts es
 *
 * Verifies every SourcedValue, contact, and registration ID:
 * - DNS domain check
 * - HTTP GET with redirects, browser User-Agent, and 20s timeout
 * - Normalised content matching (Cloudflare email decode, mailto:, [at], phone digits, CIF)
 * - VIES REST API validation for VAT/CIF IDs
 * - Rate limiting (>= 1s per host) and disk caching in scripts/.source_check_cache.json
 * - Derives effectiveTier (READY | ENTITY_ONLY | UNRESOLVED)
 * Writes data/plant_research/<cc>.verification.json
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dns from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import {
  PlantResearch,
  SourceCheckStatus,
  SourceCheckDetail,
  ContactScope,
  OutreachTier,
  SourcedValue,
  ResearchContact,
} from '../src/domain/plants/types';
import { RAW_BIOMETHANE_PLANTS } from '../src/domain/plants/plantsData';
import { normalizePlantRegistry } from '../src/domain/plants/dataQuality';
import { regenerate } from './lib/plantResearchWriter';

const NORMALIZED_PLANTS = normalizePlantRegistry(RAW_BIOMETHANE_PLANTS);
const NORMALIZED_PLANTS_BY_ID = new Map(NORMALIZED_PLANTS.map(p => [p.id, p]));

// Allow intermediate cert bundles common on Spanish regional govt & corporate sites
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface FieldVerification extends SourceCheckDetail {
  sourceUrl?: string;
  matchedOnPage?: boolean;
}

export interface ContactVerification extends FieldVerification {
  value: string;
  type: string;
  contactScope?: ContactScope;
}

export interface PlantVerificationRecord {
  plantId: string;
  effectiveTier: OutreachTier;
  legalEntity?: FieldVerification;
  registrationId?: FieldVerification;
  website?: FieldVerification;
  plantLink?: FieldVerification;
  parentGroup?: FieldVerification;
  siteAddress?: FieldVerification;
  siteCoordinates?: FieldVerification;
  contacts: ContactVerification[];
  injectionOrOfftakeNotes: FieldVerification[];
}

export interface CountryVerificationFile {
  countryCode: string;
  verifiedAt: string;
  counts: {
    totalPlants: number;
    effectiveTiers: Record<OutreachTier, number>;
    statusCounts: Record<SourceCheckStatus, number>;
    contactsTotal: number;
    contactsVerified: number;
  };
  plants: Record<string, PlantVerificationRecord>;
}

export interface HttpCacheEntry {
  url: string;
  fetchedAt: string;
  status: number;
  finalUrl: string;
  bodyText: string;
  contentType: string;
  dnsFail?: boolean;
  blocked?: boolean;
  error?: string;
}

export interface ViesCacheEntry {
  vatNumber: string;
  countryCode: string;
  checkedAt: string;
  isValid: boolean;
  name: string;
  address: string;
  raw?: any;
}

export interface CompaniesHouseCacheEntry {
  companyNumber: string;
  checkedAt: string;
  isValid: boolean;
  registeredName: string;
  companyStatus: string;
  raw?: any;
  error?: string;
}

export interface VerificationCache {
  http: Record<string, HttpCacheEntry>;
  vies: Record<string, ViesCacheEntry>;
  companiesHouse?: Record<string, CompaniesHouseCacheEntry>;
  dns: Record<string, { resolved: boolean; checkedAt: string; error?: string }>;
}

const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'scripts', '.source_check_cache.json');
const DATA_DIR = path.join(ROOT, 'data', 'plant_research');

// --- Helper Functions for HTML & Text Normalisation ---

/**
 * Decodes Cloudflare email protection string from data-cfemail hex attribute
 * or /cdn-cgi/l/email-protection#<hex>.
 */
export function decodeCloudflareEmail(hex: string): string {
  if (!hex || hex.length < 2) return '';
  try {
    const key = parseInt(hex.substring(0, 2), 16);
    let email = '';
    for (let n = 2; n < hex.length; n += 2) {
      const charCode = parseInt(hex.substring(n, n + 2), 16) ^ key;
      email += String.fromCharCode(charCode);
    }
    return email;
  } catch {
    return '';
  }
}

/**
 * Decodes HTML entities including named, decimal, and hex numeric references.
 */
export function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });
}

/**
 * Normalises raw HTML text by:
 * - Extracting mailto: and tel: links
 * - Decoding Cloudflare emails
 * - Stripping HTML tags
 * - Decoding HTML entities
 * - Converting [at], (at), and ' at ' obfuscations to @
 * - Converting [dot], (dot), and ' dot ' to .
 * - Collapsing whitespace
 */
export function normalizeHtmlText(rawHtml: string): string {
  if (!rawHtml) return '';

  const extraTokens: string[] = [];

  // Extract mailto: links
  const mailtoRegex = /href=["']mailto:([^"'?]+)[^"']*["']/gi;
  let match: RegExpExecArray | null;
  while ((match = mailtoRegex.exec(rawHtml)) !== null) {
    extraTokens.push(match[1].trim());
  }

  // Extract tel: links
  const telRegex = /href=["']tel:([^"']+)["']/gi;
  while ((match = telRegex.exec(rawHtml)) !== null) {
    extraTokens.push(match[1].trim());
  }

  // Extract Cloudflare protected emails (data-cfemail="...")
  const cfEmailRegex = /data-cfemail=["']([0-9a-fA-F]+)["']/gi;
  while ((match = cfEmailRegex.exec(rawHtml)) !== null) {
    const decoded = decodeCloudflareEmail(match[1]);
    if (decoded) extraTokens.push(decoded);
  }

  // Extract Cloudflare protection links (/cdn-cgi/l/email-protection#...)
  const cfLinkRegex = /email-protection#([0-9a-fA-F]+)/gi;
  while ((match = cfLinkRegex.exec(rawHtml)) !== null) {
    const decoded = decodeCloudflareEmail(match[1]);
    if (decoded) extraTokens.push(decoded);
  }

  // Extract page title
  const titleRegex = /<title[^>]*>([^<]*)<\/title>/gi;
  while ((match = titleRegex.exec(rawHtml)) !== null) {
    if (match[1]?.trim()) extraTokens.push(match[1].trim());
  }

  // Extract meta description and og tags
  const metaRegex1 = /<meta[^>]+(?:name|property)=["'](?:description|og:description|og:title)["'][^>]+content=["']([^"']+)["']/gi;
  while ((match = metaRegex1.exec(rawHtml)) !== null) {
    if (match[1]?.trim()) extraTokens.push(match[1].trim());
  }
  const metaRegex2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description|og:title)["']/gi;
  while ((match = metaRegex2.exec(rawHtml)) !== null) {
    if (match[1]?.trim()) extraTokens.push(match[1].trim());
  }

  // Strip scripts and styles
  let clean = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  // Strip tags
  clean = clean.replace(/<[^>]+>/g, ' ');

  // Decode entities
  clean = decodeHtmlEntities(clean);

  // Normalise email obfuscation patterns (e.g. name [at] domain [dot] com, name(at)domain(dot)com)
  clean = clean
    .replace(/\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\[\s*@\s*\]|\(\s*@\s*\))\s*/gi, '@')
    .replace(/\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\[\s*\.\s*\]|\(\s*\.\s*\))\s*/gi, '.');

  // Append extracted tokens
  if (extraTokens.length > 0) {
    clean += ' ' + extraTokens.join(' ');
  }

  // Normalize whitespace
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Normalises phone numbers to comparison digits, stripping non-digits
 * and common country code prefixes (+34, 0034, +44, 0044).
 */
export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Spain prefix 34 or 0034 with 9 digits
  if (digits.startsWith('0034') && digits.length >= 13) return digits.substring(4);
  if (digits.startsWith('34') && digits.length === 11) return digits.substring(2);
  // UK prefix 44 or 0044
  if (digits.startsWith('0044') && digits.length >= 14) return digits.substring(4);
  if (digits.startsWith('44') && digits.length >= 12) return digits.substring(2);
  // Leading 0 in local UK numbers
  if (digits.startsWith('0') && digits.length === 11) return digits.substring(1);
  return digits;
}

/**
 * Checks if an email address appears in normalised page text.
 */
export function matchEmailOnPage(email: string, pageText: string): boolean {
  if (!email || !pageText) return false;
  const target = email.trim().toLowerCase();
  return pageText.toLowerCase().includes(target);
}

/**
 * Checks if a phone number appears in normalised page text.
 */
export function matchPhoneOnPage(phone: string, pageText: string): boolean {
  if (!phone || !pageText) return false;
  const targetDigits = normalizePhoneDigits(phone);
  if (!targetDigits || targetDigits.length < 7) return false;

  // Check direct presence of target digits in page text
  if (pageText.includes(targetDigits)) return true;

  // Check digit stream in page text
  const pageDigits = pageText.replace(/\D/g, '');
  if (pageDigits.includes(targetDigits)) return true;

  return false;
}

/**
 * Normalises CIF / VAT strings by removing spaces, dots, and hyphens.
 */
export function cleanCif(cif: string): string {
  return cif.replace(/[\s.-]/g, '').toUpperCase();
}

/**
 * Checks if a CIF / registration ID appears on the page text.
 */
export function matchCifOnPage(cif: string, pageText: string): boolean {
  if (!cif || !pageText) return false;
  const cleanedTarget = cleanCif(cif);
  if (cleanedTarget.length < 5) return false;

  // Direct match in cleaned page text
  const cleanedPage = cleanCif(pageText);
  if (cleanedPage.includes(cleanedTarget)) return true;

  // Try stripping common prefixes (Company number, Company No, CRN, CIF, NIF, VAT)
  const strippedTarget = cleanCif(cif.replace(/^(company\s*number|company\s*no\.?|crn|cif|nif|fn|vat)[\s:]*/i, '').trim());
  if (strippedTarget.length >= 5 && cleanedPage.includes(strippedTarget)) {
    return true;
  }

  return false;
}

/**
 * Matches a string or multi-word term on the page text case-insensitively.
 */
export function matchStringOnPage(target: string, pageText: string, minLength = 4): boolean {
  if (!target || !pageText) return false;
  const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normTarget = stripAccents(target.toLowerCase()).replace(/[\s,.-]+/g, ' ').trim();
  const normPage = stripAccents(pageText.toLowerCase()).replace(/[\s,.-]+/g, ' ');
  if (normTarget.length < minLength) return false;

  if (normPage.includes(normTarget)) return true;

  // Fuzzy match on distinctive words if target has 3+ words (e.g. legal company name)
  const words = normTarget.split(' ').filter(w => w.length >= 4 && !['sociedad', 'limitada', 'anonima', 'sl', 'sa', 'slu', 'sau', 'the', 'and', 'company', 'corp', 'de', 'del', 'la', 'el', 'los', 'las', 'en'].includes(w));
  if (words.length >= 2) {
    const allWordsPresent = words.every(w => normPage.includes(w));
    if (allWordsPresent) return true;
  }

  return false;
}

/**
 * Normalises company names for comparison against official registers (e.g. Companies House).
 * Handles uppercase conversion, stripping accents, HTML entities (&AMP; -> AND),
 * normalising Ltd/Limited, PLC, and removing punctuation and whitespace.
 */
export function normalizeCompanyName(name: string): string {
  return (name || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&AMP;/gi, 'AND')
    .replace(/&/g, 'AND')
    .replace(/\bLIMITED\b/gi, 'LTD')
    .replace(/\bPUBLIC LIMITED COMPANY\b/gi, 'PLC')
    .replace(/[^A-Z0-9]/gi, '')
    .trim();
}

/**
 * Checks whether an expected legalEntity name matches the registered Companies House name.
 */
export function matchCompanyName(expected: string, registered: string): boolean {
  const normExpected = normalizeCompanyName(expected);
  const normRegistered = normalizeCompanyName(registered);
  if (!normExpected || !normRegistered) return false;
  return (
    normExpected === normRegistered ||
    normRegistered.includes(normExpected) ||
    normExpected.includes(normRegistered)
  );
}

/**
 * Extracts town, site name, locality, and unique identifiers (GGCS/ODRE/MaStR/permits)
 * for strict plant-link verification.
 */
export function extractPlantSiteTokens(plant: PlantResearch): string[] {
  const tokens = new Set<string>();

  // 1. From RAW_BIOMETHANE_PLANTS name
  const raw = RAW_BIOMETHANE_PLANTS.find(p => p.id === plant.plantId);
  if (raw && raw.name) {
    const rawName = raw.name.trim();
    // Add raw name if distinctive
    const cleanRaw = rawName.replace(/\b(biomethane|biogas|plant|facility|ad|area|estate|centrale|instalación|estación)\b/gi, '').trim();
    if (cleanRaw.length >= 3) {
      tokens.add(cleanRaw);
    }
    // Split on delimiters (commas, slashes, parens)
    rawName.split(/[,/()]/).forEach(part => {
      const p = part.replace(/\b(biomethane|biogas|plant|facility|ad|area|estate|ltd|limited|gmbh|sl|sa)\b/gi, '').trim();
      if (p.length >= 3 && !['the', 'and', 'near', 'limited', 'ltd'].includes(p.toLowerCase())) {
        tokens.add(p);
      }
    });
  }

  // 2. From research.siteAddress locality / town
  if (plant.siteAddress && plant.siteAddress.value) {
    const parts = plant.siteAddress.value.split(',');
    parts.forEach(part => {
      const p = part.replace(/\b(polígon|industrial|parcel·la|parcela|poligono|calle|carrer|estate|park|road|street|lane|close|avenue)\b/gi, '').trim();
      if (p.length >= 3 && !/^\d+/.test(p) && !/^(uk|united kingdom|spain|españa)$/i.test(p)) {
        tokens.add(p);
      }
    });
  }

  // 3. Unique plant identifiers (GGCS ID, ODRE ID, MaStR ID, EPR permit numbers)
  if (plant.registrationId && plant.registrationId.value) {
    tokens.add(plant.registrationId.value);
  }
  for (const n of plant.injectionOrOfftakeNotes || []) {
    const idMatches = n.value.match(/\b(GGCS-[A-Z0-9-]+|ODRE-[A-Z0-9-]+|SEE[0-9]{11,}|EPR\/[A-Z0-9]+)\b/gi);
    if (idMatches) {
      idMatches.forEach(m => tokens.add(m));
    }
  }

  return Array.from(tokens).filter(t => t.length >= 3);
}

/**
 * Computes the great-circle distance between two coordinates in kilometres using the Haversine formula.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extracts a concise locality string (town/district, county) from a site address.
 */
export function extractLocality(siteAddress?: string | null): string {
  if (!siteAddress) return '';
  const parts = siteAddress.split(',').map(s => s.trim()).filter(Boolean);
  const nonPostcode = parts.filter(p =>
    !/^[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}$/i.test(p) &&
    !/^\d{5}$/.test(p) &&
    !/^(uk|united kingdom|spain|españa)$/i.test(p)
  );
  if (nonPostcode.length === 0) return parts[0] || '';
  if (nonPostcode.length >= 2) {
    return `${nonPostcode[0]}, ${nonPostcode[1]}`;
  }
  return nonPostcode[0];
}

/**
 * Checks whether an approximate plant's researched site address matches the official census name.
 */
export function checkLocalityMatchesCensus(censusName: string, siteAddress?: string | null): boolean {
  if (!siteAddress) return false;
  const normAddress = siteAddress.toLowerCase();

  const stopWords = new Set([
    'the', 'and', 'near', 'area', 'biometano', 'biogas', 'plant', 'facility',
    'edar', 'ctr', 'bioenergía', 'bioenergia', 'planta', 'de', 'del', 'en',
    'la', 'las', 'los', 'ad'
  ]);
  const cleanTokens = censusName
    .replace(/[/(),.-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length >= 3 && !stopWords.has(t));

  if (cleanTokens.length === 0) {
    return true;
  }

  return cleanTokens.some(token => normAddress.includes(token));
}

// --- Rate Limiter & Disk Cache ---

export class VerifierEngine {
  private cache: VerificationCache = { http: {}, vies: {}, dns: {} };
  private lastHostRequest: Map<string, number> = new Map();
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    if (fs.existsSync(CACHE_PATH)) {
      try {
        const raw = fs.readFileSync(CACHE_PATH, 'utf8');
        this.cache = JSON.parse(raw);
        if (!this.cache.http) this.cache.http = {};
        if (!this.cache.vies) this.cache.vies = {};
        if (!this.cache.companiesHouse) this.cache.companiesHouse = {};
        if (!this.cache.dns) this.cache.dns = {};
      } catch {
        this.cache = { http: {}, vies: {}, companiesHouse: {}, dns: {} };
      }
    }
  }

  public saveCache(): void {
    try {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save cache:', err);
    }
  }

  public async checkDns(hostname: string): Promise<{ resolved: boolean; error?: string }> {
    if (!hostname) return { resolved: false, error: 'Empty hostname' };
    const cached = this.cache.dns[hostname];
    if (cached) return cached;

    try {
      await dns.lookup(hostname);
      const res = { resolved: true, checkedAt: new Date().toISOString() };
      this.cache.dns[hostname] = res;
      return res;
    } catch (err: any) {
      // Fallback: try www.<hostname> or strip www.
      const altHostname = hostname.startsWith('www.')
        ? hostname.substring(4)
        : `www.${hostname}`;
      try {
        await dns.lookup(altHostname);
        const res = { resolved: true, checkedAt: new Date().toISOString() };
        this.cache.dns[hostname] = res;
        return res;
      } catch {
        const res = { resolved: false, checkedAt: new Date().toISOString(), error: err.code || err.message };
        this.cache.dns[hostname] = res;
        return res;
      }
    }
  }

  private async rateLimitHost(hostname: string): Promise<void> {
    const last = this.lastHostRequest.get(hostname) || 0;
    const now = Date.now();
    const elapsed = now - last;
    if (elapsed < 1000) {
      await new Promise(r => setTimeout(r, 1000 - elapsed));
    }
    this.lastHostRequest.set(hostname, Date.now());
  }

  public async fetchUrl(url: string, bypassCache = false): Promise<HttpCacheEntry> {
    if (!bypassCache && this.cache.http[url]) {
      return this.cache.http[url];
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (err: any) {
      const entry: HttpCacheEntry = {
        url,
        fetchedAt: new Date().toISOString(),
        status: 0,
        finalUrl: url,
        bodyText: '',
        contentType: '',
        error: `Invalid URL: ${err.message}`,
      };
      this.cache.http[url] = entry;
      return entry;
    }

    // Check DNS first
    const dnsResult = await this.checkDns(parsedUrl.hostname);
    if (!dnsResult.resolved) {
      const entry: HttpCacheEntry = {
        url,
        fetchedAt: new Date().toISOString(),
        status: 0,
        finalUrl: url,
        bodyText: '',
        contentType: '',
        dnsFail: true,
        error: `DNS resolution failed: ${dnsResult.error}`,
      };
      this.cache.http[url] = entry;
      return entry;
    }

    await this.rateLimitHost(parsedUrl.hostname);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      });

      const status = res.status;
      const finalUrl = res.url;
      const contentType = res.headers.get('content-type') || '';

      const isBlocked = status === 401 || status === 403 || status === 429;
      let bodyText = '';

      if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
        bodyText = '[PDF CONTENT]';
      } else {
        const rawHtml = await res.text();
        // Check if Cloudflare challenge page
        if (rawHtml.includes('cf-browser-verification') || rawHtml.includes('Just a moment...') || rawHtml.includes('Attention Required! | Cloudflare')) {
          const entry: HttpCacheEntry = {
            url,
            fetchedAt: new Date().toISOString(),
            status,
            finalUrl,
            bodyText: '',
            contentType,
            blocked: true,
            error: 'Cloudflare challenge page',
          };
          this.cache.http[url] = entry;
          return entry;
        }
        bodyText = normalizeHtmlText(rawHtml);
      }

      const entry: HttpCacheEntry = {
        url,
        fetchedAt: new Date().toISOString(),
        status,
        finalUrl,
        bodyText,
        contentType,
        blocked: isBlocked,
      };

      this.cache.http[url] = entry;
      return entry;
    } catch (err: any) {
      const entry: HttpCacheEntry = {
        url,
        fetchedAt: new Date().toISOString(),
        status: 0,
        finalUrl: url,
        bodyText: '',
        contentType: '',
        error: err.name === 'TimeoutError' ? 'HTTP request timed out (20s)' : err.message,
      };
      this.cache.http[url] = entry;
      return entry;
    }
  }

  public async checkVies(countryCode: string, vatNumber: string, bypassCache = false): Promise<ViesCacheEntry> {
    const cleanNum = vatNumber.replace(/^(ES|GB)/i, '').replace(/[\s.-]/g, '').toUpperCase();
    const cacheKey = `${countryCode.toUpperCase()}_${cleanNum}`;

    if (!bypassCache && this.cache.vies[cacheKey]) {
      return this.cache.vies[cacheKey];
    }

    const viesUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode.toUpperCase()}/vat/${cleanNum}`;
    await this.rateLimitHost('ec.europa.eu');

    try {
      const res = await fetch(viesUrl, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const entry: ViesCacheEntry = {
          vatNumber: cleanNum,
          countryCode: countryCode.toUpperCase(),
          checkedAt: new Date().toISOString(),
          isValid: false,
          name: '',
          address: '',
          raw: { status: res.status },
        };
        this.cache.vies[cacheKey] = entry;
        return entry;
      }

      const data = await res.json();
      const entry: ViesCacheEntry = {
        vatNumber: cleanNum,
        countryCode: countryCode.toUpperCase(),
        checkedAt: new Date().toISOString(),
        isValid: Boolean(data.isValid),
        name: data.name || '',
        address: data.address || '',
        raw: data,
      };

      this.cache.vies[cacheKey] = entry;
      return entry;
    } catch (err: any) {
      const entry: ViesCacheEntry = {
        vatNumber: cleanNum,
        countryCode: countryCode.toUpperCase(),
        checkedAt: new Date().toISOString(),
        isValid: false,
        name: '',
        address: '',
        raw: { error: err.message },
      };
      this.cache.vies[cacheKey] = entry;
      return entry;
    }
  }

  public async checkCompaniesHouse(companyNumber: string, bypassCache = false): Promise<CompaniesHouseCacheEntry> {
    const cleanNum = companyNumber.replace(/^(Company\s+No\.?|CRN|No\.?)\s*/i, '').replace(/[\s.-]/g, '').toUpperCase();
    const cacheKey = cleanNum;

    if (!bypassCache && this.cache.companiesHouse && this.cache.companiesHouse[cacheKey]) {
      return this.cache.companiesHouse[cacheKey];
    }

    const chUrl = `https://find-and-update.company-information.service.gov.uk/company/${cleanNum}`;
    await this.rateLimitHost('find-and-update.company-information.service.gov.uk');

    try {
      const res = await fetch(chUrl, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const entry: CompaniesHouseCacheEntry = {
          companyNumber: cleanNum,
          checkedAt: new Date().toISOString(),
          isValid: false,
          registeredName: '',
          companyStatus: res.status === 404 ? 'PAGE_NOT_FOUND' : 'ERROR',
          error: `Companies House HTTP ${res.status}`,
        };
        if (!this.cache.companiesHouse) this.cache.companiesHouse = {};
        this.cache.companiesHouse[cacheKey] = entry;
        return entry;
      }

      const html = await res.text();
      const heading = html.match(/<h1[^>]*class=["'][^"']*heading[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                      html.match(/<title[^>]*>([\s\S]*?) overview/i);
      const statusMatch = html.match(/id=["']company-status["'][^>]*>([\s\S]*?)<\/dd>/i);
      const registeredName = heading ? heading[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
      const companyStatus = statusMatch ? statusMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : 'Unknown';

      const entry: CompaniesHouseCacheEntry = {
        companyNumber: cleanNum,
        checkedAt: new Date().toISOString(),
        isValid: res.status === 200 && Boolean(registeredName),
        registeredName,
        companyStatus,
      };

      if (!this.cache.companiesHouse) this.cache.companiesHouse = {};
      this.cache.companiesHouse[cacheKey] = entry;
      return entry;
    } catch (err: any) {
      const entry: CompaniesHouseCacheEntry = {
        companyNumber: cleanNum,
        checkedAt: new Date().toISOString(),
        isValid: false,
        registeredName: '',
        companyStatus: 'ERROR',
        error: err.message,
      };
      if (!this.cache.companiesHouse) this.cache.companiesHouse = {};
      this.cache.companiesHouse[cacheKey] = entry;
      return entry;
    }
  }
}

// --- Effective Tier Calculation Function ---

export function computeEffectiveTier(
  legalEntityCheck?: SourceCheckDetail | null,
  registrationIdCheck?: SourceCheckDetail | null,
  plantLinkCheck?: SourceCheckDetail | null,
  verifiedContacts: { contactScope?: ContactScope }[] = [],
  hasGeographyMismatch = false
): OutreachTier {
  // A failed registrationId must stop the record counting as a verified entity
  if (registrationIdCheck && registrationIdCheck.status !== 'VERIFIED') {
    return 'UNRESOLVED';
  }

  const isLegalEntityVerified = legalEntityCheck?.status === 'VERIFIED';
  const isRegistrationIdVerified = registrationIdCheck?.status === 'VERIFIED';
  const isPlantLinkVerified = plantLinkCheck?.status === 'VERIFIED';

  const hasCommercialOrOperatorContact = verifiedContacts.some(
    c => c.contactScope === 'PLANT_OPERATOR' || c.contactScope === 'PARENT_COMMERCIAL'
  );

  // READY requires:
  // - legalEntity VERIFIED
  // - plantLink VERIFIED
  // - at least one verified contact with scope PLANT_OPERATOR or PARENT_COMMERCIAL
  // - no geography mismatch
  if (isLegalEntityVerified && isPlantLinkVerified && hasCommercialOrOperatorContact && !hasGeographyMismatch) {
    return 'READY';
  }

  // ENTITY_ONLY = legalEntity or registrationId verified, but READY not met
  if (isLegalEntityVerified || isRegistrationIdVerified) {
    return 'ENTITY_ONLY';
  }

  return 'UNRESOLVED';
}

// --- Main Verification Process per Plant ---

export async function verifyPlantRecord(
  plant: PlantResearch,
  engine: VerifierEngine
): Promise<PlantVerificationRecord> {
  const record: PlantVerificationRecord = {
    plantId: plant.plantId,
    effectiveTier: 'UNRESOLVED',
    contacts: [],
    injectionOrOfftakeNotes: [],
  };

  const checkedAt = new Date().toISOString();

  // Helper to verify a URL
  async function checkUrl(url: string): Promise<HttpCacheEntry> {
    return engine.fetchUrl(url);
  }

  // 1. Verify legalEntity
  if (plant.legalEntity && plant.legalEntity.sourceUrl) {
    const httpRes = await checkUrl(plant.legalEntity.sourceUrl);
    if (httpRes.dnsFail) {
      record.legalEntity = { status: 'DNS_FAIL', checkedAt, sourceUrl: plant.legalEntity.sourceUrl, error: httpRes.error };
    } else if (httpRes.status === 404) {
      record.legalEntity = { status: 'PAGE_NOT_FOUND', checkedAt, sourceUrl: plant.legalEntity.sourceUrl, httpStatus: 404 };
    } else if (httpRes.blocked) {
      record.legalEntity = { status: 'BLOCKED', checkedAt, sourceUrl: plant.legalEntity.sourceUrl, httpStatus: httpRes.status, error: httpRes.error };
    } else if (httpRes.contentType.includes('application/pdf') || plant.legalEntity.sourceUrl.toLowerCase().endsWith('.pdf')) {
      record.legalEntity = { status: 'PDF_UNCHECKED', checkedAt, sourceUrl: plant.legalEntity.sourceUrl, httpStatus: httpRes.status };
    } else if (httpRes.status >= 200 && httpRes.status < 300) {
      const match = matchStringOnPage(plant.legalEntity.value, httpRes.bodyText);
      record.legalEntity = {
        status: match ? 'VERIFIED' : 'NOT_ON_PAGE',
        checkedAt,
        sourceUrl: plant.legalEntity.sourceUrl,
        httpStatus: httpRes.status,
        finalUrl: httpRes.finalUrl,
        matchedOnPage: match,
      };
    } else {
      record.legalEntity = { status: 'ERROR', checkedAt, sourceUrl: plant.legalEntity.sourceUrl, httpStatus: httpRes.status, error: httpRes.error };
    }
  }

  // 2. Verify registrationId
  if (plant.registrationId && plant.registrationId.sourceUrl) {
    const srcUrl = plant.registrationId.sourceUrl;
    // Check if VIES REST URL
    if (srcUrl.includes('ec.europa.eu/taxation_customs/vies/rest-api')) {
      const vatMatch = srcUrl.match(/\/ms\/([A-Z]{2})\/vat\/([A-Za-z0-9]+)/i);
      if (vatMatch) {
        const cc = vatMatch[1].toUpperCase();
        const num = vatMatch[2].toUpperCase();
        const viesRes = await engine.checkVies(cc, num);
        record.registrationId = {
          status: viesRes.isValid ? 'VERIFIED' : 'NOT_ON_PAGE',
          checkedAt,
          sourceUrl: srcUrl,
          viesValid: viesRes.isValid,
          httpStatus: 200,
        };
      } else {
        record.registrationId = { status: 'ERROR', checkedAt, sourceUrl: srcUrl, error: 'Could not parse VIES REST URL' };
      }
    } else if (
      srcUrl.includes('company-information.service.gov.uk/company/') ||
      plant.plantId.startsWith('plant_uk_') ||
      /Company\s+No\.?|CRN/i.test(plant.registrationId.value)
    ) {
      // Companies House check for GB registration IDs
      const rawCrn = srcUrl.match(/\/company\/([A-Za-z0-9]+)/i)?.[1] ||
                     plant.registrationId.value.replace(/^(Company\s+No\.?|CRN|No\.?)\s*/i, '').replace(/[\s.-]/g, '');
      const crn = rawCrn.trim().toUpperCase();
      if (crn && crn.length >= 6) {
        const chRes = await engine.checkCompaniesHouse(crn);
        if (chRes.isValid) {
          const isDissolved = chRes.companyStatus.toLowerCase().includes('dissolved') ||
                              chRes.companyStatus.toLowerCase().includes('converted-closed');
          const isNameMatch = plant.legalEntity ? matchCompanyName(plant.legalEntity.value, chRes.registeredName) : false;

          if (isNameMatch && !isDissolved) {
            record.registrationId = {
              status: 'VERIFIED',
              checkedAt,
              sourceUrl: srcUrl,
              httpStatus: 200,
              matchedOnPage: true,
              companyStatus: chRes.companyStatus,
            };
          } else {
            record.registrationId = {
              status: 'NOT_ON_PAGE',
              checkedAt,
              sourceUrl: srcUrl,
              httpStatus: 200,
              matchedOnPage: false,
              companyStatus: chRes.companyStatus,
              error: `Companies House: "${chRes.registeredName}" (status: ${chRes.companyStatus})`,
            };
          }

          // If Companies House status isn't "Active" (e.g. BrewDog PLC — In Administration), add open question
          if (chRes.companyStatus && chRes.companyStatus.toLowerCase() !== 'active') {
            const statusQ = `Company status: ${chRes.companyStatus} — assess counterparty risk`;
            plant.openQuestions = plant.openQuestions || [];
            if (!plant.openQuestions.some(q => q.toLowerCase().startsWith('company status:'))) {
              plant.openQuestions.unshift(statusQ);
            }
          }
        } else if (chRes.companyStatus === 'PAGE_NOT_FOUND') {
          record.registrationId = {
            status: 'PAGE_NOT_FOUND',
            checkedAt,
            sourceUrl: srcUrl,
            httpStatus: 404,
            error: `Companies House: CRN ${crn} not found`,
          };
        } else {
          record.registrationId = {
            status: 'ERROR',
            checkedAt,
            sourceUrl: srcUrl,
            error: chRes.error || `Companies House check failed for ${crn}`,
          };
        }
      } else {
        record.registrationId = {
          status: 'ERROR',
          checkedAt,
          sourceUrl: srcUrl,
          error: 'Could not extract CRN from registrationId or sourceUrl',
        };
      }
    } else {
      // General web page check
      const httpRes = await checkUrl(srcUrl);
      if (httpRes.dnsFail) {
        record.registrationId = { status: 'DNS_FAIL', checkedAt, sourceUrl: srcUrl, error: httpRes.error };
      } else if (httpRes.status === 404) {
        record.registrationId = { status: 'PAGE_NOT_FOUND', checkedAt, sourceUrl: srcUrl, httpStatus: 404 };
      } else if (httpRes.blocked) {
        record.registrationId = { status: 'BLOCKED', checkedAt, sourceUrl: srcUrl, httpStatus: httpRes.status, error: httpRes.error };
      } else if (httpRes.contentType.includes('application/pdf') || srcUrl.toLowerCase().endsWith('.pdf')) {
        record.registrationId = { status: 'PDF_UNCHECKED', checkedAt, sourceUrl: srcUrl, httpStatus: httpRes.status };
      } else if (httpRes.status >= 200 && httpRes.status < 300) {
        const match = matchCifOnPage(plant.registrationId.value, httpRes.bodyText);
        record.registrationId = {
          status: match ? 'VERIFIED' : 'NOT_ON_PAGE',
          checkedAt,
          sourceUrl: srcUrl,
          httpStatus: httpRes.status,
          finalUrl: httpRes.finalUrl,
          matchedOnPage: match,
        };
      } else {
        record.registrationId = { status: 'ERROR', checkedAt, sourceUrl: srcUrl, httpStatus: httpRes.status, error: httpRes.error };
      }
    }
  }

  // 3. Verify website
  if (plant.website && plant.website.value) {
    const webUrl = plant.website.value;
    const httpRes = await checkUrl(webUrl);
    if (httpRes.dnsFail) {
      record.website = { status: 'DNS_FAIL', checkedAt, sourceUrl: webUrl, error: httpRes.error };
    } else if (httpRes.status === 404) {
      record.website = { status: 'PAGE_NOT_FOUND', checkedAt, sourceUrl: webUrl, httpStatus: 404 };
    } else if (httpRes.blocked) {
      record.website = { status: 'BLOCKED', checkedAt, sourceUrl: webUrl, httpStatus: httpRes.status, error: httpRes.error };
    } else if (httpRes.status >= 200 && httpRes.status < 400) {
      record.website = { status: 'VERIFIED', checkedAt, sourceUrl: webUrl, httpStatus: httpRes.status, finalUrl: httpRes.finalUrl };
    } else {
      record.website = { status: 'ERROR', checkedAt, sourceUrl: webUrl, httpStatus: httpRes.status, error: httpRes.error };
    }
  }

  // 4. Verify plantLink
  if (plant.plantLink && plant.plantLink.sourceUrl) {
    const linkUrl = plant.plantLink.sourceUrl;
    const httpRes = await checkUrl(linkUrl);
    if (httpRes.dnsFail) {
      record.plantLink = { status: 'DNS_FAIL', checkedAt, sourceUrl: linkUrl, error: httpRes.error };
    } else if (httpRes.status === 404) {
      record.plantLink = { status: 'PAGE_NOT_FOUND', checkedAt, sourceUrl: linkUrl, httpStatus: 404 };
    } else if (httpRes.blocked) {
      record.plantLink = { status: 'BLOCKED', checkedAt, sourceUrl: linkUrl, httpStatus: httpRes.status, error: httpRes.error };
    } else if (httpRes.contentType.includes('application/pdf') || linkUrl.toLowerCase().endsWith('.pdf')) {
      record.plantLink = { status: 'PDF_UNCHECKED', checkedAt, sourceUrl: linkUrl, httpStatus: httpRes.status };
    } else if (httpRes.status >= 200 && httpRes.status < 300) {
      // Plant link counts as VERIFIED only if page text contains town/site name or unique ID
      const siteTokens = extractPlantSiteTokens(plant);
      const isMentioned = siteTokens.some(t => matchStringOnPage(t, httpRes.bodyText, 3));
      record.plantLink = {
        status: isMentioned ? 'VERIFIED' : 'NOT_ON_PAGE',
        checkedAt,
        sourceUrl: linkUrl,
        httpStatus: httpRes.status,
        finalUrl: httpRes.finalUrl,
        matchedOnPage: isMentioned,
      };
    } else {
      record.plantLink = { status: 'ERROR', checkedAt, sourceUrl: linkUrl, httpStatus: httpRes.status, error: httpRes.error };
    }
  }

  // 5. Verify parentGroup
  if (plant.parentGroup && plant.parentGroup.sourceUrl) {
    const groupUrl = plant.parentGroup.sourceUrl;
    const httpRes = await checkUrl(groupUrl);
    if (httpRes.status >= 200 && httpRes.status < 400) {
      record.parentGroup = { status: 'VERIFIED', checkedAt, sourceUrl: groupUrl, httpStatus: httpRes.status };
    } else if (httpRes.dnsFail) {
      record.parentGroup = { status: 'DNS_FAIL', checkedAt, sourceUrl: groupUrl };
    } else if (httpRes.status === 404) {
      record.parentGroup = { status: 'PAGE_NOT_FOUND', checkedAt, sourceUrl: groupUrl, httpStatus: 404 };
    } else {
      record.parentGroup = { status: 'ERROR', checkedAt, sourceUrl: groupUrl, httpStatus: httpRes.status };
    }
  }

  // 6. Verify siteAddress
  if (plant.siteAddress && plant.siteAddress.sourceUrl) {
    const addrUrl = plant.siteAddress.sourceUrl;
    const httpRes = await checkUrl(addrUrl);
    if (httpRes.status >= 200 && httpRes.status < 300) {
      const match = matchStringOnPage(plant.siteAddress.value, httpRes.bodyText, 5);
      record.siteAddress = { status: match ? 'VERIFIED' : 'NOT_ON_PAGE', checkedAt, sourceUrl: addrUrl, httpStatus: httpRes.status, matchedOnPage: match };
    } else if (httpRes.dnsFail) {
      record.siteAddress = { status: 'DNS_FAIL', checkedAt, sourceUrl: addrUrl };
    } else if (httpRes.status === 404) {
      record.siteAddress = { status: 'PAGE_NOT_FOUND', checkedAt, sourceUrl: addrUrl, httpStatus: 404 };
    } else {
      record.siteAddress = { status: 'ERROR', checkedAt, sourceUrl: addrUrl, httpStatus: httpRes.status };
    }
  }

  // 7. Verify contacts
  const verifiedContacts: ContactVerification[] = [];
  for (const c of plant.contacts || []) {
    let contactStatus: SourceCheckStatus = 'ERROR';
    let httpStatus: number | undefined;
    let finalUrl: string | undefined;
    let error: string | undefined;
    let matchedOnPage = false;

    // Check contact email / website domain DNS
    if (c.value.includes('@')) {
      const domain = c.value.split('@')[1];
      const dnsCheck = await engine.checkDns(domain);
      if (!dnsCheck.resolved) {
        contactStatus = 'DNS_FAIL';
        error = `Email domain ${domain} DNS failed`;
      }
    } else if (c.type === 'CONTACT_FORM') {
      try {
        const u = new URL(c.value);
        const dnsCheck = await engine.checkDns(u.hostname);
        if (!dnsCheck.resolved) {
          contactStatus = 'DNS_FAIL';
          error = `Contact form domain ${u.hostname} DNS failed`;
        }
      } catch {
        // Not a full URL, might be relative
      }
    }

    if (contactStatus !== 'DNS_FAIL') {
      const httpRes = await checkUrl(c.sourceUrl);
      httpStatus = httpRes.status;
      finalUrl = httpRes.finalUrl;
      error = httpRes.error;

      if (httpRes.dnsFail) {
        contactStatus = 'DNS_FAIL';
      } else if (httpRes.status === 404) {
        contactStatus = 'PAGE_NOT_FOUND';
      } else if (httpRes.blocked) {
        contactStatus = 'BLOCKED';
      } else if (httpRes.contentType.includes('application/pdf') || c.sourceUrl.toLowerCase().endsWith('.pdf')) {
        contactStatus = 'PDF_UNCHECKED';
      } else if (httpRes.status >= 200 && httpRes.status < 300) {
        if (c.value.includes('@') || c.type.includes('EMAIL')) {
          matchedOnPage = matchEmailOnPage(c.value, httpRes.bodyText);
        } else if (c.type === 'COMPANY_SWITCHBOARD' || /\d{7,}/.test(c.value)) {
          matchedOnPage = matchPhoneOnPage(c.value, httpRes.bodyText);
        } else if (c.type === 'CONTACT_FORM') {
          matchedOnPage = httpRes.bodyText.toLowerCase().includes('contact') || httpRes.bodyText.toLowerCase().includes('formulario');
        } else if (c.personName) {
          matchedOnPage = matchStringOnPage(c.personName, httpRes.bodyText);
        } else {
          matchedOnPage = matchStringOnPage(c.value, httpRes.bodyText);
        }
        contactStatus = matchedOnPage ? 'VERIFIED' : 'NOT_ON_PAGE';
      } else {
        contactStatus = 'ERROR';
      }
    }

    const cVer: ContactVerification = {
      value: c.value,
      type: c.type,
      contactScope: c.contactScope,
      status: contactStatus,
      checkedAt,
      sourceUrl: c.sourceUrl,
      httpStatus,
      finalUrl,
      error,
      matchedOnPage,
    };

    record.contacts.push(cVer);
    if (contactStatus === 'VERIFIED') {
      verifiedContacts.push(cVer);
    }
  }

  // 8. Verify injectionOrOfftakeNotes
  for (const n of plant.injectionOrOfftakeNotes || []) {
    const httpRes = await checkUrl(n.sourceUrl);
    record.injectionOrOfftakeNotes.push({
      status: httpRes.status >= 200 && httpRes.status < 300 ? 'VERIFIED' : httpRes.status === 404 ? 'PAGE_NOT_FOUND' : httpRes.dnsFail ? 'DNS_FAIL' : 'ERROR',
      checkedAt,
      sourceUrl: n.sourceUrl,
      httpStatus: httpRes.status,
      finalUrl: httpRes.finalUrl,
    });
  }

  // 9. Geography check:
  // If plant's census coordinates are not a placeholder (!approximateCoordinates) and research.siteCoordinates is set, compute distance.
  // Over 25 km, or research.siteAddress locality ≠ census name when coordinates are approximate
  // -> add open question "GEOGRAPHY_MISMATCH: census says <name>, research says <locality> — confirm this is the same plant"
  // and cap effectiveTier at ENTITY_ONLY.
  const normPlant = NORMALIZED_PLANTS_BY_ID.get(plant.plantId);
  const censusName = normPlant?.name || '';
  const isApproximate = normPlant?.dataQuality?.approximateCoordinates ?? true;
  let hasGeographyMismatch = false;
  let mismatchLocality = '';

  if (!isApproximate && normPlant?.coordinates && plant.siteCoordinates?.value) {
    const dist = haversineDistanceKm(
      normPlant.coordinates[0], normPlant.coordinates[1],
      plant.siteCoordinates.value[0], plant.siteCoordinates.value[1]
    );
    if (dist > 25) {
      hasGeographyMismatch = true;
      mismatchLocality = extractLocality(plant.siteAddress?.value) || `${plant.siteCoordinates.value[0].toFixed(3)}, ${plant.siteCoordinates.value[1].toFixed(3)}`;
    }
  } else if (isApproximate && plant.siteAddress?.value) {
    const matchesLocality = checkLocalityMatchesCensus(censusName, plant.siteAddress.value);
    if (!matchesLocality) {
      hasGeographyMismatch = true;
      mismatchLocality = extractLocality(plant.siteAddress.value);
    }
  }

  if (hasGeographyMismatch) {
    const geoQ = `GEOGRAPHY_MISMATCH: census says ${censusName}, research says ${mismatchLocality} — confirm this is the same plant`;
    plant.openQuestions = plant.openQuestions || [];
    if (!plant.openQuestions.some(q => q.startsWith('GEOGRAPHY_MISMATCH:'))) {
      plant.openQuestions.unshift(geoQ);
    }
  }

  // Derive effective tier
  record.effectiveTier = computeEffectiveTier(
    record.legalEntity,
    record.registrationId,
    record.plantLink,
    verifiedContacts,
    hasGeographyMismatch
  );

  return record;
}

// --- Main Execution Function ---

export async function verifyCountry(countryCode: string): Promise<CountryVerificationFile> {
  const cc = countryCode.toLowerCase();
  const filePath = path.join(DATA_DIR, `${cc}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const countryData = JSON.parse(raw);
  const plants: PlantResearch[] = countryData.plants || [];

  console.log(`Starting automated source verification for ${countryCode.toUpperCase()} (${plants.length} plants)...`);
  const engine = new VerifierEngine();

  const plantRecords: Record<string, PlantVerificationRecord> = {};
  const statusCounts: Record<SourceCheckStatus, number> = {
    VERIFIED: 0,
    NOT_ON_PAGE: 0,
    PAGE_NOT_FOUND: 0,
    DNS_FAIL: 0,
    BLOCKED: 0,
    PDF_UNCHECKED: 0,
    ERROR: 0,
  };
  const tierCounts: Record<OutreachTier, number> = {
    READY: 0,
    ENTITY_ONLY: 0,
    UNRESOLVED: 0,
  };

  let contactsTotal = 0;
  let contactsVerified = 0;

  for (let i = 0; i < plants.length; i++) {
    const p = plants[i];
    console.log(`[${i + 1}/${plants.length}] Verifying ${p.plantId} (${p.legalEntity?.value || 'unnamed'})...`);
    const record = await verifyPlantRecord(p, engine);
    plantRecords[p.plantId] = record;
    tierCounts[record.effectiveTier]++;

    // Accumulate status counts
    const checks: (SourceCheckDetail | undefined)[] = [
      record.legalEntity,
      record.registrationId,
      record.website,
      record.plantLink,
      record.parentGroup,
      record.siteAddress,
      ...record.contacts,
      ...record.injectionOrOfftakeNotes,
    ];

    for (const c of checks) {
      if (c && c.status) {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      }
    }

    for (const c of record.contacts) {
      contactsTotal++;
      if (c.status === 'VERIFIED') contactsVerified++;
    }
  }

  engine.saveCache();

  const verificationFile: CountryVerificationFile = {
    countryCode: countryCode.toUpperCase(),
    verifiedAt: new Date().toISOString(),
    counts: {
      totalPlants: plants.length,
      effectiveTiers: tierCounts,
      statusCounts,
      contactsTotal,
      contactsVerified,
    },
    plants: plantRecords,
  };

  // Persist updated openQuestions to country data file
  fs.writeFileSync(filePath, JSON.stringify(countryData, null, 2) + '\n', 'utf8');

  const outPath = path.join(DATA_DIR, `${cc}.verification.json`);
  fs.writeFileSync(outPath, JSON.stringify(verificationFile, null, 2) + '\n', 'utf8');

  // Regenerate plantResearch.generated.ts with updated checks & questions
  regenerate();

  console.log(`\nVerification complete for ${countryCode.toUpperCase()}:`);
  console.log(`  Effective Tiers: ${JSON.stringify(tierCounts)}`);
  console.log(`  Status Counts:   ${JSON.stringify(statusCounts)}`);
  console.log(`  Contacts:        ${contactsVerified}/${contactsTotal} verified`);
  console.log(`Wrote ${outPath}\n`);

  return verificationFile;
}

// CLI entrypoint
if (!process.env.VITEST && !process.env.VERIFIER_SKIP_CLI) {
  const args = process.argv.slice(2);
  const cc = args.find(a => /^[a-z]{2}$/i.test(a)) || (args[0] && !args[0].startsWith('-') ? args[0] : 'es');
  verifyCountry(cc).catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
}
