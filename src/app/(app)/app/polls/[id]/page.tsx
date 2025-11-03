import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { fetchPollDetail } from "@/lib/supabase/poll-queries";
import { listCandidateRecords } from "@/lib/polls/candidate-service";
import { PollVotePanel } from "@/components/polls/poll-vote-panel";
import { PollResults } from "@/components/polls/poll-results";
import { PollCloseButton } from "@/components/polls/poll-close-button";
import { CandidateCodeManager } from "@/components/candidates/candidate-code-manager";

export const revalidate = 0;

const deadlineFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PollDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const poll = await fetchPollDetail(supabase, id, user.id);

  if (!poll) {
    notFound();
  }

  let candidateManagerData:
    | {
        id: string;
        office: "class_rep" | "class_rep_deputy";
        displayName: string;
        claimCode: string;
        claimUrl: string;
        status: string;
        expiresAt: string;
        userId: string | null;
        claimedAt: string | null;
      }[]
    | null = null;

  if (poll.kind === "election" && poll.canManage) {
    const rawCandidates = await listCandidateRecords(supabase, poll.id);
    candidateManagerData = rawCandidates.map((candidate) => ({
      id: candidate.id,
      office: candidate.office,
      displayName: candidate.displayName,
      claimCode: candidate.claimCode,
      claimUrl: `/claim?c=${encodeURIComponent(candidate.claimCode)}`,
      status: candidate.status,
      expiresAt: candidate.expiresAt,
      userId: candidate.userId,
      claimedAt: candidate.claimedAt,
    }));
  }

  const deadlineLabel = poll.deadline
    ? deadlineFormatter.format(new Date(poll.deadline))
    : "Keine Frist";
  const createdLabel = deadlineFormatter.format(new Date(poll.createdAt));

  const voteOptions = poll.options.filter((option) => option.id !== "abstain");

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app/polls"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Zurück zur Übersicht
        </Link>
        {poll.canManage && poll.status === "open" ? (
          <PollCloseButton pollId={poll.id} />
        ) : null}
      </div>

      <header className="space-y-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {poll.scopeType === "school" ? "Schule" : poll.scopeLabel}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              poll.status === "open"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : poll.status === "closed"
                  ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {poll.status === "open"
              ? "Laufend"
              : poll.status === "closed"
                ? "Abgeschlossen"
                : "Entwurf"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              poll.type === "secret"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            }`}
          >
            {poll.type === "secret" ? "Verdeckt" : "Offen"}
          </span>
          {poll.allowAbstain ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Enthaltungen erlaubt
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          {poll.title}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Frist: {deadlineLabel}
          {poll.quorum ? ` · Quorum: ${poll.quorum}` : ""}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Angelegt von {poll.createdBy.name ?? poll.createdBy.email ?? "Unbekannt"} am{" "}
          {createdLabel}
        </p>
      </header>

      {poll.kind === "election" && poll.canManage ? (
        <CandidateCodeManager
          pollId={poll.id}
          office={
            candidateManagerData && candidateManagerData.length > 0
              ? candidateManagerData[0].office
              : poll.mandateRule === "class_rep_deputy"
                ? "class_rep_deputy"
                : "class_rep"
          }
          initialCandidates={candidateManagerData ?? []}
        />
      ) : null}

      {poll.description ? (
        <article className="rounded-xl border border-zinc-200 bg-white p-6 text-sm leading-6 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {poll.description.split(/\n{2,}/).map((paragraph, index) => (
            <p key={`paragraph-${index}`} className="mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
        </article>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <PollResults
            options={poll.options}
            totalVotes={poll.totalVotes}
            resultsHidden={poll.resultsHidden}
          />
        </div>
        <PollVotePanel
          pollId={poll.id}
          options={voteOptions}
          allowAbstain={poll.allowAbstain}
          currentChoice={poll.myVote}
          canVote={poll.canVote}
          status={poll.status}
        />
      </div>
    </section>
  );
}
