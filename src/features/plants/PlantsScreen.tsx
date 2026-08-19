import React, { useState, useMemo, useEffect } from 'react';
import { 
  COMBINED_BIOMETHANE_PLANTS,
  VERIFIED_COMMERCIAL_PLANTS,
  BIOMETHANE_PLANTS, 
  COUNTRY_MACRO_STATS, 
  DEVELOPER_PORTFOLIOS,
  searchPlants 
} from '../../domain/plants/registry';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BiomethanePlant, DeveloperPortfolio } from '../../domain/plants/types';
import { RegistryHub } from './RegistryHub';
import { Zap, ShieldCheck, Database, Info, Building2, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { buildDealUrl } from '../../domain/trade/dealParams';

type PlantViewTab = 'FACILITIES' | 'REGISTRIES' | 'DEVELOPERS' | 'BENCHMARKS';
type VerificationFilter = 'ALL' | 'VERIFIED_ONLY' | 'CENSUS_ONLY';

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
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('ALL');
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

  // Complete list of all mapped European countries with counts and flags
  const allCountries = useMemo(() => {
    const map = new Map<string, { iso: string; name: string; flag: string; count: number }>();

    COUNTRY_MACRO_STATS.forEach(c => {
      map.set(c.iso, {
        iso: c.iso,
        name: c.country,
        flag: c.flag,
        count: c.activePlants || 0,
      });
    });

    // Ensure all plant country codes are present
    COMBINED_BIOMETHANE_PLANTS.forEach(p => {
      const code = p.countryCode || 'OTHER';
      if (!map.has(code)) {
        map.set(code, {
          iso: code,
          name: p.country,
          flag: p.countryFlag || '🌐',
          count: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, []);

  // Filtered facilities
  const filteredPlants = useMemo(() => {
    let list = searchQuery.trim() ? searchPlants(searchQuery) : COMBINED_BIOMETHANE_PLANTS;

    if (verificationFilter === 'VERIFIED_ONLY') {
      list = list.filter(p => p.isVerified);
    } else if (verificationFilter === 'CENSUS_ONLY') {
      list = list.filter(p => !p.isVerified);
    }

    if (selectedCountryFilter !== 'ALL') {
      const filter = selectedCountryFilter.toUpperCase();
      list = list.filter(p => {
        const code = (p.countryCode || '').toUpperCase();
        if (filter === 'UK' || filter === 'GB') {
          return code === 'UK' || code === 'GB';
        }
        return code === filter;
      });
    }

    return list;
  }, [searchQuery, selectedCountryFilter, verificationFilter]);

  // Total Yearly Output for filtered facilities
  const totalFilteredGWh = useMemo(() => {
    if (verificationFilter === 'VERIFIED_ONLY') {
      return filteredPlants.reduce((acc, p) => acc + (p.annualEnergyGWh || 0), 0);
    }
    if (selectedCountryFilter !== 'ALL') {
      const filter = selectedCountryFilter.toUpperCase();
      const macro = COUNTRY_MACRO_STATS.find(c => c.iso === filter || (filter === 'UK' && c.iso === 'GB'));
      if (macro?.installedCapacityTWh) {
        return macro.installedCapacityTWh * 1000;
      }
    }
    // Sum of official national census macro totals
    return COUNTRY_MACRO_STATS.reduce((acc, c) => acc + ((c.installedCapacityTWh || 0) * 1000), 0);
  }, [filteredPlants, verificationFilter, selectedCountryFilter]);

  const totalFilteredMWh = useMemo(() => {
    return Math.round(totalFilteredGWh * 1000);
  }, [totalFilteredGWh]);

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
      const filter = selectedCountryFilter.toUpperCase();
      list = list.filter(d => 
        d.coreGeographies.some(g => g.toUpperCase() === filter || (filter === 'UK' && g === 'GB'))
      );
    }
    return list;
  }, [searchQuery, selectedCountryFilter]);

  return (
    <div className="flex-1 grid grid-cols-[minmax(0,1fr)_340px] min-h-0 min-w-0 overflow-hidden bg-stone-950 font-sans">
      
      {/* 5A. MAIN CONTENT PANE */}
      <section className="border-r border-stone-800 bg-stone-950 flex flex-col min-h-0">
        
        {/* Top Toolbar */}
        <div className="flex-none flex flex-wrap items-center justify-between gap-3 p-3 px-4 border-b border-stone-800 bg-stone-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h1 className="m-0 font-mono text-sm font-bold tracking-wider text-stone-100 uppercase flex items-center gap-2">
              <span>European Plants Database</span>
              <span className="text-[10px] text-teal-400 bg-teal-950 border border-teal-800 px-2 py-0.5 rounded-full font-bold">
                1,975+ Facilities
              </span>
            </h1>

            {/* View Switcher Tabs */}
            <div className="flex border border-stone-800 rounded-lg overflow-hidden ml-2 bg-stone-950 p-0.5" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'FACILITIES'}
                onClick={() => setActiveTab('FACILITIES')}
                className={`px-3 py-1 font-mono text-[11px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'FACILITIES'
                    ? 'bg-teal-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Facilities</span>
                <span className="text-[9px] bg-stone-900 px-1.5 py-0.2 rounded font-mono">
                  {COMBINED_BIOMETHANE_PLANTS.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'DEVELOPERS'}
                onClick={() => setActiveTab('DEVELOPERS')}
                className={`px-3 py-1 font-mono text-[11px] font-bold rounded transition-colors cursor-pointer ${
                  activeTab === 'DEVELOPERS'
                    ? 'bg-teal-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Developers ({DEVELOPER_PORTFOLIOS.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'BENCHMARKS'}
                onClick={() => setActiveTab('BENCHMARKS')}
                className={`px-3 py-1 font-mono text-[11px] font-bold rounded transition-colors cursor-pointer ${
                  activeTab === 'BENCHMARKS'
                    ? 'bg-teal-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Benchmarks ({COUNTRY_MACRO_STATS.length})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search facility, developer, asset…"
              aria-label="Search plant registry"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-700/80 text-stone-200 font-mono text-xs px-3 py-1.5 rounded-lg outline-hidden focus:border-teal-500 w-[240px] transition-colors"
            />
          </div>
        </div>

        {/* Verification Sub-Filter Bar */}
        <div className="flex-none bg-stone-900/60 border-b border-stone-800 px-4 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-micro">
            <span className="text-stone-500 uppercase font-semibold mr-1">Provenance Tier:</span>
            <button
              type="button"
              onClick={() => setVerificationFilter('ALL')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                verificationFilter === 'ALL'
                  ? 'bg-teal-600 text-stone-950 font-bold'
                  : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              All Assets ({COMBINED_BIOMETHANE_PLANTS.length})
            </button>
            <button
              type="button"
              onClick={() => setVerificationFilter('VERIFIED_ONLY')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                verificationFilter === 'VERIFIED_ONLY'
                  ? 'bg-emerald-600 text-stone-950 font-bold'
                  : 'bg-stone-950 border border-emerald-900/60 text-emerald-400 hover:bg-emerald-950'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Commercial ({VERIFIED_COMMERCIAL_PLANTS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setVerificationFilter('CENSUS_ONLY')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                verificationFilter === 'CENSUS_ONLY'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              GIE/EBA Census ({BIOMETHANE_PLANTS.length})
            </button>
          </div>

          <div className="font-mono text-micro flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-stone-950 border border-stone-800 rounded">
              <span className="text-stone-500 uppercase font-semibold">Total Output:</span>
              <span className="text-teal-300 font-bold font-num">{totalFilteredGWh.toLocaleString('en-GB', { maximumFractionDigits: 1 })} GWh/a</span>
              <span className="text-stone-400 font-num">({totalFilteredMWh.toLocaleString('en-GB')} MWh/a)</span>
            </div>
            {verificationFilter === 'VERIFIED_ONLY' ? (
              <span className="text-emerald-400 hidden md:inline">✓ Verified GPS & metering</span>
            ) : (
              <span className="text-stone-500 hidden md:inline">Census records declare unverified attributes</span>
            )}
          </div>
        </div>

        {/* Complete European Country Filter Bar (All Mapped Countries) */}
        <div className="flex-none bg-stone-950 border-b border-stone-800/80 px-4 py-2 flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
          <span className="font-mono text-[10px] text-stone-500 uppercase font-bold shrink-0 mr-1">
            Country Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCountryFilter('ALL')}
            className={`px-2.5 py-1 font-mono text-[11px] font-bold rounded-md transition-colors cursor-pointer shrink-0 ${
              selectedCountryFilter === 'ALL'
                ? 'bg-teal-600 text-stone-950 shadow-sm'
                : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            🇪🇺 ALL ({COMBINED_BIOMETHANE_PLANTS.length})
          </button>
          {allCountries.map(c => {
            const isSelected = selectedCountryFilter === c.iso || (c.iso === 'GB' && selectedCountryFilter === 'UK');
            return (
              <button
                key={c.iso}
                type="button"
                onClick={() => setSelectedCountryFilter(c.iso === 'GB' ? 'UK' : c.iso)}
                className={`px-2 py-1 font-mono text-[11px] font-semibold rounded-md transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-teal-950 border border-teal-500 text-teal-300 shadow-xs'
                    : 'bg-stone-900/90 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-stone-200'
                }`}
                title={`${c.name}: ${c.count} active facilities`}
              >
                <span>{c.flag}</span>
                <span>{c.iso === 'GB' ? 'UK' : c.iso}</span>
                <span className="text-[10px] text-stone-500 font-normal">({c.count})</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: FACILITIES REGISTRY TABLE */}
        {activeTab === 'FACILITIES' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Column Header Grid */}
            <div className="flex-none grid grid-cols-[36px_minmax(220px,2fr)_minmax(140px,1.2fr)_130px_minmax(150px,1.3fr)_minmax(160px,1.4fr)_70px] gap-2.5 items-center px-3.5 py-2 bg-stone-900 border-b border-stone-800 font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              <span>CC</span>
              <span>Facility & Legal Entity</span>
              <span>Country / Grid Operator</span>
              <span className="text-right">Capacity & Output</span>
              <span>Feedstock Profile</span>
              <span>Commercial Contacts</span>
              <span className="text-center">Action</span>
            </div>

            {/* Data Rows Scroller */}
            <div className="flex-[1_1_auto] overflow-y-auto min-h-[220px]">
              {filteredPlants.map((p, idx) => {
                return (
                  <div
                    key={`${p.id}-${p.countryCode}-${idx}`}
                    onClick={() => setSelectedPlant(p)}
                    className="grid grid-cols-[36px_minmax(220px,2fr)_minmax(140px,1.2fr)_130px_minmax(150px,1.3fr)_minmax(160px,1.4fr)_70px] gap-2.5 items-center px-3.5 py-2 border-b border-stone-900/80 hover:bg-stone-900/90 cursor-pointer transition-colors duration-150 group"
                  >
                    {/* CC */}
                    <span className="font-mono text-meta font-semibold text-stone-400">
                      {p.countryCode}
                    </span>

                    {/* Facility & Legal Entity */}
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-stone-100 truncate group-hover:text-teal-300 transition-colors">
                          {p.name}
                        </span>
                      </div>
                      {p.legalEntityName && (
                        <div className="text-[11px] text-stone-400 truncate mt-0.5">
                          {p.legalEntityName}
                        </div>
                      )}
                      {p.companyRegistrationId && (
                        <span className="inline-block font-mono text-[9px] text-teal-400/90 bg-teal-950/70 border border-teal-800/60 px-1.5 py-0.2 rounded-xs mt-0.5">
                          {p.companyRegistrationId}
                        </span>
                      )}
                    </div>

                    {/* Country & Grid Operator */}
                    <div className="min-w-0">
                      <div className="text-xs text-stone-200 truncate">
                        {p.country}
                      </div>
                      <div className="font-mono text-[10px] text-stone-500 truncate mt-0.5">
                        {p.networkOperator || 'National Grid'}
                      </div>
                    </div>

                    {/* Capacity & Output */}
                    <div className="text-right">
                      {p.capacityNm3h ? (
                        <>
                          <span className="font-mono font-num text-xs font-bold text-emerald-400 block">
                            {p.capacityNm3h.toLocaleString()} Nm³/h
                          </span>
                          {p.annualEnergyGWh && (
                            <div className="font-mono text-[10px] text-stone-300 block mt-0.5 leading-tight">
                              <span className="text-teal-300 font-semibold">{p.annualEnergyGWh.toFixed(1)} GWh/a</span>
                              <span className="text-stone-500 block text-[9px]">({Math.round(p.annualEnergyGWh * 1000).toLocaleString()} MWh/a)</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <span className="font-mono text-xs text-stone-500 block">
                            —
                          </span>
                          <span className="font-mono text-[9px] text-stone-600 block mt-0.5">
                            Census unmetered
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Feedstock Profile */}
                    <div className="min-w-0">
                      <span className="text-xs text-stone-200 truncate block">
                        {p.primaryFeedstockCategory || 'Manure & Agri-residues'}
                      </span>
                      {p.feedstockDetails && (
                        <span className="text-[10px] text-stone-400 truncate block mt-0.5">
                          {p.feedstockDetails}
                        </span>
                      )}
                    </div>

                    {/* Commercial Contacts */}
                    <div className="flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                      {p.contactEmail && (
                        <a
                          href={`mailto:${p.contactEmail}?subject=Biomethane Supply Inquiry - ${p.name}`}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-950 border border-emerald-900/60 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 text-[10px] font-mono rounded-xs transition-colors"
                          title={`Email: ${p.contactEmail}`}
                        >
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[90px]">{p.contactEmail.split('@')[0]}</span>
                        </a>
                      )}

                      {p.contactPhone && (
                        <a
                          href={`tel:${p.contactPhone}`}
                          className="flex items-center gap-1 p-1 bg-stone-950 border border-stone-800 hover:border-stone-600 text-stone-300 text-[10px] font-mono rounded-xs transition-colors"
                          title={`Call: ${p.contactPhone}`}
                        >
                          <Phone className="w-3 h-3 text-stone-400" />
                        </a>
                      )}

                      {p.corporateWebsite && (
                        <a
                          href={p.corporateWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 p-1 bg-stone-950 border border-stone-800 hover:border-teal-600 text-teal-400 text-[10px] font-mono rounded-xs transition-colors"
                          title="Corporate Portal"
                        >
                          <Globe className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlant(p);
                        }}
                        className="px-2 py-0.5 bg-stone-800 hover:bg-teal-600 hover:text-stone-950 text-stone-300 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pinned Bottom Bar: Transparent Provenance Notice */}
            <div className="flex-none flex items-center justify-between gap-2.5 p-2 px-3.5 bg-stone-900 border-t border-stone-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-micro font-bold tracking-[0.1em] bg-stone-800 text-stone-300 border border-stone-700 px-1.5 py-0.5 shrink-0">
                  GIE/EBA 2026 CENSUS
                </span>
                <span className="text-xs leading-relaxed text-stone-400">
                  1,975 verified European biomethane grid injection locations mapped from official TSO & GIE/EBA registries. Granular hourly meter readings and private substrate mixes are unpublished in public censuses and flagged as unverified.
                </span>
              </div>
              <div className="font-mono text-micro text-emerald-400 shrink-0 hidden lg:block">
                ✓ {VERIFIED_COMMERCIAL_PLANTS.length} Curated Assets with Confirmed GPS Coordinates
              </div>
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
          className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-6"
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

            {/* Verified vs Census Provenance Banner */}
            <div className={`p-3 px-4 border-b flex items-start gap-2.5 ${
              selectedPlant.isVerified 
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
            }`}>
              {selectedPlant.isVerified ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed">
                {selectedPlant.isVerified ? (
                  <span><strong>Verified Commercial Asset:</strong> Confirmed GPS coordinates, technical injection capacity, and commercial operator.</span>
                ) : (
                  <span><strong>GIE/EBA Census Record:</strong> Verified physical injection point on European gas grid. Granular hourly meter rates, specific substrate recipes, and GPS coordinates are unverified in public census.</span>
                )}
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
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">
                  {selectedPlant.isVerified ? 'Verified Injection Capacity' : 'Asset Injection Capacity'}
                </div>
                <div className="font-mono text-xs font-semibold mt-0.5">
                  {selectedPlant.capacityNm3h ? (
                    <span className="text-emerald-400 font-bold">{selectedPlant.capacityNm3h.toLocaleString()} Nm³/h</span>
                  ) : (
                    <span className="text-stone-500 font-mono">Unpublished in Census</span>
                  )}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">
                  Total Yearly Energy Output
                </div>
                <div className="font-mono text-xs font-semibold mt-0.5">
                  {selectedPlant.annualEnergyGWh ? (
                    <div>
                      <span className="text-teal-300 font-bold">{selectedPlant.annualEnergyGWh.toFixed(1)} GWh/a</span>
                      <span className="text-stone-400 font-normal ml-1">({Math.round(selectedPlant.annualEnergyGWh * 1000).toLocaleString()} MWh/a)</span>
                    </div>
                  ) : (
                    <span className="text-stone-500 font-mono">Calculated on Trade Desk</span>
                  )}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5 col-span-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">
                  Feedstock Profile {selectedPlant.isVerified ? '(Audited Recipe)' : '(National Archetype)'}
                </div>
                <div className="text-xs font-medium text-stone-200 mt-0.5">
                  {selectedPlant.isVerified ? (
                    <span className="text-stone-100">{selectedPlant.primaryFeedstockCategory} {selectedPlant.feedstockDetails ? `— ${selectedPlant.feedstockDetails}` : ''}</span>
                  ) : (
                    <span className="text-stone-400 italic">
                      {selectedPlant.primaryFeedstockCategory || 'Estimated National Mix'} <span className="text-stone-600">(Unverified Specific Recipe)</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Upgrading Technology</div>
                <div className="text-xs font-medium text-stone-200 mt-0.5 truncate">
                  {selectedPlant.upgradingTechnology || COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)?.primaryUpgradingTech || 'Membrane separation'}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Coordinates (GPS)</div>
                <div className="font-mono text-xs font-semibold mt-0.5 truncate">
                  {selectedPlant.coordinates ? (
                    <span className="text-teal-300 font-mono">[{selectedPlant.coordinates[0].toFixed(3)}, {selectedPlant.coordinates[1].toFixed(3)}]</span>
                  ) : (
                    <span className="text-stone-500 font-mono">Unpublished</span>
                  )}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5 col-span-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">National Guarantee of Origin Registry</div>
                <div className="font-mono text-xs font-semibold text-stone-200 mt-0.5">
                  {selectedPlant.certificationAndRegistry || COUNTRY_MACRO_STATS.find(s => s.iso === selectedPlant.countryCode)?.nationalRegistry || 'National Biomethane Register'}
                </div>
              </div>
            </div>

            {/* Corporate & Commercial Contact Profile */}
            {(selectedPlant.legalEntityName || selectedPlant.contactEmail || selectedPlant.companyRegistrationId) && (
              <div className="p-3.5 px-4 bg-stone-900/60 border-b border-stone-800">
                <div className="flex items-center gap-2 font-mono text-micro tracking-[0.1em] text-teal-400 uppercase font-semibold mb-2">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Corporate Entity & Commercial Outreach</span>
                </div>
                
                <div className="space-y-1.5 text-xs">
                  {selectedPlant.legalEntityName && (
                    <div className="text-stone-200 font-medium">
                      <span className="text-stone-500">Legal Entity: </span>
                      {selectedPlant.legalEntityName}
                    </div>
                  )}

                  {selectedPlant.companyRegistrationId && (
                    <div className="font-mono text-[11px] text-stone-400">
                      <span className="text-stone-500">Registration ID: </span>
                      <span className="text-stone-300 font-semibold">{selectedPlant.companyRegistrationId}</span>
                    </div>
                  )}

                  {selectedPlant.headquartersAddress && (
                    <div className="flex items-start gap-1.5 text-stone-400 text-[11px]">
                      <MapPin className="w-3 h-3 text-stone-500 shrink-0 mt-0.5" />
                      <span>{selectedPlant.headquartersAddress}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-stone-800/80 mt-2">
                    {selectedPlant.corporateWebsite && (
                      <a
                        href={selectedPlant.corporateWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 text-[11px] font-mono hover:underline"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Corporate Portal</span>
                      </a>
                    )}

                    {selectedPlant.contactEmail && (
                      <a
                        href={`mailto:${selectedPlant.contactEmail}?subject=Biomethane Supply Inquiry - ${selectedPlant.name}`}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[11px] font-mono hover:underline"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{selectedPlant.contactEmail}</span>
                      </a>
                    )}

                    {selectedPlant.contactPhone && (
                      <a
                        href={`tel:${selectedPlant.contactPhone}`}
                        className="flex items-center gap-1 text-stone-300 hover:text-stone-100 text-[11px] font-mono"
                      >
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>{selectedPlant.contactPhone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Provenance Note */}
            <div className="p-3.5 px-4">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase font-semibold">
                Provenance & Compliance Record
              </div>
              <p className="m-0 text-xs leading-relaxed text-stone-400 mt-1">
                {selectedPlant.provenance}. {selectedPlant.isVerified ? 'Facility data verified against commercial registry and TSO injection declarations.' : 'Recorded as an operational European biomethane injection asset. Specific commercial attributes subject to physical audit.'}
              </p>
            </div>

            {/* Sourcing Action Footer */}
            <div className="p-3 px-4 bg-stone-900 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const cIso = (selectedPlant.countryCode || '').toUpperCase();
                  let targetIso = 'DE';
                  if (cIso === 'DE' || cIso === 'AT' || cIso === 'DK') targetIso = 'DE';
                  else if (cIso === 'GB' || cIso === 'UK') targetIso = 'GB';
                  else if (cIso === 'NL') targetIso = 'NL';
                  else if (cIso === 'FR') targetIso = 'FR';
                  else if (cIso === 'IT') targetIso = 'IT';
                  navigate(`/map?origin=${selectedPlant.countryCode}&plantId=${selectedPlant.id}&target=${targetIso}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-mono text-xs font-semibold rounded-xs cursor-pointer transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>Inspect on Map</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cat = (selectedPlant.primaryFeedstockCategory || '').toLowerCase();
                  let feedstock = 'manure';
                  let ci = -100;

                  if (cat.includes('food') || cat.includes('bio-waste')) {
                    feedstock = 'food_waste';
                    ci = -15;
                  } else if (cat.includes('sewage') || cat.includes('sludge')) {
                    feedstock = 'sewage_sludge';
                    ci = 24;
                  } else if (cat.includes('straw') || cat.includes('agricultural residue')) {
                    feedstock = 'straw';
                    ci = 16;
                  } else if (cat.includes('crop') || cat.includes('silage')) {
                    feedstock = 'energy_crops';
                    ci = 40;
                  } else if (cat.includes('industrial') || cat.includes('whey')) {
                    feedstock = 'industrial_biowaste';
                    ci = 10;
                  }

                  const cIso = (selectedPlant.countryCode || '').toUpperCase();
                  let marketId = 'DE_THG';
                  if (cIso === 'GB' || cIso === 'UK') marketId = 'UK_RTFO';
                  else if (cIso === 'NL') marketId = 'NL_ERE';
                  else if (cIso === 'FR') marketId = 'FR_CPB';
                  else if (cIso === 'IT') marketId = 'IT_CIC';
                  else if (cIso === 'SE') marketId = 'FUELEU';
                  else if (cIso === 'CH') marketId = 'VOL_SCOPE1';

                  const volMwh = selectedPlant.annualEnergyGWh 
                    ? Math.round(selectedPlant.annualEnergyGWh * 1000) 
                    : undefined;

                  navigate(buildDealUrl({
                    originCountry: selectedPlant.countryCode,
                    marketId,
                    feedstock,
                    ci,
                    volume: volMwh,
                    counterparty: selectedPlant.legalEntityName || selectedPlant.operator || `Asset Source (${selectedPlant.name})`,
                    plantId: selectedPlant.id,
                    plantName: selectedPlant.name,
                    plantCapacityNm3h: selectedPlant.capacityNm3h || undefined,
                    plantAnnualGWh: selectedPlant.annualEnergyGWh || undefined,
                    legalEntityName: selectedPlant.legalEntityName || undefined,
                    networkOperator: selectedPlant.networkOperator || undefined,
                    contactEmail: selectedPlant.contactEmail || undefined,
                    contactPhone: selectedPlant.contactPhone || undefined,
                  }));
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors shadow-xs"
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
