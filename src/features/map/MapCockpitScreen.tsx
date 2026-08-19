import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { useAppState } from '../../store/context';
import { ClientRequest } from '../../domain/arbitrage/types';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { BIOMETHANE_PLANTS } from '../../domain/plants/registry';
import { EUROPEAN_HUBS, TILE_PROVIDERS } from './mapData';
import { SourcedOpportunity } from '../commercial/PlantScannerTable';
import { Step1OrderIntake } from '../commercial/Step1OrderIntake';
import { Step2PlantScan } from '../commercial/Step2PlantScan';
import { Step3RouteAndCosts } from '../commercial/Step3RouteAndCosts';
import { Step4DealSummary } from '../commercial/Step4DealSummary';
import { MarketPricesModal } from '../marks/MarketPricesModal';
import { 
  Globe, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Maximize2, 
  Minimize2, 
  ChevronRight, 
  ChevronLeft,
  Navigation,
  DollarSign,
  ShieldCheck,
  Building2,
  Check
} from 'lucide-react';

const INITIAL_REQUEST: ClientRequest = {
  feedstockKey: 'manure',
  targetMarketId: 'DE_THG',
  scheme: 'ISCC_EU',
  chainOfCustody: 'MASS_BALANCE',
  delivery: {
    type: 'MONTH',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    complianceYear: 2026,
  },
  volumeMwh: 10000,
  constraints: {
    maxCarbonIntensity: null,
    maxDeliveredCostEurMwh: null,
    physicalDeliveryRequired: false,
  },
  counterparty: null,
  notes: null,
};

