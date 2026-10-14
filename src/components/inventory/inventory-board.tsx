"use client";

import { useState } from "react";
import { Plus, Pencil, TrendingUp, TrendingDown, History } from "lucide-react";
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

interface Category { id: string; name: string; group_name: string; display_order: number; }
interface InventoryItem {
  id: string; name: string; category_id: string; unit: string;
  current_stock: number; minimum_stock: number; cost_price: number;
  selling_price: number | null; supplier: string | null; status: string;
  category?: { name: string; group_name: string } | null;
}
interface Movement {
  id: string; item_id: string; movement_type: string; reason: string;
  quantity: number; stock_before: number; stock_after: number;
  notes: string | null; created_at: string;
  item?: { name: string; unit: string } | null;
  recorder?: { full_name: string } | null;
}

interface Props {
  categories: Category[]; items: InventoryItem[];
  movements: Movement[]; propertyId: string;
  currentStaffId: string; currentRole: Role;
}

const REASON_LABELS: Record<string, string> = {
  purchase: "Purchase", guest_consumption: "Guest Consumption",
  breakfast: "Breakfast", bar_sale: "Bar Sale",
  damaged: "Damaged", missing: "Missing", manual_adjustment: "Manual Adjustment",
};

const GROUP_COLORS: Record<string, any> = {
  Bar: "default", Breakfast: "warning", Housekeeping: "success",
};

const EMPTY_ITEM = { name: "", category_id: "", unit: "", minimum_stock: "", cost_price: "", selling_price: "", supplier: "" };
const EMPTY_STOCK_IN = { item_id: "", quantity: "", notes: "" };
const EMPTY_STOCK_OUT = { item_id: "", quantity: "", reason: "manual_adjustment", notes: "" };

