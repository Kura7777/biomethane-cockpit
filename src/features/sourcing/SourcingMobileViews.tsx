import React from 'react';
import { MobileCardList, MobileCard, Sheet } from '../../shared/ui';
import type { GateResult } from '../../domain/eligibility/types';
import type { StrategyEvaluation } from '../../domain/valuation/strategyEngine';
import type { BiomethanePlant } from '../../domain/plants/types';
import type { OriginCorridorRow } from './SourcingOriginationDesk';
import './sourcingMobile.css';

/**
 * Phone renderings of the /desk tables. Every figure and formatter below is the same expression the
 * desktop table row uses (SourcingOriginationDesk.tsx); only the layout differs. Desktop never
 * renders anything from this file.
 */

export const GATE_LETTERS = ['S', 'U', 'M', 'A', 'G', 'N'];
export const GATE_TITLES = [
  'Scheme recognition',
  'UDB grid ingestion',
  'Mass balance custody',
  'Annex IX feedstock',
  'GHG saving threshold',
  'Member state specifics',
];

const POS = 'var(--color-pnl-pos, var(--color-accent))';

export function GateChips({ gates }: { gates: GateResult[] | undefined }) {
  if (!gates) return null;
  return (
    <span className="sd-gates" role="img" aria-label="RED III gates">
      {gates.map((g, gIdx) => {
        const isPass = g.verdict === 'PASS';
        const isHard = g.verdict === 'HARD_BLOCK';
        const soft = !isPass && !isHard;
        return (
          <span
            key={gIdx}
            title={`${GATE_TITLES[gIdx]} — ${isPass ? 'Pass' : isHard ? 'Hard block' : 'Conditional / unresolved'}`}
            className="sd-gate"
            style={{
              backgroundColor: isHard ? 'var(--color-accent)' : soft ? 'var(--color-neutral-300)' : 'transparent',
              color: isHard ? 'var(--color-bg)' : soft ? 'var(--color-neutral-900)' : 'var(--color-text)',
              border: `1px solid ${isHard ? 'var(--color-accent)' : 'var(--color-divider)'}`,
            }}
          >
            {GATE_LETTERS[gIdx]}
          </span>
        );
      })}
    </span>
  );
}

/* ─────────────── Strategy blotter (Asset Deal Calculator) ─────────────── */

export function StrategyCards({
  evaluations,
  winningId,
  activeId,
  onSelect,
}: {
  evaluations: StrategyEvaluation[];
  winningId: string;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <MobileCardList
      testId="sd-strategy-cards"
      items={evaluations}
      getKey={s => s.strategyId}
      selectedKey={activeId}
      onSelect={s => onSelect(s.strategyId)}
      title={s => s.strategyName}
      subtitle={s => s.targetMarket}
      metric={s =>
        s.isEligible ? (
          <span style={{ color: s.netDeskMarginEurPerMWh > 0 ? POS : 'inherit' }}>+€{s.netDeskMarginEurPerMWh.toFixed(2)}</span>
        ) : (
          '—'
        )
      }
      metricLabel={() => 'Desk margin /MWh'}
      badges={s => (
        <>
          {s.strategyId === winningId && <span className="chip chip-pos" style={{ fontWeight: 800 }}>WINNING</span>}
          <span className="chip">{s.category.replace('_', ' ')}</span>
          <span className="chip">{s.deliveryModel === 'UNBUNDLED_CERTIFICATE_ONLY' ? '📦 Book & Claim' : '⚡ Mass Balance'}</span>
          <span className={`chip ${s.subsidyAction === 'SUPPORT_SWITCH_OFF' ? 'chip-warn' : 'chip-info'}`}>
            {s.subsidyAction === 'SUPPORT_SWITCH_OFF' ? '⚡ Switch Off' : '🛡️ Retain Subsidy'}
          </span>
          {s.isEligible ? (
            <span className="chip chip-pos">Pass</span>
          ) : (
            <span className="chip chip-neg" title={s.ineligibilityReason}>Ineligible</span>
          )}
        </>
      )}
      fields={s => [
        { label: 'Gross Value', mono: true, value: s.isEligible ? `€${s.grossDeliveredValueEurMwh.toFixed(2)}` : '—' },
        { label: 'Transit & Fees', mono: true, tone: 'muted', value: s.isEligible ? `-€${(s.transitAndLogisticsEurMwh + s.structuringFeeEurMwh).toFixed(2)}` : '—' },
        { label: 'Net Delivered', mono: true, value: s.isEligible ? `€${s.netDeliveredEurMwh.toFixed(2)}` : '—' },
        { label: 'Producer Bid', mono: true, value: s.isEligible ? `€${s.recommendedBidToProducerEurMwh.toFixed(2)}` : '—' },
        {
          label: 'Uplift',
          mono: true,
          tone: s.producerIncentiveDeltaEurMwh > 0 ? 'pos' : undefined,
          value: s.isEligible ? `+€${s.producerIncentiveDeltaEurMwh.toFixed(2)}` : '—',
        },
        {
          label: 'Annual P&L',
          mono: true,
          tone: s.annualDeskPnLEur > 0 ? 'pos' : undefined,
          value: s.isEligible ? `+€${s.annualDeskPnLEur.toLocaleString()}` : '—',
        },
      ]}
    />
  );
}

