import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Users, Compass, FileSpreadsheet, BookOpen, LayoutGrid, MessageCircle } from 'lucide-react';
import { ASK_NAV_ITEM, NAV_GROUPS, isNavItemActive } from './navConfig';
import { NavSheet } from './NavSheet';
import { DeskSheet, DeskSheetProps } from './DeskSheet';
import './mobileShell.css';

const GROUP_ICONS: Record<string, React.ComponentType<any>> = {
  demand: Users,
  supply: Compass,
  pricing: FileSpreadsheet,
  reference: BookOpen,
};

export type MobileTabBarProps = Omit<DeskSheetProps, 'open' | 'onClose'>;

/** Mobile-only bottom tab bar (rendered by Layout as the last flex child, not position:fixed).
 *  Tapping a workspace group opens its NavSheet; tapping "Desk" opens DeskSheet. */
export function MobileTabBar(deskSheetProps: MobileTabBarProps) {
  const location = useLocation();
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [deskOpen, setDeskOpen] = useState(false);

  const openGroup = NAV_GROUPS.find(g => g.id === openGroupId) || null;

  return (
    <>
      <nav aria-label="Primary" data-testid="mobile-tabbar" className="mobile-tabbar">
        {NAV_GROUPS.map(group => {
          const Icon = GROUP_ICONS[group.id];
          const active = group.items.some(item => isNavItemActive(item.to, location.pathname));
          return (
            <button
              key={group.id}
              type="button"
              className={`mobile-tab ${active ? 'active' : ''}`}
              data-testid={`tab-${group.id}`}
              aria-haspopup="dialog"
              aria-expanded={openGroupId === group.id}
              onClick={() => setOpenGroupId(group.id)}
            >
              {Icon && <Icon size={20} aria-hidden="true" />}
              <span className="mobile-tab-label">{group.label}</span>
            </button>
          );
        })}
        <NavLink
          to={ASK_NAV_ITEM.to}
          className={`mobile-tab ${isNavItemActive(ASK_NAV_ITEM.to, location.pathname) ? 'active' : ''}`}
          data-testid="tab-ask"
        >
          <MessageCircle size={20} aria-hidden="true" />
          <span className="mobile-tab-label">Ask</span>
        </NavLink>
        <button
          type="button"
          className="mobile-tab"
          data-testid="tab-desk"
          aria-haspopup="dialog"
          aria-expanded={deskOpen}
          onClick={() => setDeskOpen(true)}
        >
          <LayoutGrid size={20} aria-hidden="true" />
          <span className="mobile-tab-label">Desk</span>
        </button>
      </nav>

      <NavSheet group={openGroup} onClose={() => setOpenGroupId(null)} />
      <DeskSheet open={deskOpen} onClose={() => setDeskOpen(false)} {...deskSheetProps} />
    </>
  );
}
