import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

interface LayoutProps {
  staleMarkCount: number;
}

const NAV_ITEMS = [
  { to: '/', label: '🗺️ Map', end: true },
  { to: '/trade', label: '📋 Trade Builder' },
  { to: '/scanner', label: '📊 Opportunity Scanner' },
  { to: '/marks', label: '💰 Marks' },
  { to: '/library', label: '📚 Trade Library' },
];

export function Layout({ staleMarkCount }: LayoutProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-stone-900 tracking-tight">
              Biomethane Desk
            </h1>
            <span className="text-xs text-stone-400 font-mono">v1.0</span>
          </div>
          
          {/* Nav */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150
                  ${isActive 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Stale mark count */}
          <div className="flex items-center gap-2">
            {staleMarkCount > 0 && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full
                ${staleMarkCount > 5 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${staleMarkCount > 5 ? 'bg-red-500' : 'bg-amber-500'}`} />
                {staleMarkCount} stale mark{staleMarkCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
