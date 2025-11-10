"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { EventList } from "./event-list";
import type { EventsSnapshot } from "@/lib/react-query/query-functions";
import { useEventsQuery } from "@/lib/react-query/hooks";
import { useEventsRealtime } from "@/lib/hooks/use-realtime-invalidation";

const EventComposer = dynamic(
  () => import("./event-composer").then((mod) => mod.EventComposer),
  { ssr: false, loading: () => <EventComposerSkeleton /> }
);

function EventComposerSkeleton() {
  return (
    <div className="h-[300px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60" />
  );
}

type EventsProps = {
  schoolId: string;
  fallbackData?: EventsSnapshot;
};

export function Events({ schoolId, fallbackData }: EventsProps) {
  const query = useEventsQuery(schoolId);
  useEventsRealtime(schoolId);

  const snapshot = query.data ?? fallbackData;

  // Show loading state while fetching data for the first time
  if (!snapshot && query.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Lade Termine...
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-6 text-sm text-red-600 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
        Fehler beim Laden der Termine.
      </div>
    );
  }

  if (snapshot.profileMissing) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Dein Profil ist noch nicht vollständig. Bitte kontaktiere den Admin, damit dir eine
        Schule zugewiesen wird.
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Termine &amp; RSVPs</p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Bevorstehende Veranstaltungen
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Koordiniere Elternabende, schulweite Treffen und informiere Teilnehmende mit
          automatischen Erinnerungen.
        </p>
      </header>

      {snapshot.composerScopes.length > 0 ? (
        <Suspense fallback={<EventComposerSkeleton />}>
          <EventComposer
            scopes={snapshot.composerScopes}
            remindersAvailable={snapshot.remindersAvailable}
          />
        </Suspense>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Anstehende Termine
        </h2>
        <EventList events={snapshot.events} />
      </section>
    </section>
  );
}
