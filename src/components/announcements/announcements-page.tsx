"use client";

import { AnnouncementFeed } from "./announcement-feed";
import type { AnnouncementsSnapshot } from "@/lib/react-query/query-functions";
import { useAnnouncementsQuery } from "@/lib/react-query/hooks";
import { useAnnouncementsRealtime } from "@/lib/hooks/use-realtime-invalidation";

type AnnouncementsPageProps = {
  schoolId: string;
  fallbackData?: AnnouncementsSnapshot;
};

export function AnnouncementsPage({ schoolId, fallbackData }: AnnouncementsPageProps) {
  const query = useAnnouncementsQuery(schoolId);
  useAnnouncementsRealtime(schoolId);

  const snapshot = query.data ?? fallbackData;
  const isBackgroundFetching = query.isFetching && Boolean(query.data);

  // Show loading state while fetching data for the first time
  if (!snapshot && query.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Lade Ankündigungen...
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-6 text-sm text-red-600 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
        Fehler beim Laden der Ankündigungen.
      </div>
    );
  }

  if (snapshot.profileMissing) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Deinem Account ist noch keine Schule zugeordnet. Bitte schließe zunächst das Onboarding
        ab oder wende dich an die Administration.
      </div>
    );
  }

  return (
    <AnnouncementFeed
      announcements={snapshot.announcements}
      composerScopes={snapshot.composerScopes}
      isFetching={isBackgroundFetching}
    />
  );
}
