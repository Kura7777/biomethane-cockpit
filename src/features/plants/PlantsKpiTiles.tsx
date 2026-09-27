import React, { useMemo } from 'react';
import { BiomethanePlant } from '../../domain/plants/types';
import { KpiRow, KpiTile } from '../../shared/ui/KpiTile';

/**
 * The four census KPI tiles, computed from the current filtered set of plants
 * (not the full dataset) so they track the toolbar's active filters.
 */
export function PlantsKpiTiles({ plants }: { plants: BiomethanePlant[] }) {
  const stats = useMemo(() => {
    let totalGWh = 0;
    let negGWh = 0;
    let negCount = 0;
    let leadCount = 0;
    let switchboardCount = 0;
    let syntheticCount = 0;
    let registerCount = 0;
    const registerByCountry: Record<string, number> = {};

    for (const p of plants) {
      const gwh = p.annualEnergyGWh || 0;
      totalGWh += gwh;
      const ci = p.verifiedCarbonIntensity;
      if (ci !== null && ci !== undefined && ci < 0) {
        negGWh += gwh;
        negCount++;
      }
      const label = p.contactQuality?.confidenceLabel || '';
      if (label.startsWith('Unverified Lead')) leadCount++;
      else if (label.startsWith('Indirect')) switchboardCount++;
      else if (label.startsWith('Synthetic')) syntheticCount++;

      if (p.companyRegistrationId) {
        registerCount++;
        const code = p.countryCode || 'EU';
        registerByCountry[code] = (registerByCountry[code] || 0) + 1;
      }
    }

    const negSharePct = totalGWh > 0 ? (negGWh / totalGWh) * 100 : 0;
    const topRegisterCountry = Object.entries(registerByCountry).sort((a, b) => b[1] - a[1])[0];

    return {
      totalTWh: totalGWh / 1000,
      plantCount: plants.length,
      negSharePct,
      negCount,
      leadCount,
      switchboardCount,
      syntheticCount,
      registerCount,
      topRegisterCountry,
    };
  }, [plants]);

  return (
    <KpiRow className="plants-kpis">
      <KpiTile
        label="Supply in view"
        value={stats.totalTWh.toFixed(1)}
        unit="TWh/y"
        sub={`${stats.plantCount.toLocaleString()} plants · nameplate output`}
      />

      <KpiTile
        label="Negative-CI supply"
        value={`${stats.negSharePct.toFixed(1)}%`}
        barPercent={stats.negSharePct}
        sub={`Manure & slurry · ${stats.negCount.toLocaleString()} plants`}
        className="plants-kpi-blue-bar"
      />

      <div className="ds-kpi-card">
        <div className="ds-kpi-label">Contactable leads</div>
        <div className="ds-kpi-value num">{stats.leadCount.toLocaleString()}</div>
        <div className="plants-kpi-stack" role="img" aria-label="Leads vs switchboard split">
          <div
            className="plants-kpi-stack-lead"
            style={{ width: `${stats.leadCount + stats.switchboardCount > 0 ? (stats.leadCount / (stats.leadCount + stats.switchboardCount)) * 100 : 0}%` }}
          />
          <div
            className="plants-kpi-stack-switch"
            style={{ width: `${stats.leadCount + stats.switchboardCount > 0 ? (stats.switchboardCount / (stats.leadCount + stats.switchboardCount)) * 100 : 0}%` }}
          />
        </div>
        <div className="ds-kpi-sub num">
          {stats.switchboardCount.toLocaleString()} switchboard · {stats.syntheticCount.toLocaleString()} synthetic, unusable
        </div>
      </div>

      <KpiTile
        label="Register-confirmed entities"
        value={stats.registerCount.toLocaleString()}
        sub={stats.topRegisterCountry ? `${stats.topRegisterCountry[0]} ${stats.topRegisterCountry[1].toLocaleString()}` : 'No register matches in view'}
      />
    </KpiRow>
  );
}
