import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../store/context';
import { parseBrokerRunText, BrokerParseResult } from '../../domain/markets/brokerRunParser';
import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';
import { quoteIdentityForMarket } from '../../domain/marks/applyMarks';
import { commitBrokerRunToState } from '../../domain/marks/commitBrokerRun';
import { showToast } from '../../app/DeskToastContainer';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface BrokerRunImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitted?: (count: number) => void;
  onFail?: () => void;
}

export function BrokerRunImporterModal({ isOpen, onClose, onCommitted, onFail }: BrokerRunImporterModalProps) {
  const { dispatch } = useAppState();
  // Starts empty as required by Phase 1b
  const [inputText, setInputText] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const parseResult: BrokerParseResult = useMemo(() => {
    return parseBrokerRunText(inputText, 'Broker Panel', customDate || undefined);
  }, [inputText, customDate]);

  const effectiveRunDate = parseResult.extractedDate || customDate;

  if (!isOpen) return null;

  const validLinesCount = parseResult.marks.filter(m => m.isValid).length;
  const totalLines = inputText.trim().split('\n').filter(Boolean).length;
  const canCommit = validLinesCount > 0 && Boolean(effectiveRunDate);

  const handleCommit = () => {
    if (!effectiveRunDate) {
      showToast('Please specify the broker run observation date before importing');
      return;
    }

    const count = commitBrokerRunToState(dispatch, parseResult, effectiveRunDate);
    if (count > 0) {
      showToast(`Broker run parsed · ${count} marks updated (observed ${effectiveRunDate})`);
      if (onCommitted) onCommitted(count);
      onClose();
    }
  };

  const handleSimulateBadRun = () => {
    onClose();
    if (onFail) onFail();
    showToast('Failed broker parse simulated — error strip displayed');
  };

  return (
    <div
      className="scrim m-dialog-scrim"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Import broker run"
      onClick={onClose}
    >
      <div
        className="panel m-dialog"
        style={{
          width: 'min(720px, 100%)',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-panel)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="m-dialog-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            padding: '14px 18px',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '2px solid var(--color-divider)',
          }}
        >
          <div>
            <h5 style={{ margin: 0, fontSize: '17px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              Import broker run
            </h5>
            <div style={{ fontSize: '12px', marginTop: '2px' }} className="mut">
              Paste an OTC broker run as it arrives. Every parsed line writes bid / mid / offer with BROKER provenance and an observed timestamp.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: 'var(--radius-control)',
            }}
            onClick={onClose}
          >
            Esc ✕
          </button>
        </div>

        {/* Content */}
        <div className="m-dialog-body" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="field">
            <label htmlFor="brokerRun">Broker run text (paste WhatsApp, email, CSV, or broker sheet)</label>
            <textarea
              id="brokerRun"
              className="input num"
              placeholder={`Paste broker quotes here, one per line (separate product and prices with two spaces, a tab or a comma). Include the run date, e.g.:
Run dated 2026-09-12
DE THG  280.00 / 290.00
UK RTFO  0.205 / 0.225`}
              style={{ minHeight: '150px', fontSize: '12px', lineHeight: 1.6, borderRadius: 'var(--radius-control)' }}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
          </div>

          {/* Date Detection & Required Date Field */}
          {parseResult.extractedDate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)' }}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" style={{ color: '#10b981' }} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                Observed date detected in run: <strong>{parseResult.extractedDate}</strong>
              </span>
            </div>
          ) : (
            <div className="field" style={{ backgroundColor: 'var(--color-surface)', padding: '10px 12px', borderRadius: 'var(--radius-control)', border: '1px solid var(--color-warn)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Calendar className="w-4 h-4 text-amber-500" style={{ color: '#f59e0b' }} />
                <label htmlFor="customRunDate" style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--color-warn)' }}>
                  Broker run date required (no date found in text):
                </label>
              </div>
              <input
                id="customRunDate"
                type="date"
                required
                className="input"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                style={{ width: '100%', maxWidth: '240px', minHeight: '36px', fontSize: '12px', borderRadius: 'var(--radius-control)' }}
              />
              <span className="mut" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                Enter the date this run was quoted by the broker. Stamps observedAt on imported marks.
              </span>
            </div>
          )}

          <div
            className="brk-stats"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '1px',
              backgroundColor: 'var(--color-divider)',
              borderRadius: 'var(--radius-control)',
              overflow: 'hidden',
            }}
          >
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px 14px' }}>
              <div className="eyebrow">Lines detected</div>
              <div className="num" style={{ fontSize: '18px', fontWeight: 800 }}>
                {totalLines}
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px 14px' }}>
              <div className="eyebrow">Markets matched</div>
              <div className="num" style={{ fontSize: '18px', fontWeight: 800 }}>
                {validLinesCount} quotes
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px 14px' }}>
              <div className="eyebrow">Provenance written</div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                Broker · {effectiveRunDate ? `observed ${effectiveRunDate}` : 'date required'}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', lineHeight: 1.55, margin: 0 }} className="mut">
            Unmatched market codes are never guessed — they are reported and skipped, so a mistyped line cannot silently overwrite a desk mark.
          </p>

          <div className="brk-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ borderRadius: 'var(--radius-control)' }}
              onClick={handleSimulateBadRun}
            >
              Simulate a bad run
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canCommit}
              style={{
                borderRadius: 'var(--radius-control)',
                opacity: canCommit ? 1 : 0.5,
                cursor: canCommit ? 'pointer' : 'not-allowed',
              }}
              onClick={handleCommit}
            >
              Parse and write {validLinesCount} marks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
