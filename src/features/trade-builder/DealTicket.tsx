import React from 'react';
import { NetbackResult } from '../../domain/netback/types';
import { GateResult } from '../../domain/eligibility/types';

const MONO_FONT = 'var(--font-mono, "IBM Plex Mono", monospace)';

export interface DealTicketProps {
  dealId: string;
  originFlag: string;
  originCode: string;
  /** e.g. "Germany THG" — origin/market label already assembled by the caller. */
  marketLabel: string;
  netback: NetbackResult;
  volumeMwh: number;
  annualPnl: number;
  grossTotal: number;
  gates: GateResult[];
  overallVerdict: string;
  ci: number;
  /** Same provenance classification the CI chip in step 1 uses; null reads as "Manual". */
  ciProvenance: 'pos' | 'estimated' | null;
  /** True only when the trader moved the CI slider; otherwise a null provenance is the screen default. */
  ciIsManual: boolean;
  isTtfSimulated: boolean;
  onBuildDealPackage: () => void;
}

/** Sticky deal ticket rail for the wide-screen Deal flow view: a running summary of the netback,
 *  gate/CI/TTF status and headline figures that stays visible while steps 1–2 are edited.
 *  Reads only values TradeBuilderScreen already computes — no calculation happens here. */
export function DealTicket({
  dealId,
  originFlag,
  originCode,
  marketLabel,
  netback,
  volumeMwh,
  annualPnl,
  grossTotal,
  gates,
  overallVerdict,
  ci,
  ciProvenance,
  ciIsManual,
  isTtfSimulated,
  onBuildDealPackage,
}: DealTicketProps) {
  const netNetback = netback.netNetback ?? 0;
  const isPos = netNetback >= 0;
  const failingGates = gates.filter(g => g.verdict !== 'PASS');
  const gatesClear = gates.length - failingGates.length;
  const isBlocked = overallVerdict !== 'ELIGIBLE';

  const ciLabel = ciProvenance === 'pos' ? 'PoS CI' : ciProvenance === 'estimated' ? 'Estimated CI' : ciIsManual ? 'Manual' : 'Default';
  const ciLabelClass = ciProvenance === 'pos' ? 'info' : ciProvenance === 'estimated' ? 'warn' : 'muted';

  const blockedTitle = failingGates.map(g => `${g.gateLabel}: ${g.reason}`).join('\n');

  return (
    <aside className="tt-rail ds-aside" data-testid="deal-ticket">
      <div className="tt-section ds-aside-section">
        <div className="tt-header-row">
          <span className="tt-id" style={{ fontFamily: MONO_FONT }}>{dealId}</span>
        </div>
        <div className="tt-route">
          <span>{originCode} → {marketLabel}</span>
        </div>
      </div>

      <div className="tt-aside-body ds-aside-body">
        <div className="tt-section">
          <div className="tt-headline" style={{ color: isPos ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
            {isPos ? '+' : '−'}€{Math.abs(netNetback).toFixed(2)}
            <span className="unit"> /MWh net netback</span>
          </div>
          {netback.netbackCappedAt != null && (
            <div className="tt-capped">
              Capped at bundle · modelled {netback.theoreticalNetback != null ? `€${netback.theoreticalNetback.toFixed(2)}` : '—'}
            </div>
          )}
        </div>

        <div className="tt-section">
          <dl className="tt-figures">
            <div className="tt-figure-row">
              <dt>Volume</dt>
              <dd>{volumeMwh.toLocaleString()} MWh</dd>
            </div>
            <div className="tt-figure-row">
              <dt>Producer payable</dt>
              <dd>{netback.producerPayable !== null ? `€${netback.producerPayable.toFixed(2)}/MWh` : 'Not set'}</dd>
            </div>
            <div className="tt-figure-row">
              <dt>Desk margin</dt>
              <dd>{netback.deskMargin !== null ? `€${netback.deskMargin.toFixed(2)}/MWh` : '—'}</dd>
            </div>
            <div className="tt-figure-row">
              <dt>Annual P&amp;L</dt>
              <dd>{netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}</dd>
            </div>
            <div className="tt-figure-row">
              <dt>Gross notional</dt>
              <dd>€{grossTotal.toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <div className="tt-section tt-status">
          <div
            className={`tt-badge ${isBlocked ? 'neg' : 'pos'}`}
            title={isBlocked ? blockedTitle : undefined}
          >
            {isBlocked
              ? `Blocked · ${failingGates[0]?.gateLabel ?? 'gate check'}`
              : `${gatesClear} of ${gates.length} gates clear`}
          </div>
          <div className="tt-status-row">
            <span className="tt-status-label">CI</span>
            <span className="tt-status-value">
              {ci >= 0 ? `+${ci}` : `−${Math.abs(ci)}`} gCO₂e/MJ
              <span className={`tt-chip ${ciLabelClass}`}>{ciLabel}</span>
            </span>
          </div>
          {isTtfSimulated && (
            <div className="tt-status-row">
              <span className="tt-chip warn">TTF simulated</span>
            </div>
          )}
        </div>
      </div>

      <div className="tt-footer ds-aside-footer">
        <button
          type="button"
          className="btn btn-primary tb-full"
          onClick={onBuildDealPackage}
          disabled={isBlocked}
          title={isBlocked ? `Resolve ${failingGates.length} blocking gate${failingGates.length === 1 ? '' : 's'} before building the deal package` : undefined}
        >
          Build deal package
        </button>
      </div>
    </aside>
  );
}
