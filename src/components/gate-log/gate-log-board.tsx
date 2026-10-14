"use client";

import { useState } from "react";
import { Car, Users, Plus, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Role } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

interface Vehicle { id: string; plate_number: string; vehicle_type: string | null; driver_name: string | null; purpose: string | null; time_in: string; time_out: string | null; notes: string | null; logger?: { full_name: string } | null; }
interface Visitor { id: string; full_name: string; purpose: string | null; host_name: string | null; time_in: string; time_out: string | null; notes: string | null; logger?: { full_name: string } | null; }

interface Props { vehicles: Vehicle[]; visitors: Visitor[]; currentStaffId: string; propertyId: string; currentRole: Role; }

const EMPTY_VEHICLE = { plate_number: "", vehicle_type: "", driver_name: "", purpose: "", notes: "" };
const EMPTY_VISITOR = { full_name: "", purpose: "", host_name: "", notes: "" };

export function GateLogBoard({ vehicles: initV, visitors: initVis, currentStaffId, propertyId, currentRole }: Props) {
  const [vehicles, setVehicles] = useState(initV);
  const [visitors, setVisitors] = useState(initVis);
  const [tab, setTab] = useState<"vehicles" | "visitors">("vehicles");
  const [showVehicle, setShowVehicle] = useState(false);
  const [showVisitor, setShowVisitor] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [visitorForm, setVisitorForm] = useState(EMPTY_VISITOR);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();
  const canLog = currentRole === "security";

  async function logVehicle() {
    setLoading(true);
    const { data, error } = await supabase.from("gate_log_vehicles")
      .insert({ ...vehicleForm, property_id: propertyId, logged_by: currentStaffId })
      .select("*, logger:logged_by(full_name)").single();
    setLoading(false);
    if (error) { showToast("Failed to log vehicle", "error"); return; }
    setVehicles((prev) => [data, ...prev]);
    setShowVehicle(false); setVehicleForm(EMPTY_VEHICLE);
    showToast("Vehicle logged");
  }

  async function logVisitor() {
    setLoading(true);
    const { data, error } = await supabase.from("gate_log_visitors")
      .insert({ ...visitorForm, property_id: propertyId, logged_by: currentStaffId })
      .select("*, logger:logged_by(full_name)").single();
    setLoading(false);
    if (error) { showToast("Failed to log visitor", "error"); return; }
    setVisitors((prev) => [data, ...prev]);
    setShowVisitor(false); setVisitorForm(EMPTY_VISITOR);
    showToast("Visitor logged");
  }

  async function logOut(type: "vehicle" | "visitor", id: string) {
    const now = new Date().toISOString();
    const table = type === "vehicle" ? "gate_log_vehicles" : "gate_log_visitors";
    const { error } = await supabase.from(table).update({ time_out: now }).eq("id", id);
    if (error) { showToast("Failed to log exit", "error"); return; }
    if (type === "vehicle") setVehicles((prev) => prev.map((v) => v.id === id ? { ...v, time_out: now } : v));
    else setVisitors((prev) => prev.map((v) => v.id === id ? { ...v, time_out: now } : v));
    showToast("Exit time logged");
  }

  return (
    <>
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("vehicles")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "vehicles" ? "bg-accent text-white" : "bg-surface-raised text-muted hover:text-foreground border border-border"}`}>
          <Car size={14} /> Vehicles ({vehicles.length})
        </button>
        <button type="button" onClick={() => setTab("visitors")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "visitors" ? "bg-accent text-white" : "bg-surface-raised text-muted hover:text-foreground border border-border"}`}>
          <Users size={14} /> Visitors ({visitors.length})
        </button>
      </div>

      {tab === "vehicles" && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Log — Today</CardTitle>
            {canLog && <Button size="sm" onClick={() => setShowVehicle(true)}><Plus size={14} /> Log Vehicle</Button>}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead><tr>
                <TableHeaderCell>Plate</TableHeaderCell><TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Driver</TableHeaderCell><TableHeaderCell>Purpose</TableHeaderCell>
                <TableHeaderCell>Time In</TableHeaderCell><TableHeaderCell>Time Out</TableHeaderCell>
                {canLog && <TableHeaderCell></TableHeaderCell>}
              </tr></TableHead>
              <TableBody>
                {vehicles.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted py-8">No vehicles logged today</TableCell></TableRow>}
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-numeric font-medium">{v.plate_number}</TableCell>
                    <TableCell>{v.vehicle_type ?? "—"}</TableCell>
                    <TableCell>{v.driver_name ?? "—"}</TableCell>
                    <TableCell>{v.purpose ?? "—"}</TableCell>
                    <TableCell numeric>{format(new Date(v.time_in), "HH:mm")}</TableCell>
                    <TableCell numeric>{v.time_out ? format(new Date(v.time_out), "HH:mm") : <Badge variant="warning">Still in</Badge>}</TableCell>
                    {canLog && <TableCell>{!v.time_out && <button type="button" onClick={() => logOut("vehicle", v.id)} className="flex items-center gap-1 text-xs text-muted hover:text-danger"><LogOut size={12} /> Exit</button>}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "visitors" && (
        <Card>
          <CardHeader>
            <CardTitle>Visitor Log — Today</CardTitle>
            {canLog && <Button size="sm" onClick={() => setShowVisitor(true)}><Plus size={14} /> Log Visitor</Button>}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead><tr>
                <TableHeaderCell>Name</TableHeaderCell><TableHeaderCell>Purpose</TableHeaderCell>
                <TableHeaderCell>Visiting</TableHeaderCell><TableHeaderCell>Time In</TableHeaderCell>
                <TableHeaderCell>Time Out</TableHeaderCell>
                {canLog && <TableHeaderCell></TableHeaderCell>}
              </tr></TableHead>
              <TableBody>
                {visitors.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted py-8">No visitors logged today</TableCell></TableRow>}
                {visitors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.full_name}</TableCell>
                    <TableCell>{v.purpose ?? "—"}</TableCell>
                    <TableCell>{v.host_name ?? "—"}</TableCell>
                    <TableCell numeric>{format(new Date(v.time_in), "HH:mm")}</TableCell>
                    <TableCell numeric>{v.time_out ? format(new Date(v.time_out), "HH:mm") : <Badge variant="warning">Still in</Badge>}</TableCell>
                    {canLog && <TableCell>{!v.time_out && <button type="button" onClick={() => logOut("visitor", v.id)} className="flex items-center gap-1 text-xs text-muted hover:text-danger"><LogOut size={12} /> Exit</button>}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Log Vehicle Dialog */}
      <Dialog open={showVehicle} onClose={() => setShowVehicle(false)} title="Log Vehicle Entry">
        <div className="flex flex-col gap-4">
          <div><label className="mb-1.5 block text-sm font-medium">Plate Number *</label><Input value={vehicleForm.plate_number} onChange={(e) => setVehicleForm((f) => ({ ...f, plate_number: e.target.value }))} placeholder="e.g. GR-1234-21" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Vehicle Type</label><Input value={vehicleForm.vehicle_type} onChange={(e) => setVehicleForm((f) => ({ ...f, vehicle_type: e.target.value }))} placeholder="e.g. Saloon, SUV, Truck" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Driver Name</label><Input value={vehicleForm.driver_name} onChange={(e) => setVehicleForm((f) => ({ ...f, driver_name: e.target.value }))} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Purpose</label><Input value={vehicleForm.purpose} onChange={(e) => setVehicleForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Guest, Delivery, Vendor" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Notes</label><Input value={vehicleForm.notes} onChange={(e) => setVehicleForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setShowVehicle(false)}>Cancel</Button>
            <Button onClick={logVehicle} disabled={loading || !vehicleForm.plate_number}>{loading ? "Logging…" : "Log Entry"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Log Visitor Dialog */}
      <Dialog open={showVisitor} onClose={() => setShowVisitor(false)} title="Log Visitor Entry">
        <div className="flex flex-col gap-4">
          <div><label className="mb-1.5 block text-sm font-medium">Full Name *</label><Input value={visitorForm.full_name} onChange={(e) => setVisitorForm((f) => ({ ...f, full_name: e.target.value }))} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Purpose</label><Input value={visitorForm.purpose} onChange={(e) => setVisitorForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Guest visit, Meeting, Delivery" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Visiting (host name)</label><Input value={visitorForm.host_name} onChange={(e) => setVisitorForm((f) => ({ ...f, host_name: e.target.value }))} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Notes</label><Input value={visitorForm.notes} onChange={(e) => setVisitorForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setShowVisitor(false)}>Cancel</Button>
            <Button onClick={logVisitor} disabled={loading || !visitorForm.full_name}>{loading ? "Logging…" : "Log Entry"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