/* ─────────────── Origin corridors ─────────────── */

export function corridorMarginLabel(row: OriginCorridorRow): React.ReactNode {
  const margin = row.deskNetMarginEurPerMWh;
  return margin !== null ? (
    <span style={{ color: margin > 0 ? 'var(--color-accent-700)' : 'inherit' }}>+€{margin.toFixed(2)}</span>
  ) : (
    <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>BLOCKED</span>
  );
}

function corridorFields(row: OriginCorridorRow) {
  return [
    {
      label: 'Corridor & Route',
      span: 2 as const,
      value: (
        <>
          <strong>{row.originCode} → {row.targetCountry} ({row.distanceKm} km)</strong>
          <div className="mut" style={{ fontSize: '12px' }}>{row.routeHops.join(' → ')}</div>
        </>
      ),
    },
    { label: 'Transit Tariff', mono: true, tone: 'muted' as const, value: `€${row.transitTariffEurPerMWh.toFixed(2)}` },
    { label: 'Delivered', mono: true, value: row.deliveredCostEurPerMWh !== null ? `€${row.deliveredCostEurPerMWh.toFixed(2)}` : '—' },
    { label: 'Deal Profit', mono: true, value: row.totalDealProfitEur !== null ? `€${Math.round(row.totalDealProfitEur).toLocaleString()}` : '—' },
    { label: 'Plants', value: `${row.matchingPlants.length} plants` },
  ];
}

export function CorridorCards({
  rows,
  selectedId,
  onOpen,
}: {
  rows: OriginCorridorRow[];
  selectedId: string;
  onOpen: (row: OriginCorridorRow) => void;
}) {
  return (
    <MobileCardList
      testId="sd-corridor-cards"
      items={rows}
      getKey={r => r.originCode}
      selectedKey={selectedId}
      onSelect={onOpen}
      title={r => (
        <>
          <span style={{ marginRight: 6 }}>{r.originFlag}</span>
          {r.originName}
        </>
      )}
      subtitle={r => `${r.primaryRegistry} · ${r.gridZone === 'EU_INTERCONNECTED' ? 'EU Grid' : 'Non-EU Grid'}`}
      metric={corridorMarginLabel}
      metricLabel={() => 'Desk margin /MWh'}
      badges={r => <GateChips gates={r.eligibility.gates} />}
      fields={corridorFields}
    />
  );
}

export function PlantDetailFields(plant: BiomethanePlant, tso?: string) {
  return [
    { label: 'Operating Entity', span: 2 as const, value: plant.operator || plant.legalEntityName || <em style={{ opacity: 0.65 }}>Operator unrecorded</em> },
    { label: 'Origin & Hub', value: `${plant.countryFlag} ${plant.country}${plant.region ? ` · ${plant.region}` : ''}` },
    { label: 'TSO / Grid Node', value: `${plant.networkOperator || tso || 'National Grid'}${plant.gridConnectionType ? ` · ${plant.gridConnectionType}` : ''}` },
    { label: 'Annual Energy', mono: true, value: plant.annualEnergyGWh ? `${plant.annualEnergyGWh.toFixed(1)} GWh` : '—' },
    { label: 'Capacity', mono: true, tone: 'muted' as const, value: plant.capacityNm3h ? `${plant.capacityNm3h.toLocaleString()} Nm³/h` : '—' },
    {
      label: 'Substrate Mix',
      span: 2 as const,
      value: (
        <>
          <div>{plant.primaryFeedstockCategory || 'Manure & Slurry'}</div>
          <div className="mut" style={{ fontSize: '12px' }}>{plant.feedstockDetails || 'Audited substrate'}</div>
        </>
      ),
    },
  ];
}

