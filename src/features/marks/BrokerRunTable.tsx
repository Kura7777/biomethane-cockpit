import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BASELINE_BROKER_RUNS, 
  BrokerOrderEntry, 
  BrokerCountry, 
  SubsidyStatus,
  CertificateClass,
  FeedstockLabel,
  CertificationLabel
} from '../../domain/markets/brokerRuns';
import { MarksState, CostInputs } from '../../domain/netback/types';
import { CertificationScheme } from '../../domain/consignment/types';
import { ArbitrageOpportunity, ClientRequest } from '../../domain/arbitrage/types';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { QuickDealDrawer } from '../sourcing/QuickDealDrawer';
import { MathFormulaModal } from '../../shared/components/MathFormulaModal';
import { 
  Search, 
  Zap, 
  Calculator, 
  Sparkles, 
  Info,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Trash2,
  Edit3,
  Check,
  ExternalLink
} from 'lucide-react';

interface BrokerRunTableProps {
  marks: MarksState;
  costs: CostInputs;
}

const STORAGE_KEY = 'biomethane_broker_orders_v1';

const FEEDSTOCK_OPTIONS: FeedstockLabel[] = [
  'Manure + Physical Gas',
  'Manure',
  'Manure/Waste',
  'Waste',
  'Waste/Crop mix (A9a)',
  'Waste/Crop',
  'Crop',
  'Mix'
];

const CERT_OPTIONS: CertificationLabel[] = [
  'Certified (ISCC)',
  'Certified (A9A)',
  'Certified (ETS)',
  'Certified (Non-ETS)',
  'Certified',
  'Uncertified'
];

const VINTAGE_OPTIONS = [
  '2024',
  'H224',
  '2025',
  'H225',
  'Q425',
  '2026',
  'H226',
  'Q426',
  '2027',
  'H127',
  'H227',
  '2027/28',
  '2028'
];

