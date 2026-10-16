import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { MARKETS } from '../../domain/markets/registry';
import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';
import { resolveMarketForQuote, rowFeedsMarket, rowHasPrice } from '../../domain/marks/applyMarks';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { sortQuotesChronologically } from './marksSort';

interface ForwardCurvesViewProps {
  quotes: PricingBookEntry[];
}

function decimalsFor(unit: string): number {
  return unit.includes('kg') || unit.includes('RTFC') ? 3 : 2;
}

function fmt(v: number | null, unit: string): string {
  return v === null ? '—' : v.toFixed(decimalsFor(unit));
}

/** Mid of an observed bid and offer. Null unless both sides are quoted. */
function midOf(r: PricingBookEntry): number | null {
  if (r.bidPriceNumeric === null || r.offerPriceNumeric === null) return null;
  return (r.bidPriceNumeric + r.offerPriceNumeric) / 2;
}

/**
 * Forward strip: the pricing book rows that feed one market, in tenor order, exactly as quoted.
 * Nothing here is modelled: no bundled or green-premium maths, no interpolated tenors. A time
 * spread appears only where the row and the first tenor of the same feedstock both have a mid.
 */
export function ForwardCurvesView({ quotes }: ForwardCurvesViewProps) {
  const navigate = useNavigate();
  const [chosen, setChosen] = useState<string | null>(null);

  const rowsByMarket = useMemo(() => {
    const map = new Map<string, PricingBookEntry[]>();
    for (const q of quotes) {
      const mId = resolveMarketForQuote(q);
      if (!mId || !rowFeedsMarket(q, mId)) continue;
      if (!map.has(mId)) map.set(mId, []);
      map.get(mId)!.push(q);
    }
    return map;
  }, [quotes]);

  const options = useMemo(
    () => MARKETS.filter(m => rowsByMarket.has(m.id)),
    [rowsByMarket]
  );

  const marketId = chosen && rowsByMarket.has(chosen) ? chosen : (options[0]?.id ?? null);
  const market = marketId ? MARKETS.find(m => m.id === marketId) ?? null : null;

  const strip = useMemo(() => {
    if (!marketId) return [];
    return sortQuotesChronologically(rowsByMarket.get(marketId) ?? [], 'tenor', 'asc');
  }, [marketId, rowsByMarket]);

  if (!market) {
    return (
      <div className="panel" style={{ padding: '16px', color: 'var(--color-muted)', fontSize: '13px' }}>
        No quotes in the order book yet. Paste a broker run to build a forward strip.
      </div>
    );
  }

  const unit = market.unitLabel;
  const priced = strip.filter(rowHasPrice);
  const distinctTenors = new Set(priced.map(r => r.vintage)).size;

  // First priced tenor with a mid, per feedstock: the base for the time spread.
  const baseMidByFeedstock = new Map<string, { vintage: string; mid: number }>();
  for (const r of strip) {
    const m = midOf(r);
    if (m !== null && !baseMidByFeedstock.has(r.feedstock)) {
      baseMidByFeedstock.set(r.feedstock, { vintage: r.vintage, mid: m });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label htmlFor="forward-strip-market" style={{ fontSize: '12px', fontWeight: 700 }}>Market</label>
        <select
          id="forward-strip-market"
          className="input"
          value={market.id}
          onChange={e => setChosen(e.target.value)}
          style={{ minHeight: '36px' }}
        >
          {options.map(m => (
            <option key={m.id} value={m.id}>{m.shortName} · {m.unitLabel}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={() => navigate(buildDealUrl({ marketId: market.id }))}
        >
          Price this in Trade Builder <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
        <Info className="w-3.5 h-3.5" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          Quoted rows only, in {unit}, as the order book holds them. No modelled tenors. Time spread = tenor mid
          minus the first tenor mid of the same feedstock, shown only when both mids exist.
        </span>
      </div>

      {distinctTenors < 2 && (
        <div className="chip chip-warn" style={{ alignSelf: 'flex-start', fontSize: '12px', padding: '6px 10px' }}>
          {distinctTenors === 0
            ? 'No priced tenor — paste a broker run with prices.'
            : `Only ${priced[0].vintage || 'one tenor'} quoted — paste a broker run with forward tenors.`}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Tenor</th>
              <th>Feedstock</th>
              <th style={{ textAlign: 'right' }}>{`Bid (${unit})`}</th>
              <th style={{ textAlign: 'right' }}>{`Offer (${unit})`}</th>
              <th style={{ textAlign: 'right' }}>{`Mid (${unit})`}</th>
              <th style={{ textAlign: 'right' }}>{`Spread vs first (${unit})`}</th>
              <th>Source</th>
              <th>Observed</th>
            </tr>
          </thead>
          <tbody>
            {strip.map(r => {
              const mid = midOf(r);
              const base = baseMidByFeedstock.get(r.feedstock);
              const spread =
                mid !== null && base && base.vintage !== r.vintage ? mid - base.mid : null;
              return (
                <tr key={r.id}>
                  <td className="num" style={{ fontWeight: 700 }}>{r.vintage || '—'}</td>
                  <td>{r.feedstock || '—'}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{fmt(r.bidPriceNumeric, unit)}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{fmt(r.offerPriceNumeric, unit)}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{fmt(mid, unit)}</td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {spread === null ? '—' : `${spread > 0 ? '+' : ''}${spread.toFixed(decimalsFor(unit))}`}
                  </td>
                  <td style={{ fontSize: '11.5px' }}>
                    {r.source || r.derivedFrom || '—'} <span style={{ color: 'var(--color-muted)' }}>· {r.provenanceTier}</span>
                  </td>
                  <td className="num" style={{ fontSize: '11.5px' }}>{r.observedAt || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
