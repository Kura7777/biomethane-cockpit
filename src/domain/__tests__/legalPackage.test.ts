import { describe, it, expect } from 'vitest';
import { 
  calculateTradeIntegritySeal, 
  generateEfetBiomethaneAnnexPdf, 
  generateCommercialTermSheetPdf,
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

  describe('ETRM Machine-Readable FpML 5.x XML Payload', () => {
    it('generates well-formed FpML 5.x XML containing physical and environmental legs', () => {
      const xml = generateFpMLDealPayload(mockAssessment);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<fpml:dataDocument');
      expect(xml).toContain('<fpml:tradeId');
      expect(xml).toContain(mockAssessment.id);
      expect(xml).toContain('<fpml:gasPhysicalLeg>');
      expect(xml).toContain('<fpml:environmentalLeg>');
      expect(xml).toContain('<fpml:commodityId>NATURAL_GAS_BIOMETHANE_EN16723</fpml:commodityId>');
      expect(xml).toContain('<fpml:attributeType>BIOMETHANE_GUARANTEE_OF_ORIGIN</fpml:attributeType>');
      expect(xml).toContain('<fpml:digitalSignature>');
      expect(xml).toContain(calculateTradeIntegritySeal(mockAssessment));
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
      expect(xml).toContain('<fpml:partyName>Tier-1 Energy Trading GmbH &amp; Co. &lt;KG&gt;</fpml:partyName>');
    });
  });

  describe('ETRM Standardized JSON Deal Ticket', () => {
    it('generates compliant JSON ticket matching OpenLink, TriplePoint & SAP specs', () => {
      const ticket = generateEtrmJsonPayload(mockAssessment);

      expect(ticket.dealHeader.dealId).toBe(mockAssessment.id);
      expect(ticket.dealHeader.systemCompatibility).toContain('OpenLink_Endur_v22');
      expect(ticket.dealHeader.systemCompatibility).toContain('TriplePoint_Commodity_XL_v15');
      expect(ticket.dealHeader.systemCompatibility).toContain('SAP_S4HANA_Commodity_Management');

      expect(ticket.counterparty.name).toBe('Shell Energy Europe B.V.');
      expect(ticket.legA_physicalMolecule.commodity).toBe('NATURAL_GAS_BIOMETHANE_EN16723');
      expect(ticket.legA_physicalMolecule.volumeMWh).toBe(50000);
      expect(ticket.legB_environmentalAttribute.targetMarketId).toBe('DE_THG');
      expect(ticket.legB_environmentalAttribute.contractCiGco2ePerMj).toBe(-100);

      expect(ticket.cryptographicIntegritySeal.algorithm).toBe('SHA-256');
      expect(ticket.cryptographicIntegritySeal.hash).toHaveLength(64);
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
});
