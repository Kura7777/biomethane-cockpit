import type { MarkEntry, MarkProvenance } from './types';

/**
 * The German THG bundle for manure + physical gas, as the broker quotes it.
 *
 * The broker run (18 Aug 2026) says its bids and offers are for CERTIFICATES ONLY: "Index gas
 * price/swap to be added on top". So a quote like 147 EUR/MWh is the certificate price, and the
 * realisable revenue is that certificate plus the gas index. It is stored as a mark per delivery
 * year (key DE_THG_BUNDLE_<year>) in EUR/MWh, written through applyMarks.ts like every other mark.
 */

/** Bundle quotes apply to CI at or below this (g CO2e/MJ); above it there is no broker row. */
export const DE_THG_BUNDLE_MAX_CI = -80;

export const DE_THG_BUNDLE_MARK_PREFIX = 'DE_THG_BUNDLE_';

export function isDeThgBundleMarkId(id: string): boolean {
  return id.startsWith(DE_THG_BUNDLE_MARK_PREFIX);
}

export function deThgBundleMarkId(year: number): string {
  return `${DE_THG_BUNDLE_MARK_PREFIX}${year}`;
}

/** "H226" is the second half of 2026, "H127" the first half of 2027. Anything else has no clear year. */
export function bundleYearFromVintage(vintage: string): number | null {
  const m = /^H[12](\d{2})$/i.exec(vintage.trim());
  return m ? 2000 + Number(m[1]) : null;
}

export interface DeThgBundleReference {
  year: number;
  /** Certificate-only bundle price the desk can sell at (the broker bid), EUR/MWh. Gas index comes on top. */
  certificateEurPerMwh: number;
  provenance: MarkProvenance | null;
  updatedAt: string | null;
}

/**
 * The bundle certificate price to sell at for a compliance year: the broker BID (the desk sells to
 * a buyer). With no year on the deal, the earliest delivery year quoted is used. No mark for the
 * year gives null: there is then no broker reference and nothing is substituted.
 */
export function selectDeThgBundleReference(
  marks: Record<string, MarkEntry> | undefined,
  complianceYear: number | null | undefined
): DeThgBundleReference | null {
  if (!marks) return null;
  const candidates: DeThgBundleReference[] = [];
  for (const [id, entry] of Object.entries(marks)) {
    if (!id.startsWith(DE_THG_BUNDLE_MARK_PREFIX)) continue;
    const year = Number(id.slice(DE_THG_BUNDLE_MARK_PREFIX.length));
    if (!Number.isFinite(year) || entry.bid === null || entry.bid === undefined) continue;
    candidates.push({
      year,
      certificateEurPerMwh: entry.bid,
      provenance: entry.provenance ?? null,
      updatedAt: entry.updatedAt ?? null,
    });
  }
  if (candidates.length === 0) return null;
  if (complianceYear === null || complianceYear === undefined) {
    return candidates.sort((a, b) => a.year - b.year)[0];
  }
  return candidates.find(c => c.year === complianceYear) ?? null;
}
