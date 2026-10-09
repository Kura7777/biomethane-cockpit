import React from 'react';

export type DocumentTab = 'TERM_SHEET' | 'EFET_ANNEX' | 'ETRM_TICKET' | 'UDB_XML' | 'AUDIT_MEMO';

interface LegalPackageTabsStripProps {
  activeTab: DocumentTab;
  onTabChange: (tab: DocumentTab) => void;
  seal: string;
  copiedType: string | null;
  onCopySeal: () => void;
}

export function LegalPackageTabsStrip({
  activeTab,
  onTabChange,
  seal,
  copiedType,
  onCopySeal,
}: LegalPackageTabsStripProps) {
  return (
    <div
      className="lp-tabs"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        backgroundColor: 'var(--color-subtier)',
        borderBottom: '1px solid var(--color-divider)',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      {/* Main 5-Document Selector */}
      <div className="lp-tabs-chips" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`chip ${activeTab === 'TERM_SHEET' ? 'chip-a' : ''}`}
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: activeTab === 'TERM_SHEET' ? 800 : 600,
            border: activeTab === 'TERM_SHEET' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
          }}
          onClick={() => onTabChange('TERM_SHEET')}
        >
          📄 1. Indicative Term Sheet (PDF)
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'EFET_ANNEX' ? 'chip-a' : ''}`}
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: activeTab === 'EFET_ANNEX' ? 800 : 600,
            border: activeTab === 'EFET_ANNEX' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
          }}
          onClick={() => onTabChange('EFET_ANNEX')}
        >
          ⚖️ 2. Draft EFET Confirmation (PDF)
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'ETRM_TICKET' ? 'chip-a' : ''}`}
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: activeTab === 'ETRM_TICKET' ? 800 : 600,
            border: activeTab === 'ETRM_TICKET' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
          }}
          onClick={() => onTabChange('ETRM_TICKET')}
        >
          💾 3. Deal Record (CSV &amp; JSON)
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'UDB_XML' ? 'chip-a' : ''}`}
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: activeTab === 'UDB_XML' ? 800 : 600,
            border: activeTab === 'UDB_XML' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
          }}
          onClick={() => onTabChange('UDB_XML')}
        >
          🌐 4. UDB Worksheet (XML)
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'AUDIT_MEMO' ? 'chip-a' : ''}`}
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: activeTab === 'AUDIT_MEMO' ? 800 : 600,
            border: activeTab === 'AUDIT_MEMO' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
          }}
          onClick={() => onTabChange('AUDIT_MEMO')}
        >
          🛡️ 5. Regulatory Pre-Screen (PDF)
        </button>
      </div>

      {/* Cryptographic SHA-256 Audit Seal Strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
        <span style={{ color: 'var(--color-muted)', fontWeight: 600 }} title="Change-detection fingerprint over the material terms; not a signature or registry seal">Fingerprint:</span>
        <code
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            backgroundColor: 'var(--color-surface)',
            padding: '3px 8px',
            border: '1px solid var(--color-divider)',
            color: 'var(--color-accent)',
            fontSize: '12px',
          }}
          title={seal}
        >
          {seal.slice(0, 20)}...
        </code>
        <button
          type="button"
          className="chip"
          style={{ fontSize: '12px', padding: '3px 8px', cursor: 'pointer' }}
          onClick={onCopySeal}
        >
          {copiedType === 'Fingerprint' ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
