import { createClient } from "@/lib/supabase/server";
import { BreakfastOrderForm } from "@/components/breakfast/breakfast-order-form";

interface Props {
  searchParams: { unit?: string; reservation?: string };
}

export default async function BreakfastPage({ searchParams }: Props) {
  const { unit: unitId, reservation: reservationId } = searchParams;

  if (!unitId || !reservationId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="font-heading text-xl font-semibold">Invalid QR Code</h1>
          <p className="mt-2 text-sm text-muted">Please scan the QR code in your apartment to order breakfast.</p>
        </div>
      </main>
    );
  }

  const supabase = createClient();

  const { data: reservationData } = await supabase
    .from("reservations")
    .select("id, status, check_in_date, check_out_date, unit:unit_id(unit_number, unit_type:unit_type_id(name))")
    .eq("id", reservationId)
    .eq("unit_id", unitId)
    .eq("status", "checked_in")
    .single();

  const reservation = reservationData as any;

  if (!reservation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="font-heading text-xl font-semibold">No Active Reservation</h1>
          <p className="mt-2 text-sm text-muted">We could not find an active reservation for this unit. Please contact the front desk.</p>
        </div>
      </main>
    );
  }

  const { data: categories } = await supabase
    .from("breakfast_categories")
    .select("*, items:breakfast_items(*)")
    .eq("is_active", true)
    .order("display_order");

  const { data: specialConfig } = await supabase
    .from("breakfast_special_config")
    .select("*")
    .single();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const forDate = tomorrow.toISOString().split("T")[0];

  const { data: existingOrder } = await supabase
    .from("breakfast_orders")
    .select("id, category_id, is_special, number_of_guests, status")
    .eq("reservation_id", reservationId)
    .eq("for_date", forDate)
    .single();

  const unitTypeName = reservation.unit?.unit_type?.name ?? "";
  const maxGuests =
    unitTypeName.includes("Studio") ? 2 :
    unitTypeName.includes("1") ? 2 :
    unitTypeName.includes("2") ? 4 : 6;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-semibold">Kayla City ApartHotel</h1>
          <p className="mt-1 text-sm text-muted">Breakfast Selection</p>
          <div className="mt-3 rounded-md border border-border bg-surface p-3 text-sm">
            <p className="font-medium">Unit {reservation.unit?.unit_number} — {unitTypeName}</p>
            <p className="text-muted">For tomorrow morning: <span className="font-numeric text-foreground">{forDate}</span></p>
          </div>
        </div>
        <BreakfastOrderForm
          reservationId={reservationId}
          unitId={unitId}
          forDate={forDate}
          categories={categories ?? []}
          specialConfig={specialConfig}
          maxGuests={maxGuests}
          existingOrder={existingOrder}
        />
      </div>
    </main>
  );
}