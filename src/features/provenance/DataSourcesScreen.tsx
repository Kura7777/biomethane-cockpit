import React, { useState, useMemo } from 'react';
import { 
  DATA_SOURCES_DIRECTORY, 
  DataSourceCategory, 
  DataSourceRecord, 
  ProvenanceTier,
  getDataSourcesByCategory 
} from '../../domain/provenance/dataSourcesDirectory';
import { 
  Database, 
  Building2, 
  Leaf, 
  TrendingUp, 
  Truck, 
  FileText, 
  ShieldCheck, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  SlidersHorizontal,
  FileSpreadsheet,
  Clock,
  Landmark
} from 'lucide-react';

export function DataSourcesScreen() {
  const [selectedCategory, setSelectedCategory] = useState<DataSourceCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DataSourceRecord | null>(null);

  // Filter datasets
  const filteredDatasets = useMemo(() => {
    return DATA_SOURCES_DIRECTORY.filter(d => {
      const matchCategory = selectedCategory === 'ALL' || d.category === selectedCategory;
      if (!matchCategory) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        d.name.toLowerCase().includes(term) ||
        d.authority.toLowerCase().includes(term) ||
        (d.legalBasis && d.legalBasis.toLowerCase().includes(term)) ||
        d.description.toLowerCase().includes(term) ||
        d.sourceDocumentOrUrl.toLowerCase().includes(term)
      );
    });
  }, [selectedCategory, searchTerm]);

  const getTierBadge = (tier: ProvenanceTier) => {
    switch (tier) {
      case 'STATUTORY_DIRECTIVE':
        return (
          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-800/80 flex items-center gap-1">
            <Landmark className="w-3 h-3" />
            Statutory EU/National Law
          </span>
        );
      case 'TSO_OFFICIAL_DATA':
        return (
          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-teal-950/90 text-teal-300 border border-teal-800/80 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            TSO / Official Operator Register
          </span>
        );
      case 'INDUSTRY_BODY_CENSUS':
        return (
          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-blue-950/90 text-blue-300 border border-blue-800/80 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Industry Census (GIE / EBA)
          </span>
        );
      case 'BROKER_REPORTED_QUOTE':
        return (
          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-purple-950/90 text-purple-300 border border-purple-800/80 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Broker Consensus &amp; PRA Marks
          </span>
        );
      case 'BUYER_SPECIFIED_RFQ':
        return (
          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Buyer Specified Parameter
          </span>
        );
      case 'MODELLED_ENGINEERING':
        return (
          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-stone-800 text-stone-300 border border-stone-700 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            Modelled Pipeline Algorithm
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-stone-950 text-stone-100 font-sans">
      {/* 1. Header & Scorecard Banner */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-stone-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950/90 border border-teal-700/80 flex items-center justify-center text-teal-400 shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-mono text-base md:text-lg font-bold text-stone-100 flex items-center gap-2">
                <span>Data Sources &amp; Institutional Provenance Directory</span>
                <span className="font-mono text-[10px] bg-teal-950/90 text-teal-300 border border-teal-800/80 px-2 py-0.5 rounded-full font-semibold">
                  100% Attributed
                </span>
              </h1>
              <p className="font-mono text-xs text-stone-400 mt-0.5">
                Every calculation, registry rule, commodity price, and plant location is cross-referenced against statutory EU law and transmission operator registers.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search dataset, law, or TSO..."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-3 py-2 font-mono text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-teal-500 transition-colors shadow-inner"
            />
          </div>
        </div>

        {/* Institutional Data Completeness Scorecard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
          <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="font-mono text-[10px] uppercase font-semibold">Operational Plants</span>
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="font-mono text-lg font-bold text-stone-100">1,975+</div>
            <div className="font-mono text-[10px] text-teal-400/90 truncate">GIE / EBA 2026 Map &amp; TSOs</div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="font-mono text-[10px] uppercase font-semibold">Feedstock Baselines</span>
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-mono text-lg font-bold text-stone-100">30+ Pathways</div>
            <div className="font-mono text-[10px] text-emerald-400/90 truncate">RED III Annex V &amp; IX</div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="font-mono text-[10px] uppercase font-semibold">Market Benchmarks</span>
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="font-mono text-lg font-bold text-stone-100">30 Markets</div>
            <div className="font-mono text-[10px] text-purple-400/90 truncate">Broker Sheets &amp; Argus Media</div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="font-mono text-[10px] uppercase font-semibold">Pipeline Topology</span>
              <Truck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="font-mono text-lg font-bold text-stone-100">560+ IP Nodes</div>
            <div className="font-mono text-[10px] text-blue-400/90 truncate">ENTSOG Transparency &amp; TSOs</div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="font-mono text-[10px] uppercase font-semibold">Statutory Registries</span>
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-mono text-lg font-bold text-stone-100">15+ Authorities</div>
            <div className="font-mono text-[10px] text-amber-400/90 truncate">EU UDB, dena, VertiCer, EEX</div>
          </div>
        </div>
      </div>

      {/* 2. Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'All Datasets' },
          { key: 'PLANTS_INFRASTRUCTURE', label: '🏭 Plants & Infrastructure' },
          { key: 'FEEDSTOCKS_CARBON_INTENSITY', label: '🌾 Feedstocks & Carbon Intensity' },
          { key: 'MARKET_PRICING_BENCHMARKS', label: '💹 Market Pricing & Marks' },
          { key: 'LOGISTICS_INTERCONNECTORS', label: '🚚 Logistics & Pipeline Tariffs' },
          { key: 'REGISTRIES_MASS_BALANCE', label: '🏛️ Registries & Mass Balance' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedCategory(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedCategory === tab.key
                ? 'bg-teal-600 text-stone-950 shadow-md ring-1 ring-teal-400/50'
                : 'bg-stone-900/90 hover:bg-stone-800 text-stone-300 border border-stone-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Detailed Dataset Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDatasets.map(record => (
          <div
            key={record.id}
            className="bg-stone-900/80 border border-stone-800 hover:border-stone-700/90 rounded-xl p-4 flex flex-col justify-between space-y-3.5 transition-all shadow-lg hover:shadow-xl"
          >
            {/* Header: Title, Authority, & Tier Badge */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-mono text-sm font-bold text-stone-100">
                    {record.name}
                  </h3>
                  <p className="font-mono text-[11px] text-teal-400 font-medium">
                    {record.authority}
                  </p>
                </div>
                {getTierBadge(record.provenanceTier)}
              </div>

              <p className="text-xs text-stone-300 leading-relaxed font-sans mt-1">
                {record.description}
              </p>
            </div>

            {/* Legal Basis & Source Document */}
            <div className="bg-stone-950/80 border border-stone-800/80 rounded-lg p-3 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-stone-500 shrink-0">Source Document:</span>
                <span className="text-stone-200 text-right font-medium truncate max-w-[280px]">
                  {record.sourceDocumentOrUrl}
                </span>
              </div>
              {record.legalBasis && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-stone-500 shrink-0">Statutory Legal Basis:</span>
                  <span className="text-amber-300/90 text-right font-medium">
                    {record.legalBasis}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/60">
                <span className="text-stone-500">Update Frequency:</span>
                <span className="text-stone-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-400" />
                  {record.updateFrequency}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-stone-500">Coverage:</span>
                <span className="text-teal-300 font-bold">
                  {record.coverageCount}
                </span>
              </div>
            </div>

            {/* Provided Fields & Transparency Breakdown */}
            <div className="space-y-2">
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-stone-400 block mb-1">
                  Verified Data Fields:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {record.fieldsProvided.map((field, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-[10px] bg-stone-950 text-stone-300 border border-stone-800 px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-teal-400" />
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              {record.fieldsUnverified && record.fieldsUnverified.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-amber-400/90 block mb-1">
                    Unverified / Trade-Specific Attributes:
                  </span>
                  <div className="space-y-1">
                    {record.fieldsUnverified.map((unv, idx) => (
                      <div
                        key={idx}
                        className="font-mono text-[10px] bg-amber-950/30 text-amber-300/90 border border-amber-900/50 px-2 py-1 rounded-md flex items-start gap-1.5"
                      >
                        <Info className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <span>{unv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer: External Official Link */}
            {record.docUrl && (
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-end">
                <a
                  href={record.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors hover:underline"
                >
                  <span>Official Authority Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
