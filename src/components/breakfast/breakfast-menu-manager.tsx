"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

interface MenuItem { id: string; category: string; item_name: string; display_order: number; }
interface SpecialFee { id: string; fee_ghs: number; fee_usd: number; }

interface Props {
  menuItems: MenuItem[];
  specialFee: SpecialFee | null;
  propertyId: string;
}

const CATEGORIES = ["Egg", "Bread", "Beverage", "Baked Beans", "Jam", "Sausage", "Sugar", "Milk"];

export function BreakfastMenuManager({ menuItems: initial, specialFee: initialFee, propertyId }: Props) {
  const [items, setItems] = useState(initial);
  const [specialFee, setSpecialFee] = useState(initialFee);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [feeGhs, setFeeGhs] = useState(initialFee?.fee_ghs?.toString() ?? "50");
  const [feeUsd, setFeeUsd] = useState(initialFee?.fee_usd?.toString() ?? "5");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const allCategories = Array.from(new Set([...CATEGORIES, ...Object.keys(groupedItems)]));

  async function handleRename(item: MenuItem) {
    if (!editName.trim()) return;
    const { error } = await supabase.from("breakfast_menu")
      .update({ item_name: editName.trim() })
      .eq("id", item.id);
    if (error) { showToast(error.message, "error"); return; }
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, item_name: editName.trim() } : i));
    setEditingId(null);
    showToast("Item renamed");
  }

  async function handleDelete(item: MenuItem) {
    const { error } = await supabase.from("breakfast_menu")
      .update({ is_active: false })
      .eq("id", item.id);
    if (error) { showToast(error.message, "error"); return; }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    showToast("Item removed");
  }

  async function handleAddItem() {
    const category = newItemCategory || newCategory;
    if (!category.trim() || !newItemName.trim()) {
      showToast("Please select a category and enter an item name", "error");
      return;
    }
    setLoading(true);
    const maxOrder = items.filter((i) => i.category === category).length;
    const { data, error } = await supabase.from("breakfast_menu").insert({
      property_id: propertyId,
      category: category.trim(),
      item_name: newItemName.trim(),
      display_order: maxOrder + 1,
    }).select().single();
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setItems((prev) => [...prev, data]);
    setNewItemName("");
    setNewItemCategory("");
    setNewCategory("");
    showToast("Item added");
  }

  async function handleSaveFee() {
    setLoading(true);
    if (specialFee) {
      const { error } = await supabase.from("breakfast_special_fee")
        .update({ fee_ghs: parseFloat(feeGhs), fee_usd: parseFloat(feeUsd), updated_at: new Date().toISOString() })
        .eq("id", specialFee.id);
      if (error) { showToast(error.message, "error"); setLoading(false); return; }
    } else {
      const { data, error } = await supabase.from("breakfast_special_fee")
        .insert({ property_id: propertyId, fee_ghs: parseFloat(feeGhs), fee_usd: parseFloat(feeUsd) })
        .select().single();
      if (error) { showToast(error.message, "error"); setLoading(false); return; }
      setSpecialFee(data);
    }
    setLoading(false);
    showToast("Special request fee updated");
  }

  const selectClass = "h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <div className="flex flex-col gap-6">

      {/* Special Fee Card */}
      <Card>
        <CardHeader>
          <CardTitle>Special Request Fee</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted">Set the fee charged when a guest makes a special breakfast request outside the standard menu.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Fee (GHS)</label>
              <Input type="number" value={feeGhs} onChange={(e) => setFeeGhs(e.target.value)} placeholder="50.00" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Fee (USD)</label>
              <Input type="number" value={feeUsd} onChange={(e) => setFeeUsd(e.target.value)} placeholder="5.00" />
            </div>
          </div>
          <Button onClick={handleSaveFee} disabled={loading} size="sm">
            {loading ? "Saving…" : "Save Fee"}
          </Button>
        </CardContent>
      </Card>

      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle>Add Menu Item</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <select value={newItemCategory} onChange={(e) => { setNewItemCategory(e.target.value); setNewCategory(""); }} className={selectClass}>
              <option value="">Select existing category…</option>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">+ Create new category</option>
            </select>
          </div>
          {newItemCategory === "__new__" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">New Category Name</label>
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Fruit" />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Item Name</label>
            <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Scrambled Egg" />
          </div>
          <Button onClick={handleAddItem} disabled={loading} size="sm">
            <Plus size={14} /> Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Menu Items by Category */}
      {allCategories.filter((c) => groupedItems[c]?.length > 0).map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(groupedItems[category] ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2">
                {editingId === item.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(item)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <button type="button" onClick={() => handleRename(item)} className="text-success hover:text-success/80"><Check size={15} /></button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-muted hover:text-foreground"><X size={15} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{item.item_name}</span>
                    <button type="button" onClick={() => { setEditingId(item.id); setEditName(item.item_name); }} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                    <button type="button" onClick={() => handleDelete(item)} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
            {(!groupedItems[category] || groupedItems[category].length === 0) && (
              <p className="text-xs text-muted py-2">No items in this category.</p>
            )}
          </CardContent>
        </Card>
      ))}

    </div>
  );
}