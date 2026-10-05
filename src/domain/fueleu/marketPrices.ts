import type { MarksState } from '../netback/types';
import { selectMarkPrice } from '../netback/engine';
import { fuelEuPoolBidPriceEurPerTco2e, fuelEuPoolSpreadEurPerTco2e } from '../assumptions/registry';
import { priceSourceForMark, type PriceSource } from '../marks/markSource';
import type { FuelEuPoolPrices } from './types';

export type { FuelEuPoolPrices };

/**
 * FuelEU's market prices come from the marks store (what the Pricing desk shows and sets), never
 * from a private constant. Desk judgements stay in the assumptions register:
 *  - TTF:  state.marks.gasIndex, mid side.
 *  - EUA:  the EU_ETS1 mark (EUR_PER_TCO2E), mid side.
 *  - FuelEU pool: the FUELEU mark (EUR_PER_TCO2E_DEFICIT), offer side is the price a deficit client pays;
 *    the desk bid is the offer less fueleu.poolDeskSpreadEurPerTco2e (or the explicit
 *    fueleu.poolSellPriceEurPerTco2e override).
 * A mark that is not loaded gives null. Callers show "No ... mark, set it in Pricing" and must not
 * substitute a number.
 */

export interface FuelEuMarketPrices {
  ttfEurPerMwh: number | null;
  ttfSource: PriceSource | null;
  euaEurPerTco2e: number | null;
  euaSource: PriceSource | null;
  pool: FuelEuPoolPrices | null;
  poolSource: PriceSource | null;
}

export function fuelEuMarketPrices(marks: MarksState): FuelEuMarketPrices {
  const gas = marks.gasIndex;
  const ttf = selectMarkPrice(gas, 'mid');

  const euaMark = marks.marks?.['EU_ETS1'];
  const eua = euaMark ? selectMarkPrice(euaMark, 'mid') : null;

  const poolMark = marks.marks?.['FUELEU'];
  const offer = poolMark ? selectMarkPrice(poolMark, 'offer') : null;

  return {
    ttfEurPerMwh: ttf,
    ttfSource: ttf === null ? null : priceSourceForMark(gas.provenance, gas.updatedAt),
    euaEurPerTco2e: eua,
    euaSource: eua === null || !euaMark ? null : priceSourceForMark(euaMark.provenance, euaMark.updatedAt),
    pool:
      offer === null
        ? null
        : {
            offerEurPerTco2e: offer,
            bidEurPerTco2e: fuelEuPoolBidPriceEurPerTco2e(offer),
            spreadEurPerTco2e: fuelEuPoolSpreadEurPerTco2e(offer),
          },
    poolSource: offer === null || !poolMark ? null : priceSourceForMark(poolMark.provenance, poolMark.updatedAt),
  };
}

/** The "No ... mark" line a FuelEU screen shows in place of a price. */
export const NO_TTF_MARK = 'No TTF mark — set it in Pricing';
export const NO_EUA_MARK = 'No EUA mark — set it in Pricing';
export const NO_POOL_MARK = 'No FuelEU pool mark — set it in Pricing';
