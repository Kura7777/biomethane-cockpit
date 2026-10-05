import React from 'react';
import { Link } from 'react-router-dom';
import { NO_POOL_MARK } from '../../domain/fueleu/marketPrices';
import { SourceChip } from '../../shared/ui/SourceChip';
import { useFuelEuPrices } from './useFuelEuPrices';
import { markAgeDays, isMarkStale, daysUntil } from '../../domain/fueleu/uiHelpers';
import { FUELEU_ACTIVE_PERIOD, FUELEU_POOLING_BORROWING_DATABASE_DEADLINE } from '../../domain/fueleu/calculator';
import { MRV_REPORTING_YEAR } from '../../domain/fueleu/mrvVintage';
import { FuelEuInfoPopover } from './FuelEuInfoPopover';
import { HeaderPill } from '../../shared/ui/PageHeader';
import { latestTradeVwap, markDivergencePct } from '../../domain/markets/fueleuPoolIndexHistory';

/** Above this absolute divergence between the desk mark and the latest BetterSea traded VWAP,
 *  the header flags that the mark is diverging from executed trades. */
const DIVERGENCE_WARN_THRESHOLD = 0.10;

/**
 * Redesigned FuelEU Maritime header: H1, one muted context line, a live pooling-deadline pill, a
 * live pool-mark pill (restyled PoolPriceMark logic), and the ⓘ sources/assumptions popover.
 */
export function FuelEuHeader() {
  const poolingDeadlineDays = daysUntil(FUELEU_POOLING_BORROWING_DATABASE_DEADLINE);
  const poolingDeadlineLabel = new Date(`${FUELEU_POOLING_BORROWING_DATABASE_DEADLINE}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const prices = useFuelEuPrices();
  const pool = prices.pool;
  const offer = pool?.offerEurPerTco2e ?? null;
  const bid = pool?.bidEurPerTco2e ?? null;
  const observedAt = prices.poolSource?.asOf ?? '';
  const ageDays = observedAt ? markAgeDays(observedAt) : null;
  const stale = observedAt ? isMarkStale(observedAt) : false;

  const betterSea = latestTradeVwap();
  const divergencePct = offer !== null ? markDivergencePct(offer) : null;
  const diverges = divergencePct !== null && Math.abs(divergencePct) > DIVERGENCE_WARN_THRESHOLD;
  const betterSeaMonthLabel = betterSea
    ? new Date(`${betterSea.period}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short' })
    : null;

  return (
    <header className="fe-header ds-header">
      <div>
        <h1 className="fe-h1 ds-h1">FuelEU Maritime</h1>
        <div className="fe-context ds-context">
          {FUELEU_ACTIVE_PERIOD} reporting period · Reg. (EU) 2023/1805 · EU MRV {MRV_REPORTING_YEAR} activity, fuel split estimated
        </div>
      </div>
      <div className="fe-header-actions ds-header-actions">
        <HeaderPill
          className="fe-pill"
          warn={poolingDeadlineDays <= 30}
          label="Pooling deadline"
          value={`${poolingDeadlineLabel} · ${poolingDeadlineDays >= 0 ? `${poolingDeadlineDays} days` : 'overdue'}`}
          title={`Pooling & borrowing must be recorded in the FuelEU database by ${poolingDeadlineLabel} (Art. 20(3) / Art. 21(8)).`}
        />

        {offer === null || bid === null ? (
          <div className="fe-pill ds-pill" data-testid="pool-mark-missing">
            <span className="fe-pill-label ds-pill-label">Pool mark</span>
            <span className="fe-pill-value ds-pill-value">{NO_POOL_MARK}</span>
            <Link to="/pricing" className="fe-pill-sub ds-pill-sub" style={{ color: 'var(--color-accent)' }}>Pricing desk →</Link>
          </div>
        ) : (
        <div
          className="fe-pill ds-pill"
          data-testid="pool-mark"
          title={`Offer €${offer.toFixed(2)}/tCO2e (FUELEU mark in the Pricing desk, offer side) · Bid €${bid.toFixed(2)}/tCO2e (desk estimate = offer − desk spread, no public bid print exists). Mark age: ${ageDays ?? '—'} day(s).${
            betterSea && betterSea.vwap !== undefined
              ? ` BetterSea FuelEU Surplus Index (executed trades) ${betterSeaMonthLabel}: €${betterSea.vwap.toFixed(2)} VWAP.`
              : ''
          }`}
        >
          <span className="fe-pill-label ds-pill-label">Pool mark</span>
          <span className="fe-pill-value ds-pill-value num" style={{ color: stale ? 'var(--fe-warn)' : undefined }}>
            €{offer.toFixed(2)} offer
          </span>
          <span className="fe-pill-sub ds-pill-sub num">
            €{bid.toFixed(2)} bid · {ageDays ?? '—'}d old{stale ? ' · stale' : ''}
          </span>
          {prices.poolSource && (
            <span className="fe-pill-sub ds-pill-sub">
              <SourceChip badge={prices.poolSource.badge} suffix={prices.poolSource.asOf ? `mark ${prices.poolSource.asOf}` : null} />
            </span>
          )}
          {betterSea && betterSea.vwap !== undefined && (
            <span className="fe-pill-sub ds-pill-sub num" style={{ fontSize: '10.5px' }}>
              BetterSea trades {betterSeaMonthLabel}: €{betterSea.vwap.toFixed(2)} (VWAP)
            </span>
          )}
          {diverges && (
            <span
              className="num"
              style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-status-warn-text, #d97706)', fontWeight: 600 }}
              title={`Desk mark €${offer.toFixed(2)} differs from the latest BetterSea traded VWAP (€${betterSea?.vwap?.toFixed(2)}) by ${(divergencePct! * 100).toFixed(1)}%.`}
            >
              ⚠ Mark diverges from traded prices
            </span>
          )}
        </div>
        )}

        <FuelEuInfoPopover />
      </div>
    </header>
  );
}
