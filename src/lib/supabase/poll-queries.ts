import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePollOptions } from "@/lib/polls/options";
import type { PollDetail, PollOption } from "@/components/polls/types";

type PollRowData = {
  id: string;
  school_id: string;
  scope_type: "class" | "school";
  scope_id: string;
  title: string;
  description: string | null;
  type: "open" | "secret";
  status: "draft" | "open" | "closed";
  kind: "general" | "election";
  deadline: string | null;
  quorum: number | null;
  allow_abstain: boolean;
  options: unknown;
  mandate_rule: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  created_by: string | null;
  seats: number | null;
  profiles: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
};

type PollSummaryRow = {
  vote_choice: string;
  vote_count: number;
};

export async function fetchPollDetail(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<PollDetail | null> {
  const pollResponse = await supabase
    .from("polls")
    .select(
      `
        id,
        school_id,
        scope_type,
        scope_id,
        title,
        description,
        type,
        status,
        kind,
        deadline,
        quorum,
        allow_abstain,
        options,
        seats,
        mandate_rule,
        created_at,
        updated_at,
        closed_at,
        created_by,
        profiles (
          id,
          name,
          email
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (pollResponse.error) {
    console.error("Failed to load poll", pollResponse.error);
    return null;
  }

  const poll = pollResponse.data as PollRowData | null;
  if (!poll) {
    return null;
  }

  let scopeLabel = "Gesamte Schule";
  if (poll.scope_type === "class") {
    const { data: classroom } = await supabase
      .from("classrooms")
      .select("name, year")
      .eq("id", poll.scope_id)
      .maybeSingle();
    scopeLabel = classroom
      ? `${classroom.name}${classroom.year ? ` · Jahrgang ${classroom.year}` : ""}`
      : "Klasse";
  }

  const options = normalizePollOptions(poll.options);

  const summaryResponse = await supabase.rpc("poll_vote_summary", {
    p_poll_id: id,
  });
  const summaryRows = Array.isArray(summaryResponse.data)
    ? (summaryResponse.data as PollSummaryRow[])
    : [];

  const optionVotes = options.map<PollOption>((option) => ({
    ...option,
    votes:
      summaryRows.find((row) => row.vote_choice === option.id)?.vote_count ??
      summaryRows.find((row) => row.vote_choice === option.label)?.vote_count ??
      0,
  }));

  let totalVotes = optionVotes.reduce((acc, option) => acc + option.votes, 0);

  if (poll.allow_abstain) {
    const abstainVotes =
      summaryRows.find((row) => row.vote_choice === "abstain")?.vote_count ?? 0;
    if (abstainVotes > 0) {
      optionVotes.push({
        id: "abstain",
        label: "Enthaltung",
        votes: abstainVotes,
      });
      totalVotes += abstainVotes;
    }
  }

  const { data: manageResult } = await supabase.rpc("can_manage_poll", {
    p_poll_id: id,
  });

  // Get user's current vote from the new user_votes table
  const { data: myVoteRow } = await supabase
    .from("user_votes")
    .select("choice")
    .eq("poll_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  const myVote = typeof myVoteRow?.choice === "string" ? myVoteRow.choice : null;

  // Use the new voting rights function
  const { data: canVote } = await supabase.rpc("can_vote_in_poll", {
    p_poll_id: id,
    p_user_id: userId,
  });

  const resultsHidden =
    poll.type === "secret" &&
    poll.status === "open" &&
    (poll.deadline === null || Date.parse(poll.deadline) > Date.now()) &&
    manageResult !== true;

  const pollDetail: PollDetail = {
    id: poll.id,
    schoolId: poll.school_id,
    scopeType: poll.scope_type,
    scopeId: poll.scope_id,
    scopeLabel,
    kind: poll.kind,
    title: poll.title,
    description: poll.description,
    type: poll.type,
    status: poll.status,
    deadline: poll.deadline,
    quorum: poll.quorum,
    allowAbstain: poll.allow_abstain,
    seats: poll.seats ?? 1,
    mandateRule: poll.mandate_rule ?? null,
    options: optionVotes,
    createdAt: poll.created_at,
    createdBy: {
      id: poll.profiles?.id ?? null,
      name: poll.profiles?.name ?? null,
      email: poll.profiles?.email ?? null,
    },
    myVote,
    totalVotes,
    canManage: manageResult === true,
    canVote,
    resultsHidden,
  };

  return pollDetail;
}
