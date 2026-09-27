import React, { ReactNode, useEffect, useRef } from 'react';
import { Check, Pencil } from 'lucide-react';

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

/** Vertical step flow shared by the FuelEU tools: numbered markers on a rail, only the current
 *  step open, finished steps folded to a one-line summary with an Edit link. Every step is
 *  clickable, and all steps share one column width (see .fva in vesselArchetypeCalculator.css). */
export function FlowSteps<T extends number = number>({ steps, current, onSelect, renderBody, ariaLabel }: FlowStepsProps<T>) {
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

  return (
    <ol className="fva-flow" aria-label={ariaLabel}>
      {steps.map(({ id, label, summary }, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
        return (
          <li
            key={id}
            ref={el => {
              if (el) stepRefs.current.set(id, el);
              else stepRefs.current.delete(id);
            }}
            className={`fva-flow-step ${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <div className="fva-flow-rail" aria-hidden="true">
              <div className="fva-flow-marker num">
                {state === 'done' ? <Check size={16} strokeWidth={3} /> : String(index + 1).padStart(2, '0')}
              </div>
              <div className="fva-flow-line" />
            </div>

            <div className="fva-flow-main">
              <div className="fva-flow-head">
                <h3 className="fva-flow-name">
                  <button
                    type="button"
                    className="fva-flow-title"
                    onClick={() => onSelect(id)}
                    disabled={state === 'current'}
                    aria-expanded={state === 'current'}
                  >
                    <span className="fva-flow-label">{label}</span>
                    {state === 'done' && <span className="fva-flow-summary num">{summary}</span>}
                  </button>
                </h3>
                {state === 'done' && (
                  <button type="button" className="fva-edit-link" onClick={() => onSelect(id)} aria-label={`Edit ${label.toLowerCase()}`}>
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>

              {state === 'current' && <div className="fva-flow-body">{renderBody(id)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
