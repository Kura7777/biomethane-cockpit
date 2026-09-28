/**
 * Who else is in the European biomethane market — competitors for corporate and compliance
 * demand, and in most cases also trading counterparties (the same houses quote in broker runs
 * and sit in the same ERGaR cross-border certificate network).
 *
 * Every entry carries a source. Descriptions say only what the source supports.
 */

export type CompetitorArena = 'GO_CERTIFICATES' | 'CORPORATE_BIOMETHANE' | 'TRANSPORT_COMPLIANCE' | 'FUELEU_MARITIME' | 'PHYSICAL_MARKETING';

export interface CompetitorSource {
  url: string;
  note: string;
  checkedAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  /** What the sources say about how they operate. */
  model: string;
  arenas: CompetitorArena[];
  /** Also likely to be a trading counterparty (broker-run quoter or ERGaR network member). */
  alsoCounterparty: boolean;
  sources: CompetitorSource[];
}

const CHECKED = '2026-09-28';

const ERGAR_MEMBERS: CompetitorSource = {
  url: 'https://www.ergar.org/membership/our-members/',
  note: 'Listed ERGaR member — trades in the same cross-border biomethane certificate network (Cert-X Europe) as 3Degrees.',
  checkedAt: CHECKED,
};

export const ARENA_LABEL: Record<CompetitorArena, string> = {
  GO_CERTIFICATES: 'GOs & certificates',
  CORPORATE_BIOMETHANE: 'Corporate biomethane',
  TRANSPORT_COMPLIANCE: 'Transport compliance',
  FUELEU_MARITIME: 'FuelEU maritime',
  PHYSICAL_MARKETING: 'Physical marketing',
};

export const BIOMETHANE_COMPETITORS: Competitor[] = [
  {
    id: 'act',
    name: 'ACT Commodities',
    model: 'Amsterdam-based environmental commodities trader; quotes biomethane GOs and compliance tickets in broker runs.',
    arenas: ['GO_CERTIFICATES', 'CORPORATE_BIOMETHANE', 'TRANSPORT_COMPLIANCE'],
    alsoCounterparty: true,
    sources: [ERGAR_MEMBERS],
  },
  {
    id: 'stx',
    name: 'STX Group',
    model: 'Environmental commodities trader providing liquidity and corporate offtake; a main source of the broker runs in this app.',
    arenas: ['GO_CERTIFICATES', 'CORPORATE_BIOMETHANE'],
    alsoCounterparty: true,
    sources: [
      ERGAR_MEMBERS,
      {
        url: 'https://financeday.co.uk/qa-marijn-van-diessen-ceo-at-stx-group-in-conversation-with-andrew-cave/',
        note: 'Interview with STX Group CEO Marijn van Diessen on the group\'s environmental commodities business.',
        checkedAt: CHECKED,
      },
    ],
  },
  {
    id: 'afs',
    name: 'AFS Energy',
    model: 'Environmental commodities trading and advisory.',
    arenas: ['GO_CERTIFICATES', 'CORPORATE_BIOMETHANE'],
    alsoCounterparty: true,
    sources: [ERGAR_MEMBERS],
  },
  {
    id: 'dxt',
    name: 'DXT Commodities',
    model: 'Commodities trader active in cross-border biomethane certificates.',
    arenas: ['GO_CERTIFICATES'],
    alsoCounterparty: true,
    sources: [ERGAR_MEMBERS],
  },
  {
    id: 'danske',
    name: 'Danske Commodities',
    model: 'Energy trader active in cross-border biomethane certificates.',
    arenas: ['GO_CERTIFICATES'],
    alsoCounterparty: true,
    sources: [ERGAR_MEMBERS],
  },
  {
    id: 'cfp',
    name: 'CFP Energy',
    model: 'European energy-transition trader with biomethane sales traders dealing physical biomethane and certificates; expanding physical and paper activity from Amsterdam.',
    arenas: ['CORPORATE_BIOMETHANE', 'PHYSICAL_MARKETING', 'TRANSPORT_COMPLIANCE'],
    alsoCounterparty: true,
    sources: [
      { url: 'https://www.cfp.energy/en/products-and-solutions/fuels/biogas', note: 'CFP Energy biogas / biomethane products page.', checkedAt: CHECKED },
    ],
  },
  {
    id: 'anew',
    name: 'Anew Climate',
    model: 'Largest independent biomethane marketer in North America (majority-owned by TPG Rise); Munich/Berlin biomethane business marketing plant output, remuneration claims and GHG quotas; service agreement with Landwärme.',
    arenas: ['PHYSICAL_MARKETING', 'TRANSPORT_COMPLIANCE', 'CORPORATE_BIOMETHANE'],
    alsoCounterparty: true,
    sources: [
      { url: 'https://eu.anewclimate.com/biomethane', note: 'Anew Climate Europe biomethane services.', checkedAt: CHECKED },
      { url: 'https://www.dena.de/en/biogaspartner/partner/biogaspartner-profiles/anew-climate-europe-gmbh/', note: 'dena biogaspartner profile: Munich-based biomethane marketer (production, remuneration claims, GHG quotas).', checkedAt: CHECKED },
      { url: 'https://www.newswire.com/news/anew-climate-announces-strategic-service-agreement-with-landw-rme-22515854', note: 'Strategic service agreement with Landwärme.', checkedAt: CHECKED },
    ],
  },
  {
    id: 'titan',
    name: 'Titan Clean Fuels',
    model: 'Bio-LNG supplier; ran a FuelEU Maritime pool of several hundred vessels for the 2025 compliance period (DNV verified).',
    arenas: ['FUELEU_MARITIME', 'PHYSICAL_MARKETING'],
    alsoCounterparty: true,
    sources: [
      { url: 'https://bunkerindex.com/articles/article.php?a=22732&h=titan-clean-fuels-completes-first-fueleu-maritime-pooling-exercise-with-dnv-verification', note: 'First FuelEU pooling exercise, several hundred vessels, DNV verification.', checkedAt: CHECKED },
    ],
  },
  {
    id: 'gasum',
    name: 'Gasum',
    model: 'Nordic gas and bio-LNG supplier; its own bunkering and carrier fleet runs on bio-LNG, generating surplus for its FuelEU pool.',
    arenas: ['FUELEU_MARITIME', 'PHYSICAL_MARKETING'],
    alsoCounterparty: true,
    sources: [
      { url: 'https://www.gasum.com/en/news-and-customer-stories/blogs/2026/fueleu-maritime-pooling-bio-lng-powers-emission-reductions-across-european-shipping/', note: 'Gasum FuelEU Maritime pooling with bio-LNG.', checkedAt: CHECKED },
    ],
  },
  {
    id: 'agriportance',
    name: 'agriportance',
    model: 'German biomethane platform offering FuelEU Maritime bio-LNG compliance services.',
    arenas: ['FUELEU_MARITIME', 'TRANSPORT_COMPLIANCE'],
    alsoCounterparty: false,
    sources: [
      { url: 'https://agriportance.com/en/services/fueleu-maritime/', note: 'FuelEU Maritime with bio-LNG services.', checkedAt: CHECKED },
    ],
  },
];
