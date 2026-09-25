/**
 * Checks every French plant's SIREN against the official French company directory
 * (recherche-entreprises.api.gouv.fr, DINUM — free, no key).
 *
 *   npx vite-node scripts/verify_fr_sirens.ts
 *
 * A SIREN is CONFIRMED only if the company exists, is active, and is plausibly the plant's
 * operator: an energy / waste / agricultural activity code AND a name that shares a word
 * with the plant or operator name or names biogas/methanisation activity. Everything else is
 * MISMATCH (belongs to an unrelated company) or NOT_FOUND. Lookups are cached in
 * scripts/.siren_cache.json so re-runs only query new numbers.
 */
import * as fs from 'fs';
import * as path from 'path';
import { RAW_BIOMETHANE_PLANTS } from '../src/domain/plants/plantsData';
import { CheckResult, CheckStatus, RegisterHit, summarise, writeCountryChecks } from './lib/registrationChecksWriter';

const CACHE_PATH = path.join(__dirname, '.siren_cache.json');
const SOURCE = 'Annuaire des Entreprises (recherche-entreprises.api.gouv.fr)';

const cache: Record<string, RegisterHit | null> = fs.existsSync(CACHE_PATH)
  ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  : {};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function lookup(siren: string): Promise<RegisterHit | null> {
  if (siren in cache) return cache[siren];
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=5`);
    if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json() as { results: any[] };
    const r = body.results.find(x => x.siren === siren);
    const hit: RegisterHit | null = r
      ? { name: r.nom_complet, naf: r.activite_principale ?? null, active: r.etat_administratif === 'A', commune: r.siege?.libelle_commune ?? null }
      : null;
    cache[siren] = hit;
    return hit;
  }
  throw new Error('rate limited');
}

const PLAUSIBLE_NAF = /^(35\.|36\.|37\.|38\.|39\.|01\.|02\.|10\.|20\.1|64\.20)/;
const BIOGAS_WORDS = /biogaz|biogas|m[ée]tha|biom[ée]thane|bio[ -]?[ée]nergie|agri[ -]?[ée]nergie|gaz vert|valoris/i;
const STOP = new Set(['sas', 'sarl', 'earl', 'gaec', 'sa', 'scea', 'de', 'des', 'du', 'la', 'le', 'les', 'et', 'en', 'sur', 'saint', 'sainte', 'communaute', 'communes', 'france', 'bio', 'energie', 'biogaz']);

const words = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP.has(w));

function plausible(hit: RegisterHit, plantName: string, operator: string): boolean {
  if (!hit.active) return false;
  if (!hit.naf || !PLAUSIBLE_NAF.test(hit.naf)) return false;
  // Holding companies (64.20Z) only when the name itself says biogas
  if (hit.naf.startsWith('64.20') && !BIOGAS_WORDS.test(hit.name)) return false;
  const regWords = new Set(words(hit.name));
  const shared = [...words(plantName), ...words(operator)].some(w => regWords.has(w));
  return shared || BIOGAS_WORDS.test(hit.name);
}

async function main() {
  const fr = (RAW_BIOMETHANE_PLANTS as any[]).filter(p => p.countryCode === 'FR' && p.companyRegistrationId);
  const results: CheckResult[] = [];
  let n = 0;
  for (const p of fr) {
    const claimed = String(p.companyRegistrationId);
    const m = claimed.match(/SIREN\s*([\d ]{9,11})/);
    const siren = m ? m[1].replace(/\s/g, '') : null;
    let status: CheckStatus = 'NOT_FOUND';
    let register: RegisterHit | null = null;
    if (siren && siren.length === 9) {
      const cached = siren in cache;
      try {
        register = await lookup(siren);
        status = register ? (plausible(register, p.name, p.operator ?? '') ? 'CONFIRMED' : 'MISMATCH') : 'NOT_FOUND';
      } catch {
        status = 'ERROR';
      }
      if (!cached) await sleep(180); // stay under the API's ~7 req/s limit
    }
    results.push({ plantId: p.id, plantName: p.name, claimedId: claimed, status, register });
    if (++n % 100 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
      console.log(`${n}/${fr.length}`);
    }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  console.log('Summary:', summarise(results));
  writeCountryChecks({ countryCode: 'FR', source: SOURCE, checkedAt: '2026-09-26', results });
}

main().catch(e => { console.error(e); process.exit(1); });
