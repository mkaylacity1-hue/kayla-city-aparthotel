import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/auth/roles';
import { UnitsBoard } from '@/components/units/units-board';

export default async function UnitsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();
  if (!me || !canAccess(me.role as any, 'rooms')) redirect('/dashboard');
  const { data: unitTypes } = await supabase
    .from('unit_types')
    .select('*')
    .eq('property_id', me.property_id!)
    .order('name');
  const { data: units } = await supabase
    .from('units')
    .select('*, unit_type:unit_type_id(name, base_price_ghs, base_price_usd)')
    .eq('property_id', me.property_id!)
    .order('unit_number');
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Units</h1>
        <p className="text-sm text-muted">Manage all apartment units and their status.</p>
      </div>
      <UnitsBoard
        units={units ?? []}
        unitTypes={unitTypes ?? []}
        propertyId={me.property_id!}
        currentRole={me.role as any}
      />
    </div>
  );
}
