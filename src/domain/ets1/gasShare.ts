import type { Ets1Sector } from './sites';

/**
 * Natural-gas share of combustion CO2, by ETS1 sector: how much of a site's verified tonnage comes
 * from burning natural gas, the only fuel biomethane replaces. Applied to HIGH/MEDIUM-fit sites when
 * sizing the biomethane potential (a refinery burns mostly its own refinery gas, coke and fuel oil).
 *
 * Source: Eurostat energy balances (nrg_bal_c), EU27_2020, reference year 2024, unit TJ (net
 * calorific basis), dataset updated 2026-08-27, retrieved 2026-09-30 via the Eurostat dissemination
 * API (https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_bal_c).
 *   share = gas TJ x 56.1 / sum over combustible fuels (fuel TJ x IPCC default EF)
 * Emission factors: 2006 IPCC Guidelines for National GHG Inventories, vol. 2 ch. 1 table 1.4
 * (kg CO2/TJ NCV): natural gas 56,100; refinery gas 57,600; LPG 63,100; petroleum coke 97,500; fuel oil
 * 77,400; gas/diesel oil 74,100; anthracite 98,300; coking and other bituminous coal 94,600;
 * sub-bituminous 96,100; lignite 101,000; coke 107,000; coke oven gas 44,400; blast furnace gas
 * 260,000; other recovered gases 182,000; peat 106,000; industrial waste 143,000; non-renewable
 * municipal waste 91,700; other oil products, naphtha, bitumen etc. as in table 1.4.
 * Electricity, heat, biomass, biogas and renewable waste are excluded (no fossil CO2 in ETS1 terms).
 *
 * Balance rows used: refining = NRG_PR_E (energy-sector own use, petroleum refineries); chemicals and
 * pharma = FC_IND_CPC_E (pharma has no row of its own; it sits inside chemical and petrochemical);
 * paper = FC_IND_PPP_E; food = FC_IND_FBT_E; glass, ceramics and minerals = FC_IND_NMM_E; other
 * industry and unclassified = FC_IND_NSP_E (industry not elsewhere specified). Gas-named power and heat
 * plants are 1.0: the fit rule already requires gas evidence in the site name.
 *
 * Decisions and limits:
 *  - Energy use only. Feedstock gas (ammonia, hydrogen, methanol: 458,572 TJ of non-energy gas use in
 *    EU27 2024) is not split by sector in nrg_bal_c, so it is left out. Biomethane can replace feedstock
 *    gas too, so ammonia and hydrogen sites are understated: a deliberate low estimate.
 *  - FC_IND_NMM_E also holds cement and lime (coal, petroleum coke), which are LOW fit here, so the share
 *    for glass and ceramics is conservative.
 *  - Sector averages for the whole EU; a single site can differ a lot. The EUTL records no fuel.
 */
export interface GasShareFuel {
  siec: string;
  name: string;
  /** Terajoules, EU27 2024. */
  tj: number;
  /** IPCC 2006 default CO2 emission factor, kg per TJ (NCV). */
  efKgPerTj: number;
}

export interface GasShareRow {
  balance: string;
  label: string;
  fuels: GasShareFuel[];
}

export const GAS_SHARE_SOURCE_URL = 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table?lang=en';
export const GAS_EF_KG_PER_TJ = 56100;
const ROUND = 100;

/** Gas CO2 over all combustible-fuel CO2, rounded to 2 decimals. */
export function gasShareOf(fuels: GasShareFuel[]): number {
  const gas = fuels.filter(f => f.siec === 'G3000').reduce((s, f) => s + f.tj * f.efKgPerTj, 0);
  const all = fuels.reduce((s, f) => s + f.tj * f.efKgPerTj, 0);
  return all > 0 ? Math.round((gas / all) * ROUND) / ROUND : 0;
}

