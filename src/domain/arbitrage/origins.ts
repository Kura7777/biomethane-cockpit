import { OriginProfile } from './types';

export const PRODUCING_ORIGINS: Record<string, OriginProfile> = {
  DK: {
    countryCode: 'DK',
    countryName: 'Denmark',
    flag: '🇩🇰',
    activePlants: 64,
    annualProductionTWh: 5.6,
    primaryRegistry: 'Energinet',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'straw', 'food_waste'],
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    flag: '🇩🇪',
    activePlants: 242,
    annualProductionTWh: 11.8,
    primaryRegistry: 'dena Biogasregister',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'energy_crops', 'food_waste'],
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    flag: '🇫🇷',
    activePlants: 652,
    annualProductionTWh: 10.4,
    primaryRegistry: 'EEX / GRDF',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['energy_crops', 'manure', 'food_waste', 'sewage_sludge'],
  },
  NL: {
    countryCode: 'NL',
    countryName: 'Netherlands',
    flag: '🇳🇱',
    activePlants: 82,
    annualProductionTWh: 3.2,
    primaryRegistry: 'myVertiCer',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste', 'sewage_sludge'],
  },
  ES: {
    countryCode: 'ES',
    countryName: 'Spain',
    flag: '🇪🇸',
    activePlants: 18,
    annualProductionTWh: 0.85,
    primaryRegistry: 'Enagás GTS (Sistema GdO)',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste', 'straw'],
  },
  IT: {
    countryCode: 'IT',
    countryName: 'Italy',
    flag: '🇮🇹',
    activePlants: 135,
    annualProductionTWh: 4.8,
    primaryRegistry: 'GSE / SNAM',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste', 'sewage_sludge'],
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    activePlants: 124,
    annualProductionTWh: 6.8,
    primaryRegistry: 'DfT RTFO / GGCS',
    gridZone: 'NON_EU_ISOLATED',
    typicalFeedstocks: ['food_waste', 'manure', 'energy_crops'],
  },
  SE: {
    countryCode: 'SE',
    countryName: 'Sweden',
    flag: '🇸🇪',
    activePlants: 72,
    annualProductionTWh: 2.1,
    primaryRegistry: 'Energimyndigheten',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['sewage_sludge', 'food_waste', 'manure'],
  },
  FI: {
    countryCode: 'FI',
    countryName: 'Finland',
    flag: '🇫🇮',
    activePlants: 26,
    annualProductionTWh: 0.55,
    primaryRegistry: 'Gasgrid Finland',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['food_waste', 'manure', 'sewage_sludge'],
  },
  AT: {
    countryCode: 'AT',
    countryName: 'Austria',
    flag: '🇦🇹',
    activePlants: 16,
    annualProductionTWh: 0.45,
    primaryRegistry: 'AGCS',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['energy_crops', 'manure', 'food_waste'],
  },
  BE: {
    countryCode: 'BE',
    countryName: 'Belgium',
    flag: '🇧🇪',
    activePlants: 12,
    annualProductionTWh: 0.38,
    primaryRegistry: 'VREG / SPW',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['food_waste', 'manure', 'sewage_sludge'],
  },
  PL: {
    countryCode: 'PL',
    countryName: 'Poland',
    flag: '🇵🇱',
    activePlants: 8,
    annualProductionTWh: 0.32,
    primaryRegistry: 'URE / KZR INiG',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['straw', 'manure', 'food_waste', 'energy_crops'],
  },
  CZ: {
    countryCode: 'CZ',
    countryName: 'Czech Republic',
    flag: '🇨🇿',
    activePlants: 11,
    annualProductionTWh: 0.42,
    primaryRegistry: 'OTE',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['energy_crops', 'manure', 'food_waste'],
  },
  EE: {
    countryCode: 'EE',
    countryName: 'Estonia',
    flag: '🇪🇪',
    activePlants: 7,
    annualProductionTWh: 0.28,
    primaryRegistry: 'Elering',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'sewage_sludge', 'food_waste'],
  },
  LT: {
    countryCode: 'LT',
    countryName: 'Lithuania',
    flag: '🇱🇹',
    activePlants: 6,
    annualProductionTWh: 0.22,
    primaryRegistry: 'Amber Grid',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'straw', 'food_waste'],
  },
  LV: {
    countryCode: 'LV',
    countryName: 'Latvia',
    flag: '🇱🇻',
    activePlants: 4,
    annualProductionTWh: 0.15,
    primaryRegistry: 'Conexus Baltic Grid',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['energy_crops', 'manure'],
  },
  CH: {
    countryCode: 'CH',
    countryName: 'Switzerland',
    flag: '🇨🇭',
    activePlants: 41,
    annualProductionTWh: 0.52,
    primaryRegistry: 'Pronovo / VSG',
    gridZone: 'NON_EU_ISOLATED',
    typicalFeedstocks: ['sewage_sludge', 'food_waste', 'manure'],
  },
  NO: {
    countryCode: 'NO',
    countryName: 'Norway',
    flag: '🇳🇴',
    activePlants: 10,
    annualProductionTWh: 0.40,
    primaryRegistry: 'Miljødirektoratet',
    gridZone: 'NON_EU_ISOLATED',
    typicalFeedstocks: ['food_waste', 'sewage_sludge', 'manure'],
  },
  IE: {
    countryCode: 'IE',
    countryName: 'Ireland',
    flag: '🇮🇪',
    activePlants: 5,
    annualProductionTWh: 0.18,
    primaryRegistry: 'Gas Networks Ireland',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'energy_crops'],
  },
  PT: {
    countryCode: 'PT',
    countryName: 'Portugal',
    flag: '🇵🇹',
    activePlants: 4,
    annualProductionTWh: 0.14,
    primaryRegistry: 'REN / EEGO',
    gridZone: 'EU_INTERCONNECTED',
    typicalFeedstocks: ['manure', 'food_waste'],
  },
};

