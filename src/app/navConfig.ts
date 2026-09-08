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
  { to: '/data-sources', label: 'Data Sources', keyHint: '7', icon: Database },
];

/**
 * 12 Ledger Navigation Tabs
 */
export const WORKSPACE_TABS: NavItem[] = [
  // --- Group 1: Market Intelligence & Pricing ---
  { to: '/pricing', label: 'Pricing desk', keyHint: '1', icon: FileSpreadsheet },

  // --- Group 2: Physical Supply & Infrastructure ---
  { to: '/sourcing', label: 'Origination', keyHint: '2', icon: Compass },
  { to: '/plants', label: 'Plants', keyHint: '3', icon: Building2 },
  { to: '/map', label: 'Map', keyHint: '4', icon: Globe },

  // --- Group 3: Deal Execution ---
  { to: '/trade', label: 'Trade builder', keyHint: '5', icon: Zap },

  // --- Group 4: Compliance, Audit & Governance ---
  { to: '/registries', label: 'Registries', keyHint: 'G', icon: ShieldCheck },
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
