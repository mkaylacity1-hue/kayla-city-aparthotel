import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/auth/roles';
import { PricingBoard } from '@/components/pricing/pricing-board';

export default async function PricingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();
  if (!me || !canAccess(me.role as any, 'pricing')) redirect('/dashboard');
  const [{ data: unitTypes }, { data: seasonalRates }] = await Promise.all([
    supabase.from('unit_types')
      .select('*')
      .eq('property_id', me.property_id!)
      .order('name'),
    supabase.from('seasonal_rates')
      .select('*, unit_type:unit_type_id(name)')
      .order('start_date', { ascending: false }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Pricing</h1>
        <p className="text-sm text-muted">Manage unit prices and seasonal rates.</p>
      </div>
      <PricingBoard
        unitTypes={unitTypes ?? []}
        seasonalRates={seasonalRates ?? []}
        propertyId={me.property_id!}
      />
    </div>
  );
}
