import React, { useState, useEffect } from 'react';
import { TradeAssessment } from '../../domain/trade/types';
import { useAppState } from '../../store/context';
import { getDeskUserName, setDeskUserName } from '../../shared/identity/deskUser';
import { showToast } from '../../app/DeskToastContainer';
import { useLegalPackageData } from './legal/useLegalPackageData';
import { LegalPackageHeader } from './legal/LegalPackageHeader';
import { LegalPackageTabsStrip, DocumentTab } from './legal/LegalPackageTabsStrip';
import { LegalPackageTermsPanel } from './legal/LegalPackageTermsPanel';
import { LegalPackageFooter } from './legal/LegalPackageFooter';
import { LegalTabTermSheet } from './legal/LegalTabTermSheet';
import { LegalTabEfetAnnex } from './legal/LegalTabEfetAnnex';
import { LegalTabEtrmTicket } from './legal/LegalTabEtrmTicket';
import { LegalTabUdbXml } from './legal/LegalTabUdbXml';
import { LegalTabAuditMemo } from './legal/LegalTabAuditMemo';

export type { DocumentTab };

interface LegalPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: TradeAssessment;
  initialTab?: DocumentTab;
}

export function LegalPackageModal({ isOpen, onClose, assessment, initialTab }: LegalPackageModalProps) {
  const [activeTab, setActiveTab] = useState<DocumentTab>(initialTab || 'TERM_SHEET');
  const { state, dispatch } = useAppState();
  const [reviewerName, setReviewerName] = useState<string>(getDeskUserName);

  // The sign-off lives on the saved deal (state.dealSignoffs) so it survives a reload and shows in
  // the Deal Blotter. A deal that is not on the blotter yet cannot carry one.
  const isSaved = state.savedAssessments.some(a => a.id === assessment?.id);
  const signoff = assessment ? state.dealSignoffs?.[assessment.id] ?? null : null;

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const {
    deskRole,
    setDeskRole,
    deskEntity,
    setDeskEntity,
    counterpartyName,
    setCounterpartyName,
    governingLaw,
    setGoverningLaw,
    masterAgreementDate,
    setMasterAgreementDate,
    sellerName,
    buyerName,
    legalOptions,
    seal,
    termSheetPdfBlobUrl,
    efetPdfBlobUrl,
    auditMemoPdfBlobUrl,
    etrmCsv,
    etrmJsonStr,
    etrmCsvRows,
    udbXml,
    copiedType,
    handleCopy,
    handleDownloadTermSheetPdf,
    handleDownloadEfetPdf,
    handleDownloadEtrmCsv,
    handleDownloadJson,
    handleDownloadUdbXml,
    handleDownloadAuditMemoPdf,
    handleDownloadCompletePackage,
  } = useLegalPackageData(isOpen, assessment);

  if (!isOpen || !assessment) return null;

  const isBlocked = assessment.eligibility.overallVerdict === 'HARD_BLOCK';

  const handleComplianceSignoff = () => {
    if (!isSaved) return;
    const by = reviewerName.trim() || getDeskUserName();
    setDeskUserName(by);
    dispatch({ type: 'SET_COMPLIANCE_SIGNOFF', id: assessment.id, by, at: new Date().toISOString() });
    showToast(`Compliance review recorded by ${by}`);
  };

  const termsPanelNode = (
    <LegalPackageTermsPanel
      deskRole={deskRole}
      deskEntity={deskEntity}
      counterpartyName={counterpartyName}
      counterpartySource={assessment?.consignment.counterpartySource}
      governingLaw={governingLaw}
      masterAgreementDate={masterAgreementDate}
      sellerName={sellerName}
      buyerName={buyerName}
      setDeskRole={setDeskRole}
      setDeskEntity={setDeskEntity}
      setCounterpartyName={setCounterpartyName}
      setGoverningLaw={setGoverningLaw}
      setMasterAgreementDate={setMasterAgreementDate}
    />
  );

  const blockedBanner = isBlocked ? (
    <div style={{ padding: '10px 14px', border: '2px solid var(--color-status-neg-border, #dc2626)', color: 'var(--color-status-neg-text, #f87171)', fontSize: '12px', fontWeight: 700 }}>
      NOT TRADEABLE AS STRUCTURED — {assessment.eligibility.summary}
    </div>
  ) : null;

  return (
    <div
      className="scrim noscroll m-dialog-scrim"
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
        className="panel m-dialog lp-modal"
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
        {/* TOP HEADER BAR */}
        <LegalPackageHeader
          assessment={assessment}
          onDownloadAll={handleDownloadCompletePackage}
          onClose={onClose}
        />

        {/* 5-DOCUMENT REVIEW TABS STRIP */}
        <LegalPackageTabsStrip
          activeTab={activeTab}
          onTabChange={setActiveTab}
          seal={seal}
          copiedType={copiedType}
          onCopySeal={() => handleCopy(seal, 'Fingerprint')}
        />

        {/* DOCUMENT CONTENT & PREVIEW CANVAS */}
        <div className="m-dialog-body lp-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'TERM_SHEET' && (
            <LegalTabTermSheet
              assessment={assessment}
              legalOptions={legalOptions}
              seal={seal}
              pdfBlobUrl={termSheetPdfBlobUrl}
              onDownloadPdf={handleDownloadTermSheetPdf}
              termsPanel={termsPanelNode}
              blockedBanner={blockedBanner}
            />
          )}

          {activeTab === 'EFET_ANNEX' && (
            <LegalTabEfetAnnex
              assessment={assessment}
              legalOptions={legalOptions}
              pdfBlobUrl={efetPdfBlobUrl}
              onDownloadPdf={handleDownloadEfetPdf}
              termsPanel={termsPanelNode}
              blockedBanner={blockedBanner}
            />
          )}

          {activeTab === 'ETRM_TICKET' && (
            <LegalTabEtrmTicket
              etrmCsv={etrmCsv}
              etrmJsonStr={etrmJsonStr}
              etrmCsvRows={etrmCsvRows}
              copiedType={copiedType}
              onCopy={handleCopy}
              onDownloadCsv={handleDownloadEtrmCsv}
              onDownloadJson={handleDownloadJson}
            />
          )}

          {activeTab === 'UDB_XML' && (
            <LegalTabUdbXml
              assessment={assessment}
              legalOptions={legalOptions}
              seal={seal}
              udbXml={udbXml}
              copiedType={copiedType}
              onCopy={handleCopy}
              onDownloadUdbXml={handleDownloadUdbXml}
            />
          )}

          {activeTab === 'AUDIT_MEMO' && (
            <LegalTabAuditMemo
              assessment={assessment}
              legalOptions={legalOptions}
              seal={seal}
              pdfBlobUrl={auditMemoPdfBlobUrl}
              copiedType={copiedType}
              onCopy={handleCopy}
              onDownloadPdf={handleDownloadAuditMemoPdf}
            />
          )}
        </div>

        {/* MODAL FOOTER BAR */}
        <LegalPackageFooter
          assessment={assessment}
          signoff={signoff}
          isSaved={isSaved}
          reviewerName={reviewerName}
          onReviewerNameChange={setReviewerName}
          onComplianceSignoff={handleComplianceSignoff}
          onDownloadTermSheetPdf={handleDownloadTermSheetPdf}
          onDownloadEfetPdf={handleDownloadEfetPdf}
          onDownloadEtrmCsv={handleDownloadEtrmCsv}
          onDownloadUdbXml={handleDownloadUdbXml}
          onDownloadAuditMemoPdf={handleDownloadAuditMemoPdf}
          onDownloadCompletePackage={handleDownloadCompletePackage}
        />
      </div>
    </div>
  );
}
