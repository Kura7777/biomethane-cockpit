import { ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { GasVolumeBasis, toNcvMWh } from './calculator';
import { ETS2_SEGMENT_SHARES } from './segmentShare';

/**
 * ETS2 country exposure: where the new carbon price bites hardest on gas used in buildings
 * and small industry, and so where suppliers and commercial users have most reason to buy
 * biomethane.
 *
 * Gas volumes are NOT shipped with the app. They are imported from a sourced dataset
 * (Eurostat nrg_bal_c: final consumption by households FC_OTH_HH_E and commercial & public
 * services FC_OTH_CP_E, natural gas G3000). Until then the table shows the countries with
 * blanks rather than invented numbers.
 */

export type CarbonPricingKind = 'NATIONAL_ETS' | 'CARBON_TAX' | 'UNKNOWN';

export interface SourcedNote {
  url: string;
  note: string;
}

export interface ExistingCarbonPricing {
  kind: CarbonPricingKind;
  label: string;
  /** Headline price on heating gas, €/tCO₂, only where a source states it. */
  priceEurPerT: number | null;
  source: SourcedNote | null;
}

export interface Ets2CountryProfile {
  iso: string;
  name: string;
  existingCarbonPricing: ExistingCarbonPricing;
  /** Imported: gas used in buildings (households + commercial/public services), TWh per year. */
  gasBuildingsTWh: number | null;
  gasVolumeBasis: GasVolumeBasis;
  gasDataYear: number | null;
  gasSource: SourcedNote | null;
  /**
   * Share (0–1) of national gas demand under ETS2, used to scope supplier volumes disclosed for all
   * customer segments. Null where no sourced share is on file.
   */
  ets2SegmentShare?: number | null;
  ets2SegmentShareSource?: SourcedNote | null;
}

const UNKNOWN_PRICING: ExistingCarbonPricing = {
  kind: 'UNKNOWN',
  label: 'Not yet researched',
  priceEurPerT: null,
  source: null,
};

const ICAP_DE: SourcedNote = {
  url: 'https://icapcarbonaction.com/en/ets/german-national-emissions-trading-system',
  note: 'BEHG fixed price €55/t in 2025; €55–65 corridor in 2026; law adopted to transition into EU ETS2.',
};

/** Only regimes with a source on file carry detail; everything else is marked unresearched. */
const KNOWN_PRICING: Record<string, ExistingCarbonPricing> = {
  DE: {
    kind: 'NATIONAL_ETS',
    label: 'BEHG national ETS (transitions into ETS2)',
    priceEurPerT: null,
    source: ICAP_DE,
  },
  AT: {
    kind: 'NATIONAL_ETS',
    label: 'NEHS national ETS',
    priceEurPerT: null,
    source: {
      url: 'https://icapcarbonaction.com/en/ets/austrian-national-emissions-certificate-trading-system',
      note: 'Austrian National Emissions Certificate Trading System covers heating and transport fuels.',
    },
  },
  SE: {
    kind: 'CARBON_TAX',
    label: 'National carbon tax (may qualify for Art. 30e(3) exemption until 2030)',
    priceEurPerT: 133.17,
    source: {
      url: 'https://taxfoundation.org/data/all/eu/carbon-taxes-europe/',
      note: 'Tax Foundation: €133.17 per tonne as of 1 April 2026 (no SEK figure published there).',
    },
  },
};

const EU27: [string, string][] = [
  ['AT', 'Austria'], ['BE', 'Belgium'], ['BG', 'Bulgaria'], ['HR', 'Croatia'], ['CY', 'Cyprus'],
  ['CZ', 'Czechia'], ['DK', 'Denmark'], ['EE', 'Estonia'], ['FI', 'Finland'], ['FR', 'France'],
  ['DE', 'Germany'], ['GR', 'Greece'], ['HU', 'Hungary'], ['IE', 'Ireland'], ['IT', 'Italy'],
  ['LV', 'Latvia'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'], ['MT', 'Malta'], ['NL', 'Netherlands'],
  ['PL', 'Poland'], ['PT', 'Portugal'], ['RO', 'Romania'], ['SK', 'Slovakia'], ['SI', 'Slovenia'],
  ['ES', 'Spain'], ['SE', 'Sweden'],
];

export const ETS2_COUNTRIES: Ets2CountryProfile[] = EU27.map(([iso, name]) => ({
  iso,
  name,
  existingCarbonPricing: KNOWN_PRICING[iso] ?? UNKNOWN_PRICING,
  gasBuildingsTWh: null,
  gasVolumeBasis: 'GCV',
  gasDataYear: null,
  gasSource: null,
  ets2SegmentShare: ETS2_SEGMENT_SHARES[iso]?.share ?? null,
  ets2SegmentShareSource: ETS2_SEGMENT_SHARES[iso]
    ? { url: ETS2_SEGMENT_SHARES[iso].sourceUrl, note: ETS2_SEGMENT_SHARES[iso].sourceNote }
    : null,
}));

/** One row of an imported dataset. Prices and sources are optional; volume is required. */
export interface Ets2CountryImportRow {
  iso: string;
  gasBuildingsTWh: number;
  gasVolumeBasis?: GasVolumeBasis;
  gasDataYear?: number;
  gasSourceUrl?: string;
  existingCarbonPriceEurPerT?: number | null;
  existingCarbonPricingLabel?: string;
  existingCarbonPricingSourceUrl?: string;
}

export interface Ets2ImportResult {
  countries: Ets2CountryProfile[];
  applied: number;
  errors: string[];
}

/** Merges an imported JSON array into the country list. Rows without a source URL are rejected. */
export function applyEts2CountryImport(base: Ets2CountryProfile[], json: string): Ets2ImportResult {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { countries: base, applied: 0, errors: ['Not valid JSON.'] };
  }
  if (!Array.isArray(parsed)) {
    return { countries: base, applied: 0, errors: ['Expected a JSON array of country rows.'] };
  }
  const byIso = new Map(base.map(c => [c.iso, { ...c }]));
  let applied = 0;
  parsed.forEach((raw, i) => {
    const row = raw as Partial<Ets2CountryImportRow>;
    const iso = typeof row.iso === 'string' ? row.iso.toUpperCase() : '';
    const target = byIso.get(iso);
    if (!target) {
      errors.push(`Row ${i + 1}: unknown or non-EU27 ISO code "${row.iso}".`);
      return;
    }
    if (typeof row.gasBuildingsTWh !== 'number' || !(row.gasBuildingsTWh >= 0)) {
      errors.push(`Row ${i + 1} (${iso}): gasBuildingsTWh must be a non-negative number.`);
      return;
    }
    if (!row.gasSourceUrl) {
      errors.push(`Row ${i + 1} (${iso}): gasSourceUrl is required — unsourced volumes are not loaded.`);
      return;
    }
    target.gasBuildingsTWh = row.gasBuildingsTWh;
    target.gasVolumeBasis = row.gasVolumeBasis === 'NCV' ? 'NCV' : 'GCV';
    target.gasDataYear = typeof row.gasDataYear === 'number' ? row.gasDataYear : null;
    target.gasSource = { url: row.gasSourceUrl, note: 'Imported gas volume' };
    if (typeof row.existingCarbonPriceEurPerT === 'number' && row.existingCarbonPricingSourceUrl) {
      target.existingCarbonPricing = {
        kind: target.existingCarbonPricing.kind === 'UNKNOWN' ? 'CARBON_TAX' : target.existingCarbonPricing.kind,
        label: row.existingCarbonPricingLabel ?? target.existingCarbonPricing.label,
        priceEurPerT: row.existingCarbonPriceEurPerT,
        source: { url: row.existingCarbonPricingSourceUrl, note: 'Imported carbon price' },
      };
    }
    applied++;
  });
  return { countries: base.map(c => byIso.get(c.iso) ?? c), applied, errors };
}

export interface Ets2CountryExposureRow {
  profile: Ets2CountryProfile;
  emissionsMtCo2: number | null;
  /** Total annual ETS2 allowance cost on building gas at the scenario price, €m. */
  ets2CostEurM: number | null;
  /** Increase versus the existing national carbon price, €m (null when the existing price is unknown). */
  incrementalCostEurM: number | null;
  /** Rank by ETS2 cost; null when no volume is loaded. */
  rank: number | null;
}

const MWH_PER_TWH = 1_000_000;
const TONNES_PER_MT = 1_000_000;
const EUR_PER_EUR_M = 1_000_000;

export function rankEts2CountryExposure(
  countries: Ets2CountryProfile[],
  ets2PriceEurPerT: number | null
): Ets2CountryExposureRow[] {
  const rows: Ets2CountryExposureRow[] = countries.map(profile => {
    if (profile.gasBuildingsTWh === null) {
      return { profile, emissionsMtCo2: null, ets2CostEurM: null, incrementalCostEurM: null, rank: null };
    }
    const ncv = toNcvMWh(profile.gasBuildingsTWh * MWH_PER_TWH, profile.gasVolumeBasis);
    const tonnes = ncv * ETS_NATURAL_GAS_TCO2_PER_MWH;
    const ets2CostEurM = ets2PriceEurPerT === null ? null : (tonnes * ets2PriceEurPerT) / EUR_PER_EUR_M;
    const existing = profile.existingCarbonPricing.priceEurPerT;
    const incrementalCostEurM =
      ets2PriceEurPerT === null || existing === null ? null : (tonnes * (ets2PriceEurPerT - existing)) / EUR_PER_EUR_M;
    return { profile, emissionsMtCo2: tonnes / TONNES_PER_MT, ets2CostEurM, incrementalCostEurM, rank: null };
  });
  const ranked = rows
    .filter(r => r.emissionsMtCo2 !== null)
    .sort((a, b) => (b.emissionsMtCo2 as number) - (a.emissionsMtCo2 as number));
  ranked.forEach((r, i) => { r.rank = i + 1; });
  return [...ranked, ...rows.filter(r => r.emissionsMtCo2 === null)];
}