export function PlantCards({
  plants,
  onOpen,
  testId,
}: {
  plants: BiomethanePlant[];
  onOpen: (plant: BiomethanePlant) => void;
  testId?: string;
}) {
  return (
    <MobileCardList
      testId={testId ?? 'sd-plant-cards'}
      items={plants}
      getKey={p => p.id}
      onSelect={onOpen}
      title={p => p.name}
      subtitle={p => p.operator || p.legalEntityName || 'Operator unrecorded'}
      metric={p => (p.annualEnergyGWh ? `${p.annualEnergyGWh.toFixed(1)} GWh` : '—')}
      metricLabel={() => 'Annual energy'}
      fields={p => [
        { label: 'Origin & Hub', value: `${p.countryFlag} ${p.country}` },
        { label: 'Capacity', mono: true, tone: 'muted', value: p.capacityNm3h ? `${p.capacityNm3h.toLocaleString()} Nm³/h` : '—' },
        { label: 'Substrate', span: 2, value: p.primaryFeedstockCategory || 'Manure & Slurry' },
      ]}
    />
  );
}

export function CorridorSheet({
  row,
  feedstockName,
  onClose,
  onStructure,
  onOpenPlant,
}: {
  row: OriginCorridorRow | null;
  feedstockName?: string;
  onClose: () => void;
  onStructure: (row: OriginCorridorRow) => void;
  onOpenPlant: (plant: BiomethanePlant, row: OriginCorridorRow) => void;
}) {
  return (
    <Sheet
      open={!!row}
      onClose={onClose}
      variant="full"
      title={row ? `${row.originFlag} ${row.originName}` : ''}
      subtitle={row ? `${row.originCode} → ${row.targetMarketName}` : ''}
      testId="sd-corridor-sheet"
      footer={
        row ? (
          <button
            type="button"
            className={`btn ${row.isTradeable ? 'btn-primary' : 'btn-secondary'} sd-sheet-cta`}
            onClick={() => onStructure(row)}
          >
            Structure Trade
          </button>
        ) : null
      }
    >
      {row && (
        <div className="sd-sheet-body">
          <div className="sd-sheet-metric">
            <div className="eyebrow">Desk margin /MWh</div>
            <div className="num sd-sheet-metric-value">{corridorMarginLabel(row)}</div>
            <GateChips gates={row.eligibility.gates} />
          </div>
          <dl className="mc-card-fields sd-sheet-fields">
            {corridorFields(row).map((f, i) => (
              <div className={`mc-card-field ${f.span === 2 ? 'mc-card-field--span2' : ''}`} key={i}>
                <dt>{f.label}</dt>
                <dd className={f.mono ? 'num' : ''}>{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="sd-sheet-section">
            <strong>
              Eligible {row.originName} Biomethane Facilities ({row.matchingPlants.length} assets matching {feedstockName})
            </strong>
            <div className="mut" style={{ fontSize: '12px', marginTop: 2 }}>
              Tap a facility to carry verified capacity and TSO node into Trade Builder
            </div>
          </div>
          {row.matchingPlants.length === 0 ? (
            <div className="mut" style={{ fontSize: '13px' }}>
              No direct individual verified assets in {row.originName} matching this substrate. Corridor evaluated on national registry macro aggregate.
            </div>
          ) : (
            <PlantCards plants={row.matchingPlants} onOpen={p => onOpenPlant(p, row)} testId="sd-corridor-plants" />
          )}
        </div>
      )}
    </Sheet>
  );
}

export function PlantSheet({
  plant,
  tso,
  onClose,
  onSource,
}: {
  plant: BiomethanePlant | null;
  tso?: string;
  onClose: () => void;
  onSource: (plant: BiomethanePlant) => void;
}) {
  return (
    <Sheet
      open={!!plant}
      onClose={onClose}
      title={plant?.name ?? ''}
      subtitle={plant ? `${plant.countryFlag} ${plant.country}` : ''}
      testId="sd-plant-sheet"
      footer={
        plant ? (
          <button type="button" className="btn btn-primary sd-sheet-cta" onClick={() => onSource(plant)}>
            Source Plant →
          </button>
        ) : null
      }
    >
      {plant && (
        <div className="sd-sheet-body">
          <dl className="mc-card-fields sd-sheet-fields" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
            {PlantDetailFields(plant, tso).map((f, i) => (
              <div className={`mc-card-field ${f.span === 2 ? 'mc-card-field--span2' : ''}`} key={i}>
                <dt>{f.label}</dt>
                <dd className={f.mono ? 'num' : ''}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Sheet>
  );
}

/* ─────────────── Destination markets ─────────────── */

export interface MarketRowVM {
  marketId: string;
  marketName: string;
  registry: string;
  gates: GateResult[] | undefined;
  net: number;
  barWidth: number;
  barColor: string;
  marginPercent: number | null | undefined;
  isSim: boolean;
}

function marketNet(net: number) {
  return net >= 0 ? `+€${net.toFixed(2)}` : `−€${Math.abs(net).toFixed(2)}`;
}

function marketFields(m: MarketRowVM) {
  return [
    {
      label: 'Margin',
      mono: true,
      tone: 'muted' as const,
      value:
        m.marginPercent !== null && m.marginPercent !== undefined
          ? `${m.marginPercent >= 0 ? '+' : ''}${Math.round(m.marginPercent)}%`
          : '—',
    },
    { label: 'Age', mono: true, tone: 'muted' as const, value: m.isSim ? 'sim' : '1d' },
    {
      label: 'Spread vs all-in',
      span: 2 as const,
      value: (
        <div className="sd-bar">
          <div className="sd-bar-fill" style={{ width: `${m.barWidth}%`, backgroundColor: m.barColor }} />
        </div>
      ),
    },
    { label: 'Provenance', span: 2 as const, value: <span className={`chip ${m.isSim ? 'chip-a' : ''}`}>{m.isSim ? 'Estimate · sim' : 'Desk · manual'}</span> },
  ];
}

export function MarketCards({
  items,
  selectedId,
  onOpen,
}: {
  items: MarketRowVM[];
  selectedId: string;
  onOpen: (m: MarketRowVM) => void;
}) {
  return (
    <MobileCardList
      testId="sd-market-cards"
      items={items}
      getKey={m => m.marketId}
      selectedKey={selectedId}
      onSelect={onOpen}
      title={m => m.marketName}
      subtitle={m => m.registry}
      metric={m => marketNet(m.net)}
      metricLabel={() => 'Net €/MWh'}
      badges={m => <GateChips gates={m.gates} />}
      fields={marketFields}
    />
  );
}

export function MarketSheet({
  market,
  onClose,
  onStructure,
}: {
  market: MarketRowVM | null;
  onClose: () => void;
  onStructure: (m: MarketRowVM) => void;
}) {
  return (
    <Sheet
      open={!!market}
      onClose={onClose}
      title={market?.marketName ?? ''}
      subtitle={market?.registry ?? ''}
      testId="sd-market-sheet"
      footer={
        market ? (
          <button type="button" className="btn btn-primary sd-sheet-cta" onClick={() => onStructure(market)}>
            Structure trade →
          </button>
        ) : null
      }
    >
      {market && (
        <div className="sd-sheet-body">
          <div className="sd-sheet-metric">
            <div className="eyebrow">Net €/MWh</div>
            <div className="num sd-sheet-metric-value">{marketNet(market.net)}</div>
            <GateChips gates={market.gates} />
          </div>
          <dl className="mc-card-fields sd-sheet-fields">
            {marketFields(market).map((f, i) => (
              <div className={`mc-card-field ${f.span === 2 ? 'mc-card-field--span2' : ''}`} key={i}>
                <dt>{f.label}</dt>
                <dd className={f.mono ? 'num' : ''}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Sheet>
  );
}

/* ─────────────── Plant picker + inline search ─────────────── */

export function PickerCards({
  plants,
  selectedId,
  onPick,
}: {
  plants: BiomethanePlant[];
  selectedId: string;
  onPick: (p: BiomethanePlant) => void;
}) {
  return (
    <MobileCardList
      testId="sd-picker-cards"
      items={plants}
      getKey={p => p.id}
      selectedKey={selectedId}
      onSelect={onPick}
      title={p => (
        <>
          <span style={{ marginRight: 6 }}>{p.countryFlag || '🌍'}</span>
          {p.name}
        </>
      )}
      subtitle={p => `${p.operator || p.legalEntityName || 'Independent Operating Entity'} • ${p.networkOperator || 'National Gas Grid'}`}
      metric={p => (p.annualEnergyGWh ? `${p.annualEnergyGWh.toFixed(1)} GWh/y` : '—')}
      metricLabel={p => (p.capacityNm3h ? `${p.capacityNm3h.toLocaleString()} Nm³/h` : p.primaryFeedstockCategory || 'Agri')}
      badges={p => (
        <>
          <span
            className="chip"
            style={{
              backgroundColor: (p.verifiedCarbonIntensity ?? 0) < 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
              color: (p.verifiedCarbonIntensity ?? 0) < 0 ? '#10b981' : '#f59e0b',
              fontWeight: 700,
              fontFamily: 'monospace',
            }}
          >
            {p.verifiedCarbonIntensity !== null && p.verifiedCarbonIntensity !== undefined ? `${p.verifiedCarbonIntensity.toFixed(0)} g/MJ` : '39 g/MJ'}
          </span>
          <span className="chip">
            {p.countryCode}
            {p.region ? ` (${p.region})` : ''}
          </span>
          {p.id === selectedId && <span className="chip chip-a" style={{ fontWeight: 800 }}>CURRENTLY SELECTED</span>}
        </>
      )}
    />
  );
}

export function InlineSearchSheet({
  open,
  onClose,
  query,
  onQuery,
  results,
  selectedId,
  onPick,
  onViewAll,
}: {
  open: boolean;
  onClose: () => void;
  query: string;
  onQuery: (q: string) => void;
  results: BiomethanePlant[];
  selectedId: string;
  onPick: (p: BiomethanePlant) => void;
  onViewAll: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} variant="full" title="Find a facility" subtitle="Facility name, operator or city" testId="sd-inline-search-sheet">
      <div className="sd-sheet-body">
        <div style={{ position: 'relative' }}>
          <input
            type="search"
            className="input"
            autoFocus
            style={{ width: '100%', minHeight: 44 }}
            placeholder="Type facility name, operator, or city..."
            value={query}
            onChange={e => onQuery(e.target.value)}
            aria-label="Search facilities"
          />
        </div>
        {results.length > 0 ? (
          <>
            <div className="eyebrow">Matching Facilities ({results.length})</div>
            <MobileCardList
              testId="sd-inline-search-cards"
              items={results}
              getKey={p => p.id}
              selectedKey={selectedId}
              onSelect={onPick}
              title={p => (
                <>
                  <span style={{ marginRight: 6 }}>{p.countryFlag || '🌍'}</span>
                  {p.name} <span className="mut">• {p.countryCode}</span>
                </>
              )}
              subtitle={p => `${p.operator || p.legalEntityName || 'Operating Entity'} • ${p.primaryFeedstockCategory || 'Agri'}`}
              metric={p => (p.annualEnergyGWh ? `${p.annualEnergyGWh.toFixed(1)} GWh` : '—')}
            />
            <button type="button" className="btn btn-secondary sd-sheet-cta" onClick={onViewAll}>
              View all in Full Census Explorer →
            </button>
          </>
        ) : (
          <div className="mut" style={{ fontSize: '13px' }}>
            {query.trim() ? 'No facilities match this search.' : 'Start typing to search the 1,975-facility census.'}
          </div>
        )}
      </div>
    </Sheet>
  );
}

export { MobileCard };
