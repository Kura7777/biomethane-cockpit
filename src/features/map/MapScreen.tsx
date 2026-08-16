import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Line } from 'react-simple-maps';
import { useNavigate } from 'react-router-dom';
import { MARKETS } from '../../domain/markets/registry';
import { Market, MarketStatus } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { StaleIndicator } from '../../shared/components/StaleIndicator';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { Consignment } from '../../domain/consignment/types';
import { Globe, ArrowRight, ShieldCheck, AlertTriangle, TrendingUp, Info, Layers, Terminal } from 'lucide-react';

const COUNTRY_ISO2_TO_ISO3: Record<string, string> = {
  AT: 'AUT', BE: 'BEL', BG: 'BGR', HR: 'HRV', CY: 'CYP', CZ: 'CZE',
  DK: 'DNK', EE: 'EST', FI: 'FIN', FR: 'FRA', DE: 'DEU', GR: 'GRC',
  HU: 'HUN', IE: 'IRL', IT: 'ITA', LV: 'LVA', LT: 'LTU', LU: 'LUX',
  MT: 'MLT', NL: 'NLD', PL: 'POL', PT: 'PRT', RO: 'ROU', SK: 'SVK',
  SI: 'SVN', ES: 'ESP', SE: 'SWE', GB: 'GBR', CH: 'CHE', NO: 'NOR',
  UA: 'UKR',
};

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

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

