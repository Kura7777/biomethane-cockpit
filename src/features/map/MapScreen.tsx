import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Line } from 'react-simple-maps';
import { useNavigate } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { Market, MarketStatus } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { StaleIndicator } from '../../shared/components/StaleIndicator';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { Consignment, CertificationScheme, ChainOfCustody } from '../../domain/consignment/types';
import { 
  Globe, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Info, 
  Layers, 
  Terminal,
  CheckCircle2,
  XCircle,
  Sliders,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Flame,
  CornerDownRight
} from 'lucide-react';

const EU_COUNTRY_CODES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

const COUNTRY_ISO2_TO_ISO3: Record<string, string> = {
  AT: 'AUT', BE: 'BEL', BG: 'BGR', HR: 'HRV', CY: 'CYP', CZ: 'CZE',
  DK: 'DNK', EE: 'EST', FI: 'FIN', FR: 'FRA', DE: 'DEU', GR: 'GRC',
  HU: 'HUN', IE: 'IRL', IT: 'ITA', LV: 'LVA', LT: 'LTU', LU: 'LUX',
  MT: 'MLT', NL: 'NLD', PL: 'POL', PT: 'PRT', RO: 'ROU', SK: 'SVK',
  SI: 'SVN', ES: 'ESP', SE: 'SWE', GB: 'GBR', CH: 'CHE', NO: 'NOR',
  UA: 'UKR',
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
};

const COUNTRY_NAMES: Record<string, string> = {
  DK: 'Denmark',
  GB: 'United Kingdom',
  NL: 'Netherlands',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  PL: 'Poland',
  BE: 'Belgium',
  AT: 'Austria',
  SE: 'Sweden',
  FI: 'Finland',
};

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

