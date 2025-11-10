"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { cacheTags } from "@/lib/cache/tags";
import {
  createCandidateRecords,
  dedupeCandidates,
  listCandidateRecords,
  type CandidateDraft,
} from "@/lib/polls/candidate-service";

type GeneratedCandidateCode = {
  id: string;
  office: "class_rep" | "class_rep_deputy";
  displayName: string;
  claimCode: string;
  claimUrl: string;
  expiresAt: string;
};

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  pollId?: string | null;
  candidateCodes?: GeneratedCandidateCode[];
};

type NormalizedOption = {
  id: string;
  label: string;
};

function ensureString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptions(raw: unknown): NormalizedOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const unique = new Map<string, NormalizedOption>();
  for (const entry of raw) {
    if (entry && typeof entry === "object") {
      const option = entry as { id?: unknown; label?: unknown };
      const label =
        typeof option.label === "string" ? option.label.trim().slice(0, 200) : null;
      const id =
        typeof option.id === "string" && option.id.length > 0
          ? option.id
          : crypto.randomUUID();
      if (label && !unique.has(label.toLowerCase())) {
        unique.set(label.toLowerCase(), { id, label });
      }
    } else if (typeof entry === "string") {
      const label = entry.trim().slice(0, 200);
      if (label && !unique.has(label.toLowerCase())) {
        unique.set(label.toLowerCase(), { id: crypto.randomUUID(), label });
      }
    }
  }

  return Array.from(unique.values());
}

