import React, { useMemo } from 'react';
import { FUEL_EU_SHIPPING_GROUPS } from '../../domain/fueleu/groups';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../../domain/fueleu/shippingTargetsData';
import { NO_POOL_MARK } from '../../domain/fueleu/marketPrices';
import { useFuelEuPrices } from './useFuelEuPrices';
import { FUELEU_ACTIVE_PERIOD } from '../../domain/fueleu/calculator';
import { FUELEU_STATUTORY_PENALTY_PER_TONNE, FUELEU_PENALTY_VLSFO_MJ_PER_TONNE } from '../../domain/regulatory/constants';
import { computeFuelEuKpis, computeFleetWeightedGhgie } from '../../domain/fueleu/uiHelpers';
import { KpiRow, KpiTile } from '../../shared/ui/KpiTile';

/**
 * The four Directory-tab KPI tiles, computed from real dataset totals (no ETS — ETS stays in the
 * per-company side panel / deal flow only).
 */
export function FuelEuKpiTiles() {
  const kpis = useMemo(() => computeFuelEuKpis(FUEL_EU_SHIPPING_GROUPS), []);
  const fleetGhgie = useMemo(() => computeFleetWeightedGhgie(FUEL_EU_SHIPPING_COUNTERPARTIES), []);
  const offer = useFuelEuPrices().pool?.offerEurPerTco2e ?? null;

  // Annex IV Part B statutory penalty rate at n=1 (first-year multiplier): €/tCO2e = 2,400e6 / (fleet GHGIE × 41,000)
  const penaltyRateEurPerTco2e = fleetGhgie > 0 ? (FUELEU_STATUTORY_PENALTY_PER_TONNE * 1_000_000) / (fleetGhgie * FUELEU_PENALTY_VLSFO_MJ_PER_TONNE) : 0;
  const poolSavingEurPerTco2e = offer === null ? null : penaltyRateEurPerTco2e - offer;

  const deficitKt = Math.abs(kpis.deficitTco2e) / 1000;
  const surplusKt = kpis.surplusTco2e / 1000;

  return (
    <KpiRow className="fe-kpis">
      <KpiTile
        className="fe-kpi-card"
        label={`Deficit to cover · ${FUELEU_ACTIVE_PERIOD}`}
        value={deficitKt.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        unit="ktCO₂e"
        sub={`€${(kpis.deficitPenaltyEur / 1e9).toFixed(2)}bn penalty-equivalent · ${kpis.deficitGroupCount.toLocaleString()} groups`}
      />

      <KpiTile
        className="fe-kpi-card"
        label="Surplus in market"
        value={surplusKt.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        unit="ktCO₂e"
        sub={`${kpis.surplusGroupCount.toLocaleString()} groups`}
      />

      <KpiTile
        className="fe-kpi-card"
        label="Surplus cover"
        value={`${kpis.surplusCoverPct.toFixed(1)}%`}
        barPercent={kpis.surplusCoverPct}
      />

      <KpiTile
        className="fe-kpi-card"
        label="Pool saving vs penalty"
        value={poolSavingEurPerTco2e === null ? '—' : `€${Math.round(poolSavingEurPerTco2e).toLocaleString()}`}
        unit="/tCO₂e"
        sub={offer === null ? NO_POOL_MARK : `€${Math.round(penaltyRateEurPerTco2e).toLocaleString()} penalty rate vs €${offer.toFixed(2)} offer (FUELEU mark)`}
      />
    </KpiRow>
  );
}
