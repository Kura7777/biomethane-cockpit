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
  Anchor,
  Flame,
  Briefcase,
  Users,
  SlidersHorizontal,
  ShieldAlert,
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
  { to: '/fueleu-shipping', label: 'FuelEU Maritime', keyHint: 'M', icon: Anchor },
  { to: '/ets2', label: 'EU ETS', keyHint: 'E', icon: Flame },
  { to: '/clients', label: 'Clients', keyHint: 'L', icon: Users },
  { to: '/corporate', label: 'Corporate orders', keyHint: 'Q', icon: Briefcase },
  { to: '/pricing', label: 'Pricing Desk', keyHint: '5', icon: FileSpreadsheet },
  { to: '/deals', label: 'Deal Blotter', keyHint: '', icon: BookOpen },
  { to: '/connectors', label: 'Data Connectors', keyHint: 'K', icon: Zap },
  { to: '/data-sources', label: 'Data Sources', keyHint: '7', icon: Database },
  { to: '/assumptions', label: 'Assumptions', keyHint: 'A', icon: SlidersHorizontal },
  { to: '/regulation-check', label: 'Regulation check', keyHint: '', icon: ShieldAlert },
];

export interface NavGroup {
  id: string;
  label: string;
  /** One line on what the group is for, shown at the top of its menu. */
  blurb: string;
  items: NavItem[];
}

/**
 * The header's workspace menus, grouped by what the trader is doing: who buys and why (demand),
 * where the molecules and certificates come from (supply), what a deal is worth (pricing), and the
 * sources behind every number (reference). Key hints match the shortcuts wired in Layout.tsx.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'demand',
    label: 'Demand',
    blurb: 'Who is exposed to which regulation, and what to sell them',
    items: [
      { to: '/clients', label: 'Clients', keyHint: '', icon: Users, description: 'Every company × regulation, its plays and value stacks' },
      { to: '/ets2', label: 'EU ETS', keyHint: '', icon: Flame, description: 'ETS1 industrial sites, ETS2 gas suppliers and calculator' },
      { to: '/fueleu-shipping', label: 'FuelEU Maritime', keyHint: '', icon: Anchor, description: 'Shipping groups, deficits and pooling' },
      { to: '/corporate', label: 'Corporate orders', keyHint: '', icon: Briefcase, description: 'Price a voluntary GO / PoS request' },
    ],
  },
  {
    id: 'supply',
    label: 'Supply',
    blurb: 'Where the biomethane and certificates come from',
    items: [
      { to: '/sourcing', label: 'Origination', keyHint: '1', icon: Compass, description: 'Order intake to sourced plants and routes' },
      { to: '/plants', label: 'Plants', keyHint: '2', icon: Building2, description: 'European production plants and contacts' },
      { to: '/map', label: 'Map', keyHint: '3', icon: Globe, description: 'Corridors and logistics' },
      { to: '/registries', label: 'Registries', keyHint: '', icon: ShieldCheck, description: 'National registries and certificate flows' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    blurb: 'What a deal is worth',
    items: [
      { to: '/pricing', label: 'Pricing desk', keyHint: '5', icon: FileSpreadsheet, description: 'Marks and broker runs' },
      { to: '/trade', label: 'Trade builder', keyHint: '4', icon: Zap, description: 'Build and audit a deal' },
      { to: '/deals', label: 'Deal blotter', keyHint: '', icon: BookOpen, description: 'Saved deals and their status' },
    ],
  },
  {
    id: 'reference',
    label: 'Reference',
    blurb: 'The law and data behind every number',
    items: [
      { to: '/citations', label: 'Citations', keyHint: 'C', icon: Scale, description: 'Statutory citations' },
      { to: '/data-sources', label: 'Sources', keyHint: '7', icon: Database, description: 'Data sources and provenance' },
      { to: '/assumptions', label: 'Assumptions', keyHint: '', icon: SlidersHorizontal, description: 'Every assumption the desk uses' },
      { to: '/regulation-check', label: 'Regulation check', keyHint: '', icon: ShieldAlert, description: 'Weekly check that the app\'s rules still match the law' },
    ],
  },
];

/** Every workspace in menu order (flat list kept for callers that need it). */
export const WORKSPACE_TABS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

/** Whether a nav item is the current page, including the aliases each screen answers to. */
export function isNavItemActive(to: string, pathname: string): boolean {
  if (to === '/sourcing') return pathname === '/' || pathname.startsWith('/sourcing') || pathname.startsWith('/commercial');
  if (to === '/pricing') return pathname.startsWith('/pricing') || pathname.startsWith('/marks');
  if (to === '/data-sources') return pathname.startsWith('/data-sources') || pathname.startsWith('/sources') || pathname.startsWith('/provenance');
  if (to === '/fueleu-shipping') return pathname.startsWith('/fueleu') || pathname.startsWith('/shipping');
  if (to === '/regulation-check') return pathname.startsWith('/regulation-check');
  return pathname === to || pathname.startsWith(to + '/');
}

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
