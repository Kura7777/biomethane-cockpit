import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  CountryMeta,
  ACCEPT_FOREIGN_CONFIG,
  MapView,
  SellCategory
} from '../mapConstants';
import { MarketConfig } from '../../../domain/markets/types';

interface MapDesktopHeaderProps {
  view: MapView;
  complianceCounts: Record<string, number>;
  categoryCounts: Record<SellCategory, number>;
  origin: string;
  target: string;
  sortedCountries: Array<[string, CountryMeta]>;
  currentTradeTarget: MarketConfig | null;
  setOriginFromMenu: (val: string) => void;
  setTargetFromMenu: (val: string) => void;
  setOrigin: (val: string) => void;
  setTarget: (val: string) => void;
  handleSwapCorridor: () => void;
  handleSimulateTrade: () => void;
}

export function MapDesktopHeader({
  view,
  complianceCounts,
  categoryCounts,
  origin,
  target,
  sortedCountries,
  currentTradeTarget,
  setOriginFromMenu,
  setTargetFromMenu,
  setOrigin,
  setTarget,
  handleSwapCorridor,
  handleSimulateTrade,
}: MapDesktopHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '6px 18px',
        borderBottom: '2px solid var(--color-divider)',
        backgroundColor: 'var(--color-surface)',
        flexWrap: 'nowrap',
      }}
    >
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '18px', rowGap: '2px' }}>
        <h3 className="ptitle" style={{ fontSize: '18px', margin: 0 }}>Compliance &amp; logistics map</h3>
        <div className="subttl" style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
          <span style={{ display: 'inline-flex', gap: '12px', flexWrap: 'wrap' }}>
            {view === 'COMPLIANCE' ? (
              (['YES', 'GO_REQUIRED', 'OPEN', 'NO', 'NO_SCHEME'] as const)
                .filter(st => complianceCounts[st] > 0)
                .map(st => (
                  <span key={st} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '9px', height: '9px', backgroundColor: ACCEPT_FOREIGN_CONFIG[st].swatch }} />
                    {ACCEPT_FOREIGN_CONFIG[st].label.split(' ')[0]} · {complianceCounts[st]}
                  </span>
                ))
            ) : (
              (['SELL_NOW', 'CHECK_FIRST', 'CLOSED'] as const).map(cat => (
                <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', backgroundColor: cat === 'SELL_NOW' ? 'var(--color-status-pass-text)' : cat === 'CHECK_FIRST' ? 'var(--color-status-warn-text)' : 'color-mix(in srgb, var(--color-text) 25%, var(--color-bg))' }} />
                  {cat === 'SELL_NOW' ? 'Ready to trade' : cat === 'CHECK_FIRST' ? 'Review needed / workaround' : 'Closed / domestic only'} · {categoryCounts[cat]}
                </span>
              ))
            )}
          </span>
        </div>
      </div>

      {/* Quick Origin / Target Selector Bar */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--color-bg)',
          padding: '4px 8px',
          border: '1px solid var(--color-divider)',
          borderRadius: 'var(--radius-control)',
        }}
      >
        {/* Origin Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="eyebrow" style={{ color: 'var(--color-text)', fontWeight: 800 }}>Origin</span>
          <select
            value={origin}
            onChange={e => {
              const val = e.target.value;
              if (val === target) setOriginFromMenu(val);
              else setOrigin(val);
            }}
            className="input"
            aria-label="Origin country"
            style={{
              height: '28px',
              minHeight: '28px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 600,
              width: '210px',
              cursor: 'pointer',
            }}
          >
            {sortedCountries.map(([name, c]) => (
              <option key={c.iso} value={name}>
                {c.iso} · {c.name} ({c.plants}p)
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '28px', height: '28px', padding: 0, minHeight: '28px' }}
          title="Swap Origin and Target"
          aria-label="Swap corridor direction"
          onClick={handleSwapCorridor}
        >
          <ArrowLeftRight style={{ width: '13px', height: '13px' }} />
        </button>

        {/* Target Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>Target</span>
          <select
            value={target}
            onChange={e => {
              const val = e.target.value;
              if (val === origin) setTargetFromMenu(val);
              else setTarget(val);
            }}
            className="input"
            aria-label="Target country"
            style={{
              height: '28px',
              minHeight: '28px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 600,
              width: '210px',
              borderColor: 'var(--color-accent)',
              cursor: 'pointer',
            }}
          >
            {sortedCountries.map(([name, c]) => (
              <option key={c.iso} value={name}>
                {c.iso} · {c.name} ({c.status})
              </option>
            ))}
          </select>
        </div>

        {/* Simulate CTA */}
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: '28px', minHeight: '28px', fontSize: '12px', padding: '0 10px', marginLeft: '4px' }}
          onClick={handleSimulateTrade}
          disabled={!currentTradeTarget}
          title={!currentTradeTarget ? 'No tradeable market mapped for this route' : undefined}
        >
          Trade →
        </button>
      </div>
    </div>
  );
}
