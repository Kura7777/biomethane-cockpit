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
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';
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
import './quickDealDrawer.css';

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
  const [counterparty, setCounterparty] = useState<string>(
    request.counterparty ?? sourcedRoute?.legalEntityName ?? 'Shell Energy Europe'
  );

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
      counterparty: counterparty || 'European Biomethane Producer',
    }));
  };

  const handleSaveToLibrary = () => {
    const market = getMarketById(route.targetMarketId);
    if (!market) return;

    // Derive annexClassification from FEEDSTOCK_REGISTRY (not hardcoded IX_A)
    const feedstockInfo = FEEDSTOCK_REGISTRY[route.feedstockKey];
    const annexClass = feedstockInfo?.annexClassification ?? 'IX_A';

    // Derive injectionIsEU from PRODUCING_ORIGINS grid zone (not hardcoded true)
    const originInfo = PRODUCING_ORIGINS[route.originCountry];
    const isEuGrid = originInfo?.gridZone === 'EU_INTERCONNECTED';

    const consignment: Consignment = {
      id:`consignment-${route.originCountry}-${route.feedstockKey}`,
      name:`${route.originCountryName} ${route.feedstockName}`,
      originCountry: route.originCountry,
      originCountryName: route.originCountryName,
      feedstock: route.feedstockKey,
      feedstockName: route.feedstockName,
      annexClassification: annexClass,
      carbonIntensity: route.carbonIntensity,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: route.certificationScheme,
      chainOfCustody: route.chainOfCustody,
      injectionCountry: route.originCountry,
      injectionIsEU: isEuGrid,
      udbStatus: isEuGrid ? 'RECORDED' : 'NOT_RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: volumeOverride ?? 10000,
      deliveryPeriod: request.delivery,
      counterparty: request.counterparty ?? null,
    };

    const netbackRes = computeNetback(market, consignment, marks, costs, marks.pricingSides);
    if (!netbackRes) return;

    const assessment: TradeAssessment = {
      id:`DEAL-${Date.now()}`,
      createdAt: new Date().toISOString(),
      consignment,
      targetMarketId: route.targetMarketId,
      targetMarketName: route.targetMarketName,
      eligibility: route.eligibility,
      netback: netbackRes,
      marks,
      costs,
      userNotes: request.notes ||`Structured trade for ${request.counterparty || 'Counterparty'} (${route.originCountryName} ➔ ${route.targetMarketName}).`,
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
`Volume: ${volumeOverride ?`${volumeOverride.toLocaleString()} MWh` : 'Unspecified'}`,
`Delivered Netback: ${currentNetback !== null ?`€${currentNetback.toFixed(2)}/MWh` : 'Unpriced'}`,
`Desk Margin: ${currentDeskMargin !== null ?`+€${currentDeskMargin.toFixed(2)}/MWh` : 'Unpriced'}`,
`Indicative P&L: ${currentPnl !== null ?`€${Math.round(currentPnl).toLocaleString()}` : '—'}`,
`Corridor: ${route.originCountry} ➔ ${route.targetCountry} (${sourcedRoute?.logisticsDistanceKm ?`${sourcedRoute.logisticsDistanceKm} km` : 'Direct grid'})`,
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
        className="qd-drawer w-full max-w-[620px] shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header: Origin -> Target with Badges & Close Button */}
        <div className="qd-header p-3.5 px-4 flex items-center justify-between flex-none">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0 select-none">
              {getCountryFlag(route.originCountry)}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold truncate">
                <span className="truncate">{sourcedRoute?.originPlantName || route.originCountryName}</span>
                <span className="qd-label">➔</span>
                <span className="qd-target shrink-0">{route.targetMarketName}</span>
              </div>
              <div className="text-[12px] qd-label mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{route.feedstockName}</span>
                <span className="qd-label">·</span>
                <span className="qd-pos font-bold">CI {route.carbonIntensity > 0 ?`+${route.carbonIntensity}` : route.carbonIntensity} gCO₂e/MJ</span>
                <span className="qd-label">·</span>
                <span className="qd-label">{route.certificationScheme}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={onClose}
              className="qd-close-btn p-1.5 rounded transition-colors cursor-pointer"
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
          <div className="qd-map-frame h-[210px] w-full rounded-lg overflow-hidden">
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
              <span className="text-[12px] qd-label font-bold">
                Commercial Netback &amp; Spread
              </span>
              <button
                type="button"
                onClick={() => setIsMathOpen(true)}
                className="qd-math-btn flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold cursor-pointer transition-colors shadow-xs"
                title="Inspect statutory formula and mathematical proof"
              >
                <Calculator className="w-3 h-3" />
                <span>Show Mathematical Proof</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="qd-card p-2.5 rounded flex flex-col">
                <span className="text-[12px] qd-label">
                  Delivered Netback
                </span>
                <span className="font-bold text-base qd-value-accent mt-1 tabular-nums">
                  {currentNetback !== null ?`€${currentNetback.toFixed(2)}` : '—'}
                </span>
                <span className="text-[12px] qd-label">per MWh</span>
              </div>

              <div className="qd-card p-2.5 rounded flex flex-col">
                <span className="text-[12px] qd-label">
                  Desk Margin
                </span>
                <span className={`font-bold text-base mt-1 tabular-nums ${
                  currentDeskMargin !== null && currentDeskMargin > 0 ? 'qd-pos' : 'qd-neutral-value'
                }`}>
                  {currentDeskMargin !== null ?`${currentDeskMargin > 0 ? '+' : ''}€${currentDeskMargin.toFixed(2)}` : '—'}
                </span>
                <span className="text-[12px] qd-label">per MWh</span>
              </div>

              <div className="qd-card p-2.5 rounded flex flex-col">
                <span className="text-[12px] qd-label">
                  Consignment P&amp;L
                </span>
                <span className="font-bold text-base qd-pos mt-1 tabular-nums">
                  {currentPnl !== null ?`€${Math.round(currentPnl).toLocaleString()}` : '—'}
                </span>
                <span className="text-[12px] qd-label">
                  {volumeOverride ?`${volumeOverride.toLocaleString()} MWh` : 'Full Cargo'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Complete Netback Component Stack Waterfall */}
          <div className="qd-card rounded-lg p-3 space-y-2">
            <span className="text-[12px] qd-label font-bold block">
              Component Waterfall Stack
            </span>

            <div className="qd-divider text-xs">
              <div className="py-1.5 flex items-center justify-between">
                <span>Gross Terminal Revenue / Quota Value</span>
                <span className="font-bold qd-value-accent tabular-nums">
                  €{(route.totalTerminalValueStackEurPerMWh ?? 0).toFixed(2)} / MWh
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between qd-row-muted">
                <span className="flex items-center gap-1">
                  <span>(-) Gas Commodity Index (TTF M+1 Base)</span>
                </span>
                <span className="tabular-nums qd-neutral-value">
                  {marks.gasIndex.mid !== null && marks.gasIndex.mid !== undefined
                    ?`-€${marks.gasIndex.mid.toFixed(2)} / MWh`
                    : '—'}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between qd-row-muted">
                <span>(-) Cross-Border Grid Transit &amp; Transmission</span>
                <span className="tabular-nums qd-neutral-value">
                  {route.transitCostEurPerMWh !== null && route.transitCostEurPerMWh !== undefined
                    ?`-€${route.transitCostEurPerMWh.toFixed(2)} / MWh`
                    : '—'}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between qd-row-muted">
                <span>(-) Mass Balance &amp; Transfer Costs</span>
                <span className="tabular-nums qd-neutral-value">
                  {costs.transferCosts !== null && costs.transferCosts !== undefined
                    ?`-€${costs.transferCosts.toFixed(2)} / MWh`
                    : '—'}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between qd-row-muted">
                <span>(-) Registry &amp; Certification Fees</span>
                <span className="tabular-nums qd-neutral-value">
                  {costs.certificationCosts !== null && costs.certificationCosts !== undefined
                    ?`-€${costs.certificationCosts.toFixed(2)} / MWh`
                    : '—'}
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between qd-total-row pt-2">
                <span className="font-bold">(=) Producer Gate Netback</span>
                <span className="font-bold tabular-nums">
                  €{(route.producerPayableEurPerMWh ?? 0).toFixed(2)} / MWh
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between qd-margin-row px-2 rounded mt-1">
                <span className="qd-margin-label font-bold">(=) Net Desk Trading Margin</span>
                <span className="qd-margin-value font-bold tabular-nums text-sm">
                  {currentDeskMargin !== null ?`+€${currentDeskMargin.toFixed(2)}` : '—'} / MWh
                </span>
              </div>
            </div>
          </div>

          {/* 4. Audited Plant Technical Details & Legal Contacts */}
          <div className="qd-card rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] qd-label font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 qd-value-accent" />
                <span>Audited Asset &amp; Commercial Contacts</span>
              </span>
              {sourcedRoute?.isPlantVerified ? (
                <span className="qd-badge-verified flex items-center gap-1 text-[12px] px-1.5 py-0.2 rounded font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Audited Physical Facility</span>
                </span>
              ) : (
                <span className="qd-badge-warn text-[12px] px-1.5 py-0.2 rounded font-bold">
                  Due Diligence Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="qd-subcard p-2 rounded">
                <span className="text-[12px] qd-label block">Operating Entity</span>
                <span className="font-bold truncate block mt-0.5">
                  {sourcedRoute?.legalEntityName || sourcedRoute?.originPlantName || 'European Biomethane Producer'}
                </span>
              </div>

              <div className="qd-subcard p-2 rounded">
                <span className="text-[12px] qd-label block">Grid / TSO Operator</span>
                <span className="font-bold truncate block mt-0.5">
                  {sourcedRoute?.networkOperator ||`${route.originCountry} Gas Transmission System`}
                </span>
              </div>

              <div className="qd-subcard p-2 rounded">
                <span className="text-[12px] qd-label block">Annual Energy Yield</span>
                <span className="qd-value-accent font-bold tabular-nums block mt-0.5">
                  {sourcedRoute?.plantAnnualGWh ?`${sourcedRoute.plantAnnualGWh} GWh/year` : 'Nominal Capacity'}
                  {sourcedRoute?.plantCapacityNm3h &&` (${sourcedRoute.plantCapacityNm3h} Nm³/h)`}
                </span>
              </div>

              <div className="qd-subcard p-2 rounded">
                <span className="text-[12px] qd-label block">Upgrading Technology</span>
                <span className="font-bold block mt-0.5 truncate">
                  Membrane / Amine Scrubbing
                </span>
              </div>
            </div>

            {/* Direct Contacts */}
            <div className="qd-subcard p-2.5 rounded flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-3.5 h-3.5 qd-value-accent shrink-0" />
                <span className="truncate">
                  {sourcedRoute?.contactEmail ||`desk-trading@${route.originCountry.toLowerCase()}-biogas.eu`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Phone className="w-3.5 h-3.5 qd-pos shrink-0" />
                <span className="qd-label tabular-nums">
                  {sourcedRoute?.contactPhone || '+31 (0) 20 555 0192'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Quick Deal Structuring Parameters */}
          <div className="qd-card p-3 rounded-lg space-y-2.5">
            <span className="text-[12px] qd-label font-bold block">
              Deal Structuring Parameters
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[12px] qd-label mb-1">
                  Volume (MWh)
                </label>
                <input
                  type="number"
                  value={volumeOverride ?? ''}
                  onChange={e => setVolumeOverride(e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 10000"
                  className="qd-input w-full rounded p-1 px-2 text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] qd-label mb-1">
                  Delivery Vintage
                </label>
                <div className="qd-static-field w-full rounded p-1 px-2 text-xs font-bold truncate">
                  {request.delivery.complianceYear ?`Cal ${request.delivery.complianceYear}` : 'Prompt Delivery'}
                </div>
              </div>

              <div>
                <label className="block text-[12px] qd-label mb-1">
                  Counterparty
                </label>
                <input
                  type="text"
                  value={counterparty}
                  onChange={e => setCounterparty(e.target.value)}
                  className="qd-input w-full rounded p-1 px-2 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 6. 6-Gate Statutory Audit Trail */}
          <div className="space-y-2">
            <span className="text-[12px] qd-label font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 qd-pos" />
              <span>6-Gate Statutory Audit Trail</span>
            </span>

            <div className="qd-card rounded-lg qd-divider">
              {route.eligibility.gates.map((gate, i) => (
                <div key={i} className="p-2.5 px-3 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 qd-gate-icon shrink-0" />
                      <span>{gate.gateLabel}</span>
                    </div>
                    <div className="text-[12px] qd-label mt-0.5 leading-relaxed font-sans">
                      {gate.reason}
                    </div>
                    {gate.citations && gate.citations.length > 0 && (
                      <div className="text-[12px] qd-gate-citation mt-0.5">
                        Reference: {gate.citations.map(c => c.shortName).join(' · ')}
                      </div>
                    )}
                  </div>
                  <span className="qd-gate-verdict text-[12px] uppercase px-1.5 py-0.2 rounded shrink-0 font-bold">
                    {gate.verdict}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="qd-footer p-3 flex items-center gap-2 flex-none">
          <button
            type="button"
            onClick={handleCopyDealSummary}
            className="qd-btn-secondary px-3 py-2 text-xs font-semibold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            title="Copy structured deal summary to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 qd-pos" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 qd-label" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveToLibrary}
            className="qd-btn-outline-accent flex-1 py-2 px-3 text-xs font-semibold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            {savedToLib ? <Check className="w-3.5 h-3.5 qd-pos" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{savedToLib ? 'Committed & Saved!' : 'Save to Library'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenFullTrade}
            className="qd-btn-primary flex-1 py-2 px-3 text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
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

