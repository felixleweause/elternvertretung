"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EventScopeOption } from "./types";

type EventComposerProps = {
  scopes: EventScopeOption[];
  remindersAvailable?: boolean;
};

type ComposerState = {
  error: string | null;
  success: string | null;
};

function encodeScope(scope: EventScopeOption): string {
  return `${scope.scopeType}:${scope.scopeId}`;
}

function decodeScope(value: string): EventScopeOption | null {
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

export function EventComposer({
  scopes,
  remindersAvailable = true,
}: EventComposerProps) {
  const router = useRouter();
  const [scopeValue, setScopeValue] = useState(
    scopes.length > 0 ? encodeScope(scopes[0]) : ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [remind24h, setRemind24h] = useState(false);
  const [remind2h, setRemind2h] = useState(false);
  const [{ error, success }, setState] = useState<ComposerState>({
    error: null,
    success: null,
  });
  const [isPending, startTransition] = useTransition();

  const canSubmit = scopes.length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ error: null, success: null });

    if (!canSubmit) {
      setState({
        error: "Du hast keine Berechtigung, Termine anzulegen.",
        success: null,
      });
      return;
    }

    if (!title.trim()) {
      setState({
        error: "Bitte gib einen Titel ein.",
        success: null,
      });
      return;
    }

    if (!startAt) {
      setState({
        error: "Bitte wähle ein Startdatum.",
        success: null,
      });
      return;
    }

    const decodedScope = decodeScope(scopeValue);
    if (!decodedScope) {
      setState({
        error: "Bitte wähle einen gültigen Bereich aus.",
        success: null,
      });
      return;
    }

    const payload: Record<string, unknown> & {
      remind_24h?: boolean;
      remind_2h?: boolean;
    } = {
      title: title.trim(),
      description: description.trim() || null,
      scope_type: decodedScope.scopeType,
      scope_id: decodedScope.scopeId,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      location: location.trim() || null,
    };

    if (remindersAvailable) {
      payload.remind_24h = remind24h;
      payload.remind_2h = remind2h;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setState({
            error:
              data?.error ??
              "Der Termin konnte nicht gespeichert werden. Bitte versuche es erneut.",
            success: null,
          });
          return;
        }

        setTitle("");
        setDescription("");
        setStartAt("");
        setEndAt("");
        setLocation("");
        setRemind24h(false);
        setRemind2h(false);
        setState({
          error: null,
          success: "Termin erstellt.",
        });

        setTimeout(() => {
          router.refresh();
          setState({ error: null, success: null });
        }, 1200);
      } catch (err) {
        console.error("Failed to create event", err);
        setState({
          error:
            "Beim Speichern ist ein Fehler aufgetreten. Bitte überprüfe deine Verbindung.",
          success: null,
        });
      }
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Neuer Termin
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Plane Elternabende oder schulweite Termine und aktiviere Erinnerungen T-24h
          oder T-2h für alle Teilnehmenden.
        </p>
      </header>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label htmlFor="event-scope" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Bereich
          </label>
          <select
            id="event-scope"
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
              Dir wurden noch keine Mandate zum Anlegen von Terminen zugewiesen.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label htmlFor="event-title" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Titel
          </label>
          <Input
            id="event-title"
            placeholder="z. B. Klassenpflegschaft 6b"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isPending}
            maxLength={160}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="event-description" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Beschreibung (optional)
          </label>
          <Textarea
            id="event-description"
            placeholder="Agenda, gewünschte Rückmeldungen oder Mitbringliste…"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isPending}
            rows={5}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="event-start" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Start
            </label>
            <Input
              id="event-start"
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="event-end" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Ende (optional)
            </label>
            <Input
              id="event-end"
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="event-location" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Ort (optional)
          </label>
          <Input
            id="event-location"
            placeholder="z. B. Raum 201, Schuleingang B"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={isPending}
            maxLength={160}
          />
        </div>

        {remindersAvailable ? (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900 dark:accent-zinc-300"
                checked={remind24h}
                onChange={(event) => setRemind24h(event.target.checked)}
                disabled={isPending}
              />
              Erinnerung 24 Stunden vorher senden
            </label>
            <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900 dark:accent-zinc-300"
                checked={remind2h}
                onChange={(event) => setRemind2h(event.target.checked)}
                disabled={isPending}
              />
              Erinnerung 2 Stunden vorher
            </label>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
            Erinnerungsschalter sind vorübergehend deaktiviert. Bitte führe die Migration
            <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs dark:bg-amber-900/60">
              20240704160000_events_feature
            </code>
            auf deinem Supabase-Projekt aus, um Erinnerungen wieder zu aktivieren.
          </div>
        )}

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
          <Button type="submit" disabled={!canSubmit || isPending}>
            {isPending ? "Speichern…" : "Termin anlegen"}
          </Button>
        </div>
      </form>
    </section>
  );
}
