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
