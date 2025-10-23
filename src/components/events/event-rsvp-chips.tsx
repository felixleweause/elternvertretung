"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { EventRsvpStatus } from "./types";

type EventRsvpChipsProps = {
  eventId: string;
  initialStatus: EventRsvpStatus | null;
};

type StatusConfig = {
  key: EventRsvpStatus;
  label: string;
  description: string;
  variant: "default" | "outline";
};

const OPTIONS: StatusConfig[] = [
  {
    key: "yes",
    label: "Ich komme",
    description: "Zusage",
    variant: "default",
  },
  {
    key: "maybe",
    label: "Vielleicht",
    description: "Noch unsicher",
    variant: "outline",
  },
  {
    key: "no",
    label: "Kann nicht",
    description: "Absage",
    variant: "outline",
  },
];

type MessageState = {
  text: string;
  type: "success" | "error";
};

export function EventRsvpChips({ eventId, initialStatus }: EventRsvpChipsProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<EventRsvpStatus | null>(initialStatus);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateStatus = (status: EventRsvpStatus) => {
    if (current === status) {
      return;
    }
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/rsvp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setMessage({
            text:
              data?.error ??
              "Die Rückmeldung konnte nicht gespeichert werden. Bitte versuche es erneut.",
            type: "error",
          });
          return;
        }

        setCurrent(status);
        setMessage({
          text: "Rückmeldung aktualisiert.",
          type: "success",
        });
        router.refresh();
      } catch (err) {
        console.error("Failed to update RSVP", err);
        setMessage({
          text:
            "Beim Speichern ist ein Fehler aufgetreten. Bitte überprüfe deine Verbindung.",
          type: "error",
        });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((option) => (
          <Button
            key={option.key}
            type="button"
            variant={current === option.key ? "default" : option.variant}
            className={
              current === option.key
                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                : "bg-white text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            }
            onClick={() => updateStatus(option.key)}
            disabled={isPending}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {current
          ? `Aktuelle Rückmeldung: ${
              current === "yes" ? "Zusage" : current === "maybe" ? "Vielleicht" : "Absage"
            }`
          : "Du hast noch keine Rückmeldung gegeben."}
      </p>
      {message ? (
        <p
          className={`text-sm font-medium ${
            message.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
