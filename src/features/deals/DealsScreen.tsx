import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { MobileCardList } from '../../shared/ui';
import { SourceChip } from '../../shared/ui/SourceChip';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { deriveSourceBadge, SourceBadge } from '../../domain/markets/types';
import { SIMULATED_SOURCE_NAME } from '../../domain/marks/simulate';
import { getMarketById } from '../../domain/markets/registry';
import { computeNetback } from '../../domain/netback/engine';
import { getRouteTransitTariff } from '../../domain/arbitrage/origins';
import { NetbackResult } from '../../domain/netback/types';
import { AssessmentStatus, TradeAssessment } from '../../domain/trade/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { formatEur } from '../../domain/companies/money';

const STATUS_LABEL: Record<AssessmentStatus, string> = {
  INDICATIVE: 'Indicative',
  QUOTED: 'Quoted',
  AGREED: 'Agreed',
  TRANSFERRED: 'Transferred',
  DEAD: 'Dead',
};

const STATUS_CHIP_CLASS: Record<AssessmentStatus, string> = {
  INDICATIVE: 'chip-neutral',
  QUOTED: 'chip-info',
  AGREED: 'chip-pos',
  TRANSFERRED: 'chip-pass',
  DEAD: 'chip-neg',
};

/** Forward-progression order shown in the status dropdown; DEAD is reachable from any stage. */
const STATUS_ORDER: AssessmentStatus[] = ['INDICATIVE', 'QUOTED', 'AGREED', 'TRANSFERRED', 'DEAD'];

function statusOf(a: TradeAssessment): AssessmentStatus {
  return a.status ?? 'INDICATIVE';
}

