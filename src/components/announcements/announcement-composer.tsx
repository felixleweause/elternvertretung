"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AnnouncementScopeOption } from "./types";

type AnnouncementComposerProps = {
  scopes: AnnouncementScopeOption[];
};

export function AnnouncementComposer({ scopes }: AnnouncementComposerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scopeValue, setScopeValue] = useState(
    scopes.length > 0 ? encodeScope(scopes[0]) : ""
  );
  const [allowComments, setAllowComments] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = scopes.length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setError("Du hast keine Berechtigung, Ankündigungen zu posten.");
      return;
    }
    if (!title.trim()) {
      setError("Bitte gib einen Titel ein.");
      return;
    }
    if (!body.trim()) {
      setError("Bitte gib einen Inhalt ein.");
      return;
    }

    const decodedScope = decodeScope(scopeValue);
    if (!decodedScope) {
      setError("Bitte wähle einen gültigen Ankündigungsbereich aus.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/announcements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            scope_type: decodedScope.scopeType,
            scope_id: decodedScope.scopeId,
            allow_comments: allowComments,
            requires_ack: requiresAck,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          const message =
            payload?.error ??
            "Ankündigung konnte nicht erstellt werden. Bitte versuche es erneut.";
          setError(message);
          return;
        }

        setTitle("");
        setBody("");
        setAllowComments(false);
        setRequiresAck(false);
        setSuccess("Ankündigung veröffentlicht.");

        setTimeout(() => {
          setSuccess(null);
          router.refresh();
        }, 1200);
      } catch (err) {
        console.error("Failed to create announcement", err);
        setError(
          "Beim Senden ist ein Fehler aufgetreten. Bitte überprüfe deine Verbindung."
        );
      }
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Neue Ankündigung
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Teile Informationen mit deiner Klasse oder der gesamten Schule. Du kannst
          optional Lesebestätigung verlangen und Kommentare erlauben.
        </p>
      </header>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Bereich
          </label>
          <select
            value={scopeValue}
            onChange={(event) => setScopeValue(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-300"
            disabled={!canSubmit || isPending}
          >
            {scopes.map((scope) => (
              <option key={encodeScope(scope)} value={encodeScope(scope)}>
                {scope.label}
              </option>
            ))}
          </select>
          {!canSubmit ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Dir wurden noch keine Mandate zum Veröffentlichen zugewiesen.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label htmlFor="announcement-title" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Titel
          </label>
          <Input
            id="announcement-title"
            placeholder="z. B. Elternabend am 12. Oktober"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isPending}
            maxLength={160}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="announcement-body" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Nachricht
          </label>
          <Textarea
            id="announcement-body"
            placeholder="Teile alle wichtigen Informationen…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={isPending}
            rows={6}
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Markdown wird nicht unterstützt. Verwende Absätze, um den Text zu strukturieren.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              className="h-4 w-4 accent-zinc-900 dark:accent-zinc-300"
              checked={allowComments}
              onChange={(event) => setAllowComments(event.target.checked)}
              disabled={isPending}
            />
            Kommentare erlauben
          </label>
          <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              className="h-4 w-4 accent-zinc-900 dark:accent-zinc-300"
              checked={requiresAck}
              onChange={(event) => setRequiresAck(event.target.checked)}
              disabled={isPending}
            />
            Lesebestätigung anfordern
          </label>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {error ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            ) : null}
            {success ? (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {success}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={!canSubmit || isPending}
              className={cn(!canSubmit && "cursor-not-allowed opacity-70")}
            >
              {isPending ? "Sende..." : "Veröffentlichen"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function encodeScope(scope: AnnouncementScopeOption): string {
  return `${scope.scopeType}:${scope.scopeId}`;
}

function decodeScope(value: string): AnnouncementScopeOption | null {
  const [scopeType, scopeId] = value.split(":");
  if (
    (scopeType === "class" || scopeType === "school") &&
    scopeId &&
    scopeId.length > 0
  ) {
    return {
      scopeType,
      scopeId,
      label: "",
    };
  }
  return null;
}
