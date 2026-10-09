import { POS_SCHEMES } from '../../domain/routes/routeMatrix.generated';
import type { PosAcceptsForeign } from '../../domain/routes/types';
import {
  POSSIBLE_STATUSES,
  type CertificateRoute
} from '../../domain/registries/certificateRoutes';

export interface CountryMeta {
  iso: string;
  name: string;
  status: 'ACTIVE' | 'EMERGING' | 'FUTURE_2028' | 'NONE';
  legal: string;
  plants: number;
  twh: number;
  center: [number, number]; // [lon, lat]
}

export const COUNTRIES: Record<string, CountryMeta> = {
  'Germany': { iso: 'DE', name: 'Germany', status: 'ACTIVE', legal: '§ 37a BImSchG; 38. BImSchV', plants: 242, twh: 11.8, center: [10.45, 51.16] },
  'Netherlands': { iso: 'NL', name: 'Netherlands', status: 'ACTIVE', legal: 'Regeling energie vervoer artikel 7', plants: 82, twh: 3.2, center: [5.29, 52.13] },
  'France': { iso: 'FR', name: 'France', status: 'ACTIVE', legal: "Code de l'énergie Art. L.446-24; Décret 2022-640 (CPB); Code des douanes Art. 266 quindecies (TIRUERT)", plants: 652, twh: 10.4, center: [2.21, 46.22] },
  'Italy': { iso: 'IT', name: 'Italy', status: 'ACTIVE', legal: 'DM 2 marzo 2018 art. 5 & art. 12; DM 16 marzo 2023 n. 107', plants: 135, twh: 4.8, center: [12.56, 41.87] },
  'Denmark': { iso: 'DK', name: 'Denmark', status: 'ACTIVE', legal: 'Bekendtgørelse om biobrændstoffer m.v. (BEK nr 1243 af 20/11/2024)', plants: 64, twh: 5.6, center: [9.50, 56.26] },
  'Austria': { iso: 'AT', name: 'Austria', status: 'ACTIVE', legal: 'KOG § 10 · EAG § 86', plants: 16, twh: 0.45, center: [14.55, 47.51] },
  'Sweden': { iso: 'SE', name: 'Sweden', status: 'ACTIVE', legal: 'Lag (1994:1776) om skatt på energi 7 kap. 4 §; Lag (2010:598)', plants: 72, twh: 2.1, center: [18.64, 60.12] },
  'Finland': { iso: 'FI', name: 'Finland', status: 'ACTIVE', legal: 'Laki biopolttoaineiden käytön edistämisestä liikenteessä (446/2007) 4 §; Laki 393/2013', plants: 26, twh: 0.55, center: [25.74, 61.92] },
  'Belgium': { iso: 'BE', name: 'Belgium', status: 'ACTIVE', legal: 'Energiedecreet Art. 7.1.1 et seq.', plants: 12, twh: 0.38, center: [4.46, 50.50] },
  'Spain': { iso: 'ES', name: 'Spain', status: 'ACTIVE', legal: 'Real Decreto 376/2022; Circular 1/2024 CNMC; Orden TED/1027/2023', plants: 24, twh: 0.85, center: [-3.74, 40.46] },
  'Poland': { iso: 'PL', name: 'Poland', status: 'EMERGING', legal: 'Ustawa o biokomponentach i biopaliwach ciekłych art. 23 & 28c(2)', plants: 8, twh: 0.32, center: [19.14, 51.91] },
  'Czechia': { iso: 'CZ', name: 'Czechia', status: 'EMERGING', legal: 'Zákon č. 165/2012 Sb. (POZE) § 24-27; Vyhláška 110/2022 Sb.', plants: 11, twh: 0.42, center: [15.47, 49.81] },
  'Portugal': { iso: 'PT', name: 'Portugal', status: 'EMERGING', legal: 'Decreto-Lei n.º 84/2022 arts. 8, 10, 40-41', plants: 4, twh: 0.14, center: [-8.22, 39.39] },
  'Ireland': { iso: 'IE', name: 'Ireland', status: 'EMERGING', legal: 'SI 33/2010; GNI Renewable Gas Registry pilot', plants: 5, twh: 0.18, center: [-8.24, 53.41] },
  'Greece': { iso: 'GR', name: 'Greece', status: 'EMERGING', legal: 'Law 5215/2025; Law 3468/2006 art. 32H', plants: 2, twh: 0.05, center: [21.82, 39.07] },
  'Romania': { iso: 'RO', name: 'Romania', status: 'EMERGING', legal: 'Law 220/2008; OUG 9/2026', plants: 3, twh: 0.09, center: [24.96, 45.94] },
  'Hungary': { iso: 'HU', name: 'Hungary', status: 'EMERGING', legal: '2010. évi CXVII. tv. (Büat.); 821/2021. (XII. 28.) Korm. rendelet', plants: 5, twh: 0.16, center: [19.50, 47.16] },
  'Estonia': { iso: 'EE', name: 'Estonia', status: 'EMERGING', legal: 'Atmospheric Air Protection Act (VÕKS) § 122-123; Liquid Fuel Act § 2-1', plants: 7, twh: 0.28, center: [25.01, 58.59] },
  'Lithuania': { iso: 'LT', name: 'Lithuania', status: 'EMERGING', legal: 'Order 1-158 pt 32-33; Law on Alternative Fuels art. 21', plants: 6, twh: 0.22, center: [23.88, 55.16] },
  'Latvia': { iso: 'LV', name: 'Latvia', status: 'EMERGING', legal: 'Transporta enerģijas likums; MK noteikumi Nr. 336963', plants: 4, twh: 0.15, center: [24.60, 56.87] },
  'Switzerland': { iso: 'CH', name: 'Switzerland', status: 'EMERGING', legal: 'Mineralölsteuergesetz (MinStG) Art. 2a · 12b; MinStV Art. 19b', plants: 41, twh: 0.52, center: [8.22, 46.81] },
  'Norway': { iso: 'NO', name: 'Norway', status: 'EMERGING', legal: 'Produktforskriften kapittel 3', plants: 10, twh: 0.4, center: [8.46, 60.47] },
  'United Kingdom': { iso: 'GB', name: 'United Kingdom', status: 'ACTIVE', legal: 'RTFO Order 2007; DfT RTFO Biomethane Guidance Dec 2024 §3.17 & §2.13', plants: 124, twh: 6.2, center: [-3.43, 55.37] },
  'Slovakia': { iso: 'SK', name: 'Slovakia', status: 'FUTURE_2028', legal: 'Act No. 309/2009 Coll. §14a-14b; SPP-d Domain Protocol E.10.7', plants: 4, twh: 0.12, center: [19.69, 48.66] },
  'Slovenia': { iso: 'SI', name: 'Slovenia', status: 'FUTURE_2028', legal: 'Uredba o obnovljivih virih energije v prometu (Ur. l. RS 208/2021) art. 4(2)', plants: 2, twh: 0.05, center: [14.99, 46.15] },
  'Croatia': { iso: 'HR', name: 'Croatia', status: 'FUTURE_2028', legal: 'Zakon o biogorivima za prijevoz (NN 65/2009...52/2021)', plants: 3, twh: 0.08, center: [15.20, 45.10] },
  'Bulgaria': { iso: 'BG', name: 'Bulgaria', status: 'FUTURE_2028', legal: 'ZEVI Art. 47-50', plants: 2, twh: 0.06, center: [25.48, 42.73] },
  'Luxembourg': { iso: 'LU', name: 'Luxembourg', status: 'FUTURE_2028', legal: "Loi d'accise 17 Dec 2010 art. 1; RGD 3 Feb 2023", plants: 2, twh: 0.02, center: [6.12, 49.81] },
};

