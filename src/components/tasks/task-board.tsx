"use client";

import { useState } from "react";
import { Plus, AlertTriangle, Clock, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { canCreateTasks, canAssignTasks, canViewAllTasks, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import { VoiceRecorder } from "@/components/voice/voice-recorder";

interface Task {
  id: string; title: string; description: string | null;
  assigned_to: string | null; assigned_by: string | null;
  reassigned_from: string | null; is_urgent: boolean;
  deadline: string | null; status: string;
  created_at: string;
  assignee?: { full_name: string } | null;
  assigner?: { full_name: string } | null;
}

interface StaffMember { id: string; full_name: string; role: string; }

interface Props {
  tasks: Task[]; staff: StaffMember[];
  currentStaffId: string; currentRole: Role; propertyId: string;
}

const STATUS_BADGE: Record<string, "default" | "warning" | "success" | "muted" | "danger"> = {
  pending: "warning", in_progress: "default", done: "success", cancelled: "muted",
};

const EMPTY_FORM = { title: "", description: "", assigned_to: "", is_urgent: false, deadline: "" };

export function TaskBoard({ tasks: initial, staff, currentStaffId, currentRole, propertyId }: Props) {
  const [tasks, setTasks] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<Task | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  const visibleTasks = tasks.filter((t) => {
    const mine = canViewAllTasks(currentRole) || t.assigned_to === currentStaffId;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || t.status === filter || (filter === "urgent" && t.is_urgent);
    return mine && matchSearch && matchFilter;
  });

  async function handleCreate() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        property_id: propertyId,
        title: form.title,
        description: form.description || null,
        assigned_to: form.assigned_to || null,
        assigned_by: currentStaffId,
        is_urgent: form.is_urgent,
        deadline: form.deadline || null,
      })
      .select("*, assignee:assigned_to(full_name), assigner:assigned_by(full_name)")
      .single();
    setLoading(false);
    if (error) { showToast("Failed to create task", "error"); return; }
    setTasks((prev) => [data, ...prev]);
    setShowCreate(false);
    setForm(EMPTY_FORM);
    showToast("Task created");
  }

  async function handleStatusChange(task: Task, status: string) {
    const { error } = await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", task.id);
    if (error) { showToast("Failed to update task", "error"); return; }
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status } : t));
    showToast("Task updated");
  }

  async function handleReassign() {
    if (!reassignTarget || !reassignTo) return;
    setLoading(true);

    const { error } = await supabase.from("tasks").update({
      assigned_to: reassignTo,
      reassigned_from: currentStaffId,
      updated_at: new Date().toISOString(),
    }).eq("id", reassignTarget.id);

    if (error) { showToast("Failed to reassign task", "error"); setLoading(false); return; }

    if (reassignTarget.assigned_by) {
      const newAssignee = staff.find((s) => s.id === reassignTo);
      const me = staff.find((s) => s.id === currentStaffId);
      await supabase.from("notifications").insert({
        recipient_id: reassignTarget.assigned_by,
        title: "Task Reassigned",
        body: `"${reassignTarget.title}" was reassigned by ${me?.full_name ?? "a staff member"} to ${newAssignee?.full_name ?? "another staff member"}.`,
        link: "/dashboard/tasks",
      });
    }

    const newAssignee = staff.find((s) => s.id === reassignTo);
    setTasks((prev) => prev.map((t) => t.id === reassignTarget.id
      ? { ...t, assigned_to: reassignTo, reassigned_from: currentStaffId, assignee: newAssignee ? { full_name: newAssignee.full_name } : null }
      : t
    ));
    setReassignTarget(null);
    setReassignTo("");
    setLoading(false);
    showToast("Task reassigned");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({visibleTasks.length})</CardTitle>
          {canCreateTasks(currentRole) && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New Task
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SearchFilterBar
            searchValue={search} onSearchChange={setSearch}
            searchPlaceholder="Search tasks…"
            filterOptions={[
              { label: "All", value: "all" }, { label: "Urgent", value: "urgent" },
              { label: "Pending", value: "pending" }, { label: "In Progress", value: "in_progress" },
              { label: "Done", value: "done" }, { label: "Cancelled", value: "cancelled" },
            ]}
            activeFilter={filter} onFilterChange={setFilter}
          />
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Task</TableHeaderCell>
                <TableHeaderCell>Assigned To</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Deadline</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {visibleTasks.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted py-8">No tasks found</TableCell></TableRow>
              )}
              {visibleTasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {t.is_urgent && <AlertTriangle size={14} className="text-danger shrink-0" aria-label="Urgent" />}
                      <span className="font-medium">{t.title}</span>
                    </div>
                    {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
                    {t.reassigned_from && <p className="text-xs text-warning mt-0.5">Reassigned</p>}
                  </TableCell>
                  <TableCell>{t.assignee?.full_name ?? <span className="text-muted">Unassigned</span>}</TableCell>
                  <TableCell><Badge variant={STATUS_BADGE[t.status] ?? "muted"}>{t.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell numeric>
                    {t.deadline ? (
                      <span className="flex items-center gap-1"><Clock size={12} />{format(new Date(t.deadline), "MMM d, HH:mm")}</span>
                    ) : <span className="text-muted">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {t.assigned_to === currentStaffId && t.status !== "done" && t.status !== "cancelled" && (
                        <>
                          {t.status === "pending" && (
                            <button type="button" onClick={() => handleStatusChange(t, "in_progress")} className="text-xs text-accent hover:underline">Start</button>
                          )}
                          {t.status === "in_progress" && (
                            <button type="button" onClick={() => handleStatusChange(t, "done")} className="text-xs text-success hover:underline">Mark Done</button>
                          )}
                          <button type="button" onClick={() => { setReassignTarget(t); setReassignTo(""); }} className="text-muted hover:text-accent" aria-label="Reassign">
                            <RotateCcw size={13} />
                          </button>
                        </>
                      )}
                      {canViewAllTasks(currentRole) && t.status !== "done" && t.status !== "cancelled" && (
                        <button type="button" onClick={() => handleStatusChange(t, "cancelled")} className="text-xs text-muted hover:text-danger">Cancel</button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Title</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Task title" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="h-20 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              placeholder="Add details…" />
          </div>
          {canAssignTasks(currentRole) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Assign To</label>
              <select value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({ROLE_LABELS[s.role as Role]})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Deadline (optional)</label>
            <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_urgent} onChange={(e) => setForm((f) => ({ ...f, is_urgent: e.target.checked }))} className="accent-accent" />
            Mark as urgent
          </label>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.title}>{loading ? "Creating…" : "Create Task"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={!!reassignTarget} onClose={() => setReassignTarget(null)} title="Reassign Task">
        <p className="text-sm text-muted mb-4">Reassigning: <span className="text-foreground font-medium">{reassignTarget?.title}</span></p>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Assign To</label>
          <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="">Select staff…</option>
            {staff.filter((s) => s.id !== currentStaffId).map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} ({ROLE_LABELS[s.role as Role]})</option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-muted">The original assigner will be notified of this change.</p>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs text-muted mb-2">Or leave a voice note with this task:</p>
          <VoiceRecorder
            senderId={currentStaffId}
            propertyId={propertyId}
            messageType="shift_report"
            label=""
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setReassignTarget(null)}>Cancel</Button>
          <Button onClick={handleReassign} disabled={loading || !reassignTo}>{loading ? "Reassigning…" : "Reassign"}</Button>
        </div>
      </Dialog>
    </>
  );
}