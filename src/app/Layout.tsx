import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../store/context';
import { getMarkStaleness, PriceSide } from '../domain/markets/types';
import { MARKETS } from '../domain/markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../domain/consignment/feedstocks';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { FloatingAgentDrawer } from '../shared/components/FloatingAgentDrawer';
import { CommandPalette } from '../shared/components/CommandPalette';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  Scale, 
  ChevronDown, 
  Layers, 
  Globe, 
  Building2, 
  BookOpen, 
  FileText, 
  Settings, 
  SlidersHorizontal 
} from 'lucide-react';

const PRICING_SIDES: { side: PriceSide; label: string; hint: string }[] = [
  { side: 'bid', label: 'BID', hint: 'Use BID marks (selling certificates)' },
  { side: 'mid', label: 'MID', hint: 'Use MID marks' },
  { side: 'offer', label: 'OFFER', hint: 'Use OFFER marks (buying certificates)' },
];

const CORE_WORKSPACES = [
  { to: '/briefing', label: 'Morning Briefing', keyHint: '1', icon: Sparkles },
  { to: '/trade', label: 'Trade Desk Cockpit', keyHint: '2', icon: Scale },
  { to: '/plants', label: 'Plants & Registries', keyHint: '3', icon: Building2 },
];

const SECONDARY_TOOLS = [
  { to: '/marks', label: 'Marks, Broker Run & Curves', keyHint: '4', icon: TrendingUp },
  { to: '/map', label: 'Pan-European Grid Map', keyHint: '5', icon: Globe },
  { to: '/scanner', label: 'Arbitrage Matrix Ladder', keyHint: '6', icon: SlidersHorizontal },
  { to: '/library', label: 'Deal Dossier Library', keyHint: '7', icon: FileText },
  { to: '/citations', label: 'Statutory Citations (RED III)', keyHint: '8', icon: BookOpen },
  { to: '/settings', label: 'Desk Settings & Risk Simulator', keyHint: '9', icon: Settings },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useAppState();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Active consignment for CI ticker
  const activeConsignment = useMemo(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    return existing || REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  }, [state.consignments, state.activeConsignmentId]);

  // Compute real staleness across active marks
  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);
  const markEntries = useMemo(() => {
    return activeMarkets.map(m => state.marks.marks[m.id] || { marketId: m.id, updatedAt: null });
  }, [activeMarkets, state.marks.marks]);

  const staleWarningCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'STALE_WARNING').length;
  const staleCriticalCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'STALE_CRITICAL').length;
  const freshCount = markEntries.filter(m => getMarkStaleness(m.updatedAt) === 'FRESH').length;

  // Keyboard navigation shortcuts (1-3 primary, 4-9 secondary, Ctrl+K palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global palette shortcut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1') navigate('/briefing');
      if (e.key === '2') navigate('/trade');
      if (e.key === '3') navigate('/plants');
      if (e.key === '4') navigate('/marks');
      if (e.key === '5') navigate('/map');
      if (e.key === '6') navigate('/scanner');
      if (e.key === '7') navigate('/library');
      if (e.key === '8') navigate('/citations');
      if (e.key === '9') navigate('/settings');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const currentSide: PriceSide = state.marks.pricingSides.certificateSide;
  const isSecondaryActive = SECONDARY_TOOLS.some(tool => location.pathname.startsWith(tool.to));

  // Ticker items
  const gasIndexPrice = state.marks.gasIndex[currentSide] ?? state.marks.gasIndex.mid;
  const deThgPrice = state.marks.marks['DE_THG']?.[currentSide] ?? state.marks.marks['DE_THG']?.mid;
  const nlErePrice = state.marks.marks['NL_ERE']?.[currentSide] ?? state.marks.marks['NL_ERE']?.mid;
  const frCpbPrice = state.marks.marks['FR_CPB']?.[currentSide] ?? state.marks.marks['FR_CPB']?.mid;
  const itCicPrice = state.marks.marks['IT_CIC']?.[currentSide] ?? state.marks.marks['IT_CIC']?.mid;
  const gbpFx = state.marks.fx.gbpEur;

  const tickerItems = [
    { key: 'TTF M+1', val: gasIndexPrice != null ? `€${gasIndexPrice.toFixed(2)}` : '—', delta: '+0.42', deltaType: 'pos' },
    { key: 'DE THG', val: deThgPrice != null ? `€${deThgPrice.toFixed(2)}` : '—', delta: '−4.00', deltaType: 'neg' },
    { key: 'NL ERE', val: nlErePrice != null ? `€${nlErePrice.toFixed(3)}` : '—', delta: '+0.004', deltaType: 'pos' },
    { key: 'FR CPB', val: frCpbPrice != null ? `€${frCpbPrice.toFixed(2)}` : '—', delta: '0.00', deltaType: 'flat' },
    { key: 'IT CIC', val: itCicPrice != null ? `€${itCicPrice.toFixed(2)}` : '—', delta: '−6.00', deltaType: 'neg' },
    { key: 'GBP/EUR', val: gbpFx != null ? gbpFx.toFixed(3) : '—', delta: '+0.003', deltaType: 'pos' },
    { key: 'CI ACTIVE', val: `${activeConsignment.carbonIntensity > 0 ? '+' : ''}${activeConsignment.carbonIntensity}`, delta: 'gCO₂e/MJ', deltaType: 'flat' },
    { key: 'MARKS FRESH', val: `${freshCount} / ${activeMarkets.length}`, delta: 'ACTIVE', deltaType: 'flat' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden min-w-[1400px] bg-stone-950 text-stone-100 font-sans selection:bg-teal-500 selection:text-stone-950">
      
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded focus:bg-teal-600 focus:text-white focus:text-xs focus:font-mono focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Top Header — 52px */}
      <header className="h-[52px] flex-none flex items-center gap-5 px-4 bg-stone-900 border-b border-stone-800 sticky top-0 z-50">
        
        {/* Brand Block */}
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Biomethane Desk — go to Map"
          className="flex items-center gap-2 shrink-0 cursor-pointer group text-left focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
        >
          <div className="w-[22px] h-[22px] bg-teal-600 flex items-center justify-center font-mono text-xs font-bold text-teal-950 shrink-0">
            B
          </div>
          <div className="flex flex-col leading-[1.15] whitespace-nowrap">
            <span className="font-mono text-xs font-semibold tracking-[0.14em] text-stone-100 uppercase group-hover:text-teal-300 transition-colors duration-150">
              Biomethane Desk
            </span>
            <span className="font-mono text-micro tracking-[0.1em] text-stone-400">
              RED III · EU-27 + UK + CH
            </span>
          </div>
        </button>

        {/* Primary 3 Workspaces */}
        <nav className="flex items-stretch gap-1 h-[52px] ml-1" aria-label="Primary Workspaces">
          {CORE_WORKSPACES.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 h-[52px] font-mono text-meta font-bold tracking-[0.08em] uppercase whitespace-nowrap transition-colors duration-150
                  focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900
                  ${isActive
                    ? 'text-teal-300 border-b-2 border-teal-500 bg-teal-950/20'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-850/50 border-b-2 border-transparent'}`
                }
              >
                <Icon className="w-3.5 h-3.5 opacity-80" />
                <span>{item.label}</span>
                <span className="font-mono text-[9px] text-stone-500 border border-stone-800 px-1 py-0.2 rounded-xs leading-none" aria-hidden="true">
                  {item.keyHint}
                </span>
              </NavLink>
            );
          })}

          {/* Secondary Tools & Reference Dropdown */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setIsToolsOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 h-[52px] font-mono text-meta font-semibold tracking-[0.08em] uppercase whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                isSecondaryActive || isToolsOpen
                  ? 'text-stone-100 border-b-2 border-stone-500 bg-stone-800/40'
                  : 'text-stone-400 hover:text-stone-200 border-b-2 border-transparent'
              }`}
              aria-expanded={isToolsOpen}
              aria-haspopup="true"
            >
              <Layers className="w-3.5 h-3.5 text-stone-400" />
              <span>Tools &amp; Data</span>
              <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsToolsOpen(false)} 
                />
                <div className="absolute top-[52px] left-0 w-64 bg-stone-900 border border-stone-700 shadow-2xl rounded-b-xs divide-y divide-stone-800 z-50 animate-in fade-in duration-100">
                  <div className="p-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-500 bg-stone-950 font-semibold">
                    Reference &amp; Analytics
                  </div>
                  <div className="py-1">
                    {SECONDARY_TOOLS.map(tool => {
                      const ToolIcon = tool.icon;
                      return (
                        <NavLink
                          key={tool.to}
                          to={tool.to}
                          onClick={() => setIsToolsOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between p-2 px-3 font-mono text-xs transition-colors ${
                              isActive ? 'bg-teal-950 text-teal-300 font-bold' : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                            }`
                          }
                        >
                          <div className="flex items-center gap-2.5">
                            <ToolIcon className="w-3.5 h-3.5 text-stone-400" />
                            <span>{tool.label}</span>
                          </div>
                          <kbd className="font-mono text-[9px] text-stone-500 border border-stone-700 px-1 rounded-xs">
                            {tool.keyHint}
                          </kbd>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Global Search & Command Palette Button */}
        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 rounded-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          title="Open Global Search & Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-teal-400" />
          <span className="font-mono text-micro tracking-[0.06em]">Quick Search / Jump...</span>
          <kbd className="font-mono text-[9px] text-stone-400 bg-stone-900 border border-stone-700 px-1 py-0.2 rounded-xs">
            Ctrl+K
          </kbd>
        </button>

        <div className="flex-1" />

        {/* Right Cluster: Pricing Side Selector & Staleness Counts */}
        <div className="flex items-center gap-3.5 shrink-0">
          
          {/* Pricing Side Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-micro text-stone-400 tracking-[0.12em] uppercase font-semibold">
              Side
            </span>
            <div className="flex border border-stone-800" role="group" aria-label="Pricing side">
              {PRICING_SIDES.map(({ side, label, hint }) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PRICING_SIDE', side })}
                  aria-pressed={currentSide === side}
                  aria-label={hint}
                  title={hint}
                  className={`font-mono text-micro font-bold tracking-[0.08em] px-2.5 py-[3px] cursor-pointer transition-colors duration-150
                    focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 focus-visible:ring-offset-stone-950 ${
                    currentSide === side
                      ? 'bg-teal-600 text-teal-950'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Staleness Counts */}
          <div
            className="flex items-center gap-2 pl-3.5 border-l border-stone-800 font-mono text-micro font-semibold"
            aria-live="polite"
            aria-label="Mark freshness counts"
          >
            <span className="inline-flex items-center gap-1.5 text-red-400 tracking-[0.06em]" title="Marks older than 30 days">
              <span className="w-[5px] h-[5px] rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              {staleCriticalCount} &gt;30d
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-400 tracking-[0.06em]" title="Marks older than 7 days">
              <span className="w-[5px] h-[5px] rounded-full bg-amber-500" aria-hidden="true" />
              {staleWarningCount} &gt;7d
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 tracking-[0.06em]" title="Fresh marks">
              <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" aria-hidden="true" />
              {freshCount} fresh
            </span>
          </div>

        </div>
      </header>

      {/* Ticker Strip — 28px */}
      <div className="h-[28px] flex-none flex items-center px-4 bg-stone-950 border-b border-stone-800 overflow-x-auto overflow-y-hidden no-scrollbar">
        {tickerItems.map(t => (
          <div
            key={t.key}
            className="flex items-baseline gap-1.5 pr-[22px] mr-[22px] border-r border-stone-900 whitespace-nowrap shrink-0"
          >
            <span className="font-mono text-micro tracking-[0.1em] uppercase text-stone-500">
              {t.key}
            </span>
            <span className="font-num text-meta font-semibold text-stone-200">
              {t.val}
            </span>
            <span
              className={`font-mono text-micro font-semibold ${
                t.deltaType === 'pos'
                  ? 'text-emerald-400'
                  : t.deltaType === 'neg'
                  ? 'text-red-400'
                  : 'text-stone-500'
              }`}
            >
              {t.delta}
            </span>
          </div>
        ))}
      </div>

      {/* Main Screen Body — Viewport pane */}
      <main id="main-content" className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Floating Agent Copilot Drawer */}
      <FloatingAgentDrawer />

      {/* Footer — 26px */}
      <footer className="h-[26px] flex-none flex items-center justify-between px-4 bg-stone-900 border-t border-stone-800 font-mono text-micro tracking-[0.06em] text-stone-400">
        <div>
          Keys 1–3 Workspaces · Ctrl+K Command Bar · Esc close
        </div>
      </footer>

      {/* Global Command Palette Modal */}
      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)} 
      />

    </div>
  );
}
