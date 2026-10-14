import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { canCreateStaff } from "@/lib/auth/roles";

export async function POST(req: Request) {
  try {
    const serverSupabase = createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: me } = await serverSupabase
      .from("staff")
      .select("role, property_id")
      .eq("id", user.id)
      .single();

    if (!me || !canCreateStaff(me.role as any)) {
      return NextResponse.json({ error: "Only owners can create staff" }, { status: 403 });
    }

    const { full_name, email, password, role, property_id } = await req.json();
    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Failed to create auth user" }, { status: 400 });
    }

    const { data: staffData, error: staffError } = await adminSupabase
      .from("staff")
      .insert({ id: authData.user.id, property_id, full_name, role, is_active: true })
      .select()
      .single();

    if (staffError) {
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: staffError.message }, { status: 400 });
    }

    return NextResponse.json({ staff: staffData });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
