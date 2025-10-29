"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import {
  isReminderColumnMissing,
  logReminderColumnWarning,
} from "@/lib/supabase/reminder-support";

type ActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

function ensureString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOrNull(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export async function createEventAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = ensureString(formData.get("title"));
  const description = ensureString(formData.get("description"));
  const rawScopeType = ensureString(formData.get("scope_type"));
  const scopeType =
    rawScopeType === "class" || rawScopeType === "school" ? rawScopeType : null;
  const scopeId = ensureString(formData.get("scope_id"));
  const startAtRaw = ensureString(formData.get("start_at"));
  const endAtRaw = ensureString(formData.get("end_at"));
  const location = ensureString(formData.get("location"));
  const remindersAvailable = ensureString(formData.get("reminders_available")) === "true";
  const remind24h = formData.get("remind_24h") === "true";
  const remind2h = formData.get("remind_2h") === "true";

  if (!title || !scopeType || !scopeId || !startAtRaw) {
    return {
      status: "error",
      message:
        "Bitte gib Titel, Bereich und Startzeit an. Diese Angaben sind erforderlich.",
    };
  }

  const startAt = parseDateOrNull(startAtRaw);
  if (!startAt) {
    return {
      status: "error",
      message: "Die Startzeit konnte nicht interpretiert werden.",
    };
  }

  const endAt = parseDateOrNull(endAtRaw);
  if (endAtRaw && !endAt) {
    return {
      status: "error",
      message: "Die Endzeit konnte nicht interpretiert werden.",
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Du bist nicht angemeldet." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) {
    return {
      status: "error",
      message:
        "Deinem Account ist keine Schule zugeordnet. Bitte kontaktiere eine:n Administrator:in.",
    };
  }

  const insertedPayload = {
    school_id: profile.school_id,
    scope_type: scopeType as "class" | "school",
    scope_id: scopeId,
    title,
    description: description || null,
    start_at: startAt,
    end_at: endAt,
    location: location || null,
    remind_24h: remindersAvailable ? remind24h : undefined,
    remind_2h: remindersAvailable ? remind2h : undefined,
  };

  let insertResult = await supabase
    .from("events")
    .insert(insertedPayload)
    .select("id")
    .maybeSingle();

  if (insertResult.error && remindersAvailable) {
    const error = insertResult.error;
    if (isReminderColumnMissing(error)) {
      logReminderColumnWarning("event create action");
      const { remind_24h: _drop24, remind_2h: _drop2, ...fallbackPayload } =
        insertedPayload;
      insertResult = await supabase
        .from("events")
        .insert(fallbackPayload)
        .select("id")
        .maybeSingle();
    }
  }

  if (insertResult.error) {
    console.error("Failed to create event via server action", insertResult.error);
    return {
      status: "error",
      message: insertResult.error.message ?? "Der Termin konnte nicht gespeichert werden.",
    };
  }

  revalidatePath("/app/events");
  revalidateTag("events");

  return {
    status: "success",
    message: "Termin erstellt – er erscheint jetzt in der Übersicht.",
  };
}

export const initialEventActionState: ActionState = {
  status: "idle",
  message: null,
};
