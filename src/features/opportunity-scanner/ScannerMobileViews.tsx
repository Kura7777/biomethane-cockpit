import React from 'react';
import { MobileCardList, Sheet } from '../../shared/ui';
import {
  SC_GATE_LETTERS,
  SC_GATE_TITLES,
  ScGateChips,
  fmtNet,
  LadderCards,
  LadderSheet,
  type LadderRowVM,
} from '../../shared/ui/NetbackLadder';

// The ladder pieces live in shared/ui/NetbackLadder so Origination can use them too.
export { SC_GATE_LETTERS, SC_GATE_TITLES, ScGateChips, fmtNet, LadderCards, LadderSheet };
export type { LadderRowVM };
import type { GateResult } from '../../domain/eligibility/types';
import type { PlantArbitrageOpportunity } from './ScannerScreen';
import './scannerMobile.css';

/**
 * Phone renderings of the /scanner tables and filter bars. Same rows, same formatters as the
 * desktop tables in ScannerScreen.tsx; desktop never renders anything from this file.
 */

const POS = 'var(--color-pnl-pos, var(--color-accent))';
const NEG = 'var(--color-status-neg-text, #dc2626)';

/* ─────────────── Multi-plant arbitrage cards ─────────────── */

function annualPnl(opp: PlantArbitrageOpportunity) {
  return opp.annualProfitEur >= 0
    ? `+€${(opp.annualProfitEur / 1000).toFixed(0)}k`
    : `−€${(Math.abs(opp.annualProfitEur) / 1000).toFixed(0)}k`;
}

function plantFields(opp: PlantArbitrageOpportunity) {
  return [
    {
      label: 'Substrate & Carbon Intensity',
      span: 2 as const,
      value: (
        <>
          <strong>{opp.feedstockCategory}</strong>
          <div style={{ color: opp.carbonIntensity < 0 ? 'var(--color-accent)' : 'var(--color-muted)', fontWeight: opp.carbonIntensity < 0 ? 700 : 400 }}>
            CI: {opp.carbonIntensity} gCO₂e/MJ
          </div>
        </>
      ),
    },
    {
      label: 'Annual Volume',
      mono: true,
      value: (
        <>
          <strong>{opp.annualGWh.toLocaleString()} GWh</strong>
          <div style={{ color: 'var(--color-muted)', fontSize: '12px' }}>{opp.annualMWh.toLocaleString()} MWh</div>
        </>
      ),
    },
    {
      label: 'Est. Procurement',
      mono: true,
      value: (
        <>
          <strong>€{opp.procurementCostEurMwh.toFixed(2)}</strong>
          <div style={{ color: 'var(--color-muted)', fontSize: '12px' }}>
            {opp.procurementMode === 'FIXED_FARMGATE' ? 'Fixed Farmgate' : 'TTF + Premium'}
          </div>
        </>
      ),
    },
    { label: 'Gross Netback', mono: true, value: `€${opp.bestMarketNetNetback.toFixed(2)}` },
    {
      label: 'Annual Gross PnL',
      mono: true,
      value: <strong style={{ color: opp.annualProfitEur >= 0 ? POS : NEG }}>{annualPnl(opp)}</strong>,
    },
  ];
}

export function PlantOppCards({
  items,
  onOpen,
}: {
  items: PlantArbitrageOpportunity[];
  onOpen: (opp: PlantArbitrageOpportunity) => void;
}) {
  return (
    <MobileCardList
      testId="sc-plant-cards"
      items={items}
      getKey={o => o.plantId}
      onSelect={onOpen}
      title={o => (
        <>
          <span style={{ marginRight: 6 }}>{o.countryFlag}</span>
          {o.plantName}
        </>
      )}
      subtitle={o => `${o.countryName} (${o.countryCode})${o.isRestrictedSubsidy ? ' · ⚠ State Auction Feed-in Tariff' : ''}`}
      metric={o => <span style={{ color: o.netMarginEurMwh >= 0 ? POS : NEG }}>{fmtNet(o.netMarginEurMwh)}</span>}
      metricLabel={() => 'Net spread €/MWh'}
      badges={o => (
        <>
          <span className="chip" style={{ fontWeight: 700 }}>{o.bestMarketName}</span>
          <span className="chip">Transit €{o.logisticsFeeEurMwh.toFixed(2)}/MWh</span>
        </>
      )}
      fields={plantFields}
    />
  );
}

