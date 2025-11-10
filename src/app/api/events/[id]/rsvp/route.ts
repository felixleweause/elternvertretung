import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

const VALID_STATUSES = new Set(["yes", "no", "maybe"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
  };

  const status = body.status;
  if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
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

  const { error } = await supabase
    .from("rsvps")
    .upsert(
      {
        event_id: id,
        user_id: user.id,
        status: status as "yes" | "no" | "maybe",
        school_id: profile.school_id,
        responded_at: new Date().toISOString(),
      },
      {
        onConflict: "event_id,user_id",
      }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to upsert RSVP", error);
    return NextResponse.json(
      { error: error.message ?? "rsvp_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
