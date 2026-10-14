import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/auth/roles';
import { GateLogBoard } from '@/components/gate-log/gate-log-board';

export default async function GateLogPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();
  if (!me || !canAccess(me.role as any, 'gate_log')) redirect('/dashboard');
  const today = new Date().toISOString().split('T')[0];
  const [{ data: vehicles }, { data: visitors }] = await Promise.all([
    supabase.from('gate_log_vehicles').select('*, logger:logged_by(full_name)')
      .eq('property_id', me.property_id!)
      .gte('time_in', today + 'T00:00:00')
      .order('time_in', { ascending: false }),
    supabase.from('gate_log_visitors').select('*, logger:logged_by(full_name)')
      .eq('property_id', me.property_id!)
      .gte('time_in', today + 'T00:00:00')
      .order('time_in', { ascending: false }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Gate Log</h1>
        <p className="text-sm text-muted">Record and track all vehicles and visitors entering the property.</p>
      </div>
      <GateLogBoard
        vehicles={vehicles ?? []}
        visitors={visitors ?? []}
        currentStaffId={user.id}
        propertyId={me.property_id!}
        currentRole={me.role as any}
      />
    </div>
  );
}
