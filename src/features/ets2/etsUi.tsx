import React from 'react';
import { BiomethaneFit } from '../../domain/ets1/sites';

/** Outreach status, shared by the ETS1 and ETS2 lists (each keeps its own storage key). */
export type OutreachStatus = 'NOT_CONTACTED' | 'CONTACTED' | 'MEETING' | 'PIPELINE' | 'NOT_A_FIT';

export const STATUS_LABEL: Record<OutreachStatus, string> = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'Contacted',
  MEETING: 'Meeting held',
  PIPELINE: 'In pipeline',
  NOT_A_FIT: 'Not a fit',
};

export function readStatuses(key: string): Record<string, OutreachStatus> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, OutreachStatus>) : {};
  } catch {
    return {};
  }
}

export function writeStatuses(key: string, statuses: Record<string, OutreachStatus>): void {
  try {
    localStorage.setItem(key, JSON.stringify(statuses));
  } catch {
    // Storage unavailable: statuses last for this session only.
  }
}

export function StatusDot({ status }: { status: OutreachStatus }) {
  return <span className={`ets-status ${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}

export function StatusSelect(props: { value: OutreachStatus; onChange: (s: OutreachStatus) => void; label: string }) {
  return (
    <select className="ets-select" aria-label={props.label} value={props.value} onChange={e => props.onChange(e.target.value as OutreachStatus)}>
      {(Object.keys(STATUS_LABEL) as OutreachStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
    </select>
  );
}

const FIT_TEXT: Record<BiomethaneFit, string> = { HIGH: 'High fit', MEDIUM: 'Medium', LOW: 'Low fit' };

export function FitBadge({ fit }: { fit: BiomethaneFit }) {
  return <span className={`ets-fit ${fit.toLowerCase()}`}>{FIT_TEXT[fit]}</span>;
}

/** A value with a bar on a shared scale (share of the table's largest value). */
export function BarCell({ value, max, children }: { value: number; max: number; children: React.ReactNode }) {
  const pct = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="ets-barcell">
      <div className="ets-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      <span className="ets-cell-num">{children}</span>
    </div>
  );
}

export function Segmented<T extends string>(props: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ets-seg" role="group" aria-label={props.label}>
      {props.options.map(o => (
        <button key={o.id} type="button" className={props.value === o.id ? 'active' : ''} aria-pressed={props.value === o.id} onClick={() => props.onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type SortDir = 'asc' | 'desc';

/** A sortable column header for the grid tables. */
export function SortHeader<K extends string>(props: { id: K; label: string; sort: { key: K; dir: SortDir }; onSort: (k: K) => void; right?: boolean; title?: string }) {
  const active = props.sort.key === props.id;
  return (
    <button
      type="button"
      className={props.right ? 'ets-thead-sort' : undefined}
      title={props.title}
      aria-sort={active ? (props.sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      onClick={() => props.onSort(props.id)}
      style={{ color: active ? 'var(--color-text)' : undefined }}
    >
      {props.label}
      <span aria-hidden="true" style={{ opacity: active ? 1 : 0.35 }}>{active ? (props.sort.dir === 'desc' ? '↓' : '↑') : '↕'}</span>
    </button>
  );
}

const EUR_PER_EUR_M = 1_000_000;
const EUR_PER_EUR_K = 1_000;

/** €m with one decimal below 100, none above; €bn from 1,000m. */
export function eurM(v: number | null): string {
  if (v === null) return '—';
  const m = v / EUR_PER_EUR_M;
  if (Math.abs(m) >= 1000) return `€${(m / 1000).toLocaleString('en-GB', { maximumFractionDigits: 2 })}bn`;
  if (Math.abs(m) < 0.1 && m !== 0) return `€${Math.round(v / EUR_PER_EUR_K).toLocaleString('en-GB')}k`;
  return `€${m.toLocaleString('en-GB', { maximumFractionDigits: Math.abs(m) < 100 ? 1 : 0 })}m`;
}

export function eur(v: number | null, digits = 0): string {
  return v === null ? '—' : `€${v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Tonnes as kt / Mt for compact cells. */
export function tonnes(t: number): string {
  if (t >= 1_000_000) return `${(t / 1_000_000).toLocaleString('en-GB', { maximumFractionDigits: 2 })} Mt`;
  if (t >= 1_000) return `${(t / 1_000).toLocaleString('en-GB', { maximumFractionDigits: t >= 100_000 ? 0 : 1 })} kt`;
  return `${Math.round(t).toLocaleString('en-GB')} t`;
}

export function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke after the click has been handled, or some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function parseNumber(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