/** Default map centre [lon, lat]: midpoint of the 28 jurisdictions (Ireland/Portugal to Finland). */
export const MAP_HOME: [number, number] = [15.6, 50.4];

export type AcceptForeignStatus = PosAcceptsForeign | 'NO_SCHEME';

export const ACCEPT_FOREIGN_CONFIG: Record<AcceptForeignStatus, { label: string; fill: string; swatch: string; chipClass: string }> = {
  YES: {
    label: 'Accepts foreign biomethane',
    fill: 'color-mix(in srgb, var(--color-status-pass-text) 72%, var(--color-bg))',
    swatch: 'var(--color-status-pass-text)',
    chipClass: 'chip-pass',
  },
  GO_REQUIRED: {
    label: 'Foreign accepted (GO cancelled in national registry)',
    fill: 'color-mix(in srgb, var(--color-status-info-text) 72%, var(--color-bg))',
    swatch: 'var(--color-status-info-text)',
    chipClass: 'chip-info',
  },
  OPEN: {
    label: 'Open / not settled in national law',
    fill: 'color-mix(in srgb, var(--color-status-warn-text) 72%, var(--color-bg))',
    swatch: 'var(--color-status-warn-text)',
    chipClass: 'chip-warn',
  },
  NO: {
    label: 'Closed to foreign / domestic only',
    fill: 'color-mix(in srgb, var(--color-text) 22%, var(--color-bg))',
    swatch: 'color-mix(in srgb, var(--color-text) 35%, var(--color-bg))',
    chipClass: '',
  },
  NO_SCHEME: {
    label: 'No scheme on record',
    fill: 'color-mix(in srgb, var(--color-text) 7%, var(--color-bg))',
    swatch: 'color-mix(in srgb, var(--color-text) 12%, var(--color-bg))',
    chipClass: 'dim',
  },
};

