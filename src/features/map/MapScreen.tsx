import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Line } from 'react-simple-maps';
import { useNavigate } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { Market } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { Consignment, CertificationScheme, ChainOfCustody } from '../../domain/consignment/types';
import { BIOMETHANE_PLANTS, COUNTRY_MACRO_STATS } from '../../domain/plants/registry';
import { BiomethanePlant } from '../../domain/plants/types';
import { 
  Globe, 
  ArrowRight, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Scale, 
  Activity, 
  Flame, 
  Info, 
  Factory, 
  MapPin, 
  Search, 
  RotateCcw,
  Sparkles,
  Filter,
  Plus,
  Minus,
  Maximize2,
  Navigation,
  Compass,
  Check,
  X
} from 'lucide-react';

const EU_COUNTRY_CODES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

const COUNTRY_ISO2_TO_ISO3: Record<string, string> = {
  AT: 'AUT', BE: 'BEL', BG: 'BGR', HR: 'HRV', CY: 'CYP', CZ: 'CZE',
  DK: 'DNK', EE: 'EST', FI: 'FIN', FR: 'FRA', DE: 'DEU', GR: 'GRC',
  HU: 'HUN', IE: 'IRL', IT: 'ITA', LV: 'LVA', LT: 'LTU', LU: 'LUX',
  MT: 'MLT', NL: 'NLD', PL: 'POL', PT: 'PRT', RO: 'ROU', SK: 'SVK',
  SI: 'SVN', ES: 'ESP', SE: 'SWE', GB: 'GBR', CH: 'CHE', NO: 'NOR',
  UA: 'UKR', IS: 'ISL', LI: 'LIE',
};

const COUNTRY_ISO3_TO_ISO2: Record<string, string> = Object.entries(COUNTRY_ISO2_TO_ISO3).reduce(
  (acc, [k, v]) => ({ ...acc, [v]: k }),
  {}
);

// Geographic centroids for accurate Google Maps style country labels
const COUNTRY_LABEL_POSITIONS: Record<string, { coords: [number, number]; label: string; short: string }> = {
  FR: { coords: [2.3, 46.6], label: 'FRANCE', short: 'FR' },
  DE: { coords: [10.4, 51.1], label: 'GERMANY', short: 'DE' },
  ES: { coords: [-3.7, 40.2], label: 'SPAIN', short: 'ES' },
  IT: { coords: [12.6, 42.8], label: 'ITALY', short: 'IT' },
  GB: { coords: [-2.5, 54.0], label: 'UNITED KINGDOM', short: 'UK' },
  PL: { coords: [19.1, 52.0], label: 'POLAND', short: 'PL' },
  SE: { coords: [16.5, 60.5], label: 'SWEDEN', short: 'SE' },
  NO: { coords: [8.5, 61.0], label: 'NORWAY', short: 'NO' },
  FI: { coords: [26.0, 63.5], label: 'FINLAND', short: 'FI' },
  DK: { coords: [9.5, 56.0], label: 'DENMARK', short: 'DK' },
  NL: { coords: [5.3, 52.2], label: 'NETHERLANDS', short: 'NL' },
  BE: { coords: [4.5, 50.6], label: 'BELGIUM', short: 'BE' },
  AT: { coords: [14.5, 47.6], label: 'AUSTRIA', short: 'AT' },
  CH: { coords: [8.2, 46.8], label: 'SWITZERLAND', short: 'CH' },
  LT: { coords: [23.9, 55.2], label: 'LITHUANIA', short: 'LT' },
  LV: { coords: [24.6, 56.9], label: 'LATVIA', short: 'LV' },
  EE: { coords: [25.5, 58.7], label: 'ESTONIA', short: 'EE' },
  IE: { coords: [-7.8, 53.4], label: 'IRELAND', short: 'IE' },
  PT: { coords: [-8.2, 39.5], label: 'PORTUGAL', short: 'PT' },
  CZ: { coords: [15.5, 49.8], label: 'CZECHIA', short: 'CZ' },
  SK: { coords: [19.7, 48.7], label: 'SLOVAKIA', short: 'SK' },
  HU: { coords: [19.5, 47.2], label: 'HUNGARY', short: 'HU' },
  RO: { coords: [25.0, 46.0], label: 'ROMANIA', short: 'RO' },
  BG: { coords: [25.5, 42.7], label: 'BULGARIA', short: 'BG' },
  GR: { coords: [22.0, 39.0], label: 'GREECE', short: 'GR' },
  UA: { coords: [31.2, 49.0], label: 'UKRAINE', short: 'UA' },
  HR: { coords: [15.5, 45.3], label: 'CROATIA', short: 'HR' },
  SI: { coords: [14.8, 46.1], label: 'SLOVENIA', short: 'SI' },
};

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  GB: 'United Kingdom',
  NL: 'Netherlands',
  DK: 'Denmark',
  ES: 'Spain',
  SE: 'Sweden',
  CH: 'Switzerland',
  FI: 'Finland',
  AT: 'Austria',
  BE: 'Belgium',
  PL: 'Poland',
  CZ: 'Czech Republic',
  NO: 'Norway',
  PT: 'Portugal',
  EE: 'Estonia',
  LT: 'Lithuania',
  LV: 'Latvia',
  IE: 'Ireland',
  HU: 'Hungary',
  SK: 'Slovakia',
  RO: 'Romania',
  BG: 'Bulgaria',
  HR: 'Croatia',
  SI: 'Slovenia',
  GR: 'Greece',
  UA: 'Ukraine',
};

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', GB: '🇬🇧', NL: '🇳🇱', DK: '🇩🇰',
  ES: '🇪🇸', SE: '🇸🇪', CH: '🇨🇭', FI: '🇫🇮', AT: '🇦🇹', BE: '🇧🇪',
  PL: '🇵🇱', CZ: '🇨🇿', NO: '🇳🇴', PT: '🇵🇹', EE: '🇪🇪', LT: '🇱🇹',
  LV: '🇱🇻', IE: '🇮🇪', HU: '🇭🇺', SK: '🇸🇰', RO: '🇷🇴', BG: '🇧🇬',
  HR: '🇭🇷', SI: '🇸🇮', GR: '🇬🇷', UA: '🇺🇦',
};

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

