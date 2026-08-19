import React, { useState } from 'react';
import { SourcedOpportunity } from './PlantScannerTable';
import { 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Search, 
  MapPin, 
  Check, 
  Sparkles,
  Layers
} from 'lucide-react';

interface Step2PlantScanProps {
  opportunities: SourcedOpportunity[];
  selectedOpp: SourcedOpportunity | null;
  onSelectOpp: (opp: SourcedOpportunity) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step2PlantScan({
  opportunities,
  selectedOpp,
  onSelectOpp,
  onBack,
  onNext
}: Step2PlantScanProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOpps = opportunities.filter(opp => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      opp.originCountry.toLowerCase().includes(term) ||
      opp.feedstockName.toLowerCase().includes(term) ||
      opp.originCountryName.toLowerCase().includes(term) ||
      (opp.originPlantName && opp.originPlantName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800 text-teal-300 font-mono text-xs font-semibold mb-3">
          Step 2 of 4: Plant Sourcing Scan
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-100 mb-2 font-sans">
          Select Source Biomethane Facility
        </h1>
        <p className="text-sm text-stone-400 font-mono max-w-xl mx-auto">
          We scanned 1,975+ European plants. Select the facility you want to source the biomethane from:
        </p>
      </div>

      {/* Filter and Count Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-teal-400" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-200">
            {filteredOpps.length} Matching Facilities Found
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter by facility name, country, feedstock..."
            className="bg-stone-950 border border-stone-700 rounded-lg pl-9 pr-3 py-1.5 font-mono text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-teal-500 w-72"
          />
        </div>
      </div>

      {/* Plant Grid / List */}
      <div className="space-y-3 mb-6">
        {filteredOpps.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 text-center text-stone-500 font-mono text-xs">
            No plants matched the current filter. Try searching for a different country or term.
          </div>
        ) : (
          filteredOpps.map(opp => {
            const isSelected = selectedOpp?.id === opp.id;
            const plantGatePrice = opp.producerPayableEurPerMWh ?? 0;
            const netMargin = opp.deskNetMarginEurPerMWh ?? 0;

            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpp(opp)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-teal-950/40 border-teal-500 ring-1 ring-teal-500/50 shadow-lg'
                    : 'bg-stone-900/90 border-stone-800 hover:border-stone-700 hover:bg-stone-850'
                }`}
              >
                {/* Left: Plant Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-xl shrink-0">
                    {opp.originFlag || '🏭'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-stone-100 text-sm">
                        {opp.originPlantName || `${opp.originCountry} Biomethane Plant`}
                      </h3>
                      {opp.isDirectPlantSource && (
                        <span className="font-mono text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                          VERIFIED PRODUCER
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.2 rounded">
                        <ShieldCheck className="w-3 h-3" />
                        RED III Pass
                      </span>
                    </div>

                    <div className="font-mono text-xs text-stone-400 flex items-center gap-2 mt-1">
                      <span>{opp.originCountryName} ({opp.originCountry})</span>
                      <span className="text-stone-600">•</span>
                      <span className="text-stone-300">{opp.feedstockName}</span>
                      <span className="text-stone-600">•</span>
                      <span className="text-teal-400 font-semibold">{opp.carbonIntensity} gCO₂e/MJ</span>
                    </div>
                  </div>
                </div>

                {/* Right: Pricing & Select */}
                <div className="flex items-center gap-5 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone-800">
                  {/* Gate Price */}
                  <div className="text-left md:text-right font-mono">
                    <span className="text-[10px] uppercase text-stone-500 tracking-wider block">
                      Plant Gate Price
                    </span>
                    <span className="text-base font-bold text-stone-100">
                      €{plantGatePrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-stone-400 ml-0.5">/MWh</span>
                  </div>

                  {/* Estimated Margin */}
                  <div className="text-left md:text-right font-mono">
                    <span className="text-[10px] uppercase text-stone-500 tracking-wider block">
                      Est. Spread
                    </span>
                    <span className={`text-base font-bold ${netMargin > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {netMargin > 0 ? '+' : ''}€{netMargin.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-stone-400 ml-0.5">/MWh</span>
                  </div>

                  {/* Radio / Selection Indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-teal-500 border-teal-400 text-stone-950'
                      : 'border-stone-700 bg-stone-950'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-800">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit Order</span>
        </button>

        <button
          type="button"
          disabled={!selectedOpp}
          onClick={onNext}
          className={`px-7 py-3 rounded-lg font-mono text-sm font-bold tracking-wide transition-all shadow-lg flex items-center gap-2 ${
            selectedOpp
              ? 'bg-teal-600 hover:bg-teal-500 text-stone-950 cursor-pointer shadow-teal-950/40'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          <span>Plan Route &amp; Calculate Costs</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
