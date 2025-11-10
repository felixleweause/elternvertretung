import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";
import {
  isReminderColumnMissing,
  logReminderColumnWarning,
} from "@/lib/supabase/reminder-support";

type EventPayload = {
  title?: string;
  description?: string | null;
  scope_type?: "class" | "school";
  scope_id?: string;
  start_at?: string;
  end_at?: string | null;
  location?: string | null;
  remind_24h?: boolean;
  remind_2h?: boolean;
};

export async function POST(request: Request) {
  const payload: EventPayload = await request.json().catch(() => ({}));
  const {
    title,
    description = null,
    scope_type,
    scope_id,
    start_at,
    end_at = null,
    location = null,
    remind_24h = false,
    remind_2h = false,
  } = payload;

  if (
    !title ||
    !scope_type ||
    !scope_id ||
    !start_at ||
    typeof title !== "string" ||
    typeof scope_id !== "string" ||
    (scope_type !== "class" && scope_type !== "school")
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const startDate = new Date(start_at);
  const endDate = end_at ? new Date(end_at) : null;

  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "invalid_start_at" }, { status: 400 });
  }

  if (endDate && Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "invalid_end_at" }, { status: 400 });
  }

  // Using getServerSupabase() instead
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) {
    return NextResponse.json({ error: "profile_incomplete" }, { status: 400 });
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }

  const insertedPayload = {
    school_id: profile.school_id,
    scope_type,
    scope_id,
    title: trimmedTitle,
    description: description ? description.trim() : null,
    start_at: startDate.toISOString(),
    end_at: endDate ? endDate.toISOString() : null,
    location: location ? location.trim() : null,
    remind_24h,
    remind_2h,
  };

  let insertResult = await supabase
    .from("events")
    .insert(insertedPayload)
    .select("id")
    .maybeSingle();

  if (insertResult.error && isReminderColumnMissing(insertResult.error)) {
    logReminderColumnWarning("event insert");
    const { remind_24h: _ignore24h, remind_2h: _ignore2h, ...fallbackPayload } =
      insertedPayload;
    insertResult = await supabase
      .from("events")
      .insert(fallbackPayload)
      .select("id")
      .maybeSingle();
  }

  if (insertResult.error) {
    console.error("Failed to create event", insertResult.error);
    return NextResponse.json(
      { error: insertResult.error.message ?? "insert_failed" },
      { status: 400 }
    );
  }

  const data = insertResult.data;

  return NextResponse.json({ data }, { status: 200 });
}
