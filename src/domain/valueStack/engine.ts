import { getMarketById } from '../markets/registry';
import { MarksState } from '../netback/types';
import { Consignment } from '../consignment/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { computeCertificateValue } from '../netback/engine';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';

/**
 * Value stack: every regime in which ONE MWh of biomethane, burned by ONE consumer, lowers a
 * cost or supports a claim — and the lines that would turn stacking into double counting.
 *
 * Stacking is legitimate when several regimes recognise the same physical reduction at the same
 * consumer (e.g. FuelEU and the EU ETS for a ship burning bio-LNG). It becomes double counting
 * when the same MWh's attribute is sold to two different parties or claimed in two compliance
 * schemes (RED III Art. 31a / Union Database exist to prevent this).
 *
 * Every € value is priced through computeCertificateValue — the desk's single pricing authority —
 * from the desk marks. Rows the desk has not verified are shown but excluded from the total.
 */

export type ClientType = 'SHIP_OPERATOR' | 'ETS1_SITE' | 'ETS2_SUPPLIER' | 'DE_FUEL_SUPPLIER';

export type StackStatus =
  /** Counts now and is added to the total. */
  | 'COUNTS'
  /** Counts from 2028 (ETS2); added to the total only when the delivery year is 2028 or later. */
  | 'FROM_2028'
  /** Plausible but not verified by the desk; shown, never added to the total. */
  | 'TO_VERIFY'
  /** A claim with no direct € value (reporting, footprint). */
  | 'CLAIM';

export interface StackRow {
  regime: string;
  whatItDoes: string;
  status: StackStatus;
  /** € per MWh delivered (invoice/energy basis as entered); null for claims or missing marks. */
  eurPerMWh: number | null;
  annualEur: number | null;
  /** Engine workings (from computeCertificateValue) or the reason a value is missing. */
  workings: string;
  evidenceNeeded: string;
  legalBasis: string;
}

export interface ValueStackInputs {
  client: ClientType;
  /** Annual volume, MWh (ships: energy delivered; gas sites and suppliers: invoice/GCV MWh). */
  volumeMWh: number | null;
  /** RED III carbon intensity of the biomethane, gCO₂e/MJ. */
  carbonIntensity: number | null;
  /** Delivery year; decides whether ETS2 counts yet. */
  deliveryYear: number | null;
  /** Ships: share of this fuel burned on intra-EU voyages and at EU berth, 0–1 (rest: voyages in/out of the EU). */
  intraEuShare: number | null;
  /** ETS1 sites: share of the volume burned at the group's small sites (< 20 MW, under ETS2), 0–1. */
  smallSiteShare: number | null;
  /** Share of the ETS2 allowance cost the gas supplier passes through, 0–1. */
  ets2PassThrough: number | null;
  /** ETS2 suppliers: green-tariff premium the supplier can charge its customers, €/MWh. */
  greenTariffPremiumEurPerMWh: number | null;
  /** Your offer premium over the fuel it replaces, €/MWh — compared against the stack. */
  offerPremiumEurPerMWh: number | null;
}

export interface ValueStackResult {
  rows: StackRow[];
  /** Sum of COUNTS rows (plus FROM_2028 rows when the delivery year is 2028+), €/MWh. */
  stackEurPerMWh: number | null;
  stackAnnualEur: number | null;
  /** Stack minus offer premium: what the client is better off per MWh. */
  clientNetEurPerMWh: number | null;
  guardrails: string[];
  missingInputs: string[];
}

export const ETS2_START_YEAR = 2028;
/** Directive 2003/87/EC Art. 3ga (as amended by 2023/959): 50% of emissions from voyages in/out of the EU. */
const EXTRA_EU_VOYAGE_COVERAGE = 50 / 100;
const RED3_TRANSPORT_MAX_CI = 32.9;
/**
 * Directive 2003/87/EC Art. 3gb (as amended by 2023/959): shipping companies surrender allowances
 * for 40% of 2024 emissions, 70% of 2025 emissions and 100% from 2026.
 */
export function maritimeEtsPhaseIn(year: number | null): number | null {
  if (year === null) return null;
  if (year < 2024) return 0;
  if (year === 2024) return 40 / 100;
  if (year === 2025) return 70 / 100;
  return 1;
}

