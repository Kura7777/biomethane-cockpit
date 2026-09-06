import { InterconnectionPoint, CapacityDuration } from './types';

/**
 * ENTSOG CAM NC (Commission Regulation (EU) 2017/459) Standard Capacity Duration Multipliers
 * Regulates the tariff multiplier applied by TSOs for capacity product booking horizons.
 */
export const CAM_NC_DURATION_MULTIPLIERS: Record<CapacityDuration, {
  multiplier: number;
  label: string;
  code: CapacityDuration;
  description: string;
  clearingMechanism: string;
}> = {
  YEARLY: {
    multiplier: 1.00,
    label: 'Yearly Standard (1.00×)',
    code: 'YEARLY',
    description: 'Regulated base reference tariff for long-term firm capacity (12-month delivery).',
    clearingMechanism: 'Annual PRISMA auction (first Monday of July)',
  },
  QUARTERLY: {
    multiplier: 1.10,
    label: 'Quarterly Firm (1.10×)',
    code: 'QUARTERLY',
    description: 'CAM NC Art. 13 calendar quarter capacity booking (1.05×–1.15× multiplier).',
    clearingMechanism: 'Rolling quarterly PRISMA auction',
  },
  MONTHLY: {
    multiplier: 1.25,
    label: 'Monthly Forward (1.25×)',
    code: 'MONTHLY',
    description: 'Standard monthly firm capacity product (regulated average 1.25× base tariff).',
    clearingMechanism: 'Monthly PRISMA auction (3rd Monday of M-1)',
  },
  DAILY: {
    multiplier: 1.50,
    label: 'Day-Ahead Spot (1.50×)',
    code: 'DAILY',
    description: 'Short-term spot balancing capacity auctioned daily on PRISMA (1.50× multiplier).',
    clearingMechanism: 'Daily Day-Ahead auction (16:30 UTC D-1)',
  },
  WITHIN_DAY: {
    multiplier: 1.75,
    label: 'Within-Day Balancing (1.75×)',
    code: 'WITHIN_DAY',
    description: 'Real-time intraday physical injection / withdrawal balancing on transmission grid.',
    clearingMechanism: 'Continuous within-day hourly bidding',
  },
};

/**
 * National Biomethane Grid Injection Tariff Incentives & Avoided Network Charge Deductions
 */
export const NATIONAL_BIOMETHANE_INJECTION_INCENTIVES: Record<string, {
  creditEurMwh: number;
  statutoryBasis: string;
  description: string;
}> = {
  DE: {
    creditEurMwh: 0.70,
    statutoryBasis: '§ 33 GasNZV (Gasnetzzugangsverordnung)',
    description: 'Avoided grid cost compensation paid by TSOs/DSOs to biomethane injectors (€0.007/kWh = €0.70/MWh).',
  },
  FR: {
    creditEurMwh: 0.40,
    statutoryBasis: 'Code de l’énergie Art. L. 453-9 (Droit à l’injection)',
    description: 'French national grid reinforcement allowance & entry tariff exemption for injected green gas.',
  },
  NL: {
    creditEurMwh: 0.35,
    statutoryBasis: 'GTS Transmission Code / Netbeheer Nederland',
    description: 'Gasunie Transport Services entry tariff waiver for audited renewable gas inputs.',
  },
  DK: {
    creditEurMwh: 0.30,
    statutoryBasis: 'Energinet Green Gas Incentive Tariff Scheme',
    description: 'Direct entry rebate applied to domestic biomethane entering the Danish transmission system.',
  },
};

/**
 * European Gas Interconnection Points (IPs) Grid Topology
 * All capacity booking tariffs default to null until verified by desk/clearing platforms (PRISMA/RBP/GSA).
 */
