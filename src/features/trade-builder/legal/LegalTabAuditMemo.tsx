import React, { useState } from 'react';
import { TradeAssessment } from '../../../domain/trade/types';
import { LegalAnnexOptions, TBA } from '../../../domain/trade/legalPackage';

interface LegalTabAuditMemoProps {
  assessment: TradeAssessment;
  legalOptions: LegalAnnexOptions;
  seal: string;
  pdfBlobUrl: string;
  copiedType: string | null;
  onCopy: (text: string, type: string) => void;
  onDownloadPdf: () => void;
}

export function LegalTabAuditMemo({
  assessment,
  seal,
  pdfBlobUrl,
  copiedType,
  onCopy,
  onDownloadPdf,
}: LegalTabAuditMemoProps) {
  const [subView, setSubView] = useState<'STRUCTURED' | 'PDF'>('STRUCTURED');

  const c = assessment.consignment;
  const volumeLabel = c.volumeMWh != null ? `${c.volumeMWh.toLocaleString()} MWh` : TBA;

  const handleCopySummary = () => {
    const memoText = `[DESK REGULATORY PRE-SCREEN — internal, not legal advice]
Ref: AUDIT-TR-${assessment.id}
Date: ${assessment.createdAt.slice(0, 10)}
Origin Facility: ${c.name || 'Biomethane Facility'} (${c.originCountry})
Target Market: ${assessment.targetMarketName} (${assessment.targetMarketId})
Feedstock: ${c.feedstockName || c.feedstock} · CI: ${c.carbonIntensity} gCO2e/MJ
Volume: ${volumeLabel}
Verdict: ${assessment.eligibility.overallVerdict}

6-GATE PRE-SCREEN:
${assessment.eligibility.gates.map((g, idx) => `• Gate ${idx + 1}: ${g.gateLabel} [${g.verdict}] - ${g.reason}`).join('\n')}

Document fingerprint: ${seal}`.trim();
    onCopy(memoText, 'AUDIT_MEMO');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Document Sub-view Selector & Download Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="eyebrow" style={{ margin: 0 }}>View Format:</span>
          <div className="seg" style={{ height: '28px' }}>
            <button
              type="button"
              className={`seg-opt ${subView === 'STRUCTURED' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '2px 12px' }}
              onClick={() => setSubView('STRUCTURED')}
            >
              📋 Structured Review
            </button>
            <button
              type="button"
              className={`seg-opt ${subView === 'PDF' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '2px 12px' }}
              onClick={() => setSubView('PDF')}
            >
              📄 PDF Preview
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={handleCopySummary}
          >
            <span>{copiedType === 'AUDIT_MEMO' ? '✓' : '📋'}</span>
            <span>{copiedType === 'AUDIT_MEMO' ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '4px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
            onClick={onDownloadPdf}
          >
            <span>📥</span>
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Sub-view A: Structured Audit Review */}
      {subView === 'STRUCTURED' && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                Desk Regulatory Pre-Screen Memo (internal — not legal advice)
              </h4>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                Ref: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>AUDIT-TR-{assessment.id}</span> · Directive (EU) 2023/2413 (RED III)
              </div>
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 800,
                backgroundColor: assessment.eligibility.overallVerdict === 'ELIGIBLE' ? 'var(--color-status-pass-bg, rgba(5, 150, 105, 0.15))' : 'var(--color-status-neg-bg, rgba(220, 38, 38, 0.15))',
                color: assessment.eligibility.overallVerdict === 'ELIGIBLE' ? 'var(--color-status-pass-text, #10b981)' : 'var(--color-status-neg-text, #f87171)',
                border: `1px solid ${assessment.eligibility.overallVerdict === 'ELIGIBLE' ? 'var(--color-status-pass-border, #059669)' : 'var(--color-status-neg-border, #dc2626)'}`,
              }}
            >
              VERDICT: {assessment.eligibility.overallVerdict}
            </span>
          </div>

          {/* 6 Gates Matrix */}
          <div>
            <div className="eyebrow" style={{ marginBottom: '8px' }}>6-Gate Statutory Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assessment.eligibility.gates.map((g, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-subtier)',
                    border: '1px solid var(--color-divider)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '12px',
                      fontWeight: 800,
                      backgroundColor: g.verdict === 'PASS' ? 'var(--color-emerald-700, #065f46)' : g.verdict === 'HARD_BLOCK' ? 'var(--color-rose-700, #991b1b)' : 'var(--color-amber-700, #92400e)',
                      color: 'var(--color-contrast-white, #ffffff)',
                    }}
                  >
                    {g.verdict}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-text)' }}>
                      Gate {idx + 1}: {g.gateLabel}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      {g.reason}
                    </div>
                    {g.citations && g.citations[0] && (
                      <div style={{ fontSize: '12px', color: 'var(--color-accent)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                        📌 {g.citations[0].fullReference || g.citations[0].shortName}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EFET Protective Clauses Box */}
          <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
            <div className="eyebrow" style={{ marginBottom: '6px' }}>Protections to negotiate (desk checklist, not agreed terms)</div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--color-text)', lineHeight: 1.6 }}>
              <li><strong>Evidence deadline:</strong> when the PoS / UDB transfer must land after each delivery month.</li>
              <li><strong>Late or invalid evidence:</strong> cure period, then price reduction or termination of the attribute leg.</li>
              <li><strong>Support-scheme warranty:</strong> seller discloses national support received (e.g. SDE++, EEG, GSE) and warrants no double claim.</li>
            </ul>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            Document fingerprint: {seal}
          </div>
        </div>
      )}

      {/* Sub-view B: PDF Preview */}
      {subView === 'PDF' && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            padding: '8px',
          }}
        >
          {pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              style={{
                width: '100%',
                height: '750px',
                border: 'none',
                backgroundColor: 'var(--color-contrast-white, #ffffff)',
              }}
              title="Statutory Audit Memo PDF Preview"
            />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
              Rendering PDF document preview...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
