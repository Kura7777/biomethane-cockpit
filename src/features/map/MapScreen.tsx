import { useState, useEffect, useRef, useMemo } from 'react';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import './map.css';
import { LogisticsModal } from '../logistics/LogisticsModal';
import {
  COUNTRIES,
  CountryMeta,
  AcceptForeignStatus,
  ACCEPT_FOREIGN_CONFIG,
  ACCEPT_FOREIGN_PRIORITY,
  getBestAcceptsForeign,
  MapView,
  RouteFilter,
  SellCategory,
  FILTER_CONFIG,
  ISO_TO_NAME,
  resolveCorridorParams,
  MAP_HOME
} from './mapConstants';
import { useMapUrlState } from './hooks/useMapUrlState';
import { useMapSelection } from './hooks/useMapSelection';
import { MapOptionsPanel } from './components/MapOptionsPanel';
import { MapCorridorStrip } from './components/MapCorridorStrip';
import { MapCountryRailBody, MapCountryRailButtons } from './components/MapCountryRail';
import { MapCountryDetailModal } from './components/MapCountryDetailModal';
import { MapSummaryModal } from './components/MapSummaryModal';
import { MapSvgLayer } from './components/MapSvgLayer';
import { MapMobileView } from './components/MapMobileView';
import { MapDesktopHeader } from './components/MapDesktopHeader';

export {
  COUNTRIES,
  MAP_HOME,
  ACCEPT_FOREIGN_CONFIG,
  ACCEPT_FOREIGN_PRIORITY,
  getBestAcceptsForeign,
  FILTER_CONFIG,
  ISO_TO_NAME,
  resolveCorridorParams
};
export type { AcceptForeignStatus, CountryMeta, MapView, RouteFilter, SellCategory };
export { getTradePlaybook } from './tradePlaybook';
export type { TradeArchetype, TradePlaybookDetails } from './tradePlaybook';

