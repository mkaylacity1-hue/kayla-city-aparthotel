"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface Reminder {
  id: string;
  title: string;
  reminder_type: string;
  event_date: string;
  repeat_yearly: boolean;
  note: string | null;
  related_to: string | null;
}

interface Props {
  reminders: Reminder[];
  propertyId: string;
  currentStaffId: string;
}

const TYPES = [
  { value: "Birthday", icon: "🎂", yearly: true },
  { value: "Anniversary", icon: "💍", yearly: true },
  { value: "Celebration", icon: "🎉", yearly: false },
  { value: "Event", icon: "📅", yearly: false },
  { value: "Other", icon: "🔔", yearly: false },
];

const EMPTY = { title: "", reminder_type: "Birthday", event_date: "", note: "", related_to: "" };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextDate(r: Reminder) {
  const ev = new Date(r.event_date + "T00:00:00");
  if (!r.repeat_yearly) return ev;
  const today = startOfToday();
  let next = new Date(today.getFullYear(), ev.getMonth(), ev.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, ev.getMonth(), ev.getDate());
  return next;
}

function whenLabel(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function RemindersBoard({ reminders: initial, propertyId, currentStaffId }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  const today = startOfToday();
  const withDays = reminders.map((r) => {
    const next = nextDate(r);
    return { r, next, days: differenceInCalendarDays(next, today) };
  });
  const upcoming = withDays.filter((x) => x.days >= 0).sort((a, b) => a.days - b.days);
  const past = withDays.filter((x) => x.days < 0).sort((a, b) => b.days - a.days);

  const typeInfo = TYPES.find((t) => t.value === form.reminder_type) ?? TYPES[0];
  const iconFor = (type: string) => TYPES.find((t) => t.value === type)?.icon ?? "🔔";

  async function handleAdd() {
    if (!form.title.trim() || !form.event_date) {
      showToast("Please enter a title and a date", "error");
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase.from("reminders") as any)
      .insert({
        property_id: propertyId,
        title: form.title.trim(),
        reminder_type: form.reminder_type,
        event_date: form.event_date,
        repeat_yearly: typeInfo.yearly,
        note: form.note.trim() || null,
        related_to: form.related_to.trim() || null,
        created_by: currentStaffId,
      })
      .select()
      .single();
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setReminders((prev) => [data, ...prev]);
    setShowAdd(false);
    setForm(EMPTY);
    showToast("Reminder saved");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    const { error } = await (supabase.from("reminders") as any).delete().eq("id", deleteTarget.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setReminders((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast("Reminder deleted");
  }

  function Row({ item, muted }: { item: { r: Reminder; next: Date; days: number }; muted?: boolean }) {
    const { r, next, days } = item;
    const soon = days >= 0 && days <= 7;
    return (
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${soon ? "border-accent bg-accent/10" : "border-border bg-surface"} ${muted ? "opacity-60" : ""}`}>
        <span className="text-2xl leading-none">{iconFor(r.reminder_type)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{r.title}</p>
          <p className="text-xs text-muted">
            {r.reminder_type}
            {r.related_to ? ` • ${r.related_to}` : ""}
            {r.repeat_yearly ? " • Every year" : ""}
          </p>
          {r.note && <p className="mt-1 text-xs text-muted">{r.note}</p>}
        </div>
        <div className="text-right">
          <p className={`text-xs font-bold ${soon ? "text-accent" : "text-muted"}`}>
            {days >= 0 ? whenLabel(days) : "Past"}
          </p>
          <p className="font-numeric text-xs text-muted">{format(next, "d MMM yyyy")}</p>
        </div>
        <button type="button" onClick={() => setDeleteTarget(r)} className="text-muted hover:text-danger" aria-label="Delete reminder">
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming ({upcoming.length})</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Reminder
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {upcoming.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No reminders yet. Tap Add Reminder to save a birthday or event.</p>
          )}
          {upcoming.map((x) => <Row key={x.r.id} item={x} />)}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Past events ({past.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {past.map((x) => <Row key={x.r.id} item={x} muted />)}
          </CardContent>
        </Card>
      )}

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Reminder">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Type</label>
            <select value={form.reminder_type} onChange={(e) => setForm((f) => ({ ...f, reminder_type: e.target.value }))} className={selectClass}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.value}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted">
              {typeInfo.yearly ? "This repeats every year." : "This happens once."}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Title *</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Mr. Mensah's birthday" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Date *</label>
            <Input type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Guest or room (optional)</label>
            <Input value={form.related_to} onChange={(e) => setForm((f) => ({ ...f, related_to: e.target.value }))} placeholder="e.g. Unit 102 or guest name" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Note (optional)</label>
            <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Prepare a cake and flowers" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading}>{loading ? "Saving…" : "Save Reminder"}</Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Reminder"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isLoading={loading}
      />
    </>
  );
}