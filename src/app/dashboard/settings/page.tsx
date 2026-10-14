import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('staff')
    .select('role, property_id')
    .eq('id', user.id)
    .single();

  if (!me || me.role !== 'owner') redirect('/dashboard');

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', me.property_id!)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">System configuration for Kayla City ApartHotel.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Property</CardTitle></CardHeader>
        <CardContent className="text-sm flex flex-col gap-2">
          <div><span className="text-muted">Name:</span> <span className="font-medium">{property?.name}</span></div>
          <div><span className="text-muted">Property ID:</span> <span className="font-numeric text-xs">{property?.id}</span></div>
          <div><span className="text-muted">Created:</span> <span className="font-numeric">{property?.created_at?.split('T')[0]}</span></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>System Information</CardTitle></CardHeader>
        <CardContent className="text-sm flex flex-col gap-2">
          <div><span className="text-muted">Version:</span> <span className="font-numeric">1.0.0</span></div>
          <div><span className="text-muted">Stack:</span> Next.js 14 + Supabase</div>
          <div><span className="text-muted">Theme:</span> Black / White / Rose Gold — editable in globals.css</div>
        </CardContent>
      </Card>
    </div>
  );
}
