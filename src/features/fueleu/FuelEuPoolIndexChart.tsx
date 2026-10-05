import React, { useMemo, useState } from 'react';
import { useFuelEuPrices } from './useFuelEuPrices';
import { FUELEU_POOL_INDEX_HISTORY } from '../../domain/markets/fueleuPoolIndexHistory';
import { buildLinearScale, buildOrdinalPositions } from '../../domain/fueleu/uiHelpers';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';

/** Fixed Mar–Sep 2026 axis, per the approved chart spec — the desk's tracked window. */
const MONTHS: { label: string; key: string }[] = [
  { label: 'Mar', key: '2026-03' },
  { label: 'Apr', key: '2026-04' },
  { label: 'May', key: '2026-05' },
  { label: 'Jun', key: '2026-06' },
  { label: 'Jul', key: '2026-07' },
  { label: 'Aug', key: '2026-08' },
  { label: 'Sep', key: '2026-09' },
];

const DEADLINE_MONTH_INDEX = 1; // Apr — 30 Apr 2026 CY2025 pooling deadline

interface SeriesPoint {
  index: number;
  value: number;
  label: string;
  url: string;
}

/** Groups points into contiguous runs by month index, so a missing month breaks the line rather
 *  than being bridged (no interpolation across a gap). */
function buildSegments(points: SeriesPoint[]): SeriesPoint[][] {
  const sorted = [...points].sort((a, b) => a.index - b.index);
  const segments: SeriesPoint[][] = [];
  let current: SeriesPoint[] = [];
  let lastIndex: number | null = null;
  for (const p of sorted) {
    if (lastIndex !== null && p.index !== lastIndex + 1) {
      if (current.length) segments.push(current);
      current = [];
    }
    current.push(p);
    lastIndex = p.index;
  }
  if (current.length) segments.push(current);
  return segments;
}

export interface FuelEuPoolIndexChartProps {
  width?: number;
  height?: number;
}

/**
 * "FuelEU surplus price, compliance year 2026" — OceanScore OPX (offer-side, dashed) against the
 * BetterSea FuelEU Surplus Index (executed trades, solid — VWAP where published, May's monthly
 * average where it isn't) over Mar–Sep 2026. Missing months (OceanScore's June gap) break the
 * line rather than being bridged. Reuses the inline-SVG conventions of FuelEuProjectionChart:
 * design tokens, 12px ticks, dotted gridlines.
 */
