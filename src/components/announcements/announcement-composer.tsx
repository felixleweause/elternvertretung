"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Form from "next/form";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createAnnouncementAction,
  initialAnnouncementActionState,
} from "@/app/(app)/app/announcements/actions";
import type { AnnouncementScopeOption } from "./types";

type AnnouncementComposerProps = {
  scopes: AnnouncementScopeOption[];
};

type AnnouncementState = {
  title: string;
  body: string;
};

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

const INITIAL_FORM_STATE: AnnouncementState = {
  title: "",
  body: "",
};

export function AnnouncementComposer({ scopes }: AnnouncementComposerProps) {
  const router = useRouter();
  const [scopeValue, setScopeValue] = useState(
    scopes.length > 0 ? encodeScope(scopes[0]) : ""
  );
  const [formState, setFormState] = useState<AnnouncementState>(INITIAL_FORM_STATE);
  const [allowComments, setAllowComments] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);

  const [actionState, formAction, isPending] = useActionState(
    createAnnouncementAction,
    initialAnnouncementActionState
  );

  useEffect(() => {
    if (actionState.status === "success") {
      setFormState(INITIAL_FORM_STATE);
      setAllowComments(false);
      setRequiresAck(false);
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
    formState.body.trim().length > 0;

  const errorMessage =
    actionState.status === "error" ? actionState.message : null;
  const successMessage =
    actionState.status === "success" ? actionState.message : null;

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

      <Form action={formAction} className="grid gap-4">
        <input type="hidden" name="scope_type" value={decodedScope?.scopeType ?? ""} />
        <input type="hidden" name="scope_id" value={decodedScope?.scopeId ?? ""} />

        <div className="grid gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Bereich
          </label>
          <select
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
              Dir wurden noch keine Mandate zum Veröffentlichen zugewiesen.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="announcement-title"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            Titel
          </label>
          <Input
            id="announcement-title"
            name="title"
            placeholder="z. B. Elternabend am 12. Oktober"
            value={formState.title}
            onChange={(event) =>
              setFormState((current) => ({ ...current, title: event.target.value }))
            }
            disabled={isPending}
            maxLength={160}
            required
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="announcement-body"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            Nachricht
          </label>
          <Textarea
            id="announcement-body"
            name="body"
            placeholder="Teile alle wichtigen Informationen…"
            value={formState.body}
            onChange={(event) =>
              setFormState((current) => ({ ...current, body: event.target.value }))
            }
            disabled={isPending}
            rows={6}
            required
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Markdown wird nicht unterstützt. Verwende Absätze, um den Text zu strukturieren.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              name="allow_comments"
              value="true"
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
              name="requires_ack"
              value="true"
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
            {isPending ? "Sende..." : "Ankündigung veröffentlichen"}
          </Button>
        </div>
      </Form>
    </section>
  );
}
