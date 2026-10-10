import { PlantCompliance, SourcedValue } from '../../../domain/plants/types';
import { certificateExpiry, ggeReadiness, ReadinessStatus } from '../../../domain/plants/compliance';
import { PlantDrawerTheme } from './plantDrawerTheme';
import { usePageContext } from '../../helper/usePageContext';

/** One researched compliance fact: its label and how to show its value. */
interface ComplianceRow {
  key: keyof PlantCompliance;
  label: string;
  text: (sv: SourcedValue<any> & { bdnsResult?: string }) => string;
}

const INJECTION_TEXT: Record<string, string> = {
  TSO: 'Transmission grid (TSO)',
  DSO: 'Distribution grid (DSO)',
  OFF_GRID: 'Off-grid',
  UNKNOWN: 'UNKNOWN',
};

const COMPLIANCE_ROWS: ComplianceRow[] = [
  { key: 'gdoRegistered', label: 'Enagás GdO registered', text: sv => String(sv.value) },
  { key: 'injection', label: 'Grid injection', text: sv => INJECTION_TEXT[sv.value] ?? String(sv.value) },
  { key: 'operatingSince', label: 'Operating since', text: sv => String(sv.value) },
  { key: 'actualProductionGWh', label: 'Actual output', text: sv => `${sv.value.value} GWh (${sv.value.year})` },
  { key: 'capacityNm3h', label: 'Capacity', text: sv => `${Number(sv.value).toLocaleString()} Nm³/h` },
  { key: 'feedstockMix', label: 'Feedstock mix', text: sv => String(sv.value) },
  {
    key: 'certification',
    label: 'Certification',
    text: sv => `${String(sv.value.scheme).replace('_', ' ')} ${sv.value.certificateNumber} · valid to ${sv.value.validUntil} (${sv.value.status})`,
  },
  {
    key: 'prtrGrant',
    label: 'PRTR biogas grant',
    text: sv => (sv.value === 'UNKNOWN' && sv.bdnsResult === 'NO_RECORD' ? 'UNKNOWN — not found (partial register)' : String(sv.value)),
  },
  { key: 'otherAid', label: 'Other aid', text: sv => String(sv.value) },
  { key: 'reportedCI', label: 'Reported CI', text: sv => `${sv.value} gCO₂e/MJ` },
  { key: 'currentOfftake', label: 'Current offtake', text: sv => String(sv.value) },
];

const READINESS_MARK: Record<ReadinessStatus, string> = { OK: '✓', WARN: '!', FLAG: '✕', UNKNOWN: '?' };

interface PlantComplianceSectionProps {
  compliance: PlantCompliance;
  isDark: boolean;
  t: PlantDrawerTheme;
}

/**
 * The researched compliance facts for a plant: GGE-readiness line, certificate-expiry warning, and
 * each value with its source link and verbatim quote (expandable). A value the research could not
 * find is amber UNKNOWN, never a quiet blank or a NO.
 */
