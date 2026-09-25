import React, { useState, useMemo, useEffect } from 'react';
import { TradeAssessment } from '../../domain/trade/types';
import { 
  generateEfetBiomethaneAnnexPdf, 
  generateCommercialTermSheetPdf,
  generateStatutoryAuditMemoPdf,
  generateFpMLDealPayload, 
  generateEtrmJsonPayload, 
  generateEtrmCsvPayload,
  generateUdbNominationXmlPayload,
  calculateTradeIntegritySeal,
  downloadDealFile,
  inferDeskRole,
  resolveParties,
  describePricing,
  annexClassificationLabel,
  chainOfCustodyLabel,
  environmentalAttributeLabel,
  TBA,
  DeskRole,
  LegalAnnexOptions
} from '../../domain/trade/legalPackage';
import { MARKETS } from '../../domain/markets/registry';
import { useAuth } from '../../shared/auth/useAuth';
import { apiClient } from '../../domain/api/client';
import { deskSync } from '../../domain/sync/deskSync';
import { showToast } from '../../app/DeskToastContainer';

export type DocumentTab = 'TERM_SHEET' | 'EFET_ANNEX' | 'ETRM_TICKET' | 'UDB_XML' | 'AUDIT_MEMO';

interface LegalPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: TradeAssessment;
  initialTab?: DocumentTab;
}

