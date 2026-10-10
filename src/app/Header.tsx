import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Scale, Moon, Sun, Search, Flame, ChevronDown, Sunrise } from 'lucide-react';
import './header.css';
import { NAV_GROUPS, isNavItemActive, getPageTitle } from './navConfig';
import { useTheme } from '../store/theme';
import { getLastRegcheckReport, isRegcheckStale } from '../domain/regcheck/storage';

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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close the open menu on navigation, outside click or Escape.
  useEffect(() => setOpenGroup(null), [location.pathname]);
  useEffect(() => {
    if (openGroup === null) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroup(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openGroup]);

  // Mobile header shows "<group label> · <item label>" instead of the desktop workspace tabs,
  // e.g. "Supply · Plants". Falls back to getPageTitle for routes outside the NAV_GROUPS (rare).
  let mobileGroupLabel: string | null = null;
  let mobileItemLabel: string | null = null;
  for (const group of NAV_GROUPS) {
    const item = group.items.find(i => isNavItemActive(i.to, location.pathname));
    if (item) {
      mobileGroupLabel = group.label;
      mobileItemLabel = item.label;
      break;
    }
  }
  if (!mobileItemLabel) mobileItemLabel = getPageTitle(location.pathname);

  const regcheckStale = isRegcheckStale(getLastRegcheckReport());

  return (
    <header className="app-header select-none z-50">
      <button type="button" className="app-brand" aria-label="Morning brief" title="Morning brief" onClick={() => navigate('/')}>
        <span className="app-brand-mark" aria-hidden="true">
          <Flame size={13} strokeWidth={2.25} />
        </span>
        <span className="app-brand-text">Biomethane Desk</span>
      </button>

      <span className="app-header-location" aria-hidden="false">
        {mobileGroupLabel && <span className="app-header-location-group">{mobileGroupLabel}</span>}
        <span className="app-header-location-item">{mobileItemLabel}</span>
      </span>

      <span className="app-header-sep" aria-hidden="true" />

      <nav className="app-header-nav" aria-label="Workspaces" ref={navRef}>
        <NavLink to="/" className={`app-tab ${isNavItemActive('/brief', location.pathname) ? 'active' : ''}`} title="Morning brief (B)">
          <Sunrise size={13} aria-hidden="true" style={{ marginRight: 6 }} />
          <span>Brief</span>
        </NavLink>
        {NAV_GROUPS.map(group => {
          const current = group.items.find(item => isNavItemActive(item.to, location.pathname));
          const open = openGroup === group.id;
          return (
            <div
              key={group.id}
              className="app-group"
              // Once a menu is open, moving across the bar switches menus (menubar convention).
              onMouseEnter={() => { if (openGroup !== null && openGroup !== group.id) setOpenGroup(group.id); }}
            >
              <button
                type="button"
                className={`app-tab app-group-btn ${current ? 'active' : ''} ${open ? 'open' : ''}`}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={`nav-menu-${group.id}`}
                onClick={() => setOpenGroup(open ? null : group.id)}
              >
                <span>{group.label}</span>
                {group.id === 'reference' && regcheckStale && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-status-warn-border, #f59e0b)',
                      display: 'inline-block',
                      marginLeft: 4,
                      verticalAlign: 'middle',
                    }}
                    title="Regulation check needs attention"
                  />
                )}
                {current && <span className="app-group-current">· {current.label}</span>}
                <ChevronDown size={13} aria-hidden="true" className="app-group-chevron" />
              </button>
              {open && (
                <div className="app-menu" id={`nav-menu-${group.id}`}>
                  <div className="app-menu-blurb">{group.blurb}</div>
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = isNavItemActive(item.to, location.pathname);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={`app-menu-item ${active ? 'active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpenGroup(null)}
                      >
                        {Icon && <span className="app-menu-icon" aria-hidden="true"><Icon className="app-menu-icon-svg" /></span>}
                        <span className="app-menu-text">
                          <span className="app-menu-label">
                            {item.label}
                            {item.to === '/regulation-check' && regcheckStale && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-status-warn-border, #f59e0b)',
                                  display: 'inline-block',
                                  marginLeft: 6,
                                  verticalAlign: 'middle',
                                }}
                                title="Regulation check is older than 7 days or has never been run"
                              />
                            )}
                          </span>
                          {item.description && <span className="app-menu-desc">{item.description}</span>}
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
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
          className="app-icon-btn app-mobile-search-btn"
          onClick={onOpenSearch}
          aria-label="Search commands"
          title="Search commands"
        >
          <Search size={17} aria-hidden="true" />
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
          className="app-icon-btn app-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          <span className="sr-only">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <span className="app-user" title="Trader">
          <span className="app-avatar" aria-hidden="true">T</span>
          <span className="app-user-name">Trader</span>
        </span>
      </div>
    </header>
  );
}
