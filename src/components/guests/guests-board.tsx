"use client";

import { useState } from "react";
import { Plus, Pencil, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useToast } from "@/components/ui/toast";

interface Guest { id: string; full_name: string; phone: string | null; email: string | null; id_document_type: string | null; id_document_number: string | null; notes: string | null; created_at: string; }

interface Props { guests: Guest[]; propertyId: string; }

const EMPTY_FORM = { full_name: "", phone: "", email: "", id_document_type: "", id_document_number: "", notes: "" };

export function GuestsBoard({ guests: initial, propertyId }: Props) {
  const [guests, setGuests] = useState(initial);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Guest | null>(null);
  const [viewTarget, setViewTarget] = useState<Guest | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  const filtered = guests.filter((g) =>
    g.full_name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search) || g.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    setLoading(true);
    const { data, error } = await supabase.from("guests")
      .insert({ ...form, property_id: propertyId, phone: form.phone || null, email: form.email || null, id_document_type: form.id_document_type || null, id_document_number: form.id_document_number || null, notes: form.notes || null })
      .select().single();
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setGuests((prev) => [data, ...prev]);
    setShowCreate(false); setForm(EMPTY_FORM);
    showToast("Guest registered");
  }

  async function handleEdit() {
    if (!editTarget) return;
    setLoading(true);
    const { error } = await supabase.from("guests").update({ ...editForm, phone: editForm.phone || null, email: editForm.email || null, id_document_type: editForm.id_document_type || null, id_document_number: editForm.id_document_number || null, notes: editForm.notes || null }).eq("id", editTarget.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setGuests((prev) => prev.map((g) => g.id === editTarget.id ? { ...g, ...editForm } : g));
    setEditTarget(null);
    showToast("Guest updated");
  }

  const GuestForm = ({ values, onChange }: { values: any; onChange: (f: any) => void }) => (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Full Name *</label>
        <Input value={values.full_name} onChange={(e) => onChange((f: any) => ({ ...f, full_name: e.target.value }))} placeholder="Guest full name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Phone</label>
          <Input value={values.phone} onChange={(e) => onChange((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+233..." />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <Input type="email" value={values.email} onChange={(e) => onChange((f: any) => ({ ...f, email: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">ID Type</label>
          <select value={values.id_document_type} onChange={(e) => onChange((f: any) => ({ ...f, id_document_type: e.target.value }))}
            className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="">Select type…</option>
            <option value="National ID">National ID</option>
            <option value="Passport">Passport</option>
            <option value="Voters ID">Voters ID</option>
            <option value="Drivers License">Driver's License</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">ID Number</label>
          <Input value={values.id_document_number} onChange={(e) => onChange((f: any) => ({ ...f, id_document_number: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Notes</label>
        <textarea value={values.notes} onChange={(e) => onChange((f: any) => ({ ...f, notes: e.target.value }))}
          className="h-16 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          placeholder="Any notes about this guest" />
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Guests ({guests.length})</CardTitle>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Register Guest</Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by name, phone, email…" />
          <Table>
            <TableHead><tr>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>ID Type</TableHeaderCell>
              <TableHeaderCell>Registered</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr></TableHead>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted py-8">No guests found</TableCell></TableRow>}
              {filtered.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.full_name}</TableCell>
                  <TableCell numeric>{g.phone ?? "—"}</TableCell>
                  <TableCell>{g.email ?? "—"}</TableCell>
                  <TableCell>{g.id_document_type ?? "—"}</TableCell>
                  <TableCell numeric>{new Date(g.created_at).toISOString().split("T")[0]}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setViewTarget(g)} className="text-muted hover:text-accent"><Eye size={14} /></button>
                      <button type="button" onClick={() => { setEditTarget(g); setEditForm({ full_name: g.full_name, phone: g.phone ?? "", email: g.email ?? "", id_document_type: g.id_document_type ?? "", id_document_number: g.id_document_number ?? "", notes: g.notes ?? "" }); }} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Register Guest">
        <GuestForm values={form} onChange={setForm} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !form.full_name}>{loading ? "Registering…" : "Register Guest"}</Button>
        </div>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Guest">
        <GuestForm values={editForm} onChange={setEditForm} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button onClick={handleEdit} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
        </div>
      </Dialog>

      <Dialog open={!!viewTarget} onClose={() => setViewTarget(null)} title="Guest Details">
        {viewTarget && (
          <div className="flex flex-col gap-3 text-sm">
            <div><span className="text-muted">Name:</span> <span className="font-medium">{viewTarget.full_name}</span></div>
            <div><span className="text-muted">Phone:</span> {viewTarget.phone ?? "—"}</div>
            <div><span className="text-muted">Email:</span> {viewTarget.email ?? "—"}</div>
            <div><span className="text-muted">ID Type:</span> {viewTarget.id_document_type ?? "—"}</div>
            <div><span className="text-muted">ID Number:</span> <span className="font-numeric">{viewTarget.id_document_number ?? "—"}</span></div>
            {viewTarget.notes && <div><span className="text-muted">Notes:</span> {viewTarget.notes}</div>}
            <div><span className="text-muted">Registered:</span> <span className="font-numeric">{new Date(viewTarget.created_at).toISOString().split("T")[0]}</span></div>
          </div>
        )}
      </Dialog>
    </>
  );
}
