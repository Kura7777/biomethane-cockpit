import React, { useState } from 'react';
import { useAppState } from '../../store/context';
import { MARKETS } from '../../domain/markets/registry';
import { 
  X, 
  TrendingUp, 
  DollarSign, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Flame, 
  Globe
} from 'lucide-react';
import { PriceSide } from '../../domain/markets/types';

interface MarketPricesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MarketPricesModal({ isOpen, onClose }: MarketPricesModalProps) {
  const { state, dispatch } = useAppState();
  const [gasIndexInput, setGasIndexInput] = useState<string>(
    state.marks.gasIndex.mid?.toString() || '32.50'
  );
  const [fxInput, setFxInput] = useState<string>(
    state.marks.fx.gbpEur?.toString() || '1.175'
  );
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');

  // Handle price update for a national certificate mark
  const handleMarkChange = (marketId: string, valueStr: string) => {
    const val = valueStr === '' ? null : Number(valueStr);
    const existing = state.marks.marks[marketId] || {
      marketId,
      bid: null,
      offer: null,
      mid: null,
      updatedAt: null,
      source: null,
    };

    const now = new Date().toISOString();
    dispatch({
      type: 'SET_MARK',
      marketId,
      bid: existing.bid ?? val,
      offer: existing.offer ?? val,
      mid: val,
      updatedAt: now,
      source: 'DESK · TRADER OVERRIDE',
      provenance: {
        sourceType: 'ESTIMATE',
        sourceName: 'Desk Trader Override',
        sourceUrl: null,
        observedAt: now,
        note: 'Trader adjusted mark based on live news',
      },
    });

    setSavedMessage(`Updated ${marketId} mark`);
    setTimeout(() => setSavedMessage(null), 2000);
  };

  // Handle Gas Index (TTF) change
  const handleSaveGasIndex = () => {
    const val = Number(gasIndexInput);
    if (!isNaN(val) && val > 0) {
      dispatch({
        type: 'SET_GAS_INDEX',
        bid: state.marks.gasIndex.bid ?? val,
        offer: state.marks.gasIndex.offer ?? val,
        mid: val,
      });
      setSavedMessage('Updated TTF Gas Index price');
      setTimeout(() => setSavedMessage(null), 2000);
    }
  };

  // Handle FX change
  const handleSaveFx = () => {
    const val = Number(fxInput);
    if (!isNaN(val) && val > 0) {
      dispatch({
        type: 'SET_FX',
        currency: 'gbpEur',
        value: val,
      });
      setSavedMessage('Updated GBP/EUR FX rate');
      setTimeout(() => setSavedMessage(null), 2000);
    }
  };

