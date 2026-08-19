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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-700 flex items-center justify-center text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-stone-100 flex items-center gap-2">
                <span>Live Market Marks &amp; News Pricing</span>
                {savedMessage && (
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded animate-pulse">
                    ✓ {savedMessage}
                  </span>
                )}
              </h2>
              <p className="font-mono text-micro text-stone-400">
                Adjust wholesale gas, national certificate quotas, and FX rates to immediately re-price all deals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Pricing Side Selector */}
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded p-0.5">
              <span className="font-mono text-micro text-stone-400 uppercase font-semibold px-1.5">
                Side:
              </span>
              {(['bid', 'mid', 'offer'] as PriceSide[]).map(side => (
                <button
                  key={side}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PRICING_SIDE', side })}
                  className={`px-2 py-0.5 font-mono text-micro uppercase font-bold rounded transition-colors cursor-pointer ${
                    currentSide === side
                      ? 'bg-teal-600 text-stone-950'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 font-mono text-xs text-stone-300 bg-stone-900">
          {/* Top Indices: TTF Natural Gas & FX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TTF Natural Gas */}
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-stone-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Wholesale Gas Index (TTF M+1)
                </span>
                <span className="text-micro text-stone-500">Benchmark Molecule</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.10"
                    value={gasIndexInput}
                    onChange={e => setGasIndexInput(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 font-bold text-sm focus:outline-hidden focus:border-teal-500"
                  />
                  <span className="absolute right-3 top-2.5 text-stone-400 text-xs">€/MWh</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveGasIndex}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
              <span className="text-[10px] text-stone-500 block mt-1.5">
                Current Mid: €{state.marks.gasIndex.mid?.toFixed(2)}/MWh · Bid: €{state.marks.gasIndex.bid?.toFixed(2)} · Offer: €{state.marks.gasIndex.offer?.toFixed(2)}
              </span>
            </div>

            {/* GBP / EUR FX Rate */}
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-stone-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-teal-400" />
                  GBP / EUR Foreign Exchange
                </span>
                <span className="text-micro text-stone-500">UK RTFO Conversion</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.005"
                    value={fxInput}
                    onChange={e => setFxInput(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 font-bold text-sm focus:outline-hidden focus:border-teal-500"
                  />
                  <span className="absolute right-3 top-2.5 text-stone-400 text-xs">Rate</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveFx}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
              <span className="text-[10px] text-stone-500 block mt-1.5">
                Current Exchange Rate: £1.00 = €{state.marks.fx.gbpEur?.toFixed(3)}
              </span>
            </div>
          </div>

          {/* National Green Compliance Certificate Quotas */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                National Compliance Certificate Marks (RED III Quotas)
              </span>
              <span className="text-micro text-stone-500">
                Adjust levels directly below based on broker runs or news
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-[10px] text-stone-500 uppercase">
                    <th className="py-2">Market &amp; Territory</th>
                    <th className="py-2">Quota Unit</th>
                    <th className="py-2 text-right w-44">Adjust Mid Level</th>
                    <th className="py-2 text-right">Effective Side ({currentSide.toUpperCase()})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-xs">
                  {activeMarkets.map(m => {
                    const mark = state.marks.marks[m.id];
                    const midVal = mark?.mid ?? '';
                    const effectiveVal = mark ? mark[currentSide] ?? mark.mid : null;

                    return (
                      <tr key={m.id} className="hover:bg-stone-900/50">
                        <td className="py-2.5 pr-2">
                          <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                            <span>{m.name}</span>
                          </div>
                          <span className="text-[10px] text-stone-500">{m.countryName} ({m.id})</span>
                        </td>

                        <td className="py-2.5 text-stone-300">
                          <span>{m.unitLabel}</span>
                          <span className="text-[10px] text-teal-400 block">{m.registry || 'National Register'}</span>
                        </td>

                        <td className="py-2.5 text-right pr-2">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step={m.id === 'NL_ERE' || m.id === 'UK_RTFO' ? '0.01' : '1'}
                              value={midVal !== null ? midVal : ''}
                              onChange={e => handleMarkChange(m.id, e.target.value)}
                              placeholder="Unset"
                              className="w-28 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-right text-stone-100 font-bold text-xs focus:outline-hidden focus:border-teal-500"
                            />
                          </div>
                        </td>

                        <td className="py-2.5 text-right font-bold text-teal-300">
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
        <div className="p-3 border-t border-stone-800 flex items-center justify-between bg-stone-950 text-stone-500 font-mono text-micro">
          <span>All modified prices immediately update all sourcing calculations &amp; margin waterfalls.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-stone-950 font-bold transition-colors cursor-pointer"
          >
            Apply &amp; Return to Map
          </button>
        </div>
      </div>
    </div>
  );
}
