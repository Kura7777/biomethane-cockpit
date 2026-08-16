import { InterconnectionPoint } from './types';

/**
 * Authoritative European Gas Interconnection Points (IPs)
 * Sourced from PRISMA Capacity Platform, ENTSOG, and TSO published pricelists (2025/2026).
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
    entryTariffEurMwh: 0.25,
    exitTariffEurMwh: 0.35,
    totalTariffEurMwh: 0.60,
    capacityPlatform: 'PRISMA',
    notes: 'Subsea pipeline connecting Sweden transmission grid with Danish transmission network.',
  },
  {
    id: 'IP_DRAGOR_REV',
    name: 'Dragør / Dragor IP (Reverse)',
    fromCountry: 'DK',
    toCountry: 'SE',
    fromTso: 'Energinet',
    toTso: 'Swedegas',
    entryTariffEurMwh: 0.30,
    exitTariffEurMwh: 0.25,
    totalTariffEurMwh: 0.55,
    capacityPlatform: 'PRISMA',
  },

  // Denmark <-> Germany
  {
    id: 'IP_ELLUND',
    name: 'Ellund / VIP DK-DE',
    fromCountry: 'DK',
    toCountry: 'DE',
    fromTso: 'Energinet',
    toTso: 'Gasunie Deutschland / Open Grid Europe (THE)',
    entryTariffEurMwh: 0.45,
    exitTariffEurMwh: 0.50,
    totalTariffEurMwh: 0.95,
    capacityPlatform: 'PRISMA',
    notes: 'Jutland border connecting Danish transmission grid with Trading Hub Europe (THE).',
  },
  {
    id: 'IP_ELLUND_REV',
    name: 'Ellund / VIP DK-DE (Reverse)',
    fromCountry: 'DE',
    toCountry: 'DK',
    fromTso: 'Gasunie Deutschland (THE)',
    toTso: 'Energinet',
    entryTariffEurMwh: 0.40,
    exitTariffEurMwh: 0.45,
    totalTariffEurMwh: 0.85,
    capacityPlatform: 'PRISMA',
  },

  // Germany <-> France
  {
    id: 'VIP_FRANCE_GERMANY',
    name: 'VIP France-Germany (Obergailbach / Medelsheim)',
    fromCountry: 'DE',
    toCountry: 'FR',
    fromTso: 'Open Grid Europe / GRTgaz Deutschland',
    toTso: 'GRTgaz (PEG)',
    entryTariffEurMwh: 0.75,
    exitTariffEurMwh: 0.70,
    totalTariffEurMwh: 1.45,
    capacityPlatform: 'PRISMA',
    notes: 'Major border point between Trading Hub Europe (THE) and French Point d’Échange de Gaz (PEG).',
  },
  {
    id: 'VIP_FRANCE_GERMANY_REV',
    name: 'VIP France-Germany (Reverse)',
    fromCountry: 'FR',
    toCountry: 'DE',
    fromTso: 'GRTgaz (PEG)',
    toTso: 'Open Grid Europe (THE)',
    entryTariffEurMwh: 0.65,
    exitTariffEurMwh: 0.75,
    totalTariffEurMwh: 1.40,
    capacityPlatform: 'PRISMA',
  },

  // France <-> Spain
  {
    id: 'VIP_PIRINEOS',
    name: 'VIP Pirineos (Larrau & Biriatou)',
    fromCountry: 'FR',
    toCountry: 'ES',
    fromTso: 'Teréga / GRTgaz',
    toTso: 'Enagás GTS (PVB)',
    entryTariffEurMwh: 0.85,
    exitTariffEurMwh: 0.70,
    totalTariffEurMwh: 1.55,
    capacityPlatform: 'PRISMA',
    notes: 'Pyrenean border interconnection into the Spanish Iberian system (PVB).',
  },
  {
    id: 'VIP_PIRINEOS_REV',
    name: 'VIP Pirineos (Reverse)',
    fromCountry: 'ES',
    toCountry: 'FR',
    fromTso: 'Enagás GTS',
    toTso: 'Teréga',
    entryTariffEurMwh: 0.65,
    exitTariffEurMwh: 0.85,
    totalTariffEurMwh: 1.50,
    capacityPlatform: 'PRISMA',
  },

  // Netherlands <-> Germany
  {
    id: 'VIP_TTF_THE',
    name: 'VIP TTF-THE (Oude Statenzijl / Vlieghuis)',
    fromCountry: 'NL',
    toCountry: 'DE',
    fromTso: 'Gasunie Transport Services (GTS)',
    toTso: 'Gasunie Deutschland / OGE / Thyssengas',
    entryTariffEurMwh: 0.40,
    exitTariffEurMwh: 0.45,
    totalTariffEurMwh: 0.85,
    capacityPlatform: 'PRISMA',
  },
  {
    id: 'VIP_TTF_THE_REV',
    name: 'VIP TTF-THE (Reverse)',
    fromCountry: 'DE',
    toCountry: 'NL',
    fromTso: 'Gasunie Deutschland (THE)',
    toTso: 'Gasunie Transport Services (TTF)',
    entryTariffEurMwh: 0.45,
    exitTariffEurMwh: 0.40,
    totalTariffEurMwh: 0.85,
    capacityPlatform: 'PRISMA',
  },

  // Netherlands <-> Belgium
  {
    id: 'VIP_BENE',
    name: "VIP BENE (Zandvliet / 's-Gravenvoeren)",
    fromCountry: 'NL',
    toCountry: 'BE',
    fromTso: 'Gasunie Transport Services (GTS)',
    toTso: 'Fluxys Belgium (ZTP)',
    entryTariffEurMwh: 0.35,
    exitTariffEurMwh: 0.40,
    totalTariffEurMwh: 0.75,
    capacityPlatform: 'PRISMA',
  },

  // Belgium <-> France
  {
    id: 'VIP_BELFRANCE',
    name: 'VIP France-Belgium (Taisnières / Alveringem)',
    fromCountry: 'BE',
    toCountry: 'FR',
    fromTso: 'Fluxys Belgium',
    toTso: 'GRTgaz',
    entryTariffEurMwh: 0.45,
    exitTariffEurMwh: 0.50,
    totalTariffEurMwh: 0.95,
    capacityPlatform: 'PRISMA',
  },

  // Germany <-> Austria
  {
    id: 'VIP_GERMANY_AUSTRIA',
    name: 'VIP Germany-Austria (Oberkappel / Überackern)',
    fromCountry: 'DE',
    toCountry: 'AT',
    fromTso: 'Bayernets / Open Grid Europe',
    toTso: 'Gas Connect Austria (CEGH)',
    entryTariffEurMwh: 0.50,
    exitTariffEurMwh: 0.55,
    totalTariffEurMwh: 1.05,
    capacityPlatform: 'PRISMA',
  },

  // Austria <-> Italy
  {
    id: 'IP_ARNOLDSTEIN',
    name: 'Arnoldstein / Tarvisio IP',
    fromCountry: 'AT',
    toCountry: 'IT',
    fromTso: 'Trans Austria Gasleitung (TAG)',
    toTso: 'SNAM Rete Gas (PSV)',
    entryTariffEurMwh: 0.70,
    exitTariffEurMwh: 0.80,
    totalTariffEurMwh: 1.50,
    capacityPlatform: 'PRISMA',
  },

  // Germany <-> Poland
  {
    id: 'IP_MALLNOW',
    name: 'GCP GAZ-SYSTEM / ONTRAS (Mallnow)',
    fromCountry: 'DE',
    toCountry: 'PL',
    fromTso: 'ONTRAS Gastransport / Gascade',
    toTso: 'GAZ-SYSTEM',
    entryTariffEurMwh: 0.55,
    exitTariffEurMwh: 0.65,
    totalTariffEurMwh: 1.20,
    capacityPlatform: 'GSA',
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
