import React, { useMemo, useState } from 'react';
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
import { BASIS_LABEL } from '../../shared/components/AssumptionsStrip';

const CATEGORY_LABEL: Record<AssumptionCategory, { title: string; blurb: string }> = {
  FUELEU: {
    title: 'FuelEU Maritime pathways',
    blurb: 'Bio-LNG and pooling economics in the vessel calculator and pathway simulator.',
  },
  FARMGATE: {
    title: 'Farm-gate procurement',
    blurb: 'Estimated producer cost by country, used by the opportunity scanner until a producer quotes.',
  },
  SCANNER: {
    title: 'Plant opportunity scanner',
    blurb: 'Defaults applied to plants whose volume, CI or route is not on record.',
  },
  RISK: {
    title: 'Trade Builder risk suite',
    blurb: 'Fallbacks used for risk notionals and the bundle-price reality check.',
  },
};

const CATEGORIES: AssumptionCategory[] = ['FUELEU', 'FARMGATE', 'SCANNER', 'RISK'];

export function AssumptionsScreen() {
  useAssumptionsVersion();
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
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', backgroundColor: 'var(--color-bg)', padding: '24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '2px solid var(--color-divider)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }} className="font-heading">
              Commercial Assumptions
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', maxWidth: '720px' }} className="mut">
              Every commercial judgement the screens rely on, with where it came from. Statutory values and live
              marks are not here — they are sourced on the Citations and Pricing Desk pages. Changes apply straight
              away across the app and are saved in this browser only.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="search"
              className="input"
              placeholder="Filter…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ fontSize: '12px', width: '200px' }}
            />
            {confirmReset ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '12px' }}
                  onClick={() => { resetAllAssumptions(); setConfirmReset(false); }}
                >
                  Confirm reset {overriddenCount}
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
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
            <section key={cat} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-divider)' }}>
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {CATEGORY_LABEL[cat].title}
                </h2>
                <div className="mut" style={{ fontSize: '11px', marginTop: '2px' }}>{CATEGORY_LABEL[cat].blurb}</div>
              </div>
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
                            <div style={{ fontWeight: 600 }}>{d.label}</div>
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
                          </td>
                          <td className="mut" style={{ fontSize: '11px' }}>{d.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
