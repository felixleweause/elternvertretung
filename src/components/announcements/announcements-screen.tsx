"use client";

import { useAnnouncementsQuery } from "@/lib/react-query/hooks";
import { useSchoolId } from "@/lib/hooks/use-school-id";
import { useAnnouncementsRealtime } from "@/lib/hooks/use-realtime-invalidation";
import { useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnnouncementFeed } from "./announcement-feed";

export function AnnouncementsScreen() {
  const user = useUser();
  const router = useRouter();
  const schoolId = useSchoolId();
  const { data, isLoading, isFetching } = useAnnouncementsQuery(schoolId || "");
  
  // Handle auth and onboarding redirects
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    
    if (!schoolId) {
      router.push("/app/onboarding");
      return;
    }
  }, [user, schoolId, router]);

  // Enable realtime updates
  if (schoolId) {
    useAnnouncementsRealtime(schoolId);
  }

  // Show loading while checking auth/onboarding
  if (!user || !schoolId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );
  }

  // Show content immediately if we have data, even if refetching
  if (data) {
    return (
      <AnnouncementFeed
        announcements={data.announcements}
        composerScopes={data.composerScopes}
        isFetching={isFetching} // Pass fetching state for top-bar spinner
      />
    );
  }

  // Show loading state only if we don't have any data yet
  if (!data && isLoading) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Lade Ankündigungen ...
      </p>
    );
  }

  if (data?.profileMissing) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Deinem Account ist noch keine Schule zugeordnet. Bitte kontaktiere den Admin,
        damit dir eine Schule zugewiesen wird.
      </div>
    );
  }

  // Fallback - should not reach here with proper bootstrap
  return (
    <AnnouncementFeed
      announcements={[]}
      composerScopes={[]}
      isFetching={false}
    />
  );
}
