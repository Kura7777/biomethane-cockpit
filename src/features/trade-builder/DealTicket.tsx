import React, { useState } from 'react';
import { NetbackResult, ProducerPricing } from '../../domain/netback/types';
import { GateResult } from '../../domain/eligibility/types';
import { UDBStatus, PoSStatus } from '../../domain/consignment/types';
import { showToast } from '../../app/DeskToastContainer';
import { computeGateBadge } from './ticketMath';

const MONO_FONT = 'var(--font-mono, "IBM Plex Mono", monospace)';

export interface BestRouteEntry {
  marketId: string;
  marketName: string;
  netNetback: number | null;
  verdict: string;
  /** False when the market has no traded-bundle reference, so the netback is the uncapped model. */
  bundleChecked?: boolean;
}

export interface SensitivityDeltas {
  markUp: number | null;
  markDown: number | null;
  ttfUp: number | null;
  ttfDown: number | null;
  ciUp: number | null;
  ciDown: number | null;
}

export interface DealTicketProps {
  dealId: string;
  originFlag: string;
  originCode: string;
  /** Full origin country name, for the copy-quote line. */
  originName: string;
  /** e.g. "Germany THG" — origin/market label already assembled by the caller. */
  marketLabel: string;
  netback: NetbackResult;
  volumeMwh: number;
  annualPnl: number;
  gates: GateResult[];
  overallVerdict: string;
  udbStatus: UDBStatus;
  posStatus: PoSStatus;
  ci: number;
  /** Same provenance classification the CI chip in step 1 uses; null reads as "Manual". */
  ciProvenance: 'pos' | 'estimated' | null;
  /** True only when the trader moved the CI slider; otherwise a null provenance is the screen default. */
  ciIsManual: boolean;
  isTtfSimulated: boolean;
  /** Where this market's mark came from, e.g. "Broker · Broker run · observed 18 Aug 2026". */
  markSourceLabel?: string | null;
  onBuildDealPackage: () => void;
  /** Opens step 3 (Market & gate audit) so the trader can act on a failing gate. */
  onGoToGate: () => void;

  // Producer quote
  feedstockLabel: string;
  schemeLabel: string;
  custodyLabel: string;
  /** e.g. "CAL 2026" — for the copy-quote line. */
  vintageLabel: string;
  producerPricing: ProducerPricing | null;
  /** Wired to the same store field (state.costs.producerPricing) computeNetback already reads. */
  onProducerPricingChange: (patch: Partial<ProducerPricing>) => void;

  // Headroom / sensitivity
  marketUnitLabel: string;
  /** Only meaningful when netback.netbackCappedAt is set; the mark at which the modelled
   *  netback would fall to the bundle cap. */
  breakEvenMark: number | null;
  /** The raw mark currently in use, in the market's own unit. */
  currentMark: number | null;
  /** null when the market is capped (headroom text takes over instead) or there isn't enough
   *  data to model a bump. */
  sensitivities: SensitivityDeltas | null;

  // Best route
  bestRoutes: BestRouteEntry[];
  onSwitchMarket: (marketId: string) => void;
}

const fmtDelta = (v: number | null): string => (v == null ? '—' : `${v >= 0 ? '+' : '−'}€${Math.abs(v).toFixed(2)}/MWh`);

/** Sticky deal ticket rail for the wide-screen Deal flow view: a working summary of the netback,
 *  gate status, producer quote, headroom and best-route alternatives that stays visible while
 *  steps 1–2 are edited. All figures are computed by TradeBuilderScreen and handed down as
 *  props — the ticket itself renders and edits producer pricing inline, nothing else. */
