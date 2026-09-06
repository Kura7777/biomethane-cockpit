import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKETS, getMarketById, isVoluntaryMarket } from '../../domain/markets/registry';
import { Market, PriceSide, getMarkStaleness } from '../../domain/markets/types';
import { Consignment } from '../../domain/consignment/types';
import { REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeAllNetbacks, computeCertificateValue } from '../../domain/netback/engine';
import { rankNetbacks, getHighestBlockedOpportunity } from '../../domain/netback/ranking';
import { EligibilityAssessment, GateResult } from '../../domain/eligibility/types';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { showToast } from '../../app/DeskToastContainer';
import { BIOMETHANE_PLANTS } from '../../domain/plants/plantsData';
import { estimateFarmgateProcurementCost } from '../../domain/sourcing/benchmarks';
import { 
  Radar, 
  Building2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Layers, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';

const GATE_LETTERS = ['S', 'U', 'M', 'A', 'G', 'N'];
const GATE_TOOLTIP_TITLES = [
  'Scheme recognition',
  'UDB grid ingestion',
  'Mass balance custody',
  'Annex IX feedstock',
  'GHG saving threshold',
  'Member state specifics',
];

export interface PlantArbitrageOpportunity {
  plantId: string;
  plantName: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  feedstockCategory: string;
  feedstockKey: string;
  carbonIntensity: number;
  annualGWh: number;
  annualMWh: number;
  procurementCostEurMwh: number;
  procurementMode: string;
  procurementRationale: string;
  isRestrictedSubsidy: boolean;
  bestMarketId: string;
  bestMarketName: string;
  bestMarketCountry: string;
  bestMarketNetNetback: number;
  logisticsFeeEurMwh: number;
  netMarginEurMwh: number;
  annualProfitEur: number;
  eligibilityVerdict: 'ELIGIBLE' | 'CONDITIONAL' | 'HARD_BLOCK';
}

export function ScannerScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  const [activeTab, setActiveTab] = useState<'ASSET_SCANNER' | 'LADDER'>('ASSET_SCANNER');
  const [bookFilter, setBookFilter] = useState<'ALL' | 'COMPLIANCE' | 'VOLUNTARY'>('ALL');

  // Single ladder mode state
  const [selectedMarketId, setSelectedMarketId] = useState<string>(state.selectedMarketId || 'DE_THG');
  const [positiveOnly, setPositiveOnly] = useState(false);
  const [clearedOnly, setClearedOnly] = useState(false);
  const [hideStale, setHideStale] = useState(false);
  const [minMargin, setMinMargin] = useState<number>(0);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);

  // Asset scanner mode state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedFeedstock, setSelectedFeedstock] = useState<string>('ALL');
  const [minArbitrageSpread, setMinArbitrageSpread] = useState<number>(0);
  const [sortField, setSortField] = useState<'NET_MARGIN' | 'ANNUAL_PNL' | 'VOLUME'>('NET_MARGIN');

  // Active consignment benchmark for ladder
  const consignment: Consignment = useMemo(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    return existing || REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  }, [state.consignments, state.activeConsignmentId]);

  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);

  // Compute all eligibility for ladder
  const eligibilityMap = useMemo(() => {
    const map = new Map<string, EligibilityAssessment>();
    activeMarkets.forEach(m => {
      map.set(m.id, evaluateEligibility(consignment, m));
    });
    return map;
  }, [activeMarkets, consignment]);

  // Compute all netbacks for ladder
  const pricingSides = state.marks.pricingSides;
  const netbackResults = useMemo(() => {
    return computeAllNetbacks(
      consignment,
      activeMarkets,
      state.marks,
      state.costs,
      eligibilityMap,
      pricingSides
    );
  }, [consignment, activeMarkets, state.marks, state.costs, eligibilityMap, pricingSides]);

  // Ranked list for ladder
  const rankedList = useMemo(() => {
    return rankNetbacks(netbackResults, eligibilityMap);
  }, [netbackResults, eligibilityMap]);

  // Highest theoretical blocked opportunity
  const highestBlocked = useMemo(() => {
    return getHighestBlockedOpportunity(rankedList, eligibilityMap);
  }, [rankedList, eligibilityMap]);

  // Filtered ladder rows
  const filteredList = useMemo(() => {
    return rankedList.filter(item => {
      if (bookFilter === 'COMPLIANCE' && isVoluntaryMarket(item.marketId)) return false;
      if (bookFilter === 'VOLUNTARY' && !isVoluntaryMarket(item.marketId)) return false;
      if (positiveOnly && (item.netNetback ?? -1) <= 0) return false;
      if (minMargin > 0 && (item.deskMargin ?? 0) < minMargin) return false;
      const el = eligibilityMap.get(item.marketId);
      if (clearedOnly && el?.overallVerdict !== 'ELIGIBLE') return false;
      if (hideStale) {
        const mark = state.marks.marks[item.marketId];
        if (mark) {
          const st = getMarkStaleness(mark);
          if (st === 'STALE_WARNING' || st === 'STALE_CRITICAL') return false;
        }
      }
      return true;
    });
  }, [rankedList, bookFilter, positiveOnly, minMargin, clearedOnly, hideStale, state.marks.marks, eligibilityMap]);

  // Selected ladder item
  const selectedItem = useMemo(() => {
    return rankedList.find(r => r.marketId === selectedMarketId) || rankedList[0];
  }, [rankedList, selectedMarketId]);

  // ---------------------------------------------------------------------------
  // MULTI-PLANT ASSET ARBITRAGE SCANNER ENGINE (1,975 Plants)
  // ---------------------------------------------------------------------------
  const ttfPrice = state.marks.gasIndex.mid ?? 0;

  const plantOpportunities = useMemo<PlantArbitrageOpportunity[]>(() => {
    const results: PlantArbitrageOpportunity[] = [];

    // Focus on actionable European plants with active status
    const targetPlants = BIOMETHANE_PLANTS.filter(p => !p.status || p.status === 'Active' || p.status.includes('Active'));

    for (const p of targetPlants) {
      const countryCode = (p.countryCode || 'DK').toUpperCase();
      const rawFeedstock = p.primaryFeedstockCategory || 'Manure';

      // Derive CI and standard feedstock key
      let feedstockKey = 'manure';
      let ciScore = -100;

      if (/crop|maize|silage/i.test(rawFeedstock)) {
        feedstockKey = 'energy_crops';
        ciScore = 42;
      } else if (/food|forsu|waste/i.test(rawFeedstock)) {
        feedstockKey = 'food_waste';
        ciScore = 14;
      } else if (/sewage|sludge/i.test(rawFeedstock)) {
        feedstockKey = 'sewage_sludge';
        ciScore = 22;
      } else if (/agri|residue|straw|cive/i.test(rawFeedstock)) {
        feedstockKey = 'agricultural_residues';
        ciScore = 16;
      } else {
        feedstockKey = 'manure';
        ciScore = countryCode === 'DK' ? -100 : -85;
      }

      // Annual Volume
      const annualGWh = p.annualEnergyGWh && p.annualEnergyGWh > 0
        ? p.annualEnergyGWh
        : p.capacityNm3h
        ? Math.round((p.capacityNm3h * 10.5 * 8000) / 1000000)
        : 25;
      const annualMWh = annualGWh * 1000;

      // Procurement Benchmark Cost
      const bench = estimateFarmgateProcurementCost(countryCode, feedstockKey, ciScore, ttfPrice);

      // Temporary Consignment for Multi-Market Evaluation
      const plantConsignment: Consignment = {
        id: p.id,
        name: p.name,
        originCountry: countryCode,
        originCountryName: p.country,
        injectionCountry: countryCode,
        injectionIsEU: countryCode !== 'GB' && countryCode !== 'UK',
        feedstock: feedstockKey,
        feedstockName: rawFeedstock,
        carbonIntensity: ciScore,
        annexClassification: ciScore < 35 ? 'IX_A' : 'CROP',
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: annualMWh,
      };

      // Candidate Markets: Evaluate compliant routes
      // UK only routes to UK_RTFO or UK_RGGO; EU routes to DE_THG, NL_ERE, FR_CPB, IT_CIC, VOL_SCOPE1
      let bestMarketId = 'DE_THG';
      let bestMarketNetNetback = -999;
      let bestVerdict: 'ELIGIBLE' | 'CONDITIONAL' | 'HARD_BLOCK' = 'ELIGIBLE';

      let candidateMarkets = countryCode === 'GB' || countryCode === 'UK'
        ? activeMarkets.filter(m => m.country === 'GB' || m.id === 'VOL_SCOPE1')
        : activeMarkets.filter(m => m.country !== 'GB');

      if (bookFilter === 'COMPLIANCE') {
        candidateMarkets = candidateMarkets.filter(m => !isVoluntaryMarket(m.id));
      } else if (bookFilter === 'VOLUNTARY') {
        candidateMarkets = candidateMarkets.filter(m => isVoluntaryMarket(m.id));
      }

      for (const m of candidateMarkets) {
        const el = evaluateEligibility(plantConsignment, m);
        if (el.overallVerdict === 'HARD_BLOCK') continue;

        const certVal = computeCertificateValue(m, plantConsignment, state.marks, 'mid');
        const certEur = certVal?.valueEurPerMWh ?? 0;
        const totalNet = certEur + ttfPrice;

        if (totalNet > bestMarketNetNetback) {
          bestMarketNetNetback = totalNet;
          bestMarketId = m.id;
          bestVerdict = el.overallVerdict === 'ELIGIBLE' ? 'ELIGIBLE' : 'CONDITIONAL';
        }
      }

      if (bestMarketNetNetback === -999) {
        bestMarketId = bookFilter === 'COMPLIANCE' ? 'DE_THG' : 'AIB_GO';
        bestMarketNetNetback = ttfPrice + 24.5;
        bestVerdict = 'CONDITIONAL';
      }

      const bestMkt = getMarketById(bestMarketId);
      const isDomestic = countryCode === bestMkt?.country;
      const logisticsFee = isDomestic ? 0.75 : 1.65; // Indicative UDB + entry/exit tariff
      const netMargin = bestMarketNetNetback - bench.estimatedCostEurMwh - logisticsFee;
      const annualProfit = netMargin * annualMWh;

      results.push({
        plantId: p.id,
        plantName: p.name,
        countryCode,
        countryName: p.country,
        countryFlag: p.countryFlag || '🇪🇺',
        feedstockCategory: rawFeedstock,
        feedstockKey,
        carbonIntensity: ciScore,
        annualGWh,
        annualMWh,
        procurementCostEurMwh: bench.estimatedCostEurMwh,
        procurementMode: bench.mode,
        procurementRationale: bench.rationale,
        isRestrictedSubsidy: bench.isRestrictedSubsidy,
        bestMarketId,
        bestMarketName: bestMkt?.shortName || bestMarketId,
        bestMarketCountry: bestMkt?.country || 'EU',
        bestMarketNetNetback: Number(bestMarketNetNetback.toFixed(2)),
        logisticsFeeEurMwh: logisticsFee,
        netMarginEurMwh: Number(netMargin.toFixed(2)),
        annualProfitEur: Math.round(annualProfit),
        eligibilityVerdict: bestVerdict,
      });
    }

    return results;
  }, [activeMarkets, state.marks, ttfPrice, bookFilter]);

  // Filtered and Sorted Plant Opportunities
  const filteredPlantOpportunities = useMemo(() => {
    return plantOpportunities
      .filter(p => {
        if (selectedCountry !== 'ALL' && p.countryCode !== selectedCountry) return false;
        if (selectedFeedstock !== 'ALL' && !p.feedstockCategory.toLowerCase().includes(selectedFeedstock.toLowerCase())) return false;
        if (p.netMarginEurMwh < minArbitrageSpread) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return p.plantName.toLowerCase().includes(q) || p.countryName.toLowerCase().includes(q) || p.feedstockCategory.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'NET_MARGIN') return b.netMarginEurMwh - a.netMarginEurMwh;
        if (sortField === 'ANNUAL_PNL') return b.annualProfitEur - a.annualProfitEur;
        return b.annualMWh - a.annualMWh;
      });
  }, [plantOpportunities, selectedCountry, selectedFeedstock, minArbitrageSpread, searchQuery, sortField]);

  // Handle Action to Structure Trade in Builder
  const handleStructurePlantTrade = (opp: PlantArbitrageOpportunity) => {
    dispatch({ type: 'SELECT_MARKET', id: opp.bestMarketId });
    showToast(`Plant ${opp.plantName} transferred into Trade Builder with optimal sink ${opp.bestMarketName}!`);
    navigate(buildDealUrl({
      plantId: opp.plantId,
      plantName: opp.plantName,
      marketId: opp.bestMarketId,
      originCountry: opp.countryCode,
      feedstock: opp.feedstockKey,
      ci: opp.carbonIntensity,
      volume: opp.annualMWh,
      plantAnnualGWh: opp.annualGWh,
    }));
  };

  const handleStructureTrade = useCallback(() => {
    if (!selectedItem) return;
    dispatch({ type: 'SELECT_MARKET', id: selectedItem.marketId });
    showToast('Consignment carried into the trade builder');
    navigate(buildDealUrl({
      marketId: selectedItem.marketId,
      feedstock: consignment.feedstock,
      ci: consignment.carbonIntensity,
      volume: consignment.volumeMWh ?? 10000,
    }));
  }, [selectedItem, consignment, dispatch, navigate]);

  const currentSide = state.marks.pricingSides?.certificateSide || 'mid';
  const avoidedCo2 = ((94.0 - consignment.carbonIntensity) * 0.0036).toFixed(3);
  const selectedNetValue = selectedItem?.netNetback ?? 0;

  // Distinct countries and feedstocks for filter dropdowns
  const availableCountries = useMemo(() => {
    const set = new Set(plantOpportunities.map(p => p.countryCode));
    return ['ALL', ...Array.from(set).sort()];
  }, [plantOpportunities]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Tab Switcher Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '2px solid var(--color-divider)', backgroundColor: 'var(--color-surface)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Radar className="w-6 h-6 text-indigo-500" />
          <div>
            <h3 className="ptitle" style={{ margin: 0, fontSize: '19px' }}>Opportunity & Arbitrage Scanner</h3>
            <div className="subttl" style={{ fontSize: '12px' }}>
              Real-time cross-border arbitrage matching across 1,975 European production assets and statutory compliance sinks.
            </div>
          </div>
        </div>

        {/* Controls: Book Toggle & View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Dual-Book Pill Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'var(--color-bg)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--color-divider)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Book:
            </span>
            <button
              type="button"
              className={`btn ${bookFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '3px 9px' }}
              onClick={() => setBookFilter('ALL')}
            >
              All (50/50)
            </button>
            <button
              type="button"
              className={`btn ${bookFilter === 'COMPLIANCE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '3px 9px' }}
              onClick={() => setBookFilter('COMPLIANCE')}
            >
              🏛️ Compliance (50%)
            </button>
            <button
              type="button"
              className={`btn ${bookFilter === 'VOLUNTARY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '3px 9px' }}
              onClick={() => setBookFilter('VOLUNTARY')}
            >
              🌱 Voluntary (50%)
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="seg" style={{ height: '32px' }}>
            <button
              type="button"
              className={`seg-opt ${activeTab === 'ASSET_SCANNER' ? 'active' : ''}`}
              onClick={() => setActiveTab('ASSET_SCANNER')}
              style={{ fontSize: '12px', padding: '4px 16px', fontWeight: 700 }}
            >
              Multi-Plant Arbitrage (1,975 Assets)
            </button>
            <button
              type="button"
              className={`seg-opt ${activeTab === 'LADDER' ? 'active' : ''}`}
              onClick={() => setActiveTab('LADDER')}
              style={{ fontSize: '12px', padding: '4px 16px', fontWeight: 700 }}
            >
              Single Molecule Netback Ladder
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'ASSET_SCANNER' ? (
        /* =========================================================================
           MODE 1: MULTI-PLANT ASSET ARBITRAGE SCANNER (1,975 PLANTS)
           ========================================================================= */
        <div>
          {/* Asset Scanner Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-bg)', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
              <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Search plant, country, municipality, operator..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            {/* Country Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="eyebrow" style={{ margin: 0 }}>Origin:</span>
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                {availableCountries.map(c => (
                  <option key={c} value={c}>{c === 'ALL' ? 'All European Origins' : c}</option>
                ))}
              </select>
            </div>

            {/* Min Spread Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="eyebrow" style={{ margin: 0 }}>Min Spread:</span>
              {[0, 10, 25, 50].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${minArbitrageSpread === s ? 'chip-a' : ''}`}
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                  onClick={() => setMinArbitrageSpread(s)}
                >
                  {s === 0 ? 'All' : `≥€${s}/MWh`}
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <span className="eyebrow" style={{ margin: 0 }}>Sort by:</span>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as any)}
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <option value="NET_MARGIN">Highest Net Spread (€/MWh)</option>
                <option value="ANNUAL_PNL">Largest Annual Gross Profit (€)</option>
                <option value="VOLUME">Plant Volume Capacity (GWh)</option>
              </select>
            </div>
          </div>

          {/* Arbitrage Summary Stats Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <span>
              Showing <strong>{filteredPlantOpportunities.length}</strong> actionable plants · TTF Month-Ahead Benchmark: <strong>€{ttfPrice.toFixed(2)}/MWh</strong>
            </span>
            <span>
              Top Arbitrage Spread: <strong style={{ color: '#16a34a' }}>+€{filteredPlantOpportunities[0]?.netMarginEurMwh ?? 0}/MWh</strong>
            </span>
          </div>

          {/* Multi-Plant Arbitrage Table */}
          <div style={{ overflowX: 'auto', padding: '0 20px 20px' }}>
            <table className="table" style={{ width: '100%', marginTop: '10px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Production Asset & Country</th>
                  <th>Substrate & Carbon Intensity</th>
                  <th style={{ textAlign: 'right' }}>Annual Volume</th>
                  <th style={{ textAlign: 'right' }}>Est. Procurement</th>
                  <th>Optimal Statutory Sink</th>
                  <th style={{ textAlign: 'right' }}>Gross Netback</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Net Spread €/MWh</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Annual Gross PnL</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlantOpportunities.slice(0, 50).map((opp, idx) => (
                  <tr key={opp.plantId} style={{ backgroundColor: opp.isRestrictedSubsidy ? 'rgba(239, 68, 68, 0.03)' : undefined }}>
                    <td className="num dim">{String(idx + 1).padStart(2, '0')}</td>
                    <td>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{opp.countryFlag}</span>
                        <span>{opp.plantName}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {opp.countryName} ({opp.countryCode}) {opp.isRestrictedSubsidy ? '· ⚠ State Auction Feed-in Tariff' : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{opp.feedstockCategory}</div>
                      <div style={{ fontSize: '11px', color: opp.carbonIntensity < 0 ? '#16a34a' : 'var(--color-text-secondary)', fontWeight: opp.carbonIntensity < 0 ? 700 : 400 }}>
                        CI: {opp.carbonIntensity} gCO₂e/MJ
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{opp.annualGWh.toLocaleString()} GWh</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{(opp.annualMWh).toLocaleString()} MWh</div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>€{opp.procurementCostEurMwh.toFixed(2)}</div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{opp.procurementMode === 'FIXED_FARMGATE' ? 'Fixed Farmgate' : 'TTF + Premium'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          backgroundColor: opp.bestMarketId === 'DE_THG' ? 'rgba(22, 163, 74, 0.1)' : opp.bestMarketId === 'NL_ERE' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(0,0,0,0.06)',
                          color: opp.bestMarketId === 'DE_THG' ? '#16a34a' : opp.bestMarketId === 'NL_ERE' ? '#2563eb' : 'var(--color-text)'
                        }}>
                          {opp.bestMarketName}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Transit friction: €{opp.logisticsFeeEurMwh.toFixed(2)}/MWh
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                      €{opp.bestMarketNetNetback.toFixed(2)}
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: opp.netMarginEurMwh >= 15 ? '#16a34a' : opp.netMarginEurMwh >= 0 ? '#2563eb' : '#dc2626',
                      }}>
                        {opp.netMarginEurMwh >= 0 ? `+€${opp.netMarginEurMwh.toFixed(2)}` : `−€${Math.abs(opp.netMarginEurMwh).toFixed(2)}`}
                      </span>
                    </td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 800, color: opp.annualProfitEur >= 0 ? 'var(--color-text)' : '#dc2626' }}>
                      {opp.annualProfitEur >= 0 ? `+€${(opp.annualProfitEur / 1000).toFixed(0)}k` : `−€${(Math.abs(opp.annualProfitEur) / 1000).toFixed(0)}k`}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleStructurePlantTrade(opp)}
                        style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Zap className="w-3 h-3" />
                        Structure ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* =========================================================================
           MODE 2: SINGLE CONSIGNMENT NETBACK LADDER
           ========================================================================= */
        <div>
          {/* Header block */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '24px',
              padding: '16px 20px',
              borderBottom: '2px solid var(--color-divider)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="eyebrow">Active Reference Consignment</div>
              <h3 className="ptitle" style={{ marginTop: '5px' }}>Netback ladder</h3>
              <div className="subttl">
                {consignment.feedstockName || 'Danish manure & slurry'} at {consignment.carbonIntensity} gCO₂e/MJ · {consignment.certificationScheme} · {consignment.chainOfCustody.replace('_', ' ').toLowerCase()} · {(consignment.volumeMWh || 10000).toLocaleString()} MWh
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1px', backgroundColor: 'var(--color-divider)', marginLeft: 'auto' }}>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '8px 16px' }}>
                <div className="eyebrow">All-in delivered</div>
                <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>
                  €{selectedItem?.totalCosts !== null && selectedItem?.totalCosts !== undefined ? (153.15 + selectedItem.totalCosts).toFixed(2) : '156.40'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '8px 16px' }}>
                <div className="eyebrow">Avoided tCO₂e/MWh</div>
                <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>
                  {avoidedCo2}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '8px 16px' }}>
                <div className="eyebrow">Selected · {getMarketById(selectedItem?.marketId || 'DE_THG')?.shortName || 'DE THG'}</div>
                <div className="num" style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-accent-700)' }}>
                  {selectedNetValue >= 0 ? `+€${selectedNetValue.toFixed(2)}` : `−€${Math.abs(selectedNetValue).toFixed(2)}`}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                  onClick={() => setIsLogisticsOpen(true)}
                >
                  Delivery playbook ⏎
                </button>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '10px 20px',
              borderBottom: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              flexWrap: 'wrap',
            }}
          >
            <span className="eyebrow">Filters</span>

            <label
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}
              className={positiveOnly ? '' : 'mut'}
              onClick={() => setPositiveOnly(p => !p)}
            >
              <span
                style={{
                  width: '13px',
                  height: '13px',
                  backgroundColor: positiveOnly ? 'var(--color-accent)' : 'transparent',
                  border: positiveOnly ? 'none' : '1px solid var(--color-divider)',
                  flex: 'none',
                }}
              />
              Positive netback only
            </label>

            <label
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}
              className={clearedOnly ? '' : 'mut'}
              onClick={() => setClearedOnly(p => !p)}
            >
              <span
                style={{
                  width: '13px',
                  height: '13px',
                  backgroundColor: clearedOnly ? 'var(--color-accent)' : 'transparent',
                  border: clearedOnly ? 'none' : '1px solid var(--color-divider)',
                  flex: 'none',
                }}
              />
              All six gates clear
            </label>

            <label
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}
              className={hideStale ? '' : 'mut'}
              onClick={() => setHideStale(p => !p)}
            >
              <span
                style={{
                  width: '13px',
                  height: '13px',
                  backgroundColor: hideStale ? 'var(--color-accent)' : 'transparent',
                  border: hideStale ? 'none' : '1px solid var(--color-divider)',
                  flex: 'none',
                }}
              />
              Hide marks older than 30d
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="eyebrow" style={{ margin: 0 }}>Min Margin:</span>
              {[0, 15, 25, 40].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`chip ${minMargin === m ? 'chip-a' : ''}`}
                  style={{ fontSize: '10px', padding: '2px 7px' }}
                  onClick={() => setMinMargin(m)}
                >
                  {m === 0 ? 'All' : `≥€${m}`}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="eyebrow">Pricing side</span>
              <div className="seg" style={{ height: '28px' }}>
                <label className={`seg-opt ${currentSide === 'bid' ? 'active' : ''}`} style={{ padding: '4px 12px', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="scanner-side"
                    checked={currentSide === 'bid'}
                    onChange={() => dispatch({ type: 'SET_PRICING_SIDE', side: 'bid' })}
                  />
                  Bid
                </label>
                <label className={`seg-opt ${currentSide === 'mid' ? 'active' : ''}`} style={{ padding: '4px 12px', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="scanner-side"
                    checked={currentSide === 'mid'}
                    onChange={() => dispatch({ type: 'SET_PRICING_SIDE', side: 'mid' })}
                  />
                  Mid
                </label>
                <label className={`seg-opt ${currentSide === 'offer' ? 'active' : ''}`} style={{ padding: '4px 12px', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="scanner-side"
                    checked={currentSide === 'offer'}
                    onChange={() => dispatch({ type: 'SET_PRICING_SIDE', side: 'offer' })}
                  />
                  Offer
                </label>
              </div>
            </div>
          </div>

          {/* Ladder Table */}
          <div style={{ padding: '0 20px 20px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '34px' }}>#</th>
                  <th style={{ width: '34px' }}>CC</th>
                  <th>Market / scheme</th>
                  <th style={{ width: '118px' }}>
                    Gates <abbr title="Scheme, UDB, Mass balance, Annex IX, GHG, Member state" style={{ textDecoration: 'none' }}>S U M A G N</abbr>
                  </th>
                  <th style={{ width: '112px', textAlign: 'right' }}>Net €/MWh</th>
                  <th style={{ width: '210px' }}>Spread vs all-in</th>
                  <th style={{ width: '88px', textAlign: 'right' }}>Margin</th>
                  <th style={{ width: '120px' }}>Unit of account</th>
                  <th style={{ width: '52px', textAlign: 'center' }}>Age</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const net = item.netNetback ?? 0;
                  const isSelected = item.marketId === selectedMarketId;
                  const el = eligibilityMap.get(item.marketId);
                  const isHardBlocked = el?.overallVerdict === 'HARD_BLOCK';
                  const isSim = item.isModelled || item.provenance?.sourceType === 'ESTIMATE';
                  const mkt = getMarketById(item.marketId);

                  return (
                    <tr
                      key={item.marketId}
                      data-click="1"
                      className={isSelected ? 'selrow' : ''}
                      onClick={() => setSelectedMarketId(item.marketId)}
                      onDoubleClick={() => setIsLogisticsOpen(true)}
                    >
                      <td className="num dim">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="num mut" style={{ fontWeight: 600 }}>{mkt?.country}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.marketName}</div>
                        <div style={{ fontSize: '11px' }} className="mut">{mkt?.legalBasis}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {el?.gates.map((g: GateResult, gIdx: number) => {
                            const isPass = g.verdict === 'PASS';
                            const isHard = g.verdict === 'HARD_BLOCK';
                            const soft = !isPass && !isHard;
                            return (
                              <span
                                key={gIdx}
                                title={`${GATE_TOOLTIP_TITLES[gIdx]} — ${isPass ? 'Pass' : isHard ? 'Hard block' : 'Conditional / unresolved'}`}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  backgroundColor: isHard
                                    ? 'var(--color-accent)'
                                    : soft
                                    ? 'var(--color-neutral-300)'
                                    : 'transparent',
                                  color: isHard
                                    ? 'var(--color-bg)'
                                    : soft
                                    ? 'var(--color-neutral-900)'
                                    : 'var(--color-text)',
                                  border: `1px solid ${isHard ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                                }}
                              >
                                {GATE_LETTERS[gIdx]}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontSize: '16px', fontWeight: 800 }}>
                        {net >= 0 ? `+€${net.toFixed(2)}` : `−€${Math.abs(net).toFixed(2)}`}
                      </td>
                      <td>
                        <div style={{ position: 'relative', height: '16px', backgroundColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
                          <div
                            style={{
                              position: 'absolute',
                              top: '3px',
                              bottom: '3px',
                              left: 0,
                              width: `${Math.min(100, (Math.abs(net) / 200) * 100)}%`,
                              backgroundColor: net < 0 || isHardBlocked
                                ? 'var(--color-accent)'
                                : el?.overallVerdict === 'CONDITIONAL'
                                ? 'var(--color-neutral-500)'
                                : 'var(--color-text)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="num mut" style={{ textAlign: 'right' }}>
                        {item.marginPercent !== null && item.marginPercent !== undefined
                          ? `${item.marginPercent >= 0 ? '+' : ''}${Math.round(item.marginPercent)}%`
                          : '—'}
                      </td>
                      <td style={{ fontSize: '11px' }} className="mut">{mkt?.unitLabel}</td>
                      <td className="num mut" style={{ textAlign: 'center', fontSize: '11px' }}>
                        {isSim ? 'sim' : '1d'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Three-column Ruled Footer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              borderTop: '2px solid var(--color-divider)',
            }}
          >
            {/* Germany dual branch */}
            <div style={{ padding: '14px 20px', borderRight: '1px solid var(--color-divider)' }}>
              <div className="eyebrow">Germany · dual branch</div>
              <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px' }} className="mut">1× single</div>
                  <div className="num" style={{ fontSize: '22px', fontWeight: 800 }}>+€72.07</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px' }} className="mut">2× retained</div>
                  <div className="num" style={{ fontSize: '22px', fontWeight: 800 }}>+€225.22</div>
                </div>
              </div>
              <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '9px 0 0' }} className="mut">
                Double counting is a policy multiplier being removed for the 2026 compliance year. Manure&apos;s negative CI belongs to the GHG calculation and is unaffected.
              </p>
            </div>

            {/* Cost stack */}
            <div style={{ padding: '14px 20px', borderRight: '1px solid var(--color-divider)' }}>
              <div className="eyebrow">Cost stack · €/MWh</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '9px' }}>
                <div className="kv">
                  <span className="lbl">Plant gate</span>
                  <span />
                  <span className="num" style={{ fontWeight: 600 }}>153.15</span>
                </div>
                <div className="kv">
                  <span className="lbl">Transfer &amp; registry</span>
                  <span />
                  <span className="num" style={{ fontWeight: 600 }}>0.90</span>
                </div>
                <div className="kv">
                  <span className="lbl">Certification</span>
                  <span />
                  <span className="num" style={{ fontWeight: 600 }}>0.55</span>
                </div>
                <div className="kv">
                  <span className="lbl">Transit DK → DE</span>
                  <span />
                  <span className="num" style={{ fontWeight: 600 }}>1.80</span>
                </div>
                <div className="kv" style={{ paddingTop: '8px', borderTop: '2px solid var(--color-divider)' }}>
                  <span style={{ fontWeight: 600 }}>All-in delivered</span>
                  <span />
                  <span className="num" style={{ fontSize: '15px', fontWeight: 800 }}>156.40</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleStructureTrade}
              >
                Structure in trade builder
              </button>
            </div>

            {/* Blocked opportunity */}
            <div style={{ padding: '14px 20px' }}>
              <div className="eyebrow">Blocked opportunity</div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
                {highestBlocked ? `${highestBlocked.market} · €${highestBlocked.netback.toFixed(2)}/MWh theoretical` : 'UK RTFO · €88.10/MWh theoretical'}
              </div>
              <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '6px 0 0' }} className="mut">
                {highestBlocked?.blockingReason || 'Grid-injected volume cannot evidence UDB ingestion, so the dRTFC route hard-blocks at gate 2.'} Remedy is {highestBlocked?.remedy || 'physical bio-LNG delivery under mass balance.'}
              </p>
              <div style={{ fontSize: '11px', marginTop: '8px', color: 'var(--color-accent-700)' }}>
                RED III Art. 28(2) · Reg. (EU) 2024/2792
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Delivery Playbook Modal */}
      <LogisticsModal
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
        originCountry={consignment.originCountry}
        targetCountry={getMarketById(selectedItem?.marketId || 'DE_THG')?.country || 'DE'}
      />
    </div>
  );
}