export const ETS1_GAS_SHARE_ROWS: Partial<Record<Ets1Sector, GasShareRow>> = {
  REFINING_OIL_GAS: {
    balance: 'NRG_PR_E',
    label: 'Energy sector own use: oil refineries',
    fuels: [
      { siec: 'C0129', name: "Other bituminous coal", tj: 676, efKgPerTj: 94600 },
      { siec: 'C0350', name: "Coke oven gas", tj: 1282, efKgPerTj: 44400 },
      { siec: 'G3000', name: "Natural gas", tj: 270578, efKgPerTj: 56100 },
      { siec: 'O4610', name: "Refinery gas", tj: 779959, efKgPerTj: 57600 },
      { siec: 'O4630', name: "Liquefied petroleum gases", tj: 24977, efKgPerTj: 63100 },
      { siec: 'O4640', name: "Naphtha", tj: 54, efKgPerTj: 73300 },
      { siec: 'O4652XR5210B', name: "Motor gasoline (excluding biofuel portion)", tj: 121, efKgPerTj: 69300 },
      { siec: 'O4661XR5230B', name: "Kerosene-type jet fuel (excluding biofuel portion)", tj: 74, efKgPerTj: 71500 },
      { siec: 'O4671XR5220B', name: "Gas oil and diesel oil (excluding biofuel portion)", tj: 1236, efKgPerTj: 74100 },
      { siec: 'O4680', name: "Fuel oil", tj: 70264, efKgPerTj: 77400 },
      { siec: 'O4692', name: "Lubricants", tj: 7, efKgPerTj: 73300 },
      { siec: 'O4694', name: "Petroleum coke", tj: 118808, efKgPerTj: 97500 },
      { siec: 'O4695', name: "Bitumen", tj: 0, efKgPerTj: 80700 },
      { siec: 'O4699', name: "Other oil products n.e.c.", tj: 34830, efKgPerTj: 73300 },
      { siec: 'W6220', name: "Non-renewable municipal waste", tj: 519, efKgPerTj: 91700 },
    ],
  },
  CHEMICALS: {
    balance: 'FC_IND_CPC_E',
    label: 'Final consumption: chemical and petrochemical',
    fuels: [
      { siec: 'C0110', name: "Anthracite", tj: 1227, efKgPerTj: 98300 },
      { siec: 'C0129', name: "Other bituminous coal", tj: 48084, efKgPerTj: 94600 },
      { siec: 'C0220', name: "Lignite", tj: 12847, efKgPerTj: 101000 },
      { siec: 'C0311', name: "Coke oven coke", tj: 6824, efKgPerTj: 107000 },
      { siec: 'C0330', name: "Brown coal briquettes", tj: 1167, efKgPerTj: 97500 },
      { siec: 'C0350', name: "Coke oven gas", tj: 2825, efKgPerTj: 44400 },
      { siec: 'C0379', name: "Other recovered gases", tj: 1654, efKgPerTj: 182000 },
      { siec: 'G3000', name: "Natural gas", tj: 677547, efKgPerTj: 56100 },
      { siec: 'O4200', name: "Natural gas liquids", tj: 1631, efKgPerTj: 64200 },
      { siec: 'O4610', name: "Refinery gas", tj: 164158, efKgPerTj: 57600 },
      { siec: 'O4630', name: "Liquefied petroleum gases", tj: 35979, efKgPerTj: 63100 },
      { siec: 'O4640', name: "Naphtha", tj: 39708, efKgPerTj: 73300 },
      { siec: 'O4652XR5210B', name: "Motor gasoline (excluding biofuel portion)", tj: 478, efKgPerTj: 69300 },
      { siec: 'O4669', name: "Other kerosene", tj: 46, efKgPerTj: 71900 },
      { siec: 'O4671XR5220B', name: "Gas oil and diesel oil (excluding biofuel portion)", tj: 8680, efKgPerTj: 74100 },
      { siec: 'O4680', name: "Fuel oil", tj: 14888, efKgPerTj: 77400 },
      { siec: 'O4691', name: "White spirit and special boiling point industrial spirits", tj: 18, efKgPerTj: 73300 },
      { siec: 'O4692', name: "Lubricants", tj: 8400, efKgPerTj: 73300 },
      { siec: 'O4694', name: "Petroleum coke", tj: 6251, efKgPerTj: 97500 },
      { siec: 'O4699', name: "Other oil products n.e.c.", tj: 5658, efKgPerTj: 73300 },
      { siec: 'W6100', name: "Industrial waste (non-renewable)", tj: 14213, efKgPerTj: 143000 },
      { siec: 'W6220', name: "Non-renewable municipal waste", tj: 1093, efKgPerTj: 91700 },
    ],
  },
  PHARMA: {
    balance: 'FC_IND_CPC_E',
    label: 'Final consumption: chemical and petrochemical',
    fuels: [
      { siec: 'C0110', name: "Anthracite", tj: 1227, efKgPerTj: 98300 },
      { siec: 'C0129', name: "Other bituminous coal", tj: 48084, efKgPerTj: 94600 },
      { siec: 'C0220', name: "Lignite", tj: 12847, efKgPerTj: 101000 },
      { siec: 'C0311', name: "Coke oven coke", tj: 6824, efKgPerTj: 107000 },
      { siec: 'C0330', name: "Brown coal briquettes", tj: 1167, efKgPerTj: 97500 },
      { siec: 'C0350', name: "Coke oven gas", tj: 2825, efKgPerTj: 44400 },
      { siec: 'C0379', name: "Other recovered gases", tj: 1654, efKgPerTj: 182000 },
      { siec: 'G3000', name: "Natural gas", tj: 677547, efKgPerTj: 56100 },
      { siec: 'O4200', name: "Natural gas liquids", tj: 1631, efKgPerTj: 64200 },
      { siec: 'O4610', name: "Refinery gas", tj: 164158, efKgPerTj: 57600 },
      { siec: 'O4630', name: "Liquefied petroleum gases", tj: 35979, efKgPerTj: 63100 },
      { siec: 'O4640', name: "Naphtha", tj: 39708, efKgPerTj: 73300 },
      { siec: 'O4652XR5210B', name: "Motor gasoline (excluding biofuel portion)", tj: 478, efKgPerTj: 69300 },
      { siec: 'O4669', name: "Other kerosene", tj: 46, efKgPerTj: 71900 },
      { siec: 'O4671XR5220B', name: "Gas oil and diesel oil (excluding biofuel portion)", tj: 8680, efKgPerTj: 74100 },
      { siec: 'O4680', name: "Fuel oil", tj: 14888, efKgPerTj: 77400 },
      { siec: 'O4691', name: "White spirit and special boiling point industrial spirits", tj: 18, efKgPerTj: 73300 },
      { siec: 'O4692', name: "Lubricants", tj: 8400, efKgPerTj: 73300 },
      { siec: 'O4694', name: "Petroleum coke", tj: 6251, efKgPerTj: 97500 },
      { siec: 'O4699', name: "Other oil products n.e.c.", tj: 5658, efKgPerTj: 73300 },
      { siec: 'W6100', name: "Industrial waste (non-renewable)", tj: 14213, efKgPerTj: 143000 },
      { siec: 'W6220', name: "Non-renewable municipal waste", tj: 1093, efKgPerTj: 91700 },
    ],
  },
  PAPER: {
    balance: 'FC_IND_PPP_E',
    label: 'Final consumption: paper, pulp and printing',
    fuels: [
      { siec: 'C0129', name: "Other bituminous coal", tj: 9380, efKgPerTj: 94600 },
      { siec: 'C0210', name: "Sub-bituminous coal", tj: 105, efKgPerTj: 96100 },
      { siec: 'C0220', name: "Lignite", tj: 802, efKgPerTj: 101000 },
      { siec: 'C0320', name: "Patent fuel", tj: 1, efKgPerTj: 97500 },
      { siec: 'C0330', name: "Brown coal briquettes", tj: 1749, efKgPerTj: 97500 },
      { siec: 'G3000', name: "Natural gas", tj: 248927, efKgPerTj: 56100 },
      { siec: 'O4630', name: "Liquefied petroleum gases", tj: 6732, efKgPerTj: 63100 },
      { siec: 'O4652XR5210B', name: "Motor gasoline (excluding biofuel portion)", tj: 4, efKgPerTj: 69300 },
      { siec: 'O4669', name: "Other kerosene", tj: 4, efKgPerTj: 71900 },
      { siec: 'O4671XR5220B', name: "Gas oil and diesel oil (excluding biofuel portion)", tj: 5974, efKgPerTj: 74100 },
      { siec: 'O4680', name: "Fuel oil", tj: 12921, efKgPerTj: 77400 },
      { siec: 'O4699', name: "Other oil products n.e.c.", tj: 40, efKgPerTj: 73300 },
      { siec: 'P1100', name: "Peat", tj: 1766, efKgPerTj: 106000 },
      { siec: 'W6100', name: "Industrial waste (non-renewable)", tj: 7676, efKgPerTj: 143000 },
      { siec: 'W6220', name: "Non-renewable municipal waste", tj: 5341, efKgPerTj: 91700 },
    ],
  },
  FOOD_BEVERAGE: {
    balance: 'FC_IND_FBT_E',
    label: 'Final consumption: food, beverages and tobacco',
    fuels: [
      { siec: 'C0110', name: "Anthracite", tj: 138, efKgPerTj: 98300 },
      { siec: 'C0121', name: "Coking coal", tj: 0, efKgPerTj: 94600 },
      { siec: 'C0129', name: "Other bituminous coal", tj: 23368, efKgPerTj: 94600 },
      { siec: 'C0220', name: "Lignite", tj: 2646, efKgPerTj: 101000 },
      { siec: 'C0311', name: "Coke oven coke", tj: 4675, efKgPerTj: 107000 },
      { siec: 'C0320', name: "Patent fuel", tj: 0, efKgPerTj: 97500 },
      { siec: 'C0330', name: "Brown coal briquettes", tj: 1360, efKgPerTj: 97500 },
      { siec: 'G3000', name: "Natural gas", tj: 532797, efKgPerTj: 56100 },
      { siec: 'O4200', name: "Natural gas liquids", tj: 119, efKgPerTj: 64200 },
      { siec: 'O4620', name: "Ethane", tj: 1, efKgPerTj: 61600 },
      { siec: 'O4630', name: "Liquefied petroleum gases", tj: 28564, efKgPerTj: 63100 },
      { siec: 'O4652XR5210B', name: "Motor gasoline (excluding biofuel portion)", tj: 89, efKgPerTj: 69300 },
      { siec: 'O4661XR5230B', name: "Kerosene-type jet fuel (excluding biofuel portion)", tj: 1, efKgPerTj: 71500 },
      { siec: 'O4669', name: "Other kerosene", tj: 75, efKgPerTj: 71900 },
      { siec: 'O4671XR5220B', name: "Gas oil and diesel oil (excluding biofuel portion)", tj: 23210, efKgPerTj: 74100 },
      { siec: 'O4680', name: "Fuel oil", tj: 9991, efKgPerTj: 77400 },
      { siec: 'O4699', name: "Other oil products n.e.c.", tj: 31, efKgPerTj: 73300 },
      { siec: 'W6100', name: "Industrial waste (non-renewable)", tj: 482, efKgPerTj: 143000 },
      { siec: 'W6220', name: "Non-renewable municipal waste", tj: 173, efKgPerTj: 91700 },
    ],
  },
  GLASS_CERAMICS: {
    balance: 'FC_IND_NMM_E',
    label: 'Final consumption: non-metallic minerals',
    fuels: [
      { siec: 'C0110', name: "Anthracite", tj: 1863, efKgPerTj: 98300 },
      { siec: 'C0121', name: "Coking coal", tj: 11, efKgPerTj: 94600 },
      { siec: 'C0129', name: "Other bituminous coal", tj: 32841, efKgPerTj: 94600 },
      { siec: 'C0210', name: "Sub-bituminous coal", tj: 5316, efKgPerTj: 96100 },
      { siec: 'C0220', name: "Lignite", tj: 2203, efKgPerTj: 101000 },
      { siec: 'C0311', name: "Coke oven coke", tj: 13264, efKgPerTj: 107000 },
      { siec: 'C0330', name: "Brown coal briquettes", tj: 43740, efKgPerTj: 97500 },
      { siec: 'C0340', name: "Coal tar", tj: 13, efKgPerTj: 80700 },
      { siec: 'C0350', name: "Coke oven gas", tj: 1959, efKgPerTj: 44400 },
      { siec: 'C0371', name: "Blast furnace gas", tj: 0, efKgPerTj: 260000 },
      { siec: 'C0379', name: "Other recovered gases", tj: 25, efKgPerTj: 182000 },
      { siec: 'G3000', name: "Natural gas", tj: 456239, efKgPerTj: 56100 },
      { siec: 'O4200', name: "Natural gas liquids", tj: 29, efKgPerTj: 64200 },
      { siec: 'O4630', name: "Liquefied petroleum gases", tj: 11969, efKgPerTj: 63100 },
      { siec: 'O4652XR5210B', name: "Motor gasoline (excluding biofuel portion)", tj: 21, efKgPerTj: 69300 },
      { siec: 'O4661XR5230B', name: "Kerosene-type jet fuel (excluding biofuel portion)", tj: 0, efKgPerTj: 71500 },
      { siec: 'O4669', name: "Other kerosene", tj: 71, efKgPerTj: 71900 },
      { siec: 'O4671XR5220B', name: "Gas oil and diesel oil (excluding biofuel portion)", tj: 17978, efKgPerTj: 74100 },
      { siec: 'O4680', name: "Fuel oil", tj: 10664, efKgPerTj: 77400 },
      { siec: 'O4694', name: "Petroleum coke", tj: 141991, efKgPerTj: 97500 },
      { siec: 'O4699', name: "Other oil products n.e.c.", tj: 5955, efKgPerTj: 73300 },
      { siec: 'P1100', name: "Peat", tj: 47, efKgPerTj: 106000 },
      { siec: 'W6100', name: "Industrial waste (non-renewable)", tj: 130119, efKgPerTj: 143000 },
      { siec: 'W6220', name: "Non-renewable municipal waste", tj: 26341, efKgPerTj: 91700 },
    ],
  },
  OTHER_INDUSTRY: {
    balance: 'FC_IND_NSP_E',
    label: 'Final consumption: industry not elsewhere specified',
    fuels: [
      { siec: 'C0110', name: "Anthracite", tj: 133, efKgPerTj: 98300 },
      { siec: 'C0129', name: "Other bituminous coal", tj: 6910, efKgPerTj: 94600 },
      { siec: 'C0220', name: "Lignite", tj: 252, efKgPerTj: 101000 },
      { siec: 'C0311', name: "Coke oven coke", tj: 822, efKgPerTj: 107000 },
      { siec: 'C0330', name: "Brown coal briquettes", tj: 20, efKgPerTj: 97500 },
      { siec: 'C0350', name: "Coke oven gas", tj: 11, efKgPerTj: 44400 },
      { siec: 'G3000', name: "Natural gas", tj: 73624, efKgPerTj: 56100 },
      { siec: 'O4200', name: "Natural gas liquids", tj: 6, efKgPerTj: 64200 },
      { siec: 'O4630', name: "Liquefied petroleum gases", tj: 5347, efKgPerTj: 63100 },
      { siec: 'O4652XR5210B', name: "Motor gasoline (excluding biofuel portion)", tj: 65, efKgPerTj: 69300 },
      { siec: 'O4661XR5230B', name: "Kerosene-type jet fuel (excluding biofuel portion)", tj: 0, efKgPerTj: 71500 },
      { siec: 'O4669', name: "Other kerosene", tj: 214, efKgPerTj: 71900 },
      { siec: 'O4671XR5220B', name: "Gas oil and diesel oil (excluding biofuel portion)", tj: 14536, efKgPerTj: 74100 },
      { siec: 'O4680', name: "Fuel oil", tj: 1995, efKgPerTj: 77400 },
      { siec: 'O4691', name: "White spirit and special boiling point industrial spirits", tj: 6739, efKgPerTj: 73300 },
      { siec: 'O4694', name: "Petroleum coke", tj: 5, efKgPerTj: 97500 },
      { siec: 'O4699', name: "Other oil products n.e.c.", tj: 2370, efKgPerTj: 73300 },
      { siec: 'P1100', name: "Peat", tj: 30, efKgPerTj: 106000 },
      { siec: 'W6100', name: "Industrial waste (non-renewable)", tj: 371, efKgPerTj: 143000 },
      { siec: 'W6220', name: "Non-renewable municipal waste", tj: 410, efKgPerTj: 91700 },
    ],
  },
  UNCLASSIFIED: {
    balance: 'FC_IND_NSP_E',
    label: 'Final consumption: industry not elsewhere specified',
    fuels: [
      { siec: 'C0110', name: "Anthracite", tj: 133, efKgPerTj: 98300 },
      { siec: 'C0129', name: "Other bituminous coal", tj: 6910, efKgPerTj: 94600 },
      { siec: 'C0220', name: "Lignite", tj: 252, efKgPerTj: 101000 },
      { siec: 'C0311', name: "Coke oven coke", tj: 822, efKgPerTj: 107000 },
      { siec: 'C0330', name: "Brown coal briquettes", tj: 20, efKgPerTj: 97500 },
      { siec: 'C0350', name: "Coke oven gas", tj: 11, efKgPerTj: 44400 },
      { siec: 'G3000', name: "Natural gas", tj: 73624, efKgPerTj: 56100 },
      { siec: 'O4200', name: "Natural gas liquids", tj: 6, efKgPerTj: 64200 },
      { siec: 'O4630', name: "Liquefied petroleum gases", tj: 5347, efKgPerTj: 63100 },
      { siec: 'O4652XR5210B', name: "Motor gasoline (excluding biofuel portion)", tj: 65, efKgPerTj: 69300 },
      { siec: 'O4661XR5230B', name: "Kerosene-type jet fuel (excluding biofuel portion)", tj: 0, efKgPerTj: 71500 },
      { siec: 'O4669', name: "Other kerosene", tj: 214, efKgPerTj: 71900 },
      { siec: 'O4671XR5220B', name: "Gas oil and diesel oil (excluding biofuel portion)", tj: 14536, efKgPerTj: 74100 },
      { siec: 'O4680', name: "Fuel oil", tj: 1995, efKgPerTj: 77400 },
      { siec: 'O4691', name: "White spirit and special boiling point industrial spirits", tj: 6739, efKgPerTj: 73300 },
      { siec: 'O4694', name: "Petroleum coke", tj: 5, efKgPerTj: 97500 },
      { siec: 'O4699', name: "Other oil products n.e.c.", tj: 2370, efKgPerTj: 73300 },
      { siec: 'P1100', name: "Peat", tj: 30, efKgPerTj: 106000 },
      { siec: 'W6100', name: "Industrial waste (non-renewable)", tj: 371, efKgPerTj: 143000 },
      { siec: 'W6220', name: "Non-renewable municipal waste", tj: 410, efKgPerTj: 91700 },
    ],
  },
};

/** Sectors that get a share. Power and heat is 1.0 (gas evidence is already required by the fit rule). */
export const ETS1_GAS_SHARE_SECTORS: Ets1Sector[] = [
  'REFINING_OIL_GAS', 'CHEMICALS', 'PHARMA', 'PAPER', 'FOOD_BEVERAGE', 'GLASS_CERAMICS', 'OTHER_INDUSTRY', 'UNCLASSIFIED', 'POWER_HEAT',
];

/** Default gas share of site emissions (0-1) by sector; the registry holds the editable copy. */
export function defaultGasShare(sector: Ets1Sector): number {
  if (sector === 'POWER_HEAT') return 1;
  const row = ETS1_GAS_SHARE_ROWS[sector];
  return row ? gasShareOf(row.fuels) : 0;
}
