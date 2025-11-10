"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { AnnouncementCard } from "./announcement-card";
import type {
  AnnouncementListItem,
  AnnouncementScopeOption,
} from "./types";

const AnnouncementComposer = dynamic(
  () => import("./announcement-composer").then((mod) => mod.AnnouncementComposer),
  { ssr: false, loading: () => <AnnouncementComposerSkeleton /> }
);

function AnnouncementComposerSkeleton() {
  return (
    <div className="h-[260px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60" />
  );
}

type AnnouncementFeedProps = {
  announcements: AnnouncementListItem[];
  composerScopes: AnnouncementScopeOption[];
  isFetching?: boolean;
};

export function AnnouncementFeed({
  announcements,
  composerScopes,
  isFetching = false,
}: AnnouncementFeedProps) {
  return (
    <div className="flex flex-col gap-6">
      {composerScopes.length > 0 ? (
        <Suspense fallback={<AnnouncementComposerSkeleton />}>
          <AnnouncementComposer scopes={composerScopes} />
        </Suspense>
      ) : null}

      {isFetching ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Aktualisiere Daten …
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        {announcements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            Noch keine Ankündigungen vorhanden. Sobald deine Klassenvertretung oder
            GEV eine Nachricht veröffentlicht, erscheint sie hier.
          </p>
        ) : (
          announcements.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))
        )}
      </section>
    </div>
  );
}
