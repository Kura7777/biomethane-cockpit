import type { ComponentType } from 'react';
import {
  Globe,
  Compass,
  FileSpreadsheet,
  Building2,
  Database,
  Zap,
  BookOpen,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  keyHint: string;
  icon: ComponentType<{ className?: string }>;
}

export const SIDEBAR_ITEMS: NavItem[] = [
  { to: '/sourcing', label: 'Origination', keyHint: '1', icon: Compass },
  { to: '/plants', label: 'Plants (1,975)', keyHint: '2', icon: Building2 },
  { to: '/map', label: 'Logistics Map', keyHint: '3', icon: Globe },
  { to: '/trade', label: 'Trade Builder', keyHint: '4', icon: Zap },
  { to: '/pricing', label: 'Pricing Desk', keyHint: '5', icon: FileSpreadsheet },
  { to: '/library', label: 'Dossier Library', keyHint: '6', icon: BookOpen },
  { to: '/data-sources', label: 'Data Sources', keyHint: '7', icon: Database },
];

/**
 * Header page title, derived from the same route list the sidebar uses for its
 * active-item highlight — so the two cannot drift apart. Routes outside
 * SIDEBAR_ITEMS (e.g. /settings, /citations) fall back to a capitalized first
 * path segment rather than a hardcoded second list.
 */
export function getPageTitle(pathname: string): string {
  if (pathname === '/') {
    return SIDEBAR_ITEMS.find(item => item.to === '/sourcing')!.label;
  }

  const match = SIDEBAR_ITEMS.find(item => pathname.startsWith(item.to));
  if (match) return match.label;

  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return 'Biomethane Desk';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
