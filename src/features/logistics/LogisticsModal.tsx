import React, { useState, useMemo } from 'react';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
import { DeliveryMode, ModeCostBreakdown } from '../../domain/logistics/types';
import { useAppState } from '../../store/context';
import { 
  Truck, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  HelpCircle, 
  ExternalLink, 
  CheckCircle2, 
  X,
  TrendingDown,
  Clock,
  Zap
} from 'lucide-react';

interface LogisticsModalProps {
  originCountry: string;
  targetCountry: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyCosts?: (costs: { transferCosts: number | null; certificationCosts: number | null; logistics: number | null }) => void;
}

export function LogisticsModal({
  originCountry,
  targetCountry,
  isOpen,
  onClose,
  onApplyCosts,
}: LogisticsModalProps) {
  const { state, dispatch } = useAppState();
  const [selectedMode, setSelectedMode] = useState<DeliveryMode>('VIRTUAL_SWAP');
  const [activeTab, setActiveTab] = useState<'MODES' | 'PLAYBOOK'>('MODES');
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  const baseGasPrice = state.marks.gasIndex.mid ?? 28.50;

  const assessment = useMemo(() => {
    return calculateLogisticsRoute(originCountry, targetCountry, baseGasPrice);
  }, [originCountry, targetCountry, baseGasPrice]);

  if (!isOpen) return null;

  const handleApplyModeCosts = (mode: ModeCostBreakdown) => {
    let transferCosts: number | null = 0;
    let certCosts = 0.45;
    let logisticsCosts: number | null = 0;

    if (mode.mode === 'VIRTUAL_SWAP') {
      transferCosts = 0.80 + Math.abs(assessment.hubSpread.basisSpreadEurMwh);
      certCosts = 0.45;
      logisticsCosts = 0.25;
    } else if (mode.mode === 'PHYSICAL_PIPELINE') {
      transferCosts = assessment.physicalRoute.totalPhysicalTariffEurMwh;
      certCosts = 0.45;
      logisticsCosts = assessment.physicalRoute.shrinkageEurMwh !== null ? Number((assessment.physicalRoute.shrinkageEurMwh + 0.50).toFixed(2)) : null;
    } else {
      transferCosts = 2.00;
      certCosts = 0.45;
      logisticsCosts = mode.totalCostEurMwh !== null ? Number((mode.totalCostEurMwh - 2.45).toFixed(2)) : null;
    }

    dispatch({
      type: 'SET_COSTS',
      costs: {
        transferCosts,
        certificationCosts: certCosts,
        logistics: logisticsCosts,
      },
    });

    if (onApplyCosts) {
      onApplyCosts({ transferCosts, certificationCosts: certCosts, logistics: logisticsCosts });
    }

    setAppliedSuccess(mode.title.split(':')[0]);
    setTimeout(() => setAppliedSuccess(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono text-xs">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-stone-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-tight">
                  Cross-Border Gas Logistics & Delivery Wheel Guide
                </h2>
                <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded font-bold">
                  {assessment.originCountry} ➔ {assessment.targetCountry} ({assessment.distanceKm !== null ? `~${assessment.distanceKm.toLocaleString()} km` : 'Distance unmapped'})
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                How European gas flows: Commercial mass balance under RED III Art. 31a vs. physical PRISMA pipeline transit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex bg-stone-900 border border-stone-800 rounded p-0.5">
              <button
                onClick={() => setActiveTab('MODES')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeTab === 'MODES' ? 'bg-teal-600 text-white' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Delivery Modes & Costs
              </button>
              <button
                onClick={() => setActiveTab('PLAYBOOK')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeTab === 'PLAYBOOK' ? 'bg-teal-600 text-white' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Trader Playbook
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {appliedSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-lg flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Successfully applied <strong>{appliedSuccess}</strong> tariffs into Trade Builder economics!</span>
            </div>
          )}

          {activeTab === 'MODES' ? (
            <>
              {/* Delivery Modes 3-Card Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* MODE 1: Virtual Inter-Hub Swap */}
                <div 
                  onClick={() => setSelectedMode('VIRTUAL_SWAP')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedMode === 'VIRTUAL_SWAP'
                      ? 'bg-teal-950/40 border-teal-500 ring-1 ring-teal-500 shadow-md'
                      : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-400 uppercase bg-teal-950 border border-teal-800 px-2 py-0.5 rounded">
                        ★ Industry Standard
                      </span>
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> T+1 Instant
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">Virtual Inter-Hub Swap</h3>
                      <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                        Sell molecule at Swedish VTP / TTF & buy physical in Spain (MIBGAS PVB). Transfer environmental PoS via UDB.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80">
                      <div className="text-[10px] text-stone-500 uppercase">Estimated Total Friction</div>
                      <div className="text-xl font-bold text-teal-300 font-mono">
                        {assessment.modes.virtualSwap.totalCostEurMwh !== null ? (
                          <>
                            €{assessment.modes.virtualSwap.totalCostEurMwh.toFixed(2)}
                            <span className="text-xs font-normal text-stone-400">/MWh</span>
                          </>
                        ) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-800/80">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleApplyModeCosts(assessment.modes.virtualSwap);
                      }}
                      className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded text-xs transition-all shadow-xs"
                    >
                      Apply Virtual Swap Costs
                    </button>
                  </div>
                </div>

                {/* MODE 2: Physical Pipeline Wheel */}
                <div 
                  onClick={() => setSelectedMode('PHYSICAL_PIPELINE')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedMode === 'PHYSICAL_PIPELINE'
                      ? 'bg-sky-950/40 border-sky-500 ring-1 ring-sky-500 shadow-md'
                      : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-400 uppercase bg-sky-950 border border-sky-800 px-2 py-0.5 rounded">
                        Multi-TSO Wheel
                      </span>
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 14 Days (Auctions)
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">Physical Pipeline Transit</h3>
                      <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                        {assessment.modes.physicalPipeline.summary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80">
                      <div className="text-[10px] text-stone-500 uppercase">Estimated Total Friction</div>
                      <div className="text-xl font-bold font-mono">
                        {assessment.modes.physicalPipeline.totalCostEurMwh !== null ? (
                          <span className="text-sky-300">
                            €{assessment.modes.physicalPipeline.totalCostEurMwh.toFixed(2)}
                            <span className="text-xs font-normal text-stone-400">/MWh</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 text-sm">
                            Tariff Incomplete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-800/80">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleApplyModeCosts(assessment.modes.physicalPipeline);
                      }}
                      disabled={assessment.modes.physicalPipeline.totalCostEurMwh === null}
                      className={`w-full py-1.5 font-bold rounded text-xs transition-all shadow-xs ${
                        assessment.modes.physicalPipeline.totalCostEurMwh !== null
                          ? 'bg-sky-700 hover:bg-sky-600 text-white'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {assessment.modes.physicalPipeline.totalCostEurMwh !== null ? 'Apply Physical Wheel Costs' : 'Incomplete Tariffs'}
                    </button>
                  </div>
                </div>

                {/* MODE 3: Bio-LNG Virtual Pipeline */}
                <div 
                  onClick={() => setSelectedMode('BIO_LNG')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedMode === 'BIO_LNG'
                      ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-md'
                      : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-950 border border-amber-800 px-2 py-0.5 rounded">
                        Cryogenic Transport
                      </span>
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 3–4 Days
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">Bio-LNG Cryogenic Road</h3>
                      <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                        Liquefy at origin plant (-162°C) and transport in 20t ISO cryogenic road tankers to Spanish port/terminal.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80">
                      <div className="text-[10px] text-stone-500 uppercase">Estimated Total Friction</div>
                      <div className="text-xl font-bold text-amber-300 font-mono">
                        {assessment.modes.bioLng.totalCostEurMwh !== null ? (
                          <>
                            €{assessment.modes.bioLng.totalCostEurMwh.toFixed(2)}
                            <span className="text-xs font-normal text-stone-400">/MWh</span>
                          </>
                        ) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-800/80">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleApplyModeCosts(assessment.modes.bioLng);
                      }}
                      className="w-full py-1.5 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded text-xs transition-all shadow-xs"
                    >
                      Apply Bio-LNG Costs
                    </button>
                  </div>
                </div>

              </div>

              {/* Selected Mode Detail Breakdown */}
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-400" />
                    <span className="font-bold text-white uppercase">
                      {selectedMode === 'VIRTUAL_SWAP' && assessment.modes.virtualSwap.title}
                      {selectedMode === 'PHYSICAL_PIPELINE' && assessment.modes.physicalPipeline.title}
                      {selectedMode === 'BIO_LNG' && assessment.modes.bioLng.title}
                    </span>
                  </div>
                  <span className="text-teal-400 font-bold text-sm">
                    {(() => {
                      const total = selectedMode === 'VIRTUAL_SWAP' ? assessment.modes.virtualSwap.totalCostEurMwh :
                        selectedMode === 'PHYSICAL_PIPELINE' ? assessment.modes.physicalPipeline.totalCostEurMwh :
                        assessment.modes.bioLng.totalCostEurMwh;
                      return total !== null ? `Total: €${total.toFixed(2)}/MWh` : 'Total: Incomplete Tariffs';
                    })()}
                  </span>
                </div>

                {/* Physical Interconnection Point Route Trail (If Physical Pipeline Selected) */}
                {selectedMode === 'PHYSICAL_PIPELINE' && (
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      Physical Gas Transmission Route Across Interconnection Points (IPs):
                    </span>
                    <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-stone-200">
                      {assessment.physicalRoute.transitingCountries.map((c, idx) => (
                        <React.Fragment key={c}>
                          <span className="px-2 py-1 bg-stone-950 border border-stone-700 rounded text-teal-300">
                            {c}
                          </span>
                          {idx < assessment.physicalRoute.transitingCountries.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Line Items Table */}
                <div className="divide-y divide-stone-800/80 text-xs">
                  {(selectedMode === 'VIRTUAL_SWAP' ? assessment.modes.virtualSwap.lineItems :
                    selectedMode === 'PHYSICAL_PIPELINE' ? assessment.modes.physicalPipeline.lineItems :
                    assessment.modes.bioLng.lineItems).map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-start justify-between gap-4">
                      <div>
                        <div className="font-bold text-stone-200">{item.label}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">{item.description}</div>
                      </div>
                      <div className="text-right whitespace-nowrap font-bold text-teal-300 text-sm">
                        {item.costEurMwh !== null ? `+€${item.costEurMwh.toFixed(2)}/MWh` : <span className="text-amber-400 font-normal text-xs">UNVERIFIED</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Regulatory Legal Basis */}
                <div className="p-3 bg-stone-900/80 border border-stone-800 rounded text-[11px] text-stone-400 space-y-1">
                  <div className="text-stone-300 font-bold uppercase text-[10px]">Statutory & Regulatory Basis:</div>
                  <div>
                    {selectedMode === 'VIRTUAL_SWAP' && assessment.modes.virtualSwap.legalBasis}
                    {selectedMode === 'PHYSICAL_PIPELINE' && assessment.modes.physicalPipeline.legalBasis}
                    {selectedMode === 'BIO_LNG' && assessment.modes.bioLng.legalBasis}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Tab 2: Execution Playbook */
            <div className="space-y-4">
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-4">
                <div className="border-b border-stone-800 pb-2">
                  <h3 className="text-sm font-bold text-white uppercase">
                    Trader Operational Execution Playbook: {assessment.originCountry} ➔ {assessment.targetCountry}
                  </h3>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Step-by-step checklist from upstream offtake contracting to final statutory quota surrender in Spain.
                  </p>
                </div>

                <div className="space-y-3">
                  {assessment.executionSteps.map((step, idx) => (
                    <div key={idx} className="p-3.5 bg-stone-900 border border-stone-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-950 border border-teal-800 text-teal-400 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white text-xs">{step.title}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 bg-stone-950 border border-stone-800 px-2 py-0.5 rounded">
                          {step.actor}
                        </span>
                      </div>

                      <div className="text-[10px] text-teal-400 font-bold uppercase">{step.phase}</div>

                      <ul className="space-y-1.5 text-xs text-stone-300 list-disc list-inside">
                        {step.actions.map((act, aIdx) => (
                          <li key={aIdx} className="leading-relaxed">{act}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <div className="text-[11px] text-stone-400">
            Current Basis Spread: <strong className="text-teal-300">{assessment.hubSpread.originHub.split(' ')[0]} ➔ {assessment.hubSpread.targetHub.split(' ')[0]} (€{Math.abs(assessment.hubSpread.basisSpreadEurMwh).toFixed(2)}/MWh)</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-lg text-xs transition-colors"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
}
