import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { PageHelper } from '../PageHelper';
import { StagedMarksCard } from '../StagedMarksCard';
import { AppProvider } from '../../../store/context';
import { resetHelperStore, setHelperOpen, setStagedRun, addStagedMemory } from '../helperStore';
import type { BrokerParseResult, ParsedBrokerMark } from '../../../domain/markets/brokerRunParser';

const mark = (o: Partial<ParsedBrokerMark>): ParsedBrokerMark => ({
  id: 'm1', rawLine: 'DE_THG', marketId: 'DE_THG', marketName: 'Germany THG Quota', productRaw: 'DE_THG', midPrice: 300, bid: 295, ask: 305,
  unit: 'EUR_PER_TCO2E', assessmentDate: '2026-10-16', brokerSource: 'Marex', isValid: true, validationErrors: [], validationWarnings: [], ...o,
});
const run = (marks: ParsedBrokerMark[]): BrokerParseResult => ({
  marks, quotes: [], errors: [], warnings: [], brokerDetected: 'Marex', inferredSource: 'GENERIC_OTC', totalLines: marks.length, rawLineCount: marks.length,
  validCount: marks.filter(m => m.isValid).length, parsedQuoteCount: 0, skippedLines: [], extractedDate: '2026-10-16', chatExtractedLabel: 'chat-extracted from Marex text',
});

describe('staged cards in the per-page dock', () => {
  beforeEach(() => resetHelperStore());

  it('the dock renders the staged-marks card (it used to be Ask-the-desk only)', () => {
    setStagedRun(run([mark({})]));
    setHelperOpen(true);
    const html = renderToStaticMarkup(
      <StaticRouter location="/glossary"><AppProvider><PageHelper /></AppProvider></StaticRouter>,
    );
    expect(html).toContain('data-testid="staged-marks-card"');
  });
  it('shows the current desk mark and the change next to the staged number, and rejected rows', () => {
    const html = renderToStaticMarkup(
      <AppProvider>
        <StagedMarksCard stagedRun={run([mark({}), mark({ id: 'm2', isValid: false, rawLine: 'NL_GGE 40 EUR/MWh', validationErrors: ['unit not convertible'] })])} onDismiss={() => {}} />
      </AppProvider>,
    );
    expect(html).toContain('Desk now');
    expect(html).toContain('Change');
    expect(html).toContain('data-testid="staged-diff"');
    expect(html).toContain('data-testid="staged-rejected"');
    expect(html).toContain('unit not convertible');
    expect(html).toContain('chat-extracted from Marex text');
  });
  it('shows a proposed memory rule as not saved until confirmed', () => {
    addStagedMemory({ subject: 'Shell', rule: 'Needs CI below -50', category: 'counterparty' });
    setHelperOpen(true);
    const html = renderToStaticMarkup(
      <StaticRouter location="/glossary"><AppProvider><PageHelper /></AppProvider></StaticRouter>,
    );
    expect(html).toContain('data-testid="staged-memory-card"');
    expect(html).toContain('Not saved yet');
  });
});
