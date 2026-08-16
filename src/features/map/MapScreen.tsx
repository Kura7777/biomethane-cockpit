import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Line } from 'react-simple-maps';
import { useNavigate } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { Market } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
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
  ChevronRight
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

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  DE: [10.4515, 51.1657],
  NL: [5.2913, 52.1326],
  DK: [9.5018, 56.2639],
  FR: [2.2137, 46.2276],
  IT: [12.5674, 41.8719],
  AT: [14.5501, 47.5162],
  SE: [18.6435, 60.1282],
  FI: [25.7482, 61.9241],
  BE: [4.4699, 50.5039],
  GB: [-3.4360, 55.3781],
  ES: [-3.7492, 40.4637],
  PL: [19.1451, 51.9194],
  IE: [-8.2439, 53.4129],
  NO: [8.4689, 60.4720],
  CH: [8.2275, 46.8182],
  PT: [-8.2245, 39.3999],
  CZ: [15.4730, 49.8175],
  EE: [25.0136, 58.5953],
  LV: [24.6032, 56.8796],
  LT: [23.8813, 55.1694],
  HU: [19.5033, 47.1625],
  SK: [19.6990, 48.6690],
  RO: [24.9668, 45.9432],
  BG: [25.4858, 42.7339],
  HR: [15.2000, 45.1000],
  SI: [14.9955, 46.1512],
  GR: [21.8243, 39.0742],
  UA: [31.1656, 48.3794],
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

