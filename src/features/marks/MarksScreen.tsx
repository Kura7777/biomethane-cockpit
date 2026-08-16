import React, { useState } from 'react';
import { MARKETS } from '../../domain/markets/registry';
import { useAppState, exportState, importState } from '../../store/context';
import { StaleIndicator } from '../../shared/components/StaleIndicator';
import { 
  Coins, 
  Flame, 
  ArrowLeftRight, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';

const DEFAULT_INDICATIVE_MARKS: Record<string, { bid: number; offer: number; mid: number }> = {
  DE_THG: { bid: 285, offer: 310, mid: 297.50 },
  NL_ERE: { bid: 0.28, offer: 0.32, mid: 0.30 },
  FR_CPB: { bid: 88, offer: 95, mid: 91.50 },
  FR_TIRUERT: { bid: 110, offer: 125, mid: 117.50 },
  IT_CIC: { bid: 360, offer: 390, mid: 375.00 },
  AT_EGG: { bid: 75, offer: 85, mid: 80.00 },
  SE_TAX: { bid: 65, offer: 72, mid: 68.50 },
  FI_TRANSPORT: { bid: 80, offer: 90, mid: 85.00 },
  BE_TRANSPORT: { bid: 78, offer: 88, mid: 83.00 },
  DK_GO: { bid: 22, offer: 26, mid: 24.00 },
  FUELEU: { bid: 220, offer: 260, mid: 240.00 },
  EU_ETS1: { bid: 68, offer: 74, mid: 71.00 },
  UK_RTFO: { bid: 0.18, offer: 0.22, mid: 0.20 },
  VOL_SCOPE1: { bid: 35, offer: 45, mid: 40.00 },
};

export function MarksScreen() {
  const { state, dispatch } = useAppState();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleMarkChange = (marketId: string, field: 'bid' | 'offer' | 'mid', valueStr: string) => {
    const val = valueStr === '' ? null : Number(valueStr);
    const existing = state.marks.marks[marketId] || { bid: null, offer: null, mid: null };
    const updated = { ...existing, [field]: val };

    // Auto-calculate mid if bid and offer are set
    if (field !== 'mid' && updated.bid !== null && updated.offer !== null) {
      updated.mid = Number(((updated.bid + updated.offer) / 2).toFixed(2));
    }

    dispatch({
      type: 'SET_MARK',
      marketId,
      bid: updated.bid,
      offer: updated.offer,
      mid: updated.mid,
    });
  };

  const handleLoadIndicativeMarks = () => {
    Object.entries(DEFAULT_INDICATIVE_MARKS).forEach(([marketId, m]) => {
      dispatch({
        type: 'SET_MARK',
        marketId,
        bid: m.bid,
        offer: m.offer,
        mid: m.mid,
      });
    });

    dispatch({
      type: 'SET_GAS_INDEX',
      bid: 28.00,
      offer: 29.00,
      mid: 28.50,
    });

    dispatch({
      type: 'SET_FX',
      currency: 'gbpEur',
      value: 1.18,
    });

    setSuccessMessage('Loaded 2026 indicative broker marks and TTF gas marks!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportJSON = () => {
    const json = exportState(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biomethane-desk-marks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const imported = importState(event.target?.result as string);
          dispatch({ type: 'IMPORT_STATE', state: imported });
          setSuccessMessage('Successfully imported marks state!');
          setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
          alert('Invalid JSON marks file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* Top Header Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <Coins className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-stone-900">Market Marks & Price Feeds</h1>
          </div>
          <p className="text-stone-600 text-sm mt-1">
            Manual desk marks ingestion. Persisted locally in browser storage. Ready for API feed swap without touching the calculation engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadIndicativeMarks}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load 2026 Broker Marks
          </button>

          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-3.5 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Gas Index & Foreign Exchange Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* TTF Gas Index */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              Natural Gas Molecule Benchmark (TTF / Hub)
            </h3>
            <span className="text-xs font-mono text-stone-500">€/MWh</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">Bid (€/MWh)</label>
              <input
                type="number"
                step="0.1"
                value={state.marks.gasIndex.bid ?? ''}
                onChange={e => dispatch({
                  type: 'SET_GAS_INDEX',
                  bid: e.target.value === '' ? null : Number(e.target.value),
                  offer: state.marks.gasIndex.offer,
                  mid: state.marks.gasIndex.mid,
                })}
                className="w-full text-sm font-mono border border-stone-300 rounded-lg p-2"
                placeholder="28.00"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">Offer (€/MWh)</label>
              <input
                type="number"
                step="0.1"
                value={state.marks.gasIndex.offer ?? ''}
                onChange={e => dispatch({
                  type: 'SET_GAS_INDEX',
                  bid: state.marks.gasIndex.bid,
                  offer: e.target.value === '' ? null : Number(e.target.value),
                  mid: state.marks.gasIndex.mid,
                })}
                className="w-full text-sm font-mono border border-stone-300 rounded-lg p-2"
                placeholder="29.00"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">Mid (€/MWh)</label>
              <input
                type="number"
                step="0.1"
                value={state.marks.gasIndex.mid ?? ''}
                onChange={e => dispatch({
                  type: 'SET_GAS_INDEX',
                  bid: state.marks.gasIndex.bid,
                  offer: state.marks.gasIndex.offer,
                  mid: e.target.value === '' ? null : Number(e.target.value),
                })}
                className="w-full text-sm font-mono font-bold text-teal-800 bg-teal-50/50 border border-teal-200 rounded-lg p-2"
                placeholder="28.50"
              />
            </div>
          </div>
        </div>

        {/* Foreign Exchange Rates */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-teal-700" />
              FX Rates for Non-EUR Markets (UK RTFO, Swiss)
            </h3>
            <span className="text-xs font-mono text-stone-500">Cross Rates</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">GBP / EUR (RTFO)</label>
              <input
                type="number"
                step="0.001"
                value={state.marks.fx.gbpEur ?? ''}
                onChange={e => dispatch({
                  type: 'SET_FX',
                  currency: 'gbpEur',
                  value: e.target.value === '' ? null : Number(e.target.value),
                })}
                className="w-full text-sm font-mono border border-stone-300 rounded-lg p-2"
                placeholder="1.180"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">CHF / EUR</label>
              <input
                type="number"
                step="0.001"
                value={state.marks.fx.chfEur ?? ''}
                onChange={e => dispatch({
                  type: 'SET_FX',
                  currency: 'chfEur',
                  value: e.target.value === '' ? null : Number(e.target.value),
                })}
                className="w-full text-sm font-mono border border-stone-300 rounded-lg p-2"
                placeholder="1.060"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Compliance Market Marks Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-stone-900">Active European Compliance Certificate Marks</h3>
            <p className="text-xs text-stone-500">
              Enter indicative Bid, Offer, or Mid marks. Mid is automatically computed from Bid and Offer.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 uppercase font-semibold text-[11px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Market</th>
                <th className="py-3 px-4">Legal Scheme</th>
                <th className="py-3 px-4">Unit of Account</th>
                <th className="py-3 px-4 w-28">Bid</th>
                <th className="py-3 px-4 w-28">Offer</th>
                <th className="py-3 px-4 w-32 font-bold">Mid Mark</th>
                <th className="py-3 px-4">Notes & Ceilings</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200/80">
              {activeMarkets.map(m => {
                const mark = state.marks.marks[m.id] || { bid: null, offer: null, mid: null };
                return (
                  <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                    
                    {/* Market Name */}
                    <td className="py-3.5 px-4 font-semibold text-sm">
                      <div className="flex items-center gap-2">
                        <span>{m.country || '🇪🇺'}</span>
                        <span className="text-stone-900">{m.name}</span>
                      </div>
                    </td>

                    {/* Legal basis */}
                    <td className="py-3.5 px-4 text-stone-600 font-mono text-[11px]">
                      {m.legalBasis}
                    </td>

                    {/* Unit */}
                    <td className="py-3.5 px-4 font-mono text-stone-700 font-medium">
                      {m.unitLabel}
                    </td>

                    {/* Bid Input */}
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        step="any"
                        value={mark.bid ?? ''}
                        onChange={e => handleMarkChange(m.id, 'bid', e.target.value)}
                        className="w-full text-xs font-mono border border-stone-300 rounded-md p-1.5 bg-white focus:ring-1 focus:ring-teal-500"
                        placeholder="Bid"
                      />
                    </td>

                    {/* Offer Input */}
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        step="any"
                        value={mark.offer ?? ''}
                        onChange={e => handleMarkChange(m.id, 'offer', e.target.value)}
                        className="w-full text-xs font-mono border border-stone-300 rounded-md p-1.5 bg-white focus:ring-1 focus:ring-teal-500"
                        placeholder="Offer"
                      />
                    </td>

                    {/* Mid Input */}
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        step="any"
                        value={mark.mid ?? ''}
                        onChange={e => handleMarkChange(m.id, 'mid', e.target.value)}
                        className="w-full text-xs font-mono font-bold text-teal-900 bg-teal-50/40 border border-teal-300 rounded-md p-1.5 focus:ring-1 focus:ring-teal-500"
                        placeholder="Mid"
                      />
                    </td>

                    {/* Special notes & hard ceilings */}
                    <td className="py-3.5 px-4 text-stone-500 text-xs">
                      {m.ceilingEurMwh && (
                        <span className="text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                          Hard Cap: €{m.ceilingEurMwh}/MWh
                        </span>
                      )}
                      {m.id === 'DE_THG' && (
                        <span className="text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] ml-1">
                          Double Count Unresolved
                        </span>
                      )}
                      {m.notes && !m.ceilingEurMwh && m.id !== 'DE_THG' && (
                        <span className="text-[11px]">{m.notes}</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
