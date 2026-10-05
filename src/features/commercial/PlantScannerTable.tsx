import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArbitrageOpportunity } from '../../domain/arbitrage/types';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { defaultVolumeMwh } from '../../domain/trade/dealDefaults';
import { RouteStatusBadge } from './RouteStatusBadge';
import { 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  Search,
  CheckCircle2, 
  TrendingUp, 
  Zap,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Activity,
  ArrowUpDown
} from 'lucide-react';
import './plantScannerTable.css';

export interface SourcedOpportunity extends ArbitrageOpportunity {
  originPlantId?: string;
  originPlantName?: string;
  originPlantCoords?: [number, number] | null;
  isDirectPlantSource?: boolean;
  isPlantVerified?: boolean;
  logisticsDistanceKm?: number;
  deliveryMode?: string;
  plantCapacityNm3h?: number | null;
  plantAnnualGWh?: number | null;
  legalEntityName?: string | null;
  networkOperator?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  transitSteps?: string[];
}

export function getCountryFlag(iso: string): string {
  const flags: Record<string, string> = {
    DK: '🇩🇰',
    DE: '🇩🇪',
    FR: '🇫🇷',
    NL: '🇳🇱',
    GB: '🇬🇧',
    UK: '🇬🇧',
    IT: '🇮🇹',
    SE: '🇸🇪',
    ES: '🇪🇸',
    AT: '🇦🇹',
    BE: '🇧🇪',
    PL: '🇵🇱',
    FI: '🇫🇮',
    CH: '🇨🇭',
    IE: '🇮🇪',
    NO: '🇳🇴',
  };
  return flags[iso?.toUpperCase()] || '🇪🇺';
}

export type SortField = 'MARGIN' | 'COST' | 'DISTANCE' | 'NAME' | 'FEEDSTOCK' | 'MARKET';

interface PlantScannerTableProps {
  opportunities: SourcedOpportunity[];
  matchedPlants: BiomethanePlant[];
  selectedOpp: SourcedOpportunity | null;
  onSelectOpp: (opp: SourcedOpportunity) => void;
  onInspect?: (opp: SourcedOpportunity) => void;
  isLoading?: boolean;
  costs?: {
    transferCosts?: number | null;
    certificationCosts?: number | null;
  };
}

