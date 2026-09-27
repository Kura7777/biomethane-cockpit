import React, { useState, useMemo } from 'react';
import { useAppState } from '../../store/context';
import {
  generateForwardCurves,
  MARKET_METADATA,
  calculateSeasonalSpread,
} from '../../domain/curves/engine';
import { CurveMarketType, ForwardTenor } from '../../domain/curves/types';
import {
  TrendingUp,
  TrendingDown,
  Sun,
  Snowflake,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ForwardCurvesPanelProps {
  initialCommodity?: CurveMarketType;
}

export function ForwardCurvesPanel({ initialCommodity = 'TTF_GAS' }: ForwardCurvesPanelProps) {
  const { state } = useAppState();
  const [selectedCommodity, setSelectedCommodity] = useState<CurveMarketType>(initialCommodity);

  const forwardBook = useMemo(() => {
    return generateForwardCurves(state.marks);
  }, [state.marks]);

  const currentCurve = forwardBook.curves[selectedCommodity];
  const ttfCurve = forwardBook.ttfGasCurve;

  const commodityOptions: { id: CurveMarketType; label: string; group: string }[] = [
    { id: 'TTF_GAS', label: 'TTF Gas Forward', group: 'Gas Hubs' },
    { id: 'DE_THG', label: 'DE THG-Quote', group: 'Transport Quotas' },
    { id: 'NL_ERE', label: 'NL ERE / HBE', group: 'Transport Quotas' },
    { id: 'FR_CPB', label: 'FR CPB (TIRUERT)', group: 'Transport Quotas' },
    { id: 'UK_RTFO', label: 'UK RTFO', group: 'Transport Quotas' },
    { id: 'FUELEU', label: 'FuelEU Maritime', group: 'Transport Quotas' },
    { id: 'GO_DE', label: 'Germany GO', group: 'Guarantees of Origin' },
    { id: 'GO_NL', label: 'Netherlands GO', group: 'Guarantees of Origin' },
    { id: 'GO_FR', label: 'France GO', group: 'Guarantees of Origin' },
    { id: 'VOL_SCOPE1', label: 'Voluntary Scope 1', group: 'Guarantees of Origin' },
  ];

  // Min and max for visual curve scaling
  const minPrice = useMemo(() => {
    return Math.min(...currentCurve.tenorList.map(t => Math.min(t.summerPrice, t.mid)));
  }, [currentCurve]);

  const maxPrice = useMemo(() => {
    return Math.max(...currentCurve.tenorList.map(t => Math.max(t.winterPrice, t.mid)));
  }, [currentCurve]);

  const priceRange = maxPrice - minPrice || 1;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
      }}
      className="flex-1 flex flex-col min-h-0 p-4 space-y-4 overflow-y-auto"
    >
      {/* Header bar: Selector & Key Stats */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
        }}
        className="flex flex-wrap items-center justify-between gap-3 p-3.5 border shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: 'var(--color-track)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--color-pnl-pos)',
            }}
            className="w-9 h-9 border flex items-center justify-center"
          >
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 style={{ color: 'var(--color-text)' }} className="text-sm font-semibold">
                Multi-year forward term structure (Cal-2026 → Cal-2030)
              </h2>
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-track)',
                  borderColor: 'var(--color-line)',
                  color: 'var(--color-muted)',
                }}
                className="text-[11px] px-2 py-0.5 border font-medium"
              >
                RED III transport &amp; gas curves
              </span>
            </div>
            <p style={{ color: 'var(--color-muted)' }} className="text-xs">
              Contango/backwardation dynamics with seasonal Summer/Winter spreads and statutory quota step-up escalators
            </p>
          </div>
        </div>

        {/* Commodity Selector Dropdown / Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {commodityOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedCommodity(opt.id)}
              style={{
                borderRadius: 'var(--radius-control)',
                backgroundColor: selectedCommodity === opt.id ? 'var(--color-text)' : 'var(--color-surface)',
                color: selectedCommodity === opt.id ? 'var(--color-bg)' : 'var(--color-text)',
                borderColor: 'var(--color-line)',
              }}
              className="px-2.5 py-1 text-xs border font-medium cursor-pointer transition-colors shadow-2xs"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active Commodity Base */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-card)',
          }}
          className="p-3.5 border shadow-xs"
        >
          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] font-medium">Prompt (Cal-2026 mid)</div>
          <div style={{ color: 'var(--color-text)' }} className="text-lg font-bold tabular-nums mt-0.5">
            {currentCurve.tenors.CAL_2026.mid.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}{' '}
            <span style={{ color: 'var(--color-muted)' }} className="text-xs font-normal">{currentCurve.unit}</span>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] tabular-nums mt-1">
            Bid: {currentCurve.tenors.CAL_2026.bid.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)} · Ask:{' '}
            {currentCurve.tenors.CAL_2026.offer.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}
          </div>
        </div>

        {/* Cal-2030 Long-Term Horizon */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-card)',
          }}
          className="p-3.5 border shadow-xs"
        >
          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] font-medium">Long-term (Cal-2030 mid)</div>
          <div style={{ color: 'var(--color-pnl-pos)' }} className="text-lg font-bold tabular-nums mt-0.5">
            {currentCurve.tenors.CAL_2030.mid.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}{' '}
            <span style={{ color: 'var(--color-muted)' }} className="text-xs font-normal">{currentCurve.unit}</span>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] mt-1">
            Quoted horizon: 5 Cal years (2026–2030)
          </div>
        </div>

        {/* Term Structure Slope */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-card)',
          }}
          className="p-3.5 border shadow-xs"
        >
          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] font-medium">Term structure slope</div>
          <div className="flex items-center gap-2 mt-0.5">
            {currentCurve.slope === 'CONTANGO' ? (
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-status-info-bg)',
                  borderColor: 'var(--color-status-info-border)',
                  color: 'var(--color-pnl-pos)',
                }}
                className="flex items-center gap-1 font-semibold text-xs border px-2 py-0.5"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>CONTANGO (+{currentCurve.slopePct}%)</span>
              </span>
            ) : currentCurve.slope === 'BACKWARDATION' ? (
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-status-warn-bg)',
                  borderColor: 'var(--color-status-warn-border)',
                  color: 'var(--color-status-warn-ink)',
                }}
                className="flex items-center gap-1 font-semibold text-xs border px-2 py-0.5"
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>BACKWARDATION ({currentCurve.slopePct}%)</span>
              </span>
            ) : (
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-track)',
                  borderColor: 'var(--color-line)',
                  color: 'var(--color-text)',
                }}
                className="font-medium text-xs border px-2 py-0.5"
              >
                FLAT (0.0%)
              </span>
            )}
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] mt-1">
            {currentCurve.slope === 'CONTANGO'
              ? 'Forward premium reflecting mandate tightening'
              : 'Forward discount on supply expansion'}
          </div>
        </div>

        {/* Seasonal Winter Spread */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-card)',
          }}
          className="p-3.5 border shadow-xs"
        >
          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] font-medium">Seasonal shape (winter vs summer)</div>
          <div style={{ color: 'var(--color-pnl-pos)' }} className="text-lg font-bold tabular-nums mt-0.5 flex items-center gap-2">
            <span>
              +
              {calculateSeasonalSpread(
                currentCurve.tenors.CAL_2026.winterPrice,
                currentCurve.tenors.CAL_2026.summerPrice
              ).toFixed(2)}{' '}
              <span style={{ color: 'var(--color-muted)' }} className="text-xs font-normal">{currentCurve.unit}</span>
            </span>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] tabular-nums mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-amber-500">
              <Sun className="w-3 h-3" /> Summer: {currentCurve.tenors.CAL_2026.summerPrice.toFixed(2)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-blue-500">
              <Snowflake className="w-3 h-3" /> Winter: {currentCurve.tenors.CAL_2026.winterPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Term Structure Bar / Curve Graphic */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
        }}
        className="p-4 border shadow-xs"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar style={{ color: 'var(--color-pnl-pos)' }} className="w-4 h-4" />
            <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">
              Forward curve trajectory: {currentCurve.marketName}
            </h3>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[var(--color-pnl-pos)]" /> Mid quote
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/70" /> Summer (Q2/Q3)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-500/70" /> Winter (Q1/Q4)
            </span>
          </div>
        </div>

        {/* Visual Bar Columns */}
        <div className="grid grid-cols-5 gap-3 pt-2 pb-2">
          {currentCurve.tenorList.map(t => {
            const heightPct = Math.max(15, Math.min(100, ((t.mid - minPrice) / priceRange) * 80 + 20));
            return (
              <div
                key={t.tenor}
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                }}
                className="flex flex-col items-center p-2.5 border shadow-2xs"
              >
                <div style={{ color: 'var(--color-muted)' }} className="text-[11px] font-semibold mb-1">{t.tenor.replace('_', '-')}</div>
                <div style={{ color: 'var(--color-pnl-pos)' }} className="text-xs font-bold tabular-nums mb-2">
                  {t.mid.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}
                </div>

                {/* Vertical Bar Container */}
                <div
                  style={{
                    backgroundColor: 'var(--color-track)',
                    borderRadius: 'var(--radius-control)',
                  }}
                  className="w-full h-28 flex items-end justify-center p-1 relative overflow-hidden"
                >
                  <div
                    className="w-8 rounded-t transition-all duration-300 relative group"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: 'var(--color-pnl-pos)',
                    }}
                  >
                    {/* Tooltip on hover */}
                    <div
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-line)',
                        color: 'var(--color-text)',
                        borderRadius: 'var(--radius-control)',
                      }}
                      className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block text-[10px] p-1.5 shadow-lg border whitespace-nowrap z-20"
                    >
                      <div>Summer: {t.summerPrice.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}</div>
                      <div>Winter: {t.winterPrice.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}</div>
                      <div>Obligation: {t.statutoryObligationPct}%</div>
                    </div>
                  </div>
                </div>

                {/* Seasonal Sub-Quotes */}
                <div
                  style={{ borderColor: 'var(--color-line)' }}
                  className="w-full grid grid-cols-2 gap-1 mt-2 text-[10px] text-center border-t pt-1.5 tabular-nums"
                >
                  <div className="text-amber-600 dark:text-amber-400">
                    <Sun className="w-2.5 h-2.5 inline mr-0.5" />
                    {t.summerPrice.toFixed(Math.max(1, MARKET_METADATA[currentCurve.marketId].decimals - 1))}
                  </div>
                  <div className="text-blue-600 dark:text-blue-400">
                    <Snowflake className="w-2.5 h-2.5 inline mr-0.5" />
                    {t.winterPrice.toFixed(Math.max(1, MARKET_METADATA[currentCurve.marketId].decimals - 1))}
                  </div>
                </div>

                {t.statutoryObligationPct > 0 && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-status-pass-bg)',
                      borderColor: 'var(--color-status-pass-border)',
                      color: 'var(--color-status-pass-ink)',
                      borderRadius: 'var(--radius-control)',
                    }}
                    className="text-[10px] mt-1 px-1.5 py-0.5 border font-semibold tabular-nums"
                  >
                    {t.statutoryObligationPct}% Quota
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tenor Detail Table & Statutory Tightening Footnotes */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
        }}
        className="p-4 border shadow-xs"
      >
        <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-amber-500" />
          <span>Statutory obligation escalators &amp; tenor specifications</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                style={{
                  borderBottomColor: 'var(--color-line)',
                  backgroundColor: 'var(--color-track)',
                  color: 'var(--color-muted)',
                }}
                className="border-b text-[11px] font-medium"
              >
                <th className="p-2">Tenor</th>
                <th className="p-2">Calendar year</th>
                <th className="p-2">Forward mid</th>
                <th className="p-2">Bid / ask</th>
                <th className="p-2">Summer (Q2/Q3)</th>
                <th className="p-2">Winter (Q1/Q4)</th>
                <th className="p-2">Mandate quota</th>
                <th className="p-2">Escalator trajectory</th>
                <th className="p-2">Statutory / regulatory driver</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: 'var(--color-line)' }} className="divide-y divide-[var(--color-line)]">
              {currentCurve.tenorList.map(quote => (
                <tr
                  key={quote.tenor}
                  className="hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td style={{ color: 'var(--color-text)' }} className="p-2 font-semibold">{quote.tenor.replace('_', '-')}</td>
                  <td style={{ color: 'var(--color-muted)' }} className="p-2 tabular-nums">{quote.year}</td>
                  <td style={{ color: 'var(--color-pnl-pos)' }} className="p-2 font-semibold tabular-nums">
                    {quote.mid.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)} {currentCurve.unit}
                  </td>
                  <td style={{ color: 'var(--color-muted)' }} className="p-2 tabular-nums">
                    {quote.bid.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)} /{' '}
                    {quote.offer.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}
                  </td>
                  <td className="p-2 text-amber-600 dark:text-amber-400 tabular-nums">
                    {quote.summerPrice.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}
                  </td>
                  <td className="p-2 text-blue-600 dark:text-blue-400 tabular-nums">
                    {quote.winterPrice.toFixed(MARKET_METADATA[currentCurve.marketId].decimals)}
                  </td>
                  <td style={{ color: 'var(--color-text)' }} className="p-2 font-medium tabular-nums">
                    {quote.statutoryObligationPct > 0 ? `${quote.statutoryObligationPct}%` : '—'}
                  </td>
                  <td className="p-2 tabular-nums">
                    {quote.quotaEscalatorPct > 0 ? (
                      <span style={{ color: 'var(--color-pnl-pos)' }} className="font-semibold">+{quote.quotaEscalatorPct}%</span>
                    ) : quote.quotaEscalatorPct < 0 ? (
                      <span style={{ color: 'var(--color-pnl-neg)' }} className="font-semibold">{quote.quotaEscalatorPct}%</span>
                    ) : (
                      <span style={{ color: 'var(--color-muted)' }}>Baseline (0%)</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-muted)' }} className="p-2 text-[11px] max-w-xs">{quote.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
