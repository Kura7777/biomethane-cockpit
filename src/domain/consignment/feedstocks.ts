import { AnnexClassification } from './types';

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
    notes: 'Negative due to avoided methane emissions.',
    citation: 'Annex IX-A point (g)',
  },
  food_waste: {
    id: 'food_waste',
    name: 'Bio-waste (food waste)',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [10, 35],
    defaultCI: 20,
    notes: 'Source-segregated.',
    citation: 'Annex IX-A point (a)',
  },
  sewage_sludge: {
    id: 'sewage_sludge',
    name: 'Sewage sludge',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [15, 40],
    defaultCI: 25,
    notes: '',
    citation: 'Annex IX-A point (o)',
  },
  agricultural_residues: {
    id: 'agricultural_residues',
    name: 'Straw and agricultural residues',
    category: 'Residue',
    annexClassification: 'IX_A',
    typicalCIRange: [10, 30],
    defaultCI: 18,
    notes: '',
    citation: 'Annex IX-A point (p)',
  },
  used_cooking_oil: {
    id: 'used_cooking_oil',
    name: 'Used cooking oil',
    category: 'Waste',
    annexClassification: 'IX_B',
    typicalCIRange: [10, 25],
    defaultCI: 15,
    notes: 'Subject to cap, not advanced sub-quota eligible.',
    citation: 'Annex IX-B point (b)',
  },
  energy_crops: {
    id: 'energy_crops',
    name: 'Energy crops (maize, grass silage)',
    category: 'Crop',
    annexClassification: 'CROP',
    typicalCIRange: [25, 60],
    defaultCI: 40,
    notes: 'Subject to crop cap. Excluded from advanced sub-quotas.',
    citation: 'Art. 26',
  },
  landfill_gas: {
    id: 'landfill_gas',
    name: 'Landfill gas',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [5, 25],
    defaultCI: 12,
    notes: '',
    citation: 'Annex IX-A',
  },
  industrial_bio_waste: {
    id: 'industrial_bio_waste',
    name: 'Industrial biogenic waste',
    category: 'Waste',
    annexClassification: 'IX_A',
    typicalCIRange: [15, 45],
    defaultCI: 30,
    notes: '',
    citation: 'Annex IX-A',
  },
};
