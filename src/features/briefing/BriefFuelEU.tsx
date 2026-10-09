import React, { useState } from 'react';
import type { FueleuPoint } from '../../domain/briefing/morningBrief';
import { Tip, type TipState, fmt2, linear, pointIn, prefersMotion, ticks, useWidth } from './briefUi';

const SERIES: { key: FueleuPoint['series']; colour: string; short: string }[] = [
  { key: 'OFFER', colour: 'var(--bf-c2)', short: 'OPX offers' },
  { key: 'TRADE', colour: 'var(--bf-c1)', short: 'Traded' },
];
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });

export function BriefFuelEU({ points }: { points: FueleuPoint[] }) {
  const [boxRef, width] = useWidth<HTMLDivElement>(520);
  const [tip, setTip] = useState<TipState | null>(null);
  if (points.length === 0) return <div className="bf-empty">No FuelEU prints recorded.</div>;

  const H = 250;
  const m = { t: 14, r: 118, b: 26, l: 40 };
  const t0 = points[0].date.getTime();
  const t1 = points[points.length - 1].date.getTime();
  const vmax = Math.max(...points.map(p => p.value));
  const yt = ticks(0, vmax, 5);
  const x = linear(t0, t1, m.l, width - m.r);
  const y = linear(0, Math.max(vmax, yt[yt.length - 1] ?? vmax), H - m.b, m.t);
  const months: Date[] = [];
  for (let d = new Date(Date.UTC(points[0].date.getUTCFullYear(), points[0].date.getUTCMonth(), 1)); d.getTime() <= t1; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) months.push(d);
  const motion = prefersMotion();

  const onMove = (e: React.MouseEvent) => {
    const p = pointIn(e, boxRef.current);
    let best: FueleuPoint | null = null;
    let bestD = Infinity;
    for (const pt of points) {
      const dd = Math.hypot(x(pt.date.getTime()) - p.x, y(pt.value) - p.y);
      if (dd < bestD) { bestD = dd; best = pt; }
    }
    if (!best) return;
    const s = SERIES.find(s => s.key === best!.series)!;
    setTip({ ...p, lines: [{ text: best.period }, { text: `${best.label}: ${fmt2(best.value)} €/tCO₂e`, color: s.colour },
      ...(best.close !== null ? [{ text: `close ${fmt2(best.close)}` }] : []), ...(best.note ? [{ text: best.note }] : [])] });
  };

  return (
    <div className="bf-chart" ref={boxRef} style={{ minHeight: H }} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
      <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label="FuelEU pool price history">
        {yt.map(t => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} />
            <text x={m.l - 6} y={y(t)} dy="0.35em" textAnchor="end">{t}</text>
          </g>
        ))}
        <line className="axis" x1={m.l} x2={width - m.r} y1={H - m.b} y2={H - m.b} />
        {months.filter((_, i) => width >= 420 || i % 2 === 0).map(d => (
          <text key={d.toISOString()} x={x(d.getTime())} y={H - 8} textAnchor="middle">{MONTH.format(d)}</text>
        ))}
        {SERIES.map((s, si) => {
          const pts = points.filter(p => p.series === s.key);
          if (!pts.length) return null;
          const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date.getTime())},${y(p.value)}`).join('');
          const last = pts[pts.length - 1];
          return (
            <g key={s.key}>
              <path d={path} pathLength={1} className={motion ? 'bf-draw' : undefined} fill="none" stroke={s.colour} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {pts.map(p => <circle key={p.period} cx={x(p.date.getTime())} cy={y(p.value)} r={3.5} fill="var(--color-panel)" stroke={s.colour} strokeWidth={2} />)}
              <text className="lab" x={x(last.date.getTime()) + 8} y={y(last.value) + (si ? 12 : -4)} dy="0.35em" style={{ fill: s.colour }}>
                {s.short} {fmt2(last.value)}
              </text>
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} boxWidth={width} />
    </div>
  );
}
