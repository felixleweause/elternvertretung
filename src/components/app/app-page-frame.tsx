import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { DehydratedState } from "@tanstack/react-query";
import { AppShell } from "@/components/app/app-shell";
import { AppProviders } from "@/components/providers/app-providers";

type AppPageFrameProps = {
  children: ReactNode;
  user: User;
  dehydratedState?: DehydratedState | null;
  schoolId?: string | null;
};

export function AppPageFrame({
  children,
  user,
  dehydratedState,
  schoolId,
}: AppPageFrameProps) {
  return (
    <AppProviders initialUser={user} dehydratedState={dehydratedState}>
      <AppShell user={user} schoolId={schoolId ?? null}>
        {children}
      </AppShell>
    </AppProviders>
  );
}
