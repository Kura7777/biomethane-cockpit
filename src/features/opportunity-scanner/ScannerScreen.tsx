import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKETS } from '../../domain/markets/registry';
import { Market, PriceSide } from '../../domain/markets/types';
import { Consignment } from '../../domain/consignment/types';
import { REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { StaleIndicator } from '../../shared/components/StaleIndicator';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeAllNetbacks } from '../../domain/netback/engine';
import { rankNetbacks, getHighestBlockedOpportunity } from '../../domain/netback/ranking';
import { EligibilityAssessment } from '../../domain/eligibility/types';
import { RankedNetback } from '../../domain/netback/types';
import { 
  TrendingUp, 
  AlertTriangle, 
  Sliders, 
  ExternalLink, 
  Filter, 
  Info,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Truck
} from 'lucide-react';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';

export function ScannerScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);
  const [ciOverride, setCiOverride] = useState<number | null>(null);
  const [filterTradeableOnly, setFilterTradeableOnly] = useState(false);
  const [excludeModelled, setExcludeModelled] = useState(false);
  const [logisticsModalRoute, setLogisticsModalRoute] = useState<{ origin: string; target: string } | null>(null);

  // Active consignment or standard Danish manure benchmark
  const activeConsignment: Consignment = useMemo(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    if (existing) return existing;
    return REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  }, [state.consignments, state.activeConsignmentId]);

  // Reset override when active consignment changes
  React.useEffect(() => {
    setCiOverride(null);
  }, [state.activeConsignmentId]);

  const effectiveCI = ciOverride ?? activeConsignment.carbonIntensity;

  const consignment: Consignment = useMemo(() => ({
    ...activeConsignment,
    carbonIntensity: effectiveCI,
  }), [activeConsignment, effectiveCI]);

  // Evaluate all active compliance markets
  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);

  const eligibilityMap = useMemo(() => {
    const map = new Map<string, EligibilityAssessment>();
    activeMarkets.forEach(m => {
      map.set(m.id, evaluateEligibility(consignment, m));
    });
    return map;
  }, [activeMarkets, consignment]);

  const netbackResults = useMemo(() => {
    return computeAllNetbacks(
      consignment, 
      activeMarkets, 
      state.marks, 
      state.costs, 
      eligibilityMap,
      state.marks.pricingSide
    );
  }, [consignment, activeMarkets, state.marks, state.costs, eligibilityMap]);

  const rankedList: RankedNetback[] = useMemo(() => {
    return rankNetbacks(netbackResults, eligibilityMap, { excludeModelled });
  }, [netbackResults, eligibilityMap, excludeModelled]);

  const highestBlocked = useMemo(() => {
    return getHighestBlockedOpportunity(rankedList, eligibilityMap);
  }, [rankedList, eligibilityMap]);

  const filteredList = useMemo(() => {
    if (!filterTradeableOnly) return rankedList;
    return rankedList.filter(r => ['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(r.eligibilityVerdict));
  }, [rankedList, filterTradeableOnly]);

  const pricingSide = state.marks.pricingSide ?? 'bid';

  return (
    <div className="space-y-4 font-sans text-stone-100 pb-16">
      
      {/* Top Header Controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <h1 className="text-base font-bold text-white font-mono uppercase tracking-tight">
              Arbitrage & Netback Scanner
            </h1>
            <span className="text-[10px] font-mono bg-stone-800 text-stone-300 border border-stone-700 px-1.5 py-0.5 rounded">
              Pricing Side: <strong className="text-teal-300 uppercase">{pricingSide}</strong>
            </span>
          </div>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            Consignment: <strong className="text-stone-200">{consignment.originCountry} ({consignment.feedstockName})</strong> • Commissioning: {consignment.commissioningDateRange}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exclude Modelled / Marks Only Toggle */}
          <button
            onClick={() => setExcludeModelled(!excludeModelled)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold rounded border transition-all ${
              excludeModelled
                ? 'bg-purple-950 text-purple-300 border-purple-700'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
            title="Toggle theoretical model outputs (e.g. unquoted FuelEU deficit closure)"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            {excludeModelled ? 'Marks Only (Modelled Hidden)' : 'Include Modelled Outputs'}
          </button>

          {/* Tradeable Only Filter */}
          <button
            onClick={() => setFilterTradeableOnly(!filterTradeableOnly)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold rounded border transition-all ${
              filterTradeableOnly
                ? 'bg-teal-700 text-white border-teal-600'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <Filter className="w-3 h-3" />
            {filterTradeableOnly ? 'Tradeable Only' : 'Show All Markets'}
          </button>
        </div>
      </div>

      {/* Pinned Banner: Highest Theoretical Blocked Opportunity */}
      {highestBlocked && (
        <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border border-amber-900/60 rounded-xl p-3.5 text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                Highest Blocked Opportunity Uncovered
              </div>
              <div className="text-sm font-bold text-stone-100 font-mono">
                {highestBlocked.market} (Theoretical Netback: <span className="text-amber-300">€{highestBlocked.netback.toFixed(2)}/MWh</span>) is blocked
              </div>
              <p className="text-xs text-stone-300 mt-0.5 max-w-2xl font-mono">
                {highestBlocked.blockingReason}
              </p>
              <div className="text-xs text-teal-400 font-mono font-semibold mt-1">
                Remedy: {highestBlocked.remedy}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/trade?marketId=${highestBlocked.marketId}`)}
            className="shrink-0 bg-teal-600 hover:bg-teal-500 text-white font-mono text-xs font-bold px-3 py-1.5 rounded transition-all shadow-xs"
          >
            Inspect in Trade Builder →
          </button>
        </div>
      )}

      {/* Interactive Carbon Intensity Sensitivity Simulation */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 text-xs">
          <div className="flex items-center gap-1.5 font-mono font-bold text-stone-200">
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            <span>Carbon Intensity Sensitivity Simulation</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-stone-400 text-[11px]">
              {ciOverride !== null ? 'Simulated CI:' : 'Consignment CI:'}
            </span>
            <span className={`font-bold px-2 py-0.5 rounded ${
              ciOverride !== null 
                ? 'text-amber-300 bg-amber-950/80 border border-amber-800' 
                : 'text-teal-300 bg-stone-950 border border-stone-800'
            }`}>
              {effectiveCI} gCO₂e/MJ
            </span>
            {ciOverride !== null && (
              <button
                onClick={() => setCiOverride(null)}
                className="text-[10px] text-teal-400 hover:text-teal-300 underline"
                title="Reset to consignment CI"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <input
          type="range"
          min="-150"
          max="50"
          step="5"
          value={effectiveCI}
          onChange={e => setCiOverride(Number(e.target.value))}
          className="w-full accent-teal-500 cursor-pointer h-1.5 bg-stone-800 rounded-lg appearance-none"
        />

        <div className="flex justify-between text-[10px] text-stone-500 font-mono">
          <span>−150 (Deep Manure)</span>
          <span>−100 (Standard Manure)</span>
          <span>+20 (Bio-waste)</span>
          <span>+50 (Crop)</span>
        </div>
      </div>

      {/* Ranked Netback Table (Financial Terminal Density 28-32px rows) */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-stone-950 text-stone-400 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-2 px-3 w-10 text-center">Rank</th>
                <th className="py-2 px-3">Market / Scheme</th>
                <th className="py-2 px-3">Gating</th>
                <th className="py-2 px-3">Unit</th>
                <th className="py-2 px-3 text-right">Cert Value (€/MWh)</th>
                <th className="py-2 px-3 text-right">Net Netback</th>
                <th className="py-2 px-3 text-right" title="Realised Desk Margin (and Gross Spread if fixed price)">Desk Margin</th>
                <th className="py-2 px-3 text-center w-24">Mark Age</th>
                <th className="py-2 px-3 text-center w-12">Act</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-800/80">
              {filteredList.map((row) => {
                const isBlocked = row.eligibilityVerdict === 'HARD_BLOCK' || row.eligibilityVerdict === 'NONE';
                const isUnresolved = row.eligibilityVerdict === 'UNRESOLVED';
                const isExpanded = expandedMarketId === row.marketId;
                const marketObj = MARKETS.find(m => m.id === row.marketId);
                const el = eligibilityMap.get(row.marketId);
                const markEntry = state.marks.marks[row.marketId];

                return (
                  <React.Fragment key={row.marketId}>
                    <tr
                      onClick={() => setExpandedMarketId(isExpanded ? null : row.marketId)}
                      className={`h-9 transition-colors cursor-pointer ${
                        isBlocked
                          ? 'bg-stone-950/40 text-stone-500 hover:bg-stone-850'
                          : isUnresolved
                          ? 'bg-sky-950/20 text-stone-200 hover:bg-sky-950/40'
                          : 'bg-stone-900 text-stone-100 hover:bg-stone-800/60'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-1.5 px-3 text-center font-bold">
                        {row.rank !== null && row.rank > 0 ? (
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold ${
                            row.rank === 1 ? 'bg-teal-600 text-white' : 'bg-stone-800 text-stone-300'
                          }`}>
                            {row.rank}
                          </span>
                        ) : (
                          <span className="text-stone-600">—</span>
                        )}
                      </td>

                      {/* Market Name + Modelled Chip */}
                      <td className="py-1.5 px-3 font-semibold text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400">{marketObj?.country || 'EU'}</span>
                          <span className={isBlocked ? 'line-through text-stone-500' : 'text-stone-100 font-bold'}>
                            {row.marketName}
                          </span>
                          {row.isModelled && (
                            <span 
                              className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-1 rounded uppercase font-bold"
                              title="Modelled deficit closure value — no broker mark entered"
                            >
                              MODELLED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Eligibility Chip */}
                      <td className="py-1.5 px-3">
                        <StatusChip variant={row.eligibilityVerdict as any} size="xs" />
                      </td>

                      {/* Unit */}
                      <td className="py-1.5 px-3 text-stone-400 text-[11px]">
                        {marketObj?.unitLabel}
                      </td>

                      {/* Certificate Value */}
                      <td className={`py-1.5 px-3 text-right font-bold ${
                        isBlocked ? 'line-through text-stone-500' : 'text-stone-200'
                      }`}>
                        {row.certificateValue?.valueEurPerMWh != null
                          ? `€${row.certificateValue.valueEurPerMWh.toFixed(2)}`
                          : <span className="text-stone-600 font-normal italic">No mark</span>}
                      </td>

                      {/* Net Netback + Prominent Incomplete Indicator */}
                      <td className={`py-1.5 px-3 text-right font-bold text-xs ${
                        isBlocked
                          ? 'line-through text-stone-500'
                          : isUnresolved
                          ? 'text-sky-400'
                          : 'text-teal-400'
                      }`}>
                        {row.netNetback != null ? (
                          <div className="flex flex-col items-end">
                            <span className="flex items-center gap-0.5">
                              €{row.netNetback.toFixed(2)}
                              {row.missingInputs.includes('gasIndex (TTF)') && (
                                <span className="text-amber-400 text-[10px] ml-1 font-normal">(excl. TTF)</span>
                              )}
                              {!row.isComplete && (
                                <span 
                                  className="text-amber-400 text-[11px] font-bold cursor-help"
                                  title={`Incomplete cost basis: Missing ${row.missingInputs.join(', ')}`}
                                >
                                  *
                                </span>
                              )}
                            </span>
                            {!row.isComplete && (
                              <span className="text-[9px] text-amber-500/90 font-normal">
                                incomplete
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-600">—</span>
                        )}
                      </td>

                      {/* Realised Desk Margin */}
                      <td className="py-1.5 px-3 text-right font-semibold">
                        {row.deskMargin != null ? (
                          <div className="flex flex-col items-end">
                            <span className={isBlocked ? 'line-through text-stone-500' : 'text-emerald-400 font-bold'}>
                              €{row.deskMargin.toFixed(2)}
                            </span>
                            {row.grossValueSpread !== null && (
                              <span className={isBlocked ? 'text-stone-600' : 'text-[10px] text-sky-300 font-normal'}>
                                Spread: €{row.grossValueSpread.toFixed(2)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-600">—</span>
                        )}
                      </td>

                      {/* Mark Age / Staleness */}
                      <td className="py-1.5 px-3 text-center">
                        <StaleIndicator updatedAt={markEntry?.updatedAt ?? null} />
                      </td>

                      {/* Action Buttons */}
                      <td className="py-1.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setLogisticsModalRoute({ origin: consignment.originCountry, target: marketObj?.country || 'DE' })}
                            className="p-1 hover:bg-stone-700 rounded text-stone-400 hover:text-sky-300 transition-colors"
                            title={`View Cross-Border Gas Flow Guide: ${consignment.originCountry} ➔ ${marketObj?.country || 'EU'}`}
                          >
                            <Truck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/trade?marketId=${row.marketId}&originCountry=${consignment.originCountry}`)}
                            className="p-1 hover:bg-stone-700 rounded text-stone-400 hover:text-teal-300 transition-colors"
                            title="Open Trade Dossier"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* German Dual-Branch Sub-row */}
                    {row.marketId === 'DE_THG' && row.uncertaintyBranches && (
                      <tr className="bg-sky-950/30 text-xs">
                        <td colSpan={9} className="p-3 border-t border-b border-sky-900/50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-2.5 bg-stone-900/90 rounded border border-stone-800">
                              <div className="text-[10px] font-bold text-stone-400 uppercase">
                                Branch 1: Without Double Counting (1× Single count)
                              </div>
                              <div className="text-sm font-bold text-stone-100 mt-0.5">
                                Netback: €{row.uncertaintyBranches[0].netNetback?.toFixed(2)}/MWh
                              </div>
                              <div className="text-sky-300 text-[11px] mt-0.5">
                                Gross Spread: €{row.uncertaintyBranches[0].grossValueSpread?.toFixed(2) ?? 'N/A'}/MWh
                              </div>
                              <div className="text-emerald-400 text-[11px]">
                                Realised Desk Margin (10%): €{row.uncertaintyBranches[0].deskMargin?.toFixed(2) ?? 'N/A'}/MWh
                              </div>
                            </div>

                            <div className="p-2.5 bg-stone-900/90 rounded border border-teal-900/80">
                              <div className="text-[10px] font-bold text-teal-400 uppercase">
                                Branch 2: If double counting is retained (2×)
                              </div>
                              <div className="text-sm font-bold text-teal-300 mt-0.5">
                                Netback: €{row.uncertaintyBranches[1].netNetback?.toFixed(2)}/MWh
                              </div>
                              <div className="text-sky-300 text-[11px] mt-0.5">
                                Gross Spread: €{row.uncertaintyBranches[1].grossValueSpread?.toFixed(2) ?? 'N/A'}/MWh
                              </div>
                              <div className="text-emerald-400 text-[11px]">
                                Realised Desk Margin (10%): €{row.uncertaintyBranches[1].deskMargin?.toFixed(2) ?? 'N/A'}/MWh
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Expandable Gate Checklist Trail & Route Logistics */}
                    {isExpanded && el && (
                      <tr className="bg-stone-950/90">
                        <td colSpan={9} className="p-4 border-t border-stone-800 space-y-3">
                          
                          {/* Cross-Border Gas Delivery & Pipeline Wheel Section */}
                          {(() => {
                            const targetC = marketObj?.country || 'DE';
                            const logRoute = calculateLogisticsRoute(consignment.originCountry, targetC, state.marks.gasIndex.mid ?? 28.50);
                            return (
                              <div className="p-3 bg-stone-900 border border-sky-900/60 rounded-xl space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sky-300 flex items-center gap-1.5 uppercase text-[11px]">
                                    <Truck className="w-3.5 h-3.5 text-sky-400" />
                                    Cross-Border Gas Delivery & Flow Options: {consignment.originCountry} ➔ {targetC} (~{logRoute.distanceKm.toLocaleString()} km)
                                  </span>
                                  <button
                                    onClick={() => setLogisticsModalRoute({ origin: consignment.originCountry, target: targetC })}
                                    className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700 text-sky-300 hover:bg-sky-900 font-bold text-[10px]"
                                  >
                                    Open Detailed Guide & Playbook ➔
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                  <div className="p-2.5 bg-stone-950 rounded border border-teal-900/80">
                                    <div className="text-teal-400 font-bold text-[10px] uppercase">Option A: Virtual Swap (UDB)</div>
                                    <div className="text-sm font-bold text-teal-300 mt-0.5">
                                      {logRoute.modes.virtualSwap.totalCostEurMwh !== null ? `€${logRoute.modes.virtualSwap.totalCostEurMwh.toFixed(2)}/MWh` : '—'}
                                    </div>
                                    <div className="text-[10px] text-stone-500 mt-0.5">Basis spread + electronic UDB PoS transfer</div>
                                  </div>

                                  <div className="p-2.5 bg-stone-950 rounded border border-sky-900/80">
                                    <div className="text-sky-400 font-bold text-[10px] uppercase">Option B: Physical Pipeline Wheel</div>
                                    <div className="text-sm font-bold text-sky-300 mt-0.5">
                                      {logRoute.modes.physicalPipeline.totalCostEurMwh !== null ? `€${logRoute.modes.physicalPipeline.totalCostEurMwh.toFixed(2)}/MWh` : <span className="text-amber-400 text-xs">Tariff Incomplete</span>}
                                    </div>
                                    <div className="text-[10px] text-stone-500 mt-0.5">{logRoute.physicalRoute.transitingCountries.join(' ➔ ')} via PRISMA</div>
                                  </div>

                                  <div className="p-2.5 bg-stone-950 rounded border border-amber-900/80">
                                    <div className="text-amber-400 font-bold text-[10px] uppercase">Option C: Bio-LNG Road</div>
                                    <div className="text-sm font-bold text-amber-300 mt-0.5">
                                      {logRoute.modes.bioLng.totalCostEurMwh !== null ? `€${logRoute.modes.bioLng.totalCostEurMwh.toFixed(2)}/MWh` : '—'}
                                    </div>
                                    <div className="text-[10px] text-stone-500 mt-0.5">Cryogenic ISO road trailer freight</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Regulatory Gate Audit */}
                          <div className="space-y-2 max-w-4xl pt-1">
                            <div className="font-bold text-xs uppercase tracking-wider text-stone-300 flex items-center justify-between">
                              <span>Regulatory Compliance Gates: {row.marketName}</span>
                              <span className="text-[10px] text-stone-500 font-mono">
                                {el.gates.filter(g => g.verdict === 'PASS').length}/{el.gates.length} Gates Clear
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {el.gates.map((g, gIdx) => (
                                <div key={gIdx} className="bg-stone-900 border border-stone-800 rounded p-2.5 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-stone-200 text-[11px]">{g.gateLabel}</span>
                                    <StatusChip variant={g.verdict} size="xs" />
                                  </div>
                                  <p className="text-stone-400 text-[11px] leading-relaxed">{g.reason}</p>
                                  {g.citations.length > 0 && (
                                    <div className="text-[10px] text-teal-400 pt-1 border-t border-stone-800">
                                      {g.citations[0].shortName}
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

      {/* Logistics Modal */}
      {logisticsModalRoute && (
        <LogisticsModal
          originCountry={logisticsModalRoute.origin}
          targetCountry={logisticsModalRoute.target}
          isOpen={true}
          onClose={() => setLogisticsModalRoute(null)}
        />
      )}
    </div>
  );
}
