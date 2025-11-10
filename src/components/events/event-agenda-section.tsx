"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  normalizeAgendaDocument,
  normalizeMinutesDocument,
} from "@/lib/events/documents";
import type {
  EventAgendaDocument,
  EventAgendaItem,
  EventMinutesDocument,
  EventMinutesEntry,
} from "@/components/events/types";

type EventAgendaSectionProps = {
  eventId: string;
  agenda: EventAgendaDocument;
  minutes: EventMinutesDocument;
  canManage: boolean;
  agendaAvailable: boolean;
};

type TabKey = "agenda" | "minutes";

type MessageState = {
  text: string;
  type: "success" | "error";
};

const recordedFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function toDateTimeLocal(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "";
  }
  const date = new Date(parsed);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

function snapshotState(
  agendaItems: EventAgendaItem[],
  agendaPreparedBy: string,
  minutesEntries: EventMinutesEntry[],
  minutesPreparedBy: string
) {
  return JSON.stringify({
    agenda: {
      items: agendaItems.map((item) => ({
        id: item.id,
        topic: item.topic,
        owner: item.owner,
        startsAt: item.startsAt,
        durationMinutes: item.durationMinutes,
        notes: item.notes,
      })),
      preparedBy: agendaPreparedBy.trim(),
    },
    minutes: {
      entries: minutesEntries.map((entry) => ({
        id: entry.id,
        note: entry.note,
        recordedAt: entry.recordedAt,
        agendaItemId: entry.agendaItemId,
        author: entry.author,
      })),
      preparedBy: minutesPreparedBy.trim(),
    },
  });
}

function createAgendaItem(): EventAgendaItem {
  const generator = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  const id = generator ? generator() : `agenda-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    topic: "",
    owner: null,
    startsAt: null,
    durationMinutes: null,
    notes: null,
  };
}

function createMinutesEntry(): EventMinutesEntry {
  const generator = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  const id = generator ? generator() : `minutes-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    note: "",
    recordedAt: new Date().toISOString(),
    agendaItemId: null,
    author: null,
  };
}