/**
 * Route-specific transit tariffs (€/MWh) based on European gas grid interconnected tariffs
 */
export function getRouteTransitTariff(originCode: string, targetCountry: string): number {
  if (originCode === targetCountry) {
    return 0.50; // Local domestic grid injection/withdrawal
  }

  // Direct border adjacencies (e.g. Denmark -> Germany, Netherlands -> Germany, Spain -> France)
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

  // Cross-European multi-zone transit (e.g. Spain to Germany, Poland to Netherlands)
  return 3.20;
}

/**
 * Realistic Commercial Trading Desk Margin allocation:
 * In liquid European compliance markets, producers demand 88-92% of the compliance value stack.
 * An intermediary trading desk captures a realistic gross margin:
 * - Transport compliance (THG, ERE, CPB): €2.50 to €4.00/MWh
 * - Maritime Bio-LNG insetting (FuelEU): €5.00 to €8.00/MWh
 * - Wholesale / Utility GO balancing: €0.80 to €1.50/MWh
 */
export function calculateRealisticCommercialDeskMargin(
  marketId: string,
  destinationNetback: number,
  transitTariff: number
): {
  deskNetMarginEurPerMWh: number;
  producerProcurementEurPerMWh: number;
  marginAllocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE';
} {
  let targetMargin = 3.00; // default transport compliance margin (€/MWh)
  let allocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE' = 'TRANSPORT_COMPLIANCE';

  if (marketId === 'FUELEU') {
    targetMargin = 6.00; // Maritime Bio-LNG insetting spread
    allocationType = 'MARITIME_INSETTING';
  } else if (marketId === 'VOL_SCOPE1' || marketId === 'DK_GO' || marketId === 'EU_ETS1') {
    targetMargin = 1.20; // Wholesale / Utility balancing
    allocationType = 'WHOLESALE_BASE';
  } else if (marketId === 'DE_THG') {
    targetMargin = 3.50; // High-value German THG quota matching
  } else if (marketId === 'NL_ERE') {
    targetMargin = 2.80; // Dutch ERE mandate
  } else if (marketId === 'FR_CPB') {
    targetMargin = 2.50; // French CPB supplier obligation
  }

  // Ensure desk margin does not exceed available headroom after transit
  const maxFeasibleMargin = Math.max(0.50, destinationNetback - transitTariff - 28.00); // 28 is baseline molecule
  const deskNetMargin = Math.min(targetMargin, maxFeasibleMargin);
  const producerProcurement = Math.max(28.00, destinationNetback - transitTariff - deskNetMargin);

  return {
    deskNetMarginEurPerMWh: deskNetMargin,
    producerProcurementEurPerMWh: producerProcurement,
    marginAllocationType: allocationType,
  };
}
