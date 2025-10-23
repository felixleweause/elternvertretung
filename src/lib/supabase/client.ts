"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

type BrowserSupabaseClient<Database = Record<string, unknown>> = SupabaseClient<Database>;

let client: BrowserSupabaseClient | null = null;

export function getBrowserSupabaseClient<Database = Record<string, unknown>>(): BrowserSupabaseClient<Database> {
  if (!client) {
    client = createClientComponentClient<Database>();
  }

  return client as BrowserSupabaseClient<Database>;
}