export function LegalPackageModal({ isOpen, onClose, assessment, initialTab }: LegalPackageModalProps) {
  const [activeTab, setActiveTab] = useState<DocumentTab>(initialTab || 'TERM_SHEET');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [termSheetSubView, setTermSheetSubView] = useState<'STRUCTURED' | 'PDF'>('STRUCTURED');
  const [efetSubView, setEfetSubView] = useState<'STRUCTURED' | 'PDF'>('STRUCTURED');
  const [auditMemoSubView, setAuditMemoSubView] = useState<'STRUCTURED' | 'PDF'>('STRUCTURED');
  const [etrmSubView, setEtrmSubView] = useState<'TABLE' | 'RAW_CSV' | 'JSON'>('TABLE');
  const [udbSubView, setUdbSubView] = useState<'SUMMARY' | 'RAW_XML'>('SUMMARY');

  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [signoffRecord, setSignoffRecord] = useState<{ signedBy: string; timestamp: string } | null>(null);
  
  // Contract terms the desk must supply. Nothing is defaulted to a real-looking value:
  // blanks render as bracketed placeholders on every document.
  const [deskRole, setDeskRole] = useState<DeskRole>(() => (assessment ? inferDeskRole(assessment) : 'SELLER'));
  const [deskEntity, setDeskEntity] = useState('');
  const [counterpartyName, setCounterpartyName] = useState(assessment?.consignment?.counterparty ?? '');
  const [governingLaw, setGoverningLaw] = useState<'ENGLISH_LAW' | 'GERMAN_LAW'>('ENGLISH_LAW');
  const [masterAgreementDate, setMasterAgreementDate] = useState('');

  const { can, user } = useAuth();

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Re-derive direction and counterparty when a different deal is opened
  useEffect(() => {
    if (!assessment) return;
    setDeskRole(inferDeskRole(assessment));
    setCounterpartyName(assessment.consignment.counterparty ?? '');
  }, [assessment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const parties = useMemo(() => {
    if (!assessment) return null;
    const withCounterparty = { ...assessment, consignment: { ...assessment.consignment, counterparty: counterpartyName } };
    return resolveParties(withCounterparty, { deskRole, tradingDeskEntity: deskEntity });
  }, [assessment, counterpartyName, deskRole, deskEntity]);

  const sellerName = parties?.seller ?? '';
  const buyerName = parties?.buyer ?? '';

  const legalOptions: LegalAnnexOptions = useMemo(() => ({
    deskRole,
    tradingDeskEntity: deskEntity,
    sellerName,
    buyerName,
    governingLaw,
    masterAgreementDate,
  }), [deskRole, deskEntity, sellerName, buyerName, governingLaw, masterAgreementDate]);

  const seal = useMemo(() => {
    if (!assessment) return '';
    return calculateTradeIntegritySeal(assessment);
  }, [assessment]);

  // Document 1: Commercial Term Sheet PDF blob
  const [termSheetPdfBlobUrl, setTermSheetPdfBlobUrl] = useState<string>('');

  // Document 2: EFET Biomethane Annex PDF blob
  const [efetPdfBlobUrl, setEfetPdfBlobUrl] = useState<string>('');

  // Document 5: Statutory Audit Memo PDF blob
  const [auditMemoPdfBlobUrl, setAuditMemoPdfBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !assessment) {
      setTermSheetPdfBlobUrl('');
      setEfetPdfBlobUrl('');
      setAuditMemoPdfBlobUrl('');
      return;
    }
    try {
      const tsDoc = generateCommercialTermSheetPdf(assessment, legalOptions);
      const tsBlob = tsDoc.output('blob');
      const tsUrl = URL.createObjectURL(tsBlob);
      setTermSheetPdfBlobUrl(tsUrl);

      const efetDoc = generateEfetBiomethaneAnnexPdf(assessment, legalOptions);
      const efetBlob = efetDoc.output('blob');
      const efetUrl = URL.createObjectURL(efetBlob);
      setEfetPdfBlobUrl(efetUrl);

      const auditDoc = generateStatutoryAuditMemoPdf(assessment, legalOptions);
      const auditBlob = auditDoc.output('blob');
      const auditUrl = URL.createObjectURL(auditBlob);
      setAuditMemoPdfBlobUrl(auditUrl);

      return () => {
        URL.revokeObjectURL(tsUrl);
        URL.revokeObjectURL(efetUrl);
        URL.revokeObjectURL(auditUrl);
      };
    } catch (e) {
      console.error('Failed to generate PDF preview blobs:', e);
    }
  }, [isOpen, assessment, legalOptions]);

  // Document 3: ETRM CSV & JSON payloads
  const etrmCsv = useMemo(() => {
    if (!assessment) return '';
    return generateEtrmCsvPayload(assessment, legalOptions);
  }, [assessment, legalOptions]);

  const etrmJson = useMemo(() => {
    if (!assessment) return {};
    return generateEtrmJsonPayload(assessment, legalOptions);
  }, [assessment, legalOptions]);

  const etrmJsonStr = useMemo(() => {
    return JSON.stringify(etrmJson, null, 2);
  }, [etrmJson]);

  // Document 3 parsed table rows
  const etrmCsvRows = useMemo(() => {
    if (!etrmCsv) return [];
    const lines = etrmCsv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
    
    // Parse CSV line handling quotes
    const parseLine = (line: string) => {
      const items: string[] = [];
      let field = '';
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quoted) {
          if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
          else if (ch === '"') quoted = false;
          else field += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { items.push(field); field = ''; }
        else field += ch;
      }
      items.push(field);
      return items;
    };
    
    const values = parseLine(lines[1]);
    return headers.map((h, i) => ({ header: h, value: values[i] ?? '' }));
  }, [etrmCsv]);

  // Document 4: UDB Mass Balance XML payload
  const udbXml = useMemo(() => {
    if (!assessment) return '';
    return generateUdbNominationXmlPayload(assessment, legalOptions);
  }, [assessment, legalOptions]);

  if (!isOpen || !assessment) return null;

  const c = assessment.consignment;
  const nb = assessment.netback;
  const targetMarket = MARKETS.find(m => m.id === assessment.targetMarketId) || {
    name: assessment.targetMarketName,
    registry: 'Union Database (UDB)',
    country: assessment.targetMarketId.slice(0, 2),
    unitLabel: '€/tCO₂e',
  };

  const volumeLabel = c.volumeMWh != null ? `${c.volumeMWh.toLocaleString()} MWh` : TBA;
  const gasPrice = assessment.marks.gasIndex.mid ?? 0;
  const certVal = nb.certificateValue?.valueEurPerMWh ?? 0;
  const totalDelivered = gasPrice + certVal;
  const deskMargin = nb.deskMargin ?? 0;
  const pricingLines = describePricing(assessment, deskRole);
  const attributeLabel = environmentalAttributeLabel(MARKETS.find(m => m.id === assessment.targetMarketId), assessment.targetMarketId);
  const dp = c.deliveryPeriod;
  const deliveryPeriodLabel = dp?.startDate && dp?.endDate ? `${dp.startDate} to ${dp.endDate}` : TBA;
  const deliveryPointLabel = dp?.deliveryPointVtp || `${c.injectionCountry} virtual trading point ${TBA}`;
  const originLabel = c.originPlantName || c.name || TBA;
  const isBlocked = assessment.eligibility.overallVerdict === 'HARD_BLOCK';

  const handleCopy = (text: string, type: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {
      // safe fallback
    }
    setCopiedType(type);
    showToast(`Copied ${type} to clipboard`);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadTermSheetPdf = () => {
    try {
      const doc = generateCommercialTermSheetPdf(assessment, legalOptions);
      const filename = `Indicative-TermSheet-${assessment.id}-${assessment.targetMarketId}.pdf`;
      doc.save(filename);
      showToast(`Indicative term sheet downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate Commercial Term Sheet PDF');
    }
  };

  const handleDownloadEfetPdf = () => {
    try {
      const doc = generateEfetBiomethaneAnnexPdf(assessment, legalOptions);
      const filename = `Draft-Confirmation-${assessment.id}-${assessment.targetMarketId}.pdf`;
      doc.save(filename);
      showToast(`Draft confirmation downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate EFET Annex PDF');
    }
  };

  const handleDownloadEtrmCsv = () => {
    try {
      const filename = `DealRecord-${assessment.id}.csv`;
      downloadDealFile(filename, etrmCsv, 'text/csv;charset=utf-8');
      showToast(`Deal record CSV downloaded`);
    } catch {
      showToast('Failed to generate ETRM CSV');
    }
  };

  const handleDownloadJson = () => {
    const filename = `DealRecord-${assessment.id}-${assessment.targetMarketId}.json`;
    downloadDealFile(filename, etrmJsonStr, 'application/json;charset=utf-8');
    showToast(`Deal record JSON downloaded`);
  };

  const handleDownloadUdbXml = () => {
    try {
      const filename = `UDB-Worksheet-${assessment.id}.xml`;
      downloadDealFile(filename, udbXml, 'application/xml;charset=utf-8');
      showToast(`UDB worksheet downloaded`);
    } catch {
      showToast('Failed to generate UDB XML');
    }
  };

  const handleDownloadAuditMemoPdf = () => {
    try {
      const doc = generateStatutoryAuditMemoPdf(assessment, legalOptions);
      const filename = `PreScreen-${assessment.id}-${assessment.targetMarketId}.pdf`;
      doc.save(filename);
      showToast(`Pre-screen memo downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate Statutory Audit Memo PDF');
    }
  };

  const handleDownloadCompletePackage = () => {
    handleDownloadTermSheetPdf();
    handleDownloadEfetPdf();
    handleDownloadEtrmCsv();
    handleDownloadUdbXml();
    handleDownloadAuditMemoPdf();
    showToast('All 5 draft documents downloaded');
  };

  const handleComplianceSignoff = () => {
    if (!can('COMPLIANCE_SIGNOFF')) {
      alert(`Statutory compliance sign-off requires COMPLIANCE_OFFICER permission. Switch role in Header.`);
      return;
    }
    const now = new Date().toISOString();
    setSignoffRecord({
      signedBy: user.name,
      timestamp: now,
    });
    apiClient.transitionDeal(
      assessment.id,
      'PRICED',
      user.name,
      user.role,
      `Compliance review recorded by ${user.name} (${user.role})`
    ).catch(() => {});
    deskSync.broadcastDealTransitioned(assessment.id, null, 'PRICED');
    showToast(`Compliance review recorded by ${user.name}`);
  };

  const termsPanel = (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-divider)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        alignItems: 'end',
      }}
    >
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Desk side</label>
        <select
          className="input"
          value={deskRole}
          onChange={e => setDeskRole(e.target.value as DeskRole)}
          style={{ width: '100%', fontSize: '11px' }}
        >
          <option value="BUYER">Desk buys (offtake from producer)</option>
          <option value="SELLER">Desk sells (to offtaker)</option>
        </select>
      </div>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Desk legal entity</label>
        <input
          type="text"
          className="input"
          value={deskEntity}
          placeholder="[DESK LEGAL ENTITY]"
          onChange={e => setDeskEntity(e.target.value)}
          style={{ width: '100%', fontSize: '11px' }}
        />
      </div>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Counterparty legal entity</label>
        <input
          type="text"
          className="input"
          value={counterpartyName}
          placeholder="[COUNTERPARTY LEGAL ENTITY]"
          onChange={e => setCounterpartyName(e.target.value)}
          style={{ width: '100%', fontSize: '11px' }}
        />
      </div>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Governing law</label>
        <select
          className="input"
          value={governingLaw}
          onChange={e => setGoverningLaw(e.target.value as 'ENGLISH_LAW' | 'GERMAN_LAW')}
          style={{ width: '100%', fontSize: '11px' }}
        >
          <option value="ENGLISH_LAW">English law</option>
          <option value="GERMAN_LAW">German law</option>
        </select>
      </div>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>EFET master agreement date</label>
        <input
          type="text"
          className="input"
          value={masterAgreementDate}
          placeholder={TBA}
          onChange={e => setMasterAgreementDate(e.target.value)}
          style={{ width: '100%', fontSize: '11px' }}
        />
      </div>
      <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--color-muted)' }}>
        Seller: <strong style={{ color: 'var(--color-text)' }}>{sellerName}</strong> · Buyer: <strong style={{ color: 'var(--color-text)' }}>{buyerName}</strong>. Blank fields print as bracketed placeholders — nothing is filled in for you.
      </div>
    </div>
  );

  const blockedBanner = isBlocked ? (
    <div style={{ padding: '10px 14px', border: '2px solid #dc2626', color: '#f87171', fontSize: '12px', fontWeight: 700 }}>
      NOT TRADEABLE AS STRUCTURED — {assessment.eligibility.summary}
    </div>
  ) : null;

  return (
    <div
      className="scrim noscroll"
      style={{
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Deal document drafts"
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: 'min(1240px, 100%)',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          borderRadius: '4px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ═════════ TOP HEADER BAR ═════════ */}
        <div
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
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-bg)',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
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
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Deal Document Drafts
              </h3>
            </div>
            <div style={{ fontSize: '12px', marginTop: '3px', color: 'var(--color-muted)' }}>
              Ref: <strong style={{ color: 'var(--color-text)' }}>{assessment.id}</strong> · Destination: <strong style={{ color: 'var(--color-text)' }}>{assessment.targetMarketName}</strong> · Volume: <strong style={{ color: 'var(--color-text)' }}>{volumeLabel}</strong> · Indicative delivered (desk marks): <strong style={{ color: 'var(--color-accent)' }}>€{totalDelivered.toFixed(2)}/MWh</strong>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              onClick={handleDownloadCompletePackage}
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
              Esc ✕
            </button>
          </div>
        </div>

        {/* ═════════ 5-DOCUMENT REVIEW TABS STRIP ═════════ */}
        <div
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
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`chip ${activeTab === 'TERM_SHEET' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontWeight: activeTab === 'TERM_SHEET' ? 800 : 600,
                border: activeTab === 'TERM_SHEET' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
              }}
              onClick={() => setActiveTab('TERM_SHEET')}
            >
              📄 1. Indicative Term Sheet (PDF)
            </button>
            <button
              type="button"
              className={`chip ${activeTab === 'EFET_ANNEX' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontWeight: activeTab === 'EFET_ANNEX' ? 800 : 600,
                border: activeTab === 'EFET_ANNEX' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
              }}
              onClick={() => setActiveTab('EFET_ANNEX')}
            >
              ⚖️ 2. Draft EFET Confirmation (PDF)
            </button>
            <button
              type="button"
              className={`chip ${activeTab === 'ETRM_TICKET' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontWeight: activeTab === 'ETRM_TICKET' ? 800 : 600,
                border: activeTab === 'ETRM_TICKET' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
              }}
              onClick={() => setActiveTab('ETRM_TICKET')}
            >
              💾 3. Deal Record (CSV &amp; JSON)
            </button>
            <button
              type="button"
              className={`chip ${activeTab === 'UDB_XML' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontWeight: activeTab === 'UDB_XML' ? 800 : 600,
                border: activeTab === 'UDB_XML' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
              }}
              onClick={() => setActiveTab('UDB_XML')}
            >
              🌐 4. UDB Worksheet (XML)
            </button>
            <button
              type="button"
              className={`chip ${activeTab === 'AUDIT_MEMO' ? 'chip-a' : ''}`}
              style={{
                fontSize: '11px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontWeight: activeTab === 'AUDIT_MEMO' ? 800 : 600,
                border: activeTab === 'AUDIT_MEMO' ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
              }}
              onClick={() => setActiveTab('AUDIT_MEMO')}
            >
              🛡️ 5. Regulatory Pre-Screen (PDF)
            </button>
          </div>

          {/* Cryptographic SHA-256 Audit Seal Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <span style={{ color: 'var(--color-muted)', fontWeight: 600 }} title="Change-detection fingerprint over the material terms; not a signature or registry seal">Fingerprint:</span>
            <code
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                backgroundColor: 'var(--color-surface)',
                padding: '3px 8px',
                border: '1px solid var(--color-divider)',
                color: 'var(--color-accent)',
                fontSize: '10px',
              }}
              title={seal}
            >
              {seal.slice(0, 20)}...
            </code>
            <button
              type="button"
              className="chip"
              style={{ fontSize: '10px', padding: '3px 8px', cursor: 'pointer' }}
              onClick={() => handleCopy(seal, 'Fingerprint')}
            >
              {copiedType === 'Fingerprint' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* ═════════ DOCUMENT CONTENT & PREVIEW CANVAS ═════════ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ══════════════════════════════════════════════════════════════
              DOCUMENT 1: COMMERCIAL TRANSACTION TERM SHEET (PDF)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'TERM_SHEET' && (
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
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                    Document 1 Review:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={`btn ${termSheetSubView === 'STRUCTURED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setTermSheetSubView('STRUCTURED')}
                    >
                      📋 Interactive Document Review
                    </button>
                    <button
                      type="button"
                      className={`btn ${termSheetSubView === 'PDF' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setTermSheetSubView('PDF')}
                    >
                      👁️ Live A4 PDF View
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={handleDownloadTermSheetPdf}
                  >
                    <span>⬇️</span>
                    <span>Download Term Sheet (PDF)</span>
                  </button>
                </div>
              </div>

              {termsPanel}
              {blockedBanner}

              {/* Sub-view A: Interactive Document Review */}
              {termSheetSubView === 'STRUCTURED' ? (
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '2px solid var(--color-divider)',
                    padding: '32px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '22px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Header Banner */}
                  <div style={{ borderBottom: '3px solid var(--color-text)', paddingBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                      Indicative Term Sheet
                    </div>
                    <h2 style={{ margin: '4px 0 2px', fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Biomethane &amp; Environmental Attribute Supply
                    </h2>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      Non-binding · Subject to contract · Delivery period: {deliveryPeriodLabel}
                    </div>
                  </div>

                  {/* Identification Overview */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-subtier)',
                      border: '1px solid var(--color-divider)',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <span className="eyebrow">Deal Reference</span>
                      <div style={{ fontWeight: 800, marginTop: '2px' }}>{assessment.id}</div>
                    </div>
                    <div>
                      <span className="eyebrow">Date</span>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>{assessment.createdAt.slice(0, 10)}</div>
                    </div>
                    <div>
                      <span className="eyebrow">Buyer</span>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>{buyerName}</div>
                    </div>
                    <div>
                      <span className="eyebrow">Seller</span>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>{sellerName}</div>
                    </div>
                  </div>

                  {/* Section 1: Commodity Specifications */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      1. Commodity &amp; Volume Specifications
                    </h4>
                    <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>Commodity Standard</td>
                          <td>Biomethane injected to the gas grid; quality per the grid entry specification (EN 16723-1 reference)</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Contract Volume</td>
                          <td><strong>{volumeLabel}</strong> · profile: {dp?.deliveryProfile ? dp.deliveryProfile.replace(/_/g, ' ').toLowerCase() : TBA}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Origin Facility</td>
                          <td>{originLabel} ({c.originCountryName} - {c.originCountry})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Delivery Point (VTP)</td>
                          <td>{deliveryPointLabel}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Feedstock Substrate</td>
                          <td>{c.feedstockName} · {annexClassificationLabel(c.annexClassification)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Carbon Intensity</td>
                          <td><strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong> declared; to be evidenced by the Proof of Sustainability</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Chain of Custody</td>
                          <td>{chainOfCustodyLabel(c.chainOfCustody)} under {c.certificationScheme.replace(/_/g, ' ')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2: Commercial Pricing Formula */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      2. Price
                    </h4>
                    <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        {pricingLines.map((line, i) => (
                          <tr key={i}>
                            <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>{i === 0 ? 'Price basis' : ''}</td>
                            <td>{line}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Environmental Attribute</td>
                          <td>{attributeLabel} · destination {assessment.targetMarketName}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Carbon-Intensity Adjustment</td>
                          <td>{TBA}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Volume Tolerance / Shortfall</td>
                          <td>{TBA}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 3: Registry Transfer Undertaking */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      3. Sustainability Evidence (points to agree)
                    </h4>
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-subtier)',
                        border: '1px solid var(--color-divider)',
                        fontSize: '12px',
                        lineHeight: 1.6,
                      }}
                    >
                      Transfer of {attributeLabel} via {targetMarket.registry || TBA}; transfer deadline {TBA}. Seller to warrant that the attributes have not been claimed elsewhere, including under national support schemes, and to disclose any support received. Remedies for late or invalid evidence {TBA}.
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
                    Indicative only. Not an offer capable of acceptance; no binding obligation arises until a definitive agreement is executed by both parties. Prices reflect desk marks on {assessment.createdAt.slice(0, 10)} and will move.
                  </div>

                  {/* Audit Seal Strip */}
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-subtier)',
                      border: '1px solid var(--color-divider)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Document fingerprint: {seal}
                  </div>
                </div>
              ) : (
                /* Sub-view B: Live PDF Iframe */
                <div style={{ width: '100%', height: '620px', border: '1px solid var(--color-divider)' }}>
                  {termSheetPdfBlobUrl ? (
                    <iframe
                      src={termSheetPdfBlobUrl}
                      title="Commercial Term Sheet PDF Preview"
                      style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#525659' }}
                    />
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Rendering PDF Stream...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              DOCUMENT 2: EFET BIOMETHANE ANNEX (PDF)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'EFET_ANNEX' && (
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
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                    Document 2 Review:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={`btn ${efetSubView === 'STRUCTURED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setEfetSubView('STRUCTURED')}
                    >
                      📋 Structured Review
                    </button>
                    <button
                      type="button"
                      className={`btn ${efetSubView === 'PDF' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setEfetSubView('PDF')}
                    >
                      👁️ Live A4 PDF View
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={handleDownloadEfetPdf}
                  >
                    <span>⬇️</span>
                    <span>Download Draft Confirmation (PDF)</span>
                  </button>
                </div>
              </div>

              {termsPanel}
              {blockedBanner}

              {/* Sub-view A: EFET Structured Clauses */}
              {efetSubView === 'STRUCTURED' ? (
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '2px solid var(--color-divider)',
                    padding: '32px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ borderBottom: '3px solid var(--color-text)', paddingBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                      Draft — for negotiation
                    </div>
                    <h2 style={{ margin: '4px 0 2px', fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Draft Individual Transaction Confirmation
                    </h2>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      To be read with the EFET General Agreement (Natural Gas) between the parties dated {masterAgreementDate.trim() || TBA} · {governingLaw === 'ENGLISH_LAW' ? 'English law' : 'German law'}
                    </div>
                  </div>

                  {/* Section 1: Contracting Parties */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                      1. Contracting Parties &amp; Facility Attribution
                    </h4>
                    <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '25%', fontWeight: 700 }}>Party A (Seller)</td>
                          <td style={{ width: '25%' }}>{sellerName}</td>
                          <td style={{ width: '25%', fontWeight: 700 }}>Origin Facility</td>
                          <td style={{ width: '25%' }}>{originLabel}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Party B (Buyer)</td>
                          <td>{buyerName}</td>
                          <td style={{ fontWeight: 700 }}>Origin Country</td>
                          <td>{c.originCountryName} ({c.originCountry})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Interconnection Point</td>
                          <td>{deliveryPointLabel}</td>
                          <td style={{ fontWeight: 700 }}>Feedstock Category</td>
                          <td>{c.feedstockName} ({annexClassificationLabel(c.annexClassification)})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Registry System</td>
                          <td>{targetMarket.registry || TBA}</td>
                          <td style={{ fontWeight: 700 }}>Sustainability Scheme</td>
                          <td>{c.certificationScheme.replace(/_/g, ' ')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2: Leg A - Physical Delivery */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                      2. Leg A: Physical Gas Molecule Delivery Terms
                    </h4>
                    <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>Delivery Point (VTP)</td>
                          <td>{deliveryPointLabel}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Contract Energy Volume</td>
                          <td><strong>{volumeLabel}</strong> · delivery period {deliveryPeriodLabel}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Contract Price</td>
                          <td>{pricingLines.join(' ')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 3: Leg B - Certificate Transfer */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                      3. Leg B: Environmental Attribute &amp; Certificate Delivery Terms
                    </h4>
                    <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>Target Compliance Destination</td>
                          <td><strong>{assessment.targetMarketName}</strong> ({targetMarket.unitLabel})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Attribute Delivered</td>
                          <td>{attributeLabel}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Carbon Intensity</td>
                          <td><strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong> declared; to be evidenced by the Proof of Sustainability</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 4: Execution */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '10px' }}>
                    <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>For: {sellerName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Signature {TBA} — draft, not for execution</div>
                    </div>
                    <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>For: {buyerName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Signature {TBA} — draft, not for execution</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Sub-view B: Live EFET PDF Iframe */
                <div style={{ width: '100%', height: '620px', border: '1px solid var(--color-divider)' }}>
                  {efetPdfBlobUrl ? (
                    <iframe
                      src={efetPdfBlobUrl}
                      title="EFET Biomethane Annex PDF Preview"
                      style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#525659' }}
                    />
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Rendering PDF Stream...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              DOCUMENT 3: ETRM DEAL TICKET (CSV & JSON)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'ETRM_TICKET' && (
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
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                    Document 3 Review:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={`btn ${etrmSubView === 'TABLE' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setEtrmSubView('TABLE')}
                    >
                      📊 Deal Fields Table
                    </button>
                    <button
                      type="button"
                      className={`btn ${etrmSubView === 'RAW_CSV' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setEtrmSubView('RAW_CSV')}
                    >
                      📝 Raw CSV
                    </button>
                    <button
                      type="button"
                      className={`btn ${etrmSubView === 'JSON' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setEtrmSubView('JSON')}
                    >
                      🔧 JSON
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    onClick={() => handleCopy(etrmSubView === 'JSON' ? etrmJsonStr : etrmCsv, etrmSubView === 'JSON' ? 'JSON' : 'CSV')}
                  >
                    {copiedType === 'CSV' || copiedType === 'JSON' ? '✓ Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={handleDownloadEtrmCsv}
                  >
                    <span>⬇️</span>
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '11px' }}
                    onClick={handleDownloadJson}
                  >
                    Download JSON
                  </button>
                </div>
              </div>

              {/* Sub-view A: Formatted Table Review */}
              {etrmSubView === 'TABLE' && (
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
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, textTransform: 'uppercase' }}>
                        Generic Deal Record
                      </h4>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        Generic internal format — map fields explicitly before importing into any ETRM. Blank values are unknown, not zero.
                      </div>
                    </div>
                    <div className="chip" style={{ fontSize: '11px' }}>
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
                        <span className="eyebrow" style={{ fontSize: '10px' }}>{row.header}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, wordBreak: 'break-all', color: 'var(--color-text)' }}>
                          {row.value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-view B: Raw CSV Payload */}
              {etrmSubView === 'RAW_CSV' && (
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
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                    RFC 4180 CSV (UTF-8, CRLF). Map columns to your booking system before import:
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '12px',
                      backgroundColor: 'var(--color-subtier)',
                      border: '1px solid var(--color-divider)',
                      fontSize: '11px',
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
              {etrmSubView === 'JSON' && (
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
                      fontSize: '11px',
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
          )}

          {/* ══════════════════════════════════════════════════════════════
              DOCUMENT 4: UDB MASS BALANCE NOMINATION (XML)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'UDB_XML' && (
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
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                    Document 4 Review:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={`btn ${udbSubView === 'SUMMARY' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setUdbSubView('SUMMARY')}
                    >
                      📑 Worksheet Summary
                    </button>
                    <button
                      type="button"
                      className={`btn ${udbSubView === 'RAW_XML' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setUdbSubView('RAW_XML')}
                    >
                      💻 Raw XML
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    onClick={() => handleCopy(udbXml, 'UDB XML')}
                  >
                    {copiedType === 'UDB XML' ? '✓ Copied' : 'Copy XML'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={handleDownloadUdbXml}
                  >
                    <span>⬇️</span>
                    <span>Download Worksheet XML</span>
                  </button>
                </div>
              </div>

              {/* Sub-view A: UDB Nomination Summary Cards */}
              {udbSubView === 'SUMMARY' && (
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                  }}
                >
                  <div style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, textTransform: 'uppercase' }}>
                      Internal UDB Transfer Worksheet
                    </h4>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      Checklist of what the UDB transfer will need. Not a UDB message format — the transfer itself is made in the Union Database by the account holders.
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    
                    {/* Header & Operators Card */}
                    <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div className="eyebrow" style={{ marginBottom: '8px' }}>Transaction Header</div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Deal ref: <strong>{assessment.id}</strong></div>
                        <div>Transferor UDB account: <strong>{sellerName} — [UDB ACCOUNT ID]</strong></div>
                        <div>Transferee UDB account: <strong>{buyerName} — [UDB ACCOUNT ID]</strong></div>
                        <div>Basis: <strong>Directive (EU) 2018/2001 as amended by 2023/2413</strong></div>
                      </div>
                    </div>

                    {/* Facility & Injection Card */}
                    <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div className="eyebrow" style={{ marginBottom: '8px' }}>Origin Facility &amp; Grid Point</div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Facility: <strong>{originLabel}</strong></div>
                        <div>Origin Country: <strong>{c.originCountry}</strong></div>
                        <div>Injection country: <strong>{c.injectionCountry}</strong></div>
                        <div>Injection point EIC: <strong>[FROM GRID OPERATOR]</strong></div>
                      </div>
                    </div>

                    {/* Proof of Sustainability Card */}
                    <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div className="eyebrow" style={{ marginBottom: '8px' }}>Proof of Sustainability (PoS)</div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>PoS number: <strong>[ISSUED BY CERTIFICATION SCHEME]</strong> (status {c.posStatus})</div>
                        <div>Scheme: <strong>{c.certificationScheme}</strong></div>
                        <div>Classification: <strong>{annexClassificationLabel(c.annexClassification)}</strong></div>
                        <div>Carbon Intensity: <strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong></div>
                      </div>
                    </div>

                    {/* Transfer Batch Card */}
                    <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div className="eyebrow" style={{ marginBottom: '8px' }}>Mass Balance Transfer Batch</div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Energy Quantity: <strong>{volumeLabel}</strong></div>
                        <div>Destination: <strong>{assessment.targetMarketName}</strong></div>
                        <div>Delivery period: <strong>{deliveryPeriodLabel}</strong></div>
                        <div>UDB status: <strong>{c.udbStatus}</strong></div>
                      </div>
                    </div>

                  </div>

                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    Document fingerprint: {seal}
                  </div>
                </div>
              )}

              {/* Sub-view B: Raw XML Code Block */}
              {udbSubView === 'RAW_XML' && (
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
                      padding: '14px',
                      backgroundColor: 'var(--color-subtier)',
                      border: '1px solid var(--color-divider)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1.5,
                      overflowX: 'auto',
                      color: 'var(--color-text)',
                    }}
                  >
                    {udbXml}
                  </pre>
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
             DOCUMENT 5: STATUTORY AUDIT MEMORANDUM (PDF & STRUCTURED)
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'AUDIT_MEMO' && (
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
                      className={`seg-opt ${auditMemoSubView === 'STRUCTURED' ? 'active' : ''}`}
                      style={{ fontSize: '11px', padding: '2px 12px' }}
                      onClick={() => setAuditMemoSubView('STRUCTURED')}
                    >
                      📋 Structured Review
                    </button>
                    <button
                      type="button"
                      className={`seg-opt ${auditMemoSubView === 'PDF' ? 'active' : ''}`}
                      style={{ fontSize: '11px', padding: '2px 12px' }}
                      onClick={() => setAuditMemoSubView('PDF')}
                    >
                      📄 PDF Preview
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => {
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
                      navigator.clipboard?.writeText(memoText).catch(() => {});
                      setCopiedType('AUDIT_MEMO');
                      showToast('Pre-screen summary copied to clipboard');
                      setTimeout(() => setCopiedType(null), 2000);
                    }}
                  >
                    <span>{copiedType === 'AUDIT_MEMO' ? '✓' : '📋'}</span>
                    <span>{copiedType === 'AUDIT_MEMO' ? 'Copied' : 'Copy Summary'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                    onClick={handleDownloadAuditMemoPdf}
                  >
                    <span>📥</span>
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Sub-view A: Structured Audit Review */}
              {auditMemoSubView === 'STRUCTURED' && (
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
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, textTransform: 'uppercase' }}>
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
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: assessment.eligibility.overallVerdict === 'ELIGIBLE' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                        color: assessment.eligibility.overallVerdict === 'ELIGIBLE' ? '#10b981' : '#f87171',
                        border: `1px solid ${assessment.eligibility.overallVerdict === 'ELIGIBLE' ? '#059669' : '#dc2626'}`,
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
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor: g.verdict === 'PASS' ? '#065f46' : g.verdict === 'HARD_BLOCK' ? '#991b1b' : '#92400e',
                              color: '#ffffff',
                            }}
                          >
                            {g.verdict}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-text)' }}>
                              Gate {idx + 1}: {g.gateLabel}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '2px' }}>
                              {g.reason}
                            </div>
                            {g.citations && g.citations[0] && (
                              <div style={{ fontSize: '10.5px', color: 'var(--color-accent)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
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
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--color-text)', lineHeight: 1.6 }}>
                      <li><strong>Evidence deadline:</strong> when the PoS / UDB transfer must land after each delivery month.</li>
                      <li><strong>Late or invalid evidence:</strong> cure period, then price reduction or termination of the attribute leg.</li>
                      <li><strong>Support-scheme warranty:</strong> seller discloses national support received (e.g. SDE++, EEG, GSE) and warrants no double claim.</li>
                    </ul>
                  </div>

                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    Document fingerprint: {seal}
                  </div>
                </div>
              )}

              {/* Sub-view B: PDF Preview */}
              {auditMemoSubView === 'PDF' && (
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    padding: '8px',
                  }}
                >
                  {auditMemoPdfBlobUrl ? (
                    <iframe
                      src={auditMemoPdfBlobUrl}
                      style={{
                        width: '100%',
                        height: '750px',
                        border: 'none',
                        backgroundColor: '#ffffff',
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
          )}

        </div>

        {/* ═════════ MODAL FOOTER BAR ═════════ */}
        <div
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
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            Ref: <strong style={{ color: 'var(--color-text)' }}>{assessment.id}</strong> · Volume: <strong style={{ color: 'var(--color-text)' }}>{volumeLabel}</strong> · Desk margin (internal): <strong style={{ color: 'var(--color-accent)' }}>€{deskMargin.toFixed(2)}/MWh</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {signoffRecord ? (
              <span
                className="chip"
                style={{
                  backgroundColor: 'var(--color-status-pos-bg)',
                  color: 'var(--color-status-pos-text)',
                  border: '1px solid var(--color-status-pos-border)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '5px 10px',
                }}
              >
                ✓ Compliance reviewed: {signoffRecord.signedBy} ({new Date(signoffRecord.timestamp).toLocaleTimeString()})
              </span>
            ) : can('COMPLIANCE_SIGNOFF') ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={handleComplianceSignoff}
                title="Record that compliance has reviewed this deal"
              >
                🛡️ Record Compliance Review
              </button>
            ) : null}

            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px' }}
              onClick={handleDownloadTermSheetPdf}
              title="Download Commercial Term Sheet PDF"
            >
              📄 Term Sheet PDF
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px' }}
              onClick={handleDownloadEfetPdf}
              title="Download EFET Biomethane Annex PDF"
            >
              ⚖️ Draft Confirmation PDF
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px' }}
              onClick={handleDownloadEtrmCsv}
              title="Download ETRM CSV Deal Ticket"
            >
              💾 Deal Record CSV
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px' }}
              onClick={handleDownloadUdbXml}
              title="Download UDB Mass Balance Nomination XML"
            >
              🌐 UDB Worksheet
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px' }}
              onClick={handleDownloadAuditMemoPdf}
              title="Download Statutory Compliance Audit Memo PDF"
            >
              🛡️ Pre-Screen PDF
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 800 }}
              onClick={handleDownloadCompletePackage}
              title="Download all 5 deal documents at once"
            >
              📦 Download All 5 Files
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
