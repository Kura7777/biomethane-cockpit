import React from 'react';
import { MARKETS } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { feedstockDefaultCi } from '../../domain/assumptions/registry';
import { ClientRequest } from '../../domain/arbitrage/types';
import {
  Building2,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
  DollarSign,
  Leaf
} from 'lucide-react';

interface Step1OrderIntakeProps {
  request: ClientRequest;
  onChange: (updated: Partial<ClientRequest>) => void;
  onNext: () => void;
}

/** The Step 1 chip text for a buyer's CI ceiling carried in from the hand-off link. Null when unset. */
export function buyerMaxCiLabel(maxCarbonIntensity: number | null): string | null {
  return maxCarbonIntensity === null ? null : `Buyer max CI: ${maxCarbonIntensity} g CO₂e/MJ`;
}

export function Step1OrderIntake({ request, onChange, onNext }: Step1OrderIntakeProps) {
  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE' || m.status === 'EMERGING');

  const applyPreset = (presetKey: 'DE_THG' | 'NL_HBE' | 'FR_CPB' | 'UK_RTFO') => {
    switch (presetKey) {
      case 'DE_THG':
        onChange({
          feedstockKey: 'manure',
          targetMarketId: 'DE_THG',
          volumeMwh: 10000,
          delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
          counterparty: 'German Fuel Supplier',
          notes: 'Standard THG Quota Delivery',
        });
        break;
      case 'NL_HBE':
        onChange({
          feedstockKey: 'food_waste',
          targetMarketId: 'NL_ERE',
          volumeMwh: 15000,
          delivery: { type: 'QUARTER', startDate: '2026-10-01', endDate: '2026-12-31', complianceYear: 2026 },
          counterparty: 'Dutch Obligated Supplier',
          notes: 'HBE Compliance Cargo',
        });
        break;
      case 'FR_CPB':
        onChange({
          feedstockKey: 'agricultural_residues',
          targetMarketId: 'FR_CPB',
          volumeMwh: 8000,
          delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
          counterparty: 'French Gas Supplier',
          notes: 'CPB Compliance Delivery',
        });
        break;
      case 'UK_RTFO':
        onChange({
          feedstockKey: 'sewage_sludge',
          targetMarketId: 'UK_RTFO',
          volumeMwh: 5000,
          delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
          counterparty: 'UK Transport Fuel Obligated Party',
          notes: 'RTFC Green Gas Delivery',
        });
        break;
    }
  };

  return (
    <div className="cf-step max-w-5xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="mb-6">
        <div
          style={{
            borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--color-track)',
            borderColor: 'var(--color-line)',
            color: 'var(--color-text)',
          }}
          className="cf-pill inline-flex items-center gap-2 px-3 py-1 border text-xs font-medium mb-2.5"
        >
          <span style={{ backgroundColor: 'var(--color-accent)' }} className="w-2 h-2 rounded-full" />
          Step 1 of 4: Order intake
        </div>
        <h1 style={{ color: 'var(--color-text)' }} className="text-xl sm:text-2xl font-semibold mb-1.5">
          Receive &amp; configure commercial order
        </h1>
        <p style={{ color: 'var(--color-muted)' }} className="text-xs sm:text-sm font-normal max-w-2xl">
          Enter buyer specifications to scan 1,974+ European biomethane production plants, compute real-time margins, and structure your deal.
        </p>
        {request.counterparty && (
          <div
            style={{
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--color-track)',
              borderColor: 'var(--color-line)',
              color: 'var(--color-text)',
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 border text-xs font-medium mt-2"
            data-testid="step1-buyer-chip"
          >
            <Building2 className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
            Buyer: {request.counterparty}
          </div>
        )}
        {request.constraints.maxCarbonIntensity !== null && (
          <div
            style={{
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--color-track)',
              borderColor: 'var(--color-line)',
              color: 'var(--color-text)',
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 border text-xs font-medium mt-2 ml-2"
            data-testid="step1-max-ci-chip"
          >
            <Leaf className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
            {buyerMaxCiLabel(request.constraints.maxCarbonIntensity)}
          </div>
        )}
      </div>

      {/* Quick RFQ Presets */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
        }}
        className="border p-4 mb-5 shadow-xs"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <span
            style={{ color: 'var(--color-text)' }}
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
            Quick RFQ presets
          </span>
          <span style={{ color: 'var(--color-muted)' }} className="text-xs font-normal">
            Click to auto-populate standard industry trade requests
          </span>
        </div>
        <div className="cf-presets grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => applyPreset('DE_THG')}
            style={{
              borderRadius: 'var(--radius-control)',
              borderColor: request.targetMarketId === 'DE_THG' && request.feedstockKey === 'manure'
                ? 'var(--color-accent)'
                : 'var(--color-line)',
              backgroundColor: request.targetMarketId === 'DE_THG' && request.feedstockKey === 'manure'
                ? 'var(--color-track)'
                : 'var(--color-bg)',
            }}
            className="p-3 border text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">🇩🇪 DE THG Quota</span>
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-muted)',
                }}
                className="text-[10px] font-medium px-1.5 py-0.5"
              >
                10k MWh
              </span>
            </div>
            <div style={{ color: 'var(--color-muted)' }} className="text-[11px]">Animal manure (-100 CI)</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('NL_HBE')}
            style={{
              borderRadius: 'var(--radius-control)',
              borderColor: request.targetMarketId === 'NL_ERE' && request.feedstockKey === 'food_waste'
                ? 'var(--color-accent)'
                : 'var(--color-line)',
              backgroundColor: request.targetMarketId === 'NL_ERE' && request.feedstockKey === 'food_waste'
                ? 'var(--color-track)'
                : 'var(--color-bg)',
            }}
            className="p-3 border text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">🇳🇱 NL HBE Quota</span>
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-muted)',
                }}
                className="text-[10px] font-medium px-1.5 py-0.5"
              >
                15k MWh
              </span>
            </div>
            <div style={{ color: 'var(--color-muted)' }} className="text-[11px]">Bio-waste &amp; food waste</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('FR_CPB')}
            style={{
              borderRadius: 'var(--radius-control)',
              borderColor: request.targetMarketId === 'FR_CPB' && request.feedstockKey === 'agricultural_residues'
                ? 'var(--color-accent)'
                : 'var(--color-line)',
              backgroundColor: request.targetMarketId === 'FR_CPB' && request.feedstockKey === 'agricultural_residues'
                ? 'var(--color-track)'
                : 'var(--color-bg)',
            }}
            className="p-3 border text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">🇫🇷 FR CPB Quota</span>
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-muted)',
                }}
                className="text-[10px] font-medium px-1.5 py-0.5"
              >
                8k MWh
              </span>
            </div>
            <div style={{ color: 'var(--color-muted)' }} className="text-[11px]">Agricultural residues / straw</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('UK_RTFO')}
            style={{
              borderRadius: 'var(--radius-control)',
              borderColor: request.targetMarketId === 'UK_RTFO' && request.feedstockKey === 'sewage_sludge'
                ? 'var(--color-accent)'
                : 'var(--color-line)',
              backgroundColor: request.targetMarketId === 'UK_RTFO' && request.feedstockKey === 'sewage_sludge'
                ? 'var(--color-track)'
                : 'var(--color-bg)',
            }}
            className="p-3 border text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">🇬🇧 UK RTFO Scheme</span>
              <span
                style={{
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-muted)',
                }}
                className="text-[10px] font-medium px-1.5 py-0.5"
              >
                5k MWh
              </span>
            </div>
            <div style={{ color: 'var(--color-muted)' }} className="text-[11px]">Sewage &amp; sludge waste</div>
          </button>
        </div>
      </div>

      {/* Main Order Form */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
        }}
        className="border p-5 sm:p-6 shadow-xs space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Buyer Market */}
          <div>
            <label
              style={{ color: 'var(--color-text)' }}
              className="block text-xs font-medium mb-1.5"
            >
              1. Buyer destination market
            </label>
            <select
              value={request.targetMarketId}
              onChange={e => onChange({ targetMarketId: e.target.value })}
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
                color: 'var(--color-text)',
              }}
              className="w-full border px-3 py-2 text-xs font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="ANY">🌐 Any European Market (Multi-Scan)</option>
              {activeMarkets.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.country})
                </option>
              ))}
            </select>
            <span style={{ color: 'var(--color-muted)' }} className="text-[11px] mt-1 block">
              Specifies the compliance offtake territory &amp; statutory quota regulations
            </span>
          </div>

          {/* Volume */}
          <div>
            <label
              style={{ color: 'var(--color-text)' }}
              className="block text-xs font-medium mb-1.5"
            >
              2. Order volume (MWh)
            </label>
            <div className="relative">
              <input
                type="number"
                min="500"
                step="500"
                value={request.volumeMwh ?? 10000}
                onChange={e => onChange({ volumeMwh: e.target.value ? Number(e.target.value) : null })}
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                  color: 'var(--color-text)',
                }}
                className="w-full border px-3 py-2 text-xs font-medium focus:outline-hidden tabular-nums"
                placeholder="e.g. 10000"
              />
              <span
                style={{ color: 'var(--color-muted)' }}
                className="cf-unit absolute right-3 top-2 text-[11px] font-medium"
              >
                MWh
              </span>
            </div>
            <span style={{ color: 'var(--color-muted)' }} className="text-[11px] mt-1 block">
              {(request.volumeMwh || 10000) >= 1000 ? `${((request.volumeMwh || 10000) / 1000).toFixed(1)} GWh total trade volume` : 'Standard parcel'}
            </span>
          </div>

          {/* Feedstock */}
          <div>
            <label
              style={{ color: 'var(--color-text)' }}
              className="block text-xs font-medium mb-1.5"
            >
              3. Feedstock / substrate type
            </label>
            <select
              value={request.feedstockKey}
              onChange={e => onChange({ feedstockKey: e.target.value })}
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
                color: 'var(--color-text)',
              }}
              className="w-full border px-3 py-2 text-xs font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="ANY">🌱 Any Annex IX Feedstock</option>
              {Object.entries(FEEDSTOCK_REGISTRY).map(([k, f]) => (
                <option key={k} value={k}>
                  {f.name} (Default CI: {feedstockDefaultCi(k) ?? f.defaultCI} gCO₂e/MJ)
                </option>
              ))}
            </select>
            <span style={{ color: 'var(--color-muted)' }} className="text-[11px] mt-1 block">
              Determines greenhouse gas abatement and compliance certificate multiplier
            </span>
          </div>

          {/* Delivery Period */}
          <div>
            <label
              style={{ color: 'var(--color-text)' }}
              className="block text-xs font-medium mb-1.5"
            >
              4. Delivery window
            </label>
            <select
              value={request.delivery.type || 'MONTH'}
              onChange={e => onChange({
                delivery: {
                  ...request.delivery,
                  type: e.target.value as any,
                  complianceYear: 2026
                }
              })}
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
                color: 'var(--color-text)',
              }}
              className="w-full border px-3 py-2 text-xs font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="MONTH">📅 Front Month (M+1 Delivery)</option>
              <option value="QUARTER">📊 Front Quarter (Q+1 Delivery)</option>
              <option value="CALENDAR">📆 Calendar Year 2026</option>
              <option value="CUSTOM">📝 Spot / Immediate Delivery</option>
            </select>
            <span style={{ color: 'var(--color-muted)' }} className="text-[11px] mt-1 block">
              Surrender deadline: Compliance Year 2026
            </span>
          </div>
        </div>

        {/* CI override */}
        <div>
          <label
            style={{ color: 'var(--color-text)' }}
            className="block text-xs font-medium mb-1.5"
          >
            5. Assume plant CI (g CO₂e/MJ) — optional
          </label>
          <input
            type="number"
            value={request.ciOverride ?? ''}
            onChange={e => onChange({ ciOverride: e.target.value === '' ? null : Number(e.target.value) })}
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--color-text)',
            }}
            className="w-full max-w-xs border px-3 py-2 text-xs font-medium focus:outline-hidden tabular-nums"
            placeholder="each plant's own CI"
            data-testid="ci-override-input"
          />
          <span style={{ color: 'var(--color-muted)' }} className="text-[11px] mt-1 block">
            {request.ciOverride !== null && request.ciOverride !== undefined
              ? `Replaces every plant's own CI with ${request.ciOverride} (your assumption) for this order.`
              : 'Leave empty to use each plant’s own carbon intensity, as today.'}
          </span>
        </div>

        {/* Action Button & Configuration Summary Bar */}
        <div
          style={{ borderColor: 'var(--color-line)' }}
          className="m-sticky-actions cf-actions cf-actions-col pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div style={{ color: 'var(--color-muted)' }} className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-status-pass-ink)' }} />
            <span>Configured for <strong>1,974+</strong> real European biomethane production plants</span>
          </div>
          <button
            type="button"
            onClick={onNext}
            style={{
              backgroundColor: 'var(--color-accent)',
              borderRadius: 'var(--radius-control)',
              color: '#ffffff',
            }}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold transition-all shadow-xs hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Scan European plants</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
