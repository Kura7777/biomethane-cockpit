import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKETS } from '../../domain/markets/registry';
import { Market } from '../../domain/markets/types';
import { Consignment } from '../../domain/consignment/types';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { CopyButton } from '../../shared/components/CopyButton';
import { CitationBlock } from '../../shared/components/CitationBlock';
import { evaluateEligibility, evaluateAllMarkets } from '../../domain/eligibility/engine';
import { computeNetback, computeAllNetbacks, tCO2ePerMWh } from '../../domain/netback/engine';
import { rankNetbacks, getHighestBlockedOpportunity } from '../../domain/netback/ranking';
import { EligibilityAssessment } from '../../domain/eligibility/types';
import { RankedNetback } from '../../domain/netback/types';
import { 
  TrendingUp, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight, 
  Sliders, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  ArrowUpDown,
  Filter,
  BarChart3,
  Flame
} from 'lucide-react';

export function ScannerScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);
  const [ciOverride, setCiOverride] = useState<number>(-100);
  const [filterTradeableOnly, setFilterTradeableOnly] = useState(false);

  // Active consignment or default
  const baseConsignment: Consignment = useMemo(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    if (existing) return existing;
    return {
      id: 'scanner_consignment',
      name: 'Danish Manure Benchmark',
      originCountry: 'DK',
      originCountryName: 'Denmark',
      feedstock: 'manure',
      feedstockName: 'Animal manure and slurry',
      annexClassification: 'IX_A',
      carbonIntensity: ciOverride,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      injectionCountry: 'DK',
      injectionIsEU: true,
      udbStatus: 'RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: 10000,
    };
  }, [state.consignments, state.activeConsignmentId, ciOverride]);

  const consignment = useMemo(() => ({
    ...baseConsignment,
    carbonIntensity: ciOverride,
  }), [baseConsignment, ciOverride]);

  // Evaluate all active markets
  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);

  const eligibilityMap = useMemo(() => {
    const map = new Map<string, EligibilityAssessment>();
    activeMarkets.forEach(m => {
      map.set(m.id, evaluateEligibility(consignment, m));
    });
    return map;
  }, [activeMarkets, consignment]);

  const netbackResults = useMemo(() => {
    return computeAllNetbacks(consignment, activeMarkets, state.marks, state.costs, eligibilityMap);
  }, [consignment, activeMarkets, state.marks, state.costs, eligibilityMap]);

  const rankedList: RankedNetback[] = useMemo(() => {
    return rankNetbacks(netbackResults, eligibilityMap);
  }, [netbackResults, eligibilityMap]);

  const highestBlocked = useMemo(() => {
    return getHighestBlockedOpportunity(rankedList, eligibilityMap);
  }, [rankedList, eligibilityMap]);

  const filteredList = useMemo(() => {
    if (!filterTradeableOnly) return rankedList;
    return rankedList.filter(r => ['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(r.eligibilityVerdict));
  }, [rankedList, filterTradeableOnly]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-stone-900">Ranked European Netback & Arbitrage Scanner</h1>
          </div>
          <p className="text-stone-600 text-sm mt-1">
            Normalised €/MWh across all active European compliance schemes, gated by legal eligibility. Rank what is tradeable while identifying blocked arbitrage value.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterTradeableOnly(!filterTradeableOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              filterTradeableOnly
                ? 'bg-teal-700 text-white border-teal-700'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {filterTradeableOnly ? 'Showing Tradeable Only' : 'Show All Markets'}
          </button>
        </div>
      </div>

      {/* Pinned Banner: Highest Theoretical Blocked Opportunity */}
      {highestBlocked && (
        <div className="bg-gradient-to-r from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                Highest Blocked Opportunity Uncovered
              </div>
              <div className="text-base font-bold text-stone-100 mt-0.5">
                {highestBlocked.market} (€{highestBlocked.netback.toFixed(2)}/MWh) is not currently tradeable
              </div>
              <p className="text-xs text-stone-300 mt-1 max-w-2xl">
                {highestBlocked.blockingReason}
              </p>
              <div className="text-xs text-teal-400 font-medium mt-1.5 flex items-center gap-1">
                <strong>Remedy to unblock:</strong> {highestBlocked.remedy}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/trade?marketId=DE_THG`)}
            className="shrink-0 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs"
          >
            Inspect in Trade Builder →
          </button>
        </div>
      )}

      {/* Interactive Carbon Intensity Sensitivity Slider */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-700" />
            <h3 className="font-bold text-sm text-stone-900">Interactive CI Sensitivity & Ranking Simulation</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Current Simulation CI:</span>
            <span className="font-mono font-bold text-sm text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-md">
              {ciOverride} gCO₂e/MJ
            </span>
          </div>
        </div>

        <input
          type="range"
          min="-150"
          max="50"
          step="5"
          value={ciOverride}
          onChange={e => setCiOverride(Number(e.target.value))}
          className="w-full accent-teal-700 cursor-pointer"
        />

        <div className="flex justify-between text-xs text-stone-500 font-mono">
          <span>−150 (Deep Manure Digestion)</span>
          <span>−100 (Standard Manure)</span>
          <span>+20 (Food Waste / Agro)</span>
          <span>+50 (Energy Crops)</span>
        </div>
      </div>

      {/* Main Ranked Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/80 text-stone-700 uppercase font-semibold border-b border-stone-200 text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Market / Jurisdiction</th>
                <th className="py-3 px-4">Status & Gating</th>
                <th className="py-3 px-4">Unit of Account</th>
                <th className="py-3 px-4 text-right">Cert Value (€/MWh)</th>
                <th className="py-3 px-4 text-right">Net Netback</th>
                <th className="py-3 px-4 text-right">Implied Margin</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200/80">
              {filteredList.map((row) => {
                const isBlocked = row.eligibilityVerdict === 'HARD_BLOCK' || row.eligibilityVerdict === 'NONE';
                const isUnresolved = row.eligibilityVerdict === 'UNRESOLVED';
                const isExpanded = expandedMarketId === row.marketId;
                const marketObj = MARKETS.find(m => m.id === row.marketId);
                const el = eligibilityMap.get(row.marketId);

                return (
                  <React.Fragment key={row.marketId}>
                    <tr
                      onClick={() => setExpandedMarketId(isExpanded ? null : row.marketId)}
                      className={`transition-colors cursor-pointer ${
                        isBlocked
                          ? 'bg-stone-50/70 text-stone-400 hover:bg-stone-100/70'
                          : isUnresolved
                          ? 'bg-blue-50/30 text-stone-900 hover:bg-blue-50/60'
                          : 'bg-white text-stone-900 hover:bg-teal-50/30'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {row.rank !== null && row.rank > 0 ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            row.rank === 1 ? 'bg-teal-700 text-white' : 'bg-stone-200 text-stone-800'
                          }`}>
                            {row.rank}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      {/* Market Name */}
                      <td className="py-3.5 px-4 font-semibold text-sm">
                        <div className="flex items-center gap-2">
                          <span>{marketObj?.country ? `${marketObj.country}` : '🇪🇺'}</span>
                          <span className={isBlocked ? 'line-through text-stone-400' : 'text-stone-900'}>
                            {row.marketName}
                          </span>
                        </div>
                      </td>

                      {/* Eligibility Chip */}
                      <td className="py-3.5 px-4">
                        <StatusChip variant={row.eligibilityVerdict as any} size="sm" />
                      </td>

                      {/* Unit Label */}
                      <td className="py-3.5 px-4 font-mono text-stone-500">
                        {marketObj?.unitLabel}
                      </td>

                      {/* Certificate Value */}
                      <td className={`py-3.5 px-4 text-right font-mono font-semibold ${
                        isBlocked ? 'line-through text-stone-400' : 'text-stone-800'
                      }`}>
                        {row.certificateValue?.valueEurPerMWh != null
                          ? `€${row.certificateValue.valueEurPerMWh.toFixed(2)}`
                          : 'No mark'}
                      </td>

                      {/* Net Netback */}
                      <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                        isBlocked
                          ? 'line-through text-stone-400'
                          : isUnresolved
                          ? 'text-blue-700'
                          : 'text-teal-700'
                      }`}>
                        {row.netNetback != null ? `€${row.netNetback.toFixed(2)}` : '—'}
                      </td>

                      {/* Implied Margin */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {row.impliedMargin != null ? (
                          <span className={isBlocked ? 'line-through text-stone-400' : 'text-emerald-700'}>
                            €{row.impliedMargin.toFixed(2)} ({row.marginPercent?.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/trade?marketId=${row.marketId}`)}
                            className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 hover:text-teal-800 transition-colors"
                            title="Open in Trade Builder"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Germany Double Counting Branches (Special Sub-rows) */}
                    {row.marketId === 'DE_THG' && row.uncertaintyBranches && (
                      <tr className="bg-blue-50/40 text-xs font-mono">
                        <td colSpan={8} className="p-4 border-t border-b border-blue-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-white rounded-lg border border-blue-200">
                              <div className="text-[11px] font-bold text-stone-700 uppercase">
                                Branch A: Without Double Counting (1× single count)
                              </div>
                              <div className="text-base font-bold text-stone-900 mt-1">
                                Netback: €{row.uncertaintyBranches[0].netNetback?.toFixed(2)}/MWh
                              </div>
                              <div className="text-emerald-700 text-xs mt-0.5">
                                Margin: €{row.uncertaintyBranches[0].impliedMargin?.toFixed(2) ?? 'N/A'}/MWh ({row.uncertaintyBranches[0].marginPercent?.toFixed(1)}%)
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-teal-300">
                              <div className="text-[11px] font-bold text-teal-800 uppercase">
                                Branch B: With Double Counting (2× retained for biomethane)
                              </div>
                              <div className="text-base font-bold text-teal-900 mt-1">
                                Netback: €{row.uncertaintyBranches[1].netNetback?.toFixed(2)}/MWh
                              </div>
                              <div className="text-emerald-700 text-xs mt-0.5">
                                Margin: €{row.uncertaintyBranches[1].impliedMargin?.toFixed(2) ?? 'N/A'}/MWh ({row.uncertaintyBranches[1].marginPercent?.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Expandable Gate Checklist Trail */}
                    {isExpanded && el && (
                      <tr className="bg-stone-50/90">
                        <td colSpan={8} className="p-5 border-t border-stone-200">
                          <div className="space-y-3 max-w-4xl">
                            <div className="font-bold text-xs uppercase tracking-wider text-stone-700">
                              Full Eligibility Trail & Directives: {row.marketName}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {el.gates.map((g, gIdx) => (
                                <div key={gIdx} className="bg-white border border-stone-200 rounded-lg p-3 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-stone-800">{g.gateLabel}</span>
                                    <StatusChip variant={g.verdict} size="sm" />
                                  </div>
                                  <p className="text-stone-600 text-[11px]">{g.reason}</p>
                                  {g.citations.length > 0 && (
                                    <div className="text-[10px] font-mono text-teal-700 pt-1 border-t border-stone-100">
                                      Cite: {g.citations[0].shortName}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
