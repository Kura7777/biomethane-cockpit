import React from 'react';
import { useAppState } from '../../store/context';
import { ProducerPricing } from '../../domain/netback/types';
import { SIMULATED_SOURCE_NAME } from '../../domain/marks/simulate';
import { CostFieldSource } from '../../store/context';

interface ScalarCostField {
  key: 'transferCosts' | 'certificationCosts' | 'logistics' | 'otherCosts' | 'greenAlpha' | 'sdeCorrectionBaselineEurMwh';
  label: string;
  unit: string;
  usedFor: string;
  min?: number;
  step?: string;
}

const SCALAR_FIELDS: ScalarCostField[] = [
  {
    key: 'transferCosts',
    label: 'Registry transfer',
    unit: '€/MWh',
    usedFor: 'Netback engine: deducted from every certificate value as a standard cost (Trade Builder waterfall "Transfer & registry").',
    min: 0,
    step: '0.01',
  },
  {
    key: 'certificationCosts',
    label: 'Certification',
    unit: '€/MWh',
    usedFor: 'Netback engine: deducted from every certificate value (Trade Builder waterfall "Certification").',
    min: 0,
    step: '0.01',
  },
  {
    key: 'logistics',
    label: 'Logistics',
    unit: '€/MWh',
    usedFor: 'Netback engine: base transit/logistics cost. The Trade Builder replaces this with the origin→market corridor transit tariff when one exists; this value is the fallback when it does not.',
    min: 0,
    step: '0.01',
  },
  {
    key: 'otherCosts',
    label: 'Other costs',
    unit: '€/MWh',
    usedFor: 'Netback engine: deducted from every certificate value when set (Trade Builder waterfall "Other costs").',
    min: 0,
    step: '0.01',
  },
  {
    key: 'greenAlpha',
    label: 'Green attribute alpha (Leg B)',
    unit: '×',
    usedFor: 'Netback engine: dynamic sensitivity multiplier on the certificate value (default 1.0 = no adjustment). Statutory ceilings (e.g. French CPB) still apply after it.',
    min: 0,
    step: '0.01',
  },
  {
    key: 'sdeCorrectionBaselineEurMwh',
    label: 'Dutch SDE++ correction baseline',
    unit: '€/MWh',
    usedFor: 'Not currently read by any engine — the field exists on CostInputs but nothing consumes it yet.',
    step: '0.01',
  },
];

function SourceTag({ source }: { source: CostFieldSource }) {
  return (
    <span
      className={`chip ${source === 'SIMULATED' ? 'chip-warn' : 'chip-pos'}`}
      style={{ fontSize: '11px', padding: '1px 6px' }}
    >
      {source === 'SIMULATED' ? 'Simulated' : 'Manual'}
    </span>
  );
}

