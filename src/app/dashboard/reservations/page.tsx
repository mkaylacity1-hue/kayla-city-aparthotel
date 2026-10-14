import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/auth/roles';
import { ReservationsBoard } from '@/components/reservations/reservations-board';

export default async function ReservationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();
  if (!me || !canAccess(me.role as any, 'reservations')) redirect('/dashboard');
  const [{ data: reservations }, { data: guests }, { data: units }] = await Promise.all([
    supabase.from('reservations')
      .select('*, guest:guest_id(full_name, email), unit:unit_id(unit_number, unit_type:unit_type_id(name))')
      .eq('property_id', me.property_id!)
      .order('created_at', { ascending: false }),
    supabase.from('guests')
      .select('id, full_name, email, phone')
      .eq('property_id', me.property_id!)
      .order('full_name'),
    supabase.from('units')
      .select('id, unit_number, status, unit_type:unit_type_id(name, base_price_ghs, base_price_usd)')
      .eq('property_id', me.property_id!)
      .order('unit_number'),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Reservations</h1>
        <p className="text-sm text-muted">Manage all bookings, check-ins and check-outs.</p>
      </div>
      <ReservationsBoard
        reservations={reservations ?? []}
        guests={guests ?? []}
        units={units ?? []}
        propertyId={me.property_id!}
        currentStaffId={user.id}
        currentRole={me.role as any}
      />
    </div>
  );
}
