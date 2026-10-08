import { AnnexClassification } from './types';

/**
 * Pure data, no dependency on the assumptions registry — kept separate from feedstocks.ts so the
 * registry can read these literal structures (feedstock ids, names, range bounds) at module-load
 * time without a circular import. The current *value* of a feedstock's default CI is read through
 * assumptions/registry.ts's feedstockDefaultCi() instead of the defaultCI literal here.
 */

export interface FeedstockInfo {
  id: string;
  name: string;
  category: string;  // e.g., 'Waste', 'Residue', 'Crop'
  annexClassification: AnnexClassification;
  typicalCIRange: [number, number];  // [min, max] gCO2e/MJ
  defaultCI: number;  // sensible default
  notes: string;
  citation: string;  // RED III article/annex reference
}

export const FEEDSTOCK_REGISTRY: Record<string, FeedstockInfo> = {
  manure: {
    id: 'manure',
    name: 'Animal manure and slurry',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [-150, -80],
    defaultCI: -100,
    notes: 'Negative CI from avoided methane emissions from conventional manure management. Physical property of GHG accounting, unaffected by double-counting policy changes.',
    citation: 'RED III Annex IX Part A, point (g)',
  },
  food_waste: {
    id: 'food_waste',
    name: 'Bio-waste (food waste)',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [10, 35],
    defaultCI: 20,
    notes: 'Source-segregated municipal and commercial bio-waste.',
    citation: 'RED III Annex IX Part A, point (a)',
  },
  sewage_sludge: {
    id: 'sewage_sludge',
    name: 'Sewage sludge',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [15, 40],
    defaultCI: 25,
    notes: 'Sludge from municipal wastewater treatment plants.',
    citation: 'RED III Annex IX Part A, point (o)',
  },
  agricultural_residues: {
    id: 'agricultural_residues',
    name: 'Straw and agricultural residues',
    category: 'Residue',
    annexClassification: 'IX_A',
    typicalCIRange: [10, 30],
    defaultCI: 18,
    notes: 'Cereal straw and non-food agricultural residues.',
    citation: 'RED III Annex IX Part A, point (p)',
  },
  used_cooking_oil: {
    id: 'used_cooking_oil',
    name: 'Used cooking oil (UCO)',
    category: 'Waste',
    annexClassification: 'IX_B',
    typicalCIRange: [10, 25],
    defaultCI: 15,
    notes: 'Subject to RED III Annex IX-B volume cap (typically 1.7% in Member State transpositions).',
    citation: 'RED III Annex IX Part B, point (b)',
  },
  energy_crops: {
    id: 'energy_crops',
    name: 'Energy crops (maize, grass silage)',
    category: 'Crop',
    annexClassification: 'CROP',
    typicalCIRange: [25, 60],
    defaultCI: 40,
    notes: 'Subject to food and feed crop cap under RED III Art. 26. Excluded from advanced sub-quotas.',
    citation: 'RED III Art. 26',
  },
  landfill_gas: {
    id: 'landfill_gas',
    name: 'Landfill gas',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [5, 25],
    defaultCI: 12,
    notes: 'Captured landfill methane. Claimed as Annex IX Part A(b) (biomass fraction of mixed municipal waste); Member State treatment varies — confirm per obligation.',
    citation: 'RED III Annex IX Part A(b) — Member State treatment varies',
  },
  industrial_bio_waste: {
    id: 'industrial_bio_waste',
    name: 'Industrial biogenic waste',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [15, 45],
    defaultCI: 30,
    notes: 'Food processing and industrial biogenic residues.',
    citation: 'RED III Annex IX Part A',
  },
};
