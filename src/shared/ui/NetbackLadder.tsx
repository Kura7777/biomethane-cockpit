import React from 'react';
import { MobileCardList } from './MobileCardList';
import { Sheet } from './Sheet';
import type { GateResult } from '../../domain/eligibility/types';
import './netbackLadder.css';

/**
 * The netback ladder pieces shared by Origination (Step 3, "Where is this worth most") and the Scanner:
 * gate letters, the net value format, and the phone cards and sheet.
 */

export const SC_GATE_LETTERS = ['S', 'U', 'M', 'A', 'G', 'N'];
export const SC_GATE_TITLES = [
  'Scheme recognition',
  'UDB grid ingestion',
  'Mass balance custody',
  'Annex IX feedstock',
  'GHG saving threshold',
  'Member state specifics',
];

export function gateStyle(g: GateResult): React.CSSProperties {
  const isPass = g.verdict === 'PASS';
  const isHard = g.verdict === 'HARD_BLOCK';
  const soft = !isPass && !isHard;
  return {
    backgroundColor: isHard ? 'var(--color-accent)' : soft ? 'var(--color-neutral-300)' : 'transparent',
    color: isHard ? 'var(--color-bg)' : soft ? 'var(--color-neutral-900)' : 'var(--color-text)',
    border: `1px solid ${isHard ? 'var(--color-accent)' : 'var(--color-divider)'}`,
  };
}

export function gateVerdictLabel(g: GateResult) {
  return g.verdict === 'PASS' ? 'Pass' : g.verdict === 'HARD_BLOCK' ? 'Hard block' : 'Conditional / unresolved';
}

export function ScGateChips({ gates }: { gates: GateResult[] | undefined }) {
  if (!gates) return null;
  return (
    <span className="sc-gates" role="img" aria-label="Gates: Scheme, UDB, Mass balance, Annex IX, GHG, Member state">
      {gates.map((g, i) => (
        <span key={i} className="sc-gate" title={`${SC_GATE_TITLES[i]} — ${gateVerdictLabel(g)}`} style={gateStyle(g)}>
          {SC_GATE_LETTERS[i]}
        </span>
      ))}
    </span>
  );
}

export function fmtNet(net: number) {
  return net >= 0 ? `+€${net.toFixed(2)}` : `−€${Math.abs(net).toFixed(2)}`;
}

/* ─────────────── Netback ladder cards ─────────────── */

export interface LadderRowVM {
  marketId: string;
  marketName: string;
  legalBasis: string;
  country: string;
  unitLabel: string;
  gates: GateResult[] | undefined;
  net: number;
  /** Extra badges after the gate letters (e.g. a route-status chip). */
  extraBadges?: React.ReactNode;
  barWidth: number;
  barColor: string;
  marginPercent: number | null | undefined;
  isSim: boolean;
  isHardBlocked: boolean;
  /** Age of the market's mark, e.g. "3 d old". Left out when no observation date is on record. */
  ageLabel?: string;
  /** Where the market's mark came from, e.g. "Simulated" or "Broker · ICE". */
  sourceLabel?: string;
}

function ladderFields(r: LadderRowVM) {
  return [
    { label: 'CC', mono: true, tone: 'muted' as const, value: r.country },
    {
      label: 'Margin',
      mono: true,
      tone: 'muted' as const,
      value:
        r.marginPercent !== null && r.marginPercent !== undefined
          ? `${r.marginPercent >= 0 ? '+' : ''}${Math.round(r.marginPercent)}%`
          : '—',
    },
    { label: 'Unit of account', tone: 'muted' as const, value: r.unitLabel || '—' },
    { label: 'Age', mono: true, tone: 'muted' as const, value: r.ageLabel ?? (r.isSim ? 'sim' : '—') },
    ...(r.sourceLabel ? [{ label: 'Mark source', tone: 'muted' as const, value: r.sourceLabel }] : []),
    {
      label: 'Spread vs all-in',
      span: 2 as const,
      value: (
        <div className="sc-spread">
          <div className="sc-bar" role="img" aria-label="Spread versus all-in, on a scale from 0 to 200 or more euro per MWh">
            <div className="sc-bar-fill" style={{ width: `${r.barWidth}%`, backgroundColor: r.barColor }} />
            <span className="sc-bar-tick" style={{ left: '25%' }} />
            <span className="sc-bar-tick" style={{ left: '50%' }} />
            <span className="sc-bar-tick" style={{ left: '75%' }} />
          </div>
          <div className="sc-bar-scale num" aria-hidden="true">
            <span>0</span>
            <span>€100</span>
            <span>€200+</span>
          </div>
        </div>
      ),
    },
  ];
}

