import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InventoryBoard } from "@/components/inventory/inventory-board";

export default async function InventoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("staff")
    .select("role, property_id")
    .eq("id", user.id)
    .single();

  if (!me) redirect("/dashboard");

  const [{ data: categories }, { data: items }, { data: movements }] = await Promise.all([
    supabase.from("inventory_categories")
      .select("*")
      .eq("property_id", me.property_id!)
      .order("group_name")
      .order("display_order"),
    supabase.from("inventory_items")
      .select("*, category:category_id(name, group_name)")
      .eq("property_id", me.property_id!)
      .order("name"),
    supabase.from("stock_movements")
      .select("*, item:item_id(name, unit), recorder:recorded_by(full_name)")
      .eq("property_id", me.property_id!)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-muted">Track all stock across bar, breakfast and housekeeping.</p>
      </div>
      <InventoryBoard
        categories={categories ?? []}
        items={items ?? []}
        movements={movements ?? []}
        propertyId={me.property_id!}
        currentStaffId={user.id}
        currentRole={me.role as any}
      />
    </div>
  );
}