  const currentSide: PriceSide = state.marks.pricingSides.certificateSide;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="panel"
        style={{
          width: 'min(860px, 100%)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-panel)',
          border: '1px solid var(--color-divider)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'var(--color-info-subtle, rgba(31,95,173,0.12))',
                border: '1px solid var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
              }}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: 0,
                }}
              >
                <span>Live Market Marks &amp; News Pricing</span>
                {savedMessage && (
                  <span
                    className="chip chip-pos"
                    style={{ fontSize: '10.5px', padding: '1px 6px' }}
                  >
                    ✓ {savedMessage}
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '11.5px', color: 'var(--color-muted)', margin: '2px 0 0' }}>
                Adjust wholesale gas, national certificate quotas, and FX rates to immediately re-price all deals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Pricing Side Selector */}
            <div
              className="seg"
              style={{ padding: '2px', borderRadius: 'var(--radius-control)' }}
            >
              <span style={{ fontSize: '10.5px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700, padding: '0 6px' }}>
                Side:
              </span>
              {(['bid', 'mid', 'offer'] as PriceSide[]).map(side => (
                <button
                  key={side}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PRICING_SIDE', side })}
                  className={`btn ${currentSide === side ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    minHeight: '22px',
                    textTransform: 'uppercase',
                    borderRadius: 'var(--radius-control)',
                  }}
                >
                  {side}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '4px 8px', borderRadius: 'var(--radius-control)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--color-bg)' }}>
          {/* Top Indices: TTF Natural Gas & FX */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* TTF Natural Gas */}
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-panel)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame className="w-4 h-4" style={{ color: 'var(--color-warn, #b45309)' }} />
                  Wholesale Gas Index (TTF M+1)
                </span>
                <span className="chip chip-neutral" style={{ fontSize: '10px' }}>Benchmark Molecule</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    step="0.10"
                    value={gasIndexInput}
                    onChange={e => setGasIndexInput(e.target.value)}
                    className="input num"
                    style={{
                      width: '100%',
                      padding: '6px 40px 6px 10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-control)',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '7px', fontSize: '11px', color: 'var(--color-muted)' }}>€/MWh</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveGasIndex}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-control)' }}
                >
                  Save
                </button>
              </div>
              <span className="num" style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block', marginTop: '6px' }}>
                Current Mid: €{state.marks.gasIndex.mid?.toFixed(2)}/MWh · Bid: €{state.marks.gasIndex.bid?.toFixed(2)} · Offer: €{state.marks.gasIndex.offer?.toFixed(2)}
              </span>
            </div>

            {/* GBP / EUR FX Rate */}
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-panel)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                  GBP / EUR Foreign Exchange
                </span>
                <span className="chip chip-neutral" style={{ fontSize: '10px' }}>UK RTFO Conversion</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    step="0.005"
                    value={fxInput}
                    onChange={e => setFxInput(e.target.value)}
                    className="input num"
                    style={{
                      width: '100%',
                      padding: '6px 40px 6px 10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-control)',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '7px', fontSize: '11px', color: 'var(--color-muted)' }}>Rate</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveFx}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-control)' }}
                >
                  Save
                </button>
              </div>
              <span className="num" style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block', marginTop: '6px' }}>
                Current Exchange Rate: £1.00 = €{state.marks.fx.gbpEur?.toFixed(3)}
              </span>
            </div>
          </div>

          {/* National Green Compliance Certificate Quotas */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-panel)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                National Compliance Certificate Marks (RED III Quotas)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                Adjust levels directly below based on broker runs or news
              </span>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-divider)' }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Market &amp; Territory</th>
                    <th>Quota Unit</th>
                    <th style={{ textAlign: 'right', width: '160px' }}>Adjust Mid Level</th>
                    <th style={{ textAlign: 'right' }}>Effective Side ({currentSide.toUpperCase()})</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMarkets.map(m => {
                    const mark = state.marks.marks[m.id];
                    const midVal = mark?.mid ?? '';
                    const effectiveVal = mark ? mark[currentSide] ?? mark.mid : null;

                    return (
                      <tr key={m.id}>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {m.name}
                          </div>
                          <div className="mut" style={{ fontSize: '10.5px' }}>{m.countryName} ({m.id})</div>
                        </td>

                        <td style={{ padding: '8px 10px' }}>
                          <div>{m.unitLabel}</div>
                          <div className="chip chip-info" style={{ fontSize: '9px', padding: '1px 5px', marginTop: '2px', display: 'inline-block' }}>{m.registry || 'National Register'}</div>
                        </td>

                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <input
                            type="number"
                            step={m.id === 'NL_ERE' || m.id === 'UK_RTFO' ? '0.01' : '1'}
                            value={midVal !== null ? midVal : ''}
                            onChange={e => handleMarkChange(m.id, e.target.value)}
                            placeholder="Unset"
                            className="input num"
                            style={{
                              width: '110px',
                              textAlign: 'right',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: 'var(--radius-control)',
                              padding: '3px 8px',
                            }}
                          />
                        </td>

                        <td className="num" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-pnl-pos, var(--color-accent))' }}>
                          {effectiveVal != null ? `€${effectiveVal.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-panel-header)',
            fontSize: '11.5px',
            color: 'var(--color-muted)',
          }}
        >
          <span>All modified prices immediately update all sourcing calculations &amp; margin waterfalls.</span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '5px 16px', fontSize: '12px', borderRadius: 'var(--radius-control)' }}
          >
            Apply &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
}
