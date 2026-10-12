/**
 * Glossary — what the desk's terms mean, in plain commercial English.
 *
 * Plain data (no React) so the #/glossary page, the page helper and the tests all read the same
 * entries. Rules for this file:
 *  - Every regulatory or factual statement comes from something the app already holds: the
 *    citations registry, the eligibility citations, the market notes, regulatory/constants.ts,
 *    the data-source directory or the NL GGE trade spec (docs/research). Nothing from memory.
 *  - No prices or other numbers that change. Live values live on #/pricing; the text points there.
 *    Fixed legal constants are read from regulatory/constants.ts and markets/constants.ts and
 *    interpolated here, never retyped (glossary.test.ts guards the text for price-shaped numbers).
 *  - Source links are pulled from the registries by id, so a URL is never typed twice.
 */
import { getCitationById } from '../citations/registry';
import { CITATIONS } from '../eligibility/citations';
import { getDataSourceById } from '../provenance/dataSourcesDirectory';
import {
  CI_COMPARATOR_HEAT,
  CI_COMPARATOR_ROAD_TRANSPORT,
  GCAL_PER_CIC_ADVANCED,
  GCAL_PER_CIC_CONVENTIONAL,
  MJ_PER_MWH,
  MWH_PER_CIC_ADVANCED,
  MWH_PER_CIC_CONVENTIONAL,
  STALE_MARK_DAYS,
  VERY_STALE_MARK_DAYS,
} from '../markets/constants';
import {
  NL_GGE_BANKING_CAP_PCT,
  NL_GGE_BOOKING_DEADLINE_MONTH_DAY,
  NL_GGE_CLAWBACK_YEARS,
  NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ,
  NL_GGE_GO_VALIDITY_MONTHS,
  NL_GGE_START_YEAR,
  RED3_TRANSPORT_MAX_CI,
  RED_HEAT_THRESHOLD_POST_2021,
  RED_HEAT_THRESHOLD_POST_2026,
} from '../regulatory/constants';

export interface GlossaryLink {
  label: string;
  route: string;
}

export interface GlossarySource {
  label: string;
  url: string;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  aliases: string[];
  /** One line, 20 words or fewer. */
  short: string;
  /** What it is, 80 words or fewer. */
  plain: string;
  /** Why it matters on a deal, 50 words or fewer. */
  whyItMatters: string;
  appLinks: GlossaryLink[];
  sources: GlossarySource[];
  related: string[];
}

/** A citations-registry entry as a source link. Throws on a bad id so a typo fails the tests, not the page. */
function reg(id: string): GlossarySource {
  const c = getCitationById(id);
  if (!c || !c.officialUrl) throw new Error(`glossary: no citation with a URL for "${id}"`);
  return { label: c.shortTitle, url: c.officialUrl };
}

/** An extra link on a citations-registry entry (for example the ERGaR link on the chain-of-custody entry). */
function regExtra(id: string, labelPart: string): GlossarySource {
  const link = getCitationById(id)?.additionalLinks?.find(l => l.label.includes(labelPart));
  if (!link) throw new Error(`glossary: no additional link "${labelPart}" on "${id}"`);
  return { label: link.label, url: link.url };
}

/** An eligibility citation (the ones the checklist shows) as a source link. */
function elig(key: string): GlossarySource {
  const c = CITATIONS[key];
  if (!c) throw new Error(`glossary: no eligibility citation "${key}"`);
  return { label: c.shortName, url: c.sourceUrl };
}

