import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BIOMETHANE_PLANTS, 
  DEVELOPER_PORTFOLIOS, 
  COUNTRY_MACRO_STATS, 
  searchPlants 
} from '../../domain/plants/registry';
import { BiomethanePlant, DeveloperPortfolio, CountryMacroStat } from '../../domain/plants/types';
import { 
  Building2, 
  Factory, 
  Globe2, 
  Search, 
  Filter, 
  ArrowRight, 
  Zap, 
  Fuel, 
  ShieldCheck, 
  Activity, 
  Layers, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  MapPin
} from 'lucide-react';

const PAGE_SIZE = 50;

export function PlantsScreen() {
  const navigate = useNavigate();

  // Tab State: 'PLANTS' | 'DEVELOPERS' | 'MACRO'
  const [activeTab, setActiveTab] = useState<'PLANTS' | 'DEVELOPERS' | 'MACRO'>('PLANTS');

  // Search and Filter States for Plants
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedFeedstock, setSelectedFeedstock] = useState<string>('ALL');
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [selectedPlantDetail, setSelectedPlantDetail] = useState<BiomethanePlant | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filtered Plants
  const filteredPlants = useMemo(() => {
    let list = searchQuery.trim() ? searchPlants(searchQuery) : BIOMETHANE_PLANTS;

    if (selectedCountry !== 'ALL') {
      list = list.filter(p => p.countryCode === selectedCountry);
    }
    if (selectedFeedstock !== 'ALL') {
      list = list.filter(p => (p.primaryFeedstockCategory || '').toLowerCase().includes(selectedFeedstock.toLowerCase()));
    }
    if (selectedTech !== 'ALL') {
      list = list.filter(p => (p.upgradingTechnology || '').toLowerCase().includes(selectedTech.toLowerCase()));
    }

    return list;
  }, [searchQuery, selectedCountry, selectedFeedstock, selectedTech]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCountry, selectedFeedstock, selectedTech]);

  // Paginated slice
  const totalPages = Math.ceil(filteredPlants.length / PAGE_SIZE) || 1;
  const paginatedPlants = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPlants.slice(start, start + PAGE_SIZE);
  }, [filteredPlants, currentPage]);

  // Unique country and tech lists for filters
  const countries = useMemo(() => {
    const map = new Map<string, { code: string; name: string; flag: string }>();
    BIOMETHANE_PLANTS.forEach(p => {
      if (!map.has(p.countryCode)) {
        map.set(p.countryCode, { code: p.countryCode, name: p.country, flag: p.countryFlag });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <div className="space-y-4 font-sans text-stone-100 pb-16">
      
      {/* Top Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-teal-400" />
            <h1 className="text-base font-bold text-white font-mono uppercase tracking-tight">
              Pan-European Biomethane Infrastructure & Plant Directory
            </h1>
            <span className="text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded font-bold">
              {BIOMETHANE_PLANTS.length} Operating Facilities Listed
            </span>
          </div>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            Comprehensive register of all European biomethane producing facilities, developer portfolios, and national macro capacities.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-stone-950 border border-stone-800 rounded p-1 font-mono text-xs">
          <button
            onClick={() => setActiveTab('PLANTS')}
            className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'PLANTS' ? 'bg-teal-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Factory className="w-3.5 h-3.5" /> All Plants ({BIOMETHANE_PLANTS.length})
          </button>
          <button
            onClick={() => setActiveTab('DEVELOPERS')}
            className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'DEVELOPERS' ? 'bg-teal-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Developers ({DEVELOPER_PORTFOLIOS.length})
          </button>
          <button
            onClick={() => setActiveTab('MACRO')}
            className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'MACRO' ? 'bg-teal-600 text-white shadow-xs' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" /> Macro Country Stats ({COUNTRY_MACRO_STATS.length})
          </button>
        </div>
      </div>

      {/* Macro Statistics KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-3">
          <div className="text-[10px] text-stone-400 uppercase font-bold">Total European Plants</div>
          <div className="text-lg font-bold text-white mt-0.5">{BIOMETHANE_PLANTS.length}</div>
          <div className="text-[10px] text-teal-400 mt-0.5">26 Producing Nations</div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-3">
          <div className="text-[10px] text-stone-400 uppercase font-bold">Annual Production Capacity</div>
          <div className="text-lg font-bold text-teal-300 mt-0.5">86.5 TWh/yr</div>
          <div className="text-[10px] text-stone-400 mt-0.5">~8.2 billion m³ (bcm)</div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-3">
          <div className="text-[10px] text-stone-400 uppercase font-bold">Grid Connection Share</div>
          <div className="text-lg font-bold text-stone-100 mt-0.5">86% Connected</div>
          <div className="text-[10px] text-stone-400 mt-0.5">51% Dist / 35% Trans</div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-3">
          <div className="text-[10px] text-stone-400 uppercase font-bold">Average Plant Size</div>
          <div className="text-lg font-bold text-stone-100 mt-0.5">483 Nm³/h</div>
          <div className="text-[10px] text-stone-400 mt-0.5">~43.8 GWh/year</div>
        </div>
      </div>

      {/* TAB 1: OPERATING BIOMETHANE PLANTS DIRECTORY */}
      {activeTab === 'PLANTS' && (
        <div className="space-y-3">
          
          {/* Search & Filter Bar */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search Input */}
              <div className="min-w-[240px] flex-1 relative">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search 1,986 facilities by code (e.g. FR-53, DE-10), location, operator, network..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded pl-8 pr-3 py-1.5 text-xs text-stone-200 outline-none focus:border-teal-500"
                />
              </div>

              {/* Country Filter */}
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-300 outline-none focus:border-teal-500"
              >
                <option value="ALL">All Countries ({countries.length})</option>
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>

              {/* Tech Filter */}
              <select
                value={selectedTech}
                onChange={e => setSelectedTech(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded px-2.5 py-1.5 text-stone-300 outline-none focus:border-teal-500"
              >
                <option value="ALL">All Technologies</option>
                <option value="Membrane">Membrane Separation</option>
                <option value="Amine">Amine Scrubbing</option>
                <option value="Water">Water Scrubbing</option>
                <option value="PWS">Pressurized Water Scrubbing</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <span className="text-stone-400 text-[11px]">
                Showing {filteredPlants.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filteredPlants.length)} of <strong className="text-white">{filteredPlants.length}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1 rounded bg-stone-950 border border-stone-800 text-stone-300 disabled:opacity-30 hover:bg-stone-800"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 py-0.5 bg-stone-950 border border-stone-800 rounded text-stone-300 text-[11px]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 rounded bg-stone-950 border border-stone-800 text-stone-300 disabled:opacity-30 hover:bg-stone-800"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Plants Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-sm font-mono text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left tabular-nums">
                <thead className="bg-stone-950 text-stone-400 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-800">
                  <tr>
                    <th className="py-2.5 px-3">Facility / Location</th>
                    <th className="py-2.5 px-3">Operator / Developer</th>
                    <th className="py-2.5 px-3 text-right">Capacity (Nm³/h)</th>
                    <th className="py-2.5 px-3 text-right">Energy (GWh/yr)</th>
                    <th className="py-2.5 px-3">Primary Feedstock</th>
                    <th className="py-2.5 px-3">Upgrading Tech</th>
                    <th className="py-2.5 px-3">Grid Operator</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {paginatedPlants.map((plant) => (
                    <tr
                      key={plant.id}
                      onClick={() => setSelectedPlantDetail(plant)}
                      className="h-10 hover:bg-stone-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 font-bold text-stone-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{plant.countryFlag}</span>
                          <span>{plant.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-stone-300 font-medium whitespace-nowrap max-w-[180px] truncate" title={plant.operator || 'Operator'}>
                        {plant.operator || 'National Operator'}
                      </td>
                      <td className="py-2 px-3 text-right text-teal-300 font-bold font-mono">
                        {plant.capacityNm3h != null ? plant.capacityNm3h.toLocaleString() : '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-stone-200 font-bold font-mono">
                        {plant.annualEnergyGWh != null ? plant.annualEnergyGWh.toLocaleString() : '—'}
                      </td>
                      <td className="py-2 px-3 text-stone-300 text-[11px] max-w-[200px] truncate" title={plant.feedstockDetails || ''}>
                        {plant.primaryFeedstockCategory || 'Agri-residues & biowaste'}
                      </td>
                      <td className="py-2 px-3 text-stone-400 text-[11px] max-w-[160px] truncate" title={plant.upgradingTechnology || ''}>
                        {plant.upgradingTechnology || 'Membrane Separation'}
                      </td>
                      <td className="py-2 px-3 text-stone-400 text-[11px] max-w-[160px] truncate" title={plant.networkOperator || ''}>
                        {plant.networkOperator || 'National Grid'}
                      </td>
                      <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            const vol = plant.annualEnergyGWh ? `&volume=${Math.round(plant.annualEnergyGWh * 1000)}` : '';
                            navigate(`/trade?originCountry=${plant.countryCode}${vol}`);
                          }}
                          className="px-2 py-1 bg-teal-950 text-teal-300 hover:bg-teal-900 border border-teal-800 rounded text-[10px] font-bold transition-all whitespace-nowrap"
                          title="Simulate Export Trade for this Facility"
                        >
                          Simulate Trade →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Bar */}
            <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs">
              <span className="text-stone-400 text-[11px]">
                Showing {filteredPlants.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filteredPlants.length)} of <strong className="text-white">{filteredPlants.length}</strong> facilities
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-stone-300 disabled:opacity-30 hover:bg-stone-800 text-xs font-semibold"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-stone-900 border border-stone-800 rounded text-stone-300 text-xs">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-stone-300 disabled:opacity-30 hover:bg-stone-800 text-xs font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEVELOPER PORTFOLIOS */}
      {activeTab === 'DEVELOPERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {DEVELOPER_PORTFOLIOS.map((dev) => (
            <div key={dev.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-start justify-between border-b border-stone-800 pb-2">
                <div>
                  <div className="font-bold text-sm text-stone-100 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-400" />
                    <span>{dev.name}</span>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    HQ: {dev.countryFlag} {dev.countryHQ}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-teal-300">
                    {dev.totalCapacityGWh != null ? `${dev.totalCapacityGWh.toLocaleString()} GWh/yr` : '—'}
                  </div>
                  <div className="text-[9px] text-stone-500">Portfolio Capacity</div>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="text-stone-400">
                  <strong className="text-stone-300">Core Geographies:</strong> {dev.coreGeographies.join(', ')}
                </div>
                <div className="text-stone-400">
                  <strong className="text-stone-300">Signature Assets:</strong> {dev.signatureAssets.join(', ')}
                </div>
                <div className="p-2 bg-stone-950 rounded text-stone-300 text-[10px] leading-relaxed border border-stone-800">
                  <strong>Strategy:</strong> {dev.strategicFocus}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: MACRO COUNTRY CAPACITIES */}
      {activeTab === 'MACRO' && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden font-mono text-xs shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left tabular-nums">
              <thead className="bg-stone-950 text-stone-400 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-800">
                <tr>
                  <th className="py-2.5 px-3">Country / Registry</th>
                  <th className="py-2.5 px-3 text-right">Active Plants</th>
                  <th className="py-2.5 px-3 text-right">Installed Capacity (TWh/yr)</th>
                  <th className="py-2.5 px-3 text-right">Capacity (mcm/yr)</th>
                  <th className="py-2.5 px-3 text-right">Avg Size (Nm³/h)</th>
                  <th className="py-2.5 px-3 text-right">Grid Rate</th>
                  <th className="py-2.5 px-3">Primary Feedstock</th>
                  <th className="py-2.5 px-3">Primary Technology</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {COUNTRY_MACRO_STATS.map((m) => (
                  <tr key={m.iso} className="h-10 hover:bg-stone-800/60 transition-colors">
                    <td className="py-2 px-3 font-bold text-stone-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{m.flag}</span>
                        <span>{m.country}</span>
                        <span className="text-[10px] text-stone-500 font-normal">({m.nationalRegistry})</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-stone-200">
                      {m.activePlants}
                    </td>
                    <td className="py-2 px-3 text-right text-teal-300 font-bold">
                      {m.installedCapacityTWh != null ? `${m.installedCapacityTWh.toFixed(2)} TWh` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-stone-300">
                      {m.installedCapacityMcm != null ? m.installedCapacityMcm.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-stone-200">
                      {m.avgPlantSizeNm3h != null ? m.avgPlantSizeNm3h.toFixed(0) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-stone-400">
                      {m.gridConnectionRate != null ? `${(m.gridConnectionRate * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="py-2 px-3 text-stone-400 text-[11px]">
                      {m.primaryFeedstockType || 'Agricultural residues / Biowaste'}
                    </td>
                    <td className="py-2 px-3 text-stone-400 text-[11px]">
                      {m.primaryUpgradingTech || 'Membranes / Scrubbing'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Plant Detail Modal */}
      {selectedPlantDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <span className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span>{selectedPlantDetail.countryFlag} {selectedPlantDetail.name}</span>
                </span>
                <span className="text-[10px] text-stone-400">
                  {selectedPlantDetail.country} • Sourced: {selectedPlantDetail.provenance}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-green-950 text-green-300 border border-green-800 rounded text-[10px] font-bold">
                {selectedPlantDetail.status || 'Active'}
              </span>
            </div>

            {/* Grid of details with verified vs unverified indicators */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-stone-950 rounded border border-stone-800">
                <span className="text-[10px] text-stone-500 uppercase block font-bold">Location & Country</span>
                <strong className="text-stone-200">{selectedPlantDetail.name}, {selectedPlantDetail.country}</strong>
                <span className="text-[9px] text-emerald-400 block mt-0.5">✓ Verified in GIE/EBA Map</span>
              </div>
              <div className="p-2.5 bg-stone-950 rounded border border-stone-800">
                <span className="text-[10px] text-stone-500 uppercase block font-bold">Facility Code</span>
                <strong className="text-teal-300">{selectedPlantDetail.id.toUpperCase()}</strong>
                <span className="text-[9px] text-emerald-400 block mt-0.5">✓ Sourced National ID</span>
              </div>
              <div className="p-2.5 bg-stone-950 rounded border border-stone-800">
                <span className="text-[10px] text-stone-500 uppercase block font-bold">Operator / Developer</span>
                <span className="text-stone-400">{selectedPlantDetail.operator || <span className="italic text-stone-600">Unverified in GIE/EBA source map</span>}</span>
              </div>
              <div className="p-2.5 bg-stone-950 rounded border border-stone-800">
                <span className="text-[10px] text-stone-500 uppercase block font-bold">Capacity / Upgrading</span>
                <span className="text-stone-400">{selectedPlantDetail.capacityNm3h != null ? `${selectedPlantDetail.capacityNm3h} Nm³/h` : <span className="italic text-stone-600">Unverified in GIE/EBA source map</span>}</span>
              </div>
            </div>

            <div className="p-3 bg-stone-950 rounded border border-stone-800 space-y-1 text-xs text-stone-400">
              <div>
                <strong className="text-stone-300">Data Provenance:</strong> {selectedPlantDetail.provenance}
              </div>
              <div className="text-[11px] text-stone-500">
                * Note: The GIE/EBA European Biomethane Map 2026 provides facility location name, country, and national ID. Operator, capacity, and technology attributes are not supplied by the source map.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedPlantDetail(null)}
                className="px-3 py-1.5 rounded border border-stone-800 text-stone-400 hover:bg-stone-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigate(`/trade?originCountry=${selectedPlantDetail.countryCode}`);
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-1.5 rounded flex items-center gap-1.5"
              >
                Simulate Trade for {selectedPlantDetail.country} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