export function LadderCards({
  rows,
  selectedId,
  onOpen,
}: {
  rows: LadderRowVM[];
  selectedId: string;
  onOpen: (r: LadderRowVM) => void;
}) {
  return (
    <MobileCardList
      testId="sc-ladder-cards"
      items={rows}
      getKey={r => r.marketId}
      selectedKey={selectedId}
      onSelect={onOpen}
      title={r => r.marketName}
      subtitle={r => r.legalBasis}
      metric={r => fmtNet(r.net)}
      metricLabel={() => 'Net €/MWh'}
      badges={r => (
        <>
          <ScGateChips gates={r.gates} />
          {r.extraBadges}
          {r.isHardBlocked && !r.extraBadges && <span className="chip chip-neg">Blocked</span>}
        </>
      )}
      fields={ladderFields}
      empty="No markets match the current filters."
    />
  );
}

export function LadderSheet({
  row,
  onClose,
  onGate,
  onWhyBlocked,
  onPlaybook,
  onStructure,
  structureLabel = 'Structure in trade builder',
  extra,
}: {
  row: LadderRowVM | null;
  onClose: () => void;
  onGate: (row: LadderRowVM, gateIndex: number) => void;
  onWhyBlocked: (row: LadderRowVM) => void;
  /** Omit to hide the delivery playbook button. */
  onPlaybook?: () => void;
  onStructure: () => void;
  structureLabel?: string;
  /** Rendered under the fields (Origination puts the route verdict card here). */
  extra?: React.ReactNode;
}) {
  return (
    <Sheet
      open={!!row}
      onClose={onClose}
      variant="full"
      title={row?.marketName ?? ''}
      subtitle={row?.legalBasis ?? ''}
      testId="sc-ladder-sheet"
      footer={
        row ? (
          <div className="sc-sheet-actions">
            <button type="button" className="btn btn-primary sc-sheet-cta" onClick={onStructure} data-testid="sc-structure-trade-btn">
              {structureLabel}
            </button>
            {onPlaybook && (
              <button type="button" className="btn btn-secondary sc-sheet-cta" onClick={onPlaybook}>
                Delivery playbook ⏎
              </button>
            )}
          </div>
        ) : null
      }
    >
      {row && (
        <div className="sc-sheet-body">
          <div className="sc-sheet-metric">
            <div className="eyebrow">Net €/MWh</div>
            <div className="num sc-sheet-metric-value">{fmtNet(row.net)}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Gates S U M A G N · tap for statutory audit</div>
            <div className="sc-gate-buttons">
              {row.gates?.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  className="sc-gate-btn"
                  style={gateStyle(g)}
                  onClick={() => onGate(row, i)}
                  title={`${SC_GATE_TITLES[i]} — ${gateVerdictLabel(g)} (Click to audit)`}
                  aria-label={`${SC_GATE_TITLES[i]}: ${gateVerdictLabel(g)}. Open statutory audit`}
                >
                  <span className="sc-gate-btn-letter">{SC_GATE_LETTERS[i]}</span>
                  <span className="sc-gate-btn-title">{SC_GATE_TITLES[i]}</span>
                </button>
              ))}
            </div>
          </div>
          {row.isHardBlocked && (
            <button type="button" className="btn btn-outline sc-sheet-cta sc-sheet-audit" onClick={() => onWhyBlocked(row)}>
              Why Blocked? Statutory Gate Audit
            </button>
          )}
          <dl className="mc-card-fields sc-sheet-fields">
            {ladderFields(row).map((f, i) => (
              <div className={`mc-card-field ${f.span === 2 ? 'mc-card-field--span2' : ''}`} key={i}>
                <dt>{f.label}</dt>
                <dd className={f.mono ? 'num' : ''}>{f.value}</dd>
              </div>
            ))}
          </dl>
          {extra}
        </div>
      )}
    </Sheet>
  );
}

