import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database";

export async function getServerSupabase<DB = Database>(): Promise<SupabaseClient<DB>> {
  const cookieStore = await cookies();
  return createServerComponentClient<DB>({
    cookies: () => cookieStore,
  });
}
