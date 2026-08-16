import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';

const COUNTRY_FLAGS: Record<string, string> = {
  DE: '🇩🇪',
  NL: '🇳🇱',
  FR: '🇫🇷',
  DK: '🇩🇰',
  UK: '🇬🇧',
  GB: '🇬🇧',
  IT: '🇮🇹',
  ES: '🇪🇸',
  SE: '🇸🇪',
  FI: '🇫🇮',
  AT: '🇦🇹',
  BE: '🇧🇪',
  PL: '🇵🇱',
  EU: '🇪🇺',
};

const EU_COUNTRY_CODES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

export function TradeBuilderScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
      state.marks.pricingSide
    );
  }, [selectedMarket, consignment, state.marks, state.costs]);

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
      <div className="bg-[#12171C] rounded p-3 space-y-2.5 font-mono text-xs">
        
        {/* Header & Global Toggle */}
        <div className="flex items-center justify-between border-b border-[#1E262F] pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8B98A5] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8B98A5]" />
            Regulatory Checklist ({totalGatesCount})
          </span>
          <button
            onClick={toggleExpandAll}
            className="text-[10px] text-[#2DD4BF] hover:underline font-medium flex items-center gap-1"
          >
            {allExpanded === true ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Header Summary Line */}
        <div className="flex items-center justify-between text-xs px-1 py-0.5 bg-[#0B0E11] rounded">
          <div className="text-[11px]">
            {areAllClear ? (
              <span className="text-[#2DD4BF] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All {totalGatesCount} gates clear
              </span>
            ) : (
              <span className="text-[#E8EDF2]">
                <strong className="text-[#2DD4BF]">{passGatesCount}</strong> / {totalGatesCount} gates clear
                {blockedGatesCount > 0 && <span className="text-[#D64545] ml-1">· {blockedGatesCount} blocked</span>}
                {unresolvedGatesCount > 0 && <span className="text-sky-400 ml-1">· {unresolvedGatesCount} unresolved</span>}
                {conditionalGatesCount > 0 && <span className="text-[#D99A2B] ml-1">· {conditionalGatesCount} conditional</span>}
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
                className={`rounded transition-all ${
                  gate.verdict === 'PASS' 
                    ? 'bg-[#0B0E11]' 
                    : gate.verdict === 'CONDITIONAL' || gate.verdict === 'UNRESOLVED'
                    ? 'bg-[#1C160C] border border-[#D99A2B]/40'
                    : 'bg-[#1C0E10] border border-[#D64545]/40'
                }`}
              >
                {/* Single dense line header per gate */}
                <div 
                  onClick={() => toggleGate(gate, idx)}
                  className="h-8 px-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#182026]/40 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {gate.verdict === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" />}
                    {gate.verdict === 'CONDITIONAL' && <AlertTriangle className="w-3.5 h-3.5 text-[#D99A2B] shrink-0" />}
                    {gate.verdict === 'UNRESOLVED' && <AlertCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    {gate.verdict === 'HARD_BLOCK' && <XCircle className="w-3.5 h-3.5 text-[#D64545] shrink-0" />}
                    
                    <span className="font-semibold text-[#E8EDF2] text-[11px] truncate">
                      {gate.gateLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusChip variant={gate.verdict} size="xs" />
                    {expanded ? (
                      <ChevronUp className="w-3 h-3 text-[#8B98A5]" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-[#8B98A5]" />
                    )}
                  </div>
                </div>

                {/* Expanded Details (Auto-expanded for non-PASS or user click) */}
                {expanded && (
                  <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-[#1E262F]/40">
                    <p className="text-[#8B98A5] text-[11px] leading-relaxed pl-5 font-sans">
                      {gate.reason}
                    </p>

                    {gate.remedy && (
                      <div className="ml-5 p-1.5 bg-[#0B0E11] border border-[#D99A2B]/30 rounded text-[10px] text-[#D99A2B]">
                        <strong className="text-[#E8EDF2]">Action:</strong> {gate.remedy}
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
    <div className="w-full space-y-4 font-sans text-[#E8EDF2] pb-16">
      
      {/* Top Header Strip */}
      <div className="bg-[#12171C] rounded p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#182026] flex items-center justify-center text-[#2DD4BF]">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-semibold text-[#E8EDF2] tracking-tight font-mono uppercase">
                Trade Builder & Deal Ticket
              </h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-[#182026] text-[#8B98A5]">
                {consignment.originCountryName} ➔ {selectedMarket.countryName || 'Pan-EU'}
              </span>
            </div>
            <p className="text-[#8B98A5] text-[11px] mt-0.5 font-mono">
              RED III regulatory clearance & commercial netback economics
            </p>
          </div>
        </div>

        {/* Quick Scenarios Segmented Bar */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[#8B98A5] text-[10px] uppercase tracking-wider font-mono">Presets:</span>
          <div className="inline-flex bg-[#0B0E11] p-0.5 rounded gap-1 font-mono text-[11px]">
            <button
              onClick={() => handlePreset('DANISH_MANURE', 'DE_THG')}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-[#8B98A5] hover:text-[#E8EDF2] hover:bg-[#182026] transition-colors"
            >
              🇩🇰 DK Manure (THG)
            </button>
            <button
              onClick={() => handlePreset('UK_FOOD_WASTE', 'DE_THG')}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-[#D64545] hover:bg-[#1C0E10] transition-colors"
            >
              🇬🇧 UK Grid (Blocked)
            </button>
            <button
              onClick={() => handlePreset('ISCC_PLUS_VOLUNTARY', 'VOL_SCOPE1')}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-[#8B98A5] hover:text-[#E8EDF2] hover:bg-[#182026] transition-colors"
            >
              🌱 ISCC PLUS (Voluntary)
            </button>
            <button
              onClick={() => handlePreset('FUELEU_MARITIME_LNG', 'FUELEU')}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-sky-400 hover:bg-sky-950/40 transition-colors"
            >
              ⚓ FuelEU Maritime
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Institutional Trading Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 2xl:flex 2xl:flex-row gap-6 items-start w-full">
        
        {/* COLUMN 1: CONSIGNMENT & INPUTS (~340px fixed on 2xl) */}
        <div className="lg:col-span-5 2xl:w-[340px] 2xl:shrink-0 space-y-6 2xl:sticky 2xl:top-16 2xl:max-h-[calc(100vh-5.5rem)] 2xl:overflow-y-auto 2xl:pr-1">
          
          {/* GROUP 1: Consignment Specification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[10px] font-semibold text-[#8B98A5] uppercase tracking-wider">
                1. Consignment Inputs
              </span>
              <span className="text-[10px] text-[#8B98A5] font-mono">
                {consignment.originCountry} • {consignment.feedstockName}
              </span>
            </div>

            <div className="bg-[#12171C] rounded p-3 space-y-3 font-mono text-xs">
              
              {/* Consignment Name */}
              <div>
                <label className="block text-[10px] text-[#8B98A5] uppercase mb-1">Reference Label</label>
                <input
                  type="text"
                  value={consignment.name}
                  onChange={e => setConsignment({ ...consignment, name: e.target.value })}
                  className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2.5 py-1.5 text-xs text-[#E8EDF2] focus:border-[#2DD4BF] outline-none"
                  placeholder="e.g., Baltic Manure Cargo"
                />
              </div>

              {/* Origin Country & Feedstock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#8B98A5] uppercase mb-1">Origin Country</label>
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
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1.5 text-xs text-[#E8EDF2] focus:border-[#2DD4BF] outline-none"
                  >
                    {activeMarkets.map(m => (
                      <option key={m.id} value={m.country}>
                        {m.country} — {m.countryName || m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8B98A5] uppercase mb-1">Feedstock Type</label>
                  <select
                    value={consignment.feedstock}
                    onChange={e => handleFeedstockChange(e.target.value)}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1.5 text-xs text-[#E8EDF2] focus:border-[#2DD4BF] outline-none font-semibold"
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
              <div className="p-2.5 bg-[#0B0E11] rounded space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8B98A5] text-[10px] uppercase tracking-wide font-mono">Carbon Intensity</span>
                  <span className="font-semibold text-[#E8EDF2] font-mono text-xs">
                    {consignment.carbonIntensity} <span className="text-[10px] text-[#8B98A5]">gCO₂e/MJ</span>
                  </span>
                </div>

                <input
                  type="range"
                  min="-150"
                  max="60"
                  step="1"
                  value={consignment.carbonIntensity}
                  onChange={e => setConsignment({ ...consignment, carbonIntensity: Number(e.target.value) })}
                  className="w-full accent-[#2DD4BF] cursor-pointer h-1 bg-[#182026] rounded appearance-none"
                />

                <div className="flex justify-between text-[10px] text-[#8B98A5] pt-1 border-t border-[#1E262F]">
                  <span>GHG: <strong className="text-[#E8EDF2]">{ghgSavingPct}%</strong></span>
                  <span>Avoided: <strong className="text-[#E8EDF2]">{tco2eFactor} t/MWh</strong></span>
                </div>
              </div>

              {/* Commissioning Date & Scheme */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#8B98A5] uppercase mb-1">Commissioning</label>
                  <select
                    value={consignment.commissioningDateRange}
                    onChange={e => setConsignment({ ...consignment, commissioningDateRange: e.target.value as any })}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1.5 text-xs text-[#E8EDF2] focus:border-[#2DD4BF] outline-none"
                  >
                    <option value="PRE_OCT_2015">Pre-2015 (&gt;50%)</option>
                    <option value="OCT_2015_TO_2020">2015–2020 (&gt;60%)</option>
                    <option value="POST_2021_TO_2025">2021–2025 (&gt;65%)</option>
                    <option value="POST_2026">Post-2026 (&gt;70%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8B98A5] uppercase mb-1">Scheme</label>
                  <select
                    value={consignment.certificationScheme}
                    onChange={e => setConsignment({ ...consignment, certificationScheme: e.target.value as any })}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1.5 text-xs text-[#E8EDF2] focus:border-[#2DD4BF] outline-none"
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
                  <label className="block text-[10px] text-[#8B98A5] uppercase mb-1">Chain of Custody</label>
                  <select
                    value={consignment.chainOfCustody}
                    onChange={e => setConsignment({ ...consignment, chainOfCustody: e.target.value as any })}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1.5 text-xs text-[#E8EDF2] focus:border-[#2DD4BF] outline-none"
                  >
                    <option value="MASS_BALANCE">Mass Balance</option>
                    <option value="BOOK_AND_CLAIM">Book & Claim</option>
                    <option value="SEGREGATION">Segregation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8B98A5] uppercase mb-1">Grid Injection</label>
                  <select
                    value={consignment.injectionCountry}
                    onChange={e => handleInjectionCountryChange(e.target.value)}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1.5 text-xs text-[#E8EDF2] focus:border-[#2DD4BF] outline-none"
                  >
                    <option value="DK">🇩🇰 Denmark (EU)</option>
                    <option value="DE">🇩🇪 Germany (EU)</option>
                    <option value="FR">🇫🇷 France (EU)</option>
                    <option value="NL">🇳🇱 Netherlands (EU)</option>
                    <option value="UK">🇬🇧 UK (Third-Country)</option>
                    <option value="US">🇺🇸 USA (Virtual)</option>
                  </select>
                </div>
              </div>

              {/* UDB & PoS Status */}
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[9px] text-[#8B98A5] uppercase mb-1">UDB</label>
                  <select
                    value={consignment.udbStatus}
                    onChange={e => setConsignment({ ...consignment, udbStatus: e.target.value as any })}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-1.5 py-1 text-[11px] text-[#E8EDF2] focus:border-[#2DD4BF] outline-none"
                  >
                    <option value="RECORDED">RECORDED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="NOT_RECORDED">NOT RECORDED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-[#8B98A5] uppercase mb-1">PoS</label>
                  <select
                    value={consignment.posStatus}
                    onChange={e => setConsignment({ ...consignment, posStatus: e.target.value as any })}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-1.5 py-1 text-[11px] text-[#E8EDF2] focus:border-[#2DD4BF] outline-none"
                  >
                    <option value="ISSUED">ISSUED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="NOT_AVAILABLE">NOT AVAIL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-[#8B98A5] uppercase mb-1">MWh Vol</label>
                  <input
                    type="number"
                    value={consignment.volumeMWh ?? ''}
                    onChange={e => setConsignment({ ...consignment, volumeMWh: e.target.value ? Number(e.target.value) : null })}
                    placeholder="10000"
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-1.5 py-1 text-[11px] text-[#E8EDF2] focus:border-[#2DD4BF] outline-none font-semibold"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* GROUP 2: Target Offtake Market Dense Table (Phase 4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[10px] font-semibold text-[#8B98A5] uppercase tracking-wider">
                2. Target Offtake Market ({activeMarkets.length})
              </span>
              <span className="text-[10px] text-[#8B98A5]">
                {sortedMarkets.filter(r => !r.isBlocked && r.nb.netNetback !== null).length} priced • {sortedMarkets.filter(r => r.isBlocked).length} blocked
              </span>
            </div>

            <div className="bg-[#12171C] rounded p-1.5 font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] text-[#8B98A5] uppercase border-b border-[#1E262F] select-none">
                    <th 
                      onClick={() => {
                        if (marketSortField === 'market') setMarketSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setMarketSortField('market'); setMarketSortDir('asc'); }
                      }}
                      className="py-1 px-1.5 font-semibold cursor-pointer hover:text-[#E8EDF2]"
                    >
                      Market {marketSortField === 'market' && (marketSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th 
                      onClick={() => {
                        if (marketSortField === 'status') setMarketSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setMarketSortField('status'); setMarketSortDir('desc'); }
                      }}
                      className="py-1 px-1 font-semibold cursor-pointer hover:text-[#E8EDF2]"
                    >
                      Status {marketSortField === 'status' && (marketSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="py-1 px-1 font-semibold text-center">Side</th>
                    <th 
                      onClick={() => {
                        if (marketSortField === 'netback') setMarketSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setMarketSortField('netback'); setMarketSortDir('desc'); }
                      }}
                      className="py-1 pr-2 font-semibold text-right cursor-pointer hover:text-[#E8EDF2] whitespace-nowrap"
                    >
                      Netback (€) {marketSortField === 'netback' && (marketSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMarkets.map(({ m, elig, nb, isBlocked }) => {
                    const isSelected = m.id === selectedMarket.id;
                    const flag = COUNTRY_FLAGS[m.country || 'EU'] || '🇪🇺';
                    const code = m.country || 'EU';

                    return (
                      <tr
                        key={m.id}
                        onClick={() => {
                          setSelectedMarketId(m.id);
                          setSearchParams({ marketId: m.id, originCountry: consignment.originCountry });
                        }}
                        className={`h-7 cursor-pointer transition-colors border-b border-[#1E262F]/40 ${
                          isSelected
                            ? 'bg-[#182026] border-l-2 border-[#2DD4BF] text-[#E8EDF2]'
                            : 'hover:bg-[#182026]/70 text-[#8B98A5] hover:text-[#E8EDF2]'
                        } ${isBlocked ? 'opacity-50' : ''}`}
                      >
                        {/* 1. Market column (flag + code + name) */}
                        <td className="py-1 px-1.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{flag}</span>
                            <span className={`font-semibold text-[11px] ${isSelected ? 'text-[#E8EDF2]' : 'text-stone-300'} ${isBlocked ? 'line-through' : ''}`}>
                              {code}
                            </span>
                            <span className={`text-[10px] truncate max-w-[90px] ${isBlocked ? 'line-through text-[#8B98A5]' : isSelected ? 'text-[#E8EDF2]' : 'text-[#8B98A5]'}`}>
                              {m.shortName || m.name}
                            </span>
                          </div>
                        </td>

                        {/* 2. Status column (dot + text) */}
                        <td className="py-1 px-1 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[10px]">
                            {elig.overallVerdict === 'ELIGIBLE' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                                <span className="text-[#2DD4BF]">Clear</span>
                              </>
                            )}
                            {elig.overallVerdict === 'CONDITIONAL' && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D99A2B]" />
                                <span className="text-[#D99A2B]">Cond</span>
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
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D64545]" />
                                <span className="text-[#D64545]">Block</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 3. Mark Side */}
                        <td className="py-1 px-1 text-center text-[10px] text-[#8B98A5]">
                          Bid
                        </td>

                        {/* 4. Netback (€/MWh) - Decimal Aligned, no repetitive currency symbol */}
                        <td className="py-1 pr-2 text-right whitespace-nowrap">
                          {nb.netNetback !== null ? (
                            <span className={`font-semibold tabular-nums text-[11px] ${
                              isSelected ? 'text-[#2DD4BF]' : isBlocked ? 'text-[#8B98A5]' : 'text-[#E8EDF2]'
                            }`}>
                              {nb.netNetback.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#8B98A5] italic">
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
              <span className="text-[10px] font-semibold text-[#8B98A5] uppercase tracking-wider">
                3. Cost & Procurement Terms
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="px-2 py-0.5 rounded bg-[#182026] text-[#8B98A5] hover:text-[#E8EDF2] text-[10px] font-medium transition-colors flex items-center gap-1 font-mono"
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
                  className="px-2 py-0.5 rounded bg-[#182026] text-[#2DD4BF] hover:bg-[#1C2830] text-[10px] font-medium transition-colors font-mono"
                >
                  Auto-Fill
                </button>
              </div>
            </div>

            {/* Flattened single container without nested card borders */}
            <div className="bg-[#12171C] rounded p-3 space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#8B98A5] mb-1">Transfer (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.transferCosts ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { transferCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1 font-mono text-[#E8EDF2] text-xs focus:border-[#2DD4BF] outline-none"
                    placeholder="2.20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#8B98A5] mb-1">Certification (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.certificationCosts ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { certificationCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1 font-mono text-[#E8EDF2] text-xs focus:border-[#2DD4BF] outline-none"
                    placeholder="0.45"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] text-[#8B98A5] mb-1">Logistics / Conditioning (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.logistics ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { logistics: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2 py-1 font-mono text-[#E8EDF2] text-xs focus:border-[#2DD4BF] outline-none"
                    placeholder="1.35"
                  />
                </div>
              </div>

              {/* Producer Pricing Section (Flattened) */}
              <div className="pt-2 border-t border-[#1E262F] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#8B98A5] uppercase tracking-wide">Producer Pricing Mode</span>
                  <div className="inline-flex bg-[#0B0E11] p-0.5 rounded text-[10px]">
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
                          ? 'bg-[#182830] text-[#2DD4BF]'
                          : 'text-[#8B98A5] hover:text-[#E8EDF2]'
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
                          ? 'bg-[#2A1E14] text-[#D99A2B]'
                          : 'text-[#8B98A5] hover:text-[#E8EDF2]'
                      }`}
                    >
                      Fixed Price
                    </button>
                  </div>
                </div>

                {(state.costs.producerPricing?.mode ?? 'INDEX_LINKED') === 'INDEX_LINKED' ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <label className="text-[#8B98A5]">Producer Value Share (0.00 – 1.00):</label>
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
                          className="px-1.5 py-0.2 bg-[#0B0E11] text-[#8B98A5] hover:text-[#2DD4BF] rounded text-[10px] font-mono"
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
                          className="px-1.5 py-0.2 bg-[#0B0E11] text-[#8B98A5] hover:text-[#2DD4BF] rounded text-[10px] font-mono"
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
                            indexLinkedShare: e.target.value === '' ? null : Number(e.target.value),
                            source: 'User entered',
                            lastVerified: new Date().toISOString(),
                            confidence: 'UNVERIFIED',
                          }
                        }
                      })}
                      className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2.5 py-1 font-mono text-[#E8EDF2] text-xs focus:border-[#2DD4BF] outline-none"
                      placeholder="e.g. 0.90"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <label className="text-[#8B98A5]">All-in Fixed Price (€/MWh):</label>
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
                          className="px-1.5 py-0.2 bg-[#0B0E11] text-[#8B98A5] hover:text-[#D99A2B] rounded text-[10px] font-mono"
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
                          className="px-1.5 py-0.2 bg-[#0B0E11] text-[#8B98A5] hover:text-[#D99A2B] rounded text-[10px] font-mono"
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
                      className="w-full bg-[#0B0E11] border border-[#26313D] rounded px-2.5 py-1 font-mono font-semibold text-[#D99A2B] text-xs focus:border-[#D99A2B] outline-none"
                      placeholder="e.g. 65.00"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: DEAL VALUATION (Hero + Waterfall) */}
        <div className="lg:col-span-7 2xl:flex-1 2xl:min-w-[480px] space-y-4 2xl:sticky 2xl:top-16 2xl:max-h-[calc(100vh-5.5rem)] 2xl:overflow-y-auto 2xl:pr-1">
          
          {/* Main Deal Ticket Panel */}
          <div className="bg-[#12171C] rounded p-3.5 space-y-3">
            
            {/* Ticket Header */}
            <div className="border-b border-[#1E262F] pb-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wide text-[#8B98A5]">
                  <span>Deal Valuation & Clearance</span>
                  <span>•</span>
                  <span className="text-[#E8EDF2]">{consignment.originCountryName} ➔ {selectedMarket.countryName || 'EU'}</span>
                </div>
                <h2 className="text-[18px] font-semibold text-[#E8EDF2] tracking-tight mt-0.5 font-mono">
                  {selectedMarket.name}
                </h2>
                <div className="text-[10px] text-[#8B98A5] mt-0.5 font-mono">
                  Registry: <span className="text-[#E8EDF2]">{selectedMarket.registry || selectedMarket.countryName}</span> • Basis: <span className="text-[#E8EDF2]">{selectedMarket.legalBasis}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-[#182026] text-[#8B98A5] hover:text-[#E8EDF2] transition-colors font-mono"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Corridor
                </button>
                <CopyButton text={summaryText} label="Copy Deal Sheet" praWarning={praCheck.hasPra} praSources={praCheck.sources} />
                <button
                  onClick={handleSaveToLibrary}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-all font-mono ${
                    saveSuccess
                      ? 'bg-[#2DD4BF] text-[#0B0E11]'
                      : 'bg-[#182026] text-[#8B98A5] hover:text-[#E8EDF2]'
                  }`}
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  {saveSuccess ? 'Saved' : 'Save Dossier'}
                </button>
              </div>
            </div>

            {/* Verdict Highlight Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1 border-b border-[#1E262F]">
              <div className="flex items-center gap-2">
                <StatusChip variant={eligibility.overallVerdict} size="xs" />
                <span className="text-[#8B98A5] text-xs">{eligibility.summary}</span>
              </div>
              <StaleIndicator target={markEntry} />
            </div>

            {/* HERO VALUATION ROW (Phase 3 Polish: Single Merged Call To Action when unset) */}
            <div className={`p-3 rounded transition-colors ${
              netback.deskMargin !== null && netback.deskMargin < 0 
                ? 'bg-[#1C0E10] border border-[#D64545]/50' 
                : 'bg-[#0B0E11]'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                
                {/* 1. Hero Number: Delivered Netback (36px, 600 weight, monospace) */}
                <div className="sm:col-span-6 flex flex-col justify-between p-2">
                  <div className="text-[10px] font-normal text-[#8B98A5] uppercase tracking-wider font-mono">
                    Delivered Netback
                  </div>

                  {netback.netNetback !== null ? (
                    <div>
                      <div className={`text-[36px] font-semibold font-mono tabular-nums leading-none mt-1.5 ${
                        netback.netNetback < 0 ? 'text-[#D64545]' : 'text-[#2DD4BF]'
                      }`}>
                        €{netback.netNetback.toFixed(2)}
                        <span className="text-xs font-normal text-[#8B98A5] ml-1">/MWh</span>
                      </div>
                      <div className="text-[10px] text-[#8B98A5] mt-1.5 font-mono">
                        Molecule (€{(netback.moleculeValue ?? 0).toFixed(2)}) + Compliance (€{(netback.certificateValue?.valueEurPerMWh ?? 0).toFixed(2)})
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <button
                        onClick={() => navigate(`/marks?marketId=${selectedMarket.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs text-[#2DD4BF] hover:underline font-mono font-medium"
                      >
                        Enter mark in Marks screen <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-[10px] text-[#8B98A5] mt-1 font-mono">
                        Awaiting market certificate mark
                      </div>
                    </div>
                  )}
                </div>

                {/* 2 & 3: Single Merged Call To Action Card when Producer Cost is Unset */}
                {netback.producerPayable === null ? (
                  <div className="sm:col-span-6 flex flex-col justify-between p-2.5 border-t sm:border-t-0 sm:border-l border-[#1E262F]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-normal text-[#8B98A5] uppercase tracking-wider font-mono">
                        Producer Terms & Desk Margin
                      </span>
                      <span className="text-[9px] text-[#8B98A5] font-mono">Input Required</span>
                    </div>

                    <div className="my-1">
                      {netback.netNetback !== null ? (
                        <button
                          onClick={() => {
                            const el = document.getElementById('cost-procurement-section');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-[#2DD4BF] hover:underline font-mono font-medium text-left"
                        >
                          Set producer pricing to calculate desk margin <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="text-xs text-[#8B98A5] font-mono">
                          Awaiting certificate & market mark
                        </div>
                      )}
                      <div className="text-[10px] text-[#8B98A5] mt-1 font-mono">
                        Payable and realised capture margin will evaluate automatically
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Producer Payable (3 cols) */}
                    <div className="sm:col-span-3 flex flex-col justify-between p-2 border-t sm:border-t-0 sm:border-l border-[#1E262F]">
                      <div className="text-[10px] font-normal text-[#8B98A5] uppercase tracking-wider font-mono">
                        Producer Payable
                      </div>
                      <div>
                        <div className="text-[18px] font-semibold font-mono text-[#E8EDF2] tabular-nums mt-1">
                          €{netback.producerPayable.toFixed(2)}
                          <span className="text-[10px] font-normal text-[#8B98A5] ml-0.5">/MWh</span>
                        </div>
                        <div className="text-[10px] text-[#8B98A5] mt-1 font-mono truncate">
                          {state.costs.producerPricing?.mode === 'INDEX_LINKED' 
                            ? `${((state.costs.producerPricing.indexLinkedShare ?? 0) * 100).toFixed(0)}% Share` 
                            : state.costs.producerPricing?.mode === 'FIXED_PRICE' ? 'Fixed Price' : 'Unset'}
                        </div>
                      </div>
                    </div>

                    {/* Desk Margin (3 cols) */}
                    <div className="sm:col-span-3 flex flex-col justify-between p-2 border-t sm:border-t-0 sm:border-l border-[#1E262F]">
                      <div className="text-[10px] font-normal text-[#8B98A5] uppercase tracking-wider font-mono">
                        Desk Margin
                      </div>
                      {netback.deskMargin !== null ? (
                        <div>
                          <div className={`text-[18px] font-semibold font-mono tabular-nums mt-1 ${
                            netback.deskMargin < 0 ? 'text-[#D64545]' : 'text-[#2DD4BF]'
                          }`}>
                            €{netback.deskMargin.toFixed(2)}
                            <span className="text-[10px] font-normal opacity-70 ml-0.5">/MWh</span>
                          </div>
                          <div className={`text-[10px] mt-1 font-mono truncate ${
                            netback.deskMargin < 0 ? 'text-[#D64545] font-semibold' : 'text-[#8B98A5]'
                          }`}>
                            {netback.marginPercent !== null 
                              ? `${netback.marginPercent.toFixed(1)}% ${netback.deskMargin < 0 ? 'Loss' : 'Capture'}` 
                              : 'Calculated'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-[18px] font-semibold font-mono text-[#8B98A5] tabular-nums mt-1">—</div>
                          <div className="text-[10px] text-[#8B98A5] mt-1 font-mono">Awaiting netback</div>
                        </div>
                      )}
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* German THG Double Counting Sensitivity */}
            {netback.uncertaintyBranches && netback.uncertaintyBranches.length > 0 && (
              <div className="bg-[#0B0E11] p-2.5 rounded space-y-1.5 border border-[#1E262F]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#8B98A5] flex items-center gap-1.5 text-xs font-mono">
                    <AlertCircle className="w-3.5 h-3.5 text-[#D99A2B]" />
                    German THG Double Counting Sensitivity (§37a BImSchG)
                  </span>
                  <span className="text-[9px] text-[#D99A2B] bg-[#2A1E14] px-1.5 py-0.2 rounded font-mono">
                    Uncertainty
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-[#12171C] rounded">
                    <div className="text-[#8B98A5] text-[10px] uppercase">Branch 1: Single Counting (1×)</div>
                    <div className="text-xs font-semibold text-[#E8EDF2] mt-0.5 tabular-nums">
                      Netback: €{netback.uncertaintyBranches[0].netNetback?.toFixed(2)}/MWh
                    </div>
                    <div className="text-[#2DD4BF] text-[11px] mt-0.5 tabular-nums">
                      Margin: €{netback.uncertaintyBranches[0].deskMargin?.toFixed(2)}/MWh ({netback.uncertaintyBranches[0].marginPercent?.toFixed(1)}%)
                    </div>
                  </div>

                  <div className="p-2 bg-[#12171C] rounded border-l-2 border-[#2DD4BF]">
                    <div className="text-[#8B98A5] text-[10px] uppercase">Branch 2: Double Counting (2×)</div>
                    <div className="text-xs font-semibold text-[#E8EDF2] mt-0.5 tabular-nums">
                      Netback: €{netback.uncertaintyBranches[1].netNetback?.toFixed(2)}/MWh
                    </div>
                    <div className="text-[#2DD4BF] text-[11px] mt-0.5 tabular-nums">
                      Margin: €{netback.uncertaintyBranches[1].deskMargin?.toFixed(2)}/MWh ({netback.uncertaintyBranches[1].marginPercent?.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Accounting Netback Waterfall Table (Tightened ~28px Rows) */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-[#8B98A5] pb-1 border-b border-[#1E262F] font-mono">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#8B98A5]" />
                  Netback Accounting Waterfall
                </span>
                <span className="text-[10px] text-[#8B98A5] font-normal">Side: {netback.markSideUsed.toUpperCase()}</span>
              </div>

              <div className="bg-[#0B0E11] rounded divide-y divide-[#1E262F] text-xs font-mono">
                
                {/* TTF Molecule */}
                <div className="h-7 px-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B98A5]" />
                    Gas Molecule Benchmark (TTF Hub)
                  </span>
                  <span className="font-semibold text-[#E8EDF2] tabular-nums">
                    {netback.moleculeValue !== null ? `+€${netback.moleculeValue.toFixed(2)}/MWh` : 'Not set'}
                  </span>
                </div>

                {/* Certificate Premium */}
                <div className="py-1 px-2.5 flex justify-between items-center text-[#8B98A5]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[#E8EDF2]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                      Compliance Certificate Premium
                    </span>
                    {netback.certificateValue?.provenance?.sourceType && (
                      <span className="text-[9px] text-[#8B98A5] ml-1">
                        (<strong className="text-[#E8EDF2]">{netback.certificateValue.provenance.sourceName || netback.certificateValue.provenance.sourceType}</strong>)
                      </span>
                    )}
                    {netback.certificateValue && !netback.certificateValue.provenance?.sourceType && !netback.certificateValue.isModelled && (
                      <span className="text-[9px] text-[#D99A2B] ml-1">
                        ⚠ Unrecorded source
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-[#2DD4BF] tabular-nums whitespace-nowrap">
                    {netback.certificateValue?.valueEurPerMWh != null ? `+€${netback.certificateValue.valueEurPerMWh.toFixed(2)}/MWh` : 'Not set'}
                  </span>
                </div>

                {/* Transfer Tariffs */}
                <div className="h-7 px-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span>Transfer & Cross-Border Pipeline Tariffs</span>
                  <span className="text-[#E8EDF2] tabular-nums">
                    {state.costs.transferCosts !== null ? `−€${state.costs.transferCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                  </span>
                </div>

                {/* Certification */}
                <div className="h-7 px-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span>Certification, Audit & UDB Recording</span>
                  <span className="text-[#E8EDF2] tabular-nums">
                    {state.costs.certificationCosts !== null ? `−€${state.costs.certificationCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                  </span>
                </div>

                {/* Logistics */}
                <div className="h-7 px-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span>Logistics / Conditioning Fees</span>
                  <span className="text-[#E8EDF2] tabular-nums">
                    {state.costs.logistics !== null ? `−€${state.costs.logistics.toFixed(2)}/MWh` : '€0.00/MWh'}
                  </span>
                </div>

                {state.costs.otherCosts !== null && state.costs.otherCosts > 0 && (
                  <div className="h-7 px-2.5 flex justify-between items-center text-[#8B98A5]">
                    <span>Other Miscellaneous Fees</span>
                    <span className="text-[#E8EDF2] tabular-nums">
                      −€{state.costs.otherCosts.toFixed(2)}/MWh
                    </span>
                  </div>
                )}

                {/* Delivered Netback Subtotal */}
                <div className="h-8 px-2.5 bg-[#182026] flex justify-between items-center font-semibold text-[#E8EDF2]">
                  <span className="uppercase text-[10px] tracking-wide text-[#8B98A5]">Delivered Value Stack (Gross Netback)</span>
                  <span className="text-[18px] tabular-nums text-[#2DD4BF]">
                    {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : '—'}
                  </span>
                </div>

                {/* Producer Payable Line */}
                <div className="h-7 px-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span className="text-[#D99A2B]">
                    {state.costs.producerPricing?.mode === 'INDEX_LINKED'
                      ? `Producer Payable (${((state.costs.producerPricing.indexLinkedShare ?? 0) * 100).toFixed(0)}% Value Share)`
                      : 'Fixed Producer Procurement Cost'}
                  </span>
                  <span className="font-semibold text-[#D99A2B] tabular-nums">
                    {netback.producerPayable !== null ? `−€${netback.producerPayable.toFixed(2)}/MWh` : 'Not set'}
                  </span>
                </div>

                {/* Realised Desk Margin Bottom Line */}
                <div className="h-8 px-2.5 bg-[#18242A] border-t border-[#1E262F] flex justify-between items-center font-semibold text-[#2DD4BF]">
                  <span className="uppercase tracking-wider text-[10px]">
                    Realised Desk Capture Margin {netback.marginPercent !== null ? `(${netback.marginPercent.toFixed(1)}%)` : ''}
                  </span>
                  <span className="text-[18px] tabular-nums">
                    {netback.deskMargin !== null ? `€${netback.deskMargin.toFixed(2)}/MWh` : '—'}
                  </span>
                </div>
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