export function MapScreen() {
  const navigate = useNavigate();
  const { state } = useAppState();

  // Active Origin and Consignment Parameters
  const [originCountry, setOriginCountry] = useState<string>('LT');
  const [feedstockKey, setFeedstockKey] = useState<string>('manure');
  const [carbonIntensity, setCarbonIntensity] = useState<number>(-100);
  const [scheme, setScheme] = useState<CertificationScheme>('ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>('MASS_BALANCE');
  const [injectionCountry, setInjectionCountry] = useState<string>('LT');

  // Map Click Mode: 'SET_ORIGIN' or 'SET_TARGET'
  const [mapClickMode, setMapClickMode] = useState<'SET_ORIGIN' | 'SET_TARGET'>('SET_TARGET');

  // Selected Target Destination for route visualization
  const [selectedDestinationIso3, setSelectedDestinationIso3] = useState<string>('DEU');
  const [hoveredCountry, setHoveredCountry] = useState<any | null>(null);

  // Plant Pins Layer Options: 'COUNTRY_ONLY' | 'ALL' | 'HIDDEN'
  const [pinDisplayMode, setPinDisplayMode] = useState<'COUNTRY_ONLY' | 'ALL' | 'HIDDEN'>('COUNTRY_ONLY');
  const [selectedPlant, setSelectedPlant] = useState<BiomethanePlant | null>(null);

  // Right Drawer Tab State: 'PLANTS' | 'COMPLIANCE'
  const [drawerTab, setDrawerTab] = useState<'PLANTS' | 'COMPLIANCE'>('PLANTS');
  const [plantFeedstockFilter, setPlantFeedstockFilter] = useState<string>('ALL');

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

  // Color mapper for European countries based on export clearance status
  const getCountryFillColor = (iso3: string) => {
    const iso2 = COUNTRY_ISO3_TO_ISO2[iso3];
    if (!iso2) return '#292524'; // Non-European

    if (iso2 === originCountry) {
      return '#38bdf8'; // Active Origin (Sky Blue)
    }

    const clearance = marketClearanceMap.get(iso2);
    if (!clearance) {
      if (EU_COUNTRY_CODES.includes(iso2)) return '#44403c'; // EU Country without national market model
      return '#1c1917'; // Non-EU
    }

    const verdict = clearance.eligibility.overallVerdict;
    if (verdict === 'ELIGIBLE' || verdict === 'PASS') return '#059669'; // Emerald Green
    if (verdict === 'CONDITIONAL' || verdict === 'UNRESOLVED') return '#b45309'; // Amber
    if (verdict === 'HARD_BLOCK') return '#991b1b'; // Dark Red (Blocked)

    return '#44403c';
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

  const originCoords = COUNTRY_COORDINATES[originCountry] || [10.45, 51.16];
  const destCoords = COUNTRY_COORDINATES[targetCountryCode] || [10.45, 51.16];

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

  // Country plants currently inspected in drawer (Origin or Selected Target)
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

  // Visible Map Pins based on mode
  const visibleMapPins = useMemo(() => {
    if (pinDisplayMode === 'HIDDEN') return [];
    if (pinDisplayMode === 'COUNTRY_ONLY') {
      return BIOMETHANE_PLANTS.filter(p => p.countryCode === originCountry || p.countryCode === targetCountryCode);
    }
    return BIOMETHANE_PLANTS;
  }, [pinDisplayMode, originCountry, targetCountryCode]);

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
                1,986 Facilities Live
              </span>
            </div>
            <p className="text-stone-400 text-xs mt-0.5">
              Click any country to inspect available plants per feedstock, regulatory clearance, and cross-border export spreads.
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
                title="Clicking any country on the map sets it as the ORIGIN producing country"
              >
                Click = Set Origin
              </button>
              <button
                onClick={() => setMapClickMode('SET_TARGET')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  mapClickMode === 'SET_TARGET'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Clicking any country on the map sets it as the TARGET destination to inspect"
              >
                Click = Set Target
              </button>
            </div>

            {/* Plant Layer Filter */}
            <select
              value={pinDisplayMode}
              onChange={e => setPinDisplayMode(e.target.value as any)}
              className="bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-300 font-bold outline-none"
            >
              <option value="COUNTRY_ONLY">Pins: Selected Countries ({visibleMapPins.length})</option>
              <option value="ALL">Pins: All Europe (1,986)</option>
              <option value="HIDDEN">Pins: Hide Markers</option>
            </select>

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
          
          {/* 1. Origin Country (All 27 European Producing Nations) */}
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
        
        {/* SVG Interactive Map Canvas */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-xl overflow-hidden relative flex flex-col min-h-[580px]">
          
          {/* Dynamic Export Clearance Legend */}
          <div className="p-3 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono z-10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-sky-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
                ORIGIN: {COUNTRY_FLAGS[originCountry]} {COUNTRY_NAMES[originCountry] || originCountry} ({countryPlants.length} plants)
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                CLEAR (Pass)
              </span>
              <span className="flex items-center gap-1 text-red-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-700"></span>
                BLOCKED
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-700"></span>
                CONDITIONAL
              </span>
            </div>

            <div className="text-stone-400 text-[10px]">
              {mapClickMode === 'SET_ORIGIN' ? '👉 Click any country to set as ORIGIN' : '👉 Click any country to inspect'}
            </div>
          </div>

          {/* Map Vector Component */}
          <div className="flex-1 relative w-full h-full min-h-[500px] flex items-center justify-center bg-stone-950">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 720, center: [14, 54] }}
              className="w-full h-full"
            >
              <ZoomableGroup center={[14, 54]} zoom={1} minZoom={0.9} maxZoom={3}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const iso3 = geo.id;
                      const iso2 = COUNTRY_ISO3_TO_ISO2[iso3];
                      const market = marketByIso3.get(iso3);
                      const isClickable = Boolean(market || (iso2 && COUNTRY_COORDINATES[iso2]));

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getCountryFillColor(iso3)}
                          stroke="#1c1917"
                          strokeWidth={0.6}
                          style={{
                            default: { outline: 'none', transition: 'all 200ms' },
                            hover: {
                              fill: isClickable ? '#14b8a6' : '#44403c',
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

                {/* Origin Marker */}
                {originCoords && (
                  <Marker coordinates={originCoords}>
                    <circle r={8} fill="#38bdf8" stroke="#ffffff" strokeWidth={2.5} className="animate-pulse" />
                    <text
                      textAnchor="middle"
                      y={-14}
                      style={{ fontFamily: 'JetBrains Mono, monospace', fill: '#38bdf8', fontSize: 11, fontWeight: 800 }}
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
                        style={{ fontFamily: 'JetBrains Mono, monospace', fill: '#2dd4bf', fontSize: 9, fontWeight: 700 }}
                      >
                        TARGET ({COUNTRY_FLAGS[targetCountryCode] || ''} {targetMarket?.country || targetCountryCode})
                      </text>
                    </Marker>
                  </>
                )}

                {/* Biomethane Plant Infrastructure Layer Pins */}
                {visibleMapPins.map((plant) => {
                  if (!plant.coordinates) return null;
                  const isOriginPlant = plant.countryCode === originCountry;
                  return (
                    <Marker
                      key={plant.id}
                      coordinates={plant.coordinates}
                      onClick={() => setSelectedPlant(plant)}
                    >
                      <circle
                        r={isOriginPlant ? 4.5 : 3}
                        fill={isOriginPlant ? '#38bdf8' : '#fbbf24'}
                        stroke={isOriginPlant ? '#0369a1' : '#78350f'}
                        strokeWidth={1}
                        className="cursor-pointer hover:r-6 transition-all opacity-90 hover:opacity-100"
                      />
                    </Marker>
                  );
                })}

              </ZoomableGroup>
            </ComposableMap>

            {/* Hover Floating Card */}
            {hoveredCountry && (
              <div className="absolute bottom-3 left-3 z-20 bg-stone-900/95 border border-stone-700 rounded-lg p-3 text-stone-100 max-w-xs font-mono text-xs shadow-xl pointer-events-none">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-sm">{hoveredCountry.name} ({hoveredCountry.iso2 || hoveredCountry.iso3})</span>
                  {hoveredCountry.market ? (
                    <StatusChip variant={marketClearanceMap.get(hoveredCountry.iso2)?.eligibility?.overallVerdict || 'UNKNOWN'} size="xs" />
                  ) : (
                    <span className="text-[10px] text-stone-500">Unmodeled</span>
                  )}
                </div>
                {hoveredCountry.market && (
                  <div className="mt-1 text-[11px] text-stone-300">
                    <div>Scheme: {hoveredCountry.market.name}</div>
                    <div className="text-teal-400 font-semibold">
                      Netback: €{marketClearanceMap.get(hoveredCountry.iso2)?.netback?.netNetback?.toFixed(2) ?? '—'}/MWh
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT DRAWER: 1. PLANTS BY FEEDSTOCK & 2. COMPLIANCE CLEARANCE */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3.5 font-mono text-xs flex flex-col justify-between shadow-sm min-h-[580px]">
          
          <div className="space-y-3">
            
            {/* Header with Country Switch & Tab Selector */}
            <div className="flex items-start justify-between border-b border-stone-800 pb-2.5">
              <div>
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Selected Origin Facility Base</span>
                <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="text-sky-300">{inspectedCountryFlag} {inspectedCountryName}</span>
                  <span className="text-xs text-teal-400 bg-teal-950 border border-teal-800 px-1.5 py-0.2 rounded">
                    {countryPlants.length} Facilities
                  </span>
                </span>
              </div>

              {/* Drawer Tab Switcher */}
              <div className="flex items-center bg-stone-950 border border-stone-800 rounded p-0.5 text-[10px]">
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

                  <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-stone-800/40">
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