export function PlantComplianceSection({ compliance, isDark, t }: PlantComplianceSectionProps) {
  const amber = isDark ? '#fbbf24' : '#b45309';
  const red = isDark ? '#f87171' : '#dc2626';
  const green = isDark ? '#34d399' : '#059669';
  const link = isDark ? '#38bdf8' : '#0284c7';
  const readiness = ggeReadiness(compliance);
  const expiry = certificateExpiry(compliance);
  usePageContext('/plants', () => {
    const cert = compliance.certification?.value;
    return {
      plantCompliance: {
        readiness: readiness?.summary ?? null,
        readinessItems: (readiness?.items ?? []).map(i => ({ id: i.id, label: i.label, status: i.status, detail: i.detail })),
        aid: compliance.otherAid ? String(compliance.otherAid.value) : null,
        prtrGrant: compliance.prtrGrant ? String(compliance.prtrGrant.value) : null,
        certificate: cert && typeof cert === 'object' ? { scheme: cert.scheme, validUntil: cert.validUntil, status: cert.status } : null,
        certificateExpiry: expiry ? { state: expiry.state, daysLeft: expiry.daysLeft } : null,
        feedstockForCi: compliance.feedstockMix ? String(compliance.feedstockMix.value) : null,
        openQuestions: compliance.openQuestions.slice(0, 4),
      },
    };
  }, 'plant-compliance');

  const toneFor = (st: ReadinessStatus) => (st === 'OK' ? green : st === 'FLAG' ? red : amber);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }} data-testid="plant-compliance">
      <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: t.textMain, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Green-gas compliance (researched)
      </h4>

      {compliance.excluded && (
        <div data-testid="compliance-excluded" style={{ fontSize: '11px', color: red, lineHeight: 1.45 }}>
          <strong>Excluded from shortlists.</strong> {compliance.excludedReason}
        </div>
      )}

      {readiness && !readiness.excluded && (
        <div data-testid="compliance-readiness" style={{ fontSize: '11px', lineHeight: 1.5 }}>
          <div style={{ color: t.textMain, fontWeight: 700 }}>
            GGE readiness · <span style={{ fontWeight: 500, color: t.textSecondary }}>{readiness.summary}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: '3px' }}>
            {readiness.items.map(i => (
              <span key={i.id} title={i.detail} data-testid={`readiness-${i.id}`} data-status={i.status} style={{ color: toneFor(i.status), fontWeight: 600, whiteSpace: 'nowrap' }}>
                {READINESS_MARK[i.status]} {i.label}
              </span>
            ))}
          </div>
          <ul style={{ margin: '4px 0 0', paddingLeft: '16px', color: t.textMuted }}>
            {readiness.items.filter(i => i.status !== 'OK').map(i => <li key={i.id}>{i.label}: {i.detail}</li>)}
          </ul>
        </div>
      )}

      {expiry && expiry.state !== 'VALID' && (
        <div data-testid="cert-expiry-warning" style={{ fontSize: '11px', color: expiry.state === 'EXPIRED' ? red : amber, fontWeight: 600 }}>
          {expiry.state === 'EXPIRED'
            ? `Certificate expired ${expiry.validUntil}. Do not contract until it is renewed.`
            : `Certificate expires ${expiry.validUntil} (${expiry.daysLeft} days): confirm renewal before the delivery period.`}
        </div>
      )}

      {compliance.correctedEntity && (
        <div data-testid="compliance-corrected-entity" style={{ fontSize: '11px', color: amber, lineHeight: 1.45 }}>
          <strong>Entity at this site: {compliance.correctedEntity.value.name}</strong>
          {compliance.correctedEntity.value.prtrGrantEur ? ` · PRTR grant €${compliance.correctedEntity.value.prtrGrantEur.toLocaleString()}` : ''}
          {' · the app’s record names a different company. '}
          <a href={compliance.correctedEntity.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: link }}>source</a>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '11px' }}>
        {COMPLIANCE_ROWS.map(row => {
          const sv = compliance[row.key] as SourcedValue<any> | null | undefined;
          const unknown = !sv || sv.value === 'UNKNOWN' || sv.value == null;
          return (
            <div key={row.key} data-testid={`compliance-field-${row.key}`} data-unknown={unknown ? 'true' : 'false'} style={{ padding: '6px 0', borderBottom: `1px solid ${t.borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: t.textMuted, flexShrink: 0 }}>{row.label}</span>
                <strong style={{ color: unknown ? amber : t.textMain, textAlign: 'right', overflowWrap: 'anywhere', minWidth: 0 }}>
                  {sv ? row.text(sv) : 'UNKNOWN — not found'}
                </strong>
              </div>
              {sv && (
                <details style={{ marginTop: '2px' }}>
                  <summary style={{ cursor: 'pointer', color: t.textMuted, fontSize: '10px' }}>Source and quote</summary>
                  <div style={{ marginTop: '3px', color: t.textSecondary, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                    {sv.note && <div style={{ fontStyle: 'italic' }}>{sv.note}</div>}
                    <a href={sv.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: link }}>{sv.sourceUrl}</a>
                    <span style={{ color: t.textMuted }}> · retrieved {sv.retrievedAt.slice(0, 10)}</span>
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {compliance.openQuestions.length > 0 && (
        <div data-testid="compliance-open-questions" style={{ fontSize: '11px', color: amber, lineHeight: 1.45 }}>
          <strong>Still to confirm</strong>
          <ul style={{ margin: '2px 0 0', paddingLeft: '16px' }}>
            {compliance.openQuestions.map((q, i) => <li key={i} style={{ overflowWrap: 'anywhere' }}>{q}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
