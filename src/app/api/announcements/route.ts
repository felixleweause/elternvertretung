import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

type AnnouncementPayload = {
  title?: string;
  body?: string;
  scope_type?: "class" | "school";
  scope_id?: string;
  allow_comments?: boolean;
  requires_ack?: boolean;
};

export async function POST(request: Request) {
  const payload: AnnouncementPayload = await request.json();
  const {
    title,
    body,
    scope_type,
    scope_id,
    allow_comments = false,
    requires_ack = false,
  } = payload;

  if (
    !title ||
    !body ||
    !scope_type ||
    !scope_id ||
    typeof title !== "string" ||
    typeof body !== "string" ||
    (scope_type !== "class" && scope_type !== "school")
  ) {
    return NextResponse.json(
      { error: "invalid_payload" },
      { status: 400 }
    );
  }

  // Using getServerSupabase() instead
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get user's school_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 400 });
  }

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (!trimmedTitle || !trimmedBody) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: trimmedTitle,
      body: trimmedBody,
      scope_type,
      scope_id,
      attachments: [],
      allow_comments,
      requires_ack,
      created_by: user.id,
      school_id: profile.school_id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to create announcement", error);
    return NextResponse.json(
      { error: error.message ?? "insert_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ data }, { status: 200 });
}