/**
 * Priority order for picking most permissive scheme: YES > GO_REQUIRED > OPEN > NO
 */
export const ACCEPT_FOREIGN_PRIORITY: Record<PosAcceptsForeign, number> = {
  YES: 4,
  GO_REQUIRED: 3,
  OPEN: 2,
  NO: 1,
};

export function getBestAcceptsForeign(countryIso: string): { status: AcceptForeignStatus; schemeName?: string } {
  const schemes = Object.values(POS_SCHEMES).filter(s => s.country === countryIso);
  if (schemes.length === 0) return { status: 'NO_SCHEME' };
  schemes.sort((a, b) => ACCEPT_FOREIGN_PRIORITY[b.acceptsForeign] - ACCEPT_FOREIGN_PRIORITY[a.acceptsForeign]);
  return { status: schemes[0].acceptsForeign, schemeName: schemes[0].name };
}

export type MapView = 'SELL' | 'COMPLIANCE';
export type RouteFilter = 'ALL' | 'GO' | 'POS';
export type SellCategory = 'SELL_NOW' | 'CHECK_FIRST' | 'CLOSED' | 'NO_DATA';

export const SELL_FILL: Record<SellCategory, string> = {
  SELL_NOW: 'color-mix(in srgb, var(--color-status-pass-text) 72%, var(--color-bg))',
  CHECK_FIRST: 'color-mix(in srgb, var(--color-status-warn-text) 72%, var(--color-bg))',
  CLOSED: 'color-mix(in srgb, var(--color-text) 14%, var(--color-bg))',
  NO_DATA: ACCEPT_FOREIGN_CONFIG.NO_SCHEME.fill,
};

export const SELL_LEGEND: { key: 'ORIGIN' | SellCategory; label: string; swatch: string }[] = [
  { key: 'ORIGIN', label: 'Selected origin', swatch: 'var(--color-text)' },
  { key: 'SELL_NOW', label: 'Ready to trade', swatch: 'var(--color-status-pass-text)' },
  { key: 'CHECK_FIRST', label: 'Review needed / workaround', swatch: 'var(--color-status-warn-text)' },
  { key: 'CLOSED', label: 'Closed / domestic only', swatch: 'color-mix(in srgb, var(--color-text) 25%, var(--color-bg))' },
  { key: 'NO_DATA', label: 'Not researched', swatch: ACCEPT_FOREIGN_CONFIG.NO_SCHEME.swatch },
];

export const AUDIT_REF = 'Audited 4 Oct 2026 — sources in docs/research/route-audit-2026-10-04.';
export const ROUTES_HINT = 'Click any destination country to inspect trade opportunities & execution playbook.';

export function firstSentence(text: string): string {
  const i = text.search(/\.(\s|$)/);
  return i === -1 ? text : text.slice(0, i + 1);
}

export function classifyRoute(r: CertificateRoute | undefined, filter: RouteFilter): SellCategory {
  if (!r) return 'NO_DATA';
  const goPossible = POSSIBLE_STATUSES.includes(r.status);
  const posPossible = r.pos?.status === 'POSSIBLE';

  if (filter === 'GO') {
    if (goPossible) return 'SELL_NOW';
    if (r.status === 'AWAITING_REGISTRY' || (r.status === 'NOT_POSSIBLE' && Boolean(r.workaround))) {
      return 'CHECK_FIRST';
    }
    if (r.status === 'NO_DATA') return 'NO_DATA';
    return 'CLOSED';
  }

  if (filter === 'POS') {
    if (!r.pos) return 'NO_DATA';
    if (r.pos.status === 'POSSIBLE') return 'SELL_NOW';
    if (r.pos.status === 'OPEN') return 'CHECK_FIRST';
    return 'CLOSED';
  }

  // ALL (default)
  if (goPossible || posPossible) return 'SELL_NOW';
  if (
    (r.status === 'NOT_POSSIBLE' && Boolean(r.workaround)) ||
    r.status === 'AWAITING_REGISTRY' ||
    r.pos?.status === 'OPEN'
  ) {
    return 'CHECK_FIRST';
  }
  const hasAudit = r.status !== 'NO_DATA' || Boolean(r.pos);
  if (hasAudit) return 'CLOSED';
  return 'NO_DATA';
}

