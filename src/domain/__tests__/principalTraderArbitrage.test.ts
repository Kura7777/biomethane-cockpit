import { describe, it, expect } from 'vitest';
import { parseBrokerRunText } from '../markets/brokerRunParser';
import { estimateFarmgateProcurementCost, REGIONAL_FARMGATE_BENCHMARKS } from '../sourcing/benchmarks';
import { 
  generateCommercialTermSheetPdf, 
  generateEtrmCsvPayload, 
  generateUdbNominationXmlPayload, 
  generateEfetBiomethaneAnnexPdf,
  calculateTradeIntegritySeal 
} from '../trade/legalPackage';
import { TradeAssessment } from '../trade/types';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { MARKETS } from '../markets/registry';
import { MarksState } from '../netback/types';
import { computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';

const sampleMarks: MarksState = {
  marks: {
    DE_THG: { marketId: 'DE_THG', bid: 290, offer: 310, mid: 300, updatedAt: new Date().toISOString(), source: 'Argus' },
    FR_CPB: { marketId: 'FR_CPB', bid: 150, offer: 160, mid: 155, updatedAt: new Date().toISOString(), source: 'EEX' },
    NL_ERE: { marketId: 'NL_ERE', bid: 0.28, offer: 0.32, mid: 0.30, updatedAt: new Date().toISOString(), source: 'NEa' },
    VOL_SCOPE1: { marketId: 'VOL_SCOPE1', bid: 35, offer: 45, mid: 40, updatedAt: new Date().toISOString(), source: 'Broker' },
  },
  gasIndex: { bid: 28.00, offer: 29.00, mid: 28.50, updatedAt: new Date().toISOString() },
  fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: new Date().toISOString() },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
};

