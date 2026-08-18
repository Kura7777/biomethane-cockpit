import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { useAppState } from '../../store/context';
import { computeNetback } from '../../domain/netback/engine';
import { REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { Consignment } from '../../domain/consignment/types';
import { COUNTRY_MACRO_STATS } from '../../domain/plants/registry';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { QuickDealDrawer } from '../sourcing/QuickDealDrawer';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { ArbitrageOpportunity, ClientRequest } from '../../domain/arbitrage/types';
import { 
  Globe, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  ExternalLink, 
  ShieldCheck, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface CountryHub {
  iso: string;
  name: string;
  coords: [number, number]; // [lat, lng]
  status: 'ACTIVE' | 'EMERGING' | 'FUTURE_2028' | 'RESTRICTED';
  plants: number;
  capacityTWh: number;
  primaryFeedstock: string;
  registry: string;
}

const EUROPEAN_HUBS: CountryHub[] = [
  { iso: 'DK', name: 'Denmark', coords: [56.2639, 9.5018], status: 'ACTIVE', plants: 83, capacityTWh: 4.8, primaryFeedstock: 'Manure & Slurry', registry: 'Energinet' },
  { iso: 'DE', name: 'Germany', coords: [51.1657, 10.4515], status: 'ACTIVE', plants: 265, capacityTWh: 11.2, primaryFeedstock: 'Manure & Energy Crops', registry: 'dena Biogasregister' },
  { iso: 'NL', name: 'Netherlands', coords: [52.1326, 5.2913], status: 'ACTIVE', plants: 88, capacityTWh: 3.4, primaryFeedstock: 'Bio-waste & Manure', registry: 'VertiCer' },
  { iso: 'FR', name: 'France', coords: [46.6034, 1.8883], status: 'ACTIVE', plants: 815, capacityTWh: 8.9, primaryFeedstock: 'Agri-waste & Cover crops', registry: 'GRTgaz / 2BSvs' },
  { iso: 'IT', name: 'Italy', coords: [42.8719, 12.5674], status: 'ACTIVE', plants: 115, capacityTWh: 4.1, primaryFeedstock: 'Agri-byproducts & Manure', registry: 'GSE / SNAM' },
  { iso: 'ES', name: 'Spain', coords: [40.4637, -3.7492], status: 'ACTIVE', plants: 36, capacityTWh: 1.8, primaryFeedstock: 'Agro-industrial & Sewage', registry: 'Enagás GTS' },
  { iso: 'SE', name: 'Sweden', coords: [60.1282, 18.6435], status: 'ACTIVE', plants: 78, capacityTWh: 2.1, primaryFeedstock: 'Sewage sludge & Waste', registry: 'Energigas Sverige' },
  { iso: 'FI', name: 'Finland', coords: [63.2468, 25.9209], status: 'ACTIVE', plants: 26, capacityTWh: 0.9, primaryFeedstock: 'Forest residue & Manure', registry: 'Gasum / Fingrid' },
  { iso: 'AT', name: 'Austria', coords: [47.5162, 14.5501], status: 'ACTIVE', plants: 18, capacityTWh: 0.8, primaryFeedstock: 'Agri-silage & Slurry', registry: 'AGCS Biomethane' },
  { iso: 'BE', name: 'Belgium', coords: [50.5039, 4.4699], status: 'ACTIVE', plants: 15, capacityTWh: 0.6, primaryFeedstock: 'Food processing waste', registry: 'Fluxys' },
  { iso: 'PL', name: 'Poland', coords: [51.9194, 19.1451], status: 'ACTIVE', plants: 5, capacityTWh: 0.4, primaryFeedstock: 'Distillery waste & Manure', registry: 'KZR INiG' },
  { iso: 'CZ', name: 'Czech Republic', coords: [49.8175, 15.4730], status: 'ACTIVE', plants: 12, capacityTWh: 0.5, primaryFeedstock: 'Agricultural residues', registry: 'OTE' },
  { iso: 'LT', name: 'Lithuania', coords: [55.1694, 23.8813], status: 'ACTIVE', plants: 3, capacityTWh: 0.2, primaryFeedstock: 'Manure & Agri-waste', registry: 'Amber Grid' },
  { iso: 'LV', name: 'Latvia', coords: [56.8796, 24.6032], status: 'ACTIVE', plants: 2, capacityTWh: 0.1, primaryFeedstock: 'Biowaste', registry: 'Conexus Baltic Grid' },
  { iso: 'EE', name: 'Estonia', coords: [58.5953, 25.0136], status: 'ACTIVE', plants: 5, capacityTWh: 0.3, primaryFeedstock: 'Sewage & Biowaste', registry: 'Elering' },
  { iso: 'GB', name: 'United Kingdom', coords: [54.5, -2.5], status: 'RESTRICTED', plants: 132, capacityTWh: 4.6, primaryFeedstock: 'Food waste & Agri-feed', registry: 'Green Gas / GGCS' },
  { iso: 'CH', name: 'Switzerland', coords: [46.8182, 8.2275], status: 'EMERGING', plants: 42, capacityTWh: 0.9, primaryFeedstock: 'Organic waste', registry: 'VSG' },
  { iso: 'NO', name: 'Norway', coords: [60.4720, 8.4689], status: 'EMERGING', plants: 16, capacityTWh: 0.5, primaryFeedstock: 'Fish waste & Sewage', registry: 'Gassco' },
  { iso: 'IE', name: 'Ireland', coords: [53.4129, -8.2439], status: 'EMERGING', plants: 3, capacityTWh: 0.2, primaryFeedstock: 'Grass silage & Slurry', registry: 'Gas Networks Ireland' },
  { iso: 'PT', name: 'Portugal', coords: [39.3999, -8.2245], status: 'EMERGING', plants: 4, capacityTWh: 0.2, primaryFeedstock: 'Municipal solid waste', registry: 'REN' },
  { iso: 'SK', name: 'Slovakia', coords: [48.6690, 19.6990], status: 'EMERGING', plants: 5, capacityTWh: 0.2, primaryFeedstock: 'Agri-waste', registry: 'SPP-distribúcia' },
  { iso: 'HU', name: 'Hungary', coords: [47.1625, 19.5033], status: 'EMERGING', plants: 4, capacityTWh: 0.15, primaryFeedstock: 'Manure & Straw', registry: 'FGSZ' },
  { iso: 'RO', name: 'Romania', coords: [45.9432, 24.9668], status: 'EMERGING', plants: 2, capacityTWh: 0.1, primaryFeedstock: 'Agri-silage', registry: 'Transgaz' },
  { iso: 'GR', name: 'Greece', coords: [39.0742, 21.8243], status: 'FUTURE_2028', plants: 2, capacityTWh: 0.1, primaryFeedstock: 'Olive mill & Manure', registry: 'DESFA' },
  { iso: 'BG', name: 'Bulgaria', coords: [42.7339, 25.4858], status: 'FUTURE_2028', plants: 1, capacityTWh: 0.05, primaryFeedstock: 'Crop residues', registry: 'Bulgartransgaz' },
];

const TILE_PROVIDERS = {
  hybrid: {
    name: 'Satellite Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  satellite: {
    name: 'Satellite Clean',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  streets: {
    name: 'Roadmap',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  dark: {
    name: 'Dark Carto',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/">OSM</a>',
    subdomains: 'abcd',
  },
};

export function MapScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  const [originCountry, setOriginCountry] = useState<string>('DK');
  const [targetCountry, setTargetCountry] = useState<string>('DE');
  const [selectedCountry, setSelectedCountry] = useState<string>('DE');
  const [mapClickMode, setMapClickMode] = useState<'SET_ORIGIN' | 'SET_TARGET'>('SET_TARGET');
  const [mapTheme, setMapTheme] = useState<'hybrid' | 'satellite' | 'streets' | 'dark'>('hybrid');
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [selectedDealRoute, setSelectedDealRoute] = useState<ArbitrageOpportunity | null>(null);
  const [dealRequest, setDealRequest] = useState<ClientRequest | null>(null);

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
    <div className="flex-1 grid grid-cols-[minmax(0,1fr)_340px] min-h-0 min-w-[1400px] overflow-hidden bg-stone-950 text-stone-100 font-sans">
      
      {/* 2A. INTERACTIVE LEAFLET MAP CANVAS */}
      <div className="relative min-w-0 border-r border-stone-800 bg-stone-950 flex flex-col min-h-0 overflow-hidden">
        
        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full bg-[#0d0f12] z-0" />

        {/* OVERLAY: Top-Left Market Status Legend */}
        <div className="absolute top-3 left-3 p-3 bg-stone-900/95 border border-stone-800 rounded-xs shadow-xl flex flex-col gap-1.5 z-10 select-none backdrop-blur-xs font-mono text-xs">
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
          <div className="flex bg-stone-900/95 border border-stone-800 rounded-xs p-0.5 shadow-xl font-mono text-xs select-none backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setMapTheme('hybrid')}
              className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                mapTheme === 'hybrid' ? 'bg-teal-600 text-teal-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              🛰️ Google Earth
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('streets')}
              className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                mapTheme === 'streets' ? 'bg-teal-600 text-teal-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              🗺️ Roadmap
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('dark')}
              className={`px-2.5 py-1 rounded-xs cursor-pointer transition-colors ${
                mapTheme === 'dark' ? 'bg-teal-600 text-teal-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              🌙 Dark
            </button>
          </div>

          <div className="flex flex-col bg-stone-900 border border-stone-800 rounded-xs shadow-xl">
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
        <div className="absolute bottom-3 left-3 w-[290px] p-3 bg-stone-900/95 border border-stone-800 rounded-xs shadow-2xl flex flex-col gap-2 z-10 select-none backdrop-blur-xs font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
              Active Cross-Border Flow
            </span>
            <span className="text-[10px] text-teal-400 font-bold">RED III Mass Balance</span>
          </div>

          <div className="flex items-center justify-between bg-stone-950 p-2 rounded-xs border border-stone-800 text-sm font-bold">
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

          <div className="flex border border-stone-700 rounded-xs overflow-hidden text-[11px] font-bold mt-0.5">
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

      {/* 2B. JURISDICTION DOSSIER RAIL (RIGHT, 340px) */}
      <aside className="border-l border-stone-800 bg-stone-950 flex flex-col min-h-0 overflow-y-auto font-sans select-none">
        
        {/* Header */}
        <div className="p-3.5 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] font-bold tracking-wider text-stone-400 uppercase">
              Jurisdiction Dossier
            </div>
            <h2 className="text-base font-bold text-stone-100 mt-0.5">
              {selectedMacro.name} ({selectedMacro.iso})
            </h2>
          </div>
          <span className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs border ${
            selectedMacro.status === 'ACTIVE'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-amber-950 text-amber-300 border-amber-800'
          }`}>
            {selectedMacro.status}
          </span>
        </div>

        {/* Macro Metrics Grid */}
        <div className="p-3.5 border-b border-stone-800 grid grid-cols-2 gap-2.5 font-mono">
          <div className="bg-stone-900 p-2.5 rounded-xs border border-stone-800">
            <span className="text-[9px] text-stone-500 uppercase block">Active Plants</span>
            <span className="text-sm font-bold text-stone-100 font-num">{selectedMacro.plants}</span>
          </div>
          <div className="bg-stone-900 p-2.5 rounded-xs border border-stone-800">
            <span className="text-[9px] text-stone-500 uppercase block">Total Output</span>
            <span className="text-sm font-bold text-teal-400 font-num">{selectedMacro.twh}</span>
          </div>
          <div className="bg-stone-900 p-2.5 rounded-xs border border-stone-800">
            <span className="text-[9px] text-stone-500 uppercase block">Primary Tech</span>
            <span className="text-xs text-stone-300 truncate block mt-0.5">{selectedMacro.tech}</span>
          </div>
          <div className="bg-stone-900 p-2.5 rounded-xs border border-stone-800">
            <span className="text-[9px] text-stone-500 uppercase block">National Registry</span>
            <span className="text-xs text-stone-300 truncate block mt-0.5">{selectedMacro.registry}</span>
          </div>
        </div>

        {/* Route Assessment (Origin -> Selected) */}
        <div className="p-3.5 border-b border-stone-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Transit &amp; Route Logistics
            </span>
            <span className="font-mono text-xs font-bold text-teal-400">
              {originCountry} ➔ {selectedCountry}
            </span>
          </div>

          <div className="bg-stone-900 p-3 rounded-xs border border-stone-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Transit Tariff:</span>
              <span className="font-bold text-stone-100">
                {logistics.physicalRoute.totalPhysicalTariffEurMwh !== null
                  ? `€${logistics.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)}/MWh`
                  : `€${(logistics.modes.virtualSwap.totalCostEurMwh ?? 0).toFixed(2)}/MWh`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Pipeline Route:</span>
              <span className="text-stone-200">{logistics.physicalRoute.transitingCountries.join(' ➔ ') || 'Domestic'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Delivered Netback:</span>
              <span className="font-bold text-emerald-400">
                {selectedNetback?.netNetback !== null && selectedNetback?.netNetback !== undefined
                  ? `€${selectedNetback.netNetback.toFixed(2)}/MWh`
                  : 'Unpriced'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3.5 space-y-2 mt-auto">
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
            className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>Structure Trade ({originCountry} ➔ {selectedCountry})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            onClick={() => setIsLogisticsOpen(true)}
            className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono text-xs rounded-xs cursor-pointer transition-colors"
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
