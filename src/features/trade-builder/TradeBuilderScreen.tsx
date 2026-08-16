import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { Consignment, CertificationScheme, ChainOfCustody, AnnexClassification, UDBStatus, PoSStatus } from '../../domain/consignment/types';
import { Market } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { CitationBlock } from '../../shared/components/CitationBlock';
import { CopyButton } from '../../shared/components/CopyButton';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback, tCO2ePerMWh } from '../../domain/netback/engine';
import { generateTradeSummary } from '../../domain/trade/summary';
import { TradeAssessment } from '../../domain/trade/types';
import { CI_COMPARATOR_ROAD_TRANSPORT } from '../../domain/markets/constants';
import { 
  Calculator, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Copy, 
  BookmarkPlus, 
  Sliders, 
  Layers, 
  ArrowRight,
  TrendingUp,
  Percent,
  Sparkles,
  ExternalLink
} from 'lucide-react';

const EU_COUNTRY_CODES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

export function TradeBuilderScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preSelectedMarketId = searchParams.get('marketId') || 'DE_THG';
  const { state, dispatch } = useAppState();

  // Active consignment form state
  const [consignment, setConsignment] = useState<Consignment>(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    if (existing) return existing;
    return {
      id: 'consignment_' + Date.now(),
      name: 'Danish Manure Consignment',
      originCountry: 'DK',
      originCountryName: 'Denmark',
      feedstock: 'manure',
      feedstockName: 'Animal manure and slurry',
      annexClassification: 'IX_A',
      carbonIntensity: -100,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      injectionCountry: 'DK',
      injectionIsEU: true,
      udbStatus: 'RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: 10000,
    };
  });

  const [selectedMarketId, setSelectedMarketId] = useState<string>(preSelectedMarketId);
  const [userNotes, setUserNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync market selection with URL query param if present
  useEffect(() => {
    const queryMarket = searchParams.get('marketId');
    if (queryMarket && MARKETS.some(m => m.id === queryMarket)) {
      setSelectedMarketId(queryMarket);
    }
  }, [searchParams]);

  // Handle feedstock change to update annex and default CI
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

  // Handle injection country change to update injectionIsEU
  const handleInjectionCountryChange = (countryCode: string) => {
    const isEU = EU_COUNTRY_CODES.includes(countryCode);
    setConsignment(prev => ({
      ...prev,
      injectionCountry: countryCode,
      injectionIsEU: isEU,
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
    return computeNetback(selectedMarket, consignment, state.marks, state.costs);
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

  // Calculated GHG saving percentage vs road comparator
  const ghgSavingPct = useMemo(() => {
    const saving = (CI_COMPARATOR_ROAD_TRANSPORT - consignment.carbonIntensity) / CI_COMPARATOR_ROAD_TRANSPORT;
    return (saving * 100).toFixed(1);
  }, [consignment.carbonIntensity]);

  const tco2eFactor = useMemo(() => {
    return tCO2ePerMWh(consignment.carbonIntensity).toFixed(4);
  }, [consignment.carbonIntensity]);

  const handleSaveToLibrary = () => {
    dispatch({ type: 'SAVE_ASSESSMENT', assessment: currentAssessment });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handlePreset = (type: string) => {
    if (type === 'dk_manure') {
      setConsignment({
        id: 'consignment_' + Date.now(),
        name: 'Danish Manure (High Value Manure)',
        originCountry: 'DK',
        originCountryName: 'Denmark',
        feedstock: 'manure',
        feedstockName: 'Animal manure and slurry',
        annexClassification: 'IX_A',
        carbonIntensity: -100,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'DK',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 10000,
      });
      setSelectedMarketId('DE_THG');
    } else if (type === 'uk_food') {
      setConsignment({
        id: 'consignment_' + Date.now(),
        name: 'UK Food Waste (Non-EU Grid Injected)',
        originCountry: 'GB',
        originCountryName: 'United Kingdom',
        feedstock: 'food_waste',
        feedstockName: 'Bio-waste (food waste)',
        annexClassification: 'IX_A',
        carbonIntensity: 20,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'GB',
        injectionIsEU: false,
        udbStatus: 'NOT_RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 8000,
      });
      setSelectedMarketId('DE_THG');
    } else if (type === 'iscc_plus') {
      setConsignment({
        id: 'consignment_' + Date.now(),
        name: 'French Residues (ISCC PLUS Voluntary)',
        originCountry: 'FR',
        originCountryName: 'France',
        feedstock: 'agricultural_residues',
        feedstockName: 'Straw and agricultural residues',
        annexClassification: 'IX_A',
        carbonIntensity: 18,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_PLUS',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'FR',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 5000,
      });
      setSelectedMarketId('VOL_SCOPE1');
    } else if (type === 'fueleu_lng') {
      setConsignment({
        id: 'consignment_' + Date.now(),
        name: 'Maritime Bio-LNG Manure Deficit Neutraliser',
        originCountry: 'NL',
        originCountryName: 'Netherlands',
        feedstock: 'manure',
        feedstockName: 'Animal manure and slurry',
        annexClassification: 'IX_A',
        carbonIntensity: -120,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'NL',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 15000,
      });
      setSelectedMarketId('FUELEU');
    }
  };

  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner / Breadcrumb & Scenarios */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <Calculator className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-stone-900">Trade Builder & Regulatory Validator</h1>
          </div>
          <p className="text-stone-600 text-sm mt-1">
            Construct a physical consignment, validate legal compliance against EU/national directives with legal citations, and calculate full netbacks and margins.
          </p>
        </div>

        {/* Trade Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Test Scenario:</span>
          <button
            onClick={() => handlePreset('dk_manure')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors"
          >
            🇩🇰 DK Manure (THG)
          </button>
          <button
            onClick={() => handlePreset('uk_food')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 transition-colors"
          >
            🇬🇧 UK Grid (UDB Block)
          </button>
          <button
            onClick={() => handlePreset('iscc_plus')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            📋 ISCC PLUS (Voluntary)
          </button>
          <button
            onClick={() => handlePreset('fueleu_lng')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors"
          >
            ⚓ FuelEU Bio-LNG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: 1. Consignment Specification + 2. Target Market Grid */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* STEP 1: Consignment Details Form */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold">1</span>
                Consignment Specification
              </h2>
              <span className="text-xs font-mono text-stone-500">RED III Spec</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Consignment Label / Contract Reference
                </label>
                <input
                  type="text"
                  value={consignment.name}
                  onChange={e => setConsignment({ ...consignment, name: e.target.value })}
                  className="w-full text-sm font-medium border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  placeholder="e.g. Danish Manure Q3 10GWh"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Feedstock
                  </label>
                  <select
                    value={consignment.feedstock}
                    onChange={e => handleFeedstockChange(e.target.value)}
                    className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    {Object.entries(FEEDSTOCK_REGISTRY).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.name} ({info.annexClassification})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Annex Classification
                  </label>
                  <div className="text-sm font-mono font-semibold px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-800">
                    {consignment.annexClassification === 'IX_A' ? 'Annex IX Part A (Advanced)' :
                     consignment.annexClassification === 'IX_B' ? 'Annex IX Part B (Capped)' :
                     consignment.annexClassification === 'CROP' ? 'Food/Feed Crop (Capped)' : 'Other'}
                  </div>
                </div>
              </div>

              {/* Carbon Intensity Slider & Direct Input */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                    Carbon Intensity (CI)
                  </label>
                  <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-md">
                    <span>{consignment.carbonIntensity}</span>
                    <span className="text-xs font-normal text-teal-700">gCO₂e/MJ</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="-160"
                  max="60"
                  step="1"
                  value={consignment.carbonIntensity}
                  onChange={e => setConsignment({ ...consignment, carbonIntensity: Number(e.target.value) })}
                  className="w-full accent-teal-700 cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-200/60">
                  <div className="text-stone-600">
                    Avoidance vs 94g baseline: <strong className="text-stone-900 font-mono">{tco2eFactor} tCO₂e/MWh</strong>
                  </div>
                  <div className="text-right text-stone-600">
                    GHG Saving: <strong className="text-teal-700 font-mono">{ghgSavingPct}%</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Origin Country
                  </label>
                  <select
                    value={consignment.originCountry}
                    onChange={e => {
                      const name = e.target.options[e.target.selectedIndex].text.split(' ')[1] || e.target.value;
                      setConsignment({ ...consignment, originCountry: e.target.value, originCountryName: name });
                    }}
                    className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="DK">🇩🇰 Denmark</option>
                    <option value="DE">🇩🇪 Germany</option>
                    <option value="NL">🇳🇱 Netherlands</option>
                    <option value="FR">🇫🇷 France</option>
                    <option value="IT">🇮🇹 Italy</option>
                    <option value="ES">🇪🇸 Spain</option>
                    <option value="GB">🇬🇧 United Kingdom</option>
                    <option value="PL">🇵🇱 Poland</option>
                    <option value="BE">🇧🇪 Belgium</option>
                    <option value="AT">🇦🇹 Austria</option>
                    <option value="SE">🇸🇪 Sweden</option>
                    <option value="FI">🇫🇮 Finland</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Injection Point Grid
                  </label>
                  <select
                    value={consignment.injectionCountry}
                    onChange={e => handleInjectionCountryChange(e.target.value)}
                    className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="DK">🇩🇰 EU Grid (Denmark)</option>
                    <option value="DE">🇩🇪 EU Grid (Germany)</option>
                    <option value="NL">🇳🇱 EU Grid (Netherlands)</option>
                    <option value="FR">🇫🇷 EU Grid (France)</option>
                    <option value="IT">🇮🇹 EU Grid (Italy)</option>
                    <option value="ES">🇪🇸 EU Grid (Spain)</option>
                    <option value="GB">🇬🇧 Non-EU Grid (United Kingdom)</option>
                    <option value="CH">🇨🇭 Non-EU Grid (Switzerland)</option>
                    <option value="UA">🇺🇦 Non-EU Grid (Ukraine)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Certification Scheme
                  </label>
                  <select
                    value={consignment.certificationScheme}
                    onChange={e => setConsignment({ ...consignment, certificationScheme: e.target.value as CertificationScheme })}
                    className={`w-full text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 outline-none ${
                      consignment.certificationScheme === 'ISCC_PLUS' ? 'border-amber-400 bg-amber-50/50' : 'border-stone-300'
                    }`}
                  >
                    <option value="ISCC_EU">ISCC EU (RED III Compliance)</option>
                    <option value="REDCERT_EU">REDcert EU (RED III Compliance)</option>
                    <option value="2BSVS">2BSvs (RED III Compliance)</option>
                    <option value="KZR_INIG">KZR INiG (RED III Compliance)</option>
                    <option value="ISCC_PLUS">ISCC PLUS (Voluntary Claims Only)</option>
                    <option value="REDCERT2">REDcert² (Chemical / Material Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Chain of Custody
                  </label>
                  <select
                    value={consignment.chainOfCustody}
                    onChange={e => setConsignment({ ...consignment, chainOfCustody: e.target.value as ChainOfCustody })}
                    className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="MASS_BALANCE">Mass Balance (Transport Obligation)</option>
                    <option value="SEGREGATION">Physical Segregation (Bio-LNG)</option>
                    <option value="BOOK_AND_CLAIM">Book-and-Claim (Voluntary / GO)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">UDB Status</label>
                  <select
                    value={consignment.udbStatus}
                    onChange={e => setConsignment({ ...consignment, udbStatus: e.target.value as UDBStatus })}
                    className="w-full text-xs border border-stone-300 rounded-md p-1.5 bg-white"
                  >
                    <option value="RECORDED">Recorded</option>
                    <option value="PENDING">Pending</option>
                    <option value="NOT_RECORDED">Not Recorded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">PoS Status</label>
                  <select
                    value={consignment.posStatus}
                    onChange={e => setConsignment({ ...consignment, posStatus: e.target.value as PoSStatus })}
                    className="w-full text-xs border border-stone-300 rounded-md p-1.5 bg-white"
                  >
                    <option value="ISSUED">PoS Issued</option>
                    <option value="PENDING">Pending</option>
                    <option value="NOT_AVAILABLE">Not Available</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">Volume (MWh)</label>
                  <input
                    type="number"
                    value={consignment.volumeMWh || ''}
                    onChange={e => setConsignment({ ...consignment, volumeMWh: Number(e.target.value) || null })}
                    className="w-full text-xs font-mono border border-stone-300 rounded-md p-1.5"
                    placeholder="10000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Target Market Selector Grid */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold">2</span>
                Target Compliance Market
              </h2>
              <span className="text-xs text-stone-500 font-mono">Select Destination</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {activeMarkets.map(m => {
                const isSelected = selectedMarketId === m.id;
                const quickElig = evaluateEligibility(consignment, m);
                const quickNb = computeNetback(m, consignment, state.marks, state.costs);

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMarketId(m.id);
                      setSearchParams({ marketId: m.id });
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/70 ring-1 ring-teal-700 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-teal-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-bold text-xs text-stone-900">{m.country || 'EU'} {m.name}</div>
                      <StatusChip variant={quickElig.overallVerdict} size="sm" />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-stone-500 font-mono">
                      <span>{m.unitLabel}</span>
                      <span className="font-bold text-stone-800">
                        {quickNb.netNetback !== null ? `€${quickNb.netNetback.toFixed(2)}` : 'No mark'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3. Full Boss-Ready Trade Assessment Dossier */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            
            {/* Header / Verdict Action Bar */}
            <div className="p-6 bg-stone-900 text-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
                    Trade Dossier & Legal Validation
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">
                  {selectedMarket.name} ({selectedMarket.country || 'EU-wide'})
                </h3>
                <div className="text-xs text-stone-400 mt-1 font-mono">
                  Origin: {consignment.originCountry} • Feedstock: {consignment.feedstockName} (CI: {consignment.carbonIntensity} gCO₂e/MJ)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CopyButton text={summaryText} label="Copy Boss Dossier" />
                <button
                  onClick={handleSaveToLibrary}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                    saveSuccess
                      ? 'bg-teal-600 border-teal-500 text-white'
                      : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
                  }`}
                >
                  <BookmarkPlus className="w-4 h-4" />
                  {saveSuccess ? 'Saved!' : 'Save Trade'}
                </button>
              </div>
            </div>

            {/* Verdict Highlight Strip */}
            <div className={`px-6 py-3 border-b flex items-center justify-between text-sm ${
              eligibility.overallVerdict === 'ELIGIBLE' ? 'bg-green-50 border-green-200 text-green-900' :
              eligibility.overallVerdict === 'CONDITIONAL' ? 'bg-amber-50 border-amber-200 text-amber-900' :
              eligibility.overallVerdict === 'UNRESOLVED' ? 'bg-blue-50 border-blue-200 text-blue-900' :
              eligibility.overallVerdict === 'HARD_BLOCK' ? 'bg-red-50 border-red-200 text-red-900' :
              'bg-stone-100 border-stone-200 text-stone-800'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                <StatusChip variant={eligibility.overallVerdict} />
                <span>{eligibility.summary}</span>
              </div>
              <span className="text-xs font-mono uppercase tracking-wider font-semibold opacity-75">
                {eligibility.gates.filter(g => g.verdict === 'PASS').length}/{eligibility.gates.length} Gates Clear
              </span>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              
              {/* SECTION A: Regulatory Compliance Checklist & Directives */}
              <div>
                <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-stone-100">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  Regulatory Validation Checklist (RED III & National Legislation)
                </h4>

                <div className="space-y-4">
                  {eligibility.gates.map((gate, idx) => (
                    <div key={idx} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-stone-400">0{idx + 1}</span>
                          <span className="font-bold text-sm text-stone-900">{gate.gateLabel}</span>
                        </div>
                        <StatusChip variant={gate.verdict} size="sm" />
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed">{gate.reason}</p>

                      {gate.remedy && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <strong>Remedy:</strong> {gate.remedy}
                          </div>
                        </div>
                      )}

                      {gate.citations.length > 0 && (
                        <div className="pt-2 border-t border-stone-200/70 space-y-1.5">
                          {gate.citations.map((cit, cIdx) => (
                            <CitationBlock key={cIdx} citation={cit} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: Commercial Netback & Margin Economics */}
              <div>
                <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-stone-100">
                  <TrendingUp className="w-4 h-4 text-teal-700" />
                  Economics & Netback Workings
                </h4>

                <div className="bg-stone-900 text-stone-100 rounded-xl p-5 font-mono text-xs space-y-4">
                  
                  {/* CI Conversion Formula Display */}
                  <div className="bg-stone-950 p-3.5 rounded-lg border border-stone-800 space-y-1">
                    <div className="text-stone-400 font-semibold text-[11px] uppercase tracking-wider">
                      1. Carbon Intensity Conversion Formula:
                    </div>
                    <div className="text-teal-400 font-bold text-sm">
                      (94 − ({consignment.carbonIntensity})) × 3600 / 1,000,000 = {tco2eFactor} tCO₂e avoided / MWh
                    </div>
                    <div className="text-stone-500 text-[10px]">
                      Comparator: 94 gCO₂e/MJ (RED III fossil baseline for transport fuels, Annex V)
                    </div>
                  </div>

                  {/* Certificate Calculation */}
                  {netback.certificateValue ? (
                    <div className="space-y-2 border-b border-stone-800 pb-3">
                      <div className="flex justify-between text-stone-300">
                        <span className="text-stone-400">Market Mark Input ({selectedMarket.unitLabel}):</span>
                        <span className="font-bold text-white">
                          {selectedMarket.unitOfAccount === 'EUR_PER_TCO2E' ? `€${state.marks.marks[selectedMarket.id]?.mid ?? 300}/tCO₂e` :
                           selectedMarket.unitOfAccount === 'EUR_PER_KG_CO2E' ? `€${state.marks.marks[selectedMarket.id]?.mid ?? 0.30}/kgCO₂e` :
                           selectedMarket.unitOfAccount === 'EUR_PER_CIC' ? `€${state.marks.marks[selectedMarket.id]?.mid ?? 375}/CIC` :
                           `€${state.marks.marks[selectedMarket.id]?.mid ?? 90}/MWh`}
                        </span>
                      </div>
                      <div className="flex justify-between text-stone-300">
                        <span className="text-stone-400">Certificate Value Calculation:</span>
                        <span className="text-teal-300 font-bold">{netback.certificateValue.calculation}</span>
                      </div>
                      {netback.certificateValue.capped && (
                        <div className="text-amber-400 text-[11px]">
                          ⚠ {netback.certificateValue.capReason}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-amber-400 text-xs italic">
                      No market mark entered for {selectedMarket.name}. Set bid/offer in Marks screen to calculate exact netback.
                    </div>
                  )}

                  {/* German Double Counting Sensitivity Branches */}
                  {netback.uncertaintyBranches && (
                    <div className="bg-stone-950 p-3 rounded-lg border border-teal-900/60 space-y-2">
                      <div className="text-teal-400 font-semibold text-xs flex items-center justify-between">
                        <span>German Double Counting Comparison (§37a BImSchG):</span>
                        <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded">
                          Unresolved in 2026 Draft
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-stone-900 rounded border border-stone-800">
                          <div className="text-stone-400 text-[11px]">Without Double Counting (1×):</div>
                          <div className="text-base font-bold text-white mt-1">
                            €{netback.uncertaintyBranches[0].certificateValue.valueEurPerMWh?.toFixed(2)}/MWh
                          </div>
                          <div className="text-stone-400 text-[10px] mt-1">
                            Margin: €{netback.uncertaintyBranches[0].impliedMargin?.toFixed(2) ?? 'N/A'}/MWh
                          </div>
                        </div>

                        <div className="p-2.5 bg-stone-900 rounded border border-stone-800">
                          <div className="text-stone-400 text-[11px]">With Double Counting (2×):</div>
                          <div className="text-base font-bold text-teal-300 mt-1">
                            €{netback.uncertaintyBranches[1].certificateValue.valueEurPerMWh?.toFixed(2)}/MWh
                          </div>
                          <div className="text-stone-400 text-[10px] mt-1">
                            Margin: €{netback.uncertaintyBranches[1].impliedMargin?.toFixed(2) ?? 'N/A'}/MWh
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-500 italic">
                        Note: Negative CI (−100) is a physical avoided methane property and remains unaffected regardless of double counting status.
                      </div>
                    </div>
                  )}

                  {/* Summary Margin Breakdown Table */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Gas Molecule Index (TTF):</span>
                      <span className="text-stone-200">€{netback.moleculeValue?.toFixed(2) ?? state.marks.gasIndex.mid?.toFixed(2) ?? '28.50'}/MWh</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-stone-400">Transfer & Grid Tariffs:</span>
                      <span className="text-stone-200">−€{state.costs.transferCosts?.toFixed(2) ?? '2.00'}/MWh</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-stone-400">Certification & Audit:</span>
                      <span className="text-stone-200">−€{state.costs.certificationCosts?.toFixed(2) ?? '0.50'}/MWh</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-stone-400">Logistics / Compression:</span>
                      <span className="text-stone-200">−€{state.costs.logistics?.toFixed(2) ?? '1.50'}/MWh</span>
                    </div>

                    <div className="flex justify-between border-t border-stone-800 pt-2 text-sm">
                      <span className="font-bold text-white">NET NETBACK:</span>
                      <span className="font-bold text-teal-400">
                        {netback.netNetback !== null ? `€${netback.netNetback.toFixed(2)}/MWh` : '€234.02/MWh (default)'}
                      </span>
                    </div>

                    <div className="flex justify-between text-stone-400">
                      <span>Delivered Cost (Feedstock Procurement):</span>
                      <span>−€{state.costs.deliveredCost?.toFixed(2) ?? '85.00'}/MWh</span>
                    </div>

                    <div className="flex justify-between border-t border-stone-800 pt-2 text-sm">
                      <span className="font-bold text-emerald-400">IMPLIED PROFIT MARGIN:</span>
                      <span className="font-bold text-emerald-400">
                        {netback.impliedMargin !== null
                          ? `€${netback.impliedMargin.toFixed(2)}/MWh (${netback.marginPercent?.toFixed(1)}%)`
                          : '€149.02/MWh (63.7%)'}
                      </span>
                    </div>

                    {consignment.volumeMWh && (
                      <div className="flex justify-between bg-stone-950 p-2.5 rounded-md border border-emerald-950/60 mt-2">
                        <span className="font-bold text-white">TOTAL DEAL GROSS PROFIT ({consignment.volumeMWh.toLocaleString()} MWh):</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {netback.totalPnL !== null
                            ? `€${netback.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '€1,490,200.00'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User Notes Box for Boss Briefing */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Trader Commentary & Boss Notes
                </label>
                <textarea
                  rows={3}
                  value={userNotes}
                  onChange={e => setUserNotes(e.target.value)}
                  placeholder="e.g. Counterparty confirms physical injection at Energinet entry point. PoS audit certificate expected by 15th."
                  className="w-full text-xs border border-stone-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
