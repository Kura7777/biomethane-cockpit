import React from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Scale, Moon, Sun, Search } from 'lucide-react';
import './header.css';
import { WORKSPACE_TABS } from './navConfig';
import { useAppState } from '../store/context';
import { useTheme } from '../store/theme';
import { deriveSourceBadge } from '../domain/markets/types';
import { SIMULATED_SOURCE_NAME } from '../domain/marks/simulate';

/** HH:MM:SS in the viewer's local time. Exported so it can be unit tested without rendering. */
export function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

interface HeaderProps {
  onOpenSearch?: () => void;
  onOpenPrices?: () => void;
  onOpenAuditor?: () => void;
}

export function Header({ onOpenSearch, onOpenAuditor }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAppState();
  const { theme, toggleTheme } = useTheme();

  const gasIndexPrice = state.marks.gasIndex.mid ?? state.marks.gasIndex.offer ?? state.marks.gasIndex.bid;
  const pricingSide = state.marks.pricingSides?.certificateSide || 'mid';
  const gasIndexBadge = deriveSourceBadge(state.marks.gasIndex.provenance, SIMULATED_SOURCE_NAME);
  const isSimulatedGasIndex = gasIndexBadge.variant === 'WARNING';

  /** The workspace tabs, split into their four groups (pricing | supply | deals | compliance). */
  const GROUP_STARTS = new Set([1, 4, 6]);

  return (
    <header className="app-header select-none z-50">
      {/* Row 1: brand, market reference, desk actions */}
      <div className="app-header-top">
        <button type="button" className="app-brand" onClick={() => navigate('/sourcing')}>
          <span className="app-brand-mark" aria-hidden="true" />
          <span>Biomethane Desk</span>
        </button>

        {/* Market Reference Ticker: TTF M+1 & Side */}
        <div className="app-ticker">
          <span className="app-ticker-item">
            <span className="app-ticker-label">TTF M+1</span>
            <span
              className={`app-ticker-price num ${isSimulatedGasIndex ? 'simulated' : ''}`}
              title={isSimulatedGasIndex ? 'Simulated — not a live market feed. See Marks screen.' : undefined}
            >
              {gasIndexPrice !== null && gasIndexPrice !== undefined ? `€${gasIndexPrice.toFixed(2)}` : '—'}
            </span>
            {isSimulatedGasIndex && <span className="app-badge warn">Simulated</span>}
          </span>
          <span className="app-ticker-item">
            <span className="app-ticker-label">Side</span>
            <span className="app-badge side">{pricingSide}</span>
          </span>
        </div>

        {/* Desk actions */}
        <div className="app-header-actions">
          <button
            type="button"
            className="app-header-btn auditor"
            onClick={onOpenAuditor}
            title="Open Statutory Compliance Auditor & Knowledge Vault (Alt+A)"
          >
            <Scale size={14} />
            <span>Auditor</span>
            <span className="app-kbd num">Alt+A</span>
          </button>

          <button type="button" className="app-header-btn" onClick={onOpenSearch}>
            <Search size={14} />
            Command <span className="app-kbd num">⌘K</span>
          </button>

          <button
            type="button"
            className="app-header-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          <span className="app-user">
            <span className="app-user-dot" aria-hidden="true" />
            Trader · A. Vos
          </span>
        </div>
      </div>

      {/* Row 2: every workspace, full width */}
      <nav className="app-header-nav noscroll" aria-label="Workspaces">
        {WORKSPACE_TABS.map((tab, idx) => {
          const isActive =
            (tab.to === '/sourcing' && (location.pathname === '/' || location.pathname.startsWith('/sourcing'))) ||
            (tab.to === '/pricing' && (location.pathname.startsWith('/pricing') || location.pathname.startsWith('/marks'))) ||
            (tab.to === '/risk' && location.pathname.startsWith('/risk')) ||
            (tab.to === '/data-sources' && (location.pathname.startsWith('/data-sources') || location.pathname.startsWith('/sources') || location.pathname.startsWith('/provenance'))) ||
            location.pathname === tab.to ||
            location.pathname.startsWith(tab.to + '/');

          return (
            <React.Fragment key={tab.to}>
              {GROUP_STARTS.has(idx) && <span className="app-nav-divider" aria-hidden="true" />}
              <NavLink
                to={tab.to}
                className={`navtab ${isActive ? 'active' : ''}`}
                data-on={isActive ? '1' : '0'}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>
    </header>
  );
}
