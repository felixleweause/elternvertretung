import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { AppShell } from "@/components/app/app-shell";

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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <SupabaseProvider initialSession={session}>
      <ReactQueryProvider>
        <AppShell user={user}>{children}</AppShell>
      </ReactQueryProvider>
    </SupabaseProvider>
  );
}