export const INTERCONNECTION_POINTS: InterconnectionPoint[] = [
  // Sweden <-> Denmark
  {
    id: 'IP_DRAGOR',
    name: 'Dragør / Dragor IP',
    fromCountry: 'SE',
    toCountry: 'DK',
    fromTso: 'Swedegas (Nordion Energi)',
    toTso: 'Energinet',
    entryTariffEurMwh: null,
    exitTariffEurMwh: null,
    totalTariffEurMwh: null,
    capacityPlatform: 'UNVERIFIED',
    confidence: 'UNVERIFIED',
    source: 'Swedegas / Energinet border point (Unverified tariff)',
    lastVerified: null,
    notes: 'Subsea pipeline connecting Sweden transmission grid with Danish transmission network.',
  },
  {
    id: 'IP_DRAGOR_REV',
    name: 'Dragør / Dragor IP (Reverse)',
    fromCountry: 'DK',
    toCountry: 'SE',
    fromTso: 'Energinet',
    toTso: 'Swedegas',
    entryTariffEurMwh: null,
    exitTariffEurMwh: null,
    totalTariffEurMwh: null,
    capacityPlatform: 'UNVERIFIED',
    confidence: 'UNVERIFIED',
    source: 'Energinet / Swedegas border point (Unverified tariff)',
    lastVerified: null,
  },

  // Denmark <-> Germany
  {
    id: 'IP_ELLUND',
    name: 'Ellund / VIP DK-DE',
    fromCountry: 'DK',
    toCountry: 'DE',
    fromTso: 'Energinet',
    toTso: 'Gasunie Deutschland / Open Grid Europe (THE)',
    entryTariffEurMwh: 0.25,
    exitTariffEurMwh: 0.30,
    totalTariffEurMwh: 0.55,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'Energinet & Gasunie Deutschland PRISMA Clearing (Tariff Year 2025/2026)',
    lastVerified: '2026-08-16',
    notes: 'Jutland border connecting Danish transmission grid with Trading Hub Europe (THE). Verified continuous capacity booking.',
  },
  {
    id: 'IP_ELLUND_REV',
    name: 'Ellund / VIP DK-DE (Reverse)',
    fromCountry: 'DE',
    toCountry: 'DK',
    fromTso: 'Gasunie Deutschland (THE)',
    toTso: 'Energinet',
    entryTariffEurMwh: 0.30,
    exitTariffEurMwh: 0.25,
    totalTariffEurMwh: 0.55,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'Gasunie Deutschland / Energinet PRISMA Clearing',
    lastVerified: '2026-08-16',
  },

  // Germany <-> France
  {
    id: 'VIP_FRANCE_GERMANY',
    name: 'VIP France-Germany (Obergailbach / Medelsheim)',
    fromCountry: 'DE',
    toCountry: 'FR',
    fromTso: 'Open Grid Europe / GRTgaz Deutschland',
    toTso: 'GRTgaz (PEG)',
    entryTariffEurMwh: 0.15,
    exitTariffEurMwh: 0.20,
    totalTariffEurMwh: 0.35,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'Open Grid Europe & GRTgaz PRISMA Clearing (Tariff Year 2025/2026)',
    lastVerified: '2026-08-16',
    notes: 'Major border point between Trading Hub Europe (THE) and French Point d’Échange de Gaz (PEG).',
  },
  {
    id: 'VIP_FRANCE_GERMANY_REV',
    name: 'VIP France-Germany (Reverse)',
    fromCountry: 'FR',
    toCountry: 'DE',
    fromTso: 'GRTgaz (PEG)',
    toTso: 'Open Grid Europe (THE)',
    entryTariffEurMwh: 0.20,
    exitTariffEurMwh: 0.15,
    totalTariffEurMwh: 0.35,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'GRTgaz / OGE PRISMA Clearing',
    lastVerified: '2026-08-16',
  },

  // France <-> Spain
  {
    id: 'VIP_PIRINEOS',
    name: 'VIP Pirineos (Larrau & Biriatou)',
    fromCountry: 'FR',
    toCountry: 'ES',
    fromTso: 'Teréga / GRTgaz',
    toTso: 'Enagás GTS (PVB)',
    entryTariffEurMwh: null,
    exitTariffEurMwh: null,
    totalTariffEurMwh: null,
    capacityPlatform: 'UNVERIFIED',
    confidence: 'UNVERIFIED',
    source: 'Teréga / Enagás border point (Unverified tariff)',
    lastVerified: null,
    notes: 'Pyrenean border interconnection into the Spanish Iberian system (PVB).',
  },
  {
    id: 'VIP_PIRINEOS_REV',
    name: 'VIP Pirineos (Reverse)',
    fromCountry: 'ES',
    toCountry: 'FR',
    fromTso: 'Enagás GTS',
    toTso: 'Teréga',
    entryTariffEurMwh: null,
    exitTariffEurMwh: null,
    totalTariffEurMwh: null,
    capacityPlatform: 'UNVERIFIED',
    confidence: 'UNVERIFIED',
    source: 'Enagás / Teréga border point (Unverified tariff)',
    lastVerified: null,
  },

  // Netherlands <-> Germany
  {
    id: 'VIP_TTF_THE',
    name: 'VIP TTF-THE (Oude Statenzijl / Vlieghuis)',
    fromCountry: 'NL',
    toCountry: 'DE',
    fromTso: 'Gasunie Transport Services (GTS)',
    toTso: 'Gasunie Deutschland / OGE / Thyssengas',
    entryTariffEurMwh: 0.10,
    exitTariffEurMwh: 0.15,
    totalTariffEurMwh: 0.25,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'GTS & OGE PRISMA Clearing (Tariff Year 2025/2026)',
    lastVerified: '2026-08-16',
    notes: 'Primary Dutch TTF to German THE grid cross-border corridor.',
  },
  {
    id: 'VIP_TTF_THE_REV',
    name: 'VIP TTF-THE (Reverse)',
    fromCountry: 'DE',
    toCountry: 'NL',
    fromTso: 'Gasunie Deutschland (THE)',
    toTso: 'Gasunie Transport Services (TTF)',
    entryTariffEurMwh: 0.15,
    exitTariffEurMwh: 0.10,
    totalTariffEurMwh: 0.25,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'Gasunie Deutschland / GTS PRISMA Clearing',
    lastVerified: '2026-08-16',
  },

  // Belgium <-> Germany
  {
    id: 'VIP_BELGIUM_GERMANY',
    name: 'VIP Eynatten / Raeren (VIP BE-DE)',
    fromCountry: 'BE',
    toCountry: 'DE',
    fromTso: 'Fluxys Belgium (ZTP)',
    toTso: 'Open Grid Europe (THE)',
    entryTariffEurMwh: 0.13,
    exitTariffEurMwh: 0.15,
    totalTariffEurMwh: 0.28,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'Fluxys Belgium & OGE PRISMA Clearing (Tariff Year 2025/2026)',
    lastVerified: '2026-08-16',
    notes: 'Interconnection connecting Belgian ZTP network with German THE.',
  },
  {
    id: 'VIP_BELGIUM_GERMANY_REV',
    name: 'VIP Eynatten / Raeren (Reverse)',
    fromCountry: 'DE',
    toCountry: 'BE',
    fromTso: 'Open Grid Europe (THE)',
    toTso: 'Fluxys Belgium (ZTP)',
    entryTariffEurMwh: 0.15,
    exitTariffEurMwh: 0.13,
    totalTariffEurMwh: 0.28,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'OGE & Fluxys Belgium PRISMA Clearing',
    lastVerified: '2026-08-16',
  },

  // Netherlands <-> Belgium
  {
    id: 'VIP_BENE',
    name: "VIP BENE (Zandvliet / 's-Gravenvoeren)",
    fromCountry: 'NL',
    toCountry: 'BE',
    fromTso: 'Gasunie Transport Services (GTS)',
    toTso: 'Fluxys Belgium (ZTP)',
    entryTariffEurMwh: null,
    exitTariffEurMwh: null,
    totalTariffEurMwh: null,
    capacityPlatform: 'UNVERIFIED',
    confidence: 'UNVERIFIED',
    source: 'GTS / Fluxys border point (Unverified tariff)',
    lastVerified: null,
  },

  // Belgium <-> France
  {
    id: 'VIP_BELFRANCE',
    name: 'VIP France-Belgium (Taisnières / Alveringem)',
    fromCountry: 'BE',
    toCountry: 'FR',
    fromTso: 'Fluxys Belgium',
    toTso: 'GRTgaz',
    entryTariffEurMwh: null,
    exitTariffEurMwh: null,
    totalTariffEurMwh: null,
    capacityPlatform: 'UNVERIFIED',
    confidence: 'UNVERIFIED',
    source: 'Fluxys / GRTgaz border point (Unverified tariff)',
    lastVerified: null,
  },

  // Germany <-> Austria
  {
    id: 'VIP_GERMANY_AUSTRIA',
    name: 'VIP Germany-Austria (Oberkappel / Überackern)',
    fromCountry: 'DE',
    toCountry: 'AT',
    fromTso: 'Bayernets / Open Grid Europe',
    toTso: 'Gas Connect Austria (CEGH)',
    entryTariffEurMwh: 0.12,
    exitTariffEurMwh: 0.18,
    totalTariffEurMwh: 0.30,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'bayernets & Gas Connect Austria PRISMA Clearing (Tariff Year 2025/2026)',
    lastVerified: '2026-08-16',
    notes: 'Major interconnection between THE and Central European Gas Hub (CEGH).',
  },
  {
    id: 'VIP_GERMANY_AUSTRIA_REV',
    name: 'VIP Germany-Austria (Reverse)',
    fromCountry: 'AT',
    toCountry: 'DE',
    fromTso: 'Gas Connect Austria (CEGH)',
    toTso: 'Bayernets / Open Grid Europe (THE)',
    entryTariffEurMwh: 0.18,
    exitTariffEurMwh: 0.12,
    totalTariffEurMwh: 0.30,
    capacityPlatform: 'PRISMA',
    confidence: 'VERIFIED',
    source: 'Gas Connect Austria & bayernets PRISMA Clearing',
    lastVerified: '2026-08-16',
  },

  // Austria <-> Italy
  {
    id: 'IP_ARNOLDSTEIN',
    name: 'Arnoldstein / Tarvisio IP',
    fromCountry: 'AT',
    toCountry: 'IT',
    fromTso: 'Trans Austria Gasleitung (TAG)',
    toTso: 'SNAM Rete Gas (PSV)',
    entryTariffEurMwh: null,
    exitTariffEurMwh: null,
    totalTariffEurMwh: null,
    capacityPlatform: 'UNVERIFIED',
    confidence: 'UNVERIFIED',
    source: 'TAG / SNAM border point (Unverified tariff)',
    lastVerified: null,
  },

  // Germany <-> Poland
  {
    id: 'IP_MALLNOW',
    name: 'GCP GAZ-SYSTEM / ONTRAS (Mallnow)',
    fromCountry: 'DE',
    toCountry: 'PL',
    fromTso: 'ONTRAS Gastransport / Gascade',
    toTso: 'GAZ-SYSTEM',
    entryTariffEurMwh: null,
    exitTariffEurMwh: null,
    totalTariffEurMwh: null,
    capacityPlatform: 'UNVERIFIED',
    confidence: 'UNVERIFIED',
    source: 'ONTRAS / GAZ-SYSTEM border point (Unverified tariff)',
    lastVerified: null,
  },
];

