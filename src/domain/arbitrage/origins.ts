import { OriginProfile } from './types';

export const PRODUCING_ORIGINS: Record<string, OriginProfile> = {
  DK: {
    countryCode: 'DK',
    countryName: 'Denmark',
    flag: '🇩🇰',
    activePlants: 60,
    annualProductionTWh: null,
    primaryRegistry: 'Energinet',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'straw', 'food_waste'],
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    flag: '🇩🇪',
    activePlants: 285,
    annualProductionTWh: null,
    primaryRegistry: 'dena Biogasregister',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'energy_crops', 'food_waste'],
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    flag: '🇫🇷',
    activePlants: 829,
    annualProductionTWh: null,
    primaryRegistry: 'GRTgaz / Teréga',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['energy_crops', 'manure', 'food_waste', 'sewage_sludge'],
  },
  NL: {
    countryCode: 'NL',
    countryName: 'Netherlands',
    flag: '🇳🇱',
    activePlants: 92,
    annualProductionTWh: null,
    primaryRegistry: 'VertiCer',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste', 'sewage_sludge'],
  },
  ES: {
    countryCode: 'ES',
    countryName: 'Spain',
    flag: '🇪🇸',
    activePlants: 26,
    annualProductionTWh: null,
    primaryRegistry: 'Enagás GTS (Sistema GdO)',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste', 'straw'],
  },
  IT: {
    countryCode: 'IT',
    countryName: 'Italy',
    flag: '🇮🇹',
    activePlants: 273,
    annualProductionTWh: null,
    primaryRegistry: 'GSE Biometano',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste', 'sewage_sludge'],
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    activePlants: 108,
    annualProductionTWh: null,
    primaryRegistry: 'DfT RTFO / GGCS',
    gridZone: 'NON_EU_ISOLATED',
    typicalFeedstocks: ['food_waste', 'manure', 'energy_crops'],
  },
  SE: {
    countryCode: 'SE',
    countryName: 'Sweden',
    flag: '🇸🇪',
    activePlants: 67,
    annualProductionTWh: null,
    primaryRegistry: 'Energigas Sverige',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['sewage_sludge', 'food_waste', 'manure'],
  },
  FI: {
    countryCode: 'FI',
    countryName: 'Finland',
    flag: '🇫🇮',
    activePlants: 32,
    annualProductionTWh: null,
    primaryRegistry: 'Gasgrid Finland',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['food_waste', 'manure', 'sewage_sludge'],
  },
  AT: {
    countryCode: 'AT',
    countryName: 'Austria',
    flag: '🇦🇹',
    activePlants: 20,
    annualProductionTWh: null,
    primaryRegistry: 'AGCS Biomethan Register',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'energy_crops', 'biowaste'],
  },
  CH: {
    countryCode: 'CH',
    countryName: 'Switzerland',
    flag: '🇨🇭',
    activePlants: 18,
    annualProductionTWh: null,
    primaryRegistry: 'VSG Clearing',
    gridZone: 'NON_EU_ISOLATED',
    typicalFeedstocks: ['biowaste', 'sewage_sludge'],
  },
  NO: {
    countryCode: 'NO',
    countryName: 'Norway',
    flag: '🇳🇴',
    activePlants: 15,
    annualProductionTWh: null,
    primaryRegistry: 'Gassco',
    gridZone: 'NON_EU_ISOLATED',
    typicalFeedstocks: ['fish_waste', 'manure', 'sewage_sludge'],
  },
  PT: {
    countryCode: 'PT',
    countryName: 'Portugal',
    flag: '🇵🇹',
    activePlants: 13,
    annualProductionTWh: null,
    primaryRegistry: 'REN / DGEG',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste'],
  },
  BE: {
    countryCode: 'BE',
    countryName: 'Belgium',
    flag: '🇧🇪',
    activePlants: 12,
    annualProductionTWh: null,
    primaryRegistry: 'Fluxys',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste', 'energy_crops'],
  },
  LT: {
    countryCode: 'LT',
    countryName: 'Lithuania',
    flag: '🇱🇹',
    activePlants: 12,
    annualProductionTWh: null,
    primaryRegistry: 'Amber Grid',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'straw', 'food_waste'],
  },
  CZ: {
    countryCode: 'CZ',
    countryName: 'Czech Republic',
    flag: '🇨🇿',
    activePlants: 10,
    annualProductionTWh: null,
    primaryRegistry: 'OTE a.s.',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['energy_crops', 'manure'],
  },
  LV: {
    countryCode: 'LV',
    countryName: 'Latvia',
    flag: '🇱🇻',
    activePlants: 10,
    annualProductionTWh: null,
    primaryRegistry: 'Conexus Baltic Grid',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'energy_crops'],
  },
  EE: {
    countryCode: 'EE',
    countryName: 'Estonia',
    flag: '🇪🇪',
    activePlants: 4,
    annualProductionTWh: null,
    primaryRegistry: 'Elering',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste'],
  },
  SK: {
    countryCode: 'SK',
    countryName: 'Slovakia',
    flag: '🇸🇰',
    activePlants: 3,
    annualProductionTWh: null,
    primaryRegistry: 'SPP - Distribucia',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['energy_crops', 'manure'],
  },
  LU: {
    countryCode: 'LU',
    countryName: 'Luxembourg',
    flag: '🇱🇺',
    activePlants: 2,
    annualProductionTWh: null,
    primaryRegistry: 'ILR / Creos',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['biowaste', 'slurry'],
  },
};

