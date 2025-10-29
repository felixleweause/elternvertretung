"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CandidateCodeEntry = {
  id: string;
  office: "class_rep" | "class_rep_deputy";
  displayName: string;
  claimCode: string;
  claimUrl: string;
  status: string;
  expiresAt: string;
  userId: string | null;
  claimedAt: string | null;
};

type CandidateCodeManagerProps = {
  pollId: string;
  office: "class_rep" | "class_rep_deputy";
  initialCandidates: CandidateCodeEntry[];
};

const STATUS_LABEL: Record<string, string> = {
  created: "Code offen",
  claimed: "Eingelöst",
  pending_assignment: "Wartet auf Zuordnung",
  assigned: "Mandat vergeben",
  expired: "Abgelaufen",
};

export function CandidateCodeManager({ pollId, office, initialCandidates }: CandidateCodeManagerProps) {
  const [candidates, setCandidates] = useState<CandidateCodeEntry[]>(initialCandidates);
  const [draftNames, setDraftNames] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"generate" | "refresh" | null>(null);
  const [isPending, startTransition] = useTransition();

  const officeLabel = useMemo(() => {
    return office === "class_rep" ? "Klassenvertretung" : "Stellvertretung";
  }, [office]);

  const handleCopy = async (value: string, codeId: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopiedId(codeId);
        window.setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (copyError) {
      console.error("Failed to copy candidate code", copyError);
    }
  };

  const handleGenerate = () => {
    const names = Array.from(
      new Set(
        draftNames
          .split(/\n+/)
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      )
    );

    if (names.length === 0) {
      setError("Trage mindestens eine:n Kandidat:in ein (eine pro Zeile).");
      return;
    }

    setPendingAction("generate");
    startTransition(async () => {
      setError(null);
      setFeedback(null);
      try {
        const response = await fetch(`/api/polls/${pollId}/candidates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidates: names.map((displayName) => ({ office, displayName })),
          }),
        });

        const body = (await response.json().catch(() => null)) as
          | { data?: CandidateCodeEntry[]; error?: string }
          | null;

        if (!response.ok || !body?.data) {
          setError(body?.error ?? "Codes konnten nicht erzeugt werden.");
          return;
        }

        setCandidates(body.data);
        setDraftNames("");
        setFeedback(`Codes für ${body.data.length} Kandidat:innen aktualisiert.`);
      } catch (fetchError) {
        console.error("Failed to generate candidate codes", fetchError);
        setError("Unbekannter Fehler. Bitte versuche es später erneut.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleRefresh = () => {
    setPendingAction("refresh");
    startTransition(async () => {
      setError(null);
      setFeedback(null);
      try {
        const response = await fetch(`/api/polls/${pollId}/candidates`);
        const body = (await response.json().catch(() => null)) as
          | { data?: CandidateCodeEntry[]; error?: string }
          | null;
        if (!response.ok || !body?.data) {
          setError(body?.error ?? "Kandidatenliste konnte nicht geladen werden.");
          return;
        }
        setCandidates(body.data);
      } catch (fetchError) {
        console.error("Failed to refresh candidate codes", fetchError);
        setError("Aktualisierung fehlgeschlagen.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Kandidat:innen verwalten
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Amt: {officeLabel}. Codes sind einmalig gültig und verknüpfen Kandidat:innen mit dem Wahlergebnis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending && pendingAction === "refresh"}
          >
            {isPending && pendingAction === "refresh" ? "Aktualisiere..." : "Aktualisieren"}
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={`/api/polls/${pollId}/candidates/cards`} target="_blank" rel="noreferrer">
              PDF-Minipässe
            </a>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <Textarea
          value={draftNames}
          onChange={(event) => setDraftNames(event.target.value)}
          placeholder="Eine Kandidat:in pro Zeile"
          rows={4}
          className="text-sm"
          disabled={isPending && pendingAction === "generate"}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isPending && pendingAction === "generate"}
          >
            {isPending && pendingAction === "generate" ? "Erzeuge Codes..." : "Codes erzeugen"}
          </Button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Nach dem Generieren werden Codes unten angezeigt. Du kannst neue Namen jederzeit hinzufügen.
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
      {feedback ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{feedback}</p>
      ) : null}

      <ul className="space-y-3">
        {candidates.map((candidate) => {
          const expiry = new Date(candidate.expiresAt);
          const expiryLabel = Number.isNaN(expiry.getTime())
            ? "--"
            : expiry.toLocaleDateString("de-DE");
          const statusLabel = STATUS_LABEL[candidate.status] ?? candidate.status;
          const claimedInfo = candidate.claimedAt
            ? new Date(candidate.claimedAt).toLocaleString("de-DE")
            : null;
          return (
            <li
              key={candidate.id}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {candidate.displayName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Code: <span className="font-mono text-sm">{candidate.claimCode}</span> · gültig bis {expiryLabel}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Status: {statusLabel}
                    {claimedInfo ? ` · eingelöst am ${claimedInfo}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(candidate.claimCode, candidate.id)}
                  >
                    {copiedId === candidate.id ? "Code kopiert" : "Code kopieren"}
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <a href={candidate.claimUrl} target="_blank" rel="noreferrer">
                      Claim-Link
                    </a>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {candidates.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Noch keine Kandidat:innen erfasst – lege Namen an, um Codes zu generieren.
        </p>
      ) : null}
    </section>
  );
}
