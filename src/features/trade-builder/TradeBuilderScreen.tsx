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
import { CI_COMPARATOR_ROAD_TRANSPORT } from '../../domain/markets/constants';
import { 
  Calculator, 
  ShieldCheck, 
  AlertTriangle, 
  BookmarkPlus, 
  TrendingUp,
  Info,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  Truck
} from 'lucide-react';
import { LogisticsModal } from '../logistics/LogisticsModal';

const EU_COUNTRY_CODES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

export function TradeBuilderScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preSelectedMarketId = searchParams.get('marketId') || 'DE_THG';
  const { state, dispatch } = useAppState();
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);

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
        const countryName = code === 'SE' ? 'Sweden' :
          code === 'DK' ? 'Denmark' :
          code === 'DE' ? 'Germany' :
          code === 'FR' ? 'France' :
          code === 'IT' ? 'Italy' :
          code === 'NL' ? 'Netherlands' :
          code === 'ES' ? 'Spain' :
          code === 'AT' ? 'Austria' :
          code === 'GB' ? 'United Kingdom' : code;

        return {
          ...prev,
          originCountry: code,
          originCountryName: countryName,
          injectionCountry: code,
          injectionIsEU: isEU,
          udbStatus: isEU ? 'RECORDED' : 'NOT_RECORDED',
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

  // Handle injection country change
  const handleInjectionCountryChange = (countryCode: string) => {
    const isEU = EU_COUNTRY_CODES.includes(countryCode);
    setConsignment(prev => ({
      ...prev,
      injectionCountry: countryCode,
      injectionIsEU: isEU,
      udbStatus: isEU ? 'RECORDED' : 'NOT_RECORDED',
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
    <div className="space-y-6 font-sans text-stone-100 pb-16">
      
      {/* Top Banner / Scenarios */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-teal-400" />
            <h1 className="text-base font-bold text-white font-mono uppercase tracking-tight">
              Trade Builder & Regulatory Validator
            </h1>
          </div>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            Validate legal clearance across RED III gates and calculate full netback economics with formula transparency.
          </p>
        </div>

        {/* Trade Presets */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="text-[10px] text-stone-500 uppercase font-bold">Scenarios:</span>
          <button
            onClick={() => handlePreset('DANISH_MANURE', 'DE_THG')}
            className="px-2.5 py-1 rounded border border-teal-700 bg-teal-950/60 text-teal-300 hover:bg-teal-900/80 transition-colors"
          >
            🇩🇰 DK Manure (THG)
          </button>
          <button
            onClick={() => handlePreset('UK_FOOD_WASTE', 'DE_THG')}
            className="px-2.5 py-1 rounded border border-red-800 bg-red-950/60 text-red-300 hover:bg-red-900/80 transition-colors"
          >
            🇬🇧 UK Grid (UDB Block)
          </button>
          <button
            onClick={() => handlePreset('ISCC_PLUS_VOLUNTARY', 'VOL_SCOPE1')}
            className="px-2.5 py-1 rounded border border-amber-800 bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 transition-colors"
          >
            📋 ISCC PLUS (Voluntary)
          </button>
          <button
            onClick={() => handlePreset('FUELEU_MARITIME_LNG', 'FUELEU')}
            className="px-2.5 py-1 rounded border border-sky-800 bg-sky-950/60 text-sky-300 hover:bg-sky-900/80 transition-colors"
          >
            ⚓ FuelEU Bio-LNG
          </button>

          <button
            onClick={() => setIsLogisticsOpen(true)}
            className="px-2.5 py-1 rounded border border-teal-600 bg-teal-900/50 text-teal-200 hover:bg-teal-800/70 transition-colors flex items-center gap-1 font-bold shadow-xs"
          >
            <Truck className="w-3.5 h-3.5 text-teal-400" />
            🚚 Route Flow & Logistics Guide
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: 1. Consignment Spec + 2. Target Market Grid */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* STEP 1: Consignment Form */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-xs font-bold text-stone-200 font-mono uppercase flex items-center gap-2">
                <span className="flex items-center justify-center w-4 h-4 rounded bg-teal-600 text-white text-[10px]">1</span>
                Consignment Specification
              </h2>
              <span className="text-[10px] font-mono text-teal-400">RED III Mass Balance</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                  Contract / Consignment Name
                </label>
                <input
                  type="text"
                  value={consignment.name}
                  onChange={e => setConsignment({ ...consignment, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-100 focus:border-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Feedstock
                  </label>
                  <select
                    value={consignment.feedstock}
                    onChange={e => handleFeedstockChange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none"
                  >
                    {Object.entries(FEEDSTOCK_REGISTRY).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Annex Classification
                  </label>
                  <div className="px-2 py-1.5 bg-stone-950 border border-stone-800 rounded text-teal-400 font-bold text-[11px]">
                    {consignment.annexClassification === 'IX_A' ? 'Annex IX Part A (Advanced)' :
                     consignment.annexClassification === 'IX_B' ? 'Annex IX Part B (Capped)' :
                     consignment.annexClassification === 'CROP' ? 'Crop (Capped)' : 'Other'}
                  </div>
                </div>
              </div>

              {/* Carbon Intensity Slider */}
              <div className="bg-stone-950 border border-stone-800 rounded p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">
                    Carbon Intensity (CI)
                  </span>
                  <span className="text-teal-300 font-bold text-xs bg-teal-950 border border-teal-800 px-2 py-0.5 rounded">
                    {consignment.carbonIntensity} gCO₂e/MJ
                  </span>
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

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-stone-900">
                  <div className="text-stone-400">
                    Factor: <strong className="text-stone-200">{tco2eFactor} tCO₂e/MWh</strong>
                  </div>
                  <div className="text-right text-stone-400">
                    GHG Saving: <strong className="text-teal-400">{ghgSavingPct}%</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Origin Country
                  </label>
                  <select
                    value={consignment.originCountry}
                    onChange={e => {
                      const val = e.target.value;
                      const isEU = EU_COUNTRY_CODES.includes(val);
                      const name = e.target.options[e.target.selectedIndex].text.split(' ')[1] || val;
                      setConsignment(prev => ({
                        ...prev,
                        originCountry: val,
                        originCountryName: name,
                        injectionCountry: val,
                        injectionIsEU: isEU,
                        udbStatus: isEU ? 'RECORDED' : 'NOT_RECORDED',
                        name: `${name} ${prev.feedstockName || 'Biomethane'}`,
                      }));
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none"
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
                    <option value="LT">🇱🇹 Lithuania (12 plants)</option>
                    <option value="HU">🇭🇺 Hungary (12 plants)</option>
                    <option value="CZ">🇨🇿 Czech Republic (10 plants)</option>
                    <option value="LV">🇱🇻 Latvia (10 plants)</option>
                    <option value="IE">🇮🇪 Ireland (10 plants)</option>
                    <option value="GR">🇬🇷 Greece (8 plants)</option>
                    <option value="RO">🇷🇴 Romania (6 plants)</option>
                    <option value="EE">🇪🇪 Estonia (4 plants)</option>
                    <option value="SK">🇸🇰 Slovakia (3 plants)</option>
                    <option value="LU">🇱🇺 Luxembourg (2 plants)</option>
                    <option value="HR">🇭🇷 Croatia (2 plants)</option>
                    <option value="BG">🇧🇬 Bulgaria (1 plant)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Injection Grid
                  </label>
                  <select
                    value={consignment.injectionCountry}
                    onChange={e => handleInjectionCountryChange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none"
                  >
                    <option value="DK">🇩🇰 EU Interconnected Grid (Denmark)</option>
                    <option value="DE">🇩🇪 EU Interconnected Grid (Germany)</option>
                    <option value="NL">🇳🇱 EU Interconnected Grid (Netherlands)</option>
                    <option value="FR">🇫🇷 EU Interconnected Grid (France)</option>
                    <option value="IT">🇮🇹 EU Interconnected Grid (Italy)</option>
                    <option value="ES">🇪🇸 EU Interconnected Grid (Spain)</option>
                    <option value="BE">🇧🇪 EU Interconnected Grid (Belgium)</option>
                    <option value="AT">🇦🇹 EU Interconnected Grid (Austria)</option>
                    <option value="SE">🇸🇪 EU Interconnected Grid (Sweden)</option>
                    <option value="FI">🇫🇮 EU Interconnected Grid (Finland)</option>
                    <option value="PL">🇵🇱 EU Interconnected Grid (Poland)</option>
                    <option value="CZ">🇨🇿 EU Interconnected Grid (Czechia)</option>
                    <option value="PT">🇵🇹 EU Interconnected Grid (Portugal)</option>
                    <option value="EE">🇪🇪 EU Interconnected Grid (Estonia)</option>
                    <option value="LV">🇱🇻 EU Interconnected Grid (Latvia)</option>
                    <option value="LT">🇱🇹 EU Interconnected Grid (Lithuania)</option>
                    <option value="GB">🇬🇧 Non-EU Isolated Grid (United Kingdom)</option>
                    <option value="CH">🇨🇭 Non-EU Grid (Switzerland)</option>
                    <option value="NO">🇳🇴 Non-EU Grid (Norway)</option>
                    <option value="UA">🇺🇦 Non-EU Grid (Ukraine)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Certification Scheme
                  </label>
                  <select
                    value={consignment.certificationScheme}
                    onChange={e => setConsignment({ ...consignment, certificationScheme: e.target.value as CertificationScheme })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none"
                  >
                    <option value="ISCC_EU">ISCC EU (RED III Compliance)</option>
                    <option value="REDCERT_EU">REDcert EU (RED III Compliance)</option>
                    <option value="2BSVS">2BSvs (RED III Compliance)</option>
                    <option value="KZR_INIG">KZR INiG (RED III Compliance)</option>
                    <option value="ISCC_PLUS">ISCC PLUS (Voluntary Only)</option>
                    <option value="REDCERT2">REDcert² (Chemical Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                    Chain of Custody
                  </label>
                  <select
                    value={consignment.chainOfCustody}
                    onChange={e => setConsignment({ ...consignment, chainOfCustody: e.target.value as ChainOfCustody })}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-stone-200 outline-none"
                  >
                    <option value="MASS_BALANCE">Mass Balance (Transport)</option>
                    <option value="SEGREGATION">Physical Segregation (Bio-LNG)</option>
                    <option value="BOOK_AND_CLAIM">Book-and-Claim (Voluntary)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">UDB Status</label>
                  <select
                    value={consignment.udbStatus}
                    onChange={e => setConsignment({ ...consignment, udbStatus: e.target.value as UDBStatus })}
                    className="w-full bg-stone-950 border border-stone-800 rounded p-1 text-[11px]"
                  >
                    <option value="RECORDED">Recorded</option>
                    <option value="PENDING">Pending</option>
                    <option value="NOT_RECORDED">Not Recorded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">PoS Status</label>
                  <select
                    value={consignment.posStatus}
                    onChange={e => setConsignment({ ...consignment, posStatus: e.target.value as PoSStatus })}
                    className="w-full bg-stone-950 border border-stone-800 rounded p-1 text-[11px]"
                  >
                    <option value="ISSUED">Issued</option>
                    <option value="PENDING">Pending</option>
                    <option value="NOT_AVAILABLE">Not Available</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Volume (MWh)</label>
                  <input
                    type="number"
                    value={consignment.volumeMWh || ''}
                    onChange={e => setConsignment({ ...consignment, volumeMWh: Number(e.target.value) || null })}
                    className="w-full bg-stone-950 border border-stone-800 rounded p-1 text-[11px]"
                    placeholder="10000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Target Market Selector Grid */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-xs font-bold text-stone-200 font-mono uppercase flex items-center gap-2">
                <span className="flex items-center justify-center w-4 h-4 rounded bg-teal-600 text-white text-[10px]">2</span>
                Target Compliance Market
              </h2>
              <span className="text-[10px] font-mono text-stone-500">14 Active Markets</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
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
                    className={`p-2.5 rounded border transition-all cursor-pointer font-mono ${
                      isSelected
                        ? 'border-teal-500 bg-teal-950/60 ring-1 ring-teal-500'
                        : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-bold text-xs text-stone-200">{m.country || 'EU'} {m.name}</div>
                      <StatusChip variant={quickElig.overallVerdict} size="xs" />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-500">
                      <span>{m.unitLabel}</span>
                      <span className="font-bold text-stone-200">
                        {quickNb.netNetback !== null ? `€${quickNb.netNetback.toFixed(2)}` : 'No mark'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cost Inputs Breakdown */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <span className="font-bold text-stone-200 text-xs uppercase block">Cost & Procurement Inputs</span>
                <span className="text-[10px] text-stone-400">Transit tariffs, certification, logistics & producer offtake</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700 text-sky-300 hover:bg-sky-900 text-[10px] font-bold transition-all flex items-center gap-1"
                  title="Compare Virtual Inter-Hub Swaps vs Physical PRISMA Pipeline Wheel tariffs"
                >
                  <Truck className="w-3 h-3 text-sky-400" />
                  Route Logistics & Tariffs
                </button>
                <button
                  onClick={() => dispatch({
                    type: 'SET_COSTS',
                    costs: {
                      transferCosts: 2.20,
                      certificationCosts: 0.45,
                      logistics: 1.35,
                      deliveredCost: 65.00,
                      otherCosts: null,
                    }
                  })}
                  className="px-2 py-0.5 rounded bg-teal-950/80 border border-teal-700 text-teal-300 hover:bg-teal-900 text-[10px] font-bold transition-all"
                  title="Auto-fill typical European cross-border freight, certification, and procurement benchmark costs"
                >
                  ✨ Auto-Fill Benchmarks
                </button>
                <button
                  onClick={() => dispatch({
                    type: 'SET_COSTS',
                    costs: {
                      transferCosts: null,
                      certificationCosts: null,
                      logistics: null,
                      deliveredCost: null,
                      otherCosts: null,
                    }
                  })}
                  className="px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-500 hover:text-stone-300 text-[10px] transition-all"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="block text-[9px] text-stone-400 uppercase mb-0.5">Transfer / Grid Tariffs (€/MWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={state.costs.transferCosts ?? ''}
                  onChange={e => dispatch({ type: 'SET_COSTS', costs: { transferCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  placeholder="e.g. 2.20"
                />
              </div>

              <div>
                <label className="block text-[9px] text-stone-400 uppercase mb-0.5">Certification & UDB (€/MWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={state.costs.certificationCosts ?? ''}
                  onChange={e => dispatch({ type: 'SET_COSTS', costs: { certificationCosts: e.target.value === '' ? null : Number(e.target.value) } })}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  placeholder="e.g. 0.45"
                />
              </div>

              <div>
                <label className="block text-[9px] text-stone-400 uppercase mb-0.5">Logistics / Compression (€/MWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={state.costs.logistics ?? ''}
                  onChange={e => dispatch({ type: 'SET_COSTS', costs: { logistics: e.target.value === '' ? null : Number(e.target.value) } })}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  placeholder="e.g. 1.35"
                />
              </div>

              <div>
                <label className="block text-[9px] text-stone-400 uppercase mb-0.5">Delivered Procurement Cost (€/MWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={state.costs.deliveredCost ?? ''}
                  onChange={e => dispatch({ type: 'SET_COSTS', costs: { deliveredCost: e.target.value === '' ? null : Number(e.target.value) } })}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 font-bold text-amber-300"
                  placeholder="e.g. 65.00"
                />
              </div>
            </div>

            {/* Quick Procurement Presets */}
            <div className="pt-1.5 border-t border-stone-800/80 flex items-center justify-between text-[10px]">
              <span className="text-stone-500 uppercase font-bold">Procurement Presets:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => dispatch({ type: 'SET_COSTS', costs: { deliveredCost: 58.00 } })}
                  className="px-1.5 py-0.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded text-stone-300"
                >
                  Agri €58
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_COSTS', costs: { deliveredCost: 65.00 } })}
                  className="px-1.5 py-0.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded text-stone-300"
                >
                  Manure €65
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_COSTS', costs: { deliveredCost: 74.00 } })}
                  className="px-1.5 py-0.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded text-stone-300"
                >
                  Spot €74
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: 3. Boss-Ready Trade Assessment Dossier */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-sm">
            
            {/* Dossier Top Bar */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-teal-400 font-bold">
                  <span>Trade Dossier & Route Clearance</span>
                  <span>•</span>
                  <span className="text-sky-400">{consignment.originCountryName || consignment.originCountry} ➔ {selectedMarket.country || 'EU-wide'}</span>
                </div>
                <h3 className="text-base font-bold text-white font-mono mt-0.5">
                  {selectedMarket.name} ({selectedMarket.registry || selectedMarket.countryName})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLogisticsOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold rounded border border-sky-700 bg-sky-950 text-sky-300 hover:bg-sky-900 transition-all shadow-xs"
                  title="Open Cross-Border Gas Logistics & Delivery Wheel Guide"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Flow Guide
                </button>
                <CopyButton text={summaryText} label="Copy Dossier" />
                <button
                  onClick={handleSaveToLibrary}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-semibold rounded border transition-all ${
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
            <div className="px-4 py-2.5 bg-stone-950/80 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <StatusChip variant={eligibility.overallVerdict} />
                <span className="text-stone-300 font-semibold">{eligibility.summary}</span>
              </div>
              <StaleIndicator updatedAt={markEntry?.updatedAt ?? null} />
            </div>

            <div className="p-4 space-y-6">
              
              {/* SECTION 1: Commercial Netback & Margin Economics (Prominently at top) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-300 font-mono uppercase tracking-wider flex items-center justify-between border-b border-stone-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    Commercial Netback Economics
                  </span>
                  <span className="text-[10px] text-stone-500 font-normal">Pricing Side: {netback.markSideUsed.toUpperCase()}</span>
                </h4>

                <div className="bg-stone-950 border border-stone-800 rounded-lg p-4 font-mono text-xs space-y-4">
                  
                  {/* Top Key Metrics Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-stone-900/90 rounded border border-stone-800">
                    <div>
                      <div className="text-[9px] uppercase font-bold text-stone-400">Net Netback</div>
                      <div className="text-lg font-bold text-teal-300 mt-0.5">
                        {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : 'No active mark'}
                      </div>
                      <div className="text-[9px] text-stone-500">Molecule + Certificate − Tariffs</div>
                    </div>

                    <div>
                      <div className="text-[9px] uppercase font-bold text-stone-400">Certificate Value</div>
                      <div className="text-lg font-bold text-emerald-400 mt-0.5">
                        {netback.certificateValue?.valueEurPerMWh !== null && netback.certificateValue?.valueEurPerMWh !== undefined
                          ? `€${netback.certificateValue.valueEurPerMWh.toFixed(2)}/MWh`
                          : '—'}
                      </div>
                      <div className="text-[9px] text-stone-500">{netback.certificateValue?.unitConversion || 'Compliance Premium'}</div>
                    </div>

                    <div>
                      <div className="text-[9px] uppercase font-bold text-stone-400">Implied Desk Margin</div>
                      <div className={`text-lg font-bold mt-0.5 ${
                        netback.impliedMargin !== null && netback.impliedMargin > 0 ? 'text-emerald-400' :
                        netback.impliedMargin !== null && netback.impliedMargin < 0 ? 'text-red-400' : 'text-stone-400'
                      }`}>
                        {netback.impliedMargin !== null ? `€${netback.impliedMargin.toFixed(2)}/MWh` : 'Set procurement cost'}
                      </div>
                      <div className="text-[9px] text-stone-500">Netback − Delivered Cost</div>
                    </div>
                  </div>

                  {/* Unset Costs Helper Banner */}
                  {(state.costs.deliveredCost === null || state.costs.transferCosts === null) && (
                    <div className="bg-sky-950/40 border border-sky-800/80 rounded p-2.5 text-[11px] text-sky-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span>💡 <strong>Incomplete Cost Inputs:</strong> Grid tariffs & delivered procurement costs are currently €0.00/MWh. Auto-fill market benchmarks to see complete net margins and trade P&L.</span>
                      <button
                        onClick={() => dispatch({
                          type: 'SET_COSTS',
                          costs: {
                            transferCosts: 2.20,
                            certificationCosts: 0.45,
                            logistics: 1.35,
                            deliveredCost: 65.00,
                            otherCosts: null,
                          }
                        })}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded text-[10px] whitespace-nowrap transition-all shadow-xs"
                      >
                        Auto-Fill Benchmarks
                      </button>
                    </div>
                  )}

                  {/* Carbon Intensity Factor */}
                  <div className="flex justify-between items-center bg-stone-900 border border-stone-800 p-2.5 rounded text-[11px]">
                    <span className="text-stone-400">GHG Saving & Carbon Factor:</span>
                    <span className="text-teal-300 font-bold">
                      {ghgSavingPct}% saving ({consignment.carbonIntensity} gCO₂e/MJ) = {tco2eFactor} tCO₂e/MWh
                    </span>
                  </div>

                  {/* German Double Counting Sensitivity Branches */}
                  {netback.uncertaintyBranches && (
                    <div className="bg-stone-900/90 border border-sky-900/70 p-3 rounded space-y-2">
                      <div className="text-[11px] font-bold text-sky-300 flex justify-between">
                        <span>German THG Double Counting Dual Branches (§37a BImSchG):</span>
                        <span className="text-[9px] text-sky-400 bg-sky-950 border border-sky-800 px-1.5 py-0.5 rounded font-bold">Unresolved</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 bg-stone-950 rounded border border-stone-800">
                          <div className="text-stone-400 text-[10px]">Without Double Counting (1×):</div>
                          <div className="text-sm font-bold text-white mt-0.5">
                            €{netback.uncertaintyBranches[0].certificateValue.valueEurPerMWh?.toFixed(2)}/MWh
                          </div>
                          <div className="text-emerald-400 text-[10px] mt-0.5">
                            Netback: €{netback.uncertaintyBranches[0].netNetback?.toFixed(2)}/MWh
                          </div>
                        </div>

                        <div className="p-2.5 bg-stone-950 rounded border border-teal-900">
                          <div className="text-teal-400 text-[10px]">With Double Counting (2×):</div>
                          <div className="text-sm font-bold text-teal-300 mt-0.5">
                            €{netback.uncertaintyBranches[1].certificateValue.valueEurPerMWh?.toFixed(2)}/MWh
                          </div>
                          <div className="text-emerald-400 text-[10px] mt-0.5">
                            Netback: €{netback.uncertaintyBranches[1].netNetback?.toFixed(2)}/MWh
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Line Items */}
                  <div className="space-y-1.5 text-xs pt-1 border-t border-stone-800/80">
                    <div className="flex justify-between text-stone-400">
                      <span>Gas Molecule Benchmark (TTF):</span>
                      <span className="text-stone-200 font-bold">
                        {netback.moleculeValue !== null ? `+€${netback.moleculeValue.toFixed(2)}/MWh` : 'Not set'}
                      </span>
                    </div>

                    <div className="flex justify-between text-stone-400">
                      <span>Transfer Tariffs / Cross-Border Grid:</span>
                      <span className="text-stone-200">
                        {state.costs.transferCosts !== null ? `−€${state.costs.transferCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                      </span>
                    </div>

                    <div className="flex justify-between text-stone-400">
                      <span>Certification, Audit & UDB Recording:</span>
                      <span className="text-stone-200">
                        {state.costs.certificationCosts !== null ? `−€${state.costs.certificationCosts.toFixed(2)}/MWh` : '€0.00/MWh'}
                      </span>
                    </div>

                    <div className="flex justify-between text-stone-400">
                      <span>Logistics / Conditioning:</span>
                      <span className="text-stone-200">
                        {state.costs.logistics !== null ? `−€${state.costs.logistics.toFixed(2)}/MWh` : '€0.00/MWh'}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-stone-800 pt-2 text-sm font-bold">
                      <span className="text-white">NET NETBACK VALUE:</span>
                      <span className="text-teal-400">
                        {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : 'No active mark'}
                      </span>
                    </div>

                    {consignment.volumeMWh && netback.totalPnL !== null && (
                      <div className="flex justify-between border-t border-stone-800 pt-1.5 text-xs font-bold text-emerald-400">
                        <span>Total Trade Gross P&L ({consignment.volumeMWh.toLocaleString()} MWh):</span>
                        <span>€{netback.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Regulatory Compliance Gate Audit */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-300 font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-800 pb-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  Regulatory Validation Checklist (RED III & National Transpositions)
                </h4>

                <div className="space-y-2">
                  {eligibility.gates.map((gate, idx) => (
                    <div key={idx} className="border border-stone-800 rounded-lg p-3 bg-stone-950/60 space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-stone-500 font-bold">0{idx + 1}</span>
                          <span className="font-bold text-stone-200 text-xs">{gate.gateLabel}</span>
                        </div>
                        <StatusChip variant={gate.verdict} size="xs" />
                      </div>

                      <p className="text-[11px] text-stone-400 leading-relaxed">{gate.reason}</p>

                      {gate.remedy && (
                        <div className="bg-amber-950/40 border border-amber-800/80 rounded p-2 text-[11px] text-amber-300">
                          <strong>Remedy:</strong> {gate.remedy}
                        </div>
                      )}

                      {gate.citations.length > 0 && (
                        <div className="pt-1">
                          {gate.citations.map((cit, cIdx) => (
                            <CitationBlock key={cIdx} citation={cit} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Trader Commentary Notes */}
              <div className="pt-2 border-t border-stone-800">
                <label className="block text-[10px] font-bold text-stone-400 uppercase font-mono mb-1">
                  Trader Commentary & Dossier Notes
                </label>
                <textarea
                  rows={2}
                  value={userNotes}
                  onChange={e => setUserNotes(e.target.value)}
                  placeholder="e.g. Counterparty confirms physical injection at entry point. PoS audit certificate expected on 15th."
                  className="w-full bg-stone-950 border border-stone-800 rounded p-2.5 text-xs font-mono text-stone-200 outline-none focus:border-teal-500"
                />
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Cross-Border Gas Logistics & Delivery Wheel Guide Modal */}
      <LogisticsModal
        originCountry={consignment.originCountry}
        targetCountry={selectedMarket.country || 'ES'}
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
      />
    </div>
  );
}
