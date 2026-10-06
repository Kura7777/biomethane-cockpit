import { InterconnectionPoint, CapacityDuration } from './types';
import { getAssumption } from '../assumptions/registry';
import { INTERCONNECTION_POINTS, HUB_BASIS_SPREADS } from './corridorsData';

export { INTERCONNECTION_POINTS, HUB_BASIS_SPREADS };

/**
 * ENTSOG CAM NC (Commission Regulation (EU) 2017/459) Standard Capacity Duration Multipliers
 * Regulates the tariff multiplier applied by TSOs for capacity product booking horizons.
 */
export const CAM_NC_DURATION_MULTIPLIERS: Record<CapacityDuration, {
  multiplier: number;
  label: string;
  code: CapacityDuration;
  description: string;
  clearingMechanism: string;
}> = {
  YEARLY: {
    multiplier: 1.00,
    label: 'Yearly Standard (1.00×)',
    code: 'YEARLY',
    description: 'Regulated base reference tariff for long-term firm capacity (12-month delivery).',
    clearingMechanism: 'Annual PRISMA auction (first Monday of July)',
  },
  QUARTERLY: {
    multiplier: 1.10,
    label: 'Quarterly Firm (1.10×)',
    code: 'QUARTERLY',
    description: 'CAM NC Art. 13 calendar quarter capacity booking (1.05×–1.15× multiplier).',
    clearingMechanism: 'Rolling quarterly PRISMA auction',
  },
  MONTHLY: {
    multiplier: 1.25,
    label: 'Monthly Forward (1.25×)',
    code: 'MONTHLY',
    description: 'Standard monthly firm capacity product (regulated average 1.25× base tariff).',
    clearingMechanism: 'Monthly PRISMA auction (3rd Monday of M-1)',
  },
  DAILY: {
    multiplier: 1.50,
    label: 'Day-Ahead Spot (1.50×)',
    code: 'DAILY',
    description: 'Short-term spot balancing capacity auctioned daily on PRISMA (1.50× multiplier).',
    clearingMechanism: 'Daily Day-Ahead auction (16:30 UTC D-1)',
  },
  WITHIN_DAY: {
    multiplier: 1.75,
    label: 'Within-Day Balancing (1.75×)',
    code: 'WITHIN_DAY',
    description: 'Real-time intraday physical injection / withdrawal balancing on transmission grid.',
    clearingMechanism: 'Continuous within-day hourly bidding',
  },
};

/**
 * National Biomethane Grid Injection Tariff Incentives & Avoided Network Charge Deductions
 */
export const NATIONAL_BIOMETHANE_INJECTION_INCENTIVES: Record<string, {
  creditEurMwh: number;
  statutoryBasis: string;
  description: string;
}> = {
  DE: {
    creditEurMwh: 0.70,
    statutoryBasis: '§ 33 GasNZV (Gasnetzzugangsverordnung)',
    description: 'Avoided grid cost compensation paid by TSOs/DSOs to biomethane injectors (€0.007/kWh = €0.70/MWh).',
  },
  FR: {
    creditEurMwh: 0.40,
    statutoryBasis: 'Code de l’énergie Art. L. 453-9 (Droit à l’injection)',
    description: 'French national grid reinforcement allowance & entry tariff exemption for injected green gas.',
  },
  NL: {
    creditEurMwh: 0.35,
    statutoryBasis: 'GTS Transmission Code / Netbeheer Nederland',
    description: 'Gasunie Transport Services entry tariff waiver for audited renewable gas inputs.',
  },
  DK: {
    creditEurMwh: 0.30,
    statutoryBasis: 'Energinet Green Gas Incentive Tariff Scheme',
    description: 'Direct entry rebate applied to domestic biomethane entering the Danish transmission system.',
  },
};

/**
 * Current hub basis spread to TTF for a country (desk assumption, read at call time), or
 * `fallback` when the country has no entry in HUB_BASIS_SPREADS.
 */
export function hubBasisSpread(country: string, fallback: number = 0): number {
  const hub = HUB_BASIS_SPREADS[country];
  if (!hub) return fallback;
  return getAssumption(`cost.hubBasis.${country}`);
}

/**
 * Current entry/exit/total tariff for an interconnection point (desk assumption, read at call
 * time). Points with no verified tariff stay null — never fabricated. Total is always entry +
 * exit (every verified point in INTERCONNECTION_POINTS satisfies that exactly).
 */
export function resolvedIpTariffs(ip: InterconnectionPoint): {
  entryTariffEurMwh: number | null;
  exitTariffEurMwh: number | null;
  totalTariffEurMwh: number | null;
} {
  if (ip.entryTariffEurMwh === null || ip.exitTariffEurMwh === null) {
    return { entryTariffEurMwh: null, exitTariffEurMwh: null, totalTariffEurMwh: null };
  }
  const entryTariffEurMwh = getAssumption(`cost.ip.${ip.id}.entry`);
  const exitTariffEurMwh = getAssumption(`cost.ip.${ip.id}.exit`);
  return {
    entryTariffEurMwh,
    exitTariffEurMwh,
    totalTariffEurMwh: Number((entryTariffEurMwh + exitTariffEurMwh).toFixed(2)),
  };
}

