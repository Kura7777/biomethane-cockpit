import React, { useState } from 'react';
import { getAssumption, setAssumption } from '../../domain/assumptions/registry';

interface AssumptionInputProps {
  assumptionKey: string;
  label: string;
  min?: number;
  max?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Number field for one assumption. The trader's keystrokes stay in a local draft and the value
 * is committed (and clamped by the register) on blur or Enter - clamping per keystroke made
 * values such as 50000 untypeable when the minimum is 100 (typing "5" snapped to 100).
 */
export function AssumptionInput({ assumptionKey, label, min, max, className, style }: AssumptionInputProps) {
  const stored = getAssumption(assumptionKey);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const v = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(v)) setAssumption(assumptionKey, v);
    setDraft(null); // show the stored (clamped) value again
  };

  return (
    <input
      type="number"
      className={className}
      style={style}
      aria-label={label}
      value={draft ?? String(stored)}
      step="any"
      min={min}
      max={max}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}
