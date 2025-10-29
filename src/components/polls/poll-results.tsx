import type { PollOption } from "./types";

type PollResultsProps = {
  options: PollOption[];
  totalVotes: number;
  resultsHidden: boolean;
};

export function PollResults({
  options,
  totalVotes,
  resultsHidden,
}: PollResultsProps) {
  if (resultsHidden) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-6 text-sm text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200">
        <h2 className="text-base font-semibold">Ergebnisse verborgen</h2>
        <p>
          Diese Umfrage ist verdeckt. Die Ergebnisse werden erst nach Ablauf oder nach
          dem Schließen durch die Moderation sichtbar.
        </p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Noch keine Stimmen abgegeben.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Ergebnisse
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Gesamt: {totalVotes} Stimme{totalVotes === 1 ? "" : "n"}
        </p>
      </header>
      <ul className="space-y-3">
        {options.map((option) => {
          const percentage =
            totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          return (
            <li key={option.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {option.label}
                </span>
                <span>
                  {option.votes} · {percentage}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all dark:bg-blue-400"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
