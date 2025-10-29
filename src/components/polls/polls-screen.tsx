"use client";

import { usePollsQuery } from "@/lib/react-query/hooks";
import { PollComposer } from "./poll-composer";
import { PollList } from "./poll-list";

export function PollsScreen() {
  const { data, isLoading } = usePollsQuery();

  if (!data || isLoading) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Lade Umfragen ...
      </p>
    );
  }

  if (data.profileMissing) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Deinem Account ist noch keine Schule zugeordnet. Bitte kontaktiere die
        Administration, damit du Umfragen sehen und erstellen kannst.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Abstimmungen &amp; Entscheidungen</p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Umfragen verwalten
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Erstelle offene oder verdeckte Umfragen, sammle Stimmen pro Klasse und halte
          Quoren ein. Ergebnisse geheimer Abstimmungen bleiben bis zum Abschluss verborgen.
        </p>
      </header>

      {data.composerScopes.length > 0 ? (
        <PollComposer scopes={data.composerScopes} />
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          Du hast aktuell keine Berechtigung, Umfragen zu erstellen. Klassensprecher:innen
          und die GEV können Umfragen anlegen.
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Laufende &amp; vergangene Umfragen
        </h2>
        <PollList polls={data.polls} />
      </section>
    </section>
  );
}
