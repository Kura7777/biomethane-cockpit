import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ASSUMPTION_DEFINITIONS,
  AssumptionCategory,
  getAssumption,
  isOverridden,
  resetAllAssumptions,
  resetAssumption,
  setAssumption,
} from '../../domain/assumptions/registry';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import './mobileSettings.css';
import { BASIS_LABEL } from '../../shared/components/AssumptionsStrip';
import { REGULATORY_CONSTANT_ROWS } from '../../domain/regulatory/constants';

const CATEGORY_LABEL: Record<AssumptionCategory, { title: string; blurb: string }> = {
  HELPER: {
    title: 'Desk helper (AI assistant)',
    blurb: 'Which Claude model answers in the page helper, and whether it may search the web. Uses your own Anthropic key.',
  },
  DEAL: {
    title: 'Deal defaults',
    blurb: 'Shared volume fallback when a facility publishes no annual output.',
  },
  FUELEU: {
    title: 'FuelEU Maritime pathways',
    blurb: 'Bio-LNG and pooling economics in the vessel calculator and pathway simulator.',
  },
  DEMAND: {
    title: 'Demand sizing (Clients, ETS1, ETS2)',
    blurb: 'Desk heuristics for sizing disclosed supplier gas demand on Clients, the ETS1 gas-share estimate and the ETS2 segment shares.',
  },
  RISK: {
    title: 'Trade Builder risk suite',
    blurb: 'Fallbacks used for risk notionals and the DE THG estimate for CI between −80 and 0.',
  },
  LOGISTICS: {
    title: 'Delivery & logistics estimates',
    blurb: 'Desk estimates for delivery options on the map until a route is quoted.',
  },
  FEEDSTOCK: {
    title: 'Feedstock default CI',
    blurb: 'Default carbon intensity per feedstock, used when the desk has not entered one for a consignment.',
  },
  GGE: {
    title: 'NL green-gas obligation (GGE)',
    blurb: 'Desk inputs for the Dutch GGE trade (GO + PoS bundle). Items marked OPEN are unconfirmed — check them before pricing a deal.',
  },
  COST: {
    title: 'Cost tables',
    blurb: 'Transit tariffs, hub basis spreads and interconnection point tariffs — shown on the Costs tab, not repeated here.',
  },
};

/** An assumption whose source is flagged OPEN is an unconfirmed input the desk must check. */
const isOpenItem = (source: string) => source.startsWith('OPEN');

const CATEGORIES: AssumptionCategory[] = ['DEAL', 'GGE', 'FUELEU', 'DEMAND', 'RISK', 'LOGISTICS', 'FEEDSTOCK', 'HELPER'];

