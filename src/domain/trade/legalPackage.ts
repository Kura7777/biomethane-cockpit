import { TradeAssessment } from './types';
import { MARKETS, isVoluntaryMarket } from '../markets/registry';
import { Market } from '../markets/types';
import { AnnexClassification, ChainOfCustody, UDBStatus } from '../consignment/types';

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
  let i: number;
  let j: number;

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

export function environmentalAttributeLabel(market: Market | undefined, marketId: string, udbStatus?: UDBStatus): string {
  if (market?.isGuaranteeOfOrigin || isVoluntaryMarket(marketId)) return 'Guarantees of Origin (GO)';
  if (marketId === 'UK_RTFO') return 'Renewable Transport Fuel Certificates (RTFCs) under the UK RTFO';
  if (marketId === 'FUELEU') return 'Proof of Sustainability supporting FuelEU Maritime compliance';
  if (udbStatus === 'PENDING') return 'Proof of Sustainability (PoS) — UDB recording: to be confirmed by Seller';
  if (udbStatus === 'NOT_RECORDED') return 'Proof of Sustainability (PoS) — not recorded in UDB';
  return 'Proof of Sustainability (PoS) recorded in the Union Database';
}

export const fmtMwh = (v: number | null | undefined) => (v != null ? `${v.toLocaleString()} MWh` : TBA);
export const orTba = (v: string | number | null | undefined) => (v != null && String(v).trim() !== '' ? String(v) : TBA);

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

export const isBlocked = (a: TradeAssessment) => a.eligibility?.overallVerdict === 'HARD_BLOCK';

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
    <attributeType>${escapeXml(environmentalAttributeLabel(market, assessment.targetMarketId, c.udbStatus))}</attributeType>
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
      attributeType: environmentalAttributeLabel(market, assessment.targetMarketId, c.udbStatus),
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
  <legalBasis>Directive (EU) 2023/2413 Art. 31a (Union Database gas module not yet live — launch postponed to end-2026 per EBA); Implementing Regulation (EU) 2022/996 Art. 18</legalBasis>
  <transferringOperator name="${escapeXml(sender)}" udbOperatorId="[FROM UDB ACCOUNT]"/>
  <receivingOperator name="${escapeXml(recipient)}" udbOperatorId="[FROM UDB ACCOUNT]"/>
  <originFacility>
    <name>${escapeXml(c.originPlantName || c.name)}</name>
    <country>${escapeXml(c.originCountry)}</country>
    <injectionGrid>${escapeXml(c.injectionCountry)}</injectionGrid>
    <injectionPointEic>[FROM TSO / DSO]</injectionPointEic>
  </originFacility>
  <proofOfSustainability>
    <posNumber>${c.posStatus === 'ISSUED' ? '[ISSUED BY CERTIFICATION SCHEME]' : c.posStatus === 'PENDING' ? '[TO BE CONFIRMED BY SELLER]' : '[NOT AVAILABLE]'}</posNumber>
    <certificationScheme>${escapeXml(c.certificationScheme)}</certificationScheme>
    <feedstock classification="${escapeXml(c.annexClassification)}">${escapeXml(c.feedstockName)}</feedstock>
    <ghgIntensity unit="gCO2e/MJ">${c.carbonIntensity}</ghgIntensity>
    <chainOfCustody>${escapeXml(c.chainOfCustody)}</chainOfCustody>
  </proofOfSustainability>
  <quantity unit="MWh">${c.volumeMWh ?? '[TO BE AGREED]'}</quantity>
  <targetMarket>${escapeXml(assessment.targetMarketId)}</targetMarket>
  <udbStatus>${c.udbStatus === 'PENDING' ? 'UDB recording: to be confirmed by Seller' : c.udbStatus}</udbStatus>
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
