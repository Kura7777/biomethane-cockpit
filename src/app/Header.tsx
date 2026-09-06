import React from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { WORKSPACE_TABS } from './navConfig';
import { useAppState } from '../store/context';
import { useTheme } from '../store/theme';

/** HH:MM:SS in the viewer's local time. Exported so it can be unit tested without rendering. */
export function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

interface HeaderProps {
  onOpenSearch?: () => void;
  onOpenPrices?: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAppState();
  const { theme, toggleTheme } = useTheme();

  const gasIndexPrice = state.marks.gasIndex.mid ?? state.marks.gasIndex.offer ?? state.marks.gasIndex.bid;
  const pricingSide = state.marks.pricingSides?.certificateSide || 'mid';

  return (
    <header
      style={{
        height: '52px',
        flex: 'none',
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '2px solid var(--color-header-divider)',
        backgroundColor: 'var(--color-header-bg)',
        color: 'var(--color-header-text)',
      }}
      className="select-none z-50"
    >
      {/* Brand block */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 18px',
          borderRight: '2px solid var(--color-header-divider)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => navigate('/sourcing')}
      >
        <div style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-accent)', flex: 'none' }} />
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '15px',
            whiteSpace: 'nowrap',
            color: '#ffffff',
            letterSpacing: '-0.01em',
          }}
        >
          Biomethane Desk
        </span>
      </div>

      {/* Market Reference Ticker: TTF M+1 & Side */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 16px',
          borderRight: '2px solid var(--color-header-divider)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span className="eyebrow" style={{ color: 'var(--color-header-muted)', fontSize: '11px', letterSpacing: '0.04em' }}>
            TTF M+1
          </span>
          <span className="num" style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
            {gasIndexPrice !== null && gasIndexPrice !== undefined ? `€${gasIndexPrice.toFixed(2)}` : '—'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span className="eyebrow" style={{ color: 'var(--color-header-muted)', fontSize: '11px', letterSpacing: '0.04em' }}>
            Side
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '1px 6px',
              borderRadius: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--color-accent)',
            }}
          >
            {pricingSide}
          </span>
        </div>
      </div>

      {/* Nav tabs */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'stretch',
          overflowX: 'auto',
          flexShrink: 1,
          minWidth: 0,
        }}
        className="noscroll"
        aria-label="Workspaces"
      >
        {WORKSPACE_TABS.map((tab, idx) => {
          const isActive =
            (tab.to === '/sourcing' && (location.pathname === '/' || location.pathname.startsWith('/sourcing'))) ||
            (tab.to === '/pricing' && (location.pathname.startsWith('/pricing') || location.pathname.startsWith('/marks'))) ||
            (tab.to === '/risk' && location.pathname.startsWith('/risk')) ||
            (tab.to === '/data-sources' && (location.pathname.startsWith('/data-sources') || location.pathname.startsWith('/sources') || location.pathname.startsWith('/provenance'))) ||
            location.pathname === tab.to ||
            location.pathname.startsWith(tab.to + '/');

          const hasDividerBefore = idx === 2 || idx === 5 || idx === 7;

          return (
            <React.Fragment key={tab.to}>
              {hasDividerBefore && (
                <div
                  style={{
                    width: '1px',
                    height: '18px',
                    alignSelf: 'center',
                    backgroundColor: 'var(--color-header-divider, rgba(255,255,255,0.12))',
                    margin: '0 2px',
                    opacity: 0.6,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
              )}
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

      {/* Right cluster */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 16px',
          borderLeft: '2px solid var(--color-header-divider)',
          flexShrink: 0,
        }}
      >
        <NavLink
          to="/connectors"
          className="btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            textDecoration: 'none',
            backgroundColor: location.pathname.startsWith('/connectors')
              ? 'var(--color-accent)'
              : 'var(--color-header-surface)',
            borderColor: location.pathname.startsWith('/connectors')
              ? 'var(--color-accent)'
              : 'var(--color-header-divider)',
            color: '#ffffff',
          }}
          title="TSO & API Data Connectors"
        >
          <span style={{ fontSize: '12px' }}>🔌</span>
          <span>Connectors</span>
        </NavLink>

        <button
          type="button"
          className="btn"
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            backgroundColor: 'var(--color-header-surface)',
            borderColor: 'var(--color-header-divider)',
            color: '#ffffff',
          }}
          onClick={onOpenSearch}
        >
          Command <span className="num" style={{ fontWeight: 400, opacity: 0.7, marginLeft: '4px' }}>⌘K</span>
        </button>

        <button
          type="button"
          className="btn"
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            backgroundColor: 'var(--color-header-surface)',
            borderColor: 'var(--color-header-divider)',
            color: '#ffffff',
          }}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingLeft: '12px',
            borderLeft: '1px solid var(--color-header-divider)',
          }}
        >
          <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', flex: 'none' }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: '#ffffff',
            }}
          >
            Trader · A. Vos
          </span>
        </div>
      </div>
    </header>
  );
}
