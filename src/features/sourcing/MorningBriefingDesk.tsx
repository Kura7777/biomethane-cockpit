import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  RotateCcw,
  Zap,
  Clock,
  FileSpreadsheet,
  Camera,
} from 'lucide-react';
import { useAppState } from '../../store/context';
import { getAssumption } from '../../domain/assumptions/registry';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import {
  generateMorningBriefing,
  MorningBriefingSummary,
  OvernightPriceMover,
  OriginationOpportunity,
} from '../../domain/briefing';

interface MorningBriefingDeskProps {
  onSwitchToSourcing?: () => void;
}

export function MorningBriefingDesk({ onSwitchToSourcing }: MorningBriefingDeskProps) {
  const navigate = useNavigate();
  const { state, dispatch, priorCloseMarks, snapshotPriorClose } = useAppState();
  const assumptionsVersion = useAssumptionsVersion();

  const [stalenessFilter, setStalenessFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'UNFILLED'>('ALL');
  // Reference deal size is a desk assumption (Pricing desk → Desk assumptions), not a literal here.
  const [dealVolume] = useState<number>(() => getAssumption('deal.defaultVolumeMwh'));
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  // Generate briefing dynamically from current state, benchmarked against priorCloseMarks snapshot if set
  const briefing: MorningBriefingSummary = useMemo(() => {
    return generateMorningBriefing({
      currentMarks: state.marks,
      previousMarks: priorCloseMarks,
      costs: state.costs,
      selectedFeedstockKey: 'manure',
      defaultDealVolumeMWh: dealVolume,
      asOfDate: new Date(),
    });
  }, [state.marks, priorCloseMarks, state.costs, dealVolume, assumptionsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStructureDeal = (opp: OriginationOpportunity) => {
    navigate(opp.structuredDealUrl);
  };

  const handleSnapshotPriorClose = () => {
    snapshotPriorClose(state.marks);
    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2500);
  };

  const filteredStalenessAlerts = useMemo(() => {
    const alerts = briefing.stalenessSummary.alerts;
    if (stalenessFilter === 'CRITICAL') {
      return alerts.filter(a => a.stalenessStatus === 'STALE_CRITICAL');
    }
    if (stalenessFilter === 'WARNING') {
      return alerts.filter(a => a.stalenessStatus === 'STALE_WARNING');
    }
    if (stalenessFilter === 'UNFILLED') {
      return alerts.filter(a => a.stalenessStatus === 'UNFILLED');
    }
    return alerts;
  }, [briefing.stalenessSummary.alerts, stalenessFilter]);

  const getMoverDirectionBadge = (mover: OvernightPriceMover) => {
    const badgeTitle = mover.badgeLabel || (briefing.isBaseline ? 'Δ vs. Desk Baseline' : '24h Overnight Change');
    if (mover.direction === 'UP') {
      return (
        <span
          className="inline-flex items-center gap-1 font-mono text-micro font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded"
          title={badgeTitle}
        >
          <TrendingUp className="w-3 h-3" aria-hidden="true" />
          <span className="font-num">+{mover.absoluteDelta?.toFixed(2)}</span>
          {mover.percentageDelta !== null && (
            <span className="font-num">({mover.percentageDelta > 0 ? '+' : ''}{mover.percentageDelta.toFixed(1)}%)</span>
          )}
        </span>
      );
    }
    if (mover.direction === 'DOWN') {
      return (
        <span
          className="inline-flex items-center gap-1 font-mono text-micro font-semibold text-red-400 bg-red-950/60 border border-red-800 px-1.5 py-0.5 rounded"
          title={badgeTitle}
        >
          <TrendingDown className="w-3 h-3" aria-hidden="true" />
          <span className="font-num">{mover.absoluteDelta?.toFixed(2)}</span>
          {mover.percentageDelta !== null && (
            <span className="font-num">({mover.percentageDelta.toFixed(1)}%)</span>
          )}
        </span>
      );
    }
    if (mover.direction === 'UNCHANGED') {
      return (
        <span
          className="inline-flex items-center gap-1 font-mono text-micro font-semibold text-stone-400 bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded"
          title={badgeTitle}
        >
          <Minus className="w-3 h-3" aria-hidden="true" />
          <span className="font-num">0.00 (0.0%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-micro text-stone-500 bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded">
        Unquoted
      </span>
    );
  };

  const getImpactBadge = (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (level === 'HIGH') {
      return (
        <span className="font-mono text-micro font-semibold text-red-400 bg-red-950/80 border border-red-800 px-1.5 py-0.5 rounded uppercase">
          High Impact
        </span>
      );
    }
    if (level === 'MEDIUM') {
      return (
        <span className="font-mono text-micro font-semibold text-amber-400 bg-amber-950/80 border border-amber-800 px-1.5 py-0.5 rounded uppercase">
          Medium Impact
        </span>
      );
    }
    return (
      <span className="font-mono text-micro font-semibold text-sky-400 bg-sky-950/80 border border-sky-800 px-1.5 py-0.5 rounded uppercase">
        Low Impact
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-stone-950 text-stone-100 overflow-y-auto">
      {/* 1. TOP EXECUTIVE BRIEFING HEADER & MACRO HEADLINE */}
      <div className="p-4 border-b border-stone-800 bg-stone-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="font-mono text-micro font-bold tracking-[0.14em] uppercase text-teal-400 bg-teal-950 border border-teal-800 px-2 py-0.5 rounded">
              Daily Executive Terminal
            </span>
            <span className="font-mono text-meta text-stone-400">
              Generated: {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
            </span>
            <span
              data-testid="desk-baseline-indicator"
              className={`font-mono text-micro font-semibold px-2 py-0.5 rounded border ${
                briefing.isBaseline
                  ? 'text-amber-400 bg-amber-950/60 border-amber-800'
                  : 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
              }`}
            >
              {briefing.benchmarkLabel}
            </span>
          </div>
          <h1 className="m-0 font-mono text-lg font-bold text-stone-100 tracking-tight">
            Morning Market Briefing &amp; Actionable Origination Desk
          </h1>
          <p className="m-0 mt-0.5 text-xs text-stone-300 max-w-4xl leading-relaxed">
            {briefing.macroHeadline}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleSnapshotPriorClose}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer border ${
              snapshotSuccess
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
            }`}
            title="Snapshot Current Marks as Prior Close into localStorage"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <span>{snapshotSuccess ? 'Snapshotted!' : 'Snapshot Current Marks as Prior Close'}</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SIMULATE_DESK' })}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer"
            aria-label="Refresh simulated desk marks"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <span>Simulate / Refresh</span>
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/marks')}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer"
            aria-label="Open Marks Matrix"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <span>Marks Matrix</span>
          </button>

          {onSwitchToSourcing && (
            <button
              type="button"
              onClick={onSwitchToSourcing}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-bold border border-teal-500 px-3.5 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer shadow-xs"
              aria-label="Switch to Sourcing Intake Desk"
            >
              <span>Sourcing Desk</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-[1800px] w-full mx-auto">
        {/* 2. OVERNIGHT PRICE MOVERS GRID */}
        <section aria-labelledby="overnight-movers-title">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-400" aria-hidden="true" />
              <h2 id="overnight-movers-title" className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-stone-200">
                Market Movers (European Indices &amp; Foreign Exchange)
              </h2>
              <span
                data-testid="overnight-move-badge"
                className={`font-mono text-micro font-bold px-2 py-0.5 rounded border ${
                  briefing.isBaseline
                    ? 'text-amber-400 bg-amber-950/60 border-amber-800'
                    : 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                }`}
              >
                {briefing.benchmarkLabel}
              </span>
            </div>
            <span className="font-mono text-meta text-stone-400">
              {briefing.isBaseline ? 'Desk Reference Benchmark' : 'Prior Session Snapshot Comparison'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {briefing.overnightMovers.map((mover) => (
              <div
                key={mover.instrumentId}
                className="bg-stone-900 border border-stone-800 p-3 flex flex-col justify-between hover:border-stone-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono text-micro font-semibold uppercase tracking-wider text-stone-400">
                      {mover.instrumentName}
                    </span>
                    {getMoverDirectionBadge(mover)}
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-mono text-xl font-bold text-stone-100 font-num">
                      {mover.currentPrice !== null ? mover.currentPrice.toFixed(mover.instrumentId.startsWith('FX_') || mover.instrumentId === 'NL_ERE' || mover.instrumentId === 'UK_RTFO' ? 3 : 2) : 'Unquoted'}
                    </span>
                    <span className="font-mono text-micro text-stone-400">
                      {mover.unitOfAccount}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800/80 space-y-1">
                  <div className="flex justify-between items-center text-micro font-mono text-stone-400">
                    <span>{mover.isBaseline ? 'Desk Baseline:' : 'Prior Close:'}</span>
                    <span className="font-num text-stone-300">
                      {mover.previousPrice !== null ? mover.previousPrice.toFixed(mover.instrumentId.startsWith('FX_') || mover.instrumentId === 'NL_ERE' || mover.instrumentId === 'UK_RTFO' ? 3 : 2) : '—'}
                    </span>
                  </div>
                  <p className="text-micro text-stone-400 leading-tight line-clamp-2">
                    {mover.commentary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. TOP ARBITRAGE ORIGINATION CORRIDORS */}
        <section aria-labelledby="top-corridors-title">
          <div className="flex items-center justify-between mb-2.5">
            <h2 id="top-corridors-title" className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-stone-200">
              Top Ranked European Cross-Border Arbitrage Corridors
            </h2>
            <span className="font-mono text-meta text-stone-400">
              Ranked by Net Realizable Desk Margin (€/MWh)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {briefing.topArbitrageCorridors.map((opp) => (
              <div
                key={opp.corridorId}
                className="bg-stone-900 border border-stone-800 p-3.5 flex flex-col justify-between hover:border-stone-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-micro font-bold text-teal-400 bg-teal-950 border border-teal-800 px-1.5 py-0.5 rounded">
                      RANK #{opp.corridorRank}
                    </span>
                    <span className="font-mono text-micro text-emerald-400 font-semibold">
                      {opp.complianceVerdict}
                    </span>
                  </div>

                  <div className="font-mono text-sm font-bold text-stone-100 mb-1">
                    {opp.originCountry} ➔ {opp.targetMarketName}
                  </div>
                  <div className="text-micro text-stone-400 mb-3">
                    {opp.feedstockName} · CI: {opp.carbonIntensity} gCO2e/MJ
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2 bg-stone-950 border border-stone-800/80 mb-3">
                    <div>
                      <div className="font-mono text-micro text-stone-400 uppercase">Gross Stack</div>
                      <div className="font-mono text-sm font-semibold text-stone-200 font-num">
                        €{opp.grossDeliveredValueEurPerMWh.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-micro text-stone-400 uppercase">Procurement</div>
                      <div className="font-mono text-sm font-semibold text-stone-200 font-num">
                        €{opp.producerProcurementEurPerMWh.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-micro text-stone-400 uppercase">Logistics</div>
                      <div className="font-mono text-sm font-semibold text-stone-200 font-num">
                        €{opp.logisticsTariffEurPerMWh.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-micro text-stone-400 uppercase">Net Margin</div>
                      <div className="font-mono text-sm font-bold text-teal-400 font-num">
                        €{opp.deskMarginEurPerMWh.toFixed(2)}/MWh
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStructureDeal(opp)}
                  className="w-full flex items-center justify-center gap-1.5 bg-teal-950 hover:bg-teal-900 border border-teal-800 text-teal-300 font-mono text-xs font-semibold py-1.5 rounded transition-colors cursor-pointer"
                >
                  <span>1-Click Structure Deal</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 4. REGULATORY WATCH & MARK STALENESS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section aria-labelledby="regulatory-tracker-title" className="bg-stone-900 border border-stone-800 p-4 flex flex-col">
            <h2 id="regulatory-tracker-title" className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-stone-200 mb-3 border-b border-stone-800 pb-2">
              Statutory Consultations &amp; Policy Milestones
            </h2>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px]">
              {briefing.regulatoryUpdates.map((item) => (
                <div key={item.id} className="bg-stone-950 border border-stone-800 p-3 rounded text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono font-bold text-stone-200">{item.title}</span>
                    {getImpactBadge(item.impactLevel)}
                  </div>
                  <div className="font-mono text-micro text-teal-400/90 mb-1">
                    {item.legalBasis} · Effective: {item.effectiveDate}
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed mb-2">
                    {item.summaryExcerpt}
                  </p>
                  <div className="pt-2 border-t border-stone-800/80 font-mono text-micro text-amber-400/90 bg-stone-900/60 p-2 rounded">
                    <strong className="text-stone-300">Desk Advisory: </strong>
                    {item.tradingDeskImpact}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="mark-freshness-title" className="bg-stone-900 border border-stone-800 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" aria-hidden="true" />
                <h2 id="mark-freshness-title" className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-stone-200">
                  Mark Freshness &amp; Staleness Monitoring
                </h2>
              </div>
              <div className="flex items-center gap-1 font-mono text-micro">
                <button
                  type="button"
                  onClick={() => setStalenessFilter('ALL')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${stalenessFilter === 'ALL' ? 'bg-teal-600 text-teal-950 font-bold' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
                >
                  All ({briefing.stalenessSummary.totalTracked})
                </button>
                <button
                  type="button"
                  onClick={() => setStalenessFilter('CRITICAL')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${stalenessFilter === 'CRITICAL' ? 'bg-red-600 text-red-950 font-bold' : 'bg-stone-800 text-red-400 hover:text-red-300'}`}
                >
                  &gt;30d ({briefing.stalenessSummary.criticalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStalenessFilter('WARNING')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${stalenessFilter === 'WARNING' ? 'bg-amber-600 text-amber-950 font-bold' : 'bg-stone-800 text-amber-400 hover:text-amber-300'}`}
                >
                  7-30d ({briefing.stalenessSummary.warningCount})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-stone-950 border border-stone-800 p-2 text-center">
                <div className="font-mono text-micro text-stone-400 uppercase">Fresh (&lt;7d)</div>
                <div className="font-mono text-base font-bold text-emerald-400 font-num">
                  {briefing.stalenessSummary.freshCount}
                </div>
              </div>
              <div className="bg-stone-950 border border-stone-800 p-2 text-center">
                <div className="font-mono text-micro text-stone-400 uppercase">Warning (7-30d)</div>
                <div className="font-mono text-base font-bold text-amber-400 font-num">
                  {briefing.stalenessSummary.warningCount}
                </div>
              </div>
              <div className="bg-stone-950 border border-stone-800 p-2 text-center">
                <div className="font-mono text-micro text-stone-400 uppercase">Critical (&gt;30d)</div>
                <div className="font-mono text-base font-bold text-red-400 font-num">
                  {briefing.stalenessSummary.criticalCount}
                </div>
              </div>
              <div className="bg-stone-950 border border-stone-800 p-2 text-center">
                <div className="font-mono text-micro text-stone-400 uppercase">Unfilled</div>
                <div className="font-mono text-base font-bold text-stone-400 font-num">
                  {briefing.stalenessSummary.unfilledCount}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[360px] pr-1">
              {filteredStalenessAlerts.map((alert) => (
                <div
                  key={alert.marketId}
                  className="bg-stone-950 border border-stone-800 p-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-200">
                        {alert.marketId}
                      </span>
                      <span className="text-stone-400 truncate max-w-[200px]">
                        {alert.marketName}
                      </span>
                    </div>
                    <div className="text-micro text-stone-400 mt-0.5">
                      {alert.recommendation}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                    <div>
                      <div className="font-mono font-bold text-stone-100 font-num">
                        {alert.currentMid !== null ? `${alert.currentMid} ${alert.unitLabel}` : 'No Mark'}
                      </div>
                      <div className="font-mono text-micro text-stone-400 font-num">
                        {alert.ageDays !== null ? `${alert.ageDays}d old` : 'Never updated'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/marks')}
                      className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-2 py-1 rounded text-micro font-mono border border-stone-700 transition-colors cursor-pointer"
                      aria-label={`Update mark for ${alert.marketId}`}
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
