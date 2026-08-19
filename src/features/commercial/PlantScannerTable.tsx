import React, { useState } from 'react';
import { ArbitrageOpportunity } from '../../domain/arbitrage/types';
import { BiomethanePlant } from '../../domain/plants/types';
import { 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  Search,
  Navigation,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';

export interface SourcedOpportunity extends ArbitrageOpportunity {
  originPlantName?: string;
  originPlantCoords?: [number, number] | null;
  isDirectPlantSource?: boolean;
  logisticsDistanceKm?: number;
  deliveryMode?: string;
}

interface PlantScannerTableProps {
  opportunities: SourcedOpportunity[];
  matchedPlants: BiomethanePlant[];
  selectedOpp: SourcedOpportunity | null;
  onSelectOpp: (opp: SourcedOpportunity) => void;
  isLoading?: boolean;
}

export function PlantScannerTable({
  opportunities,
  matchedPlants,
  selectedOpp,
  onSelectOpp,
  isLoading = false
}: PlantScannerTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'MARGIN' | 'COST' | 'DISTANCE'>('MARGIN');

  // Filter opportunities by search term (country, plant, feedstock, market)
  const filteredOpps = opportunities.filter(opp => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      opp.originCountry.toLowerCase().includes(term) ||
      opp.targetCountry.toLowerCase().includes(term) ||
      opp.feedstockName.toLowerCase().includes(term) ||
      opp.targetMarketName.toLowerCase().includes(term) ||
      (opp.originPlantName && opp.originPlantName.toLowerCase().includes(term))
    );
  });

  // Sort opportunities
  const sortedOpps = [...filteredOpps].sort((a, b) => {
    const marginA = a.deskNetMarginEurPerMWh ?? 0;
    const marginB = b.deskNetMarginEurPerMWh ?? 0;
    const costA = (a.producerPayableEurPerMWh ?? 0) + (a.transitCostEurPerMWh ?? 0);
    const costB = (b.producerPayableEurPerMWh ?? 0) + (b.transitCostEurPerMWh ?? 0);
    const distA = a.logisticsDistanceKm ?? 0;
    const distB = b.logisticsDistanceKm ?? 0;

    if (sortBy === 'MARGIN') {
      return marginB - marginA;
    }
    if (sortBy === 'COST') {
      return costA - costB;
    }
    if (sortBy === 'DISTANCE') {
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-xl flex flex-col h-full overflow-hidden shadow-xl backdrop-blur-md">
      {/* Header with Search and Sorting */}
      <div className="p-3.5 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-3 bg-stone-950/80">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-teal-950/90 border border-teal-700/80 flex items-center justify-center text-teal-400">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-200">
            Sourced Plants &amp; Corridors
          </span>
          <span className="font-mono text-[10px] bg-teal-950/90 text-teal-300 border border-teal-800/80 px-2 py-0.5 rounded-full font-bold">
            {sortedOpps.length} Matched Routes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search plant, country, feedstock..."
              className="bg-stone-950 border border-stone-700/80 rounded-lg pl-8 pr-3 py-1 font-mono text-[11px] text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-teal-500 w-52 transition-colors"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setSortBy('MARGIN')}
              className={`px-2.5 py-1 font-mono text-[10px] rounded-md font-bold transition-colors cursor-pointer ${
                sortBy === 'MARGIN' ? 'bg-teal-600 text-stone-950 shadow-xs' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Highest Margin
            </button>
            <button
              type="button"
              onClick={() => setSortBy('COST')}
              className={`px-2.5 py-1 font-mono text-[10px] rounded-md font-bold transition-colors cursor-pointer ${
                sortBy === 'COST' ? 'bg-teal-600 text-stone-950 shadow-xs' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Lowest Cost
            </button>
          </div>
        </div>
      </div>

      {/* Sourced Opportunities List / Table */}
      <div className="flex-1 overflow-y-auto divide-y divide-stone-800/60 p-2 space-y-1.5">
        {sortedOpps.length === 0 ? (
          <div className="py-16 text-center text-stone-500 font-mono text-xs">
            <Building2 className="w-8 h-8 text-stone-600 mx-auto mb-2" />
            <p className="font-semibold text-stone-400">No Matching Sourcing Corridors Found</p>
            <p className="text-stone-500 text-[11px] mt-1">Try adjusting feedstock substrate, destination market, or max CI constraints above.</p>
          </div>
        ) : (
          sortedOpps.map(opp => {
            const isSelected = selectedOpp?.id === opp.id;
            const marginEur = opp.deskNetMarginEurPerMWh ?? 0;
            const gatePriceEur = opp.producerPayableEurPerMWh ?? 0;
            const transitEur = opp.transitCostEurPerMWh ?? 0;
            const deliveredCostEur = gatePriceEur + transitEur + 1.20;

            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpp(opp)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-teal-950/30 border-teal-500/80 shadow-lg ring-1 ring-teal-500/50'
                    : 'bg-stone-950/60 border-stone-800/70 hover:bg-stone-900/80 hover:border-stone-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Plant & Corridor Details */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-100 truncate">
                        {opp.originPlantName}
                      </span>
                      <span className="font-mono text-[10px] bg-stone-900 text-stone-300 border border-stone-700/80 px-1.5 py-0.2 rounded font-bold shrink-0">
                        {opp.originCountry}
                      </span>
                      <span className="text-stone-600 text-xs">➔</span>
                      <span className="font-mono text-[10px] bg-stone-900 text-teal-300 border border-teal-800/80 px-1.5 py-0.2 rounded font-bold shrink-0">
                        {opp.targetMarketName} ({opp.targetCountry})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-stone-400 flex-wrap">
                      <span>Feedstock: <strong className="text-stone-200">{opp.feedstockName}</strong></span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        opp.carbonIntensity <= 0 ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/80' : 'text-stone-300'
                      }`}>
                        CI: {opp.carbonIntensity > 0 ? `+${opp.carbonIntensity}` : opp.carbonIntensity} gCO₂e/MJ
                      </span>
                      <span>·</span>
                      {opp.targetMarketId === 'UK_RGGO' || opp.targetMarketId.includes('_GO') || opp.targetMarketId === 'VOL_SCOPE1' ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          GHG Protocol / GO Validated
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-teal-400 font-semibold bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-800/60">
                          <CheckCircle2 className="w-3 h-3 text-teal-400" />
                          RED III Quota Pass
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Pricing Stack & Margin */}
                  <div className="flex items-center gap-4 shrink-0 text-right font-mono">
                    {/* Plant Gate Sourcing Price */}
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                        Plant Gate Sourcing
                      </span>
                      <span className="text-xs font-bold text-stone-200">
                        €{gatePriceEur.toFixed(2)} <span className="text-[10px] font-normal text-stone-500">/ MWh</span>
                      </span>
                      <span className="text-[10px] text-stone-500 block">
                        Delivered: €{deliveredCostEur.toFixed(2)}
                      </span>
                    </div>

                    {/* Net Margin Spread */}
                    <div className="pl-3 border-l border-stone-800">
                      <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                        Net Deal Margin
                      </span>
                      <span className={`text-sm font-bold block ${
                        marginEur > 0 ? 'text-emerald-400' : 'text-stone-400'
                      }`}>
                        {marginEur > 0 ? '+' : ''}€{marginEur.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        spread / MWh
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
