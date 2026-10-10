import { jsPDF } from 'jspdf';
import { TradeAssessment } from './types';
import { MARKETS, isVoluntaryMarket } from '../markets/registry';
import { LegalCitation, OverallVerdict } from '../eligibility/types';
import { CustodyClauses, buildCustodyClauses } from './custodyClauses';
import {
  TBA,
  LegalAnnexOptions,
  calculateTradeIntegritySeal,
  resolveParties,
  annexClassificationLabel,
  chainOfCustodyLabel,
  environmentalAttributeLabel,
  describePricing,
  isBlocked,
  fmtDealVolume,
  orTba,
} from './legalPackage';

/**
 * jsPDF-dependent document generators, split out of legalPackage.ts so that
 * screens/modals which only need the non-PDF exports (FpML/ETRM/UDB payloads,
 * term labels) don't pull jspdf (~335KB) into their chunk. Callers should
 * `await import('./legalPackagePdf')` from inside the export action handler,
 * not at module scope.
 */

function drawBlockedBanner(doc: jsPDF, assessment: TradeAssessment, margin: number, y: number): number {
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(220, 38, 38);
  doc.rect(margin, y, 174, 10, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  const text = `NOT TRADEABLE AS STRUCTURED — ${assessment.eligibility.summary}`;
  doc.text(doc.splitTextToSize(text, 168), margin + 3, y + 4);
  return y + 13;
}

function drawRows(doc: jsPDF, rows: string[][], margin: number, y: number, labelWidth: number): number {
  rows.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(lbl, margin + 2, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(val, 172 - labelWidth);
    doc.text(lines, margin + labelWidth, y + 3);
    y += Math.max(1, lines.length) * 3.6 + 1.4;
  });
  return y;
}

/** Starts a new page when the next block would run into the footer. Returns the y to draw at. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 278) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawPara(doc: jsPDF, text: string, margin: number, y: number, indent = 2, width = 170, lineHeight = 3.3): number {
  const lines = doc.splitTextToSize(text, width);
  y = ensureSpace(doc, y, lines.length * lineHeight + 1);
  doc.text(lines, margin + indent, y);
  return y + lines.length * lineHeight + 1.2;
}

/**
 * Chain-of-custody undertakings: seller warranties, claw-back indemnity, retention, deliverables,
 * timing and risk disclosure. `compact` (term sheet) leaves out the deliverables list; `internal`
 * (pre-screen memo) adds the claw-back exposure, which never goes on a counterparty document.
 */
