import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SourcedOpportunity, getCountryFlag } from './PlantScannerTable';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Search, 
  MapPin, 
  Check, 
  Sparkles,
  Layers,
  Zap,
  Flame,
  ArrowUpDown,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface Step2PlantScanProps {
  opportunities: SourcedOpportunity[];
  selectedOpp: SourcedOpportunity | null;
  onSelectOpp: (opp: SourcedOpportunity) => void;
  onBack: () => void;
  onNext: () => void;
}

export type PlantSortOption = 'MARGIN_DESC' | 'PRICE_ASC' | 'CAPACITY_DESC' | 'DISTANCE_ASC';

export function Step2PlantScan({
  opportunities,
  selectedOpp,
  onSelectOpp,
  onBack,
  onNext
}: Step2PlantScanProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<PlantSortOption>('MARGIN_DESC');

  // Extract unique countries from available opportunities
  const availableCountries = useMemo(() => {
    const map = new Map<string, { code: string; name: string; flag: string; count: number }>();
    opportunities.forEach(opp => {
      const code = opp.originCountry.toUpperCase();
      const existing = map.get(code);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(code, {
          code,
          name: opp.originCountryName || opp.originCountry,
          flag: opp.originFlag || getCountryFlag(code),
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [opportunities]);

  // Filter opportunities
  const filteredOpps = useMemo(() => {
    return opportunities.filter(opp => {
      // Country filter
      if (selectedCountry !== 'ALL' && opp.originCountry.toUpperCase() !== selectedCountry.toUpperCase()) {
        return false;
      }
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = (opp.originPlantName || '').toLowerCase().includes(term);
        const matchesCountry = (opp.originCountryName || '').toLowerCase().includes(term) || opp.originCountry.toLowerCase().includes(term);
        const matchesFeedstock = (opp.feedstockName || '').toLowerCase().includes(term);
        const matchesOperator = (opp.legalEntityName || opp.networkOperator || '').toLowerCase().includes(term);
        if (!matchesName && !matchesCountry && !matchesFeedstock && !matchesOperator) {
          return false;
        }
      }
      return true;
    });
  }, [opportunities, selectedCountry, searchTerm]);

  // Sort filtered opportunities
  const sortedOpps = useMemo(() => {
    return [...filteredOpps].sort((a, b) => {
      if (sortBy === 'MARGIN_DESC') {
        return (b.deskNetMarginEurPerMWh ?? 0) - (a.deskNetMarginEurPerMWh ?? 0);
      }
      if (sortBy === 'PRICE_ASC') {
        return (a.producerPayableEurPerMWh ?? 0) - (b.producerPayableEurPerMWh ?? 0);
      }
      if (sortBy === 'CAPACITY_DESC') {
        return (b.plantAnnualGWh ?? 0) - (a.plantAnnualGWh ?? 0);
      }
      if (sortBy === 'DISTANCE_ASC') {
        return (a.logisticsDistanceKm ?? 0) - (b.logisticsDistanceKm ?? 0);
      }
      return 0;
    });
  }, [filteredOpps, sortBy]);

  const handleQuickTrade = (opp: SourcedOpportunity, e: React.MouseEvent) => {
    e.stopPropagation();
    const plantVolume = opp.plantAnnualGWh ? Math.round(opp.plantAnnualGWh * 1000) : undefined;
    navigate(buildDealUrl({
      marketId: opp.targetMarketId,
      originCountry: opp.originCountry,
      feedstock: opp.feedstockKey,
      ci: opp.carbonIntensity,
      volume: plantVolume,
      plantId: opp.originPlantId,
      plantName: opp.originPlantName,
      plantCapacityNm3h: opp.plantCapacityNm3h ?? undefined,
      plantAnnualGWh: opp.plantAnnualGWh ?? undefined,
      legalEntityName: opp.legalEntityName ?? undefined,
      networkOperator: opp.networkOperator ?? undefined,
      counterparty: opp.legalEntityName || opp.originPlantName || 'European Biomethane Producer',
    }));
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Step Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-xs font-semibold mb-3">
          Step 2 of 4: Physical Supply Origination
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mb-2.5">
          Select Source Biomethane Facility
        </h1>
        <p className="text-base text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto font-normal">
          Scanned 1,975+ European plants. Filter by origin country, inspect verified capacity and gate prices, and select a production asset:
        </p>
      </div>

      {/* Country Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCountry('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedCountry === 'ALL'
              ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-stone-950 shadow-xs font-bold'
              : 'bg-white dark:bg-[#0e1118] text-slate-700 dark:text-zinc-400 border border-slate-200 dark:border-[#1e2433] hover:border-slate-300 dark:hover:border-[#2b3347] hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <span>All Origins</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${selectedCountry === 'ALL' ? 'bg-white/20 dark:bg-black/20 text-white dark:text-stone-950' : 'bg-slate-100 dark:bg-[#141824] text-slate-600 dark:text-zinc-400'}`}>
            {opportunities.length}
          </span>
        </button>

        {availableCountries.map(c => (
          <button
            key={c.code}
            type="button"
            onClick={() => setSelectedCountry(c.code)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCountry === c.code
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-stone-950 shadow-xs font-bold'
                : 'bg-white dark:bg-[#0e1118] text-slate-700 dark:text-zinc-400 border border-slate-200 dark:border-[#1e2433] hover:border-slate-300 dark:hover:border-[#2b3347] hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <span>{c.flag} {c.code}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${selectedCountry === c.code ? 'bg-white/20 dark:bg-black/20 text-white dark:text-stone-950' : 'bg-slate-100 dark:bg-[#141824] text-slate-600 dark:text-zinc-400'}`}>
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Sort Control Bar */}
      <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xs dark:shadow-md">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
            {sortedOpps.length} Facilities Available
          </span>
          {selectedCountry !== 'ALL' && (
            <span className="text-xs bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 px-2 py-0.5 rounded-md font-semibold">
              Filter: {selectedCountry}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search plant, operator, city..."
              className="bg-slate-50 dark:bg-[#08090d] border border-slate-300 dark:border-[#2b3347] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 w-56 sm:w-68"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#08090d] border border-slate-300 dark:border-[#2b3347] rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as PlantSortOption)}
              className="bg-transparent text-xs font-medium text-slate-800 dark:text-zinc-300 focus:outline-hidden cursor-pointer"
            >
              <option value="MARGIN_DESC" className="bg-white dark:bg-[#08090d] text-slate-900 dark:text-zinc-100">Max Deal Margin</option>
              <option value="PRICE_ASC" className="bg-white dark:bg-[#08090d] text-slate-900 dark:text-zinc-100">Lowest Gate Price</option>
              <option value="CAPACITY_DESC" className="bg-white dark:bg-[#08090d] text-slate-900 dark:text-zinc-100">Largest Capacity (GWh)</option>
              <option value="DISTANCE_ASC" className="bg-white dark:bg-[#08090d] text-slate-900 dark:text-zinc-100">Shortest Distance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plant Grid / List */}
      <div className="space-y-3 mb-6 max-h-[550px] overflow-y-auto pr-1">
        {sortedOpps.length === 0 ? (
          <div className="bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-[#1e2433] rounded-2xl p-10 text-center text-slate-500 dark:text-zinc-500 text-sm">
            <Building2 className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
            No plants matched the current filter. Try selecting another origin country or clearing search.
          </div>
        ) : (
          sortedOpps.map(opp => {
            const isSelected = selectedOpp?.id === opp.id;
            const plantGatePrice = opp.producerPayableEurPerMWh ?? 0;
            const netMargin = opp.deskNetMarginEurPerMWh ?? 0;
            const isProfitable = netMargin > 0;

            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpp(opp)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-cyan-50/90 dark:bg-cyan-950/40 border-cyan-500 dark:border-cyan-500/60 ring-1 ring-cyan-500/50 shadow-md'
                    : 'bg-white dark:bg-[#0e1118] border-slate-200 dark:border-[#1e2433] hover:border-slate-300 dark:hover:border-[#2b3347] hover:bg-slate-50 dark:hover:bg-[#141824]'
                }`}
              >
                {/* Left: Plant Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#08090d] border border-slate-200 dark:border-[#1e2433] flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                    {opp.originFlag || getCountryFlag(opp.originCountry)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                        {opp.originPlantName || `${opp.originCountry} Biomethane Facility`}
                      </h3>
                      {opp.isDirectPlantSource && (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 px-2 py-0.5 rounded-md font-semibold">
                          VERIFIED ASSET
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 px-2 py-0.5 rounded-md font-semibold">
                        <ShieldCheck className="w-3 h-3" />
                        RED III Pass
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-zinc-400 flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-slate-800 dark:text-zinc-300 font-semibold">{opp.originCountryName} ({opp.originCountry})</span>
                      <span className="text-slate-400 dark:text-zinc-600">•</span>
                      <span className="text-slate-700 dark:text-zinc-300">{opp.feedstockName}</span>
                      <span className="text-slate-400 dark:text-zinc-600">•</span>
                      <span className="text-cyan-700 dark:text-cyan-400 font-semibold">CI: {opp.carbonIntensity} gCO₂e/MJ</span>
                      {opp.plantAnnualGWh ? (
                        <>
                          <span className="text-slate-400 dark:text-zinc-600">•</span>
                          <span className="text-amber-600 dark:text-amber-300 font-semibold">{opp.plantAnnualGWh} GWh/yr</span>
                        </>
                      ) : null}
                      {opp.logisticsDistanceKm ? (
                        <>
                          <span className="text-slate-400 dark:text-zinc-600">•</span>
                          <span className="text-slate-500 dark:text-zinc-400">{Math.round(opp.logisticsDistanceKm)} km transit</span>
                        </>
                      ) : null}
                    </div>

                    {opp.legalEntityName && (
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        Operator: <span className="text-slate-700 dark:text-zinc-300 font-medium">{opp.legalEntityName}</span>
                        {opp.networkOperator ? ` · Grid: ${opp.networkOperator}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Pricing, Trade Builder Shortcut & Select */}
                <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-[#1e2433] shrink-0">
                  {/* Gate Price */}
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-400 font-semibold tracking-wider block">
                      Plant Gate
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100">
                      €{plantGatePrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 ml-0.5">/MWh</span>
                  </div>

                  {/* Estimated Margin */}
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-400 font-semibold tracking-wider block">
                      Est. Spread
                    </span>
                    <span className={`text-sm font-bold font-mono ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isProfitable ? '+' : ''}€{netMargin.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 ml-0.5">/MWh</span>
                  </div>

                  {/* Quick Direct Trade Action */}
                  <button
                    type="button"
                    onClick={(e) => handleQuickTrade(opp, e)}
                    title="Structure immediately in Trade Builder"
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-cyan-600 hover:text-white dark:bg-[#08090d] dark:hover:bg-cyan-500 dark:hover:text-stone-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 transition-all cursor-pointer hidden sm:flex items-center justify-center"
                  >
                    <Zap className="w-4 h-4" />
                  </button>

                  {/* Radio / Selection Indicator */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-cyan-600 border-cyan-600 text-white dark:bg-cyan-500 dark:border-teal-400 dark:text-stone-950'
                      : 'border-slate-300 dark:border-[#2b3347] bg-slate-50 dark:bg-[#08090d]'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-200 dark:border-[#1e2433]">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 rounded-xl bg-white dark:bg-[#0e1118] hover:bg-slate-50 dark:hover:bg-[#141824] border border-slate-200 dark:border-[#2b3347] text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit Order</span>
        </button>

        <button
          type="button"
          disabled={!selectedOpp}
          onClick={onNext}
          className={`px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md flex items-center gap-2 ${
            selectedOpp
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-stone-950 cursor-pointer hover:shadow-lg'
              : 'bg-slate-200 dark:bg-[#141824] text-slate-400 dark:text-zinc-500 cursor-not-allowed'
          }`}
        >
          <span>Plan Route &amp; Calculate Costs</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
