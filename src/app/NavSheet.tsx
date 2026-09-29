import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sheet } from '../shared/ui/Sheet';
import { NavGroup, isNavItemActive } from './navConfig';
import './mobileShell.css';

export interface NavSheetProps {
  group: NavGroup | null;
  onClose: () => void;
}

/** Mobile stand-in for a header workspace dropdown: one sheet per NAV_GROUPS entry, echoing
 *  the desktop .app-menu look (icon tile + label + description, accent bar on the active row). */
export function NavSheet({ group, onClose }: NavSheetProps) {
  const location = useLocation();

  return (
    <Sheet
      open={!!group}
      onClose={onClose}
      title={group?.label}
      subtitle={group?.blurb}
      testId="nav-sheet"
      ariaLabel={group ? `${group.label} navigation` : 'Navigation'}
    >
      {group && (
        <nav className="nav-sheet-list" aria-label={`${group.label} pages`}>
          {group.items.map(item => {
            const Icon = item.icon;
            const active = isNavItemActive(item.to, location.pathname);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`nav-sheet-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={onClose}
              >
                {Icon && (
                  <span className="nav-sheet-icon" aria-hidden="true">
                    <Icon className="nav-sheet-icon-svg" />
                  </span>
                )}
                <span className="nav-sheet-text">
                  <span className="nav-sheet-label">{item.label}</span>
                  {item.description && <span className="nav-sheet-desc">{item.description}</span>}
                </span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </Sheet>
  );
}
