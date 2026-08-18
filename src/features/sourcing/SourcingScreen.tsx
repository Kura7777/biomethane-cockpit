import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MorningBriefingDesk } from './MorningBriefingDesk';
import { QuickDealDrawer } from './QuickDealDrawer';
import { CorridorMatrix } from './CorridorMatrix';
import { MathFormulaModal } from '../../shared/components/MathFormulaModal';
import { 
  ArrowRight, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  SlidersHorizontal, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  ExternalLink,
  RotateCcw,
  Sparkles,
  Info,
  List,
  Grid,
  Zap,
  Building2,
  FileSpreadsheet,
  Calculator,
  Check,
  TrendingUp,
  Mail,
  Send,
  DollarSign
} from 'lucide-react';
import { useAppState } from '../../store/context';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { BASELINE_BROKER_RUNS, BrokerOrderEntry } from '../../domain/markets/brokerRuns';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { 
  CertificationScheme, 
  ChainOfCustody, 
  DeliveryPeriod 
} from '../../domain/consignment/types';
import { 
  ClientRequest, 
  ArbitrageOpportunity 
} from '../../domain/arbitrage/types';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { generateSourcingNoteText } from '../../domain/trade/sourcingNote';
import { searchResultContainsPraData } from '../../domain/trade/licensing';
import { MARK_SOURCE_RELIABILITY, MarkSourceType } from '../../domain/markets/types';
import { CopyButton } from '../../shared/components/CopyButton';

type SortMode = 'VALUE' | 'CONFIDENCE';

function getVerdictTone(verdict: string) {
  switch (verdict) {
    case 'PASS':
    case 'ELIGIBLE':
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-950/60',
        border: 'border-emerald-800',
        dot: 'bg-emerald-500',
        badge: 'text-emerald-400 bg-emerald-950 border-emerald-800',
      };
    case 'CONDITIONAL':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-950/60',
        border: 'border-amber-800',
        dot: 'bg-amber-500',
        badge: 'text-amber-400 bg-amber-950 border-amber-800',
      };
    case 'UNRESOLVED':
      return {
        text: 'text-sky-400',
        bg: 'bg-sky-950/60',
        border: 'border-sky-800',
        dot: 'bg-sky-500',
        badge: 'text-sky-400 bg-sky-950 border-sky-800',
      };
    case 'HARD_BLOCK':
    case 'FAIL':
    default:
      return {
        text: 'text-red-400',
        bg: 'bg-red-950/60',
        border: 'border-red-800',
        dot: 'bg-red-500',
        badge: 'text-red-400 bg-red-950 border-red-800',
      };
  }
}

function getSourceChipTone(sourceType?: MarkSourceType | null, isModelled?: boolean) {
  if (isModelled) {
    return 'bg-purple-950/70 border-purple-800 text-purple-300';
  }
  switch (sourceType) {
    case 'EXCHANGE_AUCTION':
      return 'bg-emerald-950/70 border-emerald-700 text-emerald-300';
    case 'PRICE_REPORTING':
      return 'bg-blue-950/70 border-blue-700 text-blue-300';
    case 'PLATFORM_HISTORY':
      return 'bg-cyan-950/70 border-cyan-700 text-cyan-300';
    case 'COUNTERPARTY_QUOTE':
      return 'bg-indigo-950/70 border-indigo-700 text-indigo-300';
    case 'BROKER_INDICATION':
      return 'bg-amber-950/70 border-amber-800 text-amber-300';
    case 'ESTIMATE':
    default:
      return 'bg-stone-900 border-stone-700 text-stone-400';
  }
}

