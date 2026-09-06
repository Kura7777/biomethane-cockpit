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
    <div className="flex-1 flex flex-col min-h-0 bg-[#08090d] font-sans p-4 space-y-4 overflow-y-auto">
      {/* Header bar: Selector & Key Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0e1118] border border-[#1e2433] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-zinc-100 uppercase tracking-wider">
                Multi-Year Forward Term Structure (Cal-2026 → Cal-2030)
              </h2>
              <span className="text-micro font-mono px-2 py-0.5 rounded bg-[#141824] border border-[#1e2433] text-zinc-300">
                RED III Transport &amp; Gas Curves
              </span>
            </div>
            <p className="text-micro font-mono text-zinc-400">
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
              className={`px-2.5 py-1 text-micro font-mono font-semibold rounded cursor-pointer transition-colors ${
                selectedCommodity === opt.id
                  ? 'bg-[#141824] text-cyan-300 font-bold border border-cyan-500/50 shadow-xs'
                  : 'bg-[#0e1118] border border-[#1e2433] text-zinc-400 hover:text-zinc-200 hover:bg-[#141824]/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active Commodity Base */}
        <div className="p-3 bg-[#0e1118] border border-[#1e2433] rounded-lg font-mono">
          <div className="text-micro text-zinc-400 uppercase tracking-wider">Prompt (Cal-2026 Mid)</div>
          <div className="text-lg font-bold text-zinc-100 mt-0.5">
            {currentCurve.tenors.CAL_2026.mid.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)}{' '}
            <span className="text-xs font-normal text-zinc-400">{currentCurve.unit}</span>
          </div>
          <div className="text-micro text-zinc-500 mt-1">
            Bid: {currentCurve.tenors.CAL_2026.bid.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)} · Ask:{' '}
            {currentCurve.tenors.CAL_2026.offer.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)}
          </div>
        </div>

        {/* Cal-2030 Long-Term Horizon */}
        <div className="p-3 bg-[#0e1118] border border-[#1e2433] rounded-lg font-mono">
          <div className="text-micro text-zinc-400 uppercase tracking-wider">Long-Term (Cal-2030 Mid)</div>
          <div className="text-lg font-bold text-cyan-400 mt-0.5">
            {currentCurve.tenors.CAL_2030.mid.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)}{' '}
            <span className="text-xs font-normal text-zinc-400">{currentCurve.unit}</span>
          </div>
          <div className="text-micro text-zinc-500 mt-1">
            Quoted Horizon: 5 Cal Years (2026–2030)
          </div>
        </div>

        {/* Term Structure Slope */}
        <div className="p-3 bg-[#0e1118] border border-[#1e2433] rounded-lg font-mono">
          <div className="text-micro text-zinc-400 uppercase tracking-wider">Term Structure Slope</div>
          <div className="flex items-center gap-2 mt-0.5">
            {currentCurve.slope === 'CONTANGO' ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold text-sm bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/40">
                <TrendingUp className="w-4 h-4" />
                <span>CONTANGO (+{currentCurve.slopePct}%)</span>
              </span>
            ) : currentCurve.slope === 'BACKWARDATION' ? (
              <span className="flex items-center gap-1 text-amber-400 font-bold text-sm bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/40">
                <TrendingDown className="w-4 h-4" />
                <span>BACKWARDATION ({currentCurve.slopePct}%)</span>
              </span>
            ) : (
                <span className="text-zinc-300 font-bold text-sm bg-[#141824] px-2 py-0.5 rounded">
                FLAT (0.0%)
              </span>
            )}
          </div>
          <div className="text-micro text-zinc-500 mt-1">
            {currentCurve.slope === 'CONTANGO'
              ? 'Forward premium reflecting mandate tightening'
              : 'Forward discount on supply expansion'}
          </div>
        </div>

        {/* Seasonal Winter Spread */}
        <div className="p-3 bg-[#0e1118] border border-[#1e2433] rounded-lg font-mono">
          <div className="text-micro text-zinc-400 uppercase tracking-wider">Seasonal Shape (Winter vs Summer)</div>
          <div className="text-lg font-bold text-cyan-300 mt-0.5 flex items-center gap-2">
            <span>
              +
              {calculateSeasonalSpread(
                currentCurve.tenors.CAL_2026.winterPrice,
                currentCurve.tenors.CAL_2026.summerPrice
              ).toFixed(2)}{' '}
              <span className="text-xs font-normal text-zinc-400">{currentCurve.unit}</span>
            </span>
          </div>
          <div className="text-micro text-zinc-500 mt-1 flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-amber-300">
              <Sun className="w-3 h-3" /> Summer: {currentCurve.tenors.CAL_2026.summerPrice.toFixed(2)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5 text-cyan-300">
              <Snowflake className="w-3 h-3" /> Winter: {currentCurve.tenors.CAL_2026.winterPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Term Structure Bar / Curve Graphic */}
      <div className="p-4 bg-[#0e1118] border border-[#1e2433] rounded-lg font-mono">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wide">
              Forward Curve Trajectory: {currentCurve.marketName}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-micro text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-cyan-500" /> Mid Quote
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-amber-500/60" /> Summer (Q2/Q3)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-cyan-400/60" /> Winter (Q1/Q4)
            </span>
          </div>
        </div>

        {/* Visual Bar Columns */}
        <div className="grid grid-cols-5 gap-3 pt-2 pb-2">
          {currentCurve.tenorList.map(t => {
            const heightPct = Math.max(15, Math.min(100, ((t.mid - minPrice) / priceRange) * 80 + 20));
            return (
              <div key={t.tenor} className="flex flex-col items-center bg-[#08090d] p-2.5 rounded border border-[#1e2433]">
                <div className="text-micro font-bold text-zinc-300 mb-1">{t.tenor.replace('_', '-')}</div>
                <div className="text-xs font-bold text-cyan-400 mb-2">
                  €{t.mid.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)}
                </div>

                {/* Vertical Bar Container */}
                <div className="w-full h-28 bg-[#141824] rounded flex items-end justify-center p-1 relative overflow-hidden">
                  <div
                    className="w-8 bg-gradient-to-t from-cyan-700 to-cyan-400 rounded-t transition-all duration-300 relative group"
                    style={{ height: `${heightPct}%` }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#0e1118] text-zinc-100 text-[10px] p-1.5 rounded shadow-lg border border-[#2b3347] whitespace-nowrap z-20">
                      <div>Summer: €{t.summerPrice.toFixed(2)}</div>
                      <div>Winter: €{t.winterPrice.toFixed(2)}</div>
                      <div>Obligation: {t.statutoryObligationPct}%</div>
                    </div>
                  </div>
                </div>

                {/* Seasonal Sub-Quotes */}
                <div className="w-full grid grid-cols-2 gap-1 mt-2 text-[10px] text-center border-t border-[#1e2433] pt-1.5">
                  <div className="text-amber-400/90 font-mono">
                    <Sun className="w-2.5 h-2.5 inline mr-0.5" />
                    {t.summerPrice.toFixed(currentCurve.unit === 'EUR/kg' ? 2 : 1)}
                  </div>
                  <div className="text-cyan-400/90 font-mono">
                    <Snowflake className="w-2.5 h-2.5 inline mr-0.5" />
                    {t.winterPrice.toFixed(currentCurve.unit === 'EUR/kg' ? 2 : 1)}
                  </div>
                </div>

                {t.statutoryObligationPct > 0 && (
                  <div className="text-[10px] text-emerald-400 mt-1 font-mono font-semibold">
                    {t.statutoryObligationPct}% Quota
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tenor Detail Table & Statutory Tightening Footnotes */}
      <div className="p-4 bg-[#0e1118] border border-[#1e2433] rounded-lg font-mono">
        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-amber-400" />
          <span>Statutory Obligation Escalators &amp; Tenor Specifications</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300 border-collapse">
            <thead>
              <tr className="border-b border-[#1e2433] text-micro text-zinc-400 uppercase bg-[#08090d]">
                <th className="p-2">Tenor</th>
                <th className="p-2">Calendar Year</th>
                <th className="p-2">Forward Mid</th>
                <th className="p-2">Bid / Ask</th>
                <th className="p-2">Summer (Q2/Q3)</th>
                <th className="p-2">Winter (Q1/Q4)</th>
                <th className="p-2">Mandate Quota</th>
                <th className="p-2">Escalator Trajectory</th>
                <th className="p-2">Statutory / Regulatory Driver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2433]">
              {currentCurve.tenorList.map(quote => (
                <tr key={quote.tenor} className="hover:bg-[#141824]/60 transition-colors">
                  <td className="p-2 font-bold text-zinc-100">{quote.tenor.replace('_', '-')}</td>
                  <td className="p-2 text-zinc-300">{quote.year}</td>
                  <td className="p-2 font-bold text-cyan-400">
                    {quote.mid.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)} {currentCurve.unit}
                  </td>
                  <td className="p-2 text-zinc-400">
                    {quote.bid.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)} /{' '}
                    {quote.offer.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)}
                  </td>
                  <td className="p-2 text-amber-300">
                    {quote.summerPrice.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)}
                  </td>
                  <td className="p-2 text-cyan-300">
                    {quote.winterPrice.toFixed(currentCurve.unit === 'EUR/kg' ? 3 : 2)}
                  </td>
                  <td className="p-2 font-semibold text-zinc-200">
                    {quote.statutoryObligationPct > 0 ? `${quote.statutoryObligationPct}%` : '—'}
                  </td>
                  <td className="p-2">
                    {quote.quotaEscalatorPct > 0 ? (
                      <span className="text-emerald-400 font-bold">+{quote.quotaEscalatorPct}%</span>
                    ) : quote.quotaEscalatorPct < 0 ? (
                      <span className="text-amber-400 font-bold">{quote.quotaEscalatorPct}%</span>
                    ) : (
                      <span className="text-zinc-400">Baseline (0%)</span>
                    )}
                  </td>
                  <td className="p-2 text-micro text-zinc-400 max-w-xs">{quote.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
