/**
 * The one money formatter for company figures (annual €). ≥ €1m as €X.Xm (whole millions from €10m),
 * ≥ €1k as €Xk, anything smaller as whole euros. Null is a dash; it never prints "€-" or "€14510k".
 */
export function formatEur(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  // 999,500 rounds to "1,000k", so promote it to millions instead.
  if (a >= 1_000_000 || Math.round(a / 1_000) >= 1_000) {
    const m = a / 1_000_000;
    const tenths = Math.round(m * 10) / 10;
    const text = tenths >= 10
      ? Math.round(m).toLocaleString('en-GB')
      : tenths.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${sign}€${text}m`;
  }
  if (a >= 1_000) return `${sign}€${Math.round(a / 1_000).toLocaleString('en-GB')}k`;
  return `${sign}€${Math.round(a).toLocaleString('en-GB')}`;
}
