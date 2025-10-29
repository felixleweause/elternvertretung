import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";

type Supabase = SupabaseClient<Database>;

export type CandidateAssignment = {
  candidateId: string;
  office: "class_rep" | "class_rep_deputy";
  displayName: string;
  userId: string | null;
  pending: boolean;
};

function resolveMandateRole(
  office: "class_rep" | "class_rep_deputy"
): Database["public"]["Enums"]["mandate_role"] {
  return office === "class_rep" ? "class_rep" : "class_rep_deputy";
}

export async function assignMandatesFromPoll(
  supabase: Supabase,
  pollId: string,
  actorId: string
): Promise<CandidateAssignment[]> {
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      `
        id,
        school_id,
        scope_type,
        scope_id,
        kind,
        seats
      `
    )
    .eq("id", pollId)
    .maybeSingle();

  if (pollError) {
    console.error("assignMandatesFromPoll: failed to load poll", pollError);
    return [];
  }

  if (!poll || poll.kind !== "election" || poll.scope_type !== "class" || !poll.scope_id) {
    return [];
  }

  const { data: candidates, error: candidateError } = await supabase
    .from("poll_candidates")
    .select(
      `
        id,
        office,
        display_name,
        user_id,
        status,
        claimed_at,
        created_at
      `
    )
    .eq("poll_id", pollId);

  if (candidateError) {
    console.error("assignMandatesFromPoll: failed to load candidates", candidateError);
    return [];
  }

  if (!candidates || candidates.length === 0) {
    return [];
  }

  const offices = new Set(
    candidates
      .map((candidate) => candidate.office)
      .filter(
        (office): office is "class_rep" | "class_rep_deputy" =>
          office === "class_rep" || office === "class_rep_deputy"
      )
  );

  if (offices.size !== 1) {
    console.warn(
      "assignMandatesFromPoll: expected exactly one office per poll",
      Array.from(offices)
    );
    return [];
  }

  const targetOffice = Array.from(offices)[0];
  const mandateRole = resolveMandateRole(targetOffice);

  const { data: summary, error: summaryError } = await supabase.rpc("poll_vote_summary", {
    p_poll_id: pollId,
  });

  if (summaryError) {
    console.error("assignMandatesFromPoll: poll_vote_summary failed", summaryError);
  }

  const voteMap = new Map<string, number>();
  if (Array.isArray(summary)) {
    for (const row of summary) {
      const choice = (row as { choice?: string }).choice;
      const votes = Number((row as { votes?: number }).votes ?? 0);
      if (choice) {
        voteMap.set(choice, votes);
      }
    }
  }

  const scored = candidates
    .filter(
      (candidate): candidate is typeof candidate & { office: "class_rep" | "class_rep_deputy" } =>
        candidate.office === "class_rep" || candidate.office === "class_rep_deputy"
    )
    .map((candidate) => {
      const votes = voteMap.get(candidate.id!) ?? 0;
      const claimedAt = candidate.claimed_at ? Date.parse(candidate.claimed_at) : null;
      const createdAt = candidate.created_at ? Date.parse(candidate.created_at) : null;
      return {
        id: candidate.id!,
        office: candidate.office,
        displayName: candidate.display_name ?? "",
        userId: candidate.user_id ?? null,
        votes,
        claimedAt: claimedAt && !Number.isNaN(claimedAt) ? claimedAt : Number.MAX_SAFE_INTEGER,
        createdAt: createdAt && !Number.isNaN(createdAt) ? createdAt : Number.MAX_SAFE_INTEGER,
        status: candidate.status ?? "created",
      };
    })
    .sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      if (a.claimedAt !== b.claimedAt) {
        return a.claimedAt - b.claimedAt;
      }
      return a.createdAt - b.createdAt;
    });

  const seats = poll.seats ?? 1;
  const winners = scored.slice(0, Math.max(1, seats));

  if (winners.length === 0) {
    return [];
  }

  const results: CandidateAssignment[] = [];

  for (const winner of winners) {
    if (winner.userId) {
      const now = new Date().toISOString();

      const { data: activeMandates, error: activeError } = await supabase
        .from("mandates")
        .select("id")
        .eq("school_id", poll.school_id!)
        .eq("scope_type", "class")
        .eq("scope_id", poll.scope_id)
        .eq("role", mandateRole)
        .eq("status", "active");

      if (activeError) {
        console.error("assignMandatesFromPoll: failed to load active mandates", activeError);
      }

      if (activeMandates && activeMandates.length > 0) {
        const activeIds = activeMandates.map((row) => row.id!);
        const { error: endError } = await supabase
          .from("mandates")
          .update({
            status: "ended",
            end_at: now,
            updated_at: now,
            updated_by: actorId,
          })
          .in("id", activeIds);
        if (endError) {
          console.error("assignMandatesFromPoll: failed to end previous mandates", endError);
        }
      }

      const { data: newMandate, error: insertError } = await supabase
        .from("mandates")
        .insert({
          school_id: poll.school_id!,
          user_id: winner.userId,
          scope_type: "class",
          scope_id: poll.scope_id,
          role: mandateRole,
          start_at: now,
          status: "active",
          created_by: actorId,
          updated_by: actorId,
        })
        .select("id")
        .maybeSingle();

      if (insertError) {
        console.error("assignMandatesFromPoll: failed to insert mandate", insertError);
      } else {
        const { error: candidateUpdateError } = await supabase
          .from("poll_candidates")
          .update({
            status: "assigned",
            updated_at: now,
            updated_by: actorId,
          })
          .eq("id", winner.id);
        if (candidateUpdateError) {
          console.error(
            "assignMandatesFromPoll: failed to mark candidate assigned",
            candidateUpdateError
          );
        }

        const auditPayload = {
          action: "MANDATE_TRANSFER",
          actor_id: actorId,
          entity: "mandate",
          entity_id: newMandate?.id ?? null,
          school_id: poll.school_id!,
          meta: {
            poll_id: pollId,
            candidate_id: winner.id,
            office: winner.office,
            display_name: winner.displayName,
          },
        };

        const { error: auditError } = await supabase.from("audit_log").insert(auditPayload);
        if (auditError) {
          console.error("assignMandatesFromPoll: audit insert failed", auditError);
        }
      }

      results.push({
        candidateId: winner.id,
        office: winner.office,
        displayName: winner.displayName,
        userId: winner.userId,
        pending: false,
      });
    } else {
      const now = new Date().toISOString();
      const { error: pendingError } = await supabase
        .from("poll_candidates")
        .update({
          status: "pending_assignment",
          updated_at: now,
          updated_by: actorId,
        })
        .eq("id", winner.id);
      if (pendingError) {
        console.error(
          "assignMandatesFromPoll: failed to mark pending assignment",
          pendingError
        );
      }
      results.push({
        candidateId: winner.id,
        office: winner.office,
        displayName: winner.displayName,
        userId: null,
        pending: true,
      });
    }
  }

  return results;
}
