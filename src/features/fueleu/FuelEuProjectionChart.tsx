import React, { useMemo, useState } from 'react';
import { projectStaticFleet, StaticFleetProjectionPoint, StaticFleetGroupProjectionPoint } from '../../domain/fueleu/calculator';
import { buildLinearScale, buildOrdinalPositions, buildLinePath, buildAreaPath } from '../../domain/fueleu/uiHelpers';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/** Compact €/tonne axis labels so long values never overflow the chart's narrow SVG viewBox. */
function formatCompactEur(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${value < 0 ? '-' : ''}€${(abs / 1_000_000_000).toFixed(abs % 1_000_000_000 === 0 ? 0 : 2)}bn`;
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}€${(abs / 1_000).toFixed(0)}k`;
  return `€${Math.round(value).toLocaleString()}`;
}

function formatCompactTonnes(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}${(abs / 1_000_000).toFixed(1)}Mt`;
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}${(abs / 1_000).toFixed(0)}kt`;
  return `${Math.round(value).toLocaleString()}t`;
}

// Indices in STATIC_FLEET_PROJECTION_YEARS where a non-uniform year gap occurs (2030→2035, 2035→2040).
const GAP_AFTER_INDICES = new Set<number>([4, 5]);

/** Rounds `value` up to a "nice" 1/2/5×10^n number, for gridline scale tops (e.g. 5.01bn → 6bn). */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = value / Math.pow(10, exp);
  let niceBase: number;
  // Finer steps than 1/2/5 so the curve fills most of the height (e.g. €5.01bn → €6bn, not €10bn).
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  niceBase = steps.find(st => base <= st) ?? 10;
  return niceBase * Math.pow(10, exp);
}

/** Short year tick label, matching the approved mockup: full year at the first point and at each
 *  milestone after a gap (2030/2035/2040), two-digit for the in-between consecutive years. */
function yearTickLabel(year: number, index: number): string {
  return index === 0 || GAP_AFTER_INDICES.has(index - 1) || GAP_AFTER_INDICES.has(index) ? String(year) : String(year).slice(-2);
}

export type ProjectionPoint = StaticFleetProjectionPoint | StaticFleetGroupProjectionPoint;

export interface FuelEuProjectionChartProps {
  /** Single-fleet input (company view): vessel tonnages to run projectStaticFleet on. Mutually
   *  exclusive with `groupPoints` — pass one or the other. */
  fleetInput?: { vlsfoTonnes: number; mgoTonnes: number; lngTonnes: number };
  /** Pre-computed group/company-aggregate points (from projectStaticFleetForCounterparties). */
  groupPoints?: StaticFleetGroupProjectionPoint[];
  /** Optional real per-ship-equivalent escalation series (from projectStaticFleet on the same
   *  fleet's combined tonnages) used only to read the Art. 23(2) multiplier at 2030 for the
   *  'panel' variant's ×N tag — `groupPoints` themselves don't carry a multiplier (see
   *  projectStaticFleetForCounterparties's doc note: it doesn't aggregate per-ship fields). */
  multiplierSeries?: StaticFleetProjectionPoint[];
  title?: string;
  width?: number;
  height?: number;
  /** 'full' (default): penalty area/line plus a secondary compliance-balance line on its own
   *  right-hand axis — used where the chart is the primary content (e.g. the group expansion
   *  panel). 'panel': the Directory side panel's simplified read — penalty only, two dashed
   *  round-number gridlines, one end-value label, a ×multiplier tag at 2030 — per the approved
   *  mockup. Both variants keep the same accessible role/aria-label/hidden data table (which
   *  always includes the compliance balance column, even in 'panel'). */
  variant?: 'full' | 'panel';
}

/**
 * Static-fleet compliance projection chart. No chart library — a small inline SVG. X-axis is
 * ordinal (evenly spaced) with an explicit visual gap marker where the calendar-year spacing is
 * uneven (2030→2035→2040).
 */
