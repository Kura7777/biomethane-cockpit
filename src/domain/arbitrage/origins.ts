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
    plantGateCostBenchmarkEurMwh: 76.50,
    hubBasisSpreadToTtfEurMwh: +0.35,
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
    plantGateCostBenchmarkEurMwh: 89.00,
    hubBasisSpreadToTtfEurMwh: -0.20,
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
    plantGateCostBenchmarkEurMwh: 86.50,
    hubBasisSpreadToTtfEurMwh: -0.45,
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
    plantGateCostBenchmarkEurMwh: 94.00,
    hubBasisSpreadToTtfEurMwh: 0.00,
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
    plantGateCostBenchmarkEurMwh: 74.00,
    hubBasisSpreadToTtfEurMwh: +1.35,
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
    plantGateCostBenchmarkEurMwh: 84.00,
    hubBasisSpreadToTtfEurMwh: +1.60,
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
    plantGateCostBenchmarkEurMwh: 88.00,
    hubBasisSpreadToTtfEurMwh: -0.60,
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
    plantGateCostBenchmarkEurMwh: 98.00,
    hubBasisSpreadToTtfEurMwh: +1.10,
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
    plantGateCostBenchmarkEurMwh: 102.00,
    hubBasisSpreadToTtfEurMwh: +2.10,
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
    plantGateCostBenchmarkEurMwh: 91.50,
    hubBasisSpreadToTtfEurMwh: +1.20,
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
    plantGateCostBenchmarkEurMwh: 110.00,
    hubBasisSpreadToTtfEurMwh: +2.50,
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
    plantGateCostBenchmarkEurMwh: 85.00,
    hubBasisSpreadToTtfEurMwh: -0.20,
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
    plantGateCostBenchmarkEurMwh: 75.00,
    hubBasisSpreadToTtfEurMwh: +1.40,
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
    plantGateCostBenchmarkEurMwh: 92.00,
    hubBasisSpreadToTtfEurMwh: +0.25,
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
    plantGateCostBenchmarkEurMwh: 78.00,
    hubBasisSpreadToTtfEurMwh: +1.50,
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
    plantGateCostBenchmarkEurMwh: 82.00,
    hubBasisSpreadToTtfEurMwh: +0.90,
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
    plantGateCostBenchmarkEurMwh: 80.00,
    hubBasisSpreadToTtfEurMwh: +1.50,
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
    plantGateCostBenchmarkEurMwh: 82.00,
    hubBasisSpreadToTtfEurMwh: +1.60,
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
    plantGateCostBenchmarkEurMwh: 83.00,
    hubBasisSpreadToTtfEurMwh: +1.20,
  },
  LU: {
    countryCode: 'LU',
    countryName: 'Luxembourg',
    flag: '🇱🇺',
    activePlants: 2,
    annualProductionTWh: null,
    primaryRegistry: 'ILR / Creos',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste'],
    plantGateCostBenchmarkEurMwh: 96.00,
    hubBasisSpreadToTtfEurMwh: +0.60,
  },
  PL: {
    countryCode: 'PL',
    countryName: 'Poland',
    flag: '🇵🇱',
    activePlants: 5,
    annualProductionTWh: null,
    primaryRegistry: 'KZR INiG / Gaz-System',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['distillery_waste', 'sugar_beet', 'manure'],
    plantGateCostBenchmarkEurMwh: 79.50,
    hubBasisSpreadToTtfEurMwh: +1.40,
  },
  HU: {
    countryCode: 'HU',
    countryName: 'Hungary',
    flag: '🇭🇺',
    activePlants: 4,
    annualProductionTWh: null,
    primaryRegistry: 'MEKH',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['agricultural_residues', 'manure'],
    plantGateCostBenchmarkEurMwh: 81.00,
    hubBasisSpreadToTtfEurMwh: +1.30,
  },
  RO: {
    countryCode: 'RO',
    countryName: 'Romania',
    flag: '🇷🇴',
    activePlants: 3,
    annualProductionTWh: null,
    primaryRegistry: 'Transgaz',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['cereal_straw', 'manure'],
    plantGateCostBenchmarkEurMwh: 77.00,
    hubBasisSpreadToTtfEurMwh: +1.50,
  },
  IE: {
    countryCode: 'IE',
    countryName: 'Ireland',
    flag: '🇮🇪',
    activePlants: 3,
    annualProductionTWh: null,
    primaryRegistry: 'Gas Networks Ireland',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['grass_silage', 'cattle_slurry'],
    plantGateCostBenchmarkEurMwh: 93.00,
    hubBasisSpreadToTtfEurMwh: -0.30,
  },
  SI: {
    countryCode: 'SI',
    countryName: 'Slovenia',
    flag: '🇸🇮',
    activePlants: 2,
    annualProductionTWh: null,
    primaryRegistry: 'Plinovodi',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'silage'],
    plantGateCostBenchmarkEurMwh: 86.00,
    hubBasisSpreadToTtfEurMwh: +1.20,
  },
  HR: {
    countryCode: 'HR',
    countryName: 'Croatia',
    flag: '🇭🇷',
    activePlants: 2,
    annualProductionTWh: null,
    primaryRegistry: 'Plinacro',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['agri_silage', 'waste'],
    plantGateCostBenchmarkEurMwh: 82.00,
    hubBasisSpreadToTtfEurMwh: +1.30,
  },
  GR: {
    countryCode: 'GR',
    countryName: 'Greece',
    flag: '🇬🇷',
    activePlants: 2,
    annualProductionTWh: null,
    primaryRegistry: 'DESFA',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['olive_waste', 'manure'],
    plantGateCostBenchmarkEurMwh: 80.00,
    hubBasisSpreadToTtfEurMwh: +1.50,
  },
  BG: {
    countryCode: 'BG',
    countryName: 'Bulgaria',
    flag: '🇧🇬',
    activePlants: 1,
    annualProductionTWh: null,
    primaryRegistry: 'Bulgartransgaz',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['crop_residues'],
    plantGateCostBenchmarkEurMwh: 76.00,
    hubBasisSpreadToTtfEurMwh: +1.60,
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
    'LT-PL', 'PL-LT', 'CZ-DE', 'DE-CZ', 'AT-IT', 'IT-AT', 'FR-IT', 'IT-FR',
    'LU-DE', 'DE-LU', 'LU-FR', 'FR-LU', 'LU-BE', 'BE-LU'
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
 * Exposes modelled intermediary margin based on an explicit producer share percentage,
 * or defaults to the differentiated origin plant-gate cost benchmark.
 * Does not clamp to 0 so negative netbacks and loss-making routes are truthfully represented.
 */
export function calculateRealisticCommercialDeskMargin(
  marketId: string,
  destinationNetback: number,
  transitTariff: number,
  producerSharePct: number | null = null,
  originPlantGateCost: number | null = null
): {
  deskNetMarginEurPerMWh: number | null;
  producerProcurementEurPerMWh: number | null;
  marginAllocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE';
} {
  let allocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE' = 'TRANSPORT_COMPLIANCE';

  if (marketId === 'FUELEU') {
    allocationType = 'MARITIME_INSETTING';
  } else if (marketId === 'VOL_SCOPE1' || marketId === 'DK_GO' || marketId === 'EU_ETS1') {
    allocationType = 'WHOLESALE_BASE';
  }

  // Cap destination netback at realistic physical traded bundle clearing ceiling if statutory netback exceeds it.
  // In DE_THG, deep-negative CI manure trades at ~€145-147/MWh all-in, not the theoretical €162-194 statutory penalty ceiling.
  const effectiveRevenue = (marketId === 'DE_THG' && destinationNetback > 147.0)
    ? 147.0
    : destinationNetback;

  // Net stack after transit tariff (unclamped so loss-making routes are visible)
  const netStackAfterTransit = effectiveRevenue - transitTariff;
  
  let deskNetMargin: number | null = null;
  let producerProcurement: number | null = null;

  // Normalize producer share if it was set to an unrealistic uncalibrated ratio (< 0.85)
  const effectiveSharePct = (producerSharePct !== null && producerSharePct < 0.85)
    ? 0.970
    : producerSharePct;

  if (effectiveSharePct !== null) {
    deskNetMargin = Number((netStackAfterTransit * (1 - effectiveSharePct)).toFixed(2));
    producerProcurement = Number((netStackAfterTransit * effectiveSharePct).toFixed(2));
  } else if (originPlantGateCost !== null) {
    // Commercial origination: producer captures their plant-gate cost plus ~92% of the green compliance premium,
    // leaving a realistic €2.50 to €6.00/MWh origination desk margin.
    const greenSpread = netStackAfterTransit - originPlantGateCost;
    if (greenSpread > 0) {
      const deskTake = Math.min(6.50, Math.max(2.50, Number((greenSpread / 15).toFixed(2))));
      deskNetMargin = deskTake;
      producerProcurement = Number((netStackAfterTransit - deskNetMargin).toFixed(2));
    } else {
      producerProcurement = Number(originPlantGateCost.toFixed(2));
      deskNetMargin = Number((netStackAfterTransit - originPlantGateCost).toFixed(2));
    }
  }

  return {
    deskNetMarginEurPerMWh: deskNetMargin,
    producerProcurementEurPerMWh: producerProcurement,
    marginAllocationType: allocationType,
  };
}
