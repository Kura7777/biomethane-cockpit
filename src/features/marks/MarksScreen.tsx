import React, { useState } from 'react';
import { MARKETS } from '../../domain/markets/registry';
import { useAppState, exportState, importState } from '../../store/context';
import { StaleIndicator } from '../../shared/components/StaleIndicator';
import { getMarkAgeDays, getMarkStaleness } from '../../domain/markets/types';
import { 
  Coins, 
  Flame, 
  ArrowLeftRight, 
  Download, 
  Upload, 
  Check, 
  Sparkles,
  Clock,
  Info,
  AlertTriangle
} from 'lucide-react';

export function MarksScreen() {
  const { state, dispatch } = useAppState();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleMarkChange = (marketId: string, field: 'bid' | 'offer' | 'mid', valueStr: string) => {
    const val = valueStr === '' ? null : Number(valueStr);
    const existing = state.marks.marks[marketId] || { 
      marketId, 
      bid: null, 
      offer: null, 
      mid: null, 
      updatedAt: null, 
      source: null,
      provenance: {
        sourceType: null,
        sourceName: null,
        sourceUrl: null,
        observedAt: null,
        note: null,
      }
    };
    const updated = { ...existing, [field]: val };

    // Auto-compute mid if bid and offer set
    if (field !== 'mid' && updated.bid !== null && updated.offer !== null) {
      updated.mid = Number(((updated.bid + updated.offer) / 2).toFixed(2));
    }

    const now = new Date().toISOString();
    dispatch({
      type: 'SET_MARK',
      marketId,
      bid: updated.bid,
      offer: updated.offer,
      mid: updated.mid,
      updatedAt: now,
      source: existing.source ?? null,
      provenance: existing.provenance ?? {
        sourceType: null,
        sourceName: null,
        sourceUrl: null,
        observedAt: now,
        note: null,
      },
    });
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
          setSuccessMessage('Successfully migrated and imported marks snapshot!');
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
    <div className="space-y-2 font-sans text-stone-100 pb-16">
      
      {/* Header Bar */}
      <div className="bg-stone-900 border border-stone-800 p-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-teal-400" />
            <h1 className="text-base font-bold text-white font-mono uppercase tracking-tight">
              Desk Marks & Price Ingestion
            </h1>
          </div>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            Manual desk marks with full timestamp tracking and age-based staleness warnings (&gt;7d amber, &gt;30d red).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-800 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs p-2.5 rounded flex items-center gap-2 font-mono">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Gas Molecule & FX Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        
        {/* TTF Gas Index */}
        <div className="bg-stone-900 border border-stone-800 p-2 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              Natural Gas Molecule Index (TTF)
            </span>
            <StaleIndicator updatedAt={state.marks.gasIndex.updatedAt} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-micro text-stone-400 uppercase mb-0.5">Bid (€/MWh)</label>
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
                className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1"
                placeholder="28.00"
              />
            </div>

            <div>
              <label className="block text-micro text-stone-400 uppercase mb-0.5">Offer (€/MWh)</label>
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
                className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1"
                placeholder="29.00"
              />
            </div>

            <div>
              <label className="block text-micro text-stone-400 uppercase mb-0.5">Mid (€/MWh)</label>
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
                className="w-full bg-stone-950 border border-teal-800 rounded px-2 py-1 font-bold text-teal-300"
                placeholder="28.50"
              />
            </div>
          </div>
        </div>

        {/* Foreign Exchange Rates */}
        <div className="bg-stone-900 border border-stone-800 p-2 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-200 flex items-center gap-1.5">
              <ArrowLeftRight className="w-4 h-4 text-teal-400" />
              FX Cross Rates (UK RTFO, Swiss)
            </span>
            <StaleIndicator updatedAt={state.marks.fx.updatedAt} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-micro text-stone-400 uppercase mb-0.5">GBP / EUR (UK RTFO)</label>
              <input
                type="number"
                step="0.001"
                value={state.marks.fx.gbpEur ?? ''}
                onChange={e => dispatch({
                  type: 'SET_FX',
                  currency: 'gbpEur',
                  value: e.target.value === '' ? null : Number(e.target.value),
                })}
                className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 font-bold text-teal-300"
                placeholder="1.180"
              />
            </div>

            <div>
              <label className="block text-micro text-stone-400 uppercase mb-0.5">CHF / EUR</label>
              <input
                type="number"
                step="0.001"
                value={state.marks.fx.chfEur ?? ''}
                onChange={e => dispatch({
                  type: 'SET_FX',
                  currency: 'chfEur',
                  value: e.target.value === '' ? null : Number(e.target.value),
                })}
                className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1"
                placeholder="1.060"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Marks Table */}
      <div className="bg-stone-900 border border-stone-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-stone-950 text-stone-400 uppercase font-semibold text-micro tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-2 px-3">Market</th>
                <th className="py-2 px-3">Unit</th>
                <th className="py-2 px-3 w-28">Bid</th>
                <th className="py-2 px-3 w-28">Offer</th>
                <th className="py-2 px-3 w-28">Mid</th>
                <th className="py-2 px-3 text-center w-28">Age / Status</th>
                <th className="py-2 px-3">Source & Constraints</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-800/80">
              {activeMarkets.map(m => {
                const mark = state.marks.marks[m.id] || { bid: null, offer: null, mid: null, updatedAt: null, source: null };
                return (
                  <tr key={m.id} className="h-6 hover:bg-stone-800 transition-colors">
                    
                    {/* Market */}
                    <td className="py-1.5 px-3 font-semibold text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400">{m.country || 'EU'}</span>
                        <span className="text-stone-100 font-bold">{m.name}</span>
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-1.5 px-3 text-stone-400 text-meta">
                      {m.unitLabel}
                    </td>

                    {/* Bid Input */}
                    <td className="py-1 px-3">
                      <input
                        type="number"
                        step="any"
                        value={mark.bid ?? ''}
                        onChange={e => handleMarkChange(m.id, 'bid', e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-0.5 text-xs text-stone-200 focus:border-teal-500 outline-none"
                        placeholder="Bid"
                      />
                    </td>

                    {/* Offer Input */}
                    <td className="py-1 px-3">
                      <input
                        type="number"
                        step="any"
                        value={mark.offer ?? ''}
                        onChange={e => handleMarkChange(m.id, 'offer', e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-0.5 text-xs text-stone-200 focus:border-teal-500 outline-none"
                        placeholder="Offer"
                      />
                    </td>

                    {/* Mid Input */}
                    <td className="py-1 px-3">
                      <input
                        type="number"
                        step="any"
                        value={mark.mid ?? ''}
                        onChange={e => handleMarkChange(m.id, 'mid', e.target.value)}
                        className="w-full bg-stone-950 border border-teal-800/80 rounded px-1.5 py-0.5 text-xs text-teal-300 font-bold focus:border-teal-500 outline-none"
                        placeholder="Mid"
                      />
                      {mark.bid !== null && mark.offer !== null && mark.bid > mark.offer && (
                        <div className="text-micro text-amber-400 font-bold mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" /> Crossed market: bid exceeds offer
                        </div>
                      )}
                    </td>

                    {/* Age / Staleness Status */}
                    <td className="py-1.5 px-3 text-center">
                      <StaleIndicator updatedAt={mark.updatedAt} />
                    </td>

                    {/* Source & Constraints */}
                    <td className="py-1.5 px-3 text-stone-400 text-micro">
                      {m.ceilingEurMwh && (
                        <span className="text-amber-400 bg-amber-950/80 border border-amber-800 px-1 py-0.5 rounded mr-1">
                          Cap: €{m.ceilingEurMwh}
                        </span>
                      )}
                      <span>{mark.source || m.legalBasis}</span>
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
