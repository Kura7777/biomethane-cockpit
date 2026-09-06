import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { CommandPalette } from '../shared/components/CommandPalette';
import { Header } from './Header';
import { DeskToastContainer } from './DeskToastContainer';
import { useAppState } from '../store/context';
import { SIMULATED_SOURCE_NAME } from '../domain/marks/simulate';

export function Layout() {
  const navigate = useNavigate();
  const { state } = useAppState();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

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
      if (k === 's') navigate('/scanner');
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

      {/* 28px Footer */}
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
        <span>
          GIE / EBA European Biomethane Map 2026 · 1,975 facilities · RED III consolidated to August 2026 · {simulatedCount > 0 ? simulatedCount : 2} of 16 marks simulated
        </span>
        <span>
          Keys 1–7 screens · ↑↓ rows · ⏎ playbook · Esc close · ⌘K command
        </span>
      </footer>

      {/* Global Command Palette Modal */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* Global Toast Container */}
      <DeskToastContainer />
    </div>
  );
}
