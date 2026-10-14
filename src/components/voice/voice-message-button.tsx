"use client";

import { useState, useRef } from "react";
import { Mic, X, Send, Play, Pause, Trash2, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

interface StaffMember { id: string; full_name: string; role: string; }

interface Props {
  currentStaffId: string;
  propertyId: string;
  allStaff: StaffMember[];
}

export function VoiceMessageButton({ currentStaffId, propertyId, allStaff }: Props) {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recipientId, setRecipientId] = useState(allStaff[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunks = useRef<Blob[]>([]);
  const { showToast } = useToast();
  const supabase = createClient();

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      showToast("Could not access microphone", "error");
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      audioRef.current.onended = () => setPlaying(false);
    }
  }

  function discard() {
    setAudioBlob(null);
    setAudioUrl(null);
    setPlaying(false);
    setDuration(0);
  }

  async function handleSend() {
    if (!audioBlob || !recipientId) return;
    setSending(true);
    const fileName = `${currentStaffId}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("voice-messages")
      .upload(fileName, audioBlob, { contentType: "audio/webm" });
    if (uploadError) { showToast("Failed to upload", "error"); setSending(false); return; }

    await supabase.from("voice_messages").insert({
      property_id: propertyId,
      sender_id: currentStaffId,
      recipient_id: recipientId,
      file_path: fileName,
      duration_seconds: duration,
      message_type: "direct",
    });

    await supabase.from("notifications").insert({
      recipient_id: recipientId,
      title: "New Voice Message",
      body: "You have received a new voice message.",
      link: "/dashboard/voice-messages",
    });

    setSending(false);
    discard();
    setOpen(false);
    showToast("Voice message sent!");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Voice messages"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-raised hover:text-accent"
      >
        <Mic size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-border bg-surface-raised shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-heading text-sm font-semibold">Send Voice Message</p>
            <button type="button" onClick={() => { setOpen(false); discard(); }} className="text-muted hover:text-foreground"><X size={14} /></button>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Send to</label>
              <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                {allStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} — {ROLE_LABELS[s.role as Role] ?? s.role}</option>
                ))}
              </select>
            </div>

            {!audioBlob ? (
              <div className="flex items-center justify-center py-4">
                {!recording ? (
                  <button type="button" onClick={startRecording}
                    className="flex flex-col items-center gap-2 rounded-full p-6 border-2 border-dashed border-border hover:border-accent hover:text-accent text-muted transition-colors">
                    <Mic size={28} />
                    <span className="text-xs">Tap to record</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <button type="button" onClick={stopRecording}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white hover:bg-danger/90">
                      <Square size={20} />
                    </button>
                    <div className="flex items-center gap-2 text-danger text-sm">
                      <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                      {formatTime(duration)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
                  {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
                  <button type="button" onClick={togglePlay}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white">
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Ready to send</p>
                    <p className="font-numeric text-xs text-muted">{formatTime(duration)}</p>
                  </div>
                  <button type="button" onClick={discard} className="text-muted hover:text-danger"><Trash2 size={13} /></button>
                </div>
                <Button onClick={handleSend} disabled={sending || !recipientId} className="w-full">
                  <Send size={13} /> {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}