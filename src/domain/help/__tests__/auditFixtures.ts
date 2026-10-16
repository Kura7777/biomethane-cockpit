import { getInitialState } from '../../../store/persistence';
import type { MarksState, CostInputs } from '../../netback/types';
import { computeNetback } from '../../netback/engine';
import { buildArbitrageConsignment, originIsEuGrid } from '../../arbitrage/engine';
import { PRODUCING_ORIGINS, getRouteTransitTariff } from '../../arbitrage/origins';
import { FEEDSTOCK_REGISTRY } from '../../consignment/feedstocks';
import { MARKETS } from '../../markets/registry';
import { getAssumption } from '../../assumptions/registry';
import type { PricingBookEntry } from '../../markets/brokerRun.seed';

/** Shared deterministic fixtures for the audit tests (not a test file). */
export const NOW = new Date('2026-10-16T12:00:00Z');

/** A deterministic desk: real (non-simulated) marks, bid/bid sides, fixed FX. */
export function makeDesk(overrides: { simulated?: boolean } = {}): { marks: MarksState; costs: CostInputs; pricingBook: PricingBookEntry[] } {
  const base = getInitialState();
  const marks: MarksState = JSON.parse(JSON.stringify(base.marks));
  if (!overrides.simulated) {
    const prov = (name: string) => ({ sourceType: 'BROKER_INDICATION' as const, sourceName: name, sourceUrl: null, observedAt: '2026-10-14', note: null });
    marks.marks.NL_GGE = { marketId: 'NL_GGE', bid: 0.4, offer: 0.42, mid: null, updatedAt: '2026-10-14T09:00:00Z', source: 'BROKER · Test', provenance: prov('Test') };
    marks.marks.DE_THG = { marketId: 'DE_THG', bid: 290, offer: 295, mid: null, updatedAt: '2026-10-14T09:00:00Z', source: 'BROKER · Test', provenance: prov('Test') };
    marks.gasIndex = { bid: 33.2, offer: 33.2, mid: 33.2, updatedAt: '2026-10-14T09:00:00Z', provenance: prov('Test') };
    marks.fx = { gbpEur: 1.17, chfEur: null, updatedAt: '2026-10-14T09:00:00Z', provenance: prov('Test') };
  }
  marks.pricingSides = { certificateSide: 'bid', moleculeSide: 'bid' };
  return { marks, costs: base.costs, pricingBook: base.pricingBook };
}

/** Net netback straight from the engine for origin/feedstock into a market (the Trade Builder path). */
export function engineNet(d: { marks: MarksState; costs: CostInputs }, origin: string, feedstockKey: string, marketId: string, ci?: number): number | null {
  const profile = PRODUCING_ORIGINS[origin];
  const f = FEEDSTOCK_REGISTRY[feedstockKey];
  const consignment = buildArbitrageConsignment({
    originCountry: profile.countryCode, originCountryName: profile.countryName, feedstockKey, feedstockName: f.name,
    annexClassification: f.annexClassification, carbonIntensity: ci ?? getAssumption(`feedstock.defaultCi.${f.id}`),
    scheme: 'ISCC_EU', chainOfCustody: 'MASS_BALANCE', isEUGrid: originIsEuGrid(profile),
    volumeMWh: getAssumption('deal.defaultVolumeMwh'), complianceYear: null,
  });
  const market = MARKETS.find(m => m.id === marketId)!;
  const costs = { ...d.costs, logistics: getRouteTransitTariff(profile.countryCode, market.country) };
  return computeNetback(market, consignment, d.marks, costs, d.marks.pricingSides).netNetback;
}

