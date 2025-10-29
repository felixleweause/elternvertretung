import type {
  EventAgendaDocument,
  EventAgendaItem,
  EventMinutesDocument,
  EventMinutesEntry,
} from "@/components/events/types";

const MAX_AGENDA_ITEMS = 50;
const MAX_MINUTES_ENTRIES = 200;
const MAX_TOPIC_LENGTH = 280;
const MAX_TEXT_LENGTH = 4000;

type AgendaLike = {
  items?: unknown;
  updatedAt?: unknown;
  preparedBy?: unknown;
};

type MinutesLike = {
  entries?: unknown;
  updatedAt?: unknown;
  preparedBy?: unknown;
};

function ensureString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceDuration(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.round(value);
  if (normalized <= 0) {
    return null;
  }
  if (normalized > 720) {
    return 720;
  }
  return normalized;
}

function ensureAgendaItem(raw: unknown, fallbackId: string): EventAgendaItem | null {
  if (!raw || typeof raw !== "object") {
    const text = ensureString(raw);
    if (!text) {
      return null;
    }
    return {
      id: fallbackId,
      topic: text.slice(0, MAX_TOPIC_LENGTH),
      owner: null,
      startsAt: null,
      durationMinutes: null,
      notes: null,
    };
  }

  const candidate = raw as Record<string, unknown>;
  const topic =
    ensureString(candidate.topic) ??
    ensureString(candidate.title) ??
    ensureString(candidate.topicTitle);

  if (!topic) {
    return null;
  }

  const id =
    ensureString(candidate.id) ??
    ensureString(candidate.key) ??
    `legacy-${fallbackId}`;

  return {
    id,
    topic: topic.slice(0, MAX_TOPIC_LENGTH),
    owner: ensureString(candidate.owner) ?? ensureString(candidate.presenter),
    startsAt: ensureString(candidate.startsAt) ?? ensureString(candidate.time),
    durationMinutes: coerceDuration(candidate.durationMinutes ?? candidate.duration),
    notes: ensureString(candidate.notes) ?? ensureString(candidate.description),
  };
}

function ensureMinutesEntry(
  raw: unknown,
  fallbackId: string
): EventMinutesEntry | null {
  if (!raw || typeof raw !== "object") {
    const note = ensureString(raw);
    if (!note) {
      return null;
    }
    return {
      id: fallbackId,
      note: note.slice(0, MAX_TEXT_LENGTH),
      recordedAt: new Date().toISOString(),
      agendaItemId: null,
      author: null,
    };
  }

  const candidate = raw as Record<string, unknown>;
  const note =
    ensureString(candidate.note) ??
    ensureString(candidate.summary) ??
    ensureString(candidate.text);

  if (!note) {
    return null;
  }

  const id =
    ensureString(candidate.id) ??
    ensureString(candidate.key) ??
    `legacy-${fallbackId}`;

  const recorded =
    ensureString(candidate.recordedAt) ??
    ensureString(candidate.createdAt) ??
    ensureString(candidate.timestamp);

  let recordedAt = new Date().toISOString();
  if (recorded) {
    const parsed = Date.parse(recorded);
    if (!Number.isNaN(parsed)) {
      recordedAt = new Date(parsed).toISOString();
    }
  }

  return {
    id,
    note: note.slice(0, MAX_TEXT_LENGTH),
    recordedAt,
    agendaItemId:
      ensureString(candidate.agendaItemId) ?? ensureString(candidate.topicId),
    author: ensureString(candidate.author) ?? ensureString(candidate.recorder),
  };
}

export function normalizeAgendaDocument(raw: unknown): EventAgendaDocument {
  const fallback: EventAgendaDocument = {
    items: [],
    updatedAt: null,
    preparedBy: null,
  };

  if (raw === null || raw === undefined) {
    return fallback;
  }

  if (Array.isArray(raw)) {
    const items = raw
      .slice(0, MAX_AGENDA_ITEMS)
      .map((item, index) => ensureAgendaItem(item, `legacy-${index + 1}`))
      .filter((item): item is EventAgendaItem => item !== null);
    return {
      items,
      updatedAt: null,
      preparedBy: null,
    };
  }

  if (typeof raw === "object") {
    const agendaLike = raw as AgendaLike;
    const rawItems = Array.isArray(agendaLike.items) ? agendaLike.items : [];
    const items = rawItems
      .slice(0, MAX_AGENDA_ITEMS)
      .map((item, index) => ensureAgendaItem(item, `legacy-${index + 1}`))
      .filter((item): item is EventAgendaItem => item !== null);

    return {
      items,
      updatedAt: ensureString(agendaLike.updatedAt),
      preparedBy: ensureString(agendaLike.preparedBy),
    };
  }

  return fallback;
}

