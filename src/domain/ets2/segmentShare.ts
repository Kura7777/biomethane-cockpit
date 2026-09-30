/**
 * Share of a country's natural-gas demand that falls under EU ETS2 (buildings, commercial and public
 * services, agriculture and other non-industrial users), used to scope supplier volumes that are
 * disclosed for ALL customer segments (ETS1 industry and power plants are outside ETS2).
 *
 * Source: Eurostat energy balances (nrg_bal_c), natural gas G3000, reference year 2024, unit GWh,
 * dataset updated 2026-08-27, retrieved 2026-09-30 via the Eurostat dissemination API.
 *   share = FC_OTH_E / (FC_E + TI_EHG_E)
 *   FC_OTH_E  final consumption in other sectors (households, commercial and public services,
 *             agriculture/forestry/fishing, not elsewhere specified)
 *   FC_E      final energy consumption (industry, transport and other sectors)
 *   TI_EHG_E  transformation input to electricity and heat generation (power/CHP, mostly ETS1)
 * The denominator approximates the gas a retailer can sell to end customers (industry, power, buildings).
 * Industrial gas outside ETS1 (small boilers under 20 MW) is also ETS2 but cannot be split out of
 * FC_IND_E, so the share is a conservative (low) estimate of the ETS2-covered part.
 *
 * France uses the regulator's own segment split instead, because the disclosed French volumes (CRE
 * report) exclude gas-fired power plants and so match its perimeter: CRE report 2025-08 (16 Oct 2025),
 * p. 80, 31 Dec 2024: residential 96.7 TWh + non-residential on distribution 151.0 TWh (buildings,
 * condominiums and small industrial sites, mostly under 5 GWh) out of 355 TWh; the 107.1 TWh of large
 * sites on the transport network is treated as outside ETS2.
 */
export interface Ets2SegmentShare {
  iso: string;
  name: string;
  year: number;
  fcOthGWh: number;
  fcGWh: number;
  tiEhgGWh: number;
  /** A regulator-published share that replaces the Eurostat calculation, with its source. */
  override?: { share: number; url: string; note: string };
}

export const CRE_RETAIL_REPORT_URL =
  'https://www.cre.fr/fileadmin/Documents/Rapports_et_etudes/2025/Rapport_Fonctionnement_marches_de_detail_2023-2024.pdf';

export const ETS2_SEGMENT_SHARE_SOURCE_URL =
  'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table?lang=en';

const RAW: Ets2SegmentShare[] = [
  { iso: 'AT', name: 'Austria', year: 2024, fcOthGWh: 17137, fcGWh: 43843, tiEhgGWh: 18481 },
  { iso: 'BE', name: 'Belgium', year: 2024, fcOthGWh: 55398, fcGWh: 100933, tiEhgGWh: 22702 },
  { iso: 'CZ', name: 'Czechia', year: 2024, fcOthGWh: 28158, fcGWh: 49466, tiEhgGWh: 14991 },
  { iso: 'DE', name: 'Germany', year: 2024, fcOthGWh: 320085, fcGWh: 523678, tiEhgGWh: 224002 },
  { iso: 'ES', name: 'Spain', year: 2024, fcOthGWh: 60032, fcGWh: 156536, tiEhgGWh: 97044 },
  {
    iso: 'FR', name: 'France', year: 2024, fcOthGWh: 158679, fcGWh: 263330, tiEhgGWh: 45988,
    override: {
      share: Math.round(((96.7 + 151.0) / 355) * 1000) / 1000,
      url: CRE_RETAIL_REPORT_URL,
      note: 'CRE report 2025-08, 31 Dec 2024: (residential 96.7 + non-residential on distribution 151.0 TWh) / 355 TWh; transport-network sites (107.1 TWh) excluded. Eurostat-based figure would be 0.513.',
    },
  },
  { iso: 'HU', name: 'Hungary', year: 2024, fcOthGWh: 37718, fcGWh: 52214, tiEhgGWh: 20468 },
  { iso: 'IE', name: 'Ireland', year: 2024, fcOthGWh: 9513, fcGWh: 20550, tiEhgGWh: 28096 },
  { iso: 'IT', name: 'Italy', year: 2024, fcOthGWh: 224725, fcGWh: 347731, tiEhgGWh: 225220 },
  { iso: 'NL', name: 'Netherlands', year: 2024, fcOthGWh: 95347, fcGWh: 144022, tiEhgGWh: 82060 },
  { iso: 'PL', name: 'Poland', year: 2024, fcOthGWh: 65880, fcGWh: 112300, tiEhgGWh: 46440 },
  { iso: 'RO', name: 'Romania', year: 2024, fcOthGWh: 39878, fcGWh: 57788, tiEhgGWh: 28712 },
];

const ROUND = 1000;

export function ets2SegmentShareOf(row: Ets2SegmentShare): number {
  return Math.round((row.fcOthGWh / (row.fcGWh + row.tiEhgGWh)) * ROUND) / ROUND;
}

/** ETS2-covered share of gas demand by ISO code (0–1). */
export const ETS2_SEGMENT_SHARES: Record<string, Ets2SegmentShare & { share: number; sourceUrl: string; sourceNote: string }> =
  Object.fromEntries(
    RAW.map(r => [
      r.iso,
      {
        ...r,
        share: r.override?.share ?? ets2SegmentShareOf(r),
        sourceUrl: r.override?.url ?? ETS2_SEGMENT_SHARE_SOURCE_URL,
        sourceNote:
          r.override?.note ??
          `Eurostat nrg_bal_c ${r.year}, natural gas: other-sector use ${r.fcOthGWh} GWh / (final consumption ${r.fcGWh} + power and heat input ${r.tiEhgGWh}) GWh. Excludes non-ETS1 industry, so a low estimate.`,
      },
    ])
  );
