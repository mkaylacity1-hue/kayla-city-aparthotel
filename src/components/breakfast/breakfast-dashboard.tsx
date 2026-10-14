"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { QrCode, Pencil, Plus, Trash2 } from "lucide-react";
import type { Role } from "@/lib/auth/roles";

interface Order {
  id: string; for_date: string; is_special: boolean; special_request: string | null;
  number_of_guests: number; total_fee_ghs: number; status: string;
  category?: { name: string } | null;
  unit?: { unit_number: string } | null;
}

interface Category { id: string; name: string; description: string | null; display_order: number; is_active: boolean; items: { id: string; name: string; display_order: number; is_active: boolean; }[]; }
interface SpecialConfig { id: string; fee_ghs: number; fee_usd: number; description: string | null; }

interface Props { orders: Order[]; categories: Category[]; specialConfig: SpecialConfig | null; currentRole: Role; propertyId: string; }

const STATUS_BADGE: Record<string, any> = { pending: "warning", confirmed: "default", prepared: "success", delivered: "muted" };
const STATUS_LABELS: Record<string, string> = { pending: "Pending", confirmed: "Confirmed", prepared: "Prepared", delivered: "Delivered" };
const canManage = (role: Role) => ["owner", "manager"].includes(role);

export function BreakfastDashboard({ orders: initial, categories: initCats, specialConfig: initConfig, currentRole, propertyId }: Props) {
  const [orders, setOrders] = useState(initial);
  const [categories, setCategories] = useState(initCats);
  const [specialConfig, setSpecialConfig] = useState(initConfig);
  const [tab, setTab] = useState<"orders" | "menu" | "qr">("orders");
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [editConfig, setEditConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ fee_ghs: initConfig?.fee_ghs?.toString() ?? "", fee_usd: initConfig?.fee_usd?.toString() ?? "", description: initConfig?.description ?? "" });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const todayOrders = orders.filter((o) => o.for_date === tomorrowStr);

  async function updateOrderStatus(id: string, status: string) {
    const { error } = await supabase.from("breakfast_orders").update({ status }).eq("id", id);
    if (error) { showToast("Failed to update", "error"); return; }
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    showToast("Order updated");
  }

  async function addItem(categoryId: string) {
    if (!newItemName.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("breakfast_items")
      .insert({ category_id: categoryId, name: newItemName.trim(), display_order: 99 })
      .select().single();
    setLoading(false);
    if (error) { showToast("Failed to add item", "error"); return; }
    setCategories((prev) => prev.map((c) => c.id === categoryId ? { ...c, items: [...c.items, data] } : c));
    setShowAddItem(null); setNewItemName("");
    showToast("Item added");
  }

  async function removeItem(categoryId: string, itemId: string) {
    const { error } = await supabase.from("breakfast_items").delete().eq("id", itemId);
    if (error) { showToast("Failed to remove item", "error"); return; }
    setCategories((prev) => prev.map((c) => c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c));
    showToast("Item removed");
  }

  async function saveSpecialConfig() {
    setLoading(true);
    const payload = { fee_ghs: parseFloat(configForm.fee_ghs), fee_usd: parseFloat(configForm.fee_usd), description: configForm.description, updated_at: new Date().toISOString() };
    const { error } = specialConfig
      ? await supabase.from("breakfast_special_config").update(payload).eq("id", specialConfig.id)
      : await supabase.from("breakfast_special_config").insert({ ...payload, property_id: propertyId });
    setLoading(false);
    if (error) { showToast("Failed to save", "error"); return; }
    setSpecialConfig((prev) => prev ? { ...prev, ...payload } : null);
    setEditConfig(false);
    showToast("Special breakfast config saved");
  }

  // Generate QR code URL for a unit/reservation
  function getQrUrl(unitId: string, reservationId: string) {
    return `${window.location.origin}/breakfast?unit=${unitId}&reservation=${reservationId}`;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {(["orders", "menu", "qr"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors capitalize ${tab === t ? "bg-accent text-white" : "bg-surface-raised text-muted hover:text-foreground border border-border"}`}>
            {t === "orders" ? `Tomorrow's Orders (${todayOrders.length})` : t === "menu" ? "Manage Menu" : "QR Codes"}
          </button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <Card>
          <CardHeader><CardTitle>Breakfast Orders for {tomorrowStr}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHead><tr>
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Guests</TableHeaderCell>
                <TableHeaderCell>Special Request</TableHeaderCell>
                <TableHeaderCell>Fee (GHS)</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                {canManage(currentRole) && <TableHeaderCell></TableHeaderCell>}
              </tr></TableHead>
              <TableBody>
                {todayOrders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted py-8">No orders for tomorrow yet</TableCell></TableRow>}
                {todayOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell numeric className="font-medium">{o.unit?.unit_number ?? "—"}</TableCell>
                    <TableCell>{o.is_special ? "⭐ Special" : o.category?.name ?? "—"}</TableCell>
                    <TableCell numeric>{o.number_of_guests}</TableCell>
                    <TableCell>{o.special_request ?? "—"}</TableCell>
                    <TableCell numeric>{o.total_fee_ghs > 0 ? o.total_fee_ghs.toFixed(2) : "—"}</TableCell>
                    <TableCell><Badge variant={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge></TableCell>
                    {canManage(currentRole) && (
                      <TableCell>
                        <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="h-8 rounded-md border border-border bg-surface-raised px-2 text-xs text-foreground focus:border-accent focus:outline-none">
                          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MENU TAB */}
      {tab === "menu" && (
        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader>
                <CardTitle>{cat.name}</CardTitle>
                {canManage(currentRole) && (
                  <Button size="sm" variant="secondary" onClick={() => setShowAddItem(cat.id)}><Plus size={14} /> Add Item</Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cat.items.sort((a, b) => a.display_order - b.display_order).map((item) => (
                    <div key={item.id} className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-sm">
                      {item.name}
                      {canManage(currentRole) && (
                        <button type="button" onClick={() => removeItem(cat.id, item.id)} className="ml-1 text-muted hover:text-danger text-xs">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Special breakfast config */}
          <Card>
            <CardHeader>
              <CardTitle>⭐ Special Breakfast Config</CardTitle>
              {canManage(currentRole) && <Button size="sm" variant="secondary" onClick={() => setEditConfig(true)}><Pencil size={14} /> Edit</Button>}
            </CardHeader>
            <CardContent className="text-sm flex flex-col gap-1">
              <p><span className="text-muted">Fee per person:</span> <span className="font-numeric">GHS {specialConfig?.fee_ghs ?? 0} / USD {specialConfig?.fee_usd ?? 0}</span></p>
              <p><span className="text-muted">Description:</span> {specialConfig?.description ?? "—"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR TAB */}
      {tab === "qr" && (
        <Card>
          <CardHeader><CardTitle>QR Code Generator</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted mb-4">Generate and print QR codes for each unit. Place them in the apartment so guests can scan and order breakfast.</p>
            <div className="rounded-md border border-border bg-surface p-4 text-sm">
              <p className="font-medium mb-2">How to generate a QR code:</p>
              <ol className="list-decimal list-inside flex flex-col gap-1 text-muted">
                <li>Create a reservation for the guest and check them in</li>
                <li>Copy the breakfast URL: <code className="font-numeric text-xs bg-surface-raised px-1 rounded">/breakfast?unit=[unit-id]&reservation=[reservation-id]</code></li>
                <li>Go to any free QR generator (e.g. qr-code-generator.com)</li>
                <li>Paste the URL and download the QR code</li>
                <li>Print and place in the apartment</li>
              </ol>
              <p className="mt-3 text-xs text-muted">Each QR code is unique to a guest's active reservation — it stops working when they check out.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item Dialog */}
      <Dialog open={!!showAddItem} onClose={() => setShowAddItem(null)} title="Add Menu Item">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Item Name</label>
            <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Avocado Toast" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddItem(null)}>Cancel</Button>
            <Button onClick={() => addItem(showAddItem!)} disabled={loading || !newItemName.trim()}>{loading ? "Adding…" : "Add Item"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Special Config Dialog */}
      <Dialog open={editConfig} onClose={() => setEditConfig(false)} title="Edit Special Breakfast Config">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Fee per person (GHS)</label>
              <Input type="number" value={configForm.fee_ghs} onChange={(e) => setConfigForm((f) => ({ ...f, fee_ghs: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Fee per person (USD)</label>
              <Input type="number" value={configForm.fee_usd} onChange={(e) => setConfigForm((f) => ({ ...f, fee_usd: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <Input value={configForm.description} onChange={(e) => setConfigForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditConfig(false)}>Cancel</Button>
            <Button onClick={saveSpecialConfig} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
