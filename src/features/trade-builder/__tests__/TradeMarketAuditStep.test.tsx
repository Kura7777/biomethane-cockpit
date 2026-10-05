import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TradeMarketAuditStep } from '../steps/TradeMarketAuditStep';
import { getMarketById } from '../../../domain/markets/registry';
import { EligibilityAssessment } from '../../../domain/eligibility/types';

describe('TradeMarketAuditStep — See corridor on map link', () => {
  const frGoMarket = getMarketById('FR_GO')!;
  const ukRtfoMarket = getMarketById('UK_RTFO')!;

  it('renders "See corridor on map" for REGISTRY_TRANSFER gate on HARD_BLOCK with filter=GO', () => {
    const assessment: EligibilityAssessment = {
      marketId: 'FR_GO',
      marketName: 'France Guarantees of Origin (EEX)',
      overallVerdict: 'HARD_BLOCK',
      blockingGate: 'REGISTRY_TRANSFER',
      summary: 'Blocked on registry transfer',
      gates: [
        {
          gate: 'REGISTRY_TRANSFER',
          gateLabel: 'Cross-Border Registry Transfer',
          verdict: 'HARD_BLOCK',
          reason: 'No bilateral link between Energinet and EEX',
          remedy: null,
          citations: [{
            shortName: 'ERGaR Scheme Rules',
            fullReference: 'ERGaR CoO Scheme v2.0',
            establishes: 'Registry interconnection',
            sourceUrl: 'https://ergar.org',
            verifiedDate: '2026-01-01',
          }],
          confidence: 'HIGH',
        },
      ],
    };

    const html = renderToStaticMarkup(
      <TradeMarketAuditStep
        marketId="FR_GO"
        setMarketId={() => {}}
        selectedMarket={frGoMarket}
        assessment={assessment}
        ghgSavingPct={85}
        origin="DK"
      />
    );

    expect(html).toContain('See corridor on map');
    expect(html).toContain('href="#/map?origin=DK&amp;target=FR&amp;filter=GO"');
  });

  it('renders "See corridor on map" for CROSS_BORDER_POS gate on CONDITIONAL with filter=POS', () => {
    const assessment: EligibilityAssessment = {
      marketId: 'UK_RTFO',
      marketName: 'UK Renewable Transport Fuel Obligation',
      overallVerdict: 'CONDITIONAL',
      blockingGate: null,
      summary: 'Requires nominated capacity bookings',
      gates: [
        {
          gate: 'CROSS_BORDER_POS',
          gateLabel: 'Cross-Border PoS Recognition',
          verdict: 'CONDITIONAL',
          reason: 'Nominated capacity bookings across interconnectors required',
          remedy: 'Book capacity',
          citations: [{
            shortName: 'RTFO Guidance 2026',
            fullReference: 'Department for Transport RTFO Guidance',
            establishes: 'Mass balance border requirements',
            sourceUrl: 'https://gov.uk',
            verifiedDate: '2026-01-01',
          }],
          confidence: 'HIGH',
        },
      ],
    };

    const html = renderToStaticMarkup(
      <TradeMarketAuditStep
        marketId="UK_RTFO"
        setMarketId={() => {}}
        selectedMarket={ukRtfoMarket}
        assessment={assessment}
        ghgSavingPct={85}
        origin="DK"
      />
    );

    expect(html).toContain('See corridor on map');
    expect(html).toContain('href="#/map?origin=DK&amp;target=GB&amp;filter=POS"');
  });

  it('does not render "See corridor on map" when gate passes', () => {
    const assessment: EligibilityAssessment = {
      marketId: 'FR_GO',
      marketName: 'France Guarantees of Origin (EEX)',
      overallVerdict: 'ELIGIBLE',
      blockingGate: null,
      summary: 'All gates clear',
      gates: [
        {
          gate: 'REGISTRY_TRANSFER',
          gateLabel: 'Cross-Border Registry Transfer',
          verdict: 'PASS',
          reason: 'Bilateral link active',
          remedy: null,
          citations: [],
          confidence: 'HIGH',
        },
      ],
    };

    const html = renderToStaticMarkup(
      <TradeMarketAuditStep
        marketId="FR_GO"
        setMarketId={() => {}}
        selectedMarket={frGoMarket}
        assessment={assessment}
        ghgSavingPct={85}
        origin="DK"
      />
    );

    expect(html).not.toContain('See corridor on map');
  });
});
