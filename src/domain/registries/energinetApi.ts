/**
 * Client for Denmark's Energinet "Energi Data Service" Gasflow dataset.
 *
 * Real, live, keyless, CORS-open dataset (confirmed by direct curl test):
 *   GET https://api.energidataservice.dk/dataset/Gasflow?limit=N
 * One record = one calendar day, Denmark-wide totals. Real fields (verbatim from a live
 * response): GasDay, KWhFromBiogas, KWhToDenmark, KWhFromNorthSea, KWhToOrFromStorage,
 * KWhToOrFromGermany, KWhToSweden, kWhFromTyra, KWhToPoland.
 *
 * There is NO PointId / PointName / Municipality / PhysicalFlowMWh / FlowMWh / HourUTC field
 * in the real dataset, and no per-plant or per-injection-point granularity — it is a single
 * national daily balance. The only field this module uses is KWhFromBiogas: the aggregate
 * biogas/biomethane volume entering the Danish gas system that day.
 *
 * The endpoint allows CORS (Access-Control-Allow-Origin: *) but rate-limits hard: response
 * headers carry RemainingCalls/TotalCalls, and once the limit is exhausted the server returns
 * an empty body with no CORS header, which the browser reports as a CORS error. To stay well
 * under that limit this client fetches at most once per 60 minutes per browser, caching the
 * result (with a timestamp) in localStorage.
 */

export interface EnerginetDailyBiogas {
  gasDay: string; // YYYY-MM-DD
  kwhFromBiogas: number;
  gwhFromBiogas: number;
}

export type EnerginetDataSource = 'LIVE' | 'CACHED' | 'UNAVAILABLE';

export interface EnerginetBiogasResult {
  source: EnerginetDataSource;
  days: EnerginetDailyBiogas[]; // most recent first, up to 14 days
  latestGwhPerDay: number | null;
  annualisedRunRateTWh: number | null; // latest day's KWhFromBiogas x 365, in TWh
  fetchedAt: string | null; // ISO timestamp of the data actually shown (live or cached)
  cacheAgeMinutes: number | null;
  unavailableReason: string | null;
}

const ENDPOINT = 'https://api.energidataservice.dk/dataset/Gasflow?limit=20&sort=GasDay%20DESC';
const CACHE_KEY = 'biomethane-desk:energinet-gasflow-v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes — stay well under Energinet's rate limit
const MAX_DAYS = 14;

interface CachePayload {
  fetchedAt: string;
  days: EnerginetDailyBiogas[];
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.days) || typeof parsed.fetchedAt !== 'string') return null;
    return parsed as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(payload: CachePayload): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — fail silently, not fatal.
  }
}

function toResult(days: EnerginetDailyBiogas[], fetchedAt: string, source: EnerginetDataSource, cacheAgeMinutes: number | null, unavailableReason: string | null = null): EnerginetBiogasResult {
  const latest = days[0] || null;
  return {
    source,
    days,
    latestGwhPerDay: latest ? latest.gwhFromBiogas : null,
    annualisedRunRateTWh: latest ? (latest.kwhFromBiogas * 365) / 1_000_000_000 : null,
    fetchedAt: days.length ? fetchedAt : null,
    cacheAgeMinutes,
    unavailableReason,
  };
}

/**
 * Fetches Denmark's daily national biogas/biomethane grid-injection volume (last 14 GasDays),
 * rate-limited to at most one network call per 60 minutes per browser via a localStorage cache.
 */
export async function fetchEnerginetDailyBiogas(): Promise<EnerginetBiogasResult> {
  const cached = readCache();
  const now = Date.now();

  if (cached) {
    const cachedAt = new Date(cached.fetchedAt).getTime();
    if (!Number.isNaN(cachedAt) && now - cachedAt < CACHE_TTL_MS) {
      const ageMinutes = Math.round((now - cachedAt) / 60000);
      return toResult(cached.days, cached.fetchedAt, 'CACHED', ageMinutes);
    }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Energinet Gasflow API responded with status ${res.status}`);
    }

    const data = await res.json();
    const records: any[] = Array.isArray(data?.records) ? data.records : [];
    if (records.length === 0) {
      throw new Error('Energinet Gasflow API returned no records');
    }

    const days: EnerginetDailyBiogas[] = records
      .filter(rec => rec && typeof rec.GasDay === 'string' && typeof rec.KWhFromBiogas === 'number')
      .slice(0, MAX_DAYS)
      .map(rec => ({
        gasDay: String(rec.GasDay).slice(0, 10),
        kwhFromBiogas: Number(rec.KWhFromBiogas),
        gwhFromBiogas: Number(rec.KWhFromBiogas) / 1_000_000,
      }));

    if (days.length === 0) {
      throw new Error('Energinet Gasflow API returned no usable KWhFromBiogas records');
    }

    const fetchedAt = new Date().toISOString();
    writeCache({ fetchedAt, days });
    return toResult(days, fetchedAt, 'LIVE', 0);
  } catch (error) {
    // Rate-limited (empty body with no CORS header reads as a CORS error in-browser), offline,
    // or a transient failure. Fall back to whatever we have cached, however stale, and say so.
    if (cached && cached.days.length > 0) {
      const cachedAt = new Date(cached.fetchedAt).getTime();
      const ageMinutes = Number.isNaN(cachedAt) ? null : Math.round((now - cachedAt) / 60000);
      return toResult(cached.days, cached.fetchedAt, 'CACHED', ageMinutes);
    }
    const reason = error instanceof Error ? error.message : 'Unknown error';
    return toResult([], new Date().toISOString(), 'UNAVAILABLE', null, `Energinet data temporarily unavailable (rate-limited): ${reason}`);
  }
}
