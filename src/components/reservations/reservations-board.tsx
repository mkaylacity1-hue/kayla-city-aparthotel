"use client";

import { useState, useRef } from "react";
import { Plus, LogIn, LogOut, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useToast } from "@/components/ui/toast";
import { differenceInDays } from "date-fns";
import type { Role } from "@/lib/auth/roles";
import SignatureCanvas from "react-signature-canvas";
import { InvoiceModal } from "@/components/reservations/invoice-modal";

interface Guest { id: string; full_name: string; email: string | null; phone: string | null; }
interface Unit { id: string; unit_number: string; status: string; unit_type?: { name: string; base_price_ghs: number; base_price_usd: number; } | null; }
interface Reservation {
  id: string; unit_id: string; guest_id: string; check_in_date: string; check_out_date: string;
  check_in_time: string | null; check_out_time: string | null; rate_ghs: number | null; rate_usd: number | null;
  currency: string; total_amount: number | null; status: string; is_walk_in: boolean; notes: string | null;
  guest?: { full_name: string; email: string | null } | null;
  unit?: { unit_number: string; unit_type?: { name: string } | null } | null;
}

interface Props { reservations: Reservation[]; guests: Guest[]; units: Unit[]; propertyId: string; currentStaffId: string; currentRole: Role; }

const STATUS_BADGE: Record<string, any> = { reserved: "warning", checked_in: "success", checked_out: "muted", cancelled: "danger" };
const STATUS_LABELS: Record<string, string> = { reserved: "Reserved", checked_in: "Checked In", checked_out: "Checked Out", cancelled: "Cancelled" };
const EMPTY_FORM = { guest_id: "", unit_id: "", check_in_date: "", check_out_date: "", currency: "GHS", rate_ghs: "", rate_usd: "", is_walk_in: false, notes: "" };
const EMPTY_CHECKIN = { first_name: "", surname: "", sex: "", id_number: "", id_type: "", contact: "", emergency_contact: "", payment_method: "", disclaimer_agreed: false, number_of_persons: "1", tax_percent: "0", discount_percent: "0", is_vip: false };

const DISCLAIMER = `Kayla City Aparthotel strives to provide a safe, comfortable, and enjoyable stay for all guests. By making a booking or staying at our property, guests acknowledge and agree to the following:

Guest Responsibility: Guests are responsible for the safety of their personal belongings. Kayla City Aparthotel is not liable for any loss, theft, or damage of personal property during your stay.

Health & Safety: Guests must comply with all health, safety, and fire regulations. Smoking, open flames, or hazardous activities are strictly prohibited in guest apartments unless explicitly authorized.

Breakfast & Other Services: Breakfast and other services are provided according to the options selected by the guest. Orders must be submitted in advance when required, and the hotel is not responsible for submitted or late orders.

Damage & Extra Charges: Guests are responsible for any damage caused to the apartment, furniture, or amenities during their stay. Charges for damages will be applied as necessary.

Check-In & Check-Out: Check-in and check-out times must be respected. Late check-outs may incur additional charges, and early arrivals are subject to availability.

Right of Refusal: Kayla City Aparthotel reserves the right to refuse accommodation or terminate a stay if house rules or legal regulations are violated.

Noise & Community Respect: Guests must observe quiet hours and respect neighboring residents and other guests. Excessive noise, parties, or events are not permitted unless prior written approval is obtained from management.

Force Majeure: Kayla City Aparthotel shall not be liable for service interruptions caused by events beyond its reasonable control, including power outages, water supply issues, natural disasters, government actions, or emergencies.`;

