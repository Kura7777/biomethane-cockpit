import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { MARKETS } from '../../domain/markets/registry';
import { Market } from '../../domain/markets/types';
import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';
import { resolveMarketForQuote, rowFeedsMarket, rowHasPrice } from '../../domain/marks/applyMarks';
import { showToast } from '../../app/DeskToastContainer';
import { buildDealUrl } from '../../domain/trade/dealParams';
import {
  DE_THG_PENALTY_EUR_PER_TCO2E,
  UK_RTFC_BUYOUT_GBP,
  FR_CPB_CEILING_EUR_MWH,
  FUELEU_STATUTORY_PENALTY_PER_TONNE,
  REGULATORY_CONSTANT_ROWS,
} from '../../domain/regulatory/constants';
import { Scale, ArrowUpRight } from 'lucide-react';

interface ComplianceLadderViewProps {
  quotes: PricingBookEntry[];
  onCellEdit: (id: string, field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume', val: string) => void;
}

/**
 * The compliance schemes shown here. Everything displayed about a scheme (name, unit, legal basis,
 * registry, obligation trajectory) is read from the markets registry; penalty / buy-out ceilings
 * are read from the cited regulatory constants. Nothing is typed in by hand: a value the registry
 * does not hold shows as "—".
 */
const LADDER_MARKET_IDS = ['DE_THG', 'NL_ERE', 'UK_RTFO', 'FR_CPB', 'IT_CIC', 'FUELEU'] as const;

interface StatutoryCeiling {
  /** Numeric ceiling in `unit`. */
  value: number;
  unit: string;
  label: string;
  citation: string;
  /** True when `unit` is the same unit the desk mark is quoted in, so "% of cap" is meaningful. */
  comparableToMark: boolean;
}

const CEILING_CONSTANT_KEYS: Record<string, { key: string; value: number; comparableToMark: boolean }> = {
  DE_THG: { key: 'DE_THG_PENALTY_EUR_PER_TCO2E', value: DE_THG_PENALTY_EUR_PER_TCO2E, comparableToMark: true },
  UK_RTFO: { key: 'UK_RTFC_BUYOUT_GBP', value: UK_RTFC_BUYOUT_GBP, comparableToMark: true },
  FR_CPB: { key: 'FR_CPB_CEILING_EUR_MWH', value: FR_CPB_CEILING_EUR_MWH, comparableToMark: true },
  // The FuelEU Annex IV penalty is per tonne of VLSFO-equivalent, not the EUR/tCO2e deficit unit of the mark.
  FUELEU: { key: 'FUELEU_STATUTORY_PENALTY_PER_TONNE', value: FUELEU_STATUTORY_PENALTY_PER_TONNE, comparableToMark: false },
};

function ceilingFor(marketId: string): StatutoryCeiling | null {
  const def = CEILING_CONSTANT_KEYS[marketId];
  if (!def) return null;
  const row = REGULATORY_CONSTANT_ROWS.find(r => r.key === def.key);
  if (!row) return null;
  return { value: def.value, unit: row.unit, label: row.label, citation: row.citation ?? '—', comparableToMark: def.comparableToMark };
}

function obligationFor(market: Market, year: number): string {
  const step = market.quotaTrajectory?.find(t => t.year === year);
  return step ? `${step.obligationPct}% (${step.basis})` : '—';
}

function markDecimals(unit: string): number {
  return unit.includes('kg') || unit.includes('RTFC') ? 3 : 2;
}

export function ComplianceLadderView({ quotes, onCellEdit }: ComplianceLadderViewProps) {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          borderLeft: '4px solid var(--color-warn)',
          borderRadius: 'var(--radius-panel)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Scale className="w-5 h-5" style={{ color: 'var(--color-warn)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              National Statutory Compliance Quotas (RED III &amp; Domestic Transport Mandates)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              These instruments are non-conflicting pure statutory compliance attributes. Each scheme enforces statutory non-compliance penalties and specific national mass balance registries.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="chip chip-warn">RED III Annex IX-A</span>
          <span className="chip chip-info">UDB Mass Balance</span>
        </div>
      </div>

      {/* Scheme Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        {LADDER_MARKET_IDS.map(marketId => {
          const market = MARKETS.find(m => m.id === marketId);
          if (!market) return null;
          const scheme = { marketId, name: market.name, unit: market.unitLabel, country: market.country };
          const ceiling = ceilingFor(marketId);
          const matchingQuotes = quotes.filter(q => resolveMarketForQuote(q) === marketId);

          // The desk mark is the only price shown. No mark means "No desk mark", never a stand-in.
          const deskMid = state.marks.marks[scheme.marketId]?.mid ?? null;

          // Proximity to ceiling, only where the ceiling is in the mark's own unit.
          const capPct =
            deskMid !== null && ceiling && ceiling.comparableToMark && ceiling.value > 0
              ? Math.round((deskMid / ceiling.value) * 100)
              : null;

          return (
            <div
              key={scheme.marketId}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-panel)',
                overflow: 'hidden',
              }}
            >
              {/* Header Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: 'var(--color-panel-header)',
                  borderBottom: '1px solid var(--color-divider)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="chip chip-neutral" style={{ fontSize: '11px', fontWeight: 700 }}>{scheme.country}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                        {scheme.name}
                      </h4>
                      <span className="chip chip-info" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {scheme.unit}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      {market.legalBasis} · Registry: <strong>{market.registry ?? '—'}</strong>
                    </div>
                  </div>
                </div>

                {/* Right side stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>Active Desk Mark Mid</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)' }} className="num">
                      {deskMid === null ? 'No desk mark' : `${deskMid.toFixed(markDecimals(scheme.unit))} ${scheme.unit}`}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => navigate(buildDealUrl({ marketId: scheme.marketId }))}
                  >
                    Open in Trade Builder <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-header info ribbon: Obligation & Ceiling */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '8px',
                  padding: '8px 18px',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderBottom: '1px solid var(--color-divider)',
                  fontSize: '11.5px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>2026 obligation: </span>
                  <strong>{obligationFor(market, 2026)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>2030 obligation: </span>
                  <strong>{obligationFor(market, 2030)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>Statutory Buyout / Cap: </span>
                  <strong style={{ color: 'var(--color-warn)' }} title={ceiling?.citation}>
                    {ceiling ? `${ceiling.value} ${ceiling.unit}` : '—'}
                  </strong>
                  {capPct !== null && (
                    <span style={{ marginLeft: '6px', color: 'var(--color-muted)' }}>
                      ({capPct}% of cap)
                    </span>
                  )}
                </div>
              </div>

              {/* Quotes Blotter for this statutory scheme */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '100px', textAlign: 'center' }}>Vintage / Tenor</th>
                      <th style={{ minWidth: '180px' }}>Feedstock / Specification</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Certified</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>CI Score</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>{`BID (${scheme.unit})`}</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>{`OFFER (${scheme.unit})`}</th>
                      <th style={{ width: '95px', textAlign: 'right' }}>BID Vol (GWh)</th>
                      <th style={{ width: '95px', textAlign: 'right' }}>OFFER Vol (GWh)</th>
                      <th style={{ minWidth: '150px' }}>Price Provenance</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Reference Mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingQuotes.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '16px', color: 'var(--color-muted)' }}>
                          No quotes in the book for {scheme.name}.
                        </td>
                      </tr>
                    ) : (
                      matchingQuotes.map(q => {
                        const isRef = Boolean(state.referenceRowIds?.[scheme.marketId] === q.id);
                        const isTradeable = q.isTradeable;

                        return (
                          <tr
                            key={q.id}
                            style={{
                              backgroundColor: isRef ? 'var(--color-surface-selected, rgba(234, 179, 8, 0.04))' : undefined,
                            }}
                          >
                            {/* Vintage / Tenor */}
                            <td style={{ textAlign: 'center', fontWeight: 700 }} className="num">
                              {q.vintage || '—'}
                            </td>

                            {/* Feedstock */}
                            <td>
                              <span style={{ fontWeight: isRef ? 700 : 500 }}>
                                {q.feedstock}
                              </span>
                            </td>

                            {/* Certified */}
                            <td style={{ textAlign: 'center', fontSize: '11.5px' }} className="mut">
                              {q.certified}
                            </td>

                            {/* CI Score */}
                            <td style={{ textAlign: 'center', fontWeight: 600 }} className="num">
                              {q.ciScore || '—'}
                            </td>

                            {/* BID Price */}
                            <td>
                              <input
                                type="text"
                                value={q.bidPrice}
                                onChange={e => onCellEdit(q.id, 'bidPrice', e.target.value)}
                                placeholder="—"
                                className="input num"
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              />
                            </td>

                            {/* OFFER Price */}
                            <td>
                              <input
                                type="text"
                                value={q.offerPrice}
                                onChange={e => onCellEdit(q.id, 'offerPrice', e.target.value)}
                                placeholder="—"
                                className="input num"
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              />
                            </td>

                            {/* BID Vol */}
                            <td>
                              <input
                                type="text"
                                value={isTradeable ? q.bidVolume : '—'}
                                disabled={!isTradeable}
                                onChange={e => onCellEdit(q.id, 'bidVolume', e.target.value)}
                                placeholder="—"
                                className="input num"
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  opacity: isTradeable ? 1 : 0.5,
                                }}
                              />
                            </td>

                            {/* OFFER Vol */}
                            <td>
                              <input
                                type="text"
                                value={isTradeable ? q.offerVolume : '—'}
                                disabled={!isTradeable}
                                onChange={e => onCellEdit(q.id, 'offerVolume', e.target.value)}
                                placeholder="—"
                                className="input num"
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  opacity: isTradeable ? 1 : 0.5,
                                }}
                              />
                            </td>

                            {/* Price Provenance */}
                            <td style={{ fontSize: '11.5px' }}>
                              <span style={{ color: 'var(--color-text)' }}>{q.derivedFrom || q.provenanceTier}</span>
                            </td>

                            {/* Reference Mark Toggle */}
                            <td style={{ textAlign: 'center' }}>
                              {isRef ? (
                                <span className="chip chip-warn" style={{ fontSize: '11px', fontWeight: 700 }}>
                                  ★ Active Mark
                                </span>
                              ) : rowFeedsMarket(q, scheme.marketId) && rowHasPrice(q) ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ fontSize: '11px', padding: '1px 6px', minHeight: '22px' }}
                                  onClick={() => {
                                    dispatch({ type: 'SET_MARKET_REFERENCE_ROW', marketId: scheme.marketId, rowId: q.id });
                                    showToast(`Set as ${scheme.marketId} reference mark`);
                                  }}
                                >
                                  Use as mark
                                </button>
                              ) : (
                                <span style={{ color: 'var(--color-muted)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
