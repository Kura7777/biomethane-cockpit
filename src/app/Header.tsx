import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Scale, Moon, Sun, Search, Flame } from 'lucide-react';
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

  const sideLabel = pricingSide.charAt(0).toUpperCase() + pricingSide.slice(1);

  return (
    <header className="app-header select-none z-50">
      {/* Row 1: identity and market context on the left, desk tools on the right */}
      <div className="app-header-row app-header-top">
        <button type="button" className="app-brand" onClick={() => navigate('/sourcing')}>
          <span className="app-brand-mark" aria-hidden="true">
            <Flame size={13} strokeWidth={2.25} />
          </span>
          <span>Biomethane Desk</span>
        </button>

        <span className="app-header-sep" aria-hidden="true" />

        {/* Market reference: TTF M+1 and the pricing side */}
        <dl className="app-ticker">
          <div className="app-ticker-item">
            <dt>TTF M+1</dt>
            <dd
              className="num"
              title={isSimulatedGasIndex ? 'Simulated — not a live market feed. See Marks screen.' : undefined}
            >
              {gasIndexPrice !== null && gasIndexPrice !== undefined ? `€${gasIndexPrice.toFixed(2)}` : '—'}
            </dd>
            {isSimulatedGasIndex && (
              <dd className="app-sim">
                <span className="app-sim-dot" aria-hidden="true" />
                Simulated
              </dd>
            )}
          </div>
          <div className="app-ticker-item">
            <dt>Side</dt>
            <dd>{sideLabel}</dd>
          </div>
        </dl>

        <div className="app-header-actions">
          <button type="button" className="app-search" onClick={onOpenSearch} aria-label="Search commands (⌘K)">
            <Search size={14} aria-hidden="true" />
            <span className="app-search-text">Search commands…</span>
            <kbd className="app-kbd">⌘K</kbd>
          </button>

          <button
            type="button"
            className="app-icon-btn app-icon-btn-label"
            onClick={onOpenAuditor}
            title="Statutory compliance auditor (Alt+A)"
          >
            <Scale size={15} aria-hidden="true" />
            <span>Auditor</span>
          </button>

          <button
            type="button"
            className="app-icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            <span className="sr-only">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <span className="app-header-sep" aria-hidden="true" />

          <span className="app-user">
            <span className="app-avatar" aria-hidden="true">AV</span>
            <span className="app-user-name">
              <span className="app-user-role">Trader · </span>A. Vos
            </span>
          </span>
        </div>
      </div>

      {/* Row 2: every workspace, aligned to the page column below */}
      <nav className="app-header-row app-header-nav noscroll" aria-label="Workspaces">
        {WORKSPACE_TABS.map(tab => {
          const isActive =
            (tab.to === '/sourcing' && (location.pathname === '/' || location.pathname.startsWith('/sourcing'))) ||
            (tab.to === '/pricing' && (location.pathname.startsWith('/pricing') || location.pathname.startsWith('/marks'))) ||
            (tab.to === '/risk' && location.pathname.startsWith('/risk')) ||
            (tab.to === '/data-sources' && (location.pathname.startsWith('/data-sources') || location.pathname.startsWith('/sources') || location.pathname.startsWith('/provenance'))) ||
            location.pathname === tab.to ||
            location.pathname.startsWith(tab.to + '/');

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`app-tab ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
