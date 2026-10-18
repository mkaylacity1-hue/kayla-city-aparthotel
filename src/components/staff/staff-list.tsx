"use client";

import { useState } from "react";
import { Plus, Pencil, UserX, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface StaffMember {
  id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

interface Props {
  staff: StaffMember[];
  propertyId: string;
}

const EMPTY_FORM = { full_name: "", email: "", password: "", role: "receptionist" as Role };

export function StaffList({ staff: initial, propertyId }: Props) {
  const [staff, setStaff] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [toggleTarget, setToggleTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({ full_name: "", role: "receptionist" as Role });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  const filtered = staff.filter((s) => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "active" && s.is_active) ||
      (filter === "inactive" && !s.is_active) ||
      filter === s.role;
    return matchSearch && matchFilter;
  });

  async function handleCreate() {
    setLoading(true);
    try {
      // Create Supabase Auth user via admin API (needs service role — call a route handler)
      const res = await fetch("/api/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, property_id: propertyId }),
      });
      const data = await res.json();
if (!res.ok) throw new Error(data.error || "Failed to create staff");
setShowCreate(false);
setForm(EMPTY_FORM);
showToast("Staff member added successfully. They can now log in.");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    setLoading(true);
    const { error } = await supabase
      .from("staff")
      .update({ full_name: editForm.full_name, role: editForm.role })
      .eq("id", editTarget.id);
    setLoading(false);
    if (error) { showToast("Failed to update staff", "error"); return; }
    setStaff((prev) => prev.map((s) => s.id === editTarget.id ? { ...s, ...editForm } : s));
    setEditTarget(null);
    showToast("Staff updated");
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    setLoading(true);
    const next = !toggleTarget.is_active;
    const { error } = await supabase
      .from("staff")
      .update({ is_active: next })
      .eq("id", toggleTarget.id);
    setLoading(false);
    if (error) { showToast("Failed to update staff", "error"); return; }
    setStaff((prev) => prev.map((s) => s.id === toggleTarget.id ? { ...s, is_active: next } : s));
    setToggleTarget(null);
    showToast(`${toggleTarget.full_name} ${next ? "reactivated" : "deactivated"}`);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Staff ({staff.length})</CardTitle>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Staff
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search staff…"
            filterOptions={[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              ...ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r })),
            ]}
            activeFilter={filter}
            onFilterChange={setFilter}
          />
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Added</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted py-8">
                    No staff found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell><Badge variant="role">{ROLE_LABELS[s.role]}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "success" : "muted"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell numeric>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditTarget(s); setEditForm({ full_name: s.full_name, role: s.role }); }}
                        className="text-muted hover:text-accent"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToggleTarget(s)}
                        className={s.is_active ? "text-muted hover:text-danger" : "text-muted hover:text-success"}
                        title={s.is_active ? "Deactivate" : "Reactivate"}
                      >
                        {s.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Staff Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Add New Staff">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full Name</label>
            <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Ama Owusu" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="staff@email.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Temporary Password</label>
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="They can reset this later" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.full_name || !form.email || !form.password}>
              {loading ? "Creating…" : "Create Staff"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Staff">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full Name</label>
            <Input value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as Role }))}
              className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Deactivate/Reactivate Confirm */}
      <ConfirmDialog
        open={!!toggleTarget}
        onCancel={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={toggleTarget?.is_active ? "Deactivate Staff" : "Reactivate Staff"}
        description={
          toggleTarget?.is_active
            ? `${toggleTarget?.full_name} will lose access to the console immediately.`
            : `${toggleTarget?.full_name} will regain access to the console.`
        }
        confirmLabel={toggleTarget?.is_active ? "Deactivate" : "Reactivate"}
        destructive={toggleTarget?.is_active}
        isLoading={loading}
      />
    </>
  );
}
