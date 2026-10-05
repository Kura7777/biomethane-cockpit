import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Line,
  Marker,
} from 'react-simple-maps';
import { ArrowLeftRight, X, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import geoData from '../../assets/countries-50m.json';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { Sheet } from '../../shared/ui';
import './map.css';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { calculateLogisticsRoute, calculateDijkstraCorridor } from '../../domain/logistics/engine';
import { getDefaultMarketForOrigin } from '../trade-builder/TradeBuilderScreen';
import { getGoRoute, getPosRoute } from '../../domain/routes';
import {
  getCertificateRoute,
  getCertificateRoutesFrom,
  CERT_ROUTE_LABELS,
  POSSIBLE_STATUSES,
  type CertRouteStatus,
  type CertificateRoute,
} from '../../domain/registries/certificateRoutes';
import { ORIGIN_CAVEATS } from '../../domain/registries/hubConnectivity';

interface CountryMeta {
  iso: string;
  name: string;
  status: 'ACTIVE' | 'EMERGING' | 'FUTURE_2028' | 'RESTRICTED' | 'NONE';
  legal: string;
  plants: number;
  twh: number;
  center: [number, number]; // [lon, lat]
}

const COUNTRIES: Record<string, CountryMeta> = {
  'Germany': { iso: 'DE', name: 'Germany', status: 'ACTIVE', legal: '§37a BImSchG · 38. BImSchV', plants: 242, twh: 11.8, center: [10.45, 51.16] },
  'Netherlands': { iso: 'NL', name: 'Netherlands', status: 'ACTIVE', legal: 'Wet milieubeheer · Regeling energie vervoer', plants: 82, twh: 3.2, center: [5.29, 52.13] },
  'France': { iso: 'FR', name: 'France', status: 'ACTIVE', legal: 'Code de l’énergie L.446-24 · Art. 266 quindecies', plants: 652, twh: 10.4, center: [2.21, 46.22] },
  'Italy': { iso: 'IT', name: 'Italy', status: 'ACTIVE', legal: 'DM 2 March 2018 · DM 15 Sept 2022', plants: 135, twh: 4.8, center: [12.56, 41.87] },
  'Denmark': { iso: 'DK', name: 'Denmark', status: 'ACTIVE', legal: 'VE-loven §§ 43a–43f', plants: 64, twh: 5.6, center: [9.50, 56.26] },
  'Austria': { iso: 'AT', name: 'Austria', status: 'ACTIVE', legal: 'Erneuerbaren-Gase-Gesetz', plants: 16, twh: 0.45, center: [14.55, 47.51] },
  'Sweden': { iso: 'SE', name: 'Sweden', status: 'ACTIVE', legal: 'Lag (1994:1776) om skatt på energi', plants: 72, twh: 2.1, center: [18.64, 60.12] },
  'Finland': { iso: 'FI', name: 'Finland', status: 'ACTIVE', legal: 'Jakeluvelvoitelaki (446/2007)', plants: 26, twh: 0.55, center: [25.74, 61.92] },
  'Belgium': { iso: 'BE', name: 'Belgium', status: 'ACTIVE', legal: 'Energiedecreet · Décret wallon gaz', plants: 12, twh: 0.38, center: [4.46, 50.50] },
  'Spain': { iso: 'ES', name: 'Spain', status: 'ACTIVE', legal: 'Real Decreto 376/2022', plants: 38, twh: 0.9, center: [-3.74, 40.46] },
  'Poland': { iso: 'PL', name: 'Poland', status: 'EMERGING', legal: 'Ustawa o OZE Art. 70a–70z', plants: 14, twh: 0.3, center: [19.14, 51.91] },
  'Czechia': { iso: 'CZ', name: 'Czechia', status: 'EMERGING', legal: 'Zákon o POZE 165/2012 §§ 24–27', plants: 11, twh: 0.2, center: [15.47, 49.81] },
  'Portugal': { iso: 'PT', name: 'Portugal', status: 'EMERGING', legal: 'Decreto-Lei 84/2022', plants: 4, twh: 0.05, center: [-8.22, 39.39] },
  'Ireland': { iso: 'IE', name: 'Ireland', status: 'EMERGING', legal: 'NORA Act Part 5A', plants: 6, twh: 0.1, center: [-8.24, 53.41] },
  'Greece': { iso: 'GR', name: 'Greece', status: 'EMERGING', legal: 'Law 4951/2022 Art. 80–92', plants: 3, twh: 0.04, center: [21.82, 39.07] },
  'Romania': { iso: 'RO', name: 'Romania', status: 'EMERGING', legal: 'Legea 220/2008 · ANRE norms', plants: 2, twh: 0.03, center: [24.96, 45.94] },
  'Hungary': { iso: 'HU', name: 'Hungary', status: 'EMERGING', legal: 'Földgáztörvény 82–85. §', plants: 5, twh: 0.08, center: [19.50, 47.16] },
  'Estonia': { iso: 'EE', name: 'Estonia', status: 'EMERGING', legal: 'Vedelkütuse seadus § 2¹', plants: 8, twh: 0.15, center: [25.01, 58.59] },
  'Lithuania': { iso: 'LT', name: 'Lithuania', status: 'EMERGING', legal: 'Renewable Energy Law Art. 38–41', plants: 4, twh: 0.06, center: [23.88, 55.16] },
  'Latvia': { iso: 'LV', name: 'Latvia', status: 'EMERGING', legal: 'Enerģētikas likums 42. pants', plants: 3, twh: 0.04, center: [24.60, 56.87] },
  'Switzerland': { iso: 'CH', name: 'Switzerland', status: 'EMERGING', legal: 'MinStG Art. 2a · 12b — grid-isolated', plants: 35, twh: 0.4, center: [8.22, 46.81] },
  'Norway': { iso: 'NO', name: 'Norway', status: 'EMERGING', legal: 'Produktforskriften kap. 3 — grid-isolated', plants: 12, twh: 0.2, center: [8.46, 60.47] },
  'United Kingdom': { iso: 'GB', name: 'United Kingdom', status: 'RESTRICTED', legal: 'RTFO — grid injection cannot evidence UDB ingestion', plants: 108, twh: 6.1, center: [-3.43, 55.37] },
  'Slovakia': { iso: 'SK', name: 'Slovakia', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 2, twh: 0.03, center: [19.69, 48.66] },
  'Slovenia': { iso: 'SI', name: 'Slovenia', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 1, twh: 0.01, center: [14.99, 46.15] },
  'Croatia': { iso: 'HR', name: 'Croatia', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 1, twh: 0.01, center: [15.20, 45.10] },
  'Bulgaria': { iso: 'BG', name: 'Bulgaria', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 1, twh: 0.01, center: [25.48, 42.73] },
  'Luxembourg': { iso: 'LU', name: 'Luxembourg', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 2, twh: 0.02, center: [6.12, 49.81] },
};

/** Default map centre [lon, lat]: midpoint of the 28 jurisdictions (Ireland/Portugal to Finland). */
const MAP_HOME: [number, number] = [15.6, 50.4];

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active market', fill: 'color-mix(in srgb, var(--color-text) 72%, var(--color-bg))', swatch: 'var(--color-text)' },
  EMERGING: { label: 'Emerging', fill: 'color-mix(in srgb, var(--color-text) 38%, var(--color-bg))', swatch: 'var(--color-neutral-500)' },
  FUTURE_2028: { label: 'Future 2028 · ETS2', fill: 'color-mix(in srgb, var(--color-text) 16%, var(--color-bg))', swatch: 'var(--color-neutral-300)' },
  RESTRICTED: { label: 'Restricted · UDB gap', fill: 'var(--color-accent)', swatch: 'var(--color-accent)' },
  NONE: { label: 'No mechanism', fill: 'color-mix(in srgb, var(--color-text) 7%, var(--color-bg))', swatch: 'color-mix(in srgb, var(--color-text) 12%, var(--color-bg))' },
};

type MapView = 'SELL' | 'COMPLIANCE';
type RouteFilter = 'ALL' | 'GO' | 'POS';
type SellCategory = 'SELL_NOW' | 'CHECK_FIRST' | 'CLOSED' | 'NO_DATA';

const SELL_FILL: Record<SellCategory, string> = {
  SELL_NOW: 'color-mix(in srgb, var(--color-status-pass-text) 72%, var(--color-bg))',
  CHECK_FIRST: 'color-mix(in srgb, var(--color-status-warn-text) 72%, var(--color-bg))',
  CLOSED: 'color-mix(in srgb, var(--color-text) 14%, var(--color-bg))',
  NO_DATA: STATUS_CONFIG.NONE.fill,
};

const SELL_LEGEND: { key: 'ORIGIN' | SellCategory; label: string; swatch: string }[] = [
  { key: 'ORIGIN', label: 'Selected origin', swatch: 'var(--color-text)' },
  { key: 'SELL_NOW', label: 'Ready to trade', swatch: 'var(--color-status-pass-text)' },
  { key: 'CHECK_FIRST', label: 'Review needed / workaround', swatch: 'var(--color-status-warn-text)' },
  { key: 'CLOSED', label: 'Closed / domestic only', swatch: 'color-mix(in srgb, var(--color-text) 25%, var(--color-bg))' },
  { key: 'NO_DATA', label: 'Not researched', swatch: STATUS_CONFIG.NONE.swatch },
];

