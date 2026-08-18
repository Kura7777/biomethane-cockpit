import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { MARKETS } from '../../domain/markets/registry';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { 
  Search, 
  ArrowRight, 
  TrendingUp, 
  Globe, 
  Building2, 
  Scale, 
  Settings, 
  FileText, 
  Zap, 
  BookOpen, 
  Check 
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  category: 'WORKSPACES' | 'ACTIONS' | 'MARKETS' | 'REGISTRIES' | 'REFERENCE';
  subtitle?: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { dispatch } = useAppState();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items catalogue
  const allItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [
      // Primary Workspaces
      {
        id: 'ws-sourcing',
        title: 'Commercial Sourcing',
        category: 'WORKSPACES',
        subtitle: 'Client intake, 20 origin fan-out, 6-Gate regulatory audit',
        shortcut: '1',
        icon: TrendingUp,
        action: () => { navigate('/sourcing'); onClose(); },
      },
      {
        id: 'ws-trade',
        title: 'Trade Builder',
        category: 'WORKSPACES',
        subtitle: '3-column consignment pricing, deal ticket structuring, logistics',
        shortcut: '2',
        icon: Scale,
        action: () => { navigate('/trade'); onClose(); },
      },
      // Quick Actions
      {
        id: 'act-seed-marks',
        title: 'Seed Simulated Desk Marks',
        category: 'ACTIONS',
        subtitle: 'Populates realistic broker mid/bid/offers across all 22 active markets',
        icon: Zap,
        action: () => {
          dispatch({ type: 'SIMULATE_DESK' });
          onClose();
        },
      },
      {
        id: 'act-side-bid',
        title: 'Set Pricing Side to BID',
        category: 'ACTIONS',
        subtitle: 'Evaluate desk netbacks off certificate Bid marks (selling certificates)',
        icon: Check,
        action: () => {
          dispatch({ type: 'SET_PRICING_SIDE', side: 'bid' });
          onClose();
        },
      },
      {
        id: 'act-side-mid',
        title: 'Set Pricing Side to MID',
        category: 'ACTIONS',
        subtitle: 'Evaluate desk netbacks off Mid market reference marks',
        icon: Check,
        action: () => {
          dispatch({ type: 'SET_PRICING_SIDE', side: 'mid' });
          onClose();
        },
      },
      {
        id: 'act-side-offer',
        title: 'Set Pricing Side to OFFER',
        category: 'ACTIONS',
        subtitle: 'Evaluate desk netbacks off certificate Offer marks (buying certificates)',
        icon: Check,
        action: () => {
          dispatch({ type: 'SET_PRICING_SIDE', side: 'offer' });
          onClose();
        },
      },

      // Reference & Supporting Screens
      {
        id: 'ref-marks',
        title: 'Desk Marks & Forward Curves',
        category: 'REFERENCE',
        subtitle: '16 compliance certificates, TTF forward curves, FX crosses',
        shortcut: '7',
        icon: TrendingUp,
        action: () => { navigate('/marks'); onClose(); },
      },
      {
        id: 'ref-plants',
        title: 'European Plants & Registry Hub',
        category: 'REGISTRIES',
        subtitle: '1,975 verified biomethane plants, dena, VertiCer, Energinet flows',
        shortcut: '6',
        icon: Building2,
        action: () => { navigate('/plants'); onClose(); },
      },
      {
        id: 'ref-map',
        title: 'Pan-European Grid Map',
        category: 'REFERENCE',
        subtitle: 'Interconnected mass balance zones, physical pipelines, border points',
        shortcut: '5',
        icon: Globe,
        action: () => { navigate('/map'); onClose(); },
      },
      {
        id: 'ref-citations',
        title: 'Statutory Citations Registry',
        category: 'REFERENCE',
        subtitle: 'RED III Art. 30/31, BImSchG §37a, Dutch Environmental Act',
        shortcut: '8',
        icon: BookOpen,
        action: () => { navigate('/citations'); onClose(); },
      },
      {
        id: 'ref-dossiers',
        title: 'Saved Deal Dossiers',
        category: 'REFERENCE',
        subtitle: 'Audit-ready compliance packages, term sheet history',
        shortcut: '7',
        icon: FileText,
        action: () => { navigate('/library'); onClose(); },
      },
      {
        id: 'ref-settings',
        title: 'Desk Settings',
        category: 'REFERENCE',
        subtitle: 'Desk trading defaults, pricing side, state import / export',
        shortcut: '9',
        icon: Settings,
        action: () => { navigate('/settings'); onClose(); },
      },
    ];

    // Add Compliance Markets
    MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
      items.push({
        id: `mkt-${m.id}`,
        title: `${m.countryName} — ${m.name}`,
        category: 'MARKETS',
        subtitle: `${m.unitLabel} · ${m.notes || m.legalBasis}`,
        icon: Globe,
        action: () => {
          navigate(buildDealUrl({ marketId: m.id }));
          onClose();
        },
      });
    });

    return items;
  }, [navigate, onClose, dispatch]);

  // Filter items based on user query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase().trim();
    return allItems.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Keyboard navigation inside palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Ensure selected item is scrolled into view
  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 p-4 bg-black/70 backdrop-blur-xs font-sans animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[620px] bg-stone-900 border border-stone-700 shadow-2xl rounded-xs overflow-hidden flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Command Palette"
      >
        {/* Search Input Bar */}
        <div className="p-3 px-4 border-b border-stone-800 flex items-center gap-3 bg-stone-950">
          <Search className="w-4 h-4 text-teal-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, market, country, or action... (e.g. 'THG', 'Denmark', 'Simulate')"
            className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-stone-100 placeholder-stone-500"
          />
          <kbd className="font-mono text-micro text-stone-400 bg-stone-800 border border-stone-700 px-1.5 py-0.5 rounded-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto p-1 divide-y divide-stone-800/40 divide-dashed"
        >
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-stone-500 font-mono text-xs">
              No matching commands or markets found for &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 px-3 rounded-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-teal-950/70 border border-teal-800/80 text-stone-100' : 'text-stone-300 hover:bg-stone-850'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-xs flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-teal-800 text-teal-200' : 'bg-stone-800 text-stone-400'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold flex items-center gap-2">
                        <span className={isSelected ? 'text-teal-200' : 'text-stone-200'}>
                          {item.title}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 font-mono uppercase bg-stone-800 border border-stone-700 text-stone-400 rounded-xs">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div className="font-sans text-micro text-stone-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className="font-mono text-micro text-stone-400 bg-stone-800 border border-stone-700 px-1.5 py-0.5 rounded-xs">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Helper */}
        <div className="p-2 px-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between font-mono text-[10px] text-stone-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Biomethane Desk Command Bar</span>
        </div>
      </div>
    </div>
  );
}