export function getPlainLanguageHow(r: CertificateRoute, category: SellCategory): string {
  const goPossible = POSSIBLE_STATUSES.includes(r.status);
  const posPossible = r.pos?.status === 'POSSIBLE';

  if (category === 'SELL_NOW') {
    if (goPossible && posPossible) {
      const hubs = r.hubs.length > 0 ? r.hubs.map(h => (h === 'AIB' ? 'AIB' : 'ERGaR')).join(' + ') : 'registry';
      const scheme = r.pos?.schemeName || 'compliance scheme';
      return `GO via ${hubs} · PoS into ${scheme}`;
    }
    if (goPossible) {
      const hubs = r.hubs.length > 0 ? r.hubs.map(h => (h === 'AIB' ? 'AIB' : 'ERGaR')).join(' + ') : 'registry';
      return `GO via ${hubs}`;
    }
    if (posPossible) {
      return `PoS into ${r.pos?.schemeName || 'compliance scheme'}`;
    }
    return 'Sell now';
  }

  if (category === 'CHECK_FIRST') {
    if (r.workaround) {
      return 'Ex-domain cancellation — check recognition';
    }
    if (r.status === 'AWAITING_REGISTRY') {
      return `Awaiting registry answer${r.openQuestionId ? ` (${r.openQuestionId})` : ''}`;
    }
    if (r.pos?.status === 'OPEN') {
      return `PoS under review (${r.pos?.schemeName || 'scheme'})`;
    }
    return firstSentence(r.reason);
  }

  if (category === 'CLOSED') {
    if (r.target === 'NL') {
      return 'ERE accepts only Dutch-produced gas';
    }
    if (r.target === 'IT' && (r.pos?.reason.includes('Italian network') || r.pos?.reason.includes('DM 2 marzo'))) {
      return 'CIC requires Italian network injection';
    }
    if (r.target === 'FR' && (r.pos?.reason.includes('TIRUERT') || r.pos?.reason.includes('3492'))) {
      return 'TIRUERT excludes biomethane for 2026';
    }
    if (r.pos && r.pos.status === 'NOT_POSSIBLE' && r.pos.reason) {
      return firstSentence(r.pos.reason);
    }
    return firstSentence(r.reason);
  }

  return 'Not researched';
}

export const FILTER_CONFIG: Record<RouteFilter, { label: string; shortLabel: string; desc: string }> = {
  ALL: {
    label: 'All Commercial Trades',
    shortLabel: 'All Trades',
    desc: 'GO = certificate only, moved between GO registries; the gas does not move. PoS = physical gas under mass balance, with the PoS moved through the sustainability database (UDB / Nabisy), for the destination\'s transport quota.',
  },
  GO: {
    label: 'Certificates (Book & Claim / GO)',
    shortLabel: 'Certificates (GO)',
    desc: 'Certificate only, moved registry to registry; the gas does not move. Used for voluntary green-gas claims and supplier tariffs. Not valid evidence under EU ETS (needs a PoS via UDB); Scope 1 recognition depends on the buyer\'s reporting framework.',
  },
  POS: {
    label: 'Compliance quota (Mass Balance / PoS)',
    shortLabel: 'Compliance quota (PoS)',
    desc: 'Physical gas under mass balance. The PoS moves through the sustainability database (UDB / Nabisy), not the GO registry. Counts toward the destination\'s transport quota (e.g. THG, RTFO, POZE).',
  },
};

export const ISO_TO_NAME: Record<string, string> = {};
for (const [cName, meta] of Object.entries(COUNTRIES)) {
  ISO_TO_NAME[meta.iso.toUpperCase()] = cName;
}
ISO_TO_NAME['UK'] = 'United Kingdom';

export function resolveCorridorParams(params: URLSearchParams): { origin: string; target: string; filter: RouteFilter } {
  const rawOrigin = params.get('origin')?.toUpperCase();
  const rawTarget = params.get('target')?.toUpperCase();
  const rawFilter = params.get('filter')?.toUpperCase();

  const originName = (rawOrigin && ISO_TO_NAME[rawOrigin]) ? ISO_TO_NAME[rawOrigin] : 'Denmark';
  let targetName = (rawTarget && ISO_TO_NAME[rawTarget]) ? ISO_TO_NAME[rawTarget] : (originName === 'Germany' ? 'Denmark' : 'Germany');

  if (targetName === originName) {
    targetName = originName === 'Germany' ? 'Denmark' : 'Germany';
  }

  const filterVal: RouteFilter = (rawFilter === 'GO' || rawFilter === 'POS' || rawFilter === 'ALL') ? rawFilter : 'ALL';

  return { origin: originName, target: targetName, filter: filterVal };
}
