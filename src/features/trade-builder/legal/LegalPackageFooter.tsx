import React from 'react';
import { TradeAssessment } from '../../../domain/trade/types';
import { TBA } from '../../../domain/trade/legalPackage';

interface LegalPackageFooterProps {
  assessment: TradeAssessment;
  signoff: { by: string; at: string } | null;
  /** Whether the deal is on the Deal Blotter (a sign-off is stored on the saved deal). */
  isSaved: boolean;
  reviewerName: string;
  onReviewerNameChange: (name: string) => void;
  onComplianceSignoff: () => void;
  onDownloadTermSheetPdf: () => void;
  onDownloadEfetPdf: () => void;
  onDownloadEtrmCsv: () => void;
  onDownloadUdbXml: () => void;
  onDownloadAuditMemoPdf: () => void;
  onDownloadCompletePackage: () => void;
}

export function LegalPackageFooter({
  assessment,
  signoff,
  isSaved,
  reviewerName,
  onReviewerNameChange,
  onComplianceSignoff,
  onDownloadTermSheetPdf,
  onDownloadEfetPdf,
  onDownloadEtrmCsv,
  onDownloadUdbXml,
  onDownloadAuditMemoPdf,
  onDownloadCompletePackage,
}: LegalPackageFooterProps) {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const volumeLabel = c.volumeMWh != null ? `${c.volumeMWh.toLocaleString('en-GB')} MWh` : TBA;
  const deskMargin = nb.deskMargin ?? 0;

  return (
    <div
      className="lp-footer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '2px solid var(--color-divider)',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div className="lp-footer-note" style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
        Ref: <strong style={{ color: 'var(--color-text)' }}>{assessment.id}</strong> · Volume: <strong style={{ color: 'var(--color-text)' }}>{volumeLabel}</strong> · Desk margin (internal): <strong style={{ color: 'var(--color-accent)' }}>€{deskMargin.toFixed(2)}/MWh</strong>
      </div>

      <div className="lp-footer-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {signoff ? (
          <span
            className="chip"
            style={{
              backgroundColor: 'var(--color-status-pos-bg)',
              color: 'var(--color-status-pos-text)',
              border: '1px solid var(--color-status-pos-border)',
              fontSize: '12px',
              fontWeight: 700,
              padding: '5px 10px',
            }}
          >
            ✓ Compliance reviewed: {signoff.by} ({new Date(signoff.at).toLocaleString('en-GB')})
          </span>
        ) : (
          <>
            <input
              type="text"
              className="input"
              style={{ padding: '5px 8px', fontSize: '12px', width: '120px' }}
              value={reviewerName}
              onChange={e => onReviewerNameChange(e.target.value)}
              aria-label="Reviewer name (stored on this device)"
              title="Reviewer name: a label stored on this device, not a login"
              maxLength={60}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={onComplianceSignoff}
              disabled={!isSaved}
              title={isSaved ? 'Record on the Deal Blotter that this deal has been compliance-reviewed (a note on this device, not an approval workflow)' : 'Save the deal to the blotter first'}
              data-testid="compliance-signoff"
            >
              {isSaved ? '🛡️ Record Compliance Review' : 'Save to blotter first'}
            </button>
          </>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={onDownloadTermSheetPdf}
          title="Download Commercial Term Sheet PDF"
        >
          📄 Term Sheet PDF
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={onDownloadEfetPdf}
          title="Download EFET Biomethane Annex PDF"
        >
          ⚖️ Draft Confirmation PDF
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={onDownloadEtrmCsv}
          title="Download ETRM CSV Deal Ticket"
        >
          💾 Deal Record CSV
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={onDownloadUdbXml}
          title="Download UDB Mass Balance Nomination XML"
        >
          🌐 UDB Worksheet
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={onDownloadAuditMemoPdf}
          title="Download Statutory Compliance Audit Memo PDF"
        >
          🛡️ Pre-Screen PDF
        </button>

        <button
          type="button"
          className="btn btn-primary lp-export-all"
          style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 800 }}
          onClick={onDownloadCompletePackage}
          title="Download all 5 deal documents at once"
        >
          📦 Download All 5 Files
        </button>
      </div>
    </div>
  );
}
