import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/auth/roles';
import { TaskBoard } from '@/components/tasks/task-board';

export default async function TasksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();
  if (!me || !canAccess(me.role as any, 'tasks')) redirect('/dashboard');
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:assigned_to(full_name), assigner:assigned_by(full_name)')
    .eq('property_id', me.property_id!)
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false });
  const { data: allStaff } = await supabase
    .from('staff')
    .select('id, full_name, role')
    .eq('property_id', me.property_id!)
    .eq('is_active', true);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted">Assign and track tasks across all staff.</p>
      </div>
      <TaskBoard
        tasks={tasks ?? []}
        staff={allStaff ?? []}
        currentStaffId={user.id}
        currentRole={me.role as any}
        propertyId={me.property_id!}
      />
    </div>
  );
}
