import { useState, useMemo, useEffect } from 'react';
import { TradeAssessment } from '../../../domain/trade/types';
import {
  generateEtrmJsonPayload,
  generateEtrmCsvPayload,
  generateUdbNominationXmlPayload,
  calculateTradeIntegritySeal,
  downloadDealFile,
  inferDeskRole,
  resolveParties,
  DeskRole,
  LegalAnnexOptions
} from '../../../domain/trade/legalPackage';
import { showToast } from '../../../app/DeskToastContainer';

export function useLegalPackageData(isOpen: boolean, assessment: TradeAssessment | null) {
  const [deskRole, setDeskRole] = useState<DeskRole>(() => (assessment ? inferDeskRole(assessment) : 'SELLER'));
  const [deskEntity, setDeskEntity] = useState('');
  const [counterpartyName, setCounterpartyName] = useState(assessment?.consignment?.counterparty ?? '');
  const [governingLaw, setGoverningLaw] = useState<'ENGLISH_LAW' | 'GERMAN_LAW'>('ENGLISH_LAW');
  const [masterAgreementDate, setMasterAgreementDate] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

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

  // PDF Blobs
  const [termSheetPdfBlobUrl, setTermSheetPdfBlobUrl] = useState<string>('');
  const [efetPdfBlobUrl, setEfetPdfBlobUrl] = useState<string>('');
  const [auditMemoPdfBlobUrl, setAuditMemoPdfBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !assessment) {
      setTermSheetPdfBlobUrl('');
      setEfetPdfBlobUrl('');
      setAuditMemoPdfBlobUrl('');
      return;
    }
    let tsUrl = '';
    let efetUrl = '';
    let auditUrl = '';
    let cancelled = false;

    import('../../../domain/trade/legalPackagePdf').then(({
      generateCommercialTermSheetPdf,
      generateEfetBiomethaneAnnexPdf,
      generateStatutoryAuditMemoPdf,
    }) => {
      if (cancelled) return;
      const tsDoc = generateCommercialTermSheetPdf(assessment, legalOptions);
      tsUrl = URL.createObjectURL(tsDoc.output('blob'));
      setTermSheetPdfBlobUrl(tsUrl);

      const efetDoc = generateEfetBiomethaneAnnexPdf(assessment, legalOptions);
      efetUrl = URL.createObjectURL(efetDoc.output('blob'));
      setEfetPdfBlobUrl(efetUrl);

      const auditDoc = generateStatutoryAuditMemoPdf(assessment, legalOptions);
      auditUrl = URL.createObjectURL(auditDoc.output('blob'));
      setAuditMemoPdfBlobUrl(auditUrl);
    }).catch(e => {
      console.error('Failed to generate PDF preview blobs:', e);
    });

    return () => {
      cancelled = true;
      if (tsUrl) URL.revokeObjectURL(tsUrl);
      if (efetUrl) URL.revokeObjectURL(efetUrl);
      if (auditUrl) URL.revokeObjectURL(auditUrl);
    };
  }, [isOpen, assessment, legalOptions]);

  // ETRM CSV & JSON payloads
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

  // ETRM parsed table rows
  const etrmCsvRows = useMemo(() => {
    if (!etrmCsv) return [];
    const lines = etrmCsv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));

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

  // UDB Mass Balance XML payload
  const udbXml = useMemo(() => {
    if (!assessment) return '';
    return generateUdbNominationXmlPayload(assessment, legalOptions);
  }, [assessment, legalOptions]);

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

  const handleDownloadTermSheetPdf = async () => {
    if (!assessment) return;
    showToast('Preparing PDF…');
    try {
      const { generateCommercialTermSheetPdf } = await import('../../../domain/trade/legalPackagePdf');
      const doc = generateCommercialTermSheetPdf(assessment, legalOptions);
      const filename = `Indicative-TermSheet-${assessment.id}-${assessment.targetMarketId}.pdf`;
      doc.save(filename);
      showToast(`Indicative term sheet downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate Commercial Term Sheet PDF');
    }
  };

  const handleDownloadEfetPdf = async () => {
    if (!assessment) return;
    showToast('Preparing PDF…');
    try {
      const { generateEfetBiomethaneAnnexPdf } = await import('../../../domain/trade/legalPackagePdf');
      const doc = generateEfetBiomethaneAnnexPdf(assessment, legalOptions);
      const filename = `Draft-Confirmation-${assessment.id}-${assessment.targetMarketId}.pdf`;
      doc.save(filename);
      showToast(`Draft confirmation downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate EFET Annex PDF');
    }
  };

  const handleDownloadEtrmCsv = () => {
    if (!assessment) return;
    try {
      const filename = `DealRecord-${assessment.id}.csv`;
      downloadDealFile(filename, etrmCsv, 'text/csv;charset=utf-8');
      showToast(`Deal record CSV downloaded`);
    } catch {
      showToast('Failed to generate ETRM CSV');
    }
  };

  const handleDownloadJson = () => {
    if (!assessment) return;
    const filename = `DealRecord-${assessment.id}-${assessment.targetMarketId}.json`;
    downloadDealFile(filename, etrmJsonStr, 'application/json;charset=utf-8');
    showToast(`Deal record JSON downloaded`);
  };

  const handleDownloadUdbXml = () => {
    if (!assessment) return;
    try {
      const filename = `UDB-Worksheet-${assessment.id}.xml`;
      downloadDealFile(filename, udbXml, 'application/xml;charset=utf-8');
      showToast(`UDB worksheet downloaded`);
    } catch {
      showToast('Failed to generate UDB XML');
    }
  };

  const handleDownloadAuditMemoPdf = async () => {
    if (!assessment) return;
    showToast('Preparing PDF…');
    try {
      const { generateStatutoryAuditMemoPdf } = await import('../../../domain/trade/legalPackagePdf');
      const doc = generateStatutoryAuditMemoPdf(assessment, legalOptions);
      const filename = `PreScreen-${assessment.id}-${assessment.targetMarketId}.pdf`;
      doc.save(filename);
      showToast(`Pre-screen memo downloaded: ${filename}`);
    } catch {
      showToast('Failed to generate Statutory Audit Memo PDF');
    }
  };

  const handleDownloadCompletePackage = async () => {
    await handleDownloadTermSheetPdf();
    await handleDownloadEfetPdf();
    handleDownloadEtrmCsv();
    handleDownloadUdbXml();
    await handleDownloadAuditMemoPdf();
    showToast('All 5 draft documents downloaded');
  };

  return {
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
    etrmJson,
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
  };
}
