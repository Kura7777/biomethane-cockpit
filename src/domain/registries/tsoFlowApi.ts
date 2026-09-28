import { TsoTelemetryPoint } from './types';

/**
 * Client for France's ODRE (Open Data Réseaux Énergies) biomethane production dataset.
 *
 * Real, live, keyless, CORS-open dataset (confirmed by direct curl test):
 *   GET https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/
 *       production-annuelle-de-biomethane-par-site-raccorde-au-reseau-de-transport-et-de/records
 *
 * This is PER-SITE, ANNUAL data (real field: capacite_de_production_gwh_an), published and
 * "updated monthly, around the 10th of the following month" per ODRE's own dataset description.
 * It is NOT real-time or even daily flow telemetry, so this module never labels it "live" —
 * the derived MWh/hour figure is a modelled average from the annual capacity, shown as such.
 */

export interface OdreBiomethaneRecord {
  nom_du_point_dinjection?: string;
  nom_du_site?: string;
  commune?: string;
  departement?: string;
  region?: string;
  capacite_de_production_gwh_an?: number;
  type_de_reseau?: string;
  grx_demandeur?: string;
  gestionnaire_de_reseau?: string;
  annee?: string;
  geo_point_2d?: {
    lon: number;
    lat: number;
  };
}

export type OdreDataSource = 'LIVE' | 'CACHED' | 'UNAVAILABLE';

export interface OdreAnnualProductionData {
  source: OdreDataSource;
  totalCapacityGwhYear: number;
  totalCapacityMWhDayModelled: number; // modelled average, NOT a real-time measurement
  siteCount: number;
  points: TsoTelemetryPoint[];
  fetchedAt: string | null;
  cacheAgeMinutes: number | null;
  unavailableReason: string | null;
}

const ENDPOINT =
  'https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/production-annuelle-de-biomethane-par-site-raccorde-au-reseau-de-transport-et-de/records?limit=50';
const CACHE_KEY = 'biomethane-desk:odre-biomethane-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // ODRE publishes monthly — cache for 24h

interface CachePoint {
  nodeName: string;
  commune: string;
  networkOperator: string;
  gridType: 'TSO_TRANSMISSION' | 'DSO_DISTRIBUTION';
  capacityGwhYear: number;
  coordinates?: [number, number];
}

interface CachePayload {
  fetchedAt: string;
  points: CachePoint[];
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.points) || typeof parsed.fetchedAt !== 'string') return null;
    return parsed as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(payload: CachePayload): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable — non-fatal.
  }
}

function pointsFromCache(cachePoints: CachePoint[]): TsoTelemetryPoint[] {
  return cachePoints.map((p, idx) => ({
    id: `ODRE-${idx + 1}`,
    tsoCode: p.networkOperator.includes('Teréga') ? 'TEREGA' : p.networkOperator.includes('GRDF') ? 'GRDF' : 'GRTGAZ',
    tsoName: p.networkOperator,
    countryCode: 'FR',
    nodeName: p.nodeName,
    gridType: p.gridType,
    flowRateMWhPerHour: Math.round(((p.capacityGwhYear * 1000) / 8760) * 100) / 100,
    flowRateNm3PerHour: Math.round(((p.capacityGwhYear * 1_000_000) / (10.5 * 8760))),
    grossCalorificValueKwhNm3: 10.5,
    feedstockCategory: 'Not specified in ODRE dataset',
    verifiedCI: 0,
    annexClassification: 'IX_A',
    timestamp: new Date().toISOString(),
    source: 'ODRE_API',
    isLive: false, // published, monthly-updated annual data — never real-time
    coordinates: p.coordinates,
  }));
}

function summarise(points: TsoTelemetryPoint[], fetchedAt: string | null, source: OdreDataSource, cacheAgeMinutes: number | null, unavailableReason: string | null = null): OdreAnnualProductionData {
  const totalMWhHour = points.reduce((sum, p) => sum + p.flowRateMWhPerHour, 0);
  const totalCapacityGwhYear = Math.round((totalMWhHour * 8760) / 1000);
  return {
    source,
    totalCapacityGwhYear,
    totalCapacityMWhDayModelled: Math.round(totalMWhHour * 24),
    siteCount: points.length,
    points,
    fetchedAt: points.length ? fetchedAt : null,
    cacheAgeMinutes,
    unavailableReason,
  };
}

/**
 * Fetches French biomethane sites' latest published annual production capacity from ODRE,
 * cached in localStorage for 24 hours (ODRE itself only updates monthly).
 */
export async function fetchOdreAnnualProduction(): Promise<OdreAnnualProductionData> {
  const cached = readCache();
  const now = Date.now();

  if (cached) {
    const cachedAt = new Date(cached.fetchedAt).getTime();
    if (!Number.isNaN(cachedAt) && now - cachedAt < CACHE_TTL_MS) {
      const ageMinutes = Math.round((now - cachedAt) / 60000);
      return summarise(pointsFromCache(cached.points), cached.fetchedAt, 'CACHED', ageMinutes);
    }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`ODRE API responded with status ${res.status}`);
    }

    const data = await res.json();
    const results: OdreBiomethaneRecord[] = Array.isArray(data?.results) ? data.results : [];
    if (results.length === 0) {
      throw new Error('ODRE API returned no records');
    }

    const cachePoints: CachePoint[] = results
      .filter(rec => typeof rec.capacite_de_production_gwh_an === 'number' && rec.capacite_de_production_gwh_an > 0)
      .map(rec => ({
        nodeName: rec.nom_du_site || rec.nom_du_point_dinjection || 'Unnamed site',
        commune: rec.commune || 'France',
        networkOperator: rec.grx_demandeur || rec.gestionnaire_de_reseau || 'GRDF',
        gridType: rec.type_de_reseau?.toLowerCase().includes('transport') ? 'TSO_TRANSMISSION' : 'DSO_DISTRIBUTION',
        capacityGwhYear: Number(rec.capacite_de_production_gwh_an),
        coordinates: rec.geo_point_2d && typeof rec.geo_point_2d.lon === 'number' ? [rec.geo_point_2d.lon, rec.geo_point_2d.lat] : undefined,
      }));

    if (cachePoints.length === 0) {
      throw new Error('ODRE API returned no usable capacity records');
    }

    const fetchedAt = new Date().toISOString();
    writeCache({ fetchedAt, points: cachePoints });
    return summarise(pointsFromCache(cachePoints), fetchedAt, 'LIVE', 0);
  } catch (error) {
    if (cached && cached.points.length > 0) {
      const cachedAt = new Date(cached.fetchedAt).getTime();
      const ageMinutes = Number.isNaN(cachedAt) ? null : Math.round((now - cachedAt) / 60000);
      return summarise(pointsFromCache(cached.points), cached.fetchedAt, 'CACHED', ageMinutes);
    }
    const reason = error instanceof Error ? error.message : 'Unknown error';
    return summarise([], null, 'UNAVAILABLE', null, `ODRE data temporarily unavailable: ${reason}`);
  }
}
