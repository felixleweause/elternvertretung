import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/utils";
import { generateCandidateCode } from "./codes";
import type { Database } from "@/lib/supabase/database";

export type CandidateDraft = {
  office: "class_rep" | "class_rep_deputy";
  displayName: string;
};

export type CandidateRecord = {
  id: string;
  office: "class_rep" | "class_rep_deputy";
  displayName: string;
  claimCode: string;
  expiresAt: string;
  status: string;
  userId: string | null;
  claimedAt: string | null;
};

type PollContext = {
  id: string;
  school_id: string;
  scope_type: "class" | "school";
  scope_id: string | null;
  kind: "general" | "election";
};

type Supabase = SupabaseClient<Database>;

export function dedupeCandidates(drafts: CandidateDraft[]): CandidateDraft[] {
  const seen = new Set<string>();
  const result: CandidateDraft[] = [];
  for (const draft of drafts) {
    const key = `${draft.office}:${draft.displayName.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(draft);
  }
  return result;
}

export async function listCandidateRecords(
  supabase: Supabase,
  pollId: string
): Promise<CandidateRecord[]> {
  const { data, error } = await supabase
    .from("poll_candidates")
    .select(
      `
        id,
        office,
        display_name,
        claim_code,
        expires_at,
        status,
        user_id,
        claimed_at
      `
    )
    .eq("poll_id", pollId)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("listCandidateRecords: failed to load records", error);
    return [];
  }

  return (
    data
      ?.filter(
        (row): row is {
          id: string;
          office: "class_rep" | "class_rep_deputy";
          display_name: string;
          claim_code: string;
          expires_at: string;
          status: string;
          user_id: string | null;
          claimed_at: string | null;
        } => row.office === "class_rep" || row.office === "class_rep_deputy"
      )
      .map((row) => ({
        id: row.id,
        office: row.office,
        displayName: row.display_name,
        claimCode: row.claim_code,
        expiresAt: row.expires_at,
        status: row.status,
        userId: row.user_id,
        claimedAt: row.claimed_at,
      })) ?? []
  );
}

export async function createCandidateRecords(
  supabase: Supabase,
  poll: PollContext,
  userId: string,
  drafts: CandidateDraft[],
  expiresInDays = 14
): Promise<CandidateRecord[]> {
  if (poll.kind !== "election") {
    throw new Error("createCandidateRecords: poll is not an election");
  }

  if (poll.scope_type !== "class" || !poll.scope_id) {
    throw new Error("createCandidateRecords: poll scope must be a class");
  }

  if (drafts.length === 0) {
    return [];
  }

  const existing = await listCandidateRecords(supabase, poll.id);
  const existingMap = new Map<string, CandidateRecord>(
    existing.map((record) => [`${record.office}:${record.displayName.toLowerCase()}`, record])
  );

  const usedCodes = new Set(existing.map((record) => record.claimCode));
  const expireDate = addDays(new Date(), Math.max(1, Math.min(30, expiresInDays))).toISOString();

  const inserts = drafts.filter(
    (draft) => !existingMap.has(`${draft.office}:${draft.displayName.toLowerCase()}`)
  );

  if (inserts.length === 0) {
    return existing.filter((record) =>
      drafts.some(
        (draft) =>
          draft.office === record.office &&
          draft.displayName.toLowerCase() === record.displayName.toLowerCase()
      )
    );
  }

  const rowsToInsert = inserts.map((draft) => ({
    poll_id: poll.id,
    school_id: poll.school_id,
    classroom_id: poll.scope_id,
    office: draft.office,
    display_name: draft.displayName,
    claim_code: (() => {
      let value = generateCandidateCode();
      while (usedCodes.has(value)) {
        value = generateCandidateCode();
      }
      usedCodes.add(value);
      return value;
    })(),
    expires_at: expireDate,
    status: "created" as const,
    created_by: userId,
    updated_by: userId,
  }));

  const { data, error } = await supabase
    .from("poll_candidates")
    .insert(rowsToInsert)
    .select(
      `
        id,
        office,
        display_name,
        claim_code,
        expires_at,
        status,
        user_id,
        claimed_at
      `
    );

  if (error) {
    console.error("createCandidateRecords: insert failed", error);
    throw error;
  }

  const inserted =
    data
      ?.filter(
        (row): row is {
          id: string;
          office: "class_rep" | "class_rep_deputy";
          display_name: string;
          claim_code: string;
          expires_at: string;
          status: string;
          user_id: string | null;
          claimed_at: string | null;
        } => row.office === "class_rep" || row.office === "class_rep_deputy"
      )
      .map((row) => ({
        id: row.id,
        office: row.office,
        displayName: row.display_name,
        claimCode: row.claim_code,
        expiresAt: row.expires_at,
        status: row.status,
        userId: row.user_id,
        claimedAt: row.claimed_at,
      })) ?? [];

  return inserted;
}
