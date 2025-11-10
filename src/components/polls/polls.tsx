"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PollList } from "./poll-list";
import type { PollsSnapshot } from "@/lib/react-query/query-functions";
import { usePollsQuery } from "@/lib/react-query/hooks";
import { usePollsRealtime } from "@/lib/hooks/use-realtime-invalidation";

const PollComposer = dynamic(
  () => import("./poll-composer").then((mod) => mod.PollComposer),
  { ssr: false, loading: () => <PollComposerSkeleton /> }
);

function PollComposerSkeleton() {
  return (
    <div className="h-[260px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60" />
  );
}

type PollsProps = {
  schoolId: string;
  fallbackData?: PollsSnapshot;
};

export function Polls({ schoolId, fallbackData }: PollsProps) {
  const query = usePollsQuery(schoolId);
  usePollsRealtime(schoolId);

  const snapshot = query.data ?? fallbackData;

  // Show loading state while fetching data for the first time
  if (!snapshot && query.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Lade Umfragen...
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-6 text-sm text-red-600 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
        Fehler beim Laden der Umfragen.
      </div>
    );
  }

  if (snapshot.profileMissing) {
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

      {snapshot.composerScopes.length > 0 ? (
        <Suspense fallback={<PollComposerSkeleton />}>
          <PollComposer scopes={snapshot.composerScopes} />
        </Suspense>
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
        <PollList polls={snapshot.polls} />
      </section>
    </section>
  );
}
