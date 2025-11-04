"use client";

import { useEventsQuery } from "@/lib/react-query/hooks";
import { useSchoolId } from "@/lib/hooks/use-school-id";
import { useEventsRealtime } from "@/lib/hooks/use-realtime-invalidation";
import { useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { EventComposer } from "./event-composer";
import { EventList } from "./event-list";

export function EventsScreen() {
  const user = useUser();
  const router = useRouter();
  const schoolId = useSchoolId();
  const { data, isLoading } = useEventsQuery(schoolId || "");
  
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
    useEventsRealtime(schoolId);
  }

  // Show loading while checking auth/onboarding
  if (!user || !schoolId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );
  }

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