/** A data-source directory entry as a source link. */
function ds(id: string): GlossarySource {
  const d = getDataSourceById(id);
  if (!d || !d.docUrl) throw new Error(`glossary: no data source with a URL for "${id}"`);
  return { label: d.name, url: d.docUrl };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const [bookingMonth, bookingDay] = NL_GGE_BOOKING_DEADLINE_MONTH_DAY.split('-').map(Number);
const BOOKING_DEADLINE = `${bookingDay} ${MONTHS[bookingMonth - 1]}`;
const GGE_MJ_FACTOR = MJ_PER_MWH / 1000;
const TRANSPORT_SAVING_PCT = Math.round((1 - RED3_TRANSPORT_MAX_CI / CI_COMPARATOR_ROAD_TRANSPORT) * 100);
const HEAT_LOW_PCT = Math.round(RED_HEAT_THRESHOLD_POST_2021 * 100);
const HEAT_HIGH_PCT = Math.round(RED_HEAT_THRESHOLD_POST_2026 * 100);

const AIB_REGISTRIES: GlossarySource = { label: 'AIB registries list', url: 'https://www.aib-net.org/registries' };
const ERGAR_COO: GlossarySource = { label: 'ERGaR Certificate of Origin scheme', url: 'https://www.ergar.org/ergar-schemes/ergar-coo-scheme/' };

export const GLOSSARY: GlossaryEntry[] = [
  // ── Units and certificates ────────────────────────────────────────────────
  {
    id: 'go',
    term: 'Guarantee of Origin (GO / GvO)',
    aliases: ['GO', 'GvO', 'garantie van oorsprong', 'guarantee of origin', 'GdO', 'garantía de origen', 'EECS GO', 'certificate of origin'],
    short: 'An electronic certificate proving that one MWh of gas was renewable, transferable independently from physical gas flows.',
    plain: 'A Guarantee of Origin (GvO in Dutch, GdO in Spanish) is a statutory disclosure instrument defined under RED Art. 19 certifying renewable production attributes. GOs transfer electronically across national registries via the AIB hub or ERGaR scheme. While standard for voluntary corporate claims, a GO alone does not satisfy statutory transport or fuel obligations without an accompanying PoS.',
    whyItMatters: 'GOs form the standard currency for voluntary green claims and paired obligations like the Dutch GGE. Feasibility depends entirely on cross-border registry connectivity between issuing and importing jurisdictions.',
    appLinks: [
      { label: 'Registries and cross-border routes', route: '/registries' },
      { label: 'Map, GO trade mode', route: '/map' },
    ],
    sources: [reg('eu-red-iii')],
    related: ['pos', 'go-pos-bundle', 'aib-hub', 'ergar', 'book-and-claim', 'energy-basis'],
  },
  {
    id: 'pos',
    term: 'Proof of Sustainability (PoS)',
    aliases: ['PoS', 'proof of sustainability', 'bewijs van duurzaamheid', 'sustainability proof'],
    short: 'The audited certificate establishing a biomethane consignment’s feedstock, geographic origin, and certified lifecycle carbon intensity.',
    plain: 'A statutory compliance instrument certifying that a biomethane consignment meets RED sustainability and GHG-saving criteria (Articles 29–31). Issued under Commission-recognised voluntary schemes like ISCC EU or REDcert, it documents audited feedstock substrates, production facilities, mass balance balances, and certified lifecycle carbon intensity (CI). A PoS and a GO are legally distinct, non-interchangeable instruments.',
    whyItMatters: 'Compliance buyers purchase the PoS to satisfy mandatory quota targets. Any audit flaw or missing PoS entitles buyers under master agreements (e.g. EFET) to re-price deliveries down to fossil index.',
    appLinks: [
      { label: 'Trade Builder, PoS record', route: '/trade' },
      { label: 'Registries and cross-border routes', route: '/registries' },
    ],
    sources: [reg('scheme-iscc-eu'), reg('eu-ir-2022-996')],
    related: ['go', 'go-pos-bundle', 'udb', 'carbon-intensity', 'voluntary-scheme', 'efet'],
  },
  {
    id: 'go-pos-bundle',
    term: 'GO + PoS pair',
    aliases: ['GO and PoS together', 'paired GO and PoS', 'GO+PoS', 'paired market'],
    short: 'A matched Guarantee of Origin and Proof of Sustainability delivered together for the identical energy volume and period.',
    plain: 'Certain regulatory regimes, notably the Dutch Green Gas Obligation (GGE), legally require paired surrender of both instruments for every physical MWh delivered. Under draft rules, suppliers cannot trade them separately for compliance claims. Sourcing engines must ensure identical energy volumes, matching production vintages, and reconciled calorific bases (gross versus net) across both instruments.',
    whyItMatters: 'Delivering an unbundled document grants zero statutory compliance credit to paired-market off-takers. Sourcing must guarantee matching quantities, aligned vintage windows, and consistent calorific basis conversions.',
    appLinks: [
      { label: 'Trade Builder, custody pack', route: '/trade' },
      { label: 'Desk assumptions for the GGE trade', route: '/pricing?tab=assumptions' },
    ],
    sources: [reg('nl-gge-draft-regeling'), reg('nl-gge-draft-besluit')],
    related: ['go', 'pos', 'gge', 'energy-basis', 'custody-pack', 'chain-of-custody'],
  },
  {
    id: 'udb',
    term: 'Union Database (UDB)',
    aliases: ['UDB', 'Union Database', 'Union Database for gas'],
    short: 'The European Commission’s central digital database established to track renewable fuel supply chains and prevent double counting.',
    plain: 'Mandated under RED Art. 31a, the Union Database tracks liquid and gaseous renewable fuels from injection to final consumption across the European Union. While operational for liquid biofuels, the gaseous module remains in phased rollout for economic operators. Until fully unified, cross-border compliance relies on national registries and recognised voluntary certification schemes.',
    whyItMatters: 'Traders must never assume an active UDB gas transfer exists. Cross-border mass balance documentation must be confirmed directly with certifying bodies and bilateral national registers.',
    appLinks: [
      { label: 'Registries, UDB column', route: '/registries' },
      { label: 'Trade Builder, UDB status', route: '/trade' },
    ],
    sources: [reg('eu-udb-regulation'), elig('UDB_IMPLEMENTING_REG')],
    related: ['pos', 'mass-balance', 'chain-of-custody', 'red-iii'],
  },
  {
    id: 'gge',
    term: 'GGE (Dutch green-gas unit)',
    aliases: ['GGE', 'NL GGE', 'green gas obligation unit', 'groen gas obligation'],
    short: 'The statutory compliance unit under the Dutch Green Gas Obligation, representing one kilogram of CO₂-equivalent emissions reduction.',
    plain: `One GGE represents 1 kg of CO₂e lifecycle emission reduction. Statutory rules calculate compliance yield as (${NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ} − CI) × ${GGE_MJ_FACTOR} × MWh, using ${NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ} gCO₂e/MJ as the heat fossil comparator, certified CI from the PoS, and net lower-heating-value MWh. Only obligated gas suppliers hold GGE accounts; market traders supply compliant GO and PoS bundles.`,
    whyItMatters: 'Lower carbon intensity yields significantly more GGEs per MWh, creating large pricing premiums for manure-based biomethane. Statutory buy-out fines establish the effective economic ceiling.',
    appLinks: [
      { label: 'Pricing desk, GGE mark', route: '/pricing' },
      { label: 'Desk assumptions, GGE inputs', route: '/pricing?tab=assumptions' },
      { label: 'Trade Builder', route: '/trade' },
    ],
    sources: [reg('nl-gge-draft-regeling'), reg('nl-kst-36947-8')],
    related: ['nl-green-gas-law', 'buy-out', 'energy-basis', 'carbon-intensity', 'fossil-comparator', 'nea', 'go-pos-bundle'],
  },
  {
    id: 'ere',
    term: 'ERE (Dutch transport emission-reduction unit)',
    aliases: ['ERE', 'NL ERE', 'HBE', 'HBE-G', 'energie voor vervoer'],
    short: 'The tradable compliance unit for Dutch renewable transport fuel obligations, representing one kilogram of verified lifecycle CO₂e reduction.',
    plain: 'Administered by the Dutch Emissions Authority (NEa) under the Environmental Management Act, the ERE (Energie voor Vervoer) succeeded the former HBE system. Each unit corresponds to 1 kg of avoided CO₂e in road and non-road transport. Delivering biomethane into the transport sector generates EREs, which cannot be double-claimed against the green gas grid blending quota.',
    whyItMatters: 'ERE and GGE represent competing commercial avenues for identical biomethane molecules. Surrendering certificates into transport precludes claiming green gas obligation units for the same physical volume.',
    appLinks: [
      { label: 'Pricing desk, NL ERE mark', route: '/pricing' },
      { label: 'Map', route: '/map' },
    ],
    sources: [reg('nl-wet-milieubeheer')],
    related: ['gge', 'nea', 'verticer', 'double-claim'],
  },
  {
    id: 'thg-quote',
    term: 'THG-Quote (German GHG quota)',
    aliases: ['THG', 'THG-Quote', 'THG quota', 'German GHG quota', 'BImSchG', '38. BImSchV', 'DE THG'],
    short: 'Germany’s mandatory greenhouse gas reduction quota for transport fuel distributors, Europe’s deepest commercial biomethane compliance market.',
    plain: 'Governed by §37a BImSchG and the 38. BImSchV, Germany obligates fuel distributors to reduce the lifecycle GHG intensity of their fuel pools. Certificate yield scales inversely with verified carbon intensity, maximizing returns on deep-negative manure substrates. While advanced fuels previously enjoyed double-counting multipliers, single-counting now governs forward compliance. Statutory non-compliance penalties set the maximum economic value.',
    whyItMatters: 'Deep-negative manure biomethane earns substantial certificate premiums in Germany. Desk netback engines evaluate delivered spreads against current THG market marks and statutory penalty ceilings.',
    appLinks: [
      { label: 'Pricing desk, DE THG mark', route: '/pricing' },
      { label: 'Regulatory constants, penalty ceiling', route: '/pricing?tab=assumptions' },
      { label: 'Morning brief', route: '/brief' },
    ],
    sources: [reg('de-bimschg-37a'), elig('DE_DRS_21_5530')],
    related: ['double-counting', 'manure-credit', 'buy-out', 'bundle-price', 'carbon-intensity'],
  },
  {
    id: 'cic',
    term: 'CIC (Italy)',
    aliases: ['CIC', 'Certificati di Immissione in Consumo', 'IT CIC', 'GSE'],
    short: 'Italy’s statutory transport compliance certificate, issued by GSE per specified energy quantity of sustainable biomethane.',
    plain: `Administered by Gestore Servizi Energetici (GSE) under Ministerial Decree 2 March 2018 and PNRR frameworks, Certificati di Immissione in Consumo mandate renewable transport blending. One CIC is awarded per ${GCAL_PER_CIC_CONVENTIONAL} Gcal of conventional biomethane (${MWH_PER_CIC_CONVENTIONAL.toFixed(2)} MWh) or per ${GCAL_PER_CIC_ADVANCED} Gcal of advanced Annex IX biomethane (${MWH_PER_CIC_ADVANCED.toFixed(3)} MWh), reflecting a significant regulatory incentive for advanced waste substrates.`,
    whyItMatters: 'Italian market quotes are denominated per certificate rather than per MWh. The netback engine normalizes CIC energy thresholds to enable precise arbitrage comparison against northern European quotas.',
    appLinks: [
      { label: 'Pricing desk, IT CIC mark', route: '/pricing' },
      { label: 'Morning brief', route: '/brief' },
    ],
    sources: [reg('it-dm-2018-cic'), elig('IT_CIC')],
    related: ['netback', 'annex-ix', 'mark'],
  },
  {
    id: 'rtfo',
    term: 'RTFO / RTFC (UK)',
    aliases: ['RTFO', 'RTFC', 'dRTFC', 'Renewable Transport Fuel Certificate', 'renewable transport fuel obligation', 'UK RTFO'],
    short: 'The United Kingdom’s Renewable Transport Fuel Obligation, requiring fuel suppliers to surrender certificates or pay statutory buy-outs.',
    plain: 'Established by the RTFO Order 2007 (SI 2007/3072), UK road transport fuel distributors surrender Renewable Transport Fuel Certificates (RTFCs). Waste-derived biomethane qualifies for development fuel multipliers (dRTFCs). Because Great Britain sits outside EU mass balance boundaries and the UDB, UK-injected gas cannot clear into EU statutory compliance destinations without physical off-grid transport as segregated Bio-LNG.',
    whyItMatters: 'UK grid injections and continental EU compliance markets remain isolated regulatory pools. UK producers should be valued against domestic RTFO or RGGO opportunities rather than European quotas.',
    appLinks: [
      { label: 'Pricing desk, UK RTFO mark', route: '/pricing' },
      { label: 'Map', route: '/map' },
    ],
    sources: [reg('gb-rtfo-order'), elig('UK_RTFO')],
    related: ['buy-out', 'segregation', 'udb', 'mass-balance'],
  },
  {
    id: 'cpb',
    term: 'CPB (France)',
    aliases: ['CPB', 'Certificats de Production de Biogaz', 'FR CPB', 'biogas production certificate'],
    short: 'France’s statutory biogas production certificate, obligating natural gas suppliers to surrender certificates capped by a legal penalty.',
    plain: 'Governed by Code de l’énergie Articles L.446-24 et seq., the Certificats de Production de Biogaz mechanism mandates natural gas retail suppliers exceeding statutory volume thresholds to surrender CPB certificates. The scheme phases in rising annual targets, with maximum certificate prices legally clamped by an official statutory non-compliance penalty ceiling.',
    whyItMatters: 'Even during supply crunches, certificate values cannot trade above the legal penalty ceiling. The netback engine clamps maximum modeled values to statutory caps to preserve realistic trading economics.',
    appLinks: [
      { label: 'Pricing desk, FR CPB mark', route: '/pricing' },
      { label: 'Regulatory constants', route: '/pricing?tab=assumptions' },
    ],
    sources: [reg('fr-code-energie-cpb'), elig('FR_CPB')],
    related: ['buy-out', 'tiruert', 'netback'],
  },
  {
    id: 'tiruert',
    term: 'TIRUERT (France transport tax)',
    aliases: ['TIRUERT', 'IRICC', 'FR TIRUERT', 'Taxe Incitative'],
    short: 'France’s statutory customs incentive tax levied on transport fuel distributors failing to satisfy renewable energy incorporation targets.',
    plain: 'The Taxe Incitative Relative à l’Utilisation d’Énergie Renouvelable dans les Transports (TIRUERT) levies financial penalties on distributors missing renewable road fuel shares. Supplying sustainable Bio-CNG or Bio-LNG relieves this customs tax liability. The mechanism is transitioning toward an emission-reduction model (IRICC) aligned with lifecycle carbon performance.',
    whyItMatters: 'TIRUERT drives domestic French demand for heavy transport Bio-CNG and Bio-LNG off-take. Traders evaluate TIRUERT marks alongside CPB values when pricing French grid and virtual deliveries.',
    appLinks: [{ label: 'Pricing desk, FR TIRUERT mark', route: '/pricing' }],
    sources: [reg('fr-tiruert')],
    related: ['cpb', 'annex-ix'],
  },
  {
    id: 'egg-austria',
    term: 'EGG (Austria)',
    aliases: ['EGG', 'Erneuerbare-Gase-Gesetz', 'Erneuerbaren-Gase-Gesetz', 'AT EGG', 'Austrian Renewable Gas Act'],
    short: 'Austria’s Renewable Gas Act (Erneuerbare-Gase-Gesetz), imposing mandatory renewable gas blending quotas on wholesale gas suppliers.',
    plain: 'The Austrian Erneuerbare-Gase-Gesetz establishes statutory green gas blending obligations for natural gas suppliers, ramping toward 2030 decarbonisation targets. Distinct from Germany’s EEG power law, the Austrian EGG operates as a grid-based thermal gas quota. Sourcing requirements dictate verified cross-border certificate transfers into Austrian registry infrastructure.',
    whyItMatters: 'As a stationary heat and grid quota, proof requirements diverge from transport fuel regimes. Desk models verify Austrian corridor feasibility and import registry eligibility before pricing contracts.',
    appLinks: [
      { label: 'Pricing desk, AT EGG mark', route: '/pricing' },
      { label: 'Map', route: '/map' },
    ],
    sources: [reg('at-egg-act'), elig('AT_EGG')],
    related: ['eeg', 'go'],
  },
  {
    id: 'buy-out',
    term: 'Buy-out (compliance penalty price)',
    aliases: ['buy-out', 'buyout', 'buy-out price', 'afkoopsom', 'price ceiling', 'penalty ceiling'],
    short: 'The statutory penalty price an obligated entity pays for compliance shortfalls, establishing the hard upper ceiling on certificate values.',
    plain: 'Statutory compliance frameworks establish a monetary penalty or buyout option for unfulfilled obligations. Because rational buyers refuse to purchase certificates above the buyout price, it acts as a hard economic ceiling across markets including DE THG, UK RTFO, FR CPB, FuelEU, and NL GGE. Under Dutch rules, electing the buyout also forfeits year-end certificate banking.',
    whyItMatters: 'Market bids exceeding buyout penalties indicate irrational pricing or contract irregularities. The netback engine clamps modeled prices to statutory caps, warning traders against unviable assumptions.',
    appLinks: [
      { label: 'Regulatory constants', route: '/pricing?tab=assumptions' },
      { label: 'Pricing desk, marks', route: '/pricing' },
    ],
    sources: [reg('nl-gge-draft-regeling')],
    related: ['gge', 'thg-quote', 'rtfo', 'cpb', 'banking', 'fueleu-maritime'],
  },
  {
    id: 'energy-basis',
    term: 'GO energy basis (HHV / LHV)',
    aliases: ['HHV', 'LHV', 'PCS', 'PCI', 'GCV', 'NCV', 'gross calorific value', 'net calorific value', 'higher heating value', 'lower heating value', 'energy basis'],
    short: 'Gross calorific value (HHV/PCS) versus net calorific value (LHV/PCI), dictating physical and financial energy equivalence in contracts.',
    plain: 'Certificates record energy on either a gross (HHV / PCS) or net (LHV / PCI) calorific basis. While the Dutch emissions authority mandates lower heating value (LHV) for GGE compliance accounting, Mediterranean registries like Spain’s Enagás issue certificates on a gross basis (HHV). Failure to apply standard conversion factors (~0.903 LHV/HHV) creates significant volume and revenue mismatches.',
    whyItMatters: 'Calorific basis discrepancies distort certificate yields and trigger audit rejections in cross-border paired trades. Ensure contracts explicitly state the energy basis and conversion methodology.',
    appLinks: [
      { label: 'Desk assumptions, GGE inputs', route: '/pricing?tab=assumptions' },
      { label: 'Trade Builder, custody pack', route: '/trade' },
    ],
    sources: [reg('nl-gge-draft-regeling')],
    related: ['gge', 'go', 'go-pos-bundle', 'open-item'],
  },

  // ── Chain of custody ───────────────────────────────────────────────────────
  {
    id: 'mass-balance',
    term: 'Mass balance',
    aliases: ['mass-balance', 'massenbalans'],
    short: 'A statutory chain-of-custody method tracking sustainability attributes through an interconnected logistics network without requiring physical segregation.',
    plain: 'Required by RED Art. 30 for EU compliance quotas, mass balance allows batches with varying sustainability characteristics to blend within a defined system (such as the European gas transmission grid) provided reconciled volumes balance over time. Under Implementing Regulation 2022/996, the interconnected European natural gas network constitutes a single mass balance zone, eliminating bilateral physical wheeling requirements.',
    whyItMatters: 'Mass balance legality underpins all cross-border statutory compliance trading. Book-and-claim certificates cannot substitute for mass balance in European transport or fuel quota regimes.',
    appLinks: [
      { label: 'Trade Builder, chain of custody', route: '/trade' },
      { label: 'Map, compliance quota mode', route: '/map' },
    ],
    sources: [reg('glossary-mass-balance-vs-bc'), reg('eu-ir-2022-996'), elig('RED_III_CHAIN_OF_CUSTODY')],
    related: ['book-and-claim', 'segregation', 'chain-of-custody', 'udb', 'pos'],
  },
  {
    id: 'book-and-claim',
    term: 'Book-and-claim',
    aliases: ['book and claim', 'book & claim', 'B&C'],
    short: 'Trading environmental certificates entirely detached from the underlying physical energy carrier, permitted exclusively for voluntary green claims.',
    plain: 'Book-and-claim systems decouple environmental attributes (such as standalone Guarantees of Origin) from physical energy distribution. While widely accepted for voluntary corporate Scope 1 and Scope 2 reporting (GHG Protocol), EU statutory quotas (e.g. German THG, Dutch ERE, French CPB) strictly prohibit book-and-claim accounting, mandating audited grid-connected mass balance systems instead.',
    whyItMatters: 'Attempting to fulfill statutory compliance obligations with unlinked book-and-claim certificates causes instant regulatory failure and contract default. Sourcing must verify buyer compliance requirements.',
    appLinks: [
      { label: 'Trade Builder, chain of custody', route: '/trade' },
      { label: 'Map, certificate (GO) mode', route: '/map' },
    ],
    sources: [reg('glossary-mass-balance-vs-bc')],
    related: ['mass-balance', 'go', 'eligibility-gate'],
  },
  {
    id: 'segregation',
    term: 'Segregation',
    aliases: ['physical segregation', 'segregated', 'segregated Bio-LNG'],
    short: 'Maintaining complete physical separation of a renewable fuel consignment throughout transportation and storage rather than co-mingling in pipelines.',
    plain: 'When renewable gas cannot leverage an interconnected mass balance system—such as biomethane produced in Great Britain crossing into continental Europe—sustainability attributes survive only through physical segregation. This typically requires liquefying the gas at origin and transporting it via dedicated ISO containers or cryogenic road tankers as segregated Bio-LNG.',
    whyItMatters: 'Segregated logistics converts financial grid balancing into physical cryogenic freight with substantial operational expenditure. Deals must factor liquefaction, trucking, and boil-off costs into the netback.',
    appLinks: [
      { label: 'Map, route verdicts', route: '/map' },
      { label: 'Trade Builder', route: '/trade' },
    ],
    sources: [reg('gb-rtfo-order'), reg('eu-ir-2022-996')],
    related: ['mass-balance', 'rtfo', 'udb'],
  },
  {
    id: 'chain-of-custody',
    term: 'Chain of custody',
    aliases: ['CoC', 'custody', 'chain-of-custody checklist'],
    short: 'The auditable, unbroken sequence of documentation transferring legal title and sustainability credentials from producer to end consumer.',
    plain: 'Mandated under RED Art. 30, chain of custody verifies that environmental attributes remain auditable and untampered at every commercial handover. Every intermediary trading entity must hold valid certification under a recognised voluntary scheme (e.g. ISCC EU). The desk’s Trade Builder audits each link: registry connectivity, certificate pairing, subsidy exclusions, GHG savings, and double-claim indemnities.',
    whyItMatters: 'A transaction is only as compliant as its weakest evidentiary link. An uncertified intermediary or missing handover breaks the regulatory custody chain and destroys trade value.',
    appLinks: [
      { label: 'Trade Builder, checklist', route: '/trade' },
      { label: 'Map, corridors', route: '/map' },
    ],
    sources: [elig('RED_III_CHAIN_OF_CUSTODY')],
    related: ['mass-balance', 'custody-pack', 'eligibility-gate', 'go-pos-bundle', 'certified-economic-operator'],
  },
  {
    id: 'aib-hub',
    term: 'AIB hub (EECS Gas Scheme)',
    aliases: ['AIB', 'AIB EECS', 'EECS', 'Association of Issuing Bodies', 'AIB hub', 'EECS gas scheme'],
    short: 'The central electronic communications bridge enabling automated cross-border transfers of Guarantees of Origin between European national issuing bodies.',
    plain: 'Operated by the Association of Issuing Bodies (AIB) under the European Energy Certificate System (EECS), the gas hub facilitates cross-border electronic cancellation and import of Guarantees of Origin. Transfers succeed only when both the issuing registry and the receiving registry maintain active hub connectivity and mutual bilateral acceptance. Notably, Denmark (Energinet) and Germany (dena) connect via ERGaR rather than AIB.',
    whyItMatters: 'Hub connectivity governs whether a certificate can legally reach your buyer’s registry account. Disconnected registry routes block trade settlement regardless of commercial agreement.',
    appLinks: [
      { label: 'Registries, route checker', route: '/registries' },
      { label: 'Map, GO mode', route: '/map' },
    ],
    sources: [AIB_REGISTRIES, reg('nl-gge-draft-besluit')],
    related: ['ergar', 'go', 'verticer', 'enagas-gdo', 'dena-biogasregister'],
  },
  {
    id: 'ergar',
    term: 'ERGaR (CoO scheme)',
    aliases: ['ERGaR', 'ERGaR CoO', 'ERGaR hub', 'European Renewable Gas Registry'],
    short: 'The European Renewable Gas Registry framework facilitating cross-border biomethane certificate transfers among participating national gas registries.',
    plain: 'The European Renewable Gas Registry (ERGaR) administers the Certificate of Origin (CoO) scheme, connecting established national biomethane registers through independent bilateral and multilateral transfer protocols. Major gas producing jurisdictions including Germany (dena), Denmark (Energinet), and Great Britain (GGCS) operate primarily through ERGaR rather than the AIB hub. Each member registry independently determines which partner registries it accepts.',
    whyItMatters: 'ERGaR membership does not guarantee universal market access. A certificate held on an ERGaR register cannot directly transfer to an AIB-only destination without dedicated bilateral bridge mechanisms.',
    appLinks: [{ label: 'Registries, ERGaR statistics', route: '/registries' }],
    sources: [ERGAR_COO, regExtra('glossary-mass-balance-vs-bc', 'ERGaR')],
    related: ['aib-hub', 'dena-biogasregister', 'go'],
  },
  {
    id: 'verticer',
    term: 'VertiCer (Dutch GO registry)',
    aliases: ['VertiCer'],
    short: 'The statutory issuing body and registry for gas and renewable electricity Guarantees of Origin in the Netherlands.',
    plain: 'Appointed by Dutch statute, VertiCer administers the national Guarantee of Origin register for biomethane, green gas, and renewable power. For the Dutch Green Gas Obligation (GGE), imported foreign certificates must enter VertiCer via the AIB hub and subsequently be transferred to the Dutch Emissions Authority (NEa) registry account before official compliance cancellation can occur.',
    whyItMatters: 'Failure to transfer certificates into the NEa account before annual booking deadlines prevents GGE surrender. Traders must factor registry lead times and transfer tariffs into quotes.',
    appLinks: [
      { label: 'Registries', route: '/registries' },
      { label: 'Desk assumptions, GGE inputs', route: '/pricing?tab=assumptions' },
    ],
    sources: [ds('verticer_registry_netherlands'), reg('nl-gge-draft-besluit')],
    related: ['nea', 'aib-hub', 'gge', 'go'],
  },
  {
    id: 'enagas-gdo',
    term: 'Enagás GdO (Spanish GO registry)',
    aliases: ['Enagás GdO', 'Enagás GTS', 'ES GdO', 'Garantías de Origen'],
    short: 'Spain’s statutory Guarantee of Origin registry for renewable gases, operated by Enagás GTS under ministerial mandate.',
    plain: 'Designated under Real Decreto 376/2022, Enagás GTS manages the Spanish national registry for renewable gas Guarantees of Origin. Spanish GOs are denominated on a gross calorific value (HHV) basis and connect internationally via the AIB hub. Exporting Spanish certificates into northern European markets requires reconciling calorific bases and verifying certificate validity against target cancellation deadlines.',
    whyItMatters: 'Spain represents Europe’s fastest-growing biomethane origination pool with direct AIB export capability. Traders must verify gross-to-net energy conversion factors and production vintages prior to contracting.',
    appLinks: [
      { label: 'Registries', route: '/registries' },
      { label: 'Map', route: '/map' },
    ],
    sources: [ds('enagas_gts_spain'), reg('es-rd-376-2022')],
    related: ['aib-hub', 'energy-basis', 'prtr', 'pvb', 'go'],
  },
  {
    id: 'dena-biogasregister',
    term: 'dena Biogasregister (German GO registry)',
    aliases: ['dena', 'dena Biogasregister', 'Biogasregister', 'DE GO'],
    short: 'Germany’s central documentation registry for biomethane injection, quality auditing, and voluntary green gas certificate transfers.',
    plain: 'Operated by the German Energy Agency (dena), the Biogasregister documents biomethane volumes, mass balance batches, and contractual criteria within Germany. It interfaces internationally via ERGaR rather than the AIB hub, maintaining bilateral recognition agreements with selected partners. German statutory THG quota compliance is administered through mass balance and Proofs of Sustainability, not via dena GO cancellations.',
    whyItMatters: 'dena registry transfers govern voluntary corporate green gas sales, not German THG quota surrender. Never conflate dena registry transferability with statutory THG fuel compliance feasibility.',
    appLinks: [
      { label: 'Registries', route: '/registries' },
      { label: 'Pricing desk, dena GO mark', route: '/pricing' },
    ],
    sources: [ds('dena_biogasregister_germany')],
    related: ['ergar', 'thg-quote', 'go', 'eeg'],
  },
  {
    id: 'nea',
    term: 'NEa (Dutch Emissions Authority)',
    aliases: ['NEa', 'Nederlandse Emissieautoriteit', 'Dutch Emissions Authority'],
    short: 'The independent statutory regulator overseeing carbon markets, renewable fuel transport quotas, and green gas blending in the Netherlands.',
    plain: `The Nederlandse Emissieautoriteit (NEa) enforces statutory compliance for renewable energy in transport (ERE) and the green gas blending mandate (GGE). The NEa manages compliance surrender accounts, audits sustainability documentation, and holds statutory powers to freeze accounts or retroactively claw back unverified claims up to ${NL_GGE_CLAWBACK_YEARS} years post-booking.`,
    whyItMatters: 'As the ultimate compliance auditor, the NEa’s multi-year clawback authority requires robust contractual seller warranties, strict record retention, and fraud indemnities in all off-take agreements.',
    appLinks: [
      { label: 'Trade Builder, legal pack', route: '/trade' },
      { label: 'Citations', route: '/citations' },
    ],
    sources: [reg('nl-gge-draft-besluit'), reg('nl-wet-milieubeheer')],
    related: ['gge', 'ere', 'verticer', 'banking', 'double-claim'],
  },
  {
    id: 'voluntary-scheme',
    term: 'ISCC EU / REDcert EU / SURE',
    aliases: ['ISCC EU', 'ISCC', 'REDcert', 'REDcert EU', 'REDcert-EU', 'SURE', 'sustainability scheme', 'voluntary scheme', 'certification scheme'],
    short: 'European Commission-recognised voluntary certification schemes that audit compliance with RED sustainability and greenhouse gas criteria.',
    plain: 'Voluntary schemes recognized under RED Article 30 certify that economic operators throughout the value chain satisfy legal sustainability and lifecycle GHG reduction standards. Leading schemes including ISCC EU, REDcert EU, and SURE enforce identical baseline methodologies and are treated as fungible across major quota regimes. Every commercial intermediary handling title must hold an active certificate.',
    whyItMatters: 'If any counterparty along the physical or contractual chain lacks valid scheme accreditation, the compliance trail breaks. Non-recognised standards (e.g. ISCC PLUS) cannot satisfy statutory mandates.',
    appLinks: [
      { label: 'Trade Builder, scheme', route: '/trade' },
      { label: 'Citations', route: '/citations' },
    ],
    sources: [reg('scheme-iscc-eu'), reg('scheme-redcert-eu'), reg('nl-gge-draft-regeling')],
    related: ['iscc-plus', 'certified-economic-operator', 'pos', 'chain-of-custody'],
  },
  {
    id: 'iscc-plus',
    term: 'ISCC PLUS',
    aliases: ['ISCC-PLUS'],
    short: 'A voluntary certification system for circular and bio-based products, legally invalid for European statutory fuel quotas.',
    plain: 'ISCC PLUS serves voluntary corporate markets, biochemical applications, and non-regulated reporting outside statutory EU directives. Unlike ISCC EU, it permits unconstrained book-and-claim accounting and does not enforce RED compliance mandates. ISCC PLUS certificates cannot be surrendered against German THG, Dutch ERE, French CPB, or FuelEU obligations.',
    whyItMatters: 'Confusing ISCC PLUS with ISCC EU is the most frequent origination error in commodity trading. The desk’s compliance gates immediately block ISCC PLUS paper for regulated quota routes.',
    appLinks: [{ label: 'Trade Builder, scheme', route: '/trade' }],
    sources: [reg('scheme-iscc-plus'), elig('ISCC_PLUS_SCOPE')],
    related: ['voluntary-scheme', 'eligibility-gate', 'book-and-claim'],
  },
  {
    id: 'certified-economic-operator',
    term: 'Certified economic operator',
    aliases: ['economic operator', 'certified trader', 'certified operator'],
    short: 'A commercial entity holding active accreditation under a recognised voluntary scheme to trade, transfer, or balance sustainable commodities.',
    plain: 'Under EU mass balance regulations, every market participant taking legal ownership of sustainable biomethane must be certified as an Economic Operator by a recognized scheme (e.g. ISCC EU). Traders pass forward sustainability attributes by re-issuing Proof of Sustainability documentation under their own certification number, maintaining an unbroken regulatory chain.',
    whyItMatters: 'Trading desk entities cannot take title to compliance biomethane without their own operational certification. Trading without active certification invalidates sustainability claims downstream.',
    appLinks: [{ label: 'Trade Builder, claims', route: '/trade' }],
    sources: [reg('scheme-iscc-eu'), reg('nl-gge-draft-regeling')],
    related: ['voluntary-scheme', 'chain-of-custody', 'pos'],
  },

  // ── Regulation ──────────────────────────────────────────────────────────────
  {
    id: 'red-iii',
    term: 'RED III',
    aliases: ['RED', 'RED II', 'Renewable Energy Directive', 'Directive 2023/2413'],
    short: 'The European Union’s Renewable Energy Directive (EU) 2023/2413, establishing Europe’s overarching legal framework for renewable fuels.',
    plain: 'Directive (EU) 2023/2413 (RED III) establishes mandatory EU-wide renewable energy targets, sustainability criteria (Article 29), mass balance chain-of-custody rules (Article 30), and the Union Database (Article 31a). National transport quotas (DE THG, NL ERE, FR CPB) directly transpose its rules, standardising feedstock classifications, carbon intensity baselines, and audit protocols across Member States.',
    whyItMatters: 'Core trading constraints—including the 65% transport GHG threshold and Annex IX classifications—originate in RED III. Desk gate audits reference underlying articles directly.',
    appLinks: [{ label: 'Citations', route: '/citations' }],
    sources: [reg('eu-red-iii')],
    related: ['annex-ix', 'ghg-threshold', 'mass-balance', 'udb', 'carbon-intensity'],
  },
  {
    id: 'annex-ix',
    term: 'Annex IX Part A / Part B',
    aliases: ['Annex IX', 'Annex IX A', 'Annex IX B', 'Annex IX Part A', 'Annex IX Part B', 'advanced feedstock', 'advanced biofuel'],
    short: 'The statutory feedstock lists under RED: Part A designates advanced wastes and residues, while Part B comprises capped materials.',
    plain: 'Annex IX of the Renewable Energy Directive classifies compliant feedstocks. Part A covers advanced wastes and residues (agricultural manure, straw, sewage sludge, biowaste) that qualify for advanced fuel sub-targets. Part B includes used cooking oil and Category 1 and 2 animal fats, which face contribution caps. Food and feed crops are excluded from advanced classifications.',
    whyItMatters: 'Annex IX Part A qualification represents the primary driver of biomethane market premiums. Crop-based biomethane trades at steep discounts and is excluded from advanced transport mandates.',
    appLinks: [
      { label: 'Trade Builder, feedstock', route: '/trade' },
      { label: 'Plants, feedstock filter', route: '/plants' },
    ],
    sources: [reg('glossary-annex-ix'), elig('RED_III_ANNEX_IX_A'), elig('RED_III_ANNEX_IX_B')],
    related: ['red-iii', 'manure-credit', 'double-counting'],
  },
  {
    id: 'ghg-threshold',
    term: 'GHG saving threshold',
    aliases: ['GHG saving', 'GHG savings', 'saving threshold', 'GHG threshold', 'greenhouse gas saving'],
    short: 'The statutory minimum lifecycle emissions reduction percentage required relative to the fossil comparator for compliance qualification.',
    plain: `Under RED III Art. 29(10), transport biomethane must deliver at least ${TRANSPORT_SAVING_PCT}% GHG savings (maximum ${RED3_TRANSPORT_MAX_CI} gCO₂e/MJ against the ${CI_COMPARATOR_ROAD_TRANSPORT} gCO₂e/MJ benchmark). In heating and cooling, thresholds require ${HEAT_LOW_PCT}% for older facilities and ${HEAT_HIGH_PCT}% for post-November 2023 installations. Batches failing applicable thresholds are legally treated as fossil gas.`,
    whyItMatters: 'Batches exceeding statutory carbon intensity ceilings are blocked from compliance markets. Origination checks verify verified carbon intensity against target sector thresholds before confirming purchase agreements.',
    appLinks: [
      { label: 'Trade Builder, GHG saving', route: '/trade' },
      { label: 'Regulatory constants', route: '/pricing?tab=assumptions' },
    ],
    sources: [elig('RED_III_GHG_TRANSPORT'), elig('RED_III_GHG_HEAT_POWER')],
    related: ['fossil-comparator', 'carbon-intensity', 'red-iii', 'eligibility-gate'],
  },
  {
    id: 'fossil-comparator',
    term: 'Fossil comparator (80 heat / 94 transport)',
    aliases: ['fossil comparator', 'fossil fuel comparator', 'baseline', 'fossil reference'],
    short: 'The statutory baseline fossil emissions intensity against which renewable fuel greenhouse gas savings and certificates are measured.',
    plain: `European directives establish standardized fossil benchmarks: ${CI_COMPARATOR_ROAD_TRANSPORT} gCO₂e/MJ for transport fuels and ${CI_COMPARATOR_HEAT} gCO₂e/MJ for heating and cooling applications (RED Annex VI). Transport mechanisms (NL ERE, DE THG) apply the transport benchmark, whereas the Dutch Green Gas Obligation (GGE) applies the heat comparator.`,
    whyItMatters: 'Applying the incorrect comparator distorts certificate yields and misprices trade structures. The netback engine assigns sector-specific baselines automatically per target market.',
    appLinks: [
      { label: 'Regulatory constants', route: '/pricing?tab=assumptions' },
      { label: 'Trade Builder', route: '/trade' },
    ],
    sources: [elig('RED_III_COMPARATOR'), reg('glossary-carbon-intensity'), reg('nl-gge-draft-regeling')],
    related: ['carbon-intensity', 'ghg-threshold', 'gge', 'ere'],
  },
  {
    id: 'carbon-intensity',
    term: 'Carbon intensity (CI, gCO₂e/MJ)',
    aliases: ['CI', 'carbon intensity', 'gCO2e/MJ', 'gCO₂e/MJ', 'GHG intensity', 'certified CI'],
    short: 'The total audited lifecycle greenhouse gas emissions generated per megajoule of fuel energy produced, expressed in gCO₂e/MJ.',
    plain: 'Calculated under RED Annex VI rules, Carbon Intensity aggregates emissions across feedstock cultivation, processing, compression, and transport, while deducting carbon capture and avoided methane credits. Documented on the official Proof of Sustainability, lower CI values generate proportionally higher certificate yields in emission-reduction quota regimes.',
    whyItMatters: 'In quota-based compliance markets, CI dictates the exact certificate multiplier per MWh. A difference of five grams materially alters trade netbacks and producer payments.',
    appLinks: [
      { label: 'Trade Builder, PoS record', route: '/trade' },
      { label: 'Desk assumptions, feedstock default CI', route: '/pricing?tab=assumptions' },
    ],
    sources: [reg('glossary-carbon-intensity')],
    related: ['manure-credit', 'ghg-threshold', 'fossil-comparator', 'pos', 'gge'],
  },
  {
    id: 'manure-credit',
    term: 'Manure credit (negative CI)',
    aliases: ['negative CI', 'negative carbon intensity', 'avoided methane', 'avoided methane credit', 'deep negative'],
    short: 'A regulatory lifecycle credit for avoided methane emissions that drives agricultural manure biomethane into deep-negative carbon intensity.',
    plain: 'Under RED Annex VI lifecycle calculation rules, capturing methane that would otherwise emit during raw livestock manure storage awards an avoided-emissions credit. This deduction routinely pulls overall CI to deep-negative values (often below -100 gCO₂e/MJ). As a lifecycle science factor, it persists regardless of whether jurisdictions abolish political double-counting multipliers.',
    whyItMatters: 'Deep-negative CI multiplies certificate creation per MWh in THG, ERE, and GGE regimes, establishing manure-based biomethane as Europe’s most valuable renewable gas commodity.',
    appLinks: [
      { label: 'Morning brief, netback ladder', route: '/brief' },
      { label: 'Plants, manure filter', route: '/plants' },
    ],
    sources: [reg('glossary-carbon-intensity'), elig('DE_DRS_21_5530')],
    related: ['carbon-intensity', 'annex-ix', 'double-counting', 'thg-quote'],
  },
  {
    id: 'operating-vs-investment-aid',
    term: 'Operating aid vs investment aid',
    aliases: ['operating aid', 'investment aid', 'exploitatiesubsidie', 'investeringssubsidie', 'operating subsidy', 'operational support', 'CAPEX grant', 'DEI++'],
    short: 'Operating subsidies support ongoing production volume, whereas investment grants fund initial capital expenditure; compliance regimes treat them differently.',
    plain: 'European compliance regimes differentiate ongoing operational subsidies (exploitatiesubsidie) from upfront capital grants (investeringssubsidie). The Dutch Green Gas Obligation explicitly bars biomethane receiving operational aid from compliance crediting, while permitting facilities constructed with CAPEX grants (such as Dutch DEI++). Certificate support fields and producer declarations disclose applicable subsidies.',
    whyItMatters: 'Sourcing biomethane from facilities with active operational aid immediately disqualifies consignments from Dutch GGE surrender. Traders must audit plant subsidy history before structuring contracts.',
    appLinks: [
      { label: 'Trade Builder, support fields', route: '/trade' },
      { label: 'Plants, plant dossier', route: '/plants' },
    ],
    sources: [reg('nl-kst-36947-8'), reg('nl-gge-draft-besluit')],
    related: ['prtr', 'sde-plus-plus', 'eeg', 'reer', 'double-claim'],
  },
  {
    id: 'prtr',
    term: 'PRTR grant (Orden TED/706 Art. 5.3)',
    aliases: ['PRTR', 'Orden TED/706', 'Orden TED/706/2022', 'Art 5.3', 'Article 5.3', 'NextGenEU biogas grant'],
    short: 'Spain’s NextGenerationEU recovery grants for biogas facilities under Orden TED/706/2022, containing restrictive certificate trading covenants.',
    plain: 'Spain’s Recovery, Transformation and Resilience Plan (PRTR) awarded capital subsidies for biogas infrastructure. While Article 2.6 confirms compatibility with standard Guarantees of Origin, Article 5.3 prohibits grant recipients from entering agreements that monetize tradable green certificates under external support regimes without prior approval. Off-taking plants with PRTR aid requires rigorous legal review.',
    whyItMatters: 'Article 5.3 restrictions may restrict Spanish producers from selling paired certificate bundles into foreign compliance regimes. Legal due diligence must verify the facility’s specific grant call conditions.',
    appLinks: [
      { label: 'Trade Builder, claims', route: '/trade' },
      { label: 'Plants, plant dossier', route: '/plants' },
    ],
    sources: [reg('es-orden-ted-706-2022')],
    related: ['operating-vs-investment-aid', 'enagas-gdo', 'gge'],
  },
  {
    id: 'sde-plus-plus',
    term: 'SDE++ (Dutch subsidy)',
    aliases: ['SDE++', 'SDE', 'SDE plus plus'],
    short: 'The Netherlands’ flagship operational feed-in subsidy scheme for renewable energy production, compensating operating cost gaps against fossil benchmarks.',
    plain: 'Stimulering Duurzame Energieproductie en Klimaattransitie (SDE++) provides operational premium feed-in support to Dutch biomethane producers. Because SDE++ compensates the financial spread between production cost and wholesale natural gas revenues, selling environmental attributes into compliance markets without clawback creates prohibited double-compensation liabilities. Contracts require explicit support disclosures.',
    whyItMatters: 'Producers receiving SDE++ cannot double-claim commercial market premiums without contractual clawback provisions. Legal schedules must include comprehensive warranties against duplicate subsidy claims.',
    appLinks: [
      { label: 'Trade Builder, legal pack', route: '/trade' },
      { label: 'Plants', route: '/plants' },
    ],
    sources: [],
    related: ['operating-vs-investment-aid', 'double-claim', 'eeg', 'reer'],
  },
  {
    id: 'eeg',
    term: 'EEG (German support law)',
    aliases: ['EEG', 'EEG 2023'],
    short: 'Germany’s Renewable Energy Sources Act (Erneuerbare-Energien-Gesetz), providing statutory feed-in tariffs and market premiums for power generation.',
    plain: 'The German EEG serves as the historical regulatory foundation for domestic biogas power generation and the dena Biogasregister. Facilities receiving EEG feed-in tariffs have already monetized their green attributes through national electricity mechanisms. Term sheets and legal packs require producers to warrant that biomethane attributes sold into gas grids are not claimed under EEG.',
    whyItMatters: 'Facilities committed to EEG support tariffs cannot sell duplicate green attributes into merchant biomethane markets. Due diligence must confirm that gas volumes are fully liberated from electricity feed-in claims.',
    appLinks: [
      { label: 'Trade Builder, legal pack', route: '/trade' },
      { label: 'Plants', route: '/plants' },
    ],
    sources: [ds('dena_biogasregister_germany')],
    related: ['sde-plus-plus', 'double-claim', 'egg-austria', 'dena-biogasregister'],
  },
  {
    id: 'reer',
    term: 'REER (Spanish operating aid)',
    aliases: ['REER', 'retribución específica', 'RECORE', 'RD 413/2014'],
    short: 'Spain’s specific remuneration regime (retribución específica) for renewable electricity generation, governing co-generation and legacy biogas facilities.',
    plain: 'Regulated under Real Decreto 413/2014, the REER (or RECORE) framework provides operating subsidies for Spanish renewable electricity and cogeneration assets. On agricultural and industrial sites with both power generation and gas upgrading, traders must verify that biogas feedstock diverted to upgrading is completely isolated from units receiving REER subsidies to avoid operational aid disqualifications.',
    whyItMatters: 'Co-located CHP units receiving REER support can inadvertently contaminate the regulatory status of upgraded biomethane. Origination teams must verify physical and accounting separation at plant gates.',
    appLinks: [{ label: 'Plants, plant dossier', route: '/plants' }],
    sources: [],
    related: ['operating-vs-investment-aid', 'prtr', 'enagas-gdo'],
  },
  {
    id: 'double-counting',
    term: 'Double counting (quota multiplier)',
    aliases: ['double counting', 'double-counting', 'single counting', 'multiplier'],
    short: 'A statutory compliance mechanism that awards double energy credit to advanced biofuels towards mandatory transport renewable targets.',
    plain: 'Under RED framework rules, Member States could allow advanced Annex IX Part A biofuels to count twice toward transport volume targets. Germany applied double counting through compliance year 2025 before transitioning to single counting under legislative reforms (Drs 21/5530). Abolishing the multiplier impacts accounting volume only; underlying negative carbon intensity credits remain fully intact.',
    whyItMatters: 'Pricing vintage years requires verifying applicable quota rules: pre-2026 German contracts benefit from the double multiplier, whereas forward deliveries trade under single-counting economics.',
    appLinks: [
      { label: 'Pricing desk, DE THG', route: '/pricing' },
      { label: 'Citations', route: '/citations' },
    ],
    sources: [reg('de-bimschg-37a'), elig('DE_DRS_21_5530')],
    related: ['thg-quote', 'manure-credit', 'compliance-year', 'annex-ix'],
  },
  {
    id: 'double-claim',
    term: 'Double claim',
    aliases: ['double compensation', 'claimed twice', 'no double claim'],
    short: 'The fraudulent or unlawful surrender of identical environmental attributes across multiple compliance registries or voluntary sustainability schemes.',
    plain: 'Statutory rules strictly dictate that a single unit of biomethane energy can only be surrendered once. An environmental attribute applied to a transport quota (e.g. Dutch ERE or German THG) cannot simultaneously satisfy heating mandates (Dutch GGE) or voluntary ETS zero-rating. Master contracts mandate bilateral no-double-claim warranties backed by legal indemnification.',
    whyItMatters: 'Double counting attributes voids compliance certificates, triggers regulator fraud investigations, and enforces multi-year retroactive clawbacks. Traders must secure explicit written warranties from upstream counterparties.',
    appLinks: [
      { label: 'Trade Builder, claims', route: '/trade' },
      { label: 'Trade Builder, legal pack', route: '/trade' },
    ],
    sources: [reg('nl-gge-draft-regeling'), reg('nl-gge-draft-besluit')],
    related: ['ere', 'gge', 'nea', 'operating-vs-investment-aid'],
  },
  {
    id: 'ets1-zero-rating',
    term: 'ETS1 zero-rating',
    aliases: ['ETS1', 'EU ETS1', 'EUA', 'EU allowance', 'zero-rating', 'zero rating', 'ETS Scope 1', 'avoided EUA'],
    short: 'The regulatory exemption allowing EU ETS industrial installations to report zero emissions for sustainable biomethane, avoiding EUA surrenders.',
    plain: 'Regulated industrial installations under the EU Emissions Trading System (ETS1) can assign an emission factor of zero to combusted biomethane, avoiding the surrender of EU Allowances (EUAs). Qualifying requires physical gas delivery under mass balance and audited RED III Proof of Sustainability compliance (bare GOs are ineligible). The financial value equals avoided EUA costs.',
    whyItMatters: 'ETS1 industrial emitters represent high-credit buyers whose willing-to-pay directly tracks prevailing EUA carbon prices. Commercial proposals link delivered biomethane premiums to prevailing EUA marks.',
    appLinks: [
      { label: 'EU ETS, ETS1 installations', route: '/ets2' },
      { label: 'Clients', route: '/clients' },
    ],
    sources: [elig('EU_ETS_DIRECTIVE')],
    related: ['ets2', 'pos', 'mark'],
  },
  {
    id: 'ets2',
    term: 'EU ETS2',
    aliases: ['ETS2', 'EU ETS 2', 'ETS 2'],
    short: 'The upcoming European emissions trading system covering fuel combustion in buildings, road transport, and light industrial sectors.',
    plain: 'EU ETS2 establishes a distinct cap-and-trade market obligating commercial fuel distributors to surrender emissions allowances for fuels combusted in heating and transport. Certified sustainable biomethane achieves an emission factor of zero, relieving distributors from allowance surrenders. As allowance auctions commence, avoided ETS2 compliance creates a major structural price floor for compliant green gas.',
    whyItMatters: 'Obligated gas suppliers gain substantial upside by replacing fossil gas with zero-rated biomethane to mitigate ETS2 liability. Forward contracts increasingly structure ETS2 pass-through provisions.',
    appLinks: [
      { label: 'EU ETS, ETS2 gas suppliers', route: '/ets2' },
      { label: 'Pricing desk, EU ETS2 mark', route: '/pricing' },
    ],
    sources: [reg('eu-ets-2'), elig('EU_ETS_DIRECTIVE')],
    related: ['ets1-zero-rating', 'gge', 'mark'],
  },
  {
    id: 'fueleu-maritime',
    term: 'FuelEU Maritime',
    aliases: ['FuelEU', 'Regulation 2023/1805'],
    short: 'European Regulation (EU) 2023/1805 mandating progressive reductions in the greenhouse gas intensity of energy used onboard commercial maritime vessels.',
    plain: 'FuelEU Maritime imposes legally binding annual limits on the well-to-wake GHG intensity of energy used by ships exceeding 5,000 gross tonnage calling at European ports. Shipping companies consuming low-carbon Bio-LNG generate valuable compliance surpluses, while non-compliant vessels incur heavy statutory financial penalties calculated per metric tonne of VLSFO energy equivalent.',
    whyItMatters: 'Maritime operators represent high-margin off-takers for cryogenic Bio-LNG. Statutory financial penalties establish the firm price cap for monetizing compliance surpluses.',
    appLinks: [
      { label: 'FuelEU Maritime', route: '/fueleu-shipping' },
      { label: 'Pricing desk, FuelEU mark', route: '/pricing' },
    ],
    sources: [reg('eu-fueleu-maritime'), ds('fueleu_maritime_shipping_registry')],
    related: ['fueleu-pooling', 'buy-out', 'banking', 'carbon-intensity'],
  },
  {
    id: 'fueleu-pooling',
    term: 'FuelEU pool',
    aliases: ['pool', 'pooling', 'FuelEU pooling', 'compliance pool', 'pool surplus'],
    short: 'The statutory mechanism enabling multiple vessels to aggregate compliance balances so surplus renewable performance offsets deficits across fleets.',
    plain: 'Established under FuelEU Article 21, compliance pooling allows vessel operators to combine performance balances across ships. A vessel bunkering deeply negative Bio-LNG generates massive compliance credits that can neutralize the deficits of multiple fossil-fueled vessels, avoiding severe statutory non-compliance fines. Pools must be registered in the official FuelEU database by statutory annual deadlines.',
    whyItMatters: 'Pooling enables producers and traders to monetize concentrated batches of Bio-LNG across global shipowners at prices structured comfortably below statutory penalty rates.',
    appLinks: [
      { label: 'FuelEU, pool matching', route: '/fueleu-shipping' },
      { label: 'Pricing desk, FuelEU mark', route: '/pricing' },
    ],
    sources: [reg('eu-fueleu-maritime')],
    related: ['fueleu-maritime', 'banking', 'buy-out'],
  },
  {
    id: 'nl-green-gas-law',
    term: 'Wet bijmengverplichting groen gas',
    aliases: ['bijmengverplichting', 'Dutch green gas law', 'Kamerstuk 36947', 'green gas blending obligation', 'Wm titel 9.9'],
    short: 'The pending Dutch statute introducing a mandatory green gas blending obligation for natural gas suppliers from 2026.',
    plain: `Kamerstuk 36947 establishes the statutory Dutch green gas blending mandate as Title 9.9 of the Wet milieubeheer. Following approval by the Tweede Kamer on 6 October 2026, the legislation awaits Eerste Kamer ratification ahead of planned implementation in ${NL_GGE_START_YEAR}. Implementing decrees permit certified EU and EEA biomethane origins while rejecting protectionist domestic-only restrictions.`,
    whyItMatters: 'Because final senate promulgation remains pending, GGE forward contracts should be priced with conditional regulatory clauses. The desk tracks parliamentary progress closely.',
    appLinks: [
      { label: 'Citations', route: '/citations' },
      { label: 'Regulation check', route: '/regulation-check' },
      { label: 'Trade Builder, checklist', route: '/trade' },
    ],
    sources: [reg('nl-kst-36947-8'), reg('nl-tk-verslag-2026-10-06'), reg('nl-gge-draft-besluit')],
    related: ['gge', 'nea', 'ere', 'buy-out', 'banking'],
  },

  // ── Trading ─────────────────────────────────────────────────────────────────
  {
    id: 'netback',
    term: 'Netback',
    aliases: ['net netback', 'netback ladder', 'delivered netback'],
    short: 'The net economic value of a biomethane consignment in a target market after deducting transport, conversion, and trading costs.',
    plain: 'Calculated in euros per MWh, netback aggregates total revenue (wholesale gas index plus environmental certificate premiums) and subtracts pipeline wheeling tariffs, registry fees, cross-border basis spreads, and financing costs. Ranking markets by delivered netback reveals the highest-margin destination across European compliance regimes.',
    whyItMatters: 'Netback ranking dictates destination routing and maximum sourcing prices. Comparing netbacks identifies cross-border arbitrage opportunities across European compliance and voluntary markets.',
    appLinks: [
      { label: 'Morning brief, netback ladder', route: '/brief' },
      { label: 'Origination', route: '/sourcing' },
      { label: 'Trade Builder, economics', route: '/trade' },
    ],
    sources: [],
    related: ['value-stack', 'desk-margin', 'producer-payable', 'bundle-price', 'eligibility-gate', 'mark'],
  },
  {
    id: 'value-stack',
    term: 'Value stack',
    aliases: ['stack', 'stacked value'],
    short: 'The granular component breakdown of biomethane commercial revenue, itemizing gas molecules, certificate premia, transport deductions, and desk margins.',
    plain: 'The value stack decomposes total gross trade realization into component parts: wholesale energy value (e.g. TTF), statutory certificate premiums (e.g. THG, ERE, GGE), grid and registry fees, desk trading margin, and the net payable to the biomethane plant. It isolates where economic value originates and where costs accumulate.',
    whyItMatters: 'Dissecting the value stack prevents pricing errors by exposing whether profitability depends on volatile certificate marks, gas spreads, or aggressive cost assumptions.',
    appLinks: [
      { label: 'Morning brief', route: '/brief' },
      { label: 'Clients', route: '/clients' },
    ],
    sources: [],
    related: ['netback', 'desk-margin', 'producer-payable', 'bundle-price'],
  },
  {
    id: 'bundle-price',
    term: 'Bundle price',
    aliases: ['THG bundle', 'bundle', 'bundle reference', 'held at bundle price'],
    short: 'The all-in OTC market price quoting the physical gas molecule and accompanying environmental certificates together as an integrated package.',
    plain: 'In markets such as German THG or paired GGE structures, brokers frequently quote transactions as an all-in bundle combining physical gas delivery with green certificates. Traded bundle prices reflect actual clearing liquidity, providing a practical market ceiling that prevents theoretical netback models from overestimating realisable revenue.',
    whyItMatters: 'Liquid broker bundle quotes supersede theoretical models. When traded bundle marks exist, desk netbacks clamp to traded levels to ensure execution reality.',
    appLinks: [
      { label: 'Pricing desk, marks', route: '/pricing' },
      { label: 'Morning brief, value stack', route: '/brief' },
    ],
    sources: [],
    related: ['netback', 'thg-quote', 'broker-run', 'mark'],
  },
  {
    id: 'hub-spread',
    term: 'Hub spread (PVB–TTF)',
    aliases: ['PVB-TTF', 'PVB–TTF', 'PVB TTF spread', 'hub basis', 'basis spread', 'hub basis spread', 'spread to TTF'],
    short: 'The wholesale pricing differential between two European virtual trading hubs, such as Spanish PVB and Dutch TTF.',
    plain: 'Hub basis spreads quantify the price differential between regional gas hubs reflecting pipeline capacity, balancing charges, and local supply-demand fundamentals. When contracting biomethane at origin (e.g. Spanish PVB) for delivery at a destination hub (e.g. TTF), the trading desk absorbs the basis risk unless hedged via financial exchange spreads.',
    whyItMatters: 'Adverse hub basis movements can wipe out trade margins on delivered contracts. Structuring must specify whether title transfers at the origin hub or destination.',
    appLinks: [
      { label: 'Costs, hub basis spreads', route: '/pricing?tab=costs' },
      { label: 'Trade Builder, deal structure', route: '/trade' },
    ],
    sources: [],
    related: ['ttf', 'pvb', 'the-hub', 'vtp', 'netback'],
  },
  {
    id: 'ttf',
    term: 'TTF (Title Transfer Facility)',
    aliases: ['TTF', 'Title Transfer Facility', 'TTF M+1', 'gas index'],
    short: 'The Dutch Title Transfer Facility, serving as the benchmark wholesale natural gas pricing index for European energy markets.',
    plain: 'Operated by Gasunie Transport Services, the Title Transfer Facility (TTF) is Europe’s primary gas trading hub and liquidity reference. The desk’s pricing models use TTF forward month-ahead settlements as the baseline energy value for biomethane molecules, expressing regional basis spreads relative to this continental benchmark.',
    whyItMatters: 'Because TTF sets the wholesale baseline for all European gas netbacks, stale TTF marks distort every pricing ladder across the desk simultaneously.',
    appLinks: [
      { label: 'Pricing desk, TTF mark', route: '/pricing' },
      { label: 'Costs, hub basis spreads', route: '/pricing?tab=costs' },
    ],
    sources: [],
    related: ['hub-spread', 'the-hub', 'vtp', 'netback', 'mark'],
  },
  {
    id: 'the-hub',
    term: 'THE (Trading Hub Europe)',
    aliases: ['THE', 'Trading Hub Europe', 'German gas hub'],
    short: 'Trading Hub Europe (THE), the unified virtual trading point and balancing area for the German natural gas transmission system.',
    plain: 'Formed by the merger of NetConnect Germany and GASPOOL, Trading Hub Europe (THE) operates as the single national market area for Germany’s high-pressure gas network. The desk tracks THE-TTF basis differentials to model the physical energy leg of German THG transport deliveries.',
    whyItMatters: 'German delivered biomethane transactions settle against THE indexation. Accurate basis spreads between THE and TTF are essential for calculating precise delivered margins.',
    appLinks: [{ label: 'Costs, hub basis spreads', route: '/pricing?tab=costs' }],
    sources: [],
    related: ['hub-spread', 'ttf', 'pvb', 'vtp'],
  },
  {
    id: 'vtp',
    term: 'VTP (Virtual Trading Point)',
    aliases: ['VTP', 'Virtual Trading Point'],
    short: 'A national transmission system’s non-physical commercial balancing hub where gas ownership transfers electronically between market participants.',
    plain: 'A Virtual Trading Point (VTP) enables entry-exit title transfer of natural gas without designating physical pipeline injection or withdrawal flanges. Standard EFET biomethane schedules define the specific VTP where the gas molecule settles against wholesale index prices, while green attributes transfer electronically between respective registries.',
    whyItMatters: 'The nominated VTP determines applicable pipeline tariffs, balancing requirements, and pricing indices. Confirm the agreed VTP before locking contract price schedules.',
    appLinks: [{ label: 'Trade Builder, legal pack', route: '/trade' }],
    sources: [],
    related: ['efet', 'ttf', 'hub-spread', 'pvb'],
  },
  {
    id: 'pvb',
    term: 'PVB (Spanish virtual balancing point)',
    aliases: ['PVB', 'Punto Virtual de Balance', 'PVB hub'],
    short: 'Punto Virtual de Balance (PVB), Spain’s national virtual gas trading hub managed by Enagás as transmission system operator.',
    plain: 'The Punto Virtual de Balance (PVB) is the liquid commercial trading point for Spain’s gas grid. Biomethane registered in the Enagás Guarantee of Origin system reflects physical injection into the Spanish network. Deal structures deliver either locally at PVB or virtually at TTF via basis adjustments.',
    whyItMatters: 'Delivering at PVB shifts cross-border transport and basis exposure to the buyer, whereas TTF delivery requires the desk to manage the spread.',
    appLinks: [
      { label: 'Costs, hub basis spreads', route: '/pricing?tab=costs' },
      { label: 'Trade Builder, deal structure', route: '/trade' },
    ],
    sources: [ds('enagas_gts_spain')],
    related: ['hub-spread', 'ttf', 'enagas-gdo', 'vtp'],
  },
  {
    id: 'efet',
    term: 'EFET biomethane agreement',
    aliases: ['EFET', 'EFET Biomethane Master Agreement', 'EFET annex', 'master agreement'],
    short: 'The European Federation of Energy Traders standard contract structure governing physical gas and decoupled green certificate deliveries.',
    plain: 'The EFET Biomethane Master Agreement (and Annex) provides the industry standard legal framework for trading biomethane. It structurally separates physical gas settlement from the delivery of Proofs of Sustainability and GOs. If a seller delivers physical gas but fails to provide valid compliance certificates, buyers can re-price deliveries to fossil index.',
    whyItMatters: 'Certificate delivery failure triggers automatic price adjustments and replacement damages. Standardised EFET schedules establish clear cure periods and buyer remedies.',
    appLinks: [{ label: 'Trade Builder, legal pack', route: '/trade' }],
    sources: [],
    related: ['pos', 'vtp', 'ttf', 'legal-pack'],
  },
  {
    id: 'desk-margin',
    term: 'Desk margin',
    aliases: ['margin', 'desk P&L', 'trading margin'],
    short: 'The trading desk’s target commercial profit margin retained per MWh after accounting for sourcing payments and execution costs.',
    plain: 'Desk margin represents the net commercial trading profit captured by the desk per unit of energy. Multiplied across transaction volume, it generates total trade P&L. Modeling engines deduct target desk margins from market netbacks to calculate the maximum payable price offered to biomethane producers.',
    whyItMatters: 'Desk margin buffers against market volatility, basis movements, and registry execution delays. Thin margins require re-verifying cost assumptions before executing transactions.',
    appLinks: [
      { label: 'Trade Builder, economics', route: '/trade' },
      { label: 'Corporate orders', route: '/corporate' },
      { label: 'Deal blotter', route: '/deals' },
    ],
    sources: [],
    related: ['netback', 'producer-payable', 'value-stack'],
  },
  {
    id: 'producer-payable',
    term: 'Producer payable',
    aliases: ['plant gate price', 'producer price', 'payable to producer'],
    short: 'The maximum price per MWh offered to a biomethane producer that preserves the trading desk’s target profit margin.',
    plain: 'Producer payable reflects the plant-gate purchase price available to biomethane producers. Calculated in the value stack as delivered netback minus logistics expenses and the desk’s commercial margin, it defines the origination bid ceiling that the desk can quote while satisfying risk and return criteria.',
    whyItMatters: 'Producer payable forms your firm purchase limit. Bidding above this threshold erodes commercial margin; if plant demands exceed it, routes must be re-optimized.',
    appLinks: [
      { label: 'Morning brief, value stack', route: '/brief' },
      { label: 'Origination', route: '/sourcing' },
    ],
    sources: [],
    related: ['netback', 'desk-margin', 'value-stack'],
  },
  {
    id: 'compliance-year',
    term: 'Compliance year',
    aliases: ['delivery year', 'vintage', 'obligation year'],
    short: 'The statutory accounting calendar year during which fuel suppliers must surrender certificates to fulfill annual decarbonisation obligations.',
    plain: `Statutory fuel mandates operate on twelve-month compliance years with distinct targets and rules. In the Dutch GGE, volumes delivered during a calendar year must be booked by ${BOOKING_DEADLINE} of the subsequent year. Certificates must remain valid upon booking, expiring within ${NL_GGE_GO_VALIDITY_MONTHS} months from production.`,
    whyItMatters: 'Compliance vintages determine certificate eligibility and pricing. Sourcing audits must confirm that production dates and certificate lifespans align with buyer surrender deadlines.',
    appLinks: [
      { label: 'Trade Builder, booking date', route: '/trade' },
      { label: 'Regulatory constants', route: '/pricing?tab=assumptions' },
    ],
    sources: [reg('nl-gge-draft-besluit')],
    related: ['banking', 'buy-out', 'double-counting', 'gge'],
  },
  {
    id: 'banking',
    term: 'Banking',
    aliases: ['bank', 'carry-over', 'borrowing'],
    short: 'The statutory regulatory provision allowing market participants to roll over surplus compliance certificates into subsequent compliance years.',
    plain: `Banking provisions allow obligated entities to roll over surplus certificates to satisfy future compliance obligations. Under Dutch GGE rules, suppliers may bank up to ${NL_GGE_BANKING_CAP_PCT}% of their obligation into the subsequent year, provided they have not elected buyout penalties. Borrowing compliance from future years is strictly prohibited.`,
    whyItMatters: 'Banking caps determine buyer purchasing flexibility and year-end inventory demand. Reaching banking limits forces buyers out of the market until the next obligation cycle.',
    appLinks: [
      { label: 'Regulatory constants', route: '/pricing?tab=assumptions' },
      { label: 'FuelEU Maritime', route: '/fueleu-shipping' },
    ],
    sources: [reg('nl-gge-draft-besluit'), reg('eu-fueleu-maritime')],
    related: ['buy-out', 'compliance-year', 'fueleu-pooling', 'gge'],
  },

  // ── Pricing and screens ─────────────────────────────────────────────────────
  {
    id: 'mark',
    term: 'Mark (desk mark)',
    aliases: ['mark', 'marks', 'desk mark', 'bid offer mid', 'bid', 'offer', 'mid', 'stale mark'],
    short: 'The official pricing reference maintained by the trading desk, displaying bid, offer, mid-market levels, and timestamped provenance.',
    plain: `All economic valuations across the cockpit derive from active pricing desk marks. Each mark tracks bid, offer, mid-point, data source, and freshness. Marks display green within ${STALE_MARK_DAYS} days, amber within ${VERY_STALE_MARK_DAYS} days, and red when stale. Data provenance categorizes marks as broker-reported, manual, or simulated.`,
    whyItMatters: 'Valuation precision depends on mark freshness. Outdated marks produce misleading netbacks, requiring traders to refresh prices via broker runs before quoting counterparties.',
    appLinks: [
      { label: 'Pricing desk, Market prices', route: '/pricing' },
      { label: 'Morning brief, Market board', route: '/brief' },
    ],
    sources: [],
    related: ['simulated-mark', 'broker-run', 'netback', 'desk-assumption'],
  },
  {
    id: 'simulated-mark',
    term: 'Simulated mark',
    aliases: ['simulated seed', 'simulated price', 'placeholder mark'],
    short: 'An algorithmic placeholder price seeded by the system to maintain interface workflows until verified broker quotes are entered.',
    plain: 'Simulated marks represent synthetic initial estimates clearly tagged as simulated seeds. They enable navigation and modeling features prior to connecting live market data. Simulated marks never represent executed trades or firm broker quotes, and illiquid markets (e.g. forward ETS2) rely on modelled desk assumptions.',
    whyItMatters: 'Trades evaluated against simulated marks are theoretical models. Traders must import real broker sheets or manual marks before committing firm quotes to clients.',
    appLinks: [{ label: 'Pricing desk, Market prices', route: '/pricing' }],
    sources: [],
    related: ['mark', 'broker-run', 'open-item'],
  },
  {
    id: 'broker-run',
    term: 'Broker run',
    aliases: ['broker sheet', 'broker quotes', 'paste broker run', 'OTC broker run'],
    short: 'An OTC market price sheet distributed by environmental commodity brokers containing prevailing bids, offers, and transaction indications.',
    plain: 'Environmental commodity brokers (such as STX, ACT, or Marex) publish periodic pricing runs summarizing OTC liquidity. The desk parser ingests copied broker text to update bid, offer, and mid-market marks. Broker quotes provide indicative price guidance rather than firm binding commitments.',
    whyItMatters: 'Pasting fresh broker runs updates desk marks instantly across all European compliance regimes, replacing simulated seeds with institutional OTC market intelligence.',
    appLinks: [
      { label: 'Pricing desk, Paste Broker Run', route: '/pricing' },
      { label: 'Data connectors', route: '/connectors' },
    ],
    sources: [],
    related: ['mark', 'simulated-mark', 'bundle-price'],
  },
  {
    id: 'desk-assumption',
    term: 'Desk assumption',
    aliases: ['desk assumptions', 'desk estimate', 'desk policy', 'commercial assumption'],
    short: 'A configurable commercial parameter or risk tolerance variable defined by the desk to calibrate analytical calculations.',
    plain: 'Desk assumptions represent editable operational parameters (such as energy basis conversion ratios, default CI baselines, and capital financing costs) that supplement statutory constants and live marks. Every assumption specifies its source, unit, and methodology, allowing traders to customize scenarios within their local browser session.',
    whyItMatters: 'Commercial assumptions directly impact route viability and netback margins. Modifying an assumption instantly updates calculations across all screens, requiring deliberate review.',
    appLinks: [{ label: 'Pricing desk, Desk assumptions', route: '/pricing?tab=assumptions' }],
    sources: [],
    related: ['open-item', 'mark', 'energy-basis'],
  },
  {
    id: 'open-item',
    term: 'OPEN item (OPEN chip)',
    aliases: ['OPEN', 'OPEN chip', 'open item', 'open items', 'unconfirmed input'],
    short: 'An unconfirmed commercial or regulatory parameter flagged with an OPEN indicator that requires verification prior to contract execution.',
    plain: 'Parameters designated with an OPEN indicator reflect unconfirmed inputs where regulatory guidance or market conventions remain unsettled. Common examples include provisional calorific conversion factors, pending statutory thresholds, or indicative gas basis structures. They serve as transparent operational notices that specific inputs represent working assumptions.',
    whyItMatters: 'An unverified open item can reverse route profitability or fail an audit check. Commercial term sheets should treat open items as formal contract conditions.',
    appLinks: [
      { label: 'Desk assumptions, GGE inputs', route: '/pricing?tab=assumptions' },
      { label: 'Costs', route: '/pricing?tab=costs' },
    ],
    sources: [],
    related: ['desk-assumption', 'energy-basis', 'simulated-mark', 'gge'],
  },
  {
    id: 'eligibility-gate',
    term: 'Eligibility gate',
    aliases: ['gate', 'gates', 'gate audit', 'HARD_BLOCK', 'CONDITIONAL', 'blocked market'],
    short: 'An automated compliance validation check that evaluates transaction attributes against statutory rules before permitting market trade execution.',
    plain: 'Eligibility gates evaluate transactions against statutory criteria: voluntary scheme recognition, UDB compliance, mass balance integrity, Annex IX feedstock classification, GHG saving thresholds, and cross-border registry connectivity. Gates return explicit verdicts (PASS, CONDITIONAL, or HARD_BLOCK), rolling up into an overall route eligibility determination.',
    whyItMatters: 'Routes triggering a HARD_BLOCK are economically non-viable and excluded from actionable trading. CONDITIONAL verdicts highlight specific compliance hurdles requiring resolution.',
    appLinks: [
      { label: 'Trade Builder, market and gate audit', route: '/trade' },
      { label: 'Morning brief, netback ladder', route: '/brief' },
    ],
    sources: [],
    related: ['chain-of-custody', 'ghg-threshold', 'netback', 'voluntary-scheme'],
  },
  {
    id: 'custody-pack',
    term: 'Custody pack',
    aliases: ['custody record', 'GO and PoS record'],
    short: 'The comprehensive digital custody dossier assembling Guarantee of Origin details, Proof of Sustainability records, and regulatory declarations for a trade.',
    plain: 'The custody pack aggregates essential evidentiary records in the Trade Builder: electronic GO identifiers, audited PoS parameters with lifecycle CI breakdowns, voluntary scheme accreditations, subsidy declarations, and transaction booking schedules. The engine scans the custody pack to execute real-time statutory compliance audits.',
    whyItMatters: 'The custody pack provides the documentary foundation for compliance audits. Incomplete or unverified records trigger checklist warnings and prevent export of final execution packs.',
    appLinks: [{ label: 'Trade Builder, product step', route: '/trade' }],
    sources: [],
    related: ['chain-of-custody', 'go', 'pos', 'go-pos-bundle', 'legal-pack'],
  },
  {
    id: 'legal-pack',
    term: 'Legal pack',
    aliases: ['term sheet', 'legal package', 'regulatory pre-screen'],
    short: 'The suite of automated transaction documents generated by the Trade Builder, including term sheets, EFET confirmations, and regulatory audits.',
    plain: 'The Trade Builder compiles a standardized transaction documentation package: an indicative commercial term sheet, a customized EFET Biomethane Confirmation schedule, exportable deal records (CSV/JSON), a UDB audit worksheet, and a statutory pre-screen audit report. Documents incorporate tailored warranties addressing certificate pairing, subsidy exclusions, and clawback indemnities.',
    whyItMatters: 'The legal pack translates modeled trade structures into binding commercial terms. Review all statutory warranties and indemnity schedules before transmitting documents to counterparties.',
    appLinks: [{ label: 'Trade Builder, deal package', route: '/trade' }],
    sources: [],
    related: ['efet', 'custody-pack', 'double-claim', 'nea'],
  },
  {
    id: 'corridor',
    term: 'Corridor (route verdict)',
    aliases: ['corridor', 'route', 'route verdict', 'ready to trade', 'review needed'],
    short: 'A cross-border origination-to-destination market pathway evaluated for physical pipeline transit, registry connectivity, and regulatory trade viability.',
    plain: 'A corridor defines the bilateral transfer path between a producing country and a consuming market. The routing visualizer assesses transit viability under both certificate (GO) and mass balance (PoS) trading modes, categorizing corridors as ready to trade, conditional, or blocked while calculating pipeline distance and logistics transit hops.',
    whyItMatters: 'Corridor verdicts establish immediate feasibility before committing analytical resources. A non-tradeable corridor requires structuring an alternative transit route or physical Bio-LNG workaround.',
    appLinks: [
      { label: 'Map', route: '/map' },
      { label: 'Registries, route checker', route: '/registries' },
    ],
    sources: [],
    related: ['go', 'pos', 'aib-hub', 'mass-balance', 'eligibility-gate'],
  },
  {
    id: 'origination',
    term: 'Origination',
    aliases: ['sourcing', 'order intake', 'sourced plants'],
    short: 'The commercial process of discovering, vetting, and contracting upstream biomethane production capacity to fulfill specific buyer mandates.',
    plain: 'Origination connects buyer demand with upstream biomethane producers. The origination console filters Europe’s asset directory against buyer specifications (feedstock type, carbon intensity, volume, certification), assesses bilateral transit corridor verdicts, calculates delivered economics, and structures tailored bilateral term sheets for execution in the Trade Builder.',
    whyItMatters: 'Efficient origination transforms client requests into contracted supply while securing healthy trading margins. It aligns plant technical capabilities with statutory market eligibility.',
    appLinks: [
      { label: 'Origination', route: '/sourcing' },
      { label: 'Origination pipeline', route: '/origination' },
      { label: 'Plants', route: '/plants' },
    ],
    sources: [],
    related: ['rfq', 'netback', 'producer-payable', 'corridor'],
  },
  {
    id: 'rfq',
    term: 'RFQ (request for quote)',
    aliases: ['RFQ', 'request for quote', 'quote request'],
    short: 'A formal inquiry from an energy off-taker requesting commercial price, volume, and delivery terms for defined biomethane consignments.',
    plain: 'A Request for Quote (RFQ) defines an off-taker’s purchase requirements, specifying target compliance regimes, delivery timelines, volume, feedstock restrictions, and maximum carbon intensity thresholds. The origination engine provides instant RFQ presets for core European markets (DE THG, NL ERE, FR CPB, IT CIC) to accelerate asset matching.',
    whyItMatters: 'Accurate RFQ parameterisation prevents misaligned sourcing offers. Traders calibrate feedstock and carbon intensity criteria directly to the buyer’s statutory compliance profile.',
    appLinks: [{ label: 'Origination, order intake', route: '/sourcing' }],
    sources: [],
    related: ['origination', 'netback'],
  },
];

export const GLOSSARY_BY_ID: Readonly<Record<string, GlossaryEntry>> = Object.fromEntries(GLOSSARY.map(e => [e.id, e]));

export function getGlossaryEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY_BY_ID[id];
}

/** Normalise a search string or alias for matching: lower case, no accents, single spaces. */
export function normaliseGlossaryText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Entries whose term, an alias or the id matches the query. Empty query returns everything. */
export function searchGlossary(query: string, entries: readonly GlossaryEntry[] = GLOSSARY): GlossaryEntry[] {
  const q = normaliseGlossaryText(query);
  if (!q) return [...entries];
  return entries.filter(e => {
    if (e.id === q) return true;
    if (normaliseGlossaryText(e.term).includes(q)) return true;
    return e.aliases.some(a => normaliseGlossaryText(a).includes(q));
  });
}