export function EventAgendaSection({
  eventId,
  agenda,
  minutes,
  canManage,
  agendaAvailable,
}: EventAgendaSectionProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("agenda");
  const [agendaItems, setAgendaItems] = useState<EventAgendaItem[]>(() =>
    agenda.items.map((item) => ({ ...item }))
  );
  const [agendaPreparedBy, setAgendaPreparedBy] = useState<string>(
    agenda.preparedBy ?? ""
  );
  const [minutesEntries, setMinutesEntries] = useState<EventMinutesEntry[]>(() =>
    minutes.entries.map((entry) => ({ ...entry }))
  );
  const [minutesPreparedBy, setMinutesPreparedBy] = useState<string>(
    minutes.preparedBy ?? ""
  );
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isPending, startTransition] = useTransition();

  const [snapshot, setSnapshot] = useState(() =>
    snapshotState(
      agenda.items,
      agenda.preparedBy ?? "",
      minutes.entries,
      minutes.preparedBy ?? ""
    )
  );

  const hasChanges = useMemo(() => {
    return (
      snapshotState(
        agendaItems,
        agendaPreparedBy,
        minutesEntries,
        minutesPreparedBy
      ) !== snapshot
    );
  }, [agendaItems, agendaPreparedBy, minutesEntries, minutesPreparedBy, snapshot]);

  const canEdit = canManage && agendaAvailable;

  const agendaOptions = useMemo(
    () =>
      agendaItems.map((item) => ({
        id: item.id,
        label: item.topic || "Tagesordnungspunkt",
      })),
    [agendaItems]
  );

  const handleAgendaTopicChange = (id: string, topic: string) => {
    setAgendaItems((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              topic,
            }
          : item
      )
    );
  };

  const handleAgendaFieldChange = (
    id: string,
    field: "owner" | "startsAt" | "durationMinutes" | "notes",
    value: string
  ) => {
    setAgendaItems((items) =>
      items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        if (field === "durationMinutes") {
          const numeric = Number(value);
          return {
            ...item,
            durationMinutes:
              Number.isFinite(numeric) && numeric > 0 ? Math.min(720, Math.round(numeric)) : null,
          };
        }

        const nextValue = value.trim().length > 0 ? value : null;
        return {
          ...item,
          [field]: nextValue,
        };
      })
    );
  };

  const handleAgendaRemove = (id: string) => {
    setAgendaItems((items) => items.filter((item) => item.id !== id));
  };

  const handleMinutesChange = (
    id: string,
    field: "note" | "agendaItemId" | "recordedAt" | "author",
    value: string
  ) => {
    setMinutesEntries((entries) =>
      entries.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }
        if (field === "recordedAt") {
          return {
            ...entry,
            recordedAt: fromDateTimeLocal(value),
          };
        }
        if (field === "agendaItemId") {
          return {
            ...entry,
            agendaItemId: value.trim().length > 0 ? value : null,
          };
        }
        if (field === "author") {
          return {
            ...entry,
            author: value.trim().length > 0 ? value : null,
          };
        }
        return {
          ...entry,
          note: value,
        };
      })
    );
  };

  const handleMinutesRemove = (id: string) => {
    setMinutesEntries((entries) => entries.filter((entry) => entry.id !== id));
  };

  const handleMinutesTimestampNow = (id: string) => {
    setMinutesEntries((entries) =>
      entries.map((entry) =>
        entry.id === id
          ? { ...entry, recordedAt: new Date().toISOString() }
          : entry
      )
    );
  };

  const handleSave = () => {
    if (!canEdit || !hasChanges) {
      return;
    }
    startTransition(async () => {
      try {
        setMessage(null);

        const agendaPayload = {
          items: agendaItems
            .map((item) => ({
              id: item.id,
              topic: item.topic.trim(),
              owner: item.owner?.trim() || null,
              startsAt: item.startsAt?.trim() || null,
              durationMinutes: item.durationMinutes ?? null,
              notes: item.notes?.trim() || null,
            }))
            .filter((item) => item.topic.length > 0),
          preparedBy: agendaPreparedBy.trim() || null,
        };

        const minutesPayload = {
          entries: minutesEntries
            .map((entry) => {
              const note = entry.note.trim();
              if (!note) {
                return null;
              }
              const recordedAt = Date.parse(entry.recordedAt);
              return {
                id: entry.id,
                note,
                recordedAt:
                  Number.isNaN(recordedAt) || !Number.isFinite(recordedAt)
                    ? new Date().toISOString()
                    : new Date(recordedAt).toISOString(),
                agendaItemId: entry.agendaItemId ?? null,
                author: entry.author?.trim() || null,
              };
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
          preparedBy: minutesPreparedBy.trim() || null,
        };

        const response = await fetch(`/api/events/${eventId}/agenda`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agenda: agendaPayload,
            minutes: minutesPayload,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          setMessage({
            type: "error",
            text:
              data?.error ??
              "Agenda und Protokoll konnten nicht gespeichert werden. Bitte versuche es erneut.",
          });
          return;
        }

        const payload = (await response.json().catch(() => null)) as {
          agenda?: unknown;
          minutes?: unknown;
        } | null;

        const nextAgenda = normalizeAgendaDocument(payload?.agenda ?? agendaPayload);
        const nextMinutes = normalizeMinutesDocument(payload?.minutes ?? minutesPayload);

        setAgendaItems(nextAgenda.items.map((item) => ({ ...item })));
        setAgendaPreparedBy(nextAgenda.preparedBy ?? "");
        setMinutesEntries(nextMinutes.entries.map((entry) => ({ ...entry })));
        setMinutesPreparedBy(nextMinutes.preparedBy ?? "");

        const nextSnapshot = snapshotState(
          nextAgenda.items,
          nextAgenda.preparedBy ?? "",
          nextMinutes.entries,
          nextMinutes.preparedBy ?? ""
        );
        setSnapshot(nextSnapshot);

        setMessage({
          type: "success",
          text: "Agenda und Protokoll gespeichert.",
        });
        router.refresh();
      } catch (error) {
        console.error("Failed to save agenda", error);
        setMessage({
          type: "error",
          text: "Beim Speichern ist ein Fehler aufgetreten. Bitte überprüfe deine Verbindung.",
        });
      }
    });
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-col gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Agenda &amp; Protokoll
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Plane die Tagesordnung und halte Beschlüsse oder To-Dos während des Treffens fest.
            Exportiere das Ergebnis direkt als PDF für deine Unterlagen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="text-sm"
            title="Agenda und Protokoll als PDF herunterladen"
          >
            <a href={`/api/events/${eventId}/agenda/pdf`} target="_blank" rel="noreferrer">
              PDF herunterladen
            </a>
          </Button>
          {canEdit ? (
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isPending || !agendaAvailable}
            >
              {isPending ? "Speichern…" : "Änderungen speichern"}
            </Button>
          ) : null}
          <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-600">
            Zuletzt aktualisiert:{" "}
            {agenda.updatedAt || minutes.updatedAt
              ? recordedFormatter.format(
                  new Date(agenda.updatedAt ?? minutes.updatedAt ?? new Date().toISOString())
                )
              : "noch nicht gespeichert"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1 transition",
              activeTab === "agenda"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
            onClick={() => setActiveTab("agenda")}
          >
            Agenda
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1 transition",
              activeTab === "minutes"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
            onClick={() => setActiveTab("minutes")}
          >
            Protokoll
          </button>
        </div>
      </header>

      {!agendaAvailable ? (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          Der Agenda-Editor ist deaktiviert, da die Datenbankspalten fehlen. Bitte führe die
          Migration
          <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs dark:bg-amber-900/60">
            20241026150000_events_agenda_minutes
          </code>
          in deinem Supabase-Projekt aus.
        </div>
      ) : null}

      <div className="px-6 py-6">
        {message ? (
          <p
            className={cn(
              "mb-4 text-sm font-medium",
              message.type === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {message.text}
          </p>
        ) : null}

        {activeTab === "agenda" ? (
          <div className="flex flex-col gap-4">
            {agendaItems.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Noch keine Tagesordnung angelegt.
                {canEdit ? " Füge die ersten Punkte hinzu, um die Vorbereitung zu starten." : ""}
              </p>
            ) : (
              agendaItems.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                      TOP {index + 1}
                    </span>
                    {canEdit ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAgendaRemove(item.id)}
                      >
                        Entfernen
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Thema
                      </label>
                      <Input
                        value={item.topic}
                        onChange={(event) =>
                          handleAgendaTopicChange(item.id, event.target.value)
                        }
                        placeholder="z. B. Begrüßung und Formalien"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Geplanter Start
                      </label>
                      <Input
                        type="time"
                        value={item.startsAt ?? ""}
                        onChange={(event) =>
                          handleAgendaFieldChange(item.id, "startsAt", event.target.value)
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Dauer (Min.)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={720}
                        value={item.durationMinutes ?? ""}
                        onChange={(event) =>
                          handleAgendaFieldChange(item.id, "durationMinutes", event.target.value)
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Leitung / Ansprechpartner:in
                      </label>
                      <Input
                        value={item.owner ?? ""}
                        onChange={(event) =>
                          handleAgendaFieldChange(item.id, "owner", event.target.value)
                        }
                        placeholder="z. B. Frau Müller"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Notizen (optional)
                      </label>
                      <Textarea
                        value={item.notes ?? ""}
                        onChange={(event) =>
                          handleAgendaFieldChange(item.id, "notes", event.target.value)
                        }
                        rows={4}
                        placeholder="Geplante Inhalte, benötigte Unterlagen oder Hinweise…"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="flex flex-col gap-3 border-t border-dashed border-zinc-200 pt-4 dark:border-zinc-800">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Vorbereitung durch
                  </label>
                  <Input
                    value={agendaPreparedBy}
                    onChange={(event) => setAgendaPreparedBy(event.target.value)}
                    placeholder="Name der vorbereitenden Person"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              {canEdit ? (
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => setAgendaItems((items) => [...items, createAgendaItem()])}
                  disabled={!agendaAvailable}
                >
                  Tagesordnungspunkt hinzufügen
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {minutesEntries.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Noch keine Protokoll-Einträge vorhanden.
                {canEdit ? " Erstelle neue Notizen, um Beschlüsse und Aufgaben festzuhalten." : ""}
              </p>
            ) : (
              minutesEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold uppercase tracking-wide">
                      Eintrag {index + 1}
                    </span>
                    {canEdit ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMinutesRemove(entry.id)}
                      >
                        Entfernen
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Zugeordneter TOP
                      </label>
                      <select
                        className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-300"
                        value={entry.agendaItemId ?? ""}
                        onChange={(event) =>
                          handleMinutesChange(entry.id, "agendaItemId", event.target.value)
                        }
                        disabled={!canEdit}
                      >
                        <option value="">Allgemein</option>
                        {agendaOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Zeitstempel
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="datetime-local"
                          value={toDateTimeLocal(entry.recordedAt)}
                          onChange={(event) =>
                            handleMinutesChange(entry.id, "recordedAt", event.target.value)
                          }
                          disabled={!canEdit}
                        />
                        {canEdit ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMinutesTimestampNow(entry.id)}
                          >
                            Jetzt
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {Number.isNaN(Date.parse(entry.recordedAt))
                          ? "Ungültiges Datum"
                          : recordedFormatter.format(new Date(entry.recordedAt))}
                      </p>
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Notizen / Beschlüsse
                      </label>
                      <Textarea
                        value={entry.note}
                        onChange={(event) =>
                          handleMinutesChange(entry.id, "note", event.target.value)
                        }
                        rows={4}
                        placeholder="Beschlüsse, offene Fragen oder To-Dos…"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2 md:max-w-sm">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Protokolliert von
                      </label>
                      <Input
                        value={entry.author ?? ""}
                        onChange={(event) =>
                          handleMinutesChange(entry.id, "author", event.target.value)
                        }
                        placeholder="Name der protokollierenden Person"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="flex flex-col gap-3 border-t border-dashed border-zinc-200 pt-4 dark:border-zinc-800">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Protokoll erstellt von
                  </label>
                  <Input
                    value={minutesPreparedBy}
                    onChange={(event) => setMinutesPreparedBy(event.target.value)}
                    placeholder="Name oder Team"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              {canEdit ? (
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => setMinutesEntries((entries) => [...entries, createMinutesEntry()])}
                  disabled={!agendaAvailable}
                >
                  Protokoll-Eintrag hinzufügen
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
