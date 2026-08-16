import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppState } from '../store/context';
import { getMarkStaleness, PriceSide } from '../domain/markets/types';
import { 
  Globe, 
  Calculator, 
  TrendingUp, 
  Bot,
  Factory,
  Coins, 
  FolderArchive, 
  Terminal
} from 'lucide-react';
import { FloatingAgentDrawer } from '../shared/components/FloatingAgentDrawer';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';

const PRICING_SIDES: { side: PriceSide; label: string; hint: string }[] = [
  { side: 'bid', label: 'BID', hint: 'Use BID marks (selling certificates)' },
  { side: 'mid', label: 'MID', hint: 'Use MID marks' },
  { side: 'offer', label: 'OFFER', hint: 'Use OFFER marks (buying certificates)' },
];

const NAV_ITEMS = [
  { to: '/', label: 'Map', keyHint: '1', icon: Globe, end: true },
  { to: '/trade', label: 'Trade Builder', keyHint: '2', icon: Calculator },
  { to: '/scanner', label: 'Arb Scanner', keyHint: '3', icon: TrendingUp },
  { to: '/agents', label: 'AI Copilot', keyHint: '4', icon: Bot },
  { to: '/plants', label: 'Plants (1,975)', keyHint: '5', icon: Factory },
  { to: '/marks', label: 'Marks', keyHint: '6', icon: Coins },
  { to: '/library', label: 'Dossiers', keyHint: '7', icon: FolderArchive },
];

