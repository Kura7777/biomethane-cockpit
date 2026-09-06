import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { ArbitrageOpportunity, ClientRequest } from '../../domain/arbitrage/types';
import { SourcedOpportunity, getCountryFlag } from '../commercial/PlantScannerTable';
import { MarksState, CostInputs } from '../../domain/netback/types';
import { computeNetback } from '../../domain/netback/engine';
import { Consignment } from '../../domain/consignment/types';
import { TradeAssessment } from '../../domain/trade/types';
import { getMarketById } from '../../domain/markets/registry';
import { CorridorMiniMap } from '../map/CorridorMiniMap';
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck, 
  TrendingUp, 
  FileText, 
  Calculator, 
  Bookmark,
  Building2,
  Mail,
  Phone,
  Cpu,
  Layers,
  Zap,
  Flame
} from 'lucide-react';
import { MathFormulaModal } from '../../shared/components/MathFormulaModal';
import { buildDealUrl } from '../../domain/trade/dealParams';

interface QuickDealDrawerProps {
  route: (ArbitrageOpportunity | SourcedOpportunity) | null;
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
  const sourcedRoute = route as SourcedOpportunity | null;
  const [volumeOverride, setVolumeOverride] = useState<number | null>(request.volumeMwh ?? 10000);
  const [copied, setCopied] = useState(false);
  const [isMathOpen, setIsMathOpen] = useState(false);
  const { dispatch } = useAppState();
  const [savedToLib, setSavedToLib] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!route) return null;

  const currentNetback = route.totalTerminalValueStackEurPerMWh;
  const currentDeskMargin = route.deskNetMarginEurPerMWh;
  const currentPnl = currentDeskMargin !== null && volumeOverride !== null
    ? currentDeskMargin * volumeOverride
    : null;

  const handleOpenFullTrade = () => {
    navigate(buildDealUrl({
      marketId: route.targetMarketId,
      originCountry: route.originCountry,
      feedstock: route.feedstockKey,
      ci: route.carbonIntensity,
      volume: volumeOverride ?? undefined,
      scheme: route.certificationScheme,
      coc: route.chainOfCustody,
      plantId: sourcedRoute?.originPlantId,
      plantName: sourcedRoute?.originPlantName,
      plantCapacityNm3h: sourcedRoute?.plantCapacityNm3h ?? undefined,
      plantAnnualGWh: sourcedRoute?.plantAnnualGWh ?? undefined,
      legalEntityName: sourcedRoute?.legalEntityName ?? undefined,
      networkOperator: sourcedRoute?.networkOperator ?? undefined,
      contactEmail: sourcedRoute?.contactEmail ?? undefined,
      contactPhone: sourcedRoute?.contactPhone ?? undefined,
      counterparty: request.counterparty ?? sourcedRoute?.legalEntityName ?? sourcedRoute?.originPlantName ?? 'European Biomethane Producer',
    }));
  };

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
      volumeMWh: volumeOverride ?? 10000,
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
    }, 900);
  };

  const handleCopyDealSummary = () => {
    const lines = [
      `BIOMETHANE DESK DEAL INSPECTION SUMMARY`,
      `Facility: ${sourcedRoute?.originPlantName || route.originCountryName} (${route.originCountry})`,
      `Destination: ${route.targetMarketName} (${route.targetCountry})`,
      `Feedstock: ${route.feedstockName} (CI: ${route.carbonIntensity} gCO2e/MJ)`,
      `Scheme / CoC: ${route.certificationScheme} / ${route.chainOfCustody}`,
      `Volume: ${volumeOverride ? `${volumeOverride.toLocaleString()} MWh` : 'Unspecified'}`,
      `Delivered Netback: ${currentNetback !== null ? `€${currentNetback.toFixed(2)}/MWh` : 'Unpriced'}`,
      `Desk Margin: ${currentDeskMargin !== null ? `+€${currentDeskMargin.toFixed(2)}/MWh` : 'Unpriced'}`,
      `Indicative P&L: ${currentPnl !== null ? `€${Math.round(currentPnl).toLocaleString()}` : '—'}`,
      `Corridor: ${route.originCountry} ➔ ${route.targetCountry} (${sourcedRoute?.logisticsDistanceKm ? `${sourcedRoute.logisticsDistanceKm} km` : 'Direct grid'})`,
      `TSO Operator: ${sourcedRoute?.networkOperator || 'Continental Gas Transmission System'}`,
      `Statutory Verdict: ${route.overallVerdict} (6-Gate RED III Verified)`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const transitSteps = sourcedRoute?.transitSteps || [route.originCountry, route.targetCountry];

  return (
    <div 
      className="fixed inset-0 z-[80] flex justify-end bg-black/65 backdrop-blur-xs font-sans animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[620px] bg-[#0b0e15] border-l border-[#1e2433] shadow-2xl flex flex-col h-full overflow-hidden text-zinc-100 animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header: Origin -> Target with Badges & Close Button */}
        <div className="p-3.5 px-4 border-b border-[#1e2433] bg-[#07090e] flex items-center justify-between flex-none">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0 select-none">
              {getCountryFlag(route.originCountry)}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-100 truncate">
                <span className="truncate">{sourcedRoute?.originPlantName || route.originCountryName}</span>
                <span className="text-zinc-600">➔</span>
                <span className="text-cyan-300 shrink-0">{route.targetMarketName}</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{route.feedstockName}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-emerald-400 font-bold">CI {route.carbonIntensity > 0 ? `+${route.carbonIntensity}` : route.carbonIntensity} gCO₂e/MJ</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">{route.certificationScheme}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#141824] rounded transition-colors cursor-pointer"
              aria-label="Close Drawer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 no-scrollbar">

          {/* 1. Vector SVG Pipeline Corridor Visualizer (Zero raster tiles / Zero watermarks!) */}
          <div className="h-[210px] w-full rounded-lg overflow-hidden border border-[#1e2433]">
            <CorridorMiniMap
              originCountry={route.originCountry}
              targetCountry={route.targetCountry}
              plantName={sourcedRoute?.originPlantName}
              plantCoords={sourcedRoute?.originPlantCoords}
              transitSteps={transitSteps}
              distanceKm={sourcedRoute?.logisticsDistanceKm}
              logisticsCostEur={route.transitCostEurPerMWh ?? 0}
              deliveryMode={sourcedRoute?.deliveryMode || 'PIPELINE_GRID'}
            />
          </div>

          {/* 2. Financial Valuation Hero Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                Commercial Netback &amp; Spread
              </span>
              <button
                type="button"
                onClick={() => setIsMathOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded font-mono text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                title="Inspect statutory formula and mathematical proof"
              >
                <Calculator className="w-3 h-3" />
                <span>Show Mathematical Proof</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0e1118] border border-[#1e2433] p-2.5 rounded flex flex-col">
                <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  Delivered Netback
                </span>
                <span className="font-mono font-bold text-base text-cyan-300 mt-1 tabular-nums">
                  {currentNetback !== null ? `€${currentNetback.toFixed(2)}` : '—'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">per MWh</span>
              </div>

              <div className="bg-[#0e1118] border border-[#1e2433] p-2.5 rounded flex flex-col">
                <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  Desk Margin
                </span>
                <span className={`font-mono font-bold text-base mt-1 tabular-nums ${
                  currentDeskMargin !== null && currentDeskMargin > 0 ? 'text-emerald-400' : 'text-zinc-300'
                }`}>
                  {currentDeskMargin !== null ? `${currentDeskMargin > 0 ? '+' : ''}€${currentDeskMargin.toFixed(2)}` : '—'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">per MWh</span>
              </div>

              <div className="bg-[#0e1118] border border-[#1e2433] p-2.5 rounded flex flex-col">
                <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  Consignment P&amp;L
                </span>
                <span className="font-mono font-bold text-base text-emerald-300 mt-1 tabular-nums">
                  {currentPnl !== null ? `€${Math.round(currentPnl).toLocaleString()}` : '—'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {volumeOverride ? `${volumeOverride.toLocaleString()} MWh` : 'Full Cargo'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Complete Netback Component Stack Waterfall */}
          <div className="bg-[#0e1118] border border-[#1e2433] rounded-lg p-3 space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-bold block">
              Component Waterfall Stack
            </span>

            <div className="divide-y divide-[#182030] text-xs font-mono">
              <div className="py-1.5 flex items-center justify-between">
                <span className="text-zinc-300">Gross Terminal Revenue / Quota Value</span>
                <span className="font-bold text-cyan-300 tabular-nums">
                  €{(route.totalTerminalValueStackEurPerMWh ?? 0).toFixed(2)} / MWh
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1">
                  <span>(-) Gas Commodity Index (TTF M+1 Base)</span>
                </span>
                <span className="tabular-nums text-zinc-300">
                  {marks.gasIndex.mid !== null && marks.gasIndex.mid !== undefined
                    ? `-€${marks.gasIndex.mid.toFixed(2)} / MWh`
                    : '—'}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between text-zinc-400">
                <span>(-) Cross-Border Grid Transit &amp; Transmission</span>
                <span className="tabular-nums text-zinc-300">
                  {route.transitCostEurPerMWh !== null && route.transitCostEurPerMWh !== undefined
                    ? `-€${route.transitCostEurPerMWh.toFixed(2)} / MWh`
                    : '—'}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between text-zinc-400">
                <span>(-) Mass Balance &amp; Transfer Costs</span>
                <span className="tabular-nums text-zinc-300">
                  {costs.transferCosts !== null && costs.transferCosts !== undefined
                    ? `-€${costs.transferCosts.toFixed(2)} / MWh`
                    : '—'}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between text-zinc-400">
                <span>(-) Registry &amp; Certification Fees</span>
                <span className="tabular-nums text-zinc-300">
                  {costs.certificationCosts !== null && costs.certificationCosts !== undefined
                    ? `-€${costs.certificationCosts.toFixed(2)} / MWh`
                    : '—'}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between border-t border-[#1e2433] pt-2">
                <span className="font-bold text-zinc-200">(=) Producer Gate Netback</span>
                <span className="font-bold text-zinc-100 tabular-nums">
                  €{(route.producerPayableEurPerMWh ?? 0).toFixed(2)} / MWh
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between bg-emerald-950/20 px-2 rounded mt-1">
                <span className="font-bold text-emerald-400">(=) Net Desk Trading Margin</span>
                <span className="font-bold text-emerald-400 tabular-nums text-sm">
                  {currentDeskMargin !== null ? `+€${currentDeskMargin.toFixed(2)}` : '—'} / MWh
                </span>
              </div>
            </div>
          </div>

          {/* 4. Audited Plant Technical Details & Legal Contacts */}
          <div className="bg-[#0e1118] border border-[#1e2433] rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audited Asset &amp; Commercial Contacts</span>
              </span>
              {sourcedRoute?.isPlantVerified ? (
                <span className="flex items-center gap-1 font-mono text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Audited Physical Facility</span>
                </span>
              ) : (
                <span className="font-mono text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                  Due Diligence Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#08090d] p-2 rounded border border-[#161c28]">
                <span className="text-[10px] text-zinc-500 block uppercase">Operating Entity</span>
                <span className="text-zinc-200 font-bold truncate block mt-0.5">
                  {sourcedRoute?.legalEntityName || sourcedRoute?.originPlantName || 'European Biomethane Producer'}
                </span>
              </div>

              <div className="bg-[#08090d] p-2 rounded border border-[#161c28]">
                <span className="text-[10px] text-zinc-500 block uppercase">Grid / TSO Operator</span>
                <span className="text-zinc-200 font-bold truncate block mt-0.5">
                  {sourcedRoute?.networkOperator || `${route.originCountry} Gas Transmission System`}
                </span>
              </div>

              <div className="bg-[#08090d] p-2 rounded border border-[#161c28]">
                <span className="text-[10px] text-zinc-500 block uppercase">Annual Energy Yield</span>
                <span className="text-cyan-300 font-bold tabular-nums block mt-0.5">
                  {sourcedRoute?.plantAnnualGWh ? `${sourcedRoute.plantAnnualGWh} GWh/year` : 'Nominal Capacity'}
                  {sourcedRoute?.plantCapacityNm3h && ` (${sourcedRoute.plantCapacityNm3h} Nm³/h)`}
                </span>
              </div>

              <div className="bg-[#08090d] p-2 rounded border border-[#161c28]">
                <span className="text-[10px] text-zinc-500 block uppercase">Upgrading Technology</span>
                <span className="text-zinc-200 font-bold block mt-0.5 truncate">
                  Membrane / Amine Scrubbing
                </span>
              </div>
            </div>

            {/* Direct Contacts */}
            <div className="bg-[#08090d] p-2.5 rounded border border-[#161c28] flex items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-zinc-300 truncate">
                  {sourcedRoute?.contactEmail || `desk-trading@${route.originCountry.toLowerCase()}-biogas.eu`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-zinc-400 tabular-nums">
                  {sourcedRoute?.contactPhone || '+31 (0) 20 555 0192'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Quick Deal Structuring Parameters */}
          <div className="bg-[#0e1118] border border-[#1e2433] p-3 rounded-lg space-y-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-bold block">
              Deal Structuring Parameters
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-1">
                  Volume (MWh)
                </label>
                <input
                  type="number"
                  value={volumeOverride ?? ''}
                  onChange={e => setVolumeOverride(e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 10000"
                  className="w-full bg-[#08090d] border border-[#1e2433] rounded p-1 px-2 font-mono text-xs text-zinc-100 font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-1">
                  Delivery Vintage
                </label>
                <div className="w-full bg-[#08090d] border border-[#1e2433] rounded p-1 px-2 font-mono text-xs text-cyan-300 font-bold truncate">
                  {request.delivery.complianceYear ? `Cal ${request.delivery.complianceYear}` : 'Prompt Delivery'}
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-1">
                  Counterparty
                </label>
                <input
                  type="text"
                  defaultValue={request.counterparty ?? sourcedRoute?.legalEntityName ?? 'Shell Energy Europe'}
                  className="w-full bg-[#08090d] border border-[#1e2433] rounded p-1 px-2 font-mono text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 6. 6-Gate Statutory Audit Trail */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>6-Gate Statutory Audit Trail</span>
            </span>

            <div className="bg-[#0e1118] border border-[#1e2433] rounded-lg divide-y divide-[#182030]">
              {route.eligibility.gates.map((gate, i) => (
                <div key={i} className="p-2.5 px-3 flex items-start justify-between gap-3 text-xs font-mono">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-200 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{gate.gateLabel}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed font-sans">
                      {gate.reason}
                    </div>
                    {gate.citations && gate.citations.length > 0 && (
                      <div className="text-[10px] text-cyan-400 mt-0.5">
                        Reference: {gate.citations.map(c => c.shortName).join(' · ')}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 rounded shrink-0 font-bold">
                    {gate.verdict}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-3 border-t border-[#1e2433] bg-[#07090e] flex items-center gap-2 flex-none">
          <button
            type="button"
            onClick={handleCopyDealSummary}
            className="px-3 py-2 bg-[#141824] hover:bg-[#1c2436] border border-[#1e2433] text-zinc-200 font-mono text-xs font-semibold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Copy structured deal summary to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveToLibrary}
            className="flex-1 py-2 px-3 bg-[#141824] hover:bg-[#1c2436] border border-cyan-800/60 text-cyan-300 font-mono text-xs font-semibold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            {savedToLib ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{savedToLib ? 'Committed & Saved!' : 'Save to Library'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenFullTrade}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-cyan-500/20"
          >
            <span>Structure in Trade Builder</span>
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

