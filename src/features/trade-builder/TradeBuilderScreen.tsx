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

  return (
    <div className="space-y-5 font-sans text-stone-200 pb-16">
      
      {/* Top Header Strip */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-950/80 border border-teal-800/80 flex items-center justify-center text-teal-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Trade Builder & Deal Ticket
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-800 text-stone-300 border border-stone-700">
                {consignment.originCountryName} ➔ {selectedMarket.countryName || 'Pan-EU'}
              </span>
            </div>
            <p className="text-stone-400 text-xs mt-0.5">
              Live RED III regulatory clearance, logistics corridor tariffs, and commercial netback economics.
            </p>
          </div>
        </div>

        {/* Quick Scenarios Segmented Bar */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-stone-500 font-medium text-[11px] uppercase tracking-wider">Presets:</span>
          <div className="inline-flex bg-stone-950 p-1 rounded-lg border border-stone-800 gap-1">
            <button
              onClick={() => handlePreset('DANISH_MANURE', 'DE_THG')}
              className="px-2.5 py-1 rounded-md text-xs font-medium hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
            >
              🇩🇰 DK Manure (THG)
            </button>
            <button
              onClick={() => handlePreset('UK_FOOD_WASTE', 'DE_THG')}
              className="px-2.5 py-1 rounded-md text-xs font-medium hover:bg-red-950/50 text-red-300 transition-colors"
            >
              🇬🇧 UK Grid (Blocked)
            </button>
            <button
              onClick={() => handlePreset('ISCC_PLUS_VOLUNTARY', 'VOL_SCOPE1')}
              className="px-2.5 py-1 rounded-md text-xs font-medium hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
            >
              🌱 ISCC PLUS (Voluntary)
            </button>
            <button
              onClick={() => handlePreset('FUELEU_MARITIME_LNG', 'FUELEU')}
              className="px-2.5 py-1 rounded-md text-xs font-medium hover:bg-sky-950/50 text-sky-300 transition-colors"
            >
              ⚓ FuelEU Maritime
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Institutional Trading Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN (5 cols): Trade Configuration & Cost Structure */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* SECTION 1: Consignment Specification */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 bg-stone-950/70 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                1. Consignment Specification
              </span>
              <span className="text-[11px] font-medium text-teal-400">
                {consignment.annexClassification === 'IX_A' ? 'Annex IX-A Advanced' :
                 consignment.annexClassification === 'IX_B' ? 'Annex IX-B Capped' : 'Standard Crop'}
              </span>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-400 mb-1">Contract / Consignment Label</label>
                <input
                  type="text"
                  value={consignment.name}
                  onChange={e => setConsignment({ ...consignment, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-stone-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-400 mb-1">Feedstock Category</label>
                  <select
                    value={consignment.feedstock}
                    onChange={e => handleFeedstockChange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-200 outline-none text-xs"
                  >
                    {Object.entries(FEEDSTOCK_REGISTRY).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-400 mb-1">Origin Country</label>
                  <select
                    value={consignment.originCountry}
                    onChange={e => {
                      const val = e.target.value;
                      const isEU = EU_COUNTRY_CODES.includes(val);
                      const name = COUNTRY_NAMES[val] || val;
                      setConsignment(prev => ({
                        ...prev,
                        originCountry: val,
                        originCountryName: name,
                        injectionCountry: val,
                        injectionIsEU: isEU,
                        udbStatus: !isEU ? 'NOT_RECORDED' : prev.udbStatus,
                        name: `${name} ${prev.feedstockName || 'Biomethane'}`,
                      }));
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-200 outline-none text-xs"
                  >
                    <option value="FR">🇫🇷 France (829 plants)</option>
                    <option value="DE">🇩🇪 Germany (285 plants)</option>
                    <option value="IT">🇮🇹 Italy (273 plants)</option>
                    <option value="GB">🇬🇧 United Kingdom (108 plants)</option>
                    <option value="NL">🇳🇱 Netherlands (92 plants)</option>
                    <option value="SE">🇸🇪 Sweden (67 plants)</option>
                    <option value="DK">🇩🇰 Denmark (60 plants)</option>
                    <option value="FI">🇫🇮 Finland (32 plants)</option>
                    <option value="ES">🇪🇸 Spain (26 plants)</option>
                    <option value="PL">🇵🇱 Poland (22 plants)</option>
                    <option value="AT">🇦🇹 Austria (20 plants)</option>
                    <option value="CH">🇨🇭 Switzerland (18 plants)</option>
                    <option value="UA">🇺🇦 Ukraine (18 plants)</option>
                    <option value="NO">🇳🇴 Norway (15 plants)</option>
                    <option value="PT">🇵🇹 Portugal (13 plants)</option>
                    <option value="BE">🇧🇪 Belgium (12 plants)</option>
                    <option value="CZ">🇨🇿 Czech Republic (10 plants)</option>
                    <option value="IE">🇮🇪 Ireland (10 plants)</option>
                  </select>
                </div>
              </div>

              {/* Carbon Intensity & GHG Rating */}
              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-stone-300 flex items-center gap-1">
                    Carbon Intensity (CI):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-300 text-sm">
                      {consignment.carbonIntensity} gCO₂e/MJ
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      ({ghgSavingPct}% GHG saving)
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="-160"
                  max="60"
                  step="1"
                  value={consignment.carbonIntensity}
                  onChange={e => setConsignment({ ...consignment, carbonIntensity: Number(e.target.value) })}
                  className="w-full accent-teal-500 cursor-pointer h-1.5 bg-stone-800 rounded-lg appearance-none"
                />

                <div className="flex justify-between text-[11px] text-stone-500 font-mono pt-1 border-t border-stone-900">
                  <span>Carbon Factor: <strong className="text-stone-300">{tco2eFactor} tCO₂e/MWh</strong></span>
                  <span>Baseline: 94.0 gCO₂e/MJ</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-400 mb-1">Certification Scheme</label>
                  <select
                    value={consignment.certificationScheme}
                    onChange={e => setConsignment({ ...consignment, certificationScheme: e.target.value as CertificationScheme })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-200 outline-none text-xs"
                  >
                    <option value="ISCC_EU">ISCC EU (RED III)</option>
                    <option value="REDCERT_EU">REDcert EU (RED III)</option>
                    <option value="2BSVS">2BSvs (RED III)</option>
                    <option value="KZR_INIG">KZR INiG (RED III)</option>
                    <option value="ISCC_PLUS">ISCC PLUS (Voluntary)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-400 mb-1">Chain of Custody</label>
                  <select
                    value={consignment.chainOfCustody}
                    onChange={e => setConsignment({ ...consignment, chainOfCustody: e.target.value as ChainOfCustody })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-200 outline-none text-xs"
                  >
                    <option value="MASS_BALANCE">Mass Balance (Transport)</option>
                    <option value="SEGREGATION">Physical Segregation (Bio-LNG)</option>
                    <option value="BOOK_AND_CLAIM">Book-and-Claim (Voluntary)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-medium text-stone-400 mb-1">UDB Status</label>
                  <select
                    value={consignment.udbStatus}
                    onChange={e => setConsignment({ ...consignment, udbStatus: e.target.value as UDBStatus })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs text-stone-200"
                  >
                    <option value="RECORDED">Recorded</option>
                    <option value="PENDING">Pending</option>
                    <option value="NOT_RECORDED">Not Recorded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-stone-400 mb-1">PoS Status</label>
                  <select
                    value={consignment.posStatus}
                    onChange={e => setConsignment({ ...consignment, posStatus: e.target.value as PoSStatus })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs text-stone-200"
                  >
                    <option value="ISSUED">Issued</option>
                    <option value="PENDING">Pending</option>
                    <option value="NOT_AVAILABLE">Not Available</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-stone-400 mb-1">Volume (MWh)</label>
                  <input
                    type="number"
                    value={consignment.volumeMWh || ''}
                    onChange={e => setConsignment({ ...consignment, volumeMWh: Number(e.target.value) || null })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-stone-100 font-bold"
                    placeholder="10000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Target Compliance Market */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 bg-stone-950/70 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                2. Target Compliance Market
              </span>
              <span className="text-[11px] text-stone-400 font-mono">14 Active Markets</span>
            </div>

            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {activeMarkets.map(m => {
                const isSelected = selectedMarketId === m.id;
                const quickElig = evaluateEligibility(consignment, m);
                const quickNb = computeNetback(m, consignment, state.marks, state.costs, state.marks.pricingSide);

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMarketId(m.id);
                      setSearchParams({ marketId: m.id, originCountry: consignment.originCountry });
                    }}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 bg-teal-950/60 ring-1 ring-teal-500'
                        : 'border-stone-800/80 bg-stone-950 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-stone-200 leading-tight">
                        {m.country ? `${m.country} ` : ''}{m.name}
                      </div>
                      <StatusChip variant={quickElig.overallVerdict} size="xs" />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                      <span>{m.unitLabel}</span>
                      <span className="font-bold text-stone-200">
                        {quickNb.netNetback !== null ? `€${quickNb.netNetback.toFixed(2)}/MWh` : 'No mark'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Cost Structure & Producer Offtake */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 bg-stone-950/70 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                3. Cost & Procurement Terms
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 hover:bg-sky-900 text-[11px] font-medium transition-colors flex items-center gap-1"
                >
                  <Truck className="w-3 h-3" />
                  Corridor Tariffs
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
                  className="px-2 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300 hover:bg-teal-900 text-[11px] font-medium transition-colors"
                >
                  Auto-Fill
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">Transfer & Grid Tariffs (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.transferCosts ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { transferCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 font-mono text-stone-200"
                    placeholder="2.20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">Certification & UDB (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.certificationCosts ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { certificationCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 font-mono text-stone-200"
                    placeholder="0.45"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">Logistics / Compression (€/MWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={state.costs.logistics ?? ''}
                    onChange={e => dispatch({ type: 'SET_COSTS', costs: { logistics: e.target.value === '' ? null : Number(e.target.value) } })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 font-mono text-stone-200"
                    placeholder="1.35"
                  />
                </div>

                <div className="col-span-2 p-3 bg-stone-950/80 rounded-lg border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-300">Producer Pricing Mode</span>
                    <div className="inline-flex bg-stone-900 p-0.5 rounded border border-stone-800 text-[10px]">
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
                            ? 'bg-teal-700 text-white'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        Index-Linked (% Share)
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
                            ? 'bg-teal-700 text-white'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        Fixed Price (€/MWh)
                      </button>
                    </div>
                  </div>

                  {(state.costs.producerPricing?.mode ?? 'INDEX_LINKED') === 'INDEX_LINKED' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <label className="text-stone-400">Producer Value Share (0.00 – 1.00):</label>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[10px] text-stone-500">Suggestions:</span>
                          <button
                            type="button"
                            onClick={() => dispatch({
                              type: 'SET_COSTS',
                              costs: {
                                producerPricing: {
                                  mode: 'INDEX_LINKED',
                                  fixedPriceEurPerMwh: state.costs.producerPricing?.fixedPriceEurPerMwh ?? null,
                                  indexLinkedShare: 0.90,
                                  source: 'Typical offtake share (UNVERIFIED)',
                                  lastVerified: null,
                                  confidence: 'UNVERIFIED',
                                }
                              }
                            })}
                            className="px-1.5 py-0.2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[10px] font-mono text-teal-300"
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
                                  indexLinkedShare: 0.92,
                                  source: 'High offtake share (UNVERIFIED)',
                                  lastVerified: null,
                                  confidence: 'UNVERIFIED',
                                }
                              }
                            })}
                            className="px-1.5 py-0.2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[10px] font-mono text-teal-300"
                          >
                            92%
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
                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 font-mono text-stone-200"
                        placeholder="e.g. 0.90 (unverified — set your own)"
                      />
                      <p className="text-[10px] text-stone-500 leading-tight">
                        Applies percentage directly to delivered netback value stack. No procurement double deduction.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <label className="text-amber-300 font-medium">All-in Fixed Procurement Price (€/MWh):</label>
                        <div className="flex gap-1.5 items-center">
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
                            className="px-1.5 py-0.2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[10px] font-mono text-amber-300"
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
                            className="px-1.5 py-0.2 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[10px] font-mono text-amber-300"
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
                        className="w-full bg-stone-950 border border-amber-900/60 rounded-lg px-2.5 py-1.5 font-mono font-bold text-amber-300"
                        placeholder="e.g. 65.00"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Valuation Strip, Economics Waterfall & Regulatory Checklist */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Main Deal Ticket Panel */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-sm">
            
            {/* Ticket Header */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-teal-400 font-bold">
                  <span>Deal Valuation & Clearance</span>
                  <span>•</span>
                  <span className="text-sky-400">{consignment.originCountryName} ➔ {selectedMarket.countryName || 'EU'}</span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                  {selectedMarket.name}
                </h2>
                <div className="text-xs text-stone-400 mt-0.5 font-mono">
                  Registry: <strong className="text-stone-200">{selectedMarket.registry || selectedMarket.countryName}</strong> • Basis: <strong className="text-stone-200">{selectedMarket.legalBasis}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-sky-800 bg-sky-950 text-sky-300 hover:bg-sky-900 transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Corridor Flow
                </button>
                <CopyButton text={summaryText} label="Copy Deal Sheet" />
                <button
                  onClick={handleSaveToLibrary}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    saveSuccess
                      ? 'bg-teal-600 border-teal-500 text-white'
                      : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
                  }`}
                >
                  <BookmarkPlus className="w-4 h-4" />
                  {saveSuccess ? 'Saved' : 'Save Dossier'}
                </button>
              </div>
            </div>

            {/* Verdict Highlight Strip */}
            <div className="px-4 py-2.5 bg-stone-950/80 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <StatusChip variant={eligibility.overallVerdict} size="sm" />
                <span className="text-stone-300 font-medium">{eligibility.summary}</span>
              </div>
              <StaleIndicator updatedAt={markEntry?.updatedAt ?? null} />
            </div>

            <div className="p-4 space-y-5">
              
              {/* Top 3 Executive KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Delivered Netback</div>
                  <div className="text-xl font-bold font-mono text-teal-300 mt-1">
                    {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}` : '—'}
                    <span className="text-xs font-normal text-stone-400"> /MWh</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">Molecule + Compliance Value</div>
                </div>

                <div className="p-3 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Producer Payable</div>
                  <div className="text-xl font-bold font-mono text-sky-300 mt-1">
                    {netback.producerPayable !== null ? `€${netback.producerPayable.toFixed(2)}` : '—'}
                    <span className="text-xs font-normal text-stone-400"> /MWh</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {state.costs.producerPricing?.mode === 'INDEX_LINKED'
                      ? `${((state.costs.producerPricing.indexLinkedShare ?? 0) * 100).toFixed(0)}% Index-Linked Share`
                      : 'Fixed Procurement Cost'}
                  </div>
                </div>

                <div className="p-3 bg-stone-950 rounded-lg border border-emerald-900/60 bg-gradient-to-b from-emerald-950/20 to-transparent">
                  <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Realised Desk Margin</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800">
                      {netback.marginPercent !== null ? `${netback.marginPercent.toFixed(1)}% margin` : 'Desk Capture'}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {netback.deskMargin !== null ? `€${netback.deskMargin.toFixed(2)}` : '—'}
                    <span className="text-xs font-normal text-emerald-500"> /MWh</span>
                  </div>
                  <div className="text-[11px] text-emerald-500/80 font-mono mt-0.5">
                    {consignment.volumeMWh && netback.deskPnL !== null
                      ? `Total: €${netback.deskPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : 'Contract Desk P&L'}
                  </div>
                </div>
              </div>

              {/* German THG Double Counting Sensitivity Branch */}
              {netback.uncertaintyBranches && (
                <div className="bg-stone-950 border border-sky-900/70 p-3.5 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-sky-400" />
                      German THG Double Counting Sensitivity (§37a BImSchG):
                    </span>
                    <span className="text-[10px] text-sky-400 bg-sky-950 border border-sky-800 px-2 py-0.5 rounded font-mono font-semibold">
                      Regulatory Uncertainty
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                    <div className="p-2.5 bg-stone-900/90 rounded border border-stone-800">
                      <div className="text-stone-400 text-[11px]">Branch 1: Single Counting (1×):</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        Netback: €{netback.uncertaintyBranches[0].netNetback?.toFixed(2)}/MWh
                      </div>
                      <div className="text-emerald-400 text-xs mt-0.5">
                        Desk Margin: €{netback.uncertaintyBranches[0].deskMargin?.toFixed(2)}/MWh ({netback.uncertaintyBranches[0].marginPercent?.toFixed(1)}%)
                      </div>
                    </div>

                    <div className="p-2.5 bg-stone-900/90 rounded border border-teal-800/80 bg-teal-950/20">
                      <div className="text-teal-400 text-[11px]">Branch 2: If Double Counting Retained (2×):</div>
                      <div className="text-sm font-bold text-teal-300 mt-0.5">
                        Netback: €{netback.uncertaintyBranches[1].netNetback?.toFixed(2)}/MWh
                      </div>
                      <div className="text-emerald-400 text-xs mt-0.5">
                        Desk Margin: €{netback.uncertaintyBranches[1].deskMargin?.toFixed(2)}/MWh ({netback.uncertaintyBranches[1].marginPercent?.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Accounting Netback Waterfall Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-stone-300 pb-1 border-b border-stone-800">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    Netback Accounting Waterfall
                  </span>
                  <span className="text-[11px] text-stone-500 font-normal">Side: {netback.markSideUsed.toUpperCase()}</span>
                </div>

                <div className="bg-stone-950 rounded-lg border border-stone-800 divide-y divide-stone-800/80 text-xs font-mono">
                  <div className="p-2.5 flex justify-between items-center text-stone-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      Gas Molecule Benchmark (TTF Hub)
                    </span>
                    <span className="font-bold text-stone-100">
                      {netback.moleculeValue !== null ? `+€${netback.moleculeValue.toFixed(2)}/MWh` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-2.5 flex justify-between items-center text-stone-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Compliance Certificate Premium
                    </span>
                    <span className="font-bold text-emerald-400">
                      {netback.certificateValue?.valueEurPerMWh != null ? `+€${netback.certificateValue.valueEurPerMWh.toFixed(2)}/MWh` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-2.5 flex justify-between items-center text-stone-400">
                    <span>Transfer & Cross-Border Pipeline Tariffs</span>
                    <span className="text-stone-300">
                      {state.costs.transferCosts !== null ? `−€${state.costs.transferCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                    </span>
                  </div>

                  <div className="p-2.5 flex justify-between items-center text-stone-400">
                    <span>Certification, Audit & UDB Recording</span>
                    <span className="text-stone-300">
                      {state.costs.certificationCosts !== null ? `−€${state.costs.certificationCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                    </span>
                  </div>

                  <div className="p-2.5 flex justify-between items-center text-stone-400">
                    <span>Logistics / Conditioning Fees</span>
                    <span className="text-stone-300">
                      {state.costs.logistics !== null ? `−€${state.costs.logistics.toFixed(2)}/MWh` : '€0.00/MWh'}
                    </span>
                  </div>

                  {/* Delivered Netback Subtotal */}
                  <div className="p-2.5 bg-stone-900/60 flex justify-between items-center font-bold text-teal-300">
                    <span className="uppercase text-[11px]">Delivered Value Stack (Gross Netback)</span>
                    <span className="text-sm">
                      {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : '—'}
                    </span>
                  </div>

                  {/* Producer Payable Line */}
                  <div className="p-2.5 flex justify-between items-center text-stone-300">
                    <span className="text-amber-300 font-semibold">
                      {state.costs.producerPricing?.mode === 'INDEX_LINKED'
                        ? `Producer Payable (${((state.costs.producerPricing.indexLinkedShare ?? 0) * 100).toFixed(0)}% Value Share)`
                        : 'Fixed Producer Procurement Cost'}
                    </span>
                    <span className="font-bold text-amber-300">
                      {netback.producerPayable !== null ? `−€${netback.producerPayable.toFixed(2)}/MWh` : 'Not set'}
                    </span>
                  </div>

                  {/* Realised Desk Margin Bottom Line */}
                  <div className="p-3 bg-emerald-950/30 border-t border-emerald-800/80 flex justify-between items-center font-bold text-emerald-400 text-sm">
                    <span className="uppercase tracking-wider text-xs">
                      Realised Desk Capture Margin {netback.marginPercent !== null ? `(${netback.marginPercent.toFixed(1)}%)` : ''}
                    </span>
                    <span className="text-base">
                      {netback.deskMargin !== null ? `€${netback.deskMargin.toFixed(2)}/MWh` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: Regulatory Compliance Audit Checklist */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    Regulatory Gate Compliance Checklist ({eligibility.gates.length} Gates)
                  </span>
                  <button
                    onClick={() => setShowFullAudit(!showFullAudit)}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                  >
                    {showFullAudit ? 'Compact View' : 'Show Full Legal Citations'}
                    {showFullAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {eligibility.gates.map((gate, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border text-xs transition-all ${
                        gate.verdict === 'PASS' 
                          ? 'bg-stone-950/80 border-stone-800/80' 
                          : gate.verdict === 'CONDITIONAL' || gate.verdict === 'UNRESOLVED'
                          ? 'bg-amber-950/20 border-amber-900/60'
                          : 'bg-red-950/20 border-red-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {gate.verdict === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                          {gate.verdict === 'CONDITIONAL' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                          {gate.verdict === 'UNRESOLVED' && <AlertCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />}
                          {gate.verdict === 'HARD_BLOCK' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                          <span className="font-bold text-stone-200">{gate.gateLabel}</span>
                        </div>
                        <StatusChip variant={gate.verdict} size="xs" />
                      </div>

                      <p className="text-stone-400 text-xs mt-1.5 leading-relaxed pl-6">
                        {gate.reason}
                      </p>

                      {gate.remedy && (
                        <div className="mt-2 ml-6 p-2 bg-amber-950/40 border border-amber-800/80 rounded text-[11px] text-amber-300">
                          <strong>Action Required:</strong> {gate.remedy}
                        </div>
                      )}

                      {showFullAudit && gate.citations.length > 0 && (
                        <div className="mt-2.5 ml-6 pt-2 border-t border-stone-800 space-y-1.5">
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
