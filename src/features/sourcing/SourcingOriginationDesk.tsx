import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeAllNetbacks } from '../../domain/netback/engine';
import { rankNetbacks, getHighestBlockedOpportunity } from '../../domain/netback/ranking';
import { REFERENCE_CONSIGNMENTS, FEEDSTOCK_REGISTRY, getCountryFeedstockCI } from '../../domain/consignment/feedstocks';
import { Consignment } from '../../domain/consignment/types';
import { EligibilityAssessment, GateResult } from '../../domain/eligibility/types';
import { PRODUCING_ORIGINS, getRouteTransitTariff, calculateRealisticCommercialDeskMargin } from '../../domain/arbitrage/origins';
import { calculateDijkstraCorridor } from '../../domain/logistics/engine';
import { BIOMETHANE_PLANTS } from '../../domain/plants/registry';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { showToast } from '../../app/DeskToastContainer';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { CorridorMatrix } from './CorridorMatrix';
import { ArbitrageOpportunity } from '../../domain/arbitrage/types';
import { PlantSourcingDrawer } from '../plants/PlantSourcingDrawer';
import { 
  evaluatePlantCommercialStrategies, 
  PlantStrategyMatrix, 
  StrategyEvaluation,
  resolveAuditedCarbonIntensity
} from '../../domain/valuation/strategyEngine';
import { getDefaultMarketForOrigin } from '../trade-builder/TradeBuilderScreen';

export function getPlantCanonicalFeedstock(plant?: BiomethanePlant | null, fallback: string = 'manure'): string {
  if (!plant) return fallback;
  const cat = (plant.primaryFeedstockCategory || '').toLowerCase();
  const det = (plant.feedstockDetails || '').toLowerCase();
  const text = `${cat} ${det}`;
  if (text.includes('manure') || text.includes('slurry') || text.includes('gülle') || text.includes('swine') || text.includes('bovine')) {
    return 'manure';
  }
  if (text.includes('food') || text.includes('biowaste') || text.includes('forsu') || text.includes('organic waste') || text.includes('whey')) {
    return 'food_waste';
  }
  if (text.includes('sewage') || text.includes('sludge') || text.includes('wastewater')) {
    return 'sewage_sludge';
  }
  if (text.includes('energy crop') || text.includes('silage') || text.includes('maize') || text.includes('mais')) {
    return 'energy_crops';
  }
  if (text.includes('agri') || text.includes('residue') || text.includes('straw') || text.includes('crop')) {
    return 'agricultural_residues';
  }
  return fallback;
}

const GATE_LETTERS = ['S', 'U', 'M', 'A', 'G', 'N'];
const GATE_TITLES = [
  'Scheme recognition',
  'UDB grid ingestion',
  'Mass balance custody',
  'Annex IX feedstock',
  'GHG saving threshold',
  'Member state specifics',
];

const FEEDSTOCK_OPTIONS = [
  { key: 'manure', label: 'Animal manure and slurry · IX-A', defaultCI: -100 },
  { key: 'agricultural_residues', label: 'Agricultural residues · IX-A', defaultCI: 18 },
  { key: 'food_waste', label: 'Food waste · IX-A', defaultCI: 20 },
  { key: 'sewage_sludge', label: 'Sewage sludge · IX-A', defaultCI: 25 },
  { key: 'energy_crops', label: 'Energy crops · non-Annex', defaultCI: 45 },
];

type SourcingTab = 'STRATEGIES' | 'CORRIDORS' | 'PLANTS' | 'MARKETS' | 'HEATMAP';

interface OriginCorridorRow {
  originCode: string;
  originName: string;
  originFlag: string;
  primaryRegistry: string;
  gridZone: string;
  targetMarketId: string;
  targetMarketName: string;
  targetCountry: string;
  targetFlag: string;
  distanceKm: number;
  routeHops: string[];
  transitTariffEurPerMWh: number;
  producerMarkEurPerMWh: number | null;
  deliveredCostEurPerMWh: number | null;
  deskNetMarginEurPerMWh: number | null;
  marginPercent: number | null;
  totalDealProfitEur: number | null;
  eligibility: EligibilityAssessment;
  isTradeable: boolean;
  isBlocked: boolean;
  matchingPlants: BiomethanePlant[];
}

function matchesFeedstock(plant: BiomethanePlant, feedstockKey: string): boolean {
  if (feedstockKey === 'ANY') return true;
  const cat = (plant.primaryFeedstockCategory || '').toLowerCase();
  const det = (plant.feedstockDetails || '').toLowerCase();
  const text = `${cat} ${det}`;

  switch (feedstockKey) {
    case 'manure':
      return text.includes('manure') || text.includes('slurry') || text.includes('gülle') || text.includes('mist') || text.includes('agri') || text.includes('straw');
    case 'agricultural_residues':
      return text.includes('agri') || text.includes('residue') || text.includes('straw') || text.includes('crop') || text.includes('biomass');
    case 'food_waste':
      return text.includes('food') || text.includes('waste') || text.includes('organic') || text.includes('biowaste') || text.includes('forsu') || text.includes('industrial');
    case 'sewage_sludge':
      return text.includes('sewage') || text.includes('sludge') || text.includes('wastewater') || text.includes('kläre');
    case 'energy_crops':
      return text.includes('energy crop') || text.includes('silage') || text.includes('maize') || text.includes('mais') || text.includes('crop');
    default:
      return true;
  }
}

