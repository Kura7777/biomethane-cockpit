import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Scale, Moon, Sun, Search, Flame } from 'lucide-react';
import './header.css';
import { WORKSPACE_TABS } from './navConfig';
import { useTheme } from '../store/theme';

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
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header select-none z-50">
      <button type="button" className="app-brand" onClick={() => navigate('/sourcing')}>
        <span className="app-brand-mark" aria-hidden="true">
          <Flame size={13} strokeWidth={2.25} />
        </span>
        <span>Biomethane Desk</span>
      </button>

      <span className="app-header-sep" aria-hidden="true" />

      <nav className="app-header-nav noscroll" aria-label="Workspaces">
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

      <div className="app-header-actions">
        <button type="button" className="app-search" onClick={onOpenSearch} aria-label="Search commands (⌘K)" title="Search commands (⌘K)">
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
          <span className="app-icon-btn-text">Auditor</span>
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

        <span className="app-user" title="Trader · A. Vos">
          <span className="app-avatar" aria-hidden="true">AV</span>
          <span className="app-user-name">
            <span className="app-user-role">Trader · </span>A. Vos
          </span>
        </span>
      </div>
    </header>
  );
}
