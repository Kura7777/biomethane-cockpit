import { jsPDF } from 'jspdf';
import { TradeAssessment } from './types';
import { MARKETS, isVoluntaryMarket } from '../markets/registry';
import { Market } from '../markets/types';
import { LegalCitation, OverallVerdict } from '../eligibility/types';
import { AnnexClassification, ChainOfCustody } from '../consignment/types';

/**
 * Deal documentation generators.
 *
 * Ground rules (these documents can leave the building):
 *  1. Never invent a contract fact. Anything the desk has not captured — entity names, master
 *     agreement date, volume, dates, tolerances, LEIs — renders as an explicit placeholder.
 *  2. Trade direction is explicit. On an offtake from a producer the desk is the BUYER.
 *  3. Counterparty-facing documents never carry internal valuation (netback, desk margin).
 *  4. Every document says what it is: indicative term sheet, draft confirmation, desk
 *     pre-screen, or internal worksheet. None of them is legal advice or a compliance approval.
 */

export const TBA = '[TO BE AGREED]';

// ---------------------------------------------------------------------------
// 1. SHA-256 document fingerprint (zero dependencies, UTF-8 safe)
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  // Encode to UTF-8 bytes first: hashing raw UTF-16 code units & 0xff made names such as
  // "Énergie" and "Ãnergie" collide.
  const ascii = unescape(encodeURIComponent(input));

  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;

  const K: number[] = [];
  const H: number[] = [];

  let primeCounter = 0;
  const isPrime: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isPrime[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isPrime[i] = true;
      }
      H[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      K[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  for (i = 0; i < ascii.length; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w = new Array(64);

  for (let chunk = 0; chunk < words.length; chunk += 16) {
    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];

    for (i = 0; i < 64; i++) {
      if (i < 16) {
        w[i] = words[chunk + i] | 0;
      } else {
        const gamma0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const gamma1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (((w[i - 16] + gamma0) | 0) + ((w[i - 7] + gamma1) | 0)) | 0;
      }

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((h + s1) | 0) + (((ch + K[i]) | 0) + w[i]) | 0) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  let result = '';
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const bVal = (H[i] >> (8 * j)) & 255;
      result += (bVal < 16 ? '0' : '') + bVal.toString(16);
    }
  }
  return result;
}

/**
 * Deterministic SHA-256 fingerprint over every material term of the assessment.
 * It identifies a version of the terms; it is not a digital signature and proves nothing about
 * who produced the document.
 */
export function calculateTradeIntegritySeal(assessment: TradeAssessment): string {
  const c = assessment.consignment;
  const dp = c.deliveryPeriod;
  const pp = assessment.costs?.producerPricing;
  const canonical = [
    assessment.id,
    assessment.createdAt,
    assessment.targetMarketId,
    c.counterparty ?? '',
    c.originCountry,
    c.injectionCountry,
    c.feedstock,
    c.annexClassification,
    typeof c.carbonIntensity === 'number' ? c.carbonIntensity.toFixed(2) : '',
    c.volumeMWh ?? '',
    c.certificationScheme,
    c.chainOfCustody,
    dp?.startDate ?? '',
    dp?.endDate ?? '',
    dp?.complianceYear ?? '',
    dp?.deliveryProfile ?? '',
    pp?.mode ?? '',
    pp?.fixedPriceEurPerMwh ?? '',
    pp?.indexLinkedShare ?? '',
    assessment.netback.certificateValue?.valueEurPerMWh ?? '',
    assessment.marks.gasIndex.mid ?? '',
  ].join('|');

  return sha256(canonical);
}

// ---------------------------------------------------------------------------
// 2. Shared term resolution
// ---------------------------------------------------------------------------

export type DeskRole = 'BUYER' | 'SELLER';

export interface LegalAnnexOptions {
  buyerName?: string;
  sellerName?: string;
  governingLaw?: 'ENGLISH_LAW' | 'GERMAN_LAW';
  masterAgreementDate?: string;
  /** The desk's own legal entity. */
  tradingDeskEntity?: string;
  /** Desk side of the trade. Defaults to BUYER when the deal was originated from a plant. */
  deskRole?: DeskRole;
}

/** Offtake origination (deal sourced from a registry plant) means the desk is buying. */
export function inferDeskRole(assessment: TradeAssessment): DeskRole {
  return assessment.consignment.originPlantId ? 'BUYER' : 'SELLER';
}

