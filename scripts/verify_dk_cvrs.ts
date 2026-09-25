/**
 * Checks every Danish plant's CVR number against the Danish Central Business Register,
 * read through lasso.dk (a public CVR mirror: the page for a CVR number carries the
 * registered name and city; unknown numbers return 404). The official CVR API needs
 * registration and datacvr.virk.dk blocks automated requests.
 *
 *   npx vite-node scripts/verify_dk_cvrs.ts
 *
 * CONFIRMED: the CVR exists and its registered name shares a distinctive word with the
 * plant's operator or plant name (generic words like "biogas", "Shell", "ApS" don't count).
 * MISMATCH: the CVR belongs to a differently named company. NOT_FOUND: no such CVR.
 * lasso.dk does not show whether a company has ceased, so `active` is recorded as null.
 */
import { RAW_BIOMETHANE_PLANTS } from '../src/domain/plants/plantsData';
import { CheckResult, CheckStatus, RegisterHit, summarise, writeCountryChecks } from './lib/registrationChecksWriter';

const SOURCE = 'Danish CVR register via lasso.dk';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const decode = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

const cache = new Map<string, RegisterHit | null>();

async function lookup(cvr: string): Promise<RegisterHit | null> {
  if (cache.has(cvr)) return cache.get(cvr)!;
  const res = await fetch(`https://lasso.dk/firmaer/${cvr}`, { headers: { 'User-Agent': 'Mozilla/5.0 (biomethane desk register check)' } });
  let hit: RegisterHit | null = null;
  if (res.status === 200) {
    const html = await res.text();
    const title = decode(html.match(/<title>([^<]*)/)?.[1] ?? '').trim();
    const [name, city] = title.split(' - ').map(s => s.trim());
    if (!name) throw new Error(`unparseable page for ${cvr}`);
    hit = { name, naf: null, active: null, commune: city || null };
  } else if (res.status !== 404) {
    throw new Error(`HTTP ${res.status}`);
  }
  cache.set(cvr, hit);
  await sleep(1000);
  return hit;
}

const GENERIC = new Set(['biogas', 'bioenergi', 'energi', 'energy', 'shell', 'nature', 'gas', 'biogasanlæg', 'anlæg', 'holding', 'danmark']);
const words = (s: string) =>
  s.toLowerCase().normalize('NFC').split(/[^a-zæøå0-9]+/).filter(w => w.length >= 4 && !GENERIC.has(w));

function matches(hit: RegisterHit, plantName: string, operator: string): boolean {
  if (/\bvcs\b/i.test(operator) && /vandcenter\s*syd/i.test(hit.name)) return true;
  const reg = new Set(words(hit.name));
  return [...words(operator), ...words(plantName)].some(w => reg.has(w));
}

async function main() {
  const dk = (RAW_BIOMETHANE_PLANTS as any[]).filter(p => p.countryCode === 'DK' && p.companyRegistrationId);
  const results: CheckResult[] = [];
  for (const p of dk) {
    const claimed = String(p.companyRegistrationId);
    const cvr = claimed.match(/(\d{8})/)?.[1] ?? null;
    let status: CheckStatus = 'NOT_FOUND';
    let register: RegisterHit | null = null;
    if (cvr) {
      try {
        register = await lookup(cvr);
        status = register ? (matches(register, p.name, p.operator ?? '') ? 'CONFIRMED' : 'MISMATCH') : 'NOT_FOUND';
      } catch (e) {
        console.warn(p.id, String(e));
        status = 'ERROR';
      }
    }
    results.push({ plantId: p.id, plantName: p.name, claimedId: claimed, status, register });
    console.log(`${status.padEnd(9)} ${p.id} | ${p.operator} | ${claimed} → ${register ? `${register.name} (${register.commune})` : '—'}`);
  }
  console.log('Summary:', summarise(results));
  writeCountryChecks({ countryCode: 'DK', source: SOURCE, checkedAt: '2026-09-26', results });
}

main().catch(e => { console.error(e); process.exit(1); });
