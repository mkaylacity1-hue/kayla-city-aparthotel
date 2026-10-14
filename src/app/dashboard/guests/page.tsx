import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/auth/roles';
import { GuestsBoard } from '@/components/guests/guests-board';

export default async function GuestsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();
  if (!me || !canAccess(me.role as any, 'guests')) redirect('/dashboard');
  const { data: guests } = await supabase
    .from('guests')
    .select('*')
    .eq('property_id', me.property_id!)
    .order('created_at', { ascending: false });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Guests</h1>
        <p className="text-sm text-muted">Register and manage all guests.</p>
      </div>
      <GuestsBoard
        guests={guests ?? []}
        propertyId={me.property_id!}
      />
    </div>
  );
}
