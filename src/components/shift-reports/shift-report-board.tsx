"use client";

import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import { VoiceRecorder } from "@/components/voice/voice-recorder";

type Shift = "morning" | "afternoon" | "night";

interface Report {
  id: string; shift: Shift; report_date: string; notes: string; submitted_at: string;
  author?: { full_name: string; role: string } | null;
}

interface Props {
  reports: Report[]; currentStaffId: string; currentRole: Role;
  propertyId: string; staffName: string; viewAll: boolean;
}

const SHIFT_LABELS: Record<Shift, string> = { morning: "Morning", afternoon: "Afternoon", night: "Night" };
const SHIFT_BADGE: Record<Shift, "default" | "warning" | "muted"> = { morning: "default", afternoon: "warning", night: "muted" };

const EMPTY_FORM = { shift: "morning" as Shift, report_date: new Date().toISOString().split("T")[0], notes: "" };

export function ShiftReportBoard({ reports: initial, currentStaffId, currentRole, propertyId, staffName, viewAll }: Props) {
  const [reports, setReports] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  async function handleSubmit() {
    setLoading(true);
    const { data, error } = await supabase
      .from("shift_reports")
      .insert({ ...form, property_id: propertyId, staff_id: currentStaffId })
      .select("*, author:staff_id(full_name, role)").single();
    setLoading(false);
    if (error) { showToast("Failed to submit report", "error"); return; }
    setReports((prev) => [data, ...prev]);
    setShowCreate(false);
    setForm(EMPTY_FORM);
    showToast("Shift report submitted");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Shift Reports ({reports.length})</CardTitle>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Write Report
          </Button>
        </CardHeader>
        <CardContent>
          {reports.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted"><FileText size={20} /></div>
              <p className="font-heading text-sm font-semibold">No reports yet</p>
              <p className="text-sm text-muted">Submit your first shift report above.</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {reports.map((r) => (
              <div key={r.id} onClick={() => setViewReport(r)}
                className="cursor-pointer rounded-lg border border-border bg-surface p-4 hover:bg-surface-raised transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={SHIFT_BADGE[r.shift]}>{SHIFT_LABELS[r.shift]}</Badge>
                    <span className="font-numeric text-sm text-muted">{format(new Date(r.report_date), "MMM d, yyyy")}</span>
                  </div>
                  {viewAll && r.author && (
                    <span className="text-xs text-muted">{r.author.full_name} · {ROLE_LABELS[r.author.role as Role]}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground line-clamp-2">{r.notes}</p>
                <p className="mt-1 text-xs text-muted">Submitted {format(new Date(r.submitted_at), "HH:mm")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Write Report Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Write Shift Report">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Shift</label>
              <select value={form.shift} onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value as Shift }))}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                {(["morning", "afternoon", "night"] as Shift[]).map((s) => (
                  <option key={s} value={s}>{SHIFT_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Date</label>
              <input type="date" value={form.report_date} onChange={(e) => setForm((f) => ({ ...f, report_date: e.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Report Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={4}
              className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              placeholder="Describe what happened during your shift… (or use voice below)" />
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs text-muted mb-2">Or record a voice report:</p>
              <VoiceRecorder
                senderId={currentStaffId}
                propertyId={propertyId}
                messageType="shift_report"
                label=""
                onSent={() => showToast("Voice report saved")}
              />
            </div>
          </div>
          <p className="text-xs text-muted">Submitted by: <span className="text-foreground">{staffName}</span> · Reports cannot be edited after submission.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !form.notes.trim()}>{loading ? "Submitting…" : "Submit Report"}</Button>
          </div>
        </div>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={!!viewReport} onClose={() => setViewReport(null)} title="Shift Report">
        {viewReport && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={SHIFT_BADGE[viewReport.shift]}>{SHIFT_LABELS[viewReport.shift]}</Badge>
              <span className="font-numeric text-sm text-muted">{format(new Date(viewReport.report_date), "MMMM d, yyyy")}</span>
            </div>
            {viewAll && viewReport.author && (
              <p className="text-sm text-muted">By: <span className="text-foreground">{viewReport.author.full_name}</span> · {ROLE_LABELS[viewReport.author.role as Role]}</p>
            )}
            <div className="rounded-md border border-border bg-surface p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">{viewReport.notes}</p>
            </div>
            <p className="text-xs text-muted">Submitted at {format(new Date(viewReport.submitted_at), "HH:mm, MMM d yyyy")}</p>
          </div>
        )}
      </Dialog>
    </>
  );
}