/**
 * Distance Matrix between European Trading Hubs (in km, approximate pipeline/road routing)
 */
export const HUB_DISTANCES_KM: Record<string, Record<string, number>> = {
  SE: { SE: 0, DK: 280, DE: 850, NL: 1100, BE: 1300, FR: 1800, ES: 2600, IT: 2100, AT: 1450, PL: 1200, FI: 500, GB: 1400 },
  DK: { SE: 280, DK: 0, DE: 550, NL: 800, BE: 1000, FR: 1500, ES: 2300, IT: 1800, AT: 1150, PL: 900, FI: 780, GB: 1100 },
  DE: { SE: 850, DK: 550, DE: 0, NL: 350, BE: 450, FR: 950, ES: 1800, IT: 1250, AT: 600, PL: 550, FI: 1350, GB: 800 },
  NL: { SE: 1100, DK: 800, DE: 350, NL: 0, BE: 180, FR: 650, ES: 1550, IT: 1200, AT: 850, PL: 900, FI: 1600, GB: 450 },
  FR: { SE: 1800, DK: 1500, DE: 950, NL: 650, BE: 400, FR: 0, ES: 950, IT: 900, AT: 1100, PL: 1500, FI: 2300, GB: 500 },
  ES: { SE: 2600, DK: 2300, DE: 1800, NL: 1550, BE: 1400, FR: 950, ES: 0, IT: 1500, AT: 1950, PL: 2350, FI: 3100, GB: 1600 },
  IT: { SE: 2100, DK: 1800, DE: 1250, NL: 1200, BE: 1100, FR: 900, ES: 1500, IT: 0, AT: 700, PL: 1400, FI: 2600, GB: 1500 },
  AT: { SE: 1450, DK: 1150, DE: 600, NL: 850, BE: 900, FR: 1100, ES: 1950, IT: 700, AT: 0, PL: 750, FI: 1950, GB: 1300 },
  PL: { SE: 1200, DK: 900, DE: 550, NL: 900, BE: 1050, FR: 1500, ES: 2350, IT: 1400, AT: 750, PL: 0, FI: 1200, GB: 1400 },
};

/**
 * Direct gas transmission pipeline distances between adjacent national grid hubs (in km).
 * Derived from TSO network statements, PRISMA interconnection points, and pipeline geography.
 */
export const PIPELINE_SEGMENT_DISTANCES: Record<string, Record<string, number>> = {
  SE: { DK: 280 },
  DK: { SE: 280, DE: 550 },
  DE: { DK: 550, NL: 350, BE: 450, FR: 805, AT: 600, PL: 550, CZ: 350, CH: 450, LU: 340 },
  NL: { DE: 350, BE: 180, GB: 450 },
  BE: { NL: 180, DE: 450, FR: 400, GB: 350, LU: 180 },
  FR: { BE: 400, DE: 805, CH: 450, ES: 950, LU: 476 },
  LU: { DE: 340, FR: 476, BE: 180 },
  ES: { FR: 950, PT: 500 },
  PT: { ES: 500 },
  IT: { CH: 450, AT: 700, SI: 300, GR: 700 },
  AT: { DE: 600, IT: 700, CZ: 300, SK: 80, HU: 250, SI: 250 },
  PL: { DE: 550, CZ: 400, SK: 450, LT: 450, UA: 600 },
  CZ: { DE: 350, PL: 400, SK: 320, AT: 300 },
  SK: { CZ: 320, PL: 450, UA: 400, HU: 200, AT: 80 },
  HU: { AT: 250, SK: 200, UA: 350, RO: 500, HR: 300, RS: 350, SI: 350 },
  FI: { EE: 100 },
  EE: { FI: 100, LV: 300 },
  LV: { EE: 300, LT: 300 },
  LT: { LV: 300, PL: 450 },
  GB: { NL: 450, BE: 350, IE: 350 },
  CH: { DE: 450, FR: 450, IT: 450 },
  NO: { GB: 800, DE: 900, BE: 950, FR: 1100, NL: 850 },
  SI: { IT: 300, AT: 250, HU: 350, HR: 140 },
  HR: { SI: 140, HU: 300, RS: 380 },
  RO: { HU: 500, BG: 350, UA: 550 },
  BG: { RO: 350, GR: 300, RS: 380 },
  RS: { HU: 350, HR: 380, BG: 380 },
  GR: { BG: 300, IT: 700 },
  IE: { GB: 350 },
  UA: { PL: 600, SK: 400, HU: 350, RO: 550 },
};
