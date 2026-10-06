/**
 * The hand-off contract into Origination (`#/sourcing`). A demand screen that already knows a
 * market, a volume, a CI ceiling, a buyer name or a feedstock passes what it has; Origination
 * starts Step 1 from those values and falls back to its own defaults for anything missing.
 *
 * Mirrors the shape of `domain/trade/dealParams.ts`: build on the way out, parse on the way in,
 * absent values omitted rather than serialised as "undefined".
 */

export const ORIGINATION_ROUTE = '/sourcing';

export interface OriginationUrlParams {
  market?: string;
  mwh?: number;
  maxCi?: number;
  buyer?: string;
  feedstock?: string;
}

export function buildOriginationUrl(params: OriginationUrlParams): string {
  const query = new URLSearchParams();

  if (params.market) query.set('market', params.market);
  if (params.mwh !== undefined && Number.isFinite(params.mwh) && params.mwh > 0) {
    query.set('mwh', String(params.mwh));
  }
  if (params.maxCi !== undefined && Number.isFinite(params.maxCi)) {
    query.set('maxCi', String(params.maxCi));
  }
  if (params.buyer) query.set('buyer', params.buyer);
  if (params.feedstock) query.set('feedstock', params.feedstock);

  const queryString = query.toString();
  return queryString ? `${ORIGINATION_ROUTE}?${queryString}` : ORIGINATION_ROUTE;
}

/**
 * Reads back only well-formed values. A market or feedstock key that the registries don't
 * recognise is the consuming screen's call (it owns those registries), same as dealParams.
 */
export function parseOriginationUrl(searchParams: URLSearchParams): OriginationUrlParams {
  const result: OriginationUrlParams = {};

  const market = searchParams.get('market');
  if (market) result.market = market;

  const mwhRaw = searchParams.get('mwh');
  if (mwhRaw !== null) {
    const trimmed = mwhRaw.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n) && n > 0) result.mwh = n;
    }
  }

  const maxCiRaw = searchParams.get('maxCi');
  if (maxCiRaw !== null) {
    const trimmed = maxCiRaw.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n)) result.maxCi = n;
    }
  }

  const buyer = searchParams.get('buyer');
  if (buyer) result.buyer = buyer;

  const feedstock = searchParams.get('feedstock');
  if (feedstock) result.feedstock = feedstock;

  return result;
}
