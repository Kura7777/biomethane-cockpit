import { buildDealUrl } from '../../domain/trade/dealParams';
import type { Ets1Site } from '../../domain/ets1/sites';
import { biomethaneMWhToAbate } from '../../domain/ets1/sites';
import { ets1GasShare } from '../../domain/companies/opportunities';
import { HHV_TO_LHV_FACTOR } from '../../domain/offtake/engine';

/** The market EU ETS1 industrial zero-rating trades under in the markets registry (domain/markets/registry.ts). */
export const ETS1_TRADE_MARKET_ID = 'EU_ETS1';

/**
 * "Build in Trade Builder" for one ETS1 site: EU_ETS1 market, mass balance (RED III sustainability
 * + UDB recording, both required for this market), and a volume derived from the site's own gas
 * use — its verified tCO2 at the sector's natural-gas share — when the site has a biomethane fit.
 * Never a volume the row doesn't support: a LOW-fit or zero-emissions site gets none, and the Trade
 * Builder's own defaults apply instead.
 */
export function buildEts1SiteTradeBuilderUrl(site: Ets1Site): string {
  const gasTco2 = site.fit !== 'LOW' ? site.verifiedLatestTco2 * ets1GasShare(site.sector) : 0;
  const volume = gasTco2 > 0 ? Math.round(biomethaneMWhToAbate(gasTco2) / HHV_TO_LHV_FACTOR) : undefined;
  return buildDealUrl({
    marketId: ETS1_TRADE_MARKET_ID,
    coc: 'MASS_BALANCE',
    originCountry: site.country,
    volume,
    volumeIsEstimated: volume !== undefined ? true : undefined,
  });
}

/**
 * "Corporate order" for one ETS2 row: hands the company name and, when the desk already has a
 * sized gas volume for it (TWh, from the exposure calculation), the MWh equivalent. Never invents
 * a volume — a company with no sized gas use gets a bare client name.
 */
export function buildEts2CorporateOrderUrl(companyName: string, volumeTWh: number | null): string {
  const MWH_PER_TWH = 1_000_000;
  const params = new URLSearchParams();
  if (companyName) params.set('client', companyName);
  if (volumeTWh !== null && Number.isFinite(volumeTWh) && volumeTWh > 0) {
    params.set('mwh', String(Math.round(volumeTWh * MWH_PER_TWH)));
  }
  const qs = params.toString();
  return qs ? `/corporate?${qs}` : '/corporate';
}