export function MapCockpitScreen() {
  const { state } = useAppState();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [request, setRequest] = useState<ClientRequest>(INITIAL_REQUEST);
  const [selectedOpp, setSelectedOpp] = useState<SourcedOpportunity | null>(null);
  const [isPricesModalOpen, setIsPricesModalOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [mapTheme, setMapTheme] = useState<'dark' | 'hybrid' | 'streets'>('dark');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Real-time sourcing scan based on live edited marks & order request
  const searchResult = useMemo(() => {
    return searchSourcingRoutes(request, state.marks, state.costs, DEFAULT_WHAT_IF_SCENARIO);
  }, [request, state.marks, state.costs]);

  // Enrich opportunities with 1,975+ plant registry data
  const opportunities: SourcedOpportunity[] = useMemo(() => {
    const rawOpps = searchResult.tradeable;
    if (rawOpps.length === 0) return [];

    return rawOpps.map((opp, idx) => {
      const countryPlants = BIOMETHANE_PLANTS.filter(
        p => p.countryCode === opp.originCountry || p.country.toLowerCase() === opp.originCountry.toLowerCase()
      );
      const matchedPlant = countryPlants[idx % (countryPlants.length || 1)] || null;

      return {
        ...opp,
        originPlantName: matchedPlant?.name || `${opp.originCountry} Biomethane Facility #${idx + 1}`,
        originPlantCoords: matchedPlant?.coordinates || null,
        isDirectPlantSource: Boolean(matchedPlant),
        logisticsDistanceKm: opp.transitCostEurPerMWh > 2 ? 650 : 280,
        deliveryMode: 'PIPELINE_GRID',
      };
    });
  }, [searchResult.tradeable]);

  const activeOpp = useMemo(() => {
    if (selectedOpp && opportunities.some(o => o.id === selectedOpp.id)) {
      return selectedOpp;
    }
    return opportunities[0] || null;
  }, [selectedOpp, opportunities]);

  // 1. Initialize Full Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [52.0, 10.0],
      zoom: 4.8,
      minZoom: 3.5,
      maxZoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    const tileCfg = TILE_PROVIDERS[mapTheme];
    const tileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: 18,
      subdomains: tileCfg.subdomains,
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

  // 3. Render Map Pins & Corridor Flow Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const originIso = activeOpp?.originCountry || 'DK';
    const targetIso = activeOpp?.targetCountry || (request.targetMarketId === 'ANY' ? 'DE' : request.targetMarketId.slice(0, 2));

    const originHub = EUROPEAN_HUBS.find(h => h.iso === originIso);
    const targetHub = EUROPEAN_HUBS.find(h => h.iso === targetIso);

    const originPos: [number, number] = activeOpp?.originPlantCoords && activeOpp.originPlantCoords[0]
      ? activeOpp.originPlantCoords
      : originHub?.coords || [56.26, 9.5];

    const targetPos: [number, number] = targetHub?.coords || [51.16, 10.45];

    // Add Country Hub Dots
    EUROPEAN_HUBS.forEach(hub => {
      const isOrigin = hub.iso === originIso;
      const isTarget = hub.iso === targetIso;

      if (isOrigin || isTarget) return;

      const pinIcon = L.divIcon({
        className: 'hub-dot',
        html: `
          <div class="group cursor-pointer select-none flex items-center justify-center hover:scale-125 transition-transform">
            <div class="w-3.5 h-3.5 rounded-full bg-stone-950/90 border border-teal-500/50 shadow flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
            </div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const m = L.marker(hub.coords, { icon: pinIcon });
      m.bindTooltip(`<b>${hub.name}</b> (${hub.plants} plants · ${hub.capacityTWh} TWh)`, {
        direction: 'top',
        className: 'bg-stone-900 text-stone-200 border-stone-700 font-mono text-[10px]',
      });
      group.addLayer(m);
    });

    // Draw Route Flow Lines if in Step 2, 3, or 4
    if (originPos && targetPos) {
      const routeCoords: [number, number][] = [originPos];
      if (originIso !== targetIso) {
        // transit waypoint midpoint
        const midLat = (originPos[0] + targetPos[0]) / 2;
        const midLng = (originPos[1] + targetPos[1]) / 2;
        routeCoords.push([midLat, midLng]);
      }
      routeCoords.push(targetPos);

      // Glow Line
      const glow = L.polyline(routeCoords, {
        color: '#0d9488',
        weight: 6,
        opacity: 0.4,
        lineCap: 'round',
      });
      group.addLayer(glow);

      // Animated Flow Line
      const flow = L.polyline(routeCoords, {
        color: '#2dd4bf',
        weight: 2.5,
        dashArray: '8, 8',
        opacity: 0.95,
        lineCap: 'round',
      });
      group.addLayer(flow);

      // Origin Marker
      const originIcon = L.divIcon({
        className: 'origin-marker',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-105 transition-transform">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/95 text-emerald-200 border-2 border-emerald-400 shadow-2xl font-mono text-[11px] font-bold backdrop-blur-xs whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>${activeOpp?.originPlantName || originHub?.name || originIso}</span>
              <span class="text-[9px] bg-emerald-900/80 px-1.5 py-0.5 rounded-full font-normal">Source</span>
            </div>
            <div class="w-2.5 h-2.5 rotate-45 -mt-1.5 bg-emerald-950/95 border-r-2 border-b-2 border-emerald-400"></div>
          </div>
        `,
        iconSize: [0, 0],
      });
      group.addLayer(L.marker(originPos, { icon: originIcon }));

      // Destination Marker
      const targetIcon = L.divIcon({
        className: 'target-marker',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-105 transition-transform">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950/95 text-sky-200 border-2 border-sky-400 shadow-2xl font-mono text-[11px] font-bold backdrop-blur-xs whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>${targetHub?.name || targetIso} Hub</span>
              <span class="text-[9px] bg-sky-900/80 px-1.5 py-0.5 rounded-full font-normal">Buyer</span>
            </div>
            <div class="w-2.5 h-2.5 rotate-45 -mt-1.5 bg-sky-950/95 border-r-2 border-b-2 border-sky-400"></div>
          </div>
        `,
        iconSize: [0, 0],
      });
      group.addLayer(L.marker(targetPos, { icon: targetIcon }));
    }
  }, [activeOpp, request.targetMarketId]);

  const handleReset = () => {
    setRequest(INITIAL_REQUEST);
    setSelectedOpp(null);
    setCurrentStep(1);
  };

  return (
    <div className="relative w-full h-full flex-1 flex overflow-hidden bg-stone-950 text-stone-100">
      {/* 1. Full Screen Interactive Map Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Map Control Badges (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Map Theme Toggle */}
        <div className="flex bg-stone-950/90 backdrop-blur-md border border-stone-800 rounded-lg p-0.5 shadow-xl">
          <button
            type="button"
            onClick={() => setMapTheme('dark')}
            className={`px-2.5 py-1 font-mono text-[10px] rounded font-semibold transition-colors cursor-pointer ${
              mapTheme === 'dark' ? 'bg-teal-600 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Dark Grid
          </button>
          <button
            type="button"
            onClick={() => setMapTheme('hybrid')}
            className={`px-2.5 py-1 font-mono text-[10px] rounded font-semibold transition-colors cursor-pointer ${
              mapTheme === 'hybrid' ? 'bg-teal-600 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapTheme('streets')}
            className={`px-2.5 py-1 font-mono text-[10px] rounded font-semibold transition-colors cursor-pointer ${
              mapTheme === 'streets' ? 'bg-teal-600 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Roadmap
          </button>
        </div>

        {/* Live Market News & Prices Button */}
        <button
          type="button"
          onClick={() => setIsPricesModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-950/90 hover:bg-teal-900/90 border border-teal-700/80 text-teal-300 font-mono text-xs font-bold transition-all shadow-xl backdrop-blur-md cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Adjust Market Prices</span>
        </button>
      </div>

      {/* Collapse / Expand Side Panel Trigger */}
      <button
        type="button"
        onClick={() => setIsPanelCollapsed(prev => !prev)}
        className="absolute top-4 right-4 md:right-[600px] z-30 p-2 rounded-lg bg-stone-950/90 hover:bg-stone-900 border border-stone-800 text-stone-300 hover:text-white transition-all shadow-xl backdrop-blur-md cursor-pointer"
        title={isPanelCollapsed ? 'Open Commercial Deal Flow' : 'Collapse Panel (Full Map)'}
      >
        {isPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* 2. Integrated Commercial Deal Flow Slide-Over Panel (Right Side) */}
      {!isPanelCollapsed && (
        <div className="absolute top-0 right-0 bottom-0 w-full md:w-[580px] lg:w-[620px] z-20 bg-stone-950/95 border-l border-stone-800 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Stepper Header Strip */}
          <div className="p-3 border-b border-stone-800 bg-stone-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-400">
                Commercial Deal Workflow
              </span>
            </div>

            {/* Stepper Dots */}
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              {[1, 2, 3, 4].map(stepNum => (
                <button
                  key={stepNum}
                  type="button"
                  onClick={() => {
                    if (stepNum <= currentStep) setCurrentStep(stepNum as any);
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition-all ${
                    currentStep === stepNum
                      ? 'bg-teal-500 text-stone-950'
                      : currentStep > stepNum
                      ? 'bg-teal-950 text-teal-300 border border-teal-800 cursor-pointer'
                      : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-default'
                  }`}
                >
                  {currentStep > stepNum ? '✓' : stepNum}
                </button>
              ))}
            </div>
          </div>

          {/* Active Step Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {currentStep === 1 && (
              <Step1OrderIntake
                request={request}
                onChange={updated => setRequest(prev => ({ ...prev, ...updated }))}
                onNext={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 2 && (
              <Step2PlantScan
                opportunities={opportunities}
                selectedOpp={activeOpp}
                onSelectOpp={opp => setSelectedOpp(opp)}
                onBack={() => setCurrentStep(1)}
                onNext={() => setCurrentStep(3)}
              />
            )}

            {currentStep === 3 && activeOpp && (
              <Step3RouteAndCosts
                request={request}
                opportunity={activeOpp}
                onBack={() => setCurrentStep(2)}
                onNext={() => setCurrentStep(4)}
              />
            )}

            {currentStep === 4 && activeOpp && (
              <Step4DealSummary
                request={request}
                opportunity={activeOpp}
                onBack={() => setCurrentStep(3)}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      )}

      {/* 3. Live Market Prices & News Adjustment Modal */}
      <MarketPricesModal
        isOpen={isPricesModalOpen}
        onClose={() => setIsPricesModalOpen(false)}
      />
    </div>
  );
}
