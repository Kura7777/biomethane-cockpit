export interface CountryHub {
  iso: string;
  name: string;
  coords: [number, number]; // [lat, lng]
  status: 'ACTIVE' | 'EMERGING' | 'FUTURE_2028' | 'RESTRICTED';
  plants: number;
  capacityTWh: number;
  primaryFeedstock: string;
  registry: string;
}

export const EUROPEAN_HUBS: CountryHub[] = [
  { iso: 'DK', name: 'Denmark', coords: [56.2639, 9.5018], status: 'ACTIVE', plants: 83, capacityTWh: 4.8, primaryFeedstock: 'Manure & Slurry', registry: 'Energinet' },
  { iso: 'DE', name: 'Germany', coords: [51.1657, 10.4515], status: 'ACTIVE', plants: 265, capacityTWh: 11.2, primaryFeedstock: 'Manure & Energy Crops', registry: 'dena Biogasregister' },
  { iso: 'NL', name: 'Netherlands', coords: [52.1326, 5.2913], status: 'ACTIVE', plants: 88, capacityTWh: 3.4, primaryFeedstock: 'Bio-waste & Manure', registry: 'VertiCer' },
  { iso: 'FR', name: 'France', coords: [46.6034, 1.8883], status: 'ACTIVE', plants: 815, capacityTWh: 8.9, primaryFeedstock: 'Agri-waste & Cover crops', registry: 'GRTgaz / 2BSvs' },
  { iso: 'IT', name: 'Italy', coords: [42.8719, 12.5674], status: 'ACTIVE', plants: 115, capacityTWh: 4.1, primaryFeedstock: 'Agri-byproducts & Manure', registry: 'GSE / SNAM' },
  { iso: 'ES', name: 'Spain', coords: [40.4637, -3.7492], status: 'ACTIVE', plants: 36, capacityTWh: 1.8, primaryFeedstock: 'Agro-industrial & Sewage', registry: 'Enagás GTS' },
  { iso: 'SE', name: 'Sweden', coords: [60.1282, 18.6435], status: 'ACTIVE', plants: 78, capacityTWh: 2.1, primaryFeedstock: 'Sewage sludge & Waste', registry: 'Energigas Sverige' },
  { iso: 'FI', name: 'Finland', coords: [63.2468, 25.9209], status: 'ACTIVE', plants: 26, capacityTWh: 0.9, primaryFeedstock: 'Forest residue & Manure', registry: 'Gasum / Fingrid' },
  { iso: 'AT', name: 'Austria', coords: [47.5162, 14.5501], status: 'ACTIVE', plants: 18, capacityTWh: 0.8, primaryFeedstock: 'Agri-silage & Slurry', registry: 'AGCS Biomethane' },
  { iso: 'BE', name: 'Belgium', coords: [50.5039, 4.4699], status: 'ACTIVE', plants: 15, capacityTWh: 0.6, primaryFeedstock: 'Food processing waste', registry: 'Fluxys' },
  { iso: 'PL', name: 'Poland', coords: [51.9194, 19.1451], status: 'ACTIVE', plants: 5, capacityTWh: 0.4, primaryFeedstock: 'Distillery waste & Manure', registry: 'KZR INiG' },
  { iso: 'CZ', name: 'Czech Republic', coords: [49.8175, 15.4730], status: 'ACTIVE', plants: 12, capacityTWh: 0.5, primaryFeedstock: 'Agricultural residues', registry: 'OTE' },
  { iso: 'LT', name: 'Lithuania', coords: [55.1694, 23.8813], status: 'ACTIVE', plants: 3, capacityTWh: 0.2, primaryFeedstock: 'Manure & Agri-waste', registry: 'Amber Grid' },
  { iso: 'LV', name: 'Latvia', coords: [56.8796, 24.6032], status: 'ACTIVE', plants: 2, capacityTWh: 0.1, primaryFeedstock: 'Biowaste', registry: 'Conexus Baltic Grid' },
  { iso: 'EE', name: 'Estonia', coords: [58.5953, 25.0136], status: 'ACTIVE', plants: 5, capacityTWh: 0.3, primaryFeedstock: 'Sewage & Biowaste', registry: 'Elering' },
  { iso: 'GB', name: 'United Kingdom', coords: [54.5, -2.5], status: 'RESTRICTED', plants: 132, capacityTWh: 4.6, primaryFeedstock: 'Food waste & Agri-feed', registry: 'Green Gas / GGCS' },
  { iso: 'LU', name: 'Luxembourg', coords: [49.8153, 6.1296], status: 'ACTIVE', plants: 3, capacityTWh: 0.15, primaryFeedstock: 'Organic biowaste & Manure', registry: 'Creos / ILR' },
  { iso: 'CH', name: 'Switzerland', coords: [46.8182, 8.2275], status: 'EMERGING', plants: 42, capacityTWh: 0.9, primaryFeedstock: 'Organic waste', registry: 'VSG' },
  { iso: 'NO', name: 'Norway', coords: [60.4720, 8.4689], status: 'EMERGING', plants: 16, capacityTWh: 0.5, primaryFeedstock: 'Fish waste & Sewage', registry: 'Gassco' },
  { iso: 'IE', name: 'Ireland', coords: [53.4129, -8.2439], status: 'EMERGING', plants: 3, capacityTWh: 0.2, primaryFeedstock: 'Grass silage & Slurry', registry: 'Gas Networks Ireland' },
  { iso: 'PT', name: 'Portugal', coords: [39.3999, -8.2245], status: 'EMERGING', plants: 4, capacityTWh: 0.2, primaryFeedstock: 'Municipal solid waste', registry: 'REN' },
  { iso: 'SK', name: 'Slovakia', coords: [48.6690, 19.6990], status: 'EMERGING', plants: 5, capacityTWh: 0.2, primaryFeedstock: 'Agri-waste', registry: 'SPP-distribúcia' },
  { iso: 'HU', name: 'Hungary', coords: [47.1625, 19.5033], status: 'EMERGING', plants: 4, capacityTWh: 0.15, primaryFeedstock: 'Manure & Straw', registry: 'FGSZ' },
  { iso: 'RO', name: 'Romania', coords: [45.9432, 24.9668], status: 'EMERGING', plants: 2, capacityTWh: 0.1, primaryFeedstock: 'Agri-silage', registry: 'Transgaz' },
  { iso: 'GR', name: 'Greece', coords: [39.0742, 21.8243], status: 'FUTURE_2028', plants: 2, capacityTWh: 0.1, primaryFeedstock: 'Olive mill & Manure', registry: 'DESFA' },
  { iso: 'BG', name: 'Bulgaria', coords: [42.7339, 25.4858], status: 'FUTURE_2028', plants: 1, capacityTWh: 0.05, primaryFeedstock: 'Crop residues', registry: 'Bulgartransgaz' },
  { iso: 'SI', name: 'Slovenia', coords: [46.1512, 14.9955], status: 'EMERGING', plants: 2, capacityTWh: 0.08, primaryFeedstock: 'Agricultural residues', registry: 'Plinovodi' },
  { iso: 'HR', name: 'Croatia', coords: [45.1, 15.2], status: 'EMERGING', plants: 2, capacityTWh: 0.08, primaryFeedstock: 'Agri-silage & Waste', registry: 'Plinacro' },
  { iso: 'UA', name: 'Ukraine', coords: [49.0, 31.5], status: 'EMERGING', plants: 3, capacityTWh: 0.1, primaryFeedstock: 'Agri-waste & Straw', registry: 'GTSOU' },
  { iso: 'IS', name: 'Iceland', coords: [64.9631, -19.0208], status: 'EMERGING', plants: 1, capacityTWh: 0.05, primaryFeedstock: 'Geothermal & Organic waste', registry: 'Orkustofnun' },
  { iso: 'LI', name: 'Liechtenstein', coords: [47.166, 9.555], status: 'EMERGING', plants: 1, capacityTWh: 0.02, primaryFeedstock: 'Bio-waste', registry: 'LGV' },
];

export const TILE_PROVIDERS = {
  hybrid: {
    name: 'Satellite Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  satellite: {
    name: 'Satellite Clean',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  streets: {
    name: 'Roadmap',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  dark: {
    name: 'Dark Carto',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/">OSM</a>',
    subdomains: 'abcd',
  },
};
