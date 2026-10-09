import { useState } from 'react';
import {
  ExternalLink,
  Mail,
  Phone,
  Scale,
  AlertTriangle,
  Linkedin,
  Copy,
  ChevronDown,
  ChevronUp,
  Globe
} from 'lucide-react';
import { BiomethanePlant } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';
import {
  LEAD_SOURCE_LABEL,
  scopeOrder,
  typeOrder
} from '../plantBriefBuilders';

interface PlantContactMatrixProps {
  plant: BiomethanePlant;
  isDark: boolean;
  t: PlantDrawerTheme;
  targetOperator: string;
  websiteUrl: string;
  linkedinCompanyUrl: string | null;
  officialRegister: { registerName: string; searchUrl?: string; url?: string };
  copyToClipboard: (text: string, label: string) => void;
}

export function PlantContactMatrix({
  plant,
  isDark,
  t,
  targetOperator,
  websiteUrl,
  linkedinCompanyUrl,
  officialRegister,
  copyToClipboard,
}: PlantContactMatrixProps) {
  const [showUnconfirmedContacts, setShowUnconfirmedContacts] = useState(false);

  return (
    <>
      {/* Researched Contacts List */}
      {plant.research?.contacts && plant.research.contacts.length > 0 && (() => {
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

      {/* Origination Pathways & Direct Leads */}
      {plant.verifiedDossier && plant.verifiedDossier.commercialContacts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Commercial Leads &amp; Origination Pathways ({plant.verifiedDossier.commercialContacts.length})
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
    </>
  );
}
