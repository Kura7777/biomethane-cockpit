import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SourcedOpportunity, getCountryFlag } from './PlantScannerTable';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { defaultVolumeMwh } from '../../domain/trade/dealDefaults';
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
    const plantVolume = opp.plantAnnualGWh ? Math.round(opp.plantAnnualGWh * 1000) : defaultVolumeMwh();
    navigate(buildDealUrl({
      marketId: opp.targetMarketId,
      originCountry: opp.originCountry,
      feedstock: opp.feedstockKey,
      ci: opp.carbonIntensity,
      ciIsEstimated: true,
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
    <div className="cf-step max-w-5xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="mb-5">
        <div
          style={{
            borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--color-track)',
            borderColor: 'var(--color-line)',
            color: 'var(--color-text)',
          }}
          className="cf-pill inline-flex items-center gap-2 px-3 py-1 border text-xs font-medium mb-2.5"
        >
          <span style={{ backgroundColor: 'var(--color-accent)' }} className="w-2 h-2 rounded-full" />
          Step 2 of 4: Physical supply origination
        </div>
        <h1 style={{ color: 'var(--color-text)' }} className="text-xl sm:text-2xl font-semibold mb-1.5">
          Select source biomethane facility
        </h1>
        <p style={{ color: 'var(--color-muted)' }} className="text-xs sm:text-sm font-normal max-w-2xl">
          Scanned 1,975+ European plants. Filter by origin country, inspect verified capacity and gate prices, and select a production asset:
        </p>
      </div>

      {/* Country Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3.5 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCountry('ALL')}
          style={{
            borderRadius: 'var(--radius-control)',
            backgroundColor: selectedCountry === 'ALL' ? 'var(--color-text)' : 'var(--color-surface)',
            color: selectedCountry === 'ALL' ? 'var(--color-bg)' : 'var(--color-text)',
            borderColor: 'var(--color-line)',
          }}
          className="cf-country-chip px-3 py-1.5 border text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <span>All origins</span>
          <span
            style={{
              borderRadius: 'var(--radius-control)',
              backgroundColor: selectedCountry === 'ALL' ? 'rgba(255,255,255,0.2)' : 'var(--color-track)',
              color: selectedCountry === 'ALL' ? 'inherit' : 'var(--color-muted)',
            }}
            className="px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          >
            {opportunities.length}
          </span>
        </button>

        {availableCountries.map(c => (
          <button
            key={c.code}
            type="button"
            onClick={() => setSelectedCountry(c.code)}
            style={{
              borderRadius: 'var(--radius-control)',
              backgroundColor: selectedCountry === c.code ? 'var(--color-text)' : 'var(--color-surface)',
              color: selectedCountry === c.code ? 'var(--color-bg)' : 'var(--color-text)',
              borderColor: 'var(--color-line)',
            }}
            className="cf-country-chip px-3 py-1.5 border text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>{c.flag} {c.code}</span>
            <span
              style={{
                borderRadius: 'var(--radius-control)',
                backgroundColor: selectedCountry === c.code ? 'rgba(255,255,255,0.2)' : 'var(--color-track)',
                color: selectedCountry === c.code ? 'inherit' : 'var(--color-muted)',
              }}
              className="px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
            >
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Sort Control Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
        }}
        className="cf-filterbar border p-3.5 mb-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">
            {sortedOpps.length} facilities available
          </span>
          {selectedCountry !== 'ALL' && (
            <span
              style={{
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'var(--color-track)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-text)',
              }}
              className="text-xs border px-2 py-0.5 font-medium"
            >
              Filter: {selectedCountry}
            </span>
          )}
        </div>

        <div className="cf-filter-controls flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="cf-search relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: 'var(--color-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search plant, operator, city..."
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
                color: 'var(--color-text)',
              }}
              className="border pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-hidden w-52 sm:w-64"
            />
          </div>

          {/* Sort Selector */}
          <div
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-control)',
            }}
            className="cf-sort flex items-center gap-1.5 border px-2.5 py-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as PlantSortOption)}
              style={{ color: 'var(--color-text)' }}
              className="bg-transparent text-xs font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="MARGIN_DESC">Max deal margin</option>
              <option value="PRICE_ASC">Lowest gate price</option>
              <option value="CAPACITY_DESC">Largest capacity (GWh)</option>
              <option value="DISTANCE_ASC">Shortest distance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plant Grid / List */}
      <div className="space-y-2.5 mb-5 max-h-[550px] overflow-y-auto pr-1 max-md:max-h-none max-md:overflow-visible max-md:pr-0">
        {sortedOpps.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-card)',
              color: 'var(--color-muted)',
            }}
            className="border p-8 text-center text-xs"
          >
            <Building2 className="w-7 h-7 mx-auto mb-2 opacity-50" />
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
                style={{
                  backgroundColor: isSelected ? 'var(--color-selected-row, rgba(31, 95, 173, 0.08))' : 'var(--color-surface)',
                  borderColor: isSelected ? 'var(--color-pnl-pos)' : 'var(--color-line)',
                  borderRadius: 'var(--radius-card)',
                }}
                className="p-3.5 border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs hover:border-[var(--color-muted)]"
              >
                {/* Left: Plant Info */}
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      borderRadius: 'var(--radius-control)',
                      backgroundColor: 'var(--color-bg)',
                      borderColor: 'var(--color-line)',
                    }}
                    className="w-10 h-10 border flex items-center justify-center text-xl shrink-0"
                  >
                    {opp.originFlag || getCountryFlag(opp.originCountry)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 style={{ color: 'var(--color-text)' }} className="font-semibold text-xs sm:text-sm">
                        {opp.originPlantName || `${opp.originCountry} Biomethane Facility`}
                      </h3>
                      {opp.isDirectPlantSource && (
                        <span
                          style={{
                            borderRadius: 'var(--radius-control)',
                            backgroundColor: 'var(--color-status-pass-bg)',
                            borderColor: 'var(--color-status-pass-border)',
                            color: 'var(--color-status-pass-ink)',
                          }}
                          className="text-[10px] border px-1.5 py-0.5 font-medium"
                        >
                          Verified asset
                        </span>
                      )}
                      <span
                        style={{
                          borderRadius: 'var(--radius-control)',
                          backgroundColor: 'var(--color-status-pass-bg)',
                          borderColor: 'var(--color-status-pass-border)',
                          color: 'var(--color-status-pass-ink)',
                        }}
                        className="inline-flex items-center gap-1 text-[10px] border px-1.5 py-0.5 font-medium"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        RED III pass
                      </span>
                    </div>

                    <div style={{ color: 'var(--color-muted)' }} className="text-[11px] flex items-center gap-2 flex-wrap mt-1">
                      <span style={{ color: 'var(--color-text)' }} className="font-medium">{opp.originCountryName} ({opp.originCountry})</span>
                      <span>•</span>
                      <span>{opp.feedstockName}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--color-text)' }} className="font-medium">CI: {opp.carbonIntensity} gCO₂e/MJ</span>
                      {opp.plantAnnualGWh ? (
                        <>
                          <span>•</span>
                          <span className="font-medium tabular-nums">{opp.plantAnnualGWh} GWh/yr</span>
                        </>
                      ) : null}
                      {opp.logisticsDistanceKm ? (
                        <>
                          <span>•</span>
                          <span className="tabular-nums">{Math.round(opp.logisticsDistanceKm)} km transit</span>
                        </>
                      ) : null}
                    </div>

                    {opp.legalEntityName && (
                      <div style={{ color: 'var(--color-muted)' }} className="text-[11px] mt-0.5">
                        Operator: <span style={{ color: 'var(--color-text)' }} className="font-medium">{opp.legalEntityName}</span>
                        {opp.networkOperator ? ` · Grid: ${opp.networkOperator}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Pricing, Trade Builder Shortcut & Select */}
                <div
                  style={{ borderColor: 'var(--color-line)' }}
                  className="flex items-center gap-3.5 justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 shrink-0"
                >
                  {/* Gate Price */}
                  <div className="text-left md:text-right">
                    <span style={{ color: 'var(--color-muted)' }} className="text-[10px] block">
                      Plant gate
                    </span>
                    <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold tabular-nums">
                      €{plantGatePrice.toFixed(2)}
                    </span>
                    <span style={{ color: 'var(--color-muted)' }} className="text-[10px] ml-0.5">/MWh</span>
                  </div>

                  {/* Estimated Margin - blue for positive, red for negative */}
                  <div className="text-left md:text-right">
                    <span style={{ color: 'var(--color-muted)' }} className="text-[10px] block">
                      Est. spread
                    </span>
                    <span
                      style={{ color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)' }}
                      className="text-xs font-bold tabular-nums"
                    >
                      {isProfitable ? '+' : ''}€{netMargin.toFixed(2)}
                    </span>
                    <span style={{ color: 'var(--color-muted)' }} className="text-[10px] ml-0.5">/MWh</span>
                  </div>

                  {/* Quick Direct Trade Action */}
                  <button
                    type="button"
                    onClick={(e) => handleQuickTrade(opp, e)}
                    title="Structure immediately in Trade Builder"
                    style={{
                      borderRadius: 'var(--radius-control)',
                      backgroundColor: 'var(--color-track)',
                      borderColor: 'var(--color-line)',
                      color: 'var(--color-text)',
                    }}
                    className="p-2 border transition-all cursor-pointer cf-quick hidden sm:flex max-md:flex items-center justify-center hover:opacity-80"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>

                  {/* Radio / Selection Indicator */}
                  <div
                    style={{
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'var(--color-pnl-pos)' : 'var(--color-bg)',
                      borderColor: isSelected ? 'var(--color-pnl-pos)' : 'var(--color-line)',
                      color: '#ffffff',
                    }}
                    className="w-6 h-6 flex items-center justify-center border transition-all"
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Navigation Buttons */}
      <div
        style={{ borderColor: 'var(--color-line)' }}
        className="m-sticky-actions cf-actions flex items-center justify-between pt-4 border-t"
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--color-text)',
          }}
          className="px-4 py-2 border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-track)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Edit order</span>
        </button>

        <button
          type="button"
          disabled={!selectedOpp}
          onClick={onNext}
          style={{
            backgroundColor: selectedOpp ? 'var(--color-accent)' : 'var(--color-track)',
            borderRadius: 'var(--radius-control)',
            color: selectedOpp ? '#ffffff' : 'var(--color-muted)',
            cursor: selectedOpp ? 'pointer' : 'not-allowed',
          }}
          className="px-6 py-2.5 text-xs font-semibold transition-all shadow-xs flex items-center gap-2 hover:opacity-90"
        >
          <span>Plan route &amp; calculate costs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
