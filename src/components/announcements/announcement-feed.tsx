"use client";

import { AnnouncementCard } from "./announcement-card";
import { AnnouncementComposer } from "./announcement-composer";
import type {
  AnnouncementListItem,
  AnnouncementScopeOption,
} from "./types";

type AnnouncementFeedProps = {
  announcements: AnnouncementListItem[];
  composerScopes: AnnouncementScopeOption[];
};

export function AnnouncementFeed({
  announcements,
  composerScopes,
}: AnnouncementFeedProps) {
  return (
    <div className="flex flex-col gap-6">
      {composerScopes.length > 0 ? (
        <AnnouncementComposer scopes={composerScopes} />
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
