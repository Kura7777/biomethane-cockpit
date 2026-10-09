import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TradeMarketAuditStep } from '../steps/TradeMarketAuditStep';
import { getMarketById } from '../../../domain/markets/registry';
import { EligibilityAssessment, GateChecklistItem, GateVerdict } from '../../../domain/eligibility/types';

/**
 * Registry transfer, cross-border PoS and UDB are rows of the one Chain-of-custody checklist, so the
 * "See corridor on map" link belongs to those rows (it used to hang off separate gates).
 */
function assessmentWith(marketId: string, verdict: GateVerdict, checklist: GateChecklistItem[]): EligibilityAssessment {
  return {
    marketId,
    marketName: marketId,
    overallVerdict: verdict === 'PASS' ? 'ELIGIBLE' : verdict === 'HARD_BLOCK' ? 'HARD_BLOCK' : 'CONDITIONAL',
    blockingGate: verdict === 'HARD_BLOCK' ? 'CHAIN_OF_CUSTODY' : null,
    summary: 'summary',
    gates: [
      {
        gate: 'CHAIN_OF_CUSTODY',
        gateLabel: 'Chain of Custody',
        verdict,
        reason: 'reason',
        remedy: null,
        citations: [],
        confidence: 'HIGH',
        checklist,
      },
    ],
  };
}

const row = (id: string, label: string, status: GateChecklistItem['status']): GateChecklistItem => ({
  id, label, status, detail: `${label} detail`, citations: [], remedy: null,
});

describe('TradeMarketAuditStep — chain-of-custody checklist', () => {
  it('links a failing registry-transfer row to the GO corridor on the map', () => {
    const html = renderToStaticMarkup(
      <TradeMarketAuditStep
        marketId="FR_GO"
        setMarketId={() => {}}
        selectedMarket={getMarketById('FR_GO')!}
        assessment={assessmentWith('FR_GO', 'HARD_BLOCK', [row('registry-transfer', 'Registry transfer', 'FAIL')])}
        ghgSavingPct={85}
        origin="DK"
      />
    );

    expect(html).toContain('See corridor on map');
    expect(html).toContain('href="#/map?origin=DK&amp;target=FR&amp;filter=GO"');
  });

  it('links a conditional cross-border-pos row to the PoS corridor on the map', () => {
    const html = renderToStaticMarkup(
      <TradeMarketAuditStep
        marketId="UK_RTFO"
        setMarketId={() => {}}
        selectedMarket={getMarketById('UK_RTFO')!}
        assessment={assessmentWith('UK_RTFO', 'CONDITIONAL', [row('cross-border-pos', 'Cross-border PoS route', 'WARN')])}
        ghgSavingPct={85}
        origin="DK"
      />
    );

    expect(html).toContain('href="#/map?origin=DK&amp;target=GB&amp;filter=POS"');
  });

  it('shows no corridor link when the route row passes', () => {
    const html = renderToStaticMarkup(
      <TradeMarketAuditStep
        marketId="FR_GO"
        setMarketId={() => {}}
        selectedMarket={getMarketById('FR_GO')!}
        assessment={assessmentWith('FR_GO', 'PASS', [row('registry-transfer', 'Registry transfer', 'PASS')])}
        ghgSavingPct={85}
        origin="DK"
      />
    );

    expect(html).not.toContain('See corridor on map');
  });

  it('offers NL GGE in the market list although it is not ACTIVE yet', () => {
    const html = renderToStaticMarkup(
      <TradeMarketAuditStep
        marketId="NL_GGE"
        setMarketId={() => {}}
        selectedMarket={getMarketById('NL_GGE')!}
        assessment={assessmentWith('NL_GGE', 'PASS', [row('go-pos-pairing', 'GO + PoS paired', 'PASS')])}
        ghgSavingPct={85}
        origin="ES"
      />
    );

    expect(html).toContain('Green-gas obligation (GO + PoS together)');
    expect(html).toContain('GGE');
  });
});
