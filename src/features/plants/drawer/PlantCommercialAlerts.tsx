import { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BiomethanePlant, TraderDeskOverride } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';

interface PlantCommercialAlertsProps {
  plant: BiomethanePlant;
  isDark: boolean;
  t: PlantDrawerTheme;
  deskOverride: TraderDeskOverride | null;
  isEditingOverride: boolean;
  setIsEditingOverride: (val: boolean) => void;
  setOverrideSignatory: (val: string) => void;
  contactQuality: {
    confidence: string;
    isPersonalEmail: boolean;
    officialRegister: { registerName: string; searchUrl?: string; url?: string };
  };
}

export function PlantCommercialAlerts({
  plant,
  isDark,
  t,
  deskOverride,
  isEditingOverride,
  setIsEditingOverride,
  setOverrideSignatory,
  contactQuality,
}: PlantCommercialAlertsProps) {
  const [showMatchEvidence, setShowMatchEvidence] = useState(false);

  return (
    <>
      {/* Desk Confirmed Signatory Callout (if active) */}
      {deskOverride && !isEditingOverride && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: isDark ? 'rgba(6, 78, 59, 0.25)' : 'rgba(16, 185, 129, 0.08)',
          borderLeft: `3px solid ${isDark ? '#34d399' : '#059669'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#34d399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} /> Desk Confirmed Signatory
            </span>
            <span style={{ fontSize: '11px', color: t.textMuted }}>
              Verified by {deskOverride.traderName} on {new Date(deskOverride.verifiedAt).toLocaleDateString()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
            <strong style={{ color: t.textMain }}>{deskOverride.counterpartySignatory}</strong>
            {deskOverride.directEmail && (
              <a href={`mailto:${deskOverride.directEmail}`} style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none' }}>
                {deskOverride.directEmail}
              </a>
            )}
            {deskOverride.directPhone && (
              <a href={`tel:${deskOverride.directPhone}`} style={{ color: t.textSecondary, textDecoration: 'none' }}>
                {deskOverride.directPhone}
              </a>
            )}
          </div>

          {deskOverride.notes && (
            <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '2px' }}>
              <strong>Notes:</strong> {deskOverride.notes}
            </div>
          )}
        </div>
      )}

      {/* Quality & Outreach Risk Alerts */}
      {contactQuality.confidence === 'UNDELIVERABLE' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: isDark ? '#fca5a5' : '#dc2626' }}>
          <AlertOctagon size={13} style={{ flexShrink: 0 }} />
          <span><strong>Synthetic address:</strong> {plant.contactEmail} was auto-generated from place name; it will bounce or reach an unrelated party (e.g. the town hall). Approach operator via official register or LinkedIn below.</span>
        </div>
      )}
      {contactQuality.confidence === 'INDIRECT' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: isDark ? '#fcd34d' : '#d97706' }}>
          <AlertTriangle size={13} style={{ flexShrink: 0 }} />
          <span><strong>Shared Switchboard:</strong> Contact connects to central EPC/hotline. Direct origination pathways are provided in the table below.</span>
        </div>
      )}
      {contactQuality.isPersonalEmail && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: isDark ? '#fdba74' : '#c2410c' }}>
          <ShieldAlert size={13} style={{ flexShrink: 0 }} />
          <span><strong>Personal Mailbox:</strong> Likely private farmer/sole trader email. Phone first or use verified corporate lead.</span>
        </div>
      )}

      {/* Suggested Register Match Callout */}
      {plant.verifiedDossier?.suggestedEntity && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: isDark ? 'rgba(14, 165, 233, 0.08)' : 'rgba(2, 132, 199, 0.05)',
          borderLeft: `3px solid ${isDark ? '#38bdf8' : '#0284c7'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>
                {plant.verifiedDossier.suggestedEntity.matchKind === 'INJECTION_SITE'
                  ? 'Injection-site match (ODRE) — operator not verified'
                  : plant.verifiedDossier.suggestedEntity.matchKind === 'PROJECT_DATABASE'
                  ? 'Planning-database match (REPD) — confirm operator'
                  : 'Register match — confirm'}:
              </span>
              <strong style={{ color: t.textMain }}>{plant.verifiedDossier.suggestedEntity.name}</strong>
              {plant.verifiedDossier.suggestedEntity.registerId && (
                <span style={{ color: isDark ? '#38bdf8' : '#0284c7', fontFamily: 'monospace', fontSize: '11px' }}>
                  ({plant.verifiedDossier.suggestedEntity.idLabel}: {plant.verifiedDossier.suggestedEntity.registerId})
                </span>
              )}
              {plant.verifiedDossier.suggestedEntity.matchKind === 'OPERATOR_REGISTER' && plant.verifiedDossier.suggestedEntity.unitId && (
                <span style={{ color: t.textMuted, fontFamily: 'monospace', fontSize: '11px' }}>
                  (MaStR unit: {plant.verifiedDossier.suggestedEntity.unitId})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {plant.verifiedDossier.suggestedEntity.evidence && plant.verifiedDossier.suggestedEntity.evidence.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMatchEvidence(!showMatchEvidence)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isDark ? '#38bdf8' : '#0284c7',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: 0
                  }}
                >
                  <span>{showMatchEvidence ? 'Hide Signals' : `Match Evidence (${plant.verifiedDossier.suggestedEntity.evidence.length})`}</span>
                  {showMatchEvidence ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}
              {plant.verifiedDossier.suggestedEntity.matchKind === 'OPERATOR_REGISTER' && (
                <button
                  type="button"
                  onClick={() => {
                    setOverrideSignatory(plant.verifiedDossier?.suggestedEntity?.name || '');
                    setIsEditingOverride(true);
                  }}
                  style={{
                    padding: '3px 8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Use as Signatory
                </button>
              )}
            </div>
          </div>
          {showMatchEvidence && plant.verifiedDossier.suggestedEntity.evidence && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
              {plant.verifiedDossier.suggestedEntity.evidence.map((ev, i) => (
                <span key={i} style={{ fontSize: '11px', color: t.textSecondary }}>
                  • {ev}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ambiguous Register Candidates */}
      {plant.registerMatch?.status === 'AMBIGUOUS' && plant.registerMatch.candidates && plant.registerMatch.candidates.length > 0 && (
        <div style={{ padding: '8px 12px', borderLeft: `3px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
            Multiple Register Candidates ({plant.registerMatch.candidates.length})
          </span>
          {plant.registerMatch.candidates.slice(0, 3).map((cand, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
              <div>
                <strong style={{ color: t.textMain }}>{cand.operatorName}</strong>
                {cand.operatorRegisterId && <span style={{ fontFamily: 'monospace', color: t.textMuted }}> ({cand.operatorRegisterId})</span>}
                {cand.town && <span style={{ color: t.textMuted }}> • {cand.town}</span>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOverrideSignatory(cand.operatorName);
                  setIsEditingOverride(true);
                }}
                style={{ padding: '2px 8px', backgroundColor: t.btnBg, color: t.btnText, border: `1px solid ${t.btnBorder}`, borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
              >
                Use
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
