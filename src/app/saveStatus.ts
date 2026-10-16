/** Footer / Desk sheet save indicator: reflects the real result of the last autosave. */
export interface SaveIndicator {
  label: string;
  color: string;
  glow: string;
}

export function getSaveIndicator(isSaving: boolean, saveFailed: boolean): SaveIndicator {
  if (saveFailed && !isSaving) {
    return { label: 'NOT SAVED - back up now', color: '#ef4444', glow: '0 0 6px #ef4444' };
  }
  if (isSaving) return { label: 'Saving...', color: '#f59e0b', glow: '0 0 6px #f59e0b' };
  return { label: 'Auto-saved', color: '#10b981', glow: '0 0 6px #10b981' };
}
