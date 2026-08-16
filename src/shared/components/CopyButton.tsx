import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

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

  const closeModal = useCallback(() => {
    setShowPraModal(false);
    // Return focus to the control that opened the dialog (MASTER §6).
    triggerRef.current?.focus();
  }, []);

  // Escape must dismiss the dialog — every modal needs a keyboard escape route.
  useEffect(() => {
    if (!showPraModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    // Move focus into the dialog so keyboard users aren't stranded behind it.
    confirmRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPraModal, closeModal]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleCopyClick}
        aria-label={copied ? 'Copied to clipboard' : label}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded cursor-pointer
          border border-stone-700 bg-stone-800 text-stone-200
          hover:bg-stone-700 hover:border-stone-600
          active:bg-stone-600
          focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950
          transition-colors duration-150
          ${copied ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : ''}
          ${className}`}
      >
        {/* Lucide icons, not 📋 / ✓ emoji (MASTER §4) */}
        {copied ? (
          <><Check className="w-4 h-4 shrink-0" aria-hidden="true" /> Copied</>
        ) : (
          <><Copy className="w-4 h-4 shrink-0" aria-hidden="true" /> {label}</>
        )}
      </button>

      {/* PRA Licence Guard Modal */}
      {showPraModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[100] font-sans"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pra-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-amber-800/80 max-w-md w-full p-3 space-y-2 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-950/80 border border-amber-700/80 rounded text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="pra-modal-title" className="text-sm font-bold text-white font-mono uppercase tracking-wide">
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

            <div className="bg-stone-950 border border-stone-800 rounded p-3 text-meta font-mono text-stone-400">
              Ensure you have commercial rights or internal clearance before sending this dossier externally.
            </div>

            <div className="flex justify-end items-center gap-2 pt-1 font-mono text-xs">
              <button
                onClick={closeModal}
                className="px-3 py-1.5 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
              >
                Cancel
              </button>
              <button
                ref={confirmRef}
                onClick={() => {
                  setShowPraModal(false);
                  performCopy();
                }}
                className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
              >
                Acknowledge &amp; Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
