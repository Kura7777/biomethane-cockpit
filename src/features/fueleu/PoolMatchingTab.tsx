import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { FUEL_EU_SHIPPING_GROUPS } from '../../domain/fueleu/groups';
import { buildPoolBook, PoolSurplusParty, PoolDeficitParty } from '../../domain/fueleu/poolMatching';
import { getAssumption, fuelEuPoolBidPriceEurPerTco2e } from '../../domain/assumptions/registry';
import { FUELEU_POOLING_BORROWING_DATABASE_DEADLINE } from '../../domain/fueleu/calculator';
import { PoolPriceMark } from './PoolPriceMark';
import { FuelEuPoolIndexChart } from './FuelEuPoolIndexChart';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const TOP_N_OPTIONS = [5, 10, 20, 50] as const;

export interface PoolMatchingTabProps {
  /** Group id to highlight and, if it's a deficit group, ensure is included in the top-N slice
   *  (used by the Directory side panel's "Add to pool" action). */
  highlightGroupId?: string | null;
}

export function PoolMatchingTab({ highlightGroupId }: PoolMatchingTabProps = {}) {
  const [topDeficitCount, setTopDeficitCount] = useState<number>(10);

  useEffect(() => {
    if (!highlightGroupId) return;
    const sorted = [...FUEL_EU_SHIPPING_GROUPS]
      .filter(g => g.sumOfCompanyBalances2026 < 0)
      .sort((a, b) => a.sumOfCompanyBalances2026 - b.sumOfCompanyBalances2026);
    const rank = sorted.findIndex(g => g.id === highlightGroupId);
    if (rank >= 0) {
      setTopDeficitCount(prev => Math.max(prev, rank + 1));
    }
  }, [highlightGroupId]);

  const offer = getAssumption('fueleu.poolBuyPriceEurPerTco2e');
  const bid = fuelEuPoolBidPriceEurPerTco2e();

  const surplusParties: PoolSurplusParty[] = useMemo(
    () =>
      FUEL_EU_SHIPPING_GROUPS.filter(g => g.sumOfCompanyBalances2026 > 0).map(g => ({
        id: g.id,
        name: g.name,
        surplusTco2e: g.sumOfCompanyBalances2026,
      })),
    []
  );

  const allDeficitParties: PoolDeficitParty[] = useMemo(
    () =>
      FUEL_EU_SHIPPING_GROUPS.filter(g => g.sumOfCompanyBalances2026 < 0)
        .sort((a, b) => a.sumOfCompanyBalances2026 - b.sumOfCompanyBalances2026)
        .map(g => ({
          id: g.id,
          name: g.name,
          deficitTco2e: Math.abs(g.sumOfCompanyBalances2026),
          annexIvPenaltyEur: g.sumOfCompanyPenalties2026,
        })),
    []
  );

  const deficitParties = useMemo(() => allDeficitParties.slice(0, topDeficitCount), [allDeficitParties, topDeficitCount]);

  const book = useMemo(
    () => buildPoolBook({ surplusParties, deficitParties, offerEurPerTco2e: offer, bidEurPerTco2e: bid }),
    [surplusParties, deficitParties, offer, bid]
  );

  const deadlineLabel = new Date(`${FUELEU_POOLING_BORROWING_DATABASE_DEADLINE}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', lineHeight: 1.5, maxWidth: '620px' }}>
          Article 21 group-level pool sizing (indicative). Greedy largest-surplus-to-largest-deficit matching, priced at the live desk offer/bid. Every figure on this tab is <strong>indicative</strong> — not a filed pool.
        </div>
        <PoolPriceMark variant="block" />
      </div>

      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
        <FuelEuPoolIndexChart />
      </div>

      <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>Top deficit groups to include:</span>
        <div className="seg" role="group" aria-label="Number of deficit groups to include">
          {TOP_N_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              className={`seg-opt ${topDeficitCount === n ? 'active' : ''}`}
              style={{ height: '28px', fontSize: '11px', padding: '0 10px', fontWeight: 600 }}
              onClick={() => setTopDeficitCount(n)}
            >
              Top {n}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>
          ({allDeficitParties.length} deficit groups total · {surplusParties.length} surplus groups available)
          {!(TOP_N_OPTIONS as readonly number[]).includes(topDeficitCount) && ` · Top ${topDeficitCount} (custom, includes highlighted group)`}
        </span>
      </div>

      {/* Pool validity + summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ padding: '10px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>MATCHED VOLUME</span>
          <div className="num font-mono" style={{ fontSize: '19px', fontWeight: 800, marginTop: '2px' }}>
            {(book.matchedVolumeTco2e / 1000).toFixed(1)} kt
          </div>
        </div>
        <div style={{ padding: '10px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>UNMATCHED DEFICIT</span>
          <div className="num font-mono" style={{ fontSize: '19px', fontWeight: 800, marginTop: '2px', color: book.unmatchedDeficitTco2e > 0 ? 'var(--color-status-neg-text)' : 'var(--color-status-pos-text)' }}>
            {(book.unmatchedDeficitTco2e / 1000).toFixed(1)} kt
          </div>
        </div>
        <div style={{ padding: '10px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>DESK SPREAD EARNED</span>
          <div className="num font-mono" style={{ fontSize: '19px', fontWeight: 800, marginTop: '2px' }}>
            €{(book.deskSpreadEarnedEur / 1e6).toFixed(2)}M
          </div>
          <div className="subttl" style={{ fontSize: '10px', marginTop: '2px' }}>internal — offer minus bid, indicative</div>
        </div>
        <div style={{ padding: '10px 18px', borderRight: '1px solid var(--color-divider)' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>POOL BALANCE</span>
          <div className="num font-mono" style={{ fontSize: '19px', fontWeight: 800, marginTop: '2px', color: book.isValidPool ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
            {book.poolBalanceTco2e >= 0 ? '+' : ''}{(book.poolBalanceTco2e / 1000).toFixed(1)} kt
          </div>
        </div>
        <div style={{ padding: '10px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: book.isValidPool ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}
            title="Art. 21: a pool is valid only if the total pooled compliance balance is ≥ 0. A ship may be in only one pool per reporting period. The verifier must record the pool's definitive composition by the statutory deadline."
          >
            {book.isValidPool ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {book.isValidPool ? 'Valid pool (Art. 21)' : 'Not valid as one pool (Art. 21)'}
          </div>
          {!book.isValidPool && book.matchedVolumeTco2e > 0 && (
            <div className="subttl" style={{ fontSize: '9.5px', marginTop: '2px', color: 'var(--color-status-pos-text)' }}>
              Matched portion only ({(book.matchedVolumeTco2e / 1000).toFixed(1)} kt) balances to 0 — valid if limited to it (partly matched buyers pool only part of their fleet)
            </div>
          )}
          <div className="subttl" style={{ fontSize: '9.5px', marginTop: '2px' }}>Record by {deadlineLabel} (Art. 21(8))</div>
        </div>
      </div>

      <div
        style={{
          padding: '6px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-panel-header)',
          fontSize: '10.5px',
          color: 'var(--color-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Info size={11} style={{ flexShrink: 0 }} />
        Art. 21: pool total balance must be ≥ 0 for validity; a ship can be included in only one pool per reporting period; the selected verifier records the pool's definitive composition and allocation in the FuelEU database by {deadlineLabel}.
      </div>

      {/* Two-column seller/buyer ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Sellers (surplus groups) */}
        <div style={{ borderRight: '1px solid var(--color-divider)' }}>
          <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)', fontWeight: 700, fontSize: '11px' }}>
            SURPLUS GROUPS (SELLERS) — proceeds at bid €{bid.toFixed(2)}/tCO2e, indicative
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '10.5px' }}>GROUP</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: '10.5px' }}>SURPLUS</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: '10.5px' }}>MATCHED</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: '10.5px' }}>PROCEEDS</th>
                </tr>
              </thead>
              <tbody>
                {book.surplusAllocations
                  .filter(a => a.matchedTco2e > 0)
                  .sort((a, b) => b.matchedTco2e - a.matchedTco2e)
                  .map(a => (
                    <tr key={a.id} className={a.id === highlightGroupId ? 'selrow' : undefined}>
                      <td style={{ padding: '5px 10px', fontSize: '11px' }}>{a.name}</td>
                      <td className="num font-mono" style={{ textAlign: 'right', padding: '5px 10px', fontSize: '11px' }}>{Math.round(a.surplusTco2e).toLocaleString()}</td>
                      <td className="num font-mono" style={{ textAlign: 'right', padding: '5px 10px', fontSize: '11px', fontWeight: 700, color: 'var(--color-status-pos-text)' }}>{Math.round(a.matchedTco2e).toLocaleString()}</td>
                      <td className="num font-mono" style={{ textAlign: 'right', padding: '5px 10px', fontSize: '11px' }}>€{Math.round(a.proceedsAtBidEur).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buyers (deficit groups) */}
        <div>
          <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-panel-header)', fontWeight: 700, fontSize: '11px' }}>
            DEFICIT GROUPS (BUYERS) — cost at offer €{offer.toFixed(2)}/tCO2e vs Annex IV penalty, indicative
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '10.5px' }}>GROUP</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: '10.5px' }}>DEFICIT</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: '10.5px' }}>COST @ OFFER</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: '10.5px' }}>ANNEX IV PENALTY</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: '10.5px' }}>SAVING</th>
                </tr>
              </thead>
              <tbody>
                {book.deficitAllocations.map(a => (
                  <tr key={a.id} className={a.id === highlightGroupId ? 'selrow' : undefined}>
                    <td style={{ padding: '5px 10px', fontSize: '11px' }}>{a.name}</td>
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '5px 10px', fontSize: '11px' }}>{Math.round(a.deficitTco2e).toLocaleString()}</td>
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '5px 10px', fontSize: '11px' }}>€{Math.round(a.costAtOfferEur).toLocaleString()}</td>
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '5px 10px', fontSize: '11px', color: 'var(--color-status-warn-text, #d97706)' }}>€{Math.round(a.annexIvPenaltyEur).toLocaleString()}</td>
                    <td className="num font-mono" style={{ textAlign: 'right', padding: '5px 10px', fontSize: '11px', fontWeight: 700, color: a.savingEur >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                      {a.savingEur >= 0 ? '+' : ''}€{Math.round(a.savingEur).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {book.unmatchedDeficitTco2e > 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '6px 10px', fontSize: '10.5px', color: 'var(--color-status-neg-text)' }}>
                      {Math.round(book.unmatchedDeficitTco2e).toLocaleString()} tCO2e of deficit remains unmatched at this surplus pool size — indicative.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