function drawCustodyClauses(
  doc: jsPDF,
  clauses: CustodyClauses,
  number: string,
  margin: number,
  y: number,
  opts: { compact?: boolean; internal?: boolean } = {}
): number {
  const label = (text: string) => {
    y = ensureSpace(doc, y, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(text, margin + 2, y);
    y += 3.6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
  };

  y = ensureSpace(doc, y, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${number}. ${clauses.heading.toUpperCase()} (DRAFTING POINTS)`, margin, y, { maxWidth: 174 });
  y += 5;

  label('Seller warranties');
  clauses.warranties.forEach((w, i) => { y = drawPara(doc, `${i + 1}. ${w.text} (${w.ref})`, margin, y, 4, 166); });
  if (clauses.indemnity) {
    label('Indemnity');
    y = drawPara(doc, clauses.indemnity, margin, y, 4, 166);
  }
  label('Retention');
  y = drawPara(doc, clauses.retention, margin, y, 4, 166);
  if (!opts.compact) {
    label('Deliverables');
    clauses.deliverables.forEach(d => { y = drawPara(doc, `- ${d}`, margin, y, 4, 166); });
  }
  if (clauses.timing) {
    label('Timing');
    y = drawPara(doc, clauses.timing, margin, y, 4, 166);
  }
  if (clauses.riskDisclosure.length > 0) {
    label('Risk disclosure');
    clauses.riskDisclosure.forEach(r => { y = drawPara(doc, `- ${r}`, margin, y, 4, 166); });
  }
  if (opts.internal && clauses.internalExposure) {
    label('Claw-back exposure (internal only)');
    y = drawPara(doc, clauses.internalExposure, margin, y, 4, 166);
  }
  return y + 2;
}

function drawFingerprint(doc: jsPDF, seal: string, margin: number, y: number): void {
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, y, 174, 10, 'FD');
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DOCUMENT FINGERPRINT (SHA-256 of the terms above — identifies this version; not a signature):', margin + 3, y + 4);
  doc.setFont('courier', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(seal, margin + 3, y + 8);
}

// ---------------------------------------------------------------------------
// 3. Draft transaction confirmation (to be read with the parties' EFET General Agreement)
// ---------------------------------------------------------------------------

export function generateEfetBiomethaneAnnexPdf(
  assessment: TradeAssessment,
  options: LegalAnnexOptions = {}
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const c = assessment.consignment;
  const el = assessment.eligibility;
  const market = MARKETS.find(m => m.id === assessment.targetMarketId);
  const parties = resolveParties(assessment, options);
  const governingLaw = options.governingLaw || 'ENGLISH_LAW';
  const maDate = options.masterAgreementDate?.trim() || TBA;
  const seal = calculateTradeIntegritySeal(assessment);
  const dp = c.deliveryPeriod;
  const isVoluntary = isVoluntaryMarket(assessment.targetMarketId);
  const isNlDeal = assessment.targetMarketId === 'NL_ERE' || c.originCountry === 'NL' || c.injectionCountry === 'NL';
  const custodyClauses = buildCustodyClauses(assessment);

  const margin = 18;
  let y = 20;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, 174, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('DRAFT INDIVIDUAL TRANSACTION CONFIRMATION — BIOMETHANE', margin + 4, y + 6);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('DRAFT FOR LEGAL REVIEW · NOT FOR EXECUTION IN THIS FORM', margin + 4, y + 11);
  doc.text(`To be read with the EFET General Agreement (Natural Gas) between the parties dated ${maDate}`, margin + 4, y + 15);
  y += 22;

  if (isBlocked(assessment)) y = drawBlockedBanner(doc, assessment, margin, y);

  doc.setFontSize(7.5);
  y = drawRows(doc, [
    ['Transaction Reference:', assessment.id],
    ['Draft Date:', assessment.createdAt.slice(0, 10)],
    ['Governing Law:', governingLaw === 'ENGLISH_LAW' ? 'English law (per the General Agreement)' : 'German law (per the General Agreement)'],
    ['Regulatory Basis (target market):', market?.legalBasis || TBA],
  ], margin, y, 48);
  y += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. PARTIES & ORIGIN', margin, y);
  y += 3;
  doc.setFontSize(7.5);
  y = drawRows(doc, [
    ['Seller:', parties.seller],
    ['Buyer:', parties.buyer],
    ['Origin Facility:', c.originPlantName || c.name || TBA],
    ['Origin / Injection:', `${c.originCountryName} (${c.originCountry}) · injected into the ${c.injectionCountry} grid`],
    ['Feedstock:', `${c.feedstockName} — ${annexClassificationLabel(c.annexClassification)}`],
    ['Sustainability Scheme:', c.certificationScheme.replace(/_/g, ' ')],
    ['Registry:', market?.registry || TBA],
  ], margin, y, 48);
  y += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(isVoluntary ? '2. UNBUNDLED CERTIFICATE TRANSFER' : '2. PHYSICAL DELIVERY TERMS', margin, y);
  y += 3;
  doc.setFontSize(7.5);
  const profile = dp?.deliveryProfile;
  const profileDesc = profile === 'FLAT_MONTHLY' ? 'Flat monthly' : profile === 'FLAT_DAILY' ? 'Flat daily' : profile === 'BULLET' ? 'Bullet' : TBA;
  y = drawRows(doc, isVoluntary ? [
    ['Structure:', 'Certificate only — no physical gas delivered to Buyer.'],
    ['Quantity:', `${fmtDealVolume(assessment)} of ${environmentalAttributeLabel(market, assessment.targetMarketId, c.udbStatus)}`],
    ['Transfer Mechanism:', `Transfer and cancellation on ${market?.registry || TBA}`],
  ] : [
    ['Commodity:', 'Biomethane meeting EN 16723-1 and the injection specification of the delivery grid.'],
    ['Delivery Point:', dp?.deliveryPointVtp || `${c.injectionCountry} virtual trading point ${TBA}`],
    ['Contract Quantity:', fmtDealVolume(assessment)],
    ['Delivery Period:', `${orTba(dp?.startDate)} to ${orTba(dp?.endDate)} · Profile: ${profileDesc}`],
    ['Volume Tolerance:', `${TBA} (e.g. ±5% annual operational tolerance)`],
  ], margin, y, 48);
  y += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. PRICE & ENVIRONMENTAL ATTRIBUTE', margin, y);
  y += 3;
  doc.setFontSize(7.5);
  y = drawRows(doc, [
    ['Price:', describePricing(assessment, parties.deskRole).join(' ')],
    ['Environmental Attribute:', environmentalAttributeLabel(market, assessment.targetMarketId, c.udbStatus)],
    ['Contract Carbon Intensity:', `${c.carbonIntensity} gCO₂e/MJ, to be evidenced by PoS issued under ${c.certificationScheme.replace(/_/g, ' ')}`],
    ['Carbon Intensity Adjustment:', `P_adj = P_base + α × (CI_contract − CI_delivered); α = ${TBA}; floor/cap ${TBA}`],
    ['Production Vintage:', `${orTba(dp?.productionStartDate)} to ${orTba(dp?.productionEndDate)} · Compliance year ${orTba(dp?.complianceYear)}`],
    ['Attribute Transfer Deadline:', orTba(dp?.statutorySurrenderDeadline)],
    ['Chain of Custody:', chainOfCustodyLabel(c.chainOfCustody)],
  ], margin, y, 48);
  y += 2;

  if (custodyClauses) {
    // GO + PoS (NL GGE) or PoS-only (DE THG): the chain-of-custody undertakings replace the generic warranty.
    y = drawCustodyClauses(doc, custodyClauses, '4', margin, y);
  } else {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. SUBSIDY & DOUBLE-CLAIMING WARRANTY (DRAFTING POINT)', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const subsidyText = isNlDeal
    ? 'Seller to warrant that no double compensation under the Dutch SDE/SDE++ regime is retained for volumes delivered into or out of the Netherlands without the applicable correction, and that VertiCer export cancellation and Union Database single-accounting rules are complied with.'
    : 'Seller to warrant that the delivered volumes and their environmental attributes have not been claimed under any other support scheme or sold to any other party where doing so would amount to double claiming under applicable national rules.';
  const splitSubsidy = doc.splitTextToSize(subsidyText, 172);
  doc.text(splitSubsidy, margin + 2, y);
  y += splitSubsidy.length * 3.4 + 3;
  }

  y = ensureSpace(doc, y, 14 + Math.min(el.gates.length, 6) * 3.6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. DESK REGULATORY PRE-SCREEN (INFORMATIONAL — NOT A REPRESENTATION)', margin, y);
  y += 4;
  el.gates.slice(0, 6).forEach(gate => {
    const isPass = gate.verdict === 'PASS';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(isPass ? 22 : 180, isPass ? 101 : 83, isPass ? 52 : 9);
    doc.text(`[${gate.verdict}]`, margin + 2, y);
    doc.setTextColor(30, 41, 59);
    doc.text(gate.gateLabel, margin + 26, y);
    y += 3.6;
  });
  y += 4;

  y = ensureSpace(doc, y, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('6. EXECUTION (FINAL VERSION ONLY)', margin, y);
  y += 5;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + 75, y);
  doc.line(margin + 99, y, margin + 174, y);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`For: ${parties.seller} (Seller)`, margin, y + 4, { maxWidth: 75 });
  doc.text(`For: ${parties.buyer} (Buyer)`, margin + 99, y + 4, { maxWidth: 75 });
  y += 14;

  drawFingerprint(doc, seal, margin, Math.min(y, 275));
  return doc;
}

// ---------------------------------------------------------------------------
// 6. Indicative commercial term sheet
// ---------------------------------------------------------------------------

export function generateCommercialTermSheetPdf(
  assessment: TradeAssessment,
  options: LegalAnnexOptions = {}
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const c = assessment.consignment;
  const market = MARKETS.find(m => m.id === assessment.targetMarketId);
  const parties = resolveParties(assessment, options);
  const seal = calculateTradeIntegritySeal(assessment);
  const isVoluntary = isVoluntaryMarket(assessment.targetMarketId);
  const dp = c.deliveryPeriod;
  const custodyClauses = buildCustodyClauses(assessment);

  const margin = 18;
  let y = 20;

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, 174, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('INDICATIVE TERM SHEET', margin + 5, y + 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('NON-BINDING · SUBJECT TO CONTRACT · FOR DISCUSSION PURPOSES ONLY · CONFIDENTIAL', margin + 5, y + 13);
  y += 22;

  if (isBlocked(assessment)) y = drawBlockedBanner(doc, assessment, margin, y);

  doc.setFontSize(8);
  y = drawRows(doc, [
    ['Reference:', assessment.id],
    ['Date:', assessment.createdAt.slice(0, 10)],
    ['Seller:', parties.seller],
    ['Buyer:', parties.buyer],
  ], margin, y, 45);
  y += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(isVoluntary ? '1. CERTIFICATE SPECIFICATION' : '1. COMMODITY & VOLUME', margin, y);
  y += 3;
  doc.setFontSize(8);
  const profile = dp?.deliveryProfile;
  const profileDesc = profile === 'FLAT_MONTHLY' ? 'flat monthly' : profile === 'FLAT_DAILY' ? 'flat daily' : profile === 'BULLET' ? 'bullet' : TBA;
  y = drawRows(doc, isVoluntary ? [
    ['Product:', `${environmentalAttributeLabel(market, assessment.targetMarketId, c.udbStatus)} — unbundled, no physical gas delivery`],
    ['Quantity:', fmtDealVolume(assessment)],
    ['Origin Facility:', `${c.originPlantName || c.name || TBA} (${c.originCountry})`],
    ['Feedstock:', `${c.feedstockName} — ${annexClassificationLabel(c.annexClassification)}`],
    ['Carbon Intensity:', `${c.carbonIntensity} gCO₂e/MJ (declared)`],
    ['Registry:', market?.registry || TBA],
  ] : [
    ['Product:', 'Biomethane meeting EN 16723-1, with environmental attributes'],
    ['Quantity:', fmtDealVolume(assessment)],
    ['Delivery Period:', `${orTba(dp?.startDate)} to ${orTba(dp?.endDate)}, ${profileDesc}`],
    ['Delivery Point:', dp?.deliveryPointVtp || `${c.injectionCountry} virtual trading point`],
    ['Origin Facility:', `${c.originPlantName || c.name || TBA} (${c.originCountry})`],
    ['Feedstock:', `${c.feedstockName} — ${annexClassificationLabel(c.annexClassification)}`],
    ['Carbon Intensity:', `${c.carbonIntensity} gCO₂e/MJ (declared; to be evidenced by PoS)`],
    ['Certification:', `${c.certificationScheme.replace(/_/g, ' ')} · ${chainOfCustodyLabel(c.chainOfCustody)}`],
  ], margin, y, 45);
  y += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. INDICATIVE PRICING', margin, y);
  y += 3;
  doc.setFontSize(8);
  const priceRows: string[][] = describePricing(assessment, parties.deskRole).map((line, i) => [i === 0 ? 'Price Basis:' : '', line]);
  priceRows.push(['Target Market:', `${assessment.targetMarketName}${market?.unitLabel ? ` (quoted in ${market.unitLabel})` : ''}`]);
  if (!isVoluntary) {
    priceRows.push(['Carbon Intensity Adjustment:', `Price adjusts for delivered vs contract CI; α and cap ${TBA}`]);
    priceRows.push(['Volume Tolerance:', TBA]);
  }
  y = drawRows(doc, priceRows, margin, y, 45);
  y += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('3. ATTRIBUTE TRANSFER', margin, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const transferText = isVoluntary
    ? `Guarantees of Origin to be transferred on ${market?.registry || 'the relevant national registry'} and cancelled on behalf of the beneficiary. Transfer timing ${TBA}.`
    : `Sustainability evidence (PoS) to be transferred via the Union Database (RED III Art. 31a) and, where relevant, ${market?.registry || 'the national registry'}. Transfer timing ${TBA}. Seller to warrant no double claiming of the attributes under any other support scheme.`;
  const splitTransfer = doc.splitTextToSize(transferText, 172);
  doc.text(splitTransfer, margin + 2, y);
  y += splitTransfer.length * 3.4 + 5;

  if (custodyClauses) {
    y = drawCustodyClauses(doc, custodyClauses, '4', margin, y, { compact: true });
  }
  y = ensureSpace(doc, y, 28);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const disclaimer = 'This term sheet is indicative only and does not constitute an offer capable of acceptance or a commitment to transact. Any transaction is subject to contract, credit approval, satisfactory due diligence and execution under the parties\' master agreement. Prices are indications as of the date shown and may change.';
  const splitDisc = doc.splitTextToSize(disclaimer, 172);
  doc.text(splitDisc, margin + 2, y);
  y += splitDisc.length * 3.3 + 5;

  drawFingerprint(doc, seal, margin, Math.min(y, 275));
  return doc;
}

// ---------------------------------------------------------------------------
// 7. Desk regulatory pre-screen memorandum (2 pages)
// ---------------------------------------------------------------------------

/** Minimal shape of an AI auditor result (see domain/auditor/types AuditorResponse). */
export interface AuditCommentary {
  verdict?: string;
  checks?: Array<{ gateName?: string; gate?: string; status?: string; details?: string; citation?: string }>;
}

const PRESCREEN_VERDICT: Record<OverallVerdict, { title: string; subtitle: string; tone: 'pos' | 'neg' | 'warn' }> = {
  ELIGIBLE: { title: 'PRE-SCREEN RESULT: ELIGIBLE', subtitle: 'All six rule-set gates pass for this structure.', tone: 'pos' },
  CONDITIONAL: { title: 'PRE-SCREEN RESULT: CONDITIONALLY ELIGIBLE', subtitle: 'One or more gates require conditions to be met — see the gate notes.', tone: 'warn' },
  UNRESOLVED: { title: 'PRE-SCREEN RESULT: UNRESOLVED REGULATORY UNCERTAINTY', subtitle: 'Outcome depends on pending legislation — value both scenarios.', tone: 'warn' },
  UNKNOWN: { title: 'PRE-SCREEN RESULT: INSUFFICIENT INFORMATION', subtitle: 'The market or inputs cannot be fully assessed.', tone: 'warn' },
  HARD_BLOCK: { title: 'PRE-SCREEN RESULT: BLOCKED AS STRUCTURED', subtitle: 'A gate blocks this structure — see the remedy notes.', tone: 'neg' },
};

export function generateStatutoryAuditMemoPdf(
  assessment: TradeAssessment,
  options: LegalAnnexOptions = {},
  auditCommentary?: AuditCommentary
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const c = assessment.consignment;
  const nb = assessment.netback;
  const el = assessment.eligibility;
  const market = MARKETS.find(m => m.id === assessment.targetMarketId);
  const parties = resolveParties(assessment, options);
  const seal = calculateTradeIntegritySeal(assessment);
  const margin = 18;
  // The extra page is for the paired GO + PoS (NL GGE) deal; the PoS-only subset stays in the confirmation.
  const built = buildCustodyClauses(assessment);
  const custodyClauses = built?.variant === 'PAIRED_GO_POS' ? built : null;
  const totalPages = custodyClauses ? 3 : 2;
  // The verdict always comes from the deterministic gate engine; AI output is commentary only.
  const verdict = PRESCREEN_VERDICT[el.overallVerdict] ?? PRESCREEN_VERDICT.UNKNOWN;

  // PAGE 1
  let y = 18;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, 174, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESK REGULATORY PRE-SCREEN MEMORANDUM', margin + 4, y + 6);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Automated screening against the desk rule set · INTERNAL · not legal advice or a compliance approval', margin + 4, y + 11);
  doc.text(`Target market legal basis: ${market?.legalBasis ?? 'n/a'}`, margin + 4, y + 15, { maxWidth: 166 });
  y += 22;

  doc.setFontSize(7.5);
  y = drawRows(doc, [
    ['Reference:', `PRESCREEN-${assessment.id}`],
    ['Date:', assessment.createdAt.slice(0, 10)],
    ['Structure:', `${c.originCountry} ${c.feedstockName} → ${assessment.targetMarketName} · desk ${parties.deskRole === 'BUYER' ? 'buys from' : 'sells to'} ${parties.counterparty}`],
  ], margin, y, 30);
  y += 2;

  const toneFill = verdict.tone === 'pos' ? [240, 253, 244] : verdict.tone === 'neg' ? [254, 242, 242] : [254, 243, 199];
  const toneText = verdict.tone === 'pos' ? [5, 150, 105] : verdict.tone === 'neg' ? [220, 38, 38] : [180, 83, 9];
  doc.setFillColor(toneFill[0], toneFill[1], toneFill[2]);
  doc.setDrawColor(toneText[0], toneText[1], toneText[2]);
  doc.rect(margin, y, 174, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(toneText[0], toneText[1], toneText[2]);
  doc.text(verdict.title, margin + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(verdict.subtitle, margin + 4, y + 10.5);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONSIGNMENT PARAMETERS', margin, y);
  y += 3;
  doc.setFontSize(7.5);
  const netbackStr = nb.netNetback != null ? `€${nb.netNetback.toFixed(2)}/MWh` : 'n/a';
  const marginStr = nb.deskMargin != null ? ` · desk margin €${nb.deskMargin.toFixed(2)}/MWh` : '';
  y = drawRows(doc, [
    ['Volume:', fmtDealVolume(assessment)],
    ['Feedstock:', `${c.feedstockName} — ${annexClassificationLabel(c.annexClassification)}`],
    ['Carbon Intensity:', `${c.carbonIntensity} gCO₂e/MJ · commissioning ${c.commissioningDateRange.replace(/_/g, ' ').toLowerCase()}`],
    ['Scheme / Custody:', `${c.certificationScheme.replace(/_/g, ' ')} · ${chainOfCustodyLabel(c.chainOfCustody)}`],
    ['Injection:', `${c.injectionCountry} grid (${c.injectionIsEU ? 'EU' : 'non-EU'})`],
    ['Internal Valuation:', `Desk netback ${netbackStr}${marginStr} (internal only)`],
  ], margin, y, 36);
  y += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. GATE-BY-GATE RESULT', margin, y);
  y += 3;

  el.gates.slice(0, 6).forEach(gate => {
    const isGPass = gate.verdict === 'PASS';
    const isGFail = gate.verdict === 'HARD_BLOCK';
    const note = gate.verdict !== 'PASS' && gate.remedy ? `${gate.reason} Remedy: ${gate.remedy}` : gate.reason;
    const lines = doc.splitTextToSize(note, 150).slice(0, 3);
    const h = 6 + lines.length * 3;
    doc.setFillColor(isGPass ? 240 : isGFail ? 254 : 254, isGPass ? 253 : isGFail ? 242 : 243, isGPass ? 244 : isGFail ? 242 : 199);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, 174, h, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(isGPass ? 5 : isGFail ? 220 : 180, isGPass ? 150 : isGFail ? 38 : 83, isGPass ? 105 : isGFail ? 38 : 9);
    doc.text(gate.verdict, margin + 2, y + 4);
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(gate.gateLabel, margin + 22, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(gate.citations[0]?.shortName ?? '', margin + 120, y + 4);
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(lines, margin + 22, y + 7.5);
    y += h + 1;
  });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`INTERNAL · DESK PRE-SCREEN · PRESCREEN-${assessment.id} · PAGE 1 OF ${totalPages}`, margin, 287);

  // PAGE 2
  doc.addPage();
  y = 18;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, 174, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESK REGULATORY PRE-SCREEN · PAGE 2', margin + 4, y + 7.5);
  y += 17;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. LEGAL BASIS RELIED ON (VERIFY AGAINST THE SOURCE TEXT)', margin, y);
  y += 4;
  const seen = new Set<string>();
  const cites: LegalCitation[] = [];
  for (const g of el.gates) for (const ct of g.citations) {
    if (!seen.has(ct.fullReference)) { seen.add(ct.fullReference); cites.push(ct); }
  }
  cites.slice(0, 8).forEach(ct => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text(ct.fullReference, margin + 2, y, { maxWidth: 170 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${ct.establishes} · ${ct.sourceUrl}`, margin + 4, y + 3.5, { maxWidth: 168 });
    y += 8.5;
  });
  y += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. SUGGESTED PROTECTIVE CLAUSES (DRAFTING POINTS FOR LEGAL REVIEW)', margin, y);
  y += 4;
  const clauses = [
    ['Sustainability evidence', 'Seller to transfer valid PoS issued under a Commission-recognised voluntary scheme, via the Union Database, within an agreed number of business days after each delivery month.'],
    ['Failure of evidence / CI breach', 'If PoS is not delivered or delivered CI exceeds the contract ceiling, a cure period applies; failing cure, the affected volume reprices to the molecule index without the environmental premium.'],
    ['No double claiming', 'Seller to warrant the attributes have not been claimed under any other support scheme or sold to another party (e.g. SDE++, EEG, GSE, obligation d\'achat).'],
    ['Change in law', 'Allocation of the economic effect of regulatory change (e.g. removal of German double counting) to be agreed, with a price re-opener or termination right.'],
  ];
  clauses.forEach(([title, body]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`• ${title}:`, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const split = doc.splitTextToSize(body, 168);
    doc.text(split, margin + 4, y + 3.5);
    y += split.length * 3.3 + 5;
  });

  if (auditCommentary?.checks?.length || auditCommentary?.verdict) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('5. AI-ASSISTED COMMENTARY (UNVERIFIED — DOES NOT CHANGE THE RESULT ABOVE)', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    if (auditCommentary.verdict) {
      doc.text(`AI reviewer verdict: ${auditCommentary.verdict}`, margin + 2, y);
      y += 3.5;
    }
    (auditCommentary.checks ?? []).slice(0, 6).forEach(ch => {
      const line = `${ch.status ?? ''} ${ch.gateName ?? ch.gate ?? ''}: ${ch.details ?? ''}`.trim();
      const split = doc.splitTextToSize(line, 168).slice(0, 2);
      doc.text(split, margin + 2, y);
      y += split.length * 3 + 1;
    });
    y += 2;
  }

  y = Math.min(y + 2, 250);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('REVIEW', margin, y);
  y += 5;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + 75, y);
  doc.line(margin + 99, y, margin + 174, y);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Prepared by (Trading / Structuring)', margin, y + 4);
  doc.text('Reviewed by (Compliance / Legal)', margin + 99, y + 4);
  y += 10;

  drawFingerprint(doc, seal, margin, Math.min(y, 272));

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`INTERNAL · DESK PRE-SCREEN · PRESCREEN-${assessment.id} · PAGE 2 OF ${totalPages}`, margin, 287);

  // PAGE 3: chain-of-custody undertakings, risk disclosure and (internal) claw-back exposure
  if (custodyClauses) {
    doc.addPage();
    y = 18;
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, 174, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text('DESK REGULATORY PRE-SCREEN · CHAIN OF CUSTODY', margin + 4, y + 7.5);
    y += 17;
    drawCustodyClauses(doc, custodyClauses, '5', margin, y, { internal: true });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`INTERNAL · DESK PRE-SCREEN · PRESCREEN-${assessment.id} · PAGE 3 OF ${totalPages}`, margin, 287);
  }

  return doc;
}
