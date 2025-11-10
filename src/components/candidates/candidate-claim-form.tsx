"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CandidateClaimFormProps = {
  initialCode?: string;
  disabled?: boolean;
};

type Status =
  | { kind: "idle"; message: null }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function CandidateClaimForm({ initialCode = "", disabled = false }: CandidateClaimFormProps) {
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: null });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) {
      setStatus({ kind: "error", message: "Bitte gib einen Code ein." });
      return;
    }

    startTransition(async () => {
      setStatus({ kind: "idle", message: null });

      try {
        const response = await fetch("/api/candidates/redeem", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | { data?: { alreadyClaimed?: boolean; pollId?: string } }
          | null;

        if (!response.ok) {
          const errorMessage = (body && "error" in body && body.error && typeof body.error === "string") 
            ? body.error 
            : "Der Code konnte nicht eingelöst werden.";
          
          setStatus({
            kind: "error",
            message: errorMessage,
          });
          return;
        }

        const alreadyClaimed =
          !!body && "data" in body && body.data?.alreadyClaimed === true;
        const pollId = body && "data" in body ? body.data?.pollId : null;

        setStatus({
          kind: "success",
          message: alreadyClaimed
            ? "Dieser Code wurde bereits mit deinem Konto verknüpft."
            : "Geschafft! Du bist jetzt als Kandidat:in verknüpft.",
        });

        // Weiterleitung zur Umfrage-Seite, wenn pollId vorhanden
        if (pollId) {
          setTimeout(() => {
            router.push(`/app/polls/${pollId}`);
          }, 1500);
        }
      } catch (error) {
        console.error("Failed to redeem candidate code", error);
        setStatus({
          kind: "error",
          message: "Unbekannter Fehler. Bitte versuche es später erneut.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Kandidaten-Code
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          disabled={disabled || isPending}
          inputMode="text"
          autoCapitalize="characters"
        />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={disabled || isPending}>
          {isPending ? "Wird verknüpft ..." : "Code einlösen"}
        </Button>
        {status.kind === "error" && status.message ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{status.message}</p>
        ) : null}
        {status.kind === "success" && status.message ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
