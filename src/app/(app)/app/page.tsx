import { QueryClient, dehydrate } from "@tanstack/react-query";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Home } from "@/components/app/home";
import { AppPageFrame } from "@/components/app/app-page-frame";
import { homeKeys } from "@/lib/react-query/query-keys";
import { getHomeSnapshot } from "@/lib/data/snapshots";
import { withSupabaseAccessToken } from "@/lib/supabase/auth-context";

export default async function AppHomePage() {
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
    .select("school_id, name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.school_id) {
    redirect("/app/onboarding");
  }

  // Get session for access token (secure after getUser() validation)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    throw new Error("Failed to get authenticated session");
  }

  const homeData = await withSupabaseAccessToken(session.access_token, () =>
    getHomeSnapshot(user.id, profile.school_id)
  );

  const queryClient = new QueryClient();
  queryClient.setQueryData(homeKeys.overview(profile.school_id), homeData);
  const dehydratedState = dehydrate(queryClient);

  const userName = profile.name ?? user.email ?? "Mitglied";

  return (
    <AppPageFrame
      user={user}
      schoolId={profile.school_id}
      dehydratedState={dehydratedState}
    >
      <Home schoolId={profile.school_id} fallbackData={homeData} userName={userName} />
    </AppPageFrame>
  );
}
