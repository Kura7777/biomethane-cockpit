/**
 * Pan-European Biomethane Cross-Border Route API
 * Audited Snapshot Freeze: 2026-10-04
 *
 * Single source of truth for:
 * - getGoRoute: Electronic GO book-and-claim transfer feasibility
 * - getPosRoute: Physical mass-balance compliance quota delivery
 */

import {
  GO_ROUTES,
  POS_ROUTES,
  POS_SCHEMES,
  ROUTE_AUDIT_ACCESSED
} from './routeMatrix.generated';

import {
  AUDITED_COUNTRIES,
  type GoRouteRecord,
  type GoRouteResult,
  type GoRouteStatus,
  type PosRouteRecord,
  type PosRouteResult,
  type PosRouteStatus,
  type PosSchemeRecord,
  type PosSchemeResult
} from './types';

// Re-export all types and generated artifacts
export * from './types';
export { GO_ROUTES, POS_ROUTES, POS_SCHEMES, ROUTE_AUDIT_ACCESSED };

/**
 * Normalizes country ISO code to uppercase and resolves aliases (e.g. UK -> GB).
 */
export function normalizeCountryCode(country: string | undefined | null): string {
  if (!country) return '';
  const trimmed = country.trim().toUpperCase();
  if (trimmed === 'UK') return 'GB';
  return trimmed;
}

/**
 * Normalizes scheme identifiers and resolves aliases (e.g. UK_RTFO -> GB_RTFO).
 */
export function normalizeSchemeId(schemeId: string | undefined | null): string {
  if (!schemeId) return '';
  const trimmed = schemeId.trim().toUpperCase();
  if (trimmed === 'UK_RTFO') return 'GB_RTFO';
  return trimmed;
}

/**
 * Queries the feasibility of electronic GO book-and-claim transfer between two registries.
 *
 * @param origin - Origin country 2-letter ISO code (e.g. 'DK')
 * @param dest - Destination country 2-letter ISO code (e.g. 'DE')
 * @returns GoRouteResult with status, via, evidence grade, statutory reasons, workarounds, conditions, and sources
 */
export function getGoRoute(origin: string, dest: string): GoRouteResult {
  const orig = normalizeCountryCode(origin);
  const dst = normalizeCountryCode(dest);

  // Domestic handling (origin === dest)
  if (orig && dst && orig === dst) {
    return {
      status: 'POSSIBLE',
      via: 'BILATERAL',
      grade: 'RULE',
      reason: `Domestic transfer: Guarantees of Origin remain within the national registry of ${orig}.`,
      conditions: [],
      sources: [],
      workaround: null,
      openQuestionId: null,
    };
  }

  // Cross-border lookup
  const key = `${orig}_${dst}`;
  const record: GoRouteRecord | undefined = GO_ROUTES[key];

  if (record) {
    const rawStatus = record.status;
    const status: GoRouteStatus = rawStatus === 'OPEN' ? 'AWAITING_REGISTRY' : rawStatus;

    return {
      status,
      via: record.via ?? 'NONE',
      grade: record.grade ?? 'RULE',
      reason: record.reason,
      workaround: record.workaround ?? null,
      conditions: record.conditions ?? (record.condition ? [record.condition] : []),
      sources: record.sources ?? [],
      openQuestionId: record.openQuestionId ?? null,
    };
  }

  // Unaudited or unknown country pair fallback
  return {
    status: 'NOT_POSSIBLE',
    via: 'NONE',
    grade: 'RULE',
    reason: `No audited registry data for corridor ${orig || 'UNKNOWN'}>${dst || 'UNKNOWN'}.`,
    workaround: null,
    conditions: [],
    sources: [],
    openQuestionId: null,
  };
}

/**
 * Queries the feasibility of gas-grid mass-balance compliance delivery into a destination national scheme.
 *
 * @param origin - Origin country 2-letter ISO code (e.g. 'DK')
 * @param dest - Destination country 2-letter ISO code (e.g. 'CZ')
 * @param schemeId - Optional specific scheme identifier (e.g. 'CZ_TRANSPORT', 'DE_THG')
 * @returns PosRouteResult with overall status, evaluated schemes array, and summary
 */
export function getPosRoute(origin: string, dest: string, schemeId?: string): PosRouteResult {
  const orig = normalizeCountryCode(origin);
  const dst = normalizeCountryCode(dest);
  const targetSchemeId = schemeId ? normalizeSchemeId(schemeId) : undefined;

  // 1. Domestic handling (origin === dest)
  if (orig && dst && orig === dst) {
    return evaluateDomesticPosRoute(orig, targetSchemeId);
  }

  // 2. Cross-border handling (origin !== dest)
  const key = `${orig}_${dst}`;
  const record: PosRouteRecord | undefined = POS_ROUTES[key];

  if (!record) {
    return {
      status: 'NOT_POSSIBLE',
      schemes: [],
      summary: {
        status: 'NOT_POSSIBLE',
        schemeId: schemeId ?? null,
        reason: `No audited PoS mass-balance corridor data for ${orig || 'UNKNOWN'}>${dst || 'UNKNOWN'}.`,
      },
    };
  }

  // Specific scheme evaluation
  if (targetSchemeId) {
    const matchedScheme = record.schemes.find(
      s => normalizeSchemeId(s.schemeId) === targetSchemeId
    );

    if (matchedScheme) {
      return {
        status: matchedScheme.status,
        schemes: [matchedScheme],
        summary: {
          status: matchedScheme.status,
          schemeId: matchedScheme.schemeId,
          schemeName: matchedScheme.schemeName,
          conditions: matchedScheme.conditions ?? null,
          reason: matchedScheme.reason,
        },
      };
    }

    return {
      status: 'NOT_POSSIBLE',
      schemes: [],
      summary: {
        status: 'NOT_POSSIBLE',
        schemeId,
        reason: `Scheme ${schemeId} is not applicable for destination ${dst}.`,
      },
    };
  }

  // Default: all destination schemes and corridor summary
  return {
    status: record.summary.status,
    schemes: record.schemes,
    summary: record.summary,
  };
}

