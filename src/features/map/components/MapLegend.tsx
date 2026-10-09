import {
  MapView,
  RouteFilter,
  AcceptForeignStatus,
  SellCategory,
  ACCEPT_FOREIGN_CONFIG,
  SELL_LEGEND,
  FILTER_CONFIG,
  CountryMeta,
  COUNTRIES
} from '../mapConstants';

interface MapLegendProps {
  view: MapView;
  categoryCounts: Record<SellCategory, number>;
  complianceCounts: Record<AcceptForeignStatus, number>;
  originMeta: CountryMeta;
  fontPx?: number;
  swatchPx?: number;
  gap?: number;
}

export function MapLegend({
  view,
  categoryCounts,
  complianceCounts,
  originMeta,
  fontPx = 12,
  swatchPx = 9,
  gap = 4,
}: MapLegendProps) {
  if (view === 'SELL') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
        {SELL_LEGEND.map(l => (
          <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: `${fontPx}px` }}>
            <span style={{ width: `${swatchPx}px`, height: `${swatchPx}px`, flex: 'none', backgroundColor: l.swatch, border: '1px solid var(--color-divider)' }} />
            <span style={{ flex: 1 }}>{l.label}</span>
            {l.key !== 'ORIGIN' ? (
              <span className="num mut" style={{ fontSize: '12px' }}>{categoryCounts[l.key]}</span>
            ) : (
              <span className="num mut" style={{ fontSize: '12px' }}>{originMeta.iso}</span>
            )}
          </div>
        ))}
        <div className="mut" style={{ fontSize: `${fontPx - 1}px`, marginTop: '4px', borderTop: '1px solid var(--color-divider)', paddingTop: '4px' }}>
          Number = biomethane plants (desk estimate)
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
      {(['YES', 'GO_REQUIRED', 'OPEN', 'NO', 'NO_SCHEME'] as const)
        .filter(st => complianceCounts[st] > 0)
        .map(st => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: `${fontPx}px` }}>
            <span style={{ width: `${swatchPx}px`, height: `${swatchPx}px`, flex: 'none', backgroundColor: ACCEPT_FOREIGN_CONFIG[st].swatch }} />
            <span style={{ flex: 1 }}>{ACCEPT_FOREIGN_CONFIG[st].label}</span>
            <span className="num mut" style={{ fontSize: '12px' }}>{complianceCounts[st]}</span>
          </div>
        ))}
      <div className="mut" style={{ fontSize: `${fontPx - 1}px`, marginTop: '4px', borderTop: '1px solid var(--color-divider)', paddingTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div>Rule: statutory acceptance of imported biomethane for compliance</div>
        <div>Most permissive scheme shown where a country has multiple</div>
      </div>
    </div>
  );
}

interface MapViewToggleProps {
  view: MapView;
  setView: (v: MapView) => void;
  filter: RouteFilter;
  setFilter: (f: RouteFilter) => void;
  touch?: boolean;
}

export function MapViewToggle({
  view,
  setView,
  filter,
  setFilter,
  touch = false,
}: MapViewToggleProps) {
  return (
    <div role="group" aria-label="Map view">
      <div className="eyebrow">Map view</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
        <button
          type="button"
          className={`btn ${view === 'SELL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: touch ? '0 8px' : '3px 8px', fontSize: '12px', flex: '1 1 auto', whiteSpace: 'nowrap', minHeight: touch ? '44px' : undefined }}
          aria-pressed={view === 'SELL'}
          onClick={() => setView('SELL')}
        >
          Trade Opportunities
        </button>
        <button
          type="button"
          className={`btn ${view === 'COMPLIANCE' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: touch ? '0 8px' : '3px 8px', fontSize: '12px', flex: '1 1 auto', whiteSpace: 'nowrap', minHeight: touch ? '44px' : undefined }}
          aria-pressed={view === 'COMPLIANCE'}
          onClick={() => setView('COMPLIANCE')}
        >
          Who accepts imports
        </button>
      </div>
      {view === 'SELL' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <span className="eyebrow" style={{ marginRight: '4px', fontSize: '11px' }}>Trade mode:</span>
            {(['ALL', 'GO', 'POS'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: touch ? '0 6px' : '2px 6px', fontSize: '11px', minHeight: touch ? '36px' : undefined }}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {FILTER_CONFIG[f].shortLabel}
              </button>
            ))}
          </div>
          <div className="map-filter-banner" style={{ marginTop: '8px' }}>
            <strong style={{ color: 'var(--color-text)' }}>{FILTER_CONFIG[filter].shortLabel}:</strong> {FILTER_CONFIG[filter].desc}
          </div>
        </>
      )}
    </div>
  );
}

export { COUNTRIES };
