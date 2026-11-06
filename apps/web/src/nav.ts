import type { Role } from './auth/AuthContext';

export interface NavItem {
  path: string;
  label: string;
  roles?: Role[];
  /** Phase in which the page gets real functionality. */
  phase: number;
}

const ESG: Role[] = ['ESG_TEAM'];
const ALL_READ: Role[] = ['ESG_TEAM', 'INVESTEE', 'VIEWER'];

export const navItems: NavItem[] = [
  { path: '/', label: 'ESG Dashboard', roles: ALL_READ, phase: 5 },
  { path: '/output-report', label: 'ESG Output Report', roles: ['ESG_TEAM', 'VIEWER'], phase: 4 },
  { path: '/minutes-of-meeting', label: 'Minutes of Meeting', roles: ['ESG_TEAM', 'VIEWER'], phase: 5 },
  { path: '/task-inbox', label: 'Task Inbox Dashboard', roles: ESG, phase: 3 },
  { path: '/metrics', label: 'Metrics Management', roles: ['ESG_TEAM', 'VIEWER'], phase: 2 },
  { path: '/data-request', label: 'ESG Data Request', roles: ['ESG_TEAM', 'INVESTEE', 'VIEWER'], phase: 3 },
  { path: '/calculation', label: 'Calculation Result', roles: ['ESG_TEAM', 'VIEWER'], phase: 4 },
  { path: '/master-data', label: 'ESG Configuration', roles: ESG, phase: 1 },
  { path: '/companies', label: 'Master Company & Project', roles: ESG, phase: 1 },
  { path: '/configuration', label: 'Configuration', roles: ESG, phase: 1 },
  { path: '/audit-trail', label: 'Audit Trail', roles: ['ESG_TEAM', 'VIEWER'], phase: 0 },
];