/**
 * Helper to evaluate domestic PoS routes when origin === dest.
 */
function evaluateDomesticPosRoute(country: string, targetSchemeId?: string): PosRouteResult {
  const countrySchemes: PosSchemeRecord[] = Object.values(POS_SCHEMES).filter(
    s => normalizeCountryCode(s.country) === country
  );

  if (countrySchemes.length === 0) {
    return {
      status: 'OPEN',
      schemes: [],
      summary: {
        status: 'OPEN',
        schemeId: targetSchemeId ?? null,
        reason: `No national compliance scheme documented for ${country}.`,
      },
    };
  }

  const evaluatedSchemes: PosSchemeResult[] = countrySchemes.map(scheme => {
    if (scheme.originScope === 'NONE') {
      return {
        schemeId: scheme.id,
        schemeName: scheme.name,
        legalBasis: scheme.legalBasis,
        status: 'NOT_POSSIBLE',
        conditions: scheme.conditions ?? null,
        reason: scheme.reason,
        openQuestionId: scheme.openQuestionId ?? null,
        sources: scheme.sources ?? [],
      };
    }

    let reason = `Domestic injection qualifies for ${scheme.name} in ${country}.`;
    if (scheme.id === 'NL_ERE') {
      reason = 'Domestic injection: Green gas GvOs relating to biogas produced in the Netherlands are eligible for inboekingen under Regeling energie vervoer art. 7.';
    } else if (scheme.id === 'IT_CIC') {
      reason = 'Domestic injection: Biomethane injected into the Italian gas grid is eligible for CIC under DM 2 marzo 2018 art. 5(1).';
    } else if (scheme.id === 'DE_THG') {
      reason = 'Domestic injection: Biomethane injected into the German gas grid qualifies for THG-Quote under BImSchG §37b.';
    }

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      legalBasis: scheme.legalBasis,
      status: 'POSSIBLE',
      conditions: scheme.conditions ?? null,
      reason,
      openQuestionId: null,
      sources: scheme.sources ?? [],
    };
  });

  if (targetSchemeId) {
    const matched = evaluatedSchemes.find(
      s => normalizeSchemeId(s.schemeId) === targetSchemeId
    );

    if (matched) {
      return {
        status: matched.status,
        schemes: [matched],
        summary: {
          status: matched.status,
          schemeId: matched.schemeId,
          schemeName: matched.schemeName,
          conditions: matched.conditions,
          reason: matched.reason,
        },
      };
    }

    return {
      status: 'NOT_POSSIBLE',
      schemes: [],
      summary: {
        status: 'NOT_POSSIBLE',
        schemeId: targetSchemeId,
        reason: `Scheme ${targetSchemeId} is not applicable for ${country}.`,
      },
    };
  }

  const rank = (st: PosRouteStatus) => (st === 'POSSIBLE' ? 3 : st === 'OPEN' ? 2 : 1);
  let best = evaluatedSchemes[0];
  for (const s of evaluatedSchemes) {
    if (rank(s.status) > rank(best.status)) {
      best = s;
    }
  }

  return {
    status: best.status,
    schemes: evaluatedSchemes,
    summary: {
      status: best.status,
      schemeId: best.schemeId,
      schemeName: best.schemeName,
      conditions: best.conditions,
      reason: best.reason,
    },
  };
}

/**
 * Returns all GO routes from a specified origin to a list of target countries.
 */
export function getAllGoRoutesFrom(
  origin: string,
  targets: string[] = AUDITED_COUNTRIES as unknown as string[]
): GoRouteResult[] {
  const orig = normalizeCountryCode(origin);
  return targets
    .map(t => normalizeCountryCode(t))
    .filter(t => t !== orig)
    .map(t => getGoRoute(orig, t));
}

/**
 * Returns all PoS compliance routes from a specified origin to a list of target countries.
 */
export function getAllPosRoutesFrom(
  origin: string,
  targets: string[] = AUDITED_COUNTRIES as unknown as string[]
): PosRouteResult[] {
  const orig = normalizeCountryCode(origin);
  return targets
    .map(t => normalizeCountryCode(t))
    .filter(t => t !== orig)
    .map(t => getPosRoute(orig, t));
}
