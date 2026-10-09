import React, { useState } from 'react';

interface LegalTabEtrmTicketProps {
  etrmCsv: string;
  etrmJsonStr: string;
  etrmCsvRows: Array<{ header: string; value: string }>;
  copiedType: string | null;
  onCopy: (text: string, type: string) => void;
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
}

export function LegalTabEtrmTicket({
  etrmCsv,
  etrmJsonStr,
  etrmCsvRows,
  copiedType,
  onCopy,
  onDownloadCsv,
  onDownloadJson,
}: LegalTabEtrmTicketProps) {
  const [subView, setSubView] = useState<'TABLE' | 'RAW_CSV' | 'JSON'>('TABLE');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Document Review Sub-Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>Document 3 Review:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={`btn ${subView === 'TABLE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setSubView('TABLE')}
            >
              📊 Deal Fields Table
            </button>
            <button
              type="button"
              className={`btn ${subView === 'RAW_CSV' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setSubView('RAW_CSV')}
            >
              📝 Raw CSV
            </button>
            <button
              type="button"
              className={`btn ${subView === 'JSON' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setSubView('JSON')}
            >
              🔧 JSON
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => onCopy(subView === 'JSON' ? etrmJsonStr : etrmCsv, subView === 'JSON' ? 'JSON' : 'CSV')}
          >
            {copiedType === 'CSV' || copiedType === 'JSON' ? '✓ Copied' : 'Copy'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={onDownloadCsv}
          >
            <span>⬇️</span>
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
            onClick={onDownloadJson}
          >
            Download JSON
          </button>
        </div>
      </div>

      {/* Sub-view A: Formatted Table Review */}
      {subView === 'TABLE' && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>
                Generic Deal Record
              </h4>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                Generic internal format — map fields explicitly before importing into any ETRM. Blank values are unknown, not zero.
              </div>
            </div>
            <div className="chip" style={{ fontSize: '12px' }}>
              {etrmCsvRows.length} fields · {etrmCsvRows.filter(r => !r.value).length} blank
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {etrmCsvRows.map(row => (
              <div
                key={row.header}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-subtier)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span className="eyebrow" style={{ fontSize: '12px' }}>{row.header}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, wordBreak: 'break-all', color: 'var(--color-text)' }}>
                  {row.value || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-view B: Raw CSV Payload */}
      {subView === 'RAW_CSV' && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            RFC 4180 CSV (UTF-8, CRLF). Map columns to your booking system before import:
          </div>
          <pre
            style={{
              margin: 0,
              padding: '12px',
              backgroundColor: 'var(--color-subtier)',
              border: '1px solid var(--color-divider)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.6,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {etrmCsv}
          </pre>
        </div>
      )}

      {/* Sub-view C: JSON Payload */}
      {subView === 'JSON' && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            padding: '16px',
          }}
        >
          <pre
            style={{
              margin: 0,
              padding: '12px',
              backgroundColor: 'var(--color-subtier)',
              border: '1px solid var(--color-divider)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.5,
              overflowX: 'auto',
              color: 'var(--color-accent)',
            }}
          >
            {etrmJsonStr}
          </pre>
        </div>
      )}
    </div>
  );
}
