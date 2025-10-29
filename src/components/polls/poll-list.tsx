import Link from "next/link";
import type { PollListItem } from "./types";

type PollListProps = {
  polls: PollListItem[];
};

const deadlineFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function renderDeadline(deadline: string | null) {
  if (!deadline) {
    return "Keine Frist";
  }
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return "Keine Frist";
  }
  return deadlineFormatter.format(date);
}

function statusBadge(status: PollListItem["status"]) {
  switch (status) {
    case "open":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "closed":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
}

function typeBadge(type: PollListItem["type"]) {
  if (type === "secret") {
    return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
  }
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
}

function kindBadge(kind: PollListItem["kind"]) {
  if (kind === "election") {
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  }
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

export function PollList({ polls }: PollListProps) {
  if (polls.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Noch keine Umfragen vorhanden. Sobald deine Vertretung eine Umfrage startet,
        erscheint sie hier – inklusive Frist und Ergebnisstatus.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {polls.map((poll) => (
        <article
          key={poll.id}
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {poll.scopeType === "school" ? "Schule" : poll.scopeLabel}
                </span>
                <span className={`rounded-full px-2 py-0.5 ${statusBadge(poll.status)}`}>
                  {poll.status === "open"
                    ? "Laufend"
                    : poll.status === "closed"
                      ? "Abgeschlossen"
                      : "Entwurf"}
                </span>
                <span className={`rounded-full px-2 py-0.5 ${kindBadge(poll.kind)}`}>
                  {poll.kind === "election" ? "Klassenwahl" : "Abstimmung"}
                </span>
                <span className={`rounded-full px-2 py-0.5 ${typeBadge(poll.type)}`}>
                  {poll.type === "secret" ? "Verdeckt" : "Offen"}
                </span>
                {poll.allowAbstain ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Enthaltungen erlaubt
                  </span>
                ) : null}
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {poll.title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Frist: {renderDeadline(poll.deadline)}
                {poll.quorum ? ` · Quorum: ${poll.quorum}` : ""}
              </p>
            </div>
            <Link
              href={`/app/polls/${poll.id}`}
              className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600"
            >
              Details &amp; Stimme
            </Link>
          </header>
          {poll.description ? (
            <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
              {poll.description.length > 220
                ? `${poll.description.slice(0, 220)}…`
                : poll.description}
            </p>
          ) : null}
          <footer className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Ergebnisse:{" "}
              {poll.secretResultsHidden
                ? "Versteckt bis zum Abschluss"
                : `${poll.totalVotes} Stimme${poll.totalVotes === 1 ? "" : "n"}`}
            </span>
            <span>
              Angelegt von {poll.createdBy.name ?? poll.createdBy.email ?? "Unbekannt"} am{" "}
              {deadlineFormatter.format(new Date(poll.createdAt))}
            </span>
          </footer>
        </article>
      ))}
    </div>
  );
}
