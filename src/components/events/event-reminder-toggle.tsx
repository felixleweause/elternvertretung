"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type EventReminderToggleProps = {
  eventId: string;
  initial24h: boolean;
  initial2h: boolean;
};

type MessageState = {
  text: string;
  type: "success" | "error";
};

export function EventReminderToggle({
  eventId,
  initial24h,
  initial2h,
}: EventReminderToggleProps) {
  const router = useRouter();
  const [remind24h, setRemind24h] = useState(initial24h);
  const [remind2h, setRemind2h] = useState(initial2h);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateReminders = (next24h: boolean, next2h: boolean) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            remind_24h: next24h,
            remind_2h: next2h,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setMessage({
            text:
              data?.error ??
              "Die Erinnerungseinstellungen konnten nicht gespeichert werden.",
            type: "error",
          });
          return;
        }

        setMessage({
          text: "Erinnerungen aktualisiert.",
          type: "success",
        });
        router.refresh();
      } catch (err) {
        console.error("Failed to update reminder settings", err);
        setMessage({
          text:
            "Beim Speichern ist ein Fehler aufgetreten. Bitte überprüfe deine Verbindung.",
          type: "error",
        });
      }
    });
  };

  const handle24h = (checked: boolean) => {
    setRemind24h(checked);
    updateReminders(checked, remind2h);
  };

  const handle2h = (checked: boolean) => {
    setRemind2h(checked);
    updateReminders(remind24h, checked);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        Erinnerungen
      </p>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
        <input
          type="checkbox"
          className="h-4 w-4 accent-zinc-900 dark:accent-zinc-300"
          checked={remind24h}
          onChange={(event) => handle24h(event.target.checked)}
          disabled={isPending}
        />
        24 Stunden vor dem Termin eine Erinnerung senden
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
        <input
          type="checkbox"
          className="h-4 w-4 accent-zinc-900 dark:accent-zinc-300"
          checked={remind2h}
          onChange={(event) => handle2h(event.target.checked)}
          disabled={isPending}
        />
        2 Stunden vor dem Termin eine Erinnerung senden
      </label>
      {message ? (
        <p
          className={`text-xs font-medium ${
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
