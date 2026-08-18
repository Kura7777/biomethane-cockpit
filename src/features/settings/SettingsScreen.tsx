import React, { useState, useEffect } from 'react';
import { useAppState } from '../../store/context';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';

export function SettingsScreen() {
  const { state, dispatch } = useAppState();

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSaveSettings = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="flex-1 min-h-0 min-w-[1400px] overflow-y-auto bg-stone-950 font-sans p-6 text-stone-100">
      <div className="max-w-[880px] mx-auto flex flex-col gap-6">
        
        {/* Page Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h1 className="m-0 font-mono text-lg font-semibold tracking-[0.12em] uppercase text-stone-100">
              Desk Settings
            </h1>
            <p className="m-0 text-xs text-stone-400 mt-1">
              Desk trading defaults, pricing side, and state import / export.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold tracking-[0.08em] uppercase cursor-pointer rounded-xs transition-colors"
          >
            {saveSuccess ? '✓ Settings Saved' : 'Save Changes'}
          </button>
        </div>

        {/* SECTION 2: DESK TRADING DEFAULTS */}
        <div className="bg-stone-900 border border-stone-800 rounded-xs p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="m-0 font-mono text-sm font-semibold tracking-[0.1em] text-stone-100 uppercase">
              Trading Desk Parameters & Defaults
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
                Pricing Side Mode
              </span>
              <span className="font-mono font-num text-sm font-bold text-teal-300 uppercase mt-1">
                {state.marks.pricingSides.certificateSide.toUpperCase()} SIDE
              </span>
              <span className="text-micro text-stone-500">
                Controls whether netbacks evaluate off Bid, Mid, or Offer marks across all screens.
              </span>
            </div>

            <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
                Active Benchmark Origin
              </span>
              <span className="font-mono font-num text-sm font-bold text-stone-100 mt-1">
                {state.consignments.find(c => c.id === state.activeConsignmentId)?.originCountry || 'DK'} ({PRODUCING_ORIGINS[state.consignments.find(c => c.id === state.activeConsignmentId)?.originCountry || 'DK']?.countryName || 'Denmark'})
              </span>
              <span className="text-micro text-stone-500">
                Default production origin loaded on opportunity scanner and trade tickets.
              </span>
            </div>

            <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
                Regulatory Framework
              </span>
              <span className="font-mono font-num text-sm font-bold text-stone-100 mt-1">
                RED III / UDB 2026
              </span>
              <span className="text-micro text-stone-500">
                Directive (EU) 2023/2413 statutory rules and Union Database mass balance gates.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM DIAGNOSTICS & EXPORTS */}
        <div className="bg-stone-900 border border-stone-800 rounded-xs p-5 flex flex-col gap-3">
          <h2 className="m-0 font-mono text-sm font-semibold tracking-[0.1em] text-stone-100 uppercase">
            Data Snapshots & Maintenance
          </h2>
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-semibold text-stone-200">Export Desk Snapshot</div>
              <div className="text-micro text-stone-500">Download current marks and custom costs as JSON</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const data = {
                  marks: state.marks,
                  costs: state.costs,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `biomethane-desk-settings-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 font-mono text-micro font-semibold uppercase rounded-xs cursor-pointer"
            >
              Export JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
