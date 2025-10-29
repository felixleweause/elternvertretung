import { randomUUID } from "node:crypto";

export type PollOptionRecord = {
  id: string;
  label: string;
};

function ensureString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePollOptions(raw: unknown): PollOptionRecord[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          const label = ensureString(entry);
          if (!label) {
            return null;
          }
          return {
            id: randomUUID(),
            label,
          };
        }

        const candidate = entry as Record<string, unknown>;
        const label =
          ensureString(candidate.label) ??
          ensureString(candidate.title) ??
          ensureString(candidate.name);

        if (!label) {
          return null;
        }

        const id =
          ensureString(candidate.id) ??
          ensureString(candidate.key) ??
          ensureString(candidate.value) ??
          randomUUID();

        return {
          id,
          label,
        };
      })
      .filter((entry): entry is PollOptionRecord => entry !== null);
  }

  const label = ensureString(raw);
  if (!label) {
    return [];
  }
  return [
    {
      id: randomUUID(),
      label,
    },
  ];
}

export function buildPollOptions(labels: string[]): PollOptionRecord[] {
  return labels
    .map((label) => ensureString(label))
    .filter((label): label is string => label !== null)
    .map((label) => ({
      id: randomUUID(),
      label,
    }));
}
