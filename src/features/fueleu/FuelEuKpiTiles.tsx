import React, { useMemo } from 'react';
import { FUEL_EU_SHIPPING_GROUPS } from '../../domain/fueleu/groups';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../../domain/fueleu/shippingTargetsData';
import { getAssumption } from '../../domain/assumptions/registry';
import { FUELEU_STATUTORY_PENALTY_PER_TONNE, FUELEU_PENALTY_VLSFO_MJ_PER_TONNE, FUELEU_ACTIVE_PERIOD } from '../../domain/fueleu/calculator';
import { computeFuelEuKpis, computeFleetWeightedGhgie } from '../../domain/fueleu/uiHelpers';

/**
 * The four Directory-tab KPI tiles, computed from real dataset totals (no ETS — ETS stays in the
 * per-company side panel / deal flow only).
 */
export function FuelEuKpiTiles() {
  const kpis = useMemo(() => computeFuelEuKpis(FUEL_EU_SHIPPING_GROUPS), []);
  const fleetGhgie = useMemo(() => computeFleetWeightedGhgie(FUEL_EU_SHIPPING_COUNTERPARTIES), []);
  const offer = getAssumption('fueleu.poolBuyPriceEurPerTco2e');

  // Annex IV Part B statutory penalty rate at n=1 (first-year multiplier): €/tCO2e = 2,400e6 / (fleet GHGIE × 41,000)
  const penaltyRateEurPerTco2e = fleetGhgie > 0 ? (FUELEU_STATUTORY_PENALTY_PER_TONNE * 1_000_000) / (fleetGhgie * FUELEU_PENALTY_VLSFO_MJ_PER_TONNE) : 0;
  const poolSavingEurPerTco2e = penaltyRateEurPerTco2e - offer;

  const deficitKt = Math.abs(kpis.deficitTco2e) / 1000;
  const surplusKt = kpis.surplusTco2e / 1000;

  return (
    <div className="fe-kpis">
      <div className="fe-kpi-card">
        <div className="fe-kpi-label">Deficit to cover · {FUELEU_ACTIVE_PERIOD}</div>
        <div className="fe-kpi-value num">
          {deficitKt.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span className="unit">ktCO₂e</span>
        </div>
        <div className="fe-kpi-sub num">
          €{(kpis.deficitPenaltyEur / 1e9).toFixed(2)}bn penalty-equivalent · {kpis.deficitGroupCount.toLocaleString()} groups
        </div>
      </div>

      <div className="fe-kpi-card">
        <div className="fe-kpi-label">Surplus in market</div>
        <div className="fe-kpi-value num">
          {surplusKt.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span className="unit">ktCO₂e</span>
        </div>
        <div className="fe-kpi-sub num">{kpis.surplusGroupCount.toLocaleString()} groups</div>
      </div>

      <div className="fe-kpi-card">
        <div className="fe-kpi-label">Surplus cover</div>
        <div className="fe-kpi-value num">{kpis.surplusCoverPct.toFixed(1)}%</div>
        <div className="fe-kpi-bar-track">
          <div className="fe-kpi-bar-fill" style={{ width: `${Math.min(100, kpis.surplusCoverPct)}%` }} />
        </div>
      </div>

      <div className="fe-kpi-card">
        <div className="fe-kpi-label">Pool saving vs penalty</div>
        <div className="fe-kpi-value num">
          €{Math.round(poolSavingEurPerTco2e).toLocaleString()} <span className="unit">/tCO₂e</span>
        </div>
        <div className="fe-kpi-sub num">
          €{Math.round(penaltyRateEurPerTco2e).toLocaleString()} penalty rate vs €{offer.toFixed(2)} offer
        </div>
      </div>
    </div>
  );
}