export function SourcingOriginationDesk() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  // Primary RFQ / Sourcing intent state
  const [selectedMarketSelect, setSelectedMarketSelect] = useState<string>('DE_THG');
  const [quantityInput, setQuantityInput] = useState<string>('10,000');
  const [feedstockSelect, setFeedstockSelect] = useState<string>('manure');
  const [ciInput, setCiInput] = useState<string>('−100');
  const [ciTier, setCiTier] = useState<'optimistic' | 'base' | 'conservative'>('base');
  const [activeTab, setActiveTab] = useState<SourcingTab>('STRATEGIES');
  const [selectedRowId, setSelectedRowId] = useState<string>('DK');
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>(null);
  const [plantSearchQuery, setPlantSearchQuery] = useState<string>('');
  const [plantCountryFilter, setPlantCountryFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [complianceYear, setComplianceYear] = useState<number>(new Date().getFullYear());

  // Step 1: Active plant selection for commercial opportunity valuation
  const [selectedPlant, setSelectedPlant] = useState<BiomethanePlant>(() => {
    return (
      BIOMETHANE_PLANTS.find(p => p.name.includes('Donderen') || p.name.includes('Puzzle')) ||
      BIOMETHANE_PLANTS.find(p => p.name.includes('Holsted')) ||
      BIOMETHANE_PLANTS[0]
    );
  });
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('ALL');
  const [plantFilterQuery, setPlantFilterQuery] = useState<string>('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [isPlantDrawerOpen, setIsPlantDrawerOpen] = useState(false);

  // Sync CI when feedstock or tier changes
  const updateCIForFeedstock = (feedstock: string, tier: 'optimistic' | 'base' | 'conservative', origin: string) => {
    const resolved = getCountryFeedstockCI(origin, feedstock, tier);
    const val = resolved.ci;
    setCiInput(val > 0 ? `+${val}` : val < 0 ? `−${Math.abs(val)}` : '0');
  };

  const numericCI = parseFloat(ciInput.replace('−', '-')) || (FEEDSTOCK_REGISTRY[feedstockSelect]?.defaultCI ?? -100);
  const numericQty = parseInt(quantityInput.replace(/,/g, ''), 10) || 10000;

  const targetMarket = useMemo(() => {
    return getMarketById(selectedMarketSelect === 'ALL' ? 'DE_THG' : selectedMarketSelect) || MARKETS[0];
  }, [selectedMarketSelect]);

  const consignment: Consignment = useMemo(() => {
    const feedInfo = FEEDSTOCK_REGISTRY[feedstockSelect] || FEEDSTOCK_REGISTRY.manure;
    return {
      ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      id: `sourced-${feedstockSelect}-${numericCI}`,
      name: `European ${feedInfo.name}`,
      feedstock: feedstockSelect,
      feedstockName: feedInfo.name,
      annexClassification: feedInfo.annexClassification,
      carbonIntensity: numericCI,
      volumeMWh: numericQty,
    };
  }, [feedstockSelect, numericCI, numericQty]);

  // Destination Market Ranking (For unallocated consignments)
  const eligibilityMap = useMemo(() => {
    const map = new Map<string, EligibilityAssessment>();
    for (const market of MARKETS) {
      map.set(market.id, evaluateEligibility(consignment, market));
    }
    return map;
  }, [consignment]);

  const netbackResults = useMemo(() => {
    return computeAllNetbacks(consignment, MARKETS, state.marks, state.costs, eligibilityMap, state.marks.pricingSides);
  }, [consignment, state.marks, state.costs, eligibilityMap]);

  const rankedList = useMemo(() => {
    return rankNetbacks(netbackResults, eligibilityMap);
  }, [netbackResults, eligibilityMap]);

  const highestBlocked = useMemo(() => {
    return getHighestBlockedOpportunity(rankedList, eligibilityMap);
  }, [rankedList, eligibilityMap]);

  const maxAbs = useMemo(() => {
    const values = rankedList.map(r => Math.abs(r.netNetback || 0));
    return Math.max(...values, 1);
  }, [rankedList]);

  // Filter matched plants based on selected feedstock
  const matchedFeedstockPlants = useMemo(() => {
    return BIOMETHANE_PLANTS.filter(p => matchesFeedstock(p, feedstockSelect));
  }, [feedstockSelect]);

  // Distinct countries for fast plant filtering
  const plantCountryOptions = useMemo(() => {
    const counts: Record<string, { country: string; flag: string; count: number }> = {};
    for (const p of BIOMETHANE_PLANTS) {
      const code = p.countryCode || 'EU';
      if (!counts[code]) {
        counts[code] = {
          country: p.country || code,
          flag: p.countryFlag || '🇪🇺',
          count: 0,
        };
      }
      counts[code].count++;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([code, info]) => ({
        code,
        country: info.country,
        flag: info.flag,
        count: info.count,
        label: `${info.flag} ${info.country} (${info.count})`,
      }));
  }, []);

  // Filtered plant list containing all matching plants (all 1,974 plants when unfiltered)
  const availablePlants = useMemo(() => {
    let list = BIOMETHANE_PLANTS;
    if (selectedCountryFilter !== 'ALL') {
      list = list.filter(p => p.countryCode === selectedCountryFilter);
    }
    if (plantFilterQuery.trim()) {
      const q = plantFilterQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.operator && p.operator.toLowerCase().includes(q)) ||
        (p.region && p.region.toLowerCase().includes(q)) ||
        (p.primaryFeedstockCategory && p.primaryFeedstockCategory.toLowerCase().includes(q)) ||
        p.country.toLowerCase().includes(q) ||
        p.countryCode.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (a.countryCode !== b.countryCode) return a.countryCode.localeCompare(b.countryCode);
      return a.name.localeCompare(b.name);
    });
  }, [selectedCountryFilter, plantFilterQuery]);

  // Keep selectedPlant in sync with filter if current selection is excluded
  useEffect(() => {
    if (availablePlants.length > 0 && !availablePlants.some(p => p.id === selectedPlant.id)) {
      setSelectedPlant(availablePlants[0]);
      setSelectedStrategyId(null);
    }
  }, [availablePlants, selectedPlant.id]);

  // Multi-strategy valuation evaluation for the selected plant
  const plantValuation: PlantStrategyMatrix = useMemo(() => {
    const ttfMid = state.marks.gasIndex.mid ?? state.marks.gasIndex.offer ?? state.marks.gasIndex.bid ?? 35;
    const thgEntry = state.marks.marks['DE_THG'];
    const thgMid = thgEntry?.mid ?? thgEntry?.offer ?? thgEntry?.bid ?? 125;
    // NL HBe-A (ERE) mark for Dutch transport strategy
    const nlEreEntry = state.marks.marks['NL_ERE'];
    const dutchHbeA = nlEreEntry?.mid ?? nlEreEntry?.offer ?? nlEreEntry?.bid;
    // EU ETS EUA mark (used for industrial scope 1 zero-rating strategy)
    const euEtsEntry = state.marks.marks['EU_ETS_EUA'];
    const euEtsEua = euEtsEntry?.mid ?? euEtsEntry?.offer ?? euEtsEntry?.bid;
    // UK RTFO dRTFC mark (cert leg for UK transport strategy)
    const ukRtfoEntry = state.marks.marks['UK_RTFO'];
    const ukRtfoCert = ukRtfoEntry?.mid ?? ukRtfoEntry?.offer ?? ukRtfoEntry?.bid;
    // Voluntary GO premium (DE_GO / EU_GO mark)
    const deGoEntry = state.marks.marks['DE_GO'];
    const volGoPremium = deGoEntry?.mid ?? deGoEntry?.offer ?? deGoEntry?.bid;
    return evaluatePlantCommercialStrategies(selectedPlant, {
      ttfDayAheadEurMwh: ttfMid,
      germanThgQuoteEurPerTonne: thgMid,
      dutchHbeAEurMwh: dutchHbeA,
      euEtsEuaEurPerTonne: euEtsEua,
      ukRtfoCertValueEurMwh: ukRtfoCert,
      voluntaryGoPremiumEurMwh: volGoPremium,
    });
  }, [selectedPlant, state.marks]);
  
  const activeStrategy: StrategyEvaluation = useMemo(() => {
    if (selectedStrategyId) {
      const found = plantValuation.evaluations.find(e => e.strategyId === selectedStrategyId);
      if (found) return found;
    }
    return plantValuation.winningStrategy;
  }, [plantValuation, selectedStrategyId]);

  // European Sourcing Corridors Calculation (Origins ➔ Target Market)
  const corridorRows: OriginCorridorRow[] = useMemo(() => {
    const activeMkt = targetMarket;
    const targetCountryCode = activeMkt.country || 'DE';
    const origins = Object.values(PRODUCING_ORIGINS);

    const rows: OriginCorridorRow[] = [];

    for (const origin of origins) {
      const isEUGrid = origin.gridZone === 'EU_INTERCONNECTED';
      const originConsignment: Consignment = {
        ...consignment,
        id: `arb_${origin.countryCode}_${feedstockSelect}`,
        originCountry: origin.countryCode,
        originCountryName: origin.countryName,
        injectionCountry: origin.countryCode,
        injectionIsEU: isEUGrid,
        udbStatus: isEUGrid ? 'RECORDED' : 'NOT_RECORDED',
      };

      const el = evaluateEligibility(originConsignment, activeMkt);
      const isTradeable = el.overallVerdict === 'ELIGIBLE' || el.overallVerdict === 'CONDITIONAL' || el.overallVerdict === 'UNRESOLVED';
      const isBlocked = el.overallVerdict === 'HARD_BLOCK';

      // Dijkstra pipeline route calculation
      const dijkstra = calculateDijkstraCorridor(origin.countryCode, targetCountryCode);
      const transitTariff = getRouteTransitTariff(origin.countryCode, targetCountryCode);

      // Economics calculation
      const netbackRes = netbackResults.find(n => n.marketId === activeMkt.id);
      const terminalNetback = netbackRes?.netNetback ?? 0;

      // Origin supply corridor comparison evaluates physical plant-gate cost benchmarks across European producing countries
      const commercialAllocation = calculateRealisticCommercialDeskMargin(
        activeMkt.id,
        terminalNetback,
        transitTariff,
        null,
        origin.plantGateCostBenchmarkEurMwh ?? null
      );

      const deskNetMargin = isBlocked ? null : commercialAllocation.deskNetMarginEurPerMWh;
      const producerMark = isBlocked ? null : commercialAllocation.producerProcurementEurPerMWh;
      const deliveredCost = isBlocked ? null : (producerMark !== null ? producerMark + transitTariff : null);
      const marginPct = (deskNetMargin !== null && terminalNetback > 0) ? (deskNetMargin / terminalNetback) * 100 : null;
      const totalProfit = (deskNetMargin !== null && numericQty) ? deskNetMargin * numericQty : null;

      const rawPlants = matchedFeedstockPlants.filter(p => p.countryCode === origin.countryCode);
      const seenNames = new Set<string>();
      const plantsForOrigin: BiomethanePlant[] = [];
      for (const p of rawPlants) {
        const key = p.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          plantsForOrigin.push(p);
        }
      }

      rows.push({
        originCode: origin.countryCode,
        originName: origin.countryName,
        originFlag: origin.flag,
        primaryRegistry: origin.primaryRegistry,
        gridZone: origin.gridZone,
        targetMarketId: activeMkt.id,
        targetMarketName: activeMkt.name,
        targetCountry: targetCountryCode,
        targetFlag: PRODUCING_ORIGINS[targetCountryCode]?.flag || '🇩🇪',
        distanceKm: dijkstra.distanceKm,
        routeHops: dijkstra.path,
        transitTariffEurPerMWh: transitTariff,
        producerMarkEurPerMWh: producerMark,
        deliveredCostEurPerMWh: deliveredCost,
        deskNetMarginEurPerMWh: deskNetMargin,
        marginPercent: marginPct,
        totalDealProfitEur: totalProfit,
        eligibility: el,
        isTradeable,
        isBlocked,
        matchingPlants: plantsForOrigin,
      });
    }

    // Sort: tradeable first by margin descending, then blocked
    return rows.sort((a, b) => {
      if (a.isTradeable && !b.isTradeable) return -1;
      if (!a.isTradeable && b.isTradeable) return 1;
      return (b.deskNetMarginEurPerMWh ?? -999) - (a.deskNetMarginEurPerMWh ?? -999);
    });
  }, [targetMarket, consignment, netbackResults, state.costs, numericQty, feedstockSelect, matchedFeedstockPlants]);

  // Heatmap cross-border dataset
  const searchResult = useMemo(() => {
    return searchSourcingRoutes(
      {
        targetMarketId: selectedMarketSelect === 'ALL' ? 'ANY' : selectedMarketSelect,
        volumeMwh: numericQty,
        delivery: {
          type: 'CALENDAR',
          complianceYear,
          startDate: `${complianceYear}-01-01`,
          endDate: `${complianceYear}-12-31`,
        },
        feedstockKey: feedstockSelect,
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        constraints: {
          maxDeliveredCostEurMwh: null,
          maxCarbonIntensity: numericCI,
          physicalDeliveryRequired: false,
        },
        counterparty: null,
        notes: null,
      },
      state.marks,
      state.costs,
      DEFAULT_WHAT_IF_SCENARIO
    );
  }, [selectedMarketSelect, numericQty, feedstockSelect, numericCI, complianceYear, state.marks, state.costs]);

  // Filtered plants for Tab 2
  const filteredPlantsList = useMemo(() => {
    const seen = new Set<string>();
    return matchedFeedstockPlants.filter(plant => {
      if (plantCountryFilter !== 'ALL' && plant.countryCode !== plantCountryFilter) return false;
      const key = `${plant.countryCode}_${plant.name.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (!plantSearchQuery) return true;
      const q = plantSearchQuery.toLowerCase();
      return (
        plant.name.toLowerCase().includes(q) ||
        (plant.operator && plant.operator.toLowerCase().includes(q)) ||
        (plant.networkOperator && plant.networkOperator.toLowerCase().includes(q)) ||
        (plant.region && plant.region.toLowerCase().includes(q)) ||
        plant.country.toLowerCase().includes(q)
      );
    });
  }, [matchedFeedstockPlants, plantCountryFilter, plantSearchQuery]);

  const handleScan = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast('Scan complete — 1,975 European plants evaluated across 24 hubs');
    }, 450);
  };

  const handleStructureDeal = (
    marketId: string,
    originCountry: string,
    plant?: BiomethanePlant,
    overrideVolume?: number,
    overrideCi?: number,
    overrideFeedstock?: string,
  ) => {
    dispatch({ type: 'SELECT_MARKET', id: marketId });
    showToast(`Carried ${plant ? plant.name : `${originCountry} consignment`} into Trade Builder`);
    let dealVolume = numericQty;
    if (overrideVolume !== undefined && overrideVolume !== null) {
      dealVolume = overrideVolume;
    } else if (plant?.annualEnergyGWh) {
      dealVolume = Math.round(plant.annualEnergyGWh * 1000);
    }

    let dealCi = numericCI;
    let dealCiIsEstimated = false;
    if (overrideCi !== undefined && overrideCi !== null) {
      dealCi = overrideCi;
    } else if (plant?.verifiedCarbonIntensity !== undefined && plant?.verifiedCarbonIntensity !== null) {
      dealCi = plant.verifiedCarbonIntensity;
      dealCiIsEstimated = false;
    } else if (plant) {
      const resolved = resolveAuditedCarbonIntensity(plant);
      dealCi = resolved.ci;
      dealCiIsEstimated = resolved.isEstimated;
    }

    let dealFeedstock = feedstockSelect;
    if (overrideFeedstock) {
      dealFeedstock = overrideFeedstock;
    } else if (plant) {
      dealFeedstock = getPlantCanonicalFeedstock(plant, feedstockSelect);
    }

    navigate(buildDealUrl({
      marketId,
      originCountry,
      feedstock: dealFeedstock,
      ci: dealCi,
      ciIsEstimated: dealCiIsEstimated || undefined,
      volume: dealVolume,
      plantId: plant?.id,
      plantName: plant?.name,
      plantCapacityNm3h: plant?.capacityNm3h ?? undefined,
      plantAnnualGWh: plant?.annualEnergyGWh ?? undefined,
      legalEntityName: plant?.legalEntityName ?? plant?.operator ?? undefined,
      networkOperator: plant?.networkOperator ?? undefined,
      contactEmail: plant?.contactEmail ?? undefined,
      contactPhone: plant?.contactPhone ?? undefined,
      complianceYear,
      deliveryStartDate: `${complianceYear}-01-01`,
      deliveryEndDate: `${complianceYear}-12-31`,
    }));
  };

  const handleStructureDealForStrategy = (strat: StrategyEvaluation) => {
    let targetMkt = 'DE_THG';
    if (strat.strategyId === 'NL_REV_TRANSPORT') targetMkt = 'NL_ERE';
    else if (strat.strategyId === 'SUPPORTED_VOLUNTARY_GO') targetMkt = 'VOL_SCOPE1';
    else if (strat.strategyId === 'EU_ETS_INDUSTRIAL') targetMkt = 'VOL_SCOPE1';
    else if (strat.strategyId === 'FUELEU_MARITIME') targetMkt = 'FUELEU';
    else if (strat.strategyId === 'UK_RTFO_TRANSPORT') targetMkt = 'UK_RTFO';
    else if (strat.strategyId === 'UK_RGGO_VOLUNTARY') targetMkt = 'UK_RGGO';

    const plantVolumeMWh = plantValuation.plant.annualVolumeMWh;
    const plantCi = plantValuation.plant.carbonIntensity;
    const plantFeedstock = getPlantCanonicalFeedstock(selectedPlant, feedstockSelect);

    handleStructureDeal(targetMkt, plantValuation.plant.countryCode, selectedPlant, plantVolumeMWh, plantCi, plantFeedstock);
  };

  const currentSide = state.marks.pricingSides?.certificateSide || 'mid';
  const gasIndexPrice = state.marks.gasIndex.mid ?? state.marks.gasIndex.offer ?? state.marks.gasIndex.bid;
  const peakMargin = corridorRows.find(r => r.isTradeable)?.deskNetMarginEurPerMWh ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 1. Ledger Metric Strip */}
      <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div>
          <div className="eyebrow">Audited facilities</div>
          <div className="big num">1,975</div>
          <div className="subttl">24 hubs · GIE / EBA European Biomethane Map 2026</div>
        </div>
        <div>
          <div className="eyebrow">Peak arbitrage margin</div>
          <div className="big num" style={{ color: 'var(--color-accent-700)' }}>
            {peakMargin !== null ? (peakMargin >= 0 ? `+€${peakMargin.toFixed(2)}` : `-€${Math.abs(peakMargin).toFixed(2)}`) : '—'}
          </div>
          <div className="subttl">
            {corridorRows[0] ? `${corridorRows[0].originCode} → ${corridorRows[0].targetMarketId} · Cal-2026` : 'DK manure → DE THG · Cal-2026'}
          </div>
        </div>
        <div>
          <div className="eyebrow">Prompt TTF gas</div>
          <div className="big num">{gasIndexPrice !== null && gasIndexPrice !== undefined ? `€${gasIndexPrice.toFixed(2)}` : 'unrecorded'}</div>
          <div className="subttl">M+1 ICE Endex settlement</div>
        </div>
        <div>
          <div className="eyebrow">RED III mass balance</div>
          <div className="big num">6 gates</div>
          <div className="subttl">UDB grid boundaries &amp; ≥65% GHG saving</div>
        </div>
      </div>

      {/* 2. Sub-View Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-panel-header)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'STRATEGIES'}
            onClick={() => setActiveTab('STRATEGIES')}
            className={`chip ${activeTab === 'STRATEGIES' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: activeTab === 'STRATEGIES' ? 700 : 500 }}
          >
            <span>✦ Asset Deal Calculator</span>
            <span className="chip" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700, backgroundColor: 'var(--color-accent-700)', color: '#fff' }}>
              6 Monetization Plays
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'CORRIDORS'}
            onClick={() => setActiveTab('CORRIDORS')}
            className={`chip ${activeTab === 'CORRIDORS' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>European Sourcing Corridors</span>
            <span className="chip" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>
              {corridorRows.filter(r => r.isTradeable).length} Tradeable
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'PLANTS'}
            onClick={() => setActiveTab('PLANTS')}
            className={`chip ${activeTab === 'PLANTS' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Matched Producer Plants</span>
            <span className="chip" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>
              {matchedFeedstockPlants.length} Plants
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'MARKETS'}
            onClick={() => setActiveTab('MARKETS')}
            className={`chip ${activeTab === 'MARKETS' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Destination Market Ranking</span>
            <span className="chip" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>
              {MARKETS.length} Markets
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'HEATMAP'}
            onClick={() => setActiveTab('HEATMAP')}
            className={`chip ${activeTab === 'HEATMAP' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Pan-European Heatmap</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }} className="eyebrow">
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-text)' }} />
            Eligible
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-neutral-500)' }} />
            Conditional
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-accent)' }} />
            Blocked
          </span>
        </div>
      </div>

      {/* 3. Manual Consignment & RFQ Bar (Only shown for screening tabs, hidden in Asset Deal Calculator) */}
      {activeTab !== 'STRATEGIES' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '20px',
            padding: '14px 18px',
            borderBottom: '2px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label className="eyebrow" htmlFor="om">Compliance target market</label>
            <select
              id="om"
              className="input"
              style={{ minWidth: '280px', fontWeight: 600 }}
              value={selectedMarketSelect}
              onChange={e => {
                setSelectedMarketSelect(e.target.value);
                if (e.target.value !== 'ALL') setSelectedRowId(e.target.value);
              }}
            >
              <option value="ALL">✦ All Pan-European Markets ({MARKETS.length} Mechanisms)</option>
              <optgroup label="Primary Statutory Quota Markets">
                {MARKETS.filter(m => !m.id.includes('_GO') && m.id !== 'VOL_SCOPE1').map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.country || 'EU'})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Voluntary & Guarantees of Origin (GO)">
                {MARKETS.filter(m => m.id.includes('_GO') || m.id === 'VOL_SCOPE1').map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.country || 'EU'})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label className="eyebrow" htmlFor="oq">Contract quantity · MWh</label>
            <input
              id="oq"
              className="input num"
              style={{ minWidth: '130px', fontWeight: 600 }}
              value={quantityInput}
              onChange={e => setQuantityInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label className="eyebrow" htmlFor="of">Feedstock substrate</label>
            <select
              id="of"
              className="input"
              style={{ minWidth: '250px', fontWeight: 600 }}
              value={feedstockSelect}
              onChange={e => {
                const newKey = e.target.value;
                setFeedstockSelect(newKey);
                updateCIForFeedstock(newKey, ciTier, selectedRowId);
              }}
            >
              {FEEDSTOCK_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <label className="eyebrow" htmlFor="oc" style={{ margin: 0 }}>Carbon intensity · gCO₂e/MJ</label>
              <div style={{ display: 'flex', gap: '2px' }}>
                {(['conservative', 'base', 'optimistic'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`chip ${ciTier === t ? 'chip-a' : ''}`}
                    style={{ fontSize: '9px', padding: '1px 5px', textTransform: 'capitalize' }}
                    onClick={() => {
                      setCiTier(t);
                      updateCIForFeedstock(feedstockSelect, t, selectedRowId);
                    }}
                    title={`Set ${t} ISCC benchmark CI for ${selectedRowId}`}
                  >
                    {t.slice(0, 4)}
                  </button>
                ))}
              </div>
            </div>
            <input
              id="oc"
              className="input num"
              style={{ minWidth: '100px', fontWeight: 600 }}
              value={ciInput}
              onChange={e => setCiInput(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ height: '36px', whiteSpace: 'nowrap' }}
            onClick={handleScan}
          >
            Scan European plants
          </button>

          <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '12px' }} className="mut">
            <div>Audited census · 1,975 facilities · Dijkstra corridor network</div>
            <div>Target: <strong style={{ fontWeight: 600, color: 'var(--color-text)' }}>{targetMarket.name}</strong> · {matchedFeedstockPlants.length} plants matching substrate</div>
          </div>
        </div>
      )}

      {/* 4. Tab Content */}
      <div style={{ padding: '0 18px 18px', flex: 1 }}>
        {/* TAB 0: Asset Deal Evaluator & Multi-Strategy Opportunity Engine */}
        {activeTab === 'STRATEGIES' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '12px' }}>
            {/* 1. Simple Plant Selector with Fast Filters */}
            <div
              className="card"
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="plant-selector" style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-text)' }}>
                    Select Plant
                  </label>
                  <span className="dim" style={{ fontSize: '12px' }}>
                    ({availablePlants.length.toLocaleString()} of {BIOMETHANE_PLANTS.length.toLocaleString()} European facilities available)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Filter by Country */}
                  <select
                    className="select"
                    style={{ height: '32px', fontSize: '12px', padding: '0 8px', minWidth: '180px' }}
                    value={selectedCountryFilter}
                    onChange={e => setSelectedCountryFilter(e.target.value)}
                    aria-label="Filter plants by country"
                  >
                    <option value="ALL">🌍 All Countries ({BIOMETHANE_PLANTS.length.toLocaleString()})</option>
                    {plantCountryOptions.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {/* Filter by Search Query */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="input"
                      style={{ height: '32px', fontSize: '12px', padding: '0 24px 0 10px', width: '220px' }}
                      placeholder="Filter by name, operator..."
                      value={plantFilterQuery}
                      onChange={e => setPlantFilterQuery(e.target.value)}
                      aria-label="Filter plants by text"
                    />
                    {plantFilterQuery && (
                      <button
                        type="button"
                        className="cursor-pointer"
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          fontSize: '12px',
                          color: 'var(--color-muted)',
                          padding: 0,
                          lineHeight: 1,
                        }}
                        onClick={() => setPlantFilterQuery('')}
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {(selectedCountryFilter !== 'ALL' || plantFilterQuery) && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ height: '32px', fontSize: '11px', padding: '0 10px' }}
                      onClick={() => {
                        setSelectedCountryFilter('ALL');
                        setPlantFilterQuery('');
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Main Plant Dropdown containing all 1,974 plants (or filtered) */}
              <select
                id="plant-selector"
                className="select"
                style={{
                  width: '100%',
                  height: '38px',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '0 12px',
                  backgroundColor: 'var(--color-input-bg, #fff)',
                  borderColor: 'var(--color-divider)',
                }}
                value={selectedPlant.id}
                onChange={e => {
                  const p = BIOMETHANE_PLANTS.find(item => item.id === e.target.value);
                  if (p) {
                    setSelectedPlant(p);
                    setSelectedStrategyId(null);
                    showToast(`Loaded ${p.name} (${p.country})`);
                  }
                }}
              >
                {availablePlants.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.countryCode}] {p.name} — {p.annualEnergyGWh ? `${p.annualEnergyGWh.toFixed(1)} GWh` : ''} · {p.primaryFeedstockCategory || 'Agri'}{p.operator ? ` (${p.operator})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Plant Identity & Grid Connection Ribbon */}
            <div
              className="cellrow"
              style={{
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <div>
                <div className="eyebrow">Facility &amp; Grid Injection Node</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '16px' }}>{plantValuation.plant.countryFlag}</span>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{plantValuation.plant.name}</span>
                </div>
                <div className="dim" style={{ fontSize: '11px', marginTop: '2px' }}>
                  {plantValuation.plant.networkOperator}
                </div>
              </div>

              <div>
                <div className="eyebrow">Audited Production Capacity</div>
                <div className="num" style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
                  {plantValuation.plant.annualEnergyGWh.toFixed(1)} GWh/yr{' '}
                  <span className="dim" style={{ fontWeight: 400, fontSize: '11px' }}>
                    ({plantValuation.plant.annualVolumeMWh.toLocaleString()} MWh · {plantValuation.plant.hourlyCapacityMWh} MWh/h)
                  </span>
                </div>
                <div className="dim" style={{ fontSize: '11px', marginTop: '2px' }}>
                  Upgrading: {plantValuation.plant.upgradingTechnology}
                </div>
              </div>

              <div>
                <div className="eyebrow">Feedstock &amp; Carbon Score</div>
                <div style={{ fontWeight: 700, fontSize: '12px', marginTop: '2px' }}>
                  {plantValuation.plant.primaryFeedstockCategory}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span
                    className={`chip ${plantValuation.plant.carbonIntensity <= 0 ? 'chip-pos' : 'chip-warn'}`}
                    style={{ fontSize: '10px', padding: '1px 6px', fontWeight: 700 }}
                  >
                    Audited CI: {plantValuation.plant.carbonIntensity > 0 ? `+${plantValuation.plant.carbonIntensity}` : plantValuation.plant.carbonIntensity} gCO₂e/MJ
                  </span>
                  <span className="dim" style={{ fontSize: '10px' }}>
                    {plantValuation.plant.feedstockDetails}
                  </span>
                </div>
              </div>

              <div>
                <div className="eyebrow">Domestic Subsidy Benchmark</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span
                    className={`chip ${plantValuation.domesticSubsidyBaseline.status === 'ACTIVE_SUBSIDY' ? 'chip-info' : 'chip-neutral'}`}
                    style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}
                  >
                    {plantValuation.domesticSubsidyBaseline.status === 'ACTIVE_SUBSIDY' ? 'Active Subsidy' : 'Merchant'}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '12px' }}>{plantValuation.domesticSubsidyBaseline.schemeName}</span>
                </div>
                <div className="num" style={{ fontSize: '11px', marginTop: '2px', fontWeight: 600 }}>
                  Subsidy Hurdle: €{plantValuation.domesticSubsidyBaseline.strikePriceEurMwh.toFixed(2)}/MWh
                </div>
              </div>
            </div>

            {/* 3. Pan-European Commercial Strategy Blotter Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 className="ptitle" style={{ fontSize: '14px' }}>Pan-European Commercial Strategy Blotter</h4>
                  <span className="dim" style={{ fontSize: '12px' }}>— All 6 compliance &amp; voluntary routes evaluated side-by-side for {plantValuation.plant.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, height: '28px', backgroundColor: '#10b981', color: '#fff', border: 'none' }}
                    onClick={() => setIsPlantDrawerOpen(true)}
                    title="Open verified producer contacts, registration ID, and direct outreach brief"
                  >
                    👤 Outreach &amp; Producer Contacts
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, height: '28px' }}
                    onClick={() => {
                      if (navigator?.clipboard) {
                        navigator.clipboard.writeText(plantValuation.commercialPitchSummary.pitchScript);
                        showToast('Copied commercial phone pitch script to clipboard!');
                      }
                    }}
                    title="Copy commercial phone pitch script for this asset"
                  >
                    📋 Copy Pitch Script
                  </button>
                  <span className="dim" style={{ fontSize: '11px' }}>
                    Click row to inspect bilateral contract specifications &amp; hedging ticket
                  </span>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
                <table className="table" style={{ fontSize: '12px', margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '28px' }}>#</th>
                      <th style={{ minWidth: '220px' }}>Monetization Route &amp; Mechanism</th>
                      <th style={{ width: '130px' }}>Regime</th>
                      <th style={{ width: '130px' }}>Domestic Subsidy</th>
                      <th style={{ width: '105px', textAlign: 'right' }}>Gross Value</th>
                      <th style={{ width: '95px', textAlign: 'right' }}>Transit &amp; Fees</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Net Delivered</th>
                      <th style={{ width: '115px', textAlign: 'right' }}>Producer Bid</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Uplift</th>
                      <th style={{ width: '105px', textAlign: 'right' }}>Desk Margin</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Annual P&amp;L</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Compliance</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Execution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plantValuation.evaluations.map((strat, idx) => {
                      const isWinner = strat.strategyId === plantValuation.winningStrategy.strategyId;
                      const isSelected = strat.strategyId === activeStrategy.strategyId;
                      return (
                        <tr
                          key={strat.strategyId}
                          className={`${isSelected ? 'selrow' : ''} cursor-pointer`}
                          style={{
                            backgroundColor: isWinner && !isSelected ? 'rgba(16, 185, 129, 0.04)' : undefined,
                            boxShadow: isWinner ? 'inset 3px 0 0 #10b981' : undefined,
                          }}
                          onClick={() => setSelectedStrategyId(strat.strategyId)}
                        >
                          <td className="num dim">{String(idx + 1).padStart(2, '0')}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: isWinner ? 700 : 600 }}>{strat.strategyName}</span>
                              {isWinner && (
                                <span className="chip chip-pos" style={{ fontSize: '9px', padding: '1px 4px', fontWeight: 800 }}>
                                  WINNING
                                </span>
                              )}
                            </div>
                            <div className="dim" style={{ fontSize: '11px' }}>
                              {strat.targetMarket}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                              <span
                                className="chip"
                                style={{
                                  fontSize: '9px',
                                  padding: '1px 5px',
                                  fontWeight: 600,
                                  backgroundColor:
                                    strat.category === 'VOLUNTARY'
                                      ? '#eff6ff'
                                      : strat.category === 'INDUSTRIAL_ETS'
                                      ? '#f5f3ff'
                                      : strat.category === 'MARITIME'
                                      ? '#ecfeff'
                                      : '#ecfdf5',
                                  color:
                                    strat.category === 'VOLUNTARY'
                                      ? '#1d4ed8'
                                      : strat.category === 'INDUSTRIAL_ETS'
                                      ? '#6d28d9'
                                      : strat.category === 'MARITIME'
                                      ? '#0e7490'
                                      : '#047857',
                                }}
                              >
                                {strat.category.replace('_', ' ')}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: strat.deliveryModel === 'UNBUNDLED_CERTIFICATE_ONLY' ? '#2563eb' : 'var(--color-muted)',
                                }}
                              >
                                {strat.deliveryModel === 'UNBUNDLED_CERTIFICATE_ONLY' ? '📦 Book & Claim' : '⚡ Mass Balance'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`chip ${strat.subsidyAction === 'SUPPORT_SWITCH_OFF' ? 'chip-warn' : 'chip-info'}`}
                              style={{ fontSize: '9px', padding: '1px 5px', fontWeight: 600 }}
                            >
                              {strat.subsidyAction === 'SUPPORT_SWITCH_OFF' ? '⚡ Switch Off' : '🛡️ Retain Subsidy'}
                            </span>
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                            {strat.isEligible ? `€${strat.grossDeliveredValueEurMwh.toFixed(2)}` : '—'}
                          </td>
                          <td className="num dim" style={{ textAlign: 'right' }}>
                            {strat.isEligible ? `-€${(strat.transitAndLogisticsEurMwh + strat.structuringFeeEurMwh).toFixed(2)}` : '—'}
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            {strat.isEligible ? `€${strat.netDeliveredEurMwh.toFixed(2)}` : '—'}
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                            {strat.isEligible ? `€${strat.recommendedBidToProducerEurMwh.toFixed(2)}` : '—'}
                          </td>
                          <td
                            className="num"
                            style={{
                              textAlign: 'right',
                              color: strat.producerIncentiveDeltaEurMwh > 0 ? 'var(--color-status-pos-text)' : 'inherit',
                              fontWeight: 600,
                            }}
                          >
                            {strat.isEligible ? `+€${strat.producerIncentiveDeltaEurMwh.toFixed(2)}` : '—'}
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 800, fontSize: '13px' }}>
                            {strat.isEligible ? (
                              <span style={{ color: strat.netDeskMarginEurPerMWh > 0 ? 'var(--color-status-pos-text)' : 'inherit' }}>
                                +€{strat.netDeskMarginEurPerMWh.toFixed(2)}
                              </span>
                            ) : (
                              <span className="dim">—</span>
                            )}
                          </td>
                          <td
                            className="num"
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: strat.annualDeskPnLEur > 0 ? 'var(--color-status-pos-text)' : 'inherit',
                            }}
                          >
                            {strat.isEligible ? `+€${strat.annualDeskPnLEur.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {strat.isEligible ? (
                              <span className="chip chip-pos" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                Pass
                              </span>
                            ) : (
                              <span className="chip chip-neg" style={{ fontSize: '9px', padding: '1px 5px' }} title={strat.ineligibilityReason}>
                                Ineligible
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {strat.isEligible ? (
                              <button
                                type="button"
                                className={`btn ${isWinner ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ height: '24px', fontSize: '11px', padding: '0 8px', fontWeight: 700 }}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleStructureDealForStrategy(strat);
                                }}
                              >
                                Structure →
                              </button>
                            ) : (
                              <span className="dim" style={{ fontSize: '11px' }}>Blocked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Selected Strategy Contract Structure & EEX Hedging Dossier */}
            <div
              className="card"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-divider)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="eyebrow" style={{ fontWeight: 800, color: 'var(--color-text)' }}>
                    CONTRACT SPECIFICATIONS &amp; HEDGING DOSSIER:
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{activeStrategy.strategyName}</span>
                  <span
                    className={`chip ${activeStrategy.isEligible ? 'chip-pos' : 'chip-neg'}`}
                    style={{ fontSize: '9px', padding: '1px 5px', fontWeight: 700 }}
                  >
                    {activeStrategy.isEligible ? 'ELIGIBLE ROUTE' : 'STATUTORY BLOCK'}
                  </span>
                </div>
                {activeStrategy.isEligible && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ height: '28px', fontSize: '11px', padding: '0 12px', fontWeight: 800 }}
                    onClick={() => handleStructureDealForStrategy(activeStrategy)}
                  >
                    Structure This Route in Trade Builder →
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {activeStrategy.deliveryModel === 'UNBUNDLED_CERTIFICATE_ONLY' ? (
                  <>
                    {/* Left Column: Unbundled Book & Claim Certificate Structure */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="eyebrow" style={{ color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Voluntary GoO Offtake Structure (Single-Leg Unbundled)</span>
                        <span className="chip chip-info" style={{ fontSize: '9px', padding: '1px 5px' }}>
                          BOOK &amp; CLAIM
                        </span>
                      </div>

                      <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-panel-header)', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <span className="eyebrow" style={{ fontSize: '9px', color: 'var(--color-text)' }}>Physical Commodity Disposition</span>
                          <div style={{ fontWeight: 800, fontSize: '12px', marginTop: '1px', color: 'var(--color-muted)' }}>
                            🚫 NO PHYSICAL GAS DELIVERY TO BUYER
                          </div>
                          <div className="dim" style={{ fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>
                            Physical biomethane molecules remain in {plantValuation.plant.countryCode} domestic grid. Injected locally and remunerated under {plantValuation.domesticSubsidyBaseline.schemeName} (~€{plantValuation.domesticSubsidyBaseline.strikePriceEurMwh.toFixed(2)}/MWh). Zero pipeline transit tariffs, zero VTP balancing liability.
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '6px' }}>
                          <span className="eyebrow" style={{ fontSize: '9px', color: 'var(--color-text)' }}>Single-Leg Green Attribute Transfer (Registry Cancellation)</span>
                          <div style={{ fontWeight: 800, fontSize: '12px', marginTop: '1px', color: 'var(--color-status-pos-text)' }}>
                            {activeStrategy.twoLegFormula.certLegFormula}
                          </div>
                          <div className="dim" style={{ fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>
                            Electronic Guarantee of Origin (GoO) certificate transferred directly to corporate buyer via national registry and permanently cancelled for Corporate Scope 1 GHG Protocol compliance. Fixed €/MWh premium with zero CI sliding penalty.
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="eyebrow" style={{ fontSize: '9px' }}>Statutory &amp; Voluntary Registry Directives:</span>
                        <div style={{ fontSize: '11px', color: 'var(--color-dim)', marginTop: '4px', lineHeight: 1.4 }}>
                          {activeStrategy.regulatoryNotes.map((note, nIdx) => (
                            <div key={nIdx} style={{ marginBottom: '3px' }}>• {note}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Zero Commodity Delta & Producer Incentive */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="eyebrow" style={{ color: 'var(--color-text)' }}>
                        Desk Risk Profile &amp; Producer Economics
                      </div>

                      <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-panel-header)', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <span className="eyebrow" style={{ fontSize: '9px', color: 'var(--color-text)' }}>Commodity Market Risk Exposure</span>
                          <div className="num" style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-accent-700)', marginTop: '1px' }}>
                            🚫 NO EEX SHORT HEDGE REQUIRED (Zero Commodity Delta)
                          </div>
                          <div className="dim" style={{ fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>
                            Pure unbundled certificate trade. The desk carries zero natural gas price risk, zero basis risk, and zero imbalance exposure. Only registry certificate transfer execution is required.
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '6px' }}>
                          <span className="eyebrow" style={{ fontSize: '9px', color: 'var(--color-text)' }}>Domestic Subsidy &amp; Producer Bonus</span>
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            <strong>Producer Subsidy:</strong> Retains 100% of {plantValuation.domesticSubsidyBaseline.schemeName} (~€{plantValuation.domesticSubsidyBaseline.strikePriceEurMwh.toFixed(2)}/MWh)
                          </div>
                          <div className="dim" style={{ fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>
                            Bonus of +€{activeStrategy.recommendedBidToProducerEurMwh.toFixed(2)}/MWh paid to producer for GoO title transfer. 100% exempt from RED III 65% transport GHG threshold.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px' }}>
                        <div style={{ padding: '6px 8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
                          <div className="eyebrow" style={{ fontSize: '9px' }}>Certificate Volume</div>
                          <div className="num" style={{ fontWeight: 700, marginTop: '2px' }}>{plantValuation.plant.annualVolumeMWh.toLocaleString()} GoOs</div>
                        </div>
                        <div style={{ padding: '6px 8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
                          <div className="eyebrow" style={{ fontSize: '9px' }}>Producer Bonus</div>
                          <div className="num" style={{ fontWeight: 700, marginTop: '2px', color: 'var(--color-status-pos-text)' }}>+€{activeStrategy.recommendedBidToProducerEurMwh.toFixed(2)}/MWh</div>
                        </div>
                        <div style={{ padding: '6px 8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
                          <div className="eyebrow" style={{ fontSize: '9px' }}>Desk Annual P&amp;L</div>
                          <div className="num" style={{ fontWeight: 800, marginTop: '2px', color: 'var(--color-status-pos-text)' }}>
                            +€{activeStrategy.annualDeskPnLEur.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Left Column: Bilateral Offtake Contract Structure (Institutional Two-Leg Model) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="eyebrow" style={{ color: 'var(--color-text)' }}>
                        Bilateral Offtake Structure (Institutional Two-Leg Model)
                      </div>

                      <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-panel-header)', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div>
                          <span className="eyebrow" style={{ fontSize: '9px' }}>Leg 1: Physical Gas (TTF Indexation)</span>
                          <div style={{ fontWeight: 700, fontSize: '12px', marginTop: '1px' }}>
                            {activeStrategy.twoLegFormula.physicalLegFormula}
                          </div>
                          <div className="dim" style={{ fontSize: '11px', marginTop: '2px' }}>
                            Invoiced monthly on the 20th of month M+1. Delivered at VTP Virtual Trading Point. Offtaker balances hourly flow ({plantValuation.plant.hourlyCapacityMWh} MWh/h).
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '6px' }}>
                          <span className="eyebrow" style={{ fontSize: '9px' }}>Leg 2: Green Attribute (Proof of Sustainability + CI Slider)</span>
                          <div style={{ fontWeight: 700, fontSize: '12px', marginTop: '1px' }}>
                            {activeStrategy.twoLegFormula.certLegFormula}
                          </div>
                          <div className="dim" style={{ fontSize: '11px', marginTop: '2px' }}>
                            Invoiced 10 business days post-registry transfer. Carbon intensity adjustment rate slides at €{activeStrategy.twoLegFormula.ciSliderEurMwhPerGram.toFixed(2)}/gCO₂e from base.
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="eyebrow" style={{ fontSize: '9px' }}>Statutory &amp; Regulatory Directives:</span>
                        <div style={{ fontSize: '11px', color: 'var(--color-dim)', marginTop: '4px', lineHeight: 1.4 }}>
                          {activeStrategy.regulatoryNotes.map((note, nIdx) => (
                            <div key={nIdx} style={{ marginBottom: '3px' }}>• {note}</div>
                          ))}
                          {activeStrategy.ineligibilityReason && (
                            <div style={{ color: 'var(--color-status-neg-text)', fontWeight: 600 }}>
                              ⚠️ Reason: {activeStrategy.ineligibilityReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: EEX Futures Hedge & Chain of Custody */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="eyebrow" style={{ color: 'var(--color-text)' }}>
                        Desk Risk Management &amp; Exchange Hedging
                      </div>

                      <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-panel-header)', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <span className="eyebrow" style={{ fontSize: '9px' }}>EEX Futures Short Hedge Ticket</span>
                          <div className="num" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-status-pos-text)', marginTop: '1px' }}>
                            Sell Short {plantValuation.plant.annualVolumeMWh.toLocaleString()} MWh on EEX TTF Natural Gas Futures
                          </div>
                          <div className="dim" style={{ fontSize: '11px', marginTop: '2px' }}>
                            Delta-neutral commodity hedge locks in the green compliance spread (+€{activeStrategy.netDeskMarginEurPerMWh.toFixed(2)}/MWh) against natural gas wholesale market drops.
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '6px' }}>
                          <span className="eyebrow" style={{ fontSize: '9px' }}>Domestic Subsidy &amp; Registry Transfer</span>
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            <strong>Subsidy Action:</strong>{' '}
                            {activeStrategy.subsidyAction === 'SUPPORT_SWITCH_OFF'
                              ? `Switch off ${plantValuation.domesticSubsidyBaseline.schemeName} (strike €${plantValuation.domesticSubsidyBaseline.strikePriceEurMwh.toFixed(2)}/MWh)`
                              : `Maintain domestic ${plantValuation.domesticSubsidyBaseline.schemeName} support`}
                          </div>
                          <div className="dim" style={{ fontSize: '11px', marginTop: '2px' }}>
                            Chain of custody: Registered via {plantValuation.plant.networkOperator} → transferred via EU Union Database (UDB) &amp; national registry.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px' }}>
                        <div style={{ padding: '6px 8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
                          <div className="eyebrow" style={{ fontSize: '9px' }}>Hourly Volume</div>
                          <div className="num" style={{ fontWeight: 700, marginTop: '2px' }}>{plantValuation.plant.hourlyCapacityMWh} MWh/h</div>
                        </div>
                        <div style={{ padding: '6px 8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
                          <div className="eyebrow" style={{ fontSize: '9px' }}>Annual Volume</div>
                          <div className="num" style={{ fontWeight: 700, marginTop: '2px' }}>{plantValuation.plant.annualVolumeMWh.toLocaleString()} MWh</div>
                        </div>
                        <div style={{ padding: '6px 8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
                          <div className="eyebrow" style={{ fontSize: '9px' }}>Desk Annual P&amp;L</div>
                          <div className="num" style={{ fontWeight: 800, marginTop: '2px', color: activeStrategy.annualDeskPnLEur > 0 ? 'var(--color-status-pos-text)' : 'inherit' }}>
                            {activeStrategy.isEligible ? `+€${activeStrategy.annualDeskPnLEur.toLocaleString()}` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: European Sourcing Corridors */}
        {activeTab === 'CORRIDORS' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', padding: '14px 0 8px' }}>
              <h3 className="ptitle">Origin Supply Corridors → {targetMarket.name}</h3>
              <span className="subttl num">
                {corridorRows.length} origins evaluated · {numericQty.toLocaleString()} MWh · {FEEDSTOCK_REGISTRY[feedstockSelect]?.name} ({numericCI} CI)
              </span>
            </div>

            <table className="table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>#</th>
                  <th style={{ width: '190px' }}>Origin Country &amp; TSO</th>
                  <th style={{ width: '160px' }}>Corridor &amp; Route</th>
                  <th style={{ width: '110px' }}>RED III Gates</th>
                  <th style={{ width: '85px', textAlign: 'right' }}>Transit Tariff</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Delivered</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Desk Margin</th>
                  <th style={{ width: '95px', textAlign: 'right' }}>Deal Profit</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Plants</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="skel" style={{ width: '16px' }} /></td>
                      <td><div className="skel" style={{ width: '80%' }} /></td>
                      <td><div className="skel" style={{ width: '70%' }} /></td>
                      <td><div className="skel" style={{ width: '90px' }} /></td>
                      <td><div className="skel" style={{ width: '60px', marginLeft: 'auto' }} /></td>
                      <td><div className="skel" style={{ width: '65px', marginLeft: 'auto' }} /></td>
                      <td><div className="skel" style={{ width: '75px', marginLeft: 'auto' }} /></td>
                      <td><div className="skel" style={{ width: '70px', marginLeft: 'auto' }} /></td>
                      <td><div className="skel" style={{ width: '40px', margin: '0 auto' }} /></td>
                      <td><div className="skel" style={{ width: '80px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))
                ) : (
                  corridorRows.map((row, idx) => {
                    const isSelected = row.originCode === selectedRowId;
                    const isExpanded = row.originCode === expandedOrigin;
                    const margin = row.deskNetMarginEurPerMWh;

                    return (
                      <React.Fragment key={row.originCode}>
                        <tr
                          data-click="1"
                          className={isSelected ? 'selrow' : ''}
                          onClick={() => {
                            setSelectedRowId(row.originCode);
                            setExpandedOrigin(isExpanded ? null : row.originCode);
                          }}
                          onDoubleClick={() => handleStructureDeal(row.targetMarketId, row.originCode)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="num dim">{String(idx + 1).padStart(2, '0')}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                              <span style={{ fontSize: '15px' }}>{row.originFlag}</span>
                              <span>{row.originName}</span>
                            </div>
                            <div style={{ fontSize: '11px' }} className="mut">
                              {row.primaryRegistry} · {row.gridZone === 'EU_INTERCONNECTED' ? 'EU Grid' : 'Non-EU Grid'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>
                              {row.originCode} → {row.targetCountry} ({row.distanceKm} km)
                            </div>
                            <div style={{ fontSize: '11px' }} className="mut">
                              {row.routeHops.join(' → ')}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {row.eligibility.gates.map((g: GateResult, gIdx: number) => {
                                const isPass = g.verdict === 'PASS';
                                const isHard = g.verdict === 'HARD_BLOCK';
                                const soft = !isPass && !isHard;
                                return (
                                  <span
                                    key={gIdx}
                                    title={`${GATE_TITLES[gIdx]} — ${isPass ? 'Pass' : isHard ? 'Hard block' : 'Conditional / unresolved'}`}
                                    style={{
                                      width: '15px',
                                      height: '15px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '9px',
                                      fontWeight: 700,
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
                          <td className="num mut" style={{ textAlign: 'right' }}>
                            €{row.transitTariffEurPerMWh.toFixed(2)}
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 500 }}>
                            {row.deliveredCostEurPerMWh !== null ? `€${row.deliveredCostEurPerMWh.toFixed(2)}` : '—'}
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>
                            {margin !== null ? (
                              <span style={{ color: margin > 0 ? 'var(--color-accent-700)' : 'inherit' }}>
                                +€{margin.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>BLOCKED</span>
                            )}
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                            {row.totalDealProfitEur !== null ? (
                              <span>€{Math.round(row.totalDealProfitEur).toLocaleString()}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={`chip ${isExpanded ? 'chip-a' : ''}`}
                              style={{ cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}
                              onClick={e => {
                                e.stopPropagation();
                                setExpandedOrigin(isExpanded ? null : row.originCode);
                              }}
                            >
                              {row.matchingPlants.length} plants {isExpanded ? '▲' : '▼'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className={`btn ${row.isTradeable ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                              onClick={e => {
                                e.stopPropagation();
                                handleStructureDeal(row.targetMarketId, row.originCode, row.matchingPlants[0] || undefined);
                              }}
                            >
                              Structure Trade
                            </button>
                          </td>
                        </tr>

                        {/* Nested Dropdown: Eligible Plants Table in this Country */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} style={{ padding: '0', backgroundColor: 'var(--color-panel-header)' }}>
                              <div style={{ padding: '12px 18px', borderLeft: '3px solid var(--color-accent)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '15px' }}>{row.originFlag}</span>
                                    <strong style={{ fontSize: '12px' }}>
                                      Eligible {row.originName} Biomethane Facilities ({row.matchingPlants.length} assets matching {FEEDSTOCK_REGISTRY[feedstockSelect]?.name})
                                    </strong>
                                  </div>
                                  <span style={{ fontSize: '11px' }} className="mut">
                                    Click &ldquo;Source Plant&rdquo; to carry verified capacity and TSO node into Trade Builder
                                  </span>
                                </div>

                                {row.matchingPlants.length === 0 ? (
                                  <div className="mut" style={{ fontSize: '12px', padding: '8px 0' }}>
                                    No direct individual verified assets in {row.originName} matching this substrate. Corridor evaluated on national registry macro aggregate.
                                  </div>
                                ) : (
                                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
                                    <table className="table" style={{ fontSize: '11px', margin: 0 }}>
                                      <thead>
                                        <tr>
                                          <th style={{ width: '28px' }}>#</th>
                                          <th>Facility Name</th>
                                          <th>Operating Entity</th>
                                          <th>TSO / Grid Node</th>
                                          <th style={{ width: '105px', textAlign: 'right' }}>Annual Energy</th>
                                          <th style={{ width: '90px', textAlign: 'right' }}>Capacity</th>
                                          <th>Substrate Mix</th>
                                          <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {row.matchingPlants.map((plant, pIdx) => (
                                          <tr key={plant.id}>
                                            <td className="num dim">{String(pIdx + 1).padStart(2, '0')}</td>
                                            <td>
                                              <div style={{ fontWeight: 600 }}>{plant.name}</div>
                                              <div style={{ fontSize: '10px' }} className="mut">{plant.region || 'National Grid Zone'}</div>
                                            </td>
                                            <td className="mut">{plant.operator || plant.legalEntityName || <span style={{ fontStyle: 'italic', opacity: 0.65 }}>Operator unrecorded</span>}</td>
                                            <td>{plant.networkOperator || row.primaryRegistry}</td>
                                            <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                                              {plant.annualEnergyGWh ? `${plant.annualEnergyGWh.toFixed(1)} GWh` : '—'}
                                            </td>
                                            <td className="num mut" style={{ textAlign: 'right' }}>
                                              {plant.capacityNm3h ? `${plant.capacityNm3h.toLocaleString()} Nm³/h` : '—'}
                                            </td>
                                            <td style={{ fontSize: '10px' }}>
                                              <div>{plant.primaryFeedstockCategory || 'Manure & Slurry'}</div>
                                              <div className="mut">{plant.feedstockDetails || 'Audited substrate'}</div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                              <button
                                                type="button"
                                                className="btn btn-primary"
                                                style={{ height: '22px', fontSize: '10px', padding: '0 8px' }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleStructureDeal(row.targetMarketId, row.originCode, plant);
                                                }}
                                              >
                                                Source Plant →
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Matched Producer Plants Directory */}
        {activeTab === 'PLANTS' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', padding: '14px 0 8px', flexWrap: 'wrap' }}>
              <h3 className="ptitle">Audited Producer Facilities (1,975 Census)</h3>
              <span className="subttl num">
                {filteredPlantsList.length} matching facilities · {FEEDSTOCK_REGISTRY[feedstockSelect]?.name}
              </span>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search plant, operator, or grid node..."
                  className="input"
                  style={{ minWidth: '240px', height: '28px', fontSize: '11px' }}
                  value={plantSearchQuery}
                  onChange={e => setPlantSearchQuery(e.target.value)}
                />

                <select
                  className="input"
                  style={{ height: '28px', fontSize: '11px' }}
                  value={plantCountryFilter}
                  onChange={e => setPlantCountryFilter(e.target.value)}
                >
                  <option value="ALL">All Countries</option>
                  {Object.values(PRODUCING_ORIGINS).map(o => (
                    <option key={o.countryCode} value={o.countryCode}>
                      {o.flag} {o.countryName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <table className="table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>#</th>
                  <th style={{ width: '220px' }}>Facility Asset &amp; Operator</th>
                  <th style={{ width: '130px' }}>Origin &amp; Hub</th>
                  <th style={{ width: '180px' }}>TSO / Grid Injection Point</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Annual Energy</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Capacity Nm³/h</th>
                  <th>Audited Substrate Mix</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlantsList.slice(0, 30).map((plant, pIdx) => (
                  <tr key={plant.id}>
                    <td className="num dim">{String(pIdx + 1).padStart(2, '0')}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{plant.name}</div>
                      <div style={{ fontSize: '11px' }} className="mut">
                        {plant.operator || plant.legalEntityName || <span style={{ fontStyle: 'italic', opacity: 0.65 }}>Operator unrecorded</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>{plant.countryFlag}</span>
                        <span>{plant.country}</span>
                      </div>
                      <div style={{ fontSize: '11px' }} className="mut">{plant.region || 'Grid Zone'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{plant.networkOperator || 'National Grid'}</div>
                      <div style={{ fontSize: '11px' }} className="mut">{plant.gridConnectionType || 'Transmission Injection'}</div>
                    </td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {plant.annualEnergyGWh ? `${plant.annualEnergyGWh.toFixed(1)} GWh` : '—'}
                    </td>
                    <td className="num mut" style={{ textAlign: 'right' }}>
                      {plant.capacityNm3h ? `${plant.capacityNm3h.toLocaleString()} Nm³/h` : '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: '11px' }}>{plant.primaryFeedstockCategory || 'Manure & Slurry'}</div>
                      <div style={{ fontSize: '10px' }} className="mut">{plant.feedstockDetails || 'Standard RED III feedstock'}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                        onClick={() => handleStructureDeal(selectedMarketSelect === 'ALL' ? getDefaultMarketForOrigin(plant.countryCode) : selectedMarketSelect, plant.countryCode, plant)}
                      >
                        Source Plant →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Destination Market Ranking */}
        {activeTab === 'MARKETS' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', padding: '14px 0 8px' }}>
              <h3 className="ptitle">Destination Market Arbitrage Matrix</h3>
              <span className="subttl num">All-in delivered basis, {currentSide}</span>
            </div>

            <table className="table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '34px' }}>#</th>
                  <th>Market / registry</th>
                  <th style={{ width: '118px' }}>Gates</th>
                  <th style={{ width: '104px', textAlign: 'right' }}>Net €/MWh</th>
                  <th style={{ width: '200px' }}>Spread vs all-in</th>
                  <th style={{ width: '88px', textAlign: 'right' }}>Margin</th>
                  <th style={{ width: '118px' }}>Provenance</th>
                  <th style={{ width: '52px', textAlign: 'center' }}>Age</th>
                </tr>
              </thead>
              <tbody>
                {rankedList.map((item, idx) => {
                  const net = item.netNetback ?? 0;
                  const isSelected = item.marketId === selectedRowId;
                  const barWidth = Math.min(100, (Math.abs(net) / maxAbs) * 100);
                  const el = eligibilityMap.get(item.marketId);
                  const isBlocked = el?.overallVerdict === 'HARD_BLOCK';
                  const isSim = item.isModelled || item.provenance?.sourceType === 'ESTIMATE';
                  const mkt = getMarketById(item.marketId);

                  return (
                    <tr
                      key={item.marketId}
                      data-click="1"
                      className={isSelected ? 'selrow' : ''}
                      onClick={() => setSelectedRowId(item.marketId)}
                      onDoubleClick={() => handleStructureDeal(item.marketId, 'DK')}
                    >
                      <td className="num dim">{String(idx + 1).padStart(2, '0')}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.marketName}</div>
                        <div style={{ fontSize: '11px' }} className="mut">{mkt?.registry || mkt?.legalBasis || ''}</div>
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
                                title={`${GATE_TITLES[gIdx]} — ${isPass ? 'Pass' : isHard ? 'Hard block' : 'Conditional / unresolved'}`}
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
                      <td className="num" style={{ textAlign: 'right', fontSize: '15px', fontWeight: 600 }}>
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
                              width: `${barWidth}%`,
                              backgroundColor: net < 0 || isBlocked
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
                      <td>
                        <span className={`chip ${isSim ? 'chip-a' : ''}`}>
                          {isSim ? 'Estimate · sim' : 'Desk · manual'}
                        </span>
                      </td>
                      <td className="num mut" style={{ textAlign: 'center', fontSize: '11px' }}>
                        {isSim ? 'sim' : '1d'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: Pan-European Corridor Heatmap */}
        {activeTab === 'HEATMAP' && (
          <div style={{ paddingTop: '14px' }}>
            <CorridorMatrix
              tradeableRoutes={searchResult.tradeable}
              blockedRoutes={searchResult.blocked}
              onSelectRoute={(r: ArbitrageOpportunity) => {
                handleStructureDeal(r.targetMarketId, r.originCountry);
              }}
              onSelectCorridor={(orig: string, mkt: string) => {
                setSelectedMarketSelect(mkt);
                setSelectedRowId(orig);
                setActiveTab('CORRIDORS');
              }}
            />
          </div>
        )}
      </div>

      {/* 5. Blocked Statutory Banner */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 18px',
          borderTop: '2px solid var(--color-accent)',
          backgroundColor: 'var(--color-accent-100)',
          flex: '0 1 auto',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-bg)',
            padding: '3px 8px',
          }}
        >
          Blocked
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {highestBlocked ? `${highestBlocked.market} would net €${highestBlocked.netback.toFixed(2)}/MWh — unreachable on grid-injected volume.` : 'UK RTFO would net €88.10/MWh — unreachable on grid-injected volume.'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-accent-900)' }}>
            {highestBlocked ? `${highestBlocked.blockingReason}. Remedy: ${highestBlocked.remedy}` : 'Grid injection cannot evidence UDB ingestion for the RTFO. Remedy: physical bio-LNG delivery under mass balance.'}
          </div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '11px', whiteSpace: 'nowrap' }} className="mut">
          RED III Art. 28(2) · Reg. (EU) 2024/2792
        </span>
      </div>
      {/* 360 Sourcing Drawer */}
      {isPlantDrawerOpen && selectedPlant && (
        <PlantSourcingDrawer
          plant={selectedPlant}
          onClose={() => setIsPlantDrawerOpen(false)}
        />
      )}
    </div>
  );
}

