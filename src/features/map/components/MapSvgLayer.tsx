import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Line,
  Marker
} from 'react-simple-maps';
import geoData from '../../../assets/countries-50m.json';
import {
  COUNTRIES,
  CountryMeta,
  MapView,
  RouteFilter,
  AcceptForeignStatus,
  ACCEPT_FOREIGN_CONFIG,
  SELL_FILL,
  classifyRoute,
  MAP_HOME
} from '../mapConstants';
import { getTradePlaybook, getPlaybookDealUrl } from '../tradePlaybook';
import { CertificateRoute, getCertificateRoute } from '../../../domain/registries/certificateRoutes';
import { BiomethanePlant } from '../../../domain/plants/types';

interface MapSvgLayerProps {
  isMobile: boolean;
  origin: string;
  target: string;
  selectedCountryName: string;
  originMeta: CountryMeta;
  targetMeta: CountryMeta;
  view: MapView;
  filter: RouteFilter;
  countryAcceptsForeign: Record<string, { status: AcceptForeignStatus; schemeName?: string }>;
  routeByIso: Record<string, CertificateRoute>;
  activeLinkedPlant: BiomethanePlant | null;
  handleCountryClick: (name: string) => void;
  setOriginFromMenu: (name: string) => void;
  setTargetFromMenu: (name: string) => void;
  setSelectedCountryName: (name: string) => void;
  panelOffsetDeg: number;
}

