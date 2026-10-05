/**
 * Pan-European Biomethane Cross-Border Route Matrix — Domain Types
 * Audited Snapshot Freeze: 2026-10-04
 * Single Source of Truth for GO Book-and-Claim and PoS Mass-Balance Routes
 */

/**
 * Static audit timestamp identifying the research freeze date.
 */
export const ROUTE_AUDIT_ACCESSED = '2026-10-04' as const;

/**
 * 28 European sovereign countries audited in the 2026-10-04 cross-border matrix.
 */
export const AUDITED_COUNTRIES = [
  'AT', 'BE', 'BG', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV',
  'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
] as const;

export type AuditedCountryCode = typeof AUDITED_COUNTRIES[number];

/**
 * Institutional evidence tier for regulatory facts and trade corridors.
 * - OBSERVED: Verified actual transactions recorded on hub (e.g. AIB Jan 2024 - Aug 2026).
 * - PUBLISHED: Official registry cross-border table or bilateral acceptance agreement.
 * - RULE: Derived from statutory hub membership rules and treaty boundaries.
 */
export type EvidenceGrade = 'OBSERVED' | 'PUBLISHED' | 'RULE';
export type GoRouteGrade = EvidenceGrade;

/**
 * Citation tier for legal sources.
 */
export type SourceGrade = 'PRIMARY' | 'SECONDARY';

/**
 * Verifiable regulatory or institutional data citation.
 */
export interface RouteSource {
  claim: string;
  url: string;
  quote?: string;
  grade?: SourceGrade | string;
}

/**
 * Feasibility of electronic GO book-and-claim transfer between registries.
 * Note: 'OPEN' from the audit engine represents 'AWAITING_REGISTRY' in the UI and gate evaluation.
 */
export type GoRouteStatus = 'POSSIBLE' | 'NOT_POSSIBLE' | 'AWAITING_REGISTRY' | 'OPEN';

/**
 * Interconnection hub or transfer protocol.
 */
export type GoVia = 'AIB' | 'ERGAR' | 'BILATERAL' | 'NONE';
export type GoRouteVia = GoVia;

/**
 * Immutable record for an audited cross-border GO route.
 * Stored in GO_ROUTES and keyed by `${origin}_${dest}` (e.g. 'DK_DE').
 */
export interface GoRouteRecord {
  /** Origin country 2-letter ISO code */
  origin: AuditedCountryCode | string;
  /** Destination country 2-letter ISO code */
  destination: AuditedCountryCode | string;
  /** Feasibility status of the electronic transfer */
  status: GoRouteStatus;
  /** Transfer hub or mechanism (null or 'NONE' when no route exists) */
  via: GoVia | null;
  /** Provenance confidence grade */
  grade: EvidenceGrade;
  /** Concise explanation for desk traders */
  reason: string;
  /** Single statutory restriction or requirement, if conditional */
  condition?: string | null;
  /** Array form of conditions for domain API consistency */
  conditions?: string[];
  /** Ex-domain cancellation guidance if electronic transfer is blocked */
  workaround?: string | null;
  /** Active research open question identifier (e.g. 'Q-CH-1') */
  openQuestionId?: string | null;
  /** Full institutional citations supporting this route */
  sources: RouteSource[];
}

/**
 * Feasibility of grid mass-balance compliance delivery into a national quota.
 */
export type PosRouteStatus = 'POSSIBLE' | 'NOT_POSSIBLE' | 'OPEN';

/**
 * Foreign biomethane acceptance rule under destination national law.
 */
export type PosAcceptsForeign = 'YES' | 'NO' | 'GO_REQUIRED' | 'OPEN';

/**
 * Geographic scope of eligible production origins.
 */
export type PosOriginScope =
  | 'EU_EXCISE_TERRITORY'
  | 'DOMESTIC_ONLY'
  | 'EU_INTERCONNECTED'
  | 'ALL_INTERCONNECTED'
  | 'NONE'
  | 'AIB_CONNECTED'
  | 'AIB_OR_ERGAR'
  | 'GB_OR_INTERCONNECTED';

/**
 * Evaluation of a specific national compliance scheme for a country pair.
 */
export interface PosSchemeResult {
  schemeId: string;
  schemeName: string;
  legalBasis?: string;
  status: PosRouteStatus;
  conditions?: string | null;
  reason: string;
  openQuestionId?: string | null;
  sources: RouteSource[];
}

/**
 * Summary compliance status for a country pair (highest ranking scheme).
 */
export interface PosRouteSummary {
  status: PosRouteStatus;
  schemeId?: string | null;
  schemeName?: string | null;
  conditions?: string | null;
  reason: string;
}

/**
 * Immutable record for an audited cross-border PoS corridor.
 * Stored in POS_ROUTES and keyed by `${origin}_${dest}` (e.g. 'DK_CZ').
 */
export interface PosRouteRecord {
  /** Origin country 2-letter ISO code */
  origin: AuditedCountryCode | string;
  /** Destination country 2-letter ISO code */
  destination: AuditedCountryCode | string;
  /** Best feasible scheme summary */
  summary: PosRouteSummary;
  /** All evaluated destination schemes */
  schemes: PosSchemeResult[];
}

/**
 * Static registry profile for a national compliance scheme.
 * Stored in POS_SCHEMES and keyed by canonical schemeId (e.g. 'DE_THG').
 */
export interface PosSchemeRecord {
  id: string;
  name: string;
  country: AuditedCountryCode | string;
  legalBasis: string;
  acceptsForeign: PosAcceptsForeign;
  originScope?: PosOriginScope | string;
  conditions?: string;
  reason: string;
  sources: RouteSource[];
  openQuestionId?: string | null;
  goRequiredInRegistry?: AuditedCountryCode | string;
}

/**
 * Standard query result for getGoRoute(origin, dest).
 */
export interface GoRouteResult {
  status: GoRouteStatus;
  via: GoVia | null;
  grade: EvidenceGrade;
  reason: string;
  workaround?: string | null;
  conditions?: string[];
  sources?: RouteSource[];
  openQuestionId?: string | null;
}

/**
 * Standard query result for getPosRoute(origin, dest, schemeId?).
 */
export interface PosRouteResult {
  status: PosRouteStatus;
  schemes: PosSchemeResult[];
  summary?: PosRouteSummary;
}
