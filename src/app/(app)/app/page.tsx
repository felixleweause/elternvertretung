import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Übersicht | Elternvertretung",
};

export default async function AppHomePage() {
  const supabase = await getServerSupabase();
  const [
    { data: { user } },
    { data: enrollmentRecord, error: enrollmentError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("enrollments")
      .select("id")
      .limit(1)
      .maybeSingle(),
  ]);

  if (enrollmentError) {
    console.error("Failed to load enrollment info", enrollmentError);
  }

  if (!enrollmentRecord) {
    redirect("/app/onboarding");
  }

  const userName =
    user?.user_metadata?.name ?? user?.email ?? "Mitglied";

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Willkommen</p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Hallo {userName}!
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Hier entsteht das Cockpit für Eltern- und Schulelternvertretungen. Als Nächstes
          folgen Onboarding, Ankündigungen und Termine.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Nächste Schritte
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>• Onboarding mit Klassen-Code vorbereiten</li>
            <li>• Ankündigungs-Feed mit Lesebestätigung gestalten</li>
            <li>• Terminmodul inkl. RSVP und Erinnerungen planen</li>
          </ul>
        </div>
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 dark:border-zinc-900">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Zuletzt erledigt
          </h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            ✔ Datenbank-Basis und Mandats-Policies sind aktiv. Auth & UI-Shell sind jetzt bereit
            für die nächsten Features.
          </p>
        </div>
      </div>
    </section>
  );
}