export function Layout() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  // Compute real staleness across active marks
  const markEntries = Object.values(state.marks.marks);
  const staleWarningCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'STALE_WARNING').length;
  const staleCriticalCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'STALE_CRITICAL').length;
  const unfilledCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'UNFILLED').length;

  // Keyboard navigation shortcuts (1-7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1') navigate('/');
      if (e.key === '2') navigate('/trade');
      if (e.key === '3') navigate('/scanner');
      if (e.key === '4') navigate('/agents');
      if (e.key === '5') navigate('/plants');
      if (e.key === '6') navigate('/marks');
      if (e.key === '7') navigate('/library');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const currentSide: PriceSide = state.marks.pricingSide ?? 'bid';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-teal-500 selection:text-stone-950">

      {/* Skip link — first tab stop, lets keyboard users bypass the 7-item nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded focus:bg-teal-600 focus:text-white focus:text-xs focus:font-mono focus:font-bold"
      >
        Skip to main content
      </a>

      {/* Top Trader Terminal Navigation Header */}
      <header className="bg-stone-900/95 border-b border-stone-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="w-full px-3 sm:px-6 h-13 flex items-center justify-between gap-2 md:gap-3">
          
          {/* Logo / Brand — a real button so it is keyboard reachable and
              announced as a control, not an unlabelled clickable div. */}
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Biomethane Desk — go to Map"
            className="flex items-center gap-2 shrink-0 cursor-pointer group rounded focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
          >
            <div className="w-7 h-7 rounded bg-teal-600/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-mono font-bold text-xs group-hover:bg-teal-600/30 transition-colors">
              <Terminal className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight uppercase font-mono group-hover:text-teal-300 transition-colors">
                Biomethane Desk
              </span>
              {/* Sub-0.5 padding compiles to no CSS; use the 4px scale */}
              <span className="hidden sm:inline-block text-micro text-teal-400 font-mono bg-teal-950/80 border border-teal-800 px-1.5 py-0.5 rounded">
                RED III
              </span>
            </div>
          </button>

          {/* Nav Tabs - Sleek, Non-Overflowing Fit */}
          <nav className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-center max-w-4xl" aria-label="Primary">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={`${item.label} — press ${item.keyHint}`}
                  className={({ isActive }) =>
                    // transition-colors, never transition-all: the latter animates
                    // layout properties and reflows the header (MASTER §5.2).
                    // rounded (4px) matches the control tier of the radius scale.
                    `flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-xs font-semibold rounded transition-colors duration-150 font-mono whitespace-nowrap
                    focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900
                    ${isActive
                      ? 'bg-teal-600/20 text-teal-300 border border-teal-500/40 '
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent'}`
                  }
                >
                  <Icon className="w-3.5 h-3.5 opacity-85 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                  {/* stone-500 fails AA on this surface; stone-400 measures 7.8:1 */}
                  <span className="hidden 2xl:inline-block text-micro text-stone-400 font-mono border border-stone-800 bg-stone-950/60 px-1 rounded" aria-hidden="true">
                    {item.keyHint}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Header: Pricing Side Toggle & Real Staleness Counts */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Global Bid / Mid / Offer Selector.
                Was three hand-copied buttons; now driven off PRICING_SIDES so the
                states cannot drift apart. aria-pressed exposes the selection to
                assistive tech, which the previous colour-only treatment did not. */}
            <div
              className="flex items-center bg-stone-950 border border-stone-800 rounded p-0.5 text-micro sm:text-meta font-mono"
              role="group"
              aria-label="Pricing side"
            >
              <span className="hidden lg:inline text-stone-400 px-1 text-micro uppercase font-bold">Side:</span>
              {PRICING_SIDES.map(({ side, label, hint }) => (
                <button
                  key={side}
                  onClick={() => dispatch({ type: 'SET_PRICING_SIDE', side })}
                  aria-pressed={currentSide === side}
                  aria-label={hint}
                  title={hint}
                  className={`px-1.5 sm:px-2 py-0.5 rounded font-bold cursor-pointer transition-colors duration-150
                    focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 focus-visible:ring-offset-stone-950 ${
                    currentSide === side
                      ? 'bg-teal-600 text-white '
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* True Staleness Indicator. aria-live announces a mark going stale
                without stealing focus — this is safety-critical on a trading desk. */}
            <div
              className="hidden sm:flex items-center gap-1.5 text-meta font-mono"
              aria-live="polite"
              aria-label="Mark freshness"
            >
              {staleCriticalCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950/70 border border-red-800/80 text-red-400 rounded text-micro font-semibold" title="Marks older than 30 days">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true"></span>
                  {staleCriticalCount} &gt;30d
                </span>
              )}
              {staleWarningCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950/70 border border-amber-800/80 text-amber-400 rounded text-micro font-semibold" title="Marks older than 7 days">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
                  {staleWarningCount} &gt;7d
                </span>
              )}
              {staleCriticalCount === 0 && staleWarningCount === 0 && unfilledCount === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 rounded text-micro font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
                  Marks Fresh
                </span>
              )}
              {unfilledCount > 0 && staleCriticalCount === 0 && staleWarningCount === 0 && (
                <span className="text-stone-400 text-micro" title="Unfilled marks">
                  {unfilledCount} unfilled
                </span>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Main Container - Full Viewport Width */}
      {/* pb-16 reserves room for the fixed Ask-Copilot launcher so it never
          covers the last table row (MASTER §8, fixed-element-offset). */}
      <main id="main-content" className="flex-1 w-full px-4 py-4 pb-16">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Omnipresent Floating AI Copilot for Every Page */}
      <FloatingAgentDrawer />

      {/* Footer Info Strip. stone-500 measured 4.06:1 here and failed AA;
          stone-400 is 7.8:1 (MASTER §1.2). */}
      <footer className="border-t border-stone-800 bg-stone-900/60 py-2.5 px-6 text-meta text-stone-400 font-mono flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          RED III Transport Baseline: <strong className="text-stone-200">94.0 gCO₂e/MJ</strong> • FuelEU Maritime: <strong className="text-stone-200">Reg. 2023/1805</strong> • European Plants: <strong className="text-stone-200">1,986 Active</strong>
        </div>
        <div className="flex items-center gap-3">
          <span>Shortcuts: <kbd className="bg-stone-800 text-stone-200 px-1 rounded">1-7</kbd> Tabs</span>
          <span>Matrix Engine: <strong className="text-teal-400">27 Origins Active</strong></span>
        </div>
      </footer>

    </div>
  );
}
