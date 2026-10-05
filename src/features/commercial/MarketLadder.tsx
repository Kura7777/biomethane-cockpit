import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useAppState } from '../../store/context';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { SourceChip } from '../../shared/ui/SourceChip';
import {
  LadderCards,
  LadderSheet,
  ScGateChips,
  fmtNet,
  type LadderRowVM,
} from '../../shared/ui/NetbackLadder';
import { deriveSourceBadge, getMarkAgeDays } from '../../domain/markets/types';
import { SIMULATED_SOURCE_NAME } from '../../domain/marks/simulate';
import { buildMarketLadder, type MarketLadderRow } from '../../domain/arbitrage/marketLadder';
import { originationRouteStatus } from '../../domain/arbitrage/routeStatus';
import { RouteVerdictCard } from '../map/RouteVerdictCard';
import { RouteStatusBadge } from './RouteStatusBadge';
import { buildOpportunityDealUrl } from './dealUrl';
import type { SourcedOpportunity } from './PlantScannerTable';

const TOP_N = 8;

interface MarketLadderProps {
  opportunity: SourcedOpportunity;
  volumeMwh: number;
}

function ageText(days: number | null): string | undefined {
  if (days === null) return undefined;
  return days === 0 ? 'today' : `${days} d old`;
}

/**
 * "Where is this worth most": the selected route priced into every active market, best netback
 * first. Every netback comes from state.marks and state.costs; a market with a missing mark is
 * listed at the bottom as "missing mark" and never ranked.
 */
