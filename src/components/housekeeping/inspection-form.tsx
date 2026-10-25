"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  unit: { id: string; unit_number: string };
  housekeeperId: string | null;
  inspectorId: string;
  propertyId: string;
  onPassed: () => void;
  onFailed: (missedItems: string[]) => void;
}

const CHECKLIST = [
  { key: "bed_made", label: "Bed made & sheets changed" },
  { key: "pillows_arranged", label: "Pillows arranged" },
  { key: "bathroom_cleaned", label: "Bathroom cleaned" },
  { key: "toilet_cleaned", label: "Toilet cleaned & disinfected" },
  { key: "shower_cleaned", label: "Shower/bath cleaned" },
  { key: "towels_replaced", label: "Towels replaced" },
  { key: "floor_swept", label: "Floor swept" },
  { key: "floor_mopped", label: "Floor mopped" },
  { key: "windows_cleaned", label: "Windows cleaned" },
  { key: "surfaces_wiped", label: "Surfaces wiped down" },
  { key: "trash_emptied", label: "Trash emptied" },
  { key: "toiletries_restocked", label: "Toiletries restocked" },
  { key: "ac_checked", label: "AC working & set correctly" },
  { key: "tv_checked", label: "TV & remote working" },
];

type ChecklistState = Record<string, boolean>;

export function InspectionForm({ open, onClose, unit, housekeeperId, inspectorId, propertyId, onPassed, onFailed }: Props) {
  const [checklist, setChecklist] = useState<ChecklistState>(
    Object.fromEntries(CHECKLIST.map((item) => [item.key, false]))
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  const missedItems = CHECKLIST.filter((item) => !checklist[item.key]).map((item) => item.label);
  const allPassed = missedItems.length === 0;

  async function handleSubmit() {
    setLoading(true);
    const passed = allPassed;

    await supabase.from("room_inspections").insert({
      property_id: propertyId,
      unit_id: unit.id,
      inspected_by: inspectorId,
      housekeeper_id: housekeeperId,
      ...checklist,
      passed,
      missed_items: missedItems.length > 0 ? missedItems.join(", ") : null,
      notes: notes || null,
    });

    if (passed) {
      await supabase.from("units").update({ status: "available" }).eq("id", unit.id);
      showToast(`Unit ${unit.unit_number} passed inspection — now Available ✓`);
      onPassed();
    } else {
      // Notify housekeeper to redo missed items
      if (housekeeperId) {
        await supabase.from("notifications").insert({
          recipient_id: housekeeperId,
          title: "⚠️ Room Failed Inspection",
          body: `Unit ${unit.unit_number} failed inspection. Missed: ${missedItems.join(", ")}. Please redo these items.`,
          link: "/dashboard/housekeeping-tasks",
        });
      }
      showToast(`Inspection failed — housekeeper notified to redo ${missedItems.length} item(s)`, "error");
      onFailed(missedItems);
    }

    setLoading(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Inspect Unit ${unit.unit_number}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">Tick each item that has been completed correctly.</p>

        <div className="flex flex-col gap-2">
          {CHECKLIST.map((item) => (
            <label key={item.key}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                checklist[item.key]
                  ? "border-success bg-success/10 text-foreground"
                  : "border-border bg-surface-raised text-muted"
              }`}>
              <input
                type="checkbox"
                checked={checklist[item.key]}
                onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                className="sr-only"
              />
              {checklist[item.key]
                ? <CheckCircle size={18} className="text-success shrink-0" />
                : <XCircle size={18} className="text-muted shrink-0" />
              }
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>Inspection progress</span>
            <span>{CHECKLIST.length - missedItems.length}/{CHECKLIST.length} items</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${((CHECKLIST.length - missedItems.length) / CHECKLIST.length) * 100}%` }}
            />
          </div>
        </div>

        {missedItems.length > 0 && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <p className="font-semibold mb-1">⚠️ {missedItems.length} item(s) not completed:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {missedItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about the room condition…"
            rows={2}
            className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={allPassed ? "" : "bg-warning hover:bg-warning/90"}
          >
            {loading ? "Submitting…" : allPassed ? "✓ Pass Inspection" : "Submit (Failed)"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}