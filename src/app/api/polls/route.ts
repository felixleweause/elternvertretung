import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { normalizePollOptions } from "@/lib/polls/options";

type PollPayload = {
  title?: unknown;
  description?: unknown;
  scope_type?: unknown;
  scope_id?: unknown;
  type?: unknown;
  deadline?: unknown;
  quorum?: unknown;
  options?: unknown;
  allow_abstain?: unknown;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as PollPayload;
  const {
    title,
    description = null,
    scope_type,
    scope_id,
    type = "open",
    deadline = null,
    quorum = null,
    options = [],
    allow_abstain = false,
  } = payload;

  if (
    typeof title !== "string" ||
    typeof scope_type !== "string" ||
    typeof scope_id !== "string" ||
    (scope_type !== "class" && scope_type !== "school")
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }

  if (type !== "open" && type !== "secret") {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  let parsedDeadline: string | null = null;
  if (deadline) {
    if (typeof deadline !== "string") {
      return NextResponse.json({ error: "invalid_deadline" }, { status: 400 });
    }
    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
      return NextResponse.json({ error: "invalid_deadline" }, { status: 400 });
    }
    parsedDeadline = deadlineDate.toISOString();
  }

  let parsedQuorum: number | null = null;
  if (quorum !== null && quorum !== undefined) {
    const asNumber = Number(quorum);
    if (!Number.isFinite(asNumber) || asNumber < 0) {
      return NextResponse.json({ error: "invalid_quorum" }, { status: 400 });
    }
    parsedQuorum = Math.round(asNumber);
  }

  const normalizedOptions = normalizePollOptions(options);
  const uniqueLabels = new Map<string, true>();
  const finalOptions = normalizedOptions
    .map((option) => ({
      id: option.id || randomUUID(),
      label: option.label.trim().slice(0, 200),
    }))
    .filter((option) => {
      if (uniqueLabels.has(option.label.toLowerCase())) {
        return false;
      }
      uniqueLabels.set(option.label.toLowerCase(), true);
      return true;
    });

  if (finalOptions.length < 2) {
    return NextResponse.json({ error: "not_enough_options" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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

  const mandateRule =
    scope_type === "class" ? "class_representatives" : "school_leadership";

  const insertPayload = {
    school_id: profile.school_id,
    scope_type,
    scope_id,
    title: trimmedTitle,
    description: typeof description === "string" ? description.trim() || null : null,
    type,
    status: "open" as const,
    deadline: parsedDeadline,
    quorum: parsedQuorum,
    options: finalOptions,
    allow_abstain: Boolean(allow_abstain),
    mandate_rule: mandateRule,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("polls")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to create poll", error);
    return NextResponse.json(
      { error: error.message ?? "poll_creation_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ data }, { status: 200 });
}