export async function createPollAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = ensureString(formData.get("title"));
  const rawScopeType = ensureString(formData.get("scope_type"));
  const scopeType =
    rawScopeType === "class" || rawScopeType === "school" ? rawScopeType : null;
  const scopeId = ensureString(formData.get("scope_id"));
  const rawKind = ensureString(formData.get("kind"));
  const kind: "general" | "election" = rawKind === "election" ? "election" : "general";
  const officeInput = ensureString(formData.get("office"));
  const type: "open" | "secret" = ensureString(formData.get("type")) === "secret" ? "secret" : "open";
  const allowAbstain = ensureString(formData.get("allow_abstain")) === "true";
  const deadlineRaw = ensureString(formData.get("deadline"));
  const quorumRaw = ensureString(formData.get("quorum"));
  const description = ensureString(formData.get("description"));
  const optionsPayload = ensureString(formData.get("options"));

  if (!title || !scopeType || !scopeId) {
    return {
      status: "error",
      message: "Titel, Bereich und Scope-ID sind erforderlich.",
      pollId: null,
      candidateCodes: [],
    };
  }

  const resolvedScopeType = scopeType as "class" | "school";

  let parsedOptions: unknown;
  try {
    parsedOptions = optionsPayload ? JSON.parse(optionsPayload) : [];
  } catch {
    return {
      status: "error",
      message: "Antwortoptionen konnten nicht gelesen werden.",
      pollId: null,
      candidateCodes: [],
    };
  }

  const normalizedOptions = normalizeOptions(parsedOptions);
  let candidateDrafts: CandidateDraft[] = [];
  let pollOptions: NormalizedOption[] = normalizedOptions;

  if (kind === "election") {
    if (resolvedScopeType !== "class") {
      return {
        status: "error",
        message: "Klassenwahlen können nur im Klassenscope angelegt werden.",
        pollId: null,
        candidateCodes: [],
      };
    }

    const office = officeInput === "class_rep" || officeInput === "class_rep_deputy"
      ? officeInput
      : null;
    if (!office) {
      return {
        status: "error",
        message: "Bitte wähle das Amt (Klassensprecher:in oder Stellvertretung).",
        pollId: null,
        candidateCodes: [],
      };
    }

    if (normalizedOptions.length === 0) {
      return {
        status: "error",
        message: "Füge mindestens eine:n Kandidat:in hinzu.",
        pollId: null,
        candidateCodes: [],
      };
    }

    candidateDrafts = dedupeCandidates(
      normalizedOptions.map((option) => ({
        office,
        displayName: option.label,
      }))
    );

    if (candidateDrafts.length === 0) {
      return {
        status: "error",
        message: "Die Kandidat:innen konnten nicht übernommen werden.",
        pollId: null,
        candidateCodes: [],
      };
    }

    pollOptions = [];
  } else if (normalizedOptions.length < 2) {
    return {
      status: "error",
      message: "Füge mindestens zwei eindeutige Optionen hinzu.",
      pollId: null,
      candidateCodes: [],
    };
  }

  let deadline: string | null = null;
  if (deadlineRaw) {
    const deadlineDate = new Date(deadlineRaw);
    if (Number.isNaN(deadlineDate.getTime())) {
      return {
        status: "error",
        message: "Die Frist konnte nicht interpretiert werden.",
        pollId: null,
        candidateCodes: [],
      };
    }
    deadline = deadlineDate.toISOString();
  }

  let quorum: number | null = null;
  if (quorumRaw) {
    const value = Number(quorumRaw);
    if (!Number.isFinite(value) || value < 0) {
      return {
        status: "error",
        message: "Das Quorum muss eine positive Zahl sein.",
        pollId: null,
        candidateCodes: [],
      };
    }
    quorum = Math.round(value);
  }

  // Using getServerSupabase() instead
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Du bist nicht angemeldet.",
      pollId: null,
      candidateCodes: [],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) {
    return {
      status: "error",
      message: "Deinem Account ist keine Schule zugeordnet. Bitte kontaktiere eine:n Admin.",
      pollId: null,
      candidateCodes: [],
    };
  }

  const mandateRule =
    kind === "election"
      ? (candidateDrafts[0]?.office ?? null)
      : resolvedScopeType === "class"
        ? "class_representatives"
        : "school_leadership";

  const allowAbstainFinal = kind === "election" ? false : allowAbstain;

  const insertPayload = {
    school_id: profile.school_id,
    scope_type: resolvedScopeType,
    scope_id: scopeId,
    title,
    description: description || null,
    type,
    status: "open" as const,
    deadline,
    quorum,
    options: pollOptions,
    allow_abstain: allowAbstainFinal,
    mandate_rule: mandateRule,
    kind,
    seats: 1,
    created_by: user.id,
  };

  const { data: insertedPoll, error } = await supabase
    .from("polls")
    .insert(insertPayload)
    .select("id, kind, school_id, scope_type, scope_id")
    .maybeSingle();

  if (error || !insertedPoll) {
    console.error("Failed to create poll via server action", error);
    return {
      status: "error",
      message: error?.message ?? "Die Umfrage konnte nicht erstellt werden.",
      pollId: null,
      candidateCodes: [],
    };
  }

  let generatedCodes: GeneratedCandidateCode[] = [];

  if (kind === "election" && candidateDrafts.length > 0) {
    try {
      const created = await createCandidateRecords(
        supabase,
        insertedPoll,
        user.id,
        candidateDrafts,
        14
      );

      if (created.length > 0) {
        const auditPayload = created.map((row) => ({
          action: "CANDIDATE_CODE_CREATE",
          actor_id: user.id,
          entity: "poll_candidate",
          entity_id: row.id,
          school_id: insertedPoll.school_id,
          meta: {
            poll_id: insertedPoll.id,
            office: row.office,
            display_name: row.displayName,
          },
        }));

        const { error: auditError } = await supabase.from("audit_log").insert(auditPayload);
        if (auditError) {
          console.error("Failed to insert candidate audit logs", auditError);
        }
      }

      const allCandidates = await listCandidateRecords(supabase, insertedPoll.id);
      const optionsPayloadForPoll = allCandidates.map((candidate) => ({
        id: candidate.id,
        label: candidate.displayName,
        office: candidate.office,
      }));

      const { error: updateError } = await supabase
        .from("polls")
        .update({ options: optionsPayloadForPoll })
        .eq("id", insertedPoll.id);

      if (updateError) {
        console.error("Failed to update poll options after creating candidates", updateError);
      }

      generatedCodes = allCandidates.map((candidate) => ({
        id: candidate.id,
        office: candidate.office,
        displayName: candidate.displayName,
        claimCode: candidate.claimCode,
        claimUrl: `/claim?c=${encodeURIComponent(candidate.claimCode)}`,
        expiresAt: candidate.expiresAt,
      }));
    } catch (candidateError) {
      console.error("Failed to generate candidate codes", candidateError);
      revalidatePath("/app/polls");
      revalidateTag(cacheTags.polls(profile.school_id), 'max');
      return {
        status: "error",
        message: "Die Wahl wurde angelegt, aber die Kandidaten-Codes konnten nicht erzeugt werden.",
        pollId: insertedPoll.id,
        candidateCodes: [],
      };
    }
  }

  revalidatePath("/app/polls");
  revalidateTag(cacheTags.polls(profile.school_id), 'max');

  const successMessage =
    kind === "election"
      ? "Wahl angelegt – Kandidaten-Codes stehen bereit."
      : "Umfrage angelegt – du findest sie jetzt in der Übersicht.";

  return {
    status: "success",
    message: successMessage,
    pollId: insertedPoll.id,
    candidateCodes: generatedCodes,
  };
}
