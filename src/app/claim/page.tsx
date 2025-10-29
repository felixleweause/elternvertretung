import Link from "next/link";
import { CandidateClaimForm } from "@/components/candidates/candidate-claim-form";
import { Button } from "@/components/ui/button";
import { getServerSupabase } from "@/lib/supabase/server";

type ClaimPageProps = {
  searchParams?: Promise<{
    c?: string;
  }>;
};

export default async function ClaimPage({ searchParams }: ClaimPageProps) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolved = searchParams ? await searchParams : {};
  const initialCode =
    typeof resolved.c === "string" && resolved.c.trim().length > 0
      ? resolved.c.trim().toUpperCase()
      : "";

  const nextParam = initialCode ? `/claim?c=${encodeURIComponent(initialCode)}` : "/claim";
  const loginHref = `/login?next=${encodeURIComponent(nextParam)}`;

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <section className="w-full max-w-2xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <header className="space-y-2">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Kandidatur bestätigen</p>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Code einlösen &amp; verknüpfen
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Mit diesem Code bestätigst du deine Kandidatur für die Klassenvertretung. Logge dich zuerst ein, gib anschließend den Code ein und du wirst automatisch der richtigen Klasse zugeordnet.
          </p>
        </header>

        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
          Der Code ist einmalig und zeitlich begrenzt. Bitte löse ihn erst ein, nachdem du dich mit deiner E-Mail-Adresse angemeldet hast.
        </aside>

        {!user ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            <p className="mb-3">
              Du bist noch nicht angemeldet. Nutze die Anmeldung per Magic-Link, danach kehrst du automatisch zu dieser Seite zurück.
            </p>
            <Button asChild>
              <Link href={loginHref}>Zur Anmeldung</Link>
            </Button>
          </div>
        ) : null}

        <CandidateClaimForm initialCode={initialCode} disabled={!user} />
      </section>
    </main>
  );
}
