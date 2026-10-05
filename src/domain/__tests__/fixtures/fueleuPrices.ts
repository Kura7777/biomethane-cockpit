import type { FuelEuPoolPrices } from '../../fueleu/types';

/**
 * Explicit FuelEU market inputs for tests. The calculators no longer default these (they come from
 * the Pricing desk marks in the app), so each test states the prices it is checking against.
 * The numbers are what the register used to default to: TTF the old unsourced desk default (36),
 * EUA the EU_ETS1 benchmark mid (85.40), and the pool the offer/bid baked into the shipping
 * targets pack (108.60 / 98.60, spread 10). They are test inputs, not app defaults.
 */
export const TEST_TTF_EUR_MWH = 36;
export const TEST_EUA_EUR_PER_TCO2E = 85.4;
export const TEST_POOL: FuelEuPoolPrices = {
  offerEurPerTco2e: 108.6,
  bidEurPerTco2e: 98.6,
  spreadEurPerTco2e: 10,
};

/** The three market inputs calculateMarineBunkerQuotation now requires. */
export const TEST_QUOTE_MARKET_INPUTS = {
  ttfGasIndexEurMwh: TEST_TTF_EUR_MWH,
  euaPriceEurPerTonne: TEST_EUA_EUR_PER_TCO2E,
  fuelEuSurplusPriceEurPerTco2e: TEST_POOL.bidEurPerTco2e,
};
