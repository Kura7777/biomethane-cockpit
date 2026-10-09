import { AppState, createDefaultState } from './state';
import { migrateState } from './migrations';

export const STORAGE_KEY = 'biomethane-desk-state-v10';

// Newest first — the first key that yields a readable payload wins.
export const KNOWN_STORAGE_KEYS = [
  STORAGE_KEY,
  'biomethane-desk-state-v9',
  'biomethane-desk-state-v8',
  'biomethane-desk-state-v7',
  'biomethane-desk-state-v6',
  'biomethane-desk-state-v5',
  'biomethane-desk-state-v4',
  'biomethane-desk-state-v3',
  'biomethane-desk-state-v2',
  'biomethane-desk-state',
];

// Unreadable payloads are copied here before defaults are written over them. Desk marks are
// hand-keyed and exist nowhere else, so a failed migration must never be the end of the data.
export const QUARANTINE_KEY_PREFIX = 'biomethane-desk-state-unreadable:';

// Copies a payload we are about to overwrite somewhere recoverable. Best-effort: if even this
// write fails (quota, blocked storage) there is nothing further to be done but warn loudly.
export function quarantineUnreadableState(key: string, raw: string): void {
  try {
    localStorage.setItem(`${QUARANTINE_KEY_PREFIX}${key}`, raw);
    console.warn(
      `Saved state under "${key}" could not be read. The raw payload has been preserved at ` +
      `"${QUARANTINE_KEY_PREFIX}${key}" — recover marks from there rather than re-keying them.`
    );
  } catch (e) {
    console.error(`Saved state under "${key}" could not be read AND could not be backed up. It will be overwritten.`, e);
  }
}

export function getInitialState(): AppState {
  for (const key of KNOWN_STORAGE_KEYS) {
    let stored: string | null;
    try {
      stored = localStorage.getItem(key);
    } catch (e) {
      // Storage itself is unavailable (private mode, blocked cookies). Nothing is at risk.
      console.warn('localStorage is unavailable; starting from defaults', e);
      return createDefaultState();
    }

    if (!stored) continue;

    try {
      const migrated = migrateState(JSON.parse(stored));
      if (key !== STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
      return migrated;
    } catch (e) {
      // Defaults are auto-saved over STORAGE_KEY ~300ms from now, so preserve this payload
      // first, then fall through to older keys — an earlier version may still be readable.
      quarantineUnreadableState(key, stored);
      console.warn(`Failed to migrate state from "${key}"; trying older keys`, e);
    }
  }

  return createDefaultState();
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  const parsed = JSON.parse(json);
  return migrateState(parsed);
}

/**
 * Builds the same timestamped desk backup (.json) File that downloadDeskBackup() writes to
 * disk — shared so callers that hand the backup to navigator.share() (the mobile Desk sheet)
 * and callers that download it directly use one filename/payload convention.
 */
export function buildDeskBackupFile(state: AppState): File {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `Biomethane_Desk_Backup_${dateStr}_${timeStr}.json`;
  return new File([exportState(state)], fileName, { type: 'application/json' });
}

/**
 * Downloads a complete, timestamped desk backup (.json) directly to the user's hard drive / OneDrive.
 */
export function downloadDeskBackup(state: AppState): string {
  const file = buildDeskBackupFile(state);
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return file.name;
}

/**
 * Reads and parses an uploaded .json desk backup file.
 */
export function readBackupFile(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const imported = importState(text);
        resolve(imported);
      } catch {
        reject(new Error('Invalid backup file format. Must be a valid Biomethane Desk JSON backup.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read backup file from disk.'));
    reader.readAsText(file);
  });
}
