import { AnnexClassification, Consignment } from './types';
import { getAssumption } from '../assumptions/registry';
import {
  FeedstockInfo,
  FEEDSTOCK_REGISTRY,
  FeedstockCITier,
  COUNTRY_FEEDSTOCK_CI_PROFILES,
  DEFAULT_FEEDSTOCK_CI_PROFILE,
} from './feedstockData';

export type { FeedstockInfo, FeedstockCITier };
export { FEEDSTOCK_REGISTRY, COUNTRY_FEEDSTOCK_CI_PROFILES, DEFAULT_FEEDSTOCK_CI_PROFILE };

/**
 * Standard Named Reference Consignments
 * Shared across Domain, UI and Automated Test Suites to avoid hardcoded duplication.
 */
export const REFERENCE_CONSIGNMENTS: Record<string, Consignment> = {
  DANISH_MANURE: {
    id: 'ref_dk_manure',
    name: 'Danish Manure Benchmark',
    originCountry: 'DK',
    originCountryName: 'Denmark',
    feedstock: 'manure',
    feedstockName: 'Animal manure and slurry',
    annexClassification: 'IX_A',
    carbonIntensity: -100,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'DK',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: 10000,
    deliveryPeriod: null,
    counterparty: null,
  },
  UK_FOOD_WASTE: {
    id: 'ref_uk_food_waste',
    name: 'UK Food Waste (Non-EU Grid Injected)',
    originCountry: 'GB',
    originCountryName: 'United Kingdom',
    feedstock: 'food_waste',
    feedstockName: 'Bio-waste (food waste)',
    annexClassification: 'IX_A',
    carbonIntensity: 20,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'GB',
    injectionIsEU: false,
    udbStatus: 'NOT_RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: 8000,
    deliveryPeriod: null,
    counterparty: null,
  },
  ISCC_PLUS_VOLUNTARY: {
    id: 'ref_iscc_plus',
    name: 'French Residues (ISCC PLUS Voluntary)',
    originCountry: 'FR',
    originCountryName: 'France',
    feedstock: 'agricultural_residues',
    feedstockName: 'Straw and agricultural residues',
    annexClassification: 'IX_A',
    carbonIntensity: 18,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_PLUS',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'FR',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: 5000,
    deliveryPeriod: null,
    counterparty: null,
  },
  FUELEU_MARITIME_LNG: {
    id: 'ref_fueleu_lng',
    name: 'Dutch Manure Bio-LNG (FuelEU Maritime Deficit Neutraliser)',
    originCountry: 'NL',
    originCountryName: 'Netherlands',
    feedstock: 'manure',
    feedstockName: 'Animal manure and slurry',
    annexClassification: 'IX_A',
    carbonIntensity: -120,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'NL',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: 15000,
    deliveryPeriod: null,
    counterparty: null,
  },
};

export function getCountryFeedstockCI(
  originCountry: string,
  feedstockKey: string,
  tier: 'optimistic' | 'base' | 'conservative' = 'base'
): { ci: number; min: number; max: number; tier: 'optimistic' | 'base' | 'conservative' } {
  const hasCountryProfile = !!COUNTRY_FEEDSTOCK_CI_PROFILES[originCountry]?.[feedstockKey];
  const hasDefaultProfile = !!DEFAULT_FEEDSTOCK_CI_PROFILE[feedstockKey];

  if (hasCountryProfile) {
    const profile = COUNTRY_FEEDSTOCK_CI_PROFILES[originCountry][feedstockKey];
    return {
      ci: getAssumption(`ci.tier.${originCountry}.${feedstockKey}.${tier}`),
      min: profile.range[0],
      max: profile.range[1],
      tier,
    };
  }
  if (hasDefaultProfile) {
    const profile = DEFAULT_FEEDSTOCK_CI_PROFILE[feedstockKey];
    return {
      ci: getAssumption(`ci.tier.DEFAULT.${feedstockKey}.${tier}`),
      min: profile.range[0],
      max: profile.range[1],
      tier,
    };
  }
  const fallbackProfile = { optimistic: -50, base: 18, conservative: 40, range: [-100, 50] as [number, number] };
  return {
    ci: fallbackProfile[tier],
    min: fallbackProfile.range[0],
    max: fallbackProfile.range[1],
    tier,
  };
}
