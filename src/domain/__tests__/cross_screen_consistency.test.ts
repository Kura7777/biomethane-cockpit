import { describe, it, expect } from 'vitest';
import { simulateDesk } from '../marks/simulate';
import { getMarketById } from '../markets/registry';
import { Consignment } from '../consignment/types';
import { computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { searchSourcingRoutes } from '../arbitrage/sourcingAdapter';
import { generateTradeSummary } from '../trade/summary';
import { buildDealUrl, parseDealParams } from '../trade/dealParams';
import { TradeAssessment } from '../trade/types';

import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';

describe('PHASE 3 — CROSS-SCREEN CONSISTENCY & PARAMETER HANDOFF AUDIT', () => {
  const { marks, costs } = simulateDesk();
  const testMarket = getMarketById('NL_ERE')!; // Dutch HBE market (single branch)

  const testConsignment: Consignment = {
    ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
    volumeMWh: 50000,
    counterparty: 'Nordic Bio Offtake Desk',
    deliveryPeriod: {
      type: 'CALENDAR',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      complianceYear: 2026,
    }
  };

  it('1. Traces identical numbers across Sourcing Desk -> Trade Builder -> Dossier -> Library', () => {
    // 1. Sourcing Desk
    const sourcingRes = searchSourcingRoutes(
      {
        targetMarketId: 'NL_ERE',
        feedstockKey: 'manure',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        volumeMwh: 50000,
        delivery: {
          type: 'CALENDAR',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          complianceYear: 2026,
        },
        counterparty: null,
        notes: '',
        constraints: {
          physicalDeliveryRequired: false,
          maxCarbonIntensity: -85.0,
          maxDeliveredCostEurMwh: null,
        },
      },
      marks,
      costs
    );

    const allRoutes = [...sourcingRes.tradeable, ...sourcingRes.blocked];
    const nlRoute = allRoutes.find(r => r.targetMarketId === 'NL_ERE' && r.originCountry === 'DK');
    expect(nlRoute).toBeDefined();

    // 2. Trade Builder Netback calculation
    const pricingSides = marks.pricingSides;
    const netback = computeNetback(testMarket, testConsignment, marks, costs, pricingSides);
    const eligibility = evaluateEligibility(testConsignment, testMarket);

    // Assert Sourcing Desk == Trade Builder
    expect(nlRoute?.overallVerdict).toBe(eligibility.overallVerdict);

    // 3. Dossier Text Generation
    const assessment: TradeAssessment = {
      id: 'test_assessment_1',
      createdAt: '2026-08-18T20:00:00Z',
      consignment: testConsignment,
      targetMarketId: testMarket.id,
      targetMarketName: testMarket.name,
      netback,
      eligibility,
      marks,
      costs,
      userNotes: '',
    };

    const dossierText = generateTradeSummary(assessment);

    // Assert Dossier contains the exact same figures
    expect(dossierText).toContain(`€${(netback.netNetback as number).toFixed(2)}/MWh`);
    expect(dossierText).toContain(`€${(netback.certificateValue?.valueEurPerMWh as number).toFixed(2)}/MWh`);
    if (netback.deskMargin !== null) {
      expect(dossierText).toContain(`€${netback.deskMargin.toFixed(2)}/MWh`);
    }
  });

  it('2. Deal Parameter Handoff: all parameters survive round-trip without silent drops', () => {
    const rawParams = {
      marketId: 'NL_ERE',
      originCountry: 'DK',
      feedstock: 'manure',
      ci: -85.0,
      volume: 50000,
      scheme: 'ISCC_EU' as const,
      coc: 'MASS_BALANCE' as const,
      counterparty: 'Nordic Bio Offtake Desk',
      deliveryPeriod: 'Cal-2026',
    };

    // Serialize URL
    const url = buildDealUrl(rawParams);
    expect(url).toContain('/trade?');

    // Parse search params back
    const searchParams = new URLSearchParams(url.split('?')[1]);
    const parsed = parseDealParams(searchParams);

    expect(parsed.marketId).toBe('NL_ERE');
    expect(parsed.originCountry).toBe('DK');
    expect(parsed.feedstock).toBe('manure');
    expect(parsed.ci).toBe(-85.0);
    expect(parsed.volume).toBe(50000);
    expect(parsed.scheme).toBe('ISCC_EU');
    expect(parsed.coc).toBe('MASS_BALANCE');
    expect(parsed.counterparty).toBe('Nordic Bio Offtake Desk');
    expect(parsed.deliveryPeriod).toBe('Cal-2026');
  });

  it('3. German Dual-Branch Valuation Range: consistency between Trade Builder and Dossier', () => {
    const deMarket = getMarketById('DE_THG')!;
    const post2026Consignment: Consignment = {
      ...testConsignment,
      deliveryPeriod: {
        type: 'CALENDAR',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        complianceYear: 2027, // Triggers dual-branch range
      }
    };

    const deNetback = computeNetback(deMarket, post2026Consignment, marks, costs, marks.pricingSides);
    expect(deNetback.uncertaintyBranches).not.toBeNull();
    expect(deNetback.uncertaintyBranches?.length).toBe(2);

    const lowBranch = deNetback.uncertaintyBranches![0]; // DC_OFF
    const highBranch = deNetback.uncertaintyBranches![1]; // DC_ON

    const deAssessment: TradeAssessment = {
      id: 'de_test_assessment',
      createdAt: '2026-08-18T20:00:00Z',
      consignment: post2026Consignment,
      targetMarketId: deMarket.id,
      targetMarketName: deMarket.name,
      netback: deNetback,
      eligibility: evaluateEligibility(post2026Consignment, deMarket),
      marks,
      costs,
      userNotes: '',
    };

    const deDossier = generateTradeSummary(deAssessment);

    // Verify both branch figures appear in the dossier
    expect(deDossier).toContain(`€${(lowBranch.netNetback as number).toFixed(2)}/MWh`);
    expect(deDossier).toContain(`€${(highBranch.netNetback as number).toFixed(2)}/MWh`);
  });
});
