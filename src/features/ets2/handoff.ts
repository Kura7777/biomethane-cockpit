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
  // The ETS1 site is the BUYER. Its country is a destination, not where the biomethane comes from,
  // so originCountry is deliberately NOT passed (plant origin is unknown); the counterparty is carried.
  const counterparty = (site.parentCompany || site.operator || site.name || '').trim() || undefined;
  return buildDealUrl({
    marketId: ETS1_TRADE_MARKET_ID,
    coc: 'MASS_BALANCE',
    counterparty,
    volume,
    volumeIsEstimated: volume !== undefined ? true : undefined,
  });
}

/**
 * "Corporate order" for one ETS2 row. A volume is handed over ONLY for an exposed end user with its
 * own disclosed gas volume (TWh -> MWh). A regulated supplier's gas book is not a buyer's order
 * size (its whole book is its customers' gas), so it gets a bare client name and the trader
 * enters the volume.
 */
export function buildEts2CorporateOrderUrl(
  companyName: string,
  volumeTWh: number | null,
  own?: { role: 'REGULATED_SUPPLIER' | 'EXPOSED_END_USER'; volumeMethod: 'DISCLOSED' | 'SHARE_OF_NATIONAL' | null }
): string {
  const MWH_PER_TWH = 1_000_000;
  const params = new URLSearchParams();
  if (companyName) params.set('client', companyName);
  const ownVolume = own ? own.role === 'EXPOSED_END_USER' && own.volumeMethod === 'DISCLOSED' : false;
  if (ownVolume && volumeTWh !== null && Number.isFinite(volumeTWh) && volumeTWh > 0) {
    params.set('mwh', String(Math.round(volumeTWh * MWH_PER_TWH)));
  }
  const qs = params.toString();
  return qs ? `/corporate?${qs}` : '/corporate';
}
