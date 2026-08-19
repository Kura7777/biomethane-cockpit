import React, { useMemo, useEffect } from 'react';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
import { useAppState } from '../../store/context';
import { HUB_BASIS_SPREADS, INTERCONNECTION_POINTS } from '../../domain/logistics/corridors';
import { ModeCostBreakdown } from '../../domain/logistics/types';

interface LogisticsModalProps {
  originCountry: string;
  targetCountry: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyCosts?: (costs: { transferCosts: number | null; certificationCosts: number | null; logistics: number | null }) => void;
}

function getFeasibilityTone(feas: string) {
  switch (feas) {
    case 'HIGH':
      return 'text-emerald-400 bg-emerald-950 border-emerald-800';
    case 'MEDIUM':
    case 'CONTESTED':
      return 'text-amber-400 bg-amber-950 border-amber-800';
    case 'LOW':
    default:
      return 'text-red-400 bg-red-950 border-red-800';
  }
}

export function LogisticsModal({
  originCountry,
  targetCountry,
  isOpen,
  onClose,
}: LogisticsModalProps) {
  const { state } = useAppState();

  // Escape closes & body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const baseGasPrice = state.marks.gasIndex.mid;

  const assessment = useMemo(() => {
    return calculateLogisticsRoute(originCountry, targetCountry, baseGasPrice);
  }, [originCountry, targetCountry, baseGasPrice]);

  if (!isOpen) return null;

  const originHub = HUB_BASIS_SPREADS[originCountry] || { hubName: `${originCountry} Hub`, operator: 'National TSO', basisSpreadToTtfEurMwh: 0.50 };
  const targetHub = HUB_BASIS_SPREADS[targetCountry] || { hubName: `${targetCountry} Hub`, operator: 'National TSO', basisSpreadToTtfEurMwh: 0.00 };
  const basisSpreadDiff = (targetHub.basisSpreadToTtfEurMwh - originHub.basisSpreadToTtfEurMwh);

  const ipList = INTERCONNECTION_POINTS.filter(
    ip => (ip.fromCountry === originCountry && ip.toCountry === targetCountry) ||
          (ip.fromCountry === targetCountry && ip.toCountry === originCountry)
  );

  const modeList: ModeCostBreakdown[] = [
    assessment.modes.virtualSwap,
    assessment.modes.physicalPipeline,
    assessment.modes.bioLng,
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cross-border delivery playbook"
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-black/75 flex items-start justify-center p-8 px-6 overflow-y-auto font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[1120px] bg-stone-950 border border-stone-700 shadow-2xl rounded-none flex flex-col my-auto"
      >
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-3.5 px-4 bg-stone-900 border-b border-stone-800">
          <div>
            <h2 className="m-0 font-mono text-sm font-semibold tracking-[0.12em] text-stone-100 uppercase">
              Delivery playbook · {originCountry} → {targetCountry}
            </h2>
            <div className="text-xs text-stone-400 mt-1 font-sans">
              {originHub.hubName} ➔ {targetHub.hubName} · Basis spread: {basisSpreadDiff >= 0 ? `+€${basisSpreadDiff.toFixed(2)}` : `−€${Math.abs(basisSpreadDiff).toFixed(2)}`}/MWh · Transit: {assessment.physicalRoute.totalPhysicalTariffEurMwh !== null ? `€${assessment.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)}/MWh` : 'unverified'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close delivery playbook"
            className="bg-transparent border border-stone-700 text-stone-400 hover:text-stone-100 hover:bg-stone-800 font-mono text-xs px-2 py-1 cursor-pointer transition-colors"
          >
            ESC ✕
          </button>
        </div>

        {/* Three Mode Columns */}
        <div className="grid grid-cols-3 gap-[1px] bg-stone-800">
          {modeList.map(m => {
            const tagLetter = m.mode === 'VIRTUAL_SWAP' ? 'A' : m.mode === 'PHYSICAL_PIPELINE' ? 'B' : 'C';
            const tagTone = tagLetter === 'A' ? 'text-emerald-400 bg-emerald-950 border-emerald-800' :
              tagLetter === 'B' ? 'text-sky-400 bg-sky-950 border-sky-800' :
              'text-amber-400 bg-amber-950 border-amber-800';
            const feasTone = getFeasibilityTone(m.regulatoryFeasibility);
            const isTariffIncomplete = m.totalCostEurMwh === null;

            return (
              <div key={m.mode} className="bg-stone-950 p-3.5 px-4 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className={`w-[19px] h-[19px] flex items-center justify-center font-mono text-micro font-bold border ${tagTone}`}>
                    {tagLetter}
                  </span>
                  <span className={`font-mono text-micro font-semibold px-1.5 py-0.5 border ${feasTone}`}>
                    {m.regulatoryFeasibility}
                  </span>
                </div>

                <h3 className="m-0 text-sm font-semibold leading-snug text-stone-100 mt-2.5">
                  {m.title.split(':')[0]}
                </h3>

                {isTariffIncomplete ? (
                  <div className="font-mono text-sm font-bold text-amber-400 mt-1">
                    TARIFF INCOMPLETE
                  </div>
                ) : (
                  <div className={`font-mono font-num text-2xl font-bold mt-1 ${
                    tagLetter === 'A' ? 'text-emerald-400' : tagLetter === 'B' ? 'text-sky-400' : 'text-amber-400'
                  }`}>
                    €{m.totalCostEurMwh !== null ? m.totalCostEurMwh.toFixed(2) : '—'}
                    <span className="text-xs text-stone-400 font-normal"> /MWh</span>
                  </div>
                )}

                <div className="font-mono text-micro text-stone-500 mt-0.5">
                  Timeline: {m.timelineDays}d · {m.regulatoryFeasibility} feasibility
                </div>

                <p className="m-0 text-xs leading-relaxed text-stone-400 mt-2">
                  {m.summary}
                </p>

                {/* Line Items */}
                <div className="mt-3 flex flex-col gap-1">
                  {m.lineItems.map((line, li) => (
                    <div key={li} className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] leading-tight text-stone-400">
                        {line.label}
                      </span>
                      <span className="flex-1 h-px bg-stone-900" />
                      <span className={`font-mono font-num text-[11px] font-semibold ${
                        line.costEurMwh === null ? 'text-amber-400' : 'text-stone-200'
                      }`}>
                        {line.costEurMwh !== null ? `€${line.costEurMwh.toFixed(2)}` : 'unverified'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pros & Cons */}
                <div className="mt-3 pt-2.5 border-t border-stone-800 flex flex-col gap-2">
                  <div>
                    <div className="font-mono text-micro tracking-[0.1em] text-emerald-400 uppercase font-semibold">
                      For
                    </div>
                    {m.pros.map((p, pi) => (
                      <div key={pi} className="text-[11px] leading-relaxed text-stone-400 mt-0.5">
                        • {p}
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="font-mono text-micro tracking-[0.1em] text-amber-400 uppercase font-semibold">
                      Against
                    </div>
                    {m.cons.map((c, ci) => (
                      <div key={ci} className="text-[11px] leading-relaxed text-stone-400 mt-0.5">
                        • {c}
                      </div>
                    ))}
                  </div>

                  <div className="font-mono text-micro text-teal-300 mt-1 leading-snug">
                    {m.legalBasis}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Lower Section: Execution Steps + Hub Basis */}
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-[1px] bg-stone-800 border-t border-stone-800">
          
          {/* Execution Steps */}
          <div className="bg-stone-950 p-3.5 px-4 flex flex-col">
            <span className="font-mono text-meta font-semibold tracking-[0.14em] text-stone-400 uppercase mb-2">
              Execution steps
            </span>

            <div className="flex flex-col gap-3">
              {assessment.executionSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 bg-stone-900/60 border border-stone-800/80 rounded-xs">
                  <span className="w-6 h-6 shrink-0 bg-teal-950 border border-teal-800 text-teal-300 flex items-center justify-center font-mono text-micro font-bold rounded-xs">
                    0{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-stone-100 leading-snug">
                      {step.title}
                    </div>
                    <div className="font-mono text-micro font-medium text-teal-400/90 mt-0.5">
                      {step.actor}
                    </div>
                    <div className="flex flex-col gap-1 mt-1.5 pl-2 border-l border-stone-800">
                      {step.actions.map((act, ai) => (
                        <div key={ai} className="text-xs leading-relaxed text-stone-300">
                          {act}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hub Basis & Interconnection */}
          <div className="bg-stone-950 p-3.5 px-4 flex flex-col">
            <span className="font-mono text-meta font-semibold tracking-[0.14em] text-stone-400 uppercase mb-2">
              Hub basis & interconnection
            </span>

            <div className="grid grid-cols-2 gap-[1px] bg-stone-800 border border-stone-800">
              <div className="bg-stone-900 p-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Origin hub</div>
                <div className="font-mono text-xs font-semibold text-stone-100 mt-0.5 truncate">{originHub.hubName}</div>
                <div className="text-[11px] text-stone-500 mt-0.5 truncate">{originHub.operator}</div>
              </div>

              <div className="bg-stone-900 p-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Target hub</div>
                <div className="font-mono text-xs font-semibold text-stone-100 mt-0.5 truncate">{targetHub.hubName}</div>
                <div className="text-[11px] text-stone-500 mt-0.5 truncate">{targetHub.operator}</div>
              </div>

              <div className="bg-stone-900 p-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Basis to TTF</div>
                <div className="font-mono font-num text-xs font-semibold text-stone-100 mt-0.5">
                  €{targetHub.basisSpreadToTtfEurMwh.toFixed(2)}/MWh
                </div>
              </div>

              <div className="bg-stone-900 p-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Basis spread</div>
                <div className={`font-mono font-num text-xs font-bold mt-0.5 ${
                  basisSpreadDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {basisSpreadDiff >= 0 ? `+€${basisSpreadDiff.toFixed(2)}` : `−€${Math.abs(basisSpreadDiff).toFixed(2)}`}/MWh
                </div>
              </div>
            </div>

            {/* Interconnection Points */}
            <div className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase mt-3 mb-1.5">
              Interconnection points
            </div>

            <div className="flex flex-col gap-[1px] bg-stone-800 border border-stone-800">
              {ipList.length > 0 ? (
                ipList.map((ip, idx) => (
                  <div key={idx} className="bg-stone-900 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-meta font-semibold text-stone-100">
                        {ip.name}
                      </span>
                      <span className={`font-mono text-micro font-bold px-1 py-0.5 border ${
                        ip.confidence === 'VERIFIED'
                          ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                          : 'text-amber-400 bg-amber-950 border-amber-800'
                      }`}>
                        {ip.confidence || 'UNVERIFIED'}
                      </span>
                    </div>
                    <div className="text-[11px] leading-tight text-stone-500 mt-0.5">
                      {ip.fromTso} ➔ {ip.toTso} · {ip.notes || ip.source}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-stone-900 p-2 text-xs text-stone-400">
                  No continuous physical pipeline interconnection recorded between {originCountry} and {targetCountry}. Route via virtual UDB swap or bio-LNG road transport.
                </div>
              )}
            </div>

            <p className="m-0 text-[11px] leading-relaxed text-stone-500 mt-2.5">
              Border tariffs are unverified in the corridor registry — every figure above is indicative until confirmed on PRISMA. Winter cleared prices run 3–5× summer.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
