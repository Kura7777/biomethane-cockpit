import { describe, it, expect } from 'vitest';
import { evaluateUDBGate } from '../../../domain/eligibility/gates/udb';
import { getMarketById } from '../../../domain/markets/registry';
import { Consignment } from '../../../domain/consignment/types';

describe('Trade Builder — UDB Gate and Consignment Input Assumptions', () => {
  const deMarket = getMarketById('DE_THG')!;

  it('market requiresUDB is true for DE_THG', () => {
    expect(deMarket.requiresUDB).toBe(true);
  });

  it('DK-origin consignment with default inputs (udbStatus: PENDING) gives CONDITIONAL on UDB gate', () => {
    const defaultConsignment: Consignment = {
      id: 'CONSIGN-DK-manure',
      name: 'Denmark · Audited Asset',
      originCountry: 'DK',
      originCountryName: 'Denmark',
      feedstock: 'manure',
      feedstockName: 'Manure',
      annexClassification: 'IX_A',
      carbonIntensity: -100,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      injectionCountry: 'DK',
      injectionIsEU: true,
      udbStatus: 'PENDING', // Default trader input: assumed until confirmed
      posStatus: 'PENDING', // Default trader input: assumed until confirmed
      volumeMWh: 10000,
      deliveryPeriod: {
        type: 'CALENDAR',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        complianceYear: 2026,
      },
      counterparty: 'European Offtake Buyer',
    };

    const result = evaluateUDBGate(defaultConsignment, deMarket);
    expect(result.verdict).toBe('CONDITIONAL');
    expect(result.confidence).toBe('MEDIUM');
    expect(result.reason).toContain('Consignment UDB recording is pending');
  });

  it('DK-origin consignment with confirmed UDB gives PASS on UDB gate', () => {
    const confirmedUdb: UDBStatus = 'RECORDED';
    const confirmedPos: PoSStatus = 'ISSUED';
    const confirmedConsignment: Consignment = {
      id: 'CONSIGN-DK-manure',
      name: 'Denmark · Audited Asset',
      originCountry: 'DK',
      originCountryName: 'Denmark',
      feedstock: 'manure',
      feedstockName: 'Manure',
      annexClassification: 'IX_A',
      carbonIntensity: -100,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      injectionCountry: 'DK',
      injectionIsEU: true,
      udbStatus: confirmedUdb, // Trader selected "Recorded (confirmed)"
      posStatus: confirmedPos,
      volumeMWh: 10000,
      deliveryPeriod: {
        type: 'CALENDAR',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        complianceYear: 2026,
      },
      counterparty: 'European Offtake Buyer',
    };

    const result = evaluateUDBGate(confirmedConsignment, deMarket);
    expect(result.verdict).toBe('PASS');
    expect(result.confidence).toBe('HIGH');
    expect(result.reason).toContain('Consignment is recorded in the Union Database');
  });

  it('GB-origin consignment remains hard-blocked due to non-EU grid injection regardless of UDB status', () => {
    const gbConsignment: Consignment = {
      id: 'CONSIGN-GB-manure',
      name: 'United Kingdom · Asset',
      originCountry: 'GB',
      originCountryName: 'United Kingdom',
      feedstock: 'manure',
      feedstockName: 'Manure',
      annexClassification: 'IX_A',
      carbonIntensity: -100,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      injectionCountry: 'GB',
      injectionIsEU: false,
      udbStatus: 'NOT_RECORDED',
      posStatus: 'PENDING',
      volumeMWh: 10000,
      deliveryPeriod: {
        type: 'CALENDAR',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        complianceYear: 2026,
      },
      counterparty: 'European Offtake Buyer',
    };

    const result = evaluateUDBGate(gbConsignment, deMarket);
    expect(result.verdict).toBe('HARD_BLOCK');
    expect(result.confidence).toBe('HIGH');
    expect(result.reason).toContain('Consignment is injected into a non-EU gas grid');
  });
});