export function MarketLadder({ opportunity, volumeMwh }: MarketLadderProps) {
  const { state } = useAppState();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sheetId, setSheetId] = useState<string | null>(null);

  const ladder = useMemo(
    () => buildMarketLadder(opportunity, volumeMwh, state.marks, state.costs),
    [opportunity, volumeMwh, state.marks, state.costs]
  );

  const visible = useMemo(() => {
    if (showAll) return ladder.ranked;
    const top = ladder.ranked.slice(0, TOP_N);
    // The market this route was built for is always on screen, even when it ranks below the cut.
    const chosen = ladder.ranked.find(r => r.isChosen && !top.includes(r));
    return chosen ? [...top, chosen] : top;
  }, [ladder.ranked, showAll]);

  const sourceFor = (row: MarketLadderRow) => {
    const badge = row.isModelled && !row.provenance
      ? { label: 'Modelled', variant: 'NEUTRAL' as const }
      : deriveSourceBadge(row.provenance, SIMULATED_SOURCE_NAME);
    const age = ageText(getMarkAgeDays(state.marks.marks[row.marketId]));
    return { badge, age };
  };

  const tradeUrl = (row: MarketLadderRow) => buildOpportunityDealUrl(opportunity, row.marketId, volumeMwh);

  const openAuditor = (marketId: string, gateIndex: number) => {
    window.dispatchEvent(
      new CustomEvent('open-compliance-auditor', {
        detail: {
          originCountry: ladder.consignment.originCountry,
          targetMarketId: marketId,
          destinationMarket: marketId,
          feedstockCategory: ladder.consignment.feedstock,
          feedstock: ladder.consignment.feedstock,
          carbonIntensity: ladder.consignment.carbonIntensity,
          ghgIntensity: ladder.consignment.carbonIntensity,
          annualVolumeMWh: volumeMwh,
          volumeMWh: volumeMwh,
          initialTab: 'GATE_BREAKDOWN',
          focusedGateIndex: gateIndex,
        },
      })
    );
  };

  const firstOpenGate = (row: MarketLadderRow) => {
    const i = row.gates.findIndex(g => g.verdict === 'HARD_BLOCK' || g.verdict === 'CONDITIONAL');
    return i === -1 ? 0 : i;
  };

  const mobileRows: LadderRowVM[] = visible.map(r => {
    const net = r.netNetback as number; // ranked rows always carry a netback
    const { badge, age } = sourceFor(r);
    return {
      marketId: r.marketId,
      marketName: r.isChosen ? `${r.marketName} (chosen)` : r.marketName,
      legalBasis: r.legalBasis,
      country: r.country,
      unitLabel: r.unitLabel,
      gates: r.gates,
      net,
      extraBadges: (
        <>
          <RouteStatusBadge verdict={r.verdict} detail={r.eligibilitySummary} />
          {r.cappedAt !== null && <span className="chip chip-warn">Capped €{r.cappedAt}</span>}
        </>
      ),
      barWidth: Math.min(100, (Math.abs(net) / 200) * 100),
      barColor:
        net < 0 || r.verdict === 'HARD_BLOCK' ? 'var(--color-accent)' : originationRouteStatus(r.verdict) === 'REVIEW' ? 'var(--color-neutral-500)' : 'var(--color-text)',
      marginPercent: r.marginPercent,
      isSim: badge.label === 'Simulated',
      isHardBlocked: r.verdict === 'HARD_BLOCK',
      ageLabel: age,
      sourceLabel: badge.label,
    };
  });
  const sheetRow = sheetId ? ladder.ranked.find(r => r.marketId === sheetId) ?? null : null;
  const sheetVm = sheetId ? mobileRows.find(r => r.marketId === sheetId) ?? null : null;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-line)',
        borderRadius: 'var(--radius-card)',
      }}
      className="border p-4 sm:p-5 shadow-xs mb-5"
      data-testid="market-ladder"
    >
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
        <span style={{ color: 'var(--color-text)' }} className="text-xs font-semibold">
          Where is this worth most
        </span>
      </div>
      <p style={{ color: 'var(--color-muted)' }} className="text-[11px] mb-3 max-w-3xl">
        This route ({opportunity.originCountry}, {opportunity.feedstockName}, CI {opportunity.carbonIntensity}) priced into every active market, best netback first.
        Netbacks use the Pricing desk marks and your cost inputs; each market shows where its mark came from.{' '}
        <Link to="/pricing" style={{ color: 'var(--color-accent)' }} className="font-medium hover:underline">Change in Pricing desk →</Link>
      </p>

      {isMobile ? (
        <>
          <LadderCards
            rows={mobileRows}
            selectedId={opportunity.targetMarketId}
            onOpen={r => setSheetId(r.marketId)}
          />
          <LadderSheet
            row={sheetVm}
            onClose={() => setSheetId(null)}
            onGate={(row, gateIndex) => openAuditor(row.marketId, gateIndex)}
            onWhyBlocked={row => {
              const full = ladder.ranked.find(r => r.marketId === row.marketId);
              openAuditor(row.marketId, full ? firstOpenGate(full) : 0);
            }}
            onStructure={() => sheetRow && navigate(tradeUrl(sheetRow))}
            structureLabel="Trade this route"
            extra={
              sheetRow ? (
                <RouteVerdictCard origin={ladder.consignment.originCountry} target={sheetRow.country} showMapLink />
              ) : null
            }
          />
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs" data-testid="market-ladder-table">
            <thead>
              <tr style={{ color: 'var(--color-muted)', borderColor: 'var(--color-line)' }} className="border-b text-[11px]">
                <th className="py-2 pr-2 w-8">#</th>
                <th className="py-2 pr-3">Market</th>
                <th className="py-2 pr-3">Route status</th>
                <th className="py-2 pr-3 text-right">Net €/MWh</th>
                <th className="py-2 pr-3 text-right">Margin</th>
                <th className="py-2 pr-3">Mark source</th>
                <th className="py-2 pr-1 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const isOpen = Boolean(expanded[row.marketId]);
                const { badge, age } = sourceFor(row);
                const net = row.netNetback as number;
                return (
                  <React.Fragment key={row.marketId}>
                    <tr
                      style={{
                        borderColor: 'var(--color-line)',
                        backgroundColor: row.isChosen ? 'var(--color-selected-row, rgba(31, 95, 173, 0.08))' : undefined,
                      }}
                      className="border-b align-top"
                      data-testid={`ladder-row-${row.marketId}`}
                    >
                      <td className="py-2 pr-2 tabular-nums" style={{ color: 'var(--color-muted)' }}>
                        {row.rank !== null ? String(row.rank).padStart(2, '0') : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          className="flex items-start gap-1 text-left cursor-pointer"
                          onClick={() => setExpanded(prev => ({ ...prev, [row.marketId]: !prev[row.marketId] }))}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Hide' : 'Show'} route verdict for ${row.marketName}`}
                        >
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                          <span>
                            <span style={{ color: 'var(--color-text)' }} className="font-semibold">{row.marketName}</span>{' '}
                            <span style={{ color: 'var(--color-muted)' }}>({row.country})</span>
                            {row.isChosen && <span className="chip chip-info ml-1.5">Chosen in Step 1</span>}
                            <span style={{ color: 'var(--color-muted)' }} className="block text-[11px]">{row.legalBasis}</span>
                          </span>
                        </button>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <RouteStatusBadge verdict={row.verdict} detail={row.eligibilitySummary} />
                          <ScGateChips gates={row.gates} />
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-bold" style={{ color: net < 0 ? 'var(--color-pnl-neg)' : 'var(--color-text)' }}>
                        {fmtNet(net)}
                        {row.cappedAt !== null && (
                          <span className="block text-[10px] font-medium" style={{ color: 'var(--color-status-warn-text)' }}>
                            capped at €{row.cappedAt} (desk assumption, not the mark)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums" style={{ color: 'var(--color-muted)' }}>
                        {row.marginPercent !== null && row.marginPercent !== undefined
                          ? `${row.marginPercent >= 0 ? '+' : ''}${Math.round(row.marginPercent)}%`
                          : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        <SourceChip badge={badge} suffix={age} />
                      </td>
                      <td className="py-2 pr-1 text-right">
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '0 8px', height: '26px', minHeight: '26px', whiteSpace: 'nowrap' }}
                          onClick={() => navigate(tradeUrl(row))}
                          disabled={originationRouteStatus(row.verdict) === 'BLOCKED'}
                          title={originationRouteStatus(row.verdict) === 'BLOCKED' ? 'Blocked: open the route verdict for why' : `Open ${row.marketName} in Trade Builder`}
                        >
                          Trade ➔
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ borderColor: 'var(--color-line)' }} className="border-b">
                        <td />
                        <td colSpan={6} className="pb-3">
                          <div style={{ color: 'var(--color-muted)' }} className="text-[11px] mb-1.5">{row.eligibilitySummary}</div>
                          <RouteVerdictCard origin={ladder.consignment.originCountry} target={row.country} showMapLink />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ladder.ranked.length > TOP_N && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          style={{ color: 'var(--color-accent)' }}
          className="mt-2 text-xs font-medium cursor-pointer hover:underline"
        >
          {showAll ? `Show top ${TOP_N} only` : `Show all ${ladder.ranked.length} markets with a netback`}
        </button>
      )}

      {ladder.missing.length > 0 && (
        <div
          style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}
          className="mt-3 pt-3 border-t text-[11px]"
          data-testid="ladder-missing"
        >
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Missing mark, not ranked ({ladder.missing.length}):</span>{' '}
          {ladder.missing.map((m, i) => (
            <span key={m.marketId}>
              {i > 0 && ' · '}
              {m.marketName}
            </span>
          ))}
          .{' '}
          <Link to="/pricing" style={{ color: 'var(--color-accent)' }} className="font-medium hover:underline">Set a mark in Pricing →</Link>
        </div>
      )}
    </div>
  );
}