export interface ResolvedParties {
  deskRole: DeskRole;
  deskEntity: string;
  counterparty: string;
  seller: string;
  buyer: string;
}

export function resolveParties(assessment: TradeAssessment, options: LegalAnnexOptions = {}): ResolvedParties {
  const deskRole = options.deskRole ?? inferDeskRole(assessment);
  const deskEntity = options.tradingDeskEntity?.trim() || '[DESK LEGAL ENTITY]';
  const counterparty = assessment.consignment.counterparty?.trim() || '[COUNTERPARTY LEGAL ENTITY]';
  const defaultSeller = deskRole === 'SELLER' ? deskEntity : counterparty;
  const defaultBuyer = deskRole === 'BUYER' ? deskEntity : counterparty;
  return {
    deskRole,
    deskEntity,
    counterparty,
    seller: options.sellerName?.trim() || defaultSeller,
    buyer: options.buyerName?.trim() || defaultBuyer,
  };
}

export function annexClassificationLabel(classification: AnnexClassification): string {
  switch (classification) {
    case 'IX_A': return 'RED III Annex IX Part A';
    case 'IX_B': return 'RED III Annex IX Part B';
    case 'CROP': return 'Food/feed crop (not Annex IX; RED III Art. 26 cap applies in transport)';
    default: return 'Unclassified — verify feedstock classification';
  }
}

export function chainOfCustodyLabel(coc: ChainOfCustody): string {
  switch (coc) {
    case 'MASS_BALANCE': return 'Mass balance (RED III Art. 30)';
    case 'SEGREGATION': return 'Physical segregation';
    case 'BOOK_AND_CLAIM': return 'Book and claim (voluntary / Guarantee of Origin markets only)';
    default: return String(coc);
  }
}

function environmentalAttributeLabel(market: Market | undefined, marketId: string): string {
  if (market?.isGuaranteeOfOrigin || isVoluntaryMarket(marketId)) return 'Guarantees of Origin (GO)';
  if (marketId === 'UK_RTFO') return 'Renewable Transport Fuel Certificates (RTFCs) under the UK RTFO';
  if (marketId === 'FUELEU') return 'Proof of Sustainability supporting FuelEU Maritime compliance';
  return 'Proof of Sustainability (PoS) recorded in the Union Database';
}

const fmtMwh = (v: number | null | undefined) => (v != null ? `${v.toLocaleString()} MWh` : TBA);
const orTba = (v: string | number | null | undefined) => (v != null && String(v).trim() !== '' ? String(v) : TBA);

/**
 * Counterparty-facing price wording. Uses the agreed producer pricing on an offtake and
 * market-level indications on a sale — never the desk's internal netback or margin.
 */
export function describePricing(assessment: TradeAssessment, deskRole: DeskRole): string[] {
  const pp = assessment.costs?.producerPricing;
  const markDate = assessment.createdAt.slice(0, 10);
  if (deskRole === 'BUYER') {
    if (pp?.mode === 'FIXED_PRICE' && pp.fixedPriceEurPerMwh != null) {
      return [`Fixed price: €${pp.fixedPriceEurPerMwh.toFixed(2)}/MWh, all-in (molecule and environmental attribute).`];
    }
    if (pp?.mode === 'INDEX_LINKED' && pp.indexLinkedShare != null) {
      return [`Index-linked: ${(pp.indexLinkedShare * 100).toFixed(1)}% of the realised delivered value (molecule index plus attribute value), settled monthly.`];
    }
    return ['[PRICE TO BE AGREED] — producer pricing (fixed or index-linked) not yet set on this deal.'];
  }
  const cert = assessment.netback.certificateValue?.valueEurPerMWh ?? null;
  const gas = assessment.marks.gasIndex.mid;
  const lines: string[] = [];
  lines.push(gas != null
    ? `Molecule: TTF month-ahead index (reference €${gas.toFixed(2)}/MWh on ${markDate}).`
    : 'Molecule: TTF month-ahead index.');
  lines.push(cert != null
    ? `Environmental attribute: €${cert.toFixed(2)}/MWh indicative premium (desk marks as of ${markDate}).`
    : 'Environmental attribute: [PREMIUM TO BE AGREED].');
  return lines;
}

