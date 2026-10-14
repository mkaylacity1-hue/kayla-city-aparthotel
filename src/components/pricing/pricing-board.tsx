"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface UnitType { id: string; name: string; base_price_ghs: number; base_price_usd: number; }
interface SeasonalRate { id: string; unit_type_id: string; label: string; start_date: string; end_date: string; price_ghs: number; price_usd: number; unit_type?: { name: string } | null; }
interface Props { unitTypes: UnitType[]; seasonalRates: SeasonalRate[]; propertyId: string; }
const EMPTY_RATE = { unit_type_id: "", label: "", start_date: "", end_date: "", price_ghs: "", price_usd: "" };

export function PricingBoard({ unitTypes: initTypes, seasonalRates: initRates, propertyId }: Props) {
  const [unitTypes, setUnitTypes] = useState(initTypes);
  const [rates, setRates] = useState(initRates);
  const [editType, setEditType] = useState<UnitType | null>(null);
  const [editTypeForm, setEditTypeForm] = useState({ base_price_ghs: "", base_price_usd: "" });
  const [showAddRate, setShowAddRate] = useState(false);
  const [editRate, setEditRate] = useState<SeasonalRate | null>(null);
  const [deleteRate, setDeleteRate] = useState<SeasonalRate | null>(null);
  const [rateForm, setRateForm] = useState({ ...EMPTY_RATE, unit_type_id: initTypes[0]?.id ?? "" });
  const [editRateForm, setEditRateForm] = useState(EMPTY_RATE);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  async function handleSaveUnitType() {
    if (!editType) return;
    setLoading(true);
    const { error } = await supabase.from("unit_types").update({
      base_price_ghs: parseFloat(editTypeForm.base_price_ghs),
      base_price_usd: parseFloat(editTypeForm.base_price_usd),
    }).eq("id", editType.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setUnitTypes((prev) => prev.map((t) => t.id === editType.id ? { ...t, base_price_ghs: parseFloat(editTypeForm.base_price_ghs), base_price_usd: parseFloat(editTypeForm.base_price_usd) } : t));
    setEditType(null);
    showToast("Price updated");
  }

  async function handleAddRate() {
    setLoading(true);
    const { data, error } = await supabase.from("seasonal_rates").insert({
      unit_type_id: rateForm.unit_type_id,
      label: rateForm.label,
      start_date: rateForm.start_date,
      end_date: rateForm.end_date,
      price_ghs: parseFloat(rateForm.price_ghs || "0"),
      price_usd: parseFloat(rateForm.price_usd || "0"),
    }).select("*, unit_type:unit_type_id(name)").single();
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setRates((prev) => [data, ...prev]);
    setShowAddRate(false);
    setRateForm({ ...EMPTY_RATE, unit_type_id: initTypes[0]?.id ?? "" });
    showToast("Seasonal rate added");
  }

  async function handleEditRate() {
    if (!editRate) return;
    setLoading(true);
    const { error } = await supabase.from("seasonal_rates").update({
      label: editRateForm.label,
      start_date: editRateForm.start_date,
      end_date: editRateForm.end_date,
      price_ghs: parseFloat(editRateForm.price_ghs || "0"),
      price_usd: parseFloat(editRateForm.price_usd || "0"),
    }).eq("id", editRate.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setRates((prev) => prev.map((r) => r.id === editRate.id ? { ...r, ...editRateForm, price_ghs: parseFloat(editRateForm.price_ghs), price_usd: parseFloat(editRateForm.price_usd) } : r));
    setEditRate(null);
    showToast("Seasonal rate updated");
  }

  async function handleDeleteRate() {
    if (!deleteRate) return;
    setLoading(true);
    const { error } = await supabase.from("seasonal_rates").delete().eq("id", deleteRate.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setRates((prev) => prev.filter((r) => r.id !== deleteRate.id));
    setDeleteRate(null);
    showToast("Seasonal rate removed");
  }

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Base Nightly Prices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHead><tr>
              <TableHeaderCell>Unit Type</TableHeaderCell>
              <TableHeaderCell>Price (GHS)</TableHeaderCell>
              <TableHeaderCell>Price (USD)</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr></TableHead>
            <TableBody>
              {unitTypes.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell numeric>GHS {t.base_price_ghs.toFixed(2)}</TableCell>
                  <TableCell numeric>USD {t.base_price_usd.toFixed(2)}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => { setEditType(t); setEditTypeForm({ base_price_ghs: t.base_price_ghs.toString(), base_price_usd: t.base_price_usd.toString() }); }} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seasonal Rates</CardTitle>
          <Button size="sm" onClick={() => setShowAddRate(true)}><Plus size={14} /> Add Rate</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead><tr>
              <TableHeaderCell>Label</TableHeaderCell>
              <TableHeaderCell>Unit Type</TableHeaderCell>
              <TableHeaderCell>Start</TableHeaderCell>
              <TableHeaderCell>End</TableHeaderCell>
              <TableHeaderCell>GHS</TableHeaderCell>
              <TableHeaderCell>USD</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr></TableHead>
            <TableBody>
              {rates.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted py-8">No seasonal rates yet</TableCell></TableRow>}
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell>{r.unit_type?.name ?? "—"}</TableCell>
                  <TableCell numeric>{r.start_date}</TableCell>
                  <TableCell numeric>{r.end_date}</TableCell>
                  <TableCell numeric>{r.price_ghs.toFixed(2)}</TableCell>
                  <TableCell numeric>{r.price_usd.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditRate(r); setEditRateForm({ unit_type_id: r.unit_type_id, label: r.label, start_date: r.start_date, end_date: r.end_date, price_ghs: r.price_ghs.toString(), price_usd: r.price_usd.toString() }); }} className="text-muted hover:text-accent"><Pencil size={14} /></button>
                      <button type="button" onClick={() => setDeleteRate(r)} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editType} onClose={() => setEditType(null)} title="Edit Base Price">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Price/night (GHS)</label>
              <Input type="number" value={editTypeForm.base_price_ghs} onChange={(e) => setEditTypeForm((f) => ({ ...f, base_price_ghs: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Price/night (USD)</label>
              <Input type="number" value={editTypeForm.base_price_usd} onChange={(e) => setEditTypeForm((f) => ({ ...f, base_price_usd: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditType(null)}>Cancel</Button>
            <Button onClick={handleSaveUnitType} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showAddRate} onClose={() => setShowAddRate(false)} title="Add Seasonal Rate">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Unit Type</label>
            <select value={rateForm.unit_type_id} onChange={(e) => setRateForm((f) => ({ ...f, unit_type_id: e.target.value }))}
              className="h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
              {unitTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Label</label>
            <Input value={rateForm.label} onChange={(e) => setRateForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Christmas Holiday Rate" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date</label>
              <Input type="date" value={rateForm.start_date} onChange={(e) => setRateForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <Input type="date" value={rateForm.end_date} onChange={(e) => setRateForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Price/night (GHS)</label>
              <Input type="number" value={rateForm.price_ghs} onChange={(e) => setRateForm((f) => ({ ...f, price_ghs: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Price/night (USD)</label>
              <Input type="number" value={rateForm.price_usd} onChange={(e) => setRateForm((f) => ({ ...f, price_usd: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddRate(false)}>Cancel</Button>
            <Button onClick={handleAddRate} disabled={loading || !rateForm.label || !rateForm.start_date || !rateForm.end_date}>{loading ? "Adding..." : "Add Rate"}</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!editRate} onClose={() => setEditRate(null)} title="Edit Seasonal Rate">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Label</label>
            <Input value={editRateForm.label} onChange={(e) => setEditRateForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date</label>
              <Input type="date" value={editRateForm.start_date} onChange={(e) => setEditRateForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <Input type="date" value={editRateForm.end_date} onChange={(e) => setEditRateForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Price/night (GHS)</label>
              <Input type="number" value={editRateForm.price_ghs} onChange={(e) => setEditRateForm((f) => ({ ...f, price_ghs: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Price/night (USD)</label>
              <Input type="number" value={editRateForm.price_usd} onChange={(e) => setEditRateForm((f) => ({ ...f, price_usd: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditRate(null)}>Cancel</Button>
            <Button onClick={handleEditRate} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog open={!!deleteRate} onCancel={() => setDeleteRate(null)} onConfirm={handleDeleteRate}
        title="Remove Seasonal Rate" description="Remove this seasonal rate? This cannot be undone."
        confirmLabel="Remove" destructive isLoading={loading} />
    </>
  );
}