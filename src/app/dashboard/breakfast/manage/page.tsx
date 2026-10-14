import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BreakfastMenuManager } from '@/components/breakfast/breakfast-menu-manager';

export default async function BreakfastManagePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();

  if (!me || !['owner', 'manager'].includes(me.role)) redirect('/dashboard');

  const [{ data: menuItems }, { data: specialFee }] = await Promise.all([
    supabase.from('breakfast_menu')
      .select('*')
      .eq('property_id', me.property_id!)
      .eq('is_active', true)
      .order('category')
      .order('display_order'),
    supabase.from('breakfast_special_fee')
      .select('*')
      .eq('property_id', me.property_id!)
      .single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Breakfast Menu</h1>
          <p className="text-sm text-muted">Manage breakfast items and special request fee.</p>
        </div>
        <a href="/dashboard/breakfast" className="text-sm text-accent hover:underline">← Back to Orders</a>
      </div>
      <BreakfastMenuManager
        menuItems={menuItems ?? []}
        specialFee={specialFee}
        propertyId={me.property_id!}
      />
    </div>
  );
}