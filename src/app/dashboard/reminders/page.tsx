import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RemindersBoard } from '@/components/reminders/reminders-board';

export default async function RemindersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meData } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();

  const me = meData as any;
  if (!me || !['owner', 'manager', 'receptionist'].includes(me.role)) redirect('/dashboard');

  const { data: reminders } = await (supabase.from('reminders') as any)
    .select('*')
    .eq('property_id', me.property_id)
    .order('event_date');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Reminders</h1>
        <p className="text-sm text-muted">Birthdays, anniversaries, celebrations and events. The team gets a notification 1 week before, 1 day before and on the day.</p>
      </div>
      <RemindersBoard
        reminders={reminders ?? []}
        propertyId={me.property_id}
        currentStaffId={user.id}
      />
    </div>
  );
}