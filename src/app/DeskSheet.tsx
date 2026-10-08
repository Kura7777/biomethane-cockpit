import React, { useEffect, useRef, useState } from 'react';
import { Search, Scale, Sun, Moon, ChevronRight, Download, FolderOpen, Share } from 'lucide-react';
import { Sheet } from '../shared/ui/Sheet';
import { useAppState, buildDeskBackupFile } from '../store/context';
import { useTheme } from '../store/theme';
import { showToast } from './DeskToastContainer';
import { getInstallState, promptInstall, subscribeInstall } from './installPrompt';
import './mobileShell.css';

export interface DeskSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenPalette: () => void;
  onOpenAuditor: () => void;
  /** Desktop-style fallback: writes the backup straight to disk (used when Web Share is unavailable). */
  onBackup: () => void;
  onRestoreFile: (file: File) => Promise<void>;
  isSaving: boolean;
  simulatedCount: number;
  dataSourceText: string;
}

/** Mobile stand-in for the desktop footer + header's Auditor/search/user block: one sheet
 *  reachable from the "Desk" tab, grouped into Tools / Your data / Install app / footer info. */
export function DeskSheet({
  open,
  onClose,
  onOpenPalette,
  onOpenAuditor,
  onBackup,
  onRestoreFile,
  isSaving,
  simulatedCount,
  dataSourceText,
}: DeskSheetProps) {
  const { state } = useAppState();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [installState, setInstallState] = useState(getInstallState());

  useEffect(() => subscribeInstall(() => setInstallState(getInstallState())), []);

  const handleBackupClick = async () => {
    const file = buildDeskBackupFile(state);
    const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({ files: [file], title: 'Biomethane Desk backup' });
        showToast(`✓ Desk backup shared · ${file.name}`);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          onBackup();
        }
      }
      return;
    }

    onBackup();
  };

  const handleRestoreChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onRestoreFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInstallClick = async () => {
    const accepted = await promptInstall();
    if (accepted) showToast('Biomethane Desk installed');
    setInstallState(getInstallState());
  };

  const showInstallSection = installState === 'available' || installState === 'ios';

  return (
    <Sheet open={open} onClose={onClose} title="Desk" testId="desk-sheet" ariaLabel="Desk">
      <div className="desk-sheet-group">
        <div className="desk-sheet-group-title">Tools</div>
        <button type="button" className="desk-sheet-row" onClick={() => { onClose(); onOpenPalette(); }}>
          <Search size={17} className="desk-sheet-row-icon" aria-hidden="true" />
          <span className="desk-sheet-row-label">Search commands</span>
          <ChevronRight size={16} className="desk-sheet-row-chevron" aria-hidden="true" />
        </button>
        <button type="button" className="desk-sheet-row" onClick={() => { onClose(); onOpenAuditor(); }}>
          <Scale size={17} className="desk-sheet-row-icon" aria-hidden="true" />
          <span className="desk-sheet-row-label">Compliance auditor</span>
          <ChevronRight size={16} className="desk-sheet-row-chevron" aria-hidden="true" />
        </button>
        <button type="button" className="desk-sheet-row" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={17} className="desk-sheet-row-icon" aria-hidden="true" /> : <Moon size={17} className="desk-sheet-row-icon" aria-hidden="true" />}
          <span className="desk-sheet-row-label">Theme</span>
          <span className="desk-sheet-row-value">{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
        {/* Connectors hidden from the nav until there are live data feeds; the route stays so it can come back. */}
      </div>

      <div className="desk-sheet-group">
        <div className="desk-sheet-group-title">Your data</div>
        <div className="desk-sheet-row desk-sheet-row--static">
          <span
            className="desk-sheet-save-dot"
            style={{ backgroundColor: isSaving ? '#f59e0b' : '#10b981', boxShadow: isSaving ? '0 0 6px #f59e0b' : '0 0 6px #10b981' }}
            aria-hidden="true"
          />
          <span className="desk-sheet-row-label">{isSaving ? 'Saving…' : 'Auto-saved'}</span>
        </div>
        <button type="button" className="desk-sheet-row" onClick={handleBackupClick}>
          <Share size={17} className="desk-sheet-row-icon" aria-hidden="true" />
          <span className="desk-sheet-row-label">Back up desk</span>
          <ChevronRight size={16} className="desk-sheet-row-chevron" aria-hidden="true" />
        </button>
        <button type="button" className="desk-sheet-row" onClick={() => fileInputRef.current?.click()}>
          <FolderOpen size={17} className="desk-sheet-row-icon" aria-hidden="true" />
          <span className="desk-sheet-row-label">Restore from backup</span>
          <ChevronRight size={16} className="desk-sheet-row-chevron" aria-hidden="true" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleRestoreChange}
        />
      </div>

      {showInstallSection && (
        <div className="desk-sheet-group">
          <div className="desk-sheet-group-title">Install app</div>
          {installState === 'available' ? (
            <button type="button" className="desk-sheet-row" onClick={handleInstallClick}>
              <Download size={17} className="desk-sheet-row-icon" aria-hidden="true" />
              <span className="desk-sheet-row-label">Install Biomethane Desk</span>
              <ChevronRight size={16} className="desk-sheet-row-chevron" aria-hidden="true" />
            </button>
          ) : (
            <div className="desk-sheet-row desk-sheet-row--static">
              <Download size={17} className="desk-sheet-row-icon" aria-hidden="true" />
              <span className="desk-sheet-row-label">Tap Share, then &quot;Add to Home Screen&quot;</span>
            </div>
          )}
        </div>
      )}

      <div className="desk-sheet-footer-info">
        <div>
          {dataSourceText}
          {simulatedCount > 0 && <span className="desk-sheet-footer-accent"> · {simulatedCount} simulated</span>}
        </div>
        <div className="desk-sheet-footer-user">Trader</div>
      </div>
    </Sheet>
  );
}
