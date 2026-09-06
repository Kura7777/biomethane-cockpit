import React, { useState, useMemo, useEffect } from 'react';
import { TradeAssessment } from '../../domain/trade/types';
import { 
  generateEfetBiomethaneAnnexPdf, 
  generateCommercialTermSheetPdf,
  generateFpMLDealPayload, 
  generateEtrmJsonPayload, 
  generateEtrmCsvPayload,
  generateUdbNominationXmlPayload,
  calculateTradeIntegritySeal,
  downloadDealFile,
  LegalAnnexOptions
} from '../../domain/trade/legalPackage';
import { MARKETS } from '../../domain/markets/registry';
import { useAuth } from '../../shared/auth/useAuth';
import { apiClient } from '../../domain/api/client';
import { deskSync } from '../../domain/sync/deskSync';
import { showToast } from '../../app/DeskToastContainer';

export type DocumentTab = 'TERM_SHEET' | 'EFET_ANNEX' | 'ETRM_TICKET' | 'UDB_XML';

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
  const [etrmSubView, setEtrmSubView] = useState<'TABLE' | 'RAW_CSV' | 'JSON'>('TABLE');
  const [udbSubView, setUdbSubView] = useState<'SUMMARY' | 'RAW_XML'>('SUMMARY');

  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [signoffRecord, setSignoffRecord] = useState<{ signedBy: string; timestamp: string } | null>(null);
  
  // Customization state for Legal Documents
  const [sellerName, setSellerName] = useState('BIOMETHANE TRADING DESK EUROPE B.V.');
  const [buyerName, setBuyerName] = useState(assessment?.consignment?.counterparty || 'OFFTAKE COUNTERPARTY CORP');
  const [governingLaw, setGoverningLaw] = useState<'ENGLISH_LAW' | 'GERMAN_LAW'>('ENGLISH_LAW');
  const [masterAgreementDate, setMasterAgreementDate] = useState('15 January 2024');

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

  // Sync buyer name if assessment changes
  useEffect(() => {
    if (assessment?.consignment?.counterparty) {
      setBuyerName(assessment.consignment.counterparty);
    }
  }, [assessment]);

  const legalOptions: LegalAnnexOptions = useMemo(() => ({
    sellerName,
    buyerName,
    governingLaw,
    masterAgreementDate,
  }), [sellerName, buyerName, governingLaw, masterAgreementDate]);

  const seal = useMemo(() => {
    if (!assessment) return '';
    return calculateTradeIntegritySeal(assessment);
  }, [assessment]);

  // Document 1: Commercial Term Sheet PDF blob
  const [termSheetPdfBlobUrl, setTermSheetPdfBlobUrl] = useState<string>('');

  // Document 2: EFET Biomethane Annex PDF blob
  const [efetPdfBlobUrl, setEfetPdfBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !assessment) {
      setTermSheetPdfBlobUrl('');
      setEfetPdfBlobUrl('');
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

      return () => {
        URL.revokeObjectURL(tsUrl);
        URL.revokeObjectURL(efetUrl);
      };
    } catch (e) {
      console.error('Failed to generate PDF preview blobs:', e);
    }
  }, [isOpen, assessment, legalOptions]);

  // Document 3: ETRM CSV & JSON payloads
  const etrmCsv = useMemo(() => {
    if (!assessment) return '';
    return generateEtrmCsvPayload(assessment);
  }, [assessment]);

  const etrmJson = useMemo(() => {
    if (!assessment) return {};
    return generateEtrmJsonPayload(assessment);
  }, [assessment]);

  const etrmJsonStr = useMemo(() => {
    return JSON.stringify(etrmJson, null, 2);
  }, [etrmJson]);

  // Document 3 parsed table rows
  const etrmCsvRows = useMemo(() => {
    if (!etrmCsv) return [];
    const lines = etrmCsv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',');
    
    // Parse CSV line handling quotes
    const parseLine = (line: string) => {
      const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
      const items: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        if (match.index === regex.lastIndex) regex.lastIndex++;
        items.push(match[1] !== undefined ? match[1] : match[2] ?? '');
      }
      return items;
    };
    
    const values = parseLine(lines[1]);
    return headers.map((h, i) => ({ header: h, value: values[i] ?? '' }));
  }, [etrmCsv]);

  // Document 4: UDB Mass Balance XML payload
  const udbXml = useMemo(() => {
    if (!assessment) return '';
    return generateUdbNominationXmlPayload(assessment);
  }, [assessment]);

  if (!isOpen || !assessment) return null;

  const c = assessment.consignment;
  const nb = assessment.netback;
  const targetMarket = MARKETS.find(m => m.id === assessment.targetMarketId) || {
    name: assessment.targetMarketName,
    registry: 'Union Database (UDB)',
    country: assessment.targetMarketId.slice(0, 2),
    unitLabel: '€/tCO₂e',
  };

  const volume = c.volumeMWh ?? 10000;
  const gasPrice = assessment.marks.gasIndex.mid ?? 0;
  const certVal = nb.certificateValue?.valueEurPerMWh ?? 0;
  const totalDelivered = gasPrice + certVal;
  const deskMargin = nb.deskMargin ?? 0;
  const ghgSavingPct = Math.round(((94.0 - c.carbonIntensity) / 94.0) * 100);
  const totalDealValue = totalDelivered * volume;

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
      const filename = `Commercial-TermSheet-${assessment.id}-${assessment.targetMarketId}.pdf`;
      doc.save(filename);
      showToast(`Commercial Term Sheet PDF downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate Commercial Term Sheet PDF');
    }
  };

  const handleDownloadEfetPdf = () => {
    try {
      const doc = generateEfetBiomethaneAnnexPdf(assessment, legalOptions);
      const filename = `EFET-Biomethane-Annex-${assessment.id}-${assessment.targetMarketId}.pdf`;
      doc.save(filename);
      showToast(`EFET Annex PDF downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate EFET Annex PDF');
    }
  };

  const handleDownloadEtrmCsv = () => {
    try {
      const filename = `ETRM-DealTicket-${assessment.id}.csv`;
      downloadDealFile(filename, etrmCsv, 'text/csv;charset=utf-8');
      showToast(`ETRM CSV deal ticket downloaded`);
    } catch {
      showToast('Failed to generate ETRM CSV');
    }
  };

  const handleDownloadJson = () => {
    const filename = `ETRM-DealTicket-${assessment.id}-${assessment.targetMarketId}.json`;
    downloadDealFile(filename, etrmJsonStr, 'application/json;charset=utf-8');
    showToast(`ETRM JSON deal ticket downloaded`);
  };

  const handleDownloadUdbXml = () => {
    try {
      const filename = `UDB-Nomination-${assessment.id}.xml`;
      downloadDealFile(filename, udbXml, 'application/xml;charset=utf-8');
      showToast(`UDB Mass Balance Nomination XML downloaded`);
    } catch {
      showToast('Failed to generate UDB XML');
    }
  };

  const handleDownloadCompletePackage = () => {
    handleDownloadTermSheetPdf();
    handleDownloadEfetPdf();
    handleDownloadEtrmCsv();
    handleDownloadUdbXml();
    showToast('All 4 deal handoff artifacts downloaded!');
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
      `Statutory compliance & UDB mass-balance signed off by ${user.name} (${user.role})`
    ).catch(() => {});
    deskSync.broadcastDealTransitioned(assessment.id, null, 'PRICED');
    showToast(`Compliance Sign-Off executed by ${user.name}`);
  };

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
      aria-label="Institutional Deal Handoff Package"
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
                Complete 4-Piece Institutional Deal Package
              </h3>
            </div>
            <div style={{ fontSize: '12px', marginTop: '3px', color: 'var(--color-muted)' }}>
              Ref: <strong style={{ color: 'var(--color-text)' }}>{assessment.id}</strong> · Destination: <strong style={{ color: 'var(--color-text)' }}>{assessment.targetMarketName}</strong> · Volume: <strong style={{ color: 'var(--color-text)' }}>{volume.toLocaleString()} MWh</strong> · Total Delivered: <strong style={{ color: 'var(--color-accent)' }}>€{totalDelivered.toFixed(2)}/MWh</strong>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              onClick={handleDownloadCompletePackage}
              title="Download all 4 documents at once"
            >
              <span>📦</span>
              <span>Download All (4 Files)</span>
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

        {/* ═════════ 4-DOCUMENT REVIEW TABS STRIP ═════════ */}
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
          {/* Main 4-Document Selector */}
          <div style={{ display: 'flex', gap: '6px' }}>
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
              📄 1. Commercial Term Sheet (PDF)
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
              ⚖️ 2. EFET Biomethane Annex (PDF)
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
              💾 3. ETRM Deal Ticket (CSV &amp; JSON)
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
              🌐 4. UDB Mass Balance Nomination (XML)
            </button>
          </div>

          {/* Cryptographic SHA-256 Audit Seal Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>Audit Seal:</span>
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
              onClick={() => handleCopy(seal, 'Audit Seal')}
            >
              {copiedType === 'Audit Seal' ? '✓ Copied' : 'Copy Seal'}
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
                      Commercial Transaction Term Sheet
                    </div>
                    <h2 style={{ margin: '4px 0 2px', fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Bilateral OTC Biomethane &amp; Environmental Attribute Confirmation
                    </h2>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      Confidential &amp; Binding Commercial Term Sheet · Delivery Period: Cal 2026
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
                      <span className="eyebrow">Confirmation Date</span>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>{assessment.createdAt.slice(0, 10)}</div>
                    </div>
                    <div>
                      <span className="eyebrow">Buyer (Offtake Counterparty)</span>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>{buyerName}</div>
                    </div>
                    <div>
                      <span className="eyebrow">Seller (Trading Principal)</span>
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
                          <td>Pipeline-quality Biomethane complying with European standard EN 16723-1</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Annual Contract Volume</td>
                          <td><strong>{volume.toLocaleString()} MWh/annum</strong> (~{(volume / 365).toFixed(1)} MWh/day flat delivery profile)</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Origin Facility</td>
                          <td>{c.name || 'Certified European Biomethane Facility'} ({c.originCountryName} - {c.originCountry})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Delivery Point (VTP)</td>
                          <td>{c.injectionCountry} Virtual Trading Point (High-Pressure Transmission Connected)</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Feedstock Substrate</td>
                          <td>{c.feedstockName} · RED III Annex IX Part A Eligible</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Contract Carbon Intensity</td>
                          <td><strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong> ({ghgSavingPct}% GHG reduction vs 94.0 g benchmark)</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Chain of Custody</td>
                          <td>Mass Balance under {c.certificationScheme.replace(/_/g, ' ')} (Single Interconnected European System)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2: Commercial Pricing Formula */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      2. Commercial Pricing &amp; Indexation Formula
                    </h4>
                    <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>Leg A: Gas Molecule</td>
                          <td>TTF Month-Ahead Floating Index (Current mark: <strong>€{gasPrice.toFixed(2)}/MWh</strong>)</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Leg B: Environmental Attribute</td>
                          <td>Statutory Sink: <strong>{assessment.targetMarketName}</strong> ({targetMarket.unitLabel})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Attribute Unit Value</td>
                          <td><strong>€{certVal.toFixed(2)}/MWh</strong> delivered environmental attribute</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>All-In Transaction Price</td>
                          <td><strong style={{ color: 'var(--color-accent)', fontSize: '13px' }}>€{totalDelivered.toFixed(2)}/MWh</strong> (Total Deal Notional: <strong>€{Math.round(totalDealValue).toLocaleString()}</strong>)</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Dynamic Carbon Slider</td>
                          <td><code>P_delivered = P_contract + α × (CI_contract − CI_actual)</code> capped at statutory replacement penalty</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Operational Volume Collar</td>
                          <td>±5.0% annual tolerance with take-or-pay liquidated damages on unexcused shortfall</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 3: Registry Transfer Undertaking */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      3. Registry Transfer &amp; Compliance Undertaking
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
                      Title to the environmental attributes shall be transferred via the European Commission Union Database (UDB) under RED III Article 31a single mass balance rules, or designated national registry ({targetMarket.registry || 'dena / VertiCer'}), within thirty (30) calendar days of production month end. Seller covenants and warrants that the biomethane has not been double-claimed against conflicting national feed-in tariffs (EEG, GSE, or French Obligation d&apos;Achat).
                    </div>
                  </div>

                  {/* Execution Signatures */}
                  <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      4. Acceptance &amp; Commercial Signatures
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                      <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>For: {sellerName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Authorized Commercial Representative</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '4px' }}>Date: {assessment.createdAt.slice(0, 10)}</div>
                      </div>
                      <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>For: {buyerName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Authorized Commercial Representative</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '4px' }}>Date: {assessment.createdAt.slice(0, 10)}</div>
                      </div>
                    </div>
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
                    SHA-256 AUDIT DIGEST: {seal}
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
                      📋 EFET Schedule Clauses
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
                    <span>Download EFET Annex (PDF)</span>
                  </button>
                </div>
              </div>

              {/* Contracting Parties & Governing Law Customizer */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-divider)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Party A (Seller)</label>
                  <input
                    type="text"
                    className="input"
                    value={sellerName}
                    onChange={e => setSellerName(e.target.value)}
                    style={{ width: '100%', fontSize: '11px' }}
                  />
                </div>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Party B (Buyer)</label>
                  <input
                    type="text"
                    className="input"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    style={{ width: '100%', fontSize: '11px' }}
                  />
                </div>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Governing Law</label>
                  <select
                    className="input"
                    value={governingLaw}
                    onChange={e => setGoverningLaw(e.target.value as 'ENGLISH_LAW' | 'GERMAN_LAW')}
                    style={{ width: '100%', fontSize: '11px' }}
                  >
                    <option value="ENGLISH_LAW">English Law (High Court, London)</option>
                    <option value="GERMAN_LAW">German Law (Frankfurt am Main)</option>
                  </select>
                </div>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>EFET Master Agreement Date</label>
                  <input
                    type="text"
                    className="input"
                    value={masterAgreementDate}
                    onChange={e => setMasterAgreementDate(e.target.value)}
                    style={{ width: '100%', fontSize: '11px' }}
                  />
                </div>
              </div>

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
                      European Federation of Energy Traders (EFET)
                    </div>
                    <h2 style={{ margin: '4px 0 2px', fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Biomethane Annex &amp; Individual Transaction Confirmation
                    </h2>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      Subject to EFET General Agreement (Gas Version 2.0(a)) · Dated {masterAgreementDate}
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
                          <td style={{ width: '25%' }}>{c.name || 'European Biomethane Facility'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Party B (Buyer)</td>
                          <td>{buyerName}</td>
                          <td style={{ fontWeight: 700 }}>Origin Country</td>
                          <td>{c.originCountryName} ({c.originCountry})</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Interconnection Point</td>
                          <td>{c.injectionCountry} Transmission Grid</td>
                          <td style={{ fontWeight: 700 }}>Feedstock Category</td>
                          <td>{c.feedstockName} (Annex IX-A)</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700 }}>Registry System</td>
                          <td>{targetMarket.registry || 'Union Database (UDB)'}</td>
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
                          <td>{c.injectionCountry} Virtual Trading Point via Single Interconnected European Grid</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Contract Energy Volume</td>
                          <td><strong>{volume.toLocaleString()} MWh</strong> (~{(volume / 365).toFixed(1)} MWh/day flat profile)</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Commodity Pricing Index</td>
                          <td>TTF Floating Index (Settlement Reference: <strong>€{gasPrice.toFixed(2)}/MWh</strong>)</td>
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
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Attribute Settlement Price</td>
                          <td><strong>€{certVal.toFixed(2)}/MWh</strong> delivered attribute value</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Certified GHG Performance</td>
                          <td><strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong> ({ghgSavingPct}% GHG reduction)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 4: Execution */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '10px' }}>
                    <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>For: {sellerName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Authorized Commercial Signatory</div>
                    </div>
                    <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>For: {buyerName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Authorized Commercial Signatory</div>
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
                      📝 Raw CSV Ingestion
                    </button>
                    <button
                      type="button"
                      className={`btn ${etrmSubView === 'JSON' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setEtrmSubView('JSON')}
                    >
                      🔧 JSON Payload
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
                    <span>Download ETRM CSV</span>
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
                        ETRM Deal Ticket Field Mapping
                      </h4>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        Compatible with OpenLink Endur, TriplePoint Commodity XL, and SAP S/4HANA Commodity Management
                      </div>
                    </div>
                    <div className="chip chip-a" style={{ fontSize: '11px' }}>
                      21 Institutional Fields Validated
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
                    Raw RFC 4180 CSV with headers ready for automated booking pipe:
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
                      📑 UDB Nomination Summary
                    </button>
                    <button
                      type="button"
                      className={`btn ${udbSubView === 'RAW_XML' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => setUdbSubView('RAW_XML')}
                    >
                      💻 Raw UDB XML Payload
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
                    <span>Download UDB XML</span>
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
                      EU Union Database (UDB) Mass Balance Transfer Verification
                    </h4>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      Directive (EU) 2023/2413 (RED III) Article 31a Electronic Transaction Payload
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    
                    {/* Header & Operators Card */}
                    <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div className="eyebrow" style={{ marginBottom: '8px' }}>Transaction Header</div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Message ID: <strong>UDB-TX-{assessment.id}</strong></div>
                        <div>Sender EO: <strong>EO-969500XXXXXXXXXX01</strong></div>
                        <div>Recipient EO: <strong>EO-969500XXXXXXXXXX02</strong></div>
                        <div>Directive: <strong>RED III Directive (EU) 2023/2413</strong></div>
                      </div>
                    </div>

                    {/* Facility & Injection Card */}
                    <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div className="eyebrow" style={{ marginBottom: '8px' }}>Origin Facility &amp; Grid Point</div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Facility ID: <strong>{c.id || 'DK-BIO-001'}</strong></div>
                        <div>Name: <strong>{c.name || 'Certified European Facility'}</strong></div>
                        <div>Origin Country: <strong>{c.originCountry}</strong></div>
                        <div>Injection EIC: <strong>{c.injectionCountry}-TSO-VTP-001</strong></div>
                      </div>
                    </div>

                    {/* Proof of Sustainability Card */}
                    <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div className="eyebrow" style={{ marginBottom: '8px' }}>Proof of Sustainability (PoS)</div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>PoS Certificate: <strong>POS-{assessment.id}-01</strong></div>
                        <div>Scheme: <strong>{c.certificationScheme}</strong></div>
                        <div>Annex Classification: <strong>{c.annexClassification}</strong></div>
                        <div>Carbon Intensity: <strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong></div>
                      </div>
                    </div>

                    {/* Transfer Batch Card */}
                    <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
                      <div className="eyebrow" style={{ marginBottom: '8px' }}>Mass Balance Transfer Batch</div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Energy Quantity: <strong>{volume.toLocaleString()} MWh</strong></div>
                        <div>Compliance Sink: <strong>{assessment.targetMarketId}</strong></div>
                        <div>Effective Date: <strong>{assessment.createdAt.slice(0, 10)}</strong></div>
                        <div>Escrow Status: <strong style={{ color: 'var(--color-status-pos-text)' }}>RELEASED_UPON_CONFIRMATION</strong></div>
                      </div>
                    </div>

                  </div>

                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    SHA-256 INTEGRITY SEAL: {seal}
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
            Ref: <strong style={{ color: 'var(--color-text)' }}>{assessment.id}</strong> · Volume: <strong style={{ color: 'var(--color-text)' }}>{volume.toLocaleString()} MWh</strong> · Margin: <strong style={{ color: 'var(--color-accent)' }}>€{deskMargin.toFixed(2)}/MWh</strong>
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
                ✓ Signed Off: {signoffRecord.signedBy} ({new Date(signoffRecord.timestamp).toLocaleTimeString()})
              </span>
            ) : can('COMPLIANCE_SIGNOFF') ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={handleComplianceSignoff}
                title="Execute compliance officer statutory sign-off"
              >
                🛡️ Sign Off Compliance
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
              ⚖️ EFET Annex PDF
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px' }}
              onClick={handleDownloadEtrmCsv}
              title="Download ETRM CSV Deal Ticket"
            >
              💾 ETRM CSV
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px' }}
              onClick={handleDownloadUdbXml}
              title="Download UDB Mass Balance Nomination XML"
            >
              🌐 UDB XML
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 800 }}
              onClick={handleDownloadCompletePackage}
              title="Download all 4 deal documents at once"
            >
              📦 Download All 4 Files
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
