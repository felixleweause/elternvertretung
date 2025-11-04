import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { BootstrapProvider } from "@/components/providers/bootstrap-provider";
import { AppShell } from "@/components/app/app-shell";
import { getBootstrap } from "@/lib/bootstrap";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get session for client-side continuity (user is already verified via getUser())
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Fetch bootstrap data server-side
  const bootstrap = await getBootstrap(supabase, user.id);

  return (
    <SupabaseProvider initialSession={session}>
      <BootstrapProvider bootstrap={bootstrap}>
        <AppShell user={user}>{children}</AppShell>
      </BootstrapProvider>
    </SupabaseProvider>
  );
}
