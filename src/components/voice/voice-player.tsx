"use client";

import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  filePath: string;
  durationSeconds?: number | null;
  onListened?: () => void;
}

export function VoicePlayer({ filePath, durationSeconds, onListened }: Props) {
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = createClient();

  async function loadAndPlay() {
    if (audioUrl) {
      togglePlay();
      return;
    }
    setLoading(true);
    const { data } = await supabase.storage
      .from("voice-messages")
      .createSignedUrl(filePath, 300);
    setLoading(false);
    if (!data?.signedUrl) return;
    setAudioUrl(data.signedUrl);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
        setPlaying(true);
        audioRef.current.onended = () => {
          setPlaying(false);
          onListened?.();
        };
      }
    }, 100);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      audioRef.current.onended = () => {
        setPlaying(false);
        onListened?.();
      };
    }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2">
      {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
      <button
        type="button"
        onClick={loadAndPlay}
        disabled={loading}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? (
          <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : playing ? (
          <Pause size={12} />
        ) : (
          <Play size={12} />
        )}
      </button>
      {durationSeconds && (
        <span className="font-numeric text-xs text-muted">
          {formatTime(durationSeconds)}
        </span>
      )}
    </div>
  );
}