export function normalizeMinutesDocument(raw: unknown): EventMinutesDocument {
  const fallback: EventMinutesDocument = {
    entries: [],
    updatedAt: null,
    preparedBy: null,
  };

  if (raw === null || raw === undefined) {
    return fallback;
  }

  if (Array.isArray(raw)) {
    const entries = raw
      .slice(0, MAX_MINUTES_ENTRIES)
      .map((entry, index) => ensureMinutesEntry(entry, `legacy-${index + 1}`))
      .filter((entry): entry is EventMinutesEntry => entry !== null);
    return {
      entries,
      updatedAt: null,
      preparedBy: null,
    };
  }

  if (typeof raw === "object") {
    const minutesLike = raw as MinutesLike;
    const rawEntries = Array.isArray(minutesLike.entries)
      ? minutesLike.entries
      : [];
    const entries = rawEntries
      .slice(0, MAX_MINUTES_ENTRIES)
      .map((entry, index) => ensureMinutesEntry(entry, `legacy-${index + 1}`))
      .filter((entry): entry is EventMinutesEntry => entry !== null);

    return {
      entries,
      updatedAt: ensureString(minutesLike.updatedAt),
      preparedBy: ensureString(minutesLike.preparedBy),
    };
  }

  return fallback;
}

function createId(prefix: string): string {
  const generator = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (generator) {
    return generator();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeAgendaItem(raw: unknown): EventAgendaItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const topic = ensureString(candidate.topic) ?? ensureString(candidate.title);
  if (!topic) {
    return null;
  }
  return {
    id: ensureString(candidate.id) ?? createId("agenda"),
    topic: topic.slice(0, MAX_TOPIC_LENGTH),
    owner: ensureString(candidate.owner) ?? ensureString(candidate.presenter),
    startsAt: ensureString(candidate.startsAt) ?? ensureString(candidate.time),
    durationMinutes: coerceDuration(candidate.durationMinutes ?? candidate.duration),
    notes: ensureString(candidate.notes) ?? ensureString(candidate.description),
  };
}

function sanitizeMinutesEntry(raw: unknown): EventMinutesEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const note =
    ensureString(candidate.note) ??
    ensureString(candidate.summary) ??
    ensureString(candidate.text);
  if (!note) {
    return null;
  }

  const recordedValue =
    ensureString(candidate.recordedAt) ??
    ensureString(candidate.timestamp) ??
    ensureString(candidate.createdAt);

  let recordedAt = new Date().toISOString();
  if (recordedValue) {
    const parsed = Date.parse(recordedValue);
    if (!Number.isNaN(parsed)) {
      recordedAt = new Date(parsed).toISOString();
    }
  }

  return {
    id: ensureString(candidate.id) ?? createId("minutes"),
    note: note.slice(0, MAX_TEXT_LENGTH),
    recordedAt,
    agendaItemId:
      ensureString(candidate.agendaItemId) ?? ensureString(candidate.topicId),
    author: ensureString(candidate.author) ?? ensureString(candidate.recorder),
  };
}

export function sanitizeAgendaPayload(
  raw: unknown
): EventAgendaDocument | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const doc = raw as AgendaLike;
  const rawItems = Array.isArray(doc.items) ? doc.items : [];

  const items = rawItems
    .slice(0, MAX_AGENDA_ITEMS)
    .map((item) => sanitizeAgendaItem(item))
    .filter((item): item is EventAgendaItem => item !== null);

  return {
    items,
    updatedAt: new Date().toISOString(),
    preparedBy: ensureString(doc.preparedBy),
  };
}

export function sanitizeMinutesPayload(
  raw: unknown
): EventMinutesDocument | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const doc = raw as MinutesLike;
  const rawEntries = Array.isArray(doc.entries) ? doc.entries : [];

  const entries = rawEntries
    .slice(0, MAX_MINUTES_ENTRIES)
    .map((entry) => sanitizeMinutesEntry(entry))
    .filter((entry): entry is EventMinutesEntry => entry !== null);

  return {
    entries,
    updatedAt: new Date().toISOString(),
    preparedBy: ensureString(doc.preparedBy),
  };
}
