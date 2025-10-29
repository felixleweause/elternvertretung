import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getServerSupabase } from "@/lib/supabase/server";
import { EventsScreen } from "@/components/events/events-screen";
import { eventsKeys } from "@/lib/react-query/query-keys";
import { loadEventsSnapshot } from "@/lib/react-query/query-functions";

type MetadataType = Metadata;

export const metadata: MetadataType = {
  title: "Termine",
};

export default async function EventsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: eventsKeys.all,
    queryFn: () => loadEventsSnapshot(supabase, user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EventsScreen />
    </HydrationBoundary>
  );
}
