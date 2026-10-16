import { COMBINED_BIOMETHANE_PLANTS } from '../../domain/plants/registry';

let cache: Record<string, number> | null = null;

/** Plants per ISO country code, counted from the plant registry (the same list #/plants shows). */
export function getPlantCounts(): Record<string, number> {
  if (!cache) {
    const counts: Record<string, number> = {};
    for (const p of COMBINED_BIOMETHANE_PLANTS) counts[p.countryCode] = (counts[p.countryCode] ?? 0) + 1;
    cache = counts;
  }
  return cache;
}

export function getPlantCount(iso: string): number {
  return getPlantCounts()[iso] ?? 0;
}
