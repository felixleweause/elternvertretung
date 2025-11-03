import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { normalizePollOptions } from "@/lib/polls/options";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type VotePayload = {
  choice?: unknown;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => ({}))) as VotePayload;
  const { choice } = payload;

  if (typeof choice !== "string" || choice.trim().length === 0) {
    return NextResponse.json({ error: "invalid_choice" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      `
        id,
        school_id,
        scope_type,
        scope_id,
        title,
        type,
        status,
        deadline,
        options,
        allow_abstain
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (pollError) {
    console.error("Failed to load poll for vote", pollError);
    return NextResponse.json({ error: "poll_lookup_failed" }, { status: 400 });
  }

  if (!poll) {
    return NextResponse.json({ error: "poll_not_found" }, { status: 404 });
  }

  if (poll.status !== "open") {
    return NextResponse.json({ error: "poll_closed" }, { status: 409 });
  }

  if (poll.deadline) {
    const deadline = new Date(poll.deadline);
    if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
      return NextResponse.json({ error: "poll_closed" }, { status: 409 });
    }
  }

  const options = normalizePollOptions(poll.options);
  const selectedOption =
    options.find(
      (option) =>
        option.id === choice ||
        option.label === choice ||
        option.id === choice.trim() ||
        option.label === choice.trim()
    ) ?? null;

  const abstainSelected = choice === "abstain";
  if (!selectedOption && !(abstainSelected && poll.allow_abstain)) {
    return NextResponse.json({ error: "choice_not_allowed" }, { status: 400 });
  }

  const { data: mandates } = await supabase
    .from("mandates")
    .select("id, school_id, scope_type, scope_id, role, status, start_at, end_at")
    .eq("user_id", user.id)
    .eq("status", "active");

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("classroom_id")
    .eq("user_id", user.id)
    .eq("classroom_id", poll.scope_id)
    .maybeSingle();

  const now = Date.now();

  // Check if user can vote using the new function
  const { data: canVote } = await supabase.rpc("can_vote_in_poll", {
    p_poll_id: poll.id,
    p_user_id: user.id,
  });

  if (!canVote) {
    return NextResponse.json({ error: "no_voting_rights" }, { status: 403 });
  }

  // Find eligible mandate (for mandate-based voting)
  const eligibleMandate =
    mandates?.find((mandate) => {
      if (mandate.status !== "active") {
        return false;
      }
      if (!mandate.school_id || mandate.school_id !== poll.school_id) {
        return false;
      }
      const startsAt = mandate.start_at ? Date.parse(mandate.start_at) : now;
      const endsAt = mandate.end_at ? Date.parse(mandate.end_at) : null;
      if (Number.isNaN(startsAt) || startsAt > now) {
        return false;
      }
      if (endsAt && endsAt < now) {
        return false;
      }
      if (poll.scope_type === "class") {
        return (
          mandate.scope_type === "class" &&
          mandate.scope_id === poll.scope_id &&
          (mandate.role === "class_rep" || mandate.role === "class_rep_deputy")
        );
      }
      return (
        mandate.scope_type === "school" &&
        mandate.scope_id === poll.school_id &&
        (mandate.role === "gev" || mandate.role === "admin")
      );
    }) ?? null;

  const finalChoice = abstainSelected ? "abstain" : selectedOption?.id ?? choice;

  // Check if user already has a vote and update it
  const { data: existingUserVote, error: checkError } = await supabase
    .from("user_votes")
    .select("choice")
    .eq("poll_id", poll.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) {
    console.error("Failed to check existing vote", checkError);
    return NextResponse.json(
      { error: checkError.message ?? "vote_check_failed" },
      { status: 400 }
    );
  }

  const upsertResult = await supabase
    .from("user_votes")
    .upsert(
      [
        {
          poll_id: poll.id,
          user_id: user.id,
          choice: finalChoice,
        },
      ],
      {
        onConflict: "poll_id,user_id",
      }
    )
    .select("choice")
    .maybeSingle();

  if (upsertResult.error) {
    console.error("Failed to cast vote", upsertResult.error);
    return NextResponse.json(
      { error: upsertResult.error.message ?? "vote_failed" },
      { status: 400 }
    );
  }

  const summaryResponse = await supabase.rpc("poll_vote_summary", {
    p_poll_id: poll.id,
  });

  return NextResponse.json(
    {
      data: {
        choice: upsertResult.data?.choice ?? finalChoice,
        summary: summaryResponse.data ?? [],
      },
    },
    { status: 200 }
  );
}
