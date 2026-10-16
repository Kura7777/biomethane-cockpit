import React from 'react';
import { Check, X } from 'lucide-react';
import { saveDeskRuleChecked } from '../../domain/help/deskMemory';
import { removeStagedMemory, type StagedMemoryRule } from './helperStore';
import { showToast } from '../../app/DeskToastContainer';

/** A desk memory rule the helper proposed. Nothing is stored until the trader confirms it here. */
export function StagedMemoryCard({ rule }: { rule: StagedMemoryRule }) {
  const confirm = () => {
    const res = saveDeskRuleChecked({ subject: rule.subject, rule: rule.rule, category: rule.category });
    if (res.ok) {
      removeStagedMemory(rule);
      showToast(`Saved desk rule for "${rule.subject}"`, 'success');
      window.dispatchEvent(new Event('desk-memory-changed'));
    } else {
      showToast(res.error, 'error');
    }
  };
  return (
    <div className="my-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-stone-100" data-testid="staged-memory-card">
      <p className="font-semibold text-amber-300 mb-1">Save this to desk memory?</p>
      <p><span className="font-mono text-amber-400">{rule.category}</span> · <strong>{rule.subject}</strong></p>
      <p className="text-stone-300 my-1">{rule.rule}</p>
      <p className="text-stone-400 mb-2">Not saved yet. Rules are stored in this browser and later read back as desk rules.</p>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => removeStagedMemory(rule)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-800/80 text-stone-300">
          <X size={12} /> Discard
        </button>
        <button type="button" onClick={confirm} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold">
          <Check size={12} /> Save rule
        </button>
      </div>
    </div>
  );
}
