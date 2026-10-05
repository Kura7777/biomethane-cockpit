import type { MarkProvenance, SourceBadge } from '../markets/types';
import { deriveSourceBadge } from '../markets/types';
import { SIMULATED_SOURCE_NAME } from './simulate';

/** Where a price came from and when: the badge the Pricing desk shows, plus the observation date. */
export interface PriceSource {
  badge: SourceBadge;
  /** ISO date (yyyy-mm-dd) the price was observed or last set, or null when none is on record. */
  asOf: string | null;
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * The source tag for one mark, derived exactly as the Pricing desk derives it
 * (deriveSourceBadge), with the observation date from provenance or the last-updated stamp.
 */
export function priceSourceForMark(
  provenance: MarkProvenance | null | undefined,
  updatedAt: string | null | undefined
): PriceSource {
  return {
    badge: deriveSourceBadge(provenance, SIMULATED_SOURCE_NAME),
    asOf: isoDate(provenance?.observedAt ?? updatedAt),
  };
}
