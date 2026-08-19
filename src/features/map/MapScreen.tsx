import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { useAppState } from '../../store/context';
import { computeNetback } from '../../domain/netback/engine';
import { REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { Consignment } from '../../domain/consignment/types';
import { COUNTRY_MACRO_STATS, BIOMETHANE_PLANTS } from '../../domain/plants/registry';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { QuickDealDrawer } from '../sourcing/QuickDealDrawer';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { ArbitrageOpportunity, ClientRequest } from '../../domain/arbitrage/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { 
  Globe, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  ExternalLink, 
  ShieldCheck, 
  Info,
  Maximize2,
  Minimize2,
  Building2,
  Zap,
  MapPin,
  Navigation
} from 'lucide-react';

import { EUROPEAN_HUBS, TILE_PROVIDERS, CountryHub } from './mapData';

export function MapScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useAppState();

  const plantIdParam = searchParams.get('plantId');
  const originParam = searchParams.get('origin');
  const targetParam = searchParams.get('target');

  const sourcedPlant = useMemo(() => {
    if (!plantIdParam) return null;
    return BIOMETHANE_PLANTS.find(p => p.id === plantIdParam) || null;
  }, [plantIdParam]);

  const [originCountry, setOriginCountry] = useState<string>(originParam || sourcedPlant?.countryCode || 'DK');
  const [targetCountry, setTargetCountry] = useState<string>(targetParam || 'DE');
  const [selectedCountry, setSelectedCountry] = useState<string>(targetParam || 'DE');
  const [mapClickMode, setMapClickMode] = useState<'SET_ORIGIN' | 'SET_TARGET'>('SET_TARGET');
  const [mapTheme, setMapTheme] = useState<'hybrid' | 'satellite' | 'streets' | 'dark'>('hybrid');
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [selectedDealRoute, setSelectedDealRoute] = useState<ArbitrageOpportunity | null>(null);
  const [dealRequest, setDealRequest] = useState<ClientRequest | null>(null);

  // Resizable Panel State
  const [panelWidth, setPanelWidth] = useState<number>(480);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 850) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const flowLineRef = useRef<L.Polyline | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Active consignment for calculation
  const activeConsignment = useMemo(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    return existing || REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  }, [state.consignments, state.activeConsignmentId]);

  const consignment: Consignment = useMemo(() => ({
    ...activeConsignment,
    originCountry,
  }), [activeConsignment, originCountry]);

  // Selected Country Market
  const selectedMarket = useMemo(() => {
    return MARKETS.find(m => m.country === selectedCountry && m.status === 'ACTIVE') ||
      MARKETS.find(m => m.country === selectedCountry) || null;
  }, [selectedCountry]);

  const selectedMacro = useMemo(() => {
    const hub = EUROPEAN_HUBS.find(h => h.iso === selectedCountry);
    const stat = COUNTRY_MACRO_STATS.find(s => s.iso === selectedCountry);
    return {
      iso: selectedCountry,
      name: hub?.name || selectedCountry,
      plants: hub?.plants ?? stat?.activePlants ?? 0,
      twh: hub?.capacityTWh ? `${hub.capacityTWh} TWh` : '—',
      size: `${Math.round(450)} Nm³/h`,
      grid: '94%',
      feedstock: hub?.primaryFeedstock || stat?.primaryFeedstockType || 'Agricultural residues & manure',
      tech: stat?.primaryUpgradingTech || 'Membrane separation',
      registry: hub?.registry || stat?.nationalRegistry || 'National Biomethane Register',
      status: hub?.status || 'ACTIVE',
    };
  }, [selectedCountry]);

  // Logistics Assessment for Origin -> Selected
  const logistics = useMemo(() => {
    return calculateLogisticsRoute(originCountry, selectedCountry, state.marks.gasIndex.mid);
  }, [originCountry, selectedCountry, state.marks.gasIndex.mid]);

  // Netback for Selected Country Market
  const selectedNetback = useMemo(() => {
    if (!selectedMarket) return null;
    return computeNetback(selectedMarket, consignment, state.marks, state.costs, state.marks.pricingSides);
  }, [selectedMarket, consignment, state.marks, state.costs]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [52.0, 11.5],
      zoom: 4.8,
      minZoom: 3,
      maxZoom: 14,
      zoomControl: false,
    });

    const tileCfg = TILE_PROVIDERS[mapTheme];
    const tileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: 20,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch Tile Theme
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileCfg = TILE_PROVIDERS[mapTheme];
    tileLayerRef.current.setUrl(tileCfg.url);
  }, [mapTheme]);

  // 3. Render Hub Markers & Flow Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Add Clean Google-Style Hub Pins (Minimal, Non-Cluttering)
    EUROPEAN_HUBS.forEach(hub => {
      const isOrigin = hub.iso === originCountry;
      const isTarget = hub.iso === targetCountry;
      const isSelected = hub.iso === selectedCountry;

      let pinColor = '#10b981'; // emerald (Active)
      if (hub.status === 'EMERGING') pinColor = '#f59e0b'; // amber
      if (hub.status === 'RESTRICTED') pinColor = '#f43f5e'; // rose

      let html = '';
      let iconSize: [number, number] = [28, 28];
      let iconAnchor: [number, number] = [14, 14];

      if (isOrigin) {
        iconSize = [130, 36];
        iconAnchor = [65, 36];
        html = `
          <div class="cursor-pointer select-none flex flex-col items-center hover:scale-105 transition-transform">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950/95 text-sky-200 border-2 border-sky-400 ring-4 ring-sky-500/30 shadow-2xl font-mono text-[11px] font-bold backdrop-blur-xs">
              <span class="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
              <span class="font-sans">${hub.name}</span>
              <span class="text-[9px] bg-sky-900/80 px-1.5 py-0.5 rounded-full font-normal">Origin (${hub.plants}p)</span>
            </div>
            <div class="w-2 h-2 rotate-45 -mt-1 bg-sky-950/95 border-r-2 border-b-2 border-sky-400"></div>
          </div>
        `;
      } else if (isTarget) {
        iconSize = [130, 36];
        iconAnchor = [65, 36];
        html = `
          <div class="cursor-pointer select-none flex flex-col items-center hover:scale-105 transition-transform">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-950/95 text-teal-200 border-2 border-teal-400 ring-4 ring-teal-500/30 shadow-2xl font-mono text-[11px] font-bold backdrop-blur-xs">
              <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
              <span class="font-sans">${hub.name}</span>
              <span class="text-[9px] bg-teal-900/80 px-1.5 py-0.5 rounded-full font-normal">Target (${hub.plants}p)</span>
            </div>
            <div class="w-2 h-2 rotate-45 -mt-1 bg-teal-950/95 border-r-2 border-b-2 border-teal-400"></div>
          </div>
        `;
      } else {
        // Minimal Google Maps pin dot
        iconSize = [24, 24];
        iconAnchor = [12, 12];
        html = `
          <div class="group cursor-pointer select-none relative flex items-center justify-center hover:scale-130 transition-transform">
            <div class="w-5 h-5 rounded-full bg-stone-950/90 border border-white/60 shadow-lg flex items-center justify-center backdrop-blur-xs">
              <div class="w-2 h-2 rounded-full" style="background-color: ${pinColor}; box-shadow: 0 0 6px ${pinColor};"></div>
            </div>
            <!-- Clean Hover Tooltip -->
            <div class="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div class="px-2 py-0.5 rounded-xs bg-stone-950/95 border border-stone-700 text-stone-200 font-mono text-[10px] whitespace-nowrap shadow-xl">
                <strong>${hub.name}</strong> · ${hub.plants} plants (${hub.capacityTWh} TWh)
              </div>
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        html,
        className: 'custom-hub-marker',
        iconSize,
        iconAnchor,
      });

      const marker = L.marker(hub.coords, { icon: customIcon });
      marker.on('click', () => {
        handleCountryClick(hub.iso);
      });
      markersGroup.addLayer(marker);
    });

    // Draw Animated Flow Polyline from Origin -> Target
    if (flowLineRef.current) {
      map.removeLayer(flowLineRef.current);
      flowLineRef.current = null;
    }

    if (originCountry !== targetCountry) {
      const originHub = EUROPEAN_HUBS.find(h => h.iso === originCountry);
      const targetHub = EUROPEAN_HUBS.find(h => h.iso === targetCountry);

      if (originHub && targetHub) {
        // Curve the midpoint slightly for a sleek flight/pipeline arc
        const midLat = (originHub.coords[0] + targetHub.coords[0]) / 2 + 1.2;
        const midLng = (originHub.coords[1] + targetHub.coords[1]) / 2 - 1.0;

        const curvePoints: [number, number][] = [
          originHub.coords,
          [midLat, midLng],
          targetHub.coords,
        ];

        const polyline = L.polyline(curvePoints, {
          color: '#2dd4bf',
          weight: 3.5,
          opacity: 0.9,
          dashArray: '8, 8',
          className: 'animated-grid-flow',
        }).addTo(map);

        flowLineRef.current = polyline;
      }
    }
  }, [originCountry, targetCountry, selectedCountry, mapTheme]);

  const handleCountryClick = (iso: string) => {
    setSelectedCountry(iso);
    if (mapClickMode === 'SET_ORIGIN') {
      setOriginCountry(iso);
      if (targetCountry === iso) {
        setTargetCountry(iso === 'DE' ? 'NL' : 'DE');
      }
    } else {
      setTargetCountry(iso);
      const mkt = MARKETS.find(m => m.country === iso && m.status === 'ACTIVE') ||
                  MARKETS.find(m => m.country === iso);
      if (mkt) {
        dispatch({ type: 'SELECT_MARKET', id: mkt.id });
      }
      if (originCountry === iso) {
        setOriginCountry(iso === 'DK' ? 'ES' : 'DK');
      }
    }
  };

  return (
    <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden bg-stone-950 text-stone-100 font-sans select-none">
      
      {/* 2A. INTERACTIVE LEAFLET MAP CANVAS (FLEX-1) */}
      <div className="relative flex-1 min-w-0 bg-stone-950 flex flex-col min-h-0 overflow-hidden">
        
        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full bg-[#0d0f12] z-0" />

        {/* OVERLAY: Top-Left Market Status Legend */}
        <div className="absolute top-3 left-3 p-3 bg-stone-900/95 border border-stone-800 rounded-lg shadow-xl flex flex-col gap-1.5 z-10 select-none backdrop-blur-xs font-mono text-xs">
          <div className="text-[10px] font-bold tracking-wider text-stone-400 uppercase mb-0.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            European Biomethane Grid
          </div>
          <div className="flex items-center gap-2 text-stone-300 text-[11px]">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0 shadow-xs" />
            <span>Active RED III Grid Area</span>
            <span className="text-stone-500 ml-auto pl-2">15 Hubs</span>
          </div>
          <div className="flex items-center gap-2 text-stone-300 text-[11px]">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0 shadow-xs" />
            <span>Emerging Framework</span>
            <span className="text-stone-500 ml-auto pl-2">8 Hubs</span>
          </div>
          <div className="flex items-center gap-2 text-stone-300 text-[11px]">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0 shadow-xs" />
            <span>Restricted (UK Non-EU)</span>
            <span className="text-stone-500 ml-auto pl-2">1 Hub</span>
          </div>
        </div>

        {/* OVERLAY: Top-Right Tile Mode Switcher & Zoom */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <div className="flex bg-stone-900/95 border border-stone-800 rounded-lg p-0.5 shadow-xl font-mono text-xs select-none backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setMapTheme('hybrid')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                mapTheme === 'hybrid' ? 'bg-teal-600 text-teal-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              🛰️ Google Earth
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('streets')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                mapTheme === 'streets' ? 'bg-teal-600 text-teal-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              🗺️ Roadmap
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('dark')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                mapTheme === 'dark' ? 'bg-teal-600 text-teal-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              🌙 Dark
            </button>
          </div>

          <div className="flex flex-col bg-stone-900 border border-stone-800 rounded-lg shadow-xl">
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="w-7 h-7 hover:bg-stone-800 text-stone-200 font-mono text-sm flex items-center justify-center border-b border-stone-800 cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="w-7 h-7 hover:bg-stone-800 text-stone-200 font-mono text-sm flex items-center justify-center cursor-pointer"
            >
              −
            </button>
          </div>
        </div>

        {/* OVERLAY: Bottom-Left Active Flow Control */}
        <div className="absolute bottom-3 left-3 w-[290px] p-3 bg-stone-900/95 border border-stone-800 rounded-lg shadow-2xl flex flex-col gap-2 z-10 select-none backdrop-blur-xs font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
              Active Cross-Border Flow
            </span>
            <span className="text-[10px] text-teal-400 font-bold">RED III Mass Balance</span>
          </div>

          <div className="flex items-center justify-between bg-stone-950 p-2 rounded border border-stone-800 text-sm font-bold">
            <div className="flex items-center gap-1.5 text-sky-400">
              <span>{originCountry}</span>
              <span className="text-[10px] font-normal text-stone-400">(Origin)</span>
            </div>
            <ArrowRight className="w-4 h-4 text-teal-400 animate-pulse" />
            <div className="flex items-center gap-1.5 text-teal-300">
              <span>{targetCountry}</span>
              <span className="text-[10px] font-normal text-stone-400">(Target)</span>
            </div>
          </div>

          <div className="flex border border-stone-700 rounded overflow-hidden text-[11px] font-bold mt-0.5">
            <button
              type="button"
              onClick={() => setMapClickMode('SET_ORIGIN')}
              className={`flex-1 py-1.5 text-center cursor-pointer transition-colors ${
                mapClickMode === 'SET_ORIGIN' ? 'bg-sky-600 text-sky-950 font-bold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Set Origin (Click Hub)
            </button>
            <button
              type="button"
              onClick={() => setMapClickMode('SET_TARGET')}
              className={`flex-1 py-1.5 text-center cursor-pointer transition-colors ${
                mapClickMode === 'SET_TARGET' ? 'bg-teal-600 text-teal-950 font-bold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Set Target (Click Hub)
            </button>
          </div>
        </div>

      </div>

      {/* DRAGGABLE RESIZE HANDLE */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-2 flex-none bg-stone-900 hover:bg-teal-500 border-l border-r border-stone-800 hover:border-teal-400 cursor-col-resize transition-colors flex items-center justify-center z-30 group ${
          isDragging ? 'bg-teal-500 border-teal-400' : ''
        }`}
        title="Click and drag to adjust panel width"
      >
        <div className="w-0.5 h-8 bg-stone-600 group-hover:bg-stone-950 rounded-full" />
      </div>

      {/* 2B. JURISDICTION DOSSIER RAIL (ADJUSTABLE WIDTH) */}
      <aside 
        style={{ width: `${panelWidth}px` }} 
        className="flex-none bg-stone-950 flex flex-col min-h-0 overflow-y-auto font-sans shadow-2xl transition-[width] duration-75 ease-out"
      >
        
        {/* Header with Width Presets */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-bold tracking-wider text-teal-400 uppercase">
              Jurisdiction Dossier
            </div>
            <h2 className="text-lg font-bold text-stone-100 mt-0.5 truncate">
              {selectedMacro.name} ({selectedMacro.iso})
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Width Presets */}
            <div className="flex bg-stone-950 border border-stone-800 rounded p-0.5 text-micro font-mono">
              <button
                type="button"
                onClick={() => setPanelWidth(380)}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  panelWidth <= 400 ? 'bg-teal-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Compact Width (380px)"
              >
                380
              </button>
              <button
                type="button"
                onClick={() => setPanelWidth(520)}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  panelWidth > 400 && panelWidth <= 600 ? 'bg-teal-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Default Width (520px)"
              >
                520
              </button>
              <button
                type="button"
                onClick={() => setPanelWidth(720)}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  panelWidth > 600 ? 'bg-teal-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Wide Width (720px)"
              >
                720
              </button>
            </div>

            <span className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded border ${
              selectedMacro.status === 'ACTIVE'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}>
              {selectedMacro.status}
            </span>
          </div>
        </div>

        {/* Sourced Plant Physical Context Bar (if deep-linked) */}
        {sourcedPlant && (
          <div className="p-3 px-4 bg-teal-950/60 border-b border-teal-800/80 flex flex-col gap-2 font-sans shadow-inner">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-teal-400 bg-teal-900/80 border border-teal-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Sourced Facility GPS Route
              </span>
              <span className="font-mono text-micro text-stone-400">
                {sourcedPlant.countryCode} · {sourcedPlant.country}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-stone-100 m-0">{sourcedPlant.name}</h4>
                <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                  {sourcedPlant.capacityNm3h?.toLocaleString()} Nm³/h · {sourcedPlant.annualEnergyGWh} GWh/a · {sourcedPlant.primaryFeedstockCategory}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const cat = (sourcedPlant.primaryFeedstockCategory || '').toLowerCase();
                  let feedstock = 'manure';
                  let ci = -100;
                  if (cat.includes('food') || cat.includes('bio-waste')) { feedstock = 'food_waste'; ci = -15; }
                  else if (cat.includes('sewage') || cat.includes('sludge')) { feedstock = 'sewage_sludge'; ci = 24; }
                  else if (cat.includes('straw') || cat.includes('agricultural residue')) { feedstock = 'straw'; ci = 16; }
                  else if (cat.includes('crop') || cat.includes('silage')) { feedstock = 'energy_crops'; ci = 40; }
                  else if (cat.includes('industrial') || cat.includes('whey')) { feedstock = 'industrial_biowaste'; ci = 10; }

                  const cIso = (sourcedPlant.countryCode || '').toUpperCase();
                  let marketId = 'DE_THG';
                  if (cIso === 'GB' || cIso === 'UK') marketId = 'UK_RTFO';
                  else if (cIso === 'NL') marketId = 'NL_ERE';
                  else if (cIso === 'FR') marketId = 'FR_CPB';
                  else if (cIso === 'IT') marketId = 'IT_CIC';
                  else if (cIso === 'SE') marketId = 'FUELEU';
                  else if (cIso === 'CH') marketId = 'VOL_SCOPE1';

                  navigate(buildDealUrl({
                    originCountry: sourcedPlant.countryCode,
                    marketId,
                    feedstock,
                    ci,
                    volume: sourcedPlant.annualEnergyGWh ? Math.round(sourcedPlant.annualEnergyGWh * 1000) : undefined,
                    counterparty: sourcedPlant.legalEntityName || sourcedPlant.operator || `Asset Source (${sourcedPlant.name})`,
                    plantId: sourcedPlant.id,
                    plantName: sourcedPlant.name,
                    plantCapacityNm3h: sourcedPlant.capacityNm3h || undefined,
                    plantAnnualGWh: sourcedPlant.annualEnergyGWh || undefined,
                    legalEntityName: sourcedPlant.legalEntityName || undefined,
                    networkOperator: sourcedPlant.networkOperator || undefined,
                    contactEmail: sourcedPlant.contactEmail || undefined,
                    contactPhone: sourcedPlant.contactPhone || undefined,
                  }));
                }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded cursor-pointer transition-colors shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Structure Trade →</span>
              </button>
            </div>
          </div>
        )}

        {/* Macro Metrics Grid */}
        <div className="p-4 border-b border-stone-800 grid grid-cols-2 gap-3 font-mono">
          <div className="bg-stone-900 p-3 rounded-lg border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Active Plants</span>
            <span className="text-base font-bold text-stone-100 font-num">{selectedMacro.plants} facilities</span>
          </div>
          <div className="bg-stone-900 p-3 rounded-lg border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total Output</span>
            <span className="text-base font-bold text-teal-400 font-num">{selectedMacro.twh}</span>
          </div>
          <div className="bg-stone-900 p-3 rounded-lg border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Primary Technology</span>
            <span className="text-xs font-semibold text-stone-200 block mt-1 leading-snug">{selectedMacro.tech}</span>
          </div>
          <div className="bg-stone-900 p-3 rounded-lg border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase font-semibold block">National Registry</span>
            <span className="text-xs font-semibold text-stone-200 block mt-1 leading-snug">{selectedMacro.registry}</span>
          </div>
        </div>

        {/* Route Assessment (Origin -> Selected) */}
        <div className="p-4 border-b border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-300">
              Transit &amp; Route Logistics
            </span>
            <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
              {originCountry} ➔ {selectedCountry}
            </span>
          </div>

          <div className="bg-stone-900 p-3.5 rounded-lg border border-stone-800 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Transit Tariff:</span>
              <span className="font-bold text-stone-100">
                {logistics.physicalRoute.totalPhysicalTariffEurMwh !== null
                  ? `€${logistics.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)} / MWh`
                  : `€${(logistics.modes.virtualSwap.totalCostEurMwh ?? 0).toFixed(2)} / MWh`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Pipeline Route:</span>
              <span className="text-stone-200 font-semibold">{logistics.physicalRoute.transitingCountries.join(' ➔ ') || 'Domestic'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Delivered Netback:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {selectedNetback?.netNetback !== null && selectedNetback?.netNetback !== undefined
                  ? `€${selectedNetback.netNetback.toFixed(2)} / MWh`
                  : 'Unpriced'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2.5 mt-auto bg-stone-950 sticky bottom-0 border-t border-stone-800/80">
          <button
            type="button"
            onClick={() => {
              const targetMktId = selectedMarket?.id || (selectedCountry === 'NL' ? 'NL_ERE' : selectedCountry === 'FR' ? 'FR_CPB' : selectedCountry === 'IT' ? 'IT_CIC' : 'DE_THG');
              const req: ClientRequest = {
                targetMarketId: targetMktId,
                volumeMwh: 20000,
                delivery: {
                  type: 'CALENDAR',
                  complianceYear: 2027,
                  startDate: '2027-01-01',
                  endDate: '2027-12-31',
                },
                feedstockKey: 'manure',
                scheme: 'ISCC_EU',
                chainOfCustody: 'MASS_BALANCE',
                constraints: {
                  maxDeliveredCostEurMwh: null,
                  maxCarbonIntensity: 0,
                  physicalDeliveryRequired: false,
                },
                counterparty: 'Corporate Client',
                notes: `Cross-border biomethane transaction from ${originCountry} to ${selectedCountry}.`,
              };

              const res = searchSourcingRoutes(req, state.marks, state.costs, DEFAULT_WHAT_IF_SCENARIO);
              const match = res.tradeable.find(r => r.originCountry === originCountry) ||
                            res.tradeable.find(r => r.originCountry === selectedCountry) ||
                            res.tradeable[0] ||
                            res.blocked[0] ||
                            null;

              setDealRequest(req);
              setSelectedDealRoute(match);
            }}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>Structure Trade ({originCountry} ➔ {selectedCountry})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={() => setIsLogisticsOpen(true)}
            className="w-full py-2 bg-stone-900 hover:bg-stone-850 border border-stone-700 text-stone-200 font-mono text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Detailed Tariff Breakdown
          </button>
        </div>

      </aside>

      {/* In-Screen Deal Ticket Slide-Out Drawer */}
      {selectedDealRoute && dealRequest && (
        <QuickDealDrawer
          route={selectedDealRoute}
          request={dealRequest}
          marks={state.marks}
          costs={state.costs}
          onClose={() => setSelectedDealRoute(null)}
        />
      )}

      {/* Detailed Logistics Modal */}
      <LogisticsModal
        originCountry={originCountry}
        targetCountry={selectedCountry}
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
      />

    </div>
  );
}
