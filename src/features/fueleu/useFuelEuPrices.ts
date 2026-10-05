import { useMemo } from 'react';
import { useAppState } from '../../store/context';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { fuelEuMarketPrices, type FuelEuMarketPrices } from '../../domain/fueleu/marketPrices';

/**
 * FuelEU market prices (TTF, EUA, pool offer and bid) from the marks store, re-derived whenever a
 * mark or a desk assumption (the pool spread or bid override) changes.
 */
export function useFuelEuPrices(): FuelEuMarketPrices {
  const { state } = useAppState();
  const assumptionsVersion = useAssumptionsVersion();
  return useMemo(() => fuelEuMarketPrices(state.marks), [state.marks, assumptionsVersion]);
}
