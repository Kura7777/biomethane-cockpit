/**
 * Legal status of regulatory glossary terms: is the rule in force, still pending, or under review?
 * Shown as a badge in the glossary and in term tooltips, with the watchlist items that track it.
 *
 * Every line here restates something the app already holds and has verified (the GGE trade spec,
 * regulatory constants, citations registry, market notes, the regulatory watchlist). `checked` is the
 * date that fact was last verified on the desk. Do not add a status without such a source.
 */
export type TermStatusTone = 'in-force' | 'pending' | 'review';

export interface TermStatus {
  /** Short badge text, e.g. "Not yet law". */
  label: string;
  tone: TermStatusTone;
  /** One or two sentences: what is settled and what is not. */
  detail: string;
  /** ISO date the status was last verified. */
  checked: string;
  /** Regulatory watchlist items (src/domain/regcheck/watchlist.ts) that track this term. */
  watchIds: string[];
}

export const TERM_STATUS: Readonly<Record<string, TermStatus>> = {
  'nl-green-gas-law': {
    label: 'Not yet law',
    tone: 'pending',
    detail: 'Passed the Tweede Kamer on 6 October 2026; the Senate vote is pending and the implementing decree and regulation are still drafts. Target start: 1 January 2027.',
    checked: '2026-10-09',
    watchIds: ['nl_gge_senate_vote', 'nl_gge_secondary_legislation', 'nl_gge_register_opening'],
  },
  gge: {
    label: 'Not yet law',
    tone: 'pending',
    detail: 'The unit is defined in the bill and the draft decree; the NEa GGE register is not open yet.',
    checked: '2026-10-09',
    watchIds: ['nl_gge_senate_vote', 'nl_gge_register_opening'],
  },
  'operating-vs-investment-aid': {
    label: 'Draft rule',
    tone: 'pending',
    detail: 'The operating-aid exclusion is in the draft Besluit; that investment aid is compatible comes from the government reply in Kamerstuk 36947 nr. 8.',
    checked: '2026-10-09',
    watchIds: ['nl_gge_secondary_legislation'],
  },
  'energy-basis': {
    label: 'Open',
    tone: 'pending',
    detail: 'The NEa counts on the lower heating value (draft Regeling) and Spanish GOs are on gross value (Orden TED/1026/2022), but how the NEa converts is not confirmed. The desk factor is flagged OPEN.',
    checked: '2026-10-09',
    watchIds: ['nl_gge_secondary_legislation'],
  },
  prtr: {
    label: 'Open legal question',
    tone: 'pending',
    detail: 'The grants are in force; whether a Dutch GGE sale triggers Orden TED/706/2022 Art. 5.3 is unresolved and needs a check of each grant call.',
    checked: '2026-10-09',
    watchIds: [],
  },
  'manure-credit': {
    label: 'Under review',
    tone: 'review',
    detail: 'The Commission is revising RED III Annexes V and VI, including manure default values; critics argue the credit overstates savings. No change has been adopted.',
    checked: '2026-10-11',
    watchIds: ['red_annex_vi_manure_review'],
  },
  'double-counting': {
    label: 'Adopted, promulgation unconfirmed',
    tone: 'pending',
    detail: 'Germany abolishes double counting from compliance year 2026 under Drs 21/5530; the promulgation date is not confirmed in the app.',
    checked: '2026-10-09',
    watchIds: ['de_thg_quote_2026_law'],
  },
  'thg-quote': {
    label: 'In force',
    tone: 'in-force',
    detail: 'In force. The 2026 reform (Drs 21/5530) is adopted with its promulgation unconfirmed, and a proposal to exclude subsidised foreign fuels is open.',
    checked: '2026-10-09',
    watchIds: ['de_thg_quote_2026_law', 'de_thg_subsidised_fuels_exclusion'],
  },
  ere: {
    label: 'In force',
    tone: 'in-force',
    detail: 'The ERE replaced the HBE on 1 January 2026. Only Dutch-produced green gas can be booked.',
    checked: '2026-10-09',
    watchIds: ['nl_ere_dutch_origin_rule'],
  },
  cpb: {
    label: 'In force',
    tone: 'in-force',
    detail: 'First obligation period 1 January 2026 to 31 December 2028 (Décret n° 2024-718), with a €100 penalty per missing certificate.',
    checked: '2026-10-11',
    watchIds: [],
  },
  udb: {
    label: 'Live, gas not mandatory',
    tone: 'pending',
    detail: 'The Union Database is live, but mandatory use for gaseous fuels has no date; the GO plus PoS route applies meanwhile.',
    checked: '2026-10-09',
    watchIds: ['udb_gas_module_golive'],
  },
  verticer: {
    label: 'Changed 1 July 2026',
    tone: 'in-force',
    detail: 'VertiCer left ERGaR on 1 July 2026 and accepts gas GO imports only through the AIB hub.',
    checked: '2026-10-04',
    watchIds: ['nl_verticer_ergar_exit'],
  },
  'ghg-threshold': {
    label: 'In force, category open',
    tone: 'pending',
    detail: 'RED III Art. 29(10) is in force; which heat tier applies to grid-injected biomethane is unconfirmed, so the app warns between the two.',
    checked: '2026-10-11',
    watchIds: [],
  },
  'red-iii': {
    label: 'In force',
    tone: 'in-force',
    detail: 'Directive (EU) 2023/2413, with transposition due by 21 May 2025.',
    checked: '2026-10-11',
    watchIds: [],
  },
  ets2: {
    label: 'Start postponed',
    tone: 'pending',
    detail: 'ETS2 was postponed to 2028; allowances are not yet issued and only futures trade.',
    checked: '2026-10-09',
    watchIds: [],
  },
};

export function termStatus(id: string): TermStatus | null {
  return TERM_STATUS[id] ?? null;
}