export function DealTicket({
  dealId,
  originFlag,
  originCode,
  originName,
  marketLabel,
  netback,
  volumeMwh,
  annualPnl,
  gates,
  overallVerdict,
  udbStatus,
  posStatus,
  ci,
  ciProvenance,
  ciIsManual,
  isTtfSimulated,
  markSourceLabel,
  onBuildDealPackage,
  onGoToGate,
  feedstockLabel,
  schemeLabel,
  custodyLabel,
  vintageLabel,
  producerPricing,
  onProducerPricingChange,
  marketUnitLabel,
  breakEvenMark,
  currentMark,
  sensitivities,
  bestRoutes,
  onSwitchMarket,
}: DealTicketProps) {
  const [showFullReason, setShowFullReason] = useState(false);

  const netNetback = netback.netNetback ?? 0;
  const isPos = netNetback >= 0;

  const badge = computeGateBadge(gates, overallVerdict);
  const isHardBlocked = overallVerdict === 'HARD_BLOCK';

  const ciLabel = ciProvenance === 'pos' ? 'PoS CI' : ciProvenance === 'estimated' ? 'Estimated CI' : ciIsManual ? 'Manual' : 'Default';
  const ciLabelClass = ciProvenance === 'pos' ? 'info' : ciProvenance === 'estimated' ? 'warn' : 'muted';

  const reasonText = badge.gate?.reason ?? '';
  const reasonIsLong = reasonText.length > 200;
  const reasonShown = reasonIsLong && !showFullReason ? `${reasonText.slice(0, 200)}…` : reasonText;

  const handleCopyQuote = async () => {
    const mode = producerPricing?.mode === 'FIXED_PRICE'
      ? 'fixed'
      : producerPricing?.mode === 'INDEX_LINKED' && producerPricing.indexLinkedShare != null
        ? `${(producerPricing.indexLinkedShare * 100).toFixed(1)}% index-linked`
        : 'pricing unset';
    const producerPayableText = netback.producerPayable != null ? netback.producerPayable.toFixed(2) : '—';
    const line = `${originName} ${feedstockLabel}, CI ${ci} gCO₂e/MJ (${ciLabel}), ${schemeLabel} ${custodyLabel}, ${volumeMwh.toLocaleString()} MWh ${vintageLabel}: €${producerPayableText}/MWh (${mode}). Indicative, subject to contract.`;
    try {
      await navigator.clipboard.writeText(line);
      showToast('Quote copied to clipboard', 'SUCCESS');
    } catch {
      showToast('Could not copy — clipboard unavailable', 'ERROR');
    }
  };

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
          <div className="tt-subhead">Producer bid</div>
          <dl className="tt-figures">
            <div className="tt-figure-row">
              <dt>Payable</dt>
              <dd>{netback.producerPayable !== null ? `€${netback.producerPayable.toFixed(2)}/MWh` : 'Not set'}</dd>
            </div>
            {producerPricing?.mode === 'INDEX_LINKED' ? (
              <div className="tt-figure-row">
                <dt>Index share</dt>
                <dd>
                  <input
                    type="number"
                    className="tt-inline-input"
                    min={0}
                    max={100}
                    step={0.1}
                    value={producerPricing.indexLinkedShare != null ? Number((producerPricing.indexLinkedShare * 100).toFixed(1)) : ''}
                    onChange={e => {
                      const pct = Number(e.target.value);
                      if (!isNaN(pct)) onProducerPricingChange({ indexLinkedShare: Math.max(0, Math.min(1, pct / 100)) });
                    }}
                    aria-label="Producer index-linked share, percent"
                  />
                  <span className="tt-inline-unit">%</span>
                </dd>
              </div>
            ) : producerPricing?.mode === 'FIXED_PRICE' ? (
              <div className="tt-figure-row">
                <dt>Fixed price</dt>
                <dd>
                  <span className="tt-inline-unit">€</span>
                  <input
                    type="number"
                    className="tt-inline-input"
                    min={0}
                    step={0.5}
                    value={producerPricing.fixedPriceEurPerMwh ?? ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) onProducerPricingChange({ fixedPriceEurPerMwh: val });
                    }}
                    aria-label="Producer fixed price, euro per MWh"
                  />
                  <span className="tt-inline-unit">/MWh</span>
                </dd>
              </div>
            ) : (
              <div className="tt-figure-row">
                <dt>Pricing mode</dt>
                <dd>Not set</dd>
              </div>
            )}
          </dl>
          <button type="button" className="btn btn-secondary tb-full tt-copy-btn" onClick={handleCopyQuote}>
            Copy quote
          </button>
        </div>

        <div className="tt-section">
          <div className="tt-subhead">Headroom</div>
          {netback.netbackCappedAt != null ? (
            <div className="tt-headroom-text">
              Priced at the bundle cap.
              {breakEvenMark != null && currentMark != null && (
                <> {marketUnitLabel} could fall from {currentMark.toFixed(2)} to {breakEvenMark.toFixed(2)} before your price moves.</>
              )}
            </div>
          ) : sensitivities ? (
            <dl className="tt-figures">
              <div className="tt-figure-row"><dt>Mark +10%</dt><dd>{fmtDelta(sensitivities.markUp)}</dd></div>
              <div className="tt-figure-row"><dt>Mark −10%</dt><dd>{fmtDelta(sensitivities.markDown)}</dd></div>
              <div className="tt-figure-row"><dt>TTF +€2</dt><dd>{fmtDelta(sensitivities.ttfUp)}</dd></div>
              <div className="tt-figure-row"><dt>TTF −€2</dt><dd>{fmtDelta(sensitivities.ttfDown)}</dd></div>
              <div className="tt-figure-row"><dt>CI +10 g</dt><dd>{fmtDelta(sensitivities.ciUp)}</dd></div>
              <div className="tt-figure-row"><dt>CI −10 g</dt><dd>{fmtDelta(sensitivities.ciDown)}</dd></div>
            </dl>
          ) : (
            <div className="tt-headroom-text mut">Not enough data to model sensitivity.</div>
          )}
        </div>

        <div className="tt-section">
          <div className="tt-subhead">Best route</div>
          {bestRoutes.length === 0 ? (
            <div className="tt-headroom-text mut">No other eligible market beats this route.</div>
          ) : (
            <div className="tt-best-routes">
              {bestRoutes.map(r => (
                <div key={r.marketId} className="tt-best-route-row">
                  <div className="tt-best-route-label">
                    {(r.verdict === 'UNRESOLVED' || r.verdict === 'CONDITIONAL') && <span className="tt-dot warn" aria-hidden="true" />}
                    <span>{r.marketName}</span>
                    {r.bundleChecked === false && (
                      <span className="tt-chip muted" title="No traded-bundle price for this market, so this is the modelled value and may exceed what the market pays. Enter an observed bundle price to compare like for like.">Modelled</span>
                    )}
                  </div>
                  <span className="tt-best-route-value">
                    {r.netNetback != null ? `${r.netNetback >= 0 ? '+' : '−'}€${Math.abs(r.netNetback).toFixed(2)}` : '—'}
                  </span>
                  <button type="button" className="btn btn-secondary tt-switch-btn" onClick={() => onSwitchMarket(r.marketId)}>
                    Switch
                  </button>
                </div>
              ))}
              {bestRoutes.some(r => r.bundleChecked === false) && (
                <div className="tt-headroom-text mut">Modelled routes have no traded-bundle check; the current route {netback.netbackCappedAt != null ? 'is capped at its bundle price' : 'is compared at model value'}.</div>
              )}
            </div>
          )}
        </div>

        <div className="tt-section">
          <dl className="tt-figures">
            <div className="tt-figure-row">
              <dt>Desk margin</dt>
              <dd>{netback.deskMargin !== null ? `€${netback.deskMargin.toFixed(2)}/MWh` : '—'}</dd>
            </div>
            <div className="tt-figure-row">
              <dt>Annual P&amp;L</dt>
              <dd>{netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="tt-section tt-status">
          <div className={`tt-badge ${badge.tone}`}>
            {badge.label}
          </div>
          {badge.gate && (
            <div className="tt-gate-detail">
              <div className="tt-gate-reason">
                {reasonShown}
                {reasonIsLong && (
                  <button type="button" className="tt-linklike" onClick={() => setShowFullReason(s => !s)}>
                    {showFullReason ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
              {badge.gate.remedy && (
                <div className="tt-gate-remedy"><strong>Remedy: </strong>{badge.gate.remedy}</div>
              )}
              <button type="button" className="tt-linklike" onClick={onGoToGate}>Go to gate →</button>
            </div>
          )}
          <div className="tt-status-row">
            <span className="tt-status-label">CI</span>
            <span className="tt-status-value">
              {ci >= 0 ? `+${ci}` : `−${Math.abs(ci)}`} gCO₂e/MJ
              <span className={`tt-chip ${ciLabelClass}`}>{ciLabel}</span>
            </span>
          </div>
          {markSourceLabel && (
            <div className="tt-status-row">
              <span className="tt-status-label">Mark</span>
              <span className="tt-status-value" data-testid="ticket-mark-source">{markSourceLabel}</span>
            </div>
          )}
          {isTtfSimulated && (
            <div className="tt-status-row">
              <span className="tt-chip warn">TTF simulated</span>
            </div>
          )}
          <div className="tt-status-row" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span
              className={`tt-chip ${udbStatus === 'RECORDED' ? 'info' : udbStatus === 'PENDING' ? 'warn' : 'muted'}`}
              data-testid="ticket-udb-chip"
            >
              {udbStatus === 'RECORDED' ? 'UDB: Confirmed' : udbStatus === 'PENDING' ? 'UDB: Assumed' : 'UDB: Not recorded'}
            </span>
            <span
              className={`tt-chip ${posStatus === 'ISSUED' ? 'info' : posStatus === 'PENDING' ? 'warn' : 'muted'}`}
              data-testid="ticket-pos-chip"
            >
              {posStatus === 'ISSUED' ? 'PoS: Confirmed' : posStatus === 'PENDING' ? 'PoS: Assumed' : 'PoS: Not available'}
            </span>
          </div>
        </div>
      </div>

      <div className="tt-footer ds-aside-footer">
        <button
          type="button"
          className="btn btn-primary tb-full"
          onClick={onBuildDealPackage}
          disabled={isHardBlocked}
          title={isHardBlocked ? `Resolve ${badge.gate?.gateLabel ?? 'the blocking gate'} before building the deal package` : undefined}
        >
          Build deal package
        </button>
      </div>
    </aside>
  );
}
