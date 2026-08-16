import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { Consignment, CertificationScheme, ChainOfCustody, AnnexClassification, UDBStatus, PoSStatus } from '../../domain/consignment/types';
import { Market, PriceSide } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { CitationBlock } from '../../shared/components/CitationBlock';
import { CopyButton } from '../../shared/components/CopyButton';
import { StaleIndicator } from '../../shared/components/StaleIndicator';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback, tCO2ePerMWh } from '../../domain/netback/engine';
import { generateTradeSummary } from '../../domain/trade/summary';
import { assessmentContainsPraData } from '../../domain/trade/licensing';
import { TradeAssessment } from '../../domain/trade/types';
import { CI_COMPARATOR_ROAD_TRANSPORT, COUNTRY_NAMES } from '../../domain/markets/constants';
import { 
  Calculator, 
  ShieldCheck, 
  AlertTriangle, 
  BookmarkPlus, 
  TrendingUp,
  ExternalLink,
  Truck,
  ChevronDown,
  ChevronUp,
  FileText,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';

const EU_COUNTRY_CODES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

/**
 * Drops a leading ISO country code from a market's short name when that code is
 * already rendered in its own column ("AT" + "AT EGG" reads as "AT AT EGG").
 * Falls back to the original string whenever stripping would leave nothing.
 */
function stripCountryPrefix(name: string, code: string): string {
  const stripped = name.replace(new RegExp(`^${code}\\s+`, 'i'), '').trim();
  return stripped || name;
}

/**
 * Formats a euro amount for the deal-ticket ledger with an explicit +/− sign.
 * `direction` states how the row is meant to hit the book; a negative value flips the
 * sign, so a negative cost prints as a credit and a negative netback prints as a payment out.
 * Never hardcode the sign at the call site — unbounded cost inputs can drive any row negative.
 */
function signedEur(value: number, direction: 'inflow' | 'outflow' = 'inflow'): string {
  const isInflow = direction === 'inflow' ? value >= 0 : value < 0;
  const magnitude = Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isInflow ? '+' : '−'}€${magnitude}`;
}

export function TradeBuilderScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preSelectedMarketId = searchParams.get('marketId') || 'DE_THG';
  const { state, dispatch } = useAppState();
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [showFullAudit, setShowFullAudit] = useState(false);

  // Market Table Sorting (Phase 4)
  const [marketSortField, setMarketSortField] = useState<'netback' | 'market' | 'status'>('netback');
  const [marketSortDir, setMarketSortDir] = useState<'asc' | 'desc'>('desc');

  // Active consignment form state
  const [consignment, setConsignment] = useState<Consignment>(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    if (existing) return existing;
    return REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  });

  const [selectedMarketId, setSelectedMarketId] = useState<string>(preSelectedMarketId);
  const [userNotes, setUserNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync market and origin selection with URL query param if present
  useEffect(() => {
    const queryMarket = searchParams.get('marketId');
    const queryOrigin = searchParams.get('originCountry');
    const queryVolume = searchParams.get('volume');

    if (queryMarket && MARKETS.some(m => m.id === queryMarket)) {
      setSelectedMarketId(queryMarket);
    }

    if (queryOrigin) {
      const code = queryOrigin.toUpperCase();
      const isEU = EU_COUNTRY_CODES.includes(code);
      setConsignment(prev => {
        const countryName = COUNTRY_NAMES[code] || code;

        return {
          ...prev,
          originCountry: code,
          originCountryName: countryName,
          injectionCountry: code,
          injectionIsEU: isEU,
          udbStatus: !isEU ? 'NOT_RECORDED' : prev.udbStatus,
          name: `${countryName} ${prev.feedstockName || 'Biomethane'}`,
          volumeMWh: queryVolume ? Number(queryVolume) : prev.volumeMWh,
        };
      });
    }
  }, [searchParams]);

  // Handle feedstock change
  const handleFeedstockChange = (feedstockKey: string) => {
    const info = FEEDSTOCK_REGISTRY[feedstockKey];
    if (info) {
      setConsignment(prev => ({
        ...prev,
        feedstock: feedstockKey,
        feedstockName: info.name,
        annexClassification: info.annexClassification,
        carbonIntensity: info.defaultCI,
      }));
    }
  };

  // Handle injection country change (Never auto-promote to RECORDED)
  const handleInjectionCountryChange = (countryCode: string) => {
    const isEU = EU_COUNTRY_CODES.includes(countryCode);
    setConsignment(prev => ({
      ...prev,
      injectionCountry: countryCode,
      injectionIsEU: isEU,
      udbStatus: !isEU ? 'NOT_RECORDED' : prev.udbStatus,
    }));
  };

  const selectedMarket = useMemo(() => {
    return getMarketById(selectedMarketId) || MARKETS.find(m => m.id === 'DE_THG')!;
  }, [selectedMarketId]);

  // Compute live regulatory eligibility & netbacks
  const eligibility = useMemo(() => {
    return evaluateEligibility(consignment, selectedMarket);
  }, [consignment, selectedMarket]);

  const netback = useMemo(() => {
    return computeNetback(
      selectedMarket, 
      consignment, 
      state.marks, 
      state.costs, 
      state.marks.pricingSides ?? state.marks.pricingSide
    );
  }, [selectedMarket, consignment, state.marks, state.costs]);

  // Drives the loss treatment on the bottom-line P&L block. deskPnL is derived from
  // deskMargin, so the per-MWh spread is the single source of truth for profit vs loss.
  const isDeskLoss = netback.deskMargin !== null && netback.deskMargin < 0;

  // Assemble Boss-Ready Trade Assessment Object & Summary Text
  const currentAssessment: TradeAssessment = useMemo(() => {
    return {
      id: 'assessment_' + Date.now(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      consignment,
      targetMarketId: selectedMarket.id,
      targetMarketName: selectedMarket.name,
      eligibility,
      netback,
      marks: state.marks,
      costs: state.costs,
      userNotes,
    };
  }, [consignment, selectedMarket, eligibility, netback, state.marks, state.costs, userNotes]);

  const summaryText = useMemo(() => {
    return generateTradeSummary(currentAssessment);
  }, [currentAssessment]);

  // Calculated GHG saving percentage
  const ghgSavingPct = useMemo(() => {
    const saving = ((CI_COMPARATOR_ROAD_TRANSPORT - consignment.carbonIntensity) / CI_COMPARATOR_ROAD_TRANSPORT) * 100;
    return saving.toFixed(1);
  }, [consignment.carbonIntensity]);

  // Calculated carbon factor
  const tco2eFactor = useMemo(() => {
    return tCO2ePerMWh(consignment.carbonIntensity).toFixed(4);
  }, [consignment.carbonIntensity]);

  // Delivery Period & Compliance Year display label
  const deliveryPeriodLabel = useMemo(() => {
    const dp = consignment.deliveryPeriod;
    if (!dp?.complianceYear) return 'compliance year unset';
    const typeStr = dp.type === 'CALENDAR'
      ? `CAL-${String(dp.complianceYear).slice(-2)}`
      : dp.type === 'QUARTER'
      ? `Q-${String(dp.complianceYear).slice(-2)}`
      : dp.type === 'MONTH'
      ? `M-${String(dp.complianceYear).slice(-2)}`
      : dp.type === 'CUSTOM'
      ? 'Custom delivery'
      : `CAL-${String(dp.complianceYear).slice(-2)}`;
    return `${typeStr} · compliance year ${dp.complianceYear}`;
  }, [consignment.deliveryPeriod]);

  const handleSaveToLibrary = () => {
    dispatch({ type: 'SAVE_ASSESSMENT', assessment: currentAssessment });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handlePreset = (presetKey: keyof typeof REFERENCE_CONSIGNMENTS, targetMarket: string) => {
    const preset = REFERENCE_CONSIGNMENTS[presetKey];
    if (preset) {
      setConsignment(preset);
      setSelectedMarketId(targetMarket);
      setSearchParams({ marketId: targetMarket, originCountry: preset.originCountry });
    }
  };

  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');
  const markEntry = state.marks.marks[selectedMarket.id];

  const praCheck = useMemo(() => assessmentContainsPraData(currentAssessment), [currentAssessment]);

  // 4.2 Runner-Up Best Alternative Market (dynamic highest netback among ELIGIBLE/CONDITIONAL)
  const runnerUp = useMemo(() => {
    const currentPricingSides = state.marks.pricingSides ?? state.marks.pricingSide ?? 'bid';
    const otherMarkets = activeMarkets.filter(m => m.id !== selectedMarket.id);
    const candidateList = otherMarkets
      .map(m => {
        const el = evaluateEligibility(consignment, m);
        if (el.overallVerdict !== 'ELIGIBLE' && el.overallVerdict !== 'CONDITIONAL') return null;
        const nb = computeNetback(m, consignment, state.marks, state.costs, currentPricingSides);
        if (nb.netNetback === null) return null;
        return { market: m, el, nb };
      })
      .filter((item): item is { market: Market; el: any; nb: any } => item !== null);

    if (candidateList.length === 0) return null;
    candidateList.sort((a, b) => (b.nb.netNetback ?? 0) - (a.nb.netNetback ?? 0));
    const best = candidateList[0];
    const currentVal = netback.netNetback ?? 0;
    const spread = (best.nb.netNetback ?? 0) - currentVal;
    return {
      market: best.market,
      netback: best.nb.netNetback,
      spread,
    };
  }, [activeMarkets, selectedMarket.id, consignment, state.marks, state.costs, state.marks.pricingSides, state.marks.pricingSide, netback.netNetback]);

  // 4.4 Logistics Execution Summary
  const logisticsSummary = useMemo(() => {
    return calculateLogisticsRoute(consignment.originCountry, selectedMarket.country || 'DE');
  }, [consignment.originCountry, selectedMarket.country]);

  // Computed Market Rows for Dense Table (Phase 4)
  const marketRows = useMemo(() => {
    return activeMarkets.map(m => {
      const elig = evaluateEligibility(consignment, m);
      const nb = computeNetback(m, consignment, state.marks, state.costs, 'bid');
      const isBlocked = elig.overallVerdict === 'HARD_BLOCK';
      return {
        m,
        elig,
        nb,
        isBlocked,
      };
    });
  }, [activeMarkets, consignment, state.marks, state.costs]);

  const sortedMarkets = useMemo(() => {
    return [...marketRows].sort((a, b) => {
      if (marketSortField === 'netback') {
        if (a.isBlocked && !b.isBlocked) return 1;
        if (!a.isBlocked && b.isBlocked) return -1;

        if (a.nb.netNetback !== null && b.nb.netNetback !== null) {
          return marketSortDir === 'desc'
            ? b.nb.netNetback - a.nb.netNetback
            : a.nb.netNetback - b.nb.netNetback;
        }
        if (a.nb.netNetback !== null && b.nb.netNetback === null) return -1;
        if (a.nb.netNetback === null && b.nb.netNetback !== null) return 1;
        return a.m.name.localeCompare(b.m.name);
      }

      if (marketSortField === 'market') {
        const res = (a.m.country || 'EU').localeCompare(b.m.country || 'EU');
        return marketSortDir === 'asc' ? res : -res;
      }

      if (marketSortField === 'status') {
        const score = (v: string) => (v === 'ELIGIBLE' ? 3 : v === 'CONDITIONAL' || v === 'UNRESOLVED' ? 2 : 1);
        const diff = score(b.elig.overallVerdict) - score(a.elig.overallVerdict);
        return marketSortDir === 'desc' ? diff : -diff;
      }

      return 0;
    });
  }, [marketRows, marketSortField, marketSortDir]);

  // Gate expansion state (Phase 5)
  const [manuallyToggledGates, setManuallyToggledGates] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);

  // Summary counts
  const totalGatesCount = eligibility.gates.length;
  const passGatesCount = eligibility.gates.filter(g => g.verdict === 'PASS').length;
  const blockedGatesCount = eligibility.gates.filter(g => g.verdict === 'HARD_BLOCK').length;
  const unresolvedGatesCount = eligibility.gates.filter(g => g.verdict === 'UNRESOLVED').length;
  const conditionalGatesCount = eligibility.gates.filter(g => g.verdict === 'CONDITIONAL').length;

  const isGateExpanded = (gate: typeof eligibility.gates[0], idx: number) => {
    const key = `${gate.gate}_${idx}`;
    if (manuallyToggledGates[key] !== undefined) {
      return manuallyToggledGates[key];
    }
    if (allExpanded !== null) {
      return allExpanded;
    }
    return gate.verdict !== 'PASS';
  };

  const toggleGate = (gate: typeof eligibility.gates[0], idx: number) => {
    const key = `${gate.gate}_${idx}`;
    const current = isGateExpanded(gate, idx);
    setManuallyToggledGates(prev => ({ ...prev, [key]: !current }));
  };

  const toggleExpandAll = () => {
    if (allExpanded === true) {
      setAllExpanded(false);
      setManuallyToggledGates({});
    } else {
      setAllExpanded(true);
      setManuallyToggledGates({});
    }
  };

  const renderComplianceChecklist = () => {
    const areAllClear = passGatesCount === totalGatesCount;

    return (
      <div className="bg-stone-900 rounded p-3 space-y-2.5 text-xs">
        
        {/* Header & Global Toggle */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <span className="text-micro font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
            Regulatory Checklist ({totalGatesCount})
          </span>
          <button
            onClick={toggleExpandAll}
            className="text-micro text-teal-400 hover:underline font-medium flex items-center gap-1"
          >
            {allExpanded === true ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Header Summary Line */}
        <div className="flex items-center justify-between text-xs px-1 py-0.5 bg-stone-950 rounded">
          <div className="text-meta">
            {areAllClear ? (
              <span className="text-teal-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All {totalGatesCount} gates clear
              </span>
            ) : (
              <span className="text-stone-100">
                <strong className="text-teal-400">{passGatesCount}</strong> / {totalGatesCount} gates clear
                {blockedGatesCount > 0 && <span className="text-red-500 ml-1">· {blockedGatesCount} blocked</span>}
                {unresolvedGatesCount > 0 && <span className="text-sky-400 ml-1">· {unresolvedGatesCount} unresolved</span>}
                {conditionalGatesCount > 0 && <span className="text-amber-500 ml-1">· {conditionalGatesCount} conditional</span>}
              </span>
            )}
          </div>
          <StatusChip variant={eligibility.overallVerdict} size="xs" />
        </div>

        {/* Gates List */}
        <div className="space-y-1">
          {eligibility.gates.map((gate, idx) => {
            const expanded = isGateExpanded(gate, idx);

            return (
              <div 
                key={idx} 
                className={`rounded transition-colors ${
                  gate.verdict === 'PASS' 
                    ? 'bg-stone-950' 
                    : gate.verdict === 'CONDITIONAL' || gate.verdict === 'UNRESOLVED'
                    ? 'bg-amber-950 border border-amber-500/40'
                    : 'bg-red-950 border border-red-500/40'
                }`}
              >
                {/* Single dense line header per gate */}
                <div 
                  onClick={() => toggleGate(gate, idx)}
                  className="h-8 px-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-stone-900/40 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {gate.verdict === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                    {gate.verdict === 'CONDITIONAL' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    {gate.verdict === 'UNRESOLVED' && <AlertCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    {gate.verdict === 'HARD_BLOCK' && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    
                    <span className="font-semibold text-stone-100 text-meta truncate">
                      {gate.gateLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusChip variant={gate.verdict} size="xs" />
                    {expanded ? (
                      <ChevronUp className="w-3 h-3 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-stone-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details (Auto-expanded for non-PASS or user click) */}
                {expanded && (
                  <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-stone-800/40">
                    <p className="text-stone-400 text-meta leading-relaxed pl-5 font-sans">
                      {gate.reason}
                    </p>

                    {gate.remedy && (
                      <div className="ml-5 p-1.5 bg-stone-950 border border-amber-500/30 rounded text-micro text-amber-500">
                        <strong className="text-stone-100">Action:</strong> {gate.remedy}
                      </div>
                    )}

                    {gate.citations.length > 0 && (
                      <div className="ml-5 pt-1 space-y-1">
                        {gate.citations.map((cit, cIdx) => (
                          <CitationBlock key={cIdx} citation={cit} compact={true} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-2 font-sans text-stone-100 pb-16">
      
      {/* Top Header Strip */}
      <div className="bg-stone-900 rounded p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-stone-900 flex items-center justify-center text-teal-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-semibold text-stone-100 tracking-tight font-mono uppercase">
                Trade Builder & Deal Ticket
              </h1>
              <span className="px-1.5 py-0.5 rounded text-micro font-mono font-medium bg-stone-900 text-stone-400">
                {consignment.originCountryName} → {selectedMarket.countryName || 'Pan-EU'}
              </span>
            </div>
            <p className="text-stone-400 text-meta mt-0.5">
              RED III regulatory clearance & commercial netback economics
            </p>
          </div>
        </div>

        {/* Quick Scenarios Segmented Bar */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-stone-400 text-micro uppercase tracking-wider font-mono">Presets:</span>
          <div className="inline-flex bg-stone-950 p-0.5 rounded gap-1 font-mono text-meta">
            <button
              onClick={() => handlePreset('DANISH_MANURE', 'DE_THG')}
              className="px-2 py-0.5 rounded text-meta font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-900 transition-colors"
            >
              DK Manure (THG)
            </button>
            <button
              onClick={() => handlePreset('UK_FOOD_WASTE', 'DE_THG')}
              className="px-2 py-0.5 rounded text-meta font-medium text-red-500 hover:bg-red-950 transition-colors"
            >
              UK Grid (Blocked)
            </button>
            <button
              onClick={() => handlePreset('ISCC_PLUS_VOLUNTARY', 'VOL_SCOPE1')}
              className="px-2 py-0.5 rounded text-meta font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-900 transition-colors"
            >
              ISCC PLUS (Voluntary)
            </button>
            <button
              onClick={() => handlePreset('FUELEU_MARITIME_LNG', 'FUELEU')}
              className="px-2 py-0.5 rounded text-meta font-medium text-sky-400 hover:bg-sky-950/40 transition-colors"
            >
              FuelEU Maritime
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Institutional Trading Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 2xl:flex 2xl:flex-row gap-3 items-start w-full">
        
        {/* COLUMN 1: CONSIGNMENT & INPUTS (~340px fixed on 2xl) */}
        <div className="lg:col-span-5 2xl:w-[340px] 2xl:shrink-0 space-y-3 2xl:sticky 2xl:top-16 2xl:max-h-[calc(100vh-5.5rem)] 2xl:overflow-y-auto 2xl:pr-1">
          
          {/* GROUP 1: Consignment Specification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="text-micro font-semibold text-stone-400 uppercase tracking-wider">
                1. Consignment Inputs
              </span>
              <span className="text-micro text-stone-400 font-mono">
                {consignment.originCountry} • {consignment.feedstockName}
              </span>
            </div>

            <div className="bg-stone-900 rounded p-3 space-y-3 text-xs">
              
              {/* Reference Label & Counterparty */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">Reference Label</label>
                  <input
                    type="text"
                    value={consignment.name}
                    onChange={e => setConsignment({ ...consignment, name: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-100 focus:border-teal-400 outline-none font-mono"
                    placeholder="e.g., Baltic Manure Cargo"
                  />
                </div>
                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">Counterparty (Opt)</label>
                  <input
                    type="text"
                    value={consignment.counterparty ?? ''}
                    onChange={e => setConsignment({ ...consignment, counterparty: e.target.value || null })}
                    placeholder="e.g. Shell Energy"
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-100 focus:border-teal-400 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Origin Country & Feedstock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">Origin Country</label>
                  <select
                    value={consignment.originCountry}
                    onChange={e => {
                      const selected = MARKETS.find(m => m.country === e.target.value) || MARKETS[0];
                      setConsignment({
                        ...consignment,
                        originCountry: e.target.value,
                        originCountryName: selected.countryName || e.target.value,
                      });
                    }}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 focus:border-teal-400 outline-none"
                  >
                    {activeMarkets.map(m => (
                      <option key={m.id} value={m.country}>
                        {m.country} — {m.countryName || m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">Feedstock Type</label>
                  <select
                    value={consignment.feedstock}
                    onChange={e => handleFeedstockChange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 focus:border-teal-400 outline-none font-semibold"
                  >
                    {Object.entries(FEEDSTOCK_REGISTRY).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Carbon Intensity Slider */}
              <div className="p-2.5 bg-stone-950 rounded space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-400 text-micro uppercase tracking-wide font-mono">Carbon Intensity</span>
                  <span className="font-semibold text-stone-100 font-mono text-xs">
                    {consignment.carbonIntensity} <span className="text-micro text-stone-400">gCO₂e/MJ</span>
                  </span>
                </div>

                <input
                  type="range"
                  min="-150"
                  max="60"
                  step="1"
                  value={consignment.carbonIntensity}
                  onChange={e => setConsignment({ ...consignment, carbonIntensity: Number(e.target.value) })}
                  className="w-full accent-teal-400 cursor-pointer h-1 bg-stone-900 rounded appearance-none"
                />

                <div className="flex justify-between text-micro text-stone-400 pt-1 border-t border-stone-800">
                  <span>GHG: <strong className="text-stone-100">{ghgSavingPct}%</strong></span>
                  <span>Avoided: <strong className="text-stone-100">{tco2eFactor} t/MWh</strong></span>
                </div>
              </div>

              {/* Commissioning Date & Scheme */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">Commissioning</label>
                  <select
                    value={consignment.commissioningDateRange}
                    onChange={e => setConsignment({ ...consignment, commissioningDateRange: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 focus:border-teal-400 outline-none"
                  >
                    <option value="PRE_OCT_2015">Pre-2015 (&gt;50%)</option>
                    <option value="OCT_2015_TO_2020">2015–2020 (&gt;60%)</option>
                    <option value="POST_2021_TO_2025">2021–2025 (&gt;65%)</option>
                    <option value="POST_2026">Post-2026 (&gt;70%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">Scheme</label>
                  <select
                    value={consignment.certificationScheme}
                    onChange={e => setConsignment({ ...consignment, certificationScheme: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 focus:border-teal-400 outline-none"
                  >
                    <option value="ISCC_EU">ISCC EU</option>
                    <option value="ISCC_PLUS">ISCC PLUS</option>
                    <option value="REDCERT_EU">REDcert-EU</option>
                    <option value="REDCERT2">REDcert²</option>
                    <option value="2BSVS">2BSvs</option>
                    <option value="KZR_INIG">KZR INiG</option>
                  </select>
                </div>
              </div>

              {/* Chain of Custody & Grid Injection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">Chain of Custody</label>
                  <select
                    value={consignment.chainOfCustody}
                    onChange={e => setConsignment({ ...consignment, chainOfCustody: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 focus:border-teal-400 outline-none"
                  >
                    <option value="MASS_BALANCE">Mass Balance</option>
                    <option value="BOOK_AND_CLAIM">Book & Claim</option>
                    <option value="SEGREGATION">Segregation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">Grid Injection</label>
                  <select
                    value={consignment.injectionCountry}
                    onChange={e => handleInjectionCountryChange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 focus:border-teal-400 outline-none"
                  >
                    <option value="DK">Denmark (EU)</option>
                    <option value="DE">Germany (EU)</option>
                    <option value="FR">France (EU)</option>
                    <option value="NL">Netherlands (EU)</option>
                    <option value="UK">UK (Third-Country)</option>
                    <option value="US">USA (Virtual)</option>
                  </select>
                </div>
              </div>

              {/* UDB & PoS Status */}
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">UDB</label>
                  <select
                    value={consignment.udbStatus}
                    onChange={e => setConsignment({ ...consignment, udbStatus: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-meta text-stone-100 focus:border-teal-400 outline-none"
                  >
                    <option value="RECORDED">RECORDED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="NOT_RECORDED">NOT RECORDED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">PoS</label>
                  <select
                    value={consignment.posStatus}
                    onChange={e => setConsignment({ ...consignment, posStatus: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-meta text-stone-100 focus:border-teal-400 outline-none"
                  >
                    <option value="ISSUED">ISSUED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="NOT_AVAILABLE">NOT AVAIL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-micro text-stone-400 uppercase mb-1">MWh Vol</label>
                  <input
                    type="number"
                    value={consignment.volumeMWh ?? ''}
                    onChange={e => setConsignment({ ...consignment, volumeMWh: e.target.value ? Number(e.target.value) : null })}
                    placeholder="10000"
                    className="w-full bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-meta text-stone-100 focus:border-teal-400 outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Delivery Period & Compliance Year (Phase 2) */}
              <div className="p-2 bg-stone-950 rounded space-y-1.5 border border-stone-800/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-400 text-micro uppercase tracking-wide">Delivery Tenor & Compliance Year</span>
                  <span className={`text-micro ${consignment.deliveryPeriod?.complianceYear ? 'text-teal-400' : 'text-amber-500'}`}>
                    {consignment.deliveryPeriod?.complianceYear ? `CY ${consignment.deliveryPeriod.complianceYear}` : 'Year Unset'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-micro text-stone-400 uppercase mb-1">Tenor</label>
                    <select
                      value={consignment.deliveryPeriod?.type ?? ''}
                      onChange={e => {
                        const val = e.target.value as any;
                        setConsignment({
                          ...consignment,
                          deliveryPeriod: {
                            type: val || null,
                            startDate: consignment.deliveryPeriod?.startDate ?? null,
                            endDate: consignment.deliveryPeriod?.endDate ?? null,
                            complianceYear: consignment.deliveryPeriod?.complianceYear ?? null,
                          },
                        });
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-1.5 py-1 text-meta text-stone-100 focus:border-teal-400 outline-none"
                    >
                      <option value="">Select Tenor...</option>
                      <option value="CALENDAR">Calendar Year (CAL)</option>
                      <option value="QUARTER">Quarter (Q)</option>
                      <option value="MONTH">Month (M)</option>
                      <option value="CUSTOM">Custom Window</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-micro text-stone-400 uppercase mb-1">Compliance Year</label>
                    <select
                      value={consignment.deliveryPeriod?.complianceYear ?? ''}
                      onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setConsignment({
                          ...consignment,
                          deliveryPeriod: {
                            type: consignment.deliveryPeriod?.type ?? (val ? 'CALENDAR' : null),
                            startDate: consignment.deliveryPeriod?.startDate ?? (val ? `${val}-01-01` : null),
                            endDate: consignment.deliveryPeriod?.endDate ?? (val ? `${val}-12-31` : null),
                            complianceYear: val,
                          },
                        });
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-1.5 py-1 text-meta text-stone-100 focus:border-teal-400 outline-none font-semibold"
                    >
                      <option value="">Unset (Missing)</option>
                      <option value="2024">2024 (Pre-2026 2×)</option>
                      <option value="2025">2025 (Pre-2026 2×)</option>
                      <option value="2026">2026 (Post-2025 Dual)</option>
                      <option value="2027">2027 (Post-2025 Dual)</option>
                      <option value="2028">2028 (ETS2 Live / CPB P1)</option>
                      <option value="2029">2029 (ETS2 Live)</option>
                      <option value="2030">2030 (RED III Target)</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* GROUP 2: Target Offtake Market Dense Table (Phase 4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="text-micro font-semibold text-stone-400 uppercase tracking-wider">
                2. Target Offtake Market ({activeMarkets.length})
              </span>
              <span className="text-micro text-stone-400">
                {sortedMarkets.filter(r => !r.isBlocked && r.nb.netNetback !== null).length} priced • {sortedMarkets.filter(r => r.isBlocked).length} blocked
              </span>
            </div>

            <div className="bg-stone-900 rounded p-1.5 font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-micro text-stone-400 uppercase border-b border-stone-800 select-none">
                    <th 
                      onClick={() => {
                        if (marketSortField === 'market') setMarketSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setMarketSortField('market'); setMarketSortDir('asc'); }
                      }}
                      className="py-1 px-1.5 font-semibold cursor-pointer hover:text-stone-100"
                    >
                      Market {marketSortField === 'market' && (marketSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th 
                      onClick={() => {
                        if (marketSortField === 'status') setMarketSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setMarketSortField('status'); setMarketSortDir('desc'); }
                      }}
                      className="py-1 px-1 font-semibold cursor-pointer hover:text-stone-100"
                    >
                      Status {marketSortField === 'status' && (marketSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="py-1 px-1 font-semibold text-center">Side</th>
                    <th 
                      onClick={() => {
                        if (marketSortField === 'netback') setMarketSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setMarketSortField('netback'); setMarketSortDir('desc'); }
                      }}
                      className="py-1 pr-2 font-semibold text-right cursor-pointer hover:text-stone-100 whitespace-nowrap"
                    >
                      Netback (€) {marketSortField === 'netback' && (marketSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMarkets.map(({ m, elig, nb, isBlocked }) => {
                    const isSelected = m.id === selectedMarket.id;
                    const code = m.country || 'EU';

                    return (
                      <tr
                        key={m.id}
                        onClick={() => {
                          setSelectedMarketId(m.id);
                          setSearchParams({ marketId: m.id, originCountry: consignment.originCountry });
                        }}
                        className={`h-7 cursor-pointer transition-colors border-b border-stone-800/40 ${
                          isSelected
                            ? 'bg-stone-900 border-l-2 border-teal-400 text-stone-100'
                            : 'hover:bg-stone-900/70 text-stone-400 hover:text-stone-100'
                        } ${isBlocked ? 'opacity-50' : ''}`}
                      >
                        {/* 1. Market column: fixed-width ISO code gutter + name.
                            The code is its own aligned column so the eye can scan
                            straight down it, which is the whole point of the ISO
                            prefix — so the name must not repeat it. */}
                        <td className="py-1 px-1.5 whitespace-nowrap">
                          <div className="flex items-baseline gap-1.5">
                            <span className={`font-semibold text-meta w-6 shrink-0 ${isSelected ? 'text-stone-100' : 'text-stone-300'} ${isBlocked ? 'line-through' : ''}`}>
                              {code}
                            </span>
                            <span className={`text-micro truncate max-w-[90px] ${isBlocked ? 'line-through text-stone-400' : isSelected ? 'text-stone-100' : 'text-stone-400'}`}>
                              {stripCountryPrefix(m.shortName || m.name, code)}
                            </span>
                          </div>
                        </td>

                        {/* 2. Status column (dot + text) */}
                        <td className="py-1 px-1 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-micro">
                            {elig.overallVerdict === 'ELIGIBLE' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                <span className="text-teal-400">Clear</span>
                              </>
                            )}
                            {elig.overallVerdict === 'CONDITIONAL' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span className="text-amber-500">Cond</span>
                              </>
                            )}
                            {elig.overallVerdict === 'UNRESOLVED' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                <span className="text-sky-400">Unres</span>
                              </>
                            )}
                            {elig.overallVerdict === 'HARD_BLOCK' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span className="text-red-500">Block</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 3. Mark Side */}
                        <td className="py-1 px-1 text-center text-micro text-stone-400">
                          Bid
                        </td>

                        {/* 4. Netback (€/MWh) - Decimal Aligned, no repetitive currency symbol */}
                        <td className="py-1 pr-2 text-right whitespace-nowrap">
                          {nb.netNetback !== null ? (
                            <span className={`font-semibold font-num tabular-nums text-meta ${
                              isSelected ? 'text-teal-400' : isBlocked ? 'text-stone-400' : 'text-stone-100'
                            }`}>
                              {nb.netNetback.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-micro text-stone-400 italic">
                              {isBlocked ? 'Blocked' : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* GROUP 3: Cost Structure & Producer Offtake (Zero Nested Borders) */}
          <div id="cost-procurement-section" className="space-y-2 scroll-mt-20">
            <div className="flex items-center justify-between font-mono">
              <span className="text-micro font-semibold text-stone-400 uppercase tracking-wider">
                3. Cost & Procurement Terms
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="px-2 py-0.5 rounded bg-stone-900 text-stone-400 hover:text-stone-100 text-micro font-medium transition-colors flex items-center gap-1 font-mono"
                >
                  <Truck className="w-3 h-3" />
                  Corridor
                </button>
                <button
                  onClick={() => {
                    const targetC = selectedMarket.country || 'ES';
                    const logRoute = calculateLogisticsRoute(consignment.originCountry, targetC, state.marks.gasIndex.mid ?? 28.50);
                    const isDomestic = consignment.originCountry === targetC;
                    const transfer = isDomestic ? 0.80 : Number((0.80 + Math.abs(logRoute.hubSpread.basisSpreadEurMwh)).toFixed(2));
                    const cert = 0.45;
                    const logist = isDomestic ? 0.25 : 0.40;
                    const procurement = consignment.feedstock.includes('MANURE') ? 65.00 : 58.00;

                    dispatch({
                      type: 'SET_COSTS',
                      costs: {
                        transferCosts: transfer,
                        certificationCosts: cert,
                        logistics: logist,
                        deliveredCost: procurement,
                        otherCosts: null,
                      }
                    });
                  }}
                  className="px-2 py-0.5 rounded bg-stone-900 text-teal-400 hover:bg-stone-800 text-micro font-medium transition-colors font-mono"
                >
                  Auto-Fill
                </button>
              </div>
            </div>

            {/* Flattened single container without nested card borders */}
            <div className="bg-stone-900 rounded p-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro text-stone-400 mb-1">Transfer (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.transferCosts ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { transferCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 font-mono text-stone-100 text-xs focus:border-teal-400 outline-none"
                    placeholder="2.20"
                  />
                </div>

                <div>
                  <label className="block text-micro text-stone-400 mb-1">Certification (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.certificationCosts ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { certificationCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 font-mono text-stone-100 text-xs focus:border-teal-400 outline-none"
                    placeholder="0.45"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-micro text-stone-400 mb-1">Logistics / Conditioning (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.logistics ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { logistics: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 font-mono text-stone-100 text-xs focus:border-teal-400 outline-none"
                    placeholder="1.35"
                  />
                </div>
              </div>

              {/* Producer Pricing Section (Flattened) */}
              <div className="pt-2 border-t border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-micro font-semibold text-stone-400 uppercase tracking-wide">Producer Pricing Mode</span>
                  <div className="inline-flex bg-stone-950 p-0.5 rounded text-micro">
                    <button
                      type="button"
                      onClick={() => dispatch({
                        type: 'SET_COSTS',
                        costs: {
                          producerPricing: {
                            mode: 'INDEX_LINKED',
                            fixedPriceEurPerMwh: state.costs.producerPricing?.fixedPriceEurPerMwh ?? state.costs.deliveredCost ?? null,
                            indexLinkedShare: state.costs.producerPricing?.indexLinkedShare ?? null,
                            source: null,
                            lastVerified: null,
                            confidence: 'UNVERIFIED',
                          }
                        }
                      })}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${
                        (state.costs.producerPricing?.mode ?? 'INDEX_LINKED') === 'INDEX_LINKED'
                          ? 'bg-stone-800 text-teal-400'
                          : 'text-stone-400 hover:text-stone-100'
                      }`}
                    >
                      Index (% Share)
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({
                        type: 'SET_COSTS',
                        costs: {
                          producerPricing: {
                            mode: 'FIXED_PRICE',
                            fixedPriceEurPerMwh: state.costs.producerPricing?.fixedPriceEurPerMwh ?? state.costs.deliveredCost ?? null,
                            indexLinkedShare: state.costs.producerPricing?.indexLinkedShare ?? null,
                            source: null,
                            lastVerified: null,
                            confidence: 'UNVERIFIED',
                          }
                        }
                      })}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${
                        state.costs.producerPricing?.mode === 'FIXED_PRICE'
                          ? 'bg-amber-950 text-amber-500'
                          : 'text-stone-400 hover:text-stone-100'
                      }`}
                    >
                      Fixed Price
                    </button>
                  </div>
                </div>

                {(state.costs.producerPricing?.mode ?? 'INDEX_LINKED') === 'INDEX_LINKED' ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-micro">
                      <label className="text-stone-400">Producer Value Share (0.00 – 1.00):</label>
                      <div className="flex gap-1 items-center">
                        <button
                          type="button"
                          onClick={() => dispatch({
                            type: 'SET_COSTS',
                            costs: {
                              producerPricing: {
                                mode: 'INDEX_LINKED',
                                fixedPriceEurPerMwh: state.costs.producerPricing?.fixedPriceEurPerMwh ?? null,
                                indexLinkedShare: 0.90,
                                source: 'Standard 90/10 split',
                                lastVerified: null,
                                confidence: 'UNVERIFIED',
                              }
                            }
                          })}
                          className="px-1.5 py-0.5 bg-stone-950 text-stone-400 hover:text-teal-400 rounded text-micro font-mono"
                        >
                          90%
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch({
                            type: 'SET_COSTS',
                            costs: {
                              producerPricing: {
                                mode: 'INDEX_LINKED',
                                fixedPriceEurPerMwh: state.costs.producerPricing?.fixedPriceEurPerMwh ?? null,
                                indexLinkedShare: 0.95,
                                source: 'Competitive 95/5 split',
                                lastVerified: null,
                                confidence: 'UNVERIFIED',
                              }
                            }
                          })}
                          className="px-1.5 py-0.5 bg-stone-950 text-stone-400 hover:text-teal-400 rounded text-micro font-mono"
                        >
                          95%
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={state.costs.producerPricing?.indexLinkedShare ?? ''}
                      onChange={e => dispatch({
                        type: 'SET_COSTS',
                        costs: {
                          producerPricing: {
                            mode: 'INDEX_LINKED',
                            fixedPriceEurPerMwh: state.costs.producerPricing?.fixedPriceEurPerMwh ?? null,
                            // Clamped to the 0–1 contract. `max="1"` only fails HTML
                            // validation, it does not stop a typed "90" — which stored
                            // 90 and cascaded into "9000.0% Index Share" and a
                            // -8900% margin on the bottom line.
                            indexLinkedShare: e.target.value === ''
                              ? null
                              : Math.min(1, Math.max(0, Number(e.target.value))),
                            source: 'User entered',
                            lastVerified: new Date().toISOString(),
                            confidence: 'UNVERIFIED',
                          }
                        }
                      })}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1 font-mono text-stone-100 text-xs focus:border-teal-400 outline-none"
                      placeholder="e.g. 0.90"
                    />
                    {/* Echo the percentage so a fraction field cannot be misread */}
                    <div className="text-micro text-stone-400 font-num tabular-nums">
                      {state.costs.producerPricing?.indexLinkedShare != null
                        ? `= ${(state.costs.producerPricing.indexLinkedShare * 100).toFixed(1)}% to producer, ${((1 - state.costs.producerPricing.indexLinkedShare) * 100).toFixed(1)}% desk share`
                        : 'Enter a fraction between 0.00 and 1.00'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-micro">
                      <label className="text-stone-400">All-in Fixed Price (€/MWh):</label>
                      <div className="flex gap-1 items-center">
                        <button
                          type="button"
                          onClick={() => dispatch({
                            type: 'SET_COSTS',
                            costs: {
                              deliveredCost: 58.00,
                              producerPricing: {
                                mode: 'FIXED_PRICE',
                                fixedPriceEurPerMwh: 58.00,
                                indexLinkedShare: state.costs.producerPricing?.indexLinkedShare ?? null,
                                source: 'Agri benchmark',
                                lastVerified: null,
                                confidence: 'UNVERIFIED',
                              }
                            }
                          })}
                          className="px-1.5 py-0.5 bg-stone-950 text-stone-400 hover:text-amber-500 rounded text-micro font-mono"
                        >
                          €58
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch({
                            type: 'SET_COSTS',
                            costs: {
                              deliveredCost: 65.00,
                              producerPricing: {
                                mode: 'FIXED_PRICE',
                                fixedPriceEurPerMwh: 65.00,
                                indexLinkedShare: state.costs.producerPricing?.indexLinkedShare ?? null,
                                source: 'Manure benchmark',
                                lastVerified: null,
                                confidence: 'UNVERIFIED',
                              }
                            }
                          })}
                          className="px-1.5 py-0.5 bg-stone-950 text-stone-400 hover:text-amber-500 rounded text-micro font-mono"
                        >
                          €65
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      value={state.costs.producerPricing?.fixedPriceEurPerMwh ?? state.costs.deliveredCost ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        dispatch({
                          type: 'SET_COSTS',
                          costs: {
                            deliveredCost: val,
                            producerPricing: {
                              mode: 'FIXED_PRICE',
                              fixedPriceEurPerMwh: val,
                              indexLinkedShare: state.costs.producerPricing?.indexLinkedShare ?? null,
                              source: 'User entered',
                              lastVerified: new Date().toISOString(),
                              confidence: 'UNVERIFIED',
                            }
                          }
                        });
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1 font-mono font-semibold text-amber-500 text-xs focus:border-amber-500 outline-none"
                      placeholder="e.g. 65.00"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: DEAL VALUATION (Hero + Waterfall) */}
        <div className="lg:col-span-7 2xl:flex-1 2xl:min-w-[480px] space-y-2 2xl:sticky 2xl:top-16 2xl:max-h-[calc(100vh-5.5rem)] 2xl:overflow-y-auto 2xl:pr-1">
          
          {/* Main Deal Ticket Panel */}
          <div className="bg-stone-900 rounded p-3.5 space-y-3">
            
            {/* Ticket Header */}
            <div className="border-b border-stone-800 pb-3 space-y-2">
              {/* Top Row: Context & Action Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 text-micro font-mono uppercase tracking-wider text-stone-400">
                  <span>Deal Valuation & Clearance</span>
                  <span>•</span>
                  <span className="text-stone-100 font-medium">{consignment.originCountryName} → {selectedMarket.countryName || 'EU Grid'}</span>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => setIsLogisticsOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-meta font-medium rounded bg-stone-900 text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
                  >
                    <Truck className="w-3 h-3 text-teal-400" />
                    Corridor
                  </button>
                  <CopyButton text={summaryText} label="Copy Deal Sheet" praWarning={praCheck.hasPra} praSources={praCheck.sources} />
                  <button
                    onClick={handleSaveToLibrary}
                    aria-label="Save assessment to dossier library"
                    className={`inline-flex items-center gap-1 px-2 py-1 text-meta font-medium rounded transition-colors ${
                      saveSuccess
                        ? 'bg-teal-400 text-stone-950'
                        : 'bg-stone-900 text-stone-400 hover:text-stone-100 hover:bg-stone-800'
                    }`}
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    {saveSuccess ? 'Saved' : 'Save Dossier'}
                  </button>
                </div>
              </div>

              {/* Middle Row: Market Title + Tenor Badge + Runner-up */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-stone-100 tracking-tight">
                  {selectedMarket.name}
                </h2>
                <span className="text-teal-400 text-micro font-mono font-medium px-2 py-0.5 bg-stone-950 rounded border border-stone-800">
                  {deliveryPeriodLabel}
                </span>

                {/* 4.2 Runner-up Best Alternative */}
                {runnerUp && (
                  <button
                    onClick={() => {
                      setSelectedMarketId(runnerUp.market.id);
                      setSearchParams({ marketId: runnerUp.market.id, originCountry: consignment.originCountry });
                    }}
                    className="inline-flex items-center gap-1.5 text-micro text-stone-400 hover:text-teal-400 px-2 py-0.5 bg-stone-950 rounded border border-stone-800 hover:border-teal-400/50 transition-colors cursor-pointer"
                    title="Click to switch target market to best alternative"
                  >
                    <span>Runner-up:</span>
                    <span className="text-stone-100 font-medium">{runnerUp.market.shortName || runnerUp.market.name}</span>
                    <span className="text-teal-400 font-num">€{runnerUp.netback.toFixed(2)}</span>
                    <span className={`font-num ${runnerUp.spread >= 0 ? 'text-teal-400' : 'text-stone-400'}`}>
                      ({runnerUp.spread >= 0 ? '+' : ''}€{runnerUp.spread.toFixed(2)})
                    </span>
                  </button>
                )}
              </div>

              {/* Bottom Row: Metadata info */}
              <div className="text-micro text-stone-400 flex items-center gap-2 flex-wrap pt-0.5">
                <span>Registry: <strong className="text-stone-100 font-normal font-mono">{selectedMarket.registry || selectedMarket.countryName}</strong></span>
                <span>•</span>
                <span>Basis: <strong className="text-stone-100 font-normal font-mono">{selectedMarket.legalBasis}</strong></span>
                <span>•</span>
                <span>Counterparty: <strong className="text-stone-100 font-normal font-mono">{consignment.counterparty || 'Open Desk / Unassigned'}</strong></span>
              </div>
            </div>

            {/* Verdict Highlight Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <StatusChip variant={eligibility.overallVerdict} size="xs" />
                <span className="text-stone-400 text-xs leading-relaxed">{eligibility.summary}</span>
              </div>
              <StaleIndicator target={markEntry} />
            </div>

            {/* UNIFIED TRADITIONAL FINANCIAL DEAL TICKET & P&L STATEMENT */}
            <div className="bg-stone-950 rounded border border-stone-800 p-2 space-y-2 text-xs">
              
              {/* Table Column Headers */}
              <div className="flex justify-between items-center text-micro text-stone-400 uppercase tracking-wider pb-2 border-b border-stone-800">
                <span>Commercial Deal Flow &amp; P&amp;L Breakdown</span>
                <div className="flex items-center gap-3">
                  {/* Global Side Quick-Set */}
                  <div className="flex items-center gap-1.5 text-micro lowercase">
                    <span className="text-stone-400 uppercase text-micro">Pricing:</span>
                    <div className="inline-flex bg-stone-900 p-0.5 rounded border border-stone-800">
                      {(['bid', 'mid', 'offer'] as PriceSide[]).map(s => {
                        const isGlobalMatch = (state.marks.pricingSides?.certificateSide ?? state.marks.pricingSide ?? 'bid') === s &&
                                              (state.marks.pricingSides?.moleculeSide ?? state.marks.pricingSide ?? 'bid') === s;
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              dispatch({ type: 'SET_PRICING_SIDE', side: s });
                              dispatch({ type: 'SET_PRICING_SIDES', sides: { certificateSide: s, moleculeSide: s } });
                            }}
                            className={`px-1.5 py-0.5 uppercase rounded transition-colors ${
                              isGlobalMatch ? 'bg-teal-400 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-100'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-semibold text-stone-400">
                    <span className="w-28 shrink-0 text-right whitespace-nowrap">Per MWh</span>
                    <span className="w-40 shrink-0 text-right whitespace-nowrap">Contract Total</span>
                  </div>
                </div>
              </div>

              {/* 1. PROCUREMENT (BUY PRODUCER LEG) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-meta font-semibold text-amber-500 uppercase tracking-wider">
                  <span>1. Procurement (Buy Leg)</span>
                  <span className="text-micro text-stone-400 font-normal">Origin: {consignment.originCountryName}</span>
                </div>

                <div className="h-6 flex justify-between items-center text-stone-400 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-stone-100">
                      {state.costs.producerPricing?.mode === 'INDEX_LINKED'
                        ? `Producer Purchase (${((state.costs.producerPricing.indexLinkedShare ?? 0) * 100).toFixed(1)}% Index Share)`
                        : state.costs.producerPricing?.mode === 'FIXED_PRICE'
                        ? 'Producer Purchase (Fixed Price)'
                        : 'Producer Purchase (Terms Unset)'}
                    </span>
                    {netback.producerPayable === null && (
                      <button
                        onClick={() => {
                          const el = document.getElementById('cost-procurement-section');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-micro text-amber-500 hover:underline cursor-pointer ml-1"
                      >
                        (Set in Step 1 →)
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 font-num tabular-nums">
                    <span className="w-28 shrink-0 text-right whitespace-nowrap font-medium text-amber-500">
                      {netback.producerPayable !== null ? signedEur(netback.producerPayable, 'outflow') : 'Not set'}
                    </span>
                    <span className="w-40 shrink-0 text-right whitespace-nowrap text-amber-500">
                      {consignment.volumeMWh !== null && netback.producerPayable !== null
                        ? signedEur(netback.producerPayable * consignment.volumeMWh, 'outflow')
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. REVENUE (SELL OFFTAKE LEG) */}
              <div className="space-y-1.5 pt-2 border-t border-stone-800">
                <div className="flex justify-between items-center text-meta font-semibold text-teal-400 uppercase tracking-wider">
                  <span>2. Revenue / Offtake (Sell Leg)</span>
                  <span className="text-micro text-stone-400 font-normal">Offtake: {selectedMarket.name}</span>
                </div>

                {/* Certificate Premium */}
                <div className="h-6 flex justify-between items-center text-stone-400 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span className="text-stone-100">{selectedMarket.shortName || selectedMarket.id} Certificate</span>
                    <div className="inline-flex bg-stone-900 p-0.5 rounded text-micro ml-1">
                      {(['bid', 'mid', 'offer'] as PriceSide[]).map(s => {
                        const currentCertSide = state.marks.pricingSides?.certificateSide ?? state.marks.pricingSide ?? 'bid';
                        return (
                          <button
                            key={s}
                            onClick={() => dispatch({ type: 'SET_PRICING_SIDES', sides: { certificateSide: s } })}
                            className={`px-1 py-0.5 uppercase rounded transition-colors ${
                              currentCertSide === s ? 'bg-stone-800 text-teal-400 font-bold' : 'text-stone-400 hover:text-stone-100'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-num tabular-nums">
                    <span className="w-28 shrink-0 text-right whitespace-nowrap font-medium text-teal-400">
                      {netback.certificateValue?.valueEurPerMWh != null ? signedEur(netback.certificateValue.valueEurPerMWh) : 'Not set'}
                    </span>
                    <span className="w-40 shrink-0 text-right whitespace-nowrap text-stone-100">
                      {consignment.volumeMWh !== null && netback.certificateValue?.valueEurPerMWh != null
                        ? signedEur(netback.certificateValue.valueEurPerMWh * consignment.volumeMWh)
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Molecule Value */}
                <div className="h-6 flex justify-between items-center text-stone-400 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                    <span>TTF Gas Molecule Index</span>
                    <div className="inline-flex bg-stone-900 p-0.5 rounded text-micro ml-1">
                      {(['bid', 'mid', 'offer'] as PriceSide[]).map(s => {
                        const currentMolSide = state.marks.pricingSides?.moleculeSide ?? state.marks.pricingSide ?? 'bid';
                        return (
                          <button
                            key={s}
                            onClick={() => dispatch({ type: 'SET_PRICING_SIDES', sides: { moleculeSide: s } })}
                            className={`px-1 py-0.5 uppercase rounded transition-colors ${
                              currentMolSide === s ? 'bg-stone-800 text-teal-400 font-bold' : 'text-stone-400 hover:text-stone-100'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-num tabular-nums">
                    <span className="w-28 shrink-0 text-right whitespace-nowrap font-medium text-stone-100">
                      {netback.moleculeValue !== null ? signedEur(netback.moleculeValue) : 'Not set'}
                    </span>
                    <span className="w-40 shrink-0 text-right whitespace-nowrap text-stone-100">
                      {consignment.volumeMWh !== null && netback.moleculeValue !== null
                        ? signedEur(netback.moleculeValue * consignment.volumeMWh)
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Transfer & Tariff Costs */}
                <div className="h-6 flex justify-between items-center text-stone-400 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>Logistics, Tariffs &amp; Certification</span>
                  </div>
                  <div className="flex items-center gap-3 font-num tabular-nums">
                    <span className="w-28 shrink-0 text-right whitespace-nowrap text-stone-100">
                      {netback.totalCosts !== null ? signedEur(netback.totalCosts, 'outflow') : 'Not set'}
                    </span>
                    <span className="w-40 shrink-0 text-right whitespace-nowrap text-stone-100">
                      {consignment.volumeMWh !== null && netback.totalCosts !== null
                        ? signedEur(netback.totalCosts * consignment.volumeMWh, 'outflow')
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Delivered Netback Subtotal */}
                <div className="pt-1.5 pb-1 border-t border-stone-800 flex justify-between items-center font-semibold text-stone-100">
                  <div>
                    <span className="text-teal-400">Delivered Netback Realization</span>
                    {netback.sides?.atMid != null && (
                      <span className="text-micro font-normal text-stone-400 ml-2">
                        (at mid: €{netback.sides.atMid.toFixed(2)}/MWh
                        {netback.sides.crossingCost !== null && netback.sides.crossingCost > 0
                          ? ` · crossing cost €${netback.sides.crossingCost.toFixed(2)}`
                          : netback.sides.crossingCost !== null && netback.sides.crossingCost < 0
                          ? ` · spread benefit €${Math.abs(netback.sides.crossingCost).toFixed(2)}`
                          : ''})
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-3 font-num tabular-nums ${netback.netNetback !== null && netback.netNetback < 0 ? 'text-red-500' : 'text-teal-400'}`}>
                    <span className="w-28 shrink-0 text-right whitespace-nowrap font-semibold">
                      {netback.netNetback !== null ? signedEur(netback.netNetback) : 'N/A'}
                    </span>
                    <span className="w-40 shrink-0 text-right whitespace-nowrap font-semibold">
                      {consignment.volumeMWh !== null && netback.netNetback !== null
                        ? signedEur(netback.netNetback * consignment.volumeMWh)
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. BOTTOM-LINE DESK P&L (loss flips to the red treatment) */}
              <div className={`p-3 rounded border flex justify-between items-center font-semibold ${
                isDeskLoss
                  ? 'bg-red-950 border-red-500/40 text-red-500'
                  : 'bg-stone-800 border-teal-400/40 text-teal-400'
              }`}>
                <div>
                  <div className="uppercase tracking-wider text-xs flex items-center gap-2">
                    <span>= NET DESK {isDeskLoss ? 'LOSS' : 'PROFIT'} (BOTTOM LINE)</span>
                    {netback.marginPercent !== null && (
                      <span className={`text-micro px-1.5 py-0.5 rounded ${
                        isDeskLoss ? 'bg-red-500/15 text-red-500' : 'bg-teal-400/15 text-teal-400'
                      }`}>
                        {Math.abs(netback.marginPercent).toFixed(1)}% margin {isDeskLoss ? 'erosion' : 'capture'}
                      </span>
                    )}
                  </div>
                  <div className="text-micro text-stone-400 font-normal mt-0.5">
                    {consignment.volumeMWh !== null && netback.deskMargin !== null
                      ? `${signedEur(netback.deskMargin)}/MWh spread × ${consignment.volumeMWh.toLocaleString()} MWh volume`
                      : 'Awaiting producer terms to finalize desk profit'}
                  </div>
                </div>
                <div className="flex items-center gap-3 font-num tabular-nums">
                  <span className="w-28 shrink-0 text-right whitespace-nowrap text-base font-bold">
                    {netback.deskMargin !== null ? signedEur(netback.deskMargin) : '—'}
                  </span>
                  <span className="w-40 shrink-0 text-right whitespace-nowrap text-base font-bold">
                    {consignment.volumeMWh !== null && netback.deskPnL !== null
                      ? signedEur(netback.deskPnL)
                      : '—'}
                  </span>
                </div>
              </div>

              {/* 4. REGULATORY SPREAD SENSITIVITY (Scenario Analysis) */}
              {netback.valuationRange && netback.uncertaintyBranches && netback.uncertaintyBranches.length >= 2 && (
                <div className="bg-amber-950 border border-amber-500/35 rounded p-2.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-micro font-semibold uppercase tracking-wider text-amber-500">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Regulatory Risk Spread (§37a BImSchG Double Counting Scenarios)
                    </span>
                    <span>Δ €{netback.valuationRange.deltaPerMwh.toFixed(2)}/MWh at risk</span>
                  </div>

                  {/* Both branches render from one definition so their label and
                      value columns line up across the pair. Values go through
                      signedEur like the ledger above, so the sign always precedes
                      the currency symbol rather than printing "€-1,869,000.00". */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { branch: netback.uncertaintyBranches[0], title: '1× Single Counting (Conservative)', accent: false },
                      { branch: netback.uncertaintyBranches[1], title: '2× Double Counting (Upside)', accent: true },
                    ].map(({ branch, title, accent }) => {
                      const pnl = branch.deskPnL ?? null;
                      const isLoss = pnl !== null && pnl < 0;
                      return (
                        <div
                          key={title}
                          className={`p-2 bg-stone-950 rounded border space-y-1 ${accent ? 'border-teal-400/40' : 'border-stone-800'}`}
                        >
                          <div className={`text-micro uppercase font-semibold ${accent ? 'text-teal-400' : 'text-stone-400'}`}>
                            {title}
                          </div>
                          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-num tabular-nums">
                            <dt className="text-stone-400">Netback</dt>
                            <dd className="m-0 text-right text-stone-100 whitespace-nowrap">
                              {branch.netNetback != null ? `${signedEur(branch.netNetback)}/MWh` : '—'}
                            </dd>
                            {/* Labelled by sign: a negative figure is not a profit */}
                            <dt className="text-stone-400">{isLoss ? 'Loss' : 'Profit'}</dt>
                            <dd className={`m-0 text-right font-bold whitespace-nowrap ${isLoss ? 'text-red-500' : 'text-teal-400'}`}>
                              {pnl !== null ? signedEur(pnl) : '—'}
                            </dd>
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. LOGISTICS ROUTE & EXECUTION SUMMARY */}
              <div className="flex items-center justify-between p-2 bg-stone-900 rounded border border-stone-800 text-xs">
                <div className="flex items-center gap-1.5 text-meta text-stone-400 flex-wrap">
                  <Truck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="text-stone-100 font-semibold">{consignment.originCountry} → {selectedMarket.country || 'EU'}</span>
                  <span>via <strong className="text-stone-100 font-normal">{logisticsSummary.physicalRoute.transitingCountries.join(' → ') || `${consignment.originCountry}_GRID`}</strong></span>
                  <span>•</span>
                  <span>{logisticsSummary.physicalRoute.transitingCountries.length > 1 ? `${logisticsSummary.physicalRoute.transitingCountries.length - 1} border${logisticsSummary.physicalRoute.transitingCountries.length > 2 ? 's' : ''}` : 'Domestic'}</span>
                  <span>•</span>
                  <span>~€{(logisticsSummary.modes.physicalPipeline.totalCostEurMwh ?? 1.50).toFixed(2)}/MWh tariff</span>
                </div>
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="text-micro text-teal-400 hover:underline font-semibold shrink-0 ml-2 cursor-pointer"
                >
                  Corridor Details →
                </button>
              </div>

            </div>

          </div>

          {/* Under 1600px breakpoint: render compliance gates here */}
          <div className="2xl:hidden">
            {renderComplianceChecklist()}
          </div>
        </div>

        {/* COLUMN 3: COMPLIANCE GATES (Visible on >= 1600px / 2xl screen - Hugs content cleanly) */}
        <div className="hidden 2xl:block 2xl:w-[380px] 2xl:shrink-0 self-start sticky top-16">
          {renderComplianceChecklist()}
        </div>

      </div>

      {/* Logistics & Corridor Modal */}
      <LogisticsModal
        originCountry={consignment.originCountry}
        targetCountry={selectedMarket.country || 'ES'}
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
      />
    </div>
  );
}
