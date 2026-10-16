/**
 * CSV for spreadsheets. Text cells that start with a formula character are neutralised with a
 * leading apostrophe so Excel does not run them (a real name such as "-Josef Straub Söhne GmbH" therefore
 * shows its apostrophe: the OWASP formula-injection guard is deliberate); numbers stay numbers. The file starts with a
 * UTF-8 byte-order mark so Excel reads accented and Greek names correctly.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export type CsvValue = string | number | null | undefined;

export function csvCell(v: CsvValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  const s = FORMULA_START.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_BOM = '﻿';

export function buildCsv(header: string[], rows: CsvValue[][]): string {
  return CSV_BOM + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n');
}

/**
 * Saves CSV text as a file via a Blob (never a data: URI: encodeURI leaves '#' unescaped and
 * truncates the file at the first one). A BOM is added when missing. No-op without a DOM.
 */
export function downloadCsvFile(filename: string, csvText: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const text = csvText.startsWith(CSV_BOM) ? csvText : CSV_BOM + csvText;
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after the click has been handled, or some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