export function FuelEuProjectionChart({ fleetInput, groupPoints, multiplierSeries, title, width = 560, height = 220, variant = 'full' }: FuelEuProjectionChartProps) {
  const [assume2025NonCompliant, setAssume2025NonCompliant] = useState(true);

  const points: ProjectionPoint[] = useMemo(() => {
    if (groupPoints) return groupPoints;
    if (fleetInput) {
      return projectStaticFleet({ ...fleetInput, assume2025NonCompliant });
    }
    return [];
  }, [fleetInput, groupPoints, assume2025NonCompliant]);

  const isPanel = variant === 'panel';
  const margin = isPanel ? { top: 20, right: 14, bottom: 28, left: 14 } : { top: 18, right: 52, bottom: 34, left: 62 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const penalties = points.map(p => p.penaltyEur);
  const balances = points.map(p => p.complianceBalanceTco2e);
  const maxPenalty = Math.max(1, ...penalties);
  const minBalance = Math.min(0, ...balances);
  const maxBalance = Math.max(0, ...balances);
  // 'panel' scales to a round gridline top (e.g. €4.81bn → €5bn) so the two dashed gridlines read
  // as clean numbers, matching the approved mockup; 'full' keeps the exact data max.
  const scaleTop = isPanel ? niceCeil(maxPenalty) : maxPenalty;

  const xPositions = buildOrdinalPositions(points.length, [margin.left, margin.left + innerW]);
  const yPenaltyScale = buildLinearScale([0, scaleTop], [margin.top + innerH, margin.top]);
  const yBalanceScale = buildLinearScale([minBalance, maxBalance], [margin.top + innerH, margin.top]);

  const penaltyPoints = points.map((p, i) => ({ x: xPositions[i], y: yPenaltyScale(p.penaltyEur) }));
  const balancePoints = points.map((p, i) => ({ x: xPositions[i], y: yBalanceScale(p.complianceBalanceTco2e) }));

  const areaPath = buildAreaPath(penaltyPoints, margin.top + innerH);
  const linePath = buildLinePath(penaltyPoints);
  const balanceLinePath = buildLinePath(balancePoints);

  const first = points[0];
  const last = points[points.length - 1];
  const ariaLabel = first && last
    ? `FuelEU static-fleet projection from ${first.year}: penalty €${Math.round(first.penaltyEur).toLocaleString()}, compliance balance ${Math.round(first.complianceBalanceTco2e).toLocaleString()} tCO2e, to ${last.year}: penalty €${Math.round(last.penaltyEur).toLocaleString()}, compliance balance ${Math.round(last.complianceBalanceTco2e).toLocaleString()} tCO2e.`
    : 'FuelEU static-fleet projection: no data.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {title !== '' && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span className="eyebrow" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-text)' }}>
          {title || 'Static-Fleet Compliance Projection'}
        </span>
        {fleetInput && (
          <div className="seg" role="group" aria-label="2025 compliance assumption toggle">
            <button
              type="button"
              className={`seg-opt ${assume2025NonCompliant ? 'active' : ''}`}
              style={{ height: '24px', fontSize: '10px', padding: '0 8px' }}
              onClick={() => setAssume2025NonCompliant(true)}
              title="Treat 2025 as the ship's first non-compliant reporting period (2026 escalation multiplier starts at n=2, i.e. ×1.1 per Art. 23(2))"
            >
              2025 not settled (×1.1 from 2026)
            </button>
            <button
              type="button"
              className={`seg-opt ${!assume2025NonCompliant ? 'active' : ''}`}
              style={{ height: '24px', fontSize: '10px', padding: '0 8px' }}
              onClick={() => setAssume2025NonCompliant(false)}
              title="Treat 2025 as settled/compliant (2026 escalation multiplier starts at n=1, i.e. ×1.0)"
            >
              2025 settled
            </button>
          </div>
        )}
      </div>
      )}

      <svg
        role="img"
        aria-label={ariaLabel}
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={
          isPanel
            ? { display: 'block', width: '100%', aspectRatio: `${width} / ${height}`, minHeight: '200px', maxHeight: '300px' }
            : { display: 'block', maxWidth: `${width}px` }
        }
      >
        {isPanel ? (
          <>
            {/* Baseline + two round-number dashed gridlines (mid, top), labels at the left so they never collide with the end-value label */}
            <line x1={margin.left} y1={margin.top + innerH} x2={margin.left + innerW} y2={margin.top + innerH} stroke="var(--color-divider)" strokeWidth={1} />
            <line x1={margin.left} y1={yPenaltyScale(scaleTop / 2)} x2={margin.left + innerW} y2={yPenaltyScale(scaleTop / 2)} stroke="var(--color-divider)" strokeDasharray="2,4" />
            <line x1={margin.left} y1={yPenaltyScale(scaleTop)} x2={margin.left + innerW} y2={yPenaltyScale(scaleTop)} stroke="var(--color-divider)" strokeDasharray="2,4" />
            <text x={margin.left} y={yPenaltyScale(scaleTop / 2) - 3} textAnchor="start" fontSize="12" fill="var(--color-muted)">
              {formatCompactEur(scaleTop / 2)}
            </text>
            <text x={margin.left} y={yPenaltyScale(scaleTop) - 3} textAnchor="start" fontSize="12" fill="var(--color-muted)">
              {formatCompactEur(scaleTop)}
            </text>

            {/* Penalty area + line only — no secondary balance axis in the panel view */}
            <path d={areaPath} fill="var(--color-status-neg-bg, rgba(220,38,38,0.12))" stroke="none" />
            <path d={linePath} fill="none" stroke="var(--color-status-neg-text)" strokeWidth={2} strokeLinejoin="round" />

            {/* Single subtle dashed separator where the x-axis stops being consecutive years
             *  (2029→2030) — signals the non-linear axis without the busy double-diagonal glyphs
             *  the old design had at every gap. */}
            {points.length > 4 && (
              <line
                x1={(xPositions[3] + xPositions[4]) / 2}
                x2={(xPositions[3] + xPositions[4]) / 2}
                y1={margin.top}
                y2={margin.top + innerH}
                stroke="var(--color-divider)"
                strokeDasharray="2,3"
              />
            )}

            {points.map((p, i) => {
              const isLast = i === points.length - 1;
              const seriesMultiplier = multiplierSeries?.find(sp => sp.year === p.year)?.multiplier;
              const mult = 'multiplier' in p ? (p as StaticFleetProjectionPoint).multiplier : seriesMultiplier;
              const tooltip = `${p.year}: penalty €${Math.round(p.penaltyEur).toLocaleString()} · balance ${Math.round(p.complianceBalanceTco2e).toLocaleString()} tCO2e${mult !== undefined ? ` · Art. 23(2) multiplier ×${mult.toFixed(2)}` : ''}`;
              // Keep the end-value label at least 8px clear of the top gridline's label so the two
              // never collide when the last point sits close to the scale's top.
              const topGridlineLabelY = yPenaltyScale(scaleTop) - 3;
              const peakLabelY = Math.max(penaltyPoints[i].y - 8, topGridlineLabelY + 8);
              return (
                <g key={p.year}>
                  <title>{tooltip}</title>
                  <circle cx={xPositions[i]} cy={penaltyPoints[i].y} r={isLast ? 3.8 : 3.2} fill="var(--color-status-neg-text)" />
                  {isLast && (
                    <text x={xPositions[i] - 8} y={peakLabelY} textAnchor="end" fontSize="13" fontWeight={600} fill="var(--color-text)">
                      {formatCompactEur(p.penaltyEur)}
                    </text>
                  )}
                  {mult !== undefined && mult > 0 && p.year === 2030 && (
                    <text x={xPositions[i]} y={penaltyPoints[i].y - 10} textAnchor="middle" fontSize="12" fill="var(--color-muted)">
                      ×{mult.toFixed(1)}
                    </text>
                  )}
                  <text x={xPositions[i]} y={margin.top + innerH + 15} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--color-text)">
                    {yearTickLabel(p.year, i)}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <>
            {/* Axes */}
            <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerH} stroke="var(--color-divider)" strokeWidth={1} />
            <line x1={margin.left} y1={margin.top + innerH} x2={margin.left + innerW} y2={margin.top + innerH} stroke="var(--color-divider)" strokeWidth={1} />
            <line x1={margin.left + innerW} y1={margin.top} x2={margin.left + innerW} y2={margin.top + innerH} stroke="var(--color-divider)" strokeWidth={1} strokeDasharray="2,2" />

            {/* Axis labels (compact form so long values never overflow the SVG viewBox) */}
            <text x={margin.left - 6} y={margin.top + 4} textAnchor="end" fontSize="9" fill="var(--color-status-neg-text)" fontFamily={MONO_FONT}>
              {formatCompactEur(maxPenalty)}
            </text>
            <text x={margin.left - 6} y={margin.top + innerH} textAnchor="end" fontSize="9" fill="var(--color-muted)" fontFamily={MONO_FONT}>
              €0
            </text>
            <text x={margin.left + innerW + 6} y={margin.top + 4} textAnchor="start" fontSize="9" fill="var(--color-status-pos-text)" fontFamily={MONO_FONT}>
              {formatCompactTonnes(maxBalance)}
            </text>
            <text x={margin.left + innerW + 6} y={margin.top + innerH} textAnchor="start" fontSize="9" fill="var(--color-status-neg-text)" fontFamily={MONO_FONT}>
              {formatCompactTonnes(minBalance)}
            </text>
            <text x={-(margin.top + innerH / 2)} y={14} transform="rotate(-90)" textAnchor="middle" fontSize="9" fill="var(--color-status-neg-text)" fontFamily={MONO_FONT}>
              Penalty (€)
            </text>
            <text x={-(margin.top + innerH / 2)} y={width - 8} transform="rotate(-90)" textAnchor="middle" fontSize="9" fill="var(--color-status-pos-text, #059669)" fontFamily={MONO_FONT}>
              Compliance balance (tCO2e)
            </text>

            {/* Penalty area + line */}
            <path d={areaPath} fill="var(--color-status-neg-bg, rgba(220,38,38,0.12))" stroke="none" />
            <path d={linePath} fill="none" stroke="var(--color-status-neg-text)" strokeWidth={2} />

            {/* Compliance balance secondary line */}
            <path d={balanceLinePath} fill="none" stroke="var(--color-status-pos-text, #059669)" strokeWidth={1.5} strokeDasharray="4,2" />

            {/* Zero line for balance if it crosses */}
            {minBalance < 0 && maxBalance > 0 && (
              <line
                x1={margin.left}
                x2={margin.left + innerW}
                y1={yBalanceScale(0)}
                y2={yBalanceScale(0)}
                stroke="var(--color-divider)"
                strokeDasharray="1,3"
              />
            )}

            {/* Markers, gap glyphs, x tick labels */}
            {points.map((p, i) => {
              const n = 'consecutiveN' in p ? (p as StaticFleetProjectionPoint).consecutiveN : undefined;
              const mult = 'multiplier' in p ? (p as StaticFleetProjectionPoint).multiplier : undefined;
              const tooltip = `${p.year}: penalty €${Math.round(p.penaltyEur).toLocaleString()} · balance ${Math.round(p.complianceBalanceTco2e).toLocaleString()} tCO2e${mult !== undefined ? ` · Art. 23(2) multiplier ×${mult.toFixed(2)}` : ''}`;
              return (
                <g key={p.year}>
                  <title>{tooltip}</title>
                  <circle cx={xPositions[i]} cy={penaltyPoints[i].y} r={i === points.length - 1 ? 3.8 : 3.2} fill="var(--color-status-neg-text)" />
                  <circle cx={xPositions[i]} cy={balancePoints[i].y} r={2.6} fill="var(--color-status-pos-text, #059669)" />
                  {i === points.length - 1 && (
                    <text
                      x={xPositions[i] - 8}
                      y={penaltyPoints[i].y - 6}
                      textAnchor="end"
                      fontSize="11"
                      fontWeight={600}
                      fill="var(--color-text)"
                      fontFamily={MONO_FONT}
                    >
                      {formatCompactEur(p.penaltyEur)}
                    </text>
                  )}
                  {mult !== undefined && p.year === 2030 && (
                    <text x={xPositions[i]} y={penaltyPoints[i].y - 10} textAnchor="middle" fontSize="9.5" fill="var(--color-muted)" fontFamily={MONO_FONT}>
                      ×{mult.toFixed(1)}
                    </text>
                  )}
                  <text x={xPositions[i]} y={margin.top + innerH + 16} textAnchor="middle" fontSize="9.5" fontWeight={700} fill="var(--color-text)" fontFamily={MONO_FONT}>
                    {p.year}
                  </text>
                  {n !== undefined && (
                    <text x={xPositions[i]} y={margin.top + innerH + 27} textAnchor="middle" fontSize="8" fill="var(--color-muted)" fontFamily={MONO_FONT}>
                      n={n}
                    </text>
                  )}
                  {GAP_AFTER_INDICES.has(i) && i < points.length - 1 && (
                    <g transform={`translate(${(xPositions[i] + xPositions[i + 1]) / 2}, ${margin.top + innerH / 2})`}>
                      <line x1={-4} y1={-8} x2={4} y2={8} stroke="var(--color-muted)" strokeWidth={1.5} />
                      <line x1={-4} y1={8} x2={4} y2={24} stroke="var(--color-muted)" strokeWidth={1.5} />
                    </g>
                  )}
                </g>
              );
            })}
          </>
        )}
      </svg>

      {/* Visually-hidden accessible data table */}
      <table
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        <caption>Static-fleet projection: penalty and compliance balance by year</caption>
        <thead>
          <tr>
            <th>Year</th>
            <th>Penalty (EUR)</th>
            <th>Compliance balance (tCO2e)</th>
          </tr>
        </thead>
        <tbody>
          {points.map(p => (
            <tr key={p.year}>
              <td>{p.year}</td>
              <td>{Math.round(p.penaltyEur)}</td>
              <td>{Math.round(p.complianceBalanceTco2e)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="subttl" style={{ fontSize: '9.5px', lineHeight: 1.4 }}>
        Static fleet · EU MRV 2024 activity held constant · no Bio-LNG, no pooling · Art. 23(2) multiplier applies per ship — company/group view assumes uniform status.
      </div>
    </div>
  );
}
