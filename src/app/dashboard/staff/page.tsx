import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canCreateStaff } from '@/lib/auth/roles';
import { StaffList } from '@/components/staff/staff-list';

export default async function StaffPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();
  if (!me || !canCreateStaff(me.role as any)) redirect('/dashboard');
  const { data: staffList } = await supabase
    .from('staff')
    .select('id, full_name, role, is_active, created_at')
    .eq('property_id', me.property_id!)
    .order('created_at', { ascending: false });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Staff</h1>
        <p className="text-sm text-muted">Manage staff accounts and roles.</p>
      </div>
      <StaffList staff={staffList ?? []} propertyId={me.property_id!} />
    </div>
  );
}