describe('PRINCIPAL TRADER SUITE — Domain & Arbitrage Tests', () => {
  describe('1. OTC Broker Run Parser (STX, ACT, Marex)', () => {
    it('parses multi-line WhatsApp and email broker runs with productClass disambiguation', () => {
      const sampleRun = `
STX Biomethane Market Update:
DK Manure 2026 ISCC <-100 CI: €144 Bid / €149 Offer (20 GWh)
DE Manure+Gas H2-26 -100 CI: €147 Bid / €152 Offer (10 GWh)
NL Waste 2026 Certified <0 CI: €48 Bid / €50 Offer (25 GWh)
UK Waste 2026 ISCC <18 CI: £24.50 Bid / £25.00 Offer (15 GWh)
FR GO Mix 2026 Non-subsidised: €20.50 Offer (10 GWh)
`;
      const result = parseBrokerRunText(sampleRun);
      expect(result.inferredSource).toBe('STX');
      expect(result.parsedQuoteCount).toBe(5);

      // Verify German THG bundled quote classification
      const deQuote = result.quotes.find(q => q.country === 'DE');
      expect(deQuote).toBeDefined();
      expect(deQuote?.productClass).toBe('BUNDLED_COMPLIANCE');
      expect(deQuote?.numericBidEurMwh).toBe(147.0);
      expect(deQuote?.numericOfferEurMwh).toBe(152.0);

      // Verify French voluntary GO classification
      const frQuote = result.quotes.find(q => q.country === 'FR');
      expect(frQuote).toBeDefined();
      expect(frQuote?.productClass).toBe('GO_VOLUNTARY');
      expect(frQuote?.numericOfferEurMwh).toBe(20.50);

      // Verify UK quote currency
      const ukQuote = result.quotes.find(q => q.country === 'UK');
      expect(ukQuote).toBeDefined();
      expect(ukQuote?.currency).toBe('GBP');
      expect(ukQuote?.numericBidEurMwh).toBe(24.50);
    });

    it('returns empty array cleanly on blank or whitespace text', () => {
      const result = parseBrokerRunText('   \n  \n');
      expect(result.quotes).toEqual([]);
      expect(result.parsedQuoteCount).toBe(0);
    });
  });

  describe('2. Regional Farmgate Procurement Benchmarks', () => {
    it('accurately derives Danish manure procurement benchmark linked to TTF plus premium', () => {
      const ttf = 34.0;
      const dk = estimateFarmgateProcurementCost('DK', 'manure', -100, ttf);
      expect(dk.mode).toBe('TTF_PLUS_PREMIUM');
      // Premium includes super-green quality bonus
      expect(dk.estimatedCostEurMwh).toBeGreaterThan(ttf);
      expect(dk.isRestrictedSubsidy).toBe(false);
    });

    it('flags French Obligation d’Achat subsidy warning where GOs are owned by state auction', () => {
      const fr = estimateFarmgateProcurementCost('FR', 'agricultural_residues', 16, 32.50);
      expect(fr.mode).toBe('FIXED_FARMGATE');
      expect(fr.isRestrictedSubsidy).toBe(true);
      expect(REGIONAL_FARMGATE_BENCHMARKS.FR.subsidyWarning).toContain('Obligation d’Achat');
    });

    it('calculates German fixed farmgate benchmark for post-EEG assets', () => {
      const de = estimateFarmgateProcurementCost('DE', 'manure', -85, 32.50);
      expect(de.estimatedCostEurMwh).toBe(88.00);
      expect(de.mode).toBe('FIXED_FARMGATE');
    });
  });

  describe('3. Principal Trader Risk Suite (Basis Risk, Replacement Cost, 2026 Cliff)', () => {
    it('computes basis spread, replacement exposure, and German cliff impact', () => {
      const market = MARKETS.find(m => m.id === 'DE_THG')!;
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const costs = {
        transferCosts: 0.90,
        certificationCosts: 0.55,
        logistics: 1.80,
        otherCosts: 0,
        producerPricing: {
          mode: 'FIXED_PRICE' as const,
          fixedPriceEurPerMwh: 75.0,
          indexLinkedShare: null,
          source: 'OTC quote',
          lastVerified: null,
          confidence: 'VERIFIED' as const,
        },
      };

      const nb = computeNetback(market, consignment, sampleMarks, costs, 'mid');
      expect(nb.principalRisk).toBeDefined();

      const risk = nb.principalRisk!;
      // Basis differential between DK and DE
      expect(typeof risk.basisDifferentialEurMwh).toBe('number');
      expect(risk.basisRiskNotionalEur).toBeGreaterThanOrEqual(0);

      // Statutory ceiling for DE_THG (€450/tCO2e)
      expect(risk.statutoryCeilingEurMwh).toBeGreaterThan(250);
      expect(risk.replacementCostExposureEur).toBeGreaterThan(0);

      // German 2026 double-counting cliff impact on -100 CI manure
      expect(risk.germanCliffImpactEurMwh).toBeGreaterThan(0);
      expect(risk.germanCliffNotionalEur).toBeGreaterThan(0);
    });
  });

  describe('4. Complete 4-Piece Deal Handoff Package Generation', () => {
    const market = MARKETS.find(m => m.id === 'DE_THG')!;
    const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
    const el = evaluateEligibility(consignment, market);
    const nb = computeNetback(market, consignment, sampleMarks, {
      transferCosts: 0.90,
      certificationCosts: 0.55,
      logistics: 1.80,
      otherCosts: 0,
      producerPricing: {
        mode: 'FIXED_PRICE',
        fixedPriceEurPerMwh: 75.0,
        indexLinkedShare: null,
        source: 'OTC',
        lastVerified: null,
        confidence: 'VERIFIED',
      },
    }, 'mid');

    const mockAssessment: TradeAssessment = {
      id: 'TEST-DEAL-2026-DK-DE_THG',
      createdAt: '2026-09-06T12:00:00Z',
      consignment,
      targetMarketId: market.id,
      targetMarketName: market.name,
      eligibility: el,
      netback: nb,
      marks: sampleMarks,
      costs: {
        transferCosts: 0.90,
        certificationCosts: 0.55,
        logistics: 1.80,
        otherCosts: 0,
      },
      userNotes: 'Test trade assessment',
    };

    it('generates a valid Commercial Counterparty Term Sheet PDF', () => {
      const pdf = generateCommercialTermSheetPdf(mockAssessment);
      expect(pdf).toBeDefined();
      const outputBlob = pdf.output('blob');
      expect(outputBlob.size).toBeGreaterThan(1000);
    });

    it('generates a valid EFET Biomethane Annex PDF', () => {
      const pdf = generateEfetBiomethaneAnnexPdf(mockAssessment);
      expect(pdf).toBeDefined();
      const outputBlob = pdf.output('blob');
      expect(outputBlob.size).toBeGreaterThan(1000);
    });

    it('generates an ETRM CSV deal ticket with matching headers and values', () => {
      const csv = generateEtrmCsvPayload(mockAssessment);
      expect(csv).toContain('DealID,TradeDate,TradingBook,TraderID,Counterparty');
      expect(csv).toContain('TEST-DEAL-2026-DK-DE_THG');
      expect(csv).toContain('BIOMETHANE_COMPLIANCE_QUOTA');
    });

    it('generates an RFC-compliant Union Database (UDB) Mass Balance Nomination XML', () => {
      const xml = generateUdbNominationXmlPayload(mockAssessment);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<udb:consignmentTransfer');
      expect(xml).toContain('<udb:proofOfSustainability>');
      expect(xml).toContain('<udb:greenhouseGasIntensity metric="gCO2e/MJ">-100</udb:greenhouseGasIntensity>');
      expect(xml).toContain('<udb:auditSeal algorithm="SHA-256">');
    });

    it('generates deterministic SHA-256 seal across all package artifacts', () => {
      const seal = calculateTradeIntegritySeal(mockAssessment);
      expect(seal).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(seal)).toBe(true);
    });
  });
});
