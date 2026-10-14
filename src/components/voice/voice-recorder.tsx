"use client";

import { useState, useRef } from "react";
import { Mic, Square, Play, Pause, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Props {
  senderId: string;
  propertyId: string;
  recipientId?: string;
  shiftReportId?: string;
  messageType: "direct" | "shift_report";
  onSent?: () => void;
  label?: string;
}

export function VoiceRecorder({ senderId, propertyId, recipientId, shiftReportId, messageType, onSent, label }: Props) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [sending, setSending] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunks = useRef<Blob[]>([]);
  const { showToast } = useToast();
  const supabase = createClient();

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
      showToast("Could not access microphone. Please allow microphone access.", "error");
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
    if (!audioBlob) return;
    setSending(true);
    const fileName = `${senderId}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("voice-messages")
      .upload(fileName, audioBlob, { contentType: "audio/webm" });

    if (uploadError) { showToast("Failed to upload recording", "error"); setSending(false); return; }

    const { error: dbError } = await supabase.from("voice_messages").insert({
      property_id: propertyId,
      sender_id: senderId,
      recipient_id: recipientId ?? null,
      shift_report_id: shiftReportId ?? null,
      file_path: fileName,
      duration_seconds: duration,
      message_type: messageType,
    });

    if (dbError) { showToast("Failed to send message", "error"); setSending(false); return; }

    // Notify recipient
    if (recipientId) {
      await supabase.from("notifications").insert({
        recipient_id: recipientId,
        title: "New Voice Message",
        body: "You have received a new voice message.",
        link: "/dashboard/voice-messages",
      });
    }

    setSending(false);
    discard();
    showToast("Voice message sent!");
    onSent?.();
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-3">
      {label && <p className="text-sm font-medium">{label}</p>}

      {!audioBlob && (
        <div className="flex items-center gap-3">
          {!recording ? (
            <button type="button" onClick={startRecording}
              className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent transition-colors">
              <Mic size={16} className="text-accent" /> Start Recording
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">
                <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                Recording {formatTime(duration)}
              </div>
              <button type="button" onClick={stopRecording}
                className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-muted hover:text-foreground">
                <Square size={14} /> Stop
              </button>
            </div>
          )}
        </div>
      )}

      {audioUrl && audioBlob && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
          {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
          <button type="button" onClick={togglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:bg-accent/90">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium">Recording ready</p>
            <p className="font-numeric text-xs text-muted">{formatTime(duration)}</p>
          </div>
          <button type="button" onClick={discard} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
          <Button size="sm" onClick={handleSend} disabled={sending}>
            <Send size={13} /> {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      )}
    </div>
  );
}