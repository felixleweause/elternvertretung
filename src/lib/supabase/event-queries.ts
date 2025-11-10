import type { SupabaseClient } from "@supabase/supabase-js";
import {
  detectMissingColumns,
  logAgendaColumnWarning,
  logReminderColumnWarning,
  type PostgrestLikeError,
} from "@/lib/supabase/reminder-support";

type EventProfile = {
  id: string | null;
  name: string | null;
  email: string | null;
} | null;

export type EventRowData = {
  id: string;
  school_id: string;
  scope_type: "class" | "school";
  scope_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  remind_24h: boolean | null;
  remind_2h: boolean | null;
  agenda: unknown;
  minutes: unknown;
  created_at: string;
  created_by: string | null;
  profiles: EventProfile;
};

const BASE_FIELDS = [
  "id",
  "school_id",
  "scope_type",
  "scope_id",
  "title",
  "description",
  "start_at",
  "end_at",
  "location",
  "created_at",
  "created_by",
  `profiles (
    id,
    name,
    email
  )`,
] as const;

function buildEventSelect(options: { reminders: boolean; agenda: boolean }): string {
  const fields: string[] = [...BASE_FIELDS];

  if (options.agenda) {
    const locationIndex = fields.indexOf("location");
    const insertIndex = locationIndex >= 0 ? locationIndex + 1 : fields.length;
    fields.splice(insertIndex, 0, "agenda", "minutes");
  }

  if (options.reminders) {
    const createdIndex = fields.indexOf("created_at");
    const insertIndex = createdIndex >= 0 ? createdIndex : fields.length;
    fields.splice(insertIndex, 0, "remind_24h", "remind_2h");
  }

  return fields.join(",\n  ");
}

const EVENT_SELECT_FULL = buildEventSelect({ reminders: true, agenda: true });

type FetchEventResult = {
  event: EventRowData | null;
  remindersAvailable: boolean;
  agendaAvailable: boolean;
};

export async function fetchEventWithReminderFallback(
  supabase: SupabaseClient,
  id: string,
  contextLabel: string
): Promise<FetchEventResult> {
  const initial = await supabase
    .from("events")
    .select(EVENT_SELECT_FULL)
    .eq("id", id)
    .maybeSingle();

  if (!initial.error) {
    return {
      event: initial.data as unknown as EventRowData,
      remindersAvailable: true,
      agendaAvailable: true,
    };
  }

  const missingColumns = new Set(
    detectMissingColumns(initial.error as PostgrestLikeError, [
      "remind_24h",
      "remind_2h",
      "agenda",
      "minutes",
    ]).map((name) => name.toLowerCase())
  );

  const remindersMissing =
    missingColumns.has("remind_24h") || missingColumns.has("remind_2h");
  const agendaMissing =
    missingColumns.has("agenda") || missingColumns.has("minutes");

  if (!remindersMissing && !agendaMissing) {
    throw initial.error;
  }

  if (remindersMissing) {
    logReminderColumnWarning(contextLabel);
  }

  if (agendaMissing) {
    logAgendaColumnWarning(contextLabel);
  }

  const fallbackSelect = buildEventSelect({
    reminders: !remindersMissing,
    agenda: !agendaMissing,
  });

  const fallback = await supabase
    .from("events")
    .select(fallbackSelect)
    .eq("id", id)
    .maybeSingle();

  if (fallback.error) {
    throw fallback.error;
  }

  const fallbackData = fallback.data as Partial<EventRowData> | null;

  if (!fallbackData) {
    return {
      event: null,
      remindersAvailable: !remindersMissing,
      agendaAvailable: !agendaMissing,
    };
  }

  return {
    event: {
      ...fallbackData,
      remind_24h: remindersMissing ? false : fallbackData.remind_24h ?? false,
      remind_2h: remindersMissing ? false : fallbackData.remind_2h ?? false,
      agenda: agendaMissing ? [] : fallbackData.agenda ?? [],
      minutes: agendaMissing ? [] : fallbackData.minutes ?? [],
    } as EventRowData,
    remindersAvailable: !remindersMissing,
    agendaAvailable: !agendaMissing,
  };
}
