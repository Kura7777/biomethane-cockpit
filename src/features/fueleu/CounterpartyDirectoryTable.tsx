import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShippingCounterparty,
  CallingRegion,
  TradeLane,
  CALLING_REGIONS,
  TRADE_LANES,
  getStrategyTierBadgeClass,
} from '../../domain/fueleu/types';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../../domain/fueleu/shippingTargetsData';
import { buildDealUrl } from '../../domain/trade/dealParams';
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  Zap,
  Anchor,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Ship,
  Scale,
  Flame,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Compass,
  MapPin,
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

type SortField =
  | 'rank'
  | 'parent_name'
  | 'fleetCapability'
  | 'lng_vessels_in_scope'
  | 'vessels_in_scope'
  | 'total_energy_mwh'
  | 'actual_ghgie'
  | 'compliance_balance_2025_tco2e'
  | 'penalty_2025_y1_eur'
  | 'ets_exposure_2025_eur'
  | 'combined_regulatory_exposure_2025_eur'
  | 'bio_lng_required_neg100_mwh'
  | 'client_savings_physical_eur'
  | 'desk_margin_physical_eur';

type SortDirection = 'asc' | 'desc';

export interface CounterpartyDirectoryTableProps {
  onSelectCounterparty?: (counterparty: ShippingCounterparty) => void;
  selectedCounterparty?: ShippingCounterparty | null;
}

