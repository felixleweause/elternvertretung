"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PollVotePanelProps = {
  pollId: string;
  options: {
    id: string;
    label: string;
  }[];
  allowAbstain: boolean;
  currentChoice: string | null;
  canVote: boolean;
  status: "draft" | "open" | "closed";
};

type VoteState = {
  error: string | null;
  success: string | null;
};

export function PollVotePanel({
  pollId,
  options,
  allowAbstain,
  currentChoice,
  canVote,
  status,
}: PollVotePanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [{ error, success }, setState] = useState<VoteState>({
    error: null,
    success: null,
  });
  const [isPending, startTransition] = useTransition();

  // Initialize selected choice, but allow changes
  useEffect(() => {
    if (currentChoice && !selected) {
      setSelected(currentChoice);
    }
  }, [currentChoice, selected]);

  const isClosed = status !== "open";
  const disabled = isClosed || !canVote || isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ error: null, success: null });

    if (!canVote) {
      setState({
        error: "Du bist nicht stimmberechtigt für diese Umfrage.",
        success: null,
      });
      return;
    }

    if (isClosed) {
      setState({
        error: "Die Umfrage ist bereits geschlossen.",
        success: null,
      });
      return;
    }

    if (!selected) {
      setState({
        error: "Bitte wähle eine Option aus.",
        success: null,
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/polls/${pollId}/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ choice: selected }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setState({
            error:
              data?.error ??
              "Deine Stimme konnte nicht gespeichert werden. Bitte versuche es erneut.",
            success: null,
          });
          return;
        }

        setState({
          error: null,
          success: "Stimme gespeichert.",
        });
        // Force hard refresh to ensure canVote is updated
        window.location.reload();
        setTimeout(() => {
          setState({ error: null, success: null });
        }, 1500);
      } catch (err) {
        console.error("Failed to submit vote", err);
        setState({
          error: "Unbekannter Fehler beim Speichern der Stimme.",
          success: null,
        });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Deine Stimme
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isClosed
            ? "Die Umfrage ist beendet. Stimmen können nicht mehr geändert werden."
            : canVote
              ? "Wähle eine Option aus, deine Stimme kann bis zum Abschluss angepasst werden."
              : "Du bist nicht stimmberechtigt für diese Umfrage."}
        </p>
      </header>

      <fieldset className="space-y-3" disabled={disabled}>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700 transition hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-700"
          >
            <input
              type="radio"
              name="poll-choice"
              value={option.id}
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
              className="h-4 w-4"
            />
            <span>{option.label}</span>
          </label>
        ))}
        {allowAbstain ? (
          <label
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 text-sm text-zinc-500 transition hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700"
          >
            <input
              type="radio"
              name="poll-choice"
              value="abstain"
              checked={selected === "abstain"}
              onChange={() => setSelected("abstain")}
              className="h-4 w-4"
            />
            <span>Enthaltung</span>
          </label>
        ) : null}
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={disabled}>
          Stimme speichern
        </Button>
        {error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : null}
        {success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
        ) : null}
      </div>
    </form>
  );
}
