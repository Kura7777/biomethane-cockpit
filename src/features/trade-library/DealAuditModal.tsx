import React from 'react';
import { DealAuditEntry, DealStatus } from '../../domain/deals/types';
import { ROLE_DEFINITIONS } from '../../domain/auth/rbac';
import { Role } from '../../domain/auth/types';
import { History, X, Shield, ArrowRight, Clock, User } from 'lucide-react';

interface DealAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealTitle: string;
  auditTrail: DealAuditEntry[];
}

function getStatusBadgeStyle(status: DealStatus | string | null): React.CSSProperties {
  switch (status) {
    case 'SETTLED':
      return {
        backgroundColor: 'rgba(147, 51, 234, 0.12)',
        color: 'var(--color-text)',
        borderColor: 'rgba(147, 51, 234, 0.3)',
      };
    case 'EXECUTED':
      return {
        backgroundColor: 'var(--color-status-pass-bg)',
        color: 'var(--color-status-pass-ink)',
        borderColor: 'var(--color-status-pass-border)',
      };
    case 'PRICED':
      return {
        backgroundColor: 'var(--color-status-info-bg)',
        color: 'var(--color-pnl-pos)',
        borderColor: 'var(--color-status-info-border)',
      };
    case 'RFQ':
      return {
        backgroundColor: 'var(--color-status-warn-bg)',
        color: 'var(--color-status-warn-ink)',
        borderColor: 'var(--color-status-warn-border)',
      };
    case 'DRAFT':
    default:
      return {
        backgroundColor: 'var(--color-track)',
        color: 'var(--color-muted)',
        borderColor: 'var(--color-line)',
      };
  }
}

export function DealAuditModal({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  auditTrail,
}: DealAuditModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Audit Trail for Deal ${dealId}`}
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      style={{ fontFamily: 'var(--font-body, system-ui, sans-serif)' }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
          color: 'var(--color-text)',
        }}
        className="w-full max-w-3xl border shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* HEADER */}
        <div
          style={{
            borderBottomColor: 'var(--color-line)',
            backgroundColor: 'var(--color-surface)',
          }}
          className="p-3.5 px-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: 'var(--color-track)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
                color: 'var(--color-pnl-pos)',
              }}
              className="w-8 h-8 border flex items-center justify-center"
            >
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span>Append-only trade ledger audit trail</span>
                <span
                  style={{
                    backgroundColor: 'var(--color-track)',
                    borderColor: 'var(--color-line)',
                    color: 'var(--color-text)',
                    borderRadius: 'var(--radius-control)',
                  }}
                  className="text-[11px] font-normal px-2 py-0.5 border"
                >
                  {dealId}
                </span>
              </h2>
              <p style={{ color: 'var(--color-muted)' }} className="text-xs truncate max-w-xl">
                {dealTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: 'var(--color-muted)' }}
            className="hover:opacity-80 p-1 cursor-pointer transition-opacity"
            aria-label="Close audit trail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY TIMELINE */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div
            style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}
            className="text-xs flex items-center justify-between pb-2 border-b"
          >
            <span>Audit chain: {auditTrail.length} records</span>
            <span style={{ color: 'var(--color-muted)' }}>Immutable cryptographic audit trail</span>
          </div>

          {auditTrail.length === 0 ? (
            <div style={{ color: 'var(--color-muted)' }} className="text-center py-10 text-xs">
              No historical status transitions recorded for this deal.
            </div>
          ) : (
            <div
              style={{ borderColor: 'var(--color-line)' }}
              className="relative border-l-2 ml-4 pl-4 space-y-5"
            >
              {auditTrail.map((entry, idx) => {
                const roleDef = ROLE_DEFINITIONS[entry.actorRole as Role] || {
                  badgeClass: '',
                  badgeLabel: entry.actorRole,
                };

                return (
                  <div key={entry.id || idx} className="relative group">
                    {/* Circle marker */}
                    <div
                      style={{
                        backgroundColor: 'var(--color-pnl-pos)',
                        borderColor: 'var(--color-surface)',
                      }}
                      className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2"
                    />

                    <div
                      style={{
                        backgroundColor: 'var(--color-bg)',
                        borderColor: 'var(--color-line)',
                        borderRadius: 'var(--radius-control)',
                      }}
                      className="border p-3 shadow-2xs transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          {entry.previousStatus && (
                            <>
                              <span
                                style={{
                                  ...getStatusBadgeStyle(entry.previousStatus),
                                  borderRadius: 'var(--radius-control)',
                                }}
                                className="px-2 py-0.5 border text-[11px] font-semibold"
                              >
                                {entry.previousStatus}
                              </span>
                              <ArrowRight style={{ color: 'var(--color-muted)' }} className="w-3 h-3" />
                            </>
                          )}
                          <span
                            style={{
                              ...getStatusBadgeStyle(entry.newStatus),
                              borderRadius: 'var(--radius-control)',
                            }}
                            className="px-2 py-0.5 border text-[11px] font-semibold"
                          >
                            {entry.newStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              borderRadius: 'var(--radius-control)',
                              backgroundColor: 'var(--color-track)',
                              borderColor: 'var(--color-line)',
                              color: 'var(--color-muted)',
                            }}
                            className="px-1.5 py-0.5 border text-[11px] font-medium"
                          >
                            {roleDef.badgeLabel}
                          </span>
                          <span style={{ color: 'var(--color-text)' }} className="text-xs flex items-center gap-1 font-medium">
                            <User style={{ color: 'var(--color-muted)' }} className="w-3 h-3" />
                            {entry.actor}
                          </span>
                        </div>
                      </div>

                      <p style={{ color: 'var(--color-text)' }} className="text-xs leading-relaxed mb-2">
                        {entry.note || 'Status transitioned in trade ledger.'}
                      </p>

                      <div style={{ color: 'var(--color-muted)' }} className="flex items-center gap-1 text-[11px] tabular-nums">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(entry.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' })}</span>
                        <span className="ml-auto">ID: {entry.id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            borderTopColor: 'var(--color-line)',
            backgroundColor: 'var(--color-surface)',
          }}
          className="p-3 px-4 border-t flex justify-end"
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--color-track)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--color-text)',
            }}
            className="px-4 py-1.5 border text-xs font-medium cursor-pointer transition-colors shadow-2xs hover:opacity-90"
          >
            Close audit trail
          </button>
        </div>
      </div>
    </div>
  );
}
