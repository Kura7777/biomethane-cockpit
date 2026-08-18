import React, { useState, useMemo } from 'react';
import { MARKETS } from '../../domain/markets/registry';
import { useAppState, exportState, importState } from '../../store/context';
import { getMarkAgeDays, getMarkStaleness, PriceSide } from '../../domain/markets/types';

import { ForwardCurveAnalytics } from './ForwardCurveAnalytics';
import { BrokerRunTable } from './BrokerRunTable';

function getAgeChipStyle(staleness: string) {
  switch (staleness) {
    case 'FRESH':
      return 'text-emerald-400 bg-emerald-950 border-emerald-800';
    case 'STALE_WARNING':
      return 'text-amber-400 bg-amber-950 border-amber-800';
    case 'STALE_CRITICAL':
      return 'text-red-400 bg-red-950 border-red-800';
    default:
      return 'text-stone-400 bg-stone-900 border-stone-800';
  }
}

export function MarksScreen() {
  const { state, dispatch } = useAppState();
  const [activeView, setActiveView] = useState<'BROKER_RUNS' | 'CURVES' | 'MATRIX'>('BROKER_RUNS');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);

  // Update mid mark in store
  const handleMidChange = (marketId: string, valueStr: string) => {
    const val = valueStr === '' ? null : Number(valueStr);
    const existing = state.marks.marks[marketId] || {
      marketId,
      bid: null,
      offer: null,
      mid: null,
      updatedAt: null,
      source: null,
    };

    // Calculate spread-adjusted bid/offer around mid
    let computedBid = existing.bid;
    let computedOffer = existing.offer;
    if (val !== null) {
      const spreadFraction = 0.015; // 1.5% half-spread
      computedBid = Number((val * (1 - spreadFraction)).toFixed(marketId === 'NL_ERE' || marketId === 'UK_RTFO' ? 3 : 2));
      computedOffer = Number((val * (1 + spreadFraction)).toFixed(marketId === 'NL_ERE' || marketId === 'UK_RTFO' ? 3 : 2));
    }

    const now = new Date().toISOString();
    dispatch({
      type: 'SET_MARK',
      marketId,
      bid: computedBid,
      offer: computedOffer,
      mid: val,
      updatedAt: now,
      source: 'DESK · MANUAL',
      provenance: {
        sourceType: 'ESTIMATE',
        sourceName: 'Desk Trader Override',
        sourceUrl: null,
        observedAt: now,
        note: 'Direct trader input on desk marks matrix',
      },
    });
  };

  const handleExportJSON = () => {
    const json = exportState(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biomethane-desk-marks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const imported = importState(event.target?.result as string);
          dispatch({ type: 'IMPORT_STATE', state: imported });
          setSuccessMessage('Successfully imported marks snapshot');
          setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
          alert('Invalid JSON marks file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Top Index Cards data
  const ttfMid = state.marks.gasIndex.mid;
  // A mid is not a bid and not an offer. If the desk has not entered a side, the card
  // says so — it must never imply a spread nobody quoted.
  const ttfBid = state.marks.gasIndex.bid;
  const ttfOffer = state.marks.gasIndex.offer;
  const gbpFx = state.marks.fx.gbpEur;
  const chfFx = state.marks.fx.chfEur;

  const markEntries = useMemo(() => {
    return activeMarkets.map(m => state.marks.marks[m.id] || { marketId: m.id, updatedAt: null });
  }, [activeMarkets, state.marks.marks]);

  const freshCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'FRESH').length;

  const ttfSub = ttfBid != null && ttfOffer != null
    ? `Bid €${ttfBid.toFixed(2)} · Offer €${ttfOffer.toFixed(2)}`
    : ttfBid != null
    ? `Bid €${ttfBid.toFixed(2)}`
    : ttfOffer != null
    ? `Offer €${ttfOffer.toFixed(2)}`
    : 'No bid/offer entered';

  const indexCards = [
    {
      key: 'TTF Month+1',
      val: ttfMid != null ? `€${ttfMid.toFixed(2)}` : '—',
      sub: ttfSub,
      age: state.marks.gasIndex.updatedAt ? '1d' : '—',
      ageTone: ttfMid != null ? 'text-emerald-400 bg-emerald-950 border-emerald-800' : 'text-stone-400 bg-stone-900 border-stone-800',
    },
    {
      key: 'GBP / EUR',
      val: gbpFx != null ? gbpFx.toFixed(3) : '—',
      sub: 'ECB reference cross',
      age: state.marks.fx.updatedAt ? '1d' : '—',
      ageTone: gbpFx != null ? 'text-emerald-400 bg-emerald-950 border-emerald-800' : 'text-stone-400 bg-stone-900 border-stone-800',
    },
    {
      key: 'CHF / EUR',
      val: chfFx != null ? chfFx.toFixed(3) : '—',
      sub: 'SNB reference cross',
      age: state.marks.fx.updatedAt ? '2d' : '—',
      ageTone: chfFx != null ? 'text-emerald-400 bg-emerald-950 border-emerald-800' : 'text-stone-400 bg-stone-900 border-stone-800',
    },
    {
      key: 'Marks Filled',
      val: `${freshCount} / ${activeMarkets.length}`,
      sub: `${activeMarkets.length - freshCount} simulated / indicative`,
      age: 'live',
      ageTone: 'text-emerald-400 bg-emerald-950 border-emerald-800',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-[1400px] overflow-hidden bg-stone-950 font-sans">
      
      {/* 6A. TOOLBAR */}
      <div className="flex-none flex items-center justify-between gap-4 p-2.5 px-3.5 border-b border-stone-800 bg-stone-900">
        <div className="flex items-baseline gap-3">
          <h1 className="m-0 font-mono text-sm font-semibold tracking-[0.14em] text-stone-100 uppercase">
            Desk marks
          </h1>
          <span className="text-xs text-stone-400">
            16 compliance certificates · TTF index · Forward Curves · all levels SIMULATED
          </span>
          {successMessage && (
            <span className="font-mono text-micro font-semibold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5">
              {successMessage}
            </span>
          )}
        </div>

        {/* 3-Way Mode Switch */}
        <div className="flex items-center gap-1 bg-stone-950 p-0.5 border border-stone-800 rounded-xs">
          <button
            type="button"
            onClick={() => setActiveView('BROKER_RUNS')}
            className={`font-mono text-meta font-semibold px-3 py-1 rounded-xs transition-colors cursor-pointer border-none ${
              activeView === 'BROKER_RUNS'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'bg-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            📋 BROKER RUN &amp; ORDER BOOK
          </button>
          <button
            type="button"
            onClick={() => setActiveView('CURVES')}
            className={`font-mono text-meta font-semibold px-3 py-1 rounded-xs transition-colors cursor-pointer border-none ${
              activeView === 'CURVES'
                ? 'bg-teal-600 text-teal-50 font-bold shadow-xs'
                : 'bg-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            📈 FORWARD CURVES &amp; SPREADS
          </button>
          <button
            type="button"
            onClick={() => setActiveView('MATRIX')}
            className={`font-mono text-meta font-semibold px-3 py-1 rounded-xs transition-colors cursor-pointer border-none ${
              activeView === 'MATRIX'
                ? 'bg-teal-600 text-teal-50 font-bold shadow-xs'
                : 'bg-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            📊 COMPLIANCE MARKS MATRIX
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono text-meta">
          <label className="p-1.5 px-3 bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-stone-100 font-semibold tracking-[0.06em] rounded-xs cursor-pointer transition-colors flex items-center gap-1.5">
            <span>Import snapshot</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleExportJSON}
            className="p-1.5 px-3 bg-teal-600 hover:bg-teal-500 text-teal-50 font-semibold tracking-[0.08em] uppercase rounded-xs cursor-pointer transition-colors border-none"
          >
            Export snapshot
          </button>
        </div>
      </div>

      {activeView === 'BROKER_RUNS' ? (
        <BrokerRunTable marks={state.marks} costs={state.costs} />
      ) : activeView === 'CURVES' ? (
        <ForwardCurveAnalytics />
      ) : (
        <>
          {/* 6B. INDEX CARDS (4 COLUMNS) */}
          <div className="flex-none grid grid-cols-4 gap-[1px] bg-stone-800 border-b border-stone-800">
            {indexCards.map((c, ci) => (
              <div key={ci} className="bg-stone-950 p-3 px-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
                    {c.key}
                  </span>
                  <span className={`font-mono text-micro font-semibold px-1 py-0.5 border rounded-xs ${c.ageTone}`}>
                    {c.age}
                  </span>
                </div>
                <div className="font-mono font-num text-2xl font-bold tracking-[-0.03em] text-stone-100 mt-1 leading-none">
                  {c.val}
                </div>
                <div className="font-mono text-meta text-stone-500 mt-1 truncate">
                  {c.sub}
                </div>
              </div>
            ))}
          </div>

          {/* 6C. COLUMN HEADERS */}
          <div className="flex-none grid grid-cols-[26px_minmax(160px,1.4fr)_92px_repeat(3,minmax(72px,0.8fr))_96px_130px_62px] gap-2.5 items-center px-3.5 py-1.5 bg-stone-900 border-b border-stone-800 font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
            <span>CC</span>
            <span>Market</span>
            <span>Unit</span>
            <span className="text-right">Bid</span>
            <span className="text-right">Mid</span>
            <span className="text-right">Offer</span>
            <span className="text-right">Spread</span>
            <span>Source</span>
            <span className="text-center">Age</span>
          </div>

      {/* 6D. DATA ROWS SCROLLER */}
      <div className="flex-[1_1_auto] overflow-y-auto min-h-[220px]">
        {activeMarkets.map(m => {
          const entry = state.marks.marks[m.id];
          // Unmarked is unmarked. A mid does not imply a bid or an offer, and an
          // unentered mid is not zero — both render as '—'.
          const midVal = entry?.mid ?? null;
          const bidVal = entry?.bid ?? null;
          const offerVal = entry?.offer ?? null;
          const spreadVal = bidVal !== null && offerVal !== null ? offerVal - bidVal : null;

          const isSmallUnit = m.unitOfAccount === 'EUR_PER_KG_CO2E' || m.unitOfAccount === 'GBP_PER_DRTFC';
          const stepVal = isSmallUnit ? '0.001' : '0.5';
          const decimalDigits = isSmallUnit ? 3 : 2;

          const staleness = getMarkStaleness(entry?.updatedAt);
          const ageDays = getMarkAgeDays(entry?.updatedAt);
          const ageTone = getAgeChipStyle(staleness);
          const sourceLabel = entry?.source === 'DESK · MANUAL' ? 'DESK · MANUAL' : 'ESTIMATE · SIM';
          const isManual = entry?.source === 'DESK · MANUAL';

          return (
            <div
              key={m.id}
              className="grid grid-cols-[26px_minmax(160px,1.4fr)_92px_repeat(3,minmax(72px,0.8fr))_96px_130px_62px] gap-2.5 items-center px-3.5 py-1.5 border-b border-stone-900 hover:bg-stone-900/60 transition-colors"
            >
              {/* CC */}
              <span className="font-mono text-meta font-semibold text-stone-400">
                {m.country}
              </span>

              {/* Market Name */}
              <span className="text-sm font-medium text-stone-100 truncate">
                {m.name}
              </span>

              {/* Unit */}
              <span className="font-mono text-meta text-stone-500">
                {m.unitLabel}
              </span>

              {/* Bid */}
              <span className="font-mono font-num text-xs text-right text-emerald-400">
                {bidVal !== null ? bidVal.toFixed(decimalDigits) : '—'}
              </span>

              {/* Editable Mid Input */}
              <div>
                <input
                  type="number"
                  step={stepVal}
                  value={midVal !== null && midVal !== undefined ? midVal : ''}
                  onChange={e => handleMidChange(m.id, e.target.value)}
                  aria-label={`Mid mark for ${m.name}`}
                  className={`w-full font-mono font-num text-xs font-semibold text-right p-1 px-1.5 rounded-xs outline-none transition-colors ${
                    isManual
                      ? 'bg-teal-950 border border-teal-800 text-teal-300 focus:border-teal-400'
                      : 'bg-stone-950 border border-stone-800 text-stone-200 focus:border-teal-500'
                  }`}
                />
              </div>

              {/* Offer */}
              <span className="font-mono font-num text-xs text-right text-red-400">
                {offerVal !== null ? offerVal.toFixed(decimalDigits) : '—'}
              </span>

              {/* Spread */}
              <span className="font-mono font-num text-meta text-right text-stone-400">
                {spreadVal !== null && spreadVal > 0 ? spreadVal.toFixed(decimalDigits) : '—'}
              </span>

              {/* Source Chip */}
              <div>
                <span className={`font-mono text-micro px-1.5 py-0.5 border rounded-xs ${
                  isManual
                    ? 'text-teal-300 bg-teal-950 border-teal-800'
                    : 'text-stone-500 bg-stone-900 border-stone-800'
                }`}>
                  {sourceLabel}
                </span>
              </div>

              {/* Age */}
              <div className="flex justify-center">
                <span className={`font-mono text-micro font-semibold px-1 py-0.5 border rounded-xs ${ageTone}`}>
                  {isManual ? 'now' : (ageDays !== null ? `${ageDays}d` : '—')}
                </span>
              </div>
              </div>
            );
          })}
        </div>
        </>
      )}

    </div>
  );
}


