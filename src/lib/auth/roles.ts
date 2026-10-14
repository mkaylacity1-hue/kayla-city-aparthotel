export const ROLES = ['owner', 'manager', 'receptionist', 'housekeeping', 'security'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner', manager: 'Manager', receptionist: 'Receptionist',
  housekeeping: 'Housekeeping', security: 'Security',
};

export const MODULES = [
  'dashboard', 'staff', 'rooms', 'pricing', 'guests', 'reservations',
  'tasks', 'housekeeping_tasks', 'gate_log', 'shift_reports',
  'notifications', 'settings', 'breakfast',
] as const;
export type Module = (typeof MODULES)[number];

const PERMISSIONS: Record<Role, readonly Module[]> = {
  owner: ['dashboard','staff','rooms','pricing','guests','reservations','tasks','housekeeping_tasks','gate_log','shift_reports','notifications','settings','breakfast'],
  manager: ['dashboard','rooms','pricing','guests','reservations','tasks','housekeeping_tasks','gate_log','shift_reports','notifications','breakfast'],
  receptionist: ['dashboard','guests','reservations','tasks','shift_reports','notifications','breakfast'],
  housekeeping: ['dashboard','housekeeping_tasks','shift_reports','notifications'],
  security: ['dashboard','gate_log','shift_reports','notifications'],
};

export function canAccess(role: Role, module: Module): boolean {
  return PERMISSIONS[role]?.includes(module) ?? false;
}

export function homePathForRole(role: Role): string {
  if (role === 'housekeeping') return '/dashboard/housekeeping-tasks';
  if (role === 'security') return '/dashboard/gate-log';
  return '/dashboard';
}

export function canCreateStaff(role: Role): boolean { return role === 'owner'; }
export function canCreateTasks(role: Role): boolean { return role === 'owner' || role === 'manager'; }
export function canAssignTasks(role: Role): boolean { return role === 'owner' || role === 'manager' || role === 'receptionist'; }
export function canViewAllReports(role: Role): boolean { return role === 'owner' || role === 'manager'; }
export function canViewAllTasks(role: Role): boolean { return role === 'owner' || role === 'manager'; }