function consignmentFor(ci: number): Consignment {
  // Annex IX-A manure is the typical low-CI biomethane; the classification only matters for
  // schemes with multipliers, and the CI drives every CI-scaled value.
  const info = FEEDSTOCK_REGISTRY.manure;
  return {
    id: 'value-stack',
    name: 'Value stack',
    originCountry: 'EU',
    originCountryName: 'European Union',
    feedstock: 'manure',
    feedstockName: info.name,
    annexClassification: info.annexClassification,
    carbonIntensity: ci,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'EU',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: null,
  };
}

function priced(marketId: string, ci: number, marks: MarksState): { value: number | null; workings: string } {
  const market = getMarketById(marketId);
  if (!market) return { value: null, workings: `Market ${marketId} not in the registry.` };
  const r = computeCertificateValue(market, consignmentFor(ci), marks, 'mid');
  if (!r || r.valueEurPerMWh === null) return { value: null, workings: `No ${market.shortName} mark on the desk.` };
  return { value: r.valueEurPerMWh, workings: `${r.calculation}${r.statusNote ? ` — ${r.statusNote}` : ''}` };
}

export function computeValueStack(inputs: ValueStackInputs, marks: MarksState): ValueStackResult {
  const missingInputs: string[] = [];
  if (inputs.volumeMWh === null || !(inputs.volumeMWh > 0)) missingInputs.push('annual volume');
  if (inputs.carbonIntensity === null) missingInputs.push('carbon intensity');
  const ci = inputs.carbonIntensity ?? 0;
  const volume = inputs.volumeMWh;
  const rows: StackRow[] = [];
  const guardrails: string[] = [];

  const add = (row: Omit<StackRow, 'annualEur'>) =>
    rows.push({ ...row, annualEur: row.eurPerMWh !== null && volume !== null ? row.eurPerMWh * volume : null });

  switch (inputs.client) {
    case 'SHIP_OPERATOR': {
      const fueleu = priced('FUELEU', ci, marks);
      add({
        regime: 'FuelEU Maritime',
        whatItDoes: 'Lowers the ship\'s GHG intensity; closes the deficit or creates surplus that can be pooled to other ships.',
        status: 'COUNTS',
        eurPerMWh: fueleu.value,
        workings: fueleu.workings,
        evidenceNeeded: 'Bunker delivery note with RED-certified PoS (ISCC EU), mass-balanced chain of custody.',
        legalBasis: 'Regulation (EU) 2023/1805, Art. 10 & Annex I–II; pooling Art. 21',
      });
      if (inputs.intraEuShare === null) missingInputs.push('share burned on intra-EU voyages');
      const ets = priced('EU_ETS1', ci, marks);
      const voyageCoverage = inputs.intraEuShare === null ? null : inputs.intraEuShare + (1 - inputs.intraEuShare) * EXTRA_EU_VOYAGE_COVERAGE;
      const phaseIn = maritimeEtsPhaseIn(inputs.deliveryYear);
      const coverage = voyageCoverage === null || phaseIn === null ? null : voyageCoverage * phaseIn;
      add({
        regime: 'EU ETS (maritime)',
        whatItDoes: 'Sustainable bio-LNG is zero-rated for CO₂, so the ship surrenders fewer allowances for the fossil LNG it replaces.',
        status: 'COUNTS',
        eurPerMWh: ets.value === null || coverage === null ? null : ets.value * coverage,
        workings: voyageCoverage === null
          ? 'Enter the intra-EU share to apply voyage coverage.'
          : phaseIn === null
          ? 'Enter the delivery year to apply the maritime phase-in.'
          : `${ets.workings} × voyage coverage ${(voyageCoverage * 100).toFixed(0)}% (100% intra-EU, 50% of voyages in/out of the EU) × phase-in ${(phaseIn * 100).toFixed(0)}% (${inputs.deliveryYear})`,
        evidenceNeeded: 'Same PoS as FuelEU, reported in the ship\'s MRV emissions report. CH₄ slip is still counted from 2026.',
        legalBasis: 'Directive 2003/87/EC Art. 3ga & 14; MRV Regulation (EU) 2015/757 as amended',
      });
      add({
        regime: 'Scope 1 / CSRD reporting',
        whatItDoes: 'Lower reported fleet emissions, consistent with the two compliance claims above.',
        status: 'CLAIM',
        eurPerMWh: null,
        workings: 'Same physical reduction reported in the company\'s inventory — not a second sale of the attribute.',
        evidenceNeeded: 'The same PoS; no separate certificate sold elsewhere.',
        legalBasis: 'ESRS E1',
      });
      guardrails.push(
        'FuelEU surplus pooled to another ship moves the FuelEU benefit only; the ETS saving stays with the ship that burned the fuel. Do not sell the same MWh\'s surplus into two pools.',
        'Do not sell a GO or certificate for the same MWh to a third party for its own claim.'
      );
      break;
    }

    case 'ETS1_SITE': {
      const ets = priced('EU_ETS1', ci, marks);
      // Gas burned at the group's small sites is outside ETS1, so only the rest earns the ETS1 saving.
      const largeShare = inputs.smallSiteShare === null ? null : 1 - inputs.smallSiteShare;
      add({
        regime: 'EU ETS1 (installation)',
        whatItDoes: 'Zero-rated in the site\'s emissions report: fewer allowances to surrender for the gas replaced.',
        status: 'COUNTS',
        eurPerMWh: ets.value === null || largeShare === null ? null : ets.value * HHV_TO_LHV_FACTOR * largeShare,
        workings: ets.value === null
          ? ets.workings
          : largeShare === null
          ? 'Enter the share burned at small sites (0 if none): only gas burned at ETS1 installations earns this saving.'
          : `${ets.workings} × ${HHV_TO_LHV_FACTOR} (invoice GCV → NCV) × ${(largeShare * 100).toFixed(0)}% burned at ETS1 installations`,
        evidenceNeeded: 'RED III sustainability evidence via the Union Database (PoS assigned to the site), purchase records; accepted by the site\'s verifier.',
        legalBasis: 'Art. 38(5) and 39a of Implementing Regulation (EU) 2018/2066 & Annex VI',
      });
      if (inputs.smallSiteShare === null) missingInputs.push('share at small sites (< 20 MW), 0 if none');
      // With no small sites the pass-through cannot matter, so it is only asked for when some gas goes to them.
      const noSmallSites = inputs.smallSiteShare === 0;
      if (inputs.ets2PassThrough === null && !noSmallSites) missingInputs.push('ETS2 pass-through');
      const ets2 = priced('EU_ETS2', ci, marks);
      const factor = noSmallSites
        ? 0
        : inputs.smallSiteShare === null || inputs.ets2PassThrough === null ? null : inputs.smallSiteShare * inputs.ets2PassThrough;
      add({
        regime: 'ETS2 at the group\'s small sites (via supplier)',
        whatItDoes: 'Sites under 20 MW are outside ETS1; from 2028 their supplier\'s ETS2 cost falls if it zero-rates the biomethane and passes the saving on.',
        status: 'FROM_2028',
        eurPerMWh: ets2.value === null || factor === null ? null : ets2.value * HHV_TO_LHV_FACTOR * factor,
        workings: factor === null
          ? 'Enter the small-site share and pass-through.'
          : noSmallSites
          ? 'No gas burned at small sites, so nothing falls under ETS2.'
          : `${ets2.workings} × ${HHV_TO_LHV_FACTOR} × small-site share ${(inputs.smallSiteShare! * 100).toFixed(0)}% × pass-through ${(inputs.ets2PassThrough! * 100).toFixed(0)}%`,
        evidenceNeeded: 'Supply contract clause: supplier accounts the biomethane as zero-rated under ETS2 and passes the saving through.',
        legalBasis: 'Directive 2003/87/EC Chapter IVa & Annex III (as amended by 2023/959)',
      });
      add({
        regime: 'Scope 1 / CSRD reporting',
        whatItDoes: 'Lower reported Scope 1, consistent with the ETS claim (dual ledger while GHG Protocol guidance settles).',
        status: 'CLAIM',
        eurPerMWh: null,
        workings: 'Same physical reduction; requires the GO to be cancelled for this consumer.',
        evidenceNeeded: 'GO cancelled in the client\'s name for the same MWh as the PoS.',
        legalBasis: 'ESRS E1; RED III Art. 19 (GOs for disclosure)',
      });
      add({
        regime: 'Product carbon footprint',
        whatItDoes: 'Lower footprint on the products made at the site — increasingly asked for by the client\'s own customers.',
        status: 'CLAIM',
        eurPerMWh: null,
        workings: 'Allocation of the same site reduction to products — not an additional attribute.',
        evidenceNeeded: 'Same PoS and GO; footprint method disclosed.',
        legalBasis: 'ISO 14067 / PACT methodology',
      });
      guardrails.push(
        'The PoS and the GO for each MWh must both go to this site. Sending the PoS to a compliance market and the GO to a different company is the classic double count.',
        'ETS1 sites cannot also claim ETS2 for the same gas: fuel burned in an ETS1 installation is outside ETS2 (Annex III).'
      );
      break;
    }

    case 'ETS2_SUPPLIER': {
      const ets2 = priced('EU_ETS2', ci, marks);
      add({
        regime: 'EU ETS2 (supplier)',
        whatItDoes: 'Biomethane released for consumption has a zero emission factor, so the supplier surrenders fewer ETS2 allowances.',
        status: 'FROM_2028',
        eurPerMWh: ets2.value === null ? null : ets2.value * HHV_TO_LHV_FACTOR,
        workings: ets2.value === null ? ets2.workings : `${ets2.workings} × ${HHV_TO_LHV_FACTOR} (invoice GCV → NCV)`,
        evidenceNeeded: 'RED III sustainability evidence (PoS via the Union Database) in the supplier\'s ETS2 monitoring report.',
        legalBasis: 'Directive 2003/87/EC Chapter IVa & Annex III (as amended by 2023/959)',
      });
      add({
        regime: 'Green-gas tariff to end customers',
        whatItDoes: 'The supplier sells the same gas as a green tariff to the customer who burns it.',
        status: 'COUNTS',
        eurPerMWh: inputs.greenTariffPremiumEurPerMWh,
        workings: inputs.greenTariffPremiumEurPerMWh === null ? 'Enter the tariff premium the supplier can charge.' : 'Tariff premium entered.',
        evidenceNeeded: 'GO cancelled for the end customer who receives the zero-rated gas.',
        legalBasis: 'RED III Art. 19 (GOs for disclosure)',
      });
      guardrails.push(
        'The GO must be cancelled for the customer whose gas the supplier zero-rated — not sold to an unrelated buyer.',
        'Gas delivered to ETS1 installations is outside ETS2: those volumes earn no ETS2 saving for the supplier.'
      );
      break;
    }

    case 'DE_FUEL_SUPPLIER': {
      const thg = priced('DE_THG', ci, marks);
      add({
        regime: 'German THG quota',
        whatItDoes: 'Biomethane sold as transport fuel counts towards the supplier\'s GHG-reduction quota.',
        status: ci <= RED3_TRANSPORT_MAX_CI ? 'COUNTS' : 'TO_VERIFY',
        eurPerMWh: ci <= RED3_TRANSPORT_MAX_CI ? thg.value : null,
        workings: ci <= RED3_TRANSPORT_MAX_CI
          ? `${thg.workings}. Certificate value at the quota mark; the tradeable bundle price can be lower (see Trade builder).`
          : `CI ${ci} g/MJ fails the RED III 65% saving threshold (≤ ${RED3_TRANSPORT_MAX_CI}) for transport.`,
        evidenceNeeded: 'Nabisy PoS (BLE) for the quantity, registered for the quota year.',
        legalBasis: 'BImSchG §37a; 38. BImSchV',
      });
      add({
        regime: 'Carbon price on fuel (BEHG now, ETS2 from 2028)',
        whatItDoes: 'Sustainable biofuels are generally treated as zero-emission in fuel carbon pricing, which would cut the supplier\'s allowance cost too.',
        status: 'TO_VERIFY',
        eurPerMWh: null,
        workings: 'Interplay between THG crediting and BEHG/ETS2 zero-rating not verified by the desk — confirm with regulatory before pitching.',
        evidenceNeeded: 'To be confirmed.',
        legalBasis: 'BEHG / EBeV 2030; Directive 2003/87/EC Chapter IVa',
      });
      guardrails.push(
        'A quantity credited to the THG quota cannot also go to another member state\'s transport scheme or to a corporate as a separate claim.'
      );
      break;
    }
  }

  const year = inputs.deliveryYear;
  const counted = rows.filter(r => r.status === 'COUNTS' || (r.status === 'FROM_2028' && year !== null && year >= ETS2_START_YEAR));
  const anyMissingValue = counted.some(r => r.eurPerMWh === null);
  const stackEurPerMWh = counted.length === 0 || anyMissingValue ? null : counted.reduce((s, r) => s + (r.eurPerMWh as number), 0);
  if (anyMissingValue) missingInputs.push('a value for every counted row (marks or inputs)');
  if (year === null) missingInputs.push('delivery year');

  return {
    rows,
    stackEurPerMWh,
    stackAnnualEur: stackEurPerMWh !== null && volume !== null ? stackEurPerMWh * volume : null,
    clientNetEurPerMWh: stackEurPerMWh !== null && inputs.offerPremiumEurPerMWh !== null ? stackEurPerMWh - inputs.offerPremiumEurPerMWh : null,
    guardrails,
    missingInputs,
  };
}