export function PlantScannerTable({
  opportunities,
  matchedPlants,
  selectedOpp,
  onSelectOpp,
  onInspect,
  isLoading = false,
  costs
}: PlantScannerTableProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('MARGIN');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

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
    let diff = 0;
    if (sortBy === 'MARGIN') {
      const marginA = a.deskNetMarginEurPerMWh ?? 0;
      const marginB = b.deskNetMarginEurPerMWh ?? 0;
      diff = marginB - marginA;
    } else if (sortBy === 'COST') {
      const costA = (a.producerPayableEurPerMWh ?? 0) + (a.transitCostEurPerMWh ?? 0);
      const costB = (b.producerPayableEurPerMWh ?? 0) + (b.transitCostEurPerMWh ?? 0);
      diff = costA - costB;
    } else if (sortBy === 'DISTANCE') {
      const distA = a.logisticsDistanceKm ?? 0;
      const distB = b.logisticsDistanceKm ?? 0;
      diff = distA - distB;
    } else if (sortBy === 'NAME') {
      const nameA = a.originPlantName || a.originCountry;
      const nameB = b.originPlantName || b.originCountry;
      diff = nameA.localeCompare(nameB);
    } else if (sortBy === 'FEEDSTOCK') {
      diff = a.feedstockName.localeCompare(b.feedstockName);
    } else if (sortBy === 'MARKET') {
      diff = a.targetMarketName.localeCompare(b.targetMarketName);
    }
    return sortOrder === 'DESC' ? diff : -diff;
  });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'DESC' ? 'ASC' : 'DESC'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'COST' || field === 'DISTANCE' || field === 'NAME' || field === 'FEEDSTOCK' || field === 'MARKET' ? 'ASC' : 'DESC');
    }
  };

  const handleRowClick = (opp: SourcedOpportunity) => {
    onSelectOpp(opp);
    if (onInspect) {
      onInspect(opp);
    }
  };

  const handleStructureDeal = (opp: SourcedOpportunity, e: React.MouseEvent) => {
    e.stopPropagation();
    const matched = matchedPlants.find(p => p.id === opp.originPlantId || p.name === opp.originPlantName);
    const plantAnnualGWh = (opp.plantAnnualGWh ?? matched?.annualEnergyGWh) ?? undefined;
    const plantCapacityNm3h = (opp.plantCapacityNm3h ?? matched?.capacityNm3h) ?? undefined;
    const legalEntityName = (opp.legalEntityName ?? matched?.legalEntityName ?? matched?.operator) ?? undefined;
    const networkOperator = (opp.networkOperator ?? matched?.networkOperator) ?? undefined;
    const contactEmail = (opp.contactEmail ?? matched?.contactEmail) ?? undefined;
    const contactPhone = (opp.contactPhone ?? matched?.contactPhone) ?? undefined;
    const plantVolume = plantAnnualGWh ? Math.round(plantAnnualGWh * 1000) : defaultVolumeMwh();

    navigate(buildDealUrl({
      marketId: opp.targetMarketId,
      originCountry: opp.originCountry,
      feedstock: opp.feedstockKey,
      ci: opp.carbonIntensity,
      ciIsEstimated: true,
      volume: plantVolume,
      plantId: opp.originPlantId ?? matched?.id,
      plantName: opp.originPlantName,
      plantCapacityNm3h: plantCapacityNm3h ?? undefined,
      plantAnnualGWh: plantAnnualGWh ?? undefined,
      legalEntityName: legalEntityName ?? undefined,
      networkOperator: networkOperator ?? undefined,
      contactEmail: contactEmail ?? undefined,
      contactPhone: contactPhone ?? undefined,
      counterparty: legalEntityName || opp.originPlantName || 'European Biomethane Producer',
    }));
  };

  return (
    <div className="ps-table rounded-lg flex flex-col h-full w-full overflow-hidden shadow-sm">
      {/* Table Control Strip: Header & Global Filters */}
      <div className="ps-toolbar p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="ps-icon-well w-6 h-6 rounded flex items-center justify-center shadow-xs">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="ps-title text-xs font-bold">
                Institutional Sourcing &amp; Netback Data Grid
              </span>
              <span className="ps-count-badge text-[12px] px-2 py-0.2 rounded font-bold">
                {sortedOpps.length} Routes
              </span>
            </div>
            <p className="ps-subtitle text-[12px]">
              Live Continental Arbitrage Scanner · Click any row to inspect Deal Dossier &amp; Topology
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative">
            <Search className="ps-search-icon w-3.5 h-3.5 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search facility, origin, feedstock, market..."
              className="ps-search-input pl-8 pr-3 py-1 rounded text-xs transition-colors w-52 sm:w-72"
            />
          </div>

          {/* Quick Sort Pills */}
          <div className="ps-sort-group flex items-center p-0.5 rounded">
            <button
              type="button"
              onClick={() => toggleSort('MARGIN')}
              className={`ps-sort-pill px-2.5 py-1 rounded text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortBy === 'MARGIN' ? 'active shadow-xs' : ''
              }`}
            >
              <span>Max Margin</span>
              {sortBy === 'MARGIN' && <span className="text-[12px]">{sortOrder === 'DESC' ? '↓' : '↑'}</span>}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('COST')}
              className={`ps-sort-pill px-2.5 py-1 rounded text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortBy === 'COST' ? 'active shadow-xs' : ''
              }`}
            >
              <span>Lowest Cost</span>
              {sortBy === 'COST' && <span className="text-[12px]">{sortOrder === 'DESC' ? '↓' : '↑'}</span>}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('DISTANCE')}
              className={`ps-sort-pill px-2.5 py-1 rounded text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortBy === 'DISTANCE' ? 'active shadow-xs' : ''
              }`}
            >
              <span>Distance</span>
              {sortBy === 'DISTANCE' && <span className="text-[12px]">{sortOrder === 'DESC' ? '↓' : '↑'}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Full-Width Financial Data Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 ps-loading text-xs gap-3">
            <div className="ps-loading-spinner w-7 h-7 rounded-full animate-spin" />
            <span>Scanning 1,975 European Facilities &amp; Solving Dijkstra Gas Corridors...</span>
          </div>
        ) : sortedOpps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 ps-empty text-xs gap-1.5">
            <Building2 className="ps-empty-icon w-8 h-8" />
            <span>No matching opportunities found for current filters.</span>
            <span className="ps-empty text-[12px]">Adjust your feedstock, market criteria, or search term.</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead className="ps-thead sticky top-0 z-10 text-[12px] select-none">
              <tr>
                <th 
                  onClick={() => toggleSort('NAME')} 
                  className="ps-th py-2.5 px-3 font-semibold w-[25%] transition-colors"
                  title="Click to sort by facility name"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Origin Facility &amp; Producer</span>
                    {sortBy === 'NAME' ? (
                      <span className="ps-sort-indicator font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="ps-sort-icon-idle w-2.5 h-2.5 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('FEEDSTOCK')} 
                  className="ps-th py-2.5 px-3 font-semibold w-[18%] transition-colors"
                  title="Click to sort by feedstock"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Feedstock Substrate &amp; CI</span>
                    {sortBy === 'FEEDSTOCK' ? (
                      <span className="ps-sort-indicator font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="ps-sort-icon-idle w-2.5 h-2.5 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('MARKET')} 
                  className="ps-th py-2.5 px-3 font-semibold w-[17%] transition-colors"
                  title="Click to sort by destination market"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Destination Market</span>
                    {sortBy === 'MARKET' ? (
                      <span className="ps-sort-indicator font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="ps-sort-icon-idle w-2.5 h-2.5 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('DISTANCE')} 
                  className="ps-th py-2.5 px-3 font-semibold w-[14%] transition-colors"
                  title="Click to sort by transmission distance"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Corridor &amp; Distance</span>
                    {sortBy === 'DISTANCE' ? (
                      <span className="ps-sort-indicator font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="ps-sort-icon-idle w-2.5 h-2.5 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('COST')} 
                  className="ps-th py-2.5 px-3 font-semibold text-right w-[11%] transition-colors"
                  title="Click to sort by delivered cost"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Delivered Cost</span>
                    {sortBy === 'COST' ? (
                      <span className="ps-sort-indicator font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="ps-sort-icon-idle w-2.5 h-2.5 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('MARGIN')} 
                  className="ps-th py-2.5 px-3 font-semibold text-right w-[10%] transition-colors"
                  title="Click to sort by desk trading margin"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Desk Margin</span>
                    {sortBy === 'MARGIN' ? (
                      <span className="ps-sort-indicator font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="ps-sort-icon-idle w-2.5 h-2.5 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-center w-[5%]">Actions</th>
              </tr>
            </thead>
            <tbody className="ps-tbody text-xs">
              {sortedOpps.map(opp => {
                const isSelected = selectedOpp?.id === opp.id;
                const marginEur = opp.deskNetMarginEurPerMWh ?? 0;
                const gatePriceEur = opp.producerPayableEurPerMWh;
                const transitEur = opp.transitCostEurPerMWh ?? 0;
                const transferCost = costs?.transferCosts;
                const certCost = costs?.certificationCosts;
                const deliveredCostEur = (gatePriceEur !== null && gatePriceEur !== undefined && transferCost !== null && transferCost !== undefined && certCost !== null && certCost !== undefined)
                  ? gatePriceEur + transitEur + transferCost + certCost
                  : (gatePriceEur !== null && gatePriceEur !== undefined ? gatePriceEur + transitEur : null);
                const hopsCount = Math.max(0, (opp.transitSteps?.length ?? 1) - 1);

                return (
                  <tr
                    key={opp.id}
                    onClick={() => handleRowClick(opp)}
                    className={`ps-row group transition-colors duration-100 cursor-pointer ${
                      isSelected ? 'selected' : ''
                    }`}
                  >
                    {/* 1. Origin & Facility */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0 select-none" title={opp.originCountry}>
                          {getCountryFlag(opp.originCountry)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="ps-cell-name font-bold transition-colors truncate">
                              {opp.originPlantName || `${opp.originCountry} Biomethane Facility`}
                            </span>
                            {opp.isDirectPlantSource && (
                              opp.isPlantVerified ? (
                                <span
                                  className="ps-badge-verified flex items-center gap-0.5 text-[12px] font-bold px-1.5 py-0.2 rounded shrink-0"
                                  title="Core plant fields (location, capacity, feedstock) consistent in the source registry; counterparty details not verified"
                                >
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  <span>Verified</span>
                                </span>
                              ) : (
                                <span
                                  className="ps-badge-warn text-[12px] font-bold px-1.5 py-0.2 rounded shrink-0"
                                  title="Unverified Producer — Due Diligence Required"
                                >
                                  Audit Req.
                                </span>
                              )
                            )}
                          </div>
                          <div className="ps-cell-meta text-[12px] truncate flex items-center gap-1.5 mt-0.5">
                            <span>{opp.originCountry} Grid Hub</span>
                            {opp.plantAnnualGWh && (
                              <>
                                <span>·</span>
                                <span className="ps-cell-meta-strong tabular-nums">{opp.plantAnnualGWh} GWh/yr</span>
                              </>
                            )}
                            {opp.networkOperator && (
                              <span className="ps-network-operator flex items-center gap-1.5">
                                <span>·</span>
                                <span className="truncate max-w-[120px]" title={opp.networkOperator}>{opp.networkOperator}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Feedstock substrate & CI */}
                    <td className="py-2.5 px-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="ps-feedstock-name font-medium truncate">
                            {opp.feedstockName}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-bold tabular-nums text-[12px] shrink-0 ${
                            opp.carbonIntensity <= 0 ? 'ps-ci-good' : 'ps-ci-neutral'
                          }`}>
                            CI {opp.carbonIntensity > 0 ? `+${opp.carbonIntensity}` : opp.carbonIntensity}
                          </span>
                        </div>
                        <div className="ps-cell-meta text-[12px] mt-0.5 flex items-center gap-1">
                          {opp.targetMarketId === 'UK_RGGO' || opp.targetMarketId.includes('_GO') || opp.targetMarketId === 'VOL_SCOPE1' ? (
                            <span className="ps-scheme-alt">GHG Protocol / GO</span>
                          ) : (
                            <span className="ps-scheme-default">RED III Annex IX-A</span>
                          )}
                          <span>·</span>
                          <span>gCO₂e/MJ</span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Destination Market */}
                    <td className="py-2.5 px-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm shrink-0 select-none">
                            {getCountryFlag(opp.targetCountry)}
                          </span>
                          <span className="ps-market-name font-bold truncate">
                            {opp.targetMarketName}
                          </span>
                          <RouteStatusBadge verdict={opp.overallVerdict} detail={opp.eligibility.summary} />
                        </div>
                        <div className="ps-cell-meta text-[12px] mt-0.5 truncate">
                          {opp.targetMarketId} · Quota Compliance
                        </div>
                      </div>
                    </td>

                    {/* 4. Route & Distance */}
                    <td className="py-2.5 px-3">
                      <div>
                        <div className="ps-distance-value flex items-center gap-1.5">
                          <span className="font-bold tabular-nums">
                            {opp.logisticsDistanceKm ? `${opp.logisticsDistanceKm.toLocaleString()} km` : 'Direct grid'}
                          </span>
                        </div>
                        <div className="ps-cell-meta text-[12px] mt-0.5 flex items-center gap-1">
                          <span>{opp.originCountry} ➔ {opp.targetCountry}</span>
                          <span>·</span>
                          <span className="ps-hop-count font-semibold">
                            {hopsCount === 0 ? 'Direct' : `${hopsCount} hop`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 5. Delivered Cost */}
                    <td className="py-2.5 px-3 text-right">
                      <div>
                        <div className="ps-cost-value font-bold tabular-nums">
                          {deliveredCostEur !== null ? `€${deliveredCostEur.toFixed(2)}` : '—'}
                        </div>
                        <div className="ps-cell-meta text-[12px] tabular-nums mt-0.5">
                          {gatePriceEur !== null && gatePriceEur !== undefined ? `Gate €${gatePriceEur.toFixed(2)}` : 'Gate —'}
                        </div>
                      </div>
                    </td>

                    {/* 6. Net Deal Margin (Prominent bold badge — blue positive / red negative) */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className={`ps-margin-badge tabular-nums text-xs px-2 py-0.5 rounded ${
                          marginEur > 0 ? 'ps-pos shadow-xs' : 'ps-neg'
                        }`}>
                          {marginEur > 0 ? '+' : ''}€{marginEur.toFixed(2)}
                        </span>
                        <span className="ps-cell-meta text-[12px] mt-0.5">
                          per MWh
                        </span>
                      </div>
                    </td>

                    {/* 7. Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(opp);
                          }}
                          className="ps-btn-inspect px-2 py-1 rounded text-[12px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Inspect deal waterfall, route corridor, and plant audit trail"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleStructureDeal(opp, e)}
                          className="ps-btn-structure px-2 py-1 rounded text-[12px] font-bold transition-all flex items-center gap-1 shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          title="Route opportunity into Trade Builder"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Structure</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