const EVIDENCE_GRADE_TEXT: Record<string, string> = {
  OBSERVED: 'proven by real trades',
  PUBLISHED: "registry's published list",
  RULE: 'hub rules',
};
const AUDIT_REF = 'Audited 4 Oct 2026 — sources in docs/research/route-audit-2026-10-04.';
const ROUTES_HINT = 'Click any destination country to inspect trade opportunities & execution playbook.';

function firstSentence(text: string): string {
  const i = text.search(/\.(\s|$)/);
  return i === -1 ? text : text.slice(0, i + 1);
}

function classifyRoute(r: CertificateRoute | undefined, filter: RouteFilter): SellCategory {
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

function getPlainLanguageHow(r: CertificateRoute, category: SellCategory): string {
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

const FILTER_CONFIG: Record<RouteFilter, { label: string; shortLabel: string; desc: string }> = {
  ALL: {
    label: 'All Commercial Trades',
    shortLabel: 'All Trades',
    desc: 'GO = certificate only, moved between GO registries; the gas does not move. PoS = physical gas under mass balance, with the PoS moved through the sustainability database (UDB / Nabisy), for the destination\'s transport quota.',
  },
  GO: {
    label: 'Certificates (Book & Claim / GO)',
    shortLabel: 'Certificates (GO)',
    desc: 'Certificate only. Moves registry to registry (GO registry) for Scope 1 / voluntary claims. The gas does not move and no GHG threshold applies.',
  },
  POS: {
    label: 'Compliance quota (Mass Balance / PoS)',
    shortLabel: 'Compliance quota (PoS)',
    desc: 'Physical gas under mass balance. The PoS moves through the sustainability database (UDB / Nabisy), not the GO registry. Counts toward the destination\'s transport quota (e.g. THG, RTFO, POZE).',
  },
};

export type TradeArchetype = 'BOTH' | 'CERT_ONLY' | 'POS_ONLY' | 'CHECK_FIRST' | 'CLOSED' | 'NO_DATA';

export interface TradePlaybookDetails {
  archetype: TradeArchetype;
  badge: string;
  chipClass: string;
  isTradeable: boolean;
  structureTitle: string;
  structureDesc: string;
  schemeTitle: string;
  schemeDesc: string;
  executionTitle: string;
  executionDesc: string;
  defaultCoc: 'BOOK_AND_CLAIM' | 'MASS_BALANCE';
}

function getTradePlaybook(originIso: string, targetIso: string, r: CertificateRoute | undefined): TradePlaybookDetails {
  if (!r) {
    return {
      archetype: 'NO_DATA',
      badge: 'Unresearched',
      chipClass: '',
      isTradeable: false,
      structureTitle: 'No verified corridor data',
      structureDesc: `No audited regulatory records found for ${originIso} ➔ ${targetIso}.`,
      schemeTitle: 'None',
      schemeDesc: 'National schemes unconfirmed.',
      executionTitle: 'Not Available',
      executionDesc: 'Corridor data unavailable.',
      defaultCoc: 'BOOK_AND_CLAIM',
    };
  }

  const goPossible = POSSIBLE_STATUSES.includes(r.status);
  const posPossible = r.pos?.status === 'POSSIBLE';
  const posSchemes = r.pos?.schemeName || 'National Transport Scheme';

  if (goPossible && posPossible) {
    const hubs = r.hubs.length > 0 ? r.hubs.join(' / ') : 'Registry Hub';
    return {
      archetype: 'BOTH',
      badge: 'Both: Certificates + Physical PoS',
      chipClass: 'chip-pass',
      isTradeable: true,
      structureTitle: 'Dual Option: Book & Claim or Mass Balance',
      structureDesc: 'Sell green certificates independently, or deliver physical gas with sustainability proof (PoS) into the national quota.',
      schemeTitle: `${posSchemes} / Corporate Scope 1`,
      schemeDesc: `Eligible for compliance tickets in ${targetIso} or corporate green gas claims.`,
      executionTitle: `Electronic Transfer (${hubs}) or Gas Grid transit`,
      executionDesc: `GOs clear via ${hubs}. Physical gas injects into interconnected ENTSOG grid with mass balance proof.`,
      defaultCoc: 'MASS_BALANCE',
    };
  }

  if (goPossible && !posPossible) {
    const hubs = r.hubs.length > 0 ? r.hubs.join(' / ') : 'Registry Hub';
    return {
      archetype: 'CERT_ONLY',
      badge: 'Certificates Only (Book & Claim)',
      chipClass: 'chip-pass',
      isTradeable: true,
      structureTitle: 'Book & Claim Electronic Transfer (GOs)',
      structureDesc: 'Certificates can be sold and transferred electronically without moving physical gas or booking pipeline capacity.',
      schemeTitle: 'Voluntary Scope 1 / Green Gas Tariffs',
      schemeDesc: `Accepted in ${targetIso} for corporate emission accounting or voluntary consumer green gas.`,
      executionTitle: `Registry Account Transfer via ${hubs}`,
      executionDesc: `Initiate electronic cancellation or transfer in national registry to ${targetIso} counterpart.`,
      defaultCoc: 'BOOK_AND_CLAIM',
    };
  }

  if (!goPossible && posPossible) {
    return {
      archetype: 'POS_ONLY',
      badge: 'Compliance Quota Only (PoS / Mass Balance)',
      chipClass: 'chip-pass',
      isTradeable: true,
      structureTitle: 'Physical Gas Delivery + Sustainability Proof (PoS)',
      structureDesc: 'Physical biomethane delivered via interconnected gas grid. Certificates remain bound to the gas parcel.',
      schemeTitle: `${posSchemes} Compliance`,
      schemeDesc: `Mandatory transport quota target in ${targetIso} (§47d / RTFO / THG-Quote). High commercial green premium.`,
      executionTitle: 'Continuous Gas Grid Path + Mass Balance Cert',
      executionDesc: `Inject in ${originIso}, book transit to ${targetIso}, and submit validated Proof of Sustainability (PoS).`,
      defaultCoc: 'MASS_BALANCE',
    };
  }

  if (r.workaround || r.status === 'AWAITING_REGISTRY' || r.pos?.status === 'OPEN') {
    return {
      archetype: 'CHECK_FIRST',
      badge: 'Requires Workaround / Review',
      chipClass: 'chip-warn',
      isTradeable: false,
      structureTitle: 'Conditional Transfer / Ex-Domain Cancellation',
      structureDesc: r.workaround || 'Standard electronic transfer not established; requires manual counterparty confirmation.',
      schemeTitle: posSchemes,
      schemeDesc: r.pos?.reason || r.reason,
      executionTitle: 'Ex-Domain Cancellation or Bilateral Contract',
      executionDesc: 'Cancel certificate in origin registry explicitly for beneficiary in destination, subject to local regulator acceptance.',
      defaultCoc: 'BOOK_AND_CLAIM',
    };
  }

  return {
    archetype: 'CLOSED',
    badge: 'Domestic Market Only / Closed',
    chipClass: '',
    isTradeable: false,
    structureTitle: 'Foreign Imports Excluded by Law',
    structureDesc: r.pos?.reason || r.reason || 'Domestic regulations prohibit imported biomethane from claiming national subsidies.',
    schemeTitle: posSchemes,
    schemeDesc: r.pos?.reason || 'Restricted to domestic grid injection.',
    executionTitle: 'No Statutory Corridor Available',
    executionDesc: 'Trade cannot be settled under current legal framework.',
    defaultCoc: 'BOOK_AND_CLAIM',
  };
}

export function MapScreen() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [panelOpen, setPanelOpen] = useState(false);
  const [origin, setOrigin] = useState<string>('Denmark');
  const [target, setTarget] = useState<string>('Germany');
  const [selectedCountryName, setSelectedCountryName] = useState<string>('Germany');
  const [mode, setMode] = useState<'ORIGIN' | 'TARGET'>('TARGET');
  const [view, setView] = useState<MapView>('SELL');
  const [filter, setFilter] = useState<RouteFilter>('ALL');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summarySearch, setSummarySearch] = useState('');
  const [isCaveatOpen, setIsCaveatOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<CountryMeta | null>(null);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(3.6);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_HOME);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const optionsPanelRef = useRef<HTMLDivElement>(null);
  const [panelOffsetDeg, setPanelOffsetDeg] = useState(0);

  // The options panel overlays the left of the map; shift the view so the map is centred in the
  // uncovered area. Converts half the panel's footprint (px) to degrees of longitude (Mercator is
  // linear in longitude) using the SVG's meet-fit scale, projection scale 680 and current zoom.
  useEffect(() => {
    if (isMobile) { setPanelOffsetDeg(0); return; }
    const box = mapBoxRef.current;
    const panel = optionsPanelRef.current;
    if (!box || !panel || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const fit = Math.min(box.clientWidth / 800, box.clientHeight / 600);
      if (!fit) return;
      const coveredPx = panel.offsetLeft + panel.offsetWidth;
      const pxPerDeg = fit * 680 * (Math.PI / 180) * (zoomLevel / 3.6);
      setPanelOffsetDeg(coveredPx / 2 / pxPerDeg);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [isMobile, zoomLevel]);
  const [ctxMenu, setCtxMenu] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('wheel', close, { passive: true });
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('wheel', close);
    };
  }, [ctxMenu]);

  useEffect(() => {
    if (!isSummaryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSummaryOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSummaryOpen]);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  useEffect(() => {
    if (!isDetailOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDetailOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDetailOpen]);

  const originMeta = COUNTRIES[origin] || COUNTRIES['Denmark'];
  const targetMeta = COUNTRIES[target] || COUNTRIES['Germany'];
  const selectedMeta = COUNTRIES[selectedCountryName] || COUNTRIES['Germany'];

  const statusCounts = useMemo(() => {
    const counts = { ACTIVE: 0, EMERGING: 0, FUTURE_2028: 0, RESTRICTED: 0, NONE: 0 };
    Object.values(COUNTRIES).forEach(c => {
      counts[c.status]++;
    });
    return counts;
  }, []);

  const allIsos = useMemo(() => Object.values(COUNTRIES).map(c => c.iso), []);
  const nameByIso = useMemo(() => {
    const m: Record<string, string> = {};
    Object.values(COUNTRIES).forEach(c => { m[c.iso] = c.name; });
    return m;
  }, []);

  const certRoutes = useMemo(() => getCertificateRoutesFrom(originMeta.iso, allIsos), [originMeta.iso, allIsos]);
  const routeByIso = useMemo(() => {
    const m: Record<string, CertificateRoute> = {};
    certRoutes.forEach(r => { m[r.target] = r; });
    return m;
  }, [certRoutes]);
  const hasPipeline = useMemo(() => {
    const m: Record<string, boolean> = {};
    certRoutes.forEach(r => { m[r.target] = calculateDijkstraCorridor(originMeta.iso, r.target).segments.length > 0; });
    return m;
  }, [certRoutes, originMeta.iso]);

  const categoryCounts = useMemo(() => {
    const counts: Record<SellCategory, number> = { SELL_NOW: 0, CHECK_FIRST: 0, CLOSED: 0, NO_DATA: 0 };
    certRoutes.forEach(r => {
      const cat = classifyRoute(r, filter);
      counts[cat]++;
    });
    return counts;
  }, [certRoutes, filter]);

  const topRoutes = useMemo(() => {
    const sellNow = certRoutes.filter(r => classifyRoute(r, filter) === 'SELL_NOW');
    const sorted = [...sellNow].sort((a, b) => {
      const aBoth = POSSIBLE_STATUSES.includes(a.status) && a.pos?.status === 'POSSIBLE';
      const bBoth = POSSIBLE_STATUSES.includes(b.status) && b.pos?.status === 'POSSIBLE';
      if (aBoth && !bBoth) return -1;
      if (!aBoth && bBoth) return 1;
      const aName = nameByIso[a.target] || a.target;
      const bName = nameByIso[b.target] || b.target;
      return aName.localeCompare(bName);
    });
    return sorted.slice(0, 3).map(r => {
      const name = nameByIso[r.target] || r.target;
      const goOk = POSSIBLE_STATUSES.includes(r.status);
      const posOk = r.pos?.status === 'POSSIBLE';
      let badge = 'GO';
      if (goOk && posOk) badge = 'GO + PoS';
      else if (posOk) badge = 'PoS';
      return { iso: r.target, name, badge };
    });
  }, [certRoutes, filter, nameByIso]);

  const filteredCertRoutes = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    let list = certRoutes;
    if (q) {
      list = list.filter(r => {
        const name = (nameByIso[r.target] || r.target).toLowerCase();
        return name.includes(q) || r.target.toLowerCase().includes(q);
      });
    }
    return list;
  }, [certRoutes, summarySearch, nameByIso]);

  const summaryGroups = useMemo(() => {
    const sellNow: CertificateRoute[] = [];
    const checkFirst: CertificateRoute[] = [];
    const closed: CertificateRoute[] = [];
    const noData: CertificateRoute[] = [];

    filteredCertRoutes.forEach(r => {
      const cat = classifyRoute(r, filter);
      if (cat === 'SELL_NOW') sellNow.push(r);
      else if (cat === 'CHECK_FIRST') checkFirst.push(r);
      else if (cat === 'CLOSED') closed.push(r);
      else noData.push(r);
    });

    const sortFn = (a: CertificateRoute, b: CertificateRoute) => {
      const aName = nameByIso[a.target] || a.target;
      const bName = nameByIso[b.target] || b.target;
      return aName.localeCompare(bName);
    };

    return {
      sellNow: sellNow.sort(sortFn),
      checkFirst: checkFirst.sort(sortFn),
      closed: closed.sort(sortFn),
      noData: noData.sort(sortFn),
    };
  }, [filteredCertRoutes, filter, nameByIso]);

  const handleCopyList = async () => {
    const groups: Record<'SELL_NOW' | 'CHECK_FIRST' | 'CLOSED', string[]> = {
      SELL_NOW: [],
      CHECK_FIRST: [],
      CLOSED: [],
    };
    certRoutes.forEach(r => {
      const cat = classifyRoute(r, filter);
      if (cat === 'SELL_NOW' || cat === 'CHECK_FIRST' || cat === 'CLOSED') {
        const name = nameByIso[r.target] || r.target;
        const how = getPlainLanguageHow(r, cat);
        groups[cat].push(`- ${name}: ${how}`);
      }
    });

    const lines = [
      `Where can ${originMeta.name} biomethane be sold? (Filter: ${FILTER_CONFIG[filter].shortLabel})`,
      '',
      `Ready to trade (${groups.SELL_NOW.length}):`,
      ...(groups.SELL_NOW.length > 0 ? groups.SELL_NOW : ['- None']),
      '',
      `Review needed / workaround (${groups.CHECK_FIRST.length}):`,
      ...(groups.CHECK_FIRST.length > 0 ? groups.CHECK_FIRST : ['- None']),
      '',
      `Closed / domestic only (${groups.CLOSED.length}):`,
      ...(groups.CLOSED.length > 0 ? groups.CLOSED : ['- None']),
      '',
      AUDIT_REF,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const tradeableBreakdown = useMemo(() => {
    let both = 0;
    let certOnly = 0;
    let posOnly = 0;
    certRoutes.forEach(r => {
      const cat = classifyRoute(r, filter);
      if (cat === 'SELL_NOW') {
        const goPossible = POSSIBLE_STATUSES.includes(r.status);
        const posPossible = r.pos?.status === 'POSSIBLE';
        if (goPossible && posPossible) both++;
        else if (goPossible) certOnly++;
        else if (posPossible) posOnly++;
      }
    });
    return { both, certOnly, posOnly };
  }, [certRoutes, filter]);

  const posOpenId = (r: CertificateRoute): string | null => {
    if (!r.pos || r.pos.status !== 'OPEN') return null;
    return getPosRoute(r.origin, r.target).schemes.find(x => x.status === 'OPEN' && x.openQuestionId)?.openQuestionId ?? null;
  };
  const currentRoute = useMemo(() => getCertificateRoute(originMeta.iso, targetMeta.iso), [originMeta.iso, targetMeta.iso]);

  const selectedRoute = useMemo(() => {
    return getCertificateRoute(originMeta.iso, selectedMeta.iso);
  }, [originMeta.iso, selectedMeta.iso]);

  const selectedPlaybook = useMemo(() => {
    return getTradePlaybook(originMeta.iso, selectedMeta.iso, selectedRoute);
  }, [originMeta.iso, selectedMeta.iso, selectedRoute]);

  const currentPlaybook = useMemo(() => {
    return getTradePlaybook(originMeta.iso, targetMeta.iso, currentRoute);
  }, [originMeta.iso, targetMeta.iso, currentRoute]);

  const corridorCalculation = useMemo(() => {
    return calculateLogisticsRoute(originMeta.iso, targetMeta.iso);
  }, [originMeta.iso, targetMeta.iso]);

  const dijkstraPath = useMemo(() => {
    return calculateDijkstraCorridor(originMeta.iso, targetMeta.iso);
  }, [originMeta.iso, targetMeta.iso]);

  const handleCountryClick = (cName: string) => {
    const cMeta = COUNTRIES[cName];
    if (!cMeta) return;

    setSelectedCountryName(cName);
    if (view === 'SELL') {
      if (cName === origin) {
        return;
      }
      setTarget(cName);
      if (isMobile) {
        setPanelOpen(true);
      }
      return;
    }
    if (mode === 'ORIGIN') {
      if (cName !== target) setOrigin(cName);
    } else {
      if (cName !== origin) setTarget(cName);
    }
    if (isMobile) {
      setPanelOpen(true);
    }
  };

  // Right-click menu: picking the other end of the corridor swaps the pair instead of making origin == target.
  const setOriginFromMenu = (cName: string) => {
    if (cName === target) setTarget(origin);
    setOrigin(cName);
    setSelectedCountryName(cName);
  };

  const setTargetFromMenu = (cName: string) => {
    if (cName === origin) setOrigin(target);
    setTarget(cName);
    setSelectedCountryName(cName);
  };

  const handleSwapCorridor = () => {
    const prevOrigin = origin;
    const prevTarget = target;
    setOrigin(prevTarget);
    setTarget(prevOrigin);
    setSelectedCountryName(prevTarget);
  };

  const handleSimulateTrade = () => {
    navigate(buildDealUrl({
      originCountry: originMeta.iso,
      marketId: getDefaultMarketForOrigin(targetMeta.iso),
    }));
  };

  const sortedCountries = useMemo(() => {
    return Object.entries(COUNTRIES).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const labelPx = isMobile ? '13px' : '12px';

  const mapSvg = (
          <ComposableMap
            projection="geoMercator"
            width={isMobile ? 420 : 800}
            height={600}
            projectionConfig={{
              scale: isMobile ? 560 : 680,
              center: [12, 54],
            }}
            style={
              isMobile
                ? { width: '100%', height: '100%' }
                : { position: 'absolute', inset: 0, width: '100%', height: '100%' }
            }
          >
            <ZoomableGroup zoom={zoomLevel / 3.6} center={[mapCenter[0] - panelOffsetDeg, mapCenter[1]]}>
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.filter(geo => COUNTRIES[geo.properties.name]).map(geo => {
                    const name = geo.properties.name;
                    const cMeta = COUNTRIES[name];
                    const status = cMeta ? cMeta.status : 'NONE';
                    let fill = STATUS_CONFIG[status].fill;
                    if (view === 'SELL') {
                      fill = !cMeta
                        ? STATUS_CONFIG.NONE.fill
                        : name === origin
                        ? 'var(--color-text)'
                        : SELL_FILL[classifyRoute(routeByIso[cMeta.iso], filter)];
                    }
                    const isOrigin = name === origin;
                    const isTarget = name === target;
                    const isHovered = hoveredCountry?.name === name || (isMobile && name === selectedCountryName);

                    let stroke = 'var(--color-bg)';
                    let strokeWidth = 0.6;
                    if (isOrigin) {
                      stroke = 'var(--color-text)';
                      strokeWidth = 2.2;
                    } else if (isTarget) {
                      stroke = 'var(--color-accent)';
                      strokeWidth = 2.2;
                    } else if (isHovered) {
                      stroke = 'var(--color-text)';
                      strokeWidth = 1.2;
                    }

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => handleCountryClick(name)}
                        onContextMenu={e => {
                          if (!cMeta || isMobile) return;
                          e.preventDefault();
                          setCtxMenu({ name, x: e.clientX, y: e.clientY });
                        }}
                        onMouseEnter={() => {
                          if (cMeta) setHoveredCountry(cMeta);
                        }}
                        onMouseLeave={() => setHoveredCountry(null)}
                        style={{
                          default: { fill, stroke, strokeWidth, outline: 'none', cursor: cMeta ? 'pointer' : 'default' },
                          hover: { fill, stroke, strokeWidth: 1.5, outline: 'none', cursor: cMeta ? 'pointer' : 'default' },
                          pressed: { fill, stroke, strokeWidth, outline: 'none' },
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {/* Active Logistics Corridor Line */}
              {originMeta && targetMeta && originMeta.iso !== targetMeta.iso && (
                <>
                  <Line
                    from={originMeta.center}
                    to={targetMeta.center}
                    stroke="var(--color-bg)"
                    strokeWidth={5.5}
                    strokeOpacity={0.85}
                  />
                  <Line
                    from={originMeta.center}
                    to={targetMeta.center}
                    stroke="var(--color-accent)"
                    strokeWidth={2.2}
                    strokeDasharray="6 5"
                    className="flow"
                  />
                  <Marker coordinates={originMeta.center}>
                    <circle r={4} fill="var(--color-text)" />
                  </Marker>
                  <Marker coordinates={targetMeta.center}>
                    <circle r={4.6} fill="var(--color-accent)" />
                  </Marker>
                </>
              )}

              {/* Country ISO and Plant Labels */}
              {Object.entries(COUNTRIES).map(([name, cMeta]) => {
                const onOriginFill = view !== 'COMPLIANCE' && name === origin;
                return (
                <Marker key={cMeta.iso} coordinates={cMeta.center}>
                  <text
                    textAnchor="middle"
                    y={-2}
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: labelPx,
                      fill: onOriginFill ? 'var(--color-bg)' : 'var(--color-text)',
                      paintOrder: 'stroke',
                      stroke: onOriginFill ? 'var(--color-text)' : 'var(--color-bg)',
                      strokeWidth: '2.5px',
                      strokeLinejoin: 'round',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {cMeta.iso}
                  </text>
                  <text
                    textAnchor="middle"
                    y={12}
                    className="num"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: labelPx,
                      fill: onOriginFill ? 'var(--color-bg)' : 'color-mix(in srgb, var(--color-text) 70%, transparent)',
                      paintOrder: 'stroke',
                      stroke: onOriginFill ? 'var(--color-text)' : 'var(--color-bg)',
                      strokeWidth: '2px',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {cMeta.plants}
                  </text>
                </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
  );

  const corridorStrip = (
        <div className="map-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderTop: '2px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
            <div className="eyebrow">Active corridor</div>
            <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px' }}>
              {originMeta.iso} ({originMeta.name}) ➔ {targetMeta.iso} ({targetMeta.name})
            </div>
            <div style={{ fontSize: '12px' }} className="mut">
              {dijkstraPath.segments.length > 0
                ? `${dijkstraPath.path.join(' → ')} (${dijkstraPath.distanceKm} km · ${dijkstraPath.segments.length} hops)`
                : 'Direct / Single-area corridor'}
            </div>
          </div>
          <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
            <div className="eyebrow">Transit tariff</div>
            <div className="num" style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px' }}>
              {corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh !== null
                ? `€${corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)} / MWh`
                : '€1.80 / MWh'}
            </div>
            <div style={{ fontSize: '12px' }} className="mut">
              {corridorCalculation.modes.physicalPipeline.regulatoryFeasibility === 'HIGH'
                ? 'Single-zone / interconnected transit'
                : 'Multi-zone transit · PRISMA booking required'}
            </div>
          </div>
          <div style={{ padding: '12px 18px' }}>
            <div className="eyebrow">{view === 'SELL' ? 'Trade Playbook' : 'Certificate route'}</div>
            {view === 'SELL' ? (
              <>
                <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="map-status-dot"
                    style={{
                      backgroundColor:
                        classifyRoute(currentRoute, filter) === 'SELL_NOW'
                          ? 'var(--color-status-pass-text)'
                          : classifyRoute(currentRoute, filter) === 'CHECK_FIRST'
                          ? 'var(--color-status-warn-text)'
                          : 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))',
                    }}
                  />
                  {currentPlaybook.badge}
                </div>
                <div style={{ fontSize: '12px' }} className="mut">
                  {currentPlaybook.structureTitle}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px' }}>
                  {CERT_ROUTE_LABELS[currentRoute.status]}
                </div>
                <div style={{ fontSize: '12px' }} className="mut">
                  {currentRoute.hubs.length > 0
                    ? currentRoute.hubs.map(h => (h === 'AIB' ? 'AIB' : 'ERGaR')).join(' + ')
                    : firstSentence(currentRoute.reason)}
                </div>
                <div style={{ fontSize: '12px', overflowWrap: 'anywhere' }} className="mut">
                  PoS: {currentRoute.pos ? currentRoute.pos.status : 'NO_DATA'}
                  {currentRoute.pos?.schemeName ? ` · ${currentRoute.pos.schemeName}` : ''}
                </div>
              </>
            )}
          </div>
        </div>
  );

  const viewToggle = (touch: boolean) => (
    <div role="group" aria-label="Map view">
      <div className="eyebrow">Map view</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
        <button
          type="button"
          className={`btn ${view === 'SELL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: touch ? '0 8px' : '3px 8px', fontSize: '12px', flex: '1 1 auto', whiteSpace: 'nowrap', minHeight: touch ? '44px' : undefined }}
          aria-pressed={view === 'SELL'}
          onClick={() => setView('SELL')}
        >
          Trade Opportunities
        </button>
        <button
          type="button"
          className={`btn ${view === 'COMPLIANCE' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: touch ? '0 8px' : '3px 8px', fontSize: '12px', flex: '1 1 auto', whiteSpace: 'nowrap', minHeight: touch ? '44px' : undefined }}
          aria-pressed={view === 'COMPLIANCE'}
          onClick={() => setView('COMPLIANCE')}
        >
          Compliance status
        </button>
      </div>
      {view === 'SELL' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <span className="eyebrow" style={{ marginRight: '4px', fontSize: '11px' }}>Trade mode:</span>
            {(['ALL', 'GO', 'POS'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: touch ? '0 6px' : '2px 6px', fontSize: '11px', minHeight: touch ? '36px' : undefined }}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {FILTER_CONFIG[f].shortLabel}
              </button>
            ))}
          </div>
          <div className="map-filter-banner" style={{ marginTop: '8px' }}>
            <strong style={{ color: 'var(--color-text)' }}>{FILTER_CONFIG[filter].shortLabel}:</strong> {FILTER_CONFIG[filter].desc}
          </div>
        </>
      )}
    </div>
  );

  const legendList = (fontPx: number, swatchPx: number, gap: number) =>
    view === 'SELL' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
        {SELL_LEGEND.map(l => (
          <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: `${fontPx}px` }}>
            <span style={{ width: `${swatchPx}px`, height: `${swatchPx}px`, flex: 'none', backgroundColor: l.swatch, border: '1px solid var(--color-divider)' }} />
            <span style={{ flex: 1 }}>{l.label}</span>
            {l.key !== 'ORIGIN' ? (
              <span className="num mut" style={{ fontSize: '12px' }}>{categoryCounts[l.key]}</span>
            ) : (
              <span className="num mut" style={{ fontSize: '12px' }}>{originMeta.iso}</span>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
        {(['ACTIVE', 'EMERGING', 'FUTURE_2028', 'RESTRICTED'] as const).map(st => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: `${fontPx}px` }}>
            <span style={{ width: `${swatchPx}px`, height: `${swatchPx}px`, flex: 'none', backgroundColor: STATUS_CONFIG[st].swatch }} />
            <span style={{ flex: 1 }}>{STATUS_CONFIG[st].label}</span>
            <span className="num mut" style={{ fontSize: '12px' }}>{statusCounts[st]}</span>
          </div>
        ))}
      </div>
    );

  const originCaveat = ORIGIN_CAVEATS[originMeta.iso];

  const summaryCard = (
    <div className="map-summary-card" data-testid="map-summary-card">
      <div className="eyebrow" style={{ fontWeight: 800 }}>
        {originMeta.name.toUpperCase()} · {originMeta.plants} plants · {originMeta.twh} TWh
      </div>
      <div className="map-summary-dots">
        <span className="map-summary-dot-item">
          <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-pass-text)' }} />
          Ready to trade <span className="num">{categoryCounts.SELL_NOW}</span>
        </span>
        <span className="map-summary-dot-item">
          <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-warn-text)' }} />
          Review needed <span className="num">{categoryCounts.CHECK_FIRST}</span>
        </span>
        <span className="map-summary-dot-item">
          <span className="map-status-dot" style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))' }} />
          Closed <span className="num">{categoryCounts.CLOSED}</span>
        </span>
      </div>

      {tradeableBreakdown.both + tradeableBreakdown.certOnly + tradeableBreakdown.posOnly > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {tradeableBreakdown.both > 0 && (
            <span className="chip chip-pass" style={{ fontSize: '11px', padding: '1px 6px' }}>
              {tradeableBreakdown.both} Dual Option (GO + PoS)
            </span>
          )}
          {tradeableBreakdown.certOnly > 0 && (
            <span className="chip chip-pass" style={{ fontSize: '11px', padding: '1px 6px' }}>
              {tradeableBreakdown.certOnly} Certificates Only
            </span>
          )}
          {tradeableBreakdown.posOnly > 0 && (
            <span className="chip chip-pass" style={{ fontSize: '11px', padding: '1px 6px' }}>
              {tradeableBreakdown.posOnly} Compliance Quota Only
            </span>
          )}
        </div>
      )}

      {topRoutes.length > 0 && (
        <div className="mut" style={{ fontSize: '12px', lineHeight: 1.45, marginBottom: '12px' }}>
          <strong>Top routes: </strong>
          {topRoutes.map((tr, idx) => (
            <span key={tr.iso}>
              {idx > 0 && ' · '}
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  font: 'inherit',
                }}
                onClick={() => {
                  setSelectedCountryName(tr.name);
                  setTarget(tr.name);
                }}
                title={`Inspect ${originMeta.iso} ➔ ${tr.iso}`}
              >
                {tr.name} ({tr.badge})
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-block"
        style={{ fontSize: '13px', fontWeight: 700, padding: '7px 12px' }}
        onClick={() => setIsSummaryOpen(true)}
        data-testid="open-route-summary-btn"
      >
        Open full trade summary ⤢
      </button>
    </div>
  );

  const playbookCard = (
    <div className="map-playbook-card" data-testid="trade-playbook-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <span className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>Trade Execution Playbook</span>
        <span className={`chip ${selectedPlaybook.chipClass}`} style={{ fontSize: '11px', fontWeight: 700 }}>
          {selectedPlaybook.badge}
        </span>
      </div>

      <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px', lineHeight: 1.3 }}>
        {originMeta.iso} ➔ {selectedMeta.iso}: {selectedPlaybook.structureTitle}
      </div>

      <div style={{ fontSize: '12px', lineHeight: 1.45, color: 'var(--color-text)', marginBottom: '10px' }}>
        {selectedPlaybook.structureDesc}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)', marginBottom: '12px' }}>
        <div>
          <div className="eyebrow" style={{ fontSize: '10px', marginBottom: '2px' }}>Statutory Scheme &amp; Destination</div>
          <div style={{ fontWeight: 700, fontSize: '12px' }}>{selectedPlaybook.schemeTitle}</div>
          <div className="mut" style={{ fontSize: '11px', marginTop: '1px', lineHeight: 1.4 }}>{selectedPlaybook.schemeDesc}</div>
        </div>
        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '6px' }}>
          <div className="eyebrow" style={{ fontSize: '10px', marginBottom: '2px' }}>How to Execute</div>
          <div style={{ fontWeight: 700, fontSize: '12px' }}>{selectedPlaybook.executionTitle}</div>
          <div className="mut" style={{ fontSize: '11px', marginTop: '1px', lineHeight: 1.4 }}>{selectedPlaybook.executionDesc}</div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ fontSize: '13px', fontWeight: 700, padding: '8px 12px' }}
        onClick={() => {
          navigate(buildDealUrl({
            originCountry: originMeta.iso,
            marketId: getDefaultMarketForOrigin(selectedMeta.iso),
          }));
        }}
      >
        Simulate {originMeta.iso} ➔ {selectedMeta.iso} in Trade Builder ➔
      </button>
    </div>
  );

  const renderSummaryRow = (r: CertificateRoute, cat: SellCategory) => {
    const name = nameByIso[r.target] || r.target;
    const isExpanded = Boolean(expandedRows[r.target]);
    const how = getPlainLanguageHow(r, cat);
    const hasCond = r.conditions.length > 0 || Boolean(r.pos?.conditions);
    const oq = r.openQuestionId || posOpenId(r);
    const hasOq = cat === 'CHECK_FIRST' && Boolean(oq);

    const playbook = getTradePlaybook(originMeta.iso, r.target, r);
    const goDetails = getGoRoute(r.origin, r.target);
    const posDetails = getPosRoute(r.origin, r.target);

    const allSources = [
      ...(goDetails.sources || []),
      ...(posDetails.schemes?.flatMap(s => s.sources || []) || []),
    ];
    const uniqueSources = allSources.filter((s, idx, arr) => arr.findIndex(x => x.url === s.url) === idx);

    return (
      <div key={r.target} className="map-route-row-item">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 6px', width: '100%', boxSizing: 'border-box' }}>
          <button
            type="button"
            className="map-route-row-btn"
            style={{ padding: '4px 0' }}
            onClick={() => setExpandedRows(prev => ({ ...prev, [r.target]: !prev[r.target] }))}
            aria-expanded={isExpanded}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 auto', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{name}</span>
              <span className={`chip ${playbook.chipClass}`} style={{ fontSize: '10px', padding: '1px 5px' }}>
                {playbook.badge}
              </span>
              <span className="mut" style={{ fontSize: '11px' }}>{how}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
              {hasCond && <span className="chip" style={{ fontSize: '10px', padding: '1px 5px' }}>conditions</span>}
              {hasOq && <span className="chip" style={{ fontSize: '10px', padding: '1px 5px' }}>✉ question</span>}
              {isExpanded ? <ChevronDown style={{ width: '15px', height: '15px' }} /> : <ChevronRight style={{ width: '15px', height: '15px' }} />}
            </div>
          </button>

          {playbook.isTradeable && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '11px', padding: '0 8px', height: '26px', minHeight: '26px', flex: '0 0 auto', whiteSpace: 'nowrap' }}
              onClick={e => {
                e.stopPropagation();
                setIsSummaryOpen(false);
                navigate(buildDealUrl({
                  originCountry: originMeta.iso,
                  marketId: getDefaultMarketForOrigin(r.target),
                }));
              }}
              title={`Simulate ${originMeta.iso} ➔ ${r.target} in Trade Builder`}
            >
              Trade ➔
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="map-route-expanded-card" data-testid={`expanded-${r.target}`}>
            <div style={{ padding: '8px 10px', backgroundColor: 'color-mix(in srgb, var(--color-surface) 60%, transparent)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)' }}>
              <div className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 800, marginBottom: '2px' }}>
                Commercial Trade Playbook: {playbook.structureTitle}
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.45, marginBottom: '6px' }}>{playbook.structureDesc}</div>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div><strong>Scheme:</strong> {playbook.schemeTitle} — {playbook.schemeDesc}</div>
                <div><strong>Execution:</strong> {playbook.executionTitle} — {playbook.executionDesc}</div>
              </div>
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: '3px' }}>GO (Book &amp; Claim)</div>
              <div><strong>Status:</strong> {CERT_ROUTE_LABELS[r.status]} · <strong>Via:</strong> {goDetails.via && goDetails.via !== 'NONE' ? (goDetails.via === 'ERGAR' ? 'ERGaR' : goDetails.via) : '—'} · <strong>Evidence:</strong> {EVIDENCE_GRADE_TEXT[goDetails.grade] || goDetails.grade}</div>
              <div className="mut" style={{ marginTop: '2px' }}>{goDetails.reason}</div>
              {goDetails.conditions && goDetails.conditions.length > 0 && (
                <div style={{ marginTop: '3px' }}><strong>Conditions:</strong> {goDetails.conditions.join('; ')}</div>
              )}
              {goDetails.workaround && (
                <div style={{ marginTop: '3px' }}><strong>Workaround (ex-domain):</strong> {goDetails.workaround}</div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '8px' }}>
              <div className="eyebrow" style={{ marginBottom: '3px' }}>PoS (Mass Balance Quota)</div>
              <div><strong>Status:</strong> {posDetails.status}</div>
              {posDetails.schemes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {posDetails.schemes.map(s => (
                    <div key={s.schemeId} style={{ paddingLeft: '8px', borderLeft: '2px solid var(--color-divider)' }}>
                      <div><strong>{s.schemeName}</strong> ({s.status}){s.legalBasis ? ` · ${s.legalBasis}` : ''}</div>
                      <div className="mut">{s.reason}</div>
                      {s.conditions && <div><strong>Conditions:</strong> {s.conditions}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mut">{r.pos?.reason || 'No specific national schemes found.'}</div>
              )}
            </div>

            {oq && (
              <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '8px' }}>
                <span className="eyebrow">Open question</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{oq}</div>
              </div>
            )}

            {uniqueSources.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '8px' }}>
                <div className="eyebrow" style={{ marginBottom: '4px' }}>Sources &amp; citations</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {uniqueSources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: 'var(--color-accent)', textDecoration: 'underline', overflowWrap: 'anywhere' }}
                    >
                      {s.claim} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const routeSummaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {originCaveat && (
        <div style={{ marginBottom: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '4px 8px' }}
            onClick={() => setIsCaveatOpen(o => !o)}
            aria-expanded={isCaveatOpen}
          >
            ⓘ Notes on {originMeta.name} {isCaveatOpen ? '▴' : '▾'}
          </button>
          {isCaveatOpen && (
            <div
              style={{
                marginTop: '6px',
                padding: '10px 12px',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-control)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              {originCaveat.text}
            </div>
          )}
        </div>
      )}

      {/* Filter and search controls bar */}
      <div className="map-modal-controls-row" style={{ marginTop: 0, marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span className="eyebrow">Filter:</span>
          {(['ALL', 'GO', 'POS'] as const).map(f => (
            <button
              key={f}
              type="button"
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '12px' }}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {FILTER_CONFIG[f].shortLabel}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search destination..."
            value={summarySearch}
            onChange={e => setSummarySearch(e.target.value)}
            className="input"
            style={{ height: '30px', minHeight: '30px', fontSize: '12px', padding: '2px 8px', width: '180px' }}
            aria-label="Filter destinations by country name"
          />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ height: '30px', minHeight: '30px', fontSize: '12px', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            onClick={handleCopyList}
            title="Copy list to clipboard"
          >
            {copied ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
            {copied ? 'Copied' : 'Copy list'}
          </button>
        </div>
      </div>

      <div className="map-filter-banner" style={{ marginBottom: '12px' }}>
        <strong style={{ color: 'var(--color-text)' }}>{FILTER_CONFIG[filter].shortLabel}:</strong> {FILTER_CONFIG[filter].desc}
      </div>

      {/* Scrollable list of sections */}
      <div className="map-modal-body" style={{ padding: 0 }}>
        {/* Ready to trade section */}
        <div style={{ marginBottom: '16px' }}>
          <div className="eyebrow" style={{ padding: '6px 0', borderBottom: '2px solid var(--color-status-pass-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-pass-text)' }} />
            Ready to trade · {summaryGroups.sellNow.length}
          </div>
          {summaryGroups.sellNow.length > 0 ? (
            summaryGroups.sellNow.map(r => renderSummaryRow(r, 'SELL_NOW'))
          ) : (
            <div className="mut" style={{ fontSize: '12px', padding: '8px 10px' }}>No routes in this category.</div>
          )}
        </div>

        {/* Review needed section */}
        <div style={{ marginBottom: '16px' }}>
          <div className="eyebrow" style={{ padding: '6px 0', borderBottom: '2px solid var(--color-status-warn-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-warn-text)' }} />
            Review needed / workaround · {summaryGroups.checkFirst.length}
          </div>
          {summaryGroups.checkFirst.length > 0 ? (
            summaryGroups.checkFirst.map(r => renderSummaryRow(r, 'CHECK_FIRST'))
          ) : (
            <div className="mut" style={{ fontSize: '12px', padding: '8px 10px' }}>No routes in this category.</div>
          )}
        </div>

        {/* Closed section */}
        <div style={{ marginBottom: '16px' }}>
          <div className="eyebrow" style={{ padding: '6px 0', borderBottom: '2px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="map-status-dot" style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))' }} />
            Closed / domestic only · {summaryGroups.closed.length}
          </div>
          {summaryGroups.closed.length > 0 ? (
            summaryGroups.closed.map(r => renderSummaryRow(r, 'CLOSED'))
          ) : (
            <div className="mut" style={{ fontSize: '12px', padding: '8px 10px' }}>No routes in this category.</div>
          )}
        </div>

        {summaryGroups.noData.length > 0 && (
          <div className="mut" style={{ fontSize: '12px', padding: '10px 0' }}>
            Not researched: {summaryGroups.noData.map(r => nameByIso[r.target] || r.target).join(', ')}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="map-modal-footer" style={{ padding: '10px 0 0' }}>
        {AUDIT_REF}
      </div>
    </div>
  );

  const railBody = (
    <>
        <div style={{ padding: '16px 18px', borderBottom: '2px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">Jurisdiction</span>
            <span className={`chip ${selectedMeta.status === 'ACTIVE' ? 'chip-a' : ''}`}>
              {STATUS_CONFIG[selectedMeta.status].label}
            </span>
          </div>
          <h4 style={{ margin: '6px 0 2px', fontSize: '20px', fontWeight: 800 }}>{selectedMeta.name}</h4>
          <div style={{ fontSize: '12px' }} className="mut">
            {selectedMeta.legal}
          </div>

          {/* Prominent One-Click Assignment Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              className={`btn ${origin === selectedMeta.name ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 8px' }}
              onClick={() => setOrigin(selectedMeta.name)}
            >
              {origin === selectedMeta.name ? '✓ Origin (Active)' : 'Set as Origin'}
            </button>
            <button
              type="button"
              className={`btn ${target === selectedMeta.name ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 8px' }}
              onClick={() => setTarget(selectedMeta.name)}
            >
              {target === selectedMeta.name ? '✓ Target (Active)' : 'Set as Target'}
            </button>
          </div>
        </div>

        {view === 'SELL' && (
          selectedMeta.iso !== originMeta.iso ? (
            <>
              {playbookCard}
              {summaryCard}
            </>
          ) : (
            summaryCard
          )
        )}

        {/* 2x2 Stat Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            backgroundColor: 'var(--color-divider)',
          }}
        >
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
            <div className="eyebrow">Active plants</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>{selectedMeta.plants}</div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
            <div className="eyebrow">Installed</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>{selectedMeta.twh} TWh</div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
            <div className="eyebrow">Avg plant size</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>
              {((selectedMeta.twh * 1000) / Math.max(1, selectedMeta.plants)).toFixed(1)} GWh
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
            <div className="eyebrow">Grid connected</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>96%</div>
          </div>
        </div>

        {/* Delivery Options */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--color-divider)',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: '8px' }}>
            Delivery options · {originMeta.iso} → {selectedMeta.iso}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>A · Virtual UDB swap</span>
                <span className="num">
                  €{corridorCalculation.modes.virtualSwap.totalCostEurMwh !== null
                    ? corridorCalculation.modes.virtualSwap.totalCostEurMwh.toFixed(2)
                    : '1.80'}
                </span>
              </div>
              <div style={{ fontSize: '12px' }} className="mut">
                {corridorCalculation.modes.virtualSwap.regulatoryFeasibility === 'CONTESTED'
                  ? 'Recommended · contested in some member states'
                  : 'Single mass balance zone transfer'}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>B · Continuous grid path</span>
                <span className="num">
                  €{corridorCalculation.modes.physicalPipeline.totalCostEurMwh !== null
                    ? corridorCalculation.modes.physicalPipeline.totalCostEurMwh.toFixed(2)
                    : '3.20'}
                </span>
              </div>
              <div style={{ fontSize: '12px' }} className="mut">
                Multi-zone transit · PRISMA capacity required
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>C · Physical bio-LNG</span>
                <span className="num" style={{ color: corridorCalculation.modes.bioLng.totalCostEurMwh !== null ? 'var(--color-text)' : 'var(--color-accent-700)' }}>
                  {corridorCalculation.modes.bioLng.totalCostEurMwh !== null
                    ? `€${corridorCalculation.modes.bioLng.totalCostEurMwh.toFixed(2)}`
                    : 'Tariff incomplete'}
                </span>
              </div>
              <div style={{ fontSize: '12px' }} className="mut">
                Liquefaction leg unverified — never summed around a null tariff
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px' }}>
          <p style={{ fontSize: '12px', lineHeight: 1.55, margin: 0 }} className="mut">
            {selectedMeta.iso === 'DE'
              ? 'Largest compliance market in Europe. Double counting for advanced biofuels is abolished for 2026+ compliance under the Zweites Gesetz zur Weiterentwicklung der THG-Quote (Bundestag Drucksache 21/5530; promulgation date not yet confirmed); single counting (1×) applies.'
              : selectedMeta.iso === 'GB'
              ? 'Non-EU territory. RTFO certificates require Great Britain grid injection; non-UK injected biomethane cannot evidence UDB ingestion into EU without physical segregation.'
              : `Active regulatory mechanism for ${selectedMeta.name}. Consignments must evidence mass balance custody and statutory scheme certification.`}
          </p>
        </div>
    </>
  );

  const railButtons = (
    <>
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 0 }}
            onClick={handleSimulateTrade}
          >
            Simulate in trade builder
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ marginTop: 0 }}
            onClick={() => setIsLogisticsOpen(true)}
          >
            Open delivery playbook
          </button>
    </>
  );

  const openPlaybook = () => {
    setPanelOpen(false);
    setIsLogisticsOpen(true);
  };

  if (isMobile) {
    const transitFigure =
      corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh !== null
        ? `€${corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)}`
        : '€1.80';
    return (
      <div className="map-m-root">
        {/* Compact control row: title + Trade CTA, then Origin / swap / Target */}
        <div className="map-m-controls">
          <div className="map-m-titlerow">
            <h3 className="ptitle m-page-title" style={{ fontSize: '16px' }}>Compliance &amp; logistics map</h3>
            <button type="button" className="btn btn-primary map-m-trade" onClick={handleSimulateTrade}>
              Trade →
            </button>
          </div>
          <div className="map-m-selects">
            <label className="map-m-field">
              <span className="eyebrow" style={{ color: 'var(--color-text)', fontWeight: 800 }}>Origin</span>
              <select value={origin} onChange={e => setOrigin(e.target.value)} className="input" aria-label="Origin country">
                {sortedCountries.map(([name, c]) => (
                  <option key={c.iso} value={name}>{c.iso} · {c.name} ({c.plants}p)</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-secondary map-m-swap"
              aria-label="Swap corridor direction"
              onClick={handleSwapCorridor}
            >
              <ArrowLeftRight style={{ width: '16px', height: '16px' }} />
            </button>
            <label className="map-m-field">
              <span className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>Target</span>
              <select
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="input"
                aria-label="Target country"
                style={{ borderColor: 'var(--color-accent)' }}
              >
                {sortedCountries.map(([name, c]) => (
                  <option key={c.iso} value={name}>{c.iso} · {c.name} ({c.status})</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Full-bleed map */}
        <div className="map-m-canvas">
          {mapSvg}

          <div className="map-m-zoom">
            <button type="button" className="btn btn-secondary" aria-label="Zoom in" onClick={() => setZoomLevel(z => Math.min(z + 1, 8))}>+</button>
            <button type="button" className="btn btn-secondary" aria-label="Zoom out" onClick={() => setZoomLevel(z => Math.max(z - 1, 1))}>−</button>
            <button type="button" className="btn btn-secondary" aria-label="Reset view" style={{ fontSize: '12px' }} onClick={() => { setZoomLevel(3.6); setMapCenter(MAP_HOME); }}>RST</button>
          </div>

          {view !== 'COMPLIANCE' ? (
            <div className="map-m-mode map-m-hint">{ROUTES_HINT}</div>
          ) : (
            <div className="map-m-mode" role="group" aria-label="Map click mode">
              <button
                type="button"
                className={`btn ${mode === 'ORIGIN' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode('ORIGIN')}
              >
                Set Origin
              </button>
              <button
                type="button"
                className={`btn ${mode === 'TARGET' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode('TARGET')}
              >
                Set Target
              </button>
            </div>
          )}

        </div>

        {/* Peek bar: tap to expand the full jurisdiction / corridor panel */}
        <button
          type="button"
          className="map-m-peek"
          onClick={() => setPanelOpen(true)}
          aria-label={`Open details for ${selectedMeta.name}`}
          data-testid="map-peek"
        >
          <span className="map-m-peek-handle" aria-hidden="true" />
          <span className="map-m-peek-top">
            <span className="map-m-peek-name">{selectedMeta.name}</span>
            <span className={`chip ${selectedMeta.status === 'ACTIVE' ? 'chip-a' : ''}`}>
              {STATUS_CONFIG[selectedMeta.status].label}
            </span>
          </span>
          <span className="map-m-peek-legal">{selectedMeta.legal}</span>
          <span className="map-m-peek-figs">
            <span>
              <span className="eyebrow">Plants</span>
              <span className="num map-m-fig">{selectedMeta.plants}</span>
            </span>
            <span>
              <span className="eyebrow">Installed</span>
              <span className="num map-m-fig">{selectedMeta.twh} TWh</span>
            </span>
            <span>
              <span className="eyebrow">{originMeta.iso} → {targetMeta.iso}</span>
              <span className="num map-m-fig">{transitFigure}/MWh</span>
            </span>
          </span>
        </button>

        <Sheet
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          title={`${originMeta.iso} → ${targetMeta.iso} corridor`}
          subtitle={`Selected: ${selectedMeta.name}`}
          variant="bottom"
          testId="map-panel-sheet"
          footer={
            <div className="map-m-actions">
              <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 0 }} onClick={handleSimulateTrade}>
                Simulate in trade builder
              </button>
              <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 0 }} onClick={openPlaybook}>
                Open delivery playbook
              </button>
            </div>
          }
        >
          <div className="map-m-sheet">
            {corridorStrip}
            {railBody}
            <div className="map-m-legend">
              {viewToggle(true)}
              <div className="eyebrow" style={{ margin: '14px 0 8px' }}>
                {view === 'SELL' ? `Trade Opportunities (${originMeta.iso})` : 'Compliance status'}
              </div>
              {legendList(13, 10, 6)}
              <div className="mut" style={{ fontSize: '12px', marginTop: '10px' }}>
                30 European jurisdictions · Interactive cross-border routing &amp; transmission tariffs
              </div>
            </div>
          </div>
        </Sheet>

        <Sheet
          open={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          title={`Commercial Trade Summary: ${originMeta.name} (${originMeta.iso})`}
          subtitle={`Ready to trade ${categoryCounts.SELL_NOW} · Review needed ${categoryCounts.CHECK_FIRST} · Closed ${categoryCounts.CLOSED}`}
          variant="bottom"
          testId="mobile-route-summary-sheet"
        >
          <div style={{ padding: '0 4px 16px', minHeight: 0 }}>
            {routeSummaryContent}
          </div>
        </Sheet>

        <LogisticsModal
          isOpen={isLogisticsOpen}
          onClose={() => setIsLogisticsOpen(false)}
          originCountry={originMeta.iso}
          targetCountry={selectedMeta.iso}
        />
      </div>
    );
  }


  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 350px',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* ─── Left: Map Canvas & Overlays ─── */}
      <div
        style={{
          borderRight: '2px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          height: 'calc(100dvh - 84px)',
          minHeight: '560px',
        }}
      >
        {/* Top Header & Fast Corridor Selectors Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '6px 18px',
            borderBottom: '2px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            flexWrap: 'nowrap',
          }}
        >
          <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '18px', rowGap: '2px' }}>
            <h3 className="ptitle" style={{ fontSize: '18px', margin: 0 }}>Compliance &amp; logistics map</h3>
            <div className="subttl" style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
              <span style={{ display: 'inline-flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', backgroundColor: 'var(--color-text)' }} />
                  Active · {statusCounts.ACTIVE}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', backgroundColor: 'var(--color-neutral-500)' }} />
                  Emerging · {statusCounts.EMERGING}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', backgroundColor: 'var(--color-accent)' }} />
                  Restricted · {statusCounts.RESTRICTED}
                </span>
              </span>
            </div>
          </div>

          {/* Quick Origin / Target Selector Bar */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-bg)',
              padding: '4px 8px',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-control)',
            }}
          >
            {/* Origin Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="eyebrow" style={{ color: 'var(--color-text)', fontWeight: 800 }}>Origin</span>
              <select
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="input"
                style={{
                  height: '28px',
                  minHeight: '28px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  width: '140px',
                  cursor: 'pointer',
                }}
              >
                {sortedCountries.map(([name, c]) => (
                  <option key={c.iso} value={name}>
                    {c.iso} · {c.name} ({c.plants}p)
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0, minHeight: '28px' }}
              title="Swap Origin and Target"
              aria-label="Swap corridor direction"
              onClick={handleSwapCorridor}
            >
              <ArrowLeftRight style={{ width: '13px', height: '13px' }} />
            </button>

            {/* Target Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>Target</span>
              <select
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="input"
                style={{
                  height: '28px',
                  minHeight: '28px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  width: '140px',
                  borderColor: 'var(--color-accent)',
                  cursor: 'pointer',
                }}
              >
                {sortedCountries.map(([name, c]) => (
                  <option key={c.iso} value={name}>
                    {c.iso} · {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Simulate CTA */}
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: '28px', minHeight: '28px', fontSize: '12px', padding: '0 10px', marginLeft: '4px' }}
              onClick={handleSimulateTrade}
            >
              Trade →
            </button>
          </div>

        </div>

        {/* Map Container */}
        <div ref={mapBoxRef} style={{ flex: 1, position: 'relative', minHeight: '440px', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
        {mapSvg}
        {ctxMenu && COUNTRIES[ctxMenu.name] && createPortal(
          (() => {
            const c = COUNTRIES[ctxMenu.name];
            const isO = ctxMenu.name === origin;
            const isT = ctxMenu.name === target;
            const run = (fn: () => void) => () => {
              fn();
              setCtxMenu(null);
            };
            const items: { label: string; onClick: () => void; disabled?: boolean }[] = [
              { label: isO ? 'Origin (current)' : 'Set as origin', onClick: run(() => setOriginFromMenu(ctxMenu.name)), disabled: isO },
              { label: isT ? 'Target (current)' : 'Set as target', onClick: run(() => setTargetFromMenu(ctxMenu.name)), disabled: isT },
              { label: 'Show country details', onClick: run(() => setSelectedCountryName(ctxMenu.name)) },
              {
                label: `Simulate ${originMeta.iso} → ${c.iso} in Trade Builder`,
                onClick: run(() => navigate(buildDealUrl({ originCountry: originMeta.iso, marketId: getDefaultMarketForOrigin(c.iso) }))),
                disabled: isO,
              },
              { label: 'Zoom to country', onClick: run(() => { setMapCenter(c.center); setZoomLevel(z => Math.max(z, 6)); }) },
            ];
            const W = 260;
            const H = 36 + items.length * 32;
            const left = Math.min(ctxMenu.x, window.innerWidth - W - 8);
            const top = Math.min(ctxMenu.y, window.innerHeight - H - 8);
            return (
              <div
                role="menu"
                aria-label={`${c.name} actions`}
                onMouseDown={e => e.stopPropagation()}
                onContextMenu={e => e.preventDefault()}
                style={{
                  position: 'fixed',
                  left,
                  top,
                  width: W,
                  zIndex: 2000,
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-divider)',
                  borderRadius: 'var(--radius-control)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '4px',
                }}
              >
                <div className="eyebrow" style={{ padding: '6px 10px 4px' }}>
                  {c.iso} · {c.name} · {STATUS_CONFIG[c.status].label}
                </div>
                {items.map(it => (
                  <button
                    key={it.label}
                    type="button"
                    role="menuitem"
                    className="map-ctx-item"
                    disabled={it.disabled}
                    onClick={it.onClick}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            );
          })(),
          document.body,
        )}

        {/* Overlay: Top-Right Zoom Buttons */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-control)', overflow: 'hidden', boxShadow: 'var(--shadow-card)', zIndex: 10 }}>
          <button type="button" className="btn btn-secondary" style={{ width: '28px', height: '28px', padding: 0, fontSize: '14px', fontWeight: 800, borderRadius: 0 }} aria-label="Zoom in" onClick={() => setZoomLevel(z => Math.min(z + 1, 8))}>+</button>
          <button type="button" className="btn btn-secondary" style={{ width: '28px', height: '28px', padding: 0, fontSize: '14px', fontWeight: 800, borderTop: 0, borderRadius: 0 }} aria-label="Zoom out" onClick={() => setZoomLevel(z => Math.max(z - 1, 1))}>−</button>
          <button type="button" className="btn btn-secondary" style={{ width: '28px', height: '28px', padding: 0, fontSize: '12px', borderTop: 0, borderRadius: 0 }} aria-label="Reset view" onClick={() => { setZoomLevel(3.6); setMapCenter(MAP_HOME); }}>RST</button>
        </div>

          {/* Overlay: Top-Left Legend & Click-Mode Switcher */}
          <div
            ref={optionsPanelRef}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              width: '300px',
              minWidth: '240px',
              maxWidth: '560px',
              maxHeight: 'calc(100% - 24px)',
              overflow: 'auto',
              resize: 'horizontal',
              backgroundColor: 'color-mix(in srgb, var(--color-surface) 96%, transparent)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-panel)',
              boxShadow: 'var(--shadow-card)',
              padding: '10px 12px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '12px', width: '100%', marginBottom: '8px' }}
              aria-expanded={controlsOpen}
              onClick={() => setControlsOpen(o => !o)}
            >
              {controlsOpen ? 'Hide map options ▴' : 'Map options (view · trade mode) ▾'}
            </button>
            {controlsOpen && (
              <>
                {viewToggle(false)}

                {view === 'COMPLIANCE' ? (
                  <div style={{ borderTop: '1px solid var(--color-divider)', marginTop: '8px', paddingTop: '8px' }}>
                    <div className="eyebrow">Map Click Mode</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className={`btn ${mode === 'ORIGIN' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '3px 8px', fontSize: '12px', flex: 1 }}
                        onClick={() => setMode('ORIGIN')}
                      >
                        Set Origin
                      </button>
                      <button
                        type="button"
                        className={`btn ${mode === 'TARGET' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '3px 8px', fontSize: '12px', flex: 1 }}
                        onClick={() => setMode('TARGET')}
                      >
                        Set Target
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '6px' }} className="mut">
                      Clicking a country sets it as <strong>{mode === 'ORIGIN' ? 'Origin' : 'Target'}</strong>.
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', marginTop: '8px' }} className="mut">{ROUTES_HINT}</div>
                )}
              </>
            )}

            <div style={{ borderTop: controlsOpen ? '1px solid var(--color-divider)' : 0, marginTop: controlsOpen ? '8px' : 0, paddingTop: controlsOpen ? '8px' : 0 }}>
              <div className="eyebrow" style={{ marginBottom: '5px' }}>
                {view === 'SELL' ? `Trade Opportunities (${originMeta.iso})` : 'Compliance status'}
              </div>
              {legendList(12, 9, 4)}
            </div>
          </div>


          {/* Overlay: Bottom-Right Hover Card */}
          {hoveredCountry && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                width: '248px',
                backgroundColor: 'color-mix(in srgb, var(--color-surface) 96%, transparent)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-panel)',
                boxShadow: 'var(--shadow-card)',
                padding: '10px 12px',
              }}
            >
              <div className="eyebrow">{view === 'SELL' ? 'Trade Opportunities' : STATUS_CONFIG[hoveredCountry.status].label}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', marginTop: '4px' }}>
                {hoveredCountry.name}
              </div>
              <div style={{ fontSize: '12px', marginTop: '2px' }} className="mut">
                {hoveredCountry.legal}
              </div>
              {view === 'SELL' && (
                <div style={{ marginTop: '6px', fontSize: '12px' }}>
                  {hoveredCountry.iso === originMeta.iso ? (
                    <strong>Selected origin</strong>
                  ) : (
                    (() => {
                      const r = routeByIso[hoveredCountry.iso];
                      const cat = classifyRoute(r, filter);
                      const pb = getTradePlaybook(originMeta.iso, hoveredCountry.iso, r);
                      const dotBg =
                        cat === 'SELL_NOW'
                          ? 'var(--color-status-pass-text)'
                          : cat === 'CHECK_FIRST'
                          ? 'var(--color-status-warn-text)'
                          : 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))';
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="map-status-dot" style={{ backgroundColor: dotBg }} />
                            <strong>{pb.badge}</strong>
                          </div>
                          <div className="mut" style={{ marginTop: '2px', overflowWrap: 'anywhere' }}>
                            {pb.structureTitle}
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '18px', marginTop: '8px' }}>
                <div>
                  <div className="eyebrow">Plants</div>
                  <div className="num" style={{ fontSize: '16px', fontWeight: 800 }}>{hoveredCountry.plants}</div>
                </div>
                <div>
                  <div className="eyebrow">Installed</div>
                  <div className="num" style={{ fontSize: '16px', fontWeight: 800 }}>{hoveredCountry.twh} TWh</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {corridorStrip}
      </div>

      {/* ─── Right Rail: Selected Jurisdiction ─── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-divider)',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          style={{ margin: '10px 18px 0', padding: '4px 10px', fontSize: '12px', alignSelf: 'flex-end' }}
          onClick={() => setIsDetailOpen(true)}
          data-testid="map-detail-expand"
        >
          Expand full screen ⤢
        </button>
        {railBody}
        <div
          style={{
            marginTop: 'auto',
            padding: '16px 18px',
            borderTop: '2px solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {railButtons}
        </div>
      </div>

      {/* Full-screen jurisdiction detail (desktop) */}
      {isDetailOpen && !isMobile && (
        <div
          className="map-route-summary-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedMeta.name} full detail`}
          data-testid="map-detail-fullscreen"
          onClick={e => {
            if (e.target === e.currentTarget) setIsDetailOpen(false);
          }}
        >
          <div
            className="map-route-summary-modal"
            style={{ width: 'min(1180px, 96vw)', maxWidth: '96vw', height: '92vh', maxHeight: '92vh' }}
          >
            <div className="map-modal-header">
              <div className="map-modal-title-row">
                <h2 className="map-modal-title">
                  {originMeta.iso} → {selectedMeta.iso}: {selectedMeta.name} detail
                </h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setIsDetailOpen(false)}
                  aria-label="Close full-screen detail"
                >
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
            </div>
            <div className="map-detail-cols" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
              {railBody}
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{railButtons}</div>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Modal */}
      <LogisticsModal
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
        originCountry={originMeta.iso}
        targetCountry={selectedMeta.iso}
      />

      {/* Route Summary Modal (Desktop) */}
      {isSummaryOpen && !isMobile && (
        <div
          className="map-route-summary-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-summary-title"
          onClick={e => {
            if (e.target === e.currentTarget) setIsSummaryOpen(false);
          }}
        >
          <div className="map-route-summary-modal">
            <div className="map-modal-header">
              <div className="map-modal-title-row">
                <div>
                  <h2 id="map-summary-title" className="map-modal-title">
                    Commercial Trade Summary: {originMeta.name} ({originMeta.iso})
                  </h2>
                  <div className="map-summary-dots" style={{ margin: '4px 0 0' }}>
                    <span className="map-summary-dot-item">
                      <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-pass-text)' }} />
                      Ready to trade <span className="num">{categoryCounts.SELL_NOW}</span>
                    </span>
                    <span className="map-summary-dot-item">
                      <span className="map-status-dot" style={{ backgroundColor: 'var(--color-status-warn-text)' }} />
                      Review needed <span className="num">{categoryCounts.CHECK_FIRST}</span>
                    </span>
                    <span className="map-summary-dot-item">
                      <span className="map-status-dot" style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))' }} />
                      Closed <span className="num">{categoryCounts.CLOSED}</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setIsSummaryOpen(false)}
                  aria-label="Close route summary"
                >
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '16px 20px', overflowY: 'hidden', minHeight: 0 }}>
              {routeSummaryContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
