import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/auth/roles';
import { HousekeepingBoard } from '@/components/housekeeping/housekeeping-board';

export default async function HousekeepingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();

  if (!me || !canAccess(me.role as any, 'housekeeping_tasks')) redirect('/dashboard');

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number, status, unit_type:unit_type_id(name)')
    .eq('property_id', me.property_id!)
    .order('unit_number');

  const { data: staff } = await supabase
    .from('staff')
    .select('id, full_name, role')
    .eq('property_id', me.property_id!)
    .eq('is_active', true);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Housekeeping</h1>
        <p className="text-sm text-muted">Track room cleaning status and assign housekeeping tasks.</p>
      </div>
      <HousekeepingBoard
        units={units ?? []}
        allStaff={staff ?? []}
        currentStaffId={user.id}
        currentRole={me.role as any}
        propertyId={me.property_id!}
      />
    </div>
  );
}
