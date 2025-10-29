"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Form from "next/form";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEventAction,
  initialEventActionState,
} from "@/app/(app)/app/events/actions";
import type { EventScopeOption } from "./types";

type EventComposerProps = {
  scopes: EventScopeOption[];
  remindersAvailable?: boolean;
};

type EventComposerState = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
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

const INITIAL_FORM_STATE: EventComposerState = {
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  location: "",
};

export function EventComposer({
  scopes,
  remindersAvailable = true,
}: EventComposerProps) {
  const router = useRouter();
  const [scopeValue, setScopeValue] = useState(
    scopes.length > 0 ? encodeScope(scopes[0]) : ""
  );
  const [formState, setFormState] = useState<EventComposerState>(INITIAL_FORM_STATE);
  const [remind24h, setRemind24h] = useState(false);
  const [remind2h, setRemind2h] = useState(false);

  const [actionState, formAction, isPending] = useActionState(
    createEventAction,
    initialEventActionState
  );

  useEffect(() => {
    if (actionState.status === "success") {
      setFormState(INITIAL_FORM_STATE);
      setRemind24h(false);
      setRemind2h(false);
      router.refresh();
    }
  }, [actionState, router]);

  useEffect(() => {
    if (scopes.length > 0) {
      setScopeValue((current) => {
        if (!current) {
          return encodeScope(scopes[0]);
        }
        const decoded = decodeScope(current);
        if (!decoded) {
          return encodeScope(scopes[0]);
        }
        const stillAllowed = scopes.some(
          (scope) =>
            scope.scopeId === decoded.scopeId && scope.scopeType === decoded.scopeType
        );
        return stillAllowed ? current : encodeScope(scopes[0]);
      });
    } else {
      setScopeValue("");
    }
  }, [scopes]);

  const decodedScope = useMemo(() => decodeScope(scopeValue), [scopeValue]);
  const hasScopes = scopes.length > 0;
  const canSubmit =
    hasScopes &&
    formState.title.trim().length > 0 &&
    formState.startAt.trim().length > 0;

  const errorMessage =
    actionState.status === "error" ? actionState.message : null;
  const successMessage =
    actionState.status === "success" ? actionState.message : null;

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

      <Form action={formAction} className="grid gap-4">
        <input type="hidden" name="scope_type" value={decodedScope?.scopeType ?? ""} />
        <input type="hidden" name="scope_id" value={decodedScope?.scopeId ?? ""} />
        <input
          type="hidden"
          name="reminders_available"
          value={remindersAvailable ? "true" : "false"}
        />

        <div className="grid gap-2">
          <label
            htmlFor="event-scope"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            Bereich
          </label>
          <select
            id="event-scope"
            value={scopeValue}
            onChange={(event) => setScopeValue(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-300"
            disabled={!hasScopes || isPending}
          >
            {scopes.map((scope) => (
              <option key={encodeScope(scope)} value={encodeScope(scope)}>
                {scope.label}
              </option>
            ))}
          </select>
          {!hasScopes ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Dir wurden noch keine Mandate zum Anlegen von Terminen zugewiesen.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="event-title"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            Titel
          </label>
          <Input
            id="event-title"
            name="title"
            placeholder="z. B. Klassenelternabend 5b"
            value={formState.title}
            onChange={(event) =>
              setFormState((current) => ({ ...current, title: event.target.value }))
            }
            disabled={isPending}
            required
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="event-description"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            Beschreibung
          </label>
          <Textarea
            id="event-description"
            name="description"
            placeholder="Agenda, Hintergrundinfos oder Mitbringsel…"
            value={formState.description}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            disabled={isPending}
            rows={4}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Start
            <Input
              name="start_at"
              type="datetime-local"
              value={formState.startAt}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  startAt: event.target.value,
                }))
              }
              disabled={isPending}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Ende (optional)
            <Input
              name="end_at"
              type="datetime-local"
              value={formState.endAt}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  endAt: event.target.value,
                }))
              }
              disabled={isPending}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Ort (optional)
          <Input
            name="location"
            placeholder="z. B. Aula oder Raum 204"
            value={formState.location}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
            disabled={isPending}
          />
        </label>

        {remindersAvailable ? (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                name="remind_24h"
                value="true"
                checked={remind24h}
                onChange={(event) => setRemind24h(event.target.checked)}
                disabled={isPending}
              />
              Erinnerung 24 Stunden vor Beginn
            </label>
            <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                name="remind_2h"
                value="true"
                checked={remind2h}
                onChange={(event) => setRemind2h(event.target.checked)}
                disabled={isPending}
              />
              Erinnerung 2 Stunden vor Beginn
            </label>
          </div>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            Reminder-Spalten sind noch nicht verfügbar. Führe die Events-Migration aus,
            um Erinnerungen zu aktivieren.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {errorMessage ? (
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {successMessage}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={!canSubmit || isPending}>
            {isPending ? "Speichere..." : "Termin erstellen"}
          </Button>
        </div>
      </Form>
    </section>
  );
}