/**
 * European Gas Hub Basis Spreads (relative to TTF benchmark, in €/MWh)
 */
export const HUB_BASIS_SPREADS: Record<string, { hubName: string; operator: string; basisSpreadToTtfEurMwh: number }> = {
  NL: { hubName: 'TTF (Title Transfer Facility)', operator: 'Gasunie Transport Services', basisSpreadToTtfEurMwh: 0.00 },
  DE: { hubName: 'THE (Trading Hub Europe)', operator: 'Trading Hub Europe GmbH', basisSpreadToTtfEurMwh: +0.45 },
  DK: { hubName: 'ETF / Danish Hub', operator: 'Energinet', basisSpreadToTtfEurMwh: +0.35 },
  SE: { hubName: 'Swedegas VTP', operator: 'Nordion Energi', basisSpreadToTtfEurMwh: +1.10 },
  FR: { hubName: 'PEG (Point d’Échange de Gaz)', operator: 'GRTgaz / EEX', basisSpreadToTtfEurMwh: +0.80 },
  ES: { hubName: 'PVB (Punto Virtual de Balance)', operator: 'MIBGAS / Enagás', basisSpreadToTtfEurMwh: +1.35 },
  IT: { hubName: 'PSV (Punto di Scambio Virtuale)', operator: 'SNAM / GME', basisSpreadToTtfEurMwh: +1.60 },
  BE: { hubName: 'ZTP (Zeebrugge Trading Point)', operator: 'Fluxys', basisSpreadToTtfEurMwh: +0.25 },
  AT: { hubName: 'CEGH (Central European Gas Hub)', operator: 'OMV / CEGH', basisSpreadToTtfEurMwh: +1.20 },
  PL: { hubName: 'TGE Gas Hub', operator: 'Polish Power Exchange (TGE)', basisSpreadToTtfEurMwh: +1.40 },
  CZ: { hubName: 'OTE Gas Hub', operator: 'OTE a.s.', basisSpreadToTtfEurMwh: +0.90 },
  FI: { hubName: 'Gasgrid VTP', operator: 'Gasgrid Finland', basisSpreadToTtfEurMwh: +2.10 },
  UK: { hubName: 'NBP (National Balancing Point)', operator: 'National Gas', basisSpreadToTtfEurMwh: -0.60 },
  CH: { hubName: 'Swiss Hub', operator: 'Swissgas / VSG', basisSpreadToTtfEurMwh: +2.50 },
  NO: { hubName: 'Gassco Exit Hub', operator: 'Gassco', basisSpreadToTtfEurMwh: -0.20 },
};