const isBlocked = (a: TradeAssessment) => a.eligibility?.overallVerdict === 'HARD_BLOCK';

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
    ['Quantity:', `${fmtMwh(c.volumeMWh)} of ${environmentalAttributeLabel(market, assessment.targetMarketId)}`],
    ['Transfer Mechanism:', `Transfer and cancellation on ${market?.registry || TBA}`],
  ] : [
    ['Commodity:', 'Biomethane meeting EN 16723-1 and the injection specification of the delivery grid.'],
    ['Delivery Point:', dp?.deliveryPointVtp || `${c.injectionCountry} virtual trading point ${TBA}`],
    ['Contract Quantity:', fmtMwh(c.volumeMWh)],
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
    ['Environmental Attribute:', environmentalAttributeLabel(market, assessment.targetMarketId)],
    ['Contract Carbon Intensity:', `${c.carbonIntensity} gCO₂e/MJ, to be evidenced by PoS issued under ${c.certificationScheme.replace(/_/g, ' ')}`],
    ['Carbon Intensity Adjustment:', `P_adj = P_base + α × (CI_contract − CI_delivered); α = ${TBA}; floor/cap ${TBA}`],
    ['Production Vintage:', `${orTba(dp?.productionStartDate)} to ${orTba(dp?.productionEndDate)} · Compliance year ${orTba(dp?.complianceYear)}`],
    ['Attribute Transfer Deadline:', orTba(dp?.statutorySurrenderDeadline)],
    ['Chain of Custody:', chainOfCustodyLabel(c.chainOfCustody)],
  ], margin, y, 48);
  y += 2;

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
// 4. Internal deal record XML (FpML-inspired; not schema-validated FpML)
// ---------------------------------------------------------------------------

export function escapeXml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Internal machine-readable deal record. Element names follow FpML conventions loosely but the
 * document is NOT valid against the FpML schema — map it explicitly before any system import.
 */
