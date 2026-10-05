import { buildDealUrl } from '../../domain/trade/dealParams';
import { defaultVolumeMwh } from '../../domain/trade/dealDefaults';
import type { SourcedOpportunity } from './PlantScannerTable';

/**
 * The Trade Builder link for a sourced route into a given market. One place builds it, so the
 * Step 4 button and the market ladder rows carry the same plant, counterparty and volume.
 */
export function buildOpportunityDealUrl(opp: SourcedOpportunity, marketId: string, orderVolumeMwh: number | null): string {
  const plantVolume = opp.plantAnnualGWh
    ? Math.round(opp.plantAnnualGWh * 1000)
    : (orderVolumeMwh || defaultVolumeMwh());
  return buildDealUrl({
    marketId,
    originCountry: opp.originCountry,
    feedstock: opp.feedstockKey,
    ci: opp.carbonIntensity,
    ciIsEstimated: true,
    volume: plantVolume,
    plantId: opp.originPlantId,
    plantName: opp.originPlantName,
    plantCapacityNm3h: opp.plantCapacityNm3h ?? undefined,
    plantAnnualGWh: opp.plantAnnualGWh ?? undefined,
    legalEntityName: opp.legalEntityName ?? undefined,
    networkOperator: opp.networkOperator ?? undefined,
    counterparty: opp.legalEntityName || opp.originPlantName || 'European Biomethane Producer',
  });
}
