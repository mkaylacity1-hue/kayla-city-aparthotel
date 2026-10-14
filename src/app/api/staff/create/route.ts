import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { canCreateStaff } from "@/lib/auth/roles";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: meData, error: meError } = await supabase
      .from("staff")
      .select("role, property_id")
      .eq("id", user.id)
      .single();

    const me = meData as any;

    if (meError || !me || !canCreateStaff(me.role as any)) {
      return NextResponse.json({ error: "Only owners can create staff" }, { status: 403 });
    }

    const { full_name, email, password, role } = await req.json();

    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const { error: staffError } = await adminClient.from("staff").insert({
      id: newUser.user.id,
      property_id: me.property_id,
      full_name,
      role,
      is_active: true,
    });

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}