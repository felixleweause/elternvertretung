import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getServerSupabase } from "@/lib/supabase/server";
import { HomeScreen } from "@/components/app/home-screen";
import { homeKeys } from "@/lib/react-query/query-keys";
import { loadHomeSnapshot } from "@/lib/react-query/query-functions";

export const metadata: Metadata = {
  title: "Übersicht | Elternvertretung",
};

export default async function AppHomePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: homeKeys.overview,
    queryFn: () => loadHomeSnapshot(supabase, user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeScreen />
    </HydrationBoundary>
  );
}
