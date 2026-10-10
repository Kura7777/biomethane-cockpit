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
    short: 'A certificate that one MWh of gas was renewable; it moves between registries separately from the gas.',
    plain: 'A Guarantee of Origin (GvO in Dutch, GdO in Spanish) is a disclosure instrument under RED Art. 19: it shows a buyer the gas was renewable. It moves through national registries, the AIB hub or the ERGaR scheme. A GO alone does not make gas eligible for a compliance obligation; that needs a PoS.',
    whyItMatters: 'GOs are the voluntary-market currency. In paired markets such as the Dutch GGE they must travel with the PoS for the same MWh. Whether a GO can reach your buyer depends on the registry route, not only the price.',
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
    short: 'The audited sustainability record for a gas consignment: feedstock, origin and certified carbon intensity.',
    plain: 'A compliance instrument: it proves a consignment meets the RED sustainability and GHG-saving criteria so it can count towards binding targets. It states the raw material, production unit, country of origin and certified carbon intensity, and is issued under a recognised scheme such as ISCC EU. A GO and a PoS are not interchangeable.',
    whyItMatters: 'Compliance buyers pay for the PoS, not the GO. A missing or failed PoS can let the buyer re-price a contract down to plain gas, so check it before you trade.',
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
    short: 'A GO and a PoS for the same MWh and period, delivered together to a paired-market buyer.',
    plain: 'Some obligations, such as the Dutch GGE, need both documents for the same physical delivery. The draft rules say they may not be traded apart and the supplier must hold both. The Trade Builder checks that they cover the same MWh and period, after converting energy bases.',
    whyItMatters: 'Selling one without the other earns your buyer no credit. Source and price the pair together, keep the energy basis consistent, and expect the checklist to fail a mismatch.',
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
    short: 'The EU database meant to trace renewable fuels; its gas module is not yet live for traders.',
    plain: 'The Union Database is meant to trace renewable gas from injection to withdrawal. For gas it is a self-declared, monthly-batch PoS system. The app records that the gas module is not live for economic operators, so cross-border compliance traceability runs through national registries and voluntary schemes. It does not replace GO trading.',
    whyItMatters: 'Never assume a UDB record exists. The app shows UDB status as something to confirm with the seller; until go-live it is an open item on any compliance trade.',
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
    short: 'The Dutch green-gas unit: one GGE is one kilogram of CO₂e chain-emission reduction.',
    plain: `One GGE is 1 kg of CO₂e chain-emission reduction. The draft rules compute it as (${NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ} − CI) × ${GGE_MJ_FACTOR} × MWh, with ${NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ} gCO₂e/MJ as the fossil reference, CI from the PoS and MWh on a lower-heating-value basis. Only obligated gas suppliers hold GGEs; traders sell GO plus PoS bundles.`,
    whyItMatters: 'Lower CI means more GGEs per MWh, so manure gas is worth most. The yearly buy-out caps the price, and the app’s GGE mark is a simulated estimate until a traded price exists.',
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
    short: 'The Dutch transport-fuel obligation unit: one ERE is one kilogram of CO₂e avoided.',
    plain: 'The ERE replaced the earlier HBE system. One ERE is 1 kg of CO₂e avoided, with no multipliers, so low-carbon-intensity gas is structurally favoured. The Dutch emissions authority administers it. The same delivery and the same GO cannot also serve the Dutch green-gas obligation.',
    whyItMatters: 'ERE and GGE are separate markets competing for the same molecule. A GO or PoS used in one cannot be used in the other, so decide which market a delivery goes to before you sell.',
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
    short: 'Germany’s greenhouse-gas quota for fuel suppliers, the largest compliance market for biomethane in Europe.',
    plain: 'Fuel suppliers must cut the carbon footprint of their fuel pool under §37a BImSchG and the 38. BImSchV. Certificate value rises as the gas’s carbon intensity falls. Double counting for advanced feedstocks ended with the 2026 compliance year, so single counting applies, though the app notes the promulgation date as unconfirmed. A non-compliance penalty caps what a certificate can be worth.',
    whyItMatters: 'A low-CI manure molecule earns more certificate value per MWh here. The current THG mark and the penalty ceiling are on the pricing desk.',
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
    short: 'Italy’s transport certificate, issued by GSE for a fixed amount of biomethane energy.',
    plain: `Certificati di Immissione in Consumo are administered by GSE. Under DM 2 March 2018 and the PNRR rules, one CIC is issued per ${GCAL_PER_CIC_CONVENTIONAL} Gcal of conventional biomethane (about ${MWH_PER_CIC_CONVENTIONAL.toFixed(2)} MWh) or per ${GCAL_PER_CIC_ADVANCED} Gcal of advanced biomethane (about ${MWH_PER_CIC_ADVANCED.toFixed(3)} MWh).`,
    whyItMatters: 'The mark is quoted per CIC, not per MWh, and advanced gas earns more CICs per MWh. Convert before you compare with other markets; the netback engine does it for you.',
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
    short: 'The UK transport fuel obligation: suppliers redeem RTFCs or pay the buy-out.',
    plain: 'Under the RTFO Order 2007 (SI 2007/3072) fuel suppliers redeem Renewable Transport Fuel Certificates, and waste-derived gas earns more per kilogram. Gas injected into the Great Britain grid cannot clear the EU Union Database into EU compliance markets, so it serves UK schemes or moves physically as segregated Bio-LNG.',
    whyItMatters: 'UK gas and EU compliance markets are separate pools. Value UK-injected gas against the RTFO, not THG or ERE. The RTFC buy-out is a statutory ceiling on certificate value.',
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
    short: 'France’s biogas production certificate, with a statutory ceiling on its value.',
    plain: 'Certificats de Production de Biogaz oblige French natural gas suppliers above a size threshold to buy biogas certificates, under Code de l’énergie Art. L.446-24 and following. The obligation is phased, and certificate value is capped by a hard statutory penalty ceiling.',
    whyItMatters: 'Even if bids rise, value stops at the ceiling and the netback engine clamps it there. Read the ceiling under Regulatory constants on the pricing desk instead of quoting from memory.',
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
    short: 'France’s incentive tax on fuel distributors who miss renewable-fuel targets in road transport.',
    plain: 'TIRUERT charges fuel distributors that do not reach target shares of renewable fuels in the road transport pool. Advanced biomethane used as Bio-CNG or Bio-LNG reduces or removes the liability. The app notes the scheme is moving to a GHG-based version called IRICC.',
    whyItMatters: 'It creates demand for French-consumed Bio-CNG and Bio-LNG alongside CPB. The TIRUERT mark is one of the compliance marks on the pricing desk.',
    appLinks: [{ label: 'Pricing desk, FR TIRUERT mark', route: '/pricing' }],
    sources: [reg('fr-tiruert')],
    related: ['cpb', 'annex-ix'],
  },
  {
    id: 'egg-austria',
    term: 'EGG (Austria)',
    aliases: ['EGG', 'Erneuerbare-Gase-Gesetz', 'Erneuerbaren-Gase-Gesetz', 'AT EGG', 'Austrian Renewable Gas Act'],
    short: 'Austria’s Renewable Gas Act, which puts a rising green-gas quota on suppliers.',
    plain: 'The Erneuerbare-Gase-Gesetz sets a green-gas supplier quota that rises towards 2030. It is not the German EEG. The app tracks an Austrian EGG market with its own mark, and notes an anchor buyer in the market.',
    whyItMatters: 'It is a heat-and-power style quota, so the evidence rules differ from transport quotas. Check the market on the map before assuming a GO or PoS route.',
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
    short: 'The fixed statutory price an obligated party can pay instead of delivering certificates; it caps certificate value.',
    plain: 'In obligation markets a shortfall can be settled at a statutory buy-out price. Since no obligated party rationally pays more, it acts as a ceiling on certificate value. Germany, the UK, France, FuelEU and the Dutch GGE each have one; the GGE schedule is published per year. Using the buy-out forfeits banking.',
    whyItMatters: 'A mark above the buy-out is a warning, not an opportunity: the netback flags it. The statutory values are listed under Regulatory constants on the pricing desk.',
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
    short: 'Gross (HHV, PCS) versus net (LHV, PCI) heating value: the same gas gives a different MWh on each.',
    plain: 'A GO states its energy on a calorific basis. The Dutch NEa counts GGEs on the lower heating value (LHV, net; PCI). Spanish GOs appear to be stated on gross value (HHV; PCS) per the Enagás FAQ, still to be confirmed. The app converts GO MWh to LHV with a desk factor that is flagged OPEN.',
    whyItMatters: 'A wrong factor changes how many GGEs a GO delivers, and can make a GO and PoS look mismatched. Check the factor under Desk assumptions before you quote.',
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
    short: 'A chain-of-custody model that lets differing batches mix as long as the claimed volumes balance.',
    plain: 'Mass balance lets consignments with different sustainability characteristics mix in one system, such as a gas grid, while volumes claimed must balance over the period. It is required for EU compliance quotas (RED Art. 30). The interconnected EU gas grid counts as one mass-balancing area under IR 2022/996, so no physical flow to the buyer’s country is needed.',
    whyItMatters: 'It is what makes grid gas tradeable across borders for quotas. Book-and-claim paper cannot substitute for it, and the app blocks that in quota markets.',
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
    short: 'Certificates traded apart from the gas: fine for voluntary claims, invalid for EU compliance quotas.',
    plain: 'Book-and-claim lets certificates (GOs) be traded independently from the physical molecule. It is valid for voluntary corporate claims but not for EU quota compliance such as German THG, Dutch ERE or French CPB. The app hard-blocks a book-and-claim chain at the mass-balance gate in those markets.',
    whyItMatters: 'Voluntary corporate buyers accept it; compliance buyers do not. Choose the chain of custody on the Trade Builder before you promise a market.',
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
    short: 'Keeping a batch physically apart from other gas, instead of mixing it under mass balance.',
    plain: 'Where gas sits outside a shared mass-balance system, for example biomethane injected into the Great Britain grid, sustainability status survives only with physical segregation, such as shipping it as Bio-LNG. The app’s rules for non-EU grids point to this workaround.',
    whyItMatters: 'It turns a paper trade into a physical delivery with real logistics cost. Price it as a physical movement, and check the map’s route verdict first.',
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
    short: 'The unbroken record of who held the gas, and its sustainability data, from plant to final buyer.',
    plain: 'RED Art. 30 requires economic operators to show sustainability through a mass balance system. The Trade Builder turns this into one chain-of-custody checklist for the deal: route, GO and PoS pairing, aid, GHG saving, deadlines, certification and double claims. Each row is PASS, FAIL, WARN or TODO.',
    whyItMatters: 'A deal is only as sellable as its weakest row. Open rows link to the field that fixes them, so work the list top to bottom before you confirm a price.',
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
    short: 'The hub of gas GO registries that accept each other’s certificates across borders.',
    plain: 'A GO moves between registries only if both sit on the same hub and accept each other, so never assume a route. The AIB gas hub lists connected registries; some, such as Energinet (Denmark) and dena (Germany), sit on ERGaR instead. Foreign GOs for the Dutch GGE must reach VertiCer via the AIB hub.',
    whyItMatters: 'Hub membership decides whether a GO can reach your buyer at all. Treat PARTIAL or unverified routes as open items and check the route checker before you quote.',
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
    short: 'A second route for gas GOs, with each registry choosing which others it accepts.',
    plain: 'ERGaR runs the Certificate of Origin scheme that links some national gas registries. Each ERGaR registry chooses whom it accepts. Denmark (Energinet), Germany (dena) and the UK (GGCS) are on ERGaR only, not on the AIB gas hub. The Registries page shows ERGaR volumes and importers.',
    whyItMatters: 'An ERGaR link does not mean a route into every market. A GO from one ERGaR registry can still have no practical path to a given buyer, so check both hubs.',
    appLinks: [{ label: 'Registries, ERGaR statistics', route: '/registries' }],
    sources: [ERGAR_COO, regExtra('glossary-mass-balance-vs-bc', 'ERGaR')],
    related: ['aib-hub', 'dena-biogasregister', 'go'],
  },
  {
    id: 'verticer',
    term: 'VertiCer (Dutch GO registry)',
    aliases: ['VertiCer'],
    short: 'The Dutch registry that issues GOs for biomethane and holds the NEa account used for GGE booking.',
    plain: 'VertiCer is the designated issuer of Guarantees of Origin for biomethane and green gas in the Netherlands. For the green-gas obligation, foreign GOs enter VertiCer via the AIB hub and must be moved to the NEa account in VertiCer before booking.',
    whyItMatters: 'No move into the NEa account, no GGE credit. Allow time and fees for the transfer; GO transfer fees are a desk input on the pricing desk.',
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
    short: 'Spain’s Guarantee of Origin system for renewable gas, run by Enagás GTS.',
    plain: 'Enagás GTS runs Spain’s Guarantee of Origin system for renewable gas under Real Decreto 376/2022, and it connects to the AIB hub. Spanish GOs appear to be stated on gross calorific value, and the app checks GO validity against the planned booking date. Confirm the export window and energy basis before you promise delivery.',
    whyItMatters: 'Spain is a high-growth origin with a route into the Dutch obligation via AIB. The GO’s basis, validity and export window decide whether a delivery works.',
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
    short: 'Germany’s national biomethane register, run by dena, used for quality criteria, claims and transfers.',
    plain: 'The dena Biogasregister is Germany’s documentation system for biomethane quality, green-gas criteria and voluntary corporate claims. It is on ERGaR, not on the AIB gas hub, and publishes a limited list of partner registries. Compliance sales into German THG run on mass balance and PoS, not through GO registries.',
    whyItMatters: 'A German GO market is not the same as the THG quota. Do not use dena connectivity to judge a PoS compliance trade; use the GO route only for voluntary certificate sales.',
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
    short: 'The Dutch authority that runs the registers where suppliers book GO and PoS for the obligations.',
    plain: `The Nederlandse Emissieautoriteit oversees the Dutch renewable fuel systems and, for the green-gas obligation, the register where suppliers book GO and PoS. It can suspend crediting if fraud is suspected, and can re-determine booked gas up to ${NL_GGE_CLAWBACK_YEARS} years after booking.`,
    whyItMatters: 'NEa is the final auditor of your paperwork. Warranties, document retention and a claw-back indemnity in the legal pack exist because it can reopen a booking years later.',
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
    short: 'Commission-recognised voluntary schemes that audit the producer and every link in the chain.',
    plain: 'These schemes certify that sustainability and GHG criteria are met. ISCC EU and REDcert EU use the same RED GHG methodology, and the desk treats them as fungible for German THG and Dutch ERE. The Dutch draft rules name SURE alongside them. Every company in the chain needs a valid certificate.',
    whyItMatters: 'If your own company or your counterparty is not certified, the chain breaks. A seller offering ISCC PLUS paper is not offering compliance gas.',
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
    short: 'A voluntary standard that cannot be used to satisfy EU statutory transport or heat quotas.',
    plain: 'ISCC PLUS is for non-regulated sectors and voluntary corporate reporting. It allows book-and-claim and mass balance without RED III fuel compliance. It cannot be surrendered for German THG, Dutch ERE, French CPB or FuelEU obligations, so the paper must be upgraded or recertified under ISCC EU first.',
    whyItMatters: 'It is the most common way a deal looks compliant and is not. The Trade Builder blocks ISCC PLUS at the scheme gate in compliance markets.',
    appLinks: [{ label: 'Trade Builder, scheme', route: '/trade' }],
    sources: [reg('scheme-iscc-plus'), elig('ISCC_PLUS_SCOPE')],
    related: ['voluntary-scheme', 'eligibility-gate', 'book-and-claim'],
  },
  {
    id: 'certified-economic-operator',
    term: 'Certified economic operator',
    aliases: ['economic operator', 'certified trader', 'certified operator'],
    short: 'A company holding a valid scheme certificate for the step it performs in the chain.',
    plain: 'Under ISCC every economic operator in the supply chain must hold a valid certificate to transfer sustainable material with sustainability claims. In the Dutch draft rules the supplier draws up the PoS for NEa from the previous link’s PoS, so the trader in between must be certified. The Trade Builder asks whether your entity and the counterparty are certified.',
    whyItMatters: 'Your own certification is a prerequisite, not an extra. Without it you cannot take title to compliance gas.',
    appLinks: [{ label: 'Trade Builder, claims', route: '/trade' }],
    sources: [reg('scheme-iscc-eu'), reg('nl-gge-draft-regeling')],
    related: ['voluntary-scheme', 'chain-of-custody', 'pos'],
  },

  // ── Regulation ──────────────────────────────────────────────────────────────
  {
    id: 'red-iii',
    term: 'RED III',
    aliases: ['RED', 'RED II', 'Renewable Energy Directive', 'Directive 2023/2413'],
    short: 'The EU directive behind biomethane compliance: targets, sustainability criteria, mass balance and the Union Database.',
    plain: 'Directive (EU) 2023/2413 sets renewable-energy targets in transport, the sustainability and GHG criteria (Art. 29), mass balance (Art. 30) and the Union Database (Art. 31a). National quotas such as THG, ERE and CPB implement it, which is why the same feedstock and carbon rules recur across markets.',
    whyItMatters: 'Most gate checks in the app trace back to RED III. When a rule surprises you, the Citations page shows the article behind it.',
    appLinks: [{ label: 'Citations', route: '/citations' }],
    sources: [reg('eu-red-iii')],
    related: ['annex-ix', 'ghg-threshold', 'mass-balance', 'udb', 'carbon-intensity'],
  },
  {
    id: 'annex-ix',
    term: 'Annex IX Part A / Part B',
    aliases: ['Annex IX', 'Annex IX A', 'Annex IX B', 'Annex IX Part A', 'Annex IX Part B', 'advanced feedstock', 'advanced biofuel'],
    short: 'The RED feedstock lists: Part A is advanced (manure, straw, biowaste), Part B is capped (used oils, fats).',
    plain: 'Annex IX Part A lists advanced feedstocks such as slurry and manure, straw and municipal biowaste. Part B lists used cooking oil and animal fats categories 1 and 2, which are subject to a cap. Food and feed crops sit outside both, are capped, and are excluded from advanced mandates.',
    whyItMatters: 'Part A feedstock is the main driver of commercial premium. Crop-based gas trades at a discount, and some markets will not accept it at all.',
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
    short: 'The minimum percentage emissions saving against the fossil comparator that a gas must reach to qualify.',
    plain: `For transport, RED III Art. 29(10) needs a ${TRANSPORT_SAVING_PCT}% saving, which means CI at or below ${RED3_TRANSPORT_MAX_CI} gCO₂e/MJ against the ${CI_COMPARATOR_ROAD_TRANSPORT} comparator. For heat and power the app tests ${HEAT_LOW_PCT}% for installations starting 2021 to 2025 and ${HEAT_HIGH_PCT}% from 2026, and flags the category as unconfirmed for gas-grid injection.`,
    whyItMatters: 'Below the minimum the checklist row fails. Between the two heat thresholds it warns, because the right category depends on the commissioning date. Pick lower-CI gas or confirm the category.',
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
    aliases: ['fossil comparator', 'fossil fuel comparator', 'comparator', 'baseline', 'fossil reference'],
    short: 'The reference emissions a gas is measured against: one figure for transport, another for heat.',
    plain: `The fossil fuel comparator is ${CI_COMPARATOR_ROAD_TRANSPORT} gCO₂e/MJ for transport fuels and ${CI_COMPARATOR_HEAT} gCO₂e/MJ for heat. Transport-type markets such as the Dutch ERE use the transport figure; the Dutch green-gas obligation uses the heat figure (RED Annex VI Part B point 19, draft Regeling toelichting 2.3).`,
    whyItMatters: 'Using the wrong comparator misprices the certificate, which is why the netback engine takes it per market. Never carry a GGE number into an ERE calculation.',
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
    short: 'Lifecycle greenhouse-gas emissions per unit of fuel energy; lower is better and manure gas can be negative.',
    plain: 'CI adds up cultivation, processing, transport and use emissions and subtracts credits, following RED Annex VI. The PoS states the certified figure. Where the desk has none, the app uses a default per feedstock, which is a desk estimate you can change under Desk assumptions.',
    whyItMatters: 'In quota markets CI sets the certificate yield per MWh, so a few grams matter commercially. Replace feedstock defaults with the PoS figure before you quote a price.',
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
    aliases: ['negative CI', 'negative carbon intensity', 'e_am', 'eam', 'avoided methane', 'avoided methane credit', 'deep negative'],
    short: 'The avoided-methane credit that pulls manure-based gas to a negative carbon intensity.',
    plain: 'Manure stored in closed storage earns an avoided-methane credit (e_am) in the RED lifecycle calculation, which can pull CI deeply negative. It is a physical accounting credit, separate from any quota counting rules, so it stays intact when a market stops double counting. The negative figure comes from manure management, not from upgrading the gas.',
    whyItMatters: 'Each extra negative gram lifts the certificate yield per MWh, which is why manure gas is worth most per MWh in quota markets. Confirm the credit is on the PoS, not assumed.',
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
    short: 'Operating aid pays for producing gas; investment aid pays for building the plant. The Dutch GGE excludes only the first.',
    plain: 'The Dutch green-gas obligation does not credit gas whose production receives operating aid (exploitatiesubsidie), but investment aid such as DEI++ can be combined with it. The GO support field and the PoS show which applies, and the checklist row No operating aid tests it.',
    whyItMatters: 'A plant with operating aid cannot supply a GGE deal, so check support before you spend time on a route. Spanish PRTR grants are investment-type but need their own legal check.',
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
    short: 'Spain’s recovery-fund biogas grants, whose Article 5.3 can bar agreements for tradable green certificates.',
    plain: 'Spain’s PRTR biogas grants are governed by Orden TED/706/2022. Article 2.6 treats GOs as compatible; Article 5.3 makes the aid incompatible with agreements to obtain tradable green certificates under a support mechanism unless the call allows it. Whether a Dutch GGE sale triggers 5.3 is an open legal question.',
    whyItMatters: 'A PRTR plant is a legal-check item, not an automatic no. The Trade Builder asks whether there is a grant and whether its terms were checked.',
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
    short: 'The Dutch statutory subsidy scheme; gas that receives it risks a double claim if certificates are sold on.',
    plain: 'SDE++ is a Dutch statutory support scheme. The app’s offtake maths follow a contract clause that deducts SDE++ support from what a buyer pays, and the legal pack asks the seller to warrant that no double compensation is retained for volumes delivered into or out of the Netherlands.',
    whyItMatters: 'Support-scheme gas needs disclosure and a warranty before its attributes are sold on. Treat any SDE++ plant as an open question in the custody pack.',
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
    short: 'The German renewable-energy support law, cited as a support scheme in plant data and legal warranties.',
    plain: 'EEG is cited as the legal basis of the dena Biogasregister, appears as a support-scheme value in plant data, and is listed alongside SDE++ and GSE in the legal pack’s no-double-claim warranty. It is not the Austrian EGG.',
    whyItMatters: 'A plant on EEG support has already used its attributes. Disclose it in the deal and warrant that nothing is claimed twice.',
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
    short: 'Spain’s specific-remuneration operating aid for renewable electricity, flagged in plant research.',
    plain: 'REER is Spain’s “retribución específica” for renewable electricity (RD 413/2014, RECORE calls). Plant research flags entity-level REER on some Spanish operators. You must confirm the aided electricity unit is not fed by the digester whose gas is sold; if it is, the gas has operating aid and fails the Dutch rule.',
    whyItMatters: 'It is the likeliest hidden operating aid on a Spanish plant. Check the plant dossier note before you rely on a Spanish origin.',
    appLinks: [{ label: 'Plants, plant dossier', route: '/plants' }],
    sources: [],
    related: ['operating-vs-investment-aid', 'prtr', 'enagas-gdo'],
  },
  {
    id: 'double-counting',
    term: 'Double counting (quota multiplier)',
    aliases: ['double counting', 'double-counting', 'single counting', 'multiplier'],
    short: 'A quota rule that counted advanced-feedstock fuel twice towards the target; Germany ended it for 2026.',
    plain: 'Germany applied double counting for advanced biofuels through compliance year 2025 and abolished it from 2026 under Drs 21/5530, so single counting applies; the promulgation date is unconfirmed in the app. The physical manure credit in the carbon calculation is unaffected. Dutch ERE has no multipliers.',
    whyItMatters: 'Check the compliance year before you price a German vintage: earlier years keep the multiplier, later ones do not.',
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
    short: 'Using the same GO or PoS in more than one scheme; one delivery can only count once.',
    plain: 'The same delivery cannot serve both the Dutch ERE and the green-gas obligation. The checklist row No double claim tests that the GO and PoS are not used elsewhere, for example in a Spanish quota, German THG or ETS1. The legal pack carries a warranty.',
    whyItMatters: 'A double claim voids the credit and can trigger a claw-back. Ask the seller to confirm in writing and keep the evidence.',
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
    short: 'Industrial sites under ETS1 can avoid surrendering allowances (EUAs) for compliant biomethane they burn.',
    plain: 'Installations under ETS1 can zero-rate sustainable biomethane in place of fossil gas, so they avoid EUAs for each MWh burned. It needs RED III sustainability compliance (a PoS, not a bare GO) and actual combustion displacing fossil gas. The EU ETS and Clients pages size the saving at the desk’s EUA mark.',
    whyItMatters: 'ETS1 sites are buyers with a hard saving per MWh. The EUA price is a desk mark, so check its age before quoting a client.',
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
    short: 'A separate EU carbon market for fuels used in buildings and road transport, paid by fuel distributors.',
    plain: 'ETS2 covers fuel combustion in buildings and road transport, and fuel distributors must surrender allowances. Sustainable biomethane carries an emission factor of zero. Its start was postponed, allowances are not yet issued, and only futures trade, so the desk’s ETS2 mark is an estimate, not a market print.',
    whyItMatters: 'Gas suppliers become buyers of zero-rated gas. The Dutch GGE documents can also zero-rate a supplier’s ETS2 liability, which the app shows as buyer-side upside, not in the seller’s netback.',
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
    short: 'EU rules setting declining GHG-intensity limits for energy used on ships calling at EU ports.',
    plain: 'Regulation (EU) 2023/1805 sets well-to-wake GHG-intensity limits that tighten over time for ships above a size threshold calling at EU ports. Low-CI Bio-LNG creates surplus that can cover other ships’ deficits through pooling, and a shortfall carries a statutory penalty per tonne of VLSFO-equivalent energy.',
    whyItMatters: 'Shipowners are buyers of bio-LNG compliance, and the penalty is the ceiling for what a pool surplus can fetch. Prices here are desk marks, not firm quotes.',
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
    short: 'Ships combine compliance balances so one ship’s surplus covers another’s deficit.',
    plain: 'Under FuelEU Article 21 two or more ships can pool compliance. Surplus from zero or deeply negative CI Bio-LNG offsets deficits from conventional vessels and avoids the penalty. The pool’s final composition has to be recorded in the FuelEU database by the annual deadline shown on the FuelEU page.',
    whyItMatters: 'A pool is how a small volume of low-CI gas monetises: the pool price sits below the penalty. The Pool matching tab shows deficits against available surplus.',
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
    short: 'The Dutch law creating the green-gas blending obligation, still awaiting its final vote when last checked.',
    plain: `Kamerstuk 36947 adds the green-gas blending obligation as chapter 9.9 of the Wet milieubeheer. It passed the Tweede Kamer on 6 October 2026 and the app notes the Senate vote as pending, with a target start in ${NL_GGE_START_YEAR}. A draft Besluit and Regeling hold the details and may still change. Origins are EU and EEA; the Dutch-only and manure-ban amendments were rejected.`,
    whyItMatters: 'It is not yet law, so every GGE deal in the app shows “not yet law” beside its verdict. Price it as an option, and recheck status on Citations and the Regulation check.',
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
    short: 'What a molecule is worth to the desk in a market, after costs of getting it there.',
    plain: 'Netback is certificate value plus gas (molecule) value minus costs, in euros per MWh, for each market. The ladder ranks markets by it. A row is theoretical if a gate blocks it, and incomplete if cost or gas inputs are missing, in which case the row lists what is missing.',
    whyItMatters: 'It decides which market to sell into. Compare rows only when they are complete and unblocked, and remember the numbers move with marks and cost inputs.',
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
    short: 'The itemised build of what a molecule earns in a market: certificate, gas, costs, margin and producer payable.',
    plain: 'The value stack breaks a market’s netback into certificate value, molecule (gas index) value, desk costs, desk margin and producer payable, with flags such as conditional, rank, missing inputs and held at bundle price. For clients, it also stacks where several regimes pay on the same MWh.',
    whyItMatters: 'It shows which line carries the value and which line is an estimate. Fix the weak line, not the headline number.',
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
    short: 'A broker’s traded price for certificate plus gas together, used to cap a modelled netback.',
    plain: 'For the German THG manure bundle, the broker run quotes certificates only, with the gas index added on top. The app stores the bundle quote as a mark per delivery year. When a bundle reference exists, the netback engine caps the modelled number at it and tells you, shown as held at bundle price.',
    whyItMatters: 'A traded bundle beats a model. If your modelled netback sits above the bundle, the realisable figure is the bundle.',
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
    short: 'The price gap between two gas hubs, such as Spain’s PVB and the Dutch TTF.',
    plain: 'A hub spread is the price difference between two gas hubs. In the Dutch GGE trade, structure A delivers the bundle at origin (PVB) with no spread; structure B delivers at TTF, so the trader carries the PVB–TTF spread. The spread is a desk input, and hub basis spreads to TTF are tabled on the Costs tab.',
    whyItMatters: 'It can erase the margin on a delivered-TTF sale. Set it deliberately and show which structure the ticket assumes.',
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
    short: 'The Dutch virtual gas hub, and the gas price index the desk prices molecules against.',
    plain: 'TTF is the Title Transfer Facility, the Dutch gas hub. The pricing desk carries a TTF month-ahead base gas mark, and hub basis spreads on the Costs tab are expressed against it. It feeds the molecule leg of every netback.',
    whyItMatters: 'A stale TTF mark moves every row on the ladder at once. Check its age on the pricing desk before trusting a netback.',
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
    short: 'Germany’s gas trading hub, listed on the Costs tab with its basis spread to TTF.',
    plain: 'THE, Trading Hub Europe, is the German hub. On the Costs tab it appears in the table of hub basis spreads to TTF, next to the Dutch TTF, French PEG, Spanish PVB, Italian PSV and others. THE is also named in the data-source directory as a German TSO and hub operator.',
    whyItMatters: 'The netback and logistics engines use the basis between the origin and target hub, so a German delivery carries a THE basis. Check the table before quoting delivered German gas.',
    appLinks: [{ label: 'Costs, hub basis spreads', route: '/pricing?tab=costs' }],
    sources: [],
    related: ['hub-spread', 'ttf', 'pvb', 'vtp'],
  },
  {
    id: 'vtp',
    term: 'VTP (Virtual Trading Point)',
    aliases: ['VTP', 'Virtual Trading Point'],
    short: 'A virtual gas trading point where physical delivery is settled on a wholesale index.',
    plain: 'In the EFET biomethane master agreement, physical gas is settled at the Virtual Trading Point against a wholesale day-ahead index such as TTF, while the green attributes (PoS and GO) are delivered separately. The deal term sheet and schedule name the VTP for the delivery.',
    whyItMatters: 'Where gas changes hands decides which hub price you carry. Fix the delivery point in the contract before you fix the price.',
    appLinks: [{ label: 'Trade Builder, legal pack', route: '/trade' }],
    sources: [],
    related: ['efet', 'ttf', 'hub-spread', 'pvb'],
  },
  {
    id: 'pvb',
    term: 'PVB (Spanish virtual balancing point)',
    aliases: ['PVB', 'Punto Virtual de Balance', 'PVB hub'],
    short: 'Spain’s virtual gas point, where Spanish gas and its GOs are traded.',
    plain: 'PVB, Punto Virtual de Balance, is the Spanish gas hub. Enagás GdO volumes are tied to the PVB hub, and the Costs tab carries a PVB basis spread to TTF. In the Dutch GGE trade, structure A is a bundle delivered at PVB.',
    whyItMatters: 'Delivery at PVB means the buyer needs access to the Spanish hub; delivery at TTF puts the PVB–TTF spread on you.',
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
    short: 'The standard master agreement that separates delivery of gas from delivery of its green attributes.',
    plain: 'The EFET Biomethane Master Agreement decouples physical gas delivery from the PoS and GO. If the seller delivers gas but not a valid PoS, the buyer can re-price the trade down to plain gas. There is a cure period for late PoS delivery and a termination event if it is not cured.',
    whyItMatters: 'PoS delivery is the seller’s risk: a failure turns a premium sale into a plain-gas sale plus replacement cost. The legal pack includes a draft EFET confirmation.',
    appLinks: [{ label: 'Trade Builder, legal pack', route: '/trade' }],
    sources: [],
    related: ['pos', 'vtp', 'ttf', 'legal-pack'],
  },
  {
    id: 'desk-margin',
    term: 'Desk margin',
    aliases: ['margin', 'desk P&L', 'trading margin'],
    short: 'What the desk keeps per MWh on a deal, after costs and the producer’s share.',
    plain: 'Desk margin is the realised commercial margin per MWh. Multiplied by the deal volume it gives the deal P&L. It is a desk setting and an output of the netback, not a market price. The Corporate orders page takes a margin per quote.',
    whyItMatters: 'Margin is what is left after you pay the producer and the costs. A thin margin is a signal to re-check marks and costs, not to trust the headline netback.',
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
    short: 'What the desk pays the plant per MWh for gas and attributes.',
    plain: 'Producer payable is the amount paid to the producer per MWh for gas and attributes. In the brief’s value stack it equals the net netback minus the desk margin, so it is the number you can offer a plant and still hit your margin.',
    whyItMatters: 'It is your sourcing ceiling. Offer above it and the margin disappears; if the plant wants more, the route has to change.',
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
    short: 'The obligation period a certificate counts for; deadlines, buy-outs and rules are set per year.',
    plain: `Obligations run per compliance year, and buy-outs, targets and counting rules are set for each. For the Dutch GGE, gas delivered in a year can be booked until ${BOOKING_DEADLINE} of the next year, and a GO must still be valid at booking, expiring ${NL_GGE_GO_VALIDITY_MONTHS} months after its production period ends.`,
    whyItMatters: 'Vintage decides which rules and prices apply to a certificate. The booking-deadline row in the checklist works out the effective deadline from the GO’s validity.',
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
    short: 'Carrying surplus compliance over into the next period.',
    plain: `For the Dutch GGE, a supplier may bank up to ${NL_GGE_BANKING_CAP_PCT}% of its own written-off obligation, none if it used the buy-out, and cannot borrow from the future. For FuelEU, banking, borrowing or a pool’s final composition must be recorded in the FuelEU database by the annual deadline.`,
    whyItMatters: 'Banking limits how far a buyer can smooth demand across years, which caps how much early supply it will take. Ask how much of the obligation is already covered.',
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
    short: 'The desk’s current price for a market, with bid, offer, mid and where it came from.',
    plain: `Every priced figure in the app reads a mark set on the pricing desk, with a source and an age. Green is within ${STALE_MARK_DAYS} days, amber within ${VERY_STALE_MARK_DAYS}, red older. Sources are broker, manual or simulated. The Market board on the brief lists them all.`,
    whyItMatters: 'A mark is only as good as its age and source. Check both before you quote, and update stale ones on the pricing desk.',
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
    short: 'A placeholder price the app generated until a broker run or manual price replaces it.',
    plain: 'Simulated marks are generated by the app, labelled simulated seed, and counted separately from broker and manual marks on the pricing desk. They keep every screen working before live data exists. They are never market prints, and the ETS2 mark in particular is a desk estimate.',
    whyItMatters: 'A trade priced off a simulated mark is a model, not a quote. Replace the marks that matter with a broker run before you show a number to a client.',
    appLinks: [{ label: 'Pricing desk, Market prices', route: '/pricing' }],
    sources: [],
    related: ['mark', 'broker-run', 'open-item'],
  },
  {
    id: 'broker-run',
    term: 'Broker run',
    aliases: ['broker sheet', 'broker quotes', 'paste broker run', 'OTC broker run'],
    short: 'A broker’s sheet of bids and offers, pasted into the pricing desk and applied to marks.',
    plain: 'Paste a broker run (for example from STX, ACT or Marex) into Paste Broker Run and the app parses bids and offers and applies them to marks. Broker rows are indications, not firm tradeable prices, and the pricing desk also holds research and modelled reference rows that are not tradeable.',
    whyItMatters: 'It is the fastest way to replace simulated marks with real levels. The run date is shown beside the broker quotes; note it before you rely on a level.',
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
    short: 'A commercial judgement the engines use that is not a statute, a physical constant or a live mark.',
    plain: 'Each desk assumption has a unit, a source and a basis: market mark, desk estimate or desk policy. Defaults are never silently changed and a reset returns to the shown value. Changes apply straight away across the app and are saved in this browser only.',
    whyItMatters: 'These are the numbers you can be challenged on. Review the ones marked OPEN, and know that a change moves every screen.',
    appLinks: [{ label: 'Pricing desk, Desk assumptions', route: '/pricing?tab=assumptions' }],
    sources: [],
    related: ['open-item', 'mark', 'energy-basis'],
  },
  {
    id: 'open-item',
    term: 'OPEN item (OPEN chip)',
    aliases: ['OPEN', 'OPEN chip', 'open item', 'open items', 'unconfirmed input'],
    short: 'An input whose source does not settle it yet; the default is a working assumption to check.',
    plain: 'An assumption whose source starts with OPEN is unconfirmed, and shows an OPEN chip. Examples in the Dutch GGE trade: the HHV to LHV factor, the GHG threshold category, the gas leg between structures A and B, and the simulated GGE mark. Check them before you price a deal.',
    whyItMatters: 'An OPEN item can move a price or flip a gate. Do not hide it in a quote; carry it as a condition.',
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
    short: 'A rule check the app runs on a route before it counts as tradeable.',
    plain: 'The gates are scheme recognition, UDB recording, chain of custody, feedstock category, GHG threshold, market-specific rules, registry transfer and cross-border PoS. Each gives PASS, CONDITIONAL, HARD_BLOCK, UNRESOLVED or UNKNOWN, and they roll up to an overall verdict for the route.',
    whyItMatters: 'Blocked markets appear on the ladder only as theoretical. Conditional ones need an open item fixed before you promise delivery.',
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
    short: 'The GO, PoS, claims and structure records entered on the Trade Builder, which the checklist reads.',
    plain: 'The custody pack holds the GO record, the PoS record with its per-step CI breakdown, the claims (not used elsewhere, PRTR grant, own and counterparty certification), the deal structure and the planned booking date. The chain-of-custody checklist reads it. You can fill the PoS from pasted text or a file.',
    whyItMatters: 'It is the evidence behind the checklist. An empty field is a TODO, not a pass, so fill it from the seller’s real documents.',
    appLinks: [{ label: 'Trade Builder, product step', route: '/trade' }],
    sources: [],
    related: ['chain-of-custody', 'go', 'pos', 'go-pos-bundle', 'legal-pack'],
  },
  {
    id: 'legal-pack',
    term: 'Legal pack',
    aliases: ['term sheet', 'legal package', 'regulatory pre-screen'],
    short: 'The five deal documents the Trade Builder drafts: term sheet, EFET confirmation, deal record, UDB worksheet and pre-screen.',
    plain: 'The legal pack contains an indicative term sheet (PDF), a draft EFET confirmation (PDF), a deal record (CSV and JSON), a UDB worksheet (XML) and a regulatory pre-screen (PDF). They are indicative drafts built from the deal on screen, not signed documents.',
    whyItMatters: 'It carries the warranties that matter on a compliance sale: pairing, no operating aid, no double claim and claw-back cover. Read it before anything goes to a counterparty.',
    appLinks: [{ label: 'Trade Builder, deal package', route: '/trade' }],
    sources: [],
    related: ['efet', 'custody-pack', 'double-claim', 'nea'],
  },
  {
    id: 'corridor',
    term: 'Corridor (route verdict)',
    aliases: ['corridor', 'route', 'route verdict', 'ready to trade', 'review needed'],
    short: 'An origin-to-destination country route on the map, with a verdict on whether a GO or PoS trade works.',
    plain: 'A corridor is a route between two countries. The map shows whether it is ready to trade, needs review or a workaround, or is closed or domestic only, in GO mode (certificate only) or PoS mode (physical gas under mass balance). It also shows the distance and number of hops.',
    whyItMatters: 'A route verdict is the first filter on any idea. A route that is not ready to trade needs the open condition resolved before it is an offer.',
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
    short: 'Finding and contracting the plants that supply an order.',
    plain: 'Origination turns an order into supply. The Origination page takes the order specs, scans the plants, shows the route verdict and cost breakdown, and ends in an indicative term sheet with a link to structure the deal in the Trade Builder. The pipeline page lists producers with contact and due-diligence status.',
    whyItMatters: 'It is where a buyer’s request becomes a priced, sourced route. Start here when you have a client need rather than a plant.',
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
    short: 'A buyer’s request to price a defined trade; Origination offers presets for the common ones.',
    plain: 'On Origination, quick RFQ presets fill the order form with a standard buyer request, such as a German THG order with animal manure or a French CPB order with agricultural residues. You can then edit the specs and scan plants against them.',
    whyItMatters: 'Presets are a starting point, not a client’s real terms. Replace them with what the buyer actually asked for before you price.',
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
