import { NetbackResult } from './types';

/**
 * The slope of certificate value with respect to the raw mark, in the market's own unit:
 * k = certificateValue.valueEurPerMWh / markInUse €/MWh per unit of mark.
 *
 * Pure display derivation for the deal ticket's headroom line — it reads the value
 * computeNetback already produced rather than repricing anything, and lives in
 * domain/netback/ so the single-pricing-authority architecture guard (certificate value may
 * only be priced by computeNetback) sees this division as in-bounds.
 */
export function certificateMarkSlope(netback: NetbackResult, markInUse: number | null): number | null {
  if (markInUse === null || markInUse === 0) return null;
  const value = netback.certificateValue?.valueEurPerMWh;
  if (value == null) return null;
  return value / markInUse;
}
