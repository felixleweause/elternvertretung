"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PollCloseButtonProps = {
  pollId: string;
};

export function PollCloseButton({ pollId }: PollCloseButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/polls/${pollId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "closed" }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError(
            data?.error ?? "Die Umfrage konnte nicht geschlossen werden. Versuch es später erneut."
          );
          return;
        }

        router.refresh();
      } catch (err) {
        console.error("Failed to close poll", err);
        setError("Unbekannter Fehler beim Schließen der Umfrage.");
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={handleClose} disabled={isPending}>
        Umfrage schließen
      </Button>
      {error ? <span className="text-sm text-rose-600 dark:text-rose-400">{error}</span> : null}
    </div>
  );
}
