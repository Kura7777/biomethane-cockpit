import React, { useState } from 'react';
import { Check, CheckCircle2, ChevronRight, X, ExternalLink, RefreshCw } from 'lucide-react';
import { BrokerParseResult } from '../../domain/markets/brokerRunParser';
import { commitBrokerRunToState } from '../../domain/marks/commitBrokerRun';
import { useAppState } from '../../store/context';
import { showToast } from '../../app/DeskToastContainer';

interface StagedMarksCardProps {
  stagedRun: BrokerParseResult;
  onDismiss: () => void;
  onOpenImporter?: () => void;
}

export function StagedMarksCard({ stagedRun, onDismiss, onOpenImporter }: StagedMarksCardProps) {
  const { dispatch } = useAppState();
  const [committed, setCommitted] = useState(false);

  const validMarks = stagedRun.marks.filter(m => m.isValid && m.marketId);
  const effectiveDate = stagedRun.extractedDate || new Date().toISOString().slice(0, 10);

  const handleCommit = () => {
    const count = commitBrokerRunToState(dispatch, stagedRun, effectiveDate);
    if (count > 0) {
      setCommitted(true);
      showToast(`Successfully committed ${count} broker mark(s) to pricing book (run dated ${effectiveDate})`, 'success');
      setTimeout(() => {
        onDismiss();
      }, 2500);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-lg backdrop-blur-xs text-stone-100 animate-fade-in" data-testid="staged-marks-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <RefreshCw size={14} className={committed ? 'animate-spin' : ''} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
              Staged Broker Price Update
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/50 text-emerald-300">
                {stagedRun.brokerDetected || 'OTC Run'} · {effectiveDate}
              </span>
            </h4>
            <p className="text-xs text-stone-400">
              {validMarks.length} market quote{validMarks.length === 1 ? '' : 's'} staged for trader review.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-stone-400 hover:text-stone-200 transition-colors p-1"
          title="Dismiss staged marks"
        >
          <X size={16} />
        </button>
      </div>

      {/* Quote summary table */}
      <div className="overflow-x-auto rounded-lg border border-stone-800 bg-stone-950/60 mb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stone-800 text-stone-400 text-left bg-stone-900/40">
              <th className="py-1.5 px-3 font-medium">Market</th>
              <th className="py-1.5 px-3 font-medium text-right">Bid</th>
              <th className="py-1.5 px-3 font-medium text-right">Offer</th>
              <th className="py-1.5 px-3 font-medium text-right">Mid</th>
              <th className="py-1.5 px-3 font-medium text-right">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {validMarks.map((m, idx) => (
              <tr key={idx} className="hover:bg-stone-900/30">
                <td className="py-1 px-3 font-medium text-stone-200">
                  <span className="font-mono text-emerald-400 mr-1.5">{m.marketId}</span>
                  <span className="text-stone-400 text-[11px]">({m.marketName})</span>
                </td>
                <td className="py-1 px-3 text-right font-mono text-stone-300">
                  {m.bid !== null ? m.bid.toFixed(2) : '—'}
                </td>
                <td className="py-1 px-3 text-right font-mono text-stone-300">
                  {m.ask !== null ? m.ask.toFixed(2) : '—'}
                </td>
                <td className="py-1 px-3 text-right font-mono font-semibold text-emerald-300">
                  {m.midPrice !== null ? m.midPrice.toFixed(2) : '—'}
                </td>
                <td className="py-1 px-3 text-right text-[11px] text-stone-400">
                  {m.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {onOpenImporter && (
          <button
            type="button"
            onClick={onOpenImporter}
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            <span>Review in Importer Modal</span>
            <ExternalLink size={12} />
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-xs font-medium text-stone-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={committed || validMarks.length === 0}
            onClick={handleCommit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            {committed ? (
              <>
                <Check size={14} />
                <span>Committed to Desk</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Commit {validMarks.length} Mark{validMarks.length === 1 ? '' : 's'} to Desk</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
