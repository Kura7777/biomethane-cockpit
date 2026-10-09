import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { Sheet } from '../../shared/ui';
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
  ROUTES_HINT,
  MAP_HOME
} from './mapConstants';
import { useMapUrlState } from './hooks/useMapUrlState';
import { useMapSelection } from './hooks/useMapSelection';
import { MapLegend, MapViewToggle } from './components/MapLegend';
import { MapOptionsPanel } from './components/MapOptionsPanel';
import { MapCorridorStrip } from './components/MapCorridorStrip';
import { MapCountryRailBody, MapCountryRailButtons } from './components/MapCountryRail';
import { MapCountryDetailModal } from './components/MapCountryDetailModal';
import { MapSummaryModal, MapSummaryContent } from './components/MapSummaryModal';
import { MapSvgLayer } from './components/MapSvgLayer';

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

  // The options panel overlays the left of the map; shift the view so the map is centred in the
  // uncovered area. Converts half the panel's footprint (px) to degrees of longitude (Mercator is
  // linear in longitude) using the SVG's meet-fit scale, projection scale 680 and current zoom.
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
    const transitFigure =
      corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh !== null
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
            <MapCountryRailBody {...sharedRailProps} />
            <div className="map-m-legend">
              <MapViewToggle
                view={view}
                setView={setView}
                filter={filter}
                setFilter={setFilter}
                touch={true}
              />
              <div className="eyebrow" style={{ margin: '14px 0 8px' }}>
                {view === 'SELL' ? `Trade Opportunities (${originMeta.iso})` : 'Who accepts imports'}
              </div>
              <MapLegend
                view={view}
                categoryCounts={categoryCounts}
                complianceCounts={complianceCounts}
                originMeta={originMeta}
                fontPx={13}
                swatchPx={10}
                gap={6}
              />
              <div className="mut" style={{ fontSize: '12px', marginTop: '10px' }}>
                {Object.keys(COUNTRIES).length} European jurisdictions · Interactive cross-border routing &amp; transmission tariffs
              </div>
            </div>
          </div>
        </Sheet>

        <Sheet
          open={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          title={`Commercial Trade Summary: ${originMeta.name} (${originMeta.iso})`}
          subtitle={`Ready to trade ${categoryCounts.SELL_NOW} · Review needed ${categoryCounts.CHECK_FIRST} · Closed ${categoryCounts.CLOSED}`}
          variant="bottom"
          testId="mobile-route-summary-sheet"
        >
          <div style={{ padding: '0 4px 16px', minHeight: 0 }}>
            <MapSummaryContent
              originMeta={originMeta}
              filter={filter}
              setFilter={setFilter}
              certRoutes={certRoutes}
              nameByIso={nameByIso}
              activeLinkedPlant={activeLinkedPlant}
              onNavigateTrade={() => setIsSummaryOpen(false)}
            />
          </div>
        </Sheet>

        <LogisticsModal
          isOpen={isLogisticsOpen}
          onClose={() => setIsLogisticsOpen(false)}
          originCountry={originMeta.iso}
          targetCountry={targetMeta.iso}
        />
      </div>
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
      {/* ─── Left: Map Canvas & Overlays ─── */}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '6px 18px',
            borderBottom: '2px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            flexWrap: 'nowrap',
          }}
        >
          <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '18px', rowGap: '2px' }}>
            <h3 className="ptitle" style={{ fontSize: '18px', margin: 0 }}>Compliance &amp; logistics map</h3>
            <div className="subttl" style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
              <span style={{ display: 'inline-flex', gap: '12px', flexWrap: 'wrap' }}>
                {view === 'COMPLIANCE' ? (
                  (['YES', 'GO_REQUIRED', 'OPEN', 'NO', 'NO_SCHEME'] as const)
                    .filter(st => complianceCounts[st] > 0)
                    .map(st => (
                      <span key={st} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '9px', height: '9px', backgroundColor: ACCEPT_FOREIGN_CONFIG[st].swatch }} />
                        {ACCEPT_FOREIGN_CONFIG[st].label.split(' ')[0]} · {complianceCounts[st]}
                      </span>
                    ))
                ) : (
                  (['SELL_NOW', 'CHECK_FIRST', 'CLOSED'] as const).map(cat => (
                    <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '9px', height: '9px', backgroundColor: cat === 'SELL_NOW' ? 'var(--color-status-pass-text)' : cat === 'CHECK_FIRST' ? 'var(--color-status-warn-text)' : 'color-mix(in srgb, var(--color-text) 25%, var(--color-bg))' }} />
                      {cat === 'SELL_NOW' ? 'Ready to trade' : cat === 'CHECK_FIRST' ? 'Review needed / workaround' : 'Closed / domestic only'} · {categoryCounts[cat]}
                    </span>
                  ))
                )}
              </span>
            </div>
          </div>

          {/* Quick Origin / Target Selector Bar */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-bg)',
              padding: '4px 8px',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-control)',
            }}
          >
            {/* Origin Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                style={{
                  height: '28px',
                  minHeight: '28px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  width: '210px',
                  cursor: 'pointer',
                }}
              >
                {sortedCountries.map(([name, c]) => (
                  <option key={c.iso} value={name}>
                    {c.iso} · {c.name} ({c.plants}p)
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0, minHeight: '28px' }}
              title="Swap Origin and Target"
              aria-label="Swap corridor direction"
              onClick={handleSwapCorridor}
            >
              <ArrowLeftRight style={{ width: '13px', height: '13px' }} />
            </button>

            {/* Target Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                style={{
                  height: '28px',
                  minHeight: '28px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  width: '210px',
                  borderColor: 'var(--color-accent)',
                  cursor: 'pointer',
                }}
              >
                {sortedCountries.map(([name, c]) => (
                  <option key={c.iso} value={name}>
                    {c.iso} · {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Simulate CTA */}
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: '28px', minHeight: '28px', fontSize: '12px', padding: '0 10px', marginLeft: '4px' }}
              onClick={handleSimulateTrade}
              disabled={!currentTradeTarget}
              title={!currentTradeTarget ? 'No tradeable market mapped for this route' : undefined}
            >
              Trade →
            </button>
          </div>
        </div>

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

      {/* ─── Right Rail: Selected Jurisdiction ─── */}
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
            padding: '16px 18px',
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
