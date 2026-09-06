import type { ComponentType } from 'react';
import {
  Globe,
  Compass,
  FileSpreadsheet,
  Building2,
  Database,
  Zap,
  BookOpen,
  TrendingUp,
  Radar,
  Scale,
  ShieldCheck,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  keyHint: string;
  icon?: ComponentType<{ className?: string }>;
  description?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Standard SIDEBAR_ITEMS preserved for route title derivation and tests.
 */
export const SIDEBAR_ITEMS: NavItem[] = [
  { to: '/sourcing', label: 'Origination', keyHint: '1', icon: Compass },
  { to: '/plants', label: 'Plants (1,975)', keyHint: '2', icon: Building2 },
  { to: '/registries', label: 'Registries & Flows', keyHint: 'G', icon: ShieldCheck },
  { to: '/map', label: 'Logistics Map', keyHint: '3', icon: Globe },
  { to: '/trade', label: 'Trade Builder', keyHint: '4', icon: Zap },
  { to: '/pricing', label: 'Pricing Desk', keyHint: '5', icon: FileSpreadsheet },
  { to: '/connectors', label: 'Data Connectors', keyHint: 'K', icon: Zap },
  { to: '/library', label: 'Dossier Library', keyHint: '6', icon: BookOpen },
  { to: '/data-sources', label: 'Data Sources', keyHint: '7', icon: Database },
];

/**
 * 12 Ledger Navigation Tabs
 */
export const WORKSPACE_TABS: NavItem[] = [
  { to: '/sourcing', label: 'Origination', keyHint: '1', icon: Compass },
  { to: '/scanner', label: 'Scanner', keyHint: 'S', icon: Radar },
  { to: '/trade', label: 'Trade builder', keyHint: '4', icon: Zap },
  { to: '/pricing', label: 'Pricing desk', keyHint: '5', icon: FileSpreadsheet },
  { to: '/connectors', label: 'Connectors', keyHint: 'K', icon: Zap },
  { to: '/plants', label: 'Plants', keyHint: '2', icon: Building2 },
  { to: '/registries', label: 'Registries', keyHint: 'G', icon: ShieldCheck },
  { to: '/map', label: 'Map', keyHint: '3', icon: Globe },
  { to: '/library', label: 'Library', keyHint: '6', icon: BookOpen },
  { to: '/citations', label: 'Citations', keyHint: 'C', icon: Scale },
  { to: '/data-sources', label: 'Sources', keyHint: '7', icon: Database },
];

export function getPageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '/sourcing') {
    return 'Origination';
  }

  const match = SIDEBAR_ITEMS.find(item => pathname.startsWith(item.to));
  if (match) return match.label;

  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return 'Biomethane Desk';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
