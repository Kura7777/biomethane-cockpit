import React, { useEffect, useRef, useState } from 'react';

/** Small pieces shared by the morning-brief sections: formatting, sizing, sorting, tooltips. */

const nf2 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** Price format: three decimals for sub-unit prices (€/kgCO₂e, £/RTFC), two otherwise. */
export function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return Math.abs(v) < 1 && v !== 0 ? nf3.format(v) : nf2.format(v);
}
export const fmt2 = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : nf2.format(v));
export const fmt1 = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : nf1.format(v));
export const fmt0 = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : nf0.format(v));
export const fmtSigned = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : '−'}${nf2.format(Math.abs(v))}`;

export function prefersMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    : false;
}

/** Width of an element, kept current with a ResizeObserver. */
export function useWidth<T extends HTMLElement>(fallback = 600): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width];
}

/** Counts a number up from zero once, on first show. The final frame is always the exact value. */
export function CountUp({ value, format }: { value: number | null; format: (v: number | null) => string }) {
  const [shown, setShown] = useState<number | null>(value);
  const ran = useRef(false);
  useEffect(() => {
    if (value === null || ran.current || !prefersMotion()) {
      setShown(value);
      return;
    }
    ran.current = true;
    const t0 = performance.now();
    const dur = 1100;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(k < 1 ? value * eased : value);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

/** A share of `max` as a CSS width, clamped to 0–100%. An unset value draws nothing. */
export function pctOf(v: number | null | undefined, max: number): string {
  if (v === null || v === undefined || !Number.isFinite(v) || max <= 0) return '0%';
  return `${Math.min(100, Math.max(0, (v / max) * 100))}%`;
}

/** A linear scale: domain → range. */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** "Nice" tick values across a domain. */
export function ticks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo || 1;
  const raw = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice = [1, 2, 5, 10].map(m => m * pow).find(s => span / s <= count);
  const step = nice === undefined ? pow * 10 : nice;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step / 1000; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

export type SortState<K extends string> = { key: K; dir: 1 | -1 };

export function sortRows<T, K extends string>(rows: T[], s: SortState<K>): T[] {
  const get = (r: T) => (r as Record<string, unknown>)[s.key];
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * s.dir;
    return String(x).localeCompare(String(y)) * s.dir;
  });
}

export function SortTh<K extends string>({
  label, k, sort, onSort, className = '', textFirst = false,
}: { label: string; k: K; sort: SortState<K>; onSort: (s: SortState<K>) => void; className?: string; textFirst?: boolean }) {
  const active = sort.key === k;
  return (
    <th className={className} aria-sort={active ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined}>
      <button type="button" onClick={() => onSort({ key: k, dir: active ? (sort.dir > 0 ? -1 : 1) : textFirst ? 1 : -1 })}>{label}</button>
    </th>
  );
}

export function Chips<V extends string>({ options, value, onChange, label }: { options: [V, string][]; value: V; onChange: (v: V) => void; label: string }) {
  return (
    <div className="bf-chips" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className="bf-chip" aria-pressed={v === value} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export interface TipState { x: number; y: number; lines: { text: string; color?: string }[] }

/** A tooltip positioned inside its relative parent, flipped to stay inside it. */
export function Tip({ tip, boxWidth }: { tip: TipState | null; boxWidth: number }) {
  if (!tip) return null;
  const left = tip.x + 270 > boxWidth ? Math.max(0, tip.x - 270) : tip.x + 12;
  return (
    <div className="bf-tip" style={{ left, top: tip.y + 12 }}>
      {tip.lines.map((l, i) => (
        <div key={i} className={i === 0 ? 'h' : undefined}>
          {l.color && <span className="bf-dot" style={{ background: l.color, marginRight: 6 }} />}
          {l.text}
        </div>
      ))}
    </div>
  );
}

export function pointIn(e: React.MouseEvent, el: Element | null): { x: number; y: number } {
  const r = el?.getBoundingClientRect();
  return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
}
