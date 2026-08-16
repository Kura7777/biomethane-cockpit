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

const EU_COUNTRY_CODES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

export function TradeBuilderScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
    <div className="bg-[#12171C] rounded p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-[#1E262F] pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8B98A5] flex items-center gap-1.5 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#8B98A5]" />
          Regulatory Compliance Checklist ({eligibility.gates.length} Gates)
        </span>
        <button
          onClick={() => setShowFullAudit(!showFullAudit)}
          className="text-[10px] text-[#2DD4BF] hover:underline font-medium flex items-center gap-1 font-mono"
        >
          {showFullAudit ? 'Compact' : 'Legal Citations'}
          {showFullAudit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs px-0.5 font-mono">
        <span className="text-[10px] text-[#8B98A5] uppercase tracking-wide">Overall Verdict</span>
        <StatusChip variant={eligibility.overallVerdict} size="xs" />
      </div>

      <div className="space-y-2">
        {eligibility.gates.map((gate, idx) => (
          <div 
            key={idx} 
            className={`p-2.5 rounded text-xs transition-all ${
              gate.verdict === 'PASS' 
                ? 'bg-[#0B0E11]' 
                : gate.verdict === 'CONDITIONAL' || gate.verdict === 'UNRESOLVED'
                ? 'bg-[#1C160C] border border-[#D99A2B]/40'
                : 'bg-[#1C0E10] border border-[#D64545]/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono">
                {gate.verdict === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5 text-[#2DD4BF] flex-shrink-0" />}
                {gate.verdict === 'CONDITIONAL' && <AlertTriangle className="w-3.5 h-3.5 text-[#D99A2B] flex-shrink-0" />}
                {gate.verdict === 'UNRESOLVED' && <AlertCircle className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
                {gate.verdict === 'HARD_BLOCK' && <XCircle className="w-3.5 h-3.5 text-[#D64545] flex-shrink-0" />}
                <span className="font-semibold text-[#E8EDF2] text-[11px]">{gate.gateLabel}</span>
              </div>
              <StatusChip variant={gate.verdict} size="xs" />
            </div>

            <p className="text-[#8B98A5] text-[11px] mt-1 leading-relaxed pl-5">
              {gate.reason}
            </p>

            {gate.remedy && (
              <div className="mt-1.5 ml-5 p-1.5 bg-[#0B0E11] border border-[#D99A2B]/30 rounded text-[10px] text-[#D99A2B]">
                <strong className="text-[#E8EDF2]">Action:</strong> {gate.remedy}
              </div>
            )}

            {showFullAudit && gate.citations.length > 0 && (
              <div className="mt-2 ml-5 pt-1.5 border-t border-[#1E262F] space-y-1">
                {gate.citations.map((cit, cIdx) => (
                  <CitationBlock key={cIdx} citation={cit} compact={false} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

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

          {/* GROUP 2: Target Offtake Market Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[10px] font-semibold text-[#8B98A5] uppercase tracking-wider">
                2. Target Offtake Market
              </span>
              <span className="text-[10px] text-[#8B98A5]">
                {activeMarkets.length} Compliance Markets
              </span>
            </div>

            <div className="bg-[#12171C] rounded p-2.5 grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
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
                    className={`p-2 rounded transition-all cursor-pointer font-mono ${
                      isSelected
                        ? 'bg-[#18242A] border-l-2 border-[#2DD4BF]'
                        : 'bg-[#0B0E11] hover:bg-[#182026]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-[11px] text-[#E8EDF2] leading-tight truncate">
                        {m.country ? `${m.country} ` : ''}{m.name}
                      </div>
                      <StatusChip variant={quickElig.overallVerdict} size="xs" />
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-[#8B98A5] font-mono">
                      <span>{m.unitLabel}</span>
                      <span className="font-semibold text-[#E8EDF2] tabular-nums">
                        {quickNb.netNetback !== null ? `€${quickNb.netNetback.toFixed(1)}` : 'No mark'}
                      </span>
                    </div>
                  </div>
                );
              })}
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
        <div className="lg:col-span-7 2xl:flex-1 2xl:min-w-[480px] space-y-6 2xl:sticky 2xl:top-16 2xl:max-h-[calc(100vh-5.5rem)] 2xl:overflow-y-auto 2xl:pr-1">
          
          {/* Main Deal Ticket Panel */}
          <div className="bg-[#12171C] rounded p-4 space-y-4">
            
            {/* Ticket Header */}
            <div className="border-b border-[#1E262F] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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

            {/* HERO VALUATION ROW (Phase 3) */}
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

                {/* 2. Producer Payable (18px section size) */}
                <div className="sm:col-span-3 flex flex-col justify-between p-2 border-t sm:border-t-0 sm:border-l border-[#1E262F]">
                  <div className="text-[10px] font-normal text-[#8B98A5] uppercase tracking-wider font-mono">
                    Producer Payable
                  </div>

                  {netback.producerPayable !== null ? (
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
                  ) : netback.netNetback !== null ? (
                    <div className="mt-1">
                      <button
                        onClick={() => {
                          const el = document.getElementById('cost-procurement-section');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-[#D99A2B] hover:underline font-mono font-medium text-left"
                      >
                        Set producer pricing <ArrowRight className="w-3 h-3" />
                      </button>
                      <div className="text-[10px] text-[#8B98A5] mt-1 font-mono">
                        Pricing mode unset
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[18px] font-semibold font-mono text-[#8B98A5] tabular-nums mt-1">—</div>
                      <div className="text-[10px] text-[#8B98A5] mt-1 font-mono">Unset</div>
                    </div>
                  )}
                </div>

                {/* 3. Desk Margin (18px section size, red on loss) */}
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
                  ) : netback.netNetback !== null ? (
                    <div className="mt-1">
                      <button
                        onClick={() => {
                          const el = document.getElementById('cost-procurement-section');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-[#8B98A5] hover:text-[#E8EDF2] hover:underline font-mono text-left"
                      >
                        Calculate margin <ArrowRight className="w-3 h-3" />
                      </button>
                      <div className="text-[10px] text-[#8B98A5] mt-1 font-mono">
                        Awaiting producer cost
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[18px] font-semibold font-mono text-[#8B98A5] tabular-nums mt-1">—</div>
                      <div className="text-[10px] text-[#8B98A5] mt-1 font-mono">Awaiting netback</div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* German THG Double Counting Sensitivity */}
            {netback.uncertaintyBranches && netback.uncertaintyBranches.length > 0 && (
              <div className="bg-[#0B0E11] p-3 rounded space-y-2 border border-[#1E262F]">
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
                  <div className="p-2.5 bg-[#12171C] rounded">
                    <div className="text-[#8B98A5] text-[10px] uppercase">Branch 1: Single Counting (1×)</div>
                    <div className="text-xs font-semibold text-[#E8EDF2] mt-0.5 tabular-nums">
                      Netback: €{netback.uncertaintyBranches[0].netNetback?.toFixed(2)}/MWh
                    </div>
                    <div className="text-[#2DD4BF] text-[11px] mt-0.5 tabular-nums">
                      Margin: €{netback.uncertaintyBranches[0].deskMargin?.toFixed(2)}/MWh ({netback.uncertaintyBranches[0].marginPercent?.toFixed(1)}%)
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#12171C] rounded border-l-2 border-[#2DD4BF]">
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

            {/* Accounting Netback Waterfall Table */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-[#8B98A5] pb-1 border-b border-[#1E262F] font-mono">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#8B98A5]" />
                  Netback Accounting Waterfall
                </span>
                <span className="text-[10px] text-[#8B98A5] font-normal">Side: {netback.markSideUsed.toUpperCase()}</span>
              </div>

              <div className="bg-[#0B0E11] rounded divide-y divide-[#1E262F] text-xs font-mono">
                <div className="p-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B98A5]" />
                    Gas Molecule Benchmark (TTF Hub)
                  </span>
                  <span className="font-semibold text-[#E8EDF2] tabular-nums">
                    {netback.moleculeValue !== null ? `+€${netback.moleculeValue.toFixed(2)}/MWh` : 'Not set'}
                  </span>
                </div>

                <div className="p-2.5 flex justify-between items-center text-[#8B98A5]">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1.5 text-[#E8EDF2]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                      Compliance Certificate Premium
                    </span>
                    {netback.certificateValue?.provenance?.sourceType && (
                      <span className="text-[9px] text-[#8B98A5] pl-3 mt-0.5">
                        Source: <strong className="text-[#E8EDF2]">{netback.certificateValue.provenance.sourceName || netback.certificateValue.provenance.sourceType}</strong> ({netback.certificateValue.provenance.sourceType})
                        {netback.certificateValue.provenance.observedAt && ` • Observed ${netback.certificateValue.provenance.observedAt.slice(0, 10)}`}
                      </span>
                    )}
                    {netback.certificateValue && !netback.certificateValue.provenance?.sourceType && !netback.certificateValue.isModelled && (
                      <span className="text-[9px] text-[#D99A2B] pl-3 mt-0.5">
                        ⚠ Source: Unrecorded (cannot be substantiated)
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-[#2DD4BF] tabular-nums">
                    {netback.certificateValue?.valueEurPerMWh != null ? `+€${netback.certificateValue.valueEurPerMWh.toFixed(2)}/MWh` : 'Not set'}
                  </span>
                </div>

                <div className="p-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span>Transfer & Cross-Border Pipeline Tariffs</span>
                  <span className="text-[#E8EDF2] tabular-nums">
                    {state.costs.transferCosts !== null ? `−€${state.costs.transferCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                  </span>
                </div>

                <div className="p-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span>Certification, Audit & UDB Recording</span>
                  <span className="text-[#E8EDF2] tabular-nums">
                    {state.costs.certificationCosts !== null ? `−€${state.costs.certificationCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                  </span>
                </div>

                <div className="p-2.5 flex justify-between items-center text-[#8B98A5]">
                  <span>Logistics / Conditioning Fees</span>
                  <span className="text-[#E8EDF2] tabular-nums">
                    {state.costs.logistics !== null ? `−€${state.costs.logistics.toFixed(2)}/MWh` : '€0.00/MWh'}
                  </span>
                </div>

                {state.costs.otherCosts !== null && state.costs.otherCosts > 0 && (
                  <div className="p-2.5 flex justify-between items-center text-[#8B98A5]">
                    <span>Other Miscellaneous Fees</span>
                    <span className="text-[#E8EDF2] tabular-nums">
                      −€{state.costs.otherCosts.toFixed(2)}/MWh
                    </span>
                  </div>
                )}

                {/* Delivered Netback Subtotal */}
                <div className="p-2.5 bg-[#182026] flex justify-between items-center font-semibold text-[#E8EDF2]">
                  <span className="uppercase text-[10px] tracking-wide text-[#8B98A5]">Delivered Value Stack (Gross Netback)</span>
                  <span className="text-[18px] tabular-nums text-[#2DD4BF]">
                    {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : '—'}
                  </span>
                </div>

                {/* Producer Payable Line */}
                <div className="p-2.5 flex justify-between items-center text-[#8B98A5]">
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
                <div className="p-3 bg-[#18242A] border-t border-[#1E262F] flex justify-between items-center font-semibold text-[#2DD4BF]">
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

        {/* COLUMN 3: COMPLIANCE GATES (Visible on >= 1600px / 2xl screen) */}
        <div className="hidden 2xl:block 2xl:w-[380px] 2xl:shrink-0 space-y-4 2xl:sticky 2xl:top-16 2xl:max-h-[calc(100vh-5.5rem)] 2xl:overflow-y-auto 2xl:pr-1">
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
