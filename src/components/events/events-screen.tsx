"use client";

import { useEventsQuery } from "@/lib/react-query/hooks";
import { EventComposer } from "./event-composer";
import { EventList } from "./event-list";

export function EventsScreen() {
  const { data, isLoading } = useEventsQuery();

  if (!data || isLoading) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Lade Termine ...
      </p>
    );
  }

  if (data.profileMissing) {
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

      {data.composerScopes.length > 0 ? (
        <EventComposer
          scopes={data.composerScopes}
          remindersAvailable={data.remindersAvailable}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Anstehende Termine
        </h2>
        <EventList events={data.events} />
      </section>
    </section>
  );
}
