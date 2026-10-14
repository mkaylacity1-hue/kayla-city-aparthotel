import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canAccess, type Module, type Role } from '@/lib/auth/roles';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SignOutButton } from '@/components/sign-out-button';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { VoiceMessageButton } from '@/components/voice/voice-message-button';

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
  const role = staffRow.role as Role;
  const visibleNavItems = NAV_ITEMS.filter((item) => canAccess(role, item.module));
  const { data: allStaff } = await supabase
    .from('staff')
    .select('id, full_name, role')
    .eq('property_id', staffRow.property_id!)
    .eq('is_active', true)
    .neq('id', user.id);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 flex-col border-r border-border bg-surface sm:flex">
        <div className="border-b border-border px-5 py-5">
          <p className="font-heading text-sm font-semibold">Kayla City</p>
          <p className="text-xs text-muted">ApartHotel Console</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {visibleNavItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-raised hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border px-5 py-4">
          <p className="text-xs font-medium text-foreground">{staffRow.full_name}</p>
          <p className="text-xs capitalize text-muted">{role.replace('_', ' ')}</p>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <p className="font-heading text-sm font-semibold text-foreground">M'Kayla City ApartHotel</p>
          <div className="flex items-center gap-2">
            <NotificationBell staffId={user.id} />
            <VoiceMessageButton
              currentStaffId={user.id}
              propertyId={staffRow.property_id!}
              allStaff={allStaff ?? []}
            />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