function lastStatusChangeAt(a: TradeAssessment): string | null {
  const history = a.statusHistory;
  if (!history || history.length === 0) return null;
  return history[history.length - 1].at;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

function originLabel(a: TradeAssessment): string {
  const c = a.consignment;
  return c.originPlantName ? `${c.originCountryName} · ${c.originPlantName}` : c.originCountryName;
}

/** The deal's own saved snapshot of the certificate mark it priced against. */
function savedMarkInfo(a: TradeAssessment): { dateLabel: string; badge: SourceBadge } {
  const mark = a.marks?.marks?.[a.targetMarketId];
  const badge = deriveSourceBadge(mark?.provenance, SIMULATED_SOURCE_NAME);
  return { dateLabel: formatDate(mark?.updatedAt), badge };
}

export function DealsScreen() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | 'ALL'>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [repricedIds, setRepriced] = useState<Record<string, NetbackResult | null>>({});
  const [noteDraftId, setNoteDraftId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  // A status change is staged here with a note box before it's dispatched, rather than firing
  // the moment the <select> changes — the trader may want to say why.
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: AssessmentStatus } | null>(null);
  const [statusNoteDraft, setStatusNoteDraft] = useState('');

  const deals = state.savedAssessments;

  const visible = useMemo(
    () => (statusFilter === 'ALL' ? deals : deals.filter(d => statusOf(d) === statusFilter)),
    [deals, statusFilter]
  );

  const totalMwh = visible.reduce((sum, d) => sum + (d.consignment.volumeMWh ?? 0), 0);
  // Dead deals stay listed but don't count towards the book's P&L.
  const totalPnl = visible.filter(d => statusOf(d) !== 'DEAD').reduce((sum, d) => sum + (d.netback.deskPnL ?? 0), 0);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const d of deals) {
      const s = statusOf(d);
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }
    return byStatus;
  }, [deals]);

  const handleOpen = (a: TradeAssessment) => {
    const c = a.consignment;
    navigate(buildDealUrl({
      marketId: a.targetMarketId,
      originCountry: c.originCountry,
      feedstock: c.feedstock,
      ci: c.carbonIntensity,
      volume: c.volumeMWh ?? undefined,
      scheme: c.certificationScheme,
      coc: c.chainOfCustody,
      udb: c.udbStatus,
      pos: c.posStatus,
      counterparty: c.counterparty ?? undefined,
      plantId: c.originPlantId ?? undefined,
      plantName: c.originPlantName ?? undefined,
      dealId: a.id,
    }));
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_ASSESSMENT', id });
    setConfirmDeleteId(null);
  };

  const handleStatusSelect = (a: TradeAssessment, status: AssessmentStatus) => {
    if (status === statusOf(a)) return;
    setPendingStatus({ id: a.id, status });
    setStatusNoteDraft('');
  };

  const handleConfirmStatus = () => {
    if (!pendingStatus) return;
    dispatch({
      type: 'SET_ASSESSMENT_STATUS',
      id: pendingStatus.id,
      status: pendingStatus.status,
      note: statusNoteDraft.trim() ? statusNoteDraft.trim() : undefined,
    });
    setPendingStatus(null);
    setStatusNoteDraft('');
  };

  const handleCancelStatus = () => {
    setPendingStatus(null);
    setStatusNoteDraft('');
  };

  const handleSaveNote = (id: string) => {
    dispatch({ type: 'UPDATE_ASSESSMENT_NOTES', id, notes: noteDraft });
    setNoteDraftId(null);
  };

  const handleReprice = (a: TradeAssessment) => {
    setRepriced(prev => {
      if (prev[a.id] !== undefined) {
        const next = { ...prev };
        delete next[a.id];
        return next;
      }
      const market = getMarketById(a.targetMarketId);
      if (!market) return { ...prev, [a.id]: null };
      // Price it the way the Trade Builder does today: current marks and pricing sides, current costs,
      // and the route's corridor transit tariff in place of the generic logistics cost.
      const tariff = getRouteTransitTariff(a.consignment.originCountry, market.country);
      const costs = tariff != null ? { ...state.costs, logistics: tariff } : state.costs;
      const result = computeNetback(market, a.consignment, state.marks, costs, state.marks.pricingSides);
      return { ...prev, [a.id]: result };
    });
  };

  const StatusControl = ({ a }: { a: TradeAssessment }) => {
    const pending = pendingStatus?.id === a.id ? pendingStatus : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
        <select
          className="input"
          style={{ fontSize: '12px', padding: '4px 6px' }}
          value={pending?.status ?? statusOf(a)}
          data-testid={`status-select-${a.id}`}
          onChange={e => handleStatusSelect(a, e.target.value as AssessmentStatus)}
        >
          {STATUS_ORDER.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        {pending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <input
              type="text"
              className="input"
              style={{ fontSize: '12px', padding: '4px 6px' }}
              placeholder="Note (optional)"
              value={statusNoteDraft}
              onChange={e => setStatusNoteDraft(e.target.value)}
              autoFocus
              data-testid={`status-note-${a.id}`}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={handleConfirmStatus} data-testid={`confirm-status-${a.id}`}>
                Confirm
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={handleCancelStatus}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <span className="mut" style={{ fontSize: '10.5px' }}>
            {lastStatusChangeAt(a) ? formatDate(lastStatusChangeAt(a)) : '—'}
          </span>
        )}
      </div>
    );
  };

  const NotesCell = ({ a }: { a: TradeAssessment }) => {
    if (noteDraftId === a.id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
          <textarea
            className="input"
            style={{ fontSize: '12px', minHeight: '40px' }}
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => handleSaveNote(a.id)}>Save</button>
            <button type="button" className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => setNoteDraftId(null)}>Cancel</button>
          </div>
        </div>
      );
    }
    return (
      <button
        type="button"
        className="btn btn-ghost"
        style={{ fontSize: '12px', padding: '2px 6px', textAlign: 'left', whiteSpace: 'normal' }}
        onClick={() => { setNoteDraftId(a.id); setNoteDraft(a.userNotes || ''); }}
        title="Edit note"
      >
        {a.userNotes ? a.userNotes : <span className="mut">Add note</span>}
      </button>
    );
  };

  const RowActions = ({ a }: { a: TradeAssessment }) => {
    const repriced = repricedIds[a.id];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => handleOpen(a)} data-testid={`open-deal-${a.id}`}>
            Open
          </button>
          <button type="button" className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => handleReprice(a)} data-testid={`reprice-deal-${a.id}`}>
            {repricedIds[a.id] !== undefined ? 'Hide re-price' : 'Re-price now'}
          </button>
          {confirmDeleteId === a.id ? (
            <>
              <span className="mut" style={{ fontSize: '11px' }}>Delete this deal?</span>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => handleDelete(a.id)} data-testid={`confirm-delete-${a.id}`}>
                Confirm
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--color-status-neg-text)' }} onClick={() => setConfirmDeleteId(a.id)} data-testid={`delete-deal-${a.id}`}>
              Delete
            </button>
          )}
        </div>
        {repriced !== undefined && (
          <span className="mut num" style={{ fontSize: '11px' }} data-testid={`reprice-result-${a.id}`}>
            {repriced?.netNetback != null
              ? `Today: €${repriced.netNetback.toFixed(2)}/MWh (saved €${(a.netback.netNetback ?? 0).toFixed(2)})`
              : 'No current market data'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        className="ds-src-head"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '20px',
          padding: '16px var(--ds-page-gutter, 18px)',
          borderBottom: '2px solid var(--color-divider)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 className="ptitle m-page-title font-heading font-extrabold text-[20px] m-0">Deal blotter</h3>
          <div className="subttl text-[12px] mt-1">
            Prices as saved — every deal is the snapshot from when you saved it, not today's market
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`chip ${statusFilter === 'ALL' ? 'chip-a' : ''} cursor-pointer`}
            onClick={() => setStatusFilter('ALL')}
          >
            All ({deals.length})
          </button>
          {STATUS_ORDER.map(s => (
            <button
              key={s}
              type="button"
              className={`chip ${statusFilter === s ? 'chip-a' : ''} cursor-pointer`}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABEL[s]} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px var(--ds-page-gutter, 18px)', display: 'flex', flexWrap: 'wrap', gap: '12px 20px', fontSize: '12px' }} className="mut">
        <span>Showing <span className="num font-semibold">{visible.length}</span> of {deals.length} deals</span>
        <span>Total volume: <span className="num font-semibold">{totalMwh.toLocaleString()}</span> MWh</span>
        <span>Total deal P&amp;L: <span className="num font-semibold">{formatEur(totalPnl)}</span></span>
      </div>

      <div style={{ padding: '0 var(--ds-page-gutter, 18px) 18px' }}>
        {visible.length === 0 ? (
          <div className="mc-empty" data-testid="deals-empty">
            No saved deals yet. Save one from the Trade Builder.
          </div>
        ) : isMobile ? (
          <MobileCardList
            testId="deals-cards"
            items={visible}
            getKey={a => a.id}
            title={a => a.targetMarketName}
            subtitle={a => originLabel(a)}
            metric={a => formatEur(a.netback.deskPnL)}
            metricLabel={() => 'Deal P&L'}
            badges={a => <span className={`chip ${STATUS_CHIP_CLASS[statusOf(a)]}`}>{STATUS_LABEL[statusOf(a)]}</span>}
            fields={a => {
              const mark = savedMarkInfo(a);
              return [
                { label: 'Saved', value: formatDate(a.createdAt) },
                { label: 'Volume', value: `${(a.consignment.volumeMWh ?? 0).toLocaleString()} MWh`, mono: true },
                { label: 'Netback', value: a.netback.netNetback != null ? `€${a.netback.netNetback.toFixed(2)}/MWh` : '—', mono: true },
                { label: 'Desk margin', value: a.netback.deskMargin != null ? `€${a.netback.deskMargin.toFixed(2)}/MWh` : '—', mono: true },
                { label: 'Mark', value: <SourceChip badge={mark.badge} suffix={mark.dateLabel} />, span: 2 },
                { label: 'Actions', value: <RowActions a={a} />, span: 2 },
                { label: 'Status', value: <StatusControl a={a} />, span: 2 },
                { label: 'Notes', value: <NotesCell a={a} />, span: 2 },
              ];
            }}
          />
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)' }}>
            <table className="table" style={{ fontSize: '13px', margin: 0 }}>
              <thead>
                <tr>
                  <th>Saved</th>
                  <th>Market</th>
                  <th>Origin</th>
                  <th style={{ textAlign: 'right' }}>Volume (MWh)</th>
                  <th style={{ textAlign: 'right' }}>Netback</th>
                  <th style={{ textAlign: 'right' }}>Producer payable</th>
                  <th style={{ textAlign: 'right' }}>Desk margin</th>
                  <th style={{ textAlign: 'right' }}>Deal P&amp;L</th>
                  <th>Mark</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(a => {
                  const mark = savedMarkInfo(a);
                  return (
                    <tr key={a.id} data-testid={`deal-row-${a.id}`}>
                      <td style={{ fontSize: '12px' }}>{formatDate(a.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>{a.targetMarketName}</td>
                      <td style={{ fontSize: '12px' }}>{originLabel(a)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{(a.consignment.volumeMWh ?? 0).toLocaleString()}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{a.netback.netNetback != null ? `€${a.netback.netNetback.toFixed(2)}` : '—'}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{a.netback.producerPayable != null ? `€${a.netback.producerPayable.toFixed(2)}` : '—'}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{a.netback.deskMargin != null ? `€${a.netback.deskMargin.toFixed(2)}` : '—'}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{formatEur(a.netback.deskPnL)}</td>
                      <td>
                        <SourceChip badge={mark.badge} suffix={mark.dateLabel} />
                      </td>
                      <td>
                        <span className={`chip ${STATUS_CHIP_CLASS[statusOf(a)]}`} style={{ marginBottom: '4px', display: 'inline-block' }}>
                          {STATUS_LABEL[statusOf(a)]}
                        </span>
                        <StatusControl a={a} />
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        <NotesCell a={a} />
                      </td>
                      <td>
                        <RowActions a={a} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
