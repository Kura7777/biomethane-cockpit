import { CertificationScheme, ChainOfCustody } from '../consignment/types';

/**
 * The deal-parameter contract between screens.
 *
 * Every screen that hands a deal to the Trade Builder — the broker run, scanner,
 * plants registry, sourcing desk, quick-deal drawer, dossier library and command
 * palette — emits its link through `buildDealUrl`, and the builder reads it back
 * through `parseDealParams`. Neither side hand-rolls a query string.
 *
 * This exists because they used to. Nine call sites each built their own, and the
 * two candidate destinations read two different vocabularies, so `scheme`, `coc`
 * and `deliveryPeriod` were emitted by three callers and understood by none. A
 * parameter silently vanishing between two screens is invisible in review and
 * invisible to a domain test suite; the only defence is a single shared contract.
 */

/** The route the builder is mounted at. Producers must not hardcode it. */
export const DEAL_ROUTE = '/trade';

export interface DealParams {
  marketId: string;
  originCountry: string;
  feedstock: string;
  ci: number;
  volume: number;
  scheme?: CertificationScheme;
  coc?: ChainOfCustody;
  counterparty?: string;
  deliveryPeriod?: string;
  plantId?: string;
  plantName?: string;
  plantCapacityNm3h?: number;
  plantAnnualGWh?: number;
  legalEntityName?: string;
  networkOperator?: string;
  contactEmail?: string;
  contactPhone?: string;
}

/** Canonical key -> spellings accepted on the way in, newest first. */
const ALIASES: Record<keyof DealParams, string[]> = {
  marketId: ['marketId', 'market'],
  originCountry: ['originCountry', 'origin'],
  feedstock: ['feedstock'],
  ci: ['ci'],
  volume: ['volume'],
  scheme: ['scheme'],
  coc: ['coc'],
  counterparty: ['counterparty'],
  deliveryPeriod: ['deliveryPeriod'],
  plantId: ['plantId'],
  plantName: ['plantName'],
  plantCapacityNm3h: ['plantCapacityNm3h', 'capacityNm3h'],
  plantAnnualGWh: ['plantAnnualGWh', 'annualGWh'],
  legalEntityName: ['legalEntityName'],
  networkOperator: ['networkOperator'],
  contactEmail: ['contactEmail'],
  contactPhone: ['contactPhone'],
};

const NUMERIC_KEYS = ['ci', 'volume', 'plantCapacityNm3h', 'plantAnnualGWh'] as const;
type NumericKey = (typeof NUMERIC_KEYS)[number];

function isNumericKey(key: keyof DealParams): key is NumericKey {
  return (NUMERIC_KEYS as readonly string[]).includes(key);
}

/**
 * Build a link to the Trade Builder carrying whatever the caller knows.
 *
 * Absent keys are omitted rather than serialised — a `counterparty=undefined` in
 * the URL would arrive at the builder as the literal string "undefined" and be
 * rendered as a counterparty name.
 */
export function buildDealUrl(params: Partial<DealParams>): string {
  const query = new URLSearchParams();

  for (const key of Object.keys(ALIASES) as (keyof DealParams)[]) {
    const value = params[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    query.set(key, String(value));
  }

  const queryString = query.toString();
  return queryString ? `${DEAL_ROUTE}?${queryString}` : DEAL_ROUTE;
}

/**
 * Read deal parameters out of a location's search params.
 *
 * Only keys actually present are returned, so the builder can distinguish "the
 * caller said nothing about volume" from "the caller said zero" and fall back to
 * its own default only in the first case. Numeric fields that will not parse are
 * dropped rather than returned as NaN — an absent value is honest, whereas a NaN
 * propagates into computeNetback and surfaces as a NaN price on the screen.
 */
export function parseDealParams(searchParams: URLSearchParams): Partial<DealParams> {
  const parsed: Partial<DealParams> = {};

  for (const [key, spellings] of Object.entries(ALIASES) as [keyof DealParams, string[]][]) {
    let raw: string | null = null;
    for (const spelling of spellings) {
      const candidate = searchParams.get(spelling);
      if (candidate !== null && candidate !== '') {
        raw = candidate;
        break;
      }
    }
    if (raw === null) continue;

    if (isNumericKey(key)) {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) continue;
      parsed[key] = numeric;
    } else {
      // The string fields are unions (scheme, coc) or free text. Validating the
      // unions is the consuming screen's job — it owns the registries that say
      // which values are real, and it must fall back visibly when one is not.
      parsed[key] = raw as CertificationScheme & ChainOfCustody & string;
    }
  }

  return parsed;
}