export function PlantOppSheet({
  opp,
  onClose,
  onStructure,
  onAudit,
}: {
  opp: PlantArbitrageOpportunity | null;
  onClose: () => void;
  onStructure: (opp: PlantArbitrageOpportunity) => void;
  onAudit: (opp: PlantArbitrageOpportunity) => void;
}) {
  return (
    <Sheet
      open={!!opp}
      onClose={onClose}
      variant="full"
      title={opp ? `${opp.countryFlag} ${opp.plantName}` : ''}
      subtitle={opp ? `${opp.countryName} (${opp.countryCode})` : ''}
      testId="sc-plant-sheet"
      footer={
        opp ? (
          <div className="sc-sheet-actions">
            <button type="button" className="btn btn-primary sc-sheet-cta" onClick={() => onStructure(opp)}>
              Structure ➔
            </button>
            {opp.isRestrictedSubsidy && (
              <button type="button" className="btn btn-outline sc-sheet-cta sc-sheet-audit" onClick={() => onAudit(opp)}>
                Audit State Aid / Export Legality
              </button>
            )}
          </div>
        ) : null
      }
    >
      {opp && (
        <div className="sc-sheet-body">
          <div className="sc-sheet-metric">
            <div className="eyebrow">Net Spread €/MWh</div>
            <div className="num sc-sheet-metric-value" style={{ color: opp.netMarginEurMwh >= 0 ? POS : NEG }}>
              {fmtNet(opp.netMarginEurMwh)}
            </div>
            <div className="sc-sheet-chips">
              <span className="chip" style={{ fontWeight: 700 }}>{opp.bestMarketName}</span>
              <span className="chip">Optimal statutory sink</span>
            </div>
          </div>
          <dl className="mc-card-fields sc-sheet-fields">
            {plantFields(opp).map((f, i) => (
              <div className={`mc-card-field ${f.span === 2 ? 'mc-card-field--span2' : ''}`} key={i}>
                <dt>{f.label}</dt>
                <dd className={f.mono ? 'num' : ''}>{f.value}</dd>
              </div>
            ))}
            <div className="mc-card-field mc-card-field--span2">
              <dt>Transit friction</dt>
              <dd className="num">€{opp.logisticsFeeEurMwh.toFixed(2)}/MWh</dd>
            </div>
            {opp.isRestrictedSubsidy && (
              <div className="mc-card-field mc-card-field--span2">
                <dt>Flag</dt>
                <dd>⚠ State Auction Feed-in Tariff</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </Sheet>
  );
}

/* ─────────────── Filters sheets ─────────────── */

export function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="sc-toggle" onClick={onToggle}>
      <span>{label}</span>
      <span className={`sc-switch ${on ? 'sc-switch--on' : ''}`} aria-hidden="true">
        <span className="sc-switch-knob" />
      </span>
    </button>
  );
}

export function ChipChoice<T extends number | string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="sc-chip-choice">
      {options.map(o => (
        <button
          key={String(o.key)}
          type="button"
          className={`chip ${value === o.key ? 'chip-a' : ''}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FilterSheet({
  open,
  onClose,
  title,
  children,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onReset?: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      testId="sc-filter-sheet"
      footer={
        <div className="sc-sheet-actions sc-sheet-actions--row">
          {onReset && (
            <button type="button" className="btn btn-secondary sc-sheet-cta" onClick={onReset}>
              Reset
            </button>
          )}
          <button type="button" className="btn btn-primary sc-sheet-cta" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="sc-sheet-body">{children}</div>
    </Sheet>
  );
}
