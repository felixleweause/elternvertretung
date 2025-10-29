"use client";

import { useAnnouncementsQuery } from "@/lib/react-query/hooks";
import { AnnouncementFeed } from "./announcement-feed";

export function AnnouncementsScreen() {
  const { data, isLoading } = useAnnouncementsQuery();

  if (!data || isLoading) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Lade Ankündigungen ...
      </p>
    );
  }

  if (data.profileMissing) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Deinem Account ist noch keine Schule zugeordnet. Bitte kontaktiere den Admin,
        damit dir eine Schule zugewiesen wird.
      </div>
    );
  }

  return (
    <AnnouncementFeed
      announcements={data.announcements}
      composerScopes={data.composerScopes}
    />
  );
}
