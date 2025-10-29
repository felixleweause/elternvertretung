import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getServerSupabase } from "@/lib/supabase/server";
import { PollsScreen } from "@/components/polls/polls-screen";
import { pollsKeys } from "@/lib/react-query/query-keys";
import { loadPollsSnapshot } from "@/lib/react-query/query-functions";

export const metadata: Metadata = {
  title: "Umfragen",
};

export default async function PollsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: pollsKeys.all,
    queryFn: () => loadPollsSnapshot(supabase, user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PollsScreen />
    </HydrationBoundary>
  );
}
