"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useToast } from "@/components/ui/toast";
import type { Role } from "@/lib/auth/roles";

interface UnitType { id: string; name: string; base_price_ghs: number; base_price_usd: number; }
interface Unit { id: string; unit_number: string; unit_type_id: string; status: string; floor: string | null; notes: string | null; price_override_ghs: number | null; price_override_usd: number | null; unit_type?: { name: string } | null; }

interface Props { units: Unit[]; unitTypes: UnitType[]; propertyId: string; currentRole: Role; }

const STATUS_BADGE: Record<string, any> = {
  available: "success", occupied: "danger", cleaning: "warning", cleaned: "default", maintenance: "muted",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  cleaning: "Cleaning",
  cleaned: "Cleaned — Pending Inspection",
  maintenance: "Maintenance",
};

const EMPTY_FORM = { unit_number: "", unit_type_id: "", floor: "", notes: "", price_override_ghs: "", price_override_usd: "" };

export function UnitsBoard({ units: initial, unitTypes, propertyId, currentRole }: Props) {
  const [units, setUnits] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Unit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, unit_type_id: unitTypes[0]?.id ?? "" });
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();
  const canManage = ["owner", "manager", "receptionist"].includes(currentRole);

  const filtered = units.filter((u) => {
    const matchSearch = u.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      u.unit_type?.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || u.status === filter || u.unit_type?.name === filter;
    return matchSearch && matchFilter;
  });

  async function handleCreate() {
    setLoading(true);
    const { data, error } = await supabase.from("units")
      .insert({
        property_id: propertyId,
        unit_number: form.unit_number,
        unit_type_id: form.unit_type_id,
        floor: form.floor || null,
        notes: form.notes || null,
        price_override_ghs: form.price_override_ghs ? parseFloat(form.price_override_ghs) : null,
        price_override_usd: form.price_override_usd ? parseFloat(form.price_override_usd) : null,
      })
      .select("*, unit_type:unit_type_id(name)").single();
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setUnits((prev) => [data, ...prev]);
    setShowCreate(false);
    setForm({ ...EMPTY_FORM, unit_type_id: unitTypes[0]?.id ?? "" });
    showToast("Unit added");
  }

  async function handleEdit() {
    if (!editTarget) return;
    setLoading(true);
    const { error } = await supabase.from("units").update({
      unit_number: editForm.unit_number,
      unit_type_id: editForm.unit_type_id,
      floor: editForm.floor || null,
      notes: editForm.notes || null,
      price_override_ghs: editForm.price_override_ghs ? parseFloat(editForm.price_override_ghs) : null,
      price_override_usd: editForm.price_override_usd ? parseFloat(editForm.price_override_usd) : null,
    }).eq("id", editTarget.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setUnits((prev) => prev.map((u) => u.id === editTarget.id ? { ...u, ...editForm, price_override_ghs: editForm.price_override_ghs ? parseFloat(editForm.price_override_ghs) : null, price_override_usd: editForm.price_override_usd ? parseFloat(editForm.price_override_usd) : null } : u));
    setEditTarget(null);
    showToast("Unit updated");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    const { error } = await supabase.from("units").delete().eq("id", deleteTarget.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setUnits((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast("Unit removed");
  }

  async function handleStatusChange(unit: Unit, status: string) {
    const { error } = await supabase.from("units").update({ status }).eq("id", unit.id);
    if (error) { showToast(error.message, "error"); return; }
    setUnits((prev) => prev.map((u) => u.id === unit.id ? { ...u, status } : u));
    showToast("Status updated");
  }

  const UnitForm = ({ values, onChange }: { values: any; onChange: (f: any) => void }) => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Unit Number *</label>
          <Input value={values.unit_number} onChange={(e) => onChange((f: any) => ({ ...f, unit_number: e.target.value }))} placeholder="e.g. A101" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Floor</label>
          <Input value={values.floor} onChange={(e) => onChange((f: any) => ({ ...f, floor: e.target.value }))} placeholder="e.g. 1st" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Unit Type *</label>
        <select value={values.unit_type_id} onChange={(e) => onChange((f: any) => ({ ...f, unit_type_id: e.target.value }))}
          className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
          {unitTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Price Override (GHS)</label>
          <Input type="number" value={values.price_override_ghs} onChange={(e) => onChange((f: any) => ({ ...f, price_override_ghs: e.target.value }))} placeholder="Leave blank to use type price" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Price Override (USD)</label>
          <Input type="number" value={values.price_override_usd} onChange={(e) => onChange((f: any) => ({ ...f, price_override_usd: e.target.value }))} placeholder="Leave blank to use type price" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Notes</label>
        <Input value={values.notes} onChange={(e) => onChange((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this unit" />
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Units ({units.length})</CardTitle>
          {canManage && <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Add Unit</Button>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SearchFilterBar
            searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search units…"
            filterOptions={[
              { label: "All", value: "all" },
              ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ label: l, value: v })),
              ...unitTypes.map((t) => ({ label: t.name, value: t.name })),
            ]}
            activeFilter={filter} onFilterChange={setFilter}
          />
          <Table>
            <TableHead><tr>
              <TableHeaderCell>Unit</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Floor</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Price (GHS)</TableHeaderCell>
              <TableHeaderCell>Price (USD)</TableHeaderCell>
              {canManage && <TableHeaderCell></TableHeaderCell>}
            </tr></TableHead>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted py-8">No units found</TableCell></TableRow>}
              {filtered.map((u) => {
                const type = unitTypes.find((t) => t.id === u.unit_type_id);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-numeric font-medium">{u.unit_number}</TableCell>
                    <TableCell>{u.unit_type?.name ?? type?.name ?? "—"}</TableCell>
                    <TableCell>{u.floor ?? "—"}</TableCell>
                    <TableCell><Badge variant={STATUS_BADGE[u.status]}>{STATUS_LABELS[u.status]}</Badge></TableCell>
                    <TableCell numeric>{u.price_override_ghs ?? type?.base_price_ghs ?? "—"}</TableCell>
                    <TableCell numeric>{u.price_override_usd ?? type?.base_price_usd ?? "—"}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
                          {u.status === "cleaning" && currentRole === "housekeeping" && (
                            <button type="button" onClick={() => handleStatusChange(u, "cleaned")} className="text-xs text-accent hover:underline">Mark Cleaned</button>
                          )}
                          {u.status === "cleaned" && ["owner", "manager"].includes(currentRole) && (
                            <button type="button" onClick={() => handleStatusChange(u, "available")} className="text-xs text-success hover:underline">Confirm Inspection ✓</button>
                          )}
                          {["owner", "manager"].includes(currentRole) && (
                            <>
                              <button type="button" onClick={() => { setEditTarget(u); setEditForm({ unit_number: u.unit_number, unit_type_id: u.unit_type_id, floor: u.floor ?? "", notes: u.notes ?? "", price_override_ghs: u.price_override_ghs?.toString() ?? "", price_override_usd: u.price_override_usd?.toString() ?? "" }); }} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                              <button type="button" onClick={() => setDeleteTarget(u)} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Add New Unit">
        <UnitForm values={form} onChange={setForm} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !form.unit_number || !form.unit_type_id}>{loading ? "Adding…" : "Add Unit"}</Button>
        </div>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Unit">
        <UnitForm values={editForm} onChange={setEditForm} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button onClick={handleEdit} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Remove Unit" description={`Remove unit ${deleteTarget?.unit_number}? This cannot be undone.`}
        confirmLabel="Remove" destructive isLoading={loading}
      />
    </>
  );
}