import { Activity } from 'lucide-react';
import { BiomethanePlant } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';

interface PlantTabTechnicalProps {
  plant: BiomethanePlant;
  ciValue: number;
  isDark: boolean;
  t: PlantDrawerTheme;
}

export function PlantTabTechnical({
  plant,
  ciValue,
  isDark,
  t,
}: PlantTabTechnicalProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px', borderBottom: `1px solid ${t.borderLight}` }}>
        <Activity size={15} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: t.textMain, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Physical Capacity & Technical Parameters
        </h3>
      </div>

      {/* Clean Open Key-Value Specification Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
          <span style={{ color: t.textMuted }}>Annual Injected Energy:</span>
          <strong style={{ color: t.textMain }}>
            {plant.annualEnergyGWh ? `${plant.annualEnergyGWh.toLocaleString()} GWh/y (${(plant.annualEnergyGWh * 1000).toLocaleString()} MWh/y)` : '—'}
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
          <span style={{ color: t.textMuted }}>Hourly Biomethane Flow:</span>
          <strong style={{ color: t.textMain }}>
            {plant.capacityNm3h ? `${plant.capacityNm3h.toLocaleString()} Nm³/h` : '—'}
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
          <span style={{ color: t.textMuted }}>Carbon Intensity:</span>
          <strong style={{ color: ciValue < 0 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#fbbf24' : '#d97706') }}>
            {ciValue} gCO₂e/MJ (feedstock default)
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
          <span style={{ color: t.textMuted }}>Primary Feedstock Category:</span>
          <strong style={{ color: isDark ? '#10b981' : '#059669' }}>
            {plant.primaryFeedstockCategory || 'Agricultural Biomass'}
          </strong>
        </div>

        {plant.feedstockDetails && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}`, gap: '16px' }}>
            <span style={{ color: t.textMuted, flexShrink: 0 }}>Substrate Mix / Recipe:</span>
            <span style={{ color: t.textSecondary, textAlign: 'right' }}>{plant.feedstockDetails}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
          <span style={{ color: t.textMuted }}>Upgrading Separation Technology:</span>
          <strong style={{ color: t.textMain }}>{plant.upgradingTechnology || 'Membrane separation'}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
          <span style={{ color: t.textMuted }}>Grid Operator (TSO/DSO):</span>
          <span style={{ fontFamily: 'monospace', color: t.textSecondary }}>{plant.networkOperator || 'National Gas Grid'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
          <span style={{ color: t.textMuted }}>Grid Connection Level:</span>
          <span style={{ color: t.textSecondary }}>{plant.gridConnectionType || 'Distribution Grid Injection (DSO)'}</span>
        </div>

        {plant.supportScheme && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
            <span style={{ color: t.textMuted }}>Statutory Subsidy Regime:</span>
            <strong style={{ color: isDark ? '#fbbf24' : '#d97706' }}>
              {plant.supportScheme} {plant.supportExpiryDate ? `(Expiry: ${plant.supportExpiryDate})` : ''}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
