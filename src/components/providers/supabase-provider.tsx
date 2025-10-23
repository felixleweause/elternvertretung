"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import type { Session } from "@supabase/supabase-js";
import { useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type SupabaseProviderProps = {
  children: React.ReactNode;
  initialSession: Session | null;
};

export function SupabaseProvider({
  children,
  initialSession,
}: SupabaseProviderProps) {
  const [client] = useState(() => getBrowserSupabaseClient());

  return (
    <SessionContextProvider supabaseClient={client} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}
