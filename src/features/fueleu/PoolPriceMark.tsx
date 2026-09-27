import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { getAssumption, fuelEuPoolBidPriceEurPerTco2e } from '../../domain/assumptions/registry';
import { EUROPEAN_MARKET_BENCHMARKS } from '../../domain/markets/marketBenchmarks';
import { markAgeDays, isMarkStale } from '../../domain/fueleu/uiHelpers';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const fueleuMark = EUROPEAN_MARKET_BENCHMARKS.find(m => m.marketId === 'FUELEU');

export interface PoolPriceMarkProps {
  /** 'inline' for a compact single-line chip, 'block' for the fuller card used near headline figures. */
  variant?: 'inline' | 'block';
  style?: React.CSSProperties;
}

/**
 * Single source of truth for the FuelEU pool offer/bid mark shown anywhere in the shipping desk UI.
 * Always reads the live register value (getAssumption / fuelEuPoolBidPriceEurPerTco2e) and the
 * underlying market mark's observedAt date, so every screen stays in sync if the register updates.
 */
export function PoolPriceMark({ variant = 'inline', style }: PoolPriceMarkProps) {
  const offer = getAssumption('fueleu.poolBuyPriceEurPerTco2e');
  const bid = fuelEuPoolBidPriceEurPerTco2e();
  const observedAt = fueleuMark?.observedAt ?? '';
  const ageDays = observedAt ? markAgeDays(observedAt) : null;
  const stale = observedAt ? isMarkStale(observedAt) : false;
  const observedAtLabel = observedAt
    ? new Date(`${observedAt}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'unknown';

  const title = `Offer €${offer.toFixed(2)}/tCO2e (OceanScore FuelEU Pool-Price Index (OPX), offer-side index, observed ${observedAtLabel}) · Bid €${bid.toFixed(2)}/tCO2e (desk estimate = offer − desk spread, no public bid print exists). Mark age: ${ageDays ?? '—'} day(s).`;

  if (variant === 'block') {
    return (
      <div
        title={title}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          border: `1px solid ${stale ? 'var(--color-status-warn-border)' : 'var(--color-divider)'}`,
          backgroundColor: stale ? 'var(--color-status-warn-bg)' : 'var(--color-panel-header)',
          borderRadius: '3px',
          fontFamily: MONO_FONT,
          fontSize: '11.5px',
          flexWrap: 'wrap',
          ...style,
        }}
      >
        <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>FuelEU Pool Mark:</span>
        <span style={{ fontWeight: 800, color: 'var(--color-status-neg-text)' }}>Offer €{offer.toFixed(2)}</span>
        <span style={{ color: 'var(--color-muted)', fontSize: '9.5px' }}>(OceanScore OPX, offer-side)</span>
        <span style={{ color: 'var(--color-divider)' }}>·</span>
        <span style={{ fontWeight: 800, color: 'var(--color-status-pos-text)' }}>Bid €{bid.toFixed(2)}</span>
        <span style={{ color: 'var(--color-muted)', fontSize: '9.5px' }}>(desk estimate)</span>
        <span style={{ color: 'var(--color-divider)' }}>·</span>
        <span style={{ color: stale ? 'var(--color-status-warn-text)' : 'var(--color-muted)', fontWeight: stale ? 700 : 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {stale && <AlertTriangle size={11} />}
          as of {observedAtLabel} ({ageDays}d old{stale ? ' — stale' : ''})
        </span>
      </div>
    );
  }

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: MONO_FONT,
        fontSize: '10.5px',
        padding: '1px 7px',
        border: `1px solid ${stale ? 'var(--color-status-warn-border)' : 'var(--color-divider)'}`,
        backgroundColor: stale ? 'var(--color-status-warn-bg)' : 'var(--color-subtier)',
        color: stale ? 'var(--color-status-warn-text)' : 'var(--color-muted)',
        borderRadius: '2px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {stale && <AlertTriangle size={10} />}
      Offer €{offer.toFixed(2)} · Bid €{bid.toFixed(2)} · as of {observedAtLabel} ({ageDays}d)
    </span>
  );
}