export function InventoryBoard({ categories, items: initItems, movements: initMovements, propertyId, currentStaffId, currentRole }: Props) {
  const [items, setItems] = useState(initItems);
  const [movements, setMovements] = useState(initMovements);
  const [tab, setTab] = useState<"items" | "stock_in" | "stock_out" | "history">("items");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [editForm, setEditForm] = useState(EMPTY_ITEM);
  const [stockInForm, setStockInForm] = useState(EMPTY_STOCK_IN);
  const [stockOutForm, setStockOutForm] = useState(EMPTY_STOCK_OUT);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();
  const canManage = ["owner", "manager"].includes(currentRole);

  const filteredItems = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || i.category?.group_name === filter ||
      (filter === "low_stock" && i.current_stock <= i.minimum_stock);
    return matchSearch && matchFilter;
  });

  const lowStockCount = items.filter((i) => i.current_stock <= i.minimum_stock && i.status === "active").length;

  async function handleAddItem() {
    setLoading(true);
    const { data, error } = await supabase.from("inventory_items").insert({
      property_id: propertyId,
      name: itemForm.name,
      category_id: itemForm.category_id,
      unit: itemForm.unit,
      minimum_stock: parseFloat(itemForm.minimum_stock || "0"),
      cost_price: parseFloat(itemForm.cost_price || "0"),
      selling_price: itemForm.selling_price ? parseFloat(itemForm.selling_price) : null,
      supplier: itemForm.supplier || null,
    }).select("*, category:category_id(name, group_name)").single();
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAddItem(false);
    setItemForm(EMPTY_ITEM);
    showToast("Item added");
  }

  async function handleEditItem() {
    if (!editItem) return;
    setLoading(true);
    const { error } = await supabase.from("inventory_items").update({
      name: editForm.name,
      category_id: editForm.category_id,
      unit: editForm.unit,
      minimum_stock: parseFloat(editForm.minimum_stock || "0"),
      cost_price: parseFloat(editForm.cost_price || "0"),
      selling_price: editForm.selling_price ? parseFloat(editForm.selling_price) : null,
      supplier: editForm.supplier || null,
    }).eq("id", editItem.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...i, ...editForm, minimum_stock: parseFloat(editForm.minimum_stock), cost_price: parseFloat(editForm.cost_price), selling_price: editForm.selling_price ? parseFloat(editForm.selling_price) : null } : i));
    setEditItem(null);
    showToast("Item updated");
  }

  async function handleStockIn() {
    setLoading(true);
    const item = items.find((i) => i.id === stockInForm.item_id);
    if (!item) return;
    const qty = parseFloat(stockInForm.quantity);
    const newStock = item.current_stock + qty;

    const { error: moveError } = await supabase.from("stock_movements").insert({
      property_id: propertyId,
      item_id: stockInForm.item_id,
      movement_type: "stock_in",
      reason: "purchase",
      quantity: qty,
      stock_before: item.current_stock,
      stock_after: newStock,
      notes: stockInForm.notes || null,
      recorded_by: currentStaffId,
    });

    if (moveError) { showToast(moveError.message, "error"); setLoading(false); return; }

    await supabase.from("inventory_items").update({ current_stock: newStock }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, current_stock: newStock } : i));
    setStockInForm(EMPTY_STOCK_IN);
    setLoading(false);
    showToast(`Added ${qty} ${item.unit} of ${item.name}`);
  }

  async function handleStockOut() {
    setLoading(true);
    const item = items.find((i) => i.id === stockOutForm.item_id);
    if (!item) return;
    const qty = parseFloat(stockOutForm.quantity);
    const newStock = Math.max(item.current_stock - qty, 0);

    const { error: moveError } = await supabase.from("stock_movements").insert({
      property_id: propertyId,
      item_id: stockOutForm.item_id,
      movement_type: "stock_out",
      reason: stockOutForm.reason,
      quantity: qty,
      stock_before: item.current_stock,
      stock_after: newStock,
      notes: stockOutForm.notes || null,
      recorded_by: currentStaffId,
    });

    if (moveError) { showToast(moveError.message, "error"); setLoading(false); return; }

    await supabase.from("inventory_items").update({ current_stock: newStock }).eq("id", item.id);

    // Low stock alert
    if (newStock <= item.minimum_stock) {
      const { data: managers } = await supabase.from("staff")
        .select("id").eq("property_id", propertyId)
        .in("role", ["owner", "manager"]).eq("is_active", true);
      if (managers) {
        await supabase.from("notifications").insert(
          managers.map((m) => ({
            recipient_id: m.id,
            title: "Low Stock Alert",
            body: `${item.name} is running low (${newStock} ${item.unit} remaining).`,
            link: "/dashboard/inventory",
          }))
        );
      }
    }

    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, current_stock: newStock } : i));
    setStockOutForm(EMPTY_STOCK_OUT);
    setLoading(false);
    showToast(`Removed ${qty} ${item.unit} of ${item.name}`);
  }

  const ItemForm = ({ values, onChange }: { values: any; onChange: (f: any) => void }) => (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Item Name *</label>
        <Input value={values.name} onChange={(e) => onChange((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Coca-Cola" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Category *</label>
          <select value={values.category_id} onChange={(e) => onChange((f: any) => ({ ...f, category_id: e.target.value }))}
            className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="">Select…</option>
            {["Bar", "Breakfast", "Housekeeping"].map((group) => (
              <optgroup key={group} label={group}>
                {categories.filter((c) => c.group_name === group).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Unit *</label>
          <Input value={values.unit} onChange={(e) => onChange((f: any) => ({ ...f, unit: e.target.value }))} placeholder="bottles, pieces, kg…" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Min Stock Level</label>
          <Input type="number" value={values.minimum_stock} onChange={(e) => onChange((f: any) => ({ ...f, minimum_stock: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Cost Price (GHS)</label>
          <Input type="number" value={values.cost_price} onChange={(e) => onChange((f: any) => ({ ...f, cost_price: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Selling Price (GHS)</label>
          <Input type="number" value={values.selling_price} onChange={(e) => onChange((f: any) => ({ ...f, selling_price: e.target.value }))} placeholder="Optional" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Supplier</label>
          <Input value={values.supplier} onChange={(e) => onChange((f: any) => ({ ...f, supplier: e.target.value }))} placeholder="Optional" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Low stock banner */}
      {lowStockCount > 0 && (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          ⚠️ {lowStockCount} item{lowStockCount > 1 ? "s are" : " is"} below minimum stock level.
          <button type="button" onClick={() => { setFilter("low_stock"); setTab("items"); }} className="ml-2 underline">View</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {([["items", "All Items"], ["stock_in", "Stock In"], ["stock_out", "Stock Out"], ["history", "History"]] as const).map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "bg-accent text-white" : "bg-surface-raised text-muted hover:text-foreground border border-border"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ITEMS TAB */}
      {tab === "items" && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items ({filteredItems.length})</CardTitle>
            {canManage && <Button size="sm" onClick={() => setShowAddItem(true)}><Plus size={14} /> Add Item</Button>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SearchFilterBar
              searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search items…"
              filterOptions={[
                { label: "All", value: "all" },
                { label: "🔴 Low Stock", value: "low_stock" },
                { label: "Bar", value: "Bar" },
                { label: "Breakfast", value: "Breakfast" },
                { label: "Housekeeping", value: "Housekeeping" },
              ]}
              activeFilter={filter} onFilterChange={setFilter}
            />
            <Table>
              <TableHead><tr>
                <TableHeaderCell>Item</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>Current Stock</TableHeaderCell>
                <TableHeaderCell>Min Stock</TableHeaderCell>
                <TableHeaderCell>Cost (GHS)</TableHeaderCell>
                <TableHeaderCell>Supplier</TableHeaderCell>
                {canManage && <TableHeaderCell></TableHeaderCell>}
              </tr></TableHead>
              <TableBody>
                {filteredItems.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted py-8">No items found</TableCell></TableRow>}
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant={GROUP_COLORS[item.category?.group_name ?? ""] ?? "muted"}>
                        {item.category?.name ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell numeric>
                      <span className={item.current_stock <= item.minimum_stock ? "text-danger font-bold" : ""}>
                        {item.current_stock}
                      </span>
                    </TableCell>
                    <TableCell numeric>{item.minimum_stock}</TableCell>
                    <TableCell numeric>{item.cost_price.toFixed(2)}</TableCell>
                    <TableCell>{item.supplier ?? "—"}</TableCell>
                    {canManage && (
                      <TableCell>
                        <button type="button" onClick={() => {
                          setEditItem(item);
                          setEditForm({ name: item.name, category_id: item.category_id, unit: item.unit, minimum_stock: item.minimum_stock.toString(), cost_price: item.cost_price.toString(), selling_price: item.selling_price?.toString() ?? "", supplier: item.supplier ?? "" });
                        }} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* STOCK IN TAB */}
      {tab === "stock_in" && (
        <Card>
          <CardHeader><CardTitle>Record Stock In</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted">Record new stock arriving at the hotel (purchases, deliveries).</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Item *</label>
              <select value={stockInForm.item_id} onChange={(e) => setStockInForm((f) => ({ ...f, item_id: e.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">Select item…</option>
                {["Bar", "Breakfast", "Housekeeping"].map((group) => (
                  <optgroup key={group} label={group}>
                    {items.filter((i) => i.category?.group_name === group).map((i) => (
                      <option key={i.id} value={i.id}>{i.name} (Current: {i.current_stock} {i.unit})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Quantity *</label>
              <Input type="number" value={stockInForm.quantity} onChange={(e) => setStockInForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="How many units received?" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <Input value={stockInForm.notes} onChange={(e) => setStockInForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional — supplier, invoice ref, etc." />
            </div>
            <Button onClick={handleStockIn} disabled={loading || !stockInForm.item_id || !stockInForm.quantity}>
              <TrendingUp size={14} /> {loading ? "Recording…" : "Record Stock In"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STOCK OUT TAB */}
      {tab === "stock_out" && (
        <Card>
          <CardHeader><CardTitle>Record Stock Out</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted">Record stock leaving the hotel for any reason.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Item *</label>
              <select value={stockOutForm.item_id} onChange={(e) => setStockOutForm((f) => ({ ...f, item_id: e.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">Select item…</option>
                {["Bar", "Breakfast", "Housekeeping"].map((group) => (
                  <optgroup key={group} label={group}>
                    {items.filter((i) => i.category?.group_name === group).map((i) => (
                      <option key={i.id} value={i.id}>{i.name} (Current: {i.current_stock} {i.unit})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Reason *</label>
              <select value={stockOutForm.reason} onChange={(e) => setStockOutForm((f) => ({ ...f, reason: e.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="guest_consumption">Guest Consumption</option>
                <option value="damaged">Damaged</option>
                <option value="missing">Missing</option>
                <option value="manual_adjustment">Manual Adjustment</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Quantity *</label>
              <Input type="number" value={stockOutForm.quantity} onChange={(e) => setStockOutForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <Input value={stockOutForm.notes} onChange={(e) => setStockOutForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Explain what happened…" />
            </div>
            <Button onClick={handleStockOut} disabled={loading || !stockOutForm.item_id || !stockOutForm.quantity} variant="secondary">
              <TrendingDown size={14} /> {loading ? "Recording…" : "Record Stock Out"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <Card>
          <CardHeader><CardTitle>Stock Movement History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHead><tr>
                <TableHeaderCell>Item</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Reason</TableHeaderCell>
                <TableHeaderCell>Quantity</TableHeaderCell>
                <TableHeaderCell>Before</TableHeaderCell>
                <TableHeaderCell>After</TableHeaderCell>
                <TableHeaderCell>Recorded By</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
              </tr></TableHead>
              <TableBody>
                {movements.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted py-8">No movements yet</TableCell></TableRow>}
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.item?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.movement_type === "stock_in" ? "success" : "danger"}>
                        {m.movement_type === "stock_in" ? "In" : "Out"}
                      </Badge>
                    </TableCell>
                    <TableCell>{REASON_LABELS[m.reason] ?? m.reason}</TableCell>
                    <TableCell numeric>{m.quantity} {m.item?.unit}</TableCell>
                    <TableCell numeric>{m.stock_before}</TableCell>
                    <TableCell numeric>{m.stock_after}</TableCell>
                    <TableCell>{m.recorder?.full_name ?? "System"}</TableCell>
                    <TableCell numeric>{format(new Date(m.created_at), "MMM d, HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onClose={() => setShowAddItem(false)} title="Add Inventory Item">
        <ItemForm values={itemForm} onChange={setItemForm} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowAddItem(false)}>Cancel</Button>
          <Button onClick={handleAddItem} disabled={loading || !itemForm.name || !itemForm.category_id || !itemForm.unit}>{loading ? "Adding…" : "Add Item"}</Button>
        </div>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editItem} onClose={() => setEditItem(null)} title="Edit Item">
        <ItemForm values={editForm} onChange={setEditForm} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEditItem(null)}>Cancel</Button>
          <Button onClick={handleEditItem} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
        </div>
      </Dialog>
    </>
  );
}