export function MapSvgLayer({
  isMobile,
  origin,
  target,
  selectedCountryName,
  originMeta,
  targetMeta,
  view,
  filter,
  countryAcceptsForeign,
  routeByIso,
  activeLinkedPlant,
  handleCountryClick,
  setOriginFromMenu,
  setTargetFromMenu,
  setSelectedCountryName,
  panelOffsetDeg,
}: MapSvgLayerProps) {
  const navigate = useNavigate();
  const [zoomLevel, setZoomLevel] = useState<number>(3.6);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_HOME);
  const [hoveredCountry, setHoveredCountry] = useState<CountryMeta | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('wheel', close, { passive: true });
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('wheel', close);
    };
  }, [ctxMenu]);

  const labelPx = isMobile ? '13px' : '12px';

  return (
    <>
      <ComposableMap
        projection="geoMercator"
        width={isMobile ? 420 : 800}
        height={600}
        projectionConfig={{
          scale: isMobile ? 560 : 680,
          center: [12, 54],
        }}
        style={
          isMobile
            ? { width: '100%', height: '100%' }
            : { position: 'absolute', inset: 0, width: '100%', height: '100%' }
        }
      >
        <ZoomableGroup zoom={zoomLevel / 3.6} center={[mapCenter[0] - panelOffsetDeg, mapCenter[1]]}>
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.filter(geo => COUNTRIES[geo.properties.name]).map(geo => {
                const name = geo.properties.name;
                const cMeta = COUNTRIES[name];
                const acceptStatus = cMeta ? countryAcceptsForeign[cMeta.iso]?.status || 'NO_SCHEME' : 'NO_SCHEME';
                let fill = ACCEPT_FOREIGN_CONFIG[acceptStatus].fill;
                if (view === 'SELL') {
                  fill = !cMeta
                    ? ACCEPT_FOREIGN_CONFIG.NO_SCHEME.fill
                    : name === origin
                    ? 'var(--color-text)'
                    : SELL_FILL[classifyRoute(routeByIso[cMeta.iso], filter)];
                }
                const isOrigin = name === origin;
                const isTarget = name === target;
                const isHovered = hoveredCountry?.name === name || (isMobile && name === selectedCountryName);

                let stroke = 'var(--color-bg)';
                let strokeWidth = 0.6;
                if (isOrigin) {
                  stroke = 'var(--color-text)';
                  strokeWidth = 2.2;
                } else if (isTarget) {
                  stroke = 'var(--color-accent)';
                  strokeWidth = 2.2;
                } else if (isHovered) {
                  stroke = 'var(--color-text)';
                  strokeWidth = 1.2;
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(name)}
                    onContextMenu={e => {
                      if (!cMeta || isMobile) return;
                      e.preventDefault();
                      setCtxMenu({ name, x: e.clientX, y: e.clientY });
                    }}
                    onMouseEnter={() => {
                      if (cMeta) setHoveredCountry(cMeta);
                    }}
                    onMouseLeave={() => setHoveredCountry(null)}
                    style={{
                      default: { fill, stroke, strokeWidth, outline: 'none', cursor: cMeta ? 'pointer' : 'default' },
                      hover: { fill, stroke, strokeWidth: 1.5, outline: 'none', cursor: cMeta ? 'pointer' : 'default' },
                      pressed: { fill, stroke, strokeWidth: 1.5, outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Active Logistics Corridor Line */}
          {originMeta && targetMeta && originMeta.iso !== targetMeta.iso && (
            <>
              <Line
                from={originMeta.center}
                to={targetMeta.center}
                stroke="var(--color-bg)"
                strokeWidth={5.5}
                strokeOpacity={0.85}
              />
              <Line
                from={originMeta.center}
                to={targetMeta.center}
                stroke="var(--color-accent)"
                strokeWidth={2.2}
                strokeDasharray="6 5"
                className="flow"
              />
              <Marker coordinates={originMeta.center}>
                <circle r={4} fill="var(--color-text)" />
              </Marker>
              <Marker coordinates={targetMeta.center}>
                <circle r={4.6} fill="var(--color-accent)" />
              </Marker>
            </>
          )}

          {/* Country ISO and Plant Labels */}
          {Object.entries(COUNTRIES).map(([name, cMeta]) => {
            const onOriginFill = view !== 'COMPLIANCE' && name === origin;
            return (
              <Marker key={cMeta.iso} coordinates={cMeta.center}>
                <text
                  textAnchor="middle"
                  y={-2}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: labelPx,
                    fill: onOriginFill ? 'var(--color-bg)' : 'var(--color-text)',
                    paintOrder: 'stroke',
                    stroke: onOriginFill ? 'var(--color-text)' : 'var(--color-bg)',
                    strokeWidth: '2.5px',
                    strokeLinejoin: 'round',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {cMeta.iso}
                </text>
                <text
                  textAnchor="middle"
                  y={12}
                  className="num"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: labelPx,
                    fill: onOriginFill ? 'var(--color-bg)' : 'color-mix(in srgb, var(--color-text) 70%, transparent)',
                    paintOrder: 'stroke',
                    stroke: onOriginFill ? 'var(--color-text)' : 'var(--color-bg)',
                    strokeWidth: '2px',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {cMeta.plants}
                </text>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Top-Right Zoom Buttons (Desktop & Mobile) */}
      {!isMobile ? (
        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-control)', overflow: 'hidden', boxShadow: 'var(--shadow-card)', zIndex: 10 }}>
          <button type="button" className="btn btn-secondary" style={{ width: '28px', height: '28px', padding: 0, fontSize: '14px', fontWeight: 800, borderRadius: 0 }} aria-label="Zoom in" onClick={() => setZoomLevel(z => Math.min(z + 1, 8))}>+</button>
          <button type="button" className="btn btn-secondary" style={{ width: '28px', height: '28px', padding: 0, fontSize: '14px', fontWeight: 800, borderTop: 0, borderRadius: 0 }} aria-label="Zoom out" onClick={() => setZoomLevel(z => Math.max(z - 1, 1))}>−</button>
          <button type="button" className="btn btn-secondary" style={{ width: '28px', height: '28px', padding: 0, fontSize: '12px', borderTop: 0, borderRadius: 0 }} aria-label="Reset view" onClick={() => { setZoomLevel(3.6); setMapCenter(MAP_HOME); }}>RST</button>
        </div>
      ) : (
        <div className="map-m-zoom">
          <button type="button" className="btn btn-secondary" aria-label="Zoom in" onClick={() => setZoomLevel(z => Math.min(z + 1, 8))}>+</button>
          <button type="button" className="btn btn-secondary" aria-label="Zoom out" onClick={() => setZoomLevel(z => Math.max(z - 1, 1))}>−</button>
          <button type="button" className="btn btn-secondary" aria-label="Reset view" style={{ fontSize: '12px' }} onClick={() => { setZoomLevel(3.6); setMapCenter(MAP_HOME); }}>RST</button>
        </div>
      )}

      {/* Context Menu (Desktop) */}
      {ctxMenu && COUNTRIES[ctxMenu.name] && !isMobile && createPortal(
        (() => {
          const c = COUNTRIES[ctxMenu.name];
          const isO = ctxMenu.name === origin;
          const isT = ctxMenu.name === target;
          const run = (fn: () => void) => () => {
            fn();
            setCtxMenu(null);
          };
          const ctxRoute = getCertificateRoute(originMeta.iso, c.iso);
          const ctxDealUrl = getPlaybookDealUrl(originMeta.iso, c.iso, ctxRoute, filter, activeLinkedPlant);
          const items: { label: string; onClick: () => void; disabled?: boolean; title?: string }[] = [
            { label: isO ? 'Origin (current)' : 'Set as origin', onClick: run(() => setOriginFromMenu(ctxMenu.name)), disabled: isO },
            { label: isT ? 'Target (current)' : 'Set as target', onClick: run(() => setTargetFromMenu(ctxMenu.name)), disabled: isT },
            { label: 'Show country details', onClick: run(() => setSelectedCountryName(ctxMenu.name)) },
            {
              label: `Simulate ${originMeta.iso} → ${c.iso} in Trade Builder`,
              onClick: run(() => {
                if (ctxDealUrl) {
                  navigate(ctxDealUrl);
                }
              }),
              disabled: isO || !ctxDealUrl,
              title: !ctxDealUrl ? 'No tradeable market mapped for this route' : undefined,
            },
            { label: 'Zoom to country', onClick: run(() => { setMapCenter(c.center); setZoomLevel(z => Math.max(z, 6)); }) },
          ];
          const W = 260;
          const H = 36 + items.length * 32;
          const left = Math.min(ctxMenu.x, window.innerWidth - W - 8);
          const top = Math.min(ctxMenu.y, window.innerHeight - H - 8);
          return (
            <div
              role="menu"
              aria-label={`${c.name} actions`}
              onMouseDown={e => e.stopPropagation()}
              onContextMenu={e => e.preventDefault()}
              style={{
                position: 'fixed',
                left,
                top,
                width: W,
                zIndex: 2000,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-control)',
                boxShadow: 'var(--shadow-card)',
                padding: '4px',
              }}
            >
              <div className="eyebrow" style={{ padding: '6px 10px 4px' }}>
                {c.iso} · {c.name} · {ACCEPT_FOREIGN_CONFIG[countryAcceptsForeign[c.iso]?.status || 'NO_SCHEME'].label}
              </div>
              {items.map(it => (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  className="map-ctx-item"
                  disabled={it.disabled}
                  onClick={it.onClick}
                  title={it.title}
                >
                  {it.label}
                </button>
              ))}
            </div>
          );
        })(),
        document.body,
      )}

      {/* Hover Card (Desktop) */}
      {hoveredCountry && !isMobile && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            width: '248px',
            backgroundColor: 'color-mix(in srgb, var(--color-surface) 96%, transparent)',
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-panel)',
            boxShadow: 'var(--shadow-card)',
            padding: '10px 12px',
          }}
        >
          <div className="eyebrow">
            {view === 'SELL'
              ? 'Trade Opportunities'
              : (() => {
                  const best = countryAcceptsForeign[hoveredCountry.iso]?.status || 'NO_SCHEME';
                  return ACCEPT_FOREIGN_CONFIG[best].label;
                })()}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', marginTop: '4px' }}>
            {hoveredCountry.name}
          </div>
          <div style={{ fontSize: '12px', marginTop: '2px' }} className="mut">
            {hoveredCountry.legal}
          </div>
          {view === 'SELL' && (
            <div style={{ marginTop: '6px', fontSize: '12px' }}>
              {hoveredCountry.iso === originMeta.iso ? (
                <strong>Selected origin</strong>
              ) : (
                (() => {
                  const r = routeByIso[hoveredCountry.iso];
                  const cat = classifyRoute(r, filter);
                  const pb = getTradePlaybook(originMeta.iso, hoveredCountry.iso, r);
                  const dotBg =
                    cat === 'SELL_NOW'
                      ? 'var(--color-status-pass-text)'
                      : cat === 'CHECK_FIRST'
                      ? 'var(--color-status-warn-text)'
                      : 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))';
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="map-status-dot" style={{ backgroundColor: dotBg }} />
                        <strong>{pb.badge}</strong>
                      </div>
                      <div className="mut" style={{ marginTop: '2px', overflowWrap: 'anywhere' }}>
                        {pb.structureTitle}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '18px', marginTop: '8px' }}>
            <div>
              <div className="eyebrow">Plants</div>
              <div className="num" style={{ fontSize: '16px', fontWeight: 800 }}>{hoveredCountry.plants}</div>
            </div>
            <div>
              <div className="eyebrow">Installed</div>
              <div className="num" style={{ fontSize: '16px', fontWeight: 800 }}>{hoveredCountry.twh} TWh</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
