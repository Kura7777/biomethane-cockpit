import React from 'react';
import { getMarketsByDeskCategory, MARKETS } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { ClientRequest } from '../../domain/arbitrage/types';
import { 
  Sparkles, 
  Layers, 
  Calendar, 
  DollarSign, 
  Building2,
  SlidersHorizontal,
  Search,
  RefreshCw,
  CheckCircle2,
  Shield,
  Leaf,
  FileCheck
} from 'lucide-react';

export type CommercialDeskMode = 'COMPLIANCE' | 'VOLUNTARY';

export type RfqPresetKey =
  | 'DE_THG_MANURE'
  | 'NL_HBE_BIOLNG'
  | 'FUELEU_MARITIME'
  | 'FR_CPB_AGRI'
  | 'UK_RTFO_WASTE'
  | 'UK_RGGO_CROPS'
  | 'VOL_SCOPE1_TECH'
  | 'DE_GO_INDUSTRIAL'
  | 'NL_GO_COMMERCIAL'
  | 'FR_GO_ECOGAZ';

interface OrderIntakePanelProps {
  request: ClientRequest;
  deskMode: CommercialDeskMode;
  onSelectDeskMode: (mode: CommercialDeskMode) => void;
  onChange: (updated: Partial<ClientRequest>) => void;
  onApplyPreset: (presetKey: RfqPresetKey) => void;
  onScan?: () => void;
  isScanning?: boolean;
  lastScannedText?: string;
  voluntaryDeliveryType?: 'CERTIFICATE_ONLY' | 'BUNDLED_GREEN_GAS';
  onSelectVoluntaryDeliveryType?: (type: 'CERTIFICATE_ONLY' | 'BUNDLED_GREEN_GAS') => void;
}

