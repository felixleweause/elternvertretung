import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { getServerSupabase } from "@/lib/supabase/server";
import { AnnouncementsScreen } from "@/components/announcements/announcements-screen";
import { announcementsKeys } from "@/lib/react-query/query-keys";
import { loadAnnouncementsSnapshot } from "@/lib/react-query/query-functions";

export const metadata: Metadata = {
  title: "Ankündigungen",
};

export default async function AnnouncementsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: announcementsKeys.all,
    queryFn: () => loadAnnouncementsSnapshot(supabase, user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnnouncementsScreen />
    </HydrationBoundary>
  );
}
