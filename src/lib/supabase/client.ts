import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Use this client inside Client Components ("use client").
 * It only ever has the anon key — safe for the browser. Row Level
 * Security in Postgres is what actually enforces who can see/change
 * what; this client has no elevated access.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