export function MapScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  // Active Origin Consignment Config
  const [originCountry, setOriginCountry] = useState<string>('DK');
  const [feedstockKey, setFeedstockKey] = useState<string>('manure');
  const [carbonIntensity, setCarbonIntensity] = useState<number>(-100);
  const [scheme, setScheme] = useState<CertificationScheme>('ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>('MASS_BALANCE');
  const [injectionCountry, setInjectionCountry] = useState<string>('DK');

  // Interactive Target Market Selection
  const [selectedDestinationMarketId, setSelectedDestinationMarketId] = useState<string>('DE_THG');
  const [hoveredCountry, setHoveredCountry] = useState<{ iso2: string; iso3: string; name: string; market?: Market } | null>(null);

  // Synchronize consignment configuration
  const activeConsignment: Consignment = useMemo(() => {
    const feedstockInfo = FEEDSTOCK_REGISTRY[feedstockKey] || FEEDSTOCK_REGISTRY.manure;
    const isEU = EU_COUNTRY_CODES.includes(injectionCountry);

    return {
      id: 'map_active_consignment',
      name: `${COUNTRY_NAMES[originCountry] || originCountry} ${feedstockInfo.name}`,
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
  }, [originCountry, feedstockKey, carbonIntensity, scheme, chainOfCustody, injectionCountry]);

  // Map market lookups
  const marketByIso3 = useMemo(() => {
    const map = new Map<string, Market>();
    MARKETS.forEach(m => {
      if (!m.isEUScope && m.country) {
        const iso3 = COUNTRY_ISO2_TO_ISO3[m.country];
        if (iso3) map.set(iso3, m);
      }
    });
    return map;
  }, []);

  const marketByIso2 = useMemo(() => {
    const map = new Map<string, Market>();
    MARKETS.forEach(m => {
      if (!m.isEUScope && m.country) {
        map.set(m.country, m);
      }
    });
    return map;
  }, []);

  // Compute live eligibility and netbacks for all markets based on active consignment
  const marketAssessments = useMemo(() => {
    const map = new Map<string, { eligibility: ReturnType<typeof evaluateEligibility>; netback: ReturnType<typeof computeNetback> }>();
    MARKETS.forEach(m => {
      const eligibility = evaluateEligibility(activeConsignment, m);
      const netback = computeNetback(m, activeConsignment, state.marks, state.costs, state.marks.pricingSide);
      map.set(m.id, { eligibility, netback });
    });
    return map;
  }, [activeConsignment, state.marks, state.costs]);

  // Dynamic Country Color Fill based on Export Clearance from the Origin!
  const getCountryFillColor = (iso3: string) => {
    const iso2 = COUNTRY_ISO3_TO_ISO2[iso3];
    
    // Highlight origin country in bright blue
    if (iso2 === originCountry) {
      return '#0284c7'; // sky-600 (Origin)
    }

    const market = marketByIso3.get(iso3);
    if (!market) return '#1c1917'; // stone-900

    // Selected target destination gets highlighted
    if (market.id === selectedDestinationMarketId) {
      return '#14b8a6'; // teal-500
    }

    const assessment = marketAssessments.get(market.id);
    if (!assessment) return '#292524';

    const verdict = assessment.eligibility.overallVerdict;

    if (verdict === 'ELIGIBLE') {
      return '#059669'; // emerald-600 (Approved export destination)
    }
    if (verdict === 'UNRESOLVED') {
      return '#0284c7'; // sky-700 (German double counting uncertainty)
    }
    if (verdict === 'CONDITIONAL') {
      return '#b45309'; // amber-700 (Capped or conditional)
    }
    if (verdict === 'HARD_BLOCK') {
      return '#991b1b'; // red-800 (Blocked export!)
    }
    if (market.status === 'EMERGING') {
      return '#451a03'; // dark amber
    }
    if (market.status === 'FUTURE') {
      return '#172554'; // dark blue
    }

    return '#292524'; // stone-800
  };

  // Quick Preset Handlers
  const handleLoadPreset = (presetKey: keyof typeof REFERENCE_CONSIGNMENTS, targetMarket: string) => {
    const p = REFERENCE_CONSIGNMENTS[presetKey];
    if (p) {
      setOriginCountry(p.originCountry);
      setFeedstockKey(p.feedstock);
      setCarbonIntensity(p.carbonIntensity);
      setScheme(p.certificationScheme);
      setChainOfCustody(p.chainOfCustody);
      setInjectionCountry(p.injectionCountry);
      setSelectedDestinationMarketId(targetMarket);
    }
  };

  const handleCountryClick = (iso3: string) => {
    const iso2 = COUNTRY_ISO3_TO_ISO2[iso3];
    const market = marketByIso3.get(iso3);

    if (market) {
      setSelectedDestinationMarketId(market.id);
    } else if (iso2 && COUNTRY_COORDINATES[iso2]) {
      // If clicking a non-market country with coordinates, make it the origin
      setOriginCountry(iso2);
      setInjectionCountry(iso2);
    }
  };

  const handleOpenInTradeBuilder = (marketId: string) => {
    dispatch({ type: 'ADD_CONSIGNMENT', consignment: activeConsignment });
    dispatch({ type: 'SELECT_MARKET', id: marketId });
    navigate(`/trade?marketId=${marketId}`);
  };

  const originCoords = COUNTRY_COORDINATES[originCountry] || [10, 50];
  const targetMarket = getMarketById(selectedDestinationMarketId);
  const destCoords = targetMarket?.country ? COUNTRY_COORDINATES[targetMarket.country] : undefined;

  const targetAssessment = selectedDestinationMarketId ? marketAssessments.get(selectedDestinationMarketId) : null;
  const activeNationalMarkets = MARKETS.filter(m => m.status === 'ACTIVE' && !m.isEUScope);

  return (
    <div className="space-y-4 font-sans text-stone-100 pb-16">
      
      {/* Interactive Flow Configuration Header Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-400" />
              <h1 className="text-base font-bold text-white font-mono uppercase tracking-tight">
                European Biomethane Export & Arbitrage Map
              </h1>
              <span className="text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded">
                Live Flow Clearance
              </span>
            </div>
            <p className="text-stone-400 text-xs mt-0.5 font-mono">
              Select an <strong className="text-sky-300">Origin Country</strong> and specifications below to immediately visualize which European markets this biomethane can legally be exported to.
            </p>
          </div>

          {/* Quick Demo Presets */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="text-[10px] text-stone-500 uppercase font-bold">Quick Presets:</span>
            <button
              onClick={() => handleLoadPreset('DANISH_MANURE', 'DE_THG')}
              className="px-2 py-0.5 rounded border border-teal-800 bg-teal-950/60 text-teal-300 hover:bg-teal-900 transition-colors"
            >
              🇩🇰 DK Manure ➔ DE
            </button>
            <button
              onClick={() => handleLoadPreset('UK_FOOD_WASTE', 'DE_THG')}
              className="px-2 py-0.5 rounded border border-red-800 bg-red-950/60 text-red-300 hover:bg-red-900 transition-colors"
            >
              🇬🇧 UK Grid (UDB Block)
            </button>
            <button
              onClick={() => handleLoadPreset('ISCC_PLUS_VOLUNTARY', 'VOL_SCOPE1')}
              className="px-2 py-0.5 rounded border border-amber-800 bg-amber-950/60 text-amber-300 hover:bg-amber-900 transition-colors"
            >
              📋 ISCC PLUS (Voluntary)
            </button>
            <button
              onClick={() => handleLoadPreset('FUELEU_MARITIME_LNG', 'FUELEU')}
              className="px-2 py-0.5 rounded border border-blue-800 bg-blue-950/60 text-blue-300 hover:bg-blue-900 transition-colors"
            >
              ⚓ FuelEU Bio-LNG
            </button>
          </div>
        </div>

        {/* Live Export Origin Specifier Toolbar */}
        <div className="pt-2 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
          
          {/* 1. Origin Country */}
          <div>
            <label className="block text-[9px] font-bold text-sky-400 uppercase mb-0.5">
              1. Origin Country
            </label>
            <select
              value={originCountry}
              onChange={e => {
                setOriginCountry(e.target.value);
                setInjectionCountry(e.target.value);
              }}
              className="w-full bg-stone-950 border border-sky-800 rounded px-2 py-1 text-sky-200 font-bold outline-none"
            >
              <option value="DK">🇩🇰 Denmark</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="NL">🇳🇱 Netherlands</option>
              <option value="DE">🇩🇪 Germany</option>
              <option value="FR">🇫🇷 France</option>
              <option value="IT">🇮🇹 Italy</option>
              <option value="ES">🇪🇸 Spain</option>
              <option value="PL">🇵🇱 Poland</option>
              <option value="BE">🇧🇪 Belgium</option>
              <option value="AT">🇦🇹 Austria</option>
              <option value="SE">🇸🇪 Sweden</option>
              <option value="FI">🇫🇮 Finland</option>
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
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200 outline-none"
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
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-teal-300 font-bold"
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
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200 outline-none"
            >
              <option value="ISCC_EU">ISCC EU (RED III)</option>
              <option value="REDCERT_EU">REDcert EU (RED III)</option>
              <option value="2BSVS">2BSvs (RED III)</option>
              <option value="KZR_INIG">KZR INiG (RED III)</option>
              <option value="ISCC_PLUS">ISCC PLUS (Voluntary)</option>
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
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200 outline-none"
            >
              <option value="DK">🇩🇰 EU Grid (Denmark)</option>
              <option value="DE">🇩🇪 EU Grid (Germany)</option>
              <option value="NL">🇳🇱 EU Grid (Netherlands)</option>
              <option value="FR">🇫🇷 EU Grid (France)</option>
              <option value="GB">🇬🇧 Non-EU Grid (UK)</option>
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
              className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200 outline-none"
            >
              <option value="MASS_BALANCE">Mass Balance</option>
              <option value="SEGREGATION">Segregation (LNG)</option>
              <option value="BOOK_AND_CLAIM">Book-and-Claim</option>
            </select>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* SVG Interactive Map Canvas */}
        <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-xl overflow-hidden relative flex flex-col min-h-[540px]">
          
          {/* Dynamic Export Clearance Legend */}
          <div className="p-3 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono z-10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-sky-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                ORIGIN ({originCountry})
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                EXPORT CLEAR (Pass)
              </span>
              <span className="flex items-center gap-1 text-red-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-700"></span>
                BLOCKED (Non-EU / Gate Block)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-700"></span>
                CONDITIONAL
              </span>
            </div>

            <div className="text-stone-400 text-[10px]">
              Click any country to inspect export route ➔
            </div>
          </div>

          {/* Map Vector Component */}
          <div className="flex-1 relative w-full h-full min-h-[460px] flex items-center justify-center bg-stone-950">
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
                    <circle r={6} fill="#38bdf8" stroke="#ffffff" strokeWidth={2} className="animate-pulse" />
                    <text
                      textAnchor="middle"
                      y={-10}
                      style={{ fontFamily: 'JetBrains Mono, monospace', fill: '#38bdf8', fontSize: 10, fontWeight: 700 }}
                    >
                      ORIGIN ({originCountry})
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
                        TARGET ({targetMarket?.country})
                      </text>
                    </Marker>
                  </>
                )}
              </ZoomableGroup>
            </ComposableMap>

            {/* Hover Floating Card */}
            {hoveredCountry && (
              <div className="absolute bottom-3 left-3 z-20 bg-stone-900/95 border border-stone-700 rounded-lg p-3 text-stone-100 max-w-xs font-mono text-xs shadow-xl pointer-events-none">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-sm">{hoveredCountry.name} ({hoveredCountry.iso2 || hoveredCountry.iso3})</span>
                  {hoveredCountry.market ? (
                    <StatusChip variant={marketAssessments.get(hoveredCountry.market.id)?.eligibility.overallVerdict || 'UNKNOWN'} size="xs" />
                  ) : (
                    <span className="text-[10px] text-stone-500">Non-EU</span>
                  )}
                </div>

                {hoveredCountry.market && (
                  <div className="mt-1.5 space-y-0.5 text-[11px]">
                    <div className="text-stone-300">{hoveredCountry.market.name}</div>
                    <div className="text-teal-400 font-bold">
                      Netback: {marketAssessments.get(hoveredCountry.market.id)?.netback.netNetback !== null
                        ? `€${marketAssessments.get(hoveredCountry.market.id)?.netback.netNetback?.toFixed(2)}/MWh`
                        : 'No mark set'}
                    </div>
                    <div className="text-stone-500 text-[10px]">{marketAssessments.get(hoveredCountry.market.id)?.eligibility.summary}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Selected Route Clearance & Netback Inspector */}
        <div className="lg:col-span-4 space-y-3 font-mono text-xs">
          
          {/* Selected Export Route Inspector Panel */}
          {targetMarket && targetAssessment && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="font-bold text-teal-400 uppercase text-[11px] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Selected Export Clearance
                </span>
                <StatusChip variant={targetAssessment.eligibility.overallVerdict} size="xs" />
              </div>

              {/* Route Heading */}
              <div className="p-2.5 bg-stone-950 border border-stone-800 rounded space-y-1">
                <div className="text-[10px] text-stone-400 uppercase font-bold">Export Flow:</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{originCountry} ({COUNTRY_NAMES[originCountry] || originCountry})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                  <span>{targetMarket.country || 'EU'} ({targetMarket.name})</span>
                </div>
              </div>

              {/* Summary Reason */}
              <div className={`p-2.5 rounded border text-[11px] leading-relaxed ${
                targetAssessment.eligibility.overallVerdict === 'ELIGIBLE' ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' :
                targetAssessment.eligibility.overallVerdict === 'HARD_BLOCK' ? 'bg-red-950/40 border-red-800/80 text-red-300' :
                'bg-sky-950/40 border-sky-800/80 text-sky-300'
              }`}>
                <strong>Clearance Status:</strong> {targetAssessment.eligibility.summary}
              </div>

              {/* Netback Economics Preview */}
              <div className="p-2.5 bg-stone-950 border border-stone-800 rounded space-y-1 text-xs">
                <div className="flex justify-between text-stone-400">
                  <span>Certificate Value:</span>
                  <span className="font-bold text-stone-200">
                    {targetAssessment.netback.certificateValue?.valueEurPerMWh !== null && targetAssessment.netback.certificateValue?.valueEurPerMWh !== undefined
                      ? `€${targetAssessment.netback.certificateValue.valueEurPerMWh.toFixed(2)}/MWh`
                      : 'No mark'}
                  </span>
                </div>

                <div className="flex justify-between text-stone-400">
                  <span>Net Netback (€/MWh):</span>
                  <span className="font-bold text-teal-400">
                    {targetAssessment.netback.netNetback !== null
                      ? `€${targetAssessment.netback.netNetback.toFixed(2)}`
                      : '—'}
                  </span>
                </div>

                {targetAssessment.netback.impliedMargin !== null && (
                  <div className="flex justify-between text-stone-400 border-t border-stone-900 pt-1">
                    <span>Implied Margin:</span>
                    <span className="font-bold text-emerald-400">
                      €{targetAssessment.netback.impliedMargin.toFixed(2)}/MWh ({targetAssessment.netback.marginPercent?.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleOpenInTradeBuilder(targetMarket.id)}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                Inspect Full Dossier in Trade Builder <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick List of All National Markets with Live Clearance Status */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="font-bold text-stone-200 uppercase text-[11px]">All Destination Markets ({originCountry} Origin)</span>
              <span className="text-[10px] text-stone-500">{activeNationalMarkets.length} active</span>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {activeNationalMarkets.map(m => {
                const assessment = marketAssessments.get(m.id);
                const isTargetSelected = selectedDestinationMarketId === m.id;

                return (
                  <div
                    key={m.id}
                    className={`p-2 rounded border transition-all cursor-pointer ${
                      isTargetSelected
                        ? 'border-teal-500 bg-teal-950/60 ring-1 ring-teal-500'
                        : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                    }`}
                    onClick={() => setSelectedDestinationMarketId(m.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-stone-200">{m.country} {m.name}</div>
                        <div className="text-teal-400 text-[10px]">
                          {assessment?.netback.netNetback !== null && assessment?.netback.netNetback !== undefined
                            ? `€${assessment.netback.netNetback.toFixed(2)}/MWh`
                            : 'No mark'}
                        </div>
                      </div>
                      <StatusChip variant={assessment?.eligibility.overallVerdict || 'UNKNOWN'} size="xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
