import { useState } from 'react';
import { Scale, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { BiomethanePlant } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';
import { PlantComplianceSection } from './PlantComplianceSection';

interface PlantTabComplianceProps {
  plant: BiomethanePlant;
  isDark: boolean;
  t: PlantDrawerTheme;
  contactQuality: { confidence: string };
  handleAuditPlantDiligence: () => void;
}

export function PlantTabCompliance({
  plant,
  isDark,
  t,
  contactQuality,
  handleAuditPlantDiligence,
}: PlantTabComplianceProps) {
  const [showRawCensus, setShowRawCensus] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: `1px solid ${t.borderLight}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scale size={15} style={{ color: isDark ? '#10b981' : '#059669' }} />
          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: t.textMain, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Statutory Diligence & Provenance
          </h3>
        </div>
        <button
          type="button"
          onClick={handleAuditPlantDiligence}
          style={{
            padding: '4px 10px',
            backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.08)',
            color: isDark ? '#fbbf24' : '#d97706',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.3)'}`,
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Run 6-Gate Audit ↗
        </button>
      </div>

      {plant.research?.compliance && <PlantComplianceSection compliance={plant.research.compliance} isDark={isDark} t={t} />}

      {/* Raw Census Baseline Collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowRawCensus(!showRawCensus)}
          style={{
            background: 'none',
            border: 'none',
            color: t.textMuted,
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          <span>Raw Census Baseline (GIE / EBA 2026)</span>
          {showRawCensus ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showRawCensus && (
          <div style={{ marginTop: '8px', padding: '10px 0', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${t.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: t.textMuted }}>Raw Email:</span>
              <span style={{ color: contactQuality.confidence === 'UNDELIVERABLE' ? '#ef4444' : t.textSecondary, fontFamily: 'monospace' }}>
                {plant.contactEmail || 'Unpublished'} {contactQuality.confidence === 'UNDELIVERABLE' ? '(Bounce)' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: t.textMuted }}>Raw Phone:</span>
              <span style={{ color: t.textSecondary, fontFamily: 'monospace' }}>{plant.contactPhone || 'Unpublished'}</span>
            </div>
            {plant.headquartersAddress && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: t.textMuted, flexShrink: 0 }}>Raw Address:</span>
                <span style={{ color: t.textSecondary, textAlign: 'right' }}>{plant.headquartersAddress}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Institutional Provenance Declaration */}
      <div style={{ paddingTop: '8px', borderTop: `1px solid ${t.borderLight}`, fontSize: '11px', color: t.textMuted, lineHeight: 1.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: t.textMain, fontWeight: 600, marginBottom: '2px' }}>
          <ShieldCheck size={12} style={{ color: isDark ? '#10b981' : '#059669' }} />
          <span>Data Provenance Tier</span>
        </div>
        <span style={{ color: t.textSecondary }}>
          {plant.provenance || 'Source attribution recorded under statutory census guidelines.'}
        </span>
      </div>
    </div>
  );
}
