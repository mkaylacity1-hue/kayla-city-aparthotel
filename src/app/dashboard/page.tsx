import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();

  if (!me) redirect('/login');

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: occupiedCount },
    { count: checkinsToday },
    { count: openTasks },
    { count: pendingInspection },
  ] = await Promise.all([
    supabase.from('units').select('*', { count: 'exact', head: true })
      .eq('property_id', me.property_id!).eq('status', 'occupied'),
    supabase.from('reservations').select('*', { count: 'exact', head: true })
      .eq('property_id', me.property_id!).eq('check_in_date', today).eq('status', 'checked_in'),
    supabase.from('tasks').select('*', { count: 'exact', head: true })
      .eq('property_id', me.property_id!).in('status', ['pending', 'in_progress']),
    supabase.from('units').select('*', { count: 'exact', head: true })
      .eq('property_id', me.property_id!).eq('status', 'cleaned'),
  ]);

  const { data: lowStockItems } = await supabase
    .from('inventory_items')
    .select('id, current_stock, minimum_stock')
    .eq('property_id', me.property_id!)
    .eq('status', 'active');

  const lowStockCount = (lowStockItems ?? []).filter((i) => i.current_stock <= i.minimum_stock).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Overview of today at Kayla City ApartHotel.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Occupied Units</CardTitle></CardHeader>
          <CardContent>
            <p className="font-numeric text-3xl font-semibold">{occupiedCount ?? 0}</p>
            <p className="text-xs text-muted">Currently checked in</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Check-ins Today</CardTitle></CardHeader>
          <CardContent>
            <p className="font-numeric text-3xl font-semibold">{checkinsToday ?? 0}</p>
            <p className="text-xs text-muted">{today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open Tasks</CardTitle></CardHeader>
          <CardContent>
            <p className="font-numeric text-3xl font-semibold">{openTasks ?? 0}</p>
            <p className="text-xs text-muted">Pending or in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pending Inspection</CardTitle></CardHeader>
          <CardContent>
            <p className="font-numeric text-3xl font-semibold text-warning">{pendingInspection ?? 0}</p>
            <p className="text-xs text-muted">Units cleaned, awaiting inspection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Low Stock Items</CardTitle></CardHeader>
          <CardContent>
            <p className="font-numeric text-3xl font-semibold text-danger">{lowStockCount}</p>
            <p className="text-xs text-muted">Below minimum stock level</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