export function SourcingScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useAppState();

  const modeParam = searchParams.get('mode') || searchParams.get('tab');
  const [activeDeskTab, setActiveDeskTab] = useState<'SOURCING' | 'BRIEFING'>(
    modeParam === 'briefing' ? 'BRIEFING' : 'SOURCING'
  );

  // Form State
  const [marketArchetype, setMarketArchetype] = useState<'COMPLIANCE' | 'CORPORATE_GO'>('COMPLIANCE');
  const [targetMarketId, setTargetMarketId] = useState<string | 'ANY'>('DE_THG');
  const [volumeMwh, setVolumeMwh] = useState<number | null>(20000);
  const [volumeInput, setVolumeInput] = useState<string>('20000');
  const [feedstockKey, setFeedstockKey] = useState<string | 'ANY'>('manure');
  const [scheme, setScheme] = useState<CertificationScheme | 'ANY'>('ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>('MASS_BALANCE');
  
  // Delivery Period & Vintage
  const [deliveryType, setDeliveryType] = useState<'CALENDAR' | 'QUARTER' | 'MONTH' | 'CUSTOM' | null>('CALENDAR');
  const [complianceYear, setComplianceYear] = useState<number | null>(2026);
  const [vintageSelection, setVintageSelection] = useState<string>('2026');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');

  // Constraints
  const [maxDeliveredCost, setMaxDeliveredCost] = useState<number | null>(null);
  const [maxCI, setMaxCI] = useState<number | null>(0);
  const [maxCIInput, setMaxCIInput] = useState<string>('0');
  const [physicalDeliveryRequired, setPhysicalDeliveryRequired] = useState<boolean>(false);

  // Commercial Context
  const [counterparty, setCounterparty] = useState<string>('Shell Energy Europe');
  const [notes, setNotes] = useState<string>('Prompt pan-European sourcing inquiry for German THG quota surrender.');

  // Display, Layout and Sort controls
  const [viewLayout, setViewLayout] = useState<'TABLE' | 'MATRIX'>('TABLE');
  const [sortMode, setSortMode] = useState<SortMode>('VALUE');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [selectedRouteForDrawer, setSelectedRouteForDrawer] = useState<ArbitrageOpportunity | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);

  // Build the client request
  const clientRequest: ClientRequest = useMemo(() => ({
    targetMarketId,
    volumeMwh,
    delivery: {
      type: deliveryType,
      startDate: startDate || null,
      endDate: endDate || null,
      complianceYear,
    },
    feedstockKey,
    scheme,
    chainOfCustody,
    constraints: {
      maxDeliveredCostEurMwh: maxDeliveredCost,
      maxCarbonIntensity: maxCI,
      physicalDeliveryRequired,
    },
    counterparty: counterparty || null,
    notes: notes || null,
  }), [
    targetMarketId,
    volumeMwh,
    deliveryType,
    startDate,
    endDate,
    complianceYear,
    feedstockKey,
    scheme,
    chainOfCustody,
    maxDeliveredCost,
    maxCI,
    physicalDeliveryRequired,
    counterparty,
    notes,
  ]);

  // Execute Search via Domain Adapter
  const deferredRequest = useDeferredValue(clientRequest);
  const searchResult = useMemo(() => {
    return searchSourcingRoutes(
      deferredRequest,
      state.marks,
      state.costs,
      DEFAULT_WHAT_IF_SCENARIO
    );
  }, [deferredRequest, state.marks, state.costs]);

  // Live Matching Broker Orders from Pricing Desk / localStorage
  const liveBrokerMatches = useMemo(() => {
    const savedOrders = (() => {
      try {
        const saved = localStorage.getItem('biomethane_broker_orders_v1');
        if (saved) return JSON.parse(saved) as BrokerOrderEntry[];
      } catch (e) {}
      return BASELINE_BROKER_RUNS;
    })();

    return savedOrders.filter(order => {
      const feedstockMatch = feedstockKey === 'ANY' ||
        (feedstockKey === 'manure' && order.feedstock.toLowerCase().includes('manure')) ||
        (feedstockKey === 'biowaste' && order.feedstock.toLowerCase().includes('waste')) ||
        (feedstockKey === 'crop' && order.feedstock.toLowerCase().includes('crop'));
      
      const countryMatch = targetMarketId === 'ANY' ||
        targetMarketId.startsWith(order.country) ||
        order.country === 'AIB';

      return feedstockMatch || countryMatch;
    }).slice(0, 4);
  }, [feedstockKey, targetMarketId]);

  const handleSelectVintage = (v: string) => {
    setVintageSelection(v);
    switch (v) {
      case '2024':
        setComplianceYear(2024);
        setDeliveryType('CALENDAR');
        setStartDate('2024-01-01');
        setEndDate('2024-12-31');
        break;
      case 'H224':
        setComplianceYear(2024);
        setDeliveryType('CUSTOM');
        setStartDate('2024-07-01');
        setEndDate('2024-12-31');
        break;
      case '2025':
        setComplianceYear(2025);
        setDeliveryType('CALENDAR');
        setStartDate('2025-01-01');
        setEndDate('2025-12-31');
        break;
      case 'H225':
        setComplianceYear(2025);
        setDeliveryType('CUSTOM');
        setStartDate('2025-07-01');
        setEndDate('2025-12-31');
        break;
      case 'Q425':
        setComplianceYear(2025);
        setDeliveryType('QUARTER');
        setStartDate('2025-10-01');
        setEndDate('2025-12-31');
        break;
      case '2026':
        setComplianceYear(2026);
        setDeliveryType('CALENDAR');
        setStartDate('2026-01-01');
        setEndDate('2026-12-31');
        break;
      case 'H226':
        setComplianceYear(2026);
        setDeliveryType('CUSTOM');
        setStartDate('2026-07-01');
        setEndDate('2026-12-31');
        break;
      case 'Q426':
        setComplianceYear(2026);
        setDeliveryType('QUARTER');
        setStartDate('2026-10-01');
        setEndDate('2026-12-31');
        break;
      case '2027':
        setComplianceYear(2027);
        setDeliveryType('CALENDAR');
        setStartDate('2027-01-01');
        setEndDate('2027-12-31');
        break;
      case 'H127':
        setComplianceYear(2027);
        setDeliveryType('CUSTOM');
        setStartDate('2027-01-01');
        setEndDate('2027-06-30');
        break;
      case 'H227':
        setComplianceYear(2027);
        setDeliveryType('CUSTOM');
        setStartDate('2027-07-01');
        setEndDate('2027-12-31');
        break;
      case '2027/28':
        setComplianceYear(2027);
        setDeliveryType('CUSTOM');
        setStartDate('2027-01-01');
        setEndDate('2028-12-31');
        break;
      case '2028':
        setComplianceYear(2028);
        setDeliveryType('CALENDAR');
        setStartDate('2028-01-01');
        setEndDate('2028-12-31');
        break;
      default:
        const yr = Number(v);
        if (!isNaN(yr)) {
          setComplianceYear(yr);
          setDeliveryType('CALENDAR');
          setStartDate(`${yr}-01-01`);
          setEndDate(`${yr}-12-31`);
        }
        break;
    }
  };

  const handleApplyBrokerOrder = (order: BrokerOrderEntry) => {
    // If the broker quote is a GO/RGGO class or the user is on Corporate GOs tab, maintain Corporate GO archetype
    const isCorporateOrder = order.class === 'GO' || order.class === 'RGGO' || marketArchetype === 'CORPORATE_GO';

    let targetMkt: string;
    if (isCorporateOrder) {
      targetMkt = 
        order.country === 'UK' ? 'UK_RGGO' :
        order.country === 'DK' ? 'DK_GO' :
        order.country === 'DE' ? 'DE_GO' :
        order.country === 'NL' ? 'NL_GO' :
        order.country === 'FR' ? 'FR_GO' :
        order.country === 'AIB' ? 'AIB_GO' : 'AIB_GO';
      setMarketArchetype('CORPORATE_GO');
    } else {
      targetMkt = 
        order.country === 'DE' ? 'DE_THG' :
        order.country === 'NL' ? 'NL_ERE' :
        order.country === 'FR' ? 'FR_CPB' :
        order.country === 'UK' ? 'UK_RTFO' :
        order.country === 'DK' ? 'DK_GO' : 'DE_THG';
      setMarketArchetype('COMPLIANCE');
    }
    
    setTargetMarketId(targetMkt);
    setFilterQuery(order.country === 'AIB' ? '' : order.country);

    const fKey = 
      order.feedstock.toLowerCase().includes('manure') ? 'manure' :
      order.feedstock.toLowerCase().includes('waste/crop') ? 'agri_waste' :
      order.feedstock.toLowerCase().includes('waste') ? 'biowaste' :
      order.feedstock.toLowerCase().includes('crop') ? 'crop' :
      order.feedstock.toLowerCase().includes('mix') ? 'agri_waste' : 'manure';
    setFeedstockKey(fKey);

    handleSelectVintage(order.vintage);

    const scheme: CertificationScheme = 
      order.certified.toLowerCase().includes('iscc') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('a9a') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('ets') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('uncertified') ? 'ISCC_PLUS' : 'ISCC_EU';
    setScheme(scheme);

    if (order.ciNumeric !== null) {
      setMaxCI(order.ciNumeric);
      setMaxCIInput(order.ciNumeric.toString());
    }

    const volGWh = order.offerVolumeGWh != null ? order.offerVolumeGWh : (order.bidVolumeGWh != null ? order.bidVolumeGWh : 10);
    const vol = volGWh * 1000;
    setVolumeMwh(vol);
    setVolumeInput(vol.toString());
    setCounterparty(`OTC Broker (${order.country} ${order.class})`);
    
    const quotePrice = order.offerPrice ?? order.bidPrice;
    setNotes(`Direct quote reference: ${order.country} ${order.feedstock} ${order.vintage} (${order.subsidized}) @ ${order.currency === 'GBP' ? '£' : '€'}${quotePrice ?? 'Mkt'}/MWh.`);

    // If desk mark for this market is currently unpriced, populate it with the broker quote so netback solves instantly
    if (quotePrice !== null) {
      const currentMark = state.marks.marks[targetMkt];
      if (!currentMark || currentMark.mid === null) {
        dispatch({
          type: 'SET_MARK',
          marketId: targetMkt,
          bid: order.bidPrice,
          offer: order.offerPrice,
          mid: quotePrice,
          source: `Broker Quote (${order.country} ${order.class})`,
          updatedAt: new Date().toISOString(),
          provenance: {
            sourceType: 'BROKER_INDICATION',
            sourceName: 'OTC Broker Order Book',
            sourceUrl: null,
            observedAt: new Date().toISOString(),
            note: `Direct OTC broker quote: ${order.country} ${order.feedstock} ${order.vintage}`,
          },
        });
      }
    }
  };

  // Sync URL search parameters (from Map / Pricing Screen / Briefing navigation)
  useEffect(() => {
    const marketParam = searchParams.get('market') || searchParams.get('marketId');
    const originParam = searchParams.get('origin') || searchParams.get('originCountry');
    const feedstockParam = searchParams.get('feedstock');
    const volParam = searchParams.get('volume');
    const counterpartyParam = searchParams.get('counterparty');
    const ciParam = searchParams.get('ci');
    const vintageParam = searchParams.get('vintage') || searchParams.get('year');

    if (marketParam) {
      setTargetMarketId(marketParam);
      if (['AIB_GO', 'UK_RGGO', 'DE_GO', 'NL_GO', 'FR_GO', 'DK_GO'].includes(marketParam)) {
        setMarketArchetype('CORPORATE_GO');
      } else {
        setMarketArchetype('COMPLIANCE');
      }
    }
    if (originParam) {
      setFilterQuery(originParam);
    }
    if (feedstockParam) {
      setFeedstockKey(feedstockParam);
    }
    if (volParam) {
      const v = Number(volParam);
      if (!isNaN(v)) {
        setVolumeMwh(v);
        setVolumeInput(v.toString());
      }
    }
    if (counterpartyParam) {
      setCounterparty(counterpartyParam);
    }
    if (ciParam) {
      const c = Number(ciParam);
      if (!isNaN(c)) {
        setMaxCI(c);
        setMaxCIInput(c.toString());
      }
    }
    if (vintageParam) {
      handleSelectVintage(vintageParam);
    }
  }, [searchParams]);

  // If autoOpen is specified, auto-open the QuickDealDrawer for the matching route
  useEffect(() => {
    const autoOpen = searchParams.get('autoOpen');
    const originParam = searchParams.get('origin') || searchParams.get('originCountry');
    if (autoOpen === 'true' && searchResult.tradeable.length > 0) {
      const match = originParam
        ? searchResult.tradeable.find(r => r.originCountry === originParam || r.originCountryName.toLowerCase().includes(originParam.toLowerCase())) || searchResult.tradeable[0]
        : searchResult.tradeable[0];
      if (match) {
        setSelectedRouteForDrawer(match);
      }
    }
  }, [searchParams, searchResult.tradeable]);

  // PRA licence checking for export note
  const praResult = useMemo(() => {
    const marketIds = Array.from(new Set([
      ...searchResult.tradeable.map(r => r.targetMarketId),
      ...searchResult.blocked.map(r => r.targetMarketId),
    ]));
    return searchResultContainsPraData(marketIds, state.marks);
  }, [searchResult, state.marks]);

  // Plain-text Sourcing Note content
  const sourcingNoteText = useMemo(() => {
    return generateSourcingNoteText(searchResult, state.marks);
  }, [searchResult, state.marks]);

  // Sort tradeable routes according to selected sort mode
  const sortedTradeable = useMemo(() => {
    const list = [...searchResult.tradeable];
    
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      return list.filter(r => 
        r.originCountryName.toLowerCase().includes(q) ||
        r.targetMarketName.toLowerCase().includes(q) ||
        r.feedstockName.toLowerCase().includes(q) ||
        r.certificationScheme.toLowerCase().includes(q)
      );
    }

    if (sortMode === 'CONFIDENCE') {
      return list.sort((a, b) => {
        const markA = state.marks.marks[a.targetMarketId];
        const markB = state.marks.marks[b.targetMarketId];
        const relA = a.isModelled ? 0 : (MARK_SOURCE_RELIABILITY[markA?.provenance?.sourceType || 'ESTIMATE'] || 1);
        const relB = b.isModelled ? 0 : (MARK_SOURCE_RELIABILITY[markB?.provenance?.sourceType || 'ESTIMATE'] || 1);
        
        if (relA !== relB) {
          return relB - relA; // Higher reliability first
        }
        const marginA = a.deskNetMarginEurPerMWh ?? (a.totalTerminalValueStackEurPerMWh ?? 0);
        const marginB = b.deskNetMarginEurPerMWh ?? (b.totalTerminalValueStackEurPerMWh ?? 0);
        return marginB - marginA;
      });
    }

    // Default: Sort by Value (desk margin descending)
    return list.sort((a, b) => {
      if (a.isModelled !== b.isModelled) {
        return a.isModelled ? 1 : -1;
      }
      const marginA = a.deskNetMarginEurPerMWh ?? (a.totalTerminalValueStackEurPerMWh ?? 0);
      const marginB = b.deskNetMarginEurPerMWh ?? (b.totalTerminalValueStackEurPerMWh ?? 0);
      return marginB - marginA;
    });
  }, [searchResult.tradeable, sortMode, filterQuery, state.marks.marks]);

  const [mathModalRoute, setMathModalRoute] = useState<ArbitrageOpportunity | null>(null);
  const [traderOfferInput, setTraderOfferInput] = useState<string>('');
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const bestRoute = sortedTradeable[0] ?? null;

  const handleCopyClientQuotationEmail = () => {
    if (!bestRoute) return;
    const clientName = counterparty.trim() || 'Valued Counterparty';
    const netbackVal = bestRoute.totalTerminalValueStackEurPerMWh ?? 0;
    const sourcingVal = bestRoute.producerPayableEurPerMWh ?? (netbackVal - (bestRoute.deskNetMarginEurPerMWh ?? 0));
    const offerPrice = traderOfferInput.trim() && !isNaN(Number(traderOfferInput)) 
      ? Number(traderOfferInput) 
      : netbackVal;
    const volStr = volumeMwh ? `${volumeMwh.toLocaleString()} MWh (${(volumeMwh / 1000).toFixed(1)} GWh)` : '20,000 MWh (20.0 GWh)';
    const vintageStr = vintageSelection ? `Cal / Strip ${vintageSelection}` : (complianceYear ? `Cal ${complianceYear}` : 'Prompt 2026');

    const email = [
      `SUBJECT: Indicative Biomethane Sourcing Quotation — ${clientName} (${vintageStr})`,
      ``,
      `Dear ${clientName} Procurement Team,`,
      ``,
      `Following your European biomethane inquiry, 3Degrees Biomethane Trading Desk is pleased to present the following firm indicative quotation:`,
      ``,
      `COMMERCIAL SPECIFICATIONS:`,
      `• Counterparty: ${clientName}`,
      `• Target Surrender Market: ${bestRoute.targetMarketName} (${bestRoute.targetMarketId})`,
      `• Delivery Window: ${vintageStr}`,
      `• Order Volume: ${volStr}`,
      `• Feedstock: ${bestRoute.feedstockName} (RED III IX-A Classification)`,
      `• Carbon Intensity (CI): ${bestRoute.carbonIntensity} gCO2e/MJ`,
      `• Voluntary Scheme: ${bestRoute.certificationScheme} (Mass Balance / Single UDB Title Transfer)`,
      `• Sourcing Origin: ${bestRoute.originCountryName} Connected Gas Transmission Network`,
      ``,
      `INDICATIVE PRICING & VALUE STACK:`,
      `• Indicative Delivered Offer Price: €${offerPrice.toFixed(2)} / MWh`,
      `• Statutory Compliance Value / Netback Benchmark: €${netbackVal.toFixed(2)} / MWh`,
      `• Total Notional Deal Value: €${Math.round(offerPrice * (volumeMwh || 20000)).toLocaleString()}`,
      ``,
      `REGULATORY & AUDIT VERIFICATION:`,
      `• RED III 6-Gate Statutory Clearance: PASS / ELIGIBLE`,
      `• Union Database (UDB) Batch Title Transfer: FULLY RECORDED & GUARANTEED`,
      `• Double-Counting Eligibility: VERIFIED (2.0x Annex IX-A Statutory Factor)`,
      ``,
      `This indication is valid for today's trading session and subject to mutual KYC, credit approval, and standard EFET / ISDA Master Agreement terms.`,
      ``,
      `Best regards,`,
      `Biomethane Sales Trading Desk | 3Degrees Europe`,
    ].join('\n');

    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  // Open in Trade Builder handler
  const handleOpenInTradeBuilder = (route: ArbitrageOpportunity) => {
    const params = new URLSearchParams();
    params.set('marketId', route.targetMarketId);
    params.set('originCountry', route.originCountry);
    params.set('feedstock', route.feedstockKey);
    params.set('ci', route.carbonIntensity.toString());
    if (clientRequest.volumeMwh !== null) {
      params.set('volume', clientRequest.volumeMwh.toString());
    }
    params.set('scheme', route.certificationScheme);
    params.set('coc', route.chainOfCustody);
    if (clientRequest.counterparty) {
      params.set('counterparty', clientRequest.counterparty);
    }
    navigate(`/trade?${params.toString()}`);
  };

  // Quick Preset Handlers
  const handleApplyPreset = (preset: 'DK_DE' | 'NL_ERE' | 'FI_FR' | 'IT_CIC' | 'ES_DE' | 'PAN_EU') => {
    switch (preset) {
      case 'DK_DE':
        setTargetMarketId('DE_THG');
        setFeedstockKey('manure');
        setScheme('ISCC_EU');
        setChainOfCustody('MASS_BALANCE');
        setVolumeMwh(20000);
        setVolumeInput('20000');
        setMaxCI(0);
        setMaxCIInput('0');
        setComplianceYear(2027);
        setDeliveryType('CALENDAR');
        setStartDate('2027-01-01');
        setEndDate('2027-12-31');
        setPhysicalDeliveryRequired(false);
        break;
      case 'NL_ERE':
        setTargetMarketId('NL_ERE');
        setFeedstockKey('waste');
        setScheme('ISCC_EU');
        setChainOfCustody('MASS_BALANCE');
        setVolumeMwh(15000);
        setVolumeInput('15000');
        setMaxCI(20);
        setMaxCIInput('20');
        setComplianceYear(2026);
        setDeliveryType('MONTH');
        setStartDate('');
        setEndDate('');
        setPhysicalDeliveryRequired(false);
        break;
      case 'FI_FR':
        setTargetMarketId('FR_CPB');
        setFeedstockKey('forest_residue');
        setScheme('REDCERT_EU');
        setChainOfCustody('MASS_BALANCE');
        setVolumeMwh(10000);
        setVolumeInput('10000');
        setMaxCI(null);
        setMaxCIInput('');
        setComplianceYear(2026);
        setDeliveryType('MONTH');
        setStartDate('');
        setEndDate('');
        setPhysicalDeliveryRequired(false);
        break;
      case 'IT_CIC':
        setTargetMarketId('IT_CIC');
        setFeedstockKey('agri_waste');
        setScheme('2BSVS');
        setChainOfCustody('SEGREGATION');
        setVolumeMwh(25000);
        setVolumeInput('25000');
        setMaxCI(null);
        setMaxCIInput('');
        setComplianceYear(2026);
        setDeliveryType('CALENDAR');
        setStartDate('2026-01-01');
        setEndDate('2026-12-31');
        setPhysicalDeliveryRequired(true);
        break;
      case 'ES_DE':
        setTargetMarketId('DE_THG');
        setFeedstockKey('manure');
        setScheme('ISCC_EU');
        setChainOfCustody('MASS_BALANCE');
        setVolumeMwh(20000);
        setVolumeInput('20000');
        setMaxCI(null);
        setMaxCIInput('');
        setComplianceYear(2027);
        setDeliveryType('CALENDAR');
        setStartDate('2027-01-01');
        setEndDate('2027-12-31');
        setPhysicalDeliveryRequired(false);
        break;
      case 'PAN_EU':
        handleApplyPanEuropeanScan();
        break;
    }
  };

  const handleApplyCorporatePreset = (presetKey: 'AMAZON_DE' | 'DHL_NL' | 'BASF_DE' | 'SHELL_MARINE' | 'PAN_EU') => {
    switch (presetKey) {
      case 'AMAZON_DE':
        setCounterparty('Amazon Logistics EU');
        setTargetMarketId('DE_THG');
        setVolumeMwh(25000);
        setVolumeInput('25000');
        setFeedstockKey('manure');
        setMaxCI(0);
        setMaxCIInput('0');
        setComplianceYear(2027);
        setDeliveryType('CALENDAR');
        setChainOfCustody('MASS_BALANCE');
        setNotes('Amazon 2027 German transport decarbonisation quota compliance.');
        break;
      case 'DHL_NL':
        setCounterparty('DHL Express Europe');
        setTargetMarketId('NL_ERE');
        setVolumeMwh(15000);
        setVolumeInput('15000');
        setFeedstockKey('waste');
        setMaxCI(20);
        setMaxCIInput('20');
        setComplianceYear(2026);
        setDeliveryType('CALENDAR');
        setChainOfCustody('MASS_BALANCE');
        setNotes('DHL Dutch HBE / ERE compliance surrender for fleet fueling.');
        break;
      case 'BASF_DE':
        setCounterparty('BASF SE Ludwigshafen');
        setTargetMarketId('AIB_GO');
        setVolumeMwh(20000);
        setVolumeInput('20000');
        setFeedstockKey('manure');
        setMaxCI(-100);
        setMaxCIInput('-100');
        setComplianceYear(2027);
        setDeliveryType('CALENDAR');
        setNotes('BASF deep-negative CI industrial chemical Scope 1 decarbonization.');
        break;
      case 'SHELL_MARINE':
        setCounterparty('Shell Marine Bunkering');
        setTargetMarketId('FUELEU');
        setVolumeMwh(30000);
        setVolumeInput('30000');
        setFeedstockKey('manure');
        setMaxCI(0);
        setMaxCIInput('0');
        setComplianceYear(2026);
        setDeliveryType('CALENDAR');
        setChainOfCustody('SEGREGATION');
        setPhysicalDeliveryRequired(true);
        setNotes('FuelEU Maritime compliance bio-LNG physical bunkering.');
        break;
      case 'PAN_EU':
        handleApplyPanEuropeanScan();
        break;
    }
  };

  const handleApplyGermanThgPreset = () => handleApplyPreset('DK_DE');

  const handleApplyPanEuropeanScan = () => {
    setCounterparty('Pan-EU Sourcing Desk');
    setTargetMarketId('ANY');
    setFeedstockKey('ANY');
    setScheme('ANY');
    setChainOfCustody('MASS_BALANCE');
    setVolumeMwh(10000);
    setVolumeInput('10000');
    setMaxCI(null);
    setMaxCIInput('');
    setPhysicalDeliveryRequired(false);
  };

  if (activeDeskTab === 'BRIEFING') {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-stone-950">
        <MorningBriefingDesk onSwitchToSourcing={() => setActiveDeskTab('SOURCING')} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-stone-950 text-stone-100 font-sans">
      
      {/* 1. CORPORATE CLIENT ORDER INTAKE STRIP */}
      <header className="flex-none p-3.5 px-4 border-b border-stone-800 bg-stone-900 space-y-3">
        {/* Top Order Context & Archetype Switcher */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-100 m-0">
                Client Order Sourcing &amp; Execution Desk
              </h2>
            </div>

            {/* Market Archetype Selector */}
            <div className="flex items-center bg-stone-950 p-0.5 border border-stone-800 rounded-xs font-mono text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setMarketArchetype('COMPLIANCE');
                  if (!['DE_THG', 'NL_ERE', 'FR_CPB', 'FR_TIRUERT', 'IT_CIC', 'UK_RTFO', 'EU_FUELEU', 'EU_ETS1'].includes(targetMarketId)) {
                    setTargetMarketId('DE_THG');
                  }
                }}
                className={`px-2.5 py-0.8 rounded-xs font-bold cursor-pointer transition-colors ${
                  marketArchetype === 'COMPLIANCE'
                    ? 'bg-teal-600 text-teal-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🏛️ Compliance Quotas (THG / ERE / RTFO)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMarketArchetype('CORPORATE_GO');
                  if (['DE_THG', 'NL_ERE', 'FR_CPB', 'FR_TIRUERT', 'IT_CIC', 'UK_RTFO', 'EU_FUELEU', 'EU_ETS1'].includes(targetMarketId)) {
                    setTargetMarketId('AIB_GO');
                  }
                }}
                className={`px-2.5 py-0.8 rounded-xs font-bold cursor-pointer transition-colors ${
                  marketArchetype === 'CORPORATE_GO'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🏢 Corporate GOs (AIB / RGGO / EECS)
              </button>
            </div>
          </div>

          {/* Preset Orders based on Archetype */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider mr-1">
              {marketArchetype === 'COMPLIANCE' ? 'Compliance Presets:' : 'Corporate GO Presets:'}
            </span>
            {marketArchetype === 'COMPLIANCE' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyCorporatePreset('AMAZON_DE')}
                  className={`px-2 py-0.8 font-mono text-xs rounded-xs border cursor-pointer transition-colors ${
                    counterparty.includes('Amazon')
                      ? 'bg-teal-600 text-teal-950 font-bold border-teal-500'
                      : 'bg-stone-950 border-stone-700 text-stone-200 hover:border-teal-500'
                  }`}
                >
                  📦 Amazon DE (25k MWh THG)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCorporatePreset('DHL_NL')}
                  className={`px-2 py-0.8 font-mono text-xs rounded-xs border cursor-pointer transition-colors ${
                    counterparty.includes('DHL')
                      ? 'bg-teal-600 text-teal-950 font-bold border-teal-500'
                      : 'bg-stone-950 border-stone-700 text-stone-200 hover:border-teal-500'
                  }`}
                >
                  🚚 DHL NL (15k MWh ERE)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCorporatePreset('SHELL_MARINE')}
                  className={`px-2 py-0.8 font-mono text-xs rounded-xs border cursor-pointer transition-colors ${
                    counterparty.includes('Shell')
                      ? 'bg-teal-600 text-teal-950 font-bold border-teal-500'
                      : 'bg-stone-950 border-stone-700 text-stone-200 hover:border-teal-500'
                  }`}
                >
                  🚢 Shell Marine (30k MWh FuelEU)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCorporatePreset('PAN_EU')}
                  className="px-2 py-0.8 bg-teal-950 hover:bg-teal-900 border border-teal-800 text-teal-300 font-mono text-xs rounded-xs cursor-pointer transition-colors font-bold"
                >
                  🇪🇺 Pan-EU Scan
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyCorporatePreset('BASF_DE')}
                  className={`px-2 py-0.8 font-mono text-xs rounded-xs border cursor-pointer transition-colors ${
                    counterparty.includes('BASF')
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-stone-950 border-stone-700 text-stone-200 hover:border-amber-500'
                  }`}
                >
                  🏭 BASF DE (20k MWh AIB GO)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCounterparty('Centrica Energy UK');
                    setTargetMarketId('UK_RGGO');
                    setVolumeMwh(15000);
                    setVolumeInput('15000');
                    setFeedstockKey('waste');
                    setMaxCI(null);
                    setMaxCIInput('');
                    setComplianceYear(2026);
                    setDeliveryType('CALENDAR');
                    setNotes('Corporate UK green gas supply inquiry under RGGO.');
                  }}
                  className={`px-2 py-0.8 font-mono text-xs rounded-xs border cursor-pointer transition-colors ${
                    counterparty.includes('Centrica')
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-stone-950 border-stone-700 text-stone-200 hover:border-amber-500'
                  }`}
                >
                  🇬🇧 Centrica (15k MWh UK RGGO)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCounterparty('Ørsted Green Fuels');
                    setTargetMarketId('DK_GO');
                    setVolumeMwh(25000);
                    setVolumeInput('25000');
                    setFeedstockKey('manure');
                    setMaxCI(-100);
                    setMaxCIInput('-100');
                    setComplianceYear(2026);
                    setDeliveryType('CALENDAR');
                    setNotes('Ørsted industrial e-fuels & biomethane GO procurement.');
                  }}
                  className={`px-2 py-0.8 font-mono text-xs rounded-xs border cursor-pointer transition-colors ${
                    counterparty.includes('Ørsted')
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-stone-950 border-stone-700 text-stone-200 hover:border-amber-500'
                  }`}
                >
                  🇩🇰 Ørsted (25k MWh DK GO)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCounterparty('Covestro Chemical AG');
                    setTargetMarketId('DE_GO');
                    setVolumeMwh(10000);
                    setVolumeInput('10000');
                    setFeedstockKey('biowaste');
                    setMaxCI(0);
                    setMaxCIInput('0');
                    setComplianceYear(2027);
                    setDeliveryType('CALENDAR');
                    setNotes('Covestro chemical industrial feedstock under dena GO.');
                  }}
                  className={`px-2 py-0.8 font-mono text-xs rounded-xs border cursor-pointer transition-colors ${
                    counterparty.includes('Covestro')
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-stone-950 border-stone-700 text-stone-200 hover:border-amber-500'
                  }`}
                >
                  🧪 Covestro (10k MWh dena GO)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Order Parameters Bar — 2 Clean Rows */}
        <div className="bg-stone-950 p-2.5 rounded-xs border border-stone-800 font-mono text-xs space-y-2">
          {/* Row 1: Commercial Basics */}
          <div className="grid grid-cols-4 gap-2.5 items-center">
            <div>
              <label className="text-[10px] text-stone-500 uppercase block mb-0.5">Client / Counterparty</label>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="e.g. Shell Energy Europe"
                className="w-full bg-stone-900 border border-stone-700 rounded-xs px-2 py-1 text-xs text-stone-100 font-bold focus:border-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-stone-500 uppercase block mb-0.5">
                {marketArchetype === 'COMPLIANCE' ? 'Compliance Surrender Market' : 'Corporate GO Market'}
              </label>
              <select
                value={targetMarketId}
                onChange={(e) => setTargetMarketId(e.target.value)}
                className={`w-full bg-stone-900 border border-stone-700 rounded-xs px-2 py-1 text-xs font-bold focus:border-teal-500 outline-none ${
                  marketArchetype === 'CORPORATE_GO' ? 'text-amber-300' : 'text-teal-300'
                }`}
              >
                <option value="ANY">✦ Pan-EU Scan (All Markets)</option>
                {marketArchetype === 'COMPLIANCE' ? (
                  <>
                    <option value="DE_THG">🇩🇪 Germany THG Quota (§37a BImSchG)</option>
                    <option value="NL_ERE">🇳🇱 Netherlands ERE (Wet milieubeheer)</option>
                    <option value="FR_CPB">🇫🇷 France CPB (Code de l'énergie)</option>
                    <option value="FR_TIRUERT">🇫🇷 France TIRUERT (Customs)</option>
                    <option value="IT_CIC">🇮🇹 Italy CIC (DM 15 Sept 2022)</option>
                    <option value="UK_RTFO">🇬🇧 UK RTFO (Energy Act 2004)</option>
                    <option value="EU_FUELEU">🚢 FuelEU Maritime (Regulation 2023/1805)</option>
                  </>
                ) : (
                  <>
                    <option value="AIB_GO">🇪🇺 Pan-European AIB EECS GO (Scope 1 Decarb)</option>
                    <option value="UK_RGGO">🇬🇧 UK RGGO (Green Gas Certificate)</option>
                    <option value="DE_GO">🇩🇪 Germany dena Biogasregister GO</option>
                    <option value="NL_GO">🇳🇱 Netherlands VertiCer GO</option>
                    <option value="FR_GO">🇫🇷 France EEX Biomethane GO</option>
                    <option value="DK_GO">🇩🇰 Denmark Energinet Wholesale GO</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-stone-500 uppercase block mb-0.5">Order Volume (MWh)</label>
              <input
                type="text"
                value={volumeInput}
                onChange={(e) => {
                  setVolumeInput(e.target.value);
                  const n = Number(e.target.value.replace(/,/g, '').trim());
                  setVolumeMwh(isNaN(n) || !e.target.value.trim() ? null : n);
                }}
                placeholder="e.g. 25000"
                className="w-full bg-stone-900 border border-stone-700 rounded-xs px-2 py-1 text-xs text-stone-100 font-bold font-num focus:border-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-stone-500 uppercase block mb-0.5">Delivery Window (Vintage)</label>
              <select
                value={vintageSelection}
                onChange={(e) => handleSelectVintage(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-xs px-2 py-1 text-xs text-teal-300 font-semibold focus:border-teal-500 outline-none"
              >
                <optgroup label="Annual Calendars (Cal)">
                  <option value="2024">Cal 2024</option>
                  <option value="2025">Cal 2025 (Prompt)</option>
                  <option value="2026">Cal 2026 (Forward)</option>
                  <option value="2027">Cal 2027 (Long-term)</option>
                  <option value="2027/28">Cal 2027/28 (Two-Year Strip)</option>
                  <option value="2028">Cal 2028</option>
                </optgroup>
                <optgroup label="Half-Year Strips (H1 / H2)">
                  <option value="H224">H2 2024 (H224)</option>
                  <option value="H225">H2 2025 (H225)</option>
                  <option value="H226">H2 2026 (H226)</option>
                  <option value="H127">H1 2027 (H127)</option>
                  <option value="H227">H2 2027 (H227)</option>
                </optgroup>
                <optgroup label="Quarterly Deliveries (Q)">
                  <option value="Q425">Q4 2025 (Q425)</option>
                  <option value="Q426">Q4 2026 (Q426)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Row 2: Physical & Statutory Specification */}
          <div className="grid grid-cols-4 gap-2.5 items-center pt-2 border-t border-stone-850">
            <div>
              <label className="text-[10px] text-stone-500 uppercase block mb-0.5">Feedstock Requirement</label>
              <select
                value={feedstockKey}
                onChange={(e) => setFeedstockKey(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-xs px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
              >
                <option value="ANY">✦ ANY Feedstock</option>
                {Object.values(FEEDSTOCK_REGISTRY).map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.annexClassification.replace('_', ' ')})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-stone-500 uppercase block mb-0.5">Voluntary Scheme</label>
              <select
                value={scheme}
                onChange={(e) => setScheme(e.target.value as CertificationScheme | 'ANY')}
                className="w-full bg-stone-900 border border-stone-700 rounded-xs px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
              >
                <option value="ANY">✦ ANY Scheme</option>
                <option value="ISCC_EU">ISCC EU (RED III)</option>
                <option value="REDCERT_EU">REDCert EU</option>
                <option value="2BSVS">2BSvs (France)</option>
                <option value="KZR_INIG">KZR INiG</option>
                <option value="REDCERT2">REDCert2 (Chemical)</option>
                <option value="ISCC_PLUS">ISCC PLUS (Voluntary)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-stone-500 uppercase block mb-0.5">Chain of Custody</label>
              <select
                value={chainOfCustody}
                onChange={(e) => setChainOfCustody(e.target.value as ChainOfCustody)}
                className="w-full bg-stone-900 border border-stone-700 rounded-xs px-2 py-1 text-xs text-stone-200 focus:border-teal-500 outline-none"
              >
                <option value="MASS_BALANCE">Mass Balance (Grid Area)</option>
                <option value="SEGREGATION">Physical Segregation (Bio-LNG)</option>
                <option value="BOOK_AND_CLAIM">Book &amp; Claim (Registry Only)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-stone-500 uppercase block mb-0.5">Max Carbon Intensity (gCO₂e/MJ)</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={maxCIInput}
                  onChange={(e) => {
                    setMaxCIInput(e.target.value);
                    const n = Number(e.target.value.trim());
                    setMaxCI(isNaN(n) || !e.target.value.trim() ? null : n);
                  }}
                  placeholder="e.g. 0 (leave blank for any)"
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-xs px-2 py-1 text-xs text-emerald-400 font-bold font-num focus:border-teal-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => { setMaxCI(0); setMaxCIInput('0'); }}
                  className="px-1.5 py-0.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-[10px] rounded-xs font-mono cursor-pointer"
                  title="Force CI ≤ 0 (Manure / Negative)"
                >
                  ≤0
                </button>
                <button
                  type="button"
                  onClick={() => { setMaxCI(null); setMaxCIInput(''); }}
                  className="px-1.5 py-0.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-400 text-[10px] rounded-xs font-mono cursor-pointer"
                  title="Any CI"
                >
                  Any
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar bottom line: Search/Solve Button, Filter Search, Layout Toggle, Note Export */}
        <div className="flex items-center justify-between pt-1 font-mono text-xs">
          <div className="flex items-center gap-3">
            {/* Primary Search & Solve Refresh Button */}
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 300);
              }}
              className={`px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-bold rounded-xs cursor-pointer transition-all flex items-center gap-2 shadow-xs ${
                isRefreshing ? 'opacity-75 scale-98' : ''
              }`}
              title="Recalculate and solve optimal sourcing corridors"
            >
              <Search className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Solving Routes…' : 'Search & Solve'}</span>
            </button>

            <span className="text-stone-400">
              Evaluating <strong className="text-stone-100">{searchResult.evaluated}</strong> potential producer sourcing corridors across Europe
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter routes or feedstocks…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-stone-950 border border-stone-700 rounded-xs pl-8 pr-2.5 py-1 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-teal-500 w-48"
              />
            </div>

            {/* View Layout Toggle */}
            <div className="flex border border-stone-700 rounded-xs overflow-hidden font-mono text-micro font-semibold" role="group" aria-label="View Layout">
              <button
                type="button"
                onClick={() => setViewLayout('TABLE')}
                className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewLayout === 'TABLE'
                    ? 'bg-teal-600 text-teal-950 font-bold'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
                title="Table List View"
              >
                <List className="w-3 h-3" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('MATRIX')}
                className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewLayout === 'MATRIX'
                    ? 'bg-teal-600 text-teal-950 font-bold'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
                title="Pan-European Corridor Heatmap Matrix View"
              >
                <Grid className="w-3 h-3" />
                <span>Corridor Matrix</span>
              </button>
            </div>

            {/* Export Sourcing Note Button */}
            <CopyButton
              text={sourcingNoteText}
              label="Copy Term Sheet"
              praWarning={praResult.hasPra}
              praSources={praResult.sources}
              className="bg-teal-700/80 hover:bg-teal-600 text-teal-50 border-teal-600 text-xs font-mono font-semibold"
            />
          </div>
        </div>
      </header>

        {/* Routes Scroll Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          
          {/* LIVE MATCHING BROKER LIQUIDITY PANEL */}
          {liveBrokerMatches.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xs p-3 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                    Live OTC Broker Order Book Matches
                  </span>
                  <span className="text-stone-500">·</span>
                  <span className="text-stone-400 text-micro">
                    {liveBrokerMatches.length} Quotes Matching Current Feedstock / Region
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-stone-400 text-micro font-mono">
                    Cross-referencing live pricing marks from Broker Run
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/marks')}
                    className="font-mono text-micro text-teal-300 hover:text-teal-200 underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <span>Browse Full Order Book</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Broker Match Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
                {liveBrokerMatches.map(order => {
                  const isHighInterest = order.isHighInterest;
                  const currencySymbol = order.currency === 'GBP' ? '£' : '€';
                  const quotePrice = order.offerPrice ?? order.bidPrice;

                  return (
                    <div
                      key={order.id}
                      className={`p-2.5 rounded-xs border transition-all flex flex-col justify-between ${
                        isHighInterest
                          ? 'bg-amber-950/20 border-amber-800/80 hover:border-amber-500'
                          : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-stone-200 text-xs">
                            <span>{order.country === 'UK' ? '🇬🇧' : order.country === 'FR' ? '🇫🇷' : order.country === 'NL' ? '🇳🇱' : order.country === 'DE' ? '🇩🇪' : order.country === 'DK' ? '🇩🇰' : '🇪🇺'}</span>
                            <span>{order.country} {order.class}</span>
                          </div>
                          <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-xs ${
                            order.subsidized === 'Unsubsidised'
                              ? 'bg-amber-950 text-amber-300 border border-amber-850'
                              : 'bg-stone-900 text-stone-400'
                          }`}>
                            {order.subsidized}
                          </span>
                        </div>

                        <div className="text-micro text-stone-300 font-semibold truncate">
                          {order.feedstock} · {order.vintage}
                        </div>

                        <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
                          <span>CI: <strong className={order.ciNumeric !== null && order.ciNumeric < 0 ? 'text-emerald-400' : 'text-stone-300'}>{order.ciScore}</strong></span>
                          <span>Vol: <strong className="text-teal-300">{order.offerVolumeGWh ?? order.bidVolumeGWh ?? '—'} GWh</strong></span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-stone-850 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-stone-500 uppercase font-bold">
                            {order.offerPrice ? 'Broker Offer' : 'Broker Bid'}
                          </div>
                          <div className="text-sm font-bold text-emerald-300 font-num">
                            {quotePrice !== null ? `${currencySymbol}${quotePrice.toFixed(2)}` : (order.bidText || order.offerText || 'Market')}
                            <span className="text-[10px] text-stone-500 font-normal">/MWh</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyBrokerOrder(order)}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-[10px] font-bold rounded-xs cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                          title="Apply this broker quote directly to order ticket"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Apply</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewLayout === 'MATRIX' ? (
            <CorridorMatrix
              tradeableRoutes={searchResult.tradeable}
              blockedRoutes={searchResult.blocked}
              onSelectRoute={(r) => setSelectedRouteForDrawer(r)}
              onSelectCorridor={(orig, mkt) => {
                setTargetMarketId(mkt);
                setViewLayout('TABLE');
              }}
            />
          ) : (
            <>
              {/* 1. FIRM CLIENT QUOTATION & VALUE STACK HERO */}
              {bestRoute && sortedTradeable.length > 0 && (
                <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-teal-800/70 rounded-xs p-4 space-y-3.5 shadow-lg mb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></span>
                      <span className="font-mono text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-teal-400" />
                        Optimal Sourcing Recommendation &amp; Client Quotation
                      </span>
                      <span className="text-stone-500">·</span>
                      <span className="text-stone-200 text-xs font-semibold">
                        {counterparty || 'Client Order'} ({vintageSelection ? `Cal ${vintageSelection}` : 'Prompt'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMathModalRoute(bestRoute)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 rounded-xs font-mono text-xs cursor-pointer transition-colors"
                        title="Inspect complete step-by-step mathematical proof and statutory audit"
                      >
                        <Calculator className="w-3.5 h-3.5 text-teal-400" />
                        <span>Show Math &amp; Proof</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyClientQuotationEmail}
                        className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors shadow-xs"
                        title="Copy formatted quotation email for this client"
                      >
                        {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                        <span>{copiedEmail ? 'Copied Quotation Email!' : 'Copy Client Quote Email'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRouteForDrawer(bestRoute)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors shadow-xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Open Deal Ticket</span>
                      </button>
                    </div>
                  </div>

                  {/* Hero 4-Column Metric Grid */}
                  <div className="grid grid-cols-4 gap-3 font-mono">
                    {/* 1. Optimal Origin & Logistics */}
                    <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xs flex flex-col justify-between">
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider">
                        #1 Optimal Origin
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-2xl">{bestRoute.originFlag}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-stone-100 truncate">
                            {bestRoute.originCountryName}
                          </div>
                          <div className="text-[11px] text-teal-400 truncate font-semibold">
                            {bestRoute.feedstockName}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-2 border-t border-stone-850 pt-1.5 flex justify-between">
                        <span>Grid Transit Tariff:</span>
                        <strong className="text-stone-200">€{bestRoute.transitCostEurPerMWh.toFixed(2)}/MWh</strong>
                      </div>
                    </div>

                    {/* 2. Delivered Market Value / Netback */}
                    <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xs flex flex-col justify-between">
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Delivered Market Value</span>
                        <span className="text-micro text-teal-300 font-bold">{bestRoute.targetMarketId}</span>
                      </div>
                      <div className="mt-1">
                        <div className="text-xl font-bold text-teal-300 font-num">
                          €{bestRoute.totalTerminalValueStackEurPerMWh?.toFixed(2) ?? '—'}
                          <span className="text-xs font-normal text-stone-400">/MWh</span>
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">
                          {bestRoute.targetMarketName}
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-2 border-t border-stone-850 pt-1.5 flex justify-between">
                        <span>CI Savings Factor:</span>
                        <strong className="text-stone-200">{bestRoute.carbonIntensity} gCO₂e/MJ</strong>
                      </div>
                    </div>

                    {/* 3. Producer Sourcing Cost */}
                    <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xs flex flex-col justify-between">
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider">
                        Estimated Sourcing Base
                      </div>
                      <div className="mt-1">
                        <div className="text-xl font-bold text-stone-200 font-num">
                          €{bestRoute.producerPayableEurPerMWh?.toFixed(2) ?? '—'}
                          <span className="text-xs font-normal text-stone-400">/MWh</span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Producer Price + Transit + Certs
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-2 border-t border-stone-850 pt-1.5 flex justify-between">
                        <span>Pricing Model:</span>
                        <strong className="text-stone-200">{state.costs.producerPricing?.mode === 'INDEX_LINKED' ? 'TTF Index-Linked' : 'Market Cost'}</strong>
                      </div>
                    </div>

                    {/* 4. Desk Net Margin & Total P&L */}
                    <div className="bg-stone-950/80 border border-teal-900/60 p-3 rounded-xs flex flex-col justify-between">
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Trading Desk Spread</span>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="mt-1">
                        <div className={`text-xl font-bold font-num ${
                          bestRoute.deskNetMarginEurPerMWh && bestRoute.deskNetMarginEurPerMWh > 0 ? 'text-emerald-400' : 'text-stone-300'
                        }`}>
                          {bestRoute.deskNetMarginEurPerMWh ? `+€${bestRoute.deskNetMarginEurPerMWh.toFixed(2)}` : '—'}
                          <span className="text-xs font-normal text-stone-400">/MWh</span>
                        </div>
                        <div className="text-xs font-bold text-emerald-300 font-num">
                          {bestRoute.totalDealProfitEur ? `€${Math.round(bestRoute.totalDealProfitEur).toLocaleString()}` : (
                            bestRoute.deskNetMarginEurPerMWh && volumeMwh ? `€${Math.round(bestRoute.deskNetMarginEurPerMWh * volumeMwh).toLocaleString()}` : '—'
                          )}
                          <span className="text-[10px] text-stone-400 font-normal"> gross profit</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-2 border-t border-stone-850 pt-1.5 flex justify-between">
                        <span>Total Order Volume:</span>
                        <strong className="text-stone-200">{volumeMwh ? `${volumeMwh.toLocaleString()} MWh` : '20,000 MWh'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. TRADEABLE ROUTES LIST TABLE */}
              <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="m-0 font-mono text-xs font-bold tracking-[0.1em] text-stone-200 uppercase">
                  Tradeable Sourcing Routes ({sortedTradeable.length})
                </h3>
              </div>
              <span className="font-mono text-micro text-stone-500">
                Sorted by {sortMode === 'VALUE' ? 'Desk Margin' : 'Mark Reliability & Confidence'}
              </span>
            </div>

            {sortedTradeable.length === 0 ? (
              <div className="border border-stone-800 bg-stone-900/40 p-8 text-center rounded-xs space-y-3">
                {searchResult.unpriced > 0 ? (
                  <div className="max-w-md mx-auto space-y-2">
                    <p className="text-amber-300/90 font-mono text-xs font-semibold">
                      ⚠ {searchResult.unpriced} routes evaluated are currently UNPRICED
                    </p>
                    <p className="text-stone-400 text-xs leading-relaxed">
                      Per Rule 1, this tool never manufactures placeholder prices. Marks for these markets have not been entered into your local desk state yet.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'SIMULATE_DESK' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Seed Simulated Desk Marks
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/marks')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 font-mono text-xs rounded-xs cursor-pointer transition-colors"
                      >
                        Go to Marks Screen →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-stone-400 font-mono text-xs">
                      No tradeable routes cleared the current regulatory criteria and constraint filters.
                    </p>
                    <button
                      type="button"
                      onClick={handleApplyGermanThgPreset}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-teal-300 font-mono text-xs rounded-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to German THG Manure Benchmark
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-stone-800 bg-stone-900 rounded-xs divide-y divide-stone-800">
                
                {/* Table Header */}
                <div className="grid grid-cols-[1.8fr_1.4fr_1fr_1fr_auto] gap-3 p-2.5 px-3.5 bg-stone-950 font-mono text-micro uppercase tracking-[0.08em] text-stone-400 font-semibold select-none">
                  <div>{marketArchetype === 'COMPLIANCE' ? 'Origin → Compliance Market' : 'Origin → Corporate GO Market'}</div>
                  <div>Feedstock &amp; GHG Intensity</div>
                  <div className="text-right">Delivered Netback</div>
                  <div className="text-right">Desk Margin</div>
                  <div className="text-right pr-2">Action</div>
                </div>

                {/* Table Rows */}
                {sortedTradeable.map((route) => {
                  const isExpanded = expandedRouteId === route.id;
                  const vTone = getVerdictTone(route.overallVerdict);
                  const netback = route.totalTerminalValueStackEurPerMWh;
                  const deskMarginVal = route.deskNetMarginEurPerMWh;

                  return (
                    <div key={route.id} className="transition-colors hover:bg-stone-850/50">
                      
                      {/* Main Summary Row */}
                      <div
                        onClick={() => setSelectedRouteForDrawer(route)}
                        className="grid grid-cols-[1.8fr_1.4fr_1fr_1fr_auto] gap-3 p-3 px-3.5 items-center cursor-pointer select-none"
                      >
                        {/* Origin -> Market */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0">{route.originFlag}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-stone-100 truncate flex items-center gap-1.5">
                              <span>{route.originCountryName}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                              <span className="text-teal-300">{route.targetMarketId}</span>
                            </div>
                            <div className="font-mono text-micro text-stone-400 mt-0.5 truncate">
                              {route.targetMarketName} · Transit: €{route.transitCostEurPerMWh.toFixed(2)}/MWh
                            </div>
                          </div>
                        </div>

                        {/* Feedstock & CI */}
                        <div className="min-w-0">
                          <div className="text-xs text-stone-200 truncate font-medium">
                            {route.feedstockName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono text-micro">
                            <span className={`px-1.5 py-0.2 rounded-2xs font-semibold ${
                              route.carbonIntensity <= 0
                                ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800'
                                : 'text-stone-400 bg-stone-900 border border-stone-800'
                            }`}>
                              {route.carbonIntensity > 0 ? `+${route.carbonIntensity}` : route.carbonIntensity} gCO₂e/MJ
                            </span>
                            <span className="text-stone-500">·</span>
                            <span className="text-stone-400 truncate">{route.certificationScheme.replace('_', ' ')}</span>
                          </div>
                        </div>

                        {/* Netback €/MWh */}
                        <div className="text-right font-mono">
                          <div className={`text-sm font-bold ${vTone.text} font-num`}>
                            {netback !== null ? `€${netback.toFixed(2)}` : '—'}
                          </div>
                          <div className="text-micro text-stone-500">Delivered / MWh</div>
                        </div>

                        {/* Desk Margin €/MWh */}
                        <div className="text-right font-mono">
                          <div className="text-sm font-bold text-emerald-400 font-num">
                            {deskMarginVal !== null ? `+€${deskMarginVal.toFixed(2)}` : 'Unset'}
                          </div>
                          <div className="text-micro text-stone-500">Desk Spread</div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRouteForDrawer(route);
                            }}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Quote</span>
                          </button>
                        </div>

                      </div>

                      {/* ========================================================================= */}
                      {/* EXPANDED ROW DETAIL: 6-GATE AUDIT TRAIL + PROMINENT toConfirm CHECKLIST   */}
                      {/* ========================================================================= */}
                      {isExpanded && (
                        <div className="p-4 border-t border-stone-800 bg-stone-950 space-y-4">
                          
                          {/* Top Action Bar */}
                          <div className="flex items-center justify-between gap-3 pb-2 border-b border-stone-800">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-stone-400 font-mono">
                                ROUTE ID: <strong className="text-stone-200">{route.id}</strong>
                              </span>
                              <span className="text-stone-600">·</span>
                              <span className="text-xs text-stone-400 font-mono">
                                Custody: <strong className="text-stone-200">{route.chainOfCustody}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenInTradeBuilder(route)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open in Trade Builder →
                              </button>
                            </div>
                          </div>

                          {/* 2-Column Grid: Left = Regulatory 6-Gate Trail, Right = TO CONFIRM Checklist */}
                          <div className="grid grid-cols-2 gap-4">
                            
                            {/* Left Column: 6-Gate Audit Trail with Citations */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <ShieldCheck className="w-4 h-4 text-teal-400" />
                                <h4 className="m-0 font-mono text-xs font-bold uppercase tracking-[0.1em] text-stone-200">
                                  Regulatory Feasibility (6-Gate Audit Trail)
                                </h4>
                              </div>

                              <div className="space-y-1.5">
                                {route.eligibility.gates.map((gate, gi) => {
                                  const gTone = getVerdictTone(gate.verdict);
                                  const cite = gate.citations?.[0]?.shortName || gate.gateLabel;

                                  return (
                                    <div key={gi} className="p-2.5 bg-stone-900 border border-stone-800 rounded-xs flex flex-col">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className={`w-2 h-2 rounded-full shrink-0 ${gTone.dot}`} />
                                          <span className="font-mono text-xs font-semibold text-stone-200 truncate">
                                            {gate.gateLabel}
                                          </span>
                                        </div>
                                        <span className={`font-mono text-micro font-bold px-1.5 py-0.2 border rounded-xs ${gTone.badge}`}>
                                          {gate.verdict}
                                        </span>
                                      </div>
                                      
                                      <p className="text-xs text-stone-400 mt-1 leading-relaxed pl-4">
                                        {gate.reason}
                                      </p>
                                      
                                      <div className="font-mono text-micro text-teal-300 mt-1 pl-4 flex items-center gap-1">
                                        <span>Citation:</span>
                                        <span className="underline">{cite}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Right Column: TO CONFIRM Checklist (Commercial Availability Block) */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <h4 className="m-0 font-mono text-xs font-bold uppercase tracking-[0.1em] text-amber-300">
                                  Commercial Availability — To Confirm Before Quoting
                                </h4>
                              </div>

                              {/* Prominent toConfirm Container */}
                              <div className="p-3.5 bg-amber-950/20 border border-amber-800/60 rounded-xs space-y-3">
                                <div className="text-xs text-amber-200/90 leading-relaxed font-sans">
                                  This route is <strong>statutorily compliant</strong> under RED III and member state transpositions. However, commercial execution requires verifying physical supply and pricing parameters:
                                </div>

                                <ul className="space-y-2 pl-0 list-none m-0">
                                  {route.toConfirm.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-stone-200 font-mono">
                                      <span className="text-amber-400 shrink-0 font-bold">↳</span>
                                      <span className="leading-snug">{item}</span>
                                    </li>
                                  ))}
                                </ul>

                                <div className="pt-2 border-t border-amber-800/40 font-mono text-micro text-stone-400 flex items-center gap-1.5">
                                  <Info className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                  <span>Regulatory feasibility ≠ commercial availability. Verify all items before signing term sheets.</span>
                                </div>
                              </div>

                              {/* Rationale & Risks */}
                              {route.keyRiskOrTrap && (
                                <div className="p-2.5 bg-red-950/30 border border-red-800/50 rounded-xs">
                                  <div className="font-mono text-micro text-red-400 font-bold uppercase">
                                    Identified Statutory Trap / Risk
                                  </div>
                                  <div className="text-xs text-stone-300 mt-0.5">
                                    {route.keyRiskOrTrap}
                                  </div>
                                </div>
                              )}

                            </div>

                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}

              </div>
            )}
          </div>

          {/* 2. BLOCKED ROUTES SECTION (ORIGINATION WORK QUEUE) */}
          {searchResult.blocked.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <h3 className="m-0 font-mono text-xs font-bold tracking-[0.1em] text-red-300 uppercase">
                    Blocked Routes ({searchResult.blocked.length}) — Origination Work Queue
                  </h3>
                </div>
                <span className="font-mono text-micro text-stone-500">
                  Potential trades blocked by regulatory gating or registry constraints
                </span>
              </div>

              <div className="border border-stone-800 bg-stone-900/60 rounded-xs divide-y divide-stone-800">
                {searchResult.blocked.map((route) => {
                  const blockingGate = route.eligibility.gates.find(g => g.verdict === 'HARD_BLOCK');
                  const gateLabel = blockingGate?.gateLabel || route.eligibility.blockingGate || 'Regulatory Gating';
                  const remedy = blockingGate?.remedy || route.eligibility.summary;
                  const forgoneNetback = route.totalTerminalValueStackEurPerMWh;

                  return (
                    <div key={route.id} className="p-3 flex items-center justify-between gap-4 hover:bg-stone-850/40">
                      
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base shrink-0">{route.originFlag}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                            <span>{route.originCountryName}</span>
                            <ArrowRight className="w-3 h-3 text-stone-500 shrink-0" />
                            <span>{route.targetMarketName}</span>
                            <span className="text-stone-500 font-normal">({route.feedstockName})</span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1 font-mono text-micro text-stone-400">
                            <span className="text-red-400 font-semibold">Blocked at: {gateLabel}</span>
                            <span className="text-stone-600">·</span>
                            <span className="text-stone-300">Remedy: {remedy}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 font-mono">
                        <div className="text-right">
                          <div className="text-xs font-semibold text-stone-300">
                            {forgoneNetback !== null ? `€${forgoneNetback.toFixed(2)}/MWh` : '—'}
                          </div>
                          <div className="text-micro text-stone-500">Forgone Netback</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenInTradeBuilder(route)}
                          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-stone-100 text-micro font-mono rounded-xs cursor-pointer transition-colors"
                        >
                          Audit in Trade Builder →
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      </div>

      {/* Quick Deal Slide-over Drawer */}
      <QuickDealDrawer
        route={selectedRouteForDrawer}
        request={clientRequest}
        marks={state.marks}
        costs={state.costs}
        onClose={() => setSelectedRouteForDrawer(null)}
      />

      {/* Step-by-Step Math Formula Modal */}
      {mathModalRoute && (
        <MathFormulaModal
          isOpen={Boolean(mathModalRoute)}
          onClose={() => setMathModalRoute(null)}
          opportunity={mathModalRoute}
          volumeMwh={volumeMwh ?? 20000}
          marks={state.marks}
          costs={state.costs}
        />
      )}

    </div>
  );
}
