import React, { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { CommandPalette } from '../shared/components/CommandPalette';
import { Header } from './Header';
import { MobileTabBar } from './MobileTabBar';
import { DeskToastContainer, showToast } from './DeskToastContainer';
import { useAppState, downloadDeskBackup, readBackupFile } from '../store/context';
import { SIMULATED_SOURCE_NAME } from '../domain/marks/simulate';
import { ComplianceAuditModal } from '../features/auditor/ComplianceAuditModal';
import { AuditorModalTab, normalizeAuditorTab, normalizeTradeAuditContext, TradeAuditContext } from '../domain/auditor/types';
import { useIsMobile } from '../shared/hooks/useMediaQuery';
// Side-effect import: registers the beforeinstallprompt/appinstalled listeners at startup so
// they're captured even before the mobile Desk sheet (the only current caller) ever mounts.
import './installPrompt';

const DATA_SOURCE_TEXT = 'GIE / EBA European Biomethane Map 2026 · 1,975 facilities · RED III consolidated to August 2026';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch, isSaving } = useAppState();
  const isMobile = useIsMobile();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isAuditorOpen, setIsAuditorOpen] = useState(false);
  const [activeAuditDeal, setActiveAuditDeal] = useState<TradeAuditContext | undefined>(undefined);
  const [auditorInitialTab, setAuditorInitialTab] = useState<AuditorModalTab>('GATE_BREAKDOWN');
  const [auditorFocusedGate, setAuditorFocusedGate] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = useCallback(() => {
    try {
      const filename = downloadDeskBackup(state);
      showToast(`✓ Desk backup saved to drive · ${filename}`);
    } catch (err) {
      showToast('Failed to create desk backup');
    }
  }, [state]);

  // Shared by the footer's hidden file input (desktop) and DeskSheet's "Restore from backup"
  // row (mobile) — the read/migrate/dispatch/toast flow lives here once, not in both places.
  const handleRestoreFile = useCallback(async (file: File) => {
    try {
      const imported = await readBackupFile(file);
      dispatch({ type: 'IMPORT_STATE', state: imported });
      showToast('✓ Desk state successfully restored from backup!');
    } catch (err: any) {
      showToast(`Restore failed: ${err?.message || 'Invalid backup file'}`);
    }
  }, [dispatch]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleRestoreFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenAuditor = useCallback(() => {
    const globalDeal = (window as any).__ACTIVE_TRADE_BUILDER_DEAL__;
    if (globalDeal) {
      setActiveAuditDeal(normalizeTradeAuditContext(globalDeal));
    }
    setAuditorInitialTab('GATE_BREAKDOWN');
    setAuditorFocusedGate(undefined);
    setIsAuditorOpen(true);
  }, []);

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

      if ((e.altKey && k === 'a') || ((e.ctrlKey || e.metaKey) && k === 'j')) {
        e.preventDefault();
        const globalDeal = (window as any).__ACTIVE_TRADE_BUILDER_DEAL__;
        if (globalDeal) {
          setActiveAuditDeal(normalizeTradeAuditContext(globalDeal));
        }
        setAuditorInitialTab('GATE_BREAKDOWN');
        setAuditorFocusedGate(undefined);
        setIsAuditorOpen(prev => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsPaletteOpen(false);
        setIsAuditorOpen(false);
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Never hijack keystrokes inside FuelEU Maritime multi-step desk flows
      if (location.pathname.startsWith('/fueleu')) {
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
  }, [navigate, location.pathname]);

  // Global event listener to open auditor from any screen
  useEffect(() => {
    const handleOpenAuditor = (e: any) => {
      if (e?.detail) {
        const { initialTab, focusedGateIndex, ...dealContext } = e.detail;
        if (Object.keys(dealContext).length > 0) {
          const globalDeal = (typeof window !== 'undefined' && (window as any).__ACTIVE_TRADE_BUILDER_DEAL__) || {};
          const normalized = normalizeTradeAuditContext({ ...globalDeal, ...dealContext });
          setActiveAuditDeal(normalized);
        }
        setAuditorInitialTab(normalizeAuditorTab(initialTab));
        setAuditorFocusedGate(focusedGateIndex !== undefined ? focusedGateIndex : undefined);
      } else {
        setAuditorInitialTab('GATE_BREAKDOWN');
        setAuditorFocusedGate(undefined);
      }
      setIsAuditorOpen(true);
    };
    window.addEventListener('open-compliance-auditor', handleOpenAuditor);
    return () => window.removeEventListener('open-compliance-auditor', handleOpenAuditor);
  }, []);

  return (
    <div className="app-shell">
      {/* Two-row header (88px) */}
      <Header
        onOpenSearch={() => setIsPaletteOpen(true)}
        onOpenAuditor={handleOpenAuditor}
      />

      {/* Main Viewport */}
      <main
        id="main-content"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          overscrollBehavior: 'contain',
        }}
        className="noscroll"
      >
        <ErrorBoundary>
          {/* Screens are lazy chunks. Suspending here keeps the header and tab bar on screen while
              one loads; the Suspense in App.tsx only covers the shell's own first load. */}
          <Suspense fallback={<ScreenLoading />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* 28px Status Bar & Tools Footer (desktop only — the mobile shell uses the Desk sheet instead) */}
      {!isMobile && (
      <footer
        className="app-footer mut"
        style={{
          height: '28px',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          borderTop: '1px solid var(--color-divider)',
          fontSize: '12px',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            {DATA_SOURCE_TEXT}
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
      )}

      {/* Mobile bottom tab bar — last flex child, sits under #main-content in normal flow
          (not position:fixed). Replaces the desktop footer + header's search/Auditor/user block. */}
      {isMobile && (
        <MobileTabBar
          onOpenPalette={() => setIsPaletteOpen(true)}
          onOpenAuditor={handleOpenAuditor}
          onBackup={handleBackup}
          onRestoreFile={handleRestoreFile}
          isSaving={isSaving}
          simulatedCount={simulatedCount}
          dataSourceText={DATA_SOURCE_TEXT}
        />
      )}

      {/* Global Command Palette Modal */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* Global Statutory Compliance Auditor Modal */}
      <ComplianceAuditModal 
        isOpen={isAuditorOpen} 
        onClose={() => {
          setIsAuditorOpen(false);
          setAuditorFocusedGate(undefined);
        }} 
        dealContextOverride={activeAuditDeal}
        initialTab={auditorInitialTab}
        focusedGateIndex={auditorFocusedGate}
      />

      {/* Global Toast Container */}
      <DeskToastContainer />
    </div>
  );
}

function ScreenLoading() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }} aria-busy="true" data-testid="screen-loading">
      <div className="skel" style={{ width: '120px', height: '14px' }} />
    </div>
  );
}