export function CounterpartyDirectoryTable({
  onSelectCounterparty,
  selectedCounterparty,
}: CounterpartyDirectoryTableProps = {}) {
  const navigate = useNavigate();

  const handleSelectCounterparty = (c: ShippingCounterparty) => {
    if (onSelectCounterparty) {
      onSelectCounterparty(c);
    }
  };

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [selectedCapability, setSelectedCapability] = useState<'ALL' | 'DUAL_FUEL_LNG' | 'CONVENTIONAL_ONLY'>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedTradeLane, setSelectedTradeLane] = useState<string>('ALL');
  const [selectedHub, setSelectedHub] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedBalanceType, setSelectedBalanceType] = useState<'ALL' | 'DEFICIT' | 'SURPLUS'>('ALL');

  // Secondary filters popover state
  const [moreFiltersOpen, setMoreFiltersOpen] = useState<boolean>(false);
  const moreFiltersRef = useRef<HTMLDivElement>(null);

  // Close secondary filters popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreFiltersRef.current && !moreFiltersRef.current.contains(event.target as Node)) {
        setMoreFiltersOpen(false);
      }
    }
    if (moreFiltersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [moreFiltersOpen]);

  const secondaryActiveCount =
    (selectedTradeLane !== 'ALL' ? 1 : 0) +
    (selectedHub !== 'ALL' ? 1 : 0) +
    (selectedBalanceType !== 'ALL' ? 1 : 0);

  // Sorting state - ranked by default by Statutory Penalty Exposure / Rank
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination & View density state (25, 50, 100, All)
  const [pageSize, setPageSize] = useState<'ALL' | 100 | 50 | 25>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Extract unique filter options
  const segments = useMemo(() => {
    const list = Array.from(new Set(FUEL_EU_SHIPPING_COUNTERPARTIES.map(c => c.segment))).sort();
    return list;
  }, []);

  const bunkerHubs = useMemo(() => {
    const hubSet = new Set<string>();
    FUEL_EU_SHIPPING_COUNTERPARTIES.forEach(c => {
      c.primary_bunkering_hubs.split(',').forEach(h => {
        const trimmed = h.trim();
        if (trimmed) hubSet.add(trimmed);
      });
    });
    return Array.from(hubSet).sort();
  }, []);

  // Filtered counterparties
  const filteredCounterparties = useMemo(() => {
    return FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.parent_name.toLowerCase().includes(q);
        const matchesHq = c.headquarters.toLowerCase().includes(q);
        const matchesAddress = (c.hqAddress || '').toLowerCase().includes(q);
        const matchesDomain = (c.contactDomain || '').toLowerCase().includes(q);
        const matchesExec = c.key_executive.toLowerCase().includes(q);
        const matchesHubs = c.primary_bunkering_hubs.toLowerCase().includes(q);
        const matchesStrategy = c.strategy_tier.toLowerCase().includes(q);
        const matchesRole = (c.keyContactRole || '').toLowerCase().includes(q);
        const matchesDept = (c.targetDepartment || '').toLowerCase().includes(q);
        const matchesRegionCode = (c.callingRegion || '').toLowerCase().includes(q);
        const matchesRegion = (CALLING_REGIONS[c.callingRegion]?.label || '').toLowerCase().includes(q) ||
                              (CALLING_REGIONS[c.callingRegion]?.portsDescription || '').toLowerCase().includes(q) ||
                              matchesRegionCode;
        const matchesLaneCode = (c.tradeLane || '').toLowerCase().includes(q);
        const matchesLane = (TRADE_LANES[c.tradeLane]?.label || '').toLowerCase().includes(q) ||
                            (TRADE_LANES[c.tradeLane]?.corridorDescription || '').toLowerCase().includes(q) ||
                            matchesLaneCode;
        // Rank search (e.g. "#1", "rank 1", or exact rank number)
        const cleanQuery = q.trim();
        const isRankPrefix = cleanQuery.startsWith('#') || cleanQuery.startsWith('rank ');
        const parsedRank = isRankPrefix
          ? parseInt(cleanQuery.replace(/^(#|rank\s*)/i, ''), 10)
          : (cleanQuery.match(/^\d+$/) ? parseInt(cleanQuery, 10) : NaN);
        const matchesRank = !isNaN(parsedRank) && c.rank === parsedRank;

        if (!matchesRank && !matchesName && !matchesHq && !matchesAddress && !matchesDomain && !matchesExec && !matchesHubs && !matchesStrategy && !matchesRole && !matchesDept && !matchesRegion && !matchesLane) {
          return false;
        }
      }

      // Segment
      if (selectedSegment !== 'ALL' && c.segment !== selectedSegment) {
        return false;
      }

      // Fleet Engine Capability
      if (selectedCapability !== 'ALL' && c.fleetCapability !== selectedCapability) {
        return false;
      }

      // Calling Region
      if (selectedRegion !== 'ALL' && c.callingRegion !== selectedRegion) {
        return false;
      }

      // Trade Lane
      if (selectedTradeLane !== 'ALL' && c.tradeLane !== selectedTradeLane) {
        return false;
      }

      // Bunker Hub (exact token match)
      if (selectedHub !== 'ALL') {
        const hubs = c.primary_bunkering_hubs.split(',').map(h => h.trim());
        if (!hubs.includes(selectedHub)) {
          return false;
        }
      }

      // Strategy Tier
      if (selectedTier !== 'ALL') {
        if (selectedTier === 'TIER_1' && !c.strategy_tier.startsWith('Tier 1')) return false;
        if (selectedTier === 'TIER_2' && !c.strategy_tier.startsWith('Tier 2')) return false;
        if (selectedTier === 'TIER_3' && !c.strategy_tier.startsWith('Tier 3')) return false;
        if (selectedTier === 'TIER_4' && !c.strategy_tier.startsWith('Tier 4')) return false;
      }

      // Balance Type
      if (selectedBalanceType === 'DEFICIT' && c.compliance_balance_2025_tco2e >= 0) return false;
      if (selectedBalanceType === 'SURPLUS' && c.compliance_balance_2025_tco2e <= 0) return false;

      return true;
    }).sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [searchQuery, selectedSegment, selectedCapability, selectedRegion, selectedTradeLane, selectedHub, selectedTier, selectedBalanceType, sortField, sortDirection]);

  // Aggregate stats across active filtered set
  const aggregateMetrics = useMemo(() => {
    let fleetEnergy = 0;
    let grossDeficit = 0;
    let lngSurplus = 0;
    let netPenalty = 0;
    let etsExposureSum = 0;
    let combinedExposureSum = 0;
    let bioLngMwh = 0;
    let clientSavings = 0;
    let deskMarginSum = 0;
    let vesselCount = 0;
    let surplusFleetCount = 0;
    let dualFuelCount = 0;
    let conventionalCount = 0;

    for (const c of filteredCounterparties) {
      fleetEnergy += c.total_energy_mwh;
      vesselCount += c.vessels_in_scope;
      if (c.fleetCapability === 'DUAL_FUEL_LNG') {
        dualFuelCount++;
      } else {
        conventionalCount++;
      }
      if (c.compliance_balance_2025_tco2e < 0) {
        grossDeficit += c.compliance_balance_2025_tco2e;
      } else {
        lngSurplus += c.compliance_balance_2025_tco2e;
        surplusFleetCount++;
      }
      netPenalty += c.penalty_2025_y1_eur;
      etsExposureSum += c.ets_exposure_2025_eur;
      combinedExposureSum += c.combined_regulatory_exposure_2025_eur;
      bioLngMwh += c.bio_lng_required_neg100_mwh;
      clientSavings += c.client_savings_physical_eur;
      deskMarginSum += c.desk_margin_physical_eur;
    }

    return {
      fleetEnergyTWh: (fleetEnergy / 1000000).toFixed(1),
      grossDeficitKt: (Math.abs(grossDeficit) / 1000).toFixed(1),
      lngSurplusKt: (lngSurplus / 1000).toFixed(1),
      netPenaltyM: (netPenalty / 1000000).toFixed(1),
      etsExposureM: (etsExposureSum / 1000000).toFixed(1),
      combinedExposureM: (combinedExposureSum / 1000000).toFixed(1),
      bioLngGWh: (bioLngMwh / 1000).toFixed(1),
      clientSavingsM: (clientSavings / 1000000).toFixed(1),
      deskMarginM: (deskMarginSum / 1000000).toFixed(1),
      vesselCount,
      counterpartyCount: filteredCounterparties.length,
      surplusFleetCount,
      dualFuelCount,
      conventionalCount,
    };
  }, [filteredCounterparties]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For rank and parent_name, ascending is natural default (1..84 or A..Z);
      // for financial exposure and volume metrics, descending is natural default (highest first)
      setSortDirection(field === 'rank' || field === 'parent_name' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  // Deterministically reset pagination to page 1 whenever any filter or search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSegment, selectedCapability, selectedRegion, selectedTradeLane, selectedHub, selectedTier, selectedBalanceType]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSegment('ALL');
    setSelectedCapability('ALL');
    setSelectedRegion('ALL');
    setSelectedTradeLane('ALL');
    setSelectedHub('ALL');
    setSelectedTier('ALL');
    setSelectedBalanceType('ALL');
    setSortField('rank');
    setSortDirection('asc');
    setCurrentPage(1);
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedSegment !== 'ALL' ||
    selectedCapability !== 'ALL' ||
    selectedRegion !== 'ALL' ||
    selectedTradeLane !== 'ALL' ||
    selectedHub !== 'ALL' ||
    selectedTier !== 'ALL' ||
    selectedBalanceType !== 'ALL';

  // Deterministically sort counterparties based on sortField and sortDirection
  const sortedCounterparties = useMemo(() => {
    return [...filteredCounterparties].sort((a, b) => {
      const valA: any = a[sortField];
      const valB: any = b[sortField];

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const numA = typeof valA === 'number' ? valA : 0;
      const numB = typeof valB === 'number' ? valB : 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [filteredCounterparties, sortField, sortDirection]);

  // Pagination calculations
  const totalItems = filteredCounterparties.length;
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = pageSize === 'ALL' ? 0 : (validCurrentPage - 1) * pageSize;
  const paginatedCounterparties = useMemo(() => {
    if (pageSize === 'ALL') return sortedCounterparties;
    return sortedCounterparties.slice(startIndex, startIndex + pageSize);
  }, [sortedCounterparties, pageSize, startIndex]);

  const handleTradeBuilder = (counterparty: ShippingCounterparty, e: React.MouseEvent) => {
    e.stopPropagation();
    const volumeMwh = Math.max(1000, Math.round(counterparty.bio_lng_required_neg100_mwh || 10000));
    const url = buildDealUrl({
      marketId: 'FUELEU',
      originCountry: 'NL',
      feedstock: 'manure',
      ci: -100,
      volume: volumeMwh,
      counterparty: counterparty.parent_name,
      legalEntityName: counterparty.parent_name,
      complianceYear: 2025,
    });
    navigate(url);
  };

  const handleExportCrmCsv = () => {
    const headers = [
      'Rank',
      'Account / Company Name',
      'Headquarters',
      'HQ Street Address',
      'Switchboard Phone',
      'Corporate Domain',
      'Target Department',
      'Key Contact Role',
      'Key Executive',
      'Fleet Segment',
      'Fleet Capability',
      'Dual-Fuel LNG Vessels',
      'Conventional Vessels',
      'Calling Region Code',
      'Calling Region Corridor',
      'Trade Lane Code',
      'Trade Lane Route',
      'Primary Bunkering Ports',
      'Vessels in EU Scope',
      'Strategy Tier',
      'Annual EU Energy MWh',
      'Actual GHGIE (gCO2e/MJ)',
      '2025 Compliance Balance (tCO2e)',
      '2025 Statutory Penalty Y1 (EUR)',
      '2025 Statutory Penalty Y2 (EUR)',
      '2030 Statutory Penalty Y1 (EUR)',
      '2025 EU ETS Liability (EUR)',
      '2026 EU ETS Liability (EUR)',
      '2025 Combined Regulatory Exposure (EUR)',
      'Bio-LNG Req Neg100 CI (t)',
      'Bio-LNG Req Neg100 CI (MWh)',
      'Bio-LNG Req Zero CI (t)',
      'Client Potential Savings Physical (EUR)',
      'Desk Margin Physical (EUR)',
      'Client Potential Savings Pooling (EUR)',
      'Desk Margin Pooling (EUR)',
      'Tailored Commercial Outreach Pitch',
    ];

    const escapeVal = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sortedCounterparties.map(c => [
      c.rank,
      escapeVal(c.parent_name),
      escapeVal(c.headquarters),
      escapeVal(c.hqAddress),
      escapeVal(c.switchboardPhone),
      escapeVal(c.contactDomain),
      escapeVal(c.targetDepartment),
      escapeVal(c.keyContactRole),
      escapeVal(c.key_executive),
      escapeVal(c.segment),
      escapeVal(c.fleetCapability),
      c.lng_vessels_in_scope,
      c.conventional_vessels_in_scope,
      escapeVal(c.callingRegion),
      escapeVal(CALLING_REGIONS[c.callingRegion]?.portsDescription || c.callingRegion),
      escapeVal(c.tradeLane),
      escapeVal(TRADE_LANES[c.tradeLane]?.corridorDescription || c.tradeLane),
      escapeVal(c.primary_bunkering_hubs),
      c.vessels_in_scope,
      escapeVal(c.strategy_tier),
      c.total_energy_mwh,
      c.actual_ghgie,
      c.compliance_balance_2025_tco2e,
      c.penalty_2025_y1_eur,
      c.penalty_2025_y2_eur,
      c.penalty_2030_y1_eur,
      c.ets_exposure_2025_eur,
      c.ets_exposure_2026_eur,
      c.combined_regulatory_exposure_2025_eur,
      c.bio_lng_required_neg100_t,
      c.bio_lng_required_neg100_mwh,
      c.bio_lng_required_zero_t,
      c.client_savings_physical_eur,
      c.desk_margin_physical_eur,
      c.client_savings_pooling_eur,
      c.desk_margin_pooling_eur,
      escapeVal(c.outreachPitch),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fueleu_crm_outreach_targets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${sortedCounterparties.length} CRM outreach counterparties (Salesforce / HubSpot compliant)`, 'SUCCESS');
  };

  const handleExportCsv = () => {
    const headers = [
      'Rank',
      'Parent Company',
      'Headquarters',
      'Segment',
      'Fleet Capability',
      'LNG Vessels',
      'Conventional Vessels',
      'Calling Region',
      'Trade Lane',
      'Vessels in Scope',
      'Strategy Tier',
      'Fleet Energy MWh',
      'Actual GHGIE (g/MJ)',
      '2025 Balance (tCO2e)',
      '2025 Penalty Y1 (EUR)',
      '2025 Penalty Y2 (EUR)',
      '2030 Penalty Y1 (EUR)',
      '2025 EU ETS (EUR)',
      '2026 EU ETS (EUR)',
      '2025 Combined Exposure (EUR)',
      'Bio-LNG Req Neg100 (t)',
      'Bio-LNG Req Neg100 (MWh)',
      'Client Savings (EUR)',
      'Desk Margin (EUR)',
      'Key Executive',
      'Primary Bunker Hubs',
    ];

    const rows = sortedCounterparties.map(c => [
      c.rank,
      `"${c.parent_name.replace(/"/g, '""')}"`,
      `"${c.headquarters.replace(/"/g, '""')}"`,
      `"${c.segment.replace(/"/g, '""')}"`,
      `"${c.fleetCapability}"`,
      c.lng_vessels_in_scope,
      c.conventional_vessels_in_scope,
      `"${c.callingRegion}"`,
      `"${c.tradeLane}"`,
      c.vessels_in_scope,
      `"${c.strategy_tier.replace(/"/g, '""')}"`,
      c.total_energy_mwh,
      c.actual_ghgie,
      c.compliance_balance_2025_tco2e,
      c.penalty_2025_y1_eur,
      c.penalty_2025_y2_eur,
      c.penalty_2030_y1_eur,
      c.ets_exposure_2025_eur,
      c.ets_exposure_2026_eur,
      c.combined_regulatory_exposure_2025_eur,
      c.bio_lng_required_neg100_t,
      c.bio_lng_required_neg100_mwh,
      c.client_savings_physical_eur,
      c.desk_margin_physical_eur,
      `"${c.key_executive.replace(/"/g, '""')}"`,
      `"${c.primary_bunkering_hubs.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fueleu_maritime_counterparties_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${sortedCounterparties.length} shipping counterparties to CSV`, 'SUCCESS');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Refined Institutional Metric Ledger Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        {/* Metric 1: Fleet Energy & Scope */}
        <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
              FLEET SCOPE &amp; ENERGY
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontFamily: MONO_FONT,
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '1px 5px',
                backgroundColor: 'var(--color-subtier)',
                color: 'var(--color-muted)',
                border: '1px solid var(--color-divider)',
              }}
            >
              EU MRV AUDITED
            </span>
          </div>
          <div className="num font-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-status-info-text, #0284c7)', lineHeight: 1.15, fontFamily: MONO_FONT }}>
            {aggregateMetrics.fleetEnergyTWh} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-muted)' }}>TWh</span>
          </div>
          <div className="subttl num" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-muted)' }}>
            {aggregateMetrics.vesselCount.toLocaleString()} vessels across {filteredCounterparties.length} groups · {aggregateMetrics.dualFuelCount} LNG-ready
          </div>
        </div>

        {/* Metric 2: FuelEU Penalty Exposure */}
        <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
              2025 FUELEU DEFICIT PENALTY
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontFamily: MONO_FONT,
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '1px 5px',
                backgroundColor: 'var(--color-status-neg-bg)',
                color: 'var(--color-status-neg-text)',
                border: '1px solid var(--color-status-neg-border)',
              }}
            >
              -2.00% TARGET
            </span>
          </div>
          <div className="num font-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-status-neg-text)', lineHeight: 1.15, fontFamily: MONO_FONT }}>
            €{aggregateMetrics.netPenaltyM} <span style={{ fontSize: '14px', fontWeight: 600 }}>M</span>
          </div>
          <div className="subttl num" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-muted)' }}>
            Deficit: -{aggregateMetrics.grossDeficitKt} kt · Surplus: +{aggregateMetrics.lngSurplusKt} kt
          </div>
        </div>

        {/* Metric 3: EU ETS Carbon Liability */}
        <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
              2025 EU ETS MARITIME
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontFamily: MONO_FONT,
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '1px 5px',
                backgroundColor: 'var(--color-status-warn-bg)',
                color: 'var(--color-status-warn-text)',
                border: '1px solid var(--color-status-warn-border)',
              }}
            >
              70% PHASE-IN (€70/t)
            </span>
          </div>
          <div className="num font-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-status-warn-text, #d97706)', lineHeight: 1.15, fontFamily: MONO_FONT }}>
            €{aggregateMetrics.etsExposureM} <span style={{ fontSize: '14px', fontWeight: 600 }}>M</span>
          </div>
          <div className="subttl num" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-muted)' }}>
            Directive (EU) 2023/959 liability · 2026 (100%): €{(Number(aggregateMetrics.etsExposureM) / 0.7).toFixed(1)}M
          </div>
        </div>

        {/* Metric 4: Combined Exposure & Client Arbitrage */}
        <div style={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
              COMBINED 2025 EXPOSURE
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontFamily: MONO_FONT,
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '1px 5px',
                backgroundColor: 'var(--color-subtier)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-divider)',
              }}
            >
              FUELEU + ETS
            </span>
          </div>
          <div className="num font-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.15, fontFamily: MONO_FONT }}>
            €{aggregateMetrics.combinedExposureM} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-muted)' }}>M</span>
          </div>
          <div className="subttl num" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-muted)' }}>
            Client Net Savings: <strong style={{ color: 'var(--color-status-pos-text)' }}>€{aggregateMetrics.clientSavingsM}M</strong> with Bio-LNG
          </div>
        </div>
      </div>

      {/* Unified Single-Row Institutional Filter Bar */}
      <div
        style={{
          padding: '8px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          position: 'relative',
        }}
      >
        {/* Left Side: Search, Engine Readiness, Primary Dropdowns, Secondary Popover, Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {/* Quick Search */}
          <div style={{ position: 'relative', width: '210px', flexShrink: 0 }}>
            <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Search counterparties, ports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: '28px', paddingRight: searchQuery ? '22px' : '8px', height: '30px', fontSize: '12px', minHeight: '30px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-muted)',
                  fontSize: '11px',
                  padding: 0,
                  lineHeight: 1,
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Engine Readiness Segmented Control */}
          <div className="seg" role="group" aria-label="Engine readiness" style={{ flexShrink: 0 }}>
            <button
              type="button"
              className={`seg-opt ${selectedCapability === 'ALL' ? 'active' : ''}`}
              onClick={() => { setSelectedCapability('ALL'); setCurrentPage(1); }}
              style={{ height: '30px', fontSize: '11px', padding: '0 9px', fontWeight: 600 }}
            >
              All Fleets ({FUEL_EU_SHIPPING_COUNTERPARTIES.length})
            </button>
            <button
              type="button"
              className={`seg-opt ${selectedCapability === 'DUAL_FUEL_LNG' ? 'active' : ''}`}
              onClick={() => { setSelectedCapability('DUAL_FUEL_LNG'); setCurrentPage(1); }}
              style={{ height: '30px', fontSize: '11px', padding: '0 9px', fontWeight: 600 }}
            >
              Dual-Fuel LNG ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.fleetCapability === 'DUAL_FUEL_LNG').length})
            </button>
            <button
              type="button"
              className={`seg-opt ${selectedCapability === 'CONVENTIONAL_ONLY' ? 'active' : ''}`}
              onClick={() => { setSelectedCapability('CONVENTIONAL_ONLY'); setCurrentPage(1); }}
              style={{ height: '30px', fontSize: '11px', padding: '0 9px', fontWeight: 600 }}
            >
              Conventional ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.fleetCapability === 'CONVENTIONAL_ONLY').length})
            </button>
          </div>

          {/* Segment dropdown */}
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: '125px', height: '30px', minHeight: '30px', fontSize: '11.5px', padding: '0 8px' }}
            aria-label="Filter by shipping segment"
          >
            <option value="ALL">All Segments ({segments.length})</option>
            {segments.map(seg => (
              <option key={seg} value={seg}>{seg}</option>
            ))}
          </select>

          {/* Region dropdown */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: '125px', height: '30px', minHeight: '30px', fontSize: '11.5px', padding: '0 8px' }}
            aria-label="Filter by calling region"
          >
            <option value="ALL">All Regions ({Object.keys(CALLING_REGIONS).length})</option>
            {Object.values(CALLING_REGIONS).map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>

          {/* Strategy Tier dropdown */}
          <select
            value={selectedTier}
            onChange={(e) => { setSelectedTier(e.target.value); setCurrentPage(1); }}
            className="input"
            style={{ width: 'auto', minWidth: '110px', height: '30px', minHeight: '30px', fontSize: '11.5px', padding: '0 8px' }}
            aria-label="Filter by strategy tier"
          >
            <option value="ALL">All Tiers</option>
            <option value="TIER_1">Tier 1 (&gt;€10M)</option>
            <option value="TIER_2">Tier 2 (€2M–€10M)</option>
            <option value="TIER_3">Tier 3 (&lt;€2M)</option>
            <option value="TIER_4">Tier 4 (Surplus)</option>
          </select>

          {/* Secondary Filters Popover Menu */}
          <div ref={moreFiltersRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMoreFiltersOpen(prev => !prev)}
              className="btn btn-secondary"
              style={{
                fontSize: '11px',
                padding: '0 9px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: secondaryActiveCount > 0 ? 700 : 500,
                borderColor: secondaryActiveCount > 0 ? 'var(--color-accent)' : undefined,
                backgroundColor: secondaryActiveCount > 0 ? 'var(--color-subtier)' : undefined,
              }}
              title="Filter by Trade Lane, Bunker Hub, and Compliance Balance"
            >
              <Filter size={11} style={{ color: secondaryActiveCount > 0 ? 'var(--color-accent)' : undefined }} />
              <span>{secondaryActiveCount > 0 ? `Filters (${secondaryActiveCount})` : 'More Filters'}</span>
            </button>

            {moreFiltersOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  zIndex: 50,
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-divider)',
                  boxShadow: 'var(--shadow-md, 0 4px 14px rgba(0,0,0,0.12))',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  width: '260px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-divider)', paddingBottom: '6px' }}>
                  <span className="eyebrow" style={{ fontSize: '10px', color: 'var(--color-muted)' }}>Secondary Filters</span>
                  {secondaryActiveCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTradeLane('ALL');
                        setSelectedHub('ALL');
                        setSelectedBalanceType('ALL');
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10.5px', color: 'var(--color-accent)', padding: 0 }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '3px' }}>Trade Lane</label>
                  <select
                    value={selectedTradeLane}
                    onChange={(e) => setSelectedTradeLane(e.target.value)}
                    className="input"
                    style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    <option value="ALL">All Trade Lanes ({Object.keys(TRADE_LANES).length})</option>
                    {Object.values(TRADE_LANES).map(l => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '3px' }}>Bunkering Hub</label>
                  <select
                    value={selectedHub}
                    onChange={(e) => setSelectedHub(e.target.value)}
                    className="input"
                    style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    <option value="ALL">All Bunker Hubs ({bunkerHubs.length})</option>
                    {bunkerHubs.map(hub => (
                      <option key={hub} value={hub}>{hub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '3px' }}>Compliance Balance</label>
                  <select
                    value={selectedBalanceType}
                    onChange={(e) => setSelectedBalanceType(e.target.value as 'ALL' | 'DEFICIT' | 'SURPLUS')}
                    className="input"
                    style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    <option value="ALL">All Balances</option>
                    <option value="DEFICIT">Deficit Only ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2025_tco2e < 0).length})</option>
                    <option value="SURPLUS">Surplus Only ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2025_tco2e > 0).length})</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '0 8px', height: '30px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Reset all filters"
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>

        {/* Right Side: Active count summary & Institutional Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', marginRight: '4px' }}>
            Showing <strong>{pageSize === 'ALL' ? filteredCounterparties.length : `${startIndex + 1}–${Math.min(startIndex + pageSize, totalItems)}`}</strong> of <strong>{totalItems}</strong> groups
          </span>
          <button
            type="button"
            onClick={handleExportCrmCsv}
            className="btn btn-secondary"
            style={{
              fontSize: '11px',
              padding: '0 10px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 600,
            }}
            title="Export CRM-ready dossier for Salesforce / HubSpot outreach"
          >
            <FileSpreadsheet size={12} style={{ color: 'var(--color-accent)' }} /> Export CRM (.CSV)
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-secondary"
            style={{
              fontSize: '11px',
              padding: '0 10px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
            title="Export raw data table"
          >
            <Download size={12} /> Export Table ({filteredCounterparties.length})
          </button>
        </div>
      </div>

      {/* Counterparty Table */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="table" style={{ width: '100%', margin: 0 }}>
          <thead>
            <tr>
              <th
                style={{ width: '56px', textAlign: 'center', padding: '8px 6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort('rank')}
                title="Sort by FuelEU Statutory Penalty Exposure Rank"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
                  <span>RANK</span>
                  {sortField === 'rank' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                  )}
                </div>
              </th>

              <th
                style={{ minWidth: '220px', padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort('parent_name')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>SHIPPING GROUP</span>
                  {sortField === 'parent_name' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                  )}
                </div>
              </th>

              <th
                style={{ width: '145px', textAlign: 'center', padding: '8px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort('lng_vessels_in_scope')}
                title="Sort by Fleet Engine Capability & Dual-Fuel LNG Readiness"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
                  <span>PROPULSION</span>
                  {sortField === 'lng_vessels_in_scope' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                  )}
                </div>
              </th>

              <th
                style={{ width: '75px', textAlign: 'right', padding: '8px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort('vessels_in_scope')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                  <span>VESSELS</span>
                  {sortField === 'vessels_in_scope' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                  )}
                </div>
              </th>

              <th
                style={{ width: '125px', textAlign: 'right', padding: '8px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort('penalty_2025_y1_eur')}
                title="FuelEU Maritime Statutory Penalty Exposure (Year 1)"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                  <span>FUELEU PENALTY</span>
                  {sortField === 'penalty_2025_y1_eur' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                  )}
                </div>
              </th>

              <th
                style={{ width: '110px', textAlign: 'right', padding: '8px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort('ets_exposure_2025_eur')}
                title="EU ETS Maritime 2025 Liability (Directive (EU) 2023/959 70% Phase-In @ €70/t EUA)"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                  <span>EU ETS 2025</span>
                  {sortField === 'ets_exposure_2025_eur' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                  )}
                </div>
              </th>

              <th
                style={{ width: '125px', textAlign: 'right', padding: '8px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort('combined_regulatory_exposure_2025_eur')}
                title="Combined 2025 Statutory Exposure (FuelEU Penalty + EU ETS 70% Liability)"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                  <span>COMBINED 2025</span>
                  {sortField === 'combined_regulatory_exposure_2025_eur' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                  )}
                </div>
              </th>

              <th
                style={{ width: '115px', textAlign: 'right', padding: '8px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort('client_savings_physical_eur')}
                title="Client Net Statutory Compliance Savings with RED III Bio-LNG"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                  <span>NET SAVINGS</span>
                  {sortField === 'client_savings_physical_eur' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--color-accent)' }} /> : <ArrowDown size={11} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <ArrowUpDown size={11} style={{ opacity: 0.25 }} />
                  )}
                </div>
              </th>

              <th style={{ width: '130px', textAlign: 'right', padding: '8px 16px', whiteSpace: 'nowrap' }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCounterparties.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px 18px', color: 'var(--color-muted)' }}>
                  No shipping counterparties match the current search &amp; filter criteria.
                </td>
              </tr>
            ) : (
              paginatedCounterparties.map((c) => {
                const isSurplus = c.compliance_balance_2025_tco2e > 0;
                return (
                  <tr
                    key={c.parent_name}
                    data-click="1"
                    onClick={() => handleSelectCounterparty(c)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedCounterparty?.parent_name === c.parent_name ? 'rgba(6, 182, 212, 0.08)' : undefined,
                    }}
                  >
                    {/* Rank */}
                    <td className="num" style={{ textAlign: 'center', padding: '6px 6px' }}>
                      <span
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: '11px',
                          fontWeight: 700,
                          color: c.rank <= 10 ? 'var(--color-accent)' : 'var(--color-text)',
                        }}
                      >
                        #{c.rank}
                      </span>
                    </td>

                    {/* Shipping Group Name & Compact Route Info */}
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.parent_name}
                      </div>
                      <div className="subttl" style={{ fontSize: '10.5px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '360px' }}>
                        {c.headquarters} · <span style={{ color: 'var(--color-muted)' }}>{c.segment}</span> · {CALLING_REGIONS[c.callingRegion]?.label || c.callingRegion}
                      </div>
                    </td>

                    {/* Propulsion & Engine Readiness: Clean single-line badge */}
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                      {c.fleetCapability === 'DUAL_FUEL_LNG' ? (
                        <span
                          className="chip chip-pos"
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            letterSpacing: '0.02em',
                          }}
                          title={`Dual-Fuel LNG Ready (${c.lng_vessels_in_scope} LNG vessels of ${c.vessels_in_scope} total)`}
                        >
                          <Flame size={10} style={{ color: '#047857' }} /> DUAL-FUEL LNG ({c.lng_vessels_in_scope})
                        </span>
                      ) : (
                        <span
                          className="chip"
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 500,
                            padding: '2px 6px',
                            letterSpacing: '0.02em',
                            color: 'var(--color-muted)',
                          }}
                          title={`Conventional Propulsion (${c.vessels_in_scope} vessels)`}
                        >
                          CONVENTIONAL
                        </span>
                      )}
                    </td>

                    {/* Vessels in Scope */}
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '12px', fontFamily: MONO_FONT }}>
                      {c.vessels_in_scope}
                    </td>

                    {/* FuelEU Penalty */}
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '12px', fontWeight: 600, fontFamily: MONO_FONT }}>
                      <span style={{ color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                        {isSurplus ? '€0 (Surplus)' : `€${(c.penalty_2025_y1_eur / 1e6).toFixed(2)}M`}
                      </span>
                    </td>

                    {/* EU ETS 2025 */}
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '12px', fontWeight: 500, color: 'var(--color-status-warn-text, #d97706)', fontFamily: MONO_FONT }}>
                      €{(c.ets_exposure_2025_eur / 1e6).toFixed(2)}M
                    </td>

                    {/* Combined 2025 */}
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text)', fontFamily: MONO_FONT }}>
                      €{(c.combined_regulatory_exposure_2025_eur / 1e6).toFixed(2)}M
                    </td>

                    {/* Net Savings */}
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-status-pos-text)', fontFamily: MONO_FONT }}>
                      €{(c.client_savings_physical_eur / 1e6).toFixed(2)}M
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', padding: '6px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectCounterparty(c)}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '0 10px', height: '26px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                          title="Select Counterparty for Deal Flow"
                        >
                          <span>Select</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot style={{ borderTop: '2px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
            <tr>
              <td style={{ textAlign: 'center', padding: '7px 6px', fontSize: '11px', color: 'var(--color-muted)', fontWeight: 700 }}>
                Σ
              </td>
              <td style={{ padding: '7px 12px', fontWeight: 700, fontSize: '12px' }}>
                Total Active ({filteredCounterparties.length} of {FUEL_EU_SHIPPING_COUNTERPARTIES.length} Groups)
              </td>
              <td className="num font-mono" style={{ textAlign: 'center', padding: '7px 8px', fontSize: '11px', color: 'var(--color-muted)', fontFamily: MONO_FONT }}>
                {aggregateMetrics.dualFuelCount} LNG · {aggregateMetrics.conventionalCount} Conv
              </td>
              <td className="num font-mono" style={{ textAlign: 'right', padding: '7px 8px', fontWeight: 700, fontSize: '12px', fontFamily: MONO_FONT }}>
                {aggregateMetrics.vesselCount.toLocaleString()}
              </td>
              <td className="num font-mono" style={{ textAlign: 'right', padding: '7px 8px', fontWeight: 700, fontSize: '12px', color: 'var(--color-status-neg-text)', fontFamily: MONO_FONT }}>
                €{aggregateMetrics.netPenaltyM}M
              </td>
              <td className="num font-mono" style={{ textAlign: 'right', padding: '7px 8px', fontWeight: 700, fontSize: '12px', color: 'var(--color-status-warn-text, #d97706)', fontFamily: MONO_FONT }}>
                €{aggregateMetrics.etsExposureM}M
              </td>
              <td className="num font-mono" style={{ textAlign: 'right', padding: '7px 8px', fontWeight: 800, fontSize: '12px', fontFamily: MONO_FONT }}>
                €{aggregateMetrics.combinedExposureM}M
              </td>
              <td className="num font-mono" style={{ textAlign: 'right', padding: '7px 8px', fontWeight: 700, fontSize: '12px', color: 'var(--color-status-pos-text)', fontFamily: MONO_FONT }}>
                €{aggregateMetrics.clientSavingsM}M
              </td>
              <td style={{ textAlign: 'right', padding: '7px 16px', fontSize: '10.5px', color: 'var(--color-muted)' }}>
                Audited MRV
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom Pagination & Density Controls */}
      <div
        style={{
          padding: '8px 18px',
          borderTop: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11.5px',
        }}
      >
        <span style={{ color: 'var(--color-muted)' }}>
          Showing rows {pageSize === 'ALL' ? (
            <span>all <strong>{filteredCounterparties.length}</strong></span>
          ) : (
            <span><strong>{startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong>{totalItems}</strong></span>
          )} shipping groups
        </span>

        {/* Page Size & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Rows:</span>
            {([25, 50, 100, 'ALL'] as const).map(size => (
              <button
                key={size}
                type="button"
                className={`chip ${pageSize === size ? 'chip-a' : ''}`}
                style={{ cursor: 'pointer', fontSize: '10.5px', padding: '2px 7px' }}
                onClick={() => { setPageSize(size); setCurrentPage(1); }}
              >
                {size === 'ALL' ? 'All' : size}
              </button>
            ))}
          </div>

          {pageSize !== 'ALL' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '26px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(Math.max(1, validCurrentPage - 1))}
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <span className="num" style={{ fontSize: '11px', padding: '0 6px', fontWeight: 600 }}>
                {validCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '26px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, validCurrentPage + 1))}
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
