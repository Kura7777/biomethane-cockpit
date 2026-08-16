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

export function TradeBuilderScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preSelectedMarketId = searchParams.get('marketId') || 'DE_THG';
  const { state, dispatch } = useAppState();
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [showFullAudit, setShowFullAudit] = useState(false);

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

  const renderComplianceChecklist = () => (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xs">
      <div className="px-4 py-3 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5 font-mono">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          Compliance Audit ({eligibility.gates.length} Gates)
        </span>
        <button
          onClick={() => setShowFullAudit(!showFullAudit)}
          className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 font-mono"
        >
          {showFullAudit ? 'Compact' : 'Legal Citations'}
          {showFullAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs px-1 pb-1 border-b border-stone-800/80 font-mono">
          <span className="text-stone-400">Verdict:</span>
          <StatusChip variant={eligibility.overallVerdict} size="xs" />
        </div>

        <div className="space-y-2">
          {eligibility.gates.map((gate, idx) => (
            <div 
              key={idx} 
              className={`p-2.5 rounded-lg border text-xs transition-all ${
                gate.verdict === 'PASS' 
                  ? 'bg-stone-950/80 border-stone-800/80' 
                  : gate.verdict === 'CONDITIONAL' || gate.verdict === 'UNRESOLVED'
                  ? 'bg-amber-950/20 border-amber-900/60'
                  : 'bg-red-950/20 border-red-900/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-mono">
                  {gate.verdict === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  {gate.verdict === 'CONDITIONAL' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  {gate.verdict === 'UNRESOLVED' && <AlertCircle className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
                  {gate.verdict === 'HARD_BLOCK' && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  <span className="font-bold text-stone-200 text-[11px]">{gate.gateLabel}</span>
                </div>
                <StatusChip variant={gate.verdict} size="xs" />
              </div>

              <p className="text-stone-400 text-[11px] mt-1 leading-relaxed pl-5">
                {gate.reason}
              </p>

              {gate.remedy && (
                <div className="mt-1.5 ml-5 p-1.5 bg-amber-950/40 border border-amber-800/80 rounded text-[10px] text-amber-300">
                  <strong>Action Required:</strong> {gate.remedy}
                </div>
              )}

              {showFullAudit && gate.citations.length > 0 && (
                <div className="mt-2 ml-5 pt-1.5 border-t border-stone-800 space-y-1">
                  {gate.citations.map((cit, cIdx) => (
                    <CitationBlock key={cIdx} citation={cit} compact={false} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-3 font-sans text-stone-200 pb-16">
      
      {/* Top Header Strip */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-950/80 border border-teal-800/80 flex items-center justify-center text-teal-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight font-mono uppercase">
                Trade Builder & Deal Ticket
              </h1>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono font-medium bg-stone-800 text-stone-300 border border-stone-700">
                {consignment.originCountryName} ➔ {selectedMarket.countryName || 'Pan-EU'}
              </span>
            </div>
            <p className="text-stone-400 text-[11px] mt-0.5">
              Live RED III regulatory clearance, logistics corridor tariffs, and commercial netback economics.
            </p>
          </div>
        </div>

        {/* Quick Scenarios Segmented Bar */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-stone-500 font-medium text-[11px] uppercase tracking-wider font-mono">Presets:</span>
          <div className="inline-flex bg-stone-950 p-0.5 rounded-lg border border-stone-800 gap-1 font-mono text-[11px]">
            <button
              onClick={() => handlePreset('DANISH_MANURE', 'DE_THG')}
              className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
            >
              🇩🇰 DK Manure (THG)
            </button>
            <button
              onClick={() => handlePreset('UK_FOOD_WASTE', 'DE_THG')}
              className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-red-950/50 text-red-300 transition-colors"
            >
              🇬🇧 UK Grid (Blocked)
            </button>
            <button
              onClick={() => handlePreset('ISCC_PLUS_VOLUNTARY', 'VOL_SCOPE1')}
              className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
            >
              🌱 ISCC PLUS (Voluntary)
            </button>
            <button
              onClick={() => handlePreset('FUELEU_MARITIME_LNG', 'FUELEU')}
              className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-sky-950/50 text-sky-300 transition-colors"
            >
              ⚓ FuelEU Maritime
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Institutional Trading Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 2xl:flex 2xl:flex-row gap-4 items-start w-full">
        
        {/* COLUMN 1: CONSIGNMENT & INPUTS (~340px fixed on 2xl, 5 cols on lg, full on mobile) */}
        <div className="lg:col-span-5 2xl:w-[350px] 2xl:shrink-0 space-y-3.5 2xl:sticky 2xl:top-16 2xl:max-h-[calc(100vh-5.5rem)] 2xl:overflow-y-auto 2xl:pr-1">
          
          {/* SECTION 1: Consignment Specification */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-3.5 py-2 bg-stone-950/70 border-b border-stone-800 flex items-center justify-between font-mono">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                1. Consignment
              </span>
              <span className="text-[10px] text-teal-400 bg-teal-950 border border-teal-800 px-1.5 py-0.2 rounded font-bold">
                {consignment.originCountry} • {consignment.feedstockName}
              </span>
            </div>

            <div className="p-3 space-y-2.5 font-mono text-xs">
              
              {/* Consignment Name */}
              <div>
                <label className="block text-[10px] text-stone-400 uppercase mb-0.5">Reference Label</label>
                <input
                  type="text"
                  value={consignment.name}
                  onChange={e => setConsignment({ ...consignment, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
                  placeholder="e.g., Baltic Manure Cargo"
                />
              </div>

              {/* Origin Country & Feedstock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-stone-400 uppercase mb-0.5">Origin Country</label>
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
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
                  >
                    {activeMarkets.map(m => (
                      <option key={m.id} value={m.country}>
                        {m.country} — {m.countryName || m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase mb-0.5">Feedstock Type</label>
                  <select
                    value={consignment.feedstock}
                    onChange={e => handleFeedstockChange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none font-bold text-teal-300"
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
              <div className="p-2.5 bg-stone-950 rounded border border-stone-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-300 font-bold text-[11px]">Carbon Intensity:</span>
                  <span className="font-bold text-teal-300 font-mono text-xs">
                    {consignment.carbonIntensity} <span className="text-[10px] text-stone-400">gCO₂e/MJ</span>
                  </span>
                </div>

                <input
                  type="range"
                  min="-150"
                  max="60"
                  step="1"
                  value={consignment.carbonIntensity}
                  onChange={e => setConsignment({ ...consignment, carbonIntensity: Number(e.target.value) })}
                  className="w-full accent-teal-500 cursor-pointer h-1 bg-stone-800 rounded appearance-none"
                />

                <div className="flex justify-between text-[10px] text-stone-400 pt-0.5 border-t border-stone-800/80">
                  <span>GHG: <strong className="text-teal-400">{ghgSavingPct}%</strong></span>
                  <span>Avoided: <strong className="text-stone-200">{tco2eFactor} t/MWh</strong></span>
                </div>
              </div>

              {/* Commissioning Date & Scheme */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-stone-400 uppercase mb-0.5">Commissioning</label>
                  <select
                    value={consignment.commissioningDateRange}
                    onChange={e => setConsignment({ ...consignment, commissioningDateRange: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
                  >
                    <option value="PRE_OCT_2015">Pre-2015 (&gt;50%)</option>
                    <option value="OCT_2015_TO_2020">2015–2020 (&gt;60%)</option>
                    <option value="POST_2021_TO_2025">2021–2025 (&gt;65%)</option>
                    <option value="POST_2026">Post-2026 (&gt;70%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase mb-0.5">Scheme</label>
                  <select
                    value={consignment.certificationScheme}
                    onChange={e => setConsignment({ ...consignment, certificationScheme: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
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
                  <label className="block text-[10px] text-stone-400 uppercase mb-0.5">Chain of Custody</label>
                  <select
                    value={consignment.chainOfCustody}
                    onChange={e => setConsignment({ ...consignment, chainOfCustody: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
                  >
                    <option value="MASS_BALANCE">Mass Balance</option>
                    <option value="BOOK_AND_CLAIM">Book & Claim</option>
                    <option value="SEGREGATION">Segregation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase mb-0.5">Grid Injection</label>
                  <select
                    value={consignment.injectionCountry}
                    onChange={e => handleInjectionCountryChange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
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
                  <label className="block text-[9px] text-stone-400 uppercase mb-0.5">UDB</label>
                  <select
                    value={consignment.udbStatus}
                    onChange={e => setConsignment({ ...consignment, udbStatus: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-1 py-1 text-[11px] text-stone-200 focus:border-teal-500 outline-none"
                  >
                    <option value="RECORDED">RECORDED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="NOT_RECORDED">NOT RECORDED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-stone-400 uppercase mb-0.5">PoS</label>
                  <select
                    value={consignment.posStatus}
                    onChange={e => setConsignment({ ...consignment, posStatus: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-1 py-1 text-[11px] text-stone-200 focus:border-teal-500 outline-none"
                  >
                    <option value="ISSUED">ISSUED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="NOT_AVAILABLE">NOT AVAIL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-stone-400 uppercase mb-0.5">MWh Vol</label>
                  <input
                    type="number"
                    value={consignment.volumeMWh ?? ''}
                    onChange={e => setConsignment({ ...consignment, volumeMWh: e.target.value ? Number(e.target.value) : null })}
                    placeholder="10000"
                    className="w-full bg-stone-950 border border-stone-800 rounded px-1 py-1 text-[11px] text-stone-200 focus:border-teal-500 outline-none font-bold"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: Target Offtake Market Selector */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-3.5 py-2 bg-stone-950/70 border-b border-stone-800 flex items-center justify-between font-mono">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-teal-950 text-teal-400 border border-teal-800 flex items-center justify-center text-[10px] font-bold">2</span>
                Target Offtake Market
              </span>
              <span className="text-[10px] text-stone-400">
                {activeMarkets.length} Compliance Markets
              </span>
            </div>

            <div className="p-2.5 grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {activeMarkets.map(m => {
                const isSelected = m.id === selectedMarket.id;
                const quickElig = evaluateEligibility(consignment, m);
                const quickNb = computeNetback(m, consignment, state.marks, state.costs, 'bid');

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMarketId(m.id);
                      setSearchParams({ marketId: m.id, originCountry: consignment.originCountry });
                    }}
                    className={`p-2 rounded border transition-all cursor-pointer font-mono ${
                      isSelected
                        ? 'border-teal-500 bg-teal-950/60 ring-1 ring-teal-500'
                        : 'border-stone-800/80 bg-stone-950 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-[11px] text-stone-200 leading-tight truncate">
                        {m.country ? `${m.country} ` : ''}{m.name}
                      </div>
                      <StatusChip variant={quickElig.overallVerdict} size="xs" />
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                      <span>{m.unitLabel}</span>
                      <span className="font-bold text-stone-200">
                        {quickNb.netNetback !== null ? `€${quickNb.netNetback.toFixed(1)}` : 'No mark'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Cost Structure & Producer Offtake */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-3.5 py-2 bg-stone-950/70 border-b border-stone-800 flex items-center justify-between font-mono">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                3. Cost & Procurement
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 hover:bg-sky-900 text-[10px] font-medium transition-colors flex items-center gap-1"
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
                  className="px-1.5 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300 hover:bg-teal-900 text-[10px] font-medium transition-colors"
                >
                  Auto-Fill
                </button>
              </div>
            </div>

            <div className="p-3 space-y-2.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-stone-400 mb-0.5">Transfer (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.transferCosts ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { transferCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 font-mono text-stone-200 text-xs"
                    placeholder="2.20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 mb-0.5">Certification (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.certificationCosts ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { certificationCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 font-mono text-stone-200 text-xs"
                    placeholder="0.45"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 mb-0.5">Logistics (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.logistics ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { logistics: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 font-mono text-stone-200 text-xs"
                    placeholder="1.35"
                  />
                </div>

                <div className="col-span-2 p-2.5 bg-stone-950/80 rounded border border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-stone-300">Producer Pricing Mode</span>
                    <div className="inline-flex bg-stone-900 p-0.5 rounded border border-stone-800 text-[9px]">
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
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          (state.costs.producerPricing?.mode ?? 'INDEX_LINKED') === 'INDEX_LINKED'
                            ? 'bg-teal-700 text-white'
                            : 'text-stone-400 hover:text-stone-200'
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
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          state.costs.producerPricing?.mode === 'FIXED_PRICE'
                            ? 'bg-amber-700 text-white'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        Fixed Price
                      </button>
                    </div>
                  </div>

                  {(state.costs.producerPricing?.mode ?? 'INDEX_LINKED') === 'INDEX_LINKED' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <label className="text-teal-300 font-medium">Producer Share (e.g. 0.90 for 90%):</label>
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
                            className="px-1 py-0.2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[9px] font-mono text-teal-300"
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
                            className="px-1 py-0.2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[9px] font-mono text-teal-300"
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
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 font-mono text-stone-200 text-xs"
                        placeholder="e.g. 0.90"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <label className="text-amber-300 font-medium">Fixed Price (€/MWh):</label>
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
                            className="px-1 py-0.2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[9px] font-mono text-amber-300"
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
                            className="px-1 py-0.2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[9px] font-mono text-amber-300"
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
                        className="w-full bg-stone-950 border border-amber-900/60 rounded px-2 py-1 font-mono font-bold text-amber-300 text-xs"
                        placeholder="e.g. 65.00"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: DEAL VALUATION (Hero + Waterfall) */}
        <div className="lg:col-span-7 2xl:flex-1 2xl:min-w-[480px] space-y-3.5 2xl:sticky 2xl:top-16 2xl:max-h-[calc(100vh-5.5rem)] 2xl:overflow-y-auto 2xl:pr-1">
          
          {/* Main Deal Ticket Panel */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-sm">
            
            {/* Ticket Header */}
            <div className="p-3.5 bg-stone-950 border-b border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-teal-400 font-bold">
                  <span>Deal Valuation & Clearance</span>
                  <span>•</span>
                  <span className="text-sky-400">{consignment.originCountryName} ➔ {selectedMarket.countryName || 'EU'}</span>
                </div>
                <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                  {selectedMarket.name}
                </h2>
                <div className="text-[11px] text-stone-400 mt-0.5 font-mono">
                  Registry: <strong className="text-stone-200">{selectedMarket.registry || selectedMarket.countryName}</strong> • Basis: <strong className="text-stone-200">{selectedMarket.legalBasis}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-sky-800 bg-sky-950 text-sky-300 hover:bg-sky-900 transition-colors font-mono"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Corridor Flow
                </button>
                <CopyButton text={summaryText} label="Copy Deal Sheet" praWarning={praCheck.hasPra} praSources={praCheck.sources} />
                <button
                  onClick={handleSaveToLibrary}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all font-mono ${
                    saveSuccess
                      ? 'bg-teal-600 border-teal-500 text-white'
                      : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
                  }`}
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  {saveSuccess ? 'Saved' : 'Save Dossier'}
                </button>
              </div>
            </div>

            {/* Verdict Highlight Strip */}
            <div className="px-3.5 py-2 bg-stone-950/80 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <StatusChip variant={eligibility.overallVerdict} size="xs" />
                <span className="text-stone-300 font-medium text-xs">{eligibility.summary}</span>
              </div>
              <StaleIndicator target={markEntry} />
            </div>

            <div className="p-3.5 space-y-4">
              
              {/* Top 3 Executive KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider font-mono">Delivered Netback</div>
                  <div className="text-lg font-bold font-mono text-teal-300 mt-0.5">
                    {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}` : '—'}
                    <span className="text-xs font-normal text-stone-400"> /MWh</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Molecule + Compliance</div>
                </div>

                <div className="p-2.5 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider font-mono">Producer Payable</div>
                  <div className="text-lg font-bold font-mono text-sky-300 mt-0.5">
                    {netback.producerPayable !== null ? `€${netback.producerPayable.toFixed(2)}` : '—'}
                    <span className="text-xs font-normal text-stone-400"> /MWh</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {state.costs.producerPricing?.mode === 'INDEX_LINKED' 
                      ? `${((state.costs.producerPricing.indexLinkedShare ?? 0) * 100).toFixed(1)}% Share` 
                      : state.costs.producerPricing?.mode === 'FIXED_PRICE' ? 'Fixed Price Mode' : 'Mode Unset'}
                  </div>
                </div>

                <div className="p-2.5 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider font-mono">Desk Margin</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    {netback.deskMargin !== null ? `€${netback.deskMargin.toFixed(2)}` : '—'}
                    <span className="text-xs font-normal text-stone-400"> /MWh</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {netback.marginPercent !== null ? `${netback.marginPercent.toFixed(1)}% Capture` : 'Awaiting cost inputs'}
                  </div>
                </div>
              </div>

              {/* German THG Double Counting Sensitivity */}
              {netback.uncertaintyBranches && netback.uncertaintyBranches.length > 0 && (
                <div className="bg-stone-950 border border-sky-900/70 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300 flex items-center gap-1.5 text-xs font-mono">
                      <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
                      German THG Double Counting Sensitivity (§37a BImSchG):
                    </span>
                    <span className="text-[9px] text-sky-400 bg-sky-950 border border-sky-800 px-1.5 py-0.2 rounded font-mono font-semibold">
                      Uncertainty
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 bg-stone-900/90 rounded border border-stone-800">
                      <div className="text-stone-400 text-[10px]">Branch 1: Single Counting (1×):</div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        Netback: €{netback.uncertaintyBranches[0].netNetback?.toFixed(2)}/MWh
                      </div>
                      <div className="text-emerald-400 text-[11px] mt-0.5">
                        Margin: €{netback.uncertaintyBranches[0].deskMargin?.toFixed(2)}/MWh ({netback.uncertaintyBranches[0].marginPercent?.toFixed(1)}%)
                      </div>
                    </div>

                    <div className="p-2 bg-stone-900/90 rounded border border-teal-800/80 bg-teal-950/20">
                      <div className="text-teal-400 text-[10px]">Branch 2: Double Counting (2×):</div>
                      <div className="text-xs font-bold text-teal-300 mt-0.5">
                        Netback: €{netback.uncertaintyBranches[1].netNetback?.toFixed(2)}/MWh
                      </div>
                      <div className="text-emerald-400 text-[11px] mt-0.5">
                        Margin: €{netback.uncertaintyBranches[1].deskMargin?.toFixed(2)}/MWh ({netback.uncertaintyBranches[1].marginPercent?.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Accounting Netback Waterfall Table */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-stone-300 pb-1 border-b border-stone-800 font-mono">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                    Netback Accounting Waterfall
                  </span>
                  <span className="text-[10px] text-stone-500 font-normal">Side: {netback.markSideUsed.toUpperCase()}</span>
                </div>

                <div className="bg-stone-950 rounded-lg border border-stone-800 divide-y divide-stone-800/80 text-xs font-mono">
                  <div className="p-2 flex justify-between items-center text-stone-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      Gas Molecule Benchmark (TTF Hub)
                    </span>
                    <span className="font-bold text-stone-100">
                      {netback.moleculeValue !== null ? `+€${netback.moleculeValue.toFixed(2)}/MWh` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-2 flex justify-between items-center text-stone-300">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Compliance Certificate Premium
                      </span>
                      {netback.certificateValue?.provenance?.sourceType && (
                        <span className="text-[9px] text-stone-400 pl-3 mt-0.5">
                          Source: <strong className="text-teal-300">{netback.certificateValue.provenance.sourceName || netback.certificateValue.provenance.sourceType}</strong> ({netback.certificateValue.provenance.sourceType})
                          {netback.certificateValue.provenance.observedAt && ` • Observed ${netback.certificateValue.provenance.observedAt.slice(0, 10)}`}
                        </span>
                      )}
                      {netback.certificateValue && !netback.certificateValue.provenance?.sourceType && !netback.certificateValue.isModelled && (
                        <span className="text-[9px] text-amber-400 pl-3 mt-0.5">
                          ⚠ Source: Unrecorded (cannot be substantiated)
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-emerald-400">
                      {netback.certificateValue?.valueEurPerMWh != null ? `+€${netback.certificateValue.valueEurPerMWh.toFixed(2)}/MWh` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-2 flex justify-between items-center text-stone-400">
                    <span>Transfer & Cross-Border Pipeline Tariffs</span>
                    <span className="text-stone-300">
                      {state.costs.transferCosts !== null ? `−€${state.costs.transferCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                    </span>
                  </div>

                  <div className="p-2 flex justify-between items-center text-stone-400">
                    <span>Certification, Audit & UDB Recording</span>
                    <span className="text-stone-300">
                      {state.costs.certificationCosts !== null ? `−€${state.costs.certificationCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                    </span>
                  </div>

                  <div className="p-2 flex justify-between items-center text-stone-400">
                    <span>Logistics / Conditioning Fees</span>
                    <span className="text-stone-300">
                      {state.costs.logistics !== null ? `−€${state.costs.logistics.toFixed(2)}/MWh` : '€0.00/MWh'}
                    </span>
                  </div>

                  {state.costs.otherCosts !== null && state.costs.otherCosts > 0 && (
                    <div className="p-2 flex justify-between items-center text-stone-400">
                      <span>Other Miscellaneous Fees</span>
                      <span className="text-stone-300">
                        −€{state.costs.otherCosts.toFixed(2)}/MWh
                      </span>
                    </div>
                  )}

                  {/* Delivered Netback Subtotal */}
                  <div className="p-2 bg-stone-900/60 flex justify-between items-center font-bold text-teal-300">
                    <span className="uppercase text-[10px]">Delivered Value Stack (Gross Netback)</span>
                    <span className="text-xs">
                      {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : '—'}
                    </span>
                  </div>

                  {/* Producer Payable Line */}
                  <div className="p-2 flex justify-between items-center text-stone-300">
                    <span className="text-amber-300 font-semibold text-[11px]">
                      {state.costs.producerPricing?.mode === 'INDEX_LINKED'
                        ? `Producer Payable (${((state.costs.producerPricing.indexLinkedShare ?? 0) * 100).toFixed(0)}% Value Share)`
                        : 'Fixed Producer Procurement Cost'}
                    </span>
                    <span className="font-bold text-amber-300 text-xs">
                      {netback.producerPayable !== null ? `−€${netback.producerPayable.toFixed(2)}/MWh` : 'Not set'}
                    </span>
                  </div>

                  {/* Realised Desk Margin Bottom Line */}
                  <div className="p-2.5 bg-emerald-950/30 border-t border-emerald-800/80 flex justify-between items-center font-bold text-emerald-400 text-xs">
                    <span className="uppercase tracking-wider text-[11px]">
                      Realised Desk Capture Margin {netback.marginPercent !== null ? `(${netback.marginPercent.toFixed(1)}%)` : ''}
                    </span>
                    <span className="text-sm">
                      {netback.deskMargin !== null ? `€${netback.deskMargin.toFixed(2)}/MWh` : '—'}
                    </span>
                  </div>
                </div>
              </div>


            </div>
          </div>
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
