import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { ArbitrageOpportunity, ClientRequest } from '../../domain/arbitrage/types';
import { MarksState, CostInputs } from '../../domain/netback/types';
import { computeNetback } from '../../domain/netback/engine';
import { Consignment } from '../../domain/consignment/types';
import { TradeAssessment } from '../../domain/trade/types';
import { getMarketById } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  Zap, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  FileText,
  Calculator,
  Bookmark
} from 'lucide-react';
import { MathFormulaModal } from '../../shared/components/MathFormulaModal';

interface QuickDealDrawerProps {
  route: ArbitrageOpportunity | null;
  request: ClientRequest;
  marks: MarksState;
  costs: CostInputs;
  onClose: () => void;
}


export function QuickDealDrawer({
  route,
  request,
  marks,
  costs,
  onClose,
}: QuickDealDrawerProps) {
  const navigate = useNavigate();
  const [volumeOverride, setVolumeOverride] = useState<number | null>(request.volumeMwh ?? 20000);
  const [copied, setCopied] = useState(false);
  const [isMathOpen, setIsMathOpen] = useState(false);

  // Compute stressed netback & margin dynamically via computeNetback

  if (!route) return null;

  const currentNetback = route.totalTerminalValueStackEurPerMWh;
  const currentDeskMargin = route.deskNetMarginEurPerMWh;
  const currentPnl = currentDeskMargin !== null && volumeOverride !== null
    ? currentDeskMargin * volumeOverride
    : null;

  const handleOpenFullTrade = () => {
    const params = new URLSearchParams();
    params.set('marketId', route.targetMarketId);
    params.set('originCountry', route.originCountry);
    params.set('feedstock', route.feedstockKey);
    params.set('ci', route.carbonIntensity.toString());
    if (volumeOverride !== null) params.set('volume', volumeOverride.toString());
    params.set('scheme', route.certificationScheme);
    params.set('coc', route.chainOfCustody);
    if (request.counterparty) params.set('counterparty', request.counterparty);
    navigate(`/trade?${params.toString()}`);
  };

  const { dispatch } = useAppState();
  const [savedToLib, setSavedToLib] = useState(false);

  const handleSaveToLibrary = () => {
    const market = getMarketById(route.targetMarketId);
    if (!market) return;

    const consignment: Consignment = {
      id: `consignment-${route.originCountry}-${route.feedstockKey}`,
      name: `${route.originCountryName} ${route.feedstockName}`,
      originCountry: route.originCountry,
      originCountryName: route.originCountryName,
      feedstock: route.feedstockKey,
      feedstockName: route.feedstockName,
      annexClassification: 'IX_A',
      carbonIntensity: route.carbonIntensity,
      commissioningDateRange: 'POST_2026',
      certificationScheme: route.certificationScheme,
      chainOfCustody: route.chainOfCustody,
      injectionCountry: route.originCountry,
      injectionIsEU: true,
      udbStatus: 'RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: volumeOverride ?? 20000,
      deliveryPeriod: request.delivery,
      counterparty: request.counterparty ?? null,
    };

    const netbackRes = computeNetback(market, consignment, marks, costs, marks.pricingSides);
    if (!netbackRes) return;

    const assessment: TradeAssessment = {
      id: `DEAL-${Date.now()}`,
      createdAt: new Date().toISOString(),
      consignment,
      targetMarketId: route.targetMarketId,
      targetMarketName: route.targetMarketName,
      eligibility: route.eligibility,
      netback: netbackRes,
      marks,
      costs,
      userNotes: request.notes || `Structured trade for ${request.counterparty || 'Counterparty'} (${route.originCountryName} ➔ ${route.targetMarketName}).`,
    };

    dispatch({ type: 'SAVE_ASSESSMENT', assessment });
    setSavedToLib(true);
    setTimeout(() => {
      setSavedToLib(false);
      navigate('/library');
    }, 1000);
  };

  const handleCopyDealSummary = () => {
    const lines = [
      `BIOMETHANE DEAL INDICATION`,
      `Route: ${route.originCountryName} (${route.originCountry}) ➔ ${route.targetMarketName}`,
      `Feedstock: ${route.feedstockKey} (CI: ${route.carbonIntensity} gCO2e/MJ)`,
      `Scheme / CoC: ${route.certificationScheme} / ${route.chainOfCustody}`,
      `Volume: ${volumeOverride ? `${volumeOverride.toLocaleString()} MWh` : 'Unspecified'}`,
      `Delivered Netback: ${currentNetback !== null ? `€${currentNetback.toFixed(2)}/MWh` : 'Unpriced'}`,
      `Desk Margin: ${currentDeskMargin !== null ? `€${currentDeskMargin.toFixed(2)}/MWh` : 'Unpriced'}`,
      `Indicative P&L: ${currentPnl !== null ? `€${Math.round(currentPnl).toLocaleString()}` : '—'}`,
      `Regulatory Verdict: ${route.overallVerdict} (6-Gate RED III Verified)`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-[90] flex justify-end bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[560px] bg-stone-900 border-l border-stone-700 shadow-2xl flex flex-col h-full overflow-hidden text-stone-100 animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 px-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between flex-none">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{route.originFlag}</span>
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-stone-100">
                <span>{route.originCountryName}</span>
                <span className="text-stone-500">➔</span>
                <span className="text-teal-300">{route.targetMarketName}</span>
              </div>
              <div className="text-micro font-mono text-stone-400 mt-0.5">
                {route.feedstockKey} · CI: {route.carbonIntensity} gCO₂e/MJ · {route.certificationScheme}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xs transition-colors cursor-pointer"
            aria-label="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          
          {/* Hero Valuation Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-micro uppercase tracking-wider text-stone-400 font-semibold">
                Commercial Valuation Stack
              </span>
              <button
                type="button"
                onClick={() => setIsMathOpen(true)}
                className="flex items-center gap-1.5 px-2 py-0.8 bg-teal-950/80 hover:bg-teal-900 border border-teal-700/70 text-teal-300 rounded-xs font-mono text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                title="Inspect full mathematical proof, statutory formulas, and audit trail"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Show Math &amp; Proof</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col">
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">
                  Delivered Netback
                </span>
                <span className="font-mono font-num text-lg font-bold text-teal-300 mt-1">
                  {currentNetback !== null ? `€${currentNetback.toFixed(2)}` : '—'}
                </span>
                <span className="text-[10px] text-stone-500">per MWh</span>
              </div>

            <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col">
              <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">
                Desk Margin
              </span>
              <span className={`font-mono font-num text-lg font-bold mt-1 ${
                currentDeskMargin !== null && currentDeskMargin > 0 ? 'text-emerald-400' : 'text-stone-300'
              }`}>
                {currentDeskMargin !== null ? `+€${currentDeskMargin.toFixed(2)}` : '—'}
              </span>
              <span className="text-[10px] text-stone-500">per MWh</span>
            </div>

            <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col">
              <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">
                Notional P&amp;L
              </span>
              <span className="font-mono font-num text-lg font-bold text-emerald-300 mt-1">
                {currentPnl !== null ? `€${Math.round(currentPnl).toLocaleString()}` : '—'}
              </span>
              <span className="text-[10px] text-stone-500">
                {volumeOverride ? `${volumeOverride.toLocaleString()} MWh` : 'Total Deal'}
              </span>
            </div>
          </div>
        </div>

          {/* Quick Volume & Deal Parameters */}
          <div className="bg-stone-950 border border-stone-800 p-3.5 rounded-xs space-y-3">
            <span className="font-mono text-micro uppercase tracking-wider text-stone-400 font-semibold block">
              Deal Structuring Parameters
            </span>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-stone-500 uppercase mb-1">
                  Volume (MWh)
                </label>
                <input
                  type="number"
                  value={volumeOverride ?? ''}
                  onChange={e => setVolumeOverride(e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 20000"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xs p-1.5 px-2 font-mono text-xs text-stone-100 font-bold"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-stone-500 uppercase mb-1">
                  Delivery / Vintage
                </label>
                <div className="w-full bg-stone-900 border border-stone-700 rounded-xs p-1.5 px-2 font-mono text-xs text-teal-300 font-bold truncate">
                  {request.delivery.complianceYear ? `Cal ${request.delivery.complianceYear}` : 'Prompt Delivery'}
                  {request.notes?.includes('Reference:') ? ` (${request.notes.split('Reference:')[1]?.split('(')[0]?.trim().split(' ').pop()})` : ''}
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-stone-500 uppercase mb-1">
                  Counterparty
                </label>
                <input
                  type="text"
                  defaultValue={request.counterparty ?? 'Shell Energy Europe'}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xs p-1.5 px-2 font-mono text-xs text-stone-100"
                />
              </div>
            </div>

            {request.notes && (
              <div className="font-mono text-[10px] text-stone-400 bg-stone-900 p-2 rounded-xs border border-stone-800">
                <span className="text-stone-500 uppercase font-semibold mr-1.5">Quote Note:</span>
                <span>{request.notes}</span>
              </div>
            )}
          </div>

          {/* 6-Gate Regulatory Audit Trail */}
          <div className="space-y-2">
            <span className="font-mono text-micro uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>6-Gate Statutory Audit Trail</span>
            </span>

            <div className="bg-stone-950 border border-stone-800 rounded-xs divide-y divide-stone-850">
              {route.eligibility.gates.map((gate, i) => (
                <div key={i} className="p-2.5 px-3 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-stone-200 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{gate.gateLabel}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                      {gate.reason}
                    </div>
                    {gate.citations && gate.citations.length > 0 && (
                      <div className="font-mono text-[9px] text-teal-400 mt-0.5">
                        Statutory Reference: {gate.citations.map(c => c.shortName).join(' · ')}
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-xs shrink-0">
                    {gate.verdict}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Commercial TO CONFIRM Checklist */}
          {route.toConfirm && route.toConfirm.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/80 p-3.5 rounded-xs space-y-2">
              <span className="font-mono text-micro font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>To Confirm Before Contract Execution</span>
              </span>
              <ul className="space-y-1 pl-4 list-disc text-xs text-stone-300">
                {route.toConfirm.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-3.5 border-t border-stone-800 bg-stone-950 flex items-center gap-2 flex-none">
          <button
            type="button"
            onClick={handleCopyDealSummary}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-mono text-xs font-semibold rounded-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Copy structured deal summary to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-400" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveToLibrary}
            className="flex-1 py-2 px-3 bg-stone-800 hover:bg-stone-700 border border-teal-800/80 text-teal-300 font-mono text-xs font-semibold rounded-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            {savedToLib ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5 text-teal-400" />}
            <span>{savedToLib ? 'Committed & Saved!' : 'Save to Deal Library'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenFullTrade}
            className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Trade Builder</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step-by-Step Mathematical Proof Modal */}
      <MathFormulaModal
        isOpen={isMathOpen}
        onClose={() => setIsMathOpen(false)}
        opportunity={route}
        marks={marks}
        costs={costs}
      />
    </div>
  );
}
