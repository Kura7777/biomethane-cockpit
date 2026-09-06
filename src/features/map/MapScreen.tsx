import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Line,
  Marker,
} from 'react-simple-maps';
import { ArrowLeftRight } from 'lucide-react';
import geoData from '../../assets/countries-50m.json';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { calculateLogisticsRoute, calculateDijkstraCorridor } from '../../domain/logistics/engine';

interface CountryMeta {
  iso: string;
  name: string;
  status: 'ACTIVE' | 'EMERGING' | 'FUTURE_2028' | 'RESTRICTED' | 'NONE';
  legal: string;
  plants: number;
  twh: number;
  center: [number, number]; // [lon, lat]
}

const COUNTRIES: Record<string, CountryMeta> = {
  'Germany': { iso: 'DE', name: 'Germany', status: 'ACTIVE', legal: '§37a BImSchG · 38. BImSchV', plants: 242, twh: 11.8, center: [10.45, 51.16] },
  'Netherlands': { iso: 'NL', name: 'Netherlands', status: 'ACTIVE', legal: 'Wet milieubeheer · Regeling energie vervoer', plants: 82, twh: 3.2, center: [5.29, 52.13] },
  'France': { iso: 'FR', name: 'France', status: 'ACTIVE', legal: 'Code de l’énergie L.446-24 · Art. 266 quindecies', plants: 652, twh: 10.4, center: [2.21, 46.22] },
  'Italy': { iso: 'IT', name: 'Italy', status: 'ACTIVE', legal: 'DM 2 March 2018 · DM 15 Sept 2022', plants: 135, twh: 4.8, center: [12.56, 41.87] },
  'Denmark': { iso: 'DK', name: 'Denmark', status: 'ACTIVE', legal: 'VE-loven §§ 43a–43f', plants: 64, twh: 5.6, center: [9.50, 56.26] },
  'Austria': { iso: 'AT', name: 'Austria', status: 'ACTIVE', legal: 'Erneuerbaren-Gase-Gesetz', plants: 16, twh: 0.45, center: [14.55, 47.51] },
  'Sweden': { iso: 'SE', name: 'Sweden', status: 'ACTIVE', legal: 'Lag (1994:1776) om skatt på energi', plants: 72, twh: 2.1, center: [18.64, 60.12] },
  'Finland': { iso: 'FI', name: 'Finland', status: 'ACTIVE', legal: 'Jakeluvelvoitelaki (446/2007)', plants: 26, twh: 0.55, center: [25.74, 61.92] },
  'Belgium': { iso: 'BE', name: 'Belgium', status: 'ACTIVE', legal: 'Energiedecreet · Décret wallon gaz', plants: 12, twh: 0.38, center: [4.46, 50.50] },
  'Spain': { iso: 'ES', name: 'Spain', status: 'ACTIVE', legal: 'Real Decreto 376/2022', plants: 38, twh: 0.9, center: [-3.74, 40.46] },
  'Poland': { iso: 'PL', name: 'Poland', status: 'EMERGING', legal: 'Ustawa o OZE Art. 70a–70z', plants: 14, twh: 0.3, center: [19.14, 51.91] },
  'Czechia': { iso: 'CZ', name: 'Czechia', status: 'EMERGING', legal: 'Zákon o POZE 165/2012 §§ 24–27', plants: 11, twh: 0.2, center: [15.47, 49.81] },
  'Portugal': { iso: 'PT', name: 'Portugal', status: 'EMERGING', legal: 'Decreto-Lei 84/2022', plants: 4, twh: 0.05, center: [-8.22, 39.39] },
  'Ireland': { iso: 'IE', name: 'Ireland', status: 'EMERGING', legal: 'NORA Act Part 5A', plants: 6, twh: 0.1, center: [-8.24, 53.41] },
  'Greece': { iso: 'GR', name: 'Greece', status: 'EMERGING', legal: 'Law 4951/2022 Art. 80–92', plants: 3, twh: 0.04, center: [21.82, 39.07] },
  'Romania': { iso: 'RO', name: 'Romania', status: 'EMERGING', legal: 'Legea 220/2008 · ANRE norms', plants: 2, twh: 0.03, center: [24.96, 45.94] },
  'Hungary': { iso: 'HU', name: 'Hungary', status: 'EMERGING', legal: 'Földgáztörvény 82–85. §', plants: 5, twh: 0.08, center: [19.50, 47.16] },
  'Estonia': { iso: 'EE', name: 'Estonia', status: 'EMERGING', legal: 'Vedelkütuse seadus § 2¹', plants: 8, twh: 0.15, center: [25.01, 58.59] },
  'Lithuania': { iso: 'LT', name: 'Lithuania', status: 'EMERGING', legal: 'Renewable Energy Law Art. 38–41', plants: 4, twh: 0.06, center: [23.88, 55.16] },
  'Latvia': { iso: 'LV', name: 'Latvia', status: 'EMERGING', legal: 'Enerģētikas likums 42. pants', plants: 3, twh: 0.04, center: [24.60, 56.87] },
  'Switzerland': { iso: 'CH', name: 'Switzerland', status: 'EMERGING', legal: 'MinStG Art. 2a · 12b — grid-isolated', plants: 35, twh: 0.4, center: [8.22, 46.81] },
  'Norway': { iso: 'NO', name: 'Norway', status: 'EMERGING', legal: 'Produktforskriften kap. 3 — grid-isolated', plants: 12, twh: 0.2, center: [8.46, 60.47] },
  'United Kingdom': { iso: 'GB', name: 'United Kingdom', status: 'RESTRICTED', legal: 'RTFO — grid injection cannot evidence UDB ingestion', plants: 108, twh: 6.1, center: [-3.43, 55.37] },
  'Slovakia': { iso: 'SK', name: 'Slovakia', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 2, twh: 0.03, center: [19.69, 48.66] },
  'Slovenia': { iso: 'SI', name: 'Slovenia', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 1, twh: 0.01, center: [14.99, 46.15] },
  'Croatia': { iso: 'HR', name: 'Croatia', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 1, twh: 0.01, center: [15.20, 45.10] },
  'Bulgaria': { iso: 'BG', name: 'Bulgaria', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 1, twh: 0.01, center: [25.48, 42.73] },
  'Luxembourg': { iso: 'LU', name: 'Luxembourg', status: 'FUTURE_2028', legal: 'ETS2 · Directive (EU) 2023/959', plants: 2, twh: 0.02, center: [6.12, 49.81] },
};

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active market', fill: 'color-mix(in srgb, var(--color-text) 72%, var(--color-bg))', swatch: 'var(--color-text)' },
  EMERGING: { label: 'Emerging', fill: 'color-mix(in srgb, var(--color-text) 38%, var(--color-bg))', swatch: 'var(--color-neutral-500)' },
  FUTURE_2028: { label: 'Future 2028 · ETS2', fill: 'color-mix(in srgb, var(--color-text) 16%, var(--color-bg))', swatch: 'var(--color-neutral-300)' },
  RESTRICTED: { label: 'Restricted · UDB gap', fill: 'var(--color-accent)', swatch: 'var(--color-accent)' },
  NONE: { label: 'No mechanism', fill: 'color-mix(in srgb, var(--color-text) 7%, var(--color-bg))', swatch: 'color-mix(in srgb, var(--color-text) 12%, var(--color-bg))' },
};

