import React from 'react';
import type { BriefMark, LadderHeadline, MarkFreshnessSummary } from '../../domain/briefing/morningBrief';
import { fmt2, fmtPrice } from './briefUi';

const SOURCE_COLOUR: Record<string, string> = {
  EXCHANGE_AUCTION: 'var(--bf-c3)',
  PLATFORM_HISTORY: 'var(--bf-c3)',
  PRICE_REPORTING: 'var(--bf-c1)',
  BROKER_INDICATION: 'var(--bf-c1)',
  COUNTERPARTY_QUOTE: 'var(--bf-c1)',
  PRESS_REPORT: 'var(--bf-c4)',
  ESTIMATE: 'var(--bf-muted)',
};
export const sourceColour = (t: string | null) => (t ? SOURCE_COLOUR[t] ?? 'var(--bf-muted)' : 'var(--bf-muted)');

export function BriefHero({
  greeting, today, consignmentName, headline, freshness, tickers, onTick,
}: {
  greeting: string;
  today: Date;
  consignmentName: string;
  headline: LadderHeadline;
  freshness: MarkFreshnessSummary;
  tickers: BriefMark[];
  onTick: (m: BriefMark) => void;
}) {
  const dateText = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const { best, runnerUp, leadEurMwh, bestBlocked } = headline;
  const stale = freshness.stale + freshness.veryStale;
  return (
    <header className="bf-hero bf-rise" id="brief-top">
      <div className="bf-eyebrow">
        <span className="bf-live" aria-hidden="true" />
        <span>Morning brief</span><span aria-hidden="true">·</span><span>{dateText}</span>
      </div>
      <h1 className="bf-title">{greeting}.</h1>
      <p className="bf-take" data-testid="brief-takeaway">
        {best ? (
          <>
            Best home for <b>{consignmentName}</b> right now is <b>{best.marketName}</b> at{' '}
            <b className="mono">{fmt2(best.netNetback)} €/MWh</b> net
            {runnerUp && leadEurMwh !== null ? <>, {fmt2(leadEurMwh)} €/MWh clear of {runnerUp.marketName}.</> : '.'}{' '}
          </>
        ) : (
          <>No market can take <b>{consignmentName}</b> on today's marks. </>
        )}
        {bestBlocked && (
          <>{bestBlocked.marketName} would pay more ({fmt2(bestBlocked.netNetback)} €/MWh) but is blocked{bestBlocked.blockingGate ? ` at ${bestBlocked.blockingGate.toLowerCase().replace(/_/g, ' ')}` : ''}. </>
        )}
        {stale > 0 ? (
          <span className="bf-alert">
            <span className="bf-dot" style={{ background: 'var(--color-status-warn-border)' }} />
            <span><b>{stale} of {freshness.total}</b> marks are over a week old{freshness.estimates ? <> and <b>{freshness.estimates}</b> are estimates</> : null} — refresh them on the Pricing desk.</span>
          </span>
        ) : (
          <span>All {freshness.total} marks are under a week old.</span>
        )}
      </p>
      {tickers.length > 0 && (
        <div className="bf-ticker" aria-label="Market marks">
          <div className="bf-track run" style={{ ['--bf-tickdur' as string]: `${tickers.length * 3.2}s` }}>
            {[0, 1].map(copy =>
              tickers.map(m => (
                <button
                  key={`${copy}-${m.marketId}`}
                  type="button"
                  className="bf-tick"
                  aria-hidden={copy === 1 ? true : undefined}
                  tabIndex={copy === 1 ? -1 : undefined}
                  title={`${m.name} · ${m.sourceName ?? 'no source'}${m.ageDays !== null ? ` · ${m.ageDays}d old` : ''}`}
                  onClick={() => onTick(m)}
                >
                  <span className="bf-dot" style={{ background: sourceColour(m.sourceType) }} />
                  <span className="n">{m.shortName}</span>
                  <span className="v">{fmtPrice(m.mid)}</span>
                  <span className="u">{m.unitLabel}</span>
                </button>
              )),
            )}
          </div>
        </div>
      )}
    </header>
  );
}
