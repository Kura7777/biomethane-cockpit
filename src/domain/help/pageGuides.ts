/**
 * Page guides — what each screen is for, how to read it, and what a trader does there.
 *
 * Plain data keyed by canonical route. Aliases (`/` → `/brief`, `/commercial` → `/sourcing`) resolve
 * through getPageGuide. Written from the screens as they run, not from memory: every section name
 * below is a heading, tab or button a trader sees. No prices or other changing numbers; where a
 * value matters the guide points to where it lives (usually #/pricing). Terms in `keyTerms` are
 * glossary ids (glossary.ts), checked by pageGuides.test.ts.
 */

export interface PageGuideSection {
  section: string;
  /** 50 words or fewer. */
  text: string;
}

export interface PageGuideTask {
  question: string;
  /** At most 5 steps, each 20 words or fewer. */
  steps: string[];
  link?: string;
}

export interface PageGuide {
  route: string;
  title: string;
  /** What question this page answers, 40 words or fewer. */
  purpose: string;
  howToRead: PageGuideSection[];
  commonTasks: PageGuideTask[];
  keyTerms: string[];
  /** 3 to 5 questions phrased as a user would ask them. */
  suggestedQuestions: string[];
}

/** Routes that open another route's screen, so they share its guide. */
export const GUIDE_ROUTE_ALIASES: Readonly<Record<string, string>> = {
  '/': '/brief',
  '/commercial': '/sourcing',
  '/marks': '/pricing',
  '/provenance': '/data-sources',
};

