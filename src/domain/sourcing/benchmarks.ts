import { getAssumption, getAssumptionDefinition } from '../assumptions/registry';

/**
 * Country-level farm-gate biomethane procurement benchmarks.
 *
 * Descriptive fields live here. The prices are desk indicative estimates with no transaction
 * evidence on file; their current values come from the commercial assumptions register
 * (`farmgate.<CC>.*`), where the desk can see and override them.
 */

export interface FarmgateBenchmark {
  countryCode: string;
  countryName: string;
  primaryFeedstocks: string;
  typicalCI: number;
  pricingMode: 'TTF_PLUS_PREMIUM' | 'FIXED_FARMGATE' | 'NBP_PLUS_PREMIUM';
  description: string;
  subsidyWarning?: string;
}

export const REGIONAL_FARMGATE_BENCHMARKS: Record<string, FarmgateBenchmark> = {
  DK: {
    countryCode: 'DK',
    countryName: 'Denmark',
    primaryFeedstocks: 'Manure co-digestion & agricultural slurry',
    typicalCI: -100,
    pricingMode: 'TTF_PLUS_PREMIUM',
    description: 'Danish large-scale co-digestion plants. Highly liquid farmgate market linked to TTF plus green manure premium.',
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    primaryFeedstocks: 'Manure co-digestion / Energy crops',
    typicalCI: -85,
    pricingMode: 'FIXED_FARMGATE',
    description: 'Post-EEG unsubsidized and compliance-oriented biomethane facilities. High farmgate value due to domestic THG quota demand.',
    subsidyWarning: 'Plants receiving statutory EEG feed-in tariffs cannot export environmental attributes to third parties without forfeiting subsidy.',
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    primaryFeedstocks: 'Agricultural waste & intermediate crops (CIVE)',
    typicalCI: 16,
    pricingMode: 'FIXED_FARMGATE',
    description: 'French agricultural anaerobic digesters. Sourcing available for unsubsidized or CPB-dedicated assets.',
    subsidyWarning: 'CRITICAL: Plants under French Obligation d’Achat (OA) have GOs owned by the State (DGEC) and auctioned on EEX. Private attribute export is strictly prohibited.',
  },
  NL: {
    countryCode: 'NL',
    countryName: 'Netherlands',
    primaryFeedstocks: 'Manure & organic food waste',
    typicalCI: -65,
    pricingMode: 'TTF_PLUS_PREMIUM',
    description: 'Dutch agricultural and industrial digesters. Procurement interacts with the annual SDE++ correction amount (correctiebedrag).',
    subsidyWarning: 'Check SDE++ subsidy correction baseline before offering fixed margins to prevent clawbacks on the producer.',
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    primaryFeedstocks: 'Energy crops & food waste',
    typicalCI: 18,
    pricingMode: 'NBP_PLUS_PREMIUM',
    description: 'GB gas network injected biomethane. Sourced on NBP gas index plus RGGO / RTFO development fuel value.',
    subsidyWarning: 'Non-EU isolated grid zone. Cannot clear UDB mass balance into EU compliance destinations without physical segregation.',
  },
  IT: {
    countryCode: 'IT',
    countryName: 'Italy',
    primaryFeedstocks: 'FORSU (organic municipal waste) & agricultural slurry',
    typicalCI: -50,
    pricingMode: 'FIXED_FARMGATE',
    description: 'Italian biomethane plants. Plants under GSE PNRR framework receive feed-in tariffs; merchant assets trade against PSV plus CIC value.',
  },
  ES: {
    countryCode: 'ES',
    countryName: 'Spain',
    primaryFeedstocks: 'Pig slurry & agro-industrial residues',
    typicalCI: -80,
    pricingMode: 'TTF_PLUS_PREMIUM',
    description: 'Spanish developing biomethane sector. Enagás GTS registry interconnection.',
  },
  SE: {
    countryCode: 'SE',
    countryName: 'Sweden',
    primaryFeedstocks: 'Sewage & food waste (Bio-LNG transport)',
    typicalCI: 12,
    pricingMode: 'FIXED_FARMGATE',
    description: 'Nordic bio-LNG and compressed biomethane transport market.',
  },
  AT: {
    countryCode: 'AT',
    countryName: 'Austria',
    primaryFeedstocks: 'Agricultural waste & maize',
    typicalCI: 28,
    pricingMode: 'FIXED_FARMGATE',
    description: 'Austrian interconnected grid. Governed by EGG (Renewable Gas Act) quotas.',
  },
  BE: {
    countryCode: 'BE',
    countryName: 'Belgium',
    primaryFeedstocks: 'Agri-waste & organic residues',
    typicalCI: 14,
    pricingMode: 'TTF_PLUS_PREMIUM',
    description: 'Belgian hub-connected biomethane (ZTP).',
  },
};

/**
 * Calculate the estimated farmgate procurement cost in €/MWh for a plant.
 */
export function estimateFarmgateProcurementCost(
  countryCode: string,
  feedstockKey: string = 'manure',
  ciScore: number = -100,
  ttfPrice: number = 32.50
): {
  estimatedCostEurMwh: number;
  mode: 'TTF_PLUS_PREMIUM' | 'FIXED_FARMGATE';
  premiumEurMwh: number;
  rationale: string;
  isRestrictedSubsidy: boolean;
} {
  const c = countryCode.toUpperCase();
  const benchmark = REGIONAL_FARMGATE_BENCHMARKS[c] || {
    countryCode: c,
    countryName: c,
    primaryFeedstocks: 'Generic biomethane',
    typicalCI: 15,
    pricingMode: 'TTF_PLUS_PREMIUM' as const,
    description: 'European standard benchmark.',
  };
  const key = getAssumptionDefinition(`farmgate.${c}.premiumEurPerMwh`) ? c : 'DEFAULT';
  const premium = getAssumption(`farmgate.${key}.premiumEurPerMwh`);
  const fixedPrice = getAssumption(`farmgate.${key}.fixedPriceEurPerMwh`);

  // Adjust premium for carbon-intensity quality (negative CI commands a higher premium)
  let adjustedPremium = premium;
  if (ciScore <= -80) {
    adjustedPremium += getAssumption('farmgate.negativeCiUpliftEurPerMwh');
  } else if (ciScore >= 35) {
    adjustedPremium = Math.max(
      getAssumption('farmgate.minimumPremiumEurPerMwh'),
      adjustedPremium - getAssumption('farmgate.highCiDiscountEurPerMwh'),
    );
  }

  let estimatedCost = 0;
  if (benchmark.pricingMode === 'FIXED_FARMGATE') {
    estimatedCost = fixedPrice;
  } else {
    estimatedCost = ttfPrice + adjustedPremium;
  }

  // Check French OA or German EEG restrictions
  const isRestrictedSubsidy = c === 'FR' && benchmark.subsidyWarning !== undefined;

  return {
    estimatedCostEurMwh: Number(estimatedCost.toFixed(2)),
    mode: benchmark.pricingMode === 'FIXED_FARMGATE' ? 'FIXED_FARMGATE' : 'TTF_PLUS_PREMIUM',
    premiumEurMwh: Number(adjustedPremium.toFixed(2)),
    rationale: `${benchmark.countryName} (desk estimate): ${benchmark.pricingMode === 'FIXED_FARMGATE' ? `Fixed farmgate €${fixedPrice.toFixed(2)}/MWh` : `TTF (€${ttfPrice.toFixed(2)}) + €${adjustedPremium.toFixed(2)}/MWh green premium`}`,
    isRestrictedSubsidy,
  };
}
