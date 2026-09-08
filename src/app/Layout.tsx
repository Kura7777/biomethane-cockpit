import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { CommandPalette } from '../shared/components/CommandPalette';
import { Header } from './Header';
import { DeskToastContainer, showToast } from './DeskToastContainer';
import { useAppState, downloadDeskBackup, readBackupFile } from '../store/context';
import { SIMULATED_SOURCE_NAME } from '../domain/marks/simulate';

export function Layout() {
  const navigate = useNavigate();
  const { state, dispatch, isSaving } = useAppState();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    try {
      const filename = downloadDeskBackup(state);
      showToast(`✓ Desk backup saved to drive · ${filename}`);
    } catch (err) {
      showToast('Failed to create desk backup');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await readBackupFile(file);
      dispatch({ type: 'IMPORT_STATE', state: imported });
      showToast('✓ Desk state successfully restored from backup!');
    } catch (err: any) {
      showToast(`Restore failed: ${err?.message || 'Invalid backup file'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Count simulated marks
  const simulatedCount = useMemo(() => {
    const marksList = Object.values(state.marks.marks || {});
    return marksList.filter(
      m => m?.provenance?.sourceName === SIMULATED_SOURCE_NAME || m?.source === SIMULATED_SOURCE_NAME || m?.provenance?.sourceType === 'ESTIMATE'
    ).length;
  }, [state.marks.marks]);

  // Global Keyboard Shortcuts (1-7, S, R, C, Cmd+K, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && k === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsPaletteOpen(false);
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1') navigate('/sourcing');
      if (e.key === '2') navigate('/plants');
      if (e.key === '3') navigate('/map');
      if (e.key === '4') navigate('/trade');
      if (e.key === '5') navigate('/pricing');
      if (e.key === '7') navigate('/data-sources');
      if (k === 'r') navigate('/risk');
      if (k === 'c') navigate('/citations');
      if (k === 's') navigate('/sourcing');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden',
        minWidth: '1180px',
      }}
    >
      {/* 52px Header */}
      <Header onOpenSearch={() => setIsPaletteOpen(true)} />

      {/* Main Viewport */}
      <main
        id="main-content"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="noscroll"
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* 28px Status Bar & Tools Footer */}
      <footer
        style={{
          height: '28px',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          borderTop: '2px solid var(--color-divider)',
          fontSize: '11px',
          backgroundColor: 'var(--color-bg)',
        }}
        className="mut"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            GIE / EBA European Biomethane Map 2026 · 1,975 facilities · RED III consolidated to August 2026
          </span>
          {simulatedCount > 0 && (
            <span style={{ color: 'var(--color-accent)' }}>
              · {simulatedCount} simulated
            </span>
          )}
        </div>

        {/* Bottom Right: Auto-Save, Hard Drive Backup, Connectors & Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Live Auto-Save Indicator & 1-Click Backup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isSaving ? '#f59e0b' : '#10b981',
                boxShadow: isSaving ? '0 0 6px #f59e0b' : '0 0 6px #10b981',
                transition: 'all 200ms ease',
              }}
            />
            <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
              {isSaving ? 'Saving...' : 'Auto-saved'}
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <button
              type="button"
              onClick={handleBackup}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--color-text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                fontWeight: 600,
              }}
              title="Download full desk state backup (.json) to your hard drive / OneDrive"
            >
              <span>💾 Backup</span>
            </button>
            <span style={{ opacity: 0.4 }}>·</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--color-muted)',
                fontSize: '11px',
              }}
              title="Restore desk state from a .json backup file"
            >
              Restore
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <span style={{ opacity: 0.3 }}>│</span>

          {/* Connectors Quick Link */}
          <NavLink
            to="/connectors"
            style={{
              color: 'var(--color-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
            title="TSO & API Data Connectors"
          >
            <span>🔌 Connectors</span>
          </NavLink>

          <span style={{ opacity: 0.3 }}>│</span>

          <span>Keys 1–7 screens · ⌘K command</span>
        </div>
      </footer>

      {/* Global Command Palette Modal */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* Global Toast Container */}
      <DeskToastContainer />
    </div>
  );
}
