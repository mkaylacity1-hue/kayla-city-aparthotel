import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess, canViewAllReports } from '@/lib/auth/roles';
import { ShiftReportBoard } from '@/components/shift-reports/shift-report-board';

export default async function ShiftReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id, full_name')
    .eq('id', user.id)
    .single();
  if (!me || !canAccess(me.role as any, 'shift_reports')) redirect('/dashboard');
  const viewAll = canViewAllReports(me.role as any);
  let query = supabase
    .from('shift_reports')
    .select('*, author:staff_id(full_name, role)')
    .eq('property_id', me.property_id!)
    .order('report_date', { ascending: false })
    .order('submitted_at', { ascending: false });
  if (!viewAll) query = query.eq('staff_id', user.id);
  const { data: reports } = await query;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Shift Reports</h1>
        <p className="text-sm text-muted">{viewAll ? 'View all staff shift reports.' : 'Write and view your shift reports.'}</p>
      </div>
      <ShiftReportBoard
        reports={reports ?? []}
        currentStaffId={user.id}
        currentRole={me.role as any}
        propertyId={me.property_id!}
        staffName={me.full_name}
        viewAll={viewAll}
      />
    </div>
  );
}