export const PAGE_GUIDES: PageGuide[] = [
  {
    route: '/brief',
    title: 'Morning brief',
    purpose: 'What is the market doing today, and where on my desk is the best money? A one-page snapshot of marks, the netback ladder, routes and what needs updating.',
    howToRead: [
      { section: 'Marks strip and KPI tiles', text: 'The strip scrolls the desk’s mid mark for each market. The tiles show the top net netback, the German THG and ETS1 marks, the FuelEU pool print, how many marks are fresh, and plants tracked.' },
      { section: 'Netback ladder', text: 'Each benchmark consignment is priced into every active market through the eligibility gates. Bars are euros per MWh net to the desk. Click one for its value stack; tick the box to show blocked markets as theoretical.' },
      { section: 'Market board', text: 'Every mark with its source and age: green is fresh, amber older, red stale. Filter by compliance, voluntary, emerging, over a week or estimates. Click a row to edit it on the pricing desk.' },
      { section: 'FuelEU, Broker book, Routes, Supply, Regulatory watch', text: 'Jump chips take you to the FuelEU pool print, the broker order book, tradeable routes on today’s marks, plant supply by country, and the regulatory watch with a link to Regulation check.' },
    ],
    commonTasks: [
      {
        question: 'Which market is worth most for my gas today?',
        steps: [
          'Open the Netback ladder and pick a benchmark consignment.',
          'Read the top bars; ignore blocked markets unless you tick the theoretical box.',
          'Click a bar to open its value stack.',
          'Choose Structure this deal to continue in the Trade Builder.',
        ],
        link: '/trade',
      },
      {
        question: 'Are my marks fresh enough to trust?',
        steps: [
          'Check the Fresh marks tile for how many are inside a week.',
          'Open the Market board and pick the Over a week filter.',
          'Click a stale row to edit it.',
          'Choose Update marks to paste a broker run.',
        ],
        link: '/pricing',
      },
    ],
    keyTerms: ['netback', 'value-stack', 'mark', 'simulated-mark', 'broker-run', 'eligibility-gate', 'bundle-price'],
    suggestedQuestions: [
      'What does the netback ladder show?',
      'Why is a market marked blocked or theoretical?',
      'What does held at bundle price mean?',
      'How old is too old for a mark?',
      'Where do I update the marks behind these numbers?',
    ],
  },
  {
    route: '/sourcing',
    title: 'Origination',
    purpose: 'Given a buyer’s order, which plants can supply it, by which route and at what cost? Four steps from order intake to an indicative term sheet.',
    howToRead: [
      { section: '1. Order intake', text: 'Enter the buyer’s destination market, volume and feedstock, or start from a quick RFQ preset. These specs set what the plant scan will test.' },
      { section: '2. Sourced plants', text: 'Scans the plant census against your order. Filter by country, read capacity and gate prices, and pick the production asset you want to price.' },
      { section: '3. Route and costs', text: 'The route verdict and cost breakdown. Every price comes from the pricing desk marks or your cost inputs, labelled with its source. Review needed means an eligibility condition is open.' },
      { section: '4. Deal summary', text: 'An indicative term sheet priced off the desk’s marks, each tagged with source and date. Nothing here is a firm price or a cleared route.' },
    ],
    commonTasks: [
      {
        question: 'How do I turn a client request into a sourced route?',
        steps: [
          'Pick a quick RFQ preset or enter the destination market and volume.',
          'Move to Sourced plants and choose a facility.',
          'Check the route verdict and cost breakdown.',
          'On Deal summary, choose Open in Trade Builder.',
        ],
      },
      {
        question: 'Why does a route say Review needed?',
        steps: [
          'Read the route verdict on step 3.',
          'Note the open eligibility condition it lists.',
          'Open the Trade Builder to fix the field behind it.',
        ],
        link: '/trade',
      },
    ],
    keyTerms: ['origination', 'rfq', 'netback', 'producer-payable', 'corridor', 'eligibility-gate'],
    suggestedQuestions: [
      'How do I price an order from a client?',
      'What does Review needed mean on a route?',
      'Where do the prices on this page come from?',
      'What is the difference between Origination and the pipeline page?',
    ],
  },
  {
    route: '/origination',
    title: 'Origination pipeline',
    purpose: 'Which producers can I call, and how far has each one been checked? A directory of plants with operator, feedstock, grid and contact confidence, and a one-click start to a deal.',
    howToRead: [
      { section: 'Top filters', text: 'Choose a country, a feedstock, or a contract and expiry status. The count line shows how many assets match your filters.' },
      { section: 'Summary tiles', text: 'Active assets monitored, plants near the end of their support or tariff, high-margin manure sites, and an indicative netback range from the broker mark.' },
      { section: 'Plant table', text: 'Each row shows the plant, operating entity and registration, feedstock and CI, capacity, grid operator, contact, and a confidence note on due diligence. Census contacts are unverified leads.' },
      { section: 'Actions', text: 'Export the call sheet as CSV, mark outreach, or trade a plant to open the Trade Builder with it already chosen.' },
    ],
    commonTasks: [
      {
        question: 'How do I build a call list for one country?',
        steps: [
          'Pick the country chip.',
          'Filter by feedstock, such as manure, if you want negative-CI supply.',
          'Check the due-diligence column before you call.',
          'Export the call sheet as CSV.',
        ],
      },
    ],
    keyTerms: ['origination', 'manure-credit', 'carbon-intensity', 'operating-vs-investment-aid'],
    suggestedQuestions: [
      'How reliable are the contacts in this list?',
      'What does the confidence column mean?',
      'How do I start a deal from a plant?',
      'Why do some plants show an unverified registration?',
    ],
  },
  {
    route: '/plants',
    title: 'Plants',
    purpose: 'What plants exist, where, how big, and where could each one’s gas go? The European biomethane census with filters, a plant dossier and a route shortcut.',
    howToRead: [
      { section: 'Summary tiles', text: 'Census counts, total supply in view, the share of supply with a negative feedstock-default CI, contactable leads, and register-confirmed entities. CI here is a feedstock default, not a certified figure.' },
      { section: 'Country and feedstock filters', text: 'Narrow by country, then by manure, food waste, crops, sludge or landfill. More filters add scale and contact status.' },
      { section: 'Plant table', text: 'Plant, operator, output, feedstock and CI, and contact status. Census emails and phones can be unverified or placeholders, so verify the operator in the official register before outreach.' },
      { section: 'Plant actions', text: 'Where can this gas go opens route options, Price a deal starts the Trade Builder, and Full dossier shows the research notes on aid, certification and ownership.' },
    ],
    commonTasks: [
      {
        question: 'Where could this plant’s gas be sold?',
        steps: [
          'Find the plant with the country and feedstock filters.',
          'Choose Where can this gas go.',
          'Read the route options and their verdicts.',
          'Choose Price a deal to continue.',
        ],
      },
      {
        question: 'How do I check a plant for operating aid?',
        steps: [
          'Open the plant’s Full dossier.',
          'Read the aid and certification notes.',
          'Treat any entity-level support flag as a question for the seller.',
        ],
      },
    ],
    keyTerms: ['carbon-intensity', 'annex-ix', 'operating-vs-investment-aid', 'reer', 'prtr', 'sde-plus-plus'],
    suggestedQuestions: [
      'Are the plant CI figures certified?',
      'How do I find manure plants in one country?',
      'What does unverified lead mean?',
      'Where do I see whether a plant gets support?',
    ],
  },
  {
    route: '/registries',
    title: 'Registries and cross-border routes',
    purpose: 'Can a GO or PoS actually move from this country’s registry to that market? Registry hubs, a route checker and production statistics, showing only what the sources support.',
    howToRead: [
      { section: 'Intro panel', text: 'Explains GO versus PoS, notes that the Union Database for gas is not live, and shows ERGaR hub volume, importers and exporters with their source and access date.' },
      { section: 'Registry directory', text: 'Per country: the registry, what it issues, whether it is on the AIB hub, on ERGaR, UDB status, the cross-border route and a verification level such as verified or partial.' },
      { section: 'Route checker', text: 'Pick an origin registry and a destination. It shows what the sources support, including known blockers, and never invents a route.' },
      { section: 'Production statistics and Live data', text: 'Production figures by country, and a live feed such as Danish injection when its source is available.' },
    ],
    commonTasks: [
      {
        question: 'Can I move a GO from country A to a buyer in country B?',
        steps: [
          'Open Route checker.',
          'Choose the origin registry and the destination.',
          'Read the route, its verification level and any blocker.',
          'Treat partial or unverified routes as open items.',
        ],
      },
    ],
    keyTerms: ['go', 'pos', 'aib-hub', 'ergar', 'udb', 'verticer', 'enagas-gdo', 'dena-biogasregister'],
    suggestedQuestions: [
      'What is the difference between AIB and ERGaR?',
      'Why does a route show partial?',
      'Is the Union Database live?',
      'Do I need a GO or a PoS for a quota market?',
    ],
  },
  {
    route: '/map',
    title: 'Compliance and logistics map',
    purpose: 'Which origin to which destination can I trade, by GO or by physical PoS, and what does the route involve? A corridor map with verdicts, filters and a delivery playbook.',
    howToRead: [
      { section: 'Origin and target', text: 'Click a country on the map or the rail to set an origin or a target; the map options panel switches what a click sets.' },
      { section: 'Verdict counts', text: 'Ready to trade, Review needed or workaround, Closed or domestic only, and Not researched, counted for the selected origin across all destinations.' },
      { section: 'Trade mode', text: 'All trades, Certificates (GO), or Compliance quota (PoS). GO moves a certificate registry to registry with no gas moving; PoS is physical gas under mass balance.' },
      { section: 'Active corridor', text: 'Shows the chosen route with distance and hops, then Simulate in Trade Builder and Open delivery playbook. The view toggle can switch to who accepts imports.' },
    ],
    commonTasks: [
      {
        question: 'Is there a trade route from country A to B?',
        steps: [
          'Click country A to set the origin and country B as target.',
          'Switch the trade mode to GO or PoS as needed.',
          'Read the corridor verdict and its conditions.',
          'Choose Simulate in Trade Builder.',
        ],
        link: '/trade',
      },
      {
        question: 'Which countries accept imports from my origin?',
        steps: [
          'Open Map options.',
          'Switch the view to Who accepts imports.',
          'Read the verdict colours per destination.',
        ],
      },
    ],
    keyTerms: ['corridor', 'go', 'pos', 'mass-balance', 'book-and-claim', 'aib-hub', 'segregation'],
    suggestedQuestions: [
      'What is the difference between GO mode and PoS mode?',
      'What does Review needed mean on a corridor?',
      'Why is a destination closed or domestic only?',
      'How do I send a route to the Trade Builder?',
    ],
  },
  {
    route: '/trade',
    title: 'Trade Builder',
    purpose: 'Is this deal tradeable, what is it worth, and what documents back it? Build one consignment through product, schedule, market audit, economics and a deal package, with a live chain-of-custody checklist.',
    howToRead: [
      { section: 'Header and deal views', text: 'Shows the deal number, origin, feedstock, netback, P&L and the chain-of-custody verdict. Deal flow walks the steps; Desk grid shows them side by side.' },
      { section: 'Product', text: 'Origin, feedstock, certification scheme, chain of custody, UDB and PoS status, and carbon intensity with the GHG saving against the comparator. You can fill the PoS from pasted text or a file.' },
      { section: 'Custody pack and checklist', text: 'The GO, PoS, claims, deal structure and booking date feed one checklist. Each row is PASS, FAIL, WARN or TODO; PASS — not yet law means all rows clear but the obligation is not yet law. Open rows link to the fix.' },
      { section: 'GO MWh versus PoS MWh', text: 'Each document states its own energy. For paired markets they must cover the same delivery after converting the GO’s energy basis to lower heating value; a mismatch fails the GO and PoS pairing row.' },
      { section: 'Market audit, Economics, Deal package', text: 'The audit groups markets by quota type and runs the gates. Economics shows the waterfall to desk margin and producer payable. The legal pack has five documents; Save to blotter stores the deal.' },
    ],
    commonTasks: [
      {
        question: 'Why is my chain-of-custody verdict not a clean PASS?',
        steps: [
          'Open the checklist from Product and read the FAIL, WARN and TODO rows.',
          'Choose Fix it or Enter it on a row to jump to its field.',
          'Fill the GO and PoS records from the seller’s documents.',
          'Recheck the verdict; PASS — not yet law is the best a pending obligation can show.',
        ],
      },
      {
        question: 'How do I price a Dutch green-gas deal?',
        steps: [
          'Pick an EU or EEA origin, such as Spain, and its feedstock on Product.',
          'Enter the GO and PoS records and their energy bases in the custody pack.',
          'Choose deal structure A or B in the custody pack.',
          'Check the OPEN items under Desk assumptions on the pricing desk before quoting.',
        ],
        link: '/pricing?tab=assumptions',
      },
      {
        question: 'How do I save a deal?',
        steps: [
          'Finish the product, schedule and market steps.',
          'Review the legal pack documents.',
          'Choose Save to blotter.',
        ],
        link: '/deals',
      },
    ],
    keyTerms: ['custody-pack', 'chain-of-custody', 'go-pos-bundle', 'energy-basis', 'eligibility-gate', 'legal-pack', 'gge', 'netback', 'open-item'],
    suggestedQuestions: [
      'What do PASS, FAIL, WARN and TODO mean on the checklist?',
      'What does PASS — not yet law mean?',
      'What is the difference between GO MWh and PoS MWh?',
      'What is in the legal pack?',
      'Why can’t I sell a GO without its PoS?',
    ],
  },
  {
    route: '/fueleu-shipping',
    title: 'FuelEU Maritime',
    purpose: 'Which shipping groups are short of compliance, how much is the deficit worth, and what could a bio-LNG or pool deal save them? A directory, vessel book, pool matching and calculators.',
    howToRead: [
      { section: 'Header', text: 'The reporting period, the pooling deadline, the pool mark with its age and simulated label, and the latest traded print as a cross-check.' },
      { section: 'Directory', text: 'Shipping groups with vessels, in-scope CO₂, the compliance balance, the penalty-equivalent and the saving from pooling. Filter by segment, entity type or LNG-capable; add a group to a pool or build a term sheet.' },
      { section: 'LNG vessel book and Pool matching', text: 'The LNG-capable vessel list, and an indicative match of the biggest deficits with available surplus at the desk’s offer and bid. Nothing there is a filed pool.' },
      { section: 'Tools', text: 'Vessel archetype calculator for a deficit and the bio-LNG needed, and a comparison of commercial pathways such as paying the penalty, pooling or buying bio-LNG.' },
    ],
    commonTasks: [
      {
        question: 'How big is a shipping group’s deficit and what could we sell it?',
        steps: [
          'Find the group in the Directory.',
          'Read its balance, penalty-equivalent and saving.',
          'Choose Build term sheet or Add to pool.',
        ],
      },
      {
        question: 'What would bio-LNG do for a vessel?',
        steps: [
          'Open Tools and choose a vessel archetype.',
          'Enter the fuel burn and regulation inputs.',
          'Read the summary: penalty, bio-LNG needed and client options.',
        ],
      },
    ],
    keyTerms: ['fueleu-maritime', 'fueleu-pooling', 'buy-out', 'banking', 'mark'],
    suggestedQuestions: [
      'What is a FuelEU pool?',
      'Why is the pool mark labelled stale?',
      'How is the penalty calculated?',
      'What is the difference between the pool mark and the traded price?',
    ],
  },
  {
    route: '/ets2',
    title: 'EU ETS',
    purpose: 'Which industrial sites and gas suppliers pay for carbon under the EU ETS, and what would compliant biomethane save them? ETS1 installations, ETS2 gas suppliers, a calculator and country view.',
    howToRead: [
      { section: 'Header and marks', text: 'The EUA desk mark, the simulated ETS2 mark, the days to the ETS2 start, and how much compliant biomethane saves per MWh as invoiced and on a net-calorific basis.' },
      { section: 'ETS1 installations', text: 'Companies or sites with verified emissions, the gross allowance bill before free allocation, a fit rating for switching to biomethane, and the first-deal saving. Filter by country, sector or fit.' },
      { section: 'ETS2 gas suppliers', text: 'Regulated suppliers and end users with market share, gas volume and ETS2 cost at the desk mark. Pick one to send its volume to the calculator.' },
      { section: 'ETS2 calculator and countries', text: 'The calculator needs your client’s own inputs: gas use, volume basis, price scenario, pass-through and share switched. The ETS2 countries tab gives the country view.' },
    ],
    commonTasks: [
      {
        question: 'What would biomethane save an industrial client?',
        steps: [
          'Find the company in ETS1 installations.',
          'Read its verified emissions and gross bill.',
          'Check the first-deal saving at the desk EUA mark.',
          'Confirm the PoS and fuel-switch requirements with the client.',
        ],
      },
      {
        question: 'How exposed is a gas supplier to ETS2?',
        steps: [
          'Open ETS2 gas suppliers and find the supplier.',
          'Pick it to send its volume to the calculator.',
          'Enter the price scenario and pass-through.',
        ],
      },
    ],
    keyTerms: ['ets1-zero-rating', 'ets2', 'pos', 'mark', 'simulated-mark'],
    suggestedQuestions: [
      'What is ETS1 zero-rating?',
      'When does ETS2 start and is it priced?',
      'Why does an ETS1 saving need a PoS and not a GO?',
      'What does the fit rating mean?',
    ],
  },
  {
    route: '/clients',
    title: 'Clients',
    purpose: 'Which companies are exposed to which regulation, how much is it worth at today’s marks, and what could we sell them? One row per company across FuelEU, ETS maritime, ETS1 and ETS2.',
    howToRead: [
      { section: 'Summary tiles', text: 'Companies shown, how many have a value stack with two or more regimes paying on the same MWh, total biomethane potential (a ceiling, not a deal size), and total cost now.' },
      { section: 'Company by regulation table', text: 'Annual euros at desk marks per regime. Sort by any header. Footnote symbols flag an upper bound, last year’s data or a deficit with no pool mark.' },
      { section: 'Filters', text: 'Country, contact status, and exposure to FuelEU, ETS maritime, ETS1, ETS2, two or more sectors, or a value stack. Export CSV downloads the current view.' },
      { section: 'Company page', text: 'Open a company for exposure by regulation with its basis, a ranked list of plays with what to sell and why it works, and the status you track.' },
    ],
    commonTasks: [
      {
        question: 'Who should I call first?',
        steps: [
          'Sort by biomethane potential or euros per MWh.',
          'Filter to a value stack for companies where several regimes pay.',
          'Open the company and read the best play.',
          'Set its contact status.',
        ],
      },
    ],
    keyTerms: ['value-stack', 'ets1-zero-rating', 'ets2', 'fueleu-maritime', 'mark'],
    suggestedQuestions: [
      'What does biomethane potential mean?',
      'Why is potential called a ceiling?',
      'What is a value stack for a client?',
      'What do the footnote symbols mean?',
    ],
  },
  {
    route: '/corporate',
    title: 'Corporate orders',
    purpose: 'What is the cheapest way to deliver a corporate client’s biomethane request, and what does each requirement cost? It prices a voluntary GO or PoS order against the broker book.',
    howToRead: [
      { section: 'Client request', text: 'Nothing is defaulted: blank means not required. Set the client, volume, product, claim type, registry countries, vintage, maximum CI, unsubsidised and crop exclusions, transfer cost and desk margin.' },
      { section: 'Cheapest to deliver and offer', text: 'The cheapest matching offer, the number of matching offers, and your offer per MWh once volume, transfer cost and margin are set; the annual contract value and gross margin follow.' },
      { section: 'What each requirement costs', text: 'The cheapest-to-deliver price as each requirement is added, so you can show a client what a stricter ask costs. Each row shows the matching offers and the extra cost.' },
      { section: 'Supply stack and hand off', text: 'The broker-book offers that meet every requirement, cheapest first. Source it, and the quote draft and hand off section carry the order on.' },
    ],
    commonTasks: [
      {
        question: 'How do I quote a corporate client?',
        steps: [
          'Fill the client request, leaving unknowns blank.',
          'Enter volume, transfer cost and your desk margin.',
          'Read the offer per MWh and contract value.',
          'Use the quote draft and hand off.',
        ],
      },
    ],
    keyTerms: ['go', 'pos', 'book-and-claim', 'desk-margin', 'broker-run', 'ets1-zero-rating'],
    suggestedQuestions: [
      'Which product does a client need for ETS1?',
      'What does cheapest to deliver mean?',
      'Why does adding a requirement raise the price?',
      'Where do the offers in the supply stack come from?',
    ],
  },
  {
    route: '/pricing',
    title: 'Pricing desk',
    purpose: 'What is each market worth today, what do deals cost, and what is the desk assuming? Every price, cost and judgement in the app is set here.',
    howToRead: [
      { section: 'Marks versus costs versus desk assumptions', text: 'Market prices are the marks. Costs are the per-deal deductions and cost tables. Desk assumptions are commercial judgements with a source and basis. Statutory values are read-only under Regulatory constants.' },
      { section: 'Source chips', text: 'The header counts broker, manual and simulated marks. Simulated marks are placeholders generated by the app; they are not market prints. Each mark shows its source and age.' },
      { section: 'Market prices', text: 'The master order book: bid, offer and mark per market and vintage, filtered by compliance or voluntary, source and hub. Paste Broker Run parses a broker sheet; Use as mark promotes a row.' },
      { section: 'OPEN chips', text: 'An OPEN chip marks an unconfirmed input, such as the energy-basis factor for Spanish GOs. Its default is a working assumption; check it before you price a deal.' },
    ],
    commonTasks: [
      {
        question: 'How do I update marks from a broker run?',
        steps: [
          'Choose Paste Broker Run on Market prices.',
          'Paste the broker’s text into the box.',
          'Check lines detected and markets matched.',
          'Choose Parse and write marks, then check source chips and ages.',
        ],
      },
      {
        question: 'Where do I change a cost or an assumption?',
        steps: [
          'Open the Costs tab for deal costs and cost tables.',
          'Open Desk assumptions for commercial judgements.',
          'Edit the value; it applies everywhere at once.',
          'Reset a value to return to its default.',
        ],
      },
    ],
    keyTerms: ['mark', 'simulated-mark', 'broker-run', 'desk-assumption', 'open-item', 'hub-spread', 'buy-out', 'energy-basis'],
    suggestedQuestions: [
      'What is the difference between a mark, a cost and a desk assumption?',
      'What does a simulated mark mean?',
      'What does the OPEN chip mean?',
      'How do I update a stale mark?',
      'Where are the statutory constants?',
    ],
  },
  {
    route: '/deals',
    title: 'Deal blotter',
    purpose: 'What deals have I saved, in what state, and what are they worth now versus when I saved them? Saved deals as a snapshot with status, notes and re-pricing.',
    howToRead: [
      { section: 'Snapshot rule', text: 'Prices are as saved: each deal is the snapshot from when you saved it, not today’s market. Re-price now compares it with the current marks and costs without changing the saved deal.' },
      { section: 'Status filters', text: 'All, Indicative, Quoted, Agreed, Transferred and Dead, with counts. Change a deal’s status in its row and add a note to record why.' },
      { section: 'Totals', text: 'Showing, total volume and total deal P&L for the deals in view. Each row shows saved date, volume, netback, desk margin and the mark it was priced off.' },
      { section: 'Row actions', text: 'Open reloads the deal in the Trade Builder. You can also add a note or delete the deal after confirming.' },
    ],
    commonTasks: [
      {
        question: 'How do I record that a deal moved to quoted or agreed?',
        steps: [
          'Find the deal in the list.',
          'Change its status in the row.',
          'Add a short note and confirm.',
        ],
      },
      {
        question: 'Is a saved deal still in the money?',
        steps: [
          'Choose Re-price now on the row.',
          'Compare the new netback with the saved one.',
          'Hide the re-price when done.',
        ],
      },
    ],
    keyTerms: ['netback', 'desk-margin', 'mark', 'producer-payable'],
    suggestedQuestions: [
      'Why does the blotter show old prices?',
      'What do the statuses mean?',
      'How do I save a deal?',
      'What does re-price now do?',
    ],
  },
  {
    route: '/data-sources',
    title: 'Data sources',
    purpose: 'Where does each figure in the app come from, how often is it updated, and what does it not cover? A directory of sources with authority, cadence and provenance tier.',
    howToRead: [
      { section: 'Category filter', text: 'All, Plants, Pricing, Registries or Logistics narrows the directory to one kind of source.' },
      { section: 'Source table', text: 'Each row names the source, its authority, its category, coverage, update cadence and provenance tier, such as statutory directive, TSO official, industry census or broker reported.' },
      { section: 'Not covered', text: 'Entries list the fields a source does not provide, so you can see what the app is filling in with a desk estimate.' },
    ],
    commonTasks: [
      {
        question: 'Where does this number come from?',
        steps: [
          'Filter to the source category.',
          'Find the source and read its authority and cadence.',
          'Check the provenance tier and the fields it does not cover.',
        ],
      },
    ],
    keyTerms: ['mark', 'desk-assumption', 'broker-run', 'simulated-mark'],
    suggestedQuestions: [
      'How do I know where a figure came from?',
      'What are the provenance tiers?',
      'How often is the plant census updated?',
      'Which sources are official and which are broker reported?',
    ],
  },
  {
    route: '/citations',
    title: 'Citations',
    purpose: 'What law or rule stands behind a number or a gate? A register of statutory citations by jurisdiction with the desk rule, penalties, cross-references and official links.',
    howToRead: [
      { section: 'Statutory register', text: 'The left list holds every citation by jurisdiction and category: EU directives, national quota laws, certification schemes and glossary methodology notes. Search it by title, article or market.' },
      { section: 'Document view', text: 'Each citation has an executive overview, a golden trading desk rule, key statutory excerpts, the compliance gates it drives, penalties and caps, and related markets.' },
      { section: 'Official links', text: 'Every citation links to its official text. Use Copy citation to paste a reference into a term sheet or an email.' },
    ],
    commonTasks: [
      {
        question: 'What is the legal basis for a rule the app applies?',
        steps: [
          'Search the register for the law, article or market.',
          'Open the citation and read the desk rule.',
          'Follow the official link to confirm the text.',
        ],
      },
    ],
    keyTerms: ['red-iii', 'nl-green-gas-law', 'thg-quote', 'fueleu-maritime', 'eligibility-gate'],
    suggestedQuestions: [
      'Which law sets the German THG quota?',
      'What is the status of the Dutch green-gas law?',
      'How do I cite a rule in a term sheet?',
      'Which citation drives a given gate?',
    ],
  },
  {
    route: '/connectors',
    title: 'Data connectors',
    purpose: 'Which live data feeds can be plugged in, and which are running on baseline data? A hub for pricing feeds, grid telemetry and registry connections, plus the broker run parser.',
    howToRead: [
      { section: 'Active feeds', text: 'A count of live feeds against the total and the telemetry status. Most connectors show MOCK or BASELINE until credentials are added.' },
      { section: 'Connector cards', text: 'Each card names the provider, what it supplies and whether it is a live feed or baseline. Enter an endpoint and key, then Test Connection and Save.' },
      { section: 'Broker run parser', text: 'Paste an unformatted chat run or email quote sheet and the parser applies the bids and offers to the desk marks.' },
    ],
    commonTasks: [
      {
        question: 'How do I put a broker sheet into the marks?',
        steps: [
          'Paste the sheet into the broker run parser.',
          'Check the lines detected and markets matched.',
          'Write the marks, then check them on the pricing desk.',
        ],
        link: '/pricing',
      },
    ],
    keyTerms: ['broker-run', 'mark', 'simulated-mark', 'udb'],
    suggestedQuestions: [
      'Which feeds are live today?',
      'What does baseline data mean?',
      'How do I connect a pricing feed?',
      'Where does the broker run parser put prices?',
    ],
  },
  {
    route: '/regulation-check',
    title: 'Regulation check',
    purpose: 'Do the app’s rules, registry routes and statutory facts still match the law this week? A weekly check against primary sources that flags what changed.',
    howToRead: [
      { section: 'Last run', text: 'Shows when the check last ran. If it has never run, or has not run this week, the Reference menu flags it.' },
      { section: 'Run check', text: 'Needs your own Anthropic API key, stored only in this browser. Pick standard or thorough; the cost estimate is shown. You can preview a sample report without a key.' },
      { section: 'Report', text: 'Lists watched facts and open market questions with what the primary source says now and whether the app’s rule still holds.' },
    ],
    commonTasks: [
      {
        question: 'How do I run the weekly check?',
        steps: [
          'Paste your Anthropic API key and Save.',
          'Choose standard or thorough.',
          'Choose Run check and wait for the report.',
          'Read each changed item against the citation.',
        ],
      },
    ],
    keyTerms: ['nl-green-gas-law', 'red-iii', 'udb', 'open-item'],
    suggestedQuestions: [
      'Why does the desk run a weekly regulation check?',
      'Does the check need an API key?',
      'What happens when it finds a change?',
      'Is the Dutch green-gas law still pending?',
    ],
  },
  {
    route: '/glossary',
    title: 'Glossary',
    purpose: 'What does this term mean, and why does it matter on a deal? Searchable plain-English definitions of the desk’s terms, with where they appear in the app and their sources.',
    howToRead: [
      { section: 'Search', text: 'Type a term, an abbreviation or an alias, such as HHV or afkoopsom. Matches show instantly, with no AI or network involved.' },
      { section: 'Entries', text: 'Grouped A to Z. Each shows a short definition, a plain explanation, why it matters commercially, links to where it appears in the app, and sources.' },
      { section: 'Deep links', text: 'A link such as the glossary with term equals gge opens that entry. Related terms link to each other.' },
    ],
    commonTasks: [
      {
        question: 'How do I look up an unfamiliar term?',
        steps: [
          'Type it into the search box.',
          'Open the entry.',
          'Follow Where in the app to see it in context.',
        ],
      },
    ],
    keyTerms: ['go', 'pos', 'gge', 'netback', 'mark'],
    suggestedQuestions: [
      'What does GGE mean?',
      'What is the difference between a GO and a PoS?',
      'Where can I see a term used in the app?',
    ],
  },
  {
    route: '/ask',
    title: 'Ask the desk',
    purpose: 'A general chat for any question about markets, regulation, routes, plants or deals, not tied to one page. It uses the same model, tools and settings as the page helper.',
    howToRead: [
      { section: 'Conversation', text: 'One running conversation for this browser tab. It stays while you move around the app; New chat clears it. Answers stream in, and Stop ends one early.' },
      { section: 'Where answers come from', text: 'The app’s own data first: desk marks, certificate routes, destination pricing, plants and legal sources. Then web search, then general knowledge, which is labelled so you know to check it.' },
      { section: 'Settings', text: 'The model and web search are set on the Pricing desk under Desk assumptions, Desk helper. Your Anthropic key is set on the Regulation check page.' },
    ],
    commonTasks: [
      {
        question: 'How do I switch between Opus and Sonnet?',
        steps: [
          'Open the Pricing desk, Desk assumptions tab.',
          'Find the Desk helper section.',
          'Set the model flag: 1 for Opus, 0 for Sonnet.',
        ],
        link: '/pricing?tab=assumptions',
      },
      {
        question: 'How do I add my API key?',
        steps: [
          'Open Regulation check.',
          'Paste your Anthropic key into the key field.',
          'Come back here and ask again.',
        ],
        link: '/regulation-check',
      },
    ],
    keyTerms: ['netback', 'mark', 'go', 'pos', 'gge'],
    suggestedQuestions: [
      'Which destination pays most for Spanish manure today?',
      'Explain the Dutch 2027 green-gas obligation for a trader',
      'Why can’t Danish GOs be sold into the Netherlands?',
      'How does FuelEU pooling work for bio-LNG?',
      'What is on the regulatory watchlist right now?',
    ],
  },
];

export const PAGE_GUIDES_BY_ROUTE: Readonly<Record<string, PageGuide>> = Object.fromEntries(PAGE_GUIDES.map(g => [g.route, g]));

/** Strip any query or hash and a trailing slash, keeping a leading slash. */
function cleanPath(pathname: string): string {
  const base = pathname.split('?')[0].split('#')[0];
  const withSlash = base.startsWith('/') ? base : `/${base}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

/** The guide for a route or path (aliases and nested paths such as /plants/xyz resolve to their screen). */
export function getPageGuide(pathname: string): PageGuide | undefined {
  const path = cleanPath(pathname);
  const direct = GUIDE_ROUTE_ALIASES[path] ?? path;
  if (PAGE_GUIDES_BY_ROUTE[direct]) return PAGE_GUIDES_BY_ROUTE[direct];
  const parent = '/' + path.split('/').filter(Boolean)[0];
  const parentRoute = GUIDE_ROUTE_ALIASES[parent] ?? parent;
  return PAGE_GUIDES_BY_ROUTE[parentRoute];
}
