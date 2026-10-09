import { useState } from 'react';
import {
  Building2,
  ExternalLink,
  Mail,
  Phone,
  Scale,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Linkedin,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe
} from 'lucide-react';
import { BiomethanePlant, TraderDeskOverride } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';
import {
  LEAD_SOURCE_LABEL,
  scopeOrder,
  typeOrder,
  getBestResearchContact
} from '../plantBriefBuilders';

interface PlantTabCommercialProps {
  plant: BiomethanePlant;
  isExpanded: boolean;
  isDark: boolean;
  t: PlantDrawerTheme;
  deskOverride: TraderDeskOverride | null;
  isEditingOverride: boolean;
  setIsEditingOverride: (val: boolean) => void;
  setOverrideSignatory: (val: string) => void;
  targetOperator: string;
  websiteUrl: string;
  linkedinCompanyUrl: string | null;
  contactQuality: {
    confidence: string;
    isPersonalEmail: boolean;
    officialRegister: { registerName: string; searchUrl?: string; url?: string };
  };
  officialRegister: { registerName: string; searchUrl?: string; url?: string };
  copyToClipboard: (text: string, label: string) => void;
}

export function PlantTabCommercial({
  plant,
  isExpanded,
  isDark,
  t,
  deskOverride,
  isEditingOverride,
  setIsEditingOverride,
  setOverrideSignatory,
  targetOperator,
  websiteUrl,
  linkedinCompanyUrl,
  contactQuality,
  officialRegister,
  copyToClipboard,
}: PlantTabCommercialProps) {
  const [showMatchEvidence, setShowMatchEvidence] = useState(false);
  const [showUnconfirmedContacts, setShowUnconfirmedContacts] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
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

      {/* Core Entity Identity */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isExpanded ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
        gap: '14px 18px',
        paddingBottom: '14px',
        borderBottom: `1px solid ${t.borderLight}`
      }}>
        <div>
          <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
            Legal Operating Entity
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <strong style={{ fontSize: '12px', color: t.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={plant.verifiedDossier?.officialLegalEntity || plant.legalEntityName || plant.operator || 'Not identified'}>
              {plant.verifiedDossier?.officialLegalEntity || plant.legalEntityName || plant.operator || 'Not identified — search register'}
            </strong>
            {(plant.verifiedDossier?.officialLegalEntity || plant.legalEntityName || plant.operator) && (
              <button
                type="button"
                onClick={() => copyToClipboard(plant.verifiedDossier?.officialLegalEntity || plant.legalEntityName || plant.operator || '', 'Legal Entity')}
                style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '1px' }}
                title="Copy"
              >
                <Copy size={11} />
              </button>
            )}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
            Statutory Registration ID
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: plant.verifiedDossier?.statutoryRegistrationId ? (isDark ? '#34d399' : '#059669') : t.textMuted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {plant.verifiedDossier?.statutoryRegistrationId || (plant.registrationCheck && plant.registrationCheck.status !== 'CONFIRMED' ? 'Source ID rejected by register' : 'Not verified — search register')}
            </span>
            {plant.verifiedDossier?.statutoryRegistrationId && (
              <button
                type="button"
                onClick={() => copyToClipboard(plant.verifiedDossier?.statutoryRegistrationId || '', 'Registration ID')}
                style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '1px' }}
                title="Copy"
              >
                <Copy size={11} />
              </button>
            )}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
            Parent Portfolio / Group
          </span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {plant.verifiedDossier?.parentGroup || 'Not identified'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
            Trading Desk Location
          </span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#38bdf8' : '#0284c7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {plant.verifiedDossier?.groupTradingDeskLocation || '—'}
          </span>
        </div>
      </div>

      {/* Researched Counterparty Block */}
      {plant.research && (
        <div style={{
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: t.textMain, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Researched Counterparty
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {(() => {
                const displayTier = plant.research.effectiveTier || plant.research.tier;
                return (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor:
                      displayTier === 'READY'
                        ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)')
                        : displayTier === 'ENTITY_ONLY'
                        ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)')
                        : (isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.12)'),
                    color:
                      displayTier === 'READY'
                        ? (isDark ? '#34d399' : '#059669')
                        : displayTier === 'ENTITY_ONLY'
                        ? (isDark ? '#fbbf24' : '#d97706')
                        : (isDark ? '#94a3b8' : '#64748b'),
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {displayTier === 'READY' && <CheckCircle2 size={12} />}
                    {displayTier === 'ENTITY_ONLY' && <AlertTriangle size={12} />}
                    {displayTier === 'UNRESOLVED' && <AlertOctagon size={12} />}
                    {displayTier === 'READY' ? 'Outreach-ready (sourced)' : displayTier === 'ENTITY_ONLY' ? 'ENTITY_ONLY' : 'UNRESOLVED'}
                  </span>
                );
              })()}
              <span style={{ fontSize: '10px', color: t.textMuted }}>
                Updated {new Date(plant.research.researchedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Discrepancy Warning */}
          {plant.contactEmail && plant.research.contacts && plant.research.contacts.length > 0 &&
            !plant.research.contacts.some(c => c.value.toLowerCase().trim() === plant.contactEmail?.toLowerCase().trim()) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '6px 10px',
              borderRadius: '5px',
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)',
              color: isDark ? '#fbbf24' : '#b45309',
              border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`
            }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              <span>
                <strong>Registry contact differs from researched contact:</strong> Initial dataset listed <code>{plant.contactEmail}</code>, but verified research identified official desk <code>{plant.research.contacts.map(c => c.value).join(', ')}</code>.
              </span>
            </div>
          )}

          {/* Entity details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isExpanded ? 'repeat(3, 1fr)' : 'repeat(1, 1fr)', gap: '10px', fontSize: '12px' }}>
            {plant.research.legalEntity && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Operating Company (SPV)</span>
                  {plant.research.legalEntity.check && (
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      backgroundColor: plant.research.legalEntity.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                      color: plant.research.legalEntity.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                    }}>
                      {plant.research.legalEntity.check.status === 'VERIFIED' ? '✓ verified' : plant.research.legalEntity.check.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <strong style={{ color: t.textMain }}>{plant.research.legalEntity.value}</strong>
                  <a href={plant.research.legalEntity.sourceUrl} target="_blank" rel="noopener noreferrer" title={`Source: ${plant.research.legalEntity.sourceUrl} (${plant.research.legalEntity.retrievedAt})`} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                    <ExternalLink size={12} />
                  </a>
                  {(() => {
                    const statusQ = plant.research.openQuestions?.find(q => q.toLowerCase().startsWith('company status:'));
                    const chStatus = plant.research.registrationId?.check?.companyStatus ||
                      (statusQ ? statusQ.match(/company status:\s*([^—-]+)/i)?.[1]?.trim() : null);
                    if (!chStatus || chStatus.toLowerCase() === 'active') return null;
                    return (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)',
                        color: isDark ? '#f87171' : '#dc2626',
                        border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }} title={`Companies House status: ${chStatus} — counterparty risk`}>
                        <AlertTriangle size={11} />
                        <span>{chStatus}</span>
                      </span>
                    );
                  })()}
                </div>
                {plant.research.legalEntity.note && (
                  <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', marginTop: '1px' }}>{plant.research.legalEntity.note}</span>
                )}
              </div>
            )}

            {plant.research.registrationId && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Confirmed Registration / CIF</span>
                  {plant.research.registrationId.check && (
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      backgroundColor: plant.research.registrationId.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                      color: plant.research.registrationId.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                    }}>
                      {plant.research.registrationId.check.status === 'VERIFIED' ? '✓ verified' : plant.research.registrationId.check.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <code style={{ color: isDark ? '#34d399' : '#059669', fontWeight: 700 }}>{plant.research.registrationId.value}</code>
                  <a href={plant.research.registrationId.sourceUrl} target="_blank" rel="noopener noreferrer" title={`Source: ${plant.research.registrationId.sourceUrl}`} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                    <ExternalLink size={12} />
                  </a>
                </div>
                {plant.research.registrationId.note && (
                  <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', marginTop: '1px' }}>{plant.research.registrationId.note}</span>
                )}
              </div>
            )}

            {plant.research.parentGroup && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Parent Group / Developer</span>
                  {plant.research.parentGroup.check && (
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      backgroundColor: plant.research.parentGroup.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                      color: plant.research.parentGroup.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                    }}>
                      {plant.research.parentGroup.check.status === 'VERIFIED' ? '✓ verified' : plant.research.parentGroup.check.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ color: t.textSecondary, fontWeight: 600 }}>{plant.research.parentGroup.value}</span>
                  <a href={plant.research.parentGroup.sourceUrl} target="_blank" rel="noopener noreferrer" title={`Source: ${plant.research.parentGroup.sourceUrl}`} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {plant.research.website && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Corporate Website</span>
                  {plant.research.website.check && (
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      backgroundColor: plant.research.website.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                      color: plant.research.website.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                    }}>
                      {plant.research.website.check.status === 'VERIFIED' ? '✓ verified' : plant.research.website.check.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <a href={plant.research.website.value} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={12} /> {plant.research.website.value.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            )}

            {plant.research.plantLink && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Verified Plant Link</span>
                  {plant.research.plantLink.check && (
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      backgroundColor: plant.research.plantLink.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                      color: plant.research.plantLink.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                    }}>
                      {plant.research.plantLink.check.status === 'VERIFIED' ? '✓ verified' : plant.research.plantLink.check.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <a href={plant.research.plantLink.value} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ExternalLink size={12} /> Asset Confirmation Link
                  </a>
                </div>
                {plant.research.plantLink.note && (
                  <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', marginTop: '1px' }}>{plant.research.plantLink.note}</span>
                )}
              </div>
            )}

            {plant.research.siteAddress && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Researched Physical Address</span>
                  {plant.research.siteAddress.check && (
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      backgroundColor: plant.research.siteAddress.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                      color: plant.research.siteAddress.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                    }}>
                      {plant.research.siteAddress.check.status === 'VERIFIED' ? '✓ verified' : plant.research.siteAddress.check.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <span style={{ color: t.textSecondary, display: 'block', marginTop: '2px' }}>
                  {plant.research.siteAddress.value}
                  {plant.research.siteCoordinates && (
                    <span style={{ color: t.textMuted, fontSize: '10px', display: 'block' }}>
                      ({plant.research.siteCoordinates.value[0].toFixed(4)}, {plant.research.siteCoordinates.value[1].toFixed(4)})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Best Verified Contact */}
            {(() => {
              const best = getBestResearchContact(plant.research);
              const bestContact = best.contact as { sourceUrl?: string } | undefined;
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Best Contact</span>
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      backgroundColor: best.isVerified ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                      color: best.isVerified ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                    }}>
                      {best.isVerified ? '✓ verified' : 'no verified contact'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <strong style={{
                      color: best.isVerified ? t.textMain : (isDark ? '#f87171' : '#dc2626'),
                      fontSize: '12px'
                    }}>
                      {best.text}
                    </strong>
                    {bestContact?.sourceUrl && (
                      <a href={bestContact.sourceUrl} target="_blank" rel="noopener noreferrer" title={`Source: ${bestContact.sourceUrl}`} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Researched Contacts List */}
          {plant.research.contacts && plant.research.contacts.length > 0 && (() => {
            const allContacts = plant.research.contacts;
            const verified = allContacts.filter(c => c.check?.status === 'VERIFIED');
            const unconfirmed = allContacts.filter(c => c.check && c.check.status !== 'VERIFIED');

            const sortedVerified = [...verified].sort((a, b) => {
              const sA = scopeOrder[a.contactScope || ''] || 0;
              const sB = scopeOrder[b.contactScope || ''] || 0;
              if (sB !== sA) return sB - sA;
              const tA = typeOrder[a.type] || 0;
              const tB = typeOrder[b.type] || 0;
              return tB - tA;
            });

            const renderContactRow = (contact: typeof allContacts[0], idx: number) => {
              const isVerified = contact.check?.status === 'VERIFIED';
              const isGeneralPress = contact.contactScope === 'GENERAL_OR_PRESS';
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                  border: `1px solid ${t.borderLight}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                      color: isDark ? '#38bdf8' : '#0284c7'
                    }}>
                      {contact.type}
                    </span>
                    <strong style={{ fontSize: '12px', color: t.textMain }}>{contact.value}</strong>
                    {contact.check && (
                      <span style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 600,
                        backgroundColor: isVerified ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                        color: isVerified ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                      }}>
                        {isVerified ? '✓ verified' : contact.check.status.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    )}
                    {isGeneralPress && (
                      <span style={{ fontSize: '10px', color: isDark ? '#fbbf24' : '#d97706', fontWeight: 600 }}>
                        General/press inbox — not a commercial contact
                      </span>
                    )}
                    {contact.role && <span style={{ fontSize: '11px', color: t.textMuted }}>• {contact.role}</span>}
                    {contact.personName && <span style={{ fontSize: '11px', color: t.textSecondary }}>({contact.personName})</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(contact.value, 'Contact')}
                      style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '2px' }}
                      title="Copy contact"
                    >
                      <Copy size={11} />
                    </button>
                    <a
                      href={contact.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Source: ${contact.sourceUrl}${contact.note ? `\nQuote: "${contact.note}"` : ''}`}
                      style={{
                        color: isDark ? '#38bdf8' : '#0284c7',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        textDecoration: 'none'
                      }}
                    >
                      <ExternalLink size={11} />
                      <span>{contact.retrievedAt ? new Date(contact.retrievedAt).toISOString().split('T')[0] : 'source'}</span>
                    </a>
                  </div>
                </div>
              );
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${t.borderLight}`, paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
                  Researched Outreach Channels ({allContacts.length})
                </span>

                {sortedVerified.length > 0 ? (
                  sortedVerified.map((c, i) => renderContactRow(c, i))
                ) : (
                  <div style={{
                    padding: '6px 10px',
                    borderRadius: '5px',
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.2)'}`,
                    color: isDark ? '#f87171' : '#dc2626',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span>no verified contact</span>
                  </div>
                )}

                {unconfirmed.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setShowUnconfirmedContacts(!showUnconfirmedContacts)}
                      style={{
                        background: 'none',
                        border: `1px solid ${t.border}`,
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: t.textMuted,
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Unconfirmed ({unconfirmed.length})</span>
                      {showUnconfirmedContacts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {showUnconfirmedContacts && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {unconfirmed.map((c, i) => renderContactRow(c, i))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Offtake / Injection Notes */}
          {plant.research.injectionOrOfftakeNotes && plant.research.injectionOrOfftakeNotes.length > 0 && (
            <div style={{ fontSize: '11px', color: t.textSecondary, borderTop: `1px solid ${t.borderLight}`, paddingTop: '8px' }}>
              <strong>Offtake & Grid Notes: </strong>
              {plant.research.injectionOrOfftakeNotes.map((n, i) => (
                <span key={i}>
                  {n.value}{' '}
                  <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                    [source]
                  </a>
                  {i < plant.research!.injectionOrOfftakeNotes.length - 1 ? '; ' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Open Questions for Trader */}
          {plant.research.openQuestions && plant.research.openQuestions.length > 0 && (
            <div style={{
              padding: '8px 10px',
              borderRadius: '6px',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
              borderLeft: '3px solid #ef4444',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                Open Questions Before Contacting:
              </span>
              {plant.research.openQuestions.map((q, idx) => (
                <span key={idx} style={{ fontSize: '11px', color: t.textSecondary }}>
                  • {q}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Origination Pathways & Direct Leads */}
      {plant.verifiedDossier && plant.verifiedDossier.commercialContacts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Commercial Leads & Origination Pathways ({plant.verifiedDossier.commercialContacts.length})
            </span>
            <span style={{ fontSize: '11px', color: t.textMuted }}>
              Target: <strong style={{ color: t.textSecondary }}>{targetOperator}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {plant.verifiedDossier.commercialContacts.map((contact, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 0',
                  borderBottom: idx < plant.verifiedDossier!.commercialContacts.length - 1 ? `1px solid ${t.borderLight}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '12px', color: t.textMain }}>{contact.fullName}</strong>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                      color: t.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}>
                      {LEAD_SOURCE_LABEL[contact.source]}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
                    {contact.title}
                    {contact.source === 'SOURCE_DATASET' && plant.research?.contacts && plant.research.contacts.length > 0 && contact.workEmail &&
                      !plant.research.contacts.some(c => c.value.toLowerCase().trim() === contact.workEmail?.toLowerCase().trim()) && (
                      <span style={{ marginLeft: '8px', color: isDark ? '#fbbf24' : '#d97706', fontStyle: 'italic', fontWeight: 500 }}>
                        — Registry contact differs from researched contact
                      </span>
                    )}
                  </div>

                  {(contact.workEmail || contact.directPhone) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '3px', fontSize: '11px', flexWrap: 'wrap' }}>
                      {contact.workEmail && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={11} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                          <a href={`mailto:${contact.workEmail}`} style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none' }}>
                            {contact.workEmail}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(contact.workEmail || '', 'Email')}
                            style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '1px' }}
                            title="Copy Email"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      )}
                      {contact.directPhone && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={11} style={{ color: t.textMuted }} />
                          <a href={`tel:${contact.directPhone}`} style={{ color: t.textSecondary, textDecoration: 'none' }}>
                            {contact.directPhone}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(contact.directPhone || '', 'Phone')}
                            style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '1px' }}
                            title="Copy Phone"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <a
                    href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`"${targetOperator.replace(/\b(SAS|SARL|GmbH(\s*&\s*Co\.?\s*KG)?|Ltd|Limited|SpA|Srl|ApS|A\/S|B\.V\.|BV|AG|SE|e\.V\.)\b/gi, '').replace(/[()[\]"']/g, '').trim()}" "${contact.title.replace(/\s*—\s*/g, ' ')}"`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      color: isDark ? '#38bdf8' : '#0284c7',
                      fontSize: '11px',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                    title={`Search LinkedIn for ${contact.title} at ${targetOperator}`}
                  >
                    <Linkedin size={12} />
                    <span>Search Role ↗</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clean Verification Links Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${t.borderLight}`,
        fontSize: '11px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: t.textMuted }}>
          <Scale size={13} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
          <span>Register: <strong style={{ color: t.textSecondary }}>{officialRegister.registerName}</strong></span>
        </div>

        <a
          href={officialRegister.searchUrl || officialRegister.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 600, textDecoration: 'none' }}
        >
          Verify in {officialRegister.registerName.split(' ')[0]} ↗
        </a>

        {websiteUrl && (
          <>
            <span style={{ color: t.border }}>•</span>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              <Globe size={11} />
              <span>Corporate Website ↗</span>
            </a>
          </>
        )}

        {linkedinCompanyUrl && (
          <>
            <span style={{ color: t.border }}>•</span>
            <a
              href={linkedinCompanyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              <Linkedin size={11} />
              <span>Company Page ↗</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