export function MapScreen() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<string>('Denmark');
  const [target, setTarget] = useState<string>('Germany');
  const [selectedCountryName, setSelectedCountryName] = useState<string>('Germany');
  const [mode, setMode] = useState<'ORIGIN' | 'TARGET'>('TARGET');
  const [hoveredCountry, setHoveredCountry] = useState<CountryMeta | null>(null);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(3.6);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12, 53]);

  const originMeta = COUNTRIES[origin] || COUNTRIES['Denmark'];
  const targetMeta = COUNTRIES[target] || COUNTRIES['Germany'];
  const selectedMeta = COUNTRIES[selectedCountryName] || COUNTRIES['Germany'];

  const statusCounts = useMemo(() => {
    const counts = { ACTIVE: 0, EMERGING: 0, FUTURE_2028: 0, RESTRICTED: 0, NONE: 0 };
    Object.values(COUNTRIES).forEach(c => {
      counts[c.status]++;
    });
    return counts;
  }, []);

  const corridorCalculation = useMemo(() => {
    return calculateLogisticsRoute(originMeta.iso, targetMeta.iso);
  }, [originMeta.iso, targetMeta.iso]);

  const dijkstraPath = useMemo(() => {
    return calculateDijkstraCorridor(originMeta.iso, targetMeta.iso);
  }, [originMeta.iso, targetMeta.iso]);

  const handleCountryClick = (cName: string) => {
    const cMeta = COUNTRIES[cName];
    if (!cMeta) return;

    setSelectedCountryName(cName);
    if (mode === 'ORIGIN') {
      if (cName !== target) setOrigin(cName);
    } else {
      if (cName !== origin) setTarget(cName);
    }
  };

  const handleSwapCorridor = () => {
    const prevOrigin = origin;
    const prevTarget = target;
    setOrigin(prevTarget);
    setTarget(prevOrigin);
    setSelectedCountryName(prevTarget);
  };

  const handleSimulateTrade = () => {
    navigate(buildDealUrl({
      originCountry: originMeta.iso,
      marketId: `${targetMeta.iso}_THG`,
    }));
  };

  const sortedCountries = useMemo(() => {
    return Object.entries(COUNTRIES).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

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
          position: 'relative',
        }}
      >
        {/* Top Header & Fast Corridor Selectors Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '12px 18px',
            borderBottom: '2px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 className="ptitle" style={{ fontSize: '18px' }}>Compliance &amp; logistics map</h3>
            <div className="subttl">
              30 European jurisdictions · Interactive cross-border routing &amp; transmission tariffs
            </div>
          </div>

          {/* Quick Origin / Target Selector Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-bg)',
              padding: '6px 10px',
              border: '1px solid var(--color-divider)',
            }}
          >
            {/* Origin Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="eyebrow" style={{ color: 'var(--color-text)', fontWeight: 800 }}>Origin</span>
              <select
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="input"
                style={{
                  height: '28px',
                  minHeight: '28px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  width: '140px',
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
                onChange={e => setTarget(e.target.value)}
                className="input"
                style={{
                  height: '28px',
                  minHeight: '28px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  width: '140px',
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
              style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 10px', marginLeft: '4px' }}
              onClick={handleSimulateTrade}
            >
              Trade →
            </button>
          </div>

          <div style={{ display: 'flex', gap: '14px' }} className="eyebrow">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '9px', height: '9px', backgroundColor: 'var(--color-text)' }} />
              Active · {statusCounts.ACTIVE}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '9px', height: '9px', backgroundColor: 'var(--color-neutral-500)' }} />
              Emerging · {statusCounts.EMERGING}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '9px', height: '9px', backgroundColor: 'var(--color-accent)' }} />
              Restricted · {statusCounts.RESTRICTED}
            </span>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative', minHeight: '440px', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 680,
              center: [12, 54],
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup zoom={zoomLevel / 3.6} center={mapCenter}>
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const name = geo.properties.name;
                    const cMeta = COUNTRIES[name];
                    const status = cMeta ? cMeta.status : 'NONE';
                    const fill = STATUS_CONFIG[status].fill;
                    const isOrigin = name === origin;
                    const isTarget = name === target;
                    const isHovered = hoveredCountry?.name === name;

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
                        onMouseEnter={() => {
                          if (cMeta) setHoveredCountry(cMeta);
                        }}
                        onMouseLeave={() => setHoveredCountry(null)}
                        style={{
                          default: { fill, stroke, strokeWidth, outline: 'none', cursor: cMeta ? 'pointer' : 'default' },
                          hover: { fill, stroke, strokeWidth: 1.5, outline: 'none', cursor: cMeta ? 'pointer' : 'default' },
                          pressed: { fill, stroke, strokeWidth, outline: 'none' },
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
              {Object.entries(COUNTRIES).map(([name, cMeta]) => (
                <Marker key={cMeta.iso} coordinates={cMeta.center}>
                  <text
                    textAnchor="middle"
                    y={-2}
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: '10px',
                      fill: 'var(--color-text)',
                      paintOrder: 'stroke',
                      stroke: 'var(--color-bg)',
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
                    y={9}
                    className="num"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: '9px',
                      fill: 'color-mix(in srgb, var(--color-text) 70%, transparent)',
                      paintOrder: 'stroke',
                      stroke: 'var(--color-bg)',
                      strokeWidth: '2px',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {cMeta.plants}
                  </text>
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>

          {/* Overlay: Top-Left Legend & Click-Mode Switcher */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              minWidth: '210px',
              backgroundColor: 'color-mix(in srgb, var(--color-surface) 96%, transparent)',
              border: '1px solid var(--color-divider)',
              padding: '10px 12px',
            }}
          >
            <div className="eyebrow">Map Click Mode</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                type="button"
                className={`btn ${mode === 'ORIGIN' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '3px 8px', fontSize: '11px', flex: 1 }}
                onClick={() => setMode('ORIGIN')}
              >
                Set Origin
              </button>
              <button
                type="button"
                className={`btn ${mode === 'TARGET' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '3px 8px', fontSize: '11px', flex: 1 }}
                onClick={() => setMode('TARGET')}
              >
                Set Target
              </button>
            </div>
            <div style={{ fontSize: '11px', marginTop: '6px' }} className="mut">
              Clicking a country sets it as <strong>{mode === 'ORIGIN' ? 'Origin' : 'Target'}</strong>.
            </div>

            <div style={{ borderTop: '1px solid var(--color-divider)', marginTop: '8px', paddingTop: '8px' }}>
              <div className="eyebrow" style={{ marginBottom: '5px' }}>Compliance status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(['ACTIVE', 'EMERGING', 'FUTURE_2028', 'RESTRICTED'] as const).map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                    <span style={{ width: '9px', height: '9px', flex: 'none', backgroundColor: STATUS_CONFIG[s].swatch }} />
                    <span style={{ flex: 1 }}>{STATUS_CONFIG[s].label}</span>
                    <span className="num mut" style={{ fontSize: '10px' }}>{statusCounts[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overlay: Top-Right Zoom Buttons */}
          <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0, fontSize: '14px', fontWeight: 800 }}
              aria-label="Zoom in"
              onClick={() => setZoomLevel(z => Math.min(z + 1, 8))}
            >
              +
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0, fontSize: '14px', fontWeight: 800, borderTop: 0 }}
              aria-label="Zoom out"
              onClick={() => setZoomLevel(z => Math.max(z - 1, 1))}
            >
              −
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '28px', height: '28px', padding: 0, fontSize: '10px', letterSpacing: '0.06em', borderTop: 0 }}
              aria-label="Reset view"
              onClick={() => {
                setZoomLevel(3.6);
                setMapCenter([12, 53]);
              }}
            >
              RST
            </button>
          </div>

          {/* Overlay: Bottom-Right Hover Card */}
          {hoveredCountry && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                width: '236px',
                backgroundColor: 'color-mix(in srgb, var(--color-surface) 96%, transparent)',
                border: '1px solid var(--color-divider)',
                padding: '10px 12px',
              }}
            >
              <div className="eyebrow">{STATUS_CONFIG[hoveredCountry.status].label}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '17px', marginTop: '4px' }}>
                {hoveredCountry.name}
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px' }} className="mut">
                {hoveredCountry.legal}
              </div>
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
        </div>

        {/* Bottom 3-Cell Corridor Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderTop: '2px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
            <div className="eyebrow">Active corridor</div>
            <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px' }}>
              {originMeta.iso} ({originMeta.name}) ➔ {targetMeta.iso} ({targetMeta.name})
            </div>
            <div style={{ fontSize: '12px' }} className="mut">
              {dijkstraPath.segments.length > 0
                ? `${dijkstraPath.path.join(' → ')} (${dijkstraPath.distanceKm} km · ${dijkstraPath.segments.length} hops)`
                : 'Direct / Single-area corridor'}
            </div>
          </div>
          <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
            <div className="eyebrow">Transit tariff</div>
            <div className="num" style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px' }}>
              {corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh !== null
                ? `€${corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)} / MWh`
                : '€1.80 / MWh'}
            </div>
            <div style={{ fontSize: '12px' }} className="mut">
              {corridorCalculation.modes.physicalPipeline.regulatoryFeasibility === 'HIGH'
                ? 'Single-zone / interconnected transit'
                : 'Multi-zone transit · PRISMA booking required'}
            </div>
          </div>
          <div style={{ padding: '12px 18px' }}>
            <div className="eyebrow">Basis to TTF</div>
            <div className="num" style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px' }}>
              +€0.65 / MWh
            </div>
            <div style={{ fontSize: '12px' }} className="mut">
              Target hub premium, M+1
            </div>
          </div>
        </div>
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
        <div style={{ padding: '16px 18px', borderBottom: '2px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">Jurisdiction</span>
            <span className={`chip ${selectedMeta.status === 'ACTIVE' ? 'chip-a' : ''}`}>
              {STATUS_CONFIG[selectedMeta.status].label}
            </span>
          </div>
          <h4 style={{ margin: '6px 0 2px', fontSize: '20px', fontWeight: 800 }}>{selectedMeta.name}</h4>
          <div style={{ fontSize: '11px' }} className="mut">
            {selectedMeta.legal}
          </div>

          {/* Prominent One-Click Assignment Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              className={`btn ${origin === selectedMeta.name ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 8px' }}
              onClick={() => setOrigin(selectedMeta.name)}
            >
              {origin === selectedMeta.name ? '✓ Origin (Active)' : 'Set as Origin'}
            </button>
            <button
              type="button"
              className={`btn ${target === selectedMeta.name ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 8px' }}
              onClick={() => setTarget(selectedMeta.name)}
            >
              {target === selectedMeta.name ? '✓ Target (Active)' : 'Set as Target'}
            </button>
          </div>
        </div>

        {/* 2x2 Stat Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            backgroundColor: 'var(--color-divider)',
          }}
        >
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
            <div className="eyebrow">Active plants</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>{selectedMeta.plants}</div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
            <div className="eyebrow">Installed</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>{selectedMeta.twh} TWh</div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
            <div className="eyebrow">Avg plant size</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>
              {((selectedMeta.twh * 1000) / Math.max(1, selectedMeta.plants)).toFixed(1)} GWh
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
            <div className="eyebrow">Grid connected</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>96%</div>
          </div>
        </div>

        {/* Delivery Options */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--color-divider)',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: '8px' }}>
            Delivery options · {originMeta.iso} → {selectedMeta.iso}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>A · Virtual UDB swap</span>
                <span className="num">
                  €{corridorCalculation.modes.virtualSwap.totalCostEurMwh !== null
                    ? corridorCalculation.modes.virtualSwap.totalCostEurMwh.toFixed(2)
                    : '1.80'}
                </span>
              </div>
              <div style={{ fontSize: '11px' }} className="mut">
                {corridorCalculation.modes.virtualSwap.regulatoryFeasibility === 'CONTESTED'
                  ? 'Recommended · contested in some member states'
                  : 'Single mass balance zone transfer'}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>B · Continuous grid path</span>
                <span className="num">
                  €{corridorCalculation.modes.physicalPipeline.totalCostEurMwh !== null
                    ? corridorCalculation.modes.physicalPipeline.totalCostEurMwh.toFixed(2)
                    : '3.20'}
                </span>
              </div>
              <div style={{ fontSize: '11px' }} className="mut">
                Multi-zone transit · PRISMA capacity required
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>C · Physical bio-LNG</span>
                <span className="num" style={{ color: corridorCalculation.modes.bioLng.totalCostEurMwh !== null ? 'var(--color-text)' : 'var(--color-accent-700)' }}>
                  {corridorCalculation.modes.bioLng.totalCostEurMwh !== null
                    ? `€${corridorCalculation.modes.bioLng.totalCostEurMwh.toFixed(2)}`
                    : 'Tariff incomplete'}
                </span>
              </div>
              <div style={{ fontSize: '11px' }} className="mut">
                Liquefaction leg unverified — never summed around a null tariff
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px' }}>
          <p style={{ fontSize: '12px', lineHeight: 1.55, margin: 0 }} className="mut">
            {selectedMeta.iso === 'DE'
              ? 'Largest compliance market in Europe. Double counting is unresolved for the 2026 compliance year, so every German netback is carried as a dual branch until the cabinet draft settles.'
              : selectedMeta.iso === 'GB'
              ? 'Non-EU territory. RTFO certificates require Great Britain grid injection; non-UK injected biomethane cannot evidence UDB ingestion into EU without physical segregation.'
              : `Active regulatory mechanism for ${selectedMeta.name}. Consignments must evidence mass balance custody and statutory scheme certification.`}
          </p>
        </div>

        {/* Actions */}
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
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 0 }}
            onClick={handleSimulateTrade}
          >
            Simulate in trade builder
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ marginTop: 0 }}
            onClick={() => setIsLogisticsOpen(true)}
          >
            Open delivery playbook
          </button>
        </div>
      </div>

      {/* Logistics Modal */}
      <LogisticsModal
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
        originCountry={originMeta.iso}
        targetCountry={selectedMeta.iso}
      />
    </div>
  );
}
