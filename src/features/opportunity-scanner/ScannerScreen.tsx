import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { Market, PriceSide, getMarkStaleness, getMarkAgeDays } from '../../domain/markets/types';
import { Consignment } from '../../domain/consignment/types';
import { REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { PRODUCING_ORIGINS, getRouteTransitTariff } from '../../domain/arbitrage/origins';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeAllNetbacks, computeNetback } from '../../domain/netback/engine';
import { rankNetbacks, getHighestBlockedOpportunity } from '../../domain/netback/ranking';
import { EligibilityAssessment, GateResult, OverallVerdict } from '../../domain/eligibility/types';
import { RankedNetback } from '../../domain/netback/types';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
import { LogisticsModal } from '../logistics/LogisticsModal';

const GATE_LETTER_MAP = ['S', 'U', 'M', 'A', 'G', 'N'];
const GATE_TOOLTIP_TITLES = [
  'Scheme recognition',
  'UDB grid ingestion',
  'Mass balance custody',
  'Annex IX feedstock',
  'GHG saving threshold',
  'Member state specifics',
];

function getVerdictTone(verdict: string) {
  switch (verdict) {
    case 'PASS':
    case 'ELIGIBLE':
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-950',
        border: 'border-emerald-800',
        dot: 'bg-emerald-500',
        badge: 'text-emerald-400 bg-emerald-950 border-emerald-800',
        bar: 'bg-emerald-500',
      };
    case 'CONDITIONAL':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-950',
        border: 'border-amber-800',
        dot: 'bg-amber-500',
        badge: 'text-amber-400 bg-amber-950 border-amber-800',
        bar: 'bg-amber-500',
      };
    case 'UNRESOLVED':
      return {
        text: 'text-sky-400',
        bg: 'bg-sky-950',
        border: 'border-sky-800',
        dot: 'bg-sky-500',
        badge: 'text-sky-400 bg-sky-950 border-sky-800',
        bar: 'bg-sky-500',
      };
    case 'HARD_BLOCK':
    case 'FAIL':
    default:
      return {
        text: 'text-red-400',
        bg: 'bg-red-950',
        border: 'border-red-800',
        dot: 'bg-red-500',
        badge: 'text-red-400 bg-red-950 border-red-800',
        bar: 'bg-red-800',
      };
  }
}