interface ContextMenuState {
  x: number;
  y: number;
  iso2: string;
  iso3: string;
  name: string;
  flag: string;
  plantCount: number;
}

export function MapScreen() {
  const navigate = useNavigate();
  const { state } = useAppState();
  const mapCanvasRef = useRef<HTMLDivElement>(null);

  // Active Origin and Consignment Parameters
  const [originCountry, setOriginCountry] = useState<string>('LT');
  const [feedstockKey, setFeedstockKey] = useState<string>('manure');
  const [carbonIntensity, setCarbonIntensity] = useState<number>(-100);
  const [scheme, setScheme] = useState<CertificationScheme>('ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>('MASS_BALANCE');
  const [injectionCountry, setInjectionCountry] = useState<string>('LT');

  // Map Click Mode: 'SET_ORIGIN' or 'SET_TARGET'
  const [mapClickMode, setMapClickMode] = useState<'SET_ORIGIN' | 'SET_TARGET'>('SET_TARGET');

  // Map Zoom & Position
  const [mapPosition, setMapPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [13, 53],
    zoom: 1,
  });

  // Selected Target Destination for route visualization
  const [selectedDestinationIso3, setSelectedDestinationIso3] = useState<string>('DEU');
  const [hoveredCountry, setHoveredCountry] = useState<any | null>(null);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Selected Plant Modal
  const [selectedPlant, setSelectedPlant] = useState<BiomethanePlant | null>(null);

  // Right Drawer Tab State: 'PLANTS' | 'COMPLIANCE'
  const [drawerTab, setDrawerTab] = useState<'PLANTS' | 'COMPLIANCE'>('PLANTS');
  const [plantFeedstockFilter, setPlantFeedstockFilter] = useState<string>('ALL');

  // Open right click context menu at cursor
  const openContextMenuForCountry = (clientX: number, clientY: number, iso2: string, iso3: string) => {
    const name = COUNTRY_NAMES[iso2] || iso2;
    const flag = COUNTRY_FLAGS[iso2] || '🇪🇺';
    const plantCount = BIOMETHANE_PLANTS.filter(p => p.countryCode === iso2).length;
    
    setContextMenu({
      x: Math.min(clientX, window.innerWidth - 290),
      y: Math.min(clientY, window.innerHeight - 270),
      iso2,
      iso3,
      name,
      flag,
      plantCount,
    });
  };

  // Attach native capture phase right-click listener to map canvas with DOM element discovery
  useEffect(() => {
    const el = mapCanvasRef.current;
    if (!el) return;

    const onContextMenuCapture = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // First check if direct element has country attribute
      const target = (e.target as HTMLElement)?.closest('[data-country-iso2]');
      const iso2 = target?.getAttribute('data-country-iso2') || hoveredCountry?.iso2;
      const iso3 = target?.getAttribute('data-country-iso3') || hoveredCountry?.iso3 || (iso2 ? COUNTRY_ISO2_TO_ISO3[iso2] : null);

      if (iso2 && iso3) {
        openContextMenuForCountry(e.clientX, e.clientY, iso2, iso3);
      }
    };

    el.addEventListener('contextmenu', onContextMenuCapture, { capture: true });
    return () => el.removeEventListener('contextmenu', onContextMenuCapture, { capture: true });
  }, [hoveredCountry]);

  // Dismiss context menu on outside click with small delay so right-click release doesn't close it
  useEffect(() => {
    if (!contextMenu) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const menuEl = document.getElementById('map-floating-context-menu');
      if (menuEl && !menuEl.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
    }, 120);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [contextMenu]);

  const feedstockInfo = FEEDSTOCK_REGISTRY[feedstockKey] || FEEDSTOCK_REGISTRY.manure;

  // Active Simulated Consignment
  const simulatedConsignment: Consignment = useMemo(() => {
    const isEU = EU_COUNTRY_CODES.includes(injectionCountry);
    return {
      id: 'map_sim_consignment',
      name: `${originCountry} ${feedstockInfo.name} Consignment`,
      originCountry,
      originCountryName: COUNTRY_NAMES[originCountry] || originCountry,
      feedstock: feedstockKey,
      feedstockName: feedstockInfo.name,
      annexClassification: feedstockInfo.annexClassification,
      carbonIntensity,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: scheme,
      chainOfCustody,
      injectionCountry,
      injectionIsEU: isEU,
      udbStatus: isEU ? 'RECORDED' : 'NOT_RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: 10000,
    };
  }, [originCountry, feedstockKey, feedstockInfo, carbonIntensity, scheme, chainOfCustody, injectionCountry]);

  // Evaluate clearance of this consignment against all active European markets
  const marketClearanceMap = useMemo(() => {
    const map = new Map<string, { market: Market; eligibility: any; netback: any }>();
    
    MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
      const eligibility = evaluateEligibility(simulatedConsignment, m);
      const netback = computeNetback(m, simulatedConsignment, state.marks, state.costs, state.marks.pricingSide);
      map.set(m.country, { market: m, eligibility, netback });
      if (m.id === 'FUELEU') map.set('FUELEU', { market: m, eligibility, netback });
      if (m.id === 'VOL_SCOPE1') map.set('VOL_SCOPE1', { market: m, eligibility, netback });
      if (m.id === 'EU_ETS1') map.set('EU_ETS1', { market: m, eligibility, netback });
    });

    return map;
  }, [simulatedConsignment, state.marks, state.costs]);

  // Google Maps inspired clean color palette for European countries
  const getCountryFillColor = (iso3: string) => {
    const iso2 = COUNTRY_ISO3_TO_ISO2[iso3];
    if (!iso2) return '#172033'; // Non-European / Distant countries (Clean Dark Slate)

    if (iso2 === originCountry) {
      return '#0284c7'; // Active Origin (Vibrant Google Sky Blue)
    }

    const clearance = marketClearanceMap.get(iso2);
    if (!clearance) {
      if (EU_COUNTRY_CODES.includes(iso2)) return '#1e293b'; // EU Country (Neutral Google Maps Land Slate)
      return '#172033'; // Non-EU
    }

    const verdict = clearance.eligibility.overallVerdict;
    if (verdict === 'ELIGIBLE' || verdict === 'PASS') return '#059669'; // Google Emerald Green
    if (verdict === 'CONDITIONAL' || verdict === 'UNRESOLVED') return '#d97706'; // Google Warm Amber
    if (verdict === 'HARD_BLOCK') return '#dc2626'; // Google Blocked Red

    return '#1e293b';
  };

  const handleCountryClick = (iso3: string) => {
    const iso2 = COUNTRY_ISO3_TO_ISO2[iso3];
    if (iso2) {
      if (mapClickMode === 'SET_ORIGIN') {
        setOriginCountry(iso2);
        setInjectionCountry(iso2);
      } else {
        setSelectedDestinationIso3(iso3);
      }
    }
  };

  const targetCountryCode = COUNTRY_ISO3_TO_ISO2[selectedDestinationIso3] || 'DE';
  const targetMarketEntry = marketClearanceMap.get(targetCountryCode);
  const targetMarket = targetMarketEntry?.market || MARKETS.find(m => m.country === targetCountryCode);

  const originCoords = COUNTRY_LABEL_POSITIONS[originCountry]?.coords || [10.45, 51.16];
  const destCoords = COUNTRY_LABEL_POSITIONS[targetCountryCode]?.coords || [10.45, 51.16];

  const marketByIso3 = useMemo(() => {
    const map = new Map<string, Market>();
    MARKETS.forEach(m => {
      const iso3 = COUNTRY_ISO2_TO_ISO3[m.country];
      if (iso3) map.set(iso3, m);
    });
    return map;
  }, []);

  // Sorted producing nations for dropdown
  const allProducingCountries = useMemo(() => {
    return Object.entries(COUNTRY_NAMES).map(([code, name]) => {
      const plantCount = BIOMETHANE_PLANTS.filter(p => p.countryCode === code).length;
      return {
        code,
        name,
        flag: COUNTRY_FLAGS[code] || '🇪🇺',
        plantCount,
      };
    }).sort((a, b) => b.plantCount - a.plantCount);
  }, []);

  // Country plants currently inspected in drawer
  const inspectedCountryCode = originCountry;
  const inspectedCountryName = COUNTRY_NAMES[inspectedCountryCode] || inspectedCountryCode;
  const inspectedCountryFlag = COUNTRY_FLAGS[inspectedCountryCode] || '🇪🇺';

  const countryPlants = useMemo(() => {
    return BIOMETHANE_PLANTS.filter(p => p.countryCode === inspectedCountryCode);
  }, [inspectedCountryCode]);

  // Feedstock breakdown statistics for this country
  const countryFeedstockBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalCapacityNm3: number; totalEnergyGWh: number; defaultKey: string }>();
    
    countryPlants.forEach(p => {
      const cat = p.primaryFeedstockCategory.toLowerCase();
      let key = 'agricultural';
      let label = '🌾 Agri-Residues & Crops';
      let defaultKey = 'energy_crops';

      if (cat.includes('manure') || cat.includes('slurry')) {
        key = 'manure';
        label = '🐮 Manure & Slurry';
        defaultKey = 'manure';
      } else if (cat.includes('food') || cat.includes('forsu') || cat.includes('ofmsw') || cat.includes('biowaste')) {
        key = 'food_waste';
        label = '🥗 Food Waste & OFMSW';
        defaultKey = 'food_waste';
      } else if (cat.includes('sewage') || cat.includes('sludge')) {
        key = 'sewage';
        label = '💧 Sewage Sludge';
        defaultKey = 'sewage_sludge';
      } else if (cat.includes('isdnd') || cat.includes('landfill')) {
        key = 'landfill';
        label = '🗑️ Landfill Gas (LFG)';
        defaultKey = 'biowaste_unseparated';
      }

      const existing = map.get(key) || { label, count: 0, totalCapacityNm3: 0, totalEnergyGWh: 0, defaultKey };
      existing.count += 1;
      existing.totalCapacityNm3 += p.capacityNm3h;
      existing.totalEnergyGWh += p.annualEnergyGWh;
      map.set(key, existing);
    });

    return Array.from(map.entries()).map(([key, data]) => ({ key, ...data }));
  }, [countryPlants]);

  // Filtered plants for the country list
  const filteredCountryPlants = useMemo(() => {
    if (plantFeedstockFilter === 'ALL') return countryPlants;
    return countryPlants.filter(p => {
      const cat = p.primaryFeedstockCategory.toLowerCase();
      if (plantFeedstockFilter === 'manure') return cat.includes('manure') || cat.includes('slurry');
      if (plantFeedstockFilter === 'food_waste') return cat.includes('food') || cat.includes('forsu') || cat.includes('ofmsw') || cat.includes('biowaste');
      if (plantFeedstockFilter === 'sewage') return cat.includes('sewage') || cat.includes('sludge');
      if (plantFeedstockFilter === 'landfill') return cat.includes('isdnd') || cat.includes('landfill');
      return cat.includes('agri') || cat.includes('crop') || cat.includes('straw');
    });
  }, [countryPlants, plantFeedstockFilter]);

  // Zoom helpers
  const handleZoomIn = () => {
    setMapPosition(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.3, 4) }));
  };

  const handleZoomOut = () => {
    setMapPosition(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.3, 0.8) }));
  };

  const handleResetZoom = () => {
    setMapPosition({ coordinates: [13, 53], zoom: 1 });
  };

  return (
    <div className="space-y-4 font-sans text-stone-100 pb-12">
      
      {/* Top Header & Simulation Controller */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3 font-mono text-xs shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-400" />
              <h1 className="text-base font-bold text-white uppercase tracking-tight">
                Pan-European Biomethane Cross-Border Export Clearing Map
              </h1>
              <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded font-bold">
                1,986 Facilities Master Register
              </span>
            </div>
            <p className="text-stone-400 text-xs mt-0.5">
              Right-click on any country to set Origin or Target • High-contrast Google Maps cartography.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Map Click Mode Toggle */}
            <div className="flex items-center bg-stone-950 border border-stone-800 rounded p-0.5 text-[11px]">
              <button
                onClick={() => setMapClickMode('SET_ORIGIN')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  mapClickMode === 'SET_ORIGIN'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Left click on map sets Origin"
              >
                Click = Origin
              </button>
              <button
                onClick={() => setMapClickMode('SET_TARGET')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  mapClickMode === 'SET_TARGET'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Left click on map sets Target"
              >
                Click = Target
              </button>
            </div>

            <button
              onClick={() => navigate('/plants')}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1"
            >
              Directory (1,986) →
            </button>
          </div>
        </div>

        {/* Consignment Customizer Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          
          {/* 1. Origin Country */}
          <div>
            <label className="block text-[9px] font-bold text-sky-400 uppercase mb-0.5 flex items-center justify-between">
              <span>1. Origin Country</span>
              <span className="text-stone-400">({COUNTRY_FLAGS[originCountry]} {originCountry})</span>
            </label>
            <select
              value={originCountry}
              onChange={e => {
                setOriginCountry(e.target.value);
                setInjectionCountry(e.target.value);
              }}
              className="w-full bg-stone-950 border border-sky-500/70 rounded px-2 py-1.5 text-sky-300 font-bold outline-none focus:ring-1 focus:ring-sky-400 text-xs"
            >
              {allProducingCountries.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} ({c.plantCount > 0 ? `${c.plantCount} plants` : c.code})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Feedstock */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">
              2. Feedstock
            </label>
            <select
              value={feedstockKey}
              onChange={e => {
                setFeedstockKey(e.target.value);
                const info = FEEDSTOCK_REGISTRY[e.target.value];
                if (info) setCarbonIntensity(info.defaultCI);
              }}
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none text-xs"
            >
              {Object.entries(FEEDSTOCK_REGISTRY).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Carbon Intensity */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">
              3. CI (gCO₂e/MJ)
            </label>
            <input
              type="number"
              value={carbonIntensity}
              onChange={e => setCarbonIntensity(Number(e.target.value))}
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-teal-300 font-bold text-xs"
            />
          </div>

          {/* 4. Certification Scheme */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">
              4. Certification Scheme
            </label>
            <select
              value={scheme}
              onChange={e => setScheme(e.target.value as CertificationScheme)}
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none text-xs"
            >
              <option value="ISCC_EU">ISCC EU (RED III Compliance)</option>
              <option value="REDCERT_EU">REDcert EU (RED III Compliance)</option>
              <option value="2BSVS">2BSvs (RED III Compliance)</option>
              <option value="KZR_INIG">KZR INiG (RED III Compliance)</option>
              <option value="ISCC_PLUS">ISCC PLUS (Voluntary Only)</option>
            </select>
          </div>

          {/* 5. Injection Grid Point */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">
              5. Grid Injected
            </label>
            <select
              value={injectionCountry}
              onChange={e => setInjectionCountry(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none text-xs"
            >
              {allProducingCountries.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} {EU_COUNTRY_CODES.includes(c.code) ? '(EU Grid)' : '(Non-EU Grid)'}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Chain of Custody */}
          <div>
            <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">
              6. Chain of Custody
            </label>
            <select
              value={chainOfCustody}
              onChange={e => setChainOfCustody(e.target.value as ChainOfCustody)}
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none text-xs"
            >
              <option value="MASS_BALANCE">Mass Balance (Transport)</option>
              <option value="SEGREGATION">Segregation (Bio-LNG)</option>
              <option value="BOOK_AND_CLAIM">Book-and-Claim (Voluntary)</option>
            </select>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* SVG Google Maps Style Interactive Canvas */}
        <div 
          ref={mapCanvasRef}
          className="lg:col-span-7 bg-[#0b1329] border border-stone-800 rounded-xl overflow-hidden relative flex flex-col min-h-[600px] shadow-lg"
        >
          
          {/* Dynamic Map Legend & Instructions */}
          <div className="p-3 bg-[#0a1122]/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono z-10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
                ORIGIN: {COUNTRY_FLAGS[originCountry]} {COUNTRY_NAMES[originCountry] || originCountry}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                PASS (Eligible)
              </span>
              <span className="flex items-center gap-1.5 text-red-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                BLOCKED
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                CONDITIONAL
              </span>
            </div>

            <div className="text-slate-400 text-[10px] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              <span>Right-click any country to set Origin / Target</span>
            </div>
          </div>

          {/* Map Vector Component with Google Maps Contrast Styling */}
          <div className="flex-1 relative w-full h-full min-h-[520px] flex items-center justify-center bg-[#0c1427] select-none">
            
            {/* Zoom / Pan Navigation Controls */}
            <div className="absolute top-3 right-3 z-20 flex flex-col bg-slate-900/90 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
              <button
                onClick={handleZoomIn}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-800"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-800"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 720, center: [14, 54] }}
              className="w-full h-full"
            >
              <ZoomableGroup
                center={mapPosition.coordinates}
                zoom={mapPosition.zoom}
                minZoom={0.8}
                maxZoom={4}
                onMoveEnd={position => setMapPosition(position)}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const iso3 = geo.id;
                      const iso2 = COUNTRY_ISO3_TO_ISO2[iso3];
                      const market = marketByIso3.get(iso3);
                      const isClickable = Boolean(market || (iso2 && COUNTRY_LABEL_POSITIONS[iso2]));

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          data-country-iso2={iso2}
                          data-country-iso3={iso3}
                          fill={getCountryFillColor(iso3)}
                          stroke="#334155"
                          strokeWidth={0.7}
                          style={{
                            default: { outline: 'none', transition: 'all 200ms' },
                            hover: {
                              fill: isClickable ? '#0284c7' : '#334155',
                              outline: 'none',
                              cursor: isClickable ? 'pointer' : 'default',
                            },
                            pressed: { outline: 'none' },
                          }}
                          onMouseEnter={() => {
                            const name = geo.properties?.name || geo.id;
                            setHoveredCountry({ iso2, iso3, name, market });
                          }}
                          onMouseLeave={() => setHoveredCountry(null)}
                          onClick={() => handleCountryClick(iso3)}
                        />
                      );
                    })
                  }
                </Geographies>

                {/* Country Name Labels rendered directly onto map centroids (Google Maps style) */}
                {Object.entries(COUNTRY_LABEL_POSITIONS).map(([code, item]) => {
                  const isOrigin = code === originCountry;
                  const isTarget = code === targetCountryCode;
                  const iso3 = COUNTRY_ISO2_TO_ISO3[code] || '';
                  return (
                    <Marker key={code} coordinates={item.coords}>
                      <text
                        textAnchor="middle"
                        y={isOrigin || isTarget ? -10 : 3}
                        data-country-iso2={code}
                        data-country-iso3={iso3}
                        onClick={() => handleCountryClick(iso3)}
                        className="cursor-pointer select-none"
                        style={{
                          fontFamily: 'Inter, system-ui, sans-serif',
                          fontSize: isOrigin || isTarget ? 11 : 9,
                          fontWeight: isOrigin || isTarget ? 800 : 700,
                          letterSpacing: '0.05em',
                          fill: isOrigin ? '#38bdf8' : isTarget ? '#2dd4bf' : '#f8fafc',
                          textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.95)',
                        }}
                      >
                        {item.label}
                      </text>
                    </Marker>
                  );
                })}

                {/* Origin Marker Badge */}
                {originCoords && (
                  <Marker coordinates={originCoords}>
                    <circle r={8} fill="#38bdf8" stroke="#ffffff" strokeWidth={2.5} className="animate-pulse" />
                    <text
                      textAnchor="middle"
                      y={-14}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fill: '#38bdf8',
                        fontSize: 10,
                        fontWeight: 800,
                        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                      }}
                    >
                      ORIGIN ({COUNTRY_FLAGS[originCountry]} {originCountry})
                    </text>
                  </Marker>
                )}

                {/* Destination Arc */}
                {destCoords && destCoords !== originCoords && (
                  <>
                    <Line
                      from={originCoords}
                      to={destCoords}
                      stroke="#2dd4bf"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                    />
                    <Marker coordinates={destCoords}>
                      <circle r={6} fill="#2dd4bf" stroke="#ffffff" strokeWidth={2} />
                      <text
                        textAnchor="middle"
                        y={-10}
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fill: '#2dd4bf',
                          fontSize: 9,
                          fontWeight: 700,
                          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                        }}
                      >
                        TARGET ({COUNTRY_FLAGS[targetCountryCode] || ''} {targetMarket?.country || targetCountryCode})
                      </text>
                    </Marker>
                  </>
                )}

              </ZoomableGroup>
            </ComposableMap>

            {/* Rich Hover Country Intelligence Dossier */}
            {hoveredCountry && !contextMenu && (() => {
              const hIso2 = hoveredCountry.iso2;
              const hName = COUNTRY_NAMES[hIso2] || hoveredCountry.name;
              const hFlag = COUNTRY_FLAGS[hIso2] || '🇪🇺';
              const hPlants = BIOMETHANE_PLANTS.filter(p => p.countryCode === hIso2);
              const hMacro = COUNTRY_MACRO_STATS.find(m => m.iso === hIso2);
              const hClearance = hIso2 ? marketClearanceMap.get(hIso2) : null;
              const isOrigin = hIso2 === originCountry;

              const primaryFeedstock = hMacro?.primaryFeedstockType || (hPlants.length > 0 ? hPlants[0].primaryFeedstockCategory : 'Agricultural residues & biowaste');
              const primaryTech = hMacro?.primaryUpgradingTech || (hPlants.length > 0 ? hPlants[0].upgradingTechnology : 'Membrane Separation');
              const registry = hMacro?.nationalRegistry || (hPlants.length > 0 ? hPlants[0].networkOperator : 'National Gas Grid');
              const totalCap = hMacro?.installedCapacityTWh ? `${hMacro.installedCapacityTWh.toFixed(1)} TWh/yr` : hPlants.length > 0 ? `~${Math.round(hPlants.reduce((acc, p) => acc + p.annualEnergyGWh, 0))} GWh/yr` : '—';

              return (
                <div className="absolute bottom-3 left-3 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 text-stone-100 w-80 font-mono text-xs shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{hFlag}</span>
                      <div>
                        <span className="font-bold text-white text-sm block leading-tight">{hName}</span>
                        <span className="text-[10px] text-slate-400">ISO: {hIso2 || hoveredCountry.iso3}</span>
                      </div>
                    </div>

                    {isOrigin ? (
                      <span className="px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-700 rounded text-[10px] font-bold animate-pulse">
                        Active Origin
                      </span>
                    ) : hClearance ? (
                      <StatusChip variant={hClearance.eligibility?.overallVerdict || 'UNKNOWN'} size="xs" />
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        Producing Market
                      </span>
                    )}
                  </div>

                  {/* Biomethane Production & Infrastructure Stats */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-950 p-2 rounded border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 uppercase block font-bold text-[9px]">Operating Plants</span>
                      <strong className="text-teal-300 text-xs">{hPlants.length > 0 ? `${hPlants.length} facilities` : 'No registered data'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block font-bold text-[9px]">Annual Capacity</span>
                      <strong className="text-slate-100 text-xs">{totalCap}</strong>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-900 flex justify-between text-slate-400">
                      <span>Primary Feedstock:</span>
                      <strong className="text-slate-200 truncate max-w-[170px]" title={primaryFeedstock}>{primaryFeedstock}</strong>
                    </div>
                    <div className="col-span-2 flex justify-between text-slate-400">
                      <span>Upgrading Tech:</span>
                      <strong className="text-slate-200 truncate max-w-[170px]" title={primaryTech}>{primaryTech}</strong>
                    </div>
                    <div className="col-span-2 flex justify-between text-slate-400">
                      <span>Grid / Registry:</span>
                      <strong className="text-slate-300 truncate max-w-[170px]" title={registry}>{registry}</strong>
                    </div>
                  </div>

                  {/* Compliance & Netback Economics (if Target Market) */}
                  {hClearance && !isOrigin && (
                    <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-[10px] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Target Scheme:</span>
                        <strong className="text-slate-200 truncate max-w-[170px]">{hClearance.market.name}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Implied Netback:</span>
                        <strong className="text-teal-400 font-bold text-xs">
                          {hClearance.netback?.netNetback != null
                            ? `€${hClearance.netback.netNetback.toFixed(2)}/MWh`
                            : 'No active mark'}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* 1-Click Quick Set Buttons on Hover Card */}
                  {hIso2 && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOriginCountry(hIso2);
                          setInjectionCountry(hIso2);
                        }}
                        className="py-1 px-2 rounded bg-sky-950 hover:bg-sky-900 border border-sky-700 text-sky-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1"
                      >
                        Set Origin 🔵
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const iso3 = COUNTRY_ISO2_TO_ISO3[hIso2];
                          if (iso3) setSelectedDestinationIso3(iso3);
                          setDrawerTab('COMPLIANCE');
                        }}
                        className="py-1 px-2 rounded bg-teal-950 hover:bg-teal-900 border border-teal-700 text-teal-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1"
                      >
                        Set Target 🎯
                      </button>
                    </div>
                  )}

                </div>
              );
            })()}
          </div>
        </div>

        {/* RIGHT DRAWER: 1. PLANTS BY FEEDSTOCK & 2. COMPLIANCE CLEARANCE */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3.5 font-mono text-xs flex flex-col justify-between shadow-sm min-h-[600px]">
          
          <div className="space-y-3">
            
            {/* Header with Quick Origin / Target Selector Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Inspected Country Base</span>
                  <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <span className="text-sky-300">{inspectedCountryFlag} {inspectedCountryName}</span>
                    <span className="text-xs text-teal-400 bg-teal-950 border border-teal-800 px-1.5 py-0.2 rounded font-bold">
                      {countryPlants.length} Facilities
                    </span>
                  </span>
                </div>

                {/* Drawer Tab Switcher */}
                <div className="flex items-center bg-stone-900 border border-stone-800 rounded p-0.5 text-[10px]">
                  <button
                    onClick={() => setDrawerTab('PLANTS')}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      drawerTab === 'PLANTS' ? 'bg-teal-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Plants ({countryPlants.length})
                  </button>
                  <button
                    onClick={() => setDrawerTab('COMPLIANCE')}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      drawerTab === 'COMPLIANCE' ? 'bg-teal-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Export Route ➔
                  </button>
                </div>
              </div>

              {/* Instant Origin / Target Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                <button
                  onClick={() => {
                    setOriginCountry(inspectedCountryCode);
                    setInjectionCountry(inspectedCountryCode);
                  }}
                  className={`py-1.5 px-2.5 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    originCountry === inspectedCountryCode
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-900 hover:bg-sky-950 border border-sky-700/60 text-sky-300'
                  }`}
                >
                  {originCountry === inspectedCountryCode ? <Check className="w-3.5 h-3.5" /> : null}
                  Set as Origin 🔵
                </button>

                <button
                  onClick={() => {
                    const iso3 = COUNTRY_ISO2_TO_ISO3[inspectedCountryCode];
                    if (iso3) setSelectedDestinationIso3(iso3);
                    setDrawerTab('COMPLIANCE');
                  }}
                  className={`py-1.5 px-2.5 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    targetCountryCode === inspectedCountryCode
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-900 hover:bg-teal-950 border border-teal-700/60 text-teal-300'
                  }`}
                >
                  {targetCountryCode === inspectedCountryCode ? <Check className="w-3.5 h-3.5" /> : null}
                  Set as Target 🎯
                </button>
              </div>
            </div>

            {/* TAB 1: PLANTS AVAILABLE PER FEEDSTOCK */}
            {drawerTab === 'PLANTS' && (
              <div className="space-y-3">
                
                {/* Feedstock Breakdown Filter Cards */}
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase block mb-1.5 flex items-center justify-between">
                    <span>Available Capacity per Feedstock:</span>
                    <button 
                      onClick={() => setPlantFeedstockFilter('ALL')}
                      className={`text-[9px] ${plantFeedstockFilter === 'ALL' ? 'text-teal-400 underline font-bold' : 'text-stone-500'}`}
                    >
                      Show All ({countryPlants.length})
                    </button>
                  </span>

                  <div className="grid grid-cols-2 gap-1.5">
                    {countryFeedstockBreakdown.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => {
                          setPlantFeedstockFilter(item.key);
                          setFeedstockKey(item.defaultKey);
                          const info = FEEDSTOCK_REGISTRY[item.defaultKey];
                          if (info) setCarbonIntensity(info.defaultCI);
                        }}
                        className={`p-2 rounded border text-left transition-all ${
                          plantFeedstockFilter === item.key
                            ? 'bg-teal-950/80 border-teal-500 text-teal-200 shadow-xs'
                            : 'bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-850'
                        }`}
                      >
                        <div className="font-bold text-[11px] truncate">{item.label}</div>
                        <div className="flex justify-between items-baseline mt-0.5 text-[10px]">
                          <span className="text-teal-300 font-bold">{item.count} plant{item.count !== 1 ? 's' : ''}</span>
                          <span className="text-stone-400">~{Math.round(item.totalEnergyGWh)} GWh/yr</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Plants List for this Country & Feedstock */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold uppercase">
                    <span>{inspectedCountryName} Facilities ({filteredCountryPlants.length}):</span>
                    <span>Click row to trade</span>
                  </div>

                  <div className="max-h-[250px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-stone-800/40">
                    {filteredCountryPlants.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlant(p)}
                        className="p-2.5 bg-stone-950 hover:bg-stone-800/80 border border-stone-800 rounded cursor-pointer transition-all space-y-1 group"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-stone-100 group-hover:text-teal-300 transition-colors">
                            {p.name}
                          </span>
                          <span className="text-teal-300 font-bold shrink-0 text-[11px]">
                            {p.annualEnergyGWh} GWh/yr
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 flex justify-between">
                          <span>Op: <strong className="text-stone-300">{p.operator}</strong></span>
                          <span>{p.capacityNm3h} Nm³/h</span>
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">
                          Tech: <span className="text-stone-300">{p.upgradingTechnology}</span> • Net: <span className="text-stone-300">{p.networkOperator}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: COMPLIANCE ROUTE & EXPORT CLEARANCE */}
            {drawerTab === 'COMPLIANCE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                  <span className="text-[10px] text-stone-400 uppercase">Export Route Spreads</span>
                  <span className="text-stone-200 font-bold">{COUNTRY_FLAGS[originCountry]} {originCountry} ➔ {COUNTRY_FLAGS[targetCountryCode]} {targetCountryCode}</span>
                </div>

                {targetMarketEntry ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-stone-950 rounded border border-stone-800 space-y-2">
                      <div className="flex justify-between items-center text-stone-400">
                        <span>Target Compliance Scheme:</span>
                        <strong className="text-stone-200">{targetMarketEntry.market.name}</strong>
                      </div>
                      <div className="flex justify-between items-center text-stone-400">
                        <span>Statutory Registry:</span>
                        <strong className="text-stone-300">{targetMarketEntry.market.registry || targetMarketEntry.market.shortName}</strong>
                      </div>
                      <div className="flex justify-between items-center text-stone-400">
                        <span>Implied Netback:</span>
                        <strong className="text-teal-400 font-bold text-sm">
                          {targetMarketEntry.netback?.netNetback != null
                            ? `€${targetMarketEntry.netback.netNetback.toFixed(2)}/MWh`
                            : 'No active mark'}
                        </strong>
                      </div>
                    </div>

                    {/* Gating Status Trail */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Compliance Gate Analysis:</span>
                      <div className="space-y-1 text-[11px]">
                        {targetMarketEntry.eligibility.gates.map((g: any, gIdx: number) => (
                          <div key={gIdx} className="p-2 bg-stone-950/80 rounded border border-stone-800 flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-stone-300 block">{g.gateLabel}</span>
                              <span className="text-[10px] text-stone-400">{g.reason}</span>
                            </div>
                            <StatusChip variant={g.verdict} size="xs" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-stone-950 rounded border border-stone-800 text-center text-stone-500">
                    No active compliance market model configured for {COUNTRY_NAMES[targetCountryCode] || targetCountryCode}.
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <button
              onClick={() => {
                if (targetMarketEntry?.market?.id) {
                  navigate(`/trade?marketId=${targetMarketEntry.market.id}&originCountry=${originCountry}`);
                } else {
                  navigate('/trade');
                }
              }}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded text-xs transition-all flex items-center justify-center gap-1.5"
            >
              Open Trade Builder for {inspectedCountryName} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* FLOATING ACTION & CONTEXT MENU (OPENED VIA RIGHT-CLICK) */}
      {contextMenu && (
        <div
          id="map-floating-context-menu"
          style={{ 
            position: 'fixed',
            top: `${contextMenu.y}px`, 
            left: `${contextMenu.x}px`,
            zIndex: 99999,
          }}
          className="bg-slate-900/98 border-2 border-teal-500 rounded-xl shadow-2xl p-2.5 w-72 font-mono text-xs text-stone-100 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-2 py-1 border-b border-slate-800 flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5 text-sm">
              <span>{contextMenu.flag}</span>
              <span>{contextMenu.name}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-teal-400 font-bold bg-teal-950 px-1.5 py-0.5 rounded border border-teal-800">
                {contextMenu.plantCount} plants
              </span>
              <button 
                onClick={() => setContextMenu(null)}
                className="text-stone-400 hover:text-white p-0.5 rounded hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Option 1: Set Origin */}
          <button
            onClick={() => {
              setOriginCountry(contextMenu.iso2);
              setInjectionCountry(contextMenu.iso2);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-2 rounded bg-sky-950/70 hover:bg-sky-900 hover:text-white text-left flex items-center gap-2 transition-colors font-bold text-sky-300 border border-sky-700/80"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></div>
            <span>Set as Origin Country 🔵</span>
          </button>

          {/* Option 2: Set Target */}
          <button
            onClick={() => {
              setSelectedDestinationIso3(contextMenu.iso3);
              setDrawerTab('COMPLIANCE');
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-2 rounded bg-teal-950/70 hover:bg-teal-900 hover:text-white text-left flex items-center gap-2 transition-colors font-bold text-teal-300 border border-teal-700/80"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400"></div>
            <span>Set as Target Destination 🎯</span>
          </button>

          {/* Option 3: View Plants & Feedstocks */}
          <button
            onClick={() => {
              setOriginCountry(contextMenu.iso2);
              setInjectionCountry(contextMenu.iso2);
              setDrawerTab('PLANTS');
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-2 rounded hover:bg-slate-800 text-left flex items-center gap-2 transition-colors text-stone-200"
          >
            <Factory className="w-4 h-4 text-amber-400" />
            <span>View Plants & Feedstocks</span>
          </button>

          {/* Option 4: Open in Trade Builder */}
          <button
            onClick={() => {
              navigate(`/trade?originCountry=${contextMenu.iso2}`);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-2 rounded hover:bg-slate-800 text-left flex items-center gap-2 transition-colors text-stone-200 border-t border-slate-800/80 pt-2"
          >
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>Open in Trade Builder ➔</span>
          </button>
        </div>
      )}

      {/* Selected Plant Modal */}
      {selectedPlant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 max-w-lg w-full space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <span className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-amber-400" />
                  <span>{selectedPlant.countryFlag} {selectedPlant.name}</span>
                </span>
                <span className="text-[10px] text-stone-400">
                  {selectedPlant.country} • Operator: {selectedPlant.operator}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-green-950 text-green-300 border border-green-800 rounded text-[10px] font-bold">
                {selectedPlant.status}
              </span>
            </div>

            <div className="p-3 bg-stone-950 rounded border border-stone-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Annual Energy Production:</span>
                <strong className="text-teal-300">{selectedPlant.annualEnergyGWh} GWh/year ({selectedPlant.capacityNm3h} Nm³/h)</strong>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Primary Feedstock:</span>
                <strong className="text-stone-200">{selectedPlant.primaryFeedstockCategory}</strong>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Upgrading Tech:</span>
                <strong className="text-stone-300">{selectedPlant.upgradingTechnology}</strong>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Grid Injection:</span>
                <strong className="text-stone-300">{selectedPlant.gridConnectionType} ({selectedPlant.networkOperator})</strong>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setOriginCountry(selectedPlant.countryCode);
                  setInjectionCountry(selectedPlant.countryCode);
                  setSelectedPlant(null);
                }}
                className="px-3 py-1.5 rounded border border-sky-700 bg-sky-950 text-sky-300 font-bold hover:bg-sky-900"
              >
                Set {selectedPlant.country} as Origin
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPlant(null)}
                  className="px-3 py-1.5 rounded border border-stone-800 text-stone-400 hover:bg-stone-800"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigate(`/trade?originCountry=${selectedPlant.countryCode}&volume=${selectedPlant.annualEnergyGWh * 1000}`);
                  }}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-1.5 rounded flex items-center gap-1.5"
                >
                  Simulate Trade <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
