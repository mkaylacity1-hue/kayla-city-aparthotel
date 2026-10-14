"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export function NotificationBell({ staffId }: { staffId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function fetchNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", staffId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data);
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", staffId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  useEffect(() => {
    fetchNotifications();

    // Real-time: listen for new notifications for this staff member
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${staffId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [staffId]);

  // Close panel when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-raised"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-border bg-surface-raised shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-heading text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted hover:text-accent"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted">
                No notifications yet
              </li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "cursor-pointer px-4 py-3 hover:bg-surface transition-colors",
                  !n.is_read && "border-l-2 border-accent"
                )}
              >
                <p className={cn("text-sm font-medium", !n.is_read ? "text-foreground" : "text-muted")}>
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
