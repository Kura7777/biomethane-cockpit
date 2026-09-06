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

function getStatusBadgeClass(status: DealStatus | string | null): string {
  switch (status) {
    case 'SETTLED':
      return 'bg-purple-950 text-purple-300 border-purple-800';
    case 'EXECUTED':
      return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    case 'PRICED':
      return 'bg-amber-950 text-amber-300 border-amber-800';
    case 'RFQ':
      return 'bg-sky-950 text-sky-300 border-sky-800';
    case 'DRAFT':
    default:
      return 'bg-[#0e1118] text-zinc-300 border-[#2b3347]';
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
      className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150"
    >
      <div className="w-full max-w-3xl bg-[#08090d] border border-[#2b3347] shadow-2xl rounded-lg flex flex-col max-h-[85vh] overflow-hidden">
        {/* HEADER */}
        <div className="p-3.5 px-4 border-b border-[#1e2433] bg-[#0e1118] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <span>Append-Only Trade Ledger Audit Trail</span>
                <span className="text-micro font-normal px-2 py-0.5 rounded bg-[#141824] text-zinc-300 font-mono">
                  {dealId}
                </span>
              </h2>
              <p className="font-mono text-micro text-zinc-400 truncate max-w-xl">
                {dealTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer transition-colors"
            aria-label="Close Audit Trail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY TIMELINE */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="text-xs font-mono text-zinc-400 flex items-center justify-between pb-2 border-b border-[#1e2433]">
            <span>Audit Chain: {auditTrail.length} Records</span>
            <span className="text-zinc-500">Immutable Cryptographic Audit Trail</span>
          </div>

          {auditTrail.length === 0 ? (
            <div className="text-center py-10 font-mono text-xs text-zinc-500">
              No historical status transitions recorded for this deal.
            </div>
          ) : (
            <div className="relative border-l-2 border-[#1e2433] ml-4 pl-4 space-y-5">
              {auditTrail.map((entry, idx) => {
                const roleDef = ROLE_DEFINITIONS[entry.actorRole as Role] || {
                  badgeClass: 'bg-[#141824] text-zinc-300 border-[#2b3347]',
                  badgeLabel: entry.actorRole,
                };

                return (
                  <div key={entry.id || idx} className="relative group">
                    {/* Circle marker */}
                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-stone-950" />

                    <div className="bg-[#0e1118] border border-[#1e2433] rounded-md p-3 hover:border-[#2b3347] transition-colors">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          {entry.previousStatus && (
                            <>
                              <span className={`px-2 py-0.5 rounded border text-micro font-bold ${getStatusBadgeClass(entry.previousStatus)}`}>
                                {entry.previousStatus}
                              </span>
                              <ArrowRight className="w-3 h-3 text-zinc-500" />
                            </>
                          )}
                          <span className={`px-2 py-0.5 rounded border text-micro font-bold ${getStatusBadgeClass(entry.newStatus)}`}>
                            {entry.newStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded border text-micro font-mono font-semibold ${roleDef.badgeClass}`}>
                            {roleDef.badgeLabel}
                          </span>
                          <span className="font-mono text-micro text-zinc-300 flex items-center gap-1">
                            <User className="w-3 h-3 text-zinc-500" />
                            {entry.actor}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed font-sans mb-2">
                        {entry.note || 'Status transitioned in trade ledger.'}
                      </p>

                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(entry.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' })}</span>
                        <span className="ml-auto text-zinc-600">ID: {entry.id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 px-4 border-t border-[#1e2433] bg-[#0e1118] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141824] hover:bg-[#1e2433] text-zinc-200 rounded font-mono text-xs cursor-pointer transition-colors"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}
