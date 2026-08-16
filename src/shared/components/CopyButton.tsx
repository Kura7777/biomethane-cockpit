import React, { useState, useCallback } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  praWarning?: boolean;
  praSources?: string[] | string | null;
  praSourceName?: string | null; // legacy backwards-compat
}

export function CopyButton({ text, label = 'Copy', className = '', praWarning = false, praSources, praSourceName }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showPraModal, setShowPraModal] = useState(false);

  const formattedSources = Array.isArray(praSources) 
    ? praSources.join(', ') 
    : praSources || praSourceName || null;

  const performCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  }, [text]);

  const handleCopyClick = useCallback(() => {
    if (praWarning) {
      setShowPraModal(true);
    } else {
      performCopy();
    }
  }, [praWarning, performCopy]);

  return (
    <>
      <button
        onClick={handleCopyClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
          border border-stone-700 bg-stone-800 text-stone-200 
          hover:bg-stone-700 hover:border-stone-600
          active:bg-stone-600
          transition-all duration-150
          ${copied ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : ''}
          ${className}`}
      >
        {copied ? (
          <><span>✓</span> Copied</>
        ) : (
          <><span>📋</span> {label}</>
        )}
      </button>

      {/* PRA Licence Guard Modal */}
      {showPraModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-stone-900 border border-amber-800/80 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-950/80 border border-amber-700/80 rounded-lg text-amber-400 shrink-0">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  PRA Subscription Licence Notice
                </h3>
                <p className="text-xs text-stone-300 mt-1.5 leading-relaxed font-mono">
                  This assessment includes <strong className="text-amber-300">Price Reporting Agency (PRA)</strong> data{formattedSources ? ` (${formattedSources})` : ''}.
                </p>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                  PRA subscriptions (e.g. Platts, Argus, QC Intel) are typically licensed per <em>named user</em> and prohibit redistribution of assessed price marks to external counterparties or un-licensed third parties.
                </p>
              </div>
            </div>

            <div className="bg-stone-950 border border-stone-800 rounded p-3 text-[11px] font-mono text-stone-400">
              Ensure you have commercial rights or internal clearance before sending this dossier externally.
            </div>

            <div className="flex justify-end items-center gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() => setShowPraModal(false)}
                className="px-3 py-1.5 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPraModal(false);
                  performCopy();
                }}
                className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold transition-colors"
              >
                Acknowledge & Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