export function CostsScreen() {
  const { state, dispatch } = useAppState();
  const costs = state.costs;
  const costsSource = state.costsSource;

  const setScalar = (key: ScalarCostField['key'], raw: string) => {
    if (raw === '') {
      dispatch({ type: 'SET_COSTS', costs: { [key]: null } as any });
      return;
    }
    const v = Number(raw);
    if (Number.isFinite(v)) {
      dispatch({ type: 'SET_COSTS', costs: { [key]: v } as any });
    }
  };

  const producerPricing = costs.producerPricing ?? null;
  const producerSource: CostFieldSource = producerPricing?.source === SIMULATED_SOURCE_NAME ? 'SIMULATED' : 'MANUAL';

  const setProducerPricing = (patch: Partial<ProducerPricing>) => {
    const current = producerPricing;
    dispatch({
      type: 'SET_COSTS',
      costs: {
        producerPricing: {
          mode: current?.mode ?? 'INDEX_LINKED',
          fixedPriceEurPerMwh: current?.fixedPriceEurPerMwh ?? null,
          indexLinkedShare: current?.indexLinkedShare ?? null,
          source: current?.source ?? null,
          lastVerified: current?.lastVerified ?? null,
          confidence: current?.confidence ?? 'UNVERIFIED',
          ...patch,
        },
      },
    });
  };

  return (
    <div style={{ padding: '16px 18px 24px', maxWidth: '960px' }}>
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Deal costs</h2>
        <p className="mut" style={{ margin: '4px 0 0', fontSize: '12px', maxWidth: '720px' }}>
          Every field on <code>state.costs</code>, used by the netback engine on every deal. Changes apply
          immediately everywhere a deal is priced — Origination, the Trade Builder and the blotter all read
          from here through the same <code>SET_COSTS</code> action.
        </p>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)' }}>
        <table className="table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Cost</th>
              <th style={{ textAlign: 'right', width: '140px' }}>Value</th>
              <th style={{ textAlign: 'center', width: '100px' }}>Source</th>
              <th style={{ textAlign: 'left' }}>Used for</th>
            </tr>
          </thead>
          <tbody>
            {SCALAR_FIELDS.map(f => {
              const value = costs[f.key as keyof typeof costs] as number | null | undefined;
              return (
                <tr key={f.key}>
                  <td style={{ fontWeight: 600 }}>{f.label}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <input
                      type="number"
                      className="input num"
                      aria-label={f.label}
                      value={value ?? ''}
                      step={f.step}
                      min={f.min}
                      placeholder="—"
                      onChange={e => setScalar(f.key, e.target.value)}
                      style={{ width: '90px', fontSize: '12px', padding: '2px 6px', textAlign: 'right' }}
                    />
                    <span className="mut" style={{ marginLeft: '4px', fontSize: '11px' }}>{f.unit}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <SourceTag source={costsSource?.[f.key] ?? 'MANUAL'} />
                  </td>
                  <td className="mut" style={{ fontSize: '11px' }}>{f.usedFor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section style={{ marginTop: '18px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-divider)' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>Producer pricing</h3>
          <div className="mut" style={{ fontSize: '11px', marginTop: '2px' }}>
            What the desk pays the producer on this deal. A per-deal input, not a desk-wide cost — also
            editable from the Trade Builder's deal ticket while you build a deal.
          </div>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="eyebrow">Mode</span>
            <select
              className="input"
              value={producerPricing?.mode ?? 'INDEX_LINKED'}
              onChange={e => setProducerPricing({ mode: e.target.value as ProducerPricing['mode'] })}
              style={{ fontSize: '12px', width: '180px' }}
            >
              <option value="INDEX_LINKED">Index-linked (share of value stack)</option>
              <option value="FIXED_PRICE">Fixed price</option>
            </select>
            <SourceTag source={producerSource} />
          </div>
          {producerPricing?.mode === 'FIXED_PRICE' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '220px' }}>
              <span className="eyebrow">Fixed price (€/MWh)</span>
              <input
                type="number"
                className="input num"
                step="0.01"
                value={producerPricing.fixedPriceEurPerMwh ?? ''}
                onChange={e => {
                  const v = e.target.valueAsNumber;
                  if (!isNaN(v)) setProducerPricing({ fixedPriceEurPerMwh: v });
                }}
              />
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '220px' }}>
              <span className="eyebrow">Producer share (%)</span>
              <input
                type="number"
                className="input num"
                step="0.1"
                value={producerPricing?.indexLinkedShare != null ? Number((producerPricing.indexLinkedShare * 100).toFixed(1)) : ''}
                onChange={e => {
                  const pct = e.target.valueAsNumber;
                  if (!isNaN(pct)) setProducerPricing({ indexLinkedShare: Math.max(0, Math.min(1, pct / 100)) });
                }}
              />
            </label>
          )}
          <div className="mut" style={{ fontSize: '11px' }}>
            Used for: netback engine — producer payable and desk margin on every deal (Origination, Trade
            Builder, blotter).
          </div>
        </div>
      </section>
    </div>
  );
}
