import React from 'react';
import { TradeAssessment } from '../../../domain/trade/types';
import { TBA } from '../../../domain/trade/legalPackage';

interface LegalPackageHeaderProps {
  assessment: TradeAssessment;
  onDownloadAll: () => void;
  onClose: () => void;
}

export function LegalPackageHeader({
  assessment,
  onDownloadAll,
  onClose,
}: LegalPackageHeaderProps) {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const volumeLabel = c.volumeMWh != null ? `${c.volumeMWh.toLocaleString('en-GB')} MWh` : TBA;
  // A missing leg stays missing: a partial sum must not read as the complete delivered value.
  const gasPrice = assessment.marks.gasIndex.mid ?? null;
  const certVal = nb.certificateValue?.valueEurPerMWh ?? null;
  const totalDelivered = gasPrice !== null && certVal !== null ? gasPrice + certVal : null;

  return (
    <div
      className="m-dialog-header lp-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '2px solid var(--color-divider)',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="m-hide"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            Deal Handoff Suite
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
            }}
          >
            Deal Document Drafts
          </h3>
        </div>
        <div style={{ fontSize: '12px', marginTop: '3px', color: 'var(--color-muted)' }}>
          Ref: <strong style={{ color: 'var(--color-text)' }}>{assessment.id}</strong> · Destination: <strong style={{ color: 'var(--color-text)' }}>{assessment.targetMarketName}</strong> · Volume: <strong style={{ color: 'var(--color-text)' }}>{volumeLabel}</strong> · Indicative delivered (desk marks): <strong style={{ color: 'var(--color-accent)' }}>{totalDelivered !== null ? `€${totalDelivered.toFixed(2)}/MWh` : 'n/a (a desk mark is missing)'}</strong>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="lp-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          className="btn btn-primary m-hide"
          style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          onClick={onDownloadAll}
          title="Download all 5 documents at once"
        >
          <span>📦</span>
          <span>Download All (5 Files)</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '7px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => window.print()}
          title="Print active document"
        >
          <span>🖨️</span>
          <span>Print</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '7px 10px', fontSize: '12px' }}
          onClick={onClose}
          title="Close modal (Esc)"
        >
          <span className="m-hide">Esc </span>✕
        </button>
      </div>
    </div>
  );
}
