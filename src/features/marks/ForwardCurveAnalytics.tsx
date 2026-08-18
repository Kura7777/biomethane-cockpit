import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKETS } from '../../domain/markets/registry';
import { Market, PriceSide } from '../../domain/markets/types';
import { useAppState } from '../../store/context';
import {
  DeliveryTenor,
  TenorCategory,
  TenorBasisSpread,
  TENOR_DEFINITIONS,
  ALL_DELIVERY_TENORS,
  computeForwardBasisSpreads,
  computeAllMarketsForwardSpreads,
  getDefaultForwardCurveMatrix,
} from '../../domain/curves';
import { Consignment } from '../../domain/consignment/types';

const FOCUS_MARKET_IDS = ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'UK_RTFO', 'DK_GO', 'ES_GO', 'AT_GO'];

export function ForwardCurveAnalytics() {
  const { state } = useAppState();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<TenorCategory | 'ALL'>('ALL');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('DE_THG');
  const [selectedTenor, setSelectedTenor] = useState<DeliveryTenor>('M_PLUS_1');
  const [selectedPricingSide, setSelectedPricingSide] = useState<PriceSide>(
    state.marks.pricingSides.certificateSide || 'bid'
  );

  const activeFocusMarkets = useMemo(() => {
    return FOCUS_MARKET_IDS.map(id => MARKETS.find(m => m.id === id)).filter((m): m is Market => m !== undefined);
  }, []);

  const selectedMarket = useMemo(() => {
    return MARKETS.find(m => m.id === selectedMarketId) ?? activeFocusMarkets[0];
  }, [selectedMarketId, activeFocusMarkets]);

  // Consignment to evaluate: active consignment if exists, or high-value default manure consignment
  const activeConsignment: Consignment = useMemo(() => {
    if (state.activeConsignmentId) {
      const found = state.consignments.find(c => c.id === state.activeConsignmentId);
      if (found) return found;
    }
    return {
      id: 'BENCHMARK-MANURE-01',
      name: 'Benchmark Danish Liquid Manure',
      originCountry: 'DK',
      originCountryName: 'Denmark',
      feedstock: 'MANURE',
      feedstockName: 'Liquid Manure',
      annexClassification: 'IX_A',
      carbonIntensity: -100, // gCO2e/MJ
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      injectionCountry: 'DK',
      injectionIsEU: true,
      udbStatus: 'RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: 10000,
      deliveryPeriod: {
        type: 'CALENDAR',
        complianceYear: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    };
  }, [state.activeConsignmentId, state.consignments]);

  // Compute forward spreads strictly through pure curves domain engine
  const curveMatrix = useMemo(() => getDefaultForwardCurveMatrix(), []);

  const allMarketSpreads = useMemo(() => {
    return computeAllMarketsForwardSpreads(
      activeConsignment,
      activeFocusMarkets,
      curveMatrix,
      state.costs,
      selectedPricingSide
    );
  }, [activeConsignment, activeFocusMarkets, curveMatrix, state.costs, selectedPricingSide]);

  const selectedMarketSpreads = useMemo(() => {
    return allMarketSpreads[selectedMarket.id] || [];
  }, [allMarketSpreads, selectedMarket.id]);

  const filteredTenors = useMemo(() => {
    if (selectedCategory === 'ALL') {
      return TENOR_DEFINITIONS;
    }
    return TENOR_DEFINITIONS.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  const filteredSpreads = useMemo(() => {
    const tenorSet = new Set(filteredTenors.map(t => t.tenor));
    return selectedMarketSpreads.filter(s => tenorSet.has(s.tenor));
  }, [selectedMarketSpreads, filteredTenors]);

  const activeTenorSpread = useMemo(() => {
    return selectedMarketSpreads.find(s => s.tenor === selectedTenor) || selectedMarketSpreads[0];
  }, [selectedMarketSpreads, selectedTenor]);

  // Curve Shape Summary
  const promptSpread = selectedMarketSpreads.find(s => s.tenor === 'M_PLUS_1');
  const cal1Spread = selectedMarketSpreads.find(s => s.tenor === 'CAL_PLUS_1');
  const promptTtf = curveMatrix.gasForwardCurve.M_PLUS_1.mid;
  const cal1Ttf = curveMatrix.gasForwardCurve.CAL_PLUS_1.mid;
  const ttfCurveStructure = promptTtf !== null && cal1Ttf !== null
    ? (cal1Ttf > promptTtf ? 'CONTANGO (+€' + (cal1Ttf - promptTtf).toFixed(2) + ')' : 'BACKWARDATION (-€' + (promptTtf - cal1Ttf).toFixed(2) + ')')
    : 'FLAT';

  const handleStructureTrade = (spread: TenorBasisSpread) => {
    const params = new URLSearchParams({
      originCountry: activeConsignment.originCountry,
      feedstock: activeConsignment.feedstock,
      ci: activeConsignment.carbonIntensity.toString(),
      marketId: selectedMarket.id,
      volume: (activeConsignment.volumeMWh ?? 10000).toString(),
      tenor: spread.tenor,
    });
    navigate(`/trade?${params.toString()}`);
  };

  // SVG Forward Curve Chart Geometry
  const chartHeight = 180;
  const chartWidth = 740;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Find min/max values for scaling
  const allChartValues: number[] = [];
  ALL_DELIVERY_TENORS.forEach(t => {
    const gasVal = curveMatrix.gasForwardCurve[t].mid;
    if (gasVal !== null) allChartValues.push(gasVal);
    activeFocusMarkets.forEach(m => {
      const s = allMarketSpreads[m.id]?.find(item => item.tenor === t);
      if (s?.totalDeliveredValueEurPerMwh !== null && s?.totalDeliveredValueEurPerMwh !== undefined) {
        allChartValues.push(s.totalDeliveredValueEurPerMwh);
      }
    });
  });

  const minY = Math.max(0, Math.floor((Math.min(...allChartValues, 20) - 10) / 10) * 10);
  const maxY = Math.ceil((Math.max(...allChartValues, 100) + 20) / 20) * 20;

  const getX = (index: number) => padding.left + (index / (ALL_DELIVERY_TENORS.length - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - ((val - minY) / (maxY - minY)) * innerHeight;

  // Build SVG path string
  const buildSvgPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  };

  const ttfPoints = ALL_DELIVERY_TENORS.map((t, idx) => {
    const val = curveMatrix.gasForwardCurve[t].mid ?? 30;
    return { x: getX(idx), y: getY(val), val, tenor: t };
  });

  const selectedMarketPoints = ALL_DELIVERY_TENORS.map((t, idx) => {
    const s = selectedMarketSpreads.find(item => item.tenor === t);
    const val = s?.totalDeliveredValueEurPerMwh ?? (curveMatrix.gasForwardCurve[t].mid ?? 30);
    return { x: getX(idx), y: getY(val), val, tenor: t };
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-[1400px] overflow-y-auto bg-stone-950 text-stone-100 font-sans">
      
      {/* 1. TOP CONTROLS & FILTER BAR */}
      <div className="flex-none flex items-center justify-between gap-4 p-2.5 px-4 bg-stone-900 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-micro font-semibold tracking-[0.14em] text-stone-400 uppercase">
            Delivery Tenor:
          </span>
          <div className="flex items-center bg-stone-950 p-0.5 border border-stone-800 rounded-xs">
            {(['ALL', 'PROMPT', 'QUARTER', 'CALENDAR'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`font-mono text-meta font-semibold px-2.5 py-1 rounded-xs transition-colors cursor-pointer border-none ${
                  selectedCategory === cat
                    ? 'bg-teal-600 text-teal-50 shadow-xs'
                    : 'bg-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                {cat === 'ALL' ? 'All (9 Tenors)' : cat}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-stone-800 mx-1" />

          <span className="font-mono text-micro font-semibold tracking-[0.14em] text-stone-400 uppercase">
            Target Market:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-[500px]">
            {activeFocusMarkets.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMarketId(m.id)}
                className={`font-mono text-meta font-semibold px-2 py-0.5 rounded-xs transition-colors cursor-pointer border ${
                  selectedMarketId === m.id
                    ? 'bg-teal-950 border-teal-700 text-teal-300'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {m.country} · {m.shortName}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-micro font-semibold tracking-[0.14em] text-stone-400 uppercase">
            Pricing Side:
          </span>
          <div className="flex items-center bg-stone-950 p-0.5 border border-stone-800 rounded-xs">
            {(['bid', 'mid', 'offer'] as const).map(side => (
              <button
                key={side}
                type="button"
                onClick={() => setSelectedPricingSide(side)}
                className={`font-mono text-meta font-semibold px-2 py-0.5 rounded-xs uppercase transition-colors cursor-pointer border-none ${
                  selectedPricingSide === side
                    ? 'bg-stone-800 text-teal-300'
                    : 'bg-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                {side}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-stone-800" />

          <span className="font-mono text-micro text-stone-400">
            Consignment: <strong className="text-stone-200">{activeConsignment.feedstockName} ({activeConsignment.carbonIntensity} g/MJ)</strong>
          </span>
        </div>
      </div>

      {/* 2. KPI BANNER (4 CARDS) */}
      <div className="flex-none grid grid-cols-4 gap-[1px] bg-stone-800 border-b border-stone-800">
        {/* KPI 1: TTF Forward Curve Structure */}
        <div className="bg-stone-950 p-3 px-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              TTF Gas Curve Structure
            </span>
            <span className="font-mono text-micro font-semibold text-sky-400 bg-sky-950 border border-sky-800 px-1 py-0.5 rounded-xs">
              EEX BENCHMARK
            </span>
          </div>
          <div className="font-mono font-num text-xl font-bold text-stone-100 mt-1 leading-tight">
            {promptTtf !== null ? `€${promptTtf.toFixed(2)}` : '—'} <span className="text-xs font-normal text-stone-400">Prompt M+1</span>
          </div>
          <div className="font-mono text-meta text-stone-400 mt-1">
            Cal+1: {cal1Ttf !== null ? `€${cal1Ttf.toFixed(2)}` : '—'} · Structure: <span className="text-sky-300">{ttfCurveStructure}</span>
          </div>
        </div>

        {/* KPI 2: Selected Market Delivered Value */}
        <div className="bg-stone-950 p-3 px-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              {selectedMarket.country} · {selectedMarket.shortName} Prompt Delivered
            </span>
            <span className="font-mono text-micro font-semibold text-emerald-400 bg-emerald-950 border border-emerald-800 px-1 py-0.5 rounded-xs">
              DELIVERED NETBACK
            </span>
          </div>
          <div className="font-mono font-num text-xl font-bold text-emerald-400 mt-1 leading-tight">
            {promptSpread?.totalDeliveredValueEurPerMwh !== null && promptSpread?.totalDeliveredValueEurPerMwh !== undefined
              ? `€${promptSpread.totalDeliveredValueEurPerMwh.toFixed(2)}/MWh`
              : '—'}
          </div>
          <div className="font-mono text-meta text-stone-400 mt-1">
            Cert: {promptSpread?.certificateValueEurPerMwh !== null && promptSpread?.certificateValueEurPerMwh !== undefined
              ? `€${promptSpread.certificateValueEurPerMwh.toFixed(2)}/MWh`
              : '—'} · Logistics: €{(state.costs.logistics ?? 0).toFixed(2)}/MWh
          </div>
        </div>

        {/* KPI 3: Commercial Basis Spread over TTF */}
        <div className="bg-stone-950 p-3 px-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              Prompt Basis Spread (vs TTF)
            </span>
            <span className="font-mono text-micro font-semibold text-teal-300 bg-teal-950 border border-teal-800 px-1 py-0.5 rounded-xs">
              GREEN PREMIUM
            </span>
          </div>
          <div className="font-mono font-num text-xl font-bold text-teal-300 mt-1 leading-tight">
            {promptSpread?.commercialBasisSpreadEurPerMwh !== null && promptSpread?.commercialBasisSpreadEurPerMwh !== undefined
              ? `+€${promptSpread.commercialBasisSpreadEurPerMwh.toFixed(2)}/MWh`
              : '—'}
          </div>
          <div className="font-mono text-meta text-stone-400 mt-1">
            Delivered Netback minus TTF Base Molecule Index
          </div>
        </div>

        {/* KPI 4: Desk Margin & Cal+1 Outlook */}
        <div className="bg-stone-950 p-3 px-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              Desk Margin & Cal+1 Spread
            </span>
            <span className="font-mono text-micro font-semibold text-stone-300 bg-stone-900 border border-stone-700 px-1 py-0.5 rounded-xs">
              REALIZED P&L
            </span>
          </div>
          <div className="font-mono font-num text-xl font-bold text-stone-100 mt-1 leading-tight">
            {promptSpread?.deskMarginEurPerMwh !== null && promptSpread?.deskMarginEurPerMwh !== undefined
              ? `€${promptSpread.deskMarginEurPerMwh.toFixed(2)}/MWh`
              : '—'}{' '}
            <span className="text-xs font-normal text-stone-400">desk margin</span>
          </div>
          <div className="font-mono text-meta text-stone-400 mt-1">
            Cal+1 Spread: {cal1Spread?.commercialBasisSpreadEurPerMwh !== null && cal1Spread?.commercialBasisSpreadEurPerMwh !== undefined
              ? `+€${cal1Spread.commercialBasisSpreadEurPerMwh.toFixed(2)}/MWh`
              : '—'}
          </div>
        </div>
      </div>

      {/* 3. MAIN ANALYTICS GRID: CHART & WATERFALL */}
      <div className="flex-none grid grid-cols-12 gap-4 p-4 border-b border-stone-800">
        
        {/* 3A. FORWARD CURVE STEP/LINE VISUALIZER (7 COLS) */}
        <div className="col-span-7 bg-stone-900 border border-stone-800 p-3.5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="m-0 font-mono text-xs font-semibold tracking-[0.12em] text-stone-100 uppercase">
                Forward Curve Step & Term Structure
              </h2>
              <span className="text-meta text-stone-400">
                TTF Gas Index vs {selectedMarket.name} Delivered Value
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-micro">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-sky-400 inline-block" />
                <span className="text-stone-300">TTF Forward Gas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                <span className="text-stone-300">{selectedMarket.shortName} Delivered Value</span>
              </div>
            </div>
          </div>

          {/* SVG Line / Step Graph */}
          <div className="relative flex-1 flex items-center justify-center bg-stone-950 border border-stone-800/80 p-2 overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full max-h-[190px] select-none"
              aria-label="Forward curve step chart comparing TTF gas curve with biomethane delivered value"
            >
              {/* Horizontal Gridlines & Y-Axis Labels */}
              {[minY, (minY + maxY) / 2, maxY].map((yVal, i) => {
                const yPos = getY(yVal);
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={chartWidth - padding.right}
                      y2={yPos}
                      stroke="#292524" // stone-800
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 6}
                      y={yPos + 3}
                      textAnchor="end"
                      className="fill-stone-400 font-mono text-[9px]"
                    >
                      €{yVal.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Labels & Vertical Gridlines */}
              {ALL_DELIVERY_TENORS.map((t, idx) => {
                const xPos = getX(idx);
                const isSelected = t === selectedTenor;
                const tenorDef = TENOR_DEFINITIONS.find(def => def.tenor === t);
                return (
                  <g key={t}>
                    <line
                      x1={xPos}
                      y1={padding.top}
                      x2={xPos}
                      y2={chartHeight - padding.bottom}
                      stroke={isSelected ? '#0d9488' : '#1c1917'} // teal-600 or stone-900
                      strokeWidth={isSelected ? 1.5 : 1}
                      strokeDasharray={isSelected ? undefined : '2 2'}
                    />
                    <text
                      x={xPos}
                      y={chartHeight - padding.bottom + 14}
                      textAnchor="middle"
                      className={`font-mono text-[10px] ${
                        isSelected ? 'fill-teal-300 font-bold' : 'fill-stone-400'
                      }`}
                    >
                      {tenorDef?.shortLabel ?? t}
                    </text>
                  </g>
                );
              })}

              {/* Shaded Spread Area between curves */}
              <path
                d={`${buildSvgPath(selectedMarketPoints)} L ${getX(ALL_DELIVERY_TENORS.length - 1)} ${getY(ttfPoints[ttfPoints.length - 1].val)} ${ttfPoints.slice().reverse().reduce((acc, p, i) => `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '')} Z`}
                fill="rgba(13, 148, 136, 0.12)" // teal subtle fill
              />

              {/* TTF Line */}
              <path
                d={buildSvgPath(ttfPoints)}
                fill="none"
                stroke="#38bdf8" // sky-400
                strokeWidth={2}
              />

              {/* Delivered Value Line */}
              <path
                d={buildSvgPath(selectedMarketPoints)}
                fill="none"
                stroke="#34d399" // emerald-400
                strokeWidth={2.5}
              />

              {/* Interactive Data Points */}
              {ALL_DELIVERY_TENORS.map((t, idx) => {
                const ttfP = ttfPoints[idx];
                const greenP = selectedMarketPoints[idx];
                const isSelected = t === selectedTenor;
                return (
                  <g
                    key={t}
                    className="cursor-pointer"
                    onClick={() => setSelectedTenor(t)}
                  >
                    {/* TTF Dot */}
                    <circle
                      cx={ttfP.x}
                      cy={ttfP.y}
                      r={isSelected ? 4.5 : 3}
                      className={isSelected ? 'fill-sky-300 stroke-stone-950 stroke-2' : 'fill-sky-400'}
                    />
                    {/* Green Delivered Dot */}
                    <circle
                      cx={greenP.x}
                      cy={greenP.y}
                      r={isSelected ? 5.5 : 4}
                      className={isSelected ? 'fill-emerald-300 stroke-stone-950 stroke-2' : 'fill-emerald-400'}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between mt-2 font-mono text-micro text-stone-400">
            <span>
              Click any tenor column to inspect delivered waterfall stack on the right.
            </span>
            <span>
              Selected Tenor: <strong className="text-teal-300">{TENOR_DEFINITIONS.find(t => t.tenor === selectedTenor)?.label}</strong>
            </span>
          </div>
        </div>

        {/* 3B. DELIVERED VALUE STACK & WATERFALL (5 COLS) */}
        <div className="col-span-5 bg-stone-900 border border-stone-800 p-3.5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="m-0 font-mono text-xs font-semibold tracking-[0.12em] text-stone-100 uppercase">
              Delivered Value Stack & Spread Breakdown
            </h2>
            <span className="font-mono text-micro font-semibold text-teal-300 bg-teal-950 border border-teal-800 px-1.5 py-0.5 rounded-xs">
              {TENOR_DEFINITIONS.find(t => t.tenor === selectedTenor)?.shortLabel} ({selectedMarket.shortName})
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-between bg-stone-950 border border-stone-800 p-3">
            {/* Waterfall stack components */}
            <div className="space-y-2 font-mono">
              
              {/* Step 1: Base TTF Molecule */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-900">
                <div className="flex items-center gap-2">
                  <span className="text-sky-400 font-bold">[+]</span>
                  <span className="text-stone-300">TTF Gas Index (Molecule Base)</span>
                </div>
                <span className="font-num font-semibold text-sky-400">
                  {activeTenorSpread.gasIndexPriceEurPerMwh !== null
                    ? `€${activeTenorSpread.gasIndexPriceEurPerMwh.toFixed(2)}/MWh`
                    : '—'}
                </span>
              </div>

              {/* Step 2: Compliance Certificate Value */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-900">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">[+]</span>
                  <span className="text-stone-300">Compliance Certificate Premium</span>
                </div>
                <span className="font-num font-semibold text-emerald-400">
                  {activeTenorSpread.certificateValueEurPerMwh !== null
                    ? `€${activeTenorSpread.certificateValueEurPerMwh.toFixed(2)}/MWh`
                    : '—'}
                </span>
              </div>

              {/* Step 3: Logistics Tariffs */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-900">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">[-]</span>
                  <span className="text-stone-400">Pipeline & Grid Entry Tariff</span>
                </div>
                <span className="font-num font-semibold text-red-400">
                  -€{activeTenorSpread.breakdown.logisticsEurPerMwh.toFixed(2)}/MWh
                </span>
              </div>

              {/* Step 4: Transfer & Registry Fees */}
              <div className="flex items-center justify-between text-xs py-1 border-b border-stone-900">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">[-]</span>
                  <span className="text-stone-400">Registry & Verification Fees</span>
                </div>
                <span className="font-num font-semibold text-red-400">
                  -€{activeTenorSpread.breakdown.transferAndRegistryFeesEurPerMwh.toFixed(2)}/MWh
                </span>
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-stone-800 my-1" />

              {/* Gross Delivered Value */}
              <div className="flex items-center justify-between text-sm py-1 bg-stone-900/60 px-2 rounded-xs">
                <span className="font-semibold text-stone-100">Delivered Netback Value</span>
                <span className="font-num font-bold text-emerald-400 text-base">
                  {activeTenorSpread.totalDeliveredValueEurPerMwh !== null
                    ? `€${activeTenorSpread.totalDeliveredValueEurPerMwh.toFixed(2)}/MWh`
                    : '—'}
                </span>
              </div>

              {/* Commercial Basis Spread */}
              <div className="flex items-center justify-between text-xs py-1 bg-teal-950/40 border border-teal-800/60 px-2 rounded-xs">
                <span className="font-semibold text-teal-300">Commercial Basis Spread (vs Brown TTF)</span>
                <span className="font-num font-bold text-teal-300">
                  {activeTenorSpread.commercialBasisSpreadEurPerMwh !== null
                    ? `+€${activeTenorSpread.commercialBasisSpreadEurPerMwh.toFixed(2)}/MWh`
                    : '—'}
                </span>
              </div>

              {/* Uncertainty Branch Spread if exists */}
              {activeTenorSpread.uncertaintySpreadEurPerMwh !== null && activeTenorSpread.uncertaintySpreadEurPerMwh !== undefined && activeTenorSpread.uncertaintySpreadEurPerMwh > 0 && (
                <div className="flex items-center justify-between text-meta py-0.5 px-2 bg-amber-950/40 border border-amber-800/50 rounded-xs text-amber-300">
                  <span>Policy Uncertainty Spread (DC 1x vs 2x):</span>
                  <span className="font-num font-semibold">±€{activeTenorSpread.uncertaintySpreadEurPerMwh.toFixed(2)}/MWh</span>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <div className="mt-3 pt-2 border-t border-stone-800 flex items-center justify-between">
              <div className="font-mono text-meta text-stone-400">
                Desk Margin:{' '}
                <strong className="text-stone-200">
                  {activeTenorSpread.deskMarginEurPerMwh !== null
                    ? `€${activeTenorSpread.deskMarginEurPerMwh.toFixed(2)}/MWh`
                    : '—'}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => handleStructureTrade(activeTenorSpread)}
                className="p-1 px-3 bg-teal-600 hover:bg-teal-500 text-teal-50 font-mono text-meta font-semibold uppercase tracking-[0.06em] rounded-xs cursor-pointer transition-colors border-none"
              >
                Structure Forward Trade ➔
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. COMPREHENSIVE MARKET BASIS SPREAD TABLE */}
      <div className="flex-1 flex flex-col min-h-[260px] p-4 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="m-0 font-mono text-xs font-semibold tracking-[0.12em] text-stone-100 uppercase">
              Cross-Market Forward Basis Spread Matrix
            </h2>
            <span className="text-meta text-stone-400">
              Sorted by Delivery Tenor and Target Market Spread Economics
            </span>
          </div>
          <span className="font-mono text-micro text-stone-400">
            All arithmetic derived strictly via <code className="text-teal-400">computeNetback</code>
          </span>
        </div>

        {/* Table Header */}
        <div className="flex-none grid grid-cols-[90px_100px_90px_110px_120px_130px_130px_110px_130px_100px] gap-2 items-center px-3.5 py-1.5 bg-stone-900 border border-stone-800 font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
          <span>Tenor</span>
          <span>Category</span>
          <span>Period</span>
          <span className="text-right">TTF Gas (€/MWh)</span>
          <span className="text-right">Cert Val (€/MWh)</span>
          <span className="text-right">Delivered (€/MWh)</span>
          <span className="text-right">Basis Spread (€/MWh)</span>
          <span className="text-right">Desk Margin</span>
          <span>Uncertainty</span>
          <span className="text-center">Action</span>
        </div>

        {/* Table Rows */}
        <div className="flex-1 overflow-y-auto border-x border-b border-stone-800 bg-stone-950 divide-y divide-stone-900">
          {filteredSpreads.map(s => {
            const isSelected = s.tenor === selectedTenor;
            const tenorDef = TENOR_DEFINITIONS.find(t => t.tenor === s.tenor);
            const certVal = s.certificateValueEurPerMwh;
            const delivered = s.totalDeliveredValueEurPerMwh;
            const spread = s.commercialBasisSpreadEurPerMwh;
            const deskMarginVal = s.deskMarginEurPerMwh;

            return (
              <div
                key={s.tenor}
                onClick={() => setSelectedTenor(s.tenor)}
                className={`grid grid-cols-[90px_100px_90px_110px_120px_130px_130px_110px_130px_100px] gap-2 items-center px-3.5 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-teal-950/40 border-l-2 border-l-teal-500'
                    : 'hover:bg-stone-900/60'
                }`}
              >
                {/* Tenor */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-stone-100">
                    {s.tenorLabel}
                  </span>
                </div>

                {/* Category Chip */}
                <div>
                  <span className={`font-mono text-micro font-semibold px-1.5 py-0.5 border rounded-xs ${
                    s.category === 'PROMPT'
                      ? 'text-sky-300 bg-sky-950 border-sky-800'
                      : s.category === 'QUARTER'
                      ? 'text-teal-300 bg-teal-950 border-teal-800'
                      : 'text-stone-300 bg-stone-900 border-stone-700'
                  }`}>
                    {s.category}
                  </span>
                </div>

                {/* Delivery Period */}
                <span className="font-mono text-meta text-stone-400">
                  {tenorDef?.deliveryPeriod}
                </span>

                {/* TTF Gas Index */}
                <span className="font-mono font-num text-xs text-right text-sky-400 font-semibold">
                  {s.gasIndexPriceEurPerMwh !== null ? `€${s.gasIndexPriceEurPerMwh.toFixed(2)}` : '—'}
                </span>

                {/* Certificate Value */}
                <span className="font-mono font-num text-xs text-right text-emerald-400 font-semibold">
                  {certVal !== null ? `€${certVal.toFixed(2)}` : '—'}
                </span>

                {/* Delivered Netback Value */}
                <span className="font-mono font-num text-sm text-right text-stone-100 font-bold">
                  {delivered !== null ? `€${delivered.toFixed(2)}` : '—'}
                </span>

                {/* Commercial Basis Spread */}
                <div className="text-right">
                  <span className="font-mono font-num text-xs font-bold text-teal-300 bg-teal-950 border border-teal-800 px-1.5 py-0.5 rounded-xs">
                    {spread !== null ? `+€${spread.toFixed(2)}` : '—'}
                  </span>
                </div>

                {/* Desk Margin */}
                <span className="font-mono font-num text-xs text-right text-stone-300">
                  {deskMarginVal !== null ? `€${deskMarginVal.toFixed(2)}` : '—'}
                </span>

                {/* Uncertainty */}
                <div>
                  {s.uncertaintySpreadEurPerMwh ? (
                    <span className="font-mono text-micro text-amber-300 bg-amber-950/60 border border-amber-800 px-1 py-0.5 rounded-xs">
                      ±€{s.uncertaintySpreadEurPerMwh.toFixed(2)}
                    </span>
                  ) : (
                    <span className="font-mono text-micro text-stone-400">Standard</span>
                  )}
                </div>

                {/* Action */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleStructureTrade(s);
                    }}
                    className="p-1 px-2 bg-stone-900 hover:bg-stone-800 text-teal-300 border border-teal-800 font-mono text-micro font-semibold uppercase rounded-xs cursor-pointer transition-colors"
                  >
                    Trade
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
