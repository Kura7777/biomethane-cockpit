import { SensitivityPreset, SensitivityShockConfig } from './types';

export const DEFAULT_SHOCK_CONFIG: SensitivityShockConfig = {
  ttfPriceShockPercent: 0,
  deDoubleCounting: 'AUTO',
  ukUdbRecognition: false,
  frCpbCeilingEurMwh: 100,
  fuelEUEscalationYears: 1,
  fxShockPercent: 0,
  certPriceShockPercent: 0,
};

export const BASE_CASE: SensitivityPreset = {
  id: 'BASE_CASE',
  name: 'Base Case (No Shocks)',
  shortLabel: 'Base Case',
  description: 'Unmodified baseline marks and current RED III / national regulatory parameters.',
  badge: 'BASELINE',
  config: {
    ...DEFAULT_SHOCK_CONFIG,
  },
};

export const TTF_BULL_20: SensitivityPreset = {
  id: 'TTF_BULL_20',
  name: 'TTF Gas Bull Shock (+20%)',
  shortLabel: 'TTF Bull (+20%)',
  description: 'Natural gas wholesale prices rally +20%, lifting molecule revenue and index-linked delivered value.',
  badge: '+20% GAS',
  config: {
    ...DEFAULT_SHOCK_CONFIG,
    ttfPriceShockPercent: 20,
  },
};

export const TTF_BEAR_20: SensitivityPreset = {
  id: 'TTF_BEAR_20',
  name: 'TTF Gas Bear Shock (-20%)',
  shortLabel: 'TTF Bear (-20%)',
  description: 'Natural gas wholesale prices drop -20%, compressing molecule baseline and delivered netbacks.',
  badge: '-20% GAS',
  config: {
    ...DEFAULT_SHOCK_CONFIG,
    ttfPriceShockPercent: -20,
  },
};

export const DE_DC_REPEAL_1X: SensitivityPreset = {
  id: 'DE_DC_REPEAL_1X',
  name: 'German THG Double-Counting Repeal (1× Single Count)',
  shortLabel: 'DE DC Repeal (1x)',
  description: 'German 38. BImSchV double counting is repealed; Annex IX-A feedstocks receive 1× single quota credit only.',
  badge: '1× THG',
  config: {
    ...DEFAULT_SHOCK_CONFIG,
    deDoubleCounting: 'DC_OFF',
  },
};

export const UK_UDB_ACCORD: SensitivityPreset = {
  id: 'UK_UDB_ACCORD',
  name: 'UK-EU UDB Interconnection Accord',
  shortLabel: 'UK UDB Accord',
  description: 'Bilateral treaty recognition enables UK grid-injected biomethane to clear Union Database mass balance gates.',
  badge: 'UK UDB ✓',
  config: {
    ...DEFAULT_SHOCK_CONFIG,
    ukUdbRecognition: true,
  },
};

export const FR_CPB_CAP_SHIFT: SensitivityPreset = {
  id: 'FR_CPB_CAP_SHIFT',
  name: 'French CPB Statutory Ceiling Reduction (€80/MWh)',
  shortLabel: 'FR CPB Cap (€80)',
  description: 'French CPB buyout penalty ceiling lowered from statutory €100/MWh to €80/MWh cap.',
  badge: '€80 CAP',
  config: {
    ...DEFAULT_SHOCK_CONFIG,
    frCpbCeilingEurMwh: 80,
  },
};

export const FUELEU_YEAR_2: SensitivityPreset = {
  id: 'FUELEU_YEAR_2',
  name: 'FuelEU Maritime Consecutive Non-Compliance (Year 2, +10%)',
  shortLabel: 'FuelEU Yr 2 (+10%)',
  description: 'Vessel enters consecutive non-compliance year 2, escalating penalty multiplier to 1.1× (+10%).',
  badge: 'FUELEU YR 2',
  config: {
    ...DEFAULT_SHOCK_CONFIG,
    fuelEUEscalationYears: 2,
  },
};

export const FX_STRESS_GBP: SensitivityPreset = {
  id: 'FX_STRESS_GBP',
  name: 'GBP/EUR FX Stress (-10% Depreciation)',
  shortLabel: 'GBP FX Stress (-10%)',
  description: 'British Pound depreciates 10% against the Euro, reducing EUR equivalent value of UK RTFO dRTFC certificates.',
  badge: '-10% GBP/EUR',
  config: {
    ...DEFAULT_SHOCK_CONFIG,
    fxShockPercent: -10,
  },
};

export const SENSITIVITY_PRESETS: SensitivityPreset[] = [
  BASE_CASE,
  TTF_BULL_20,
  TTF_BEAR_20,
  DE_DC_REPEAL_1X,
  UK_UDB_ACCORD,
  FR_CPB_CAP_SHIFT,
  FUELEU_YEAR_2,
  FX_STRESS_GBP,
];

export function getSensitivityPreset(id: string): SensitivityPreset | undefined {
  return SENSITIVITY_PRESETS.find(p => p.id === id);
}
