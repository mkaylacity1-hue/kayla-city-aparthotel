"use client";

import { useState } from "react";
import { Plus, Pencil, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import type { Role } from "@/lib/auth/roles";

interface Category { id: string; name: string; display_order: number; }
interface BarItem { id: string; name: string; category_id: string; price_ghs: number; price_usd: number; is_available: boolean; category?: { name: string } | null; }
interface BarOrder { id: string; quantity: number; unit_price_ghs: number; total_ghs: number; currency: string; status: string; ordered_at: string; notes: string | null; is_qr_order: boolean; item?: { name: string } | null; unit?: { unit_number: string } | null; recorder?: { full_name: string } | null; }
interface Reservation { id: string; unit_id: string; guest?: { full_name: string } | null; unit?: { unit_number: string } | null; }

interface Props {
  categories: Category[]; items: BarItem[]; orders: BarOrder[];
  activeReservations: Reservation[]; propertyId: string;
  currentStaffId: string; currentRole: Role;
}

const STATUS_BADGE: Record<string, any> = { pending: "warning", confirmed: "default", delivered: "success", cancelled: "muted" };
const STATUS_LABELS: Record<string, string> = { pending: "Pending", confirmed: "Confirmed", delivered: "Delivered", cancelled: "Cancelled" };

const EMPTY_ITEM_FORM = { name: "", category_id: "", price_ghs: "", price_usd: "", description: "" };
const EMPTY_ORDER_FORM = { bar_item_id: "", reservation_id: "", quantity: "1", currency: "GHS", notes: "" };

export function BarBoard({ categories, items: initItems, orders: initOrders, activeReservations, propertyId, currentStaffId, currentRole }: Props) {
  const [items, setItems] = useState(initItems);
  const [orders, setOrders] = useState(initOrders);
  const [tab, setTab] = useState<"menu" | "orders" | "new_order">("orders");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<BarItem | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [editForm, setEditForm] = useState(EMPTY_ITEM_FORM);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();
  const canManage = ["owner", "manager"].includes(currentRole);

  const filteredOrders = orders.filter((o) => {
    const matchSearch = o.item?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.unit?.unit_number?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.status === filter;
    return matchSearch && matchFilter;
  });

  const selectedItem = items.find((i) => i.id === orderForm.bar_item_id);
  const quantity = parseInt(orderForm.quantity || "1");
  const totalGhs = selectedItem ? selectedItem.price_ghs * quantity : 0;
  const totalUsd = selectedItem ? selectedItem.price_usd * quantity : 0;

  async function handleAddItem() {
    setLoading(true);
    const { data, error } = await supabase.from("bar_items").insert({
      property_id: propertyId,
      category_id: itemForm.category_id,
      name: itemForm.name,
      price_ghs: parseFloat(itemForm.price_ghs || "0"),
      price_usd: parseFloat(itemForm.price_usd || "0"),
      description: itemForm.description || null,
    }).select("*, category:category_id(name)").single();
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setItems((prev) => [...prev, data]);
    setShowAddItem(false);
    setItemForm(EMPTY_ITEM_FORM);
    showToast("Drink added to menu");
  }

  async function handleEditItem() {
    if (!editItem) return;
    setLoading(true);
    const { error } = await supabase.from("bar_items").update({
      name: editForm.name,
      category_id: editForm.category_id,
      price_ghs: parseFloat(editForm.price_ghs || "0"),
      price_usd: parseFloat(editForm.price_usd || "0"),
    }).eq("id", editItem.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...i, ...editForm, price_ghs: parseFloat(editForm.price_ghs), price_usd: parseFloat(editForm.price_usd) } : i));
    setEditItem(null);
    showToast("Item updated");
  }

  async function toggleAvailability(item: BarItem) {
    const { error } = await supabase.from("bar_items").update({ is_available: !item.is_available }).eq("id", item.id);
    if (error) { showToast(error.message, "error"); return; }
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    showToast(item.is_available ? "Item marked unavailable" : "Item marked available");
  }

  async function handleNewOrder() {
    if (!selectedItem) return;
    setLoading(true);
    const reservation = activeReservations.find((r) => r.id === orderForm.reservation_id);
    const { data, error } = await supabase.from("bar_orders").insert({
      property_id: propertyId,
      reservation_id: orderForm.reservation_id || null,
      unit_id: reservation?.unit_id ?? null,
      bar_item_id: orderForm.bar_item_id,
      quantity,
      unit_price_ghs: selectedItem.price_ghs,
      unit_price_usd: selectedItem.price_usd,
      currency: orderForm.currency,
      total_ghs: totalGhs,
      total_usd: totalUsd,
      notes: orderForm.notes || null,
      recorded_by: currentStaffId,
      is_qr_order: false,
      status: "confirmed",
    }).select("*, item:bar_item_id(name, price_ghs, price_usd), unit:unit_id(unit_number), recorder:recorded_by(full_name)").single();
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setOrders((prev) => [data, ...prev]);
    setOrderForm(EMPTY_ORDER_FORM);
    setTab("orders");
    showToast("Order recorded");
  }

  async function updateOrderStatus(id: string, status: string) {
    const { error } = await supabase.from("bar_orders").update({ status }).eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    showToast("Order updated");
  }

  const ItemForm = ({ values, onChange }: { values: any; onChange: (f: any) => void }) => (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Name *</label>
        <Input value={values.name} onChange={(e) => onChange((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Coca-Cola" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Category *</label>
        <select value={values.category_id} onChange={(e) => onChange((f: any) => ({ ...f, category_id: e.target.value }))}
          className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
          <option value="">Select category…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Price (GHS)</label>
          <Input type="number" value={values.price_ghs} onChange={(e) => onChange((f: any) => ({ ...f, price_ghs: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Price (USD)</label>
          <Input type="number" value={values.price_usd} onChange={(e) => onChange((f: any) => ({ ...f, price_usd: e.target.value }))} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {([["orders", "Today's Orders"], ["menu", "Menu Management"], ["new_order", "Record Order"]] as const).map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "bg-accent text-white" : "bg-surface-raised text-muted hover:text-foreground border border-border"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <Card>
          <CardHeader>
            <CardTitle>Bar Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SearchFilterBar
              searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by drink or unit…"
              filterOptions={[
                { label: "All", value: "all" },
                ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ label: l, value: v })),
              ]}
              activeFilter={filter} onFilterChange={setFilter}
            />
            <Table>
              <TableHead><tr>
                <TableHeaderCell>Drink</TableHeaderCell>
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
                <TableHeaderCell>Total (GHS)</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Recorded By</TableHeaderCell>
                <TableHeaderCell>Time</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </tr></TableHead>
              <TableBody>
                {filteredOrders.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted py-8">No orders yet</TableCell></TableRow>}
                {filteredOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.item?.name ?? "—"}</TableCell>
                    <TableCell numeric>{o.unit?.unit_number ?? "—"}</TableCell>
                    <TableCell numeric>{o.quantity}</TableCell>
                    <TableCell numeric>{o.total_ghs.toFixed(2)}</TableCell>
                    <TableCell><Badge variant={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge></TableCell>
                    <TableCell>{o.recorder?.full_name ?? (o.is_qr_order ? "QR Order" : "—")}</TableCell>
                    <TableCell numeric>{format(new Date(o.ordered_at), "HH:mm")}</TableCell>
                    <TableCell>
                      {o.status === "confirmed" && (
                        <button type="button" onClick={() => updateOrderStatus(o.id, "delivered")} className="text-xs text-success hover:underline">Mark Delivered</button>
                      )}
                      {o.status === "pending" && (
                        <button type="button" onClick={() => updateOrderStatus(o.id, "confirmed")} className="text-xs text-accent hover:underline">Confirm</button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MENU TAB */}
      {tab === "menu" && (
        <Card>
          <CardHeader>
            <CardTitle>Bar Menu ({items.length} drinks)</CardTitle>
            {canManage && <Button size="sm" onClick={() => setShowAddItem(true)}><Plus size={14} /> Add Drink</Button>}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead><tr>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Price (GHS)</TableHeaderCell>
                <TableHeaderCell>Price (USD)</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                {canManage && <TableHeaderCell></TableHeaderCell>}
              </tr></TableHead>
              <TableBody>
                {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted py-8">No drinks on menu yet</TableCell></TableRow>}
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category?.name ?? "—"}</TableCell>
                    <TableCell numeric>{item.price_ghs.toFixed(2)}</TableCell>
                    <TableCell numeric>{item.price_usd.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_available ? "success" : "muted"}>
                        {item.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => toggleAvailability(item)} className="text-xs text-muted hover:text-accent">
                            {item.is_available ? "Mark Unavailable" : "Mark Available"}
                          </button>
                          <button type="button" onClick={() => { setEditItem(item); setEditForm({ name: item.name, category_id: item.category_id, price_ghs: item.price_ghs.toString(), price_usd: item.price_usd.toString(), description: "" }); }} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* NEW ORDER TAB */}
      {tab === "new_order" && (
        <Card>
          <CardHeader><CardTitle>Record Bar Order</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Drink *</label>
              <select value={orderForm.bar_item_id} onChange={(e) => setOrderForm((f) => ({ ...f, bar_item_id: e.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">Select drink…</option>
                {categories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    {items.filter((i) => i.category_id === cat.id && i.is_available).map((i) => (
                      <option key={i.id} value={i.id}>{i.name} — GHS {i.price_ghs.toFixed(2)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Room / Guest (optional)</label>
              <select value={orderForm.reservation_id} onChange={(e) => setOrderForm((f) => ({ ...f, reservation_id: e.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">Walk-in / No room</option>
                {activeReservations.map((r) => (
                  <option key={r.id} value={r.id}>Unit {r.unit?.unit_number} — {r.guest?.full_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Quantity</label>
                <Input type="number" min="1" value={orderForm.quantity} onChange={(e) => setOrderForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Currency</label>
                <select value={orderForm.currency} onChange={(e) => setOrderForm((f) => ({ ...f, currency: e.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                  <option value="GHS">GHS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            {selectedItem && (
              <div className="rounded-md border border-border bg-surface p-3 text-sm">
                <span className="text-muted">Total: </span>
                <span className="font-numeric font-medium">
                  {orderForm.currency === "GHS" ? `GHS ${totalGhs.toFixed(2)}` : `USD ${totalUsd.toFixed(2)}`}
                </span>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <Input value={orderForm.notes} onChange={(e) => setOrderForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <Button onClick={handleNewOrder} disabled={loading || !orderForm.bar_item_id}>
              <ShoppingCart size={14} /> {loading ? "Recording…" : "Record Order"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Drink Dialog */}
      <Dialog open={showAddItem} onClose={() => setShowAddItem(false)} title="Add Drink to Menu">
        <ItemForm values={itemForm} onChange={setItemForm} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowAddItem(false)}>Cancel</Button>
          <Button onClick={handleAddItem} disabled={loading || !itemForm.name || !itemForm.category_id}>{loading ? "Adding…" : "Add Drink"}</Button>
        </div>
      </Dialog>

      {/* Edit Drink Dialog */}
      <Dialog open={!!editItem} onClose={() => setEditItem(null)} title="Edit Drink">
        <ItemForm values={editForm} onChange={setEditForm} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEditItem(null)}>Cancel</Button>
          <Button onClick={handleEditItem} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
        </div>
      </Dialog>
    </>
  );
}