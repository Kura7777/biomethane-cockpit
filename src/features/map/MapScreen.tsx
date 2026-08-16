import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Line } from 'react-simple-maps';
import { useNavigate } from 'react-router-dom';
import { MARKETS } from '../../domain/markets/registry';
import { Market, MarketStatus } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { Consignment } from '../../domain/consignment/types';
import { Globe, ArrowRight, ShieldCheck, AlertTriangle, TrendingUp, Info, Layers, CheckCircle2, XCircle } from 'lucide-react';

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
    return {
      id: 'default_consignment',
      name: 'Danish Manure Benchmark (ISCC EU)',
      originCountry: 'DK',
      originCountryName: 'Denmark',
      feedstock: 'manure',
      feedstockName: 'Animal manure and slurry',
      annexClassification: 'IX_A',
      carbonIntensity: -100,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      injectionCountry: 'DK',
      injectionIsEU: true,
      udbStatus: 'RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: 10000,
    };
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
    if (!market) return '#f5f5f4'; // stone-100
    switch (market.status) {
      case 'ACTIVE':
        return '#0f766e'; // teal-700
      case 'EMERGING':
        return '#fde68a'; // amber-200
      case 'FUTURE':
        return '#bfdbfe'; // blue-200
      default:
        return '#e7e5e4'; // stone-200
    }
  };

  const activeNationalMarkets = MARKETS.filter(m => m.status === 'ACTIVE' && !m.isEUScope);
  const euWideMarkets = MARKETS.filter(m => m.isEUScope || m.id === 'VOL_SCOPE1');

  const handleLaunchTrade = (marketId: string) => {
    dispatch({ type: 'SELECT_MARKET', id: marketId });
    navigate(`/trade?marketId=${marketId}`);
  };

  const handleLoadPreset = (preset: 'dk_manure' | 'uk_food' | 'iscc_plus') => {
    let newConsignment: Consignment;
    if (preset === 'dk_manure') {
      newConsignment = {
        id: 'preset_dk_manure',
        name: 'Danish Manure -> German THG Benchmark',
        originCountry: 'DK',
        originCountryName: 'Denmark',
        feedstock: 'manure',
        feedstockName: 'Animal manure and slurry',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'DK',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
      };
      setSelectedMarketForArc('DE_THG');
    } else if (preset === 'uk_food') {
      newConsignment = {
        id: 'preset_uk_food',
        name: 'UK Food Waste (Non-EU Grid Blocked)',
        originCountry: 'GB',
        originCountryName: 'United Kingdom',
        feedstock: 'food_waste',
        feedstockName: 'Bio-waste (food waste)',
        annexClassification: 'IX_A',
        carbonIntensity: 20,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'GB',
        injectionIsEU: false,
        udbStatus: 'NOT_RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 8000,
      };
      setSelectedMarketForArc('DE_THG');
    } else {
      newConsignment = {
        id: 'preset_iscc_plus',
        name: 'ISCC PLUS Voluntary Consignment',
        originCountry: 'FR',
        originCountryName: 'France',
        feedstock: 'agricultural_residues',
        feedstockName: 'Straw and agricultural residues',
        annexClassification: 'IX_A',
        carbonIntensity: 18,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_PLUS',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'FR',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 5000,
      };
      setSelectedMarketForArc('VOL_SCOPE1');
    }

    dispatch({ type: 'ADD_CONSIGNMENT', consignment: newConsignment });
  };

  const originCoords = COUNTRY_COORDINATES[activeConsignment.originCountry] || [10, 50];
  const targetMarket = MARKETS.find(m => m.id === selectedMarketForArc);
  const destCoords = targetMarket?.country ? COUNTRY_COORDINATES[targetMarket.country] : undefined;

  return (
    <div className="space-y-6">
      {/* Header Bar with Context & Quick Presets */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-bold text-stone-900">European Biomethane Compliance Map</h2>
            <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">RED III Active</span>
          </div>
          <p className="text-stone-600 text-sm mt-1">
            Real-time regulatory status across 30+ European jurisdictions. Click any country to validate trade eligibility, netbacks, and legal citations.
          </p>
        </div>

        {/* Quick Presets for Demo / Boss Presentation */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Demo Presets:</span>
          <button
            onClick={() => handleLoadPreset('dk_manure')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors"
          >
            🇩🇰 DK Manure (CI −100)
          </button>
          <button
            onClick={() => handleLoadPreset('uk_food')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 transition-colors"
          >
            🇬🇧 UK Grid (UDB Block)
          </button>
          <button
            onClick={() => handleLoadPreset('iscc_plus')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            📋 ISCC PLUS (Voluntary Only)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-8 bg-stone-900 rounded-2xl shadow-md border border-stone-800 overflow-hidden relative flex flex-col min-h-[580px]">
          {/* Map Status Overlay Bar */}
          <div className="p-4 bg-stone-950/80 backdrop-blur-sm border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-stone-200 font-medium">
                <span className="w-3 h-3 rounded-full bg-teal-600 inline-block ring-2 ring-teal-400/30"></span>
                ACTIVE Obligation ({MARKETS.filter(m => m.status === 'ACTIVE').length})
              </span>
              <span className="flex items-center gap-1.5 text-stone-300">
                <span className="w-3 h-3 rounded-full bg-amber-200 inline-block"></span>
                EMERGING (17)
              </span>
              <span className="flex items-center gap-1.5 text-stone-300">
                <span className="w-3 h-3 rounded-full bg-blue-300 inline-block"></span>
                FUTURE 2028 (ETS2)
              </span>
              <span className="flex items-center gap-1.5 text-stone-400">
                <span className="w-3 h-3 rounded-full bg-stone-700 inline-block"></span>
                NONE / Niche
              </span>
            </div>

            <div className="text-stone-400 text-xs flex items-center gap-1">
              <span>Active Consignment:</span>
              <span className="font-semibold text-teal-400">{activeConsignment.originCountry} ({activeConsignment.feedstockName})</span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="flex-1 relative w-full h-full min-h-[500px] flex items-center justify-center">
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
                          stroke="#292524"
                          strokeWidth={0.6}
                          style={{
                            default: { outline: 'none', transition: 'all 200ms' },
                            hover: {
                              fill: isClickable ? '#14b8a6' : '#a8a29e',
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

                {/* Draw Origin Marker */}
                {originCoords && (
                  <Marker coordinates={originCoords}>
                    <circle r={7} fill="#38bdf8" stroke="#ffffff" strokeWidth={2} className="animate-pulse" />
                    <text
                      textAnchor="middle"
                      y={-12}
                      style={{ fontFamily: 'Inter, sans-serif', fill: '#38bdf8', fontSize: 10, fontWeight: 700 }}
                    >
                      ORIGIN ({activeConsignment.originCountry})
                    </text>
                  </Marker>
                )}

                {/* Draw Destination Marker & Arc if selected */}
                {destCoords && destCoords !== originCoords && (
                  <>
                    <Line
                      from={originCoords}
                      to={destCoords}
                      stroke="#2dd4bf"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />
                    <Marker coordinates={destCoords}>
                      <circle r={6} fill="#2dd4bf" stroke="#ffffff" strokeWidth={2} />
                      <text
                        textAnchor="middle"
                        y={-10}
                        style={{ fontFamily: 'Inter, sans-serif', fill: '#2dd4bf', fontSize: 9, fontWeight: 700 }}
                      >
                        TARGET ({targetMarket?.country})
                      </text>
                    </Marker>
                  </>
                )}
              </ZoomableGroup>
            </ComposableMap>

            {/* Hover Tooltip / Floating Card */}
            {hoveredCountry && (
              <div className="absolute bottom-4 left-4 z-20 bg-stone-950/95 backdrop-blur-md border border-stone-700 rounded-xl p-4 shadow-xl text-stone-100 max-w-sm pointer-events-none">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-base text-white">{hoveredCountry.name}</h4>
                  {hoveredCountry.market ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      hoveredCountry.market.status === 'ACTIVE' ? 'bg-teal-900 text-teal-200 border border-teal-700' :
                      hoveredCountry.market.status === 'EMERGING' ? 'bg-amber-900 text-amber-200 border border-amber-700' :
                      hoveredCountry.market.status === 'FUTURE' ? 'bg-blue-900 text-blue-200 border border-blue-700' :
                      'bg-stone-800 text-stone-400'
                    }`}>
                      {hoveredCountry.market.status}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-500">Non-EU / Other</span>
                  )}
                </div>

                {hoveredCountry.market && (
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-stone-300 font-medium">{hoveredCountry.market.name}</p>
                    <p className="text-stone-400 font-mono">Unit: {hoveredCountry.market.unitLabel}</p>
                    <p className="text-stone-400">Legal: {hoveredCountry.market.legalBasis}</p>
                    {hoveredCountry.market.status === 'ACTIVE' && (
                      <div className="mt-2 pt-2 border-t border-stone-800 text-teal-400 font-semibold flex items-center gap-1">
                        Click country to validate trade in Trade Builder →
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Active Markets & Tradeability Previews */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active National Markets List */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                Active National Markets
              </h3>
              <span className="text-xs text-stone-500 font-mono">{activeNationalMarkets.length} live pools</span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {activeNationalMarkets.map(m => {
                const eligibility = evaluateEligibility(activeConsignment, m);
                const netback = computeNetback(m, activeConsignment, state.marks, state.costs);
                const isTargetSelected = selectedMarketForArc === m.id;

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isTargetSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-xs'
                        : 'border-stone-200 hover:border-teal-400 bg-white hover:bg-stone-50'
                    }`}
                    onClick={() => {
                      setSelectedMarketForArc(m.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-stone-900">{m.country}</span>
                          <span className="font-semibold text-xs text-stone-800">{m.name}</span>
                        </div>
                        <span className="text-stone-500 text-xs font-mono">{m.unitLabel}</span>
                      </div>
                      <StatusChip variant={eligibility.overallVerdict} size="sm" />
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="text-stone-500">Netback:</span>
                      <span className="font-mono font-bold text-stone-900">
                        {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : 'Mark not set'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchTrade(m.id);
                        }}
                        className="text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-0.5 text-xs"
                      >
                        Trade <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EU-Wide & Scope 1 Compliance Programs */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              EU-Wide & Voluntary Schemes
            </h3>

            <div className="space-y-2.5">
              {euWideMarkets.map(m => {
                const eligibility = evaluateEligibility(activeConsignment, m);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleLaunchTrade(m.id)}
                    className="p-3 rounded-xl border border-stone-200 hover:border-teal-400 bg-white hover:bg-stone-50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-stone-900">{m.name}</div>
                      <div className="text-stone-500 text-xs font-mono">{m.unitLabel} • {m.status}</div>
                    </div>
                    <StatusChip variant={eligibility.overallVerdict} size="sm" />
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
