import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VoiceMessagesBoard } from "@/components/voice/voice-messages-board";

export default async function VoiceMessagesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("staff")
    .select("role, property_id, full_name")
    .eq("id", user.id)
    .single();

  if (!me) redirect("/dashboard");

  const { data: allStaff } = await supabase
    .from("staff")
    .select("id, full_name, role")
    .eq("property_id", me.property_id!)
    .eq("is_active", true)
    .neq("id", user.id);

  const { data: received } = await supabase
    .from("voice_messages")
    .select("*, sender:sender_id(full_name, role)")
    .eq("recipient_id", user.id)
    .eq("message_type", "direct")
    .order("created_at", { ascending: false });

  const { data: sent } = await supabase
    .from("voice_messages")
    .select("*, recipient:recipient_id(full_name, role)")
    .eq("sender_id", user.id)
    .eq("message_type", "direct")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Voice Messages</h1>
        <p className="text-sm text-muted">Send and receive voice messages with your team.</p>
      </div>
      <VoiceMessagesBoard
        received={received ?? []}
        sent={sent ?? []}
        allStaff={allStaff ?? []}
        currentStaffId={user.id}
        propertyId={me.property_id!}
        currentStaffName={me.full_name}
      />
    </div>
  );
}