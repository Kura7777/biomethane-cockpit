import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArbitrageOpportunity } from '../../domain/arbitrage/types';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
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
    const plantVolume = plantAnnualGWh ? Math.round(plantAnnualGWh * 1000) : undefined;

    navigate(buildDealUrl({
      marketId: opp.targetMarketId,
      originCountry: opp.originCountry,
      feedstock: opp.feedstockKey,
      ci: opp.carbonIntensity,
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
    <div className="bg-[#0e1118] border border-[#1e2433] rounded-lg flex flex-col h-full w-full overflow-hidden shadow-sm">
      {/* Table Control Strip: Header & Global Filters */}
      <div className="p-3 border-b border-[#1e2433] flex flex-wrap items-center justify-between gap-3 bg-[#08090d]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[#141824] border border-[#1e2433] flex items-center justify-center text-cyan-400 shadow-xs">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-100">
                Institutional Sourcing &amp; Netback Data Grid
              </span>
              <span className="font-mono text-[9px] bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 px-2 py-0.2 rounded font-bold">
                {sortedOpps.length} Eligible Routes
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              Live Continental Arbitrage Scanner · Click any row to inspect Deal Dossier &amp; Topology
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search facility, origin, feedstock, market..."
              className="pl-8 pr-3 py-1 bg-[#08090d] border border-[#1e2433] hover:border-[#2b3347] rounded text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:border-cyan-500 focus:outline-none transition-colors w-52 sm:w-72"
            />
          </div>

          {/* Quick Sort Pills */}
          <div className="flex items-center bg-[#08090d] p-0.5 rounded border border-[#1e2433]">
            <button
              type="button"
              onClick={() => toggleSort('MARGIN')}
              className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortBy === 'MARGIN' ? 'bg-[#141824] text-cyan-300 border border-cyan-500/40 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Max Margin</span>
              {sortBy === 'MARGIN' && <span className="text-[9px]">{sortOrder === 'DESC' ? '↓' : '↑'}</span>}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('COST')}
              className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortBy === 'COST' ? 'bg-[#141824] text-cyan-300 border border-cyan-500/40 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Lowest Cost</span>
              {sortBy === 'COST' && <span className="text-[9px]">{sortOrder === 'DESC' ? '↓' : '↑'}</span>}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('DISTANCE')}
              className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortBy === 'DISTANCE' ? 'bg-[#141824] text-cyan-300 border border-cyan-500/40 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Distance</span>
              {sortBy === 'DISTANCE' && <span className="text-[9px]">{sortOrder === 'DESC' ? '↓' : '↑'}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Full-Width Financial Data Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 font-mono text-xs gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span>Scanning 1,975 European Facilities &amp; Solving Dijkstra Gas Corridors...</span>
          </div>
        ) : sortedOpps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 font-mono text-xs gap-1.5">
            <Building2 className="w-8 h-8 text-zinc-600" />
            <span>No matching opportunities found for current filters.</span>
            <span className="text-zinc-600 text-[11px]">Adjust your feedstock, market criteria, or search term.</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead className="sticky top-0 bg-[#0c1017] z-10 border-b border-[#1e2433] text-[10px] font-mono uppercase tracking-wider text-zinc-400 select-none">
              <tr>
                <th 
                  onClick={() => toggleSort('NAME')} 
                  className="py-2.5 px-3 font-semibold w-[25%] cursor-pointer hover:text-cyan-300 hover:bg-[#141824]/60 transition-colors"
                  title="Click to sort by facility name"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Origin Facility &amp; Producer</span>
                    {sortBy === 'NAME' ? (
                      <span className="text-cyan-400 font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('FEEDSTOCK')} 
                  className="py-2.5 px-3 font-semibold w-[18%] cursor-pointer hover:text-cyan-300 hover:bg-[#141824]/60 transition-colors"
                  title="Click to sort by feedstock"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Feedstock Substrate &amp; CI</span>
                    {sortBy === 'FEEDSTOCK' ? (
                      <span className="text-cyan-400 font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('MARKET')} 
                  className="py-2.5 px-3 font-semibold w-[17%] cursor-pointer hover:text-cyan-300 hover:bg-[#141824]/60 transition-colors"
                  title="Click to sort by destination market"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Destination Market</span>
                    {sortBy === 'MARKET' ? (
                      <span className="text-cyan-400 font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('DISTANCE')} 
                  className="py-2.5 px-3 font-semibold w-[14%] cursor-pointer hover:text-cyan-300 hover:bg-[#141824]/60 transition-colors"
                  title="Click to sort by transmission distance"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Corridor &amp; Distance</span>
                    {sortBy === 'DISTANCE' ? (
                      <span className="text-cyan-400 font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('COST')} 
                  className="py-2.5 px-3 font-semibold text-right w-[11%] cursor-pointer hover:text-cyan-300 hover:bg-[#141824]/60 transition-colors"
                  title="Click to sort by delivered cost"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Delivered Cost</span>
                    {sortBy === 'COST' ? (
                      <span className="text-cyan-400 font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('MARGIN')} 
                  className="py-2.5 px-3 font-semibold text-right w-[10%] cursor-pointer hover:text-cyan-300 hover:bg-[#141824]/60 transition-colors"
                  title="Click to sort by desk trading margin"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Desk Margin</span>
                    {sortBy === 'MARGIN' ? (
                      <span className="text-cyan-400 font-bold">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-center w-[5%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161c28] text-xs font-mono">
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
                    className={`group transition-colors duration-100 cursor-pointer ${
                      isSelected
                        ? 'bg-[#141824] border-l-2 border-l-cyan-400'
                        : 'hover:bg-[#111622] odd:bg-[#08090d] even:bg-[#0a0d14]'
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
                            <span className="font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors truncate">
                              {opp.originPlantName || `${opp.originCountry} Biomethane Facility`}
                            </span>
                            {opp.isDirectPlantSource && (
                              opp.isPlantVerified ? (
                                <span 
                                  className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded shrink-0" 
                                  title="Audited Institutional Producer"
                                >
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  <span>Verified</span>
                                </span>
                              ) : (
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded shrink-0"
                                  title="Unverified Producer — Due Diligence Required"
                                >
                                  Audit Req.
                                </span>
                              )
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
                            <span>{opp.originCountry} Grid Hub</span>
                            {opp.plantAnnualGWh && (
                              <>
                                <span>·</span>
                                <span className="text-zinc-400 tabular-nums">{opp.plantAnnualGWh} GWh/yr</span>
                              </>
                            )}
                            {opp.networkOperator && (
                              <>
                                <span>·</span>
                                <span className="text-zinc-500 truncate max-w-[120px]">{opp.networkOperator}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Feedstock substrate & CI */}
                    <td className="py-2.5 px-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-200 font-medium truncate">
                            {opp.feedstockName}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-bold tabular-nums text-[10px] shrink-0 ${
                            opp.carbonIntensity <= 0 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                              : 'text-zinc-300 bg-[#141824] border border-[#1e2433]'
                          }`}>
                            CI {opp.carbonIntensity > 0 ? `+${opp.carbonIntensity}` : opp.carbonIntensity}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          {opp.targetMarketId === 'UK_RGGO' || opp.targetMarketId.includes('_GO') || opp.targetMarketId === 'VOL_SCOPE1' ? (
                            <span className="text-emerald-400">GHG Protocol / GO</span>
                          ) : (
                            <span className="text-cyan-400">RED III Annex IX-A</span>
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
                          <span className="text-cyan-300 font-bold truncate">
                            {opp.targetMarketName}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                          {opp.targetMarketId} · Quota Compliance
                        </div>
                      </div>
                    </td>

                    {/* 4. Route & Distance */}
                    <td className="py-2.5 px-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-zinc-200">
                          <span className="font-bold tabular-nums">
                            {opp.logisticsDistanceKm ? `${opp.logisticsDistanceKm.toLocaleString()} km` : 'Direct grid'}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <span>{opp.originCountry} ➔ {opp.targetCountry}</span>
                          <span>·</span>
                          <span className="text-cyan-400 font-semibold">
                            {hopsCount === 0 ? 'Direct' : `${hopsCount} hop`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 5. Delivered Cost */}
                    <td className="py-2.5 px-3 text-right">
                      <div>
                        <div className="font-bold text-zinc-200 tabular-nums">
                          {deliveredCostEur !== null ? `€${deliveredCostEur.toFixed(2)}` : '—'}
                        </div>
                        <div className="text-[10px] text-zinc-500 tabular-nums mt-0.5">
                          {gatePriceEur !== null && gatePriceEur !== undefined ? `Gate €${gatePriceEur.toFixed(2)}` : 'Gate —'}
                        </div>
                      </div>
                    </td>

                    {/* 6. Net Deal Margin (Prominent bold emerald badge) */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className={`font-black tabular-nums text-xs px-2 py-0.5 rounded border ${
                          marginEur > 0 
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 shadow-xs' 
                            : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                        }`}>
                          {marginEur > 0 ? '+' : ''}€{marginEur.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
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
                          className="px-2 py-1 rounded bg-[#141824] hover:bg-[#1c2436] border border-[#1e2433] hover:border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Inspect deal waterfall, route corridor, and plant audit trail"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleStructureDeal(opp, e)}
                          className="px-2 py-1 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          title="Route opportunity into Trade Builder"
                        >
                          <Zap className="w-3 h-3 fill-black" />
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