export function OrderIntakePanel({ 
  request, 
  deskMode,
  onSelectDeskMode,
  onChange, 
  onApplyPreset,
  onScan = () => {},
  isScanning = false,
  lastScannedText = 'Just now',
  voluntaryDeliveryType = 'CERTIFICATE_ONLY',
  onSelectVoluntaryDeliveryType = () => {}
}: OrderIntakePanelProps) {
  const filteredMarkets = getMarketsByDeskCategory(deskMode).filter(m => m.status === 'ACTIVE' || m.status === 'EMERGING');

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 shadow-xl backdrop-blur-md space-y-3.5">
      {/* Top Segmented Bar: Desk Mode Toggle & Quick RFQ Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
        {/* Left: Desk Mode Segmented Switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 shadow-inner">
            <button
              type="button"
              onClick={() => onSelectDeskMode('COMPLIANCE')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                deskMode === 'COMPLIANCE'
                  ? 'bg-teal-600 text-stone-950 shadow-md ring-1 ring-teal-400/50'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>🛡️ Compliance Desk</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                deskMode === 'COMPLIANCE' ? 'bg-stone-950/40 text-stone-950' : 'bg-stone-900 text-stone-400'
              }`}>
                RED III / Quotas
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDeskMode('VOLUNTARY')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                deskMode === 'VOLUNTARY'
                  ? 'bg-emerald-600 text-stone-950 shadow-md ring-1 ring-emerald-400/50'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>🌱 Voluntary &amp; Corporate Desk</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                deskMode === 'VOLUNTARY' ? 'bg-stone-950/40 text-stone-950' : 'bg-stone-900 text-stone-400'
              }`}>
                Scope 1 / GOs
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Voluntary Desk Sub-Bar: Delivery Archetype (Certificate-Only vs Bundled Molecule) */}
      {deskMode === 'VOLUNTARY' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/50">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-emerald-200">Voluntary Contract Structure:</span>
            <div className="flex items-center gap-1 bg-stone-950 p-0.5 rounded-md border border-emerald-900/60">
              <button
                type="button"
                onClick={() => onSelectVoluntaryDeliveryType('CERTIFICATE_ONLY')}
                className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded transition-colors cursor-pointer ${
                  voluntaryDeliveryType === 'CERTIFICATE_ONLY'
                    ? 'bg-emerald-600 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Certificate-Only (Book &amp; Claim / GO Transfer)
              </button>
              <button
                type="button"
                onClick={() => onSelectVoluntaryDeliveryType('BUNDLED_GREEN_GAS')}
                className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded transition-colors cursor-pointer ${
                  voluntaryDeliveryType === 'BUNDLED_GREEN_GAS'
                    ? 'bg-emerald-600 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Bundled Green Gas (Molecule + GO Cancellation)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>GHG Protocol Scope 1 Market-Based Method &amp; Energy Crops (+40 CI) Exempt</span>
          </div>
        </div>
      )}

      {/* Grid of Inputs & Search Button */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 font-sans items-end">
        {/* 1. Target Buyer Market (3 cols) */}
        <div className="lg:col-span-3">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-stone-400 mb-1 font-semibold">
            {deskMode === 'COMPLIANCE' ? 'Compliance Target Market / Quota' : 'Voluntary Scheme / National GO Registry'}
          </label>
          <select
            value={request.targetMarketId}
            onChange={e => onChange({ targetMarketId: e.target.value })}
            className="w-full bg-stone-950 border border-stone-700/90 hover:border-stone-600 rounded-lg px-3 py-1.5 font-mono text-xs text-stone-100 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500/40 transition-colors cursor-pointer"
          >
            {deskMode === 'COMPLIANCE' && <option value="ANY">🌐 Any EU Compliance Market (Multi-Scan)</option>}
            {filteredMarkets.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.country})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Order Quantity (MWh) (2 cols) */}
        <div className="lg:col-span-2">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-stone-400 mb-1 font-semibold">
            Quantity (MWh)
          </label>
          <div className="relative">
            <input
              type="number"
              min={100}
              step={500}
              value={request.volumeMwh || ''}
              onChange={e => onChange({ volumeMwh: Math.max(1, Number(e.target.value)) })}
              className="w-full bg-stone-950 border border-stone-700/90 hover:border-stone-600 rounded-lg px-3 py-1.5 font-mono text-xs font-bold text-stone-100 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500/40 transition-colors"
            />
            <span className="absolute right-3 top-1.5 font-mono text-[11px] text-stone-500 pointer-events-none">
              MWh
            </span>
          </div>
        </div>

        {/* 3. Feedstock Substrate (3 cols) */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <label className="font-mono text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
              Feedstock / Substrate
            </label>
            <span className="font-mono text-[9px] text-teal-400 font-bold bg-teal-950/90 px-1.5 py-0.2 rounded border border-teal-800">
              CI Auto-Mapped
            </span>
          </div>
          <select
            value={request.feedstockKey}
            onChange={e => {
              const key = e.target.value;
              const feedstockInfo = FEEDSTOCK_REGISTRY[key];
              const autoCI = feedstockInfo ? feedstockInfo.defaultCI : null;
              onChange({
                feedstockKey: key,
                constraints: {
                  ...request.constraints,
                  maxCarbonIntensity: autoCI,
                }
              });
            }}
            className="w-full bg-stone-950 border border-stone-700/90 hover:border-stone-600 rounded-lg px-3 py-1.5 font-mono text-xs text-stone-100 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500/40 transition-colors cursor-pointer"
          >
            {Object.values(FEEDSTOCK_REGISTRY).map(f => (
              <option key={f.id} value={f.id}>
                {f.name} (CI: {f.defaultCI > 0 ? `+${f.defaultCI}` : f.defaultCI})
              </option>
            ))}
          </select>
        </div>

        {/* 4. Carbon Intensity (CI) (2 cols) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="font-mono text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
              Carbon Intensity (CI)
            </label>
            {request.constraints.maxCarbonIntensity !== null && (
              <span className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded ${
                request.constraints.maxCarbonIntensity <= 0 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                  : 'bg-stone-900 text-stone-300 border border-stone-700'
              }`}>
                {request.constraints.maxCarbonIntensity > 0 ? `+${request.constraints.maxCarbonIntensity}` : request.constraints.maxCarbonIntensity} g/MJ
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              value={request.constraints.maxCarbonIntensity !== null ? request.constraints.maxCarbonIntensity : ''}
              onChange={e => onChange({
                constraints: {
                  ...request.constraints,
                  maxCarbonIntensity: e.target.value !== '' ? Number(e.target.value) : null,
                }
              })}
              placeholder="Auto-mapped"
              className="w-full bg-stone-950 border border-stone-700/90 hover:border-stone-600 rounded-lg px-3 py-1.5 font-mono text-xs font-bold text-teal-300 placeholder-stone-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500/40 transition-colors"
            />
            <span className="absolute right-3 top-1.5 font-mono text-[10px] text-stone-500 pointer-events-none">
              g/MJ
            </span>
          </div>
        </div>

        {/* 5. Search / Scan Plants Button (2 cols) */}
        <div className="lg:col-span-2">
          <button
            type="button"
            onClick={onScan}
            disabled={isScanning}
            className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-stone-950 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-teal-900/50 cursor-pointer disabled:cursor-wait"
            title="Scan 1,975+ European plants & calculate live costs"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-stone-950" />
                <span>Scan Plants</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Telemetry Status Strip */}
      <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between font-mono text-[10px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Sourcing Scan · 1,975 Verified European Plants &amp; Interconnectors</span>
        </span>
        <span className="text-stone-400">
          Last Updated: <strong className="text-stone-200">{lastScannedText}</strong>
        </span>
      </div>
    </div>
  );
}
