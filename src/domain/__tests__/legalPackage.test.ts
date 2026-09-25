import { describe, it, expect } from 'vitest';
import { 
  calculateTradeIntegritySeal, 
  generateEfetBiomethaneAnnexPdf, 
  generateCommercialTermSheetPdf,
  generateStatutoryAuditMemoPdf,
  generateEtrmCsvPayload,
  generateUdbNominationXmlPayload,
  inferDeskRole,
  resolveParties,
  describePricing,
  generateFpMLDealPayload,
  generateEtrmJsonPayload 
} from '../trade/legalPackage';
import { TradeAssessment } from '../trade/types';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { MARKETS } from '../markets/registry';

describe('Hybrid Legal Package & ETRM Export Engine', () => {
  const baseConsignment = {
    ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
    volumeMWh: 50000,
    counterparty: 'Shell Energy Europe B.V.',
  };

  const mockAssessment: TradeAssessment = {
    id: 'DOS-2026-0905',
    createdAt: '2026-09-05T14:30:00.000Z',
    consignment: baseConsignment,
    targetMarketId: 'DE_THG',
    targetMarketName: 'Germany THG Quota (Federal Immission Control Act)',
    eligibility: {
      marketId: 'DE_THG',
      marketName: 'Germany THG Quota (Federal Immission Control Act)',
      overallVerdict: 'ELIGIBLE',
      blockingGate: null,
      summary: 'Consignment satisfies all RED III Annex IX requirements.',
      gates: [
        {
          gate: 'FEEDSTOCK_CATEGORY',
          gateLabel: 'Feedstock Eligibility',
          verdict: 'PASS',
          reason: 'Annex IX-A advanced manure substrate.',
          remedy: null,
          citations: [
            {
              shortName: 'RED III Annex IX-A',
              fullReference: 'Directive (EU) 2023/2413 Annex IX Part A',
              establishes: 'Annex IX Part A eligibility for manure',
              verifiedDate: '2026-08-01',
              sourceUrl: 'https://eur-lex.europa.eu',
            },
          ],
          confidence: 'HIGH',
        },
      ],
    },
    netback: {
      marketId: 'DE_THG',
      marketName: 'Germany THG Quota',
      certificateValue: {
        valueEurPerMWh: 135.0,
        calculation: '380 * 2.0 * factor',
        unitConversion: '1 tCO2e / MWh',
        capped: false,
        capReason: null,
      },
      moleculeValue: 38.50,
      totalCosts: 10.0,
      netNetback: 163.50,
      grossValueSpread: 1.50,
      producerPayable: 162.0,
      deskMargin: 1.50,
      marginPercent: 0.92,
      grossSpreadPnL: 75000,
      deskPnL: 75000,
      isTheoretical: false,
      blockingReason: null,
      isComplete: true,
      missingInputs: [],
      uncertaintyBranches: null,
      markSideUsed: 'bid',
    },
    marks: {
      marks: {
        DE_THG: {
          marketId: 'DE_THG',
          bid: 375.0,
          offer: 385.0,
          mid: 380.0,
          updatedAt: '2026-09-05T10:00:00Z',
          source: 'Argus Media',
        },
      },
      gasIndex: {
        bid: 38.0,
        offer: 39.0,
        mid: 38.50,
        updatedAt: '2026-09-05T10:00:00Z',
      },
      fx: {
        gbpEur: 1.18,
        chfEur: 1.05,
        updatedAt: '2026-09-05T10:00:00Z',
      },
      pricingSides: {
        certificateSide: 'bid',
        moleculeSide: 'bid',
      },
    },
    costs: {
      transferCosts: 1.50,
      certificationCosts: 0.50,
      logistics: 3.50,
      otherCosts: 4.50,
      producerPricing: null,
    },
    userNotes: 'Institutional trade dossier confirmation test',
  };

  describe('Cryptographic SHA-256 Integrity Seal', () => {
    it('generates a valid 64-character hex hash deterministically', () => {
      const seal1 = calculateTradeIntegritySeal(mockAssessment);
      const seal2 = calculateTradeIntegritySeal(mockAssessment);

      expect(seal1).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(seal1)).toBe(true);
      expect(seal1).toBe(seal2);
    });

    it('changes when trade parameters change (collision avoidance)', () => {
      const sealOriginal = calculateTradeIntegritySeal(mockAssessment);

      const modifiedAssessment = {
        ...mockAssessment,
        consignment: {
          ...mockAssessment.consignment,
          carbonIntensity: -95.0, // Modified CI
        },
      };

      const sealModified = calculateTradeIntegritySeal(modifiedAssessment);
      expect(sealOriginal).not.toBe(sealModified);
    });
  });

  describe('EFET Biomethane Annex PDF Generator', () => {
    it('creates a professional multi-page jsPDF document', () => {
      const pdf = generateEfetBiomethaneAnnexPdf(mockAssessment);
      expect(pdf).toBeDefined();

      // Ensure PDF document has pages and metadata
      const pageCount = pdf.getNumberOfPages();
      expect(pageCount).toBeGreaterThanOrEqual(1);

      // Verify PDF output binary string length
      const output = pdf.output();
      expect(output.length).toBeGreaterThan(1000);
      expect(output).toContain('%PDF-');
    });

    it('handles Dutch SDE++ specific clauses when target is Netherlands', () => {
      const nlAssessment: TradeAssessment = {
        ...mockAssessment,
        targetMarketId: 'NL_ERE',
        targetMarketName: 'Netherlands ERE Transport Compliance',
      };

      const pdf = generateEfetBiomethaneAnnexPdf(nlAssessment);
      expect(pdf).toBeDefined();
      const output = pdf.output();
      expect(output.length).toBeGreaterThan(1000);
    });
  });

  describe('Internal deal record XML (FpML-inspired, not schema-validated)', () => {
    it('generates a well-formed internal deal record with physical and environmental legs', () => {
      const xml = generateFpMLDealPayload(mockAssessment);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('NOT validated against the FpML schema');
      expect(xml).toContain('<dealRecord');
      expect(xml).toContain(mockAssessment.id);
      expect(xml).toContain('<physicalLeg>');
      expect(xml).toContain('<environmentalLeg>');
      expect(xml).toContain('Proof of Sustainability (PoS) recorded in the Union Database');
      expect(xml).toContain(calculateTradeIntegritySeal(mockAssessment));
      // No fabricated identifiers
      expect(xml).not.toContain('969500XXXX');
      expect(xml).not.toContain('digitalSignature');
    });

    it('escapes XML special characters in counterparty names to ensure valid XML', () => {
      const specialAssessment: TradeAssessment = {
        ...mockAssessment,
        consignment: {
          ...mockAssessment.consignment,
          counterparty: 'Tier-1 Energy Trading GmbH & Co. <KG>',
        },
      };

      const xml = generateFpMLDealPayload(specialAssessment);
      expect(xml).toContain('Tier-1 Energy Trading GmbH &amp; Co. &lt;KG&gt;');
      expect(xml).not.toContain('Tier-1 Energy Trading GmbH & Co. <KG>');
      expect(xml).toContain('<name>Tier-1 Energy Trading GmbH &amp; Co. &lt;KG&gt;</name>');
    });

    it('sets payer/receiver from the desk role: on an offtake the desk pays', () => {
      const buy = generateFpMLDealPayload(mockAssessment, { deskRole: 'BUYER' });
      expect(buy).toContain('<deskRole>BUYER</deskRole>');
      expect(buy).toMatch(/<physicalLeg>\s*<payerPartyReference href="DESK"\/>/);
      const sell = generateFpMLDealPayload(mockAssessment, { deskRole: 'SELLER' });
      expect(sell).toMatch(/<physicalLeg>\s*<payerPartyReference href="COUNTERPARTY"\/>/);
    });
  });

  describe('Internal JSON deal ticket', () => {
    it('generates an internal ticket without unverified system-compatibility claims', () => {
      const ticket = generateEtrmJsonPayload(mockAssessment);

      expect(ticket.dealHeader.dealId).toBe(mockAssessment.id);
      expect(ticket.dealHeader.format).toBe('GENERIC_JSON_V2');
      expect(ticket.dealHeader.status).toBe('INDICATIVE');

      expect(ticket.counterparty.name).toBe('Shell Energy Europe B.V.');
      expect(ticket.counterparty.lei).toBeNull();
      expect(ticket.legA_physicalMolecule.commodity).toBe('BIOMETHANE_EN16723');
      expect(ticket.legA_physicalMolecule.volumeMWh).toBe(50000);
      expect(ticket.legB_environmentalAttribute.targetMarketId).toBe('DE_THG');
      expect(ticket.legB_environmentalAttribute.contractCiGco2ePerMj).toBe(-100);
      expect(ticket.internalValuation.deskNetbackEurMwh).toBe(163.5);

      expect(ticket.documentFingerprint.algorithm).toBe('SHA-256');
      expect(ticket.documentFingerprint.hash).toHaveLength(64);
    });

    it('never fills a missing volume with a placeholder number', () => {
      const noVol: TradeAssessment = { ...mockAssessment, consignment: { ...mockAssessment.consignment, volumeMWh: null } };
      expect(generateEtrmJsonPayload(noVol).legA_physicalMolecule.volumeMWh).toBeNull();
    });
  });

  describe('Voluntary Unbundled Book & Claim Legal Package', () => {
    it('generates EFET Annex and Term Sheet PDF specifically tailored for unbundled voluntary GoO deals', () => {
      const voluntaryAssessment: TradeAssessment = {
        ...mockAssessment,
        id: 'DOS-2026-VOL-01',
        targetMarketId: 'VOL_SCOPE1',
        targetMarketName: 'Corporate Voluntary Scope 1 Green Gas',
      };

      const efetPdf = generateEfetBiomethaneAnnexPdf(voluntaryAssessment);
      expect(efetPdf.getNumberOfPages()).toBeGreaterThan(0);

      const termSheetPdf = generateCommercialTermSheetPdf(voluntaryAssessment);
      expect(termSheetPdf.getNumberOfPages()).toBeGreaterThan(0);
    });
  });

  describe('Institutional Statutory Compliance Memorandum PDF', () => {
    it('generates a 2-page desk pre-screen memorandum', () => {
      const pdf = generateStatutoryAuditMemoPdf(mockAssessment);
      expect(pdf.getNumberOfPages()).toBe(2);
    });

    it('renders a pre-screen for a Great Britain origin', () => {
      const gbAssessment: TradeAssessment = {
        ...mockAssessment,
        consignment: {
          ...mockAssessment.consignment,
          originCountry: 'GB',
        },
        targetMarketId: 'DE_THG',
      };
      const pdf = generateStatutoryAuditMemoPdf(gbAssessment);
      expect(pdf.getNumberOfPages()).toBe(2);
    });

    it('includes AI commentary from ComplianceAuditModal without letting it change the engine verdict', () => {
      const auditOverride = {
        verdict: 'CONDITIONAL_PASS',
        checks: [
          { gateName: 'Gate 1', status: 'PASS', details: 'ISCC EU certified', citation: 'Reg 2022/996' },
          { gateName: 'Gate 2', status: 'PASS', details: 'Grid connected', citation: 'RED III Art 31a' },
          { gateName: 'Gate 3', status: 'PASS', details: 'Mass balance', citation: 'RED III Art 30' },
          { gateName: 'Gate 4', status: 'PASS', details: 'Annex IX-A', citation: 'Annex IX' },
          { gateName: 'Gate 5', status: 'PASS', details: 'GHG savings >= 65%', citation: 'Art 29(10)' },
          { gateName: 'Gate 6', status: 'FLAG', details: 'Price clamped to 100 EUR/MWh', citation: 'French Décret' },
        ],
      };
      const pdf = generateStatutoryAuditMemoPdf(mockAssessment, {}, auditOverride);
      expect(pdf.getNumberOfPages()).toBe(2);
      const out = pdf.output();
      expect(out).toContain('AI-ASSISTED COMMENTARY');
      expect(out).toContain('PRE-SCREEN RESULT: ELIGIBLE'); // engine verdict, not the AI's CONDITIONAL_PASS
    });
  });

  describe('Counterparty-facing document content (audit remediation)', () => {
    const noFacts: TradeAssessment = {
      ...mockAssessment,
      consignment: { ...mockAssessment.consignment, volumeMWh: null, deliveryPeriod: null, counterparty: null },
    };

    it('term sheet is indicative, non-binding and subject to contract', () => {
      const out = generateCommercialTermSheetPdf(mockAssessment).output();
      expect(out).toContain('INDICATIVE TERM SHEET');
      expect(out).toContain('NON-BINDING');
      expect(out).toContain('SUBJECT TO CONTRACT');
      expect(out).not.toContain('BINDING OTC');
    });

    it('never invents contract facts: missing entity, volume, dates and master agreement date are placeholders', () => {
      const ts = generateCommercialTermSheetPdf(noFacts).output();
      const conf = generateEfetBiomethaneAnnexPdf(noFacts).output();
      for (const out of [ts, conf]) {
        expect(out).toContain('[TO BE AGREED]');
        expect(out).toContain('[DESK LEGAL ENTITY]');
        expect(out).toContain('[COUNTERPARTY LEGAL ENTITY]');
        expect(out).not.toContain('10,000 MWh');
        expect(out).not.toContain('BIOMETHANE TRADING DESK EUROPE');
        expect(out).not.toContain('15 January 2024');
        expect(out).not.toContain('2026-01-01');
      }
    });

    it('does not impersonate EFET or claim an ISDA confirmation', () => {
      const out = generateEfetBiomethaneAnnexPdf(mockAssessment).output();
      expect(out).toContain('DRAFT INDIVIDUAL TRANSACTION CONFIRMATION');
      expect(out).not.toContain('EUROPEAN FEDERATION OF ENERGY TRADERS');
      expect(out).not.toContain('ISDA');
    });

    it('never discloses the desk netback or margin on counterparty documents', () => {
      for (const out of [generateCommercialTermSheetPdf(mockAssessment).output(), generateEfetBiomethaneAnnexPdf(mockAssessment).output()]) {
        expect(out).not.toContain('Netback');
        expect(out).not.toContain('163.50');
      }
    });

    it('on an offtake from a plant the desk is the buyer and the producer price is quoted', () => {
      const offtake: TradeAssessment = {
        ...mockAssessment,
        consignment: { ...mockAssessment.consignment, originPlantId: 'plant_dk_1', counterparty: 'Nature Energy Holsted A/S' },
        costs: { ...mockAssessment.costs, producerPricing: { mode: 'FIXED_PRICE', fixedPriceEurPerMwh: 92.5, indexLinkedShare: null, source: null, lastVerified: null, confidence: 'VERIFIED' } },
      };
      expect(inferDeskRole(offtake)).toBe('BUYER');
      const parties = resolveParties(offtake, { tradingDeskEntity: 'Desk Trading Ltd' });
      expect(parties.seller).toBe('Nature Energy Holsted A/S');
      expect(parties.buyer).toBe('Desk Trading Ltd');
      expect(describePricing(offtake, 'BUYER')[0]).toContain('92.50');
      const out = generateCommercialTermSheetPdf(offtake, { tradingDeskEntity: 'Desk Trading Ltd' }).output();
      expect(out).toContain('92.50');
    });

    it('labels feedstock classification from the data, not a blanket "Annex IX-A"', () => {
      const crop: TradeAssessment = {
        ...mockAssessment,
        consignment: { ...mockAssessment.consignment, feedstock: 'energy_crops', feedstockName: 'Maize silage', annexClassification: 'CROP' },
      };
      const out = generateCommercialTermSheetPdf(crop).output();
      expect(out).toContain('Food/feed crop');
      expect(out).not.toContain('Annex IX Part A');
    });

    it('stamps a regulatory block on documents for a structure that cannot clear', () => {
      const blocked: TradeAssessment = {
        ...mockAssessment,
        eligibility: { ...mockAssessment.eligibility, overallVerdict: 'HARD_BLOCK', summary: 'BLOCKED at Market-Specific Requirements: UK RTFO requires GB injection.' },
      };
      expect(generateCommercialTermSheetPdf(blocked).output()).toContain('NOT TRADEABLE AS STRUCTURED');
      expect(generateEtrmJsonPayload(blocked).dealHeader.status).toBe('NOT_TRADEABLE_REGULATORY_BLOCK');
    });

    it('pre-screen memo quotes no fabricated "verbatim" statute and does not claim compliance approval', () => {
      const out = generateStatutoryAuditMemoPdf(mockAssessment).output();
      expect(out).toContain('DESK REGULATORY PRE-SCREEN');
      expect(out).toContain('not legal advice');
      expect(out).not.toContain('VERBATIM');
      expect(out).not.toContain('APPROVED FOR OTC TRADING');
      expect(out).not.toContain('Chief Compliance Officer');
    });

    it('UDB worksheet never fabricates a PoS number, operator ID or EIC code', () => {
      const xml = generateUdbNominationXmlPayload(mockAssessment);
      expect(xml).toContain('[ISSUED BY CERTIFICATION SCHEME]');
      expect(xml).toContain('Not a UDB message format');
      expect(xml).not.toMatch(/POS-DOS/);
      expect(xml).not.toContain('udb.ec.europa.eu');
    });

    it('CSV quotes fields safely and leaves unknown values blank', () => {
      const tricky: TradeAssessment = {
        ...mockAssessment,
        consignment: { ...mockAssessment.consignment, counterparty: 'Acme "Gas", Ltd', volumeMWh: null },
      };
      const [header, row] = generateEtrmCsvPayload(tricky).trim().split('\r\n');
      expect(header.split(',')).toContain('VolumeMWh');
      expect(row).toContain('"Acme ""Gas"", Ltd"');
      expect(row).not.toContain('10000');
    });

    it('fingerprint is UTF-8 safe and changes with price terms', () => {
      const a = { ...mockAssessment, consignment: { ...mockAssessment.consignment, counterparty: 'Énergie SA' } };
      const b = { ...mockAssessment, consignment: { ...mockAssessment.consignment, counterparty: 'Ãnergie SA' } };
      expect(calculateTradeIntegritySeal(a)).not.toBe(calculateTradeIntegritySeal(b));
      const priced = { ...mockAssessment, costs: { ...mockAssessment.costs, producerPricing: { mode: 'FIXED_PRICE' as const, fixedPriceEurPerMwh: 90, indexLinkedShare: null, source: null, lastVerified: null, confidence: 'VERIFIED' as const } } };
      expect(calculateTradeIntegritySeal(priced)).not.toBe(calculateTradeIntegritySeal(mockAssessment));
    });
  });
});
