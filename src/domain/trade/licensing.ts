import { TradeAssessment } from './types';
import { MarkProvenance } from '../markets/types';

/**
 * Result of scanning a TradeAssessment for Price Reporting Agency (PRA) data.
 */
export interface PraLicenceCheckResult {
  hasPra: boolean;
  sources: string[]; // Distinct source names for modal/warning text
}

function checkProvenance(
  prov: MarkProvenance | null | undefined,
  sourcesSet: Set<string>
): void {
  if (prov && prov.sourceType === 'PRICE_REPORTING') {
    const name = prov.sourceName?.trim() || 'PRA Assessment';
    sourcesSet.add(name);
  }
}

/**
 * Scans all price inputs feeding a TradeAssessment to detect whether any component
 * originates from a Price Reporting Agency (PRA) such as Platts, Argus, or QC Intel.
 * 
 * PRA assessment subscriptions are typically licensed per named-user with strict contractual
 * restrictions prohibiting redistribution of assessed price levels to external third parties.
 */
export function assessmentContainsPraData(a: TradeAssessment): PraLicenceCheckResult {
  const sourcesSet = new Set<string>();

  // 1. Certificate value provenance
  checkProvenance(a.netback?.certificateValue?.provenance, sourcesSet);

  // 2. Target market mark entry provenance
  if (a.marks?.marks && a.targetMarketId) {
    checkProvenance(a.marks.marks[a.targetMarketId]?.provenance, sourcesSet);
  }

  // 3. Natural gas molecule index (TTF) provenance
  checkProvenance(a.marks?.gasIndex?.provenance, sourcesSet);

  // 4. Foreign exchange (FX) rate provenance
  checkProvenance(a.marks?.fx?.provenance, sourcesSet);

  // 5. Uncertainty branches (e.g. German THG sensitivity)
  if (a.netback?.uncertaintyBranches) {
    for (const b of a.netback.uncertaintyBranches) {
      checkProvenance(b.certificateValue?.provenance, sourcesSet);
    }
  }

  const sources = Array.from(sourcesSet);

  return {
    hasPra: sources.length > 0,
    sources,
  };
}

/**
 * Scans all price inputs feeding a SourcingSearchResult to detect whether any component
 * originates from a Price Reporting Agency (PRA).
 */
export function searchResultContainsPraData(
  markets: string[],
  marks: { marks?: Record<string, { provenance?: MarkProvenance | null }>; gasIndex?: { provenance?: MarkProvenance | null }; fx?: { provenance?: MarkProvenance | null } }
): PraLicenceCheckResult {
  const sourcesSet = new Set<string>();

  checkProvenance(marks.gasIndex?.provenance, sourcesSet);
  checkProvenance(marks.fx?.provenance, sourcesSet);

  if (marks.marks) {
    for (const mId of markets) {
      checkProvenance(marks.marks[mId]?.provenance, sourcesSet);
    }
  }

  const sources = Array.from(sourcesSet);
  return {
    hasPra: sources.length > 0,
    sources,
  };
}

