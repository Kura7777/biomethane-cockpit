import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  COMBINED_BIOMETHANE_PLANTS,
  COUNTRY_MACRO_STATS,
} from '../../domain/plants/registry';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { OriginationPipelineScreen } from './OriginationPipelineScreen';
import { PlantSourcingDrawer } from './PlantSourcingDrawer';
import { PlantsKpiTiles } from './PlantsKpiTiles';
import { PlantsSidePanel } from './PlantsSidePanel';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';
import { PageShell } from '../../shared/ui/PageShell';
import { PageHeader, HeaderPill } from '../../shared/ui/PageHeader';
import { Tabs } from '../../shared/ui/Tabs';
import './plants.css';

type SortField = 'name' | 'operator' | 'annualEnergyGWh' | 'ci';
type SortDirection = 'asc' | 'desc';
type ActiveTab = 'CENSUS' | 'PIPELINE';
type PopoverKey = 'SCALE' | 'CONTACT' | 'MORE' | null;

const FEEDSTOCK_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'MANURE', label: 'Manure' },
  { value: 'ORGANIC_WASTE', label: 'Food waste' },
  { value: 'ENERGY_CROPS', label: 'Crops' },
  { value: 'SEWAGE', label: 'Sludge' },
  { value: 'LANDFILL', label: 'Landfill' },
];

function feedstockMatch(p: BiomethanePlant, selected: string): boolean {
  if (selected === 'ALL') return true;
  const feedStr = `${p.primaryFeedstockCategory || ''} ${p.feedstockDetails || ''}`.toLowerCase();
  if (selected === 'MANURE') {
    return (
      feedStr.includes('manure') ||
      feedStr.includes('slurry') ||
      feedStr.includes('gülle') ||
      feedStr.includes('lisier') ||
      (p.verifiedCarbonIntensity !== null && p.verifiedCarbonIntensity !== undefined && p.verifiedCarbonIntensity < 0)
    );
  }
  if (selected === 'ORGANIC_WASTE') {
    return (
      feedStr.includes('waste') ||
      feedStr.includes('abfall') ||
      feedStr.includes('déchet') ||
      feedStr.includes('forsu') ||
      feedStr.includes('bio-waste') ||
      feedStr.includes('biowaste') ||
      feedStr.includes('organic_waste') ||
      feedStr.includes('co-product')
    );
  }
  if (selected === 'ENERGY_CROPS') {
    return (
      feedStr.includes('crop') ||
      feedStr.includes('maize') ||
      feedStr.includes('mais') ||
      feedStr.includes('grass') ||
      feedStr.includes('cive') ||
      feedStr.includes('silage') ||
      feedStr.includes('energy_crops')
    );
  }
  if (selected === 'SEWAGE') {
    return (
      feedStr.includes('sewage') ||
      feedStr.includes('sludge') ||
      feedStr.includes('kläre') ||
      feedStr.includes('step') ||
      feedStr.includes('boue') ||
      feedStr.includes('wastewater') ||
      feedStr.includes("station d'épuration")
    );
  }
  if (selected === 'LANDFILL') {
    return (
      feedStr.includes('landfill') ||
      feedStr.includes('deponie') ||
      feedStr.includes('isdnd') ||
      feedStr.includes('waga') ||
      feedStr.includes('lfg')
    );
  }
  return true;
}

function contactStatus(plant: BiomethanePlant): { dot: 'amber' | 'grey' | 'red'; label: string } {
  const label = plant.contactQuality?.confidenceLabel || '';
  if (label.startsWith('Unverified Lead')) return { dot: 'amber', label: 'Unverified lead' };
  if (label.startsWith('Indirect')) return { dot: 'grey', label: 'Switchboard' };
  if (label.startsWith('Synthetic')) return { dot: 'red', label: 'Do not use' };
  return { dot: 'grey', label: 'No contact' };
}

