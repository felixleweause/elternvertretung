import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { AppShell } from "@/components/app/app-shell";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await getServerSupabase();
  const [
    { data: { session } },
    { data: { user } },
  ] = await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

  if (!session || !user) {
    redirect("/login");
  }

  return (
    <SupabaseProvider initialSession={session}>
      <AppShell user={user}>{children}</AppShell>
    </SupabaseProvider>
  );
}
