import React from 'react';
import { getMarketsByDeskCategory, MARKETS } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { ClientRequest } from '../../domain/arbitrage/types';
import { 
  Sparkles, 
  Layers, 
  Calendar, 
  Building2,
  SlidersHorizontal,
  Search,
  RefreshCw,
  CheckCircle2,
  Shield,
  Leaf,
  FileCheck,
  Plus,
  Minus
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

  const adjustVolume = (delta: number) => {
    const current = request.volumeMwh || 10000;
    const next = Math.max(1000, current + delta);
    onChange({ volumeMwh: next });
  };

  return (
    <div className="bg-[#0e1118] border border-[#1e2433] rounded-lg p-3.5 shadow-sm space-y-3">
      {/* Top Segmented Bar: Desk Mode Toggle & RFQ Context */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#1e2433]">
        {/* Left: Desk Mode Segmented Switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#08090d] p-0.5 rounded border border-[#1e2433] shadow-inner">
            <button
              type="button"
              onClick={() => onSelectDeskMode('COMPLIANCE')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                deskMode === 'COMPLIANCE'
                  ? 'bg-[#141824] text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Compliance Desk</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                deskMode === 'COMPLIANCE' ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50' : 'bg-[#0e1118] text-zinc-500'
              }`}>
                RED III / Quotas
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDeskMode('VOLUNTARY')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                deskMode === 'VOLUNTARY'
                  ? 'bg-[#141824] text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              <span>Voluntary Desk</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                deskMode === 'VOLUNTARY' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50' : 'bg-[#0e1118] text-zinc-500'
              }`}>
                Scope 1 / GOs
              </span>
            </button>
          </div>
        </div>

        {/* Fast Preset RFQs with Country Flags */}
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 flex-wrap">
          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] mr-0.5">Presets:</span>
          {deskMode === 'COMPLIANCE' ? (
            <>
              <button 
                type="button"
                onClick={() => onApplyPreset('DE_THG_MANURE')} 
                className="px-2 py-0.5 rounded bg-[#08090d] hover:bg-[#141824] border border-[#1e2433] hover:border-cyan-500/40 text-zinc-200 hover:text-cyan-300 transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <span>🇩🇪</span>
                <span>DE THG Manure</span>
              </button>
              <button 
                type="button"
                onClick={() => onApplyPreset('NL_HBE_BIOLNG')} 
                className="px-2 py-0.5 rounded bg-[#08090d] hover:bg-[#141824] border border-[#1e2433] hover:border-cyan-500/40 text-zinc-200 hover:text-cyan-300 transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <span>🇳🇱</span>
                <span>NL ERE Bio-LNG</span>
              </button>
              <button 
                type="button"
                onClick={() => onApplyPreset('FR_CPB_AGRI')} 
                className="px-2 py-0.5 rounded bg-[#08090d] hover:bg-[#141824] border border-[#1e2433] hover:border-cyan-500/40 text-zinc-200 hover:text-cyan-300 transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <span>🇫🇷</span>
                <span>FR CPB Agri</span>
              </button>
              <button 
                type="button"
                onClick={() => onApplyPreset('FUELEU_MARITIME')} 
                className="px-2 py-0.5 rounded bg-[#08090d] hover:bg-[#141824] border border-[#1e2433] hover:border-cyan-500/40 text-zinc-200 hover:text-cyan-300 transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <span>🇪🇺</span>
                <span>FuelEU Maritime</span>
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => onApplyPreset('UK_RGGO_CROPS')} 
                className="px-2 py-0.5 rounded bg-[#08090d] hover:bg-[#141824] border border-[#1e2433] hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <span>🇬🇧</span>
                <span>UK RGGO Crops</span>
              </button>
              <button 
                type="button"
                onClick={() => onApplyPreset('DE_GO_INDUSTRIAL')} 
                className="px-2 py-0.5 rounded bg-[#08090d] hover:bg-[#141824] border border-[#1e2433] hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <span>🇩🇪</span>
                <span>DE GO Industry</span>
              </button>
              <button 
                type="button"
                onClick={() => onApplyPreset('NL_GO_COMMERCIAL')} 
                className="px-2 py-0.5 rounded bg-[#08090d] hover:bg-[#141824] border border-[#1e2433] hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <span>🇳🇱</span>
                <span>NL GO Commercial</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Voluntary Desk Sub-Bar: Delivery Archetype (Certificate-Only vs Bundled Molecule) */}
      {deskMode === 'VOLUNTARY' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-emerald-200">Voluntary Contract Structure:</span>
            <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-md border border-emerald-900/60">
              <button
                type="button"
                onClick={() => onSelectVoluntaryDeliveryType('CERTIFICATE_ONLY')}
                className={`px-2.5 py-1 font-mono text-[10px] font-bold rounded transition-colors cursor-pointer ${
                  voluntaryDeliveryType === 'CERTIFICATE_ONLY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Certificate-Only (Book &amp; Claim / GO Transfer)
              </button>
              <button
                type="button"
                onClick={() => onSelectVoluntaryDeliveryType('BUNDLED_GREEN_GAS')}
                className={`px-2.5 py-1 font-mono text-[10px] font-bold rounded transition-colors cursor-pointer ${
                  voluntaryDeliveryType === 'BUNDLED_GREEN_GAS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2.5 font-sans items-end">
        {/* 1. Target Buyer Market (3 cols) */}
        <div className="lg:col-span-3">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-semibold">
            {deskMode === 'COMPLIANCE' ? 'Compliance Target Market / Quota' : 'Voluntary Scheme / National GO Registry'}
          </label>
          <select
            value={request.targetMarketId}
            onChange={e => onChange({ targetMarketId: e.target.value })}
            className="w-full bg-[#08090d] border border-[#1e2433] hover:border-[#2b3347] rounded px-2.5 py-1.5 font-mono text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
          >
            {deskMode === 'COMPLIANCE' && <option value="ANY">🌐 Any EU Compliance Market (Multi-Scan)</option>}
            {filteredMarkets.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.country})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Order Quantity with Steppers (3 cols) */}
        <div className="lg:col-span-3">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-semibold">
            Contract Quantity (MWh)
          </label>
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => adjustVolume(-5000)}
              className="absolute left-1 z-10 w-5 h-5 rounded bg-[#141824] hover:bg-[#1e2433] text-zinc-300 flex items-center justify-center cursor-pointer transition-colors border border-[#1e2433]"
              title="Decrease by 5,000 MWh"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <input
              type="number"
              min={100}
              step={500}
              value={request.volumeMwh || ''}
              onChange={e => onChange({ volumeMwh: Math.max(1, Number(e.target.value)) })}
              className="w-full bg-[#08090d] border border-[#1e2433] hover:border-[#2b3347] rounded px-7 py-1.5 font-mono tabular-nums text-xs font-bold text-cyan-300 text-center focus:border-cyan-500 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => adjustVolume(5000)}
              className="absolute right-1 z-10 w-5 h-5 rounded bg-[#141824] hover:bg-[#1e2433] text-zinc-300 flex items-center justify-center cursor-pointer transition-colors border border-[#1e2433]"
              title="Increase by 5,000 MWh"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* 3. Feedstock Substrate (3 cols) */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Feedstock Substrate
            </label>
            <span className="font-mono text-[9px] text-cyan-400 font-bold bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/40">
              CI Mapped
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
            className="w-full bg-[#08090d] border border-[#1e2433] hover:border-[#2b3347] rounded px-2.5 py-1.5 font-mono text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
          >
            {Object.values(FEEDSTOCK_REGISTRY).map(f => (
              <option key={f.id} value={f.id}>
                {f.name} (CI: {f.defaultCI > 0 ? `+${f.defaultCI}` : f.defaultCI})
              </option>
            ))}
          </select>
        </div>

        {/* 4. Search / Scan Plants Button (3 cols) */}
        <div className="lg:col-span-3">
          <button
            type="button"
            onClick={onScan}
            disabled={isScanning}
            className="w-full py-1.5 px-3 rounded bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-black font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-500/20 hover:shadow-cyan-500/40 cursor-pointer disabled:cursor-wait"
            title="Scan 1,975+ European plants & calculate live costs"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                <span>Scanning 1,975+ Assets...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-black" />
                <span>Scan European Plants</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Telemetry Status Strip */}
      <div className="mt-2 pt-1.5 border-t border-[#1e2433] flex items-center justify-between font-mono text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Sourcing Engine · 1,975 Audited Facilities &amp; Dijkstra Corridor Network</span>
        </span>
        <span className="text-zinc-400">
          Last Synchronized: <strong className="text-zinc-200">{lastScannedText}</strong>
        </span>
      </div>
    </div>
  );
}