export function generateFpMLDealPayload(assessment: TradeAssessment, options: LegalAnnexOptions = {}): string {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const market = MARKETS.find(m => m.id === assessment.targetMarketId);
  const parties = resolveParties(assessment, options);
  const seal = calculateTradeIntegritySeal(assessment);
  const now = new Date().toISOString();
  const gasPrice = assessment.marks.gasIndex.mid;
  const certValue = nb.certificateValue?.valueEurPerMWh ?? null;
  const dp = c.deliveryPeriod;
  // The buyer pays, the seller receives.
  const desk = 'DESK';
  const cpty = 'COUNTERPARTY';
  const payer = parties.deskRole === 'BUYER' ? desk : cpty;
  const receiver = parties.deskRole === 'BUYER' ? cpty : desk;
  const num = (v: number | null | undefined, dp2 = 2) => (v != null ? v.toFixed(dp2) : '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Internal deal record. FpML-inspired naming; NOT validated against the FpML schema. -->
<dealRecord xmlns="urn:biomethane-desk:deal-record:v2" generated="${now}">
  <header>
    <dealId>${escapeXml(assessment.id)}</dealId>
    <tradeDate>${escapeXml(assessment.createdAt.slice(0, 10))}</tradeDate>
    <deskRole>${parties.deskRole}</deskRole>
    <status>${isBlocked(assessment) ? 'NOT_TRADEABLE_REGULATORY_BLOCK' : 'INDICATIVE'}</status>
  </header>

  <party id="${desk}">
    <name>${escapeXml(parties.deskEntity)}</name>
    <lei></lei>
  </party>
  <party id="${cpty}">
    <name>${escapeXml(parties.counterparty)}</name>
    <lei></lei>
  </party>

  <physicalLeg>
    <payerPartyReference href="${payer}"/>
    <receiverPartyReference href="${receiver}"/>
    <deliveryPoint>${escapeXml(dp?.deliveryPointVtp || `${c.injectionCountry}_VTP`)}</deliveryPoint>
    <commodity>BIOMETHANE_EN16723</commodity>
    <quantityMWh>${c.volumeMWh ?? ''}</quantityMWh>
    <deliveryStart>${escapeXml(dp?.startDate ?? '')}</deliveryStart>
    <deliveryEnd>${escapeXml(dp?.endDate ?? '')}</deliveryEnd>
    <gasIndexMarkEurMwh priceType="TTF_MONTH_AHEAD">${num(gasPrice)}</gasIndexMarkEurMwh>
  </physicalLeg>

  <environmentalLeg>
    <payerPartyReference href="${payer}"/>
    <receiverPartyReference href="${receiver}"/>
    <attributeType>${escapeXml(environmentalAttributeLabel(market, assessment.targetMarketId))}</attributeType>
    <targetMarket>${escapeXml(assessment.targetMarketId)}</targetMarket>
    <legalBasis>${escapeXml(market?.legalBasis ?? '')}</legalBasis>
    <registry>${escapeXml(market?.registry ?? '')}</registry>
    <feedstock classification="${escapeXml(c.annexClassification)}">${escapeXml(c.feedstockName)}</feedstock>
    <carbonIntensityGco2ePerMj>${c.carbonIntensity}</carbonIntensityGco2ePerMj>
    <certificationScheme>${escapeXml(c.certificationScheme)}</certificationScheme>
    <chainOfCustody>${escapeXml(c.chainOfCustody)}</chainOfCustody>
    <attributeMarkEurMwh>${num(certValue)}</attributeMarkEurMwh>
  </environmentalLeg>

  <documentFingerprint algorithm="SHA-256">${seal}</documentFingerprint>
</dealRecord>`;
}

// ---------------------------------------------------------------------------
// 5. Internal ETRM-style JSON deal ticket
// ---------------------------------------------------------------------------

export interface EtrmJsonDealTicket {
  dealHeader: {
    dealId: string;
    tradeDate: string;
    createdTimestamp: string;
    deskRole: DeskRole;
    status: 'INDICATIVE' | 'NOT_TRADEABLE_REGULATORY_BLOCK';
    format: 'GENERIC_JSON_V2';
  };
  counterparty: {
    name: string;
    lei: string | null;
    role: DeskRole;
  };
  sourcingFacility: {
    name: string;
    plantId: string | null;
    country: string;
    feedstock: string;
    annexClassification: string;
    certificationScheme: string;
    chainOfCustody: string;
  };
  legA_physicalMolecule: {
    commodity: string;
    deliveryPointVtp: string | null;
    volumeMWh: number | null;
    deliveryStart: string | null;
    deliveryEnd: string | null;
    gasIndexMarkEurMwh: number | null;
  };
  legB_environmentalAttribute: {
    targetMarketId: string;
    targetMarketName: string;
    attributeType: string;
    contractCiGco2ePerMj: number;
    fossilComparatorGco2ePerMj: number;
    attributeValueEurMwh: number | null;
    priceCeilingEurMwh: number | null;
    registrySystem: string | null;
  };
  producerPricing: {
    mode: 'FIXED_PRICE' | 'INDEX_LINKED' | null;
    fixedPriceEurPerMwh: number | null;
    indexLinkedShare: number | null;
  };
  regulatoryChecklist: Array<{
    gate: string;
    verdict: string;
    statutoryCitation: string;
  }>;
  /** Internal valuation — never include in counterparty documents. */
  internalValuation: {
    deskNetbackEurMwh: number | null;
    deskMarginEurMwh: number | null;
    deskPnLEur: number | null;
  };
  documentFingerprint: {
    algorithm: 'SHA-256';
    hash: string;
  };
}

export function generateEtrmJsonPayload(assessment: TradeAssessment, options: LegalAnnexOptions = {}): EtrmJsonDealTicket {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const market = MARKETS.find(m => m.id === assessment.targetMarketId);
  const parties = resolveParties(assessment, options);
  const pp = assessment.costs?.producerPricing ?? null;
  const dp = c.deliveryPeriod;

  return {
    dealHeader: {
      dealId: assessment.id,
      tradeDate: assessment.createdAt.slice(0, 10),
      createdTimestamp: assessment.createdAt,
      deskRole: parties.deskRole,
      status: isBlocked(assessment) ? 'NOT_TRADEABLE_REGULATORY_BLOCK' : 'INDICATIVE',
      format: 'GENERIC_JSON_V2',
    },
    counterparty: {
      name: parties.counterparty,
      lei: null,
      role: parties.deskRole === 'BUYER' ? 'SELLER' : 'BUYER',
    },
    sourcingFacility: {
      name: c.originPlantName || c.name,
      plantId: c.originPlantId ?? null,
      country: c.originCountry,
      feedstock: c.feedstockName,
      annexClassification: c.annexClassification,
      certificationScheme: c.certificationScheme,
      chainOfCustody: c.chainOfCustody,
    },
    legA_physicalMolecule: {
      commodity: 'BIOMETHANE_EN16723',
      deliveryPointVtp: dp?.deliveryPointVtp ?? null,
      volumeMWh: c.volumeMWh,
      deliveryStart: dp?.startDate ?? null,
      deliveryEnd: dp?.endDate ?? null,
      gasIndexMarkEurMwh: assessment.marks.gasIndex.mid,
    },
    legB_environmentalAttribute: {
      targetMarketId: assessment.targetMarketId,
      targetMarketName: assessment.targetMarketName,
      attributeType: environmentalAttributeLabel(market, assessment.targetMarketId),
      contractCiGco2ePerMj: c.carbonIntensity,
      fossilComparatorGco2ePerMj: 94.0, // RED III transport comparator
      attributeValueEurMwh: nb.certificateValue?.valueEurPerMWh ?? null,
      priceCeilingEurMwh: market?.ceilingEurMwh ?? (assessment.targetMarketId === 'FR_CPB' ? 100.0 : null),
      registrySystem: market?.registry ?? null,
    },
    producerPricing: {
      mode: pp?.mode ?? null,
      fixedPriceEurPerMwh: pp?.fixedPriceEurPerMwh ?? null,
      indexLinkedShare: pp?.indexLinkedShare ?? null,
    },
    regulatoryChecklist: assessment.eligibility.gates.map(g => ({
      gate: g.gateLabel,
      verdict: g.verdict,
      statutoryCitation: g.citations[0]?.fullReference || '',
    })),
    internalValuation: {
      deskNetbackEurMwh: nb.netNetback,
      deskMarginEurMwh: nb.deskMargin,
      deskPnLEur: nb.deskPnL,
    },
    documentFingerprint: {
      algorithm: 'SHA-256',
      hash: calculateTradeIntegritySeal(assessment),
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Indicative term sheet (non-binding, subject to contract)
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
    ['Product:', `${environmentalAttributeLabel(market, assessment.targetMarketId)} — unbundled, no physical gas delivery`],
    ['Quantity:', fmtMwh(c.volumeMWh)],
    ['Origin Facility:', `${c.originPlantName || c.name || TBA} (${c.originCountry})`],
    ['Feedstock:', `${c.feedstockName} — ${annexClassificationLabel(c.annexClassification)}`],
    ['Carbon Intensity:', `${c.carbonIntensity} gCO₂e/MJ (declared)`],
    ['Registry:', market?.registry || TBA],
  ] : [
    ['Product:', 'Biomethane meeting EN 16723-1, with environmental attributes'],
    ['Quantity:', fmtMwh(c.volumeMWh)],
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
    ['Volume:', fmtMwh(c.volumeMWh)],
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
  doc.text(`INTERNAL · DESK PRE-SCREEN · PRESCREEN-${assessment.id} · PAGE 1 OF 2`, margin, 287);

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
  doc.text(`INTERNAL · DESK PRE-SCREEN · PRESCREEN-${assessment.id} · PAGE 2 OF 2`, margin, 287);

  return doc;
}

// ---------------------------------------------------------------------------
// 8. Internal deal ticket CSV
// ---------------------------------------------------------------------------

/** RFC 4180 field quoting, with a guard against spreadsheet formula injection. */
function csvField(v: string | number | null | undefined): string {
  if (v == null) return '';
  let s = String(v);
  if (/^[=+\-@]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function generateEtrmCsvPayload(assessment: TradeAssessment, options: LegalAnnexOptions = {}): string {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const parties = resolveParties(assessment, options);
  const pp = assessment.costs?.producerPricing;
  const dp = c.deliveryPeriod;
  const isVol = isVoluntaryMarket(assessment.targetMarketId);
  const market = MARKETS.find(m => m.id === assessment.targetMarketId);

  const columns: Array<[string, string | number | null | undefined]> = [
    ['DealID', assessment.id],
    ['TradeDate', assessment.createdAt.slice(0, 10)],
    ['Status', isBlocked(assessment) ? 'NOT_TRADEABLE_REGULATORY_BLOCK' : 'INDICATIVE'],
    ['DeskRole', parties.deskRole],
    ['Book', isVol ? 'BIOMETHANE_VOLUNTARY_GO' : 'BIOMETHANE_COMPLIANCE'],
    ['Counterparty', c.counterparty ?? ''],
    ['OriginCountry', c.originCountry],
    ['OriginPlant', c.originPlantName || c.name],
    ['Feedstock', c.feedstockName],
    ['AnnexClassification', c.annexClassification],
    ['CarbonIntensity', c.carbonIntensity],
    ['VolumeMWh', c.volumeMWh],
    ['DeliveryPointVTP', dp?.deliveryPointVtp],
    ['ProducerPricingMode', pp?.mode],
    ['ProducerFixedPriceEurMwh', pp?.fixedPriceEurPerMwh],
    ['ProducerIndexShare', pp?.indexLinkedShare],
    ['GasIndexMarkEurMwh', assessment.marks.gasIndex.mid],
    ['AttributeValueEurMwh', nb.certificateValue?.valueEurPerMWh],
    ['DeskNetbackEurMwh', nb.netNetback],
    ['DeskMarginEurMwh', nb.deskMargin],
    ['DeskPnLEur', nb.deskPnL],
    ['ComplianceYear', dp?.complianceYear],
    ['ProductionStartDate', dp?.productionStartDate],
    ['ProductionEndDate', dp?.productionEndDate],
    ['DeliveryStartDate', dp?.startDate],
    ['DeliveryEndDate', dp?.endDate],
    ['DeliveryProfile', dp?.deliveryProfile],
    ['AttributeTransferDeadline', dp?.statutorySurrenderDeadline],
    ['TargetMarket', assessment.targetMarketId],
    ['RegistrySystem', market?.registry],
    ['DocumentFingerprint', calculateTradeIntegritySeal(assessment)],
  ];

  return `${columns.map(([h]) => h).join(',')}\r\n${columns.map(([, v]) => csvField(v)).join(',')}\r\n`;
}

// ---------------------------------------------------------------------------
// 9. UDB transfer preparation worksheet (internal)
// ---------------------------------------------------------------------------

/**
 * Preparation worksheet for a Union Database transfer. UDB entries are made by economic
 * operators in the UDB itself; this file is not a UDB message format, and it never invents a
 * PoS number, operator ID or EIC code — those come from the certification scheme and TSO.
 */
export function generateUdbNominationXmlPayload(assessment: TradeAssessment, options: LegalAnnexOptions = {}): string {
  const c = assessment.consignment;
  const parties = resolveParties(assessment, options);
  const now = new Date().toISOString();
  const seal = calculateTradeIntegritySeal(assessment);
  const sender = parties.deskRole === 'BUYER' ? parties.counterparty : parties.deskEntity;
  const recipient = parties.deskRole === 'BUYER' ? parties.deskEntity : parties.counterparty;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- UDB transfer preparation worksheet (internal). Not a UDB message format:
     enter the transfer in the Union Database. Bracketed fields must be completed from source documents. -->
<udbTransferWorksheet xmlns="urn:biomethane-desk:udb-worksheet:v2" generated="${now}">
  <reference>${escapeXml(assessment.id)}</reference>
  <legalBasis>Directive (EU) 2023/2413 Art. 31a; Implementing Regulation (EU) 2024/2792</legalBasis>
  <transferringOperator name="${escapeXml(sender)}" udbOperatorId="[FROM UDB ACCOUNT]"/>
  <receivingOperator name="${escapeXml(recipient)}" udbOperatorId="[FROM UDB ACCOUNT]"/>
  <originFacility>
    <name>${escapeXml(c.originPlantName || c.name)}</name>
    <country>${escapeXml(c.originCountry)}</country>
    <injectionGrid>${escapeXml(c.injectionCountry)}</injectionGrid>
    <injectionPointEic>[FROM TSO / DSO]</injectionPointEic>
  </originFacility>
  <proofOfSustainability>
    <posNumber>[ISSUED BY CERTIFICATION SCHEME]</posNumber>
    <certificationScheme>${escapeXml(c.certificationScheme)}</certificationScheme>
    <feedstock classification="${escapeXml(c.annexClassification)}">${escapeXml(c.feedstockName)}</feedstock>
    <ghgIntensity unit="gCO2e/MJ">${c.carbonIntensity}</ghgIntensity>
    <chainOfCustody>${escapeXml(c.chainOfCustody)}</chainOfCustody>
  </proofOfSustainability>
  <quantity unit="MWh">${c.volumeMWh ?? '[TO BE AGREED]'}</quantity>
  <targetMarket>${escapeXml(assessment.targetMarketId)}</targetMarket>
  <documentFingerprint algorithm="SHA-256">${seal}</documentFingerprint>
</udbTransferWorksheet>`;
}

/**
 * Browser download helper for text, XML, JSON, or Blob.
 */
export function downloadDealFile(filename: string, content: string | Blob, mimeType: string): void {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