/**
 * Route-specific transit tariffs (€/MWh) based on European gas grid interconnected tariffs
 */
export function getRouteTransitTariff(originCode: string, targetCountry: string): number {
  if (originCode === targetCountry) {
    return 0.50; // Local domestic grid injection/withdrawal
  }

  const adjacentPairs = new Set([
    'DK-DE', 'DE-DK', 'NL-DE', 'DE-NL', 'FR-DE', 'DE-FR', 'BE-FR', 'FR-BE',
    'BE-NL', 'NL-BE', 'ES-FR', 'FR-ES', 'AT-DE', 'DE-AT', 'PL-DE', 'DE-PL',
    'SE-DK', 'DK-SE', 'FI-EE', 'EE-FI', 'EE-LV', 'LV-EE', 'LV-LT', 'LT-LV',
    'LT-PL', 'PL-LT', 'CZ-DE', 'DE-CZ', 'AT-IT', 'IT-AT', 'FR-IT', 'IT-FR'
  ]);

  const pairKey = `${originCode}-${targetCountry}`;
  if (adjacentPairs.has(pairKey)) {
    return 1.80; // Single cross-border transit
  }

  if (targetCountry === 'EU') {
    return 2.50; // Marine bunkering / EU-wide pooling
  }

  return 3.20; // Multi-zone transit
}

/**
 * Modelled Commercial Trading Desk Margin allocation:
 * Exposes modelled intermediary margin based on a configurable producer share percentage (default 90%).
 */
export function calculateRealisticCommercialDeskMargin(
  marketId: string,
  destinationNetback: number,
  transitTariff: number,
  producerSharePct: number = 0.90
): {
  deskNetMarginEurPerMWh: number;
  producerProcurementEurPerMWh: number;
  marginAllocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE';
  sensitivityRange: { low: number; mid: number; high: number };
} {
  let allocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE' = 'TRANSPORT_COMPLIANCE';

  if (marketId === 'FUELEU') {
    allocationType = 'MARITIME_INSETTING';
  } else if (marketId === 'VOL_SCOPE1' || marketId === 'DK_GO' || marketId === 'EU_ETS1') {
    allocationType = 'WHOLESALE_BASE';
  }

  const netStackAfterTransit = Math.max(0, destinationNetback - transitTariff);
  
  // Modelled desk margin based on producer share input (e.g. 90% -> desk captures 10%)
  const deskNetMargin = Number((netStackAfterTransit * (1 - producerSharePct)).toFixed(2));
  const producerProcurement = Number((netStackAfterTransit * producerSharePct).toFixed(2));

  return {
    deskNetMarginEurPerMWh: deskNetMargin,
    producerProcurementEurPerMWh: producerProcurement,
    marginAllocationType: allocationType,
    sensitivityRange: {
      low: Number((netStackAfterTransit * 0.05).toFixed(2)),  // 95% producer share
      mid: Number((netStackAfterTransit * 0.10).toFixed(2)),  // 90% producer share
      high: Number((netStackAfterTransit * 0.15).toFixed(2)), // 85% producer share
    },
  };
}
