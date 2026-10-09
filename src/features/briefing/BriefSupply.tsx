import React, { useState } from 'react';
import type { CountrySupply } from '../../domain/briefing/morningBrief';
import { Chips, Tip, type TipState, fmt0, linear, pointIn, prefersMotion, useWidth } from './briefUi';

type Metric = 'annualGWh' | 'plants' | 'capacityNm3h';
const LABEL: Record<Metric, string> = { annualGWh: 'Annual output (GWh)', plants: 'Plant count', capacityNm3h: 'Capacity (Nm³/h)' };

export function BriefSupply({ rows }: { rows: CountrySupply[] | null }) {
  const [metric, setMetric] = useState<Metric>('annualGWh');
  const [boxRef, width] = useWidth<HTMLDivElement>(640);
  const [tip, setTip] = useState<TipState | null>(null);
  const data = rows ? [...rows].sort((a, b) => b[metric] - a[metric]).slice(0, 15) : [];
  const rowH = 26;
  const m = { t: 2, r: 76, b: 4, l: 120 };
  const H = m.t + m.b + data.length * rowH;
  const x = linear(0, Math.max(1, ...data.map(d => d[metric])), m.l, width - m.r);
  const motion = prefersMotion();

  return (
    <section className="bf-sec" id="supply">
      <h2>Supply base</h2>
      <p className="lede">Biomethane plants in the registry, top 15 countries.</p>
      <div className="bf-card bf-rise">
        <div className="bf-row"><Chips<Metric> label="Measure" value={metric} onChange={setMetric} options={(Object.keys(LABEL) as Metric[]).map(k => [k, LABEL[k]])} /></div>
        <div className="bf-chart" ref={boxRef} style={{ minHeight: rows ? H : 120 }} onMouseLeave={() => setTip(null)}>
          {!rows ? <div className="bf-empty">Loading the plant registry…</div> : (
            <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`${LABEL[metric]} by country`}>
              {data.map((d, i) => {
                const y = m.t + i * rowH + 4;
                const h = rowH - 8;
                return (
                  <g key={`${metric}-${d.country}`}>
                    <text className="lab" x={m.l - 8} y={y + h / 2} dy="0.35em" textAnchor="end">{d.countryName}</text>
                    <rect className={`bf-bar ${motion ? 'bf-grow' : ''}`} style={motion ? { animationDelay: `${i * 30}ms` } : undefined}
                      x={m.l} y={y} width={Math.max(1, x(d[metric]) - m.l)} height={h} rx={4}
                      fill="var(--bf-c5)" fillOpacity={i < 3 ? 1 : 0.6}
                      onMouseMove={e => setTip({ ...pointIn(e, boxRef.current), lines: [
                        { text: d.countryName },
                        { text: `${fmt0(d.plants)} plants · ${fmt0(d.verified)} verified`, color: 'var(--bf-c5)' },
                        { text: `${fmt0(d.annualGWh)} GWh/yr · ${fmt0(d.capacityNm3h)} Nm³/h` },
                      ] })} />
                    <text className="lab" x={x(d[metric]) + 6} y={y + h / 2} dy="0.35em">{fmt0(d[metric])}</text>
                  </g>
                );
              })}
            </svg>
          )}
          <Tip tip={tip} boxWidth={width} />
        </div>
      </div>
    </section>
  );
}
