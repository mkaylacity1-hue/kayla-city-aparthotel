"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import type { Role } from "@/lib/auth/roles";

interface Unit { id: string; unit_number: string; status: string; unit_type?: { name: string } | null; }
interface StaffMember { id: string; full_name: string; role: string; }

interface Props {
  units: Unit[]; allStaff: StaffMember[];
  currentStaffId: string; currentRole: Role; propertyId: string;
}

const STATUS_BADGE: Record<string, any> = {
  available: "success", occupied: "danger", cleaning: "warning", cleaned: "default", maintenance: "muted",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available", occupied: "Occupied", cleaning: "Cleaning",
  cleaned: "Cleaned — Pending Inspection", maintenance: "Maintenance",
};

export function HousekeepingBoard({ units: initUnits, allStaff, currentStaffId, currentRole, propertyId }: Props) {
  const [units, setUnits] = useState(initUnits);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();
  const supabase = createClient();

  const canManage = ["owner", "manager", "receptionist"].includes(currentRole);
  const isHousekeeping = currentRole === "housekeeping";

  const filtered = units.filter((u) => {
    const matchSearch = u.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      u.unit_type?.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || u.status === filter;
    return matchSearch && matchFilter;
  });

  const cleaningCount = units.filter((u) => u.status === "cleaning").length;
  const pendingCount = units.filter((u) => u.status === "cleaned").length;

  async function handleStatusChange(unit: Unit, status: string) {
    setLoading(unit.id);
    const { error } = await supabase.from("units").update({ status }).eq("id", unit.id);
    setLoading(null);
    if (error) { showToast(error.message, "error"); return; }
    setUnits((prev) => prev.map((u) => u.id === unit.id ? { ...u, status } : u));

    // Notify manager/owner when housekeeping marks as cleaned
    if (status === "cleaned") {
      const managers = allStaff.filter((s) => ["owner", "manager"].includes(s.role));
      for (const m of managers) {
        await supabase.from("notifications").insert({
          recipient_id: m.id,
          title: "Room Ready for Inspection",
          body: `Unit ${unit.unit_number} has been cleaned and is waiting for inspection.`,
          link: "/dashboard/housekeeping-tasks",
        });
      }
      showToast("Room marked cleaned — manager notified");
    } else {
      showToast("Status updated");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Available", status: "available", color: "text-success" },
          { label: "Occupied", status: "occupied", color: "text-danger" },
          { label: "Cleaning", status: "cleaning", color: "text-warning" },
          { label: "Pending Inspection", status: "cleaned", color: "text-muted" },
        ].map((s) => (
          <button key={s.status} type="button" onClick={() => setFilter(s.status)}
            className={`rounded-lg border border-border bg-surface-raised p-4 text-left transition-colors hover:bg-surface ${filter === s.status ? "border-accent" : ""}`}>
            <p className={`font-numeric text-2xl font-bold ${s.color}`}>
              {units.filter((u) => u.status === s.status).length}
            </p>
            <p className="text-xs text-muted mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {pendingCount > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          ⚠️ {pendingCount} unit{pendingCount > 1 ? "s" : ""} cleaned and waiting for inspection.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Units ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SearchFilterBar
            searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search units…"
            filterOptions={[
              { label: "All", value: "all" },
              { label: "Available", value: "available" },
              { label: "Occupied", value: "occupied" },
              { label: "Cleaning", value: "cleaning" },
              { label: "Pending Inspection", value: "cleaned" },
              { label: "Maintenance", value: "maintenance" },
            ]}
            activeFilter={filter} onFilterChange={setFilter}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 && (
              <p className="text-sm text-muted col-span-3 py-8 text-center">No units found</p>
            )}
            {filtered.map((u) => (
              <div key={u.id} className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-numeric font-semibold text-lg">{u.unit_number}</p>
                    <p className="text-xs text-muted">{u.unit_type?.name ?? "—"}</p>
                  </div>
                  <Badge variant={STATUS_BADGE[u.status]}>{STATUS_LABELS[u.status]}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Housekeeping can mark cleaning → cleaned */}
                  {u.status === "cleaning" && (isHousekeeping || canManage) && (
                    <button type="button" disabled={loading === u.id}
                      onClick={() => handleStatusChange(u, "cleaned")}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                      {loading === u.id ? "Updating…" : "Mark Cleaned"}
                    </button>
                  )}
                  {/* Only owner/manager can confirm inspection */}
                  {u.status === "cleaned" && ["owner", "manager"].includes(currentRole) && (
                    <button type="button" disabled={loading === u.id}
                      onClick={() => handleStatusChange(u, "available")}
                      className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-success/90 disabled:opacity-50">
                      {loading === u.id ? "Updating…" : "Confirm Inspection ✓"}
                    </button>
                  )}
                  {/* Manager/Owner can set to maintenance */}
                  {canManage && u.status !== "occupied" && u.status !== "maintenance" && (
                    <button type="button" disabled={loading === u.id}
                      onClick={() => handleStatusChange(u, "maintenance")}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-danger disabled:opacity-50">
                      Set Maintenance
                    </button>
                  )}
                  {/* Manager/Owner can release from maintenance */}
                  {canManage && u.status === "maintenance" && (
                    <button type="button" disabled={loading === u.id}
                      onClick={() => handleStatusChange(u, "available")}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-success disabled:opacity-50">
                      Release from Maintenance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}