export function PlantsScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('CENSUS');

  // ─── Filter State ───
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedFeedstock, setSelectedFeedstock] = useState<string>('ALL');
  const [selectedCiRange, setSelectedCiRange] = useState<string>('ALL');
  const [selectedScale, setSelectedScale] = useState<string>('ALL');
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [selectedGrid, setSelectedGrid] = useState<string>('ALL');
  const [selectedContact, setSelectedContact] = useState<string>('ALL');
  const [selectedMarket, setSelectedMarket] = useState<string>('ALL');

  // ─── Popover State ───
  const [openPopover, setOpenPopover] = useState<PopoverKey>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpenPopover(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Sorting & Pagination State ───
  const [sortField, setSortField] = useState<SortField>('annualEnergyGWh');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // ─── Selection & Drawer State ───
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [dossierPlant, setDossierPlant] = useState<BiomethanePlant | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDossierPlant(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCountry, selectedFeedstock, selectedCiRange, selectedScale, selectedTech, selectedGrid, selectedContact, selectedMarket]);

  // Country breakdown list with counts and flags
  const countryOptions = useMemo(() => {
    const counts: Record<string, { count: number; flag: string; name: string }> = {};
    for (const p of COMBINED_BIOMETHANE_PLANTS) {
      const code = p.countryCode || 'EU';
      if (!counts[code]) {
        counts[code] = { count: 0, flag: p.countryFlag || '🌍', name: p.country || code };
      }
      counts[code].count++;
    }
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  }, []);

  const isFiltered = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      selectedCountry !== 'ALL' ||
      selectedFeedstock !== 'ALL' ||
      selectedCiRange !== 'ALL' ||
      selectedScale !== 'ALL' ||
      selectedTech !== 'ALL' ||
      selectedGrid !== 'ALL' ||
      selectedContact !== 'ALL' ||
      selectedMarket !== 'ALL'
    );
  }, [searchQuery, selectedCountry, selectedFeedstock, selectedCiRange, selectedScale, selectedTech, selectedGrid, selectedContact, selectedMarket]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCountry('ALL');
    setSelectedFeedstock('ALL');
    setSelectedCiRange('ALL');
    setSelectedScale('ALL');
    setSelectedTech('ALL');
    setSelectedGrid('ALL');
    setSelectedContact('ALL');
    setSelectedMarket('ALL');
    setCurrentPage(1);
    showToast('All discovery filters reset', 'info');
  }, []);

  // Multi-facet filtering logic
  const filteredPlants = useMemo(() => {
    return COMBINED_BIOMETHANE_PLANTS.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.operator && p.operator.toLowerCase().includes(q)) ||
          (p.legalEntityName && p.legalEntityName.toLowerCase().includes(q)) ||
          (p.networkOperator && p.networkOperator.toLowerCase().includes(q)) ||
          (p.region && p.region.toLowerCase().includes(q)) ||
          (p.country && p.country.toLowerCase().includes(q)) ||
          (p.countryCode && p.countryCode.toLowerCase().includes(q)) ||
          (p.companyRegistrationId && p.companyRegistrationId.toLowerCase().includes(q)) ||
          (p.headquartersAddress && p.headquartersAddress.toLowerCase().includes(q)) ||
          (p.contactEmail && p.contactEmail.toLowerCase().includes(q)) ||
          (p.id && p.id.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (selectedCountry !== 'ALL' && (p.countryCode || '').toUpperCase() !== selectedCountry.toUpperCase()) return false;
      if (!feedstockMatch(p, selectedFeedstock)) return false;

      const ci = p.verifiedCarbonIntensity;
      if (selectedCiRange === 'DEEP_NEGATIVE') {
        if (ci === null || ci === undefined || ci >= -50) return false;
      } else if (selectedCiRange === 'SUB_ZERO') {
        if (ci === null || ci === undefined || ci >= 0) return false;
      } else if (selectedCiRange === 'LOW_POSITIVE') {
        if (ci === null || ci === undefined || ci < 0 || ci > 25) return false;
      } else if (selectedCiRange === 'STANDARD') {
        if (ci === null || ci === undefined || ci <= 25) return false;
      }

      const gwh = p.annualEnergyGWh || 0;
      const nm3 = p.capacityNm3h || 0;
      if (selectedScale === 'UTILITY') {
        if (gwh < 50 && nm3 < 600) return false;
      } else if (selectedScale === 'MEDIUM') {
        const isMidGwh = gwh >= 20 && gwh < 50;
        const isMidNm3 = nm3 >= 250 && nm3 < 600;
        if (!isMidGwh && !isMidNm3) return false;
      } else if (selectedScale === 'DISTRIBUTED') {
        if ((gwh >= 20 && gwh > 0) || (nm3 >= 250 && nm3 > 0)) return false;
      }

      const techStr = (p.upgradingTechnology || '').toLowerCase();
      if (selectedTech === 'MEMBRANE' && !techStr.includes('membrane')) return false;
      if (selectedTech === 'AMINE' && !(techStr.includes('amine') || techStr.includes('chemical'))) return false;
      if (selectedTech === 'WATER_SCRUBBING' && !(techStr.includes('water') || techStr.includes('scrubbing'))) return false;
      if (selectedTech === 'PSA' && !(techStr.includes('psa') || techStr.includes('pressure swing'))) return false;
      if (selectedTech === 'CRYOGENIC' && !(techStr.includes('cryogenic') || techStr.includes('waga'))) return false;

      const gridType = (p.gridConnectionType || '').toLowerCase();
      const netOp = (p.networkOperator || '').toLowerCase();
      if (selectedGrid === 'TSO') {
        const isTso =
          gridType.includes('transmission') ||
          gridType.includes('tso') ||
          netOp.includes('grtgaz') ||
          netOp.includes('terega') ||
          netOp.includes('fluxys') ||
          netOp.includes('energinet') ||
          netOp.includes('snam') ||
          netOp.includes('open grid') ||
          netOp.includes('gasgrid') ||
          netOp.includes('national grid') ||
          netOp.includes('gasunie');
        if (!isTso) return false;
      } else if (selectedGrid === 'DSO') {
        const isDso =
          gridType.includes('distribution') ||
          gridType.includes('dso') ||
          netOp.includes('grdf') ||
          netOp.includes('fluvius') ||
          netOp.includes('ores') ||
          netOp.includes('enexis') ||
          netOp.includes('liander') ||
          netOp.includes('stedin') ||
          netOp.includes('2i rete') ||
          netOp.includes('italgas') ||
          netOp.includes('cadent') ||
          netOp.includes('sgn') ||
          netOp.includes('wwu') ||
          netOp.includes('northern gas') ||
          netOp.includes('nedgia') ||
          netOp.includes('redexis');
        if (!isDso) return false;
      } else if (selectedGrid === 'OFF_GRID') {
        const isOffGrid = gridType.includes('off-grid') || gridType.includes('direct') || gridType.includes('lng') || gridType.includes('cng');
        if (!isOffGrid) return false;
      }

      if (selectedContact === 'UNVERIFIED_LEAD' && p.contactQuality?.confidence !== 'UNVERIFIED_LEAD') return false;
      if (selectedContact === 'INDIRECT' && p.contactQuality?.confidence !== 'INDIRECT') return false;
      if (selectedContact === 'UNDELIVERABLE' && p.contactQuality?.confidence !== 'UNDELIVERABLE') return false;
      if (selectedContact === 'GDPR_RISK' && !p.contactQuality?.isPersonalEmail) return false;
      if (selectedContact === 'WITH_EMAIL' && (!p.contactEmail || !p.contactEmail.includes('@'))) return false;
      if (selectedContact === 'WITH_PHONE' && (!p.contactPhone || p.contactPhone.length < 5)) return false;
      if (selectedContact === 'WITH_WEBSITE' && (!p.corporateWebsite || !p.corporateWebsite.startsWith('http'))) return false;
      if (selectedContact === 'NO_CONTACT' && (p.contactEmail || p.contactPhone)) return false;

      if (selectedMarket !== 'ALL') {
        const off = (p.primaryOfftake || '').toUpperCase();
        const sup = (p.supportScheme || '').toUpperCase();
        const isMatch = off.includes(selectedMarket) || sup.includes(selectedMarket);
        if (!isMatch) {
          if (selectedMarket === 'DE_THG' && p.countryCode !== 'DE') return false;
          if (selectedMarket === 'UK_RTFO' && p.countryCode !== 'GB') return false;
          if (selectedMarket === 'IT_CIC' && p.countryCode !== 'IT') return false;
          if (selectedMarket === 'FR_CPB' && p.countryCode !== 'FR') return false;
          if (selectedMarket === 'NL_ERE' && p.countryCode !== 'NL') return false;
          if (selectedMarket === 'UK_RGGO' && p.countryCode !== 'GB') return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedCountry, selectedFeedstock, selectedCiRange, selectedScale, selectedTech, selectedGrid, selectedContact, selectedMarket]);

  const sortedPlants = useMemo(() => {
    return [...filteredPlants].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'operator':
          valA = (a.operator || a.legalEntityName || '').toLowerCase();
          valB = (b.operator || b.legalEntityName || '').toLowerCase();
          break;
        case 'annualEnergyGWh':
          valA = a.annualEnergyGWh || 0;
          valB = b.annualEnergyGWh || 0;
          break;
        case 'ci':
          valA = a.verifiedCarbonIntensity ?? 999;
          valB = b.verifiedCarbonIntensity ?? 999;
          break;
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredPlants, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedPlants.length / pageSize) || 1;
  const paginatedPlants = useMemo(() => {
    if (pageSize === -1) return sortedPlants;
    const start = (currentPage - 1) * pageSize;
    return sortedPlants.slice(start, start + pageSize);
  }, [sortedPlants, currentPage, pageSize]);

  // Default selection: first row on page; keep selection valid as filters/page change.
  useEffect(() => {
    if (paginatedPlants.length === 0) {
      if (selectedPlantId !== null) setSelectedPlantId(null);
      return;
    }
    if (!paginatedPlants.some(p => p.id === selectedPlantId)) {
      setSelectedPlantId(paginatedPlants[0].id);
    }
  }, [paginatedPlants, selectedPlantId]);

  const selectedPlant = paginatedPlants.find(p => p.id === selectedPlantId) || null;

  const maxOutputOnPage = useMemo(() => paginatedPlants.reduce((m, p) => Math.max(m, p.annualEnergyGWh || 0), 0) || 1, [paginatedPlants]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'annualEnergyGWh' ? 'desc' : 'asc');
    }
  };

  const sortIcon = (field: SortField) =>
    sortField === field ? (
      sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
    ) : (
      <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
    );

  // 1-Click Launch into Trade Builder ("Price a deal")
  const handlePriceDeal = useCallback(
    (plant: BiomethanePlant) => {
      const defaultMarket = plant.countryCode === 'GB' ? 'UK_RTFO' : plant.countryCode === 'FR' ? 'FR_CPB' : plant.countryCode === 'IT' ? 'IT_CIC' : 'DE_THG';
      const volumeMWh = plant.annualEnergyGWh ? Math.round(plant.annualEnergyGWh * 1000) : 20000;
      const feedStr = `${plant.primaryFeedstockCategory || ''} ${plant.feedstockDetails || ''}`.toLowerCase();
      const feedKey = feedStr.includes('manure') || feedStr.includes('slurry') ? 'manure' : feedStr.includes('crop') ? 'energy_crops' : 'organic_waste';
      const ciVal = plant.verifiedCarbonIntensity ?? (feedKey === 'manure' ? -78 : feedKey === 'energy_crops' ? 39 : 16);

      const dealUrl = buildDealUrl({
        marketId: defaultMarket,
        originCountry: plant.countryCode,
        feedstock: feedKey,
        ci: ciVal,
        ciIsEstimated: true, // census CI is a feedstock default, not an audited PoS value
        volume: volumeMWh,
        plantId: plant.id,
        plantName: plant.name,
        plantCapacityNm3h: plant.capacityNm3h ?? undefined,
        plantAnnualGWh: plant.annualEnergyGWh ?? undefined,
        legalEntityName: plant.legalEntityName || plant.operator || undefined,
        networkOperator: plant.networkOperator || undefined,
        contactEmail: plant.contactEmail || undefined,
        contactPhone: plant.contactPhone || undefined,
      });
      navigate(dealUrl);
      showToast(`Loaded ${plant.name} into Trade Builder`, 'success');
    },
    [navigate]
  );

  const handleExportCsv = () => {
    const headers = [
      'Plant ID', 'Plant Name', 'Country', 'ISO', 'Operator', 'Legal Entity', 'Registration ID',
      'Grid Operator', 'Grid Level', 'Capacity (Nm3/h)', 'Annual Energy (GWh/y)', 'Primary Feedstock',
      'Feedstock Details', 'CI, feedstock default (gCO2e/MJ)', 'Upgrading Tech', 'Commissioning Year', 'Website',
      'Contact Email', 'Contact Phone', 'Address', 'Verified',
    ];
    const rows = sortedPlants.map(p => [
      `"${p.id || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.country || '').replace(/"/g, '""')}"`,
      `"${p.countryCode || ''}"`,
      `"${(p.operator || '').replace(/"/g, '""')}"`,
      `"${(p.legalEntityName || '').replace(/"/g, '""')}"`,
      `"${(p.companyRegistrationId || '').replace(/"/g, '""')}"`,
      `"${(p.networkOperator || '').replace(/"/g, '""')}"`,
      `"${(p.gridConnectionType || '').replace(/"/g, '""')}"`,
      p.capacityNm3h ?? '',
      p.annualEnergyGWh ?? '',
      `"${(p.primaryFeedstockCategory || '').replace(/"/g, '""')}"`,
      `"${(p.feedstockDetails || '').replace(/"/g, '""')}"`,
      p.verifiedCarbonIntensity ?? '',
      `"${(p.upgradingTechnology || '').replace(/"/g, '""')}"`,
      p.commissioningYear ?? '',
      `"${p.corporateWebsite || ''}"`,
      `"${p.contactEmail || ''}"`,
      `"${p.contactPhone || ''}"`,
      `"${(p.headquartersAddress || '').replace(/"/g, '""')}"`,
      p.isVerified ? 'YES' : 'NO',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `biomethane_census_filtered_${sortedPlants.length}_plants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${sortedPlants.length} facilities to CSV`, 'success');
  };

  const maxMacroPlants = useMemo(() => Math.max(...COUNTRY_MACRO_STATS.map(c => c.activePlants), 1), []);

  const registerConfirmedCount = useMemo(() => COMBINED_BIOMETHANE_PLANTS.filter(p => p.companyRegistrationId).length, []);
  const deskVerifiedCount = useMemo(() => COMBINED_BIOMETHANE_PLANTS.filter(p => p.deskOverride).length, []);

  const renderCiChip = (ci: number | null | undefined) => {
    if (ci === null || ci === undefined) return <span className="plants-sub">—</span>;
    const negative = ci < 0;
    return (
      <span className={`plants-ci-chip ${negative ? 'neg' : ''} num`}>
        {negative ? '−' : ''}
        {Math.abs(ci).toFixed(1)}
      </span>
    );
  };

  return (
    <div className="plants-screen">
      <PageShell>
        <PageHeader
          title="Plants"
          context={`GIE/EBA European Biomethane Map 2026 · ${COMBINED_BIOMETHANE_PLANTS.length.toLocaleString()} facilities · ${countryOptions.length} countries · CI shown as feedstock defaults`}
          actions={
            <>
              <HeaderPill label="Register-confirmed IDs" value={registerConfirmedCount.toLocaleString()} />
              <HeaderPill label="Desk-verified contacts" value={deskVerifiedCount.toLocaleString()} />
              <button type="button" className="btn btn-secondary plants-export-btn" onClick={handleExportCsv} title="Download the currently filtered facilities as a CSV spreadsheet">
                <Download size={13} /> Export
              </button>
            </>
          }
        />
      </PageShell>

      <Tabs<'CENSUS' | 'PIPELINE' | 'REGISTRIES'>
        activeTab={activeTab}
        onChange={tab => {
          if (tab === 'REGISTRIES') {
            navigate('/registries');
            return;
          }
          setActiveTab(tab);
        }}
        ariaLabel="Plants sections"
        tabs={[
          { id: 'CENSUS', label: `Census ${COMBINED_BIOMETHANE_PLANTS.length.toLocaleString()}` },
          { id: 'PIPELINE', label: 'Origination pipeline' },
          { id: 'REGISTRIES', label: 'Registries & flows' },
        ]}
      />

      {activeTab === 'PIPELINE' ? (
        <OriginationPipelineScreen />
      ) : (
        <PageShell className="plants-body">
          <PlantsKpiTiles plants={filteredPlants} />

          <div className="plants-toolbar">
            <label className="ds-search">
              <Search size={14} />
              <input
                type="search"
                placeholder="Plant, operator, city, TSO"
                aria-label="Filter facility name"
                data-testid="plant-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </label>

            <select
              className="input plants-country-select"
              aria-label="Country"
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
            >
              <option value="ALL">All countries ({COMBINED_BIOMETHANE_PLANTS.length})</option>
              {countryOptions.map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.flag} {meta.name} ({code} · {meta.count})
                </option>
              ))}
            </select>

            <div className="seg" role="group" aria-label="Feedstock">
              {FEEDSTOCK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`seg-opt ${selectedFeedstock === opt.value ? 'active' : ''}`}
                  onClick={() => setSelectedFeedstock(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div ref={popoverRef} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
              <button
                type="button"
                className={`ds-filter-btn ${selectedScale !== 'ALL' ? 'active' : ''}`}
                onClick={() => setOpenPopover(o => (o === 'SCALE' ? null : 'SCALE'))}
              >
                {selectedScale === 'ALL' ? '+ Scale' : `Scale: ${selectedScale}`}
              </button>
              {openPopover === 'SCALE' && (
                <div className="plants-popover" role="menu">
                  {[
                    { v: 'ALL', l: 'All capacity scales' },
                    { v: 'UTILITY', l: 'Utility scale (> 50 GWh/y)' },
                    { v: 'MEDIUM', l: 'Medium scale (20–50 GWh/y)' },
                    { v: 'DISTRIBUTED', l: 'Distributed (< 20 GWh/y)' },
                  ].map(o => (
                    <button key={o.v} type="button" className={selectedScale === o.v ? 'active' : ''} onClick={() => { setSelectedScale(o.v); setOpenPopover(null); }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className={`ds-filter-btn ${selectedContact !== 'ALL' ? 'active' : ''}`}
                onClick={() => setOpenPopover(o => (o === 'CONTACT' ? null : 'CONTACT'))}
              >
                {selectedContact === 'ALL' ? '+ Contact status' : `Contact: ${selectedContact}`}
              </button>
              {openPopover === 'CONTACT' && (
                <div className="plants-popover" role="menu">
                  {[
                    { v: 'ALL', l: 'All contact tiers' },
                    { v: 'UNVERIFIED_LEAD', l: 'Unverified lead' },
                    { v: 'INDIRECT', l: 'Indirect / shared switchboard' },
                    { v: 'UNDELIVERABLE', l: 'Synthetic address (do not use)' },
                    { v: 'GDPR_RISK', l: 'GDPR risk (personal mailbox)' },
                    { v: 'WITH_EMAIL', l: 'Has email address' },
                    { v: 'WITH_PHONE', l: 'Has telephone' },
                    { v: 'WITH_WEBSITE', l: 'Corporate website' },
                    { v: 'NO_CONTACT', l: 'No contact published' },
                  ].map(o => (
                    <button key={o.v} type="button" className={selectedContact === o.v ? 'active' : ''} onClick={() => { setSelectedContact(o.v); setOpenPopover(null); }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className={`ds-filter-btn ${(selectedCiRange !== 'ALL' || selectedTech !== 'ALL' || selectedGrid !== 'ALL' || selectedMarket !== 'ALL') ? 'active' : ''}`}
                onClick={() => setOpenPopover(o => (o === 'MORE' ? null : 'MORE'))}
              >
                + More
              </button>
              {openPopover === 'MORE' && (
                <div className="plants-popover plants-popover-wide" role="menu">
                  <div className="plants-popover-heading">Saved views</div>
                  <div className="plants-popover-row">
                    <button type="button" onClick={() => { resetAllFilters(); setOpenPopover(null); }}>All facilities</button>
                    <button type="button" onClick={() => { resetAllFilters(); setSelectedFeedstock('MANURE'); setOpenPopover(null); }}>Negative-CI manure</button>
                    <button type="button" onClick={() => { resetAllFilters(); setSelectedScale('UTILITY'); setOpenPopover(null); }}>Utility scale (&gt;50 GWh)</button>
                    <button type="button" onClick={() => { resetAllFilters(); setSelectedContact('UNVERIFIED_LEAD'); setOpenPopover(null); }}>Unverified leads</button>
                    <button type="button" onClick={() => { resetAllFilters(); setSelectedContact('UNDELIVERABLE'); setOpenPopover(null); }}>Dead domains</button>
                  </div>
                  <div className="plants-popover-heading">Carbon intensity range</div>
                  <select className="input" value={selectedCiRange} onChange={e => setSelectedCiRange(e.target.value)}>
                    <option value="ALL">All carbon intensities</option>
                    <option value="DEEP_NEGATIVE">Deep negative (&lt; -50 g/MJ)</option>
                    <option value="SUB_ZERO">Sub-zero (&lt; 0 g/MJ)</option>
                    <option value="LOW_POSITIVE">Low positive (0–25 g/MJ)</option>
                    <option value="STANDARD">Standard (&gt; 25 g/MJ)</option>
                  </select>
                  <div className="plants-popover-heading">Upgrading technology</div>
                  <select className="input" value={selectedTech} onChange={e => setSelectedTech(e.target.value)}>
                    <option value="ALL">All upgrading tech</option>
                    <option value="MEMBRANE">Membrane separation</option>
                    <option value="AMINE">Amine / chemical scrubbing</option>
                    <option value="WATER_SCRUBBING">Water scrubbing</option>
                    <option value="PSA">Pressure swing adsorption (PSA)</option>
                    <option value="CRYOGENIC">Cryogenic separation (WAGABOX)</option>
                  </select>
                  <div className="plants-popover-heading">Grid tier</div>
                  <select className="input" value={selectedGrid} onChange={e => setSelectedGrid(e.target.value)}>
                    <option value="ALL">All grid tiers</option>
                    <option value="TSO">Transmission (GRTgaz, Terega, Snam…)</option>
                    <option value="DSO">Distribution (GRDF, Fluvius, Enexis…)</option>
                    <option value="OFF_GRID">Dedicated / off-grid (Bio-LNG)</option>
                  </select>
                  <div className="plants-popover-heading">Statutory market</div>
                  <select className="input" value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)}>
                    <option value="ALL">All markets</option>
                    <option value="DE_THG">DE — THG-Quote</option>
                    <option value="UK_RTFO">UK — RTFO</option>
                    <option value="IT_CIC">IT — CIC</option>
                    <option value="FR_CPB">FR — CPB</option>
                    <option value="NL_ERE">NL — ERE</option>
                    <option value="UK_RGGO">UK — RGGO</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {isFiltered && (
            <div className="plants-active-chips">
              {selectedCountry !== 'ALL' && (
                <span className="chip chip-a plants-filter-chip">
                  Country: {selectedCountry}
                  <button type="button" onClick={() => setSelectedCountry('ALL')} aria-label="Remove country filter">×</button>
                </span>
              )}
              {selectedFeedstock !== 'ALL' && (
                <span className="chip chip-a plants-filter-chip">
                  Feedstock: {FEEDSTOCK_OPTIONS.find(o => o.value === selectedFeedstock)?.label}
                  <button type="button" onClick={() => setSelectedFeedstock('ALL')} aria-label="Remove feedstock filter">×</button>
                </span>
              )}
              {selectedCiRange !== 'ALL' && (
                <span className="chip chip-a plants-filter-chip">
                  CI: {selectedCiRange}
                  <button type="button" onClick={() => setSelectedCiRange('ALL')} aria-label="Remove CI filter">×</button>
                </span>
              )}
              {selectedScale !== 'ALL' && (
                <span className="chip chip-a plants-filter-chip">
                  Scale: {selectedScale}
                  <button type="button" onClick={() => setSelectedScale('ALL')} aria-label="Remove scale filter">×</button>
                </span>
              )}
              {selectedTech !== 'ALL' && (
                <span className="chip chip-a plants-filter-chip">
                  Tech: {selectedTech}
                  <button type="button" onClick={() => setSelectedTech('ALL')} aria-label="Remove tech filter">×</button>
                </span>
              )}
              {selectedGrid !== 'ALL' && (
                <span className="chip chip-a plants-filter-chip">
                  Grid: {selectedGrid}
                  <button type="button" onClick={() => setSelectedGrid('ALL')} aria-label="Remove grid filter">×</button>
                </span>
              )}
              {selectedContact !== 'ALL' && (
                <span className="chip chip-a plants-filter-chip">
                  Contact: {selectedContact}
                  <button type="button" onClick={() => setSelectedContact('ALL')} aria-label="Remove contact filter">×</button>
                </span>
              )}
              {selectedMarket !== 'ALL' && (
                <span className="chip chip-a plants-filter-chip">
                  Market: {selectedMarket}
                  <button type="button" onClick={() => setSelectedMarket('ALL')} aria-label="Remove market filter">×</button>
                </span>
              )}
              <button type="button" className="plants-clear-all" onClick={resetAllFilters}>Clear all</button>
            </div>
          )}

          <div className="plants-protocol-line">
            Origination protocol: census email/phone records are unverified leads, indirect switchboards, or synthetic placeholders. Filter targets here, then verify operating entity and authorized signatories in the official national register (MaStR, Evida, AGCS, Infogreffe, Companies House) prior to commercial outreach.
          </div>

          <div className="plants-grid">
            <div className="plants-table-col">
              {sortedPlants.length === 0 ? (
                <div className="plants-empty">
                  <h4>No matching facility found for your active filter criteria</h4>
                  <p>Try broadening your search query or reset one or more discovery filters (feedstock, capacity, CI range, or grid operator).</p>
                  <button type="button" className="btn btn-primary" onClick={resetAllFilters} data-testid="clear-filter-btn">
                    Clear filter / Reset all filters
                  </button>
                </div>
              ) : (
                <div className="ds-table-wrap plants-table-wrap">
                  <div className="ds-thead-row plants-table-cols">
                    <div>
                      <button type="button" onClick={() => handleSort('name')}>
                        <span>Plant</span> {sortIcon('name')}
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => handleSort('operator')}>
                        <span>Operator</span> {sortIcon('operator')}
                      </button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button type="button" onClick={() => handleSort('annualEnergyGWh')} style={{ marginLeft: 'auto' }}>
                        <span>Output</span> {sortIcon('annualEnergyGWh')}
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => handleSort('ci')}>
                        <span>Feedstock · CI</span> {sortIcon('ci')}
                      </button>
                    </div>
                    <div className="plants-col-grid">Grid</div>
                    <div>Contact</div>
                  </div>

                  <div role="listbox" aria-label="Plant directory">
                    {paginatedPlants.map(p => {
                      const status = contactStatus(p);
                      const barWidth = maxOutputOnPage > 0 ? Math.max(2, ((p.annualEnergyGWh || 0) / maxOutputOnPage) * 44) : 0;
                      const isSelected = p.id === selectedPlantId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`ds-row plants-table-cols ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedPlantId(p.id)}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div className="ds-row-name">{p.name}</div>
                            <div className="ds-row-meta">
                              <span className="num plants-iso-tag">{p.countryCode}</span>
                              {p.region && <> · {p.region}</>}
                            </div>
                          </div>
                          <div className="plants-operator-cell" title={p.legalEntityName || p.operator || ''}>
                            {p.legalEntityName || p.operator || '—'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <div className="plants-output-bar-track">
                              <div className="plants-output-bar-fill" style={{ width: `${barWidth}px` }} />
                            </div>
                            <span className="num" style={{ whiteSpace: 'nowrap' }}>{p.annualEnergyGWh ? p.annualEnergyGWh.toFixed(1) : '—'}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="plants-feedstock-cell">{p.primaryFeedstockCategory || 'Agricultural / Waste'}</div>
                            {renderCiChip(p.verifiedCarbonIntensity)}
                          </div>
                          <div className="plants-col-grid plants-grid-cell">
                            <div title={p.networkOperator || ''}>{p.networkOperator || '—'}</div>
                            <div className="plants-sub">{p.gridConnectionType?.includes('Transmission') ? 'TSO' : 'DSO'}</div>
                          </div>
                          <div className="plants-contact-status">
                            <span className={`plants-dot plants-dot-${status.dot}`} />
                            {status.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="ds-tfoot">
                    <div>
                      Showing <span className="num font-semibold">{sortedPlants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span>–
                      <span className="num font-semibold">{pageSize === -1 ? sortedPlants.length : Math.min(currentPage * pageSize, sortedPlants.length)}</span> of{' '}
                      <span className="num font-semibold">{sortedPlants.length.toLocaleString()}</span>
                    </div>
                    <div className="ds-tfoot-right">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="plants-page-label">Per page:</span>
                        <select
                          className="input plants-page-select"
                          value={pageSize}
                          onChange={e => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={250}>250</option>
                          <option value={-1}>All</option>
                        </select>
                      </div>
                      {pageSize !== -1 && totalPages > 1 && (
                        <div className="ds-pagination">
                          <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                            <ChevronLeft size={14} />
                          </button>
                          <span className="ds-pagination-label num">{currentPage} / {totalPages}</span>
                          <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <PlantsSidePanel
              plant={selectedPlant}
              countryStats={COUNTRY_MACRO_STATS}
              maxCountryPlants={maxMacroPlants}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
              onClose={() => setSelectedPlantId(null)}
              onPriceDeal={handlePriceDeal}
              onOpenDossier={setDossierPlant}
            />
          </div>
        </PageShell>
      )}

      {dossierPlant && <PlantSourcingDrawer plant={dossierPlant} onClose={() => setDossierPlant(null)} />}
    </div>
  );
}