export function AssumptionsScreen() {
  useAssumptionsVersion();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const overriddenCount = ASSUMPTION_DEFINITIONS.filter(d => isOverridden(d.key)).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ASSUMPTION_DEFINITIONS;
    return ASSUMPTION_DEFINITIONS.filter(d =>
      [d.label, d.source, d.usedIn, d.key].some(t => t.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="set-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', backgroundColor: 'var(--color-bg)', padding: '24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '2px solid var(--color-divider)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }} className="font-heading">
              Commercial assumptions
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', maxWidth: '720px' }} className="mut">
              Every commercial judgement the screens rely on, with where it came from. Statutory values and live
              marks are not here — they are sourced on the Citations and Pricing Desk pages. Changes apply straight
              away across the app and are saved in this browser only.
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', maxWidth: '720px' }} className="mut">
              Market prices and desk costs are not set here — see the{' '}
              <Link to="/pricing?tab=prices">Market prices</Link> and{' '}
              <Link to="/pricing?tab=costs">Costs</Link> tabs on this same Pricing desk screen. This tab holds
              desk judgements only.
            </p>
          </div>
          <div className="set-asm-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="search"
              className="input"
              placeholder="Filter…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ fontSize: '12px', width: '200px', borderRadius: 'var(--radius-control)' }}
            />
            {confirmReset ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '12px', borderRadius: 'var(--radius-control)' }}
                  onClick={() => { resetAllAssumptions(); setConfirmReset(false); }}
                >
                  Confirm reset {overriddenCount}
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '12px', borderRadius: 'var(--radius-control)' }} onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', borderRadius: 'var(--radius-control)' }}
                disabled={overriddenCount === 0}
                onClick={() => setConfirmReset(true)}
              >
                Reset all ({overriddenCount} changed)
              </button>
            )}
          </div>
        </div>

        {CATEGORIES.map(cat => {
          const rows = visible.filter(d => d.category === cat);
          if (rows.length === 0) return null;
          return (
            <section key={cat} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-divider)' }}>
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>
                  {CATEGORY_LABEL[cat].title}
                </h2>
                <div className="mut" style={{ fontSize: '11px', marginTop: '2px' }}>{CATEGORY_LABEL[cat].blurb}</div>
              </div>
              {isMobile ? (
                <div className="asm-cards" data-testid="assumptions-cards">
                  {rows.map(d => {
                    const overridden = isOverridden(d.key);
                    return (
                      <div className="asm-card" key={d.key}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{d.label}</div>
                        <div className="mut" style={{ fontSize: '12px', marginTop: '2px' }}>{d.usedIn}</div>
                        <div className="asm-card-value">
                          <input
                            type="number"
                            className="input num"
                            aria-label={d.label}
                            value={getAssumption(d.key)}
                            step="any"
                            min={d.min}
                            max={d.max}
                            onChange={e => {
                              const v = e.target.valueAsNumber;
                              if (Number.isFinite(v)) setAssumption(d.key, v);
                            }}
                            style={{ borderColor: overridden ? 'var(--color-accent)' : undefined }}
                          />
                          <span className="mut">{d.unit}</span>
                          <span className={`chip ${d.basis === 'MARKET_MARK' ? 'chip-pos' : ''}`} style={{ marginLeft: 'auto' }}>
                            {BASIS_LABEL[d.basis]}
                          </span>
                          {isOpenItem(d.source) && <span className="chip chip-warn" title={d.source}>OPEN</span>}
                        </div>
                        {overridden && (
                          <div className="asm-card-reset">
                            <span className="mut">default {d.defaultValue}</span>
                            <button type="button" onClick={() => resetAssumption(d.key)}>
                              Reset
                            </button>
                          </div>
                        )}
                        <div className="mut" style={{ fontSize: '12px', marginTop: '8px' }}>Source: {d.source}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Assumption</th>
                      <th style={{ textAlign: 'right', width: '170px' }}>Value</th>
                      <th style={{ textAlign: 'left', width: '110px' }}>Basis</th>
                      <th style={{ textAlign: 'left' }}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(d => {
                      const overridden = isOverridden(d.key);
                      return (
                        <tr key={d.key}>
                          <td>
                            <div style={{ fontWeight: 600 }} title={d.source}>{d.label}</div>
                            <div className="mut" style={{ fontSize: '10.5px' }}>{d.usedIn}</div>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <input
                              type="number"
                              className="input num"
                              aria-label={d.label}
                              value={getAssumption(d.key)}
                              step="any"
                              min={d.min}
                              max={d.max}
                              onChange={e => {
                                const v = e.target.valueAsNumber;
                                if (Number.isFinite(v)) setAssumption(d.key, v);
                              }}
                              style={{ width: '90px', fontSize: '12px', padding: '2px 6px', textAlign: 'right', borderColor: overridden ? 'var(--color-accent)' : undefined }}
                            />
                            <span className="mut" style={{ marginLeft: '4px' }}>{d.unit}</span>
                            {overridden && (
                              <div style={{ fontSize: '10px', marginTop: '2px' }}>
                                <span className="mut">default {d.defaultValue} · </span>
                                <button
                                  type="button"
                                  onClick={() => resetAssumption(d.key)}
                                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-accent)', cursor: 'pointer', fontSize: '10px' }}
                                >
                                  reset
                                </button>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`chip ${d.basis === 'MARKET_MARK' ? 'chip-pos' : ''}`} style={{ fontSize: '10px' }}>
                              {BASIS_LABEL[d.basis]}
                            </span>
                            {isOpenItem(d.source) && (
                              <span className="chip chip-warn" style={{ fontSize: '10px', marginLeft: '4px' }} title={d.source}>OPEN</span>
                            )}
                          </td>
                          <td className="mut" style={{ fontSize: '11px' }}>{d.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </section>
          );
        })}

        <section style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-divider)' }}>
            <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>Regulatory constants</h2>
            <div className="mut" style={{ fontSize: '11px', marginTop: '2px' }}>
              Statutory numbers, read-only — these are law, not desk judgement. Change them in{' '}
              <code>src/domain/regulatory/constants.ts</code> and their cited source, never here.
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Constant</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Value</th>
                  <th style={{ textAlign: 'left' }}>Citation</th>
                  <th style={{ textAlign: 'left' }}>Used for</th>
                </tr>
              </thead>
              <tbody>
                {REGULATORY_CONSTANT_ROWS.map(r => (
                  <tr key={r.key}>
                    <td style={{ fontWeight: 600 }}>{r.label}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{r.value} <span className="mut">{r.unit}</span></td>
                    <td className="mut" style={{ fontSize: '11px' }}>
                      {r.citation ?? 'citation missing'}
                      {r.url && (
                        <>
                          {' '}
                          <a href={r.url} target="_blank" rel="noopener noreferrer">source</a>
                        </>
                      )}
                    </td>
                    <td className="mut" style={{ fontSize: '11px' }}>{r.usedIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
