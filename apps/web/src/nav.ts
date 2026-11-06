import {
  BarChart3,
  Building2,
  Calculator,
  ClipboardList,
  FileText,
  Gauge,
  Inbox,
  Layers,
  ListChecks,
  MessagesSquare,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from './auth/AuthContext';

export interface NavItem {
  path: string;
  label: string;
  group: 'Overview' | 'Collect' | 'Monitor' | 'Setup';
  icon: LucideIcon;
  roles?: Role[];
  /** Extra words the command palette matches on. */
  keywords?: string;
  /** Phase in which the page gets real functionality (only used by the placeholder page). */
  phase: number;
}

const ESG: Role[] = ['ESG_TEAM'];
const READ: Role[] = ['ESG_TEAM', 'VIEWER'];
const ALL_READ: Role[] = ['ESG_TEAM', 'INVESTEE', 'VIEWER'];

export const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', group: 'Overview', icon: Gauge, roles: ALL_READ, keywords: 'home overview esg index score targets', phase: 5 },
  { path: '/data-request', label: 'Data Requests', group: 'Collect', icon: ClipboardList, roles: ['ESG_TEAM', 'INVESTEE', 'VIEWER'], keywords: 'input submit periodic ad hoc', phase: 3 },
  { path: '/task-inbox', label: 'Task Inbox', group: 'Collect', icon: Inbox, roles: ESG, keywords: 'review approve pending', phase: 3 },
  { path: '/minutes-of-meeting', label: 'Minutes of Meeting', group: 'Collect', icon: MessagesSquare, roles: READ, keywords: 'mom notes meeting', phase: 5 },
  { path: '/registers', label: 'Risk & Compliance', group: 'Monitor', icon: ShieldAlert, roles: READ, keywords: 'incidents audit findings risk register compliance checklist k3 safety', phase: 6 },
  { path: '/calculation', label: 'Calculations', group: 'Monitor', icon: Calculator, roles: READ, keywords: 'emission result run', phase: 4 },
  { path: '/output-report', label: 'Reports', group: 'Monitor', icon: FileText, roles: READ, keywords: 'esg output report pdf consolidated', phase: 4 },
  { path: '/metrics', label: 'Metric Selection', group: 'Setup', icon: ListChecks, roles: READ, keywords: 'metrics management mapping version', phase: 2 },
  { path: '/master-data', label: 'ESG Catalog', group: 'Setup', icon: Layers, roles: ESG, keywords: 'themes metrics formula emission factor base year targets configuration', phase: 1 },
  { path: '/companies', label: 'Companies & Projects', group: 'Setup', icon: Building2, roles: ESG, keywords: 'master company project asset', phase: 1 },
  { path: '/configuration', label: 'Settings', group: 'Setup', icon: SlidersHorizontal, roles: ESG, keywords: 'configuration users schedule reviewer', phase: 1 },
  { path: '/audit-trail', label: 'Audit Trail', group: 'Setup', icon: BarChart3, roles: READ, keywords: 'log changes export excel', phase: 0 },
];

export const GROUP_ORDER: NavItem['group'][] = ['Overview', 'Collect', 'Monitor', 'Setup'];

export const SettingsIcon = Settings2;
