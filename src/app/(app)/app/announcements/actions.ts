"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { cacheTags } from "@/lib/cache/tags";

type ActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

function ensureString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function createAnnouncementAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = ensureString(formData.get("title"));
  const body = ensureString(formData.get("body"));
  const rawScopeType = ensureString(formData.get("scope_type"));
  const scopeType =
    rawScopeType === "class" || rawScopeType === "school" ? rawScopeType : null;
  const scopeId = ensureString(formData.get("scope_id"));
  const allowComments = formData.get("allow_comments") === "true";
  const requiresAck = formData.get("requires_ack") === "true";

  if (!title || !body || !scopeType || !scopeId) {
    return {
      status: "error",
      message: "Titel, Nachricht und Bereich sind erforderlich.",
    };
  }

  // Using getServerSupabase() instead
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Du bist nicht angemeldet." };
  }

  // Get user's school_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) {
    return { status: "error", message: "Benutzerprofil nicht gefunden." };
  }

  const { error } = await supabase
    .from("announcements")
    .insert({
      title,
      body,
      scope_type: scopeType as "class" | "school",
      scope_id: scopeId,
      attachments: [],
      allow_comments: allowComments,
      requires_ack: requiresAck,
      created_by: user.id,
      school_id: profile.school_id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to create announcement via server action", error);
    return {
      status: "error",
      message: error.message ?? "Die Ankündigung konnte nicht gespeichert werden.",
    };
  }

  revalidatePath("/app/announcements");
  revalidateTag(cacheTags.announcements(profile.school_id), 'max');

  return {
    status: "success",
    message: "Ankündigung veröffentlicht.",
  };
}

export const initialAnnouncementActionState: ActionState = {
  status: "idle",
  message: null,
};
