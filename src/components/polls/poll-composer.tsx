"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Form from "next/form";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPollAction, initialPollActionState } from "@/app/(app)/app/polls/actions";
import type { PollScopeOption } from "./types";

type PollComposerProps = {
  scopes: PollScopeOption[];
};

type PollOptionDraft = {
  id: string;
  value: string;
};

function generateOptionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `option-${Math.random().toString(36).slice(2, 10)}`;
}

function encodeScope(scope: PollScopeOption): string {
  return `${scope.scopeType}:${scope.scopeId}`;
}

function decodeScope(value: string): PollScopeOption | null {
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

export function PollComposer({ scopes }: PollComposerProps) {
  const router = useRouter();
  const [scopeValue, setScopeValue] = useState(
    scopes.length > 0 ? encodeScope(scopes[0]) : ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pollKind, setPollKind] = useState<"general" | "election">("general");
  const [office, setOffice] = useState<"class_rep" | "class_rep_deputy">("class_rep");
  const [pollType, setPollType] = useState<"open" | "secret">("open");
  const [deadline, setDeadline] = useState("");
  const [quorum, setQuorum] = useState("");
  const [allowAbstain, setAllowAbstain] = useState(false);
  const [options, setOptions] = useState<PollOptionDraft[]>([
    { id: generateOptionId(), value: "" },
    { id: generateOptionId(), value: "" },
  ]);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [actionState, formAction, isPending] = useActionState(
    createPollAction,
    initialPollActionState
  );

  useEffect(() => {
    if (actionState.status === "success") {
      setTitle("");
      setDescription("");
      setDeadline("");
      setQuorum("");
      setAllowAbstain(false);
      setOptions([
        { id: generateOptionId(), value: "" },
        { id: generateOptionId(), value: "" },
      ]);
      setCopiedCodeId(null);
      router.refresh();
    }
  }, [actionState, router]);

  useEffect(() => {
    if (pollKind === "election") {
      setAllowAbstain(false);
    }
  }, [pollKind]);

  useEffect(() => {
    if (scopes.length === 0) {
      setScopeValue("");
      return;
    }

    if (pollKind === "election") {
      const classScopes = scopes.filter((scope) => scope.scopeType === "class");
      if (classScopes.length === 0) {
        setScopeValue("");
        return;
      }
      setScopeValue((current) => {
        const decoded = decodeScope(current);
        if (
          decoded &&
          decoded.scopeType === "class" &&
          classScopes.some((scope) => scope.scopeId === decoded.scopeId)
        ) {
          return current;
        }
        return encodeScope(classScopes[0]);
      });
      return;
    }

    setScopeValue((current) => {
      if (!current) {
        return encodeScope(scopes[0]);
      }
      const decoded = decodeScope(current);
      if (!decoded) {
        return encodeScope(scopes[0]);
      }
      const stillAllowed = scopes.some(
        (scope) => scope.scopeId === decoded.scopeId && scope.scopeType === decoded.scopeType
      );
      return stillAllowed ? current : encodeScope(scopes[0]);
    });
  }, [scopes, pollKind]);

  const decodedScope = useMemo(() => decodeScope(scopeValue), [scopeValue]);

  const optionsPayload = useMemo(() => {
    return JSON.stringify(
      options
        .map((option) => ({
          id: option.id,
          label: option.value.trim(),
        }))
        .filter((option) => option.label.length > 0)
    );
  }, [options]);

  const validOptionsCount = useMemo(() => {
    return options.filter((option) => option.value.trim().length > 0).length;
  }, [options]);

  const isElection = pollKind === "election";
  const scopeIsValid = decodedScope !== null;
  const electionScopeValid =
    !isElection || (decodedScope && decodedScope.scopeType === "class");
  const hasEnoughOptions = isElection ? validOptionsCount >= 1 : validOptionsCount >= 2;
  const canSubmit =
    scopes.length > 0 &&
    scopeIsValid &&
    electionScopeValid &&
    hasEnoughOptions &&
    title.trim().length > 0;

  const handleCopy = async (value: string, codeId: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopiedCodeId(codeId);
        window.setTimeout(() => setCopiedCodeId(null), 2000);
      }
    } catch (error) {
      console.error("Failed to copy candidate code", error);
    }
  };

  const addOption = () => {
    setOptions((current) => [
      ...current,
      { id: generateOptionId(), value: "" },
    ]);
  };

  const updateOption = (id: string, value: string) => {
    setOptions((current) =>
      current.map((option) => (option.id === id ? { ...option, value } : option))
    );
  };

  const removeOption = (id: string) => {
    setOptions((current) => {
      const minCount = pollKind === "election" ? 1 : 2;
      if (current.length <= minCount) {
        return current;
      }
      return current.filter((option) => option.id !== id);
    });
  };

  const errorMessage =
    actionState.status === "error" ? actionState.message : null;
  const successMessage =
    actionState.status === "success" ? actionState.message : null;

  return (
    <Form
      action={formAction}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="options" value={optionsPayload} />
      <input type="hidden" name="allow_abstain" value={allowAbstain ? "true" : "false"} />

      <input type="hidden" name="kind" value={pollKind} />
      <input
        type="hidden"
        name="office"
        value={pollKind === "election" ? office : ""}
      />

      <input type="hidden" name="scope_type" value={decodedScope?.scopeType ?? ""} />
      <input type="hidden" name="scope_id" value={decodedScope?.scopeId ?? ""} />

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Bereich
          <select
            name="scope_selector"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            value={scopeValue}
            onChange={(event) => setScopeValue(event.target.value)}
            disabled={isPending}
          >
            {scopes.map((scope) => (
              <option
                key={encodeScope(scope)}
                value={encodeScope(scope)}
                disabled={pollKind === "election" && scope.scopeType !== "class"}
              >
                {scope.label}
                {pollKind === "election" && scope.scopeType !== "class"
                  ? " (nicht verfügbar)"
                  : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Modus
          <select
            name="type"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            value={pollType}
            onChange={(event) =>
              setPollType(event.target.value === "secret" ? "secret" : "open")
            }
            disabled={isPending}
          >
            <option value="open">Offen (Ergebnisse live sichtbar)</option>
            <option value="secret">Verdeckt (Ergebnisse nach Abschluss)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Format
          <select
            name="kind_selector"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            value={pollKind}
            onChange={(event) =>
              setPollKind(event.target.value === "election" ? "election" : "general")
            }
            disabled={isPending}
          >
            <option value="general">Allgemeine Abstimmung</option>
            <option value="election">Klassenwahl (Codes)</option>
          </select>
        </label>
      </div>

      {pollKind === "election" ? (
        <label className="flex flex-col gap-1 text-sm">
          Amt
          <select
            name="office_selector"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            value={office}
            onChange={(event) =>
              setOffice(event.target.value === "class_rep_deputy" ? "class_rep_deputy" : "class_rep")
            }
            disabled={isPending}
          >
            <option value="class_rep">Klassenvertretung</option>
            <option value="class_rep_deputy">Stellvertretung</option>
          </select>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Codes verknüpfen Kandidat:innen mit dem Mandat nach Wahlschluss.
          </span>
        </label>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Titel
        <Input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="z. B. Entscheidung zum Sommerfest"
          disabled={isPending}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Beschreibung
        <Textarea
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional: Kontext, Fragen oder Dokumentlinks"
          disabled={isPending}
          rows={4}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Frist (optional)
          <Input
            name="deadline"
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            disabled={isPending}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Quorum (optional)
          <Input
            name="quorum"
            type="number"
            min="0"
            value={quorum}
            onChange={(event) => setQuorum(event.target.value)}
            placeholder="Anzahl Stimmen für Gültigkeit"
            disabled={isPending}
          />
        </label>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {pollKind === "election" ? "Kandidat:innen & Codes" : "Antwortoptionen"}
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            disabled={isPending}
          >
            {pollKind === "election" ? "Kandidat:in hinzufügen" : "Option hinzufügen"}
          </Button>
        </div>
        {pollKind === "election" ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Die Namen erscheinen auf dem Stimmzettel. Nach dem Speichern erhältst du Codes, die du den Kandidat:innen zuordnen kannst.
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <Input
                value={option.value}
                onChange={(event) => updateOption(option.id, event.target.value)}
                placeholder={
                  pollKind === "election" ? `Kandidat:in ${index + 1}` : `Option ${index + 1}`
                }
                disabled={isPending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeOption(option.id)}
                disabled={
                  isPending || options.length <= (pollKind === "election" ? 1 : 2)
                }
              >
                Entfernen
              </Button>
            </div>
          ))}
        </div>
        {pollKind !== "election" ? (
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={allowAbstain}
              onChange={(event) => setAllowAbstain(event.target.checked)}
              disabled={isPending}
            />
            Enthaltung ermöglichen
          </label>
        ) : null}
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !canSubmit}>
          {isPending ? "Speichere..." : "Umfrage erstellen"}
        </Button>
        {errorMessage ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {successMessage}
          </p>
        ) : null}
      </div>

      {actionState.status === "success" &&
      actionState.candidateCodes &&
      actionState.candidateCodes.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Kandidaten-Codes
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Teile die Codes mit den Kandidat:innen. Nach der Anmeldung geben sie den Code auf <span className="font-mono">/claim</span> ein.
              </p>
            </div>
            {actionState.pollId ? (
              <Button asChild variant="secondary" size="sm">
                <a
                  href={`/api/polls/${actionState.pollId}/candidates/cards`}
                  target="_blank"
                  rel="noreferrer"
                >
                  PDF-Minipässe herunterladen
                </a>
              </Button>
            ) : null}
          </header>
          <ul className="space-y-3">
            {actionState.candidateCodes.map((code) => {
              const expiry = new Date(code.expiresAt);
              const expiryLabel = Number.isNaN(expiry.getTime())
                ? "--"
                : expiry.toLocaleDateString("de-DE");
              return (
                <li
                  key={code.id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {code.displayName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Code: <span className="font-mono text-sm">{code.claimCode}</span> · gültig bis {expiryLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(code.claimCode, code.id)}
                    >
                      {copiedCodeId === code.id ? "Code kopiert" : "Code kopieren"}
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <a href={code.claimUrl} target="_blank" rel="noreferrer">
                        Claim-Link öffnen
                      </a>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Form>
  );
}
