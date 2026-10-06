import { buildOriginationUrl } from '../commercial/originationUrl';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { DESTINATION_GO_MARKETS } from '../../domain/trade/dealDefaults';
import type { ChainOfCustody } from '../../domain/consignment/types';
import type { ProductForm } from '../../domain/corporate/orderPricer';

/**
 * The two hand-offs a corporate order can start: Origination (always available) and the Trade
 * Builder (only once the order names exactly one registry country — two or more, or none, has no
 * single market to send it to).
 */
export function corporateHandoffUrls(args: {
  countries: string[];
  form: ProductForm;
  volumeMWh: number | null;
  maxCi: number | null;
  client: string;
}): { sourceItUrl: string; tradeBuilderUrl: string | null; goMarketId: string | null } {
  const soleRegistry = args.countries.length === 1 ? args.countries[0] : null;
  const goMarketId = soleRegistry ? DESTINATION_GO_MARKETS[soleRegistry] ?? null : null;
  const coc: ChainOfCustody = args.form === 'GO_ONLY' ? 'BOOK_AND_CLAIM' : 'MASS_BALANCE';
  const buyer = args.client.trim() || undefined;

  const sourceItUrl = buildOriginationUrl({
    market: goMarketId ?? undefined,
    mwh: args.volumeMWh ?? undefined,
    maxCi: args.maxCi ?? undefined,
    buyer,
  });

  const tradeBuilderUrl = goMarketId
    ? buildDealUrl({
        marketId: goMarketId,
        coc,
        volume: args.volumeMWh ?? undefined,
        counterparty: buyer,
        // The buyer's max CI is a constraint, not the plant's CI, so it is not passed as \`ci\`:
        // the Trade Builder takes the plant CI from deal defaults. Use "Source it" to filter by max CI.
      })
    : null;

  return { sourceItUrl, tradeBuilderUrl, goMarketId };
}
