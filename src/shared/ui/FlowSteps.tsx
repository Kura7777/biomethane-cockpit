import React, { ReactNode, useEffect, useRef } from 'react';
import { Check, Pencil } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';

export interface FlowStep<T extends number = number> {
  id: T;
  label: string;
  /** One-line recap shown once the step is done. */
  summary: string;
}

export interface FlowStepsProps<T extends number = number> {
  steps: FlowStep<T>[];
  current: T;
  onSelect: (id: T) => void;
  /** Body of the open step. */
  renderBody: (id: T) => ReactNode;
  ariaLabel: string;
}

/** Vertical step flow: numbered markers on a rail, only the current step open, finished steps
 *  folded to a one-line summary with an Edit link. Every step is clickable. Wrap it in
 *  .ds-flow-column so every step shares one fixed width. Styles: ds-flow-* in desk.css. */
export function FlowSteps<T extends number = number>({ steps, current, onSelect, renderBody, ariaLabel }: FlowStepsProps<T>) {
  const isMobile = useIsMobile();
  const stepRefs = useRef(new Map<T, HTMLLIElement>());
  const hasMounted = useRef(false);

  // When a step opens, bring its heading into view if the fold moved it off screen
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const el = stepRefs.current.get(current);
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 60 || top > window.innerHeight - 160) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [current]);

  const currentIndex = steps.findIndex(s => s.id === current);

  // Mobile: the vertical rail with folded/expanded steps doesn't fit a phone width well, so it
  // collapses to a "Step N of M · Label" line and a thin progress bar; only the current step's
  // body renders below it. Desktop (>=768px) keeps the full rail unchanged.
  if (isMobile) {
    const total = steps.length;
    const step = steps[currentIndex];
    const percent = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
    return (
      <div className="ds-flow-mobile" aria-label={ariaLabel}>
        <div className="ds-flow-mobile-head">
          <span className="ds-flow-mobile-step num">Step {currentIndex + 1} of {total}</span>
          {step && (
            <>
              <span className="ds-flow-mobile-sep" aria-hidden="true">·</span>
              <span className="ds-flow-mobile-label">{step.label}</span>
            </>
          )}
        </div>
        <div className="ds-flow-mobile-track">
          <div className="ds-flow-mobile-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="ds-flow-mobile-body">{step && renderBody(step.id)}</div>
      </div>
    );
  }

  return (
    <ol className="ds-flow" aria-label={ariaLabel}>
      {steps.map(({ id, label, summary }, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
        return (
          <li
            key={id}
            ref={el => {
              if (el) stepRefs.current.set(id, el);
              else stepRefs.current.delete(id);
            }}
            className={`ds-flow-step ${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <div className="ds-flow-rail" aria-hidden="true">
              <div className="ds-flow-marker num">
                {state === 'done' ? <Check size={16} strokeWidth={3} /> : String(index + 1).padStart(2, '0')}
              </div>
              <div className="ds-flow-line" />
            </div>

            <div className="ds-flow-main">
              <div className="ds-flow-head">
                <h3 className="ds-flow-name">
                  <button
                    type="button"
                    className="ds-flow-title"
                    onClick={() => onSelect(id)}
                    disabled={state === 'current'}
                    aria-expanded={state === 'current'}
                  >
                    <span className="ds-flow-label">{label}</span>
                    {state === 'done' && <span className="ds-flow-summary num">{summary}</span>}
                  </button>
                </h3>
                {state === 'done' && (
                  <button type="button" className="ds-flow-edit" onClick={() => onSelect(id)} aria-label={`Edit ${label.toLowerCase()}`}>
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>

              {state === 'current' && <div className="ds-flow-body">{renderBody(id)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