export function FuelEuPoolIndexChart({ width: widthProp = 960, height: heightProp = 260 }: FuelEuPoolIndexChartProps) {
  const isMobile = useIsMobile();
  // Mobile: narrower viewBox so the 12px+ labels stay legible at phone width; taps replace <title> hovers.
  const width = isMobile ? 360 : widthProp;
  const height = isMobile ? 250 : heightProp;
  const [readout, setReadout] = useState<{ key: string; text: string } | null>(null);
  // Top margin holds the deadline label above the plot; right margin holds the desk-mark label beside its line.
  const margin = isMobile ? { top: 30, right: 14, bottom: 30, left: 46 } : { top: 32, right: 132, bottom: 30, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const currentMark = useFuelEuPrices().pool?.offerEurPerTco2e ?? null;

  const monthIndex = (period: string): number => MONTHS.findIndex(m => period.startsWith(m.key));

  const oceanScorePoints: SeriesPoint[] = useMemo(
    () =>
      FUELEU_POOL_INDEX_HISTORY.filter(r => r.source === 'OCEANSCORE_OPX' && r.offerIndex !== undefined)
        .map(r => ({ index: monthIndex(r.period), value: r.offerIndex as number, label: r.period, url: r.url }))
        .filter(p => p.index >= 0),
    []
  );

  const betterSeaPoints: SeriesPoint[] = useMemo(
    () =>
      FUELEU_POOL_INDEX_HISTORY.filter(r => r.source === 'BETTERSEA_INDEX')
        .map(r => ({
          index: monthIndex(r.period),
          value: (r.vwap ?? r.average) as number,
          label: r.period,
          url: r.url,
        }))
        .filter(p => p.index >= 0 && p.value !== undefined),
    []
  );

  const allValues = [...oceanScorePoints.map(p => p.value), ...betterSeaPoints.map(p => p.value), ...(currentMark === null ? [] : [currentMark])];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const pad = (maxValue - minValue) / 10 || 10;
  const yScale = buildLinearScale([Math.max(0, minValue - pad), maxValue + pad], [margin.top + innerH, margin.top]);
  const xPositions = buildOrdinalPositions(MONTHS.length, [margin.left, margin.left + innerW]);

  const oceanScoreSegments = buildSegments(oceanScorePoints);
  const betterSeaSegments = buildSegments(betterSeaPoints);

  const segmentPath = (segment: SeriesPoint[]): string =>
    segment.map((p, i) => `${i === 0 ? 'M' : 'L'}${xPositions[p.index].toFixed(2)},${yScale(p.value).toFixed(2)}`).join(' ');

  const yTicks = [minValue - pad < 0 ? 0 : Math.round(minValue - pad), Math.round((minValue + maxValue) / 2), Math.round(maxValue + pad)];

  const ariaLabel = `FuelEU surplus price, compliance year 2026: OceanScore OPX offer index and BetterSea FuelEU Surplus Index trade VWAP, March to September 2026. ${currentMark === null ? 'No FuelEU pool mark is loaded.' : `Current desk mark €${currentMark.toFixed(2)}.`}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span className="eyebrow" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-text)' }}>
        FuelEU surplus price, compliance year 2026
      </span>

      <svg role="img" aria-label={ariaLabel} width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: `${width}px` }} data-testid={isMobile ? 'fe-pool-chart-mobile' : undefined}>
        {/* Dotted gridlines */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={margin.left} x2={margin.left + innerW} y1={yScale(t)} y2={yScale(t)} stroke="var(--color-divider)" strokeDasharray="1,3" />
            <text x={margin.left - 6} y={yScale(t) + 4} textAnchor="end" fontSize={isMobile ? 13 : 12} fill="var(--color-muted)">
              €{t}
            </text>
          </g>
        ))}

        {/* Axes */}
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerH} stroke="var(--color-divider)" strokeWidth={1} />
        <line x1={margin.left} y1={margin.top + innerH} x2={margin.left + innerW} y2={margin.top + innerH} stroke="var(--color-divider)" strokeWidth={1} />

        {/* 30 Apr 2026 CY2025 pooling deadline marker */}
        <line
          x1={xPositions[DEADLINE_MONTH_INDEX]}
          x2={xPositions[DEADLINE_MONTH_INDEX]}
          y1={margin.top}
          y2={margin.top + innerH}
          stroke="var(--color-status-warn-text, #d97706)"
          strokeDasharray="3,3"
          strokeWidth={1}
        >
          <title>30 Apr 2026 · CY2025 pooling deadline</title>
        </line>
        <text
          x={xPositions[DEADLINE_MONTH_INDEX] + 4}
          y={margin.top - 10}
          fontSize={isMobile ? 13 : 12}
          fill="var(--color-status-warn-text, #d97706)"
        >
          {isMobile ? '30 Apr · CY2025' : '30 Apr · CY2025 deadline'}
        </text>

        {/* Current desk mark reference line (the FUELEU mark; omitted when none is loaded) */}
        {currentMark !== null && (<>
        <line
          x1={margin.left}
          x2={margin.left + innerW}
          y1={yScale(currentMark)}
          y2={yScale(currentMark)}
          stroke="var(--color-text)"
          strokeWidth={1.25}
          strokeDasharray="6,2"
        >
          <title>{`Current desk mark: €${currentMark.toFixed(2)}/tCO2e`}</title>
        </line>
        {isMobile ? (
          <text
            x={xPositions[DEADLINE_MONTH_INDEX] + 8}
            y={yScale(currentMark) - 6}
            textAnchor="start"
            fontSize={13}
            fontWeight={600}
            fill="var(--color-text)"
            stroke="var(--color-surface)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            Desk mark €{currentMark.toFixed(2)}
          </text>
        ) : (
          <text x={margin.left + innerW + 8} y={yScale(currentMark) + 4} textAnchor="start" fontSize="12" fontWeight={600} fill="var(--color-text)">
            Desk mark €{currentMark.toFixed(2)}
          </text>
        )}
        </>)}

        {/* OceanScore OPX — offer-side, dashed */}
        {oceanScoreSegments.map((segment, si) => (
          <path key={`os-${si}`} d={segmentPath(segment)} fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeDasharray="5,3" />
        ))}
        {oceanScorePoints.map(p => (
          <g key={`os-pt-${p.label}`}>
            <title>{`OceanScore OPX ${p.label}: €${p.value.toFixed(2)} (offer-side index) — ${p.url}`}</title>
            <circle cx={xPositions[p.index]} cy={yScale(p.value)} r={readout?.key === `os-${p.label}` ? 5 : 3} fill="var(--color-muted)" />
            {isMobile && (
              <circle
                cx={xPositions[p.index]}
                cy={yScale(p.value)}
                r={16}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => setReadout({ key: `os-${p.label}`, text: `OceanScore OPX ${p.label}: €${p.value.toFixed(2)} (offer-side index)` })}
              />
            )}
          </g>
        ))}

        {/* BetterSea FuelEU Surplus Index — executed trades, solid */}
        {betterSeaSegments.map((segment, si) => (
          <path key={`bs-${si}`} d={segmentPath(segment)} fill="none" stroke="var(--color-status-pos-text)" strokeWidth={2} />
        ))}
        {betterSeaPoints.map(p => (
          <g key={`bs-pt-${p.label}`}>
            <title>{`BetterSea ${p.label}: €${p.value.toFixed(2)} (executed trades) — ${p.url}`}</title>
            <circle cx={xPositions[p.index]} cy={yScale(p.value)} r={readout?.key === `bs-${p.label}` ? 5 : 3} fill="var(--color-status-pos-text)" />
            {isMobile && (
              <circle
                cx={xPositions[p.index]}
                cy={yScale(p.value)}
                r={16}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => setReadout({ key: `bs-${p.label}`, text: `BetterSea ${p.label}: €${p.value.toFixed(2)} (executed trades)` })}
              />
            )}
          </g>
        ))}

        {/* X-axis month labels */}
        {MONTHS.map((m, i) => (
          <text key={m.key} x={xPositions[i]} y={margin.top + innerH + 18} textAnchor="middle" fontSize={isMobile ? 13 : 12} fill="var(--color-muted)">
            {m.label}
          </text>
        ))}
      </svg>

      {isMobile && (
        <div className="fe-chart-readout" role="status" aria-live="polite">
          {readout ? readout.text : 'Tap a point for its value.'}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--color-muted)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--color-muted)" strokeWidth={2} strokeDasharray="5,3" /></svg>
          OceanScore OPX (offer-side)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--color-status-pos-text)" strokeWidth={2} /></svg>
          BetterSea FuelEU Surplus Index (executed trades)
        </span>
      </div>

      <div className="subttl" style={{ fontSize: '10.5px', lineHeight: 1.4 }}>
        Sources: OceanScore Pool-Price Index (OPX), https://oceanscore.com/pool-price-index/ · BetterSea FuelEU Surplus Index, https://www.bettersea.tech/fueleu-index. June 2026 OceanScore print not available — no line drawn across the gap.
      </div>
    </div>
  );
}
