import React from 'react';
import {
  MapView,
  RouteFilter,
  AcceptForeignStatus,
  SellCategory,
  CountryMeta,
  ROUTES_HINT
} from '../mapConstants';
import { MapLegend, MapViewToggle } from './MapLegend';

interface MapOptionsPanelProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  controlsOpen: boolean;
  setControlsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  view: MapView;
  setView: (v: MapView) => void;
  filter: RouteFilter;
  setFilter: (f: RouteFilter) => void;
  mode: 'ORIGIN' | 'TARGET';
  setMode: (m: 'ORIGIN' | 'TARGET') => void;
  categoryCounts: Record<SellCategory, number>;
  complianceCounts: Record<AcceptForeignStatus, number>;
  originMeta: CountryMeta;
}

export function MapOptionsPanel({
  panelRef,
  controlsOpen,
  setControlsOpen,
  view,
  setView,
  filter,
  setFilter,
  mode,
  setMode,
  categoryCounts,
  complianceCounts,
  originMeta,
}: MapOptionsPanelProps) {
  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        width: '300px',
        minWidth: '240px',
        maxWidth: '560px',
        maxHeight: 'calc(100% - 24px)',
        overflow: 'auto',
        resize: 'horizontal',
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 96%, transparent)',
        border: '1px solid var(--color-divider)',
        borderRadius: 'var(--radius-panel)',
        boxShadow: 'var(--shadow-card)',
        padding: '10px 12px',
      }}
    >
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: '3px 8px', fontSize: '12px', width: '100%', marginBottom: '8px' }}
        aria-expanded={controlsOpen}
        onClick={() => setControlsOpen(o => !o)}
      >
        {controlsOpen ? 'Hide map options ▴' : 'Map options (view · trade mode) ▾'}
      </button>
      {controlsOpen && (
        <>
          <MapViewToggle
            view={view}
            setView={setView}
            filter={filter}
            setFilter={setFilter}
            touch={false}
          />

          {view === 'COMPLIANCE' ? (
            <div style={{ borderTop: '1px solid var(--color-divider)', marginTop: '8px', paddingTop: '8px' }}>
              <div className="eyebrow">Map Click Mode</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  type="button"
                  className={`btn ${mode === 'ORIGIN' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 8px', fontSize: '12px', flex: 1 }}
                  onClick={() => setMode('ORIGIN')}
                >
                  Set Origin
                </button>
                <button
                  type="button"
                  className={`btn ${mode === 'TARGET' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 8px', fontSize: '12px', flex: 1 }}
                  onClick={() => setMode('TARGET')}
                >
                  Set Target
                </button>
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px' }} className="mut">
                Clicking a country sets it as <strong>{mode === 'ORIGIN' ? 'Origin' : 'Target'}</strong>.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', marginTop: '8px' }} className="mut">{ROUTES_HINT}</div>
          )}
        </>
      )}

      <div style={{ borderTop: controlsOpen ? '1px solid var(--color-divider)' : 0, marginTop: controlsOpen ? '8px' : 0, paddingTop: controlsOpen ? '8px' : 0 }}>
        <div className="eyebrow" style={{ marginBottom: '5px' }}>
          {view === 'SELL' ? `Trade Opportunities (${originMeta.iso})` : 'Who accepts imports'}
        </div>
        <MapLegend
          view={view}
          categoryCounts={categoryCounts}
          complianceCounts={complianceCounts}
          originMeta={originMeta}
          fontPx={12}
          swatchPx={9}
          gap={4}
        />
      </div>
    </div>
  );
}