export function ReservationsBoard({ reservations: initial, guests, units, propertyId, currentStaffId, currentRole }: Props) {
  const [reservations, setReservations] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState<Reservation | null>(null);
  const [checkOutTarget, setCheckOutTarget] = useState<Reservation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [checkInForm, setCheckInForm] = useState(EMPTY_CHECKIN);
  const [loading, setLoading] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const sigPadRef = useRef<SignatureCanvas>(null);
  const { showToast } = useToast();
  const supabase = createClient();

  const availableUnits = units.filter((u) => u.status === "available");

  const filtered = reservations.filter((r) => {
    const matchSearch =
      r.guest?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.unit?.unit_number?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || r.status === filter;
    return matchSearch && matchFilter;
  });

  function calcTotal(form: any) {
    if (!form.check_in_date || !form.check_out_date) return 0;
    const nights = differenceInDays(new Date(form.check_out_date), new Date(form.check_in_date));
    const rate = form.currency === "GHS" ? parseFloat(form.rate_ghs || "0") : parseFloat(form.rate_usd || "0");
    return nights * rate;
  }

  function buildInvoiceData(reservation: Reservation, tax = 0, discount = 0, isVip = false) {
    const nights = Math.ceil(
      (new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    const rate = reservation.currency === "GHS" ? reservation.rate_ghs : reservation.rate_usd;
    return {
      invoiceNumber: `KCA-${Date.now().toString().slice(-6)}`,
      issueDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      guestName: reservation.guest?.full_name ?? "Guest",
      guestEmail: reservation.guest?.email ?? null,
      unitNumber: reservation.unit?.unit_number ?? "",
      unitType: (reservation.unit as any)?.unit_type?.name ?? "",
      checkInDate: new Date(reservation.check_in_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      checkOutDate: new Date(reservation.check_out_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      nights,
      currency: reservation.currency,
      ratePerNight: Number(rate ?? 0),
      total: Number(reservation.total_amount ?? 0),
      taxAmount: tax,
      discountAmount: discount,
      isVip,
    };
  }

  async function sendInvoice(reservationId: string) {
    try {
      await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
    } catch { }
  }

  async function handleCreate() {
    setLoading(true);
    const nights = differenceInDays(new Date(form.check_out_date), new Date(form.check_in_date));
    const rate = form.currency === "GHS" ? parseFloat(form.rate_ghs || "0") : parseFloat(form.rate_usd || "0");
    const total = nights * rate;

    const { data, error } = await supabase.from("reservations").insert({
      property_id: propertyId,
      guest_id: form.guest_id,
      unit_id: form.unit_id,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      currency: form.currency,
      rate_ghs: form.rate_ghs ? parseFloat(form.rate_ghs) : null,
      rate_usd: form.rate_usd ? parseFloat(form.rate_usd) : null,
      total_amount: total,
      is_walk_in: form.is_walk_in,
      notes: form.notes || null,
      created_by: currentStaffId,
      status: form.is_walk_in ? "checked_in" : "reserved",
    }).select("*, guest:guest_id(full_name, email), unit:unit_id(unit_number, unit_type:unit_type_id(name))").single();

    if (error) { showToast(error.message, "error"); setLoading(false); return; }

    if (form.is_walk_in) {
      await supabase.from("units").update({ status: "occupied" }).eq("id", form.unit_id);
      sendInvoice(data.id);
      setInvoiceData(buildInvoiceData(data));
      setInvoiceOpen(true);
      showToast("Walk-in checked in. Invoice ready.");
    } else {
      showToast("Reservation created");
    }

    setReservations((prev) => [data, ...prev]);
    setShowCreate(false);
    setForm(EMPTY_FORM);
    setLoading(false);
  }

  async function handleCheckIn() {
    if (!checkInTarget) return;

    if (!checkInForm.first_name || !checkInForm.surname || !checkInForm.sex ||
      !checkInForm.id_number || !checkInForm.id_type || !checkInForm.contact ||
      !checkInForm.emergency_contact || !checkInForm.payment_method) {
      showToast("Please fill in all required fields", "error"); return;
    }
    if (!checkInForm.disclaimer_agreed) {
      showToast("Guest must agree to the disclaimer", "error"); return;
    }
    if (sigPadRef.current && sigPadRef.current.isEmpty()) {
      showToast("Guest signature is required", "error"); return;
    }

    setLoading(true);
    const now = new Date().toISOString();
    const subtotal = checkInTarget.total_amount ?? 0;
const tax = subtotal * parseFloat(checkInForm.tax_percent || "0") / 100;
const discount = subtotal * parseFloat(checkInForm.discount_percent || "0") / 100;

    const { error } = await supabase.from("reservations").update({
      status: "checked_in",
      check_in_time: now,
      invoice_sent: true,
      guest_first_name: checkInForm.first_name,
      guest_surname: checkInForm.surname,
      guest_sex: checkInForm.sex,
      guest_id_number: checkInForm.id_number,
      guest_id_type: checkInForm.id_type,
      guest_contact: checkInForm.contact,
      guest_emergency_contact: checkInForm.emergency_contact,
      payment_method: checkInForm.payment_method,
      disclaimer_agreed: checkInForm.disclaimer_agreed,
      number_of_persons: parseInt(checkInForm.number_of_persons || "1"),
      tax_amount: tax,
      discount_amount: discount,
      is_vip: checkInForm.is_vip,
    }).eq("id", checkInTarget.id);

    if (error) { showToast(error.message, "error"); setLoading(false); return; }

    await supabase.from("units").update({ status: "occupied" }).eq("id", checkInTarget.unit_id);

    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const sigData = sigPadRef.current.toDataURL("image/png");
      await supabase.from("signatures").insert({
        reservation_id: checkInTarget.id,
        file_path: sigData,
        captured_by: currentStaffId,
      });
    }

    sendInvoice(checkInTarget.id);
    setInvoiceData(buildInvoiceData({ ...checkInTarget, status: "checked_in", check_in_time: now }, tax, discount, checkInForm.is_vip));
    setReservations((prev) => prev.map((r) => r.id === checkInTarget.id ? { ...r, status: "checked_in", check_in_time: now } : r));
    setCheckInTarget(null);
    setCheckInForm(EMPTY_CHECKIN);
    setLoading(false);
    setInvoiceOpen(true);
    showToast(checkInTarget.guest?.email ? "Guest checked in. Invoice sent to email." : "Guest checked in.");
  }

  async function handleCheckOut() {
    if (!checkOutTarget) return;
    setLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("reservations").update({ status: "checked_out", check_out_time: now }).eq("id", checkOutTarget.id);
    if (error) { showToast(error.message, "error"); setLoading(false); return; }
    await supabase.from("units").update({ status: "cleaning" }).eq("id", checkOutTarget.unit_id);
    const { data: frontDeskStaff } = await supabase.from("staff").select("id")
      .eq("property_id", propertyId).in("role", ["owner", "manager", "receptionist"]).eq("is_active", true);
    if (frontDeskStaff) {
      await supabase.from("notifications").insert(
        frontDeskStaff.map((s) => ({
          recipient_id: s.id,
          title: "Guest Checked Out",
          body: `Unit ${checkOutTarget.unit?.unit_number} has been checked out and is now being cleaned.`,
          link: "/dashboard/units",
        }))
      );
    }
    setReservations((prev) => prev.map((r) => r.id === checkOutTarget.id ? { ...r, status: "checked_out", check_out_time: now } : r));
    setCheckOutTarget(null);
    setLoading(false);
    showToast("Guest checked out. Unit set to Cleaning.");
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setLoading(true);
    const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", cancelTarget.id);
    setLoading(false);
    if (error) { showToast(error.message, "error"); return; }
    setReservations((prev) => prev.map((r) => r.id === cancelTarget.id ? { ...r, status: "cancelled" } : r));
    setCancelTarget(null);
    showToast("Reservation cancelled");
  }

  const selectClass = "h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Reservations ({reservations.length})</CardTitle>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> New Reservation</Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SearchFilterBar
            searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by guest or unit…"
            filterOptions={[{ label: "All", value: "all" }, ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ label: l, value: v }))]}
            activeFilter={filter} onFilterChange={setFilter}
          />
          <Table>
            <TableHead><tr>
              <TableHeaderCell>Guest</TableHeaderCell>
              <TableHeaderCell>Unit</TableHeaderCell>
              <TableHeaderCell>Check-in</TableHeaderCell>
              <TableHeaderCell>Check-out</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </tr></TableHead>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted py-8">No reservations found</TableCell></TableRow>}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.guest?.full_name ?? "—"}</TableCell>
                  <TableCell numeric>{r.unit?.unit_number ?? "—"}</TableCell>
                  <TableCell numeric>{r.check_in_date}</TableCell>
                  <TableCell numeric>{r.check_out_date}</TableCell>
                  <TableCell numeric>{r.currency} {r.total_amount?.toFixed(2) ?? "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {r.status === "reserved" && (
                        <>
                          <button type="button" onClick={() => { setCheckInTarget(r); setCheckInForm(EMPTY_CHECKIN); }} className="flex items-center gap-1 text-xs text-success hover:underline"><LogIn size={12} /> Check In</button>
                          <button type="button" onClick={() => setCancelTarget(r)} className="text-muted hover:text-danger"><X size={13} /></button>
                        </>
                      )}
                      {r.status === "checked_in" && (
                        <button type="button" onClick={() => setCheckOutTarget(r)} className="flex items-center gap-1 text-xs text-accent hover:underline"><LogOut size={12} /> Check Out</button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Reservation Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="New Reservation">
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.is_walk_in} onChange={(e) => setForm((f) => ({ ...f, is_walk_in: e.target.checked }))} className="accent-accent" />
            Walk-in guest (check in immediately)
          </label>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Guest *</label>
            <select value={form.guest_id} onChange={(e) => setForm((f) => ({ ...f, guest_id: e.target.value }))} className={selectClass}>
              <option value="">Select guest…</option>
              {guests.map((g) => <option key={g.id} value={g.id}>{g.full_name} {g.phone ? `(${g.phone})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Unit *</label>
            <select value={form.unit_id} onChange={(e) => {
              const unit = units.find((u) => u.id === e.target.value);
              setForm((f) => ({ ...f, unit_id: e.target.value, rate_ghs: unit?.unit_type?.base_price_ghs?.toString() ?? "", rate_usd: unit?.unit_type?.base_price_usd?.toString() ?? "" }));
            }} className={selectClass}>
              <option value="">Select unit…</option>
              {(form.is_walk_in ? availableUnits : units).map((u) => (
                <option key={u.id} value={u.id}>{u.unit_number} — {u.unit_type?.name} ({u.status})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Check-in Date *</label>
              <Input type="date" value={form.check_in_date} onChange={(e) => setForm((f) => ({ ...f, check_in_date: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Check-out Date *</label>
              <Input type="date" value={form.check_out_date} onChange={(e) => setForm((f) => ({ ...f, check_out_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Currency</label>
            <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className={selectClass}>
              <option value="GHS">GHS — Ghana Cedis</option>
              <option value="USD">USD — US Dollars</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nightly Rate ({form.currency})</label>
            <Input type="number" value={form.currency === "GHS" ? form.rate_ghs : form.rate_usd}
              onChange={(e) => setForm((f) => form.currency === "GHS" ? { ...f, rate_ghs: e.target.value } : { ...f, rate_usd: e.target.value })} />
          </div>
          {form.check_in_date && form.check_out_date && (
            <div className="rounded-md border border-border bg-surface p-3 text-sm">
              <span className="text-muted">Nights: </span><span className="font-numeric font-medium">{Math.max(0, differenceInDays(new Date(form.check_out_date), new Date(form.check_in_date)))}</span>
              <span className="mx-3 text-muted">|</span>
              <span className="text-muted">Total: </span><span className="font-numeric font-medium">{form.currency} {calcTotal(form).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.guest_id || !form.unit_id || !form.check_in_date || !form.check_out_date}>
              {loading ? "Creating…" : form.is_walk_in ? "Check In Now" : "Create Reservation"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Check In Dialog */}
      <Dialog open={!!checkInTarget} onClose={() => setCheckInTarget(null)} title="Guest Check-In Form">
        {checkInTarget && (
          <div className="flex flex-col gap-5">

            {/* Reservation summary */}
            <div className="rounded-md border border-border bg-surface p-3 text-sm grid grid-cols-2 gap-1">
              <p><span className="text-muted">Unit:</span> <span className="font-medium">{checkInTarget.unit?.unit_number}</span></p>
              <p><span className="text-muted">Type:</span> <span className="font-medium">{(checkInTarget.unit as any)?.unit_type?.name}</span></p>
              <p><span className="text-muted">Check-in:</span> <span className="font-numeric">{checkInTarget.check_in_date}</span></p>
              <p><span className="text-muted">Check-out:</span> <span className="font-numeric">{checkInTarget.check_out_date}</span></p>
              <p><span className="text-muted">Rate:</span> <span className="font-numeric">{checkInTarget.currency} {(checkInTarget.currency === "GHS" ? checkInTarget.rate_ghs : checkInTarget.rate_usd)?.toFixed(2)}/night</span></p>
              <p><span className="text-muted">Total:</span> <span className="font-numeric font-medium">{checkInTarget.currency} {checkInTarget.total_amount?.toFixed(2)}</span></p>
            </div>

            {/* Guest Details */}
            <div>
              <p className="text-sm font-semibold mb-3 text-accent">Guest Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">First Name *</label>
                  <Input value={checkInForm.first_name} onChange={(e) => setCheckInForm((f) => ({ ...f, first_name: e.target.value }))} placeholder="First name" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Surname *</label>
                  <Input value={checkInForm.surname} onChange={(e) => setCheckInForm((f) => ({ ...f, surname: e.target.value }))} placeholder="Surname" />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Sex *</label>
              <div className="flex gap-6">
                {["Male", "Female"].map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="sex" value={s} checked={checkInForm.sex === s}
                      onChange={(e) => setCheckInForm((f) => ({ ...f, sex: e.target.value }))} className="accent-accent" />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">ID Type *</label>
                <select value={checkInForm.id_type} onChange={(e) => setCheckInForm((f) => ({ ...f, id_type: e.target.value }))} className={selectClass}>
                  <option value="">Select…</option>
                  <option>Ghana Card</option>
                  <option>Passport</option>
                  <option>Voter ID</option>
                  <option>Driver's License</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">ID Number *</label>
                <Input value={checkInForm.id_number} onChange={(e) => setCheckInForm((f) => ({ ...f, id_number: e.target.value }))} placeholder="ID number" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Contact *</label>
                <Input value={checkInForm.contact} onChange={(e) => setCheckInForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Phone number" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Number of Persons *</label>
                <Input type="number" min="1" value={checkInForm.number_of_persons} onChange={(e) => setCheckInForm((f) => ({ ...f, number_of_persons: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Emergency Contact (Person & Number) *</label>
              <Input value={checkInForm.emergency_contact} onChange={(e) => setCheckInForm((f) => ({ ...f, emergency_contact: e.target.value }))} placeholder="e.g. Jane Doe — 024 000 0000" />
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-sm font-semibold mb-2 text-accent">Payment Method *</p>
              <div className="grid grid-cols-2 gap-2">
                {["Cash", "Company Account", "MoMo (Mobile Money)", "POS"].map((method) => (
                  <label key={method} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2 hover:bg-surface-raised">
                    <input type="radio" name="payment" value={method} checked={checkInForm.payment_method === method}
                      onChange={(e) => setCheckInForm((f) => ({ ...f, payment_method: e.target.value }))} className="accent-accent" />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            {/* Tax, Discount & VIP */}
            <div>
              <p className="text-sm font-semibold mb-3 text-accent">Billing Adjustments</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
  <label className="mb-1.5 block text-sm font-medium">Tax (%)</label>
  <Input type="number" min="0" max="100" value={checkInForm.tax_percent}
    onChange={(e) => setCheckInForm((f) => ({ ...f, tax_percent: e.target.value }))}
    placeholder="0" />
</div>
<div>
  <label className="mb-1.5 block text-sm font-medium">Discount (%)</label>
  <Input type="number" min="0" max="100" value={checkInForm.discount_percent}
    onChange={(e) => setCheckInForm((f) => ({ ...f, discount_percent: e.target.value }))}
    placeholder="0" />
</div>
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium">VIP Guest</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="is_vip" checked={checkInForm.is_vip === true}
                      onChange={() => setCheckInForm((f) => ({ ...f, is_vip: true }))} className="accent-accent" />
                    Yes — VIP
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="is_vip" checked={checkInForm.is_vip === false}
                      onChange={() => setCheckInForm((f) => ({ ...f, is_vip: false }))} className="accent-accent" />
                    No
                  </label>
                </div>
              </div>
              {/* Live total calculation */}
              <div className="mt-3 rounded-md border border-border bg-surface p-3 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="font-numeric">{checkInTarget.currency} {checkInTarget.total_amount?.toFixed(2)}</span>
                </div>
                {parseFloat(checkInForm.tax_percent || "0") > 0 && (
  <div className="flex justify-between text-muted">
    <span>Tax ({checkInForm.tax_percent}%)</span>
    <span className="font-numeric">+ {checkInTarget.currency} {((checkInTarget.total_amount ?? 0) * parseFloat(checkInForm.tax_percent) / 100).toFixed(2)}</span>
  </div>
)}
{parseFloat(checkInForm.discount_percent || "0") > 0 && (
  <div className="flex justify-between text-muted">
    <span>Discount ({checkInForm.discount_percent}%)</span>
    <span className="font-numeric text-success">- {checkInTarget.currency} {((checkInTarget.total_amount ?? 0) * parseFloat(checkInForm.discount_percent) / 100).toFixed(2)}</span>
  </div>
)}
<div className="flex justify-between font-semibold text-foreground border-t border-border mt-2 pt-2">
  <span>Total Due</span>
  <span className="font-numeric text-accent">
    {checkInTarget.currency} {(
      (checkInTarget.total_amount ?? 0) *
      (1 + parseFloat(checkInForm.tax_percent || "0") / 100 - parseFloat(checkInForm.discount_percent || "0") / 100)
    ).toFixed(2)}
  </span>
</div>
              </div>
            </div>

            {/* Disclaimer */}
            <div>
              <p className="text-sm font-semibold mb-2 text-accent">Disclaimer</p>
              <div className="rounded-md border border-border bg-surface p-3 h-40 overflow-y-auto text-xs text-muted leading-relaxed whitespace-pre-line">
                {DISCLAIMER}
              </div>
              <div className="mt-3 flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                  <input type="radio" name="disclaimer" checked={checkInForm.disclaimer_agreed === true}
                    onChange={() => setCheckInForm((f) => ({ ...f, disclaimer_agreed: true }))} className="accent-accent" />
                  A — Yes, I agree
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-muted">
                  <input type="radio" name="disclaimer" checked={checkInForm.disclaimer_agreed === false}
                    onChange={() => setCheckInForm((f) => ({ ...f, disclaimer_agreed: false }))} className="accent-accent" />
                  B — No
                </label>
              </div>
            </div>

            {/* Signature */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Guest Signature *</label>
              <p className="text-xs text-muted mb-2">Ask the guest to sign below using their finger or mouse</p>
              <div className="rounded-md border-2 border-border bg-white">
                <SignatureCanvas
                  ref={sigPadRef}
                  canvasProps={{ width: 460, height: 150, className: "w-full rounded-md" }}
                  backgroundColor="white"
                />
              </div>
              <button type="button" onClick={() => sigPadRef.current?.clear()} className="mt-1 text-xs text-muted hover:text-danger">Clear signature</button>
            </div>

            <p className="text-xs text-muted">
              {checkInTarget.guest?.email
                ? `Invoice will be emailed to ${checkInTarget.guest.email} and shown on screen.`
                : "No email on file — invoice will be shown on screen only."}
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCheckInTarget(null)}>Cancel</Button>
              <Button onClick={handleCheckIn} disabled={loading}>
                <LogIn size={14} /> {loading ? "Checking in…" : "Confirm Check In"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={!!checkOutTarget} onCancel={() => setCheckOutTarget(null)} onConfirm={handleCheckOut}
        title="Check Out Guest"
        description={`Check out ${checkOutTarget?.guest?.full_name} from unit ${checkOutTarget?.unit?.unit_number}? The unit will be set to Cleaning automatically.`}
        confirmLabel="Check Out" isLoading={loading} />

      <ConfirmDialog open={!!cancelTarget} onCancel={() => setCancelTarget(null)} onConfirm={handleCancel}
        title="Cancel Reservation"
        description={`Cancel the reservation for ${cancelTarget?.guest?.full_name}? This cannot be undone.`}
        confirmLabel="Cancel Reservation" destructive isLoading={loading} />

      <InvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} data={invoiceData} />
    </>
  );
}