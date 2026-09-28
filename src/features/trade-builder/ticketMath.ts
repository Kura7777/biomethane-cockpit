import { UnitOfAccount } from '../../domain/markets/types';
import { GateResult, GateVerdict, OverallVerdict } from '../../domain/eligibility/types';

/**
 * Certificate markets whose delivered value is linear in the raw mark:
 * valueEurPerMWh = mark × k for a constant k (conversion factor / FX, not a statutory ceiling).
 * EUR_PER_MWH markets already quote directly in €/MWh (k = 1, mark itself is the netback driver,
 * not meaningfully "headroom"), and EUR_PER_TCO2E_DEFICIT / GBP_PER_DRTFC are modelled or
 * pathway-gated rather than a simple mark × k relationship, so both are excluded here.
 */
export const LINEAR_MARK_UNITS: UnitOfAccount[] = [
  'EUR_PER_TCO2E',
  'EUR_PER_KG_CO2E',
  'EUR_PER_CIC',
  'GBP_PER_RTFC',
];

export function isLinearMarkUnit(unit: UnitOfAccount): boolean {
  return LINEAR_MARK_UNITS.includes(unit);
}

/**
 * The mark at which the modelled (uncapped) netback would fall to the realisable bundle cap.
 *
 * netback moves 1:1 with certificate value, and certificate value moves k €/MWh per unit of mark
 * (k = certificateValue.valueEurPerMWh / mark), so:
 *   breakEvenMark = mark − (theoreticalNetback − cappedAt) / k
 *
 * Returns null when any input is missing or k is zero (no meaningful slope to invert).
 */
export function computeBreakEvenMark(
  mark: number | null,
  k: number | null,
  theoreticalNetback: number | null,
  cappedAt: number | null
): number | null {
  if (mark === null || k === null || k === 0 || theoreticalNetback === null || cappedAt === null) {
    return null;
  }
  return mark - (theoreticalNetback - cappedAt) / k;
}

export type GateBadgeTone = 'pos' | 'neg' | 'warn';

export interface GateBadge {
  tone: GateBadgeTone;
  label: string;
  /** The gate driving the badge; null when every gate passes. */
  gate: GateResult | null;
}

/**
 * Classifies the overall eligibility verdict into a badge tone/label without altering the
 * verdict itself: HARD_BLOCK is the only state that should ever read as "Blocked" or disable
 * the deal package button. UNRESOLVED and CONDITIONAL are pending, not blocking.
 */
export function computeGateBadge(gates: GateResult[], overallVerdict: OverallVerdict | string): GateBadge {
  const gatesClear = gates.filter(g => g.verdict === 'PASS').length;

  if (overallVerdict === 'HARD_BLOCK') {
    const gate = gates.find(g => g.verdict === 'HARD_BLOCK') ?? gates.find(g => g.verdict !== 'PASS') ?? null;
    return { tone: 'neg', label: `Blocked · ${gate?.gateLabel ?? 'gate check'}`, gate };
  }

  const pendingVerdicts: GateVerdict[] = ['UNRESOLVED', 'CONDITIONAL', 'UNKNOWN'];
  if (pendingVerdicts.includes(overallVerdict as GateVerdict) || gates.some(g => pendingVerdicts.includes(g.verdict))) {
    const gate = gates.find(g => g.verdict === overallVerdict) ?? gates.find(g => pendingVerdicts.includes(g.verdict)) ?? null;
    const word = gate?.verdict === 'CONDITIONAL' ? 'Conditional' : 'Unresolved';
    return { tone: 'warn', label: `${word} · ${gate?.gateLabel ?? 'gate check'}`, gate };
  }

  return { tone: 'pos', label: `${gatesClear} of ${gates.length} gates clear`, gate: null };
}
