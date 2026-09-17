import React, { useState, useMemo } from 'react';
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
import { ShippingCounterpartyModal } from './ShippingCounterpartyModal';
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

export function CounterpartyDirectoryTable() {
  const navigate = useNavigate();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [selectedCapability, setSelectedCapability] = useState<'ALL' | 'DUAL_FUEL_LNG' | 'CONVENTIONAL_ONLY'>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedTradeLane, setSelectedTradeLane] = useState<string>('ALL');
  const [selectedHub, setSelectedHub] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedBalanceType, setSelectedBalanceType] = useState<'ALL' | 'DEFICIT' | 'SURPLUS'>('ALL');

  // Sorting state - ranked by default by Statutory Penalty Exposure / Rank
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal counterparty state
  const [activeCounterparty, setActiveCounterparty] = useState<ShippingCounterparty | null>(null);

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
      {/* 4 Core Institutional Metric Ledger Strip */}
      <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">Fleet Energy &amp; Engine Scope</span>
            <span className="chip chip-info">100% Verified</span>
          </div>
          <div className="big num">{aggregateMetrics.fleetEnergyTWh} TWh</div>
          <div className="subttl num">
            {aggregateMetrics.vesselCount.toLocaleString()} vessels ({aggregateMetrics.dualFuelCount} Dual-Fuel LNG · {aggregateMetrics.conventionalCount} Conventional)
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">2025 FuelEU Deficit &amp; Penalty</span>
            <span className="chip chip-neg">-2.0% Target</span>
          </div>
          <div className="big num" style={{ color: 'var(--color-status-neg-text, #b91c1c)' }}>
            €{aggregateMetrics.netPenaltyM}M
          </div>
          <div className="subttl num">
            Net Deficit: -{aggregateMetrics.grossDeficitKt} kt · Surplus: +{aggregateMetrics.lngSurplusKt} kt
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">2025 EU ETS Carbon Liability</span>
            <span className="chip chip-warn">70% Phase-In (€70/t)</span>
          </div>
          <div className="big num" style={{ color: 'var(--color-status-warn-text, #d97706)' }}>
            €{aggregateMetrics.etsExposureM}M
          </div>
          <div className="subttl num">
            Directive (EU) 2023/959 Maritime MRV burn liability
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="eyebrow">Combined 2025 Regulatory Exposure</span>
            <span className="chip chip-neg" style={{ fontWeight: 700 }}>FuelEU + EU ETS</span>
          </div>
          <div className="big num" style={{ color: 'var(--color-accent)' }}>
            €{aggregateMetrics.combinedExposureM}M
          </div>
          <div className="subttl num">
            Client Potential Savings: <strong style={{ color: 'var(--color-status-pos-text)' }}>€{aggregateMetrics.clientSavingsM}M</strong> with Bio-LNG
          </div>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div
        style={{
          padding: '10px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {/* Search input and Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Search company, executive, hub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: '26px', height: '30px', fontSize: '12px' }}
            />
          </div>

          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="input"
            style={{ width: 'auto', height: '30px', fontSize: '12px', padding: '0 8px' }}
            aria-label="Filter by shipping segment"
          >
            <option value="ALL">All Segments ({segments.length})</option>
            {segments.map(seg => (
              <option key={seg} value={seg}>{seg}</option>
            ))}
          </select>

          <select
            value={selectedCapability}
            onChange={(e) => { setSelectedCapability(e.target.value as any); setCurrentPage(1); }}
            className="input"
            style={{ width: 'auto', height: '30px', fontSize: '12px', padding: '0 8px' }}
            aria-label="Filter by engine readiness capability"
          >
            <option value="ALL">All Engine Types ({FUEL_EU_SHIPPING_COUNTERPARTIES.length})</option>
            <option value="DUAL_FUEL_LNG">⚡ Dual-Fuel LNG Ready ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.fleetCapability === 'DUAL_FUEL_LNG').length})</option>
            <option value="CONVENTIONAL_ONLY">⚓ Conventional Only ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.fleetCapability === 'CONVENTIONAL_ONLY').length})</option>
          </select>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="input"
            style={{ width: 'auto', height: '30px', fontSize: '12px', padding: '0 8px' }}
            aria-label="Filter by calling region"
          >
            <option value="ALL">All Calling Regions ({Object.keys(CALLING_REGIONS).length})</option>
            {Object.values(CALLING_REGIONS).map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>

          <select
            value={selectedTradeLane}
            onChange={(e) => setSelectedTradeLane(e.target.value)}
            className="input"
            style={{ width: 'auto', height: '30px', fontSize: '12px', padding: '0 8px' }}
            aria-label="Filter by trade lane"
          >
            <option value="ALL">All Trade Lanes ({Object.keys(TRADE_LANES).length})</option>
            {Object.values(TRADE_LANES).map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>

          <select
            value={selectedHub}
            onChange={(e) => setSelectedHub(e.target.value)}
            className="input"
            style={{ width: 'auto', height: '30px', fontSize: '12px', padding: '0 8px' }}
            aria-label="Filter by bunkering hub"
          >
            <option value="ALL">All Bunker Hubs ({bunkerHubs.length})</option>
            {bunkerHubs.map(hub => (
              <option key={hub} value={hub}>{hub}</option>
            ))}
          </select>

          <select
            value={selectedTier}
            onChange={(e) => { setSelectedTier(e.target.value); setCurrentPage(1); }}
            className="input"
            style={{ width: 'auto', height: '30px', fontSize: '12px', padding: '0 8px' }}
            aria-label="Filter by strategy tier"
          >
            <option value="ALL">All Strategy Tiers</option>
            <option value="TIER_1">Tier 1: Mega-Deficit (&gt;€10M / year)</option>
            <option value="TIER_2">Tier 2: Mid-Tier Compliance Buyers (€2M – €10M / year)</option>
            <option value="TIER_3">Tier 3: Regional &amp; Feeder Deficit (&lt;€2M / year)</option>
            <option value="TIER_4">Tier 4: Over-Compliant Surplus Sellers</option>
          </select>

          <select
            value={selectedBalanceType}
            onChange={(e) => { setSelectedBalanceType(e.target.value as 'ALL' | 'DEFICIT' | 'SURPLUS'); setCurrentPage(1); }}
            className="input"
            style={{ width: 'auto', height: '30px', fontSize: '12px', padding: '0 8px' }}
            aria-label="Filter by compliance balance status"
          >
            <option value="ALL">All Balances</option>
            <option value="DEFICIT">Deficit Carriers Only ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2025_tco2e < 0).length})</option>
            <option value="SURPLUS">Surplus Providers Only ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2025_tco2e > 0).length})</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px', height: '30px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Reset Filters"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* Export Buttons: CRM Outreach & Table */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleExportCrmCsv}
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '4px 12px', height: '30px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Export CRM-ready dossier for Salesforce / HubSpot outreach"
          >
            <FileSpreadsheet size={13} /> Export CRM Outreach (.CSV)
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px', height: '30px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Export raw data table"
          >
            <Download size={12} /> Export Table ({filteredCounterparties.length})
          </button>
        </div>
      </div>

      {/* Quick Preset Filter Strip */}
      <div
        style={{
          padding: '8px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-panel-header)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
        }}
        className="noscroll"
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Engine:
        </span>
        <button
          type="button"
          className={`chip ${selectedCapability === 'ALL' && !isFiltered ? 'chip-a' : selectedCapability === 'ALL' ? 'chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => { setSelectedCapability('ALL'); setCurrentPage(1); }}
        >
          All ({FUEL_EU_SHIPPING_COUNTERPARTIES.length})
        </button>
        <button
          type="button"
          className={`chip ${selectedCapability === 'DUAL_FUEL_LNG' ? 'chip-pos chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          onClick={() => { setSelectedCapability(prev => prev === 'DUAL_FUEL_LNG' ? 'ALL' : 'DUAL_FUEL_LNG'); setCurrentPage(1); }}
        >
          ⚡ Dual-Fuel LNG ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.fleetCapability === 'DUAL_FUEL_LNG').length})
        </button>
        <button
          type="button"
          className={`chip ${selectedCapability === 'CONVENTIONAL_ONLY' ? 'chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          onClick={() => { setSelectedCapability(prev => prev === 'CONVENTIONAL_ONLY' ? 'ALL' : 'CONVENTIONAL_ONLY'); setCurrentPage(1); }}
        >
          ⚓ Conventional ({FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.fleetCapability === 'CONVENTIONAL_ONLY').length})
        </button>

        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '6px' }}>
          Segment:
        </span>
        <button
          type="button"
          className={`chip ${selectedSegment === 'Container Liner' ? 'chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => { resetFilters(); setSelectedSegment('Container Liner'); }}
        >
          🚢 Containers
        </button>
        <button
          type="button"
          className={`chip ${selectedSegment.includes('Tanker') ? 'chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => { resetFilters(); setSelectedSegment('Crude & Product Tanker'); }}
        >
          🛢️ Tankers
        </button>
        <button
          type="button"
          className={`chip ${selectedSegment === 'Dry Bulk Carrier' ? 'chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => { resetFilters(); setSelectedSegment('Dry Bulk Carrier'); }}
        >
          ⛰️ Dry Bulk
        </button>
        <button
          type="button"
          className={`chip ${selectedSegment === 'European Ferry & Ro-Ro' ? 'chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => { resetFilters(); setSelectedSegment('European Ferry & Ro-Ro'); }}
        >
          🚗 Ferries &amp; Ro-Ro
        </button>
        <button
          type="button"
          className={`chip ${selectedSegment.includes('Cargo') || selectedSegment.includes('Coaster') ? 'chip-a' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => { resetFilters(); setSelectedSegment('General Cargo / Coaster'); }}
        >
          📦 Coasters &amp; Cargo
        </button>
        <button
          type="button"
          className={`chip ${selectedBalanceType === 'DEFICIT' ? 'chip-neg' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => { resetFilters(); setSelectedBalanceType('DEFICIT'); }}
        >
          🚨 Deficit Only
        </button>
        <button
          type="button"
          className={`chip ${selectedBalanceType === 'SURPLUS' ? 'chip-pos' : ''}`}
          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
          onClick={() => { resetFilters(); setSelectedBalanceType('SURPLUS'); }}
        >
          🟢 LNG Surplus
        </button>

        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '6px' }}>
          Region:
        </span>
        {Object.values(CALLING_REGIONS).map(r => (
          <button
            key={r.id}
            type="button"
            className={`chip ${selectedRegion === r.id ? 'chip-a' : ''}`}
            style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
            onClick={() => setSelectedRegion(prev => prev === r.id ? 'ALL' : r.id)}
            title={r.portsDescription}
          >
            {r.label}
          </button>
        ))}

        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '6px' }}>
          Lane:
        </span>
        {Object.values(TRADE_LANES).map(l => (
          <button
            key={l.id}
            type="button"
            className={`chip ${selectedTradeLane === l.id ? 'chip-a' : ''}`}
            style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
            onClick={() => setSelectedTradeLane(prev => prev === l.id ? 'ALL' : l.id)}
            title={l.corridorDescription}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Directory Status & Pagination Controls */}
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
            Showing {pageSize === 'ALL' ? (
              <span>all <strong style={{ color: 'var(--color-accent)' }}>{filteredCounterparties.length}</strong></span>
            ) : (
              <span><strong style={{ color: 'var(--color-accent)' }}>{startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong>{totalItems}</strong></span>
            )} Shipping Groups
          </span>
          <span className="subttl" style={{ fontSize: '11px' }}>
            ({aggregateMetrics.vesselCount.toLocaleString()} vessels across Europe)
          </span>
          {isFiltered && (
            <span className="chip chip-warn" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Filter active ({filteredCounterparties.length} of {FUEL_EU_SHIPPING_COUNTERPARTIES.length})
              <button
                type="button"
                onClick={resetFilters}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontWeight: 700, marginLeft: '3px' }}
                title="Clear all filters"
              >
                ✕
              </button>
            </span>
          )}
        </div>

        {/* View Density / Pagination Controls (25, 50, 100, All) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Page Size:</span>
            {([25, 50, 100, 'ALL'] as const).map(size => (
              <button
                key={size}
                type="button"
                className={`chip ${pageSize === size ? 'chip-a' : ''}`}
                style={{ cursor: 'pointer', fontSize: '10.5px', padding: '2px 7px' }}
                onClick={() => { setPageSize(size); setCurrentPage(1); }}
              >
                {size === 'ALL' ? `All (${filteredCounterparties.length})` : `${size}/page`}
              </button>
            ))}
          </div>

          {pageSize !== 'ALL' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '24px', padding: '0 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(Math.max(1, validCurrentPage - 1))}
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <span className="num" style={{ fontSize: '11px', padding: '0 4px' }}>
                Page {validCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '24px', padding: '0 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, validCurrentPage + 1))}
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Counterparty Table */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="table" style={{ width: '100%', margin: 0 }}>
          <thead>
            <tr>
              <th
                style={{ width: '56px', textAlign: 'center', paddingLeft: '14px', cursor: 'pointer', fontSize: '11px' }}
                onClick={() => handleSort('rank')}
                title="Sort by FuelEU Statutory Penalty Exposure Rank"
              >
                Rank {sortField === 'rank' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{ cursor: 'pointer', paddingLeft: '14px' }}
                onClick={() => handleSort('parent_name')}
              >
                Shipping Group {sortField === 'parent_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{ textAlign: 'center', minWidth: '130px', cursor: 'pointer' }}
                onClick={() => handleSort('lng_vessels_in_scope')}
                title="Sort by Fleet Engine Capability & Dual-Fuel LNG Readiness"
              >
                Engine Readiness {sortField === 'lng_vessels_in_scope' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{ cursor: 'pointer', textAlign: 'center' }}
                onClick={() => handleSort('vessels_in_scope')}
              >
                Vessels {sortField === 'vessels_in_scope' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{ cursor: 'pointer', textAlign: 'right' }}
                onClick={() => handleSort('penalty_2025_y1_eur')}
                title="FuelEU Maritime Statutory Penalty Exposure (Year 1)"
              >
                FuelEU Penalty {sortField === 'penalty_2025_y1_eur' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{ cursor: 'pointer', textAlign: 'right' }}
                onClick={() => handleSort('ets_exposure_2025_eur')}
                title="EU ETS Maritime 2025 Liability (Directive (EU) 2023/959 70% Phase-In @ €70/t EUA)"
              >
                EU ETS 2025 {sortField === 'ets_exposure_2025_eur' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{ cursor: 'pointer', textAlign: 'right' }}
                onClick={() => handleSort('combined_regulatory_exposure_2025_eur')}
                title="Combined 2025 Statutory Exposure (FuelEU Penalty + EU ETS 70% Liability)"
              >
                Combined 2025 {sortField === 'combined_regulatory_exposure_2025_eur' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{ cursor: 'pointer', textAlign: 'right' }}
                onClick={() => handleSort('client_savings_physical_eur')}
                title="Client Net Statutory Compliance Savings with RED III Bio-LNG"
              >
                Net Savings {sortField === 'client_savings_physical_eur' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ textAlign: 'right', paddingRight: '18px' }}>Actions</th>
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
              paginatedCounterparties.map((c, idx) => {
                const isSurplus = c.compliance_balance_2025_tco2e > 0;
                return (
                  <tr
                    key={c.parent_name}
                    data-click="1"
                    onClick={() => setActiveCounterparty(c)}
                  >
                    {/* Statutory Exposure Rank */}
                    <td className="num" style={{ textAlign: 'center', paddingLeft: '14px' }}>
                      <span
                        className={`chip ${getStrategyTierBadgeClass(c.strategy_tier)}`}
                        style={{ fontWeight: 700, fontSize: '11px', minWidth: '34px', display: 'inline-flex', justifyContent: 'center' }}
                        title={`${c.strategy_tier} (Statutory Exposure Rank #${c.rank})`}
                      >
                        #{c.rank}
                      </span>
                    </td>

                    {/* Company Name & Segment */}
                    <td style={{ paddingLeft: '14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {c.parent_name}
                      </div>
                      <div className="subttl" style={{ fontSize: '11px', marginTop: '1px' }}>
                        {c.headquarters} · <span style={{ color: 'var(--color-muted)' }}>{c.segment}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span className="chip" style={{ fontSize: '9.5px', padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title={CALLING_REGIONS[c.callingRegion]?.portsDescription}>
                          <MapPin size={9} style={{ color: 'var(--color-accent)' }} /> {CALLING_REGIONS[c.callingRegion]?.label || c.callingRegion}
                        </span>
                        <span className="chip" style={{ fontSize: '9.5px', padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title={TRADE_LANES[c.tradeLane]?.corridorDescription}>
                          <Compass size={9} style={{ color: 'var(--color-muted)' }} /> {TRADE_LANES[c.tradeLane]?.label || c.tradeLane}
                        </span>
                      </div>
                    </td>

                    {/* Engine Readiness Badge */}
                    <td style={{ textAlign: 'center' }}>
                      {c.fleetCapability === 'DUAL_FUEL_LNG' ? (
                        <div>
                          <span
                            className="chip chip-pos"
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              letterSpacing: '0.02em',
                            }}
                            title={`Dual-Fuel Cryogenic LNG Ready (${c.lng_vessels_in_scope} LNG vessels in scope)`}
                          >
                            <Flame size={10} style={{ color: '#047857' }} /> DUAL-FUEL LNG
                          </span>
                          <div className="subttl num" style={{ fontSize: '10px', marginTop: '2px' }}>
                            {c.lng_vessels_in_scope} LNG / {c.vessels_in_scope} total
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span
                            className="chip"
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: 'var(--color-muted)',
                            }}
                            title="Standard 2-stroke diesel engine (Article 21 compliance pooling / drop-in certified biofuels)"
                          >
                            <Anchor size={10} /> CONVENTIONAL
                          </span>
                          <div className="subttl num" style={{ fontSize: '10px', marginTop: '2px' }}>
                            {c.vessels_in_scope} diesel/HFO
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Vessels in Scope */}
                    <td className="num" style={{ textAlign: 'center' }}>
                      {c.vessels_in_scope}
                    </td>

                    {/* FuelEU Statutory Penalty */}
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                      <span style={{ color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                        {isSurplus ? '€0' : `€${(c.penalty_2025_y1_eur / 1000000).toFixed(2)}M`}
                      </span>
                    </td>

                    {/* EU ETS 2025 Exposure */}
                    <td className="num" style={{ textAlign: 'right', fontWeight: 500, color: 'var(--color-status-warn-text, #d97706)' }}>
                      €{(c.ets_exposure_2025_eur / 1000000).toFixed(2)}M
                    </td>

                    {/* Combined 2025 Regulatory Exposure */}
                    <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>
                      €{(c.combined_regulatory_exposure_2025_eur / 1000000).toFixed(2)}M
                    </td>

                    {/* Client Savings Potential */}
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-status-pos-text)' }}>
                      €{(c.client_savings_physical_eur / 1000000).toFixed(2)}M
                    </td>

                    {/* Action buttons */}
                    <td style={{ textAlign: 'right', paddingRight: '18px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveCounterparty(c)}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
                          title="View Counterparty Dossier & Term Sheet"
                        >
                          Dossier
                        </button>
                        {!isSurplus && (
                          <button
                            type="button"
                            onClick={(e) => handleTradeBuilder(c, e)}
                            className="btn btn-primary"
                            style={{ fontSize: '11px', padding: '2px 8px', height: '26px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Structure Bio-LNG Deficit in Trade Builder"
                          >
                            <Zap size={11} /> Trade
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot style={{ borderTop: '2px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)' }}>
            <tr>
              <td style={{ textAlign: 'center', paddingLeft: '14px', fontSize: '11px', color: 'var(--color-muted)', fontWeight: 700 }}>
                Σ
              </td>
              <td style={{ paddingLeft: '14px', fontWeight: 700, fontSize: '12px' }}>
                Total Active ({filteredCounterparties.length} of {FUEL_EU_SHIPPING_COUNTERPARTIES.length} Groups)
              </td>
              <td className="num" style={{ textAlign: 'center', fontWeight: 700 }}>
                {aggregateMetrics.vesselCount.toLocaleString()}
              </td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                {aggregateMetrics.fleetEnergyTWh} TWh
              </td>
              <td style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-muted)' }}>
                89.34 req
              </td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-status-neg-text)' }}>
                -{aggregateMetrics.grossDeficitKt} kt
              </td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                €{aggregateMetrics.netPenaltyM}M
              </td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                {aggregateMetrics.bioLngGWh} GWh
              </td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-status-pos-text)' }}>
                €{aggregateMetrics.clientSavingsM}M
              </td>
              <td style={{ textAlign: 'right', paddingRight: '18px', fontSize: '10.5px', color: 'var(--color-muted)' }}>
                100% Verified
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom Pagination Bar (when viewing paginated pages) */}
      {pageSize !== 'ALL' && totalPages > 1 && (
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <span style={{ color: 'var(--color-muted)' }}>
            Showing rows {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} of {totalItems} shipping groups
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: '28px', padding: '0 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(Math.max(1, validCurrentPage - 1))}
            >
              <ChevronLeft size={13} /> Previous Page
            </button>
            <span className="num" style={{ fontWeight: 600, padding: '0 8px' }}>
              Page {validCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: '28px', padding: '0 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(Math.min(totalPages, validCurrentPage + 1))}
            >
              Next Page <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Profile / Term Sheet */}
      <ShippingCounterpartyModal
        counterparty={activeCounterparty}
        onClose={() => setActiveCounterparty(null)}
      />
    </div>
  );
}
