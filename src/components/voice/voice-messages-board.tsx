"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { VoiceRecorder } from "@/components/voice/voice-recorder";
import { VoicePlayer } from "@/components/voice/voice-player";
import { format } from "date-fns";

interface VoiceMessage {
  id: string;
  file_path: string;
  duration_seconds: number | null;
  is_listened: boolean;
  created_at: string;
  sender?: { full_name: string; role: string } | null;
  recipient?: { full_name: string; role: string } | null;
}

interface StaffMember { id: string; full_name: string; role: string; }

interface Props {
  received: VoiceMessage[];
  sent: VoiceMessage[];
  allStaff: StaffMember[];
  currentStaffId: string;
  propertyId: string;
  currentStaffName: string;
}

export function VoiceMessagesBoard({ received: initReceived, sent: initSent, allStaff, currentStaffId, propertyId, currentStaffName }: Props) {
  const [received, setReceived] = useState(initReceived);
  const [sent, setSent] = useState(initSent);
  const [tab, setTab] = useState<"received" | "sent" | "new">("received");
  const [selectedRecipient, setSelectedRecipient] = useState(allStaff[0]?.id ?? "");
  const supabase = createClient();

  async function markListened(id: string) {
    await supabase.from("voice_messages").update({ is_listened: true }).eq("id", id);
    setReceived((prev) => prev.map((m) => m.id === id ? { ...m, is_listened: true } : m));
  }

  const unreadCount = received.filter((m) => !m.is_listened).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {(["received", "sent", "new"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors capitalize ${tab === t ? "bg-accent text-white" : "bg-surface-raised text-muted hover:text-foreground border border-border"}`}>
            {t === "received" ? `Received ${unreadCount > 0 ? `(${unreadCount} new)` : ""}` : t === "sent" ? "Sent" : "New Message"}
          </button>
        ))}
      </div>

      {/* RECEIVED */}
      {tab === "received" && (
        <Card>
          <CardHeader><CardTitle>Received Messages</CardTitle></CardHeader>
          <CardContent>
            {received.length === 0 && (
              <p className="text-center text-sm text-muted py-8">No voice messages received yet</p>
            )}
            <div className="flex flex-col gap-3">
              {received.map((m) => (
                <div key={m.id} className={`flex items-center justify-between rounded-lg border p-4 ${!m.is_listened ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}>
                  <div>
                    <p className="text-sm font-medium">{m.sender?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted capitalize">{ROLE_LABELS[m.sender?.role as Role] ?? m.sender?.role}</p>
                    <p className="font-numeric text-xs text-muted mt-0.5">{format(new Date(m.created_at), "MMM d, HH:mm")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!m.is_listened && <span className="h-2 w-2 rounded-full bg-accent" />}
                    <VoicePlayer
                      filePath={m.file_path}
                      durationSeconds={m.duration_seconds}
                      onListened={() => markListened(m.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SENT */}
      {tab === "sent" && (
        <Card>
          <CardHeader><CardTitle>Sent Messages</CardTitle></CardHeader>
          <CardContent>
            {sent.length === 0 && (
              <p className="text-center text-sm text-muted py-8">No voice messages sent yet</p>
            )}
            <div className="flex flex-col gap-3">
              {sent.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
                  <div>
                    <p className="text-sm font-medium">To: {m.recipient?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted capitalize">{ROLE_LABELS[m.recipient?.role as Role] ?? m.recipient?.role}</p>
                    <p className="font-numeric text-xs text-muted mt-0.5">{format(new Date(m.created_at), "MMM d, HH:mm")}</p>
                    <p className="text-xs mt-0.5">{m.is_listened ? "✓ Listened" : "Not listened yet"}</p>
                  </div>
                  <VoicePlayer filePath={m.file_path} durationSeconds={m.duration_seconds} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* NEW MESSAGE */}
      {tab === "new" && (
        <Card>
          <CardHeader><CardTitle>Send Voice Message</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Send to</label>
              <select value={selectedRecipient} onChange={(e) => setSelectedRecipient(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                {allStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} — {ROLE_LABELS[s.role as Role] ?? s.role}</option>
                ))}
              </select>
            </div>
            <VoiceRecorder
              senderId={currentStaffId}
              propertyId={propertyId}
              recipientId={selectedRecipient}
              messageType="direct"
              label="Record your message"
              onSent={() => setTab("sent")}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}