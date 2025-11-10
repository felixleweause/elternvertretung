"use client";

import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { DehydratedState } from "@tanstack/react-query";
import { HydrationBoundary } from "@tanstack/react-query";
import { SupabaseProvider } from "./supabase-provider";

type AppProvidersProps = {
  children: ReactNode;
  initialUser: User | null;
  dehydratedState?: DehydratedState | null;
};

export function AppProviders({
  children,
  initialUser,
  dehydratedState,
}: AppProvidersProps) {
  const hasHydrationData = Boolean(
    dehydratedState &&
      ((dehydratedState as any).queries?.length || (dehydratedState as any).mutations?.length)
  );

  return (
    <SupabaseProvider initialUser={initialUser}>
      {hasHydrationData ? (
        <HydrationBoundary state={dehydratedState as any}>{children}</HydrationBoundary>
      ) : (
        children
      )}
    </SupabaseProvider>
  );
}
