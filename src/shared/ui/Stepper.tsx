import React from 'react';
import { Check } from 'lucide-react';

export interface StepperStep<T extends number = number> {
  id: T;
  label: string;
}

export interface StepperProps<T extends number = number> {
  steps: StepperStep<T>[];
  current: T;
  onSelect: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}

/** Numbered step indicator for multi-page flows. Every step stays clickable so users can
 *  jump back (or ahead, when earlier steps have defaults) without losing their inputs. */
export function Stepper<T extends number = number>({
  steps,
  current,
  onSelect,
  ariaLabel = 'Progress',
  className = '',
}: StepperProps<T>) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="ds-stepper">
        {steps.map((step, index) => {
          const position = steps.findIndex(s => s.id === current);
          const state = index < position ? 'done' : index === position ? 'current' : 'todo';
          return (
            <li key={step.id} className={`ds-step ${state}`}>
              <button type="button" onClick={() => onSelect(step.id)} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="ds-step-num num">{state === 'done' ? <Check size={13} strokeWidth={3} /> : index + 1}</span>
                <span className="ds-step-label">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
