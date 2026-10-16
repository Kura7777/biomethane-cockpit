import type { Consignment } from './types';

export type CommissioningRange = Consignment['commissioningDateRange'];

/**
 * The strictest RED transport bar (65 %) applies to installations commissioned from 2021.
 * Used only when the plant's commissioning year is unknown; the consignment is then flagged
 * `commissioningDateAssumed` so every gate reason says so.
 */
export const STRICTEST_COMMISSIONING_RANGE: CommissioningRange = 'POST_2021_TO_2025';

/**
 * Maps a commissioning year to the RED III threshold band. 2015 straddles the 5 Oct 2015
 * cut-off, so it takes the stricter (later) band.
 */
export function commissioningRangeFromYear(
  year: number | null | undefined,
): { range: CommissioningRange; assumed: boolean } {
  if (year == null || !Number.isFinite(year)) {
    return { range: STRICTEST_COMMISSIONING_RANGE, assumed: true };
  }
  if (year <= 2014) return { range: 'PRE_OCT_2015', assumed: false };
  if (year <= 2020) return { range: 'OCT_2015_TO_2020', assumed: false };
  if (year <= 2025) return { range: 'POST_2021_TO_2025', assumed: false };
  return { range: 'POST_2026', assumed: false };
}

/** Text appended to GHG gate reasons: states the commissioning band and whether it is assumed. */
export function describeCommissioning(c: Pick<Consignment, 'commissioningDateRange' | 'commissioningDateAssumed'>): string {
  const label = c.commissioningDateRange.replace(/_/g, ' ').toLowerCase();
  return c.commissioningDateAssumed
    ? `${label} installations (commissioning date unknown; strictest bar assumed)`
    : `${label} installations`;
}
