import React from 'react';
import { Link } from 'react-router-dom';
import {
  getAssumptionDefinition,
  isOverridden,
  resetAssumption,
  AssumptionBasis,
} from '../../domain/assumptions/registry';
import { AssumptionInput } from './AssumptionInput';
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
    <div className="ds-assumptions">
      <div className="ds-assumptions-head">
        <span className="eyebrow">{title}</span>
        <Link to="/pricing?tab=assumptions" className="ds-assumptions-link">
          All assumptions →
        </Link>
      </div>
      {defs.map(d => {
        const overridden = isOverridden(d.key);
        return (
          <div key={d.key} className="ds-assumptions-row" title={d.source}>
            <div className="ds-assumptions-text">
              <div className="ds-assumptions-label">{d.label}</div>
              <div className="ds-assumptions-source">
                {BASIS_LABEL[d.basis]} · {d.source}
              </div>
            </div>
            <div className="ds-assumptions-control">
              <AssumptionInput assumptionKey={d.key} label={d.label} min={d.min} max={d.max} className={`input num ${overridden ? 'overridden' : ''}`} />
              <span className="mut">{d.unit}</span>
              {overridden && (
                <button
                  type="button"
                  className="chip ds-assumptions-reset"
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
