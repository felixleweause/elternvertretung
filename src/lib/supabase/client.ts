"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database";

let client: any = null;

export function getBrowserSupabaseClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return client;
}
