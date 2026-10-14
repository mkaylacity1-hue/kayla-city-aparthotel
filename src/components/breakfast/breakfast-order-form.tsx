"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface Item { id: string; name: string; display_order: number; }
interface Category { id: string; name: string; description: string | null; items: Item[]; }
interface SpecialConfig { fee_ghs: number; fee_usd: number; description: string | null; }
interface ExistingOrder { id: string; category_id: string | null; is_special: boolean; number_of_guests: number; status: string; }

interface Props {
  reservationId: string; unitId: string; forDate: string;
  categories: Category[]; specialConfig: SpecialConfig | null;
  maxGuests: number; existingOrder: ExistingOrder | null;
}

export function BreakfastOrderForm({ reservationId, unitId, forDate, categories, specialConfig, maxGuests, existingOrder }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(existingOrder?.category_id ?? null);
  const [isSpecial, setIsSpecial] = useState(existingOrder?.is_special ?? false);
  const [specialRequest, setSpecialRequest] = useState("");
  const [numGuests, setNumGuests] = useState(existingOrder?.number_of_guests ?? 1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const alreadyOrdered = !!existingOrder && !submitted;

  const feeghs = isSpecial ? (specialConfig?.fee_ghs ?? 0) * numGuests : 0;
  const feeusd = isSpecial ? (specialConfig?.fee_usd ?? 0) * numGuests : 0;

  async function handleSubmit() {
    if (!isSpecial && !selectedCategory) { setError("Please select a breakfast type."); return; }
    setError(null);
    setLoading(true);

    const payload = {
      reservation_id: reservationId,
      unit_id: unitId,
      for_date: forDate,
      category_id: isSpecial ? null : selectedCategory,
      is_special: isSpecial,
      special_request: isSpecial ? specialRequest : null,
      number_of_guests: numGuests,
      total_fee_ghs: feeghs,
      total_fee_usd: feeusd,
      status: "pending",
    };

    const { error: err } = existingOrder
      ? await supabase.from("breakfast_orders").update(payload).eq("id", existingOrder.id)
      : await supabase.from("breakfast_orders").insert(payload);

    setLoading(false);
    if (err) { setError("Failed to submit order. Please try again."); return; }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="font-heading text-xl font-semibold">Order Submitted!</h2>
        <p className="text-sm text-muted">Your breakfast will be ready tomorrow morning. Enjoy your stay!</p>
        {isSpecial && feeghs > 0 && (
          <div className="rounded-md border border-border bg-surface p-3 text-sm">
            <p className="text-muted">Special breakfast fee:</p>
            <p className="font-numeric font-medium">GHS {feeghs.toFixed(2)} / USD {feeusd.toFixed(2)}</p>
            <p className="text-xs text-muted mt-1">This will be added to your bill at checkout.</p>
          </div>
        )}
      </div>
    );
  }

  if (alreadyOrdered) {
    const orderedCat = categories.find((c) => c.id === existingOrder.category_id);
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-success/30 bg-success/5 p-4 text-sm">
          <p className="font-medium text-success">✓ Breakfast ordered for tomorrow</p>
          <p className="mt-1 text-muted">
            {existingOrder.is_special ? "Special Breakfast Request" : orderedCat?.name ?? "—"}
            {" "} for {existingOrder.number_of_guests} guest(s)
          </p>
        </div>
        <p className="text-sm text-muted text-center">Want to change your order?</p>
        <Button variant="secondary" onClick={() => setSubmitted(false)}>Change Order</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Number of guests */}
      <div>
        <label className="mb-2 block text-sm font-medium">Number of guests (max {maxGuests})</label>
        <div className="flex gap-2">
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => setNumGuests(n)}
              className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors ${numGuests === n ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-raised text-muted hover:text-foreground"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Breakfast type selection */}
      <div>
        <label className="mb-2 block text-sm font-medium">Choose your breakfast</label>
        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <button key={cat.id} type="button"
              onClick={() => { setSelectedCategory(cat.id); setIsSpecial(false); }}
              className={`rounded-lg border p-4 text-left transition-colors ${selectedCategory === cat.id && !isSpecial ? "border-accent bg-accent-soft" : "border-border bg-surface-raised hover:bg-surface"}`}>
              <p className="font-medium text-sm">{cat.name}</p>
              {cat.description && <p className="text-xs text-muted mt-0.5">{cat.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {cat.items.sort((a, b) => a.display_order - b.display_order).map((item) => (
                  <span key={item.id} className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted border border-border">{item.name}</span>
                ))}
              </div>
            </button>
          ))}

          {/* Special breakfast */}
          <button type="button" onClick={() => { setIsSpecial(true); setSelectedCategory(null); }}
            className={`rounded-lg border p-4 text-left transition-colors ${isSpecial ? "border-accent bg-accent-soft" : "border-border bg-surface-raised hover:bg-surface"}`}>
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Special Breakfast Request</p>
              {specialConfig && (
                <span className="font-numeric text-xs text-accent">+GHS {specialConfig.fee_ghs}/person</span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">{specialConfig?.description ?? "Custom meal prepared on request"}</p>
          </button>
        </div>
      </div>

      {/* Special request details */}
      {isSpecial && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Describe your special request</label>
          <textarea value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} rows={3}
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            placeholder="e.g. Vegan meal, no dairy, gluten-free…" />
          {feeghs > 0 && (
            <p className="mt-1 text-xs text-muted">
              Total fee: <span className="font-numeric text-foreground">GHS {feeghs.toFixed(2)}</span> for {numGuests} guest(s)
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button onClick={handleSubmit} disabled={loading || (!selectedCategory && !isSpecial)} className="w-full">
        {loading ? "Submitting…" : "Submit Breakfast Order"}
      </Button>
      <p className="text-center text-xs text-muted">Orders must be placed by 9:00 PM for next morning delivery.</p>
    </div>
  );
}
