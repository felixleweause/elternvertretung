export type PostgrestLikeError = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

const REMINDER_COLUMN_TOKEN = "remind_";

const AGENDA_COLUMN_TOKENS = ["minutes", "agenda"];

function collectErrorCandidates(error: PostgrestLikeError): string[] {
  if (!error) {
    return [];
  }

  return [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => value.toLowerCase());
}

export function isReminderColumnMissing(error: PostgrestLikeError): boolean {
  const candidates = collectErrorCandidates(error);

  return candidates.some(
    (value) =>
      value.includes(REMINDER_COLUMN_TOKEN) &&
      (value.includes("remind_24h") ||
        value.includes("remind_2h") ||
        value.includes("schema cache") ||
        value.includes("column") ||
        value.includes("unknown"))
  );
}

export function isAgendaColumnMissing(error: PostgrestLikeError): boolean {
  const candidates = collectErrorCandidates(error);
  return candidates.some((value) =>
    AGENDA_COLUMN_TOKENS.some(
      (token) =>
        value.includes(token) &&
        (value.includes("column") ||
          value.includes("schema cache") ||
          value.includes("unknown") ||
          value.includes("does not exist"))
    )
  );
}

export function detectMissingColumns(
  error: PostgrestLikeError,
  columns: string[]
): string[] {
  const candidates = collectErrorCandidates(error);
  if (candidates.length === 0) {
    return [];
  }

  const columnMap = new Map(
    columns.map((column) => [column.toLowerCase(), column])
  );
  const result = new Set<string>();

  for (const value of candidates) {
    for (const [lowerColumn, originalColumn] of columnMap.entries()) {
      if (value.includes(lowerColumn)) {
        result.add(originalColumn);
      }
    }
  }

  return Array.from(result);
}

export function logReminderColumnWarning(context: string) {
  console.warn(
    `[events-reminder] Reminder columns unavailable during ${context}. ` +
      "Falling back to the legacy behaviour without reminders. " +
      "Run the 20240704160000_events_feature migration on the Supabase project to " +
      "enable reminder settings."
  );
}

export function logAgendaColumnWarning(context: string) {
  console.warn(
    `[events-agenda] Agenda/Protokoll columns unavailable during ${context}. ` +
      "Falling back to read-only behaviour without agenda storage. " +
      "Run the 20241026150000_events_agenda_minutes migration on the Supabase project " +
      "to enable agenda and protocol editing."
  );
}