export function MapScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const [hoveredCountry, setHoveredCountry] = useState<{ name: string; iso3: string; market?: Market } | null>(null);
  const [selectedMarketForArc, setSelectedMarketForArc] = useState<string | null>('DE_THG');

  const activeConsignment: Consignment = useMemo(() => {
    const found = state.consignments.find(c => c.id === state.activeConsignmentId);
    if (found) return found;
    return REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  }, [state.consignments, state.activeConsignmentId]);

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

  const getFillColor = (iso3: string) => {
    const market = marketByIso3.get(iso3);
    if (!market) return '#1c1917'; // stone-900 (not in registry)
    switch (market.status) {
      case 'ACTIVE':
        return '#0d9488'; // teal-600
      case 'EMERGING':
        return '#854d0e'; // amber-800
      case 'FUTURE':
        return '#1e3a8a'; // blue-900
      default:
        return '#292524'; // stone-800
    }
  };

  const activeNationalMarkets = MARKETS.filter(m => m.status === 'ACTIVE' && !m.isEUScope);
  const euWideMarkets = MARKETS.filter(m => m.isEUScope || m.id === 'VOL_SCOPE1');

  const handleLaunchTrade = (marketId: string) => {
    dispatch({ type: 'SELECT_MARKET', id: marketId });
    navigate(`/trade?marketId=${marketId}`);
  };

  const originCoords = COUNTRY_COORDINATES[activeConsignment.originCountry] || [10, 50];
  const targetMarket = MARKETS.find(m => m.id === selectedMarketForArc);
  const destCoords = targetMarket?.country ? COUNTRY_COORDINATES[targetMarket.country] : undefined;

  return (
    <div className="space-y-4 font-sans text-stone-100 pb-16">
      
      {/* Top Banner with Presets */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-400" />
            <h1 className="text-base font-bold text-white font-mono uppercase tracking-tight">
              European Biomethane Regulatory Map
            </h1>
            <span className="text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded">
              RED III Verified
            </span>
          </div>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            Click any country to jump into the trade validator or select a reference flow.
          </p>
        </div>

        {/* Demo Presets */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="text-[10px] text-stone-500 uppercase font-bold">Presets:</span>
          <button
            onClick={() => {
              dispatch({ type: 'ADD_CONSIGNMENT', consignment: REFERENCE_CONSIGNMENTS.DANISH_MANURE });
              setSelectedMarketForArc('DE_THG');
            }}
            className="px-2.5 py-1 rounded border border-teal-800 bg-teal-950/60 text-teal-300 hover:bg-teal-900/80 transition-colors"
          >
            🇩🇰 DK Manure (THG)
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'ADD_CONSIGNMENT', consignment: REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE });
              setSelectedMarketForArc('DE_THG');
            }}
            className="px-2.5 py-1 rounded border border-red-800 bg-red-950/60 text-red-300 hover:bg-red-900/80 transition-colors"
          >
            🇬🇧 UK Grid (UDB Block)
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'ADD_CONSIGNMENT', consignment: REFERENCE_CONSIGNMENTS.ISCC_PLUS_VOLUNTARY });
              setSelectedMarketForArc('VOL_SCOPE1');
            }}
            className="px-2.5 py-1 rounded border border-amber-800 bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 transition-colors"
          >
            📋 ISCC PLUS (Voluntary)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* SVG Map Canvas */}
        <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-xl overflow-hidden relative flex flex-col min-h-[540px]">
          
          {/* Status Key Bar */}
          <div className="p-3 bg-stone-950/90 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono z-10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-stone-200">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                ACTIVE (14)
              </span>
              <span className="flex items-center gap-1.5 text-stone-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-800"></span>
                EMERGING (17)
              </span>
              <span className="flex items-center gap-1.5 text-stone-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-900"></span>
                FUTURE 2028
              </span>
              <span className="flex items-center gap-1.5 text-stone-500">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-800"></span>
                NONE
              </span>
            </div>

            <div className="text-stone-400 text-[10px]">
              Origin: <strong className="text-teal-400">{activeConsignment.originCountry} ({activeConsignment.feedstockName})</strong>
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
                      const market = marketByIso3.get(iso3);
                      const isClickable = market?.status === 'ACTIVE';

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getFillColor(iso3)}
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
                            setHoveredCountry({ name, iso3, market });
                          }}
                          onMouseLeave={() => setHoveredCountry(null)}
                          onClick={() => {
                            if (market && market.status === 'ACTIVE') {
                              handleLaunchTrade(market.id);
                            }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>

                {/* Origin Marker */}
                {originCoords && (
                  <Marker coordinates={originCoords}>
                    <circle r={6} fill="#38bdf8" stroke="#ffffff" strokeWidth={2} />
                    <text
                      textAnchor="middle"
                      y={-10}
                      style={{ fontFamily: 'JetBrains Mono, monospace', fill: '#38bdf8', fontSize: 10, fontWeight: 700 }}
                    >
                      ORIGIN ({activeConsignment.originCountry})
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
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                    <Marker coordinates={destCoords}>
                      <circle r={5} fill="#2dd4bf" stroke="#ffffff" strokeWidth={1.5} />
                      <text
                        textAnchor="middle"
                        y={-8}
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
                  <span className="font-bold text-white text-sm">{hoveredCountry.name}</span>
                  {hoveredCountry.market ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      hoveredCountry.market.status === 'ACTIVE' ? 'bg-teal-950 text-teal-300 border border-teal-800' :
                      hoveredCountry.market.status === 'EMERGING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-stone-800 text-stone-400'
                    }`}>
                      {hoveredCountry.market.status}
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-500">Non-EU</span>
                  )}
                </div>

                {hoveredCountry.market && (
                  <div className="mt-1.5 space-y-0.5 text-[11px]">
                    <div className="text-stone-300">{hoveredCountry.market.name}</div>
                    <div className="text-stone-400">Unit: {hoveredCountry.market.unitLabel}</div>
                    <div className="text-stone-500 text-[10px] truncate">{hoveredCountry.market.legalBasis}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar List */}
        <div className="lg:col-span-4 space-y-4 font-mono text-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="font-bold text-stone-200 uppercase text-[11px]">Active National Markets</span>
              <span className="text-[10px] text-stone-500">{activeNationalMarkets.length} live</span>
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {activeNationalMarkets.map(m => {
                const eligibility = evaluateEligibility(activeConsignment, m);
                const netback = computeNetback(m, activeConsignment, state.marks, state.costs, state.marks.pricingSide);
                const isTargetSelected = selectedMarketForArc === m.id;

                return (
                  <div
                    key={m.id}
                    className={`p-2 rounded border transition-all cursor-pointer ${
                      isTargetSelected
                        ? 'border-teal-500 bg-teal-950/50'
                        : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                    }`}
                    onClick={() => setSelectedMarketForArc(m.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-stone-200">{m.country} {m.name}</div>
                        <div className="text-stone-500 text-[10px]">{m.unitLabel}</div>
                      </div>
                      <StatusChip variant={eligibility.overallVerdict} size="xs" />
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-stone-900 flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">
                        {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : 'No mark'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchTrade(m.id);
                        }}
                        className="text-teal-400 hover:text-teal-300 font-bold inline-flex items-center gap-0.5 text-[10px]"
                      >
                        Trade <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 space-y-2">
            <span className="font-bold text-stone-200 uppercase text-[11px] block border-b border-stone-800 pb-1.5">
              EU-Wide & Voluntary Schemes
            </span>
            <div className="space-y-1.5">
              {euWideMarkets.map(m => {
                const eligibility = evaluateEligibility(activeConsignment, m);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleLaunchTrade(m.id)}
                    className="p-2 rounded border border-stone-800 bg-stone-950 hover:border-teal-600 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-stone-200">{m.name}</div>
                      <div className="text-stone-500 text-[10px]">{m.unitLabel} • {m.status}</div>
                    </div>
                    <StatusChip variant={eligibility.overallVerdict} size="xs" />
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
