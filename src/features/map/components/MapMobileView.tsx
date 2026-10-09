import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Sheet } from '../../../shared/ui';
import {
  CountryMeta,
  AcceptForeignStatus,
  ACCEPT_FOREIGN_CONFIG,
  MapView,
  RouteFilter,
  SellCategory,
  ROUTES_HINT
} from '../mapConstants';
import { MapSvgLayer } from './MapSvgLayer';
import { MapCountryRailBody, MapCountryRailButtons } from './MapCountryRail';
import { TradePlaybookDetails } from '../tradePlaybook';
import { CertificateRoute } from '../../../domain/registries/certificateRoutes';
import { BiomethanePlant } from '../../../domain/plants/types';

interface MapMobileViewProps {
  origin: string;
  target: string;
  originMeta: CountryMeta;
  targetMeta: CountryMeta;
  selectedMeta: CountryMeta;
  selectedCountryName: string;
  mode: 'ORIGIN' | 'TARGET';
  setMode: (mode: 'ORIGIN' | 'TARGET') => void;
  view: MapView;
  filter: RouteFilter;
  countryAcceptsForeign: Record<string, { status: AcceptForeignStatus; schemeName?: string }>;
  routeByIso: Record<string, CertificateRoute>;
  activeLinkedPlant: BiomethanePlant | null;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  sortedCountries: Array<[string, CountryMeta]>;
  currentTradeTarget: unknown;
  currentPlaybook: TradePlaybookDetails;
  categoryCounts: Record<SellCategory, number>;
  tradeableBreakdown: { both: number; certOnly: number; posOnly: number };
  topRoutes: Array<{ iso: string; name: string; badge: string }>;
  corridorCalculation: {
    modes: {
      virtualSwap: { totalCostEurMwh: number | null; regulatoryFeasibility: string };
      physicalPipeline: { totalCostEurMwh: number | null };
      bioLng: { totalCostEurMwh: number | null };
    };
    physicalRoute?: { totalPhysicalTariffEurMwh: number | null };
  };
  handleCountryClick: (name: string) => void;
  setOriginFromMenu: (val: string) => void;
  setTargetFromMenu: (val: string) => void;
  setSelectedCountryName: (val: string) => void;
  setOrigin: (val: string) => void;
  setTarget: (val: string) => void;
  handleSwapCorridor: () => void;
  handleSimulateTrade: () => void;
  openPlaybook: () => void;
  setIsSummaryOpen: (open: boolean) => void;
}

export function MapMobileView({
  origin,
  target,
  originMeta,
  targetMeta,
  selectedMeta,
  selectedCountryName,
  mode,
  setMode,
  view,
  filter,
  countryAcceptsForeign,
  routeByIso,
  activeLinkedPlant,
  panelOpen,
  setPanelOpen,
  sortedCountries,
  currentTradeTarget,
  currentPlaybook,
  categoryCounts,
  tradeableBreakdown,
  topRoutes,
  corridorCalculation,
  handleCountryClick,
  setOriginFromMenu,
  setTargetFromMenu,
  setSelectedCountryName,
  setOrigin,
  setTarget,
  handleSwapCorridor,
  handleSimulateTrade,
  openPlaybook,
  setIsSummaryOpen,
}: MapMobileViewProps) {
  const transitFigure =
    corridorCalculation.physicalRoute?.totalPhysicalTariffEurMwh !== null && corridorCalculation.physicalRoute?.totalPhysicalTariffEurMwh !== undefined
      ? `€${corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)}`
      : 'Unverified';

  return (
    <div className="map-m-root">
      {/* Compact control row: title + Trade CTA, then Origin / swap / Target */}
      <div className="map-m-controls">
        <div className="map-m-titlerow">
          <h3 className="ptitle m-page-title" style={{ fontSize: '16px' }}>Compliance &amp; logistics map</h3>
          <button
            type="button"
            className="btn btn-primary map-m-trade"
            onClick={handleSimulateTrade}
            disabled={!currentTradeTarget}
            title={!currentTradeTarget ? 'No tradeable market mapped for this route' : undefined}
          >
            Trade →
          </button>
        </div>
        <div className="map-m-selects">
          <label className="map-m-field">
            <span className="eyebrow" style={{ color: 'var(--color-text)', fontWeight: 800 }}>Origin</span>
            <select
              value={origin}
              onChange={e => {
                const val = e.target.value;
                if (val === target) setOriginFromMenu(val);
                else setOrigin(val);
              }}
              className="input"
              aria-label="Origin country"
            >
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
              onChange={e => {
                const val = e.target.value;
                if (val === origin) setTargetFromMenu(val);
                else setTarget(val);
              }}
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
        <MapSvgLayer
          isMobile={true}
          origin={origin}
          target={target}
          selectedCountryName={selectedCountryName}
          originMeta={originMeta}
          targetMeta={targetMeta}
          view={view}
          filter={filter}
          countryAcceptsForeign={countryAcceptsForeign}
          routeByIso={routeByIso}
          activeLinkedPlant={activeLinkedPlant}
          handleCountryClick={handleCountryClick}
          setOriginFromMenu={setOriginFromMenu}
          setTargetFromMenu={setTargetFromMenu}
          setSelectedCountryName={setSelectedCountryName}
          panelOffsetDeg={0}
        />

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

      {/* Peek bar */}
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
          {(() => {
            const best = countryAcceptsForeign[selectedMeta.iso]?.status || 'NO_SCHEME';
            const cfg = ACCEPT_FOREIGN_CONFIG[best];
            return (
              <span className={`chip ${cfg.chipClass}`} style={{ fontSize: '10px', padding: '1px 5px' }}>
                {best === 'NO_SCHEME' ? 'No scheme' : `Imports: ${best}`}
              </span>
            );
          })()}
        </span>
        <span className="map-m-peek-legal">{selectedMeta.legal}</span>
        <span className="map-m-peek-figs">
          <span>
            <span className="eyebrow">Plants</span>
            <span className="num map-m-fig">{selectedMeta.plants}</span>
          </span>
          <span>
            <span className="eyebrow">Production · TWh/yr</span>
            <span className="num map-m-fig">{selectedMeta.twh} TWh</span>
          </span>
          <span>
            <span className="eyebrow">{originMeta.iso} → {targetMeta.iso}</span>
            <span className="num map-m-fig">{transitFigure === 'Unverified' ? 'Unverified' : `${transitFigure}/MWh`}</span>
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
            <MapCountryRailButtons
              currentTradeTarget={currentTradeTarget}
              handleSimulateTrade={handleSimulateTrade}
              setIsLogisticsOpen={openPlaybook}
            />
          </div>
        }
      >
        <div className="map-m-sheet">
          <MapCountryRailBody
            origin={origin}
            target={target}
            originMeta={originMeta}
            targetMeta={targetMeta}
            selectedMeta={selectedMeta}
            countryAcceptsForeign={countryAcceptsForeign}
            view={view}
            currentPlaybook={currentPlaybook}
            categoryCounts={categoryCounts}
            tradeableBreakdown={tradeableBreakdown}
            topRoutes={topRoutes}
            activeLinkedPlant={activeLinkedPlant}
            currentTradeTarget={currentTradeTarget}
            corridorCalculation={corridorCalculation}
            setOriginFromMenu={setOriginFromMenu}
            setTargetFromMenu={setTargetFromMenu}
            setSelectedCountryName={setSelectedCountryName}
            setTarget={setTarget}
            setIsSummaryOpen={setIsSummaryOpen}
            handleSimulateTrade={handleSimulateTrade}
          />
        </div>
      </Sheet>
    </div>
  );
}
