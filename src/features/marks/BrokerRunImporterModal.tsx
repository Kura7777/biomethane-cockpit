import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../store/context';
import { parseBrokerRunText, BrokerParseResult } from '../../domain/marks/brokerParser';
import { calculateMarksDiff, MarkDiffItem } from '../../domain/marks/marksStore';
import { showToast } from '../../app/DeskToastContainer';

interface BrokerRunImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitted?: (count: number) => void;
  onFail?: () => void;
}

const DEFAULT_RUN = `DE THG 2026  225.40 / 231.60
NL ERE 2026  0.211 / 0.217
IT CIC 2026  370.00 / 380.00
FR CPB 2026  96.50 / 99.50
FR TIRUERT   112.00 / 117.00
SE TAX 2026  68.00 / 72.40
AT EGG 2026  58.00 / 64.00
GB dRTFC     0.182 / 0.190
TTF M+1      31.86 / 31.98`;

export function BrokerRunImporterModal({ isOpen, onClose, onCommitted, onFail }: BrokerRunImporterModalProps) {
  const { state, dispatch } = useAppState();
  const [inputText, setInputText] = useState<string>(DEFAULT_RUN);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const parseResult: BrokerParseResult = useMemo(() => {
    return parseBrokerRunText(inputText, 'Broker Panel', new Date().toISOString().slice(0, 10));
  }, [inputText]);

  const diffItems: MarkDiffItem[] = useMemo(() => {
    return calculateMarksDiff(parseResult.marks, state.marks);
  }, [parseResult.marks, state.marks]);

  if (!isOpen) return null;

  const validLinesCount = parseResult.marks.filter(m => m.isValid).length;
  const totalLines = inputText.trim().split('\n').filter(Boolean).length;

  const handleCommit = () => {
    const validMarks = parseResult.marks.filter(m => m.isValid && m.marketId);
    if (validMarks.length === 0) return;

    const now = new Date().toISOString();

    validMarks.forEach(item => {
      if (item.marketId === 'GAS_TTF') {
        dispatch({
          type: 'SET_GAS_INDEX',
          mid: item.midPrice,
          bid: item.bid,
          offer: item.ask,
          updatedAt: now,
          provenance: {
            sourceType: 'BROKER_INDICATION',
            sourceName: 'Broker Indication',
            sourceUrl: null,
            observedAt: now,
            note: 'Imported via broker run',
          },
        });
      } else if (item.marketId) {
        dispatch({
          type: 'SET_MARK',
          marketId: item.marketId,
          mid: item.midPrice,
          bid: item.bid,
          offer: item.ask,
          source: `BROKER · ${new Date().toLocaleDateString()}`,
          updatedAt: now,
          provenance: {
            sourceType: 'BROKER_INDICATION',
            sourceName: 'Broker Indication',
            sourceUrl: null,
            observedAt: now,
            note: 'Imported via broker run',
          },
        });
      }
    });

    showToast(`Broker run parsed · ${validMarks.length} marks updated, provenance set to BROKER`);
    if (onCommitted) onCommitted(validMarks.length);
    onClose();
  };

  const handleSimulateBadRun = () => {
    onClose();
    if (onFail) onFail();
    showToast('Failed broker parse simulated — error strip displayed');
  };

  return (
    <div
      className="scrim"
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
        className="panel"
        style={{
          width: 'min(720px, 100%)',
          backgroundColor: 'var(--color-bg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
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
              Paste a broker run as it arrives. Every parsed line writes bid / mid / offer with BROKER provenance and an observed timestamp.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              fontSize: '12px',
            }}
            onClick={onClose}
          >
            Esc ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="field">
            <label htmlFor="brokerRun">Broker run text</label>
            <textarea
              id="brokerRun"
              className="input num"
              style={{ minHeight: '150px', fontSize: '12px', lineHeight: 1.6 }}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '1px',
              backgroundColor: 'var(--color-divider)',
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
                {validLinesCount} of 16
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px 14px' }}>
              <div className="eyebrow">Provenance written</div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                Broker · observed now
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', lineHeight: 1.55, margin: 0 }} className="mut">
            Unmatched market codes are never guessed — they are reported and skipped, so a mistyped line cannot silently overwrite a desk mark.
          </p>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSimulateBadRun}
            >
              Simulate a bad run
            </button>
            <button
              type="button"
              className="btn btn-primary"
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
