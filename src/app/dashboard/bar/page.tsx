import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BarBoard } from "@/components/bar/bar-board";

export default async function BarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("staff")
    .select("role, property_id")
    .eq("id", user.id)
    .single();

  if (!me) redirect("/dashboard");

  const [{ data: categories }, { data: items }, { data: orders }, { data: activeReservations }] = await Promise.all([
    supabase.from("bar_categories")
      .select("*")
      .eq("property_id", me.property_id!)
      .eq("is_active", true)
      .order("display_order"),
    supabase.from("bar_items")
      .select("*, category:category_id(name)")
      .eq("property_id", me.property_id!)
      .order("display_order"),
    supabase.from("bar_orders")
      .select("*, item:bar_item_id(name, price_ghs, price_usd), unit:unit_id(unit_number), recorder:recorded_by(full_name)")
      .eq("property_id", me.property_id!)
      .order("ordered_at", { ascending: false })
      .limit(50),
    supabase.from("reservations")
      .select("id, unit_id, guest:guest_id(full_name), unit:unit_id(unit_number)")
      .eq("property_id", me.property_id!)
      .eq("status", "checked_in"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Bar</h1>
        <p className="text-sm text-muted">Manage bar menu and record drink orders.</p>
      </div>
      <BarBoard
        categories={categories ?? []}
        items={items ?? []}
        orders={orders ?? []}
        activeReservations={activeReservations ?? []}
        propertyId={me.property_id!}
        currentStaffId={user.id}
        currentRole={me.role as any}
      />
    </div>
  );
}