import { QueryClient, dehydrate } from "@tanstack/react-query";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnnouncementsPage as AnnouncementsPageComponent } from "@/components/announcements/announcements-page";
import { AppPageFrame } from "@/components/app/app-page-frame";
import { announcementsKeys } from "@/lib/react-query/query-keys";
import { getAnnouncementsSnapshot } from "@/lib/data/snapshots";

export default async function AnnouncementsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile to check school
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.school_id) {
    redirect("/app/onboarding");
  }

  // Create empty query client - let client-side handle data fetching
  const queryClient = new QueryClient();
  const dehydratedState = dehydrate(queryClient);

  return (
    <AppPageFrame
      user={user}
      schoolId={profile.school_id}
      dehydratedState={dehydratedState}
    >
      <AnnouncementsPageComponent
        schoolId={profile.school_id}
        // No fallbackData - let client-side use prefetched data
      />
    </AppPageFrame>
  );
}
