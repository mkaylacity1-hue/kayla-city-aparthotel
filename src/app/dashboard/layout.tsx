import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess, type Module, type Role } from '@/lib/auth/roles';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staffRow } = await supabase
    .from('staff')
    .select('full_name, role, is_active, property_id')
    .eq('id', user.id)
    .single();

  if (!staffRow || !staffRow.is_active) redirect('/login?error=not_provisioned');

  const { data: allStaff } = await supabase
    .from('staff')
    .select('id, full_name, role')
    .eq('property_id', staffRow.property_id!)
    .eq('is_active', true)
    .neq('id', user.id);

  const role = staffRow.role as Role;

  const NAV_ITEMS: { label: string; href: string; module: Module }[] = [
    { label: 'Dashboard', href: '/dashboard', module: 'dashboard' },
    { label: 'Staff', href: '/dashboard/staff', module: 'staff' },
    { label: 'Units', href: '/dashboard/units', module: 'rooms' },
    { label: 'Pricing', href: '/dashboard/pricing', module: 'pricing' },
    { label: 'Guests', href: '/dashboard/guests', module: 'guests' },
    { label: 'Reservations', href: '/dashboard/reservations', module: 'reservations' },
    { label: 'Breakfast Orders', href: '/dashboard/breakfast', module: 'dashboard' },
    { label: 'Breakfast Menu', href: '/dashboard/breakfast/manage', module: 'dashboard' },
    { label: 'Bar', href: '/dashboard/bar', module: 'dashboard' },
    { label: 'Inventory', href: '/dashboard/inventory', module: 'dashboard' },
    { label: 'Tasks', href: '/dashboard/tasks', module: 'tasks' },
    { label: 'Housekeeping', href: '/dashboard/housekeeping-tasks', module: 'housekeeping_tasks' },
    { label: 'Gate Log', href: '/dashboard/gate-log', module: 'gate_log' },
    { label: 'Shift Reports', href: '/dashboard/shift-reports', module: 'shift_reports' },
    { label: 'Settings', href: '/dashboard/settings', module: 'settings' },
  ];

  const visibleNavItems = NAV_ITEMS.filter((item) => canAccess(role, item.module));

  return (
    <DashboardShell
      staffName={staffRow.full_name}
      role={role}
      propertyId={staffRow.property_id!}
      userId={user.id}
      allStaff={allStaff ?? []}
      navItems={visibleNavItems}
    >
      {children}
    </DashboardShell>
  );
}