export function MapScreen() {
  const isMobile = useIsMobile();
  const [panelOpen, setPanelOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const { origin, setOrigin, target, setTarget, filter, setFilter, searchParams } = useMapUrlState();

  const {
    selectedCountryName,
    setSelectedCountryName,
    mode,
    setMode,
    view,
    setView,
    originMeta,
    targetMeta,
    selectedMeta,
    countryAcceptsForeign,
    complianceCounts,
    nameByIso,
    certRoutes,
    routeByIso,
    categoryCounts,
    topRoutes,
    tradeableBreakdown,
    currentRoute,
    currentPlaybook,
    corridorCalculation,
    dijkstraPath,
    currentTradeTarget,
    activeLinkedPlant,
    handleCountryClick,
    setOriginFromMenu,
    setTargetFromMenu,
    handleSwapCorridor,
    handleSimulateTrade,
  } = useMapSelection({
    origin,
    setOrigin,
    target,
    setTarget,
    filter,
    searchParams,
    isMobile,
    setPanelOpen,
  });

  const mapBoxRef = useRef<HTMLDivElement>(null);
  const optionsPanelRef = useRef<HTMLDivElement>(null);
  const [panelOffsetDeg, setPanelOffsetDeg] = useState(0);

  // Center map in remaining space when options panel is open
  useEffect(() => {
    if (isMobile) { setPanelOffsetDeg(0); return; }
    const box = mapBoxRef.current;
    const panel = optionsPanelRef.current;
    if (!box || !panel || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const fit = Math.min(box.clientWidth / 800, box.clientHeight / 600);
      if (!fit) return;
      const coveredPx = panel.offsetLeft + panel.offsetWidth;
      const pxPerDeg = fit * 680 * (Math.PI / 180);
      setPanelOffsetDeg(coveredPx / 2 / pxPerDeg);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [isMobile]);

  useEffect(() => {
    if (!isSummaryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSummaryOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSummaryOpen]);

  useEffect(() => {
    if (!isDetailOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDetailOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDetailOpen]);

  const sortedCountries = useMemo(() => {
    return Object.entries(COUNTRIES).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const openPlaybook = () => {
    setPanelOpen(false);
    setIsLogisticsOpen(true);
  };

  const sharedRailProps = {
    origin,
    target,
    originMeta,
    targetMeta,
    selectedMeta,
    countryAcceptsForeign,
    view,
    currentPlaybook,
    categoryCounts,
    tradeableBreakdown,
    topRoutes,
    activeLinkedPlant,
    currentTradeTarget,
    corridorCalculation,
    setOriginFromMenu,
    setTargetFromMenu,
    setSelectedCountryName,
    setTarget,
    setIsSummaryOpen,
    handleSimulateTrade,
  };

  if (isMobile) {
    return (
      <>
        <MapMobileView
          origin={origin}
          target={target}
          originMeta={originMeta}
          targetMeta={targetMeta}
          selectedMeta={selectedMeta}
          selectedCountryName={selectedCountryName}
          mode={mode}
          setMode={setMode}
          view={view}
          filter={filter}
          countryAcceptsForeign={countryAcceptsForeign}
          routeByIso={routeByIso}
          activeLinkedPlant={activeLinkedPlant}
          panelOpen={panelOpen}
          setPanelOpen={setPanelOpen}
          sortedCountries={sortedCountries}
          currentTradeTarget={currentTradeTarget}
          currentPlaybook={currentPlaybook}
          categoryCounts={categoryCounts}
          tradeableBreakdown={tradeableBreakdown}
          topRoutes={topRoutes}
          corridorCalculation={corridorCalculation}
          handleCountryClick={handleCountryClick}
          setOriginFromMenu={setOriginFromMenu}
          setTargetFromMenu={setTargetFromMenu}
          setSelectedCountryName={setSelectedCountryName}
          setOrigin={setOrigin}
          setTarget={setTarget}
          handleSwapCorridor={handleSwapCorridor}
          handleSimulateTrade={handleSimulateTrade}
          openPlaybook={openPlaybook}
          setIsSummaryOpen={setIsSummaryOpen}
        />
        <LogisticsModal
          isOpen={isLogisticsOpen}
          onClose={() => setIsLogisticsOpen(false)}
          originCountry={originMeta.iso}
          targetCountry={targetMeta.iso}
        />
      </>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 350px',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Left: Map Canvas & Overlays */}
      <div
        style={{
          borderRight: '2px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          height: 'calc(100dvh - 84px)',
          minHeight: '560px',
        }}
      >
        {/* Top Header & Fast Corridor Selectors Bar */}
        <MapDesktopHeader
          view={view}
          complianceCounts={complianceCounts}
          categoryCounts={categoryCounts}
          origin={origin}
          target={target}
          sortedCountries={sortedCountries}
          currentTradeTarget={currentTradeTarget}
          setOriginFromMenu={setOriginFromMenu}
          setTargetFromMenu={setTargetFromMenu}
          setOrigin={setOrigin}
          setTarget={setTarget}
          handleSwapCorridor={handleSwapCorridor}
          handleSimulateTrade={handleSimulateTrade}
        />

        {/* Map Container */}
        <div ref={mapBoxRef} style={{ flex: 1, position: 'relative', minHeight: '440px', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
          <MapSvgLayer
            isMobile={false}
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
            panelOffsetDeg={panelOffsetDeg}
          />

          {/* Top-Left Options Panel */}
          <MapOptionsPanel
            panelRef={optionsPanelRef}
            controlsOpen={controlsOpen}
            setControlsOpen={setControlsOpen}
            view={view}
            setView={setView}
            filter={filter}
            setFilter={setFilter}
            mode={mode}
            setMode={setMode}
            categoryCounts={categoryCounts}
            complianceCounts={complianceCounts}
            originMeta={originMeta}
          />
        </div>

        {/* Bottom Corridor Strip */}
        <MapCorridorStrip
          originMeta={originMeta}
          targetMeta={targetMeta}
          dijkstraPath={dijkstraPath}
          corridorCalculation={corridorCalculation}
          view={view}
          filter={filter}
          currentRoute={currentRoute}
          currentPlaybook={currentPlaybook}
        />
      </div>

      {/* Right Rail: Selected Jurisdiction */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-divider)',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          style={{ margin: '10px 18px 0', padding: '4px 10px', fontSize: '12px', alignSelf: 'flex-end' }}
          onClick={() => setIsDetailOpen(true)}
          data-testid="map-detail-expand"
        >
          Expand full screen ⤢
        </button>
        <MapCountryRailBody {...sharedRailProps} />
        <div
          style={{
            marginTop: 'auto',
            // Bottom room so the rail's last button can scroll clear of the floating help capsule.
            padding: '16px 18px 64px',
            borderTop: '2px solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <MapCountryRailButtons
            currentTradeTarget={currentTradeTarget}
            handleSimulateTrade={handleSimulateTrade}
            setIsLogisticsOpen={() => setIsLogisticsOpen(true)}
          />
        </div>
      </div>

      {/* Full-screen jurisdiction detail (desktop) */}
      <MapCountryDetailModal
        isOpen={isDetailOpen && !isMobile}
        onClose={() => setIsDetailOpen(false)}
        originMeta={originMeta}
        selectedMeta={selectedMeta}
        buttons={
          <MapCountryRailButtons
            currentTradeTarget={currentTradeTarget}
            handleSimulateTrade={handleSimulateTrade}
            setIsLogisticsOpen={() => {
              setIsDetailOpen(false);
              setIsLogisticsOpen(true);
            }}
          />
        }
      >
        <MapCountryRailBody {...sharedRailProps} />
      </MapCountryDetailModal>

      {/* Logistics Modal */}
      <LogisticsModal
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
        originCountry={originMeta.iso}
        targetCountry={targetMeta.iso}
      />

      {/* Route Summary Modal (Desktop) */}
      <MapSummaryModal
        isOpen={isSummaryOpen && !isMobile}
        onClose={() => setIsSummaryOpen(false)}
        originMeta={originMeta}
        filter={filter}
        setFilter={setFilter}
        certRoutes={certRoutes}
        nameByIso={nameByIso}
        categoryCounts={categoryCounts}
        activeLinkedPlant={activeLinkedPlant}
      />
    </div>
  );
}