export function BrokerRunTable({ marks, costs }: BrokerRunTableProps) {
  // Load editable orders from localStorage or default baseline
  const [orders, setOrders] = useState<BrokerOrderEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    return BASELINE_BROKER_RUNS;
  });

  // Save to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      // ignore
    }
  }, [orders]);

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<BrokerCountry | 'ALL'>('ALL');
  const [selectedSubsidy, setSelectedSubsidy] = useState<SubsidyStatus | 'ALL'>('ALL');
  const [priceDisplayMode, setPriceDisplayMode] = useState<'CERT_ONLY' | 'ALL_IN_DELIVERED'>('CERT_ONLY');
  const [highlightHighInterestOnly, setHighlightHighInterestOnly] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  
  // Deal drawer & math modal states
  const [selectedDealRoute, setSelectedDealRoute] = useState<ArbitrageOpportunity | null>(null);
  const [dealRequest, setDealRequest] = useState<ClientRequest | null>(null);
  const [selectedMathOrder, setSelectedMathOrder] = useState<BrokerOrderEntry | null>(null);

  // Active gas index price for All-In calculation
  const ttfGasMid = marks.gasIndex.mid;
  const gbpRate = marks.fx.gbpEur;

  const handleOpenInTradeDesk = (order: BrokerOrderEntry) => {
    const targetMarketId = 
      order.country === 'DE' ? (order.subsidized === 'Unsubsidised' ? 'DE_THG' : 'DE_GO') :
      order.country === 'NL' ? (order.subsidized === 'Unsubsidised' ? 'NL_ERE' : 'NL_GO') :
      order.country === 'FR' ? (order.subsidized === 'Unsubsidised' ? 'FR_CPB' : 'FR_GO') :
      order.country === 'UK' ? (order.class === 'RGGO' ? 'UK_RGGO' : 'UK_RTFO') :
      order.country === 'DK' ? 'DK_GO' :
      order.country === 'AIB' ? 'AIB_GO' : 'DE_THG';

    const feedstockKey = 
      order.feedstock.toLowerCase().includes('manure') ? 'manure' :
      order.feedstock.toLowerCase().includes('waste/crop') ? 'agri_waste' :
      order.feedstock.toLowerCase().includes('waste') ? 'biowaste' :
      order.feedstock.toLowerCase().includes('crop') ? 'crop' :
      order.feedstock.toLowerCase().includes('mix') ? 'agri_waste' : 'manure';

    const vintageMatch = order.vintage.match(/\d{2,4}/);
    let compYear = 2026;
    if (vintageMatch) {
      const yr = Number(vintageMatch[0]);
      compYear = yr < 100 ? 2000 + yr : yr;
    }

    const scheme: CertificationScheme = 
      order.certified.toLowerCase().includes('iscc') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('a9a') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('ets') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('uncertified') ? 'ISCC_PLUS' : 'ISCC_EU';

    const orderVolGWh = order.offerVolumeGWh != null ? order.offerVolumeGWh : (order.bidVolumeGWh != null ? order.bidVolumeGWh : 10);
    const volumeMwh = orderVolGWh * 1000;
    const quotePrice = order.offerPrice ?? order.bidPrice;

    const params = new URLSearchParams();
    params.set('marketId', targetMarketId);
    params.set('originCountry', order.country === 'AIB' ? 'EU' : order.country);
    params.set('feedstock', feedstockKey);
    params.set('volume', volumeMwh.toString());
    params.set('scheme', scheme);
    params.set('year', compYear.toString());
    params.set('vintage', order.vintage);
    params.set('subsidized', order.subsidized);
    if (order.ciNumeric !== null) {
      params.set('ci', order.ciNumeric.toString());
    }
    if (quotePrice !== null) {
      params.set('brokerPrice', quotePrice.toString());
      params.set('currency', order.currency);
    }
    params.set('counterparty', `OTC Broker (${order.country} ${order.class})`);
    params.set('autoOpen', 'true');

    navigate(`/trade?${params.toString()}`);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Country Filter
      if (selectedCountry !== 'ALL' && order.country !== selectedCountry) {
        return false;
      }
      // Subsidy Filter
      if (selectedSubsidy !== 'ALL' && order.subsidized !== selectedSubsidy) {
        return false;
      }
      // High Interest toggle
      if (highlightHighInterestOnly && !order.isHighInterest) {
        return false;
      }
      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          order.country.toLowerCase().includes(q) ||
          order.class.toLowerCase().includes(q) ||
          order.feedstock.toLowerCase().includes(q) ||
          order.vintage.toLowerCase().includes(q) ||
          order.certified.toLowerCase().includes(q) ||
          order.subsidized.toLowerCase().includes(q) ||
          order.ciScore.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, selectedCountry, selectedSubsidy, highlightHighInterestOnly, searchQuery]);

  // Statistics
  const highInterestCount = useMemo(() => orders.filter(o => o.isHighInterest).length, [orders]);
  const totalBidGWh = useMemo(() => orders.reduce((acc, o) => acc + (o.bidVolumeGWh ?? 0), 0), [orders]);
  const totalOfferGWh = useMemo(() => orders.reduce((acc, o) => acc + (o.offerVolumeGWh ?? 0), 0), [orders]);

  // Update order item field
  const handleUpdateField = <K extends keyof BrokerOrderEntry>(id: string, field: K, val: BrokerOrderEntry[K]) => {
    setOrders(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };

      // Auto update currency based on country
      if (field === 'country') {
        updated.currency = val === 'UK' ? 'GBP' : 'EUR';
        updated.class = val === 'UK' ? 'RGGO' : 'GO';
      }

      // Auto compute ciNumeric if ciScore edited
      if (field === 'ciScore' && typeof val === 'string') {
        const match = val.match(/-?\d+/);
        if (match) {
          updated.ciNumeric = Number(match[0]);
        }
      }

      return updated;
    }));
  };

  // Add new blank quote row
  const handleAddNewRow = () => {
    const newEntry: BrokerOrderEntry = {
      id: `custom-quote-${Date.now()}`,
      country: selectedCountry !== 'ALL' ? selectedCountry : 'DE',
      class: selectedCountry === 'UK' ? 'RGGO' : 'GO',
      feedstock: 'Manure',
      vintage: '2026',
      certified: 'Certified',
      subsidized: 'Unsubsidised',
      ciScore: '<-100gCO2/MJ',
      ciNumeric: -100,
      currency: selectedCountry === 'UK' ? 'GBP' : 'EUR',
      bidPrice: 140.00,
      offerPrice: 148.00,
      bidVolumeGWh: 10,
      offerVolumeGWh: 10,
      isHighInterest: true,
    };
    setOrders(prev => [newEntry, ...prev]);
    setEditingRowId(newEntry.id);
  };

  // Reset to Baseline
  const handleResetBaseline = () => {
    if (window.confirm('Reset order book back to official baseline quotes?')) {
      setOrders(BASELINE_BROKER_RUNS);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Delete quote row
  const handleDeleteRow = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  // Handle opening deal ticket from a broker quote
  const handleQuoteDeal = (order: BrokerOrderEntry) => {
    const targetMarketId = 
      order.country === 'DE' ? (order.subsidized === 'Unsubsidised' ? 'DE_THG' : 'DE_GO') :
      order.country === 'NL' ? (order.subsidized === 'Unsubsidised' ? 'NL_ERE' : 'NL_GO') :
      order.country === 'FR' ? (order.subsidized === 'Unsubsidised' ? 'FR_CPB' : 'FR_GO') :
      order.country === 'UK' ? (order.class === 'RGGO' ? 'UK_RGGO' : 'UK_RTFO') :
      order.country === 'DK' ? 'DK_GO' :
      order.country === 'AIB' ? 'AIB_GO' : 'DE_THG';

    const feedstockKey = 
      order.feedstock.toLowerCase().includes('manure') ? 'manure' :
      order.feedstock.toLowerCase().includes('waste/crop') ? 'agri_waste' :
      order.feedstock.toLowerCase().includes('waste') ? 'biowaste' :
      order.feedstock.toLowerCase().includes('crop') ? 'crop' :
      order.feedstock.toLowerCase().includes('mix') ? 'agri_waste' : 'manure';

    const vintageMatch = order.vintage.match(/\d{2,4}/);
    let compYear = 2026;
    if (vintageMatch) {
      const yr = Number(vintageMatch[0]);
      compYear = yr < 100 ? 2000 + yr : yr;
    }

    const scheme: CertificationScheme = 
      order.certified.toLowerCase().includes('iscc') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('a9a') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('ets') ? 'ISCC_EU' :
      order.certified.toLowerCase().includes('uncertified') ? 'ISCC_PLUS' : 'ISCC_EU';

    const orderVolGWh = order.offerVolumeGWh != null ? order.offerVolumeGWh : order.bidVolumeGWh;
    const volumeMwh = orderVolGWh != null ? orderVolGWh * 1000 : null;

    const req: ClientRequest = {
      targetMarketId,
      volumeMwh,
      delivery: {
        type: 'CALENDAR',
        complianceYear: compYear,
        startDate: `${compYear}-01-01`,
        endDate: `${compYear}-12-31`,
      },
      feedstockKey,
      scheme,
      chainOfCustody: 'MASS_BALANCE',
      constraints: {
        maxDeliveredCostEurMwh: null,
        maxCarbonIntensity: order.ciNumeric,
        physicalDeliveryRequired: false,
      },
      counterparty: 'European OTC Broker Desk',
      notes: `OTC Broker Order Reference: ${order.country} ${order.feedstock} ${order.vintage} (${order.subsidized}).`,
    };

    const res = searchSourcingRoutes(req, marks, costs, DEFAULT_WHAT_IF_SCENARIO);
    const match = res.tradeable.find(r => r.originCountry === order.country) ||
                  res.tradeable[0] ||
                  res.blocked[0] ||
                  null;

    setDealRequest(req);
    setSelectedDealRoute(match);
  };

  const getCountryFlag = (c: BrokerCountry) => {
    switch (c) {
      case 'UK': return '🇬🇧';
      case 'FR': return '🇫🇷';
      case 'NL': return '🇳🇱';
      case 'DE': return '🇩🇪';
      case 'DK': return '🇩🇰';
      case 'AIB': return '🇪🇺';
      default: return '🌐';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-stone-950 font-sans">
      
      {/* Top Banner / Metrics */}
      <div className="p-3 px-4 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between flex-none gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xs bg-amber-950 border border-amber-800/80 text-amber-400 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold font-mono tracking-wider text-stone-100 uppercase">
                European Biomethane OTC Broker Run &amp; Order Book
              </h2>
              <span className="px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs bg-amber-950 border border-amber-800 text-amber-300">
                EDITABLE ORDER BOOK
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-mono mt-0.5">
              Live Interactive Bids, Offers &amp; Volumes across UK RGGOs and European GOs
            </p>
          </div>
        </div>

        {/* Quick Metrics & Actions */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xs flex flex-col">
            <span className="text-[10px] text-stone-500 uppercase">Quotes</span>
            <span className="font-bold text-stone-200 font-num">{orders.length} Rows</span>
          </div>

          <div className="bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xs flex flex-col">
            <span className="text-[10px] text-stone-500 uppercase">Order Depth</span>
            <span className="font-bold text-teal-300 font-num">
              {totalBidGWh} GWh Bid · {totalOfferGWh} GWh Offer
            </span>
          </div>

          <div className="bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xs flex flex-col">
            <span className="text-[10px] text-stone-500 uppercase">TTF Gas Index</span>
            <span className="font-bold text-emerald-300 font-num">
              {ttfGasMid !== null ? `€${ttfGasMid.toFixed(2)} / MWh` : '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddNewRow}
            className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-teal-950 font-bold rounded-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Quote</span>
          </button>

          <button
            type="button"
            onClick={handleResetBaseline}
            className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 rounded-xs cursor-pointer transition-colors"
            title="Reset to default baseline broker sheet"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-2.5 px-4 border-b border-stone-800 bg-stone-900 flex flex-wrap items-center justify-between gap-3 flex-none">
        
        {/* Left: Search & Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Filter country, feedstock, CI…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-800 text-stone-200 font-mono text-xs pl-8 pr-2.5 py-1 rounded-xs outline-none focus:border-teal-500 w-[220px]"
            />
          </div>

          {/* Country Filter Pills */}
          <div className="flex items-center gap-1 font-mono text-[11px] border-l border-stone-800 pl-2">
            {(['ALL', 'UK', 'FR', 'NL', 'DE', 'DK', 'AIB'] as const).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCountry(c)}
                className={`px-2 py-1 rounded-xs font-semibold cursor-pointer transition-colors ${
                  selectedCountry === c
                    ? 'bg-teal-600 text-teal-950 font-bold'
                    : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {c === 'ALL' ? 'ALL' : `${getCountryFlag(c)} ${c}`}
              </button>
            ))}
          </div>

          {/* Subsidy Filter */}
          <div className="flex items-center gap-1 font-mono text-[11px] border-l border-stone-800 pl-2">
            {(['ALL', 'Unsubsidised', 'Subsidised'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSubsidy(s)}
                className={`px-2 py-1 rounded-xs font-semibold cursor-pointer transition-colors ${
                  selectedSubsidy === s
                    ? 'bg-stone-100 text-stone-950 font-bold'
                    : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* High Interest Highlight Toggle */}
          <button
            type="button"
            onClick={() => setHighlightHighInterestOnly(prev => !prev)}
            className={`px-2.5 py-1 font-mono text-[11px] font-semibold rounded-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
              highlightHighInterestOnly
                ? 'bg-amber-950 border border-amber-500 text-amber-300 font-bold'
                : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>High-Interest ({highInterestCount})</span>
          </button>
        </div>

        {/* Right: Pricing Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-950 p-0.5 border border-stone-800 rounded-xs font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setPriceDisplayMode('CERT_ONLY')}
              className={`px-2.5 py-1 rounded-xs font-semibold cursor-pointer transition-colors ${
                priceDisplayMode === 'CERT_ONLY'
                  ? 'bg-teal-600 text-teal-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              🏷️ Green Cert Only
            </button>
            <button
              type="button"
              onClick={() => setPriceDisplayMode('ALL_IN_DELIVERED')}
              className={`px-2.5 py-1 rounded-xs font-semibold cursor-pointer transition-colors ${
                priceDisplayMode === 'ALL_IN_DELIVERED'
                  ? 'bg-teal-600 text-teal-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              ⛽ Delivered (TTF + Cert)
            </button>
          </div>
        </div>

      </div>

      {/* Main Order Book Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead className="sticky top-0 z-10 bg-stone-900 border-b border-stone-800 font-mono text-[11px] uppercase tracking-wider text-stone-400">
            <tr>
              <th className="py-2.5 px-2.5 w-[75px]">Country</th>
              <th className="py-2.5 px-2 w-[65px]">Class</th>
              <th className="py-2.5 px-2.5 w-[160px]">Feedstock</th>
              <th className="py-2.5 px-2 w-[80px]">Vintage</th>
              <th className="py-2.5 px-2.5 w-[130px]">Certified</th>
              <th className="py-2.5 px-2.5 w-[110px]">Subsidized</th>
              <th className="py-2.5 px-2.5 w-[95px]">CI Score</th>
              <th className="py-2.5 px-2.5 w-[125px] text-right">BID Price</th>
              <th className="py-2.5 px-2.5 w-[125px] text-right">OFFER Price</th>
              <th className="py-2.5 px-2.5 w-[90px] text-right">BID Vol</th>
              <th className="py-2.5 px-2.5 w-[90px] text-right">OFFER Vol</th>
              <th className="py-2.5 px-2.5 w-[95px] text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-850">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-stone-500 font-mono">
                  No broker quotes match the selected filters.
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const isHighlight = order.isHighInterest;
                const currencySymbol = order.currency === 'GBP' ? '£' : '€';

                // Compute display values for All-In Delivered mode
                let displayBid = order.bidPrice;
                let displayOffer = order.offerPrice;
                if (priceDisplayMode === 'ALL_IN_DELIVERED' && ttfGasMid !== null) {
                  const gasInCurr = order.currency === 'GBP' ? (gbpRate !== null ? ttfGasMid / gbpRate : 0) : ttfGasMid;
                  if (displayBid !== null) displayBid = displayBid + gasInCurr;
                  if (displayOffer !== null) displayOffer = displayOffer + gasInCurr;
                }

                return (
                  <tr 
                    key={order.id}
                    className={`transition-colors hover:bg-stone-850/80 group ${
                      isHighlight ? 'bg-amber-950/20 border-l-2 border-l-amber-400' : 'bg-stone-950'
                    }`}
                  >
                    {/* Country Selector */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <select
                        value={order.country}
                        onChange={e => handleUpdateField(order.id, 'country', e.target.value as BrokerCountry)}
                        className="bg-stone-900 border border-stone-800 text-stone-100 font-mono text-[11px] font-bold py-0.5 px-1 rounded-xs outline-none focus:border-teal-500 cursor-pointer"
                      >
                        <option value="UK">🇬🇧 UK</option>
                        <option value="FR">🇫🇷 FR</option>
                        <option value="NL">🇳🇱 NL</option>
                        <option value="DE">🇩🇪 DE</option>
                        <option value="DK">🇩🇰 DK</option>
                        <option value="AIB">🇪🇺 AIB</option>
                      </select>
                    </td>

                    {/* Class */}
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-xs ${
                        order.class === 'RGGO'
                          ? 'bg-indigo-950 border border-indigo-800 text-indigo-300'
                          : 'bg-teal-950 border border-teal-800 text-teal-300'
                      }`}>
                        {order.class}
                      </span>
                    </td>

                    {/* Feedstock Dropdown */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <select
                        value={order.feedstock}
                        onChange={e => handleUpdateField(order.id, 'feedstock', e.target.value as FeedstockLabel)}
                        className="bg-stone-900 border border-stone-800 text-stone-200 font-sans text-xs py-0.5 px-1.5 rounded-xs outline-none focus:border-teal-500 w-full cursor-pointer truncate"
                      >
                        {FEEDSTOCK_OPTIONS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>

                    {/* Vintage Dropdown */}
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <select
                        value={order.vintage}
                        onChange={e => handleUpdateField(order.id, 'vintage', e.target.value)}
                        className="bg-stone-900 border border-stone-800 text-stone-200 font-mono text-[11px] font-semibold py-0.5 px-1 rounded-xs outline-none focus:border-teal-500 cursor-pointer"
                      >
                        {VINTAGE_OPTIONS.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </td>

                    {/* Certified Dropdown */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <select
                        value={order.certified}
                        onChange={e => handleUpdateField(order.id, 'certified', e.target.value as CertificationLabel)}
                        className={`font-mono text-[10px] py-0.5 px-1 rounded-xs outline-none focus:border-teal-500 cursor-pointer w-full truncate border ${
                          order.certified.includes('Uncertified')
                            ? 'bg-stone-900 border-stone-800 text-stone-500'
                            : 'bg-emerald-950/70 border-emerald-800 text-emerald-300 font-semibold'
                        }`}
                      >
                        {CERT_OPTIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>

                    {/* Subsidized Dropdown */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <select
                        value={order.subsidized}
                        onChange={e => handleUpdateField(order.id, 'subsidized', e.target.value as SubsidyStatus)}
                        className={`font-mono text-[10px] py-0.5 px-1 rounded-xs outline-none focus:border-teal-500 cursor-pointer border ${
                          order.subsidized === 'Unsubsidised'
                            ? 'bg-amber-950/80 border-amber-700 text-amber-300 font-bold'
                            : 'bg-stone-900 border-stone-800 text-stone-400'
                        }`}
                      >
                        <option value="Unsubsidised">Unsubsidised</option>
                        <option value="Subsidised">Subsidised</option>
                      </select>
                    </td>

                    {/* CI Score Input */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <input
                        type="text"
                        value={order.ciScore}
                        onChange={e => handleUpdateField(order.id, 'ciScore', e.target.value)}
                        placeholder="CI Score"
                        className={`font-mono text-[11px] py-0.5 px-1.5 rounded-xs outline-none focus:border-teal-500 w-[85px] border ${
                          order.ciNumeric !== null && order.ciNumeric < 0
                            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 font-bold'
                            : 'bg-stone-900 border-stone-800 text-stone-200'
                        }`}
                      />
                    </td>

                    {/* BID Price Input & Toggle */}
                    <td className="py-1.5 px-2.5 text-right whitespace-nowrap font-mono">
                      {order.bidText ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="px-1.5 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold rounded-xs">
                            {order.bidText}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateField(order.id, 'bidText', null);
                              handleUpdateField(order.id, 'bidPrice', 25.00);
                            }}
                            className="text-[10px] text-stone-500 hover:text-stone-300 underline cursor-pointer"
                            title="Switch to numeric price"
                          >
                            €
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-stone-500 text-[10px]">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.1"
                            value={order.bidPrice ?? ''}
                            onChange={e => handleUpdateField(order.id, 'bidPrice', e.target.value === '' ? null : Number(e.target.value))}
                            placeholder="Bid"
                            className="bg-stone-900 border border-stone-800 text-emerald-300 font-bold text-xs py-0.5 px-1.5 rounded-xs outline-none focus:border-emerald-500 w-[68px] text-right"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateField(order.id, 'bidPrice', null);
                              handleUpdateField(order.id, 'bidText', 'Buyer');
                            }}
                            className="text-[10px] text-stone-600 hover:text-stone-400 cursor-pointer"
                            title="Tag as Buyer interest"
                          >
                            B
                          </button>
                        </div>
                      )}
                    </td>

                    {/* OFFER Price Input & Toggle */}
                    <td className="py-1.5 px-2.5 text-right whitespace-nowrap font-mono">
                      {order.offerText ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="px-1.5 py-0.5 bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold rounded-xs">
                            {order.offerText}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateField(order.id, 'offerText', null);
                              handleUpdateField(order.id, 'offerPrice', 30.00);
                            }}
                            className="text-[10px] text-stone-500 hover:text-stone-300 underline cursor-pointer"
                            title="Switch to numeric price"
                          >
                            €
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-stone-500 text-[10px]">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.1"
                            value={order.offerPrice ?? ''}
                            onChange={e => handleUpdateField(order.id, 'offerPrice', e.target.value === '' ? null : Number(e.target.value))}
                            placeholder="Offer"
                            className="bg-stone-900 border border-stone-800 text-rose-300 font-bold text-xs py-0.5 px-1.5 rounded-xs outline-none focus:border-rose-500 w-[68px] text-right"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateField(order.id, 'offerPrice', null);
                              handleUpdateField(order.id, 'offerText', 'Seller');
                            }}
                            className="text-[10px] text-stone-600 hover:text-stone-400 cursor-pointer"
                            title="Tag as Seller interest"
                          >
                            S
                          </button>
                        </div>
                      )}
                    </td>

                    {/* BID Volume Input */}
                    <td className="py-1.5 px-2.5 text-right whitespace-nowrap font-mono">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="5"
                          value={order.bidVolumeGWh ?? ''}
                          onChange={e => handleUpdateField(order.id, 'bidVolumeGWh', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="—"
                          className="bg-stone-900 border border-stone-800 text-emerald-400 font-semibold text-xs py-0.5 px-1 rounded-xs outline-none focus:border-teal-500 w-[45px] text-right"
                        />
                        <span className="text-[10px] text-stone-500">GWh</span>
                      </div>
                    </td>

                    {/* OFFER Volume Input */}
                    <td className="py-1.5 px-2.5 text-right whitespace-nowrap font-mono">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="5"
                          value={order.offerVolumeGWh ?? ''}
                          onChange={e => handleUpdateField(order.id, 'offerVolumeGWh', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="—"
                          className="bg-stone-900 border border-stone-800 text-rose-400 font-semibold text-xs py-0.5 px-1 rounded-xs outline-none focus:border-rose-500 w-[45px] text-right"
                        />
                        <span className="text-[10px] text-stone-500">GWh</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuoteDeal(order)}
                          className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-[10px] font-bold rounded-xs cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                          title="Quick Deal Ticket Drawer"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Quote</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenInTradeDesk(order)}
                          className="p-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-teal-300 hover:text-teal-100 rounded-xs cursor-pointer transition-colors"
                          title="Open and structure directly on Trade Desk"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMathOrder(order)}
                          className="p-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 rounded-xs cursor-pointer transition-colors"
                          title="Inspect mathematical proof formula"
                        >
                          <Calculator className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(order.id)}
                          className="p-1 text-stone-600 hover:text-rose-400 hover:bg-stone-900 rounded-xs cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete row"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footnote Rule from Trader Sheet */}
      <div className="p-2.5 px-4 border-t border-stone-800 bg-stone-900/80 flex items-center justify-between text-micro font-mono text-stone-400 flex-none">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-teal-400" />
          <span>* The bids and offers are for certificates only. Index gas price/swap {ttfGasMid !== null ? `(TTF M+1 €${ttfGasMid.toFixed(2)}/MWh)` : ''} to be added on top for delivered physical gas.</span>
        </span>
        <span className="flex items-center gap-3">
          <span>All edits automatically saved to your browser session</span>
          <span>Showing <strong>{filteredOrders.length}</strong> of {orders.length} quotes</span>
        </span>
      </div>

      {/* Deal Ticket Slide-out Drawer */}
      {selectedDealRoute && dealRequest && (
        <QuickDealDrawer
          route={selectedDealRoute}
          request={dealRequest}
          marks={marks}
          costs={costs}
          onClose={() => setSelectedDealRoute(null)}
        />
      )}

      {/* Step-by-step Math Proof Modal */}
      {selectedMathOrder && (
        <MathFormulaModal
          isOpen={!!selectedMathOrder}
          onClose={() => setSelectedMathOrder(null)}
          marketId={
            selectedMathOrder.country === 'DE' ? 'DE_THG' :
            selectedMathOrder.country === 'NL' ? 'NL_ERE' :
            selectedMathOrder.country === 'FR' ? 'FR_CPB' :
            selectedMathOrder.country === 'UK' ? 'UK_RTFO' : 'DE_THG'
          }
          feedstockKey={
            selectedMathOrder.feedstock.toLowerCase().includes('manure') ? 'manure' :
            selectedMathOrder.feedstock.toLowerCase().includes('waste') ? 'biowaste' : 'crop'
          }
          carbonIntensity={selectedMathOrder.ciNumeric !== null ? selectedMathOrder.ciNumeric : undefined}
          volumeMwh={
            selectedMathOrder.offerVolumeGWh != null
              ? selectedMathOrder.offerVolumeGWh * 1000
              : selectedMathOrder.bidVolumeGWh != null
              ? selectedMathOrder.bidVolumeGWh * 1000
              : undefined
          }
          marks={marks}
          costs={costs}
        />
      )}

    </div>
  );
}
