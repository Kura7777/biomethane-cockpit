import {
  Building2,
  ExternalLink,
  AlertTriangle,
  AlertOctagon,
  Copy,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { BiomethanePlant } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';
import { getBestResearchContact } from '../plantBriefBuilders';

interface PlantCompanyCardProps {
  plant: BiomethanePlant;
  isExpanded: boolean;
  isDark: boolean;
  t: PlantDrawerTheme;
  copyToClipboard: (text: string, label: string) => void;
}

export function PlantCompanyCard({
  plant,
  isExpanded,
  isDark,
  t,
  copyToClipboard,
}: PlantCompanyCardProps) {
  return (
    <>
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

          {/* Offtake / Injection Notes */}
          {plant.research.injectionOrOfftakeNotes && plant.research.injectionOrOfftakeNotes.length > 0 && (
            <div style={{ fontSize: '11px', color: t.textSecondary, borderTop: `1px solid ${t.borderLight}`, paddingTop: '8px' }}>
              <strong>Offtake &amp; Grid Notes: </strong>
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
    </>
  );
}
