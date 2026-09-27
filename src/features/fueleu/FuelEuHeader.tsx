import React from 'react';
import { getAssumption, fuelEuPoolBidPriceEurPerTco2e } from '../../domain/assumptions/registry';
import { EUROPEAN_MARKET_BENCHMARKS } from '../../domain/markets/marketBenchmarks';
import { markAgeDays, isMarkStale, daysUntil } from '../../domain/fueleu/uiHelpers';
import { FUELEU_ACTIVE_PERIOD, FUELEU_POOLING_BORROWING_DATABASE_DEADLINE } from '../../domain/fueleu/calculator';
import { FuelEuInfoPopover } from './FuelEuInfoPopover';
import { HeaderPill } from '../../shared/ui/PageHeader';

const fueleuMark = EUROPEAN_MARKET_BENCHMARKS.find(m => m.marketId === 'FUELEU');

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

  const offer = getAssumption('fueleu.poolBuyPriceEurPerTco2e');
  const bid = fuelEuPoolBidPriceEurPerTco2e();
  const observedAt = fueleuMark?.observedAt ?? '';
  const ageDays = observedAt ? markAgeDays(observedAt) : null;
  const stale = observedAt ? isMarkStale(observedAt) : false;

  return (
    <header className="fe-header ds-header">
      <div>
        <h1 className="fe-h1 ds-h1">FuelEU Maritime</h1>
        <div className="fe-context ds-context">
          {FUELEU_ACTIVE_PERIOD} reporting period · Reg. (EU) 2023/1805 · EU MRV 2024 activity, fuel split estimated
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

        <div
          className="fe-pill ds-pill"
          title={`Offer €${offer.toFixed(2)}/tCO2e (OceanScore FuelEU Pool-Price Index (OPX), offer-side index) · Bid €${bid.toFixed(2)}/tCO2e (desk estimate = offer − desk spread, no public bid print exists). Mark age: ${ageDays ?? '—'} day(s).`}
        >
          <span className="fe-pill-label ds-pill-label">Pool mark</span>
          <span className="fe-pill-value ds-pill-value num" style={{ color: stale ? 'var(--fe-warn)' : undefined }}>
            €{offer.toFixed(2)} offer
          </span>
          <span className="fe-pill-sub ds-pill-sub num">
            €{bid.toFixed(2)} bid · {ageDays ?? '—'}d old{stale ? ' · stale' : ''}
          </span>
        </div>

        <FuelEuInfoPopover />
      </div>
    </header>
  );
}
