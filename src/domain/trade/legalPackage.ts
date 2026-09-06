import { jsPDF } from 'jspdf';
import { TradeAssessment } from './types';
import { MARKETS, isVoluntaryMarket } from '../markets/registry';

// ---------------------------------------------------------------------------
// 1. Pure Synchronous SHA-256 Implementation (Zero Dependencies)
// ---------------------------------------------------------------------------

function sha256(ascii: string): string {
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
 * Compute a deterministic SHA-256 cryptographic seal for any trade assessment.
 */
export function calculateTradeIntegritySeal(assessment: TradeAssessment): string {
  const c = assessment.consignment;
  const canonical = [
    assessment.id,
    c.counterparty || 'ANONYMOUS_COUNTERPARTY',
    c.feedstock || 'FEEDSTOCK',
    typeof c.carbonIntensity === 'number' ? c.carbonIntensity.toFixed(2) : '0.00',
    c.volumeMWh ?? 0,
    assessment.targetMarketId,
    assessment.netback.netNetback ?? 0,
    c.certificationScheme || 'ISCC_EU',
    c.chainOfCustody || 'MASS_BALANCE',
    assessment.createdAt,
  ].join('|');

  return sha256(canonical);
}

// ---------------------------------------------------------------------------
// 2. EFET Biomethane Annex & ISDA Confirmation PDF Generator
// ---------------------------------------------------------------------------

export interface LegalAnnexOptions {
  buyerName?: string;
  sellerName?: string;
  governingLaw?: 'ENGLISH_LAW' | 'GERMAN_LAW';
  masterAgreementDate?: string;
  tradingDeskEntity?: string;
}

/**
 * Generate an institutional EFET Biomethane Annex & ISDA Trade Confirmation PDF using jsPDF.
 */
export function generateEfetBiomethaneAnnexPdf(
  assessment: TradeAssessment,
  options: LegalAnnexOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const c = assessment.consignment;
  const nb = assessment.netback;
  const el = assessment.eligibility;
  const market = MARKETS.find(m => m.id === assessment.targetMarketId);

  const seller = options.sellerName || 'BIOMETHANE TRADING DESK EUROPE B.V.';
  const buyer = options.buyerName || c.counterparty || 'OFFTAKE COUNTERPARTY CORP';
  const governingLaw = options.governingLaw || 'ENGLISH_LAW';
  const maDate = options.masterAgreementDate || '15 January 2024';
  const seal = calculateTradeIntegritySeal(assessment);

  const volume = c.volumeMWh ?? 10000;
  const gasIndexPrice = assessment.marks.gasIndex.mid;
  const certPrice = nb.certificateValue?.valueEurPerMWh ?? null;

  const isNlDeal = assessment.targetMarketId === 'NL_ERE' || c.originCountry === 'NL' || c.injectionCountry === 'NL';

  // Margins and styling colors
  const margin = 18;
  let y = 20;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, 174, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('EUROPEAN FEDERATION OF ENERGY TRADERS (EFET)', margin + 4, y + 6);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('ANNEX RELATING TO BIOMETHANE TRANSACTIONS & INDIVIDUAL TRANSACTION CONFIRMATION', margin + 4, y + 11);
  doc.text(`Subject to EFET General Agreement (Gas Version 2.0(a)) · Dated ${maDate}`, margin + 4, y + 15);

  y += 24;

  // Trade Identification Strip
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, 174, 14, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Reference:', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(assessment.id, margin + 42, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Confirmation Date:', margin + 95, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(assessment.createdAt.slice(0, 10), margin + 128, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Governing Law:', margin + 3, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(governingLaw === 'ENGLISH_LAW' ? 'English Law (High Court of Justice, London)' : 'German Law (Frankfurt am Main)', margin + 42, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Statutory Basis:', margin + 95, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text('RED III Directive (EU) 2023/2413', margin + 128, y + 10);

  y += 18;

  // Section 1: Bilateral Counterparties
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONTRACTING PARTIES & FACILITY ATTRIBUTION', margin, y);
  y += 3;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const partiesData = [
    ['Party A (Seller):', seller, 'Origin Facility:', c.name || `${c.originCountryName} Biomethane Facility`],
    ['Party B (Buyer):', buyer, 'Origin Country:', `${c.originCountryName} (${c.originCountry})`],
    ['Interconnection Grid:', `${c.injectionCountry} Gas Transmission Grid`, 'Feedstock Substrate:', `${c.feedstockName} (Annex IX-A)`],
    ['Registry System:', market?.registry || 'Union Database (UDB)', 'Sustainability Scheme:', c.certificationScheme.replace(/_/g, ' ')],
  ];

  // Draw table manually for strict layout control
  partiesData.forEach(row => {
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], margin + 2, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], margin + 34, y + 3.5, { maxWidth: 58 });

    doc.setFont('helvetica', 'bold');
    doc.text(row[2], margin + 95, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.text(row[3], margin + 128, y + 3.5, { maxWidth: 46 });
    y += 5;
  });

  y += 3;

  // Section 2: Leg A - Physical Molecule Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. LEG A: PHYSICAL GAS MOLECULE DELIVERY TERMS', margin, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, 174, 22, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Commodity Specification:', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Raw pipeline-quality Biomethane complying with EN 16723-1 & national injection specs.', margin + 45, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Point (VTP):', margin + 3, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Virtual Trading Point (${c.injectionCountry} Transmission Grid / TTF Equivalent)`, margin + 45, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Contract Volume:', margin + 3, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${volume.toLocaleString()} MWh (approx. ${(volume / 365).toFixed(1)} MWh/day flat delivery profile)`, margin + 45, y + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Tolerance Collars & Pricing:', margin + 3, y + 18);
  doc.setFont('helvetica', 'normal');
  const gasPriceStr = gasIndexPrice !== null ? `TTF Month+1 (€${gasIndexPrice.toFixed(2)}/MWh)` : 'TTF Month+1 Floating Index';
  doc.text(`±5.0% Operational Volume Collar. Settlement: ${gasPriceStr} or Fixed Base.`, margin + 45, y + 18);

  y += 26;

  // Section 3: Leg B - Green Environmental Attribute & Certificate Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. LEG B: GREEN ATTRIBUTE & CERTIFICATE TRANSFER TERMS', margin, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, 174, 30, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Environmental Attribute:', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Guarantees of Origin (GO) / Proof of Sustainability (PoS) for ${assessment.targetMarketName}.`, margin + 45, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Contract Carbon Intensity:', margin + 3, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${c.carbonIntensity} gCO₂e/MJ (Audited under ISCC EU / RED III standard methodology).`, margin + 45, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Dynamic CI Slider Clause:', margin + 3, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text('P_adj = P_base + α × (CI_contract − CI_delivered). Price floor: €0/MWh; Cap: Statutory ceiling.', margin + 45, y + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Registry Transfer Mechanics:', margin + 3, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`Title transferred via ${market?.registry || 'Union Database (UDB)'} within 30 days of production month end.`, margin + 45, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Green Premium Valuation:', margin + 3, y + 22.5);
  const certPriceStr = certPrice !== null ? `€${certPrice.toFixed(2)}/MWh` : 'Unsettled';
  doc.text(`Attribute Unit Value: ${certPriceStr}. Netback Payable: €${(nb.netNetback ?? 0).toFixed(2)}/MWh.`, margin + 45, y + 22.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Chain of Custody:', margin + 3, y + 27);
  doc.setFont('helvetica', 'normal');
  doc.text(`${c.chainOfCustody.replace(/_/g, ' ')} under RED III Article 31a single interconnected area.`, margin + 45, y + 27);

  y += 34;

  // Section 4: Subsidy Clawback & Double Beneficiary Clause (SDE++ if NL)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. STATUTORY COMPLIANCE & SUBSIDY CLAWBACK COVENANT', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);

  const subsidyText = isNlDeal
    ? 'SPECIAL DUTCH SDE++ COVENANT: The Seller explicitly covenants that for any volume delivered under this Annex into or out of the Netherlands, no double financial compensation under the Dutch SDE/SDE++ subsidy regime has been retained without statutory correction. Seller warrants full compliance with VertiCer export cancellation and UDB single-accounting rules.'
    : 'GENERAL SUBSIDY & DOUBLE-COUNTING COVENANT: Seller warrants that biomethane volumes delivered have not been simultaneously claimed against national feed-in subsidies (EEG, GSE, or similar) where prohibited by national transposition of RED III Directive (EU) 2023/2413.';

  const splitSubsidy = doc.splitTextToSize(subsidyText, 172);
  doc.text(splitSubsidy, margin + 2, y + 1);
  y += splitSubsidy.length * 3.5 + 4;

  // Section 5: 6-Gate Statutory Audit Evaluation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. REGULATORY VERIFICATION CHECKLIST (6-GATE AUDIT SUMMARY)', margin, y);
  y += 4;

  el.gates.slice(0, 6).forEach((gate, idx) => {
    const isPass = gate.verdict === 'PASS';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(isPass ? 22 : 180, isPass ? 101 : 83, isPass ? 52 : 9);
    doc.text(`[${gate.verdict}]`, margin + 2, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Gate ${idx + 1}: ${gate.gateLabel}`, margin + 18, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const shortReason = gate.reason.length > 80 ? gate.reason.slice(0, 77) + '...' : gate.reason;
    doc.text(shortReason, margin + 78, y);

    y += 3.8;
  });

  y += 5;

  // Section 6: Execution & Signature Blocks
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('6. EXECUTION & AUTHORIZATION', margin, y);
  y += 5;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + 75, y);
  doc.line(margin + 99, y, margin + 174, y);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`For: ${seller}`, margin, y + 4);
  doc.text(`For: ${buyer}`, margin + 99, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Commercial Signatory', margin, y + 8);
  doc.text('Authorized Commercial Signatory', margin + 99, y + 8);

  y += 18;

  // Footer: Cryptographic SHA-256 Integrity Seal
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, y, 174, 11, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CRYPTOGRAPHIC SHA-256 INTEGRITY AUDIT SEAL:', margin + 3, y + 4.5);
  doc.setFont('courier', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(seal, margin + 3, y + 8.5);

  return doc;
}

// ---------------------------------------------------------------------------
// 3. ETRM FpML 5.x XML Generator
// ---------------------------------------------------------------------------

/**
 * Escapes characters with special meaning in XML (e.g. & < > " ')
 */
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
 * Generate standard FpML 5.x XML machine-readable deal confirmation.
 */
export function generateFpMLDealPayload(assessment: TradeAssessment): string {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const seal = calculateTradeIntegritySeal(assessment);
  const now = new Date().toISOString();
  const volume = c.volumeMWh ?? 10000;
  const gasPrice = assessment.marks.gasIndex.mid;
  const certValue = nb.certificateValue?.valueEurPerMWh ?? null;
  const counterpartyRaw = c.counterparty || 'OFFTAKE COUNTERPARTY CORP';
  const sendToCode = counterpartyRaw.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();

  return `<?xml version="1.0" encoding="UTF-8"?>
<fpml:dataDocument xmlns:fpml="http://www.fpml.org/FpML-5/recordkeeping"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   fpmlVersion="5-12">
  <fpml:header>
    <fpml:messageId messageIdScheme="urn:biomethane:desk:msg">${escapeXml(assessment.id)}</fpml:messageId>
    <fpml:sentBy>BIOMETHANE_DESK_EUROPE</fpml:sentBy>
    <fpml:sendTo>${escapeXml(sendToCode)}</fpml:sendTo>
    <fpml:creationTimestamp>${now}</fpml:creationTimestamp>
  </fpml:header>

  <fpml:trade>
    <fpml:tradeHeader>
      <fpml:partyTradeIdentifier>
        <fpml:partyReference href="Party1"/>
        <fpml:tradeId tradeIdScheme="urn:efet:biomethane">${escapeXml(assessment.id)}</fpml:tradeId>
      </fpml:partyTradeIdentifier>
      <fpml:tradeDate>${escapeXml(assessment.createdAt.slice(0, 10))}</fpml:tradeDate>
    </fpml:tradeHeader>

    <fpml:commoditySwap>
      <!-- LEG A: Physical Gas Molecule -->
      <fpml:gasPhysicalLeg>
        <fpml:payerPartyReference href="Party2"/>
        <fpml:receiverPartyReference href="Party1"/>
        <fpml:deliveryPoint>${c.injectionCountry}_VTP_TRANSMISSION</fpml:deliveryPoint>
        <fpml:commoditySpecification>
          <fpml:commodityId>NATURAL_GAS_BIOMETHANE_EN16723</fpml:commodityId>
        </fpml:commoditySpecification>
        <fpml:quantity>
          <fpml:amount>${volume}</fpml:amount>
          <fpml:unitOfMeasure>MWh</fpml:unitOfMeasure>
        </fpml:quantity>
        <fpml:settlementPrice>
          <fpml:currency>EUR</fpml:currency>
          <fpml:amount>${gasPrice !== null ? gasPrice.toFixed(2) : '0.00'}</fpml:amount>
          <fpml:priceType>TTF_MONTH_PLUS_ONE_INDEX</fpml:priceType>
        </fpml:settlementPrice>
        <fpml:toleranceCollar>
          <fpml:percentage>0.05</fpml:percentage>
          <fpml:penaltyMechanism>TAKE_OR_PAY</fpml:penaltyMechanism>
        </fpml:toleranceCollar>
      </fpml:gasPhysicalLeg>

      <!-- LEG B: Environmental Attribute / Certificate -->
      <fpml:environmentalLeg>
        <fpml:payerPartyReference href="Party2"/>
        <fpml:receiverPartyReference href="Party1"/>
        <fpml:attributeType>BIOMETHANE_GUARANTEE_OF_ORIGIN</fpml:attributeType>
        <fpml:complianceScheme>RED_III_DIRECTIVE_2023_2413</fpml:complianceScheme>
        <fpml:targetMarket>${assessment.targetMarketId}</fpml:targetMarket>
        <fpml:carbonIntensity>
          <fpml:metric>gCO2e/MJ</fpml:metric>
          <fpml:contractValue>${c.carbonIntensity}</fpml:contractValue>
          <fpml:alphaAdjuster>0.0125</fpml:alphaAdjuster>
        </fpml:carbonIntensity>
        <fpml:certificateQuantity>
          <fpml:amount>${volume}</fpml:amount>
          <fpml:unitOfMeasure>MWh</fpml:unitOfMeasure>
        </fpml:certificateQuantity>
        <fpml:attributePrice>
          <fpml:currency>EUR</fpml:currency>
          <fpml:amount>${certValue !== null ? certValue.toFixed(2) : '0.00'}</fpml:amount>
        </fpml:attributePrice>
        <fpml:registryTransfer>
          <fpml:registry>UNION_DATABASE_UDB</fpml:registry>
          <fpml:settlementWindowDays>30</fpml:settlementWindowDays>
        </fpml:registryTransfer>
      </fpml:environmentalLeg>
    </fpml:commoditySwap>

    <fpml:documentation>
      <fpml:masterAgreement>
        <fpml:masterAgreementType>EFET_GAS_2_0_A</fpml:masterAgreementType>
        <fpml:masterAgreementVersion>2024_BIOMETHANE_ANNEX</fpml:masterAgreementVersion>
      </fpml:masterAgreement>
    </fpml:documentation>
  </fpml:trade>

  <fpml:party id="Party1">
    <fpml:partyId partyIdScheme="urn:lei">969500XXXXXXXXXX01</fpml:partyId>
    <fpml:partyName>BIOMETHANE TRADING DESK EUROPE B.V.</fpml:partyName>
  </fpml:party>

  <fpml:party id="Party2">
    <fpml:partyId partyIdScheme="urn:lei">969500XXXXXXXXXX02</fpml:partyId>
    <fpml:partyName>${escapeXml(counterpartyRaw)}</fpml:partyName>
  </fpml:party>

  <!-- Cryptographic SHA-256 Audit Seal -->
  <fpml:digitalSignature>
    <fpml:digestMethod algorithm="SHA-256"/>
    <fpml:digestValue>${seal}</fpml:digestValue>
  </fpml:digitalSignature>
</fpml:dataDocument>`;
}

// ---------------------------------------------------------------------------
// 4. Standardized ETRM JSON Deal Ticket (OpenLink / TriplePoint / SAP)
// ---------------------------------------------------------------------------

export interface EtrmJsonDealTicket {
  dealHeader: {
    dealId: string;
    tradeDate: string;
    effectiveDate: string;
    createdTimestamp: string;
    traderId: string;
    tradingBook: string;
    systemCompatibility: string[];
    legalAgreement: string;
  };
  counterparty: {
    name: string;
    lei: string;
    role: 'BUYER' | 'SELLER';
    registryAccount: string;
  };
  sourcingFacility: {
    name: string;
    country: string;
    feedstock: string;
    annexClassification: string;
    certificationScheme: string;
    chainOfCustody: string;
  };
  legA_physicalMolecule: {
    commodity: string;
    deliveryPointVtp: string;
    volumeMWh: number;
    dailyVolumeMWh: number;
    priceMode: 'TTF_INDEX' | 'FIXED';
    basePriceEurMwh: number;
    volumeTolerancePct: number;
    takeOrPayPenaltyEurMwh: number;
  };
  legB_environmentalAttribute: {
    targetMarketId: string;
    targetMarketName: string;
    contractCiGco2ePerMj: number;
    benchmarkCiGco2ePerMj: number;
    attributeValueEurMwh: number;
    netbackPayableEurMwh: number;
    alphaPriceAdjuster: number;
    priceFloorEurMwh: number;
    priceCeilingEurMwh: number | null;
    registrySystem: string;
    titleTransferDays: number;
    subsidyClause: {
      sdePlusPlusApplicable: boolean;
      doubleCountingWarranted: boolean;
    };
  };
  regulatoryChecklist: Array<{
    gate: string;
    verdict: string;
    statutoryCitation: string;
  }>;
  financialSummary: {
    totalDealValueEur: number;
    annualDeskMarginEur: number;
    settlementTerms: string;
    vatTreatment: string;
  };
  cryptographicIntegritySeal: {
    algorithm: 'SHA-256';
    hash: string;
    verificationStatus: 'SEALED_VALID';
  };
}

/**
 * Generate standardized ETRM deal payload compatible with OpenLink Endur, TriplePoint, and SAP Commodity Management.
 */
export function generateEtrmJsonPayload(assessment: TradeAssessment): EtrmJsonDealTicket {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const seal = calculateTradeIntegritySeal(assessment);
  const volume = c.volumeMWh ?? 10000;
  const gasPrice = assessment.marks.gasIndex.mid;
  const certValue = nb.certificateValue?.valueEurPerMWh ?? null;
  const netNetback = nb.netNetback ?? 0;
  const marginPerMwh = nb.deskMargin ?? 0;

  const isNlDeal = assessment.targetMarketId === 'NL_ERE' || c.originCountry === 'NL' || c.injectionCountry === 'NL';

  return {
    dealHeader: {
      dealId: assessment.id,
      tradeDate: assessment.createdAt.slice(0, 10),
      effectiveDate: assessment.createdAt.slice(0, 10),
      createdTimestamp: assessment.createdAt,
      traderId: 'DESK_TRADER_EU',
      tradingBook: 'BIOMETHANE_DESK_EUR',
      systemCompatibility: [
        'OpenLink_Endur_v22',
        'TriplePoint_Commodity_XL_v15',
        'SAP_S4HANA_Commodity_Management',
      ],
      legalAgreement: 'EFET_GAS_2_0_A_BIOMETHANE_ANNEX',
    },
    counterparty: {
      name: c.counterparty || 'OFFTAKE COUNTERPARTY CORP',
      lei: '969500XXXXXXXXXX02',
      role: 'BUYER',
      registryAccount: `${assessment.targetMarketId}_REG_ACC_001`,
    },
    sourcingFacility: {
      name: c.name || `${c.originCountryName} Biomethane Facility`,
      country: c.originCountry,
      feedstock: c.feedstockName,
      annexClassification: c.annexClassification,
      certificationScheme: c.certificationScheme,
      chainOfCustody: c.chainOfCustody,
    },
    legA_physicalMolecule: {
      commodity: 'NATURAL_GAS_BIOMETHANE_EN16723',
      deliveryPointVtp: `${c.injectionCountry}_VTP_TRANSMISSION`,
      volumeMWh: volume,
      dailyVolumeMWh: Number((volume / 365).toFixed(2)),
      priceMode: 'TTF_INDEX',
      basePriceEurMwh: gasPrice ?? 0,
      volumeTolerancePct: 0.05,
      takeOrPayPenaltyEurMwh: 0,
    },
    legB_environmentalAttribute: {
      targetMarketId: assessment.targetMarketId,
      targetMarketName: assessment.targetMarketName,
      contractCiGco2ePerMj: c.carbonIntensity,
      benchmarkCiGco2ePerMj: 94.0, // RED III fossil comparator
      attributeValueEurMwh: certValue ?? 0,
      netbackPayableEurMwh: netNetback,
      alphaPriceAdjuster: 0.0125,
      priceFloorEurMwh: 0.0,
      priceCeilingEurMwh: assessment.targetMarketId === 'FR_CPB' ? 100.0 : null,
      registrySystem: 'UNION_DATABASE_UDB',
      titleTransferDays: 30,
      subsidyClause: {
        sdePlusPlusApplicable: isNlDeal,
        doubleCountingWarranted: true,
      },
    },
    regulatoryChecklist: assessment.eligibility.gates.map(g => ({
      gate: g.gateLabel,
      verdict: g.verdict,
      statutoryCitation: g.citations[0]?.fullReference || 'Directive (EU) 2023/2413',
    })),
    financialSummary: {
      totalDealValueEur: gasPrice !== null && certValue !== null ? Number(((gasPrice + certValue) * volume).toFixed(2)) : 0,
      annualDeskMarginEur: Number((marginPerMwh * volume).toFixed(2)),
      settlementTerms: 'NET_30_DAYS_EOM',
      vatTreatment: 'REVERSE_CHARGE_ARTICLE_199A_EU_VAT_DIRECTIVE',
    },
    cryptographicIntegritySeal: {
      algorithm: 'SHA-256',
      hash: seal,
      verificationStatus: 'SEALED_VALID',
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Commercial Counterparty Term Sheet PDF Generator
// ---------------------------------------------------------------------------

export function generateCommercialTermSheetPdf(
  assessment: TradeAssessment,
  options: LegalAnnexOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const c = assessment.consignment;
  const nb = assessment.netback;
  const market = MARKETS.find(m => m.id === assessment.targetMarketId);
  const seller = options.sellerName || 'BIOMETHANE TRADING DESK EUROPE B.V.';
  const buyer = options.buyerName || c.counterparty || 'OFFTAKE COUNTERPARTY CORP';
  const volume = c.volumeMWh ?? 10000;
  const seal = calculateTradeIntegritySeal(assessment);

  const margin = 18;
  let y = 20;

  // Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, 174, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('COMMERCIAL TRANSACTION TERM SHEET', margin + 5, y + 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('CONFIDENTIAL & BINDING OTC BIOMETHANE & ENVIRONMENTAL ATTRIBUTE SPECIFICATION', margin + 5, y + 13);

  y += 24;

  // Deal Overview Bar
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, 174, 15, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Deal Reference:', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(assessment.id, margin + 35, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Terms:', margin + 95, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(assessment.createdAt.slice(0, 10), margin + 125, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Counterparty (Buyer):', margin + 4, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(buyer, margin + 35, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Trading Principal:', margin + 95, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(seller, margin + 125, y + 10);

  y += 20;

  // Section 1: Commodity Specifications
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. COMMODITY & VOLUME SPECIFICATIONS', margin, y);
  y += 4;

  const gasPrice = assessment.marks.gasIndex.mid ?? 0;
  const certVal = nb.certificateValue?.valueEurPerMWh ?? 0;
  const allInDelivered = gasPrice + certVal;

  const commData = [
    ['Commodity Definition', 'Pipeline-quality Biomethane complying with EN 16723-1 standards'],
    ['Annual Contract Volume', `${volume.toLocaleString()} MWh/annum (~${(volume / 365).toFixed(1)} MWh/day flat profile)`],
    ['Origin Facility', `${c.name || 'Certified European Biomethane Facility'} (${c.originCountry})`],
    ['Delivery Hub (VTP)', `${c.injectionCountry} Virtual Trading Point (TSO High Pressure Interconnected)`],
    ['Feedstock & RED III Substrate', `${c.feedstockName || 'Manure / Organic Residue'} (Annex IX Part A Compliant)`],
    ['Contract Carbon Intensity', `${c.carbonIntensity} gCO₂e/MJ (Verified audited GHG performance)`],
    ['Sustainability Certification', `${c.certificationScheme.replace(/_/g, ' ')} under Mass Balance Chain of Custody`],
  ];

  doc.setFontSize(8);
  commData.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(lbl, margin + 2, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, margin + 55, y + 3, { maxWidth: 115 });
    y += 5;
  });

  y += 4;

  // Section 2: Pricing Structure & Commercial Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. COMMERCIAL PRICING & INDEXATION FORMULA', margin, y);
  y += 4;

  const priceData = [
    ['Leg A: Physical Molecule', `TTF Month-Ahead Floating Index (Settlement reference: €${gasPrice.toFixed(2)}/MWh)`],
    ['Leg B: Environmental Attribute', `Statutory Sink: ${assessment.targetMarketName} (${market?.unitLabel})`],
    ['Green Premium Unit Value', `€${certVal.toFixed(2)}/MWh delivered environmental attribute`],
    ['All-In Total Transaction Value', `€${allInDelivered.toFixed(2)}/MWh (Notional Deal Value: €${Math.round(allInDelivered * volume).toLocaleString()})`],
    ['Dynamic Carbon Slider', 'P_delivered = P_contract + α × (CI_contract − CI_actual) with statutory cap'],
    ['Operational Volume Collar', '±5.0% annual operational tolerance. Take-or-pay settlement on shortfall.'],
  ];

  priceData.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(lbl, margin + 2, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, margin + 55, y + 3, { maxWidth: 115 });
    y += 5;
  });

  y += 4;

  // Section 3: Registry Transfer & Settlement Schedule
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('3. REGISTRY TRANSFER & COMPLIANCE UNDERTAKING', margin, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const legalText = `Title to the environmental attributes shall be transferred via the European Commission Union Database (UDB) under RED III Article 31a single mass balance rules, or designated national registry (${market?.registry || 'dena / VertiCer'}), within thirty (30) calendar days of production month end. Seller covenants that the biomethane has not been double-claimed against conflicting national feed-in subsidies (EEG, GSE, or French Obligation d'Achat).`;
  const splitText = doc.splitTextToSize(legalText, 172);
  doc.text(splitText, margin + 2, y + 2);
  y += splitText.length * 3.5 + 8;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. ACCEPTANCE & EXECUTION', margin, y);
  y += 5;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + 75, y);
  doc.line(margin + 99, y, margin + 174, y);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`For: ${seller}`, margin, y + 4);
  doc.text(`For: ${buyer}`, margin + 99, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Commercial Representative', margin, y + 8);
  doc.text('Authorized Commercial Representative', margin + 99, y + 8);

  y += 18;

  // Integrity Footer
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, 174, 9, 'FD');
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CRYPTOGRAPHIC AUDIT SEAL:', margin + 3, y + 4);
  doc.setFont('courier', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(seal, margin + 3, y + 7.5);

  return doc;
}

// ---------------------------------------------------------------------------
// 6. ETRM Deal Ticket CSV Generator
// ---------------------------------------------------------------------------

export function generateEtrmCsvPayload(assessment: TradeAssessment): string {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const gasPrice = assessment.marks.gasIndex.mid ?? 0;
  const certVal = nb.certificateValue?.valueEurPerMWh ?? 0;
  const totalDelivered = gasPrice + certVal;
  const deskMargin = nb.deskMargin ?? 0;
  const volume = c.volumeMWh ?? 10000;
  const totalDealValue = totalDelivered * volume;
  const seal = calculateTradeIntegritySeal(assessment);

  const headers = [
    'DealID',
    'TradeDate',
    'TradingBook',
    'TraderID',
    'Counterparty',
    'OriginCountry',
    'OriginPlant',
    'Feedstock',
    'CarbonIntensity',
    'VolumeMWh',
    'DailyVolumeMWh',
    'DeliveryPointVTP',
    'PriceMode',
    'GasIndexBaseEurMwh',
    'AttributeValueEurMwh',
    'TotalDeliveredEurMwh',
    'DeskMarginEurMwh',
    'TotalDealValueEur',
    'TargetMarket',
    'RegistrySystem',
    'IntegritySeal',
  ];

  const isVol = isVoluntaryMarket(assessment.targetMarketId);

  const values = [
    assessment.id,
    assessment.createdAt.slice(0, 10),
    isVol ? 'BIOMETHANE_VOLUNTARY_GO' : 'BIOMETHANE_COMPLIANCE_QUOTA',
    'DESK_TRADER_EU',
    `"${c.counterparty || 'OFFTAKE COUNTERPARTY CORP'}"`,
    c.originCountry,
    `"${c.name || 'Certified Biomethane Plant'}"`,
    `"${c.feedstockName}"`,
    c.carbonIntensity,
    volume,
    (volume / 365).toFixed(2),
    `${c.injectionCountry}_VTP`,
    'TTF_INDEX',
    gasPrice.toFixed(2),
    certVal.toFixed(2),
    totalDelivered.toFixed(2),
    deskMargin.toFixed(2),
    totalDealValue.toFixed(2),
    assessment.targetMarketId,
    isVol ? 'NATIONAL_GO_AIB_EECS' : 'UNION_DATABASE_UDB',
    seal,
  ];

  return `${headers.join(',')}\r\n${values.join(',')}\r\n`;
}

// ---------------------------------------------------------------------------
// 7. UDB Mass Balance Nomination XML Payload Generator
// ---------------------------------------------------------------------------

export function generateUdbNominationXmlPayload(assessment: TradeAssessment): string {
  const c = assessment.consignment;
  const seal = calculateTradeIntegritySeal(assessment);
  const now = new Date().toISOString();
  const volume = c.volumeMWh ?? 10000;

  return `<?xml version="1.0" encoding="UTF-8"?>
<udb:consignmentTransfer xmlns:udb="https://udb.ec.europa.eu/schema/v1/mass-balance"
                         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                         version="1.4">
  <udb:header>
    <udb:messageIdentifier>UDB-TX-${escapeXml(assessment.id)}</udb:messageIdentifier>
    <udb:senderEconomicOperatorId>EO-969500XXXXXXXXXX01</udb:senderEconomicOperatorId>
    <udb:recipientEconomicOperatorId>EO-969500XXXXXXXXXX02</udb:recipientEconomicOperatorId>
    <udb:timestamp>${now}</udb:timestamp>
    <udb:legalDirective>Directive (EU) 2023/2413 (RED III)</udb:legalDirective>
  </udb:header>

  <udb:consignment>
    <udb:originFacility>
      <udb:facilityId>${escapeXml(c.id || 'DK-BIO-001')}</udb:facilityId>
      <udb:facilityName>${escapeXml(c.name || 'European Biomethane Facility')}</udb:facilityName>
      <udb:country>${c.originCountry}</udb:country>
      <udb:gridInjectionPointEIC>${c.injectionCountry}-TSO-VTP-001</udb:gridInjectionPointEIC>
    </udb:originFacility>

    <udb:proofOfSustainability>
      <udb:posCertificateNumber>POS-${escapeXml(assessment.id)}-01</udb:posCertificateNumber>
      <udb:certificationScheme>${escapeXml(c.certificationScheme)}</udb:certificationScheme>
      <udb:feedstockCategory>${escapeXml(c.feedstockName)}</udb:feedstockCategory>
      <udb:annexClassification>${escapeXml(c.annexClassification)}</udb:annexClassification>
      <udb:greenhouseGasIntensity metric="gCO2e/MJ">${c.carbonIntensity}</udb:greenhouseGasIntensity>
      <udb:chainOfCustody>MASS_BALANCE_SINGLE_INTERCONNECTED_SYSTEM</udb:chainOfCustody>
    </udb:proofOfSustainability>

    <udb:transferBatch>
      <udb:energyQuantity unit="MWh">${volume}</udb:energyQuantity>
      <udb:targetComplianceMarket>${escapeXml(assessment.targetMarketId)}</udb:targetComplianceMarket>
      <udb:titleTransferEffectiveDate>${assessment.createdAt.slice(0, 10)}</udb:titleTransferEffectiveDate>
      <udb:escrowStatus>RELEASED_UPON_CONFIRMATION</udb:escrowStatus>
    </udb:transferBatch>
  </udb:consignment>

  <udb:auditSeal algorithm="SHA-256">${seal}</udb:auditSeal>
</udb:consignmentTransfer>`;
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

