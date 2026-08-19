import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { EUROPEAN_HUBS, TILE_PROVIDERS } from './mapData';
import { Maximize2, Layers, Navigation, ShieldCheck, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CorridorMiniMapProps {
  originCountry: string;
  targetCountry: string;
  plantName?: string;
  plantCoords?: [number, number] | null;
  transitSteps?: string[];
  distanceKm?: number;
  logisticsCostEur?: number;
  deliveryMode?: string;
}

export function CorridorMiniMap({
  originCountry,
  targetCountry,
  plantName,
  plantCoords,
  transitSteps = [],
  distanceKm = 0,
  logisticsCostEur = 0,
  deliveryMode = 'PIPELINE_GRID'
}: CorridorMiniMapProps) {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'hybrid' | 'streets'>('dark');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [52.5, 9.5],
      zoom: 4.5,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    const tileCfg = TILE_PROVIDERS[mapTheme];
    const tileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: 18,
      subdomains: tileCfg.subdomains
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    layersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileCfg = TILE_PROVIDERS[mapTheme];
    tileLayerRef.current.setUrl(tileCfg.url);
  }, [mapTheme]);

  // Update Corridor Polylines & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const originHub = EUROPEAN_HUBS.find(h => h.iso === originCountry);
    const targetHub = EUROPEAN_HUBS.find(h => h.iso === targetCountry);
    const targetPos: [number, number] = targetHub?.coords || [51.1657, 10.4515];

    const originPos: [number, number] = plantCoords && plantCoords[0] && plantCoords[1]
      ? plantCoords
      : originHub?.coords || targetPos;

    // Build waypoint coordinates along transit path
    const routeCoords: [number, number][] = [originPos];

    if (transitSteps && transitSteps.length > 0) {
      transitSteps.forEach(iso => {
        if (iso !== originCountry && iso !== targetCountry) {
          const transitHub = EUROPEAN_HUBS.find(h => h.iso === iso);
          if (transitHub) {
            routeCoords.push(transitHub.coords);
          }
        }
      });
    }

    routeCoords.push(targetPos);

    // 1. Draw background glowing corridor glow line
    const glowLine = L.polyline(routeCoords, {
      color: '#0d9488', // teal-600
      weight: 6,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(glowLine);

    // 2. Draw active flow line with dash animation styling
    const flowLine = L.polyline(routeCoords, {
      color: '#2dd4bf', // teal-400
      weight: 2.5,
      dashArray: '8, 8',
      opacity: 0.95,
      lineCap: 'round'
    });
    group.addLayer(flowLine);

    // 3. Origin Plant / Hub Marker
    const originIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full">
          <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/95 text-emerald-300 border border-emerald-400/80 shadow-lg font-mono text-[10px] font-bold backdrop-blur-xs whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>${plantName ? plantName.slice(0, 16) : originHub?.name || originCountry}</span>
          </div>
          <div class="w-2 h-2 rotate-45 -mt-1 bg-emerald-950/95 border-r border-b border-emerald-400"></div>
        </div>
      `,
      iconSize: [0, 0]
    });
    const originMarker = L.marker(originPos, { icon: originIcon });
    group.addLayer(originMarker);

    // 4. Target Market Marker
    const targetIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full">
          <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-950/95 text-sky-300 border border-sky-400/80 shadow-lg font-mono text-[10px] font-bold backdrop-blur-xs whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>${targetHub?.name || targetCountry} Hub</span>
          </div>
          <div class="w-2 h-2 rotate-45 -mt-1 bg-sky-950/95 border-r border-b border-sky-400"></div>
        </div>
      `,
      iconSize: [0, 0]
    });
    const targetMarker = L.marker(targetPos, { icon: targetIcon });
    group.addLayer(targetMarker);

    // 5. Waypoint Dots
    if (routeCoords.length > 2) {
      for (let i = 1; i < routeCoords.length - 1; i++) {
        const wp = routeCoords[i];
        const wpIcon = L.divIcon({
          className: 'custom-wp-pin',
          html: `<div class="w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-teal-300 shadow-md"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        });
        group.addLayer(L.marker(wp, { icon: wpIcon }));
      }
    }

    // Auto fit bounds with padding
    try {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
    } catch {
      // fallback
    }
  }, [originCountry, targetCountry, plantName, plantCoords, transitSteps]);

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-lg overflow-hidden border border-stone-800 bg-stone-950 flex flex-col shadow-inner">
      {/* Map Header Overlay */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-stone-950/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-stone-800 shadow-lg">
        <Navigation className="w-3.5 h-3.5 text-teal-400" />
        <span className="font-mono text-micro font-bold uppercase tracking-wider text-stone-200">
          Corridor Route: {originCountry} → {targetCountry}
        </span>
      </div>

      {/* Map Controls Overlay (Theme & Expand) */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
        <div className="flex bg-stone-950/90 backdrop-blur-md border border-stone-800 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setMapTheme('dark')}
            className={`px-2 py-0.5 font-mono text-[9px] rounded font-semibold transition-colors ${
              mapTheme === 'dark' ? 'bg-teal-600 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setMapTheme('hybrid')}
            className={`px-2 py-0.5 font-mono text-[9px] rounded font-semibold transition-colors ${
              mapTheme === 'hybrid' ? 'bg-teal-600 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Sat
          </button>
          <button
            type="button"
            onClick={() => setMapTheme('streets')}
            className={`px-2 py-0.5 font-mono text-[9px] rounded font-semibold transition-colors ${
              mapTheme === 'streets' ? 'bg-teal-600 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Map
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/map?origin=${originCountry}&target=${targetCountry}`)}
          title="Open Full Map Inspector (Pillar 2)"
          className="flex items-center gap-1 bg-stone-950/90 hover:bg-stone-900 backdrop-blur-md border border-stone-800 hover:border-teal-500/50 px-2 py-1 rounded-md text-stone-300 hover:text-teal-300 transition-colors font-mono text-[10px]"
        >
          <Maximize2 className="w-3 h-3 text-teal-400" />
          <span className="hidden sm:inline">Inspect</span>
        </button>
      </div>

      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Bottom Telemetry Bar */}
      <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between px-3 py-1.5 rounded-md bg-stone-950/90 backdrop-blur-md border border-stone-800 text-stone-300 font-mono text-micro shadow-lg">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-teal-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            {deliveryMode.replace('_', ' ')}
          </span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400">
            Est. Distance: <strong className="text-stone-200">{distanceKm ? `${distanceKm} km` : 'Direct grid'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-stone-400">Tariff:</span>
          <span className="font-bold text-amber-300">
            €{logisticsCostEur.toFixed(2)}/MWh
          </span>
        </div>
      </div>
    </div>
  );
}
