import type { Role } from '../types';

export interface NavItem {
  to: string;
  label: string;
  icon: string; // emoji placeholder; swap for an icon library later
  roles: Role[]; // which roles can see this item
}

// Single source of truth for the sidebar. The same role list should be
// mirrored by backend route guards — the frontend hiding a link is
// convenience, the backend check is the real security boundary.
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: '◧',
    roles: ['OWNER', 'MANAGER', 'KITCHEN', 'FLOOR'],
  },
  {
    to: '/roster',
    label: 'Roster',
    icon: '▦',
    roles: ['OWNER', 'MANAGER', 'KITCHEN', 'FLOOR'],
  },
  {
    to: '/clock',
    label: 'Clock in / out',
    icon: '◷',
    roles: ['OWNER', 'MANAGER', 'KITCHEN', 'FLOOR'],
  },
  {
    to: '/timesheets',
    label: 'Timesheets',
    icon: '◴',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    to: '/reservations',
    label: 'Reservations',
    icon: '✸',
    roles: ['OWNER', 'MANAGER', 'FLOOR'],
  },
  {
    to: '/tables',
    label: 'Tables',
    icon: '▣',
    roles: ['OWNER', 'MANAGER', 'KITCHEN', 'FLOOR'],
  },
  {
    to: '/payroll',
    label: 'Payroll',
    icon: '$',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    to: '/reports',
    label: 'Square reports',
    icon: '◭',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    to: '/staff',
    label: 'Staff',
    icon: '◍',
    roles: ['OWNER', 'MANAGER'],
  },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
