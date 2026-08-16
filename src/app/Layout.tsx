import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppState } from '../store/context';
import { getMarkStaleness, PriceSide } from '../domain/markets/types';
import { 
  Globe, 
  Calculator, 
  TrendingUp, 
  Coins, 
  FolderArchive, 
  AlertTriangle, 
  Clock, 
  Sliders,
  Terminal,
  Layers
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Map', keyHint: '1', icon: Globe, end: true },
  { to: '/trade', label: 'Trade Builder', keyHint: '2', icon: Calculator },
  { to: '/scanner', label: 'Arbitrage Scanner', keyHint: '3', icon: TrendingUp },
  { to: '/marks', label: 'Marks', keyHint: '4', icon: Coins },
  { to: '/library', label: 'Dossiers', keyHint: '5', icon: FolderArchive },
];

export function Layout() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  // Compute real staleness across active marks
  const markEntries = Object.values(state.marks.marks);
  const staleWarningCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'STALE_WARNING').length;
  const staleCriticalCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'STALE_CRITICAL').length;
  const unfilledCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'UNFILLED').length;

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1') navigate('/');
      if (e.key === '2') navigate('/trade');
      if (e.key === '3') navigate('/scanner');
      if (e.key === '4') navigate('/marks');
      if (e.key === '5') navigate('/library');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const currentSide: PriceSide = state.marks.pricingSide ?? 'bid';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-teal-500 selection:text-stone-950">
      
      {/* Top Trader Terminal Navigation Header */}
      <header className="bg-stone-900/95 border-b border-stone-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded bg-teal-600/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-mono font-bold text-xs">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                Biomethane Desk
              </span>
              <span className="text-[10px] text-teal-400 font-mono bg-teal-950/80 border border-teal-800 px-1.5 py-0.2 rounded">
                RED III v1.2
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all font-mono whitespace-nowrap
                    ${isActive 
                      ? 'bg-teal-600/20 text-teal-300 border border-teal-500/40 shadow-xs' 
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent'}`
                  }
                >
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                  <span>{item.label}</span>
                  <span className="text-[9px] text-stone-500 font-mono border border-stone-800 bg-stone-950/60 px-1 rounded">
                    {item.keyHint}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Header: Pricing Side Toggle & Real Staleness Counts */}
          <div className="flex items-center gap-3 shrink-0">
            
            {/* Global Bid / Mid / Offer Selector */}
            <div className="hidden sm:flex items-center bg-stone-950 border border-stone-800 rounded p-0.5 text-[11px] font-mono">
              <span className="text-stone-500 px-1.5 text-[10px] uppercase font-bold">Side:</span>
              <button
                onClick={() => dispatch({ type: 'SET_PRICING_SIDE', side: 'bid' })}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  currentSide === 'bid'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Use BID marks (Conservative / Selling certificates)"
              >
                BID
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_PRICING_SIDE', side: 'mid' })}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  currentSide === 'mid'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Use MID marks"
              >
                MID
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_PRICING_SIDE', side: 'offer' })}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  currentSide === 'offer'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Use OFFER marks (Buying certificates)"
              >
                OFFER
              </button>
            </div>

            {/* True Staleness Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              {staleCriticalCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950/70 border border-red-800/80 text-red-400 rounded text-[10px] font-semibold" title="Marks older than 30 days">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  {staleCriticalCount} &gt;30d
                </span>
              )}
              {staleWarningCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950/70 border border-amber-800/80 text-amber-400 rounded text-[10px] font-semibold" title="Marks older than 7 days">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  {staleWarningCount} &gt;7d
                </span>
              )}
              {staleCriticalCount === 0 && staleWarningCount === 0 && unfilledCount === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 rounded text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Marks Fresh
                </span>
              )}
              {unfilledCount > 0 && staleCriticalCount === 0 && staleWarningCount === 0 && (
                <span className="text-stone-500 text-[10px]" title="Unfilled marks">
                  {unfilledCount} unfilled
                </span>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        <Outlet />
      </main>

      {/* Footer Info Strip */}
      <footer className="border-t border-stone-800 bg-stone-900/60 py-2.5 px-6 text-[11px] text-stone-500 font-mono flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          RED III Transport Baseline: <strong className="text-stone-300">94.0 gCO₂e/MJ</strong> • FuelEU Maritime: <strong className="text-stone-300">Reg. 2023/1805</strong> • German THG: <strong className="text-stone-300">§37a BImSchG</strong>
        </div>
        <div className="flex items-center gap-3">
          <span>Shortcuts: <kbd className="bg-stone-800 text-stone-300 px-1 rounded">1-5</kbd> Tabs</span>
          <span>Local Storage: <strong className="text-teal-400">Persisted</strong></span>
        </div>
      </footer>

    </div>
  );
}
