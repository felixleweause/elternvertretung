"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";

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

  const cookieStore = await cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Du bist nicht angemeldet." };
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
  revalidateTag("announcements");

  return {
    status: "success",
    message: "Ankündigung veröffentlicht.",
  };
}

export const initialAnnouncementActionState: ActionState = {
  status: "idle",
  message: null,
};