/**
 * Distance Matrix between European Trading Hubs (in km, approximate pipeline/road routing)
 */
export const HUB_DISTANCES_KM: Record<string, Record<string, number>> = {
  SE: { SE: 0, DK: 280, DE: 850, NL: 1100, BE: 1300, FR: 1800, ES: 2600, IT: 2100, AT: 1450, PL: 1200, FI: 500, GB: 1400 },
  DK: { SE: 280, DK: 0, DE: 550, NL: 800, BE: 1000, FR: 1500, ES: 2300, IT: 1800, AT: 1150, PL: 900, FI: 780, GB: 1100 },
  DE: { SE: 850, DK: 550, DE: 0, NL: 350, BE: 450, FR: 950, ES: 1800, IT: 1250, AT: 600, PL: 550, FI: 1350, GB: 800 },
  NL: { SE: 1100, DK: 800, DE: 350, NL: 0, BE: 180, FR: 650, ES: 1550, IT: 1200, AT: 850, PL: 900, FI: 1600, GB: 450 },
  FR: { SE: 1800, DK: 1500, DE: 950, NL: 650, BE: 400, FR: 0, ES: 950, IT: 900, AT: 1100, PL: 1500, FI: 2300, GB: 500 },
  ES: { SE: 2600, DK: 2300, DE: 1800, NL: 1550, BE: 1400, FR: 950, ES: 0, IT: 1500, AT: 1950, PL: 2350, FI: 3100, GB: 1600 },
  IT: { SE: 2100, DK: 1800, DE: 1250, NL: 1200, BE: 1100, FR: 900, ES: 1500, IT: 0, AT: 700, PL: 1400, FI: 2600, GB: 1500 },
  AT: { SE: 1450, DK: 1150, DE: 600, NL: 850, BE: 900, FR: 1100, ES: 1950, IT: 700, AT: 0, PL: 750, FI: 1950, GB: 1300 },
  PL: { SE: 1200, DK: 900, DE: 550, NL: 900, BE: 1050, FR: 1500, ES: 2350, IT: 1400, AT: 750, PL: 0, FI: 1200, GB: 1400 },
};

