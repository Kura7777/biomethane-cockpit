import React from 'react';
import { MARKETS } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { ClientRequest } from '../../domain/arbitrage/types';
import { 
  Building2, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Step1OrderIntakeProps {
  request: ClientRequest;
  onChange: (updated: Partial<ClientRequest>) => void;
  onNext: () => void;
}

export function Step1OrderIntake({ request, onChange, onNext }: Step1OrderIntakeProps) {
  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE' || m.status === 'EMERGING');

  const applyPreset = (presetKey: 'DE_THG' | 'NL_HBE' | 'FR_CPB' | 'UK_RTFO') => {
    switch (presetKey) {
      case 'DE_THG':
        onChange({
          feedstockKey: 'manure',
          targetMarketId: 'DE_THG',
          volumeMwh: 10000,
          delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
          counterparty: 'German Fuel Supplier',
          notes: 'Standard THG Quota Delivery',
        });
        break;
      case 'NL_HBE':
        onChange({
          feedstockKey: 'food_waste',
          targetMarketId: 'NL_ERE',
          volumeMwh: 15000,
          delivery: { type: 'QUARTER', startDate: '2026-10-01', endDate: '2026-12-31', complianceYear: 2026 },
          counterparty: 'Dutch Obligated Supplier',
          notes: 'HBE Compliance Cargo',
        });
        break;
      case 'FR_CPB':
        onChange({
          feedstockKey: 'agricultural_residues',
          targetMarketId: 'FR_CPB',
          volumeMwh: 8000,
          delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
          counterparty: 'French Gas Supplier',
          notes: 'CPB Compliance Delivery',
        });
        break;
      case 'UK_RTFO':
        onChange({
          feedstockKey: 'sewage_sludge',
          targetMarketId: 'UK_RTFO',
          volumeMwh: 5000,
          delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
          counterparty: 'UK Transport Fuel Obligated Party',
          notes: 'RTFC Green Gas Delivery',
        });
        break;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-mono text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-teal-400 animate-ping" />
          Step 1 of 4: Order Intake
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 mb-2 font-sans">
          Receive &amp; Configure Commercial Order
        </h1>
        <p className="text-sm text-slate-600 dark:text-zinc-400 font-mono max-w-xl mx-auto">
          Enter your buyer requirements to scan available European biomethane production plants and pricing.
        </p>
      </div>

      {/* Quick RFQ Presets */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-xl p-4 mb-6 shadow-xs dark:shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Quick RFQ Presets
          </span>
          <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500">
            Click to auto-populate standard industry requests
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => applyPreset('DE_THG')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              request.targetMarketId === 'DE_THG' && request.feedstockKey === 'manure'
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-950 dark:text-cyan-200 shadow-xs'
                : 'bg-slate-50 dark:bg-[#08090d] border-slate-200 dark:border-[#1e2433] hover:border-slate-300 dark:hover:border-[#2b3347] text-slate-800 dark:text-zinc-300'
            }`}
          >
            <div className="text-sm font-semibold mb-0.5">🇩🇪 DE THG Manure</div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">10k MWh · Manure</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('NL_HBE')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              request.targetMarketId === 'NL_ERE' && request.feedstockKey === 'food_waste'
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-950 dark:text-cyan-200 shadow-xs'
                : 'bg-slate-50 dark:bg-[#08090d] border-slate-200 dark:border-[#1e2433] hover:border-slate-300 dark:hover:border-[#2b3347] text-slate-800 dark:text-zinc-300'
            }`}
          >
            <div className="text-sm font-semibold mb-0.5">🇳🇱 NL HBE Waste</div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">15k MWh · Bio-waste</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('FR_CPB')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              request.targetMarketId === 'FR_CPB' && request.feedstockKey === 'agricultural_residues'
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-950 dark:text-cyan-200 shadow-xs'
                : 'bg-slate-50 dark:bg-[#08090d] border-slate-200 dark:border-[#1e2433] hover:border-slate-300 dark:hover:border-[#2b3347] text-slate-800 dark:text-zinc-300'
            }`}
          >
            <div className="text-sm font-semibold mb-0.5">🇫🇷 FR CPB Agri</div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">8k MWh · Agri-straw</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('UK_RTFO')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              request.targetMarketId === 'UK_RTFO' && request.feedstockKey === 'sewage_sludge'
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-950 dark:text-cyan-200 shadow-xs'
                : 'bg-slate-50 dark:bg-[#08090d] border-slate-200 dark:border-[#1e2433] hover:border-slate-300 dark:hover:border-[#2b3347] text-slate-800 dark:text-zinc-300'
            }`}
          >
            <div className="text-sm font-semibold mb-0.5">🇬🇧 UK RTFO Sludge</div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">5k MWh · Sewage</div>
          </button>
        </div>
      </div>

      {/* Main Order Form */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-xl p-6 shadow-sm dark:shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buyer Market */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300 font-bold mb-2">
              1. Buyer Destination Market
            </label>
            <select
              value={request.targetMarketId}
              onChange={e => onChange({ targetMarketId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#08090d] border border-slate-300 dark:border-[#2b3347] rounded-lg px-3 py-2.5 font-mono text-sm text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:border-cyan-500"
            >
              <option value="ANY">🌐 Any European Market (Multi-Scan)</option>
              {activeMarkets.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.country})
                </option>
              ))}
            </select>
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 mt-1 block">
              Specifies the compliance offtake territory &amp; quota regulations
            </span>
          </div>

          {/* Volume */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300 font-bold mb-2">
              2. Order Volume (MWh)
            </label>
            <div className="relative">
              <input
                type="number"
                min="500"
                step="500"
                value={request.volumeMwh ?? 10000}
                onChange={e => onChange({ volumeMwh: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-slate-50 dark:bg-[#08090d] border border-slate-300 dark:border-[#2b3347] rounded-lg px-3 py-2.5 font-mono text-sm text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:border-cyan-500"
                placeholder="e.g. 10000"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-slate-500 dark:text-zinc-500 font-semibold">
                MWh
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 mt-1 block">
              {(request.volumeMwh || 10000) >= 1000 ? `${((request.volumeMwh || 10000) / 1000).toFixed(1)} GWh equivalent` : 'Standard parcel'}
            </span>
          </div>

          {/* Feedstock */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300 font-bold mb-2">
              3. Feedstock / Substrate Type
            </label>
            <select
              value={request.feedstockKey}
              onChange={e => onChange({ feedstockKey: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#08090d] border border-slate-300 dark:border-[#2b3347] rounded-lg px-3 py-2.5 font-mono text-sm text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:border-cyan-500"
            >
              <option value="ANY">🌱 Any Annex IX Feedstock</option>
              {Object.entries(FEEDSTOCK_REGISTRY).map(([k, f]) => (
                <option key={k} value={k}>
                  {f.name} (Default CI: {f.defaultCI} gCO₂e/MJ)
                </option>
              ))}
            </select>
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 mt-1 block">
              Determines greenhouse gas abatement and certificate multiplier
            </span>
          </div>

          {/* Delivery Period */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300 font-bold mb-2">
              4. Delivery Window
            </label>
            <select
              value={request.delivery.type || 'MONTH'}
              onChange={e => onChange({
                delivery: {
                  ...request.delivery,
                  type: e.target.value as any,
                  complianceYear: 2026
                }
              })}
              className="w-full bg-slate-50 dark:bg-[#08090d] border border-slate-300 dark:border-[#2b3347] rounded-lg px-3 py-2.5 font-mono text-sm text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:border-cyan-500"
            >
              <option value="MONTH">📅 Front Month (M+1 Delivery)</option>
              <option value="QUARTER">📊 Front Quarter (Q+1 Delivery)</option>
              <option value="CALENDAR">📆 Calendar Year 2026</option>
              <option value="CUSTOM">📝 Spot / Immediate Delivery</option>
            </select>
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 mt-1 block">
              Surrender deadline: Compliance Year 2026
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-[#1e2433] flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-stone-950 font-mono text-sm font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Scan European Plants</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
