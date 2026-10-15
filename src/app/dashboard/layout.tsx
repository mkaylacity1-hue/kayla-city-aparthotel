import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const LOGO_URL = "https://eleahodkxilnzqzjpozq.supabase.co/storage/v1/object/public/public-assets/Kayla%20City%20Logo%20Design.png";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function getDate() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id, full_name')
    .eq('id', user.id)
    .single();

  if (!me) redirect('/login');

  const today = new Date().toISOString().split('T')[0];
  const firstName = (me.full_name as string)?.split(' ')[0] ?? me.full_name;

  const [
    { count: occupiedCount },
    { count: availableCount },
    { count: cleaningCount },
    { count: maintenanceCount },
    { count: totalRooms },
    { count: guestsIn },
    { count: openTasks },
    { count: reportsToday },
    { count: openMaintenance },
  ] = await Promise.all([
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!).eq('status', 'occupied'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!).eq('status', 'available'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!).eq('status', 'cleaning'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!).eq('status', 'maintenance'),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!),
    supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!).eq('status', 'checked_in'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!).in('status', ['pending', 'in_progress']),
    supabase.from('shift_reports').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!).eq('report_date', today),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('property_id', me.property_id!).eq('status', 'maintenance'),
  ]);

  const { data: lowStockItems } = await supabase
    .from('inventory_items')
    .select('id, current_stock, minimum_stock')
    .eq('property_id', me.property_id!)
    .eq('status', 'active');

  const lowStockCount = (lowStockItems ?? []).filter((i) => i.current_stock <= i.minimum_stock).length;

  const statCards = [
    { label: "GUESTS IN", value: guestsIn ?? 0, href: "/dashboard/reservations", color: "#e05a5a", icon: "👥" },
    { label: "PENDING TASKS", value: openTasks ?? 0, href: "/dashboard/tasks", color: "#e09a3a", icon: "✅" },
    { label: "REPORTS TODAY", value: reportsToday ?? 0, href: "/dashboard/shift-reports", color: "#4a9ae0", icon: "📋" },
    { label: "OPEN MAINTENANCE", value: openMaintenance ?? 0, href: "/dashboard/housekeeping-tasks", color: "#b8863b", icon: "🔧" },
    { label: "ACTIVE RESERVATIONS", value: guestsIn ?? 0, href: "/dashboard/reservations", color: "#5a8fe0", icon: "🛏️" },
    { label: "TOTAL ROOMS", value: totalRooms ?? 0, href: "/dashboard/units", color: "#e0b83a", icon: "🏨" },
    { label: "LOW STOCK ITEMS", value: lowStockCount, href: "/dashboard/inventory", color: "#e05a8a", icon: "📦" },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Header with logo */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Owner Dashboard</p>
          <p className="text-xs text-muted">M'Kayla City ApartHotel</p>
        </div>
        <img src={LOGO_URL} alt="Kayla City" className="h-10 object-contain" />
      </div>

      {/* Greeting */}
      <div>
        <p className="text-xs font-bold tracking-widest text-accent uppercase">{getGreeting()}</p>
        <h1 className="font-heading text-3xl font-bold text-foreground mt-1">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted mt-1">{getDate()}</p>
      </div>

      {/* Occupancy bar */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-bold tracking-widest text-muted uppercase mb-3">HOTEL OCCUPANCY</p>
        {/* Visual bar */}
        <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden mb-3">
          <div className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${totalRooms ? Math.round(((occupiedCount ?? 0) / totalRooms) * 100) : 0}%` }} />
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <Link href="/dashboard/units?filter=occupied" className="flex items-center gap-1.5 hover:text-accent">
            <span className="h-2 w-2 rounded-full bg-danger inline-block" />
            Occupied: <strong>{occupiedCount ?? 0}</strong>
          </Link>
          <Link href="/dashboard/units?filter=available" className="flex items-center gap-1.5 hover:text-accent">
            <span className="h-2 w-2 rounded-full bg-success inline-block" />
            Available: <strong>{availableCount ?? 0}</strong>
          </Link>
          <Link href="/dashboard/units?filter=cleaning" className="flex items-center gap-1.5 hover:text-accent">
            <span className="h-2 w-2 rounded-full bg-warning inline-block" />
            Cleaning: <strong>{cleaningCount ?? 0}</strong>
          </Link>
          <Link href="/dashboard/units?filter=maintenance" className="flex items-center gap-1.5 hover:text-accent">
            <span className="h-2 w-2 rounded-full bg-muted inline-block" />
            Maintenance: <strong>{maintenanceCount ?? 0}</strong>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}
            className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 hover:border-accent transition-colors group"
            style={{ borderTopColor: card.color, borderTopWidth: "2px" }}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold tracking-widest text-muted uppercase leading-tight">{card.label}</p>
              <span className="text-xl rounded-lg p-1.5 bg-surface-raised group-hover:scale-110 transition-transform">{card.icon}</span>
            </div>
            <p className="font-heading text-4xl font-bold text-foreground">{card.value}</p>
          </Link>
        ))}
      </div>

    </div>
  );
}