import React from 'react';
import { Link } from 'react-router-dom';
import {
  getAssumption,
  getAssumptionDefinition,
  isOverridden,
  resetAssumption,
  setAssumption,
  AssumptionBasis,
} from '../../domain/assumptions/registry';
import { useAssumptionsVersion } from '../hooks/useAssumptionsVersion';

export const BASIS_LABEL: Record<AssumptionBasis, string> = {
  MARKET_MARK: 'Market mark',
  DESK_ESTIMATE: 'Desk estimate',
  DESK_POLICY: 'Desk policy',
};

interface AssumptionsStripProps {
  keys: string[];
  title?: string;
}

/**
 * Shows, next to an output, the commercial assumptions it depends on — value, basis and
 * source — and lets the trader change them in place. Changes apply everywhere the
 * assumption is used and are kept in this browser.
 */
export function AssumptionsStrip({ keys, title = 'Assumptions used' }: AssumptionsStripProps) {
  useAssumptionsVersion();
  const defs = keys.map(k => getAssumptionDefinition(k)).filter((d): d is NonNullable<typeof d> => !!d);

  return (
    <div
      style={{
        padding: '10px 12px',
        backgroundColor: 'var(--color-subtier)',
        border: '1px solid var(--color-divider)',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span className="eyebrow">{title}</span>
        <Link to="/assumptions" style={{ fontSize: '11px', color: 'var(--color-accent)' }}>
          All assumptions →
        </Link>
      </div>
      {defs.map(d => {
        const overridden = isOverridden(d.key);
        return (
          <div
            key={d.key}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) auto', gap: '8px', alignItems: 'center' }}
            title={d.source}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{d.label}</div>
              <div className="mut" style={{ fontSize: '10px' }}>
                {BASIS_LABEL[d.basis]} · {d.source}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
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
                style={{
                  width: '84px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderColor: overridden ? 'var(--color-accent)' : undefined,
                }}
              />
              <span className="mut">{d.unit}</span>
              {overridden && (
                <button
                  type="button"
                  className="chip"
                  style={{ fontSize: '10px', padding: '1px 6px', cursor: 'pointer' }}
                  onClick={() => resetAssumption(d.key)}
                  title={`Reset to default (${d.defaultValue} ${d.unit})`}
                >
                  reset
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
