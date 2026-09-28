import { FUELEU_ACTIVE_PERIOD, getFuelEUTargetIntensity } from '../../domain/fueleu/calculator';

/** FuelEU Art. 4(2) reduction periods the desk trades. The 2025 period is closed — the desk's
 *  active period is FUELEU_ACTIVE_PERIOD (2026); both flows default here. */
export const COMPLIANCE_PERIOD_YEARS = [2026, 2030, 2035, 2040] as const;

export const COMPLIANCE_YEAR_PERIOD_LABELS: Record<number, string> = {
  2026: '2026–2029 (89.34 g/MJ, −2%)',
  2030: '2030–2034 (85.69 g/MJ, −6%)',
  2035: '2035–2039 (77.94 g/MJ, −14.5%)',
  2040: '2040–2044 (62.90 g/MJ, −31%)',
};

/** Short "2026–2029" period label for compact segmented controls. */
export const COMPLIANCE_YEAR_SHORT_LABELS: Record<number, string> = {
  2026: '2026–2029',
  2030: '2030–2034',
  2035: '2035–2039',
  2040: '2040–2044',
};

/** Short reduction-vs-reference label for the chosen period, e.g. "−2%". */
export const COMPLIANCE_YEAR_PCT_LABELS: Record<number, string> = {
  2026: '−2%',
  2030: '−6%',
  2035: '−14.5%',
  2040: '−31%',
};

export { FUELEU_ACTIVE_PERIOD, getFuelEUTargetIntensity };
