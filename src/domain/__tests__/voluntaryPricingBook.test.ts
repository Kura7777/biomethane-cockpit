import { describe, it, expect } from 'vitest';
import { MARKETS, isVoluntaryMarket, getMarketsByDeskCategory, getMarketById } from '../markets/registry';
import { simulateDesk } from '../marks/simulate';
import { INITIAL_BROKER_QUOTES } from '../markets/brokerMarketData';
import { generateEtrmCsvPayload } from '../trade/legalPackage';
import { TradeAssessment } from '../trade/types';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';

describe('Dual-Book Architecture (50% Compliance / 50% Voluntary GO Book)', () => {
  it('correctly categorizes compliance transport quotas and voluntary GO markets', () => {
    // Compliance Quotas
    expect(isVoluntaryMarket('DE_THG')).toBe(false);
    expect(isVoluntaryMarket('NL_ERE')).toBe(false);
    expect(isVoluntaryMarket('UK_RTFO')).toBe(false);
    expect(isVoluntaryMarket('IT_CIC')).toBe(false);
    expect(isVoluntaryMarket('FR_CPB')).toBe(false);

    // Voluntary GOs & Scope 1 Decarbonization
    expect(isVoluntaryMarket('AIB_GO')).toBe(true);
    expect(isVoluntaryMarket('UK_RGGO')).toBe(true);
    expect(isVoluntaryMarket('DE_GO')).toBe(true);
    expect(isVoluntaryMarket('NL_GO')).toBe(true);
    expect(isVoluntaryMarket('FR_GO')).toBe(true);
    expect(isVoluntaryMarket('DK_GO')).toBe(true);
    expect(isVoluntaryMarket('VOL_SCOPE1')).toBe(true);
    expect(isVoluntaryMarket('VOL_EU_ETS')).toBe(true);
  });

  it('provides a balanced dual-book registry representation', () => {
    const complianceMarkets = getMarketsByDeskCategory('COMPLIANCE');
    const voluntaryMarkets = getMarketsByDeskCategory('VOLUNTARY');

    expect(complianceMarkets.length).toBeGreaterThan(0);
    expect(voluntaryMarkets.length).toBeGreaterThan(0);

    // Verify key voluntary registries exist
    const voluntaryRegistries = voluntaryMarkets.map(m => m.registry);
    expect(voluntaryRegistries).toContain('AIB EECS Gas Scheme');
    expect(voluntaryRegistries).toContain('dena Biogasregister');
    expect(voluntaryRegistries).toContain('VertiCer');
    expect(voluntaryRegistries).toContain('GGCS / Renewable Energy Assurance Limited');
  });

  it('simulates realistic voluntary market price bands distinct from compliance quotas', () => {
    const { marks } = simulateDesk();
    const marksRecord = marks.marks;

    // Voluntary marks should be within €20 - €28/MWh benchmark range
    const aibMark = marksRecord['AIB_GO'];
    expect(aibMark).toBeDefined();
    expect(aibMark.mid).toBeGreaterThanOrEqual(20);
    expect(aibMark.mid).toBeLessThanOrEqual(28);

    const deGoMark = marksRecord['DE_GO'];
    expect(deGoMark).toBeDefined();
    expect(deGoMark.mid).toBeGreaterThanOrEqual(20);
    expect(deGoMark.mid).toBeLessThanOrEqual(28);

    const nlGoMark = marksRecord['NL_GO'];
    expect(nlGoMark).toBeDefined();
    expect(nlGoMark.mid).toBeGreaterThanOrEqual(20);
    expect(nlGoMark.mid).toBeLessThanOrEqual(28);

    // Compliance DE_THG should be high quota value (e.g. €240 - €350 / tCO2e)
    const thgMark = marksRecord['DE_THG'];
    expect(thgMark).toBeDefined();
    expect(thgMark.mid).toBeGreaterThanOrEqual(240);
  });

  it('contains authentic broker sheet quotes split between bundled compliance and voluntary GOs', () => {
    const voluntaryQuotes = INITIAL_BROKER_QUOTES.filter(q => q.productClass === 'GO_VOLUNTARY');
    const complianceQuotes = INITIAL_BROKER_QUOTES.filter(q => q.productClass === 'BUNDLED_COMPLIANCE');

    expect(voluntaryQuotes.length).toBeGreaterThanOrEqual(15);
    expect(complianceQuotes.length).toBeGreaterThanOrEqual(5);

    // Check UK RGGO voluntary quotes
    const ukRggo = voluntaryQuotes.filter(q => q.country === 'UK');
    expect(ukRggo.length).toBeGreaterThan(5);

    // Check German bundled THG compliance quotes
    const deBundled = complianceQuotes.filter(q => q.country === 'DE');
    expect(deBundled.length).toBeGreaterThanOrEqual(2);
    expect(deBundled[0].feedstock).toContain('Manure + Physical Gas');
  });

  it('tags ETRM deal tickets with correct TradingBook and RegistrySystem based on market type', () => {
    // 1. Voluntary Deal
    const volAssessment: any = {
      id: 'DEAL-VOL-001',
      createdAt: '2026-09-06T12:00:00.000Z',
      consignment: REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      targetMarketId: 'AIB_GO',
      targetMarket: getMarketById('AIB_GO')!,
      pricingSide: 'mid',
      marks: {
        gasIndex: { mid: 32.50 },
        fx: { gbpEur: 1.175, chfEur: 1.05 },
        marks: {},
      },
      netback: {
        certificateValue: { valueEurPerMWh: 24.50 },
        deskMargin: 3.50,
      },
      gateResults: [],
      eligibilityVerdict: 'ELIGIBLE',
    };

    const volCsv = generateEtrmCsvPayload(volAssessment);
    expect(volCsv).toContain('BIOMETHANE_VOLUNTARY_GO');
    expect(volCsv).toContain('NATIONAL_GO_AIB_EECS');

    // 2. Compliance Deal
    const compAssessment: any = {
      id: 'DEAL-COMP-001',
      createdAt: '2026-09-06T12:00:00.000Z',
      consignment: REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      targetMarketId: 'DE_THG',
      targetMarket: getMarketById('DE_THG')!,
      pricingSide: 'mid',
      marks: {
        gasIndex: { mid: 32.50 },
        fx: { gbpEur: 1.175, chfEur: 1.05 },
        marks: {},
      },
      netback: {
        certificateValue: { valueEurPerMWh: 85.00 },
        deskMargin: 8.50,
      },
      gateResults: [],
      eligibilityVerdict: 'ELIGIBLE',
    };

    const compCsv = generateEtrmCsvPayload(compAssessment);
    expect(compCsv).toContain('BIOMETHANE_COMPLIANCE_QUOTA');
    expect(compCsv).toContain('UNION_DATABASE_UDB');
  });
});
