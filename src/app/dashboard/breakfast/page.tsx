import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/auth/roles';

export default async function BreakfastPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();

  if (!me || !canAccess(me.role as any, 'dashboard')) redirect('/dashboard');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: orders } = await supabase
    .from('breakfast_orders')
    .select('*, unit:unit_id(unit_number), reservation:reservation_id(guest_first_name, guest_surname, number_of_persons)')
    .eq('for_date', tomorrowStr)
    .order('submitted_at', { ascending: false });

  const { data: todayOrders } = await supabase
    .from('breakfast_orders')
    .select('*, unit:unit_id(unit_number), reservation:reservation_id(guest_first_name, guest_surname, number_of_persons)')
    .eq('for_date', today)
    .order('submitted_at', { ascending: false });

  function parseOrder(notes: string | null) {
    if (!notes) return null;
    try { return JSON.parse(notes); } catch { return null; }
  }

  function OrderCard({ order }: { order: any }) {
    const details = parseOrder(order.notes);
    const guest = order.reservation;
    const guestName = guest?.guest_first_name && guest?.guest_surname
      ? `${guest.guest_first_name} ${guest.guest_surname}`
      : "Guest";
    const persons = guest?.number_of_persons ?? order.number_of_guests ?? 1;

    return (
      <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-foreground">Unit {order.unit?.unit_number ?? "—"}</p>
            <p className="text-xs text-muted">{guestName} &bull; {persons} person{persons > 1 ? "s" : ""}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
            {order.status === "confirmed" ? "Confirmed" : "Pending"}
          </span>
        </div>
        {details && (
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {Object.entries(details).map(([key, val]) => val && val !== "No" && val !== "None" ? (
              <div key={key} className="flex gap-1">
                <span className="text-muted capitalize">{key.replace("_", " ")}:</span>
                <span className="font-medium text-foreground">{val as string}</span>
              </div>
            ) : null)}
          </div>
        )}
        <p className="text-xs text-muted">Submitted: {new Date(order.submitted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Breakfast Orders</h1>
        <p className="text-sm text-muted">Guest breakfast orders submitted via QR code.</p>
      </div>

      {/* QR Code Info */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium mb-1">Guest Ordering Link</p>
        <p className="text-xs text-muted mb-2">Share this link or generate a QR code for guests to order breakfast from their room.</p>
        <code className="text-xs bg-surface-raised px-3 py-2 rounded block text-accent">
          {process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/breakfast-order
        </code>
      </div>

      {/* Tomorrow's Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Tomorrow's Orders ({orders?.length ?? 0})</h2>
          <span className="text-xs text-muted">{tomorrowStr}</span>
        </div>
        {!orders || orders.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
            No breakfast orders for tomorrow yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((o: any) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </div>

      {/* Today's Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Today's Orders ({todayOrders?.length ?? 0})</h2>
          <span className="text-xs text-muted">{today}</span>
        </div>
        {!todayOrders || todayOrders.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
            No breakfast orders for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todayOrders.map((o: any) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}