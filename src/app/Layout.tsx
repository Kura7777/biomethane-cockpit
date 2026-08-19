import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { CommandPalette } from '../shared/components/CommandPalette';
import { MarketPricesModal } from '../features/marks/MarketPricesModal';
import { SIDEBAR_ITEMS } from './navConfig';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isPricesOpen, setIsPricesOpen] = useState(false);

  // Global Keyboard Shortcuts (1-7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
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
      if (e.key === '6') navigate('/library');
      if (e.key === '7') navigate('/data-sources');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="h-screen flex overflow-hidden min-w-[1200px] bg-stone-950 text-stone-100 font-sans selection:bg-teal-500 selection:text-stone-950">
      
      {/* Left-Docked Minimal Sidebar — 68px (expands to 220px on hover) */}
      <aside className="w-[68px] hover:w-56 transition-all duration-200 ease-in-out flex-none bg-stone-900 border-r border-stone-800 flex flex-col justify-between py-3 z-40 group shadow-xl">
        
        {/* Top: Brand + 3 Main Nav Items */}
        <div className="space-y-4 px-2">
          {/* Brand Icon */}
          <button
            type="button"
            onClick={() => navigate('/sourcing')}
            aria-label="Biomethane Desk — Home"
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-stone-850 transition-colors w-full cursor-pointer"
          >
            <div className="w-[32px] h-[32px] rounded-lg bg-teal-600 flex items-center justify-center font-mono text-sm font-bold text-teal-950 shrink-0 shadow-md">
              B
            </div>
            <div className="flex flex-col text-left leading-[1.15] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <span className="font-mono text-xs font-bold tracking-[0.12em] text-stone-100 uppercase">
                Biomethane
              </span>
              <span className="font-mono text-[9px] tracking-[0.08em] text-stone-400">
                Desk Cockpit
              </span>
            </div>
          </button>

          {/* 3 Main Area Navigation Items */}
          <nav className="space-y-1.5" aria-label="Main Workspaces">
            {SIDEBAR_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to) || (item.to === '/sourcing' && location.pathname === '/');

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 p-2.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-stone-950 shadow-md'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
                  }`}
                  title={`${item.label} (Press ${item.keyHint})`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {item.label}
                  </span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 font-mono text-[9px] bg-stone-950/40 px-1.5 py-0.5 rounded text-stone-300">
                    {item.keyHint}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Note */}
        <div className="px-2 font-mono text-micro text-content-secondary text-center opacity-0 group-hover:opacity-100 transition-opacity">
          Hotkeys 1–7
        </div>
      </aside>

      {/* Main Viewport Content Area */}
      <main id="main-content" className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col bg-stone-950">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Global Command Palette Modal */}
      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)} 
      />

      {/* Global Market Prices Modal */}
      <MarketPricesModal
        isOpen={isPricesOpen}
        onClose={() => setIsPricesOpen(false)}
      />

    </div>
  );
}
