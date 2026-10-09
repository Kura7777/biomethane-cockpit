import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BriefLadderRow } from '../../domain/briefing/morningBrief';
import type { Consignment } from '../../domain/consignment/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { Chips, pctOf, Tip, type TipState, fmt1, fmt2, linear, pointIn, prefersMotion, ticks, useWidth } from './briefUi';

const VERDICT_CLASS: Record<string, string> = { ELIGIBLE: 'ok', CONDITIONAL: 'ok', UNRESOLVED: 'warn', HARD_BLOCK: 'neg', UNKNOWN: 'neg' };
const verdictText = (v: string) => v.replace(/_/g, ' ').toLowerCase();

export function BriefLadder({
  consignments, consignmentId, onConsignment, rows,
}: {
  consignments: Consignment[];
  consignmentId: string;
  onConsignment: (id: string) => void;
  rows: BriefLadderRow[];
}) {
  const navigate = useNavigate();
  const [showBlocked, setShowBlocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const [boxRef, width] = useWidth<HTMLDivElement>(640);
  const consignment = consignments.find(c => c.id === consignmentId) ?? consignments[0];

  const data = useMemo(
    () => rows.filter(r => showBlocked || r.rank !== null)
      .sort((a, b) => Number(a.rank === null) - Number(b.rank === null) || b.netNetback - a.netNetback),
    [rows, showBlocked],
  );
  const sel = data.find(r => r.marketId === picked) ?? data[0] ?? null;

  const rowH = 28;
  const labelW = Math.min(width / 2.4, 190);
  const m = { t: 4, r: 74, b: 22, l: labelW };
  const H = m.t + m.b + data.length * rowH;
  const lo = Math.min(0, ...data.map(d => d.netNetback));
  const hi = Math.max(1, ...data.map(d => d.netNetback));
  const tk = ticks(lo, hi, width < 480 ? 3 : 5);
  const x = linear(Math.min(lo, tk[0] ?? lo), Math.max(hi, tk[tk.length - 1] ?? hi), m.l, width - m.r);
  const barH = rowH - 10;
  const motion = prefersMotion();

  const parts: [string, keyof BriefLadderRow, string][] = [
    ['Certificate value', 'certificateValueEurPerMWh', 'var(--bf-c1)'],
    ['Molecule (gas index)', 'moleculeValue', 'var(--bf-c3)'],
    ['Desk costs', 'totalCosts', 'var(--bf-c4)'],
    ['Desk margin', 'deskMarginEurPerMWh', 'var(--bf-c2)'],
    ['Producer payable', 'producerPayable', 'var(--bf-c5)'],
  ];
  const partMax = sel ? Math.max(1, ...parts.map(([, k]) => { const v = sel[k] as number | null; return v === null ? 0 : Math.abs(v); })) : 1;

  return (
    <section className="bf-sec" id="netback">
      <h2>Where is it worth most?</h2>
      <p className="lede">Each consignment on your desk priced into every active market with the eligibility gates and netback engine. Click a bar for its value stack.</p>
      <div className="bf-row">
        <Chips label="Consignment" value={consignment?.id ?? ''} onChange={id => { setPicked(null); onConsignment(id); }}
          options={consignments.map(c => [c.id, c.name] as [string, string])} />
      </div>
      <div className="bf-split">
        <div className="bf-card bf-rise">
          <h3>Netback ladder · {data.filter(d => d.rank !== null).length} tradeable of {rows.length}</h3>
          <p className="note">
            €/MWh net to the desk.{' '}
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={showBlocked} onChange={e => setShowBlocked(e.target.checked)} /> show blocked markets (theoretical)
            </label>
          </p>
          <div className="bf-chart" ref={boxRef} style={{ minHeight: H }} onMouseLeave={() => setTip(null)}>
            {data.length === 0 ? (
              <div className="bf-empty">No market has a netback for this consignment — check its marks on the Pricing desk.</div>
            ) : (
              <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label="Net netback by market">
                {tk.map(t => (
                  <g key={t}>
                    <line className="grid" x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} />
                    <text x={x(t)} y={H - 6} textAnchor="middle">{t}</text>
                  </g>
                ))}
                {data.map((d, i) => {
                  const y = m.t + i * rowH + (rowH - barH) / 2;
                  const x0 = x(Math.min(0, d.netNetback));
                  const w = Math.max(1, Math.abs(x(d.netNetback) - x(0)));
                  const isSel = sel?.marketId === d.marketId;
                  const blocked = d.rank === null;
                  return (
                    <g key={d.marketId}>
                      <text className="lab" x={m.l - 8} y={y + barH / 2} dy="0.35em" textAnchor="end" opacity={blocked ? 0.55 : 1}>
                        {d.marketName.length > 26 ? d.marketName.slice(0, 25) + '…' : d.marketName}
                      </text>
                      <rect
                        className={`bf-bar ${motion ? 'bf-grow' : ''}`}
                        style={motion ? { animationDelay: `${i * 35}ms` } : undefined}
                        x={x0} y={y} width={w} height={barH} rx={4}
                        fill={blocked ? 'var(--bf-muted)' : 'var(--bf-c1)'}
                        fillOpacity={isSel ? 1 : blocked ? 0.7 : 0.6}
                        stroke={isSel ? 'var(--color-text)' : 'none'}
                        onClick={() => setPicked(d.marketId)}
                        onMouseMove={e => setTip({ ...pointIn(e, boxRef.current), lines: [
                          { text: d.marketName },
                          { text: `Net ${fmt2(d.netNetback)} €/MWh`, color: blocked ? 'var(--bf-muted)' : 'var(--bf-c1)' },
                          { text: `${verdictText(d.verdict)}${d.rank ? ` · rank ${d.rank}` : ''}${d.heldAtBundle ? ' · held at bundle price' : ''}` },
                        ] })}
                      />
                      <text className="lab" x={x(Math.max(0, d.netNetback)) + 6} y={y + barH / 2} dy="0.35em" fontWeight={isSel ? 600 : 400}>
                        {blocked ? '🔒 ' : ''}{fmt2(d.netNetback)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
            <Tip tip={tip} boxWidth={width} />
          </div>
        </div>

        <div className="bf-card bf-rise bf-detail" aria-live="polite">
          <span className="muted cap">Value stack</span>
          {sel ? (
            <>
              <h3>{sel.marketName}</h3>
              <div><span className="big">{fmt2(sel.netNetback)}</span> <span className="muted">€/MWh net</span></div>
              <div className="bf-chips">
                <span className={`bf-pill ${VERDICT_CLASS[sel.verdict] ?? ''}`}>{verdictText(sel.verdict)}</span>
                {sel.rank && <span className="bf-pill">rank {sel.rank}</span>}
                {sel.marginPercent !== null && <span className="bf-pill">margin {fmt1(sel.marginPercent)}%</span>}
                {sel.heldAtBundle && <span className="bf-pill warn">held at bundle price</span>}
                {sel.isModelled && <span className="bf-pill warn">modelled</span>}
                {sel.blockingGate && <span className="bf-pill neg">blocked at {sel.blockingGate.toLowerCase().replace(/_/g, ' ')}</span>}
              </div>
              <div className="bf-stack">
                {parts.map(([label, k, colour]) => {
                  const v = sel[k] as number | null;
                  return (
                    <React.Fragment key={label}>
                      <span className="muted">{label}</span>
                      <div className="track"><div className="fill" style={{ background: colour, width: pctOf(v === null ? 0 : Math.abs(v), partMax) }} /></div>
                      <span className="num">{fmt2(v)}</span>
                    </React.Fragment>
                  );
                })}
              </div>
              {sel.missingInputs.length > 0 && <div className="cap warn">Missing inputs: {sel.missingInputs.join(', ')}</div>}
              {sel.summary && <div className="bf-summary">{sel.summary}</div>}
              {consignment && sel.rank !== null && (
                <button type="button" className="bf-btn" onClick={() => navigate(buildDealUrl({
                  marketId: sel.marketId,
                  originCountry: consignment.originCountry,
                  feedstock: consignment.feedstock,
                  ci: consignment.carbonIntensity,
                  volume: consignment.volumeMWh ?? undefined,
                  scheme: consignment.certificationScheme,
                  coc: consignment.chainOfCustody,
                }))}>Structure this deal →</button>
              )}
            </>
          ) : (
            <div className="bf-empty">Nothing to show.</div>
          )}
        </div>
      </div>
    </section>
  );
}
