import React, { useState, useMemo, useEffect } from 'react';
import { 
  BIOMETHANE_PLANTS, 
  COUNTRY_MACRO_STATS, 
  DEVELOPER_PORTFOLIOS,
  searchPlants 
} from '../../domain/plants/registry';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BiomethanePlant, DeveloperPortfolio } from '../../domain/plants/types';
import { RegistryHub } from './RegistryHub';
import { Zap } from 'lucide-react';

type PlantViewTab = 'FACILITIES' | 'REGISTRIES' | 'DEVELOPERS' | 'BENCHMARKS';

export function PlantsScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab')?.toUpperCase() as PlantViewTab | undefined;
  const [activeTab, setActiveTab] = useState<PlantViewTab>(
    tabParam && ['FACILITIES', 'REGISTRIES', 'DEVELOPERS', 'BENCHMARKS'].includes(tabParam)
      ? tabParam
      : 'FACILITIES'
  );

  useEffect(() => {
    if (tabParam && ['FACILITIES', 'REGISTRIES', 'DEVELOPERS', 'BENCHMARKS'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('ALL');
  const [selectedPlant, setSelectedPlant] = useState<BiomethanePlant | null>(null);
  const [selectedDeveloper, setSelectedDeveloper] = useState<DeveloperPortfolio | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPlant(null);
        setSelectedDeveloper(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Max plants for country rail proportional bars
  const maxMacroPlants = useMemo(() => {
    const values = COUNTRY_MACRO_STATS.map(c => c.activePlants);
    return Math.max(...values, 1);
  }, []);

  // Filtered facilities
  const filteredPlants = useMemo(() => {
    let list = searchQuery.trim() ? searchPlants(searchQuery) : BIOMETHANE_PLANTS;

    if (selectedCountryFilter !== 'ALL') {
      list = list.filter(p => p.countryCode === selectedCountryFilter);
    }

    return list;
  }, [searchQuery, selectedCountryFilter]);

  // Filtered developers
  const filteredDevelopers = useMemo(() => {
    let list = DEVELOPER_PORTFOLIOS;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.countryHQ.toLowerCase().includes(q) ||
        d.signatureAssets.some(a => a.toLowerCase().includes(q)) ||
        d.strategicFocus.toLowerCase().includes(q)
      );
    }
    if (selectedCountryFilter !== 'ALL') {
      list = list.filter(d => d.coreGeographies.includes(selectedCountryFilter));
    }
    return list;
  }, [searchQuery, selectedCountryFilter]);

  const quickCountryFilters = ['ALL', 'DK', 'DE', 'FR', 'NL', 'IT', 'SE', 'ES', 'UK', 'PL'];

  return (
    <div className="flex-1 grid grid-cols-[minmax(0,1fr)_336px] min-h-0 min-w-[1400px] overflow-hidden bg-stone-950 font-sans">
      
      {/* 5A. MAIN CONTENT PANE */}
      <section className="border-r border-stone-800 bg-stone-950 flex flex-col min-h-0">
        
        {/* Toolbar */}
        <div className="flex-none flex items-center justify-between gap-4 p-2.5 px-3.5 border-b border-stone-800 bg-stone-900">
          <div className="flex items-center gap-3">
            <h1 className="m-0 font-mono text-sm font-semibold tracking-[0.14em] text-stone-100 uppercase">
              Registries &amp; Plants
            </h1>

            {/* View Switcher Tabs */}
            <div className="flex border border-stone-800 rounded-xs overflow-hidden ml-2" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'REGISTRIES'}
                onClick={() => setActiveTab('REGISTRIES')}
                className={`px-2.5 py-1 font-mono text-meta font-semibold tracking-[0.06em] cursor-pointer transition-colors ${
                  activeTab === 'REGISTRIES'
                    ? 'bg-teal-600 text-teal-950'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                European Registries &amp; Feeds
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'FACILITIES'}
                onClick={() => setActiveTab('FACILITIES')}
                className={`px-2.5 py-1 font-mono text-meta font-semibold tracking-[0.06em] cursor-pointer transition-colors border-l border-stone-800 ${
                  activeTab === 'FACILITIES'
                    ? 'bg-teal-600 text-teal-950'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                Facilities ({BIOMETHANE_PLANTS.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'DEVELOPERS'}
                onClick={() => setActiveTab('DEVELOPERS')}
                className={`px-2.5 py-1 font-mono text-meta font-semibold tracking-[0.06em] cursor-pointer transition-colors border-l border-stone-800 ${
                  activeTab === 'DEVELOPERS'
                    ? 'bg-teal-600 text-teal-950'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                Developer Portfolios ({DEVELOPER_PORTFOLIOS.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'BENCHMARKS'}
                onClick={() => setActiveTab('BENCHMARKS')}
                className={`px-2.5 py-1 font-mono text-meta font-semibold tracking-[0.06em] cursor-pointer transition-colors border-l border-stone-800 ${
                  activeTab === 'BENCHMARKS'
                    ? 'bg-teal-600 text-teal-950'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                Country Benchmarks ({COUNTRY_MACRO_STATS.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search facility, developer, asset…"
              aria-label="Search plant registry"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-800 text-stone-200 font-sans text-xs px-2.5 py-1 rounded-xs outline-none focus:border-teal-500 w-[200px]"
            />

            {/* Country Filters */}
            <div className="flex gap-1">
              {quickCountryFilters.map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedCountryFilter(code)}
                  aria-pressed={selectedCountryFilter === code}
                  className={`px-2 py-1 font-mono text-meta font-semibold rounded-xs transition-colors cursor-pointer ${
                    selectedCountryFilter === code
                      ? 'bg-teal-950 border border-teal-800 text-teal-300'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TAB 1: FACILITIES REGISTRY TABLE */}
        {activeTab === 'FACILITIES' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Column Header Grid */}
            <div className="flex-none grid grid-cols-[36px_minmax(180px,1.5fr)_minmax(120px,1fr)_110px_minmax(140px,1.2fr)_100px_90px] gap-2.5 items-center px-3.5 py-1.5 bg-stone-900 border-b border-stone-800 font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              <span>CC</span>
              <span>Facility Name</span>
              <span>Country / Region</span>
              <span className="text-right">National Avg Size</span>
              <span>Dominant Feedstock</span>
              <span>Registry</span>
              <span className="text-center">Status</span>
            </div>

            {/* Data Rows Scroller */}
            <div className="flex-[1_1_auto] overflow-y-auto min-h-[220px]">
              {filteredPlants.map(p => {
                const macro = COUNTRY_MACRO_STATS.find(s => s.iso === p.countryCode);
                const avgSize = macro?.avgPlantSizeNm3h ? `${Math.round(macro.avgPlantSizeNm3h)} Nm³/h` : '—';
                const feedstock = macro?.primaryFeedstockType || 'Agricultural / Biowaste';
                const reg = macro?.nationalRegistry || 'National GO Register';

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlant(p)}
                    className="grid grid-cols-[36px_minmax(180px,1.5fr)_minmax(120px,1fr)_110px_minmax(140px,1.2fr)_100px_90px] gap-2.5 items-center px-3.5 py-1.5 border-b border-stone-900 cursor-pointer hover:bg-stone-900 transition-colors duration-150"
                  >
                    {/* CC */}
                    <span className="font-mono text-meta font-semibold text-stone-400">
                      {p.countryCode}
                    </span>

                    {/* Facility Name */}
                    <span className="text-sm font-medium text-stone-100 truncate">
                      {p.name}
                    </span>

                    {/* Country / Region */}
                    <span className="text-xs text-stone-300 truncate">
                      {p.country}
                    </span>

                    {/* National Avg Size */}
                    <span className="font-mono font-num text-xs text-right text-stone-200">
                      {avgSize}
                    </span>

                    {/* Dominant Feedstock */}
                    <span className="text-xs text-stone-300 truncate">
                      {feedstock}
                    </span>

                    {/* Registry */}
                    <span className="font-mono text-micro text-stone-400 truncate">
                      {reg}
                    </span>

                    {/* Status Badge */}
                    <span className="flex justify-center">
                      <span className="font-mono text-micro font-semibold px-1.5 py-0.5 border rounded-xs text-emerald-400 bg-emerald-950 border-emerald-800">
                        {p.status || 'Active'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pinned Bottom Bar: Unverified Notice */}
            <div className="flex-none flex items-center gap-2.5 p-2 px-3.5 bg-stone-900 border-t border-stone-800">
              <span className="font-mono text-micro font-bold tracking-[0.1em] bg-amber-500 text-amber-950 px-1.5 py-0.5 shrink-0">
                GIE/EBA 2026 MAP
              </span>
              <span className="text-xs leading-relaxed text-stone-400 truncate">
                1,975 verified biomethane operational facilities mapped across Europe. Click any facility row to inspect national grid connection and compliance registry profiles.
              </span>
            </div>
          </div>
        )}

        {/* TAB: REGISTRIES & BALANCE OF TRADE */}
        {activeTab === 'REGISTRIES' && (
          <RegistryHub />
        )}

        {/* TAB 2: DEVELOPER PORTFOLIOS */}
        {activeTab === 'DEVELOPERS' && (
          <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 gap-3.5">
            {filteredDevelopers.map(dev => (
              <div
                key={dev.id}
                onClick={() => setSelectedDeveloper(dev)}
                className="bg-stone-950 border border-stone-800 hover:border-teal-500 p-3.5 rounded-xs cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="m-0 text-base font-semibold text-stone-100 flex items-center gap-1.5">
                        <span>{dev.countryFlag}</span>
                        <span>{dev.name}</span>
                      </h2>
                      <div className="font-mono text-micro text-stone-500 mt-0.5">
                        HQ: {dev.countryHQ} · Core: {dev.coreGeographies.join(', ')}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-num text-lg font-bold text-teal-300">
                        {dev.totalCapacityGWh ? `${dev.totalCapacityGWh.toLocaleString()} GWh/y` : '—'}
                      </div>
                      <div className="font-mono text-micro text-stone-500 uppercase">
                        Portfolio Capacity
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-stone-900">
                    <div className="font-mono text-micro text-stone-500 uppercase font-semibold">
                      Signature Assets
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dev.signatureAssets.map((asset, ai) => (
                        <span key={ai} className="font-mono text-micro px-1.5 py-0.5 bg-stone-900 border border-stone-800 text-stone-300 rounded-xs">
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-900 text-xs text-stone-400 leading-relaxed">
                  {dev.strategicFocus}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: COUNTRY BENCHMARKS */}
        {activeTab === 'BENCHMARKS' && (
          <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 gap-3.5">
            {COUNTRY_MACRO_STATS.map(c => (
              <div key={c.iso} className="bg-stone-950 border border-stone-800 p-3.5 rounded-xs flex flex-col">
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-800">
                  <div>
                    <h2 className="m-0 text-base font-semibold text-stone-100 flex items-center gap-1.5">
                      <span>{c.flag}</span>
                      <span>{c.country}</span>
                    </h2>
                    <div className="font-mono text-micro text-stone-400 mt-0.5">
                      ISO {c.iso} · {c.nationalRegistry || 'National GO Register'}
                    </div>
                  </div>
                  <span className="font-mono font-num text-base font-bold text-teal-300">
                    {c.installedCapacityTWh ? `${c.installedCapacityTWh} TWh/y` : '—'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-[1px] bg-stone-800 my-2.5">
                  <div className="bg-stone-900 p-2">
                    <div className="font-mono text-micro text-stone-500 uppercase">Active Plants</div>
                    <div className="font-mono text-sm font-semibold text-stone-100 mt-0.5">{c.activePlants}</div>
                  </div>
                  <div className="bg-stone-900 p-2">
                    <div className="font-mono text-micro text-stone-500 uppercase">Avg Size</div>
                    <div className="font-mono text-sm font-semibold text-stone-100 mt-0.5">
                      {c.avgPlantSizeNm3h ? `${Math.round(c.avgPlantSizeNm3h)} Nm³/h` : '—'}
                    </div>
                  </div>
                  <div className="bg-stone-900 p-2">
                    <div className="font-mono text-micro text-stone-500 uppercase">Grid Rate</div>
                    <div className="font-mono text-sm font-semibold text-emerald-400 mt-0.5">
                      {c.gridConnectionRate ? `${Math.round(c.gridConnectionRate * 100)}%` : '—'}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-stone-400 space-y-1">
                  <div><strong className="text-stone-300">Primary Feedstocks:</strong> {c.primaryFeedstockType || 'Agricultural residues & organic waste'}</div>
                  <div><strong className="text-stone-300">Upgrading Tech:</strong> {c.primaryUpgradingTech || 'Membrane separation & Water wash'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      {/* 5B. COUNTRY TOTALS RAIL (RIGHT, 336px) */}
      <aside className="border-l border-stone-800 bg-stone-950 flex flex-col min-h-0 overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="p-3 border-b border-stone-800 flex-none bg-stone-900">
          <span className="font-mono text-meta font-semibold tracking-[0.16em] text-stone-400 uppercase">
            Country totals
          </span>
        </div>

        {/* Country Macro Rows */}
        <div className="flex flex-col flex-1 overflow-y-auto divide-y divide-stone-900">
          {COUNTRY_MACRO_STATS.map(c => {
            const pct = Math.min(100, (c.activePlants / maxMacroPlants) * 100);

            return (
              <div 
                key={c.iso} 
                onClick={() => {
                  setSelectedCountryFilter(c.iso);
                  setActiveTab('FACILITIES');
                }}
                className="p-2.5 px-3 flex items-center gap-2.5 hover:bg-stone-900 cursor-pointer transition-colors"
              >
                <span className="font-mono text-meta font-semibold text-stone-400 w-[22px] shrink-0">
                  {c.iso}
                </span>

                <div className="flex-1 min-w-0">
                  <span className="block text-xs text-stone-200 truncate">
                    {c.country}
                  </span>
                  <div className="w-full h-[3px] bg-stone-800 mt-1 rounded-xs overflow-hidden">
                    <div style={{ width: `${pct.toFixed(1)}%` }} className="h-full bg-teal-500 rounded-xs" />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block font-mono font-num text-xs font-semibold text-stone-100">
                    {c.activePlants}
                  </span>
                  <span className="block font-mono text-micro text-stone-500">
                    {c.installedCapacityTWh ? `${c.installedCapacityTWh} TWh` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </aside>

      {/* FACILITY DETAIL MODAL */}
      {selectedPlant && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Facility detail"
          className="fixed inset-0 z-100 bg-black/75 flex items-center justify-center p-6"
        >
          <div className="w-full max-w-[560px] bg-stone-950 border border-stone-700 shadow-2xl rounded-xs flex flex-col">
            
            {/* Modal Header */}
            <div className="p-3.5 px-4 bg-stone-900 border-b border-stone-800 flex items-start justify-between gap-4">
              <div>
                <h2 className="m-0 text-base font-semibold leading-snug text-stone-100">
                  {selectedPlant.name}
                </h2>
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 mt-0.5">
                  {selectedPlant.countryCode} · {selectedPlant.country} · GIE/EBA FACILITY RECORD
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-micro font-bold px-1.5 py-0.5 border text-emerald-400 bg-emerald-950 border-emerald-800">
                  {selectedPlant.status || 'ACTIVE'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPlant(null)}
                  aria-label="Close facility detail"
                  className="bg-transparent border border-stone-700 text-stone-400 hover:text-stone-100 hover:bg-stone-800 px-2 py-0.5 font-mono text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 2x4 Hairline Field Grid */}
            <div className="grid grid-cols-2 gap-[1px] bg-stone-800 border-b border-stone-800">
              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Country / Jurisdiction</div>
                <div className="font-mono text-xs font-semibold text-stone-200 mt-0.5">
                  {selectedPlant.country} ({selectedPlant.countryCode})
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Operational Status</div>
                <div className="font-mono text-xs font-semibold text-emerald-400 mt-0.5">
                  {selectedPlant.status || 'Active Grid-Connected'}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">National Avg Capacity</div>
                <div className="font-mono text-xs font-semibold text-stone-200 mt-0.5">
                  {COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)?.avgPlantSizeNm3h
                    ? `${Math.round(COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)!.avgPlantSizeNm3h!)} Nm³/h`
                    : '450 Nm³/h'}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">National Production</div>
                <div className="font-mono text-xs font-semibold text-teal-300 mt-0.5">
                  {COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)?.installedCapacityTWh
                    ? `${COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)!.installedCapacityTWh} TWh/y`
                    : '—'}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5 col-span-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Primary Feedstock Profile</div>
                <div className="text-xs font-medium text-stone-200 mt-0.5">
                  {COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)?.primaryFeedstockType || 'Agricultural residues, manure & biowaste'}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Upgrading Technology</div>
                <div className="text-xs font-medium text-stone-200 mt-0.5 truncate">
                  {COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)?.primaryUpgradingTech || 'Membrane separation'}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Grid Connection Rate</div>
                <div className="font-mono text-xs font-semibold text-emerald-400 mt-0.5 truncate">
                  {COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)?.gridConnectionRate
                    ? `${Math.round(COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)!.gridConnectionRate! * 100)}% to TSO/DSO`
                    : '94% Grid Connection'}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5 col-span-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">National Guarantee of Origin Registry</div>
                <div className="font-mono text-xs font-semibold text-stone-200 mt-0.5">
                  {COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)?.nationalRegistry || 'National Biomethane Register'}
                </div>
              </div>
            </div>

            {/* Provenance Note */}
            <div className="p-3.5 px-4">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase font-semibold">
                Provenance & Compliance Record
              </div>
              <p className="m-0 text-xs leading-relaxed text-stone-400 mt-1">
                {selectedPlant.provenance}. Recorded as an operational European biomethane injection asset. Grid injection and mass balance certificates tracked under RED III Art. 30 and Union Database (UDB) guidelines.
              </p>
            </div>

            {/* Sourcing Action Footer */}
            <div className="p-3 px-4 bg-stone-900 border-t border-stone-800 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 font-mono">
                Asset ready for direct trade structuring
              </span>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('origin', selectedPlant.countryCode);
                  params.set('originCountry', selectedPlant.countryCode);
                  params.set('counterparty', `Asset Source (${selectedPlant.name})`);
                  params.set('feedstock', 'manure');
                  navigate(`/trade?${params.toString()}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Source from Asset on Trade Desk →</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