/**
 * Direct gas transmission pipeline distances between adjacent national grid hubs (in km).
 * Derived from TSO network statements, PRISMA interconnection points, and pipeline geography.
 */
export const PIPELINE_SEGMENT_DISTANCES: Record<string, Record<string, number>> = {
  SE: { DK: 280 },
  DK: { SE: 280, DE: 550 },
  DE: { DK: 550, NL: 350, BE: 450, FR: 950, AT: 600, PL: 550, CZ: 350, CH: 450, LU: 200 },
  NL: { DE: 350, BE: 180, GB: 450 },
  BE: { NL: 180, DE: 450, FR: 400, GB: 350, LU: 180 },
  FR: { BE: 400, DE: 950, CH: 450, ES: 950, GB: 500, LU: 300 },
  LU: { DE: 200, FR: 300, BE: 180 },
  ES: { FR: 950, PT: 500 },
  PT: { ES: 500 },
  IT: { CH: 450, AT: 700, SI: 300, GR: 700 },
  AT: { DE: 600, IT: 700, CZ: 300, SK: 80, HU: 250, SI: 250 },
  PL: { DE: 550, CZ: 400, SK: 450, LT: 450, UA: 600 },
  CZ: { DE: 350, PL: 400, SK: 320, AT: 300 },
  SK: { CZ: 320, PL: 450, UA: 400, HU: 200, AT: 80 },
  HU: { AT: 250, SK: 200, UA: 350, RO: 500, HR: 300, RS: 350, SI: 350 },
  FI: { EE: 100 },
  EE: { FI: 100, LV: 300 },
  LV: { EE: 300, LT: 300 },
  LT: { LV: 300, PL: 450 },
  GB: { NL: 450, BE: 350, FR: 500, IE: 350 },
  CH: { DE: 450, FR: 450, IT: 450, AT: 400 },
  NO: { GB: 800, DE: 900, BE: 950, FR: 1100, NL: 850 },
  SI: { IT: 300, AT: 250, HU: 350, HR: 140 },
  HR: { SI: 140, HU: 300, RS: 380 },
  RO: { HU: 500, BG: 350, UA: 550 },
  BG: { RO: 350, GR: 300, RS: 380 },
  RS: { HU: 350, HR: 380, BG: 380 },
  GR: { BG: 300, IT: 700 },
  IE: { GB: 350 },
  UA: { PL: 600, SK: 400, HU: 350, RO: 550 },
};
