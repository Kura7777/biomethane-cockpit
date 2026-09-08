import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  COMBINED_BIOMETHANE_PLANTS,
  COUNTRY_MACRO_STATS, 
  searchPlants 
} from '../../domain/plants/registry';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { OriginationPipelineScreen } from './OriginationPipelineScreen';
import { PlantSourcingDrawer } from './PlantSourcingDrawer';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  Mail, 
  Phone, 
  Globe2, 
  ArrowUp, 
  ArrowDown, 
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  ExternalLink
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';

type SortField = 'country' | 'name' | 'operator' | 'capacityNm3h' | 'annualEnergyGWh' | 'ci' | 'year';
type SortDirection = 'asc' | 'desc';

export function PlantsScreen() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'CENSUS' | 'PIPELINE'>('CENSUS');
  
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

  // ─── Sorting & Pagination State ───
  const [sortField, setSortField] = useState<SortField>('annualEnergyGWh');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // ─── Drawer Modal State ───
  const [modalPlant, setModalPlant] = useState<BiomethanePlant | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalPlant(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCountry,
    selectedFeedstock,
    selectedCiRange,
    selectedScale,
    selectedTech,
    selectedGrid,
    selectedContact,
    selectedMarket,
  ]);

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

  // Check if any filter is active
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
  }, [
    searchQuery,
    selectedCountry,
    selectedFeedstock,
    selectedCiRange,
    selectedScale,
    selectedTech,
    selectedGrid,
    selectedContact,
    selectedMarket,
  ]);

  // Reset all filters
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
      // 1. Full-text search
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

      // 2. Country filter
      if (selectedCountry !== 'ALL' && (p.countryCode || '').toUpperCase() !== selectedCountry.toUpperCase()) {
        return false;
      }

      // 3. Feedstock filter
      const feedStr = `${p.primaryFeedstockCategory || ''} ${p.feedstockDetails || ''}`.toLowerCase();
      if (selectedFeedstock === 'MANURE') {
        const isManure =
          feedStr.includes('manure') ||
          feedStr.includes('slurry') ||
          feedStr.includes('gülle') ||
          feedStr.includes('lisier') ||
          (p.verifiedCarbonIntensity !== null && p.verifiedCarbonIntensity !== undefined && p.verifiedCarbonIntensity < 0);
        if (!isManure) return false;
      } else if (selectedFeedstock === 'ORGANIC_WASTE') {
        const isWaste =
          feedStr.includes('waste') ||
          feedStr.includes('abfall') ||
          feedStr.includes('déchet') ||
          feedStr.includes('forsu') ||
          feedStr.includes('bio-waste') ||
          feedStr.includes('biowaste') ||
          feedStr.includes('organic_waste') ||
          feedStr.includes('co-product');
        if (!isWaste) return false;
      } else if (selectedFeedstock === 'ENERGY_CROPS') {
        const isCrops =
          feedStr.includes('crop') ||
          feedStr.includes('maize') ||
          feedStr.includes('mais') ||
          feedStr.includes('grass') ||
          feedStr.includes('cive') ||
          feedStr.includes('silage') ||
          feedStr.includes('energy_crops');
        if (!isCrops) return false;
      } else if (selectedFeedstock === 'SEWAGE') {
        const isSewage =
          feedStr.includes('sewage') ||
          feedStr.includes('sludge') ||
          feedStr.includes('kläre') ||
          feedStr.includes('step') ||
          feedStr.includes('boue') ||
          feedStr.includes('wastewater') ||
          feedStr.includes('station d\'épuration');
        if (!isSewage) return false;
      } else if (selectedFeedstock === 'LANDFILL') {
        const isLandfill =
          feedStr.includes('landfill') ||
          feedStr.includes('deponie') ||
          feedStr.includes('isdnd') ||
          feedStr.includes('waga') ||
          feedStr.includes('lfg');
        if (!isLandfill) return false;
      }

      // 4. CI Range filter
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

      // 5. Scale / Capacity Band filter
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

      // 6. Upgrading Tech filter
      const techStr = (p.upgradingTechnology || '').toLowerCase();
      if (selectedTech === 'MEMBRANE' && !techStr.includes('membrane')) return false;
      if (selectedTech === 'AMINE' && !(techStr.includes('amine') || techStr.includes('chemical'))) return false;
      if (selectedTech === 'WATER_SCRUBBING' && !(techStr.includes('water') || techStr.includes('scrubbing'))) return false;
      if (selectedTech === 'PSA' && !(techStr.includes('psa') || techStr.includes('pressure swing'))) return false;
      if (selectedTech === 'CRYOGENIC' && !(techStr.includes('cryogenic') || techStr.includes('waga'))) return false;

      // 7. Grid Operator Tier filter
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
        const isOffGrid =
          gridType.includes('off-grid') ||
          gridType.includes('direct') ||
          gridType.includes('lng') ||
          gridType.includes('cng');
        if (!isOffGrid) return false;
      }

      // 8. Contact & Outreach filter
      if (selectedContact === 'WITH_EMAIL' && (!p.contactEmail || !p.contactEmail.includes('@'))) return false;
      if (selectedContact === 'WITH_PHONE' && (!p.contactPhone || p.contactPhone.length < 5)) return false;
      if (selectedContact === 'WITH_WEBSITE' && (!p.corporateWebsite || !p.corporateWebsite.startsWith('http'))) return false;
      if (selectedContact === 'VERIFIED' && !p.isVerified) return false;

      // 9. Statutory Market filter
      if (selectedMarket !== 'ALL') {
        const off = (p.primaryOfftake || '').toUpperCase();
        const sup = (p.supportScheme || '').toUpperCase();
        const isMatch = off.includes(selectedMarket) || sup.includes(selectedMarket);
        if (!isMatch) {
          // Check country defaults
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
  }, [
    searchQuery,
    selectedCountry,
    selectedFeedstock,
    selectedCiRange,
    selectedScale,
    selectedTech,
    selectedGrid,
    selectedContact,
    selectedMarket,
  ]);

  // Sorting
  const sortedPlants = useMemo(() => {
    return [...filteredPlants].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'country':
          valA = a.countryCode || '';
          valB = b.countryCode || '';
          break;
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'operator':
          valA = (a.operator || a.legalEntityName || '').toLowerCase();
          valB = (b.operator || b.legalEntityName || '').toLowerCase();
          break;
        case 'capacityNm3h':
          valA = a.capacityNm3h || 0;
          valB = b.capacityNm3h || 0;
          break;
        case 'annualEnergyGWh':
          valA = a.annualEnergyGWh || 0;
          valB = b.annualEnergyGWh || 0;
          break;
        case 'ci':
          valA = a.verifiedCarbonIntensity ?? 999;
          valB = b.verifiedCarbonIntensity ?? 999;
          break;
        case 'year':
          valA = a.commissioningYear || 0;
          valB = b.commissioningYear || 0;
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredPlants, sortField, sortDirection]);

  // Pagination slice
  const totalPages = Math.ceil(sortedPlants.length / pageSize) || 1;
  const paginatedPlants = useMemo(() => {
    if (pageSize === -1) return sortedPlants;
    const start = (currentPage - 1) * pageSize;
    return sortedPlants.slice(start, start + pageSize);
  }, [sortedPlants, currentPage, pageSize]);

  // Handle header sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'annualEnergyGWh' || field === 'capacityNm3h' ? 'desc' : 'asc');
    }
  };

  // 1-Click Launch into Trade Builder
  const handleLaunchTrade = (e: React.MouseEvent, plant: BiomethanePlant) => {
    e.stopPropagation();
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
      ciIsEstimated: !plant.verifiedCarbonIntensity,
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
  };

  // CSV Export of current filtered dataset
  const handleExportCsv = () => {
    const headers = [
      'Plant ID',
      'Plant Name',
      'Country',
      'ISO',
      'Operator',
      'Legal Entity',
      'Registration ID',
      'Grid Operator',
      'Grid Level',
      'Capacity (Nm3/h)',
      'Annual Energy (GWh/y)',
      'Primary Feedstock',
      'Feedstock Details',
      'Audited CI (gCO2e/MJ)',
      'Upgrading Tech',
      'Commissioning Year',
      'Website',
      'Contact Email',
      'Contact Phone',
      'Address',
      'Verified'
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
      p.isVerified ? 'YES' : 'NO'
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

  const maxMacroPlants = useMemo(() => {
    const values = COUNTRY_MACRO_STATS.map(c => c.activePlants);
    return Math.max(...values, 1);
  }, []);

  const renderUnrecorded = (val: string | number | null | undefined) => {
    if (val === null || val === undefined || val === '') {
      return <span style={{ color: 'var(--color-neutral-600)', fontStyle: 'italic' }}>—</span>;
    }
    return val;
  };

  // Helper for CI Badge styling
  const renderCiBadge = (ci: number | null | undefined) => {
    if (ci === null || ci === undefined) {
      return <span style={{ color: 'var(--color-neutral-600)' }}>—</span>;
    }
    let bg = 'var(--color-neutral-200)';
    let color = 'var(--color-neutral-800)';
    if (ci < -50) {
      bg = 'rgba(16, 185, 129, 0.2)';
      color = '#10b981';
    } else if (ci < 0) {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = '#059669';
    } else if (ci <= 25) {
      bg = 'rgba(6, 182, 212, 0.12)';
      color = '#0891b2';
    } else {
      bg = 'rgba(245, 158, 11, 0.12)';
      color = '#d97706';
    }

    return (
      <span style={{
        backgroundColor: bg,
        color: color,
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: 700,
        fontSize: '11px',
        display: 'inline-block',
        letterSpacing: '0.02em',
        fontFamily: 'monospace'
      }}>
        {ci.toFixed(1)} <span style={{ fontSize: '9px', opacity: 0.8 }}>g/MJ</span>
      </span>
    );
  };

  const formatExternalUrl = (url?: string | null) => {
    if (!url) return '#';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Top Workspace Tab Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 18px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '2px solid var(--color-divider)',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} /> PLANTS DESK:
        </span>
        <button
          type="button"
          className={`chip ${viewMode === 'CENSUS' ? 'chip-a' : ''}`}
          onClick={() => setViewMode('CENSUS')}
          style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🇪🇺 European Biomethane Census ({COMBINED_BIOMETHANE_PLANTS.length.toLocaleString()})
        </button>
        <button
          type="button"
          className={`chip ${viewMode === 'PIPELINE' ? 'chip-a' : ''}`}
          onClick={() => setViewMode('PIPELINE')}
          style={{ 
            fontWeight: 700,
            borderColor: viewMode === 'PIPELINE' ? 'rgba(16, 185, 129, 0.8)' : undefined,
            color: viewMode === 'PIPELINE' ? '#10b981' : undefined,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ⚡ Pan-European Origination Pipeline ({COMBINED_BIOMETHANE_PLANTS.length.toLocaleString()})
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '5px 12px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/registries')}
          >
            Registries & Flows →
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '5px 12px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/trade')}
          >
            Trade Desk →
          </button>
        </div>
      </div>

      {viewMode === 'PIPELINE' ? (
        <OriginationPipelineScreen />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 300px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* ─── Left Column: Table & Filters ─── */}
            <div
              style={{
                borderRight: '2px solid var(--color-divider)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              {/* Top Banner & Quick Presets */}
              <div
                style={{
                  padding: '14px 18px 10px',
                  borderBottom: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 className="ptitle" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Institutional Biomethane Census
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-dim)', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--color-surface-sunken)' }}>
                        {COMBINED_BIOMETHANE_PLANTS.length.toLocaleString()} Facilities · 20 Jurisdictions
                      </span>
                    </h3>
                    <div className="subttl" style={{ marginTop: '2px' }}>
                      Audited European facility directory with statutory SIREN/PITD/HRB IDs, grid operators, contacts, and RED III carbon intensities.
                    </div>
                  </div>

                  {/* Export & Reset Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isFiltered && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px', height: '30px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={resetAllFilters}
                      >
                        <RotateCcw size={12} /> Reset Filters
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 10px', height: '30px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      onClick={handleExportCsv}
                      title="Download the currently filtered facilities as a CSV spreadsheet"
                    >
                      <Download size={12} /> Export CSV ({sortedPlants.length})
                    </button>
                  </div>
                </div>

                {/* Quick Preset Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }} className="noscroll">
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Quick:
                  </span>
                  <button
                    type="button"
                    className={`chip ${!isFiltered ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={resetAllFilters}
                  >
                    All ({COMBINED_BIOMETHANE_PLANTS.length})
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedFeedstock === 'MANURE' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px', color: selectedFeedstock === 'MANURE' ? '#10b981' : undefined }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedFeedstock('MANURE');
                    }}
                  >
                    🐮 Negative CI Manure
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedScale === 'UTILITY' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedScale('UTILITY');
                    }}
                  >
                    ⚡ Utility Scale (&gt;50 GWh)
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedContact === 'WITH_EMAIL' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedContact('WITH_EMAIL');
                    }}
                  >
                    ✉️ Direct Email Available
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedCountry === 'FR' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedCountry('FR');
                    }}
                  >
                    🇫🇷 FR (652)
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedCountry === 'DE' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedCountry('DE');
                    }}
                  >
                    🇩🇪 DE (242)
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedCountry === 'GB' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedCountry('GB');
                    }}
                  >
                    🇬🇧 GB (185)
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedCountry === 'IT' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedCountry('IT');
                    }}
                  >
                    🇮🇹 IT (112)
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedCountry === 'NL' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedCountry('NL');
                    }}
                  >
                    🇳🇱 NL (89)
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedCountry === 'DK' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedCountry('DK');
                    }}
                  >
                    🇩🇰 DK (64)
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedCountry === 'ES' ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      resetAllFilters();
                      setSelectedCountry('ES');
                    }}
                  >
                    🇪🇸 ES (42)
                  </button>
                </div>
              </div>

              {/* ─── Multi-Facet Filter Control Bar ─── */}
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '2px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '10px',
                  alignItems: 'center'
                }}
              >
                {/* 1. Full-text search */}
                <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-dim)' }} />
                  <input
                    className="input"
                    style={{ width: '100%', paddingLeft: '32px', height: '34px', fontSize: '12px' }}
                    placeholder="Search plant, operator, SIREN, city, TSO..."
                    aria-label="Search plant registry"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-dim)', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 2. Country Selector */}
                <div>
                  <select
                    className="input"
                    style={{ width: '100%', height: '34px', fontSize: '12px', fontWeight: 600 }}
                    value={selectedCountry}
                    onChange={e => setSelectedCountry(e.target.value)}
                  >
                    <option value="ALL">🌍 All Countries ({COMBINED_BIOMETHANE_PLANTS.length})</option>
                    {countryOptions.map(([code, meta]) => (
                      <option key={code} value={code}>
                        {meta.flag} {meta.name} ({code} · {meta.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Feedstock Category */}
                <div>
                  <select
                    className="input"
                    style={{ width: '100%', height: '34px', fontSize: '12px' }}
                    value={selectedFeedstock}
                    onChange={e => setSelectedFeedstock(e.target.value)}
                  >
                    <option value="ALL">🌱 All Feedstocks</option>
                    <option value="MANURE">🐮 Manure & Slurry (Deep Negative)</option>
                    <option value="ORGANIC_WASTE">🥫 Bio-waste & Food Waste (Annex IX A)</option>
                    <option value="ENERGY_CROPS">🌽 Energy Crops & CIVE</option>
                    <option value="SEWAGE">💧 Sewage Sludge (STEP)</option>
                    <option value="LANDFILL">♻️ Landfill Gas (ISDND)</option>
                  </select>
                </div>

                {/* 4. Carbon Intensity Range */}
                <div>
                  <select
                    className="input"
                    style={{ width: '100%', height: '34px', fontSize: '12px' }}
                    value={selectedCiRange}
                    onChange={e => setSelectedCiRange(e.target.value)}
                  >
                    <option value="ALL">⚡ All Carbon Intensities</option>
                    <option value="DEEP_NEGATIVE">📉 Deep Negative (&lt; -50 g/MJ)</option>
                    <option value="SUB_ZERO">❄️ Sub-Zero (&lt; 0 g/MJ)</option>
                    <option value="LOW_POSITIVE">🌿 Low Positive (0 – 25 g/MJ)</option>
                    <option value="STANDARD">🌾 Standard (&gt; 25 g/MJ)</option>
                  </select>
                </div>

                {/* 5. Scale / Capacity Band */}
                <div>
                  <select
                    className="input"
                    style={{ width: '100%', height: '34px', fontSize: '12px' }}
                    value={selectedScale}
                    onChange={e => setSelectedScale(e.target.value)}
                  >
                    <option value="ALL">🏭 All Capacity Scales</option>
                    <option value="UTILITY">⚡ Utility Scale (&gt; 50 GWh/y)</option>
                    <option value="MEDIUM">🏢 Medium Scale (20 – 50 GWh/y)</option>
                    <option value="DISTRIBUTED">🏡 Distributed (&lt; 20 GWh/y)</option>
                  </select>
                </div>

                {/* 6. Upgrading Technology */}
                <div>
                  <select
                    className="input"
                    style={{ width: '100%', height: '34px', fontSize: '12px' }}
                    value={selectedTech}
                    onChange={e => setSelectedTech(e.target.value)}
                  >
                    <option value="ALL">⚙️ All Upgrading Tech</option>
                    <option value="MEMBRANE">Membrane Separation</option>
                    <option value="AMINE">Amine / Chemical Scrubbing</option>
                    <option value="WATER_SCRUBBING">Water Scrubbing</option>
                    <option value="PSA">Pressure Swing Adsorption (PSA)</option>
                    <option value="CRYOGENIC">Cryogenic Separation (WAGABOX)</option>
                  </select>
                </div>

                {/* 7. Grid Operator Tier */}
                <div>
                  <select
                    className="input"
                    style={{ width: '100%', height: '34px', fontSize: '12px' }}
                    value={selectedGrid}
                    onChange={e => setSelectedGrid(e.target.value)}
                  >
                    <option value="ALL">🌐 All Grid Tiers</option>
                    <option value="TSO">⚡ Transmission (GRTgaz, Terega, Snam...)</option>
                    <option value="DSO">🏘️ Distribution (GRDF, Fluvius, Enexis...)</option>
                    <option value="OFF_GRID">🚚 Dedicated / Off-Grid (Bio-LNG)</option>
                  </select>
                </div>

                {/* 8. Direct Contact & Outreach */}
                <div>
                  <select
                    className="input"
                    style={{ width: '100%', height: '34px', fontSize: '12px' }}
                    value={selectedContact}
                    onChange={e => setSelectedContact(e.target.value)}
                  >
                    <option value="ALL">👤 All Facilities</option>
                    <option value="WITH_EMAIL">✉️ Direct Verified Email</option>
                    <option value="WITH_PHONE">📞 Direct Verified Phone</option>
                    <option value="WITH_WEBSITE">🌐 Corporate Website</option>
                    <option value="VERIFIED">🛡️ Tier-1 Audited Facility</option>
                  </select>
                </div>
              </div>

              {/* ─── Active Filter Badge & Status Row ─── */}
              <div
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'var(--color-surface-sunken)',
                  borderBottom: '1px solid var(--color-divider)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                    Showing <span style={{ color: '#10b981' }}>{sortedPlants.length.toLocaleString()}</span> of {COMBINED_BIOMETHANE_PLANTS.length.toLocaleString()} facilities
                  </span>
                  {selectedCountry !== 'ALL' && (
                    <span className="chip chip-a" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      Country: {selectedCountry}
                    </span>
                  )}
                  {selectedFeedstock !== 'ALL' && (
                    <span className="chip chip-a" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      Feedstock: {selectedFeedstock}
                    </span>
                  )}
                  {selectedCiRange !== 'ALL' && (
                    <span className="chip chip-a" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      CI: {selectedCiRange}
                    </span>
                  )}
                  {selectedScale !== 'ALL' && (
                    <span className="chip chip-a" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      Scale: {selectedScale}
                    </span>
                  )}
                  {selectedContact !== 'ALL' && (
                    <span className="chip chip-a" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      Contact: {selectedContact}
                    </span>
                  )}
                </div>

                {/* Page Size & Pagination Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--color-dim)', fontSize: '11px' }}>Per page:</span>
                    <select
                      className="input"
                      style={{ height: '26px', fontSize: '11px', padding: '0 6px' }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ height: '26px', width: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--color-dim)', minWidth: '60px', textAlign: 'center' }}>
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ height: '26px', width: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Empty State ─── */}
              {sortedPlants.length === 0 ? (
                <div
                  style={{
                    padding: '56px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: '12px',
                    flex: 1,
                  }}
                >
                  <Filter size={36} style={{ color: 'var(--color-dim)', opacity: 0.5 }} />
                  <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                    No biomethane facility matches your active filter criteria
                  </h4>
                  <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0, maxWidth: '440px' }} className="mut">
                    Try broadening your search query or reset one or more discovery filters (feedstock, capacity, CI range, or grid operator).
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: '8px' }}
                    onClick={resetAllFilters}
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                /* ─── Interactive Data Table ─── */
                <div style={{ padding: '0 18px 18px', flex: 1, overflowY: 'auto' }} className="noscroll">
                  <table className="table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th 
                          style={{ width: '46px', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('country')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ISO {sortField === 'country' && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </div>
                        </th>
                        <th 
                          style={{ minWidth: '180px', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('name')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Facility Name {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </div>
                        </th>
                        <th 
                          style={{ width: '180px', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('operator')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Operating Entity & SIREN {sortField === 'operator' && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </div>
                        </th>
                        <th 
                          style={{ width: '85px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('capacityNm3h')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            Nm³/h {sortField === 'capacityNm3h' && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </div>
                        </th>
                        <th 
                          style={{ width: '85px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('annualEnergyGWh')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            GWh/y {sortField === 'annualEnergyGWh' && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </div>
                        </th>
                        <th style={{ width: '150px' }}>Feedstock & Substrate</th>
                        <th 
                          style={{ width: '90px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('ci')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            CI (g/MJ) {sortField === 'ci' && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </div>
                        </th>
                        <th style={{ width: '110px' }}>Grid & Operator</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Outreach</th>
                        <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPlants.map(p => {
                        const hasEmail = Boolean(p.contactEmail && p.contactEmail.includes('@'));
                        const hasPhone = Boolean(p.contactPhone && p.contactPhone.length > 5);
                        const hasWeb = Boolean(p.corporateWebsite && p.corporateWebsite.startsWith('http'));

                        return (
                          <tr
                            key={p.id}
                            data-click="1"
                            onClick={() => setModalPlant(p)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Country Flag & ISO */}
                            <td className="num" style={{ fontWeight: 700 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span>{p.countryFlag || '🌍'}</span>
                                <span style={{ fontSize: '11px', color: 'var(--color-dim)' }}>{p.countryCode}</span>
                              </span>
                            </td>

                            {/* Facility Name & Region */}
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                                {p.name}
                              </div>
                              {p.region && (
                                <div style={{ fontSize: '11px', color: 'var(--color-dim)', marginTop: '1px' }}>
                                  {p.region}
                                </div>
                              )}
                            </td>

                            {/* Operating Entity & Registration */}
                            <td>
                              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '175px' }} title={p.legalEntityName || p.operator || ''}>
                                {renderUnrecorded(p.legalEntityName || p.operator)}
                              </div>
                              {p.companyRegistrationId && (
                                <div style={{ fontSize: '10px', color: 'var(--color-dim)', fontFamily: 'monospace', marginTop: '1px' }}>
                                  {p.companyRegistrationId}
                                </div>
                              )}
                            </td>

                            {/* Capacity Nm3/h */}
                            <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                              {renderUnrecorded(p.capacityNm3h ? p.capacityNm3h.toLocaleString() : null)}
                            </td>

                            {/* Annual Energy GWh */}
                            <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: (p.annualEnergyGWh || 0) >= 50 ? '#10b981' : 'inherit' }}>
                              {renderUnrecorded(p.annualEnergyGWh ? p.annualEnergyGWh.toFixed(1) : null)}
                            </td>

                            {/* Feedstock */}
                            <td>
                              <div style={{ fontSize: '11px', fontWeight: 600 }}>
                                {p.primaryFeedstockCategory || 'Agricultural / Waste'}
                              </div>
                              {p.feedstockDetails && (
                                <div style={{ fontSize: '10px', color: 'var(--color-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '145px' }} title={p.feedstockDetails}>
                                  {p.feedstockDetails}
                                </div>
                              )}
                            </td>

                            {/* Carbon Intensity CI */}
                            <td style={{ textAlign: 'center' }}>
                              {renderCiBadge(p.verifiedCarbonIntensity)}
                            </td>

                            {/* Grid / Network Operator */}
                            <td>
                              <div style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '105px' }} title={p.networkOperator || ''}>
                                {renderUnrecorded(p.networkOperator)}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--color-dim)' }}>
                                {p.gridConnectionType?.includes('Transmission') ? '⚡ TSO Injection' : '🏘️ DSO Injection'}
                              </div>
                            </td>

                            {/* Direct Outreach Badges (Clickable Links) */}
                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {hasEmail && (
                                  <a
                                    href={`mailto:${p.contactEmail}`}
                                    title={`Email: ${p.contactEmail}`}
                                    style={{ color: '#10b981', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                                    onClick={e => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(p.contactEmail || '');
                                      showToast(`Copied email: ${p.contactEmail}`, 'info');
                                    }}
                                  >
                                    <Mail size={14} />
                                  </a>
                                )}
                                {hasPhone && (
                                  <a
                                    href={`tel:${p.contactPhone}`}
                                    title={`Phone: ${p.contactPhone}`}
                                    style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                                    onClick={e => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(p.contactPhone || '');
                                      showToast(`Copied phone: ${p.contactPhone}`, 'info');
                                    }}
                                  >
                                    <Phone size={14} />
                                  </a>
                                )}
                                {hasWeb && (
                                  <a
                                    href={formatExternalUrl(p.corporateWebsite)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Website: ${p.corporateWebsite}`}
                                    style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Globe2 size={14} />
                                  </a>
                                )}
                                {!hasEmail && !hasPhone && !hasWeb && (
                                  <span style={{ color: 'var(--color-neutral-600)', fontSize: '10px' }}>—</span>
                                )}
                              </div>
                            </td>

                            {/* Sourcing Drawer & Trade Launch Actions */}
                            <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ fontSize: '10px', padding: '2px 6px', height: '22px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalPlant(p);
                                  }}
                                  title="Open 360° Facility Sourcing Drawer"
                                >
                                  360°
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ fontSize: '10px', padding: '2px 6px', height: '22px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  onClick={(e) => handleLaunchTrade(e, p)}
                                  title="Launch this facility directly into Trade Builder"
                                >
                                  <Zap size={10} /> Deal
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ─── Institutional Audit & Sourcing Summary Footer ─── */}
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 18px',
                  borderTop: '2px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: '11px',
                  color: 'var(--color-dim)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 600 }}>
                    <ShieldCheck size={14} /> Tier-1 Audited Registry (1,975 Facilities)
                  </span>
                  <span>
                    Total Installed: <strong style={{ color: 'var(--color-text)' }}>
                      {Math.round(sortedPlants.reduce((sum, p) => sum + (p.annualEnergyGWh || 0), 0)).toLocaleString()} GWh/y
                    </strong>
                  </span>
                  <span>
                    Sub-Zero Assets: <strong style={{ color: '#10b981' }}>
                      {sortedPlants.filter(p => (p.verifiedCarbonIntensity ?? 0) < 0).length}
                    </strong>
                  </span>
                  <span>
                    Direct Contacts: <strong style={{ color: 'var(--color-text)' }}>
                      {sortedPlants.filter(p => Boolean(p.contactEmail || p.contactPhone)).length}
                    </strong>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Source: GIE/EBA European Biomethane Map 2026 & National TSO Registers</span>
                </div>
              </div>
            </div>

            {/* ─── Right Column: Interactive Country Totals Rail ─── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--color-surface)',
                minWidth: 0,
              }}
            >
              <div style={{ padding: '14px 16px', borderBottom: '2px solid var(--color-divider)' }}>
                <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Country totals</span>
                  {selectedCountry !== 'ALL' && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                      onClick={() => setSelectedCountry('ALL')}
                    >
                      Show All
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px' }} className="mut">
                  Click any country to filter instant census results
                </div>
              </div>

              <div style={{ padding: '8px 14px', overflowY: 'auto', flex: 1 }} className="noscroll">
                {COUNTRY_MACRO_STATS.map(c => {
                  const barWidth = (c.activePlants / maxMacroPlants) * 100;
                  const isSelected = selectedCountry === c.iso;

                  return (
                    <div 
                      key={c.iso} 
                      onClick={() => setSelectedCountry(isSelected ? 'ALL' : c.iso)}
                      style={{ 
                        padding: '7px 8px', 
                        margin: '2px 0',
                        borderRadius: '4px',
                        borderBottom: '1px solid var(--color-divider)',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--color-surface-sunken)' : 'transparent',
                        outline: isSelected ? '1px solid #10b981' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '13px' }}>{c.flag}</span>
                        <span className="num" style={{ width: '22px', fontSize: '11px', fontWeight: 700 }}>{c.iso}</span>
                        <span style={{ flex: 1, fontSize: '12px', fontWeight: isSelected ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.country}
                        </span>
                        <span className="num" style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#10b981' : 'inherit' }}>
                          {c.activePlants}
                        </span>
                        <span className="num mut" style={{ fontSize: '10px', width: '48px', textAlign: 'right' }}>
                          {c.installedCapacityTWh ? `${c.installedCapacityTWh.toFixed(1)} TWh` : '—'}
                        </span>
                      </div>
                      <div style={{ height: '3px', marginTop: '5px', backgroundColor: 'color-mix(in srgb, var(--color-text) 10%, transparent)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '3px', width: `${barWidth}%`, backgroundColor: isSelected ? '#10b981' : 'var(--color-text)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Facility Record Sourcing Drawer ─── */}
          {modalPlant && (
            <PlantSourcingDrawer
              plant={modalPlant}
              onClose={() => setModalPlant(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
