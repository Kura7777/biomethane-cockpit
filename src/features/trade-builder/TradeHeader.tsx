import React from 'react';
import { ListOrdered, LayoutGrid } from 'lucide-react';
import { MONO_FONT } from './options';
import { GateBadge } from './ticketMath';
import { DealParams } from '../../domain/trade/dealParams';
import { BiomethanePlant } from '../../domain/plants/types';

interface TradeHeaderProps {
  dealId: string;
  deal: Partial<DealParams>;
  linkedPlant: BiomethanePlant | null | undefined;
  originFlag: string;
  originName: string;
  feedstockLabel: string;
  netNetbackVal: number;
  annualPnl: number;
  deskMarginVal: number | null;
  headerGateBadge: GateBadge;
  blockedBadgeTitle: string;
  flowMode: 'STEPPER' | 'GRID';
  onToggleMode: (mode: 'STEPPER' | 'GRID') => void;
  onGoToGate: () => void;
}

export function TradeHeader({
  dealId,
  deal,
  linkedPlant,
  originFlag,
  originName,
  feedstockLabel,
  netNetbackVal,
  annualPnl,
  deskMarginVal,
  headerGateBadge,
  blockedBadgeTitle,
  flowMode,
  onToggleMode,
  onGoToGate,
}: TradeHeaderProps) {
  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-divider)',
        backgroundColor: 'var(--color-surface)',
        padding: '10px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        {/* Deal ID & Locked Asset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-accent)',
              padding: '2px 6px',
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-subtier)',
            }}
          >
            {dealId}
          </span>

          {deal.plantName || linkedPlant ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px' }}>{originFlag}</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text)' }}>
                {deal.plantName || linkedPlant?.name}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  border: '1px solid var(--color-status-pass-border)',
                  backgroundColor: 'var(--color-status-pass-bg)',
                  color: 'var(--color-status-pass-text)',
                  borderRadius: 'var(--radius-bar)',
                }}
              >
                CENSUS ASSET LOCKED
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
              {originFlag} {originName} · {feedstockLabel}
            </span>
          )}

          {deal.counterparty && (
            <span
              style={{
                fontSize: '12px',
                fontFamily: MONO_FONT,
                fontWeight: 600,
                padding: '2px 7px',
                border: '1px solid rgba(14, 165, 233, 0.4)',
                backgroundColor: 'rgba(14, 165, 233, 0.12)',
                color: 'var(--color-sky-400, #38bdf8)',
                borderRadius: 'var(--radius-bar)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title={`Upstream gas hedge for marine counterparty ${deal.counterparty}`}
            >
              <span>HEDGE:</span>
              <span style={{ color: 'var(--color-text)' }}>{deal.counterparty.toUpperCase()}</span>
            </span>
          )}
        </div>

        {/* Quick Metrics & Mode Toggle */}
        <div className="m-hide" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              padding: '3px 8px',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--color-subtier)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '12px',
            }}
          >
            <span style={{ color: 'var(--color-muted)' }}>Netback:</span>
            <strong style={{ color: netNetbackVal >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
              {netNetbackVal >= 0 ? `+€${netNetbackVal.toFixed(2)}` : `−€${Math.abs(netNetbackVal).toFixed(2)}`}/MWh
            </strong>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              padding: '3px 8px',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--color-subtier)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '12px',
            }}
          >
            <span style={{ color: 'var(--color-muted)' }}>P&amp;L:</span>
            <strong style={{ color: (deskMarginVal ?? 0) >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
              {deskMarginVal !== null ? `€${annualPnl.toLocaleString()}` : '—'}
            </strong>
          </div>

          {headerGateBadge.tone === 'pos' ? (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-bar)',
                border: '1px solid var(--color-status-pass-border)',
                backgroundColor: 'var(--color-status-pass-bg)',
                color: 'var(--color-status-pass-text)',
              }}
            >
              ● {headerGateBadge.label.toUpperCase()}
            </span>
          ) : (
            <button
              type="button"
              onClick={onGoToGate}
              title={blockedBadgeTitle}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-bar)',
                border: `1px solid ${headerGateBadge.tone === 'neg' ? 'var(--color-status-neg-border)' : 'var(--color-status-warn-border)'}`,
                backgroundColor: headerGateBadge.tone === 'neg' ? 'var(--color-status-neg-bg)' : 'var(--color-status-warn-bg)',
                color: headerGateBadge.tone === 'neg' ? 'var(--color-status-neg-text)' : 'var(--color-status-warn-text)',
                cursor: 'pointer',
              }}
            >
              ● {headerGateBadge.label}
            </button>
          )}

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => onToggleMode('STEPPER')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: flowMode === 'STEPPER' ? 'var(--color-text)' : 'var(--color-surface)',
                color: flowMode === 'STEPPER' ? 'var(--color-bg)' : 'var(--color-muted)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Fluid 4-Step Deal Flow"
            >
              <ListOrdered size={12} />
              <span>Deal flow</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMode('GRID')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: flowMode === 'GRID' ? 'var(--color-text)' : 'var(--color-surface)',
                color: flowMode === 'GRID' ? 'var(--color-bg)' : 'var(--color-muted)',
                border: 'none',
                borderLeft: '1px solid var(--color-divider)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="All-In-One 3-Column Desk Grid"
            >
              <LayoutGrid size={12} />
              <span>Desk grid</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