export function ScannerScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  // Selected market ID (dossier rail)
  const [selectedMarketId, setSelectedMarketId] = useState<string>(state.selectedMarketId || 'DE_THG');

  // Origin override (from PRODUCING_ORIGINS)
  const [originCode, setOriginCode] = useState<string>('DK');

  // Carbon intensity override
  const [ciOverride, setCiOverride] = useState<number | null>(null);

  // Filters
  const [positiveOnly, setPositiveOnly] = useState(false);
  const [clearedOnly, setClearedOnly] = useState(false);
  const [hideStale, setHideStale] = useState(false);
  const [tradeableOnly, setTradeableOnly] = useState(false);
  const [marksOnly, setMarksOnly] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'net' | 'margin' | 'age' | 'name'>('net');
  const [sortDir, setSortDir] = useState<1 | -1>(-1); // -1: desc, 1: asc

  // Logistics modal state
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);

  // Active consignment benchmark
  const activeConsignment: Consignment = useMemo(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    return existing || REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  }, [state.consignments, state.activeConsignmentId]);

  // Consignment with selected origin and effective CI
  const effectiveCI = ciOverride ?? activeConsignment.carbonIntensity;
  const isCiSimulated = ciOverride !== null && ciOverride !== activeConsignment.carbonIntensity;

  const consignment: Consignment = useMemo(() => ({
    ...activeConsignment,
    originCountry: originCode,
    carbonIntensity: effectiveCI,
  }), [activeConsignment, originCode, effectiveCI]);

  // Active markets
  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);

  // Compute all eligibility
  const eligibilityMap = useMemo(() => {
    const map = new Map<string, EligibilityAssessment>();
    activeMarkets.forEach(m => {
      map.set(m.id, evaluateEligibility(consignment, m));
    });
    return map;
  }, [activeMarkets, consignment]);

  // Compute all netbacks
  const pricingSides = state.marks.pricingSides;
  const netbackResults = useMemo(() => {
    return computeAllNetbacks(
      consignment,
      activeMarkets,
      state.marks,
      state.costs,
      eligibilityMap,
      pricingSides
    );
  }, [consignment, activeMarkets, state.marks, state.costs, eligibilityMap, pricingSides]);

  // Ranked raw list
  const rawRankedList = useMemo(() => {
    return rankNetbacks(netbackResults, eligibilityMap, { excludeModelled: marksOnly });
  }, [netbackResults, eligibilityMap, marksOnly]);

  // Highest theoretical blocked opportunity
  const highestBlocked = useMemo(() => {
    return getHighestBlockedOpportunity(rawRankedList, eligibilityMap);
  }, [rawRankedList, eligibilityMap]);

  // Filtered list
  const filteredList = useMemo(() => {
    let list = rawRankedList;

    if (positiveOnly) {
      list = list.filter(r => (r.netNetback ?? -Infinity) > 0);
    }
    if (clearedOnly) {
      list = list.filter(r => {
        const el = eligibilityMap.get(r.marketId);
        return el?.gates.every(g => g.verdict === 'PASS');
      });
    }
    if (hideStale) {
      list = list.filter(r => {
        const entry = state.marks.marks[r.marketId];
        const age = getMarkAgeDays(entry?.updatedAt);
        return age === null || age <= 30;
      });
    }
    if (tradeableOnly) {
      list = list.filter(r => ['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(r.eligibilityVerdict));
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return a.marketName.localeCompare(b.marketName) * -sortDir;
      }
      if (sortBy === 'age') {
        const ageA = getMarkAgeDays(state.marks.marks[a.marketId]?.updatedAt) ?? 999;
        const ageB = getMarkAgeDays(state.marks.marks[b.marketId]?.updatedAt) ?? 999;
        return (ageA - ageB) * -sortDir;
      }
      if (sortBy === 'margin') {
        // Rows with no margin (producer pricing unset) sort last rather than being
        // given an invented one.
        const marginA = a.deskMargin ?? -Infinity;
        const marginB = b.deskMargin ?? -Infinity;
        return (marginA - marginB) * sortDir;
      }
      // Netback
      const netA = a.netNetback ?? -Infinity;
      const netB = b.netNetback ?? -Infinity;
      return (netA - netB) * sortDir;
    });
  }, [rawRankedList, positiveOnly, clearedOnly, hideStale, tradeableOnly, sortBy, sortDir, state.marks.marks, eligibilityMap]);

  // Max absolute netback for proportional spread bars
  const maxNetAbs = useMemo(() => {
    const values = filteredList.map(r => Math.abs(r.netNetback ?? 0));
    return Math.max(...values, 1);
  }, [filteredList]);

  // Selected market and assessment
  const selectedMarket = useMemo(() => {
    return getMarketById(selectedMarketId) || activeMarkets[0];
  }, [selectedMarketId, activeMarkets]);

  const selectedEligibility = useMemo(() => {
    return eligibilityMap.get(selectedMarket.id) || evaluateEligibility(consignment, selectedMarket);
  }, [eligibilityMap, consignment, selectedMarket]);

  const selectedNetbackResult = useMemo(() => {
    return netbackResults.find(n => n.marketId === selectedMarket.id) || computeNetback(
      selectedMarket,
      consignment,
      state.marks,
      state.costs,
      pricingSides
    );
  }, [netbackResults, selectedMarket, consignment, state.marks, state.costs, pricingSides]);

  // Selected market transit tariff and all-in cost
  // Costs the engine actually deducts to reach the delivered value stack. Producer
  // payment is not among them — it comes out of the stack, not before it.
  const baseCost = (state.costs.transferCosts ?? 0) + (state.costs.certificationCosts ?? 0);
  const selectedTransitTariff = getRouteTransitTariff(originCode, selectedMarket.country);
  const selectedAllIn = baseCost + selectedTransitTariff;

  // German Dual Branch Calculations if DE
  const isGermanySelected = selectedMarket.id === 'DE_THG';
  const germanDualBranches = useMemo(() => {
    if (!isGermanySelected) return null;
    // Both branches come from computeNetback, which is the only thing allowed to price
    // them. Re-deriving the waterfall here is what let this screen and the Trade Builder
    // disagree about the same trade.
    const branches = selectedNetbackResult.uncertaintyBranches;
    if (!branches || branches.length < 2) return null;
    const [single, double] = branches;

    return {
      branch1: {
        multiplier: 1,
        net: single.netNetback,
        margin: single.deskMargin,
        note: 'Baseline single counting without multiplier.',
      },
      branch2: {
        multiplier: 2,
        net: double.netNetback,
        margin: double.deskMargin,
        note: 'Double counting multiplier retained in statutory quota.',
      },
    };
  }, [isGermanySelected, selectedNetbackResult.uncertaintyBranches]);

  // Logistics route assessment for selected corridor
  const logisticsAssessment = useMemo(() => {
    return calculateLogisticsRoute(originCode, selectedMarket.country, state.marks.gasIndex.mid);
  }, [originCode, selectedMarket.country, state.marks.gasIndex.mid]);

  // Keyboard navigation for ladder
  const visibleIds = useMemo(() => filteredList.map(r => r.marketId), [filteredList]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = visibleIds.indexOf(selectedMarketId);
        const nextIndex = Math.min(visibleIds.length - 1, currentIndex + 1);
        if (visibleIds[nextIndex]) {
          setSelectedMarketId(visibleIds[nextIndex]);
          dispatch({ type: 'SELECT_MARKET', id: visibleIds[nextIndex] });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = visibleIds.indexOf(selectedMarketId);
        const prevIndex = Math.max(0, currentIndex - 1);
        if (visibleIds[prevIndex]) {
          setSelectedMarketId(visibleIds[prevIndex]);
          dispatch({ type: 'SELECT_MARKET', id: visibleIds[prevIndex] });
        }
      } else if (e.key === 'Enter') {
        setIsLogisticsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleIds, selectedMarketId, dispatch]);

  const handleSortClick = (field: 'net' | 'margin' | 'age' | 'name') => {
    if (sortBy === field) {
      setSortDir(d => (d === -1 ? 1 : -1));
    } else {
      setSortBy(field);
      setSortDir(field === 'name' ? 1 : -1);
    }
  };

  const avoidedCO2e = ((94.0 - effectiveCI) * 0.0036).toFixed(2);
  const selectedTone = getVerdictTone(selectedEligibility.overallVerdict);
  const producingOriginKeys = Object.keys(PRODUCING_ORIGINS);
  const originProfile = PRODUCING_ORIGINS[originCode] || PRODUCING_ORIGINS['DK'];

  // Transit label
  let transitLabel = `Transit ${originCode}→${selectedMarket.country}`;
  if (selectedTransitTariff === 0.50) transitLabel = 'Domestic injection';
  else if (selectedTransitTariff === 3.20) transitLabel = 'Multi-zone transit';

  return (
    <div className="flex-1 grid grid-cols-[264px_minmax(0,1fr)_336px] min-h-0 min-w-[1400px] overflow-hidden bg-stone-950">
      
      {/* 1A. CONSIGNMENT SPINE (LEFT, 264px) */}
      <aside className="border-r border-stone-800 bg-stone-950 flex flex-col min-h-0 overflow-y-auto font-sans">
        
        {/* Spine Header */}
        <div className="p-3 border-b border-stone-800 flex items-center justify-between flex-none">
          <h2 className="m-0 font-mono text-meta font-semibold tracking-[0.16em] text-stone-400 uppercase">
            Consignment
          </h2>
          <span className="font-mono text-micro font-bold text-teal-300 bg-teal-950 border border-teal-800 px-1.5 py-0.5">
            ACTIVE
          </span>
        </div>

        {/* Origin Section */}
        <div className="p-3 border-b border-stone-800 flex flex-col gap-2.5 flex-none">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-[0.04em] text-stone-100">
              {originCode}
            </span>
            <span className="flex-1 h-px bg-stone-800" />
            <span className="font-mono text-micro text-stone-500 tracking-[0.1em] uppercase">
              ORIGIN
            </span>
          </div>

          <div className="text-sm leading-snug text-stone-300 font-sans">
            {originProfile.countryName} · {originProfile.primaryRegistry} · {originProfile.gridZone === 'NON_EU_ISOLATED' ? 'Grid-Isolated' : 'EU Interconnected'}
          </div>

          {/* Origin Picker: All 20 codes */}
          <div className="flex flex-wrap gap-[3px]">
            {producingOriginKeys.map(code => {
              const prof = PRODUCING_ORIGINS[code];
              const isSelected = originCode === code;
              const isIsolated = prof.gridZone === 'NON_EU_ISOLATED';

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setOriginCode(code)}
                  aria-pressed={isSelected}
                  title={`${prof.countryName} (${prof.primaryRegistry})${isIsolated ? ' — Grid Isolated' : ''}`}
                  className={`w-[30px] h-[22px] font-mono text-micro font-semibold transition-colors duration-150 rounded-xs cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-sky-800 border border-sky-600 text-sky-100'
                      : isIsolated
                      ? 'bg-stone-900 border border-stone-800 text-stone-500 hover:text-stone-300'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>

          {/* 2x2 Stat Grid */}
          <div className="grid grid-cols-2 gap-[1px] bg-stone-800 border border-stone-800 mt-1">
            <div className="bg-stone-900 p-2">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Volume</div>
              <div className="font-mono font-num text-sm font-semibold text-stone-100 mt-0.5">
                {(activeConsignment.volumeMWh ?? 120000).toLocaleString('en-GB')}
                <span className="text-micro text-stone-400 font-normal"> MWh/y</span>
              </div>
            </div>
            <div className="bg-stone-900 p-2">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Annex</div>
              <div className="font-mono text-sm font-semibold text-emerald-400 mt-0.5">
                {activeConsignment.annexClassification === 'IX_A' ? 'IX-A' : 'NON_ANNEX'}
              </div>
            </div>
            <div className="bg-stone-900 p-2">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Scheme</div>
              <div className="font-mono text-xs font-semibold text-stone-100 mt-0.5 truncate">
                {activeConsignment.certificationScheme.replace('_', ' ')}
              </div>
            </div>
            <div className="bg-stone-900 p-2">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Custody</div>
              <div className="font-mono text-xs font-semibold text-stone-100 mt-0.5 truncate">
                {activeConsignment.chainOfCustody === 'MASS_BALANCE' ? 'Mass balance' : 'Book & claim'}
              </div>
            </div>
          </div>
        </div>

        {/* Carbon Intensity Block */}
        <div className="p-3 border-b border-stone-800 flex flex-col gap-2 flex-none">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-meta font-semibold tracking-[0.14em] text-stone-400 uppercase">
              Carbon intensity
            </span>
            <span
              onClick={() => isCiSimulated && setCiOverride(null)}
              className={`font-mono text-micro font-semibold px-1.5 py-0.5 border cursor-pointer ${
                isCiSimulated
                  ? 'text-amber-400 bg-amber-950 border-amber-800'
                  : 'text-emerald-400 bg-emerald-950 border-emerald-800'
              }`}
              title={isCiSimulated ? 'Click to reset to consignment value' : 'Consignment level'}
            >
              {isCiSimulated ? 'SIMULATED' : 'CONSIGNMENT'}
            </span>
          </div>

          <div className="font-mono font-num text-[28px] font-bold tracking-[-0.03em] text-stone-100 leading-none">
            {effectiveCI > 0 ? `+${effectiveCI}` : `${effectiveCI}`}
          </div>
          <div className="font-mono text-micro text-stone-400 tracking-[0.06em]">
            gCO₂e/MJ · vs 94.0 baseline
          </div>

          <input
            type="range"
            min="-150"
            max="50"
            step="5"
            value={effectiveCI}
            onChange={e => setCiOverride(Number(e.target.value))}
            aria-label="Carbon intensity"
            className="w-full my-2"
          />

          <div className="flex justify-between font-mono text-micro text-stone-500">
            <span>−150</span>
            <span>−100</span>
            <span>0</span>
            <span>+50</span>
          </div>

          <div className="flex items-baseline justify-between pt-2.5 mt-1 border-t border-stone-800">
            <span className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">
              Avoided
            </span>
            <span className="font-mono font-num text-sm font-semibold text-emerald-400">
              {avoidedCO2e}
              <span className="text-micro text-stone-400 font-normal"> tCO₂e/MWh</span>
            </span>
          </div>
        </div>

        {/* Cost Stack */}
        <div className="p-3 border-b border-stone-800 flex flex-col gap-1.5 flex-none">
          <span className="font-mono text-meta font-semibold tracking-[0.14em] text-stone-400 uppercase mb-1">
            Cost stack
          </span>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-stone-400">Producer payable</span>
            <span className="flex-1 h-px bg-stone-900" />
            <span className="font-mono font-num text-xs font-medium text-stone-200">
              {selectedNetbackResult.producerPayable != null ? `€${selectedNetbackResult.producerPayable.toFixed(2)}` : '—'}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-stone-400">Transfer & registry</span>
            <span className="flex-1 h-px bg-stone-900" />
            <span className="font-mono font-num text-xs font-medium text-stone-200">
              {state.costs.transferCosts != null ? `€${state.costs.transferCosts.toFixed(2)}` : '—'}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-stone-400">Certification</span>
            <span className="flex-1 h-px bg-stone-900" />
            <span className="font-mono font-num text-xs font-medium text-stone-200">
              {state.costs.certificationCosts != null ? `€${state.costs.certificationCosts.toFixed(2)}` : '—'}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-stone-400">{transitLabel}</span>
            <span className="flex-1 h-px bg-stone-900" />
            <span className="font-mono font-num text-xs font-medium text-stone-200">
              €{selectedTransitTariff.toFixed(2)}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 pt-2 mt-1 border-t border-stone-800">
            <span className="font-mono text-meta font-semibold tracking-[0.08em] text-stone-100 uppercase">
              All-in
            </span>
            <span className="font-mono font-num text-sm font-bold text-stone-100">
              €{selectedAllIn.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 flex flex-col gap-1.5 flex-none">
          <span className="font-mono text-meta font-semibold tracking-[0.14em] text-stone-400 uppercase mb-1">
            Filters
          </span>

          <button
            type="button"
            onClick={() => setPositiveOnly(!positiveOnly)}
            aria-pressed={positiveOnly}
            className={`w-full p-1.5 flex items-center gap-2 text-xs rounded transition-colors duration-150 cursor-pointer ${
              positiveOnly
                ? 'bg-stone-900 border border-teal-800 text-stone-100'
                : 'border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className={`w-[13px] h-[13px] rounded-xs flex items-center justify-center font-mono text-micro font-bold shrink-0 ${
              positiveOnly ? 'bg-teal-600 text-teal-950' : 'border border-stone-800 bg-stone-950'
            }`}>
              {positiveOnly ? '✓' : ''}
            </span>
            <span>Positive netback only</span>
          </button>

          <button
            type="button"
            onClick={() => setClearedOnly(!clearedOnly)}
            aria-pressed={clearedOnly}
            className={`w-full p-1.5 flex items-center gap-2 text-xs rounded transition-colors duration-150 cursor-pointer ${
              clearedOnly
                ? 'bg-stone-900 border border-teal-800 text-stone-100'
                : 'border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className={`w-[13px] h-[13px] rounded-xs flex items-center justify-center font-mono text-micro font-bold shrink-0 ${
              clearedOnly ? 'bg-teal-600 text-teal-950' : 'border border-stone-800 bg-stone-950'
            }`}>
              {clearedOnly ? '✓' : ''}
            </span>
            <span>All six gates clear</span>
          </button>

          <button
            type="button"
            onClick={() => setHideStale(!hideStale)}
            aria-pressed={hideStale}
            className={`w-full p-1.5 flex items-center gap-2 text-xs rounded transition-colors duration-150 cursor-pointer ${
              hideStale
                ? 'bg-stone-900 border border-teal-800 text-stone-100'
                : 'border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className={`w-[13px] h-[13px] rounded-xs flex items-center justify-center font-mono text-micro font-bold shrink-0 ${
              hideStale ? 'bg-teal-600 text-teal-950' : 'border border-stone-800 bg-stone-950'
            }`}>
              {hideStale ? '✓' : ''}
            </span>
            <span>Hide marks older than 30d</span>
          </button>

          <button
            type="button"
            onClick={() => setTradeableOnly(!tradeableOnly)}
            aria-pressed={tradeableOnly}
            className={`w-full p-1.5 flex items-center gap-2 text-xs rounded transition-colors duration-150 cursor-pointer ${
              tradeableOnly
                ? 'bg-stone-900 border border-teal-800 text-stone-100'
                : 'border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className={`w-[13px] h-[13px] rounded-xs flex items-center justify-center font-mono text-micro font-bold shrink-0 ${
              tradeableOnly ? 'bg-teal-600 text-teal-950' : 'border border-stone-800 bg-stone-950'
            }`}>
              {tradeableOnly ? '✓' : ''}
            </span>
            <span>Tradeable only</span>
          </button>

          <button
            type="button"
            onClick={() => setMarksOnly(!marksOnly)}
            aria-pressed={marksOnly}
            className={`w-full p-1.5 flex items-center gap-2 text-xs rounded transition-colors duration-150 cursor-pointer ${
              marksOnly
                ? 'bg-stone-900 border border-teal-800 text-stone-100'
                : 'border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className={`w-[13px] h-[13px] rounded-xs flex items-center justify-center font-mono text-micro font-bold shrink-0 ${
              marksOnly ? 'bg-teal-600 text-teal-950' : 'border border-stone-800 bg-stone-950'
            }`}>
              {marksOnly ? '✓' : ''}
            </span>
            <span>Marks only (hide modelled)</span>
          </button>
        </div>

      </aside>

      {/* 1B. LADDER (CENTRE) */}
      <main className="flex flex-col min-h-0 min-w-0 bg-stone-950">
        
        {/* Toolbar */}
        <div className="flex-none flex items-center justify-between gap-4 p-2.5 px-3.5 border-b border-stone-800">
          <div className="flex items-baseline gap-3">
            <h1 className="m-0 font-mono text-sm font-semibold tracking-[0.14em] text-stone-100 uppercase">
              Netback ladder
            </h1>
            <span className="text-xs text-stone-400">
              {filteredList.length} of {activeMarkets.length} markets · {originCode} origin · {pricingSides.certificateSide.toUpperCase()} marks · €{selectedAllIn.toFixed(2)} basis
            </span>
          </div>

          <div className="flex items-center gap-3.5 font-mono text-micro tracking-[0.08em] text-stone-500 uppercase">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-xs" />
              Eligible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 rounded-xs" />
              Conditional
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 bg-sky-500 rounded-xs" />
              Unresolved
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-xs" />
              Blocked
            </span>
          </div>
        </div>

        {/* Column Header Grid */}
        <div className="flex-none grid grid-cols-[26px_26px_minmax(150px,1.1fr)_112px_104px_minmax(140px,1.6fr)_84px_58px] gap-2.5 items-center px-3.5 py-1.5 bg-stone-900 border-b border-stone-800 font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
          <span className="text-center">#</span>
          <span>CC</span>
          
          <button
            type="button"
            onClick={() => handleSortClick('name')}
            aria-sort={sortBy === 'name' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            className={`text-left bg-transparent border-none p-0 cursor-pointer font-mono text-micro font-semibold uppercase tracking-[0.12em] flex items-center gap-1 ${
              sortBy === 'name' ? 'text-teal-300' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Market / scheme
            {sortBy === 'name' && (sortDir === 1 ? ' ▴' : ' ▾')}
          </button>

          <span title="Scheme · UDB · Mass balance · Annex IX · GHG · Member state">
            Gates S U M A G N
          </span>

          <button
            type="button"
            onClick={() => handleSortClick('net')}
            aria-sort={sortBy === 'net' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            className={`text-right bg-transparent border-none p-0 cursor-pointer font-mono text-micro font-semibold uppercase tracking-[0.12em] flex items-center justify-end gap-1 ${
              sortBy === 'net' ? 'text-teal-300' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Net €/MWh
            {sortBy === 'net' && (sortDir === 1 ? ' ▴' : ' ▾')}
          </button>

          <span>Spread vs all-in cost</span>

          <button
            type="button"
            onClick={() => handleSortClick('margin')}
            aria-sort={sortBy === 'margin' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            className={`text-right bg-transparent border-none p-0 cursor-pointer font-mono text-micro font-semibold uppercase tracking-[0.12em] flex items-center justify-end gap-1 ${
              sortBy === 'margin' ? 'text-teal-300' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Margin
            {sortBy === 'margin' && (sortDir === 1 ? ' ▴' : ' ▾')}
          </button>

          <button
            type="button"
            onClick={() => handleSortClick('age')}
            aria-sort={sortBy === 'age' ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
            className={`text-center bg-transparent border-none p-0 cursor-pointer font-mono text-micro font-semibold uppercase tracking-[0.12em] flex items-center justify-center gap-1 ${
              sortBy === 'age' ? 'text-teal-300' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Age
            {sortBy === 'age' && (sortDir === 1 ? ' ▴' : ' ▾')}
          </button>
        </div>

        {/* Data Rows Scroller (min-h-[220px] prevents crushing) */}
        <div className="flex-[1_1_auto] overflow-y-auto min-h-[220px]">
          {filteredList.map((row, index) => {
            const isSelected = row.marketId === selectedMarketId;
            const market = getMarketById(row.marketId);
            const eligibility = eligibilityMap.get(row.marketId);
            const verdict = row.eligibilityVerdict;
            const isBlocked = verdict === 'HARD_BLOCK' || verdict === 'NONE';
            const tone = getVerdictTone(verdict);
            const netVal = row.netNetback ?? 0;
            const isNeg = netVal < 0;
            const spreadPct = Math.min(100, Math.max(1, (Math.abs(netVal) / maxNetAbs) * 100));

            // Mark age
            const markEntry = state.marks.marks[row.marketId];
            const ageDays = getMarkAgeDays(markEntry?.updatedAt);
            const staleness = getMarkStaleness(markEntry?.updatedAt);
            const ageTone = staleness === 'STALE_CRITICAL' ? 'text-red-400 bg-red-950 border-red-800' :
              staleness === 'STALE_WARNING' ? 'text-amber-400 bg-amber-950 border-amber-800' :
              staleness === 'FRESH' ? 'text-emerald-400 bg-emerald-950 border-emerald-800' :
              'text-stone-400 bg-stone-900 border-stone-800';

            // Margin — null until producer pricing is set.
            const deskMarginVal = row.deskMargin;

            // Subline / cap indicator
            const isCapped = market?.ceilingEurMwh !== null && (row.certificateValue?.valueEurPerMWh ?? 0) >= (market?.ceilingEurMwh ?? 9999);

            return (
              <div
                key={row.marketId}
                onClick={() => {
                  setSelectedMarketId(row.marketId);
                  dispatch({ type: 'SELECT_MARKET', id: row.marketId });
                }}
                className={`grid grid-cols-[26px_26px_minmax(150px,1.1fr)_112px_104px_minmax(140px,1.6fr)_84px_58px] gap-2.5 items-center px-3.5 py-1.5 border-b border-stone-900 cursor-pointer transition-colors duration-150 ${
                  isSelected ? 'bg-stone-900 border-l-[3px] border-l-teal-500' : 'bg-stone-950 hover:bg-stone-800/60 border-l-[3px] border-l-transparent'
                }`}
              >
                {/* Rank */}
                <span
                  className={`font-mono font-num text-meta font-semibold text-center py-0.5 rounded-xs ${
                    index === 0
                      ? 'bg-teal-600 text-teal-950 font-bold'
                      : 'text-stone-500'
                  }`}
                >
                  {index + 1}
                </span>

                {/* CC */}
                <span className="font-mono text-meta font-semibold text-stone-400">
                  {market?.country || 'EU'}
                </span>

                {/* Market Name & Subline */}
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className={`text-sm font-semibold truncate ${
                    isBlocked ? 'text-stone-500 line-through' : 'text-stone-100'
                  }`}>
                    {row.marketName}
                  </span>
                  <span className="font-mono text-micro text-stone-500 truncate">
                    {market?.legalBasis || market?.registry || 'RED III compliant'}
                  </span>
                </span>

                {/* 6-Gate Strip */}
                <span className="flex gap-[2px]">
                  {eligibility?.gates.map((g, gi) => {
                    const gTone = getVerdictTone(g.verdict);
                    return (
                      <span
                        key={gi}
                        title={`${GATE_TOOLTIP_TITLES[gi]} — ${g.verdict}: ${g.reason}`}
                        className={`w-4 h-4 rounded-xs border flex items-center justify-center font-mono text-micro font-bold leading-none ${gTone.badge}`}
                      >
                        {GATE_LETTER_MAP[gi]}
                      </span>
                    );
                  })}
                </span>

                {/* Net Netback */}
                <span className="flex flex-col items-end gap-0.5">
                  <span className={`font-mono font-num text-sm font-bold tracking-[-0.02em] ${
                    isNeg ? 'text-red-400' : tone.text
                  }`}>
                    {isNeg ? '−€' : '€'}{Math.abs(netVal).toFixed(2)}
                  </span>
                  <span className="font-mono text-micro text-stone-500">
                    {isCapped ? `CAPPED ${market?.unitLabel || '€/MWh'}` : (market?.unitLabel || '€/MWh')}
                  </span>
                </span>

                {/* Proportional Spread Bar */}
                <span className="relative h-5 bg-stone-900 border-l border-stone-700">
                  <span
                    style={{ width: `${spreadPct.toFixed(1)}%` }}
                    className={`absolute inset-y-[3px] left-0 rounded-xs transition-all duration-150 ${
                      isNeg ? 'bg-red-800 opacity-90' : tone.bar
                    }`}
                  />
                </span>

                {/* Desk Margin */}
                <span className={`font-mono font-num text-xs font-medium text-right ${
                  deskMarginVal !== null && deskMarginVal < 0 ? 'text-red-400' : 'text-stone-400'
                }`}>
                  {deskMarginVal === null
                    ? '—'
                    : `${deskMarginVal < 0 ? '−€' : '€'}${Math.abs(deskMarginVal).toFixed(2)}`}
                </span>

                {/* Age */}
                <span className="flex justify-center">
                  <span className={`font-mono text-micro font-semibold px-1 py-0.5 border rounded-xs ${ageTone}`}>
                    {ageDays !== null ? `${ageDays}d` : 'new'}
                  </span>
                </span>

              </div>
            );
          })}
        </div>

        {/* Pinned Blocked-Opportunity Banner (flex-[0_1_auto] with max-h-[74px] prevents crushing) */}
        {highestBlocked && (
          <div className="flex-[0_1_auto] max-h-[74px] overflow-hidden flex items-start gap-2.5 p-2.5 px-3.5 bg-stone-900 border-t border-red-950">
            <span className="font-mono text-micro font-bold tracking-[0.1em] bg-amber-500 text-amber-950 px-1.5 py-0.5 shrink-0">
              BLOCKED
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs font-semibold text-stone-100 truncate">
                {highestBlocked.market} — theoretical €{highestBlocked.netback.toFixed(2)}/MWh unreachable
              </div>
              <div className="text-xs leading-relaxed text-stone-400 mt-0.5 truncate">
                {highestBlocked.blockingReason} <span className="text-teal-300 font-semibold">Remedy:</span> {highestBlocked.remedy}
              </div>
            </div>
            <span className="font-mono text-micro text-stone-500 shrink-0 pt-0.5">
              RED III Art. 28(2) · Reg. 2024/2792
            </span>
          </div>
        )}

      </main>

      {/* 1C. DOSSIER RAIL (RIGHT, 336px) */}
      <aside className="border-l border-stone-800 bg-stone-950 flex flex-col min-h-0 overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="p-3 border-b border-stone-800 flex flex-col flex-none">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-meta font-semibold tracking-[0.16em] text-stone-400 uppercase">
              Dossier
            </span>
            <span className={`font-mono text-micro font-bold px-1.5 py-0.5 border ${selectedTone.badge}`}>
              {selectedEligibility.overallVerdict}
            </span>
          </div>
          <h2 className="m-0 text-base font-semibold leading-snug text-stone-100 mt-2">
            {selectedMarket.name}
          </h2>
          <div className="font-mono text-meta text-stone-400 tracking-[0.04em] mt-1">
            {selectedMarket.legalBasis || 'RED III Article 25–31'}
          </div>
        </div>

        {/* 2x2 Stat Grid */}
        <div className="grid grid-cols-2 gap-[1px] bg-stone-800 border-b border-stone-800 flex-none">
          <div className="bg-stone-950 p-2.5">
            <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Net netback</div>
            <div className={`font-mono font-num text-base font-semibold mt-1 ${
              (selectedNetbackResult.netNetback ?? 0) < 0 ? 'text-red-400' : selectedTone.text
            }`}>
              €{(selectedNetbackResult.netNetback ?? 0).toFixed(2)}
              <span className="text-micro text-stone-400 font-normal"> /MWh</span>
            </div>
          </div>
          <div className="bg-stone-950 p-2.5">
            <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Cert value</div>
            <div className="font-mono font-num text-base font-semibold text-stone-100 mt-1">
              €{(selectedNetbackResult.certificateValue?.valueEurPerMWh ?? 0).toFixed(2)}
              <span className="text-micro text-stone-400 font-normal"> /MWh</span>
            </div>
          </div>
          <div className="bg-stone-950 p-2.5">
            <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Plants</div>
            <div className="font-mono font-num text-base font-semibold text-stone-100 mt-1">
              {selectedMarket.productionPlants || '—'}
            </div>
          </div>
          <div className="bg-stone-950 p-2.5">
            <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Production</div>
            <div className="font-mono font-num text-base font-semibold text-stone-100 mt-1">
              {selectedMarket.annualProductionTWh ? `${selectedMarket.annualProductionTWh} TWh` : '—'}
            </div>
          </div>
        </div>

        {/* Dual Branch Panel (Germany Only) */}
        {germanDualBranches && (
          <div className="p-3 border-b border-stone-800 flex flex-col gap-2 flex-none">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-meta font-semibold tracking-[0.14em] text-sky-400 uppercase">
                Dual branch · §37a
              </span>
              <span className="font-mono text-micro text-stone-500">
                unresolved for 2026
              </span>
            </div>

            <div className="grid grid-cols-2 gap-[1px] bg-stone-800 border border-stone-800">
              <div className="bg-stone-900 p-2">
                <div className="font-mono text-micro font-bold text-amber-400 bg-amber-950 border border-amber-800 px-1 py-0.5 inline-block">
                  BRANCH 1 · 1× SINGLE
                </div>
                <div className="font-mono font-num text-lg font-bold text-stone-100 mt-1">
                  {germanDualBranches.branch1.net !== null
                    ? `€${germanDualBranches.branch1.net.toFixed(2)}`
                    : '—'}
                </div>
                <div className="font-mono font-num text-micro text-stone-500 mt-0.5">
                  {germanDualBranches.branch1.margin !== null
                    ? `margin €${germanDualBranches.branch1.margin.toFixed(2)}`
                    : 'margin unset'}
                </div>
                <div className="text-[11px] leading-snug text-stone-400 mt-1">
                  {germanDualBranches.branch1.note}
                </div>
              </div>

              <div className="bg-stone-900 p-2">
                <div className="font-mono text-micro font-bold text-sky-400 bg-sky-950 border border-sky-800 px-1 py-0.5 inline-block">
                  BRANCH 2 · 2× RETAINED
                </div>
                <div className="font-mono font-num text-lg font-bold text-stone-100 mt-1">
                  {germanDualBranches.branch2.net !== null
                    ? `€${germanDualBranches.branch2.net.toFixed(2)}`
                    : '—'}
                </div>
                <div className="font-mono font-num text-micro text-stone-500 mt-0.5">
                  {germanDualBranches.branch2.margin !== null
                    ? `margin €${germanDualBranches.branch2.margin.toFixed(2)}`
                    : 'margin unset'}
                </div>
                <div className="text-[11px] leading-snug text-stone-400 mt-1">
                  {germanDualBranches.branch2.note}
                </div>
              </div>
            </div>

            <p className="m-0 text-[11px] leading-relaxed text-stone-500">
              Double counting is a policy multiplier and is being removed. Manure's negative CI is a property of the GHG calculation — unaffected.
            </p>
          </div>
        )}

        {/* Delivery Route Section */}
        <div className="p-3 border-b border-stone-800 flex flex-col gap-2 flex-none">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-meta font-semibold tracking-[0.14em] text-stone-400 uppercase">
              Delivery route {originCode} → {selectedMarket.country}
            </span>
            <button
              type="button"
              onClick={() => setIsLogisticsOpen(true)}
              className="bg-transparent border-none p-0 cursor-pointer font-mono text-micro font-semibold tracking-[0.06em] text-teal-300 hover:text-teal-200"
            >
              PLAYBOOK →
            </button>
          </div>

          <div className="flex flex-col gap-[1px] bg-stone-800 border border-stone-800 mt-1">
            {[logisticsAssessment.modes.virtualSwap, logisticsAssessment.modes.physicalPipeline, logisticsAssessment.modes.bioLng].map(m => {
              const tagLetter = m.mode === 'VIRTUAL_SWAP' ? 'A' : m.mode === 'PHYSICAL_PIPELINE' ? 'B' : 'C';
              const tagTone = tagLetter === 'A' ? 'text-emerald-400 bg-emerald-950 border-emerald-800' :
                tagLetter === 'B' ? 'text-sky-400 bg-sky-950 border-sky-800' :
                'text-amber-400 bg-amber-950 border-amber-800';

              return (
                <div key={m.mode} className="bg-stone-900 p-2 flex items-center gap-2">
                  <span className={`w-[17px] h-[17px] shrink-0 flex items-center justify-center font-mono text-micro font-bold border ${tagTone}`}>
                    {tagLetter}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-stone-200 truncate">
                      {m.title.split(':')[0]}
                    </span>
                    <span className="block font-mono text-micro text-stone-500 truncate">
                      {m.timelineDays}d · {m.regulatoryFeasibility}
                    </span>
                  </span>
                  <span className="font-mono font-num text-xs font-semibold text-stone-200">
                    {m.totalCostEurMwh !== null ? `€${m.totalCostEurMwh.toFixed(2)}` : 'unverified'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance Gates Audit Section */}
        <div className="p-3 border-b border-stone-800 flex flex-col gap-2 flex-none">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-meta font-semibold tracking-[0.14em] text-stone-400 uppercase">
              Compliance gates
            </span>
            <span className="font-mono text-meta font-semibold text-stone-200">
              {selectedEligibility.gates.filter(g => g.verdict === 'PASS').length} / 6 clear
            </span>
          </div>

          <div className="flex flex-col gap-[1px] bg-stone-800 border border-stone-800">
            {selectedEligibility.gates.map((g, gi) => {
              const gTone = getVerdictTone(g.verdict);
              const cite = g.citations?.[0]?.shortName || g.gateLabel;

              return (
                <div key={gi} className="bg-stone-900 p-2 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${gTone.dot}`} />
                    <span className="font-mono text-meta font-semibold tracking-[0.06em] text-stone-100 flex-1">
                      {g.gateLabel}
                    </span>
                    <span className={`font-mono text-micro font-bold px-1 py-0.5 border ${gTone.badge}`}>
                      {g.verdict}
                    </span>
                  </div>
                  <p className="m-0 text-xs leading-relaxed text-stone-400 mt-1 ml-3.5">
                    {g.reason}
                  </p>
                  <div className="font-mono text-micro text-teal-300 mt-1 ml-3.5">
                    {cite}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions at bottom */}
        <div className="p-3 flex flex-col gap-2 mt-auto flex-none">
          <button
            type="button"
            onClick={() => navigate(`/trade?marketId=${selectedMarket.id}&originCountry=${originCode}`)}
            className="w-full p-2.5 bg-teal-600 hover:bg-teal-500 text-teal-50 border-none font-mono text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer transition-colors duration-150"
          >
            Build trade dossier
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => alert(`Exporting dossier summary for ${selectedMarket.name}...`)}
              className="p-2 bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-stone-100 font-mono text-meta font-medium tracking-[0.06em] cursor-pointer transition-colors duration-150"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => navigate('/agents')}
              className="p-2 bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-stone-100 font-mono text-meta font-medium tracking-[0.06em] cursor-pointer transition-colors duration-150"
            >
              Ask copilot
            </button>
          </div>
        </div>

      </aside>

      {/* Logistics Playbook Modal */}
      <LogisticsModal
        originCountry={originCode}
        targetCountry={selectedMarket.country}
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
      />

    </div>
  );
}
